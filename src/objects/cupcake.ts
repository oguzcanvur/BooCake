import type Phaser from 'phaser';
import { frostingInfo, type FrostingId, type ToppingId } from '../data/recipes';

export type BakeState = 'raw' | 'ready' | 'burnt';

export interface CupcakeData {
  bake: BakeState;
  frosting?: FrostingId;
  topping?: ToppingId;
}

type G = Phaser.GameObjects.Graphics;

/** Draws a topping centered at (x, y). */
export function drawTopping(g: G, x: number, y: number, id: ToppingId, s = 1): void {
  switch (id) {
    case 'cherry':
      g.fillStyle(0xe63946, 1);
      g.fillCircle(x, y, 7 * s);
      g.lineStyle(2 * s, 0x3b7a2a, 1);
      g.lineBetween(x, y - 6 * s, x + 6 * s, y - 14 * s);
      break;
    case 'sprinkles': {
      const dots: [number, number, number][] = [
        [-9, 6, 0xffd166],
        [0, -4, 0x66d9ff],
        [9, 5, 0xff6b6b],
        [-3, 12, 0xffffff],
        [6, -2, 0xb5e48c],
      ];
      for (const [dx, dy, color] of dots) {
        g.fillStyle(color, 1);
        g.fillRect(x + (dx - 2) * s, y + (dy - 2) * s, 5 * s, 5 * s);
      }
      break;
    }
    case 'eyeball':
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x, y, 9 * s);
      g.fillStyle(0x2a6fdb, 1);
      g.fillCircle(x, y, 5 * s);
      g.fillStyle(0x111111, 1);
      g.fillCircle(x, y, 2.5 * s);
      break;
  }
}

/**
 * Draws a cupcake. (x, y) is the middle of the paper wrapper.
 * Gray-box art: everything is simple shapes until real assets are chosen.
 */
export function drawCupcake(g: G, x: number, y: number, c: CupcakeData, s = 1): void {
  const batter = c.bake === 'raw' ? 0xf6e7b8 : c.bake === 'ready' ? 0xc98b4a : 0x1c1c1c;
  const wrap = c.bake === 'burnt' ? 0x333333 : 0x7e57c2;

  // cake dome
  g.fillStyle(batter, 1);
  g.fillCircle(x, y - 8 * s, 21 * s);

  // frosting swirl
  if (c.frosting) {
    g.fillStyle(frostingInfo(c.frosting).color, 1);
    g.fillCircle(x, y - 20 * s, 19 * s);
    g.fillCircle(x, y - 34 * s, 12 * s);
  }

  // paper wrapper (trapezoid from two triangles)
  g.fillStyle(wrap, 1);
  g.fillTriangle(x - 22 * s, y - 4 * s, x + 22 * s, y - 4 * s, x + 16 * s, y + 20 * s);
  g.fillTriangle(x - 22 * s, y - 4 * s, x + 16 * s, y + 20 * s, x - 16 * s, y + 20 * s);

  if (c.topping) {
    drawTopping(g, x, y - (c.frosting ? 46 : 30) * s, c.topping, s);
  }
}
