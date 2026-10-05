// Hairline by Lucas Marques (MIT); licence: ../vendor/HAIRLINE-LICENSE.txt.
import { terrain, turntable, phosphor } from '../vendor/hairline.js';

const FIGURES = { terrain, turntable, phosphor };
let current = null;

function mount(name) {
    const host = document.getElementById('hairline-stage');
    const caption = document.getElementById('hairline-caption');
    current?.destroy();
    current = FIGURES[name](host, {
        theme: 'dark', intensity: 0.75,
        label: `Interactive isometric ${name} study`,
        onRead: (value) => { caption.textContent = value ? `${name} · ${value}` : name; },
    });
    host.hidden = false;
    document.getElementById('hairline-studies').hidden = false;
}

function close() {
    current?.destroy();
    current = null;
    document.getElementById('hairline-stage').hidden = true;
    document.getElementById('hairline-studies').hidden = true;
}

window.HairlineStudies = { mount, close };
