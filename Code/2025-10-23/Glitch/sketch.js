// the blendshapes we are going to track
let leftEyeBlink = 0.0;
let rightEyeBlink = 0.0;
let jawOpen = 0.0;

// audio / glitch sound globals
let glitchNoise = null;
let glitchFilter = null;
let glitchDist = null;
let lastGlitchIntensity = 0;

function setup() {
  // full window canvas
  createCanvas(windowWidth, windowHeight);
  // initialize MediaPipe
  setupFace();
  setupVideo();
  // initialize sound (requires p5.sound.js)
  setupGlitchSound();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {

  // clear the canvas
  background(128);

  if (isVideoReady()) {
    // show video frame
    image(videoElement, 0, 0);
  }

  // UI hint: don't turn your face
  push();
  noStroke();
  fill(255, 30, 30);
  textSize(20);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('dont turn your face', 10, 10);
  pop();

  // get detected faces
  let faces = getFaceLandmarks();

  
  // measure face turning for the first detected face (if any)
  if (faces && faces.length > 0) {
    let turn = measureFaceTurn(faces[0]);
    // example: draw the yaw in degrees top-left
    fill(0, 200, 0);
    noStroke();
    textSize(16);
    text('yaw: ' + turn.yawDeg.toFixed(1) + '°  norm: ' + turn.normalized.toFixed(2), 10, 40);

    // apply glitch effect inside the face bounding box
    // intensity depends on how much the face is turning (use absolute normalized)
    applyFaceGlitch(faces[0], Math.abs(turn.normalized));
  }

}

// compute face turn (yaw) from landmarks / face object
// accepts:
// - an array of points: [ [x,y,z], ... ] or [ {x,y,z}, ... ]
// - a face object with properties scaledMesh / mesh / landmarks / annotations
function measureFaceTurn(faceOrPoints) {
  const pts = extractPoints(faceOrPoints);
  if (!pts || pts.length === 0) return { yaw: 0, yawDeg: 0, normalized: 0 };

  // build arrays of x and z (z is depth if present; fallback z=0)
  let meanX = 0, meanZ = 0;
  const n = pts.length;
  const xs = new Array(n);
  const zs = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    let x, z;
    if (Array.isArray(p)) { x = p[0]; z = (p[2] !== undefined ? p[2] : 0); }
    else { x = (p.x !== undefined ? p.x : p[0]); z = (p.z !== undefined ? p.z : (p[2] !== undefined ? p[2] : 0)); }
    xs[i] = x;
    zs[i] = z;
    meanX += x;
    meanZ += z;
  }
  meanX /= n;
  meanZ /= n;

  // covariance and variances in the x-z plane
  let varX = 0, varZ = 0, covXZ = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dz = zs[i] - meanZ;
    varX += dx * dx;
    varZ += dz * dz;
    covXZ += dx * dz;
  }
  // normalize by n
  varX /= n;
  varZ /= n;
  covXZ /= n;

  // principal axis angle in x-z plane
  // angle relative to x-axis: theta = 0.5 * atan2(2*covXZ, varX - varZ)
  const theta = 0.5 * Math.atan2(2 * covXZ, varX - varZ);

  // Interpret yaw: positive theta means rotation toward positive z->x direction.
  // Convert to degrees and a normalized -1..1 value (use tanh to squash)
  const yaw = theta; // radians
  const yawDeg = yaw * 180 / Math.PI;
  const normalized = Math.tanh(yaw * 2.0);

  return { yaw, yawDeg, normalized };
}

// helper: extract an array of points from different face formats
function extractPoints(faceOrPoints) {
  if (!faceOrPoints) return null;
  // already an array of points
  if (Array.isArray(faceOrPoints) && faceOrPoints.length > 0 && (Array.isArray(faceOrPoints[0]) || typeof faceOrPoints[0] === 'object')) {
    return faceOrPoints;
  }
  // face object variants
  if (faceOrPoints.scaledMesh) return faceOrPoints.scaledMesh;
  if (faceOrPoints.mesh) return faceOrPoints.mesh;
  if (faceOrPoints.landmarks) return faceOrPoints.landmarks;
  if (faceOrPoints.landmark) return faceOrPoints.landmark;
  if (faceOrPoints.annotations) {
    // flatten annotations to point list
    let out = [];
    for (let k in faceOrPoints.annotations) {
      out = out.concat(faceOrPoints.annotations[k]);
    }
    return out;
  }
  return null;
}

// setup a simple noise-based glitch sound (requires p5.sound)
// - glitchNoise: p5.Noise
// - glitchFilter: p5.Filter to shape timbre
// - glitchDist: p5.Distortion (if available) to make it trashy
function setupGlitchSound() {
  // if p5.sound isn't loaded this will fail silently
  try {
    glitchNoise = new p5.Noise('white');
    glitchNoise.start();
    glitchNoise.amp(0);

    glitchFilter = new p5.BandPass();
    glitchFilter.freq(800); // initial
    glitchFilter.res(5);

    // disconnect default output path and route through filter
    glitchNoise.disconnect();
    glitchNoise.connect(glitchFilter);

    // optional distortion (if p5.Distortion is available)
    try {
      glitchDist = new p5.Distortion();
      // route filter -> distortion -> master output
      glitchFilter.disconnect();
      glitchFilter.connect(glitchDist);
      glitchDist.process(glitchFilter, 0); // start with zero amount
    } catch (e) {
      // if Distortion not available, just connect filter to master
      glitchFilter.connect();
      glitchDist = null;
    }
  } catch (e) {
    // p5.sound not present or error; ignore sound features
    glitchNoise = null;
    glitchFilter = null;
    glitchDist = null;
  }
}

