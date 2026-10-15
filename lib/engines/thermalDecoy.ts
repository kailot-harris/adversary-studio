import { Rng } from "@/lib/mulberry32";
import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * thermal_decoy: reuses cv_dazzle's asymmetric blob/placement logic, but
 * instead of high-contrast black/white facial-dazzle shapes, it paints soft
 * radial-gradient "heat blobs" in a false-color IR palette (black -> red ->
 * yellow -> white) to confuse thermal/IR camera classifiers with plausible-
 * looking but fake heat signatures.
 */
export const thermalDecoy: RenderEngine = {
  id: "thermal_decoy",
  label: "Thermal Decoy",
  description: "False heat-blob gradients in an IR false-color palette to confuse thermal cameras.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800; // tuned against an 800px reference canvas, like the other ported engines

    // Cold background: thermal imaging renders unheated surfaces near-black,
    // with a very faint blue-violet cast (common in IR false-color palettes).
    ctx.fillStyle = "rgb(6, 4, 14)";
    ctx.fillRect(0, 0, size, size);

    // 1. Asymmetric diagonal "cold cuts" — same placement idea as cv_dazzle's
    // background strips, but low-contrast dark-blue/black bands instead of
    // stark black/white, so they read as thermal gradient noise, not edges.
    const strips = rng.randomInt(3, 7);
    for (let i = 0; i < strips; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgb(4, 2, 10)" : "rgb(14, 6, 24)";
      ctx.beginPath();
      ctx.moveTo(rng.random(-100, 800) * s, 0);
      ctx.lineTo(rng.random(0, 900) * s, 0);
      ctx.lineTo(rng.random(0, 900) * s, size);
      ctx.lineTo(rng.random(-100, 800) * s, size);
      ctx.closePath();
      ctx.fill();
    }

    // 2. False heat blobs: soft radial gradients from a white-hot (or
    // accent-tinted) core through yellow and red to transparent, dropped at
    // asymmetric positions/sizes — the "dazzle" placement logic, re-skinned.
    const numBlobs = Math.round(rng.randomInt(8, 18) * (0.4 + params.density * 1.3));
    const sizeMul = 0.6 + params.scale * 1.4;

    for (let i = 0; i < numBlobs; i++) {
      const cx = rng.random(800) * s;
      const cy = rng.random(800) * s;
      const r = rng.random(40, 180) * s * sizeMul;

      // Core temperature: most blobs sit on the standard IR ramp (white-hot
      // core); a minority are "decoy" blobs recolored toward the accent hue,
      // i.e. a fake heat signature that doesn't match the ambient ramp.
      const isDecoy = rng.random(1) > 0.72;
      const core = isDecoy ? hsb(params.accentHue, 35, 100) : "rgb(255, 255, 240)";
      const mid1 = isDecoy ? hsb(params.accentHue, 70, 95) : "rgb(255, 225, 60)";
      const mid2 = isDecoy ? hsb(params.accentHue, 90, 70) : "rgb(230, 70, 10)";
      const edge = isDecoy ? hsb(params.accentHue, 100, 35) : "rgb(90, 10, 10)";

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, core);
      grad.addColorStop(0.28, mid1);
      grad.addColorStop(0.62, mid2);
      grad.addColorStop(0.85, edge);
      grad.addColorStop(1, "rgba(6, 4, 14, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Pinpoint false hotspots: small, very bright near-white cores dropped
    // independently of the big blobs — mimics isolated false-positive heat
    // sources (e.g. a decoy "face" the dazzle logic used eyes for).
    const hotspots = rng.randomInt(2, 6);
    for (let i = 0; i < hotspots; i++) {
      const cx = rng.random(100, 700) * s;
      const cy = rng.random(100, 700) * s;
      const r = rng.random(8, 22) * s * (0.6 + params.scale * 0.8);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, "rgb(255, 255, 255)");
      grad.addColorStop(0.5, "rgb(255, 240, 180)");
      grad.addColorStop(1, "rgba(255, 200, 80, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
