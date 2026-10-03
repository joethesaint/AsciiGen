const test = require('node:test');
const assert = require('node:assert');
const { buildRamp, GLYPH_SETS } = require('../engine/glyphs.js');
const { sampleSurface, sampleImage, mulberry32 } = require('../engine/sampler.js');

test('buildRamp orders glyphs from least to most ink', () => {
    const measured = [{ ch: '@', ink: 0.6 }, { ch: ' ', ink: 0 }, { ch: '.', ink: 0.05 }, { ch: '+', ink: 0.3 }];
    assert.deepStrictEqual(buildRamp(measured, 4), [' ', '.', '+', '@']);
});

test('buildRamp spaces levels evenly in coverage', () => {
    const measured = [...'abcdefghij'].map((ch, i) => ({ ch, ink: (i / 9) ** 3 }));
    const ramp = buildRamp(measured, 3);
    assert.strictEqual(ramp[0], 'a');
    assert.strictEqual(ramp[2], 'j');
    assert.strictEqual(ramp[1], 'h'); // 0.5 coverage sits near (7/9)^3, not the middle letter
});

test('glyph sets start with a blank so dark areas stay empty', () => {
    for (const set of Object.values(GLYPH_SETS)) assert.strictEqual(set[0], ' ');
});

test('sampleSurface puts points on the triangle with the right normal', () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const s = sampleSurface(pos, null, null, 500, 1);
    for (let i = 0; i < 500; i++) {
        const x = s.positions[i * 3], y = s.positions[i * 3 + 1], z = s.positions[i * 3 + 2];
        assert.ok(x >= 0 && y >= 0 && x + y <= 1 + 1e-6 && z === 0);
        assert.strictEqual(s.normals[i * 3 + 2], 1);
    }
    assert.ok(Math.abs(s.area - 0.5) < 1e-9);
});

test('sampleSurface follows area: a triangle 3x larger gets ~3x the points', () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 10, 0, 0, 13, 0, 0, 10, 1, 0]);
    const s = sampleSurface(pos, null, null, 8000, 2);
    let big = 0;
    for (let i = 0; i < 8000; i++) if (s.positions[i * 3] >= 10) big++;
    const ratio = big / (8000 - big);
    assert.ok(ratio > 2.7 && ratio < 3.3, `ratio ${ratio}`);
});

test('sampleImage puts most points on bright pixels, some on the edge, few on black', () => {
    const w = 20, h = 10, rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, v = x >= 10 ? 255 : 0;
        rgba[i] = rgba[i + 1] = rgba[i + 2] = v; rgba[i + 3] = 255;
    }
    const s = sampleImage(rgba, w, h, 4000, 3);
    let right = 0;
    for (const x of s.px) if (x >= 10) right++;
    assert.ok(right / 4000 > 0.75, `right share ${right / 4000}`);
});

test('mulberry32 is deterministic', () => {
    const a = mulberry32(5), b = mulberry32(5);
    for (let i = 0; i < 10; i++) assert.strictEqual(a(), b());
});
