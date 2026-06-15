import os
import sys
from PIL import Image
import io

# Add parent dir to path to import imp_ascii
sys.path.insert(0, os.path.join(os.getcwd(), 'smart_ascii'))
import imp_ascii

# Force UTF-8 for console output to handle Unicode characters (e.g. Pointillism)
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def verify_char_sets():
    # Create a small gradient image
    img = Image.new('L', (100, 10))
    for x in range(100):
        for y in range(10):
            img.putpixel((x, y), int(x / 100 * 255))
    
    # Save dummy image
    img_path = "gradient_test.jpg"
    img.save(img_path)
    
    print("Verifying Character Sets:\n")
    sets = ['default', 'reverse', 'pointism', 'detailed']
    
    for char_set in sets:
        art = imp_ascii.smart_convert(img_path, target_width=50, char_set=char_set)
        # Just take the first line to show variety
        sample = art.split('\n')[0]
        print(f"[{char_set.upper():<10}] Example output (gradient):")
        print(f" {sample}")
        print("-" * 60)
    
    if os.path.exists(img_path):
        os.remove(img_path)

if __name__ == "__main__":
    verify_char_sets()
