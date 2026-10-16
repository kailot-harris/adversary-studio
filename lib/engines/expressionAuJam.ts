import { hsb } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

type AuZone = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
};

/**
 * Targets Facial Action Unit (AU) coding directly rather than full 68-point
 * landmark triangulation: a stylized face oval is drawn per decoy face, then
 * localized high-contrast patches are stamped at the canonical AU zones an
 * expression/emotion classifier reads texture gradients from — brow ridge
 * (AU1/2/4), nasolabial fold (AU6/9/11), and lip corners (AU12/15/20). Each
 * patch is a seeded cluster of hard-edged light/dark slashes crossing the
 * zone at odd angles, meant to pollute the local gradient signal those zones
 * carry without erasing the face's overall plausibility.
 */
export const expressionAuJam: RenderEngine = {
  id: "expression_au_jam",
  label: "Expression AU Jam",
  description:
    "Localized high-contrast patches at facial Action Unit zones (brow, nasolabial fold, lip corners) to confuse emotion/expression classifiers.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;

    ctx.fillStyle = "rgb(9, 10, 13)";
    ctx.fillRect(0, 0, size, size);

    const accent = hsb(params.accentHue, 90, 95);

    const faceCount = Math.max(1, Math.round(rng.randomInt(1, 3) * (0.5 + params.density)));

    for (let f = 0; f < faceCount; f++) {
      const cx = rng.random(220, 580) * s;
      const cy = rng.random(220, 580) * s;
      const faceW = rng.random(180, 260) * s * (0.6 + params.scale);
      const faceH = faceW * rng.random(1.15, 1.35);

      drawFaceOval(ctx, cx, cy, faceW, faceH, s);
      drawEyesAndBrowLine(ctx, cx, cy, faceW, faceH, s);
      drawNoseAndMouth(ctx, cx, cy, faceW, faceH, s);

      const zones = buildAuZones(cx, cy, faceW, faceH);
      for (const zone of zones) {
        drawAuPatch(ctx, rng, zone, accent, params.frequency, params.density, s);
      }
    }
  },
};

/** A simple stylized face oval + jaw contour so AU zones have a plausible anchor. */
function drawFaceOval(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, s: number) {
  ctx.strokeStyle = "rgba(225, 228, 232, 0.55)";
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** Minimal eye ellipses + a faint brow baseline, just enough face structure to orient the AU zones. */
function drawEyesAndBrowLine(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, s: number) {
  ctx.strokeStyle = "rgba(225, 228, 232, 0.4)";
  ctx.lineWidth = 1.2 * s;

  for (const side of [-1, 1]) {
    const ex = cx + side * w * 0.18;
    const ey = cy - h * 0.1;
    ctx.beginPath();
    ctx.ellipse(ex, ey, w * 0.09, h * 0.045, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Faint brow baseline above each eye.
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.12, ey - h * 0.09);
    ctx.lineTo(ex + w * 0.12, ey - h * 0.09);
    ctx.stroke();
  }
}

/** Minimal nose bridge + lip line for visual context around the mouth-corner AU zones. */
function drawNoseAndMouth(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, s: number) {
  ctx.strokeStyle = "rgba(225, 228, 232, 0.35)";
  ctx.lineWidth = 1.2 * s;

  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.02);
  ctx.lineTo(cx, cy + h * 0.14);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - w * 0.16, cy + h * 0.3);
  ctx.quadraticCurveTo(cx, cy + h * 0.34, cx + w * 0.16, cy + h * 0.3);
  ctx.stroke();
}

