import Phaser from 'phaser';
import { COLORS, FONT, H, W } from '../config';
import { queueAssets } from '../assets';
import { applySavedMute } from '../audio';

/** Loads every asset behind a small progress bar, then opens the menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.bg);
    this.add
      .text(W / 2, H / 2 - 40, 'BooCake', { fontFamily: FONT, fontSize: '56px', color: '#ffb4d9', fontStyle: 'bold' })
      .setOrigin(0.5);

    const barW = 320;
    const track = this.add.rectangle(W / 2, H / 2 + 30, barW, 14, 0x3a2a63).setOrigin(0.5);
    const fill = this.add.rectangle(W / 2 - barW / 2, H / 2 + 30, 2, 14, COLORS.pink).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => fill.setSize(Math.max(2, barW * p), 14));
    this.load.once('complete', () => track.setAlpha(1));

    queueAssets(this);
  }

  create(): void {
    applySavedMute(this);
    // Make sure the web font is ready before any text is drawn, so the first screen looks right.
    const fonts = [document.fonts.load('600 24px Fredoka'), document.fonts.load('700 24px Fredoka')];
    void Promise.allSettled(fonts).then(() => this.scene.start('Menu'));
  }
}
