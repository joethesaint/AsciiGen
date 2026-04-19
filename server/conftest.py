import pytest
import io
from PIL import Image
from app import app

@pytest.fixture(scope="session")
def client():
    """Session-scoped test client for the Flask application."""
    app.config["TESTING"] = True
    with app.test_client() as client:
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
