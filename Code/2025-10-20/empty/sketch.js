function setup() {                    // setup runs once
    createCanvas(700, 700);
    noStroke();
    rectMode(CENTER);
}

function draw() {                     // draw runs every frame (mouse moves update)
    background(255);

    const cols = 11;
    const rows = 11;
    const margin = 40;
    const gridW = width - margin * 2;
    const gridH = height - margin * 2;

    const cell = min(gridW / (cols - 1), gridH / (rows - 1));
    const diskSize = cell * 0.9;

    // mouse is the center for the rectangle scaling
    const cx = mouseX;
    const cy = mouseY;
    const maxDist = max(
      dist(cx, cy, 0, 0),
      dist(cx, cy, width, 0),
      dist(cx, cy, 0, height),
      dist(cx, cy, width, height)
    );

    // draw primary circles + white rounded rectangles (rect size shrinks with distance from mouse)
    for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
            const x = margin + ix * gridW / (cols - 1);
            const y = margin + iy * gridH / (rows - 1);

            fill(0);
            ellipse(x, y, diskSize);

            const slotW = diskSize * 0.6;
            const t = constrain(dist(x, y, cx, cy) / maxDist, 0, 1); // 0 near mouse, 1 far
            const slotH = lerp(diskSize * 0.30, diskSize * 0.03, t);
            const corner = slotH * 0.6;

            fill(255);
            rect(x, y, slotW, slotH, corner);
        }
    }

    // draw small circles in the white spaces between primary circles
    // their sizes do the opposite of the rectangles:
    // - near the mouse (rectangles large) => small circles become small
    // - far from the mouse (rectangles small) => small circles become larger
    const stepX = gridW / (cols - 1);
    const stepY = gridH / (rows - 1);
    const smallMax = diskSize * 0.45; // largest small circle
    const smallMin = diskSize * 0.12; // smallest small circle

    fill(0); // small circles are black in the white gaps
    for (let iy = 0; iy < rows - 1; iy++) {
        for (let ix = 0; ix < cols - 1; ix++) {
            const sx = margin + (ix + 0.5) * stepX; // between columns
            const sy = margin + (iy + 0.5) * stepY; // between rows
            const tt = constrain(dist(sx, sy, cx, cy) / maxDist, 0, 1); // same normalised distance
            // opposite mapping: near mouse -> smallMin, far -> smallMax
            const sSize = lerp(smallMin, smallMax, tt);
            ellipse(sx, sy, sSize);
        }
    }
}