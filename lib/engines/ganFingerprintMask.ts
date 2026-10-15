import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Mimics the periodic checkerboard artifact left by transposed-convolution
 * ("deconv") upsampling in GAN generators: a fine, regular grid of
 * alternating brightness cells, with the alternation period/phase subtly
 * modulated by block-quantized seeded noise (one noise() sample per block,
 * not per pixel) so the grid isn't perfectly uniform, layered over a faint
 * low-frequency base gradient so it reads as an overlay artifact on top of
 * an underlying "image" rather than pure noise.
 */
export const ganFingerprintMask: RenderEngine = {
  id: "gan_fingerprint_mask",
  label: "GAN Fingerprint Mask",
  description:
    "Periodic high-frequency grid noise mimicking GAN upsampling checkerboard artifacts, to confuse AI-generated-image detectors.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    // Checkerboard cell pitch: 4-16px at native 800px cadence, driven by frequency
    // (higher frequency => finer/tighter checkerboard, mimicking a smaller deconv stride).
    const cellPxNative = 16 - Math.round(params.frequency * 12); // 16..4
    const cellPx = Math.max(1, Math.round(cellPxNative * (size / 800)));

    // Low-frequency base gradient offsets/scale, so the checkerboard reads as an
    // overlay artifact on top of a faint underlying "image" gradient.
    const baseOffX = rng.random(1000);
    const baseOffY = rng.random(1000);
    const baseScale = 0.002 + (1 - params.scale) * 0.01;

    // Per-block modulation noise offsets (modulates alternation phase/strength).
    const modOffX = rng.random(1000);
    const modOffY = rng.random(1000);
    const modScale = 0.05 + params.scale * 0.2;

    const amp = 15 + params.density * 55; // checkerboard contrast amplitude
    const hue = params.accentHue;

    for (let by = 0; by < size; by += cellPx) {
      for (let bx = 0; bx < size; bx += cellPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        // Faint low-frequency base gradient underneath the artifact.
        const base = rng.noise(sx * baseScale + baseOffX, sy * baseScale + baseOffY);
        const baseBri = 35 + base * 30;

        // One noise sample per block to modulate the checkerboard phase/period,
        // mimicking imperfect, slightly jittered transposed-convolution tiling.
        const mod = rng.noise(sx * modScale + modOffX, sy * modScale + modOffY);
        const phaseJitter = mod > 0.5 ? 1 : 0;

        // Regular grid parity, with the modulated phase occasionally flipping a cell
        // to break up a perfectly uniform checkerboard.
        const gridX = Math.round(bx / cellPx);
        const gridY = Math.round(by / cellPx);
        let parity = (gridX + gridY) % 2;
        if (mod > 0.85 || mod < 0.15) parity ^= phaseJitter;

        const sign = parity === 0 ? 1 : -1;
        const strength = 0.55 + mod * 0.45; // 0.55-1.0, keeps full grid visible but uneven

        const bri = Math.max(0, Math.min(100, baseBri + sign * amp * strength));
        const sat = 20 + mod * 35;

        const [r, g, b] = hsbToRgb(hue, sat, bri);

        const yEnd = Math.min(size, by + cellPx);
        const xEnd = Math.min(size, bx + cellPx);
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
