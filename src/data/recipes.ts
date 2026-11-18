// Cupcake ingredients. Orders are made of one frosting + one topping.
// PROTOTYPE data: names and colors are placeholders until the design phase decides the final set.

export const FROSTINGS = [
  { id: 'pink', name: 'Pink', color: 0xff8fc7 },
  { id: 'mint', name: 'Mint', color: 0x8fffd0 },
  { id: 'lilac', name: 'Lilac', color: 0xb98cff },
] as const;

export const TOPPINGS = [
  { id: 'cherry', name: 'Cherry' },
  { id: 'sprinkles', name: 'Sprinkles' },
  { id: 'eyeball', name: 'Eyeball' },
] as const;

export type FrostingId = (typeof FROSTINGS)[number]['id'];
export type ToppingId = (typeof TOPPINGS)[number]['id'];

export function frostingInfo(id: FrostingId) {
  return FROSTINGS.find((f) => f.id === id)!;
}

export function toppingInfo(id: ToppingId) {
  return TOPPINGS.find((t) => t.id === id)!;
}
