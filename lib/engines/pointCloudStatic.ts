import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Renders a dense jittered grid of small dots mimicking a LiDAR point cloud's
 * range-return field. Per-dot brightness/size varies with a seeded "return
 * intensity" value (driven by Perlin noise over the grid), irregular seeded
 * "dropout" voids carve out patches where returns are simply skipped (mimicking
 * sensor dropout / occlusion / low-reflectivity absorption), and a sparse set
 * of brighter accent-hued "retroreflector" hotspot dots are scattered on top
 * to mimic false high-intensity returns off reflective surfaces.
 */
export const pointCloudStatic: RenderEngine = {
  id: "point_cloud_static",
  label: "Point Cloud Static",
  description: "Jittered LiDAR-style dot-grid density field with seeded dropout voids and retroreflector hotspots.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Near-black background — point clouds read as sparse bright returns against void.
    ctx.fillStyle = "rgb(8, 9, 12)";
    ctx.fillRect(0, 0, size, size);

    // Scale slider: grid spacing in native px (denser cloud = smaller spacing).
    const spacingNative = 28 - params.scale * 16; // 12..28px
    const spacing = spacingNative * coordScale;

    // Density slider: probability any given grid cell actually emits a point return.
    const spawnChance = 0.25 + params.density * 0.65;

    // Frequency slider: spatial frequency of the seeded dropout-void noise field.
    const voidFreq = 0.015 + params.frequency * 0.05;
    // Dropout threshold: higher frequency sliders carve more, smaller voids.
    const voidThreshold = 0.52;

    const cols = Math.ceil(size / spacing) + 1;
    const rows = Math.ceil(size / spacing) + 1;

    // Per-dot jitter so the grid doesn't look perfectly mechanical (like a real scan pattern).
    const jitterMax = spacing * 0.38;

    const accentColor = hsb(params.accentHue, 70, 100);
    const baseHue = (params.accentHue + 190) % 360; // cool complementary tone for ordinary returns
    // Fraction of surviving points promoted to bright "retroreflector" hotspots.
    const hotspotChance = 0.015 + params.density * 0.02;

    const baseDotNative = 1.1 + params.scale * 1.6;

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        // Seeded dropout void field: skip whole regions to mimic sensor dropout
        // / occlusion / low-reflectivity absorption, independent of spawnChance.
        const voidVal = rng.noise(gx * voidFreq, gy * voidFreq);
        if (voidVal > voidThreshold) continue;

        if (rng.random() > spawnChance) continue;

        const jx = (rng.random() - 0.5) * 2 * jitterMax;
        const jy = (rng.random() - 0.5) * 2 * jitterMax;
        const cx = gx * spacing + jx;
        const cy = gy * spacing + jy;

        // Seeded "range return intensity" value drives per-dot brightness/size.
        const intensity = rng.random();
        const isHotspot = rng.random() < hotspotChance;

        const r = (baseDotNative * (0.55 + intensity * 0.9)) * coordScale * (isHotspot ? 1.8 : 1);

        if (isHotspot) {
          ctx.fillStyle = accentColor;
          ctx.globalAlpha = 0.85 + intensity * 0.15;
        } else {
          const brightness = 25 + intensity * 65;
          ctx.fillStyle = hsb(baseHue, 25, brightness);
          ctx.globalAlpha = 0.35 + intensity * 0.55;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(0.4, r), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  },
};
