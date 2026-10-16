import { hsbToRgb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Mimics Photo-Response Non-Uniformity (PRNU) — the fine, fixed-pattern
 * speckle noise left on every photo by a camera sensor's silicon
 * imperfections, used by camera-source-identification forensics to match
 * images back to the specific device that captured them. The real artifact
 * is subtle (a low-amplitude multiplicative speckle, not visible to a
 * casual look) and consistent across the whole frame, so this renders a
 * block-quantized (not per-pixel) noise field with low contrast variation
 * across the entire canvas.
 *
 * On top of that, a faint seeded boundary line splits the frame into two
 * zones whose fixed-pattern noise statistics (amplitude/bias) subtly
 * differ — a visual cue for a "two-camera-fingerprint collision," as if
 * two different sensor fingerprints were stitched into one frame, which is
 * exactly the kind of inconsistency PRNU-matching forensics looks for.
 */
export const prnuNoiseMimic: RenderEngine = {
  id: "prnu_noise_mimic",
  label: "PRNU Noise Mimic",
  description:
    "Fine fixed-pattern noise mimicking sensor PRNU fingerprints, confusing camera-source-identification forensics.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const coordScale = 800 / size; // sample at native 800px cadence regardless of canvas size

    // Block size: fine, 2-4px at native 800px cadence, driven by frequency
    // (higher frequency => finer grain, closer to true per-pixel PRNU).
    const blockPxNative = 4 - Math.round(params.frequency * 2); // 4..2
    const blockPx = Math.max(1, Math.round(blockPxNative * (size / 800)));

    // Base mid-gray "sensor" level the fixed-pattern noise sits on top of,
    // with a very faint low-frequency vignette-like gradient underneath so
    // it reads as sitting on an exposed frame rather than pure noise.
    const baseOffX = rng.random(1000);
    const baseOffY = rng.random(1000);
    const baseScale = 0.0015 + (1 - params.scale) * 0.004;
    const baseLevel = 40 + params.density * 10; // 40-50

    // Fixed-pattern noise sample offsets — one noise() call per block, kept
    // low-amplitude (true PRNU is a subtle few-percent modulation, not a
    // loud speckle).
    const fpOffX = rng.random(1000);
    const fpOffY = rng.random(1000);
    const fpScale = 0.4 + params.scale * 0.6; // fine-grained noise lattice
    const fpAmp = 2 + params.density * 6; // 2-8, deliberately low contrast

    // Seeded boundary line splitting the frame into two "sensor fingerprint"
    // zones, drawn as a faint diagonal with mild seeded wobble.
    const boundaryBaseY = size * (0.3 + rng.random(0.4)); // 0.3-0.7 of height
    const boundarySlope = rng.random(-0.3, 0.3);
    const boundaryWobbleOffX = rng.random(1000);
    const boundaryWobbleAmp = size * 0.02;

    // Zone B (below the boundary) gets a distinct amplitude/bias so its
    // fixed-pattern noise statistics subtly diverge from zone A's — the
    // "two sensors stitched together" tell.
    const zoneBAmpMult = 1.6 + params.density * 0.8; // noticeably different amplitude
    const zoneBBias = 6 + params.frequency * 6;

    const hue = params.accentHue;
    const boundaryLineHalfWidth = Math.max(1, size * 0.0015);

    for (let by = 0; by < size; by += blockPx) {
      for (let bx = 0; bx < size; bx += blockPx) {
        const sx = bx * coordScale;
        const sy = by * coordScale;

        // Faint underlying gradient (not the PRNU itself, just a base level
        // for the speckle to modulate).
        const base = rng.noise(sx * baseScale + baseOffX, sy * baseScale + baseOffY);
        const baseBri = baseLevel + base * 12;

        // The fixed-pattern noise sample for this block.
        const fp = rng.noise(sx * fpScale + fpOffX, sy * fpScale + fpOffY) - 0.5; // -0.5..0.5

        // Determine which "sensor fingerprint" zone this block falls in,
        // via the seeded wobbly boundary line.
        const wobble =
          Math.sin(bx * 0.015 + boundaryWobbleOffX * 10) * boundaryWobbleAmp;
        const boundaryYHere = boundaryBaseY + boundarySlope * bx + wobble;
        const distToBoundary = Math.abs(by - boundaryYHere);
        const inZoneB = by > boundaryYHere;

        const ampMult = inZoneB ? zoneBAmpMult : 1;
        const bias = inZoneB ? zoneBBias : 0;

        let bri = baseBri + fp * fpAmp * ampMult + bias * 0.15;

        // Draw the faint boundary line itself as a subtle brightness lift,
        // so the zone split reads as a deliberate visual cue, not just a
        // statistical difference invisible to the eye.
        if (distToBoundary <= boundaryLineHalfWidth + blockPx) {
          bri += 10;
        }

        bri = Math.max(0, Math.min(100, bri));

        // Very low saturation overall — PRNU noise mimics luminance-channel
        // sensor noise, not color noise — with a faint accent-hue tint only
        // near the boundary line to mark the collision zone.
        const sat = distToBoundary <= boundaryLineHalfWidth * 6 ? 12 + params.frequency * 10 : 3;

        const [r, g, b] = hsbToRgb(hue, sat, bri);

        const yEnd = Math.min(size, by + blockPx);
        const xEnd = Math.min(size, bx + blockPx);
        for (let y = by; y < yEnd; y++) {
          for (let x = bx; x < xEnd; x++) {
            const idx = (x + y * size) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};
