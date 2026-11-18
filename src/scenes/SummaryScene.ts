import Phaser from 'phaser';
import { sfx } from '../audio';
import { DEPTH, FONT, H, W } from '../config';
import { burst, fadeIn, fadeOutThen } from '../fx';
import { Shop } from '../objects/Shop';
import { currentDay, gameState, isLastDay, starsFor } from '../systems/GameState';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawPanel } from '../ui/panel';
import type { DayStats } from './NightScene';

interface SummaryData {
  earned: number;
  stats: DayStats;
}

/**
 * End-of-day screen: stars pop in one by one, stats, and what to do next.
 * A day that reached its goal adds the money to the wallet (a missed day adds nothing and is replayed).
 */
export class SummaryScene extends Phaser.Scene {
  private earned = 0;
  private stats!: DayStats;

  constructor() {
    super('Summary');
  }

  init(data: SummaryData): void {
    this.earned = data.earned;
    this.stats = data.stats;
  }

  create(): void {
    fadeIn(this);
    const day = currentDay();
    const stars = starsFor(this.earned, day.goal);
    const won = stars > 0;
    if (won) {
      gameState.stars[gameState.day] = Math.max(gameState.stars[gameState.day] ?? 0, stars);
      gameState.wallet += this.earned;
    }

    new Shop(this).update(1);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0618, 0.62).setDepth(DEPTH.bubble);

    const cx = W / 2;
    const cy = H / 2 - 10;
    const panelW = 640;
    const panelH = 590;
    const panel = this.add.container(cx, cy).setDepth(DEPTH.hud);
    const g = this.add.graphics();
    drawPanel(g, panelW, panelH);
    panel.add(g);

    panel.add(
      this.add
        .text(0, -panelH / 2 + 50, won ? T.daySummaryWon(gameState.day + 1) : T.daySummaryLost, {
          fontFamily: FONT,
          fontSize: '46px',
          color: won ? '#7dffb0' : '#ff8a8a',
          fontStyle: 'bold',
          stroke: '#140d24',
          strokeThickness: 7,
        })
        .setOrigin(0.5),
    );

    // stars pop in one after another
    const starImgs: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 3; i++) {
      const s = this.add.image((i - 1) * 100, -panelH / 2 + 142 + (i === 1 ? -12 : 0), 'star_empty').setScale(1.4);
      panel.add(s);
      starImgs.push(s);
    }
    for (let i = 0; i < stars; i++) {
      this.time.delayedCall(450 + i * 420, () => {
        const s = starImgs[i];
        s.setTexture('star');
        this.tweens.add({ targets: s, scale: { from: 2.6, to: 1.4 }, angle: { from: -25, to: 0 }, duration: 420, ease: 'Back.easeOut' });
        sfx(this, 'star', 0.55, 1 + i * 0.18);
        burst(this, cx + s.x, cy + s.y, 'star_04', { count: 10, tint: 0xffe066, gravity: 80 });
      });
    }
    if (won) {
      this.time.delayedCall(300, () => sfx(this, 'win', 0.5));
      this.confetti();
    }

    const lines = [T.earned(this.earned, day.goal), T.served(this.stats.served), T.missed(this.stats.left), T.wrong(this.stats.wrong), T.burntCount(this.stats.burnt)];
    if (this.stats.stolen > 0) lines.push(`Çalınan kek: ${this.stats.stolen}`);
    if (this.stats.bites > 0) lines.push(`Isırılma: ${this.stats.bites}`);
    panel.add(
      this.add.text(0, 30, lines.join('\n'), { fontFamily: FONT, fontSize: '25px', color: '#ffffff', align: 'center', lineSpacing: 8 }).setOrigin(0.5),
    );

    const bottom = cy + panelH / 2;
    const depth = DEPTH.hud + 2;
    if (won) {
      const last = isLastDay();
      makeButton(this, cx, bottom - 100, 320, 70, last ? T.finish : T.toShop, () => this.go(last ? 'Final' : 'UpgradeShop'), { color: 'green', depth, fontSize: 32 });
    } else {
      makeButton(this, cx, bottom - 100, 320, 70, T.retry, () => this.go('Night'), { color: 'red', depth, fontSize: 32 });
    }
    makeButton(this, cx, bottom - 36, 220, 52, T.menu, () => this.go('Menu'), { color: 'grey', tint: 0xb9a8ff, depth, fontSize: 22 });
  }

  private go(scene: string): void {
    fadeOutThen(this, () => this.scene.start(scene));
  }

  /** A shower of stars from the top of the screen. */
  private confetti(): void {
    const emitter = this.add
      .particles(0, -20, 'fx_star_01', {
        x: { min: 0, max: W },
        speedY: { min: 80, max: 200 },
        speedX: { min: -40, max: 40 },
        lifespan: 3600,
        frequency: 70,
        quantity: 1,
        scale: { start: 0.24, end: 0.08 },
        alpha: { start: 1, end: 0.2 },
        rotate: { min: 0, max: 360 },
        tint: [0xffe066, 0xff8fc7, 0x8fffd0, 0xb98cff],
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.bubble + 1);
    this.time.delayedCall(2600, () => emitter.stop());
    this.time.delayedCall(6500, () => emitter.destroy());
  }
}
