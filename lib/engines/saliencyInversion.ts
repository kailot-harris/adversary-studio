import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a synthetic "inverted" saliency map: a soft, wobbly-bordered
 * foreground silhouette filled with calm, low-frequency, low-contrast
 * texture (standing in for a region a saliency model should ignore),
 * surrounded by a dense, high-frequency, high-contrast speckle field in a
 * hot hue (standing in for background noise engineered to out-score the
 * subject on an attention/saliency heatmap). A thin accent ring traces the
 * boundary where the inversion "seam" sits.
 */
export const saliencyInversion: RenderEngine = {
  id: "saliency_inversion",
  label: "Saliency Inversion",
  description: "High-frequency hot textures pushing background saliency above the foreground subject.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    const offX = rng.random(1000);
    const offY = rng.random(1000);
    const offX2 = rng.random(1000);
    const offY2 = rng.random(1000);
    const offFg = rng.random(1000);
    const offBoundary = rng.random(1000);

    const cx = size / 2;
    const cy = size / 2;

    // Foreground "subject" silhouette: a wobbly blob whose boundary flexes
    // with a noise-perturbed radius so the mask reads as organic, not a
    // perfect circle.
    const baseRadius = size * (0.18 + params.scale * 0.22);
    const wobbleAmp = size * (0.03 + params.frequency * 0.05);
    const wobbleFreq = 1.5 + params.frequency * 3;
    const ringWidth = size * (0.004 + params.scale * 0.006);

    // Foreground: calm, low-frequency, low-contrast texture (low saliency).
    const lfScale = 0.004 + (1 - params.scale) * 0.01;

    // Background: dense, high-frequency, high-contrast speckle (high saliency).
    const hfScale = 0.06 + params.frequency * 0.55;
    const hfScale2 = hfScale * 2.3;

    const hotHue = params.accentHue;
    const coldHue = (params.accentHue + 160) % 360;

    // Block-quantized sampling keeps the per-pixel noise() call count
    // tractable at export resolution while still reading as a fine, busy
    // texture field.
    const blockPxNative = 2 + Math.round((1 - params.frequency) * 6);
    const blockPx = Math.max(1, Math.round(blockPxNative * (size / 800)));

    for (let by = 0; by < size; by += blockPx) {
      for (let bx = 0; bx < size; bx += blockPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        const dx = bx - cx;
        const dy = by - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const theta = Math.atan2(dy, dx);

        const boundaryN = rng.noise(
          Math.cos(theta) * wobbleFreq + offBoundary,
          Math.sin(theta) * wobbleFreq + offBoundary
        );
        const edgeR = baseRadius + (boundaryN * 2 - 1) * wobbleAmp;

        let r: number, g: number, b: number;

        if (dist < edgeR) {
          // Foreground: smooth, desaturated, low-variance fill.
          const n = rng.noise(sx * lfScale + offFg, sy * lfScale + offFg);
          const bri = 22 + n * 22;
          const sat = 25 + n * 20;
          [r, g, b] = hsbToRgb(coldHue, sat, bri);
        } else {
          // Background: dense high-frequency speckle, sharpened by a second
          // noise octave so density controls how much of the field ignites.
          const n = rng.noise(sx * hfScale + offX, sy * hfScale + offY);
          const n2 = rng.noise(sx * hfScale2 + offX2, sy * hfScale2 + offY2);
          const dropout = n2 < 0.5 - params.density * 0.4;
          const mag = dropout ? n * 0.35 : n;
          const bri = 45 + mag * 55;
          const sat = 60 + mag * 40;
          [r, g, b] = hsbToRgb(hotHue, sat, bri);
        }

        // Accent ring tracing the inversion seam itself.
        if (Math.abs(dist - edgeR) < ringWidth) {
          [r, g, b] = hsbToRgb(hotHue, 90, 95);
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
