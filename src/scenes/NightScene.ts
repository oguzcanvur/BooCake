import Phaser from 'phaser';
import { sfx } from '../audio';
import { DEPTH, FONT, H, LAYOUT, STATION_X, W } from '../config';
import { CONFIG, type DayConfig, type SpecialId } from '../data/gameConfig';
import { GUARD_MONSTER, SPECIAL_MONSTERS, pickNormal } from '../data/monsters';
import { DOUGHS, FROSTINGS, TOPPINGS, frostingInfo, randomOrder, type DoughId, type FrostingId, type ToppingId } from '../data/recipes';
import { burst, coinFlight, fadeIn, fadeOutThen, floatText } from '../fx';
import { Customer } from '../objects/Customer';
import { drawCupcake, isFinished, matchesOrder, type CupcakeData } from '../objects/cupcake';
import { MonsterView } from '../objects/MonsterView';
import { OvenSlot } from '../objects/OvenSlot';
import { Shop } from '../objects/Shop';
import {
  createDoughBowl,
  createLockedOven,
  createPipingBag,
  createPlate,
  createToppingJar,
  createTrash,
  createTray,
  drawShelf,
} from '../objects/stations';
import { Thief, type ThiefOutcome } from '../objects/Thief';
import { currentDay, gameState, ovenCount } from '../systems/GameState';
import { MONSTER_CARDS, T } from '../text';
import { makeButton } from '../ui/button';
import { Hud } from '../ui/Hud';
import { drawPanel } from '../ui/panel';

type Phase = 'intro' | 'playing' | 'ended';

/** Where a cupcake can be: on the plate, on a ready-tray slot, or still in an oven (a burnt one). */
type Loc = { kind: 'plate' } | { kind: 'tray'; i: number } | { kind: 'oven'; i: number };

export interface DayStats {
  served: number;
  wrong: number;
  left: number;
  burnt: number;
  stolen: number;
  bites: number;
  caught: number;
}

/**
 * One day in the shop: the core gameplay loop.
 *
 * Click flow ("select, then click the target"):
 *   dough bowl -> oven (cooks 5 s, burns after 10 s) -> click the cupcake to move it to the plate
 *   -> frosting -> topping -> click the customer (or put it on the ready tray and serve it later).
 *   The trash can throws away whatever is selected (plate, tray cupcake or a burnt cupcake in the oven).
 *
 * Scene events used: 'cupcake-ready', 'cupcake-burned'.
 */
export class NightScene extends Phaser.Scene {
  private day!: DayConfig;
  private phase: Phase = 'intro';
  private elapsed = 0;
  private earned = 0;
  private spawnIn = 0;
  private lastTick = -1;
  /** Clicks are ignored until this time (vampire bite). */
  private lockUntil = 0;

  private plate: CupcakeData | null = null;
  private tray: (CupcakeData | null)[] = [];
  private selected: Loc | null = null;

  private customers: (Customer | null)[] = [];
  private ovens: OvenSlot[] = [];
  private bowls: { shake: () => void }[] = [];
  private thieves: Thief[] = [];
  private guard: MonsterView | null = null;
  /** Each special monster is scheduled at least once per day. */
  private plan: { id: SpecialId; at: number; done: boolean }[] = [];
  private stats: DayStats = { served: 0, wrong: 0, left: 0, burnt: 0, stolen: 0, bites: 0, caught: 0 };

