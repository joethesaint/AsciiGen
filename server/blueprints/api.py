"""
Main Image Processing API for the PointGen 3D frontend.
Converted to FastAPI APIRouter.
"""

import io
from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from smart_ascii.engine import AsciiEngine

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
