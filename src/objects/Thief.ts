import Phaser from 'phaser';
import { DEPTH, LAYOUT, STATION_X, W } from '../config';
import { SPECIAL_MONSTERS } from '../data/monsters';
import { MonsterView } from './MonsterView';

/** What happens when the thief reaches the ready tray. */
export type ThiefOutcome = 'steal' | 'empty' | 'caught';

/**
 * The thief does not take a counter seat: it runs along the front of the counter, grabs the cupcakes on the
 * ready tray and runs off. If a security guard is there, it gets caught instead.
 */
export class Thief {
  private readonly view: MonsterView;
  private done = false;

  constructor(private readonly scene: Phaser.Scene) {
    // a small full-body figure running on the table, in front of the tray row
    const y = LAYOUT.trayY - 44;
    this.view = new MonsterView(scene, W + 90, y, SPECIAL_MONSTERS.thief);
    this.view.root.setDepth(DEPTH.thief).setScale(0.6);
    this.view.face(-1);
    this.view.setMood('angry');
  }

  /**
   * Run in from the right, stop at the tray and ask the scene what happened (`decide` is called once, on arrival).
   * `onDone` runs when the thief has left the screen.
   */
  run(decide: () => ThiefOutcome, onDone: () => void): void {
    const root = this.view.root;
    const stopX = STATION_X.tray[1] + 90;
    const hops = this.scene.time.addEvent({ delay: 170, loop: true, callback: () => this.view.hop(12, 85) });

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
          this.view.shake();
          this.scene.time.delayedCall(900, () => this.finish(onDone));
        } else {
          this.view.setMood(outcome === 'steal' ? 'happy' : 'angry');
          if (outcome === 'empty') this.view.shake();
          this.scene.time.delayedCall(380, () => {
            this.view.face(1);
            const hops2 = this.scene.time.addEvent({ delay: 150, loop: true, callback: () => this.view.hop(12, 75) });
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

  /** Position of the thief (for effects). */
  get x(): number {
    return this.view.root.x;
  }

  get y(): number {
    return this.view.root.y;
  }

  destroy(): void {
    if (this.done) return;
    this.done = true;
    this.view.destroy();
  }

  private finish(onDone: () => void): void {
    if (this.done) return;
    this.done = true;
    this.scene.tweens.add({
      targets: this.view.root,
      alpha: 0,
      duration: 240,
      onComplete: () => {
        this.view.destroy();
        onDone();
      },
    });
  }
}
