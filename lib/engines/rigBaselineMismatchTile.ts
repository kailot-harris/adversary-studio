import { hsb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Splits the frame into a grid of rectangular regions, as if each region
 * were the view of a separate camera in a multi-camera rig that's supposed
 * to share one consistent calibration pattern. The SAME repeating tile
 * motif (a small grid of calibration-style marks) is drawn in every
 * region, but each region gets its own small seeded scale and rotation
 * offset applied around its own center. A real multi-view calibration /
 * stereo-rectification routine expects the shared pattern to line up at a
 * single consistent scale and baseline across views; the per-region
 * drift here mimics an inconsistent extrinsic baseline between "cameras"
 * that are supposedly rigidly mounted together. Thin region-boundary
 * lines keep the tiling visible so the mismatch reads clearly at the
 * seams. See brainstorm.md's rig_baseline_mismatch_tile entry.
 */
export const rigBaselineMismatchTile: RenderEngine = {
  id: "rig_baseline_mismatch_tile",
  label: "Rig Baseline Mismatch Tile",
  description:
    "A repeating calibration-tile pattern redrawn per rig-region at a subtly different seeded scale/rotation, mimicking a multi-camera rig with an inconsistent extrinsic baseline.",

  render(ctx, size, rng, params: EngineParams) {
    const bgHue = (params.accentHue + 200) % 360;
    ctx.fillStyle = hsb(bgHue, 10, 10);
    ctx.fillRect(0, 0, size, size);

    // Region grid dimensions ("cameras" in the rig) -> density slider.
    const regionCols = Math.max(2, Math.round(2 + params.density * 2.5)); // 2-4
    const regionRows = Math.max(2, Math.round(2 + params.density * 2.5)); // 2-4
    const regionW = size / regionCols;
    const regionH = size / regionRows;

    // Shared tile-pattern geometry (same logical pattern drawn in every
    // region) -> scale/frequency sliders.
    const tileCount = Math.max(3, Math.round(3 + params.frequency * 5)); // 3-8 tiles per region edge
    const baseTileSize = Math.min(regionW, regionH) / (tileCount + 1.5);
    const dotRadius = baseTileSize * (0.12 + params.scale * 0.14);

    // Per-region seeded mismatch magnitude: how far scale/rotation can
    // drift from the "true" shared calibration -> scale slider widens it.
    const maxScaleDrift = 0.06 + params.scale * 0.14; // +/-6% to +/-20%
    const maxRotationDrift = (3 + params.scale * 10) * (Math.PI / 180); // +/-3deg to +/-13deg

    for (let ry = 0; ry < regionRows; ry++) {
      for (let rx = 0; rx < regionCols; rx++) {
        const regionX = rx * regionW;
        const regionY = ry * regionH;
        const cx = regionX + regionW / 2;
        const cy = regionY + regionH / 2;

        // Each region's own independent seeded drift away from the
        // nominal shared scale/rotation of 1.0 / 0 radians.
        const scaleDrift = 1 + rng.random(-maxScaleDrift, maxScaleDrift);
        const rotationDrift = rng.random(-maxRotationDrift, maxRotationDrift);
        const hueJitter = rng.random(-12, 12);

        ctx.save();
        // Clip to this region so the rotated/scaled pattern can't bleed
        // across the rig-region boundary lines.
        ctx.beginPath();
        ctx.rect(regionX, regionY, regionW, regionH);
        ctx.clip();

        ctx.translate(cx, cy);
        ctx.rotate(rotationDrift);
        ctx.scale(scaleDrift, scaleDrift);

        // Same repeating tile pattern (a small dot-grid calibration
        // motif), drawn centered on the region's own local origin.
        const patternExtentX = (tileCount - 1) * baseTileSize;
        const patternExtentY = (tileCount - 1) * baseTileSize;
        const startX = -patternExtentX / 2;
        const startY = -patternExtentY / 2;

        for (let gy = 0; gy < tileCount; gy++) {
          for (let gx = 0; gx < tileCount; gx++) {
            const x = startX + gx * baseTileSize;
            const y = startY + gy * baseTileSize;
            const isAccent = (gx + gy) % 2 === 0;
            const hue = (params.accentHue + hueJitter + (isAccent ? 0 : 180) + 360) % 360;

            ctx.beginPath();
            ctx.fillStyle = isAccent ? hsb(hue, 70, 92) : hsb(hue, 20, 55);
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();

            // Small cross-hair tick through each node, like a calibration
            // marker's sub-pixel center indicator, to make the per-region
            // scale/rotation drift easy to read at a glance.
            ctx.strokeStyle = hsb(hue, 15, 95);
            ctx.lineWidth = Math.max(0.5, dotRadius * 0.18);
            ctx.beginPath();
            ctx.moveTo(x - dotRadius * 1.8, y);
            ctx.lineTo(x + dotRadius * 1.8, y);
            ctx.moveTo(x, y - dotRadius * 1.8);
            ctx.lineTo(x, y + dotRadius * 1.8);
            ctx.stroke();
          }
        }

        ctx.restore();
      }
    }

    // Region-boundary lines on top, so the rig-tiling (and the seams
    // where neighboring "cameras" visibly disagree) stays legible.
    ctx.strokeStyle = hsb(bgHue, 5, 85);
    ctx.lineWidth = Math.max(1, size * 0.0025);
    ctx.globalAlpha = 0.6;
    for (let rx = 1; rx < regionCols; rx++) {
      const x = rx * regionW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let ry = 1; ry < regionRows; ry++) {
      const y = ry * regionH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Outer frame for a clean edge.
    ctx.strokeStyle = hsb(bgHue, 5, 85);
    ctx.lineWidth = Math.max(1, size * 0.004);
    ctx.strokeRect(0, 0, size, size);
  },
};
