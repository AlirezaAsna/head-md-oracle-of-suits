// Merged grid sketch + handpose — index fingertip replaces mouse
let video;
let handposeModel;
let predictions = [];
let fingerX = 0, fingerY = 0;
let smoothFingerX = 0, smoothFingerY = 0;
let statusMessage = 'Starting...';

function setup() {
  createCanvas(700, 700);
  noStroke();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusMessage = 'getUserMedia not supported';
    console.error(statusMessage);
    return;
  }

  statusMessage = 'Requesting camera…';
  // create hidden video at canvas size so coordinates match
  video = createCapture(VIDEO, videoReady);
  video.size(width, height);
  video.hide();
}

function videoReady() {
  statusMessage = 'Camera ready — loading model…';
  console.log('Video ready');

  // give the DOM video element to ml5.handpose
  handposeModel = ml5.handpose(video.elt, () => {
    statusMessage = 'Handpose model loaded';
    console.log('Handpose model loaded');
  });

  handposeModel.on('predict', results => {
    predictions = results;
  });

  // best-effort permission hint
  video.elt.onpause = () => {
    statusMessage = 'Camera paused / permission denied';
    console.warn(statusMessage);
  };
}

function draw() {
  background(255);

  // decide pointer position: index fingertip if available, else mouse
  if (predictions && predictions.length > 0 && predictions[0].landmarks) {
    const index = predictions[0].landmarks[8]; // index fingertip
    // index is in video coords; mirror X so motion feels like a mirror
    const ix = width - index[0];
    const iy = index[1];

    // smooth the raw finger position
    smoothFingerX = lerp(smoothFingerX, ix, 0.25);
    smoothFingerY = lerp(smoothFingerY, iy, 0.25);
    fingerX = smoothFingerX;
    fingerY = smoothFingerY;
  } else {
    // fallback to mouse
    fingerX = mouseX;
    fingerY = mouseY;
    // gently lerp so behavior is similar
    smoothFingerX = lerp(smoothFingerX, fingerX, 0.25);
    smoothFingerY = lerp(smoothFingerY, fingerY, 0.25);
    fingerX = smoothFingerX;
    fingerY = smoothFingerY;
  }

  // If camera isn't ready yet, show status
  if (!video || !video.elt || video.elt.readyState < 2) {
    fill(0);
    textSize(16);
    text(statusMessage, width / 2, height / 2);
    // still draw grid reacting to mouse/fallback for preview
  }

  // --- original grid code, using fingerX/fingerY as the "mouse" center ---
  const cols = 11;
  const rows = 11;
  const margin = 40;
  const gridW = width - margin * 2;
  const gridH = height - margin * 2;

  const cell = min(gridW / (cols - 1), gridH / (rows - 1));
  const diskSize = cell * 0.9;

  const cx = fingerX;
  const cy = fingerY;
  const maxDist = max(
    dist(cx, cy, 0, 0),
    dist(cx, cy, width, 0),
    dist(cx, cy, 0, height),
    dist(cx, cy, width, height)
  );

  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const x = margin + ix * gridW / (cols - 1);
      const y = margin + iy * gridH / (rows - 1);

      fill(0);
      ellipse(x, y, diskSize);

      const slotW = diskSize * 0.6;
      const t = constrain(dist(x, y, cx, cy) / maxDist, 0, 1); // 0 near finger, 1 far
      const slotH = lerp(diskSize * 0.30, diskSize * 0.03, t);
      const corner = slotH * 0.6;

      fill(255);
      rect(x, y, slotW, slotH, corner);
    }
  }

  const stepX = gridW / (cols - 1);
  const stepY = gridH / (rows - 1);
  const smallMax = diskSize * 0.45;
  const smallMin = diskSize * 0.12;

  fill(0);
  for (let iy = 0; iy < rows - 1; iy++) {
    for (let ix = 0; ix < cols - 1; ix++) {
      const sx = margin + (ix + 0.5) * stepX;
      const sy = margin + (iy + 0.5) * stepY;
      const tt = constrain(dist(sx, sy, cx, cy) / maxDist, 0, 1);
      const sSize = lerp(smallMin, smallMax, tt);
      ellipse(sx, sy, sSize);
    }
  }

  // optional: small debug dot where the fingertip is (comment out if not needed)
  push();
  fill(255, 0, 0, 180);
  noStroke();
  ellipse(cx, cy, 12);
  pop();
}
