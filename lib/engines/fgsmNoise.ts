import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a synthetic "attacked" confidence map: a soft low-frequency base
 * (standing in for an object's detected features) overlaid with a quantized,
 * sign-banded high-frequency perturbation field, colored like a saliency/
 * gradient diverging colormap (positive vs. negative perturbation).
 */
export const fgsmNoise: RenderEngine = {
  id: "fgsm_noise",
  label: "FGSM Noise",
  description: "Per-pixel sign-banded perturbation field mimicking FGSM/PGD adversarial noise.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    const offX = rng.random(1000);
    const offY = rng.random(1000);
    const offX2 = rng.random(1000);
    const offY2 = rng.random(1000);

    const baseScale = 0.0025 + (1 - params.scale) * 0.012;
    const hfScale = 0.08 + params.frequency * 0.55;
    const epsilon = 50 + params.density * 170;

    // Block-quantized sampling (perturbation "epsilon ball" reads as discrete cells,
    // and it keeps the per-pixel noise() call count tractable at export resolution).
    const blockPxNative = 3 + Math.round((1 - params.frequency) * 9);
    const blockPx = Math.max(1, Math.round(blockPxNative * (size / 800)));

    const posHue = params.accentHue;
    const negHue = (params.accentHue + 180) % 360;

    for (let by = 0; by < size; by += blockPx) {
      for (let bx = 0; bx < size; bx += blockPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        const base = rng.noise(sx * baseScale + offX, sy * baseScale + offY);
        const baseBri = 15 + base * 55;

        const hn = rng.noise(sx * hfScale + offX2, sy * hfScale + offY2);
        const sign = hn > 0.5 ? 1 : -1;
        const mag = Math.abs(hn - 0.5) * 2; // 0-1

        const bri = Math.min(100, baseBri + mag * (epsilon / 255) * 100);
        const sat = 55 + mag * 45;
        const hue = sign > 0 ? posHue : negHue;

        const [r, g, b] = hsbToRgb(hue, sat, bri);

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
