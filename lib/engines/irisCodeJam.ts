import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a radial "iris-code" style texture: concentric annular bands, each
 * split into angular wedges whose brightness/hue is set by a 2D Gabor-like
 * modulation (sin of angle * frequency, cos of radius * frequency) and then
 * thresholded into binary bits -- mirroring the bit-vector encoding real iris
 * recognition pipelines (Daugman-style) extract from the iris annulus. The
 * dense, phase-shifted wedge grid is built to jam exactly that encoding:
 * fake "bits" compete with the real iris texture for every angular/radial
 * cell the recognizer would sample.
 */
export const irisCodeJam: RenderEngine = {
  id: "iris_code_jam",
  label: "Iris Code Jam",
  description: "Radial Gabor-like ring patterns mimicking iris-code texture to confuse iris recognition.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = "rgb(6,6,8)";
    ctx.fillRect(0, 0, size, size);

    // Pupil (inner) and limbus (outer) radii -- the annulus iris recognition actually samples.
    const outerR = (300 + params.scale * 70) * s;
    const innerR = outerR * (0.3 + rng.random(0.08));

    // Ring count scales with density; angular resolution scales with frequency.
    const rings = 10 + Math.round(params.density * 22);
    const wedgesPerRing = 24 + Math.round(params.frequency * 64);

    const angFreq = 2 + params.frequency * 10;
    const radFreq = 3 + params.density * 9;

    const phaseA = rng.random(Math.PI * 2);
    const phaseB = rng.random(Math.PI * 2);
    const ringJitterSeed = rng.random(1000);

    const ringThickness = (outerR - innerR) / rings;

    for (let ri = 0; ri < rings; ri++) {
      const r0 = innerR + ri * ringThickness;
      const r1 = r0 + ringThickness * 0.92; // small gap between rings for separation
      const rNorm = ri / rings;

      // Per-ring phase jitter keeps bands from reading as a single clean grating,
      // closer to the irregular, per-ring independence of a real iris code.
      const ringPhase = rng.noise(ringJitterSeed + ri * 0.37) * Math.PI * 2;

      for (let wi = 0; wi < wedgesPerRing; wi++) {
        const a0 = (wi / wedgesPerRing) * Math.PI * 2;
        const a1 = ((wi + 1) / wedgesPerRing) * Math.PI * 2;
        const aMid = (a0 + a1) / 2;

        // Gabor-like modulation: angular carrier * radial carrier, phase-shifted per ring.
        const gabor =
          Math.sin(aMid * angFreq + ringPhase + phaseA) *
          Math.cos(rNorm * radFreq * Math.PI * 2 + phaseB);

        // Threshold into a binary "bit" the way Daugman iris codes quantize phase,
        // then jitter a few bits per ring so the pattern isn't perfectly periodic.
        const flip = wi % 7 === Math.floor(ringJitterSeed + ri) % 7;
        const bit = flip ? gabor <= 0 : gabor > 0;

        const bri = bit ? 65 + Math.abs(gabor) * 30 : 8 + Math.abs(gabor) * 10;
        const sat = bit ? 10 : 25;

        // Rare accent-hue wedges mark "high confidence" fake minutiae to further
        // distract a texture-matching recognizer.
        const isAccent = (ri * wedgesPerRing + wi) % Math.round(37 - params.density * 14) === 0;
        ctx.fillStyle = isAccent ? hsb(params.accentHue, 70, 85) : hsb(0, sat, bri);

        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
        ctx.lineTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
        ctx.arc(cx, cy, r1, a0, a1);
        ctx.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0);
        ctx.arc(cx, cy, r0, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Pupil: flat black disc, matching the dark pupil region the recognizer segments out.
    ctx.fillStyle = "rgb(2,2,2)";
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Limbus boundary ring (iris/sclera edge) -- a crisp false edge to mislead segmentation.
    ctx.strokeStyle = "rgb(230,230,230)";
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.stroke();

    // Sclera wash outside the limbus so the iris annulus reads in context.
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "rgb(235,232,225)";
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  },
};
