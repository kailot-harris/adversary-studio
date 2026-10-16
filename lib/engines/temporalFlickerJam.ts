import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * A single static frame standing in for rapid temporal flicker: fine
 * alternating horizontal bands, each independently seeded with its own
 * brightness/contrast jump, rather than a smooth gradient. The idea is to
 * mimic what a video would look like sampled mid-flicker (e.g. a strobing
 * light, a bad rolling-refresh panel, or a deliberately jittered exposure) —
 * a motion-based change detector watching consecutive frames of *this*
 * pattern flickering would see large frame-to-frame luma deltas everywhere,
 * even though nothing in the scene actually moved. Since this is one frame,
 * the "temporal" flicker is encoded spatially as sharp, high-frequency
 * banding instead of a time axis.
 */
export const temporalFlickerJam: RenderEngine = {
  id: "temporal_flicker_jam",
  label: "Temporal Flicker Jam",
  description: "Seeded brightness/contrast banding mimicking rapid temporal flicker, defeating motion-based change detectors.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.fillStyle = "rgb(16, 16, 18)";
    ctx.fillRect(0, 0, size, size);

    const coordScale = size / 1024; // native layout at 1024px cadence

    // Frequency slider: band pitch. High frequency -> thin bands, dense
    // scan-line-like flicker; low frequency -> fewer, taller bands.
    const bandNative = 2 + (1 - params.frequency) * 22; // ~2-24px native band height
    const band = Math.max(1, bandNative * coordScale);
    const bandCount = Math.max(1, Math.ceil(size / band));

    // Density slider: fraction of bands that actually carry a flicker jump
    // vs. sit flat/neutral (so at low density, most of the frame reads as
    // calm, with sparse flicker bursts; at high density nearly every band
    // flickers).
    const flickerProb = 0.15 + params.density * 0.8;

    // Scale slider: magnitude of each band's brightness/contrast jump.
    const brightnessSwing = 20 + params.scale * 110; // +/- luma offset
    const contrastSwing = 0.5 + params.scale * 1.8; // contrast multiplier range

    const baseLuma = 72;
    const accentColor = hsb(params.accentHue, 70, 95);

    // Sparse accent-hued "hot flicker" bands make the jump itself legible
    // as an intentional pattern rather than plain noise.
    const accentProb = 0.03 + params.density * 0.08;

    for (let b = 0; b < bandCount; b++) {
      const y0 = b * band;
      const h = Math.min(band, size - y0);
      if (h <= 0) continue;

      const isFlicker = rng.random() < flickerProb;

      if (!isFlicker) {
        // Flat/neutral band: calm, low-contrast fill.
        const n = rng.noise(b * 0.05, 0.5);
        const luma = Math.round(baseLuma + (n - 0.5) * 16);
        ctx.fillStyle = `rgb(${luma}, ${luma}, ${luma + 2})`;
        ctx.fillRect(0, y0, size, h);
        continue;
      }

      // Flicker band: pick a seeded per-band brightness offset and contrast
      // multiplier, applied as a sharp step (no gradient) across the full
      // band width, then split into a few sub-segments so the jump itself
      // has some horizontal high-frequency structure rather than reading as
      // a single flat color bar.
      const dir = rng.random() < 0.5 ? -1 : 1;
      const offset = dir * (brightnessSwing * (0.4 + rng.random() * 0.6));
      const contrast = contrastSwing * (0.5 + rng.random() * 0.5);

      const useAccent = rng.random() < accentProb;

      const segCount = Math.max(1, Math.round(4 + rng.random() * 10));
      const segW = size / segCount;
      for (let s = 0; s < segCount; s++) {
        const sx = s * segW;
        const jitter = (rng.random() - 0.5) * 14;
        let luma = baseLuma + offset + jitter;
        luma = (luma - 128) * contrast + 128;
        luma = Math.min(255, Math.max(0, Math.round(luma)));

        if (useAccent && rng.random() < 0.4) {
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = 0.5 + rng.random() * 0.35;
        } else {
          ctx.fillStyle = `rgb(${luma}, ${luma}, ${luma})`;
          ctx.globalAlpha = 1;
        }
        ctx.fillRect(sx, y0, segW + 1, h);
      }
      ctx.globalAlpha = 1;

      // Thin sharp seam at the band's leading edge to keep the transition a
      // hard cut rather than letting adjacent bands visually blend.
      ctx.strokeStyle = offset > 0 ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.45)";
      ctx.lineWidth = Math.max(1, coordScale);
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(size, y0);
      ctx.stroke();
    }
  },
};
