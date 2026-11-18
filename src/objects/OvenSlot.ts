import Phaser from 'phaser';
import { fxKey } from '../assets';
import { COLORS, DEPTH, FONT } from '../config';
import type { DoughId } from '../data/recipes';
import { T } from '../text';
import { drawCupcake, type CupcakeData } from './cupcake';

/**
 * One oven slot. A dough goes in and bakes: raw until `cookSec`, cooked (and slowly browning) until `burnSec`,
 * then burnt. Click a cooked or burnt cupcake to take it out.
 * The window glows orange while baking, green when cooked, and smokes when burnt.
 * Emits scene events: 'cupcake-ready' and 'cupcake-burned' (x, y).
 */
export class OvenSlot {
  cupcake: CupcakeData | null = null;
  elapsed = 0;
  /** Highlighted by the player (a burnt cupcake waiting for the trash can). */
  selected = false;

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
      .image(x, y + 4, fxKey('light_01'))
      .setDepth(DEPTH.station + 1)
      .setScale(0.8)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.dyn = scene.add.graphics().setDepth(DEPTH.station + 2);
    this.label = scene.add
      .text(x, y + 84, '', { fontFamily: FONT, fontSize: '16px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.station + 2);

    this.smoke = scene.add
      .particles(x, y - 64, fxKey('smoke_05'), {
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
      .particles(x, y - 64, fxKey('smoke_01'), {
        speedY: { min: -36, max: -22 },
        speedX: { min: -8, max: 8 },
        lifespan: 1100,
        frequency: 650,
        scale: { start: 0.1, end: 0.3 },
        alpha: { start: 0.28, end: 0 },
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
    this.scene.tweens.add({
      targets: [this.body, this.dyn, this.label],
      x: 4,
      duration: 45,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.body.setX(0);
        this.dyn.setX(0);
        this.label.setX(this.x);
      },
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

  /** Static oven body: steel box, knobs, door, handle. */
  private drawBody(): void {
    const { x, y } = this;
    const g = this.body;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x, y + 76, 124, 14);
    g.fillStyle(0x6f7fa6, 1);
    g.fillRoundedRect(x - 56, y - 72, 112, 148, 14);
    g.fillStyle(0x93a4cc, 1);
    g.fillRoundedRect(x - 56, y - 72, 112, 26, { tl: 14, tr: 14, bl: 4, br: 4 });
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(x - 50, y - 68, 100, 5, 3);
    for (const kx of [-32, 32]) {
      g.fillStyle(0x2b2a4a, 1);
      g.fillCircle(x + kx, y - 58, 7);
      g.fillStyle(0x6a6a9a, 1);
      g.fillCircle(x + kx, y - 59, 5);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(x + kx - 1, y - 63, 2, 4);
    }
    g.fillStyle(0x4a567c, 1);
    g.fillRoundedRect(x - 48, y - 42, 96, 108, 10);
    g.fillStyle(0xd9e2ff, 1);
    g.fillRoundedRect(x - 32, y - 50, 64, 7, 3);
    g.fillStyle(0x2a3250, 1);
    g.fillRoundedRect(x - 42, y - 34, 84, 70, 10);
  }

  private redraw(): void {
    const { x, y, dyn } = this;
    dyn.clear();
    const state = this.cupcake?.bake;

    // window
    const windowColor = state === 'burnt' ? 0x0a0808 : state === 'ready' ? 0x1d3a2c : state === 'raw' ? 0x3a1f12 : 0x120a22;
    dyn.fillStyle(windowColor, 1);
    dyn.fillRoundedRect(x - 38, y - 30, 76, 62, 8);
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 260);
    if (state === 'raw') this.glow.setTint(0xff8a2a).setAlpha(0.35 + 0.2 * pulse);
    else if (state === 'ready') this.glow.setTint(0x7dffb0).setAlpha(0.4 + 0.25 * pulse);
    else this.glow.setAlpha(0);

    if (this.cupcake) {
      drawCupcake(dyn, x, y + 14, this.cupcake, 0.6);
      dyn.fillStyle(0xffffff, 0.1);
      dyn.fillTriangle(x - 38, y - 30, x - 8, y - 30, x - 38, y + 4);
    }
    if (this.selected) {
      dyn.lineStyle(4, 0xffffff, 0.95);
      dyn.strokeRoundedRect(x - 44, y - 36, 88, 74, 12);
    }

    // indicator lamp
    const lamp = state === 'ready' ? COLORS.good : state === 'raw' ? 0xff9f1c : state === 'burnt' ? COLORS.bad : 0x2b2a4a;
    dyn.fillStyle(lamp, 1);
    dyn.fillCircle(x, y - 58, 5);

    // progress bar on the door with a tick where the cupcake becomes cooked
    const barX = x - 34;
    const barY = y + 46;
    const barW = 68;
    dyn.fillStyle(0x1a2036, 1);
    dyn.fillRoundedRect(barX, barY, barW, 9, 4);
    if (this.cupcake) {
      const frac = Math.min(this.elapsed / this.burnSec, 1);
      const color = state === 'raw' ? COLORS.warn : state === 'ready' ? COLORS.good : COLORS.bad;
      dyn.fillStyle(color, 1);
      dyn.fillRoundedRect(barX, barY, Math.max(8, barW * frac), 9, 4);
      dyn.fillStyle(0xffffff, 1);
      dyn.fillRect(barX + (barW * this.cookSec) / this.burnSec - 1, barY - 2, 2, 13);
    }

    if (!this.cupcake) this.label.setText('');
    else if (state === 'raw') this.label.setText(T.stillBaking).setColor('#ffd166');
    else if (state === 'ready') this.label.setText(T.ready).setColor('#7dffb0');
    else this.label.setText(T.burnt).setColor('#ff6b6b');
  }
}
