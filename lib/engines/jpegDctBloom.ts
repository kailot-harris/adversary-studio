import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a field of block-aligned NxN tiles, each filled with a low-order
 * DCT-basis-like gradient (horizontal, vertical, or diagonal frequency
 * stripes, chosen per block) standing in for an exaggerated/quantized JPEG
 * coefficient block. Occasional blocks get an extra "ringing" halo along
 * their edges, mimicking the overshoot artifacts that appear around hard
 * edges when a JPEG's quantization step is pushed too coarse.
 */
export const jpegDctBloom: RenderEngine = {
  id: "jpeg_dct_bloom",
  label: "JPEG DCT Bloom",
  description:
    "Block-aligned 8x8 DCT-coefficient-mimicking patterns tuned to trigger exaggerated quantization artifacts.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    // Native block size is the classic JPEG 8x8 grid; params.scale stretches
    // it up to 24px for a chunkier, more exaggerated look at low scale... or
    // down toward the native 8px at high scale.
    const blockNative = 8 + Math.round((1 - params.scale) * 16); // 8-24 @ 800px cadence
    const block = Math.max(2, Math.round(blockNative * (size / 800)));

    // Frequency controls how many basis half-cycles are packed across a block.
    const maxOrder = 1 + params.frequency * 5; // 1-6 half-cycles across the block
    // Density controls how many blocks get the extra ringing halo treatment.
    const ringingChance = params.density * 0.5;
    // Density also nudges overall coefficient contrast (more "activity" per block).
    const contrast = 0.4 + params.density * 0.6;

    const baseHue = params.accentHue;

    for (let by = 0; by < size; by += block) {
      for (let bx = 0; bx < size; bx += block) {
        // One basis pick per block: horizontal, vertical, or diagonal stripe pattern,
        // plus a random order (frequency) and phase, mimicking a dominant DCT coefficient.
        const kind = rng.randomInt(0, 3); // 0 = horizontal, 1 = vertical, 2 = diagonal
        const orderX = 1 + Math.floor(rng.random(maxOrder));
        const orderY = 1 + Math.floor(rng.random(maxOrder));
        const phase = rng.random(Math.PI * 2);
        const sign = rng.random() < 0.5 ? -1 : 1;

        // DC-level brightness offset per block (the "average" coefficient),
        // quantized into coarse steps the way a real low-quality JPEG would be.
        const dcSteps = 6;
        const dc = Math.floor(rng.random(dcSteps)) / (dcSteps - 1); // 0-1
        const dcBri = 20 + dc * 55;

        // Slight per-block hue drift so adjacent blocks read as distinct "macroblocks".
        const hueDrift = (rng.random() - 0.5) * 40;
        const hue = (baseHue + hueDrift + 360) % 360;

        const halo = rng.random() < ringingChance;

        const yEnd = Math.min(size, by + block);
        const xEnd = Math.min(size, bx + block);

        for (let y = by; y < yEnd; y++) {
          const v = (y - by) / Math.max(1, block - 1); // 0-1 within block
          for (let x = bx; x < xEnd; x++) {
            const u = (x - bx) / Math.max(1, block - 1); // 0-1 within block

            let wave: number;
            if (kind === 0) {
              wave = Math.cos(orderX * Math.PI * u + phase);
            } else if (kind === 1) {
              wave = Math.cos(orderY * Math.PI * v + phase);
            } else {
              wave = Math.cos(orderX * Math.PI * u + orderY * Math.PI * v + phase);
            }
            wave *= sign;

            // Ringing: exaggerated overshoot near block edges (Gibbs-phenomenon stand-in).
            let ring = 0;
            if (halo) {
              const edgeDist = Math.min(u, 1 - u, v, 1 - v);
              const edgeFalloff = Math.max(0, 1 - edgeDist * 4);
              ring = edgeFalloff * Math.cos(edgeDist * Math.PI * 8) * 0.6;
            }

            const amp = (wave * 0.5 + ring) * contrast * 45;
            const bri = Math.max(0, Math.min(100, dcBri + amp));
            const sat = 40 + Math.abs(wave) * 40;

            const [r, g, b] = hsbToRgb(hue, sat, bri);

            const idx = (x + y * size) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
