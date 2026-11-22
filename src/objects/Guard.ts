import Phaser from 'phaser';
import { GUARD_FULL_KEY } from '../assets';
import { DEPTH, GUARD, LAYOUT } from '../config';
import { speak } from '../ui/speech';

/** The full-body picture is 880 px tall (drawn at 2x). */
const PIC_H = 880;
/**
 * At the counter he is as big as the thief and his head is at the same height as the thief's: the thief's bust (head to
 * hands) is 270 px tall, which is 61% of a full body; his feet are far below the counter edge, so his legs are hidden.
 */
const FRONT_H = 270 / 0.611;
const FRONT_HEAD_TOP = LAYOUT.counterTop + 118 - 270;
const FRONT_FEET_Y = FRONT_HEAD_TOP + FRONT_H;

/**
 * The security guard the player can buy: the team's full-body drawing. He waits on the shop floor behind the counter
 * (small, far away, his whole body visible). When the thief grabs a cupcake he comes up to the counter: he grows as he
 * gets closer and his legs disappear behind the counter. Afterwards he walks back.
 */
export class Guard {
  readonly root: Phaser.GameObjects.Container;
  private readonly inner: Phaser.GameObjects.Container;
  private walking: Phaser.Time.TimerEvent | null = null;
  private readonly homeScale = GUARD.h / PIC_H;

  constructor(private readonly scene: Phaser.Scene) {
    const body = scene.add.image(0, 0, GUARD_FULL_KEY).setOrigin(0.5, 1);
    this.inner = scene.add.container(0, 0, [body]);
    // behind the counter, behind the customers (like the thief)
    this.root = scene.add.container(GUARD.x, GUARD.y, [this.inner]).setDepth(DEPTH.monster - 1).setScale(this.homeScale);
  }

  /** A little happy hop. */
  hop(height: number, ms: number): void {
    this.scene.tweens.add({ targets: this.inner, y: `-=${height}`, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Come up to the counter next to `x` (bigger and closer); `onArrive` runs when he is there. */
  approach(x: number, ms: number, onArrive?: () => void): void {
    this.move(x, FRONT_FEET_Y, FRONT_H / PIC_H, ms, onArrive);
  }

  /** Walk back to his place on the floor. */
  retreat(ms: number): void {
    this.move(GUARD.x, GUARD.y, this.homeScale, ms);
  }

  /** A short line in a speech bubble above his head (wherever he is right now). */
  say(text: string, ms = 1300): void {
    speak(this.scene, this.root.x, this.root.y - this.root.scaleY * PIC_H - 6, text, ms);
  }

  private move(x: number, y: number, scale: number, ms: number, onArrive?: () => void): void {
    this.walking?.remove();
    this.walking = this.scene.time.addEvent({ delay: 190, loop: true, callback: () => this.hop(14, 95) });
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      x,
      y,
      scale,
      duration: ms,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.walking?.remove();
        this.walking = null;
        onArrive?.();
      },
    });
  }
}