// update sound parameters based on intensity 0..1
function updateGlitchSound(intensity) {
  if (!glitchNoise) return;
  // smooth intensity to avoid clicks
  lastGlitchIntensity = lerp(lastGlitchIntensity || 0, intensity, 0.08);

  // volume: small at low, louder when intense
  const targetAmp = map(lastGlitchIntensity, 0, 1, 0, 0.5);
  glitchNoise.amp(targetAmp, 0.05);

  // filter: move cutoff and resonance to get trashy timbre
  const cutoff = map(lastGlitchIntensity, 0, 1, 400, 5000);
  const res = map(lastGlitchIntensity, 0, 1, 2, 8);
  glitchFilter.freq(cutoff);
  glitchFilter.res(res);

  // distortion: if available, increase amount with intensity
  if (glitchDist && typeof glitchDist.process === 'function') {
    const amount = map(lastGlitchIntensity, 0, 1, 0, 0.8);
    // re-process with new amount (process may be idempotent)
    glitchDist.process(glitchFilter, amount);
  }
}

// apply a horizontal-slice glitch inside the face bounding box
// intensity: 0..1 (how strong the glitch is)
function applyFaceGlitch(faceOrPoints, intensity) {
  const pts = extractPoints(faceOrPoints);
  if (!pts || pts.length === 0) return;

  // compute bounding box of landmarks (x,y)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    let x = Array.isArray(p) ? p[0] : (p.x !== undefined ? p.x : p[0]);
    let y = Array.isArray(p) ? p[1] : (p.y !== undefined ? p.y : p[1]);
    // handle normalized coords (0..1) by scaling to video size if needed
    if (x >= 0 && x <= 1 && maxX <= 1) {
      if (typeof videoElement !== 'undefined' && videoElement.width) {
        x = x * videoElement.width;
      } else {
        x = x * width;
      }
    }
    if (y >= 0 && y <= 1 && maxY <= 1) {
      if (typeof videoElement !== 'undefined' && videoElement.height) {
        y = y * videoElement.height;
      } else {
        y = y * height;
      }
    }
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  // safety clamp
  minX = constrain(minX, 0, width);
  minY = constrain(minY, 0, height);
  maxX = constrain(maxX, 0, width);
  maxY = constrain(maxY, 0, height);

  // initial measured face box
  let bw = maxX - minX;
  let bh = maxY - minY;
  if (bw < 10 || bh < 10) {
    // also update sound to fade out
    updateGlitchSound(0);
    return;
  }

  // Expand vertical bounds so the glitch covers the whole face (forehead -> chin).
  // Tweak padTop / padBottom if needed for your landmark set.
  const padTop = bh * 0.6;    // extend upwards (forehead)
  const padBottom = bh * 0.35; // extend downwards (chin/neck)
  minY = constrain(minY - padTop, 0, height);
  maxY = constrain(maxY + padBottom, 0, height);

  // recompute after expansion
  bw = maxX - minX;
  bh = maxY - minY;
  if (bh < 10) {
    updateGlitchSound(0);
    return;
  }

  // update glitch sound
  updateGlitchSound(intensity);

  // number of horizontal slices scaled by intensity
  const slices = Math.min(40, Math.max(3, Math.floor(3 + intensity * 37)));
  const sliceH = Math.max(2, Math.ceil(bh / slices));

  const t = millis() / 1000;
  const baseFreq = 4 + intensity * 10; // how fast slices oscillate
  const maxOffset = width * 0.6; // allow displacement across the full canvas

  // sample full canvas width but only for rows within the expanded face vertical range
  for (let i = 0; i < slices; i++) {
    const sy = Math.round(minY + i * sliceH);
    const sh = Math.min(sliceH + 1, Math.round(maxY - sy));
    if (sh <= 0) continue;
    const sx = 0;                 // sample from full canvas left
    const sw = Math.max(1, Math.round(width)); // full canvas width

    // compute offset: main sinusoidal back-and-forth + occasional jitter
    const phase = t * baseFreq + i * 0.45;
    let offset = Math.round(Math.sin(phase) * intensity * maxOffset);
    // occasional random glitch spike depending on intensity
    if (random() < intensity * 0.06) {
      offset += Math.round((random() * 2 - 1) * intensity * maxOffset * 0.9);
    }

    // grab a full-width slice from the canvas (video already drawn)
    const sliceImg = get(sx, sy, sw, sh);

    // draw chromatic-shifted layers across full width, but vertical placement limited to face vertical area
    push();
    // red layer
    tint(255, 120, 120, 160 * lerp(0.6, 1.0, intensity));
    image(sliceImg, sx + offset + Math.round(3 * intensity), sy);
    // green layer
    tint(120, 255, 160, 140 * lerp(0.6, 1.0, intensity));
    image(sliceImg, sx + offset - Math.round(3 * intensity), sy);
    // main (white) layer
    tint(255, 255, 255, 220 * lerp(0.8, 1.0, intensity));
    image(sliceImg, sx + offset, sy);
    noTint();
    pop();
  }
}

