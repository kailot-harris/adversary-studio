// TECHNIQUE 1: CV DAZZLE
// Controls: SPACE to generate new | S to save PNG

void setup() {
  size(800, 800);
  noLoop();
}

void draw() {
  background(240);
  
  // 1. Asymmetric Background Cuts
  int strips = int(random(4, 9));
  for (int i = 0; i < strips; i++) {
    fill((i % 2 == 0) ? 0 : 255);
    noStroke();
    beginShape();
    vertex(random(-100, width), 0);
    vertex(random(0, width + 100), 0);
    vertex(random(0, width + 100), height);
    vertex(random(-100, width), height);
    endShape(CLOSE);
  }

  // 2. High-Contrast Spatial Interruptions
  int numBlocks = int(random(10, 20));
  for (int i = 0; i < numBlocks; i++) {
    pushMatrix();
    translate(random(width), random(height));
    rotate(random(TWO_PI));
    
    float r = random(1);
    if (r < 0.45) fill(0);
    else if (r < 0.88) fill(255);
    else fill(0, 255, 200); // Electric Cyan Accent
    
    noStroke();
    float w = random(40, 250);
    float h = random(20, 80);
    
    beginShape();
    vertex(0, 0);
    vertex(w, random(-20, 20));
    vertex(w * 0.8, h);
    vertex(0, h * 0.6);
    endShape(CLOSE);
    popMatrix();
  }

  // 3. Simulated False Landmarks
  int falseEyes = int(random(3, 8));
  for (int i = 0; i < falseEyes; i++) {
    float x = random(100, width - 100);
    float y = random(100, height - 100);
    float eyeDist = random(30, 70);
    
    fill(0);
    circle(x - eyeDist/2, y, random(15, 30));
    circle(x + eyeDist/2, y, random(15, 30));
    fill(255);
    circle(x - eyeDist/2, y, random(5, 10));
    circle(x + eyeDist/2, y, random(5, 10));
  }
}

void keyPressed() {
  if (key == ' ') {
    redraw();
  }
  if (key == 's' || key == 'S') {
    saveFrame("cv_dazzle_####.png");
    println("Saved: cv_dazzle image!");
  }
}

void mousePressed() {
  redraw();
}