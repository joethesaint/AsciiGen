import pytest
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import generate_variants
import imp_ascii

def test_generate_all_variants(mocker, tmp_path):
    """Test the variant generation script with mocked file IO."""
    # Mock image opening
    from PIL import Image
    mock_img = Image.new('RGB', (100, 100), color='white')
    mocker.patch('PIL.Image.open', return_value=mock_img)
    
    # Mock os.makedirs and open to avoid writing to real disk
    mocker.patch('os.makedirs')
    mock_open = mocker.patch('builtins.open', mocker.mock_open())
    
    # Mock os.path.exists for the image check in code (if any)
    mocker.patch('os.path.exists', return_value=True)
    
    # Run the generation
    generate_variants.generate_all_variants()
    
    # Verify we tried to write files
    assert mock_open.call_count > 0
    # Verify specific char_sets were processed
    # We check if 'smart_convert' was called with expected params
    # (Actually we'll just check if it ran without error for now)
