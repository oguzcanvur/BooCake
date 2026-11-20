import { CONFIG, DAY_COUNT, type DayConfig } from '../data/gameConfig';

export interface Upgrades {
  garlic: boolean;
  guard: boolean;
  /** Extra ovens bought in the shop (0..MAX_EXTRA_OVENS). */
  ovens: number;
  /** Extra plates bought in the shop (0..MAX_EXTRA_PLATES). */
  plates: number;
}

/** The shop sells this many extra ovens (1 at the start + 1 = 2 ovens). */
export const MAX_EXTRA_OVENS = 1;
/** The shop sells this many extra plates (2 at the start + 2 = 4 plates). */
export const MAX_EXTRA_PLATES = 2;

/** Progress that survives scene changes. Everything resets when the page is reloaded (no saving needed). */
export const gameState = {
  /** Index into CONFIG.days (0 = Day 1). */
  day: 0,
  /** Money kept between days (earned on completed days, minus shop purchases). */
  wallet: 0,
  upgrades: { garlic: false, guard: false, ovens: 0, plates: 0 } as Upgrades,
  /** Best star count per day. */
  stars: [] as number[],
  /** Special monsters whose "new customer" card was already shown. */
  seenCards: [] as string[],
};

export function resetGame(): void {
  gameState.day = 0;
  gameState.wallet = 0;
  gameState.upgrades = { garlic: false, guard: false, ovens: 0, plates: 0 };
  gameState.stars = [];
  gameState.seenCards = [];
}

export function currentDay(): DayConfig {
  return CONFIG.days[gameState.day];
}

export function isLastDay(): boolean {
  return gameState.day >= DAY_COUNT - 1;
}

/** 0 stars = the goal was missed. */
export function starsFor(earned: number, goal: number): number {
  let stars = 0;
  CONFIG.stars.forEach((share, i) => {
    if (earned >= Math.ceil(goal * share)) stars = i + 1;
  });
  return stars;
}

/** How many oven slots the player has right now. */
export function ovenCount(): number {
  return CONFIG.oven.slots + gameState.upgrades.ovens;
}

/** How many plates the player has right now. */
export function plateCount(): number {
  return CONFIG.plates.slots + gameState.upgrades.plates;
}
