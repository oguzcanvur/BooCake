import Phaser from 'phaser';
import { DEPTH, FONT, INK } from '../config';
import { doughInfo, frostingInfo, toppingInfo, type DoughId, type FrostingId, type ToppingId } from '../data/recipes';
import { T } from '../text';
import { drawTopping, shade } from './cupcake';

type G = Phaser.GameObjects.Graphics;

/** A station item: a drawn container with hover / press feedback and a click zone. */
interface Item {
  container: Phaser.GameObjects.Container;
  g: G;
  zone: Phaser.GameObjects.Zone;
}

const LABEL_STYLE = { fontFamily: FONT, fontSize: '14px', color: '#fff6e0', fontStyle: 'bold', stroke: '#2a1a3a', strokeThickness: 4 };

function makeItem(scene: Phaser.Scene, x: number, y: number, name: string, hitW: number, hitH: number, onClick: () => void): Item {
  const container = scene.add.container(x, y).setDepth(DEPTH.station + 3);
  const g = scene.add.graphics();
  const label = scene.add.text(0, 56, name, LABEL_STYLE).setOrigin(0.5);
  container.add([g, label]);

  const zone = scene.add.zone(x, y + 6, hitW, hitH).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.08, y: y - 3, duration: 110, ease: 'Quad.easeOut' }));
  zone.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, y, duration: 110, ease: 'Quad.easeOut' }));
  zone.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scaleX: 1.12, scaleY: 0.9, duration: 70, yoyo: true });
    onClick();
  });
  return { container, g, zone };
}

function outline(g: G, lw = 2.5): void {
  g.lineStyle(lw, INK, 1);
}

/** Ceramic mixing bowl with raw dough and a wooden spoon. Returns a handle to wiggle it ("the ovens are full"). */
export function createDoughBowl(scene: Phaser.Scene, x: number, y: number, id: DoughId, onClick: () => void): { shake: () => void } {
  const info = doughInfo(id);
  const { container, g } = makeItem(scene, x, y, info.name, 66, 116, onClick);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(0, 44, 64, 11);
  // spoon behind the bowl
  g.fillStyle(0xc8925a, 1);
  g.fillPoints([{ x: 12, y: -6 }, { x: 30, y: -40 }, { x: 35, y: -38 }, { x: 18, y: -4 }] as Phaser.Math.Vector2[], true);
  g.fillEllipse(34, -45, 13, 18);
  outline(g, 2);
  g.strokePoints([{ x: 12, y: -6 }, { x: 30, y: -40 }, { x: 35, y: -38 }, { x: 18, y: -4 }] as Phaser.Math.Vector2[], true);
  g.strokeEllipse(34, -45, 13, 18);
  // bowl body
  g.fillStyle(0xd7d4f2, 1);
  g.fillRoundedRect(-33, -6, 66, 46, { tl: 6, tr: 6, bl: 32, br: 32 });
  g.fillStyle(0xb3aedf, 1);
  g.fillRoundedRect(-33, 18, 66, 22, { tl: 0, tr: 0, bl: 32, br: 32 });
  g.fillStyle(0xffffff, 0.45);
  g.fillRoundedRect(-25, 4, 6, 22, 3);
  g.fillStyle(0xff9ec9, 1);
  g.fillRect(-33, 10, 66, 4);
  outline(g);
  g.strokeRoundedRect(-33, -6, 66, 46, { tl: 6, tr: 6, bl: 32, br: 32 });
  // rim and dough heap
  g.fillStyle(0xeceafb, 1);
  g.fillEllipse(0, -6, 70, 16);
  outline(g);
  g.strokeEllipse(0, -6, 70, 16);
  g.fillStyle(info.bowl, 1);
  g.fillEllipse(0, -10, 54, 20);
  g.lineStyle(2, INK, 1);
  g.strokeEllipse(0, -10, 54, 20);
  g.fillStyle(0xffffff, 0.45);
  g.fillEllipse(-9, -14, 15, 6);
  return {
    shake: () => scene.tweens.add({ targets: container, x: container.x + 5, duration: 45, yoyo: true, repeat: 3 }),
  };
}

