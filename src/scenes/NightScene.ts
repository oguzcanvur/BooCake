import Phaser from 'phaser';
import { sfx } from '../audio';
import { COLORS, DEPTH, FONT, H, LAYOUT, W } from '../config';
import { NIGHTS, type NightConfig } from '../data/nights';
import { pickMonster } from '../data/monsters';
import { FROSTINGS, TOPPINGS, frostingInfo, type FrostingId, type ToppingId } from '../data/recipes';
import { burst, coinFlight, fadeIn, fadeOutThen, floatText } from '../fx';
import { Customer } from '../objects/Customer';
import { drawCupcake, type CupcakeData } from '../objects/cupcake';
import { OvenSlot } from '../objects/OvenSlot';
import { Shop } from '../objects/Shop';
import { createPipingBag, createToppingJar, createTrash, drawShelf } from '../objects/stations';
import { gameState } from '../systems/GameState';
import { makeButton } from '../ui/button';
import { Hud } from '../ui/Hud';

type Phase = 'intro' | 'playing' | 'ended';

const OVEN_X = [95, 225];
const FROSTING_CENTER = 430;
const TOPPING_CENTER = 690;
const ITEM_GAP = 76;
const TRASH_X = 880;

export interface NightStats {
  served: number;
  wrong: number;
  left: number;
  burnt: number;
}

/**
 * The shop at night: the core gameplay loop.
 * Bake -> pick up when READY -> frosting -> topping -> click the customer who ordered it.
 * Scene events used: 'cupcake-ready', 'cupcake-burned'.
 */
export class NightScene extends Phaser.Scene {
  private cfg!: NightConfig;
  private phase: Phase = 'intro';
  private elapsed = 0;
  private money = 0;
  private spawnIn = 1;
  private lastTick = -1;
  private hand: CupcakeData | null = null;
  private customers: (Customer | null)[] = [];
  private ovens: OvenSlot[] = [];
  private stats: NightStats = { served: 0, wrong: 0, left: 0, burnt: 0 };

