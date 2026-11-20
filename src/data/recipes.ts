// Cupcake ingredients. An order is one dough + one frosting + one topping.
// The first three of each list are there from day 1; the `extra` ones join from CONFIG.extrasFromDay
// (6 x 6 x 6 = 216 combinations then). Names are shown to the player; colors are used by the drawing code.

export const DOUGHS = [
  // raw = batter color, baked = right out of the oven, over = just before burning
  { id: 'vanilla', name: 'Vanilla', raw: 0xf8eecb, baked: 0xe8b866, over: 0xa8743a, extra: false },
  { id: 'chocolate', name: 'Chocolate', raw: 0x8a5a3c, baked: 0x6e4126, over: 0x3d2315, extra: false },
  { id: 'strawberry', name: 'Strawberry', raw: 0xffc2d4, baked: 0xf4949f, over: 0xb85a6c, extra: false },
  { id: 'redvelvet', name: 'Red Velvet', raw: 0xd9535f, baked: 0xb8323f, over: 0x6e1a24, extra: true },
  { id: 'lemon', name: 'Lemon', raw: 0xfbe9a0, baked: 0xf2cf5b, over: 0xb08a2a, extra: true },
  { id: 'matcha', name: 'Matcha', raw: 0xc4dca0, baked: 0x9cbf6a, over: 0x5e7a38, extra: true },
] as const;

export const FROSTINGS = [
  // flavors: pink = strawberry, green = pistachio, purple = blueberry, then cream, chocolate and caramel
  { id: 'pink', name: 'Strawberry', color: 0xff8fc7, extra: false },
  { id: 'mint', name: 'Pistachio', color: 0x8fffd0, extra: false },
  { id: 'lilac', name: 'Blueberry', color: 0xb98cff, extra: false },
  { id: 'cream', name: 'Vanilla', color: 0xfff3d6, extra: true },
  { id: 'choco', name: 'Chocolate', color: 0x9a6448, extra: true },
  { id: 'caramel', name: 'Caramel', color: 0xf0aa55, extra: true },
] as const;

export const TOPPINGS = [
  { id: 'sprinkles', name: 'Sprinkles', extra: false },
  { id: 'eye', name: 'Eyes', extra: false },
  { id: 'spider', name: 'Spiders', extra: false },
  { id: 'cherry', name: 'Cherry', extra: true },
  { id: 'bat', name: 'Bats', extra: true },
  { id: 'ghost', name: 'Ghosts', extra: true },
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

/** A random order. Without extras only the first three of each ingredient are used (day 1). */
export function randomOrder(withExtras: boolean, rand: () => number = Math.random): Order {
  const pick = <T extends { extra: boolean }>(list: readonly T[]): T => {
    const open = withExtras ? list : list.filter((x) => !x.extra);
    return open[Math.floor(rand() * open.length)];
  };
  return { dough: pick(DOUGHS).id, frosting: pick(FROSTINGS).id, topping: pick(TOPPINGS).id };
}
