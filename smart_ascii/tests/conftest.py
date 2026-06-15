import pytest
import io
from PIL import Image
from pathlib import Path

@pytest.fixture(scope="session")
def shared_image(tmp_path_factory):
    """Creates a small white JPEG image once per session."""
    img = Image.new("RGB", (10, 10), color="white")
    temp_dir = tmp_path_factory.mktemp("data")
    img_path = temp_dir / "test_image.jpg"
    img.save(img_path)
    return img_path


@pytest.fixture(scope="session")
def shared_image_bytes():
    """Returns small JPEG bytes generated once per session."""
    img = Image.new("RGB", (10, 10), color="red")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
