import type Phaser from 'phaser';
import { COLORS, INK } from '../config';

/**
 * A rounded purple panel centered on (0, 0) of the graphics object: soft shadow, a lighter header band,
 * a thin gold inner line and the ink outline.
 */
export function drawPanel(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const r = 28;
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 12, w, h, r);
  g.fillGradientStyle(0x4a3478, 0x4a3478, COLORS.panel, COLORS.panel, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(0xffffff, 0.08);
  g.fillRoundedRect(-w / 2, -h / 2, w, 84, { tl: r, tr: r, bl: 0, br: 0 });
  g.lineStyle(2, 0xd9a84e, 0.7);
  g.strokeRoundedRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, r - 8);
  g.lineStyle(3.5, INK, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
}
