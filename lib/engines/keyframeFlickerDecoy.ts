import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Divides the frame into horizontal bands and alternates each band between
 * two distinct "codec quality" regimes: "I-frame" bands get dense,
 * block-quantized high-frequency noise (sharp, independently-seeded detail
 * per small cell, like a freshly re-encoded keyframe), while "P-frame" bands
 * get a smooth, low-frequency gradient (coarse Perlin noise, like a
 * motion-compensated predicted frame leaning on the previous keyframe
 * instead of carrying real detail). A sharp 1-2px seam line is drawn at
 * every band boundary to make the quality flicker boundary itself visible,
 * rather than letting the bands blend — this is the exact signal a
 * keyframe-boundary-based tamper detector keys off of, so flickering it
 * with no real re-encode behind it is meant to produce false boundary
 * detections.
 */
export const keyframeFlickerDecoy: RenderEngine = {
  id: "keyframe_flicker_decoy",
  label: "Keyframe Flicker Decoy",
  description: "Alternating high/low-detail horizontal bands mimicking I-frame-vs-P-frame quality flicker, confusing keyframe-boundary-based tamper detectors.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.fillStyle = "rgb(14, 14, 16)";
    ctx.fillRect(0, 0, size, size);

    const coordScale = size / 1024; // native layout at 1024px cadence

    // Scale slider: band height. Bigger scale -> taller bands, fewer
    // flicker transitions; smaller scale -> many thin alternating bands.
    const bandNative = 36 + (1 - params.scale) * 140; // ~36-176px native, inverted so low scale = more flicker
    const band = Math.max(6, bandNative * coordScale);
    const bandCount = Math.max(1, Math.ceil(size / band));

    // Frequency slider: cell pitch inside high-detail bands and noise
    // sampling frequency inside low-detail bands.
    const hiCellNative = 3 + (1 - params.frequency) * 13; // ~3-16px native
    const hiCell = Math.max(2, hiCellNative * coordScale);
    const loFreq = 0.6 + params.frequency * 2.4; // Perlin sampling frequency for the smooth bands

    // Density slider: how saturated/contrasty the high-detail bands read,
    // plus how many stray seam "glitch" ticks appear on boundaries.
    const hiContrast = 40 + params.density * 110; // luma swing inside I-frame bands
    const seamGlitchProb = 0.15 + params.density * 0.35;

    const accentColor = hsb(params.accentHue, 60, 95);

    for (let b = 0; b < bandCount; b++) {
      const y0 = b * band;
      const h = Math.min(band, size - y0);
      if (h <= 0) continue;

      const isHiDetail = b % 2 === 0;
      // Per-band seed offset keeps each band's internal pattern distinct
      // and reproducible without re-seeding the whole Rng.
      const bandSeedX = b * 97.531;

      if (isHiDetail) {
        // "I-frame": dense block-quantized high-frequency noise, every cell
        // independently sampled for a sharp, detail-rich look.
        const cols = Math.max(1, Math.ceil(size / hiCell));
        const rows = Math.max(1, Math.ceil(h / hiCell));
        for (let r = 0; r < rows; r++) {
          const cy = y0 + r * hiCell;
          const ch = Math.min(hiCell, y0 + h - cy);
          if (ch <= 0) continue;
          for (let c = 0; c < cols; c++) {
            const cx = c * hiCell;
            const cw = Math.min(hiCell, size - cx);
            if (cw <= 0) continue;

            const n = rng.noise(bandSeedX + c * 0.9, r * 0.9);
            const luma = 70 + (n - 0.5) * hiContrast;
            const useAccent = rng.random() < 0.04 + params.density * 0.05;
            ctx.fillStyle = useAccent ? accentColor : `rgb(${luma}, ${luma}, ${luma})`;
            ctx.globalAlpha = useAccent ? 0.45 : 1;
            ctx.fillRect(cx, cy, cw, ch);
            ctx.globalAlpha = 1;
          }
        }
      } else {
        // "P-frame": smooth low-frequency gradient sampled coarsely,
        // mimicking a motion-compensated prediction with little new detail.
        const steps = 24;
        const stepW = size / steps;
        for (let s = 0; s < steps; s++) {
          const sx = s * stepW;
          const n = rng.noise(bandSeedX + s * loFreq * 0.08, 0.5);
          const luma = 34 + n * 60;
          ctx.fillStyle = `rgb(${luma}, ${luma}, ${luma + 4})`;
          ctx.fillRect(sx, y0, stepW + 1, h);
        }
      }

      // Sharp seam line at the top boundary of this band (skip the very
      // first band's top edge, which is just the canvas edge).
      if (b > 0) {
        const bright = rng.random() < 0.5;
        ctx.strokeStyle = bright ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.45)";
        ctx.lineWidth = Math.max(1, (1 + rng.random()) * coordScale);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(size, y0);
        ctx.stroke();

        // Sparse seam "glitch" ticks: short bright accent dashes straddling
        // the boundary, implying a false keyframe-boundary detection.
        const tickCount = Math.floor(4 + params.density * 10);
        for (let t = 0; t < tickCount; t++) {
          if (rng.random() >= seamGlitchProb) continue;
          const tx = rng.random(0, size);
          const tw = 4 + rng.random() * 18 * coordScale;
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = Math.max(1, 1.5 * coordScale);
          ctx.beginPath();
          ctx.moveTo(tx, y0 - 2 * coordScale);
          ctx.lineTo(tx + tw, y0 + 2 * coordScale);
          ctx.stroke();
        }
      }
    }
  },
};
