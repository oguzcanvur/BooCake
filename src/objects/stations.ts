import Phaser from 'phaser';
import { stationKey, type StationSprite } from '../assets';
import { DEPTH, FONT, INK } from '../config';
import { doughInfo, frostingInfo, toppingInfo, type DoughId, type FrostingId, type ToppingId } from '../data/recipes';
import { drawTopping } from './cupcake';
import { CONFIG } from '../data/gameConfig';
import { T } from '../text';

// The workbench stations use the team's drawings (src/assets/stations/, cut out of one sheet). The pictures
// carry Turkish name labels; English name tags are stuck over them (withTag). The ingredients (dough bowls, piping bags, topping jars) are separate
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

type Movable = Phaser.GameObjects.Image | Phaser.GameObjects.Container;

/**
 * Wiggle on hover, hop up on click (the player takes from it). `pic` stands on its bottom center;
 * w and h are its size on screen (needed when it is a container).
 */
function makeIngredient(scene: Phaser.Scene, pic: Movable, onClick: () => void, w = (pic as Phaser.GameObjects.Image).displayWidth, h = (pic as Phaser.GameObjects.Image).displayHeight): void {
  const restY = pic.y;
  const zone = scene.add.zone(pic.x, pic.y - h / 2, w, h).setInteractive({ useHandCursor: true });
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
const BOWL_SPOTS = [
  { cx: 62, cy: 53 },
  { cx: 152.5, cy: 53 },
  { cx: 244.5, cy: 53 },
];
const BAG_SPOTS = [
  { cx: 45, cy: 106.5 },
  { cx: 130, cy: 93.5 },
  { cx: 214, cy: 105 },
];
/** The new flavors' pictures are recolored copies of the team's strawberry bowl and pink bag. */
const BOWL: Record<DoughId, StationSprite> = {
  vanilla: 'bowl_vanilla',
  chocolate: 'bowl_chocolate',
  strawberry: 'bowl_strawberry',
  redvelvet: 'bowl_redvelvet',
  lemon: 'bowl_lemon',
  matcha: 'bowl_matcha',
};
const BAG: Record<FrostingId, StationSprite> = {
  pink: 'bag_pink',
  mint: 'bag_mint',
  lilac: 'bag_lilac',
  cream: 'bag_vanilla',
  choco: 'bag_chocolate',
  caramel: 'bag_caramel',
};
/** The team's jars; the new toppings use an emptied copy of the sprinkles jar with the candies drawn inside. */
const JAR: Partial<Record<ToppingId, StationSprite>> = { sprinkles: 'jar_sprinkles', eye: 'jar_eyes', spider: 'jar_spiders' };
/** Where the drawn candies sit inside the empty jar (in its own pixels: above and below the label). */
const JAR_FILL = [
  [25, 47],
  [47, 45],
  [19, 101],
  [37, 98],
  [54, 102],
];

/** Faded and not clickable: an ingredient that joins on a later day. */
const LOCKED_ALPHA = 0.35;

/** Where an ingredient is on screen (for hints and effects). */
export interface Spot {
  x: number;
  y: number;
  shake: () => void;
}

/** A dough table for 3 bowls, standing on `bottom`. */
export function createDoughTable(scene: Phaser.Scene, cx: number, w: number, bottom: number): Phaser.GameObjects.Image {
  return addPicture(scene, cx, 'dough_table', { w }, bottom);
}

/**
 * Put `pic` in a container (standing on its bottom center) with a cream name tag stuck over the Turkish word
 * written on the drawing. `fromTop` = where that word is, as a share of the picture's height from its top.
 * `extra` objects (drawn candies) go between the picture and the tag.
 */
function withTag(scene: Phaser.Scene, pic: Phaser.GameObjects.Image, label: string, fromTop: number, fontSize = 12, extra: Phaser.GameObjects.GameObject[] = []): Phaser.GameObjects.Container {
  const w = pic.displayWidth;
  const h = pic.displayHeight;
  const box = scene.add.container(pic.x, pic.y).setDepth(pic.depth);
  pic.setPosition(0, 0);
  const text = scene.add
    .text(0, -h * (1 - fromTop), label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: '#4a3531', fontStyle: 'bold', align: 'center', lineSpacing: -3 })
    .setOrigin(0.5);
  const tw = Math.max(text.width + 10, w * 0.6);
  const th = text.height + 6;
  const tag = scene.add.graphics();
  tag.fillStyle(0xfff6e6, 1);
  tag.fillRoundedRect(-tw / 2, text.y - th / 2, tw, th, 6);
  tag.lineStyle(2, INK, 1);
  tag.strokeRoundedRect(-tw / 2, text.y - th / 2, tw, th, 6);
  box.add([pic, ...extra, tag, text]);
  return box;
}

