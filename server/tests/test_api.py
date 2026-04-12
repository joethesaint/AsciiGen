import pytest
import io
import json

def test_status_endpoint(client):
    """Test the /status endpoint using the test client."""
    response = client.get('/status')
    assert response.status_code == 200
    assert response.json['status'] == 'active'

def test_analyze_endpoint(client, test_image):
    """Test the /analyze POST endpoint with a real image file stream."""
    data = {
        'image': (test_image, 'test.jpg')
    }
    response = client.post('/analyze', data=data, content_type='multipart/form-data')
    
    assert response.status_code == 200
    json_data = response.json
    assert 'weight_map' in json_data
    assert json_data['width'] == 50
    assert json_data['height'] == 50

def test_analyze_endpoint_zoom(client, test_image):
    """Test /analyze with the new zoom parameter."""
    data = {'image': (test_image, 'test.jpg')}
    response = client.post('/analyze?zoom=2.0', data=data, content_type='multipart/form-data')
    
    assert response.status_code == 200
    assert response.json['zoom_applied'] == 2.0

def test_analyze_no_image(client):
    """Test /analyze without an image upload."""
    response = client.post('/analyze')
    assert response.status_code == 400
    assert 'error' in response.json
