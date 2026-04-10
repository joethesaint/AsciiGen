# Smart/Advanced ASCII

The most robust and heavily configurable ASCII tool in the project suite. It leverages a yaml-based config logic, unit testing, automated styling, and intelligent aspect locks.

## Features
- Dynamic loading from `config.yaml` to specify target resolution, high-quality Lanczos resizing algorithms, and custom boundaries.
- Support for `smart_convert` mapping functionality for precise scaling controls.
- **Color Outputs:** Enables applying ANSI 24-bit TrueColor to match original images directly against standard ASCII character intensities inside your terminal console.
- Verified test coverage suite (`tests/`).

## Files
- `imp_ascii.py` (Script Entry Point)
- `config.yaml` (Configurations mapping)
- `tests/` (Pytest module suite for QA verification)

## Usage

1. Configure your preferences directly inside `config.yaml`.
2. Execute the file pointing to your intended target images:
```powershell
python imp_ascii.py <image.jpg>
```
Note: Depending on configuration properties inside `config.yaml`, outputs are natively printed to your console with coloring applied and also flushed permanently to a file `output*.txt`.
