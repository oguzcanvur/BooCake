import Phaser from 'phaser';
import { sfx } from '../audio';
import { COLORS, DEPTH, FONT, H, W } from '../config';
import { NIGHTS } from '../data/nights';
import { burst, fadeIn, fadeOutThen } from '../fx';
import { Shop } from '../objects/Shop';
import { gameState, resetGame, starsFor } from '../systems/GameState';
import { makeButton } from '../ui/button';
import type { NightStats } from './NightScene';

interface ResultData {
  money: number;
  stats: NightStats;
}

/** End-of-night screen: stars pop in one by one, stats, and what to do next. */
export class ResultScene extends Phaser.Scene {
  private money = 0;
  private stats!: NightStats;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.money = data.money;
    this.stats = data.stats;
  }

  create(): void {
    fadeIn(this);
    const cfg = NIGHTS[gameState.night];
    const stars = starsFor(this.money, cfg);
    const won = stars > 0;
    if (won) gameState.stars[gameState.night] = Math.max(gameState.stars[gameState.night] ?? 0, stars);
    const isLast = gameState.night >= NIGHTS.length - 1;

    new Shop(this).update(1);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0618, 0.62).setDepth(DEPTH.bubble);

    const cx = W / 2;
    const cy = H / 2;
    const panel = this.add.container(cx, cy).setDepth(DEPTH.hud);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(-290, -246, 580, 510, 28);
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(-290, -256, 580, 510, 28);
    g.fillStyle(0xffffff, 0.08);
    g.fillRoundedRect(-290, -256, 580, 84, { tl: 28, tr: 28, bl: 0, br: 0 });
    panel.add(g);

    panel.add(
      this.add
        .text(0, -212, won ? `${cfg.name} complete!` : 'Not enough money...', {
          fontFamily: FONT,
          fontSize: '46px',
          color: won ? '#7dffb0' : '#ff8a8a',
          fontStyle: 'bold',
          stroke: '#140d24',
          strokeThickness: 7,
        })
        .setOrigin(0.5),
    );

    // stars (they pop in one after another)
    const starImgs: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 3; i++) {
      const s = this.add.image((i - 1) * 96, -142 + (i === 1 ? -10 : 0), 'star_empty').setScale(1.35);
      panel.add(s);
      starImgs.push(s);
    }
    for (let i = 0; i < stars; i++) {
      this.time.delayedCall(450 + i * 420, () => {
        const s = starImgs[i];
        s.setTexture('star');
        this.tweens.add({ targets: s, scale: { from: 2.6, to: 1.35 }, angle: { from: -25, to: 0 }, duration: 420, ease: 'Back.easeOut' });
        sfx(this, 'star', 0.55, 1 + i * 0.18);
        burst(this, cx + s.x, cy + s.y, 'star_04', { count: 10, tint: 0xffe066, gravity: 80 });
      });
    }
    if (won) {
      this.time.delayedCall(300, () => sfx(this, 'win', 0.5));
      this.confetti();
    }

    const lines = [
      `Earned  $${this.money}   (goal $${cfg.goal})`,
      `Served correctly:  ${this.stats.served}`,
      `Wrong cupcakes:  ${this.stats.wrong}`,
      `Customers who left:  ${this.stats.left}`,
      `Burnt cupcakes:  ${this.stats.burnt}`,
    ];
    panel.add(
      this.add
        .text(0, 10, lines.join('\n'), { fontFamily: FONT, fontSize: '24px', color: '#ffffff', align: 'center', lineSpacing: 8 })
        .setOrigin(0.5),
    );

    const by = cy;
    if (won && !isLast) {
      makeButton(this, cx, by + 128, 300, 68, 'Next night', () => this.go(() => (gameState.night++, 'Night')), { color: 'green', depth: DEPTH.hud + 2 });
      makeButton(this, cx - 130, by + 205, 230, 56, 'Replay night', () => this.go(() => 'Night'), { color: 'grey', tint: 0xb9a8ff, fontSize: 22, depth: DEPTH.hud + 2 });
      makeButton(this, cx + 130, by + 205, 230, 56, 'Menu', () => this.go(() => 'Menu'), { color: 'grey', tint: 0xb9a8ff, fontSize: 22, depth: DEPTH.hud + 2 });
    } else if (won) {
      panel.add(
        this.add
          .text(0, 112, 'That is all the nights in the prototype.\nMore are coming!', {
            fontFamily: FONT,
            fontSize: '20px',
            color: '#c9bdf0',
            align: 'center',
          })
          .setOrigin(0.5),
      );
      makeButton(this, cx - 130, by + 205, 230, 56, 'Play again', () => this.go(() => (resetGame(), 'Night')), { color: 'green', fontSize: 22, depth: DEPTH.hud + 2 });
      makeButton(this, cx + 130, by + 205, 230, 56, 'Menu', () => this.go(() => 'Menu'), { color: 'grey', tint: 0xb9a8ff, fontSize: 22, depth: DEPTH.hud + 2 });
    } else {
      makeButton(this, cx, by + 128, 300, 68, 'Try again', () => this.go(() => 'Night'), { color: 'red', depth: DEPTH.hud + 2 });
      makeButton(this, cx, by + 205, 230, 56, 'Menu', () => this.go(() => 'Menu'), { color: 'grey', tint: 0xb9a8ff, fontSize: 22, depth: DEPTH.hud + 2 });
    }
  }

  /** Fade out, run the side effect (it returns the next scene key), then switch scene. */
  private go(next: () => string): void {
    fadeOutThen(this, () => this.scene.start(next()));
  }

  /** A shower of stars from the top of the screen. */
  private confetti(): void {
    const emitter = this.add
      .particles(0, -20, 'fx_star_01', {
        x: { min: 0, max: W },
        speedY: { min: 80, max: 200 },
        speedX: { min: -40, max: 40 },
        lifespan: 3200,
        frequency: 70,
        quantity: 1,
        scale: { start: 0.22, end: 0.08 },
        alpha: { start: 1, end: 0.2 },
        rotate: { min: 0, max: 360 },
        tint: [0xffe066, 0xff8fc7, 0x8fffd0, 0xb98cff],
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.bubble + 1);
    this.time.delayedCall(2600, () => emitter.stop());
    this.time.delayedCall(6000, () => emitter.destroy());
  }
}
