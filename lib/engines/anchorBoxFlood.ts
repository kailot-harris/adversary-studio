import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Floods the canvas with a dense, seeded field of overlapping rectangles at
 * the three canonical object-detector anchor-box aspect ratios (1:1, 1:2,
 * 2:1), each rendered like a confident detection box — thin bright stroke,
 * a filled corner "confidence" tick, and a thin dashed inner outline — so
 * the whole field reads as a wall of plausible high-confidence detections.
 * Scale/position/aspect are seeded per box; density controls box count and
 * overlap; the goal is heavy overlap to overload NMS/anchor-matching in
 * detectors like YOLO/SSD.
 */
export const anchorBoxFlood: RenderEngine = {
  id: "anchor_box_flood",
  label: "Anchor Box Flood",
  description: "Dense seeded field of overlapping classic-aspect-ratio detection boxes tuned to overload NMS/anchor matching.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Dark background — boxes read as high-contrast "overlay" lines against it.
    ctx.fillStyle = "rgb(14, 16, 20)";
    ctx.fillRect(0, 0, size, size);

    // Density slider: total box count in the flood (sparse-ish to very dense).
    const boxCount = Math.round(60 + params.density * 340);

    // Scale slider: base box footprint (short side) in native px, before aspect stretch.
    const baseShortNative = 22 + params.scale * 70;
    const baseShort = baseShortNative * coordScale;

    // Frequency slider: how tightly boxes cluster vs. spread uniformly across
    // the canvas — higher frequency means more, smaller clusters (closer to
    // real NMS-overload conditions where many candidate boxes stack on the
    // same object region).
    const clusterCount = 3 + Math.round(params.frequency * 9);
    const clusters: Array<{ cx: number; cy: number; spread: number }> = [];
    for (let i = 0; i < clusterCount; i++) {
      clusters.push({
        cx: rng.random(0, size),
        cy: rng.random(0, size),
        spread: size * (0.08 + rng.random() * 0.22),
      });
    }

    const accentColor = hsb(params.accentHue, 85, 100);
    const whiteHot = "rgb(235, 240, 245)";

    // Three canonical anchor-box aspect ratios: square, tall (1:2), wide (2:1).
    const aspects: Array<[number, number]> = [
      [1, 1],
      [1, 2],
      [2, 1],
    ];

    for (let i = 0; i < boxCount; i++) {
      // Pick a cluster to center this box near, so boxes pile up densely in
      // a handful of regions rather than spreading perfectly evenly — this
      // is what produces the NMS-overload look (many overlapping candidate
      // boxes around the same "object").
      const cluster = clusters[rng.randomInt(0, clusters.length)];
      const cx = cluster.cx + (rng.random() - 0.5) * 2 * cluster.spread;
      const cy = cluster.cy + (rng.random() - 0.5) * 2 * cluster.spread;

      const [aw, ah] = aspects[rng.randomInt(0, aspects.length)];
      const scaleVar = 0.6 + rng.random() * 1.1; // per-box scale jitter
      const w = baseShort * aw * scaleVar;
      const h = baseShort * ah * scaleVar;

      const x0 = cx - w / 2;
      const y0 = cy - h / 2;

      // Per-box "confidence" — drives stroke weight and whether it gets an
      // accent-colored tell vs. plain high-contrast white/cyan-ish stroke.
      const confidence = rng.random();
      const useAccent = rng.random() < 0.3 + params.density * 0.3;
      const strokeColor = useAccent ? accentColor : whiteHot;

      drawAnchorBox(ctx, x0, y0, w, h, confidence, strokeColor, coordScale);
    }
  },
};

/** Draws one high-confidence-looking detection box: bright rectangle outline, dashed inner inset, and a filled corner confidence tick. */
function drawAnchorBox(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  confidence: number,
  strokeColor: string,
  coordScale: number
) {
  const lineW = Math.max(1, (1 + confidence * 2.4) * coordScale);

  ctx.save();
  ctx.globalAlpha = 0.55 + confidence * 0.4;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineW;
  ctx.strokeRect(x0, y0, w, h);

  // Thin dashed inner outline mimicking an anchor/prior box nested inside
  // the predicted box — another classic detector-overlay visual tell.
  const inset = Math.min(w, h) * 0.12;
  if (w - inset * 2 > 1 && h - inset * 2 > 1) {
    ctx.setLineDash([Math.max(2, 4 * coordScale), Math.max(2, 4 * coordScale)]);
    ctx.lineWidth = Math.max(0.75, lineW * 0.5);
    ctx.globalAlpha = 0.35 + confidence * 0.3;
    ctx.strokeRect(x0 + inset, y0 + inset, w - inset * 2, h - inset * 2);
    ctx.setLineDash([]);
  }

  // Filled top-left corner confidence tick — a small solid square, like a
  // detector overlay's label/confidence chip anchor point.
  const tick = Math.max(3, Math.min(w, h) * 0.16);
  ctx.globalAlpha = 0.7 + confidence * 0.3;
  ctx.fillStyle = strokeColor;
  ctx.fillRect(x0, y0, tick, tick);

  ctx.restore();
}
