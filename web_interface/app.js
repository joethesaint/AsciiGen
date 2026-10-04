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

    // ---------- surviving a lost graphics context ----------
    // Phones reclaim GPU memory from background tabs (and under pressure), which kills
    // the WebGL context: the canvas turns white. We save the session, then reload.
    const SAVE_KEY = 'pointgen.session';
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SAVE_KEY) || 'null'); sessionStorage.removeItem(SAVE_KEY); } catch (_) { /* storage blocked */ }
    if (saved && saved.config) Object.assign(config, saved.config);

    // Keeping the previous frame (needed only for trails) costs extra GPU memory, which
    // phones can't spare, so it's kept on desktop-class devices only.
    const keepFrames = tier.name === 'high' && !matchMedia('(pointer: coarse)').matches;
    if (!keepFrames) config.trails = false;

    // preserveDrawingBuffer keeps the last frame, which trails need.
    const renderer = new THREE.WebGLRenderer({ antialias: tier.antialias, preserveDrawingBuffer: keepFrames });
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

    // ---------- loader ----------
    // The orb engine is an ES module from a CDN, so it may arrive after the first
    // load starts; until then the label alone says "Loading…".
    const loaderEl = document.getElementById('loader');
    const loaderLabel = document.getElementById('loader-label');
    let orb = null;
    function startOrb() {
        if (orb || loaderEl.hidden || !window.ThinkingOrb) return;
        const state = window.ThinkingOrb.randomState();
        orb = window.ThinkingOrb.mount(document.getElementById('loader-orb'), { state, size: 64, dark: true });
        loaderLabel.textContent = `${state[0].toUpperCase()}${state.slice(1)}…`;
    }
    window.addEventListener('thinking-orb-ready', startOrb);
    function showLoader() { loaderEl.hidden = false; loaderLabel.textContent = 'Loading…'; startOrb(); }
    function hideLoader() { loaderEl.hidden = true; if (orb) { orb.stop(); orb = null; } }

    // ---------- source loading ----------
    async function load(url, isModel) {
        source = { url, isModel };
        const t0 = performance.now();
        setStatus('');
        showLoader();
        try {
            const side = ParticleSystem.sideFor(config.count * 1000);
            const count = side * side;
            const result = isModel ? await Sources.fromGLB(url, count) : await Sources.fromImage(url, count);
            if (sourceObject) sourceScene.remove(sourceObject);
            sourceObject = result.object;
            sourceScene.add(sourceObject);
            limitOrbit(result.kind === 'image');
            const p = result.particles;
            if (particlesOK) {
                try { particles.setData(p.positions, p.colors, p.luma); }
                catch (e) { console.error(e); disableParticles(); }
            }
            statsEl.textContent = `${particlesOK ? (p.luma.length / 1000).toFixed(0) + 'k pts · ' : ''}${(performance.now() - t0).toFixed(0)} ms · ${tier.name} quality`;
            setStatus('');
            hideLoader();
            startFpsGuard();
        } catch (e) {
            console.error(e);
            hideLoader();
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
        controls.autoRotate = config.orbit && !isFlat; // flat images swing instead (see swing())

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
    function syncInputs() {
        SLIDERS.forEach((id) => { const el = document.getElementById(id); el.value = config[id]; paintFill(el); });
        // Option groups and switches too, so a restored session shows its real state.
        document.querySelectorAll('[data-group]').forEach((g) => {
            g.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.value === config[g.dataset.group]));
        });
        ['edges', 'invert', 'orbit', 'trails'].forEach((id) => {
            const el = document.getElementById(id);
            if (el.checked !== config[id]) { el.checked = config[id]; el.dispatchEvent(new Event('change')); }
        });
    }
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

    // A flat image only reads from the front, so its orbit is kept within ±65° of head-on.
    // Models can be orbited all the way round.
    // A flat image only reads from the front, so its orbit is locked to ±90°:
    // edge-on at the limit, never round the back. (The plane is double-sided,
    // so anything that does get past shows the image mirrored, never black.)
    // Models can be orbited all the way round.
    const FLAT_RANGE = THREE.MathUtils.degToRad(90);
    let isFlat = false;
    function limitOrbit(flat) {
        isFlat = flat;
        const range = flat ? FLAT_RANGE : Infinity;
        controls.minAzimuthAngle = -range;
        controls.maxAzimuthAngle = range;
        controls.minPolarAngle = flat ? Math.PI / 2 - FLAT_RANGE : 0;
        controls.maxPolarAngle = flat ? Math.PI / 2 + FLAT_RANGE : Math.PI;
        applyConfig();
    }

    // Auto-orbit on a flat image swings like a pendulum between the two limits
    // instead of stalling at one; a sine eases it at both ends. It picks up from
    // wherever the camera is, and pauses while the user is dragging.
    let swingPhase = null;
    let userOrbiting = false;
    controls.addEventListener('start', () => { userOrbiting = true; });
    controls.addEventListener('end', () => { userOrbiting = false; swingPhase = null; });
    const swingSpherical = new THREE.Spherical();
    const swingOffset = new THREE.Vector3();
    function swing(dt) {
        if (!(config.orbit && isFlat) || userOrbiting) { if (!config.orbit) swingPhase = null; return; }
        const amp = FLAT_RANGE * 0.96; // stop just short of perfectly edge-on, where the image vanishes
        swingOffset.copy(camera.position).sub(controls.target);
        swingSpherical.setFromVector3(swingOffset);
        if (swingPhase === null) swingPhase = Math.asin(THREE.MathUtils.clamp(swingSpherical.theta / amp, -1, 1));
        swingPhase += dt * 0.45; // about 14 s per full swing
        swingSpherical.theta = amp * Math.sin(swingPhase);
        swingOffset.setFromSpherical(swingSpherical);
        camera.position.copy(controls.target).add(swingOffset);
    }

    // Reset is always reachable: the floating button, the sidebar button,
    // double-click / double-tap on the scene, and the R key.
    const resetView = () => controls.reset();
    document.getElementById('reset-view').addEventListener('click', resetView);
    document.getElementById('reset-fab').addEventListener('click', resetView);
    renderer.domElement.addEventListener('dblclick', resetView);
    window.addEventListener('keydown', (e) => {
        if ((e.key === 'r' || e.key === 'R') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) resetView();
    });
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    toggleBtn.setAttribute('aria-expanded', 'true');
    function setCollapsed(collapsed) {
        sidebar.classList.toggle('collapsed', collapsed);
        // The button comes before the sidebar in the DOM, so CSS can't see the state; mark the body.
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    }
    toggleBtn.addEventListener('click', () => setCollapsed(!sidebar.classList.contains('collapsed')));
    // Phones open on the artwork; the controls are one tap away.
    const isPhone = () => matchMedia('(max-width: 600px)').matches;
    if (isPhone()) setCollapsed(true);
    // On a phone, a tap on the artwork closes the controls. A drag (orbiting)
    // does not. Reopening shows the sheet exactly as it was left: same scroll
    // position, same settings, because closing only slides it away.
    let tapStart = null;
    renderer.domElement.addEventListener('pointerdown', (e) => { tapStart = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    renderer.domElement.addEventListener('pointerup', (e) => {
        if (!tapStart || !isPhone() || sidebar.classList.contains('collapsed')) return;
        const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
        if (moved < 8 && performance.now() - tapStart.t < 350) setCollapsed(true);
        tapStart = null;
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
        swing(dt);
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
    new MorphMenu(document.getElementById('source-menu'));
    // The upload row is a <label for>; give it the keyboard activation a button would have.
    document.querySelector('label.morph-item[for="file-input"]').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('file-input').click(); }
    });
    // Sidebar switches use the Liquid toggle; the checkboxes stay as the source of truth.
    ['edges', 'invert', 'trails', 'orbit'].forEach((id) => LiquidToggle.enhance(document.getElementById(id)));
    rebuildAtlas();
    syncInputs();
    applyConfig();
    resize();
    // Fonts change glyph shapes, so remeasure the ramp once the web font arrives.
    if (document.fonts) document.fonts.load('48px "JetBrains Mono"').then(rebuildAtlas, () => {});
    if (!keepFrames) document.getElementById('trails').closest('.toggle-section').hidden = true;

    const glLost = document.getElementById('gl-lost');
    let lost = false;
    function restart() {
        try {
            // Uploaded files live at blob: URLs that die with the page; samples can be reloaded.
            const keepSource = source && !source.url.startsWith('blob:') ? source : null;
            sessionStorage.setItem(SAVE_KEY, JSON.stringify({ config, source: keepSource }));
        } catch (_) { /* reload anyway */ }
        location.reload();
    }
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault(); // tells the browser we want the context back
        lost = true;
        glLost.hidden = false;
        // If the browser does not hand it back soon, reload ourselves.
        setTimeout(() => { if (lost && !document.hidden) restart(); }, 2500);
    });
    renderer.domElement.addEventListener('webglcontextrestored', restart);
    document.addEventListener('visibilitychange', () => { if (lost && !document.hidden) restart(); });

    // The bust GLB is 28.7 MB; phones and mid/low devices start on the 0.6 MB image instead.
    const firstSource = keepFrames ? { url: 'images/3d_outline.glb', isModel: true } : { url: 'images/roman_bust.png', isModel: false };
    const start = saved && saved.source ? saved.source : firstSource;
    load(start.url, start.isModel);
    requestAnimationFrame(frame);

    window.PointGen = { config, load, renderer, camera, debug, particles, device }; // console access while developing
})();
