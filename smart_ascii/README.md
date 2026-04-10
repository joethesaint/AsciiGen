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
Note: Depending on configuration properties inside `config.yaml`, outputs are natively printed to your console with coloring applied and safely saved in the local `outputs/` directory.

## Character Sets
You can completely change the visual composition of your art by altering the `char_set` property inside `config.yaml`. Supported sets include:
- `"default"`: Standard thick ASCII progression (`@%#*+=-:. `), perfect for rendering dark text on light backgrounds.
- `"reverse"`: The inverse of default (` .:-=+*#%@`), perfect for displaying bright shapes onto a dark terminal block.
- `"pointism"`: A heavily specialized scattering layout (`  .·:∵∴∷•`) using dot matrices heavily optimized for styling over dark-mode environments (like GitHub).
- `"detailed"`: An extensive mapping leveraging 70 unique characters for massive high-resolution conversions.

## Examples

Because `imp_ascii.py` strictly relies on configuration states, its true power comes from mixing CLI commands with `config.yaml` states.

### 1. The Standard Run
**Command:** 
```powershell
python imp_ascii.py ../images/heart.jpg
```
**What it does:** Reads `config.yaml` defaults (like `width: 360`), converts `heart.jpg`, prints the result to your terminal, and safely saves a copy locally into `outputs/output.txt`.

### 2. Batch Processing Multiple Images
**Command:** 
```powershell
python imp_ascii.py ../images/heart.jpg ../images/silver.jpg ../images/blonde.jpg
```
**What it does:** The script automatically loops through every passed image sequentially. Instead of overwriting a single file, it dynamically saves them as `output_1.txt`, `output_2.txt`, etc., within the `outputs/` folder.

### 3. Rendering Colored ASCII
**Config Step:** Set `color: true` in `features` inside `config.yaml`.
**Command:** 
```powershell
python imp_ascii.py ../images/surfer.jpg
```
**What it does:** Injects TrueColor 24-bit ANSI styling onto every single ASCII character. The output printed into your terminal will graphically match the tones and colors of the original image pixel for pixel.

### 4. Adding Decorative Borders
**Config Step:** Set `borders: true` and `border_char: "#"` in `features` inside `config.yaml`.
**Command:** 
```powershell
python imp_ascii.py ../images/stamp.jpg
```
**What it does:** Wraps your finalized ASCII art precisely inside a solid padded bounding box using your specified border character.

### 5. High-Fidelity Detailed Resolutions
**Config Step:** Enable `high_quality: true` in `processing` and change `char_set: "detailed"`.
**Command:** 
```powershell
python imp_ascii.py ../images/trust.jpg
```
**What it does:** Forces the background algorithm to use `Image.LANCZOS` resampling. It maps lighting data against a massive 70-character string array (` .'^",:;Il!i><...`) to produce stunning, micro-detailed gradient transitions instead of stark contrasts!
