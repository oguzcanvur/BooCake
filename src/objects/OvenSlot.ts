import Phaser from 'phaser';
import { fxKey } from '../assets';
import { COLORS, DEPTH, FONT, INK } from '../config';
import type { DoughId } from '../data/recipes';
import { T } from '../text';
import { drawCupcake, shade, type CupcakeData } from './cupcake';

/** Window (porthole) of the oven, relative to the oven center. */
const WIN = { dy: 4, r: 33 };
/** Progress ring around the porthole. */
const RING_R = 42;

/**
 * One oven slot. A dough goes in and bakes: raw until `cookSec`, cooked (and slowly browning) until `burnSec`,
 * then burnt. Click a cooked or burnt cupcake to take it out.
 * Look: a cute cast-iron oven with a round glowing porthole and a progress ring around it
 * (yellow while baking, green when cooked, red when burnt; a white tick marks "cooked").
 * Emits scene events: 'cupcake-ready' and 'cupcake-burned' (x, y).
 */
export class OvenSlot {
  cupcake: CupcakeData | null = null;
  elapsed = 0;
  /** Highlighted by the player (a burnt cupcake waiting for the trash can). */
  selected = false;
  /** What was drawn last time, so the drawing is only rebuilt when it changes. */
  private lastKey = '';

  private readonly body: Phaser.GameObjects.Graphics;
  private readonly dyn: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly steam: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
    private readonly cookSec: number,
    private readonly burnSec: number,
    onClick: (slot: OvenSlot) => void,
  ) {
    this.body = scene.add.graphics().setDepth(DEPTH.station);
    this.drawBody();

    this.glow = scene.add
      .image(x, y + WIN.dy, fxKey('light_01'))
      .setDepth(DEPTH.station + 1)
      .setScale(0.9)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.dyn = scene.add.graphics().setDepth(DEPTH.station + 2);
    this.label = scene.add
      .text(x, y + 88, '', { fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#2a1a3a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH.station + 2);

    // smoke and steam rise from the top of the oven
    this.smoke = scene.add
      .particles(x + 16, y - 66, fxKey('smoke_05'), {
        speedY: { min: -70, max: -40 },
        speedX: { min: -14, max: 14 },
        lifespan: 1300,
        frequency: 180,
        scale: { start: 0.18, end: 0.55 },
        alpha: { start: 0.55, end: 0 },
        tint: 0x555060,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    this.steam = scene.add
      .particles(x + 16, y - 66, fxKey('smoke_01'), {
        speedY: { min: -36, max: -22 },
        speedX: { min: -8, max: 8 },
        lifespan: 1100,
        frequency: 650,
        scale: { start: 0.1, end: 0.3 },
        alpha: { start: 0.3, end: 0 },
        tint: 0xffffff,
        emitting: false,
      })
      .setDepth(DEPTH.fx);

    const zone = scene.add.zone(x, y + 6, 116, 166).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => onClick(this));
    this.redraw();
  }

  /** Put a dough in. */
  start(dough: DoughId): void {
    this.cupcake = { dough, bake: 'raw', tone: 0 };
    this.elapsed = 0;
    this.selected = false;
    this.steam.start();
    this.redraw();
  }

  take(): CupcakeData | null {
    const c = this.cupcake;
    this.cupcake = null;
    this.elapsed = 0;
    this.selected = false;
    this.smoke.stop();
    this.steam.stop();
    this.redraw();
    return c;
  }

  /** A small "I'm full" wiggle. */
  shake(): void {
    const parts = [this.body, this.dyn, this.label];
    const start = parts.map((p) => p.x);
    this.scene.tweens.add({
      targets: parts,
      x: '+=4',
      duration: 45,
      yoyo: true,
      repeat: 3,
      onComplete: () => parts.forEach((p, i) => p.setX(start[i])),
    });
  }

  update(dt: number): void {
    if (!this.cupcake) return;
    this.elapsed += dt;
    const c = this.cupcake;
    const prev = c.bake;
    c.bake = this.elapsed >= this.burnSec ? 'burnt' : this.elapsed >= this.cookSec ? 'ready' : 'raw';
    c.tone = c.bake === 'ready' ? Phaser.Math.Clamp((this.elapsed - this.cookSec) / (this.burnSec - this.cookSec), 0, 1) : c.bake === 'burnt' ? 1 : 0;
    if (prev === 'raw' && c.bake === 'ready') this.scene.events.emit('cupcake-ready', this.x, this.y);
    if (prev !== 'burnt' && c.bake === 'burnt') {
      this.steam.stop();
      this.smoke.start();
      this.scene.events.emit('cupcake-burned', this.x, this.y);
    }
    this.redraw();
  }

  /** Static oven: arched cast-iron body, feet, brass trim around the porthole. */
  private drawBody(): void {
    const { x, y } = this;
    const g = this.body;
    const iron = 0x6a6fa8;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x, y + 80, 124, 16);
    // feet
    for (const fx of [-38, 38]) {
      g.fillStyle(0x3a3560, 1);
      g.fillRoundedRect(x + fx - 9, y + 66, 18, 14, 4);
      g.lineStyle(2.5, INK, 1);
      g.strokeRoundedRect(x + fx - 9, y + 66, 18, 14, 4);
    }
    // body (arched top)
    g.fillStyle(shade(iron, -0.2), 1);
    g.fillRoundedRect(x - 56, y - 68, 112, 140, { tl: 44, tr: 44, bl: 16, br: 16 });
    g.fillStyle(iron, 1);
    g.fillRoundedRect(x - 56, y - 68, 104, 134, { tl: 44, tr: 40, bl: 16, br: 12 });
    g.fillStyle(0xffffff, 0.16);
    g.fillRoundedRect(x - 46, y - 60, 30, 70, 14);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(x - 56, y - 68, 112, 140, { tl: 44, tr: 44, bl: 16, br: 16 });
    // rivets
    g.fillStyle(0x9aa0d0, 1);
    for (const [rx, ry] of [[-44, 50], [44, 50], [-48, -20], [48, -20]]) g.fillCircle(x + rx, y + ry, 3);
    // brass trim ring and porthole
    g.fillStyle(0xc99a4a, 1);
    g.fillCircle(x, y + WIN.dy, RING_R + 6);
    g.fillStyle(0xe6bd6c, 1);
    g.fillCircle(x - 2, y + WIN.dy - 2, RING_R + 3);
    g.lineStyle(2.5, INK, 1);
    g.strokeCircle(x, y + WIN.dy, RING_R + 6);
    g.fillStyle(0x2a1d3a, 1);
    g.fillCircle(x, y + WIN.dy, RING_R);
    g.lineStyle(2, INK, 1);
    g.strokeCircle(x, y + WIN.dy, RING_R);
    // handle under the porthole
    g.fillStyle(0xd9dfef, 1);
    g.fillRoundedRect(x - 26, y + 52, 52, 8, 4);
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(x - 26, y + 52, 52, 8, 4);
  }

  private redraw(): void {
    const { x, dyn } = this;
    const cy = this.y + WIN.dy;
    const state = this.cupcake?.bake;

    // the glow pulses every frame (cheap: one image)
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 260);
    if (state === 'raw') this.glow.setTint(0xff8a2a).setAlpha(0.4 + 0.2 * pulse);
    else if (state === 'ready') this.glow.setTint(0x7dffb0).setAlpha(0.45 + 0.25 * pulse);
    else this.glow.setAlpha(0);

    // the vector drawing is only rebuilt when something visible changed
    const frac = this.cupcake ? Math.min(this.elapsed / this.burnSec, 1) : -1;
    const key = `${state}|${Math.round(frac * 120)}|${this.selected}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    dyn.clear();

    // porthole glass: warm when baking, green when cooked, black when burnt
    const glass = state === 'burnt' ? 0x0d0a0a : state === 'ready' ? 0x1f4a37 : state === 'raw' ? 0x5a2a12 : 0x1d1430;
    dyn.fillStyle(glass, 1);
    dyn.fillCircle(x, cy, WIN.r);
    if (state === 'raw') {
      dyn.fillStyle(0xff9a3c, 0.45);
      dyn.fillEllipse(x, cy + 22, 52, 12);
    }
    if (this.cupcake) drawCupcake(dyn, x, cy + 12, this.cupcake, 0.55);
    // glass shine
    dyn.fillStyle(0xffffff, 0.14);
    dyn.fillEllipse(x - 12, cy - 14, 26, 14);

    // progress ring with a tick where the cupcake becomes cooked
    dyn.lineStyle(7, 0x221833, 1);
    dyn.strokeCircle(x, cy, RING_R - 1);
    if (this.cupcake) {
      const color = state === 'raw' ? COLORS.warn : state === 'ready' ? COLORS.good : COLORS.bad;
      dyn.lineStyle(6, color, 1);
      dyn.beginPath();
      dyn.arc(x, cy, RING_R - 1, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
      dyn.strokePath();
      const a = -Math.PI / 2 + (this.cookSec / this.burnSec) * Math.PI * 2;
      dyn.lineStyle(3, 0xffffff, 1);
      dyn.lineBetween(x + Math.cos(a) * (RING_R - 6), cy + Math.sin(a) * (RING_R - 6), x + Math.cos(a) * (RING_R + 4), cy + Math.sin(a) * (RING_R + 4));
    }
    if (this.selected) {
      dyn.lineStyle(4, 0xffffff, 0.95);
      dyn.strokeCircle(x, cy, RING_R + 10);
    }

    // indicator lamp on top
    const lamp = state === 'ready' ? COLORS.good : state === 'raw' ? 0xff9f1c : state === 'burnt' ? COLORS.bad : 0x3a3560;
    dyn.fillStyle(lamp, 1);
    dyn.fillCircle(x - 20, this.y - 54, 6);
    dyn.lineStyle(2, INK, 1);
    dyn.strokeCircle(x - 20, this.y - 54, 6);
    if (state) {
      dyn.fillStyle(0xffffff, 0.6);
      dyn.fillCircle(x - 22, this.y - 56, 2);
    }

    if (!this.cupcake) this.label.setText('');
    else if (state === 'raw') this.label.setText(T.stillBaking).setColor('#ffd166');
    else if (state === 'ready') this.label.setText(T.ready).setColor('#7dffb0');
    else this.label.setText(T.burnt).setColor('#ff6b6b');
  }
}
