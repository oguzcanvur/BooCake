import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../config';
import { resetGame } from '../systems/GameState';
import { makeButton } from '../ui/button';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.wall);

    this.add
      .text(W / 2, 190, 'BooCake', {
        fontFamily: FONT,
        fontSize: '110px',
        color: '#ffb4d9',
        fontStyle: 'bold',
        stroke: '#140d24',
        strokeThickness: 12,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 290, 'The only bakery open at night', { fontFamily: FONT, fontSize: '26px', color: '#cdb4db' })
      .setOrigin(0.5);

    makeButton(this, W / 2, 410, 240, 70, 'Play', () => {
      resetGame();
      this.scene.start('Night');
    });

    this.add
      .text(W / 2, H - 30, 'Prototype v0.1 - gray-box art', { fontFamily: FONT, fontSize: '14px', color: '#8e7fc0' })
      .setOrigin(0.5);
  }
}