/** Piping bag of frosting (two-tone cone, rolled top, metal nozzle) on a little wooden stand. */
export function createPipingBag(scene: Phaser.Scene, x: number, y: number, id: FrostingId, onClick: () => void): void {
  const info = frostingInfo(id);
  const { g } = makeItem(scene, x, y, info.name, 62, 116, onClick);
  const c = info.color;
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(0, 46, 50, 10);
  g.fillStyle(0x8d5a3d, 1);
  g.fillRoundedRect(-20, 38, 40, 9, 4);
  outline(g, 2);
  g.strokeRoundedRect(-20, 38, 40, 9, 4);
  // cone
  g.fillStyle(c, 1);
  g.fillTriangle(-24, -30, 24, -30, 0, 34);
  g.fillStyle(shade(c, -0.18), 1);
  g.fillTriangle(4, -30, 24, -30, 1, 32);
  g.lineStyle(2, 0xffffff, 0.45);
  g.lineBetween(-16, -24, -3, 20);
  g.lineStyle(1.5, shade(c, -0.3), 0.6);
  g.lineBetween(-8, -28, 0, 10);
  outline(g);
  g.strokeTriangle(-24, -30, 24, -30, 0, 34);
  // rolled top
  g.fillStyle(shade(c, 0.22), 1);
  g.fillRoundedRect(-28, -42, 56, 15, 7);
  outline(g);
  g.strokeRoundedRect(-28, -42, 56, 15, 7);
  // nozzle and a dollop
  g.fillStyle(0xd9dfef, 1);
  g.fillTriangle(-7, 26, 7, 26, 3, 38);
  g.fillTriangle(-7, 26, 3, 38, -3, 38);
  outline(g, 2);
  g.strokeTriangle(-7, 26, 7, 26, 0, 38);
}

/** Glass jar of toppings with a cork lid and a label showing the topping. */
export function createToppingJar(scene: Phaser.Scene, x: number, y: number, id: ToppingId, onClick: () => void): void {
  const info = toppingInfo(id);
  const { g } = makeItem(scene, x, y, info.name, 62, 116, onClick);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(0, 47, 56, 10);
  // contents
  const spots: [number, number][] = [
    [-12, 28],
    [10, 30],
    [-1, 16],
    [14, 14],
    [-14, 10],
    [2, 34],
  ];
  g.fillStyle(0x2a1a3a, 0.25);
  g.fillRoundedRect(-24, 4, 48, 40, 10);
  for (const [dx, dy] of spots) drawTopping(g, dx, dy, id, 0.72);
  // glass with shine
  g.fillStyle(0xdfe9ff, 0.18);
  g.fillRoundedRect(-27, -30, 54, 78, 13);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(-21, -24, 5, 40, 3);
  outline(g);
  g.strokeRoundedRect(-27, -30, 54, 78, 13);
  // label with a small picture of the topping
  g.fillStyle(0xfff3dc, 1);
  g.fillRoundedRect(-18, -20, 36, 22, 5);
  outline(g, 1.8);
  g.strokeRoundedRect(-18, -20, 36, 22, 5);
  drawTopping(g, 0, -9, id, 0.55);
  // cork lid
  g.fillStyle(0xc8925a, 1);
  g.fillRoundedRect(-22, -44, 44, 16, 6);
  g.fillStyle(0xe0ad73, 1);
  g.fillRoundedRect(-18, -42, 36, 5, 3);
  outline(g);
  g.strokeRoundedRect(-22, -44, 44, 16, 6);
}

