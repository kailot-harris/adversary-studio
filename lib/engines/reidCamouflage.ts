import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Repeating, high-contrast color-blocked tiling meant to visually echo
 * adversarial clothing-texture patterns engineered to collide with person
 * re-identification (ReID) embedding space: a periodic grid of rectangular
 * color blocks, each block internally split into a small number of solid
 * sub-swatches (mimicking a printed camouflage "tile" unit), with a strong
 * accent-hue family mixed in at a seeded rate so the tiling isn't a clean,
 * uniform textile print but reads as deliberately perturbed. The tile unit
 * itself repeats periodically across the canvas (same seeded palette +
 * sub-swatch layout reused per period), echoing the "repeating" structure
 * called for by the ReID-confusion brief, while per-instance jitter and a
 * rotated overlay grid keep it from looking like inert wallpaper.
 */
export const reidCamouflage: RenderEngine = {
  id: "reid_camouflage",
  label: "ReID Camouflage",
  description:
    "Repeating high-contrast color-blocked clothing-texture tiles engineered to collide with person re-identification embeddings.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Neutral dark backing so the blocks read as a printed-fabric swatch.
    ctx.fillStyle = "rgb(24, 22, 26)";
    ctx.fillRect(0, 0, size, size);

    // Scale slider: footprint of one repeating tile unit, in native px.
    const tileNative = 70 + params.scale * 160;
    const tile = tileNative * coordScale;

    // Density slider: how many sub-blocks subdivide each tile (2x2..5x5) —
    // denser tiles mean finer-grained color-block texture, closer to real
    // adversarial clothing-texture prints.
    const subdiv = 2 + Math.round(params.density * 3);

    // Frequency slider: period (in tile units) before the seeded palette
    // repeats — lower frequency = longer repeat period = looks less uniform;
    // higher frequency = short period = strong, obvious periodic structure
    // (closer to the "repeating pattern" the ReID-confusion brief calls for).
    const periodTiles = 1 + Math.round((1 - params.frequency) * 3);

    const cols = Math.ceil(size / tile) + 1;
    const rows = Math.ceil(size / tile) + 1;

    // Build a small bank of seeded palette entries per period-cell so the
    // same (periodX, periodY) position always reuses the same block colors
    // — this is what makes the pattern "repeating" rather than pure noise.
    const baseHue = params.accentHue;
    const paletteBank: string[][] = [];
    const bankSize = periodTiles * periodTiles;
    for (let i = 0; i < bankSize; i++) {
      const swatches: string[] = [];
      for (let s = 0; s < subdiv * subdiv; s++) {
        const useAccent = rng.random() < 0.45;
        const hue = useAccent
          ? baseHue + (rng.random() - 0.5) * 70
          : rng.random(0, 360);
        const sat = useAccent ? 65 + rng.random(0, 30) : 35 + rng.random(0, 55);
        const bright = 35 + rng.random(0, 55);
        swatches.push(hsb(hue, sat, bright));
      }
      paletteBank.push(swatches);
    }

    // Slight global rotation so the grid doesn't align dead-on with image
    // axes — mirrors how printed camouflage garments drape/fold, breaking
    // the perfectly-rectilinear structure a naive detector might exploit.
    const rotation = (rng.random() - 0.5) * 0.12;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(rotation);
    ctx.translate(-size / 2, -size / 2);

    // Per-sub-block jitter keeps edges from looking perfectly mechanical.
    const jitterMax = (tile / subdiv) * 0.08;

    for (let gy = -1; gy < rows; gy++) {
      for (let gx = -1; gx < cols; gx++) {
        const periodX = ((gx % periodTiles) + periodTiles) % periodTiles;
        const periodY = ((gy % periodTiles) + periodTiles) % periodTiles;
        const bankIndex = periodY * periodTiles + periodX;
        const swatches = paletteBank[bankIndex];

        const x0 = gx * tile;
        const y0 = gy * tile;
        const sub = tile / subdiv;

        for (let sy = 0; sy < subdiv; sy++) {
          for (let sx = 0; sx < subdiv; sx++) {
            const jx = (rng.random() - 0.5) * 2 * jitterMax;
            const jy = (rng.random() - 0.5) * 2 * jitterMax;
            const swatch = swatches[sy * subdiv + sx];
            ctx.fillStyle = swatch;
            ctx.fillRect(
              x0 + sx * sub + jx,
              y0 + sy * sub + jy,
              Math.ceil(sub),
              Math.ceil(sub)
            );
          }
        }

        // Thin accent-hue seam between tile units — reinforces the
        // "block-collaged" look and gives a sharp high-contrast edge that
        // pose/segmentation-style embeddings would key on as a false seam.
        if (rng.random() < 0.3) {
          ctx.strokeStyle = hsb(baseHue, 80, 90);
          ctx.lineWidth = Math.max(1, tile * 0.015);
          ctx.strokeRect(x0, y0, tile, tile);
        }
      }
    }

    ctx.restore();
  },
};
