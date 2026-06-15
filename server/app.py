"""
AsciiGen Backend - Smart Image Analysis (FastAPI Version)
Handles heavy-lifting image processing to guide the Three.js/p5.js renderer.
"""

import io
import base64
import math
import random
import hashlib
from typing import Optional, Any, Dict
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter, ImageEnhance
import uvicorn

app = FastAPI(
    title="PointGen Intelligence Backend",
    description="Asynchronous backend for 3D ASCII point cloud extraction",
    version="4.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory Analysis Cache
ANALYSIS_CACHE: Dict[str, Any] = {}

# Custom Convolution Kernels for Nuanced Preprocessing
KERNELS = {
    'sharpen': ImageFilter.Kernel((3, 3), [0, -1, 0, -1, 5, -1, 0, -1, 0], scale=1),
    'emboss': ImageFilter.EMBOSS,
    'gaussian': ImageFilter.GaussianBlur(radius=2),
    'edges': ImageFilter.FIND_EDGES,
    'smooth': ImageFilter.SMOOTH_MORE
}

def get_image_hash(image_bytes: bytes, kernel: str, zoom: float) -> str:
    """Generate a unique key for the image + settings combo."""
    key_base = f"{hashlib.md5(image_bytes).hexdigest()}_{kernel}_{zoom}"
    return hashlib.md5(key_base.encode()).hexdigest()

def process_image_metadata(image_bytes: bytes, zoom: float = 1.0, kernel_name: str = "edges"):
    """
    Extracts structural metadata from an image.
    Calculates a weight map based on edge detection.
    """
    img_hash = get_image_hash(image_bytes, kernel_name, zoom)
    if img_hash in ANALYSIS_CACHE:
        return ANALYSIS_CACHE[img_hash]

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('L')
        
        w, h = img.size
        new_w, new_h = w / zoom, h / zoom
        left, top = (w - new_w) / 2, (h - new_h) / 2
        right, bottom = (w + new_w) / 2, (h + new_h) / 2

        if zoom < 1.0:
            canvas = Image.new("L", (int(new_w), int(new_h)), color=0)
            offset_x, offset_y = int((new_w - w) / 2), int((new_h - h) / 2)
            canvas.paste(img, (offset_x, offset_y))
            img = canvas
        else:
            img = img.crop((left, top, right, bottom))

        max_size = (800, 800)
        
        if hasattr(Image, "Resampling"):
            resample_filter = Image.Resampling.LANCZOS
        else:
            resample_filter = getattr(Image, "ANTIALIAS", Image.BICUBIC)
            
        img = img.resize(max_size, resample_filter)
        width, height = img.size
        
        selected_kernel = KERNELS.get(kernel_name, ImageFilter.FIND_EDGES)
        processed_img = img.filter(selected_kernel)
        weight_map = list(processed_img.getdata())
        
        result = {
            "width": width,
            "height": height,
            "weight_map": weight_map,
            "zoom_applied": zoom,
            "kernel_applied": kernel_name
        }
        
        ANALYSIS_CACHE[img_hash] = result
        return result
    except Exception as e:
        raise ValueError(f"Failed to process image: {str(e)}")

@app.get("/status")
async def status():
    """Welcome message to confirm server is active."""
    return {
        "status": "active",
        "engine": "PointGen 3D",
        "service": "PointGen Intelligence Backend (FastAPI)",
        "endpoint": "/analyze (POST)"
    }

@app.post("/analyze")
async def analyze(image: UploadFile = File(...), zoom: float = Query(1.0), kernel: str = Query("edges")):
    """API Endpoint for p5.js to get smart metadata for an image."""
    try:
        content = await image.read()
        metadata = process_image_metadata(content, zoom=zoom, kernel_name=kernel)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sdf")
async def get_sdf():
    """Returns signed distance field coordinates for 3D morph targets."""
    points = []
    count = 10000
    radius = 250
    for _ in range(count):
        theta = random.uniform(0, 2 * math.pi)
        phi = math.acos(random.uniform(-1, 1))
        x = radius * math.sin(phi) * math.cos(theta)
        y = radius * math.sin(phi) * math.sin(theta)
        z = radius * math.cos(phi)
        points.append({"x": x, "y": y, "z": z, "bri": random.randint(150, 255)})
    
    return {"points": points, "count": count}

@app.post("/depth")
async def generate_depth(image: UploadFile = File(...)):
    """Generates a high-contrast grayscale relief map."""
    try:
        content = await image.read()
        img = Image.open(io.BytesIO(content)).convert('L')
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "depth_map": img_str,
            "width": img.width,
            "height": img.height
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/depth_mock_sim")
async def depth_mock_sim():
    """Returns a pre-calculated mock depth map for the autoload feature."""
    return {"depth_map": None, "status": "simulated"}

# Mount the static files
app.mount("/images", StaticFiles(directory="images"), name="images")
app.mount("/", StaticFiles(directory="web_interface", html=True), name="static")

if __name__ == '__main__':
    uvicorn.run(app, host="127.0.0.1", port=5000)
