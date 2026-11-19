import type Phaser from 'phaser';
import { doughInfo, frostingInfo, type DoughId, type FrostingId, type Order, type ToppingId } from '../data/recipes';

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
  }
}

/**
 * Draws a cupcake. (x, y) is the middle of the paper wrapper.
 * Style: dark pleated wrapper, outlined cake dome, a glossy 3-tier frosting swirl with sugar dots, topping on top.
 */
export function drawCupcake(g: G, x: number, y: number, c: CupcakeData, s = 1): void {
  const lw = 2.4 * s;
  const dough = doughInfo(c.dough);
  const cakeBase = c.bake === 'raw' ? dough.raw : c.bake === 'ready' ? blend(dough.baked, dough.over, c.tone) : 0x2b2522;
  const burnt = c.bake === 'burnt';
  const wrap = burnt ? 0x2f2f33 : 0x3b2560;

  // soft shadow, then the wrapper (the cake and frosting spill over its rim)
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(x, y + 22 * s, 50 * s, 10 * s);
  drawWrapper(g, x, y, wrap, s, lw);

  // cake dome (visible above the wrapper; a bigger mound when there is no frosting)
  if (!c.frosting) {
    blob(g, x, y - 10 * s, 50 * s, 40 * s, cakeBase, lw);
    g.fillStyle(shade(cakeBase, burnt ? 0.12 : 0.3), 0.7);
    g.fillEllipse(x - 9 * s, y - 18 * s, 16 * s, 9 * s);
    if (burnt) {
      g.fillStyle(0x111111, 0.8);
      g.fillCircle(x + 8 * s, y - 14 * s, 3 * s);
      g.fillCircle(x - 6 * s, y - 6 * s, 2.5 * s);
    }
  } else {
    blob(g, x, y - 6 * s, 52 * s, 22 * s, cakeBase, lw);
  }

  // frosting swirl: three outlined tiers + a tip, each with a highlight
  if (c.frosting) {
    const f = frostingInfo(c.frosting).color;
    blob(g, x, y - 13 * s, 56 * s, 24 * s, shade(f, -0.12), lw);
    blob(g, x - 1 * s, y - 25 * s, 44 * s, 22 * s, f, lw);
    blob(g, x + 1 * s, y - 37 * s, 30 * s, 18 * s, shade(f, 0.1), lw);
    blob(g, x + 4 * s, y - 46 * s, 14 * s, 11 * s, shade(f, 0.2), lw);
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(x - 14 * s, y - 16 * s, 12 * s, 5 * s);
    g.fillEllipse(x - 10 * s, y - 28 * s, 10 * s, 4 * s);
    g.fillEllipse(x - 5 * s, y - 39 * s, 7 * s, 3 * s);
    // sugar dots
    const dots: [number, number, number][] = [
      [-18, -12, 0],
      [12, -16, 1],
      [-6, -22, 0],
      [14, -28, 1],
      [-12, -32, 1],
      [6, -38, 0],
    ];
    for (const [dx, dy, white] of dots) {
      g.fillStyle(white ? 0xffffff : shade(f, -0.5), white ? 0.85 : 0.8);
      g.fillCircle(x + dx * s, y + dy * s, 1.6 * s);
    }
  }

  if (c.topping) {
    // sprinkles lie on the swirl; candy toppings sit on its tip
    const ty = !c.frosting ? 30 : c.topping === 'sprinkles' ? 30 : 54;
    drawTopping(g, x + (c.frosting ? 2 : 0) * s, y - ty * s, c.topping, s);
  }
}

/** Pleated paper wrapper (trapezoid) with alternating stripes and a rim. */
function drawWrapper(g: G, x: number, y: number, wrap: number, s: number, lw: number): void {
  const top = y - 6 * s;
  const bot = y + 21 * s;
  const tl = x - 24 * s;
  const tr = x + 24 * s;
  const bl = x - 17 * s;
  const br = x + 17 * s;
  g.fillStyle(wrap, 1);
  g.fillTriangle(tl, top, tr, top, br, bot);
  g.fillTriangle(tl, top, br, bot, bl, bot);
  g.fillStyle(shade(wrap, -0.3), 1);
  for (let i = 0; i < 6; i += 2) {
    const a = i / 6;
    const b = (i + 1) / 6;
    const x1 = tl + (tr - tl) * a;
    const x2 = tl + (tr - tl) * b;
    const x3 = bl + (br - bl) * b;
    const x4 = bl + (br - bl) * a;
    g.fillTriangle(x1, top, x2, top, x3, bot);
    g.fillTriangle(x1, top, x3, bot, x4, bot);
  }
  g.fillStyle(0xffffff, 0.12);
  g.fillTriangle(tl + 3 * s, top, tl + 9 * s, top, bl + 5 * s, bot);
  g.lineStyle(lw, INK, 1);
  g.strokeTriangle(tl, top, tr, top, br, bot);
  g.lineBetween(tl, top, bl, bot);
  g.lineBetween(bl, bot, br, bot);
  g.fillStyle(shade(wrap, 0.25), 1);
  g.fillRoundedRect(tl - 1 * s, top - 2 * s, 50 * s, 4 * s, 2 * s);
  g.lineStyle(lw * 0.8, INK, 1);
  g.strokeRoundedRect(tl - 1 * s, top - 2 * s, 50 * s, 4 * s, 2 * s);
}
