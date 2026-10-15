import { hsb, rgba } from "@/lib/color";
import { Rng } from "@/lib/mulberry32";
import { EngineParams, RenderEngine } from "./types";

type Pt = { x: number; y: number; region: string };

/**
 * Denser landmark-confusion variant of pose_jammer, aimed at 68-point face
 * mesh detectors instead of full-body pose. Seeds plausible-looking facial
 * landmark clusters (jawline, brows, eyes, nose, mouth) at much higher point
 * density than a body skeleton, then wires them together with both the
 * expected local contour edges AND a scrambled layer of long-range
 * "contradictory" triangulated edges that jump between unrelated regions —
 * false mesh connections a 68-point face-alignment model would never predict,
 * designed to pollute its landmark/triangulation confidence.
 */
export const faceMeshScramble: RenderEngine = {
  id: "face_mesh_scramble",
  label: "Face Mesh Scramble",
  description: "Dense 68-point face-landmark decoys wired with contradictory triangulated mesh edges.",

  render(ctx, size, rng: Rng, params: EngineParams) {
    const s = size / 800;

    ctx.fillStyle = "rgb(10, 11, 14)";
    ctx.fillRect(0, 0, size, size);

    const accent = hsb(params.accentHue, 85, 95);

    // How many decoy faces to scramble onto the canvas.
    const faceCount = Math.max(1, Math.round(rng.randomInt(1, 3) * (0.5 + params.density)));

    for (let f = 0; f < faceCount; f++) {
      const cx = rng.random(220, 580) * s;
      const cy = rng.random(220, 580) * s;
      const faceW = rng.random(180, 260) * s * (0.5 + params.scale);
      const faceH = faceW * rng.random(1.1, 1.35);

      // density also scales landmark resolution per region (denser than a
      // body skeleton's handful of joints — real 68-point meshes are dense).
      const densityMul = 0.6 + params.density * 1.1;

      const points = buildFaceLandmarks(rng, cx, cy, faceW, faceH, densityMul);

      drawRegionContours(ctx, points, s);
      drawDecoyTriangulation(ctx, rng, points, accent, params.frequency, s);
      drawLandmarkNodes(ctx, rng, points, accent, s);
    }
  },
};

/** Seeds the 68-point-style landmark set, grouped into face-mesh regions. */
function buildFaceLandmarks(rng: Rng, cx: number, cy: number, w: number, h: number, densityMul: number): Pt[] {
  const pts: Pt[] = [];

  const ring = (
    region: string,
    rx: number,
    ry: number,
    offY: number,
    a0: number,
    a1: number,
    baseCount: number,
    jitter: number
  ) => {
    const count = Math.max(3, Math.round(baseCount * densityMul));
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const angle = a0 + (a1 - a0) * t;
      const jx = (rng.random() - 0.5) * jitter;
      const jy = (rng.random() - 0.5) * jitter;
      pts.push({
        x: cx + Math.cos(angle) * rx + jx,
        y: cy + offY + Math.sin(angle) * ry + jy,
        region,
      });
    }
  };

  // Jawline contour (bottom arc of the face oval) — ~17 points in dlib's scheme.
  ring("jaw", w * 0.52, h * 0.58, h * 0.1, Math.PI * 0.08, Math.PI * 0.92, 17, w * 0.03);

  // Brows — short arcs above each eye socket.
  ring("browL", w * 0.22, h * 0.07, -h * 0.28, Math.PI * 1.1, Math.PI * 1.9, 5, w * 0.02);
  ring("browR", w * 0.22, h * 0.07, -h * 0.28, Math.PI * -0.9, Math.PI * -0.1, 5, w * 0.02);

  // Eyes — small closed ellipses.
  ring("eyeL", w * 0.14, h * 0.07, -h * 0.14, 0, Math.PI * 2, 6, w * 0.015);
  ring("eyeR", w * 0.14, h * 0.07, -h * 0.14, 0, Math.PI * 2, 6, w * 0.015);

  // Nose — bridge + nostril spread.
  ring("nose", w * 0.1, h * 0.22, h * 0.02, Math.PI * 1.25, Math.PI * 1.75, 4, w * 0.015);
  ring("nostrils", w * 0.16, h * 0.04, h * 0.14, Math.PI * 1.1, Math.PI * 1.9, 5, w * 0.015);

  // Mouth — outer + inner lip contour.
  ring("mouthOuter", w * 0.22, h * 0.1, h * 0.34, 0, Math.PI * 2, 12, w * 0.02);
  ring("mouthInner", w * 0.14, h * 0.05, h * 0.34, 0, Math.PI * 2, 8, w * 0.015);

  // Re-center the per-eye/brow rings onto left/right sides of the face.
  for (const p of pts) {
    if (p.region === "browL" || p.region === "eyeL") p.x -= w * 0.18;
    if (p.region === "browR" || p.region === "eyeR") p.x += w * 0.18;
  }

  return pts;
}

