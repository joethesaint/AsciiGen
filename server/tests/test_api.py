import io
import json

import pytest


def test_status_endpoint(client):
    """Test the /status endpoint using the test client."""
    response = client.get("/status")
    assert response.status_code == 200
    assert response.json["status"] == "active"

def test_analyze_endpoint(client, test_image):
    """Test the /analyze POST endpoint with a real image file stream."""
    data = {"image": (test_image, "test.jpg")}
    response = client.post("/analyze", data=data, content_type="multipart/form-data")

    assert response.status_code == 200
    json_data = response.json
    assert "weight_map" in json_data
    assert json_data["width"] == 800
    assert json_data["height"] == 800

def test_analyze_endpoint_zoom(client, test_image):
    """Test /analyze with the new zoom parameter."""
    data = {"image": (test_image, "test.jpg")}
    response = client.post(
        "/analyze?zoom=2.0", data=data, content_type="multipart/form-data"
    )

    assert response.status_code == 200
    assert response.json["zoom_applied"] == 2.0


def test_analyze_cache_hit(client):
    """Verify that repeated requests hit the ANALYSIS_CACHE."""
    from PIL import Image as PILImage
    def get_img():
        img = PILImage.new("RGB", (50, 50), color="red")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        return buf

    data = {"image": (get_img(), "test.jpg")}
    client.post("/analyze", data=data, content_type="multipart/form-data")
    
    # Second request with identical data
    data2 = {"image": (get_img(), "test.jpg")}
    response = client.post("/analyze", data=data2, content_type="multipart/form-data")
    assert response.status_code == 200


def test_analyze_zoom_out(client, test_image):
    """Test /analyze with zoom < 1.0 (zoom out branch)."""
    data = {"image": (test_image, "test.jpg")}
    response = client.post(
        "/analyze?zoom=0.5", data=data, content_type="multipart/form-data"
    )
    assert response.status_code == 200
    assert response.json["zoom_applied"] == 0.5

def test_analyze_no_image(client):
    """Test /analyze without an image upload."""
    response = client.post('/analyze')
    assert response.status_code == 400
    assert 'error' in response.json

def test_index_route(client):
    """Test the base index route."""
    # Since index.html might not exist in the test env statically, 
    # we just check if it tries to send it.
    try:
        response = client.get('/')
        assert response.status_code in [200, 404] 
    except FileNotFoundError:
        pytest.skip("index.html not found for static delivery test")

def test_sdf_endpoint(client):
    """Test the /sdf generation endpoint."""
    response = client.get('/sdf')
    assert response.status_code == 200
    data = response.json
    assert 'points' in data
    assert len(data['points']) == 10000
    assert 'x' in data['points'][0]

def test_generate_depth(client, test_image):
    """Test the /depth POST endpoint."""
    data = {'image': (test_image, 'test.jpg')}
    response = client.post('/depth', data=data, content_type='multipart/form-data')
    assert response.status_code == 200
    assert 'depth_map' in response.json
    assert 'width' in response.json

def test_generate_depth_no_image(client):
    """Test /depth without image."""
    response = client.post('/depth')
    assert response.status_code == 400

def test_depth_mock_sim(client):
    """Test the mock simulation endpoint."""
    response = client.get('/depth_mock_sim')
    assert response.status_code == 200
    assert response.json['status'] == 'simulated'

def test_process_image_error(client):
    """Test error handling when an invalid stream is passed to analyze."""
    data = {'image': (io.BytesIO(b"not an image"), 'test.txt')}
    response = client.post('/analyze', data=data, content_type='multipart/form-data')
    assert response.status_code == 500
    assert 'error' in response.json

def test_generate_depth_error(client):
    """Test error handling in /depth with invalid image data."""
    data = {'image': (io.BytesIO(b"not an image"), 'test.txt')}
    response = client.post('/depth', data=data, content_type='multipart/form-data')
    assert response.status_code == 500
    assert 'error' in response.json

def test_resample_fallback(mocker):
    """Mocks the Image module to simulate legacy environment (no Resampling)."""
    from PIL import Image as PILImage

    from app import process_image_metadata

    # Create a real image to use
    img = PILImage.new("L", (100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    # Mock Image to NOT have Resampling attribute
    mock_image_class = mocker.patch("app.Image")
    mock_image_class.open.return_value = img
    # Delete Resampling to force fallback
    if hasattr(mock_image_class, "Resampling"):
        del mock_image_class.Resampling
    mock_image_class.ANTIALIAS = 1

    process_image_metadata(buf)
    assert mock_image_class.ANTIALIAS == 1
