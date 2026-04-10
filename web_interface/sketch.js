let img;
let particles = [];
let mode = 'grid'; 
let interactionRange = 150;
let resolution = 6;
let detailWeightMap = null;

class Dot {
    constructor(x, y, brightness, color) {
        this.origin = createVector(x, y);
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.brightness = brightness;
        this.color = color;
        this.size = map(brightness, 0, 255, 1, resolution * 1.5);
        
        this.maxSpeed = 10;
        this.maxForce = 0.6;
        this.friction = 0.85;
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
        } else {
            arrive.mult(0.5);
            flee.mult(2);
            if (mode === 'vortex') {
                let v = createVector(-(mouseY - this.pos.y), mouseX - this.pos.x);
                v.setMag(1.5);
                this.applyForce(v);
            }
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
            steer.limit(this.maxForce * 2.5);
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
        // Light-weight Pointillism: Simple circles instead of text
        noStroke();
        fill(this.color);
        ellipse(this.pos.x, this.pos.y, this.size, this.size);
    }
}

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-holder');
    
    // Procedural heart for startup
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
    processImageIntoParticles();
}

function draw() {
    background(0, 80); 
    
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
                const px = xOff + x * resolution + resolution/2;
                const py = yOff + y * resolution + resolution/2;
                
                // Smart Detail Logic
                let isDetailArea = false;
                if (detailWeightMap) {
                    let mapX = floor(map(x, 0, tw, 0, detailWeightMap.width));
                    let mapY = floor(map(y, 0, th, 0, detailWeightMap.height));
                    let weightIdx = (mapX + mapY * detailWeightMap.width);
                    if (detailWeightMap.weight_map[weightIdx] > 50) isDetailArea = true;
                }

                particles.push(new Dot(px, py, brightness, color(r, g, b)));
                if (isDetailArea) {
                    particles.push(new Dot(px + random(-2,2), py + random(-2,2), brightness, color(r, g, b)));
                }
            }
        }
    }

    AsciiTests.run({
        chars: "DOT_MODE",
        imgW: img.width, imgH: img.height,
        gridW: tw, gridH: th,
        particleCount: particles.length,
        particles: particles,
        winW: width, winH: height,
        fps: frameRate()
    });
}

function setupUI() {
    document.getElementById('file-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            let formData = new FormData();
            formData.append('image', file);
            fetch('http://localhost:5000/analyze', { method: 'POST', body: formData })
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
