/**
 * GPU particle renderer with real physics.
 *
 * Position and velocity live in float textures and are stepped every frame on
 * the GPU (GPUComputationRenderer). Each particle is pulled toward a target by
 * a damped spring: its home on the source, or its scatter point when hidden.
 * Because state persists, the cursor can fling particles and they spring back,
 * and loading a new source morphs the existing cloud into it.
 */
(function (root) {
    // Shared GLSL: a stable scatter point on a shell, derived from the particle's seed.
    const scatterGLSL = `
        vec3 scatterPoint(float seed) {
            float u = fract(sin(seed * 91.17) * 43758.55) * 2.0 - 1.0;
            float th = fract(sin(seed * 47.31) * 23421.63) * 6.2831853;
            float r = 2.6 + fract(sin(seed * 13.7) * 9631.1) * 1.4;
            float s = sqrt(1.0 - u * u);
            return vec3(r * s * cos(th), r * u, r * s * sin(th));
        }
    `;

    const velocityShader = `
        uniform sampler2D tHome;
        uniform float uDt;
        uniform float uTime;
        uniform float uScatter;     // 1 = fly out to scatter points, 0 = go home
        uniform float uStiffness;
        uniform float uDamping;     // fraction of velocity kept per 1/60 s
        uniform float uMotion;      // 0 still, 1 drift, 2 vortex
        uniform vec3 uCursor;
        uniform vec3 uCursorVel;
        uniform float uCursorPower;
        uniform float uForce;
        uniform float uRadius;
        ${scatterGLSL}

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec4 p = texture2D(texturePosition, uv);
            vec3 pos = p.xyz;
            vec3 vel = texture2D(textureVelocity, uv).xyz;
            vec3 home = texture2D(tHome, uv).xyz;

            // Staggered targets: each particle switches at its own moment.
            float stagger = smoothstep(p.w * 0.5, p.w * 0.5 + 0.5, uScatter);
            vec3 target = mix(home, scatterPoint(p.w), stagger);
            vec3 acc = (target - pos) * uStiffness;

            if (uMotion > 0.5 && uMotion < 1.5) {
                float ph = p.w * 6.2831;
                acc += vec3(
                    sin(uTime * 0.9 + pos.y * 4.0 + ph),
                    cos(uTime * 0.7 + pos.z * 4.0 + ph),
                    sin(uTime * 0.8 + pos.x * 4.0 + ph)
                ) * 0.9;
            } else if (uMotion > 1.5) {
                acc += cross(vec3(0.0, 1.0, 0.0), pos) * 2.5 / (0.3 + length(pos.xz));
            }

            // Cursor: push out from the cursor and drag along with its motion.
            vec3 d = pos - uCursor;
            float dist = length(d);
            float fall = 1.0 - smoothstep(0.0, uRadius, dist);
            acc += (d / max(dist, 1e-4)) * fall * uForce * 60.0 * uCursorPower;
            acc += uCursorVel * fall * uForce * 8.0;

            vel = (vel + acc * uDt) * pow(uDamping, uDt * 60.0);
            gl_FragColor = vec4(vel, 1.0);
        }
    `;

    const positionShader = `
        uniform float uDt;
        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;
            vec4 p = texture2D(texturePosition, uv);
            vec3 v = texture2D(textureVelocity, uv).xyz;
            gl_FragColor = vec4(p.xyz + v * uDt, p.w);
        }
    `;

    const vertexShader = `
        attribute vec2 aRef;
        uniform sampler2D tPosition;
        uniform sampler2D tVelocity;
        uniform sampler2D tHome;
        uniform sampler2D tColor;
        uniform float uSize;
        uniform float uProjScale;
        uniform float uRampLength;
        uniform float uGlyphMode;
        varying vec3 vColor;
        varying float vGlyph;

        void main() {
            vec3 pos = texture2D(tPosition, aRef).xyz;
            float speed = length(texture2D(tVelocity, aRef).xyz);
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mv;
            float sizeBoost = uGlyphMode > 0.5 ? 2.2 : 1.0;
            gl_PointSize = clamp(uSize * sizeBoost * uProjScale / -mv.z, 1.0, 64.0);

            // Fast particles heat up toward white, so motion reads as energy.
            vColor = mix(texture2D(tColor, aRef).rgb, vec3(1.0), clamp(speed * 0.25, 0.0, 0.7));
            vGlyph = floor(texture2D(tHome, aRef).w * (uRampLength - 1.0) + 0.5);
        }
    `;

    const fragmentShader = `
        uniform sampler2D tAtlas;
        uniform float uGlyphCount;
        uniform float uGlyphMode;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vGlyph;

        void main() {
            vec2 pc = gl_PointCoord;
            float a;
            if (uGlyphMode > 0.5) {
                // Glyph cells are 1:1.75, so squeeze x to keep letters upright.
                float x = (pc.x - 0.5) * 1.75 + 0.5;
                if (x < 0.0 || x > 1.0 || vGlyph < 0.5) discard;
                a = texture2D(tAtlas, vec2((vGlyph + x) / uGlyphCount, 1.0 - pc.y)).r;
            } else {
                a = smoothstep(0.5, 0.15, length(pc - 0.5));
            }
            a *= uOpacity;
            if (a < 0.02) discard;
            gl_FragColor = vec4(vColor, a);
        }
    `;

    class ParticleSystem {
        constructor(renderer) {
            this.renderer = renderer;
            this.size = 0; // texture side; particle count = size * size
            this.material = new THREE.ShaderMaterial({
                vertexShader, fragmentShader,
                transparent: true, depthWrite: false,
                uniforms: {
                    tPosition: { value: null },
                    tVelocity: { value: null },
                    tHome: { value: null },
                    tColor: { value: null },
                    tAtlas: { value: null },
                    uSize: { value: 0.012 },
                    uProjScale: { value: 800 },
                    uRampLength: { value: 10 },
                    uGlyphCount: { value: 14 },
                    uGlyphMode: { value: 0 },
                    uOpacity: { value: 1 },
                },
            });
            this.points = new THREE.Points(new THREE.BufferGeometry(), this.material);
            this.points.frustumCulled = false;
            // Sim settings live here so they survive rebuilds of the compute pass.
            this.sim = {
                uScatter: 1, uStiffness: 14, uDamping: 0.88, uMotion: 0,
                uForce: 0.35, uRadius: 0.35, uCursorPower: 0,
                uCursor: new THREE.Vector3(99, 99, 99), uCursorVel: new THREE.Vector3(),
            };
        }

        /** Particle count for a requested count: the nearest full square texture. */
        static sideFor(count) { return Math.max(8, Math.round(Math.sqrt(count))); }

        setAtlas(atlas) {
            const u = this.material.uniforms;
            u.tAtlas.value = atlas.texture;
            u.uRampLength.value = atlas.rampLength;
            u.uGlyphCount.value = atlas.count;
        }

        build(size) {
            // r128 GPUComputationRenderer has no dispose(); free its render targets directly.
            if (this.gpu) this.gpu.variables.forEach((v) => v.renderTargets.forEach((rt) => rt.dispose()));
            this.size = size;
            const gpu = new THREE.GPUComputationRenderer(size, size, this.renderer);
            const pos0 = gpu.createTexture();
            const vel0 = gpu.createTexture();
            const p = pos0.image.data;
            for (let i = 0; i < size * size; i++) {
                p[i * 4 + 3] = Math.random(); // seed; xyz starts at the origin and springs out
            }
            this.posVar = gpu.addVariable('texturePosition', positionShader, pos0);
            this.velVar = gpu.addVariable('textureVelocity', velocityShader, vel0);
            gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);
            gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);
            this.posVar.material.uniforms.uDt = { value: 0 };
            const vu = this.velVar.material.uniforms;
            vu.uDt = { value: 0 }; vu.uTime = { value: 0 }; vu.tHome = { value: null };
            for (const k in this.sim) vu[k] = { value: this.sim[k] };
            const err = gpu.init();
            if (err) throw new Error(`Particle physics is not supported on this device: ${err}`);
            this.gpu = gpu;

            const ref = new Float32Array(size * size * 2);
            for (let i = 0; i < size * size; i++) {
                ref[i * 2] = ((i % size) + 0.5) / size;
                ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('aRef', new THREE.BufferAttribute(ref, 2));
            // Three needs a position attribute for draw counts; the shader ignores it.
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(size * size * 3), 3));
            this.points.geometry.dispose();
            this.points.geometry = g;
        }

        /**
         * Sets new home positions. If the count is unchanged the live particles
         * flow to the new shape (a morph); otherwise the simulation is rebuilt.
         * positions/colors: Float32Array xyz/rgb; luma 0..1. Length must be size².
         */
        setData(positions, colors, luma) {
            const size = ParticleSystem.sideFor(luma.length);
            if (size !== this.size) this.build(size);
            const n = size * size;
            const home = new Float32Array(n * 4), col = new Float32Array(n * 4);
            for (let i = 0; i < n; i++) {
                const j = i % luma.length; // pad by repeating if the sample came up short
                home.set([positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2], luma[j]], i * 4);
                col.set([colors[j * 3], colors[j * 3 + 1], colors[j * 3 + 2], 1], i * 4);
            }
            const tex = (data) => {
                const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
                t.needsUpdate = true;
                return t;
            };
            if (this.homeTex) { this.homeTex.dispose(); this.colorTex.dispose(); }
            this.homeTex = tex(home);
            this.colorTex = tex(col);
            this.velVar.material.uniforms.tHome.value = this.homeTex;
            this.material.uniforms.tHome.value = this.homeTex;
            this.material.uniforms.tColor.value = this.colorTex;
        }

        step(dt, time) {
            if (!this.gpu || !this.homeTex) return;
            // Two half steps keep stiff springs stable at low frame rates.
            const h = dt / 2;
            const vu = this.velVar.material.uniforms;
            for (const k in this.sim) vu[k].value = this.sim[k];
            this.posVar.material.uniforms.uDt.value = h;
            vu.uDt.value = h;
            vu.uTime.value = time;
            this.gpu.compute();
            this.gpu.compute();
            this.material.uniforms.tPosition.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
            this.material.uniforms.tVelocity.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
        }
    }

    root.ParticleSystem = ParticleSystem;
})(this);
