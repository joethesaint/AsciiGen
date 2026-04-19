/**
 * PointGen: High-End Volumetric Point Cloud Engine (v3.2)
 * Features: Cursor Interactivity, Zoom, Character Inversion, & 2D/3D Mode
 */

let scene, camera, renderer, pointsObject;
let mode = 'grid';
window.isFlowEnabled = false;
window.isInverted = false;
window.is3D = true;
window.renderMode = 'points';
const CHAR_SETS = {
    'default': " .:-=+*#%@",
    'reverse': "@%#*+=-:. ",
    'pointism': "  .·:∵∴∷•",
    'detailed': " .'`^\\\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
};
let currentChars = CHAR_SETS['default'];
let textureAtlas;
let mouse = new THREE.Vector2();
let targetRotation = new THREE.Euler();
let currentRotation = new THREE.Euler();
let targetZoom = 1200;
window.isAutoRotate = false;
window.isDragEnabled = true;
window.isResetting = false;
let isMouseDown = false;
let lastMousePos = { x: 0, y: 0 };
let dragRotation = { x: 0, y: 0 };

const ATLAS_SIZE = 512;
const CHAR_SIZE = 64;
const COLS = 8;

function init() {
    try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 10, 10000);
        camera.position.set(0, 0, 1200);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('canvas-holder').appendChild(renderer.domElement);

        createTextureAtlas();
        setupUI();
        
        checkBackendStatus();
        autoloadDefaultImage();
        
        animate();
        console.log("PointGen v3.2: Kinetic Engine Active (WebGL)");
    } catch (e) {
        console.error("Critical Engine Failure:", e);
    }
}

const pointVertexShader = `
    attribute float charIndex;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vCharIndex;
    varying float vDepth;
    uniform float time;
    uniform float pointSize;
    uniform vec2 mousePos;
    uniform float mode;
    uniform float flowEnabled;
    uniform float is3D;

    void main() {
        vColor = color;
        vCharIndex = charIndex;
        
        vec3 pos = position;
        
        // Dimensional flattening
        if (is3D < 0.5) {
            pos.z = 0.0;
        }
        
        // Flow Interaction (The Poke)
        if (flowEnabled > 0.5) {
            float d = distance(pos.xy, mousePos);
            if (d < 250.0) {
                float s = (1.0 - d/250.0);
                pos.z += s * 150.0;
            }
        }
        
        // Kinetic Effects (Drift & Vortex)
        if (mode > 0.5 && mode < 1.5) { // Drift
            pos.z += sin(time * 2.5 + (pos.x + pos.y) * 0.01) * 35.0;
        } else if (mode > 1.5) { // Vortex
            float angle = time * 1.5 * (1.0 - length(pos.xy) / 1000.0);
            float s = sin(angle);
            float c = cos(angle);
            pos.xy = mat2(c, -s, s, c) * pos.xy;
        }

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vDepth = -mvPosition.z;
        
        gl_PointSize = pointSize * (2000.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const pointFragmentShader = `
    varying vec3 vColor;
    varying float vCharIndex;
    varying float vDepth;
    uniform sampler2D atlas;
    uniform float atlasCols;
    uniform float inverted;
    uniform float numChars;
    uniform float renderMode; // 0=points(dots), 1=ascii, 2=hybrid

    void main() {
        float size = 1.0 / atlasCols;
        float actualIdx = vCharIndex;
        
        // Mode Redirection
        if (renderMode < 0.5) { // Points Mode: Strategic reduction to basic symbols
             actualIdx = min(vCharIndex, 3.0); 
        }
        
        // Real Character Inversion: Dark <-> Light
        if (inverted > 0.5) {
            actualIdx = (numChars - 1.0) - actualIdx;
        }
        
        float x = mod(actualIdx, atlasCols) * size;
        float y = floor(actualIdx / atlasCols) * size;
        
        vec2 charUv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
        vec2 uv = vec2(x, 1.0 - y - size) + charUv * size;
        
        vec4 texColor = texture2D(atlas, uv);
        
        // Hybrid Mode Logic: Volumetric density with subtle glow and noise
        if (renderMode > 1.5) {
            if (texColor.r < 0.05) {
                // Background points: show a tiny dot instead of discarding
                float d = distance(gl_PointCoord, vec2(0.5));
                if (d > 0.05) discard;
                gl_FragColor = vec4(vColor * 0.5, 0.4);
                return;
            }
        } else {
            if (texColor.r < 0.1) discard; 
        }
        
        vec3 color = vColor * 2.5; 
        float alpha = 1.0;
        
        // ASCII Mode: Pure
        // Points Mode: Higher contrast
        if (renderMode < 0.5) {
            color *= 1.2;
        }
        
        gl_FragColor = vec4(color, alpha);
    }
