/**
 * Point sampling for the particle renderer. Pure functions over typed arrays,
 * so they run in Node tests as well as the browser.
 */
(function (root) {
    // Deterministic RNG so the same source always gives the same cloud.
    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function pickWeighted(cumulative, r) {
        let lo = 0, hi = cumulative.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (cumulative[mid] < r) lo = mid + 1; else hi = mid;
        }
        return lo;
    }

    /**
     * Samples `count` points uniformly by area over a triangle mesh.
     * pos: Float32Array xyz per vertex. index: triangle vertex indices (or null).
     * uv: Float32Array uv per vertex (or null).
     * Returns { positions, normals, uvs } as flat Float32Arrays.
     */
    function sampleSurface(pos, index, uv, count, seed = 1) {
        const rand = mulberry32(seed);
        const triCount = (index ? index.length : pos.length / 3) / 3;
        const v = (t, k) => (index ? index[t * 3 + k] : t * 3 + k);

        const cumulative = new Float64Array(triCount);
        let total = 0;
        for (let t = 0; t < triCount; t++) {
            const a = v(t, 0) * 3, b = v(t, 1) * 3, c = v(t, 2) * 3;
            const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
            const wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
            const cx = uy * wz - uz * wy, cy = uz * wx - ux * wz, cz = ux * wy - uy * wx;
            total += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
            cumulative[t] = total;
        }

        const positions = new Float32Array(count * 3);
        const normals = new Float32Array(count * 3);
        const uvs = new Float32Array(count * 2);
        if (total === 0 || count === 0) return { positions, normals, uvs, area: total };

        for (let i = 0; i < count; i++) {
            const t = pickWeighted(cumulative, rand() * total);
            const ia = v(t, 0), ib = v(t, 1), ic = v(t, 2);
            let s = rand(), r = rand();
            if (s + r > 1) { s = 1 - s; r = 1 - r; }
            const wa = 1 - s - r;
            for (let k = 0; k < 3; k++) {
                positions[i * 3 + k] = pos[ia * 3 + k] * wa + pos[ib * 3 + k] * s + pos[ic * 3 + k] * r;
            }
            const ux = pos[ib * 3] - pos[ia * 3], uy = pos[ib * 3 + 1] - pos[ia * 3 + 1], uz = pos[ib * 3 + 2] - pos[ia * 3 + 2];
            const wx = pos[ic * 3] - pos[ia * 3], wy = pos[ic * 3 + 1] - pos[ia * 3 + 1], wz = pos[ic * 3 + 2] - pos[ia * 3 + 2];
            let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
            const nl = Math.hypot(nx, ny, nz) || 1;
            normals[i * 3] = nx / nl; normals[i * 3 + 1] = ny / nl; normals[i * 3 + 2] = nz / nl;
            if (uv) {
                uvs[i * 2] = uv[ia * 2] * wa + uv[ib * 2] * s + uv[ic * 2] * r;
                uvs[i * 2 + 1] = uv[ia * 2 + 1] * wa + uv[ib * 2 + 1] * s + uv[ic * 2 + 1] * r;
            }
        }
        return { positions, normals, uvs, area: total };
    }

    /**
     * Samples `count` points from RGBA pixels, weighted toward detail:
     * bright pixels and edges get more particles, flat dark areas fewer.
     * Returns { px, py, rgb, luma } where px/py are pixel coordinates.
     */
    function sampleImage(rgba, width, height, count, seed = 1) {
        const rand = mulberry32(seed);
        const n = width * height;
        const luma = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            luma[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255 * (rgba[i * 4 + 3] / 255);
        }
        const cumulative = new Float64Array(n);
        let total = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = y * width + x;
                const gx = x < width - 1 ? Math.abs(luma[i + 1] - luma[i]) : 0;
                const gy = y < height - 1 ? Math.abs(luma[i + width] - luma[i]) : 0;
                total += 0.02 + luma[i] * 0.6 + Math.min(1, (gx + gy) * 4);
                cumulative[i] = total;
            }
        }
        const px = new Float32Array(count), py = new Float32Array(count);
        const rgb = new Float32Array(count * 3), lum = new Float32Array(count);
        for (let k = 0; k < count; k++) {
            const i = pickWeighted(cumulative, rand() * total);
            px[k] = (i % width) + rand();
            py[k] = Math.floor(i / width) + rand();
            rgb[k * 3] = rgba[i * 4] / 255; rgb[k * 3 + 1] = rgba[i * 4 + 1] / 255; rgb[k * 3 + 2] = rgba[i * 4 + 2] / 255;
            lum[k] = luma[i];
        }
        return { px, py, rgb, luma: lum };
    }

    const api = { mulberry32, sampleSurface, sampleImage };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.Sampler = api;
})(this);
