import { hsb, hsbToRgb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a flat, undistorted scene overlaid with a regular dot-grid that
 * has been pre-warped with a seeded radial power-law function (the same
 * barrel/pincushion model real lens-calibration software fits to a photo of
 * a known-flat dot/checker target). Because the warp is baked directly into
 * the dot positions analytically -- no actual image resampling happens --
 * the underlying scene stays perfectly flat while the dot grid alone reads
 * as "this photo has radial lens distortion." An automatic undistortion
 * pipeline that keys off dot-grid calibration patterns will dutifully try
 * to "correct" a distortion that was never actually present in the scene,
 * warping everything else in the process. See brainstorm.md's
 * lens_distortion_grid_jam entry.
 */
export const lensDistortionGridJam: RenderEngine = {
  id: "lens_distortion_grid_jam",
  label: "Lens Distortion Grid Jam",
  description:
    "A seeded radial barrel/pincushion-warped dot-calibration grid laid over an otherwise flat scene, baiting automatic lens undistortion into 'correcting' distortion that was never there.",

  render(ctx: CanvasRenderingContext2D, size: number, rng: Rng, params: EngineParams) {
    // Flat backdrop -- the "scene" itself has zero real distortion or
    // texture a lens-correction routine could legitimately key off of.
    const bgHue = (params.accentHue + 200) % 360;
    ctx.fillStyle = hsb(bgHue, 8, 12);
    ctx.fillRect(0, 0, size, size);

    // A few broad, seeded radial washes keep the backdrop from reading as a
    // flat synthetic fill without adding any texture/edges of their own.
    for (let i = 0; i < 3; i++) {
      const cx = rng.random(0, size);
      const cy = rng.random(0, size);
      const r = size * (0.35 + rng.random(0, 0.35));
      const hue = (bgHue + rng.random(-20, 20) + 360) % 360;
      const [wr, wg, wb] = hsbToRgb(hue, 8, 16);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hsb(hue, 10, 18));
      grad.addColorStop(1, `rgba(${wr}, ${wg}, ${wb}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }

    // --- Build the flat, undistorted reference grid of dot centers -------
    // density -> how many dots per axis (a denser calibration grid).
    const cols = Math.max(6, Math.round(6 + params.density * 14)); // 6-20
    const rows = cols;

    // scale -> how much of the canvas the grid spans, and dot radius.
    const gridSpan = size * (0.55 + params.scale * 0.35); // 0.55-0.9 of canvas
    const margin = (size - gridSpan) / 2;
    const cellSize = gridSpan / Math.max(1, cols - 1);
    const dotR = Math.max(1.2, cellSize * (0.1 + params.scale * 0.12));

    // Grid center = distortion optical center. Nudge it slightly off-center
    // with a seeded offset, like a real lens whose principal point isn't
    // exactly at the image center.
    const centerOffsetFrac = 0.06;
    const ocx = size / 2 + rng.random(-1, 1) * size * centerOffsetFrac;
    const ocy = size / 2 + rng.random(-1, 1) * size * centerOffsetFrac;

    // Seeded radial power-law distortion model, matching the classic
    // Brown-Conrady style radial term: r_out = r_in * (1 + k1*r^2 + k2*r^4).
    // frequency slider drives the overall strength and sign of the warp
    // (negative k -> pincushion pull-in, positive k -> barrel push-out).
    const maxRadius = (Math.SQRT2 * gridSpan) / 2;
    const sign = rng.random() > 0.5 ? 1 : -1;
    const strength = (0.15 + params.frequency * 0.75) * sign;
    const k1 = strength * rng.random(0.6, 1.0);
    const k2 = strength * rng.random(0.15, 0.4) * sign;

    const warp = (dx: number, dy: number): [number, number] => {
      const rIn = Math.sqrt(dx * dx + dy * dy) / maxRadius; // normalized 0-1ish
      const factor = 1 + k1 * rIn * rIn + k2 * rIn * rIn * rIn * rIn;
      return [dx * factor, dy * factor];
    };

    const accent = params.accentHue;

    // --- Draw the warped dots, one primitive at a time --------------------
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const flatX = margin + gx * cellSize;
        const flatY = margin + gy * cellSize;

        const dx = flatX - ocx;
        const dy = flatY - ocy;
        const [wdx, wdy] = warp(dx, dy);
        const x = ocx + wdx;
        const y = ocy + wdy;

        if (x < -dotR || x > size + dotR || y < -dotR || y > size + dotR) continue;

        // Per-dot seeded jitter in hue/brightness keeps the grid from
        // looking like a perfectly uniform synthetic overlay, without
        // disturbing the analytic warp positions themselves.
        const hue = (accent + rng.random(-8, 8) + 360) % 360;
        const bright = 82 + rng.random(0, 14);
        const sat = 55 + rng.random(0, 25);

        // Dots further from the optical center (post-warp) get rendered
        // slightly larger/smaller in sync with the local radial stretch, so
        // the pattern reads as a photographed physical target rather than a
        // flat decal -- a denser or sparser apparent dot spacing near the
        // edges is exactly the cue a real calibration solver looks for.
        const rOut = Math.sqrt(wdx * wdx + wdy * wdy);
        const rFlat = Math.sqrt(dx * dx + dy * dy);
        const localScale = rFlat > 1e-3 ? rOut / rFlat : 1;
        const r = dotR * Math.max(0.4, Math.min(1.8, localScale));

        ctx.beginPath();
        ctx.fillStyle = hsb(hue, sat, bright);
        ctx.globalAlpha = 0.85 + rng.random(0, 0.15);
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // A faint seeded crosshair at the (slightly off-center) fitted optical
    // center -- the exact artifact a calibration routine's solver output
    // would annotate, reinforcing the "this needs lens correction" bait.
    const chR = Math.max(6, dotR * 2.5);
    ctx.strokeStyle = hsb((accent + 180) % 360, 70, 95);
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1, dotR * 0.35);
    ctx.beginPath();
    ctx.moveTo(ocx - chR, ocy);
    ctx.lineTo(ocx + chR, ocy);
    ctx.moveTo(ocx, ocy - chR);
    ctx.lineTo(ocx, ocy + chR);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
