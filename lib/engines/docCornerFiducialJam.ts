import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a plain pale "page" background, then overlays several seeded false
 * "page-corner" cues — high-contrast L-shaped gradient wedges and faint diagonal
 * shadow triangles — placed near (but deliberately offset from) the canvas's real
 * corners and along its edges. A mobile document-scanner's corner-detection pass
 * looks for exactly this kind of high-contrast L-shaped luminance gradient to find
 * the quadrilateral it should auto-crop/deskew to; by scattering several plausible
 * but wrong candidates, the true corners stop being the uniquely strongest signal.
 */
export const docCornerFiducialJam: RenderEngine = {
  id: "doc_corner_fiducial_jam",
  label: "Doc Corner Fiducial Jam",
  description:
    "False page-corner/edge gradients that confuse mobile document-scanner corner detection, defeating auto-crop/deskew.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Plain pale "page" background — slightly warm off-white, like a real scanned sheet.
    ctx.fillStyle = "rgb(236, 233, 224)";
    ctx.fillRect(0, 0, size, size);

    // A faint real page margin so the canvas doesn't look like a flat void —
    // a thin, slightly darker inset rule, well inside the true edges.
    const marginNative = 18;
    const margin = marginNative * coordScale;
    ctx.strokeStyle = "rgba(120, 115, 105, 0.35)";
    ctx.lineWidth = Math.max(1, 1 * coordScale);
    ctx.strokeRect(margin, margin, size - margin * 2, size - margin * 2);

    // Density slider: number of false-corner wedge cues scattered along the border.
    const wedgeCount = Math.round(5 + params.density * 10); // 5..15
    // Scale slider: native size of each wedge's "arm" reach.
    const armNative = 70 + params.scale * 150; // 70..220
    const arm = armNative * coordScale;
    // Frequency slider: how tightly-pitched the internal gradient bands inside each wedge are.
    const bandCount = Math.round(3 + params.frequency * 9); // 3..12

    const accentHue = params.accentHue;

    // Candidate anchor zones: along each of the four edges, biased toward (but not
    // exactly at) the true corners — "near-corner" placements are the most
    // confusing to a scanner since they compete directly with the real corner.
    type Anchor = { x: number; y: number; armX: number; armY: number };
    const anchors: Anchor[] = [];
    const edgeInset = 0.06; // fraction of size kept clear right at the true corner itself
    const nearCornerSpread = 0.22; // how far along the edge "near corner" placements wander

    for (let i = 0; i < wedgeCount; i++) {
      const edge = rng.randomInt(0, 4); // 0=top,1=right,2=bottom,3=left
      // t in [edgeInset, edgeInset+nearCornerSpread] or mirrored at the far end —
      // biases placement toward real corners without ever landing exactly on one.
      const nearFarFlip = rng.random() < 0.5;
      const tRaw = edgeInset + rng.random() * nearCornerSpread;
      const t = nearFarFlip ? tRaw : 1 - tRaw;

      let x = 0;
      let y = 0;
      let armX = 1;
      let armY = 1;

      if (edge === 0) {
        // top edge
        x = t * size;
        y = 0;
        armX = nearFarFlip ? 1 : -1;
        armY = 1;
      } else if (edge === 1) {
        // right edge
        x = size;
        y = t * size;
        armX = -1;
        armY = nearFarFlip ? 1 : -1;
      } else if (edge === 2) {
        // bottom edge
        x = t * size;
        y = size;
        armX = nearFarFlip ? 1 : -1;
        armY = -1;
      } else {
        // left edge
        x = 0;
        y = t * size;
        armX = 1;
        armY = nearFarFlip ? 1 : -1;
      }

      anchors.push({ x, y, armX, armY });
    }

    for (const anchor of anchors) {
      const localArm = arm * (0.7 + rng.random() * 0.6);
      const kind = rng.random();

      if (kind < 0.55) {
        // --- L-shaped high-contrast gradient wedge: two gradient-filled rectangular
        // arms meeting at `anchor`, mimicking the two edges of a page corner.
        const thickness = (10 + rng.random() * 22) * coordScale;
        const darkFirst = rng.random() < 0.5;
        const hue = rng.random() < 0.6 ? accentHue : (accentHue + 180) % 360;

        // Horizontal arm
        const hx0 = anchor.x;
        const hx1 = anchor.x + anchor.armX * localArm;
        const hGrad = ctx.createLinearGradient(hx0, anchor.y, hx1, anchor.y);
        if (darkFirst) {
          hGrad.addColorStop(0, hsb(hue, 15, 8));
          hGrad.addColorStop(1, "rgba(236,233,224,0)");
        } else {
          hGrad.addColorStop(0, hsb(hue, 60, 96));
          hGrad.addColorStop(1, "rgba(236,233,224,0)");
        }
        ctx.fillStyle = hGrad;
        ctx.fillRect(
          Math.min(hx0, hx1),
          anchor.y - thickness / 2,
          Math.abs(hx1 - hx0),
          thickness
        );

        // Vertical arm
        const vy0 = anchor.y;
        const vy1 = anchor.y + anchor.armY * localArm;
        const vGrad = ctx.createLinearGradient(anchor.x, vy0, anchor.x, vy1);
        if (darkFirst) {
          vGrad.addColorStop(0, hsb(hue, 15, 8));
          vGrad.addColorStop(1, "rgba(236,233,224,0)");
        } else {
          vGrad.addColorStop(0, hsb(hue, 60, 96));
          vGrad.addColorStop(1, "rgba(236,233,224,0)");
        }
        ctx.fillStyle = vGrad;
        ctx.fillRect(
          anchor.x - thickness / 2,
          Math.min(vy0, vy1),
          thickness,
          Math.abs(vy1 - vy0)
        );

        // Fine internal banding across the corner's elbow, to mimic a scanner's
        // own quantized contrast-detection bands (raises confidence it's a "real" corner).
        for (let b = 0; b < bandCount; b++) {
          const f = b / bandCount;
          const bandAlpha = 0.12 * (1 - f);
          ctx.strokeStyle = `rgba(20, 18, 14, ${bandAlpha.toFixed(3)})`;
          ctx.lineWidth = Math.max(1, 1.5 * coordScale);
          ctx.beginPath();
          ctx.moveTo(anchor.x + anchor.armX * localArm * f, anchor.y);
          ctx.lineTo(anchor.x, anchor.y + anchor.armY * localArm * f);
          ctx.stroke();
        }
      } else {
        // --- Faint diagonal shadow triangle: mimics a lifted-page-corner shadow,
        // the kind of cue scanners use to infer a corner is "folded up" off the surface.
        const legX = anchor.armX * localArm * (0.5 + rng.random() * 0.5);
        const legY = anchor.armY * localArm * (0.5 + rng.random() * 0.5);
        const shadowAlpha = 0.1 + rng.random() * 0.18;

        const grad = ctx.createLinearGradient(
          anchor.x,
          anchor.y,
          anchor.x + legX,
          anchor.y + legY
        );
        grad.addColorStop(0, `rgba(10, 9, 8, ${shadowAlpha.toFixed(3)})`);
        grad.addColorStop(1, "rgba(10, 9, 8, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(anchor.x + legX, anchor.y);
        ctx.lineTo(anchor.x, anchor.y + legY);
        ctx.closePath();
        ctx.fill();
      }
    }

    // A handful of small accent-hued "fiducial" tick marks dropped at seeded points
    // along the border — further false candidate corner-markers for an auto-crop pass
    // that's hunting for any small, high-contrast right-angle feature.
    const tickCount = Math.round(3 + params.density * 6);
    for (let i = 0; i < tickCount; i++) {
      const edge = rng.randomInt(0, 4);
      const t = rng.random();
      const tickLen = (14 + rng.random() * 20) * coordScale;

      let x = 0;
      let y = 0;
      let dx = 1;
      let dy = 0;
      if (edge === 0) {
        x = t * size;
        y = (4 + rng.random() * 10) * coordScale;
        dx = 0;
        dy = 1;
      } else if (edge === 1) {
        x = size - (4 + rng.random() * 10) * coordScale;
        y = t * size;
        dx = -1;
        dy = 0;
      } else if (edge === 2) {
        x = t * size;
        y = size - (4 + rng.random() * 10) * coordScale;
        dx = 0;
        dy = -1;
      } else {
        x = (4 + rng.random() * 10) * coordScale;
        y = t * size;
        dx = 1;
        dy = 0;
      }

      ctx.strokeStyle = hsb(accentHue, 75, 92);
      ctx.lineWidth = Math.max(1, 2 * coordScale);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * tickLen, y + dy * tickLen);
      ctx.stroke();
      // Perpendicular leg, forming a small right-angle "false fiducial" corner mark.
      const px = -dy;
      const py = dx;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + px * tickLen, y + py * tickLen);
      ctx.stroke();
    }
  },
};
