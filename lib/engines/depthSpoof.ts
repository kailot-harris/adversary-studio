import { hsb, rgba } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Ames-room-style depth confusion: overlapping quads shaded as if lit from
 * several contradictory directions at once, plus multiple false
 * vanishing-point line fans that disagree with each other about where the
 * canvas's "horizon" and "far point" are. A stereo/monocular depth estimator
 * leans heavily on consistent shading gradients and converging perspective
 * lines to infer geometry — this engine deliberately supplies several
 * mutually-inconsistent versions of both cues across the same canvas.
 */
export const depthSpoof: RenderEngine = {
  id: "depth_spoof",
  label: "Depth Spoof",
  description: "Conflicting shading gradients and false vanishing-point lines to confuse depth estimation.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;

    ctx.fillStyle = "rgb(10,11,14)";
    ctx.fillRect(0, 0, size, size);

    const accent = params.accentHue;

    // --- 1. Several false vanishing points, each spraying a fan of converging
    // perspective lines. Real perspective has exactly one consistent
    // vanishing point per view direction; stacking 3-5 contradictory ones
    // breaks that assumption everywhere at once.
    const vpCount = Math.max(2, Math.round(2 + params.frequency * 3));
    const linesPerVp = Math.round(10 + params.density * 26);

    for (let v = 0; v < vpCount; v++) {
      const vpx = rng.random(0.1, 0.9) * 800 * s;
      const vpy = rng.random(0.1, 0.9) * 800 * s;
      const hue = (accent + v * (360 / vpCount)) % 360;
      ctx.strokeStyle = rgba(
        ...(hsbToTuple(hue, 35, 85) as [number, number, number]),
        0.22
      );
      ctx.lineWidth = Math.max(0.6, 1 * s);

      for (let i = 0; i < linesPerVp; i++) {
        const edgeAngle = (i / linesPerVp) * Math.PI * 2 + rng.random(-0.05, 0.05);
        const reach = rng.random(500, 900) * s;
        const ex = vpx + Math.cos(edgeAngle) * reach;
        const ey = vpy + Math.sin(edgeAngle) * reach;
        ctx.beginPath();
        ctx.moveTo(vpx, vpy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // Mark the vanishing point itself so the conflicting origins read clearly.
      ctx.fillStyle = hsb(hue, 70, 95);
      ctx.beginPath();
      ctx.arc(vpx, vpy, 4 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- 2. Overlapping "box face" quads, each shaded with a linear gradient
    // whose light direction is randomized independently per shape — so
    // adjacent, overlapping faces imply mutually incompatible light sources
    // (classic Ames-room trick of faking consistent depth via inconsistent
    // shading that happens to look locally plausible).
    const quadCount = Math.max(4, Math.round(5 + params.density * 14));
    const baseSizeRange: [number, number] = [
      rng.random(60, 110) * s * (0.5 + params.scale),
      rng.random(160, 260) * s * (0.5 + params.scale),
    ];

    for (let q = 0; q < quadCount; q++) {
      const cx = rng.random(60, 740) * s;
      const cy = rng.random(60, 740) * s;
      const w = rng.random(baseSizeRange[0], baseSizeRange[1]);
      const h = rng.random(baseSizeRange[0], baseSizeRange[1]);
      const skewX = rng.random(-0.6, 0.6) * w;
      const skewY = rng.random(-0.3, 0.3) * h;

      // A skewed quad reads as a foreshortened plane — false perspective
      // without any actual 3D transform.
      const pts: [number, number][] = [
        [cx - w / 2, cy - h / 2],
        [cx + w / 2 + skewX, cy - h / 2 - skewY],
        [cx + w / 2, cy + h / 2],
        [cx - w / 2 - skewX, cy + h / 2 + skewY],
      ];

      // Independent, randomized light-direction gradient per shape.
      const lightAngle = rng.random(Math.PI * 2);
      const gx0 = cx - Math.cos(lightAngle) * w;
      const gy0 = cy - Math.sin(lightAngle) * h;
      const gx1 = cx + Math.cos(lightAngle) * w;
      const gy1 = cy + Math.sin(lightAngle) * h;

      const hue = (accent + q * 37) % 360;
      const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      grad.addColorStop(0, hsb(hue, 25, rng.random(78, 96)));
      grad.addColorStop(0.5, hsb(hue, 40, rng.random(35, 55)));
      grad.addColorStop(1, hsb(hue, 60, rng.random(4, 16)));

      ctx.save();
      ctx.globalAlpha = rng.random(0.55, 0.9);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.fill();

      // Contradictory cast-shadow edge on the opposite side from this
      // shape's own light direction (so neighboring shapes' "shadows" don't
      // agree on a single global light source either).
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = Math.max(1, 3 * s);
      ctx.beginPath();
      ctx.moveTo(pts[2][0], pts[2][1]);
      ctx.lineTo(pts[3][0], pts[3][1]);
      ctx.stroke();

      ctx.restore();
    }

    // --- 3. A thin false horizon line (or two) drawn independent of any of
    // the vanishing points above, reinforcing the sense that there's a
    // single consistent ground plane when there isn't one.
    const horizonCount = rng.random(1) > 0.5 ? 2 : 1;
    for (let hCount = 0; hCount < horizonCount; hCount++) {
      const hy = rng.random(0.2, 0.8) * 800 * s;
      ctx.strokeStyle = rgba(230, 230, 235, 0.12);
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(800 * s, hy);
      ctx.stroke();
    }
  },
};

function hsbToTuple(h: number, sPct: number, bPct: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, sPct)) / 100;
  const bb = Math.max(0, Math.min(100, bPct)) / 100;
  const c = bb * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = bb - c;
  let r = 0;
  let g = 0;
  let bch = 0;
  if (hh < 60) [r, g, bch] = [c, x, 0];
  else if (hh < 120) [r, g, bch] = [x, c, 0];
  else if (hh < 180) [r, g, bch] = [0, c, x];
  else if (hh < 240) [r, g, bch] = [0, x, c];
  else if (hh < 300) [r, g, bch] = [x, 0, c];
  else [r, g, bch] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((bch + m) * 255)];
}
