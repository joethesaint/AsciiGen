const test = require('node:test');
const assert = require('node:assert');
const { pickTier, stepDown, TIERS } = require('../engine/device.js');

const base = { gpu: 'ANGLE (NVIDIA GeForce RTX 3070 Direct3D11)', cores: 12, memoryGB: 8, mobile: false, floatTargets: true };

test('a desktop with a dedicated GPU gets high quality', () => {
    assert.strictEqual(pickTier(base).tier.name, 'high');
});

test('software rendering always starts low', () => {
    assert.strictEqual(pickTier({ ...base, gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))' }).tier.name, 'low');
    assert.strictEqual(pickTier({ ...base, gpu: 'Microsoft Basic Render Driver' }).tier.name, 'low');
});

test('integrated GPUs and phones start at mid', () => {
    assert.strictEqual(pickTier({ ...base, gpu: 'ANGLE (Intel(R) UHD Graphics 620)' }).tier.name, 'mid');
    assert.strictEqual(pickTier({ ...base, gpu: 'Apple GPU', mobile: true }).tier.name, 'mid');
});

test('weak CPU or memory forces low even with a good GPU', () => {
    assert.strictEqual(pickTier({ ...base, cores: 2 }).tier.name, 'low');
    assert.strictEqual(pickTier({ ...base, memoryGB: 2 }).tier.name, 'low');
});

test('unknown hints (browser hides them) do not lower the tier', () => {
    assert.strictEqual(pickTier({ ...base, gpu: '', cores: 0, memoryGB: 0 }).tier.name, 'high');
});

test('no float render targets turns particles off but keeps the tier', () => {
    const r = pickTier({ ...base, floatTargets: false });
    assert.strictEqual(r.particles, false);
    assert.strictEqual(r.tier.name, 'high');
});

test('stepDown walks high -> mid -> low -> stop, and tiers are not shared objects', () => {
    assert.strictEqual(stepDown(TIERS.high).name, 'mid');
    assert.strictEqual(stepDown(TIERS.mid).name, 'low');
    assert.strictEqual(stepDown(TIERS.low), null);
    pickTier(base).tier.count = 1;
    assert.notStrictEqual(TIERS.high.count, 1);
});
