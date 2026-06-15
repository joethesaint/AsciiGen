const { JSDOM } = require('jsdom');
JSDOM.fromURL('http://127.0.0.1:5000/', {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true
}).then(dom => {
    dom.window.console.log = (...args) => console.log('[LOG]', ...args);
    dom.window.console.error = (...args) => console.error('[ERR]', ...args);
    dom.window.console.warn = (...args) => console.warn('[WARN]', ...args);
    setTimeout(() => process.exit(0), 3000);
}).catch(console.error);
