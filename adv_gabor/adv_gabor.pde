// TECHNIQUE 5: GABOR CORTICAL GRATING (OP-ART OVERLOAD)
// Controls: SPACE to generate new | S to save PNG

void setup() {
  size(800, 800);
  noLoop();
}

void draw() {
  background(10);

  int patches = int(random(12, 22));
  
  // Layer intersecting directional frequency patches
  for (int p = 0; p < patches; p++) {
    pushMatrix();
    translate(random(100, width - 100), random(100, height - 100));
    
    // Conflicting directional angles break Sobel/Gabor orientation matrices
    float angle = floor(random(8)) * (PI / 4.0); // Quantized cardinal/diagonal angles
    rotate(angle);

    float patchW = random(180, 360);
    float patchH = random(180, 360);
    float freq = random(6, 16); // Frequency of the grating lines

    // Alternating between stark monochrome and blinding chromatic aberration
    boolean isChromatic = (random(1) > 0.75);
    
    for (float x = -patchW/2; x < patchW/2; x += freq) {
      if (isChromatic) {
        stroke(random(1) > 0.5 ? color(255, 0, 100) : color(0, 255, 220));
        strokeWeight(freq * 0.45);
      } else {
        stroke(245);
        strokeWeight(freq * 0.4);
      }

      // Draw the parallel directional grating
      line(x, -patchH/2, x, patchH/2);
    }

    // High-contrast boundary edge to introduce conflicting second-order gradients
    noFill();
    stroke(0);
    strokeWeight(random(4, 8));
    rect(-patchW/2, -patchH/2, patchW, patchH);

    popMatrix();
  }

  // Circular interference lens overlay (induces concentric Moiré fringe)
  pushMatrix();
  translate(width/2, height/2);
  noFill();
  stroke(0);
  strokeWeight(12);
  circle(0, 0, 520);
  stroke(255);
  strokeWeight(3);
  circle(0, 0, 520);
  popMatrix();
}

void keyPressed() {
  if (key == ' ') redraw();
  if (key == 's' || key == 'S') {
    saveFrame("gabor_opart_####.png");
    println("Saved: gabor_opart image!");
  }
}

void mousePressed() {
  redraw();
}