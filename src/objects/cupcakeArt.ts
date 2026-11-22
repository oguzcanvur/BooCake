import Phaser from 'phaser';
import { cupPieceKey } from '../assets';
import { WRAPPERS, decor } from '../data/decor';
import { doughInfo } from '../data/recipes';
import type { CupcakeData } from './cupcake';

/**
 * The team's layered cupcake art. Pieces (liner back/front, cake, frosting, toppings) are layered on a canvas
 * the first time a combination is needed; the result is cached as a texture, so drawing a cupcake afterwards is
 * just one image. Coordinates below are in "source pixels" (the size of the team's original drawings); the
 * piece files are 0.4 of that.
 */

const FILE_K = 0.4;
/** Source pixels per game unit at scale 1 (a liner is about 56 units wide). */
const UNIT_SRC = 8.1;
/** Where the liner's top-left corner sits on the canvas, and the canvas size. */
const OX = 9.5;
const OY = 400;
const CW = 470;
const CH = 760;
const LINER_W = 452;
/** Anchor: the middle of the liner (the point a cupcake is placed by). */
const ORIGIN_X = (OX + LINER_W / 2) / CW;
const ORIGIN_Y = (OY + 180) / CH;

const KC = 0.88; // cake scale
const CREASE = 0.52; // where the cake meets the liner rim (share of the cake height)
const KF = 0.78; // frosting scale

/** Height (source px, from the liner top) of the front rim, sampled every 4 px along the liner. */
const ZIG = [
  95, 95, 95, 95, 94, 94, 94, 94, 95, 95, 87, 109, 109, 108, 108, 107, 107, 108, 122, 122, 121, 120, 119, 117, 116, 117, 131, 131, 129, 128, 126, 125,
  123, 123, 128, 138, 137, 135, 133, 131, 129, 128, 127, 129, 135, 139, 139, 138, 136, 133, 131, 129, 130, 131, 133, 136, 139, 140, 138, 135, 132, 130,
  129, 130, 132, 134, 136, 138, 139, 136, 130, 127, 128, 129, 131, 133, 135, 137, 138, 131, 123, 123, 124, 126, 128, 129, 131, 131, 119, 116, 117, 118,
  119, 120, 121, 122, 108, 107, 107, 108, 109, 109, 109, 97, 95, 95, 95, 95, 95, 95, 95, 95, 95,
];
const zigAt = (x: number): number => {
  const f = Phaser.Math.Clamp(x / 4, 0, ZIG.length - 1);
  const i = Math.floor(f);
  const a = ZIG[i];
  const b = ZIG[Math.min(ZIG.length - 1, i + 1)];
  return a + (b - a) * (f - i);
};

/** Frosting spots (share of the frosting box: x, y, tilt in degrees) for toppings that come in several pieces. */
const SPOTS: [number, number, number][] = [
  [0.3, 0.66, -10],
  [0.7, 0.55, 12],
  [0.46, 0.34, 4],
  [0.62, 0.8, -6],
];
const MULTI: Record<string, { name: string; n: number; scale: number; count: number }> = {
  eye: { name: 'top_eye_', n: 4, scale: 0.85, count: 3 },
  spider: { name: 'top_spider_', n: 2, scale: 0.75, count: 2 },
  bat: { name: 'top_bat_', n: 4, scale: 0.68, count: 3 },
  ghost: { name: 'top_ghost_', n: 4, scale: 0.82, count: 3 },
};

const hex = (c: number): string => '#' + (c & 0xffffff).toString(16).padStart(6, '0');

/** The wrapper id to use: the given one, else the player's choice, else the first one. */
function linerId(wrapper?: string): string {
  const id = wrapper ?? decor.wrapper;
  return WRAPPERS.some((w) => w.id === id) ? id : WRAPPERS[0].id;
}

type Img = CanvasImageSource & { width: number; height: number };

function newCanvas(w: number, h: number): CanvasRenderingContext2D {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w));
  cv.height = Math.max(1, Math.ceil(h));
  return cv.getContext('2d') as CanvasRenderingContext2D;
}

