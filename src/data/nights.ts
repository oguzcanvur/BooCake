// Night definitions. Game content lives here (data), not in the game logic.
// PROTOTYPE values: all numbers are first guesses to be tuned in playtests / design phase.
// The final game has 7 nights (night 7 = Halloween); only 3 exist in the prototype.

export interface NightConfig {
  name: string;
  /** Real seconds from sunset (18:00) to midnight. GDD: ~150 s (2.5 min). */
  durationSec: number;
  /** Money needed by midnight to win the night. */
  goal: number;
  /** Money multipliers (of goal) for 1, 2 and 3 stars. */
  starMultipliers: [number, number, number];
  /** Seconds between new customers (random in this range). */
  spawnMin: number;
  spawnMax: number;
  /** How long a customer waits before leaving. */
  patienceSec: number;
  /** How many monster types (first N of MONSTERS) can show up as customers. */
  monsterPool: number;
  /** How many frosting / topping kinds can appear in orders. */
  frostingCount: number;
  toppingCount: number;
  /** Money for a correct cupcake, plus up to maxTip for speed. */
  basePay: number;
  maxTip: number;
  /** Oven: seconds until ready, and until burnt. */
  bakeSec: number;
  burnSec: number;
  /** One-line description of what is new this night. */
  newThing: string;
}

export const NIGHTS: NightConfig[] = [
  {
    name: 'Night 1',
    durationSec: 150,
    goal: 60,
    starMultipliers: [1, 1.5, 2],
    spawnMin: 7,
    spawnMax: 11,
    patienceSec: 30,
    monsterPool: 3,
    frostingCount: 2,
    toppingCount: 2,
    basePay: 8,
    maxTip: 5,
    bakeSec: 6,
    burnSec: 12,
    newThing: 'Welcome! 2 frostings, 2 toppings.',
  },
  {
    name: 'Night 2',
    durationSec: 150,
    goal: 90,
    starMultipliers: [1, 1.5, 2],
    spawnMin: 6,
    spawnMax: 9,
    patienceSec: 27,
    monsterPool: 4,
    frostingCount: 3,
    toppingCount: 2,
    basePay: 8,
    maxTip: 5,
    bakeSec: 6,
    burnSec: 12,
    newThing: 'New: Lilac frosting and a horned imp.',
  },
  {
    name: 'Night 3',
    durationSec: 150,
    goal: 120,
    starMultipliers: [1, 1.5, 2],
    spawnMin: 5,
    spawnMax: 8,
    patienceSec: 24,
    monsterPool: 6,
    frostingCount: 3,
    toppingCount: 3,
    basePay: 9,
    maxTip: 6,
    bakeSec: 6,
    burnSec: 12,
    newThing: 'New: Eyeball topping, ghosts, furballs and a faster crowd.',
  },
];
