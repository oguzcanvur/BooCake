// Customer monsters. Customers with a `sprite` use the team's character drawing (src/assets/chars/);
// the others (thief, guard) are drawn in code by objects/MonsterView.ts from the recipe fields
// (soft pastel cartoon style: thin dark outline, flat colors, rosy cheeks).
// Add a new monster by adding an entry here: no other code changes.

import type { CharSprite } from '../assets';
import type { SpecialId } from './gameConfig';

export type Mood = 'happy' | 'neutral' | 'angry';
export type MonsterKind = 'normal' | SpecialId | 'guard';
export type HairStyle = 'messy' | 'slick' | 'beanie' | 'fur' | 'bob' | 'spiky' | 'long' | 'none';
/** What the monster wears (sheet = ghost body, blob = slime body, tee = short sleeves and bare arms). */
export type Outfit = 'hoodie' | 'sweater' | 'tee' | 'cape' | 'stripes' | 'uniform' | 'wraps' | 'sheet' | 'blob';
export type EyeStyle = 'sleepy' | 'round' | 'cute' | 'bead';
export type Nose = 'skull' | 'dot' | 'snout' | 'line' | 'pink' | 'none';
export type Extra =
  | 'sprout'
  | 'stitch'
  | 'fangs'
  | 'mask'
  | 'cap'
  | 'bandage'
  | 'wolfEars'
  | 'pointyEars'
  | 'lashes'
  | 'batClip'
  | 'scarf'
  | 'collar';

export interface MonsterDef {
  id: string;
  kind: MonsterKind;
  /** Character picture. When set, the picture is shown and the drawing fields below are only a fallback. */
  sprite?: CharSprite;
  /** Skin / body color. */
  skin: number;
  hair?: { style: HairStyle; color: number };
  outfit: { type: Outfit; color: number };
  /** color = iris, white = the white of the eye (sleepy zombies have yellowish ones). */
  eyes: { style: EyeStyle; color?: number; white?: number };
  nose: Nose;
  extras?: Extra[];
  /** Skin seen through a gap in the bandages (mummy). The head itself uses `skin` (the bandage color). */
  faceColor?: number;
  /** 'counter' = leans on the counter (hands on it); 'standing' = full body with legs (thief, guard). */
  pose?: 'counter' | 'standing';
  /** Floats up and down more (ghost). */
  hover?: boolean;
  alpha?: number;
}

/** Regular customers: only the looks differ (zombie, mummy, werewolf, witch). */
export const NORMAL_MONSTERS: MonsterDef[] = [
  {
    id: 'zombie',
    kind: 'normal',
    sprite: 'zombie',
    skin: 0xa9d4a6,
    hair: { style: 'messy', color: 0x9fcfb4 },
    outfit: { type: 'hoodie', color: 0xcbb3d8 },
    eyes: { style: 'sleepy' },
    nose: 'skull',
    extras: ['sprout', 'stitch'],
  },
  {
    id: 'mummy',
    kind: 'normal',
    sprite: 'mummy',
    skin: 0xebe0c4,
    faceColor: 0xb7d68c,
    outfit: { type: 'wraps', color: 0xebe0c4 },
    eyes: { style: 'round', color: 0xf0a020 },
    nose: 'none',
    extras: ['bandage'],
  },
  {
    id: 'wolf',
    kind: 'normal',
    sprite: 'wolf',
    skin: 0xc4a58f,
    hair: { style: 'fur', color: 0xa98a76 },
    outfit: { type: 'sweater', color: 0x9fdcc9 },
    eyes: { style: 'round', color: 0xe0a33c },
    nose: 'snout',
    extras: ['wolfEars'],
  },
  {
    id: 'witch',
    kind: 'normal',
    sprite: 'witch',
    skin: 0xf2cbb8,
    hair: { style: 'long', color: 0x78b38c },
    outfit: { type: 'cape', color: 0x524656 },
    eyes: { style: 'round', color: 0x4a3340 },
    nose: 'dot',
    extras: ['pointyEars'],
  },
];

/** Special monsters (see the design document, chapter 8). */
export const SPECIAL_MONSTERS: Record<SpecialId, MonsterDef> = {
  vampire: {
    id: 'vampire',
    kind: 'vampire',
    sprite: 'vampire',
    skin: 0xe6dcf2,
    hair: { style: 'slick', color: 0x3d3550 },
    outfit: { type: 'cape', color: 0x5b3a7a },
    eyes: { style: 'round', color: 0xd2405a },
    nose: 'dot',
    extras: ['fangs'],
  },
  ghost: {
    id: 'ghost',
    kind: 'ghost',
    sprite: 'ghost',
    skin: 0xf5f3fc,
    outfit: { type: 'sheet', color: 0xf5f3fc },
    eyes: { style: 'bead' },
    nose: 'none',
    hover: true,
    alpha: 0.92,
  },
  thief: {
    id: 'thief',
    kind: 'thief',
    skin: 0xa9bcd2,
    hair: { style: 'beanie', color: 0x3e3a56 },
    outfit: { type: 'stripes', color: 0x5a5478 },
    eyes: { style: 'round', color: 0x4a3340 },
    nose: 'dot',
    extras: ['mask'],
    pose: 'standing',
  },
};

/** Extra looks for the special monsters (same rules, different character). One is picked at random. */
export const SPECIAL_VARIANTS: Record<SpecialId, MonsterDef[]> = {
  vampire: [SPECIAL_MONSTERS.vampire],
  ghost: [SPECIAL_MONSTERS.ghost],
  thief: [SPECIAL_MONSTERS.thief],
};

export function pickSpecial(id: SpecialId, rand: () => number = Math.random): MonsterDef {
  const list = SPECIAL_VARIANTS[id];
  return list[Math.floor(rand() * list.length)];
}

/** The security guard you can buy in the shop. */
export const GUARD_MONSTER: MonsterDef = {
  id: 'guard',
  kind: 'guard',
  skin: 0xf2c9a0,
  outfit: { type: 'uniform', color: 0x4a5d9a },
  eyes: { style: 'round', color: 0x4a3340 },
  nose: 'dot',
  extras: ['cap'],
  pose: 'standing',
};

export function pickNormal(rand: () => number = Math.random): MonsterDef {
  return NORMAL_MONSTERS[Math.floor(rand() * NORMAL_MONSTERS.length)];
}
