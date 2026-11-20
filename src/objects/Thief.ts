import Phaser from 'phaser';
import { THIEF_FRAME, THIEF_KEYS } from '../assets';
import { DEPTH, LAYOUT, STATION_X, W } from '../config';
import { drawCupcake, type CupcakeData } from './cupcake';

/** What happens when the thief reaches the ready tray. */
export type ThiefOutcome = 'steal' | 'empty' | 'caught';

/** Height of the thief on screen (world pixels) and how big the stolen cupcake looks in his hand. */
const HEIGHT = 150;
const CUP_SCALE = 0.5;

/**
 * The thief does not take a counter seat: it runs along the front of the counter, grabs the cupcakes on the
 * ready tray and runs off holding one of them. If a security guard is there, it gets caught instead.
 * It uses the team's drawings (standing / holding a cupcake); the cupcake in his hand is drawn in code.
 */
export class Thief {
  private readonly root: Phaser.GameObjects.Container;
  private readonly inner: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Image;
  private readonly cup: Phaser.GameObjects.Graphics;
  private readonly hand: Phaser.GameObjects.Image;
  private done = false;

  constructor(private readonly scene: Phaser.Scene) {
    const s = HEIGHT / THIEF_FRAME.h;
    const F = THIEF_FRAME;
    const feetY = LAYOUT.trayY + 24;
    this.root = scene.add.container(W + 90, feetY).setDepth(DEPTH.thief);
    const shadow = scene.add.ellipse(0, -2, 96, 14, 0x000000, 0.22);
    this.inner = scene.add.container(0, 0);
    this.body = scene.add.image(0, 0, THIEF_KEYS.stand).setOrigin(F.ox, 1).setScale(s);
    this.cup = scene.add.graphics().setVisible(false);
    this.cup.setPosition((F.cupX - F.ox) * F.w * s, -(1 - F.cupY) * F.h * s);
    this.hand = scene.add.image(0, 0, THIEF_KEYS.hand).setOrigin(F.ox, 1).setScale(s).setVisible(false);
    this.inner.add([this.body, this.cup, this.hand]);
    this.root.add([shadow, this.inner]);
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
   * Run in from the right, stop at the tray and ask the scene what happened (`decide` is called once, on arrival).
   * `onDone` runs when the thief has left the screen.
   */
  run(decide: () => ThiefOutcome, onDone: () => void): void {
    const root = this.root;
    const stopX = STATION_X.tray[1] + 90;
    const hops = this.scene.time.addEvent({ delay: 170, loop: true, callback: () => this.hop(12, 85) });

    this.scene.tweens.add({
      targets: root,
      x: stopX,
      duration: 1900,
      ease: 'Sine.easeOut',
      onComplete: () => {
        hops.remove();
        const outcome = decide();
        if (outcome === 'caught') {
          // caught: wiggle in place, then vanish with a poof
          this.shake();
          this.scene.time.delayedCall(900, () => this.finish(onDone));
        } else {
          if (outcome === 'empty') this.shake();
          this.scene.time.delayedCall(380, () => {
            const hops2 = this.scene.time.addEvent({ delay: 150, loop: true, callback: () => this.hop(12, 75) });
            this.scene.tweens.add({
              targets: root,
              x: -120,
              duration: 1300,
              ease: 'Quad.easeIn',
              onComplete: () => {
                hops2.remove();
                this.finish(onDone);
              },
            });
          });
        }
      },
    });
  }

  /** Position of the thief (for effects): about his chest. */
  get x(): number {
    return this.root.x;
  }

  get y(): number {
    return this.root.y - 60;
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
