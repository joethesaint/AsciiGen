# ASCII Art & Kinetic Pointillism Suite

A high-performance creative coding suite that transforms images into structured ASCII and dynamic pointillism. Featuring a GPU-accelerated web engine and intelligent Python backend assistance.

## 🚀 Flagship: PointGen (The Web Experience)
Located in [`web_interface/`](./web_interface/), PointGen is a high-speed Kinetic Pointillism engine.
- **GPU Acceleration**: Built with Three.js (WebGL) to handle hundreds of thousands of particles at 60 FPS.
- **Intelligent Detail**: Intertwines with a Python Flask backend to perform edge-detection and structural analysis, doubling particle density in areas of high visual complexity.
- **Interactive Modes**: Includes "Flee", "Vortex", "Drift", and "Explode" physics modes for real-time manipulation.
- **Deep Color Engine**: Custom GLSL shaders with perceptual luminance math, saturation boosting, and alpha-masking for vibrant, punchy color reproduction.

## 🛠 Project Modules
The project is structured into specialized modules:

- **[`web_interface/`](./web_interface/)**: The Three.js interactive pointillism engine (PointGen).
- **[`server/`](./server/)**: Flask-based Intelligence Hub for structural image analysis.
- **[`smart_ascii/`](./smart_ascii/README.md)**: Pro configuration-driven ASCII tool (Borders, 70-char mapping, TrueColor).
- **[`github_ascii/`](./github_ascii/README.md)**: Specialized 54-char pointillism for GitHub dark mode.
- **[`basic_ascii/`](./basic_ascii/README.md)**: Fundamental pixel-to-character translation pipeline.

## 🔌 Getting Started
1. **Launch the Intelligence Hub**:
   ```powershell
   .\.venv\Scripts\activate
   python server/app.py
   ```
2. **Launch the Engine**:
   Open [`web_interface/index.html`](./web_interface/index.html) in any modern browser.
3. **Verify Connection**:
   A green indicator in the browser bottom-right confirms the Python AI is connected and active.

## 🧪 Quality Assurance
The project follows TDD patterns. To verify the backend:
```powershell
python server/test_integration.py
```

Enjoy making high-fidelity kinetic art!
