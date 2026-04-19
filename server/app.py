"""
AsciiGen Backend - Smart Image Analysis
Handles heavy-lifting image processing to guide the p5.js renderer.
Follows PEP8 and the Zen of Python.
"""

import base64
import hashlib
import io
import math
import os
import random
from typing import Any, BinaryIO, Dict, List

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageEnhance, ImageFilter

# In-memory Analysis Cache
ANALYSIS_CACHE: Dict[str, Any] = {}

def get_image_hash(image_stream: BinaryIO, kernel: str, zoom: float) -> str:
    """Generate a unique key for the image + settings combo."""
    image_stream.seek(0)
    data = image_stream.read()
    image_stream.seek(0)
    key_base = f"{hashlib.md5(data).hexdigest()}_{kernel}_{zoom}"
    return hashlib.md5(key_base.encode()).hexdigest()

app = Flask(__name__, static_folder='../web_interface', static_url_path='/')
CORS(app)

# Custom Convolution Kernels for Nuanced Preprocessing
KERNELS = {
    'sharpen': ImageFilter.Kernel((3, 3), [0, -1, 0, -1, 5, -1, 0, -1, 0], scale=1),
    'emboss': ImageFilter.EMBOSS,
    'gaussian': ImageFilter.GaussianBlur(radius=2),
    'edges': ImageFilter.FIND_EDGES,
    'smooth': ImageFilter.SMOOTH_MORE
}

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
 
def process_image_metadata(
    image_stream: BinaryIO, zoom: float = 1.0, kernel_name: str = "edges"
) -> Dict[str, Any]:
    """Extracts structural metadata from an image to guide ASCII density.

    Processes an image stream, applies an optional center-crop zoom, and
    calculates a structural weight map using edge detection informs rendering.

    Args:
        image_stream: The binary data stream of the image to process.
        zoom: The zoom factor (default 1.0). > 1.0 crops to the center.
        kernel_name: The name of the convolution kernel (e.g., 'sharpen').

    Returns:
        Dict containing width, height, weight_map, and metadata.

    Raises:
        ValueError: If the image processing fails or the stream is invalid.
    """
    # Use cached result if available
    img_hash = get_image_hash(image_stream, kernel_name, zoom)
    if img_hash in ANALYSIS_CACHE:
        return ANALYSIS_CACHE[img_hash]

    try:
        img = Image.open(image_stream).convert("L")

        w, h = img.size
        # The new dimensions of the "viewport" on the image
        new_w, new_h = w / zoom, h / zoom

        # Calculate crop coordinates (can be negative for zoom < 1.0)
        left, top = (w - new_w) / 2, (h - new_h) / 2
        right, bottom = (w + new_w) / 2, (h + new_h) / 2

        if zoom < 1.0:
            # Create a larger canvas and paste original image in the middle
            canvas = Image.new("L", (int(new_w), int(new_h)), color=0)
            offset_x, offset_y = int((new_w - w) / 2), int((new_h - h) / 2)
            canvas.paste(img, (offset_x, offset_y))
            img = canvas
        else:
            img = img.crop((left, top, right, bottom))

        # Target processing resolution (Internal Resolution for Detail Extraction)
        target_size = (800, 800)

        # Use modern Resampling constants if available (Pillow 10+)
        if hasattr(Image, "Resampling"):
            resample_filter = Image.Resampling.LANCZOS
        else:
            resample_filter = getattr(Image, "ANTIALIAS", Image.BICUBIC)

        # Ensure we don't lose sampling resolution
        img = img.resize(target_size, resample_filter)
        width, height = img.size

        # Apply Selected Convolution Kernel
        selected_kernel = KERNELS.get(kernel_name, ImageFilter.FIND_EDGES)
        processed_img = img.filter(selected_kernel)

        weight_map = list(processed_img.getdata())

        result = {
            "width": width,
            "height": height,
            "weight_map": weight_map,
            "zoom_applied": zoom,
            "kernel_applied": kernel_name,
        }

        ANALYSIS_CACHE[img_hash] = result
        return result
    except Exception as e:
        # Avoid losing exception context by utilizing 'from e' or similar logging
        raise ValueError(f"Failed to process image: {str(e)}") from e

@app.route('/analyze', methods=['POST'])
def analyze():
    """API Endpoint for p5.js to get smart metadata for an image."""
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    
    image_file = request.files['image']
    zoom = float(request.args.get('zoom', 1.0))
    kernel = request.args.get('kernel', 'edges')
    
    try:
        metadata = process_image_metadata(image_file.stream, zoom=zoom, kernel_name=kernel)
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
