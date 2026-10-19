// Seeded RNG + 2D value noise used for deterministic world generation.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Value noise in [0,1). */
export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

/** Fractal noise in roughly [0,1). */
export function fbm(x, y, seed = 0, octaves = 4) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 101);
    norm += amp; amp *= 0.5; freq *= 2;
  }
  return sum / norm;
}

/** Deterministic hash of a tile to [0,1). */
export const tileRand = (x, y, seed = 0) => hash2(x, y, seed);

/** Runtime RNG helpers (non-deterministic). */
export const rand = {
  int(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); },
  chance(p) { return Math.random() < p; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
};