  private shop!: Shop;
  private hud!: Hud;
  private handGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Night');
  }

  init(): void {
    this.cfg = NIGHTS[gameState.night];
    this.phase = 'intro';
    this.elapsed = 0;
    this.money = 0;
    this.spawnIn = 1;
    this.lastTick = -1;
    this.hand = null;
    this.customers = LAYOUT.customerSlotsX.map(() => null);
    this.ovens = [];
    this.stats = { served: 0, wrong: 0, left: 0, burnt: 0 };
  }

  create(): void {
    fadeIn(this);
    this.shop = new Shop(this);
    this.hud = new Hud(this, this.cfg, this.cfg.name);
    this.hud.onStar = (_i, x, y) => {
      sfx(this, 'star', 0.5);
      burst(this, x, y, 'star_04', { count: 10, tint: 0xffe066, gravity: 60 });
    };
    this.createStations();

    this.handGfx = this.add.graphics().setDepth(DEPTH.hand);

    // Scene event listeners survive scene restarts, so they must be removed on shutdown
    // (otherwise "Try again" / "Next night" would add a duplicate listener every time).
    const onReady = (x: number, y: number) => {
      sfx(this, 'oven_ready', 0.5);
      floatText(this, x, y - 92, 'Ready!', '#7dffb0');
      burst(this, x, y - 10, 'star_04', { count: 8, tint: 0xb6ffd0, gravity: 40, speed: [60, 160] });
    };
    const onBurned = (x: number, y: number) => {
      this.stats.burnt++;
      sfx(this, 'burnt', 0.45);
      floatText(this, x, y - 92, 'Burnt!', '#ff6b6b');
      this.cameras.main.shake(140, 0.004);
    };
    this.events.on('cupcake-ready', onReady);
    this.events.on('cupcake-burned', onBurned);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('cupcake-ready', onReady);
      this.events.off('cupcake-burned', onBurned);
    });

    this.showIntro();
  }

  update(_time: number, delta: number): void {
    // the cupcake in hand follows the mouse
    const pointer = this.input.activePointer;
    this.handGfx.setPosition(pointer.x, pointer.y);

    if (this.phase !== 'playing') return;
    const dt = Math.min(delta, 100) / 1000;
    this.elapsed += dt;

    for (const oven of this.ovens) oven.update(dt);

    // customers arrive faster as midnight gets closer (GDD: "more customers come near midnight")
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const progress = this.elapsed / this.cfg.durationSec;
      const gap = Phaser.Math.FloatBetween(this.cfg.spawnMin, this.cfg.spawnMax) * (1 - 0.4 * progress);
      this.spawnIn = this.trySpawn() ? gap : 1.5;
    }

    this.customers.forEach((c, i) => {
      if (!c) return;
      c.update(dt);
      if (c.expired) {
        this.stats.left++;
        sfx(this, 'customer_left', 0.4);
        floatText(this, c.x, c.y - 10, 'Left without paying!', '#ff6b6b');
        c.leave('angry');
        this.customers[i] = null;
      }
    });

    const t = Math.min(this.elapsed / this.cfg.durationSec, 1);
    this.shop.update(t);
    this.hud.update(t, this.money);
    this.shop.setJar(this.money / (this.cfg.goal * this.cfg.starMultipliers[2]));

    // clock ticks in the last 10 seconds
    const left = Math.ceil(this.cfg.durationSec - this.elapsed);
    if (left <= 10 && left > 0 && left !== this.lastTick) {
      this.lastTick = left;
      sfx(this, 'tick', 0.35);
    }
    if (this.elapsed >= this.cfg.durationSec) this.endNight();
  }

  // ---------------------------------------------------------------- setup

  private createStations(): void {
    const y = LAYOUT.stationY;
    const fn = this.cfg.frostingCount;
    const tn = this.cfg.toppingCount;

    drawShelf(this, 160, y, 272, 'OVEN');
    this.ovens = OVEN_X.map((x) => new OvenSlot(this, x, y, this.cfg.bakeSec, this.cfg.burnSec, (slot) => this.onOvenClick(slot)));

    drawShelf(this, FROSTING_CENTER, y, fn * ITEM_GAP + 24, 'FROSTING');
    FROSTINGS.slice(0, fn).forEach((f, i) => {
      const x = FROSTING_CENTER - ((fn - 1) * ITEM_GAP) / 2 + i * ITEM_GAP;
      createPipingBag(this, x, y, f.id, () => this.onFrostingClick(f.id, x, y));
    });

    drawShelf(this, TOPPING_CENTER, y, tn * ITEM_GAP + 24, 'TOPPING');
    TOPPINGS.slice(0, tn).forEach((t, i) => {
      const x = TOPPING_CENTER - ((tn - 1) * ITEM_GAP) / 2 + i * ITEM_GAP;
      createToppingJar(this, x, y, t.id, () => this.onToppingClick(t.id, x, y));
    });

    drawShelf(this, TRASH_X, y, 88, 'TRASH');
    createTrash(this, TRASH_X, y, () => this.onTrashClick());

    this.add
      .text(W / 2, H - 20, 'Click oven to bake  >  take the READY cupcake  >  frosting  >  topping  >  click the customer', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#9d8fd0',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.station);
  }

  private showIntro(): void {
    const cx = W / 2;
    const cy = H / 2;
    const cover = this.add.rectangle(cx, cy, W, H, 0x0a0618, 0.72).setDepth(DEPTH.overlay).setInteractive();
    const panel = this.add.container(cx, cy).setDepth(DEPTH.overlay + 1);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(-250, -116, 500, 216, 26);
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(-250, -126, 500, 216, 26);
    g.fillStyle(0xffffff, 0.08);
    g.fillRoundedRect(-250, -126, 500, 70, { tl: 26, tr: 26, bl: 0, br: 0 });
    const title = this.add
      .text(0, -84, this.cfg.name, { fontFamily: FONT, fontSize: '44px', color: '#ffb4d9', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 6 })
      .setOrigin(0.5);
    const goal = this.add
      .text(0, -20, `Goal: $${this.cfg.goal} by midnight`, { fontFamily: FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const note = this.add
      .text(0, 30, this.cfg.newThing, { fontFamily: FONT, fontSize: '20px', color: '#c9bdf0', align: 'center', wordWrap: { width: 440 } })
      .setOrigin(0.5);
    panel.add([g, title, goal, note]);
    panel.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    const btn = makeButton(
      this,
      cx,
      cy + 140,
      260,
      66,
      'Open the shop',
      () => {
        sfx(this, 'night_start', 0.6);
        cover.destroy();
        panel.destroy();
        btn.destroy();
        this.phase = 'playing';
      },
      { color: 'green', depth: DEPTH.overlay + 2 },
    );
  }

  // ---------------------------------------------------------------- player actions

  private setHand(c: CupcakeData | null): void {
    this.hand = c;
    const g = this.handGfx;
    g.clear();
    if (!c) return;
    // a white baker's glove holds the cupcake from below
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(0, 44, 46, 8);
    g.fillStyle(0xff8fc7, 1);
    g.fillRoundedRect(-14, 28, 28, 12, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-18, 6, 36, 28, 11);
    g.fillEllipse(-19, 18, 12, 18);
    g.lineStyle(1.5, 0xc9c4dd, 1);
    for (const fx of [-8, 0, 8]) g.lineBetween(fx, 8, fx, 16);
    drawCupcake(g, 0, -14, c, 0.95);
    g.fillStyle(0xffffff, 1);
    for (const fx of [-12, -4, 4, 12]) g.fillCircle(fx, 12, 4.6);
  }

  private onOvenClick(slot: OvenSlot): void {
    if (this.phase !== 'playing') return;
    if (!slot.cupcake) {
      sfx(this, 'bake_start', 0.5);
      slot.start();
      return;
    }
    if (slot.cupcake.bake === 'raw') {
      sfx(this, 'nope', 0.3);
      floatText(this, slot.x, slot.y - 92, 'Still baking...', '#ffd166');
      return;
    }
    if (this.hand) {
      sfx(this, 'nope', 0.3);
      floatText(this, slot.x, slot.y - 92, 'Hands full!', '#ffd166');
      return;
    }
    sfx(this, 'pickup', 0.5);
    this.setHand(slot.take());
  }

  private onFrostingClick(id: FrostingId, bx: number, by: number): void {
    if (this.phase !== 'playing') return;
    const h = this.hand;
    if (!h) return this.hint('Pick up a baked cupcake first');
    if (h.bake === 'burnt') return this.hint('It is burnt! Throw it away');
    if (h.frosting) return this.hint('Already has frosting');
    h.frosting = id;
    sfx(this, 'place', 0.45);
    burst(this, bx, by + 40, 'circle_05', { count: 7, tint: frostingInfo(id).color, gravity: 260, speed: [40, 120], scale: [0.18, 0.04], additive: false });
    this.setHand(h);
  }

  private onToppingClick(id: ToppingId, bx: number, by: number): void {
    if (this.phase !== 'playing') return;
    const h = this.hand;
    if (!h) return this.hint('Pick up a baked cupcake first');
    if (h.bake === 'burnt') return this.hint('It is burnt! Throw it away');
    if (!h.frosting) return this.hint('Frosting first!');
    if (h.topping) return this.hint('Already has a topping');
    h.topping = id;
    sfx(this, 'place', 0.45, 1.25);
    burst(this, bx, by - 10, 'spark_05', { count: 8, tint: 0xfff0a8, gravity: 120, speed: [50, 140], scale: [0.2, 0.04] });
    this.setHand(h);
  }

  private onTrashClick(): void {
    if (this.phase !== 'playing' || !this.hand) return;
    this.setHand(null);
    sfx(this, 'trash', 0.5);
    burst(this, TRASH_X, LAYOUT.stationY - 30, 'smoke_05', { count: 5, tint: 0x9aa0b4, gravity: -30, speed: [20, 70], scale: [0.2, 0.5], additive: false });
    floatText(this, TRASH_X, LAYOUT.stationY - 92, 'Trashed', '#b9a8e8');
  }

  private serve(c: Customer): void {
    if (this.phase !== 'playing') return;
    const h = this.hand;
    if (!h) return this.hint('Pick up a cupcake first', c.x, c.y - 10);
    if (h.bake === 'burnt') return this.hint('Burnt! Throw it away', c.x, c.y - 10);
    if (!h.frosting || !h.topping) return this.hint('Add frosting and topping first', c.x, c.y - 10);

    const correct = h.frosting === c.order.frosting && h.topping === c.order.topping;
    if (correct) {
      const tip = Math.round(this.cfg.maxTip * c.fraction);
      const pay = this.cfg.basePay + tip;
      this.money += pay;
      this.stats.served++;
      sfx(this, 'serve_ok', 0.55);
      floatText(this, c.x, c.y - 16, `+$${pay}${tip > 0 ? `  (tip $${tip})` : ''}`, '#7dffb0', 24);
      burst(this, c.x, c.y - 30, 'star_01', { count: 12, tint: [0xffe066, 0xff8fc7, 0x8fffd0], gravity: 160 });
      coinFlight(this, { x: c.x, y: c.y + 20 }, this.shop.jarPos, Math.min(6, 2 + Math.ceil(pay / 4)), () => {
        sfx(this, 'coin', 0.22, Phaser.Math.FloatBetween(0.9, 1.3));
        this.shop.jarBump();
      });
      c.leave('happy');
    } else {
      // wrong cupcake: half pay, no tip, and the customer is not happy about it
      const pay = Math.floor(this.cfg.basePay / 2);
      this.money += pay;
      this.stats.wrong++;
      sfx(this, 'serve_wrong', 0.5);
      floatText(this, c.x, c.y - 16, `Wrong cupcake! +$${pay}, no tip`, '#ff6b6b');
      burst(this, c.x, c.y - 40, 'smoke_05', { count: 8, tint: 0xff4d6d, gravity: -40, speed: [30, 110], scale: [0.25, 0.6], additive: false });
      c.shake();
      c.leave('angry');
    }
    this.setHand(null);
    this.customers[c.slot] = null;
  }

  // ---------------------------------------------------------------- helpers

  private trySpawn(): boolean {
    const free = this.customers.flatMap((c, i) => (c ? [] : [i]));
    if (free.length === 0) return false;
    const slot = Phaser.Utils.Array.GetRandom(free);
    const frosting = FROSTINGS[Phaser.Math.Between(0, this.cfg.frostingCount - 1)].id;
    const topping = TOPPINGS[Phaser.Math.Between(0, this.cfg.toppingCount - 1)].id;
    sfx(this, 'customer_arrive', 0.35);
    this.customers[slot] = new Customer(
      this,
      slot,
      LAYOUT.customerSlotsX[slot],
      pickMonster(this.cfg.monsterPool),
      this.cfg.patienceSec,
      { frosting, topping },
      (cust) => this.serve(cust),
    );
    return true;
  }

  private hint(msg: string, x = W / 2, y = 372): void {
    sfx(this, 'nope', 0.3);
    floatText(this, x, y, msg, '#ffd166');
  }

  private endNight(): void {
    this.phase = 'ended';
    this.setHand(null);
    sfx(this, 'win', 0.4);
    const t = this.add
      .text(W / 2, H / 2 - 30, 'MIDNIGHT!', {
        fontFamily: FONT,
        fontSize: '84px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#140d24',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay)
      .setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 450, ease: 'Back.easeOut' });
    this.time.delayedCall(1500, () =>
      fadeOutThen(this, () => this.scene.start('Result', { money: this.money, stats: this.stats })),
    );
  }
}
