/**
 * PointGen: High-End Volumetric Point Cloud Engine (v3.2)
 * Features: Cursor Interactivity, Zoom, Character Inversion, & 2D/3D Mode
 */

let scene, camera, renderer, pointsObject, controls;
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
let activeKernel = 'edges';
let smartWeightMap = null;
let samplingWorker = new Worker('worker.js');
let depthEstimator = null;
let textureAtlas;
let mouse = new THREE.Vector2();
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
        
        // OrbitControls for stable, professional interaction
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 400;
        controls.maxDistance = 5000;
        
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
    attribute float edgeWeight;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vCharIndex;
    varying float vEdgeWeight;
    varying float vDepth;
    uniform float time;
    uniform float pointSize;
    uniform vec2 mousePos;
    uniform float interactionRange;
    uniform float mode;
    uniform float flowEnabled;
    uniform float is3D;

    void main() {
        vColor = color;
        vCharIndex = charIndex;
        vEdgeWeight = edgeWeight;
        
        vec3 pos = position;
        
        // Dimensional flattening
        if (is3D < 0.5) {
            pos.z = 0.0;
        }
        
        // Flow Interaction (The Poke)
        if (flowEnabled > 0.5) {
            float d = distance(pos.xy, mousePos);
            if (d < interactionRange) {
                float s = (1.0 - d / interactionRange);
                pos.z += s * (interactionRange * 0.6); 
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
        
        // Edge-Aware Sizing: Keep text sizes relatively stable to preserve the ASCII grid illusion
        float sizeMod = 1.0 + vEdgeWeight * 0.5;
        
        // In 2D mode, enforce strict uniform sizing for a perfect mosaic grid. 
        // In 3D mode, allow moderate perspective scaling.
        if (is3D < 0.5) {
            gl_PointSize = pointSize;
        } else {
            gl_PointSize = pointSize * sizeMod * (1200.0 / -mvPosition.z);
        }
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const pointFragmentShader = `
    varying vec3 vColor;
    varying float vCharIndex;
    varying float vEdgeWeight;
    varying float vDepth;
    uniform sampler2D atlas;
    uniform float atlasCols;
    uniform float inverted;
    uniform float numChars;
    uniform float renderMode; // 0=points(dots), 1=ascii, 2=hybrid
    uniform float time;

    void main() {
        float size = 1.0 / atlasCols;
        
        float actualIdx = vCharIndex;
        
        // Mode Redirection
        if (renderMode < 0.5 || (renderMode > 1.5 && vEdgeWeight <= 0.5)) { 
             actualIdx = min(vCharIndex, 3.0); 
        }
        
        // Real Character Inversion: Dark <-> Light
        if (inverted > 0.5) {
            actualIdx = (numChars - 1.0) - actualIdx;
        }
        
        // Depth-of-Field (DOF): Pseudo-blur based on Z-distance
        float focus = 1200.0;
        float d = abs(vDepth - focus) * 0.002;
        float blur = clamp(d, 0.0, 0.8);
        
        vec2 charUv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
        
        // Map to Atlas properly for the single current set
        float x = mod(actualIdx, atlasCols) * size;
        float y = floor(actualIdx / atlasCols) * size;
        vec2 uv = vec2(x, 1.0 - y - size) + charUv * size;
        
        vec4 texColor = texture2D(atlas, uv);
        
        if (renderMode < 0.5) {
             if (length(gl_PointCoord - 0.5) > 0.45) discard;
        } else if (renderMode < 1.5) {
             if (texColor.r < 0.1) discard; 
        } else {
             if (vEdgeWeight > 0.5) {
                 if (texColor.r < 0.1) discard;
             } else {
                 if (length(gl_PointCoord - 0.5) > 0.45) discard;
             }
        }
        
        vec3 color = vColor * 2.5; 
        
        if (vEdgeWeight > 0.6) {
            color *= (1.2 + 0.3 * sin(time * 3.0)); 
        }
        
        float alpha = 1.0 - blur;
        gl_FragColor = vec4(color, alpha);
    }
`;

/** 
 * Smart Adaptive Sampling: Higher density on edges, governed by UI slider
 */
function processImageToPointCloud(img, depthData) {
    window.loadStartTime = performance.now();
    show3DControls();
    
    const sampleWidth = img.width > 800 ? 800 : img.width;
    const sampleHeight = Math.floor(sampleWidth * (img.height / img.width));
    
    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    
    const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    
    const baseDensity = window.uiController ? (30 - window.uiController.config.density) : 2;
    const edges = new Uint8Array(sampleWidth * sampleHeight);
    for (let y = 1; y < sampleHeight - 1; y++) {
        for (let x = 1; x < sampleWidth - 1; x++) {
            const i = (y * sampleWidth + x) * 4;
            const bri = (data[i]*0.3 + data[i+1]*0.59 + data[i+2]*0.11);
            const right = ((data[i+4]*0.3 + data[i+5]*0.59 + data[i+6]*0.11));
            const down = ((data[i+(sampleWidth*4)]*0.3 + data[i+(sampleWidth*4)+1]*0.59 + data[i+(sampleWidth*4)+2]*0.11));
            edges[y * sampleWidth + x] = Math.min(255, Math.abs(bri - right) + Math.abs(bri - down));
        }
    }

    // High-fidelity structural relief depth map
    const depthMap = new Float32Array(sampleWidth * sampleHeight);
    for (let i = 0; i < sampleWidth * sampleHeight; i++) {
        const bri = (data[i*4]*0.3 + data[i*4+1]*0.59 + data[i*4+2]*0.11);
        const edge = edges[i] / 255;
        // Volumetric Formula: Z = Base depth + Edge relief focus
        depthMap[i] = bri * 1.5 + edge * 80.0;
    }

    samplingWorker.onmessage = function(e) {
        const { positions, colors, charIndices, edgeWeights } = e.data;
        finalizePointCloud(positions, colors, charIndices, edgeWeights);
        hide3DControls();
    };

    samplingWorker.postMessage({
        data,
        sampleWidth,
        sampleHeight,
        smartWeightMap,
        depthMap, // Real structural depth
        baseDensity,
        spacing: 12,
        edges,
        currentCharsLength: currentChars.length 
    });
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
    window.loadStartTime = performance.now();
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
    const edgeWeights = [];

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
                edgeWeights.push(intensity); // Intensity acts as edge weight for mesh
            }
        }
    });

    finalizePointCloud(positions, colors, charIndices, edgeWeights);
}

