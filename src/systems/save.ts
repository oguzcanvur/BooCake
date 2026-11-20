import { decor } from '../data/decor';
import { gameState } from './GameState';

// Progress is kept in the browser (localStorage), so closing the page does not send the player back to day 1.
// It is saved at day boundaries (end-of-day summary, shop purchases, next day) and when the decoration changes.
// A day that was in progress when the page closed starts again from its beginning.

const KEY = 'boocake-save-v1';

/** Where "Continue" picks up: the start of the current day, or the shop between two days. */
export type ResumeAt = 'night' | 'shop';

export const progress = {
  resumeAt: 'night' as ResumeAt,
  /** All 4 days were completed (the final screen was reached). */
  finished: false,
};

export function saveGame(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ gameState, decor, progress }));
  } catch {
    // storage blocked (private window, file settings): the game still works, it just forgets on reload
  }
}

/** Load the saved progress, if any. Called once at start-up. */
export function loadGame(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Partial<{ gameState: typeof gameState; decor: typeof decor; progress: typeof progress }>;
    if (data.gameState) {
      Object.assign(gameState, data.gameState);
      // an older save may lack newer upgrades (plates): fill them in
      const saved: Partial<typeof gameState.upgrades> = data.gameState.upgrades ?? {};
      gameState.upgrades = { garlic: false, guard: false, ovens: 0, plates: 0, ...saved };
    }
    if (data.decor) Object.assign(decor, data.decor);
    if (data.progress) Object.assign(progress, data.progress);
  } catch {
    // a broken save is ignored (the game starts fresh)
  }
}

/** Is there a game to continue (started, not finished)? */
export function canContinue(): boolean {
  return !progress.finished && (gameState.day > 0 || progress.resumeAt === 'shop');
}
