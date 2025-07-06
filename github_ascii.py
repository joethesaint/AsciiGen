from PIL import Image
import numpy as np
import sys

# GitHub-optimized ASCII characters (darker to lighter)
ASCII_CHARS = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

def convert_to_github_ascii(image_path):
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"Error opening image: {e}")
        return None

    # GitHub-specific dimensions
    target_width = 54  # GitHub profile README perfect width
    aspect_ratio = img.height / img.width
    target_height = int(target_width * aspect_ratio * 0.45)  # 0.45 compensates for font aspect

    # Resize and convert to grayscale
    img = img.resize((target_width, target_height))
    img = img.convert('L')  # Grayscale

    # Convert pixels to ASCII
    pixels = np.array(img)
    ascii_str = ""
    for row in pixels:
        for pixel in row:
            index = int(pixel / 255 * (len(ASCII_CHARS) - 1))
            ascii_str += ASCII_CHARS[index]
        ascii_str += "\n"
    
    return ascii_str

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python github_ascii.py <image.jpg> [output.txt]")
        sys.exit(1)
    
    ascii_art = convert_to_github_ascii(sys.argv[1])
    
    if len(sys.argv) > 2:
        with open(sys.argv[2], 'w', encoding='utf-8') as f:
            f.write(ascii_art)
        print(f"Saved to {sys.argv[2]}")
    else:
        print(ascii_art)