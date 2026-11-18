import Phaser from 'phaser';
import { fxKey } from '../assets';
import { COLORS, DEPTH, FONT, H, LAYOUT, W } from '../config';
import { shade } from './cupcake';

const FLAG_COLORS = [0xff8fc7, 0xffd166, 0x8fffd0, 0xb98cff];
const TOP = LAYOUT.counterTop;
const JAR_X = 1228;

/**
 * The shop scenery: wall, windows with moon and bats, bunting, cobwebs, wall clock, neon sign,
 * counter, pumpkin, candles, tip jar and the prep table. All drawn with shapes (no image files).
 */
export class Shop {
  private readonly hands: Phaser.GameObjects.Graphics;
  private readonly jar: Phaser.GameObjects.Graphics;
  private readonly clock = { x: 84, y: 196, r: 40 };
  private jarFill = -1;
  private garlicShown = false;

  /** Where tips land (the jar opening), for coin animations. */
  readonly jarPos = { x: JAR_X, y: TOP - 56 };

  constructor(private readonly scene: Phaser.Scene) {
    this.drawWall();
    this.drawWindow(450, 190, 124, 150, 0);
    this.drawWindow(830, 190, 124, 150, 1);
    this.drawBunting();
    this.drawCobweb(0, LAYOUT.hudH, 1);
    this.drawCobweb(W, LAYOUT.hudH, -1);
    this.drawClockFace();
    this.hands = scene.add.graphics().setDepth(DEPTH.deco + 2);
    this.drawNeonSign(1190, 196);
    this.drawCounter();
    this.drawPrepTable();
    this.drawPumpkin(60, TOP);
    this.drawCandle(450, TOP);
    this.drawCandle(830, TOP);
    this.jar = scene.add.graphics().setDepth(DEPTH.counterDeco);
    this.drawJarShell(JAR_X, TOP);
    this.setJar(0);
    this.startBats();
    this.update(0);
  }

  /** Move the clock hands (t = 0 at 18:00, 1 at midnight). */
  update(t: number): void {
    const { x, y, r } = this.clock;
    const totalMin = Phaser.Math.Clamp(t, 0, 1) * 360;
    const hour = (6 + totalMin / 60) % 12;
    const minute = totalMin % 60;
    const hAngle = (hour / 12) * Math.PI * 2 - Math.PI / 2;
    const mAngle = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    const g = this.hands;
    g.clear();
    g.lineStyle(4.5, 0x3a2a63, 1);
    g.lineBetween(x, y, x + Math.cos(hAngle) * r * 0.5, y + Math.sin(hAngle) * r * 0.5);
    g.lineStyle(3, 0x3a2a63, 1);
    g.lineBetween(x, y, x + Math.cos(mAngle) * r * 0.78, y + Math.sin(mAngle) * r * 0.78);
    g.fillStyle(0xff8a3d, 1);
    g.fillCircle(x, y, 4);
  }

  /** Fill the tip jar. fraction 0..1. */
  setJar(fraction: number): void {
    const f = Phaser.Math.Clamp(fraction, 0, 1);
    const level = Math.round(f * 22);
    if (level === this.jarFill) return;
    this.jarFill = level;
    const g = this.jar;
    g.clear();
    const baseY = TOP - 4;
    for (let i = 0; i < level; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cx = JAR_X - 14 + col * 14 + (row % 2) * 4;
      const cy = baseY - 6 - row * 5;
      g.fillStyle(0xc98b00, 1);
      g.fillEllipse(cx, cy + 1.5, 15, 7);
      g.fillStyle(COLORS.gold, 1);
      g.fillEllipse(cx, cy, 15, 7);
      g.fillStyle(0xffeaa0, 0.9);
      g.fillEllipse(cx - 2, cy - 1, 6, 2.5);
    }
  }

  /** Little hop of the jar when a tip lands. */
  jarBump(): void {
    this.scene.tweens.add({ targets: this.jar, y: -3, duration: 70, yoyo: true });
  }

