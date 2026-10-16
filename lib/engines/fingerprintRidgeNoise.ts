import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * A seeded Perlin flow-field of parallel curved strokes that mimics the
 * ridge/valley topology a fingerprint-minutiae matcher keys on (loops,
 * whorls, deltas) without ever being a literal print — just a flat 2D
 * texture built the same way `optical_flow_jammer`'s arrow field is built,
 * except the field is traced into continuous stroked ridge lines instead of
 * discrete arrows, and a handful of seeded "minutiae" markers (ridge
 * endings and bifurcations) are scattered on top to collide with whatever
 * a matching algorithm expects to extract from real ridge flow.
 */
export const fingerprintRidgeNoise: RenderEngine = {
  id: "fingerprint_ridge_noise",
  label: "Fingerprint Ridge Noise",
  description:
    "Seeded ridge/valley fine-line flow texture with planted false minutiae, tuned to collide with fingerprint matchers.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;

    ctx.fillStyle = "rgb(12,11,14)";
    ctx.fillRect(0, 0, size, size);

    // Frequency -> how tightly the underlying noise field winds (tighter =
    // more whorl-like curvature per unit distance).
    const noiseFreq = 0.5 + params.frequency * 1.6;
    const noiseScale = (0.6 + params.frequency * 1.4) / size;

    // Scale -> spacing between adjacent ridge lines (bigger scale = fewer,
    // fatter-looking ridges; smaller scale = tightly packed fine lines).
    const ridgeSpacing = Math.max(3, (3 + (1 - params.scale) * 9) * s);

    // Density -> how many singular "cores" (loop/whorl centers) and
    // "deltas" (triangular junctions) pull the flow field around, which is
    // what gives fingerprints their characteristic topology instead of a
    // plain parallel-line grating.
    const singularityCount = rng.randomInt(2, 2 + Math.round(params.density * 3)); // 2..5
    const singularities: { x: number; y: number; strength: number; sign: number; isDelta: boolean }[] = [];
    for (let i = 0; i < singularityCount; i++) {
      singularities.push({
        x: rng.random(0.25, 0.75) * size,
        y: rng.random(0.25, 0.75) * size,
        strength: rng.random(0.6, 1.3),
        sign: rng.random(1) > 0.5 ? 1 : -1,
        isDelta: rng.random(1) > 0.6,
      });
    }

    const seedOffsetX = rng.random(1000);
    const seedOffsetY = rng.random(1000);

    // Base flow direction (before singularity bending) at a given point,
    // driven by seeded Perlin noise so it's smooth but non-trivial.
    const baseAngle = (x: number, y: number): number => {
      const n = rng.noise(x * noiseScale * noiseFreq + seedOffsetX, y * noiseScale * noiseFreq + seedOffsetY);
      return n * Math.PI * 2;
    };

    // Full tangent-field angle at (x, y): base noise flow bent around every
    // core/delta singularity, mimicking how real ridge flow bends around
    // loop centers and splits around deltas.
    const fieldAngle = (x: number, y: number): number => {
      let angle = baseAngle(x, y);
      for (const sg of singularities) {
        const dx = x - sg.x;
        const dy = y - sg.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const falloff = Math.exp(-dist / (size * 0.28));
        if (falloff < 0.001) continue;
        let targetAngle: number;
        if (sg.isDelta) {
          // Delta: three converging ridge directions -> snap toward the
          // nearest of three 120-degree-apart rays from the singularity.
          const rayBase = Math.atan2(dy, dx);
          const k = Math.round(rayBase / ((Math.PI * 2) / 3));
          targetAngle = k * ((Math.PI * 2) / 3) + Math.PI / 2;
        } else {
          // Core/loop: ridges sweep tangentially around the center.
          targetAngle = Math.atan2(dy, dx) + (Math.PI / 2) * sg.sign;
        }
        angle = angle + (targetAngle - angle) * falloff * sg.strength;
      }
      return angle;
    };

    // Trace a single ridge streamline starting at (x0, y0), stepping along
    // the tangent field in one direction (dir = +1 or -1) until it leaves
    // the canvas or runs too long.
    const step = Math.max(1.2, size / 420);
    const maxSteps = Math.ceil((size * 2.6) / step);

    const traceRidge = (x0: number, y0: number): { x: number; y: number }[] => {
      const forward: { x: number; y: number }[] = [];
      const backward: { x: number; y: number }[] = [];
      for (const dir of [1, -1]) {
        let x = x0;
        let y = y0;
        const pts = dir === 1 ? forward : backward;
        for (let i = 0; i < maxSteps; i++) {
          if (x < -step || x > size + step || y < -step || y > size + step) break;
          pts.push({ x, y });
          const angle = fieldAngle(x, y);
          x += Math.cos(angle) * step * dir;
          y += Math.sin(angle) * step * dir;
        }
      }
      backward.reverse();
      return backward.concat(forward.slice(1));
    };

    ctx.strokeStyle = "rgba(230,224,214,0.65)";
    ctx.lineWidth = Math.max(0.8, 1.1 * s);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Seed ridge-line start points along the top and left edges, spaced by
    // ridgeSpacing, so the traced streamlines fill the whole canvas.
    const starts: { x: number; y: number }[] = [];
    for (let y = ridgeSpacing / 2; y < size; y += ridgeSpacing) {
      starts.push({ x: 0, y });
    }
    for (let x = ridgeSpacing / 2; x < size; x += ridgeSpacing) {
      starts.push({ x, y: 0 });
    }

    for (const start of starts) {
      const ridge = traceRidge(start.x, start.y);
      if (ridge.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(ridge[0].x, ridge[0].y);
      for (let i = 1; i < ridge.length; i++) ctx.lineTo(ridge[i].x, ridge[i].y);
      ctx.stroke();
    }

    // Faint valley fill between ridges for a bit of depth, using the same
    // field at a coarser block resolution.
    const block = Math.max(4, ridgeSpacing * 0.9);
    ctx.globalAlpha = 0.07;
    for (let by = 0; by < size; by += block) {
      for (let bx = 0; bx < size; bx += block) {
        const n = rng.noise(bx * noiseScale * 3 + seedOffsetX, by * noiseScale * 3 + seedOffsetY);
        ctx.fillStyle = n > 0.5 ? "rgb(230,224,214)" : "rgb(0,0,0)";
        ctx.fillRect(bx, by, block, block);
      }
    }
    ctx.globalAlpha = 1;

    // Minutiae markers: seeded ridge endings and bifurcations scattered
    // across the field, each oriented to the local tangent angle so they
    // read as plausible (but planted/false) matcher feature points.
    const accent = hsb(params.accentHue, 85, 95);
    const minutiaeCount = Math.round(6 + params.density * 14); // 6..20
    for (let i = 0; i < minutiaeCount; i++) {
      const mx = rng.random(0.08, 0.92) * size;
      const my = rng.random(0.08, 0.92) * size;
      const angle = fieldAngle(mx, my);
      const isBifurcation = rng.random(1) > 0.5;
      const markLen = (6 + rng.random(0, 6)) * s;

      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.lineWidth = Math.max(1, 1.3 * s);

      if (isBifurcation) {
        // Y-shaped split: one incoming stub, two outgoing branches.
        const branchSpread = Math.PI / 6 + rng.random(0, Math.PI / 10);
        ctx.beginPath();
        ctx.moveTo(mx - Math.cos(angle) * markLen, my - Math.sin(angle) * markLen);
        ctx.lineTo(mx, my);
        ctx.stroke();
        for (const sign of [1, -1]) {
          const branchAngle = angle + branchSpread * sign;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(branchAngle) * markLen, my + Math.sin(branchAngle) * markLen);
          ctx.stroke();
        }
      } else {
        // Ridge ending: a short stub terminating in a dot.
        ctx.beginPath();
        ctx.moveTo(mx - Math.cos(angle) * markLen, my - Math.sin(angle) * markLen);
        ctx.lineTo(mx, my);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(mx, my, Math.max(1.4, 1.8 * s), 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
