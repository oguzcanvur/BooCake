import Phaser from 'phaser';
import { COLORS, DEPTH, FONT, LAYOUT } from '../config';
import { CONFIG } from '../data/gameConfig';
import type { MonsterDef, MonsterKind } from '../data/monsters';
import { doughInfo, frostingInfo, toppingInfo, type Order } from '../data/recipes';
import { drawCupcake } from './cupcake';
import { MonsterView } from './MonsterView';

export type CustomerMood = 'happy' | 'uneasy' | 'angry';

const BUBBLE = { w: 204, h: 120 };

/**
 * A monster customer waiting at the counter: a monster, an order bubble (the cupcake they want, with the
 * names of dough, frosting and topping) and a patience bar.
 * The monster's face shows its mood (happy -> uneasy -> angry) as patience drops.
 */
export class Customer {
  patience: number;
  readonly y = LAYOUT.customerY;

  private readonly monster: MonsterView;
  private readonly bubble: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Text[] = [];
  private readonly zone: Phaser.GameObjects.Zone;
  private disgustUntil = 0;
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

    const cy = LAYOUT.bubbleY;
    this.bubble = scene.add.graphics().setDepth(DEPTH.bubble);
    const names = [doughInfo(order.dough).name, frostingInfo(order.frosting).name, toppingInfo(order.topping).name];
    names.forEach((name, i) => {
      this.lines.push(
        scene.add
          .text(x + 14, cy - 26 + i * 22, name, { fontFamily: FONT, fontSize: '16px', color: '#2b1d4f', fontStyle: 'bold' })
          .setOrigin(0, 0.5)
          .setDepth(DEPTH.bubble + 1),
      );
    });

    this.zone = scene.add.zone(x, 250, 170, 180).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => onClick(this));

    // the bubble fades in just after the monster pops up
    this.bubble.setAlpha(0);
    this.lines.forEach((t) => t.setAlpha(0));
    scene.tweens.add({ targets: [this.bubble, ...this.lines], alpha: 1, delay: 250, duration: 200 });
    this.redraw();
  }

  get kind(): MonsterKind {
    return this.def.kind;
  }

  /** 1 = just arrived, 0 = about to leave. */
  get fraction(): number {
    return Math.max(0, this.patience / this.maxPatience);
  }

  get expired(): boolean {
    return this.patience <= 0;
  }

  /** Mood by patience (decides the tip): happy > 60%, uneasy > 30%, angry below. */
  get mood(): CustomerMood {
    const f = this.fraction;
    return f > CONFIG.mood.happyAbove ? 'happy' : f > CONFIG.mood.uneasyAbove ? 'uneasy' : 'angry';
  }

  update(dt: number): void {
    if (this.gone) return;
    // ghosts are patient: they lose patience more slowly
    const speed = this.def.kind === 'ghost' ? CONFIG.ghostPatienceFactor : 1;
    this.patience -= dt * speed;
    const mood = this.scene.time.now < this.disgustUntil ? 'angry' : this.mood;
    this.monster.setMood(mood === 'happy' ? 'happy' : mood === 'uneasy' ? 'neutral' : 'angry');
    this.redraw();
  }

  /** Stop reacting to clicks (the customer is about to leave). */
  lock(): void {
    this.zone.disableInteractive();
  }

  /** Lose a share (0..1) of the full patience, e.g. 0.2 after a wrong cupcake. */
  hitPatience(share: number): void {
    this.patience -= this.maxPatience * share;
  }

  /** Make a sour face for a moment (vampire seeing garlic). */
  disgust(ms = 1600): void {
    this.disgustUntil = this.scene.time.now + ms;
    this.monster.shake();
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
      targets: [this.bubble, ...this.lines],
      alpha: 0,
      duration: 220,
      onComplete: () => {
        this.bubble.destroy();
        this.lines.forEach((t) => t.destroy());
      },
    });
    this.monster.leave(kind, () => undefined);
  }

  /** Immediate cleanup (scene shutdown). */
  destroy(): void {
    this.gone = true;
    this.zone.destroy();
    this.bubble.destroy();
    this.lines.forEach((t) => t.destroy());
    this.monster.destroy();
  }

  private redraw(): void {
    const g = this.bubble;
    const f = this.fraction;
    const cx = this.x;
    const cy = LAYOUT.bubbleY;
    const left = cx - BUBBLE.w / 2;
    const top = cy - BUBBLE.h / 2 + 2;
    g.clear();

    g.fillStyle(0x000000, 0.18);
    g.fillRoundedRect(left, top + 4, BUBBLE.w, BUBBLE.h, 18);
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(left, top, BUBBLE.w, BUBBLE.h, 18);
    g.fillTriangle(cx - 11, top + BUBBLE.h - 1, cx + 11, top + BUBBLE.h - 1, cx, top + BUBBLE.h + 14);
    const mood = this.mood;
    if (mood === 'angry') {
      g.lineStyle(3, COLORS.bad, 1);
      g.strokeRoundedRect(left, top, BUBBLE.w, BUBBLE.h, 18);
    }

    // the order: the cupcake itself ...
    drawCupcake(g, cx - 54, cy + 4, { dough: this.order.dough, bake: 'ready', tone: 0.25, frosting: this.order.frosting, topping: this.order.topping }, 0.95);
    // ... and its three parts, each with a colored dot
    const dots = [doughInfo(this.order.dough).baked, frostingInfo(this.order.frosting).color, 0xffd166];
    dots.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillCircle(cx + 2, cy - 26 + i * 22, 5.5);
    });

    // patience bar
    g.fillStyle(0x2b1d4f, 0.25);
    g.fillRoundedRect(left + 16, top + BUBBLE.h - 22, BUBBLE.w - 32, 10, 5);
    g.fillStyle(mood === 'happy' ? COLORS.good : mood === 'uneasy' ? COLORS.warn : COLORS.bad, 1);
    if (f > 0.02) g.fillRoundedRect(left + 16, top + BUBBLE.h - 22, Math.max(10, (BUBBLE.w - 32) * f), 10, 5);
  }
}
