import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * HDR Bracket Ghost: simulates a botched HDR exposure-bracket merge on a
 * moving subject. For each silhouette, draws three misaligned copies that
 * stand in for the under-exposed, "normal", and over-exposed brackets a
 * real HDR pipeline would shoot in sequence: a dark/crushed-shadow copy, a
 * mid-tone copy, and a blown-out/clipped-highlight copy. Because the
 * subject moved slightly between shots, the three brackets don't register
 * to the same pixels — exactly like a tone-mapper/ghost-detection failure —
 * producing visible bright/dark fringing doubled along every edge. This is
 * meant to confuse HDR merge algorithms and exposure-bracket ghost-removal
 * detectors, which expect either perfectly aligned brackets or a single
 * coherent ghost-removed result.
 */
export const hdrBracketGhost: RenderEngine = {
  id: "hdr_bracket_ghost",
  label: "HDR Bracket Ghost",
  description:
    "Misaligned over/under-exposed silhouette copies mimicking a botched HDR exposure-bracket merge, confusing HDR ghost-detection/alignment algorithms.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(10,10,13)";
    ctx.fillRect(0, 0, size, size);

    // Subtle exposure-histogram readout in the corner, standing in for the
    // bracket metadata a real HDR pipeline would log.
    ctx.strokeStyle = "rgba(60,64,72,0.45)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const hx = (20 + i * 6) * s;
      const hh = (4 + rng.noise(i * 0.4, 0.5) * 22) * s;
      ctx.beginPath();
      ctx.moveTo(hx, 24 * s);
      ctx.lineTo(hx, (24 - hh / s) * s);
      ctx.stroke();
    }

    // Number of ghosted silhouettes scales with density (1-5).
    const shapeCount = 1 + Math.round(rng.random(0, 4) * (0.25 + params.density));
    const baseScale = 0.5 + params.scale * 1.4;
    // Misregistration offset between brackets: how far the exposures drift
    // apart, scaling with frequency (higher freq -> jumpier subject motion
    // between shots -> worse misalignment).
    const driftStrength = 6 + params.frequency * 46;

    for (let i = 0; i < shapeCount; i++) {
      const cx = rng.random(120, 680) * s;
      const cy = rng.random(140, 660) * s;
      const r = (40 + rng.random(0, 70)) * baseScale * s;
      const hue = (params.accentHue + i * (360 / Math.max(1, shapeCount)) * rng.random(0.5, 1)) % 360;
      const kind = rng.randomInt(0, 3); // 0: disc, 1: triangle-ish, 2: blob silhouette
      const driftAngle = rng.random(0, Math.PI * 2);

      drawBracketSet(ctx, rng, cx, cy, r, hue, kind, driftAngle, driftStrength * s);
    }
  },
};

/**
 * Draws the three misaligned exposure brackets (under, mid, over) for one
 * silhouette, each nudged along a seeded drift direction so their edges
 * don't register — producing the ghost-fringe doubling.
 */
function drawBracketSet(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  cx: number,
  cy: number,
  r: number,
  hue: number,
  kind: number,
  driftAngle: number,
  driftStrength: number
) {
  // Each bracket gets its own small seeded perpendicular jitter on top of
  // the shared drift direction, so the misalignment isn't a single clean
  // translation (which a merge algorithm could trivially correct for).
  const brackets: Array<{ label: "under" | "mid" | "over"; t: number; alpha: number; blend: string; lightness: number }> = [
    { label: "under", t: -1, alpha: 0.55, blend: "multiply", lightness: 14 },
    { label: "mid", t: 0, alpha: 0.75, blend: "source-over", lightness: 46 },
    { label: "over", t: 1, alpha: 0.5, blend: "screen", lightness: 86 },
  ];

  for (const b of brackets) {
    const jitterAngle = driftAngle + rng.random(-0.6, 0.6);
    const jitterMag = driftStrength * (0.3 + Math.abs(b.t) * 0.85) * rng.random(0.6, 1.1);
    const ox = cx + Math.cos(jitterAngle) * jitterMag;
    const oy = cy + Math.sin(jitterAngle) * jitterMag;
    const rot = rng.random(-0.12, 0.12) * (0.4 + Math.abs(b.t));
    const scaleJ = 1 + rng.random(-0.06, 0.06) * (0.5 + Math.abs(b.t));

    const sat = b.label === "mid" ? 70 : 35;
    const fill = `hsla(${hue}, ${sat}%, ${b.lightness}%, ${b.alpha})`;

    ctx.save();
    ctx.globalCompositeOperation = b.blend as GlobalCompositeOperation;
    ctx.translate(ox, oy);
    ctx.rotate(rot);
    ctx.scale(scaleJ, scaleJ);
    ctx.fillStyle = fill;
    drawSilhouette(ctx, r, kind);
    ctx.restore();
  }

  // A thin bright/dark edge fringe traced along the mid bracket's outline,
  // nudged slightly from the fill itself — the visible "ghost edge" seam.
  const fringeAngle = driftAngle + Math.PI * 0.5;
  const fringeMag = driftStrength * 0.4;
  ctx.save();
  ctx.globalCompositeOperation = "difference";
  ctx.translate(cx + Math.cos(fringeAngle) * fringeMag, cy + Math.sin(fringeAngle) * fringeMag);
  ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 60%, 70%, 0.4)`;
  ctx.lineWidth = Math.max(1, r * 0.03);
  drawSilhouette(ctx, r, kind, true);
  ctx.restore();
}

/**
 * Draws one of a few simple seeded silhouette shapes, filled or stroked,
 * centered on the current transform origin.
 */
function drawSilhouette(ctx: CanvasRenderingContext2D, r: number, kind: number, strokeOnly = false) {
  ctx.beginPath();
  if (kind === 0) {
    // Disc (stand-in for a head/round subject).
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else if (kind === 1) {
    // Triangular figure silhouette (stand-in for a person-shaped subject).
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.82, r * 0.7);
    ctx.lineTo(-r * 0.82, r * 0.7);
    ctx.closePath();
  } else {
    // Rounded blob silhouette built from a handful of radial bumps.
    const pts = 7;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const rr = r * (0.75 + 0.25 * Math.sin(a * 2.3 + kind));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  if (strokeOnly) ctx.stroke();
  else ctx.fill();
}
