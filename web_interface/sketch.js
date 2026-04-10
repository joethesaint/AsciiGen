let img;
let asciiArt = "";
const chars = "  .·:∵∴∷•";
let targetWidth = 100;

function setup() {
    const canvas = createCanvas(100, 100); // placeholder
    canvas.parent('canvas-holder');
    noLoop();

    // UI elements
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', handleFile);

    const resSlider = document.getElementById('res-slider');
    const resVal = document.getElementById('res-val');
    resSlider.addEventListener('input', (e) => {
        targetWidth = e.target.value;
        resVal.innerText = targetWidth;
        if (img) generateAscii();
    });

    const copyBtn = document.getElementById('copy-btn');
    copyBtn.addEventListener('click', copyToClipboard);

    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.addEventListener('click', downloadTxt);
}

function handleFile(e) {
    const file = e.target.files[0];
    if (file) {
        img = loadImage(URL.createObjectURL(file), () => {
            generateAscii();
        });
    }
}

function generateAscii() {
    if (!img) return;

    // Calculate dimensions
    // Using 0.45 font aspect ratio as per our logic for vertical compensation
    const aspectRatio = img.height / img.width;
    const targetHeight = floor(targetWidth * aspectRatio * 0.45);

    // Prepare processing image
    const pImg = img.get();
    pImg.resize(targetWidth, targetHeight);
    pImg.loadPixels();

    asciiArt = "";
    for (let y = 0; y < pImg.height; y++) {
        for (let x = 0; x < pImg.width; x++) {
            const index = (x + y * pImg.width) * 4;
            const r = pImg.pixels[index];
            const g = pImg.pixels[index + 1];
            const b = pImg.pixels[index + 2];
            
            // Grayscale average
            const brightness = (r + g + b) / 3;
            const charIndex = floor(map(brightness, 0, 255, 0, chars.length - 1));
            asciiArt += chars[charIndex];
        }
        asciiArt += "\n";
    }

    // Render to canvas for visual feedback
    updateCanvas(targetWidth, targetHeight);
}

function updateCanvas(w, h) {
    // We render the text to the canvas so the user can see it
    // Calculating font size to fit
    const container = document.getElementById('canvas-holder');
    const displayWidth = container.clientWidth - 40;
    const fontSize = displayWidth / targetWidth;
    
    resizeCanvas(targetWidth * fontSize, h * fontSize);
    background(0);
    fill(201, 209, 217); // var(--text-color)
    textFont('monospace');
    textSize(fontSize);
    textAlign(LEFT, TOP);
    text(asciiArt, 0, 0);
}

function copyToClipboard() {
    navigator.clipboard.writeText(asciiArt).then(() => {
        alert("ASCII art copied to clipboard!");
    });
}

function downloadTxt() {
    const blob = new Blob([asciiArt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii_art.txt';
    a.click();
    URL.revokeObjectURL(url);
}
