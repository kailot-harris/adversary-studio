// TECHNIQUE 3: ADVERSARIAL PATCH
// Controls: SPACE to generate new | S to save PNG

void setup() {
  size(800, 800);
  noLoop();
  rectMode(CENTER);
}

void draw() {
  background(20);
  translate(width / 2, height / 2);

  // Randomize characteristics on each run
  noiseSeed((long)random(100000));
  float rotSpeed = random(6, 14);
  int layers = int(random(50, 75));
  float noiseIntensity = random(40, 80);

  for (int i = layers; i > 0; i--) {
    float progress = float(i) / layers;
    
    pushMatrix();
    // Non-linear rotation induces high rotational variance
    rotate(sin(progress * rotSpeed) * PI);
    
    // Hyper-saturated colors
    int col = i % 4;
    if (col == 0) fill(255, 0, 120);       // Magenta
    else if (col == 1) fill(0, 240, 255);  // Cyan
    else if (col == 2) fill(255, 255, 0);  // Yellow
    else fill(0, 255, 100);                // Neon Green

    stroke(0);
    strokeWeight(random(1.5, 3.5));

    beginShape();
    int points = int(random(12, 20));
    for (int p = 0; p < points; p++) {
      float angle = map(p, 0, points, 0, TWO_PI);
      float radius = (i * 6.5) + (noise(p, progress * 4) * noiseIntensity);
      float x = cos(angle) * radius;
      float y = sin(angle) * radius;
      curveVertex(x, y);
    }
    endShape(CLOSE);
    popMatrix();
  }
}

void keyPressed() {
  if (key == ' ') {
    redraw();
  }
  if (key == 's' || key == 'S') {
    saveFrame("adversarial_patch_####.png");
    println("Saved: adversarial_patch image!");
  }
}

void mousePressed() {
  redraw();
}