/** Canonical Action Unit zone positions/extents, relative to a face centered at (cx, cy) sized (w, h). */
function buildAuZones(cx: number, cy: number, w: number, h: number): AuZone[] {
  const zones: AuZone[] = [];

  // Brow ridge zones (AU1 inner brow raiser / AU2 outer brow raiser / AU4 brow lowerer).
  for (const side of [-1, 1]) {
    zones.push({
      name: "brow",
      x: cx + side * w * 0.18,
      y: cy - h * 0.2,
      w: w * 0.22,
      h: h * 0.07,
      rot: side * -0.18,
    });
  }

  // Nasolabial fold zones (AU6 cheek raiser / AU9 nose wrinkler / AU11 nasolabial deepener).
  for (const side of [-1, 1]) {
    zones.push({
      name: "nasolabial",
      x: cx + side * w * 0.17,
      y: cy + h * 0.14,
      w: w * 0.1,
      h: h * 0.22,
      rot: side * 0.32,
    });
  }

  // Lip corner zones (AU12 lip corner puller / AU15 lip corner depressor / AU20 lip stretcher).
  for (const side of [-1, 1]) {
    zones.push({
      name: "lipCorner",
      x: cx + side * w * 0.16,
      y: cy + h * 0.31,
      w: w * 0.12,
      h: h * 0.09,
      rot: side * -0.1,
    });
  }

  return zones;
}

/**
 * Stamps a localized high-contrast disruption patch over one AU zone: a hard
 * clipped rect region filled with seeded alternating light/dark angled
 * slashes, overlaid with a thin accent-colored "confidence" outline, mimicking
 * a deliberately engineered adversarial sticker rather than natural skin
 * texture — designed to pollute the local gradient signal AU classifiers
 * read without obscuring the zone's rough location.
 */
function drawAuPatch(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  zone: AuZone,
  accent: string,
  frequency: number,
  density: number,
  s: number
) {
  ctx.save();
  ctx.translate(zone.x, zone.y);
  ctx.rotate(zone.rot);

  ctx.beginPath();
  ctx.rect(-zone.w / 2, -zone.h / 2, zone.w, zone.h);
  ctx.clip();

  // Base slab: alternating light/dark fill to establish hard local contrast.
  ctx.fillStyle = rng.random() > 0.5 ? "rgba(240, 240, 245, 0.85)" : "rgba(15, 15, 18, 0.85)";
  ctx.fillRect(-zone.w / 2, -zone.h / 2, zone.w, zone.h);

  // Dense angled slashes crossing the zone, count driven by frequency + density.
  const slashCount = Math.round((4 + frequency * 14) * (0.5 + density));
  const diag = Math.hypot(zone.w, zone.h);
  for (let i = 0; i < slashCount; i++) {
    const t = slashCount === 1 ? 0.5 : i / (slashCount - 1);
    const offset = (t - 0.5) * zone.w * 1.4;
    const angle = rng.random(-0.9, 0.9);

    ctx.strokeStyle = rng.random() > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";
    ctx.lineWidth = rng.random(1.2, 3.2) * s;
    ctx.beginPath();
    ctx.moveTo(offset - Math.sin(angle) * diag, -Math.cos(angle) * diag);
    ctx.lineTo(offset + Math.sin(angle) * diag, Math.cos(angle) * diag);
    ctx.stroke();
  }

  // Sparse accent-hued fleck pass, echoing a sticker-like adversarial patch tell.
  const fleckCount = Math.round(3 + density * 6);
  for (let i = 0; i < fleckCount; i++) {
    const fx = rng.random(-0.5, 0.5) * zone.w;
    const fy = rng.random(-0.5, 0.5) * zone.h;
    ctx.fillStyle = accent.replace("rgb(", "rgba(").replace(")", ", 0.8)");
    ctx.beginPath();
    ctx.arc(fx, fy, rng.random(1.5, 3.5) * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Thin accent outline around the zone, unclipped, as a "detector confidence box" tell.
  ctx.save();
  ctx.translate(zone.x, zone.y);
  ctx.rotate(zone.rot);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1 * s;
  ctx.globalAlpha = 0.6;
  ctx.strokeRect(-zone.w / 2, -zone.h / 2, zone.w, zone.h);
  ctx.globalAlpha = 1;
  ctx.restore();
}