`;

/** 
 * Smart Adaptive Sampling: Higher density on edges, governed by UI slider
 */
function processImageToPointCloud(img, depthData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // User-controlled density step (Resolution)
    const baseDensity = parseInt(document.getElementById('res-slider').value) || 4;
    
    // Virtual resolution for the intermediate canvas
    const sampleWidth = 400; 
    const sampleHeight = Math.floor(sampleWidth * (img.height / img.width));
    
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imageData.data;
    
    // Edge Detection Pre-pass for Intensity Detail
    const edges = new Uint8Array(sampleWidth * sampleHeight);
    for (let y = 1; y < sampleHeight - 1; y++) {
        for (let x = 1; x < sampleWidth - 1; x++) {
            const i = (y * sampleWidth + x) * 4;
            const bri = (data[i]*0.3 + data[i+1]*0.59 + data[i+2]*0.11);
            
            // Simple Sobel-like intensity diff
            const right = ((data[i+4]*0.3 + data[i+5]*0.59 + data[i+6]*0.11));
            const down = ((data[i+(sampleWidth*4)]*0.3 + data[i+(sampleWidth*4)+1]*0.59 + data[i+(sampleWidth*4)+2]*0.11));
            
            edges[y * sampleWidth + x] = Math.min(255, Math.abs(bri - right) + Math.abs(bri - down));
        }
    }

    const positions = [];
    const colors = [];
    const charIndices = [];
    
    const spacing = 12;
    const xOff = -(sampleWidth * spacing) / 20; // scaled for 0.1 scale factor
    const yOff = (sampleHeight * spacing) / 20;

    // Adaptive Loop: Step varies based on edge importance
    for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
            const i = (y * sampleWidth + x) * 4;
            const bri = (data[i]*0.3 + data[i+1]*0.59 + data[i+2]*0.11);
            const edge = edges[y * sampleWidth + x];

            // Decide to spawn based on base density and local detail
            // If near edge, we allow more frequent spawning
            const edgeWeight = edge / 255;
            const threshold = baseDensity * (1.1 - edgeWeight * 0.8);
            
            if (x % Math.max(1, Math.floor(threshold)) === 0 && y % Math.max(1, Math.floor(threshold)) === 0) {
                if (bri > 10) {
                    const r = data[i] / 255;
                    const g = data[i+1] / 255;
                    const b = data[i+2] / 255;
                    
                    const posX = (x - sampleWidth/2) * spacing;
                    const posY = -(y - sampleHeight/2) * spacing;
                    const posZ = bri * 2.0; // depth from brightness
                    
                    positions.push(posX, posY, posZ);
                    colors.push(r, g, b);
                    charIndices.push(Math.floor((bri/255) * (currentChars.length - 1)));
                }
            }
        }
    }

    finalizePointCloud(positions, colors, charIndices);
    hide3DControls();
}

function show3DControls() {
    const controls = document.getElementById('3d-controls');
    const badge = document.getElementById('glb-indicator');
    if (controls) controls.style.display = 'block';
    if (badge) badge.style.display = 'inline-block';
}

function hide3DControls() {
    const controls = document.getElementById('3d-controls');
    const badge = document.getElementById('glb-indicator');
    if (controls) controls.style.display = 'none';
    if (badge) badge.style.display = 'none';
    window.isAutoRotate = false;
    const rotateToggle = document.getElementById('auto-rotate-toggle');
    if (rotateToggle) rotateToggle.checked = false;
}

function loadGLB(file) {
    const url = URL.createObjectURL(file);
    const loader = new THREE.GLTFLoader();
    loader.load(url, (gltf) => {
        processMeshToPointCloud(gltf.scene);
        show3DControls();
        URL.revokeObjectURL(url);
    }, undefined, (e) => console.error("GLB Load Error:", e));
}

function processMeshToPointCloud(mesh) {
    const positions = [];
    const colors = [];
    const charIndices = [];

    // Virtual Light Source for Architectural Shading
    const lightDir = new THREE.Vector3(1, 1, 1).normalize();

    mesh.traverse((child) => {
        if (child.isMesh) {
            const geo = child.geometry.clone();
            geo.computeVertexNormals(); // Ensure we have normals for shading
            
            const pos = geo.attributes.position;
            const norm = geo.attributes.normal;
            const col = geo.attributes.color;
            
            const scalar = 400; 

            const stride = Math.max(1, Math.floor(pos.count / 30000)); 

            for (let i = 0; i < pos.count; i += stride) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                
                positions.push(x * scalar, y * scalar, z * scalar);

                // Shading calculation based on normal
                const nx = norm.getX(i);
                const ny = norm.getY(i);
                const nz = norm.getZ(i);
                const normal = new THREE.Vector3(nx, ny, nz);
                
                // Dot product for diffuse lighting (Architectural Limestone Ink intensity)
                const intensity = Math.max(0.1, normal.dot(lightDir)); 
                
                if (col) {
                    colors.push(col.getX(i) * intensity, col.getY(i) * intensity, col.getZ(i) * intensity);
                } else {
                    // Apply Architectural Limestone base color shaded
                    const baseR = 230/255, baseG = 230/255, baseB = 220/255;
                    colors.push(baseR * intensity, baseG * intensity, baseB * intensity);
                }
                
                // Map intensity to character density (ink weight)
                charIndices.push(Math.floor(intensity * (currentChars.length - 1)));
            }
        }
    });

    finalizePointCloud(positions, colors, charIndices);
}

function finalizePointCloud(positions, colors, charIndices) {
    if (pointsObject) scene.remove(pointsObject);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('charIndex', new THREE.Float32BufferAttribute(charIndices, 1));

    const spacing = 10;
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            atlas: { value: textureAtlas },
            atlasCols: { value: COLS },
            pointSize: { value: spacing * 1.5 },
            time: { value: 0 },
            mousePos: { value: new THREE.Vector2(-5000, -5000) },
            mode: { value: 0 },
            flowEnabled: { value: window.isFlowEnabled ? 1.0 : 0.0 },
            inverted: { value: window.isInverted ? 1.0 : 0.0 },
            is3D: { value: window.is3D ? 1.0 : 0.0 },
            renderMode: { value: 0.0 }, // default points
            numChars: { value: currentChars.length }
        },
        vertexShader: pointVertexShader,
        fragmentShader: pointFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    pointsObject = new THREE.Points(geo, mat);
    scene.add(pointsObject);
    
    setTimeout(() => {
        AsciiTests.run({
            chars: CHARS,
            pointsObject: pointsObject,
            camera: camera,
            mx: mouse.x, 
            my: mouse.y
        });
    }, 500);
}

function autoloadDefaultImage() {
    const defaultPath = 'images/silver.jpg';
    const img = new Image();
    img.onload = () => {
        window.currentImageBuffer = img;
        fetch('http://127.0.0.1:5000/depth_mock_sim')
            .then(r => r.json())
            .then(d => processImageToPointCloud(img, d.status))
            .catch(() => processImageToPointCloud(img, null));
    };
    img.src = defaultPath;
}

function animate() {
    requestAnimationFrame(animate);
    
    // Smooth Cursor-Based Rotation (TILT) or Drag-Based
    if (window.isDragEnabled && isMouseDown) {
        // Drag logic handled in event listeners
    } else {
        targetRotation.y = mouse.x * 0.4 + dragRotation.y;
        targetRotation.x = -mouse.y * 0.4 + dragRotation.x;
    }

    if (window.isAutoRotate) {
        dragRotation.y += 0.01;
    }

    if (window.isResetting) {
        dragRotation.x *= 0.9;
        dragRotation.y *= 0.9;
        targetZoom += (1200 - targetZoom) * 0.1;
        if (Math.abs(dragRotation.x) < 0.001 && Math.abs(dragRotation.y) < 0.001 && Math.abs(1200 - targetZoom) < 1) {
            dragRotation.x = 0;
            dragRotation.y = 0;
            targetZoom = 1200;
            window.isResetting = false;
        }
    }
    
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;
    
    // Smooth Zoom
    camera.position.z += (targetZoom - camera.position.z) * 0.1;
    
    if (pointsObject) {
        pointsObject.rotation.x = currentRotation.x;
        pointsObject.rotation.y = currentRotation.y;
        
        pointsObject.material.uniforms.time.value = performance.now() * 0.001;
        let modeVal = 0;
        if (mode === 'drift') modeVal = 1;
        if (mode === 'vortex') modeVal = 2;
        pointsObject.material.uniforms.mode.value = modeVal;
        pointsObject.material.uniforms.flowEnabled.value = window.isFlowEnabled ? 1.0 : 0.0;
        pointsObject.material.uniforms.inverted.value = window.isInverted ? 1.0 : 0.0;
        pointsObject.material.uniforms.is3D.value = window.is3D ? 1.0 : 0.0;
        
        let rMode = 0.0;
        if (window.renderMode === 'ascii') rMode = 1.0;
        if (window.renderMode === 'hybrid') rMode = 2.0;
        pointsObject.material.uniforms.renderMode.value = rMode;
        
        pointsObject.material.uniforms.numChars.value = currentChars.length;
        
        const targetX = (mouse.x * 600);
        const targetY = (mouse.y * 400);
        pointsObject.material.uniforms.mousePos.value.set(targetX, targetY);
    }
    
    renderer.render(scene, camera);
}

function createTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE; canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const COLS_LOCAL = 8;
    ctx.font = `bold ${CHAR_SIZE * 0.8}px monospace`; ctx.fillStyle = 'white';
    for (let i = 0; i < currentChars.length; i++) {
        const x = (i % COLS_LOCAL) * CHAR_SIZE + CHAR_SIZE / 2;
        const y = Math.floor(i / COLS_LOCAL) * CHAR_SIZE + CHAR_SIZE / 2;
        ctx.fillText(currentChars[i], x, y);
    }
    if (textureAtlas) textureAtlas.dispose();
    textureAtlas = new THREE.CanvasTexture(canvas);
    if (pointsObject) pointsObject.material.uniforms.atlas.value = textureAtlas;
}

function checkBackendStatus() {
    fetch('http://127.0.0.1:5000/status').then(r => r.json()).then(data => {
        const dot = document.getElementById('backend-status');
        if (dot && data.status === 'active') { 
            dot.style.backgroundColor = '#39d353'; 
            dot.style.boxShadow = '0 0 10px #39d353'; 
        }
    }).catch(() => {
        const dot = document.getElementById('backend-status');
        if (dot) { 
            dot.style.backgroundColor = '#f85149'; 
            dot.style.boxShadow = '0 0 10px #f85149'; 
        }
    });
}

function setupUI() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn && sidebar) {
        toggleBtn.onclick = () => {
            sidebar.classList.toggle('collapsed');
        };
    }

    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'glb' || ext === 'gltf') {
                loadGLB(file);
            } else {
                const reader = new FileReader();
                reader.onload = (re) => {
                    const img = new Image();
                    img.onload = () => {
                        window.currentImageBuffer = img;
                        processImageToPointCloud(img, null);
                    };
                    img.src = re.target.result;
                };
                reader.readAsDataURL(file);
            }
        }
    };

    document.querySelectorAll('#render-modes .mode-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#render-modes .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            window.renderMode = btn.getAttribute('data-render');
        };
    });

    document.querySelectorAll('#char-sets .mode-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#char-sets .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const setKey = btn.getAttribute('data-set');
            currentChars = CHAR_SETS[setKey];
            createTextureAtlas();
        };
    });

    document.querySelectorAll('#physics-modes .mode-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#physics-modes .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.getAttribute('data-mode');
        };
    });

    const resetBtn = document.getElementById('reset-view');
    if (resetBtn) {
        resetBtn.onclick = () => {
            window.isResetting = true;
        };
    }
    
    const resSlider = document.getElementById('res-slider');
    const resVal = document.getElementById('res-val');
    if (resSlider) {
        resSlider.oninput = (e) => {
            if (resVal) resVal.innerText = (30 - parseInt(e.target.value)); 
            if (pointsObject) {
                // Point size adjustment for immediate feedback
                pointsObject.material.uniforms.pointSize.value = (33 - parseFloat(e.target.value)) * 0.8;
            }
        };
        resSlider.onchange = (e) => {
           // Re-process current image for high-detail structural update
           if (window.currentImageBuffer) {
               processImageToPointCloud(window.currentImageBuffer, null);
           }
        }
    }
    
    const fleeSlider = document.getElementById('flee-slider');
    const fleeVal = document.getElementById('flee-val');
    if (fleeSlider) {
        fleeSlider.oninput = (e) => {
            if (fleeVal) fleeVal.innerText = e.target.value;
        };
    }

    const zoomSlider = document.getElementById('zoom-slider');
    const zoomVal = document.getElementById('zoom-val');
    if (zoomSlider) {
        zoomSlider.oninput = (e) => {
            targetZoom = parseFloat(e.target.value);
            if (zoomVal) zoomVal.innerText = Math.round(targetZoom);
        };
    }

    const flowToggle = document.getElementById('flow-toggle');
    if (flowToggle) {
        flowToggle.onchange = (e) => {
            window.isFlowEnabled = e.target.checked;
        };
    }

    const invertToggle = document.getElementById('invert-toggle');
    if (invertToggle) {
        invertToggle.onchange = (e) => {
            window.isInverted = e.target.checked;
        };
    }

    const dimToggle = document.getElementById('dim-toggle');
    if (dimToggle) {
        dimToggle.onchange = (e) => {
            window.is3D = e.target.checked;
        };
    }

    const autoRotateToggle = document.getElementById('auto-rotate-toggle');
    if (autoRotateToggle) {
        autoRotateToggle.onchange = (e) => {
            window.isAutoRotate = e.target.checked;
        };
    }

    const dragToggle = document.getElementById('drag-toggle');
    if (dragToggle) {
        dragToggle.onchange = (e) => {
            window.isDragEnabled = e.target.checked;
        };
    }
}

window.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mouseup', () => {
    isMouseDown = false;
});

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isMouseDown && window.isDragEnabled) {
        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;
        dragRotation.y += deltaX * 0.005;
        dragRotation.x += deltaY * 0.005;
        lastMousePos = { x: e.clientX, y: e.clientY };
    }
});

window.addEventListener('wheel', (e) => {
    const zoomStep = 80;
    if (e.deltaY > 0) {
        targetZoom = Math.min(targetZoom + zoomStep, 3000);
    } else {
        targetZoom = Math.max(targetZoom - zoomStep, 400);
    }
    const zoomSlider = document.getElementById('zoom-slider');
    const zoomVal = document.getElementById('zoom-val');
    if (zoomSlider) zoomSlider.value = targetZoom;
    if (zoomVal) zoomVal.innerText = Math.round(targetZoom);
}, { passive: false });

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
