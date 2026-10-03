/**
 * MorphMenu — a pill button that springs open into a menu, and back.
 *
 * Motion taken from a "Create menu" reference (motion/react `layout` with
 * `{ type: "spring", bounce: 0.3 }`), rebuilt without React:
 *  - the container's height and corner radius follow one spring, 22px → 12px
 *  - the incoming view arrives blurred and slightly squashed (blur 4px,
 *    scaleY 0.98, opacity 0) and clears over 0.2s after a 0.03s delay
 *  - a press outside, or Escape, closes it
 *
 * Markup: an element with [data-morph] holding two children,
 * [data-view="button"] and [data-view="menu"]. Both stay in the DOM, so
 * listeners attached elsewhere to the menu items keep working.
 */
(function (root) {
    /* bounce 0.3 is a damping ratio of 0.7. Stiffness 260 settles in about
       0.4s, close to motion's default spring at that bounce. */
    const SPRING = { stiffness: 260, damping: 2 * 0.7 * Math.sqrt(260), mass: 1 };
    const RADIUS = { button: 22, menu: 12 };

    class MorphMenu {
        constructor(el) {
            this.el = el;
            this.views = {
                button: el.querySelector('[data-view="button"]'),
                menu: el.querySelector('[data-view="menu"]'),
            };
            this.view = 'button';
            this.h = { value: 0, velocity: 0 };
            this.raf = 0;

            this.views.button.querySelector('button').addEventListener('click', () => this.open());
            // Choosing anything in the menu folds it back to the button.
            this.views.menu.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) this.close(); });
            document.addEventListener('pointerdown', (e) => { if (!el.contains(e.target)) this.close(); });
            el.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(true); });
            this.show('button');
        }

        open() { if (this.view !== 'menu') this.morph('menu'); }

        close(refocus) {
            if (this.view === 'button') return;
            this.morph('button');
            if (refocus) this.views.button.querySelector('button').focus();
        }

        show(view) {
            this.view = view;
            for (const [k, node] of Object.entries(this.views)) node.hidden = k !== view;
            this.el.dataset.morph = view;
        }

        morph(view) {
            // Measure where we are, swap views, measure where we are going.
            const from = this.el.getBoundingClientRect().height;
            this.show(view);
            this.el.style.height = 'auto';
            const to = this.el.getBoundingClientRect().height;

            // Restart the arrival animation on the incoming view.
            const incoming = this.views[view];
            incoming.classList.remove('morph-enter');
            void incoming.offsetWidth;
            incoming.classList.add('morph-enter');

            if (view === 'menu') {
                const first = incoming.querySelector('button, label, [tabindex]');
                if (first) first.focus({ preventScroll: true });
            }

            if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.el.style.height = '';
                this.el.style.borderRadius = `${RADIUS[view]}px`;
                return;
            }

            this.h.value = from;
            this.from = from;
            this.to = to;
            cancelAnimationFrame(this.raf);
            let last = performance.now();
            const tick = (now) => {
                const dt = Math.min(0.05, (now - last) / 1000);
                last = now;
                const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
                for (let i = 0; i < steps; i++) {
                    const a = (-SPRING.stiffness * (this.h.value - to) - SPRING.damping * this.h.velocity) / SPRING.mass;
                    this.h.velocity += a * (dt / steps);
                    this.h.value += this.h.velocity * (dt / steps);
                }
                // Radius rides the same spring, so shape and size arrive together.
                const t = Math.abs(to - from) > 0.5 ? (this.h.value - from) / (to - from) : 1;
                const r = RADIUS[view === 'menu' ? 'button' : 'menu'] + (RADIUS[view] - RADIUS[view === 'menu' ? 'button' : 'menu']) * Math.min(1.2, Math.max(0, t));
                this.el.style.height = `${Math.max(0, this.h.value)}px`;
                this.el.style.borderRadius = `${Math.max(4, r)}px`;
                const done = Math.abs(this.h.value - to) < 0.3 && Math.abs(this.h.velocity) < 0.3;
                if (done) {
                    this.el.style.height = '';
                    this.el.style.borderRadius = `${RADIUS[view]}px`;
                    return;
                }
                this.raf = requestAnimationFrame(tick);
            };
            this.raf = requestAnimationFrame(tick);
        }
    }

    root.MorphMenu = MorphMenu;
})(this);