/** Draws the "expected" local contour edges within each region — the plausible half of the mesh. */
function drawRegionContours(ctx: CanvasRenderingContext2D, pts: Pt[], s: number) {
  const byRegion = new Map<string, Pt[]>();
  for (const p of pts) {
    if (!byRegion.has(p.region)) byRegion.set(p.region, []);
    byRegion.get(p.region)!.push(p);
  }

  ctx.strokeStyle = "rgba(230,235,240,0.75)";
  ctx.lineWidth = 1.4 * s;
  for (const group of byRegion.values()) {
    ctx.beginPath();
    ctx.moveTo(group[0].x, group[0].y);
    for (let i = 1; i < group.length; i++) ctx.lineTo(group[i].x, group[i].y);
    if (group[0].region.startsWith("eye") || group[0].region.startsWith("mouth")) {
      ctx.closePath();
    }
    ctx.stroke();
  }
}

/**
 * Scrambles a decoy triangulated mesh layer: picks random point triples that
 * deliberately jump across unrelated regions (jaw-to-brow, eye-to-nostril,
 * etc.) and draws their triangle edges in the accent color — contradictory
 * connections a real face-mesh triangulation would never produce.
 */
function drawDecoyTriangulation(
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  pts: Pt[],
  accent: string,
  frequency: number,
  s: number
) {
  const triCount = Math.round((10 + frequency * 40) * (pts.length / 68));
  ctx.lineWidth = 1 * s;
  for (let i = 0; i < triCount; i++) {
    const a = pts[rng.randomInt(0, pts.length)];
    const b = pts[rng.randomInt(0, pts.length)];
    const c = pts[rng.randomInt(0, pts.length)];
    if (a.region === b.region && b.region === c.region) continue; // only count genuine cross-region decoys

    const alpha = rng.random(0.15, 0.45);
    ctx.strokeStyle = accent.replace("rgb(", "rgba(").replace(")", `, ${alpha.toFixed(2)})`);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.stroke();
  }
}

/** Draws each landmark as a glowing node, matching pose_jammer's joint-halo + core treatment. */
function drawLandmarkNodes(ctx: CanvasRenderingContext2D, rng: Rng, pts: Pt[], accent: string, s: number) {
  for (const p of pts) {
    ctx.fillStyle = rgba(255, 0, 110, 0.22);
    circle(ctx, p.x, p.y, rng.random(6, 11) * s);

    ctx.fillStyle = rng.random() > 0.5 ? "rgb(0,255,180)" : accent;
    circle(ctx, p.x, p.y, rng.random(2.5, 4.5) * s);

    // Occasional decoy confidence box, echoing pose_jammer's false-detection tell.
    if (rng.random() > 0.85) {
      ctx.strokeStyle = "rgba(255,255,0,0.5)";
      ctx.lineWidth = 1 * s;
      const boxS = rng.random(8, 16) * s;
      ctx.strokeRect(p.x - boxS / 2, p.y - boxS / 2, boxS, boxS);
    }
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, d: number) {
  ctx.beginPath();
  ctx.arc(x, y, d / 2, 0, Math.PI * 2);
  ctx.fill();
}
