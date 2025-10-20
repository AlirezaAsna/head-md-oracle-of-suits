function setup() {                    // setup() runs once at the start to get everything ready
    createCanvas(700, 700);            // make a 700 by 700 pixel drawing paper
    noStroke();                        // shapes will have no outline (no border)
    rectMode(CENTER); // center rects on (x,y) // when we draw rectangles, x,y is the center
}

function draw() {                     // draw() paints on the paper
    background(255);                  // paint the background white (255 is white)

    const cols = 11;                  // number of circles across (11 columns)
    const rows = 11;                  // number of circles down (11 rows)
    const margin = 40;                // keep 40 pixels empty around the edges
    const gridW = width - margin * 2; // usable width inside the left and right margins
    const gridH = height - margin * 2;// usable height inside the top and bottom margins

    // distance between grid points — use cols-1 so circles sit on edges too
    const cell = min(gridW / (cols - 1), gridH / (rows - 1)); // how far apart centers are
    const diskSize = cell * 0.9; // circle diameter  // make circles 90% of that spacing

    // use the mouse as the "center" for rectangle scaling
    const cx = mouseX;             // mouse x (rectangles follow the mouse)
    const cy = mouseY;             // mouse y (rectangles follow the mouse)

    // compute the farthest distance from the mouse to any corner of the canvas
    const maxDist = max(
      dist(cx, cy, 0, 0),
      dist(cx, cy, width, 0),
      dist(cx, cy, 0, height),
      dist(cx, cy, width, height)
    );

    for (let iy = 0; iy < rows; iy++) { // loop over each row (iy is the row number)
        for (let ix = 0; ix < cols; ix++) { // loop over each column (ix is the column number)
            const x = margin + ix * gridW / (cols - 1); // x position of this circle center
            const y = margin + iy * gridH / (rows - 1); // y position of this circle center

            // black circle
            fill(0);               // set color to black (0 is black)
            ellipse(x, y, diskSize); // draw a circle at x,y with diameter diskSize

            // keep rect width the same, but make rect height shrink toward the mouse
            const slotW = diskSize * 0.6;   // fixed width of the inner rectangle
            // compute normalized distance from mouse (0..1)
            const t = constrain(dist(x, y, cx, cy) / maxDist, 0, 1); // t = 0 at mouse, 1 far away
            // height interpolates from larger near the mouse to very small far away
            const slotH = lerp(diskSize * 0.30, diskSize * 0.03, t); // interpolate height by t
            const corner = slotH * 0.6;     // how rounded the rectangle corners are

            // white rounded rectangle inside the circle
            fill(255);              // set color to white (255 is white)
            rect(x, y, slotW, slotH, corner); // draw the rounded rectangle centered at x,y
        }
    }
}