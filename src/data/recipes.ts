// Cupcake ingredients. An order is one dough + one frosting color + one topping (3 x 3 x 3 = 27 combinations).
// Names are shown to the player; colors are used by the drawing code.

export const DOUGHS = [
  // raw = batter color, baked = right out of the oven, over = just before burning
  { id: 'vanilla', name: 'Vanilya', raw: 0xf8eecb, baked: 0xe8b866, over: 0xa8743a, bowl: 0xf8eecb },
  { id: 'chocolate', name: 'Çikolata', raw: 0x8a5a3c, baked: 0x6e4126, over: 0x3d2315, bowl: 0x8a5a3c },
  { id: 'strawberry', name: 'Çilek', raw: 0xffc2d4, baked: 0xf4949f, over: 0xb85a6c, bowl: 0xffc2d4 },
] as const;

export const FROSTINGS = [
  { id: 'pink', name: 'Pembe', color: 0xff8fc7 },
  { id: 'mint', name: 'Yeşil', color: 0x8fffd0 },
  { id: 'lilac', name: 'Mor', color: 0xb98cff },
] as const;

export const TOPPINGS = [
  { id: 'sprinkles', name: 'Şeker' },
  { id: 'eye', name: 'Göz' },
  { id: 'spider', name: 'Örümcek' },
] as const;

export type DoughId = (typeof DOUGHS)[number]['id'];
export type FrostingId = (typeof FROSTINGS)[number]['id'];
export type ToppingId = (typeof TOPPINGS)[number]['id'];

export interface Order {
  dough: DoughId;
  frosting: FrostingId;
  topping: ToppingId;
}

export function doughInfo(id: DoughId) {
  return DOUGHS.find((d) => d.id === id)!;
}

export function frostingInfo(id: FrostingId) {
  return FROSTINGS.find((f) => f.id === id)!;
}

export function toppingInfo(id: ToppingId) {
  return TOPPINGS.find((t) => t.id === id)!;
}

/** A random order. */
export function randomOrder(rand: () => number = Math.random): Order {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
  return { dough: pick(DOUGHS).id, frosting: pick(FROSTINGS).id, topping: pick(TOPPINGS).id };
}
