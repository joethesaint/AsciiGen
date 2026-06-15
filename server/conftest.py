import pytest
import io
from fastapi.testclient import TestClient
from server.app import app

@pytest.fixture(scope="session")
def client():
    """Session-scoped test client for the FastAPI application."""
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="session")
def test_image_bytes():
    """Generates a small test image once per session."""
    from PIL import Image as PILImage
    img = PILImage.new("RGB", (10, 10), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def test_image(test_image_bytes):
    """Provides a fresh stream from the pre-generated session image bytes."""
    return io.BytesIO(test_image_bytes)
