import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, INK, W } from '../config';
import { CONFIG } from '../data/gameConfig';
import { isMuted, setMuted, sfx } from '../audio';
import { T } from '../text';
import { drawClock, drawCoin, drawMoon, drawPause, drawPill, drawSpeaker, drawStar } from './icons';

const BAR = { x: 676, y: 17, w: 380, h: 22 };
const PANEL = 0x4a3266;

/** Top bar: day, time left, money with an animated progress bar and star markers, pause and sound buttons. */
export class Hud {
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly moneyText: Phaser.GameObjects.Text;
  private readonly timePill: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly stars: Phaser.GameObjects.Graphics[] = [];
  private readonly earned: boolean[] = [];
  private readonly speaker: Phaser.GameObjects.Graphics;
  /** Money shown on the bar; it eases toward the real value so the bar fills smoothly. */
  private shown = 0;
  private drawnValue = -1;
  private urgent = false;

  /** Called once when the money passes a star threshold (0, 1 or 2). */
  onStar?: (starIndex: number, x: number, y: number) => void;
  /** Called when the pause button is clicked. */
  onPause?: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly goal: number,
    dayNumber: number,
    dayLength: number,
  ) {
    const d = DEPTH.hud;
    const g = scene.add.graphics().setDepth(d);
    // dark plum wooden plank with a gold trim
    g.fillGradientStyle(0x3a2452, 0x3a2452, 0x24163a, 0x24163a, 1);
    g.fillRect(0, 0, W, 56);
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(0, 0, W, 3);
    g.fillStyle(0xc99a4a, 1);
    g.fillRect(0, 54, W, 3);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 57, W, 3);

    const style = { fontFamily: FONT, color: '#ffffff', fontStyle: 'bold', stroke: '#1d1230', strokeThickness: 4 };
    // day
    drawPill(g, 14, 10, 150, 36, PANEL);
    drawMoon(g, 38, 28, 11, PANEL);
    scene.add.text(58, 28, T.day(dayNumber), { ...style, fontSize: '24px', color: '#ffc6e4' }).setOrigin(0, 0.5).setDepth(d + 1);

    // time left (its pill is redrawn when time runs out)
    this.timePill = scene.add.graphics().setDepth(d);
    this.drawTimePill(false);
    this.timeText = scene.add.text(214, 28, '2:30', { ...style, fontSize: '24px' }).setOrigin(0, 0.5).setDepth(d + 1);

    // money
    drawPill(g, 300, 10, 360, 36, PANEL);
    drawCoin(g, 324, 28, 12);
    this.moneyText = scene.add.text(344, 28, '', { ...style, fontSize: '23px', color: '#ffe08a' }).setOrigin(0, 0.5).setDepth(d + 1);

    // progress bar with star markers
    this.bar = scene.add.graphics().setDepth(d + 1);
    const full = goal * CONFIG.stars[CONFIG.stars.length - 1];
    CONFIG.stars.forEach((share) => {
      const x = BAR.x + (BAR.w * share * goal) / full - (share === CONFIG.stars[CONFIG.stars.length - 1] ? 6 : 0);
      const star = scene.add.graphics().setDepth(d + 2).setPosition(x, BAR.y + BAR.h / 2);
      drawStar(star, 0, 0, 14, false, 2.5);
      this.stars.push(star);
      this.earned.push(false);
    });

    // round buttons: sound (right) and pause (next to it)
    const sx = W - 36;
    const px = W - 84;
    const btn = scene.add.graphics().setDepth(d + 1);
    for (const x of [sx, px]) {
      btn.fillStyle(0x000000, 0.3);
      btn.fillCircle(x, 31, 20);
      btn.fillStyle(PANEL, 1);
      btn.fillCircle(x, 28, 20);
      btn.lineStyle(2.5, INK, 1);
      btn.strokeCircle(x, 28, 20);
    }
    const pauseIcon = scene.add.graphics().setDepth(d + 2);
    drawPause(pauseIcon, px, 28);
    scene.add
      .zone(px, 28, 44, 44)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onPause?.());
    this.speaker = scene.add.graphics().setDepth(d + 2);
    scene.add
      .zone(sx, 28, 44, 44)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        setMuted(scene, !isMuted());
        this.speaker.clear();
        drawSpeaker(this.speaker, sx - 3, 28, isMuted());
        sfx(scene, 'ui_click', 0.4);
      });
    drawSpeaker(this.speaker, sx - 3, 28, isMuted());
    this.update(dayLength, 0);
  }

  /** Push the latest numbers: seconds left in the day and money earned today. */
  update(secondsLeft: number, money: number): void {
    const s = Math.max(0, Math.ceil(secondsLeft));
    this.timeText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    const urgent = s <= 20;
    if (urgent !== this.urgent) {
      this.urgent = urgent;
      this.drawTimePill(urgent);
      this.timeText.setColor(urgent ? '#ffd1d6' : '#ffffff');
      if (urgent) this.scene.tweens.add({ targets: this.timeText, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.moneyText.setText(T.goalOf(money, this.goal));
    this.checkStars(money);

    // ease the shown value toward the real one (and skip redrawing when nothing moved)
    this.shown += (money - this.shown) * 0.12;
    if (Math.abs(money - this.shown) < 0.05) this.shown = money;
    if (this.shown === this.drawnValue) return;
    this.drawnValue = this.shown;
    const max = this.goal * CONFIG.stars[CONFIG.stars.length - 1];
    const fill = Phaser.Math.Clamp(this.shown / max, 0, 1);
    const g = this.bar;
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(BAR.x, BAR.y + 3, BAR.w, BAR.h, BAR.h / 2);
    g.fillStyle(0x2a1a3f, 1);
    g.fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h / 2);
    if (fill > 0) {
      const reached = this.shown >= this.goal;
      const w = Math.max(BAR.h, BAR.w * fill);
      g.fillStyle(reached ? 0x3fbf74 : 0xe6a22e, 1);
      g.fillRoundedRect(BAR.x, BAR.y, w, BAR.h, BAR.h / 2);
      g.fillStyle(reached ? COLORS.good : COLORS.warn, 1);
      g.fillRoundedRect(BAR.x, BAR.y, w, BAR.h * 0.6, { tl: BAR.h / 2, tr: BAR.h / 2, bl: 4, br: 4 });
      g.fillStyle(0xffffff, 0.35);
      g.fillRoundedRect(BAR.x + 6, BAR.y + 4, Math.max(4, w - 12), 4, 2);
    }
    g.lineStyle(2.5, INK, 1);
    g.strokeRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h / 2);
  }

  private checkStars(money: number): void {
    CONFIG.stars.forEach((share, i) => {
      if (!this.earned[i] && money >= Math.ceil(this.goal * share)) {
        this.earned[i] = true;
        const star = this.stars[i];
        star.clear();
        drawStar(star, 0, 0, 14, true, 2.5);
        this.scene.tweens.add({ targets: star, scale: { from: 2, to: 1 }, angle: { from: -40, to: 0 }, duration: 420, ease: 'Back.easeOut' });
        this.onStar?.(i, star.x, star.y);
      }
    });
  }

  private drawTimePill(urgent: boolean): void {
    const g = this.timePill;
    g.clear();
    drawPill(g, 176, 10, 110, 36, urgent ? 0x9c2f48 : PANEL);
    drawClock(g, 197, 28, 11, urgent ? 0xffd1d6 : 0xfff0d6);
  }
}
