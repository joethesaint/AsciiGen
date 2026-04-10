import pytest
from pathlib import Path
from PIL import Image
import numpy as np

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import imp_ascii

@pytest.fixture
def temp_image(tmp_path):
    img = Image.new('RGB', (20, 20), color='white')
    img_path = tmp_path / "test_image.jpg"
    img.save(img_path)
    return str(img_path)

def test_add_borders():
    original_art = "hello\nworld"
    
    # Store original config
    orig_borders = imp_ascii.config['features']['borders']
    orig_border_char = imp_ascii.config['features'].get('border_char', '#')
    
    try:
        # Test with borders enabled
        imp_ascii.config['features']['borders'] = True
        imp_ascii.config['features']['border_char'] = '#'
        
        bordered_art = imp_ascii.add_borders(original_art)
        lines = bordered_art.split('\n')
        assert lines[0] == '#' * 9
        assert lines[1] == '# hello #'
        assert lines[2] == '# world #'
        assert lines[-1] == '#' * 9

        # Test with borders disabled
        imp_ascii.config['features']['borders'] = False
        assert imp_ascii.add_borders(original_art) == original_art
    finally:
        # Restore configuration
        imp_ascii.config['features']['borders'] = orig_borders
        imp_ascii.config['features']['border_char'] = orig_border_char

def test_smart_convert(temp_image):
    # Test basic conversion and confirm output dimensions based on formula:
    # target_height = int((orig_height/orig_width) * target_width * 0.5)
    
    art = imp_ascii.smart_convert(temp_image, target_width=10, char_set='default')
    assert isinstance(art, str)
    
    lines = art.split('\n')
    assert len(lines) > 0
    # Original image is 20x20. Target width 10.
    # Height calculation: int((20/20) * 10 * 0.5) = 5 lines.
    assert len(lines) == 5
    # Width calculation: lines should be 10 characters wide
    assert len(lines[0]) == 10

def test_ascii_chars_defined():
    # Ensure sets are correctly defined as specified
    assert 'default' in imp_ascii.ASCII_CHARS
    assert 'pointism' in imp_ascii.ASCII_CHARS
    assert 'reverse' in imp_ascii.ASCII_CHARS

def test_add_color():
    art = "hi\nho"
    # Provide a 2D array simulating the L mode (grayscale) resize pixel data
    pixels = np.array([
        [255, 128],
        [0, 255]
    ])
    
    orig_color = imp_ascii.config['features']['color']
    try:
        imp_ascii.config['features']['color'] = True
        colored = imp_ascii.add_color(art, pixels)
        
        # Verify ANSI codes are inserted
        assert "\033[38;2;" in colored
        assert "m" in colored # format ending
        
        # We simulate 255 which goes to r=g=b=255. 
        # Check that proper formatting is done.
        assert "255;255;255" in colored
        
        # Ensure we have 2 lines returned
        lines = colored.split('\n')
        assert len(lines) == 2
        
        imp_ascii.config['features']['color'] = False
        uncolored = imp_ascii.add_color(art, pixels)
        assert uncolored == art
        
    finally:
        imp_ascii.config['features']['color'] = orig_color

def test_add_color_edge_cases():
    orig_color = imp_ascii.config['features']['color']
    try:
        imp_ascii.config['features']['color'] = True
        
        # Test row bounds: pixels has 2 rows but art has only 1 line
        art_row = "hi"
        pixels_multi_row = np.array([
            [255, 128],
            [0, 255]
        ])
        colored_row = imp_ascii.add_color(art_row, pixels_multi_row)
        assert len(colored_row.split('\n')) == 1  # Only formatted 1 line
        
        # Test column bounds: pixels has 2 columns but art has only 1 char
        art_col = "h"
        pixels_multi_col = np.array([
            [255, 128]
        ])
        colored_col = imp_ascii.add_color(art_col, pixels_multi_col)
        assert "\033" in colored_col
        # Verify it successfully broke execution after handling the first char
        
    finally:
        imp_ascii.config['features']['color'] = orig_color

