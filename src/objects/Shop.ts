import Phaser from 'phaser';
import { fxKey } from '../assets';
import { COLORS, DEPTH, FONT, H, LAYOUT, W } from '../config';
import { shade } from './cupcake';

const FLAG_COLORS = [0xff8fc7, 0xffd166, 0x8fffd0, 0xb98cff];

/**
 * The shop scenery: wall, windows with moon and bats, bunting, cobwebs, wall clock, neon sign,
 * counter, pumpkin, candles, tip jar and the prep table. All drawn with shapes (no image files).
 */
export class Shop {
  private readonly hands: Phaser.GameObjects.Graphics;
  private readonly jar: Phaser.GameObjects.Graphics;
  private readonly clock = { x: 62, y: 158, r: 36 };
  private jarFill = -1;

  /** Where tips land (center of the jar opening), for coin animations. */
  readonly jarPos = { x: 905, y: 262 };

  constructor(private readonly scene: Phaser.Scene) {
    this.drawWall();
    this.drawWindow(340, 150, 96, 128, 0);
    this.drawWindow(620, 150, 96, 128, 1);
    this.drawBunting();
    this.drawCobweb(0, 50, 1);
    this.drawCobweb(W, 50, -1);
    this.drawClockFace();
    this.hands = scene.add.graphics().setDepth(DEPTH.deco + 2);
    this.drawNeonSign(902, 150);
    this.drawCounter();
    this.drawPrepTable();
    this.drawPumpkin(44, 300);
    this.drawCandle(340, 300);
    this.drawCandle(620, 300);
    this.jar = scene.add.graphics().setDepth(DEPTH.counterDeco);
    this.drawJarShell(905, 300);
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
    g.lineStyle(4, 0x3a2a63, 1);
    g.lineBetween(x, y, x + Math.cos(hAngle) * r * 0.5, y + Math.sin(hAngle) * r * 0.5);
    g.lineStyle(2.5, 0x3a2a63, 1);
    g.lineBetween(x, y, x + Math.cos(mAngle) * r * 0.78, y + Math.sin(mAngle) * r * 0.78);
    g.fillStyle(0xff8a3d, 1);
    g.fillCircle(x, y, 3.5);
  }

  /** Fill the tip jar. fraction 0..1. */
  setJar(fraction: number): void {
    const f = Phaser.Math.Clamp(fraction, 0, 1);
    const level = Math.round(f * 22);
    if (level === this.jarFill) return;
    this.jarFill = level;
    const g = this.jar;
    g.clear();
    const baseX = 905;
    const baseY = 296;
    // coins stacked as rows of little ellipses
    for (let i = 0; i < level; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cx = baseX - 14 + col * 14 + (row % 2) * 4;
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

  // ------------------------------------------------------------------ pieces

  private drawWall(): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.wall);
    g.fillGradientStyle(COLORS.wallTop, COLORS.wallTop, COLORS.wallBottom, COLORS.wallBottom, 1);
    g.fillRect(0, 0, W, LAYOUT.counterTop);
    // wallpaper: soft stripes and little dots
    g.fillStyle(0xffffff, 0.035);
    for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 32, LAYOUT.counterTop);
    g.fillStyle(0xffffff, 0.07);
    for (let y = 70; y < LAYOUT.counterTop - 20; y += 44) {
      for (let x = ((y / 44) % 2) * 32 + 16; x < W; x += 64) g.fillCircle(x, y, 2);
    }
    // wainscot
    g.fillStyle(COLORS.wainscot, 0.55);
    g.fillRect(0, 252, W, LAYOUT.counterTop - 252);
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(0, 252, W, 3);

