import os
import sys
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from PIL import Image
import numpy as np
import base64
from io import BytesIO

# Add smart_ascii to path to reuse logic
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'smart_ascii'))
import imp_ascii

app = Flask(__name__)
app.config['SECRET_KEY'] = 'ascii_secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

CHARS = "  .·:∵∴∷•"

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('process_image')
def handle_image(data):
    """
    Receives base64 image data, processes it into a brightness grid,
    and sends it back to the client.
    """
    try:
        # Decode base64 image
        header, encoded = data['image'].split(",", 1)
        image_data = base64.b64decode(encoded)
        img = Image.open(BytesIO(image_data))

        # Target width from client
        target_width = data.get('width', 100)
        
        # Calculate height with visual compensation (0.45)
        aspect_ratio = img.height / img.width
        target_height = int(target_width * aspect_ratio * 0.45)

        # Process image
        img = img.resize((target_width, target_height), Image.LANCZOS)
        img = img.convert('L') # Grayscale
        
        # Convert to grid
        pixels = np.array(img)
        grid = []
        for row in pixels:
            grid_row = []
            for pixel in row:
                char_idx = int(pixel / 255 * (len(CHARS) - 1))
                grid_row.append({
                    'char': CHARS[char_idx],
                    'brightness': int(pixel)
                })
            grid.append(grid_row)

        emit('ascii_data', {'grid': grid})

    except Exception as e:
        emit('error', {'message': str(e)})

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
