import Phaser from 'phaser';
import { DEPTH, FONT, H, W } from '../config';
import { SPECIAL_MONSTERS } from '../data/monsters';
import { fadeIn, fadeOutThen } from '../fx';
import { drawCupcake, type CupcakeData } from '../objects/cupcake';
import { MonsterView } from '../objects/MonsterView';
import { Shop } from '../objects/Shop';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawPanel } from '../ui/panel';

/** "Nasıl Oynanır": four short steps, each with a picture. */
export class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  create(): void {
    fadeIn(this);
    new Shop(this).update(0.3);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0618, 0.7).setDepth(DEPTH.bubble);

    const panelW = 1020;
    const panelH = 560;
    const panel = this.add.container(W / 2, H / 2 - 20).setDepth(DEPTH.hud);
    const g = this.add.graphics();
    drawPanel(g, panelW, panelH);
    panel.add(g);
    panel.add(
      this.add
        .text(0, -panelH / 2 + 48, T.howToTitle, { fontFamily: FONT, fontSize: '46px', color: '#ffb4d9', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 7 })
        .setOrigin(0.5),
    );

    // a picture for each step
    const raw: CupcakeData = { dough: 'chocolate', bake: 'raw', tone: 0 };
    const baked: CupcakeData = { dough: 'vanilla', bake: 'ready', tone: 0.3 };
    const done: CupcakeData = { dough: 'strawberry', bake: 'ready', tone: 0.2, frosting: 'mint', topping: 'sprinkles' };
    const top = -panelH / 2 + 110;
    const rowH = 100;

    T.howToSteps.forEach((text, i) => {
      const y = top + i * rowH + rowH / 2;
      const row = this.add.graphics();
      row.fillStyle(0x000000, 0.18);
      row.fillRoundedRect(-panelW / 2 + 28, y - rowH / 2 + 6, panelW - 56, rowH - 12, 18);
      panel.add(row);

      // number badge
      const badge = this.add.graphics();
      badge.fillStyle(0xff8fc7, 1);
      badge.fillCircle(-panelW / 2 + 76, y, 26);
      panel.add(badge);
      panel.add(this.add.text(-panelW / 2 + 76, y - 1, String(i + 1), { fontFamily: FONT, fontSize: '30px', color: '#2b1d4f', fontStyle: 'bold' }).setOrigin(0.5));

      // picture
      const pic = this.add.graphics();
      panel.add(pic);
      const px = -panelW / 2 + 172;
      if (i === 0) {
        drawCupcake(pic, px, y + 4, raw, 0.9);
        drawCupcake(pic, px + 64, y + 4, baked, 0.9);
      } else if (i === 1) {
        drawCupcake(pic, px, y + 6, baked, 0.9);
        drawCupcake(pic, px + 64, y + 6, done, 0.9);
      } else if (i === 2) {
        drawCupcake(pic, px + 32, y + 6, done, 1);
      } else {
        const vamp = new MonsterView(this, 0, 0, SPECIAL_MONSTERS.vampire);
        const thief = new MonsterView(this, 0, 0, SPECIAL_MONSTERS.thief);
        panel.add([vamp.root, thief.root]);
        vamp.root.setPosition(px, y - 12).setScale(0.36);
        thief.root.setPosition(px + 72, y - 18).setScale(0.3);
      }

      panel.add(
        this.add
          .text(-panelW / 2 + 270, y, text, { fontFamily: FONT, fontSize: '23px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: panelW - 340 } })
          .setOrigin(0, 0.5),
      );
    });

    makeButton(this, W / 2, H / 2 + panelH / 2 + 10, 260, 66, T.back, () => fadeOutThen(this, () => this.scene.start('Menu')), {
      color: 'blue',
      fontSize: 30,
      depth: DEPTH.hud + 2,
    });
  }
}
