# Basic ASCII Gen

This is the simplest implementation of an image to ASCII art converter. It takes an image, resizes it, converts it to grayscale, and maps the pixel intensities to a predefined set of string characters ` .:-=+*#%@`.

## File
- `ascii_gen.py`

## Usage
```powershell
python ascii_gen.py <image_path> [output_width] [output_file]
```
- `<image_path>`: the input image file you want to use.
- `[output_width]`: optional. Default dimension is 100 characters wide.
- `[output_file]`: optional. Output defaults to `ascii_output.txt`.
