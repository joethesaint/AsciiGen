/**
 * PointGen v5 – wires the source, the two renderers and the sidebar together.
 *
 * ASCII mode:     source scene -> AsciiPass (fixed character grid)
 * Particles mode: sampled points -> ParticleSystem
 * Switching modes cross-fades: the ASCII grid fades while particles spring
 * in from their scatter shell. Loading a new source morphs the live particles.
 */
(function () {
    const BG = new THREE.Color('#0a0b0c');
    const RAMP_LEVELS = { classic: 10, detailed: 32, blocks: 5 };

    // Safe starting quality for this machine (see engine/device.js).
    const device = Device.pickTier(Device.probe());
    let tier = device.tier;
    let particlesOK = device.particles;
    let userSetQuality = false; // once the user picks a count or cell size, stop auto-adjusting

    const config = {
        render: 'ascii', glyphs: 'classic', color: 'mono', sprite: 'dots', motion: 'still',
        cell: tier.cell, contrast: 130, edges: false, invert: false,
        count: tier.count, size: 10, force: 35, radius: 35, spring: 14, trails: false, orbit: false,
    };

    // preserveDrawingBuffer keeps the last frame, which trails need.
    const renderer = new THREE.WebGLRenderer({ antialias: tier.antialias, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatio));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.autoClear = false;
    document.getElementById('canvas-holder').appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
    camera.position.set(0, 0.2, 3.6);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 12;
    controls.saveState();

    const sourceScene = new THREE.Scene();
    // PBR models (especially metallic ones) render near-black without an environment to reflect.
    sourceScene.environment = new THREE.PMREMGenerator(renderer).fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    const particleScene = new THREE.Scene();
    const ascii = new AsciiPass(renderer);
    const particles = new ParticleSystem(renderer);
    particleScene.add(particles.points);

    const debug = { raw: false };
    let source = null;      // { url, isModel }
    let sourceObject = null;
    let asciiOpacity = 1;   // eased toward the target for the active mode
    let particleOpacity = 0;

    // Trails: instead of clearing, darken the last frame a little.
    const fadeScene = new THREE.Scene();
    fadeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
        // Material colours are encoded to sRGB on output, so convert BG back to linear first.
        new THREE.MeshBasicMaterial({ color: BG.clone().convertSRGBToLinear(), transparent: true, opacity: 0.16, depthTest: false })));
    const fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const statusEl = document.getElementById('status-msg');
    const statsEl = document.getElementById('stats');
    const setStatus = (msg) => { statusEl.textContent = msg; };

    // ---------- glyphs ----------
    function rebuildAtlas() {
        const atlas = Glyphs.createGlyphAtlas(config.glyphs, RAMP_LEVELS[config.glyphs]);
        ascii.setAtlas(atlas);
        particles.setAtlas(atlas);
    }

    // ---------- source loading ----------
    async function load(url, isModel) {
        source = { url, isModel };
        const t0 = performance.now();
        setStatus('Loading…');
        try {
            const side = ParticleSystem.sideFor(config.count * 1000);
            const count = side * side;
            const result = isModel ? await Sources.fromGLB(url, count) : await Sources.fromImage(url, count);
            if (sourceObject) sourceScene.remove(sourceObject);
            sourceObject = result.object;
            sourceScene.add(sourceObject);
            const p = result.particles;
            if (particlesOK) {
                try { particles.setData(p.positions, p.colors, p.luma); }
                catch (e) { console.error(e); disableParticles(); }
            }
            statsEl.textContent = `${particlesOK ? (p.luma.length / 1000).toFixed(0) + 'k pts · ' : ''}${(performance.now() - t0).toFixed(0)} ms · ${tier.name} quality`;
            setStatus('');
            startFpsGuard();
        } catch (e) {
            console.error(e);
            setStatus(`${e.message} Try another file.`);
        }
    }

    // Without float render targets the physics can't run, so offer ASCII only.
    function disableParticles() {
        particlesOK = false;
        const btn = document.querySelector('[data-group=render] [data-value=particles]');
        btn.disabled = true;
        btn.title = 'This device cannot run particle physics.';
        if (config.render === 'particles') document.querySelector('[data-group=render] [data-value=ascii]').click();
        setStatus('Particles are unavailable on this device. ASCII mode works normally.');
    }

    // ---------- frame-rate guard ----------
    // Measures a few seconds after each load; if the scene can't hold ~28 FPS,
    // drop one quality tier and reload. Stops once the user sets quality themselves.
    let guard = null;
    function startFpsGuard() {
        if (!userSetQuality && !document.hidden) guard = { start: performance.now() + 1000, frames: 0 };
    }
    function checkFpsGuard(now) {
        if (!guard || now < guard.start) return;
        guard.frames++;
        if (now - guard.start < 3000) return;
        const fps = guard.frames / ((now - guard.start) / 1000);
        guard = null;
        const lower = fps < 28 && !userSetQuality && Device.stepDown(tier);
        if (!lower) return;
        tier = lower;
        config.count = tier.count;
        config.cell = tier.cell;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatio));
        syncInputs();
        resize();
        applyConfig();
        if (source) load(source.url, source.isModel).then(() => {
            setStatus(`Lowered to ${tier.name} quality to keep things smooth. Raise Count if you want more.`);
        });
    }

    const isModelName = (name) => /\.(glb|gltf)$/i.test(name);

    document.getElementById('file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) load(URL.createObjectURL(file), isModelName(file.name));
    });
    document.querySelectorAll('[data-sample]').forEach((btn) => {
        btn.addEventListener('click', () => load(btn.dataset.sample, isModelName(btn.dataset.sample)));
    });

    // ---------- sidebar ----------
    function applyConfig() {
        const u = ascii.material.uniforms;
        ascii.setCellSize(config.cell);
        u.uContrast.value = config.contrast / 100;
        u.uColorMode.value = config.color === 'source' ? 1 : 0;
        u.uEdges.value = config.edges ? 1 : 0;
        u.uInvert.value = config.invert ? 1 : 0;

        const p = particles.material.uniforms;
        p.uSize.value = config.size / 1000;
        p.uGlyphMode.value = config.sprite === 'glyphs' ? 1 : 0;
        const sim = particles.sim;
        sim.uForce = config.force / 100;
        sim.uRadius = config.radius / 100;
        sim.uStiffness = config.spring;
        sim.uMotion = { still: 0, drift: 1, vortex: 2 }[config.motion];
        controls.autoRotate = config.orbit;

        document.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== config.render; });
        // The character set only matters when characters are on screen.
        document.getElementById('charset-section').hidden = config.render === 'particles' && config.sprite === 'dots';
        document.querySelectorAll('[data-out]').forEach((el) => {
            const k = el.dataset.out;
            el.textContent = k === 'contrast' ? (config[k] / 100).toFixed(1) : config[k];
        });
    }

    document.querySelectorAll('[data-group]').forEach((group) => {
        group.querySelectorAll('.mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
                config[group.dataset.group] = btn.dataset.value;
                if (group.dataset.group === 'glyphs') rebuildAtlas();
                applyConfig();
            });
        });
    });

    const SLIDERS = ['cell', 'contrast', 'size', 'force', 'radius', 'spring', 'count'];
    SLIDERS.forEach((id) => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            config[id] = Number(el.value);
            paintFill(el);
            if (id === 'count' || id === 'cell') userSetQuality = true;
            applyConfig();
        });
    });
    // Sliders start at the device-chosen values, not the HTML defaults.
    function syncInputs() { SLIDERS.forEach((id) => { const el = document.getElementById(id); el.value = config[id]; paintFill(el); }); }
    // Lights the rail from the start up to the asterisk.
    function paintFill(el) {
        el.style.setProperty('--fill', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
    }
    // Resampling is the slow part, so only do it once the slider is released.
    document.getElementById('count').addEventListener('change', () => source && load(source.url, source.isModel));

    ['edges', 'invert', 'orbit', 'trails'].forEach((id) => {
        const el = document.getElementById(id);
        el.addEventListener('change', () => { config[id] = el.checked; applyConfig(); });
    });

    document.getElementById('reset-view').addEventListener('click', () => controls.reset());
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('collapsed');
        // The button comes before the sidebar in the DOM, so CSS can't see the state; mark the body.
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    });

    // ---------- cursor ----------
    const pointer = new THREE.Vector2();
    let pointerActive = false;
    let lastMove = 0;
    const raycaster = new THREE.Raycaster();
    const cursorPlane = new THREE.Plane();
    const cursorHit = new THREE.Vector3();

    renderer.domElement.addEventListener('pointermove', (e) => {
        pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        pointerActive = true;
        lastMove = performance.now();
    });
    renderer.domElement.addEventListener('pointerleave', () => { pointerActive = false; });

    const prevCursor = new THREE.Vector3();
    function updateCursor(dt) {
        const u = particles.sim;
        // The cursor acts on a plane through the orbit target that faces the camera.
        const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
        cursorPlane.setFromNormalAndCoplanarPoint(normal, controls.target);
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(cursorPlane, cursorHit)) {
            prevCursor.copy(u.uCursor);
            u.uCursor.lerp(cursorHit, 1 - Math.exp(-dt * 18));
            // Cursor velocity lets a quick swipe drag particles along with it.
            const vel = u.uCursor.clone().sub(prevCursor).divideScalar(Math.max(dt, 1e-3));
            u.uCursorVel.lerp(vel.clampLength(0, 8), 0.5);
        }
        // Force eases in while the cursor moves and settles back when it rests.
        const awake = pointerActive && performance.now() - lastMove < 900;
        u.uCursorPower += ((awake ? 1 : 0) - u.uCursorPower) * (1 - Math.exp(-dt * (awake ? 10 : 2.5)));
    }

    // ---------- frame loop ----------
    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        ascii.setSize(w, h);
        ascii.setCellSize(config.cell);
        const dbH = h * renderer.getPixelRatio();
        particles.material.uniforms.uProjScale.value = dbH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    }
    window.addEventListener('resize', resize);

    let last = performance.now(), frames = 0, fpsTime = last;
    const fpsEl = document.getElementById('fps-counter');

    function frame(now) {
        requestAnimationFrame(frame);
        const dt = Math.min(0.25, (now - last) / 1000);
        last = now;
        if (++frames, now - fpsTime > 1000) { fpsEl.textContent = `${frames} FPS`; frames = 0; fpsTime = now; }

        checkFpsGuard(now);
        controls.update();
        updateCursor(dt);

        const wantAscii = config.render === 'ascii';
        asciiOpacity += ((wantAscii ? 1 : 0) - asciiOpacity) * (1 - Math.exp(-dt * 5));
        particleOpacity += ((wantAscii ? 0 : 1) - particleOpacity) * (1 - Math.exp(-dt * (wantAscii ? 2.5 : 4)));
        particles.sim.uScatter = wantAscii ? 1 : 0;
        // ponytail: physics pauses once particles are hidden; resumes from the scatter shell.
        if (particleOpacity > 0.01) particles.step(dt, now / 1000);
        particles.material.uniforms.uOpacity.value = particleOpacity;
        ascii.material.uniforms.uOpacity.value = asciiOpacity;

        renderer.setRenderTarget(null);
        const trails = config.trails && asciiOpacity < 0.01 && !debug.raw;
        if (trails) renderer.render(fadeScene, fadeCamera);
        else { renderer.setClearColor(BG, 1); renderer.clear(); }
        if (debug.raw) { renderer.render(sourceScene, camera); return; } // inspect the source before ASCII conversion
        if (asciiOpacity > 0.01) ascii.render(sourceScene, camera);
        if (particleOpacity > 0.01) renderer.render(particleScene, camera);
    }

    if (!particlesOK) disableParticles();
    console.info(`PointGen: ${tier.name} quality`, device.reasons.length ? `(${device.reasons.join(', ')})` : '');
    rebuildAtlas();
    syncInputs();
    applyConfig();
    resize();
    // Fonts change glyph shapes, so remeasure the ramp once the web font arrives.
    if (document.fonts) document.fonts.load('48px "JetBrains Mono"').then(rebuildAtlas, () => {});
    load('images/3d_outline.glb', true);
    requestAnimationFrame(frame);

    window.PointGen = { config, load, renderer, camera, debug, particles, device }; // console access while developing
})();
