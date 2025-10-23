/*
 WaveField / WaveLine classes
 - WaveField holds many WaveLine instances (one per visual line)
 - Each WaveLine uses an array of small per-segment noise seeds to create
   tiny random line detail (jagged / textured wave) instead of a single
   straight polyline.
 - Use: instantiate WaveField(waveLines, waveResolution) then call
   update(t) and draw(baseY, amp, t, color, thickness).
*/

class WaveLine {
    constructor(index, resolution) {
        this.index = index;
        this.resolution = resolution;
        // prepare per-segment seeds and jitter multipliers
        this.segs = new Array(resolution + 1).fill(0).map(() => ({
            seed: random(10000),
            jitter: random(0.3, 1.2),     // how strong the tiny lines are relative to amp
            microLen: random(6, 18)      // small line fragment length in pixels
        }));
        this.phaseOffset = index * 0.6;
    }

    // compute main wave displacement (returns y offset relative to baseline)
    coreDisplacement(nx, t, waveSpeed) {
        const main = Math.sin((nx * 8 + t * waveSpeed) + this.phaseOffset);
        const harmonic = Math.sin((nx * 20 + t * (waveSpeed * 1.6)) + this.phaseOffset * 1.3) * 0.3;
        return main + harmonic;
    }

    // draw the line with micro-jitter shaped by noise
    draw(baseY, amp, t, waveSpeed, colorArr, thickness) {
        stroke(colorArr[0], colorArr[1], colorArr[2], colorArr[3]);
        strokeWeight(thickness);
        noFill();

        beginShape();
        for (let p = 0; p <= this.resolution; p++) {
            const nx = p / this.resolution;
            const x = nx * width;

            const core = this.coreDisplacement(nx, t, waveSpeed);
            const wavey = baseY + core * amp * (0.6 + 0.4 * Math.sin(t + this.index));

            // micro noise offset (smooth with noise) to make the vertex not lie exactly on the sine
            const s = this.segs[p];
            const noiseVal = noise(s.seed, t * 0.25);
            const microOffset = (noiseVal - 0.5) * 2 * s.jitter * (amp * 0.06); // small fraction of amp

            vertex(x, wavey + microOffset);
        }
        endShape();

        // draw tiny perpendicular line fragments at a subset of vertices to emphasize texture
        // fewer fragments for performance
        const step = Math.max(2, Math.floor(this.resolution / 18));
        for (let p = 0; p <= this.resolution; p += step) {
            const nx = p / this.resolution;
            const x = nx * width;

            const core = this.coreDisplacement(nx, t, waveSpeed);
            const wavey = baseY + core * amp * (0.6 + 0.4 * Math.sin(t + this.index));
            const s = this.segs[p];
            const noiseVal = noise(s.seed + 37, t * 0.35);
            const microOffset = (noiseVal - 0.5) * 2 * s.jitter * (amp * 0.06);

            const px = x;
            const py = wavey + microOffset;

            // estimate local slope by sampling left/right
            const dx = 4;
            const nxL = Math.max(0, (p - 1) / this.resolution);
            const nxR = Math.min(1, (p + 1) / this.resolution);
            const yL = baseY + this.coreDisplacement(nxL, t, waveSpeed) * amp * (0.6 + 0.4 * Math.sin(t + this.index));
            const yR = baseY + this.coreDisplacement(nxR, t, waveSpeed) * amp * (0.6 + 0.4 * Math.sin(t + this.index));
            const slope = (yR - yL) / ( (nxR - nxL) * width + 0.0001 );

            // perpendicular angle
            const angle = Math.atan2(-1 / (slope || 0.0001), 1); // approximate perpendicular
            const len = s.microLen * (0.6 + noise(s.seed + 123, t * 0.2)); // vary length slightly

            const ax = px + Math.cos(angle) * len * -0.5;
            const ay = py + Math.sin(angle) * len * -0.5;
            const bx = px + Math.cos(angle) * len * 0.5;
            const by = py + Math.sin(angle) * len * 0.5;

            stroke(colorArr[0], colorArr[1], colorArr[2], Math.max(30, colorArr[3] - 40));
            strokeWeight(Math.max(0.6, thickness * 0.3));
            line(ax, ay, bx, by);
        }
    }
}

class WaveField {
    constructor(lines = 12, resolution = 80, waveSpeed = 1.2) {
        this.lines = [];
        this.resolution = resolution;
        this.waveSpeed = waveSpeed;
        for (let i = 0; i < lines; i++) {
            this.lines.push(new WaveLine(i, resolution));
        }
    }

    // call if you want to re-seed / change density at runtime
    rebuild(lines, resolution) {
        this.lines.length = 0;
        this.resolution = resolution || this.resolution;
        for (let i = 0; i < lines; i++) this.lines.push(new WaveLine(i, this.resolution));
    }

    // draw all lines; caller provides shared params
    draw(centerY, amp, t, colorArr, thickness) {
        for (let i = 0; i < this.lines.length; i++) {
            const yBase = centerY + (i - (this.lines.length - 1) / 2) * 22;
            this.lines[i].draw(yBase, amp, t, this.waveSpeed, colorArr, thickness);
        }
    }
}