/** Trash can with a ghost sticker; the lid pops open when the mouse is over it. */
export function createTrash(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  const { container, g, zone } = makeItem(scene, x, y, T.trash, 66, 116, onClick);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(0, 47, 58, 10);
  g.fillStyle(0x8a93b0, 1);
  g.fillPoints([{ x: -23, y: -16 }, { x: 23, y: -16 }, { x: 18, y: 46 }, { x: -18, y: 46 }] as Phaser.Math.Vector2[], true);
  g.fillStyle(0x6b7392, 1);
  g.fillPoints([{ x: 8, y: -16 }, { x: 23, y: -16 }, { x: 18, y: 46 }, { x: 6, y: 46 }] as Phaser.Math.Vector2[], true);
  g.lineStyle(2, 0x535a78, 1);
  for (const t of [-0.5, 0, 0.5]) g.lineBetween(t * 36, -10, t * 28, 42);
  g.fillStyle(0xffffff, 0.22);
  g.fillRect(-18, -14, 5, 54);
  outline(g);
  g.strokePoints([{ x: -23, y: -16 }, { x: 23, y: -16 }, { x: 18, y: 46 }, { x: -18, y: 46 }] as Phaser.Math.Vector2[], true);
  // ghost sticker
  g.fillStyle(0xfdfbff, 1);
  g.fillCircle(-2, 12, 9);
  g.fillRect(-11, 12, 18, 10);
  g.lineStyle(1.5, INK, 1);
  g.strokeCircle(-2, 12, 9);
  g.fillStyle(INK, 1);
  g.fillCircle(-5, 11, 1.6);
  g.fillCircle(1, 11, 1.6);
  const lid = scene.add.graphics();
  lid.fillStyle(0xa9b1cb, 1);
  lid.fillRoundedRect(0, -10, 52, 10, 4);
  lid.fillStyle(0x6b7392, 1);
  lid.fillRoundedRect(18, -18, 16, 8, 3);
  lid.lineStyle(2.5, INK, 1);
  lid.strokeRoundedRect(0, -10, 52, 10, 4);
  lid.strokeRoundedRect(18, -18, 16, 8, 3);
  lid.setPosition(-26, -16);
  container.add(lid);
  zone.on('pointerover', () => scene.tweens.add({ targets: lid, angle: -24, duration: 120 }));
  zone.on('pointerout', () => scene.tweens.add({ targets: lid, angle: 0, duration: 120 }));
}

/** The plate on a little cake stand: the preparation spot. The cupcake itself is drawn by the scene. */
export function createPlate(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  const g = scene.add.graphics().setDepth(DEPTH.station + 3);
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(x, y + 66, 92, 16);
  // stand
  g.fillStyle(0xe3dcf5, 1);
  g.fillEllipse(x, y + 62, 72, 16);
  g.fillRect(x - 8, y + 38, 16, 24);
  g.lineStyle(2.5, INK, 1);
  g.strokeEllipse(x, y + 62, 72, 16);
  g.lineBetween(x - 8, y + 40, x - 8, y + 58);
  g.lineBetween(x + 8, y + 40, x + 8, y + 58);
  // plate
  g.fillStyle(0xc9c2e6, 1);
  g.fillEllipse(x, y + 37, 130, 32);
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(x, y + 34, 130, 30);
  g.fillStyle(0xf1eefc, 1);
  g.fillEllipse(x, y + 35, 92, 18);
  g.lineStyle(2.5, INK, 1);
  g.strokeEllipse(x, y + 35, 130, 32);
  g.lineStyle(1.5, 0xc9c2e6, 1);
  g.strokeEllipse(x, y + 35, 104, 22);
  scene.add.zone(x, y, 136, 150).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
}

/** The ready tray: a silver tray with handles and a lace doily per slot. */
export function createTray(scene: Phaser.Scene, centers: number[], y: number, onSlotClick: (index: number) => void): void {
  const g = scene.add.graphics().setDepth(DEPTH.station + 3);
  const left = centers[0] - 70;
  const right = centers[centers.length - 1] + 70;
  const cx = (left + right) / 2;
  const w = right - left;
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(cx, y + 30, w + 20, 46);
  // handles: a rounded loop on each side
  for (const side of [-1, 1]) {
    const hx = cx + side * (w / 2 + 4) - 11;
    g.lineStyle(7, INK, 1);
    g.strokeRoundedRect(hx, y + 8, 22, 24, 9);
    g.lineStyle(3.5, 0xd9dfef, 1);
    g.strokeRoundedRect(hx, y + 8, 22, 24, 9);
  }
  g.fillStyle(0xa9b1cb, 1);
  g.fillEllipse(cx, y + 22, w + 6, 44);
  g.fillStyle(0xe4e8f5, 1);
  g.fillEllipse(cx, y + 18, w, 40);
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(cx - w * 0.22, y + 10, w * 0.4, 10);
  g.lineStyle(2.5, INK, 1);
  g.strokeEllipse(cx, y + 20, w + 6, 44);
  centers.forEach((sx, i) => {
    // lace doily
    g.fillStyle(0xffffff, 1);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.fillCircle(sx + Math.cos(a) * 40, y + 20 + Math.sin(a) * 11, 5);
    }
    g.fillEllipse(sx, y + 20, 84, 24);
    g.lineStyle(1.2, 0xd6d0ea, 1);
    g.strokeEllipse(sx, y + 20, 60, 16);
    scene.add
      .zone(sx, y, 100, 96)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onSlotClick(i));
  });
}

