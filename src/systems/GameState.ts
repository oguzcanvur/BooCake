import { CONFIG, NIGHT_COUNT, type NightConfig } from '../data/gameConfig';
import { progress, saveGame } from './save';

export interface Upgrades {
  garlic: boolean;
  guard: boolean;
  /** Extra ovens bought in the shop (0..MAX_EXTRA_OVENS). */
  ovens: number;
  /** Extra plates bought in the shop (0..MAX_EXTRA_PLATES). */
  plates: number;
}

/** The best results on one campaign night. */
export interface NightRecord {
  /** Best star count (0 = never reached the goal). */
  stars: number;
  /** Most money earned in one try. */
  bestMoney: number;
  /** Longest run of correct cupcakes in a row (no wrong cupcake, no customer lost). */
  bestStreak: number;
  /** Money this night has put in the wallet so far (it never pays twice for the same result). */
  paid: number;
}

/** The shop sells this many extra ovens (1 at the start + 1 = 2 ovens). */
export const MAX_EXTRA_OVENS = 1;
/** The shop sells this many extra plates (2 at the start + 2 = 4 plates). */
export const MAX_EXTRA_PLATES = 2;

export const emptyRecord = (): NightRecord => ({ stars: 0, bestMoney: 0, bestStreak: 0, paid: 0 });

/** Campaign progress (kept in the browser by systems/save.ts). */
export const gameState = {
  /** The night being played (or just played), index into CONFIG.nights (0 = Night 1). */
  day: 0,
  /** The furthest night that is open on the map (nights open one after another). */
  unlocked: 0,
  /** Money kept between nights (earned on cleared nights, minus shop purchases). */
  wallet: 0,
  upgrades: { garlic: false, guard: false, ovens: 0, plates: 0 } as Upgrades,
  /** Best results per night. */
  records: [] as NightRecord[],
  /** Intro cards already shown (special monsters, new flavors, the first-order guide). */
  seenCards: [] as string[],
};

export function resetGame(): void {
  progress.resumeAt = 'night';
  progress.finished = false;
  gameState.day = 0;
  gameState.unlocked = 0;
  gameState.wallet = 0;
  gameState.upgrades = { garlic: false, guard: false, ovens: 0, plates: 0 };
  gameState.records = [];
  gameState.seenCards = [];
  saveGame();
}

export function currentNight(): NightConfig {
  return CONFIG.nights[gameState.day];
}

export function isLastNight(): boolean {
  return gameState.day >= NIGHT_COUNT - 1;
}

export function record(i: number): NightRecord {
  return gameState.records[i] ?? emptyRecord();
}

/** Best stars on a night (0 = not cleared yet). */
export function nightStars(i: number): number {
  return record(i).stars;
}

/** 0 stars = the goal was missed. */
export function starsFor(earned: number, goal: number): number {
  let stars = 0;
  CONFIG.stars.forEach((share, i) => {
    if (earned >= Math.ceil(goal * share)) stars = i + 1;
  });
  return stars;
}

/** What one finished try changed: money paid into the wallet and the new records. */
export interface NightResult {
  stars: number;
  /** Money added to the wallet now (0 on a replay that did not beat the star record). */
  paid: number;
  firstClear: boolean;
  newStars: boolean;
  newMoney: boolean;
  newStreak: boolean;
  /** Stars gained compared with the old record (for the decoration stars). */
  starsGained: number;
}

/**
 * Store a finished try of night `i`. Money goes to the wallet only on the first clear, or when the star record is
 * beaten (then only the part above what this night already paid), so replaying an easy night cannot farm money.
 */
export function finishNight(i: number, earned: number, bestStreak: number): NightResult {
  const old = record(i);
  const stars = starsFor(earned, CONFIG.nights[i].goal);
  const rec: NightRecord = { ...old };
  let paid = 0;
  const firstClear = stars > 0 && old.stars === 0;
  const newStars = stars > old.stars;
  if (firstClear) paid = earned;
  else if (newStars) paid = Math.max(0, earned - old.paid);
  rec.paid = old.paid + paid;
  rec.stars = Math.max(old.stars, stars);
  rec.bestMoney = Math.max(old.bestMoney, earned);
  rec.bestStreak = Math.max(old.bestStreak, bestStreak);
  gameState.records[i] = rec;
  gameState.wallet += paid;
  // garlic and the guard work for one night only: after the night they are used up and must be bought again
  gameState.upgrades.garlic = false;
  gameState.upgrades.guard = false;
  if (stars > 0) gameState.unlocked = Math.min(NIGHT_COUNT - 1, Math.max(gameState.unlocked, i + 1));
  return {
    stars,
    paid,
    firstClear,
    newStars: newStars && !firstClear,
    newMoney: old.bestMoney > 0 && earned > old.bestMoney,
    newStreak: old.bestStreak > 0 && bestStreak > old.bestStreak,
    starsGained: Math.max(0, stars - old.stars),
  };
}

/** How many oven slots the player has right now. */
export function ovenCount(): number {
  return CONFIG.oven.slots + gameState.upgrades.ovens;
}

/** How many plates the player has right now. */
export function plateCount(): number {
  return CONFIG.plates.slots + gameState.upgrades.plates;
}
