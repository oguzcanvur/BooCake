// Seeded random numbers: the same seed always gives the same sequence (used by the Midnight League so every
// player gets the same customers, orders and special monster times).

export type Rand = () => number;

/** A small, fast seeded generator (mulberry32). Returns numbers in [0, 1). */
export function seededRandom(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new independent generator for one purpose (orders, arrivals, ...) derived from a seed, so streams do not mix. */
export function stream(seed: number, salt: number): Rand {
  return seededRandom((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0);
}

/** Today's league seed, e.g. 20261120: everyone who plays on the same day gets the same challenge. */
export function dailySeed(date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function between(rand: Rand, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function pick<T>(rand: Rand, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}
