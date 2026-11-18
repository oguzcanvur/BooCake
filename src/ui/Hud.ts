import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, W } from '../config';
import type { NightConfig } from '../data/nights';
import { isMuted, setMuted, sfx } from '../audio';

const BAR = { x: 372, y: 17, w: 330, h: 16 };

/** Top bar: clock, money + progress with star markers, night name, sound toggle. */
export class Hud {
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly moneyText: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly stars: Phaser.GameObjects.Image[] = [];
  private readonly earned: boolean[] = [];
  private readonly speaker: Phaser.GameObjects.Graphics;

  /** Called once when the money passes a star threshold (1, 2 or 3). */
  onStar?: (starIndex: number, x: number, y: number) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cfg: NightConfig,
    nightName: string,
  ) {
    const d = DEPTH.hud;
    const g = scene.add.graphics().setDepth(d);
    g.fillStyle(COLORS.bg, 0.96);
    g.fillRect(0, 0, W, 50);
    g.fillStyle(COLORS.pink, 0.35);
    g.fillRect(0, 50, W, 2);

    // moon icon + clock
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(30, 25, 13);
    g.fillStyle(COLORS.bg, 1);
    g.fillCircle(36, 21, 11);
    const style = { fontFamily: FONT, color: '#ffffff', fontStyle: 'bold' };
    this.clockText = scene.add.text(54, 25, '18:00', { ...style, fontSize: '26px' }).setOrigin(0, 0.5).setDepth(d + 1);

    // money
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(222, 25, 12);
    g.fillStyle(0xc98b00, 1);
    g.fillCircle(222, 25, 8);
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(222, 25, 6);
    this.moneyText = scene.add.text(242, 25, '', { ...style, fontSize: '24px' }).setOrigin(0, 0.5).setDepth(d + 1);

    this.bar = scene.add.graphics().setDepth(d + 1);
    cfg.starMultipliers.forEach((m) => {
      const x = BAR.x + (BAR.w * m * cfg.goal) / (cfg.goal * cfg.starMultipliers[2]);
      this.stars.push(scene.add.image(x, BAR.y + BAR.h / 2, 'star_empty').setScale(0.46).setDepth(d + 2));
      this.earned.push(false);
    });

    scene.add.text(W - 92, 25, nightName, { ...style, fontSize: '22px' }).setOrigin(1, 0.5).setDepth(d + 1);

    // sound button
    const btn = scene.add.image(W - 30, 25, 'btn_round_grey').setScale(0.62).setDepth(d + 1).setInteractive({ useHandCursor: true });
    this.speaker = scene.add.graphics().setDepth(d + 2);
    btn.on('pointerdown', () => {
      setMuted(scene, !isMuted());
      this.drawSpeaker(W - 30, 24);
      sfx(scene, 'ui_click', 0.4);
    });
    this.drawSpeaker(W - 30, 24);
    this.update(0, 0);
  }

  /** Push the latest numbers. t = 0..1 of the night; money = current money. */
  update(t: number, money: number): void {
    const total = Math.floor(Phaser.Math.Clamp(t, 0, 1) * 360);
    const hh = (18 + Math.floor(total / 60)) % 24;
    const mm = total % 60;
    this.clockText.setText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    this.moneyText.setText(`$${money} / $${this.cfg.goal}`);

    const max = this.cfg.goal * this.cfg.starMultipliers[2];
    const g = this.bar;
    g.clear();
    g.fillStyle(0x3a2a63, 1);
    g.fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, 8);
    const fill = Math.min(money / max, 1);
    if (fill > 0) {
      g.fillStyle(money >= this.cfg.goal ? COLORS.good : COLORS.warn, 1);
      g.fillRoundedRect(BAR.x, BAR.y, Math.max(BAR.h, BAR.w * fill), BAR.h, 8);
      g.fillStyle(0xffffff, 0.25);
      g.fillRoundedRect(BAR.x + 3, BAR.y + 2, Math.max(BAR.h - 6, BAR.w * fill - 6), 4, 2);
    }

    this.cfg.starMultipliers.forEach((m, i) => {
      if (!this.earned[i] && money >= Math.ceil(this.cfg.goal * m)) {
        this.earned[i] = true;
        const star = this.stars[i];
        star.setTexture('star').setTint(0xffffff);
        this.scene.tweens.add({ targets: star, scale: { from: 0.9, to: 0.46 }, duration: 380, ease: 'Back.easeOut' });
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
