import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a base 8x8-block-aligned grid tuned to one quantization "look"
 * (coarser blocking, wider DC steps, low per-block contrast) then overlays a
 * seeded rectangular "spliced" region that uses a different 8x8-block
 * alignment (its grid phase is offset from the base grid, mimicking a paste
 * that wasn't re-aligned to the original block lattice) and a different
 * quantization intensity (tighter DC steps, higher contrast). Where the
 * overlay's blocks straddle the boundary of its own rectangle, the seam
 * between the two differently-phased lattices reads as a visible "ghost" —
 * the classic double-JPEG-compression tell used to detect image splicing.
 */
export const jpegGhostDecoy: RenderEngine = {
  id: "jpeg_ghost_decoy",
  label: "JPEG Ghost Decoy",
  description:
    "Overlapping differently-quantized 8x8-block regions mimicking JPEG-ghost double-compression artifacts, confusing splice/tamper detection.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const put = (x: number, y: number, r: number, g: number, b: number) => {
      const idx = (x + y * size) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    };

    // --- Base layer: one quantization "look" ---
    // Coarser native blocking, wide DC steps, low contrast -- stands in for a
    // heavily-quantized first-generation JPEG compression pass.
    const baseBlockNative = 12 + Math.round((1 - params.scale) * 16); // 12-28 @ 800px cadence
    const baseBlock = Math.max(4, Math.round(baseBlockNative * (size / 800)));
    const baseDcSteps = 5;
    const baseContrast = 0.25 + params.density * 0.2;
    const baseHue = params.accentHue;

    for (let by = 0; by < size; by += baseBlock) {
      const yEnd = Math.min(size, by + baseBlock);
      for (let bx = 0; bx < size; bx += baseBlock) {
        const xEnd = Math.min(size, bx + baseBlock);

        const dc = Math.floor(rng.random(baseDcSteps)) / (baseDcSteps - 1); // 0-1
        const dcBri = 25 + dc * 45;
        const hueDrift = (rng.random() - 0.5) * 24;
        const hue = (baseHue + hueDrift + 360) % 360;
        const sign = rng.random() < 0.5 ? -1 : 1;

        for (let y = by; y < yEnd; y++) {
          const v = (y - by) / Math.max(1, baseBlock - 1);
          for (let x = bx; x < xEnd; x++) {
            const u = (x - bx) / Math.max(1, baseBlock - 1);
            const wave = Math.cos(Math.PI * u + Math.PI * v) * sign;
            const bri = Math.max(0, Math.min(100, dcBri + wave * baseContrast * 30));
            const sat = 30 + Math.abs(wave) * 20;
            const [r, g, b] = hsbToRgb(hue, sat, bri);
            put(x, y, r, g, b);
          }
        }
      }
    }

    // --- Spliced overlay region: different block alignment + quantization ---
    // A seeded rectangle somewhere inside the canvas, re-gridded at a
    // different (finer) block size with a phase offset so its 8x8 lattice
    // does not line up with the base grid -- the hallmark of a pasted region
    // that was re-saved without matching the host image's block alignment.
    const rectW = Math.round(size * (0.3 + params.frequency * 0.35));
    const rectH = Math.round(size * (0.3 + params.frequency * 0.35));
    const rectX = Math.round(rng.random(size - rectW));
    const rectY = Math.round(rng.random(size - rectH));

    const overlayBlockNative = 6 + Math.round((1 - params.scale) * 10); // 6-16 @ 800px cadence
    const overlayBlock = Math.max(3, Math.round(overlayBlockNative * (size / 800)));
    // Phase offset shifts the overlay's grid relative to the base grid --
    // this misalignment is what makes the boundary seam visible.
    const phaseX = Math.round(rng.random(overlayBlock));
    const phaseY = Math.round(rng.random(overlayBlock));

    const overlayDcSteps = 9; // tighter quantization steps = different "quality level"
    const overlayContrast = 0.5 + params.density * 0.5;
    const overlayHue = (params.accentHue + 150 + rng.random() * 60) % 360;

    const rectXEnd = Math.min(size, rectX + rectW);
    const rectYEnd = Math.min(size, rectY + rectH);

    for (let by = rectY - phaseY; by < rectYEnd; by += overlayBlock) {
      const blockYStart = Math.max(rectY, by);
      const blockYEnd = Math.min(rectYEnd, by + overlayBlock);
      if (blockYEnd <= blockYStart) continue;

      for (let bx = rectX - phaseX; bx < rectXEnd; bx += overlayBlock) {
        const blockXStart = Math.max(rectX, bx);
        const blockXEnd = Math.min(rectXEnd, bx + overlayBlock);
        if (blockXEnd <= blockXStart) continue;

        const dc = Math.floor(rng.random(overlayDcSteps)) / (overlayDcSteps - 1); // 0-1
        const dcBri = 20 + dc * 60;
        const sign = rng.random() < 0.5 ? -1 : 1;

        // Blocks that straddle the rectangle's own boundary (clipped by the
        // Math.max/min above) read as the "ghost seam" -- their wave pattern
        // is truncated mid-cycle against the un-reprocessed base layer.
        const clipped =
          blockYEnd - blockYStart < overlayBlock || blockXEnd - blockXStart < overlayBlock;
        const seamBoost = clipped ? 1.6 : 1;

        for (let y = blockYStart; y < blockYEnd; y++) {
          const v = (y - by) / Math.max(1, overlayBlock - 1);
          for (let x = blockXStart; x < blockXEnd; x++) {
            const u = (x - bx) / Math.max(1, overlayBlock - 1);
            const wave = Math.cos(Math.PI * 2 * u + Math.PI * 2 * v) * sign;
            const bri = Math.max(
              0,
              Math.min(100, dcBri + wave * overlayContrast * 35 * seamBoost)
            );
            const sat = 45 + Math.abs(wave) * 35;
            const [r, g, b] = hsbToRgb(overlayHue, sat, bri);
            put(x, y, r, g, b);
          }
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
