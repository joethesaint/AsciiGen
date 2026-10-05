// src/core/styles.ts
var LIGHT = { plate: "#ffffff", hi: "#232327", edge: "#a4a4ac", mid: "#c3c3c9", lo: "#e0e0e4" };
var DARK = { plate: "#08090a", hi: "#d0d6e0", edge: "#5b5d64", mid: "#3e3e44", lo: "#29292d" };
var KEYS = ["plate", "hi", "edge", "mid", "lo"];
var vars = (p) => KEYS.map((k) => `--hl-${k}:var(--hairline-${k},${p[k]});`).join("");
var EASE = "cubic-bezier(0.5,0,0.1,1)";
var SVG = ":where([data-hairline]>svg)";
function css(lightDark) {
  const both = Object.fromEntries(KEYS.map((k) => [k, `light-dark(${LIGHT[k]},${DARK[k]})`]));
  return [
    // the box, and the palette: light unless something below says otherwise
    `:where([data-hairline]){display:block;position:relative;aspect-ratio:5/4;touch-action:pan-y;user-select:none;-webkit-user-select:none;--hl-sw:var(--hairline-stroke,0.9);${vars(LIGHT)}}`,
    // the page's color-scheme
    lightDark ? `:where([data-hairline]){${vars(both)}}` : "",
    // an ancestor that says dark
    `:where(.dark,[data-theme="dark"]) :where([data-hairline]){${vars(DARK)}}`,
    // the figure's own theme option
    `:where([data-hairline][data-hairline-theme="light"]){${vars(LIGHT)}}`,
    `:where([data-hairline][data-hairline-theme="dark"]){${vars(DARK)}}`,
    `:where([data-hairline]:focus-visible){outline:1.5px solid var(--hl-hi);outline-offset:2px}`,
    `${SVG}{position:absolute;inset:0;width:100%;height:100%;display:block}`,
    // Riffle's live region: read, not seen
    `:where([data-hairline]>[data-hairline-live]){position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
    // the drawing: plates are filled with the plate colour and painted back to front
    `${SVG} :where(path,polygon,ellipse,line){fill:var(--hl-plate);stroke:var(--hl-mid);stroke-width:var(--hl-sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round;transition:stroke 260ms ${EASE}}`,
    `${SVG} :where(.nf){fill:none}`,
    `${SVG} :where(.fo){stroke:none}`,
    `${SVG} :where(.sil){stroke:var(--hl-edge)}`,
    `${SVG} :where(.hi){stroke:var(--hl-hi)}`,
    `${SVG} :where(.lo){stroke:var(--hl-lo)}`,
    `${SVG} :where(.dash){stroke-dasharray:1 3}`,
    `${SVG} :where(.dot){stroke:none;fill:var(--hl-hi);transition:fill 260ms ${EASE}}`,
    `${SVG} :where(.dot.m){fill:var(--hl-edge)}`,
    `${SVG} :where(.dot.off){fill:var(--hl-lo)}`,
    `${SVG} :where(.ghost path){fill:none;stroke:var(--hl-mid)}`
  ].join("");
}
var done = /* @__PURE__ */ new WeakSet();
function inject(root) {
  if (done.has(root)) return;
  done.add(root);
  const doc = root.nodeType === 9 ? root : root.ownerDocument;
  const win = doc.defaultView;
  const text = css(!!win?.CSS?.supports?.("color", "light-dark(#000,#fff)"));
  if (win && "adoptedStyleSheets" in root) {
    try {
      const sheet = new win.CSSStyleSheet();
      sheet.replaceSync(text);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    } catch {
    }
  }
  const style = doc.createElement("style");
  style.setAttribute("data-hairline-style", "");
  style.textContent = text;
  (root.nodeType === 9 ? doc.head ?? doc.documentElement : root).appendChild(style);
}

// src/intensity.ts
var TABLE = {
  riffle: [0, 40, 90],
  // stagger, ms
  terrain: [1.5, 3, 5],
  // radius, cells
  exploded: [12, 28, 40],
  // gap, viewBox units
  phosphor: [150, 520, 1500],
  // afterglow, ms
  slow: [0.6, 0.2, 0.05],
  // rate, × normal speed
  turntable: [200, 650, 1500],
  // coast, ms
  keyboard: [1, 2, 3.5],
  // radius, keys
  elevator: [40, 100, 220],
  // stiffness, spring units
  phone: [16, 28, 40],
  // gap, viewBox units
  laptop: [100, 125, 150],
  // lid, degrees
  terminal: [1, 2, 3.5],
  // spread, lines
  cabinet: [1.5, 3, 5],
  // reach, blades
  branches: [1, 3, 6],
  // reach, commits
  vault: [250, 600, 1500],
  // coast, ms
  lockers: [55, 90, 120],
  // opening, degrees
  padlock: [45, 90, 100],
  // swing, degrees
  patch: [1, 2.5, 5],
  // radius, ports
  dish: [30, 50, 70],
  // reach, degrees
  router: [0.5, 1.5, 3]
  // spread, antennas
};
var DEFAULT = 0.5;
function intensity(value) {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return DEFAULT;
  return Math.min(1, Math.max(0, n));
}
function parameter(figure, value) {
  const [lo, mid, hi] = TABLE[figure];
  const i = intensity(value);
  const v = i <= 0.5 ? lo + i / 0.5 * (mid - lo) : mid + (i - 0.5) / 0.5 * (hi - mid);
  return Math.round(v * 1e3) / 1e3;
}

// src/mount.ts
var NS = "http://www.w3.org/2000/svg";
var mounted = /* @__PURE__ */ new WeakMap();
var report = (err) => {
  if (typeof reportError === "function") reportError(err);
  else setTimeout(() => {
    throw err;
  });
};
function create(spec, el, options) {
  if (typeof document === "undefined") {
    throw new Error(`hairline: ${spec.id}() needs a DOM. Call it in the browser, once the element exists: in an effect, in onMount, or in a script after the element.`);
  }
  if (!el || el.nodeType !== 1) {
    throw new TypeError(`hairline: ${spec.id}() takes an element as its first argument, and got ${el === null ? "null" : typeof el}.`);
  }
  mounted.get(el)?.();
  const opts = { ...options };
  const doc = el.ownerDocument;
  const root = el.getRootNode();
  inject(root.nodeType === 9 || "host" in root ? root : doc);
  const owned = /* @__PURE__ */ new Set();
  const attr = (name, value2) => {
    if (!owned.has(name) && el.hasAttribute(name)) return;
    if (value2 === null) {
      el.removeAttribute(name);
      owned.delete(name);
    } else {
      el.setAttribute(name, value2);
      owned.add(name);
    }
  };
  const dress = () => {
    attr("data-hairline-theme", opts.theme === "light" || opts.theme === "dark" ? opts.theme : null);
    attr("aria-label", el.hasAttribute("aria-labelledby") ? null : typeof opts.label === "string" ? opts.label : spec.label);
  };
  attr("data-hairline", spec.id);
  attr("role", spec.focusable ? "group" : "img");
  if (spec.focusable) attr("tabindex", "0");
  dress();
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 400 320");
  svg.setAttribute("aria-hidden", "true");
  el.appendChild(svg);
  let live = null;
  if (spec.focusable) {
    live = doc.createElement("span");
    live.setAttribute("data-hairline-live", "");
    live.setAttribute("aria-live", "polite");
    el.appendChild(live);
  }
  let text = null;
  const read = {
    get textContent() {
      return text;
    },
    set textContent(value2) {
      const next = value2 ?? "";
      if (next === text) return;
      text = next;
      if (live) live.textContent = next;
      const fn = opts.onRead;
      if (typeof fn === "function") try {
        fn(next);
      } catch (err) {
        report(err);
      }
    }
  };
  let value = parameter(spec.id, opts.intensity);
  const engine = spec.engine({ stage: el, svg, read }, value);
  if (text === null) read.textContent = spec.rest;
  let dead = false;
  const destroy = () => {
    if (dead) return;
    dead = true;
    if (mounted.get(el) === destroy) mounted.delete(el);
    engine.destroy();
    svg.remove();
    live?.remove();
    for (const name of owned) el.removeAttribute(name);
    owned.clear();
  };
  mounted.set(el, destroy);
  return {
    update(next) {
      if (dead || !next) return;
      const own = opts, given = next;
      for (const k in given) {
        if (given[k] === void 0) delete own[k];
        else own[k] = given[k];
      }
      const v = parameter(spec.id, opts.intensity);
      if (v !== value) {
        value = v;
        engine.set(v);
      }
      dress();
    },
    destroy
  };
}

// src/core/iso.ts
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
var lerp = (a, b, t) => a + (b - a) * t;
var rad = (d) => d * Math.PI / 180;
var r2 = (n) => Math.round(n * 100) / 100;
var poly = (pts) => "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L") + "Z";
var seg = (a, b) => `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}`;
var open = (pts) => pts.length < 2 ? "" : "M" + pts.map((p) => r2(p[0]) + " " + r2(p[1])).join("L");
var Cam = (azDeg, k, S) => ({ az: rad(azDeg), k, S, ox: 0, oy: 0 });
function proj(C) {
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
  return (x, y, z) => {
    const X = x * c - y * s, Y = x * s + y * c;
    return [C.ox + C.S * X, C.oy + C.S * (Y * C.k - z * zf)];
  };
}
function unproj(C, sx, sy, z) {
  const c = Math.cos(C.az), s = Math.sin(C.az), zf = Math.sqrt(1 - C.k * C.k);
  const X = (sx - C.ox) / C.S, Y = ((sy - C.oy) / C.S + z * zf) / C.k;
  return [X * c + Y * s, -X * s + Y * c];
}
function fit(C, pts, cx, cy) {
  C.ox = 0;
  C.oy = 0;
  const P = proj(C);
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const p of pts) {
    const q = P(p[0], p[1], p[2]);
    a = Math.min(a, q[0]);
    b = Math.max(b, q[0]);
    c = Math.min(c, q[1]);
    d = Math.max(d, q[1]);
  }
  C.ox = cx - (a + b) / 2;
  C.oy = cy - (c + d) / 2;
}
function rrect(u0, v0, u1, v1, r, n = 4) {
  r = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2));
  const out = [];
  for (const [cu, cv, a0] of [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]])
    for (let k = 0; k <= n; k++) {
      const a = rad(a0 + 90 * k / n), ca = Math.cos(a), sa = Math.sin(a);
      out.push({ u: cu + r * ca, v: cv + r * sa, nu: ca, nv: sa });
    }
  return out;
}
function circ(R6, n = 96) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    out.push({ u: R6 * ca, v: R6 * sa, nu: ca, nv: sa });
  }
  return out;
}
function hull(input) {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const x = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) {
    while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (up.length > 1 && x(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  lo.pop();
  up.pop();
  return lo.concat(up);
}
var ringAt = (P, ring, z) => ring.map((q) => P(q.u, q.v, z));
var facing = (C) => {
  const s = Math.sin(C.az), c = Math.cos(C.az);
  return (q) => q.nu * s + q.nv * c >= -1e-6;
};
function run(ring, keep) {
  const n = ring.length;
  let s = -1;
  for (let i = 0; i < n; i++) if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) {
    s = i;
    break;
  }
  if (s < 0) return keep(ring[0]) ? ring.slice() : [];
  const out = [];
  for (let k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n]);
  return out;
}
function prism(P, front2, ring, inner2, z0, z1) {
  return {
    sil: poly(hull(ringAt(P, ring, z1).concat(ringAt(P, ring, z0)))),
    crease: inner2 ? open(ringAt(P, run(inner2, front2), z1)) : ""
  };
}
var rings = (x0, y0, x1, y1, r, b) => [
  rrect(x0, y0, x1, y1, r),
  rrect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b))
];
function extremes(P, ring) {
  const pr = ring.map((q) => P(q.u, q.v, 0));
  let a = 0, b = 0, c = 0;
  pr.forEach((p, k) => {
    if (p[0] < pr[a][0]) a = k;
    if (p[0] > pr[b][0]) b = k;
    if (p[1] > pr[c][1]) c = k;
  });
  return [ring[a], ring[b], ring[c]];
}
function fillet(pts, rs, n = 4) {
  const m = pts.length, out = [];
  for (let i = 0; i < m; i++) {
    const a = pts[(i + m - 1) % m], p = pts[i], b = pts[(i + 1) % m];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const t = Math.min(rs[i], la / 2, lb / 2);
    const p1 = [p[0] + (a[0] - p[0]) / la * t, p[1] + (a[1] - p[1]) / la * t];
    const p2 = [p[0] + (b[0] - p[0]) / lb * t, p[1] + (b[1] - p[1]) / lb * t];
    for (let k = 0; k <= n; k++) {
      const s = k / n, w = 1 - s;
      out.push([w * w * p1[0] + 2 * w * s * p[0] + s * s * p2[0], w * w * p1[1] + 2 * w * s * p[1] + s * s * p2[1]]);
    }
  }
  return out;
}
function ghost(P, front2, ring, z0, depth2) {
  const f = run(ring, front2), lowP = ringAt(P, f, z0 - depth2);
  return {
    d: open(lowP) + [f[0], f[f.length - 1]].map((q) => seg(P(q.u, q.v, z0), P(q.u, q.v, z0 - depth2))).join(""),
    y0: Math.min(...ringAt(P, f, z0).map((p) => p[1])),
    y1: Math.max(...lowP.map((p) => p[1])) + 2
  };
}

// src/core/motion.ts
var reduced = false;
var setReducedMotion = (on) => {
  reduced = on;
};
var reducedMotion = () => reduced;
function spring(x, o = {}) {
  return { x, v: 0, t: x, k: o.k ?? 100, c: o.c ?? 18, m: o.m ?? 1, eps: o.eps ?? 0.01 };
}
function stepS(sp, dt) {
  if (reduced) {
    sp.x = sp.t;
    sp.v = 0;
    return false;
  }
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = (-sp.k * (sp.x - sp.t) - sp.c * sp.v) / sp.m;
    sp.v += a * h;
    sp.x += sp.v * h;
  }
  if (Math.abs(sp.x - sp.t) < sp.eps && Math.abs(sp.v) < sp.eps * 10) {
    sp.x = sp.t;
    sp.v = 0;
    return false;
  }
  return true;
}
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax2 = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (u) => ((ax2 * u + bx) * u + cx) * u;
  const Y = (u) => ((ay * u + by) * u + cy) * u;
  const dX = (u) => (3 * ax2 * u + 2 * bx) * u + cx;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const e = X(u) - t;
      if (Math.abs(e) < 1e-5) break;
      const d = dX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    if (!(u >= 0 && u <= 1) || Math.abs(X(u) - t) > 1e-4) {
      let lo = 0, hi = 1;
      u = t;
      for (let i = 0; i < 24; i++) {
        if (X(u) < t) lo = u;
        else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return Y(u);
  };
}
var EASE_LIFT = bezier(0.32, 0.72, 0, 1);
var tween = (v, dur = 700) => ({ from: v, to: v, t0: -1e9, dur });
var tval = (tw, now) => {
  const p = clamp((now - tw.t0) / tw.dur, 0, 1);
  return tw.from + (tw.to - tw.from) * (reduced ? 1 : EASE_LIFT(p));
};
var tset = (tw, to, now, delay) => {
  if (tw.to === to) return;
  tw.from = tval(tw, now);
  tw.to = to;
  tw.t0 = now + delay;
};
var tdone = (tw, now) => reduced || now >= tw.t0 + tw.dur;

// src/core/stage.ts
var NS2 = "http://www.w3.org/2000/svg";
function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS2, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}
function solid(parent) {
  const g = mk("g", {}, parent);
  return { g, sil: mk("path", { class: "sil" }, g), cr: mk("path", { class: "nf lo" }, g) };
}
var put = (el, s) => {
  el.sil.setAttribute("d", s.sil);
  el.cr.setAttribute("d", s.crease);
};
var flatDot = (parent, C, r, cls) => mk("ellipse", { rx: r2(r * C.S), ry: r2(r * C.S * C.k), class: cls }, parent);
var place = (el, q) => {
  el.setAttribute("cx", String(r2(q[0])));
  el.setAttribute("cy", String(r2(q[1])));
};
var fid = 0;
function fade(svg, y0, y1, a0 = 0.7) {
  const id = "hl-fd" + ++fid, defs = mk("defs", {}, svg);
  const lg = mk("linearGradient", { id: id + "g", gradientUnits: "userSpaceOnUse", x1: 0, y1: r2(y0), x2: 0, y2: r2(y1) }, defs);
  mk("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": a0 }, lg);
  mk("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 }, lg);
  const m = mk("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 400, height: 320 }, defs);
  mk("rect", { x: 0, y: 0, width: 400, height: 320, fill: `url(#${id}g)` }, m);
  return `url(#${id})`;
}
function reflect(svg, parent, P, front2, ring, z0, depth2) {
  const r = ghost(P, front2, ring, z0, depth2);
  const gh = mk("g", { class: "ghost", mask: fade(svg, r.y0, r.y1) }, parent);
  mk("path", { d: r.d }, gh);
}
var boards = [];
var byStage = /* @__PURE__ */ new Map();
var raf = 0;
var last = 0;
var io = null;
var rm = null;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1e3));
  last = now;
  let any = false;
  for (const b of boards.slice()) if (b.vis && b.awake) {
    b.awake = !!b.tick(dt, now);
    any = any || b.awake;
  }
  raf = any ? requestAnimationFrame(frame) : 0;
}
function wake(b) {
  b.awake = true;
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
var onMotion = () => {
  setReducedMotion(!!rm?.matches);
  boards.forEach(wake);
};
function start() {
  if (io) return;
  io = new IntersectionObserver((es) => {
    for (const e of es) {
      const b = byStage.get(e.target);
      if (!b) continue;
      b.vis = e.isIntersecting;
      if (b.vis) wake(b);
    }
  }, { rootMargin: "80px" });
  rm = matchMedia("(prefers-reduced-motion: reduce)");
  setReducedMotion(rm.matches);
  rm.addEventListener("change", onMotion);
}
function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  io?.disconnect();
  io = null;
  rm?.removeEventListener("change", onMotion);
  rm = null;
}
function register(stage, tick) {
  start();
  const b = { stage, tick, vis: false, awake: true };
  boards.push(b);
  byStage.set(stage, b);
  io.observe(stage);
  tick(0, performance.now());
  let gone = false;
  return {
    wake: () => {
      if (!gone) wake(b);
    },
    unregister: () => {
      if (gone) return;
      gone = true;
      boards = boards.filter((x) => x !== b);
      if (byStage.get(stage) === b) {
        byStage.delete(stage);
        io?.unobserve(stage);
      }
      if (!boards.length) stop();
    }
  };
}
function pointer(stage, on) {
  let tm = 0;
  const pt = (e) => {
    const r = stage.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 400, (e.clientY - r.top) / r.height * 320];
  };
  const move = (e) => {
    clearTimeout(tm);
    on.move(pt(e), e);
  };
  const down = (e) => {
    clearTimeout(tm);
    if (e.pointerType !== "mouse") stage.releasePointerCapture?.(e.pointerId);
    if (on.down) on.down(pt(e), e);
    else on.move(pt(e), e);
  };
  const leave = (e) => {
    clearTimeout(tm);
    tm = window.setTimeout(() => on.leave(e), e.pointerType === "mouse" ? 0 : 1400);
  };
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointerleave", leave);
  return () => {
    clearTimeout(tm);
    stage.removeEventListener("pointermove", move);
    stage.removeEventListener("pointerdown", down);
    stage.removeEventListener("pointerleave", leave);
  };
}
function disposer() {
  let fns = [];
  return {
    add: (fn) => {
      fns.push(fn);
    },
    on: (target, type, fn, opts) => {
      const h = fn;
      target.addEventListener(type, h, opts);
      fns.push(() => target.removeEventListener(type, h, opts));
    },
    dispose: () => {
      const run2 = fns;
      fns = [];
      for (let i = run2.length - 1; i >= 0; i--) run2[i]();
    }
  };
}

