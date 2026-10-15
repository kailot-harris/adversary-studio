import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Simulates the two tell-tale artifacts anti-spoofing/liveness classifiers
 * key on when a face is presented via a printed photo or a screen replay
 * instead of a live subject:
 *  - a fine rotated line/dot grating that aliases against the sensor's
 *    pixel grid (the same print/rescan moire a halftone or an LCD subpixel
 *    mask produces), and
 *  - a handful of hard, saturated specular highlight blobs with sharp
 *    falloff (the glare a flat glossy print or phone screen throws back,
 *    unlike the soft diffuse highlights of real skin).
 * Both are layered over a quantized base-noise field standing in for the
 * flattened micro-texture a rescanned/replayed face loses relative to a live
 * capture.
 */
export const livenessSpoofTexture: RenderEngine = {
  id: "liveness_spoof_texture",
  label: "Liveness Spoof Texture",
  description: "Print/screen moire grating plus hard specular glare blobs tuned to fool liveness classifiers.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    // --- base flattened micro-texture (block-quantized noise) ---
    const offX = rng.random(1000);
    const offY = rng.random(1000);
    const baseFreq = 0.01 + (1 - params.scale) * 0.02;

    const blockPxNative = 2 + Math.round((1 - params.frequency) * 4);
    const blockPx = Math.max(1, Math.round(blockPxNative * (size / 800)));

    // --- moire grating params: two near-frequency rotated line grids ---
    const gratingFreq = (0.4 + params.frequency * 1.6) * (Math.PI / 36);
    const delta = 0.004 + (1 - params.scale) * 0.035;
    const gratingFreq2 = gratingFreq * (1 + delta);
    const angle2 = 0.02 + params.density * 0.18;
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);
    const phase1 = rng.random(Math.PI * 2);
    const phase2 = rng.random(Math.PI * 2);
    const gratingStrength = 0.25 + params.density * 0.35;

    // --- specular highlight blobs: a small deterministic set of hard-edged glare spots ---
    const numBlobs = 3 + Math.round(params.density * 9);
    type Blob = { cx: number; cy: number; r: number };
    const blobs: Blob[] = [];
    for (let i = 0; i < numBlobs; i++) {
      blobs.push({
        cx: rng.random(size),
        cy: rng.random(size),
        r: (0.02 + rng.random(0.06)) * size * (0.5 + params.scale),
      });
    }

    for (let by = 0; by < size; by += blockPx) {
      for (let bx = 0; bx < size; bx += blockPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        // flattened base micro-texture
        const n = rng.noise(sx * baseFreq + offX, sy * baseFreq + offY);
        const baseBri = 30 + n * 25;

        // moire grating: XOR of two near-frequency rotated gratings
        const p1 = sx;
        const p2 = sx * cos2 + sy * sin2;
        const g1 = Math.sin(p1 * gratingFreq + phase1);
        const g2 = Math.sin(p2 * gratingFreq2 + phase2);
        const band1 = g1 > 0 ? 1 : 0;
        const band2 = g2 > 0 ? 1 : 0;
        const xorVal = band1 ^ band2;

        let bri = baseBri + (xorVal ? gratingStrength * 55 : -gratingStrength * 20);
        bri = Math.min(100, Math.max(0, bri));

        let r: number;
        let g: number;
        let b: number;
        const [gr, gg, gb] = hsbToRgb(params.accentHue, 15, bri);
        r = gr;
        g = gg;
        b = gb;

        // specular highlight blobs: hard-edged glare with sharp falloff
        for (const blob of blobs) {
          const dx = bx + blockPx / 2 - blob.cx;
          const dy = by + blockPx / 2 - blob.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < blob.r) {
            const t = 1 - dist / blob.r;
            const sharp = t * t * t; // sharp falloff unlike soft diffuse skin highlights
            if (sharp > 0.55) {
              // blown-out glare core, pure white
              r = g = b = 250;
            } else {
              r = Math.round(r + (255 - r) * sharp);
              g = Math.round(g + (255 - g) * sharp);
              b = Math.round(b + (255 - b) * sharp);
            }
          }
        }

        const yEnd = Math.min(size, by + blockPx);
        const xEnd = Math.min(size, bx + blockPx);
        for (let y = by; y < yEnd; y++) {
          for (let x = bx; x < xEnd; x++) {
            const idx = (x + y * size) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
