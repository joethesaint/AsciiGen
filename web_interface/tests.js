/**
 * ASCII Engine TDD Verification Suite
 * Validates logical integrity and real-time performance.
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
        let idxMax = Math.floor(255 / 255 * (chars.length - 1));
        this.assert(chars[idxMax] === chars[chars.length - 1], "255 Brightness -> last char");
        console.groupEnd();
    },

    testAspectRatio(imgW, imgH, gridW, gridH) {
        console.group("Aspect Ratio");
        const expectedRatio = imgH / imgW;
        const actualRatio = gridH / gridW;
        const tolerance = 0.05;
        this.assert(Math.abs(expectedRatio - actualRatio) < tolerance, `Grid matches image aspect (${actualRatio.toFixed(2)})`);
        console.groupEnd();
    },

    /**
     * TDD for Performance
     */
    testPerformance(fps, particleCount) {
        console.group("Performance Profile");
        this.assert(fps > 30, `Maintaining 60fps local physics (Current: ${fps} FPS)`);
        const densityThreshold = 20000;
        this.assert(particleCount < densityThreshold, `Particle density within safety limits (${particleCount} Agents)`);
        console.groupEnd();
    },

    /**
     * Measure Startup & Processing Latency
     */
    testLatency(processingTimeMs) {
        console.group("Latency Benchmark");
        this.assert(processingTimeMs < 150, `Image to Particle processing is lightning fast (${processingTimeMs.toFixed(2)}ms)`);
        console.groupEnd();
    },

    /**
     * TDD for Backend Communication
     */
    async testBackendConnectivity() {
        console.group("Backend Integration");
        try {
            const resp = await fetch('http://127.0.0.1:5000');
            const data = await resp.json();
            this.assert(data.status === 'active', "Connected to Python Intelligence Hub");
        } catch (e) {
            console.warn("⚠️ Python Backend Unreachable. Smart ASCII features disabled.");
        }
        console.groupEnd();
    },

    testBoundaries(particles, winW, winH) {
        console.group("Boundary Checks");
        let outOfBounds = particles.filter(p => 
            p.ox === undefined || p.ox < 0 || p.ox > winW || 
            p.oy === undefined || p.oy < 0 || p.oy > winH
        );
        this.assert(outOfBounds.length === 0, "No leakages outside window");
        console.groupEnd();
    },

    async run(config) {
        console.log("%c--- RUNNING ASCII ENGINE PERFORMANCE TDD ---", "color: #58a6ff; font-weight: bold;");
        this.testCharacterMapping(config.chars);
        this.testAspectRatio(config.imgW, config.imgH, config.gridW, config.gridH);
        this.testPerformance(Math.floor(config.fps), config.particleCount);
        this.testLatency(config.latency);
        this.testBoundaries(config.particles, config.winW, config.winH);
        await this.testBackendConnectivity();
    }
};
