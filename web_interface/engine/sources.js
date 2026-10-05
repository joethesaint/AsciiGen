/**
 * Turns an image or a GLB into the two things the renderers need:
 *   object   – a Three.js object the ASCII pass renders (lit model or image plane)
 *   particles – { positions, colors, luma } sampled from the same source
 * Everything is normalised to fit a 2-unit box at the origin.
 */
(function (root) {
    const LIGHT = new THREE.Vector3(0.5, 0.8, 0.6).normalize();
    const AMBIENT = 0.4;

    function luma(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

    function loadImageElement(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Could not load image: ${url}`));
            img.src = url;
        });
    }

    function pixelsOf(img, maxSide) {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
    }

    function fromDrawable(img, particleCount, live = false) {
        const aspect = img.width / img.height;
        const w = aspect >= 1 ? 2 : 2 * aspect;
        const h = aspect >= 1 ? 2 / aspect : 2;

        const texture = live ? new THREE.CanvasTexture(img) : new THREE.Texture(img);
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;
        const object = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            // Double-sided: orbiting past the edge shows the image mirrored instead of a black void.
            new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
        );

        const px = pixelsOf(img, 512);
        const s = Sampler.sampleImage(px.data, px.width, px.height, particleCount, 3);
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (s.px[i] / px.width - 0.5) * w;
            positions[i * 3 + 1] = (0.5 - s.py[i] / px.height) * h;
            positions[i * 3 + 2] = (s.luma[i] - 0.5) * 0.15; // slight relief so orbiting shows depth
        }
        return {
            kind: 'image', object, particles: { positions, colors: s.rgb, luma: s.luma },
            tick: live ? () => { texture.needsUpdate = true; } : null,
        };
    }

    async function fromImage(url, particleCount) {
        return fromDrawable(await loadImageElement(url), particleCount);
    }

    function fromImageElement(image, particleCount) {
        return fromDrawable(image, particleCount);
    }

    function fromCanvas(canvas, particleCount) {
        return fromDrawable(canvas, particleCount, true);
    }

    const texturePixels = new Map();
    function textureReader(tex) {
        if (!tex || !tex.image) return null;
        if (!texturePixels.has(tex)) {
            try { texturePixels.set(tex, pixelsOf(tex.image, 1024)); }
            catch (e) { texturePixels.set(tex, null); } // tainted or unsupported image
        }
        const px = texturePixels.get(tex);
        if (!px) return null;
        return (u, v) => {
            u -= Math.floor(u); v -= Math.floor(v);
            if (tex.flipY) v = 1 - v;
            const x = Math.min(px.width - 1, Math.floor(u * px.width));
            const y = Math.min(px.height - 1, Math.floor(v * px.height));
            const i = (y * px.width + x) * 4;
            return [px.data[i] / 255, px.data[i + 1] / 255, px.data[i + 2] / 255];
        };
    }

    function normalise(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const scale = 2 / Math.max(size.x, size.y, size.z, 1e-6);
        const holder = new THREE.Group();
        object.position.sub(centre);
        holder.add(object);
        holder.scale.setScalar(scale);
        holder.updateMatrixWorld(true);
        return holder;
    }

    function addLights(group) {
        group.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.3));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.copy(LIGHT).multiplyScalar(5);
        group.add(key);
    }

    function fromGLB(url, particleCount) {
        return new Promise((resolve, reject) => {
            new THREE.GLTFLoader().load(url, (gltf) => {
                const holder = normalise(gltf.scene);

                // World-space geometry for each mesh, so counts follow real surface area.
                const meshes = [];
                holder.traverse((child) => {
                    if (!child.isMesh) return;
                    // Scanned/exported models often have inverted winding; double-sided
                    // rendering shows the near surface with correctly flipped normals.
                    (Array.isArray(child.material) ? child.material : [child.material]).forEach((mt) => { mt.side = THREE.DoubleSide; });
                    const geo = child.geometry;
                    const pos = geo.attributes.position.clone().applyMatrix4(child.matrixWorld).array;
                    const index = geo.index ? geo.index.array : null;
                    const uv = geo.attributes.uv ? geo.attributes.uv.array : null;
                    const area = Sampler.sampleSurface(pos, index, uv, 0).area;
                    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                    meshes.push({ pos, index, uv, area, mat, vcol: geo.attributes.color || null });
                });
                const totalArea = meshes.reduce((a, m) => a + m.area, 0);
                if (!totalArea) return reject(new Error('This model has no surfaces to sample.'));

                const positions = [], colors = [], lumas = [];
                meshes.forEach((m, mi) => {
                    const n = Math.round(particleCount * (m.area / totalArea));
                    if (!n) return;
                    const s = Sampler.sampleSurface(m.pos, m.index, m.uv, n, 11 + mi);
                    // Material colours are linear; particles draw in sRGB like the texture pixels.
                    const base = m.mat && m.mat.color ? m.mat.color.clone().convertLinearToSRGB() : new THREE.Color(0.9, 0.9, 0.86);
                    const read = textureReader(m.mat && m.mat.map);
                    for (let i = 0; i < n; i++) {
                        let r = base.r, g = base.g, b = base.b;
                        if (read && m.uv) {
                            const t = read(s.uvs[i * 2], s.uvs[i * 2 + 1]);
                            r *= t[0]; g *= t[1]; b *= t[2];
                        }
                        const nx = s.normals[i * 3], ny = s.normals[i * 3 + 1], nz = s.normals[i * 3 + 2];
                        // Two-sided lambert: scanned models often have flipped normals.
                        const shade = AMBIENT + (1 - AMBIENT) * Math.abs(nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
                        r *= shade; g *= shade; b *= shade;
                        positions.push(s.positions[i * 3], s.positions[i * 3 + 1], s.positions[i * 3 + 2]);
                        colors.push(r, g, b);
                        lumas.push(luma(r, g, b));
                    }
                });

                // Auto-exposure: dark materials would vanish against the background,
                // so lift the 95th-percentile brightness to 0.9.
                const sortedL = Float32Array.from(lumas).sort();
                const gain = Math.min(4, 0.9 / Math.max(sortedL[Math.floor(sortedL.length * 0.95)] || 1, 0.05));
                for (let i = 0; i < colors.length; i++) colors[i] = Math.min(1, colors[i] * gain);
                for (let i = 0; i < lumas.length; i++) lumas[i] = Math.min(1, lumas[i] * gain);

                addLights(holder);
                resolve({
                    kind: 'model',
                    object: holder,
                    particles: {
                        positions: new Float32Array(positions),
                        colors: new Float32Array(colors),
                        luma: new Float32Array(lumas),
                    },
                });
            }, undefined, () => reject(new Error('Could not read this GLB/GLTF file.')));
        });
    }

    root.Sources = { fromImage, fromImageElement, fromCanvas, fromGLB };
})(this);
