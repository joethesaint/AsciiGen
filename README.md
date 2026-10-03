# AsciiGen · PointGen

Turn an image or a 3D model (GLB) into **live ASCII art** or a **GPU particle cloud**,
right in the browser.

**Live:** https://joethesaint.github.io/AsciiGen/

## What it does

- **ASCII mode:** the scene is drawn as a true character grid that stays ASCII from any
  camera angle. Glyph ramps are ordered by measured ink coverage. Mono or source colour,
  optional edge glyphs `/ | \ -`.
- **Particle mode:** up to ~400k particles with real physics on the GPU. They spring
  home, scatter from the cursor, morph between sources, and can leave trails. GLBs are
  sampled evenly over their surface with texture colour; images are sampled toward detail.
- **Safe on any device:** quality (particle count, resolution, cell size) is picked from
  the visitor's hardware, and steps down automatically if the first seconds stutter.
- **Details:** thinking-orb loader in a random state per visit, spring-open Source menu,
  liquid toggles, bottom-sheet controls on phones, images that swing like a pendulum
  between ±90° on auto-orbit.

Everything runs client-side: static files, Three.js from a CDN, no build step.

## Run locally

```bash
cd web_interface
python -m http.server 8765        # then open http://localhost:8765
node --test tests/engine.test.js tests/device.test.js
```

Pushing to `stable-pointgen-3d` (or `main`) runs the tests and deploys `web_interface/`
to GitHub Pages.

## Repository

| Path | What |
|---|---|
| [`web_interface/`](./web_interface/) | The app (engine, components, tests) |
| [`docs/AGENTS.md`](./docs/AGENTS.md) | **Start here if you are an agent or a new contributor**: architecture, rules learned from bugs, environment gotchas |
| [`docs/POSITIONING.md`](./docs/POSITIONING.md), [`docs/BACKEND.md`](./docs/BACKEND.md) | How we differ from ASCII Magic; when (and how) to add a backend |
| [`docs/ideas/`](./docs/ideas/README.md) | Parked ideas with plans: dither ASCII, GIF export, formula particles, image→3D / Polyfork |
| [`legacy/`](./legacy/) | Earlier engines, kept for reference |
| [`server/`](./server/), [`smart_ascii/`](./smart_ascii/) | Python backend and CLI tool (not used by the current web page) |

## Credits

- [Three.js](https://threejs.org) (MIT)
- Liquid toggle: ported from [Bencho](https://bencho.dev) (MIT)
- Loader: Orb by [Libraries.dev](https://libraries.dev/orbs) (`thinking-orbs`, MIT © Jakub Antalik)
