# ASCII Art & Volumetric Pointillism Suite

A high-performance creative coding suite that transforms images into structured ASCII and dynamic 3D pointillism. Featuring a GPU-accelerated orbital engine and autonomous Python intelligence.

## 🌌 Flagship: PointGen (Experimental 3D)
Located in [`web_interface/`](./web_interface/), PointGen is now a **Volumetric Point Cloud** engine.
- **True 3D Space**: Individual ASCII characters (dots, fullstops) exist in a 3D volume.
- **Orbital Controls**: Full 3D camera navigation (Drag to Rotate, Scroll to Zoom).
- **Autonomous Sideloading**: Automatically initializes with default assets for a "stress-free" startup.
- **Liquid Physics**: Features a "Liquid Poke" effect where the 3D surface physically reacts to your mouse cursor.
- **Ultra-Vibrant Shader**: Custom GLSL pipeline with 2.5x color overdrive and 100% opacity for cinematic clarity.

## 🛠 Project Modules
The project is structured into specialized modules:

- **[`web_interface/`](./web_interface/)**: The Orbital Volumetric Engine (Three.js).
- **[`server/`](./server/)**: Python Flask Hub for 3D Depth extraction and metadata analysis.
- **[`smart_ascii/`](./smart_ascii/README.md)**: Pro configuration-driven ASCII tool (Borders, 70-char mapping).
- **[`github_ascii/`](./github_ascii/README.md)**: Specialized 54-char pointillism for GitHub dark mode.

## 🔌 Getting Started
1. **Launch the Intelligence Hub**:
   ```powershell
   .\.venv\Scripts\activate
   python server/app.py
   ```
2. **Launch the Engine**:
   Open `http://127.0.0.1:5000/` in any modern browser.
3. **Explore**:
   The engine will **autoload** `silver.jpg` and build a 3D cloud. Click and drag to orbit the relief!

## 🧪 Quality Assurance
The project utilizes a dual-layer TDD approach:
- **Backend**: `python server/test_integration.py` (Verifies Depth & Status API).
- **Frontend**: Check the browser console for the **AsciiTests** suite (Verifies Orbital & Shader health).

Enjoy the nebula!
