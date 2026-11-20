import Phaser from 'phaser';
import { stationKey, type StationSprite } from '../assets';
import { DEPTH, FONT, INK } from '../config';
import { doughInfo, frostingInfo, toppingInfo, type DoughId, type FrostingId, type ToppingId } from '../data/recipes';
import { drawTopping } from './cupcake';
import { plateColor } from '../data/decor';
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
/**
 * The drawn candies inside the empty jar, like the team's own jars: big candies filling the glass, two at the
 * top peeking out above the label and a little pile at the bottom (in the jar's own 74 x 124 pixels; the glass
 * is about x 10-64, y 38-110, the label covers y 60-86). Listed back to front.
 */
const JAR_FILL = [
  [26, 58],
  [48, 57],
  [29, 92],
  [46, 93],
  [21, 102],
  [37, 104],
  [53, 102],
];
/** Size of each drawn candy in the jar; the bat is wider than the others, so it is drawn smaller. */
const JAR_CANDY: Partial<Record<ToppingId, number>> = { bat: 0.6, cherry: 0.85, ghost: 0.9 };

/** Faded and not clickable: an ingredient that joins on a later day. */

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
    // not unlocked yet: stay out of sight until its day comes (the "New flavors!" card announces it)
    box.setVisible(false);
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
    const k = (JAR_CANDY[id] ?? 0.8) * s;
    for (const [px, py] of JAR_FILL) drawTopping(g, (px - pic.width / 2) * s, (py - pic.height) * s, id, k);
    // the glass in front of the candies: a light tint and a shine stripe, so they look inside the jar
    g.fillStyle(0xe6f2f2, 0.22);
    g.fillRoundedRect((12 - pic.width / 2) * s, (40 - pic.height) * s, 50 * s, 68 * s, 10 * s);
    g.fillStyle(0xffffff, 0.45);
    g.fillRoundedRect((15 - pic.width / 2) * s, (44 - pic.height) * s, 4 * s, 56 * s, 2 * s);
    extra.push(g);
  }
  // the jar's paper label is about 60% down
  return finish(scene, withTag(scene, pic, toppingInfo(id).name, 0.6, 10, extra), w, h, lockedUntil, onClick);
}

/**
 * Trash can with a skull; (x, y) is its center. It has a drawn lid: the lid lifts when the mouse is over the can
 * and flaps open when something is thrown in. Returns a function that plays the flap (used for drops and clicks).
 */
export function createTrash(scene: Phaser.Scene, x: number, y: number, height: number, onClick: () => void): () => void {
  const bottom = y + height / 2;
  const pic = addPicture(scene, x, 'trash', { h: height }, bottom);
  const pw = pic.displayWidth;
  const box = scene.add.container(x, bottom).setDepth(DEPTH.station);
  pic.setPosition(0, 0);
  const shadow = scene.add.ellipse(2, 1, pw * 1.05, 11, 0x4a2a2e, 0.22);
  // lid: hinged on its left end, rim of the can is about 14% below the picture top
  const lw = pw * 1.04;
  const hingeX = -lw / 2;
  const hingeY = -height * 0.86;
  const lid = scene.add.container(hingeX, hingeY);
  const g = scene.add.graphics();
  g.fillStyle(0x8f8ba3, 1);
  g.fillRoundedRect(0, -8, lw, 10, 5);
  g.fillStyle(0xb9b5cc, 1);
  g.fillRoundedRect(3, -7, lw - 6, 3.5, 2);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(0, -8, lw, 10, 5);
  // handle
  g.fillStyle(0x8f8ba3, 1);
  g.fillRoundedRect(lw / 2 - 9, -15, 18, 8, 4);
  g.lineStyle(2.5, INK, 1);
  g.strokeRoundedRect(lw / 2 - 9, -15, 18, 8, 4);
  lid.add(g);
  box.add([shadow, pic, lid]);
  const restY = box.y;
  let open = false;
  const setLid = (angle: number, duration: number, ease = 'Quad.easeOut') => {
    scene.tweens.killTweensOf(lid);
    scene.tweens.add({ targets: lid, angle, duration, ease });
  };
  const flap = () => {
    scene.tweens.killTweensOf(lid);
    scene.tweens.add({ targets: lid, angle: -62, duration: 90, ease: 'Quad.easeOut', yoyo: true, hold: 140, onComplete: () => lid.setAngle(open ? -28 : 0) });
    scene.tweens.killTweensOf(box);
    box.setY(restY);
    scene.tweens.add({ targets: box, y: restY - 5, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  };
  const zone = scene.add.zone(x, bottom - height / 2, pw + 12, height + 14).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => {
    open = true;
    setLid(-28, 130);
  });
  zone.on('pointerout', () => {
    open = false;
    setLid(0, 160);
  });
  zone.on('pointerdown', onClick);
  return flap;
}

/** Width of a plate picture on screen. */
export const PLATE_W = 116;

/** A plate: a preparation spot. The cupcake itself is drawn by the scene. */
export function createPlate(scene: Phaser.Scene, x: number, bottom: number, onClick: () => void): void {
  // tinted with the player's plate color (decoration)
  addPicture(scene, x, 'plate', { w: PLATE_W }, bottom).setDepth(DEPTH.station).setTint(plateColor());
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
