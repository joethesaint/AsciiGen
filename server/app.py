"""
AsciiGen Backend - Smart Image Analysis
Handles heavy-lifting image processing to guide the p5.js renderer.
Follows PEP8 and the Zen of Python.
"""

import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageFilter

import os
app = Flask(__name__, static_folder='../web_interface', static_url_path='/')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')


def process_image_metadata(image_stream):
    """
    Extracts structural metadata from an image.
    Calculates a weight map based on edge detection to inform particle density.
    """
    try:
        # Avoid complex heavy-lifting on large images: Downscale first
        img = Image.open(image_stream).convert('L')
        # Limit processing to a manageable detail size
        max_size = (800, 800)
        # Handle different Pillow versions for Resampling
        resample_filter = getattr(Image, 'Resampling', Image).LANCZOS
        if hasattr(Image, 'ANTIALIAS'):
            resample_filter = Image.ANTIALIAS
            
        img.thumbnail(max_size, resample_filter)
        
        width, height = img.size
        # Detect edges to find areas of high detail
        edges = img.filter(ImageFilter.FIND_EDGES)
        
        # Convert to list of weights (0-255)
        # Represents how much detail is in each pixel
        weight_map = list(edges.getdata())
        
        return {
            "width": width,
            "height": height,
            "weight_map": weight_map
        }
    except Exception as e:
        raise ValueError(f"Failed to process image: {str(e)}")


@app.route('/')
def index():
    """Welcome message to confirm server is active."""
    return jsonify({
        "status": "active",
        "service": "PointGen Intelligence Backend",
        "endpoint": "/analyze (POST)"
    })


@app.route('/analyze', methods=['POST'])
def analyze():
    """
    API Endpoint for p5.js to get smart metadata for an image.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files['image']
    try:
        metadata = process_image_metadata(image_file.stream)
        return jsonify(metadata)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/sdf', methods=['GET'])
def get_sdf():
    """
    Returns signed distance field coordinates for 3D morph targets.
    Generates a 3D sphere point cloud.
    """
    import math
    import random
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


@app.route('/depth', methods=['POST'])
def generate_depth():
    """
    Simulates AI Depth extraction.
    In a production environment, this would use MiDaS or Depth-Anything.
    Here we generate a high-contrast grayscale relief map.
    """
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files['image']
    try:
        img = Image.open(image_file.stream).convert('L')
        # Boost contrast for meaningful displacement
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        # Save to base64
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            "depth_map": img_str,
            "width": img.width,
            "height": img.height
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/depth_mock_sim', methods=['GET'])
def depth_mock_sim():
    """Returns a pre-calculated mock depth map for the autoload feature."""
    return jsonify({"depth_map": None, "status": "simulated"})
    # Flask default server for development
    app.run(debug=True, port=5000)