/** Multiply an image by a color (keeps its shape) and return it as a canvas. */
function tinted(img: Img, w: number, h: number, rgb: [number, number, number]): HTMLCanvasElement {
  const ctx = newCanvas(w, h);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)})`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.canvas;
}

function cakeTint(c: CupcakeData): [number, number, number] | null {
  if (c.bake === 'burnt') return [0.28, 0.25, 0.25];
  if (c.bake !== 'ready') return null;
  const d = doughInfo(c.dough);
  const ch = (shift: number) => {
    const baked = Math.max(1, (d.baked >> shift) & 0xff);
    const ratio = Math.min(1, ((d.over >> shift) & 0xff) / baked);
    return 1 + (ratio - 1) * c.tone;
  };
  return [ch(16), ch(8), ch(0)];
}

export function cupcakeKey(c: CupcakeData, wrapper?: string, lod = 0): string {
  const tone = c.bake === 'ready' ? Math.round(c.tone * 4) : 0;
  return `cup:${c.dough}:${c.bake}:${tone}:${c.frosting ?? '-'}:${c.topping ?? '-'}:${linerId(wrapper)}:${lod}`;
}

/** Make (once) and return the texture key of this cupcake. `small` = drawn small, so a lighter picture is enough. */
export function cupcakeTexture(scene: Phaser.Scene, c: CupcakeData, wrapper?: string, small = false): string {
  const lod = small ? 1 : 0;
  const key = cupcakeKey(c, wrapper, lod);
  if (scene.textures.exists(key)) return key;

  const k = small ? 0.2 : FILE_K;
  const piece = (name: string): Img => scene.textures.get(cupPieceKey(name)).getSourceImage() as Img;
  const liner = linerId(wrapper);
  const burnt = c.bake === 'burnt';
  const tex = scene.textures.createCanvas(key, Math.ceil(CW * k), Math.ceil(CH * k));
  if (!tex) return key;
  const ctx = tex.getContext();
  // size of a piece on the canvas: file pixels back to source pixels, then to this canvas
  const px = (img: Img, scale: number) => ({ w: (img.width / FILE_K) * scale * k, h: (img.height / FILE_K) * scale * k });
  const drawPiece = (g: CanvasRenderingContext2D, img: Img | HTMLCanvasElement, w: number, h: number, cx: number, cy: number, rot = 0) => {
    g.save();
    g.translate(cx * k, cy * k);
    if (rot) g.rotate((rot * Math.PI) / 180);
    g.drawImage(img, -w / 2, -h / 2, w, h);
    g.restore();
  };

  // liner, back half (burnt ones go dark)
  const back = piece(`liner_${liner}_back`);
  const front = piece(`liner_${liner}_front`);
  const lw = LINER_W * k;
  const lh = (back.height / FILE_K) * k;
  const dark: [number, number, number] = [0.5, 0.5, 0.55];
  ctx.drawImage(burnt ? tinted(back, lw, lh, dark) : back, OX * k, OY * k, lw, lh);

  const cx = OX + LINER_W / 2;
  if (c.bake === 'raw') {
    // raw batter: a flat ellipse in the liner
    ctx.fillStyle = hex(doughInfo(c.dough).raw);
    ctx.strokeStyle = '#4a2a2e';
    ctx.lineWidth = 9 * k;
    ctx.beginPath();
    ctx.ellipse(cx * k, (OY + 78) * k, 195 * k, 46 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    const cake = piece(`cake_${c.dough}`);
    const { w: cw, h: chh } = px(cake, KC);
    const ctop = OY + 135 - CREASE * ((chh / k)); // cake top (source px)
    const tint = cakeTint(c);
    // the cake is cut off at the front rim, so it never hangs over the liner
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CW * k, 0);
    ctx.lineTo(CW * k, (OY + zigAt(LINER_W) + 3) * k);
    for (let x = LINER_W; x >= 0; x -= 4) ctx.lineTo((OX + x) * k, (OY + zigAt(x) + 3) * k);
    ctx.lineTo(0, (OY + zigAt(0) + 3) * k);
    ctx.closePath();
    ctx.clip();
    drawPiece(ctx, tint ? tinted(cake, cw, chh, tint) : cake, cw, chh, cx, ctop + chh / k / 2);
    ctx.restore();

    if (c.frosting) {
      const fr = piece(`frost_${c.frosting}`);
      const { w: fw, h: fh } = px(fr, KF);
      const fbot = ctop + 0.6 * CREASE * (chh / k);
      const fcy = fbot - fh / k / 2;
      drawPiece(ctx, fr, fw, fh, cx, fcy);
      if (c.topping) {
        const fx = cx - fw / k / 2;
        const fy = fbot - fh / k;
        const at = (u: number, v: number): [number, number] => [fx + (u * fw) / k, fy + (v * fh) / k];
        const t = c.topping;
        if (t === 'cherry') {
          const im = piece('top_cherry');
          const s = px(im, 0.65);
          const [x, y] = at(0.5, 0.17);
          drawPiece(ctx, im, s.w, s.h, x, y);
        } else if (t === 'sprinkles') {
          // sprinkles stay inside the swirl
          const layer = newCanvas(ctx.canvas.width, ctx.canvas.height);
          const im = piece('top_sprinkles');
          const s = px(im, 0.95);
          const [x, y] = at(0.5, 0.58);
          drawPiece(layer, im, s.w, s.h, x, y);
          layer.globalCompositeOperation = 'destination-in';
          drawPiece(layer, fr, fw, fh, cx, fcy);
          ctx.drawImage(layer.canvas, 0, 0);
        } else {
          const m = MULTI[t];
          for (let i = 0; i < m.count; i++) {
            const im = piece(`${m.name}${i % m.n}`);
            const s = px(im, m.scale);
            const [u, v, rot] = SPOTS[i];
            const [x, y] = at(u, v);
            drawPiece(ctx, im, s.w, s.h, x, y, rot);
          }
        }
      }
    }
  }
  // liner, front half (over everything)
  ctx.drawImage(burnt ? tinted(front, lw, lh, dark) : front, OX * k, OY * k, lw, lh);
  tex.refresh();
  return key;
}

/** Place a cupcake image: x, y = the middle of the liner, s = size (1 = the old drawing's size). */
export function placeCupcake(img: Phaser.GameObjects.Image, scene: Phaser.Scene, c: CupcakeData, x: number, y: number, s = 1, wrapper?: string): Phaser.GameObjects.Image {
  const small = s < 0.75;
  const key = cupcakeTexture(scene, c, wrapper, small);
  img.setTexture(key).setOrigin(ORIGIN_X, ORIGIN_Y).setPosition(x, y).setScale(s / ((small ? 0.2 : FILE_K) * UNIT_SRC)).setVisible(true);
  return img;
}

/** A new cupcake image (not tracked: the caller destroys it). */
export function cupcakeImage(scene: Phaser.Scene, c: CupcakeData, x: number, y: number, s = 1, wrapper?: string): Phaser.GameObjects.Image {
  return placeCupcake(scene.add.image(x, y, '__DEFAULT'), scene, c, x, y, s, wrapper);
}

/**
 * Cupcakes that are redrawn again and again (plates, tray, icons): call begin(), draw() for each cupcake,
 * then end(). Images are reused, extras are hidden.
 */
export class CupcakePool {
  private readonly items: Phaser.GameObjects.Image[] = [];
  private used = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly parent?: Phaser.GameObjects.Container,
    private readonly depth?: number,
  ) {}

  begin(): void {
    this.used = 0;
  }

  draw(c: CupcakeData, x: number, y: number, s = 1, wrapper?: string): Phaser.GameObjects.Image {
    let img = this.items[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, '__DEFAULT');
      if (this.depth !== undefined) img.setDepth(this.depth);
      this.parent?.add(img);
      this.items.push(img);
    }
    this.used++;
    return placeCupcake(img, this.scene, c, x, y, s, wrapper);
  }

  end(): void {
    for (let i = this.used; i < this.items.length; i++) this.items[i].setVisible(false);
  }

  setVisible(v: boolean): void {
    if (!v) this.items.forEach((i) => i.setVisible(false));
  }

  destroy(): void {
    this.items.forEach((i) => i.destroy());
    this.items.length = 0;
  }
}
