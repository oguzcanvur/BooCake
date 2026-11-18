import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, W } from '../config';
import { CONFIG } from '../data/gameConfig';
import { isMuted, setMuted, sfx } from '../audio';
import { T } from '../text';

const BAR = { x: 700, y: 20, w: 340, h: 17 };

/** Top bar: time left, day, money with a progress bar and star markers, sound toggle. */
export class Hud {
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly moneyText: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly earned: boolean[] = [];
  private readonly speaker: Phaser.GameObjects.Graphics;

  /** Called once when the money passes a star threshold (0, 1 or 2). */
  onStar?: (starIndex: number, x: number, y: number) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly goal: number,
    dayNumber: number,
  ) {
    const d = DEPTH.hud;
    const g = scene.add.graphics().setDepth(d);
    g.fillStyle(COLORS.bg, 0.96);
    g.fillRect(0, 0, W, 56);
    g.fillStyle(COLORS.pink, 0.35);
    g.fillRect(0, 56, W, 2);

    const style = { fontFamily: FONT, color: '#ffffff', fontStyle: 'bold' };
    scene.add.text(24, 28, T.day(dayNumber), { ...style, fontSize: '28px', color: '#ffb4d9' }).setOrigin(0, 0.5).setDepth(d + 1);

    // moon icon + time left
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(188, 28, 14);
    g.fillStyle(COLORS.bg, 1);
    g.fillCircle(195, 24, 12);
    this.timeText = scene.add.text(214, 28, '2:30', { ...style, fontSize: '28px' }).setOrigin(0, 0.5).setDepth(d + 1);

    // money
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(344, 28, 13);
    g.fillStyle(0xc98b00, 1);
    g.fillCircle(344, 28, 9);
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(344, 28, 7);
    this.moneyText = scene.add.text(366, 28, '', { ...style, fontSize: '26px' }).setOrigin(0, 0.5).setDepth(d + 1);

    this.bar = scene.add.graphics().setDepth(d + 1);
    const full = goal * CONFIG.stars[CONFIG.stars.length - 1];
    CONFIG.stars.forEach((share) => {
      const x = BAR.x + (BAR.w * share * goal) / full;
      this.stars.push(scene.add.image(x, BAR.y + BAR.h / 2, 'star_empty').setScale(0.5).setDepth(d + 2));
      this.earned.push(false);
    });

    // sound button
    const btn = scene.add.image(W - 34, 28, 'btn_round_grey').setScale(0.66).setDepth(d + 1).setInteractive({ useHandCursor: true });
    this.speaker = scene.add.graphics().setDepth(d + 2);
    btn.on('pointerdown', () => {
      setMuted(scene, !isMuted());
      this.drawSpeaker(W - 34, 27);
      sfx(scene, 'ui_click', 0.4);
    });
    this.drawSpeaker(W - 34, 27);
    this.update(CONFIG.dayLengthSec, 0);
  }

  /** Push the latest numbers: seconds left in the day and money earned today. */
  update(secondsLeft: number, money: number): void {
    const s = Math.max(0, Math.ceil(secondsLeft));
    this.timeText.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    this.moneyText.setText(T.goalOf(money, this.goal));

    const max = this.goal * CONFIG.stars[CONFIG.stars.length - 1];
    const g = this.bar;
    g.clear();
    g.fillStyle(0x3a2a63, 1);
    g.fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, 9);
    const fill = Math.min(money / max, 1);
    if (fill > 0) {
      g.fillStyle(money >= this.goal ? COLORS.good : COLORS.warn, 1);
      g.fillRoundedRect(BAR.x, BAR.y, Math.max(BAR.h, BAR.w * fill), BAR.h, 9);
      g.fillStyle(0xffffff, 0.25);
      g.fillRoundedRect(BAR.x + 3, BAR.y + 2, Math.max(BAR.h - 6, BAR.w * fill - 6), 4, 2);
    }

    CONFIG.stars.forEach((share, i) => {
      if (!this.earned[i] && money >= Math.ceil(this.goal * share)) {
        this.earned[i] = true;
        const star = this.stars[i];
        star.setTexture('star').setTint(0xffffff);
        this.scene.tweens.add({ targets: star, scale: { from: 0.95, to: 0.5 }, duration: 380, ease: 'Back.easeOut' });
        this.onStar?.(i, star.x, star.y);
      }
    });
  }

  private drawSpeaker(cx: number, cy: number): void {
    const g = this.speaker;
    g.clear();
    const muted = isMuted();
    const col = muted ? 0x8a8aa8 : 0x3a2a63;
    g.fillStyle(col, 1);
    g.fillRect(cx - 9, cy - 4, 6, 8);
    g.fillTriangle(cx - 3, cy - 4, cx + 4, cy - 10, cx + 4, cy + 10);
    g.fillTriangle(cx - 3, cy - 4, cx + 4, cy + 10, cx - 3, cy + 4);
    g.lineStyle(2, col, 1);
    if (muted) {
      g.lineBetween(cx + 7, cy - 5, cx + 14, cy + 5);
      g.lineBetween(cx + 14, cy - 5, cx + 7, cy + 5);
    } else {
      g.beginPath();
      g.arc(cx + 5, cy, 6, -0.9, 0.9, false);
      g.strokePath();
      g.beginPath();
      g.arc(cx + 5, cy, 11, -0.9, 0.9, false);
      g.strokePath();
    }
  }
}
