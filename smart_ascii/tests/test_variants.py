import pytest
import os
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import generate_variants
import imp_ascii

def test_generate_all_variants(mocker, tmp_path):
    """Test the variant generation script using a temporary directory."""
    # Mock image opening to avoid actual file I/O for source image
    mocker.patch("PIL.Image.open")

    # Set up directory structure in tmp_path
    image_dir = tmp_path / "images"
    image_dir.mkdir()
    (image_dir / "silver.jpg").write_text("dummy")

    # We patch generate_variants.Path so that when it looks for ../images/silver.jpg 
    # it finds our temp one. 
    # The return value of Path(__file__) is what we mock.
    mocker.patch("generate_variants.Path", return_value=tmp_path / "smart_ascii" / "generate_variants.py")
    
    # Mock smart_convert to avoid actually needing a real silver.jpg
    mocker.patch("imp_ascii.smart_convert", return_value="ASCII ART")

    generate_variants.generate_all_variants()

    # Verify files were created in tmp_path
    examples_dir = tmp_path / "smart_ascii" / "examples"
    assert (examples_dir / "charset_default" / "output.txt").exists()
    assert (examples_dir / "feature_borders" / "output.txt").exists()
    assert (examples_dir / "feature_github" / "output.txt").exists()
