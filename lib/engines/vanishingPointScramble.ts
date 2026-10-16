import { hsb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Draws 2-3 seeded bundles of straight lines, each bundle radiating from (or
 * converging toward) its own distinct vanishing point on the canvas, like
 * rail-track or road-perspective lines. Because the bundles' vanishing
 * points are placed independently and never share a common horizon, the
 * result looks locally plausible as "perspective lines" in any one bundle
 * but is globally contradictory — exactly the kind of cue that confuses
 * horizon/vanishing-point estimation and ego-motion/camera-pose pipelines
 * that assume a single consistent vanishing geometry per frame. Each
 * bundle is tinted with its own accent-hue-derived color so the distinct
 * (and mutually inconsistent) convergence points are easy to tell apart.
 * See brainstorm.md's "sensor-level / geometric" group.
 */
export const vanishingPointScramble: RenderEngine = {
  id: "vanishing_point_scramble",
  label: "Vanishing Point Scramble",
  description:
    "Converging line-bundles implying contradictory vanishing points, confusing perspective/horizon estimation used in ego-motion and camera pose.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.fillStyle = "rgb(14, 14, 16)";
    ctx.fillRect(0, 0, size, size);

    // Density slider: 2-3 independent vanishing-point bundles.
    const bundleCount = params.density > 0.5 ? 3 : 2;

    // Frequency slider: lines per bundle.
    const linesPerBundle = Math.round(18 + params.frequency * 42);

    // Scale slider: how far each bundle's lines reach past its vanishing
    // point (controls perceived "depth" of the converging lines).
    const reach = size * (0.9 + params.scale * 0.6);

    for (let b = 0; b < bundleCount; b++) {
      drawBundle(ctx, rng, size, b, linesPerBundle, reach, params);
    }
  },
};

/**
 * One bundle: a seeded vanishing point somewhere on (or just off) the
 * canvas, plus a seeded fan of lines all passing through it, each line
 * extended well past the point in the opposite direction so it reads as a
 * converging perspective ray rather than a line segment stopping dead at
 * the vanishing point.
 */
function drawBundle(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  size: number,
  bundleIndex: number,
  lineCount: number,
  reach: number,
  params: EngineParams
): void {
  // Vanishing points are seeded independently per bundle and allowed to
  // land outside the canvas edges too (like a real off-frame horizon
  // point), which is part of what makes the bundles mutually inconsistent.
  const margin = size * 0.3;
  const vpx = rng.random(-margin, size + margin);
  const vpy = rng.random(-margin, size + margin);

  // Each bundle gets its own hue offset from the shared accent hue so the
  // distinct (contradictory) vanishing points are visually distinguishable.
  const hueOffset = bundleIndex * 95 + rng.random(-15, 15);
  const hue = (params.accentHue + hueOffset + 360) % 360;

  // Seeded fan-angle window: lines don't cover the full 360 degrees, they
  // sweep a contiguous arc, like a bundle of rail tracks or road edges
  // converging toward one point from one general direction.
  const arcCenter = rng.random(0, Math.PI * 2);
  const arcWidth = rng.random(Math.PI * 0.35, Math.PI * 0.85);

  ctx.save();
  ctx.lineCap = "round";

  for (let i = 0; i < lineCount; i++) {
    const t = lineCount === 1 ? 0.5 : i / (lineCount - 1);
    // Jitter each line's angle slightly so the fan isn't perfectly uniform.
    const jitter = rng.random(-0.01, 0.01) * Math.PI;
    const theta = arcCenter - arcWidth / 2 + arcWidth * t + jitter;

    const dx = Math.cos(theta);
    const dy = Math.sin(theta);

    // Extend the ray from well behind the vanishing point, through it, and
    // out past the far edge of the canvas, so each line visually converges
    // into vpx/vpy rather than merely touching it.
    const x0 = vpx - dx * reach;
    const y0 = vpy - dy * reach;
    const x1 = vpx + dx * reach * 0.12;
    const y1 = vpy + dy * reach * 0.12;

    const bri = 55 + rng.random(0, 40);
    const sat = 45 + rng.random(0, 40);
    const alpha = 0.35 + (1 - t * 0.3) * rng.random(0.25, 0.5);

    ctx.strokeStyle = hsb(hue, sat, bri);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.lineWidth = Math.max(0.75, size * 0.0016 * (0.5 + rng.random()));

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Mark the vanishing point itself with a small seeded ring, so the
  // contradictory convergence points read clearly even at a glance.
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = hsb(hue, 60, 95);
  ctx.beginPath();
  ctx.arc(vpx, vpy, size * 0.006 + rng.random(0, size * 0.004), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
