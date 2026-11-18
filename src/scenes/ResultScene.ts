import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../config';
import { NIGHTS } from '../data/nights';
import { gameState, resetGame, starsFor } from '../systems/GameState';
import { makeButton } from '../ui/button';
import type { NightStats } from './NightScene';

interface ResultData {
  money: number;
  stats: NightStats;
}

/** End-of-night screen: stars, stats, and what to do next. */
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
    const cfg = NIGHTS[gameState.night];
    const stars = starsFor(this.money, cfg);
    const won = stars > 0;
    if (won) gameState.stars[gameState.night] = Math.max(gameState.stars[gameState.night] ?? 0, stars);
    const isLast = gameState.night >= NIGHTS.length - 1;

    this.add.rectangle(W / 2, H / 2, W, H, COLORS.wall);

    this.add
      .text(W / 2, 90, won ? `${cfg.name} complete!` : 'Not enough money...', {
        fontFamily: FONT,
        fontSize: '52px',
        color: won ? '#7dffb0' : '#ff6b6b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 170, '★'.repeat(stars) + '☆'.repeat(3 - stars), {
        fontFamily: FONT,
        fontSize: '64px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    const lines = [
      `Earned $${this.money}   (goal $${cfg.goal})`,
      `Served correctly: ${this.stats.served}`,
      `Wrong cupcakes: ${this.stats.wrong}`,
      `Customers who left: ${this.stats.left}`,
      `Burnt cupcakes: ${this.stats.burnt}`,
    ];
    this.add
      .text(W / 2, 320, lines.join('\n'), {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    if (won && !isLast) {
      makeButton(this, W / 2, 470, 260, 64, 'Next night', () => {
        gameState.night++;
        this.scene.start('Night');
      });
      makeButton(this, W / 2 - 140, 550, 240, 54, 'Replay night', () => this.scene.start('Night'), 0x5a4a8a);
      makeButton(this, W / 2 + 140, 550, 240, 54, 'Menu', () => this.scene.start('Menu'), 0x5a4a8a);
    } else if (won) {
      this.add
        .text(W / 2, 450, 'That is all the nights in the prototype.\nMore are coming!', {
          fontFamily: FONT,
          fontSize: '22px',
          color: '#cdb4db',
          align: 'center',
        })
        .setOrigin(0.5);
      makeButton(this, W / 2 - 140, 550, 240, 54, 'Play again', () => {
        resetGame();
        this.scene.start('Night');
      });
      makeButton(this, W / 2 + 140, 550, 240, 54, 'Menu', () => this.scene.start('Menu'), 0x5a4a8a);
    } else {
      makeButton(this, W / 2, 470, 260, 64, 'Try again', () => this.scene.start('Night'));
      makeButton(this, W / 2, 550, 240, 54, 'Menu', () => this.scene.start('Menu'), 0x5a4a8a);
    }
  }
}
