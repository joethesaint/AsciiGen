# 05 · Features worth adopting (from the ASCII Magic review)

**Status:** Parked · **Size:** S each, M together · Context: [`../POSITIONING.md`](../POSITIONING.md)

Small, high-value features seen in https://www.ascii-magic.com/app. Each item is
independent; pick them off one at a time.

## 1. More character sets

| Set | Glyphs | Why |
|---|---|---|
| Braille | U+2800–U+28FF, 2×4 dots per cell | About **8× the detail** per cell. Pick the pattern by thresholding each of the cell's 8 sub-positions, not by brightness lookup. Pairs with shape matching (`02`) |
| Quadrants | `▖▗▘▙▚▛▜▝▞▟▀▄▌▐█` | 2×2 detail with solid blocks |
| Binary | `0 1` | The praveenisomer card look; best with opacity mode (`02`) |
| Katakana | `ｱｲｳｴｵｶｷｸｹｺ…` | "Matrix" look; measure ink like the other sets |

Notes: `glyphs.js` already measures ink per glyph, so new sets need only the string and a
font with the glyphs. Check JetBrains Mono's coverage of Braille and half-width Katakana,
and fall back to a system monospace if a glyph is missing.

## 2. Backdrop options

Solid (current) · **blurred source** (render the source to a small target, blur, draw under
the glyphs) · **original source** · **transparent** (for PNG export onto anything).

## 3. Saved and shareable presets ("recipes")

- Save the whole `config` under a name (`localStorage`).
- Share as a link: encode the config compactly into the URL **hash** (e.g. `#r=…` base64url).
  GitHub Pages serves the hash untouched. On load, read the hash, then strip it.
- Ship 6–10 built-in presets (e.g. "Terminal green", "Binary on paper", "Bust in Braille").

## 4. Shuffle

One button that applies a random built-in preset (not random raw values; those look bad).
Avoid repeating the previous one, like the orb loader does.

## 5. Export: PNG, GIF, WebM

- PNG: render one frame and call `canvas.toBlob`. This needs the frame to exist at read time:
  read right after `render()` in the same task, since phones run without
  `preserveDrawingBuffer` (see AGENTS.md).
- GIF and WebM: see [`03-gif.md`](./03-gif.md).

## 6. Webcam as a source

`getUserMedia` → `<video>` → `THREE.VideoTexture` on the image plane. The ASCII pass works
unchanged. Particles: resample a low-res frame every ~200 ms and update `tHome`, and the
springs make the motion fluid. Needs HTTPS (GitHub Pages is) and a permission prompt
started by a button, never on load.

## Done when

Each item ships behind its own control, works on a phone, and appears in the README feature
list.
