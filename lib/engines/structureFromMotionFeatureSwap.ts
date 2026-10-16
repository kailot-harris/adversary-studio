import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * structure_from_motion_feature_swap: generates several seeded small textured
 * "feature patches" (block-quantized noise blobs with a distinctive
 * shape/color), each drawn twice elsewhere in the frame at a fixed
 * horizontal "camera baseline" offset -- mimicking the same real-world
 * feature appearing in two camera views shifted by a plausible parallax
 * distance. A subset of pairs get their second copy's offset swapped with a
 * different pair's offset (wrong baseline distance), implying an SfM
 * matcher locked onto the wrong correspondence. A thin line connects each
 * correct pair in a neutral color; mismatched pairs get a hot accent-hued
 * line instead, so the false correspondences read visually distinct from
 * the true ones.
 */
export const structureFromMotionFeatureSwap: RenderEngine = {
  id: "structure_from_motion_feature_swap",
  label: "SfM Feature Swap",
  description:
    "Paired textured feature patches at camera-baseline offsets, some deliberately swapped to mismatched distances to imply incorrect SfM correspondence.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Dark neutral "scene" background so the textured patches read clearly.
    ctx.fillStyle = "rgb(24, 26, 30)";
    ctx.fillRect(0, 0, size, size);

    // Faint base gridlines, evoking a camera-calibration backdrop.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = Math.max(1, 1 * s);
    const gridStep = 40 * s;
    for (let x = 0; x <= size; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // density slider -> number of feature-patch pairs.
    const pairCount = Math.round(5 + params.density * 14);
    // scale slider -> patch size (native px before canvas scaling).
    const patchSizeNative = 26 + params.scale * 46;
    const patchSize = patchSizeNative * s;
    // frequency slider -> block-noise quantization granularity within a patch.
    const blocksPerSide = Math.max(2, Math.round(3 + params.frequency * 5));

    const accent = hsb(params.accentHue, 80, 95);
    const correctLineColor = "rgba(140, 220, 180, 0.55)";
    const mismatchLineColor = accent;

    interface Patch {
      x: number;
      y: number;
      hue: number;
      shape: number; // 0 = square blocks, 1 = diamond, 2 = circle-clipped
      blockColors: string[];
    }

    interface PairSpec {
      origin: Patch;
      baselineOffset: number; // native px, the "correct" camera-baseline distance
      verticalJitter: number;
    }

    const margin = patchSize * 1.5;
    const pairs: PairSpec[] = [];

    for (let i = 0; i < pairCount; i++) {
      const ox = rng.random(margin, size - margin * 2.2);
      const oy = rng.random(margin, size - margin);

      // Build a small palette of block colors for this feature's texture,
      // using block-quantized noise so each patch has a distinctive,
      // reproducible "fingerprint" texture.
      const baseHue = rng.random(0, 360);
      const blockColors: string[] = [];
      for (let b = 0; b < blocksPerSide * blocksPerSide; b++) {
        const n = rng.noise(b * 0.37, i * 1.91);
        const bri = 35 + n * 55;
        const sat = 40 + n * 40;
        blockColors.push(hsb(baseHue + (n - 0.5) * 30, sat, bri));
      }

      const shape = rng.randomInt(0, 3);

      // Plausible camera-baseline offset: a horizontal shift proportional to
      // canvas size, with per-pair variation standing in for depth-dependent
      // parallax (closer features shift more than distant ones).
      const baselineOffset = (60 + rng.random() * 140) * s;
      const verticalJitter = (rng.random() - 0.5) * 24 * s;

      pairs.push({
        origin: { x: ox, y: oy, hue: baseHue, shape, blockColors },
        baselineOffset,
        verticalJitter,
      });
    }

    // Decide which pairs get swapped (mismatched) baselines. A swapped pair
    // borrows a *different* pair's baselineOffset, producing a plausible but
    // wrong parallax distance -- the hallmark of a false SfM correspondence.
    const mismatchFraction = 0.4;
    const mismatched = new Array(pairs.length).fill(false);
    for (let i = 0; i < pairs.length; i++) {
      if (rng.random() < mismatchFraction && pairs.length > 1) {
        mismatched[i] = true;
      }
    }

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      let usedOffset = pair.baselineOffset;
      let usedVJitter = pair.verticalJitter;

      if (mismatched[i]) {
        // Borrow another pair's baseline (deterministic: the next pair in
        // the swap cycle among mismatched entries), so the offset is a
        // real-but-wrong value rather than arbitrary.
        let donorIdx = (i + 1) % pairs.length;
        // Find a donor different from self if possible.
        for (let k = 0; k < pairs.length; k++) {
          const candidate = (i + 1 + k) % pairs.length;
          if (candidate !== i) {
            donorIdx = candidate;
            break;
          }
        }
        usedOffset = pairs[donorIdx].baselineOffset;
        usedVJitter = pairs[donorIdx].verticalJitter;
      }

      const destX = pair.origin.x + usedOffset;
      const destY = pair.origin.y + usedVJitter;

      // Clamp destination so it stays mostly on-canvas; keep the connecting
      // line meaningful even if clamped.
      const clampedDestX = Math.min(size - patchSize * 0.6, destX);
      const clampedDestY = Math.max(patchSize * 0.6, Math.min(size - patchSize * 0.6, destY));

      // Connecting line first (drawn beneath the patches).
      ctx.strokeStyle = mismatched[i] ? mismatchLineColor : correctLineColor;
      ctx.lineWidth = Math.max(1, (mismatched[i] ? 2 : 1.2) * s);
      if (mismatched[i]) {
        ctx.setLineDash([6 * s, 5 * s]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(pair.origin.x, pair.origin.y);
      ctx.lineTo(clampedDestX, clampedDestY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw the original patch and its (correct or swapped) duplicate with
      // identical texture -- a real SfM matcher should treat these as the
      // same world feature.
      drawFeaturePatch(ctx, pair.origin.x, pair.origin.y, patchSize, blocksPerSide, pair.origin);
      drawFeaturePatch(ctx, clampedDestX, clampedDestY, patchSize, blocksPerSide, pair.origin);

      // Small correspondence markers (crosshair) at each patch center, tinted
      // by match correctness, to read clearly even at a glance.
      drawMarker(ctx, pair.origin.x, pair.origin.y, patchSize * 0.12, mismatched[i] ? mismatchLineColor : correctLineColor, s);
      drawMarker(ctx, clampedDestX, clampedDestY, patchSize * 0.12, mismatched[i] ? mismatchLineColor : correctLineColor, s);
    }
  },
};

interface PatchStyle {
  hue: number;
  shape: number;
  blockColors: string[];
}

/** Draws one block-quantized textured feature patch centered at (cx, cy). */
function drawFeaturePatch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  blocksPerSide: number,
  style: PatchStyle
) {
  const half = size / 2;
  const blockSize = size / blocksPerSide;

  ctx.save();
  ctx.beginPath();
  if (style.shape === 1) {
    // Diamond clip.
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half, cy);
    ctx.closePath();
  } else if (style.shape === 2) {
    ctx.ellipse(cx, cy, half, half, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(cx - half, cy - half, size, size);
  }
  ctx.clip();

  for (let by = 0; by < blocksPerSide; by++) {
    for (let bx = 0; bx < blocksPerSide; bx++) {
      const idx = by * blocksPerSide + bx;
      ctx.fillStyle = style.blockColors[idx % style.blockColors.length];
      ctx.fillRect(cx - half + bx * blockSize, cy - half + by * blockSize, blockSize + 0.5, blockSize + 0.5);
    }
  }
  ctx.restore();

  // Thin border so the patch reads as a discrete "feature" against the scene.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = Math.max(1, size * 0.02);
  ctx.beginPath();
  if (style.shape === 1) {
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half, cy);
    ctx.closePath();
  } else if (style.shape === 2) {
    ctx.ellipse(cx, cy, half, half, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(cx - half, cy - half, size, size);
  }
  ctx.stroke();
}

/** Small crosshair correspondence marker. */
function drawMarker(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, s: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
}
