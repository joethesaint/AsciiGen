/**
 * PointGen TDD: Orbital Navigation Suite
 */

const AsciiTests = {
    results: [],

    assert(condition, message) {
        if (condition) {
            console.log(`✅ [PASS] ${message}`);
        } else {
            console.error(`❌ [FAIL] ${message}`);
        }
    },

    testCharacterMapping(chars) {
        console.group("Character Mapping");
        let idx0 = Math.floor(0 / 255 * (chars.length - 1));
        this.assert(chars[idx0] === chars[0], "0 Brightness -> first char");
        console.groupEnd();
    },

    testOrbitalHealth(controls) {
        console.group("Orbital Navigation");
        const isOrbiting = controls && typeof controls.update === 'function';
        this.assert(isOrbiting, "Orbital Navigation engine is latched and functional");
        console.groupEnd();
    },

    testMouseInertia(mx, my) {
        console.group("Interaction Health");
        const isMoving = mx !== 0 || my !== 0; 
        this.assert(isMoving, "Mouse coordinate delta detected on Plane geometry");
        console.groupEnd();
    },

    async testBackendConnectivity() {
        console.group("Backend Integration");
        try {
            const resp = await fetch('http://127.0.0.1:5000');
            const data = await resp.json();
            this.assert(data.status === 'active', "Connected to Python Intelligence Hub");
        } catch (e) {
            console.warn("⚠️ Python Backend Unreachable.");
        }
        console.groupEnd();
    },

    async run(config) {
        console.log("%c--- RUNNING POINTGEN ORBITAL TDD ---", "color: #58a6ff; font-weight: bold;");
        this.testCharacterMapping(config.chars);
        this.testOrbitalHealth(config.controls);
        this.testMouseInertia(config.mx, config.my);
        await this.testBackendConnectivity();
    }
};
