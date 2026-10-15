import { EngineParams, RenderEngine } from "./types";

export const cnnTexture: RenderEngine = {
  id: "cnn_texture",
  label: "CNN Texture",
  description: "Multi-frequency harmonic interference grid rendered via ImageData.",

  render(ctx, size, rng, params: EngineParams) {
    const img = ctx.createImageData(size, size);
    const data = img.data;

    const offX = rng.random(1000);
    const offY = rng.random(1000);
    const colorShift = rng.random(360) + params.accentHue;

    const freqMul = 0.4 + params.frequency * 1.6;
    const scale1 = rng.random(0.015, 0.03) * freqMul;
    const scale2 = rng.random(0.12, 0.18) * freqMul;
    const scale3 = rng.random(0.7, 0.9) * freqMul;
    const bands = Math.round(4 + params.density * 12); // posterization steps

    // Sample at native 800px cadence regardless of canvas size so frequency reads consistently.
    const coordScale = 800 / size;

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const sx = x * coordScale;
        const sy = y * coordScale;

        const n1 = rng.noise((sx + offX) * scale1, (sy + offY) * scale1);
        const n2 = Math.sin((sx + offX) * scale2) * Math.cos((sy + offY) * scale2);
        const n3 = rng.noise((sx + offX) * scale3, (sy + offY) * scale3);

        const combined = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        const posterized = Math.floor(combined * bands) / bands;

        const hue = (posterized * 360 + colorShift) % 360;
        const sat = 85;
        const bri = map(Math.sin(combined * Math.PI * 4), -1, 1, 10, 95);

        const [r, g, b] = hsbToRgbTuple(hue, sat, bri);
        const idx = (x + y * size) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  },
};

function map(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function hsbToRgbTuple(h: number, s: number, b: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const ss = s / 100;
  const bb = b / 100;
  const c = bb * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = bb - c;
  let r = 0;
  let g = 0;
  let bch = 0;
  if (hh < 60) [r, g, bch] = [c, x, 0];
  else if (hh < 120) [r, g, bch] = [x, c, 0];
  else if (hh < 180) [r, g, bch] = [0, c, x];
  else if (hh < 240) [r, g, bch] = [0, x, c];
  else if (hh < 300) [r, g, bch] = [x, 0, c];
  else [r, g, bch] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((bch + m) * 255)];
}
