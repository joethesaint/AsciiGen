"""
Main Image Processing API for the PointGen 3D frontend.
Interfaces with the Unified AsciiEngine.
"""

from flask import Blueprint, jsonify, request
from smart_ascii.engine import AsciiEngine

api_bp = Blueprint("api", __name__)
ENGINE = AsciiEngine()


@api_bp.route("/analyze", methods=["POST"])
def analyze():
    """API Endpoint for p5.js to get smart metadata for an image."""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files["image"]
    zoom = float(request.args.get("zoom", 1.0))
    kernel = request.args.get("kernel", "edges")
    
    try:
        metadata = ENGINE.analyze_volumetric(image_file.stream, zoom=zoom, kernel_name=kernel)
        return jsonify(metadata)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/depth", methods=["POST"])
def generate_depth():
    """Generates a high-contrast grayscale relief map."""
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files["image"]
    try:
        depth_data = ENGINE.generate_depth_map(image_file.stream)
        return jsonify(depth_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/depth_mock_sim", methods=["GET"])
def depth_mock_sim():
    """Returns a pre-calculated mock depth map for the autoload feature."""
    return jsonify({"depth_map": None, "status": "simulated"})
