import io
from PIL import Image
from app import process_image_metadata

def benchmark_processing():
    print("Testing image processing metadata...")
    # Create a small dummy image
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    try:
        metadata = process_image_metadata(img_byte_arr)
        print(f"Success! Metadata extracted: Width={metadata['width']}, Height={metadata['height']}, MapSize={len(metadata['weight_map'])}")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    benchmark_processing()
