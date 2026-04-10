let particles = [];
let source;
let isWebcam = false;
let mode = 'grid'; // 'grid' or 'particle'
let spacing = 10;
let chars = " .·:∵∴∷•";
let showColor = true;
let interactionStrength = 100;

class Particle {
    constructor(x, y, char, color) {
        this.originX = x;
        this.originY = y;
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.char = char;
        this.color = color;
        this.friction = 0.95;
        this.maxSpeed = 5;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        if (mode === 'particle') {
            // Behavioral physics
            let mouse = createVector(mouseX, mouseY);
            let dir = p5.Vector.sub(this.pos, mouse);
            let dist = dir.mag();
            
            if (dist < interactionStrength) {
                let force = map(dist, 0, interactionStrength, 2, 0);
                dir.setMag(force);
                this.applyForce(dir);
            }

            // Return to origin force
            let home = createVector(this.originX, this.originY);
            let returnDir = p5.Vector.sub(home, this.pos);
            let returnDist = returnDir.mag();
            returnDir.setMag(returnDist * 0.05);
            this.applyForce(returnDir);

            this.vel.add(this.acc);
            this.vel.limit(this.maxSpeed);
            this.pos.add(this.vel);
            this.vel.mult(this.friction);
            this.acc.mult(0);
        } else {
            // Classic grid snap with slight jitter if mouse is near
            let d = dist(mouseX, mouseY, this.originX, this.originY);
            if (d < 50) {
                let off = map(d, 0, 50, 5, 0);
                this.pos.x = this.originX + random(-off, off);
                this.pos.y = this.originY + random(-off, off);
            } else {
                this.pos.x = this.originX;
                this.pos.y = this.originY;
            }
        }
    }

    draw() {
        if (showColor) {
            fill(this.color);
        } else {
            fill(201, 209, 217);
        }
        text(this.char, this.pos.x, this.pos.y);
    }
}

function setup() {
    const canvas = createCanvas(800, 600);
    canvas.parent('canvas-holder');
    textFont('monospace');
    textAlign(CENTER, CENTER);
    
    setupUI();
}

function draw() {
    background(13, 17, 23, 100); // Slight trails
    
    if (source) {
        processSource();
    } else {
        fill(139, 148, 158);
        textSize(16);
        text("Waiting for input source...", width/2, height/2);
    }

    for (let p of particles) {
        p.update();
        p.draw();
    }
}

function processSource() {
    // Only rebuild particles if resolution/source changes or grid mode needs fresh data
    // For performance, we sample the source every frame but only update particle attributes
    source.loadPixels();
    
    // Safety check for source ready
    if (source.width === 0) return;

    let pIdx = 0;
    textSize(spacing);

    // Calculate scaling to fit source to canvas
    let wScale = width / source.width;
    let hScale = height / source.height;
    let scale = min(wScale, hScale);
    let xOff = (width - source.width * scale) / 2;
    let yOff = (height - source.height * scale) / 2;

    for (let y = 0; y < source.height; y += spacing / scale) {
        for (let x = 0; x < source.width; x += spacing / scale) {
            let sx = floor(x);
            let sy = floor(y);
            let pixelIdx = (sx + sy * source.width) * 4;
            
            let r = source.pixels[pixelIdx];
            let g = source.pixels[pixelIdx + 1];
            let b = source.pixels[pixelIdx + 2];
            let brightnessValue = (r + g + b) / 3;

            let charIdx = floor(map(brightnessValue, 0, 255, 0, chars.length - 1));
            let c = chars[charIdx];
            
            let px = x * scale + xOff;
            let py = y * scale + yOff;

            if (pIdx < particles.length) {
                particles[pIdx].originX = px;
                particles[pIdx].originY = py;
                particles[pIdx].char = c;
                particles[pIdx].color = color(r, g, b);
            } else {
                particles.push(new Particle(px, py, c, color(r, g, b)));
            }
            pIdx++;
        }
    }

    // Trim extra particles if resolution changed to be lower
    if (particles.length > pIdx) {
        particles.splice(pIdx);
    }
}

function setupUI() {
    document.getElementById('webcam-btn').onclick = () => {
        if (!isWebcam) {
            source = createCapture(VIDEO);
            source.size(160, 120); // Low res for processing
            source.hide();
            isWebcam = true;
        } else {
            isWebcam = false;
            source = null;
            particles = [];
        }
    };

    document.getElementById('file-input').onchange = (e) => {
        let file = e.target.files[0];
        if (file) {
            loadImage(URL.createObjectURL(file), (loaded) => {
                source = loaded;
                isWebcam = false;
                particles = [];
            });
        }
    };

    document.getElementById('mode-grid').onclick = (e) => {
        mode = 'grid';
        updateModeBtns(e.target);
    };

    document.getElementById('mode-particle').onclick = (e) => {
        mode = 'particle';
        updateModeBtns(e.target);
    };

    document.getElementById('res-slider').oninput = (e) => {
        spacing = parseInt(e.target.value);
        document.getElementById('res-val').innerText = spacing;
        particles = []; // Forces rebuild
    };

    document.getElementById('flee-slider').oninput = (e) => {
        interactionStrength = parseInt(e.target.value);
    };

    document.getElementById('color-toggle').onchange = (e) => {
        showColor = e.target.checked;
    };

    document.getElementById('download-btn').onclick = () => saveCanvas('ascii_art', 'png');
    
    document.getElementById('copy-btn').onclick = () => {
        // Snap the current state as a text string
        let textVersion = "";
        let prevY = -1;
        // Simple sort to get lines right
        let sorted = [...particles].sort((a,b) => a.originY - b.originY || a.originX - b.originX);
        for(let p of sorted) {
            if (prevY !== -1 && p.originY > prevY + 2) textVersion += "\n";
            textVersion += p.char;
            prevY = p.originY;
        }
        navigator.clipboard.writeText(textVersion);
        alert("Formatted ASCII Snapshot copied!");
    };
}

function updateModeBtns(activeBtn) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
}
