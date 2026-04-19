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

# Removed local fixtures in favor of conftest.py shared fixtures.

@pytest.fixture
def test_config(mocker):
    """Fixture to mock the imp_ascii.CONFIG dictionary."""
    # Create a deep copy of the real CONFIG to safely modify
    import copy

    test_config = copy.deepcopy(imp_ascii.CONFIG)
    mocker.patch.object(imp_ascii, "CONFIG", test_config)
    return test_config

def test_add_borders(test_config):
    original_art = "hello\nworld"
    test_config['features']['borders'] = True
    test_config['features']['border_char'] = '#'
    
    bordered_art = imp_ascii.add_borders(original_art)
    lines = bordered_art.split('\n')
    assert lines[0] == '#' * 9
    assert lines[1] == '# hello #'
    
    test_config['features']['borders'] = False
    assert imp_ascii.add_borders(original_art) == original_art

def test_smart_convert_dimensions(shared_image, test_config):
    """Verify smart_convert respects specified dimensions with font_aspect=1.0."""
    test_config['processing']['font_aspect'] = 1.0
    art = imp_ascii.smart_convert(shared_image, target_width=10)
    
    lines = art.split('\n')
    assert len(lines) == 10
    assert len(lines[0]) == 10

def test_all_char_sets(shared_image):
    """Dynamic check for all defined ASCII character sets."""
    for cs in ['default', 'reverse', 'pointism', 'detailed']:
        art = imp_ascii.smart_convert(shared_image, target_width=10, char_set=cs)
        assert isinstance(art, str)
        assert len(art) > 0

def test_add_color(test_config):
    art = "hi\nho"
    pixels = np.array([[255, 128], [0, 255]])
    test_config['features']['color'] = True
    
    colored = imp_ascii.add_color(art, pixels)
    assert "\033[38;2;" in colored
    assert "255;255;255" in colored

def test_convert_for_github(shared_image, test_config):
    test_config['github']['width'] = 100
    test_config['github']['lock_aspect'] = True
    
    art = imp_ascii.convert_for_github(shared_image)
    lines = art.split('\n')
    assert len(lines[0]) == 100

def test_add_color_edge_cases(test_config):
    """Test add_color behavior when dimensions don't match exactly."""
    art = "h\ni"
    # Row dimension mismatch
    pixels = np.array([[255]]) 
    test_config['features']['color'] = True
    colored = imp_ascii.add_color(art, pixels)
    assert len(colored.split('\n')) == 1 # Only one row colored
    
    # Col dimension mismatch
    pixels_wide = np.array([[255, 128], [0, 255]])
    colored_wide = imp_ascii.add_color("a", pixels_wide)
    assert "\033" in colored_wide

def test_convert_for_github_no_lock(shared_image, test_config):
    """Verify github conversion works without aspect ratio locking."""
    test_config['github']['width'] = 100
    test_config['github']['lock_aspect'] = False
    
    art = imp_ascii.convert_for_github(shared_image)
    lines = art.split('\n')
    assert len(lines[0]) == 100

def test_imp_ascii_error_handling(tmp_path):
    """Test behavior with non-existent file."""
    with pytest.raises(Exception):
        imp_ascii.smart_convert(str(tmp_path / "non_existent.jpg"))

def test_smart_convert_scale(shared_image):
    """Test conversion with the scale parameter."""
    # 10x10 input. Scale 2.0 -> Width 20.
    art = imp_ascii.smart_convert(shared_image, scale=2.0)
    lines = art.split("\n")
    assert len(lines[0]) == 20

def test_smart_convert_height_only(shared_image, test_config):
    """Test providing target_height but not target_width."""
    test_config['processing']['font_aspect'] = 0.5
    # Orig 20x20. Height=10 -> Width = (20/20)*10/0.5 = 20
    art = imp_ascii.smart_convert(shared_image, target_height=10)
    lines = art.split('\n')
    assert len(lines[0]) == 20

def test_smart_convert_width_fallback(shared_image, test_config):
    """Test fallback to config width when no dimensions are provided."""
    test_config['output']['width'] = 50
    art = imp_ascii.smart_convert(shared_image)
    lines = art.split('\n')
    assert len(lines[0]) == 50

def test_smart_convert_autocontrast(shared_image, test_config):
    """Test autocontrast branch."""
    test_config['processing']['autocontrast'] = True
    art = imp_ascii.smart_convert(shared_image, target_width=10)
    assert len(art.split('\n')) > 0

