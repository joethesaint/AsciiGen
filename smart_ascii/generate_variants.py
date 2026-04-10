import os
import imp_ascii

def generate_all_variants():
    # Resolve path abstractly avoiding CWD relative failure
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    image_path = os.path.join(base_dir, 'images', 'silver.jpg')
    
    examples_dir = os.path.join(os.path.dirname(__file__), 'examples')
    
    # 1. Base Charsets
    char_sets = ['default', 'reverse', 'pointism', 'detailed']
    from PIL import Image
    test_img = Image.open(image_path)
    # Remove the forced hardcoded vertical skew since standard scaling now
    # mathematically copies exact length & breadth based purely on width constraints!
    # Or, if an exact scale is needed, we could use scale=1.5. Instead, we'll
    # just specify width=240, and the new internal TDD engine will scale height automatically.
    
    for cs in char_sets:
        out_dir = os.path.join(examples_dir, f'charset_{cs}')
        os.makedirs(out_dir, exist_ok=True)
        
        # smart_convert handles proportional scaling safely
        art = imp_ascii.smart_convert(image_path, target_width=240, char_set=cs)
        with open(os.path.join(out_dir, 'output.txt'), 'w', encoding='utf-8') as f:
            f.write(art)

            
    # 2. Config Feature: Borders
    out_dir = os.path.join(examples_dir, 'feature_borders')
    os.makedirs(out_dir, exist_ok=True)
    
    # Enable borders temporarily
    orig_borders = imp_ascii.config['features']['borders']
    imp_ascii.config['features']['borders'] = True
    imp_ascii.config['features']['border_char'] = "#"
    
    art = imp_ascii.smart_convert(image_path, target_width=240, char_set='default')
    art_bordered = imp_ascii.add_borders(art)
    
    with open(os.path.join(out_dir, 'output.txt'), 'w', encoding='utf-8') as f:
        f.write(art_bordered)
        
    imp_ascii.config['features']['borders'] = orig_borders
    
    print(f"Generated all examples inside {examples_dir}/")

if __name__ == "__main__":
    generate_all_variants()
