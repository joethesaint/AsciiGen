let socket;
let particles = [];
let mode = 'grid'; // 'grid' or 'explode'
let interactionRange = 150;
let resolution = 10;
let currentRawData = null;

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
    
    socket = io();
    socket.on('connect', () => {
        document.getElementById('status').className = 'status-dot connected';
    });
    
    socket.on('disconnect', () => {
        document.getElementById('status').className = 'status-dot disconnected';
    });

    socket.on('ascii_data', (data) => {
        currentRawData = data.grid;
        rebuildParticles();
    });

    setupUI();
    textFont('monospace');
    textAlign(CENTER, CENTER);
}

function draw() {
    background(0);
    
    if (particles.length === 0) {
        fill(100);
        textSize(16);
        text("Upload an image to begin...", width/2, height/2);
    }

    for (let p of particles) {
        p.update();
        p.draw();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (currentRawData) rebuildParticles();
}

function rebuildParticles() {
    if (!currentRawData) return;
    
    particles = [];
    const rows = currentRawData.length;
    const cols = currentRawData[0].length;
    
    // Size to fit the screen
    const cellW = width / cols;
    const cellH = height / rows;
    const fontSize = cellW * 1.2;
    textSize(fontSize);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellW + cellW/2;
            const y = r * cellH + cellH/2;
            const data = currentRawData[r][c];
            particles.push(new Particle(x, y, data.char, data.brightness));
        }
    }
}

function setupUI() {
    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                socket.emit('process_image', {
                    image: event.target.result,
                    width: floor(width / resolution)
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleBtn = document.getElementById('toggle-physics');
    toggleBtn.onclick = () => {
        mode = (mode === 'grid') ? 'explode' : 'grid';
        toggleBtn.innerText = (mode === 'grid') ? 'Explode Physics' : 'Reset Grid';
        toggleBtn.classList.toggle('secondary');
    };

    document.getElementById('flee-slider').oninput = (e) => {
        interactionRange = parseInt(e.target.value);
    };

    document.getElementById('res-slider').oninput = (e) => {
        resolution = parseInt(e.target.value);
        if (currentRawData) {
            // Re-emit last image with new resolution
            // (In a real app, we'd store the image locally to avoid re-upload, 
            // but for simplicity, the user can just re-upload or we optimize later)
        }
    };
}
