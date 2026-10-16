import { hsb, hsbToRgb, rgba } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a faint plain background overlaid with a seeded grid of thin
 * ruled horizontal/vertical lines at irregular row/column spacing — mimicking
 * the roughly-aligned-but-imperfect ruled-line pattern that document-layout
 * table-detection models key off of, even though no real tabular content
 * exists underneath. A handful of seeded "cell" rectangles with faint
 * borders are scattered on top to further imply a real table structure.
 */
export const tableGridMimic: RenderEngine = {
  id: "table_grid_mimic",
  label: "Table Grid Mimic",
  description:
    "Faint ruled-line/grid overlay with irregular row/column spacing mimicking table-detection line patterns.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Faint plain background — the "non-tabular content" the overlay sits on top of.
    const bgBrightness = 92;
    ctx.fillStyle = hsb((params.accentHue + 200) % 360, 4, bgBrightness);
    ctx.fillRect(0, 0, size, size);

    // A very faint low-frequency tint wash so it doesn't read as pure flat paper.
    const washHue = (params.accentHue + 200) % 360;
    const [washR, washG, washB] = hsbToRgb(washHue, 10, 60);
    ctx.fillStyle = rgba(washR, washG, washB, 0.04);
    ctx.fillRect(0, 0, size, size);

    // Density slider: how many ruled rows/columns the grid tries to lay down.
    const targetCols = Math.round(5 + params.density * 14); // 5..19
    const targetRows = Math.round(5 + params.density * 14);

    // Frequency slider: how irregular the row/column spacing is (jitter amount).
    const jitterFrac = 0.12 + params.frequency * 0.45; // fraction of average cell size

    // Scale slider: overall line weight / margin breathing room.
    const margin = (28 + params.scale * 40) * coordScale;
    const lineWeight = (0.6 + params.scale * 1.1) * coordScale;

    const innerSize = size - margin * 2;

    // Build irregular column x-positions: start from uniform spacing, then
    // perturb each interior divider independently (seeded), re-sorted so
    // lines never cross, mimicking a real-but-imperfect ruled table.
    const colPositions = buildRuledPositions(rng, targetCols, innerSize, jitterFrac).map(
      (v) => v + margin
    );
    const rowPositions = buildRuledPositions(rng, targetRows, innerSize, jitterFrac).map(
      (v) => v + margin
    );

    const lineHue = (params.accentHue + 210) % 360;
    const lineColor = hsb(lineHue, 12, 30);

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = lineColor;

    // Horizontal ruled lines.
    for (const y of rowPositions) {
      ctx.lineWidth = lineWeight * (0.7 + rng.random() * 0.6);
      ctx.beginPath();
      ctx.moveTo(margin * 0.4, y);
      ctx.lineTo(size - margin * 0.4, y);
      ctx.stroke();
    }

    // Vertical ruled lines.
    for (const x of colPositions) {
      ctx.lineWidth = lineWeight * (0.7 + rng.random() * 0.6);
      ctx.beginPath();
      ctx.moveTo(x, margin * 0.4);
      ctx.lineTo(x, size - margin * 0.4);
      ctx.stroke();
    }
    ctx.restore();

    // Seeded "cell" rectangles: a sparse handful of grid cells get an extra,
    // slightly bolder faint border drawn on top, implying detected table
    // cells rather than a uniform ruled sheet.
    const cellCount = Math.round(3 + params.density * 9); // 3..12
    const accentColor = hsb(params.accentHue, 55, 65);

    ctx.save();
    for (let i = 0; i < cellCount; i++) {
      const colIdx = rng.randomInt(0, colPositions.length - 1);
      const rowIdx = rng.randomInt(0, rowPositions.length - 1);
      if (colIdx >= colPositions.length - 1 || rowIdx >= rowPositions.length - 1) continue;

      const x0 = colPositions[colIdx];
      const x1 = colPositions[colIdx + 1];
      const y0 = rowPositions[rowIdx];
      const y1 = rowPositions[rowIdx + 1];
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;

      const inset = Math.min(x1 - x0, y1 - y0) * 0.08;
      const useAccent = rng.random() < 0.35;

      ctx.globalAlpha = 0.22 + rng.random() * 0.25;
      ctx.strokeStyle = useAccent ? accentColor : lineColor;
      ctx.lineWidth = lineWeight * (1.1 + rng.random() * 0.8);
      ctx.strokeRect(x0 + inset, y0 + inset, x1 - x0 - inset * 2, y1 - y0 - inset * 2);
    }
    ctx.restore();

    // A faint outer table border to frame the whole mimicked structure.
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWeight * 1.4;
    ctx.strokeRect(margin * 0.4, margin * 0.4, size - margin * 0.8, size - margin * 0.8);
    ctx.restore();
  },
};

/**
 * Builds n+1 ruled divider positions spanning [0, span], starting from an
 * even split and then perturbing each interior divider by a seeded jitter
 * amount, re-sorted to guarantee monotonic (non-crossing) ordering —
 * "roughly aligned but imperfect" rather than a perfectly uniform grid.
 */
function buildRuledPositions(
  rng: { random: (min?: number, max?: number) => number },
  n: number,
  span: number,
  jitterFrac: number
): number[] {
  const count = Math.max(1, n);
  const step = span / count;
  const jitterMax = step * jitterFrac;

  const positions: number[] = [0];
  for (let i = 1; i < count; i++) {
    const base = i * step;
    const jitter = (rng.random() - 0.5) * 2 * jitterMax;
    positions.push(base + jitter);
  }
  positions.push(span);

  positions.sort((a, b) => a - b);
  return positions;
}
