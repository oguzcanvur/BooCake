import Phaser from 'phaser';
import { DEPTH, FONT } from '../config';
import { sfx } from '../audio';

export type ButtonColor = 'blue' | 'green' | 'red' | 'yellow' | 'grey';

export interface ButtonOptions {
  color?: ButtonColor;
  /** Multiply-tint, handy on the grey button to get any color. */
  tint?: number;
  fontSize?: number;
  depth?: number;
}

/** A modern 9-slice button (Kenney UI Pack) with hover / press feedback and a click sound. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {},
): { destroy: () => void; setPosition: (x: number, y: number) => void } {
  const { color = 'blue', tint, fontSize = 26, depth = 0 } = opts;
  const bg = scene.add
    .nineslice(x, y, `btn_${color}`, undefined, w, h, 14, 14, 14, 18)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });
  if (tint !== undefined) bg.setTint(tint);
  const colorText = color === 'grey' && tint === undefined ? '#3a2a63' : '#ffffff';
  const txt = scene.add
    .text(x, y - 3, label, {
      fontFamily: FONT,
      fontSize: `${fontSize}px`,
      color: colorText,
      fontStyle: 'bold',
      stroke: colorText === '#ffffff' ? '#00000055' : undefined,
      strokeThickness: colorText === '#ffffff' ? 4 : 0,
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const parts = [bg, txt];
  bg.on('pointerover', () => scene.tweens.add({ targets: parts, scale: 1.05, duration: 90 }));
  bg.on('pointerout', () => scene.tweens.add({ targets: parts, scale: 1, duration: 90 }));
  bg.on('pointerdown', () => {
    sfx(scene, 'ui_click', 0.5);
    scene.tweens.add({ targets: parts, scale: 0.95, duration: 60, yoyo: true });
    onClick();
  });

  return {
    destroy: () => {
      scene.tweens.killTweensOf(parts);
      parts.forEach((p) => p.destroy());
    },
    setPosition: (nx, ny) => {
      bg.setPosition(nx, ny);
      txt.setPosition(nx, ny - 3);
    },
  };
}

export { DEPTH };
