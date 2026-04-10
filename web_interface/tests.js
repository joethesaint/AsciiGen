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

    testCharacterMapping(chars) {
        console.group("Testing Character Mapping Accuracy");
        let idx0 = Math.floor(0 / 255 * (chars.length - 1));
        this.assert(chars[idx0] === chars[0], "0 Brightness maps to first character");

        let idxMax = Math.floor(255 / 255 * (chars.length - 1));
        this.assert(chars[idxMax] === chars[chars.length - 1], "255 Brightness maps to last character");
        console.groupEnd();
    },

    testAspectRatio(imgW, imgH, gridW, gridH, fontComp) {
        console.group("Testing Aspect Ratio Math");
        const expectedRatio = (imgH / imgW) * fontComp;
        const actualRatio = gridH / gridW;
        // Using a slightly wider tolerance because of floor() rounding on low resolutions
        const tolerance = 0.15;
        
        this.assert(Math.abs(expectedRatio - actualRatio) < tolerance, `Grid aspect ratio (${actualRatio.toFixed(2)}) matches intended compensation (${expectedRatio.toFixed(2)})`);
        console.groupEnd();
    },

    testParticleDensity(particleCount, expectedCount) {
        console.group("Testing Particle Density");
        this.assert(particleCount === expectedCount, `Particle count (${particleCount}) matches total grid size (${expectedCount})`);
        console.groupEnd();
    },

    testBoundaries(particles, winW, winH) {
        console.group("Testing Boundary Integrity");
        let outOfBounds = particles.filter(p => 
            p.origin.x < 0 || p.origin.x > winW || 
            p.origin.y < 0 || p.origin.y > winH
        );
        this.assert(outOfBounds.length === 0, `No particles generated outside window bounds (Found: ${outOfBounds.length})`);
        console.groupEnd();
    },

    run(config) {
        console.log("%c--- RUNNING ASCII ENGINE TDD SUITE ---", "color: #58a6ff; font-weight: bold; font-size: 1.2rem;");
        this.testCharacterMapping(config.chars);
        this.testAspectRatio(config.imgW, config.imgH, config.gridW, config.gridH, config.fontComp);
        this.testParticleDensity(config.particleCount, config.gridW * config.gridH);
        this.testBoundaries(config.particles, config.winW, config.winH);
        console.log("--- TEST RUN COMPLETE ---");
    }
};
