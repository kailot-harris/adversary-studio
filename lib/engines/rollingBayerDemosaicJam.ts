import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

const clampByte = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v) | 0;

/**
 * Three slightly-detuned per-pixel sine gratings, one per color channel, at an
 * angular frequency tuned close to the 2x2 RGGB Bayer tile's Nyquist pitch.
 * Real demosaicing interpolates R/G/B from offset sensor sub-samples, so any
 * fine pattern near that pitch reconstructs with channel-dependent phase
 * error -- here simulated directly by giving R and B slightly different
 * frequencies than G (which real sensors sample at twice the spatial density).
 * A per-row phase drift ("rolling") mimics a rolling-shutter readout sampling
 * the grating a little later on each successive line, shearing the fringe
 * bands diagonally instead of leaving them as clean horizontal stripes.
 */
export const rollingBayerDemosaicJam: RenderEngine = {
  id: "rolling_bayer_demosaic_jam",
  label: "Rolling Bayer Demosaic Jam",
  description:
    "Fine color-fringing grating tuned to Bayer demosaicing frequencies, with a rolling per-row phase drift that induces false-color artifacts.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    // Base angular frequency per native pixel. pi rad/px is the Nyquist limit
    // for a 2px Bayer tile; sweep the frequency slider around that so the
    // pattern ranges from a loose alias to a hard one.
    const omegaBase = Math.PI * (0.72 + params.frequency * 0.5);

    // How far the R/B channel frequencies detune from G -- wider detune makes
    // broader, slower-moving false-color fringe bands.
    const detune = 0.015 + params.scale * 0.09;
    const omegaR = omegaBase * (1 - detune);
    const omegaG = omegaBase;
    const omegaB = omegaBase * (1 + detune);

    // Per-row phase accumulation (the "rolling" readout skew); density
    // controls how fast the roll builds up down the frame.
    const rollRate = (0.12 + params.density * 1.5) * (Math.PI / size);
    // Slight per-seed diagonal shear so the roll doesn't read as perfectly horizontal.
    const shear = rng.random(-0.35, 0.35);
    const phase0 = rng.random(Math.PI * 2);

    const [ar, ag, ab] = hsbToRgb(params.accentHue, 75, 100);

    for (let y = 0; y < size; y++) {
      const rowPhase = rollRate * y + phase0;
      for (let x = 0; x < size; x++) {
        const pos = x + shear * y;

        const sR = Math.sin(omegaR * pos + rowPhase);
        const sG = Math.sin(omegaG * pos + rowPhase);
        const sB = Math.sin(omegaB * pos + rowPhase);

        let r = 128 + sR * 90;
        let g = 128 + sG * 90;
        let b = 128 + sB * 90;

        // Where the detuned R/B channels diverge most from each other, the
        // simulated demosaic error peaks -- tint those crests with the accent
        // hue so the induced false color reads clearly against the base grating.
        const divergence = Math.abs(sR - sB);
        if (divergence > 1.05) {
          const t = Math.min(1, (divergence - 1.05) / 0.95);
          r = r * (1 - t) + ar * t;
          g = g * (1 - t) + ag * t;
          b = b * (1 - t) + ab * t;
        }

        const idx = (x + y * size) * 4;
        data[idx] = clampByte(r);
        data[idx + 1] = clampByte(g);
        data[idx + 2] = clampByte(b);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
