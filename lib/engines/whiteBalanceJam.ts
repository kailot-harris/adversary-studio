import { hsb } from "@/lib/color";
import { EngineParams, RenderEngine } from "./types";

/**
 * Tiles the frame with a seeded grid of rectangular color patches that
 * alternate between warm-tinted (orange/red) and cool-tinted (blue/cyan)
 * hues, biased so the patches' sizes and tint strengths skew the frame's
 * overall average color away from neutral gray. Many auto white-balance
 * algorithms assume the average scene color *should* be gray (the
 * "gray-world" assumption) and correct exposure/tint toward that average —
 * a scene whose true average color is deliberately warm- or cool-skewed
 * fools that correction into overcompensating in the wrong direction.
 */
export const whiteBalanceJam: RenderEngine = {
  id: "white_balance_jam",
  label: "White Balance Jam",
  description:
    "Alternating warm/cool color-patch tiling tuned to defeat auto white-balance gray-world assumptions.",

  render(ctx, size, rng, params: EngineParams) {
    const coordScale = size / 800; // native layout at 800px cadence, scaled to canvas size

    // Base wash: a mild overall warm skew so even gaps between patches push
    // the frame average away from neutral gray.
    ctx.fillStyle = hsb(28, 22, 92);
    ctx.fillRect(0, 0, size, size);

    // Density slider: grid resolution (rows/cols of patches).
    const cols = Math.round(4 + params.density * 14); // 4..18
    const rows = Math.round(4 + params.density * 14);

    // Scale slider: how much each patch's size is allowed to jitter and how
    // much inset/gap separates neighboring patches.
    const jitterFrac = 0.1 + params.scale * 0.35;
    const gapFrac = 0.04 + (1 - params.scale) * 0.1;

    const cellW = size / cols;
    const cellH = size / rows;

    // Frequency slider: how quickly the warm/cool alternation flips across
    // the grid — low frequency reads as large alternating bands, high
    // frequency reads as a fine checker-like jam pattern.
    const flipPeriod = Math.max(1, Math.round(3 - params.frequency * 2)); // 1..3 cells per phase

    // Warm patches lean toward the accent hue's orange/red side; cool
    // patches lean toward its complementary blue/cyan side, deliberately
    // asymmetric in saturation/brightness so the overall average skews
    // warm rather than landing back on neutral gray.
    const warmHue = (params.accentHue * 0.15 + 18) % 360; // stays in orange/red band
    const coolHue = (200 + params.accentHue * 0.1) % 360; // stays in blue/cyan band

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const phase = Math.floor(c / flipPeriod) + Math.floor(r / flipPeriod);
        const isWarm = phase % 2 === 0;

        const cx = c * cellW;
        const cy = r * cellH;

        const jitterW = cellW * jitterFrac * (rng.random() - 0.5) * 2;
        const jitterH = cellH * jitterFrac * (rng.random() - 0.5) * 2;

        const gapW = cellW * gapFrac;
        const gapH = cellH * gapFrac;

        const x = cx + gapW / 2 + jitterW * 0.5;
        const y = cy + gapH / 2 + jitterH * 0.5;
        const w = Math.max(1, cellW - gapW + jitterW * 0.5);
        const h = Math.max(1, cellH - gapH + jitterH * 0.5);

        // Warm patches are deliberately pushed brighter/more saturated than
        // cool patches so the frame's pixel-average lands on the warm side
        // of neutral even though patch *counts* alternate roughly evenly —
        // this is the gray-world-defeating asymmetry.
        let hue: number;
        let sat: number;
        let bri: number;
        if (isWarm) {
          hue = (warmHue + rng.random(-10, 10) + 360) % 360;
          sat = 55 + rng.random() * 35; // 55..90
          bri = 70 + rng.random() * 25; // 70..95
        } else {
          hue = (coolHue + rng.random(-10, 10) + 360) % 360;
          sat = 35 + rng.random() * 30; // 35..65
          bri = 45 + rng.random() * 25; // 45..70
        }

        ctx.fillStyle = hsb(hue, sat, bri);
        ctx.fillRect(x, y, w, h);

        // Occasional small accent-hued corner chip on warm cells, further
        // biasing the overall tally of warm-weighted pixels.
        if (isWarm && rng.random() < 0.3) {
          const chip = Math.min(w, h) * (0.18 + rng.random() * 0.14) * coordScale;
          ctx.fillStyle = hsb((warmHue + 35) % 360, 70, 95);
          ctx.fillRect(x + w - chip, y, chip, chip);
        }
      }
    }

    // Thin seeded grid seams in a neutral dark tone, just enough to read as
    // a deliberate tiling rather than noise, without fighting the color skew.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = hsb(30, 8, 15);
    ctx.lineWidth = Math.max(0.5, 1 * coordScale);
    for (let c = 1; c < cols; c++) {
      const x = c * cellW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = r * cellH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    ctx.restore();
  },
};
