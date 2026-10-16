import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a plain, flat page background, then overlays a handful of seeded
 * curved dark "fold shadow" bands near the edges and corners — the same
 * shading signature a real curled, warped, or dog-eared page produces under
 * raking light. A document-dewarping/flattening pipeline that infers surface
 * geometry from shading (shape-from-shading) reads these fake gradients as
 * evidence of a non-flat surface and "corrects" a page that was never
 * curled at all, introducing bogus perspective warps into an otherwise flat
 * scan.
 */
export const pageCurlShadowDecoy: RenderEngine = {
  id: "page_curl_shadow_decoy",
  label: "Page Curl Shadow Decoy",
  description:
    "Fake page-curl/fold shadow gradients near edges and corners that trigger false non-flat dewarping corrections on a flat subject.",

  render(ctx, size, rng, params: EngineParams) {
    // --- Plain flat page background: a believable paper tone, very subtle seeded tint. ---
    const paperBri = 90 + rng.random() * 6; // 90-96, near-white paper
    const paperHue = (params.accentHue + 30) % 360;
    ctx.fillStyle = hsb(paperHue, 4, paperBri);
    ctx.fillRect(0, 0, size, size);

    // Faint seeded ruling/texture lines so the page reads as real content,
    // not an empty canvas — kept very low-contrast so it doesn't compete
    // with the fold shadows below.
    const lineCountNative = 14 + Math.round(params.density * 18); // 14-32
    ctx.save();
    ctx.globalAlpha = 0.05 + params.density * 0.05;
    ctx.strokeStyle = hsb(paperHue, 8, 35);
    ctx.lineWidth = Math.max(1, size * 0.0015);
    for (let i = 0; i < lineCountNative; i++) {
      const y = ((i + 0.5) / lineCountNative) * size + (rng.random() - 0.5) * size * 0.01;
      ctx.beginPath();
      ctx.moveTo(size * 0.06, y);
      ctx.lineTo(size * 0.94, y);
      ctx.stroke();
    }
    ctx.restore();

    // --- Seeded fold-shadow bands: curved dark gradients near edges/corners. ---
    // bandCount scales with density; each band picks a seeded corner/edge
    // anchor, a curvature direction, and a width/intensity driven by scale
    // and frequency so the sliders have a visible, deterministic effect.
    const bandCount = 2 + Math.round(params.density * 4); // 2-6 bands

    type Anchor = { x: number; y: number; nx: number; ny: number };
    // Four corner anchors + four edge-midpoint anchors to pick from, each
    // with an inward-pointing normal describing which way the "fold" leans.
    const anchors: Anchor[] = [
      { x: 0, y: 0, nx: 1, ny: 1 },
      { x: size, y: 0, nx: -1, ny: 1 },
      { x: 0, y: size, nx: 1, ny: -1 },
      { x: size, y: size, nx: -1, ny: -1 },
      { x: size / 2, y: 0, nx: 0, ny: 1 },
      { x: size / 2, y: size, nx: 0, ny: -1 },
      { x: 0, y: size / 2, nx: 1, ny: 0 },
      { x: size, y: size / 2, nx: -1, ny: 0 },
    ];

    for (let i = 0; i < bandCount; i++) {
      const anchor = anchors[Math.floor(rng.random(anchors.length))];

      // Normalize the inward normal.
      const nlen = Math.hypot(anchor.nx, anchor.ny) || 1;
      const nx = anchor.nx / nlen;
      const ny = anchor.ny / nlen;

      // The fold's "hinge line" runs perpendicular to the inward normal,
      // offset slightly along it to curve away from the exact corner/edge.
      const px = -ny;
      const py = nx;

      // How deep into the page the shadow reaches (frequency = tighter,
      // more numerous creases vs scale = how far they bow inward).
      const reach = size * (0.18 + params.scale * 0.32);
      const curve = (rng.random() - 0.5) * size * (0.12 + params.frequency * 0.18);
      const along = (rng.random() - 0.5) * size * 0.5;

      // Control point for a curved gradient path: start near the anchor,
      // bow out along the hinge direction, pull inward by `reach`.
      const startX = anchor.x + px * along * 0.3;
      const startY = anchor.y + py * along * 0.3;
      const midX = anchor.x + px * along + nx * reach * 0.55 + px * curve;
      const midY = anchor.y + py * along + ny * reach * 0.55 + py * curve;
      const endX = anchor.x + px * along * 1.6 + nx * reach;
      const endY = anchor.y + py * along * 1.6 + ny * reach;

      // Intensity: deeper/darker shadow near the hinge, fading to nothing
      // at `reach` -- the classic fold-shadow falloff.
      const intensity = 0.28 + params.density * 0.22 + rng.random() * 0.1; // ~0.28-0.6
      const bandWidth = size * (0.14 + params.scale * 0.22);

      // Build the curved shadow as a sequence of overlapping radial
      // gradients stamped along a quadratic path from start -> mid -> end,
      // which reads as a smooth curved dark band without needing clipping
      // along an explicit path shape.
      const steps = 10;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const omt = 1 - t;
        // Quadratic Bezier point.
        const bx = omt * omt * startX + 2 * omt * t * midX + t * t * endX;
        const by = omt * omt * startY + 2 * omt * t * midY + t * t * endY;

        // Shadow is strongest near the hinge (t small) and fades toward
        // the page interior (t near 1) -- mimics real fold shading falloff.
        const localAlpha = intensity * (1 - t) * (1 - t) * 0.9;
        if (localAlpha <= 0.004) continue;

        const r = bandWidth * (0.5 + 0.5 * (1 - t * 0.6));
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
        grad.addColorStop(0, `rgba(10, 8, 6, ${localAlpha})`);
        grad.addColorStop(0.6, `rgba(10, 8, 6, ${localAlpha * 0.45})`);
        grad.addColorStop(1, "rgba(10, 8, 6, 0)");

        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // A thin brighter "crest" highlight just inside the shadow's hinge
      // edge -- real curled paper often shows a slight specular ridge right
      // where the fold peaks, before the shadow deepens past it. This extra
      // cue reinforces the illusion of 3D curvature to a shading-based
      // dewarp heuristic.
      const crestAlpha = 0.08 + params.frequency * 0.06;
      const crestX = omtPoint(startX, midX, endX, 0.22);
      const crestY = omtPoint(startY, midY, endY, 0.22);
      const crestR = bandWidth * 0.3;
      const crest = ctx.createRadialGradient(crestX, crestY, 0, crestX, crestY, crestR);
      crest.addColorStop(0, `rgba(255, 255, 250, ${crestAlpha})`);
      crest.addColorStop(1, "rgba(255, 255, 250, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = crest;
      ctx.beginPath();
      ctx.arc(crestX, crestY, crestR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- Overall soft page-edge darkening: a faint full-frame vignette so ---
    // the faked curl shadows blend into a believable "scanned page" look
    // rather than reading as isolated blobs.
    const edgeVignette = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.35,
      size / 2,
      size / 2,
      size * 0.72
    );
    edgeVignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    edgeVignette.addColorStop(1, "rgba(10, 8, 6, 0.1)");
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = edgeVignette;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();

    function omtPoint(a: number, b: number, c: number, t: number): number {
      const omt = 1 - t;
      return omt * omt * a + 2 * omt * t * b + t * t * c;
    }
  },
};
