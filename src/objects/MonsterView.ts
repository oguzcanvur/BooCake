import Phaser from 'phaser';
import { MONSTER_ATLAS } from '../assets';
import type { MonsterDef } from '../data/monsters';

export type Mood = 'happy' | 'neutral' | 'angry';

const MOUTH: Record<Mood, string> = {
  happy: 'mouthA',
  neutral: 'mouth_closed_teeth',
  angry: 'mouthF',
};

/**
 * A monster built from Kenney Monster Builder parts. Handles the face (mood), idle bobbing,
 * blinking and the enter / leave animations.
 * `root` is positioned at the center of the body; legs hang below it.
 */
export class MonsterView {
  readonly root: Phaser.GameObjects.Container;
  private readonly inner: Phaser.GameObjects.Container;
  private readonly baseScale: number;
  private readonly eyes: Phaser.GameObjects.Image[] = [];
  private readonly brows: Phaser.GameObjects.Image[] = [];
  private readonly mouth: Phaser.GameObjects.Image;
  private readonly blinkTimer: Phaser.Time.TimerEvent;
  private mood: Mood = 'happy';
  private gone = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly def: MonsterDef,
  ) {
    this.root = scene.add.container(x, y);
    this.inner = scene.add.container(0, 0);
    this.root.add(this.inner);

    const body = this.frameSize(`body_${def.color}${def.body}`);
    const bw = body.w;
    const bh = body.h;
    this.baseScale = def.targetH / bh;
    this.inner.setScale(this.baseScale);

    // legs and arms hang behind the body (feet / hands point outward, so the left side is mirrored)
    if (def.leg) {
      const name = `leg_${def.color}${def.leg}`;
      this.part(name, bw * 0.22, bh / 2 - 14, 0.4, 0.12, 1);
      this.part(name, -bw * 0.22, bh / 2 - 14, 0.4, 0.12, -1);
    }
    const armName = `arm_${def.color}${def.arm}`;
    this.part(armName, bw / 2 - 12, -bh * 0.1, 0.32, 0.1, 1);
    this.part(armName, -bw / 2 + 12, -bh * 0.1, 0.32, 0.1, -1);

    if (def.detail) {
      const d = def.detail;
      const name = `detail_${def.color}_${d.kind}`;
      const dy = -bh / 2 + bh * (d.y ?? 0.04);
      this.part(name, bw * d.x, dy, 0.2, 0.92, 1);
      this.part(name, -bw * d.x, dy, 0.2, 0.92, -1);
    }

    this.part(`body_${def.color}${def.body}`, 0, 0, 0.5, 0.5, 1);
    if (def.nose) this.part(def.nose, 0, bh * 0.02, 0.5, 0.5, 1, 0.9);

    // face
    const eyeY = -bh * 0.1;
    const eyeScale = def.eyeScale ?? 1;
    const eyeSpread = Math.min(bw * 0.22, 46);
    const eyeXs = def.eyes === 1 ? [0] : [-eyeSpread, eyeSpread];
    eyeXs.forEach((ex) => this.eyes.push(this.part(def.eyeFrame, ex, eyeY, 0.5, 0.5, 1, eyeScale)));
    this.mouth = this.part(MOUTH.happy, 0, bh * 0.16, 0.5, 0.5, 1, 0.95);
    // eyebrows only show when angry
    eyeXs.forEach((ex, i) => {
      const side = def.eyes === 1 ? 1 : i === 0 ? -1 : 1;
      const brow = this.part('eyebrowA', ex, eyeY - 34 * eyeScale, 0.5, 0.5, side, 1.0).setVisible(false);
      this.brows.push(brow);
    });

    if (def.alpha !== undefined) this.root.setAlpha(def.alpha);

    // idle motion
    const bob = def.hover ? 9 : 3;
    scene.tweens.add({
      targets: this.inner,
      y: -bob,
      duration: Phaser.Math.Between(800, 1200),
      delay: Phaser.Math.Between(0, 600),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.blinkTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(2200, 4800),
      loop: true,
      callback: () => this.blink(),
    });
  }

  setMood(mood: Mood): void {
    if (mood === this.mood || this.gone) return;
    this.mood = mood;
    this.mouth.setFrame(`${MOUTH[mood]}.png`);
    const angry = mood === 'angry';
    this.brows.forEach((b) => b.setVisible(angry));
    // calm eye frame, or the angry eye (single-color variants exist for red)
    const frame = angry && this.def.eyeFrame !== 'eye_red' ? 'eye_angry_red' : this.def.eyeFrame;
    this.eyes.forEach((e, i) => {
      e.setFrame(`${frame}.png`);
      if (angry && this.def.eyes === 2) e.setScale(i === 0 ? -Math.abs(e.scaleX) : Math.abs(e.scaleX), e.scaleY);
    });
  }

  /** Pop up from behind the counter. */
  enter(): void {
    const targetY = this.root.y;
    const targetAlpha = this.def.alpha ?? 1;
    this.root.setAlpha(0).setY(targetY + 50);
    this.scene.tweens.add({ targets: this.root, y: targetY, alpha: targetAlpha, duration: 420, ease: 'Back.easeOut' });
    this.inner.setScale(this.baseScale * 1.12, this.baseScale * 0.88);
    this.scene.tweens.add({
      targets: this.inner,
      scaleX: this.baseScale,
      scaleY: this.baseScale,
      duration: 520,
      ease: 'Elastic.easeOut',
    });
  }

  /** Short wiggle (wrong order, bitten, etc). */
  shake(): void {
    this.scene.tweens.add({ targets: this.root, x: `+=8`, duration: 50, yoyo: true, repeat: 3 });
  }

  /** Leave happily (hop away) or angrily (stomp and sink). Calls done() when finished. */
  leave(kind: 'happy' | 'angry', done: () => void): void {
    if (this.gone) return;
    this.gone = true;
    this.blinkTimer.remove();
    const finish = () => {
      this.scene.tweens.killTweensOf(this.inner);
      this.root.destroy();
      done();
    };
    if (kind === 'happy') {
      this.scene.tweens.add({ targets: this.root, y: this.root.y - 28, duration: 180, ease: 'Quad.easeOut', yoyo: true });
      this.scene.tweens.add({ targets: this.root, alpha: 0, delay: 260, duration: 300, onComplete: finish });
    } else {
      this.scene.tweens.add({ targets: this.root, x: '+=7', duration: 45, yoyo: true, repeat: 4 });
      this.scene.tweens.add({ targets: this.root, y: this.root.y + 70, alpha: 0, delay: 260, duration: 380, ease: 'Quad.easeIn', onComplete: finish });
    }
  }

  /** Remove immediately (scene shutdown). */
  destroy(): void {
    this.blinkTimer.remove();
    this.scene.tweens.killTweensOf([this.inner, this.root]);
    this.root.destroy();
  }

  private blink(): void {
    if (this.gone) return;
    this.scene.tweens.add({ targets: this.eyes, scaleY: 0.1, duration: 70, yoyo: true });
  }

  private frameSize(name: string): { w: number; h: number } {
    const f = this.scene.textures.getFrame(MONSTER_ATLAS, `${name}.png`);
    return { w: f.width, h: f.height };
  }

  /** Add one atlas part. flip = -1 mirrors it around its origin (used for the left arm / leg). */
  private part(
    name: string,
    x: number,
    y: number,
    ox: number,
    oy: number,
    flip: 1 | -1,
    scale = 1,
  ): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, MONSTER_ATLAS, `${name}.png`).setOrigin(ox, oy).setScale(scale * flip, scale);
    this.inner.add(img);
    return img;
  }
}
