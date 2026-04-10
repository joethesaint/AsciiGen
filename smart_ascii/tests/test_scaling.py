import os
import sys
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import imp_ascii

def test_exact_replication_scale():
    # create a tiny 20x10 image to test proportion
    img = Image.new('L', (20, 10), color=255)
    img_path = 'temp_test.jpg'
    img.save(img_path)
    
    # generate with scale=1.0
    # Should accurately reflect 20 chars width, 10 chars height
    art = imp_ascii.smart_convert(img_path, scale=1.0)
    lines = art.strip('\n').split('\n')

    width = len(lines[0])
    height = len(lines)
    
    assert height == 10, f"Height scaling failed. Expected 10, got {height}"
    assert width == 20, f"Width scaling failed. Expected 20, got {width}"
    
    # generate with scale=2.5
    art2 = imp_ascii.smart_convert(img_path, scale=2.5)
    lines2 = art2.strip('\n').split('\n')
    
    assert len(lines2) == 25, f"Height should be scaled exactly 25. Got {len(lines2)}"
    assert len(lines2[0]) == 50, f"Width should be scaled exactly 50. Got {len(lines2[0])}"
    
    os.remove(img_path)

def test_scale_vertically_preserves_horizontal():
    # 20x10 image. orig_ratio = 10/20 = 0.5
    img = Image.new('L', (20, 10), color=255)
    img_path = 'temp_test_v.jpg'
    img.save(img_path)
    
    # We specify target_height only. 
    # With font_aspect (from config, currently 1.0 based on config.yaml), 
    # if target_height=30, target_width should be calculated.
    # width = height * (orig_width / orig_height) / font_aspect
    # width = 30 * (20 / 10) / 1.0 = 60
    art = imp_ascii.smart_convert(img_path, target_width=None, target_height=30)
    lines = art.strip('\n').split('\n')
    
    assert len(lines) == 30, f"Height should be 30, got {len(lines)}"
    assert len(lines[0]) == 60, f"Width should be proportionally scaled to 60, got {len(lines[0])}"
    
    os.remove(img_path)

def test_scale_horizontally_preserves_vertical():
    img = Image.new('L', (20, 10), color=255)
    img_path = 'temp_test_h.jpg'
    img.save(img_path)
    
    # Target width 100.
    # height = width * (orig_height / orig_width) * font_aspect
    # height = 100 * (10 / 20) * 1.0 = 50
    art = imp_ascii.smart_convert(img_path, target_width=100, target_height=None)
    lines = art.strip('\n').split('\n')
    
    assert len(lines[0]) == 100, f"Width should be 100, got {len(lines[0])}"
    assert len(lines) == 50, f"Height should be proportionally scaled to 50, got {len(lines)}"

    os.remove(img_path)
