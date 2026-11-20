// Shop decoration (cosmetic only, no effect on play). Options unlock with stars: every star earned on a day
// (the best result per day of the current run) adds to decor.stars, which is never reset by a new game.
// Choices last until the page is reloaded (the game has no saving).

export interface ColorOption {
  id: string;
  name: string;
  color: number;
  /** Stars needed to unlock it (0 = free from the start). */
  stars: number;
}

export interface ClothOption {
  id: string;
  name: string;
  base: number;
  dark: number;
  trim: number;
  stars: number;
}

export interface DecorationItem {
  id: 'webs' | 'garland' | 'lights' | 'pumpkin';
  name: string;
  stars: number;
}

/** Paper wrapper of every cupcake. */
export const WRAPPERS: ColorOption[] = [
  { id: 'plum', name: 'Plum', color: 0x3b2560, stars: 0 },
  { id: 'mint', name: 'Mint', color: 0x3f8f7a, stars: 2 },
  { id: 'rose', name: 'Rose', color: 0xc0507e, stars: 4 },
  { id: 'gold', name: 'Gold', color: 0xc9963a, stars: 7 },
];

/** Plate color (a tint over the team's white plate). */
export const PLATE_COLORS: ColorOption[] = [
  { id: 'white', name: 'White', color: 0xffffff, stars: 0 },
  { id: 'sky', name: 'Sky', color: 0xb8d4ff, stars: 1 },
  { id: 'blush', name: 'Blush', color: 0xffc4dc, stars: 3 },
  { id: 'mint', name: 'Mint', color: 0xbff0d8, stars: 5 },
];

/** The runner with the scalloped hem on the counter. */
export const CLOTHS: ClothOption[] = [
  { id: 'purple', name: 'Purple', base: 0x6b3fa0, dark: 0x4e2b7a, trim: 0xd9a84e, stars: 0 },
  { id: 'cherry', name: 'Cherry', base: 0xa8324a, dark: 0x7a2034, trim: 0xf2c45a, stars: 2 },
  { id: 'teal', name: 'Teal', base: 0x2f8a85, dark: 0x1f5f5c, trim: 0xf0d27a, stars: 4 },
  { id: 'night', name: 'Night', base: 0x2e2438, dark: 0x1a1424, trim: 0xff9a3c, stars: 6 },
];

/** Extra decorations in the shop (each can be switched on or off). */
export const DECORATIONS: DecorationItem[] = [
  { id: 'webs', name: 'Spider webs', stars: 1 },
  { id: 'garland', name: 'Bat garland', stars: 3 },
  { id: 'lights', name: 'Fairy lights', stars: 5 },
  { id: 'pumpkin', name: 'Big pumpkin', stars: 8 },
];

/** The player's decoration. Not touched by resetGame (a new game keeps the shop's look and the stars). */
export const decor = {
  wrapper: 'plum',
  plate: 'white',
  cloth: 'purple',
  items: [] as DecorationItem['id'][],
  /** Stars collected for unlocking decorations. */
  stars: 0,
};

export const wrapperColor = (): number => (WRAPPERS.find((w) => w.id === decor.wrapper) ?? WRAPPERS[0]).color;
export const plateColor = (): number => (PLATE_COLORS.find((p) => p.id === decor.plate) ?? PLATE_COLORS[0]).color;
export const clothColors = (): ClothOption => CLOTHS.find((c) => c.id === decor.cloth) ?? CLOTHS[0];
export const hasDecoration = (id: DecorationItem['id']): boolean => decor.items.includes(id);
