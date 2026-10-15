import { hsb, rgba } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * View-dependent specular/color patches that look locally plausible but
 * break multi-view photometric consistency. NeRF/SfM pipelines assume a
 * patch's appearance (its highlight position, hue, and brightness) is
 * explainable by ONE consistent set of light + camera directions across
 * every view. This engine scatters a seeded field of elliptical/polygonal
 * patches, each rendered with its own independently-randomized fake "view
 * angle" that shifts the glint position and tints the patch — so every
 * patch is internally coherent (it reads as a believable specular highlight
 * on its own) while the implied lighting/viewing directions across the
 * whole canvas visibly disagree with each other.
 */
export const nerfViewInconsistency: RenderEngine = {
  id: "nerf_view_inconsistency",
  label: "NeRF View Inconsistency",
  description:
    "Specular patches that look plausible alone but disagree on lighting direction across views, breaking multi-view photometric consistency.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;
    const accent = params.accentHue;

    // Dark neutral base plate so specular patches read clearly against it.
    ctx.fillStyle = "rgb(12, 13, 16)";
    ctx.fillRect(0, 0, size, size);

    // Faint seeded base-color undertone field: a handful of broad soft
    // blobs that establish a "surface albedo" the patches sit on top of.
    const undertoneCount = Math.max(2, Math.round(2 + params.density * 4));
    for (let u = 0; u < undertoneCount; u++) {
      const ux = rng.random(0.1, 0.9) * 800 * s;
      const uy = rng.random(0.1, 0.9) * 800 * s;
      const ur = rng.random(150, 320) * s * (0.6 + params.scale);
      const uHue = (accent + rng.random(-40, 40) + u * 23) % 360;
      const grad = ctx.createRadialGradient(ux, uy, 0, ux, uy, ur);
      grad.addColorStop(0, hsb(uHue, 22, 22));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ux, uy, ur, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Main patch field: count driven by density, size by scale.
    const patchCount = Math.max(10, Math.round(14 + params.density * 70));
    const minR = 14 * s * (0.4 + params.scale);
    const maxR = 46 * s * (0.6 + params.scale * 1.6);

    for (let i = 0; i < patchCount; i++) {
      const cx = rng.random(0.03, 0.97) * 800 * s;
      const cy = rng.random(0.03, 0.97) * 800 * s;
      const rx = rng.random(minR, maxR);
      const ry = rx * rng.random(0.55, 1.35);
      const rot = rng.random(0, Math.PI * 2);

      // Fake per-patch "view angle": an independent, seeded direction (in
      // radians) standing in for the direction this patch's highlight
      // would be lit from if it were a real surface viewed from a single
      // consistent camera+light pair. Because each patch gets its own
      // random draw, neighboring patches' implied directions have no
      // relationship to each other.
      const viewAngle = rng.random(0, Math.PI * 2);
      const viewStrength = rng.random(0.35, 0.95); // how far the glint sits off-center

      // Patch shape: alternate ellipse / polygon so the field isn't uniform.
      const isPolygon = rng.random() > 0.55;
      const sides = isPolygon ? rng.randomInt(3, 7) : 0;

      // Base hue drifts from the accent per-patch, independent of the
      // glint's own hue bias below — another source of cross-patch
      // disagreement.
      const baseHue = (accent + rng.random(-60, 60) + i * 11) % 360;
      const baseSat = rng.random(18, 45);
      const baseBright = rng.random(18, 38);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Clip to the patch silhouette so the specular gradient can't bleed
      // outside it, matching how a real highlight stays bound to its
      // surface patch.
      ctx.beginPath();
      if (isPolygon) {
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * Math.PI * 2;
          const px = Math.cos(a) * rx;
          const py = Math.sin(a) * ry;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      }
      ctx.clip();

      // Patch base fill (the "albedo").
      ctx.fillStyle = hsb(baseHue, baseSat, baseBright);
      ctx.fillRect(-rx, -ry, rx * 2, ry * 2);

      // Glint position offset by the fake view angle — this is the visual
      // encoding of "where this patch thinks the camera/light is," and it
      // is uncorrelated with every other patch's glint direction.
      const glintX = Math.cos(viewAngle) * rx * viewStrength;
      const glintY = Math.sin(viewAngle) * ry * viewStrength;
      const glintR = Math.max(rx, ry) * rng.random(0.5, 1.0);

      // Glint hue is biased away from the base hue by the view angle
      // itself, so patches with very different implied view directions
      // also diverge in color temperature, not just highlight placement —
      // a stronger, more legible break in photometric consistency.
      const glintHue = (baseHue + (viewAngle / (Math.PI * 2)) * 180) % 360;

      const grad = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, glintR);
      grad.addColorStop(0, hsb(glintHue, 15, 98));
      grad.addColorStop(0.25, hsb(glintHue, 35, 88));
      grad.addColorStop(0.6, hsb((glintHue + 20) % 360, 55, Math.min(60, baseBright + 25)));
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.globalAlpha = rng.random(0.6, 0.95);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(glintX, glintY, glintR, 0, Math.PI * 2);
      ctx.fill();

      // A secondary, dimmer "rim" glint on the opposite side from the main
      // highlight, as if a second contradictory light source were also
      // hitting the same patch — another locally-plausible but globally
      // inconsistent cue.
      const rimX = -glintX * rng.random(0.4, 0.8);
      const rimY = -glintY * rng.random(0.4, 0.8);
      const rimR = glintR * rng.random(0.35, 0.6);
      const rimHue = (glintHue + 150 + rng.random(-20, 20)) % 360;
      const rimGrad = ctx.createRadialGradient(rimX, rimY, 0, rimX, rimY, rimR);
      rimGrad.addColorStop(0, hsb(rimHue, 40, 70));
      rimGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = rng.random(0.25, 0.5);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(rimX, rimY, rimR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Thin outline so patch boundaries (where the inconsistency is most
      // visually legible against neighbors) stay crisp.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = rgba(255, 255, 255, 1);
      ctx.lineWidth = Math.max(0.5, 1 * s);
      ctx.beginPath();
      if (isPolygon) {
        for (let k = 0; k < sides; k++) {
          const a = (k / sides) * Math.PI * 2;
          const px = Math.cos(a) * rx;
          const py = Math.sin(a) * ry;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Sparse directional "epipolar" guide lines faintly sweeping across the
    // canvas at frequency-driven spacing, hinting at the multi-view
    // geometry the patch field is meant to be inconsistent with.
    const lineCount = Math.max(3, Math.round(3 + params.frequency * 10));
    ctx.strokeStyle = rgba(255, 255, 255, 0.05);
    ctx.lineWidth = Math.max(0.5, 1 * s);
    for (let l = 0; l < lineCount; l++) {
      const t = (l + 0.5) / lineCount;
      const angle = rng.random(-0.35, 0.35);
      const y0 = t * 800 * s;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, y0 - Math.tan(angle) * 400 * s);
      ctx.lineTo(800 * s, y0 + Math.tan(angle) * 400 * s);
      ctx.stroke();
      ctx.restore();
    }
  },
};
