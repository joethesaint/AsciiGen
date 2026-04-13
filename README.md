# ASCII Art & Volumetric Pointillism Suite (v4.0)

A high-performance creative coding suite that transforms static media into interactive 3D architectural limestone volumes. This version implements a Weight-Based design philosophy with surgical alignment of interactive elements.

## 🏛 Flagship: PointGen (Architectural Rigor)
Located in [`web_interface/`](./web_interface/), PointGen has transitioned into an **Architectural Point Cloud** engine.

### Design Principles (Weight-Based)
- **Neutral (Matte Obsidian)**: The primary canvas (`#0a0b0c`) provides a non-distractive depth.
- **Primary (Architectural Limestone)**: All UI "Ink" is rendered in high-definition limestone tones (`#e6e6dc`).
- **Tertiary (High-weight Vermilion)**: High-weight accents (`#ff3e00`) highlight the loudest interaction points.
- **Glassmorphism**: UI containers feature 40px frosted blur with 0.4 opacity, maintaining a disciplined 4px corner radius.

### Technical Innovations
- **Surgical Centering**: Slider thumbs (asterisks) are perfectly bisected using `dominant-baseline: central` for zero-parallax interaction.
- **Orbital Controls**: Full 3D camera navigation (Drag to Rotate, Scroll to Zoom).
- **Ink-Only Layout**: Slider tracks are transparent, with the high-weight asterisk doing the heavy lifting.

## 🛠 Project Structure
Organized for clarity and rapid development:

- **[`web_interface/`](./web_interface/)**: The Orbital Architectural Engine (Three.js/GLSL).
- **[`server/`](./server/)**: Python Flask Hub for 3D Depth extraction and metadata analysis.
- **[`smart_ascii/`](./smart_ascii/README.md)**: Pro configuration-driven ASCII tool.
- **[`legacy/`](./legacy/)**: Archived 1D and specialized pointillism tools.
- **[`docs/`](./docs/)**: Process documentation and historical output logs.

## 🔌 Getting Started
1. **Launch the Intelligence Hub**:
   ```powershell
   .\.venv\Scripts\python.exe server/app.py
   ```
2. **Launch the Engine**:
   Open `http://127.0.0.1:5000/` in any modern browser.
3. **Explore**:
   The engine will **autoload** the default image and build a 3D limestone cloud.

## 🧪 Quality Assurance (TDD)
- **Frontend TDD**: The `AsciiTests` suite (in `tests.js`) validates:
  - Surgical Slider Centering (`y=12` central baseline check).
  - Ink-only transparency health.
  - 3D Orbital & Shader integrity.

Enjoy the limestone nebula!
