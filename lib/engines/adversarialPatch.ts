import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

const PALETTE = [
  "rgb(255, 0, 120)", // Magenta
  "rgb(0, 240, 255)", // Cyan
  "rgb(255, 255, 0)", // Yellow
  "rgb(0, 255, 100)", // Neon green
];

export const adversarialPatch: RenderEngine = {
  id: "adversarial_patch",
  label: "Adversarial Patch",
  description: "Concentric deformed topological polygon vortex with CMYK/neon primaries.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(20,20,20)";
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);

    const rotSpeed = rng.random(6, 14);
    const layers = Math.round(rng.randomInt(50, 75) * (0.5 + params.density));
    const noiseIntensity = rng.random(40, 80) * (0.4 + params.frequency * 1.4);
    const radiusMul = 0.5 + params.scale * 1.2;

    for (let i = layers; i > 0; i--) {
      const progress = i / layers;

      ctx.save();
      ctx.rotate(Math.sin(progress * rotSpeed) * Math.PI);

      const col = i % 4;
      ctx.fillStyle = PALETTE[col];
      ctx.strokeStyle = "rgb(0,0,0)";
      ctx.lineWidth = rng.random(1.5, 3.5) * s;

      const points = rng.randomInt(12, 20);
      const verts: [number, number][] = [];
      for (let p = 0; p < points; p++) {
        const angle = (p / points) * Math.PI * 2;
        const radius = (i * 6.5 * radiusMul + rng.noise(p, progress * 4) * noiseIntensity) * s;
        verts.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
      }
      drawCurveClosed(ctx, verts);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  },
};

/** Approximates Processing's curveVertex/CLOSE (Catmull-Rom) with a closed smooth path. */
function drawCurveClosed(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    if (i === 0) ctx.moveTo(p1[0], p1[1]);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }
  ctx.closePath();
}
