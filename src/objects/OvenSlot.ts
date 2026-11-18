import Phaser from 'phaser';
import { COLORS, FONT } from '../config';
import { drawCupcake, type CupcakeData } from './cupcake';

/**
 * One oven slot. Click when empty to start baking; click again when READY (or burnt) to pick it up.
 * Emits scene events: 'cupcake-ready' and 'cupcake-burned' (x, y).
 */
export class OvenSlot {
  cupcake: CupcakeData | null = null;
  elapsed = 0;

  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly x: number,
    readonly y: number,
    private readonly bakeSec: number,
    private readonly burnSec: number,
    onClick: (slot: OvenSlot) => void,
  ) {
    this.gfx = scene.add.graphics();
    this.label = scene.add
      .text(x, y + 48, '', { fontFamily: FONT, fontSize: '14px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const zone = scene.add.zone(x, y, 110, 124).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => onClick(this));
    this.redraw();
  }

  start(): void {
    this.cupcake = { bake: 'raw' };
    this.elapsed = 0;
    this.redraw();
  }

  take(): CupcakeData | null {
    const c = this.cupcake;
    this.cupcake = null;
    this.elapsed = 0;
    this.redraw();
    return c;
  }

  update(dt: number): void {
    if (!this.cupcake) return;
    this.elapsed += dt;
    const prev = this.cupcake.bake;
    this.cupcake.bake = this.elapsed >= this.burnSec ? 'burnt' : this.elapsed >= this.bakeSec ? 'ready' : 'raw';
    if (prev === 'raw' && this.cupcake.bake === 'ready') this.scene.events.emit('cupcake-ready', this.x, this.y);
    if (prev !== 'burnt' && this.cupcake.bake === 'burnt') this.scene.events.emit('cupcake-burned', this.x, this.y);
    this.redraw();
  }

  private redraw(): void {
    const { x, y, gfx } = this;
    gfx.clear();

    const ready = this.cupcake?.bake === 'ready';
    gfx.fillStyle(COLORS.panel, 1);
    gfx.fillRoundedRect(x - 55, y - 62, 110, 124, 12);
    if (ready) {
      gfx.lineStyle(4, COLORS.good, 1);
      gfx.strokeRoundedRect(x - 55, y - 62, 110, 124, 12);
    }
    // oven window
    gfx.fillStyle(0x120a22, 1);
    gfx.fillRoundedRect(x - 45, y - 52, 90, 74, 8);

    if (!this.cupcake) {
      this.label.setText('Click: bake').setColor('#b9a8e8');
      return;
    }

    drawCupcake(gfx, x, y - 6, this.cupcake, 1);

    // progress bar with a tick where the cupcake becomes ready
    const barX = x - 45;
    const barY = y + 30;
    const barW = 90;
    gfx.fillStyle(0x120a22, 1);
    gfx.fillRect(barX, barY, barW, 8);
    const frac = Math.min(this.elapsed / this.burnSec, 1);
    const color = this.cupcake.bake === 'raw' ? COLORS.warn : this.cupcake.bake === 'ready' ? COLORS.good : COLORS.bad;
    gfx.fillStyle(color, 1);
    gfx.fillRect(barX, barY, barW * frac, 8);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(barX + (barW * this.bakeSec) / this.burnSec - 1, barY - 2, 2, 12);

    if (this.cupcake.bake === 'raw') this.label.setText('Baking...').setColor('#ffd166');
    else if (this.cupcake.bake === 'ready') this.label.setText('READY!').setColor('#7dffb0');
    else this.label.setText('BURNT!').setColor('#ff6b6b');
  }
}
