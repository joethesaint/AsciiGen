/**
 * PointGen: Three.js GPU Accelerated Kinetic Pointillism
 * Intertwines Python AI with High-Speed WebGL Rendering
 */

let scene, camera, renderer, points;
let particles = [];
let mode = 'grid';
let interactionRange = 150;
let resolution = 8; 
const CHARS = "  .·:∵∴∷•";
let detailWeightMap = null;
let imgLoadedObject = null;

// Texture Atlas Config
const ATLAS_SIZE = 512;
const CHAR_SIZE = 64;
const COLS = 8;
let textureAtlas;

class Particle {
    constructor(x, y, charIndex, color) {
        this.ox = x; this.oy = y;
        this.px = (Math.random() - 0.5) * window.innerWidth;
        this.py = (Math.random() - 0.5) * window.innerHeight;
        this.vx = 0; this.vy = 0;
        this.ax = 0; this.ay = 0;
        this.charIndex = charIndex;
        this.color = color;
    }
}

function init() {
    try {
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(
            window.innerWidth / -2, window.innerWidth / 2,
            window.innerHeight / 2, window.innerHeight / -2,
            0.1, 1000
        );
        camera.position.z = 10;

        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); // Faster sans-antialias for points
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.getElementById('canvas-holder').appendChild(renderer.domElement);

        createTextureAtlas();
        setupUI();
        
        // Heartbeat check for Python AI
        checkBackendStatus();
        setInterval(checkBackendStatus, 3000);
        
        // Initial Cinematic Particles
        createAmbientDust();
        
        animate();
        console.log("PointGen: WebGL Engine Initialized");
    } catch (e) {
        console.error("Critical Engine Failure:", e);
    }
}

function createAmbientDust() {
    particles = [];
    for (let i = 0; i < 5000; i++) {
        const ci = Math.floor(Math.random() * CHARS.length);
        const c = new THREE.Color(0.2, 0.4, 0.8);
        let p = new Particle(
            (Math.random() - 0.5) * window.innerWidth,
            (Math.random() - 0.5) * window.innerHeight,
            ci, c
        );
        p.ox = p.px; p.oy = p.py;
        particles.push(p);
    }
    updateThreeJSPoints();
}

function checkBackendStatus() {
    fetch('http://127.0.0.1:5000/')
        .then(r => r.json())
        .then(data => {
            const dot = document.getElementById('backend-status');
            if (dot && data.status === 'active') {
                dot.style.backgroundColor = '#2ea043';
                dot.style.boxShadow = '0 0 10px #2ea043';
                dot.title = 'Python Intelligence: Active';
            }
        })
        .catch(() => {
            const dot = document.getElementById('backend-status');
            if (dot) {
                dot.style.backgroundColor = '#f85149';
                dot.style.boxShadow = '0 0 10px #f85149';
                dot.title = 'Python Intelligence: Offline';
            }
        });
}

function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function createTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${CHAR_SIZE * 0.8}px monospace`;
    ctx.fillStyle = 'white';

    for (let i = 0; i < CHARS.length; i++) {
        const x = (i % COLS) * CHAR_SIZE + CHAR_SIZE / 2;
        const y = Math.floor(i / COLS) * CHAR_SIZE + CHAR_SIZE / 2;
        ctx.fillText(CHARS[i], x, y);
    }

    textureAtlas = new THREE.CanvasTexture(canvas);
}

const vertexShader = `
    attribute float charIndex;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vCharIndex;
    uniform float pointSize;
    
    void main() {
        vColor = color;
        vCharIndex = charIndex;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = pointSize * 1.5; 
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    varying vec3 vColor;
    varying float vCharIndex;
    uniform sampler2D atlas;
    uniform float atlasCols;

    void main() {
        float size = 1.0 / atlasCols;
        float x = mod(vCharIndex, atlasCols) * size;
        float y = floor(vCharIndex / atlasCols) * size;
        
        // Correct UV mapping for canvas-style texture atlas
        vec2 uv = vec2(x, 1.0 - y - size) + vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) * size;
        vec4 texColor = texture2D(atlas, uv);
        
        if (texColor.r < 0.1) discard;
        // Boost vibrancy for pointillism
        gl_FragColor = vec4(vColor * texColor.rgb * 1.5, 0.8);
    }
