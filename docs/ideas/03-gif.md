# 03 · GIF: export, the palette-dither look, and GIF input

**Status:** Parked · **Size:** M

## Reference

@hectoroz_, "me vs everybody" — https://x.com/hectoroz_/status/2106027417576071486

A posted GIF: an armoured figure under a black sun, in a **small palette** (deep red,
blue, gold, near-black, white) with a **dithered, noisy texture** everywhere. Flat regions
become shimmering fields of colour specks, and swirling patterns read as motion. It's
the look a GIF produces when an image is squeezed into a limited palette with dithering,
used deliberately as the style.

## Three separate things

### A. Export what the engine draws as a GIF

- The canvas already keeps its last frame (`preserveDrawingBuffer: true`), so frames can
  be read with `drawImage` / `getImageData`.
- Encode with **gifenc** (MIT, tiny, fast; quantise + palette + encode) in a **Web Worker**,
  so the page keeps animating.
- Make loops seamless: export exactly one period. The image pendulum swing (one full swing),
  a vortex turn, or a fixed 2–6 s.
- Options: width 480/640/800, 15–25 fps, duration. Show the estimated size before encoding.
- Offer **WebM/MP4** through `canvas.captureStream()` + `MediaRecorder` as well. It's far
  smaller and sharper, while GIF is what people post.
- Deployment check: downloads must work on GitHub Pages (they do; only the claude.ai artifact
  sandbox blocks downloads).

### B. The palette-dither look as a render mode

Builds directly on idea 02. Quantise each cell (or each pixel, for a non-ASCII mode) to
an N-colour palette with Bayer or blue-noise dither. Palettes: "Ember" (the reference's
red/blue/gold), mono, Game Boy green, CGA. That reproduces the reference natively, and
those frames compress very well as GIF, because the palette is already small.

### C. Animated GIFs as a source

Decode frames with `ImageDecoder` (Chromium) or **gifuct-js** (all browsers) and feed each
frame to the image source as a texture. The ASCII pass then animates for free; particles
could re-home every N frames (they already morph between sources).

## Done when

- "Export GIF" produces a looping GIF under ~8 MB at 640 px / 20 fps / 4 s, without freezing
  the page.
- The palette-dither mode with the "Ember" palette is recognisably the reference style on the
  bust.
- Dropping an animated GIF in plays it as ASCII.
