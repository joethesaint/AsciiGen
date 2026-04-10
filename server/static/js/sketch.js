let socket;
let particles = [];
let capture;
let isWebcam = false;
let mode = 'grid';
let targetRes = 80;
let interactionStrength = 100;
let useTrails = false;
let lastProcessTime = 0;
let processInterval = 100; // ms between frames sent to Python

class Particle {
    constructor(x, y, char, brightness) {
        this.targetPos = createVector(x, y);
        this.pos = createVector(x, y);
        this.vel = createVector(random(-1, 1), random(-1, 1));
        this.acc = createVector(0, 0);
        this.char = char;
        this.brightness = brightness;
        this.maxSpeed = 8;
        this.maxForce = 0.5;
    }

    behaviors() {
        let arrive = this.arrive(this.targetPos);
        let mouse = createVector(mouseX, mouseY);
        let flee = this.flee(mouse);

        arrive.mult(1);
        flee.mult(2);

        this.applyForce(arrive);
        this.applyForce(flee);
    }

    applyForce(f) {
        this.acc.add(f);
    }

    update() {
        if (mode === 'particle') {
            this.pos.add(this.vel);
            this.vel.add(this.acc);
            this.acc.mult(0);
            this.vel.mult(0.95);
        } else {
            // Classic Snap
            this.pos.lerp(this.targetPos, 0.2);
        }
    }

    draw() {
        fill(this.brightness);
        textSize(width / targetRes * 1.2);
        text(this.char, this.pos.x, this.pos.y);
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
        if (d < interactionStrength) {
            desired.setMag(this.maxSpeed);
            desired.mult(-1);
            let steer = p5.Vector.sub(desired, this.vel);
            steer.limit(this.maxForce);
            return steer;
        } else {
            return createVector(0, 0);
        }
    }
}

function setup() {
    const canvas = createCanvas(800, 600);
    canvas.parent('canvas-holder');
    
    // Socket Initialization
    socket = io();
    
    socket.on('connect', () => {
        document.getElementById('socket-status').innerText = "● Server Online";
        document.getElementById('socket-status').className = "connected";
    });

    socket.on('disconnect', () => {
        document.getElementById('socket-status').innerText = "● Server Offline";
        document.getElementById('socket-status').className = "disconnected";
    });

    socket.on('ascii_data', (data) => {
        updateParticles(data.grid);
    });

    socket.on('error', (err) => console.error("Python Error:", err.message));

    setupUI();
    textFont('monospace');
    textAlign(CENTER, CENTER);
}

function draw() {
    if (useTrails) {
        background(13, 11, 23, 40);
    } else {
        background(13, 11, 23);
    }

    if (isWebcam && millis() - lastProcessTime > processInterval) {
        sendFrameToPython(capture);
        lastProcessTime = millis();
    }

    for (let p of particles) {
        p.behaviors();
        p.update();
        p.draw();
    }
}

function sendFrameToPython(imgSource) {
    if (!imgSource || !socket.connected) return;
    
    // Convert current frame to base64
    let canvasOffscreen = createGraphics(imgSource.width, imgSource.height);
    canvasOffscreen.image(imgSource, 0, 0);
    let base64 = canvasOffscreen.canvas.toDataURL('image/jpeg', 0.5);
    
    socket.emit('process_image', {
        image: base64,
        width: int(targetRes)
    });
}

function updateParticles(grid) {
    let rows = grid.length;
    let cols = grid[0].length;
    let cellW = width / cols;
    let cellH = height / rows;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let x = c * cellW + cellW / 2;
            let y = r * cellH + cellH / 2;
            let data = grid[r][c];

            if (idx < particles.length) {
                particles[idx].targetPos.set(x, y);
                particles[idx].char = data.char;
                particles[idx].brightness = data.brightness;
            } else {
                particles.push(new Particle(x, y, data.char, data.brightness));
            }
            idx++;
        }
    }
    
    // Trim
    if (particles.length > idx) particles.splice(idx);
}

function setupUI() {
    document.getElementById('webcam-btn').onclick = () => {
        if (!isWebcam) {
            capture = createCapture(VIDEO);
            capture.size(160, 120);
            capture.hide();
            isWebcam = true;
        } else {
            isWebcam = false;
            particles = [];
        }
    };

    document.getElementById('file-input').onchange = (e) => {
        let file = e.target.files[0];
        if (file) {
            let reader = new FileReader();
            reader.onload = (event) => {
                socket.emit('process_image', {
                    image: event.target.result,
                    width: int(targetRes)
                });
            };
            reader.readAsDataURL(file);
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
        targetRes = e.target.value;
        document.getElementById('res-val').innerText = targetRes;
    };

    document.getElementById('flee-slider').oninput = (e) => {
        interactionStrength = e.target.value;
    };

    document.getElementById('trail-toggle').onchange = (e) => {
        useTrails = e.target.checked;
    };
}

function updateModeBtns(activeBtn) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
}
