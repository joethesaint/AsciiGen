# 04 · Image → 3D, or Polyfork models

**Status:** Polyfork step 1 shipped (2026-10-04): the free "Brass Service Bell" is in the Source menu, hotlinked from `https://polyfork.dev/cdn/brass-service-bell-5677fb.glb` (CORS `*`). Terms checked: use allowed, no attribution required, **no redistribution**, so never commit Polyfork files. Live knobs (`.mjs` `createAsset()`) are **Pro only** ($149/yr); free assets get remote "remix bakes" (40/hour anonymously). Image-to-3D still parked. · **Size:** S for Polyfork, L for local image-to-3D

## A. image-to-3dlab (@Stefan_3D_AI)

- Post: https://x.com/Stefan_3D_AI/status/2105539826636521603
- Repo: https://github.com/Bingeljell/image-to-3dlab (code **Apache-2.0**)

What it does: one picture in, a **textured `.glb`** out, on your own machine. It runs
Pixal3D, TRELLIS.2, Hunyuan3D or SF3D behind one web UI and a CLI. Its "Pixel Match"
step copies the source picture's real pixels back onto the model, so text and logos stay
readable even after the mesh is cut to ~5k faces. Its "Finish" step shrinks a ~30 MB
result into a game-size file. The post shows ~3 min on an RTX 3090 Ti.

### Can we use it?

- **Not inside the web page.** It needs an NVIDIA GPU (Linux) or Apple Silicon, multi-GB model
  weights, and minutes per model. A static GitHub Pages site can't run it, and visitors'
  devices can't either.
- **Yes, as an offline tool.** Generate GLBs on a capable machine, then use them as sources:
  drop them in `web_interface/images/` as samples, or upload them in the app (GLB loading
  already works, and low face counts sample well into particles).
- **Licences differ per model weight.** The repo records which licence applies to each result.
  Its README flags Qwen-Image's licence as unclear for commercial use. Check each GLB's
  record before publishing it on the portfolio.
- This PC's GPU hasn't been confirmed; headless CPU rendering struggled here. Check the
  installer's machine report before planning to generate locally.

## B. Polyfork (the browser-native alternative)

- Product Hunt: https://www.producthunt.com/products/polyfork

A library of **low-poly 3D assets shipped as small programs** rather than frozen meshes:
turn a knob (size, colour, variant) and the model rebuilds itself. About 326 assets (132
free), delivered as **GLB or ES modules**, with three.js and React Three Fiber support, an
API and an MCP server.

Why it fits better for the live site:

- **GLB today:** any Polyfork GLB loads through our existing GLB path with no code change.
- **Knobs → sidebar:** an ES-module asset exposes parameters. Surface them as sliders; on
  change, rebuild the mesh and call `particles.setData(...)`. The particles already **morph**
  smoothly to the new shape, which is a strong demo: drag a knob and watch the cloud reshape.
- **Low poly suits both modes:** clean flat faces give crisp ASCII shading, and even surface
  sampling for particles.

Before bundling: read Polyfork's licence for the free tier, especially redistribution in a
public repo and on GitHub Pages. If it only allows use in projects, load assets from their
CDN/API at runtime instead of committing them.

## Recommendation

1. **Polyfork first**: a free GLB as a third sample, then one ES-module asset with live knobs.
2. **image-to-3dlab** as an offline asset pipeline for portfolio pieces (e.g. a portrait turned
   into a bust, shown as ASCII), with each asset's licence record kept next to it.

## Done when

- A Polyfork asset is selectable from the Source menu, and its knobs morph the particles live.
- At least one image-to-3dlab GLB is shipped with its licence record in the repo.
