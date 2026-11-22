// ALL gameplay numbers live here (times, prices, goals, the night table, the league), so the game is easy to balance.
// Change a value, save, and play: nothing else needs to be touched.

export type SpecialId = 'vampire' | 'ghost' | 'thief';

/** An ingredient id (dough, frosting or topping) from data/recipes.ts. */
export type IngredientId = string;

/** A special monster at a planned moment of the night (seconds after the start). Always the same, so it can be learned. */
export interface SpecialVisit {
  id: SpecialId;
  at: number;
}

/**
 * Customer waves inside one night: the gap between customers (seconds) in the calm start, the steady middle and
 * the short rush at the end. `WAVE_SPLIT` says where each part begins.
 */
export type Waves = [calm: number, middle: number, rush: number];

export interface NightConfig {
  /** Name shown on the map, the intro card and the summary. */
  name: string;
  /** Length of this night in seconds. */
  length: number;
  /** Money to earn during this night (not the running total). */
  goal: number;
  /** Seconds a customer waits before leaving. */
  patience: number;
  /** Most customers at the counter at the same time (there are 3 seats). */
  seats: number;
  /** Seconds between customers in the calm start, the middle and the rush. */
  waves: Waves;
  /** Special monsters and the exact moment each one arrives (nothing random). */
  specials: SpecialVisit[];
  /** Extra ingredients that join the table on this night (and stay for the next nights). */
  newIngredients: IngredientId[];
}

/** Where the middle part and the rush begin, as a share of the night's length. */
export const WAVE_SPLIT = { middle: 0.3, rush: 0.8 };

/** The 5 campaign nights. One new thing per night at most: a flavor, or one special monster. */
const NIGHTS: NightConfig[] = [
  // 1: only the basic cupcake loop, two seats, a customer about every 22 s
  { name: 'Opening Rehearsal', length: 100, goal: 20, patience: 80, seats: 2, waves: [23, 22, 21], specials: [], newIngredients: [] },
  // 2: one new flavor (Red Velvet: 27 -> 36 recipes), still no special monsters
  { name: 'Flavor Festival', length: 100, goal: 25, patience: 74, seats: 2, waves: [20, 18, 16], specials: [], newIngredients: ['redvelvet'] },
  // 3: the ghost (harmless and funny), third seat opens
  {
    name: 'Ghost Shift',
    length: 105,
    goal: 30,
    patience: 68,
    seats: 3,
    waves: [18, 16, 14],
    specials: [
      { id: 'ghost', at: 30 },
      { id: 'ghost', at: 72 },
    ],
    newIngredients: [],
  },
  // 4: the vampire, always at the same moment (garlic can be bought before this night)
  {
    name: 'Blood Moon',
    length: 105,
    goal: 38,
    patience: 62,
    seats: 3,
    waves: [17, 14, 12],
    specials: [
      { id: 'ghost', at: 22 },
      { id: 'vampire', at: 45 },
      { id: 'vampire', at: 86 },
    ],
    newIngredients: [],
  },
  // 5: the thief joins the vampire and the ghost (the guard can be bought before this night)
  {
    name: 'Halloween Cup',
    length: 115,
    goal: 48,
    patience: 58,
    seats: 3,
    waves: [16, 12, 10],
    specials: [
      { id: 'ghost', at: 18 },
      { id: 'vampire', at: 40 },
      // the thief comes twice; `at` is the earliest moment, he then waits for a ready cupcake (ekip isteği)
      { id: 'thief', at: 50 },
      { id: 'ghost', at: 80 },
      { id: 'thief', at: 85 },
      { id: 'vampire', at: 98 },
    ],
    newIngredients: [],
  },
];

export const CONFIG = {
  /** Price of a correct cupcake, plus a tip that depends on the customer's mood when served. */
  price: 5,
  tips: { happy: 5, uneasy: 2, angry: 0 },
  /** Patience above this fraction = happy; above the second = uneasy; below = angry. */
  // customers stay happy for the first half of their patience and only get angry in the last fifth
  mood: { happyAbove: 0.5, uneasyAbove: 0.2 },

  /** A wrong cupcake is thrown away and the customer loses this fraction of their full patience. */
  wrongOrderPatiencePenalty: 0.2,

  /** Oven: seconds until cooked, and until burnt. (Cooked between cookSec and burnSec.) */
  oven: { slots: 1, cookSec: 5, burnSec: 10 },
  /** Plates the player starts with (more can be bought in the shop, see MAX_EXTRA_PLATES). */
  plates: { slots: 2 },
  /** How many finished cupcakes the ready tray holds. */
  traySlots: 2,

  /** Vampire bite: the player cannot click for this long. */
  biteSec: 2,
  /** Money left behind by a thief caught by the security guard. */
  guardBonus: 5,
  /** The thief steals at most this many cupcakes from the ready tray. */
  thiefSteals: 1,
  /** Seconds of warning (a banner) before a planned special monster arrives. */
  specialWarningSec: 5,
  /** Ghosts are patient: their patience drains at this speed (and a ghost that gives up is not counted as lost). */
  ghostPatienceFactor: 0.7,
  /** +/- seconds of randomness on the customer gap (small, so the waves stay smooth). */
  intervalJitter: 1,
  /** Seconds between the start of a night and the first customer. */
  firstCustomerSec: 1.5,

  /** Stars: share of the goal needed for 1, 2 and 3 stars. The night always runs to the end. */
  stars: [1.0, 1.3, 1.6],

  /**
   * Shop prices (permanent upgrades). Playing exactly the goals gives $20 + $25 + $30 = $75 before night 4
   * (garlic $30 fits) and $113 before night 5 (garlic + guard = $75 fits).
   */
  shop: { garlic: 30, guard: 45, oven: 50, plate: 30 },

  /** Nights open one after another (the next one opens when the previous goal is reached). */
  nights: NIGHTS,
  /**
   * While the game is being tested: every night on the map can be played without finishing the ones before it
   * (money and records still work as usual). Set to false before handing the game in.
   */
  unlockAllNights: true,

  /**
   * Midnight League: a replayable 2-minute race. Everyone gets the same equipment, and the same seed gives the
   * same customers, orders and special monster times, so scores can be compared.
   */
  league: {
    name: 'Midnight League',
    length: 120,
    patience: 56,
    seats: 3,
    waves: [14, 11, 9] as Waves,
    /** The same kitchen for everyone, whatever was bought in the campaign. */
    gear: { ovens: 2, plates: 4, garlic: false, guard: false },
    /** Extra ingredients on the table (4 doughs x 4 frostings x 4 toppings = 64 recipes). */
    ingredients: ['redvelvet', 'cream', 'cherry'] as IngredientId[],
    /** Planned special monsters: each one comes once inside its window (seconds); the seed picks the moment. */
    specials: [
      { id: 'ghost', from: 15, to: 30 },
      { id: 'vampire', from: 38, to: 52 },
      { id: 'thief', from: 60, to: 75 },
      { id: 'ghost', from: 80, to: 92 },
      { id: 'vampire', from: 96, to: 108 },
    ] as { id: SpecialId; from: number; to: number }[],
    /** "Par" money for the stars on the bar (no wallet money is earned in the league). */
    par: 60,
    /** Score = money x perDollar + happy serves x happyServe + best streak x streak - lost x lost - burnt x burnt. */
    score: { perDollar: 100, happyServe: 150, streak: 100, lost: 300, burnt: 100 },
  },
};

export const NIGHT_COUNT = CONFIG.nights.length;
