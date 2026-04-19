import sys
from pathlib import Path

import imp_ascii


def generate_all_variants():
    """Generates a gallery of ASCII art variants to demonstrate engine features."""
    # Resolve path abstractly avoiding CWD relative failure
    image_path = Path(__file__).parent.parent / "images" / "silver.jpg"
    examples_dir = Path(__file__).parent / "examples"
    
    # 1. Base Charsets
    char_sets = ["default", "reverse", "pointism", "detailed"]

    for cs in char_sets:
        out_dir = examples_dir / f"charset_{cs}"
        out_dir.mkdir(parents=True, exist_ok=True)

        # smart_convert handles proportional scaling safely
        art = imp_ascii.smart_convert(image_path, target_width=240, char_set=cs)
        (out_dir / "output.txt").write_text(art, encoding="utf-8")

            
    # 2. Config Feature: Borders
    out_dir = examples_dir / "feature_borders"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Enable borders temporarily
    orig_borders = imp_ascii.CONFIG["features"]["borders"]
    imp_ascii.CONFIG["features"]["borders"] = True
    imp_ascii.CONFIG["features"]["border_char"] = "#"

    art = imp_ascii.smart_convert(image_path, target_width=240, char_set="default")
    art_bordered = imp_ascii.add_borders(art)
    (out_dir / "output.txt").write_text(art_bordered, encoding="utf-8")

    # Restore original state
    imp_ascii.CONFIG["features"]["borders"] = orig_borders

    # 3. GitHub Profile Optimization
    out_dir = examples_dir / "feature_github"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Leverage the natively specialized GitHub profile conversion config
    art_github = imp_ascii.convert_for_github(image_path)
    (out_dir / "output.txt").write_text(art_github, encoding="utf-8")

    print(f"Success: Generated all examples inside {examples_dir}/")

if __name__ == "__main__":
    generate_all_variants()
