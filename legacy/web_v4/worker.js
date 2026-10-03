/**
 * PointGen Web Worker
 * Offloads heavy-duty image sampling and structural weight mapping from the main thread.
 */

self.onmessage = function(e) {
    const { 
        data, 
        sampleWidth, 
        sampleHeight, 
        smartWeightMap, 
        depthMap,
        baseDensity, 
        spacing, 
        edges,
        currentCharsLength 
    } = e.data;

    const positions = [];
    const colors = [];
    const charIndices = [];
    const edgeWeights = [];

    let weightData = edges; // fallback
    
    if (smartWeightMap && smartWeightMap.b64) {
        // ponytail: fast native unpacking of base64 bytes
        const binaryString = atob(smartWeightMap.b64);
        weightData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            weightData[i] = binaryString.charCodeAt(i);
        }
    } else if (smartWeightMap && smartWeightMap.data) {
        weightData = smartWeightMap.data;
    }

    for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
            const idx = y * sampleWidth + x;
            const i = idx * 4;
            const bri = (data[i]*0.3 + data[i+1]*0.59 + data[i+2]*0.11);
            
            let weightVal = edges[idx]; // baseline edge detection
            
            if (smartWeightMap) {
                const sx = Math.floor((x / sampleWidth) * smartWeightMap.width);
                const sy = Math.floor((y / sampleHeight) * smartWeightMap.height);
                weightVal = weightData[sy * smartWeightMap.width + sx] || weightVal;
            }

            const edgeWeight = weightVal / 255;
            const threshold = baseDensity * (1.1 - edgeWeight * 0.9);
            
            if (x % Math.max(1, Math.floor(threshold)) === 0 && y % Math.max(1, Math.floor(threshold)) === 0) {
                if (bri > 4) {
                    const r = data[i] / 255;
                    const g = data[i+1] / 255;
                    const b = data[i+2] / 255;
                    
                    const jitterX = (Math.random() - 0.5) * (threshold * 0.4);
                    const jitterY = (Math.random() - 0.5) * (threshold * 0.4);
                    
                    const posX = (x + jitterX - sampleWidth/2) * spacing;
                    const posY = -(y + jitterY - sampleHeight/2) * spacing;
                    
                    // Use calculated Volumetric Depth from main thread
                    const posZ = depthMap ? depthMap[idx] : bri * 2.0; 
                    
                    positions.push(posX, posY, posZ);
                    colors.push(r, g, b);
                    // ponytail: gamma 0.6 spreads mid-tones across full char range
                    const gamma = Math.pow(bri / 255, 0.6);
                    charIndices.push(Math.floor(gamma * (currentCharsLength - 1)));
                    edgeWeights.push(edgeWeight);
                }
            }
        }
    }

    self.postMessage({
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        charIndices: new Float32Array(charIndices),
        edgeWeights: new Float32Array(edgeWeights)
    });
};
