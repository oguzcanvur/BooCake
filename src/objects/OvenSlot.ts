import Phaser from 'phaser';
import { fxKey } from '../assets';
import { COLORS, DEPTH, FONT } from '../config';
import { drawCupcake, type CupcakeData } from './cupcake';

/**
 * One oven. Click when empty to start baking; click again when READY (or burnt) to pick it up.
 * The window glows orange while baking, green when ready, and smokes when burnt.
 * Emits scene events: 'cupcake-ready' and 'cupcake-burned' (x, y).
 */
export class OvenSlot {
  cupcake: CupcakeData | null = null;
  elapsed = 0;

  private readonly dyn: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly steam: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
    private readonly bakeSec: number,
    private readonly burnSec: number,
    onClick: (slot: OvenSlot) => void,
  ) {
    this.drawBody();

    this.glow = scene.add
      .image(x, y + 6, fxKey('light_01'))
      .setDepth(DEPTH.station + 1)
      .setScale(0.85)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.dyn = scene.add.graphics().setDepth(DEPTH.station + 2);
    this.label = scene.add
      .text(x, y + 82, '', { fontFamily: FONT, fontSize: '15px', color: '#ffffff', fontStyle: 'bold' })
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

    const zone = scene.add.zone(x, y + 6, 124, 160).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => onClick(this));
    this.redraw();
  }

  start(): void {
    this.cupcake = { bake: 'raw' };
    this.elapsed = 0;
    this.steam.start();
    this.redraw();
  }

  take(): CupcakeData | null {
    const c = this.cupcake;
    this.cupcake = null;
    this.elapsed = 0;
    this.smoke.stop();
    this.steam.stop();
    this.redraw();
    return c;
  }

  update(dt: number): void {
    if (!this.cupcake) return;
    this.elapsed += dt;
    const prev = this.cupcake.bake;
    this.cupcake.bake = this.elapsed >= this.burnSec ? 'burnt' : this.elapsed >= this.bakeSec ? 'ready' : 'raw';
    if (prev === 'raw' && this.cupcake.bake === 'ready') this.scene.events.emit('cupcake-ready', this.x, this.y);
    if (prev !== 'burnt' && this.cupcake.bake === 'burnt') {
      this.steam.stop();
      this.smoke.start();
      this.scene.events.emit('cupcake-burned', this.x, this.y);
    }
    this.redraw();
  }

  /** Static oven body: steel box, knobs, door, handle. */
  private drawBody(): void {
    const { x, y } = this;
    const g = this.scene.add.graphics().setDepth(DEPTH.station);
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x, y + 74, 132, 14);
    g.fillStyle(0x6f7fa6, 1);
    g.fillRoundedRect(x - 60, y - 72, 120, 146, 14);
    g.fillStyle(0x93a4cc, 1);
    g.fillRoundedRect(x - 60, y - 72, 120, 26, { tl: 14, tr: 14, bl: 4, br: 4 });
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(x - 54, y - 68, 108, 5, 3);
    // knobs
    for (const kx of [-34, 34]) {
      g.fillStyle(0x2b2a4a, 1);
      g.fillCircle(x + kx, y - 58, 7);
      g.fillStyle(0x6a6a9a, 1);
      g.fillCircle(x + kx, y - 59, 5);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(x + kx - 1, y - 63, 2, 4);
    }
    // door
    g.fillStyle(0x4a567c, 1);
    g.fillRoundedRect(x - 52, y - 42, 104, 104, 10);
    g.fillStyle(0xd9e2ff, 1);
    g.fillRoundedRect(x - 34, y - 50, 68, 7, 3);
    // window frame
    g.fillStyle(0x2a3250, 1);
    g.fillRoundedRect(x - 44, y - 34, 88, 68, 10);
  }

  private redraw(): void {
    const { x, y, dyn } = this;
    dyn.clear();
    const state = this.cupcake?.bake;

    // window
    const windowColor = state === 'burnt' ? 0x0a0808 : state === 'ready' ? 0x1d3a2c : state === 'raw' ? 0x3a1f12 : 0x120a22;
    dyn.fillStyle(windowColor, 1);
    dyn.fillRoundedRect(x - 40, y - 30, 80, 60, 8);
    // glow
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.time.now / 260);
    if (state === 'raw') this.glow.setTint(0xff8a2a).setAlpha(0.35 + 0.2 * pulse);
    else if (state === 'ready') this.glow.setTint(0x7dffb0).setAlpha(0.4 + 0.25 * pulse);
    else this.glow.setAlpha(0);

    if (this.cupcake) {
      drawCupcake(dyn, x, y + 14, this.cupcake, 0.62);
      // window shine
      dyn.fillStyle(0xffffff, 0.1);
      dyn.fillTriangle(x - 40, y - 30, x - 8, y - 30, x - 40, y + 4);
    }

    // indicator lamp
    const lamp = state === 'ready' ? COLORS.good : state === 'raw' ? 0xff9f1c : state === 'burnt' ? COLORS.bad : 0x2b2a4a;
    dyn.fillStyle(lamp, 1);
    dyn.fillCircle(x, y - 58, 5);

    // progress bar on the door
    const barX = x - 38;
    const barY = y + 42;
    const barW = 76;
    dyn.fillStyle(0x1a2036, 1);
    dyn.fillRoundedRect(barX, barY, barW, 9, 4);
    if (this.cupcake) {
      const frac = Math.min(this.elapsed / this.burnSec, 1);
      const color = state === 'raw' ? COLORS.warn : state === 'ready' ? COLORS.good : COLORS.bad;
      dyn.fillStyle(color, 1);
      dyn.fillRoundedRect(barX, barY, Math.max(8, barW * frac), 9, 4);
      dyn.fillStyle(0xffffff, 1);
      dyn.fillRect(barX + (barW * this.bakeSec) / this.burnSec - 1, barY - 2, 2, 13);
    }

    if (!this.cupcake) this.label.setText('Click: bake').setColor('#b9a8e8');
    else if (state === 'raw') this.label.setText('Baking...').setColor('#ffd166');
    else if (state === 'ready') this.label.setText('READY!').setColor('#7dffb0');
    else this.label.setText('BURNT!').setColor('#ff6b6b');
  }
}
