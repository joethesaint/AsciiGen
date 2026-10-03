/**
 * Picks safe starting settings for the machine, so a first visit never opens
 * on a stuttering scene. `pickTier` is pure (Node-testable); `probe` gathers
 * what the browser exposes.
 */
(function (root) {
    // Each tier is a complete starting point; the frame-rate guard steps down from it.
    const TIERS = {
        low:  { name: 'low',  count: 20,  pixelRatio: 1,   cell: 10, antialias: false },
        mid:  { name: 'mid',  count: 80,  pixelRatio: 1.5, cell: 8,  antialias: true },
        high: { name: 'high', count: 200, pixelRatio: 2,   cell: 8,  antialias: true },
    };
    const ORDER = ['low', 'mid', 'high'];

    // GPU strings that mean "no real graphics card": the CPU is doing the drawing.
    const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;
    // Integrated and older mobile GPUs: fine for ASCII, modest for big particle counts.
    const MODEST_GPU = /intel|mali|adreno [1-5]\d\d|powervr|apple a(9|1[0-2])\b|videocore/i;

    /**
     * info: { gpu, cores, memoryGB, mobile, floatTargets, reducedMotion }
     * Returns { tier, particles, reasons }.
     */
    function pickTier(info) {
        const reasons = [];
        let level = 2; // assume high, then step down for each limit found

        if (info.gpu && SOFTWARE_GPU.test(info.gpu)) { level = 0; reasons.push('software rendering'); }
        else if (info.gpu && MODEST_GPU.test(info.gpu)) { level = Math.min(level, 1); reasons.push('integrated GPU'); }

        if (info.mobile) { level = Math.min(level, 1); reasons.push('mobile device'); }
        if (info.cores && info.cores <= 2) { level = 0; reasons.push(`${info.cores} CPU cores`); }
        else if (info.cores && info.cores <= 4) { level = Math.min(level, 1); }
        if (info.memoryGB && info.memoryGB <= 2) { level = 0; reasons.push(`${info.memoryGB} GB memory`); }
        else if (info.memoryGB && info.memoryGB <= 4) { level = Math.min(level, 1); }

        const tier = { ...TIERS[ORDER[level]] };
        if (info.reducedMotion) reasons.push('reduced motion');
        // Particle physics needs float render targets; without them only ASCII runs.
        const particles = info.floatTargets !== false;
        if (!particles) reasons.push('no float render targets');
        return { tier, particles, reasons };
    }

    function stepDown(tier) {
        const i = ORDER.indexOf(tier.name);
        return i > 0 ? { ...TIERS[ORDER[i - 1]] } : null;
    }

    /** Reads the browser's hints. Uses a throwaway context so the real one can be configured. */
    function probe() {
        let gpu = '', floatTargets = false;
        try {
            const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
            if (gl) {
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
                floatTargets = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext
                    ? !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float')
                    : !!gl.getExtension('OES_texture_float') || !!gl.getExtension('OES_texture_half_float');
                const lose = gl.getExtension('WEBGL_lose_context');
                if (lose) lose.loseContext();
            }
        } catch (e) { /* no WebGL: pickTier falls to whatever the other hints allow */ }
        return {
            gpu,
            cores: navigator.hardwareConcurrency || 0,
            memoryGB: navigator.deviceMemory || 0,
            mobile: matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820,
            floatTargets,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        };
    }

    const api = { TIERS, pickTier, stepDown, probe };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Device = api;
})(this);
