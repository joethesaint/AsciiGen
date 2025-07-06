import yaml
import sys
from pathlib import Path
from PIL import Image, ImageOps
import numpy as np
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)

# Load config
with open('config.yaml') as f:
    config = yaml.safe_load(f)

# ASCII character sets
ASCII_CHARS = {
    'default': "@%#*+=-:. ",
    'reverse': " .:-=+*#%@",
    'detailed': " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
}

def smart_convert(image_path, target_width, char_set='default'):
    """Main conversion function with smart features"""
    img = Image.open(image_path)
    orig_width, orig_height = img.size
    
    # Calculate target height maintaining aspect ratio
    target_height = int((orig_height/orig_width) * target_width * 0.5)
    
    # Apply configured processing
    if config['processing']['autocontrast']:
        img = ImageOps.autocontrast(img.convert('L'))
    
    # Resize with selected method
    resize_method = Image.LANCZOS if config['processing']['high_quality'] else Image.BILINEAR
    img = img.resize((target_width, target_height), resize_method)
    
    # Convert to ASCII
    pixels = np.array(img)
    chars = ASCII_CHARS[char_set]
    return "\n".join("".join(chars[int(p/255*(len(chars)-1))] for p in row) for row in pixels)

def add_borders(art, border_char='#'):
    """Add decorative borders around ASCII art"""
    if not config['features']['borders']:
        return art
    
    lines = art.split('\n')
    max_len = max(len(line) for line in lines)
    border = border_char * (max_len + 4)
    bordered = [border]
    for line in lines:
        bordered.append(f"{border_char} {line.ljust(max_len)} {border_char}")
    bordered.append(border)
    return '\n'.join(bordered)

def add_color(art, pixels):
    """Add ANSI color to ASCII art"""
    if not config['features']['color']:
        return art

    art_lines = art.split('\n')
    colored = []
    for i, row in enumerate(pixels):
        if i >= len(art_lines):
            break
        colored_row = []
        for j, p in enumerate(row):
            if j >= len(art_lines[i]):
                break
            intensity = p / 255
            # Use grayscale mapping for color (or choose a color gradient)
            r = g = b = int(255 * intensity)
            char = art_lines[i][j]
            colored_row.append(f"\033[38;2;{r};{g};{b}m{char}{Style.RESET_ALL}")
        colored.append(''.join(colored_row))
    return '\n'.join(colored)

def convert_for_github(image_path):
    """Specialized version for GitHub profiles"""
    github_width = config['github']['width']
    aspect_ratio = 899/1012 if config['github']['lock_aspect'] else None
    
    img = Image.open(image_path)
    if aspect_ratio:
        github_height = int(aspect_ratio * github_width * 0.45)
    else:
        orig_width, orig_height = img.size
        github_height = int((orig_height/orig_width) * github_width * 0.45)
    
    img = img.resize((github_width, github_height))
    return smart_convert(image_path, github_width, char_set=config['github']['char_set'])

if __name__ == "__main__":
    # Handle command line arguments
    if len(sys.argv) < 2:
        # Default to input.jpg if exists, otherwise show help
        if Path("input.jpg").exists():
            image_paths = ["input.jpg"]
        else:
            print("Error: Please specify at least one image file")
            print("Usage: python ascii_converter.py image1.jpg [image2.png ...]")
            sys.exit(1)
    else:
        image_paths = sys.argv[1:]

    # Process each image
    for i, image_path in enumerate(image_paths):
        try:
            if not Path(image_path).exists():
                print(f"Error: File not found - {image_path}")
                continue

            # Standard conversion
            art = smart_convert(
                image_path,
                target_width=config['output']['width'],
                char_set=config['output']['char_set']
            )
            
            # Prepare for color/border processing
            if config['features']['color'] or config['features']['borders']:
                img = Image.open(image_path).convert('L')
                pixels = np.array(img.resize((
                    config['output']['width'], 
                    int(config['output']['width'] * 0.5)
                )))
                
                if config['features']['color']:
                    art = add_color(art, pixels)
                if config['features']['borders']:
                    art = add_borders(art, config['features']['border_char'])

            # Output handling
            if config['output']['save_to_file']:
                output_file = (f"output_{i+1}.txt" if len(image_paths) > 1 
                             else config['output']['filename'])
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(art)
                print(f"Saved ASCII art to {output_file}")
            
            # Always print to console
            print(art)
            
        except Exception as e:
            print(f"Error processing {image_path}: {str(e)}")