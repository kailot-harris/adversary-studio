import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a synthetic "cover image plus hidden payload" statistical artifact:
 * a smooth, low-frequency block-quantized base field (standing in for an
 * innocuous cover image) overlaid with a sparse scatter of tiny single/
 * double-pixel speckles whose brightness differs from their neighborhood by
 * only a small fixed LSB-like step — mimicking the structured, low-amplitude
 * statistical signature left behind by LSB-plane steganographic embedding.
 */
export const steganalysisNoiseBed: RenderEngine = {
  id: "steganalysis_noise_bed",
  label: "Steganalysis Noise Bed",
  description:
    "LSB-plane-style structured noise mimicking steganographic payload statistics.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    const offX = rng.random(1000);
    const offY = rng.random(1000);

    // Base "cover image" field: smooth low-frequency noise, block-quantized
    // (one rng.noise() sample per NxN block, not per pixel).
    const baseScale = 0.0015 + (1 - params.scale) * 0.01;
    const blockPxNative = 6 + Math.round((1 - params.frequency) * 18);
    const blockPx = Math.max(1, Math.round(blockPxNative * (size / 800)));

    const baseHue = params.accentHue;

    for (let by = 0; by < size; by += blockPx) {
      for (let bx = 0; bx < size; bx += blockPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        const n = rng.noise(sx * baseScale + offX, sy * baseScale + offY);
        const bri = 30 + n * 45; // smooth mid-range tonal field
        const sat = 8 + n * 10; // mostly desaturated "cover photo" look

        const [r, g, b] = hsbToRgb(baseHue, sat, bri);

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

    // Sparse speckle pass: scattered single/double-pixel bit-flip artifacts
    // whose brightness differs from the base field by a small fixed
    // LSB-like step. Count scales with density, clustering/period with
    // frequency (tighter clusters at higher frequency).
    const speckleCount = Math.round(400 + params.density * 4200);
    const lsbStep = 6; // small fixed brightness delta, like flipping a low-order bit
    const clusterSpread = Math.max(2, 14 - params.frequency * 11); // px radius of each cluster jitter
    const clusterCount = Math.max(1, Math.round(4 + params.frequency * 28));
    const perCluster = Math.max(1, Math.round(speckleCount / clusterCount));

    for (let c = 0; c < clusterCount; c++) {
      const cx = rng.random(size);
      const cy = rng.random(size);

      for (let s = 0; s < perCluster; s++) {
        const px = Math.round(cx + (rng.random() - 0.5) * clusterSpread * 2);
        const py = Math.round(cy + (rng.random() - 0.5) * clusterSpread * 2);
        if (px < 0 || px >= size || py < 0 || py >= size) continue;

        const sign = rng.random() > 0.5 ? 1 : -1;
        const delta = sign * lsbStep;

        // one or two pixels wide, mimicking a tiny bit-flip footprint
        const wide = rng.random() > 0.8;

        const applySpeckle = (x: number, y: number) => {
          if (x < 0 || x >= size || y < 0 || y >= size) return;
          const idx = (x + y * size) * 4;
          data[idx] = Math.min(255, Math.max(0, data[idx] + delta));
          data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + delta));
          data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + delta));
        };

        applySpeckle(px, py);
        if (wide) applySpeckle(px + 1, py);
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
