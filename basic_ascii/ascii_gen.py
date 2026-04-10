from PIL import Image
import numpy as np
import sys
import os

ASCII_CHARS = " .:-=+*#%@"

def convert_image_to_ascii(image_path, output_width=100):
    try:
        image = Image.open(image_path)
    except Exception as e:
        print(f"Unable to open image file: {image_path}")
        print(e)
        return
    
    width, height = image.size
    aspect_ratio = height / width
    output_height = int(output_width * aspect_ratio * 0.5)
    
    resized_image = image.resize((output_width, output_height))
    grayscale_image = resized_image.convert("L")
    
    pixels = np.array(grayscale_image)
    ascii_str = ""
    for row in pixels:
        for pixel in row:
            index = int(pixel / 255 * (len(ASCII_CHARS) - 1))
            ascii_str += ASCII_CHARS[index]
        ascii_str += "\n"
    
    return ascii_str

# Add this function to the script
def save_ascii_to_file(ascii_art, filename="output.txt"):
    with open(filename, "w", encoding="utf-8") as f:
        f.write(ascii_art)
    print(f"ASCII art saved to {filename}")

# Then modify the main part to:
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ascii_art.py <image_path> [output_width] [output_file]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_width = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    output_file = sys.argv[3] if len(sys.argv) > 3 else "ascii_output.txt"
    
    ascii_art = convert_image_to_ascii(image_path, output_width)
    if ascii_art:
        save_ascii_to_file(ascii_art, output_file)