// src/figures/branches.ts
var D = 30;
var FY = 58;
var RW = 7;
var RT = 2.6;
var PR = 8;
var PH = 2.4;
var CR = 6.6;
var CH = 6;
var LIFT = 36;
var STEP = 45;
var BX0 = -15;
var BX1 = 7 * D + 15;
var BY0 = -16;
var BY1 = FY + 14;
var PB = 6;
var ZTOP = RT + PH + CH;
function history() {
  const cs = [], at2 = (lane, n, x, y, parent) => (cs.push({ lane, n, x, y, parent }), cs.length - 1);
  const m = [];
  for (let i = 0; i < 8; i++) m.push(at2("main", i + 1, i * D, 0, i ? m[i - 1] : -1));
  const f1 = at2("feature", 1, 2.5 * D, FY, m[1]), f2 = at2("feature", 2, 3.5 * D, FY, f1), f3 = at2("feature", 3, 4.5 * D, FY, f2);
  return { cs, m, f: [f1, f2, f3] };
}
var bez = (a, b, ox, oy, ix, n) => {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t, w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    const px = [a[0], a[0] + ox, b[0] - ix, b[0]], py = [a[1], a[1] + oy, b[1], b[1]];
    out.push([w[0] * px[0] + w[1] * px[1] + w[2] * px[2] + w[3] * px[3], w[0] * py[0] + w[1] * py[1] + w[2] * py[2] + w[3] * py[3]]);
  }
  return out;
};
function strip(c) {
  const L5 = [], R6 = [];
  c.forEach((p, i) => {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    L5.push([p[0] + nx * RW / 2, p[1] + ny * RW / 2]);
    R6.push([p[0] - nx * RW / 2, p[1] - ny * RW / 2]);
  });
  return L5.concat(R6.reverse());
}
var mount = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let reach = value;
  const C = Cam(45, 0.5, 1.4);
  fit(C, [[BX0, BY0, -PB], [BX1, BY1, -PB], [BX1, BY0, -PB], [BX0, BY1, -PB], [BX0, BY0, ZTOP + LIFT], [BX1, BY0, ZTOP + LIFT]], 200, 166);
  const P = proj(C), front2 = facing(C);
  const { cs: seeds, m, f } = history();
  const xy = (i) => [seeds[i].x, seeds[i].y];
  const g = mk("g", {}, svg);
  const [br, bi] = rings(BX0, BY0, BX1, BY1, 12, 2.2);
  put(solid(g), prism(P, front2, br, bi, -PB, 0));
  const fork = (a, b) => bez(a, b, (b[0] - a[0]) * 0.3, (b[1] - a[1]) * 0.5, (b[0] - a[0]) * 0.45, 14);
  const merge = (a, b) => bez(b, a, (a[0] - b[0]) * 0.3, (a[1] - b[1]) * 0.5, (a[0] - b[0]) * 0.45, 14).reverse();
  const lines = [
    [xy(m[0]), xy(m[7])],
    [...fork(xy(m[1]), xy(f[0])), ...merge(xy(f[2]), xy(m[6])).slice(1)]
  ];
  for (const c of lines) {
    const s = strip(c);
    mk("path", { d: poly(s.map((p) => P(p[0], p[1], 0))), class: "lo" }, g);
    mk("path", { d: poly(s.map((p) => P(p[0], p[1], RT))), class: "" }, g);
  }
  const [pr, pi] = [circ(PR, 24), circ(PR - 1.4, 24)], [cr, ci] = [circ(CR, 24), circ(CR - 1.2, 24)];
  const at2 = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));
  const order2 = seeds.map((_, i) => i).sort((a, b) => seeds[a].x + seeds[a].y - (seeds[b].x + seeds[b].y));
  const cs = [];
  for (const i of order2) {
    const c = seeds[i];
    put(solid(g), prism(P, front2, at2(pr, c.x, c.y), at2(pi, c.x, c.y), RT, PH + RT));
    const drop = mk("path", { class: "dash nf" }, g);
    cs[i] = { ...c, drop, el: solid(g), ring: at2(cr, c.x, c.y), inner: at2(ci, c.x, c.y), z: tween(0), drawn: NaN };
  }
  const chain = (a) => {
    const out = [];
    for (let i = a, k = 0; i >= 0; i = cs[i].parent, k++) out.push([i, k]);
    return out;
  };
  const REST10 = f[2], REST_REACH = 2.2, REST_DEPTH = 0.5;
  function draw(c, z) {
    if (z === c.drawn) return;
    c.drawn = z;
    const b = PH + RT + z;
    put(c.el, prism(P, front2, c.ring, c.inner, b, b + CH));
    c.drop.setAttribute("d", seg(P(c.x, c.y, PH + RT), P(c.x, c.y, b)));
  }
  const B3 = register(stage, (_dt, now) => {
    let moving = false;
    for (const c of cs) {
      draw(c, tval(c.z, now));
      if (!tdone(c.z, now)) moving = true;
    }
    return moving;
  });
  bag.add(B3.unregister);
  let act = null, lit2 = null, held = /* @__PURE__ */ new Map();
  function lift(a, r, depth2, instant) {
    const now = performance.now(), want = /* @__PURE__ */ new Map();
    for (const [i, k] of chain(a)) if (k <= r) want.set(i, [LIFT * depth2 * clamp(1 - k / (r + 1), 0, 1), k]);
    cs.forEach((c, i) => {
      const [to, k] = want.get(i) || [0, (held.get(i) || [0, 0])[1]];
      if (instant) c.z = tween(to);
      else tset(c.z, to, now, k * STEP);
    });
    held = want;
    if (lit2 !== a) {
      if (lit2 !== null) cs[lit2].el.sil.classList.remove("hi");
      lit2 = a;
      cs[a].el.sil.classList.add("hi");
    }
    B3.wake();
  }
  lift(REST10, REST_REACH, REST_DEPTH, true);
  function choose(a) {
    if (a === act) return;
    act = a;
    if (a === null) {
      lift(REST10, REST_REACH, REST_DEPTH);
      read.textContent = "rest";
    } else {
      lift(a, reach, 1);
      read.textContent = `${cs[a].lane} \xB7 ${cs[a].n}`;
    }
  }
  function hit(p) {
    const q = unproj(C, p[0], p[1], ZTOP);
    if (q[0] < BX0 || q[0] > BX1 || q[1] < BY0 || q[1] > BY1) return null;
    let best = null, bd = Infinity;
    cs.forEach((c, i) => {
      const d = Math.hypot(c.x - q[0], c.y - q[1]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }
  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(null) }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      reach = v;
      if (act !== null) lift(act, reach, 1);
    },
    destroy: bag.dispose
  };
};