  /** A bunch of garlic on the counter (shown once the player owns the garlic upgrade). */
  showGarlic(): void {
    if (this.garlicShown) return;
    this.garlicShown = true;
    const g = this.scene.add.graphics().setDepth(DEPTH.counterDeco);
    const x = 168;
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x, TOP, 62, 8);
    const bulb = (bx: number, by: number, s: number) => {
      g.fillStyle(0xe9e2cf, 1);
      g.fillEllipse(bx, by, 24 * s, 22 * s);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(bx - 4 * s, by - 3 * s, 8 * s, 8 * s);
      g.lineStyle(1.5, 0xc9c0a8, 1);
      g.lineBetween(bx, by - 10 * s, bx - 3 * s, by + 8 * s);
      g.lineBetween(bx, by - 10 * s, bx + 5 * s, by + 8 * s);
      g.fillStyle(0xe9e2cf, 1);
      g.fillTriangle(bx - 3 * s, by - 9 * s, bx + 3 * s, by - 9 * s, bx, by - 17 * s);
    };
    bulb(x - 14, TOP - 12, 1);
    bulb(x + 14, TOP - 12, 1);
    bulb(x, TOP - 26, 1.05);
    g.lineStyle(2, 0x7a8f4a, 1);
    g.lineBetween(x, TOP - 44, x, TOP - 52);
  }

  // ------------------------------------------------------------------ pieces

  private drawWall(): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.wall);
    g.fillGradientStyle(COLORS.wallTop, COLORS.wallTop, COLORS.wallBottom, COLORS.wallBottom, 1);
    g.fillRect(0, 0, W, TOP);
    // wallpaper: soft stripes and little dots
    g.fillStyle(0xffffff, 0.035);
    for (let x = 0; x < W; x += 72) g.fillRect(x, 0, 36, TOP);
    g.fillStyle(0xffffff, 0.07);
    for (let y = 84; y < TOP - 24; y += 48) {
      for (let x = ((y / 48) % 2) * 36 + 18; x < W; x += 72) g.fillCircle(x, y, 2.2);
    }
    // wainscot
    g.fillStyle(COLORS.wainscot, 0.55);
    g.fillRect(0, TOP - 52, W, 52);
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(0, TOP - 52, W, 3);

    // Floor under the counter. It is drawn above the customers (so their legs stay hidden behind the
    // counter) but below the counter itself and the stations.
    const floorTop = TOP + 42;
    const f = s.add.graphics().setDepth(DEPTH.floor);
    f.fillGradientStyle(0x2c2152, 0x2c2152, COLORS.floor, COLORS.floor, 1);
    f.fillRect(0, floorTop, W, H - floorTop);
    f.fillStyle(0xffffff, 0.035);
    for (let y = floorTop; y < H; y += 56) {
      for (let x = (Math.floor((y - floorTop) / 56) % 2) * 56; x < W; x += 112) f.fillRect(x, y, 56, 56);
    }
  }

  private drawWindow(cx: number, cy: number, w: number, h: number, variant: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    const x = cx - w / 2;
    const y = cy - h / 2;
    g.fillStyle(0x5a3a30, 1);
    g.fillRoundedRect(x - 9, y - 9, w + 18, h + 18, 16);
    g.fillStyle(0x7a5545, 1);
    g.fillRoundedRect(x - 9, y - 9, w + 18, 9, 7);
    g.fillGradientStyle(0x0f0f35, 0x0f0f35, 0x3b2d7d, 0x3b2d7d, 1);
    g.fillRoundedRect(x, y, w, h, 9);
    g.fillStyle(0xffffff, 0.9);
    const stars = [
      [0.2, 0.15],
      [0.75, 0.25],
      [0.55, 0.1],
      [0.3, 0.5],
      [0.85, 0.55],
    ];
    for (const [sx, sy] of stars) g.fillCircle(x + w * sx, y + h * sy, 1.8);
    const mx = x + w * (variant === 0 ? 0.68 : 0.3);
    const my = y + h * 0.3;
    const glow = s.add.image(mx, my, fxKey('light_01')).setDepth(DEPTH.deco + 1).setTint(0xfff0b0).setAlpha(0.55).setScale(1.05);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(mx, my, 20);
    if (variant === 1) {
      g.fillStyle(0x1b1650, 1);
      g.fillCircle(mx + 9, my - 3, 18);
    } else {
      g.fillStyle(0xf0dd9a, 1);
      g.fillCircle(mx - 6, my + 5, 4);
      g.fillCircle(mx + 6, my - 6, 3);
    }
    s.tweens.add({ targets: glow, alpha: 0.35, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    g.fillStyle(0x120d2e, 1);
    g.fillTriangle(x, y + h, x + w * 0.45, y + h * 0.72, x + w * 0.9, y + h);
    g.fillTriangle(x + w * 0.4, y + h, x + w * 0.85, y + h * 0.78, x + w, y + h * 0.9);
    g.fillRect(x, y + h - 2, w, 2);
    g.lineStyle(6, 0x5a3a30, 1);
    g.lineBetween(cx, y, cx, y + h);
    g.lineBetween(x, cy + 10, x + w, cy + 10);
    g.fillStyle(0x7a5545, 1);
    g.fillRoundedRect(x - 16, y + h + 5, w + 32, 12, 5);
  }

  private drawBunting(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 3);
    const baseY = LAYOUT.hudH + 6;
    const sag = 26;
    const seg = W / 3;
    for (let si = 0; si < 3; si++) {
      const x0 = si * seg;
      const x1 = x0 + seg;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        pts.push({ x: Phaser.Math.Linear(x0, x1, t), y: baseY + sag * Math.sin(Math.PI * t) });
      }
      g.lineStyle(2, 0xd9c9f5, 0.9);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) g.lineTo(p.x, p.y);
      g.strokePath();
      for (let i = 2; i < 24; i += 3) {
        const p = pts[i];
        const col = FLAG_COLORS[(i / 3 + si) % FLAG_COLORS.length | 0];
        g.fillStyle(col, 1);
        g.fillTriangle(p.x - 13, p.y, p.x + 13, p.y, p.x, p.y + 30);
        g.fillStyle(0xffffff, 0.22);
        g.fillTriangle(p.x - 13, p.y, p.x, p.y, p.x, p.y + 30);
      }
    }
  }

  private drawCobweb(x: number, y: number, dir: 1 | -1): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 2);
    g.lineStyle(1.5, 0xffffff, 0.3);
    const len = 110;
    const spokes = [0.05, 0.4, 0.75, 1.1, 1.45];
    for (const a of spokes) g.lineBetween(x, y, x + dir * Math.cos(a) * len, y + Math.sin(a) * len);
    for (let r = 26; r <= len; r += 26) {
      g.beginPath();
      spokes.forEach((a, i) => {
        const px = x + dir * Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px - dir * 3, py - 3);
      });
      g.strokePath();
    }
    const sx = x + dir * 48;
    const sy = y + 104;
    g.lineStyle(1, 0xffffff, 0.35);
    g.lineBetween(sx, y + 34, sx, sy);
    g.fillStyle(0x15102b, 1);
    g.fillCircle(sx, sy, 6);
    g.lineStyle(1.5, 0x15102b, 1);
    for (const d of [-1, 1]) {
      g.lineBetween(sx, sy, sx + d * 10, sy - 5);
      g.lineBetween(sx, sy, sx + d * 11, sy + 4);
    }
  }

  private drawClockFace(): void {
    const { x, y, r } = this.clock;
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 1);
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(x + 3, y + 4, r + 6);
    g.fillStyle(0xc98b00, 1);
    g.fillCircle(x, y, r + 6);
    g.fillStyle(0xffc83d, 1);
    g.fillCircle(x, y - 1, r + 4);
    g.fillStyle(0xfff3d6, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(2.8, 0x3a2a63, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = i % 3 === 0 ? r - 10 : r - 7;
      g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
    }
    g.fillStyle(0x3a2a63, 1);
    g.fillTriangle(x - 20, y - r - 4, x - 7, y - r - 2, x - 17, y - r - 20);
    g.fillTriangle(x + 20, y - r - 4, x + 7, y - r - 2, x + 17, y - r - 20);
  }

  private drawNeonSign(x: number, y: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    g.fillStyle(0x15102b, 1);
    g.fillRoundedRect(x - 58, y - 30, 116, 60, 14);
    g.lineStyle(3, 0xff4fa3, 0.9);
    g.strokeRoundedRect(x - 58, y - 30, 116, 60, 14);
    const t = s.add
      .text(x, y, 'OPEN', {
        fontFamily: FONT,
        fontSize: '34px',
        color: '#ffd1ea',
        fontStyle: 'bold',
        shadow: { offsetX: 0, offsetY: 0, color: '#ff4fa3', blur: 14, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.deco + 1);
    s.tweens.add({ targets: t, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    g.lineStyle(2, 0xd9c9f5, 0.7);
    g.lineBetween(x - 42, y - 30, x - 42, LAYOUT.hudH + 10);
    g.lineBetween(x + 42, y - 30, x + 42, LAYOUT.hudH + 10);
  }

  private drawCounter(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.counter);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0.4, 0, 0);
    g.fillRect(0, TOP + 42, W, 28);
    g.fillGradientStyle(COLORS.counter, COLORS.counter, COLORS.counterShade, COLORS.counterShade, 1);
    g.fillRect(0, TOP + 13, W, 29);
    g.fillStyle(0x000000, 0.18);
    for (let x = 28; x < W; x += 132) g.fillRoundedRect(x, TOP + 19, 104, 17, 5);
    g.fillStyle(COLORS.counterTop, 1);
    g.fillRect(0, TOP, W, 14);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(0, TOP, W, 3);
    g.fillStyle(shade(COLORS.counterTop, -0.25), 1);
    g.fillRect(0, TOP + 13, W, 2);
  }

  private drawPrepTable(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.floor + 1);
    const x = 14;
    const y = TOP + 50;
    const w = W - 28;
    const h = H - y - 8;
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x, y + 8, w, h, 24);
    g.fillStyle(COLORS.table, 1);
    g.fillRoundedRect(x, y, w, h, 24);
    g.fillStyle(COLORS.tableTop, 1);
    g.fillRoundedRect(x, y, w, 12, { tl: 24, tr: 24, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.07);
    g.fillRoundedRect(x + 8, y + 14, w - 16, h - 22, 18);
  }

  private drawPumpkin(x: number, baseY: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.counterDeco);
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x, baseY, 62, 11);
    g.fillStyle(0xd9640a, 1);
    g.fillEllipse(x - 16, baseY - 20, 29, 38);
    g.fillEllipse(x + 16, baseY - 20, 29, 38);
    g.fillStyle(0xff8a1f, 1);
    g.fillEllipse(x, baseY - 21, 38, 42);
    g.fillStyle(0xffa94d, 0.55);
    g.fillEllipse(x - 9, baseY - 31, 11, 15);
    g.fillStyle(0x3b7a2a, 1);
    g.fillRoundedRect(x - 3, baseY - 49, 8, 12, 2);
    const face = s.add.graphics().setDepth(DEPTH.counterDeco + 1);
    face.fillStyle(0xffe066, 1);
    face.fillTriangle(x - 13, baseY - 29, x - 4, baseY - 29, x - 9, baseY - 37);
    face.fillTriangle(x + 4, baseY - 29, x + 13, baseY - 29, x + 9, baseY - 37);
    face.fillRoundedRect(x - 13, baseY - 18, 26, 9, 3);
    face.fillStyle(0xd9640a, 1);
    face.fillRect(x - 5, baseY - 18, 3, 4);
    face.fillRect(x + 2, baseY - 14, 3, 4);
    s.tweens.add({ targets: face, alpha: 0.7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawCandle(x: number, baseY: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.counterDeco);
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x, baseY, 34, 7);
    g.fillStyle(0x6a58b0, 1);
    g.fillRoundedRect(x - 13, baseY - 9, 26, 9, 3);
    g.fillStyle(0xf6ecd0, 1);
    g.fillRoundedRect(x - 7, baseY - 40, 14, 32, 3);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(x - 4, baseY - 38, 3, 27);
    g.lineStyle(1.5, 0x3a2a63, 1);
    g.lineBetween(x, baseY - 40, x, baseY - 45);
    const flame = s.add
      .image(x, baseY - 56, fxKey('flame_01'))
      .setDepth(DEPTH.counterDeco + 1)
      .setTint(0xffb347)
      .setScale(0.34)
      .setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({
      targets: flame,
      scaleY: { from: 0.3, to: 0.4 },
      scaleX: { from: 0.34, to: 0.3 },
      alpha: { from: 0.85, to: 1 },
      duration: Phaser.Math.Between(180, 300),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const glow = s.add.image(x, baseY - 54, fxKey('light_01')).setDepth(DEPTH.counterDeco).setTint(0xffa733).setAlpha(0.3).setScale(0.6);
    glow.setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawJarShell(x: number, baseY: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.counterDeco + 1);
    g.fillStyle(0xdfe9ff, 0.22);
    g.fillRoundedRect(x - 28, baseY - 62, 56, 62, 13);
    g.lineStyle(2, 0xffffff, 0.55);
    g.strokeRoundedRect(x - 28, baseY - 62, 56, 62, 13);
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(x - 22, baseY - 56, 5, 38, 3);
    g.fillStyle(0xff8fc7, 1);
    g.fillRoundedRect(x - 24, baseY - 73, 48, 13, 5);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(x - 20, baseY - 71, 26, 2);
    const t = this.scene.add
      .text(x, baseY - 30, 'TIPS', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(DEPTH.counterDeco + 2);
    t.setAngle(-4);
  }

  // ------------------------------------------------------------------ bats

  private startBats(): void {
    const s = this.scene;
    const fly = (): void => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = Phaser.Math.Between(90, 250);
      const bat = this.makeBat(dir === 1 ? -40 : W + 40, y);
      const dur = Phaser.Math.Between(6000, 9000);
      s.tweens.add({ targets: bat, x: dir === 1 ? W + 40 : -40, duration: dur, onComplete: () => bat.destroy() });
      s.tweens.add({ targets: bat, y: y + Phaser.Math.Between(-34, 34), duration: dur / 3, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      s.time.delayedCall(Phaser.Math.Between(6000, 12000), fly);
    };
    s.time.delayedCall(1500, fly);
  }

  private makeBat(x: number, y: number): Phaser.GameObjects.Container {
    const s = this.scene;
    const c = s.add.container(x, y).setDepth(DEPTH.deco + 4);
    const body = s.add.graphics();
    body.fillStyle(0x110c26, 1);
    body.fillEllipse(0, 0, 12, 16);
    body.fillTriangle(-4, -6, -2, -6, -4, -14);
    body.fillTriangle(4, -6, 2, -6, 4, -14);
    body.fillStyle(0xff4fa3, 1);
    body.fillCircle(-2, -2, 1.3);
    body.fillCircle(2, -2, 1.3);
    const wing = (dir: 1 | -1): Phaser.GameObjects.Graphics => {
      const w = s.add.graphics();
      w.fillStyle(0x110c26, 1);
      w.fillTriangle(0, -2, dir * 30, -14, dir * 25, 5);
      w.fillTriangle(0, -2, dir * 25, 5, dir * 14, 11);
      w.fillTriangle(0, 0, dir * 14, 11, dir * 3, 9);
      return w;
    };
    const wl = wing(-1);
    const wr = wing(1);
    c.add([wl, wr, body]);
    s.tweens.add({ targets: [wl, wr], scaleY: 0.35, duration: 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }
}
