import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Simulates a side-by-side stereo image pair: the canvas is split into a
 * left half and a right half, each drawn with the exact same seeded
 * repeating texture (a dot/block grid), so a naive stereo matcher would
 * expect to find each left-half feature re-appearing in the right half at
 * some horizontal pixel shift ("disparity") corresponding to a single,
 * physically plausible depth. Instead, the shift applied per grid row is
 * re-seeded independently band to band — jumping in magnitude and sign
 * with no smooth relationship to row position — so the implied disparity
 * field is internally inconsistent and could never correspond to a real
 * rigid-depth scene. A thin vertical divider line marks the left/right
 * split so the "stereo pair" framing reads clearly.
 */
export const stereoDisparityDecoy: RenderEngine = {
  id: "stereo_disparity_decoy",
  label: "Stereo Disparity Decoy",
  description: "Side-by-side stereo-pair texture with non-physical, inconsistent left/right pixel disparity per band.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.fillStyle = "rgb(8, 9, 12)";
    ctx.fillRect(0, 0, size, size);

    const halfW = size / 2;
    const accentColor = hsb(params.accentHue, 80, 100);
    const decoyColor = hsb((params.accentHue + 150) % 360, 75, 100);

    // Grid resolution for the shared repeating texture, driven by
    // density/frequency sliders.
    const rowCount = Math.max(8, Math.round(9 + params.density * 20));
    const colCount = Math.max(6, Math.round(7 + params.frequency * 16));
    const rowH = size / rowCount;
    const colW = halfW / colCount;

    // Scale slider: max magnitude of the per-row disparity offset applied
    // to the right-half copy relative to the left-half original.
    const maxDisparity = colW * (0.8 + params.scale * 3.0);

    // Build the shared texture as a seeded per-cell grid of dot/block
    // primitives (row, col) -> {shade, isDot, accent}. Both halves draw
    // this exact same grid so there IS a true underlying correspondence,
    // but the right half is rendered at a per-row horizontal offset that
    // deliberately does not correspond to any single plausible depth.
    type Cell = { shade: number; isDot: boolean; accent: 0 | 1 | 2; r: number };
    const grid: Cell[][] = [];
    for (let row = 0; row < rowCount; row++) {
      const cells: Cell[] = [];
      for (let col = 0; col < colCount; col++) {
        const n = rng.noise(col * 0.55, row * 0.55);
        const shade = 30 + n * 100;
        const isDot = rng.random() < 0.55;
        const roll = rng.random();
        const accent: 0 | 1 | 2 = roll < 0.12 ? 1 : roll < 0.2 ? 2 : 0;
        cells.push({ shade, isDot, accent, r: rng.random() });
      }
      grid.push(cells);
    }

    // Per-row disparity: re-seeded independently each row, jumping in both
    // sign and magnitude with no smooth trend across rows (so a matcher
    // chasing left->right correspondence would reconstruct a depth map
    // that is spatially incoherent — physically impossible for a rigid
    // scene under a real stereo rig).
    const disparities: number[] = [];
    for (let row = 0; row < rowCount; row++) {
      const sign = rng.random() < 0.5 ? 1 : -1;
      const mag = maxDisparity * (0.15 + rng.random() * 0.85);
      disparities.push(sign * mag);
    }

    const drawCell = (originX: number, row: number, col: number, offsetX: number) => {
      const cell = grid[row][col];
      const x = originX + col * colW + offsetX;
      const y = row * rowH;
      if (x + colW < originX - colW || x > originX + halfW + colW) return;

      const fill =
        cell.accent === 1 ? accentColor : cell.accent === 2 ? decoyColor : `rgb(${cell.shade | 0}, ${cell.shade | 0}, ${(cell.shade + 8) | 0})`;
      ctx.fillStyle = fill;
      ctx.globalAlpha = cell.accent !== 0 ? 0.6 + cell.r * 0.3 : 0.9;

      if (cell.isDot) {
        const radius = Math.min(colW, rowH) * (0.2 + cell.r * 0.2);
        ctx.beginPath();
        ctx.arc(x + colW / 2, y + rowH / 2, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x + colW * 0.08, y + rowH * 0.08, colW * 0.84, rowH * 0.84);
      }
    };

    // Left half: the "reference" view, texture drawn with zero offset.
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        drawCell(0, row, col, 0);
      }
    }

    // Right half: same texture, same row/col grid, but each row carries
    // its own independently-seeded (non-physical) disparity offset.
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        drawCell(halfW, row, col, disparities[row]);
      }
    }
    ctx.globalAlpha = 1;

    // Thin dividing line between the two "camera views" so the stereo-pair
    // framing reads clearly.
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, size);
    ctx.strokeStyle = "rgba(235, 238, 242, 0.5)";
    ctx.lineWidth = Math.max(1.5, size * 0.0025);
    ctx.stroke();

    // Sample a handful of rows and draw a thin connector line from a
    // feature point on the left half to where that row's (wrong)
    // disparity places its "corresponding" point on the right half,
    // directly visualizing the false correspondence.
    const sampleCount = Math.min(rowCount, 3 + Math.round(params.density * 3));
    const used = new Set<number>();
    for (let s = 0; s < sampleCount; s++) {
      let row = rng.randomInt(0, rowCount);
      let guard = 0;
      while (used.has(row) && guard < 12) {
        row = rng.randomInt(0, rowCount);
        guard++;
      }
      used.add(row);

      const y = row * rowH + rowH / 2;
      const leftX = rng.random(colW, halfW - colW);
      const rightX = halfW + leftX + disparities[row];

      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.strokeStyle = decoyColor;
      ctx.lineWidth = Math.max(1, size * 0.0015);
      ctx.globalAlpha = 0.85;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(leftX, y, size * 0.005, 0, Math.PI * 2);
      ctx.fillStyle = "rgb(235, 238, 242)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightX, y, size * 0.005, 0, Math.PI * 2);
      ctx.fillStyle = decoyColor;
      ctx.fill();
    }
  },
};
