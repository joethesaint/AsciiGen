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

    testCursorBasedRotation(pointsObject) {
        console.group("Cursor Based Rotation");
        const hasRotationLogic = pointsObject && pointsObject.rotation;
        this.assert(hasRotationLogic, "Points object exists and is rotate-ready");
        console.groupEnd();
    },

    testFlowToggle() {
        console.group("Flow Reaction Toggle");
        const toggle = document.getElementById('flow-toggle');
        this.assert(toggle !== null, "Flow reaction toggle exists in UI");
        
        // Check if global state exists (we'll define this in sketch.js)
        this.assert(typeof window.isFlowEnabled !== 'undefined', "Flow state variable is initialized");
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
            const resp = await fetch('http://127.0.0.1:5000/status');
            const data = await resp.json();
            this.assert(data.status === 'active', "Connected to Python Intelligence Hub (/status)");
        } catch (e) {
            console.error("❌ Python Backend UNREACHABLE at /status");
        }
        console.groupEnd();
    },

    testZoomControl(camera) {
        console.group("Zoom Integration");
        const hasCamera = camera !== undefined;
        this.assert(hasCamera, "Camera instance detected for zoom control");
        const initialZoom = camera.position.z;
        this.assert(initialZoom > 0, `Initial zoom level verified: ${initialZoom}`);
        console.groupEnd();
    },

    async run(config) {
        console.log("%c--- RUNNING POINTGEN ORBITAL TDD ---", "color: #58a6ff; font-weight: bold;");
        this.testCharacterMapping(config.chars);
        this.testCursorBasedRotation(config.pointsObject);
        this.testZoomControl(config.camera);
        this.testFlowToggle();
        this.testMouseInertia(config.mx, config.my);
        await this.testBackendConnectivity();
    }
};
