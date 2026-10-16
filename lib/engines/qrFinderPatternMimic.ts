import { hsb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Scatters seeded, rotated nested-square "bullseye" motifs across the frame —
 * the same black-white-black 7-module ratio a real QR finder pattern uses to
 * get localized by a scanner's corner/ratio detector, but with no payload
 * underneath. Dense enough that a naive QR localizer sees several plausible
 * finder-pattern candidates where none actually decode. Deliberately limited
 * to only the nested-square bullseye primitive, repeated densely — unlike
 * `fiducial_mimic`'s broader bit-grid/corner-glyph noise.
 */
export const qrFinderPatternMimic: RenderEngine = {
  id: "qr_finder_pattern_mimic",
  label: "QR Finder Pattern Mimic",
  description:
    "Scattered QR finder-pattern-like nested-square bullseyes that trigger false QR localization without a valid payload.",

  render(ctx: CanvasRenderingContext2D, size: number, rng: Rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Dark background — the bullseyes read as high-contrast against it, same
    // as a real QR code's light module background would against print noise.
    ctx.fillStyle = "rgb(16, 16, 20)";
    ctx.fillRect(0, 0, size, size);

    // Scale slider: footprint of each bullseye's outer square, in native px.
    const outerNative = 36 + params.scale * 140;

    // Density slider: how many motifs get scattered across the frame.
    const count = Math.round(14 + params.density * 70);

    // Frequency slider: how much per-motif rotation jitter is applied (0 =
    // all axis-aligned like a textbook QR code, 1 = heavily rotated, as if
    // photographed off-angle).
    const maxRotation = params.frequency * (Math.PI / 4);

    const accentColor = hsb(params.accentHue, 85, 95);
    // Fraction of motifs that get an accent-hued ring swapped in for one of
    // the three nested bands — a chromatic tell mimicking a decoder's
    // false-positive overlay, while most stay pure black/white for contrast.
    const accentChance = 0.1 + params.density * 0.2;

    for (let i = 0; i < count; i++) {
      const sizeVar = 0.7 + rng.random() * 0.7;
      const outer = outerNative * coordScale * sizeVar;

      const cx = rng.random(0, size);
      const cy = rng.random(0, size);
      const rotation = (rng.random() - 0.5) * 2 * maxRotation;
      const useAccent = rng.random() < accentChance;

      drawFinderBullseye(ctx, cx, cy, outer, rotation, useAccent, accentColor);
    }
  },
};

/**
 * Draws one real-QR-proportioned finder pattern: a 7x7-module nested square
 * stack — solid black outer ring (7 modules), white ring (5 modules), solid
 * black center (3 modules) — centered at (cx, cy) and optionally rotated.
 */
function drawFinderBullseye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  rotation: number,
  useAccent: boolean,
  accentColor: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Ratio matches a real QR finder pattern's 7:5:3 module nesting.
  const ring1 = outer; // outer black square, 7 modules
  const ring2 = outer * (5 / 7); // white square, 5 modules
  const ring3 = outer * (3 / 7); // inner black square, 3 modules

  ctx.fillStyle = useAccent ? accentColor : "rgb(8, 8, 8)";
  ctx.fillRect(-ring1 / 2, -ring1 / 2, ring1, ring1);

  ctx.fillStyle = "rgb(238, 238, 238)";
  ctx.fillRect(-ring2 / 2, -ring2 / 2, ring2, ring2);

  ctx.fillStyle = "rgb(8, 8, 8)";
  ctx.fillRect(-ring3 / 2, -ring3 / 2, ring3, ring3);

  ctx.restore();
}
