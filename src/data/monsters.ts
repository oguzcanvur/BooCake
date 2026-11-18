// Customer monsters, assembled from Kenney "Monster Builder Pack" parts (body, arms, legs, eyes, details).
// Add a new monster by adding an entry here: no other code changes.

import type { SpecialId } from './gameConfig';

export type MonsterColor = 'green' | 'red' | 'yellow' | 'blue' | 'white' | 'dark';
export type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type DetailKind = 'ear' | 'ear_round' | 'horn_small' | 'horn_large' | 'antenna_small' | 'antenna_large';
export type Mood = 'happy' | 'neutral' | 'angry';
/** Extra drawn pieces that are not in the Kenney pack. */
export type Accessory = 'cape' | 'mask' | 'cap' | 'bandage';
export type MonsterKind = 'normal' | SpecialId | 'guard';

export interface MonsterDef {
  id: string;
  kind: MonsterKind;
  color: MonsterColor;
  body: Letter;
  arm: Letter;
  /** No leg = the monster floats or sits on the counter. */
  leg?: Letter;
  eyes: 1 | 2;
  /** Frame name (without ".png") of the calm eye. */
  eyeFrame: string;
  eyeScale?: number;
  /** A pair of ears / horns / antennae on top of the head. x = fraction of body width from the center. */
  detail?: { kind: DetailKind; x: number; y?: number };
  nose?: string;
  /** Mouth frame per mood, if different from the default. */
  mouths?: Partial<Record<Mood, string>>;
  accessory?: Accessory;
  /** Height of the body on screen, in pixels. */
  targetH: number;
  /** Floats up and down more (ghost). */
  hover?: boolean;
  alpha?: number;
}

/** Regular customers: only the looks differ. */
export const NORMAL_MONSTERS: MonsterDef[] = [
  {
    id: 'zombie',
    kind: 'normal',
    color: 'green',
    body: 'A',
    arm: 'D',
    leg: 'C',
    eyes: 2,
    eyeFrame: 'eye_human_green',
    targetH: 128,
  },
  {
    id: 'mummy',
    kind: 'normal',
    color: 'white',
    body: 'E',
    arm: 'B',
    leg: 'B',
    eyes: 2,
    eyeFrame: 'eye_human',
    accessory: 'bandage',
    targetH: 158,
  },
  {
    id: 'wolf',
    kind: 'normal',
    color: 'dark',
    body: 'F',
    arm: 'A',
    leg: 'E',
    eyes: 2,
    eyeFrame: 'eye_yellow',
    nose: 'nose_brown',
    detail: { kind: 'ear', x: 0.3, y: 0.08 },
    targetH: 150,
  },
  {
    id: 'slime',
    kind: 'normal',
    color: 'blue',
    body: 'D',
    arm: 'E',
    eyes: 2,
    eyeFrame: 'eye_human_blue',
    targetH: 124,
  },
];

/** Special monsters (see the design document, chapter 8). */
export const SPECIAL_MONSTERS: Record<SpecialId, MonsterDef> = {
  vampire: {
    id: 'vampire',
    kind: 'vampire',
    color: 'dark',
    body: 'C',
    arm: 'C',
    leg: 'D',
    eyes: 2,
    eyeFrame: 'eye_human_red',
    detail: { kind: 'ear', x: 0.32, y: 0.1 },
    mouths: { happy: 'mouthB', neutral: 'mouth_closed_fangs', angry: 'mouthC' },
    accessory: 'cape',
    targetH: 150,
  },
  ghost: {
    id: 'ghost',
    kind: 'ghost',
    color: 'white',
    body: 'C',
    arm: 'E',
    eyes: 2,
    eyeFrame: 'eye_human_blue',
    hover: true,
    alpha: 0.9,
    targetH: 134,
  },
  thief: {
    id: 'thief',
    kind: 'thief',
    color: 'dark',
    body: 'B',
    arm: 'C',
    leg: 'D',
    eyes: 2,
    eyeFrame: 'eye_human',
    accessory: 'mask',
    targetH: 100,
  },
};

/** The security guard you can buy in the shop. */
export const GUARD_MONSTER: MonsterDef = {
  id: 'guard',
  kind: 'guard',
  color: 'blue',
  body: 'A',
  arm: 'C',
  leg: 'D',
  eyes: 2,
  eyeFrame: 'eye_human',
  accessory: 'cap',
  targetH: 104,
};

export function pickNormal(rand: () => number = Math.random): MonsterDef {
  return NORMAL_MONSTERS[Math.floor(rand() * NORMAL_MONSTERS.length)];
}