function finalizePointCloud(positions, colors, charIndices, edgeWeights) {
    if (pointsObject) scene.remove(pointsObject);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('charIndex', new THREE.Float32BufferAttribute(charIndices, 1));
    geo.setAttribute('edgeWeight', new THREE.Float32BufferAttribute(edgeWeights, 1));

    const spacing = 10;
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            numChars: { value: currentChars.length },
            pointSize: { value: (window.uiController ? window.uiController.config.density : 28) * 0.8 },
            atlas: { value: textureAtlas },
            atlasCols: { value: COLS },
            time: { value: 0 },
            mousePos: { value: new THREE.Vector2(-5000, -5000) },
            interactionRange: { value: parseFloat(document.getElementById('flee-slider').value) || 250.0 },
            mode: { value: 0 },
            flowEnabled: { value: window.isFlowEnabled ? 1.0 : 0.0 },
            inverted: { value: window.isInverted ? 1.0 : 0.0 },
            is3D: { value: window.is3D ? 1.0 : 0.0 },
            renderMode: { value: (window.renderMode === 'ascii' ? 1.0 : (window.renderMode === 'hybrid' ? 2.0 : 0.0)) },
            numChars: { value: currentChars.length }
        },
        vertexShader: pointVertexShader,
        fragmentShader: pointFragmentShader,
        transparent: true,
        depthTest: true,
        depthWrite: true,
        blending: THREE.NormalBlending
    });
    
    pointsObject = new THREE.Points(geo, mat);
    scene.add(pointsObject);
    
    if (window.loadStartTime) {
        const diff = (performance.now() - window.loadStartTime).toFixed(1);
        const loadEl = document.getElementById('load-time');
        if (loadEl) loadEl.innerText = `${diff}ms`;
        window.loadStartTime = null;
    }
}
    
    /* 
    setTimeout(() => {
        AsciiTests.run({
            chars: currentChars,
            pointsObject: pointsObject,
            camera: camera,
            mx: mouse.x, 
            my: mouse.y
        });
    }, 500); 
    */

/**
 * Fetches nuanced weight maps from the Python backend
 */
