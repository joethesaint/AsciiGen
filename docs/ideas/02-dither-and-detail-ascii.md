# 02 · Dither and high-detail ASCII

**Status:** Parked · **Size:** M–L

## Reference

@praveenisomer, "Dither and Ascii card explore" — https://x.com/praveenisomer/status/2105983637615526301

Two fintech cards on a white ground:

- **Left, green:** an arrow built from a dense **ordered dither** of `+` and `·` marks. Tone
  comes from mark density and spacing, and the edges break into scattered marks.
- **Right, indigo:** a map shape built from **binary digits `0` and `1`**. Tone comes from each
  glyph's *opacity*, not from which glyph it is, and faint connecting lines show behind it.
- Both use one ink colour on paper, small cells (~6–8 px) and a lot of white space.

## What our engine does today

`engine/ascii-pass.js` averages 5 taps per cell, maps brightness to a ramp of glyphs
ordered by ink coverage, and can swap in line glyphs on strong edges. That gives the
classic look but **visible banding**: a smooth gradient becomes a few flat steps, one per
ramp level.

## Proposed changes, in order

1. **Ordered (Bayer) dithering.** Before picking a glyph, add `(bayer(cell) − 0.5) / levels`
   to the cell's brightness. A 4×4 or 8×8 Bayer matrix indexed by cell position breaks
   the bands into a fine pattern, so 10 glyphs read as many more tones. This is a
   one-uniform change to the shader, plus a "Dither" amount slider (0 = off).
2. **1-bit "Dither" set.** A glyph set of just blank plus one mark (`·`, `+` or a solid
   dot) at small cells (4–6 px). With step 1 this is the left card's look.
3. **Opacity mode.** Keep one or two glyphs (`0`/`1`) and map brightness to the glyph's
   *alpha*. That's the right card. Opacity is continuous, so there's no banding at all.
4. **Ink and paper.** Colour pickers for ink and background (the right card is indigo on
   white). The pass already has `uInk` and `uBg` uniforms; they just need controls.
5. **Shape-matched glyphs (the big detail upgrade).** Today a cell is reduced to one brightness
   value, so a `/` and a `-` with the same ink are interchangeable. Instead, sample the cell
   as a small grid (e.g. 2×3 regions), compare that vector with each glyph's pre-measured
   2×3 ink vector, and pick the nearest. Edges then follow the image's actual shape inside
   the cell. Precompute glyph vectors in `glyphs.js` (it already measures ink).
6. **Error diffusion** (Floyd–Steinberg) gives the richest dither, but it is serial: each cell
   depends on the previous one. Do it on the CPU for still exports only (see idea 03), or
   approximate it on the GPU with a blue-noise texture instead of the Bayer matrix.

## Notes

- Bayer and blue noise must be indexed by **cell**, not by pixel, or the pattern shimmers as
  the camera moves.
- Keep `RAMP_LEVELS` in sync: the dither offset is `1 / levels`.
- Add a pure test for the Bayer matrix values and the shape-vector matcher (nearest glyph for
  a known pattern).

## Done when

- A smooth gradient shows no visible bands with dither on.
- Presets "Dither (green)" and "Binary (indigo on white)" reproduce the two card looks on the
  sample image.
- Shape matching makes the bust's outline visibly sharper at the same cell size.
