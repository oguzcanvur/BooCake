import Phaser from 'phaser';
import { sfx } from '../audio';
import { DEPTH, DOUGH_TABLES, FONT, GUARD, H, JARS, LAYOUT, PLATES, POCKET, STATION_X, TRASH, W } from '../config';
import { CONFIG, WAVE_SPLIT, type SpecialId, type SpecialVisit, type Waves } from '../data/gameConfig';
import { THIEF_KEYS } from '../assets';
import { GUARD_MONSTER, SPECIAL_MONSTERS, pickNormal, pickSpecial } from '../data/monsters';
import {
  DOUGHS,
  FROSTINGS,
  TOPPINGS,
  doughInfo,
  frostingInfo,
  ingredientGroup,
  ingredientName,
  toppingInfo,
  randomOrder,
  type DoughId,
  type FrostingId,
  type IsOpen,
  type ToppingId,
} from '../data/recipes';
import { burst, coinFlight, fadeIn, fadeOutThen, floatText } from '../fx';
import { Customer } from '../objects/Customer';
import { drawCupcake, isFinished, matchesOrder, type CupcakeData } from '../objects/cupcake';
import { MonsterView } from '../objects/MonsterView';
import { OvenSlot } from '../objects/OvenSlot';
import { Shop } from '../objects/Shop';
import { TutorialGuide, type TutorialBox, type TutorialPointer, type TutorialStep } from '../objects/Tutorial';
import {
  createDoughBowl,
  createDoughTable,
  createFrostingPocket,
  createPipingBag,
  createPlate,
  createToppingJar,
  createTrash,
  createTray,
  type Spot,
} from '../objects/stations';
import { Thief, type ThiefOutcome } from '../objects/Thief';
import { gameState, ovenCount, plateCount } from '../systems/GameState';
import { LEAGUE_STREAM, league, leagueSeed, leagueSpecials } from '../systems/league';
import { between, pick, stream, type Rand } from '../systems/rng';
import { MONSTER_CARDS, T } from '../text';
import { makeButton } from '../ui/button';
import { Hud } from '../ui/Hud';
import { drawPanel } from '../ui/panel';

type Phase = 'intro' | 'playing' | 'ended';

/** Where a cupcake can be: on a plate, on a ready-tray slot, or still in an oven (a burnt one). */
type Loc = { kind: 'plate' | 'tray' | 'oven'; i: number };

/** Cupcake center above a plate's bottom edge. */
const ON_PLATE = 60;

export interface DayStats {
  served: number;
  /** Customers served while still happy (league bonus). */
  happy: number;
  wrong: number;
  left: number;
  burnt: number;
  stolen: number;
  bites: number;
  caught: number;
  /** Longest run of correct cupcakes in a row (a wrong cupcake or a lost customer breaks it). */
  bestStreak: number;
}

export type PlayMode = 'campaign' | 'league';

/** What the scene is started with: a campaign night (the current gameState.day) or a league run with its seed. */
export interface NightStart {
  mode?: PlayMode;
  seed?: number;
}

/** Everything one run needs, from a campaign night or from the league settings. */
interface RunSetup {
  length: number;
  goal: number;
  patience: number;
  seats: number;
  waves: Waves;
  specials: SpecialVisit[];
  open: IsOpen;
  gear: { ovens: number; plates: number; garlic: boolean; guard: boolean };
}

/** Data handed to the Summary scene. */
export interface NightEnd {
  mode: PlayMode;
  seed: number;
  earned: number;
  stats: DayStats;
}

type Wave = 0 | 1 | 2;

/**
 * One day in the shop: the core gameplay loop.
 *
 * Click flow ("select, then click the target"):
 *   dough bowl -> oven (cooks 5 s, burns after 10 s) -> click the cupcake to move it to a free plate
 *   -> frosting -> topping (they go on the selected plate, or on the first plate that needs them) -> click the customer (or put it on the ready tray and serve it later).
 *   The trash can throws away whatever is selected (plate, tray cupcake or a burnt cupcake in the oven).
 *
 * Scene events used: 'cupcake-ready', 'cupcake-burned'.
 */
export class NightScene extends Phaser.Scene {
  private day!: RunSetup;
  private mode: PlayMode = 'campaign';
  private seed = 0;
  /** Seeded random streams (the league uses its seed, so every player gets the same night). */
  private rand!: { customers: Rand; orders: Rand; seats: Rand; gaps: Rand };
  /** Which wave the night is in (0 calm, 1 middle, 2 rush), to show a banner when it changes. */
  private wave: Wave = 0;
  private streak = 0;
  /** Banners on screen right now (each new one goes below the others). */
  private phase: Phase = 'intro';
  private elapsed = 0;
  private earned = 0;
  private spawnIn = 0;
  private lastTick = -1;
  /** Clicks are ignored until this time (vampire bite). */
  private lockUntil = 0;

  /** One entry per plate the player owns (2 at the start, up to 4). */
  private plates: (CupcakeData | null)[] = [];
  private tray: (CupcakeData | null)[] = [];
  private selected: Loc | null = null;

  private customers: (Customer | null)[] = [];
  private ovens: OvenSlot[] = [];
  private bowls: Spot[] = [];
  private bags: Spot[] = [];
  private jars: Spot[] = [];
  /** First-order guide (Day 1, only the very first time): the guide, the customer it follows and whether the player began. */
  private trashFlap: () => void = () => {};
  private tutorialOn = false;
  private tutorialGuide: TutorialGuide | null = null;
  private tutorialCustomer: Customer | null = null;
  private tutorialStarted = false;
  private thieves: Thief[] = [];
  /** The counter seat the thief is standing at (no customer takes it until he leaves). */
  private thiefSeat: number | null = null;
  private guard: MonsterView | null = null;
  /** The planned special monsters of this night (a warning banner comes first). */
  private plan: { id: SpecialId; at: number; warned: boolean; done: boolean }[] = [];
  private stats: DayStats = NightScene.emptyStats();

