import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Tracklet ID Swap Pattern: draws 2-4 seeded pairs of simplified person
 * silhouettes. Within each pair, both silhouettes carry nearly identical
 * accent-hued "clothing block" appearance cues (same torso-block pattern,
 * same hue/pattern seed) but sit at different positions on the canvas —
 * simulating two distinct tracked people whose appearance embeddings a
 * ByteTrack/DeepSORT-style re-ID association step would see as "the same
 * identity," risking a tracklet ID swap at the next frame association. A
 * thin dashed connector line joins each pair's members to visualize the
 * confusion directly.
 */
export const trackletIdSwapPattern: RenderEngine = {
  id: "tracklet_id_swap_pattern",
  label: "Tracklet ID Swap Pattern",
  description:
    "Paired decoy silhouettes with swapped-but-similar appearance cues tuned to confuse multi-object-tracker re-ID/association (ByteTrack/DeepSORT-style).",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(9, 11, 14)";
    ctx.fillRect(0, 0, size, size);

    // Faint "frame" scanlines to suggest a tracker's video feed.
    ctx.strokeStyle = "rgba(40, 50, 60, 0.35)";
    ctx.lineWidth = 1;
    for (let y = 60; y < 800; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y * s);
      ctx.lineTo(size, y * s);
      ctx.stroke();
    }

    // 2-4 pairs, scaled lightly by density.
    const pairCount = 2 + Math.round(rng.random(0, 2) * (0.3 + params.density));
    const bodyScale = 0.6 + params.scale * 1.1;

    for (let p = 0; p < pairCount; p++) {
      // Shared appearance cues for this pair: same hue + same clothing
      // "block pattern" seed, so both silhouettes look like one identity
      // to an appearance-embedding re-ID model.
      const pairHue = (params.accentHue + p * (360 / Math.max(1, pairCount))) % 360;
      const blockPatternSeed = rng.random(0, 1000);
      const bandCount = 2 + Math.floor(rng.random(0, 3));

      // Two distinct positions on the canvas — different tracked locations.
      const ax = rng.random(90, 710) * s;
      const ay = rng.random(120, 680) * s;
      const bx = rng.random(90, 710) * s;
      const by = rng.random(120, 680) * s;

      // Thin dashed connector between the pair, visualizing the confusion.
      ctx.save();
      ctx.setLineDash([6 * s, 5 * s]);
      ctx.strokeStyle = `hsla(${pairHue}, 70%, 70%, 0.45)`;
      ctx.lineWidth = Math.max(1, 1.2 * s);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();

      const jitter = 0.08 + params.frequency * 0.3;
      drawSilhouette(ctx, rng, ax, ay, bodyScale * s, pairHue, blockPatternSeed, bandCount, jitter);
      drawSilhouette(ctx, rng, bx, by, bodyScale * s, pairHue, blockPatternSeed, bandCount, jitter);
    }
  },
};

/**
 * Draws one simplified person silhouette: an oval head, a blob torso with
 * accent-hued "clothing block" bands, and two short leg stubs. Two calls
 * with the same hue/patternSeed/bandCount but different positions produce
 * near-identical appearance cues at different tracklet locations.
 */
function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  cx: number,
  cy: number,
  unit: number,
  hue: number,
  patternSeed: number,
  bandCount: number,
  jitter: number
) {
  const headR = unit * 14;
  const torsoW = unit * 26;
  const torsoH = unit * 48;
  const legH = unit * 30;

  const torsoTop = cy - legH * 0.1;
  const torsoBottom = torsoTop + torsoH;
  const torsoCenterY = (torsoTop + torsoBottom) / 2;

  // Base silhouette fill (the "shape" a detector/segmenter would see).
  ctx.fillStyle = "rgba(60, 65, 72, 0.9)";

  // Head.
  ctx.beginPath();
  ctx.ellipse(cx, torsoTop - headR * 1.4, headR, headR * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso blob (rounded rect via ellipse approximation).
  ctx.beginPath();
  ctx.ellipse(cx, torsoCenterY, torsoW / 2, torsoH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs.
  ctx.beginPath();
  ctx.ellipse(cx - torsoW * 0.22, torsoBottom + legH * 0.4, torsoW * 0.16, legH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + torsoW * 0.22, torsoBottom + legH * 0.4, torsoW * 0.16, legH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clothing-block appearance cues: identical band pattern driven by the
  // shared patternSeed, clipped to the torso ellipse so it reads as a
  // "shirt pattern" — this is the shared cue that would collide in a
  // re-ID appearance embedding across the pair.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, torsoCenterY, torsoW / 2, torsoH / 2, 0, 0, Math.PI * 2);
  ctx.clip();

  for (let i = 0; i < bandCount; i++) {
    // Deterministic per-band offset derived from the shared patternSeed,
    // not from a fresh rng draw, so both silhouettes in the pair get the
    // exact same band layout (same "clothing").
    const frac = (i + 0.5) / bandCount;
    const bandCenterY = torsoTop + frac * torsoH;
    const bandHeight = (torsoH / bandCount) * 0.7;
    const bandHueShift = Math.sin(patternSeed + i * 1.37) * 18;
    ctx.fillStyle = `hsla(${(hue + bandHueShift + 360) % 360}, 75%, 58%, 0.85)`;
    ctx.fillRect(cx - torsoW / 2, bandCenterY - bandHeight / 2, torsoW, bandHeight);
  }

  // A single small accent "logo" block, same relative spot in both copies.
  const logoSize = torsoW * 0.22;
  ctx.fillStyle = `hsla(${(hue + 150) % 360}, 90%, 72%, 0.95)`;
  ctx.fillRect(cx - logoSize / 2, torsoCenterY - torsoH * 0.18, logoSize, logoSize);
  ctx.restore();

  // Tiny per-instance positional jitter marks (not a hue/pattern
  // difference) so the pair isn't pixel-identical, only "confusingly
  // similar" in appearance embedding space — mirrors a real detector's
  // small per-detection noise.
  ctx.fillStyle = `hsla(${hue}, 60%, 80%, ${0.15 + jitter * 0.3})`;
  for (let n = 0; n < 3; n++) {
    const nx = cx + rng.random(-torsoW * 0.4, torsoW * 0.4);
    const ny = torsoTop + rng.random(0, torsoH);
    ctx.beginPath();
    ctx.arc(nx, ny, unit * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
