import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Mimics coarse-scale sign-based gradient attacks (FGSM-style "add
 * epsilon * sign(gradient)" perturbations) by rendering a blocky mosaic:
 * a smooth low-frequency base gradient field (standing in for an underlying
 * "image") is sampled once per NxN block and perturbed by a flat +/- tone
 * whose sign comes from a coarser second noise field (the "gradient sign
 * map"). Because real sign-based attacks are binary per pixel but typically
 * computed/visualized at a coarser cell granularity, each block gets exactly
 * one noise sample and one sign decision, then is filled as a single flat
 * tone — never per-pixel noise.
 */
export const gradientSignMosaic: RenderEngine = {
  id: "gradient_sign_mosaic",
  label: "Gradient Sign Mosaic",
  description:
    "Blocky sign-flipped gradient mosaic mimicking coarse-scale sign-based gradient attacks (FGSM-style perturbations).",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    // Block pitch: 10-40px at native 800px cadence, driven by scale
    // (larger scale => coarser, chunkier sign-flip cells).
    const blockPxNative = 10 + Math.round(params.scale * 30); // 10..40
    const blockPx = Math.max(1, Math.round(blockPxNative * (size / 800)));

    // Low-frequency base gradient field (the stand-in "image" being attacked).
    const baseOffX = rng.random(1000);
    const baseOffY = rng.random(1000);
    const baseScale = 0.0015 + (1 - params.scale) * 0.004;

    // Coarser "gradient sign" field: its own independent noise offsets/frequency,
    // driven by `frequency` (higher frequency => more, smaller sign-flip clusters).
    const signOffX = rng.random(1000);
    const signOffY = rng.random(1000);
    const signScale = 0.01 + params.frequency * 0.08;

    // Perturbation magnitude (epsilon) and how much of the canvas gets flipped.
    const epsilon = 18 + params.density * 70; // 18-88 brightness units
    const flipThreshold = 0.5; // sign(gradient) split point

    const hue = params.accentHue;

    for (let by = 0; by < size; by += blockPx) {
      for (let bx = 0; bx < size; bx += blockPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        // One noise sample per block for the base "image" brightness.
        const base = rng.noise(sx * baseScale + baseOffX, sy * baseScale + baseOffY);
        const baseBri = 30 + base * 40;

        // One noise sample per block for the coarse gradient-sign map.
        const signSample = rng.noise(sx * signScale + signOffX, sy * signScale + signOffY);
        const sign = signSample >= flipThreshold ? 1 : -1;

        // Strength varies slightly with how far the sign sample is from the
        // flip threshold, so flipped regions aren't perfectly uniform.
        const strength = 0.6 + Math.abs(signSample - flipThreshold) * 0.8;

        const bri = Math.max(0, Math.min(100, baseBri + sign * epsilon * strength));
        const sat = sign > 0 ? 25 + strength * 35 : 10 + strength * 15;

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
