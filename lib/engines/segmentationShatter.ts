import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a cellular fracture pattern approximating a Voronoi partition over a
 * seeded set of cell sites, with each pixel assigned to its nearest site and
 * colored like a semantic-segmentation mask. Cell boundaries are warped with a
 * sin/cos jitter field (rather than left as smooth straight-line Voronoi
 * edges) and rendered as sharp dark fracture lines, so the result reads as a
 * cellular fracture/crack pattern tuned to disagree with a real segmentation
 * model's boundary placement — see brainstorm.md's "Detection/tracking
 * confusion" group.
 */
export const segmentationShatter: RenderEngine = {
  id: "segmentation_shatter",
  label: "Segmentation Shatter",
  description: "Voronoi-like cellular fracture lines tuned to fool semantic segmentation boundaries.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    // --- site generation (seeded, deterministic) ---
    const numSites = Math.round(10 + params.density * 50); // 10-60 cells
    const siteX = new Float64Array(numSites);
    const siteY = new Float64Array(numSites);
    const siteR = new Uint8ClampedArray(numSites);
    const siteG = new Uint8ClampedArray(numSites);
    const siteB = new Uint8ClampedArray(numSites);

    for (let i = 0; i < numSites; i++) {
      siteX[i] = rng.random(size);
      siteY[i] = rng.random(size);
      const hue = (params.accentHue + rng.random(-40, 40) + 360) % 360;
      const sat = 40 + rng.random(0, 45);
      const bri = 32 + rng.random(0, 48);
      const [r, g, b] = hsbToRgb(hue, sat, bri);
      siteR[i] = r;
      siteG[i] = g;
      siteB[i] = b;
    }

    // --- boundary fracture-line styling ---
    const edgeWidthPx = 1 + (1 - params.scale) * 5; // 1-6px: thicker cracks at low scale
    const freqScale = 0.015 + params.frequency * 0.05; // spatial frequency of the jagged warp
    const warpAmt = 1 + params.frequency * size * 0.018; // how jagged the fracture lines look
    const phase1 = rng.random(0, Math.PI * 2);
    const phase2 = rng.random(0, Math.PI * 2);

    const fractureHue = (params.accentHue + 180) % 360;
    const [fr, fg, fb] = hsbToRgb(fractureHue, 25, 6);

    for (let y = 0; y < size; y++) {
      const wy = y + Math.cos(y * freqScale + phase2) * warpAmt;
      for (let x = 0; x < size; x++) {
        const wx = x + Math.sin(y * freqScale + phase1) * warpAmt;

        let best = Infinity;
        let second = Infinity;
        let bestIdx = 0;
        for (let i = 0; i < numSites; i++) {
          const dx = wx - siteX[i];
          const dy = wy - siteY[i];
          const d2 = dx * dx + dy * dy;
          if (d2 < best) {
            second = best;
            best = d2;
            bestIdx = i;
          } else if (d2 < second) {
            second = d2;
          }
        }

        const dist1 = Math.sqrt(best);
        const dist2 = Math.sqrt(second);
        const idx = (x + y * size) * 4;

        if (dist2 - dist1 < edgeWidthPx) {
          data[idx] = fr;
          data[idx + 1] = fg;
          data[idx + 2] = fb;
        } else {
          data[idx] = siteR[bestIdx];
          data[idx + 1] = siteG[bestIdx];
          data[idx + 2] = siteB[bestIdx];
        }
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
