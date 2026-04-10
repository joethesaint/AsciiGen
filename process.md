# PointGen: High-Performance Pointillism Engine

Implementation log for the Interactive ASCII/Pointillism hybrid engine.

## Phase 1-3: Core Development
- Ported conversion logic to p5.js.
- Implemented Texture Caching for high-speed local physics.
- Overhauled UI with Glassmorphism pill selector.

## Phase 4: Hybrid Intelligence & Refinement (Current)
- **Pointism Set**: Switched to the specific character set: `"  .·:∵∴∷•"` behaviorally rendered as dots.
- **Visuals**: Removed motion trails for maximum clarity and sharpness.
- **Python Integration**: Flask server (PEP8/TDD) provides a Detail Weight Map to the frontend.

## Installation / Running
1. **Enable Virtual Environment**:
   ```powershell
   source .venv/Scripts/activate
   ```
2. **Install Requirements**:
   ```powershell
   pip install -r server/requirements.txt
   ```
3. **Run Smart Backend**:
   ```powershell
   python server/app.py
   ```
4. **Open Frontend**: Open `web_interface/index.html` in any browser.
