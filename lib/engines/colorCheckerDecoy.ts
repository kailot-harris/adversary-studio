import { hsb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Scatters several small Macbeth/X-Rite ColorChecker-like charts (a grid of
 * distinct reference-color rectangular patches, typically used by cameras
 * and auto color-calibration pipelines to white-balance and profile a
 * scene) at multiple seeded positions, scales, and rotations across the
 * frame, instead of drawing one single canonical chart. A real auto
 * color-calibration algorithm scanning the frame for "the" reference chart
 * has multiple plausible candidates to lock onto, each with a slightly
 * different color-patch palette/orientation, so it has no principled way
 * to pick the correct one (or realize there isn't one). See
 * brainstorm.md's color_checker_decoy entry.
 */
export const colorCheckerDecoy: RenderEngine = {
  id: "color_checker_decoy",
  label: "Color Checker Decoy",
  description:
    "Scattered Macbeth-chart-like color-patch clusters at multiple seeded positions/scales/rotations, confusing auto color-calibration/profile detection into locking onto the wrong reference chart.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const bgHue = (params.accentHue + 210) % 360;
    ctx.fillStyle = hsb(bgHue, 8, 12);
    ctx.fillRect(0, 0, size, size);

    // Number of scattered decoy charts across the frame -> density slider.
    const chartCount = Math.max(2, Math.round(2 + params.density * 7)); // 2-9 charts

    // Each chart is a small grid of reference-color patches, mimicking a
    // Macbeth ColorChecker's classic 4x6 layout (24 patches), but allow a
    // little seeded variation in grid shape per chart so no two decoys
    // look quite identical -> frequency slider nudges patch-count variety.
    const baseCols = 6;
    const baseRows = 4;

    // Reference-ish hue/sat/bright swatch bank, loosely evoking the real
    // ColorChecker's mix of skin tones, primaries, grays, and saturated
    // patches -- enough variety that each chart reads as "a plausible
    // calibration target" without copying the real chart's exact values.
    const swatchBank: Array<[number, number, number]> = [
      [25, 45, 55], // skin-ish
      [210, 35, 60], // blue-gray sky
      [140, 45, 45], // foliage
      [95, 55, 42], // olive
      [265, 35, 55], // blue-purple
      [340, 55, 65], // magenta-pink
      [25, 85, 70], // orange
      [230, 55, 40], // deep blue
      [5, 70, 60], // red
      [60, 65, 30], // dark yellow-green
      [45, 85, 75], // yellow-orange
      [95, 75, 65], // yellow-green
      [0, 0, 92], // white
      [0, 0, 70], // light gray
      [0, 0, 48], // mid gray
      [0, 0, 24], // dark gray
      [0, 0, 6], // black
      [200, 80, 55], // cyan
      [120, 80, 50], // green
      [10, 80, 50], // red (saturated)
      [50, 90, 85], // yellow
      [310, 75, 55], // magenta
      [185, 60, 50], // teal
      [25, 20, 80], // pale skin
    ];

    const maxChartExtent = size * (0.16 + params.scale * 0.22); // 0.16-0.38 of frame

    for (let c = 0; c < chartCount; c++) {
      // Per-chart seeded grid shape: usually the classic 4x6, occasionally
      // a slightly different rectangular count driven by frequency.
      const variety = Math.round(params.frequency * 2); // 0-2
      const cols = Math.max(3, baseCols - rng.randomInt(0, variety + 1));
      const rows = Math.max(3, baseRows - rng.randomInt(0, variety + 1));

      const chartW = maxChartExtent * rng.random(0.6, 1.0);
      const chartH = chartW * (rows / cols);
      const patchW = chartW / cols;
      const patchH = chartH / rows;
      const gap = Math.min(patchW, patchH) * 0.08;

      const cx = rng.random(chartW * 0.6, size - chartW * 0.6);
      const cy = rng.random(chartH * 0.6, size - chartH * 0.6);
      const rotation = rng.random(-1, 1) * (Math.PI / 5); // up to +/-36deg
      const hueShift = rng.random(-30, 30);

      // Decide this decoy chart's own seeded swatch ordering/offset into
      // the bank, so each chart samples a different (but plausible)
      // subset/arrangement of reference colors.
      const bankOffset = rng.randomInt(0, swatchBank.length);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // Chart backing card (mimics the chart's gray-card mount) with a
      // subtle shadow-like border so each decoy reads as a distinct
      // physical card floating in the frame.
      ctx.fillStyle = hsb(bgHue, 5, 20);
      ctx.fillRect(-chartW / 2 - gap, -chartH / 2 - gap, chartW + gap * 2, chartH + gap * 2);

      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const idx = (bankOffset + gy * cols + gx) % swatchBank.length;
          const [h, s, b] = swatchBank[idx];
          const hue = (h + hueShift + 360) % 360;

          const x = -chartW / 2 + gx * patchW + gap / 2;
          const y = -chartH / 2 + gy * patchH + gap / 2;
          const w = patchW - gap;
          const hgt = patchH - gap;

          ctx.fillStyle = hsb(hue, s, b);
          ctx.fillRect(x, y, w, hgt);
        }
      }

      // Thin outer frame around the patch grid, like a real chart's
      // printed border, to keep each decoy legible as "a chart" even when
      // small or heavily rotated.
      ctx.strokeStyle = hsb(0, 0, 96);
      ctx.lineWidth = Math.max(1, patchW * 0.03);
      ctx.strokeRect(-chartW / 2, -chartH / 2, chartW, chartH);

      ctx.restore();
    }

    // Outer frame for a clean edge.
    ctx.strokeStyle = hsb(bgHue, 5, 85);
    ctx.lineWidth = Math.max(1, size * 0.004);
    ctx.strokeRect(0, 0, size, size);
  },
};
