import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Simulates a rolling-shutter / frame-alignment failure: a base scene (a
 * grid of shaded cells plus a scatter of circular "markers," the kind of
 * high-contrast features a stabilization/optical-flow algorithm would try
 * to track) is sliced into horizontal bands and redrawn band-by-band with
 * each band's content horizontally sheared by a seeded, oscillating amount
 * — increasing then snapping back, like a sensor readout racing ahead of
 * (or behind) true motion mid-frame. Thin bright diagonal "tear seam" lines
 * are drawn at each band boundary to sell the skew, and a few bands get an
 * extra duplicate/ghost copy offset the opposite direction to mimic the
 * doubled-edge artifact rolling shutter produces on fast-moving edges.
 * Frame-to-frame feature matching keys on edge continuity across rows —
 * this engine exists specifically to break that continuity in a structured,
 * deterministic way.
 */
export const rollingShutterTear: RenderEngine = {
  id: "rolling_shutter_tear",
  label: "Rolling Shutter Tear",
  description: "Diagonal shear-banding simulating rolling-shutter skew to confuse frame-alignment/stabilization algorithms.",

  render(ctx, size, rng, params: EngineParams) {
    ctx.fillStyle = "rgb(10, 11, 14)";
    ctx.fillRect(0, 0, size, size);

    // Frequency/density slider: number of horizontal shutter bands.
    const bandCount = Math.round(14 + params.frequency * 46 + params.density * 10);
    const bandHeight = size / bandCount;

    // Scale slider: how far a band's content can be sheared horizontally.
    const maxShear = size * (0.04 + params.scale * 0.22);

    const accentColor = hsb(params.accentHue, 85, 100);
    const seamColor = hsb((params.accentHue + 180) % 360, 70, 100);

    // --- Build the base "scene": a shaded cell grid plus scattered marker
    // dots, i.e. the kind of textured, trackable content a stabilization
    // algorithm would try to lock onto across frames.
    const gridCols = Math.max(6, Math.round(8 + params.density * 18));
    const cellW = size / gridCols;

    for (let row = 0; row < Math.ceil(size / cellW); row++) {
      for (let col = 0; col < gridCols; col++) {
        const shade = 30 + rng.random() * 60;
        const tint = rng.random() < 0.22 ? accentColor : `rgb(${shade}, ${shade}, ${shade + 6})`;
        ctx.fillStyle = tint;
        ctx.fillRect(col * cellW, row * cellW, cellW - 1, cellW - 1);
      }
    }

    const markerCount = Math.round(40 + params.density * 160);
    for (let i = 0; i < markerCount; i++) {
      const mx = rng.random(0, size);
      const my = rng.random(0, size);
      const r = size * (0.004 + rng.random() * 0.012);
      ctx.beginPath();
      ctx.fillStyle = rng.random() < 0.5 ? "rgb(235, 238, 242)" : accentColor;
      ctx.globalAlpha = 0.65 + rng.random() * 0.35;
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Snapshot the base scene so each band can be redrawn (sheared) from a
    // stable source rather than compounding shifts band over band.
    const baseScene = ctx.getImageData(0, 0, size, size);

    // Wipe and redraw band-by-band from the snapshot, each shifted by a
    // seeded amount that oscillates (ramps up, then tears back down/resets)
    // across the sequence of bands — the hallmark rolling-shutter skew
    // pattern, as opposed to a single constant global shear.
    ctx.putImageData(baseScene, 0, 0);

    let shearDir = 1;
    let shearAccum = 0;
    const shearStep = maxShear / (3 + Math.floor(params.frequency * 6));

    const offscreen = document.createElement("canvas");
    offscreen.width = size;
    offscreen.height = size;
    const octx = offscreen.getContext("2d")!;
    octx.putImageData(baseScene, 0, 0);

    for (let b = 0; b < bandCount; b++) {
      const y0 = b * bandHeight;
      const h = b === bandCount - 1 ? size - y0 : bandHeight;

      // Oscillate the shear: ramp in `shearDir`, occasionally reverse
      // seeded-randomly to produce the characteristic tear/reset look.
      shearAccum += shearDir * shearStep;
      if (Math.abs(shearAccum) >= maxShear || rng.random() < 0.08 + params.frequency * 0.1) {
        shearDir *= -1;
        shearAccum = shearDir * shearStep * 0.5;
      }
      const shiftX = shearAccum + (rng.random() - 0.5) * bandHeight * 0.4;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, size, h);
      ctx.clip();
      ctx.translate(shiftX, 0);
      ctx.drawImage(offscreen, 0, 0);
      ctx.restore();

      // Occasional ghost duplicate offset the opposite direction, mimicking
      // the doubled-edge artifact rolling shutter produces on fast edges.
      if (rng.random() < 0.25 + params.density * 0.25) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y0, size, h);
        ctx.clip();
        ctx.globalAlpha = 0.25 + rng.random() * 0.2;
        ctx.translate(-shiftX * 0.6, 0);
        ctx.drawImage(offscreen, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Thin bright diagonal tear-seam line at this band's boundary,
      // angled to visually read as the skew between this band and the
      // next rather than a flat horizontal cut.
      const nextShiftHint = shiftX + shearDir * shearStep * bandHeight * 0.015;
      ctx.beginPath();
      ctx.moveTo(0, y0 + h);
      ctx.lineTo(size, y0 + h + (nextShiftHint - shiftX) * 0.05);
      ctx.strokeStyle = seamColor;
      ctx.globalAlpha = 0.5 + Math.min(0.4, Math.abs(shiftX) / maxShear);
      ctx.lineWidth = Math.max(1, size * 0.0015);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
};