/** An oven slot the player has not bought yet (3rd oven): grey silhouette with a padlock and the price. */
export function createLockedOven(scene: Phaser.Scene, x: number, y: number, price: number): void {
  const g = scene.add.graphics().setDepth(DEPTH.station);
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(x, y + 78, 120, 14);
  g.fillStyle(0x4b4670, 0.8);
  g.fillRoundedRect(x - 54, y - 66, 108, 140, { tl: 40, tr: 40, bl: 14, br: 14 });
  g.lineStyle(3, INK, 0.8);
  g.strokeRoundedRect(x - 54, y - 66, 108, 140, { tl: 40, tr: 40, bl: 14, br: 14 });
  g.fillStyle(0x38345a, 1);
  g.fillCircle(x, y + 2, 36);
  // padlock
  g.lineStyle(6, 0xd8cfee, 1);
  g.beginPath();
  g.arc(x, y - 6, 12, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0xd8cfee, 1);
  g.fillRoundedRect(x - 19, y - 6, 38, 28, 6);
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(x - 19, y - 6, 38, 28, 6);
  g.fillStyle(0x38345a, 1);
  g.fillCircle(x, y + 6, 4);
  g.fillRect(x - 1.5, y + 6, 3, 9);
  scene.add.text(x, y + 52, `$${price}`, { ...LABEL_STYLE, fontSize: '20px', color: '#ffd166' }).setOrigin(0.5).setDepth(DEPTH.station + 1);
  scene.add.text(x, y + 88, T.ovenLocked, { ...LABEL_STYLE, fontSize: '13px', color: '#cbbcf2' }).setOrigin(0.5).setDepth(DEPTH.station + 1);
}

/** Purple felt mat with gold stitching under a group of station items, and a wooden name plaque. */
export function drawShelf(scene: Phaser.Scene, cx: number, y: number, w: number, title: string): void {
  const g = scene.add.graphics().setDepth(DEPTH.station - 1);
  const left = cx - w / 2;
  const top = y - 76;
  const h = 160;
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(left, top + 5, w, h, 18);
  g.fillStyle(0x4b2d6e, 1);
  g.fillRoundedRect(left, top, w, h, 18);
  g.fillStyle(0xffffff, 0.05);
  g.fillRoundedRect(left + 4, top + 4, w - 8, h / 2, 14);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(left, top, w, h, 18);
  // gold stitches along the inner border
  g.lineStyle(2, 0xd9a84e, 0.85);
  const inset = 8;
  for (let x = left + inset + 12; x < left + w - inset - 12; x += 12) {
    g.lineBetween(x, top + inset, x + 6, top + inset);
    g.lineBetween(x, top + h - inset, x + 6, top + h - inset);
  }
  for (let yy = top + inset + 12; yy < top + h - inset - 12; yy += 12) {
    g.lineBetween(left + inset, yy, left + inset, yy + 6);
    g.lineBetween(left + w - inset, yy, left + w - inset, yy + 6);
  }
  // wooden plaque with the title
  const pw = Math.max(90, title.length * 11 + 30);
  const py = top - 16;
  g.fillStyle(0x000000, 0.3);
  g.fillRoundedRect(cx - pw / 2, py + 3, pw, 28, 9);
  g.fillStyle(0x6e4430, 1);
  g.fillRoundedRect(cx - pw / 2, py, pw, 28, 9);
  g.fillStyle(0xffffff, 0.12);
  g.fillRoundedRect(cx - pw / 2 + 4, py + 3, pw - 8, 8, 4);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(cx - pw / 2, py, pw, 28, 9);
  g.fillStyle(0xd9a84e, 1);
  g.fillCircle(cx - pw / 2 + 9, py + 14, 2.5);
  g.fillCircle(cx + pw / 2 - 9, py + 14, 2.5);
  scene.add
    .text(cx, py + 14, title, { fontFamily: FONT, fontSize: '15px', color: '#fff0d0', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(DEPTH.station);
}
