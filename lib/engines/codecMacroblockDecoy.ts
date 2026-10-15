import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Tiles the canvas into variable-size macroblocks (classic 16x16-ish
 * motion-compensation grid, sized by `scale`), fills each with a flat
 * seeded brightness step to imitate a motion-compensated prediction block,
 * draws sparse seeded-direction "motion vector" arrows from a subset of
 * block centers (driven by `density`), and overlays occasional bright/dark
 * 1-2px blocking-artifact seams along a subset of block boundaries — the
 * whole thing reads like genuine H.264/HEVC macroblock compression
 * artifacts rather than deliberately added noise, which is exactly the
 * confusion this is meant to cause in deepfake/tamper detectors that use
 * compression-artifact consistency as a signal.
 */
export const codecMacroblockDecoy: RenderEngine = {
  id: "codec_macroblock_decoy",
  label: "Codec Macroblock Decoy",
  description: "Fake motion-compensation block boundaries and seam artifacts mimicking video-codec compression to confuse deepfake/tamper detectors.",

  render(ctx, size, rng, params: EngineParams) {
    // Dark neutral base — macroblocks read as flat luma steps against it.
    ctx.fillStyle = "rgb(18, 18, 20)";
    ctx.fillRect(0, 0, size, size);

    // Scale slider: macroblock edge length, classic codec grid is 8/16/32px
    // at native resolution; map scale 0-1 across that range, then convert
    // to this canvas's actual size.
    const coordScale = size / 1024; // native layout at 1024px cadence
    const blockNative = 8 + params.scale * 40; // ~8-48px native
    const block = Math.max(4, blockNative * coordScale);

    const cols = Math.max(1, Math.ceil(size / block));
    const rows = Math.max(1, Math.ceil(size / block));

    // Base luma per block, seeded per cell — flat fill mimicking a
    // motion-compensated prediction block (no per-pixel detail, just a
    // stepped brightness field like real codec macroblocks).
    const baseLuma: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        row.push(28 + rng.random() * 55); // brightness 28-83
      }
      baseLuma.push(row);
    }

    const accentColor = hsb(params.accentHue, 55, 90);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = c * block;
        const y0 = r * block;
        const w = Math.min(block, size - x0);
        const h = Math.min(block, size - y0);
        if (w <= 0 || h <= 0) continue;

        const luma = baseLuma[r][c];
        // Occasional accent-tinted "I-frame residual" block, sparse, driven
        // by density so denser renders show more colored prediction error.
        const useAccent = rng.random() < 0.06 + params.density * 0.1;
        ctx.fillStyle = useAccent ? accentColor : `rgb(${luma}, ${luma}, ${luma})`;
        ctx.globalAlpha = useAccent ? 0.5 : 1;
        ctx.fillRect(x0, y0, w, h);
        ctx.globalAlpha = 1;
      }
    }

    // Blocking-artifact seams: thin bright/dark 1-2px lines at a subset of
    // block boundaries, the classic DCT-blocking-artifact tell.
    ctx.save();
    for (let r = 0; r <= rows; r++) {
      const y = r * block;
      if (y < 0 || y > size) continue;
      if (rng.random() < 0.22) {
        const dark = rng.random() < 0.5;
        ctx.strokeStyle = dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.22)";
        ctx.lineWidth = Math.max(1, (1 + rng.random()) * coordScale);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
    }
    for (let c = 0; c <= cols; c++) {
      const x = c * block;
      if (x < 0 || x > size) continue;
      if (rng.random() < 0.22) {
        const dark = rng.random() < 0.5;
        ctx.strokeStyle = dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.22)";
        ctx.lineWidth = Math.max(1, (1 + rng.random()) * coordScale);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Sparse fake motion-vector arrows from a subset of block centers —
    // density controls how many blocks get an arrow drawn from their
    // center, each with a seeded direction/length imitating a real motion
    // vector field from inter-frame prediction.
    const mvProbability = 0.03 + params.density * 0.12;
    const mvColor = "rgba(255, 230, 60, 0.75)";
    ctx.save();
    ctx.strokeStyle = mvColor;
    ctx.fillStyle = mvColor;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rng.random() >= mvProbability) continue;
        const cx = c * block + block / 2;
        const cy = r * block + block / 2;
        if (cx > size || cy > size) continue;

        const angle = rng.random(0, Math.PI * 2);
        const len = (block * 0.3 + rng.random() * block * 0.5);
        const ex = cx + Math.cos(angle) * len;
        const ey = cy + Math.sin(angle) * len;

        ctx.lineWidth = Math.max(0.75, 1 * coordScale);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Small arrowhead.
        const headLen = Math.max(2, block * 0.14);
        const headAngle = Math.PI / 7;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - headLen * Math.cos(angle - headAngle),
          ey - headLen * Math.sin(angle - headAngle)
        );
        ctx.lineTo(
          ex - headLen * Math.cos(angle + headAngle),
          ey - headLen * Math.sin(angle + headAngle)
        );
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  },
};
