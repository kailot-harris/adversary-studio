import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * XORs two near-identical-frequency, slightly rotated line gratings — the
 * classic way to generate a moire beat pattern — tuned to a pitch close to
 * typical camera sensor spacing so it aliases hard against a Bayer filter.
 */
export const moireInterference: RenderEngine = {
  id: "moire_interference",
  label: "Moire Interference",
  description: "Near-frequency rotated line grids tuned to alias against camera sensor pixel pitch.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size;

    // Base pitch in native-800px cycles; scale slider widens/narrows the grating.
    const baseFreq = (0.35 + params.scale * 1.4) * (Math.PI / 40);
    // Frequency slider controls how close the second grid's pitch is to the first —
    // tighter deltas produce wider, slower-moving beat fringes.
    const delta = 0.002 + (1 - params.frequency) * 0.03;
    const freq2 = baseFreq * (1 + delta);

    // Density controls the rotation offset between the two grids.
    const angle1 = 0;
    const angle2 = 0.015 + params.density * 0.2;
    const cos1 = Math.cos(angle1);
    const sin1 = Math.sin(angle1);
    const cos2 = Math.cos(angle2);
    const sin2 = Math.sin(angle2);

    const phase1 = rng.random(Math.PI * 2);
    const phase2 = rng.random(Math.PI * 2);

    const [ar, ag, ab] = hsbToRgb(params.accentHue, 85, 95);

    for (let y = 0; y < size; y++) {
      const sy = y * coordScale;
      for (let x = 0; x < size; x++) {
        const sx = x * coordScale;

        const p1 = sx * cos1 + sy * sin1;
        const p2 = sx * cos2 + sy * sin2;

        const g1 = Math.sin(p1 * baseFreq + phase1);
        const g2 = Math.sin(p2 * freq2 + phase2);

        const bandA = g1 > 0 ? 1 : 0;
        const bandB = g2 > 0 ? 1 : 0;
        const xorVal = bandA ^ bandB;

        let r: number;
        let g: number;
        let b: number;

        // Near the zero-crossing of either grating, tint with the accent color
        // to read as chromatic aberration at the fringe boundaries.
        const nearEdge = Math.abs(g1) < 0.05 || Math.abs(g2) < 0.05;

        if (nearEdge) {
          r = ar;
          g = ag;
          b = ab;
        } else if (xorVal) {
          r = g = b = 235;
        } else {
          r = g = b = 12;
        }

        const idx = (x + y * size) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
