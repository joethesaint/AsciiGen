/**
 * True ASCII renderer.
 *
 * The scene (image plane or GLB) is rendered normally into a texture, then a
 * full-screen shader splits the screen into a fixed grid of character cells.
 * Each cell averages the scene under it and draws one glyph, so the output
 * stays a clean character grid at any camera angle.
 */
(function (root) {
    const vertexShader = `
        void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
    `;

    const fragmentShader = `
        uniform sampler2D tScene;
        uniform sampler2D tAtlas;
        uniform vec2 uResolution;   // drawing buffer size in px
        uniform vec2 uCell;         // cell size in px
        uniform float uRampLength;
        uniform float uEdgeOffset;
        uniform float uGlyphCount;
        uniform float uContrast;
        uniform float uInvert;
        uniform float uColorMode;   // 0 = ink colour, 1 = scene colour
        uniform float uEdges;       // 1 = use line glyphs on strong edges
        uniform float uOpacity;
        uniform vec3 uInk;
        uniform vec3 uBg;

        float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

        // Average of 5 taps inside a cell: centre plus four quarter points.
        vec4 cellSample(vec2 cell) {
            vec2 px = (cell + 0.5) * uCell;
            vec2 q = uCell * 0.25;
            vec4 s = texture2D(tScene, px / uResolution);
            s += texture2D(tScene, (px + vec2(-q.x, -q.y)) / uResolution);
            s += texture2D(tScene, (px + vec2( q.x, -q.y)) / uResolution);
            s += texture2D(tScene, (px + vec2(-q.x,  q.y)) / uResolution);
            s += texture2D(tScene, (px + vec2( q.x,  q.y)) / uResolution);
            return s / 5.0;
        }

        float cellLuma(vec2 cell) {
            vec4 s = cellSample(cell);
            return luma(s.rgb) * s.a;
        }

        void main() {
            vec2 cell = floor(gl_FragCoord.xy / uCell);
            vec2 inCell = fract(gl_FragCoord.xy / uCell);

            vec4 src = cellSample(cell);
            float l = luma(src.rgb) * src.a;
            l = clamp((l - 0.5) * uContrast + 0.5, 0.0, 1.0);
            if (uInvert > 0.5) l = 1.0 - l;

            float glyph = floor(l * (uRampLength - 1.0) + 0.5);

            // Sobel across neighbouring cells picks a line glyph on strong edges.
            if (uEdges > 0.5 && src.a > 0.05) {
                float tl = cellLuma(cell + vec2(-1.0,  1.0));
                float t  = cellLuma(cell + vec2( 0.0,  1.0));
                float tr = cellLuma(cell + vec2( 1.0,  1.0));
                float ml = cellLuma(cell + vec2(-1.0,  0.0));
                float mr = cellLuma(cell + vec2( 1.0,  0.0));
                float bl = cellLuma(cell + vec2(-1.0, -1.0));
                float b  = cellLuma(cell + vec2( 0.0, -1.0));
                float br = cellLuma(cell + vec2( 1.0, -1.0));
                float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
                float gy = (tl + 2.0 * t + tr) - (bl + 2.0 * b + br);
                if (length(vec2(gx, gy)) > 1.1) {
                    // Line glyph runs perpendicular to the gradient.
                    float a = atan(gy, gx) + 1.5707963;
                    float k = mod(floor(a / 0.7853982 + 0.5), 4.0);
                    glyph = uEdgeOffset + k;
                }
            }

            float u = (glyph + inCell.x) / uGlyphCount;
            float ink = texture2D(tAtlas, vec2(u, inCell.y)).r;

            vec3 tint = uInk;
            if (uColorMode > 0.5) {
                float m = max(max(src.r, src.g), max(src.b, 0.001));
                tint = mix(src.rgb / m, uInk, 0.15); // full-strength hue, glyph carries the tone
            }
            gl_FragColor = vec4(mix(uBg, tint, ink), uOpacity);
        }
    `;

    class AsciiPass {
        constructor(renderer) {
            this.renderer = renderer;
            this.target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
            // Store display (sRGB) values: linear storage crushes mid-tones into blank cells.
            this.target.texture.encoding = THREE.sRGBEncoding;
            this.material = new THREE.ShaderMaterial({
                vertexShader, fragmentShader,
                transparent: true, depthTest: false, depthWrite: false,
                uniforms: {
                    tScene: { value: this.target.texture },
                    tAtlas: { value: null },
                    uResolution: { value: new THREE.Vector2() },
                    uCell: { value: new THREE.Vector2(10, 17.5) },
                    uRampLength: { value: 10 },
                    uEdgeOffset: { value: 10 },
                    uGlyphCount: { value: 14 },
                    uContrast: { value: 1.2 },
                    uInvert: { value: 0 },
                    uColorMode: { value: 0 },
                    uEdges: { value: 1 },
                    uOpacity: { value: 1 },
                    uInk: { value: new THREE.Color('#e6e6dc') },
                    uBg: { value: new THREE.Color('#0a0b0c') },
                },
            });
            this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
            this.quad.frustumCulled = false;
            this.quadScene = new THREE.Scene();
            this.quadScene.add(this.quad);
            this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }

        setAtlas(atlas) {
            const u = this.material.uniforms;
            u.tAtlas.value = atlas.texture;
            u.uRampLength.value = atlas.rampLength;
            u.uEdgeOffset.value = atlas.edgeOffset;
            u.uGlyphCount.value = atlas.count;
        }

        // Cell width in CSS px; height follows the 1:1.75 terminal cell shape.
        setCellSize(cssPx) {
            const pr = this.renderer.getPixelRatio();
            this.material.uniforms.uCell.value.set(cssPx * pr, cssPx * 1.75 * pr);
        }

        setSize(width, height) {
            const pr = this.renderer.getPixelRatio();
            this.target.setSize(width * pr, height * pr);
            this.material.uniforms.uResolution.value.set(width * pr, height * pr);
        }

        render(scene, camera) {
            const r = this.renderer;
            r.setRenderTarget(this.target);
            r.setClearColor(0x000000, 0);
            r.clear();
            r.render(scene, camera);
            r.setRenderTarget(null);
            r.render(this.quadScene, this.quadCamera);
        }
    }

    root.AsciiPass = AsciiPass;
})(this);
