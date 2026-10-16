import { Rng } from "@/lib/mulberry32";
import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * night_vision_gain_bloom: a monochrome (single-hue, varying brightness)
 * night-vision-intensifier-style field. The base layer is block-quantized
 * seeded noise standing in for amplified sensor gain grain (the coarse,
 * blocky speckle an image intensifier produces when its gain is cranked up
 * in near-total darkness), overlaid with 1-2 seeded bright "bloom" hotspots
 * with soft radial falloff — mimicking an IR illuminator (or any small hot
 * reflective point) blowing out the intensifier tube and oversaturating a
 * radius of the frame around it, erasing detail there. Deliberately kept to
 * a single green hue ramp (unlike `thermal_decoy`'s multi-stop false-color
 * red/yellow/white IR palette) to stay visually distinct from it.
 */
export const nightVisionGainBloom: RenderEngine = {
  id: "night_vision_gain_bloom",
  label: "Night Vision Gain Bloom",
  description:
    "Amplified-noise gain grain mimicking IR illuminator bloom, oversaturating a night-vision image intensifier.",

  render(ctx, size, rng, params: EngineParams) {
    const nvHue = 118; // fixed phosphor-green hue; accentHue drives the bloom cores instead

    // Base tube color: near-black backdrop, same hue family as the grain/bloom
    // so the whole frame reads as a single-channel intensifier feed.
    ctx.fillStyle = hsb(nvHue, 55, 4);
    ctx.fillRect(0, 0, size, size);

    // 1. Block-quantized amplified gain grain. frequency controls block count
    // (finer grain at high frequency), density controls how much of the
    // dynamic range the grain noise is allowed to swing through (how hard
    // the gain is being pushed).
    const blocks = Math.round(8 + params.frequency * 72); // 8..80 blocks per axis
    const blockSize = size / blocks;
    const grainSwing = 18 + params.density * 46; // brightness swing in HSB "bright" units

    for (let by = 0; by < blocks; by++) {
      for (let bx = 0; bx < blocks; bx++) {
        const n = rng.noise(bx * 0.18, by * 0.18);
        // Occasional isolated hot pixels/blocks: amplifier noise spikes.
        const spike = rng.random(1) > 0.965 ? rng.random(20, 45) : 0;
        const bright = 6 + n * grainSwing + spike;
        const sat = 35 + n * 20;
        ctx.fillStyle = hsb(nvHue + (n - 0.5) * 6, sat, Math.min(100, bright));
        ctx.fillRect(
          Math.floor(bx * blockSize),
          Math.floor(by * blockSize),
          Math.ceil(blockSize),
          Math.ceil(blockSize)
        );
      }
    }

    // 2. Faint scanline banding, characteristic of analog intensifier tube
    // output / CRT-style night-vision viewfinders.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "rgb(0, 0, 0)";
    const lineStep = Math.max(2, Math.round(3 - params.scale * 1.5));
    for (let y = 0; y < size; y += lineStep * 2) {
      ctx.fillRect(0, y, size, lineStep);
    }
    ctx.globalAlpha = 1;

    // 3. Bloom hotspots: 1-2 seeded bright blobs with soft radial falloff,
    // oversaturating the intensifier in a radius around a reflective point
    // source (the IR illuminator's own reflection). accentHue biases the
    // bloom core slightly warmer/cooler within the green monochrome range
    // (kept narrow so the overall image stays visually monochrome).
    const numBlooms = rng.random(1) > 0.45 ? 2 : 1;
    const bloomHueBias = ((params.accentHue - 180) / 180) * 10; // -10..+10 degrees off nvHue

    for (let i = 0; i < numBlooms; i++) {
      const cx = rng.random(size * 0.12, size * 0.88);
      const cy = rng.random(size * 0.12, size * 0.88);
      const r = (size * 0.1 + rng.random(0, size * 0.16)) * (0.6 + params.scale * 1.2);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hsb(nvHue + bloomHueBias, 15, 100));
      grad.addColorStop(0.18, hsb(nvHue + bloomHueBias, 30, 98));
      grad.addColorStop(0.45, hsb(nvHue, 60, 75));
      grad.addColorStop(0.75, hsb(nvHue, 70, 30));
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Blown-out white-clip core: the innermost region where the
      // intensifier has fully saturated past any detail at all.
      const coreR = r * 0.22;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Subtle vignette: intensifier tubes commonly dim toward the edges.
    const vignette = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.35,
      size / 2,
      size / 2,
      size * 0.72
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);
  },
};
