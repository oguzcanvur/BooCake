// Soft art style: every color the game draws goes through `soften` (lower saturation, lifted darks, a little
// warm cream mixed in), outlines become warm brown instead of dark plum, and a paper grain sits over each scene.
// It works by patching Phaser's style setters once, so the drawing code everywhere else stays unchanged.
// To go back to the crisp original look, remove the `installSoftStyle()` call in main.ts.
import Phaser from 'phaser';

/** How strongly colors are calmed down. 0 = original colors, 1 = fully soft. */
const STRENGTH = 1;
/** Fill colors: keep this much of the saturation. */
const FILL_SAT = 0.62;
/** Fill colors: lightness is mapped from [0, 1] to [FILL_FLOOR, FILL_FLOOR + FILL_RANGE]. */
const FILL_FLOOR = 0.24;
const FILL_RANGE = 0.72;
/** Lines are softened less, so outlines stay readable. */
const LINE_SAT = 0.75;
const LINE_FLOOR = 0.08;
const LINE_RANGE = 0.9;
/** Warm cream mixed into every fill, like paper showing through the paint. */
const CREAM = { r: 246, g: 232, b: 212 };
const CREAM_MIX = 0.18;
/** Cold blues and purples are pulled this far toward warm mauve (hue 0.92), so the shop feels cozy. */
const WARM_SHIFT = 0.35;

const fillCache = new Map<number, number>();
const lineCache = new Map<number, number>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

function transform(color: number, sat: number, floor: number, range: number, cream: number): number {
  const r0 = (color >> 16) & 0xff;
  const g0 = (color >> 8) & 0xff;
  const b0 = color & 0xff;
  const [h0, s, l] = rgbToHsl(r0, g0, b0);
  const h = h0 > 0.55 && h0 < 0.92 ? h0 + (0.92 - h0) * WARM_SHIFT : h0;
  let [r, g, b] = hslToRgb(h, s * sat, floor + l * range);
  r += (CREAM.r - r) * cream;
  g += (CREAM.g - g) * cream;
  b += (CREAM.b - b) * cream;
  // blend with the original by STRENGTH
  r = r0 + (r - r0) * STRENGTH;
  g = g0 + (g - g0) * STRENGTH;
  b = b0 + (b - b0) * STRENGTH;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Soft version of a fill color. */
export function soften(color: number): number {
  let out = fillCache.get(color);
  if (out === undefined) {
    out = transform(color, FILL_SAT, FILL_FLOOR, FILL_RANGE, CREAM_MIX);
    fillCache.set(color, out);
  }
  return out;
}

/** Soft version of a line color (calmer, but keeps more contrast than fills). */
export function softenLine(color: number): number {
  let out = lineCache.get(color);
  if (out === undefined) {
    out = transform(color, LINE_SAT, LINE_FLOOR, LINE_RANGE, 0);
    lineCache.set(color, out);
  }
  return out;
}

/** Soft version of a CSS hex color string ('#rrggbb'); other strings pass through. */
function softenCss(css: unknown): unknown {
  if (typeof css !== 'string' || !/^#[0-9a-f]{6}$/i.test(css)) return css;
  return '#' + soften(parseInt(css.slice(1), 16)).toString(16).padStart(6, '0');
}

const num = (c: unknown, f: (n: number) => number): unknown => (typeof c === 'number' ? f(c) : c);

/** Patch Phaser once so every Graphics, Shape and Text color is drawn in the soft style. */
let bypass = false;

/**
 * Draw with the exact colors given (no softening) inside fn. Used where a drawn color must match one of the
 * team's pictures, which are never softened (e.g. the order ticket's ingredient icons vs. the bowls and bags).
 */
export function unsoftened(fn: () => void): void {
  bypass = true;
  try {
    fn();
  } finally {
    bypass = false;
  }
}

export function installSoftStyle(): void {
  const gfx = Phaser.GameObjects.Graphics.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const fillStyle = gfx.fillStyle;
  gfx.fillStyle = function (this: unknown, color: unknown, ...rest: unknown[]) {
    return fillStyle.call(this, bypass ? color : num(color, soften), ...rest);
  };
  const lineStyle = gfx.lineStyle;
  gfx.lineStyle = function (this: unknown, width: unknown, color: unknown, ...rest: unknown[]) {
    return lineStyle.call(this, width, bypass ? color : num(color, softenLine), ...rest);
  };
  const gradient = gfx.fillGradientStyle;
  gfx.fillGradientStyle = function (this: unknown, tl: unknown, tr: unknown, bl: unknown, br: unknown, ...rest: unknown[]) {
    return gradient.call(this, num(tl, soften), num(tr, soften), num(bl, soften), num(br, soften), ...rest);
  };

  const shape = Phaser.GameObjects.Shape.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const setFill = shape.setFillStyle;
  shape.setFillStyle = function (this: unknown, color: unknown, ...rest: unknown[]) {
    return setFill.call(this, num(color, soften), ...rest);
  };
  const setStroke = shape.setStrokeStyle;
  shape.setStrokeStyle = function (this: unknown, width: unknown, color: unknown, ...rest: unknown[]) {
    return setStroke.call(this, width, num(color, softenLine), ...rest);
  };

  const text = Phaser.GameObjects.Text.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const setColor = text.setColor;
  text.setColor = function (this: unknown, color: unknown) {
    return setColor.call(this, softenCss(color));
  };
  const setTextStroke = text.setStroke;
  text.setStroke = function (this: unknown, color: unknown, ...rest: unknown[]) {
    return setTextStroke.call(this, softenCss(color), ...rest);
  };
}

/** Soften the colors in a text style object (used by the text factory patch in main.ts). */
export function softenTextStyle<T>(style: T): T {
  if (!style || typeof style !== 'object') return style;
  const s = { ...(style as Record<string, unknown>) };
  if ('color' in s) s.color = softenCss(s.color);
  if ('stroke' in s) s.stroke = softenCss(s.stroke);
  return s as T;
}

/**
 * Paper grain over the whole game, like the texture of a printed illustration. It is a see-through HTML layer
 * on top of the canvas (clicks pass through), because Phaser 4 drew a dark veil for a see-through canvas texture.
 */
export function addPaperGrain(): void {
  const size = 256;
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const ctx = tile.getContext('2d');
  if (!ctx) return;
  // warm brown specks
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(110, 75, 60, ${(0.03 + Math.random() * 0.07).toFixed(3)})`;
    ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
  }
  // a few faint fibers
  ctx.strokeStyle = 'rgba(120, 85, 70, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const a = Math.random() * Math.PI;
    const len = 6 + Math.random() * 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  const layer = document.createElement('div');
  layer.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:10;' + `background-image:url(${tile.toDataURL()});background-size:${size}px;`;
  document.body.appendChild(layer);
}
