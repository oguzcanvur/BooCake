import Phaser from 'phaser';
import { COLORS, FONT, H, MONSTER_COLORS, W } from '../config';
import { FROSTINGS, TOPPINGS } from '../data/recipes';
import { NIGHTS, type NightConfig } from '../data/nights';
import { gameState } from '../systems/GameState';
import { drawCupcake, drawTopping, type CupcakeData } from '../objects/cupcake';
import { OvenSlot } from '../objects/OvenSlot';
import { Customer } from '../objects/Customer';
import { makeButton } from '../ui/button';

type Phase = 'intro' | 'playing' | 'ended';

const SLOT_X = [200, 480, 760];
const SLOT_Y = 205;
const STATION_Y = 480;
const OVEN_X = [105, 235];
const FROSTING_X = 380;
const TOPPING_X = 650;
const BUTTON_GAP = 80;
const TRASH_X = 905;

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
  private hand: CupcakeData | null = null;
  private customers: (Customer | null)[] = [];
  private ovens: OvenSlot[] = [];
  private stats: NightStats = { served: 0, wrong: 0, left: 0, burnt: 0 };

  private handGfx!: Phaser.GameObjects.Graphics;
  private clockText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private barGfx!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Night');
  }

  init(): void {
    this.cfg = NIGHTS[gameState.night];
    this.phase = 'intro';
    this.elapsed = 0;
    this.money = 0;
    this.spawnIn = 1;
    this.hand = null;
    this.customers = SLOT_X.map(() => null);
    this.ovens = [];
    this.stats = { served: 0, wrong: 0, left: 0, burnt: 0 };
  }

  create(): void {
    this.drawBackground();
    this.createHud();
    this.createStations();

    this.handGfx = this.add.graphics().setDepth(100);

    // Scene event listeners survive scene restarts, so they must be removed on shutdown
    // (otherwise "Try again" / "Next night" would add a duplicate listener every time).
    const onReady = (x: number, y: number) => this.float(x, y - 80, 'Ready!', '#7dffb0');
    const onBurned = (x: number, y: number) => {
      this.stats.burnt++;
      this.float(x, y - 80, 'Burnt!', '#ff6b6b');
      this.cameras.main.shake(120, 0.003);
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
        this.float(c.x, c.y - 10, 'Left without paying!', '#ff6b6b');
        c.leave(this);
        this.customers[i] = null;
      }
    });

    this.updateHud();
    if (this.elapsed >= this.cfg.durationSec) this.endNight();
  }

  // ---------------------------------------------------------------- setup

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.wall, 1);
    g.fillRect(0, 0, W, 300);
    // simple decorations: candles (gray-box)
    for (const cx of [60, 900]) {
      g.fillStyle(0xf1e3c6, 1);
      g.fillRect(cx - 6, 110, 12, 40);
      g.fillStyle(0xffb703, 1);
      g.fillCircle(cx, 102, 7);
    }
    g.fillStyle(COLORS.counterTop, 1);
    g.fillRect(0, 300, W, 14);
    g.fillStyle(COLORS.counter, 1);
    g.fillRect(0, 314, W, 28);
    g.fillStyle(COLORS.floor, 1);
    g.fillRect(0, 342, W, H - 342);
  }

  private createHud(): void {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(COLORS.bg, 1);
    g.fillRect(0, 0, W, 50);

    const style = { fontFamily: FONT, color: '#ffffff', fontStyle: 'bold' };
    this.clockText = this.add.text(20, 25, '18:00', { ...style, fontSize: '24px' }).setOrigin(0, 0.5).setDepth(11);
    this.moneyText = this.add.text(300, 25, '', { ...style, fontSize: '22px' }).setOrigin(0.5).setDepth(11);
    this.add
      .text(W - 20, 25, this.cfg.name, { ...style, fontSize: '22px' })
      .setOrigin(1, 0.5)
      .setDepth(11);
    this.barGfx = this.add.graphics().setDepth(11);
    this.updateHud();
  }

  private createStations(): void {
    const label = (x: number, text: string) =>
      this.add
        .text(x, STATION_Y - 84, text, { fontFamily: FONT, fontSize: '14px', color: '#b9a8e8', fontStyle: 'bold' })
        .setOrigin(0.5);

    label((OVEN_X[0] + OVEN_X[1]) / 2, 'OVEN');
    this.ovens = OVEN_X.map(
      (x) => new OvenSlot(this, x, STATION_Y, this.cfg.bakeSec, this.cfg.burnSec, (slot) => this.onOvenClick(slot)),
    );

    label(FROSTING_X + BUTTON_GAP * ((this.cfg.frostingCount - 1) / 2), 'FROSTING');
    FROSTINGS.slice(0, this.cfg.frostingCount).forEach((f, i) => {
      const x = FROSTING_X + i * BUTTON_GAP;
      this.stationButton(x, f.name, (g) => {
        g.fillStyle(f.color, 1);
        g.fillCircle(x, STATION_Y - 8, 18);
        g.fillCircle(x, STATION_Y - 22, 11);
      }, () => this.onFrostingClick(f.id));
    });

    label(TOPPING_X + BUTTON_GAP * ((this.cfg.toppingCount - 1) / 2), 'TOPPING');
    TOPPINGS.slice(0, this.cfg.toppingCount).forEach((t, i) => {
      const x = TOPPING_X + i * BUTTON_GAP;
      this.stationButton(x, t.name, (g) => drawTopping(g, x, STATION_Y - 14, t.id, 1.4), () => this.onToppingClick(t.id));
    });

    label(TRASH_X, 'TRASH');
    this.stationButton(TRASH_X, 'Throw away', (g) => {
      g.fillStyle(0x9aa0a6, 1);
      g.fillRect(TRASH_X - 14, STATION_Y - 28, 28, 34);
      g.fillStyle(0x6c7177, 1);
      g.fillRect(TRASH_X - 18, STATION_Y - 34, 36, 6);
    }, () => this.onTrashClick());

    this.add
      .text(W / 2, H - 22, 'Click oven to bake  >  click READY cupcake  >  frosting  >  topping  >  click the customer', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#8e7fc0',
      })
      .setOrigin(0.5);
  }

  private stationButton(
    x: number,
    name: string,
    drawIcon: (g: Phaser.GameObjects.Graphics) => void,
    onClick: () => void,
  ): void {
    const bg = this.add
      .rectangle(x, STATION_Y, 70, 92, COLORS.panel)
      .setStrokeStyle(2, COLORS.panelEdge)
      .setInteractive({ useHandCursor: true });
    const icon = this.add.graphics();
    drawIcon(icon);
    this.add
      .text(x, STATION_Y + 34, name, { fontFamily: FONT, fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5);
    bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffffff));
    bg.on('pointerout', () => bg.setStrokeStyle(2, COLORS.panelEdge));
    bg.on('pointerdown', onClick);
  }

  private showIntro(): void {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const cover = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(200).setInteractive();
    parts.push(cover);
    parts.push(
      this.add
        .text(
          W / 2,
          230,
          `${this.cfg.name}\n\nGoal: $${this.cfg.goal} by midnight\n${this.cfg.newThing}`,
          { fontFamily: FONT, fontSize: '30px', color: '#ffffff', align: 'center', fontStyle: 'bold', lineSpacing: 8 },
        )
        .setOrigin(0.5)
        .setDepth(201),
    );
    const btn = makeButton(
      this,
      W / 2,
      400,
      220,
      64,
      'Open the shop',
      () => {
        parts.forEach((p) => p.destroy());
        btn.destroy();
        this.phase = 'playing';
      },
      0x7e57c2,
      202,
    );
  }

  // ---------------------------------------------------------------- player actions

  private setHand(c: CupcakeData | null): void {
    this.hand = c;
    this.handGfx.clear();
    if (c) drawCupcake(this.handGfx, 0, -18, c, 1);
  }

  private onOvenClick(slot: OvenSlot): void {
    if (this.phase !== 'playing') return;
    if (!slot.cupcake) {
      slot.start();
      return;
    }
    if (slot.cupcake.bake === 'raw') {
      this.float(slot.x, slot.y - 80, 'Still baking...', '#ffd166');
      return;
    }
    if (this.hand) {
      this.float(slot.x, slot.y - 80, 'Hands full!', '#ffd166');
      return;
    }
    this.setHand(slot.take());
  }

  private onFrostingClick(id: (typeof FROSTINGS)[number]['id']): void {
    if (this.phase !== 'playing') return;
    const h = this.hand;
    if (!h) return this.hint('Pick up a baked cupcake first');
    if (h.bake === 'burnt') return this.hint('It is burnt! Throw it away');
    if (h.frosting) return this.hint('Already has frosting');
    h.frosting = id;
    this.setHand(h);
  }

  private onToppingClick(id: (typeof TOPPINGS)[number]['id']): void {
    if (this.phase !== 'playing') return;
    const h = this.hand;
    if (!h) return this.hint('Pick up a baked cupcake first');
    if (h.bake === 'burnt') return this.hint('It is burnt! Throw it away');
    if (!h.frosting) return this.hint('Frosting first!');
    if (h.topping) return this.hint('Already has a topping');
    h.topping = id;
    this.setHand(h);
  }

  private onTrashClick(): void {
    if (this.phase !== 'playing' || !this.hand) return;
    this.setHand(null);
    this.float(TRASH_X, STATION_Y - 70, 'Trashed', '#b9a8e8');
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
      this.money += this.cfg.basePay + tip;
      this.stats.served++;
      this.float(c.x, c.y - 10, `+$${this.cfg.basePay + tip}  (tip $${tip})`, '#7dffb0');
    } else {
      // wrong cupcake: half pay, no tip, and the customer is not happy about it
      const pay = Math.floor(this.cfg.basePay / 2);
      this.money += pay;
      this.stats.wrong++;
      this.float(c.x, c.y - 10, `Wrong cupcake! +$${pay}, no tip`, '#ff6b6b');
    }
    this.setHand(null);
    c.leave(this);
    this.customers[c.slot] = null;
  }

  // ---------------------------------------------------------------- helpers

  private trySpawn(): boolean {
    const free = this.customers.flatMap((c, i) => (c ? [] : [i]));
    if (free.length === 0) return false;
    const slot = Phaser.Utils.Array.GetRandom(free);
    const frosting = FROSTINGS[Phaser.Math.Between(0, this.cfg.frostingCount - 1)].id;
    const topping = TOPPINGS[Phaser.Math.Between(0, this.cfg.toppingCount - 1)].id;
    const color = Phaser.Utils.Array.GetRandom(MONSTER_COLORS);
    this.customers[slot] = new Customer(
      this,
      slot,
      SLOT_X[slot],
      SLOT_Y,
      this.cfg.patienceSec,
      { frosting, topping },
      color,
      (cust) => this.serve(cust),
    );
    return true;
  }

  private hint(msg: string, x = W / 2, y = 380): void {
    this.float(x, y, msg, '#ffd166');
  }

  private float(x: number, y: number, msg: string, color = '#ffffff'): void {
    const t = this.add
      .text(x, y, msg, { fontFamily: FONT, fontSize: '20px', color, fontStyle: 'bold', stroke: '#140d24', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private updateHud(): void {
    const t = Math.min(this.elapsed / this.cfg.durationSec, 1);
    const minutes = Math.floor(t * 360);
    const hh = (18 + Math.floor(minutes / 60)) % 24;
    const mm = minutes % 60;
    this.clockText.setText(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    this.moneyText.setText(`$${this.money} / $${this.cfg.goal}`);

    // money bar: full bar = 3-star amount; ticks at 1, 2 and 3 stars
    const x = 400;
    const w = 340;
    const max = this.cfg.goal * this.cfg.starMultipliers[2];
    const g = this.barGfx;
    g.clear();
    g.fillStyle(0x3a2a63, 1);
    g.fillRect(x, 18, w, 14);
    g.fillStyle(this.money >= this.cfg.goal ? COLORS.good : COLORS.warn, 1);
    g.fillRect(x, 18, w * Math.min(this.money / max, 1), 14);
    g.fillStyle(0xffffff, 1);
    for (const m of this.cfg.starMultipliers) g.fillRect(x + (w * m * this.cfg.goal) / max - 1, 14, 2, 22);
  }

  private endNight(): void {
    this.phase = 'ended';
    this.setHand(null);
    this.add
      .text(W / 2, H / 2 - 40, 'MIDNIGHT!', {
        fontFamily: FONT,
        fontSize: '72px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#140d24',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(150);
    this.time.delayedCall(1600, () => this.scene.start('Result', { money: this.money, stats: this.stats }));
  }
}
