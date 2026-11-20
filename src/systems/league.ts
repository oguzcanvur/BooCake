import { CONFIG, type SpecialVisit } from '../data/gameConfig';
import { between, dailySeed, stream } from './rng';

// Midnight League: a replayable 2-minute race with the same kitchen for everyone. The seed decides the customers,
// their orders and the special monster times, so the same seed is the same challenge for every player.
// Scores are kept only in this browser. An online leaderboard could later send { seed, score, breakdown } to a
// server (one table per seed); nothing else in the game would need to change.

export const league = {
  /** Best score ever in this browser. */
  best: 0,
  /** Best score per seed (seed -> score), so "today's challenge" has its own record. */
  bySeed: {} as Record<string, number>,
};

/** How many seeds are remembered (older ones are dropped). */
const KEEP_SEEDS = 30;

/** The seed of the challenge the player gets now (today's date: everyone on the same day races the same night). */
export function leagueSeed(): number {
  return dailySeed();
}

/** Random streams of one league run. Each purpose has its own stream so one never shifts the other. */
export const LEAGUE_STREAM = { customers: 1, orders: 2, seats: 3, gaps: 4, specials: 5 } as const;

/** The special monster times for a seed (one visit inside each planned window). */
export function leagueSpecials(seed: number): SpecialVisit[] {
  const rand = stream(seed, LEAGUE_STREAM.specials);
  return CONFIG.league.specials.map((w) => ({ id: w.id, at: Math.round(between(rand, w.from, w.to)) }));
}

export interface ScoreInput {
  earned: number;
  happy: number;
  bestStreak: number;
  lost: number;
  burnt: number;
}

export interface ScoreParts {
  money: number;
  happy: number;
  streak: number;
  lost: number;
  burnt: number;
  total: number;
}

/** Score = money x 100 + happy serves bonus + streak bonus - lost customers - burnt cakes (never below 0). */
export function leagueScore(s: ScoreInput): ScoreParts {
  const k = CONFIG.league.score;
  const parts = {
    money: s.earned * k.perDollar,
    happy: s.happy * k.happyServe,
    streak: s.bestStreak * k.streak,
    lost: s.lost * k.lost,
    burnt: s.burnt * k.burnt,
  };
  return { ...parts, total: Math.max(0, parts.money + parts.happy + parts.streak - parts.lost - parts.burnt) };
}

/** Store a finished run; returns the previous best for this seed and whether this run beat it. */
export function submitLeagueScore(seed: number, score: number): { prevSeedBest: number; newSeedBest: boolean; newBest: boolean } {
  const key = String(seed);
  const prevSeedBest = league.bySeed[key] ?? 0;
  const newSeedBest = score > prevSeedBest;
  const newBest = score > league.best;
  if (newSeedBest) league.bySeed[key] = score;
  if (newBest) league.best = score;
  // keep only the most recent seeds
  const keys = Object.keys(league.bySeed).sort((a, b) => Number(b) - Number(a));
  for (const old of keys.slice(KEEP_SEEDS)) delete league.bySeed[old];
  return { prevSeedBest, newSeedBest, newBest };
}