async function fetchSmartMetadata(fileObject) {
    const formData = new FormData();
    formData.append('image', fileObject);
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/analyze?kernel=${activeKernel}&zoom=1.0`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        smartWeightMap = {
            data: data.weight_map,
            width: data.width,
            height: data.height
        };
        console.log(`Smart Metadata Active: Kernel=${activeKernel}`);
    } catch (e) {
        console.warn("Backend Analyze Failed: Falling back to local edge detection.");
        smartWeightMap = null;
    }
}

function autoloadDefaultImage() {
    const defaultPath = 'images/silver.jpg';
    fetch(defaultPath).then(r => r.blob()).then(blob => {
        window.lastFile = new File([blob], 'silver.jpg', { type: 'image/jpeg' });
        const img = new Image();
        img.onload = () => {
            window.currentImageBuffer = img;
            fetch('http://127.0.0.1:5000/depth_mock_sim')
                .then(r => r.json())
                .then(d => processImageToPointCloud(img, d.status))
                .catch(() => processImageToPointCloud(img, null));
        };
        img.src = URL.createObjectURL(blob);
    });
}

function loadSDFData(url) {
    window.loadStartTime = performance.now();
    fetch(url)
        .then(r => r.json())
        .then(d => {
            if (pointsObject) scene.remove(pointsObject);
            const geo = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];
            const charIndices = [];
            
            const edgeWeights = [];
            
            d.points.forEach(pt => {
                positions.push(pt.x, pt.y, pt.z);
                colors.push(1.0, 1.0, 1.0); // Default white
                charIndices.push(Math.floor((pt.bri/255) * (currentChars.length - 1)));
                edgeWeights.push(1.0); // Default edge weight
            });
            
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geo.setAttribute('charIndex', new THREE.Float32BufferAttribute(charIndices, 1));
            geo.setAttribute('edgeWeight', new THREE.Float32BufferAttribute(edgeWeights, 1));
            
            const mat = new THREE.ShaderMaterial({
                uniforms: {
                    atlas: { value: textureAtlas },
                    atlasCols: { value: COLS },
                    pointSize: { value: 12.0 },
                    time: { value: 0 },
                    mousePos: { value: new THREE.Vector2(-5000, -5000) },
                    interactionRange: { value: 250.0 },
                    mode: { value: mode === 'drift' ? 1 : 0 },
                    flowEnabled: { value: window.isFlowEnabled ? 1.0 : 0.0 },
                    inverted: { value: window.isInverted ? 1.0 : 0.0 },
                    is3D: { value: window.is3D ? 1.0 : 0.0 },
                    renderMode: { value: (window.renderMode === 'ascii' ? 1.0 : (window.renderMode === 'hybrid' ? 2.0 : 0.0)) },
                    numChars: { value: currentChars.length }
                },
                vertexShader: pointVertexShader,
                fragmentShader: pointFragmentShader,
                transparent: true,
                depthTest: true,
                depthWrite: true,
                blending: THREE.NormalBlending
            });
            
            pointsObject = new THREE.Points(geo, mat);
            scene.add(pointsObject);
        });
}

let fpsLastTime = performance.now();
let fpsFrames = 0;

function animate() {
    requestAnimationFrame(animate);
    
    // FPS tracking
    const now = performance.now();
    fpsFrames++;
    if (now - fpsLastTime >= 1000) {
        const fpsEl = document.getElementById('fps-counter');
        if (fpsEl) fpsEl.innerText = `${fpsFrames} FPS`;
        fpsFrames = 0;
        fpsLastTime = now;
    }
    
    // Smooth Orbit Interaction
    if (controls) controls.update();

    if (window.isAutoRotate && controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 4.0;
    } else if (controls) {
        controls.autoRotate = false;
    }

    if (window.isResetting && controls) {
        controls.reset();
        window.isResetting = false;
        // Resets sliders
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomVal = document.getElementById('zoom-val');
        if (zoomSlider) zoomSlider.value = 1200;
        if (zoomVal) zoomVal.innerText = 1200;
    }
    
    // Sync UI Sliders (View Distance) with Controls
    if (controls) {
        const zoomVal = document.getElementById('zoom-val');
        const zoomSlider = document.getElementById('zoom-slider');
        const dist = Math.round(camera.position.distanceTo(controls.target));
        if (zoomVal && !window.isResetting) zoomVal.innerText = dist;
        if (zoomSlider && !window.isResetting) zoomSlider.value = dist;
    }

    if (pointsObject) {
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
        
        pointsObject.material.uniforms.interactionRange.value = parseFloat(document.getElementById('flee-slider').value) || 250.0;
    }
    
    renderer.render(scene, camera);
}

function createTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE; canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black'; ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${CHAR_SIZE * 0.85}px "Courier New", Courier, monospace`; ctx.fillStyle = 'white';
    for (let i = 0; i < Math.min(currentChars.length, 64); i++) {
        const x = (i % COLS) * CHAR_SIZE + CHAR_SIZE / 2;
        const y = Math.floor(i / COLS) * CHAR_SIZE + CHAR_SIZE / 2;
        ctx.fillText(currentChars[i], x, y);
    }
    if (textureAtlas) textureAtlas.dispose();
    textureAtlas = new THREE.CanvasTexture(canvas);
    textureAtlas.minFilter = THREE.NearestFilter;
    textureAtlas.magFilter = THREE.NearestFilter;
    if (pointsObject) pointsObject.material.uniforms.atlas.value = textureAtlas;
}