  private shop!: Shop;
  private hud!: Hud;
  private itemsGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Night');
  }

  init(): void {
    this.day = currentDay();
    this.phase = 'intro';
    this.elapsed = 0;
    this.earned = 0;
    this.spawnIn = CONFIG.firstCustomerSec;
    this.lastTick = -1;
    this.lockUntil = 0;
    this.plate = null;
    this.tray = new Array(CONFIG.traySlots).fill(null);
    this.selected = null;
    this.customers = LAYOUT.customerSlotsX.map(() => null);
    this.ovens = [];
    this.bowls = [];
    this.thieves = [];
    this.guard = null;
    this.stats = { served: 0, wrong: 0, left: 0, burnt: 0, stolen: 0, bites: 0, caught: 0 };
    // every open special monster comes at least once, at a random time of the day
    this.plan = this.day.specials.map((id) => ({
      id,
      at: id === 'thief' ? Phaser.Math.FloatBetween(30, 110) : Phaser.Math.FloatBetween(15, 100),
      done: false,
    }));
  }

  create(): void {
    fadeIn(this);
    this.shop = new Shop(this);
    if (gameState.upgrades.garlic) this.shop.showGarlic();
    this.hud = new Hud(this, this.day.goal, gameState.day + 1);
    this.hud.onStar = (_i, x, y) => {
      sfx(this, 'star', 0.5);
      burst(this, x, y, 'star_04', { count: 10, tint: 0xffe066, gravity: 60 });
    };
    this.createStations();
    this.itemsGfx = this.add.graphics().setDepth(DEPTH.items);

    // Scene event listeners survive scene restarts, so they must be removed on shutdown
    // (otherwise "Tekrar dene" / the next day would add a duplicate listener every time).
    const onReady = (x: number, y: number) => {
      sfx(this, 'oven_ready', 0.5);
      floatText(this, x, y - 96, T.ready, '#7dffb0');
      burst(this, x, y - 10, 'star_04', { count: 8, tint: 0xb6ffd0, gravity: 40, speed: [60, 160] });
    };
    const onBurned = (x: number, y: number) => {
      this.stats.burnt++;
      sfx(this, 'burnt', 0.45);
      floatText(this, x, y - 96, T.burnt, '#ff6b6b');
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
    if (this.phase !== 'playing') return;
    const dt = Math.min(delta, 100) / 1000;
    this.elapsed += dt;

    for (const oven of this.ovens) oven.update(dt);

    // regular customers, a little faster as the day goes on
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const gap = this.day.interval + Phaser.Math.FloatBetween(-CONFIG.intervalJitter, CONFIG.intervalJitter);
      this.spawnIn = this.trySpawn() ? Math.max(2, gap) : 1.5;
    }

    // scheduled special monsters (each open one arrives at least once)
    for (const p of this.plan) {
      if (p.done || this.elapsed < p.at) continue;
      if (p.id === 'thief') {
        p.done = true;
        this.spawnThief();
      } else if (this.trySpawn(p.id)) {
        p.done = true;
      }
    }

    this.customers.forEach((c, i) => {
      if (!c) return;
      c.update(dt);
      if (c.expired) {
        this.stats.left++;
        sfx(this, 'customer_left', 0.4);
        floatText(this, c.x, c.y - 10, T.leftAngry, '#ff6b6b');
        c.leave('angry');
        this.customers[i] = null;
      }
    });

    const left = CONFIG.dayLengthSec - this.elapsed;
    this.shop.update(this.elapsed / CONFIG.dayLengthSec);
    this.hud.update(left, this.earned);
    this.shop.setJar(this.earned / (this.day.goal * CONFIG.stars[CONFIG.stars.length - 1]));

    // clock ticks in the last 10 seconds
    const whole = Math.ceil(left);
    if (whole <= 10 && whole > 0 && whole !== this.lastTick) {
      this.lastTick = whole;
      sfx(this, 'tick', 0.35);
    }
    if (left <= 0) this.endDay();
  }

  // ---------------------------------------------------------------- setup

  private createStations(): void {
    const y = LAYOUT.stationY;
    const ty = LAYOUT.trayY;

    // dough bowls
    drawShelf(this, 144, y, 224, T.dough);
    DOUGHS.forEach((d, i) => this.bowls.push(createDoughBowl(this, STATION_X.dough[i], y, d.id, () => this.onDough(d.id))));

    // ovens (the 3rd one is locked until it is bought in the shop)
    drawShelf(this, 452, y, 376, T.oven);
    const owned = ovenCount();
    STATION_X.oven.forEach((x, i) => {
      if (i < owned) this.ovens.push(new OvenSlot(this, x, y, CONFIG.oven.cookSec, CONFIG.oven.burnSec, (slot) => this.onOven(slot)));
      else createLockedOven(this, x, y, CONFIG.shop.oven3);
    });

    // plate (the preparation spot)
    drawShelf(this, STATION_X.plate, y, 130, T.plate);
    createPlate(this, STATION_X.plate, y, () => this.onPlate());

    // frosting and toppings
    drawShelf(this, 904, y, 220, T.frosting);
    FROSTINGS.forEach((f, i) => createPipingBag(this, STATION_X.frosting[i], y, f.id, () => this.onFrosting(f.id, STATION_X.frosting[i], y)));
    drawShelf(this, 1134, y, 220, T.topping);
    TOPPINGS.forEach((t, i) => createToppingJar(this, STATION_X.topping[i], y, t.id, () => this.onTopping(t.id, STATION_X.topping[i], y)));

    // ready tray and trash can
    createTray(this, STATION_X.tray, ty, (i) => this.onTray(i));
    this.add
      .text(STATION_X.tray[1] + 84, ty - 6, T.tray, { fontFamily: FONT, fontSize: '15px', color: '#c9bdf0', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.station);
    createTrash(this, STATION_X.trash, ty, () => this.onTrash());

    // the security guard stands next to the tray
    if (gameState.upgrades.guard) {
      this.guard = new MonsterView(this, STATION_X.guard, ty + 4, GUARD_MONSTER);
      this.guard.root.setDepth(DEPTH.thief - 1);
    }
  }

  private showIntro(): void {
    const cx = W / 2;
    const newOnes = this.day.specials.filter((s) => !gameState.seenCards.includes(s));
    newOnes.forEach((s) => gameState.seenCards.push(s));

    const rowH = 124;
    const panelW = 700;
    const panelH = 190 + newOnes.length * rowH;
    const cy = H / 2 - 24;
    const cover = this.add.rectangle(cx, H / 2, W, H, 0x0a0618, 0.72).setDepth(DEPTH.overlay).setInteractive();
    const panel = this.add.container(cx, cy).setDepth(DEPTH.overlay + 1);
    const g = this.add.graphics();
    drawPanel(g, panelW, panelH);
    panel.add(g);

    const top = -panelH / 2;
    panel.add(
      this.add
        .text(0, top + 50, T.dayIntro(gameState.day + 1), { fontFamily: FONT, fontSize: '50px', color: '#ffb4d9', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 7 })
        .setOrigin(0.5),
    );
    panel.add(this.add.text(0, top + 116, T.goal(this.day.goal), { fontFamily: FONT, fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));

    newOnes.forEach((id, i) => {
      const def = SPECIAL_MONSTERS[id];
      const rowY = top + 178 + i * rowH + rowH / 2 - 10;
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x000000, 0.2);
      rowBg.fillRoundedRect(-panelW / 2 + 24, rowY - rowH / 2 + 8, panelW - 48, rowH - 16, 18);
      panel.add(rowBg);
      const view = new MonsterView(this, 0, 0, def);
      panel.add(view.root);
      view.root.setPosition(-panelW / 2 + 110, rowY + 4).setScale(0.62);
      const card = MONSTER_CARDS[id];
      panel.add(
        this.add
          .text(-panelW / 2 + 190, rowY, card.text, {
            fontFamily: FONT,
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold',
            wordWrap: { width: panelW - 250 },
          })
          .setOrigin(0, 0.5),
      );
    });

    panel.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    const btn = makeButton(
      this,
      cx,
      cy + panelH / 2 + 56,
      300,
      70,
      T.openShop,
      () => {
        sfx(this, 'night_start', 0.6);
        cover.destroy();
        panel.destroy();
        btn.destroy();
        this.phase = 'playing';
      },
      { color: 'green', depth: DEPTH.overlay + 2, fontSize: 30 },
    );
  }

  // ---------------------------------------------------------------- selection and drawing

  private peek(loc: Loc): CupcakeData | null {
    if (loc.kind === 'plate') return this.plate;
    if (loc.kind === 'tray') return this.tray[loc.i];
    return this.ovens[loc.i]?.cupcake ?? null;
  }

  /** Take the cupcake out of its place and return it. */
  private removeFrom(loc: Loc): CupcakeData | null {
    if (loc.kind === 'plate') {
      const c = this.plate;
      this.plate = null;
      return c;
    }
    if (loc.kind === 'tray') {
      const c = this.tray[loc.i];
      this.tray[loc.i] = null;
      return c;
    }
    return this.ovens[loc.i]?.take() ?? null;
  }

  private locPos(loc: Loc): { x: number; y: number } {
    if (loc.kind === 'plate') return { x: STATION_X.plate, y: LAYOUT.stationY - 16 };
    if (loc.kind === 'tray') return { x: STATION_X.tray[loc.i], y: LAYOUT.trayY - 14 };
    return { x: this.ovens[loc.i].x, y: this.ovens[loc.i].y };
  }

  private select(loc: Loc | null): void {
    this.selected = loc;
    this.ovens.forEach((o, i) => (o.selected = !!loc && loc.kind === 'oven' && loc.i === i));
    this.refreshItems();
  }

  private isSelected(loc: Loc): boolean {
    const s = this.selected;
    if (!s || s.kind !== loc.kind) return false;
    return s.kind === 'plate' || (s as { i: number }).i === (loc as { i: number }).i;
  }

  /** Redraw the cupcakes on the plate and on the ready tray, with a white ring around the selected one. */
  private refreshItems(): void {
    const g = this.itemsGfx;
    g.clear();
    const ring = (x: number, y: number, w: number, h: number) => {
      g.fillStyle(0xffffff, 0.14);
      g.fillEllipse(x, y, w, h);
      g.lineStyle(4, 0xffffff, 0.95);
      g.strokeEllipse(x, y, w, h);
    };
    if (this.plate) {
      const x = STATION_X.plate;
      const y = LAYOUT.stationY;
      if (this.isSelected({ kind: 'plate' })) ring(x, y - 16, 108, 132);
      drawCupcake(g, x, y + 8, this.plate, 1.2);
    }
    this.tray.forEach((c, i) => {
      if (!c) return;
      const x = STATION_X.tray[i];
      const y = LAYOUT.trayY;
      if (this.isSelected({ kind: 'tray', i })) ring(x, y - 12, 84, 108);
      drawCupcake(g, x, y + 8, c, 1.0);
    });
  }

  /** A cupcake that flies from one point to another and shrinks (serving, stealing). */
  private flyCupcake(c: CupcakeData, from: { x: number; y: number }, to: { x: number; y: number }, ms = 280, onDone?: () => void): void {
    const g = this.add.graphics().setDepth(DEPTH.fx + 2);
    drawCupcake(g, 0, 0, c, 1);
    g.setPosition(from.x, from.y);
    this.tweens.add({
      targets: g,
      x: to.x,
      y: to.y,
      scale: 0.45,
      duration: ms,
      ease: 'Quad.easeIn',
      onComplete: () => {
        g.destroy();
        onDone?.();
      },
    });
  }

  // ---------------------------------------------------------------- player actions

  private blocked(): boolean {
    return this.phase !== 'playing' || this.time.now < this.lockUntil;
  }

  private hint(msg: string, x = W / 2, y = LAYOUT.trayY + 70): void {
    sfx(this, 'nope', 0.3);
    floatText(this, x, y, msg, '#ffd166');
  }

  private onDough(id: DoughId): void {
    if (this.blocked()) return;
    const slot = this.ovens.find((o) => !o.cupcake);
    if (!slot) {
      this.ovens.forEach((o) => o.shake());
      this.bowls.forEach((b) => b.shake());
      this.hint(T.ovenFull, STATION_X.oven[1], LAYOUT.stationY - 100);
      return;
    }
    sfx(this, 'bake_start', 0.5);
    slot.start(id);
  }

  private onOven(slot: OvenSlot): void {
    if (this.blocked()) return;
    const c = slot.cupcake;
    if (!c) return;
    if (c.bake === 'raw') {
      this.hint(T.stillBaking, slot.x, slot.y - 96);
      return;
    }
    const index = this.ovens.indexOf(slot);
    if (this.plate) {
      // the plate is busy: a burnt cupcake can still be selected so the trash can takes it
      if (c.bake === 'burnt') {
        this.select({ kind: 'oven', i: index });
        this.hint(T.burntSelected, slot.x, slot.y - 96);
      } else {
        this.hint(T.plateFull, slot.x, slot.y - 96);
      }
      return;
    }
    sfx(this, 'pickup', 0.5);
    this.plate = slot.take();
    this.select({ kind: 'plate' });
  }

  private onPlate(): void {
    if (this.blocked() || !this.plate) return;
    sfx(this, 'pickup', 0.35);
    this.select({ kind: 'plate' });
  }

  private onFrosting(id: FrostingId, bx: number, by: number): void {
    if (this.blocked()) return;
    const c = this.plate;
    if (!c) return this.hint(T.plateEmpty, bx, by - 96);
    if (c.bake === 'burnt') return this.hint(T.burntNoDecorate, bx, by - 96);
    if (c.frosting) return this.hint(T.alreadyFrosted, bx, by - 96);
    c.frosting = id;
    sfx(this, 'place', 0.45);
    burst(this, bx, by + 42, 'circle_05', { count: 7, tint: frostingInfo(id).color, gravity: 260, speed: [40, 120], scale: [0.18, 0.04], additive: false });
    this.refreshItems();
  }

  private onTopping(id: ToppingId, bx: number, by: number): void {
    if (this.blocked()) return;
    const c = this.plate;
    if (!c) return this.hint(T.plateEmpty, bx, by - 96);
    if (c.bake === 'burnt') return this.hint(T.burntNoDecorate, bx, by - 96);
    if (!c.frosting) return this.hint(T.frostingFirst, bx, by - 96);
    if (c.topping) return this.hint(T.alreadyTopped, bx, by - 96);
    c.topping = id;
    sfx(this, 'place', 0.45, 1.25);
    burst(this, bx, by - 10, 'spark_05', { count: 8, tint: 0xfff0a8, gravity: 120, speed: [50, 140], scale: [0.2, 0.04] });
    this.refreshItems();
  }

  private onTray(i: number): void {
    if (this.blocked()) return;
    const x = STATION_X.tray[i];
    if (this.tray[i]) {
      // pick a waiting cupcake: it is now the one that will be served to the next customer you click
      sfx(this, 'pickup', 0.4);
      this.select({ kind: 'tray', i });
      return;
    }
    if (this.plate && isFinished(this.plate)) {
      sfx(this, 'place', 0.45);
      this.tray[i] = this.plate;
      this.plate = null;
      this.select(null);
      return;
    }
    this.hint(T.trayNeedsFinished, x, LAYOUT.trayY - 70);
  }

  private onTrash(): void {
    if (this.blocked()) return;
    const loc: Loc | null = this.selected ?? (this.plate ? { kind: 'plate' } : null);
    if (!loc || !this.peek(loc)) return this.hint(T.nothingToTrash, STATION_X.trash - 60, LAYOUT.trayY - 70);
    this.removeFrom(loc);
    this.select(null);
    sfx(this, 'trash', 0.5);
    burst(this, STATION_X.trash, LAYOUT.trayY - 20, 'smoke_05', { count: 5, tint: 0x9aa0b4, gravity: -30, speed: [20, 70], scale: [0.2, 0.5], additive: false });
  }

  private onCustomer(c: Customer): void {
    if (this.blocked()) return;
    // the selected tray cupcake wins; otherwise serve what is on the plate
    let loc: Loc | null = null;
    if (this.selected && this.selected.kind !== 'oven') loc = this.selected;
    else if (this.plate) loc = { kind: 'plate' };
    const item = loc ? this.peek(loc) : null;
    if (!loc || !item) return this.hint(T.nothingToServe, c.x, c.y - 10);
    if (item.bake === 'burnt') return this.hint(T.burntNoServe, c.x, c.y - 10);
    if (!isFinished(item)) return this.hint(T.notFinished, c.x, c.y - 10);

    const from = this.locPos(loc);
    this.removeFrom(loc);
    this.select(null);

    if (matchesOrder(item, c.order)) {
      // correct cupcake: always $5, plus a tip that depends on the customer's mood right now
      const tip = CONFIG.tips[c.mood];
      const pay = CONFIG.price + tip;
      this.earned += pay;
      this.stats.served++;
      this.customers[c.slot] = null;
      c.lock();
      if (c.kind === 'ghost') this.serveGhost(c, item, pay, tip);
      else this.serveHappy(c, item, from, pay, tip);
    } else {
      // wrong cupcake: it vanishes and the customer loses 20% of their patience (no money penalty)
      this.stats.wrong++;
      sfx(this, 'serve_wrong', 0.5);
      this.flyCupcake(item, from, { x: c.x, y: c.y - 10 }, 240, () =>
        burst(this, c.x, c.y - 20, 'smoke_05', { count: 7, tint: 0xff4d6d, gravity: -40, speed: [30, 110], scale: [0.25, 0.6], additive: false }),
      );
      floatText(this, c.x, c.y - 16, T.wrongOrder, '#ff6b6b');
      c.hitPatience(CONFIG.wrongOrderPatiencePenalty);
      c.shake();
    }
  }

  private serveHappy(c: Customer, item: CupcakeData, from: { x: number; y: number }, pay: number, tip: number): void {
    sfx(this, 'serve_ok', 0.55);
    this.flyCupcake(item, from, { x: c.x, y: c.y - 10 }, 240);
    this.payout(c, pay, tip);
    c.leave('happy');
  }

  /** The ghost: the cupcake falls right through it onto the floor, but it still pays in full. */
  private serveGhost(c: Customer, item: CupcakeData, pay: number, tip: number): void {
    const g = this.add.graphics().setDepth(DEPTH.monster + 1);
    drawCupcake(g, 0, 0, item, 1);
    g.setPosition(c.x, c.y - 6);
    this.tweens.add({ targets: g, y: LAYOUT.counterTop + 60, angle: 40, alpha: 0, duration: 650, ease: 'Quad.easeIn', onComplete: () => g.destroy() });
    sfx(this, 'place', 0.6, 0.55);
    floatText(this, c.x, c.y - 60, T.ghostDrop, '#c9bdf0');
    this.time.delayedCall(300, () => {
      sfx(this, 'serve_ok', 0.5);
      this.payout(c, pay, tip);
      c.leave('happy');
    });
  }

  private payout(c: Customer, pay: number, tip: number): void {
    floatText(this, c.x, c.y - 16, `+$${pay}${tip > 0 ? `  (+$${tip})` : ''}`, '#7dffb0', 26);
    burst(this, c.x, c.y - 30, 'star_01', { count: 12, tint: [0xffe066, 0xff8fc7, 0x8fffd0], gravity: 160 });
    coinFlight(this, { x: c.x, y: c.y + 20 }, this.shop.jarPos, Math.min(6, 2 + Math.ceil(pay / 4)), () => {
      sfx(this, 'coin', 0.22, Phaser.Math.FloatBetween(0.9, 1.3));
      this.shop.jarBump();
    });
  }

  // ---------------------------------------------------------------- customers and special monsters

  /** Seat a new customer. `special` forces a special monster (for the daily guarantee). */
  private trySpawn(special?: SpecialId): boolean {
    const free = this.customers.flatMap((c, i) => (c ? [] : [i]));
    if (free.length === 0) return false;

    let kind: SpecialId | undefined = special;
    if (!kind) {
      // now and then a special monster joins the regular crowd (the thief never takes a seat)
      const pool = this.day.specials.filter((s) => s !== 'thief');
      if (pool.length > 0 && Math.random() < CONFIG.extraSpecialChance) kind = Phaser.Utils.Array.GetRandom(pool);
    }
    const def = kind ? SPECIAL_MONSTERS[kind] : pickNormal();
    const slot = Phaser.Utils.Array.GetRandom(free);
    sfx(this, 'customer_arrive', 0.35);
    const customer = new Customer(this, slot, LAYOUT.customerSlotsX[slot], def, this.day.patience, randomOrder(), (cust) => this.onCustomer(cust));
    this.customers[slot] = customer;
    if (def.kind === 'vampire') this.time.delayedCall(700, () => this.vampireArrives(customer));
    return true;
  }

  /** The vampire bites the player on arrival, unless garlic is on the counter. */
  private vampireArrives(c: Customer): void {
    if (this.phase !== 'playing') return;
    if (gameState.upgrades.garlic) {
      c.disgust();
      sfx(this, 'nope', 0.4);
      floatText(this, c.x, c.y - 30, T.garlicScares, '#c9f7a8', 26);
      return;
    }
    this.bite();
  }

  /** Red screen, "ISIRILDIN!", and no clicking for 5 seconds. The ovens keep running. */
  private bite(): void {
    this.stats.bites++;
    const ms = CONFIG.biteSec * 1000;
    this.lockUntil = this.time.now + ms;
    sfx(this, 'serve_wrong', 0.6, 0.55);
    this.cameras.main.shake(320, 0.01);

    const red = this.add.rectangle(W / 2, H / 2, W, H, 0xc1121f, 0.3).setDepth(DEPTH.overlay - 5);
    this.tweens.add({ targets: red, alpha: 0.12, duration: 420, yoyo: true, repeat: -1 });
    const title = this.add
      .text(W / 2, H / 2 - 20, T.bitten, { fontFamily: FONT, fontSize: '96px', color: '#ffffff', fontStyle: 'bold', stroke: '#7a0b16', strokeThickness: 14 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay - 4)
      .setScale(0.4);
    this.tweens.add({ targets: title, scale: 1, duration: 300, ease: 'Back.easeOut' });
    const count = this.add
      .text(W / 2, H / 2 + 70, String(CONFIG.biteSec), { fontFamily: FONT, fontSize: '56px', color: '#ffd1d6', fontStyle: 'bold', stroke: '#7a0b16', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay - 4);
    this.time.addEvent({
      delay: 100,
      repeat: CONFIG.biteSec * 10 - 1,
      callback: () => count.setText(String(Math.max(1, Math.ceil((this.lockUntil - this.time.now) / 1000)))),
    });
    this.time.delayedCall(ms, () => {
      this.tweens.add({
        targets: [red, title, count],
        alpha: 0,
        duration: 250,
        onComplete: () => [red, title, count].forEach((o) => o.destroy()),
      });
    });
  }

  /** The thief runs in front of the counter. It takes everything on the tray, unless the guard is there. */
  private spawnThief(): void {
    const thief = new Thief(this);
    this.thieves.push(thief);
    sfx(this, 'customer_arrive', 0.3, 1.5);
    thief.run(
      (): ThiefOutcome => {
        if (gameState.upgrades.guard) {
          this.earned += CONFIG.guardBonus;
          this.stats.caught++;
          this.guard?.hop(22, 160);
          floatText(this, thief.x, thief.y - 90, `${T.thiefCaught} +$${CONFIG.guardBonus}`, '#7dffb0', 26);
          burst(this, thief.x, thief.y - 30, 'star_01', { count: 10, tint: 0xffe066, gravity: 140 });
          coinFlight(this, { x: thief.x, y: thief.y }, this.shop.jarPos, 3, () => sfx(this, 'coin', 0.22));
          sfx(this, 'serve_ok', 0.5);
          return 'caught';
        }
        const loot = this.tray.flatMap((c, i) => (c ? [{ c, i }] : []));
        if (loot.length === 0) {
          floatText(this, thief.x, thief.y - 90, T.thiefEmpty, '#ffd166');
          return 'empty';
        }
        loot.forEach(({ c, i }) => this.flyCupcake(c, { x: STATION_X.tray[i], y: LAYOUT.trayY }, { x: thief.x, y: thief.y - 20 }, 320));
        this.tray = this.tray.map(() => null);
        if (this.selected?.kind === 'tray') this.select(null);
        else this.refreshItems();
        this.stats.stolen += loot.length;
        sfx(this, 'nope', 0.5, 0.7);
        floatText(this, thief.x, thief.y - 90, T.thiefStole, '#ff6b6b', 26);
        return 'steal';
      },
      () => (this.thieves = this.thieves.filter((t) => t !== thief)),
    );
  }

  // ---------------------------------------------------------------- end of day

  private endDay(): void {
    if (this.phase === 'ended') return;
    this.phase = 'ended';
    this.select(null);
    // no new customers; everyone at the counter leaves
    this.customers.forEach((c, i) => {
      c?.leave('happy');
      this.customers[i] = null;
    });
    this.thieves.forEach((t) => t.destroy());
    this.thieves = [];
    sfx(this, 'win', 0.4);
    const t = this.add
      .text(W / 2, H / 2 - 30, T.dayOver, { fontFamily: FONT, fontSize: '92px', color: '#ffffff', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 12 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay)
      .setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 450, ease: 'Back.easeOut' });
    this.time.delayedCall(1500, () => fadeOutThen(this, () => this.scene.start('Summary', { earned: this.earned, stats: this.stats })));
  }
}
