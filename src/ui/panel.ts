import type Phaser from 'phaser';
import { COLORS } from '../config';

/** A rounded purple panel with a soft shadow, centered on (0, 0) of the graphics object. */
export function drawPanel(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, 28);
  g.fillStyle(COLORS.panel, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
  g.fillStyle(0xffffff, 0.08);
  g.fillRoundedRect(-w / 2, -h / 2, w, 84, { tl: 28, tr: 28, bl: 0, br: 0 });
}
