import type Phaser from 'phaser';
import type { DoughId, FrostingId, Order, ToppingId } from '../data/recipes';

export type BakeState = 'raw' | 'ready' | 'burnt';

export interface CupcakeData {
  dough: DoughId;
  bake: BakeState;
  /** 0 = just cooked (golden), 1 = about to burn (dark brown). Only used while bake === 'ready'. */
  tone: number;
  frosting?: FrostingId;
  topping?: ToppingId;
}

type G = Phaser.GameObjects.Graphics;

/** Outline ink (same as config.INK; repeated here to keep this drawing module standalone). */
const INK = 0x4a2a2e;

/** Make a color lighter (amount > 0) or darker (amount < 0). amount is in -1..1. */
export function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/** Blend two colors. t = 0 gives a, t = 1 gives b. */
export function blend(a: number, b: number, t: number): number {
  const ch = (shift: number) => Math.round(((a >> shift) & 0xff) * (1 - t) + ((b >> shift) & 0xff) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** A cupcake is finished when it is baked (not burnt), frosted and topped. */
export function isFinished(c: CupcakeData): boolean {
  return c.bake === 'ready' && !!c.frosting && !!c.topping;
}

export function matchesOrder(c: CupcakeData, order: Order): boolean {
  if (order.surprise) return c.bake !== 'burnt' && isFinished(c);
  return c.dough === order.dough && c.frosting === order.frosting && c.topping === order.topping;
}

/** Filled ellipse with an ink outline. */
function blob(g: G, x: number, y: number, w: number, h: number, fill: number, lw: number): void {
  g.fillStyle(fill, 1);
  g.fillEllipse(x, y, w, h);
  g.lineStyle(lw, INK, 1);
  g.strokeEllipse(x, y, w, h);
}

/** Draws a topping centered at (x, y). */
export function drawTopping(g: G, x: number, y: number, id: ToppingId, s = 1): void {
  const lw = 2 * s;
  switch (id) {
    case 'sprinkles': {
      // colorful sugar rods scattered on the frosting
      const rods: [number, number, number, number, number][] = [
        [-12, 4, -6, 1, 0xffd166],
        [-4, -6, 2, -9, 0x66d9ff],
        [6, 2, 12, 6, 0xff6b8b],
        [-8, 12, -2, 14, 0xffffff],
        [3, 10, 8, 6, 0xb5e48c],
        [-14, -4, -9, -8, 0xff9ff3],
        [10, -6, 15, -3, 0x9b7bff],
      ];
      for (const [x1, y1, x2, y2, c] of rods) {
        g.lineStyle(3.4 * s, c, 1);
        g.lineBetween(x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s);
      }
      break;
    }
    case 'eye': {
      // candy eyeball: white ball, orange iris, red veins
      blob(g, x, y, 22 * s, 22 * s, 0xfffaf0, lw);
      g.lineStyle(1.2 * s, 0xe05a6d, 0.8);
      g.lineBetween(x - 9 * s, y + 3 * s, x - 5 * s, y + 1 * s);
      g.lineBetween(x + 9 * s, y + 4 * s, x + 6 * s, y + 2 * s);
      g.fillStyle(0xf28a1e, 1);
      g.fillCircle(x + 1 * s, y + 1 * s, 6 * s);
      g.fillStyle(0xffc14d, 1);
      g.fillCircle(x + 0.5 * s, y + 0.5 * s, 4 * s);
      g.fillStyle(INK, 1);
      g.fillCircle(x + 1 * s, y + 1 * s, 2.6 * s);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x - 1.5 * s, y - 2 * s, 1.6 * s);
      break;
    }
    case 'spider': {
      // a little chocolate spider with big cute eyes
      g.lineStyle(1.8 * s, INK, 1);
      for (const side of [-1, 1]) {
        for (const [ax, ay, bx, by, cx, cy] of [
          [4, -2, 10, -8, 14, -4],
          [5, 0, 12, -3, 16, 1],
          [5, 2, 12, 4, 15, 9],
          [4, 4, 9, 9, 11, 14],
        ]) {
          g.lineBetween(x + side * ax * s, y + ay * s, x + side * bx * s, y + by * s);
          g.lineBetween(x + side * bx * s, y + by * s, x + side * cx * s, y + cy * s);
        }
      }
      g.fillStyle(0x2a1d33, 1);
      g.fillCircle(x, y + 2 * s, 7.5 * s);
      g.fillCircle(x, y - 6 * s, 5 * s);
      g.fillStyle(0x5a4570, 1);
      g.fillCircle(x - 2.5 * s, y, 2.4 * s);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x - 2 * s, y - 6.5 * s, 2.2 * s);
      g.fillCircle(x + 2 * s, y - 6.5 * s, 2.2 * s);
      g.fillStyle(INK, 1);
      g.fillCircle(x - 1.7 * s, y - 6.2 * s, 1.1 * s);
      g.fillCircle(x + 2.3 * s, y - 6.2 * s, 1.1 * s);
      break;
    }
    case 'cherry': {
      // a glossy cherry with a curved stem and a leaf
      g.lineStyle(2.2 * s, 0x6b4a2a, 1);
      g.beginPath();
      g.moveTo(x, y - 4 * s);
      g.lineTo(x + 3 * s, y - 11 * s);
      g.lineTo(x + 7 * s, y - 16 * s);
      g.strokePath();
      g.fillStyle(0x7bc96f, 1);
      g.fillEllipse(x + 10 * s, y - 15 * s, 9 * s, 5 * s);
      g.lineStyle(1.4 * s, INK, 1);
      g.strokeEllipse(x + 10 * s, y - 15 * s, 9 * s, 5 * s);
      blob(g, x, y + 2 * s, 18 * s, 17 * s, 0xe0344b, lw);
      g.fillStyle(0xffffff, 0.75);
      g.fillEllipse(x - 4 * s, y - 2 * s, 5 * s, 3.5 * s);
      break;
    }
    case 'bat': {
      // a little candy bat with spread wings
      const wing = (side: number) => {
        const pts = [
          { x: x + side * 4 * s, y: y - 3 * s },
          { x: x + side * 17 * s, y: y - 7 * s },
          { x: x + side * 15 * s, y: y + 1 * s },
          { x: x + side * 11 * s, y: y - 1 * s },
          { x: x + side * 8 * s, y: y + 4 * s },
          { x: x + side * 4 * s, y: y + 3 * s },
        ] as Phaser.Math.Vector2[];
        g.fillStyle(0x5b3f7a, 1);
        g.fillPoints(pts, true);
        g.lineStyle(1.6 * s, INK, 1);
        g.strokePoints(pts, true);
      };
      wing(-1);
      wing(1);
      blob(g, x, y, 11 * s, 13 * s, 0x6e4f92, lw);
      g.fillStyle(0x6e4f92, 1);
      g.fillTriangle(x - 4.5 * s, y - 4 * s, x - 2 * s, y - 4 * s, x - 4 * s, y - 9 * s);
      g.fillTriangle(x + 4.5 * s, y - 4 * s, x + 2 * s, y - 4 * s, x + 4 * s, y - 9 * s);
      g.fillStyle(0xfff3a8, 1);
      g.fillCircle(x - 2.2 * s, y - 1 * s, 1.6 * s);
      g.fillCircle(x + 2.2 * s, y - 1 * s, 1.6 * s);
      break;
    }
    case 'ghost': {
      // a meringue ghost: round head, wavy hem, two dark eyes and a small mouth
      g.fillStyle(0xfdfbff, 1);
      g.fillCircle(x, y - 3 * s, 9 * s);
      g.fillRect(x - 9 * s, y - 3 * s, 18 * s, 10 * s);
      for (const dx of [-6, 0, 6]) g.fillCircle(x + dx * s, y + 7 * s, 3 * s);
      g.lineStyle(lw * 0.8, INK, 1);
      g.beginPath();
      g.arc(x, y - 3 * s, 9 * s, Math.PI, 0, false);
      g.lineTo(x + 9 * s, y + 7 * s);
      g.strokePath();
      g.beginPath();
      g.moveTo(x - 9 * s, y - 3 * s);
      g.lineTo(x - 9 * s, y + 7 * s);
      g.strokePath();
      for (const dx of [-6, 0, 6]) {
        g.beginPath();
        g.arc(x + dx * s, y + 7 * s, 3 * s, 0, Math.PI, false);
        g.strokePath();
      }
      g.fillStyle(INK, 1);
      g.fillEllipse(x - 3.2 * s, y - 3 * s, 2.6 * s, 3.4 * s);
      g.fillEllipse(x + 3.2 * s, y - 3 * s, 2.6 * s, 3.4 * s);
      g.fillCircle(x, y + 1.5 * s, 1.2 * s);
      g.fillStyle(0xffb3c9, 0.8);
      g.fillCircle(x - 6 * s, y + 0.5 * s, 1.5 * s);
      g.fillCircle(x + 6 * s, y + 0.5 * s, 1.5 * s);
      break;
    }
  }
}
