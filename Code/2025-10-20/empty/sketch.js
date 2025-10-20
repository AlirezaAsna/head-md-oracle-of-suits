function setup() {
    createCanvas(700, 700);
    noLoop();       // draw just once
    noStroke();
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

    fill(0); // black circles

    for (let iy = 0; iy < rows; iy++) {
        for (let ix = 0; ix < cols; ix++) {
            const x = margin + ix * gridW / (cols - 1);
            const y = margin + iy * gridH / (rows - 1);
            ellipse(x, y, diskSize);
        }
    }
}