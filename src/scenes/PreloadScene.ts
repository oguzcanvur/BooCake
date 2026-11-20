import Phaser from 'phaser';
import { COLORS, H, W } from '../config';
import { LOGO, queueAssets } from '../assets';
import { applySavedMute } from '../audio';
import { startMusic } from '../music';
import { fadeOutThen, setupCamera } from '../fx';

/** How long the opening logo stays on screen at least (loading is usually faster than this). */
const MIN_SPLASH_MS = 1700;

/** Opening screen: the BooCake logo with a soft glow and a progress bar while every asset loads, then the menu. */
export class PreloadScene extends Phaser.Scene {
  private shownAt = 0;

  constructor() {
    super('Preload');
  }

  preload(): void {
    setupCamera(this);
    this.shownAt = this.time.now;
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.bg);

    // soft round glow behind the logo, gently breathing
    const glow = this.add.graphics();
    for (let i = 8; i >= 1; i--) {
      glow.fillStyle(0x8a5cc8, 0.05);
      glow.fillCircle(0, 0, 70 + i * 34);
    }
    glow.setPosition(W / 2, H / 2 - 30);
    this.tweens.add({ targets: glow, scale: { from: 0.94, to: 1.06 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const logo = this.add.image(W / 2, H / 2 - 30, LOGO);
    const scale = 470 / logo.height;
    logo.setScale(scale * 0.5).setAlpha(0);
    this.tweens.add({ targets: logo, scale, alpha: 1, duration: 700, ease: 'Back.easeOut' });
    this.tweens.add({ targets: logo, y: logo.y - 8, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });

    const barW = 320;
    const barY = H - 70;
    this.add.rectangle(W / 2, barY, barW + 6, 18, 0x1d1230).setOrigin(0.5);
    const fill = this.add.rectangle(W / 2 - barW / 2, barY, 2, 12, COLORS.pink).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => fill.setSize(Math.max(2, barW * p), 12));

    // Every asset is an embedded data URI. Above Phaser's default of 32 parallel files the loader stalled
    // after the first batch, so all of them are started at once.
    this.load.maxParallelDownloads = 256;
    queueAssets(this);
  }

  create(): void {
    applySavedMute(this);
    startMusic(this);
    // Make sure the web font is ready before any text is drawn, so the first screen looks right.
    const fonts = [document.fonts.load('600 24px Fredoka'), document.fonts.load('700 24px Fredoka')];
    void Promise.allSettled(fonts).then(() => {
      const wait = Math.max(0, MIN_SPLASH_MS - (this.time.now - this.shownAt));
      this.time.delayedCall(wait, () => fadeOutThen(this, () => this.scene.start('Menu'), 400));
    });
  }
}
