import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a grid of seeded textured blocks laid out in rows, where each
 * row carries a horizontal "disparity" offset — the pixel shift a
 * stereo/SfM matcher would expect to find for a corresponding feature in a
 * second view. In a geometrically valid stereo rig that disparity varies
 * smoothly (monotonically) with row/depth; here it instead follows a
 * seeded sign-flipping, non-monotonic sequence, so adjacent rows shear in
 * contradictory directions — a texture that deliberately violates the
 * epipolar constraint. A couple of sample rows get a thin colored line
 * connecting a feature point to where a matcher would have to (wrongly)
 * place its "corresponding" point on another row, visualizing the broken
 * correspondence directly.
 */
export const epipolarMismatchPattern: RenderEngine = {
  id: "epipolar_mismatch_pattern",
  label: "Epipolar Mismatch Pattern",
  description: "Sign-flipping, non-monotonic disparity-offset grid that violates epipolar constraints used in stereo/SfM matching.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.fillStyle = "rgb(9, 10, 13)";
    ctx.fillRect(0, 0, size, size);

    const accentColor = hsb(params.accentHue, 85, 100);
    const mismatchColor = hsb((params.accentHue + 180) % 360, 80, 100);

    // Density/frequency sliders: grid resolution.
    const rowCount = Math.max(8, Math.round(10 + params.density * 22));
    const colCount = Math.max(8, Math.round(10 + params.frequency * 22));
    const rowH = size / rowCount;
    const colW = size / colCount;

    // Scale slider: max magnitude of the per-row disparity offset.
    const maxDisparity = colW * (1.2 + params.scale * 3.2);

    // Build a seeded, sign-flipping, non-monotonic disparity value per row.
    // Unlike a real stereo rig (disparity varies smoothly with depth/row),
    // this sequence randomly flips sign and jumps magnitude row to row.
    const disparities: number[] = [];
    let sign = rng.random() < 0.5 ? 1 : -1;
    let mag = maxDisparity * (0.2 + rng.random() * 0.3);
    for (let row = 0; row < rowCount; row++) {
      // Seeded chance to flip sign outright (non-monotonic violation).
      if (rng.random() < 0.4) sign *= -1;
      // Seeded jump in magnitude, independent of neighboring rows.
      mag = maxDisparity * (0.15 + rng.random() * 0.85);
      disparities.push(sign * mag);
    }

    // Draw each row of textured blocks, shifted by that row's disparity via
    // a horizontal shear/offset — each block also gets seeded per-block
    // noise texture so there's real feature content for a matcher to chase.
    for (let row = 0; row < rowCount; row++) {
      const y = row * rowH;
      const offset = disparities[row];

      for (let col = -1; col <= colCount; col++) {
        const baseX = col * colW;
        const x = baseX + offset;
        if (x + colW < 0 || x > size) continue;

        const n = rng.noise(col * 0.6, row * 0.6);
        const shade = 28 + n * 90;
        const useAccent = rng.random() < 0.16;
        ctx.fillStyle = useAccent ? accentColor : `rgb(${shade}, ${shade}, ${shade + 10})`;
        ctx.globalAlpha = useAccent ? 0.55 + n * 0.3 : 0.85;
        ctx.fillRect(x, y, colW - 1, rowH - 1);

        // A couple of seeded fine texture marks per block, so the block
        // reads as a trackable feature patch rather than a flat tile.
        if (rng.random() < 0.5) {
          ctx.strokeStyle = "rgba(235, 238, 242, 0.35)";
          ctx.lineWidth = Math.max(1, size * 0.0008);
          ctx.beginPath();
          ctx.moveTo(x + colW * 0.2, y + rowH * (0.2 + rng.random() * 0.6));
          ctx.lineTo(x + colW * 0.8, y + rowH * (0.2 + rng.random() * 0.6));
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    // Pick a couple of sample rows and draw a thin colored line connecting
    // a feature point in that row to where a stereo matcher would be led
    // to place its "corresponding" point, given the row's seeded (wrong)
    // disparity — directly visualizing the broken epipolar correspondence.
    const sampleRowCount = Math.min(rowCount, 2 + Math.round(params.density * 2));
    const usedRows = new Set<number>();
    for (let s = 0; s < sampleRowCount; s++) {
      let row = rng.randomInt(0, rowCount);
      let guard = 0;
      while (usedRows.has(row) && guard < 10) {
        row = rng.randomInt(0, rowCount);
        guard++;
      }
      usedRows.add(row);

      const y = row * rowH + rowH / 2;
      const featureX = rng.random(colW, size - colW);
      // The "true" epipolar-consistent match would land directly across at
      // the same y with zero (or smoothly-varying) horizontal shift; the
      // mismatched line instead follows this row's seeded disparity.
      const matchedX = featureX + disparities[row];

      ctx.beginPath();
      ctx.moveTo(featureX, y);
      ctx.lineTo(matchedX, y);
      ctx.strokeStyle = mismatchColor;
      ctx.lineWidth = Math.max(1.5, size * 0.002);
      ctx.globalAlpha = 0.9;
      ctx.stroke();

      // Mark the two endpoints so the correspondence reads clearly.
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(featureX, y, size * 0.006, 0, Math.PI * 2);
      ctx.fillStyle = "rgb(235, 238, 242)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(matchedX, y, size * 0.006, 0, Math.PI * 2);
      ctx.fillStyle = mismatchColor;
      ctx.fill();
    }
  },
};