    // Floor under the counter. It is drawn above the customers (so their legs stay hidden behind the
    // counter) but below the counter itself and the stations.
    const floorTop = LAYOUT.counterTop + 42;
    const f = s.add.graphics().setDepth(DEPTH.monster + 5);
    f.fillGradientStyle(0x2c2152, 0x2c2152, COLORS.floor, COLORS.floor, 1);
    f.fillRect(0, floorTop, W, H - floorTop);
    f.fillStyle(0xffffff, 0.035);
    for (let y = 352; y < H; y += 48) {
      for (let x = ((y / 48) % 2) * 48; x < W; x += 96) f.fillRect(x, y, 48, 48);
    }
  }

  private drawWindow(cx: number, cy: number, w: number, h: number, variant: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    const x = cx - w / 2;
    const y = cy - h / 2;
    // frame
    g.fillStyle(0x5a3a30, 1);
    g.fillRoundedRect(x - 8, y - 8, w + 16, h + 16, 14);
    g.fillStyle(0x7a5545, 1);
    g.fillRoundedRect(x - 8, y - 8, w + 16, 8, 6);
    // night sky glass
    g.fillGradientStyle(0x0f0f35, 0x0f0f35, 0x3b2d7d, 0x3b2d7d, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    // stars
    g.fillStyle(0xffffff, 0.9);
    const stars = [
      [0.2, 0.15],
      [0.75, 0.25],
      [0.55, 0.1],
      [0.3, 0.5],
      [0.85, 0.55],
    ];
    for (const [sx, sy] of stars) g.fillCircle(x + w * sx, y + h * sy, 1.6);
    // moon (variant 1 = crescent)
    const mx = x + w * (variant === 0 ? 0.68 : 0.3);
    const my = y + h * 0.3;
    const glow = s.add.image(mx, my, fxKey('light_01')).setDepth(DEPTH.deco + 1).setTint(0xfff0b0).setAlpha(0.55).setScale(0.9);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(mx, my, 17);
    if (variant === 1) {
      g.fillStyle(0x1b1650, 1);
      g.fillCircle(mx + 8, my - 3, 15);
    } else {
      g.fillStyle(0xf0dd9a, 1);
      g.fillCircle(mx - 5, my + 4, 3.5);
      g.fillCircle(mx + 5, my - 5, 2.5);
    }
    s.tweens.add({ targets: glow, alpha: 0.35, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // hill silhouette
    g.fillStyle(0x120d2e, 1);
    g.fillTriangle(x, y + h, x + w * 0.45, y + h * 0.72, x + w * 0.9, y + h);
    g.fillTriangle(x + w * 0.4, y + h, x + w * 0.85, y + h * 0.78, x + w, y + h * 0.9);
    g.fillRect(x, y + h - 2, w, 2);
    // window bars
    g.lineStyle(5, 0x5a3a30, 1);
    g.lineBetween(cx, y, cx, y + h);
    g.lineBetween(x, cy + 8, x + w, cy + 8);
    // sill
    g.fillStyle(0x7a5545, 1);
    g.fillRoundedRect(x - 14, y + h + 4, w + 28, 10, 4);
  }

  private drawBunting(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 3);
    const baseY = 54;
    const sag = 22;
    const segments = [
      [0, 320],
      [320, 640],
      [640, W],
    ];
    segments.forEach(([x0, x1], si) => {
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
        g.fillTriangle(p.x - 11, p.y, p.x + 11, p.y, p.x, p.y + 26);
        g.fillStyle(0xffffff, 0.22);
        g.fillTriangle(p.x - 11, p.y, p.x, p.y, p.x, p.y + 26);
      }
    });
  }

  private drawCobweb(x: number, y: number, dir: 1 | -1): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 2);
    g.lineStyle(1.4, 0xffffff, 0.3);
    const len = 92;
    const spokes = [0.05, 0.4, 0.75, 1.1, 1.45];
    for (const a of spokes) g.lineBetween(x, y, x + dir * Math.cos(a) * len, y + Math.sin(a) * len);
    for (let r = 22; r <= len; r += 22) {
      g.beginPath();
      spokes.forEach((a, i) => {
        const px = x + dir * Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px - dir * 3, py - 3);
      });
      g.strokePath();
    }
    // a tiny spider
    const sx = x + dir * 40;
    const sy = y + 92;
    g.lineStyle(1, 0xffffff, 0.35);
    g.lineBetween(sx, y + 30, sx, sy);
    g.fillStyle(0x15102b, 1);
    g.fillCircle(sx, sy, 5);
    g.lineStyle(1.5, 0x15102b, 1);
    for (const d of [-1, 1]) {
      g.lineBetween(sx, sy, sx + d * 9, sy - 4);
      g.lineBetween(sx, sy, sx + d * 10, sy + 3);
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
    g.lineStyle(2.5, 0x3a2a63, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = i % 3 === 0 ? r - 9 : r - 6;
      g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
    }
    // little bat ears on top
    g.fillStyle(0x3a2a63, 1);
    g.fillTriangle(x - 18, y - r - 4, x - 6, y - r - 2, x - 15, y - r - 18);
    g.fillTriangle(x + 18, y - r - 4, x + 6, y - r - 2, x + 15, y - r - 18);
  }

  private drawNeonSign(x: number, y: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    g.fillStyle(0x15102b, 1);
    g.fillRoundedRect(x - 50, y - 26, 100, 52, 12);
    g.lineStyle(3, 0xff4fa3, 0.9);
    g.strokeRoundedRect(x - 50, y - 26, 100, 52, 12);
    const t = s.add
      .text(x, y, 'OPEN', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#ffd1ea',
        fontStyle: 'bold',
        shadow: { offsetX: 0, offsetY: 0, color: '#ff4fa3', blur: 14, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.deco + 1);
    s.tweens.add({ targets: t, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // hanging chains
    g.lineStyle(2, 0xd9c9f5, 0.7);
    g.lineBetween(x - 36, y - 26, x - 36, 60);
    g.lineBetween(x + 36, y - 26, x + 36, 60);
  }

  private drawCounter(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.counter);
    const top = LAYOUT.counterTop;
    // shadow cast on the floor
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.4, 0.4, 0, 0);
    g.fillRect(0, top + 42, W, 26);
    // front panel
    g.fillGradientStyle(COLORS.counter, COLORS.counter, COLORS.counterShade, COLORS.counterShade, 1);
    g.fillRect(0, top + 12, W, 30);
    g.fillStyle(0x000000, 0.18);
    for (let x = 24; x < W; x += 120) g.fillRoundedRect(x, top + 18, 96, 18, 5);
    // top surface
    g.fillStyle(COLORS.counterTop, 1);
    g.fillRect(0, top, W, 13);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(0, top, W, 3);
    g.fillStyle(shade(COLORS.counterTop, -0.25), 1);
    g.fillRect(0, top + 12, W, 2);
  }

  private drawPrepTable(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.monster + 6);
    const x = 14;
    const y = 366;
    const w = W - 28;
    const h = 232;
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x, y + 8, w, h, 22);
    g.fillStyle(COLORS.table, 1);
    g.fillRoundedRect(x, y, w, h, 22);
    g.fillStyle(COLORS.tableTop, 1);
    g.fillRoundedRect(x, y, w, 12, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.07);
    g.fillRoundedRect(x + 8, y + 14, w - 16, h - 22, 16);
  }

  private drawPumpkin(x: number, baseY: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.counterDeco);
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x, baseY, 56, 10);
    g.fillStyle(0xd9640a, 1);
    g.fillEllipse(x - 14, baseY - 18, 26, 34);
    g.fillEllipse(x + 14, baseY - 18, 26, 34);
    g.fillStyle(0xff8a1f, 1);
    g.fillEllipse(x, baseY - 19, 34, 38);
    g.fillStyle(0xffa94d, 0.55);
    g.fillEllipse(x - 8, baseY - 28, 10, 14);
    g.fillStyle(0x3b7a2a, 1);
    g.fillRoundedRect(x - 3, baseY - 44, 7, 11, 2);
    // glowing face
    const face = s.add.graphics().setDepth(DEPTH.counterDeco + 1);
    face.fillStyle(0xffe066, 1);
    face.fillTriangle(x - 12, baseY - 26, x - 4, baseY - 26, x - 8, baseY - 33);
    face.fillTriangle(x + 4, baseY - 26, x + 12, baseY - 26, x + 8, baseY - 33);
    face.fillRoundedRect(x - 12, baseY - 16, 24, 8, 3);
    face.fillStyle(0xd9640a, 1);
    face.fillRect(x - 5, baseY - 16, 3, 4);
    face.fillRect(x + 2, baseY - 12, 3, 4);
    s.tweens.add({ targets: face, alpha: 0.7, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawCandle(x: number, baseY: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.counterDeco);
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x, baseY, 30, 6);
    g.fillStyle(0x6a58b0, 1);
    g.fillRoundedRect(x - 12, baseY - 8, 24, 8, 3);
    g.fillStyle(0xf6ecd0, 1);
    g.fillRoundedRect(x - 6, baseY - 36, 12, 29, 3);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(x - 4, baseY - 34, 2.5, 24);
    g.lineStyle(1.5, 0x3a2a63, 1);
    g.lineBetween(x, baseY - 36, x, baseY - 41);
    const flame = s.add
      .image(x, baseY - 50, fxKey('flame_01'))
      .setDepth(DEPTH.counterDeco + 1)
      .setTint(0xffb347)
      .setScale(0.3)
      .setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({
      targets: flame,
      scaleY: { from: 0.26, to: 0.36 },
      scaleX: { from: 0.3, to: 0.26 },
      alpha: { from: 0.85, to: 1 },
      duration: Phaser.Math.Between(180, 300),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const glow = s.add.image(x, baseY - 48, fxKey('light_01')).setDepth(DEPTH.counterDeco).setTint(0xffa733).setAlpha(0.3).setScale(0.55);
    glow.setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawJarShell(x: number, baseY: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.counterDeco + 1);
    g.fillStyle(0xdfe9ff, 0.22);
    g.fillRoundedRect(x - 26, baseY - 56, 52, 56, 12);
    g.lineStyle(2, 0xffffff, 0.55);
    g.strokeRoundedRect(x - 26, baseY - 56, 52, 56, 12);
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(x - 20, baseY - 50, 5, 34, 3);
    g.fillStyle(0xff8fc7, 1);
    g.fillRoundedRect(x - 22, baseY - 66, 44, 12, 5);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(x - 18, baseY - 64, 24, 2);
    // tag
    const t = this.scene.add
      .text(x, baseY - 28, 'TIPS', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', fontStyle: 'bold' })
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
      const y = Phaser.Math.Between(70, 200);
      const bat = this.makeBat(dir === 1 ? -40 : W + 40, y);
      const dur = Phaser.Math.Between(5200, 7600);
      s.tweens.add({ targets: bat, x: dir === 1 ? W + 40 : -40, duration: dur, onComplete: () => bat.destroy() });
      s.tweens.add({ targets: bat, y: y + Phaser.Math.Between(-30, 30), duration: dur / 3, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      s.time.delayedCall(Phaser.Math.Between(6000, 12000), fly);
    };
    s.time.delayedCall(1500, fly);
  }

  private makeBat(x: number, y: number): Phaser.GameObjects.Container {
    const s = this.scene;
    const c = s.add.container(x, y).setDepth(DEPTH.deco + 4);
    const body = s.add.graphics();
    body.fillStyle(0x110c26, 1);
    body.fillEllipse(0, 0, 11, 15);
    body.fillTriangle(-4, -6, -2, -6, -4, -13);
    body.fillTriangle(4, -6, 2, -6, 4, -13);
    body.fillStyle(0xff4fa3, 1);
    body.fillCircle(-2, -2, 1.2);
    body.fillCircle(2, -2, 1.2);
    const wing = (dir: 1 | -1): Phaser.GameObjects.Graphics => {
      const w = s.add.graphics();
      w.fillStyle(0x110c26, 1);
      w.fillTriangle(0, -2, dir * 26, -12, dir * 22, 4);
      w.fillTriangle(0, -2, dir * 22, 4, dir * 12, 10);
      w.fillTriangle(0, 0, dir * 12, 10, dir * 3, 8);
      return w;
    };
    const wl = wing(-1);
    const wr = wing(1);
    c.add([wl, wr, body]);
    s.tweens.add({ targets: [wl, wr], scaleY: 0.35, duration: 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }
}
