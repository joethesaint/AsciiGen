// Hairline by Lucas Marques (MIT); licence: ../vendor/HAIRLINE-LICENSE.txt.
import { terrain, turntable, phosphor } from '../vendor/hairline.js';

const FIGURES = { terrain, turntable, phosphor };
const INK = `
  path,polygon,ellipse,line{fill:#0a0b0c;stroke:#68717d;stroke-width:.9;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
  .nf{fill:none}.fo{stroke:none}.sil{stroke:#aeb8c3}.hi{stroke:#f2ede2}.lo{stroke:#252a31}
  .dash{stroke-dasharray:1 3}.dot{stroke:none;fill:#f2ede2}.dot.m{fill:#aeb8c3}.dot.off{fill:#252a31}.ghost path{fill:none;stroke:#68717d}
`;

function imageFromSvg(svg) {
    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', '800');
    copy.setAttribute('height', '640');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = INK;
    copy.prepend(style);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not turn the isometric study into an AsciiGen source.')); };
        image.src = url;
    });
}

/** Renders one Hairline figure to an image for AsciiGen's ASCII and particle pipelines. */
async function createSource(name) {
    const makeFigure = FIGURES[name];
    if (!makeFigure) throw new Error(`Unknown isometric study: ${name}`);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:400px;height:320px;pointer-events:none';
    document.body.appendChild(host);
    const figure = makeFigure(host, { theme: 'dark', intensity: 0.75, label: `Isometric ${name} study` });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const svg = host.querySelector('svg');
    try { return await imageFromSvg(svg); }
    finally { figure.destroy(); host.remove(); }
}

window.HairlineStudies = { createSource };
