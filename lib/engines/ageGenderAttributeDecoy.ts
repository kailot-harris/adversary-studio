import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Draws a stylized face oval, then overlays fine wrinkle/skin-texture-mimicking
 * contrast cues concentrated at the canonical regions an age/gender attribute
 * classifier actually samples: forehead (fine horizontal creases), eye corners
 * (crow's-feet fan lines), nasolabial/cheek folds, and jaw/chin edge softness.
 * The texture is seeded, block-quantized fine noise -- cheap to render, but
 * dense enough to bias a texture-driven attribute estimator toward reading
 * "older"/"different gender" skin-texture cues than the underlying flat oval
 * actually has.
 */
export const ageGenderAttributeDecoy: RenderEngine = {
  id: "age_gender_attribute_decoy",
  label: "Age/Gender Attribute Decoy",
  description:
    "Wrinkle/skin-texture-mimicking contrast cues at canonical attribute-classifier regions, biasing age/gender estimation.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;
    const cx = size / 2;
    const cy = size / 2;

    // Base backdrop.
    ctx.fillStyle = "rgb(18,16,16)";
    ctx.fillRect(0, 0, size, size);

    // --- Stylized face oval -----------------------------------------------
    const faceW = (240 + params.scale * 90) * s;
    const faceH = faceW * 1.28;
    const skinHue = (params.accentHue + rng.random(-10, 10) + 360) % 360;
    const skinBase = hsb(skinHue, 22, 72);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, faceH / faceW);
    ctx.beginPath();
    ctx.arc(0, 0, faceW, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = skinBase;
    ctx.fill();
    ctx.restore();

    // Soft shading gradient for a minimal sense of volume (jaw darker than brow).
    const grad = ctx.createLinearGradient(cx, cy - faceH * 0.52, cx, cy + faceH * 0.52);
    grad.addColorStop(0, "rgba(255,255,255,0.08)");
    grad.addColorStop(0.5, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.14)");
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, faceH / faceW);
    ctx.beginPath();
    ctx.arc(0, 0, faceW, 0, Math.PI * 2);
    ctx.closePath();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, faceW, faceH, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(cx - faceW, cy - faceH, faceW * 2, faceH * 2);
    ctx.restore();

    // Minimal facial landmarks for region anchoring (eyes, nose, mouth) -- kept
    // deliberately simple since this engine's point is the overlaid texture,
    // not a realistic face render.
    const eyeY = cy - faceH * 0.08;
    const eyeDX = faceW * 0.38;
    const eyeRX = faceW * 0.16;
    const eyeRY = eyeRX * 0.55;

    ctx.fillStyle = "rgb(30,26,24)";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + side * eyeDX, eyeY, eyeRX, eyeRY, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(60,40,36,0.55)";
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.moveTo(cx, eyeY + eyeRY * 1.6);
    ctx.lineTo(cx - faceW * 0.05, cy + faceH * 0.1);
    ctx.lineTo(cx + faceW * 0.05, cy + faceH * 0.1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - faceW * 0.22, cy + faceH * 0.34);
    ctx.quadraticCurveTo(cx, cy + faceH * 0.42, cx + faceW * 0.22, cy + faceH * 0.34);
    ctx.stroke();

    // --- Canonical attribute-classifier regions ----------------------------
    // Each region gets fine seeded wrinkle-line + block-quantized noise texture.
    const regions = [
      { cx: cx, cy: cy - faceH * 0.42, rx: faceW * 0.46, ry: faceH * 0.16, kind: "forehead" as const },
      { cx: cx - eyeDX, cy: eyeY + eyeRY * 1.2, rx: faceW * 0.22, ry: faceH * 0.14, kind: "eyeCorner" as const },
      { cx: cx + eyeDX, cy: eyeY + eyeRY * 1.2, rx: faceW * 0.22, ry: faceH * 0.14, kind: "eyeCorner" as const },
      { cx: cx - faceW * 0.3, cy: cy + faceH * 0.14, rx: faceW * 0.26, ry: faceH * 0.2, kind: "cheek" as const },
      { cx: cx + faceW * 0.3, cy: cy + faceH * 0.14, rx: faceW * 0.26, ry: faceH * 0.2, kind: "cheek" as const },
    ];

    const lineDensity = 4 + Math.round(params.density * 14); // wrinkle line count per region
    const noiseFreq = 0.08 + params.frequency * 0.5;
    const noiseSeedBase = rng.random(1000);

    for (const region of regions) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(region.cx, region.cy, region.rx, region.ry, 0, 0, Math.PI * 2);
      ctx.clip();

      // Fine block-quantized noise bed -- cheap, seeded, mimics micro skin-texture
      // contrast without a full per-pixel pass.
      const block = Math.max(2, Math.round(3 * s));
      const x0 = Math.floor((region.cx - region.rx) / block) * block;
      const x1 = Math.ceil((region.cx + region.rx) / block) * block;
      const y0 = Math.floor((region.cy - region.ry) / block) * block;
      const y1 = Math.ceil((region.cy + region.ry) / block) * block;

      for (let y = y0; y < y1; y += block) {
        for (let x = x0; x < x1; x += block) {
          const n = rng.noise(
            noiseSeedBase + x * noiseFreq * 0.01,
            noiseSeedBase + y * noiseFreq * 0.01 + 50
          );
          const bri = 50 + (n - 0.5) * 30;
          ctx.fillStyle = `rgba(40,30,26,${Math.max(0, Math.min(0.4, (n - 0.4) * 0.6))})`;
          ctx.fillRect(x, y, block, block);
          void bri;
        }
      }

      // Wrinkle-like fine lines, per region orientation.
      ctx.strokeStyle = "rgba(55,38,32,0.5)";
      ctx.lineWidth = Math.max(0.6, 0.9 * s);

      for (let i = 0; i < lineDensity; i++) {
        const t = i / Math.max(1, lineDensity - 1);
        const jitter = (rng.noise(noiseSeedBase + i * 0.11) - 0.5) * 0.3;

        if (region.kind === "forehead") {
          // Fine horizontal creases spanning the brow band.
          const ly = region.cy - region.ry * 0.7 + t * region.ry * 1.4;
          const sag = Math.sin(t * Math.PI) * region.ry * 0.12 * (0.4 + params.density);
          ctx.beginPath();
          ctx.moveTo(region.cx - region.rx * 0.85, ly + jitter * region.ry);
          ctx.quadraticCurveTo(region.cx, ly - sag, region.cx + region.rx * 0.85, ly + jitter * region.ry);
          ctx.stroke();
        } else if (region.kind === "eyeCorner") {
          // Crow's-feet: a small fan of short radiating lines.
          const angle = -Math.PI / 2 + (t - 0.5) * 1.4 + jitter;
          const len = region.rx * (0.5 + 0.5 * rng.noise(noiseSeedBase + i * 0.23));
          const ox = region.cx + Math.cos(angle) * region.rx * 0.2;
          const oy = region.cy + Math.sin(angle) * region.ry * 0.2;
          ctx.beginPath();
          ctx.moveTo(ox, oy);
          ctx.lineTo(ox + Math.cos(angle) * len, oy + Math.sin(angle) * len);
          ctx.stroke();
        } else {
          // Cheek/nasolabial-style folds: diagonal arcs.
          const ly = region.cy - region.ry * 0.6 + t * region.ry * 1.2;
          ctx.beginPath();
          ctx.moveTo(region.cx - region.rx * 0.7, ly - region.ry * 0.1);
          ctx.quadraticCurveTo(
            region.cx + jitter * region.rx,
            ly + region.ry * 0.25,
            region.cx + region.rx * 0.7,
            ly + region.ry * 0.05
          );
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Accent-hued "classifier confidence" markers at each region's anchor point --
    // a visible tell of exactly which canonical regions are being targeted.
    ctx.fillStyle = hsb(params.accentHue, 65, 90);
    for (const region of regions) {
      ctx.beginPath();
      ctx.arc(region.cx, region.cy - region.ry * 0.9, Math.max(1.5, 2.2 * s), 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
