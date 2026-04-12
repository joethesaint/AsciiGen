/**
 * PointGen: High-End Volumetric Point Cloud Engine (v3.2)
 * Features: Cursor Interactivity, Zoom, Character Inversion, & 2D/3D Mode
 */

let scene, camera, renderer, pointsObject;
let mode = 'grid';
window.isFlowEnabled = true;
window.isInverted = false;
window.is3D = true;
const CHARS = "  .·:∵∴∷•";
let textureAtlas;
let mouse = new THREE.Vector2();
let targetRotation = new THREE.Euler();
let currentRotation = new THREE.Euler();
let targetZoom = 1200;

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
        
        // Kinetic Drift
        if (mode > 0.5) {
            pos.z += sin(time * 2.5 + (pos.x + pos.y) * 0.01) * 35.0;
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

    void main() {
        float size = 1.0 / atlasCols;
        float actualIdx = vCharIndex;
        
        // Real Character Inversion: Dark <-> Light
        if (inverted > 0.5) {
            actualIdx = (numChars - 1.0) - vCharIndex;
        }
        
        float x = mod(actualIdx, atlasCols) * size;
        float y = floor(actualIdx / atlasCols) * size;
        
        vec2 charUv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
        vec2 uv = vec2(x, 1.0 - y - size) + charUv * size;
        
        vec4 texColor = texture2D(atlas, uv);
        if (texColor.r < 0.1) discard; 
        
        vec3 color = vColor * 2.5; 
        gl_FragColor = vec4(color, 1.0);
    }
`;

function processImageToPointCloud(img, depthData) {
    if (pointsObject) scene.remove(pointsObject);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const density = 4;
    const tw = Math.floor(img.width / density);
    const th = Math.floor(img.height / density);
    canvas.width = tw;
    canvas.height = th;
    ctx.drawImage(img, 0, 0, tw, th);
    const imgData = ctx.getImageData(0, 0, tw, th).data;

    finalizePointCloud(tw, th, imgData, depthData);
}

function finalizePointCloud(tw, th, imgData, dData) {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const charIndices = [];

    const spacing = 10;
    const xOff = -(tw * spacing) / 2;
    const yOff = (th * spacing) / 2;

    for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
            const i = (x + y * tw) * 4;
            const r = imgData[i] / 255;
            const g = imgData[i+1] / 255;
            const b = imgData[i+2] / 255;
            const bri = (r * 0.21 + g * 0.72 + b * 0.07) * 255;

            if (bri > 2) {
                const dep = (dData && dData !== 'simulated') ? dData[i] : bri;
                positions.push(xOff + x * spacing, yOff - y * spacing, dep * 2.5);
                colors.push(r, g, b);
                charIndices.push(Math.floor((bri/255) * (CHARS.length - 1)));
            }
        }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('charIndex', new THREE.Float32BufferAttribute(charIndices, 1));

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
            numChars: { value: CHARS.length }
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
        fetch('http://127.0.0.1:5000/depth_mock_sim')
            .then(r => r.json())
            .then(d => processImageToPointCloud(img, d.status))
            .catch(() => processImageToPointCloud(img, null));
    };
    img.src = defaultPath;
}

function animate() {
    requestAnimationFrame(animate);
    
    // Smooth Cursor-Based Rotation (TILT)
    targetRotation.y = mouse.x * 0.4;
    targetRotation.x = -mouse.y * 0.4;
    
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;
    
    // Smooth Zoom
    camera.position.z += (targetZoom - camera.position.z) * 0.1;
    
    if (pointsObject) {
        pointsObject.rotation.x = currentRotation.x;
        pointsObject.rotation.y = currentRotation.y;
        
        pointsObject.material.uniforms.time.value = performance.now() * 0.001;
        pointsObject.material.uniforms.mode.value = (mode === 'drift') ? 1 : 0;
        pointsObject.material.uniforms.flowEnabled.value = window.isFlowEnabled ? 1.0 : 0.0;
        pointsObject.material.uniforms.inverted.value = window.isInverted ? 1.0 : 0.0;
        pointsObject.material.uniforms.is3D.value = window.is3D ? 1.0 : 0.0;
        pointsObject.material.uniforms.numChars.value = CHARS.length;
        
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
    ctx.font = `bold ${CHAR_SIZE * 0.8}px monospace`; ctx.fillStyle = 'white';
    for (let i = 0; i < CHARS.length; i++) {
        const x = (i % COLS) * CHAR_SIZE + CHAR_SIZE / 2;
        const y = Math.floor(i / COLS) * CHAR_SIZE + CHAR_SIZE / 2;
        ctx.fillText(CHARS[i], x, y);
    }
    textureAtlas = new THREE.CanvasTexture(canvas);
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
            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => processImageToPointCloud(img, null);
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mode = btn.getAttribute('data-mode');
        };
    });

    const resSlider = document.getElementById('res-slider');
    const resVal = document.getElementById('res-val');
    if (resSlider) {
        resSlider.oninput = (e) => {
            if (resVal) resVal.innerText = e.target.value;
            if (pointsObject) pointsObject.material.uniforms.pointSize.value = parseFloat(e.target.value) * 2.0;
        };
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
}

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
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
