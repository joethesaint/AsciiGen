let img;
let particles = [];
let mode = 'grid'; 
let interactionRange = 150;
let resolution = 8;
const CHARS = "  .·:∵∴∷•";
let charImages = []; 
let detailWeightMap = null; // Data from Python Backend

class Particle {
    constructor(x, y, char, charIndex, brightness, color) {
        this.origin = createVector(x, y);
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.charIndex = charIndex; // Index for texture lookup
        this.brightness = brightness;
        this.color = color;
        
        this.maxSpeed = 8;
        this.maxForce = 0.5;
        this.friction = 0.9;
    }

    applyForce(f) {
        this.acc.add(f);
    }

    behaviors() {
        let arrive = this.arrive(this.origin);
        let mouse = createVector(mouseX, mouseY);
        let flee = this.flee(mouse);

        if (mode === 'grid') {
            arrive.mult(1.5);
            flee.mult(0);
        } else if (mode === 'drift') {
            arrive.mult(0.5);
            flee.mult(1.5);
            this.applyForce(p5.Vector.random2D().mult(0.1));
        } else if (mode === 'explode') {
            arrive.mult(0.1);
            flee.mult(5);
        } else if (mode === 'vortex') {
            arrive.mult(0.2);
            let v = createVector(-(mouseY - this.pos.y), mouseX - this.pos.x);
            v.setMag(1.2);
            this.applyForce(v);
        }

        this.applyForce(arrive);
        this.applyForce(flee);
    }

    arrive(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let d = desired.mag();
        let speed = (d < 100) ? map(d, 0, 100, 0, this.maxSpeed) : this.maxSpeed;
        desired.setMag(speed);
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(this.maxForce);
        return steer;
    }

    flee(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let d = desired.mag();
        if (d < interactionRange) {
            desired.setMag(this.maxSpeed);
            desired.mult(-1);
            let steer = p5.Vector.sub(desired, this.vel);
            steer.limit(this.maxForce * 3);
            return steer;
        }
        return createVector(0, 0);
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
        this.vel.mult(this.friction);
    }

    draw() {
        // High Speed Hack: Draw pre-rendered image instead of text
        tint(this.color);
        image(charImages[this.charIndex], this.pos.x, this.pos.y);
    }
}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-holder');
    
    // Default heart
    img = createGraphics(400, 400);
    img.background(0);
    img.fill(255, 50, 80);
    img.noStroke();
    img.translate(200, 200);
    img.beginShape();
    for (let a = 0; a < TWO_PI; a += 0.01) {
        let r = 10;
        let x = r * 16 * pow(sin(a), 3);
        let y = -r * (13 * cos(a) - 5 * cos(2*a) - 2 * cos(3*a) - cos(4*a));
        img.vertex(x, y);
    }
    img.endShape(CLOSE);
    
    setupUI();
    imageMode(CENTER);
    processImageIntoParticles();
}

function draw() {
    background(0, 70); 
    
    for (let i = 0; i < particles.length; i++) {
        particles[i].behaviors();
        particles[i].update();
        particles[i].draw();
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

function processImageIntoParticles() {
    if (!img) return;
    
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

    const renderWidth = tw * resolution;
    const renderHeight = th * resolution;
    const xOff = (width - renderWidth) / 2;
    const yOff = (height - renderHeight) / 2;

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
                
                // Smart ASCII logic: check if this area has high detail
                let isDetailArea = false;
                if (detailWeightMap) {
                    let mapX = floor(map(x, 0, tw, 0, detailWeightMap.width));
                    let mapY = floor(map(y, 0, th, 0, detailWeightMap.height));
                    let weightIdx = (mapX + mapY * detailWeightMap.width);
                    if (detailWeightMap.weight_map[weightIdx] > 50) isDetailArea = true;
                }

                particles.push(new Particle(px, py, CHARS[charIdx], charIdx, brightness, color(r, g, b)));
                
                // If high detail area, add a micro-particle for sharpness
                if (isDetailArea) {
                    particles.push(new Particle(px + 2, py + 2, CHARS[charIdx], charIdx, brightness, color(r, g, b)));
                }
            }
        }
    }

    AsciiTests.run({
        chars: CHARS,
        imgW: img.width, imgH: img.height,
        gridW: tw, gridH: th,
        particleCount: particles.length,
        particles: particles,
        winW: width, winH: height,
        fps: frameRate()
    });
}

function preRenderChars() {
    charImages = [];
    let size = resolution * 1.5;
    for (let i = 0; i < CHARS.length; i++) {
        let pg = createGraphics(size * 2, size * 2);
        pg.pixelDensity(1);
        pg.fill(255);
        pg.scale(2); // Higher quality
        pg.textAlign(CENTER, CENTER);
        pg.textSize(size);
        pg.text(CHARS[i], size/2, size/2);
        charImages.push(pg);
    }
}

function setupUI() {
    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Intertwine Python: Send image to backend for analysis
            let formData = new FormData();
            formData.append('image', file);
            
            fetch('http://localhost:5000/analyze', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                detailWeightMap = data;
                console.log("Python Intelligence Received:", data.width, "x", data.height);
            })
            .catch(err => console.warn("Backend analysis skipped (Service unavailable)"));

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

    document.getElementById('flee-slider').oninput = (e) => {
        interactionRange = parseInt(e.target.value);
    };

    document.getElementById('res-slider').oninput = (e) => {
        resolution = parseInt(e.target.value);
        if (img) processImageIntoParticles();
    };
}
