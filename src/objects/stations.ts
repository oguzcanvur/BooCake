import Phaser from 'phaser';
import { stationKey, type StationSprite } from '../assets';
import { DEPTH } from '../config';
import type { DoughId, FrostingId, ToppingId } from '../data/recipes';

// The workbench stations use the team's drawings (src/assets/stations/, cut out of one sheet). The pictures
// already carry their own name labels. The ingredients (dough bowls, piping bags, topping jars) are separate
// pictures: they wiggle when the mouse is over them and hop up a little when the player takes from them.

/** Bottom edge of the station pictures (they stand on the workbench). */
const BASE_Y = 700;

/** A station picture standing on the workbench, centered on x, scaled to the given width or height. */
function addPicture(scene: Phaser.Scene, x: number, name: StationSprite, size: { w?: number; h?: number }, bottom = BASE_Y): Phaser.GameObjects.Image {
  const img = scene.add.image(x, bottom, stationKey(name)).setOrigin(0.5, 1).setDepth(DEPTH.station + 3);
  const scale = size.w ? size.w / img.width : (size.h ?? img.height) / img.height;
  return img.setScale(scale);
}

/** Place a part picture (bowl, bag) on its base picture; (cx, cy) is the part's center in the base's own pixels. */
function addPart(scene: Phaser.Scene, base: Phaser.GameObjects.Image, name: StationSprite, cx: number, cy: number): Phaser.GameObjects.Image {
  const s = base.scaleX;
  const left = base.x - base.displayWidth / 2;
  const top = base.y - base.displayHeight;
  const img = scene.add.image(0, 0, stationKey(name)).setScale(s).setOrigin(0.5, 1).setDepth(base.depth + 1);
  return img.setPosition(left + cx * s, top + (cy + img.height / 2) * s);
}

/** Wiggle on hover, hop up on click (the player takes from it). The picture's origin is its bottom center. */
function makeIngredient(scene: Phaser.Scene, pic: Phaser.GameObjects.Image, onClick: () => void): void {
  const restY = pic.y;
  const zone = scene.add
    .zone(pic.x, pic.y - pic.displayHeight / 2, pic.displayWidth, pic.displayHeight)
    .setInteractive({ useHandCursor: true });
  const reset = () => {
    scene.tweens.killTweensOf(pic);
    pic.setAngle(0).setY(restY);
  };
  zone.on('pointerover', () => {
    reset();
    scene.tweens.add({ targets: pic, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => pic.setAngle(0) });
  });
  zone.on('pointerdown', () => {
    reset();
    scene.tweens.add({ targets: pic, y: restY - 14, duration: 110, yoyo: true, hold: 60, ease: 'Quad.easeOut' });
    onClick();
  });
}

/** Where each part sits on its base picture (center, in the base picture's pixels; measured when cutting). */
const BOWLS: Record<DoughId, { key: StationSprite; cx: number; cy: number }> = {
  vanilla: { key: 'bowl_vanilla', cx: 62, cy: 53 },
  chocolate: { key: 'bowl_chocolate', cx: 152.5, cy: 53 },
  strawberry: { key: 'bowl_strawberry', cx: 244.5, cy: 53 },
};
const BAGS: Record<FrostingId, { key: StationSprite; cx: number; cy: number }> = {
  pink: { key: 'bag_pink', cx: 45, cy: 106.5 },
  mint: { key: 'bag_mint', cx: 130, cy: 93.5 },
  lilac: { key: 'bag_lilac', cx: 214, cy: 105 },
};
const JAR: Record<ToppingId, StationSprite> = { sprinkles: 'jar_sprinkles', eye: 'jar_eyes', spider: 'jar_spiders' };

/** The little table the dough bowls stand on. */
export function createDoughTable(scene: Phaser.Scene, cx: number): Phaser.GameObjects.Image {
  return addPicture(scene, cx, 'dough_table', { w: 262 });
}

/** One dough bowl on the table. Returns a handle to wiggle it ("the ovens are full"). */
export function createDoughBowl(scene: Phaser.Scene, table: Phaser.GameObjects.Image, id: DoughId, onClick: () => void): { shake: () => void } {
  const b = BOWLS[id];
  const pic = addPart(scene, table, b.key, b.cx, b.cy);
  makeIngredient(scene, pic, onClick);
  return {
    shake: () => scene.tweens.add({ targets: pic, x: pic.x + 5, duration: 45, yoyo: true, repeat: 3 }),
  };
}

/** The cloth pocket the piping bags hang in (it reaches up into the tray row). */
export function createFrostingPocket(scene: Phaser.Scene, cx: number): Phaser.GameObjects.Image {
  return addPicture(scene, cx, 'frosting_pocket', { h: 228 });
}

/** One piping bag in the pocket. */
export function createPipingBag(scene: Phaser.Scene, pocket: Phaser.GameObjects.Image, id: FrostingId, onClick: () => void): void {
  const b = BAGS[id];
  makeIngredient(scene, addPart(scene, pocket, b.key, b.cx, b.cy), onClick);
}

/** Glass jar of toppings with a cork lid and a label. */
export function createToppingJar(scene: Phaser.Scene, x: number, id: ToppingId, onClick: () => void): void {
  makeIngredient(scene, addPicture(scene, x, JAR[id], { h: 130 }), onClick);
}

/** Trash can with a skull. */
export function createTrash(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  makeIngredient(scene, addPicture(scene, x, 'trash', { h: 88 }, y + 44), onClick);
}

/** The plate on its mat: the preparation spot. The cupcake itself is drawn by the scene. */
export function createPlate(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  addPicture(scene, x, 'plate', { w: 172 }).setDepth(DEPTH.station);
  scene.add.zone(x, y, 136, 150).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
}

/** The ready tray: a silver tray with handles, one click zone per slot. */
export function createTray(scene: Phaser.Scene, centers: number[], y: number, onSlotClick: (index: number) => void): void {
  const left = centers[0] - 70;
  const right = centers[centers.length - 1] + 70;
  scene.add
    .image((left + right) / 2, y + 16, stationKey('tray'))
    .setDepth(DEPTH.station)
    .setDisplaySize(right - left, 74);
  centers.forEach((sx, i) => {
    scene.add
      .zone(sx, y, 100, 96)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onSlotClick(i));
  });
}

/** An oven slot the player has not bought yet: the locked oven picture shows the price. */
export function createLockedOven(scene: Phaser.Scene, x: number): void {
  addPicture(scene, x, 'oven_locked', { w: 124 }).setDepth(DEPTH.station);
}
