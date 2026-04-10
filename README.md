# ASCII Image Generator Suite

This project contains various utilities and tools to convert common image files into highly customizable ASCII art, featuring refined Pointillism aesthetics, colored terminals, and logic optimized natively for rendering inside GitHub Profile `README.md` files in dark mode.

## Project Structure
To comprehensively explain functionalities, the project has been structured into distinct modules with their own dedicated documentation boundaries:

- [**basic_ascii/**](./basic_ascii/README.md): A simple standard pipeline demonstrating fundamental image pixel translation techniques.
- [**github_ascii/**](./github_ascii/README.md): The layout tweaked explicitly for generating 54-char pointillism renderings matching dark mode GitHub profiles perfectly.
- [**smart_ascii/**](./smart_ascii/README.md): The most robust module containing automated aspect scaling, configuration mappings (`config.yaml`), terminal styling, and unit test suites.

## Quick Start
1. **Activate the Environment**:
   ```powershell
   .\.venv\Scripts\activate
   ```
2. Navigate to your desired variant directory listed above, refer to its local `README.md`, and execute the relevant `.py` file passing in your image path!

Enjoy making cool art!
