import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Scatters seeded false letterform/glyph-like strokes — short line segments
 * and curves resembling partial characters, confusable homoglyphs (I/l/1,
 * O/0, rotated/mirrored strokes), and false text-baseline rows — across the
 * canvas. Reads as disrupted, overlapping "text" regions without ever
 * spelling real words, aimed at confusing OCR / text-region detectors that
 * key on baseline alignment and stroke density rather than true glyph shape.
 */
export const ocrGlitch: RenderEngine = {
  id: "ocr_glitch",
  label: "OCR Glitch",
  description: "Seeded homoglyph and false-letterform scatter along fake text baselines to confuse OCR.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Paper-like background — glyph strokes read as dark ink against it.
    ctx.fillStyle = "rgb(236, 233, 224)";
    ctx.fillRect(0, 0, size, size);

    // Frequency slider: row pitch (how tightly packed the fake text lines are).
    const rowHeightNative = 46 - params.frequency * 22; // 46px (sparse) .. 24px (dense)
    const rowHeight = rowHeightNative * coordScale;
    const rows = Math.ceil(size / rowHeight) + 1;

    // Scale slider: glyph cell footprint within a row.
    const cellNative = 14 + params.scale * 26; // 14px..40px per glyph cell
    const cell = cellNative * coordScale;

    // Density slider: probability any given glyph cell actually spawns a stroke cluster.
    const spawnChance = 0.2 + params.density * 0.7;

    const inkColor = "rgb(28, 26, 24)";
    const faintBaseline = "rgba(60, 56, 50, 0.35)";
    const accentColor = hsb(params.accentHue, 70, 90);
    // Fraction of glyph clusters that get an accent "confusion flag" tick,
    // mimicking a detector's low-confidence/ambiguous-character marker.
    const accentChance = 0.08 + params.density * 0.12;

    for (let row = 0; row < rows; row++) {
      // Seeded per-row vertical wobble so baselines aren't perfectly rigid rulings.
      const wobble = (rng.noise(row * 0.37, 11.0) - 0.5) * rowHeight * 0.4;
      const baseY = row * rowHeight + rowHeight * 0.75 + wobble;

      // Row-level jitter: some rows are skipped entirely, some run the full width,
      // mimicking overlapping/partial text regions rather than a uniform grid.
      const rowActive = rng.random() < 0.55 + params.density * 0.4;
      if (!rowActive) continue;

      const rowStartX = rng.random() < 0.3 ? rng.random(0, size * 0.3) : 0;
      const rowEndX = rng.random() < 0.3 ? size - rng.random(0, size * 0.3) : size;

      // Faint false baseline ruling under the row.
      ctx.strokeStyle = faintBaseline;
      ctx.lineWidth = Math.max(1, 1 * coordScale);
      ctx.beginPath();
      ctx.moveTo(rowStartX, baseY + cell * 0.18);
      ctx.lineTo(rowEndX, baseY + cell * 0.18);
      ctx.stroke();

      const cols = Math.ceil((rowEndX - rowStartX) / cell) + 1;

      for (let col = 0; col < cols; col++) {
        if (rng.random() > spawnChance) continue;

        const cx = rowStartX + col * cell + (rng.random() - 0.5) * cell * 0.3;
        const cy = baseY + (rng.random() - 0.5) * cell * 0.25;

        const flagged = rng.random() < accentChance;
        drawGlyph(ctx, rng, cx, cy, cell, inkColor, accentColor, flagged);
      }
    }
  },
};

/** Draws one false letterform/homoglyph cluster: 1-3 strokes resembling a partial or confusable character. */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  rng: { random: (min?: number, max?: number) => number; randomInt: (min: number, max: number) => number },
  cx: number,
  cy: number,
  cell: number,
  inkColor: string,
  accentColor: string,
  flagged: boolean
) {
  const h = cell * (0.75 + rng.random() * 0.4); // glyph height
  const w = cell * (0.35 + rng.random() * 0.3); // glyph width
  const top = cy - h;

  ctx.strokeStyle = inkColor;
  ctx.fillStyle = inkColor;
  ctx.lineWidth = Math.max(1, cell * 0.1);
  ctx.lineCap = "round";

  const shape = rng.randomInt(0, 6);

  switch (shape) {
    case 0: {
      // Straight vertical stroke — confusable with "l" / "I" / "1".
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      break;
    }
    case 1: {
      // Closed oval — confusable with "O" / "0".
      ctx.beginPath();
      ctx.ellipse(cx, top + h * 0.5, w * 0.5, h * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 2: {
      // Open hook/curve — partial "c"/"e"/"n" style stroke.
      ctx.beginPath();
      const startAngle = rng.random(0, Math.PI * 2);
      ctx.arc(cx, top + h * 0.5, w * 0.5, startAngle, startAngle + Math.PI * (1.1 + rng.random() * 0.6));
      ctx.stroke();
      break;
    }
    case 3: {
      // Horizontal crossbar + vertical stem — "t"/"f" style partial.
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, cy);
      ctx.moveTo(cx - w * 0.5, top + h * 0.35);
      ctx.lineTo(cx + w * 0.5, top + h * 0.35);
      ctx.stroke();
      break;
    }
    case 4: {
      // Diagonal stroke pair — "v"/"x" style confusable crossing.
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.5, top);
      ctx.lineTo(cx + w * 0.5, cy);
      ctx.moveTo(cx + w * 0.5, top);
      ctx.lineTo(cx - w * 0.5, cy);
      ctx.stroke();
      break;
    }
    default: {
      // Solid block serif tick — a filled dash resembling a broken/merged glyph fragment.
      ctx.fillRect(cx - w * 0.5, cy - h * 0.18, w, h * 0.18);
      break;
    }
  }

  if (flagged) {
    // Accent-colored confusion-flag tick above the glyph, mimicking a
    // low-confidence/ambiguous-character marker from a text detector overlay.
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(cx + w * 0.6, top - h * 0.12, Math.max(1.2, cell * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
}
