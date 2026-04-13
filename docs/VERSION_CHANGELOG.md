# AsciiGen v4.0 - Architectural Limestone Update

### Major Improvements
- **Design Overhaul**: Implemented "Weight-Based Design Language" featuring Architectural Limestone ink transitions and Matte Obsidian backgrounds.
- **Visual Weight Re-balancing**: Tertiary accents (High-weight Vermilion) now highlight critical interactive elements.
- **Glassmorphism v2**: Refined sidebar backgrounds with a 40px blur, 0.4 opacity, and a 135-degree subtle gradient.
- **Surgical Slider Alignment**: Resolved thumb centering issues by switching to SVG `dominant-baseline: central`, ensuring perfect parallax-free interaction.
- **Interactive Cleanup**: Slider tracks are now transparent, allowing the high-weight asterisk thumb to do the heavy lifting.

### Repository Reorganization
- **`legacy/`**: Archived older 1D and specialized pointillism tools.
- **`scripts/`**: Moved development utility scripts and bat files.
- **`docs/`**: Centralized process documentation, historical logs, and performance data.
- **`README.md`**: Fully rewritten for the v4.0 architecture.

### Quality Assurance (TDD)
- Added new automated tests in `tests.js` to ensure visual alignment and transparency of the slider component.
- All suites pass in the developmental environment.
