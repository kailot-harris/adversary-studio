import { hsb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

type Branch = {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  depth: number;
};

/**
 * Mimics the branching, thread-like texture read by near-IR palm/finger
 * vein-recognition sensors: a seeded set of root points each grow a
 * recursive line structure that splits into two child branches at seeded
 * intervals, each split randomizing the angle offset and tapering width
 * and length down toward leaf branches. Rendered dark-on-light (an IR-scan
 * "negative" look), with a sparse subset of branches re-colored in the
 * accent hue to read like a highlighted/flagged vein segment.
 */
export const veinPatternJam: RenderEngine = {
  id: "vein_pattern_jam",
  label: "Vein Pattern Jam",
  description:
    "Branching vein-like line noise mimicking near-IR palm/finger vein-recognition texture, to confuse vascular biometric matchers.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;

    // IR-scan-style backdrop: pale, slightly warm near-white, like a
    // palm under near-infrared illumination.
    ctx.fillStyle = "rgb(224, 214, 198)";
    ctx.fillRect(0, 0, size, size);

    // Faint mottling to avoid a flat, obviously-synthetic background.
    const mottleCount = Math.round(40 + params.density * 120);
    for (let i = 0; i < mottleCount; i++) {
      const mx = rng.random(0, size);
      const my = rng.random(0, size);
      const r = rng.random(20, 90) * s;
      ctx.fillStyle = `rgba(150, 130, 110, ${rng.random(0.02, 0.06)})`;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const accent = hsb(params.accentHue, 85, 55);

    const rootCount = Math.max(2, Math.round(2 + params.density * 6));
    const maxDepth = Math.max(4, Math.round(5 + params.frequency * 6));
    const baseLength = (60 + params.scale * 90) * s;
    const baseWidth = (3.5 + params.scale * 4) * s;

    ctx.lineCap = "round";

    for (let r = 0; r < rootCount; r++) {
      const x = rng.random(size * 0.1, size * 0.9);
      const y = rng.random(size * 0.1, size * 0.9);
      const angle = rng.random(0, Math.PI * 2);

      growBranch(
        ctx,
        rng,
        {
          x,
          y,
          angle,
          length: baseLength * rng.random(0.8, 1.2),
          width: baseWidth,
          depth: 0,
        },
        maxDepth,
        accent,
        s
      );
    }
  },
};

/**
 * Recursively draws one branch segment, then (unless at max depth) splits
 * into two child branches at the branch's endpoint, each with a seeded
 * angle offset and tapered length/width. A small seeded chance highlights
 * a branch in the accent color instead of the dark vein tone, mimicking a
 * flagged/matched vascular segment.
 */
function growBranch(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  branch: Branch,
  maxDepth: number,
  accent: string,
  s: number
) {
  const { x, y, angle, length, width, depth } = branch;

  // Slight organic wobble along the segment via seeded noise rather than a
  // perfectly straight line, so veins read as tissue rather than wireframe.
  const wobble = (rng.noise(x * 0.01, y * 0.01) - 0.5) * 0.4;
  const segAngle = angle + wobble;

  const endX = x + Math.cos(segAngle) * length;
  const endY = y + Math.sin(segAngle) * length;

  const isHighlight = rng.random() < 0.08;
  const t = depth / Math.max(1, maxDepth);
  const darkness = 30 + t * 10; // deeper branches read slightly lighter/thinner

  ctx.strokeStyle = isHighlight ? accent : `rgba(${darkness}, ${darkness + 6}, ${darkness + 10}, ${0.75 - t * 0.25})`;
  ctx.lineWidth = Math.max(0.5, width);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  if (depth >= maxDepth || width < 0.6 * s) return;

  // Split into two children at a seeded interval, each branch taking a
  // randomized angle offset off the parent's heading.
  const splitCount = rng.random() < 0.85 ? 2 : 1;
  for (let i = 0; i < splitCount; i++) {
    const side = i === 0 ? -1 : 1;
    const spread = rng.random(0.25, 0.75) * side;
    const childAngle = segAngle + spread;
    const taper = rng.random(0.62, 0.82);

    growBranch(
      ctx,
      rng,
      {
        x: endX,
        y: endY,
        angle: childAngle,
        length: length * taper,
        width: width * taper,
        depth: depth + 1,
      },
      maxDepth,
      accent,
      s
    );
  }
}
