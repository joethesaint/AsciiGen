import io
import os
import sys
from pathlib import Path

import numpy as np
import yaml
from colorama import Fore, Style, init
from PIL import Image, ImageOps

# Initialize colorama for cross-platform ANSI support
init(autoreset=True)


def load_config():
    """Loads the YAML configuration from the local directory."""
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


CONFIG = load_config()

# ASCII character sets
DETAILED_CHARS = (
    " .'`^\\\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
)

ASCII_CHARS = {
    "default": "@%#*+=-:. ",
    "reverse": " .:-=+*#%@",
    "detailed": DETAILED_CHARS,
    "pointism": "  .·:∵∴∷•",
}

def _calculate_target_dims(img_size, target_width, target_height, scale, aspect):
    """Internal helper to resolve final ASCII grid dimensions."""
    orig_w, orig_h = img_size

    if scale is not None:
        t_w = int(orig_w * scale)
        t_h = int(orig_h * scale * aspect)
    elif target_height is not None and target_width is None:
        t_w = int((orig_w / orig_h) * target_height / aspect)
        t_h = target_height
    elif target_width is None:
        t_w = CONFIG["output"].get("width", 100)
        t_h = int((orig_h / orig_w) * t_w * aspect)
    else:
        t_w = target_width
        t_h = target_height or int((orig_h / orig_w) * t_w * aspect)

    return t_w, t_h


def smart_convert(
    image_path, target_width=None, char_set="default", target_height=None, scale=None
):
    """Main conversion function that maps image pixels to ASCII characters."""
    img = Image.open(image_path)
    font_aspect = CONFIG["processing"].get("font_aspect", 0.5)

    tw, th = _calculate_target_dims(
        img.size, target_width, target_height, scale, font_aspect
    )

    # Apply configuration-based pre-processing
    if CONFIG["processing"]["autocontrast"]:
        img = ImageOps.autocontrast(img.convert("L"))

    resize_method = (
        Image.LANCZOS if CONFIG["processing"]["high_quality"] else Image.BILINEAR
    )
    img = img.resize((tw, th), resize_method).convert("L")

    pixels = np.array(img)
    chars = ASCII_CHARS[char_set]
    return "\n".join(
        "".join(chars[int(p / 255 * (len(chars) - 1))] for p in row) for row in pixels
    )
    

def add_borders(art, border_char="#"):
    """Add decorative borders around ASCII art based on config."""
    if not CONFIG["features"]["borders"]:
        return art

    lines = art.split("\n")
    max_len = max(len(line) for line in lines)
    border = border_char * (max_len + 4)
    bordered = [border]
    for line in lines:
        bordered.append(f"{border_char} {line.ljust(max_len)} {border_char}")
    bordered.append(border)
    return "\n".join(bordered)


def add_color(art, pixels):
    """Add ANSI true-color (38;2;r;g;bm) to ASCII art."""
    if not CONFIG["features"]["color"]:
        return art

    art_lines = art.split("\n")
    colored = []
    for i, row in enumerate(pixels):
        if i >= len(art_lines):
            break

        colored_row = []
        for j, p in enumerate(row):
            if j >= len(art_lines[i]):
                break

            # Map grayscale intensity to RGB
            v = int(p)
            char = art_lines[i][j]
            # Use multi-step construction for readability
            ansi_code = f"\033[38;2;{v};{v};{v}m"
            colored_row.append(f"{ansi_code}{char}{Style.RESET_ALL}")

        colored.append("".join(colored_row))
    return "\n".join(colored)

def convert_for_github(image_path):
    """Specialized conversion preset optimized for GitHub Profile READMEs."""
    github_width = CONFIG["github"]["width"]
    aspect_ratio = 899 / 1012 if CONFIG["github"]["lock_aspect"] else None

    if aspect_ratio:
        github_height = int(aspect_ratio * github_width * 0.45)
    else:
        img = Image.open(image_path)
        orig_w, orig_h = img.size
        github_height = int((orig_h / orig_w) * github_width * 0.45)

    return smart_convert(
        image_path,
        github_width,
        char_set=CONFIG["github"]["char_set"],
        target_height=github_height,
    )

def main():
    """CLI entry point for processing multiple images via sys.argv."""
    if len(sys.argv) < 2:
        image_paths = ["input.jpg"] if Path("input.jpg").exists() else []
        if not image_paths:
            print("Error: No input images provided.")
            print("Usage: python imp_ascii.py <image_path> [image_path ...]")
            sys.exit(1)
    else:
        image_paths = sys.argv[1:]

    for i, path_str in enumerate(image_paths):
        path = Path(path_str)
        try:
            if not path.exists():
                print(f"Error: Path not found - {path}")
                continue

            # Core ASCII generation
            art = smart_convert(
                path,
                target_width=CONFIG["output"]["width"],
                char_set=CONFIG["output"]["char_set"],
            )

            # Apply decorative features
            if CONFIG["features"]["color"] or CONFIG["features"]["borders"]:
                img = Image.open(path).convert("L")
                w_out = CONFIG["output"]["width"]
                # Downsample for processing pixels (consistent with output)
                pixels = np.array(img.resize((w_out, int(w_out * 0.5))))

                if CONFIG["features"]["color"]:
                    art = add_color(art, pixels)
                if CONFIG["features"]["borders"]:
                    art = add_borders(art, CONFIG["features"]["border_char"])

            # File output if enabled
            if CONFIG["output"]["save_to_file"]:
                out_dir = Path(__file__).parent / "outputs"
                out_dir.mkdir(exist_ok=True)

                filename = (
                    f"output_{i+1}.txt"
                    if len(image_paths) > 1
                    else CONFIG["output"]["filename"]
                )
                output_path = out_dir / Path(filename).name

                output_path.write_text(art, encoding="utf-8")
                print(f"Success: ASCII art saved to {output_path}")

            # Display to console
            print(art)

        except Exception as e:
            print(f"Fatal error processing {path}: {e}")


if __name__ == "__main__":
    main()