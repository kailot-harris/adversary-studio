// TECHNIQUE 4: PHANTOM SKELETON (POSE JAMMER)
// Controls: SPACE to generate new | S to save PNG

void setup() {
  size(800, 800);
  noLoop();
}

void draw() {
  background(12, 14, 18); // Deep terminal slate

  // 1. Draw subtle coordinate grid (Machine Calibration Aesthetic)
  stroke(30, 40, 50);
  strokeWeight(1);
  for (int i = 0; i < width; i += 80) {
    line(i, 0, i, height);
    line(0, i, width, i);
  }

  // 2. Generate Clusters of Decoy Humanoid Limb Networks
  int clusters = int(random(3, 6));
  
  for (int c = 0; c < clusters; c++) {
    float rootX = random(150, width - 150);
    float rootY = random(150, height - 150);
    
    // Each cluster simulates a fractured kinematic tree (spine -> limbs)
    drawKinematicTree(rootX, rootY, int(random(8, 16)), random(40, 110));
  }
}

void drawKinematicTree(float startX, float startY, int jointCount, float limbLen) {
  float currX = startX;
  float currY = startY;
  
  for (int j = 0; j < jointCount; j++) {
    float angle = random(TWO_PI);
    float nextX = currX + cos(angle) * limbLen * random(0.6, 1.4);
    float nextY = currY + sin(angle) * limbLen * random(0.6, 1.4);

    // BONES: Bold vectors that trigger Part Affinity Fields (PAFs)
    stroke(255);
    strokeWeight(random(2, 5));
    line(currX, currY, nextX, nextY);

    // DECOY PARALLEL VECTOR (Forces connection confusion)
    if (random(1) > 0.6) {
      stroke(0, 240, 255, 180);
      strokeWeight(1.5);
      line(currX + 8, currY - 8, nextX + 8, nextY - 8);
    }

    // JOINTS: Glowing high-probability heatmaps
    noStroke();
    // Confidence halo
    fill(255, 0, 110, 80);
    circle(currX, currY, random(20, 40));
    // Core joint node
    fill((j % 2 == 0) ? color(0, 255, 180) : color(255, 230, 0));
    circle(currX, currY, random(8, 14));

    // Decoy confidence target box
    if (random(1) > 0.7) {
      stroke(255, 255, 0, 160);
      strokeWeight(1);
      noFill();
      float boxS = random(20, 35);
      rect(currX - boxS/2, currY - boxS/2, boxS, boxS);
    }

    // Branching: Skeletons split into multiple limbs
    if (random(1) > 0.5) {
      currX = nextX;
      currY = nextY;
    }
  }
}

void keyPressed() {
  if (key == ' ') redraw();
  if (key == 's' || key == 'S') {
    saveFrame("pose_jammer_####.png");
    println("Saved: pose_jammer image!");
  }
}

void mousePressed() {
  redraw();
}