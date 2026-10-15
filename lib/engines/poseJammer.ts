import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

export const poseJammer: RenderEngine = {
  id: "pose_jammer",
  label: "Pose Jammer",
  description: "Kinematic tree bone vectors, decoy Part Affinity Fields, glowing joint heatmaps.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(12,14,18)";
    ctx.fillRect(0, 0, size, size);

    // Coordinate grid
    ctx.strokeStyle = "rgb(30,40,50)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i * s, 0);
      ctx.lineTo(i * s, size);
      ctx.moveTo(0, i * s);
      ctx.lineTo(size, i * s);
      ctx.stroke();
    }

    const clusters = Math.round(rng.randomInt(3, 6) * (0.5 + params.density));
    for (let c = 0; c < clusters; c++) {
      const rootX = rng.random(150, 650) * s;
      const rootY = rng.random(150, 650) * s;
      drawKinematicTree(ctx, rng, rootX, rootY, rng.randomInt(8, 16), rng.random(40, 110) * s * (0.5 + params.scale), s);
    }
  },
};

function drawKinematicTree(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  startX: number,
  startY: number,
  jointCount: number,
  limbLen: number,
  s: number
) {
  let currX = startX;
  let currY = startY;

  for (let j = 0; j < jointCount; j++) {
    const angle = rng.random(Math.PI * 2);
    const nextX = currX + Math.cos(angle) * limbLen * rng.random(0.6, 1.4);
    const nextY = currY + Math.sin(angle) * limbLen * rng.random(0.6, 1.4);

    // Bones
    ctx.strokeStyle = "rgb(255,255,255)";
    ctx.lineWidth = rng.random(2, 5) * s;
    ctx.beginPath();
    ctx.moveTo(currX, currY);
    ctx.lineTo(nextX, nextY);
    ctx.stroke();

    // Decoy parallel Part Affinity Field vector
    if (rng.random(1) > 0.6) {
      ctx.strokeStyle = "rgba(0,240,255,0.7)";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(currX + 8 * s, currY - 8 * s);
      ctx.lineTo(nextX + 8 * s, nextY - 8 * s);
      ctx.stroke();
    }

    // Joint confidence halo
    ctx.fillStyle = "rgba(255,0,110,0.31)";
    circle(ctx, currX, currY, rng.random(20, 40) * s);

    // Joint core node
    ctx.fillStyle = j % 2 === 0 ? "rgb(0,255,180)" : "rgb(255,230,0)";
    circle(ctx, currX, currY, rng.random(8, 14) * s);

    // Decoy confidence target box
    if (rng.random(1) > 0.7) {
      ctx.strokeStyle = "rgba(255,255,0,0.63)";
      ctx.lineWidth = 1 * s;
      const boxS = rng.random(20, 35) * s;
      ctx.strokeRect(currX - boxS / 2, currY - boxS / 2, boxS, boxS);
    }

    if (rng.random(1) > 0.5) {
      currX = nextX;
      currY = nextY;
    }
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, d: number) {
  ctx.beginPath();
  ctx.arc(x, y, d / 2, 0, Math.PI * 2);
  ctx.fill();
}
