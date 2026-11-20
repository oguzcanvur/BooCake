import Phaser from 'phaser';
import { LOGO } from '../assets';
import { sfx } from '../audio';
import { DEPTH, FONT, H, W } from '../config';
import { DAY_COUNT } from '../data/gameConfig';
import { fadeIn, fadeOutThen } from '../fx';
import { Shop } from '../objects/Shop';
import { gameState, resetGame } from '../systems/GameState';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawStar } from '../ui/icons';
import { drawPanel } from '../ui/panel';

/** Shown after day 4: "You won! BooCake is the best monster bakery in town!" */
export class FinalScene extends Phaser.Scene {
  constructor() {
    super('Final');
  }

  create(): void {
    fadeIn(this, 600);
    new Shop(this).update(1);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0618, 0.55).setDepth(DEPTH.bubble);
    sfx(this, 'win', 0.6);

    const cy = H / 2 - 30;
    const panel = this.add.container(W / 2, cy).setDepth(DEPTH.hud);
    const g = this.add.graphics();
    drawPanel(g, 860, 470);
    panel.add(g);
    const title = this.add
      .text(0, -92, T.finalTitle, { fontFamily: FONT, fontSize: '76px', color: '#ffd166', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 12 })
      .setOrigin(0.5);
    panel.add(title);
    panel.add(
      this.add
        .text(0, -14, T.finalText, { fontFamily: FONT, fontSize: '36px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: 760 } })
        .setOrigin(0.5),
    );

    // the game logo sits on the top edge of the panel
    const logo = this.add.image(W / 2, cy - 236, LOGO).setDepth(DEPTH.hud + 1);
    const logoScale = 170 / logo.height;
    logo.setScale(logoScale * 0.5);
    this.tweens.add({ targets: logo, scale: logoScale, duration: 650, ease: 'Back.easeOut' });
    this.tweens.add({ targets: logo, y: logo.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 650 });

    // stars earned over all days
    let total = 0;
    for (let d = 0; d < DAY_COUNT; d++) total += gameState.stars[d] ?? 0;
    const row = this.add.container(0, 80);
    panel.add(row);
    for (let d = 0; d < DAY_COUNT; d++) {
      // one star per day: gold if the day was completed
      const s = this.add.graphics().setPosition((d - (DAY_COUNT - 1) / 2) * 90, 0);
      drawStar(s, 0, 0, 26, (gameState.stars[d] ?? 0) > 0, 3);
      s.setAlpha(0);
      row.add(s);
      this.tweens.add({ targets: s, alpha: 1, scale: { from: 1.8, to: 1 }, delay: 500 + d * 250, duration: 350, ease: 'Back.easeOut' });
      row.add(this.add.text((d - (DAY_COUNT - 1) / 2) * 90, 36, `${gameState.stars[d] ?? 0}/3`, { fontFamily: FONT, fontSize: '18px', color: '#c9bdf0', fontStyle: 'bold' }).setOrigin(0.5));
    }
    panel.add(this.add.text(0, 150, `${total}/${DAY_COUNT * 3}`, { fontFamily: FONT, fontSize: '26px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5));

    this.tweens.add({ targets: title, scale: { from: 0.7, to: 1 }, duration: 600, ease: 'Back.easeOut' });
    this.confetti();

    makeButton(this, W / 2 - 170, cy + 235 + 40, 300, 66, T.playAgain, () => {
      resetGame();
      fadeOutThen(this, () => this.scene.start('Night'));
    }, { color: 'green', fontSize: 30, depth: DEPTH.hud + 2 });
    makeButton(this, W / 2 + 170, cy + 235 + 40, 300, 66, T.menu, () => fadeOutThen(this, () => this.scene.start('Menu')), {
      color: 'blue',
      fontSize: 30,
      depth: DEPTH.hud + 2,
    });
  }

  private confetti(): void {
    this.add
      .particles(0, -20, 'fx_star_01', {
        x: { min: 0, max: W },
        speedY: { min: 90, max: 220 },
        speedX: { min: -50, max: 50 },
        lifespan: 4200,
        frequency: 45,
        quantity: 1,
        scale: { start: 0.26, end: 0.08 },
        alpha: { start: 1, end: 0.2 },
        rotate: { min: 0, max: 360 },
        tint: [0xffe066, 0xff8fc7, 0x8fffd0, 0xb98cff],
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.bubble + 1);
  }
}
