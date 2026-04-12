import pytest
import io
import os
import numpy as np
from PIL import Image
from pathlib import Path
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import imp_ascii

@pytest.fixture
def temp_image_path(tmp_path):
    """Fixture to provide a temporary 20x20 white JPEG image."""
    img = Image.new('RGB', (20, 20), color='white')
    img_path = tmp_path / "test_image.jpg"
    img.save(img_path)
    return str(img_path)

@pytest.fixture
def mock_config(mocker):
    """Fixture to mock the imp_ascii.config dictionary."""
    # Create a deep copy of the real config to safely modify
    import copy
    test_config = copy.deepcopy(imp_ascii.config)
    mocker.patch.object(imp_ascii, 'config', test_config)
    return test_config

def test_add_borders(mock_config):
    original_art = "hello\nworld"
    mock_config['features']['borders'] = True
    mock_config['features']['border_char'] = '#'
    
    bordered_art = imp_ascii.add_borders(original_art)
    lines = bordered_art.split('\n')
    assert lines[0] == '#' * 9
    assert lines[1] == '# hello #'
    
    mock_config['features']['borders'] = False
    assert imp_ascii.add_borders(original_art) == original_art

def test_smart_convert_dimensions(temp_image_path, mock_config):
    """Verify smart_convert respects specified dimensions with font_aspect=1.0."""
    mock_config['processing']['font_aspect'] = 1.0
    art = imp_ascii.smart_convert(temp_image_path, target_width=10, char_set='default')
    
    lines = art.split('\n')
    assert len(lines) == 10
    assert len(lines[0]) == 10

def test_all_char_sets(temp_image_path):
    """Dynamic check for all defined ASCII character sets."""
    for cs in ['default', 'reverse', 'pointism', 'detailed']:
        art = imp_ascii.smart_convert(temp_image_path, target_width=10, char_set=cs)
        assert isinstance(art, str)
        assert len(art) > 0

def test_add_color(mock_config):
    art = "hi\nho"
    pixels = np.array([[255, 128], [0, 255]])
    mock_config['features']['color'] = True
    
    colored = imp_ascii.add_color(art, pixels)
    assert "\033[38;2;" in colored
    assert "255;255;255" in colored

def test_convert_for_github(temp_image_path, mock_config):
    mock_config['github']['width'] = 100
    mock_config['github']['lock_aspect'] = True
    
    art = imp_ascii.convert_for_github(temp_image_path)
    lines = art.split('\n')
    assert len(lines[0]) == 100

def test_add_color_edge_cases(mock_config):
    """Test add_color behavior when dimensions don't match exactly."""
    art = "h\ni"
    # Row dimension mismatch
    pixels = np.array([[255]]) 
    mock_config['features']['color'] = True
    colored = imp_ascii.add_color(art, pixels)
    assert len(colored.split('\n')) == 1 # Only one row colored
    
    # Col dimension mismatch
    pixels_wide = np.array([[255, 128], [0, 255]])
    colored_wide = imp_ascii.add_color("a", pixels_wide)
    assert "\033" in colored_wide

def test_convert_for_github_no_lock(temp_image_path, mock_config):
    """Verify github conversion works without aspect ratio locking."""
    mock_config['github']['width'] = 100
    mock_config['github']['lock_aspect'] = False
    
    art = imp_ascii.convert_for_github(temp_image_path)
    lines = art.split('\n')
    assert len(lines[0]) == 100

def test_imp_ascii_error_handling(tmp_path):
    """Test behavior with non-existent file."""
    with pytest.raises(Exception):
        imp_ascii.smart_convert(str(tmp_path / "non_existent.jpg"))
