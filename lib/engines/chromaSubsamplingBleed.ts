import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Mimics the color-bleed/fringing artifact that 4:2:0 chroma subsampling
 * produces at hard object edges: luma (brightness/edges) is encoded at full
 * resolution, but chroma (color) is shared across 2x2 blocks of pixels, so
 * sharp edges end up with color information "smeared" across the nearest
 * 2x2 luma block, producing visible color fringing exactly at boundaries.
 *
 * Approach:
 * 1. Draw a set of seeded rectangles (sharp high-contrast luma edges) into
 *    an offscreen luma field (one brightness value per pixel).
 * 2. Compute a per-pixel seeded "true" chroma (hue/sat) field that varies
 *    smoothly except right at rectangle edges, where it alternates sharply
 *    between the rectangle's accent hue and its neighbor's hue.
 * 3. Quantize the chroma field to 2x2 blocks (one chroma sample reused for
 *    all 4 pixels in the block) while leaving luma at full resolution. This
 *    is exactly what 4:2:0 subsampling does, and is what produces the
 *    color-bleed: any edge that doesn't land on an even block boundary gets
 *    its color "leaked" across the block from whichever side dominates it.
 */
export const chromaSubsamplingBleed: RenderEngine = {
  id: "chroma_subsampling_bleed",
  label: "Chroma Subsampling Bleed",
  description:
    "Fine color-edge pattern tuned to 4:2:0 chroma-subsampling boundaries, inducing color-bleed at object edges to confuse codec-aware tamper/compression detectors.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    // --- Step 1: seeded rectangles, sharp high-contrast luma edges ---
    const rectCount = 6 + Math.round(params.density * 18); // 6..24
    const minSizeNative = 40 - params.scale * 20; // 40..20
    const maxSizeNative = 160 - params.scale * 60; // 160..100

    interface Rect {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      luma: number; // 0-100
      hue: number; // 0-360
      sat: number; // 0-100
    }
    const rects: Rect[] = [];
    for (let i = 0; i < rectCount; i++) {
      const wNative = minSizeNative + rng.random() * (maxSizeNative - minSizeNative);
      const hNative = minSizeNative + rng.random() * (maxSizeNative - minSizeNative);
      const w = wNative / coordScale;
      const h = hNative / coordScale;
      const x0 = rng.random() * size;
      const y0 = rng.random() * size;
      const luma = 20 + rng.random() * 70;
      // Half the rectangles use the accent hue family, half a complementary/offset hue,
      // so edges between rectangles cross a real hue boundary (needed for visible bleed).
      const hueOffset = rng.random() < 0.5 ? 0 : 150 + rng.random() * 60;
      const hue = (params.accentHue + hueOffset + (rng.random() - 0.5) * 30 + 360) % 360;
      const sat = 55 + rng.random() * 40;
      rects.push({ x0, y0, x1: Math.min(size, x0 + w), y1: Math.min(size, y0 + h), luma, hue, sat });
    }

    // Background base luma/hue (low-contrast field so rectangle edges read clearly).
    const bgLuma = 12;
    const bgHue = (params.accentHue + 200) % 360;
    const bgSat = 25;

    const lumaField = new Float32Array(size * size);
    const hueField = new Float32Array(size * size);
    const satField = new Float32Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        let luma = bgLuma;
        let hue = bgHue;
        let sat = bgSat;
        // Later rectangles in the list paint over earlier ones (painter's algorithm),
        // giving deterministic, seed-stable overlaps.
        for (const r of rects) {
          if (x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) {
            luma = r.luma;
            hue = r.hue;
            sat = r.sat;
          }
        }
        // Fine high-frequency jitter on the "true" (pre-subsampling) chroma field,
        // tuned by params.frequency, so the underlying pattern has edge-adjacent
        // texture rather than being flat color fields with nothing to subsample.
        const freqScale = 0.05 + params.frequency * 0.35;
        const jitter = rng.noise(x * coordScale * freqScale, y * coordScale * freqScale);
        hue = (hue + (jitter - 0.5) * 20 + 360) % 360;

        lumaField[idx] = luma;
        hueField[idx] = hue;
        satField[idx] = sat;
      }
    }

    // --- Step 2 & 3: write pixels, luma at full res, chroma block-quantized 2x2 ---
    const img = ctx.createImageData(size, size);
    const data = img.data;

    for (let by = 0; by < size; by += 2) {
      for (let bx = 0; bx < size; bx += 2) {
        // One chroma sample per 2x2 block: average hue (circularly) + sat across the
        // block's pixels, mimicking 4:2:0's single shared chroma sample per 2x2 luma
        // group. This is exactly where the "bleed" comes from: a block straddling an
        // edge gets one blended color smeared across all 4 of its pixels.
        let sumX = 0;
        let sumY = 0;
        let sumSat = 0;
        let n = 0;
        for (let dy = 0; dy < 2 && by + dy < size; dy++) {
          for (let dx = 0; dx < 2 && bx + dx < size; dx++) {
            const idx = (by + dy) * size + (bx + dx);
            const h = (hueField[idx] * Math.PI) / 180;
            sumX += Math.cos(h);
            sumY += Math.sin(h);
            sumSat += satField[idx];
            n++;
          }
        }
        const blockHue = ((Math.atan2(sumY / n, sumX / n) * 180) / Math.PI + 360) % 360;
        const blockSat = sumSat / n;

        for (let dy = 0; dy < 2 && by + dy < size; dy++) {
          for (let dx = 0; dx < 2 && bx + dx < size; dx++) {
            const x = bx + dx;
            const y = by + dy;
            const idx = y * size + x;
            // Luma stays per-pixel/full-resolution (sharp edges preserved there).
            const bri = lumaField[idx];
            const [r, g, b] = hsbToRgb(blockHue, blockSat, bri);
            const pIdx = idx * 4;
            data[pIdx] = r;
            data[pIdx + 1] = g;
            data[pIdx + 2] = b;
            data[pIdx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