// src/figures/cabinet.ts
var N = 12;
var U = 10.4;
var BH = 9.6;
var W = 84;
var EAR = 4;
var FT = 2;
var D2 = 44;
var OUT = 26;
var X0 = -10;
var X1 = W + 10;
var Z0 = 6;
var ZB = 11;
var ZT = ZB + (N - 1) * U + BH;
var H = ZT + 6;
var REST = [0, 0, 0.2, 0, 0, 0.3, 0.58, 0.26, 0, 0, 0.13, 0];
var LIT = 6;
var falloff = (u) => u >= 1 ? 0 : (1 - u) * (1 - u);
var inner = (q) => 0.375 * q.nu + 0.307 * q.nv > 0;
function slab(P, ring, inset, y0, y1) {
  const at2 = (r, y) => r.map((q) => P(q.u, y, q.v));
  return { sil: poly(hull(at2(ring, y0).concat(at2(ring, y1)))), crease: inset ? open(at2(run(inset, inner), y1)) : "" };
}
var mount2 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.5);
  const yo = D2 + FT + OUT;
  fit(C, [[X0, 0, 0], [X1, 0, H], [X1, D2, 0], [X0, 0, H], [-EAR, yo, ZB], [-EAR, yo, ZT], [W + EAR, yo, ZB]], 200, 166);
  const P = proj(C), front2 = facing(C);
  let R6 = value, over = null, lit2 = null;
  const g = mk("g", {}, svg);
  const [pr, pi] = rings(X0 + 3, 3, X1 - 3, D2 - 3, 3, 1.2);
  put(solid(g), prism(P, front2, pr, pi, 0, Z0));
  const [br, bi] = rings(X0, 0, X1, D2, 3.5, 1.6);
  put(solid(g), prism(P, front2, br, bi, Z0, H));
  const onFront = (r) => r.map((q) => P(q.u, D2, q.v)), onSide = (r) => r.map((q) => P(X1, q.u, q.v));
  mk("path", { d: poly(onFront(rrect(-7.6, ZB - 2.2, W + 7.6, ZT + 2.2, 2, 4))) + poly(onSide(rrect(5, Z0 + 7, D2 - 5, H - 7, 3, 4))), class: "lo nf" }, g);
  for (let i = 0; i < N; i++) for (const x of [-5.8, W + 5.8]) {
    place(mk("circle", { r: 0.75, class: "dot off" }, g), P(x, D2, ZB + i * U + BH / 2));
  }
  const blades = [];
  for (let i = 0; i < N; i++) {
    const z = ZB + i * U, gi = mk("g", {}, g);
    blades.push({
      i,
      z,
      body: rrect(0, z + 0.4, W, z + BH - 0.4, 1.6, 4),
      face: rrect(-EAR, z, W + EAR, z + BH, 2, 4),
      faceIn: rrect(-EAR + 0.8, z + 0.8, W + EAR - 0.8, z + BH - 0.8, 1.2, 4),
      chassis: solid(gi),
      plate: solid(gi),
      marks: mk("path", { class: "lo nf" }, gi),
      lamp: mk("circle", { r: 1.1, class: "dot off" }, gi),
      sp: spring(OUT * REST[i], { eps: 0.02 }),
      drawn: NaN
    });
  }
  function marks(b, y) {
    const z = b.z, F = (r) => poly(r.map((q) => P(q.u, y, q.v)));
    let d = F(rrect(-3.4, z + 2, -1.2, z + BH - 2, 1, 3)) + F(rrect(W + 1.2, z + 2, W + 3.4, z + BH - 2, 1, 3));
    for (let k = 0; k < 4; k++) d += F(rrect(4 + k * 10.6, z + 2, 13.8 + k * 10.6, z + BH - 2, 1, 3));
    for (let k = 0; k < 8; k++) d += seg(P(50 + k * 2.6, y, z + 2.5), P(50 + k * 2.6, y, z + BH - 2.5));
    return d;
  }
  function drawBlade(b) {
    const o = b.sp.x;
    if (o === b.drawn) return;
    b.drawn = o;
    const yf = D2 + o + FT, zm = b.z + BH / 2;
    const ch = slab(P, b.body, null, D2, D2 + o + 0.5);
    put(b.chassis, { sil: ch.sil, crease: seg(P(W, D2, zm), P(W, D2 + o, zm)) });
    put(b.plate, slab(P, b.face, b.faceIn, D2 + o, yf));
    b.marks.setAttribute("d", marks(b, yf));
    place(b.lamp, P(W - 5, yf, zm));
  }
  function light(b) {
    if (b === lit2) return;
    if (lit2) {
      lit2.plate.sil.classList.remove("hi");
      lit2.lamp.setAttribute("class", "dot off");
    }
    lit2 = b;
    lit2.plate.sil.classList.add("hi");
    lit2.lamp.setAttribute("class", "dot");
  }
  const B3 = register(stage, (dt) => {
    let m = false;
    for (const b of blades) {
      if (stepS(b.sp, dt)) m = true;
      drawBlade(b);
    }
    return m;
  });
  bag.add(B3.unregister);
  const o0 = P(0, 0, 0), E2 = [P(1, 0, 0), P(0, 1, 0), P(0, 0, 1)].map((p) => [p[0] - o0[0], p[1] - o0[1]]);
  function onPlane(p, axis, c) {
    const [a, k] = [0, 1, 2].filter((n) => n !== axis), ea = E2[a], ek = E2[k];
    const rx = p[0] - o0[0] - c * E2[axis][0], ry = p[1] - o0[1] - c * E2[axis][1], det = ea[0] * ek[1] - ea[1] * ek[0];
    const w = [0, 0, 0];
    w[axis] = c;
    w[a] = (rx * ek[1] - ry * ek[0]) / det;
    w[k] = (ea[0] * ry - ea[1] * rx) / det;
    return w;
  }
  function hit(p) {
    for (let i = N - 1; i >= 0; i--) {
      const q = onPlane(p, 1, D2 + FT + OUT * REST[i]), z2 = (q[2] - ZB - BH / 2) / U;
      if (q[0] >= -EAR && q[0] <= W + EAR && Math.abs(z2 - i) <= 0.5) return z2;
    }
    const f = onPlane(p, 1, D2 + FT), s = onPlane(p, 0, X1);
    let z = null;
    if (f[0] >= X0 - OUT - 4 && f[0] <= X1 && f[2] >= -OUT * 0.8 && f[2] <= H) z = f[2];
    else if (s[1] >= 0 && s[1] <= D2 && s[2] >= 0 && s[2] <= H + 4) z = s[2];
    return z === null ? null : clamp((z - ZB - BH / 2) / U, 0, N - 1);
  }
  function retarget() {
    if (over === null) {
      for (const b of blades) b.sp.t = OUT * REST[b.i];
      light(blades[LIT]);
      read.textContent = "rest";
    } else {
      for (const b of blades) b.sp.t = OUT * falloff(Math.max(0, Math.abs(b.i - over) - 0.5) / R6);
      const a = Math.round(over);
      light(blades[a]);
      read.textContent = "blade " + (a + 1);
    }
    B3.wake();
  }
  light(blades[LIT]);
  bag.add(pointer(stage, {
    move: (p) => {
      over = hit(p);
      retarget();
    },
    leave: () => {
      over = null;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      R6 = v;
      if (over !== null) retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/dish.ts
var R = 26;
var FOC = 17;
var SK = 1.4;
var DEP = R * R / (4 * FOC);
var ZE = 46;
var W2 = 31;
var T = 5;
var ZB2 = 10;
var ZY = 16;
var AZ0 = 45;
var EL0 = 40;
var REST2 = [-20, 30];
var PIV = [0, 0, ZE];
var ax = (p, q, s) => [p[0] + q[0] * s, p[1] + q[1] * s, p[2] + q[2] * s];
var dot3 = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
function frame2(th, ph) {
  const t = rad(th), f = rad(ph), c = Math.cos(f), s = Math.sin(f);
  const h = [Math.cos(t), Math.sin(t), 0], e = [-Math.sin(t), Math.cos(t), 0];
  return { th, h, e, a: [h[0] * c, h[1] * c, s], u: [-h[0] * s, -h[1] * s, c] };
}
var onDish = (F, along2, rho, psi) => ax(ax(ax(PIV, F.a, along2), F.e, rho * Math.cos(psi)), F.u, rho * Math.sin(psi));
var disc = (c, x, y, r, n) => Array.from({ length: n }, (_, i) => ax(ax(c, x, r * Math.cos(2 * Math.PI * i / n)), y, r * Math.sin(2 * Math.PI * i / n)));
var turn = (ring, F) => ring.map((q) => ({
  u: q.u * F.h[0] + q.v * F.e[0],
  v: q.u * F.h[1] + q.v * F.e[1],
  nu: q.nu * F.h[0] + q.nv * F.e[0],
  nv: q.nu * F.h[1] + q.nv * F.e[1]
}));
var mount3 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let reach = value, over = null;
  const C = Cam(45, 0.5, 2.5), pts = [[-30, -30, 0], [30, 30, 0], [30, -30, 0], [-30, 30, 0]];
  for (const [th, ph] of [[-25, 5], [-25, 75], [115, 5], [115, 75], REST2]) {
    const F = frame2(th, ph);
    pts.push(...disc(PIV, F.e, F.u, R, 16), onDish(F, FOC - DEP + 3, 0, 0));
    for (const s of [-1, 1]) pts.push(ax(ax(PIV, F.e, s * (W2 + T / 2)), [0, 0, 1], 6));
  }
  fit(C, pts, 200, 166);
  const P = proj(C), front2 = facing(C), Pv = (q) => P(q[0], q[1], q[2]);
  const o = P(0, 0, 0), cx = P(1, 0, 0), cy = P(0, 1, 0), cz = P(0, 0, 1);
  const r1 = [cx[0] - o[0], cy[0] - o[0], cz[0] - o[0]], r22 = [cx[1] - o[1], cy[1] - o[1], cz[1] - o[1]];
  const cross2 = [r1[1] * r22[2] - r1[2] * r22[1], r1[2] * r22[0] - r1[0] * r22[2], r1[0] * r22[1] - r1[1] * r22[0]];
  const vl = Math.hypot(...cross2) * Math.sign(cross2[2]);
  const VD = cross2.map((x) => x / vl);
  const g = mk("g", {}, svg);
  const [br, bi] = rings(-30, -30, 30, 30, 9, 2);
  put(solid(g), prism(P, front2, br, bi, 0, 5));
  for (let i = 0; i < 36; i++) {
    const t = i / 36 * 2 * Math.PI, r = i % 9 === 0 ? 26.5 : 25.5;
    place(flatDot(g, C, i % 9 === 0 ? 0.75 : 0.5, "dot off"), P(r * Math.cos(t), r * Math.sin(t), 5));
  }
  put(solid(g), prism(P, front2, circ(20, 48), circ(18.8, 48), 5, ZB2));
  const index = flatDot(g, C, 0.8, "dot m");
  const beam = solid(g);
  const yb = W2 + T / 2 + 1, [bmr, bmi] = rings(-9, -yb, 9, yb, 4, 1.4);
  const dishG = mk("g", {}, g);
  const sides = [-1, 1].map((s) => {
    const sg = mk("g", {}, g);
    return {
      s,
      g: sg,
      near: null,
      ring: mk("path", { class: "nf" }, sg),
      arm: solid(sg),
      trun: mk("path", { class: "sil" }, sg),
      foot: rrect(-8, s * W2 - T / 2, 8, s * W2 + T / 2, 2.5, 4),
      top: rrect(-5.5, s * W2 - T / 2, 5.5, s * W2 + T / 2, 2.5, 4),
      inner: rrect(-4.5, s * W2 - T / 2 + 1, 4.5, s * W2 + T / 2 - 1, 1.5, 4)
    };
  });
  const outline = mk("path", { class: "sil" }, dishG), seam = mk("path", { class: "nf lo" }, dishG), hubR = mk("path", { class: "nf lo" }, dishG);
  const rim = mk("path", { class: "nf hi" }, dishG), struts = mk("path", { class: "nf" }, dishG);
  const feed = solid(dishG);
  const BACK2 = [0, 0.35, 0.6, 0.78, 0.9, 0.97, 1];
  function seen(F, rho, n) {
    const along2 = rho * rho / (4 * FOC) - DEP, t = -along2 / dot3(F.a, VD), q = [], s = [];
    for (let i2 = 0; i2 < n; i2++) {
      q.push(onDish(F, along2, rho, 2 * Math.PI * i2 / n));
      const hit = ax(q[i2], VD, t);
      s.push(R - Math.hypot(hit[0] - PIV[0], hit[1] - PIV[1], hit[2] - PIV[2]));
    }
    if (s.every((x) => x > 0)) return poly(q.map(Pv));
    const i0 = s.findIndex((x, i2) => x > 0 && s[(i2 + n - 1) % n] <= 0);
    if (i0 < 0) return "";
    const cut2 = (i2, j) => Pv(ax(q[i2], [q[j][0] - q[i2][0], q[j][1] - q[i2][1], q[j][2] - q[i2][2]], s[i2] / (s[i2] - s[j])));
    const out = [cut2((i0 + n - 1) % n, i0)];
    let i = i0;
    while (s[i] > 0) {
      out.push(Pv(q[i]));
      i = (i + 1) % n;
    }
    out.push(cut2((i + n - 1) % n, i));
    return open(out);
  }
  let drawn = "";
  function draw(th, ph) {
    const key = th.toFixed(3) + "," + ph.toFixed(3);
    if (key === drawn) return;
    drawn = key;
    const F = frame2(th, ph);
    place(index, P(18 * F.h[0], 18 * F.h[1], ZB2));
    put(beam, prism(P, front2, turn(bmr, F), turn(bmi, F), ZB2, ZY));
    for (const sd of sides) {
      const near = sd.s * dot3(F.e, VD) > 0;
      if (near !== sd.near) {
        sd.near = near;
        if (near) {
          sd.g.append(sd.trun, sd.arm.g, sd.ring);
          dishG.after(sd.g);
        } else {
          sd.g.append(sd.ring, sd.arm.g, sd.trun);
          dishG.before(sd.g);
        }
      }
      put(sd.arm, {
        sil: poly(hull(ringAt(P, turn(sd.foot, F), ZY).concat(ringAt(P, turn(sd.top, F), ZE + 6)))),
        crease: open(ringAt(P, run(turn(sd.inner, F), front2), ZE + 6))
      });
      const zz = [0, 0, 1], out = ax(PIV, F.e, sd.s * (W2 + T / 2));
      sd.ring.setAttribute("d", poly(disc(out, F.h, zz, 3.4, 24).map(Pv)));
      sd.trun.setAttribute("d", poly(hull(disc(ax(PIV, F.e, sd.s * R), F.h, zz, 2.2, 16).concat(disc(ax(PIV, F.e, sd.s * (W2 - T / 2)), F.h, zz, 2.2, 16)).map(Pv))));
    }
    const lip = disc(PIV, F.e, F.u, R, 72), back = [];
    for (const f of BACK2) for (let i = 0; i < 40; i++) back.push(onDish(F, f * f * R * R / (4 * FOC) - DEP - SK, f * R, 2 * Math.PI * i / 40));
    outline.setAttribute("d", poly(hull(lip.concat(back).map(Pv))));
    seam.setAttribute("d", seen(F, 0.62 * R, 48));
    hubR.setAttribute("d", seen(F, 3.2, 20));
    rim.setAttribute("d", poly(lip.map(Pv)));
    const mouth = onDish(F, FOC - DEP - 3, 0, 0), tail = onDish(F, FOC - DEP + 3, 0, 0);
    struts.setAttribute("d", [90, 210, 330].map((d) => seg(Pv(onDish(F, 0, R, rad(d))), Pv(mouth))).join(""));
    put(feed, {
      sil: poly(hull(disc(mouth, F.e, F.u, 3.6, 16).concat(disc(tail, F.e, F.u, 2.4, 16)).map(Pv))),
      crease: poly(disc(tail, F.e, F.u, 1.3, 16).map(Pv))
    });
  }
  const az = spring(REST2[0], { eps: 0.01 }), el = spring(REST2[1], { eps: 0.01 });
  const B3 = register(stage, (dt) => {
    const a = stepS(az, dt), b = stepS(el, dt);
    draw(az.x, el.x);
    return a || b;
  });
  bag.add(B3.unregister);
  const hub = P(0, 0, ZE);
  function retarget() {
    if (over) {
      az.t = AZ0 - reach * Math.tanh((over[0] - hub[0]) / 120);
      el.t = EL0 + reach / 2 * Math.tanh((hub[1] - over[1]) / 90);
      read.textContent = `az ${Math.round((az.t + 360) % 360)} \xB7 el ${Math.round(el.t)}`;
    } else {
      az.t = REST2[0];
      el.t = REST2[1];
      read.textContent = "rest";
    }
    B3.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => {
      over = p;
      retarget();
    },
    leave: () => {
      over = null;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      reach = v;
      if (over) retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/elevator.ts
var SX = 32;
var SY = 34;
var FH = 36;
var CH2 = 25;
var T2 = 2.5;
var NF = 4;
var TOP = 3 * FH + CH2 + 7;
var CAR = [5, 7, 28, 27];
var RX = 16.5;
var CW = [-8, 11, -2, 23];
var CWH = 17;
var WALL = 2;
var BASE = fillet([[-16, -2], [33, -2], [33, -56], [76, -56], [76, 38], [-16, 38]], [3, 2, 4, 6, 6, 6]);
var FLOOR = fillet([[33, -56], [72, -56], [72, -6], [43, -6], [43, 34], [33, 34]], [4, 4, 4, 3, 3, 3]);
var CWX = (CW[0] + CW[2]) / 2;
var SR = (RX - CWX) / 2;
var SC = [CWX + SR, SY / 2, TOP + 3 + SR + 2];
var REST_Z = 1.5 * FH - 4;
var NAMES = ["ground", "floor 1", "floor 2", "floor 3"];
var mount4 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.3);
  fit(C, [[-16, -56, -8], [76, 38, -8], [76, -56, -8], [-16, 38, -8], [SC[0], SC[1], SC[2] + SR]], 200, 166);
  const P = proj(C), front2 = facing(C);
  const g = mk("g", {}, svg);
  const block = (box, r, b, z0, z1) => {
    const [o, i] = rings(...box, r, b);
    put(solid(g), prism(P, front2, o, i, z0, z1));
  };
  const line = (cls) => mk("path", { class: cls }, g);
  const slab2 = (pts, z0, z1) => {
    const n = pts.length, near = pts.map((p, i) => {
      const q = pts[(i + 1) % n];
      return q[1] - p[1] - (q[0] - p[0]) > 0;
    });
    const runOf = (want) => {
      const s = near.findIndex((f, i) => f === want && near[(i + n - 1) % n] !== want), out = [];
      for (let i = s; near[i % n] === want; i++) out.push(pts[i % n]);
      return out.concat([pts[(s + out.length) % n]]);
    };
    const at2 = (r, z) => r.map((p) => P(p[0], p[1], z)), back = runOf(false), fore = runOf(true);
    const sil = mk("path", { class: "sil", d: poly(at2(back, z1).concat(at2(fore, z0))) }, g);
    mk("path", { class: "nf lo", d: open(at2(fore, z1)) }, g);
    return sil;
  };
  slab2(BASE, -8, -T2);
  block([-14 - WALL, -WALL, -14, SY], 1, 0.5, -T2, TOP);
  block([-14, -WALL, SX, 0], 1, 0.5, -T2, TOP);
  block([RX - 1.3, 3, RX + 1.3, 5.4], 0.8, 0.5, -T2, TOP);
  const [cwo, cwi] = rings(...CW, 1.6, 0.8);
  const cw = solid(g), cwBands = line("nf lo"), cwRope = line("nf");
  const [co, ci] = rings(...CAR, 2.4, 1.1);
  const car = solid(g), door = line("nf"), split = line("nf lo");
  const [ho, hi] = rings(RX - 1.7, 5.4, RX + 1.7, 28.6, 0.8, 0.5);
  const head = solid(g), rope = line("nf");
  block([RX - 1.3, 28.6, RX + 1.3, 31], 0.8, 0.5, -T2, TOP);
  block([-14 - WALL, -WALL, SX + 1, SY + 1], 4, 1.4, TOP, TOP + 3);
  block([CWX + 2, 4, RX - 2, SY / 2 - 3], 2, 1, TOP + 3, SC[2] + 4);
  mk("path", { class: "nf", d: seg(P(RX, SY / 2, TOP + 3), P(RX, SY / 2, SC[2])) + seg(P(CWX, SY / 2, TOP + 3), P(CWX, SY / 2, SC[2])) }, g);
  const disc2 = (y, r) => circ(r, 28).map((q) => P(SC[0] + q.u, y, SC[2] + q.v));
  put(solid(g), { sil: poly(hull(disc2(SY / 2 - 1.8, SR).concat(disc2(SY / 2 + 1.8, SR)))), crease: poly(disc2(SY / 2 + 1.8, SR - 1.4)) });
  const spokes = line("nf lo");
  mk("path", { class: "nf lo", d: poly(disc2(SY / 2 + 1.8, 2.6)) }, g);
  const lands = [];
  for (let f = 0; f < NF; f++) {
    const z = f * FH, sil = slab2(FLOOR, z - T2, z);
    if (f < NF - 1) for (const y of [-53, -15]) block([62, y, 68, y + 6], 1.5, 0.8, z, z + FH - T2);
    const dots = [];
    for (let k = 0; k <= f; k++) {
      const d = flatDot(g, C, 0.8, "dot off");
      place(d, P(37, CAR[1] - 3 - k * 3, z));
      dots.push(d);
    }
    lands.push({ sil, dots });
  }
  const sp = spring(REST_Z, { k: value, c: 1.8 * Math.sqrt(value) });
  let drawn = NaN, chosen = null;
  function draw(z) {
    const zc = 3 * FH - z + 6, mid = (CAR[1] + CAR[3]) / 2;
    put(cw, prism(P, front2, cwo, cwi, zc, zc + CWH));
    cwBands.setAttribute("d", [5, 9, 13].map((v) => seg(P(CW[0] + 0.6, CW[3], zc + v), P(CW[2] - 0.6, CW[3], zc + v))).join(""));
    cwRope.setAttribute("d", seg(P(CWX, SY / 2, zc + CWH), P(CWX, SY / 2, TOP)));
    put(car, prism(P, front2, co, ci, z, z + CH2));
    door.setAttribute("d", poly(rrect(CAR[1] + 3.5, z + 1.2, CAR[3] - 3.5, z + CH2 - 4, 1.2, 4).map((q) => P(CAR[2], q.u, q.v))));
    split.setAttribute("d", seg(P(CAR[2], mid, z + 1.2), P(CAR[2], mid, z + CH2 - 4)));
    put(head, prism(P, front2, ho, hi, z + CH2, z + CH2 + 2.4));
    rope.setAttribute("d", seg(P(RX, SY / 2, z + CH2 + 2.4), P(RX, SY / 2, TOP)));
    const a = z / SR, y = SY / 2 + 1.8, at2 = (t, r) => P(SC[0] + Math.cos(t) * r, y, SC[2] + Math.sin(t) * r);
    spokes.setAttribute("d", [0, 1, 2, 3, 4, 5].map((k) => seg(at2(a + k * Math.PI / 3, 2.6), at2(a + k * Math.PI / 3, SR - 1.4))).join(""));
  }
  const B3 = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) {
      drawn = sp.x;
      draw(sp.x);
    }
    return m;
  });
  bag.add(B3.unregister);
  const base = P(CAR[2], SY / 2, 0)[1], perZ = base - P(CAR[2], SY / 2, 1)[1];
  const pick = (p) => clamp(Math.floor(((base - p[1]) / perZ + 8) / FH), 0, NF - 1);
  function choose(f) {
    if (f === chosen) return;
    chosen = f;
    sp.t = f < 0 ? REST_Z : f * FH;
    car.sil.classList.toggle("hi", f < 0);
    lands.forEach((l, i) => {
      l.sil.classList.toggle("hi", i === f);
      l.dots.forEach((d) => d.setAttribute("class", i === f ? "dot m" : "dot off"));
    });
    read.textContent = f < 0 ? "rest" : NAMES[f];
    B3.wake();
  }
  choose(-1);
  bag.add(pointer(stage, { move: (p) => choose(pick(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      sp.k = v;
      sp.c = 1.8 * Math.sqrt(v);
      B3.wake();
    },
    destroy: bag.dispose
  };
};

// src/figures/exploded.ts
var LAY = [
  { name: "surface", r: [0, 0, 132, 96], rad: 7, segs: [[[1.5, 12], [130.5, 12]]], dots: [[7, 6], [13, 6], [19, 6]] },
  { name: "sidebar", r: [5, 17, 38, 91], rad: 4, segs: [[[10, 25], [28, 25]], [[10, 33], [32, 33]], [[10, 41], [24, 41]], [[10, 49], [30, 49]], [[10, 83], [22, 83]]] },
  { name: "card", r: [48, 22, 120, 62], rad: 5, segs: [[[54, 30], [92, 30]], [[54, 38], [112, 38]], [[54, 46], [104, 46]], [[54, 54], [80, 54]]] },
  { name: "popover", r: [80, 50, 126, 86], rad: 4, segs: [[[86, 58], [118, 58]], [[86, 74], [116, 74]], [[86, 80], [108, 80]]], sel: [83, 62, 123, 70] }
];
var REST3 = 0.18;
var TK = 2.4;
function inside(pt, pg) {
  let c = false;
  for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
    const [xi, yi] = pg[i], [xj, yj] = pg[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
var mount5 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let GAP4 = value, act = -1, lastP = null;
  const e = spring(REST3, { eps: 2e-3 });
  const C = Cam(45, 0.5, 1.42);
  fit(C, [[0, 0, 0], [132, 96, 0], [132, 0, 0], [0, 96, 0], [0, 0, 3 * 34 + TK], [132, 0, 3 * 34 + TK]], 180, 166);
  const P = proj(C), front2 = facing(C);
  const g = mk("g", {}, svg);
  const els = LAY.map((L5, i) => {
    const [ring, inner2] = rings(...L5.r, L5.rad, 1.3);
    const ext = extremes(P, ring);
    const guide = i > 0 ? mk("path", { class: "nf dash" }, g) : null;
    const el = solid(g);
    const marks = mk("path", { class: "nf" }, el.g);
    const selRing = L5.sel ? rrect(...L5.sel, 2) : null;
    const selEl = L5.sel ? mk("path", { class: "nf sil" }, el.g) : null;
    const dotEls = L5.dots ? L5.dots.map(() => flatDot(el.g, C, 1.6, "nf")) : null;
    return { ring, inner: inner2, ext, guide, el, marks, selRing, selEl, dotEls };
  });
  const corners = ([x0, y0, x1, y1], z) => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];
  function pick(p) {
    if (!p) return -1;
    for (let i = LAY.length - 1; i >= 0; i--) if (inside(p, corners(LAY[i].r, i * GAP4 * e.t + TK))) return i;
    return -1;
  }
  function setAct(a) {
    if (a === act) return;
    act = a;
    els.forEach((E2, i) => E2.el.sil.classList.toggle("hi", i === a));
    B3.wake();
  }
  const B3 = register(stage, (dt) => {
    const m = stepS(e, dt), z = (i) => i * GAP4 * e.x;
    LAY.forEach((L5, i) => {
      const E2 = els[i], zi = z(i), zt = zi + TK;
      put(E2.el, prism(P, front2, E2.ring, E2.inner, zi, zt));
      E2.marks.setAttribute("d", L5.segs.map(([a, b]) => seg(P(a[0], a[1], zt), P(b[0], b[1], zt))).join(""));
      if (E2.selEl && E2.selRing) E2.selEl.setAttribute("d", poly(ringAt(P, E2.selRing, zt)));
      if (E2.dotEls && L5.dots) L5.dots.forEach(([dx, dy], k) => place(E2.dotEls[k], P(dx, dy, zt)));
      if (E2.guide) {
        const zp = z(i - 1) + TK;
        E2.guide.setAttribute("d", E2.ext.map((q) => seg(P(q.u, q.v, zi), P(q.u, q.v, zp))).join(""));
      }
    });
    read.textContent = act >= 0 ? `0${act + 1} \xB7 ${LAY[act].name} \xB7 z ${z(act).toFixed(1)}` : `gap ${(GAP4 * e.x).toFixed(1)}`;
    return m;
  });
  bag.add(B3.unregister);
  bag.add(pointer(stage, {
    move: (p) => {
      lastP = p;
      e.t = REST3 + (1 - REST3) * clamp((p[0] - 60) / 280, 0, 1);
      setAct(pick(p));
      B3.wake();
    },
    leave: () => {
      lastP = null;
      e.t = REST3;
      setAct(-1);
      B3.wake();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      GAP4 = v;
      if (lastP) setAct(pick(lastP));
      B3.wake();
    },
    destroy: bag.dispose
  };
};

// src/figures/keyboard.ts
var U2 = 14;
var PAD = 0.8;
var TAPER = 1.8;
var Z02 = 1;
var TRAVEL = 8;
var BZ = 6;
var CASE = 8;
var W3 = 15;
var ROW_H = [12.6, 11.3, 10.4, 11, 11.8];
var L = (s) => s.split(" ").map((c) => [1, "key " + c]);
var ROWS = [
  [[1, "esc"], ...L("1 2 3 4 5 6 7 8 9 0 - ="), [2, "bksp"]],
  [[1.5, "tab"], ...L("q w e r t y u i o p [ ]"), [1.5, "key \\"]],
  [[1.75, "caps"], ...L("a s d f g h j k l ; '"), [2.25, "enter"]],
  [[2.25, "shift l"], ...L("z x c v b n m , . /"), [2.75, "shift r"]],
  [[1.5, "ctrl l"], [1, "super"], [1.5, "alt l"], [7, "space"], [1.5, "alt r"], [1, "fn"], [1.5, "ctrl r"]]
];
var HOMING = ["key f", "key j"];
var falloff2 = (u) => clamp(1 - u, 0, 1);
var mount6 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.42);
  fit(C, [[-BZ, -BZ, -CASE], [W3 * U2 + BZ, 5 * U2 + BZ, -CASE], [W3 * U2 + BZ, -BZ, -CASE], [-BZ, 5 * U2 + BZ, -CASE], [0, 0, ROW_H[0]]], 200, 166);
  const P = proj(C), front2 = facing(C);
  let R6 = value, over = null, lit2 = null;
  const g = mk("g", {}, svg);
  const [cr, ci] = rings(-BZ, -BZ, W3 * U2 + BZ, 5 * U2 + BZ, 9, 2.2);
  put(solid(g), prism(P, front2, cr, ci, -CASE, 0));
  const keys2 = [];
  ROWS.forEach((row, r) => {
    let x = 0;
    for (const [w, name] of row) {
      const x0 = x * U2, x1 = (x + w) * U2, y0 = r * U2, y1 = (r + 1) * U2, t = PAD + TAPER;
      const el = solid(g);
      keys2.push({
        r,
        name,
        x0,
        x1,
        y0,
        y1,
        h: ROW_H[r],
        foot: rrect(x0 + PAD, y0 + PAD, x1 - PAD, y1 - PAD, 2.6, 4),
        top: rrect(x0 + t, y0 + t, x1 - t, y1 - t, 2, 4),
        inner: rrect(x0 + t + 0.9, y0 + t + 0.9, x1 - t - 0.9, y1 - t - 0.9, 1.2, 4),
        el,
        sp: spring(ROW_H[r], { eps: 0.02 }),
        drawn: NaN,
        bump: HOMING.includes(name) ? mk("path", { class: "lo nf" }, el.g) : null
      });
      x += w;
    }
  });
  const enter = keys2.find((k) => k.name === "enter");
  function sink(at2, pressed, radius, depth2) {
    for (const k of keys2) {
      const dx = Math.max(k.x0 - at2[0], 0, at2[0] - k.x1), dy = Math.max(k.y0 - at2[1], 0, at2[1] - k.y1);
      const f = k === pressed ? 1 : falloff2(Math.hypot(dx, dy) / (radius * U2));
      k.sp.t = k.h - TRAVEL * depth2 * f;
    }
  }
  const restAt = [(enter.x0 + enter.x1) / 2, (enter.y0 + enter.y1) / 2];
  sink(restAt, enter, 1.6, 0.6);
  for (const k of keys2) k.sp.x = k.sp.t;
  function drawKey(k) {
    const h = k.sp.x;
    if (h === k.drawn) return;
    k.drawn = h;
    put(k.el, { sil: poly(hull(ringAt(P, k.foot, Z02).concat(ringAt(P, k.top, h)))), crease: open(ringAt(P, run(k.inner, front2), h)) });
    if (k.bump) {
      const cx = (k.x0 + k.x1) / 2, cy = k.y1 - PAD - TAPER - 2.4;
      k.bump.setAttribute("d", seg(P(cx - 2.2, cy, h), P(cx + 2.2, cy, h)));
    }
  }
  function light(k) {
    if (k === lit2) return;
    lit2?.el.sil.classList.remove("hi");
    lit2 = k;
    k.el.sil.classList.add("hi");
  }
  const B3 = register(stage, (dt) => {
    let m = false;
    for (const k of keys2) {
      if (stepS(k.sp, dt)) m = true;
      drawKey(k);
    }
    return m;
  });
  bag.add(B3.unregister);
  const keyAt = (r, x) => keys2.find((k) => k.r === r && x >= k.x0 && x < k.x1);
  function hit(p) {
    for (let r = ROWS.length - 1; r >= 0; r--) {
      const q2 = unproj(C, p[0], p[1], ROW_H[r]);
      if (q2[1] < r * U2 || q2[1] >= (r + 1) * U2 || q2[0] < 0 || q2[0] >= W3 * U2) continue;
      return { at: q2, key: keyAt(r, q2[0]) };
    }
    const q = unproj(C, p[0], p[1], ROW_H[2]);
    if (q[0] < -BZ || q[0] > W3 * U2 + BZ || q[1] < -BZ || q[1] > 5 * U2 + BZ) return null;
    const at2 = [clamp(q[0], 0, W3 * U2 - 0.01), clamp(q[1], 0, 5 * U2 - 0.01)];
    return { at: at2, key: keyAt(Math.floor(at2[1] / U2), at2[0]) };
  }
  function retarget() {
    if (over) {
      sink(over.at, over.key, R6, 1);
      light(over.key);
      read.textContent = over.key.name;
    } else {
      sink(restAt, enter, 1.6, 0.6);
      light(enter);
      read.textContent = "rest";
    }
    B3.wake();
  }
  light(enter);
  bag.add(pointer(stage, {
    move: (p) => {
      over = hit(p);
      retarget();
    },
    leave: () => {
      over = null;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      R6 = v;
      if (over) retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/laptop.ts
var W4 = 150;
var D3 = 106;
var HB = 4;
var T3 = 2.4;
var HZ = HB + T3 / 2;
var R2 = 7;
var B = 1.1;
var MIN = 15;
var REST4 = 100;
var BZ2 = 4.2;
var CHIN = 7.5;
var KU = 8.6;
var KY = 6;
var lidAt = (th) => {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th));
  return (u, v, w) => [u, v * c - w * s, HZ + v * s + w * c];
};
function keys() {
  const out = [], x0 = (W4 - 14.5 * KU) / 2;
  const row = (y2, h2, widths) => {
    let x = x0;
    for (const w of widths) {
      out.push([x, y2, x + w * KU, y2 + h2]);
      x += w * KU;
    }
  };
  const ones = (n) => Array(n).fill(1);
  row(KY, KU * 0.6, Array(14).fill(14.5 / 14));
  let y = KY + KU * 0.6;
  for (const w of [[...ones(13), 1.5], [1.5, ...ones(13)], [1.75, ...ones(11), 1.75], [2.25, ...ones(10), 2.25]]) {
    row(y, KU, w);
    y += KU;
  }
  row(y, KU, [1, 1, 1, 1.25, 5, 1.25, 1]);
  const ax2 = x0 + 11.5 * KU, h = KU / 2;
  out.push([ax2, y + h, ax2 + KU, y + KU], [ax2 + KU, y, ax2 + 2 * KU, y + h], [ax2 + KU, y + h, ax2 + 2 * KU, y + KU], [ax2 + 2 * KU, y + h, ax2 + 3 * KU, y + KU]);
  return { out, y1: y + KU, x0 };
}
var mount7 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let maxA = value, over = null;
  const C = Cam(45, 0.5, 1.3), pts = [[0, 0, 0], [W4, 0, 0], [0, D3, 0], [W4, D3, 0]];
  for (const th of [MIN, 90, REST4, 125]) for (const u of [0, W4]) for (const v of [0, D3]) for (const w of [-T3 / 2, T3 / 2]) pts.push(lidAt(th)(u, v, w));
  fit(C, pts, 200, 166);
  const P = proj(C), front2 = facing(C);
  const o = P(0, 0, 0), ex = P(1, 0, 0), ey = P(0, 1, 0), ez = P(0, 0, 1);
  const r1 = [ex[0] - o[0], ey[0] - o[0], ez[0] - o[0]], r22 = [ex[1] - o[1], ey[1] - o[1], ez[1] - o[1]];
  let eye = [r1[1] * r22[2] - r1[2] * r22[1], r1[2] * r22[0] - r1[0] * r22[2], r1[0] * r22[1] - r1[1] * r22[0]];
  if (eye[2] < 0) eye = eye.map((n) => -n);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const g = mk("g", {}, svg);
  const [br, bi] = rings(0, 0, W4, D3, R2, B);
  put(solid(g), prism(P, front2, br, bi, 0, HB));
  const top = (q) => poly(q.map((s) => P(s.u, s.v, HB)));
  const kb = keys();
  mk("path", { class: "nf lo", d: kb.out.map(([a, b, c, d]) => top(rrect(a + 0.5, b + 0.5, c - 0.5, d - 0.5, 1.1, 2))).join("") }, g);
  mk("path", { class: "nf", d: top(rrect(kb.x0 - 1.6, KY - 1.6, W4 - kb.x0 + 1.6, kb.y1 + 1.6, 3, 4)) }, g);
  mk("path", { class: "nf", d: top(rrect(W4 / 2 - 35, D3 - 45, W4 / 2 + 35, D3 - 5, 3.2, 4)) }, g);
  const lidG = mk("g", {}, g), lid = solid(lidG), scr2 = mk("g", {}, lidG);
  lid.sil.classList.add("hi");
  const [lr, li] = rings(0, 0, W4, D3, R2, B);
  const disp = mk("path", { class: "nf" }, scr2), bar2 = mk("path", { class: "nf lo" }, scr2), dock = mk("path", { class: "nf lo" }, scr2);
  const win = mk("path", {}, scr2), strip2 = mk("path", { class: "nf lo" }, scr2);
  const cam = mk("circle", { r: 0.8, class: "dot off" }, scr2);
  const lights = [0, 1, 2].map(() => mk("circle", { r: 0.8, class: "dot off" }, scr2));
  const VT = D3 - BZ2, WX02 = 30, WX12 = 104, WV0 = CHIN + 16, WV1 = VT - 12;
  let faced = null, drawn = NaN;
  function drawLid(th) {
    if (th === drawn) return;
    drawn = th;
    const f = lidAt(th), c = Math.cos(rad(th)), s = Math.sin(rad(th));
    const at2 = (u, v, w) => P(...f(u, v, w)), on = (u, v) => at2(u, v, -T3 / 2);
    const plane = (q, w) => q.map((p) => at2(p.u, p.v, w));
    const shows = dot([0, s, -c], eye) > 0, wf = shows ? -T3 / 2 : T3 / 2;
    const wall = (q) => dot([q.nu, q.nv * c, q.nv * s], eye) > 0;
    put(lid, { sil: poly(hull(plane(lr, -T3 / 2).concat(plane(lr, T3 / 2)))), crease: open(plane(run(li, wall), wf)) });
    if (shows !== faced) {
      faced = shows;
      if (shows) lid.g.after(scr2);
      else lid.g.before(scr2);
    }
    const face = (q) => poly(q.map((p) => on(p.u, p.v)));
    disp.setAttribute("d", face(rrect(BZ2, CHIN, W4 - BZ2, VT, 3, 4)));
    bar2.setAttribute("d", seg(on(BZ2 + 1.5, VT - 4), on(W4 - BZ2 - 1.5, VT - 4)));
    dock.setAttribute("d", face(rrect(W4 / 2 - 28, CHIN + 2.5, W4 / 2 + 28, CHIN + 8.5, 2.2, 4)));
    win.setAttribute("d", face(rrect(WX02, WV0, WX12, WV1, 2.6, 4)));
    strip2.setAttribute("d", seg(on(WX02, WV1 - 6), on(WX12, WV1 - 6)) + seg(on(WX02 + 20, WV0), on(WX02 + 20, WV1 - 6)));
    place(cam, on(W4 / 2, D3 - BZ2 / 2));
    lights.forEach((el, k) => place(el, on(WX02 + 4 + k * 3.4, WV1 - 3)));
  }
  const sp = spring(REST4, { eps: 0.05 });
  const Bk = register(stage, (dt) => {
    const m = stepS(sp, dt);
    drawLid(sp.x);
    return m;
  });
  bag.add(Bk.unregister);
  drawLid(REST4);
  const yTop = P(W4 / 2, 0, HZ + D3)[1] + 12, yBot = P(W4 / 2, D3, 0)[1] - 12;
  function retarget() {
    if (over === null) {
      sp.t = Math.min(REST4, maxA);
      read.textContent = "rest";
    } else {
      sp.t = lerp(maxA, MIN, clamp((over - yTop) / (yBot - yTop), 0, 1));
      read.textContent = sp.t <= MIN + 0.5 ? "shut" : sp.t >= maxA - 0.5 ? "open" : `lid ${Math.round(sp.t)}\xB0`;
    }
    Bk.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => {
      over = p[1];
      retarget();
    },
    leave: () => {
      over = null;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      maxA = v;
      retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/lockers.ts
var COLS = 6;
var ROWS2 = 2;
var W5 = 24;
var HR = 38;
var GAP = 1.2;
var FM = 3;
var ZP = 6;
var D4 = 26;
var T4 = 1.4;
var DEP2 = 23;
var BW = COLS * W5 + 2 * FM;
var BH2 = ROWS2 * HR + 2 * FM;
var DW = W5 - 2 * GAP;
var DH = HR - 2 * GAP;
var REST_I = 5;
var REST_A = 22;
var FAR = 120;
var OUTLINE = rrect(0, 0, DW, DH, 1.8, 4);
var VENTS = [0, 1, 2].map((k) => rrect(4, DH - 6.6 - k * 3.2, DW - 4, DH - 5.2 - k * 3.2, 0.7, 2));
var PLATE = rrect(DW / 2 - 4.5, DH - 19, DW / 2 + 4.5, DH - 15, 1, 3);
var CUP = rrect(DW - 5.6, DH / 2 - 7, DW - 2.8, DH / 2 + 2, 1.2, 3);
var FRAME = rrect(2.6, 2.6, DW - 2.6, DH - 2.6, 1.4, 3);
var area = (pts) => pts.reduce((s, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return s + p[0] * q[1] - q[0] * p[1];
}, 0);
var mount8 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.6);
  const sw = [Math.cos(rad(FAR)) * DW, Math.sin(rad(FAR)) * DW];
  fit(C, [
    [-4, -4, 0],
    [BW + 4, D4 + 4, 0],
    [BW + 4, -4, 0],
    [-4, D4 + 4, 0],
    [0, 0, ZP + BH2],
    [BW, 0, ZP + BH2],
    [FM + sw[0], D4 + sw[1], ZP + FM],
    [FM + sw[0], D4 + sw[1], ZP + BH2 - FM]
  ], 200, 166);
  const P = proj(C), front2 = facing(C);
  let MAX2 = value, act = -1;
  function onFace(p, y0) {
    const o = P(0, y0, 0), a = P(1, y0, 0), b = P(0, y0, 1);
    const ex = [a[0] - o[0], a[1] - o[1]], ez = [b[0] - o[0], b[1] - o[1]], det = ex[0] * ez[1] - ex[1] * ez[0];
    const qx = p[0] - o[0], qy = p[1] - o[1];
    return [(qx * ez[1] - qy * ez[0]) / det, (ex[0] * qy - ex[1] * qx) / det];
  }
  function through(A, B4, L5) {
    const pa = P(...A), pb = P(...B4), a = onFace(pa, D4), b = onFace(pb, D4), m = 0.9;
    let t0 = 0, t1 = 1;
    const lim = [[a[0] - b[0], a[0] - (L5.x0 + m)], [b[0] - a[0], L5.x0 + DW - m - a[0]], [a[1] - b[1], a[1] - (L5.z0 + m)], [b[1] - a[1], L5.z0 + DH - m - a[1]]];
    for (const [p, q] of lim) {
      if (p === 0) {
        if (q < 0) return "";
        continue;
      }
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
    if (t1 - t0 < 0.01) return "";
    const at2 = (t) => [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
    return seg(at2(t0), at2(t1));
  }
  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-4, -4, BW + 4, D4 + 4, 5, 1.6);
  put(solid(g), prism(P, front2, pr, pi, 0, ZP));
  const [br, bi] = rings(0, 0, BW, D4, 3, 1.4);
  put(solid(g), prism(P, front2, br, bi, ZP, ZP + BH2));
  const lockers2 = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS2; r++) {
    const x0 = FM + c * W5 + GAP, z0 = ZP + FM + r * HR + GAP;
    const lg = mk("g", {}, g);
    mk("path", { d: poly(OUTLINE.map((q) => P(x0 + q.u, D4, z0 + q.v))), class: "" }, lg);
    const L5 = { c, r, n: (ROWS2 - 1 - r) * COLS + c + 1, x0, z0, drawn: NaN, sign0: 0, tw: tween(0) };
    const zs = L5.z0 + DH - 9.5, x1 = L5.x0 + DW;
    const inside3 = [
      through([L5.x0, D4, L5.z0], [L5.x0, D4 - DEP2, L5.z0], L5),
      through([L5.x0, D4 - 1.6, zs], [x1, D4 - 1.6, zs], L5),
      through([L5.x0, D4 - 1.6, zs], [L5.x0, D4 - DEP2, zs], L5)
    ].join("");
    mk("path", { d: inside3, class: "nf lo" }, lg);
    L5.plate = mk("path", { class: "lo" }, lg);
    L5.face = mk("path", { class: "sil" }, lg);
    L5.marks = mk("path", { class: "nf lo" }, lg);
    L5.cup = mk("path", { class: "nf" }, lg);
    lockers2.push(L5);
  }
  const byN = (n) => lockers2.find((L5) => L5.n === n);
  function drawDoor(L5, th) {
    if (th === L5.drawn) return;
    L5.drawn = th;
    const cs = Math.cos(rad(th)), sn = Math.sin(rad(th));
    const at2 = (s2) => (q) => P(L5.x0 + q.u * cs - s2 * sn, D4 + T4 / 2 + q.u * sn + s2 * cs, L5.z0 + q.v);
    const fr = OUTLINE.map(at2(T4 / 2)), bk = OUTLINE.map(at2(-T4 / 2));
    const outward = area(fr) * L5.sign0 > 0, s = outward ? T4 / 2 : -T4 / 2;
    L5.plate.setAttribute("d", poly(hull(fr.concat(bk))));
    L5.face.setAttribute("d", poly(outward ? fr : bk));
    const marks = outward ? [...VENTS, PLATE] : [...VENTS, FRAME];
    L5.marks.setAttribute("d", marks.map((m) => poly(m.map(at2(s)))).join(""));
    L5.cup.setAttribute("d", outward ? poly(CUP.map(at2(s))) : "");
  }
  for (const L5 of lockers2) L5.sign0 = Math.sign(area(OUTLINE.map((q) => P(L5.x0 + q.u, D4 + T4, L5.z0 + q.v))));
  const B3 = register(stage, (_dt, now) => {
    let m = false;
    for (const L5 of lockers2) {
      drawDoor(L5, tval(L5.tw, now));
      if (!tdone(L5.tw, now)) m = true;
    }
    return m;
  });
  bag.add(B3.unregister);
  function hit(p) {
    const [x, z] = onFace(p, D4 + T4);
    if (x < 0 || x > BW || z < ZP || z > ZP + BH2) return -1;
    const c = clamp(Math.floor((x - FM) / W5), 0, COLS - 1), r = clamp(Math.floor((z - ZP - FM) / HR), 0, ROWS2 - 1);
    return (ROWS2 - 1 - r) * COLS + c + 1;
  }
  function choose(n, force) {
    if (n === act && !force) return;
    act = n;
    const now = performance.now(), lit2 = n > 0 ? n : REST_I;
    for (const L5 of lockers2) {
      tset(L5.tw, L5.n === n ? MAX2 : n <= 0 && L5.n === REST_I ? REST_A : 0, now, 0);
      L5.face.classList.toggle("hi", L5.n === lit2);
      L5.cup.classList.toggle("hi", L5.n === lit2);
    }
    read.textContent = n > 0 ? "locker " + String(n).padStart(2, "0") : "rest";
    B3.wake();
  }
  byN(REST_I).tw = tween(REST_A);
  choose(0, true);
  bag.add(pointer(stage, { move: (p) => choose(Math.max(0, hit(p))), leave: () => choose(0) }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      MAX2 = v;
      if (act > 0) choose(act, true);
    },
    destroy: bag.dispose
  };
};

// src/figures/padlock.ts
var W6 = 56;
var D5 = 20;
var H2 = 44;
var B2 = 1.6;
var T5 = 4.2;
var S2 = 30;
var XL = 13;
var YC = D5 / 2;
var ARM = 13;
var SINK = 7;
var LIFT2 = 11;
var O1 = 0.42;
var REST_TURN = 26;
var R0 = 56;
var R1 = 200;
var SC2 = 2.75;
var TMAX = 100;
var VX = Math.SQRT1_2 * Math.sqrt(3);
var ss = (t) => t * t * (3 - 2 * t);
function samples(pts) {
  return pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    return { u: p[0], v: p[1], nu: tz / l, nv: -tx / l };
  });
}
function cross(p, q, r, s) {
  const e0 = q[0] - p[0], e1 = q[1] - p[1], f0 = s[0] - r[0], f1 = s[1] - r[1], g0 = r[0] - p[0], g1 = r[1] - p[1];
  const d = e0 * f1 - e1 * f0;
  if (!d) return null;
  const t = (g0 * f1 - g1 * f0) / d, u = (g0 * e1 - g1 * e0) / d;
  return t > 0 && t < 1 && u > 0 && u < 1 ? [p[0] + t * e0, p[1] + t * e1] : null;
}
function untangle(L5) {
  for (let i = 0; i < L5.length - 3; i++) for (let j = L5.length - 2; j > i + 1; j--) {
    const x = cross(L5[i], L5[i + 1], L5[j], L5[j + 1]);
    if (x) {
      L5.splice(i + 1, j - i, x);
      break;
    }
  }
  return L5;
}
function tube(Q, rho) {
  const n = Q.length, A = [], Bk = [];
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(i - 1, 0)], c = Q[i], b = Q[Math.min(i + 1, n - 1)];
    const u0 = [c[0] - a[0], c[1] - a[1]], u1 = [b[0] - c[0], b[1] - c[1]];
    const l0 = Math.hypot(u0[0], u0[1]) || 1, l1 = Math.hypot(u1[0], u1[1]) || 1;
    let tx = u0[0] / l0 + u1[0] / l1, ty = u0[1] / l0 + u1[1] / l1;
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    A.push([c[0] - ty * rho, c[1] + tx * rho]);
    Bk.push([c[0] + ty * rho, c[1] - tx * rho]);
  }
  const cap = (c) => {
    const o = [];
    for (let k = 7; k >= 1; k--) {
      const t = Math.PI * k / 8;
      o.push([c[0] + rho * Math.cos(t), c[1] + rho * 0.5 * Math.sin(t)]);
    }
    return o;
  };
  return poly([...untangle(A), ...cap(Q[n - 1]), ...untangle(Bk).reverse(), ...cap(Q[0])]);
}
var mount9 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const tm = spring(value);
  let over = false;
  const line = (P2, lift, th) => {
    const u = [Math.cos(rad(th)), -Math.sin(rad(th))], za = H2 + ARM + lift, r = S2 / 2;
    const at2 = (s, z) => P2(XL + u[0] * s, YC + u[1] * s, z);
    const pts = [at2(S2, Math.max(H2 - SINK + lift, H2)), at2(S2, za)];
    for (let i = 1; i < 28; i++) {
      const f = Math.PI * i / 28;
      pts.push(at2(r + r * Math.cos(f), za + r * Math.sin(f)));
    }
    pts.push(at2(0, za), at2(0, H2));
    return pts;
  };
  const C = Cam(45, 0.5, SC2);
  const id = (x, y, z) => [x, y, z];
  const ext = [[0, 0, 0], [W6, 0, 0], [0, D5, 0], [W6, D5, 0], [0, 0, H2]];
  for (const th of [0, 40, 80, TMAX]) for (const p of line(id, LIFT2, th)) ext.push([p[0], p[1], p[2] + T5]);
  fit(C, ext, 200, 170);
  const P = proj(C), rho = T5 * SC2;
  const face = fillet([[0, 0], [W6, 0], [W6, H2], [0, H2]], [14, 14, 7, 7], 12);
  const inner2 = samples(fillet([[B2, B2], [W6 - B2, B2], [W6 - B2, H2 - B2], [B2, H2 - B2]], [14 - B2, 14 - B2, 7 - B2, 7 - B2], 12));
  const g = mk("g", {}, svg);
  put(solid(g), {
    sil: poly(hull(face.map((p) => P(p[0], 0, p[1])).concat(face.map((p) => P(p[0], D5, p[1]))))),
    crease: open(run(inner2, (q) => q.nu * VX + q.nv > 0).map((q) => P(q.u, D5, q.v)))
  });
  const kx = W6 / 2, kz = H2 * 0.56, kr = 4.4, kw = 1.8, kb = kz - 12, a0 = Math.asin(kw / kr), key = [];
  for (let i = 0; i <= 20; i++) {
    const t = -Math.PI / 2 + a0 + (2 * Math.PI - 2 * a0) * i / 20;
    key.push([kx + kr * Math.cos(t), kz + kr * Math.sin(t)]);
  }
  for (let i = 0; i <= 6; i++) {
    const t = Math.PI + Math.PI * i / 6;
    key.push([kx + kw * Math.cos(t), kb + kw * Math.sin(t)]);
  }
  mk("path", { d: poly(key.map((p) => P(p[0], D5, p[1]))), class: "nf" }, g);
  const hole = circ(T5 + 1.3, 20);
  for (const x of [XL, XL + S2]) mk("path", { d: poly(hole.map((q) => P(x + q.u, YC + q.v, H2))), class: "nf lo" }, g);
  const bar2 = mk("path", { class: "sil" }, g);
  const pose2 = (o, max) => [LIFT2 * ss(clamp(o / O1, 0, 1)), max * ss(clamp((o - O1) / (1 - O1), 0, 1))];
  const restO = () => O1 + (1 - O1) * (0.5 - Math.sin(Math.asin(1 - 2 * REST_TURN / tm.t) / 3));
  const sp = spring(restO(), { eps: 2e-3 });
  let dO = NaN, dT = NaN;
  function draw() {
    if (sp.x === dO && tm.x === dT) return;
    dO = sp.x;
    dT = tm.x;
    const [lift, th] = pose2(sp.x, tm.x);
    bar2.setAttribute("d", tube(line(P, lift, th), rho));
  }
  const loop = register(stage, (dt) => {
    const a = stepS(sp, dt), b = stepS(tm, dt);
    draw();
    return a || b;
  });
  bag.add(loop.unregister);
  const c0 = P(W6 / 2, D5 / 2, H2 / 2);
  function retarget() {
    const [lift, th] = pose2(sp.t, tm.t), shut = over && lift < SINK;
    read.textContent = !over ? "rest" : shut ? "locked" : th < 1 ? "open" : Math.round(th) + "\xB0";
    bar2.classList.toggle("hi", !shut);
    loop.wake();
  }
  retarget();
  bag.add(pointer(stage, {
    move: (p) => {
      over = true;
      sp.t = clamp((R1 - Math.hypot(p[0] - c0[0], p[1] - c0[1])) / (R1 - R0), 0, 1);
      retarget();
    },
    leave: () => {
      over = false;
      sp.t = restO();
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      tm.t = v;
      if (!over) sp.t = restO();
      retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/patch.ts
var NC = 12;
var PITCH = 15;
var GAP2 = 8;
var EAR2 = 15;
var MAR = 5;
var H3 = 44;
var T6 = 2.6;
var DEEP = 18;
var X02 = EAR2 + MAR;
var W7 = 2 * X02 + NC * PITCH + GAP2;
var ZT2 = 30;
var ZB3 = 12.5;
var JW = 5;
var JH = 4.2;
var NW = 1.9;
var NH = 1.7;
var JD = 2.4;
var PW = 4.3;
var PH2 = 3.5;
var PL = 4;
var BL = 5;
var CR2 = 1.8;
var OUT2 = 6;
var LEAN = 10;
var LZ = 7;
var LIFT3 = 9;
var EMPTY = [2, 10, 18];
var REST5 = 7;
var HIT_Y = 2.5;
var JIT = (p) => [p * 7 % 5 - 2, p * 11 % 7 - 3];
var falloff3 = (d, R6) => d === 0 ? 0 : clamp(1 - (d - 1) / R6, 0, 1);
function tube2(q, w) {
  const n = q.length, L5 = [], Rt = [], nrm = [];
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    nrm.push(t);
    L5.push([q[i][0] - t[1] * w, q[i][1] + t[0] * w]);
    Rt.push([q[i][0] + t[1] * w, q[i][1] - t[0] * w]);
  }
  const cap = (c, t, s) => {
    const out = [];
    for (let k = 1; k < 6; k++) {
      const th = k / 6 * Math.PI, cs = Math.cos(th), sn = Math.sin(th);
      out.push([c[0] + s * w * (-t[1] * cs + t[0] * sn), c[1] + s * w * (t[0] * cs + t[1] * sn)]);
    }
    return out;
  };
  return poly([...L5, ...cap(q[n - 1], nrm[n - 1], 1), ...Rt.reverse(), ...cap(q[0], nrm[0], -1)]);
}
var mount10 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const S = 1.5, C = Cam(45, 0.5, S);
  const tipZ = ZT2 + 27 + LIFT3 + LZ, lowZ = ZB3 - 26 - LZ;
  fit(C, [[0, -DEEP, H3], [W7, -DEEP, H3], [0, 0, 0], [W7, 0, 0], [X02, 34, tipZ], [W7 - X02, 34, lowZ], [X02, 34, lowZ]], 200, 166);
  const P = proj(C), front2 = facing(C);
  let R6 = value, over = -1, lit2 = null;
  const at2 = (ring, cx, y, cz) => ring.map((q) => P(cx + q.u, y, cz + q.v));
  const seen = (q) => 0.612 * q.nu + 0.5 * q.nv > 0;
  const slab2 = (ring, inner2, cx, cz, y0, y1) => ({
    sil: poly(hull(at2(ring, cx, y0, cz).concat(at2(ring, cx, y1, cz)))),
    crease: open(at2(run(inner2, seen), cx, y1, cz))
  });
  const g = mk("g", {}, svg);
  const [br, bi] = rings(EAR2 + 2, -DEEP, W7 - EAR2 - 2, -T6, 3, 1.6);
  put(solid(g), prism(P, front2, br, bi, 3, H3 - 3));
  put(solid(g), slab2(rrect(0, 0, W7, H3, 3, 4), rrect(0.7, 0.7, W7 - 0.7, H3 - 0.7, 2.3, 4), 0, 0, -T6, 0));
  const flat = (ring) => ring.map((q) => [q.u, q.v]);
  const face = (pts, cls) => mk("path", { d: poly(pts.map(([x, z]) => P(x, 0, z))), class: cls }, g);
  for (const ex2 of [EAR2 / 2 + 1, W7 - EAR2 / 2 - 1]) for (const ez2 of [8, H3 - 8]) {
    face(flat(rrect(ex2 - 3.4, ez2 - 1.5, ex2 + 3.4, ez2 + 1.5, 1.5, 3)), "nf");
  }
  const ports = [];
  for (let p = 0; p < 2 * NC; p++) {
    const r = p < NC ? 0 : 1, c = p % NC;
    ports.push({ p, r, c, cx: X02 + (c + 0.5) * PITCH + (c >= 6 ? GAP2 : 0), cz: r ? ZB3 : ZT2, full: !EMPTY.includes(p) });
  }
  for (const m of [0, 6]) {
    const a = ports[m].cx - PITCH / 2 + 1, b = ports[m + 5].cx + PITCH / 2 - 1;
    face(flat(rrect(a, ZB3 - JH - 3, b, ZT2 + JH + NH + 2.6, 2.4, 4)), "lo nf");
  }
  const jack = fillet([[-JW, -JH], [JW, -JH], [JW, JH], [NW, JH], [NW, JH + NH], [-NW, JH + NH], [-NW, JH], [-JW, JH]], [1, 1, 1, 0.4, 0.5, 0.5, 0.4, 1]);
  for (const pt of ports) {
    const { cx, cz } = pt, d = JD;
    pt.jack = face(jack.map(([u, v]) => [cx + u, cz + v]), "nf");
    mk("path", { d: open([[-JW + d, JH], [-JW + d, -JH + 0.816 * d], [JW, -JH + 0.816 * d]].map(([u, v]) => P(cx + u, 0, cz + v))), class: "lo nf" }, g);
  }
  const plugG = mk("g", {}, g), cabG = mk("g", {}, g);
  const plug = rrect(-PW, -PH2, PW, PH2, 1.2, 3), plugIn = rrect(-PW + 0.7, -PH2 + 0.7, PW - 0.7, PH2 - 0.7, 0.6, 3);
  const bootA = rrect(-3.7, -3, 3.7, 3, 1.6, 3), bootB = rrect(-2.4, -2.4, 2.4, 2.4, 2.3, 3);
  const order2 = ports.slice().sort((a, b) => a.c - b.c || a.r - b.r);
  for (const pt of order2) {
    pt.pull = spring(0, { eps: 2e-3 });
    pt.lx = spring(0, { eps: 0.01 });
    pt.lz = spring(0, { eps: 0.01 });
    if (!pt.full) continue;
    pt.plug = solid(plugG);
    pt.latch = mk("path", { class: "lo nf" }, pt.plug.g);
    pt.boot = solid(plugG);
    pt.cable = mk("path", { class: "sil" }, cabG);
    pt.drawn = "";
  }
  function drawPort(pt) {
    const k = pt.pull.x, lx = pt.lx.x, lz = pt.lz.x, key = [k, lx, lz].map((v) => v.toFixed(3)).join();
    if (key === pt.drawn) return;
    pt.drawn = key;
    const { cx, cz, r, p } = pt, y1 = PL + OUT2 * k, y2 = y1 + BL, up = r ? -1 : 1, [jx, jz] = JIT(p);
    put(pt.plug, slab2(plug, plugIn, cx, cz, 0, y1));
    pt.latch.setAttribute("d", seg(P(cx, 0.6, cz + PH2), P(cx, y1 - 0.8, cz + PH2)));
    put(pt.boot, { sil: poly(hull(at2(bootA, cx, y1, cz).concat(at2(bootB, cx, y2, cz)))), crease: "" });
    const out = r ? 6 : 2, lean = r ? 2 : 3;
    const p0 = [cx, y2 - 1.5, cz], p1 = r ? [cx + 0.5, y2 + out + 4 * k, cz] : [cx, y2 + 1 + 2 * k, cz + 6];
    const p3 = [cx + lean + jx + lx, y2 + out + 1 + LIFT3 * k, cz + up * (24 + jz) + lz + LIFT3 * k], p2 = [p3[0] - 0.6, p3[1] - 1, p3[2] - up * 12];
    const q = [];
    for (let i = 0; i <= 16; i++) {
      const s = i / 16, a = (1 - s) ** 3, b = 3 * (1 - s) ** 2 * s, c = 3 * (1 - s) * s * s, d = s ** 3;
      q.push(P(...[0, 1, 2].map((j) => a * p0[j] + b * p1[j] + c * p2[j] + d * p3[j])));
    }
    pt.cable.setAttribute("d", tube2(q, CR2 * S));
  }
  function aim(a, radius, depth2) {
    const A = ports[a];
    for (const pt of ports) {
      const dx = pt.c - A.c, dr = pt.r - A.r, d = Math.hypot(dx, dr), f = falloff3(d, radius) * depth2;
      pt.pull.t = pt === A ? depth2 : 0;
      pt.lx.t = d ? clamp(dx / d * f * LEAN, -LEAN, LEAN) : 0;
      pt.lz.t = d ? clamp(-dr / d * f * LZ, -LZ, LZ) : 0;
    }
  }
  function light(pt) {
    if (pt === lit2) return;
    const mark = (q, on) => (q.full ? [q.plug.sil, q.boot.sil, q.cable] : [q.jack]).forEach((el) => el.classList.toggle("hi", on));
    if (lit2) mark(lit2, false);
    lit2 = pt;
    mark(pt, true);
  }
  aim(REST5, 1.6, 0.55);
  for (const pt of ports) for (const s of [pt.pull, pt.lx, pt.lz]) s.x = s.t;
  light(ports[REST5]);
  read.textContent = "rest";
  const B3 = register(stage, (dt) => {
    let m = false;
    for (const pt of ports) {
      for (const s of [pt.pull, pt.lx, pt.lz]) if (stepS(s, dt)) m = true;
      if (pt.full) drawPort(pt);
    }
    return m;
  });
  bag.add(B3.unregister);
  const o = P(0, HIT_Y, 0), ux = P(1, HIT_Y, 0), uz = P(0, HIT_Y, 1);
  const ex = [ux[0] - o[0], ux[1] - o[1]], ez = [uz[0] - o[0], uz[1] - o[1]], det = ex[0] * ez[1] - ex[1] * ez[0];
  function hit([sx, sy]) {
    const qx = sx - o[0], qy = sy - o[1], x = (qx * ez[1] - qy * ez[0]) / det, z = (ex[0] * qy - ex[1] * qx) / det;
    if (x < X02 - 2 || x > W7 - X02 + 2 || z < ZB3 - JH - 6 || z > ZT2 + JH + 8) return -1;
    let best = -1, bd = Infinity;
    for (const pt of ports) {
      const dd = Math.abs(pt.cx - x) + (Math.abs(pt.cz - z) > (ZT2 - ZB3) / 2 ? 1e3 : 0);
      if (dd < bd) {
        bd = dd;
        best = pt.p;
      }
    }
    return best;
  }
  function retarget() {
    if (over >= 0) {
      aim(over, R6, 1);
      light(ports[over]);
      read.textContent = "port " + String(over + 1).padStart(2, "0");
    } else {
      aim(REST5, 1.6, 0.55);
      light(ports[REST5]);
      read.textContent = "rest";
    }
    B3.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => {
      const h = hit(p);
      if (h !== over) {
        over = h;
        retarget();
      }
    },
    leave: () => {
      over = -1;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      R6 = v;
      if (over >= 0) retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/phone.ts
var W8 = 68;
var L2 = 140;
var R3 = 11;
var GMAX = 40;
var TG = 2;
var TB = 1.6;
var TC = 1.8;
var TBAT = 7;
var TS = 6;
var TBUMP = 2.2;
var TL = 0.9;
var STACK = TG + TB + TC + TBAT + TS + TBUMP + TL;
var NAMES2 = ["glass", "board", "battery", "shell"];
var REST6 = [0.36, 0.3, 1.2];
var MIN2 = 0.08;
var PIVOT = 1;
var BOARD = [[4, L2 - 44], [W8 - 4, L2 - 44], [W8 - 4, L2 - 5], [36, L2 - 5], [36, L2 - 30], [4, L2 - 30]];
var BAT = [9, 12, W8 - 9, L2 - 48];
var CHIPS = [
  [10, L2 - 41, 26, L2 - 34, 1.4],
  [45, L2 - 40, 54, L2 - 35, 1.2],
  [57, L2 - 42, 62, L2 - 36, 1.2],
  [42, L2 - 27, 56, L2 - 13, 1.8]
];
var RECT = [[0, 0], [W8, 0], [W8, L2], [0, L2]];
var FOOT = [RECT, BOARD, [[BAT[0], BAT[1]], [BAT[2], BAT[1]], [BAT[2], BAT[3]], [BAT[0], BAT[3]]], RECT];
var THICK = [TG, TB, TBAT, TS];
function bases(g) {
  const b = [0], t = [TG, TB + TC, TBAT];
  for (let j = 0; j < 3; j++) b.push(b[j] + t[j] + g[j]);
  const mid = (b[3] + TS + TBUMP + TL) / 2;
  return b.map((z) => z - mid);
}
function inside2(pt, pg) {
  let c = false;
  for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
    const [xi, yi] = pg[i], [xj, yj] = pg[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
var at = (ring, cx, cy) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));
var mount11 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let GAP4 = value, share = null, act = -1, origin = PIVOT, lastP = null;
  const C = Cam(45, 0.5, 1.5), H7 = (STACK + 3 * GMAX) / 2;
  fit(C, [[0, 0, -H7], [W8 + 2.2, L2, -H7], [W8 + 2.2, 0, -H7], [0, L2, -H7], [0, 0, H7], [W8 + 2.2, 0, H7], [0, L2, H7]], 200, 166);
  const P = proj(C), front2 = facing(C);
  const flat = (pts, z) => poly(pts.map(([x, y]) => P(x, y, z)));
  const g = mk("g", {}, svg);
  const outer = rrect(0, 0, W8, L2, R3, 8);
  const ext = extremes(P, outer).slice(0, 2), guide = mk("path", { class: "nf dash" }, g);
  const gg = mk("g", {}, g), glass = solid(gg), gIn = rrect(1.2, 1.2, W8 - 1.2, L2 - 1.2, R3 - 1.2, 8);
  const DISP = fillet([[4, 4], [W8 - 4, 4], [W8 - 4, L2 - 4], [W8 / 2 + 12, L2 - 4], [W8 / 2 + 12, L2 - 10], [W8 / 2 - 12, L2 - 10], [W8 / 2 - 12, L2 - 4], [4, L2 - 4]], [7.5, 7.5, 7.5, 2, 3.5, 3.5, 2, 7.5]);
  const disp = mk("path", { class: "nf" }, gg), lensF = mk("path", { class: "nf" }, gg), slit = mk("path", { class: "nf lo" }, gg);
  const camF = at(circ(1.5, 16), W8 / 2 + 6, L2 - 7);
  const bg = mk("g", {}, g), BF = fillet(BOARD, [4, 4, 4, 4, 3, 4]);
  const bBack = mk("path", { class: "lo" }, bg), bFace = mk("path", { class: "sil" }, bg);
  const chips = CHIPS.map(([x0, y0, x1, y1, h]) => {
    const [ring, inner2] = rings(x0, y0, x1, y1, 1.5, 0.7);
    return { ring, inner: inner2, h, el: solid(bg) };
  });
  const tg = mk("g", {}, g), battery = solid(tg), [batR, batI] = rings(...BAT, 6, 1.6);
  const TAB = fillet([[41, L2 - 48], [52, L2 - 48], [52, L2 - 31], [41, L2 - 31]], [0.5, 0.5, 2, 2]);
  const tBack = mk("path", { class: "lo" }, tg), tFace = mk("path", {}, tg), conn = solid(tg);
  const [conR, conI] = rings(42, L2 - 38, 51, L2 - 32, 1.5, 0.7);
  const sg = mk("g", {}, g), shell = solid(sg), sIn = rrect(1.8, 1.8, W8 - 1.8, L2 - 1.8, R3 - 1.8, 8);
  const buttons = [[L2 - 68, L2 - 58], [L2 - 54, L2 - 44]].map(([y0, y1]) => {
    const [ring, inner2] = rings(W8 - 0.5, y0, W8 + 2.2, y1, 1.2, 0.5);
    return { ring, inner: inner2, el: solid(sg) };
  });
  const bump = solid(sg), bumpR = rrect(7, L2 - 33, 33, L2 - 7, 7, 6), bumpI = rrect(8, L2 - 32, 32, L2 - 8, 6, 6);
  const lenses = [[14.5, L2 - 25.5], [25.5, L2 - 14.5]].map(([x, y]) => {
    const el = solid(sg);
    return { ring: at(circ(4.6, 24), x, y), inner: at(circ(3.6, 24), x, y), eye: at(circ(1.9, 16), x, y), el, glass: mk("path", { class: "nf lo" }, el.g) };
  });
  const flash = mk("path", { class: "nf" }, sg), FL = at(circ(1.7, 16), 25.5, L2 - 25.5);
  const draw = [
    (z) => {
      put(glass, prism(P, front2, outer, gIn, z, z + TG));
      const t = z + TG;
      disp.setAttribute("d", flat(DISP, t));
      lensF.setAttribute("d", poly(ringAt(P, camF, t)));
      slit.setAttribute("d", seg(P(W8 / 2 - 6, L2 - 7, t), P(W8 / 2 + 1.5, L2 - 7, t)));
    },
    (z) => {
      bBack.setAttribute("d", flat(BF, z));
      bFace.setAttribute("d", flat(BF, z + TB));
      for (const c of chips) put(c.el, prism(P, front2, c.ring, c.inner, z + TB, z + TB + c.h));
    },
    (z) => {
      put(battery, prism(P, front2, batR, batI, z, z + TBAT));
      tBack.setAttribute("d", flat(TAB, z + 0.8));
      tFace.setAttribute("d", flat(TAB, z + 1.4));
      put(conn, prism(P, front2, conR, conI, z + 1.4, z + 2.6));
    },
    (z) => {
      put(shell, prism(P, front2, outer, sIn, z, z + TS));
      for (const b of buttons) put(b.el, prism(P, front2, b.ring, b.inner, z + 1.6, z + 4.4));
      const t = z + TS, u = t + TBUMP;
      put(bump, prism(P, front2, bumpR, bumpI, t, u));
      for (const l of lenses) {
        put(l.el, prism(P, front2, l.ring, l.inner, u, u + TL));
        l.glass.setAttribute("d", poly(ringAt(P, l.eye, u + TL)));
      }
      flash.setAttribute("d", poly(ringAt(P, FL, u)));
    }
  ];
  const sils = [glass.sil, bFace, battery.sil, shell.sil];
  const targets = () => [0, 1, 2].map((j) => GAP4 * (share === null ? REST6[j] : share));
  const gs = targets().map((t) => spring(t, { eps: 0.01 }));
  const drawn = [NaN, NaN, NaN, NaN];
  const B3 = register(stage, (dt) => {
    const T10 = targets(), order2 = [0, 1, 2].sort((a, b2) => Math.abs(a + 0.5 - origin) - Math.abs(b2 + 0.5 - origin));
    let m = false;
    for (const j of order2) {
      const d = j + 0.5 - origin, k = d > 0 ? j - 1 : j + 1;
      gs[j].t = Math.abs(d) < 1 ? T10[j] : T10[j] + gs[k].x - T10[k];
      if (stepS(gs[j], dt)) m = true;
    }
    const b = bases(gs.map((s) => s.x));
    let changed = false;
    b.forEach((z, i) => {
      if (z !== drawn[i]) {
        drawn[i] = z;
        draw[i](z);
        changed = true;
      }
    });
    if (changed) guide.setAttribute("d", ext.map((q) => seg(P(q.u, q.v, b[3]), P(q.u, q.v, b[0] + TG))).join(""));
    return m;
  });
  bag.add(B3.unregister);
  function pick(p) {
    const b = bases(targets());
    for (let i = 3; i >= 0; i--) {
      const f = FOOT[i], top = f.map(([x, y]) => P(x, y, b[i] + THICK[i]));
      const shape = i === 1 ? top : hull(top.concat(f.map(([x, y]) => P(x, y, b[i]))));
      if (inside2(p, shape)) return i;
    }
    let best = 0, bd = Infinity;
    b.forEach((z, i) => {
      const dy = Math.abs(P(W8 / 2, L2 / 2, z + THICK[i])[1] - p[1]);
      if (dy < bd) {
        bd = dy;
        best = i;
      }
    });
    return best;
  }
  function setAct(a) {
    if (a >= 0) origin = a;
    act = a;
    const lit2 = a >= 0 ? a : PIVOT;
    sils.forEach((s, i) => s.classList.toggle("hi", i === lit2));
    read.textContent = a >= 0 ? NAMES2[a] : "rest";
    B3.wake();
  }
  setAct(-1);
  bag.add(pointer(stage, {
    move: (p) => {
      lastP = p;
      share = lerp(MIN2, 1, clamp((p[0] - 60) / 280, 0, 1));
      setAct(pick(p));
    },
    leave: () => {
      lastP = null;
      share = null;
      setAct(-1);
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      GAP4 = v;
      if (lastP) setAct(pick(lastP));
      B3.wake();
    },
    destroy: bag.dispose
  };
};

// src/figures/phosphor.ts
var N2 = 7;
var PITCH2 = 10;
var M = 8;
var EXT = M * 2 + PITCH2 * (N2 - 1);
var T7 = 5;
var R4 = 2.5;
var DROP = 15;
var BT = 4;
var BO = 7;
var LOOP = [
  [0, 0, 0, 8, 0, 0, 0],
  [0, 0, 8, 20, 8, 0, 0],
  [0, 28, 34, 34, 34, 28, 0],
  [28, 34, 65, 65, 65, 34, 28],
  [65, 0, 0, 0, 0, 0, 65],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [64, 0, 0, 0, 0, 0, 0],
  [32, 64, 0, 0, 0, 0, 0],
  [16, 32, 64, 0, 0, 0, 0],
  [8, 16, 32, 64, 0, 0, 0],
  [4, 8, 16, 32, 64, 0, 0],
  [2, 4, 8, 16, 32, 64, 0],
  [1, 2, 4, 8, 16, 32, 64],
  [0, 1, 2, 4, 8, 16, 32],
  [0, 0, 1, 2, 4, 8, 16],
  [0, 0, 0, 1, 2, 4, 8],
  [0, 0, 0, 0, 1, 2, 4],
  [0, 0, 0, 0, 0, 1, 2],
  [0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0]
];
var FRAME_MS = 110;
var RESUME = 1200;
var RAMP = 400;
var SPLASH = [[0, 0, 1], [1, 0, 0.45], [-1, 0, 0.45], [0, 1, 0.45], [0, -1, 0.45]];
var lit = (f, r, c) => LOOP[f][r] >> N2 - 1 - c & 1;
var mount12 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let tau = value, clock = 0, lastFrame = -1, leftAt = -1e9, painting = false;
  let prev = null;
  const C = Cam(45, 0.5, 2.12), ZB4 = -DROP - BT;
  fit(C, [[-BO, -BO, ZB4], [EXT + BO, EXT + BO, ZB4 - 6], [EXT + BO, -BO, ZB4], [-BO, EXT + BO, ZB4], [0, 0, T7]], 200, 160);
  const P = proj(C), front2 = facing(C);
  const g = mk("g", {}, svg);
  const [br, bi] = rings(-BO, -BO, EXT + BO, EXT + BO, 11, 1.8);
  reflect(svg, g, P, front2, br, ZB4, 12);
  put(solid(g), prism(P, front2, br, bi, ZB4, -DROP));
  const [tr, ti] = rings(0, 0, EXT, EXT, 7, 1.3);
  mk("path", { d: extremes(P, tr).map((q) => seg(P(q.u, q.v, 0), P(q.u, q.v, -DROP))).join(""), class: "nf dash" }, g);
  put(solid(g), prism(P, front2, tr, ti, 0, T7));
  mk("path", { d: poly(ringAt(P, rrect(3.5, 3.5, EXT - 3.5, EXT - 3.5, 4.5, 5), T7)), class: "nf lo" }, g);
  const I = new Float32Array(N2 * N2);
  const dots = [];
  for (let r = 0; r < N2; r++) for (let c = 0; c < N2; c++) {
    const d = flatDot(g, C, R4, "dot");
    place(d, P(M + c * PITCH2, M + r * PITCH2, T7));
    dots.push(d);
  }
  function excite(x, y, amt) {
    const c = Math.round((x - M) / PITCH2), r = Math.round((y - M) / PITCH2);
    for (const [dr, dc, k] of SPLASH) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= N2 || cc < 0 || cc >= N2) continue;
      I[rr * N2 + cc] = Math.max(I[rr * N2 + cc], amt * k);
    }
  }
  const B3 = register(stage, (dt, now) => {
    if (reducedMotion() && !painting) {
      for (let i = 0; i < N2 * N2; i++) I[i] = Math.max(I[i] * Math.exp(-dt * 1e3 / tau), lit(3, Math.floor(i / N2), i % N2) * 0.8);
    } else {
      const decay = Math.exp(-dt * 1e3 / tau);
      for (let i = 0; i < N2 * N2; i++) I[i] *= decay;
      const gain = painting ? 0 : clamp((now - leftAt - RESUME) / RAMP, 0, 1);
      if (gain > 0) {
        clock += dt * 1e3;
        const f = Math.floor(clock / FRAME_MS) % LOOP.length;
        if (f !== lastFrame) {
          lastFrame = f;
          for (let r = 0; r < N2; r++) for (let c = 0; c < N2; c++) if (lit(f, r, c)) I[r * N2 + c] = Math.max(I[r * N2 + c], gain);
        }
        read.textContent = `loop \xB7 ${String(f + 1).padStart(2, "0")}/${LOOP.length}`;
      } else read.textContent = painting ? "paint" : "afterglow";
    }
    for (let i = 0; i < N2 * N2; i++) dots[i].setAttribute("opacity", (0.14 + 0.86 * clamp(I[i], 0, 1)).toFixed(3));
    return true;
  });
  bag.add(B3.unregister);
  bag.add(pointer(stage, {
    move: (p) => {
      painting = true;
      const q = unproj(C, p[0], p[1], T7);
      if (prev) {
        const n = Math.ceil(Math.hypot(q[0] - prev[0], q[1] - prev[1]) / 3);
        for (let k = 1; k <= n; k++) excite(lerp(prev[0], q[0], k / n), lerp(prev[1], q[1], k / n), 1);
      } else excite(q[0], q[1], 1);
      prev = q;
      B3.wake();
    },
    // the resume is a timestamp the tick reads, not a timer, so re-entering or tearing down has nothing to cancel
    leave: () => {
      painting = false;
      prev = null;
      leftAt = performance.now();
      clock = 0;
      lastFrame = -1;
      B3.wake();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => {
    tau = v;
  }, destroy: bag.dispose };
};

// src/figures/riffle-geometry.ts
var N3 = 8;
var W9 = 84;
var H4 = 54;
var G = 13;
var TW = 22;
var TH = 7;
var TABS = [6, 31, 56];
var TK2 = 1.4;
var REST7 = -12;
var BACK = -24;
var FWD = 20;
var LIFT4 = 16;
var X03 = -5;
var X12 = W9 + 5;
var Y0 = -9;
var Y1 = (N3 - 1) * G + 9;
var WH = 20;
var WR = 6;
var WT = 2.4;
function camera() {
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[X03, Y0, 0], [X12, Y1, -8], [X12, Y0, 0], [X03, Y1, 0], [X03, Y0, H4 + TH], [X12, Y0, H4 + TH + LIFT4]], 200, 166);
  return C;
}
var trayRings = () => ({
  outer: rrect(X03, Y0, X12, Y1, WR, 6),
  inner: rrect(X03 + WT, Y0 + WT, X12 - WT, Y1 - WT, WR - WT, 6)
});
var LR = (pts) => pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse();
function tray(P, front2, outer, inner2) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner2, WH)), "nf"],
    [open(ringAt(P, run(inner2, (q) => !front2(q)), 2.5)), "nf lo"]
  ];
  const iF = LR(ringAt(P, run(inner2, front2), WH)), oT = LR(ringAt(P, run(outer, front2), WH)), oB = LR(ringAt(P, run(outer, front2), 0));
  const hx = (X03 + X12) / 2, onFront = (ring) => ring.map((q) => P(q.u, Y1, q.v));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    [poly(onFront(rrect(hx - 11, 6.5, hx + 11, 12.5, 3, 5))), "nf"],
    [poly(onFront(rrect(hx - 9.4, 8, hx + 9.4, 11, 1.5, 5))), "nf lo"]
  ];
  return { far, near };
}
function card(i) {
  const n = N3 - i, t0 = TABS[(N3 - 1 - i) % 3];
  const shape = fillet(
    [[0, 0], [W9, 0], [W9, H4], [t0 + TW, H4], [t0 + TW, H4 + TH], [t0, H4 + TH], [t0, H4], [0, H4]],
    [1, 1, 3.2, 1.8, 2.4, 2.4, 1.8, 3.2]
  );
  return { n, t0, shape };
}
function pose(P, i, t0, shape, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - TK2 * c, v * c + TK2 * s + lift);
  const punch = [];
  for (let k = 0; k < 8; k++) punch.push(w(t0 + TW / 2 + (k % 4 - 1.5) * 3.6, H4 + TH / 2 + (0.5 - Math.floor(k / 4)) * 2.8));
  return {
    back: poly(shape.map((p) => wb(p[0], p[1]))),
    face: poly(shape.map((p) => w(p[0], p[1]))),
    head: seg(w(6, H4 - 11), w(W9 - 6, H4 - 11)),
    rules: [H4 - 18, H4 - 25, H4 - 32, H4 - 39].map((v) => seg(w(6, v), w(W9 - 6, v))).join(""),
    punch
  };
}
function scene() {
  const C = camera();
  return { C, P: proj(C), front: facing(C), ...trayRings() };
}

