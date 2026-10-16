import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Frame Interpolation Ghost: draws a seeded stick-figure pose at a "start"
 * position and a second pose at an "end" position, then draws 2-3
 * semi-transparent "interpolated" ghost poses at linearly-blended in-between
 * positions/angles. Unlike a clean blend, each interpolated ghost gets a
 * subtle warped/distorted limb offset — the kind of swim/tear artifact real
 * optical-flow frame-interpolation (and frame-rate upconversion) produces
 * when it can't correctly match corresponding points between two real
 * frames. The goal is to confuse temporal-consistency checks used by
 * frame-rate-upconversion detectors and deepfake temporal artifact
 * classifiers, which expect either a single coherent pose or a physically
 * plausible smooth blend — not a warped in-between.
 */
export const frameInterpolationGhost: RenderEngine = {
  id: "frame_interpolation_ghost",
  label: "Frame Interpolation Ghost",
  description:
    "Semi-transparent in-between-pose ghost frames with warped limb artifacts, mimicking optical-flow frame-interpolation failures to confuse frame-rate-upconversion/deepfake temporal checks.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(7,8,11)";
    ctx.fillRect(0, 0, size, size);

    // Faint frame-timeline ticks along the bottom, standing in for the two
    // real "keyframes" an interpolator would be bridging.
    ctx.strokeStyle = "rgba(48,54,64,0.5)";
    ctx.lineWidth = 1;
    for (let x = 60; x < 800; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x * s, 782 * s);
      ctx.lineTo(x * s, 800 * s);
      ctx.stroke();
    }

    // Number of pose pairs scales with density (1-4).
    const pairCount = 1 + Math.round(rng.random(0, 3) * (0.3 + params.density));
    const limbScale = 0.55 + params.scale * 1.3;
    // Number of in-between ghost frames (2-3), biased by frequency.
    const ghostCount = params.frequency > 0.5 ? 3 : 2;
    // Warp strength: how much the interpolated ghosts distort vs. a clean
    // linear blend, scaling with frequency (higher freq -> more broken flow).
    const warpStrength = 0.25 + params.frequency * 1.4;

    for (let p = 0; p < pairCount; p++) {
      const startX = rng.random(120, 680) * s;
      const startY = rng.random(180, 620) * s;
      const endX = startX + rng.random(-220, 220) * s;
      const endY = startY + rng.random(-160, 160) * s;
      const startPhase = rng.random(0, Math.PI * 2);
      const endPhase = startPhase + rng.random(-Math.PI, Math.PI);
      const hue = (params.accentHue + p * (360 / Math.max(1, pairCount)) * rng.random(0.4, 1)) % 360;

      drawPosePair(
        ctx,
        rng,
        startX,
        startY,
        endX,
        endY,
        startPhase,
        endPhase,
        limbScale * s,
        hue,
        ghostCount,
        warpStrength
      );
    }
  },
};

/**
 * Draws a start pose, an end pose, and `ghostCount` semi-transparent
 * interpolated ghost poses at linearly-blended positions/angles — each
 * warped away from the clean blend by a seeded per-limb offset.
 */
function drawPosePair(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  startPhase: number,
  endPhase: number,
  limb: number,
  hue: number,
  ghostCount: number,
  warpStrength: number
) {
  // The two real "keyframes": fully opaque, drawn first so ghosts overlay them.
  drawPoseSilhouette(ctx, startX, startY, startPhase, limb, hue, 0.95, 0, 0);
  drawPoseSilhouette(ctx, endX, endY, endPhase, limb, (hue + 20) % 360, 0.95, 0, 0);

  // Each ghost gets its own seeded warp direction/magnitude per limb pair,
  // so the distortion reads as optical-flow "tearing" rather than a
  // uniform shift.
  const warpSeedX = rng.random(-1, 1);
  const warpSeedY = rng.random(-1, 1);
  const warpFreq = rng.random(1.5, 3.5);

  for (let g = 1; g <= ghostCount; g++) {
    const t = g / (ghostCount + 1); // strictly between 0 and 1
    const alpha = 0.32 * (1 - Math.abs(t - 0.5) * 0.4); // slightly fainter at the ends

    // Clean linear blend of position and pose phase.
    const blendX = startX + (endX - startX) * t;
    const blendY = startY + (endY - startY) * t;
    const blendPhase = startPhase + (endPhase - startPhase) * t;

    // Warp offset: a seeded sinusoidal wobble peaking mid-interpolation
    // (optical flow is most wrong furthest from either real keyframe),
    // applied to position, phase, and overall limb length independently
    // so arms/legs appear to swim rather than translate cleanly.
    const warpEnvelope = Math.sin(t * Math.PI); // 0 at ends, 1 at midpoint
    const warpX = Math.cos(warpFreq * t * Math.PI * 2 + warpSeedX * 10) * warpStrength * limb * 0.18 * warpEnvelope;
    const warpY = Math.sin(warpFreq * t * Math.PI * 2 + warpSeedY * 10) * warpStrength * limb * 0.18 * warpEnvelope;
    const warpPhase = warpEnvelope * warpStrength * 0.5 * Math.sin(warpFreq * t * Math.PI * 3);
    const limbWarp = limb * (1 + warpEnvelope * warpStrength * 0.22 * Math.cos(warpFreq * t * Math.PI));

    const ghostHue = (hue + 10 * g) % 360;
    drawPoseSilhouette(ctx, blendX + warpX, blendY + warpY, blendPhase + warpPhase, limbWarp, ghostHue, alpha, warpEnvelope, g);
  }
}