/** Clickable (wiggle + hop), or locked until a later day (lockedUntil > 0): faded picture, tag says the day. Returns where it is and a "no" wiggle. */
function finish(scene: Phaser.Scene, box: Phaser.GameObjects.Container, w: number, h: number, lockedUntil: number, onClick: () => void): Spot {
  if (lockedUntil > 0) {
    const [pic, ...rest] = box.list as (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[];
    pic.setAlpha(LOCKED_ALPHA);
    // drawn candies (empty jar) fade too; the tag and its text stay
    rest.slice(0, rest.length - 2).forEach((o) => o.setAlpha(LOCKED_ALPHA));
    (rest[rest.length - 1] as Phaser.GameObjects.Text).setText(T.fromDay(lockedUntil));
  } else makeIngredient(scene, box, onClick, w, h);
  return {
    x: box.x,
    y: box.y - h / 2,
    shake: () => scene.tweens.add({ targets: box, x: box.x + 5, duration: 45, yoyo: true, repeat: 3 }),
  };
}

/** One dough bowl on a table (`spot` 0..2 = left to right). */
export function createDoughBowl(scene: Phaser.Scene, table: Phaser.GameObjects.Image, spot: number, id: DoughId, lockedUntil: number, onClick: () => void): Spot {
  const b = BOWL_SPOTS[spot];
  const pic = addPart(scene, table, BOWL[id], b.cx, b.cy);
  const w = pic.displayWidth;
  const h = pic.displayHeight;
  // the bowl's name is written on its front, about 76% down
  return finish(scene, withTag(scene, pic, doughInfo(id).name, 0.76, 10), w, h, lockedUntil, onClick);
}

/** A cloth pocket the piping bags hang in. */
export function createFrostingPocket(scene: Phaser.Scene, cx: number, h: number, bottom: number): Phaser.GameObjects.Image {
  return addPicture(scene, cx, 'frosting_pocket', { h }, bottom);
}

/** One piping bag in a pocket (`spot` 0..2), with a flavor tag stuck over the color name written on the drawing. */
export function createPipingBag(scene: Phaser.Scene, pocket: Phaser.GameObjects.Image, spot: number, id: FrostingId, lockedUntil: number, onClick: () => void): Spot {
  const b = BAG_SPOTS[spot];
  const pic = addPart(scene, pocket, BAG[id], b.cx, b.cy);
  const w = pic.displayWidth;
  const h = pic.displayHeight;
  // the drawing's color name sits about 37% down from the top of the bag; long flavors go on two lines
  const name = frostingInfo(id).name.replace(/(berry|chio|late)$/, '-\n$1');
  return finish(scene, withTag(scene, pic, name, 0.37, 10), w, h, lockedUntil, onClick);
}

/** Glass jar of toppings with a cork lid and a label. */
export function createToppingJar(scene: Phaser.Scene, x: number, bottom: number, height: number, id: ToppingId, lockedUntil: number, onClick: () => void): Spot {
  const key = JAR[id];
  const pic = addPicture(scene, x, key ?? 'jar_empty', { h: height }, bottom);
  const w = pic.displayWidth;
  const h = pic.displayHeight;
  const extra: Phaser.GameObjects.GameObject[] = [];
  if (!key) {
    // fill the empty jar with the topping itself (positions are in the picture's own pixels)
    const s = pic.scaleX;
    const g = scene.add.graphics();
    for (const [px, py] of JAR_FILL) drawTopping(g, (px - pic.width / 2) * s, (py - pic.height) * s, id, 0.62 * s);
    extra.push(g);
  }
  // the jar's paper label is about 60% down
  return finish(scene, withTag(scene, pic, toppingInfo(id).name, 0.6, 10, extra), w, h, lockedUntil, onClick);
}

/** Trash can with a skull; (x, y) is its center. */
export function createTrash(scene: Phaser.Scene, x: number, y: number, height: number, onClick: () => void): void {
  makeIngredient(scene, addPicture(scene, x, 'trash', { h: height }, y + height / 2), onClick);
}

/** Width of a plate picture on screen. */
export const PLATE_W = 116;

/** A plate: a preparation spot. The cupcake itself is drawn by the scene. */
export function createPlate(scene: Phaser.Scene, x: number, bottom: number, onClick: () => void): void {
  addPicture(scene, x, 'plate', { w: PLATE_W }, bottom).setDepth(DEPTH.station);
  scene.add.zone(x, bottom - 48, PLATE_W + 6, 104).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
}

/** A plate place the player has not bought yet: a faded plate with a "buy in shop" tag. */
export function createLockedPlate(scene: Phaser.Scene, x: number, bottom: number): void {
  const pic = addPicture(scene, x, 'plate', { w: PLATE_W }, bottom).setDepth(DEPTH.station).setAlpha(0.4);
  withTag(scene, pic, `$${CONFIG.shop.plate}\n${T.ovenLocked}`, 0.4, 11);
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
  // "Dükkandan al" is written under the price, about 69% down
  withTag(scene, addPicture(scene, x, 'oven_locked', { w: 124 }).setDepth(DEPTH.station), T.ovenLocked, 0.69, 10);
}
