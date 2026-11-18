import Phaser from 'phaser';
import { DEPTH, FONT } from '../config';
import { frostingInfo, toppingInfo, type FrostingId, type ToppingId } from '../data/recipes';
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
    .text(0, 52, name, { fontFamily: FONT, fontSize: '13px', color: '#ffffff', fontStyle: 'bold' })
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

/** Piping bag of frosting (cone with a rolled top and a nozzle). */
export function createPipingBag(scene: Phaser.Scene, x: number, y: number, id: FrostingId, onClick: () => void): void {
  const info = frostingInfo(id);
  const { g } = makeItem(scene, x, y, info.name, 62, 112, onClick);
  const c = info.color;
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(2, 44, 44, 9);
  // two-tone cone
  g.fillStyle(c, 1);
  g.fillTriangle(-23, -32, 0, -32, 0, 36);
  g.fillStyle(shade(c, -0.18), 1);
  g.fillTriangle(0, -32, 23, -32, 0, 36);
  g.lineStyle(2, 0xffffff, 0.4);
  g.lineBetween(-17, -26, -2, 24);
  // rolled top
  g.fillStyle(shade(c, 0.2), 1);
  g.fillRoundedRect(-27, -42, 54, 14, 6);
  g.fillStyle(shade(c, -0.1), 1);
  g.fillRoundedRect(-27, -33, 54, 5, 3);
  // nozzle + a squeezed dot
  g.fillStyle(0xcfd6e6, 1);
  g.fillTriangle(-6, 28, 6, 28, 3, 40);
  g.fillTriangle(-6, 28, 3, 40, -3, 40);
  g.fillStyle(c, 1);
  g.fillCircle(0, 44, 3.5);
}

/** Glass jar of toppings. */
export function createToppingJar(scene: Phaser.Scene, x: number, y: number, id: ToppingId, onClick: () => void): void {
  const info = toppingInfo(id);
  const { g } = makeItem(scene, x, y, info.name, 62, 112, onClick);
  const lid = id === 'cherry' ? 0xe63946 : id === 'sprinkles' ? 0xffc83d : 0x66d98b;
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 44, 54, 9);
  // contents (several toppings piled in the jar)
  const spots: [number, number][] = [
    [-12, 22],
    [10, 24],
    [-2, 10],
    [14, 8],
    [-14, 4],
    [2, 28],
  ];
  for (const [dx, dy] of spots) drawTopping(g, dx, dy + 2, id, 0.8);
  // glass
  g.fillStyle(0xdfe9ff, 0.2);
  g.fillRoundedRect(-27, -32, 54, 78, 12);
  g.lineStyle(2, 0xffffff, 0.6);
  g.strokeRoundedRect(-27, -32, 54, 78, 12);
  g.fillStyle(0xffffff, 0.3);
  g.fillRoundedRect(-21, -26, 5, 38, 3);
  // lid
  g.fillStyle(lid, 1);
  g.fillRoundedRect(-24, -44, 48, 14, 6);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(-19, -42, 22, 2);
}

/** Trash can; the lid pops open when the mouse is over it. */
export function createTrash(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  const { container, g, zone } = makeItem(scene, x, y, 'Trash', 62, 112, onClick);
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 44, 54, 9);
  // can body
  g.fillStyle(0x8a93a8, 1);
  g.fillTriangle(-22, -16, 22, -16, 18, 44);
  g.fillTriangle(-22, -16, 18, 44, -18, 44);
  g.lineStyle(2.5, 0x5f6880, 1);
  for (const t of [-0.5, 0, 0.5]) g.lineBetween(t * 36, -12, t * 28, 40);
  g.fillStyle(0xffffff, 0.2);
  g.fillRect(-18, -14, 5, 50);
  // lid (rotates around its left hinge)
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

/** Soft shelf plate behind a group of station items. */
export function drawShelf(scene: Phaser.Scene, cx: number, y: number, w: number, title: string): void {
  const g = scene.add.graphics().setDepth(DEPTH.station - 1);
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(cx - w / 2, y - 76, w, 156, 18);
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(cx - w / 2, y - 80, w, 156, 18);
  scene.add
    .text(cx, y - 94, title, { fontFamily: FONT, fontSize: '14px', color: '#c9bdf0', fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(DEPTH.station);
}
