import Phaser from 'phaser';
import { fxKey } from '../assets';
import { COLORS, DEPTH, FONT, H, INK, LAYOUT, W } from '../config';

const TOP = LAYOUT.counterTop;
const JAR_X = 1228;
const BEAM_Y = LAYOUT.hudH;
/** Warm palette for wood and the plum wall. */
const WOOD = { dark: 0x4a2c22, mid: 0x6e4430, light: 0x8d5a3d, top: 0xa66f4b };
const WALL = { top: 0x45306e, bottom: 0x2c1f4d };
const CLOTH = { base: 0x6b3fa0, dark: 0x4e2b7a, trim: 0xd9a84e };

/**
 * The bakery interior, layered back to front: wall, windows with moonlight, shelves, string lights, lanterns,
 * counter with a cloth runner, workbench and a soft vignette. Everything is vector art drawn in code, with an
 * ink outline and light coming from the top-left.
 */
export class Shop {
  private readonly hands: Phaser.GameObjects.Graphics;
  private readonly jar: Phaser.GameObjects.Graphics;
  private readonly clock = { x: 82, y: 156, r: 40 };
  private jarFill = -1;
  private garlicShown = false;

  /** Where tips land (the jar opening), for coin animations. */
  readonly jarPos = { x: JAR_X, y: TOP - 56 };

  constructor(private readonly scene: Phaser.Scene) {
    this.drawWall();
    this.drawWindow(450, 0);
    this.drawWindow(830, 1);
    this.drawCeiling();
    this.drawStringLights();
    this.drawCobweb(26, BEAM_Y + 28, 1);
    this.drawCobweb(W - 26, BEAM_Y + 28, -1);
    this.drawLanterns();
    this.drawClockFace();
    this.hands = scene.add.graphics().setDepth(DEPTH.deco + 2);
    this.drawShelf(78, 262, 'left');
    this.drawShelf(1206, 262, 'right');
    this.drawSign(1206, 190);
    this.drawCounter();
    this.drawWorkbench();
    this.drawPumpkin(52, TOP);
    this.drawCandle(450, TOP);
    this.drawCandle(830, TOP);
    this.jar = scene.add.graphics().setDepth(DEPTH.counterDeco);
    this.drawJarShell(JAR_X, TOP);
    this.setJar(0);
    this.startBats();
    this.startDust();
    this.drawVignette();
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
    g.lineStyle(5, INK, 1);
    g.lineBetween(x, y, x + Math.cos(hAngle) * r * 0.48, y + Math.sin(hAngle) * r * 0.48);
    g.lineStyle(3.5, INK, 1);
    g.lineBetween(x, y, x + Math.cos(mAngle) * r * 0.74, y + Math.sin(mAngle) * r * 0.74);
    g.fillStyle(0xd9643a, 1);
    g.fillCircle(x, y, 4.5);
  }

  /** Fill the tip jar. fraction 0..1. */
  setJar(fraction: number): void {
    const f = Phaser.Math.Clamp(fraction, 0, 1);
    const level = Math.round(f * 22);
    if (level === this.jarFill) return;
    this.jarFill = level;
    const g = this.jar;
    g.clear();
    const baseY = TOP - 5;
    for (let i = 0; i < level; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cx = JAR_X - 14 + col * 14 + (row % 2) * 4;
      const cy = baseY - 6 - row * 5;
      g.fillStyle(0xc98b00, 1);
      g.fillEllipse(cx, cy + 1.5, 15, 7);
      g.fillStyle(COLORS.gold, 1);
      g.fillEllipse(cx, cy, 15, 7);
      g.lineStyle(1.2, 0x8a5a00, 1);
      g.strokeEllipse(cx, cy, 15, 7);
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
    const x = 128;
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x, TOP + 2, 66, 9);
    const bulb = (bx: number, by: number, s: number) => {
      g.fillStyle(0xefe6d2, 1);
      g.fillEllipse(bx, by, 26 * s, 24 * s);
      g.fillTriangle(bx - 4 * s, by - 9 * s, bx + 4 * s, by - 9 * s, bx, by - 19 * s);
      g.lineStyle(2, INK, 1);
      g.strokeEllipse(bx, by, 26 * s, 24 * s);
      g.lineStyle(1.5, 0xc4b89c, 1);
      g.lineBetween(bx, by - 10 * s, bx - 4 * s, by + 9 * s);
      g.lineBetween(bx, by - 10 * s, bx + 5 * s, by + 9 * s);
      g.fillStyle(0xffffff, 0.6);
      g.fillEllipse(bx - 5 * s, by - 3 * s, 7 * s, 6 * s);
    };
    bulb(x - 15, TOP - 12, 1);
    bulb(x + 15, TOP - 12, 1);
    bulb(x, TOP - 28, 1.05);
  }

