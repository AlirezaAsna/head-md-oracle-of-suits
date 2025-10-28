// easy-to-edit settings
const RAZOR_SCALE = 0.2;           // change razor display size
const RAZOR_START_X_FACTOR = 100;    // initial razor x as fraction of video width (0..1)
const RAZOR_START_Y_FACTOR = 0.2;   // initial razor y as fraction of video height (0..1)

const MOUSTACHE_SCALE = 0.25;        // change moustache display size
const MOUSTACHE_X_FACTOR = 0.5;     // moustache position as fraction of width (0..1)
const MOUSTACHE_Y_FACTOR = 0.5;     // moustache position as fraction of height (0..1)

let overlayGraphics; // persistent white overlay (not erased)
let targetGraphics;  // moustache image canvas (erasable)
let grabObject = null; // { x, y, r, iw, ih, scale } - razor image
let isGrabbed = false;
let grabImg; // razor image
let targetImg; // moustache image

function preload() {
  // place assets/razor.png and assets/moustache.png in your assets folder
  grabImg = loadImage('assets/razor.png');
  targetImg = loadImage('assets/moustache.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  setupHands();
  setupVideo();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  overlayGraphics = null;
  targetGraphics = null;
  grabObject = null;
  isGrabbed = false;
}

function draw() {
  background(255);

  if (!isVideoReady()) return;

  // draw the video (still drawn at 0,0) — hand coords will be mapped to full canvas
  image(videoElement, 0, 0);

  // map hand landmarks to the full canvas (screen) size
  const screenW = width;
  const screenH = height;

  // create overlay (white, persistent, NOT erased) sized to screen
  if (!overlayGraphics || overlayGraphics.width !== screenW || overlayGraphics.height !== screenH) {
    overlayGraphics = createGraphics(screenW, screenH);
    overlayGraphics.pixelDensity(1);
    overlayGraphics.clear();
    overlayGraphics.noStroke();
    overlayGraphics.fill(255, 255); // semi-transparent white
    overlayGraphics.rect(0, 0, screenW, screenH);
  }

  // create targetGraphics (moustache) once and draw target image in screen coordinates
  if (!targetGraphics || targetGraphics.width !== screenW || targetGraphics.height !== screenH) {
    targetGraphics = createGraphics(screenW, screenH);
    targetGraphics.pixelDensity(1);
    targetGraphics.clear();
    targetGraphics.imageMode(CENTER);
    const tScale = MOUSTACHE_SCALE;
    const tw = targetImg.width * tScale;
    const th = targetImg.height * tScale;
    const tx = screenW * MOUSTACHE_X_FACTOR;
    const ty = screenH * MOUSTACHE_Y_FACTOR;
    targetGraphics.image(targetImg, tx, ty, tw, th);
    targetGraphics.imageMode(CORNER);
    targetGraphics._target = { x: tx, y: ty, r: max(tw, th) / 2 };
  }

  // initialize grabObject (razor) in screen coordinates if needed
  if (!grabObject) {
    const startX = (RAZOR_START_X_FACTOR <= 1) ? screenW * RAZOR_START_X_FACTOR : RAZOR_START_X_FACTOR;
    const startY = (RAZOR_START_Y_FACTOR <= 1) ? screenH * RAZOR_START_Y_FACTOR : RAZOR_START_Y_FACTOR;
    if (grabImg) {
      const rScale = RAZOR_SCALE;
      const iw = grabImg.width * rScale;
      const ih = grabImg.height * rScale;
      grabObject = { x: startX, y: startY, r: max(iw, ih) / 2, iw, ih, scale: rScale };
    } else {
      grabObject = { x: startX, y: startY, r: 30, iw: 0, ih: 0, scale: 1 };
    }
  }

  // draw the white overlay on top of the video (it is not erased)
  image(overlayGraphics, 0, 0);

  // handle hand detection and grabbing behavior
  if (detections && detections.multiHandLandmarks && detections.multiHandLandmarks.length > 0) {
    // pick first hand with index tip
    const hand = detections.multiHandLandmarks.find(hm => hm[FINGER_TIPS.index]);
    if (hand) {
      const indexLM = hand[FINGER_TIPS.index];

      // MAP LANDMARKS TO FULL SCREEN (not only video area)
      const ix = indexLM.x * screenW;
      const iy = indexLM.y * screenH;

      // start grab when index enters razor bounds (using screen coords)
      if (!isGrabbed) {
        const inside = dist(ix, iy, grabObject.x, grabObject.y) < grabObject.r;
        if (inside) {
          isGrabbed = true;
        }
      }

      // while grabbed, stick razor to index tip (no release until hand lost)
      if (isGrabbed) {
        grabObject.x = ix;
        grabObject.y = iy;

        // if razor overlaps the moustache target, erase the moustache where razor image lies
        const target = targetGraphics._target;
        const overlap = dist(grabObject.x, grabObject.y, target.x, target.y) < (grabObject.r + target.r);
        if (overlap) {
          targetGraphics.drawingContext.save();
          targetGraphics.drawingContext.globalCompositeOperation = 'destination-out';
          targetGraphics.imageMode(CENTER);
          // draw razor image into the targetGraphics (screen coords) to cut out that shape
          targetGraphics.image(grabImg, grabObject.x, grabObject.y, grabObject.iw, grabObject.ih);
          targetGraphics.imageMode(CORNER);
          targetGraphics.drawingContext.restore();
        }
      }

      // draw hand connections for this detected hand mapped to screen
      drawHandConnections(hand, screenW, screenH);
    }
  } else {
    // no hand detected: release grab so user can re-grab later
    isGrabbed = false;
  }

  // draw the moustache (target) on top of overlay (with erased parts)
  image(targetGraphics, 0, 0);

  // draw the razor image on top and highlight when grabbed (screen coords)
  push();
  imageMode(CENTER);
  noStroke();
  if (grabImg) {
    image(grabImg, grabObject.x, grabObject.y, grabObject.iw, grabObject.ih);
  } else {
    fill(0, 150, 255, 220);
    circle(grabObject.x, grabObject.y, grabObject.r * 2);
  }
  if (isGrabbed) {
    noFill();
    stroke(255);
    strokeWeight(2);
    circle(grabObject.x, grabObject.y, max(grabObject.iw, grabObject.ih) + 12);
  }
  imageMode(CORNER);
  pop();

  // optional: draw debug markers (left empty to avoid overwriting)
  strokeWeight(1);
  if (detections) {
    for (let hand of detections.multiHandLandmarks) {
      drawIndex(hand);
    }
  }

}

// draw simple hand connections and joints
function drawHandConnections(landmarks, w, h) {
  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
  ];
  stroke(0, 200);
  strokeWeight(2);
  for (const [a,b] of CONNECTIONS) {
    const A = landmarks[a], B = landmarks[b];
    if (!A || !B) continue;
    line(A.x * w, A.y * h, B.x * w, B.y * h);
  }
  noStroke();
  fill(0, 200, 255, 180);
  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    if (!p) continue;
    circle(p.x * w, p.y * h, 6);
  }
}

function drawIndex(landmarks) {
  // keep empty — avoids drawing over erased target/overlay
}
