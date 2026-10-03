# Positioning: ASCII Magic and how PointGen stands apart

Reviewed 2026-10-04: https://www.ascii-magic.com/app

## What ASCII Magic is

A broad **2D image-and-video filter studio**: 100+ styles in categories (ASCII & Text,
Pixel & Blocks, Print & Paper, Geometric, Distort, Blur, Glitch, Light & Colour, Glass,
Material), 17 character sets (Classic, Blocks, Quadrants, Braille, Binary, Katakana,
Math, …), webcam/realtime, backdrop options (blurred image, black, original,
transparent), blend modes, character opacity, "Randomize characters", **Recipes**
(saved presets), **Shuffle/Inspire**, a library, export, and a Pro tier.

## The difference

| | ASCII Magic | PointGen |
|---|---|---|
| Input | Images, video, webcam | Images **and 3D models (GLB)**, Polyfork assets |
| Space | Flat 2D filter over a picture | **3D**: orbit any angle; the character grid holds from every view |
| Motion | Filter applied per frame | **GPU particle physics**: spring home, fling with the cursor, morph between sources, trails |
| Breadth | 100+ styles | Two deep renderers + generative formula studies |
| Runs | Their web app, Pro tier | Free, open source, entirely on the visitor's device, quality tuned to the hardware |

They win on **breadth**. We win on **depth, space and motion**. Don't try to out-catalogue
them.

## Worth adopting (small, high-value)

1. **More character sets:** Braille (2×4 dots per cell, roughly 8× the detail), Quadrants
   (▖▗▘▝…), Binary, Katakana. Braille plus shape matching (see `ideas/02`) is a big
   jump in detail.
2. **Backdrop options:** solid, the blurred source, transparent (for export).
3. **Character opacity and blend modes** for layering ASCII over the source.
4. **Recipes:** name and save a full config, and share it as a short link.
5. **Shuffle:** one button that picks a random tasteful preset. It suits the random orb loader.
6. **Export:** PNG now; GIF/WebM per `ideas/03`.
7. **Webcam source:** cheap with our pipeline (video texture → ASCII pass), and great for a
   portfolio demo.

## How we stand out

- **"ASCII you can walk around."** 3D models as ASCII, orbitable, with edge glyphs that
  follow real geometry. Nobody in the 2D-filter space does this.
- **Physical particles.** Touch it and it reacts: fling, spring, morph from one object into
  another. Lead with the morph in demos.
- **Generative studies.** The formula page makes it an art piece, not just a tool.
- **Dither done properly** (`ideas/02`): ordered dither + shape-matched glyphs + Braille at
  the quality of the praveenisomer cards, and in 3D.
- **Craft and openness.** Free, runs on your device, adapts to weak hardware, open source
  with documented reasoning.

Tagline candidate: *"ASCII art you can orbit, touch and reshape."*