// src/figures/riffle.ts
var mount13 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let stag = value;
  const { P, front: front2, outer, inner: inner2 } = scene();
  const paths = tray(P, front2, outer, inner2);
  const g = mk("g", {}, svg);
  reflect(svg, g, P, front2, outer, 0, 14);
  for (const [d2, cls] of paths.far) mk("path", { d: d2, class: cls }, g);
  const cards = [];
  for (let i = 0; i < N3; i++) {
    const { n, t0, shape } = card(i);
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp), face = mk("path", { class: "sil" }, grp);
    const head = mk("path", { class: "nf" }, grp), rules = mk("path", { class: "nf lo" }, grp);
    const punch = [];
    for (let k = 0; k < 8; k++) punch.push(mk("circle", { r: 1.05, class: "dot " + (k === n - 1 ? "m" : "off") }, grp));
    cards.push({ n, t0, shape, back, face, head, rules, punch, a: tween(REST7), z: tween(0) });
  }
  for (const [d2, cls] of paths.near) mk("path", { d: d2, class: cls }, g);
  const top = (i) => P(W9 / 2, i * G + H4 * Math.sin(rad(REST7)), H4 * Math.cos(rad(REST7)));
  const c0 = top(0), c1 = top(1), d = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W9 / 2 + 6, det = d[0] * ex[1] - d[1] * ex[0];
  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (d[0] * qy - d[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N3 + 1) return -1;
    return clamp(Math.round(s), 0, N3 - 1);
  }
  function draw(i, th, lift) {
    const cd = cards[i], q = pose(P, i, cd.t0, cd.shape, th, lift);
    cd.back.setAttribute("d", q.back);
    cd.face.setAttribute("d", q.face);
    cd.head.setAttribute("d", q.head);
    cd.rules.setAttribute("d", q.rules);
    cd.punch.forEach((el, k) => place(el, q.punch[k]));
  }
  const B3 = register(stage, (_dt, now) => {
    let moving = false;
    cards.forEach((cd, i) => {
      draw(i, tval(cd.a, now), tval(cd.z, now));
      if (!tdone(cd.a, now) || !tdone(cd.z, now)) moving = true;
    });
    return moving;
  });
  bag.add(B3.unregister);
  let act = -1;
  const caption = (a) => a < 0 ? "rest" : String(N3 - a).padStart(2, "0");
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    cards.forEach((cd, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST7 : i < a ? BACK : i > a ? FWD : 0;
      tset(cd.a, th, now, delay);
      tset(cd.z, a === i ? LIFT4 : 0, now, delay);
      cd.face.classList.toggle("hi", i === a);
      cd.head.classList.toggle("hi", i === a);
      cd.punch[cd.n - 1].classList.toggle("m", i !== a);
    });
    read.textContent = caption(a);
    B3.wake();
  }
  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.on(stage, "keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      setActive(act < 0 ? N3 - 1 : Math.min(N3 - 1, act + 1));
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      setActive(act < 0 ? N3 - 1 : Math.max(0, act - 1));
      e.preventDefault();
    } else if (e.key === "Escape" && act >= 0) {
      setActive(-1);
      e.preventDefault();
    }
  });
  bag.on(stage, "blur", () => setActive(-1));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      stag = v;
    },
    destroy: bag.dispose
  };
};

