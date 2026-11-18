import type Phaser from 'phaser';
import { frostingInfo, type FrostingId, type ToppingId } from '../data/recipes';

export type BakeState = 'raw' | 'ready' | 'burnt';

export interface CupcakeData {
  bake: BakeState;
  frosting?: FrostingId;
  topping?: ToppingId;
}

type G = Phaser.GameObjects.Graphics;

/** Make a color lighter (amount > 0) or darker (amount < 0). amount is in -1..1. */
export function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/** Draws a topping centered at (x, y). */
export function drawTopping(g: G, x: number, y: number, id: ToppingId, s = 1): void {
  switch (id) {
    case 'cherry':
      g.lineStyle(2.5 * s, 0x3b7a2a, 1);
      g.lineBetween(x, y - 6 * s, x + 7 * s, y - 15 * s);
      g.fillStyle(0xc1121f, 1);
      g.fillCircle(x, y, 8 * s);
      g.fillStyle(0xe63946, 1);
      g.fillCircle(x - 1 * s, y - 1 * s, 7 * s);
      g.fillStyle(0xffffff, 0.75);
      g.fillCircle(x - 3 * s, y - 3 * s, 2.2 * s);
      break;
    case 'sprinkles': {
      const bits: [number, number, number][] = [
        [-10, 6, 0xffd166],
        [0, -4, 0x66d9ff],
        [10, 5, 0xff6b6b],
        [-4, 13, 0xffffff],
        [6, -2, 0xb5e48c],
        [-12, -3, 0xff9ff3],
        [13, 14, 0x66d9ff],
      ];
      for (const [dx, dy, color] of bits) {
        g.fillStyle(color, 1);
        g.fillRoundedRect(x + (dx - 3) * s, y + (dy - 1.5) * s, 6 * s, 3 * s, 1.5 * s);
      }
      break;
    }
    case 'eyeball':
      g.fillStyle(0xd9d9d9, 1);
      g.fillCircle(x, y + 1 * s, 10 * s);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x, y, 10 * s);
      g.lineStyle(1.2 * s, 0xe05a6d, 0.8);
      g.lineBetween(x - 9 * s, y + 3 * s, x - 5 * s, y + 1 * s);
      g.lineBetween(x + 9 * s, y - 3 * s, x + 5 * s, y - 1 * s);
      g.fillStyle(0x2a6fdb, 1);
      g.fillCircle(x + 1 * s, y, 5.5 * s);
      g.fillStyle(0x111111, 1);
      g.fillCircle(x + 1 * s, y, 2.8 * s);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(x - 1 * s, y - 2 * s, 1.5 * s);
      break;
  }
}

/**
 * Draws a cupcake. (x, y) is the middle of the paper wrapper.
 * Layers: soft shadow, cake dome with highlight, pleated wrapper, 3-layer frosting swirl, topping.
 */
export function drawCupcake(g: G, x: number, y: number, c: CupcakeData, s = 1): void {
  const cake =
    c.bake === 'raw'
      ? { base: 0xf3e3b0, light: 0xfff3cf }
      : c.bake === 'ready'
        ? { base: 0xd9964f, light: 0xf0b872 }
        : { base: 0x2b2522, light: 0x4a403a };
  const wrap = c.bake === 'burnt' ? { base: 0x3a3a3a, dark: 0x262626, rim: 0x555555 } : { base: 0x8f6be0, dark: 0x6a49b8, rim: 0xb59cf5 };

  // shadow
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(x, y + 22 * s, 44 * s, 9 * s);

  // cake dome
  g.fillStyle(cake.base, 1);
  g.fillCircle(x, y - 8 * s, 21 * s);
  g.fillStyle(cake.light, 0.55);
  g.fillCircle(x - 7 * s, y - 15 * s, 7 * s);

  // frosting swirl (3 layers) sits on the dome
  if (c.frosting) {
    const f = frostingInfo(c.frosting).color;
    g.fillStyle(shade(f, -0.18), 1);
    g.fillEllipse(x, y - 17 * s, 46 * s, 22 * s);
    g.fillStyle(f, 1);
    g.fillEllipse(x, y - 27 * s, 36 * s, 20 * s);
    g.fillStyle(shade(f, 0.18), 1);
    g.fillEllipse(x, y - 36 * s, 24 * s, 16 * s);
    g.fillStyle(shade(f, 0.3), 1);
    g.fillCircle(x, y - 44 * s, 5 * s);
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(x - 8 * s, y - 29 * s, 8 * s, 4 * s);
  }

  // paper wrapper (trapezoid from two triangles) with pleats
  g.fillStyle(wrap.base, 1);
  g.fillTriangle(x - 23 * s, y - 4 * s, x + 23 * s, y - 4 * s, x + 16 * s, y + 20 * s);
  g.fillTriangle(x - 23 * s, y - 4 * s, x + 16 * s, y + 20 * s, x - 16 * s, y + 20 * s);
  g.lineStyle(1.6 * s, wrap.dark, 0.9);
  for (const t of [-0.6, -0.2, 0.2, 0.6]) {
    g.lineBetween(x + t * 22 * s, y - 3 * s, x + t * 14 * s, y + 19 * s);
  }
  g.lineStyle(3 * s, wrap.rim, 1);
  g.lineBetween(x - 23 * s, y - 4 * s, x + 23 * s, y - 4 * s);

  if (c.topping) {
    drawTopping(g, x, y - (c.frosting ? 48 : 30) * s, c.topping, s);
  }
}
