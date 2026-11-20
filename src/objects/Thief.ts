import Phaser from 'phaser';
import { THIEF_FRAME, THIEF_KEYS } from '../assets';
import { DEPTH, LAYOUT, W } from '../config';
import { drawCupcake, type CupcakeData } from './cupcake';

/** What happens when the thief tries to grab: he steals, gets caught, or waits because nothing is ready yet. */
export type ThiefOutcome = 'steal' | 'wait' | 'caught';

/** Height of the thief on screen (world pixels; his legs are hidden behind the counter) and the stolen cupcake's size. */
const HEIGHT = 270;
const CUP_SCALE = 0.85;
/** His feet are this far below the counter edge, so he stands behind the counter like the customers. */
const FEET_BELOW_COUNTER = 118;

/**
 * The thief comes to the counter like a customer (he sneaks in behind it to a free seat), looks around for a
 * moment, then grabs the cupcakes on the ready tray and runs off holding one of them. He only shows up when a
 * cupcake is waiting on the tray; if it is gone by the time he arrives he waits, looking around, until there is
 * one again (he never leaves empty-handed). If a security
 * guard is there, he gets caught instead. It uses the team's drawings (standing / holding a cupcake); the
 * cupcake in his hand is drawn in code.
 */
export class Thief {
  private readonly root: Phaser.GameObjects.Container;
  private readonly inner: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly cup: Phaser.GameObjects.Graphics;
  private readonly hand: Phaser.GameObjects.Image;
  private done = false;
  /** The "waiting for a cupcake" line was already shown. */
  saidWaiting = false;

  constructor(private readonly scene: Phaser.Scene) {
    const s = HEIGHT / THIEF_FRAME.h;
    const F = THIEF_FRAME;
    const feetY = LAYOUT.counterTop + FEET_BELOW_COUNTER;
    // behind the counter (and just behind the customers, so he can sneak past them)
    this.root = scene.add.container(W + 120, feetY).setDepth(DEPTH.monster - 1);
    this.inner = scene.add.container(0, 0);
    this.body = scene.add.image(0, 0, THIEF_KEYS.stand).setOrigin(F.ox, 1).setScale(s);
    this.cup = scene.add.graphics().setVisible(false);
    this.cup.setPosition((F.cupX - F.ox) * F.w * s, -(1 - F.cupY) * F.h * s);
    this.hand = scene.add.image(0, 0, THIEF_KEYS.hand).setOrigin(F.ox, 1).setScale(s).setVisible(false);
    this.inner.add([this.body, this.cup, this.hand]);
    this.root.add(this.inner);
  }

  /** The thief holds this cupcake in his hand (switches to the "holding" picture). */
  holdCupcake(c: CupcakeData): void {
    if (this.done) return;
    this.body.setTexture(THIEF_KEYS.hold);
    this.cup.clear();
    drawCupcake(this.cup, 0, 0, c, CUP_SCALE);
    this.cup.setVisible(true);
    this.hand.setVisible(true);
  }

  private hop(height: number, ms: number): void {
    this.scene.tweens.add({ targets: this.inner, y: `-=${height}`, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
  }

  private shake(): void {
    this.scene.tweens.add({ targets: this.inner, x: '+=8', duration: 50, yoyo: true, repeat: 3 });
  }

  /**
   * Sneak in from the right to `stopX` at the counter, look around for a moment, then ask the scene what
   * happened (`decide` is called once). He leaves by the nearest side. `onDone` runs when he is gone.
   */
  run(stopX: number, decide: () => ThiefOutcome, onDone: () => void): void {
    const root = this.root;
    const hops = this.scene.time.addEvent({ delay: 170, loop: true, callback: () => this.hop(10, 85) });
    const exitX = stopX > W / 2 ? W + 140 : -140;

    this.scene.tweens.add({
      targets: root,
      x: stopX,
      duration: Math.max(900, ((W + 120 - stopX) / W) * 2200),
      ease: 'Sine.easeOut',
      onComplete: () => {
        hops.remove();
        // a sneaky look left and right before grabbing
        this.scene.tweens.add({ targets: this.inner, angle: { from: -6, to: 6 }, duration: 220, yoyo: true, repeat: 1, onComplete: () => this.inner.setAngle(0) });
        this.scene.time.delayedCall(900, () => this.act(decide, exitX, onDone));
      },
    });
  }

  /** Grab (or get caught), then run off by the nearest side. Nothing ready yet: look around and try again soon. */
  private act(decide: () => ThiefOutcome, exitX: number, onDone: () => void): void {
    if (this.done) return;
    const root = this.root;
    const outcome = decide();
    if (outcome === 'wait') {
      if (Math.random() < 0.35) this.scene.tweens.add({ targets: this.inner, angle: { from: -5, to: 5 }, duration: 240, yoyo: true, onComplete: () => this.inner.setAngle(0) });
      this.scene.time.delayedCall(500, () => this.act(decide, exitX, onDone));
      return;
    }
    if (outcome === 'caught') {
      // caught: wiggle in place, then vanish with a poof
      this.shake();
      this.scene.time.delayedCall(900, () => this.finish(onDone));
      return;
    }
    this.scene.time.delayedCall(380, () => {
      const hops = this.scene.time.addEvent({ delay: 150, loop: true, callback: () => this.hop(12, 75) });
      // the drawing faces left; running right he turns around
      if (exitX > root.x) this.inner.setScale(-1, 1);
      this.scene.tweens.add({
        targets: root,
        x: exitX,
        duration: 1300,
        ease: 'Quad.easeIn',
        onComplete: () => {
          hops.remove();
          this.finish(onDone);
        },
      });
    });
  }

  /** Position of the thief (for effects): about his chest. */
  get x(): number {
    return this.root.x;
  }

  get y(): number {
    return this.root.y - HEIGHT * 0.55;
  }

  destroy(): void {
    if (this.done) return;
    this.done = true;
    this.scene.tweens.killTweensOf([this.root, this.inner]);
    this.root.destroy();
  }

  private finish(onDone: () => void): void {
    if (this.done) return;
    this.done = true;
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration: 240,
      onComplete: () => {
        this.root.destroy();
        onDone();
      },
    });
  }
}
