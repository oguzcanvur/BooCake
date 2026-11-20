import Phaser from 'phaser';
import { LOGO } from '../assets';
import { COLORS, DEPTH, FONT, H, LAYOUT, W } from '../config';
import { NORMAL_MONSTERS } from '../data/monsters';
import { fadeIn, fadeOutThen } from '../fx';
import { MonsterView } from '../objects/MonsterView';
import { Shop } from '../objects/Shop';
import { resetGame } from '../systems/GameState';
import { T } from '../text';
import { makeButton } from '../ui/button';

/** Main menu: the shop at night with two customers and the BooCake logo. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    fadeIn(this, 500);
    new Shop(this).update(0.12);

    // two customers waiting at the counter
    const left = new MonsterView(this, LAYOUT.customerSlotsX[0], LAYOUT.customerY, NORMAL_MONSTERS[2], { counter: true, scale: LAYOUT.customerScale });
    const right = new MonsterView(this, LAYOUT.customerSlotsX[2], LAYOUT.customerY, NORMAL_MONSTERS[0], { counter: true, scale: LAYOUT.customerScale });
    for (const m of [left, right]) {
      m.root.setDepth(DEPTH.monster);
      m.enter();
    }

    // soft dark glow behind the logo so it reads well over the shop
    const glow = this.add.graphics().setDepth(DEPTH.bubble);
    for (let i = 7; i >= 1; i--) {
      glow.fillStyle(COLORS.bg, 0.09);
      glow.fillEllipse(W / 2, 214, 300 + i * 60, 260 + i * 34);
    }

    // the game logo: pops in, then floats and sways gently
    const logo = this.add.image(W / 2, 218, LOGO).setDepth(DEPTH.bubble + 1);
    const scale = 370 / logo.height;
    logo.setScale(scale * 0.4).setAlpha(0);
    this.tweens.add({ targets: logo, scale, alpha: 1, duration: 650, ease: 'Back.easeOut' });
    this.tweens.add({ targets: logo, y: logo.y - 7, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 650 });
    this.tweens.add({ targets: logo, angle: { from: -1.2, to: 1.2 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 650 });

    this.add
      .text(W / 2, 428, T.tagline, { fontFamily: FONT, fontSize: '28px', color: '#fff1fa', fontStyle: 'bold', stroke: '#2b1d4f', strokeThickness: 7 })
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
