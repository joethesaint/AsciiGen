let img;
let particles = [];
let mode = 'grid'; // 'grid' or 'explode'
let interactionRange = 150;
let resolution = 10;
const CHARS = "  .·:∵∴∷•";

class Particle {
    constructor(x, y, char, brightness, color) {
        this.origin = createVector(x, y);
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.char = char;
        this.brightness = brightness;
        this.color = color;
        
        this.maxSpeed = 10;
        this.friction = 0.92;
        this.noiseScale = 0.01;
        this.noiseOffset = random(1000);
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
                let force = map(dist, 0, interactionRange, 6, 0);
                dir.setMag(force);
                this.applyForce(dir);
            }

            let n = noise(this.pos.x * this.noiseScale, this.pos.y * this.noiseScale, frameCount * 0.01 + this.noiseOffset);
            let noiseForce = p5.Vector.fromAngle(n * TWO_PI * 2);
            noiseForce.mult(0.1);
            this.applyForce(noiseForce);

            let returnForce = p5.Vector.sub(this.origin, this.pos);
            returnForce.mult(0.015);
            this.applyForce(returnForce);

            this.vel.add(this.acc);
            this.pos.add(this.vel);
            this.vel.mult(this.friction);
            this.acc.mult(0);
        } else {
            this.pos.lerp(this.origin, 0.15);
            this.vel.set(0, 0);
        }
    }

    draw() {
        fill(this.color);
        text(this.char, this.pos.x, this.pos.y);
    }
}

function preload() {
    // We omit the external file fetch to bypass browser CORS restrictions for local files.
    // Instead, we will generate a procedurally drawn heart image in setup().
}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-holder');
    
    // Create a procedural heart image in memory
    img = createGraphics(400, 400);
    img.background(0);
    img.fill(255, 50, 80); // Nice red
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

    // Now process the generated heart
    processImageIntoParticles();
}

function draw() {
    background(0, 50); 
    
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
    
    let imgAspect = (img.height / img.width) * 0.45;
    let windowAspect = height / width;

    let targetWidth, targetHeight;
    
    if (imgAspect > windowAspect) {
        targetHeight = floor(height / resolution);
        targetWidth = floor(targetHeight / imgAspect);
    } else {
        targetWidth = floor(width / resolution);
        targetHeight = floor(targetWidth * imgAspect);
    }

    // Capture the generated image's pixels
    let temp = img.get();
    temp.resize(targetWidth, targetHeight);
    temp.loadPixels();

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

            // Only create particles for non-black pixels
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
        fontComp: 0.45,
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
            // User uploads still work as they don't trigger the same CORS file:// restriction
            loadImage(URL.createObjectURL(file), (newImg) => {
                img = newImg;
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
