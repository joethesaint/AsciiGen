"""
AsciiGen Backend - Smart Image Analysis (FastAPI Zen Version)
Unified implementation using APIRouters and the AsciiEngine.
"""

import sys
import os

# Add the project root to the python path to allow direct execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from server.blueprints.api import api_router
from server.blueprints.system import system_router

app = FastAPI(
    title="PointGen Intelligence Backend",
    description="Asynchronous Zen-style backend for 3D ASCII point cloud extraction",
    version="4.1.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(api_router, prefix="/api")
app.include_router(system_router, prefix="/sys")

# Legacy Compatibility Layer (Direct routes for the frontend)
app.include_router(api_router)
app.include_router(system_router)

# Mount the static files
# In this branch, images have moved inside web_interface/images
app.mount("/images", StaticFiles(directory="web_interface/images"), name="images")
app.mount("/", StaticFiles(directory="web_interface", html=True), name="static")

if __name__ == '__main__':
    uvicorn.run(app, host="127.0.0.1", port=5000)
