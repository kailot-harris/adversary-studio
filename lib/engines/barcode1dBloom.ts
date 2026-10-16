import { hsb, hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Scatters several seeded "barcode cluster" rectangles across the frame,
 * each a run of black-and-white vertical bars whose widths follow a
 * quiet-zone / guard-pattern / digit-group structure reminiscent of a
 * 1D UPC/EAN barcode's bar-width ratios (narrow/medium/wide bars grouped
 * into digit-like clusters, bracketed by wider quiet-zone gaps) — without
 * ever encoding a real, decodable payload. Clusters vary in scale,
 * rotation, and bar pitch so the structural resemblance repeats at
 * different sizes across the canvas, enough to risk a false
 * barcode-decoder lock on a naive 1D scanline decoder.
 */
export const barcode1dBloom: RenderEngine = {
  id: "barcode_1d_bloom",
  label: "Barcode 1D Bloom",
  description:
    "Repeating bar-width noise mimicking UPC/EAN barcode structure to trigger false barcode-decoder locks.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.save();
    ctx.fillStyle = hsb(0, 0, 8);
    ctx.fillRect(0, 0, size, size);

    // Discrete bar-width "modules" a real 1D barcode is built from: narrow,
    // medium, wide — in a roughly 1:2:3 ratio like UPC-A's bar encoding.
    const unitModules = [1, 2, 3];

    // Number of barcode clusters scattered across the frame.
    const clusterCount = Math.max(3, Math.round(4 + params.density * 22));

    for (let c = 0; c < clusterCount; c++) {
      const cx = rng.random(size);
      const cy = rng.random(size);

      // This cluster's module (bar unit) width, driven by params.scale and
      // params.frequency, with per-cluster seeded jitter so repeats aren't
      // identical.
      const baseUnit = 1.5 + params.scale * 6 + rng.random(-0.6, 0.6);
      const unit = Math.max(0.8, baseUnit * (0.6 + (1 - params.frequency) * 0.8));

      // How many digit-groups (runs of bars between guard patterns) this
      // cluster contains.
      const groupCount = 2 + rng.randomInt(0, 4);
      const barsPerDigit = 4;

      // Pre-roll every bar's width/color for this cluster so the total
      // pixel width is known before drawing, letting the cluster be
      // centered on (cx, cy) like a real barcode symbol.
      type Bar = { widthUnits: number; isBlack: boolean };
      const bars: Bar[] = [];
      const pushBar = (widthUnits: number, isBlack: boolean) => bars.push({ widthUnits, isBlack });

      // Leading quiet zone (blank margin) + leading guard pattern ("101").
      pushBar(7, false);
      pushBar(1, true);
      pushBar(1, false);
      pushBar(1, true);

      for (let g = 0; g < groupCount; g++) {
        for (let b = 0; b < barsPerDigit; b++) {
          const w = unitModules[rng.randomInt(0, unitModules.length)];
          pushBar(w, b % 2 === 0);
        }
        // Center guard pattern between digit groups ("01010"), like a
        // UPC symbol's middle guard.
        if (g === Math.floor(groupCount / 2) - 1) {
          pushBar(1, false);
          pushBar(1, true);
          pushBar(1, false);
          pushBar(1, true);
          pushBar(1, false);
        }
      }

      // Trailing guard pattern + trailing quiet zone.
      pushBar(1, true);
      pushBar(1, false);
      pushBar(1, true);
      pushBar(7, false);

      const totalWidth = bars.reduce((sum, bar) => sum + bar.widthUnits * unit, 0);
      const barHeight = Math.max(18, size * (0.06 + params.scale * 0.22) * rng.random(0.7, 1.3));
      const rotation = rng.random(-1, 1) * Math.PI * (0.15 + params.frequency * 0.35);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      let xCursor = -totalWidth / 2;
      for (const bar of bars) {
        const w = bar.widthUnits * unit;
        if (bar.isBlack) {
          ctx.fillStyle = hsb(0, 0, 4 + rng.random(0, 4));
          ctx.fillRect(xCursor, -barHeight / 2, w, barHeight);
        }
        xCursor += w;
      }

      ctx.restore();
    }

    // Faint accent-hued scanline glow across a few horizontal bands, nodding
    // to a laser barcode scanner's sweep without obscuring the bar pattern.
    const scanlineCount = Math.max(1, Math.round(2 + params.frequency * 6));
    const [ar, ag, ab] = hsbToRgb(params.accentHue, 70, 55);
    for (let i = 0; i < scanlineCount; i++) {
      const y = rng.random(size);
      const h = Math.max(1, size * 0.004 * rng.random(0.5, 1.5));
      ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, 0.12)`;
      ctx.fillRect(0, y - h / 2, size, h);
    }

    ctx.restore();
  },
};
