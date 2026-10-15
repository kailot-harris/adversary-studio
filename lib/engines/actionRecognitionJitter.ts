import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Action Recognition Jitter: draws several contradictory limb-silhouette
 * poses, each rendered as a motion-blur "trail" of 3-5 offset copies at
 * decreasing opacity. A single static frame therefore implies several
 * mutually-contradictory moments of motion at once, which is designed to
 * confuse action-recognition models that temporally pool consecutive frames
 * into a single motion signature (the figure never agrees with itself about
 * which direction a limb was swinging).
 */
export const actionRecognitionJitter: RenderEngine = {
  id: "action_recognition_jitter",
  label: "Action Recognition Jitter",
  description:
    "Looped contradictory limb-silhouette sequences (single frame, implied motion via blur trails) to confuse action-recognition temporal pooling.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(8,9,12)";
    ctx.fillRect(0, 0, size, size);

    // Faint "frame index" ticks along the top, standing in for the dropped
    // temporal axis a single static image can only imply, not actually show.
    ctx.strokeStyle = "rgba(50,55,65,0.5)";
    ctx.lineWidth = 1;
    for (let x = 60; x < 800; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x * s, 0);
      ctx.lineTo(x * s, 18 * s);
      ctx.stroke();
    }

    // Number of overlaid figures scales with density (3-9).
    const figureCount = 3 + Math.round(rng.random(0, 6) * (0.4 + params.density));
    // Limb length scales with scale param.
    const limbScale = 0.55 + params.scale * 1.3;
    // Trail-copy offset (position/angle jitter between blur copies) scales
    // with frequency: higher frequency -> more wildly contradictory trail.
    const trailOffset = 0.3 + params.frequency * 2.2;

    for (let f = 0; f < figureCount; f++) {
      const originX = rng.random(110, 690) * s;
      const originY = rng.random(150, 650) * s;
      const basePose = rng.random(0, Math.PI * 2);
      const hue = (params.accentHue + f * (360 / Math.max(1, figureCount)) * rng.random(0.4, 1)) % 360;
      const trailCount = 3 + rng.randomInt(0, 3); // 3-5 trail copies per figure
      drawFigureTrail(ctx, rng, originX, originY, basePose, limbScale * s, trailOffset, hue, trailCount);
    }
  },
};

/**
 * Draws one stick-figure pose as `trailCount` motion-blur copies at
 * decreasing opacity, each offset in position/angle/limb-phase from the
 * last, so the copies disagree about where the limbs actually are.
 */
function drawFigureTrail(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  originX: number,
  originY: number,
  basePose: number,
  limb: number,
  trailOffset: number,
  hue: number,
  trailCount: number
) {
  // Per-trail direction of contradiction: each copy swings limb phase by an
  // odd multiple so no two copies agree on a single coherent direction of
  // motion (the "contradictory" part of the brief).
  const swingDir = rng.random(0, 1) < 0.5 ? 1 : -1;

  for (let t = 0; t < trailCount; t++) {
    const trailFrac = t / Math.max(1, trailCount - 1); // 0 (sharpest/front) .. 1 (faintest/oldest)
    const alpha = Math.max(0.08, 0.9 - trailFrac * 0.75);

    // Each trail copy is offset in position and pose phase from the base,
    // growing with `t` so later copies read as "earlier, smeared" frames.
    const posJitterX = Math.cos(basePose * 3 + t * 1.7) * trailOffset * limb * 0.25 * t * swingDir;
    const posJitterY = Math.sin(basePose * 2 + t * 2.3) * trailOffset * limb * 0.15 * t;
    const posePhase = basePose + swingDir * t * (0.35 + trailOffset * 0.3) + rng.random(-0.15, 0.15);

    const cx = originX + posJitterX;
    const cy = originY + posJitterY;

    drawPoseSilhouette(ctx, cx, cy, posePhase, limb, hue, alpha, t);
  }
}

/** Draws a single stick-figure pose (head/torso/two legs/two arms) at a given phase. */
function drawPoseSilhouette(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  phase: number,
  limb: number,
  hue: number,
  alpha: number,
  trailIdx: number
) {
  const torsoLen = limb * 1.7;
  const shoulderX = hipX + Math.cos(phase * 0.6) * limb * 0.12;
  const shoulderY = hipY - torsoLen;
  const headR = limb * 0.3;

  const stroke = `hsla(${hue}, 80%, 62%, ${alpha})`;
  const jointColor = `hsla(${(hue + 35) % 360}, 90%, 68%, ${Math.min(1, alpha + 0.1)})`;

  ctx.lineCap = "round";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, limb * 0.1 * (1 - trailIdx * 0.08));

  // Spine
  line(ctx, hipX, hipY, shoulderX, shoulderY);

  // Head
  ctx.beginPath();
  ctx.arc(shoulderX, shoulderY - headR, headR, 0, Math.PI * 2);
  ctx.strokeStyle = jointColor;
  ctx.stroke();
  ctx.strokeStyle = stroke;

  // Legs: contradictory swing between the two legs at this phase.
  const legSwingA = Math.sin(phase) * (Math.PI / 4);
  const legSwingB = Math.sin(phase + Math.PI * 0.85) * (Math.PI / 4);
  const kneeBendA = Math.abs(Math.sin(phase * 1.6)) * (Math.PI / 4.5);
  const kneeBendB = Math.abs(Math.sin(phase * 1.6 + Math.PI)) * (Math.PI / 4.5);
  drawLimb(ctx, hipX, hipY, Math.PI / 2 + legSwingA, limb, kneeBendA, jointColor);
  drawLimb(ctx, hipX, hipY, Math.PI / 2 + legSwingB, limb, kneeBendB, jointColor);

  // Arms: contradictory swing between the two arms, independent of the legs.
  const armSwingA = Math.sin(phase + Math.PI * 1.4) * (Math.PI / 3.2);
  const armSwingB = Math.sin(phase + Math.PI * 0.3) * (Math.PI / 3.2);
  drawLimb(ctx, shoulderX, shoulderY, -Math.PI / 2 + armSwingA, limb * 0.8, kneeBendB * 0.7, jointColor);
  drawLimb(ctx, shoulderX, shoulderY, -Math.PI / 2 + armSwingB, limb * 0.8, kneeBendA * 0.7, jointColor);

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
