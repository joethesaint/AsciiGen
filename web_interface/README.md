# PointGen: Volumetric Orbital Engine

**PointGen** is the high-performance visualization flagship of the ASCII suite. In its current **Experimental** state, it has transitioned from a 2D plane to a **True 3D Volumetric Cloud**.

## ✨ High-End Evolution
- **Engine**: Three.js (WebGL) Point Cloud.
- **Navigation**: Full Orbital 3D controls (OrbitControls.js).
- **Shader**: Custom GLSL Vertex/Fragment pipeline with Liquid Displacement.
- **Autoload**: Autonomous sideloading of local assets via the Python Hub.

## 🎨 Volumetric Features
- **The 3D "Poke"**: A liquid displacement logic where the 3D surface physically bulges toward your cursor.
- **Color Overdrive (2.5x)**: Tuned for extreme vibrancy against black backgrounds.
- **Deep Relief**: Increased Z-scale for dramatic sculptural effect.
- **Kinetic Drift**: GPU-accelerated "breathing" and "wobble" effects on the 3D grid.

## 🧪 TDD Suite
The `tests.js` file now includes specific checks for:
- **Orbital Health**: Verifies camera control matrices.
- **Interaction Health**: Measures mouse-to-GPU coordinate delta.
- **Cloud Integrity**: Ensures 3D depth buffers are active and populated.

## 🕹 Controls
- **Click & Drag**: Rotate the 3D cloud.
- **Scroll**: Zoom in/out of the volume.
- **Density Slider**: Adjusts character size for visual clarity.
- **Mode Buttons**: Toggle between static Grid, organic Drift, and chaotic Vortex.
