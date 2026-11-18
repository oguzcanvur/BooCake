import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MonsterDef, Mood } from '../data/monsters';
import { shade } from './cupcake';

export type { Mood };

/** Outline color and width: the soft dark-plum line of the art style. */
const OUT = 0x4a3340;
const LINE = 3;
/** Head size (the drawing is centered on the middle of the head). */
const RX = 44;
const RY = 46;
/** Where the counter edge is, below the head center (hands rest there). */
export const COUNTER_OFFSET = 100;

type P = [number, number];
type G = Phaser.GameObjects.Graphics;

/** Filled polygon with the outline. */
function poly(g: G, pts: P[], fill: number, alpha = 1): void {
  const v = pts.map(([x, y]) => new Phaser.Math.Vector2(x, y));
  g.fillStyle(fill, alpha);
  g.fillPoints(v, true);
  g.lineStyle(LINE, OUT, 1);
  g.strokePoints(v, true);
}

function ellipse(g: G, x: number, y: number, w: number, h: number, fill: number, alpha = 1, outline = true): void {
  g.fillStyle(fill, alpha);
  g.fillEllipse(x, y, w, h);
  if (outline) {
    g.lineStyle(LINE, OUT, 1);
    g.strokeEllipse(x, y, w, h);
  }
}

function rrect(g: G, x: number, y: number, w: number, h: number, r: number | Phaser.Types.GameObjects.Graphics.RoundedRectRadius, fill: number): void {
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(LINE, OUT, 1);
  g.strokeRoundedRect(x, y, w, h, r);
}

/** Half width of the head ellipse at height y (to keep bandages inside the head). */
function headHalfWidth(y: number): number {
  const t = Math.min(1, Math.abs(y) / RY);
  return RX * Math.sqrt(1 - t * t);
}

export interface MonsterViewOptions {
  /** The monster stands behind the counter: its hands are drawn ON the counter (in front of it). */
  counter?: boolean;
  /** Overall size (1 = head 88 px wide). At the counter the hands sit COUNTER_OFFSET * scale below the head. */
  scale?: number;
}

/**
 * A monster drawn in code in a soft pastel cartoon style (thin dark outline, flat colors, rosy cheeks).
 * Handles the face (mood), idle bobbing, blinking and the enter / leave animations.
 * `root` is positioned at the center of the head.
 */
