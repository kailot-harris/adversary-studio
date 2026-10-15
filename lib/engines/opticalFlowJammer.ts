import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * A grid of motion-vector arrows whose directions are driven by seeded
 * Perlin noise, deliberately corrupted so adjacent cells disagree hard —
 * some rotated into a false swirling vortex, some flipped outright — so the
 * field never resolves into the coherent flow an optical-flow tracker
 * expects between consecutive frames.
 */
export const opticalFlowJammer: RenderEngine = {
  id: "optical_flow_jammer",
  label: "Optical Flow Jammer",
  description: "Conflicting motion-vector arrows and false flow fields tuned to break video tracking.",

  render(ctx, size, rng, params: EngineParams) {
    const s = size / 800;

    ctx.fillStyle = "rgb(10,12,16)";
    ctx.fillRect(0, 0, size, size);

    // Density -> grid resolution (more, smaller cells at higher density).
    const cells = Math.round(14 + params.density * 22); // 14..36 cells per side
    const cellSize = size / cells;

    // Scale -> arrow length relative to cell size.
    const arrowLen = cellSize * (0.35 + params.scale * 0.55);

    // Frequency -> how fast the underlying "coherent" flow field would wind,
    // before it gets jammed. Higher frequency = tighter noise field = more
    // apparent swirl per cell.
    const noiseFreq = 0.12 + params.frequency * 0.5;

    // Vortex jam center(s): fake attractors that pull the field into a
    // swirl inconsistent with the smooth noise flow around them.
    const vortexCount = rng.randomInt(2, 4);
    const vortices: { x: number; y: number; strength: number; sign: number }[] = [];
    for (let i = 0; i < vortexCount; i++) {
      vortices.push({
        x: rng.random(0.15, 0.85) * size,
        y: rng.random(0.15, 0.85) * size,
        strength: rng.random(0.5, 1.4),
        sign: rng.random(1) > 0.5 ? 1 : -1,
      });
    }

    const accent = hsb(params.accentHue, 85, 95);
    const seedOffsetX = rng.random(1000);
    const seedOffsetY = rng.random(1000);

    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const cx = (gx + 0.5) * cellSize;
        const cy = (gy + 0.5) * cellSize;

        // Smooth base flow angle from Perlin noise — this is what a real
        // optical-flow field would look like if left alone.
        const n = rng.noise(gx * noiseFreq + seedOffsetX, gy * noiseFreq + seedOffsetY);
        let angle = n * Math.PI * 4;
        let magnitude = 0.4 + n * 0.6;

        // Jam the field: bend angle toward/around each vortex, fighting the
        // smooth base direction so neighboring cells contradict each other.
        for (const v of vortices) {
          const dx = cx - v.x;
          const dy = cy - v.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const falloff = Math.exp(-dist / (size * 0.22));
          const swirlAngle = Math.atan2(dy, dx) + (Math.PI / 2) * v.sign;
          angle = angle + (swirlAngle - angle) * falloff * v.strength;
          magnitude += falloff * 0.5;
        }

        // Contradiction layer: every other cell in a dither-like checker
        // pattern gets flipped 150-210 degrees, so a coherent diagonal
        // sweep reads as a field of opposing arrows up close.
        const contradict = (gx + gy) % 2 === 0 && rng.random(1) > 0.4;
        if (contradict) {
          angle += Math.PI + rng.random(-0.35, 0.35);
        }

        const len = arrowLen * Math.min(1.4, magnitude);
        const isDecoy = rng.random(1) > 0.82;
        const color = isDecoy ? accent : "rgba(235,240,245,0.85)";

        drawArrow(ctx, cx, cy, angle, len, Math.max(1, 1.4 * s), color);
      }
    }

    // Overlay a handful of false long-range flow streaks that cut straight
    // across the grid, ignoring the local field entirely — a decoy "global
    // motion" cue that disagrees with the dense local vectors.
    const streaks = Math.round(2 + params.density * 4);
    for (let i = 0; i < streaks; i++) {
      const x0 = rng.random(0, size);
      const y0 = rng.random(0, size);
      const streakAngle = rng.random(Math.PI * 2);
      const streakLen = rng.random(0.25, 0.55) * size;
      const x1 = x0 + Math.cos(streakAngle) * streakLen;
      const y1 = y0 + Math.sin(streakAngle) * streakLen;

      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.setLineDash([6 * s, 8 * s]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  },
};

function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  len: number,
  width: number,
  color: string
) {
  const hx = Math.cos(angle) * (len / 2);
  const hy = Math.sin(angle) * (len / 2);
  const x0 = cx - hx;
  const y0 = cy - hy;
  const x1 = cx + hx;
  const y1 = cy + hy;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Arrowhead.
  const headLen = Math.max(3, len * 0.32);
  const headAngle = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - headLen * Math.cos(angle - headAngle), y1 - headLen * Math.sin(angle - headAngle));
  ctx.lineTo(x1 - headLen * Math.cos(angle + headAngle), y1 - headLen * Math.sin(angle + headAngle));
  ctx.closePath();
  ctx.fill();
}
