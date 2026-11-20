import Phaser from 'phaser';
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

/** Where the day stops sit on the map (a winding road from left to right). */
const STOPS = [
  { x: 190, y: 520 },
  { x: 480, y: 360 },
  { x: 790, y: 520 },
  { x: 1080, y: 350 },
];
const NODE_R = 52;

/**
 * "Monster Town": the days as stops on a winding road. The current day has a cupcake marker on it; after the
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

  /** Night sky, moon, stars and rolling hills. */
  private drawLand(): void {
    const g = this.add.graphics().setDepth(DEPTH.wall);
    g.fillGradientStyle(0x2d2150, 0x2d2150, 0x5a3f7a, 0x5a3f7a, 1);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0xfff3c4, 1);
    g.fillCircle(1150, 110, 46);
    g.fillStyle(0x2d2150, 1);
    g.fillCircle(1170, 96, 40);
    g.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 40; i++) g.fillCircle((i * 331) % W, 20 + ((i * 97) % 230), i % 5 === 0 ? 2.4 : 1.4);
    // hills, back to front
    const hills: [number, number, number, number][] = [
      [200, 760, 900, 520],
      [900, 760, 1000, 560],
      [640, 800, 1500, 520],
    ];
    const colors = [0x4b3a6e, 0x55437a, 0x6a5590];
    hills.forEach(([x, y, w, h], i) => {
      g.fillStyle(colors[i], 1);
      g.fillEllipse(x, y, w, h);
    });
    // a few trees and pumpkins along the way
    for (const [tx, ty] of [
      [70, 430],
      [330, 600],
      [640, 450],
      [940, 610],
      [1220, 470],
    ] as [number, number][]) {
      g.fillStyle(0x3a2c55, 1);
      g.fillTriangle(tx - 26, ty, tx + 26, ty, tx, ty - 70);
      g.fillRect(tx - 4, ty, 8, 14);
    }
    for (const [px, py] of [
      [300, 470],
      [640, 330],
      [930, 420],
    ] as [number, number][]) {
      g.fillStyle(0xf0a24a, 1);
      g.fillEllipse(px, py, 34, 26);
      g.lineStyle(2, INK, 1);
      g.strokeEllipse(px, py, 34, 26);
      g.fillStyle(0x6e8a3a, 1);
      g.fillRect(px - 2, py - 18, 4, 7);
    }
  }

  /** The road: a soft wide band with a dotted center line. */
  private drawRoad(road: Phaser.Curves.Spline): void {
    const g = this.add.graphics().setDepth(DEPTH.deco);
    const pts = road.getPoints(120);
    g.lineStyle(34, 0x3a2c55, 0.6);
    g.strokePoints(pts);
    g.lineStyle(26, 0xe9d3b4, 1);
    g.strokePoints(pts);
    g.fillStyle(0xb98f6a, 1);
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
