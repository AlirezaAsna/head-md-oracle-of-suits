// added: wave parameters (place near top of the file, before setup)
let waveAmp = 60;      // maximum vertical amplitude
let waveSpeed = 1.2;   // global speed multiplier
let waveLines = 40;     // number of stacked wave lines
let waveResolution = 80; // number of points per line

// added: dynamic control state
let dynamicAmp = waveAmp;         // amplitude used by drawWave (updated from hands)
let lineThickness = 1.6;          // current stroke weight for wave lines
const thicknessMin = 0.6;
const thicknessMax = 20;
let waveColor = [10, 120, 200, 160]; // rgba for stroke
let prevThumbAbove = false;        // edge detect for color change

// add near the top (globals)
let waveField = null;

function setup() {

  // full window canvas
  createCanvas(windowWidth, windowHeight);

  // initialize MediaPipe settings
  setupHands();
  // start camera using MediaPipeHands.js helper
  setupVideo();

  // instantiate wave field after canvas exists
  waveField = new WaveField(waveLines, waveResolution, waveSpeed);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


function draw() {
  // clear the canvas
  background(255, 5);

  // if the video connection is ready
  if (isVideoReady()) {
    // draw the capture image
    image(videoElement, 0, 0);
  }

  // use thicker lines for drawing hand connections
  strokeWeight(2);

  // make sure we have detections to draw
  if (detections) {

    // for each detected hand
    for (let hand of detections.multiHandLandmarks) {
      // draw the index finger
      drawIndex(hand);
      // draw the thumb finger
      drawThumb(hand);
      // draw fingertip points
      // drawTips(hand);
      // draw connections
      //drawConnections(hand);
      // draw all landmarks
      //drawLandmarks(hand);
    } // end of hands loop

  } // end of if detections

  // update controls (amplitude, thickness, color triggers) from detected hands
  updateControlsFromHands();

  // draw the animated wave overlay
  drawWave();

} // end of draw


// only the index finger tip landmark
function drawIndex(landmarks) {

  // get the index fingertip landmark
  let mark = landmarks[FINGER_TIPS.index];

  noStroke();
  // set fill color for index fingertips
  fill(0, 255, 255);

  // adapt the coordinates (0..1) to video coordinates
  let x = mark.x * videoElement.width;
  let y = mark.y * videoElement.height;
  circle(x, y, 20);

}


// draw the thumb finger tip landmark
function drawThumb(landmarks) {

  // get the thumb fingertip landmark
  let mark = landmarks[FINGER_TIPS.thumb];

  noStroke();
  // set fill color for thumb fingertips
  fill(255, 255, 0);

  // adapt the coordinates (0..1) to video coordinates
  let x = mark.x * videoElement.width;
  let y = mark.y * videoElement.height;
  circle(x, y, 20);

}

function drawTips(landmarks) {

  noStroke();
  // set fill color for fingertips
  fill(0, 0, 255);

  // fingertip indices
  const tips = [4, 8, 12, 16, 20];

  for (let tipIndex of tips) {
    let mark = landmarks[tipIndex];
    // adapt the coordinates (0..1) to video coordinates
    let x = mark.x * videoElement.width;
    let y = mark.y * videoElement.height;
    circle(x, y, 10);
  }

}


function drawLandmarks(landmarks) {

  noStroke();
  // set fill color for landmarks
  fill(255, 0, 0);

  for (let mark of landmarks) {
    // adapt the coordinates (0..1) to video coordinates
    let x = mark.x * videoElement.width;
    let y = mark.y * videoElement.height;
    circle(x, y, 6);
  }

}


function drawConnections(landmarks) {

  // set stroke color for connections
  stroke(0, 255, 0);

  // iterate through each connection
  for (let connection of HAND_CONNECTIONS) {
    // get the two landmarks to connect
    const a = landmarks[connection[0]];
    const b = landmarks[connection[1]];
    // skip if either landmark is missing
    if (!a || !b) continue;
    // landmarks are normalized [0..1], (x,y) with origin top-left
    let ax = a.x * videoElement.width;
    let ay = a.y * videoElement.height;
    let bx = b.x * videoElement.width;
    let by = b.y * videoElement.height;
    line(ax, ay, bx, by);
  }

}

// added: update controls from hands (amplitude + thickness + color trigger)
function updateControlsFromHands() {
  // default values when no hands
  dynamicAmp = waveAmp;
  // gently decay thickness to default if no control hand
  // but we'll leave lineThickness as is if no second hand

  if (!detections || !detections.multiHandLandmarks) return;

  const hands = detections.multiHandLandmarks;

  // Primary hand (index 0) controls amplitude (same as before)
  if (hands.length >= 1) {
    const handA = hands[0];
    const a = handA[4]; // thumb tip
    const b = handA[8]; // index tip
    if (a && b && typeof videoElement !== 'undefined') {
      const dx = (a.x - b.x) * videoElement.width;
      const dy = (a.y - b.y) * videoElement.height;
      const dist = Math.sqrt(dx*dx + dy*dy);
      dynamicAmp = constrain(map(dist, 0, Math.min(width, height)/2, 10, waveAmp*1.5), 8, waveAmp*2);
    } else {
      dynamicAmp = waveAmp;
    }
  }

  // Secondary hand (index 1) controls thickness of lines
  if (hands.length >= 2) {
    const handB = hands[1];
    const a2 = handB[4];
    const b2 = handB[8];
    if (a2 && b2 && typeof videoElement !== 'undefined') {
      const dx2 = (a2.x - b2.x) * videoElement.width;
      const dy2 = (a2.y - b2.y) * videoElement.height;
      const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
      // map pinch/sep distance to thickness
      lineThickness = constrain(map(dist2, 0, Math.min(width, height)/2, thicknessMin, thicknessMax), thicknessMin, thicknessMax);
    }
  }

  // detect thumb-above-index for color change trigger (any hand)
  let anyThumbAbove = false;
  for (let hand of hands) {
    if (isThumbAboveIndex(hand)) {
      anyThumbAbove = true;
      break;
    }
  }
  // on rising edge, randomize color
  if (anyThumbAbove && !prevThumbAbove) {
    waveColor = [random(40, 220), random(40, 220), random(40, 220), 160];
  }
  prevThumbAbove = anyThumbAbove;
}

// added: helper - is thumb above index (y smaller is above in canvas coords)
function isThumbAboveIndex(landmarks) {
  if (!landmarks) return false;
  const thumb = landmarks[4];
  const index = landmarks[8];
  if (!thumb || !index) return false;
  // in normalized coords y increases downward, so "above" means thumb.y < index.y
  return thumb.y < index.y - 0.01; // small hysteresis
}

// replace the previous drawWave() implementation with a delegate to waveField
function drawWave() {
  const t = millis() * 0.001;
  const amp = dynamicAmp;
  // center Y for the whole field
  const centerY = height * 0.5;

  // delegate to WaveField (it sets stroke & weight internally)
  if (!waveField) waveField = new WaveField(waveLines, waveResolution, waveSpeed);
  waveField.draw(centerY, amp, t, waveColor, lineThickness);
}