  // ------------------------------------------------------------------ back wall

  private drawWall(): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.wall);
    g.fillGradientStyle(WALL.top, WALL.top, WALL.bottom, WALL.bottom, 1);
    g.fillRect(0, 0, W, TOP);
    // wallpaper: soft stripes with little diamonds
    g.fillStyle(0xffffff, 0.03);
    for (let x = 0; x < W; x += 64) g.fillRect(x, BEAM_Y, 30, TOP - BEAM_Y);
    g.fillStyle(0xf3d9ff, 0.06);
    for (let y = BEAM_Y + 44; y < TOP - 80; y += 46) {
      for (let x = ((y / 46) % 2) * 32 + 15; x < W; x += 64) {
        g.fillTriangle(x, y - 6, x + 5, y, x, y + 6);
        g.fillTriangle(x, y - 6, x - 5, y, x, y + 6);
      }
    }
    // wooden wainscot with vertical boards and a molding on top
    const wy = TOP - 70;
    g.fillGradientStyle(WOOD.mid, WOOD.mid, WOOD.dark, WOOD.dark, 1);
    g.fillRect(0, wy, W, 70);
    for (let x = 0; x < W; x += 40) {
      g.fillStyle(0x000000, 0.18);
      g.fillRect(x, wy + 10, 2, 60);
      g.fillStyle(0xffffff, 0.06);
      g.fillRect(x + 3, wy + 10, 2, 60);
    }
    g.fillStyle(WOOD.top, 1);
    g.fillRect(0, wy - 4, W, 12);
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(0, wy - 4, W, 3);
    g.lineStyle(2, INK, 0.8);
    g.lineBetween(0, wy + 8, W, wy + 8);

    // Floor under the counter. It is drawn above the customers (so their legs stay hidden behind the
    // counter) but below the counter itself and the stations.
    const floorTop = TOP + 42;
    const f = s.add.graphics().setDepth(DEPTH.floor);
    f.fillStyle(0x2a1a2a, 1);
    f.fillRect(0, floorTop, W, H - floorTop);
  }

  private drawCeiling(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 3);
    // a heavy wooden beam under the HUD and two posts at the sides
    g.fillGradientStyle(WOOD.light, WOOD.light, WOOD.dark, WOOD.dark, 1);
    g.fillRect(0, BEAM_Y, W, 22);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(0, BEAM_Y + 22, W, 6);
    g.lineStyle(2, INK, 1);
    g.lineBetween(0, BEAM_Y + 22, W, BEAM_Y + 22);
    g.lineStyle(1.5, 0x000000, 0.2);
    for (let x = 30; x < W; x += 170) g.lineBetween(x, BEAM_Y + 6, x + 90, BEAM_Y + 9);
    for (const px of [0, W - 18]) {
      g.fillGradientStyle(WOOD.mid, WOOD.light, WOOD.mid, WOOD.light, 1);
      g.fillRect(px, BEAM_Y, 18, TOP - 70 - BEAM_Y);
      g.lineStyle(2, INK, 1);
      g.strokeRect(px, BEAM_Y, 18, TOP - 70 - BEAM_Y);
    }
  }

  private drawWindow(cx: number, variant: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    const w = 128;
    const r = w / 2;
    const top = 112;
    const bottom = 264;
    // moonlit sky inside an arched frame
    const sky = (gg: Phaser.GameObjects.Graphics, inset: number) => {
      gg.fillRect(cx - r + inset, top, w - inset * 2, bottom - top);
      gg.fillCircle(cx, top, r - inset);
    };
    g.fillStyle(WOOD.dark, 1);
    sky(g, -10);
    g.fillGradientStyle(0x10123a, 0x10123a, 0x44338a, 0x44338a, 1);
    sky(g, 0);
    g.fillStyle(0xffffff, 0.9);
    for (const [sx, sy] of [[0.2, 0.05], [0.78, 0.18], [0.55, -0.12], [0.3, 0.42], [0.86, 0.5], [0.12, 0.62]]) {
      g.fillCircle(cx - r + w * sx, top + (bottom - top) * sy, 1.8);
    }
    // moon with a soft halo
    const mx = cx + (variant === 0 ? 22 : -20);
    const my = top + 6;
    const halo = s.add.image(mx, my, fxKey('light_01')).setDepth(DEPTH.deco + 1).setTint(0xfff0b0).setAlpha(0.5).setScale(1.2);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: halo, alpha: 0.32, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    g.fillStyle(0xfff4cc, 1);
    g.fillCircle(mx, my, 22);
    if (variant === 1) {
      g.fillStyle(0x1b1650, 1);
      g.fillCircle(mx + 10, my - 4, 19);
    } else {
      g.fillStyle(0xeedc9c, 1);
      g.fillCircle(mx - 6, my + 6, 4.5);
      g.fillCircle(mx + 7, my - 6, 3);
    }
    // spooky house and hills
    g.fillStyle(0x140f33, 1);
    g.fillTriangle(cx - r, bottom, cx - r + 50, bottom - 44, cx + 30, bottom);
    g.fillTriangle(cx - 10, bottom, cx + 40, bottom - 30, cx + r, bottom - 6);
    g.fillRect(cx - r, bottom - 6, w, 6);
    g.fillRect(cx + 18, bottom - 52, 22, 30);
    g.fillTriangle(cx + 14, bottom - 52, cx + 44, bottom - 52, cx + 29, bottom - 70);
    g.fillStyle(0xffd166, 0.9);
    g.fillRect(cx + 26, bottom - 44, 6, 7);
    // frame bars and outline
    g.lineStyle(7, WOOD.dark, 1);
    g.lineBetween(cx, top - r + 6, cx, bottom);
    g.lineBetween(cx - r, top + 40, cx + r, top + 40);
    g.lineStyle(3, INK, 1);
    g.beginPath();
    g.arc(cx, top, r + 10, Math.PI, 0, false);
    g.lineTo(cx + r + 10, bottom + 6);
    g.lineTo(cx - r - 10, bottom + 6);
    g.closePath();
    g.strokePath();
    // sill
    g.fillStyle(WOOD.top, 1);
    g.fillRoundedRect(cx - r - 20, bottom + 4, w + 40, 12, 4);
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(cx - r - 20, bottom + 4, w + 40, 12, 4);

    // purple drapes with folds and gold tie-backs
    const c = this.scene.add.graphics().setDepth(DEPTH.deco + 1);
    for (const side of [-1, 1]) {
      const ox = cx + side * (r + 4);
      const pts = [
        { x: ox - side * 4, y: top - r - 6 },
        { x: ox + side * 30, y: top - r - 6 },
        { x: ox + side * 22, y: bottom - 40 },
        { x: ox + side * 30, y: bottom + 2 },
        { x: ox - side * 2, y: bottom + 2 },
        { x: ox - side * 22, y: bottom - 46 },
      ];
      c.fillStyle(CLOTH.base, 1);
      c.fillPoints(pts as Phaser.Math.Vector2[], true);
      c.fillStyle(CLOTH.dark, 1);
      c.fillTriangle(ox + side * 8, top - r, ox + side * 14, top - r, ox + side * 6, bottom - 44);
      c.lineStyle(2.5, INK, 1);
      c.strokePoints(pts as Phaser.Math.Vector2[], true);
      c.fillStyle(CLOTH.trim, 1);
      c.fillRoundedRect(ox - side * 22 - 6 + (side > 0 ? 0 : 0), bottom - 52, 34, 9, 4);
    }
    // valance across the top
    c.fillStyle(CLOTH.base, 1);
    c.fillRoundedRect(cx - r - 22, top - r - 14, w + 44, 20, 8);
    for (let i = 0; i < 5; i++) c.fillCircle(cx - r - 10 + i * ((w + 20) / 4), top - r + 6, 10);
    c.lineStyle(2.5, INK, 1);
    c.strokeRoundedRect(cx - r - 22, top - r - 14, w + 44, 20, 8);
    c.fillStyle(CLOTH.trim, 1);
    c.fillRect(cx - r - 18, top - r - 2, w + 36, 3);

    // moonlight beam falling toward the counter
    const beam = this.scene.add.graphics().setDepth(DEPTH.monster + 2).setBlendMode(Phaser.BlendModes.ADD);
    beam.fillStyle(0xbfb2ff, 0.07);
    beam.fillPoints(
      [
        { x: cx - r + 10, y: top - 10 },
        { x: cx + r - 10, y: top - 10 },
        { x: cx + r - 70, y: TOP },
        { x: cx - r - 120, y: TOP },
      ] as Phaser.Math.Vector2[],
      true,
    );
    this.scene.tweens.add({ targets: beam, alpha: 0.6, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawStringLights(): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco + 4);
    const baseY = BEAM_Y + 24;
    const sag = 20;
    const seg = W / 4;
    const colors = [0xffd27a, 0xff9ec9, 0x9ef0d0, 0xc4a6ff];
    let n = 0;
    for (let si = 0; si < 4; si++) {
      const x0 = si * seg;
      const x1 = x0 + seg;
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        pts.push({ x: Phaser.Math.Linear(x0, x1, t), y: baseY + sag * Math.sin(Math.PI * t) });
      }
      g.lineStyle(2, INK, 0.9);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) g.lineTo(p.x, p.y);
      g.strokePath();
      for (let i = 2; i < 20; i += 4) {
        const p = pts[i];
        const col = colors[n++ % colors.length];
        g.fillStyle(INK, 1);
        g.fillRect(p.x - 2.5, p.y, 5, 4);
        g.fillStyle(col, 1);
        g.fillEllipse(p.x, p.y + 9, 9, 12);
        g.lineStyle(1.5, INK, 1);
        g.strokeEllipse(p.x, p.y + 9, 9, 12);
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(p.x - 1.5, p.y + 6, 1.5);
        const glow = s.add.image(p.x, p.y + 9, fxKey('light_01')).setDepth(DEPTH.deco + 3).setTint(col).setScale(0.32).setAlpha(0.45);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        s.tweens.add({ targets: glow, alpha: 0.2, duration: Phaser.Math.Between(900, 1600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
      }
    }
  }

  private drawLanterns(): void {
    const s = this.scene;
    for (const x of LAYOUT.customerSlotsX) {
      const g = s.add.graphics().setDepth(DEPTH.deco + 5);
      const y = BEAM_Y + 52;
      g.lineStyle(2, INK, 1);
      g.lineBetween(x, BEAM_Y + 22, x, y - 16);
      // cap, glass, base
      g.fillStyle(0x3a2a4a, 1);
      g.fillTriangle(x - 13, y - 10, x + 13, y - 10, x, y - 20);
      g.lineStyle(2, INK, 1);
      g.strokeTriangle(x - 13, y - 10, x + 13, y - 10, x, y - 20);
      g.fillStyle(0xffd27a, 1);
      g.fillRoundedRect(x - 10, y - 10, 20, 24, 4);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(x - 6, y - 7, 3, 16);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(x - 10, y - 10, 20, 24, 4);
      g.lineBetween(x, y - 10, x, y + 14);
      g.fillStyle(0x3a2a4a, 1);
      g.fillRoundedRect(x - 12, y + 13, 24, 6, 2);
      // light pool on the wall behind the customer
      const pool = s.add.image(x, y + 90, fxKey('light_01')).setDepth(DEPTH.wall + 1).setTint(0xffc98a).setAlpha(0.22).setScale(2.4);
      pool.setBlendMode(Phaser.BlendModes.ADD);
      const flame = s.add.image(x, y + 2, fxKey('light_01')).setDepth(DEPTH.deco + 6).setTint(0xffd27a).setAlpha(0.6).setScale(0.45);
      flame.setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: [flame, pool], alpha: '-=0.08', duration: Phaser.Math.Between(260, 420), yoyo: true, repeat: -1 });
      s.tweens.add({ targets: g, angle: { from: -2, to: 2 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private drawCobweb(x: number, y: number, dir: 1 | -1): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 2);
    g.lineStyle(1.5, 0xffffff, 0.28);
    const len = 100;
    const spokes = [0.05, 0.4, 0.75, 1.1, 1.45];
    for (const a of spokes) g.lineBetween(x, y, x + dir * Math.cos(a) * len, y + Math.sin(a) * len);
    for (let r = 24; r <= len; r += 24) {
      g.beginPath();
      spokes.forEach((a, i) => {
        const px = x + dir * Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px - dir * 3, py - 3);
      });
      g.strokePath();
    }
  }

  private drawClockFace(): void {
    const { x, y, r } = this.clock;
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 1);
    g.fillStyle(0x000000, 0.28);
    g.fillCircle(x + 4, y + 6, r + 10);
    // carved wooden case with bat wings
    g.fillStyle(WOOD.mid, 1);
    g.fillTriangle(x - r - 8, y - 6, x - r - 30, y - 26, x - r - 4, y + 16);
    g.fillTriangle(x + r + 8, y - 6, x + r + 30, y - 26, x + r + 4, y + 16);
    g.lineStyle(2.5, INK, 1);
    g.strokeTriangle(x - r - 8, y - 6, x - r - 30, y - 26, x - r - 4, y + 16);
    g.strokeTriangle(x + r + 8, y - 6, x + r + 30, y - 26, x + r + 4, y + 16);
    g.fillStyle(WOOD.light, 1);
    g.fillCircle(x, y, r + 9);
    g.lineStyle(3, INK, 1);
    g.strokeCircle(x, y, r + 9);
    g.fillStyle(0xfff3dc, 1);
    g.fillCircle(x, y, r);
    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(x - r * 0.35, y - r * 0.45, r * 0.7, r * 0.35);
    g.lineStyle(2.5, INK, 1);
    g.strokeCircle(x, y, r);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = i % 3 === 0 ? r - 11 : r - 7;
      g.lineStyle(i % 3 === 0 ? 3 : 2, INK, 1);
      g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3));
    }
  }

  private drawShelf(x: number, y: number, side: 'left' | 'right'): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 1);
    // plank with brackets
    g.fillStyle(WOOD.light, 1);
    g.fillRoundedRect(x - 58, y, 116, 10, 3);
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(x - 58, y, 116, 10, 3);
    g.fillStyle(WOOD.mid, 1);
    g.fillTriangle(x - 44, y + 10, x - 30, y + 10, x - 44, y + 26);
    g.fillTriangle(x + 44, y + 10, x + 30, y + 10, x + 44, y + 26);
    // potion bottles and candy jars
    const items =
      side === 'left'
        ? [
            { dx: -38, w: 18, h: 30, c: 0x8be7c9 },
            { dx: -12, w: 24, h: 24, c: 0xff9ec9 },
            { dx: 16, w: 16, h: 36, c: 0xc4a6ff },
            { dx: 38, w: 20, h: 22, c: 0xffd27a },
          ]
        : [
            { dx: -36, w: 22, h: 26, c: 0xffd27a },
            { dx: -10, w: 16, h: 34, c: 0x9ef0d0 },
            { dx: 14, w: 24, h: 22, c: 0xff9ec9 },
            { dx: 38, w: 16, h: 30, c: 0xb2a2ff },
          ];
    for (const it of items) {
      const bx = x + it.dx;
      const by = y - it.h;
      g.fillStyle(it.c, 0.9);
      g.fillRoundedRect(bx - it.w / 2, by, it.w, it.h, 6);
      g.fillStyle(0xffffff, 0.4);
      g.fillRoundedRect(bx - it.w / 2 + 3, by + 4, 3, it.h - 10, 2);
      g.lineStyle(2, INK, 1);
      g.strokeRoundedRect(bx - it.w / 2, by, it.w, it.h, 6);
      g.fillStyle(0x8a5a3c, 1);
      g.fillRoundedRect(bx - 5, by - 7, 10, 8, 2);
      g.strokeRoundedRect(bx - 5, by - 7, 10, 8, 2);
    }
  }

  /** Little hanging neon "OPEN" sign. */
  private drawSign(x: number, y: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    g.lineStyle(2, 0xd9c9f5, 0.6);
    g.lineBetween(x - 34, y - 24, x - 20, BEAM_Y + 22);
    g.lineBetween(x + 34, y - 24, x + 20, BEAM_Y + 22);
    g.fillStyle(0x15102b, 1);
    g.fillRoundedRect(x - 54, y - 26, 108, 52, 14);
    g.lineStyle(3, 0xff4fa3, 0.9);
    g.strokeRoundedRect(x - 54, y - 26, 108, 52, 14);
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
  }

  // ------------------------------------------------------------------ counter and workbench

  private drawCounter(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.counter);
    // shadow on the workbench
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0.45, 0, 0);
    g.fillRect(0, TOP + 42, W, 24);
    // front panel
    g.fillGradientStyle(WOOD.mid, WOOD.mid, WOOD.dark, WOOD.dark, 1);
    g.fillRect(0, TOP + 12, W, 32);
    // countertop slab with grain
    g.fillStyle(WOOD.top, 1);
    g.fillRect(0, TOP, W, 14);
    g.fillStyle(0xffffff, 0.22);
    g.fillRect(0, TOP, W, 3);
    g.lineStyle(1.2, 0x000000, 0.15);
    for (let x = 20; x < W; x += 150) g.lineBetween(x, TOP + 7, x + 70, TOP + 8);
    g.lineStyle(2, INK, 1);
    g.lineBetween(0, TOP, W, TOP);
    g.lineBetween(0, TOP + 13, W, TOP + 13);
    // purple runner with gold trim and a scalloped hem hanging over the front
    const cloth = this.scene.add.graphics().setDepth(DEPTH.counter + 1);
    cloth.fillStyle(CLOTH.base, 1);
    cloth.fillRect(0, TOP + 13, W, 16);
    for (let x = 16; x < W; x += 32) cloth.fillCircle(x, TOP + 29, 16);
    cloth.fillStyle(CLOTH.dark, 1);
    for (let x = 16; x < W; x += 32) cloth.fillCircle(x, TOP + 33, 9);
    cloth.fillStyle(CLOTH.base, 1);
    cloth.fillRect(0, TOP + 13, W, 20);
    cloth.fillStyle(CLOTH.trim, 1);
    cloth.fillRect(0, TOP + 15, W, 3);
    for (let x = 16; x < W; x += 64) {
      cloth.fillStyle(CLOTH.trim, 1);
      cloth.fillCircle(x, TOP + 26, 3);
    }
    cloth.lineStyle(2, INK, 1);
    cloth.lineBetween(0, TOP + 13, W, TOP + 13);
  }

  private drawWorkbench(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.floor + 1);
    const x = 10;
    const y = TOP + 46;
    const w = W - 20;
    const h = H - y - 6;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x, y + 6, w, h, 22);
    g.fillGradientStyle(0x845339, 0x845339, 0x5e3a29, 0x5e3a29, 1);
    g.fillRoundedRect(x, y, w, h, 22);
    // planks
    for (let py = y + 36; py < y + h; py += 46) {
      g.fillStyle(0x000000, 0.16);
      g.fillRect(x + 6, py, w - 12, 2);
      g.fillStyle(0xffffff, 0.05);
      g.fillRect(x + 6, py + 2, w - 12, 2);
    }
    g.lineStyle(1.2, 0x000000, 0.1);
    for (let i = 0; i < 18; i++) {
      const gx = x + 40 + ((i * 197) % (w - 120));
      const gy = y + 14 + ((i * 89) % (h - 30));
      g.lineBetween(gx, gy, gx + 60, gy + 2);
    }
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(x, y, w, 8, { tl: 22, tr: 22, bl: 0, br: 0 });
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(x, y, w, h, 22);
  }

  private drawPumpkin(x: number, baseY: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.counterDeco);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x, baseY + 1, 64, 11);
    for (const [dx, w, c] of [
      [-16, 30, 0xd9640a],
      [16, 30, 0xd9640a],
      [0, 38, 0xff8a1f],
    ] as const) {
      g.fillStyle(c, 1);
      g.fillEllipse(x + dx, baseY - 21, w, 42);
      g.lineStyle(2.5, INK, 1);
      g.strokeEllipse(x + dx, baseY - 21, w, 42);
    }
    g.fillStyle(0xffb86b, 0.6);
    g.fillEllipse(x - 8, baseY - 32, 10, 14);
    g.fillStyle(0x4f8a3a, 1);
    g.fillRoundedRect(x - 3, baseY - 50, 8, 12, 2);
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(x - 3, baseY - 50, 8, 12, 2);
    const face = s.add.graphics().setDepth(DEPTH.counterDeco + 1);
    face.fillStyle(0xffe066, 1);
    face.fillTriangle(x - 13, baseY - 28, x - 4, baseY - 28, x - 9, baseY - 37);
    face.fillTriangle(x + 4, baseY - 28, x + 13, baseY - 28, x + 9, baseY - 37);
    face.fillRoundedRect(x - 13, baseY - 18, 26, 9, 3);
    const glow = s.add.image(x, baseY - 24, fxKey('light_01')).setDepth(DEPTH.counterDeco + 1).setTint(0xffa733).setAlpha(0.35).setScale(0.6);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: [face, glow], alpha: '-=0.2', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private drawCandle(x: number, baseY: number): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.counterDeco);
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(x, baseY + 1, 36, 7);
    g.fillStyle(0xc99a4a, 1);
    g.fillRoundedRect(x - 14, baseY - 8, 28, 8, 3);
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(x - 14, baseY - 8, 28, 8, 3);
    g.fillStyle(0xf6ecd0, 1);
    g.fillRoundedRect(x - 7, baseY - 40, 14, 33, 3);
    g.fillStyle(0xffffff, 0.45);
    g.fillRect(x - 4, baseY - 37, 3, 26);
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(x - 7, baseY - 40, 14, 33, 3);
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
    const glow = s.add.image(x, baseY - 54, fxKey('light_01')).setDepth(DEPTH.counterDeco).setTint(0xffa733).setAlpha(0.35).setScale(0.8);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: glow, alpha: 0.22, duration: Phaser.Math.Between(300, 500), yoyo: true, repeat: -1 });
  }

  private drawJarShell(x: number, baseY: number): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.counterDeco + 1);
    g.fillStyle(0xdfe9ff, 0.2);
    g.fillRoundedRect(x - 28, baseY - 62, 56, 62, 13);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(x - 22, baseY - 56, 5, 38, 3);
    g.lineStyle(2.5, INK, 1);
    g.strokeRoundedRect(x - 28, baseY - 62, 56, 62, 13);
    g.fillStyle(0xff8fc7, 1);
    g.fillRoundedRect(x - 24, baseY - 74, 48, 14, 5);
    g.lineStyle(2.5, INK, 1);
    g.strokeRoundedRect(x - 24, baseY - 74, 48, 14, 5);
    g.fillStyle(0xfff3dc, 1);
    g.fillRoundedRect(x - 18, baseY - 38, 36, 14, 4);
    g.lineStyle(1.5, INK, 1);
    g.strokeRoundedRect(x - 18, baseY - 38, 36, 14, 4);
    this.scene.add
      .text(x, baseY - 31, 'TIPS', { fontFamily: FONT, fontSize: '11px', color: '#2a1a3a', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.counterDeco + 2);
  }

  // ------------------------------------------------------------------ ambience

  private startBats(): void {
    const s = this.scene;
    const fly = (): void => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y = Phaser.Math.Between(100, 250);
      const bat = this.makeBat(dir === 1 ? -40 : W + 40, y);
      const dur = Phaser.Math.Between(6000, 9000);
      s.tweens.add({ targets: bat, x: dir === 1 ? W + 40 : -40, duration: dur, onComplete: () => bat.destroy() });
      s.tweens.add({ targets: bat, y: y + Phaser.Math.Between(-34, 34), duration: dur / 3, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
      s.time.delayedCall(Phaser.Math.Between(7000, 13000), fly);
    };
    s.time.delayedCall(1500, fly);
  }

  private makeBat(x: number, y: number): Phaser.GameObjects.Container {
    const s = this.scene;
    const c = s.add.container(x, y).setDepth(DEPTH.deco + 4);
    const body = s.add.graphics();
    body.fillStyle(0x1a1230, 1);
    body.fillEllipse(0, 0, 12, 16);
    body.fillTriangle(-4, -6, -2, -6, -4, -14);
    body.fillTriangle(4, -6, 2, -6, 4, -14);
    body.fillStyle(0xff7ab8, 1);
    body.fillCircle(-2, -2, 1.4);
    body.fillCircle(2, -2, 1.4);
    const wing = (dir: 1 | -1): Phaser.GameObjects.Graphics => {
      const w = s.add.graphics();
      w.fillStyle(0x1a1230, 1);
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

  /** Slow magical dust drifting up in front of the wall. */
  private startDust(): void {
    this.scene.add
      .particles(0, 0, fxKey('star_04'), {
        x: { min: 0, max: W },
        y: { min: BEAM_Y + 40, max: TOP },
        speedY: { min: -14, max: -6 },
        speedX: { min: -6, max: 6 },
        lifespan: 5200,
        frequency: 420,
        scale: { start: 0.05, end: 0.01 },
        // fade in and out over the particle's life
        alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.8 },
        tint: [0xfff0b0, 0xd9c4ff, 0xffc6e4],
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.deco + 6);
  }

  /** Darkened edges to frame the scene (does not block clicks). */
  private drawVignette(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.hud - 1);
    const k = 0x0a0614;
    g.fillGradientStyle(k, k, k, k, 0.5, 0, 0.5, 0);
    g.fillRect(0, 0, 90, H);
    g.fillGradientStyle(k, k, k, k, 0, 0.5, 0, 0.5);
    g.fillRect(W - 90, 0, 90, H);
    g.fillGradientStyle(k, k, k, k, 0, 0, 0.45, 0.45);
    g.fillRect(0, H - 60, W, 60);
  }
}
