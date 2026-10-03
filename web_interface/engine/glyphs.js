/**
 * Glyph ramps and the glyph atlas.
 *
 * A ramp only reads as ASCII art when each step in brightness maps to a
 * character with visibly more ink. Font metrics vary, so instead of trusting a
 * hand-ordered string we measure each glyph's ink coverage and rebuild the ramp
 * so its levels are evenly spaced in coverage.
 */
(function (root) {
    const GLYPH_SETS = {
        classic: ' .:-=+*#%@',
        detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
        blocks: ' ░▒▓█',
    };

    // Line glyphs used for edges, ordered by gradient angle: 0°, 45°, 90°, 135°.
    const EDGE_GLYPHS = '-/|\\';

    /**
     * Picks `levels` glyphs whose ink coverage is evenly spaced from the
     * lightest to the darkest glyph. Pure: takes [{ch, ink}] and returns chars.
     */
    function buildRamp(measured, levels) {
        const sorted = [...measured].sort((a, b) => a.ink - b.ink);
        if (levels >= sorted.length) return sorted.map((g) => g.ch); // small sets: keep every glyph
        const lo = sorted[0].ink;
        const hi = sorted[sorted.length - 1].ink;
        const ramp = [];
        for (let i = 0; i < levels; i++) {
            const target = lo + (hi - lo) * (i / (levels - 1));
            let best = sorted[0];
            for (const g of sorted) {
                if (Math.abs(g.ink - target) < Math.abs(best.ink - target)) best = g;
            }
            ramp.push(best.ch);
        }
        return ramp;
    }

    function measureInk(chars, font, w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        return [...chars].map((ch) => {
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#fff'; ctx.font = font;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ch, w / 2, h / 2);
            const px = ctx.getImageData(0, 0, w, h).data;
            let ink = 0;
            for (let i = 0; i < px.length; i += 4) ink += px[i];
            return { ch, ink: ink / (255 * w * h) };
        });
    }

    /**
     * Renders ramp + edge glyphs into one horizontal strip texture.
     * Returns { texture, rampLength, edgeOffset, count }.
     */
    function createGlyphAtlas(setName, levels = 16) {
        const tileW = 48, tileH = 84; // ~1:1.75, the shape of a terminal cell
        const font = `${Math.round(tileH * 0.8)}px "JetBrains Mono", "Courier New", monospace`;
        const chars = GLYPH_SETS[setName] || GLYPH_SETS.classic;
        const uniqueCount = new Set(chars).size;
        const ramp = buildRamp(measureInk(chars, font, tileW, tileH), Math.min(levels, uniqueCount));
        const all = ramp.concat([...EDGE_GLYPHS]);

        const canvas = document.createElement('canvas');
        canvas.width = tileW * all.length; canvas.height = tileH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff'; ctx.font = font;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        all.forEach((ch, i) => ctx.fillText(ch, i * tileW + tileW / 2, tileH / 2));

        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        return { texture, ramp, rampLength: ramp.length, edgeOffset: ramp.length, count: all.length };
    }

    const api = { GLYPH_SETS, EDGE_GLYPHS, buildRamp, createGlyphAtlas };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Glyphs = api;
})(this);
