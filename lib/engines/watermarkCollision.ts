import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Tiles the canvas with a repeating seeded glyph (a small rotated
 * diamond/ring/cross union) at a regular grid pitch, each drawn with low
 * global alpha so they overlay rather than obscure — mimicking the kind of
 * semi-transparent repeating structure that collides with common invisible
 * watermark detectors (which key on periodic, low-amplitude frequency-domain
 * patterns). A second finer sub-grid of even-smaller phase-shifted copies of
 * the same glyph, at half the pitch, is layered on top to suggest a
 * colliding dual-frequency pattern. Per-glyph seeded rotation/opacity jitter
 * is driven by params.density.
 */
export const watermarkCollision: RenderEngine = {
  id: "watermark_collision",
  label: "Watermark Collision",
  description: "Semi-transparent repeating glyph lattice tuned to collide with common invisible-watermark detection frequencies.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Neutral mid-gray background — low-alpha glyphs stay visible against it
    // without either washing out or dominating the frame.
    ctx.fillStyle = "rgb(24, 25, 28)";
    ctx.fillRect(0, 0, size, size);

    // Frequency slider: primary grid pitch (coarse..fine repeating lattice).
    const pitchNative = 110 - params.frequency * 78; // ~32..110px native
    const pitch = pitchNative * coordScale;

    // Scale slider: glyph footprint relative to the grid pitch.
    const glyphSize = pitch * (0.32 + params.scale * 0.4);

    // Density slider: per-glyph rotation/opacity jitter amount, plus overall
    // base opacity of the primary layer.
    const jitterAmount = 0.2 + params.density * 0.8;
    const baseAlphaPrimary = 0.1 + params.density * 0.14;
    const baseAlphaSecondary = 0.06 + params.density * 0.1;

    const accentColor = hsb(params.accentHue, 70, 95);
    const neutralColor = "rgb(225, 228, 232)";

    // Primary lattice: the base colliding frequency.
    drawLattice(ctx, rng, size, coordScale, pitch, glyphSize, 0, 0, baseAlphaPrimary, jitterAmount, accentColor, neutralColor, 0.3);

    // Secondary lattice: half the pitch, phase-shifted by half a cell, and
    // smaller glyphs — the second colliding frequency that beats against the
    // primary one.
    const subPitch = pitch / 2;
    const subGlyphSize = glyphSize * 0.45;
    drawLattice(
      ctx,
      rng,
      size,
      coordScale,
      subPitch,
      subGlyphSize,
      subPitch / 2,
      subPitch / 2,
      baseAlphaSecondary,
      jitterAmount,
      accentColor,
      neutralColor,
      0.55
    );
  },
};

/** Draws one phase-shifted tiled lattice of glyphs across the canvas with seeded per-glyph rotation/opacity/color jitter. */
function drawLattice(
  ctx: CanvasRenderingContext2D,
  rng: { random: (min?: number, max?: number) => number },
  size: number,
  coordScale: number,
  pitch: number,
  glyphSize: number,
  phaseX: number,
  phaseY: number,
  baseAlpha: number,
  jitterAmount: number,
  accentColor: string,
  neutralColor: string,
  accentChance: number
) {
  if (pitch <= 0.5) return;

  const cols = Math.ceil(size / pitch) + 2;
  const rows = Math.ceil(size / pitch) + 2;

  for (let gy = -1; gy < rows; gy++) {
    for (let gx = -1; gx < cols; gx++) {
      const cx = gx * pitch + phaseX;
      const cy = gy * pitch + phaseY;
      if (cx < -glyphSize || cx > size + glyphSize || cy < -glyphSize || cy > size + glyphSize) continue;

      const rotation = rng.random(0, Math.PI * 2) * jitterAmount;
      const opacityJitter = 1 + (rng.random() - 0.5) * jitterAmount;
      const alpha = Math.max(0.02, Math.min(0.9, baseAlpha * opacityJitter));
      const useAccent = rng.random() < accentChance;
      const color = useAccent ? accentColor : neutralColor;

      drawGlyph(ctx, cx, cy, glyphSize, rotation, alpha, color, coordScale);
    }
  }
}

/** Draws one small rotated diamond+ring+cross union glyph centered at (cx, cy). */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  rotation: number,
  alpha: number,
  color: string,
  coordScale: number
) {
  if (s < 0.5) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(0.6, s * 0.06 * coordScale);

  const r = s / 2;

  // Rotated diamond outline.
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.stroke();

  // Concentric ring at ~60% radius.
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  // Cross through the center.
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, 0);
  ctx.lineTo(r * 0.8, 0);
  ctx.moveTo(0, -r * 0.8);
  ctx.lineTo(0, r * 0.8);
  ctx.stroke();

  // Tiny solid center dot — the sharp high-frequency component of the glyph.
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.5, r * 0.1), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