export class MonsterView {
  readonly root: Phaser.GameObjects.Container;
  /** Hands resting on the counter, drawn above the counter (only when standing at the counter). */
  private readonly front: Phaser.GameObjects.Container | null;
  private readonly inner: Phaser.GameObjects.Container;
  private readonly faceG: G;
  private readonly blinkTimer: Phaser.Time.TimerEvent;
  private mood: Mood = 'happy';
  private blinking = false;
  private gone = false;
  /** Standing behind the counter (long torso hidden by the counter) or a free-standing bust (cards, menus). */
  private readonly atCounter: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: MonsterDef,
    opts: MonsterViewOptions = {},
  ) {
    this.root = scene.add.container(x, y);
    this.inner = scene.add.container(0, 0);
    this.root.add(this.inner);
    this.atCounter = !!opts.counter;

    const body = scene.add.graphics();
    this.inner.add(body);
    this.drawBody(body);
    this.faceG = scene.add.graphics();
    this.inner.add(this.faceG);
    this.drawFace();

    // hands: on the counter (in front of it) or inside the drawing
    const hands = scene.add.graphics();
    if (def.pose === 'standing') {
      // drawn as part of the body
      hands.destroy();
      this.front = null;
    } else {
      this.drawCounterHands(hands);
      if (opts.counter) {
        this.front = scene.add.container(x, y).setDepth(DEPTH.counterDeco + 1);
        this.front.add(hands);
      } else {
        this.front = null;
        this.inner.add(hands);
      }
    }

    if (opts.scale !== undefined) this.parts().forEach((p) => p.setScale(opts.scale!));
    if (def.alpha !== undefined) this.parts().forEach((p) => p.setAlpha(def.alpha!));

    // idle motion: a gentle bob (bigger for the floating ghost)
    scene.tweens.add({
      targets: this.inner,
      y: def.hover ? -8 : -3,
      duration: Phaser.Math.Between(900, 1300),
      delay: Phaser.Math.Between(0, 600),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.blinkTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(2400, 4800),
      loop: true,
      callback: () => this.blink(),
    });
    // gentle breathing (starts after the pop-in animation)
    scene.time.delayedCall(650, () => {
      if (this.gone || !this.inner.active) return;
      scene.tweens.add({
        targets: this.inner,
        scaleY: 1.022,
        scaleX: 0.994,
        duration: Phaser.Math.Between(1500, 1900),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  setMood(mood: Mood): void {
    if (mood === this.mood || this.gone) return;
    this.mood = mood;
    this.drawFace();
  }

  /** Pop up from behind the counter. */
  enter(): void {
    const targetAlpha = this.def.alpha ?? 1;
    for (const p of this.parts()) {
      const ty = p.y;
      p.setAlpha(0).setY(ty + 50);
      this.scene.tweens.add({ targets: p, y: ty, alpha: targetAlpha, duration: 420, ease: 'Back.easeOut' });
    }
    this.inner.setScale(1.1, 0.9);
    this.scene.tweens.add({ targets: this.inner, scaleX: 1, scaleY: 1, duration: 520, ease: 'Elastic.easeOut' });
  }

  /** Short wiggle (wrong order, bitten, etc). */
  shake(): void {
    this.scene.tweens.add({ targets: this.parts(), x: `+=8`, duration: 50, yoyo: true, repeat: 3 });
  }

  /** A little jump (used while running). */
  hop(height = 14, ms = 130): void {
    this.scene.tweens.add({ targets: this.inner, y: `-=${height}`, duration: ms, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Flip to face the other way. */
  face(dir: 1 | -1): void {
    this.parts().forEach((p) => p.setScale(dir * Math.abs(p.scaleY), p.scaleY));
  }

  /** Leave happily (hop away) or angrily (stomp and sink). Calls done() when finished. */
  leave(kind: 'happy' | 'angry', done: () => void): void {
    if (this.gone) return;
    this.gone = true;
    this.blinkTimer.remove();
    const parts = this.parts();
    const finish = () => {
      this.scene.tweens.killTweensOf([this.inner, ...parts]);
      parts.forEach((p) => p.destroy());
      done();
    };
    if (kind === 'happy') {
      this.scene.tweens.add({ targets: parts, y: '-=28', duration: 180, ease: 'Quad.easeOut', yoyo: true });
      this.scene.tweens.add({ targets: parts, alpha: 0, delay: 260, duration: 300, onComplete: finish });
    } else {
      this.scene.tweens.add({ targets: parts, x: '+=7', duration: 45, yoyo: true, repeat: 4 });
      this.scene.tweens.add({ targets: parts, y: '+=80', alpha: 0, delay: 260, duration: 380, ease: 'Quad.easeIn', onComplete: finish });
    }
  }

  /** Remove immediately (scene shutdown). */
  destroy(): void {
    this.blinkTimer.remove();
    const parts = this.parts();
    this.scene.tweens.killTweensOf([this.inner, ...parts]);
    parts.forEach((p) => p.destroy());
  }

  private parts(): Phaser.GameObjects.Container[] {
    return this.front ? [this.root, this.front] : [this.root];
  }

  private blink(): void {
    if (this.gone) return;
    this.blinking = true;
    this.drawFace();
    this.scene.time.delayedCall(130, () => {
      this.blinking = false;
      if (!this.gone) this.drawFace();
    });
  }

  // ------------------------------------------------------------------ body

  private drawBody(g: G): void {
    const d = this.def;
    const type = d.outfit.type;
    const standing = d.pose === 'standing';

    if (type === 'sheet') return this.drawGhostBody(g);
    if (type === 'blob') return this.drawSlimeBody(g);

    if (type === 'cape') this.drawCapeCollar(g, 'back');
    if (standing) this.drawLegs(g);
    const longHair = d.hair?.style === 'long';
    // long hair hangs behind the body; a bob sits over the shoulders
    if (longHair) this.drawBackHair(g);
    this.drawTorso(g, standing);
    if (standing) this.drawArms(g);
    const extras = d.extras ?? [];
    if (longHair) this.drawFrontLocks(g);
    else this.drawBackHair(g);
    if (extras.includes('collar')) this.drawHighCollar(g);

    // neck
    g.fillStyle(shade(d.skin, -0.12), 1);
    g.fillRect(-13, 30, 26, 30);
    g.lineStyle(LINE, OUT, 1);
    g.lineBetween(-13, 34, -13, 54);
    g.lineBetween(13, 34, 13, 54);
    this.drawNeckline(g);
    if (type === 'cape') this.drawCapeCollar(g, 'front');
    if (extras.includes('scarf')) this.drawScarf(g);

    // ears: pointy (vampires) or round
    for (const s of [-1, 1]) {
      if (extras.includes('pointyEars')) {
        poly(g, [[s * 38, -8], [s * 66, -26], [s * 42, 20]], d.skin);
        g.fillStyle(shade(d.skin, -0.12), 1);
        g.fillTriangle(s * 44, -4, s * 58, -18, s * 46, 10);
      } else {
        ellipse(g, s * 44, 6, 18, 24, d.skin);
        g.lineStyle(2, shade(d.skin, -0.25), 1);
        g.lineBetween(s * 46, 0, s * 46, 12);
      }
    }
    // head with soft volume: a darker base, the lit skin shifted up-left, a highlight, then the outline
    g.fillStyle(shade(d.skin, -0.1), 1);
    g.fillEllipse(0, 0, RX * 2, RY * 2);
    g.fillStyle(d.skin, 1);
    g.fillEllipse(-3, -3, RX * 2 - 8, RY * 2 - 8);
    g.fillStyle(0xffffff, 0.16);
    g.fillEllipse(-16, -24, 30, 16);
    if (d.faceColor !== undefined) this.drawFaceGap(g, d.faceColor);
    g.lineStyle(LINE, OUT, 1);
    g.strokeEllipse(0, 0, RX * 2, RY * 2);
    this.drawHair(g);
    this.drawHeadExtras(g);
  }

  private drawTorso(g: G, standing: boolean): void {
    const d = this.def;
    const c = d.outfit.color;
    // at the counter the torso goes down behind it; a free bust ends just under the folded hands
    const bottom = standing ? 122 : this.atCounter ? 190 : 116;
    const half = standing ? 54 : 66;
    const round = this.atCounter && !standing ? 0 : 14;
    rrect(g, -half, 46, half * 2, bottom - 46, { tl: 38, tr: 38, bl: round, br: round }, c);

    switch (d.outfit.type) {
      case 'hoodie': {
        // hood around the neck and drawstrings
        ellipse(g, 0, 50, 92, 30, shade(c, -0.1));
        g.lineStyle(2, OUT, 0.85);
        g.lineBetween(-10, 62, -10, 92);
        g.lineBetween(10, 62, 10, 96);
        g.fillStyle(OUT, 0.85);
        g.fillRect(-11.5, 90, 3, 6);
        g.fillRect(8.5, 94, 3, 6);
        g.lineStyle(2, shade(c, -0.25), 0.6);
        g.lineBetween(-44, 70, -38, 100);
        g.lineBetween(30, 96, 46, 84);
        break;
      }
      case 'tee': {
        // short sleeves; the arms are bare
        ellipse(g, 0, 50, 92, 30, shade(c, -0.12));
        rrect(g, -half - 10, 52, 34, 40, 14, c);
        rrect(g, half - 24, 52, 34, 40, 14, c);
        g.lineStyle(2, shade(c, -0.3), 0.6);
        g.lineBetween(-40, 96, -34, 120);
        g.lineBetween(40, 96, 34, 120);
        break;
      }
      case 'sweater': {
        rrect(g, -26, 44, 52, 14, 6, shade(c, -0.12));
        g.lineStyle(2, shade(c, -0.25), 0.7);
        for (let x = -22; x <= 22; x += 6) g.lineBetween(x, 46, x, 56);
        g.lineStyle(2, shade(c, -0.2), 0.5);
        g.lineBetween(-50, 78, 50, 78);
        g.lineBetween(-56, 88, 56, 88);
        break;
      }
      case 'stripes': {
        g.fillStyle(0xf3eefb, 1);
        for (let y = 64; y < bottom - 6; y += 20) g.fillRect(-half + 2, y, half * 2 - 4, 9);
        g.lineStyle(LINE, OUT, 1);
        g.strokeRoundedRect(-half, 46, half * 2, bottom - 46, { tl: 38, tr: 38, bl: round, br: round });
        break;
      }
      case 'uniform': {
        poly(g, [[-20, 46], [0, 72], [-8, 80], [-30, 54]], 0xf3f0fa);
        poly(g, [[20, 46], [0, 72], [8, 80], [30, 54]], 0xf3f0fa);
        g.lineStyle(2, shade(c, -0.3), 0.8);
        g.lineBetween(0, 74, 0, bottom - 4);
        g.fillStyle(0xffc83d, 1);
        g.fillCircle(-24, 84, 7);
        g.lineStyle(2, OUT, 1);
        g.strokeCircle(-24, 84, 7);
        for (const y of [86, 102]) {
          g.fillStyle(0xffd96a, 1);
          g.fillCircle(6, y, 3);
        }
        break;
      }
      case 'cape': {
        // suit with a white shirt and a red bow tie
        poly(g, [[-16, 46], [16, 46], [0, 86]], 0xf6f2fc);
        poly(g, [[0, 58], [-12, 52], [-12, 66]], 0xd2405a);
        poly(g, [[0, 58], [12, 52], [12, 66]], 0xd2405a);
        g.fillStyle(0xd2405a, 1);
        g.fillCircle(0, 59, 4);
        break;
      }
      case 'wraps': {
        // overlapping bandage strips with old stains
        const strips = [56, 74, 92, 110, 128];
        strips.forEach((y, i) => {
          const tilt = i % 2 === 0 ? 7 : -6;
          g.lineStyle(13, OUT, 1);
          g.lineBetween(-half + 3, y - tilt, half - 3, y + tilt);
          g.lineStyle(9, i % 2 === 0 ? c : shade(c, -0.07), 1);
          g.lineBetween(-half + 3, y - tilt, half - 3, y + tilt);
        });
        g.fillStyle(0xb9a77e, 0.45);
        g.fillEllipse(-30, 70, 16, 9);
        g.fillEllipse(26, 98, 20, 10);
        g.fillEllipse(-12, 120, 12, 7);
        break;
      }
    }
  }

  private drawNeckline(g: G): void {
    const d = this.def;
    if (d.outfit.type === 'hoodie' || d.outfit.type === 'tee') {
      g.fillStyle(shade(d.skin, -0.12), 1);
      g.fillTriangle(-15, 46, 15, 46, 0, 72);
      g.lineStyle(LINE, OUT, 1);
      g.lineBetween(-15, 46, 0, 72);
      g.lineBetween(15, 46, 0, 72);
    }
  }

  private drawCapeCollar(g: G, layer: 'back' | 'front'): void {
    const c = this.def.outfit.color;
    if (layer === 'back') {
      // tall collar behind the head
      poly(g, [[-26, 40], [-86, -26], [-74, 58]], c);
      poly(g, [[26, 40], [86, -26], [74, 58]], c);
      poly(g, [[-30, 38], [-74, -10], [-66, 50]], 0xd2405a);
      poly(g, [[30, 38], [74, -10], [66, 50]], 0xd2405a);
    } else {
      // cape over the shoulders
      poly(g, [[-66, 70], [-30, 46], [-20, 120], [-70, 120]], c);
      poly(g, [[66, 70], [30, 46], [20, 120], [70, 120]], c);
    }
  }

  private drawLegs(g: G): void {
    const pants = this.def.kind === 'guard' ? 0x34406e : 0x3e3a56;
    rrect(g, -30, 112, 24, 44, 8, pants);
    rrect(g, 6, 112, 24, 44, 8, pants);
    ellipse(g, -20, 158, 34, 16, 0x2b2438);
    ellipse(g, 20, 158, 34, 16, 0x2b2438);
  }

  private drawArms(g: G): void {
    const c = this.def.outfit.color;
    for (const s of [-1, 1]) {
      rrect(g, s > 0 ? 46 : -68, 56, 22, 62, 10, shade(c, -0.05));
      ellipse(g, s * 57, 122, 22, 22, this.def.skin);
    }
  }

  private drawCounterHands(g: G): void {
    const d = this.def;
    const y = COUNTER_OFFSET;
    if (d.outfit.type === 'sheet' || d.outfit.type === 'blob') {
      ellipse(g, -30, y + 2, 34, 22, d.skin);
      ellipse(g, 30, y + 2, 34, 22, d.skin);
      return;
    }
    // short sleeves -> bare forearms
    const sleeve = d.outfit.type === 'cape' ? 0x3d3552 : d.outfit.type === 'tee' ? d.skin : d.outfit.color;
    rrect(g, -86, y - 14, 62, 28, 13, sleeve);
    rrect(g, 24, y - 14, 62, 28, 13, sleeve);
    // hands folded on the counter
    ellipse(g, 14, y + 2, 38, 22, d.skin);
    ellipse(g, -12, y + 4, 38, 22, d.skin);
    g.lineStyle(2, OUT, 0.7);
    g.lineBetween(-4, y - 2, -2, y + 8);
    g.lineBetween(4, y - 1, 6, y + 9);
  }

  /** Hair that hangs behind the face and over the shoulders (bob, long). Drawn before the neck and head. */
  private drawBackHair(g: G): void {
    const h = this.def.hair;
    if (!h) return;
    const back = shade(h.color, -0.08);
    if (h.style === 'bob') {
      poly(g, [[-56, -12], [-62, 20], [-64, 44], [-54, 58], [-42, 50], [-30, 58], [30, 58], [42, 50], [54, 58], [64, 44], [62, 20], [56, -12]], back);
    } else if (h.style === 'long') {
      // long messy hair with jagged ends below the shoulders
      const pts: P[] = [[-56, -18], [-62, 24], [-68, 70]];
      const ends = [-68, -54, -44, -30, 30, 44, 54, 68];
      ends.forEach((x, i) => pts.push([x, i % 2 === 0 ? 98 : 84]));
      pts.push([68, 70], [62, 24], [56, -18]);
      poly(g, pts, back);
    }
  }

  /** Two strands of long hair falling in front of the shoulders. */
  private drawFrontLocks(g: G): void {
    const h = this.def.hair;
    if (!h) return;
    const c = shade(h.color, -0.04);
    for (const s of [-1, 1]) {
      poly(g, [[s * 38, -10], [s * 58, -8], [s * 64, 36], [s * 62, 80], [s * 54, 70], [s * 48, 86], [s * 42, 64], [s * 38, 28]], c);
    }
  }

  /** Tall vampire collar standing up behind the neck. */
  private drawHighCollar(g: G): void {
    const c = shade(this.def.outfit.color, -0.05);
    poly(g, [[-12, 50], [-62, 8], [-58, 62], [-30, 66]], c);
    poly(g, [[12, 50], [62, 8], [58, 62], [30, 66]], c);
    g.fillStyle(shade(c, -0.18), 1);
    g.fillTriangle(-16, 50, -52, 18, -48, 56);
    g.fillTriangle(16, 50, 52, 18, 48, 56);
  }

  /** A cosy scarf around the neck with two hanging ends. */
  private drawScarf(g: G): void {
    const c = 0xb35f74;
    rrect(g, -18, 66, 18, 74, 7, shade(c, -0.08));
    rrect(g, 2, 64, 18, 66, 7, c);
    rrect(g, -32, 40, 64, 28, 13, c);
    g.lineStyle(2, shade(c, -0.25), 0.7);
    g.lineBetween(-20, 46, -14, 62);
    g.lineBetween(4, 46, 10, 62);
  }

  private drawHair(g: G): void {
    const h = this.def.hair;
    if (!h) return;
    switch (h.style) {
      case 'bob':
        // side-swept bangs framing the face
        poly(
          g,
          [
            [-50, 30], [-54, 0], [-50, -26], [-38, -46], [-18, -56], [4, -58], [26, -54], [44, -42], [52, -22], [54, 4],
            [50, 30], [44, 32], [42, 6], [38, -14], [28, -26], [14, -32], [-2, -28], [-14, -18], [-24, -6], [-34, 6],
            [-40, 20], [-42, 32],
          ],
          h.color,
        );
        g.lineStyle(2, shade(h.color, 0.25), 0.6);
        g.lineBetween(-30, -40, -14, -46);
        break;
      case 'spiky':
        // spiky hair with a widow's peak
        poly(
          g,
          [
            [-48, 8], [-52, -14], [-64, -24], [-50, -36], [-58, -56], [-36, -56], [-30, -76], [-12, -62], [0, -82], [12, -64],
            [28, -76], [36, -56], [60, -58], [50, -36], [64, -22], [52, -12], [48, 8], [40, -14], [24, -22], [8, -24], [0, -6],
            [-8, -24], [-24, -22], [-40, -14],
          ],
          h.color,
        );
        break;
      case 'long':
        // messy fringe on top; the long part is drawn behind (drawBackHair)
        poly(
          g,
          [
            [-50, 36], [-54, 0], [-50, -30], [-36, -50], [-16, -60], [0, -64], [8, -76], [16, -60], [36, -50], [50, -30],
            [54, 0], [50, 36], [44, 20], [42, -6], [32, -14], [26, 0], [18, -18], [8, -2], [0, -18], [-10, -4], [-18, -20],
            [-28, -4], [-34, -14], [-42, -2], [-44, 20],
          ],
          h.color,
        );
        g.lineStyle(2, shade(h.color, -0.25), 0.7);
        g.lineBetween(-22, -46, -14, -30);
        g.lineBetween(14, -48, 22, -32);
        break;
      case 'messy':
        poly(
          g,
          [
            [-48, 12], [-52, -14], [-50, -34], [-40, -50], [-28, -58], [-22, -72], [-12, -58], [0, -64], [6, -78], [14, -60],
            [28, -58], [38, -68], [40, -50], [50, -34], [53, -12], [48, 14], [42, -4], [34, -16], [26, -2], [18, -18], [8, -4],
            [0, -18], [-8, -4], [-16, -20], [-24, -4], [-32, -16], [-40, -2],
          ],
          h.color,
        );
        g.lineStyle(2, shade(h.color, -0.25), 0.7);
        g.lineBetween(-20, -46, -12, -30);
        g.lineBetween(12, -48, 20, -34);
        break;
      case 'slick':
        poly(
          g,
          [
            [-48, 8], [-50, -20], [-40, -44], [-20, -54], [0, -57], [20, -54], [40, -44], [50, -20], [48, 8], [40, -14],
            [24, -26], [8, -28], [0, -12], [-8, -28], [-24, -26], [-40, -14],
          ],
          h.color,
        );
        g.lineStyle(2, 0xffffff, 0.35);
        g.lineBetween(-28, -42, -12, -48);
        break;
      case 'fur':
        poly(
          g,
          [
            [-46, -4], [-48, -26], [-36, -44], [-18, -54], [0, -50], [18, -54], [36, -44], [48, -26], [46, -4], [36, -16],
            [26, -8], [16, -20], [6, -10], [-6, -20], [-16, -8], [-26, -20], [-36, -8],
          ],
          h.color,
        );
        break;
      case 'beanie':
        ellipse(g, 0, -34, 100, 64, h.color);
        rrect(g, -52, -28, 104, 18, 8, shade(h.color, 0.15));
        ellipse(g, 0, -70, 20, 20, 0xd2405a);
        break;
      case 'none':
        break;
    }
  }

  private drawHeadExtras(g: G): void {
    const d = this.def;
    const extras = d.extras ?? [];
    if (extras.includes('sprout')) {
      g.lineStyle(3, 0x5f9a5a, 1);
      g.lineBetween(12, -62, 16, -84);
      poly(g, [[16, -82], [4, -92], [-4, -88], [6, -80]], 0x9fd38f);
      poly(g, [[16, -84], [28, -98], [38, -92], [26, -82]], 0x9fd38f);
    }
    if (extras.includes('wolfEars')) {
      const fur = d.hair?.color ?? d.skin;
      poly(g, [[-46, -26], [-40, -76], [-12, -48]], fur);
      poly(g, [[46, -26], [40, -76], [12, -48]], fur);
      g.fillStyle(0xf2b8c6, 1);
      g.fillTriangle(-38, -36, -36, -62, -20, -46);
      g.fillTriangle(38, -36, 36, -62, 20, -46);
    }
    if (extras.includes('batClip')) {
      // a little bat hair clip
      poly(g, [[22, -38], [30, -46], [34, -40], [40, -48], [46, -40], [52, -46], [56, -36], [44, -32], [39, -36], [34, -32]], 0xd6c4ee);
    }
    if (extras.includes('cap')) {
      ellipse(g, 0, -38, 98, 52, d.outfit.color);
      rrect(g, -50, -34, 100, 16, 6, shade(d.outfit.color, -0.2));
      ellipse(g, 10, -18, 84, 16, 0x2b2f4e);
      g.fillStyle(0xffc83d, 1);
      g.fillCircle(0, -46, 7);
      g.lineStyle(2, OUT, 1);
      g.strokeCircle(0, -46, 7);
    }
  }

  private drawGhostBody(g: G): void {
    const d = this.def;
    // a sheet: round dome on top, wavy hem far below (hidden by the counter)
    const pts: P[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI;
      pts.push([Math.cos(a) * 52, Math.sin(a) * 56]);
    }
    pts.push([60, 60], [70, 150]);
    for (let i = 0; i <= 6; i++) pts.push([70 - i * 23.3, 150 + (i % 2 === 0 ? 0 : 14)]);
    pts.push([-60, 60]);
    poly(g, pts, d.skin, 1);
    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(-20, -30, 18, 12);
  }

  private drawSlimeBody(g: G): void {
    const d = this.def;
    const pts: P[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI + (i / 18) * Math.PI;
      pts.push([Math.cos(a) * 54, Math.sin(a) * 58]);
    }
    pts.push([62, 40], [80, 140], [-80, 140], [-62, 40]);
    poly(g, pts, d.skin, 1);
    // drips and shine
    ellipse(g, -46, 52, 12, 20, d.skin);
    ellipse(g, 40, 66, 10, 16, d.skin);
    g.fillStyle(0xffffff, 0.55);
    g.fillEllipse(-22, -30, 22, 14);
    g.fillCircle(-36, -12, 4);
  }

  // ------------------------------------------------------------------ face

  private drawFace(): void {
    const g = this.faceG;
    const d = this.def;
    const mood = this.mood;
    const extras = d.extras ?? [];
    g.clear();

    if (extras.includes('bandage')) this.drawBandages(g);
    if (extras.includes('mask')) rrect(g, -42, -10, 84, 24, 11, 0x2b2438);

    // rosy cheeks (redder when angry)
    g.fillStyle(mood === 'angry' ? 0xff6b7d : 0xff9aaa, mood === 'angry' ? 0.75 : 0.55);
    g.fillEllipse(-27, 20, 18, 11);
    g.fillEllipse(27, 20, 18, 11);

    // eyes
    for (const s of [-1, 1]) this.drawEye(g, s * 18, 3, s);

    // brows: soft when happy, worried when uneasy, slanted down when angry
    g.lineStyle(mood === 'angry' ? 4 : 3, OUT, 0.9);
    for (const s of [-1, 1]) {
      const ex = s * 18;
      if (mood === 'happy') g.lineBetween(ex - 8, -12, ex + 8, -13);
      else if (mood === 'neutral') g.lineBetween(ex - s * 8, -10, ex + s * 8, -16);
      else g.lineBetween(ex - s * 9, -18, ex + s * 7, -9);
    }

    // nose
    switch (d.nose) {
      case 'skull':
        g.fillStyle(shade(d.skin, -0.15), 1);
        g.fillTriangle(0, 10, -7, 22, 7, 22);
        g.lineStyle(2.5, OUT, 1);
        g.strokeTriangle(0, 10, -7, 22, 7, 22);
        g.fillStyle(OUT, 0.9);
        g.fillEllipse(-2.5, 19, 3.5, 5);
        g.fillEllipse(2.5, 19, 3.5, 5);
        break;
      case 'dot':
        g.fillStyle(OUT, 0.55);
        g.fillEllipse(0, 15, 6, 4);
        break;
      case 'snout':
        ellipse(g, 0, 22, 38, 26, shade(d.skin, 0.25));
        g.fillStyle(OUT, 1);
        g.fillEllipse(0, 13, 14, 9);
        break;
      case 'line':
        g.lineStyle(2.5, OUT, 0.9);
        g.beginPath();
        g.arc(1, 14, 5, -0.4 * Math.PI, 0.55 * Math.PI, false);
        g.strokePath();
        break;
      case 'pink':
        ellipse(g, 1, 15, 9, 7, 0xf0a3ae);
        break;
      case 'none':
        break;
    }

    // mouth
    const my = d.nose === 'snout' ? 30 : 29;
    g.lineStyle(3, OUT, 1);
    g.beginPath();
    if (mood === 'happy') g.arc(0, my - 8, 10, 0.18 * Math.PI, 0.82 * Math.PI, false);
    else if (mood === 'neutral') {
      g.moveTo(-7, my);
      g.lineTo(7, my - 1);
    } else g.arc(0, my + 7, 9, 1.2 * Math.PI, 1.8 * Math.PI, false);
    g.strokePath();
    if (extras.includes('fangs')) {
      const fy = mood === 'angry' ? my - 2 : my + 1;
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(-7, fy, -2, fy, -4.5, fy + 7);
      g.fillTriangle(2, fy, 7, fy, 4.5, fy + 7);
      g.lineStyle(1.5, OUT, 1);
      g.strokeTriangle(-7, fy, -2, fy, -4.5, fy + 7);
      g.strokeTriangle(2, fy, 7, fy, 4.5, fy + 7);
    }
    if (extras.includes('stitch')) {
      g.lineStyle(2, OUT, 0.85);
      g.lineBetween(26, 30, 38, 22);
      g.lineBetween(29, 23, 31, 30);
      g.lineBetween(34, 20, 36, 27);
    }
    // little anger mark
    if (mood === 'angry') {
      g.lineStyle(3, 0xe0405a, 1);
      const ax = 36;
      const ay = -40;
      g.lineBetween(ax - 7, ay - 2, ax - 2, ay - 2);
      g.lineBetween(ax - 2, ay - 2, ax - 2, ay - 7);
      g.lineBetween(ax + 7, ay + 2, ax + 2, ay + 2);
      g.lineBetween(ax + 2, ay + 2, ax + 2, ay + 7);
    }
  }

  private drawEye(g: G, x: number, y: number, side: number): void {
    const d = this.def;
    const style = d.eyes.style;
    if (this.blinking) {
      g.lineStyle(3, OUT, 1);
      g.beginPath();
      g.arc(x, y - 3, 8, 0.2 * Math.PI, 0.8 * Math.PI, false);
      g.strokePath();
      return;
    }
    if (style === 'bead') {
      g.fillStyle(OUT, 1);
      g.fillEllipse(x, y, 11, 15);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(x - 2, y - 3, 2.2);
      return;
    }
    ellipse(g, x, y, 21, style === 'sleepy' ? 22 : 24, d.eyes.white ?? 0xfff6dc);
    g.fillStyle(d.eyes.color ?? OUT, 1);
    const pupil = style === 'sleepy' ? 4.5 : style === 'cute' ? 8 : 6;
    g.fillCircle(x + side * 0.5, y + (style === 'sleepy' ? 3 : 1), pupil);
    g.fillStyle(OUT, 1);
    if (d.eyes.color !== undefined && d.eyes.color !== OUT) g.fillCircle(x + side * 0.5, y + 1, 2.8);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(x - 2, y - 2, style === 'cute' ? 2.6 : 2);
    if (style === 'cute') g.fillCircle(x + 2.5, y + 4, 1.3);
    if ((d.extras ?? []).includes('lashes')) {
      // two little lashes at the outer corner
      g.lineStyle(2.2, OUT, 1);
      g.lineBetween(x + side * 9, y - 7, x + side * 14, y - 11);
      g.lineBetween(x + side * 10, y - 3, x + side * 15, y - 5);
    }
    if (style === 'sleepy' || this.mood === 'angry') {
      // heavy upper eyelid
      g.fillStyle(this.def.skin, 1);
      g.beginPath();
      g.slice(x, y + (this.mood === 'angry' ? 1 : 0), 11.5, Math.PI, 2 * Math.PI, false);
      g.fillPath();
      g.lineStyle(2.5, OUT, 1);
      g.lineBetween(x - 10.5, y + (this.mood === 'angry' ? 1 : 0), x + 10.5, y + (this.mood === 'angry' ? 1 : 0));
    }
    if (style === 'sleepy') {
      // tired dark circles under the eyes
      g.lineStyle(3, 0x9b86c4, 0.55);
      g.beginPath();
      g.arc(x, y + 2, 12, 0.2 * Math.PI, 0.8 * Math.PI, false);
      g.strokePath();
    }
  }

  /** Mummy: the skin shows through a gap in the bandages around the eyes and mouth. */
  private drawFaceGap(g: G, color: number): void {
    g.fillStyle(color, 1);
    g.fillPoints(
      [
        { x: -34, y: -14 },
        { x: 36, y: -18 },
        { x: 40, y: 8 },
        { x: 26, y: 34 },
        { x: -20, y: 36 },
        { x: -38, y: 12 },
      ] as Phaser.Math.Vector2[],
      true,
    );
    g.fillStyle(shade(color, -0.12), 1);
    g.fillEllipse(18, 26, 30, 12);
  }

  /** Mummy bandages: curved strips over the forehead and chin, one strip between the eyes, and stains. */
  private drawBandages(g: G): void {
    const band = this.def.skin;
    const strip = (x1: number, y1: number, x2: number, y2: number, alt: boolean) => {
      g.lineStyle(12, OUT, 1);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(8, alt ? shade(band, -0.07) : band, 1);
      g.lineBetween(x1, y1, x2, y2);
    };
    for (const [y, tilt, alt] of [
      [-38, -4, false],
      [-26, 5, true],
      [40, -4, false],
    ] as const) {
      const hw = headHalfWidth(y) - 2;
      strip(-hw, y - tilt, hw, y + tilt, alt);
    }
    // a strip crossing the face between the eyes and a loose end
    strip(-4, -16, 4, 14, true);
    g.lineStyle(7, band, 1);
    g.lineBetween(38, -28, 54, -16);
    // old stains
    g.fillStyle(0xb9a77e, 0.45);
    g.fillEllipse(-24, -38, 14, 7);
    g.fillEllipse(20, -26, 10, 6);
  }
}
