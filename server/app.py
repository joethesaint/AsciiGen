"""
AsciiGen Backend - Smart Image Analysis
Handles heavy-lifting image processing to guide the p5.js renderer.
Follows PEP8 and the Zen of Python.
"""

import io
import base64
import os
import math
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageFilter, ImageEnhance

app = Flask(__name__, static_folder='../web_interface', static_url_path='/')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/status')
def status():
    """Welcome message to confirm server is active."""
    return jsonify({
        "status": "active",
        "engine": "PointGen 3D",
        "service": "PointGen Intelligence Backend",
        "endpoint": "/analyze (POST)"
    })

def process_image_metadata(image_stream, zoom=1.0):
    """
    Extracts structural metadata from an image.
    Calculates a weight map based on edge detection to inform particle density.
    Supports 'zoom' which crops to the center of the image.
    """
    try:
        img = Image.open(image_stream).convert('L')
        
        # Apply Zoom (Center Crop)
        if zoom > 1.0:
            w, h = img.size
            new_w, new_h = w / zoom, h / zoom
            left = (w - new_w) / 2
            top = (h - new_h) / 2
            right = (w + new_w) / 2
            bottom = (h + new_h) / 2
            img = img.crop((left, top, right, bottom))

        max_size = (800, 800)
        resample_filter = getattr(Image, 'Resampling', Image).LANCZOS
        if hasattr(Image, 'ANTIALIAS'):
            resample_filter = Image.ANTIALIAS
            
        img.thumbnail(max_size, resample_filter)
        width, height = img.size
        edges = img.filter(ImageFilter.FIND_EDGES)
        weight_map = list(edges.getdata())
        
        return {
            "width": width,
            "height": height,
            "weight_map": weight_map,
            "zoom_applied": zoom
        }
    except Exception as e:
        raise ValueError(f"Failed to process image: {str(e)}")

@app.route('/analyze', methods=['POST'])
def analyze():
    """API Endpoint for p5.js to get smart metadata for an image."""
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files['image']
    zoom = float(request.args.get('zoom', 1.0))
    
    try:
        metadata = process_image_metadata(image_file.stream, zoom=zoom)
        return jsonify(metadata)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sdf', methods=['GET'])
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

@app.route('/depth', methods=['POST'])
def generate_depth():
    """Generates a high-contrast grayscale relief map."""
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files['image']
    try:
        img = Image.open(image_file.stream).convert('L')
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
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

if __name__ == '__main__':
    # Flask default server for development
    app.run(debug=True, port=5000)
