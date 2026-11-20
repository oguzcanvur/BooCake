import Phaser from 'phaser';
import { stationKey } from '../assets';
import { sfx } from '../audio';
import { DEPTH, FONT, INK, W } from '../config';
import { CONFIG } from '../data/gameConfig';
import { CLOTHS, DECORATIONS, PLATE_COLORS, WRAPPERS, decor, plateColor, type ColorOption, type DecorationItem } from '../data/decor';
import { GUARD_MONSTER } from '../data/monsters';
import { fadeIn, fadeOutThen, floatText, setupCamera } from '../fx';
import { drawCupcake } from '../objects/cupcake';
import { MonsterView } from '../objects/MonsterView';
import { Shop } from '../objects/Shop';
import { gameState, MAX_EXTRA_OVENS, MAX_EXTRA_PLATES, type Upgrades } from '../systems/GameState';
import { progress, saveGame } from '../systems/save';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawCoin, drawStar } from '../ui/icons';
import { drawPanel } from '../ui/panel';

type Tab = 'upgrades' | 'decorate';

interface ShopData {
  /** 'Menu' = opened from the menu (Done goes back there); anything else = between two days (Next day). */
  from?: string;
  tab?: Tab;
  /** True when the scene restarts itself after a change (no fade, so the change shows at once). */
  refresh?: boolean;
}

/** Panel at the bottom of the screen; the shop above it shows the decorations live. */
const PANEL = { x: W / 2, y: 562, w: 1220, h: 296 };
const TOP = PANEL.y - PANEL.h / 2;
const LEFT = PANEL.x - PANEL.w / 2;
const RIGHT = PANEL.x + PANEL.w / 2;
/** Decorate tab layout. */
const ROW_X = 300;
const SWATCH_X = 520;
const SWATCH_GAP = 88;
const ROWS_Y = [512, 566, 620, 674];
/** Upgrades tab: card size and centers. */
const CARD = { w: 206, h: 222, y: 592, xs: [168, 386, 604, 822] };

interface Item {
  key: keyof Upgrades;
  name: string;
  desc: string;
  price: number;
  /** How many times it can be bought. */
  max: number;
}

const ITEMS: Item[] = [
  { key: 'garlic', name: T.garlicName, desc: T.garlicDesc, price: CONFIG.shop.garlic, max: 1 },
  { key: 'guard', name: T.guardName, desc: T.guardDesc, price: CONFIG.shop.guard, max: 1 },
  { key: 'ovens', name: T.ovenName, desc: T.ovenDesc, price: CONFIG.shop.oven, max: MAX_EXTRA_OVENS },
  { key: 'plates', name: T.plateName, desc: T.plateDesc, price: CONFIG.shop.plate, max: MAX_EXTRA_PLATES },
];

/** How many of an upgrade the player owns. */
function ownedCount(key: keyof Upgrades): number {
  const v = gameState.upgrades[key];
  return typeof v === 'number' ? v : v ? 1 : 0;
}

/**
 * The shop, in a panel at the bottom of the screen with two tabs:
 * - Upgrades: garlic, the security guard, an extra oven and extra plates, bought with the money earned.
 * - Decorate: cupcake wrapper, plate color, counter cloth and decorations (just for looks; they unlock with stars).
 * Opened from the menu (Done) and between two days (Next day). Every change restarts the scene so the shop
 * behind redraws at once.
 */
export class DecorateScene extends Phaser.Scene {
  private from = 'between';
  private tab: Tab = 'upgrades';

  constructor() {
    super('Decorate');
  }

  init(data: ShopData): void {
    this.from = data.from ?? 'between';
    this.tab = data.tab ?? 'upgrades';
    if (data.refresh) setupCamera(this);
    else fadeIn(this);
  }

