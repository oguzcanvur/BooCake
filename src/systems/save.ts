import { decor } from '../data/decor';
import { CONFIG, NIGHT_COUNT } from '../data/gameConfig';
import { emptyRecord, gameState, type NightRecord, type Upgrades } from './GameState';
import { league } from './league';

// Progress is kept in the browser (localStorage), so closing the page does not send the player back to night 1.
// It is saved at night boundaries (summary, shop purchases, next night), when the decoration changes and after
// a league run. A night that was in progress when the page closed starts again from its beginning.
//
// Version 2 (5 nights, records per night, league scores) uses its own key. An older version-1 save (4 days) is
// read once and turned into version 2: the wallet, upgrades, decorations and cleared days are kept.

const KEY = 'boocake-save-v2';
const OLD_KEY = 'boocake-save-v1';
const VERSION = 2;

/** Where "Continue" picks up: the map (start of a night), or the shop between two nights. */
export type ResumeAt = 'night' | 'shop';

export const progress = {
  resumeAt: 'night' as ResumeAt,
  /** All nights were cleared (the final screen was reached). */
  finished: false,
};

export function saveGame(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, gameState, decor, progress, league }));
  } catch {
    // storage blocked (private window, file settings): the game still works, it just forgets on reload
  }
}

type SavedState = Partial<{
  day: number;
  unlocked: number;
  wallet: number;
  upgrades: Partial<Upgrades>;
  records: Partial<NightRecord>[];
  stars: number[];
  seenCards: string[];
}>;

interface SaveData {
  version?: number;
  gameState?: SavedState;
  decor?: typeof decor;
  progress?: Partial<typeof progress>;
  league?: Partial<typeof league>;
}

/** Load the saved progress, if any (a version-1 save is converted). Called once at start-up. */
export function loadGame(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      apply(JSON.parse(raw) as SaveData);
      return;
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      apply(migrateV1(JSON.parse(old) as SaveData));
      saveGame();
    }
  } catch {
    // a broken save is ignored (the game starts fresh)
  }
}

function apply(data: SaveData): void {
  const s = data.gameState;
  if (s) {
    const clamp = (n: unknown) => Math.max(0, Math.min(NIGHT_COUNT - 1, Math.floor(Number(n) || 0)));
    gameState.day = clamp(s.day);
    gameState.unlocked = Math.max(clamp(s.unlocked), gameState.day);
    gameState.wallet = Math.max(0, Number(s.wallet) || 0);
    gameState.upgrades = { garlic: false, guard: false, ovens: 0, plates: 0, ...(s.upgrades ?? {}) };
    gameState.records = (s.records ?? []).slice(0, NIGHT_COUNT).map((r) => ({ ...emptyRecord(), ...(r ?? {}) }));
    gameState.seenCards = Array.isArray(s.seenCards) ? s.seenCards : [];
  }
  if (data.decor) Object.assign(decor, data.decor);
  if (data.progress) Object.assign(progress, data.progress);
  if (data.league) {
    league.best = Number(data.league.best) || 0;
    league.bySeed = { ...(data.league.bySeed ?? {}) };
  }
}

/**
 * Version 1 had 4 days and one star list. Cleared days become cleared nights (with the money already paid, so a
 * replay does not pay them again); the next night after the last cleared one is open.
 */
function migrateV1(v1: SaveData): SaveData {
  const s = v1.gameState ?? {};
  const stars = Array.isArray(s.stars) ? s.stars : [];
  const records: NightRecord[] = stars.slice(0, NIGHT_COUNT).map((n, i) => {
    const goal = CONFIG.nights[i].goal;
    return n > 0 ? { ...emptyRecord(), stars: n, bestMoney: goal, paid: goal } : emptyRecord();
  });
  const cleared = records.filter((r) => r.stars > 0).length;
  const day = Number(s.day) || 0;
  const reached = Math.min(NIGHT_COUNT - 1, Math.max(cleared, day + (v1.progress?.resumeAt === 'shop' ? 1 : 0)));
  return {
    version: VERSION,
    gameState: {
      day: reached,
      unlocked: reached,
      wallet: s.wallet,
      upgrades: s.upgrades,
      records,
      // the guide and flavor cards keep their "already seen" marks; old day-based flavor cards are harmless
      seenCards: s.seenCards,
    },
    decor: v1.decor,
    // the old final screen meant 4 days; the 5th night is new, so the campaign is open again
    progress: { resumeAt: 'night', finished: false },
  };
}

/** Is there a game to continue (started, not finished)? */
export function canContinue(): boolean {
  return !progress.finished && (gameState.unlocked > 0 || gameState.records.length > 0 || progress.resumeAt === 'shop');
}
