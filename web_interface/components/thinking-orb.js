/**
 * Thinking orb loader — Orb by Libraries.dev (thinking-orbs, MIT © Jakub Antalik).
 *
 * The package's React component is a thin wrapper over a framework-free engine;
 * this project has no React, so the engine is driven directly the same way the
 * component drives it: resolve the preset, build a frame for time t, paint it.
 *
 * Exposes window.ThinkingOrb once loaded, and fires `thinking-orb-ready`.
 */
import { resolvePreset, MODE_FRAMES, paintFrame } from 'https://cdn.jsdelivr.net/npm/thinking-orbs@0.3.2/dist/engine.es.js';

const STATES = ['working', 'searching', 'solving', 'listening', 'connecting', 'weaving', 'composing', 'breathing', 'shaping'];
const LAST_KEY = 'pointgen.lastOrb';

/** A random state, never the one this visitor saw last, so a return visit looks different. */
function randomState() {
    let last = null;
    try { last = localStorage.getItem(LAST_KEY); } catch (_) { /* storage blocked: still random */ }
    const pool = STATES.filter((s) => s !== last);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(LAST_KEY, pick); } catch (_) { /* fine without it */ }
    return pick;
}

/** Draws `state` into `canvas` until the returned stop() is called. */
function mount(canvas, { state = 'working', size = 64, dark = true, speed = 1 } = {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // the component caps DPR at 2 too
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Loading (${state})`);
    const ctx = canvas.getContext('2d');
    const { mode, speed: baseSpeed, opts } = resolvePreset(state, size);
    const effSpeed = baseSpeed * speed;
    const frame = (tSec) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        paintFrame(ctx, MODE_FRAMES[mode](size, tSec, opts), dark);
    };

    // Reduced motion gets one representative still, as the component does.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        frame(0.6);
        return { state, stop() {} };
    }
    let raf = 0;
    const loop = () => {
        frame((performance.now() / 1000) * effSpeed);
        raf = requestAnimationFrame(loop);
    };
    loop();
    return { state, stop() { cancelAnimationFrame(raf); } };
}

window.ThinkingOrb = { STATES, randomState, mount };
window.dispatchEvent(new Event('thinking-orb-ready'));
