let img;
let particles = [];
let mode = 'grid'; 
let interactionRange = 150;
let resolution = 8;
const CHARS = "  .·:∵∴∷•"; 
let charImages = []; 
let detailWeightMap = null;
let lastProcessingTime = 0;

class Particle {
    // HIGH PERFORMANCE: Avoiding p5.Vector objects to reduce GC pressure and object overhead
    constructor(x, y, charIndex, color) {
        this.ox = x; this.oy = y; // Origin
        this.px = random(width); this.py = random(height); // Position
        this.vx = 0; this.vy = 0; // Velocity
        this.ax = 0; this.ay = 0; // Acceleration
        this.charIndex = charIndex;
        this.color = color;
        
        this.maxSpeed = 10;
        this.maxForce = 0.6;
        this.friction = 0.88;
    }

    applyForce(fx, fy) {
        this.ax += fx;
        this.ay += fy;
    }

    behaviors() {
        // Arrive logic (Raw math for speed)
        let dx = this.ox - this.px;
        let dy = this.oy - this.py;
        let d = Math.sqrt(dx*dx + dy*dy);
        let speed = this.maxSpeed;
        if (d < 100) speed = (d / 100) * this.maxSpeed;
        
        let desiredX = (dx / d) * speed;
        let desiredY = (dy / d) * speed;
        
        let steerX = desiredX - this.vx;
        let steerY = desiredY - this.vy;
        let smag = Math.sqrt(steerX*steerX + steerY*steerY);
        if (smag > this.maxForce) {
            steerX = (steerX / smag) * this.maxForce;
            steerY = (steerY / smag) * this.maxForce;
        }

        // Flee logic
        let mdx = mouseX - this.px;
        let mdy = mouseY - this.py;
        let md = Math.sqrt(mdx*mdx + mdy*mdy);
        let fleeX = 0, fleeY = 0;

        if (md < interactionRange) {
            let mdesiredX = -(mdx / md) * this.maxSpeed;
            let mdesiredY = -(mdy / md) * this.maxSpeed;
            fleeX = mdesiredX - this.vx;
            fleeY = mdesiredY - this.vy;
            let fmag = Math.sqrt(fleeX*fleeX + fleeY*fleeY);
            if (fmag > (this.maxForce * 2.5)) {
                fleeX = (fleeX/fmag) * (this.maxForce * 2.5);
                fleeY = (fleeY/fmag) * (this.maxForce * 2.5);
            }
        }

        if (mode === 'grid') {
            this.applyForce(steerX * 1.5, steerY * 1.5);
        } else {
            this.applyForce(steerX * 0.5, steerY * 0.5);
            this.applyForce(fleeX * 2.5, fleeY * 2.5);
            if (mode === 'vortex') {
                let vx = -(mouseY - this.py) * 0.02;
                let vy = (mouseX - this.px) * 0.02;
                this.applyForce(vx, vy);
            }
        }
    }

    update() {
        this.vx += this.ax;
        this.vy += this.ay;
        this.px += this.vx;
        this.py += this.vy;
        this.ax = 0;
        this.ay = 0;
        this.vx *= this.friction;
        this.vy *= this.friction;
    }

    draw() {
        tint(this.color);
        image(charImages[this.charIndex], this.px, this.py);
    }
}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-holder');
    img = null; 
    setupUI();
    imageMode(CENTER);
}

function draw() {
    background(0); 
    
    if (particles.length > 0) {
        // Optimized loop
        for (let i = 0, len = particles.length; i < len; i++) {
            let p = particles[i];
            p.behaviors();
            p.update();
            p.draw();
        }
    } else {
        textAlign(CENTER, CENTER);
        fill(100);
        noStroke();
        textSize(16);
        text("Choose an image to begin the experience", width/2, height/2);
    }
    
    updateStats();
}

function updateStats() {
    if (frameCount % 30 === 0) {
        document.getElementById('fps-counter').innerText = `${floor(frameRate())} FPS`;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (img) processImageIntoParticles();
}

function preRenderChars() {
    charImages = [];
    let size = resolution * 1.5;
    for (let i = 0; i < CHARS.length; i++) {
        let pg = createGraphics(Math.ceil(size * 2), Math.ceil(size * 2));
        pg.pixelDensity(1);
        pg.fill(255);
        pg.textAlign(CENTER, CENTER);
        pg.textSize(size);
        pg.text(CHARS[i], size, size);
        charImages.push(pg);
    }
}

function processImageIntoParticles() {
    if (!img) return;
    
    const startTime = performance.now();
    
    preRenderChars();
    particles = [];
    
    let imgAspect = img.height / img.width;
    let windowAspect = height / width;

    let tw, th;
    if (imgAspect > windowAspect) {
        th = floor(height / resolution);
        tw = floor(th / imgAspect);
    } else {
        tw = floor(width / resolution);
        th = floor(tw * imgAspect);
    }

    let temp = img.get();
    temp.resize(tw, th);
    temp.loadPixels();

    const xOff = (width - tw * resolution) / 2;
    const yOff = (height - th * resolution) / 2;

    for (let y = 0; y < temp.height; y++) {
        for (let x = 0; x < temp.width; x++) {
            const index = (x + y * temp.width) * 4;
            const r = temp.pixels[index];
            const g = temp.pixels[index+1];
            const b = temp.pixels[index+2];
            const brightness = (r + g + b) / 3;

            if (brightness > 10) {
                const charIdx = floor(map(brightness, 0, 255, 0, CHARS.length - 1));
                const px = xOff + x * resolution + resolution/2;
                const py = yOff + y * resolution + resolution/2;
                
                let isDetailArea = false;
                if (detailWeightMap) {
                    let mapX = floor(map(x, 0, tw, 0, detailWeightMap.width));
                    let mapY = floor(map(y, 0, th, 0, detailWeightMap.height));
                    let weightIdx = (mapX + mapY * detailWeightMap.width);
                    if (detailWeightMap.weight_map[weightIdx] > 50) isDetailArea = true;
                }

                particles.push(new Particle(px, py, charIdx, color(r, g, b)));
                if (isDetailArea) {
                    particles.push(new Particle(px + random(-2,2), py + random(-2,2), charIdx, color(r, g, b)));
                }
            }
        }
    }

    lastProcessingTime = performance.now() - startTime;

    AsciiTests.run({
        chars: CHARS,
        imgW: img.width, imgH: img.height,
        gridW: tw, gridH: th,
        particleCount: particles.length,
        particles: particles,
        winW: width, winH: height,
        fps: frameRate(),
        latency: lastProcessingTime
    });
}

function setupUI() {
    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            let formData = new FormData();
            formData.append('image', file);
            fetch('http://127.0.0.1:5000/analyze', { method: 'POST', body: formData })
                .then(r => r.json()).then(data => { detailWeightMap = data; processImageIntoParticles(); })
                .catch(e => console.warn("Backend unavailable"));

            loadImage(URL.createObjectURL(file), (newImg) => {
                img = newImg;
                processImageIntoParticles();
            });
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

    document.getElementById('flee-slider').oninput = (e) => { interactionRange = parseInt(e.target.value); };
    document.getElementById('res-slider').oninput = (e) => { resolution = parseInt(e.target.value); if (img) processImageIntoParticles(); };
}
