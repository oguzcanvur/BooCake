import Phaser from 'phaser';
import { COLORS, FONT } from '../config';
import { frostingInfo, toppingInfo, type FrostingId, type ToppingId } from '../data/recipes';
import { drawCupcake } from './cupcake';

export interface Order {
  frosting: FrostingId;
  topping: ToppingId;
}

/**
 * A monster customer waiting at the counter.
 * Gray-box art: the face shows mood (happy -> neutral -> angry) as patience drops.
 */
export class Customer {
  patience: number;

  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly orderText: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private gone = false;

  constructor(
    scene: Phaser.Scene,
    readonly slot: number,
    readonly x: number,
    readonly y: number,
    private readonly maxPatience: number,
    readonly order: Order,
    private readonly color: number,
    onClick: (c: Customer) => void,
  ) {
    this.patience = maxPatience;
    this.gfx = scene.add.graphics();
    this.orderText = scene.add
      .text(x - 4, y - 98, `${frostingInfo(order.frosting).name}\n${toppingInfo(order.topping).name}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#2b1d4f',
        fontStyle: 'bold',
        lineSpacing: 2,
      })
      .setOrigin(0, 0.5);
    this.zone = scene.add.zone(x, y, 150, 220).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => onClick(this));
    this.redraw();
  }

  /** 1 = just arrived, 0 = about to leave. Used for the tip. */
  get fraction(): number {
    return Math.max(0, this.patience / this.maxPatience);
  }

  get expired(): boolean {
    return this.patience <= 0;
  }

  update(dt: number): void {
    if (this.gone) return;
    this.patience -= dt;
    this.redraw();
  }

  /** Remove the customer with a short fade. */
  leave(scene: Phaser.Scene): void {
    this.gone = true;
    this.zone.destroy();
    scene.tweens.add({
      targets: [this.gfx, this.orderText],
      alpha: 0,
      y: '-=20',
      duration: 300,
      onComplete: () => {
        this.gfx.destroy();
        this.orderText.destroy();
      },
    });
  }

  private redraw(): void {
    const { x, y, gfx } = this;
    const f = this.fraction;
    gfx.clear();

    // order bubble
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRoundedRect(x - 72, y - 144, 144, 90, 12);
    gfx.fillTriangle(x - 10, y - 54, x + 10, y - 54, x, y - 42);
    drawCupcake(gfx, x - 40, y - 84, { bake: 'ready', frosting: this.order.frosting, topping: this.order.topping }, 0.75);

    // body + ears
    gfx.fillStyle(this.color, 1);
    gfx.fillTriangle(x - 40, y - 38, x - 24, y - 60, x - 12, y - 38);
    gfx.fillTriangle(x + 12, y - 38, x + 24, y - 60, x + 40, y - 38);
    gfx.fillRoundedRect(x - 46, y - 44, 92, 104, 18);

    // eyes
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(x - 17, y - 12, 11);
    gfx.fillCircle(x + 17, y - 12, 11);
    gfx.fillStyle(0x111111, 1);
    gfx.fillCircle(x - 17, y - 10, 5);
    gfx.fillCircle(x + 17, y - 10, 5);

    // mouth + brows by mood
    gfx.lineStyle(4, 0x222222, 1);
    if (f > 0.55) {
      gfx.beginPath();
      gfx.arc(x, y + 14, 14, 0, Math.PI, false);
      gfx.strokePath();
    } else if (f > 0.25) {
      gfx.lineBetween(x - 12, y + 28, x + 12, y + 28);
    } else {
      gfx.beginPath();
      gfx.arc(x, y + 38, 14, Math.PI, Math.PI * 2, false);
      gfx.strokePath();
      gfx.lineBetween(x - 28, y - 32, x - 8, y - 24);
      gfx.lineBetween(x + 28, y - 32, x + 8, y - 24);
    }

    // patience bar
    gfx.fillStyle(0x120a22, 1);
    gfx.fillRect(x - 46, y + 70, 92, 10);
    gfx.fillStyle(f > 0.55 ? COLORS.good : f > 0.25 ? COLORS.warn : COLORS.bad, 1);
    gfx.fillRect(x - 46, y + 70, 92 * f, 10);
  }
}
