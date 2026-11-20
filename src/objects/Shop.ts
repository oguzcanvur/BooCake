import Phaser from 'phaser';
import { BG_SHOP, fxKey, stationKey } from '../assets';
import { COLORS, DEPTH, FONT, H, INK, LAYOUT, W } from '../config';
import { clothColors, hasDecoration } from '../data/decor';

const TOP = LAYOUT.counterTop;
/** Y of the counter edge inside the background painting (in the painting's own pixels). */
const BG_COUNTER_Y = 410;
const JAR_X = 1228;
const BEAM_Y = LAYOUT.hudH;
/** Warm palette for wood. */
const WOOD = { dark: 0x4a2c22, mid: 0x6e4430, light: 0x8d5a3d, top: 0xa66f4b };

/**
 * The bakery interior, layered back to front: the painted background (walls, window, shelves, display case),
 * counter with a cloth runner, workbench and a soft vignette. The counter and everything on it are vector art
 * drawn in code, with an ink outline and light coming from the top-left.
 */
export class Shop {
  private readonly jar: Phaser.GameObjects.Graphics;
  private jarFill = -1;
  private garlicShown = false;

  /** Where tips land (the jar opening), for coin animations. */
  readonly jarPos = { x: JAR_X, y: TOP - 56 };

  constructor(private readonly scene: Phaser.Scene) {
    this.drawWall();
    this.drawCounter();
    this.drawWorkbench();
    this.drawPumpkin(52, TOP);
    this.drawCandle(450, TOP);
    this.drawCandle(830, TOP);
    this.drawDecorations();
    this.jar = scene.add.graphics().setDepth(DEPTH.counterDeco);
    this.drawJarShell(JAR_X, TOP);
    this.setJar(0);
    this.startBats();
    this.startDust();
    this.drawVignette();
    this.update(0);
  }

