// Customer monster types. Each one is assembled from Kenney "Monster Builder Pack" parts
// (body, arms, legs, eyes, details). Add a new monster by adding an entry here: no other code changes.

export type MonsterColor = 'green' | 'red' | 'yellow' | 'blue' | 'white' | 'dark';
export type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type DetailKind = 'ear' | 'ear_round' | 'horn_small' | 'horn_large' | 'antenna_small' | 'antenna_large';

export interface MonsterDef {
  id: string;
  color: MonsterColor;
  body: Letter;
  arm: Letter;
  /** No leg = the monster floats (ghost). */
  leg?: Letter;
  eyes: 1 | 2;
  /** Frame name (without ".png") of the calm eye. */
  eyeFrame: string;
  eyeScale?: number;
  /** A pair of ears / horns / antennae on top of the head. x = fraction of body width from the center. */
  detail?: { kind: DetailKind; x: number; y?: number };
  nose?: string;
  /** Height of the body on screen, in pixels. */
  targetH: number;
  /** How often this monster shows up (relative). */
  weight: number;
  /** Floats up and down more (ghost). */
  hover?: boolean;
  alpha?: number;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'cyclops',
    color: 'green',
    body: 'C',
    arm: 'A',
    leg: 'A',
    eyes: 1,
    eyeFrame: 'eye_human_green',
    eyeScale: 1.5,
    detail: { kind: 'horn_small', x: 0.26 },
    targetH: 118,
    weight: 3,
  },
  {
    id: 'bear',
    color: 'yellow',
    body: 'B',
    arm: 'B',
    leg: 'B',
    eyes: 2,
    eyeFrame: 'eye_human',
    nose: 'nose_brown',
    detail: { kind: 'ear_round', x: 0.33, y: 0.2 },
    targetH: 112,
    weight: 3,
  },
  {
    id: 'square',
    color: 'blue',
    body: 'A',
    arm: 'C',
    leg: 'D',
    eyes: 2,
    eyeFrame: 'eye_human_blue',
    nose: 'nose_brown',
    detail: { kind: 'antenna_small', x: 0.2 },
    targetH: 108,
    weight: 3,
  },
  {
    id: 'imp',
    color: 'red',
    body: 'E',
    arm: 'D',
    leg: 'C',
    eyes: 1,
    eyeFrame: 'eye_psycho_dark',
    eyeScale: 1.3,
    detail: { kind: 'horn_large', x: 0.28 },
    targetH: 132,
    weight: 2,
  },
  {
    id: 'ghost',
    color: 'white',
    body: 'C',
    arm: 'E',
    eyes: 2,
    eyeFrame: 'eye_human_blue',
    hover: true,
    alpha: 0.92,
    targetH: 118,
    weight: 2,
  },
  {
    id: 'furry',
    color: 'dark',
    body: 'F',
    arm: 'A',
    leg: 'E',
    eyes: 2,
    eyeFrame: 'eye_red',
    nose: 'nose_brown',
    detail: { kind: 'antenna_large', x: 0.2 },
    targetH: 126,
    weight: 2,
  },
];

/** Pick a random monster type, respecting weights. `pool` limits how many types are unlocked (first N). */
export function pickMonster(pool: number, rand: () => number = Math.random): MonsterDef {
  const list = MONSTERS.slice(0, Math.max(1, Math.min(pool, MONSTERS.length)));
  const total = list.reduce((sum, m) => sum + m.weight, 0);
  let r = rand() * total;
  for (const m of list) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return list[list.length - 1];
}
