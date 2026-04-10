let img;
let particles = [];
let mode = 'grid'; // 'grid' or 'explode'
let interactionRange = 150;
let resolution = 10;
const CHARS = "  .·:∵∴∷•";

class Particle {
    constructor(x, y, char, brightness) {
        this.origin = createVector(x, y);
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.char = char;
        this.brightness = brightness;
        
        this.maxSpeed = 10;
        this.friction = 0.92;
    }

    applyForce(f) {
        this.acc.add(f);
    }

    update() {
        if (mode === 'explode') {
            let mouse = createVector(mouseX, mouseY);
            let dir = p5.Vector.sub(this.pos, mouse);
            let dist = dir.mag();

            if (dist < interactionRange) {
                let force = map(dist, 0, interactionRange, 5, 0);
                dir.setMag(force);
                this.applyForce(dir);
            }

            // Always try to return slightly
            let returnForce = p5.Vector.sub(this.origin, this.pos);
            returnForce.mult(0.02);
            this.applyForce(returnForce);

            this.vel.add(this.acc);
            this.pos.add(this.vel);
            this.vel.mult(this.friction);
            this.acc.mult(0);
        } else {
            // Smooth return to origin
            this.pos.lerp(this.origin, 0.15);
            this.vel.set(0, 0);
        }
    }

    draw() {
        fill(this.brightness);
        text(this.char, this.pos.x, this.pos.y);
    }
}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-holder');
    
    setupUI();
    textFont('monospace');
    textAlign(CENTER, CENTER);
}

function draw() {
    background(0);
    
    if (particles.length === 0) {
        fill(100);
        textSize(16);
        text("Upload an image to start the experience...", width/2, height/2);
    }

    for (let p of particles) {
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
    
    // Calculate aspect ratio with font compensation (0.45)
    let imgAspect = (img.height / img.width) * 0.45;
    let windowAspect = height / width;

    let targetWidth, targetHeight;
    
    // Fit image to screen while maintaining aspect ratio
    if (imgAspect > windowAspect) {
        // Height constrained
        targetHeight = floor(height / resolution);
        targetWidth = floor(targetHeight / imgAspect);
    } else {
        // Width constrained
        targetWidth = floor(width / resolution);
        targetHeight = floor(targetWidth * imgAspect);
    }

    let temp = img.get();
    temp.resize(targetWidth, targetHeight);
    temp.loadPixels();

    // Mapping pixels to centered canvas positions
    const renderWidth = targetWidth * resolution;
    const renderHeight = targetHeight * resolution;
    const xOff = (width - renderWidth) / 2;
    const yOff = (height - renderHeight) / 2;

    textSize(resolution * 1.2);

    for (let y = 0; y < temp.height; y++) {
        for (let x = 0; x < temp.width; x++) {
            const index = (x + y * temp.width) * 4;
            const r = temp.pixels[index];
            const g = temp.pixels[index + 1];
            const b = temp.pixels[index + 2];
            const brightness = (r + g + b) / 3;

            const charIndex = floor(map(brightness, 0, 255, 0, CHARS.length - 1));
            const char = CHARS[charIndex];
            
            const px = xOff + x * resolution + resolution/2;
            const py = yOff + y * resolution + resolution/2;
            
            particles.push(new Particle(px, py, char, brightness));
        }
    }

    runInternalTests(targetWidth, targetHeight, imgAspect);
}

function runInternalTests(tw, th, aspect) {
    console.log("--- Internal Logic Test ---");
    console.log(`Target Grid: ${tw}x${th}`);
    let calcAspect = th / tw;
    let diff = abs(calcAspect - aspect);
    if (diff < 0.1) {
        console.log("✅ Aspect Ratio Check Passed");
    } else {
        console.warn(`❌ Aspect Ratio Mismatch: Expected ${aspect}, Got ${calcAspect}`);
    }
    console.log(`Particle Count: ${particles.length}`);
    if (particles.length === tw * th) {
        console.log("✅ Particle Density Verified");
    } else {
        console.warn("❌ Particle Count Mismatch");
    }
}

function setupUI() {
    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            img = loadImage(URL.createObjectURL(file), () => {
                processImageIntoParticles();
            });
        }
    };

    const toggleBtn = document.getElementById('toggle-physics');
    toggleBtn.onclick = () => {
        mode = (mode === 'grid') ? 'explode' : 'grid';
        toggleBtn.innerText = (mode === 'grid') ? 'Explode Particles' : 'Reset Grid';
        toggleBtn.classList.toggle('secondary');
    };

    document.getElementById('flee-slider').oninput = (e) => {
        interactionRange = parseInt(e.target.value);
    };

    document.getElementById('res-slider').oninput = (e) => {
        resolution = parseInt(e.target.value);
        if (img) processImageIntoParticles();
    };
}
