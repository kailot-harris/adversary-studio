/**
 * Deterministic PRNG core. Same seed -> same bit stream on every device,
 * unlike Math.random() which is per-engine/per-process.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hashes an arbitrary string (e.g. a user-typed seed) into a uint32 for mulberry32. */
export function hashStringToSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * Seedable, deterministic stand-in for p5/Processing's `random()` and `noise()`.
 * Wraps a single mulberry32 stream so an engine's entire draw pass consumes
 * PRNG state in a fixed, reproducible order.
 */
export class Rng {
  private next: () => number;
  private perm: Uint8Array;

  constructor(seed: number) {
    this.next = mulberry32(seed);
    // Build a seeded permutation table for Perlin-style noise (replaces Processing's noise()).
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  /** Uniform float in [min, max). Matches Processing's random(min, max). */
  random(min = 1, max?: number): number {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return min + this.next() * (max - min);
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random(min, max));
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /** 2D Perlin noise in [0, 1], matching Processing's noise(x, y) range. */
  noise(x: number, y: number = 0): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);
    const p = this.perm;
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    const x1 = lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    const n = lerp(x1, x2, v);
    return (n + 1) / 2;
  }
}
