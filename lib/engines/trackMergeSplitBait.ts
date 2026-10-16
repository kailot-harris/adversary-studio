import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Track Merge/Split Bait: seeded pairs of adjacent decoy regions, each
 * color/shape-matched to a real tracked-subject blob, specifically shaped to
 * attack a multi-object tracker's track-count logic rather than its identity
 * or trajectory association.
 *
 * Two bait scenarios alternate per seeded unit, each drawn with a thin dashed
 * outline marking the bounding box(es) a tracker would compute:
 *  - MERGE bait: two same-hued, same-shaped silhouette blobs placed close
 *    enough that their bounding boxes overlap, baiting a tracker into fusing
 *    two real tracks into one.
 *  - SPLIT bait: a single silhouette blob with a seeded internal color/gap
 *    break across its middle, baiting a tracker into treating one real track
 *    as two.
 */
export const trackMergeSplitBait: RenderEngine = {
  id: "track_merge_split_bait",
  label: "Track Merge/Split Bait",
  description:
    "Paired adjacent decoy regions, color/shape-matched to a real tracked subject, baiting a multi-object tracker into merging two tracks into one or splitting one into two.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(10, 11, 15)";
    ctx.fillRect(0, 0, size, size);

    // Faint ground reference lines, implying a floor plane the blobs sit on.
    ctx.strokeStyle = "rgba(38, 48, 58, 0.45)";
    ctx.lineWidth = 1;
    for (let y = 100; y < 800; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y * s);
      ctx.lineTo(size, y * s);
      ctx.stroke();
    }

    const unitCount = 2 + Math.round(rng.random(0, 1) + params.density * 2); // 2-5 bait units
    const blobScale = (0.65 + params.scale * 0.8) * s;

    // Lay out unit centers on a loose grid across the canvas so units don't
    // collide with each other, then jitter each seeded.
    const cols = Math.ceil(Math.sqrt(unitCount));
    const rows = Math.ceil(unitCount / cols);
    const cellW = 800 / cols;
    const cellH = 800 / rows;

    for (let i = 0; i < unitCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = (col + 0.5) * cellW + rng.random(-cellW * 0.12, cellW * 0.12);
      const cy = (row + 0.5) * cellH + rng.random(-cellH * 0.12, cellH * 0.12);
      const hue = (params.accentHue + i * 47 + rng.random(-10, 10)) % 360;

      // Alternate scenario type, seeded by a coin flip per unit rather than
      // strict parity, so reroll varies which units are merge vs. split.
      const isMergeBait = rng.random(0, 1) < 0.5;

      if (isMergeBait) {
        drawMergeBait(ctx, cx * s, cy * s, blobScale, hue, params, rng);
      } else {
        drawSplitBait(ctx, cx * s, cy * s, blobScale, hue, params, rng);
      }
    }
  },
};

