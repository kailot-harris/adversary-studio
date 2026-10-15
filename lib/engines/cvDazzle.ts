import { Rng } from "@/lib/mulberry32";
import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

export const cvDazzle: RenderEngine = {
  id: "cv_dazzle",
  label: "CV Dazzle",
  description: "Asymmetric contrast cuts, geometric camouflage, false landmark dots.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800; // all magic numbers below are tuned against the original 800px sketch

    ctx.fillStyle = "rgb(240, 240, 240)";
    ctx.fillRect(0, 0, size, size);

    // 1. Asymmetric Background Cuts
    const strips = rng.randomInt(4, 9);
    for (let i = 0; i < strips; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgb(0,0,0)" : "rgb(255,255,255)";
      ctx.beginPath();
      ctx.moveTo(rng.random(-100, 800) * s, 0);
      ctx.lineTo(rng.random(0, 900) * s, 0);
      ctx.lineTo(rng.random(0, 900) * s, size);
      ctx.lineTo(rng.random(-100, 800) * s, size);
      ctx.closePath();
      ctx.fill();
    }

    // 2. High-Contrast Spatial Interruptions
    const numBlocks = Math.round(rng.randomInt(10, 20) * (0.4 + params.density * 1.2));
    for (let i = 0; i < numBlocks; i++) {
      ctx.save();
      ctx.translate(rng.random(800) * s, rng.random(800) * s);
      ctx.rotate(rng.random(Math.PI * 2));

      const r = rng.random(1);
      if (r < 0.45) ctx.fillStyle = "rgb(0,0,0)";
      else if (r < 0.88) ctx.fillStyle = "rgb(255,255,255)";
      else ctx.fillStyle = hsb(params.accentHue, 100, 100);

      const sizeMul = 0.6 + params.scale * 1.1;
      const w = rng.random(40, 250) * s * sizeMul;
      const h = rng.random(20, 80) * s * sizeMul;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, rng.random(-20, 20) * s);
      ctx.lineTo(w * 0.8, h);
      ctx.lineTo(0, h * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 3. Simulated False Landmarks
    const falseEyes = rng.randomInt(3, 8);
    for (let i = 0; i < falseEyes; i++) {
      const x = rng.random(100, 700) * s;
      const y = rng.random(100, 700) * s;
      const eyeDist = rng.random(30, 70) * s;

      const r1 = rng.random(15, 30) * s;
      const r2 = rng.random(15, 30) * s;
      ctx.fillStyle = "rgb(0,0,0)";
      circle(ctx, x - eyeDist / 2, y, r1);
      circle(ctx, x + eyeDist / 2, y, r2);

      ctx.fillStyle = "rgb(255,255,255)";
      circle(ctx, x - eyeDist / 2, y, rng.random(5, 10) * s);
      circle(ctx, x + eyeDist / 2, y, rng.random(5, 10) * s);
    }
  },
};

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, d: number) {
  ctx.beginPath();
  ctx.arc(x, y, d / 2, 0, Math.PI * 2);
  ctx.fill();
}