function checkBackendStatus() {
    fetch('http://127.0.0.1:5000/status').then(r => r.json()).then(data => {
        const dot = document.getElementById('backend-status');
        const fpsEl = document.getElementById('fps-counter');
        if (dot && data.status === 'active') { 
            dot.style.backgroundColor = '#39d353'; 
            dot.style.boxShadow = '0 0 10px #39d353'; 
        }
        if (fpsEl && data.status === 'active') {
            fpsEl.style.color = '#39d353';
        }
    }).catch(() => {
        const dot = document.getElementById('backend-status');
        const fpsEl = document.getElementById('fps-counter');
        if (dot) { 
            dot.style.backgroundColor = '#f85149'; 
            dot.style.boxShadow = '0 0 10px #f85149'; 
        }
        if (fpsEl) {
            fpsEl.style.color = '#f85149';
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
            window.lastFile = file; // Store for kernel switching
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'glb' || ext === 'gltf') {
                loadGLB(file);
            } else {
                fetchSmartMetadata(file).then(() => {
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
                });
            }
        }
    };

    window.uiController = new EngineUIController();
    window.uiController.addEventListener('uiChange', async (e) => {
        const { key, value, config, isFinalChange } = e.detail;
        
        // Sync globals
        window.renderMode = config.renderMode;
        currentChars = CHAR_SETS[config.charSet];
        mode = config.physicsMode;
        window.isFlowEnabled = config.flowEnabled;
        window.isInverted = config.inverted;
        window.is3D = config.is3D;
        window.isAutoRotate = config.autoRotate;
        window.isDragEnabled = config.dragEnabled;
        
        // Trigger specific logic on key changes
        if (key === 'charSet') createTextureAtlas();
        
        if (key === 'kernel' && isFinalChange) {
            activeKernel = config.kernel;
            if (window.lastFile) await fetchSmartMetadata(window.lastFile);
            if (window.currentImageBuffer) processImageToPointCloud(window.currentImageBuffer, null);
        }
        
        if (key === 'density') {
            if (pointsObject && !isFinalChange) pointsObject.material.uniforms.pointSize.value = value * 0.8;
            if (isFinalChange && window.currentImageBuffer) processImageToPointCloud(window.currentImageBuffer, null);
        }
        
        if (key === 'zoom') {
            const dir = camera.position.clone().sub(controls.target).normalize();
            camera.position.copy(controls.target).add(dir.multiplyScalar(value));
        }
        
        if (isFinalChange) {
            try {
                fetch('http://127.0.0.1:5000/update_config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                }).catch(() => {});
            } catch (err) {}
        }
    });

    document.querySelectorAll('#morph-modes .mode-btn').forEach(btn => {
        btn.onclick = () => {
            const shape = btn.getAttribute('data-shape');
            loadSDFData(`http://127.0.0.1:5000/morph/${shape}`);
        };
    });

    const btnText = document.getElementById('btn-text-cloud');
    if (btnText) {
        btnText.onclick = () => {
            const txt = document.getElementById('text-input').value || 'PointGen';
            loadSDFData(`http://127.0.0.1:5000/text-to-cloud?text=${encodeURIComponent(txt)}`);
        };
    }

    const resetBtn = document.getElementById('reset-view');
    if (resetBtn) {
        resetBtn.onclick = () => {
            window.isResetting = true;
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
