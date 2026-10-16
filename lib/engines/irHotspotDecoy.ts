import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * ir_hotspot_decoy: simulates a low-light, IR-illuminated camera view. The
 * overall scene is rendered dim and desaturated (as if lit only by an IR
 * illuminator), with a plain, darker humanoid-ish "subject" silhouette
 * placed off-center. Scattered elsewhere in the frame are several bright
 * white/hot blob clusters with soft radial glow — meant to read like
 * retroreflective material (safety tape, license plates, reflective signage,
 * eyes) bouncing IR illumination straight back into the sensor far harder
 * than the diffuse subject does. An auto-gain/exposure algorithm metering
 * off scene brightness gets pulled toward these decoy hotspots and away from
 * the real subject, which stays comparatively underexposed/dark.
 */
export const irHotspotDecoy: RenderEngine = {
  id: "ir_hotspot_decoy",
  label: "IR Hotspot Decoy",
  description:
    "Dim IR-lit scene with a dark off-center subject and bright retroreflective-style hotspot clusters placed to steal auto-gain attention.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Very dim, slightly green-gray IR-illuminated base (monochrome-ish IR
    // sensors often render with a faint green/gray cast).
    ctx.fillStyle = "rgb(14, 17, 15)";
    ctx.fillRect(0, 0, size, size);

    // Faint low-frequency mottling so the background doesn't read as a flat
    // digital black (sensor noise floor + uneven IR illuminator falloff).
    const mottleSpots = 60;
    for (let i = 0; i < mottleSpots; i++) {
      const mx = rng.random(800) * s;
      const my = rng.random(800) * s;
      const mr = rng.random(40, 140) * s;
      const shade = 16 + rng.randomInt(0, 10);
      ctx.fillStyle = `rgba(${shade}, ${shade + 3}, ${shade}, 0.25)`;
      ctx.beginPath();
      ctx.ellipse(mx, my, mr, mr * 0.7, rng.random(Math.PI), 0, Math.PI * 2);
      ctx.fill();
    }

    // --- The real subject: a plain, dark, off-center silhouette. ---
    // Placed off-center (left-of-center, lower-third) so the decoy hotspots
    // can be deliberately positioned elsewhere in the frame.
    const subjectCx = 260 * s;
    const subjectCy = 520 * s;
    const subjectScale = (0.75 + params.scale * 0.6) * s;
    drawSubjectSilhouette(ctx, subjectCx, subjectCy, subjectScale);

    // --- Decoy IR hotspot clusters ---
    // density slider -> number of hotspot clusters.
    const clusterCount = Math.round(3 + params.density * 7);

    // scale slider -> hotspot blob radius range.
    const hotRMin = 10 + params.scale * 14;
    const hotRMax = 20 + params.scale * 46;

    // frequency slider -> how tightly blobs huddle within a cluster, and how
    // many sub-blobs per cluster (denser clustering reads as a stronger,
    // more insistent gain-pulling region).
    const jitterNative = 18 + params.frequency * 70;
    const jitter = jitterNative * s;
    const blobsPerCluster = Math.round(2 + params.frequency * 5);

    const accent = hsb(params.accentHue, 20, 100); // near-white with a faint accent tint

    // Seed cluster centers everywhere except a keep-out zone around the
    // subject, so hotspots never overlap (and thus never get confused with)
    // the real subject silhouette.
    const keepOutR = 150 * s;
    for (let c = 0; c < clusterCount; c++) {
      let cx = 0;
      let cy = 0;
      let tries = 0;
      do {
        cx = rng.random(40, 760) * s;
        cy = rng.random(40, 760) * s;
        tries++;
      } while (
        Math.hypot(cx - subjectCx, cy - subjectCy) < keepOutR &&
        tries < 12
      );

      for (let b = 0; b < blobsPerCluster; b++) {
        const bx = cx + (rng.random() - 0.5) * 2 * jitter;
        const by = cy + (rng.random() - 0.5) * 2 * jitter;
        const r = rng.random(hotRMin, hotRMax) * s;

        // Most blobs are pure hot white (clipped-looking retroreflective
        // bounce); a minority carry a faint accent-hue tint, mimicking
        // chromatic aberration/bloom fringing around a blown highlight.
        const tinted = rng.random() < 0.25;
        drawHotspotBlob(ctx, bx, by, r, tinted ? accent : "rgb(255, 255, 255)");
      }
    }
  },
};

/** Draws the dim, plain, off-center subject silhouette: a simple humanoid blob. */
function drawSubjectSilhouette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number
) {
  ctx.fillStyle = "rgb(26, 28, 26)";

  // Head.
  ctx.beginPath();
  ctx.ellipse(cx, cy - 150 * s, 42 * s, 48 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso.
  ctx.beginPath();
  ctx.ellipse(cx, cy - 20 * s, 70 * s, 130 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (two overlapping ellipses).
  ctx.beginPath();
  ctx.ellipse(cx - 32 * s, cy + 160 * s, 32 * s, 110 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 32 * s, cy + 160 * s, 32 * s, 110 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // A very slight rim-light edge so the subject reads as present but still
  // reads as noticeably dimmer than any decoy hotspot.
  ctx.strokeStyle = "rgba(70, 78, 72, 0.3)";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 20 * s, 70 * s, 130 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
}

/** Draws one bright retroreflective-looking hotspot blob as a soft hot-white radial glow. */
function drawHotspotBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  core: string
) {
  // Outer soft glow (wide, low-opacity falloff simulating bloom).
  const glowR = r * 2.6;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.55)");
  glow.addColorStop(0.4, "rgba(255, 255, 255, 0.18)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Hard hot core, like a clipped/overexposed retroreflector.
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, core);
  grad.addColorStop(0.7, core);
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}
