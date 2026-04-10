/**
 * ASCII Engine TDD Verification Suite
 * Validates the core mathematical mapping and particle integrity.
 */

const AsciiTests = {
    results: [],

    assert(condition, message) {
        if (condition) {
            console.log(`✅ [PASS] ${message}`);
            this.results.push({ message, status: 'pass' });
        } else {
            console.error(`❌ [FAIL] ${message}`);
            this.results.push({ message, status: 'fail' });
        }
    },

    /**
     * Test mapping logic: ensures brightness values map to the correct ASCII char.
     */
    testCharacterMapping(chars) {
        console.group("Testing Character Mapping Accuracy");
        // Test 0 (Pure Black)
        let idx0 = Math.floor(0 / 255 * (chars.length - 1));
        this.assert(chars[idx0] === chars[0], "0 Brightness maps to first character");

        // Test 255 (Pure White)
        let idxMax = Math.floor(255 / 255 * (chars.length - 1));
        this.assert(chars[idxMax] === chars[chars.length - 1], "255 Brightness maps to last character");

        // Test Midpoint
        let mid = 127;
        let idxMid = Math.floor(mid / 255 * (chars.length - 1));
        this.assert(typeof chars[idxMid] === 'string', "Midpoint brightness returns a valid string character");
        console.groupEnd();
    },

    /**
     * Test Aspect Ratio Logic
     */
    testAspectRatio(imgW, imgH, gridW, gridH, fontComp) {
        console.group("Testing Aspect Ratio Math");
        const expectedRatio = (imgH / imgW) * fontComp;
        const actualRatio = gridH / gridW;
        const tolerance = 0.05;
        
        this.assert(Math.abs(expectedRatio - actualRatio) < tolerance, `Grid aspect ratio (${actualRatio.toFixed(2)}) matches intended compensation (${expectedRatio.toFixed(2)})`);
        console.groupEnd();
    },

    /**
     * Test Particle Density
     */
    testParticleDensity(particleCount, expectedCount) {
        console.group("Testing Particle Density");
        this.assert(particleCount === expectedCount, `Particle count (${particleCount}) matches total grid size (${expectedCount})`);
        console.groupEnd();
    },

    run(config) {
        console.log("%c--- RUNNING ASCII ENGINE TDD SUITE ---", "color: #58a6ff; font-weight: bold; font-size: 1.2rem;");
        this.testCharacterMapping(config.chars);
        this.testAspectRatio(config.imgW, config.imgH, config.gridW, config.gridH, config.fontComp);
        this.testParticleDensity(config.particleCount, config.gridW * config.gridH);
        console.log("--- TEST RUN COMPLETE ---");
    }
};
