// make an array to hold Thing objects
let things = [];

// when starting the sketch
function setup() {
// create canvas filling the window
  createCanvas(windowWidth, windowHeight);
}

// every frame
function draw() {
  // make background slightly transparent
  background(255, 50);
  // draw all the things
  for (let i = 0; i < things.length; i++) {
    // draw each thing
    things[i].draw();
  }
}
function mousePressed() {
  // create a new Thing at mouse position and add to array
  let t = new Thing(mouseX, mouseY);
  things.push(t);
}