/** Draws one rounded silhouette blob (body + small head bump), matched in color/shape. */
function drawBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  hue: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `hsla(${hue}, 68%, 52%, 1)`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // Small "head" bump so the blob reads as a tracked subject's silhouette,
  // not an abstract shape.
  ctx.beginPath();
  ctx.ellipse(x, y - ry * 0.95, rx * 0.4, rx * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Thin dashed rectangle, mimicking a tracker-computed bounding box overlay. */
function drawDashedBox(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  dash: number[]
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  ctx.restore();
}

/**
 * MERGE bait: two same-hue, same-shape blobs placed close enough together
 * that their bounding boxes overlap, plus the overlap zone itself outlined,
 * baiting a tracker into fusing both into a single track.
 */
function drawMergeBait(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  hue: number,
  params: EngineParams,
  rng: Rng
) {
  const rx = 42 * scale;
  const ry = 58 * scale;
  // Separation is deliberately small relative to blob width so the two
  // bounding boxes overlap - tighter at higher frequency setting.
  const sep = rx * (1.1 - params.frequency * 0.55) * 2;
  const offset = sep / 2;

  const leftX = cx - offset;
  const rightX = cx + offset;

  drawBlob(ctx, leftX, cy, rx, ry, hue, 0.92);
  drawBlob(ctx, rightX, cy, rx, ry, hue, 0.92);

  const headPad = rx * 0.4 + 6;
  const leftBox = { x0: leftX - rx, y0: cy - ry - headPad * 2, x1: leftX + rx, y1: cy + ry };
  const rightBox = { x0: rightX - rx, y0: cy - ry - headPad * 2, x1: rightX + rx, y1: cy + ry };

  drawDashedBox(ctx, leftBox.x0, leftBox.y0, leftBox.x1, leftBox.y1, `hsla(${hue}, 85%, 75%, 0.55)`, [5, 4]);
  drawDashedBox(ctx, rightBox.x0, rightBox.y0, rightBox.x1, rightBox.y1, `hsla(${hue}, 85%, 75%, 0.55)`, [5, 4]);

  // Overlap zone: the intersection of the two boxes, outlined in the accent
  // hue with a tighter dash - the bait zone itself.
  const ox0 = Math.max(leftBox.x0, rightBox.x0);
  const ox1 = Math.min(leftBox.x1, rightBox.x1);
  if (ox1 > ox0) {
    const oy0 = Math.max(leftBox.y0, rightBox.y0);
    const oy1 = Math.min(leftBox.y1, rightBox.y1);
    ctx.save();
    ctx.fillStyle = `hsla(${(hue + 40) % 360}, 90%, 65%, 0.14)`;
    ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
    ctx.restore();
    drawDashedBox(ctx, ox0, oy0, ox1, oy1, `hsla(${(hue + 40) % 360}, 95%, 70%, 0.85)`, [2, 3]);
  }

  // A faint seeded jitter wobble on one blob's position to imply this is a
  // live, slightly-moving decoy pair rather than a static diagram.
  void rng.random(0, 1);
}

/**
 * SPLIT bait: a single blob with a seeded internal color/gap break across
 * its middle, baiting a tracker into treating one real subject as two.
 */
function drawSplitBait(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  hue: number,
  params: EngineParams,
  rng: Rng
) {
  const rx = 48 * scale;
  const ry = 72 * scale;
  const headPad = rx * 0.4 + 6;

  // Seeded gap position/width along the vertical axis of the blob - the
  // internal break a tracker's segmentation might misread as a separation.
  const gapT = rng.random(0.35, 0.65); // fraction down the body where the gap sits
  const gapWidth = (6 + params.density * 14) * scale;
  const gapY = cy - ry + gapT * (ry * 2);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  // Top half, drawn at the base hue.
  ctx.fillStyle = `hsla(${hue}, 68%, 52%, 0.92)`;
  ctx.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, gapY - gapWidth / 2 - (cy - ry - 2));

  // Bottom half, shifted a little in lightness/hue so a color-sensitive
  // tracker reads it as a visually distinct region from the top half, while
  // a shape-based tracker still sees one contiguous silhouette.
  const bottomHue = (hue + 14) % 360;
  ctx.fillStyle = `hsla(${bottomHue}, 62%, 46%, 0.92)`;
  ctx.fillRect(
    cx - rx - 2,
    gapY + gapWidth / 2,
    rx * 2 + 4,
    cy + ry + 2 - (gapY + gapWidth / 2)
  );

  // The gap band itself, cut down to background so the break reads as a
  // real seam, not just a color change.
  ctx.fillStyle = "rgb(10, 11, 15)";
  ctx.fillRect(cx - rx - 2, gapY - gapWidth / 2, rx * 2 + 4, gapWidth);

  ctx.restore();

  // Head bump, drawn on top at the base hue (unaffected by the split).
  ctx.save();
  ctx.fillStyle = `hsla(${hue}, 68%, 52%, 0.92)`;
  ctx.beginPath();
  ctx.ellipse(cx, cy - ry * 0.95, rx * 0.4, rx * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const outerBox = { x0: cx - rx, y0: cy - ry - headPad * 2, x1: cx + rx, y1: cy + ry };
  const topBox = { x0: cx - rx, y0: outerBox.y0, x1: cx + rx, y1: gapY - gapWidth / 2 };
  const bottomBox = { x0: cx - rx, y0: gapY + gapWidth / 2, x1: cx + rx, y1: cy + ry };

  drawDashedBox(ctx, outerBox.x0, outerBox.y0, outerBox.x1, outerBox.y1, `hsla(${hue}, 60%, 70%, 0.35)`, [5, 4]);
  drawDashedBox(
    ctx,
    topBox.x0,
    topBox.y0,
    topBox.x1,
    topBox.y1,
    `hsla(${hue}, 95%, 72%, 0.75)`,
    [2, 3]
  );
  drawDashedBox(
    ctx,
    bottomBox.x0,
    bottomBox.y0,
    bottomBox.x1,
    bottomBox.y1,
    `hsla(${bottomHue}, 95%, 72%, 0.75)`,
    [2, 3]
  );
}
