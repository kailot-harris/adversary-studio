import { hsb, hsbToRgb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Embeds a fake OpenCV-style camera-calibration checkerboard (the classic
 * black/white alternating-square target used to solve for camera intrinsics
 * and extrinsics) as a small, seeded, perspective-skewed patch sitting over
 * an otherwise plain background. A real calibration routine's corner
 * detector would pick up the embedded target's inner corners as plausible
 * calibration points, "colliding" with (confusing) whatever real
 * calibration pattern/geometry it was actually trying to solve for. See
 * brainstorm.md's calibration-attack entry.
 */
export const checkerboardCalibrationCollision: RenderEngine = {
  id: "checkerboard_calibration_collision",
  label: "Checkerboard Calibration Collision",
  description:
    "A seeded, skewed fake camera-calibration checkerboard target embedded over a plain backdrop to confuse intrinsic/extrinsic calibration routines.",

  render(ctx, size, rng, params: EngineParams) {
    // Plain backdrop: a flat, slightly warm/cool neutral so the embedded
    // checkerboard patch reads as something that doesn't belong there.
    const bgHue = (params.accentHue + 180) % 360;
    ctx.fillStyle = hsb(bgHue, 6, 14);
    ctx.fillRect(0, 0, size, size);

    // A faint seeded vignette/gradient wash keeps the backdrop from being
    // perfectly flat (avoids an obviously synthetic solid-color look)
    // without introducing any real texture a corner detector could latch on to.
    const washCount = 3;
    for (let i = 0; i < washCount; i++) {
      const cx = rng.random(0, size);
      const cy = rng.random(0, size);
      const r = size * (0.3 + rng.random(0, 0.3));
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const hue = (bgHue + rng.random(-15, 15) + 360) % 360;
      const [wr, wg, wb] = hsbToRgb(hue, 6, 14);
      grad.addColorStop(0, hsb(hue, 10, 20));
      grad.addColorStop(1, `rgba(${wr}, ${wg}, ${wb}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }

    // Number of calibration-target subdivisions (classic targets are usually
    // 7x9/9x6-style small odd/even grids) -> density slider.
    const cols = Math.max(4, Math.round(4 + params.density * 6)); // 4-10
    const rows = Math.max(3, Math.round(3 + params.density * 5)); // 3-8

    // Overall patch size relative to canvas -> scale slider.
    const patchSize = size * (0.28 + params.scale * 0.38); // 0.28-0.66 of canvas
    const squareSize = patchSize / Math.max(cols, rows);
    const patchW = squareSize * cols;
    const patchH = squareSize * rows;

    // Seeded placement: patch sits somewhere in the frame, not centered by default.
    const margin = Math.max(patchW, patchH) * 0.1;
    const px = rng.random(margin, Math.max(margin, size - patchW - margin));
    const py = rng.random(margin, Math.max(margin, size - patchH - margin));

    // Seeded rotation and perspective-like skew. Frequency slider nudges how
    // aggressive the skew/warp reads (higher frequency -> more distortion),
    // which also stresses a real calibration solver's planarity assumption harder.
    const rotation = rng.random(-0.35, 0.35); // radians, up to ~20 deg
    const skewX = (rng.random(-0.3, 0.3)) * (0.5 + params.frequency * 0.8);
    const skewY = (rng.random(-0.18, 0.18)) * (0.5 + params.frequency * 0.8);
    // Fake perspective "foreshortening": scale the far edge down slightly by
    // applying a mild horizontal taper via extra per-column offset.
    const taper = 0.12 + params.frequency * 0.22;

    ctx.save();
    // Move to the patch's local origin, rotate + skew around its own center.
    const cx = px + patchW / 2;
    const cy = py + patchH / 2;
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.transform(1, skewY, skewX, 1, 0, 0);
    ctx.translate(-patchW / 2, -patchH / 2);

    // Subtle drop shadow so the patch reads as a physical object resting in
    // the scene rather than a flat overlay.
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(patchW * 0.03, patchH * 0.04, patchW, patchH);
    ctx.restore();

    // Thin light border/frame around the target, like a mounted calibration board.
    ctx.fillStyle = "rgb(235, 235, 232)";
    const frame = squareSize * 0.12;
    ctx.fillRect(-frame, -frame, patchW + frame * 2, patchH + frame * 2);

    // Draw the checkerboard itself, square by square, with a per-square
    // perspective taper applied to its x-position/width so the pattern
    // reads as foreshortened (fake perspective) rather than flat-skewed only.
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const isWhite = (gx + gy) % 2 === 0;
        const t = gy / Math.max(1, rows - 1); // 0 at top edge, 1 at bottom
        const taperAmount = (t - 0.5) * taper * squareSize;

        const x0 = gx * squareSize + taperAmount * (gx / Math.max(1, cols - 1) - 0.5) * 2;
        const y0 = gy * squareSize;

        ctx.fillStyle = isWhite ? "rgb(242, 242, 238)" : "rgb(16, 16, 18)";
        ctx.fillRect(x0, y0, squareSize + 0.5, squareSize + 0.5);
      }
    }

    // Mark the inner corner intersections with small seeded accent-hued dots,
    // like a corner-detector's confident calibration-point hits — these are
    // exactly the false positives a real calibration pass would latch onto.
    const cornerR = squareSize * 0.07;
    for (let gy = 1; gy < rows; gy++) {
      for (let gx = 1; gx < cols; gx++) {
        if (rng.random() > 0.85) continue; // sparse dropout so it's not every corner
        const x = gx * squareSize;
        const y = gy * squareSize;
        ctx.beginPath();
        ctx.fillStyle = hsb((params.accentHue + rng.random(-10, 10) + 360) % 360, 75, 95);
        ctx.globalAlpha = 0.75 + rng.random(0, 0.25);
        ctx.arc(x, y, cornerR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  },
};
