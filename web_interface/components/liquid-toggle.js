/**
 * LiquidToggle — vanilla port of Bencho's "Liquid toggle" (MIT, bencho.dev/licence).
 *
 * The original is a React component on framer-motion. This project has no React
 * and no build step, so the same behaviour is reproduced here with a small spring
 * integrator standing in for useMotionValue / useSpring / useVelocity / animate.
 * The numbers and the reasoning are the original's; the comments marked
 * "port:" are mine and explain only what had to change to leave React.
 *
 * Usage: LiquidToggle.enhance(checkboxInput). The checkbox stays the source of
 * truth: the toggle hides it, mirrors `checked`, and fires its `change` event,
 * so existing listeners keep working unchanged.
 */
(function (root) {
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    /* ══ 1 · Toggle ═══════════════════════════════════════════
       Two blobs, not one. The thumb crosses at once and a smaller
       drop follows it late, so for most of the crossing the pair
       is stretched into a single waisted capsule. They must stay
       OVERLAPPED — a goo bridge across a real gap comes out thin
       and reads as two blobs and a thread. */

    const TRACK = 92;
    /* ── the droplet, and the air round it ─────────────────────
       36 in a 46 track, so five pixels of track show all the way
       round. It was 40 with three, which is a thumb pressed into
       its slot; five is a droplet sitting in one.

       PAD is the same five, and it has to be: the inset at the
       ends and the inset above and below are the same gap seen
       twice, and at 40/4 they were 3 and 4 — near enough to look
       like a mistake rather than a decision.

       The size is handed to the stylesheet as `--liq-thumb`
       rather than written there as well. The travel maths needs
       it and so does the circle, and two copies of a number that
       must agree is one copy too many. */
    const THUMB = 36;
    const PAD = (46 - THUMB) / 2;

    /* the two ends of the thumb's travel, and the line between */
    const SHUT_X = PAD;
    const OPEN_X = TRACK - THUMB - PAD;
    const MID_X = (SHUT_X + OPEN_X) / 2;

    /* port: one damped spring, stepped with semi-implicit Euler in
       small substeps so stiff settings stay stable at low frame
       rates. It stands in for framer-motion's spring everywhere. */
    function springStep(s, target, cfg, dt) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            const a = (-cfg.stiffness * (s.value - target) - cfg.damping * s.velocity) / cfg.mass;
            s.velocity += a * h;
            s.value += s.velocity * h;
        }
    }

    class LiquidToggle {
        /**
         * stretch: how much the droplet lengthens into its own travel,
         *   0..100 — the dragging ball's knob, and the same idea
         * speed: how fast it crosses, 0..100
         */
        constructor(input, { stretch = 36, speed = 50 } = {}) {
            this.input = input;
            this.stretch = stretch;
            this.on = input.checked;
            /* held, so the settling spring knows to keep out of the way
               while a finger owns the thumb */
            this.held = false;
            /* the pointer is over the switch. State and not `:hover`,
               because what it drives is a spring in the same transform
               the position lives in — see the note on `swell`. */
            this.hot = false;
            this.grip = null;

            /* ── ONE POSITION, WRITTEN TWO WAYS ──────────────────────
               The thumb's x is a motion value rather than a prop, which
               is what lets a finger and a spring both drive it without
               one of them having to know about the other: a drag writes
               it directly, a release animates it, and nothing re-renders
               either way. */
            this.x = { value: this.on ? OPEN_X : SHUT_X, velocity: 0 };
            this.lastX = this.x.value;

            /* ── ONE BODY. STRETCH, NOT A TRAIL. ─────────────────────
               The ONE body lengthens along its direction of travel and
               thins across it, so the elasticity is in the shape of the
               thing moving rather than in something left behind.

               Area is kept: scaleY is 1/scaleX, so the thumb is the same
               amount of droplet whatever it is doing. */
            this.eased = { value: 0, velocity: 0 };
            this.easedCfg = { stiffness: 320, damping: 40, mass: 0.6 };

            /* ── the hover swell goes in the SAME transform ──────────
               The individual transform properties apply BEFORE
               `transform`, so a separate `scale: 1.035` scaled the
               coordinate system that `translateX(51px)` then moved
               through — 51 became 52.8, and the droplet drifted toward
               the end of the track it was already sitting at.
               Multiplied into scaleX and scaleY here, it is a swell
               about the droplet's own centre and the position is
               untouched. The stretch stays area-preserving inside it. */
            this.swell = { value: 1, velocity: 0 };
            this.swellCfg = { stiffness: 520, damping: 34, mass: 0.6 };

            /* ── how the thumb lands when it is let go ───────────────
               Speed is the stiffness. 170/21.5 is zeta 0.87: it still
               arrives with a hint of give, and the hint is the whole
               of it. Damping is a constant — a switch is not a thing
               anybody wants a bounce dial on. Speed still moves,
               because how fast a switch crosses is a real question. */
            this.settle = { stiffness: 170 - (50 - speed) * 1.1, damping: 21.5, mass: 0.9 };

            this.build();
            this.tick = this.tick.bind(this);
            this.last = performance.now();
            this.running = false;
            this.wake();
        }

        build() {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'liq-sw';
            b.setAttribute('role', 'switch');
            const label = this.input.closest('label')?.querySelector('span')?.textContent?.trim();
            b.setAttribute('aria-label', label || 'Liquid toggle');
            b.style.setProperty('--liq-thumb', `${THUMB}px`);
            const blobs = document.createElement('span');
            blobs.className = 'liq-sw-blobs';
            blobs.setAttribute('aria-hidden', 'true');
            this.thumb = document.createElement('span');
            this.thumb.className = 'liq-thumb';
            blobs.appendChild(this.thumb);
            b.appendChild(blobs);
            this.rail = b;

            /* port: the old CSS switch is replaced; the checkbox is
               hidden but kept, so form state and listeners survive. */
            const old = this.input.closest('.switch');
            (old || this.input).insertAdjacentElement('beforebegin', b);
            if (old) { old.hidden = true; }
            /* port: the row's <label> now targets this button, so a click
               on the label text arrives as a bare click with no pointer
               sequence. Pointer presses are already handled in up(), so
               only a click that did not come through them toggles here. */
            b.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.pointed) this.setOn(!this.on);
                this.pointed = false;
            });

            /* port: clicking the label text still toggles the hidden
               checkbox natively; follow it so the two never disagree. */
            this.input.addEventListener('change', () => {
                if (this.input.checked === this.on) return;
                this.on = this.input.checked;
                this.render();
                this.wake();
            });

            b.addEventListener('pointerdown', (e) => this.down(e));
            b.addEventListener('pointermove', (e) => this.move(e));
            b.addEventListener('pointerup', (e) => this.up(e));
            b.addEventListener('pointercancel', (e) => this.up(e));
            b.addEventListener('pointerenter', () => { this.hot = true; this.wake(); });
            b.addEventListener('pointerleave', () => { this.hot = false; this.wake(); });
            /* the keyboard still gets a plain switch */
            b.addEventListener('keydown', (e) => {
                if (e.key !== ' ' && e.key !== 'Enter') return;
                e.preventDefault();
                this.setOn(!this.on);
            });
            this.render();
        }

        setOn(v) {
            if (v === this.on) return;
            this.on = v;
            this.input.checked = v;
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
            this.render();
            this.wake();
        }

        /* the component is drawn at whatever fraction the card
           allows, so a client delta has to be divided back out
           before it means anything in the track's own units */
        local(clientX) {
            const el = this.rail;
            const b = el.getBoundingClientRect();
            const k = b.width / (el.offsetWidth || b.width) || 1;
            return (clientX - b.left) / k;
        }

        down(e) {
            /* ── NO OFFSET YET. It is taken at the first MOVE. ──────
               Taking the offset at the first move means that move
               produces no displacement at all and every one after it
               tracks the delta — so a drag always starts from where
               the droplet actually is. There is no press anywhere on
               this control that can make it jump. */
            this.grip = { id: e.pointerId, grab: null, moved: false };
            this.held = true;
            /* it throws if the id is not a live pointer — a synthetic
               event from a test or a rehearsal is exactly that — and
               the drag is perfectly usable without it, so it must not
               take the grab down with it */
            try { this.rail.setPointerCapture(e.pointerId); } catch (_) { /* not live */ }
            this.wake();
        }

        move(e) {
            const g = this.grip;
            if (!g || g.id !== e.pointerId) return;
            const at = this.local(e.clientX);
            /* the offset, taken from where the droplet IS — see the
               note in `down`. The first move therefore asks for
               exactly the position it already has. */
            if (g.grab === null) g.grab = at - this.x.value;
            const next = clamp(at - g.grab, SHUT_X, OPEN_X);
            if (Math.abs(next - this.x.value) > 0.4) g.moved = true;
            this.x.value = next;
            this.x.velocity = 0;
            /* it flips as it passes the middle rather than on release,
               so the track answers under your finger */
            const past = next > MID_X;
            if (past !== this.on) this.setOn(past);
            this.wake();
        }

        up(e) {
            const g = this.grip;
            if (!g) return;
            this.grip = null;
            /* ── AND THE RELEASE IS GUARDED TOO ────────────────────
               `releasePointerCapture` throws if the pointer was never
               captured. Unguarded it threw before `held` was cleared,
               and a switch left `held` never settles. */
            try { this.rail.releasePointerCapture(e.pointerId); } catch (_) { /* never captured */ }
            /* A press that never travelled is a CLICK, and a click
               toggles — the switch has to keep working as a switch. */
            if (!g.moved) this.setOn(!this.on);
            this.pointed = true; // the click that follows this release is already handled
            this.held = false;
            this.wake();
        }

        /* port: framer-motion runs only while something moves; this
           loop does the same and stops once every spring is at rest. */
        wake() {
            if (this.running) return;
            this.running = true;
            this.last = performance.now();
            requestAnimationFrame(this.tick);
        }

        tick(now) {
            const dt = Math.min(0.05, (now - this.last) / 1000);
            this.last = now;
            /* Rest is wherever `on` says, and it is only ever applied
               when nothing is holding the thumb. */
            if (!this.held) springStep(this.x, this.on ? OPEN_X : SHUT_X, this.settle, dt);
            const vel = dt > 0 ? (this.x.value - this.lastX) / dt : 0;
            this.lastX = this.x.value;
            springStep(this.eased, vel, this.easedCfg, dt);
            springStep(this.swell, this.hot ? 1.035 : 1, this.swellCfg, dt);
            this.render();

            const atRest = !this.held
                && Math.abs(this.x.value - (this.on ? OPEN_X : SHUT_X)) < 0.01 && Math.abs(this.x.velocity) < 0.01
                && Math.abs(this.eased.value) < 0.5
                && Math.abs(this.swell.value - (this.hot ? 1.035 : 1)) < 0.0005;
            if (atRest) { this.running = false; return; }
            requestAnimationFrame(this.tick);
        }

        render() {
            /* ── the divisor is the whole tuning ─────────────────────
               The thumb's peak speed on a 44px crossing is about 150px
               a second, so dividing by 1400 asked it to reach 1400 to
               mean anything. 600 puts the peak at about 1.09 at the
               default, and the cap at 0.4 leaves the top of the knob
               somewhere to go. */
            const lengthen = 1 + Math.min(0.4, Math.abs(this.eased.value) / 600) * (clamp(this.stretch, 0, 100) / 100);
            const s = this.swell.value;
            this.thumb.style.transform = `translateX(${this.x.value}px) scale(${lengthen * s}, ${s / lengthen})`;
            this.rail.dataset.on = String(this.on);
            this.rail.setAttribute('aria-checked', String(this.on));
        }

        static enhance(input, opts) { return new LiquidToggle(input, opts); }
    }

    root.LiquidToggle = LiquidToggle;
})(this);