  /** Day progress (t = 0..1). The painted background has no clock, so nothing moves yet. */
  update(_t: number): void {}

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
    // the team's garlic drawing, standing on the counter
    const x = 128;
    const shadow = this.scene.add.graphics().setDepth(DEPTH.counterDeco);
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillEllipse(x, TOP + 2, 70, 9);
    const garlic = this.scene.add.image(x, TOP + 3, stationKey('garlic')).setOrigin(0.5, 1).setDepth(DEPTH.counterDeco);
    garlic.setScale(54 / garlic.height);
  }

  // ------------------------------------------------------------------ back wall

  private drawWall(): void {
    const s = this.scene;
    // The team's painted shop interior, scaled to the screen width. Its own counter edge (BG_COUNTER_Y in the
    // painting) is lined up with the game's counter top, so customers stand right behind it.
    const bg = s.add.image(W / 2, 0, BG_SHOP).setOrigin(0.5, 0).setDepth(DEPTH.wall);
    const scale = W / bg.width;
    bg.setScale(scale).setY(TOP - BG_COUNTER_Y * scale);

    // Floor under the counter. It is drawn above the customers (so their legs stay hidden behind the
    // counter) but below the counter itself and the stations.
    const floorTop = TOP + 42;
    const f = s.add.graphics().setDepth(DEPTH.floor);
    f.fillStyle(0x2a1a2a, 1);
    f.fillRect(0, floorTop, W, H - floorTop);
  }








  /** Little hanging neon "OPEN" sign. */

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
    // runner (color chosen in Decorate) with a trim and a scalloped hem hanging over the front
    const CLOTH = clothColors();
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

  // ------------------------------------------------------------------ decorations (chosen in Decorate)

  private drawDecorations(): void {
    if (hasDecoration('webs')) this.drawWebs();
    if (hasDecoration('garland')) this.drawGarland();
    if (hasDecoration('lights')) this.drawLights();
    if (hasDecoration('pumpkin')) this.drawPumpkin(1146, TOP);
  }

  /** Cobwebs in the two top corners of the window, with a little spider on a thread. */
  private drawWebs(): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco);
    const web = (cx: number, cy: number, dir: 1 | -1) => {
      const r = 78;
      const angles = [0, 0.4, 0.8, 1.2, 1.57].map((a) => (dir === 1 ? a : Math.PI - a));
      g.lineStyle(1.6, 0xffffff, 0.75);
      for (const a of angles) g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      for (const k of [0.3, 0.55, 0.8, 1]) {
        g.beginPath();
        angles.forEach((a, i) => {
          const px = cx + Math.cos(a) * r * k;
          const py = cy + Math.sin(a) * r * k;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        });
        g.strokePath();
      }
    };
    web(290, BEAM_Y + 4, 1);
    web(990, BEAM_Y + 4, -1);
    // spider hanging from the right web, bobbing slowly
    const spider = s.add.container(950, BEAM_Y + 90).setDepth(DEPTH.deco + 1);
    const thread = s.add.graphics();
    thread.lineStyle(1.2, 0xffffff, 0.7);
    thread.lineBetween(0, -90, 0, -8);
    const body = s.add.graphics();
    body.lineStyle(1.6, INK, 1);
    for (const side of [-1, 1]) for (const dy of [-3, 0, 3]) body.lineBetween(0, dy, side * 11, dy + 4);
    body.fillStyle(0x2a1d33, 1);
    body.fillCircle(0, 0, 7);
    body.fillStyle(0xffffff, 1);
    body.fillCircle(-2.5, -2, 2);
    body.fillCircle(2.5, -2, 2);
    spider.add([thread, body]);
    s.tweens.add({ targets: spider, y: spider.y + 26, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** A bunting across the window: purple and orange pennants, with a little bat on every third one. */
  private drawGarland(): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.deco + 1);
    const x0 = 300;
    const x1 = 980;
    // below the painted pumpkin lanterns that hang from the top of the window
    const y0 = BEAM_Y + 60;
    const sag = 22;
    const at = (t: number) => ({ x: x0 + (x1 - x0) * t, y: y0 + Math.sin(t * Math.PI) * sag });
    g.lineStyle(2, INK, 1);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const p = at(i / 40);
      if (i === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    }
    g.strokePath();
    const n = 13;
    for (let i = 1; i < n; i++) {
      const p = at(i / n);
      const color = i % 2 ? 0x8a5cc8 : 0xff9a3c;
      g.fillStyle(color, 1);
      g.fillTriangle(p.x - 16, p.y, p.x + 16, p.y, p.x, p.y + 30);
      g.lineStyle(2, INK, 1);
      g.strokeTriangle(p.x - 16, p.y, p.x + 16, p.y, p.x, p.y + 30);
      if (i % 3 === 0) {
        // tiny bat stamped on the pennant
        g.fillStyle(0x1a1230, 1);
        g.fillEllipse(p.x, p.y + 10, 5, 6);
        g.fillTriangle(p.x - 1, p.y + 9, p.x - 9, p.y + 6, p.x - 6, p.y + 12);
        g.fillTriangle(p.x + 1, p.y + 9, p.x + 9, p.y + 6, p.x + 6, p.y + 12);
      }
    }
  }

  /** A string of twinkling colored bulbs hanging across the window. */
  private drawLights(): void {
    const s = this.scene;
    const g = s.add.graphics().setDepth(DEPTH.deco + 1);
    const x0 = 230;
    const x1 = 1050;
    const y0 = BEAM_Y + 132;
    const sag = 18;
    const at = (t: number) => ({ x: x0 + (x1 - x0) * t, y: y0 + Math.sin(t * Math.PI) * sag });
    g.lineStyle(1.8, 0x3a2a2a, 1);
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const p = at(i / 40);
      if (i === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    }
    g.strokePath();
    const colors = [0xffd166, 0xff8fc7, 0x8fffd0, 0xb98cff, 0xff9a3c];
    for (let i = 1; i < 18; i++) {
      const p = at(i / 18);
      const c = colors[i % colors.length];
      g.fillStyle(c, 1);
      g.fillEllipse(p.x, p.y + 8, 9, 12);
      g.lineStyle(1.5, INK, 1);
      g.strokeEllipse(p.x, p.y + 8, 9, 12);
      g.fillStyle(0x5a4a4a, 1);
      g.fillRect(p.x - 3, p.y, 6, 4);
      const glow = s.add.image(p.x, p.y + 8, fxKey('light_01')).setDepth(DEPTH.deco + 2).setTint(c).setScale(0.22).setAlpha(0.5);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: glow, alpha: 0.15, duration: Phaser.Math.Between(500, 1100), yoyo: true, repeat: -1, delay: i * 90 });
    }
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
