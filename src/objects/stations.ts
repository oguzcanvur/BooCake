import Phaser from 'phaser';
import { fxKey, stationKey, type StationSprite } from '../assets';
import { DEPTH } from '../config';
import type { ToppingId } from '../data/recipes';

// The workbench stations use the team's drawings (src/assets/stations/, cut out of one sheet). The pictures
// already carry their own name labels. Where one picture holds several items (three dough bowls, three piping
// bags) each item gets its own click zone and a soft glow on hover.

/** Bottom edge of the station pictures (they stand on the workbench). */
const BASE_Y = 700;

/** A station picture standing on the workbench, centered on x, scaled to the given width or height. */
function addPicture(scene: Phaser.Scene, x: number, name: StationSprite, size: { w?: number; h?: number }, bottom = BASE_Y): Phaser.GameObjects.Image {
  const img = scene.add.image(x, bottom, stationKey(name)).setOrigin(0.5, 1).setDepth(DEPTH.station + 3);
  const scale = size.w ? size.w / img.width : (size.h ?? img.height) / img.height;
  return img.setScale(scale);
}

/** Click zone with a soft glow on hover and a small squash of `pic` on press. */
function addZone(scene: Phaser.Scene, x: number, y: number, w: number, h: number, pic: Phaser.GameObjects.Image | null, onClick: () => void): Phaser.GameObjects.Zone {
  const glow = scene.add
    .image(x, y, fxKey('light_01'))
    .setDepth(DEPTH.station + 4)
    .setScale(Math.max(w, h) / 200)
    .setAlpha(0)
    .setBlendMode(Phaser.BlendModes.ADD);
  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => scene.tweens.add({ targets: glow, alpha: 0.32, duration: 110 }));
  zone.on('pointerout', () => scene.tweens.add({ targets: glow, alpha: 0, duration: 110 }));
  zone.on('pointerdown', () => {
    scene.tweens.add({ targets: glow, alpha: 0.6, duration: 70, yoyo: true });
    if (pic && !scene.tweens.isTweening(pic)) {
      const sy = pic.scaleY;
      scene.tweens.add({ targets: pic, scaleY: sy * 0.96, duration: 70, yoyo: true });
    }
    onClick();
  });
  return zone;
}

/** The three dough bowls on their little table (one picture). Returns it so a bowl click can wiggle it. */
export function createDoughSet(scene: Phaser.Scene, cx: number): Phaser.GameObjects.Image {
  return addPicture(scene, cx, 'dough', { w: 262 });
}

/** Click zone for one dough bowl of the set. Returns a handle to wiggle the set ("the ovens are full"). */
export function createDoughBowl(scene: Phaser.Scene, set: Phaser.GameObjects.Image, x: number, onClick: () => void): { shake: () => void } {
  addZone(scene, x, set.y - set.displayHeight * 0.6, 70, 80, set, onClick);
  return {
    shake: () => scene.tweens.add({ targets: set, x: set.x + 5, duration: 45, yoyo: true, repeat: 3 }),
  };
}

/** The three piping bags hanging on their cloth pocket (one picture; it reaches up into the tray row). */
export function createFrostingSet(scene: Phaser.Scene, cx: number): Phaser.GameObjects.Image {
  return addPicture(scene, cx, 'frosting', { h: 228 });
}

/** Click zone for one piping bag of the set. */
export function createPipingBag(scene: Phaser.Scene, set: Phaser.GameObjects.Image, x: number, onClick: () => void): void {
  addZone(scene, x, set.y - set.displayHeight * 0.62, 66, 150, set, onClick);
}

const JAR: Record<ToppingId, StationSprite> = { sprinkles: 'jar_sprinkles', eye: 'jar_eyes', spider: 'jar_spiders' };

/** Glass jar of toppings with a cork lid and a label. */
export function createToppingJar(scene: Phaser.Scene, x: number, id: ToppingId, onClick: () => void): void {
  const pic = addPicture(scene, x, JAR[id], { h: 130 });
  addZone(scene, x, pic.y - pic.displayHeight / 2, 72, 132, pic, onClick);
}

/** Trash can with a skull. */
export function createTrash(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  const pic = addPicture(scene, x, 'trash', { h: 88 }, y + 44);
  addZone(scene, x, y, 76, 92, pic, onClick);
}

/** The plate on its mat: the preparation spot. The cupcake itself is drawn by the scene. */
export function createPlate(scene: Phaser.Scene, x: number, y: number, onClick: () => void): void {
  const pic = addPicture(scene, x, 'plate', { w: 172 });
  pic.setDepth(DEPTH.station);
  addZone(scene, x, y, 136, 150, null, onClick);
}

/** The ready tray: a silver tray with handles, one click zone per slot. */
export function createTray(scene: Phaser.Scene, centers: number[], y: number, onSlotClick: (index: number) => void): void {
  const left = centers[0] - 70;
  const right = centers[centers.length - 1] + 70;
  const pic = scene.add
    .image((left + right) / 2, y + 16, stationKey('tray'))
    .setDepth(DEPTH.station)
    .setDisplaySize(right - left, 74);
  void pic;
  centers.forEach((sx, i) => {
    scene.add
      .zone(sx, y, 100, 96)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onSlotClick(i));
  });
}

/** An oven slot the player has not bought yet (3rd oven): the locked oven picture shows the price. */
export function createLockedOven(scene: Phaser.Scene, x: number): void {
  addPicture(scene, x, 'oven_locked', { w: 124 }).setDepth(DEPTH.station);
}
