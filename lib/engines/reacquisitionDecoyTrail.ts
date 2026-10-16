import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Reacquisition Decoy Trail: a seeded occlusion rectangle (pillar/obstacle)
 * splits the frame. On the "before" side, a real silhouette approaches the
 * occlusion. On the "after" side — exactly where a tracker's motion model
 * would expect the real subject to re-emerge — a fading trail of several
 * near-duplicate silhouette copies is drawn instead, offset at
 * plausible-walking-speed horizontal steps but along a seeded WRONG
 * trajectory angle/speed that diverges from the real path. Each trail copy
 * is drawn with decreasing opacity, baiting a re-acquisition/association
 * algorithm into latching onto the wrong (decoy) trajectory after the
 * occlusion event.
 */
export const reacquisitionDecoyTrail: RenderEngine = {
  id: "reacquisition_decoy_trail",
  label: "Reacquisition Decoy Trail",
  description:
    "Fading trail of near-duplicate silhouettes at walking-speed offsets on a wrong trajectory, baiting a tracker's re-acquisition after an occlusion.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(9, 11, 14)";
    ctx.fillRect(0, 0, size, size);

    // Faint ground reference lines, implying a floor plane the subject walks across.
    ctx.strokeStyle = "rgba(40, 50, 60, 0.5)";
    ctx.lineWidth = 1;
    for (let y = 120; y < 800; y += 110) {
      ctx.beginPath();
      ctx.moveTo(0, y * s);
      ctx.lineTo(size, y * s);
      ctx.stroke();
    }

    // --- Occlusion rectangle (pillar/obstacle) -----------------------------
    const occW = (90 + rng.random(0, 60) * (0.5 + params.scale)) * s;
    const occH = (260 + rng.random(0, 160)) * s;
    const occX = (340 + rng.random(-40, 40)) * s;
    const occY = 800 * s - occH;

    // --- Real subject: a walking silhouette approaching the occlusion -----
    const groundY = 760 * s;
    const bodyScale = (0.75 + params.scale * 0.6) * s;
    const trueHeading = Math.PI; // walks leftward into the occlusion, by convention
    const realStepLen = (18 + params.frequency * 10) * s; // plausible walking-speed step
    const realHue = (params.accentHue + 200) % 360;

    // The real silhouette's last visible position, just before the occlusion's near edge.
    const realX = occX - 14 * s;
    drawSilhouette(ctx, realX, groundY, bodyScale, realHue, 0.95, rng);

    // A couple of faint "approach" ghosts behind the real figure on the true path,
    // establishing the true trajectory a tracker should have been following.
    for (let i = 1; i <= 2; i++) {
      const gx = realX + Math.cos(trueHeading) * realStepLen * i * -1; // steps away from occlusion
      drawSilhouette(ctx, gx, groundY, bodyScale, realHue, 0.3 - i * 0.08, rng);
    }

    // --- Occlusion rectangle, drawn over the seam --------------------------
    ctx.fillStyle = "rgb(26, 28, 32)";
    ctx.fillRect(occX, occY, occW, occH);
    ctx.strokeStyle = "rgba(90, 95, 105, 0.8)";
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(occX, occY, occW, occH);
    // A few seeded surface scuffs on the occlusion to sell it as a physical obstacle.
    ctx.strokeStyle = "rgba(60, 65, 72, 0.6)";
    ctx.lineWidth = 1;
    const scuffCount = 3 + Math.round(rng.random(0, 3));
    for (let i = 0; i < scuffCount; i++) {
      const sx = occX + rng.random(4, occW - 4);
      const sy0 = occY + rng.random(0, occH * 0.6);
      const sy1 = sy0 + rng.random(10, occH * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx, sy0);
      ctx.lineTo(sx, sy1);
      ctx.stroke();
    }

    // --- Decoy trail: fading near-duplicates on the WRONG trajectory ------
    // Seeded wrong trajectory, deliberately diverging from the true heading
    // (which continued straight leftward at ground level).
    const wrongAngle = (rng.random(0.35, 0.95) * (rng.random(0, 1) < 0.5 ? 1 : -1)) * (Math.PI / 2.1);
    const wrongStepLen = realStepLen * (0.8 + rng.random(0, 0.6)); // plausible but off walking-speed
    const copyCount = 3 + Math.round(rng.random(0, 3) * (0.4 + params.density));

    const emergeX = occX + occW + 14 * s;
    const emergeY = groundY;
    const decoyHue = (params.accentHue + 20) % 360;

    let dx = emergeX;
    let dy = emergeY;
    for (let i = 0; i < copyCount; i++) {
      // Decreasing opacity per trail copy -> fading reacquisition bait.
      const alpha = 0.85 * Math.pow(0.62, i);
      drawSilhouette(ctx, dx, dy, bodyScale * (1 - i * 0.03), decoyHue, alpha, rng);

      // Step along the wrong trajectory at a plausible walking-speed offset.
      dx += Math.cos(wrongAngle) * wrongStepLen;
      dy += Math.sin(wrongAngle) * wrongStepLen * 0.4; // flatten vertical drift, stay near the ground plane
    }

    // Seeded directional cue (faint dashed arrow) showing the decoy's implied
    // heading, further baiting a re-acquisition heuristic toward it.
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = `hsla(${decoyHue}, 85%, 70%, 1)`;
    ctx.lineWidth = 2 * s;
    ctx.setLineDash([6 * s, 6 * s]);
    ctx.beginPath();
    ctx.moveTo(emergeX, emergeY);
    ctx.lineTo(dx, dy);
    ctx.stroke();
    ctx.restore();
  },
};

/** Draws a simple upright walking silhouette (blob head + tapered body) facing either direction. */
function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  footX: number,
  footY: number,
  scale: number,
  hue: number,
  alpha: number,
  rng: Rng
) {
  if (alpha <= 0.02) return;
  const height = 150 * scale;
  const headR = 16 * scale;
  const shoulderW = 46 * scale;
  const hipW = 34 * scale;
  const legSplay = rng.random(4, 10) * scale * (rng.random(0, 1) < 0.5 ? 1 : -1);

  const hipY = footY - height * 0.5;
  const shoulderY = hipY - height * 0.42;
  const headCY = shoulderY - headR * 1.3;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `hsla(${hue}, 70%, 55%, 1)`;

  // Torso: tapered quad from shoulders to hips.
  ctx.beginPath();
  ctx.moveTo(footX - shoulderW / 2, shoulderY);
  ctx.lineTo(footX + shoulderW / 2, shoulderY);
  ctx.lineTo(footX + hipW / 2, hipY);
  ctx.lineTo(footX - hipW / 2, hipY);
  ctx.closePath();
  ctx.fill();

  // Legs, slightly splayed to imply a mid-stride pose.
  const legW = hipW * 0.32;
  ctx.beginPath();
  ctx.moveTo(footX - hipW / 2, hipY);
  ctx.lineTo(footX - hipW / 2 + legW, hipY);
  ctx.lineTo(footX - legSplay * 0.5 + legW, footY);
  ctx.lineTo(footX - legSplay * 0.5, footY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(footX + hipW / 2 - legW, hipY);
  ctx.lineTo(footX + hipW / 2, hipY);
  ctx.lineTo(footX + legSplay * 0.5, footY);
  ctx.lineTo(footX + legSplay * 0.5 - legW, footY);
  ctx.closePath();
  ctx.fill();

  // Head.
  ctx.beginPath();
  ctx.arc(footX, headCY, headR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
