import { Rng } from "@/lib/mulberry32";
import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/** A simple skeletal topology: joint index -> parent joint index (-1 = root). */
const SKELETON_PARENTS = [-1, 0, 1, 2, 1, 4, 5, 0, 7, 8, 0, 10, 11];

export const poseConfidenceFlood: RenderEngine = {
  id: "pose_confidence_flood",
  label: "Pose Confidence Flood",
  description:
    "Dense low-confidence skeletal-joint ghost clusters, dragging a pose estimator's per-joint confidence below tracking thresholds.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(10,11,14)";
    ctx.fillRect(0, 0, size, size);

    // Faint tracking grid, implying a pose-estimation debug overlay.
    ctx.strokeStyle = "rgba(40,48,58,0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i * s, 0);
      ctx.lineTo(i * s, size);
      ctx.moveTo(0, i * s);
      ctx.lineTo(size, i * s);
      ctx.stroke();
    }

    const clusterCount = Math.max(1, Math.round(rng.randomInt(4, 9) * (0.4 + params.density)));
    const limbLen = 34 * s * (0.5 + params.scale);
    const jitterSpread = 10 * s * (0.4 + params.frequency);

    for (let c = 0; c < clusterCount; c++) {
      const rootX = rng.random(90, 710) * s;
      const rootY = rng.random(90, 710) * s;
      const ghostCopies = rng.randomInt(2, 5);
      const baseAngle = rng.random(Math.PI * 2);
      drawLowConfidenceSkeleton(ctx, rng, rootX, rootY, limbLen, baseAngle, jitterSpread, ghostCopies, params, s);
    }
  },
};

function drawLowConfidenceSkeleton(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  rootX: number,
  rootY: number,
  limbLen: number,
  baseAngle: number,
  jitterSpread: number,
  ghostCopies: number,
  params: EngineParams,
  s: number
) {
  // Build one canonical pose (joint angles relative to parent), then re-render
  // several jittered, low-opacity "ghost" copies of it to imply tracking
  // confidence has collapsed into a diffuse cloud of candidate joints.
  const jointAngles: number[] = SKELETON_PARENTS.map(() => rng.random(Math.PI * 2));

  for (let g = 0; g < ghostCopies; g++) {
    const ghostOpacity = rng.random(0.08, 0.3) * (1 - g / (ghostCopies + 1));
    const offsetX = rng.random(-jitterSpread, jitterSpread);
    const offsetY = rng.random(-jitterSpread, jitterSpread);
    const angleJitter = rng.random(-0.35, 0.35);

    const joints: { x: number; y: number }[] = [];
    for (let j = 0; j < SKELETON_PARENTS.length; j++) {
      const parentIdx = SKELETON_PARENTS[j];
      if (parentIdx === -1) {
        joints.push({ x: rootX + offsetX, y: rootY + offsetY });
        continue;
      }
      const parent = joints[parentIdx];
      const angle = baseAngle + jointAngles[j] * 0.6 + angleJitter;
      const len = limbLen * rng.random(0.7, 1.3);
      joints.push({
        x: parent.x + Math.cos(angle) * len,
        y: parent.y + Math.sin(angle) * len,
      });
    }

    // Connecting bones, faint.
    ctx.strokeStyle = `rgba(230,236,240,${ghostOpacity.toFixed(3)})`;
    ctx.lineWidth = Math.max(0.6, 1.4 * s);
    for (let j = 1; j < SKELETON_PARENTS.length; j++) {
      const parentIdx = SKELETON_PARENTS[j];
      if (parentIdx === -1) continue;
      const a = joints[parentIdx];
      const b = joints[j];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Low-confidence joint dots, each an independent translucent accent blob.
    for (let j = 0; j < joints.length; j++) {
      const p = joints[j];
      const dotOpacity = ghostOpacity * rng.random(0.5, 1);
      const hue = (params.accentHue + rng.random(-20, 20) + 360) % 360;
      ctx.fillStyle = hsb(hue, rng.random(40, 80), 100).replace(
        "rgb(",
        "rgba("
      ).replace(")", `, ${dotOpacity.toFixed(3)})`);
      const r = rng.random(3, 8) * s * (0.5 + params.scale);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Wide, very faint "confidence halo" implying a spread-out probability field.
      ctx.fillStyle = `rgba(255,255,255,${(dotOpacity * 0.25).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * rng.random(2.5, 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
