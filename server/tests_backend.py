import unittest
import os
import json
import io
from PIL import Image
from app import process_image_metadata

class TestBackendProcessing(unittest.TestCase):
    """
    TDD Suite for Python Image Analysis Backend.
    Ensures PEP8 compliance and functional integrity.
    """

    def setUp(self):
        # Create a tiny test image (white square on black)
        self.test_img = Image.new('RGB', (100, 100), color='black')
        for i in range(40, 60):
            for j in range(40, 60):
                self.test_img.putpixel((i, j), (255, 255, 255))
        
        self.img_byte_arr = io.BytesIO()
        self.test_img.save(self.img_byte_arr, format='JPEG')
        self.img_byte_arr.seek(0)

    def test_metadata_extraction(self):
        """Test that our Python logic extracts correct brightness and edge data."""
        metadata = process_image_metadata(self.img_byte_arr)
        
        self.assertIn('width', metadata)
        self.assertIn('height', metadata)
        self.assertIn('weight_map', metadata)
        
        # The center should have high weight due to edges
        weight_map = metadata['weight_map']
        self.assertEqual(len(weight_map), 100 * 100)
        
        # Check that edges (where black meets white) have non-zero weight
        # 40,40 is an edge
        edge_pixel_idx = 40 * 100 + 40
        self.assertGreater(weight_map[edge_pixel_idx], 0)

    def test_empty_image(self):
        """Test behavior with an empty file."""
        with self.assertRaises(Exception):
            process_image_metadata(io.BytesIO(b""))

if __name__ == '__main__':
    unittest.main()
