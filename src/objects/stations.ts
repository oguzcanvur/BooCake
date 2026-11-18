import Phaser from 'phaser';
import { DEPTH, FONT } from '../config';
import { doughInfo, frostingInfo, toppingInfo, type DoughId, type FrostingId, type ToppingId } from '../data/recipes';
import { T } from '../text';
import { drawTopping, shade } from './cupcake';

/** A station item: a drawn container with hover / press feedback and a click zone. */
interface Item {
  container: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
}

function makeItem(scene: Phaser.Scene, x: number, y: number, name: string, hitW: number, hitH: number, onClick: () => void): Item {
  const container = scene.add.container(x, y).setDepth(DEPTH.station + 3);
  const g = scene.add.graphics();
  const label = scene.add
    .text(0, 54, name, { fontFamily: FONT, fontSize: '14px', color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5);
  container.add([g, label]);

  const zone = scene.add.zone(x, y + 6, hitW, hitH).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.09, duration: 100 }));
  zone.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, duration: 100 }));
  zone.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: 0.92, duration: 70, yoyo: true });
    onClick();
  });
  return { container, g, zone };
}

/** Mixing bowl with raw dough. Returns a handle to wiggle it ("the ovens are full"). */
export function createDoughBowl(scene: Phaser.Scene, x: number, y: number, id: DoughId, onClick: () => void): { shake: () => void } {
  const info = doughInfo(id);
  const { container, g } = makeItem(scene, x, y, info.name, 66, 112, onClick);
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 44, 62, 10);
  // wooden spoon leaning on the bowl
  g.lineStyle(5, 0xb98a5a, 1);
  g.lineBetween(14, -8, 32, -40);
  g.fillStyle(0xb98a5a, 1);
  g.fillEllipse(34, -44, 11, 16);
  // bowl
  g.fillStyle(0xcfd8f2, 1);
  g.fillRoundedRect(-32, -4, 64, 44, { tl: 8, tr: 8, bl: 30, br: 30 });
  g.fillStyle(0xe9eefc, 1);
  g.fillRoundedRect(-32, -4, 64, 10, 6);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(-24, 10, 6, 20, 3);
  // dough heap
  g.fillStyle(shade(info.bowl, -0.12), 1);
  g.fillEllipse(0, -6, 58, 16);
  g.fillStyle(info.bowl, 1);
  g.fillEllipse(0, -10, 48, 20);
  g.fillStyle(0xffffff, 0.4);
  g.fillEllipse(-8, -14, 14, 6);
  return {
    shake: () => scene.tweens.add({ targets: container, x: container.x + 5, duration: 45, yoyo: true, repeat: 3 }),
  };
}

/** Piping bag of frosting (cone with a rolled top and a nozzle). */
export function createPipingBag(scene: Phaser.Scene, x: number, y: number, id: FrostingId, onClick: () => void): void {
  const info = frostingInfo(id);
  const { g } = makeItem(scene, x, y, info.name, 62, 112, onClick);
  const c = info.color;
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(2, 46, 44, 9);
  g.fillStyle(c, 1);
  g.fillTriangle(-23, -32, 0, -32, 0, 38);
  g.fillStyle(shade(c, -0.18), 1);
  g.fillTriangle(0, -32, 23, -32, 0, 38);
  g.lineStyle(2, 0xffffff, 0.4);
  g.lineBetween(-17, -26, -2, 26);
  g.fillStyle(shade(c, 0.2), 1);
  g.fillRoundedRect(-27, -42, 54, 14, 6);
  g.fillStyle(shade(c, -0.1), 1);
  g.fillRoundedRect(-27, -33, 54, 5, 3);
  g.fillStyle(0xcfd6e6, 1);
  g.fillTriangle(-6, 30, 6, 30, 3, 42);
  g.fillTriangle(-6, 30, 3, 42, -3, 42);
  g.fillStyle(c, 1);
  g.fillCircle(0, 46, 3.5);
}

/** Glass jar of toppings. */
export function createToppingJar(scene: Phaser.Scene, x: number, y: number, id: ToppingId, onClick: () => void): void {
  const info = toppingInfo(id);
  const { g } = makeItem(scene, x, y, info.name, 62, 112, onClick);
  const lid = id === 'sprinkles' ? 0xffc83d : id === 'eye' ? 0xe63946 : 0x7e57c2;
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 46, 54, 9);
  const spots: [number, number][] = [
    [-12, 24],
    [10, 26],
    [-2, 12],
    [14, 10],
    [-14, 6],
    [2, 30],
  ];
  for (const [dx, dy] of spots) drawTopping(g, dx, dy + 2, id, 0.8);
  g.fillStyle(0xdfe9ff, 0.2);
  g.fillRoundedRect(-27, -32, 54, 80, 12);
  g.lineStyle(2, 0xffffff, 0.6);
  g.strokeRoundedRect(-27, -32, 54, 80, 12);
  g.fillStyle(0xffffff, 0.3);
  g.fillRoundedRect(-21, -26, 5, 38, 3);
  g.fillStyle(lid, 1);
  g.fillRoundedRect(-24, -44, 48, 14, 6);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(-19, -42, 22, 2);
}

