import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, LAYOUT } from '../config';
import type { MonsterDef } from '../data/monsters';
import { frostingInfo, toppingInfo, type FrostingId, type ToppingId } from '../data/recipes';
import { drawCupcake } from './cupcake';
import { MonsterView } from './MonsterView';

export interface Order {
  frosting: FrostingId;
  topping: ToppingId;
}

/**
 * A monster customer waiting at the counter: a monster, an order bubble and a patience bar.
 * The monster's face shows its mood (happy -> neutral -> angry) as patience drops.
 */
export class Customer {
  patience: number;
  readonly y = LAYOUT.customerY;

  private readonly monster: MonsterView;
  private readonly bubble: Phaser.GameObjects.Graphics;
  private readonly orderText: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private gone = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly slot: number,
    readonly x: number,
    readonly def: MonsterDef,
    private readonly maxPatience: number,
    readonly order: Order,
    onClick: (c: Customer) => void,
  ) {
    this.patience = maxPatience;
    this.monster = new MonsterView(scene, x, this.y, def);
    this.monster.root.setDepth(DEPTH.monster);
    this.monster.enter();

    this.bubble = scene.add.graphics().setDepth(DEPTH.bubble);
    this.orderText = scene.add
      .text(x - 6, LAYOUT.bubbleY - 8, `${frostingInfo(order.frosting).name}\n${toppingInfo(order.topping).name}`, {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#2b1d4f',
        fontStyle: 'bold',
        lineSpacing: 0,
      })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.bubble + 1);

    this.zone = scene.add.zone(x, 230, 150, 150).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => onClick(this));

    // the bubble fades in just after the monster pops up
    this.bubble.setAlpha(0);
    this.orderText.setAlpha(0);
    scene.tweens.add({ targets: [this.bubble, this.orderText], alpha: 1, delay: 250, duration: 200 });
    this.redraw();
  }

  /** 1 = just arrived, 0 = about to leave. Used for the tip. */
  get fraction(): number {
    return Math.max(0, this.patience / this.maxPatience);
  }

  get expired(): boolean {
    return this.patience <= 0;
  }

  /** Bubble (on screen) center, for effects. */
  get bubbleCenter(): { x: number; y: number } {
    return { x: this.x, y: LAYOUT.bubbleY };
  }

  update(dt: number): void {
    if (this.gone) return;
    this.patience -= dt;
    const f = this.fraction;
    this.monster.setMood(f > 0.55 ? 'happy' : f > 0.25 ? 'neutral' : 'angry');
    this.redraw();
  }

  /** Wiggle (wrong cupcake, etc). */
  shake(): void {
    this.monster.shake();
  }

  /** Remove the customer: happy = hop away, angry = stomp away. */
  leave(kind: 'happy' | 'angry'): void {
    if (this.gone) return;
    this.gone = true;
    this.zone.destroy();
    this.scene.tweens.add({
      targets: [this.bubble, this.orderText],
      alpha: 0,
      duration: 220,
      onComplete: () => {
        this.bubble.destroy();
        this.orderText.destroy();
      },
    });
    this.monster.leave(kind, () => undefined);
  }

  /** Immediate cleanup (scene shutdown). */
  destroy(): void {
    this.gone = true;
    this.zone.destroy();
    this.bubble.destroy();
    this.orderText.destroy();
    this.monster.destroy();
  }

  private redraw(): void {
    const g = this.bubble;
    const f = this.fraction;
    const cx = this.x;
    const cy = LAYOUT.bubbleY;
    g.clear();

    g.fillStyle(0x000000, 0.18);
    g.fillRoundedRect(cx - 72, cy - 44, 144, 94, 16);
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(cx - 72, cy - 48, 144, 94, 16);
    g.fillTriangle(cx - 10, cy + 45, cx + 10, cy + 45, cx, cy + 58);
    if (f < 0.25) {
      g.lineStyle(3, COLORS.bad, 1);
      g.strokeRoundedRect(cx - 72, cy - 48, 144, 94, 16);
    }

    drawCupcake(g, cx - 38, cy - 2, { bake: 'ready', frosting: this.order.frosting, topping: this.order.topping }, 0.72);

    // patience bar
    g.fillStyle(0x2b1d4f, 0.25);
    g.fillRoundedRect(cx - 58, cy + 26, 116, 10, 5);
    g.fillStyle(f > 0.55 ? COLORS.good : f > 0.25 ? COLORS.warn : COLORS.bad, 1);
    if (f > 0.02) g.fillRoundedRect(cx - 58, cy + 26, Math.max(10, 116 * f), 10, 5);
  }
}
