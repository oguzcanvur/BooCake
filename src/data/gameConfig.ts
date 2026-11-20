// ALL gameplay numbers live here (times, prices, goals, the day table), so the game is easy to balance.
// Change a value, save, and play: nothing else needs to be touched.

export type SpecialId = 'vampire' | 'ghost' | 'thief';

export interface DayConfig {
  /** Length of this day in seconds. */
  length: number;
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
  /**
   * From which day (1-based) the extra ingredients are on the table and in the orders. They come one group per day
   * so the number of combinations grows step by step (27 -> 54 -> 108 -> 216).
   */
  extrasFromDay: { dough: 2, frosting: 3, topping: 4 },
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
  /** While the game is being tested: every day on the map can be played without finishing the ones before it. */
  unlockAllDays: true,

  days: [
    // day 1 is a gentle start for first-time players: 2 minutes, lower goal, slower customers who wait longer
    { length: 120, goal: 35, interval: 17, patience: 48, specials: [] },
    // all days were made easier: customers come less often and wait longer, goals lowered to match; 2 minutes each
    { length: 120, goal: 60, interval: 13, patience: 40, specials: ['vampire', 'ghost'] },
    { length: 120, goal: 75, interval: 11, patience: 36, specials: ['vampire', 'ghost', 'thief'] },
    { length: 120, goal: 85, interval: 10, patience: 34, specials: ['vampire', 'ghost', 'thief'] },
  ] as DayConfig[],
};

export const DAY_COUNT = CONFIG.days.length;
