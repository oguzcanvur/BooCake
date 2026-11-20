// Cupcake ingredients. An order is one dough + one frosting + one topping.
// The first three of each list are there from day 1; the `extra` ones join on the day CONFIG.extrasFromDay
// gives for their group (6 x 6 x 6 = 216 combinations once all are open). Names are shown to the player; colors are used by the drawing code.

export const DOUGHS = [
  // raw = batter color, baked = right out of the oven, over = just before burning,
  // icon = the batter color in the team's bowl picture (order ticket dot; drawn unsoftened so it matches)
  { id: 'vanilla', name: 'Vanilla', raw: 0xf8eecb, baked: 0xe8b866, over: 0xa8743a, icon: 0xf7e2c5, extra: false },
  { id: 'chocolate', name: 'Chocolate', raw: 0x8a5a3c, baked: 0x6e4126, over: 0x3d2315, icon: 0x814f3e, extra: false },
  { id: 'strawberry', name: 'Strawberry', raw: 0xffc2d4, baked: 0xf4949f, over: 0xb85a6c, icon: 0xee9fa7, extra: false },
  { id: 'redvelvet', name: 'Red Velvet', raw: 0xd9535f, baked: 0xb8323f, over: 0x6e1a24, icon: 0xcd1f30, extra: true },
  { id: 'lemon', name: 'Lemon', raw: 0xfbe9a0, baked: 0xf2cf5b, over: 0xb08a2a, icon: 0xfee879, extra: true },
  { id: 'matcha', name: 'Matcha', raw: 0xc4dca0, baked: 0x9cbf6a, over: 0x5e7a38, icon: 0xa4d072, extra: true },
] as const;

export const FROSTINGS = [
  // flavors: pink = strawberry, green = pistachio, purple = blueberry, then cream, chocolate and caramel;
  // icon = the bag color in the team's picture (order ticket icon, drawn unsoftened)
  { id: 'pink', name: 'Strawberry', color: 0xff8fc7, icon: 0xf9c2c1, extra: false },
  { id: 'mint', name: 'Pistachio', color: 0x8fffd0, icon: 0xcfe0a6, extra: false },
  { id: 'lilac', name: 'Blueberry', color: 0xb98cff, icon: 0xc7a0bb, extra: false },
  { id: 'cream', name: 'Vanilla', color: 0xfff3d6, icon: 0xfbf1dd, extra: true },
  { id: 'choco', name: 'Chocolate', color: 0x9a6448, icon: 0xb46a43, extra: true },
  { id: 'caramel', name: 'Caramel', color: 0xf0aa55, icon: 0xf5b25b, extra: true },
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

export type IngredientGroup = 'dough' | 'frosting' | 'topping';

/** Which groups have their extra ingredients open today. */
export type OpenExtras = Record<IngredientGroup, boolean>;

/** A random order. A group whose extras are not open yet only uses its first three ingredients. */
export function randomOrder(open: OpenExtras, rand: () => number = Math.random): Order {
  const pick = <T extends { extra: boolean }>(list: readonly T[], withExtras: boolean): T => {
    const pool = withExtras ? list : list.filter((x) => !x.extra);
    return pool[Math.floor(rand() * pool.length)];
  };
  return { dough: pick(DOUGHS, open.dough).id, frosting: pick(FROSTINGS, open.frosting).id, topping: pick(TOPPINGS, open.topping).id };
}
