# ASCII Image Generator

This tool converts images into highly customizable ASCII art, featuring a refined **Pointillism** style optimized for your GitHub Profile README (dark mode). 

## Features

- **Multiple Styles**: Supports standard ASCII, reversed strings, and the *Pointillism* aesthetic (`pointism`).
- **Configurable**: Easily change resolutions, toggle color maps, and set custom aspects via `config.yaml`.
- **GitHub Optimized**: The Pointillism style uses negative space and precise dot scatters (`•∴∵·: `) to flawlessly pop out on dark backgrounds.
- **Smart Sizing**: Automatic aspect ratio matching depending on target width.

## Project Structure

- `imp_ascii.py`: **Main script** to run for advanced, configurable ASCII conversions.
- `github_ascii.py`: **The GitHub Version** - automatically generates art precisely sized for profile READMEs (54 chars width) using the pointillism style.
- `ascii_gen.py`: A simple/basic standard python script.
- `config.yaml`: The central configuration file for `imp_ascii.py`.

## Quick Start

1. **Activate the Environment (if applicable)**:
   ```powershell
   .\.venv\Scripts\activate
   ```
2. **Setup your Configuration**: 
   Open `config.yaml` to ensure your `char_set` under `github` or `output` is set up properly.
   *Tip: Use `"pointism"` for dark background aesthetics!*

3. **Convert your Image**:
   For the **standard configurable version**, run the main script:
   ```powershell
   python imp_ascii.py silver.jpg
   ```
   
   For the **GitHub Version** (perfectly sized for your profile README at 54-wide):
   ```powershell
   python github_ascii.py silver.jpg profile_output.txt
   ```

4. **Result**:
   Check `output.txt` and copy/paste it into your GitHub Profile `README.md` inside markdown code blocks:
   ```text
   ```text
   [Paste ASCII Art Here]
   ```
   ```

## Status

This project is under active development. Keep breaking boundaries and making cool art!