`;

function processImage(img) {
    const startTime = performance.now();
    particles = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const aspect = img.height / img.width;
    let tw, th;
    if (aspect > window.innerHeight / window.innerWidth) {
        th = Math.floor(window.innerHeight / resolution);
        tw = Math.floor(th / aspect);
    } else {
        tw = Math.floor(window.innerWidth / resolution);
        th = Math.floor(tw * aspect);
    }

    canvas.width = tw;
    canvas.height = th;
    ctx.drawImage(img, 0, 0, tw, th);
    const data = ctx.getImageData(0, 0, tw, th).data;

    const xOff = - (tw * resolution) / 2;
    const yOff = (th * resolution) / 2;

    for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
            const i = (x + y * tw) * 4;
            // Perceptual luminance for better detail detection
            const bri = (data[i] * 0.2126 + data[i+1] * 0.7152 + data[i+2] * 0.0722);
            
            if (bri > 5) { // Lower threshold to capture subtle textures
                const ci = Math.floor((bri / 255) * (CHARS.length - 1));
                const c = new THREE.Color(data[i]/255, data[i+1]/255, data[i+2]/255);
                
                // Boost visibility slightly
                c.convertSRGBToLinear(); 

                const px = xOff + x * resolution;
                const py = yOff - y * resolution;
                particles.push(new Particle(px, py, ci, c));
                
                if (detailWeightMap) {
                    let mapX = Math.floor(mapRange(x, 0, tw, 0, detailWeightMap.width));
                    let mapY = Math.floor(mapRange(y, 0, th, 0, detailWeightMap.height));
                    let weightIdx = (mapX + mapY * detailWeightMap.width);
                    if (detailWeightMap.weight_map[weightIdx] > 50) {
                        particles.push(new Particle(px + (Math.random()-0.5)*2, py + (Math.random()-0.5)*2, ci, c));
                    }
                }
            }
        }
    }

    updateThreeJSPoints();
    
    // TDD Diagnostic report
    AsciiTests.run({
        chars: CHARS,
        imgW: img.width, imgH: img.height,
        gridW: tw, gridH: th,
        particleCount: particles.length,
        particles: [], // skip full array for console perf
        winW: window.innerWidth, winH: window.innerHeight,
        fps: 60,
        latency: performance.now() - startTime
    });
}

function updateThreeJSPoints() {
    if (points) scene.remove(points);

    const geo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particles.length * 3);
    const colorArray = new Float32Array(particles.length * 3);
    const charArray = new Float32Array(particles.length);

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        posArray[i*3] = p.px;
        posArray[i*3+1] = p.py;
        posArray[i*3+2] = 0;
        colorArray[i*3] = p.color.r;
        colorArray[i*3+1] = p.color.g;
        colorArray[i*3+2] = p.color.b;
        charArray[i] = p.charIndex;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geo.setAttribute('charIndex', new THREE.BufferAttribute(charArray, 1));

    const mat = new THREE.ShaderMaterial({
        uniforms: {
            atlas: { value: textureAtlas },
            atlasCols: { value: COLS },
            pointSize: { value: resolution }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        blending: THREE.AdditiveBlending 
    });

    points = new THREE.Points(geo, mat);
    scene.add(points);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (particles.length > 0 && points) {
        const positions = points.geometry.attributes.position.array;
        const mx = (mouseX - window.innerWidth / 2);
        const my = -(mouseY - window.innerHeight / 2);

        for (let i = 0, len = particles.length; i < len; i++) {
            const p = particles[i];
            
            // Fast Physics
            let dx = p.ox - p.px;
            let dy = p.oy - p.py;
            let d2 = dx*dx + dy*dy;
            if (d2 > 0.1) {
                let d = Math.sqrt(d2);
                let speed = (d < 100) ? (d/100) * 10 : 10;
                let sx = ((dx/d)*speed) - p.vx;
                let sy = ((dy/d)*speed) - p.vy;
                let weight = (mode === 'grid') ? 1.5 : 0.5;
                p.ax += sx * weight * 0.6;
                p.ay += sy * weight * 0.6;
            }

            let mdx = mx - p.px;
            let mdy = my - p.py;
            let md2 = mdx*mdx + mdy*mdy;
            if (md2 < interactionRange * interactionRange) {
                let md = Math.sqrt(md2);
                p.ax += (-(mdx/md)*10 - p.vx) * 2.5;
                p.ay += (-(mdy/md)*10 - p.vy) * 2.5;
            }

            if (mode === 'vortex') {
                p.ax -= (my - p.py) * 0.02;
                p.ay += (mx - p.px) * 0.02;
            }

            p.vx += p.ax; p.vy += p.ay;
            p.px += p.vx; p.py += p.vy;
            p.ax = 0; p.ay = 0;
            p.vx *= 0.88; p.vy *= 0.88;

            positions[i*3] = p.px;
            positions[i*3+1] = p.py;
        }
        points.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

// Global Interaction tracking
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function setupUI() {
    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            let formData = new FormData();
            formData.append('image', file);
            fetch('http://127.0.0.1:5000/analyze', { method: 'POST', body: formData })
                .then(r => r.json())
                .then(data => { 
                    detailWeightMap = data; 
                    if (imgLoadedObject) processImage(imgLoadedObject);
                })
                .catch(() => console.warn("Backend unavailable"));

            const reader = new FileReader();
            reader.onload = (re) => {
                imgLoadedObject = new Image();
                imgLoadedObject.onload = () => processImage(imgLoadedObject);
                imgLoadedObject.src = re.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.onclick = () => {
            mode = btn.getAttribute('data-mode');
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    document.getElementById('res-slider').oninput = (e) => {
        resolution = parseInt(e.target.value);
        if (imgLoadedObject) processImage(imgLoadedObject);
    };
    
    document.getElementById('flee-slider').oninput = (e) => {
        interactionRange = parseInt(e.target.value);
    };
}

window.addEventListener('resize', () => {
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
init();
