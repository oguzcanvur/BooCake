import type Phaser from 'phaser';
import { INK } from '../config';

// Small vector icons shared by the interface (all drawn with the same ink outline, light from the top-left).

type G = Phaser.GameObjects.Graphics;

/** Five-point star. filled = gold, otherwise an empty slot. */
export function drawStar(g: G, x: number, y: number, r: number, filled: boolean, lw = 3): void {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.48;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  g.fillStyle(filled ? 0xffc83d : 0x4b3a68, 1);
  g.fillPoints(pts as Phaser.Math.Vector2[], true);
  if (filled) {
    g.fillStyle(0xffe58a, 1);
    g.fillCircle(x - r * 0.18, y - r * 0.2, r * 0.28);
  }
  g.lineStyle(lw, INK, 1);
  g.strokePoints(pts as Phaser.Math.Vector2[], true);
}

/** Gold coin with a little star stamp. */
export function drawCoin(g: G, x: number, y: number, r: number): void {
  g.fillStyle(0xc98b1d, 1);
  g.fillCircle(x, y + 2, r);
  g.fillStyle(0xffc83d, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(2.5, INK, 1);
  g.strokeCircle(x, y, r);
  g.lineStyle(2, 0xe0a52a, 1);
  g.strokeCircle(x, y, r * 0.66);
  g.fillStyle(0xfff0b8, 0.9);
  g.fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.5, r * 0.3);
}

/** Crescent moon. */
export function drawMoon(g: G, x: number, y: number, r: number, bg: number): void {
  g.fillStyle(0xfff0b8, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(2.5, INK, 1);
  g.strokeCircle(x, y, r);
  g.fillStyle(bg, 1);
  g.fillCircle(x + r * 0.45, y - r * 0.3, r * 0.82);
}

/** Round clock face with hands. */
export function drawClock(g: G, x: number, y: number, r: number, color = 0xfff0d6): void {
  g.fillStyle(color, 1);
  g.fillCircle(x, y, r);
  g.lineStyle(2.5, INK, 1);
  g.strokeCircle(x, y, r);
  g.lineStyle(2.5, INK, 1);
  g.lineBetween(x, y, x, y - r * 0.6);
  g.lineBetween(x, y, x + r * 0.45, y + r * 0.15);
}

/** Speaker with sound waves, or crossed out when muted. */
/** Pause sign: two rounded bars. */
export function drawPause(g: G, x: number, y: number): void {
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(x - 8, y - 9, 6, 18, 2);
  g.fillRoundedRect(x + 2, y - 9, 6, 18, 2);
}

export function drawSpeaker(g: G, x: number, y: number, muted: boolean): void {
  const col = muted ? 0x8a7fa8 : 0xffffff;
  g.fillStyle(col, 1);
  g.fillRoundedRect(x - 10, y - 5, 7, 10, 2);
  g.fillTriangle(x - 4, y - 5, x + 5, y - 12, x + 5, y + 12);
  g.fillTriangle(x - 4, y - 5, x + 5, y + 12, x - 4, y + 5);
  g.lineStyle(2.5, col, 1);
  if (muted) {
    g.lineBetween(x + 9, y - 6, x + 17, y + 6);
    g.lineBetween(x + 17, y - 6, x + 9, y + 6);
  } else {
    g.beginPath();
    g.arc(x + 6, y, 7, -0.9, 0.9, false);
    g.strokePath();
    g.beginPath();
    g.arc(x + 6, y, 12, -0.9, 0.9, false);
    g.strokePath();
  }
}

/** A rounded "pill" panel with a top highlight, used across the HUD. */
export function drawPill(g: G, x: number, y: number, w: number, h: number, fill: number, edge = INK): void {
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(x, y + 3, w, h, h / 2);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, h / 2);
  g.fillStyle(0xffffff, 0.12);
  g.fillRoundedRect(x + 4, y + 3, w - 8, h / 2 - 3, (h / 2 - 3) / 2);
  g.lineStyle(2.5, edge, 1);
  g.strokeRoundedRect(x, y, w, h, h / 2);
}
