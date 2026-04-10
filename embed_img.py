import base64
import os

sketch_path = 'web_interface/sketch.js'
image_path = 'images/heart.jpg'

with open(image_path, 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

data_uri = f"data:image/jpeg;base64,{b64_data}"

with open(sketch_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the path with the data URI
modified_content = content.replace("'../images/heart.jpg'", f"'{data_uri}'")

with open(sketch_path, 'w', encoding='utf-8') as f:
    f.write(modified_content)

print("Sketch updated with embedded Base64 image.")
