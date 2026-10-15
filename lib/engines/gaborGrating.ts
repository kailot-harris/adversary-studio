import { EngineParams, RenderEngine } from "./types";

export const gaborGrating: RenderEngine = {
  id: "gabor_grating",
  label: "Gabor Grating",
  description: "Conflicting directional frequency line patches (Op-Art) with concentric lens.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;
    ctx.fillStyle = "rgb(10,10,10)";
    ctx.fillRect(0, 0, size, size);

    const patches = Math.round(rng.randomInt(12, 22) * (0.5 + params.density));

    for (let p = 0; p < patches; p++) {
      ctx.save();
      ctx.translate(rng.random(100, 700) * s, rng.random(100, 700) * s);

      const angle = Math.floor(rng.random(8)) * (Math.PI / 4);
      ctx.rotate(angle);

      const sizeMul = 0.5 + params.scale * 1.2;
      const patchW = rng.random(180, 360) * s * sizeMul;
      const patchH = rng.random(180, 360) * s * sizeMul;
      const freq = rng.random(6, 16) * s * (0.4 + (1 - params.frequency) * 1.4);

      const isChromatic = rng.random(1) > 0.75;

      for (let x = -patchW / 2; x < patchW / 2; x += freq) {
        if (isChromatic) {
          ctx.strokeStyle = rng.random(1) > 0.5 ? "rgb(255,0,100)" : "rgb(0,255,220)";
          ctx.lineWidth = freq * 0.45;
        } else {
          ctx.strokeStyle = "rgb(245,245,245)";
          ctx.lineWidth = freq * 0.4;
        }
        ctx.beginPath();
        ctx.moveTo(x, -patchH / 2);
        ctx.lineTo(x, patchH / 2);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgb(0,0,0)";
      ctx.lineWidth = rng.random(4, 8) * s;
      ctx.strokeRect(-patchW / 2, -patchH / 2, patchW, patchH);

      ctx.restore();
    }

    // Concentric interference lens overlay
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = "rgb(0,0,0)";
    ctx.lineWidth = 12 * s;
    ctx.beginPath();
    ctx.arc(0, 0, (520 / 2) * s, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgb(255,255,255)";
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(0, 0, (520 / 2) * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};
