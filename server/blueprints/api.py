"""
Main Image Processing API for the PointGen 3D frontend.
Converted to FastAPI APIRouter.
"""

import io
from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from smart_ascii.engine import AsciiEngine
import math
import random
from PIL import Image, ImageDraw, ImageFont

api_router = APIRouter()
ENGINE = AsciiEngine()


@api_router.post("/analyze")
async def analyze(image: UploadFile = File(...), zoom: float = Query(1.0), kernel: str = Query("edges")):
    """API Endpoint for p5.js to get smart metadata for an image."""
    try:
        content = await image.read()
        metadata = ENGINE.analyze_volumetric(io.BytesIO(content), zoom=zoom, kernel_name=kernel)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/depth")
async def generate_depth(image: UploadFile = File(...)):
    """Generates a high-contrast grayscale relief map."""
    try:
        content = await image.read()
        depth_data = ENGINE.generate_depth_map(io.BytesIO(content))
        return depth_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/depth_mock_sim")
async def depth_mock_sim():
    """Returns a pre-calculated mock depth map for the autoload feature."""
    return {"depth_map": None, "status": "simulated"}


@api_router.get("/morph/{shape_name}")
async def get_morph(shape_name: str):
    """Returns signed distance field coordinates for various 3D shapes."""
    points = []
    count = 10000
    radius = 250
    if shape_name == "cube":
        for _ in range(count):
            points.append({"x": random.uniform(-radius, radius), "y": random.uniform(-radius, radius), "z": random.uniform(-radius, radius), "bri": random.randint(150, 255)})
    elif shape_name == "torus":
        for _ in range(count):
            u = random.uniform(0, 2 * math.pi)
            v = random.uniform(0, 2 * math.pi)
            x = (radius + 100 * math.cos(v)) * math.cos(u)
            y = (radius + 100 * math.cos(v)) * math.sin(u)
            z = 100 * math.sin(v)
            points.append({"x": x, "y": y, "z": z, "bri": random.randint(150, 255)})
    else: # Default to sphere
        from server.blueprints.system import get_sdf
        return await get_sdf()
    return {"points": points, "count": count}

@api_router.post("/palette")
async def extract_palette(image: UploadFile = File(...)):
    """Extracts dominant colors from an image."""
    try:
        content = await image.read()
        img = Image.open(io.BytesIO(content)).convert('RGB')
        img.thumbnail((150, 150))
        q = img.quantize(colors=5)
        palette = q.getpalette()[:15]
        colors = [{"r": palette[i], "g": palette[i+1], "b": palette[i+2]} for i in range(0, len(palette), 3)]
        return {"palette": colors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/text-to-cloud")
async def text_to_cloud(text: str = Query("PointGen")):
    """Generates a point cloud from text."""
    try:
        img = Image.new("L", (400, 200), color=0)
        draw = ImageDraw.Draw(img)
        font = ImageFont.load_default()
        draw.text((20, 80), text, fill=255, font=font)
        
        points = []
        width, height = img.size
        pixels = img.load()
        for y in range(0, height, 2): 
            for x in range(0, width, 2):
                if pixels[x, y] > 0:
                    points.append({"x": (x - width/2)*2, "y": -(y - height/2)*2, "z": 0, "bri": 255})
        return {"points": points, "count": len(points)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