// src/figures/router.ts
var X13 = 124;
var Y12 = 58;
var H5 = 14;
var T8 = 3;
var BR = 13;
var XS = [18, 48, 78, 108];
var YB = 11;
var KH = 5;
var KR = 4.6;
var L3 = 56;
var R02 = 3.3;
var R12 = 2.1;
var ELBOW = 0.21;
var STOP = R12 + 1;
var MAX = 44;
var REST8 = [-9, 3, -4, 32];
var LIT0 = 3;
var D6 = [Math.SQRT1_2, -Math.SQRT1_2];
var falloff4 = (u, R6) => clamp(1 - u / R6, 0.1, 1);
var along = (i, th, l) => {
  const s = Math.sin(rad(th)), c = Math.cos(rad(th));
  return [XS[i] + D6[0] * s * l, YB + D6[1] * s * l, H5 + KH - 1 + c * l];
};
var mount14 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let R6 = value, over = null, lit2 = null;
  const C = Cam(45, 0.5, 1.78), pts = [[0, 0, 0], [X13, Y12, 0], [X13, 0, 0], [0, Y12, 0]];
  XS.forEach((_, i) => {
    for (const th of [-MAX, 0, MAX]) pts.push(along(i, th, L3 + R12));
  });
  fit(C, pts, 200, 166);
  const P = proj(C), front2 = facing(C), Pv = (q) => P(q[0], q[1], q[2]);
  const o = P(0, 0, 0), dd = P(D6[0], D6[1], 0), zz = P(0, 0, 1);
  const SH = Math.hypot(dd[0] - o[0], dd[1] - o[1]), SZ = o[1] - zz[1];
  const g = mk("g", {}, svg);
  const foot = rrect(0, 0, X13, Y12, BR, 6), top = rrect(T8, T8, X13 - T8, Y12 - T8, BR - T8, 6);
  const inner2 = rrect(T8 + 1.6, T8 + 1.6, X13 - T8 - 1.6, Y12 - T8 - 1.6, BR - T8 - 1.6, 6);
  put(solid(g), { sil: poly(hull(ringAt(P, foot, 0).concat(ringAt(P, top, H5)))), crease: open(ringAt(P, run(inner2, front2), H5)) });
  for (let k = 0; k < 6; k++) {
    const z = H5 * 0.56, y = Y12 - T8 * (z / H5) + 0.1;
    place(mk("circle", { r: 1.05, class: k === 0 ? "dot m" : "dot off" }, g), P(34 + k * 9, y, z));
  }
  for (let j = 0; j < 3; j++) for (let k = 0; k < 13 - j % 2; k++) place(flatDot(g, C, 0.5, "dot off"), P(26 + j % 2 * 3 + k * 6, 29 + j * 5.5, H5));
  const ants = XS.map((x, i) => {
    const boss = solid(g);
    const shift = (ring) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + YB }));
    put(boss, prism(P, front2, shift(circ(KR, 16)), shift(circ(KR - 1.1, 16)), H5, H5 + KH));
    return { i, el: solid(g), sp: spring(REST8[i], { eps: 0.05 }), drawn: NaN, piv: Pv(along(i, 0, 0)) };
  });
  const gap = Math.abs(ants[1].piv[0] - ants[0].piv[0]) / SH;
  const disc2 = (p, r) => Array.from({ length: 20 }, (_, k) => [p[0] + r * SH * Math.cos(k * Math.PI / 10), p[1] + r * SH * Math.sin(k * Math.PI / 10)]);
  function drawAnt(a) {
    const th = a.sp.x;
    if (th === a.drawn) return;
    a.drawn = th;
    const b = Pv(along(a.i, th, 0)), t = Pv(along(a.i, th, L3)), e = Pv(along(a.i, th, L3 * ELBOW));
    const len = Math.hypot(t[0] - b[0], t[1] - b[1]), n = [-(t[1] - b[1]) / len, (t[0] - b[0]) / len];
    const w = lerp(R02, R12, ELBOW) * SH - 1.1;
    put(a.el, {
      sil: poly(hull(disc2(b, R02).concat(disc2(t, R12)))),
      crease: seg([e[0] + n[0] * w, e[1] + n[1] * w], [e[0] - n[0] * w, e[1] - n[1] * w])
    });
  }
  function light(a) {
    if (a === lit2) return;
    lit2?.el.sil.classList.remove("hi");
    lit2 = a;
    a.el.sil.classList.add("hi");
  }
  const B3 = register(stage, (dt) => {
    let m = false;
    for (const a of ants) {
      if (stepS(a.sp, dt)) m = true;
      drawAnt(a);
    }
    return m;
  });
  bag.add(B3.unregister);
  function retarget() {
    if (!over) {
      ants.forEach((a, i) => {
        a.sp.t = REST8[i];
      });
      light(ants[LIT0]);
      read.textContent = "rest";
    } else {
      const at2 = over;
      const dxs = ants.map((a) => (at2[0] - a.piv[0]) / SH), d0 = Math.min(...dxs.map(Math.abs));
      const near = ants[dxs.findIndex((d) => Math.abs(d) === d0)];
      ants.forEach((a, i) => {
        const dx = Math.sign(dxs[i]) * Math.max(Math.abs(dxs[i]) - STOP, 0), hz = Math.max((a.piv[1] - at2[1]) / SZ, Math.sqrt(Math.max(L3 * L3 - dx * dx, 0)), 0);
        const aim = Math.atan2(dx, hz) * 180 / Math.PI;
        a.sp.t = clamp(aim, -MAX, MAX) * falloff4((Math.abs(dxs[i]) - d0) / gap, R6);
      });
      light(near);
      read.textContent = `antenna ${near.i + 1} \xB7 ${Math.round(Math.abs(near.sp.t))}\xB0`;
    }
    B3.wake();
  }
  light(ants[LIT0]);
  bag.add(pointer(stage, {
    move: (p) => {
      over = p;
      retarget();
    },
    leave: () => {
      over = null;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      R6 = v;
      if (over) retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/slow.ts
var L4 = 210;
var BW2 = 26;
var BT2 = 5;
var CUBE = 15;
var NC2 = 6;
var SPEED = 1 / 9;
var GATE = L4 * 0.62;
var GH = 38;
var size = (u) => {
  const a = clamp(Math.min(u, 1 - u) / 0.08, 0, 1);
  return a * a * (3 - 2 * a);
};
var RISE = L4 / NC2 / 2;
var FALL = RISE / 2;
var glow = (x) => {
  const d = x - GATE, w = d < 0 ? RISE : FALL;
  return Math.abs(d) >= w ? 0 : Math.cos(Math.PI / 2 * (Math.abs(d) / w)) ** 2;
};
var mount15 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let slow2 = value, over = null, clock = 2.4;
  const rate = spring(1, { eps: 2e-3 });
  const C = Cam(45, 0.5, 1.8);
  fit(C, [[0, 0, 0], [L4, BW2, 0], [L4, 0, 0], [0, BW2, 0], [0, 0, GH], [GATE, -8, GH]], 200, 168);
  const P = proj(C), front2 = facing(C);
  const g = mk("g", {}, svg);
  const [bR, bI] = rings(0, 0, L4, BW2, 5, 1.3);
  put(solid(g), prism(P, front2, bR, bI, 0, BT2));
  const slats = mk("path", { class: "nf lo" }, g);
  const layer = mk("g", {}, g);
  const pool = [];
  for (let j = 0; j < NC2; j++) {
    const el = { ...solid(layer), dots: [] };
    for (let k = 0; k < 9; k++) el.dots.push(flatDot(el.g, C, 1, "dot off"));
    pool.push(el);
  }
  const gate = [[-8, -3, 0, GH - 4, GATE - 5.5], [BW2 + 3, BW2 + 8, 0, GH - 4, GATE + BW2 + 5.5], [-8, BW2 + 8, GH - 4, GH, GATE + BW2 + 8.5]].map(([y0, y1, z0, z1, key]) => {
    const el = solid(layer), [rg, ig] = rings(GATE - 1.6, y0, GATE + 1.6, y1, 1.4, 0.6);
    put(el, prism(P, front2, rg, ig, z0, z1));
    el.sil.style.transition = "none";
    return { el, key };
  });
  const lifts = Array.from({ length: NC2 }, () => spring(0, { eps: 0.03 }));
  let hot = -1, order2 = "", gatePct = 0;
  const B3 = register(stage, (dt) => {
    let m = stepS(rate, dt);
    const base = reducedMotion() ? 0 : 1;
    if (!over) rate.t = base;
    clock += dt * rate.x;
    const items = [];
    for (let j = 0; j < NC2; j++) {
      const q = j / NC2 + clock * SPEED, u = q - Math.floor(q), lap = Math.floor(q);
      items.push({ j, x: u * L4, s: size(u), serial: 141 + lap * NC2 + j });
    }
    let want = -1;
    if (over) {
      let best = 34;
      for (const it of items) if (it.s > 0.6 && Math.abs(it.x - over[0]) < best) {
        best = Math.abs(it.x - over[0]);
        want = it.j;
      }
    }
    hot = want;
    lifts.forEach((sp, j) => {
      sp.t = j === hot ? 11 : 0;
      if (stepS(sp, dt)) m = true;
    });
    items.sort((a, b) => a.x - b.x);
    let gateGlow = 0, hotSerial = 0;
    const draw = gate.map((p, i) => ({ id: "g" + i, key: p.key, g: p.el.g }));
    items.forEach((it, k) => {
      const el = pool[k], sz = CUBE * it.s, x0 = it.x - sz / 2, x1 = it.x + sz / 2, y0 = BW2 / 2 - sz / 2, y1 = BW2 / 2 + sz / 2;
      const z0 = BT2 + lifts[it.j].x, z1 = z0 + sz;
      draw.push({ id: k, key: it.x + BW2 / 2, g: el.g });
      if (sz < 0.3) {
        el.g.setAttribute("visibility", "hidden");
        return;
      }
      el.g.removeAttribute("visibility");
      const [rg, ig] = rings(x0, y0, x1, y1, 2.6 * it.s, 0.9 * it.s);
      put(el, prism(P, front2, rg, ig, z0, z1));
      const isHot = it.j === hot;
      el.sil.classList.toggle("hi", isHot);
      const pitch = sz * 0.2, rr = r2(0.55 * it.s * C.S);
      el.dots.forEach((d, b) => {
        place(d, P(it.x + (b % 3 - 1) * pitch, BW2 / 2 + (Math.floor(b / 3) - 1) * pitch, z1));
        d.setAttribute("rx", String(rr));
        d.setAttribute("ry", String(r2(rr * C.k)));
        d.setAttribute("class", it.serial >> b & 1 ? isHot ? "dot" : "dot m" : "dot off");
      });
      if (isHot) hotSerial = it.serial;
      gateGlow = Math.max(gateGlow, glow(it.x) * it.s);
    });
    draw.sort((a, b) => a.key - b.key);
    const sig = draw.map((d) => d.id).join();
    if (sig !== order2) {
      order2 = sig;
      draw.forEach((d) => layer.appendChild(d.g));
    }
    const pct = Math.round(gateGlow * 100);
    if (pct !== gatePct) {
      gatePct = pct;
      const stroke = pct ? `color-mix(in srgb, var(--hl-hi) ${pct}%, var(--hl-edge))` : "";
      gate.forEach((p) => {
        p.el.sil.style.stroke = stroke;
      });
    }
    const off = (clock * SPEED * L4 % 21 + 21) % 21, sl = [];
    for (let x = off; x < L4; x += 21) if (x > 5 && x < L4 - 5) sl.push(seg(P(x, 4, BT2), P(x, BW2 - 4, BT2)));
    slats.setAttribute("d", sl.join(""));
    read.textContent = `rate ${rate.x.toFixed(2)}\xD7` + (hot >= 0 ? ` \xB7 #${String(hotSerial).padStart(4, "0")}` : "");
    if (reducedMotion() && !over && rate.x === 0) return m;
    return true;
  });
  bag.add(B3.unregister);
  bag.add(pointer(stage, {
    move: (p) => {
      over = unproj(C, p[0], p[1], BT2);
      rate.t = slow2;
      B3.wake();
    },
    leave: () => {
      over = null;
      B3.wake();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => {
    slow2 = v;
    if (over) rate.t = v;
    B3.wake();
  }, destroy: bag.dispose };
};

// src/figures/terminal.ts
var N4 = 24;
var V = 7;
var G2 = 11;
var T9 = 2.1;
var LH = 1.8;
var CH3 = 3.9;
var LIFT5 = 5.5;
var HB2 = 3.4;
var SLAB = 3;
var W10 = 150;
var TB2 = 17;
var PB2 = 17;
var PAD2 = 11;
var IN = 2.5;
var FIRST = 37;
var VB = PB2;
var VA = PB2 + V * G2;
var H6 = VA + TB2;
var E = 4;
var HIST = [
  "0 5 12",
  "2 7 3 9",
  "2 14",
  "4 6 10",
  "4 18",
  "2 3",
  "0 2",
  "0 2 6 8",
  "0 26",
  "0 20",
  "0 11 4",
  "2 9 12",
  "2 5 3 7",
  "4 16",
  "4 8 8",
  "2 4",
  "0 3 14",
  "0 24",
  "0 30",
  "0 17",
  "2 6 11",
  "2 13",
  "0 9 5",
  "0 4 7"
];
var REST_TOP = N4 - V - 2.6;
var REST_LINE = 18;
var REST_R = 2;
var falloff5 = (d, R6) => clamp(1 - d / R6, 0, 1);
var smooth = (t) => t * t * (3 - 2 * t);
var front = (q) => 0.612 * q.nu + 0.5 * q.nv > 0;
var cut = (ring) => ring.map((q) => ({ ...q, v: clamp(q.v, VB, VA) }));
var mount16 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.62);
  const W32 = (u, v, w) => [u, w, v];
  fit(C, [W32(0, 0, -SLAB), W32(W10, 0, -SLAB), W32(0, H6, -SLAB), W32(W10, H6, -SLAB), W32(W10, 0, HB2 + 2.8), W32(0, H6, HB2 + 1.3), W32(PAD2, VA - 4, LIFT5 + LH)], 200, 166);
  const P = proj(C), P2 = (u, v, w) => P(u, w, v);
  let R6 = value, over = null, lit2 = [];
  const g = mk("g", {}, svg);
  const [sr, si] = rings(0, 0, W10, H6, 9, 2);
  put(solid(g), prism(P2, front, sr, si, -SLAB, 0));
  const rows = HIST.map((s, j) => {
    const [ind, ...tok] = s.split(" ").map(Number), segs = [];
    let at2 = ind;
    for (const n of tok) {
      const x0 = PAD2 + at2 * CH3;
      segs.push({ x0, x1: x0 + n * CH3 - 1.4, el: solid(g) });
      at2 += n + 1;
    }
    return { j, segs, sp: spring(0, { eps: 0.01 }), drawn: "" };
  });
  const [pr, pi] = rings(IN, IN, W10 - IN, VB, 6, 1.4);
  put(solid(g), prism(P2, front, pr, pi, 0, HB2));
  const cy = (IN + VB) / 2;
  const chev = fillet([[0, 6.2], [8.5, 0], [0, -6.2], [0, -3.1], [4.25, 0], [0, 3.1]], [0.9, 1.1, 0.9, 0.5, 0.6, 0.5]);
  const chevEl = mk("path", { d: poly(chev.map(([x, y]) => P2(PAD2 + x, cy + y, HB2))), class: "nf" }, g);
  const [kr, ki] = rings(PAD2 + 13, cy - 5.2, PAD2 + 13 + CH3 * 1.5, cy + 5.2, 1.2, 0.8);
  const cursor = solid(g);
  put(cursor, prism(P2, front, kr, ki, HB2, HB2 + 2.8));
  const [tr, ti] = rings(IN, VA, W10 - IN, H6 - IN, 6, 1.4);
  put(solid(g), prism(P2, front, tr, ti, 0, HB2));
  for (let i = 0; i < 3; i++) {
    const cx = PAD2 + i * 8.5, cv = (VA + H6 - IN) / 2;
    const [r, ri] = rings(cx - 2.8, cv - 2.8, cx + 2.8, cv + 2.8, 2.8, 0.8);
    put(solid(g), prism(P2, front, r, ri, HB2, HB2 + 1.3));
  }
  function drawRow(rw, top2) {
    const key = top2 + "|" + rw.sp.x;
    if (key === rw.drawn) return;
    rw.drawn = key;
    const vc = VA - (rw.j - top2 + 0.5) * G2, v0 = Math.max(vc - T9, VB), v1 = Math.min(vc + T9, VA);
    const env = smooth(clamp((VA - vc - T9) / E, 0, 1)) * smooth(clamp((vc - T9 - VB) / E, 0, 1));
    const w0 = rw.sp.x * env;
    for (const s of rw.segs) {
      if (v1 - v0 < 0.05) {
        put(s.el, { sil: "", crease: "" });
        continue;
      }
      const ring = cut(rrect(s.x0, vc - T9, s.x1, vc + T9, T9, 4)), inner2 = cut(rrect(s.x0 + 0.7, vc - T9 + 0.7, s.x1 - 0.7, vc + T9 - 0.7, T9 - 0.7, 4));
      put(s.el, prism(P2, front, ring, inner2, w0, w0 + LH));
    }
  }
  function light(els) {
    for (const el of lit2) el.classList.remove("hi");
    lit2 = els;
    for (const el of lit2) el.classList.add("hi");
  }
  const top = spring(REST_TOP, { eps: 2e-3 });
  const B3 = register(stage, (dt) => {
    let m = stepS(top, dt);
    for (const rw of rows) {
      if (stepS(rw.sp, dt)) m = true;
      drawRow(rw, top.x);
    }
    return m;
  });
  bag.add(B3.unregister);
  function onFace([sx, sy], w) {
    const o = P2(0, 0, w), a = P2(1, 0, w), b = P2(0, 1, w);
    const ax2 = a[0] - o[0], ay = a[1] - o[1], bx = b[0] - o[0], by = b[1] - o[1], det = ax2 * by - ay * bx;
    return [((sx - o[0]) * by - (sy - o[1]) * bx) / det, (ax2 * (sy - o[1]) - ay * (sx - o[0])) / det];
  }
  function hit(p) {
    const qb = onFace(p, HB2), inU = (q2) => q2[0] > IN && q2[0] < W10 - IN;
    if (inU(qb) && qb[1] > IN && qb[1] < VB) return "prompt";
    if (inU(qb) && qb[1] > VA && qb[1] < H6 - IN) return 0;
    const q = onFace(p, 0);
    if (q[0] < 0 || q[0] > W10 || q[1] < 0 || q[1] > H6) return null;
    return q[1] <= VB ? "prompt" : clamp((VA - G2 / 2 - q[1]) / ((V - 1) * G2), 0, 1);
  }
  function retarget() {
    let t, c, r = R6;
    if (over === null) {
      t = REST_TOP;
      c = REST_LINE;
      r = REST_R;
      read.textContent = "rest";
    } else if (over === "prompt") {
      t = N4 - V;
      c = -1;
      read.textContent = "prompt";
    } else {
      t = over * (N4 - V);
      c = clamp(Math.round(over * (N4 - 1)), Math.ceil(t), Math.floor(t + V - 1));
      read.textContent = "line " + (FIRST + c);
    }
    top.t = t;
    for (const rw of rows) rw.sp.t = c < 0 ? 0 : LIFT5 * falloff5(Math.abs(rw.j - c), r);
    light(c < 0 ? [cursor.sil, chevEl] : rows[c].segs.map((s) => s.el.sil));
    B3.wake();
  }
  retarget();
  for (const rw of rows) rw.sp.x = rw.sp.t;
  bag.add(pointer(stage, {
    move: (p) => {
      over = hit(p);
      retarget();
    },
    leave: () => {
      over = null;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      R6 = v;
      if (over !== null) retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/terrain.ts
var N5 = 9;
var CELL = 14;
var FOOT2 = 11;
var HMAX = 58;
var EXT2 = N5 * CELL;
var PB3 = 5;
var falloff6 = (u) => u <= 0 ? 1 : u <= 0.417 ? 1 - u / 0.417 * 0.6875 : u <= 1 ? 0.3125 - (u - 0.417) / 0.583 * 0.2185 : 0.094;
var mount17 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.58);
  fit(C, [[-6, -6, -PB3], [EXT2 + 6, EXT2 + 6, -PB3], [EXT2 + 6, -6, -PB3], [-6, EXT2 + 6, -PB3], [0, 0, HMAX * 0.75]], 200, 166);
  const P = proj(C), front2 = facing(C);
  let R6 = value * CELL, over = null;
  const g = mk("g", {}, svg), cols = [];
  const [pr, pi] = rings(-6, -6, EXT2 + 6, EXT2 + 6, 9, 2.2);
  put(solid(g), prism(P, front2, pr, pi, -PB3, 0));
  for (let s = 0; s <= 2 * (N5 - 1); s++) for (let i = 0; i < N5; i++) {
    const j = s - i;
    if (j < 0 || j >= N5) continue;
    const u = i / (N5 - 1), v = j / (N5 - 1);
    const h0 = 4 + 25 * Math.exp(-((u - 0.22) ** 2 + (v - 0.74) ** 2) / 0.07) + 12 * Math.exp(-((u - 0.8) ** 2 + (v - 0.26) ** 2) / 0.035);
    const x0 = i * CELL + (CELL - FOOT2) / 2, y0 = j * CELL + (CELL - FOOT2) / 2;
    const [ring, inner2] = rings(x0, y0, x0 + FOOT2, y0 + FOOT2, 2.6, 0.9);
    cols.push({ i, j, h0, ring, inner: inner2, sp: spring(h0, { eps: 0.04 }), el: solid(g), drawn: NaN });
  }
  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 9; k++) md.push(flatDot(mark, C, 0.55, k === 4 ? "dot" : "dot m"));
  const peak = cols.reduce((a, b) => b.h0 > a.h0 ? b : a);
  const byCell = /* @__PURE__ */ new Map();
  cols.forEach((c) => byCell.set(c.i + "," + c.j, c));
  let mc = null, want = peak;
  function drawMark() {
    if (want !== mc) {
      mc = want;
      mc.el.g.after(mark);
    }
    const cx = (mc.i + 0.5) * CELL, cy = (mc.j + 0.5) * CELL, h = Math.max(0.6, mc.sp.x);
    md.forEach((el, k) => place(el, P(cx + (k % 3 - 1) * 2.5, cy + (Math.floor(k / 3) - 1) * 2.5, h)));
  }
  function drawCol(c) {
    const h = Math.max(0.6, c.sp.x);
    if (h === c.drawn) return;
    c.drawn = h;
    put(c.el, prism(P, front2, c.ring, c.inner, 0, h));
    c.el.sil.classList.toggle("hi", h > HMAX * 0.5);
  }
  const B3 = register(stage, (dt) => {
    let m = false;
    for (const c of cols) {
      if (stepS(c.sp, dt)) m = true;
      drawCol(c);
    }
    drawMark();
    return m;
  });
  bag.add(B3.unregister);
  function retarget() {
    for (const c of cols) {
      if (!over) {
        c.sp.t = c.h0;
        continue;
      }
      const dx = (c.i + 0.5) * CELL - over[0], dy = (c.j + 0.5) * CELL - over[1];
      c.sp.t = HMAX * falloff6(Math.hypot(dx, dy) / R6);
    }
    if (over) {
      const i = clamp(Math.floor(over[0] / CELL), 0, N5 - 1), j = clamp(Math.floor(over[1] / CELL), 0, N5 - 1);
      want = byCell.get(i + "," + j);
      read.textContent = `cell ${i}\xB7${j}`;
    } else {
      want = peak;
      read.textContent = "rest";
    }
    B3.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => {
      over = unproj(C, p[0], p[1], 0);
      retarget();
    },
    leave: () => {
      over = null;
      retarget();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return {
    set: (v) => {
      R6 = v * CELL;
      if (over) retarget();
    },
    destroy: bag.dispose
  };
};

// src/figures/turntable-geometry.ts
var BLK = [
  [-42, -42, 0, -12, -12, 14, 0],
  [-36, -36, 14, -18, -18, 34, 0],
  [0, -46, 0, 16, -6, 10, 1],
  [24, -32, 0, 40, -16, 44, 2],
  [-44, 4, 0, -4, 18, 22, 3],
  [8, 6, 0, 40, 38, 8, 4],
  [16, 14, 8, 28, 26, 20, 4],
  [-30, 28, 0, -16, 42, 12, 5]
];
var HOME = 45;
var DETENT = 90;
var detent = (a) => HOME + DETENT * Math.round((a - HOME) / DETENT);
var depth = (b, s, c) => (b[0] + b[3]) * s + (b[1] + b[4]) * c + (b[2] + b[5]) * 0.01;
function behind(A, B3, s, c) {
  if (A[6] === B3[6]) return A[2] < B3[2];
  if (A[3] <= B3[0]) return s > 0;
  if (B3[3] <= A[0]) return s < 0;
  if (A[4] <= B3[1]) return c > 0;
  if (B3[4] <= A[1]) return c < 0;
  return depth(A, s, c) < depth(B3, s, c);
}
function scr(b, s, c, k) {
  const zf = Math.sqrt(1 - k * k);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) {
    const X = x * c - y * s, Y = (x * s + y * c) * k - z * zf;
    x0 = Math.min(x0, X);
    x1 = Math.max(x1, X);
    y0 = Math.min(y0, Y);
    y1 = Math.max(y1, Y);
  }
  return [x0, y0, x1, y1];
}
function paintOrder(bs, s, c, k) {
  const n = bs.length, bx = bs.map((b) => scr(b, s, c, k));
  const next = bs.map(() => []), wait = bs.map(() => 0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = bx[i], b = bx[j];
    if (i === j || a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]) continue;
    if (behind(bs[i], bs[j], s, c)) {
      next[i].push(j);
      wait[j]++;
    }
  }
  const out = [], done2 = bs.map(() => false);
  let forced = 0;
  while (out.length < n) {
    let pick = -1, pass = 0;
    for (; pass < 2 && pick < 0; pass++)
      for (let i = 0; i < n; i++)
        if (!done2[i] && (pass || !wait[i]) && (pick < 0 || depth(bs[i], s, c) < depth(bs[pick], s, c))) pick = i;
    if (pass === 2) forced++;
    done2[pick] = true;
    out.push(pick);
    for (const j of next[pick]) wait[j]--;
  }
  return { order: out, forced };
}
var order = (bs, s, c, k) => paintOrder(bs, s, c, k).order;

// src/figures/turntable.ts
var RING = 70;
var PT = 4;
var WMAX = 540;
var ON_INDEX = 14;
var mount18 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let coast = value;
  const spin = { a: HOME, w: 0, mode: "rest", tgt: HOME };
  const kk = spring(0.5, { eps: 5e-4 });
  let lastX = null, lastT = 0, lastMove = -1e9;
  function stepSpin(dt, now) {
    if (spin.mode === "rest") return false;
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (let i = 0; i < n; i++) {
      if (spin.mode === "coast") {
        spin.w *= Math.exp(-h * 1e3 / coast);
        spin.a += spin.w * h;
        if (Math.abs(spin.w) < 45 && now - lastMove > 90) {
          spin.mode = "settle";
          spin.tgt = detent(spin.a + spin.w * 0.2);
        }
      } else {
        spin.w += (-90 * (spin.a - spin.tgt) - 16 * spin.w) * h;
        spin.a += spin.w * h;
      }
    }
    if (spin.mode === "settle" && Math.abs(spin.a - spin.tgt) < 0.02 && Math.abs(spin.w) < 0.3) {
      spin.a = spin.tgt;
      spin.w = 0;
      spin.mode = "rest";
    }
    return spin.mode !== "rest";
  }
  const C = Cam(HOME, 0.5, 1.85);
  C.ox = 200;
  C.oy = 184;
  const plat = circ(RING), platIn = circ(RING - 1.5);
  const blocks = BLK.map((b) => {
    const [ring, inner2] = rings(b[0], b[1], b[3], b[4], 3, 1.1);
    return { b, ring, inner: inner2 };
  });
  const TALL = blocks.find((k) => k.b[5] >= 40);
  const tops = {};
  blocks.forEach((k) => {
    if (!tops[k.b[6]] || k.b[5] > tops[k.b[6]].b[5]) tops[k.b[6]] = k;
  });
  const base = {};
  blocks.forEach((k) => {
    if (k.b[2] === 0) base[k.b[6]] = [(k.b[0] + k.b[3]) / 2, (k.b[1] + k.b[4]) / 2];
  });
  const g = mk("g", {}, svg);
  const platter = solid(g), ticks = mk("path", { class: "nf lo" }, g), major = mk("path", { class: "nf" }, g);
  const north = flatDot(g, C, 1.7, "dot m");
  const index = mk("path", { class: "nf" }, g);
  const pool = BLK.map(() => solid(g));
  const acc = mk("g", {}, g), accD = [];
  for (let k = 0; k < 16; k++) {
    const r = Math.floor(k / 4), q = k % 4, edge = r % 3 === 0, side = q % 3 === 0;
    if (edge && side) continue;
    accD.push({ r, q, el: flatDot(acc, C, 0.6, edge || side ? "dot m" : "dot") });
  }
  let accAt = null;
  const B3 = register(stage, (dt, now) => {
    let m = stepSpin(dt, now);
    if (stepS(kk, dt)) m = true;
    C.az = rad(spin.a);
    C.k = kk.x;
    const P = proj(C), front2 = facing(C), c = Math.cos(C.az), s = Math.sin(C.az);
    put(platter, prism(P, front2, plat, platIn, -PT, 0));
    const tk = [], mj = [];
    for (let d = 0; d < 360; d += 15) {
      const a = rad(d), long = d % 90 === 0, r0 = long ? RING - 12 : RING - 8;
      (long ? mj : tk).push(seg(P(Math.cos(a) * r0, Math.sin(a) * r0, 0), P(Math.cos(a) * (RING - 4.5), Math.sin(a) * (RING - 4.5), 0)));
    }
    ticks.setAttribute("d", tk.join(""));
    major.setAttribute("d", mj.join(""));
    place(north, P(0, -(RING - 17), 0));
    north.setAttribute("ry", String(r2(1.7 * C.S * C.k)));
    const bottom = C.oy + RING * C.S * C.k + PT * C.S * Math.sqrt(1 - C.k * C.k);
    index.setAttribute("d", `M${C.ox - 4} ${r2(bottom + 10)}L${C.ox} ${r2(bottom + 4)}L${C.ox + 4} ${r2(bottom + 10)}`);
    let lit2 = -1, best = ON_INDEX;
    if (lastX !== null || spin.mode !== "rest")
      for (const col in base) {
        const [x, y] = base[col], off = Math.abs(Math.atan2(x * c - y * s, x * s + y * c)) * 180 / Math.PI;
        if (off < best) {
          best = off;
          lit2 = +col;
        }
      }
    order(BLK, s, c, C.k).forEach((j, i) => {
      const k = blocks[j];
      put(pool[i], prism(P, front2, k.ring, k.inner, k.b[2], k.b[5]));
      pool[i].sil.classList.toggle("hi", k === tops[lit2]);
      if (k === TALL && accAt !== pool[i]) {
        accAt = pool[i];
        accAt.g.after(acc);
      }
    });
    const [x0, y0, , x1, y1, z1] = TALL.b, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    accD.forEach(({ r, q, el }) => {
      place(el, P(cx + (q - 1.5) * 2.6, cy + (r - 1.5) * 2.6, z1));
      el.setAttribute("ry", String(r2(0.6 * C.S * C.k)));
    });
    read.textContent = `az ${String(Math.round((spin.a % 360 + 360) % 360)).padStart(3, "0")}\xB0 \xB7 el ${Math.round(Math.asin(kk.x) * 180 / Math.PI)}\xB0`;
    return m;
  });
  bag.add(B3.unregister);
  bag.add(pointer(stage, {
    move: (p) => {
      const now = performance.now();
      kk.t = lerp(Math.sin(rad(40)), Math.sin(rad(20)), clamp(p[1] / 320, 0, 1));
      if (lastX !== null) {
        const dx = p[0] - lastX;
        if (reducedMotion()) spin.a -= dx * 0.9;
        else {
          const vp = dx / Math.max(8e-3, (now - lastT) / 1e3);
          spin.w = clamp(lerp(spin.w, -vp * 0.9, 0.35), -WMAX, WMAX);
          spin.mode = "coast";
        }
        if (Math.abs(dx) > 0.5) lastMove = now;
      }
      lastX = p[0];
      lastT = now;
      B3.wake();
    },
    leave: () => {
      lastX = null;
      kk.t = 0.5;
      if (reducedMotion()) spin.a = detent(spin.a);
      B3.wake();
    }
  }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => {
    coast = v;
    B3.wake();
  }, destroy: bag.dispose };
};

// src/figures/vault.ts
var R5 = 40;
var DP = 14;
var ZC = 64;
var RD = 17;
var DT = 4;
var KN = 6;
var KH2 = 6;
var GAP3 = 10;
var KL = 11;
var KW = 12;
var KD = 10;
var BR2 = 3.6;
var HX = -R5 - 8;
var HR2 = 4.6;
var WX0 = -70;
var WX1 = 70;
var WZ1 = 130;
var WT2 = 14;
var COMBO = 40;
var REST9 = 30;
var STEP2 = 50;
var WMAX2 = 150;
var THETA = [72, 26, -20];
var V2 = [Math.SQRT1_2 * Math.sqrt(0.75), Math.SQRT1_2 * Math.sqrt(0.75), 0.5];
var dir = (deg) => [Math.cos(deg * Math.PI / 180), 0, Math.sin(deg * Math.PI / 180)];
var wrap = (d) => ((d + 50) % 100 + 100) % 100 - 50;
function bar(P, o, e, a, b, ring, inner2, s0, s1) {
  const at2 = (q, s) => P(
    o[0] + e[0] * s + a[0] * q.u + b[0] * q.v,
    o[1] + e[1] * s + a[1] * q.u + b[1] * q.v,
    o[2] + e[2] * s + a[2] * q.u + b[2] * q.v
  );
  const seen = (q) => [0, 1, 2].reduce((t, i) => t + (a[i] * q.nu + b[i] * q.nv) * V2[i], 0) > 0;
  return {
    sil: poly(hull(ring.map((q) => at2(q, s0)).concat(ring.map((q) => at2(q, s1))))),
    crease: open(run(inner2, seen).map((q) => at2(q, s1)))
  };
}
var mount19 = ({ stage, svg, read }, value) => {
  const bag = disposer();
  let coast = value;
  const Y = [0, 1, 0], X = [1, 0, 0], Z = [0, 0, 1], O = [0, 0, ZC];
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[WX0, -WT2, 0], [WX1, -WT2, 0], [WX0, -WT2, WZ1], [WX1, -WT2, WZ1], [WX0, KD, 0], [WX1, 0, 0], [WX0, 0, WZ1], [WX1, 0, WZ1]], 200, 166);
  const P = proj(C);
  const g = mk("g", {}, svg);
  put(solid(g), bar(P, [0, 0, 0], Y, X, Z, rrect(WX0, 0, WX1, WZ1, 9, 6), rrect(WX0 + 2, 2, WX1 - 2, WZ1 - 2, 7, 6), -WT2, 0));
  put(solid(g), bar(P, [HX, DP * 0.55, 0], Z, X, Y, circ(HR2, 28), circ(HR2 - 1, 28), ZC - 26, ZC + 26));
  for (const dz of [-15, 15]) put(solid(g), bar(P, [0, 0, ZC + dz], Y, X, Z, rrect(HX, -4, -R5 + 6, 4, 3, 4), rrect(HX + 1, -3, -R5 + 5, 3, 2, 4), 1, DP * 0.8));
  put(solid(g), bar(P, O, Y, X, Z, circ(R5, 72), circ(R5 - 2.4, 72), 0, DP));
  mk("path", { class: "nf lo", d: poly(circ(R5 - 8, 64).map((q) => P(q.u, DP, ZC + q.v))) }, g);
  mk("path", { class: "nf", d: seg(P(0, DP, ZC + RD + 1.8), P(0, DP, ZC + RD + 6.5)) }, g);
  const dial = solid(g);
  put(dial, bar(P, O, Y, X, Z, circ(RD, 56), circ(RD - 1.4, 56), DP, DP + DT));
  const ticks = mk("path", { class: "nf lo" }, g), longs = mk("path", { class: "nf" }, g), combo = mk("path", { class: "nf" }, g);
  put(solid(g), bar(P, O, Y, X, Z, circ(KN, 32), circ(KN - 1, 32), DP + DT, DP + DT + KH2));
  const bolts = THETA.map((th) => {
    const e = dir(th), t = dir(th + 90);
    const el = solid(g), keep = solid(g);
    put(keep, bar(P, O, Y, e, t, rrect(R5 + GAP3, -KW / 2, R5 + GAP3 + KL, KW / 2, 3, 4), rrect(R5 + GAP3 + 1.4, -KW / 2 + 1.4, R5 + GAP3 + KL - 1.4, KW / 2 - 1.4, 1.8, 4), 0, KD));
    for (const s of [-3.4, 3.4]) {
      const c = R5 + GAP3 + KL / 2 + s;
      place(mk("circle", { r: 0.9, class: "dot off" }, keep.g), P(e[0] * c, KD, ZC + e[2] * c));
    }
    return { th, e, t, el, tw: tween(0), drawn: NaN };
  });
  const drawBolt = (b, k) => {
    const s1 = lerp(R5 + GAP3 + 4.5, R5 + 1.2, k);
    if (s1 === b.drawn) return;
    b.drawn = s1;
    put(b.el, bar(P, [0, DP / 2, ZC], b.e, b.t, Y, circ(BR2, 24), circ(BR2 - 0.9, 24), R5 - 0.2, s1));
  };
  const spin = { a: REST9, w: 0, mode: "rest", tgt: REST9 };
  let raw = REST9, said = "", last2 = null, lastT = 0, lastMove = -1e9, over = false, opened = false, from = 1, lit2 = null, drawnA = NaN;
  function drawDial() {
    if (spin.a === drawnA) return;
    drawnA = spin.a;
    const tk = [], lg = [], z = DP + DT;
    for (let m = 0; m < 100; m += 5) {
      const th = 90 + (m - spin.a) * 3.6, e = dir(th), r0 = m % 10 ? RD - 4 : RD - 6.5, r1 = RD - 1.8;
      const d = seg(P(e[0] * r0, z, ZC + e[2] * r0), P(e[0] * r1, z, ZC + e[2] * r1));
      if (m === COMBO) combo.setAttribute("d", d);
      else (m % 10 ? tk : lg).push(d);
    }
    ticks.setAttribute("d", tk.join(""));
    longs.setAttribute("d", lg.join(""));
  }
  function light() {
    const want = opened ? "bolts" : over ? "dial" : "combo";
    if (want === lit2) return;
    lit2 = want;
    bolts.forEach((b) => b.el.sil.classList.toggle("hi", want === "bolts"));
    dial.sil.classList.toggle("hi", want === "dial");
    combo.classList.toggle("hi", want === "combo");
  }
  function setOpen(on, now) {
    opened = on;
    bolts.forEach((b, i) => tset(b.tw, on ? 1 : 0, now, Math.abs(i - from) * STEP2));
    light();
  }
  function stepSpin(dt, now) {
    if (spin.mode === "rest") return false;
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (let i = 0; i < n; i++) {
      if (spin.mode === "coast") {
        spin.w = spin.w * Math.exp(-h * 1e3 / coast) - 40 * Math.sin(spin.a / 10 * 2 * Math.PI) * h;
        spin.a += spin.w * h;
        if (Math.abs(spin.w) < 12 && now - lastMove > 90) {
          spin.mode = "settle";
          spin.tgt = Math.round((spin.a + spin.w * 0.15) / 10) * 10;
        }
      } else {
        spin.w += (-90 * (spin.a - spin.tgt) - 16 * spin.w) * h;
        spin.a += spin.w * h;
      }
    }
    if (spin.mode === "settle" && Math.abs(spin.a - spin.tgt) < 0.01 && Math.abs(spin.w) < 0.2) {
      spin.a = spin.tgt = (spin.tgt % 100 + 100) % 100;
      spin.w = 0;
      spin.mode = "rest";
    }
    return spin.mode !== "rest";
  }
  const B3 = register(stage, (dt, now) => {
    let m = stepSpin(dt, now);
    const near = Math.abs(wrap(spin.a - COMBO));
    if (!opened && near < 0.8 && Math.abs(spin.w) < 6) setOpen(true, now);
    else if (opened && near > 2.5) setOpen(false, now);
    drawDial();
    bolts.forEach((b) => {
      drawBolt(b, tval(b.tw, now));
      if (!tdone(b.tw, now)) m = true;
    });
    const n = String((Math.round(spin.a) % 100 + 100) % 100).padStart(2, "0");
    const say = over || spin.mode !== "rest" ? `dial ${n}` + (opened ? " \xB7 open" : "") : "rest";
    if (say !== said) read.textContent = said = say;
    return m;
  });
  bag.add(B3.unregister);
  const p0 = P(0, DP, 0), px = P(1, DP, 0), pz = P(0, DP, 1);
  const ax2 = [px[0] - p0[0], px[1] - p0[1]], az = [pz[0] - p0[0], pz[1] - p0[1]], det = ax2[0] * az[1] - ax2[1] * az[0];
  function onFace([sx, sy]) {
    const qx = sx - p0[0], qy = sy - p0[1];
    return [(qx * az[1] - qy * az[0]) / det, (ax2[0] * qy - ax2[1] * qx) / det - ZC];
  }
  function leave() {
    over = false;
    last2 = null;
    if (reducedMotion()) {
      raw = spin.a = (Math.round(spin.a / 10) * 10 % 100 + 100) % 100;
      spin.w = 0;
      spin.mode = "rest";
    }
    light();
    B3.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => {
      const [u, v] = onFace(p), r = Math.hypot(u, v);
      if (r > R5 + GAP3 + KL + 10) return leave();
      const now = performance.now(), ang = Math.atan2(v, u) * 180 / Math.PI;
      over = true;
      from = THETA.reduce((bi, th, i) => Math.abs(wrap((ang - th) / 3.6)) < Math.abs(wrap((ang - THETA[bi]) / 3.6)) ? i : bi, 0);
      if (last2 !== null) {
        const da = -((ang - last2 + 540) % 360 - 180) / 3.6 * clamp(r / 22, 0, 1);
        if (reducedMotion()) {
          raw += da;
          spin.a = Math.round(raw / 10) * 10;
          spin.mode = "rest";
        } else {
          spin.w = clamp(lerp(spin.w, da / Math.max(8e-3, (now - lastT) / 1e3), 0.35), -WMAX2, WMAX2);
          spin.mode = "coast";
          raw = spin.a;
        }
        if (Math.abs(da) > 0.05) lastMove = now;
      }
      last2 = ang;
      lastT = now;
      light();
      B3.wake();
    },
    leave
  }));
  light();
  bag.add(() => svg.replaceChildren());
  return { set: (v) => {
    coast = v;
    B3.wake();
  }, destroy: bag.dispose };
};

// src/index.ts
function riffle(el, options) {
  return create({
    id: "riffle",
    label: "A tray of eight cards. Hover or use the arrow keys to pull a card.",
    rest: "rest",
    engine: mount13,
    focusable: true
  }, el, options);
}
function terrain(el, options) {
  return create({
    id: "terrain",
    label: "Eighty-one pillars on a plinth that rise around the pointer and rest as a dune with two rises.",
    rest: "rest",
    engine: mount17
  }, el, options);
}
function exploded(el, options) {
  return create({
    id: "exploded",
    label: "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.",
    rest: "",
    engine: mount5
  }, el, options);
}
function phosphor(el, options) {
  return create({
    id: "phosphor",
    label: "A seven by seven dot matrix on a floating tile that plays a loop, and fades like phosphor where you paint it.",
    rest: "loop",
    engine: mount12
  }, el, options);
}
function slow(el, options) {
  return create({
    id: "slow",
    label: "Crates riding a belt through a gate. Hovering slows the clock without stopping it.",
    rest: "rate 1.00\xD7",
    engine: mount15
  }, el, options);
}
function turntable(el, options) {
  return create({
    id: "turntable",
    label: "Blocks on a turntable. Flick across it to spin it; it settles on the nearest quarter turn.",
    rest: "az 045\xB0 \xB7 el 30\xB0",
    engine: mount18
  }, el, options);
}
function keyboard(el, options) {
  return create({
    id: "keyboard",
    label: "A sixty-key board. The key under the pointer sinks, and its neighbours follow it down, less the further away.",
    rest: "rest",
    engine: mount6
  }, el, options);
}
function elevator(el, options) {
  return create({
    id: "elevator",
    label: "Four floors beside an open shaft. The pointer's height picks a floor, and the car travels there through the ones between.",
    rest: "rest",
    engine: mount4
  }, el, options);
}
function phone(el, options) {
  return create({
    id: "phone",
    label: "A phone in layers: glass, board, battery, shell. Moving across opens the gap; moving down picks a layer.",
    rest: "rest",
    engine: mount11
  }, el, options);
}
function laptop(el, options) {
  return create({
    id: "laptop",
    label: "A thin laptop: the pointer's height sets how far the lid stands open, and the lid follows it on a spring.",
    rest: "rest",
    engine: mount7
  }, el, options);
}
function terminal(el, options) {
  return create({
    id: "terminal",
    label: "A terminal window: the pointer's height scrolls back through its history, and the line under it lifts off the screen.",
    rest: "rest",
    engine: mount16
  }, el, options);
}
function cabinet(el, options) {
  return create({
    id: "cabinet",
    label: "A rack of twelve blades: the pointer's height pulls the nearest ones out on their rails, the farther the less.",
    rest: "rest",
    engine: mount2
  }, el, options);
}
function branches(el, options) {
  return create({
    id: "branches",
    label: "A commit graph on a board: the commit under the pointer rises, and its history rises after it, the farther back the less.",
    rest: "rest",
    engine: mount
  }, el, options);
}
function vault(el, options) {
  return create({
    id: "vault",
    label: "A vault door: circling the pointer turns its dial, which coasts and catches every ten; on forty its three bolts draw back.",
    rest: "rest",
    engine: mount19
  }, el, options);
}
function lockers(el, options) {
  return create({
    id: "lockers",
    label: "A bank of twelve lockers, one ajar at rest: the locker under the pointer opens, and the one open before it swings shut.",
    rest: "rest",
    engine: mount8
  }, el, options);
}
function padlock(el, options) {
  return create({
    id: "padlock",
    label: "A padlock: as the pointer nears, the shackle springs up out of the body and swings open about its long leg.",
    rest: "rest",
    engine: mount9
  }, el, options);
}
function patch(el, options) {
  return create({
    id: "patch",
    label: "A patch panel of twenty-four ports: the cable under the pointer lifts, and its neighbours lean away, less the further away.",
    rest: "rest",
    engine: mount10
  }, el, options);
}
function dish(el, options) {
  return create({
    id: "dish",
    label: "A parabolic dish on a two-axis gimbal: the pointer aims it, and it follows on a spring.",
    rest: "rest",
    engine: mount3
  }, el, options);
}
function router(el, options) {
  return create({
    id: "router",
    label: "A wifi router whose antennas lean toward the pointer, the nearest the most and the others less the further away.",
    rest: "rest",
    engine: mount14
  }, el, options);
}
export {
  branches,
  cabinet,
  dish,
  elevator,
  exploded,
  keyboard,
  laptop,
  lockers,
  padlock,
  patch,
  phone,
  phosphor,
  riffle,
  router,
  slow,
  terminal,
  terrain,
  turntable,
  vault
};
//# sourceMappingURL=index.js.map