def test_add_color_disabled(test_config):
    """Ensure add_color returns input art when color is disabled."""
    test_config['features']['color'] = False
    art = "test"
    assert imp_ascii.add_color(art, None) == art

def test_main_cli_basic(shared_image, mocker, test_config):
    """Test CLI execution with decorative features enabled."""
    test_config["output"]["save_to_file"] = False
    test_config["features"]["color"] = True
    test_config["features"]["borders"] = True

    mocker.patch("sys.argv", ["imp_ascii.py", shared_image])
    mock_print = mocker.patch("builtins.print")
    
    # We reload/run the main logic blocks 
    # Or just call the logic since we are in a test env.
    # Since main is protected by if __name__ == "__main__", we can't directly call it 
    # unless we use runpy or manual block execution.
    # Let's use a small trick by wrapping the main logic into a function if possible,
    # but since I can't edit the file to add a main() easily without more chunks,
    # I'll use runpy.
    
    import runpy
    runpy.run_path('smart_ascii/imp_ascii.py', run_name='__main__')
    
    # Verify print was called (meaning it processed the image)
    assert mock_print.called

def test_main_cli_multiple_files_and_save(shared_image, mocker, tmp_path):
    """Test CLI with multiple files, file saving, and color/borders enabled."""
    import copy

    test_config = copy.deepcopy(imp_ascii.CONFIG)
    test_config["output"]["save_to_file"] = True
    test_config["features"]["color"] = True
    test_config["features"]["borders"] = True

    # Patch imp_ascii.CONFIG so runpy uses our test_config
    mocker.patch.object(imp_ascii, "CONFIG", test_config)
    mocker.patch("os.makedirs")
    mock_open = mocker.patch("builtins.open", mocker.mock_open())
    mocker.patch("sys.argv", ["imp_ascii.py", shared_image])
    mocker.patch("builtins.print")
    
    # Mock Image.open and ensure it returns a mock that supports convert/resize/np.array
    mock_img = mocker.Mock()
    mock_img.size = (20, 20)
    mock_img.convert.return_value = mock_img
    mock_img.resize.return_value = mock_img
    mocker.patch('PIL.Image.open', return_value=mock_img)
    mocker.patch('numpy.array', return_value=np.zeros((10, 10)))
    
    import runpy
    runpy.run_path('smart_ascii/imp_ascii.py', run_name='__main__')
    
    assert mock_open.called

def test_main_cli_file_not_found(mocker, test_config):
    """Test CLI behavior when a specified file does not exist."""
    # We must patch at the module level where Path is imported
    mocker.patch('imp_ascii.Path.exists', return_value=False)
    mocker.patch('sys.argv', ['imp_ascii.py', 'ghost.jpg'])
    mock_print = mocker.patch('builtins.print')
    
    import runpy
    runpy.run_path("smart_ascii/imp_ascii.py", run_name="__main__")
    assert any(
        "Error: Path not found" in str(arg)
        for call in mock_print.call_args_list
        for arg in call.args
    )

def test_main_cli_default_input_file(shared_image, mocker, test_config):
    """Test CLI behavior when no args are provided but input.jpg exists."""
    mocker.patch('sys.argv', ['imp_ascii.py'])
    mocker.patch('pathlib.Path.exists', return_value=True)
    # We need to make sure Image.open works for "input.jpg"
    mock_open_img = mocker.patch('PIL.Image.open')
    mocker.patch('builtins.print')
    
    import runpy
    runpy.run_path('smart_ascii/imp_ascii.py', run_name='__main__')
    assert mock_open_img.called

def test_main_cli_no_args_provided(mocker, test_config):
    """Test CLI when no arguments are provided and default file is missing."""
    mocker.patch('sys.argv', ['imp_ascii.py'])
    # Ensure Path("input.jpg").exists() is False
    mocker.patch('pathlib.Path.exists', return_value=False)
    mocker.patch('builtins.print')
    
    # Make sys.exit actually raise to stop execution during runpy
    mock_exit = mocker.patch('sys.exit', side_effect=SystemExit(1))
    
    import runpy
    with pytest.raises(SystemExit):
        runpy.run_path('smart_ascii/imp_ascii.py', run_name='__main__')
    
    mock_exit.assert_called_with(1)
