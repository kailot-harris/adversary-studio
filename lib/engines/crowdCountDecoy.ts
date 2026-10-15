import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * crowd_count_decoy: scatters small seeded elliptical "head"-sized blobs,
 * sized to match typical head-detector template scale, across the canvas in
 * seeded clusters. Roughly half the clusters are deliberately over-dense
 * (many overlapping blobs packed tight, to inflate a crowd-counting
 * estimate); the other half are sparse, single camouflaged blobs blended
 * against a matching background patch (to deflate a count by hiding real
 * "heads" in plain sight). Every blob gets a soft radial gradient so it
 * reads like a head silhouette rather than a flat dot.
 */
export const crowdCountDecoy: RenderEngine = {
  id: "crowd_count_decoy",
  label: "Crowd Count Decoy",
  description:
    "Clustered head-sized blob patterns tuned to inflate or deflate crowd-counting estimates.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Neutral mid-gray street/plaza-like background — close in value to the
    // sparse-cluster camouflage blobs, so a naive head detector gets no free
    // contrast cue to key on.
    ctx.fillStyle = "rgb(58, 56, 54)";
    ctx.fillRect(0, 0, size, size);

    // Faint background texture (mottled patches) that the sparse/camouflaged
    // clusters will blend into.
    const textureSpots = 40;
    for (let i = 0; i < textureSpots; i++) {
      const tx = rng.random(800) * s;
      const ty = rng.random(800) * s;
      const tr = rng.random(20, 70) * s;
      const shade = 50 + rng.randomInt(0, 16);
      ctx.fillStyle = `rgba(${shade}, ${shade - 2}, ${shade - 4}, 0.35)`;
      ctx.beginPath();
      ctx.ellipse(tx, ty, tr, tr * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // scale slider -> head-sized blob radius, matching typical head-detector
    // template scale (roughly 8-28px native radius).
    const headRMin = 8 + params.scale * 10;
    const headRMax = 14 + params.scale * 22;

    // density slider -> number of cluster centers scattered across the field.
    const clusterCount = Math.round(6 + params.density * 26);

    // frequency slider -> intra-cluster jitter (how tightly blobs huddle
    // around their cluster center).
    const jitterNative = 14 + params.frequency * 46;
    const jitter = jitterNative * s;

    const accent = hsb(params.accentHue, 45, 55);

    for (let c = 0; c < clusterCount; c++) {
      const cx = rng.random(60, 740) * s;
      const cy = rng.random(60, 740) * s;

      // Roughly half the clusters are "over-dense" (inflate count): many
      // overlapping blobs packed close together. The other half are
      // "sparse/camouflaged" (deflate count): a single low-contrast blob
      // blended toward the background value.
      const isOverDense = rng.random() < 0.5;

      if (isOverDense) {
        const blobsInCluster = rng.randomInt(6, 16);
        for (let b = 0; b < blobsInCluster; b++) {
          const bx = cx + (rng.random() - 0.5) * 2 * jitter;
          const by = cy + (rng.random() - 0.5) * 2 * jitter;
          const r = rng.random(headRMin, headRMax) * s;

          // A minority of blobs within an over-dense cluster are
          // accent-tinted "chromatic tell" heads, mimicking a false
          // detector overlay among genuine-looking ones.
          const useAccent = rng.random() < 0.15;
          drawHeadBlob(ctx, bx, by, r, {
            core: useAccent ? accent : "rgb(222, 196, 172)",
            mid: useAccent ? hsb(params.accentHue, 55, 35) : "rgb(150, 112, 90)",
            edge: "rgb(70, 48, 40)",
          });
        }
      } else {
        // Sparse single blob, deliberately low-contrast against the
        // background so it camouflages (undercounts) while still being a
        // plausible head-scale silhouette.
        const r = rng.random(headRMin, headRMax) * s;
        drawHeadBlob(ctx, cx, cy, r, {
          core: "rgba(80, 76, 72, 0.55)",
          mid: "rgba(66, 63, 60, 0.4)",
          edge: "rgba(58, 56, 54, 0)",
        });
      }
    }
  },
};

interface BlobPalette {
  core: string;
  mid: string;
  edge: string;
}

/** Draws one head-sized blob as a soft radial gradient so it reads as a head silhouette, not a flat dot. */
function drawHeadBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  palette: BlobPalette
) {
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, palette.core);
  grad.addColorStop(0.55, palette.mid);
  grad.addColorStop(1, palette.edge);

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Slightly elliptical (vertical) to match a head-and-shoulders silhouette
  // rather than a perfect circle.
  ctx.ellipse(cx, cy, r, r * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
}
