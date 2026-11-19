import Phaser from 'phaser';
import { fxKey, stationKey } from '../assets';
import { COLORS, DEPTH, FONT, INK } from '../config';
import type { DoughId } from '../data/recipes';
import { T } from '../text';
import { drawCupcake, type CupcakeData } from './cupcake';

/** Displayed size of the oven picture (src/assets/stations/oven.png); its center is the slot's x, y. */
const OVEN_H = 172;
/** Glass window of the oven door, relative to the oven center (measured on the picture). */
const WIN = { dy: 19, w: 85, h: 50 };
/** Progress bar just under the window. */
const BAR = { dy: 53, w: 85, h: 8 };

/**
 * One oven slot. A dough goes in and bakes: raw until `cookSec`, cooked (and slowly browning) until `burnSec`,
 * then burnt. Click a cooked or burnt cupcake to take it out.
 * Look: the team's oven drawing; the cupcake shows in the door window, with a progress bar under it
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

  private readonly body: Phaser.GameObjects.Image;
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
    this.body = scene.add.image(x, y, stationKey('oven')).setDepth(DEPTH.station);
    this.body.setScale(OVEN_H / this.body.height);

    this.glow = scene.add
      .image(x, y + WIN.dy, fxKey('light_01'))
      .setDepth(DEPTH.station + 1)
      .setScale(0.7)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.dyn = scene.add.graphics().setDepth(DEPTH.station + 2);
    this.label = scene.add
      .text(x, y + 88, '', { fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold', stroke: '#2a1a3a', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH.station + 2);

    // smoke and steam rise from the top of the oven
    this.smoke = scene.add
      .particles(x, y - 50, fxKey('smoke_05'), {
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
      .particles(x, y - 50, fxKey('smoke_01'), {
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

    const zone = scene.add.zone(x, y, 110, OVEN_H).setInteractive({ useHandCursor: true });
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

    // window glass: warm when baking, green when cooked, dark when burnt (see-through over the drawing)
    const wx = x - WIN.w / 2;
    const wy = cy - WIN.h / 2;
    if (state) {
      const glass = state === 'burnt' ? 0x1a0f0f : state === 'ready' ? 0x2f6a4f : 0x8a3f18;
      dyn.fillStyle(glass, state === 'burnt' ? 0.75 : 0.45);
      dyn.fillRoundedRect(wx, wy, WIN.w, WIN.h, 5);
    }
    if (state === 'raw') {
      dyn.fillStyle(0xff9a3c, 0.45);
      dyn.fillEllipse(x, cy + 16, 56, 10);
    }
    if (this.cupcake) drawCupcake(dyn, x, cy + 12, this.cupcake, 0.48);
    if (this.selected) {
      dyn.lineStyle(4, 0xffffff, 0.95);
      dyn.strokeRoundedRect(wx - 6, wy - 6, WIN.w + 12, WIN.h + 12, 9);
    }

    // progress bar with a tick where the cupcake becomes cooked
    if (this.cupcake) {
      const bx = x - BAR.w / 2;
      const by = this.y + BAR.dy - BAR.h / 2;
      dyn.fillStyle(0x3a2a33, 1);
      dyn.fillRoundedRect(bx, by, BAR.w, BAR.h, 4);
      const color = state === 'raw' ? COLORS.warn : state === 'ready' ? COLORS.good : COLORS.bad;
      dyn.fillStyle(color, 1);
      dyn.fillRoundedRect(bx, by, Math.max(BAR.h, BAR.w * frac), BAR.h, 4);
      const tx = bx + BAR.w * (this.cookSec / this.burnSec);
      dyn.lineStyle(2, 0xffffff, 1);
      dyn.lineBetween(tx, by - 3, tx, by + BAR.h + 3);
      dyn.lineStyle(2, INK, 1);
      dyn.strokeRoundedRect(bx, by, BAR.w, BAR.h, 4);
    }

    if (!this.cupcake) this.label.setText('');
    else if (state === 'raw') this.label.setText(T.stillBaking).setColor('#ffd166');
    else if (state === 'ready') this.label.setText(T.ready).setColor('#7dffb0');
    else this.label.setText(T.burnt).setColor('#ff6b6b');
  }
}
