# PointGen: Kinetic Pointillism Engine

**PointGen** is the high-performance visualization flagship of the ASCII suite. It leverages WebGL (Three.js) to create an interactive, responsive kinetic experience using dot-character sets.

## ✨ Core Technology
- **Engine**: Three.js (WebGL).
- **Shaders**: Custom GLSL Vertex/Fragment shaders for character sprite instancing.
- **Physics**: Real-time $O(N)$ interaction loop with squared-distance optimizations.
- **Backend Hub**: Connects via Flask to perform smart structural analysis.

## 🎨 Creative Features
- **Cinematic Bloom**: Additive blending for light-stacking effects.
- **Saturation Boosting**: Custom 1.4x saturation matrix in the GPU for punchy colors.
- **Perceptual Luminance**: Detail detection mapping based on human eye sensitivity ($0.2126R + 0.7152G + 0.0722B$).
- **Smart Density**: Variable particle count based on Python-assisted structural edge mapping.

## 🕹 Controls
- **Origin**: Particles return to their starting grid positions.
- **Drift**: Particles float freely with subtle physics.
- **Explode**: Particles flee with high acceleration on interaction.
- **Vortex**: Particles orbit the mouse cursor in a fluid swirl.
- **Interaction Sensitivity**: Controls the effective range of the mouse repulsion.
- **Particle Density**: Adjusts the resolution of the pointillism grid (GPU-optimized).

## 🧪 Integration Tests
The `tests.js` file runs a real-time TDD suite in the browser console.
- **Latency Benchmark**: Ensures image-to-point translation is <150ms.
- **Performance Profile**: Verified targets of 60 FPS under high density.
- **Connectivity**: Automated health reporting for the Python backend.
