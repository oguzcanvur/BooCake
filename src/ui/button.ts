import Phaser from 'phaser';
import { FONT } from '../config';

/** A simple mouse button (rectangle + label). */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  color = 0x7e57c2,
  depth = 0,
): { destroy: () => void } {
  const bg = scene.add
    .rectangle(x, y, w, h, color)
    .setStrokeStyle(3, 0xffffff, 0.85)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });
  const txt = scene.add
    .text(x, y, label, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(depth);
  bg.on('pointerover', () => bg.setScale(1.05));
  bg.on('pointerout', () => bg.setScale(1));
  bg.on('pointerdown', onClick);
  return {
    destroy: () => {
      bg.destroy();
      txt.destroy();
    },
  };
}
