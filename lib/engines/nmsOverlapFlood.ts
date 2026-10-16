import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Floods the canvas with clusters of near-duplicate detection boxes, each
 * jittered just enough in position/scale that pairwise IoU sits in the
 * "almost but not quite" band most non-max-suppression implementations use
 * as their merge threshold (commonly ~0.45-0.6) — so real NMS either merges
 * too aggressively and discards legitimate detections, or (as tuned here)
 * fails to merge at all and leaves a swarm of overlapping boxes standing.
 * Distinct from `anchor_box_flood`, which targets anchor-matching with a
 * spread of canonical aspect ratios; this engine targets the IoU-merge step
 * itself with tight near-duplicate clusters around a handful of "parent"
 * boxes.
 */
export const nmsOverlapFlood: RenderEngine = {
  id: "nms_overlap_flood",
  label: "NMS Overlap Flood",
  description: "Dense clusters of near-duplicate boxes with IoU tuned around typical NMS merge thresholds, so overlap-suppression either over- or under-merges.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Dark background — boxes read as a bright overlay grid against it.
    ctx.fillStyle = "rgb(12, 14, 18)";
    ctx.fillRect(0, 0, size, size);

    // Density slider: number of "parent" detection regions scattered across
    // the canvas. Each parent spawns a cluster of near-duplicate boxes.
    const parentCount = Math.round(6 + params.density * 34);

    // Scale slider: base parent box footprint (native px) before per-clone jitter.
    const baseShortNative = 40 + params.scale * 140;
    const baseShort = baseShortNative * coordScale;

    // Frequency slider: clones per parent — higher frequency means denser
    // near-duplicate swarms around each detected region (more IoU-adjacent
    // candidates for NMS to chew on).
    const clonesPerParent = Math.round(4 + params.frequency * 14);

    const accentColor = hsb(params.accentHue, 85, 100);
    const whiteHot = "rgb(230, 236, 242)";

    for (let p = 0; p < parentCount; p++) {
      const pw = baseShort * (0.7 + rng.random() * 0.9);
      const ph = baseShort * (0.7 + rng.random() * 0.9);
      const pcx = rng.random(pw * 0.5, size - pw * 0.5);
      const pcy = rng.random(ph * 0.5, size - ph * 0.5);

      // Jitter budget tuned so pairwise IoU between clones in a cluster lands
      // in roughly the 0.45-0.65 band: small enough that boxes still overlap
      // heavily, large enough that corners/edges visibly disagree.
      const jitterFrac = 0.06 + rng.random() * 0.1;

      for (let c = 0; c < clonesPerParent; c++) {
        const dx = (rng.random() - 0.5) * 2 * pw * jitterFrac;
        const dy = (rng.random() - 0.5) * 2 * ph * jitterFrac;
        const scaleJitter = 0.9 + rng.random() * 0.2;
        const w = pw * scaleJitter;
        const h = ph * scaleJitter;
        const cx = pcx + dx;
        const cy = pcy + dy;
        const x0 = cx - w / 2;
        const y0 = cy - h / 2;

        const confidence = rng.random();
        const useAccent = rng.random() < 0.25 + params.density * 0.25;
        const strokeColor = useAccent ? accentColor : whiteHot;

        drawDuplicateBox(ctx, x0, y0, w, h, confidence, strokeColor, coordScale);
      }
    }
  },
};

/** Draws one near-duplicate candidate box: thin bright stroke plus a small confidence tick, deliberately plainer than a full detection overlay so dozens overlapping still read as distinct edges. */
function drawDuplicateBox(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  confidence: number,
  strokeColor: string,
  coordScale: number
) {
  const lineW = Math.max(0.75, (0.75 + confidence * 1.5) * coordScale);

  ctx.save();
  ctx.globalAlpha = 0.3 + confidence * 0.35;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineW;
  ctx.strokeRect(x0, y0, w, h);

  // Small filled corner tick — a lightweight confidence-chip anchor, kept
  // minimal so dense overlapping clusters don't turn into solid blocks.
  const tick = Math.max(2, Math.min(w, h) * 0.08);
  ctx.globalAlpha = 0.5 + confidence * 0.4;
  ctx.fillStyle = strokeColor;
  ctx.fillRect(x0, y0, tick, tick);

  ctx.restore();
}
