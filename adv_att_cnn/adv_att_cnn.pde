// TECHNIQUE 2: CNN TEXTURE ATTACK
// Controls: SPACE to generate new | S to save PNG

void setup() {
  size(800, 800);
  noLoop();
  colorMode(HSB, 360, 100, 100);
}

void draw() {
  loadPixels();
  
  // Random seeds & offsets to ensure fresh propagation on every redraw
  noiseSeed((long)random(100000));
  float offX = random(1000);
  float offY = random(1000);
  float colorShift = random(360);

  float scale1 = random(0.015, 0.03); // Low frequency
  float scale2 = random(0.12, 0.18);  // Mid frequency lattice
  float scale3 = random(0.7, 0.9);    // High frequency micro-noise

  for (int x = 0; x < width; x++) {
    for (int y = 0; y < height; y++) {
      
      float n1 = noise((x + offX) * scale1, (y + offY) * scale1);
      float n2 = sin((x + offX) * scale2) * cos((y + offY) * scale2);
      float n3 = noise((x + offX) * scale3, (y + offY) * scale3);
      
      float combined = (n1 * 0.5) + (n2 * 0.3) + (n3 * 0.2);
      
      // Posterization creates hard gradient cliffs that overwhelm kernels
      float posterized = floor(combined * 8) / 8.0;
      
      float hue = (posterized * 360 + colorShift) % 360;
      float sat = 85;
      float bri = map(sin(combined * PI * 4), -1, 1, 10, 95);
      
      pixels[x + y * width] = color(hue, sat, bri);
    }
  }
  updatePixels();
}

void keyPressed() {
  if (key == ' ') {
    redraw();
  }
  if (key == 's' || key == 'S') {
    saveFrame("cnn_texture_####.png");
    println("Saved: cnn_texture image!");
  }
}

void mousePressed() {
  redraw();
}