  create(): void {
    setupCamera(this);
    new Shop(this).update(0.3);

    const d = DEPTH.hud;
    const g = this.add.graphics().setDepth(d).setPosition(PANEL.x, PANEL.y);
    drawPanel(g, PANEL.w, PANEL.h);

    this.drawTabs();
    this.drawPurse();
    if (this.tab === 'upgrades') ITEMS.forEach((item, i) => this.drawCard(item, CARD.xs[i]));
    else this.drawDecorate();

    // leave: back to the menu, or on to the next day (the map shows the walk to it)
    const between = this.from !== 'Menu';
    makeButton(
      this,
      RIGHT - 120,
      PANEL.y + 40,
      190,
      70,
      between ? T.nextDay : T.done,
      () => {
        if (!between) {
          fadeOutThen(this, () => this.scene.start('Menu'));
          return;
        }
        gameState.day++;
        progress.resumeAt = 'night';
        saveGame();
        fadeOutThen(this, () => this.scene.start('Map', { walkFrom: gameState.day - 1 }));
      },
      { color: 'green', fontSize: between ? 26 : 30, depth: d + 3 },
    );
  }

  /** Two tabs at the top-left of the panel; the open one is bright and joined to the panel. */
  private drawTabs(): void {
    const d = DEPTH.hud + 1;
    const tabs: [Tab, string][] = [
      ['upgrades', T.tabUpgrades],
      ['decorate', T.tabDecorate],
    ];
    tabs.forEach(([id, label], i) => {
      const x = LEFT + 120 + i * 196;
      const y = TOP + 34;
      const on = id === this.tab;
      const g = this.add.graphics().setDepth(d);
      g.fillStyle(0x000000, 0.25);
      g.fillRoundedRect(x - 88, y - 20 + 3, 176, 42, 14);
      g.fillStyle(on ? 0xff9ec9 : 0x6a5596, 1);
      g.fillRoundedRect(x - 88, y - 20, 176, 42, 14);
      g.lineStyle(on ? 3.5 : 2.5, on ? 0xffd166 : INK, 1);
      g.strokeRoundedRect(x - 88, y - 20, 176, 42, 14);
      this.add
        .text(x, y + 1, label, { fontFamily: FONT, fontSize: '22px', color: on ? '#3a1d3a' : '#efe4ff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(d + 1);
      if (!on) {
        this.add
          .zone(x, y, 176, 42)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            sfx(this, 'ui_click', 0.4);
            this.scene.restart({ from: this.from, tab: id, refresh: true });
          });
      }
    });
  }

