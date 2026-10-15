import { hsb, hsbToRgb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Divides the canvas into a seeded checkerboard-like grid of regions and
 * alternates each region between two opposite failure modes for a SLAM
 * feature matcher (e.g. ORB-SLAM's corner/edge detectors):
 *  - "desert" regions: a smooth, low-frequency gradient fill with no texture
 *    at all, so there is nothing repeatable for a corner/edge detector to
 *    latch onto (feature-starved).
 *  - "flood" regions: a dense cluster of small, high-contrast seeded
 *    corner/cross/star marks that look like strong keypoints but carry no
 *    real structure, so a matcher gets swamped with false candidates
 *    (feature-flooded).
 * Region assignment alternates in checkerboard order with a seeded flip so
 * the pattern isn't perfectly periodic. See brainstorm.md's "3D/geometric
 * reconstruction" group.
 */
export const slamFeatureDesert: RenderEngine = {
  id: "slam_feature_desert",
  label: "SLAM Feature Desert",
  description:
    "Checkerboard of flat feature-starved gradient zones and dense false-keypoint flood zones tuned to starve or flood SLAM feature matchers.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.fillStyle = "rgb(18, 18, 20)";
    ctx.fillRect(0, 0, size, size);

    // Density slider: grid resolution -> region count. 3-9 cells per side.
    const gridN = Math.max(3, Math.round(3 + params.density * 6));
    const cell = size / gridN;

    // Frequency slider: how many fake keypoint marks per flood region.
    const marksPerCell = Math.round(10 + params.frequency * 60);

    // Scale slider: size of each fake keypoint mark.
    const markSize = cell * (0.06 + params.scale * 0.14);

    for (let gy = 0; gy < gridN; gy++) {
      for (let gx = 0; gx < gridN; gx++) {
        const x0 = gx * cell;
        const y0 = gy * cell;

        // Checkerboard parity with a seeded per-cell flip so the boundary
        // between desert and flood zones isn't perfectly regular.
        const parity = (gx + gy) % 2 === 0;
        const flip = rng.random() < 0.12;
        const isDesert = flip ? !parity : parity;

        if (isDesert) {
          drawDesertRegion(ctx, rng, x0, y0, cell, params);
        } else {
          drawFloodRegion(ctx, rng, x0, y0, cell, marksPerCell, markSize, params);
        }
      }
    }
  },
};

/** Flat, low-frequency gradient fill: no texture, no repeatable corners/edges. */
function drawDesertRegion(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x0: number,
  y0: number,
  cell: number,
  params: EngineParams
): void {
  const hueJitter = rng.random(-25, 25);
  const hue = (params.accentHue + hueJitter + 360) % 360;
  const bri0 = 20 + rng.random(0, 20);
  const bri1 = bri0 + 10 + rng.random(0, 25);
  const sat = 10 + rng.random(0, 20);

  // Seeded gradient angle so the "flat" fill still varies smoothly region to
  // region instead of looking like uniform flat color everywhere.
  const angle = rng.random(0, Math.PI * 2);
  const dx = Math.cos(angle) * cell * 0.5;
  const dy = Math.sin(angle) * cell * 0.5;
  const cx = x0 + cell / 2;
  const cy = y0 + cell / 2;

  const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  grad.addColorStop(0, hsb(hue, sat, bri0));
  grad.addColorStop(1, hsb(hue, sat, bri1));

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(x0, y0, cell, cell);
  ctx.restore();
}

/** Dense cluster of small high-contrast fake corner/cross/star keypoint marks. */
function drawFloodRegion(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  x0: number,
  y0: number,
  cell: number,
  marksPerCell: number,
  markSize: number,
  params: EngineParams
): void {
  // Dark backing so high-contrast marks pop, matching the canvas base tone.
  ctx.save();
  ctx.fillStyle = "rgb(10, 10, 12)";
  ctx.fillRect(x0, y0, cell, cell);

  for (let i = 0; i < marksPerCell; i++) {
    const mx = x0 + rng.random(0, cell);
    const my = y0 + rng.random(0, cell);
    const s = markSize * (0.5 + rng.random());
    const useAccent = rng.random() < 0.4;
    const [r, g, b] = useAccent
      ? hsbToRgb((params.accentHue + rng.random(-20, 20) + 360) % 360, 80, 95)
      : [235, 238, 240];
    const kind = rng.randomInt(0, 3); // 0=corner, 1=cross, 2=star

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.globalAlpha = 0.65 + rng.random() * 0.35;

    if (kind === 0) {
      drawCornerMark(ctx, mx, my, s);
    } else if (kind === 1) {
      drawCrossMark(ctx, mx, my, s);
    } else {
      drawStarMark(ctx, mx, my, s, rng);
    }
  }

  ctx.restore();
}

/** An "L"-shaped corner tell, like a FAST/Harris corner response marker. */
function drawCornerMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - s / 2, cy + s / 2);
  ctx.lineTo(cx - s / 2, cy - s / 2);
  ctx.lineTo(cx + s / 2, cy - s / 2);
  ctx.stroke();
}

/** A plus/cross mark, like a sub-pixel keypoint centroid marker. */
function drawCrossMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(cx - s / 2, cy);
  ctx.lineTo(cx + s / 2, cy);
  ctx.moveTo(cx, cy - s / 2);
  ctx.lineTo(cx, cy + s / 2);
  ctx.stroke();
}

/** A small 4-point star burst, like a strong-response keypoint glyph. */
function drawStarMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  rng: Rng
): void {
  const rot = rng.random(0, Math.PI / 2);
  ctx.beginPath();
  for (let a = 0; a < 4; a++) {
    const theta = rot + (a * Math.PI) / 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(theta) * (s / 2), cy + Math.sin(theta) * (s / 2));
  }
  ctx.stroke();
}
