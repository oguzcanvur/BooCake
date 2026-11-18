import type { NightConfig } from '../data/nights';

// Global progress that survives scene changes.
export const gameState = {
  /** Index into NIGHTS (0 = Night 1). */
  night: 0,
  /** Best star count per night. */
  stars: [] as number[],
};

export function resetGame(): void {
  gameState.night = 0;
  gameState.stars = [];
}

/** 0 stars = failed the night. */
export function starsFor(money: number, cfg: NightConfig): number {
  let stars = 0;
  cfg.starMultipliers.forEach((mult, i) => {
    if (money >= Math.ceil(cfg.goal * mult)) stars = i + 1;
  });
  return stars;
}