  /** Money and stars at the top-right of the panel. */
  private drawPurse(): void {
    const d = DEPTH.hud + 1;
    const g = this.add.graphics().setDepth(d);
    const y = TOP + 34;
    drawCoin(g, RIGHT - 300, y, 14);
    this.add.text(RIGHT - 280, y + 1, `$${gameState.wallet}`, { fontFamily: FONT, fontSize: '26px', color: '#ffe08a', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(d);
    drawStar(g, RIGHT - 150, y, 15, true, 2.5);
    this.add.text(RIGHT - 128, y + 1, T.decorStars(decor.stars), { fontFamily: FONT, fontSize: '24px', color: '#ffe08a', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(d);
  }

  // ---------------------------------------------------------------- upgrades

  /** One upgrade card: picture, name, short description, and the price on the buy button (or "owned"). */
  private drawCard(item: Item, x: number): void {
    const d = DEPTH.hud + 1;
    const top = CARD.y - CARD.h / 2;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(x - CARD.w / 2, top + 4, CARD.w, CARD.h, 18);
    g.fillStyle(0xffffff, 0.08);
    g.fillRoundedRect(x - CARD.w / 2, top, CARD.w, CARD.h, 18);

    this.drawItemPicture(item.key, x, top + 50, d + 1);
    this.add
      .text(x, top + 106, item.name, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5)
      .setDepth(d + 1);
    this.add
      .text(x, top + 138, item.desc, { fontFamily: FONT, fontSize: '14px', color: '#d8ccf5', align: 'center', wordWrap: { width: CARD.w - 22 } })
      .setOrigin(0.5)
      .setDepth(d + 1);

    const owned = ownedCount(item.key);
    if (item.max > 1 && owned > 0) {
      this.add
        .text(x + CARD.w / 2 - 12, top + 10, `${owned}/${item.max}`, { fontFamily: FONT, fontSize: '18px', color: '#7dffb0', fontStyle: 'bold' })
        .setOrigin(1, 0)
        .setDepth(d + 1);
    }
    const by = top + CARD.h - 30;
    if (owned >= item.max) {
      this.add.text(x, by, `✓ ${T.owned}`, { fontFamily: FONT, fontSize: '22px', color: '#7dffb0', fontStyle: 'bold' }).setOrigin(0.5).setDepth(d + 1);
      return;
    }
    const affordable = gameState.wallet >= item.price;
    makeButton(this, x, by, 168, 46, `${T.buy}  $${item.price}`, () => this.buy(item, x, by), {
      color: affordable ? 'yellow' : 'grey',
      tint: affordable ? undefined : 0x9a90c0,
      fontSize: 20,
      depth: d + 2,
    });
  }

  /** The picture on a card: the game's own oven and plate drawings, the guard, a bunch of garlic. */
  private drawItemPicture(key: keyof Upgrades, x: number, y: number, depth: number): void {
    if (key === 'ovens') {
      const oven = this.add.image(x, y + 34, stationKey('oven')).setOrigin(0.5, 1).setDepth(depth);
      oven.setScale(78 / oven.height);
    } else if (key === 'plates') {
      const plate = this.add.image(x, y + 30, stationKey('plate')).setOrigin(0.5, 1).setDepth(depth).setTint(plateColor());
      plate.setScale(110 / plate.width);
      const cake = this.add.graphics().setDepth(depth + 1);
      drawCupcake(cake, x, y + 2, { dough: 'chocolate', bake: 'ready', tone: 0.2, frosting: 'mint', topping: 'sprinkles' }, 0.75);
    } else if (key === 'guard') {
      const guard = new MonsterView(this, x, y - 12, GUARD_MONSTER);
      guard.root.setDepth(depth).setScale(0.36);
    } else {
      this.drawGarlic(this.add.graphics().setDepth(depth), x, y + 8, 0.7);
    }
  }

  private drawGarlic(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    const bulb = (bx: number, by: number, k: number) => {
      g.fillStyle(0xe9e2cf, 1);
      g.fillEllipse(bx, by, 50 * k, 46 * k);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(bx - 9 * k, by - 6 * k, 16 * k, 16 * k);
      g.lineStyle(2.5 * k, 0xc9c0a8, 1);
      g.lineBetween(bx, by - 20 * k, bx - 6 * k, by + 16 * k);
      g.lineBetween(bx, by - 20 * k, bx + 10 * k, by + 16 * k);
      g.fillStyle(0xe9e2cf, 1);
      g.fillTriangle(bx - 6 * k, by - 18 * k, bx + 6 * k, by - 18 * k, bx, by - 36 * k);
      g.lineStyle(2, INK, 0.8);
      g.strokeEllipse(bx, by, 50 * k, 46 * k);
    };
    bulb(x - 28 * s, y + 14 * s, s);
    bulb(x + 28 * s, y + 14 * s, s);
    bulb(x, y - 14 * s, 1.1 * s);
  }

  private buy(item: Item, x: number, y: number): void {
    if (gameState.wallet < item.price) {
      sfx(this, 'nope', 0.4);
      floatText(this, x, y - 40, T.notEnough, '#ff8a8a');
      return;
    }
    gameState.wallet -= item.price;
    if (item.key === 'ovens' || item.key === 'plates') gameState.upgrades[item.key]++;
    else gameState.upgrades[item.key] = true;
    saveGame();
    sfx(this, 'coin', 0.5);
    sfx(this, 'serve_ok', 0.4);
    // rebuild on the next frame so the clicked button is not destroyed while it handles the click
    this.time.delayedCall(0, () => this.scene.restart({ from: this.from, tab: this.tab, refresh: true }));
  }

  // ---------------------------------------------------------------- decorate

  private drawDecorate(): void {
    const d = DEPTH.hud;
    this.add
      .text(LEFT + 420, TOP + 36, T.decorHint, { fontFamily: FONT, fontSize: '16px', color: '#c9bdf0', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    // preview: a cupcake on a plate, as it looks with the current choices
    const plate = this.add.image(LEFT + 130, ROWS_Y[3] + 8, stationKey('plate')).setOrigin(0.5, 1).setDepth(d + 1);
    plate.setScale(150 / plate.width).setTint(plateColor());
    const cake = this.add.graphics().setDepth(d + 2);
    drawCupcake(cake, LEFT + 130, ROWS_Y[3] - 56, { dough: 'chocolate', bake: 'ready', tone: 0.2, frosting: 'pink', topping: 'sprinkles' }, 1.25);

    this.colorRow(0, T.decorWrapper, WRAPPERS, decor.wrapper, (id) => (decor.wrapper = id));
    this.colorRow(1, T.decorPlates, PLATE_COLORS, decor.plate, (id) => (decor.plate = id));
    this.colorRow(
      2,
      T.decorCloth,
      CLOTHS.map((c) => ({ id: c.id, name: c.name, color: c.base, stars: c.stars })),
      decor.cloth,
      (id) => (decor.cloth = id),
    );
    this.decorationRow(3);
  }

  private rowLabel(row: number, label: string): void {
    this.add
      .text(ROW_X, ROWS_Y[row], label, { fontFamily: FONT, fontSize: '21px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 1);
  }

  /** A row of round color swatches: the chosen one has a gold ring, locked ones show the stars they need. */
  private colorRow(row: number, label: string, options: ColorOption[], current: string, choose: (id: string) => void): void {
    this.rowLabel(row, label);
    const y = ROWS_Y[row];
    options.forEach((o, i) => {
      const x = SWATCH_X + i * SWATCH_GAP;
      const open = decor.stars >= o.stars;
      const g = this.add.graphics().setDepth(DEPTH.hud + 1);
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(x + 1, y + 3, 19);
      g.fillStyle(open ? o.color : 0x5a4a78, 1);
      g.fillCircle(x, y, 19);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(x - 6, y - 6, 5);
      g.lineStyle(2.5, INK, 1);
      g.strokeCircle(x, y, 19);
      if (o.id === current) {
        g.lineStyle(4, 0xffd166, 1);
        g.strokeCircle(x, y, 25);
      }
      if (!open) this.lockBadge(x, y, o.stars);
      this.add
        .zone(x, y, 48, 48)
        .setInteractive({ useHandCursor: open })
        .on('pointerdown', () => this.pick(open, () => choose(o.id), x, y));
    });
  }

  /** The decorations: pills that switch each one on or off. */
  private decorationRow(row: number): void {
    this.rowLabel(row, T.decorItems);
    const y = ROWS_Y[row];
    DECORATIONS.forEach((item: DecorationItem, i) => {
      const x = SWATCH_X + 52 + i * 150;
      const open = decor.stars >= item.stars;
      const on = decor.items.includes(item.id);
      const g = this.add.graphics().setDepth(DEPTH.hud + 1);
      const w = 138;
      const h = 36;
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 3, w, h, h / 2);
      g.fillStyle(!open ? 0x5a4a78 : on ? 0x4fcf86 : 0x8a74b8, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      g.lineStyle(on ? 3.5 : 2.5, on ? 0xffd166 : INK, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
      this.add
        .text(x, y - 1, open ? `${on ? '✓ ' : ''}${item.name}` : '', { fontFamily: FONT, fontSize: '15px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(DEPTH.hud + 2);
      if (!open) this.lockBadge(x, y, item.stars);
      this.add
        .zone(x, y, w, h)
        .setInteractive({ useHandCursor: open })
        .on('pointerdown', () =>
          this.pick(
            open,
            () => {
              decor.items = on ? decor.items.filter((id) => id !== item.id) : [...decor.items, item.id];
            },
            x,
            y,
          ),
        );
    });
  }

  /** Small star + number on a locked option. */
  private lockBadge(x: number, y: number, stars: number): void {
    const g = this.add.graphics().setDepth(DEPTH.hud + 2);
    drawStar(g, x - 8, y, 9, true, 1.5);
    this.add
      .text(x + 2, y, String(stars), { fontFamily: FONT, fontSize: '15px', color: '#ffe08a', fontStyle: 'bold', stroke: '#1d1230', strokeThickness: 3 })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 2);
  }

  private pick(open: boolean, apply: () => void, x: number, y: number): void {
    if (!open) {
      sfx(this, 'nope', 0.35);
      this.tweens.add({ targets: this.add.circle(x, y, 22, 0xff6b6b, 0.35).setDepth(DEPTH.hud + 3), alpha: 0, duration: 300 });
      return;
    }
    apply();
    saveGame();
    sfx(this, 'place', 0.45);
    // restart without a fade so the shop behind redraws with the new look
    this.scene.restart({ from: this.from, tab: 'decorate', refresh: true });
  }
}
