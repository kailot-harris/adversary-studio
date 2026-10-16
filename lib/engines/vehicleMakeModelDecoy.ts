import { Rng } from "@/lib/mulberry32";
import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * vehicle_make_model_decoy: draws a simplified vehicle front-silhouette
 * (hood line, grille outline, headlight ovals) and then stamps seeded
 * high-contrast badge/glyph-shaped noise blocks across the grille region.
 * Real make/model classifiers lean heavily on grille shape, badge
 * geometry, and headlight silhouette as discriminative features — by
 * flooding exactly that region with plausible-but-inconsistent
 * badge/glyph-like high-contrast shapes, the grille's "signature" becomes
 * ambiguous between many different badge readings at once.
 */
export const vehicleMakeModelDecoy: RenderEngine = {
  id: "vehicle_make_model_decoy",
  label: "Vehicle Make/Model Decoy",
  description:
    "Grille/badge-shaped high-contrast glyph noise stamped on a vehicle silhouette to confuse make/model classifiers.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800; // tuned against an 800px reference canvas, like the other engines

    // Dusk-lot background so the silhouette reads as a dark foreground shape.
    ctx.fillStyle = "rgb(16, 17, 20)";
    ctx.fillRect(0, 0, size, size);

    // Faint horizon/ground bands behind the vehicle.
    const bands = rng.randomInt(3, 5);
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgb(22, 23, 27)" : "rgb(12, 13, 15)";
      const y = rng.random(0, 800) * s;
      const h = rng.random(30, 90) * s;
      ctx.fillRect(0, y, size, h);
    }

    const scaleMul = 0.75 + params.scale * 0.6;

    // --- Vehicle front-silhouette geometry (reference 800px units) ---
    const bodyW = 560 * scaleMul;
    const bodyCx = 400;
    const bodyLeft = bodyCx - bodyW / 2;
    const bodyRight = bodyCx + bodyW / 2;

    const hoodTopY = 260;
    const hoodBottomY = 420;
    const bumperBottomY = 560;

    ctx.save();
    ctx.scale(s, s);

    // Hood line: a gently sloped quad from the hood top to the bumper.
    ctx.fillStyle = "rgb(34, 36, 40)";
    ctx.beginPath();
    ctx.moveTo(bodyLeft + bodyW * 0.08, hoodTopY);
    ctx.lineTo(bodyRight - bodyW * 0.08, hoodTopY);
    ctx.lineTo(bodyRight, hoodBottomY);
    ctx.quadraticCurveTo(bodyRight, bumperBottomY, bodyRight - bodyW * 0.05, bumperBottomY);
    ctx.lineTo(bodyLeft + bodyW * 0.05, bumperBottomY);
    ctx.quadraticCurveTo(bodyLeft, bumperBottomY, bodyLeft, hoodBottomY);
    ctx.closePath();
    ctx.fill();

    // Hood crease line (pure vector detail, no fill).
    ctx.strokeStyle = "rgb(48, 50, 56)";
    ctx.lineWidth = Math.max(1, 2 * s) / s;
    ctx.beginPath();
    ctx.moveTo(bodyLeft + bodyW * 0.12, hoodTopY + 10);
    ctx.lineTo(bodyRight - bodyW * 0.12, hoodTopY + 10);
    ctx.stroke();

    // --- Headlight ovals, one each side, flanking the grille ---
    const headlightW = bodyW * 0.16;
    const headlightH = headlightW * 0.55;
    const headlightY = hoodBottomY + (bumperBottomY - hoodBottomY) * 0.35;
    const headlightInset = bodyW * 0.1;

    const drawHeadlight = (cx: number) => {
      ctx.save();
      ctx.translate(cx, headlightY);
      ctx.rotate(rng.random(-0.06, 0.06));
      const grd = ctx.createRadialGradient(0, 0, 1, 0, 0, headlightW / 2);
      grd.addColorStop(0, "rgb(230, 232, 225)");
      grd.addColorStop(1, "rgb(140, 145, 150)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(0, 0, headlightW / 2, headlightH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgb(60, 62, 66)";
      ctx.lineWidth = Math.max(1, 2 * s) / s;
      ctx.stroke();
      ctx.restore();
    };
    drawHeadlight(bodyLeft + headlightInset + headlightW / 2);
    drawHeadlight(bodyRight - headlightInset - headlightW / 2);

    // --- Grille outline: the central region the decoy noise targets ---
    const grilleW = bodyW * 0.42;
    const grilleH = (bumperBottomY - hoodBottomY) * 0.78;
    const grilleLeft = bodyCx - grilleW / 2;
    const grilleTop = headlightY - grilleH / 2;

    ctx.fillStyle = "rgb(10, 10, 12)";
    ctx.fillRect(grilleLeft, grilleTop, grilleW, grilleH);
    ctx.strokeStyle = "rgb(70, 72, 78)";
    ctx.lineWidth = Math.max(1.5, 3 * s) / s;
    ctx.strokeRect(grilleLeft, grilleTop, grilleW, grilleH);

    // Horizontal grille slats as faint structural context behind the noise.
    const slats = rng.randomInt(4, 7);
    ctx.strokeStyle = "rgb(30, 32, 36)";
    ctx.lineWidth = Math.max(1, 1.5 * s) / s;
    for (let i = 1; i < slats; i++) {
      const y = grilleTop + (grilleH * i) / slats;
      ctx.beginPath();
      ctx.moveTo(grilleLeft + grilleW * 0.04, y);
      ctx.lineTo(grilleLeft + grilleW * 0.96, y);
      ctx.stroke();
    }

    // --- Seeded high-contrast badge/glyph-shaped noise blocks over the grille ---
    // The core confusion mechanism: a flood of plausible badge-emblem shapes
    // (circles, diamonds, chevrons, bar-glyphs) at random positions/angles,
    // each rendered in hard black/white contrast so no single badge reading
    // dominates the region a make/model classifier would attend to.
    const blockCount = Math.round(rng.randomInt(14, 26) * (0.5 + params.density * 1.3));
    const glyphScale = 0.55 + params.scale * 0.9;

    for (let i = 0; i < blockCount; i++) {
      const gx = rng.random(grilleLeft + grilleW * 0.08, grilleLeft + grilleW * 0.92);
      const gy = rng.random(grilleTop + grilleH * 0.08, grilleTop + grilleH * 0.92);
      const gsize = rng.random(18, 42) * glyphScale;
      const angle = rng.random(0, Math.PI * 2);
      const kind = rng.randomInt(0, 5);
      const highContrast = rng.random(1) > 0.5;
      const isAccent = rng.random(1) > 0.78;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(angle);

      if (isAccent) {
        ctx.fillStyle = hsb(params.accentHue, 85, 90);
      } else {
        ctx.fillStyle = highContrast ? "rgb(240, 240, 238)" : "rgb(8, 8, 10)";
      }

      if (kind === 0) {
        // Circular badge disc.
        ctx.beginPath();
        ctx.arc(0, 0, gsize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 1) {
        // Diamond emblem.
        ctx.beginPath();
        ctx.moveTo(0, -gsize / 2);
        ctx.lineTo(gsize / 2, 0);
        ctx.lineTo(0, gsize / 2);
        ctx.lineTo(-gsize / 2, 0);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 2) {
        // Chevron (two angled bars meeting at a point) — badge-wing-like.
        const barW = Math.max(2, gsize * 0.18);
        ctx.save();
        ctx.rotate(Math.PI / 5);
        ctx.fillRect(-gsize / 2, -barW / 2, gsize, barW);
        ctx.restore();
        ctx.save();
        ctx.rotate(-Math.PI / 5);
        ctx.fillRect(-gsize / 2, -barW / 2, gsize, barW);
        ctx.restore();
      } else if (kind === 3) {
        // Glyph-like bar-cluster (mimics a badge's lettering block).
        const bars = rng.randomInt(2, 4);
        const barW = Math.max(1.5, gsize * 0.16);
        const gap = gsize / bars;
        for (let b = 0; b < bars; b++) {
          const bx = -gsize / 2 + b * gap + gap / 2;
          const bh = gsize * rng.random(0.4, 1);
          ctx.fillRect(bx - barW / 2, -bh / 2, barW, bh);
        }
      } else {
        // Ring badge outline (stroked, not filled) for contrast variety.
        ctx.strokeStyle = ctx.fillStyle as string;
        ctx.lineWidth = Math.max(1.5, gsize * 0.14);
        ctx.beginPath();
        ctx.arc(0, 0, gsize / 2.4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Grille outline redrawn on top at low alpha so the decoy noise still
    // reads as "inside a grille," not a loose scatter of shapes.
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "rgb(90, 92, 98)";
    ctx.lineWidth = Math.max(1.5, 2.5 * s) / s;
    ctx.strokeRect(grilleLeft, grilleTop, grilleW, grilleH);
    ctx.globalAlpha = 1;

    ctx.restore();
  },
};
