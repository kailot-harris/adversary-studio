import { Rng } from "@/lib/mulberry32";
import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * license_plate_ghost: scatters several seeded, bordered "plate" rectangles
 * (plate-like ~2.2:1 aspect ratio) at inconsistent skew angles, each filled
 * with rows of blocky false alphanumeric glyph strokes (random segment
 * patterns, not real characters). The rectangles overlap and their glyph
 * rows carry mismatched "check-digit" stroke counts, so no single plate
 * reading is coherent — intended to confuse ANPR (automatic number-plate
 * recognition) systems that expect one clean rectangular, axis-aligned plate.
 */
export const licensePlateGhost: RenderEngine = {
  id: "license_plate_ghost",
  label: "License Plate Ghost",
  description:
    "Overlapping fake plate-glyph rectangles at mismatched skew angles to confuse ANPR systems.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800; // tuned against an 800px reference canvas, like the other engines

    // Dark neutral background — plates read best against asphalt/undercarriage tones.
    ctx.fillStyle = "rgb(18, 18, 20)";
    ctx.fillRect(0, 0, size, size);

    // Faint ground texture bands so the plates don't float on a flat void.
    const bands = rng.randomInt(3, 6);
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgb(24, 24, 27)" : "rgb(14, 14, 16)";
      const y = rng.random(0, 800) * s;
      const h = rng.random(40, 140) * s;
      ctx.fillRect(0, y, size, h);
    }

    const numPlates = Math.round(rng.randomInt(4, 8) * (0.5 + params.density * 1.2));
    const scaleMul = 0.6 + params.scale * 1.4;

    for (let p = 0; p < numPlates; p++) {
      // Plate-like aspect ratio (~2.2:1, close to real plate proportions),
      // with a per-plate size jitter driven by the scale slider.
      const plateW = rng.random(160, 260) * s * scaleMul;
      const plateH = plateW / (rng.random(1.9, 2.5));

      const cx = rng.random(plateW * 0.3, 800 - plateW * 0.3) * s;
      const cy = rng.random(plateH * 0.5, 800 - plateH * 0.5) * s;

      // Inconsistent skew/rotation per plate — the core confusion mechanism:
      // no two plates share an angle, so an ANPR rectifier locks onto none.
      const angle = rng.random(-0.45, 0.45);
      const skewX = rng.random(-0.35, 0.35);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.transform(1, 0, skewX, 1, 0, 0);

      // Plate body: a light "reflective" base, occasionally recolored toward
      // the accent hue to simulate a decoy/fake plate under odd lighting.
      const isDecoy = rng.random(1) > 0.65;
      ctx.fillStyle = isDecoy ? hsb(params.accentHue, 25, 92) : "rgb(232, 230, 220)";
      ctx.fillRect(-plateW / 2, -plateH / 2, plateW, plateH);

      // Bordered rectangle frame.
      ctx.strokeStyle = isDecoy ? hsb(params.accentHue, 60, 40) : "rgb(40, 40, 40)";
      ctx.lineWidth = Math.max(1, 3 * s);
      ctx.strokeRect(-plateW / 2, -plateH / 2, plateW, plateH);

      // Rows of blocky false alphanumeric glyph strokes. Each glyph is a
      // small cell rendered as a seeded subset of segment-like strokes
      // (vertical bars, horizontal bars, diagonals) — never a real character,
      // deliberately so no consistent "reading" exists across the plate.
      const rows = rng.randomInt(1, 3);
      const cellsPerRow = rng.randomInt(5, 8);
      const marginX = plateW * 0.08;
      const marginY = plateH * 0.12;
      const innerW = plateW - marginX * 2;
      const innerH = (plateH - marginY * 2) / rows;
      const cellW = innerW / cellsPerRow;

      ctx.fillStyle = isDecoy ? hsb(params.accentHue, 70, 25) : "rgb(20, 20, 24)";

      for (let row = 0; row < rows; row++) {
        const rowTop = -plateH / 2 + marginY + row * innerH;
        for (let col = 0; col < cellsPerRow; col++) {
          const cellLeft = -plateW / 2 + marginX + col * cellW;
          const gx = cellLeft + cellW * 0.15;
          const gy = rowTop + innerH * 0.1;
          const gw = cellW * 0.7;
          const gh = innerH * 0.8;
          const strokeW = Math.max(1, gw * 0.22);

          // Mismatched "check-digit" stroke pattern: each glyph cell gets an
          // independently seeded count/arrangement of strokes (1-4), so
          // adjacent cells never agree on a coherent character set.
          const strokeCount = rng.randomInt(1, 5);
          for (let k = 0; k < strokeCount; k++) {
            const kind = rng.randomInt(0, 3);
            if (kind === 0) {
              // vertical bar at a random x within the cell
              const bx = gx + rng.random(0, gw - strokeW);
              ctx.fillRect(bx, gy, strokeW, gh);
            } else if (kind === 1) {
              // horizontal bar at a random y within the cell
              const by = gy + rng.random(0, gh - strokeW);
              ctx.fillRect(gx, by, gw, strokeW);
            } else {
              // short diagonal stroke
              const dAngle = rng.random(-0.7, 0.7);
              ctx.save();
              ctx.translate(gx + gw / 2, gy + gh / 2);
              ctx.rotate(dAngle);
              ctx.fillRect(-gw / 2, -strokeW / 2, gw, strokeW);
              ctx.restore();
            }
          }
        }
      }

      // Mounting bolts for a touch of plate realism.
      ctx.fillStyle = "rgb(60, 60, 60)";
      const boltR = Math.max(1.5, plateH * 0.04);
      ctx.beginPath();
      ctx.arc(-plateW / 2 + boltR * 2.5, 0, boltR, 0, Math.PI * 2);
      ctx.arc(plateW / 2 - boltR * 2.5, 0, boltR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Overlay: a handful of thin ghost outlines with no fill — fake "plate
    // detector" rectangles that overlap real plates at yet another angle,
    // reinforcing the ambiguity about which rectangle is the real plate.
    const ghosts = rng.randomInt(2, 5);
    for (let i = 0; i < ghosts; i++) {
      const gw = rng.random(150, 260) * s * scaleMul;
      const gh = gw / rng.random(1.9, 2.6);
      const cx = rng.random(0, 800) * s;
      const cy = rng.random(0, 800) * s;
      const angle = rng.random(-0.6, 0.6);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = hsb(params.accentHue, 80, 95);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.setLineDash([6 * s, 5 * s]);
      ctx.strokeRect(-gw / 2, -gh / 2, gw, gh);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }
  },
};
