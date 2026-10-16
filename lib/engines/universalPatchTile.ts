import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Mimics a "universal adversarial perturbation": instead of one localized
 * patch glued onto a scene, a single small seeded perturbation tile is
 * generated once and then repeated identically across the entire frame,
 * the way a universal perturbation is meant to work regardless of where
 * (or on what) it lands. The tile itself is a coarse grid of noise-driven
 * cells (one noise() sample per cell, not per pixel) plus a handful of
 * small high-salience accent-hued dots scattered within the tile, then the
 * whole frame is filled by tiling that same small buffer edge-to-edge.
 */
export const universalPatchTile: RenderEngine = {
  id: "universal_patch_tile",
  label: "Universal Patch Tile",
  description:
    "A small seeded perturbation tile repeated identically across the whole frame, mimicking a universal adversarial perturbation rather than one localized patch.",

  render(ctx, size, rng, params: EngineParams) {
    // Tile pitch: 16-64px at native 800px cadence, driven by scale.
    const tilePxNative = 16 + Math.round(params.scale * 48);
    const tileSize = Math.max(4, Math.round(tilePxNative * (size / 800)));

    // Sub-cell grid within the tile: more cells = finer internal detail, driven by frequency.
    const cells = Math.max(3, Math.round(3 + params.frequency * 6)); // 3-9
    const cellPx = Math.max(1, Math.floor(tileSize / cells));
    const effectiveTileSize = Math.max(1, cellPx * cells);

    const hue = params.accentHue;

    // One noise sample per sub-cell (block-quantized, not per-pixel) to build
    // the base perturbation pattern inside the single tile.
    const noiseOffX = rng.random(1000);
    const noiseOffY = rng.random(1000);
    const noiseScale = 0.4 + params.frequency * 0.6;

    const amp = 20 + params.density * 50; // perturbation contrast amplitude

    const tileData = new Uint8ClampedArray(effectiveTileSize * effectiveTileSize * 4);

    for (let cy = 0; cy < cells; cy++) {
      for (let cx = 0; cx < cells; cx++) {
        const n = rng.noise(cx * noiseScale + noiseOffX, cy * noiseScale + noiseOffY);
        const sign = n > 0.5 ? 1 : -1;
        const bri = Math.max(0, Math.min(100, 45 + sign * amp * Math.abs(n - 0.5) * 2));
        const sat = 25 + n * 40;
        const cellHue = hue + (n - 0.5) * 40;
        const [r, g, b] = hsbToRgb(cellHue, sat, bri);

        const xStart = cx * cellPx;
        const yStart = cy * cellPx;
        const xEnd = Math.min(effectiveTileSize, xStart + cellPx);
        const yEnd = Math.min(effectiveTileSize, yStart + cellPx);
        for (let y = yStart; y < yEnd; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const idx = (x + y * effectiveTileSize) * 4;
            tileData[idx] = r;
            tileData[idx + 1] = g;
            tileData[idx + 2] = b;
            tileData[idx + 3] = 255;
          }
        }
      }
    }

    // A handful of small high-salience accent-hued dots scattered within the
    // tile, mimicking the few "hot" pixels a real universal perturbation
    // tends to concentrate its signal into.
    const dotCount = 1 + Math.round(params.density * 5); // 1-6
    for (let i = 0; i < dotCount; i++) {
      const dx = rng.randomInt(0, effectiveTileSize);
      const dy = rng.randomInt(0, effectiveTileSize);
      const dotR = Math.max(1, Math.round(effectiveTileSize * (0.08 + rng.random(0.1))));
      const [dr, dg, db] = hsbToRgb((hue + 180) % 360, 80, 95);

      const xStart = Math.max(0, dx - dotR);
      const xEnd = Math.min(effectiveTileSize, dx + dotR);
      const yStart = Math.max(0, dy - dotR);
      const yEnd = Math.min(effectiveTileSize, dy + dotR);
      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const ddx = x - dx;
          const ddy = y - dy;
          if (ddx * ddx + ddy * ddy <= dotR * dotR) {
            const idx = (x + y * effectiveTileSize) * 4;
            tileData[idx] = dr;
            tileData[idx + 1] = dg;
            tileData[idx + 2] = db;
            tileData[idx + 3] = 255;
          }
        }
      }
    }

    // Tile the single precomputed buffer edge-to-edge across the whole frame.
    const img = ctx.createImageData(size, size);
    const data = img.data;
    for (let y = 0; y < size; y++) {
      const ty = y % effectiveTileSize;
      for (let x = 0; x < size; x++) {
        const tx = x % effectiveTileSize;
        const srcIdx = (tx + ty * effectiveTileSize) * 4;
        const dstIdx = (x + y * size) * 4;
        data[dstIdx] = tileData[srcIdx];
        data[dstIdx + 1] = tileData[srcIdx + 1];
        data[dstIdx + 2] = tileData[srcIdx + 2];
        data[dstIdx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