  private shop!: Shop;
  private hud!: Hud;
  private itemsGfx!: Phaser.GameObjects.Graphics;
  /** Cupcake being dragged with the mouse (from the plate or the tray), and its picture under the pointer. */
  private drag: { loc: Loc; item: CupcakeData; x: number; y: number; moving: boolean } | null = null;
  private dragGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Night');
  }

  private static emptyStats(): DayStats {
    return { served: 0, happy: 0, wrong: 0, left: 0, burnt: 0, stolen: 0, bites: 0, caught: 0, bestStreak: 0 };
  }

  /** The settings of this run: the current campaign night, or the league (same kitchen for everyone). */
  private setup(): RunSetup {
    if (this.mode === 'league') {
      const L = CONFIG.league;
      return {
        length: L.length,
        goal: L.par,
        patience: L.patience,
        seats: L.seats,
        waves: L.waves,
        specials: leagueSpecials(this.seed),
        open: (id) => L.ingredients.includes(id),
        gear: { ...L.gear },
      };
    }
    const night = CONFIG.nights[gameState.day];
    // every flavor that joined on this night or an earlier one is on the table
    const opened = CONFIG.nights.slice(0, gameState.day + 1).flatMap((n) => n.newIngredients);
    const u = gameState.upgrades;
    return {
      length: night.length,
      goal: night.goal,
      patience: night.patience,
      seats: night.seats,
      waves: night.waves,
      specials: night.specials,
      open: (id) => opened.includes(id),
      gear: { ovens: ovenCount(), plates: plateCount(), garlic: u.garlic, guard: u.guard },
    };
  }

  init(data: NightStart = {}): void {
    this.mode = data.mode ?? 'campaign';
    // the league seed is the challenge; a campaign night just needs some seed
    this.seed = this.mode === 'league' ? (data.seed ?? leagueSeed()) : Math.floor(Math.random() * 2 ** 31);
    this.rand = {
      customers: stream(this.seed, LEAGUE_STREAM.customers),
      orders: stream(this.seed, LEAGUE_STREAM.orders),
      seats: stream(this.seed, LEAGUE_STREAM.seats),
      gaps: stream(this.seed, LEAGUE_STREAM.gaps),
    };
    this.day = this.setup();
    this.wave = 0;
    this.streak = 0;
    this.phase = 'intro';
    this.elapsed = 0;
    this.earned = 0;
    this.spawnIn = CONFIG.firstCustomerSec;
    this.lastTick = -1;
    this.lockUntil = 0;
    this.plates = new Array(this.day.gear.plates).fill(null);
    this.tray = new Array(CONFIG.traySlots).fill(null);
    this.selected = null;
    this.customers = LAYOUT.customerSlotsX.map(() => null);
    this.ovens = [];
    this.bowls = [];
    this.bags = [];
    this.jars = [];
    this.tutorialOn = this.mode === 'campaign' && gameState.day === 0 && !gameState.seenCards.includes('tutorial');
    this.tutorialGuide = null;
    this.tutorialCustomer = null;
    this.tutorialStarted = false;
    this.thieves = [];
    this.thiefSeat = null;
    this.guard = null;
    this.drag = null;
    this.stats = NightScene.emptyStats();
    // special monsters come only at their planned moments (nothing random), each announced a few seconds before
    this.plan = this.day.specials.map((v) => ({ id: v.id, at: v.at, warned: false, done: false }));
  }

  /** The wave at a moment of the night: calm start, steady middle, short rush at the end. */
  private waveAt(t: number): Wave {
    const f = t / this.day.length;
    return f >= WAVE_SPLIT.rush ? 2 : f >= WAVE_SPLIT.middle ? 1 : 0;
  }

  /** Seconds until the next regular customer: the wave's gap with a little (seeded) wobble. */
  private nextGap(): number {
    const base = this.day.waves[this.waveAt(this.elapsed)];
    return Math.max(2, base + between(this.rand.gaps, -CONFIG.intervalJitter, CONFIG.intervalJitter));
  }

  create(): void {
    fadeIn(this);
    this.shop = new Shop(this);
    if (this.day.gear.garlic) this.shop.showGarlic();
    this.hud = new Hud(this, this.day.goal, this.mode === 'league' ? T.leagueShort : T.day(gameState.day + 1), this.day.length);
    this.hud.onStar = (_i, x, y) => {
      sfx(this, 'star', 0.5);
      burst(this, x, y, 'star_04', { count: 10, tint: 0xffe066, gravity: 60 });
    };
    this.hud.onPause = () => this.pause();
    this.input.keyboard?.on('keydown-P', () => this.pause());
    this.input.keyboard?.on('keydown-ESC', () => this.pause());
    this.createStations();
    if (this.tutorialOn) this.tutorialGuide = new TutorialGuide(this);
    this.itemsGfx = this.add.graphics().setDepth(DEPTH.items);
    this.dragGfx = this.add.graphics().setDepth(DEPTH.hand).setVisible(false);
    this.setupDrag();

    // Scene event listeners survive scene restarts, so they must be removed on shutdown
    // (otherwise "Tekrar dene" / the next day would add a duplicate listener every time).
    const onReady = (x: number, y: number) => {
      sfx(this, 'oven_ready', 0.5);
      burst(this, x, y - 10, 'star_04', { count: 8, tint: 0xb6ffd0, gravity: 40, speed: [60, 160] });
    };
    const onBurned = () => {
      this.stats.burnt++;
      sfx(this, 'burnt', 0.45);
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
    // while the first-order guide runs, the day clock and new customers wait for the player
    const tutorial = this.tutorialCustomer !== null;
    if (!tutorial) this.elapsed += dt;

    // the ovens run at half speed during the first-order guide, so the first cupcake can be read about and caught in time
    for (const oven of this.ovens) oven.update(tutorial ? dt * 0.5 : dt);

    // waves: calm start, steady middle, short rush at the end
    this.wave = this.waveAt(this.elapsed);

    // regular customers
    if (!tutorial) {
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        // when the counter is full, the next customer waits half a gap after a seat frees up (they used to
        // walk in the moment one was served, so customers seemed to come non-stop)
        const gap = this.nextGap();
        this.spawnIn = this.trySpawn() ? gap : gap * 0.5;
      }
    }

    // planned special monsters: a warning banner first, then they arrive at their moment
    for (const p of this.plan) {
      if (p.done) continue;
      // the thief gives no early warning: he shows up when a cupcake is ready (see below)
      if (!p.warned && p.id !== 'thief' && this.elapsed >= p.at - CONFIG.specialWarningSec) {
        p.warned = true;
        this.warnSpecial(p.id);
      }
      if (this.elapsed < p.at) continue;
      if (p.id === 'thief') {
        // after his moment he waits for a ready cupcake, a free seat, and no vampire at the counter
        if (this.thiefLoot().length > 0 && !this.vampireHere() && this.spawnThief()) {
          p.done = true;
          p.warned = true;
          this.warnSpecial('thief');
        }
      } else if (p.id === 'vampire' && this.thieves.length > 0) {
        // the vampire waits until the thief is gone
        continue;
      } else if (this.trySpawn(p.id)) {
        p.done = true;
        // a special monster takes the next regular customer's turn
        this.spawnIn = Math.max(this.spawnIn, this.day.waves[this.wave] * 0.6);
      }
    }

    this.customers.forEach((c, i) => {
      if (!c) return;
      c.update(dt);
      if (c.expired) {
        sfx(this, 'customer_left', 0.4);
        if (c.kind === 'ghost') {
          // the ghost is only for laughs: it floats off without counting as a lost customer
          c.leave('happy');
        } else {
          this.stats.left++;
          this.breakStreak();
          c.leave('angry');
        }
        this.customers[i] = null;
      }
    });

    if (this.tutorialCustomer) this.updateTutorial(this.tutorialCustomer);

    const left = this.day.length - this.elapsed;
    this.shop.update(this.elapsed / this.day.length);
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

    // the extra doughs / frostings / toppings (top table, right half of the pocket, top jar row) join one at a
    // time on later nights; until then they are hidden (1 = hidden, 0 = on the table)
    const open = this.day.open;
    const lock = (item: { id: string; extra: boolean }) => (item.extra && !open(item.id) ? 1 : 0);
    const anyExtra = (list: readonly { id: string; extra: boolean }[]) => list.some((x) => x.extra && open(x.id));

    // dough bowls: 3 on each table (the extra ones on the top table)
    const tables = DOUGH_TABLES.bottoms.map((bottom) => createDoughTable(this, DOUGH_TABLES.x, DOUGH_TABLES.w, bottom));
    // the top table stays completely empty (picture hidden too) until its first dough opens
    if (!anyExtra(DOUGHS)) tables[1].setVisible(false);
    DOUGHS.forEach((d, i) => {
      const spot = createDoughBowl(this, tables[Math.floor(i / 3)], i % 3, d.id, lock(d), () => this.onDough(d.id));
      this.bowls.push(spot);
    });

    // ovens and plates: only the ones the player owns are on the workbench (the rest appear once bought)
    const owned = this.day.gear.ovens;
    STATION_X.oven.forEach((x, i) => {
      if (i < owned) this.ovens.push(new OvenSlot(this, x, y, CONFIG.oven.cookSec, CONFIG.oven.burnSec, (slot) => this.onOvenDown(slot)));
    });
    PLATES.forEach((p, i) => {
      if (i < this.plates.length) createPlate(this, p.x, p.bottom, () => this.onPlate(i));
    });

    // frostings: one wide pocket with 6 bags (the new flavors' bags stay hidden until their day)
    const pocket = createFrostingPocket(this, POCKET.x, POCKET.w, POCKET.bottom);
    // until the new flavors open, the first 3 bags sit in the middle of the pocket
    const onlyFirst = !anyExtra(FROSTINGS);
    FROSTINGS.forEach((f, i) => {
      const spot = createPipingBag(this, pocket, i, f.id, lock(f), () => this.onFrosting(f.id, spot.x, spot.y), onlyFirst);
      this.bags.push(spot);
    });
    // toppings: jars in 3 columns, bottom row first
    TOPPINGS.forEach((t, i) => {
      const spot = createToppingJar(this, JARS.xs[i % 3], JARS.bottoms[Math.floor(i / 3)], JARS.h, t.id, lock(t), () => this.onTopping(t.id, spot.x, spot.y));
      this.jars.push(spot);
    });

    // tray (above the ovens) and trash can
    createTray(this, STATION_X.tray, ty, (i) => this.onTray(i));
    this.trashFlap = createTrash(this, TRASH.x, TRASH.y, TRASH.h, () => this.onTrash());

    // the security guard stands behind the counter, at its left end
    if (this.day.gear.guard) {
      this.guard = new MonsterView(this, GUARD.x, GUARD.y, GUARD_MONSTER);
      this.guard.root.setDepth(DEPTH.monster).setScale(GUARD.scale);
    }
  }

  /** Clock text (time left, like the HUD shows it) at `t` seconds into the night. */
  private clockAt(t: number): string {
    const s = Math.max(0, Math.round(this.day.length - t));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /** The night's intro card: name, goal, the wave rhythm, and what is new tonight (one new thing at most). */
  private showIntro(): void {
    const cx = W / 2;
    const isLeague = this.mode === 'league';
    const night = CONFIG.nights[gameState.day];
    type Row = { kind: 'monster'; id: SpecialId } | { kind: 'flavors'; ids: string[] } | { kind: 'text'; text: string; color: string };
    const rows: Row[] = [];

    if (isLeague) {
      rows.push({ kind: 'text', text: T.leagueRules, color: '#ffffff' });
      rows.push({ kind: 'text', text: T.leagueScoreRule, color: '#ffe08a' });
    } else {
      // special monsters seen for the first time, with the moment they come (so the player can get ready)
      const ids = [...new Set(this.day.specials.map((s) => s.id))];
      for (const id of ids) {
        if (gameState.seenCards.includes(id)) continue;
        gameState.seenCards.push(id);
        rows.push({ kind: 'monster', id });
      }
      // flavors that join tonight (once)
      const fresh = night.newIngredients.filter((id) => !gameState.seenCards.includes(`flavor-${id}`));
      fresh.forEach((id) => gameState.seenCards.push(`flavor-${id}`));
      if (fresh.length > 0) rows.push({ kind: 'flavors', ids: fresh });
    }

    const rowH = 124;
    const panelW = 720;
    const panelH = 236 + rows.length * rowH;
    const fit = Math.min(1, (H - 150) / panelH);
    const shownH = panelH * fit;
    const cy = (H - shownH - 100) / 2 + shownH / 2 + 8;
    const cover = this.add.rectangle(cx, H / 2, W, H, 0x0a0618, 0.72).setDepth(DEPTH.overlay).setInteractive();
    const panel = this.add.container(cx, cy).setDepth(DEPTH.overlay + 1);
    const g = this.add.graphics();
    drawPanel(g, panelW, panelH);
    panel.add(g);

    const top = -panelH / 2;
    const title = isLeague ? CONFIG.league.name : T.nightTitle(gameState.day + 1, night.name);
    panel.add(
      this.add
        .text(0, top + 50, title, { fontFamily: FONT, fontSize: '44px', color: '#ffb4d9', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 7 })
        .setOrigin(0.5),
    );
    const sub = isLeague
      ? T.leagueIntro(this.seed, league.bySeed[String(this.seed)] ?? 0)
      : `${T.goal(this.day.goal)}   ·   ${this.clockAt(0)}`;
    panel.add(this.add.text(0, top + 110, sub, { fontFamily: FONT, fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    panel.add(
      this.add
        .text(0, top + 158, T.waveInfo(this.day.waves), { fontFamily: FONT, fontSize: '20px', color: '#c9bdf0', fontStyle: 'bold', align: 'center', wordWrap: { width: panelW - 80 } })
        .setOrigin(0.5),
    );

    rows.forEach((row, i) => {
      const rowY = top + 214 + i * rowH + rowH / 2 - 10;
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0x000000, 0.2);
      rowBg.fillRoundedRect(-panelW / 2 + 24, rowY - rowH / 2 + 8, panelW - 48, rowH - 16, 18);
      panel.add(rowBg);
      const textStyle = { fontFamily: FONT, fontSize: '21px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: panelW - 250 } };

      if (row.kind === 'text') {
        panel.add(this.add.text(0, rowY, row.text, { ...textStyle, color: row.color, align: 'center', wordWrap: { width: panelW - 90 } }).setOrigin(0.5));
        return;
      }
      if (row.kind === 'monster') {
        const id = row.id;
        if (id === 'thief') {
          // the thief is the team's picture, not a code-drawn figure
          panel.add(this.add.image(-panelW / 2 + 110, rowY - 4, THIEF_KEYS.stand).setScale(0.2));
        } else {
          const view = new MonsterView(this, 0, 0, SPECIAL_MONSTERS[id]);
          panel.add(view.root);
          view.root.setPosition(-panelW / 2 + 110, rowY - 14).setScale(0.5);
        }
        const times = this.day.specials.filter((s) => s.id === id).map((s) => this.clockAt(s.at));
        // the thief has no fixed time (he comes when a cupcake is ready), so his card says how often instead
        const when = id === 'thief' ? T.thiefComes(times.length) : T.arrivesAt(times);
        panel.add(this.add.text(-panelW / 2 + 190, rowY, `${MONSTER_CARDS[id].text} ${when}`, textStyle).setOrigin(0, 0.5));
        return;
      }
      // new flavors: a little cupcake for each, showing the new ingredient
      const icons = this.add.graphics();
      row.ids.forEach((id, j) => {
        const grp = ingredientGroup(id);
        const c: CupcakeData =
          grp === 'dough'
            ? { dough: id as DoughId, bake: 'ready', tone: 0.2 }
            : grp === 'frosting'
              ? { dough: 'vanilla', bake: 'ready', tone: 0.2, frosting: id as FrostingId }
              : { dough: 'chocolate', bake: 'ready', tone: 0.2, frosting: 'pink', topping: id as ToppingId };
        drawCupcake(icons, -panelW / 2 + 110 + (j - (row.ids.length - 1) / 2) * 40, rowY + 14, c, 0.7);
      });
      panel.add(icons);
      panel.add(this.add.text(-panelW / 2 + 190, rowY, T.newFlavor(row.ids.map(ingredientName)), { ...textStyle, color: '#ffe08a' }).setOrigin(0, 0.5));
    });

    panel.setScale(0.85 * fit).setAlpha(0);
    this.tweens.add({ targets: panel, scale: fit, alpha: 1, duration: 320, ease: 'Back.easeOut' });

    const btn = makeButton(
      this,
      cx,
      cy + shownH / 2 + 56,
      300,
      70,
      isLeague ? T.startRace : T.startDay,
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

  /** A planned special monster is coming: a short tick sound (no text on screen while playing). */
  private warnSpecial(_id: SpecialId): void {
    sfx(this, 'tick', 0.5, 0.7);
  }

  /** A correct cupcake: the streak grows (shown in the night summary). */
  private addStreak(): void {
    this.streak++;
    this.stats.bestStreak = Math.max(this.stats.bestStreak, this.streak);
  }

  /** A wrong cupcake or a lost customer ends the streak. */
  private breakStreak(): void {
    this.streak = 0;
  }

  /** Freeze the day (patience, ovens, timers, animations) and open the pause menu on top. */
  private pause(): void {
    if (this.phase !== 'playing' || this.scene.isPaused()) return;
    sfx(this, 'ui_click', 0.4);
    // drop whatever is being dragged back where it was
    this.drag = null;
    this.ovens.forEach((o) => (o.held = false));
    this.dragGfx.setVisible(false);
    this.refreshItems();
    this.scene.pause();
    this.scene.launch('Pause');
  }

  // ---------------------------------------------------------------- drag and drop

  /**
   * A cupcake can be dragged from a plate, the tray or an oven (once baked) and dropped on a customer, a free
   * tray slot, a free plate or the trash can. A short press without moving is still a normal click
   * (an oven cake then goes to a free plate).
   */
  private setupDrag(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.blocked()) return;
      const loc = this.cupcakeAt(p.worldX, p.worldY);
      const item = loc ? this.peek(loc) : null;
      if (loc && item) this.drag = { loc, item, x: p.worldX, y: p.worldY, moving: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || !p.isDown) return;
      if (!d.moving && Phaser.Math.Distance.Between(d.x, d.y, p.worldX, p.worldY) < 10) return;
      if (!d.moving) {
        d.moving = true;
        this.dragGfx.clear();
        drawCupcake(this.dragGfx, 0, 0, d.item, 1.1);
        this.dragGfx.setVisible(true);
        if (d.loc.kind === 'oven') this.ovens[d.loc.i].held = true;
        this.refreshItems();
      }
      this.dragGfx.setPosition(p.worldX, p.worldY + 20);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      this.drag = null;
      this.dragGfx.setVisible(false);
      if (!d) return;
      if (!d.moving) {
        // a plain click on a baked oven cake: move it to a free plate
        if (d.loc.kind === 'oven') this.onOven(this.ovens[d.loc.i]);
        return;
      }
      if (d.loc.kind === 'oven') this.ovens[d.loc.i].held = false;
      this.refreshItems();
      if (this.blocked() || this.peek(d.loc) !== d.item) return;
      this.dropAt(d.loc, p.worldX, p.worldY);
    });
  }

  /** The plate under a point, if any (-1 = none). */
  private plateAt(x: number, y: number): number {
    return this.plates.findIndex((_c, i) => Math.abs(x - PLATES[i].x) < 66 && y > PLATES[i].bottom - 110 && y < PLATES[i].bottom + 4);
  }

  /** The plate, tray or (baked) oven cupcake under a point, if any. */
  private cupcakeAt(x: number, y: number): Loc | null {
    const oven = this.ovens.findIndex((o) => o.cupcake && o.cupcake.bake !== 'raw' && Math.abs(x - o.x) < 55 && Math.abs(y - o.y) < 80);
    if (oven >= 0) return { kind: 'oven', i: oven };
    const p = this.plateAt(x, y);
    if (p >= 0 && this.plates[p]) return { kind: 'plate', i: p };
    for (let i = 0; i < this.tray.length; i++) {
      if (this.tray[i] && Math.abs(x - STATION_X.tray[i]) < 50 && Math.abs(y - LAYOUT.trayY) < 48) return { kind: 'tray', i };
    }
    return null;
  }

  /** Drop a dragged cupcake: serve a customer, put it on a free tray slot or plate, or throw it away. */
  private dropAt(loc: Loc, x: number, y: number): void {
    const customer = this.customers.find((c) => c && Math.abs(x - c.x) < 110 && y < LAYOUT.counterTop + 30);
    if (customer && loc.kind === 'oven') {
      // straight from the oven it is never finished
      const burnt = this.peek(loc)?.bake === 'burnt';
      this.hint(burnt ? T.burntNoServe : T.notFinished, customer.x, customer.y - 10);
      return;
    }
    if (customer) {
      this.select(loc);
      this.onCustomer(customer);
      return;
    }
    const slot = STATION_X.tray.findIndex((tx, i) => !this.tray[i] && Math.abs(x - tx) < 60 && Math.abs(y - LAYOUT.trayY) < 60);
    if (slot >= 0) {
      this.putOnTray(loc, slot);
      return;
    }
    if (Math.abs(x - TRASH.x) < 45 && Math.abs(y - TRASH.y) < 50) {
      this.select(loc);
      this.onTrash();
      return;
    }
    const plate = this.plateAt(x, y);
    if (plate >= 0 && !this.plates[plate]) this.moveToPlate(loc, plate);
  }

  // ---------------------------------------------------------------- selection and drawing

  private peek(loc: Loc): CupcakeData | null {
    if (loc.kind === 'plate') return this.plates[loc.i];
    if (loc.kind === 'tray') return this.tray[loc.i];
    return this.ovens[loc.i]?.cupcake ?? null;
  }

  /** Take the cupcake out of its place and return it. */
  private removeFrom(loc: Loc): CupcakeData | null {
    if (loc.kind === 'plate') {
      const c = this.plates[loc.i];
      this.plates[loc.i] = null;
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
    if (loc.kind === 'plate') return { x: PLATES[loc.i].x, y: PLATES[loc.i].bottom - ON_PLATE - 24 };
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
    return !!s && s.kind === loc.kind && s.i === loc.i;
  }

  /** Redraw the cupcakes on the plates and on the ready tray; the selected one is lifted up a little. */
  private refreshItems(): void {
    const g = this.itemsGfx;
    g.clear();
    const LIFT = 10;
    const dragged = this.drag?.moving ? this.drag.loc : null;
    this.plates.forEach((c, i) => {
      if (!c || (dragged?.kind === 'plate' && dragged.i === i)) return;
      const lift = this.isSelected({ kind: 'plate', i }) ? LIFT : 0;
      drawCupcake(g, PLATES[i].x, PLATES[i].bottom - ON_PLATE - lift, c, 1.1);
    });
    this.tray.forEach((c, i) => {
      if (!c || (dragged?.kind === 'tray' && dragged.i === i)) return;
      const lift = this.isSelected({ kind: 'tray', i }) ? LIFT : 0;
      drawCupcake(g, STATION_X.tray[i], LAYOUT.trayY + 8 - lift, c, 1.0);
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
      this.hint(T.ovenFull, STATION_X.oven[0] + 60, LAYOUT.stationY - 100);
      return;
    }
    sfx(this, 'bake_start', 0.5);
    slot.start(id);
    this.tutorialStarted = true;
  }

  /** Mouse down on an oven: a baked cake waits for the release (click = to a plate, drag = anywhere). */
  private onOvenDown(slot: OvenSlot): void {
    if (slot.cupcake && slot.cupcake.bake !== 'raw') return;
    this.onOven(slot);
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
    const free = this.plates.indexOf(null);
    if (free < 0) {
      // every plate is busy: a burnt cupcake can still be selected so the trash can takes it
      if (c.bake === 'burnt') {
        this.select({ kind: 'oven', i: index });
        this.hint(T.burntSelected, slot.x, slot.y - 96);
      } else {
        // a baked cake can wait on the tray: select it so a click on a free tray slot takes it
        this.select({ kind: 'oven', i: index });
        this.hint(T.plateFullTray, slot.x, slot.y - 96);
      }
      return;
    }
    sfx(this, 'pickup', 0.5);
    this.plates[free] = slot.take();
    this.select({ kind: 'plate', i: free });
  }

  private onPlate(i: number): void {
    if (this.blocked()) return;
    if (this.plates[i]) {
      sfx(this, 'pickup', 0.35);
      this.select({ kind: 'plate', i });
      return;
    }
    // an empty plate: the selected cupcake moves onto it
    if (this.selected) this.moveToPlate(this.selected, i);
  }

  /** Move a cupcake (plate, tray or baked oven one) onto an empty plate (it stays selected). */
  private moveToPlate(from: Loc, i: number): void {
    const c = this.peek(from);
    if (this.plates[i] || !c || c.bake === 'raw') return;
    this.plates[i] = this.removeFrom(from);
    sfx(this, 'place', 0.45);
    this.select({ kind: 'plate', i });
  }

  /**
   * The plate the next frosting / topping goes on: the selected plate, otherwise the first plate whose
   * cupcake still needs that step (otherwise any cupcake, so the hint explains why it does not fit).
   */
  private workPlate(needs: (c: CupcakeData) => boolean): number {
    if (this.selected?.kind === 'plate' && this.plates[this.selected.i]) return this.selected.i;
    const i = this.plates.findIndex((c) => c && c.bake !== 'burnt' && needs(c));
    return i >= 0 ? i : this.plates.findIndex((c) => c);
  }

  private onFrosting(id: FrostingId, bx: number, by: number): void {
    if (this.blocked()) return;
    const i = this.workPlate((c) => !c.frosting);
    const c = i >= 0 ? this.plates[i] : null;
    if (!c) return this.hint(T.plateEmpty, bx, by - 96);
    if (c.bake === 'burnt') return this.hint(T.burntNoDecorate, bx, by - 96);
    if (c.frosting) return this.hint(T.alreadyFrosted, bx, by - 96);
    c.frosting = id;
    sfx(this, 'place', 0.45);
    burst(this, PLATES[i].x, PLATES[i].bottom - ON_PLATE - 20, 'circle_05', { count: 7, tint: frostingInfo(id).color, gravity: 260, speed: [40, 120], scale: [0.18, 0.04], additive: false });
    this.refreshItems();
  }

  private onTopping(id: ToppingId, bx: number, by: number): void {
    if (this.blocked()) return;
    const i = this.workPlate((c) => !!c.frosting && !c.topping);
    const c = i >= 0 ? this.plates[i] : null;
    if (!c) return this.hint(T.plateEmpty, bx, by - 96);
    if (c.bake === 'burnt') return this.hint(T.burntNoDecorate, bx, by - 96);
    if (!c.frosting) return this.hint(T.frostingFirst, bx, by - 96);
    if (c.topping) return this.hint(T.alreadyTopped, bx, by - 96);
    c.topping = id;
    sfx(this, 'place', 0.45, 1.25);
    burst(this, PLATES[i].x, PLATES[i].bottom - ON_PLATE - 36, 'spark_05', { count: 8, tint: 0xfff0a8, gravity: 120, speed: [50, 140], scale: [0.2, 0.04] });
    this.refreshItems();
  }

  /** The selected plate if its cupcake is finished, otherwise the first plate with a finished one (-1 = none). */
  private finishedPlate(prefer?: (c: CupcakeData) => boolean): number {
    const s = this.selected;
    if (s?.kind === 'plate') {
      const c = this.plates[s.i];
      return c && isFinished(c) ? s.i : -1;
    }
    const ok = (c: CupcakeData | null): c is CupcakeData => !!c && c.bake !== 'burnt' && isFinished(c);
    const best = prefer ? this.plates.findIndex((c) => ok(c) && prefer(c)) : -1;
    return best >= 0 ? best : this.plates.findIndex(ok);
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
    // an empty slot: the selected cake goes there (plain ones too); otherwise the first finished plate cupcake
    if (this.selected && this.peek(this.selected)) return this.putOnTray(this.selected, i);
    const p = this.finishedPlate();
    if (p >= 0) return this.putOnTray({ kind: 'plate', i: p }, i);
    this.hint(T.trayNeedsFinished, x, LAYOUT.trayY - 70);
  }

  /** Park a cake on a free tray slot to wait (finished or not; burnt ones only go to the trash). */
  private putOnTray(from: Loc, slot: number): void {
    const c = this.peek(from);
    if (!c || this.tray[slot]) return;
    if (c.bake === 'burnt') return this.hint(T.burntNoTray, STATION_X.tray[slot], LAYOUT.trayY - 70);
    if (c.bake === 'raw') return;
    this.tray[slot] = this.removeFrom(from);
    sfx(this, 'place', 0.45);
    this.select(null);
  }

  private onTrash(): void {
    if (this.blocked()) return;
    // nothing selected: with a single cupcake on the plates, that one goes
    const full = this.plates.flatMap((c, i) => (c ? [i] : []));
    const loc: Loc | null = this.selected ?? (full.length === 1 ? { kind: 'plate', i: full[0] } : null);
    if (!loc || !this.peek(loc)) return this.hint(T.nothingToTrash, TRASH.x - 60, TRASH.y - 50);
    this.removeFrom(loc);
    this.select(null);
    sfx(this, 'trash', 0.5);
    this.trashFlap();
    burst(this, TRASH.x, TRASH.y - 20, 'smoke_05', { count: 5, tint: 0x9aa0b4, gravity: -30, speed: [20, 70], scale: [0.2, 0.5], additive: false });
  }

  private onCustomer(c: Customer): void {
    if (this.blocked()) return;
    // the selected cupcake wins; otherwise a finished plate cupcake (one that matches the order first)
    let loc: Loc | null = null;
    if (this.selected && this.selected.kind !== 'oven') loc = this.selected;
    else {
      const p = this.finishedPlate((item) => matchesOrder(item, c.order));
      const any = this.plates.findIndex((item) => item);
      if (p >= 0) loc = { kind: 'plate', i: p };
      else if (any >= 0) loc = { kind: 'plate', i: any };
    }
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
      if (c.mood === 'happy') this.stats.happy++;
      this.addStreak();
      this.customers[c.slot] = null;
      c.lock();
      if (c.kind === 'ghost') this.serveGhost(c, item, pay, tip);
      else this.serveHappy(c, item, from, pay, tip);
    } else {
      // wrong cupcake: it vanishes and the customer loses 20% of their patience (no money penalty)
      this.stats.wrong++;
      this.breakStreak();
      sfx(this, 'serve_wrong', 0.5);
      this.flyCupcake(item, from, { x: c.x, y: c.y - 10 }, 240, () =>
        burst(this, c.x, c.y - 20, 'smoke_05', { count: 7, tint: 0xff4d6d, gravity: -40, speed: [30, 110], scale: [0.25, 0.6], additive: false }),
      );
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

  // ---------------------------------------------------------------- first-order guide (Day 1, once)

  /** Run the guide for the tutorial customer; it ends as soon as that customer is served (or gone). */
  private updateTutorial(tc: Customer): void {
    if (!this.customers.includes(tc)) {
      this.tutorialGuide?.hide();
      this.tutorialCustomer = null;
      this.tutorialOn = false;
      if (!gameState.seenCards.includes('tutorial')) gameState.seenCards.push('tutorial');
      // the next customer comes soon after the lesson
      this.spawnIn = Math.min(this.spawnIn, 4);
      if (this.stats.served > 0) floatText(this, W / 2, 330, T.tutorialDone, '#7dffb0', 30);
      return;
    }
    this.tutorialGuide?.show(this.tutorialStep(tc));
  }

  /** A glowing outline around the open (first three) items of a group of stations. */
  private groupBox(spots: Spot[], padX: number): TutorialBox {
    const open = spots.slice(0, 3);
    const x0 = Math.max(4, Math.min(...open.map((s) => s.x)) - padX);
    const x1 = Math.min(W - 4, Math.max(...open.map((s) => s.x)) + padX);
    const y0 = Math.min(...open.map((s) => s.y)) - 70;
    const y1 = Math.min(H - 4, Math.max(...open.map((s) => s.y)) + 62);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** What the player should do next for the tutorial customer's order, worked out from what is on the table. */
  private tutorialStep(tc: Customer): TutorialStep {
    const o = tc.order;
    const bowl = this.bowls[DOUGHS.findIndex((d) => d.id === o.dough)];
    const bag = this.bags[FROSTINGS.findIndex((f) => f.id === o.frosting)];
    const jar = this.jars[TOPPINGS.findIndex((t) => t.id === o.topping)];
    const trash = (text: string): TutorialPointer => ({ tx: TRASH.x, ty: TRASH.y - 48, text });

    // a cupcake is already on a plate or the tray
    const item = this.plates.find((p) => p) ?? this.tray.find((p) => p) ?? null;
    if (item) {
      if (item.bake === 'burnt') return { key: 'burnt-plate', pointers: [trash(T.tutBurntPlate)] };
      const wrong = item.dough !== o.dough || (!!item.frosting && item.frosting !== o.frosting) || (!!item.topping && item.topping !== o.topping);
      if (wrong) return { key: 'wrong', pointers: [trash(T.tutWrong)] };
      if (!item.frosting) {
        return {
          key: 'frosting',
          pointers: [{ tx: bag.x, ty: bag.y - 64, text: T.tutFrosting(frostingInfo(o.frosting).name) }],
          boxes: [this.groupBox(this.bags, 50)],
        };
      }
      if (!item.topping) {
        return {
          key: 'topping',
          pointers: [{ tx: jar.x, ty: jar.y - 64, text: T.tutTopping(toppingInfo(o.topping).name) }],
          boxes: [this.groupBox(this.jars, 42)],
        };
      }
      return { key: 'serve', pointers: [{ tx: tc.x, ty: tc.y - 92, text: T.tutServe }] };
    }

    // something is in the oven
    const oven = this.ovens.find((ov) => ov.cupcake);
    if (oven?.cupcake) {
      const here = (text: string): TutorialPointer => ({ tx: oven.x, ty: oven.y - 84, text });
      if (oven.cupcake.bake === 'burnt') return { key: 'burnt-oven', pointers: [here(T.tutBurntOven), trash(T.tutTrashAfter)] };
      if (oven.cupcake.bake === 'raw') return { key: 'bake', pointers: [here(T.tutBake), trash(T.tutTrashInfo)] };
      return { key: 'ready', pointers: [here(T.tutReady)] };
    }

    // nothing yet: read the order, then pick the dough
    const dough: TutorialPointer = { tx: bowl.x, ty: bowl.y - 56, text: T.tutDough(doughInfo(o.dough).name) };
    const boxes = [this.groupBox(this.bowls, 60)];
    if (!this.tutorialStarted) {
      return { key: 'order', pointers: [{ tx: tc.x + LAYOUT.bubbleDX, ty: LAYOUT.bubbleY - 62, text: T.tutOrder }, dough], boxes };
    }
    return { key: 'dough', pointers: [dough], boxes };
  }

  /** Seat a new customer. `special` forces a special monster (for the daily guarantee). */
  private trySpawn(special?: SpecialId): boolean {
    const free = this.customers.flatMap((c, i) => (c || i === this.thiefSeat ? [] : [i]));
    if (free.length === 0 || this.customers.length - free.length >= this.day.seats) return false;

    // special monsters only come at their planned moments (no surprise extras), so every night can be learned
    const kind: SpecialId | undefined = special;
    // seeded: in the league every player gets the same customers, orders and seats in the same order
    const def = kind ? pickSpecial(kind, this.rand.customers) : pickNormal(this.rand.customers);
    const slot = pick(this.rand.seats, free);
    sfx(this, 'customer_arrive', 0.35);
    const customer = new Customer(this, slot, LAYOUT.customerSlotsX[slot], def, this.day.patience, randomOrder(this.day.open, this.rand.orders), (cust) => this.onCustomer(cust));
    this.customers[slot] = customer;
    // the very first regular customer of the very first day is the one the guide follows
    if (this.tutorialOn && !this.tutorialCustomer && !kind) {
      this.tutorialCustomer = customer;
      customer.frozen = true;
    }
    if (def.kind === 'vampire') this.time.delayedCall(700, () => this.vampireArrives(customer));
    return true;
  }

  /** The vampire bites the player on arrival, unless garlic is on the counter. */
  private vampireArrives(c: Customer): void {
    if (this.phase !== 'playing') return;
    if (this.day.gear.garlic) {
      c.disgust();
      sfx(this, 'nope', 0.4);
      return;
    }
    this.bite();
  }

  /** Red screen, "BITTEN!", and no clicking for a moment (CONFIG.biteSec). The ovens keep running. */
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
  /** Is a vampire at the counter right now? (The thief and the vampire never come at the same time.) */
  private vampireHere(): boolean {
    return this.customers.some((c) => c?.kind === 'vampire');
  }

  /** The thief comes to a free seat at the counter (kept free for him until he leaves). False if none is free. */
  /** What the thief can take: cakes on the ready tray (finished ones first), then finished cupcakes on the plates. */
  private thiefLoot(): { c: CupcakeData; loc: Loc }[] {
    const tray = this.tray.flatMap((c, i) => (c && c.bake !== 'burnt' ? [{ c, loc: { kind: 'tray', i } as Loc }] : []));
    tray.sort((a, b) => Number(isFinished(b.c)) - Number(isFinished(a.c)));
    const plates = this.plates.flatMap((c, i) => (c && c.bake !== 'burnt' && isFinished(c) ? [{ c, loc: { kind: 'plate', i } as Loc }] : []));
    return [...tray, ...plates];
  }

  private spawnThief(): boolean {
    const free = this.customers.flatMap((c, i) => (c || i === this.thiefSeat ? [] : [i]));
    if (free.length === 0) return false;
    const seat = pick(this.rand.seats, free);
    this.thiefSeat = seat;
    const thief = new Thief(this);
    this.thieves.push(thief);
    sfx(this, 'customer_arrive', 0.3, 1.5);
    thief.run(
      LAYOUT.customerSlotsX[seat],
      (): ThiefOutcome => {
        if (this.day.gear.guard) {
          this.earned += CONFIG.guardBonus;
          this.stats.caught++;
          this.guard?.hop(22, 160);
          burst(this, thief.x, thief.y - 30, 'star_01', { count: 10, tint: 0xffe066, gravity: 140 });
          coinFlight(this, { x: thief.x, y: thief.y }, this.shop.jarPos, 3, () => sfx(this, 'coin', 0.22));
          sfx(this, 'serve_ok', 0.5);
          return 'caught';
        }
        // at most one ready cupcake; if it was served in the meantime he waits for the next one
        const loot = this.thiefLoot().slice(0, CONFIG.thiefSteals);
        if (loot.length === 0) return 'wait';
        for (const { c, loc } of loot) {
          this.flyCupcake(c, this.locPos(loc), { x: thief.x, y: thief.y - 20 }, 320);
          this.removeFrom(loc);
        }
        this.time.delayedCall(320, () => thief.holdCupcake(loot[0].c));
        if (this.selected && loot.some(({ loc }) => loc.kind === this.selected?.kind && loc.i === this.selected?.i)) this.select(null);
        else this.refreshItems();
        this.stats.stolen += loot.length;
        sfx(this, 'nope', 0.5, 0.7);
        return 'steal';
      },
      () => {
        this.thieves = this.thieves.filter((t) => t !== thief);
        if (this.thiefSeat === seat) this.thiefSeat = null;
      },
    );
    return true;
  }

  // ---------------------------------------------------------------- end of day

  /** End the day: when time runs out, or early when all 3 stars are earned (then `title` says so). */
  private endDay(title: string = T.dayOver): void {
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
    this.thiefSeat = null;
    sfx(this, 'win', 0.4);
    const t = this.add
      .text(W / 2, H / 2 - 30, title, { fontFamily: FONT, fontSize: '92px', color: '#ffffff', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 12 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay)
      .setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 450, ease: 'Back.easeOut' });
    const end: NightEnd = { mode: this.mode, seed: this.seed, earned: this.earned, stats: this.stats };
    this.time.delayedCall(1500, () => fadeOutThen(this, () => this.scene.start('Summary', end)));
  }
}
