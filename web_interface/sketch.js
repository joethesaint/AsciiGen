let img;
let particles = [];
let mode = 'grid'; // 'grid', 'drift', 'explode', 'vortex'
let interactionRange = 150;
let resolution = 8;
const CHARS = "  .·:∵∴∷•";

class Particle {
    constructor(x, y, char, brightness, color) {
        this.origin = createVector(x, y);
        this.pos = createVector(random(width), random(height)); // Spawn randomly for "arranging" effect
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.char = char;
        this.brightness = brightness;
        this.color = color;
        
        this.maxSpeed = 8;
        this.maxForce = 0.5;
        this.friction = 0.9;
        this.noiseScale = 0.01;
        this.noiseOffset = random(1000);
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
            flee.mult(0); // Passive grid
        } else if (mode === 'drift') {
            arrive.mult(0.5);
            flee.mult(1);
            let drift = this.getDrift();
            this.applyForce(drift);
        } else if (mode === 'explode') {
            arrive.mult(0.1);
            flee.mult(5);
        } else if (mode === 'vortex') {
            arrive.mult(0.2);
            let v = this.getVortex(mouse);
            this.applyForce(v);
        }

        this.applyForce(arrive);
        this.applyForce(flee);
    }

    arrive(target) {
        let desired = p5.Vector.sub(target, this.pos);
        let d = desired.mag();
        let speed = this.maxSpeed;
        if (d < 100) {
            speed = map(d, 0, 100, 0, this.maxSpeed);
        }
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
            steer.limit(this.maxForce * 2);
            return steer;
        } else {
            return createVector(0, 0);
        }
    }

    getDrift() {
        let n = noise(this.pos.x * this.noiseScale, this.pos.y * this.noiseScale, frameCount * 0.01 + this.noiseOffset);
        let f = p5.Vector.fromAngle(n * TWO_PI * 4);
        f.mult(0.2);
        return f;
    }

    getVortex(target) {
        let dir = p5.Vector.sub(target, this.pos);
        let d = dir.mag();
        if (d < 300) {
            let v = createVector(-dir.y, dir.x); // Perpendicular
            v.setMag(map(d, 0, 300, 5, 1));
            return v;
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
        fill(this.color);
        text(this.char, this.pos.x, this.pos.y);
    }
}

function preload() {}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-holder');
    
    // Default procedural heart
    img = createGraphics(400, 400);
    img.background(0);
    img.fill(255, 50, 80);
    img.noStroke();
    img.translate(img.width/2, img.height/2);
    img.beginShape();
    for (let a = 0; a < TWO_PI; a += 0.01) {
        let r = 10;
        let x = r * 16 * pow(sin(a), 3);
        let y = -r * (13 * cos(a) - 5 * cos(2*a) - 2 * cos(3*a) - cos(4*a));
        img.vertex(x, y);
    }
    img.endShape(CLOSE);
    
    setupUI();
    textFont('monospace');
    textAlign(CENTER, CENTER);
    processImageIntoParticles();
}

function draw() {
    background(0, 70); 
    
    for (let p of particles) {
        p.behaviors();
        p.update();
        p.draw();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (img) processImageIntoParticles();
}

function processImageIntoParticles() {
    if (!img) return;
    
    particles = [];
    
    // FIX STRETCHING: Use pure image aspect ratio for grid spacing
    let imgAspect = img.height / img.width;
    let windowAspect = height / width;

    let targetWidth, targetHeight;
    
    if (imgAspect > windowAspect) {
        targetHeight = floor(height / resolution);
        targetWidth = floor(targetHeight / imgAspect);
    } else {
        targetWidth = floor(width / resolution);
        targetHeight = floor(targetWidth * imgAspect);
    }

    let temp = img.get();
    temp.resize(targetWidth, targetHeight);
    temp.loadPixels();

    const renderWidth = targetWidth * resolution;
    const renderHeight = targetHeight * resolution;
    const xOff = (width - renderWidth) / 2;
    const yOff = (height - renderHeight) / 2;

    textSize(resolution * 1.5);

    for (let y = 0; y < temp.height; y++) {
        for (let x = 0; x < temp.width; x++) {
            const index = (x + y * temp.width) * 4;
            const r = temp.pixels[index];
            const g = temp.pixels[index+1];
            const b = temp.pixels[index+2];
            const brightness = (r + g + b) / 3;

            if (brightness > 10) {
                const charIndex = floor(map(brightness, 0, 255, 0, CHARS.length - 1));
                const char = CHARS[charIndex];
                const px = xOff + x * resolution + resolution/2;
                const py = yOff + y * resolution + resolution/2;
                let c = color(r, g, b);
                particles.push(new Particle(px, py, char, brightness, c));
            }
        }
    }

    AsciiTests.run({
        chars: CHARS,
        imgW: img.width,
        imgH: img.height,
        gridW: targetWidth,
        gridH: targetHeight,
        fontComp: 1.0, // Switched to 1.0 to prioritize visual image integrity over char-height compensation
        particleCount: particles.length,
        particles: particles,
        winW: width,
        winH: height
    });
}

function setupUI() {
    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            loadImage(URL.createObjectURL(file), (newImg) => {
                img = newImg;
                processImageIntoParticles();
            });
        }
    };

    document.getElementById('physics-mode').onchange = (e) => {
        mode = e.target.value;
    };

    document.getElementById('flee-slider').oninput = (e) => {
        interactionRange = parseInt(e.target.value);
    };

    document.getElementById('res-slider').oninput = (e) => {
        resolution = parseInt(e.target.value);
        if (img) processImageIntoParticles();
    };
}
