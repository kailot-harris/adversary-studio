import { hsb, hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Scatters a seeded field of plausible object bounding boxes across a plain
 * scene backdrop, then — instead of leaving each box's crisp high-contrast
 * edge intact — paints a soft radial gradient "bleed" exactly at each box's
 * four corners (and, at higher frequency, its edge midpoints too). The bleed
 * blends the box's edge tone into the surrounding backdrop tone across a
 * smooth falloff, which is precisely the sharp corner/edge contrast that
 * box-regression heads (anchor refinement, corner/edge heatmaps, IoU
 * regressors) key on to localize a box tightly. Density controls box count,
 * scale controls box footprint, frequency controls bleed radius and whether
 * edge midpoints bleed in addition to corners, and accentHue tints the
 * bleed so it reads as a deliberate wash rather than a lens artifact.
 */
export const bboxCornerBleed: RenderEngine = {
  id: "bbox_corner_bleed",
  label: "BBox Corner Bleed",
  description:
    "Soft gradient bleed exactly at typical bounding-box corner/edge locations, blurring the contrast cues box-regression heads rely on.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Plain mid-tone backdrop with a very gentle seeded vignette so the
    // scene reads as a real photographed surface rather than flat color.
    const backdropB = 34 + rng.random() * 8;
    const backdrop: [number, number, number] = hsbToRgb(params.accentHue, 6, backdropB);
    ctx.fillStyle = `rgb(${backdrop[0]}, ${backdrop[1]}, ${backdrop[2]})`;
    ctx.fillRect(0, 0, size, size);

    const vignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.72);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    // Density slider: how many candidate boxes populate the scene.
    const boxCount = Math.round(10 + params.density * 46);

    // Scale slider: box footprint (short side), in native px before aspect stretch.
    const baseShortNative = 36 + params.scale * 150;
    const baseShort = baseShortNative * coordScale;

    // Frequency slider: bleed radius relative to box size, and whether edge
    // midpoints bleed in addition to the four corners (richer bleed at
    // higher frequency, matching denser box-regression supervision).
    const bleedRadiusFrac = 0.42 + params.frequency * 0.5;
    const bleedEdgesToo = params.frequency > 0.5;

    // Typical detector-style box aspect ratios: square, portrait, landscape.
    const aspects: Array<[number, number]> = [
      [1, 1],
      [1, 1.5],
      [1.5, 1],
      [1, 2],
      [2, 1],
    ];

    const edgeColor = hsb(params.accentHue, 55, 85);

    for (let i = 0; i < boxCount; i++) {
      const [aw, ah] = aspects[rng.randomInt(0, aspects.length)];
      const scaleVar = 0.7 + rng.random() * 0.9;
      const w = baseShort * aw * scaleVar;
      const h = baseShort * ah * scaleVar;

      const cx = rng.random(w / 2, size - w / 2);
      const cy = rng.random(h / 2, size - h / 2);
      const x0 = cx - w / 2;
      const y0 = cy - h / 2;
      const x1 = cx + w / 2;
      const y1 = cy + h / 2;

      drawBoxWithCornerBleed(ctx, x0, y0, x1, y1, backdrop, edgeColor, bleedRadiusFrac, bleedEdgesToo, coordScale, rng);
    }
  },
};

/** Draws one box's crisp edge, then washes out contrast at its corners (and optionally edge midpoints) with a soft radial gradient blending toward the backdrop tone. */
function drawBoxWithCornerBleed(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  backdrop: [number, number, number],
  edgeColor: string,
  bleedRadiusFrac: number,
  bleedEdgesToo: boolean,
  coordScale: number,
  rng: { random: (min?: number, max?: number) => number }
) {
  const w = x1 - x0;
  const h = y1 - y0;
  const shortSide = Math.min(w, h);

  // The crisp edge: a plain, moderately contrasting stroke standing in for a
  // real object boundary — this is the contrast cue the bleed will then blur.
  ctx.save();
  ctx.globalAlpha = 0.5 + rng.random() * 0.25;
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = Math.max(1, 1.5 * coordScale);
  ctx.strokeRect(x0, y0, w, h);
  ctx.restore();

  const corners: Array<[number, number]> = [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ];
  const edgeMids: Array<[number, number]> = [
    [(x0 + x1) / 2, y0],
    [(x0 + x1) / 2, y1],
    [x0, (y0 + y1) / 2],
    [x1, (y0 + y1) / 2],
  ];

  const bleedPoints = bleedEdgesToo ? corners.concat(edgeMids) : corners;
  const radius = Math.max(4, shortSide * bleedRadiusFrac);
  const [br, bg, bb] = backdrop;

  for (const [bx, by] of bleedPoints) {
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
    // Soft multi-stop falloff approximating a gaussian blur bleed, melting
    // the sharp corner/edge contrast into the surrounding backdrop tone.
    grad.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, 0.95)`);
    grad.addColorStop(0.4, `rgba(${br}, ${bg}, ${bb}, 0.6)`);
    grad.addColorStop(0.75, `rgba(${br}, ${bg}, ${bb}, 0.22)`);
    grad.addColorStop(1, `rgba(${br}, ${bg}, ${bb}, 0)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(bx - radius, by - radius, radius * 2, radius * 2);
    ctx.restore();
  }
}
