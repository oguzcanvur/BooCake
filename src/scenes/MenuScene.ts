import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, H, LAYOUT, W } from '../config';
import { NORMAL_MONSTERS } from '../data/monsters';
import { fadeIn, fadeOutThen } from '../fx';
import { drawCupcake } from '../objects/cupcake';
import { MonsterView } from '../objects/MonsterView';
import { Shop } from '../objects/Shop';
import { resetGame } from '../systems/GameState';
import { T } from '../text';
import { makeButton } from '../ui/button';

/** Main menu: the shop at night with two customers and a big cupcake on the counter. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    fadeIn(this, 500);
    new Shop(this).update(0.12);

    // two customers waiting at the counter
    const left = new MonsterView(this, LAYOUT.customerSlotsX[0], LAYOUT.customerY, NORMAL_MONSTERS[2]);
    const right = new MonsterView(this, LAYOUT.customerSlotsX[2], LAYOUT.customerY, NORMAL_MONSTERS[0]);
    for (const m of [left, right]) {
      m.root.setDepth(DEPTH.monster);
      m.enter();
    }

    // hero cupcake on the counter
    const hero = this.add.graphics().setDepth(DEPTH.counterDeco + 2);
    drawCupcake(hero, 0, 0, { dough: 'vanilla', bake: 'ready', tone: 0.2, frosting: 'pink', topping: 'sprinkles' }, 1.45);
    hero.setPosition(W / 2, LAYOUT.counterTop - 14);
    this.tweens.add({ targets: hero, y: hero.y - 10, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // soft dark band behind the title
    const band = this.add.graphics().setDepth(DEPTH.bubble);
    band.fillGradientStyle(COLORS.bg, COLORS.bg, COLORS.bg, COLORS.bg, 0, 0, 0.55, 0.55);
    band.fillRect(0, 60, W, 170);

    const title = this.add
      .text(W / 2, 140, 'BooCake', {
        fontFamily: FONT,
        fontSize: '130px',
        color: '#ffb4d9',
        fontStyle: 'bold',
        stroke: '#2b1d4f',
        strokeThickness: 16,
        shadow: { offsetX: 0, offsetY: 9, color: '#000000', blur: 0, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.bubble + 1)
      .setScale(0.4)
      .setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 650, ease: 'Back.easeOut' });
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });

    this.add
      .text(W / 2, 222, T.tagline, { fontFamily: FONT, fontSize: '28px', color: '#e4d9ff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.bubble + 1);

    makeButton(
      this,
      W / 2,
      500,
      340,
      86,
      T.play,
      () => {
        resetGame();
        fadeOutThen(this, () => this.scene.start('Night'));
      },
      { color: 'green', fontSize: 42, depth: DEPTH.hud },
    );
    makeButton(this, W / 2, 606, 340, 72, T.howTo, () => fadeOutThen(this, () => this.scene.start('HowTo')), {
      color: 'blue',
      fontSize: 32,
      depth: DEPTH.hud,
    });

    this.add
      .text(W / 2, H - 22, 'v0.3  -  art & sounds by Kenney (CC0), font Fredoka (OFL)', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#9d8fd0',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
  }
}
