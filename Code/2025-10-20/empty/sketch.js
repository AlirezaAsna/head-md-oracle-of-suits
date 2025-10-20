function setup() {
    createCanvas(700, 700);
    noLoop();       // draw just once
    noStroke();
    rectMode(CENTER); // center rects on (x,y)
}

function draw() {
    background(255);

    const cols = 11;
    const rows = 11;
    const margin = 40;
    const gridW = width - margin * 2;
    const gridH = height - margin * 2;

    // distance between grid points — use cols-1 so circles sit on edges too
    const cell = min(gridW / (cols - 1), gridH / (rows - 1));
    const diskSize = cell * 0.9; // circle diameter

    // center and farthest distance used to scale rectangle height
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = dist(cx, cy, margin, margin);

    for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
            const x = margin + ix * gridW / (cols - 1);
            const y = margin + iy * gridH / (rows - 1);

            // black circle
            fill(0);
            ellipse(x, y, diskSize);

            // keep rect width the same, but make rect height shrink toward corners
            const slotW = diskSize * 0.6;   // fixed rect width
            // compute normalized distance from center (0..1)
            const t = constrain(dist(x, y, cx, cy) / maxDist, 0, 1);
            // height interpolates from larger in center to very small near corners
            const slotH = lerp(diskSize * 0.30, diskSize * 0.03, t);
            const corner = slotH * 0.6;

            // white rounded rectangle inside the circle
            fill(255);
            rect(x, y, slotW, slotH, corner);
        }
    }
}