import Phaser from 'phaser';
import { BG_MAP } from '../assets';
import { sfx } from '../audio';
import { DEPTH, FONT, H, INK, W } from '../config';
import { CONFIG, NIGHT_COUNT } from '../data/gameConfig';
import { fadeIn, fadeOutThen } from '../fx';
import { drawCupcake } from '../objects/cupcake';
import { unsoftened } from '../softStyle';
import { gameState, record } from '../systems/GameState';
import { progress, saveGame } from '../systems/save';
import { ingredientName } from '../data/recipes';
import { MONSTER_CARDS, T } from '../text';
import { makeButton } from '../ui/button';
import { drawStar } from '../ui/icons';

/**
 * Where the night stops sit (a winding road through the night sky, from left to right, above the bakery in the
 * middle of the background picture so it stays visible).
 */
const STOPS = [
  { x: 170, y: 420 },
  { x: 395, y: 275 },
  { x: 640, y: 298 },
  { x: 885, y: 240 },
  { x: 1105, y: 372 },
];
const NODE_R = 52;

/**
 * "Monster Town": the nights as stops on a winding road over the team's picture of the town at night. The newest open
 * night has a cupcake marker on it; after the shop's "Next night" the marker walks along the road from the night just
 * played to it. Nights open one after another; an open stop can be clicked to play (or replay) it.
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

    const current = Math.min(gameState.unlocked, NIGHT_COUNT - 1);
    for (let i = 0; i < NIGHT_COUNT; i++) this.drawStop(i, current);

    // the cupcake marker: walks from the finished day to the current one, or simply waits on the current one
    const marker = this.add.graphics().setDepth(DEPTH.hud + 2);
    drawCupcake(marker, 0, 0, { dough: 'strawberry', bake: 'ready', tone: 0.2, frosting: 'pink', topping: 'sprinkles' }, 0.8);
    const markerAt = (t: number) => {
      const p = road.getPoint(t);
      marker.setPosition(p.x, p.y - NODE_R - 26);
    };
    // the stops are evenly spread along the road, so stop i sits at i / (count - 1)
    const tOf = (i: number) => i / (NIGHT_COUNT - 1);
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

  /** The road: a thin, bright yellow line of light with a soft glow and twinkling sparks along it. */
  private drawRoad(road: Phaser.Curves.Spline): void {
    const pts = road.getPoints(160);
    unsoftened(() => {
      // soft glow (added light), then the bright core
      const glow = this.add.graphics().setDepth(DEPTH.deco).setBlendMode(Phaser.BlendModes.ADD);
      glow.lineStyle(16, 0xffc94a, 0.18);
      glow.strokePoints(pts);
      glow.lineStyle(9, 0xffd76a, 0.3);
      glow.strokePoints(pts);
      const core = this.add.graphics().setDepth(DEPTH.deco + 1);
      core.lineStyle(3.5, 0xfff1a0, 1);
      core.strokePoints(pts);
      // sparks along the road that twinkle one after another
      road.getSpacedPoints(28).forEach((p, i) => {
        const spark = this.add.graphics().setDepth(DEPTH.deco + 2).setBlendMode(Phaser.BlendModes.ADD);
        spark.fillStyle(0xfffbe0, 1);
        spark.fillCircle(0, 0, 2.6);
        spark.setPosition(p.x, p.y).setAlpha(0.3);
        this.tweens.add({ targets: spark, alpha: 1, scale: 1.6, duration: 500, yoyo: true, repeat: -1, delay: (i * 90) % 1400, ease: 'Sine.easeInOut' });
      });
    });
  }

  /** One night stop: badge with the night number and goal, stars, name, new monster and best money. Click to play it if open. */
  private drawStop(i: number, current: number): void {
    const { x, y } = STOPS[i];
    const day = CONFIG.nights[i];
    const rec = record(i);
    const done = rec.stars > 0;
    const reached = i <= current;
    const open = reached;
    const d = DEPTH.hud;

    if (i === current) {
      const glow = this.add.circle(x, y, NODE_R + 14, 0xffb4d9, 0.35).setDepth(d - 1);
      this.tweens.add({ targets: glow, scale: 1.15, alpha: 0.15, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // everything of the stop lives in one container centered on it, so it can grow as a whole on hover
    const stop = this.add.container(x, y).setDepth(d);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(3, 6, NODE_R);
    g.fillStyle(done ? 0xffe6a8 : reached ? 0xfff6e6 : 0xd9cfe8, 1);
    g.fillCircle(0, 0, NODE_R);
    g.lineStyle(done ? 6 : 4, done ? 0xd9a84e : INK, 1);
    g.strokeCircle(0, 0, NODE_R);
    stop.add(g);
    stop.add(this.add.text(0, -12, T.day(i + 1), { fontFamily: FONT, fontSize: '20px', color: '#4a3531', fontStyle: 'bold' }).setOrigin(0.5));
    stop.add(this.add.text(0, 14, T.goal(day.goal), { fontFamily: FONT, fontSize: '17px', color: '#7a5a4a', fontStyle: 'bold' }).setOrigin(0.5));

    // stars earned on this day
    const stars = rec.stars;
    const sg = this.add.graphics();
    for (let k = 0; k < 3; k++) drawStar(sg, -30 + k * 30, NODE_R + 18, 12, k < stars, 2);
    stop.add(sg);

    // the night's name, then what is new on it (a monster or a flavor) and the best money so far
    const label = { fontFamily: FONT, fontStyle: 'bold', stroke: '#2b1d4f', strokeThickness: 4 };
    stop.add(this.add.text(0, NODE_R + 44, day.name, { ...label, fontSize: '18px', color: '#fff1fa' }).setOrigin(0.5));
    const seenBefore = CONFIG.nights.slice(0, i).flatMap((n) => n.specials.map((s) => s.id));
    const fresh = [...new Set(day.specials.map((s) => s.id))].filter((s) => !seenBefore.includes(s));
    const info = [...fresh.map((s) => `+ ${MONSTER_CARDS[s].name}`), ...day.newIngredients.map((id) => `+ ${ingredientName(id)}`)];
    if (rec.bestMoney > 0) info.push(T.mapBest(rec.bestMoney));
    if (info.length > 0) {
      stop.add(
        this.add
          .text(0, NODE_R + 68, info.join('  ·  '), {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#ffd6ec',
            fontStyle: 'bold',
            stroke: '#2b1d4f',
            strokeThickness: 4,
          })
          .setOrigin(0.5),
      );
    }

    if (!open) {
      stop.add(this.add.text(0, 36, T.locked, { fontFamily: FONT, fontSize: '14px', color: '#8a7aa8', fontStyle: 'bold' }).setOrigin(0.5));
      return;
    }
    const zone = this.add.zone(x, y, NODE_R * 2 + 10, NODE_R * 2 + 10).setInteractive({ useHandCursor: true }).setDepth(d + 2);
    // hover: the whole stop grows in place (and comes to the front)
    zone.on('pointerover', () => {
      stop.setDepth(d + 1);
      this.tweens.add({ targets: stop, scale: 1.14, duration: 140, ease: 'Back.easeOut' });
    });
    zone.on('pointerout', () => {
      stop.setDepth(d);
      this.tweens.add({ targets: stop, scale: 1, duration: 120, ease: 'Quad.easeOut' });
    });
    zone.on('pointerdown', () => {
      sfx(this, 'ui_click', 0.5);
      gameState.day = i;
      progress.resumeAt = 'night';
      saveGame();
      fadeOutThen(this, () => this.scene.start('Night', { mode: 'campaign' }));
    });
  }
}
