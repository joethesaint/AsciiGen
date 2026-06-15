class EngineUIController extends EventTarget {
    constructor() {
        super();
        this.config = {
            renderMode: 'points',
            charSet: 'default',
            kernel: 'edges',
            physicsMode: 'grid',
            interactionRange: 150,
            density: 28,
            zoom: 1200,
            autoRotate: false,
            dragEnabled: true,
            flowEnabled: false,
            inverted: false,
            is3D: true,
        };
        this.bindEvents();
    }

    bindEvents() {
        // Sidebar Toggle
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn && sidebar) {
            toggleBtn.onclick = () => sidebar.classList.toggle('collapsed');
        }

        // Render Modes
        document.querySelectorAll('#render-modes .mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.updateButtonGroup('#render-modes', e.target);
                this.setConfig('renderMode', e.target.getAttribute('data-render'));
            });
        });

        // Character Sets
        document.querySelectorAll('#char-sets .mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.updateButtonGroup('#char-sets', e.target);
                this.setConfig('charSet', e.target.getAttribute('data-set'));
            });
        });

        // Kernel Filters
        document.querySelectorAll('#kernel-filters .mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.updateButtonGroup('#kernel-filters', e.target);
                this.setConfig('kernel', e.target.getAttribute('data-kernel'));
            });
        });

        // Physics Modes
        document.querySelectorAll('#physics-modes .mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.updateButtonGroup('#physics-modes', e.target);
                this.setConfig('physicsMode', e.target.getAttribute('data-mode'));
            });
        });

        // Sliders
        this.bindSlider('flee-slider', 'flee-val', 'interactionRange', parseFloat);
        this.bindSlider('res-slider', 'res-val', 'density', parseInt);
        this.bindSlider('zoom-slider', 'zoom-val', 'zoom', parseFloat);

        // Toggles
        this.bindToggle('flow-toggle', 'flowEnabled');
        this.bindToggle('invert-toggle', 'inverted');
        this.bindToggle('dim-toggle', 'is3D');
        this.bindToggle('auto-rotate-toggle', 'autoRotate');
        this.bindToggle('drag-toggle', 'dragEnabled');
    }

    updateButtonGroup(selector, activeBtn) {
        document.querySelectorAll(`${selector} .mode-btn`).forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    bindSlider(sliderId, valId, configKey, parser, displayFormatter = (v) => v) {
        const slider = document.getElementById(sliderId);
        const val = document.getElementById(valId);
        if (slider) {
            slider.addEventListener('input', (e) => {
                if (val) val.innerText = displayFormatter(parser(e.target.value));
                this.setConfig(configKey, parser(e.target.value), false);
            });
            slider.addEventListener('change', (e) => {
                this.setConfig(configKey, parser(e.target.value), true);
            });
        }
    }

    bindToggle(toggleId, configKey) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.setConfig(configKey, e.target.checked, true);
            });
        }
    }

    setConfig(key, value, isFinalChange = true) {
        if (this.config[key] !== value || isFinalChange) {
            this.config[key] = value;
            this.dispatchEvent(new CustomEvent('uiChange', { 
                detail: { key, value, config: this.config, isFinalChange } 
            }));
        }
    }
}
window.EngineUIController = EngineUIController;
