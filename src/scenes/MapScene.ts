import Phaser from 'phaser';
import { BG_MAP } from '../assets';
import { sfx } from '../audio';
import { DEPTH, FONT, H, INK, W } from '../config';
import { CONFIG, DAY_COUNT } from '../data/gameConfig';
import { fadeIn, fadeOutThen } from '../fx';
import { drawCupcake } from '../objects/cupcake';
import { gameState } from '../systems/GameState';
import { progress, saveGame } from '../systems/save';
import { MONSTER_CARDS, T } from '../text';
import { makeButton } from '../ui/button';
import { drawStar } from '../ui/icons';

/**
 * Where the day stops sit (a winding road through the night sky, from left to right, above the bakery in the
 * middle of the background picture so it stays visible).
 */
const STOPS = [
  { x: 210, y: 420 },
  { x: 470, y: 270 },
  { x: 800, y: 330 },
  { x: 1070, y: 220 },
];
const NODE_R = 52;

/**
 * "Monster Town": the days as stops on a winding road over the team's picture of the town at night. The current day has a cupcake marker on it; after the
 * shop's "Next day" the marker walks along the road from the finished day to the next one. Clicking an open
 * stop starts that day. While the game is being tested (CONFIG.unlockAllDays) every day is open.
 */
export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create(data: { walkFrom?: number }): void {
    fadeIn(this);
    this.drawLand();
    const road = new Phaser.Curves.Spline(STOPS.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
    this.drawRoad(road);

    this.add
      .text(W / 2, 62, T.mapTitle, { fontFamily: FONT, fontSize: '54px', color: '#ffd6ec', fontStyle: 'bold', stroke: '#2b1d4f', strokeThickness: 9 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.add
      .text(W / 2, 112, T.mapPick, { fontFamily: FONT, fontSize: '24px', color: '#efe4ff', fontStyle: 'bold', stroke: '#2b1d4f', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    if (CONFIG.unlockAllDays) {
      this.add
        .text(W - 20, H - 18, T.mapTestNote, { fontFamily: FONT, fontSize: '16px', color: '#ffd166', fontStyle: 'bold' })
        .setOrigin(1, 1)
        .setDepth(DEPTH.hud);
    }

    const current = Math.min(gameState.day, DAY_COUNT - 1);
    for (let i = 0; i < DAY_COUNT; i++) this.drawStop(i, current);

    // the cupcake marker: walks from the finished day to the current one, or simply waits on the current one
    const marker = this.add.graphics().setDepth(DEPTH.hud + 2);
    drawCupcake(marker, 0, 0, { dough: 'strawberry', bake: 'ready', tone: 0.2, frosting: 'pink', topping: 'sprinkles' }, 0.8);
    const markerAt = (t: number) => {
      const p = road.getPoint(t);
      marker.setPosition(p.x, p.y - NODE_R - 26);
    };
    const tOf = (i: number) => i / (DAY_COUNT - 1);
    const bob = () => this.tweens.add({ targets: marker, y: marker.y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const from = data.walkFrom;
    if (from !== undefined && from >= 0 && from < current) {
      markerAt(tOf(from));
      const walk = { t: tOf(from) };
      this.tweens.add({
        targets: walk,
        t: tOf(current),
        delay: 500,
        duration: 1600,
        ease: 'Sine.easeInOut',
        onUpdate: () => markerAt(walk.t),
        onComplete: () => {
          sfx(this, 'star', 0.4);
          this.cameras.main.shake(120, 0.002);
          bob();
        },
      });
      // little hops while walking
      this.tweens.add({ targets: marker, scaleY: 0.85, duration: 120, yoyo: true, repeat: 6, delay: 500 });
    } else {
      markerAt(tOf(current));
      bob();
    }

    makeButton(this, 110, H - 52, 170, 60, T.back, () => fadeOutThen(this, () => this.scene.start('Menu')), { color: 'grey', fontSize: 26, depth: DEPTH.hud });
  }

  /** The team's picture of the town at night, with the bakery, scaled to fill the screen. */
  private drawLand(): void {
    const bg = this.add.image(W / 2, H / 2, BG_MAP).setDepth(DEPTH.wall);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
  }

  /** The road: a soft wide band with a dotted center line. */
  private drawRoad(road: Phaser.Curves.Spline): void {
    const g = this.add.graphics().setDepth(DEPTH.deco);
    const pts = road.getPoints(120);
    g.lineStyle(30, 0x2b1d4f, 0.45);
    g.strokePoints(pts);
    g.lineStyle(22, 0xf6e3c4, 0.92);
    g.strokePoints(pts);
    g.fillStyle(0xc99a6a, 1);
    for (const p of road.getSpacedPoints(48)) g.fillCircle(p.x, p.y, 3.5);
  }

  /** One day stop: badge with the day number, goal, new monsters and stars. Click to play it if it is open. */
  private drawStop(i: number, current: number): void {
    const { x, y } = STOPS[i];
    const day = CONFIG.days[i];
    const done = (gameState.stars[i] ?? 0) > 0;
    const reached = i <= current;
    const open = reached || CONFIG.unlockAllDays;
    const d = DEPTH.hud;

    const g = this.add.graphics().setDepth(d);
    if (i === current) {
      const glow = this.add.circle(x, y, NODE_R + 14, 0xffb4d9, 0.35).setDepth(d - 1);
      this.tweens.add({ targets: glow, scale: 1.15, alpha: 0.15, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(x + 3, y + 6, NODE_R);
    g.fillStyle(done ? 0xffe6a8 : reached ? 0xfff6e6 : 0xd9cfe8, 1);
    g.fillCircle(x, y, NODE_R);
    g.lineStyle(done ? 6 : 4, done ? 0xd9a84e : INK, 1);
    g.strokeCircle(x, y, NODE_R);

    this.add
      .text(x, y - 12, T.day(i + 1), { fontFamily: FONT, fontSize: '20px', color: '#4a3531', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(d + 1);
    this.add
      .text(x, y + 14, T.goal(day.goal), { fontFamily: FONT, fontSize: '17px', color: '#7a5a4a', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(d + 1);

    // stars earned on this day
    const stars = gameState.stars[i] ?? 0;
    const sg = this.add.graphics().setDepth(d + 1);
    for (let k = 0; k < 3; k++) drawStar(sg, x - 30 + k * 30, y + NODE_R + 18, 12, k < stars, 2);

    // monsters that show up for the first time on this day
    const prev = i > 0 ? CONFIG.days[i - 1].specials : [];
    const fresh = day.specials.filter((s) => !prev.includes(s));
    if (fresh.length > 0) {
      this.add
        .text(x, y + NODE_R + 46, `+ ${fresh.map((s) => MONSTER_CARDS[s].name).join(', ')}`, {
          fontFamily: FONT,
          fontSize: '16px',
          color: '#ffd6ec',
          fontStyle: 'bold',
          stroke: '#2b1d4f',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(d + 1);
    }

    if (!open) {
      this.add
        .text(x, y + 36, T.locked, { fontFamily: FONT, fontSize: '14px', color: '#8a7aa8', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(d + 1);
      return;
    }
    const zone = this.add.zone(x, y, NODE_R * 2 + 10, NODE_R * 2 + 10).setInteractive({ useHandCursor: true }).setDepth(d + 2);
    const parts = [g];
    zone.on('pointerover', () => this.tweens.add({ targets: parts, y: -4, duration: 100 }));
    zone.on('pointerout', () => this.tweens.add({ targets: parts, y: 0, duration: 100 }));
    zone.on('pointerdown', () => {
      sfx(this, 'ui_click', 0.5);
      gameState.day = i;
      progress.resumeAt = 'night';
      saveGame();
      fadeOutThen(this, () => this.scene.start('Night'));
    });
  }
}
