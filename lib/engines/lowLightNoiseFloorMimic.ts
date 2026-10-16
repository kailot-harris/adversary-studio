import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Mimics a high-ISO low-light photograph: a dim, low-contrast scene with a
 * faint subject silhouette, overlaid with fine block-quantized grain tuned
 * to resemble real sensor noise-floor statistics. The whole point is that
 * the subject's edge contrast is deliberately kept just barely above the
 * ambient grain amplitude, so a noise-reduction-assisted detector that
 * thresholds against "expected" low-light noise levels sees the subject's
 * edges as part of the noise floor rather than as a distinct contour.
 */
export const lowLightNoiseFloorMimic: RenderEngine = {
  id: "low_light_noise_floor_mimic",
  label: "Low-Light Noise Floor Mimic",
  description:
    "Fine seeded grain mimicking high-ISO sensor noise-floor statistics, blending subject edges into expected low-light noise to defeat noise-reduction-assisted detection.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    // --- Faint subject silhouette geometry (seeded blob) -----------------
    const cx = size * (0.4 + rng.random(0.2)); // 0.4-0.6
    const cy = size * (0.45 + rng.random(0.15)); // 0.45-0.6
    const baseRadius = size * (0.14 + params.scale * 0.12); // 0.14-0.26
    const lobes = 5 + Math.round(rng.random(4)); // 5-8 seeded wobble lobes
    const lobeOffsets: number[] = [];
    for (let i = 0; i < lobes; i++) lobeOffsets.push(rng.random(0, Math.PI * 2));
    const wobbleAmp = 0.12 + rng.random(0.1);

    function silhouetteRadiusAt(angle: number): number {
      let r = baseRadius;
      for (let i = 0; i < lobes; i++) {
        r += baseRadius * wobbleAmp * Math.sin(angle * (i + 2) + lobeOffsets[i]) * 0.3;
      }
      return r;
    }

    // --- Ambient low-light scene: very dim, very low contrast -----------
    const ambientBase = 4 + params.density * 4; // 4-8 brightness, near-black
    const ambientVarAmp = 3 + params.frequency * 2; // slow low-freq luminance drift
    const ambientOffX = rng.random(1000);
    const ambientOffY = rng.random(1000);
    const ambientScale = 0.0015 + (1 - params.scale) * 0.003;

    // Subject brightness is only marginally above ambient — the whole
    // premise of this engine is a razor-thin edge-to-noise-floor margin.
    const subjectBase = ambientBase + 3 + params.density * 2; // ambient + 3..9

    // --- Grain field: block-quantized high-ISO noise --------------------
    // Fine blocks (high-ISO sensor noise is spatially small-scale), with
    // low per-channel amplitude so it reads as realistic sensor noise
    // rather than loud static.
    const blockPxNative = 3 - Math.round(params.frequency); // 2..3
    const blockPx = Math.max(1, Math.round(blockPxNative * (size / 800)));

    const grainOffR = rng.random(1000);
    const grainOffG = rng.random(1000);
    const grainOffB = rng.random(1000);
    const grainScale = 0.5 + params.scale * 0.6; // fine noise lattice
    // Grain amplitude is deliberately tuned to sit just under / around the
    // subject's edge contrast, so the edge barely clears the noise floor.
    const grainAmp = 6 + params.density * 5; // 6-11

    const hue = params.accentHue;
    const sat = 4 + params.frequency * 6; // near-desaturated, as real low-light sensor noise is mostly luminance

    for (let by = 0; by < size; by += blockPx) {
      for (let bx = 0; bx < size; bx += blockPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        // Ambient scene brightness: slow drifting low-contrast base.
        const ambientNoise = rng.noise(sx * ambientScale + ambientOffX, sy * ambientScale + ambientOffY);
        const ambientBri = ambientBase + (ambientNoise - 0.5) * ambientVarAmp;

        // Subject silhouette test (block-center sample).
        const dx = bx + blockPx * 0.5 - cx;
        const dy = by + blockPx * 0.5 - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const inSubject = dist <= silhouetteRadiusAt(angle);

        let bri = inSubject ? subjectBase : ambientBri;

        // Fine block-quantized grain, independently sampled per channel so
        // the noise reads as sensor-chroma-noise rather than a single
        // shared luminance field.
        const gR = rng.noise(sx * grainScale + grainOffR, sy * grainScale + grainOffR * 0.5) - 0.5;
        const gG = rng.noise(sx * grainScale + grainOffG, sy * grainScale + grainOffG * 0.5) - 0.5;
        const gB = rng.noise(sx * grainScale + grainOffB, sy * grainScale + grainOffB * 0.5) - 0.5;

        const briR = Math.max(0, Math.min(100, bri + gR * grainAmp));
        const briG = Math.max(0, Math.min(100, bri + gG * grainAmp));
        const briB = Math.max(0, Math.min(100, bri + gB * grainAmp));

        // Build the pixel from the averaged brightness plus a small
        // per-channel delta derived from the independent grain samples,
        // so chroma noise is present but subtle.
        const briAvg = (briR + briG + briB) / 3;
        const [r0, g0, b0] = hsbToRgb(hue, sat, briAvg);
        const chromaJitter = 1 + params.density * 2;
        const r = Math.max(0, Math.min(255, r0 + (briR - briAvg) * chromaJitter));
        const g = Math.max(0, Math.min(255, g0 + (briG - briAvg) * chromaJitter));
        const b = Math.max(0, Math.min(255, b0 + (briB - briAvg) * chromaJitter));

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
