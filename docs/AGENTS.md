# Working on AsciiGen — handoff for agents

Read this before touching the code. It is the shortest path to not repeating
mistakes that have already been made once.

**Live:** https://joethesaint.github.io/AsciiGen/ (GitHub Pages, deployed from `stable-pointgen-3d`)
**Owner works remotely and often from a phone.** They cannot see your local server. Anything
they need to look at has to be deployed.

## What the app is

`web_interface/` is a static, client-side page. Everything renders in the visitor's
browser on their own GPU. There is **no build step and no React**: plain `<script>` tags,
Three.js r128 from cdnjs/jsDelivr, ES module only for the thinking-orb loader.

Two renderers share one source (an image or a GLB):

| Mode | How it works | File |
|---|---|---|
| ASCII | Scene renders into a render target; a full-screen shader splits the screen into fixed character cells and draws one glyph per cell | `engine/ascii-pass.js` |
| Particles | Points sampled from the source; position/velocity live in float textures stepped on the GPU (springs, cursor fling, morphs, trails) | `engine/particles.js` |

## File map

```
web_interface/
  index.html            markup; every local file is loaded with ?v=X.Y (bump it on change)
  app.js                wiring: config, sidebar, loader, cursor, orbit, frame loop, FPS guard
  style.css             layered: original v4 rules first, later sections override them
  engine/
    device.js           quality tiers (low/mid/high) from GPU/cores/memory; pure pickTier()
    glyphs.js           glyph sets, ramp ordered by measured ink; glyph atlas texture
    sampler.js          pure: area-weighted surface sampling, detail-weighted image sampling
    ascii-pass.js       the ASCII shader pass
    particles.js        GPGPU particle physics + rendering
    sources.js          image/GLB → { object for ASCII, particle arrays }
  components/
    liquid-toggle.js    vanilla port of Bencho's Liquid toggle (MIT); wraps a checkbox
    morph-menu.js       pill → menu spring (Source control)
    thinking-orb.js     loader; thinking-orbs engine (MIT) driven without React
  tests/                node --test; pure functions only
legacy/web_v4/          the old engine, kept for reference
server/, smart_ascii/   Python backend + CLI. The web page does NOT call it any more.
```

## Run, test, deploy

```bash
# serve locally (any static server)
cd web_interface && python -m http.server 8765

# unit tests (pure engine code)
node --test web_interface/tests/engine.test.js web_interface/tests/device.test.js

# deploy: push to stable-pointgen-3d (or main). .github/workflows/pages.yml runs the
# tests, then publishes web_interface/ minus tests/ and dev files.
```

## Rules that came from real bugs

- **Bump `?v=` in index.html** whenever you change a local CSS/JS file. The local server and
  browsers cache aggressively; "my fix did nothing" was a cache twice.
- **Render targets that the ASCII pass samples must be `sRGBEncoding`.** Linear storage
  crushed mid-tones into blank cells.
- **GLB materials are forced `DoubleSide`.** Scanned models often have inverted winding and
  rendered hollow.
- **Flat images are double-sided and their orbit is locked to ±90°.** Past the edge was black.
- **Material colours go through sRGB output encoding; raw shader colours do not.** The trails
  fade quad turned the background grey until its colour was converted to linear.
- **`preserveDrawingBuffer: true`** is on deliberately: trails depend on it.
- **When editing index.html with scripts, check nesting.** A string-cut once removed a closing
  `</div>` and half the sidebar rendered outside it. Verify with a div balance count.
- Particle physics needs float render targets; `device.js` detects it and the app falls back to
  ASCII only.

## Environment gotchas (this machine)

- **Do not run headless Edge with SwiftShader for long.** CPU rendering pegged the machine and
  made every later command time out. If you must screenshot, use `--disable-webgl` for layout
  only, and kill the process after.
- The Claude-in-Chrome extension has not been connected in past sessions.
- Git prints CRLF warnings on every commit; they are harmless.
- The working tree has **uncommitted Python edits that belong to the owner**
  (`server/…`, `smart_ascii/…`). Never stage them with yours. Stage `web_interface/` explicitly.
- GitHub Pages environment only accepts deploys from `main` and `stable-pointgen-3d`.

## Conventions

- Plain language in UI copy; name things by what people recognise.
- Comments explain *why a number is what it is*; keep them when porting.
- Prefer the smallest working change (`.claude/skills/ponytail`). Pure logic gets a `node --test`.
- Commit messages end with the attribution lines your harness specifies.
- Multi-agent work: see `.claude/skills/council-method` and `council-comms` (roles, signed
  replies, locked decisions).

## Open threads

- `main` is far behind `stable-pointgen-3d`; merge when the owner agrees.
- The old Python backend features (kernels, `/morph`, `/text-to-cloud`) are disconnected.
- `requirements.txt` lists Flask but `server/app.py` is FastAPI.
- `liquid-toggle.js` and `morph-menu.js` each carry a ~10-line spring; could share one.
- Bencho's toggle CSS was pasted truncated; the completing rules are marked "ours".
- Parked ideas with designs: [`docs/ideas/`](./ideas/README.md).
