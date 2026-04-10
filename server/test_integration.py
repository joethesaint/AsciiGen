import unittest
import requests
import os
import io
from PIL import Image

class TestIPYIntegration(unittest.TestCase):
    """
    Integration Test for the Flask API vs Real Requests.
    Ensures the /analyze endpoint actually receives and processes images.
    """
    
    BASE_URL = "http://127.0.0.1:5000"

    def setUp(self):
        # Create a real test image
        img = Image.new('RGB', (50, 50), color='red')
        self.img_bytes = io.BytesIO()
        img.save(self.img_bytes, format='JPEG')
        self.img_bytes.seek(0)

    def test_server_up(self):
        """Test if the server root is reachable."""
        try:
            response = requests.get(self.BASE_URL)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['status'], 'active')
            print("✅ Server is UP and healthy")
        except Exception as e:
            self.fail(f"Server is not running at {self.BASE_URL}. Start it with 'python server/app.py'")

    def test_analyze_endpoint(self):
        """Test the /analyze POST endpoint with a real image file."""
        files = {'image': ('test.jpg', self.img_bytes, 'image/jpeg')}
        response = requests.post(f"{self.BASE_URL}/analyze", files=files)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('weight_map', data)
        self.assertEqual(data['width'], 50)
        print("✅ /analyze endpoint is working perfectly")

if __name__ == '__main__':
    unittest.main()
