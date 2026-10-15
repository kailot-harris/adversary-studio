import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Gait Scramble: overlays several skeletal stick-figure fragments walking
 * through a gait cycle, each with a different (and contradictory) joint-angle
 * phase offset and limb-swing amplitude, so gait-recognition silhouette
 * extraction sees a smeared, multi-phase skeleton instead of one coherent
 * walking cycle.
 */
export const gaitScramble: RenderEngine = {
  id: "gait_scramble",
  label: "Gait Scramble",
  description:
    "Overlaid skeletal stick-figure fragments with contradictory joint-angle phase to disrupt gait-recognition silhouettes.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(10,12,15)";
    ctx.fillRect(0, 0, size, size);

    // Faint ground reference lines (disrupted gait-cycle "stance line" grid).
    ctx.strokeStyle = "rgba(40,50,60,0.6)";
    ctx.lineWidth = 1;
    for (let y = 100; y < 800; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y * s);
      ctx.lineTo(size, y * s);
      ctx.stroke();
    }

    // Number of overlaid skeleton figures scales with density (3-10).
    const figureCount = 3 + Math.round(rng.random(0, 7) * (0.4 + params.density));
    // Overall limb length scales with scale param.
    const limbScale = 0.6 + params.scale * 1.2;
    // Phase-contradiction spread scales with frequency: higher frequency ->
    // more wildly contradictory joint-angle phases between figures.
    const phaseSpread = 0.5 + params.frequency * 3.5;

    for (let f = 0; f < figureCount; f++) {
      const hipX = rng.random(120, 680) * s;
      const hipY = rng.random(160, 640) * s;
      const phase = rng.random(0, Math.PI * 2) * phaseSpread;
      const hue = (params.accentHue + f * (360 / Math.max(1, figureCount)) * rng.random(0.4, 1)) % 360;
      const alpha = rng.random(0.35, 0.85);
      drawGaitSkeleton(ctx, rng, hipX, hipY, phase, limbScale * s, hue, alpha, f);
    }
  },
};

function drawGaitSkeleton(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  hipX: number,
  hipY: number,
  phase: number,
  limb: number,
  hue: number,
  alpha: number,
  idx: number
) {
  const torsoLen = limb * 1.8;
  const shoulderX = hipX;
  const shoulderY = hipY - torsoLen;
  const headR = limb * 0.35;

  const stroke = `hsla(${hue}, 85%, 65%, ${alpha})`;
  const jointColor = `hsla(${(hue + 40) % 360}, 95%, 70%, ${Math.min(1, alpha + 0.15)})`;

  ctx.lineCap = "round";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1.5, limb * 0.12);

  // Spine
  line(ctx, hipX, hipY, shoulderX, shoulderY);

  // Head
  ctx.beginPath();
  ctx.arc(shoulderX, shoulderY - headR, headR, 0, Math.PI * 2);
  ctx.strokeStyle = jointColor;
  ctx.stroke();

  // Contradictory joint-angle phase: each limb pair uses a swing function
  // driven by `phase`, but legs and arms are deliberately offset from each
  // other (and from a "true" walking cycle) by odd multiples so overlaid
  // figures never agree on which leg is forward.
  const legSwing = Math.sin(phase) * (Math.PI / 4.2);
  const legSwingOther = Math.sin(phase + Math.PI * rng.random(0.8, 1.3)) * (Math.PI / 4.2);
  const kneeBendA = Math.abs(Math.sin(phase * 1.7)) * (Math.PI / 5);
  const kneeBendB = Math.abs(Math.sin(phase * 1.7 + Math.PI)) * (Math.PI / 5);
  const armSwing = Math.sin(phase + Math.PI * rng.random(1.1, 1.9)) * (Math.PI / 3.5);
  const armSwingOther = Math.sin(phase + Math.PI * rng.random(0.1, 0.6)) * (Math.PI / 3.5);

  ctx.strokeStyle = stroke;

  // Legs: hip -> knee -> ankle, each leg with its own contradictory phase.
  drawLimb(ctx, hipX, hipY, Math.PI / 2 + legSwing, limb, kneeBendA, jointColor);
  drawLimb(ctx, hipX, hipY, Math.PI / 2 + legSwingOther, limb, kneeBendB, jointColor);

  // Arms: shoulder -> elbow -> wrist.
  drawLimb(ctx, shoulderX, shoulderY, -Math.PI / 2 + armSwing, limb * 0.85, kneeBendB * 0.8, jointColor);
  drawLimb(ctx, shoulderX, shoulderY, -Math.PI / 2 + armSwingOther, limb * 0.85, kneeBendA * 0.8, jointColor);

  // Hip joint marker
  ctx.fillStyle = jointColor;
  dot(ctx, hipX, hipY, limb * 0.1);
  dot(ctx, shoulderX, shoulderY, limb * 0.08);

  // Decoy motion-blur ghost offset, every other figure, to further smear
  // the silhouette a gait classifier would try to track frame-to-frame.
  if (idx % 2 === 0) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.translate(limb * 0.5 * rng.random(-1, 1), limb * 0.15 * rng.random(-1, 1));
    const ghostSwing = Math.sin(phase + Math.PI * 0.5) * (Math.PI / 4.2);
    drawLimb(ctx, hipX, hipY, Math.PI / 2 + ghostSwing, limb, kneeBendA, jointColor);
    ctx.restore();
  }
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
  dot(ctx, midX, midY, length * 0.07);
  dot(ctx, endX, endY, length * 0.06);
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
