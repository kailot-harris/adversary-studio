/** Converts HSB (hue 0-360, sat/bright 0-100) to a CSS rgb() string, mirroring Processing's HSB color mode. */
export function hsb(h: number, s: number, b: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const bb = Math.max(0, Math.min(100, b)) / 100;

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

  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((bch + m) * 255);
  return `rgb(${R}, ${G}, ${B})`;
}

export function rgba(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** HSB (hue 0-360, sat/bright 0-100) to an [r, g, b] 0-255 tuple, for direct ImageData writes. */
export function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const bb = Math.max(0, Math.min(100, b)) / 100;

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
