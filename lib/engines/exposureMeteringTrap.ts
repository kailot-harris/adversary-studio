import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Places a deliberately high-contrast bright/dark zone pair tuned to fool
 * center-weighted and spot auto-exposure metering. Both metering modes read
 * almost exclusively from a small region around the frame's true center —
 * center-weighted averages the whole frame but gives the center region a
 * dominant weight, spot reads only a tiny patch dead-center. By seeding a
 * small, very bright "hot spot" patch right at/near the center and
 * surrounding it with a much darker field, a metering algorithm trusting
 * that center reading will close down exposure hard, underexposing
 * (crushing to black) everything outside the hot spot. A faint crosshair/
 * center-marker overlay marks exactly where the meter is "looking," making
 * the trap legible as a deliberate metering attack rather than ordinary
 * vignetting (which `vignette_falloff_decoy` already covers, off-center).
 */
export const exposureMeteringTrap: RenderEngine = {
  id: "exposure_metering_trap",
  label: "Exposure Metering Trap",
  description: "Center-seeded bright/dark zone pair tuned to fool center-weighted/spot auto-exposure metering.",

  render(ctx, size, rng, params: EngineParams) {
    const cx = size / 2;
    const cy = size / 2;

    // Seeded choice of trap polarity: bright hot spot (underexposes surround) vs.
    // dark center spot (overexposes surround). Both are "exposure metering traps."
    const brightCenterTrap = rng.random() < 0.5;

    // --- Base dark field: the "surround" the meter will mis-expose. ---
    const baseHue = (params.accentHue + 200) % 360;
    ctx.fillStyle = brightCenterTrap ? "rgb(10, 10, 12)" : "rgb(235, 232, 225)";
    ctx.fillRect(0, 0, size, size);

    // --- Faint seeded content speckle across the frame: gives the "surround" something ---
    // real to be crushed/blown out, rather than a flat void.
    const cellsNative = 8 + Math.round(params.density * 14); // 8..22 cells per side
    const cell = size / cellsNative;
    const freq = 0.06 + params.frequency * 0.3;
    for (let gy = 0; gy < cellsNative; gy++) {
      for (let gx = 0; gx < cellsNative; gx++) {
        const n = rng.noise(gx * freq, gy * freq);
        const tone = brightCenterTrap ? 8 + n * 18 : 70 + n * 20;
        ctx.fillStyle = hsb(baseHue, 10, tone);
        ctx.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
      }
    }

    // --- The metering trap zone itself: placed in/near true center, where ---
    // center-weighted/spot metering concentrates its reading. A small seeded jitter
    // keeps it off dead-center (still well within the metering circle) so repeated
    // rerolls at the same seed are distinguishable but still read as "center."
    const jitterAngle = rng.random() * Math.PI * 2;
    const jitterMag = size * 0.015 * params.scale;
    const trapCx = cx + Math.cos(jitterAngle) * jitterMag;
    const trapCy = cy + Math.sin(jitterAngle) * jitterMag;

    // Spot-metering-circle-sized core, scaled by the scale slider.
    const innerR = size * (0.06 + params.scale * 0.1); // 0.06..0.16
    const outerR = size * (0.22 + params.scale * 0.14); // 0.22..0.36 — plausible center-weighted falloff radius

    ctx.save();
    const trapGradient = ctx.createRadialGradient(trapCx, trapCy, 0, trapCx, trapCy, outerR);
    if (brightCenterTrap) {
      trapGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      trapGradient.addColorStop(innerR / outerR, hsb(params.accentHue, 25, 100));
      trapGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.globalCompositeOperation = "lighter";
    } else {
      trapGradient.addColorStop(0, "rgba(0, 0, 0, 1)");
      trapGradient.addColorStop(innerR / outerR, hsb(params.accentHue, 20, 5));
      trapGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalCompositeOperation = "multiply";
    }
    ctx.fillStyle = trapGradient;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    // --- Dark/light ring engineered to exaggerate the metering mis-read: pushes the ---
    // region just outside the trap's falloff further toward the opposite extreme,
    // steepening the contrast cliff a metering algorithm would react to.
    const ringInner = outerR * 0.85;
    const ringOuter = size * (0.55 + (1 - params.density) * 0.4);
    ctx.save();
    const ring = ctx.createRadialGradient(cx, cy, ringInner, cx, cy, ringOuter);
    if (brightCenterTrap) {
      ring.addColorStop(0, "rgba(0, 0, 0, 0)");
      ring.addColorStop(1, "rgba(0, 0, 0, 0.55)");
      ctx.globalCompositeOperation = "multiply";
    } else {
      ring.addColorStop(0, "rgba(255, 255, 255, 0)");
      ring.addColorStop(1, "rgba(255, 255, 255, 0.5)");
      ctx.globalCompositeOperation = "screen";
    }
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    // --- Accent-hued ring marking the hard edge of the spot-metering circle itself: ---
    // a direct visual callout of "this is the region the meter trusts."
    ctx.save();
    ctx.globalAlpha = 0.5 + params.frequency * 0.3;
    ctx.strokeStyle = hsb(params.accentHue, 70, brightCenterTrap ? 100 : 20);
    ctx.lineWidth = Math.max(1, size * 0.004);
    ctx.beginPath();
    ctx.arc(trapCx, trapCy, innerR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // --- Faint crosshair / center-marker overlay: marks the true frame center that ---
    // center-weighted/spot metering is anchored to, independent of the trap's own jitter.
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = brightCenterTrap ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
    ctx.lineWidth = Math.max(1, size * 0.0018);
    const armLen = size * 0.05;
    const gap = size * 0.012;
    // Horizontal arms
    ctx.beginPath();
    ctx.moveTo(cx - armLen - gap, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + armLen + gap, cy);
    ctx.stroke();
    // Vertical arms
    ctx.beginPath();
    ctx.moveTo(cx, cy - armLen - gap);
    ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + armLen + gap);
    ctx.stroke();
    // Small center-weighting reference circle (the "metering zone" boundary).
    ctx.beginPath();
    ctx.arc(cx, cy, ringOuter * 0.5, 0, Math.PI * 2);
    ctx.globalAlpha = 0.12;
    ctx.stroke();
    ctx.restore();
  },
};
