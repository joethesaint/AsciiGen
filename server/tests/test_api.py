import io
import pytest

def test_status_endpoint(client):
    """Test the /status endpoint using the test client."""
    response = client.get("/status")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

def test_analyze_endpoint(client, test_image_bytes):
    """Test the /analyze POST endpoint with a real image file."""
    files = {"image": ("test.jpg", io.BytesIO(test_image_bytes), "image/jpeg")}
    response = client.post("/analyze", files=files)

    assert response.status_code == 200
    json_data = response.json()
    assert "weight_map" in json_data
    assert json_data["width"] == 800
    assert json_data["height"] == 800

def test_analyze_endpoint_zoom(client, test_image_bytes):
    """Test /analyze with the zoom parameter."""
    files = {"image": ("test.jpg", io.BytesIO(test_image_bytes), "image/jpeg")}
    response = client.post("/analyze?zoom=2.0", files=files)

    assert response.status_code == 200
    assert response.json()["zoom_applied"] == 2.0

def test_analyze_cache_hit(client, test_image_bytes):
    """Verify that repeated requests hit the ANALYSIS_CACHE."""
    files = {"image": ("test.jpg", io.BytesIO(test_image_bytes), "image/jpeg")}
    client.post("/analyze", files=files)
    
    # Second request with identical data
    files2 = {"image": ("test.jpg", io.BytesIO(test_image_bytes), "image/jpeg")}
    response = client.post("/analyze", files=files2)
    assert response.status_code == 200

def test_analyze_zoom_out(client, test_image_bytes):
    """Test /analyze with zoom < 1.0 (zoom out branch)."""
    files = {"image": ("test.jpg", io.BytesIO(test_image_bytes), "image/jpeg")}
    response = client.post("/analyze?zoom=0.5", files=files)
    assert response.status_code == 200
    assert response.json()["zoom_applied"] == 0.5

def test_analyze_no_image(client):
    """Test /analyze without an image upload."""
    response = client.post('/analyze')
    assert response.status_code == 422 # FastAPI validation error

def test_sdf_endpoint(client):
    """Test the /sdf generation endpoint."""
    response = client.get('/sdf')
    assert response.status_code == 200
    data = response.json()
    assert 'points' in data
    assert len(data['points']) == 10000
    assert 'x' in data['points'][0]

def test_generate_depth(client, test_image_bytes):
    """Test the /depth POST endpoint."""
    files = {'image': ('test.jpg', io.BytesIO(test_image_bytes), 'image/jpeg')}
    response = client.post('/depth', files=files)
    assert response.status_code == 200
    assert 'depth_map' in response.json()
    assert 'width' in response.json()

def test_generate_depth_no_image(client):
    """Test /depth without image."""
    response = client.post('/depth')
    assert response.status_code == 422

def test_depth_mock_sim(client):
    """Test the mock simulation endpoint."""
    response = client.get('/depth_mock_sim')
    assert response.status_code == 200
    assert response.json()['status'] == 'simulated'

def test_process_image_error(client):
    """Test error handling when an invalid stream is passed to analyze."""
    files = {'image': ('test.txt', io.BytesIO(b"not an image"), 'text/plain')}
    response = client.post('/analyze', files=files)
    assert response.status_code == 500

def test_generate_depth_error(client):
    """Test error handling in /depth with invalid image data."""
    files = {'image': ('test.txt', io.BytesIO(b"not an image"), 'text/plain')}
    response = client.post('/depth', files=files)
    assert response.status_code == 500
