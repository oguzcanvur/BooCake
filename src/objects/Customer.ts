import Phaser from 'phaser';
import { DEPTH, FONT, INK, LAYOUT } from '../config';
import { CONFIG } from '../data/gameConfig';
import type { MonsterDef, MonsterKind } from '../data/monsters';
import { doughInfo, frostingInfo, toppingInfo, type Order } from '../data/recipes';
import { drawTopping } from './cupcake';
import { placeCupcake } from './cupcakeArt';
import { MonsterView } from './MonsterView';
import { unsoftened } from '../softStyle';
import { T } from '../text';

export type CustomerMood = 'happy' | 'uneasy' | 'angry';

const BUBBLE = { w: 198, h: 120 };

/**
 * A monster customer waiting at the counter: a monster, an order bubble (the cupcake they want, with the
 * names of dough, frosting and topping) and a patience bar.
 * The monster's face shows its mood (happy -> uneasy -> angry) as patience drops.
 */
export class Customer {
  patience: number;
  /** The first-order guide freezes this customer's patience so there is time to read it. */
  frozen = false;
  readonly y = LAYOUT.customerY;

  private readonly monster: MonsterView;
  private readonly bubble: Phaser.GameObjects.Graphics;
  private readonly lines: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] = [];
  /** The cupcake picture on the order ticket. */
  private readonly cupPic: Phaser.GameObjects.Image;
  private ticketHidden = false;
  private readonly zone: Phaser.GameObjects.Zone;
  private disgustUntil = 0;
  private gone = false;
  /** What the ticket showed last time (it is only redrawn when this changes). */
  private lastKey = '';

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
    this.monster = new MonsterView(scene, x, this.y, def, { counter: true, scale: LAYOUT.customerScale });
    this.monster.root.setDepth(DEPTH.monster);
    this.monster.enter();

    const cy = LAYOUT.bubbleY;
    const bx = x + LAYOUT.bubbleDX;
    this.bubble = scene.add.graphics().setDepth(DEPTH.bubble);
    // a "surprise me" order has two lines of talk instead of three flavors (and no icons in front of them)
    const names = order.surprise ? T.surpriseLines : [doughInfo(order.dough).name, frostingInfo(order.frosting).name, toppingInfo(order.topping).name];
    const textX = order.surprise ? bx - 8 : bx + 14;
    // long names ("Yabanmersini") are squeezed to fit inside the bubble
    const maxW = order.surprise ? BUBBLE.w / 2 : BUBBLE.w / 2 - 22;
    names.forEach((name, i) => {
      const t = scene.add
        .text(textX, cy - 22 + i * 26 - (order.surprise ? 0 : 4 + i * 4), name, { fontFamily: FONT, fontSize: '16px', color: '#2b1d4f', fontStyle: 'bold' })
        .setOrigin(0, 0.5)
        .setDepth(DEPTH.bubble + 1);
      if (t.width > maxW) t.setScale(maxW / t.width, 1);
      this.lines.push(t);
    });
    // a big "?" on the surprise order's cupcake ("anything you like"); it fades in and out with the bubble
    if (order.surprise) {
      this.lines.push(
        scene.add
          .text(bx - BUBBLE.w / 2 + 50, cy + 8, '?', { fontFamily: FONT, fontSize: '56px', color: '#8a5cc4', fontStyle: 'bold', stroke: '#fff8ea', strokeThickness: 6 })
          .setOrigin(0.5)
          .setDepth(DEPTH.bubble + 1),
      );
    }

    this.cupPic = scene.add.image(0, 0, '__DEFAULT').setDepth(DEPTH.bubble + 1);
    this.lines.push(this.cupPic);

    this.zone = scene.add.zone(x, this.y + 10, 200, 230).setInteractive({ useHandCursor: true });
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
    if (!this.frozen) this.patience -= dt * speed;
    const mood = this.scene.time.now < this.disgustUntil ? 'angry' : this.mood;
    this.monster.setMood(mood === 'happy' ? 'happy' : mood === 'uneasy' ? 'neutral' : 'angry');
    // the character starts turning red once it stops being happy, fully red when patience runs out
    this.monster.setRedness(1 - this.fraction / CONFIG.mood.happyAbove);
    this.redraw();
  }

  /** Stop reacting to clicks (the customer is about to leave). */
  lock(): void {
    this.zone.disableInteractive();
  }

  /** Lose a share (0..1) of the full patience, e.g. 0.2 after a wrong cupcake. */
  hitPatience(share: number): void {
    if (this.frozen) return;
    this.patience -= this.maxPatience * share;
  }

  /** Make a sour face for a moment (vampire seeing garlic). */
  disgust(ms = 1600): void {
    this.disgustUntil = this.scene.time.now + ms;
    this.monster.shake();
  }

  /** Lunge at the player and hold for `holdMs` (the vampire's bite). */
  lunge(holdMs: number): void {
    // his face fills the screen: the order ticket waits out of sight until he is back
    this.setTicketVisible(false);
    this.monster.lunge(holdMs, () => this.setTicketVisible(true));
  }

  private setTicketVisible(v: boolean): void {
    if (this.gone) return;
    this.ticketHidden = !v;
    this.bubble.setVisible(v);
    this.lines.forEach((t) => t.setVisible(v));
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

  /** The order ticket: cream paper, the cupcake on a doily, an icon + name per part, and the patience bar. */
  private redraw(): void {
    const f = this.fraction;
    const mood = this.mood;
    // only rebuild the drawing when the bar moved a visible step or the mood changed
    const key = `${Math.round(f * 100)}|${mood}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    const g = this.bubble;
    const cx = this.x + LAYOUT.bubbleDX;
    const cy = LAYOUT.bubbleY;
    const left = cx - BUBBLE.w / 2;
    const top = cy - BUBBLE.h / 2 + 2;
    const r = 16;
    g.clear();

    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(left + 2, top + 6, BUBBLE.w, BUBBLE.h, r);
    // tail pointing left, toward the customer's face
    g.fillStyle(0xfff8ea, 1);
    g.fillTriangle(left + 2, cy - 14, left + 2, cy + 8, left - 18, cy + 4);
    g.lineStyle(2.5, INK, 1);
    g.lineBetween(left, cy - 14, left - 18, cy + 4);
    g.lineBetween(left - 18, cy + 4, left, cy + 8);
    g.fillStyle(0xfff8ea, 1);
    g.fillRoundedRect(left, top, BUBBLE.w, BUBBLE.h, r);
    // pink ribbon at the top
    g.fillStyle(0xff9ec9, 1);
    g.fillRoundedRect(left, top, BUBBLE.w, 10, { tl: r, tr: r, bl: 0, br: 0 });
    g.lineStyle(mood === 'angry' ? 3.5 : 2.5, mood === 'angry' ? 0xd83a52 : INK, 1);
    g.strokeRoundedRect(left, top, BUBBLE.w, BUBBLE.h, r);
    g.fillStyle(0xfff8ea, 1);
    g.fillRect(left - 1, cy - 12, 4, 18);

    // the cupcake on a lace doily
    const px = left + 50;
    g.fillStyle(0xece4fb, 1);
    g.fillCircle(px, cy + 8, 34);
    g.lineStyle(1.5, 0xd6caf0, 1);
    g.strokeCircle(px, cy + 8, 28);
    const o = this.order;
    if (o.surprise) {
      // no cupcake picture (a specific one would look like the order): only the big "?" on the doily
      this.cupPic.setVisible(false);
    } else {
      placeCupcake(this.cupPic, this.scene, { dough: o.dough, bake: 'ready', tone: 0.25, frosting: o.frosting, topping: o.topping }, px, cy + 14, 0.82);
    }
    if (this.ticketHidden) this.cupPic.setVisible(false);
    if (!o.surprise) this.drawIcons(g, cx, cy);

    this.drawPatience(g, left, top, f, mood);
  }

  /** An icon for each part of the order (the names are text objects next to them). */
  private drawIcons(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
    const o = this.order;
    const ix = cx + 2;
    const rows = [cy - 26, cy - 4, cy + 18];
    // dough and frosting icons use the exact colors of the bowl and bag pictures (no softening)
    unsoftened(() => {
      // dough: a little round of batter
      g.fillStyle(doughInfo(o.dough).icon, 1);
      g.fillCircle(ix, rows[0], 7);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(ix, rows[0], 7);
      // frosting: one piped dollop (round base, pointed tip, a swirl line)
      const dollop: Phaser.Math.Vector2[] = [];
      for (let k = 0; k <= 36; k++) {
        const t = (k / 36) * Math.PI * 2;
        dollop.push(new Phaser.Math.Vector2(ix + 8.5 * Math.sin(t) * Math.sin(t / 2), rows[1] + Math.min(5, -9 * Math.cos(t))));
      }
      g.fillStyle(frostingInfo(o.frosting).icon, 1);
      g.fillPoints(dollop, true);
      g.lineStyle(1.8, INK, 1);
      g.strokePoints(dollop, true, true);
      g.lineStyle(1.4, INK, 0.55);
      g.beginPath();
      g.arc(ix, rows[1] - 1, 4.5, Math.PI * 0.15, Math.PI * 0.85, false);
      g.strokePath();
    });
    // topping: the topping itself, small
    drawTopping(g, ix, rows[2], o.topping, 0.52);
  }

  private drawPatience(g: Phaser.GameObjects.Graphics, left: number, top: number, f: number, mood: string): void {
    // patience bar with an outline
    const bx = left + 14;
    const by = top + BUBBLE.h - 20;
    const bw = BUBBLE.w - 28;
    g.fillStyle(0x2b1d4f, 0.2);
    g.fillRoundedRect(bx, by, bw, 10, 5);
    if (f > 0.02) {
      g.fillStyle(mood === 'happy' ? 0x3fbf74 : mood === 'uneasy' ? 0xe6a22e : 0xd83a52, 1);
      g.fillRoundedRect(bx, by, Math.max(10, bw * f), 10, 5);
      g.fillStyle(0xffffff, 0.35);
      g.fillRoundedRect(bx + 3, by + 2, Math.max(4, bw * f - 6), 3, 1.5);
    }
    g.lineStyle(2, INK, 1);
    g.strokeRoundedRect(bx, by, bw, 10, 5);
  }
}
