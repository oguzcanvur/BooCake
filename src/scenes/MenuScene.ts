import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, H, LAYOUT, W } from '../config';
import { MONSTERS } from '../data/monsters';
import { fadeIn, fadeOutThen } from '../fx';
import { drawCupcake } from '../objects/cupcake';
import { MonsterView } from '../objects/MonsterView';
import { Shop } from '../objects/Shop';
import { resetGame } from '../systems/GameState';
import { makeButton } from '../ui/button';

/** Main menu: the shop at night with a couple of customers and a big cupcake on the counter. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    fadeIn(this, 500);
    const shop = new Shop(this);
    shop.update(0.12);

    // two customers waiting at the counter
    const left = new MonsterView(this, LAYOUT.customerSlotsX[0], LAYOUT.customerY, MONSTERS[1]);
    const right = new MonsterView(this, LAYOUT.customerSlotsX[2], LAYOUT.customerY, MONSTERS[0]);
    for (const m of [left, right]) {
      m.root.setDepth(DEPTH.monster);
      m.enter();
    }

    // hero cupcake on the counter
    const hero = this.add.graphics().setDepth(DEPTH.counterDeco + 2);
    drawCupcake(hero, 0, 0, { bake: 'ready', frosting: 'pink', topping: 'cherry' }, 1.7);
    hero.setPosition(W / 2, LAYOUT.counterTop - 18);
    this.tweens.add({ targets: hero, y: hero.y - 8, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // soft dark band behind the title
    const band = this.add.graphics().setDepth(DEPTH.bubble);
    band.fillGradientStyle(COLORS.bg, COLORS.bg, COLORS.bg, COLORS.bg, 0, 0, 0.55, 0.55);
    band.fillRect(0, 52, W, 130);

    const title = this.add
      .text(W / 2, 112, 'BooCake', {
        fontFamily: FONT,
        fontSize: '104px',
        color: '#ffb4d9',
        fontStyle: 'bold',
        stroke: '#2b1d4f',
        strokeThickness: 14,
        shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 0, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.bubble + 1)
      .setScale(0.4)
      .setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 650, ease: 'Back.easeOut' });
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });

    this.add
      .text(W / 2, 168, 'The only bakery open at night', { fontFamily: FONT, fontSize: '26px', color: '#e4d9ff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.bubble + 1);

    makeButton(
      this,
      W / 2,
      470,
      300,
      78,
      'Play',
      () => {
        resetGame();
        fadeOutThen(this, () => this.scene.start('Night'));
      },
      { color: 'green', fontSize: 38, depth: DEPTH.hud },
    );

    this.add
      .text(W / 2, H - 26, 'Prototype v0.2  -  art & sounds by Kenney (CC0), font Fredoka (OFL)', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#9d8fd0',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }
}
