import Phaser from 'phaser';
import { FONT, INK } from '../config';
import { sfx } from '../audio';
import { shade } from '../objects/cupcake';

export type ButtonColor = 'blue' | 'green' | 'red' | 'yellow' | 'grey';

export interface ButtonOptions {
  color?: ButtonColor;
  /** Custom face color (overrides the palette). */
  tint?: number;
  fontSize?: number;
  depth?: number;
}

const PALETTE: Record<ButtonColor, number> = {
  green: 0x4fcf86,
  blue: 0x55a8ee,
  red: 0xee6175,
  yellow: 0xffc24a,
  grey: 0xb3a2e6,
};

/**
 * A tactile vector button: thick bottom edge (depth), glossy face, ink outline.
 * Hover lifts it, press pushes it down, and a click plays a sound.
 */
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
  const face = tint ?? PALETTE[color];
  const container = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  const txt = scene.add
    .text(0, -3, label, {
      fontFamily: FONT,
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#' + shade(face, -0.55).toString(16).padStart(6, '0'),
      strokeThickness: 5,
    })
    .setOrigin(0.5);
  container.add([g, txt]);

  const depthPx = 7;
  const draw = (state: 'idle' | 'hover' | 'down') => {
    const press = state === 'down' ? depthPx - 2 : 0;
    const f = state === 'hover' ? shade(face, 0.1) : face;
    const r = Math.min(20, h / 2);
    g.clear();
    // soft drop shadow
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 8, w, h, r);
    // depth edge
    g.fillStyle(shade(face, -0.35), 1);
    g.fillRoundedRect(-w / 2, -h / 2 + depthPx, w, h - depthPx, r);
    // face with a lighter top half and a gloss strip
    const top = -h / 2 + press;
    const fh = h - depthPx;
    g.fillStyle(f, 1);
    g.fillRoundedRect(-w / 2, top, w, fh, r);
    g.fillStyle(shade(f, 0.18), 1);
    g.fillRoundedRect(-w / 2, top, w, fh * 0.55, { tl: r, tr: r, bl: 6, br: 6 });
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(-w / 2 + 10, top + 5, w - 20, 7, 3.5);
    g.lineStyle(3, INK, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    txt.setY(-3 - depthPx / 2 + press + 3);
  };
  draw('idle');

  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(depth);
  zone.on('pointerover', () => {
    draw('hover');
    scene.tweens.add({ targets: container, scale: 1.04, duration: 90 });
  });
  zone.on('pointerout', () => {
    draw('idle');
    scene.tweens.add({ targets: container, scale: 1, duration: 90 });
  });
  zone.on('pointerdown', () => {
    draw('down');
    sfx(scene, 'ui_click', 0.5);
    scene.time.delayedCall(110, () => container.active && draw('hover'));
    onClick();
  });

  return {
    destroy: () => {
      scene.tweens.killTweensOf(container);
      zone.destroy();
      container.destroy();
    },
    setPosition: (nx, ny) => {
      container.setPosition(nx, ny);
      zone.setPosition(nx, ny);
    },
  };
}
