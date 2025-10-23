class Thing {
    // when creating a new Thing
  constructor(x, y) {
    // position based on mouse click
    this.x = x;
    this.y = y;

    this.halfSize = random(40, 140);
    this.w = max(6, this.halfSize * 0.12);
    // an array of colors for the lines
    const palette = [
      color(255, 0, 0),
      color(0, 255, 0),
      color(0, 0, 255),
      color(255, 255, 0),
      color(255, 0, 255),
      color(0, 255, 255)
    ];
    // pick 4 random colors from the palette
    this.colors = shuffle(palette).slice(0, 4);
    // the gap at the center of the lines
    this.gap = constrain(this.halfSize * 0.45, 10, this.halfSize * 0.9);

    this.angle = random(0, TWO_PI);
    this.rotationSpeed = random(-0.02, 0.02);
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);

    strokeCap(SQUARE);
    strokeWeight(this.w);

    const s = this.halfSize;
    const drawSplit = (x1, y1, x2, y2, c1, c2) => {
      const dx = x2 - x1, dy = y2 - y1;
      const L = Math.hypot(dx, dy);
      if (L <= 0) return;
      const gap = Math.min(this.gap, L - 0.001);
      const keep = (L - gap) / 2;
      const ux = dx / L, uy = dy / L;
      const mx1 = x1 + ux * keep, my1 = y1 + uy * keep;
      const mx2 = x2 - ux * keep, my2 = y2 - uy * keep;
      stroke(c1); line(x1, y1, mx1, my1);
      stroke(c2); line(mx2, my2, x2, y2);
    };

    drawSplit(-s, -s, s, s, this.colors[0], this.colors[1]);
    drawSplit(s, -s, -s, s, this.colors[2], this.colors[3]);

    pop();

    this.angle += this.rotationSpeed;
  }
}