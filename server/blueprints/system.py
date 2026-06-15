"""
System and Status routes for the PointGen Backend.
Converted to FastAPI APIRouter.
"""

import random
import math
from fastapi import APIRouter

system_router = APIRouter()

@system_router.get("/info")
async def status():
    """Endpoint for system health checks."""
    return {"status": "active", "uptime": "stable", "engine": "FastAPI Zen"}


@system_router.get("/sdf")
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
