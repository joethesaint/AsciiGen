"""
System and Status routes for the PointGen Backend.
"""

import random
import math
from flask import Blueprint, jsonify

system_bp = Blueprint("system", __name__)


@system_bp.route("/")
def index():
    """Root route confirming API health."""
    return jsonify({
        "project": "PointGen 3D Volumetric ASCII Engine",
        "author": "Antigravity",
        "status": "ready"
    })


@system_bp.route("/status")
def status():
    """Endpoint for system health checks."""
    return jsonify({"status": "active", "uptime": "stable"})


@system_bp.route("/sdf")
def get_sdf():
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
    
    return jsonify({"points": points, "count": count})
