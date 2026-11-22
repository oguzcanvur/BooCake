import type Phaser from 'phaser';
import { DEPTH, FONT, INK, W } from '../config';

/**
 * A small speech bubble whose tail tip is at (x, y) (world pixels): it pops in, stays for `ms`, then fades away.
 * Used for the short lines of the guard and the thief when the thief is caught.
 */
export function speak(scene: Phaser.Scene, x: number, y: number, text: string, ms = 1500): Phaser.GameObjects.Container {
  const t = scene.add
    .text(0, 0, text, { fontFamily: FONT, fontSize: '26px', color: '#4a2a2e', fontStyle: 'bold', align: 'center', wordWrap: { width: 300 } })
    .setOrigin(0.5);
  const w = t.width + 40;
  const h = t.height + 24;
  const TAIL = 14;
  const cx = Math.min(Math.max(x, w / 2 + 16), W - w / 2 - 16);
  const dx = Math.max(-(w / 2 - 30), Math.min(w / 2 - 30, x - cx));

  const g = scene.add.graphics();
  g.fillStyle(0xfff6e4, 1);
  g.fillRoundedRect(-w / 2, -TAIL - h, w, h, 18);
  g.fillTriangle(dx - 10, -TAIL - 2, dx + 10, -TAIL - 2, dx, 0);
  g.lineStyle(3, INK, 1);
  g.strokeRoundedRect(-w / 2, -TAIL - h, w, h, 18);
  g.lineBetween(dx - 10, -TAIL, dx, 0);
  g.lineBetween(dx + 10, -TAIL, dx, 0);
  // hide the outline where the tail joins the box
  g.lineStyle(4, 0xfff6e4, 1);
  g.lineBetween(dx - 8, -TAIL, dx + 8, -TAIL);
  t.setPosition(0, -TAIL - h / 2);

  const box = scene.add.container(cx, y, [g, t]).setDepth(DEPTH.fx + 3).setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 170, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: box, alpha: 0, delay: ms, duration: 220, onComplete: () => box.destroy() });
  return box;
}
