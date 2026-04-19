import pytest
import io
from PIL import Image
from app import process_image_metadata

def test_zoom_logic_precise():
    """
    TDD Test: Verify that zoom=1.0 returns high-res metadata
    and zoom=2.0 also returns high-res metadata (not half dimensions).
    This ensures that zooming IN increases structural detail resolution.
    """
    img = Image.new('L', (100, 100), color=0)
    img.putpixel((50, 50), 255)
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    # Test Zoom 1.0 (Original, resized up to 800)
    metadata_1 = process_image_metadata(buf, zoom=1.0)
    assert metadata_1['width'] == 800
    assert metadata_1['height'] == 800
    
    # Test Zoom 2.0 (Cropped and then resized up to 800)
    buf.seek(0)
    metadata_2 = process_image_metadata(buf, zoom=2.0)
    assert metadata_2['width'] == 800
    assert metadata_2['height'] == 800
    assert metadata_2['zoom_applied'] == 2.0

def test_zoom_out_reset():
    """
    Verify stability of metadata resolution across zoom transitions.
    """
    img = Image.new('L', (400, 400), color=128)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    
    # 1. Zoom in
    buf.seek(0)
    m_in = process_image_metadata(buf, zoom=4.0)
    assert m_in['width'] == 800
    
    # 2. Zoom back out
    buf.seek(0)
    m_out = process_image_metadata(buf, zoom=1.0)
    assert m_out['width'] == 800
