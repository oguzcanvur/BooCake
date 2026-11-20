import Phaser from 'phaser';
import { DEPTH, FONT, H, INK, LAYOUT, W } from '../config';

/** One arrow with a label: the tip touches (tx, ty). */
export interface TutorialPointer {
  tx: number;
  ty: number;
  text: string;
}

/** A soft pulsing outline around a group of things ("these are the frostings"). */
export interface TutorialBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What the guide shows right now. `key` changes whenever the step changes (the picture is only rebuilt then). */
export interface TutorialStep {
  key: string;
  pointers: TutorialPointer[];
  boxes?: TutorialBox[];
}

/**
 * The first-order guide of Day 1: bouncing arrows with short labels that tell the player what to click next,
 * and glowing outlines around the doughs / frostings / toppings. NightScene decides the step; this class only draws it.
 * A step disappears the moment the player has done what it says (NightScene then sends the next step).
 */
export class TutorialGuide {
  private key = '';
  private objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  show(step: TutorialStep): void {
    if (step.key === this.key) return;
    this.clear();
    this.key = step.key;
    const s = this.scene;
    const depth = DEPTH.fx + 5;

    step.boxes?.forEach((b) => {
      const g = s.add.graphics().setDepth(depth - 1);
      g.fillStyle(0xffe08a, 0.14);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, 22);
      g.lineStyle(4, 0xffe08a, 1);
      g.strokeRoundedRect(b.x, b.y, b.w, b.h, 22);
      s.tweens.add({ targets: g, alpha: { from: 0.45, to: 1 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.objects.push(g);
    });

    step.pointers.forEach((p) => {
      const box = s.add.container(p.tx, p.ty).setDepth(depth);

      // the arrow: tip at (0, 0), pointing down
      const arrow = s.add.graphics();
      const pts = [
        { x: 0, y: 0 },
        { x: -18, y: -30 },
        { x: -8, y: -30 },
        { x: -8, y: -54 },
        { x: 8, y: -54 },
        { x: 8, y: -30 },
        { x: 18, y: -30 },
      ];
      arrow.fillStyle(0xffd166, 1);
      arrow.fillPoints(pts as Phaser.Math.Vector2[], true);
      arrow.lineStyle(3, INK, 1);
      arrow.strokePoints(pts as Phaser.Math.Vector2[], true, true);
      box.add(arrow);

      const text = s.add
        .text(0, 0, p.text, { fontFamily: FONT, fontSize: '24px', color: '#2b1d4f', fontStyle: 'bold', align: 'center', wordWrap: { width: 340 } })
        .setOrigin(0.5);
      const lw = text.width + 32;
      const lh = text.height + 22;
      const gap = 12;
      const margin = 10;
      // normally the label sits above the arrow, kept inside the screen sideways
      let cx = Phaser.Math.Clamp(p.tx, lw / 2 + margin, W - lw / 2 - margin) - p.tx;
      let cy = -54 - gap - lh / 2;
      if (p.ty + cy - lh / 2 < LAYOUT.hudH + margin) {
        // no room above (the top bar would hide it): put the label beside the arrow instead
        const right = p.tx + 18 + gap + lw <= W - margin;
        cx = right ? 18 + gap + lw / 2 : -(18 + gap + lw / 2);
        cy = Math.max(-27, LAYOUT.hudH + margin + lh / 2 - p.ty);
      }
      // never below the bottom edge either
      cy = Math.min(cy, H - margin - lh / 2 - p.ty);

      const bg = s.add.graphics();
      bg.fillStyle(0x000000, 0.22);
      bg.fillRoundedRect(cx - lw / 2 + 2, cy - lh / 2 + 5, lw, lh, 14);
      bg.fillStyle(0xfff8ea, 1);
      bg.fillRoundedRect(cx - lw / 2, cy - lh / 2, lw, lh, 14);
      bg.lineStyle(3, INK, 1);
      bg.strokeRoundedRect(cx - lw / 2, cy - lh / 2, lw, lh, 14);
      text.setPosition(cx, cy);
      box.add([bg, text]);

      s.tweens.add({ targets: box, y: p.ty - 9, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.objects.push(box);
    });
  }

  hide(): void {
    this.clear();
    this.key = '';
  }

  destroy(): void {
    this.hide();
  }

  private clear(): void {
    this.objects.forEach((o) => {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    });
    this.objects = [];
  }
}
