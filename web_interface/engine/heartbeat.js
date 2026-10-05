/** Shared double-beat envelope: both renderers pulse together without resampling. */
(function (root) {
    function scaleAt(seconds, bpm = 72, enabled = true, reducedMotion = false) {
        if (!enabled || reducedMotion || !Number.isFinite(seconds)) return 1;
        const rate = Number.isFinite(bpm) ? Math.max(40, Math.min(160, bpm)) : 72;
        const phase = ((seconds * rate / 60) % 1 + 1) % 1;
        const pulse = (start, duration) => {
            const t = (phase - start) / duration;
            return t > 0 && t < 1 ? Math.sin(Math.PI * t) ** 2 : 0;
        };
        return 1 + 0.095 * pulse(0.04, 0.19) + 0.055 * pulse(0.29, 0.23);
    }
    const api = { scaleAt };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Heartbeat = api;
})(this);
