// ALL gameplay numbers live here (times, prices, goals, the day table), so the game is easy to balance.
// Change a value, save, and play: nothing else needs to be touched.

export type SpecialId = 'vampire' | 'ghost' | 'thief';

export interface DayConfig {
  /** Money to earn during this day (not the running total). */
  goal: number;
  /** Seconds between customers (the real gap is randomized by +/- intervalJitter). */
  interval: number;
  /** Seconds a customer waits before leaving. */
  patience: number;
  /** Special monsters that can show up on this day. */
  specials: SpecialId[];
}

export const CONFIG = {
  /** Length of one day in seconds (2.5 minutes). */
  dayLengthSec: 150,

  /** Price of a correct cupcake, plus a tip that depends on the customer's mood when served. */
  price: 5,
  tips: { happy: 5, uneasy: 2, angry: 0 },
  /** Patience above this fraction = happy; above the second = uneasy; below = angry. */
  mood: { happyAbove: 0.6, uneasyAbove: 0.3 },

  /** A wrong cupcake is thrown away and the customer loses this fraction of their full patience. */
  wrongOrderPatiencePenalty: 0.2,

  /** Oven: seconds until cooked, and until burnt. (Cooked between cookSec and burnSec.) */
  oven: { slots: 1, cookSec: 5, burnSec: 10 },
  /** Plates the player starts with (more can be bought in the shop, see MAX_EXTRA_PLATES). */
  plates: { slots: 2 },
  /** From this day on (1-based) the extra doughs, frostings and toppings are on the table and in the orders. */
  extrasFromDay: 2,
  /** How many finished cupcakes the ready tray holds. */
  traySlots: 2,

  /** Vampire bite: the player cannot click for this long. */
  biteSec: 5,
  /** Money left behind by a thief caught by the security guard. */
  guardBonus: 5,
  /** Ghosts are patient: their patience drains at this speed. */
  ghostPatienceFactor: 0.7,
  /** Chance that a regular arrival is a special monster instead of a normal one (on top of the guaranteed one). */
  extraSpecialChance: 0.12,
  /** +/- seconds of randomness on the customer interval. */
  intervalJitter: 2,
  /** Seconds between the start of a day and the first customer. */
  firstCustomerSec: 1.5,

  /** Stars: share of the goal needed for 1, 2 and 3 stars. */
  stars: [1.0, 1.3, 1.6],

  /** Shop prices (permanent upgrades). */
  shop: { garlic: 40, guard: 60, oven: 50, plate: 30 },

  /** The 4 days. */
  days: [
    // day 1 is a gentle start: lower goal, more patient customers who come a little slower
    { goal: 45, interval: 13, patience: 36, specials: [] },
    { goal: 90, interval: 10, patience: 27, specials: ['vampire', 'ghost'] },
    { goal: 120, interval: 8, patience: 24, specials: ['vampire', 'ghost', 'thief'] },
    { goal: 150, interval: 7, patience: 22, specials: ['vampire', 'ghost', 'thief'] },
  ] as DayConfig[],
};

export const DAY_COUNT = CONFIG.days.length;
