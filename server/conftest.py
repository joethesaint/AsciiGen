import pytest
import io
from PIL import Image
from app import app

from fastapi.testclient import TestClient

@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client

@pytest.fixture
def test_image():
    """Generates a simple 50x50 red image for testing."""
    img = Image.new('RGB', (50, 50), color='red')
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return buf