def test_convert_for_github_lock_aspect(temp_image):
    # original config
    orig_width = imp_ascii.config['github']['width']
    orig_lock = imp_ascii.config['github']['lock_aspect']
    
    try:
        imp_ascii.config['github']['width'] = 100
        imp_ascii.config['github']['lock_aspect'] = True
        
        art = imp_ascii.convert_for_github(temp_image)
        lines = art.split('\n')
        
        expected_ratio = 899 / 1012
        # Based on convert_for_github calculation: height = int(expected_ratio * 100 * 0.45)
        expected_height = int(expected_ratio * 100 * 0.45)  # Let's say we expect this.
        # Note: we might fail if the function doesn't actually use expected_height!
        
        assert len(lines) == expected_height
        assert len(lines[0]) == 100
    finally:
        imp_ascii.config['github']['width'] = orig_width
        imp_ascii.config['github']['lock_aspect'] = orig_lock

def test_smart_convert_rgb_bug_and_configs(temp_image):
    # Test high_quality = False, autocontrast = False to trigger the RGB scalar bug fix
    orig_autocontrast = imp_ascii.config['processing']['autocontrast']
    orig_hq = imp_ascii.config['processing']['high_quality']
    
    try:
        imp_ascii.config['processing']['autocontrast'] = False
        imp_ascii.config['processing']['high_quality'] = False
        
        art = imp_ascii.smart_convert(temp_image, target_width=10, char_set='reverse')
        
        assert isinstance(art, str)
        lines = art.split('\n')
        assert len(lines) == 5
        assert len(lines[0]) == 10
        
        # Test with detailed char set
        art_detailed = imp_ascii.smart_convert(temp_image, target_width=15, char_set='detailed')
        assert len(art_detailed.split('\n')[0]) == 15
        
    finally:
        imp_ascii.config['processing']['autocontrast'] = orig_autocontrast
        imp_ascii.config['processing']['high_quality'] = orig_hq

def test_all_char_sets(temp_image):
    # Test that each character set dynamically maps without out-of-bounds index errors
    char_sets = ['default', 'reverse', 'pointism', 'detailed']
    
    for cs in char_sets:
        art = imp_ascii.smart_convert(temp_image, target_width=10, char_set=cs)
        assert isinstance(art, str)
        assert len(art) > 0
        
        # Verify specific structural character inclusion based on set
        if cs == 'default':
            # default usually starts with light characters for white images (like test_image.jpg which is white)
            # white = 255 -> index len-1 -> " " 
            assert " " in art
        elif cs == 'reverse':
            # white = 255 -> index len-1 -> "@"
            assert "@" in art
        elif cs == 'pointism':
            # white = 255 -> index len-1 -> "•"
            assert "•" in art
        elif cs == 'detailed':
            # white = 255 -> index len-1 -> "$"
            assert "$" in art


def test_convert_for_github_no_lock(temp_image):
    # original config
    orig_width = imp_ascii.config['github']['width']
    orig_lock = imp_ascii.config['github']['lock_aspect']
    
    try:
        imp_ascii.config['github']['width'] = 100
        imp_ascii.config['github']['lock_aspect'] = False
        
        # Temp image is 20x20
        art = imp_ascii.convert_for_github(temp_image)
        lines = art.split('\n')
        
        # based on convert_for_github calculation: orig_height / orig_width * width * 0.45
        expected_height = int((20 / 20) * 100 * 0.45) # convert_for_github uses 0.45!
        
        # It delegates to smart_convert with target_height calculated using 0.45
        assert len(lines) == expected_height
        assert len(lines[0]) == 100
    finally:
        imp_ascii.config['github']['width'] = orig_width
        imp_ascii.config['github']['lock_aspect'] = orig_lock
