# PointGen: High-Performance Pointillism Engine

Implementation log for the Interactive ASCII/Pointillism hybrid engine.

## Phase 1: Pure p5.js Port (Completed)
- Ported conversion logic from Python to client-side JS.
- Implemented basic particle grid.
- Fixed browser CORS issues via procedural heart generation.

## Phase 2: Creative Coding & Interactivity (Completed)
- Added 'Explode' and 'Drift' physics.
- Implemented aspect-ratio perfect scaling (Removed 0.45 text distortion).
- Integrated Color Mapping for particles.

## Phase 3: Performance Overhaul & Modern UI (Completed)
- Overhauled UI with Glassmorphism pill selector.
- Implemented Texture Caching for high-speed rendering.
- **Pivot to Pointillism**: Switched from heavy `text()` characters to lightweight `ellipse` dots, drastically improving compute speed.

## Phase 4: Python Hybrid Intelligence (Active)
- **Status**: Backend Implemented (TDD/PEP8).
- **Feature**: Flask server calculates an edge-weight map to guide particle density.
- **Dependency**: Requires `pip install -r server/requirements.txt`.

## How to Run
1. **Frontend**: Open `web_interface/index.html` in any browser.
2. **Intelligence Backend**:
   - `pip install -r server/requirements.txt`
   - `python server/app.py`
   - Engine will auto-detect the server and enable "Smart Detection" for uploads.
