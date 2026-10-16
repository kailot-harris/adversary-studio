import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a fake radial brightness falloff that mimics ordinary lens
 * vignetting — but the "optical center" the falloff brightens around is
 * deliberately offset away from the canvas's true center. A camera's
 * auto-exposure (and a lot of saliency/attention models) will read the
 * brightest region of a frame as the subject; by faking a bright "hot
 * zone" off to one side and darkening everything else toward the true
 * frame center, this biases that attention toward a region that was never
 * actually the point of interest. A faint seeded content grid underneath
 * gives the falloff something real to act on, and a soft accent-hued glow
 * marks the fake hot zone itself as a secondary decoy cue.
 */
export const vignetteFalloffDecoy: RenderEngine = {
  id: "vignette_falloff_decoy",
  label: "Vignette Falloff Decoy",
  description: "Off-center fake lens-vignetting brightness falloff that biases auto-exposure/attention away from true center.",

  render(ctx, size, rng, params: EngineParams) {
    // Neutral mid-dark base — gives the falloff a believable "photo" floor to darken/brighten.
    ctx.fillStyle = "rgb(26, 27, 30)";
    ctx.fillRect(0, 0, size, size);

    // --- Faint seeded content grid: a plausible "scene" for the fake exposure to act on. ---
    const cellsNative = 6 + Math.round(params.density * 10); // 6..16 cells per side
    const cell = size / cellsNative;
    const freq = 0.08 + params.frequency * 0.3;
    const baseHue = (params.accentHue + 150) % 360;

    for (let gy = 0; gy < cellsNative; gy++) {
      for (let gx = 0; gx < cellsNative; gx++) {
        // One noise sample per block (block-quantized, not per-pixel).
        const n = rng.noise(gx * freq, gy * freq);
        const tone = 30 + n * 35;
        ctx.fillStyle = hsb(baseHue, 12, tone);
        ctx.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
      }
    }

    // --- Off-center "fake optical center" the vignette brightens around. ---
    // Scale slider governs how far the fake center is flung from true center.
    const offsetAngle = rng.random() * Math.PI * 2;
    const offsetMag = (0.18 + params.scale * 0.32) * size; // 0.18..0.5 of size, off-center
    const trueCenter = size / 2;
    const fakeCx = trueCenter + Math.cos(offsetAngle) * offsetMag;
    const fakeCy = trueCenter + Math.sin(offsetAngle) * offsetMag;

    // Falloff radius: density slider controls how tight/broad the bright zone reads.
    const innerR = size * (0.05 + params.density * 0.08);
    const outerR = size * (0.65 + (1 - params.density) * 0.35);

    // Multiply a radial gradient (bright near fake center, dark at the true-center-relative
    // edges) over the whole canvas — this is the vignette itself, just recentered.
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    const vignette = ctx.createRadialGradient(fakeCx, fakeCy, innerR, fakeCx, fakeCy, outerR);
    vignette.addColorStop(0, "rgba(255, 255, 255, 1)");
    vignette.addColorStop(0.55, "rgba(180, 180, 180, 1)");
    vignette.addColorStop(1, "rgba(8, 8, 10, 1)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    // --- Decoy glow: an accent-hued soft halo marking the fake hot zone directly, ---
    // reinforcing it as the "attention" target over anything actually centered.
    const glowR = size * (0.12 + params.scale * 0.1);
    const glow = ctx.createRadialGradient(fakeCx, fakeCy, 0, fakeCx, fakeCy, glowR);
    glow.addColorStop(0, hsb(params.accentHue, 65, 100));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.35 + params.frequency * 0.25;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
    ctx.globalAlpha = 1;

    // --- Hard corner crush: push the true-center corners further toward black so the ---
    // "real" frame center reads as underexposed relative to the fake hot zone.
    const cornerCrush = ctx.createRadialGradient(trueCenter, trueCenter, size * 0.1, trueCenter, trueCenter, size * 0.75);
    cornerCrush.addColorStop(0, "rgba(0, 0, 0, 0)");
    cornerCrush.addColorStop(1, "rgba(0, 0, 0, 0.35)");
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = cornerCrush;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  },
};