/** Trash can; the lid pops open when the mouse is over it. */
export function createTrash(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  const { container, g, zone } = makeItem(scene, x, y, T.trash, 62, 112, onClick);
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 46, 54, 9);
  g.fillStyle(0x8a93a8, 1);
  g.fillTriangle(-22, -16, 22, -16, 18, 46);
  g.fillTriangle(-22, -16, 18, 46, -18, 46);
  g.lineStyle(2.5, 0x5f6880, 1);
  for (const t of [-0.5, 0, 0.5]) g.lineBetween(t * 36, -12, t * 28, 42);
  g.fillStyle(0xffffff, 0.2);
  g.fillRect(-18, -14, 5, 52);
  const lid = scene.add.graphics();
  lid.fillStyle(0xa6aec2, 1);
  lid.fillRoundedRect(0, -10, 50, 9, 4);
  lid.fillStyle(0x5f6880, 1);
  lid.fillRoundedRect(17, -17, 16, 7, 3);
  lid.setPosition(-25, -16);
  container.add(lid);
  zone.on('pointerover', () => scene.tweens.add({ targets: lid, angle: -22, duration: 120 }));
  zone.on('pointerout', () => scene.tweens.add({ targets: lid, angle: 0, duration: 120 }));
}

/** The plate: the preparation spot where the cupcake is decorated. The cupcake itself is drawn by the scene. */
export function createPlate(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  const g = scene.add.graphics().setDepth(DEPTH.station + 3);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(x, y + 44, 132, 24);
  g.fillStyle(0xdfe3f2, 1);
  g.fillEllipse(x, y + 36, 128, 34);
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(x, y + 33, 128, 34);
  g.fillStyle(0xeef1fb, 1);
  g.fillEllipse(x, y + 34, 88, 20);
  g.lineStyle(2, 0xcdd3e6, 1);
  g.strokeEllipse(x, y + 34, 100, 24);
  scene.add.zone(x, y, 136, 140).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
}

/** The ready tray: finished cupcakes wait here. One round slot per cupcake. */
export function createTray(scene: Phaser.Scene, centers: number[], y: number, onSlotClick: (index: number) => void): void {
  const g = scene.add.graphics().setDepth(DEPTH.station + 3);
  const left = centers[0] - 70;
  const right = centers[centers.length - 1] + 70;
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(left, y - 34, right - left, 84, 22);
  g.fillStyle(0xcfd6e6, 1);
  g.fillRoundedRect(left, y - 40, right - left, 84, 22);
  g.fillStyle(0xe8edf8, 1);
  g.fillRoundedRect(left + 6, y - 36, right - left - 12, 76, 18);
  centers.forEach((cx, i) => {
    g.fillStyle(0xf8faff, 1);
    g.fillEllipse(cx, y + 24, 92, 26);
    g.lineStyle(2, 0xc9d0e4, 1);
    g.strokeEllipse(cx, y + 24, 92, 26);
    scene.add
      .zone(cx, y, 100, 92)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onSlotClick(i));
  });
}

/** An oven slot the player has not bought yet (3rd oven): grey silhouette with a lock and the price. */
export function createLockedOven(scene: Phaser.Scene, x: number, y: number, price: number): void {
  const g = scene.add.graphics().setDepth(DEPTH.station);
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(x, y + 76, 124, 14);
  g.fillStyle(0x4b4670, 0.75);
  g.fillRoundedRect(x - 56, y - 72, 112, 148, 14);
  g.fillStyle(0x38345a, 0.9);
  g.fillRoundedRect(x - 48, y - 42, 96, 108, 10);
  // padlock
  g.lineStyle(6, 0xb9b3d9, 1);
  g.beginPath();
  g.arc(x, y - 10, 13, Math.PI, 0, false);
  g.strokePath();
  g.fillStyle(0xb9b3d9, 1);
  g.fillRoundedRect(x - 20, y - 10, 40, 30, 6);
  g.fillStyle(0x38345a, 1);
  g.fillCircle(x, y + 3, 4);
  g.fillRect(x - 1.5, y + 3, 3, 9);
  scene.add
    .text(x, y + 44, `$${price}`, { fontFamily: FONT, fontSize: '20px', color: '#ffd166', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(DEPTH.station + 1);
  scene.add
    .text(x, y + 84, T.ovenLocked, { fontFamily: FONT, fontSize: '14px', color: '#9d8fd0', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(DEPTH.station + 1);
}

/** Soft shelf plate behind a group of station items. */
export function drawShelf(scene: Phaser.Scene, cx: number, y: number, w: number, title: string): void {
  const g = scene.add.graphics().setDepth(DEPTH.station - 1);
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(cx - w / 2, y - 76, w, 158, 18);
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(cx - w / 2, y - 80, w, 158, 18);
  scene.add
    .text(cx, y - 94, title, { fontFamily: FONT, fontSize: '15px', color: '#c9bdf0', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(DEPTH.station);
}