/**
 * Draws a single stick-figure pose (head/torso/two legs/two arms) at a
 * given phase/position. `limbDesync` (0-1) additionally desyncs the two
 * limbs of each pair from each other — used by interpolated ghosts to
 * mimic optical flow matching each limb slightly differently.
 */
function drawPoseSilhouette(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  phase: number,
  limb: number,
  hue: number,
  alpha: number,
  limbDesync: number,
  ghostIdx: number
) {
  const torsoLen = limb * 1.7;
  const shoulderX = hipX + Math.cos(phase * 0.6) * limb * 0.12;
  const shoulderY = hipY - torsoLen;
  const headR = limb * 0.3;

  const stroke = `hsla(${hue}, 80%, 62%, ${alpha})`;
  const jointColor = `hsla(${(hue + 35) % 360}, 90%, 68%, ${Math.min(1, alpha + 0.12)})`;

  ctx.lineCap = "round";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, limb * 0.1 * (1 - ghostIdx * 0.04));

  // Spine
  line(ctx, hipX, hipY, shoulderX, shoulderY);

  // Head
  ctx.beginPath();
  ctx.arc(shoulderX, shoulderY - headR, headR, 0, Math.PI * 2);
  ctx.strokeStyle = jointColor;
  ctx.stroke();
  ctx.strokeStyle = stroke;

  // Legs: the desync term, present only on interpolated ghosts, makes the
  // two legs disagree slightly about where the blended pose actually puts
  // them — the warped-limb artifact the brief calls for.
  const legSwingA = Math.sin(phase) * (Math.PI / 4);
  const legSwingB = Math.sin(phase + Math.PI * 0.85 + limbDesync * 0.6) * (Math.PI / 4);
  const kneeBendA = Math.abs(Math.sin(phase * 1.6)) * (Math.PI / 4.5);
  const kneeBendB = Math.abs(Math.sin(phase * 1.6 + Math.PI - limbDesync * 0.5)) * (Math.PI / 4.5);
  drawLimb(ctx, hipX, hipY, Math.PI / 2 + legSwingA, limb, kneeBendA, jointColor);
  drawLimb(ctx, hipX, hipY, Math.PI / 2 + legSwingB, limb * (1 + limbDesync * 0.08), kneeBendB, jointColor);

  // Arms: same desync treatment, independent of the legs.
  const armSwingA = Math.sin(phase + Math.PI * 1.4) * (Math.PI / 3.2);
  const armSwingB = Math.sin(phase + Math.PI * 0.3 - limbDesync * 0.6) * (Math.PI / 3.2);
  drawLimb(ctx, shoulderX, shoulderY, -Math.PI / 2 + armSwingA, limb * 0.8, kneeBendB * 0.7, jointColor);
  drawLimb(
    ctx,
    shoulderX,
    shoulderY,
    -Math.PI / 2 + armSwingB,
    limb * 0.8 * (1 - limbDesync * 0.08),
    kneeBendA * 0.7,
    jointColor
  );

  // Joint markers
  ctx.fillStyle = jointColor;
  dot(ctx, hipX, hipY, limb * 0.09);
  dot(ctx, shoulderX, shoulderY, limb * 0.07);
}

/** Draws a two-segment limb (upper + lower) bent at a knee/elbow joint. */
function drawLimb(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  angle: number,
  length: number,
  bend: number,
  jointColor: string
) {
  const upperLen = length * 0.55;
  const lowerLen = length * 0.5;

  const midX = originX + Math.cos(angle) * upperLen;
  const midY = originY + Math.sin(angle) * upperLen;

  const endAngle = angle + bend;
  const endX = midX + Math.cos(endAngle) * lowerLen;
  const endY = midY + Math.sin(endAngle) * lowerLen;

  line(ctx, originX, originY, midX, midY);
  line(ctx, midX, midY, endX, endY);

  ctx.fillStyle = jointColor;
  dot(ctx, midX, midY, length * 0.06);
  dot(ctx, endX, endY, length * 0.05);
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
