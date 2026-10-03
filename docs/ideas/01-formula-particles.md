# 01 · Formula particles ("つぶやきProcessing")

**Status:** First version shipped (2026-10-04): `web_interface/formula/` with three original formulas (Bloom, Tendrils, Orbitals) and an ASCII view. Next: more formulas, a speed control, sending a formula into the main engine as a source. · **Size:** M

## References

- @yuruyurau — https://x.com/yuruyurau/status/2092258811566583841 (four drifting
  "creatures", 800×800)
- @yuruyurau — https://x.com/yuruyurau/status/2106393812830708078 (one flowing, hair-like
  figure, 2e4 points; caption "what do you see?")
- @CAARIUNEWS — https://x.com/CAARIUNEWS/status/2093427731413217696 (a remix of the first,
  different constants, 400×400)

## What they are

Tweet-sized p5.js sketches (#つぶやきProcessing). Every frame draws 10,000–20,000 points, and
each point's position is a **closed-form function of its index `i` and time `t`**. Nothing
is stored between frames: no velocity, no simulation. Example (first post):

```js
a=(m,d=mag(k=2*cos(i*342),e=sin(i*271)*2)/1.6)=>point(
  k*(p=5+2*sin(d*8-t*3+m))+9/d*sin(k*2)+89*sin(c=d*d/9-t/8+m)+200,
  79*sin(c*2)+9/d*sin(e*2)+e*p+200)
t=0,draw=$=>{t||createCanvas(w=400,w);background(9).stroke(w,116);
  for(t+=PI/60,i=1e4;i--;)a(i%4*5)}
```

`i%4*5` gives four phase offsets `m`, which is why four separate figures appear. The
remix changes `cos(i*342)` → `4*cos(i*481.2)`, and the phase and step, and gets a
different creature from the same skeleton.

## How it maps onto this engine

This is a natural fit: our particles are already drawn on the GPU, and a stateless
formula belongs in a **vertex shader**, where `i` is the vertex index and `t` a uniform.
On a GPU, 20k points is nothing; the same formula can run at 200k–1M points for a
denser, silkier figure than p5 can manage.

Two ways in, both cheap:

1. **Standalone page** (`web_interface/formula/`): one `THREE.Points` with an `aIndex`
   attribute and a vertex shader per formula. Dark ground, white points with low alpha
   (p5's `stroke(w, 116)` is alpha 116/255 ≈ 0.45). This is the "thing on its own".
2. **Engine source**: feed the formula's points into the existing ASCII pass and GPU
   particles. Then the same creature can be shown as ASCII, or springs can pull particles
   toward the formula's moving targets (`tHome` updated each frame).

## Porting notes

- p5's canvas is 400 px with the figure centred near (200, 200). Subtract 200 and divide by
  ~200 to get our −1…1 units; flip y (p5's y points down).
- `mag(a, b)` = `length(vec2(a, b))`. `PI/60` per frame at 60 fps → `t` advances π per second.
- GLSL `sin` of large arguments (`i*342` up to 3.4M) loses precision on mobile GPUs.
  Precompute `k` and `e` per point on the CPU into attributes, and keep only the
  `t`-dependent part in the shader.

## Before shipping

**Credit and permission.** These formulas are someone's art, posted publicly but with no
licence. Before publishing their exact formulas, ask @yuruyurau for permission and credit
them on the page. The safer default is to write our own formulas in the same spirit, and
link to theirs as inspiration.

## Done when

- A formula page runs at 60 fps with ≥ 100k points on the "mid" device tier.
- At least three formulas of our own, selectable; the time speed adjustable.
- Optional: "Show as ASCII" sends the figure through the ASCII pass.
