"""
AsciiGen Backend - Smart Image Analysis
Handles heavy-lifting image processing to guide the p5.js renderer.
Follows PEP8 and the Zen of Python.
"""

import io
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageFilter

app = Flask(__name__)
CORS(app)


def process_image_metadata(image_stream):
    """
    Extracts structural metadata from an image.
    Calculates a weight map based on edge detection to inform particle density.
    """
    try:
        # Simple is better than complex: Use PIL filters for edge detection
        img = Image.open(image_stream).convert('L')
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


if __name__ == '__main__':
    # Flask default server for development
    app.run(debug=True, port=5000)
