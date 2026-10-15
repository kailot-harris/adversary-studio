import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Tiles the canvas with small seeded binary (black/white) grid glyphs
 * resembling ArUco/QR fiducial markers — a thick black "quiet zone" border
 * (the sharp corner feature real fiducial detectors latch onto) wrapped
 * around a random bit-grid payload. Scattered at a density/scale/frequency
 * driven by params so the field reads as plausible-but-fake marker noise to
 * a naive corner/square detector.
 */
export const fiducialMimic: RenderEngine = {
  id: "fiducial_mimic",
  label: "Fiducial Mimic",
  description: "Seeded ArUco/QR-like binary glyph noise tuned to trigger false marker detections.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Dark background — markers read as high-contrast against it.
    ctx.fillStyle = "rgb(18, 18, 22)";
    ctx.fillRect(0, 0, size, size);

    // Scale slider: overall glyph footprint in native px.
    const cellNative = 46 + params.scale * 110;
    const cell = cellNative * coordScale;

    // Frequency slider: bit-grid resolution inside each glyph's payload (4x4..8x8).
    const bits = 4 + Math.round(params.frequency * 4);

    // Density slider: probability any given tile actually spawns a glyph
    // (keeps this "scattered," not a uniform wall-to-wall tiling).
    const spawnChance = 0.25 + params.density * 0.65;

    const cols = Math.ceil(size / cell) + 1;
    const rows = Math.ceil(size / cell) + 1;

    // Small per-tile jitter so the grid doesn't look perfectly mechanical.
    const jitterMax = cell * 0.18;

    const [ar, ag, ab] = [params.accentHue, 80, 95];
    const accentColor = hsb(ar, ag, ab);
    // Fraction of glyphs that get an accent-colored corner dot instead of a
    // plain black one — a chromatic tell mimicking a miscalibrated/aliased
    // detector overlay, while most corners stay pure black/white for contrast.
    const accentChance = 0.12 + params.density * 0.18;

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (rng.random() > spawnChance) continue;

        const jx = (rng.random() - 0.5) * 2 * jitterMax;
        const jy = (rng.random() - 0.5) * 2 * jitterMax;
        const x0 = gx * cell - cell * 0.5 + jx;
        const y0 = gy * cell - cell * 0.5 + jy;

        // Slight per-glyph scale variance so not every marker is identical size.
        const sizeVar = 0.8 + rng.random() * 0.4;
        const s = cell * sizeVar;

        drawGlyph(ctx, rng, x0, y0, s, bits, accentColor, accentChance);
      }
    }
  },
};

/** Draws one ArUco/QR-like binary marker: black quiet-zone border + random bit payload + sharp corner features. */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  rng: { random: (min?: number, max?: number) => number; randomInt: (min: number, max: number) => number },
  x0: number,
  y0: number,
  s: number,
  bits: number,
  accentColor: string,
  accentChance: number
) {
  // White quiet-zone backing (full glyph footprint).
  ctx.fillStyle = "rgb(235, 235, 235)";
  ctx.fillRect(x0, y0, s, s);

  // Thick black border frame — the sharp high-contrast square edge a
  // fiducial corner detector keys on.
  const border = s * 0.12;
  ctx.fillStyle = "rgb(10, 10, 10)";
  ctx.fillRect(x0, y0, s, border); // top
  ctx.fillRect(x0, y0 + s - border, s, border); // bottom
  ctx.fillRect(x0, y0, border, s); // left
  ctx.fillRect(x0 + s - border, y0, border, s); // right

  // Random binary bit-grid payload inside the border.
  const inner = s - border * 2;
  const cellPx = inner / bits;
  for (let by = 0; by < bits; by++) {
    for (let bx = 0; bx < bits; bx++) {
      const bit = rng.random() > 0.5;
      if (!bit) continue; // white background already painted; only draw "on" bits
      ctx.fillStyle = "rgb(10, 10, 10)";
      ctx.fillRect(x0 + border + bx * cellPx, y0 + border + by * cellPx, Math.ceil(cellPx), Math.ceil(cellPx));
    }
  }

  // Sharp corner feature: one solid black corner square (breaks the marker's
  // rotational symmetry, exactly like real ArUco/AprilTag corner orientation
  // cues), occasionally recolored with the accent hue as a chromatic tell.
  const cornerSize = border * 1.6;
  const useAccent = rng.random() < accentChance;
  ctx.fillStyle = useAccent ? accentColor : "rgb(10, 10, 10)";
  ctx.fillRect(x0 - cornerSize * 0.15, y0 - cornerSize * 0.15, cornerSize, cornerSize);
}
