import Phaser from 'phaser';
import { GUARD_KEY, stationKey } from '../assets';
import { sfx } from '../audio';
import { DEPTH, FONT, INK, W } from '../config';
import { CONFIG } from '../data/gameConfig';
import { CLOTHS, DECORATIONS, PLATE_COLORS, WRAPPERS, decor, plateColor, type ClothOption, type ColorOption, type DecorationItem } from '../data/decor';
import { fadeIn, fadeOutThen, floatText, setupCamera } from '../fx';
import { cupcakeImage } from '../objects/cupcakeArt';
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
/** Size of an option's picture card. */
const CARD_PIC = { w: 72, h: 46 };
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
    // no header band: the upgrade cards would cut across it
    drawPanel(g, PANEL.w, PANEL.h, false);

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
        // on to the newest open night (the marker walks there from the night just played)
        const from = gameState.day;
        gameState.day = gameState.unlocked;
        progress.resumeAt = 'night';
        saveGame();
        fadeOutThen(this, () => this.scene.start('Map', { walkFrom: from }));
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
      cupcakeImage(this, { dough: 'chocolate', bake: 'ready', tone: 0.2, frosting: 'mint', topping: 'sprinkles' }, x, y + 2, 0.75).setDepth(depth + 1);
    } else if (key === 'guard') {
      const guard = this.add.image(x, y + 34, GUARD_KEY).setOrigin(0.5, 1).setDepth(depth);
      guard.setScale(100 / guard.height);
    } else {
      const garlic = this.add.image(x, y + 34, stationKey('garlic')).setOrigin(0.5, 1).setDepth(depth);
      garlic.setScale(70 / garlic.height);
    }
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
    cupcakeImage(this, { dough: 'chocolate', bake: 'ready', tone: 0.2, frosting: 'pink', topping: 'sprinkles' }, LEFT + 130, ROWS_Y[3] - 56, 1.25).setDepth(d + 2);

    // every option is a little picture of what it looks like (locked ones too, under a veil)
    this.rowLabel(0, T.decorWrapper);
    WRAPPERS.forEach((o, i) =>
      this.optionCard(0, i, o.stars, o.id === decor.wrapper, (_g, x, y, d) => this.previewWrapper(x, y, d, o), () => (decor.wrapper = o.id)),
    );
    this.rowLabel(1, T.decorPlates);
    PLATE_COLORS.forEach((o, i) =>
      this.optionCard(1, i, o.stars, o.id === decor.plate, (_g, x, y, depth) => this.previewPlate(x, y, o, depth), () => (decor.plate = o.id)),
    );
    this.rowLabel(2, T.decorCloth);
    CLOTHS.forEach((o, i) => this.optionCard(2, i, o.stars, o.id === decor.cloth, (g, x, y) => this.previewCloth(g, x, y, o), () => (decor.cloth = o.id)));
    this.rowLabel(3, T.decorItems);
    DECORATIONS.forEach((item, i) => {
      const on = decor.items.includes(item.id);
      this.optionCard(3, i, item.stars, on, (g, x, y) => this.previewDecoration(g, x, y, item), () => {
        decor.items = on ? decor.items.filter((id) => id !== item.id) : [...decor.items, item.id];
      });
    });
  }

  private rowLabel(row: number, label: string): void {
    this.add
      .text(ROW_X, ROWS_Y[row], label, { fontFamily: FONT, fontSize: '21px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 1);
  }

  /**
   * One option as a small picture card: the preview of what it gives, a gold frame when chosen (or switched on),
   * and, while still locked, a soft veil with a star badge (tapping it says how many stars are missing).
   */
  private optionCard(
    row: number,
    i: number,
    stars: number,
    chosen: boolean,
    draw: (g: Phaser.GameObjects.Graphics, x: number, y: number, depth: number) => void,
    choose: () => void,
  ): void {
    const x = SWATCH_X + i * SWATCH_GAP;
    const y = ROWS_Y[row];
    const open = decor.stars >= stars;
    const w = CARD_PIC.w;
    const h = CARD_PIC.h;
    const d = DEPTH.hud + 1;
    const bg = this.add.graphics().setDepth(d);
    bg.fillStyle(0x000000, 0.28);
    bg.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 3, w, h, 10);
    bg.fillStyle(0xfff6e6, open ? 0.9 : 0.55);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    const pic = this.add.graphics().setDepth(d + 1);
    draw(pic, x, y, d + 1);
    if (!open) {
      const veil = this.add.graphics().setDepth(d + 2);
      veil.fillStyle(0x3a2a55, 0.42);
      veil.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      this.lockBadge(x + w / 2 - 14, y + h / 2 - 8, stars);
    }
    const frame = this.add.graphics().setDepth(d + 2);
    frame.lineStyle(chosen ? 4 : 2.5, chosen ? 0xffd166 : INK, 1);
    frame.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    this.add
      .zone(x, y, w, h)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.pick(open, choose, x, y, stars));
  }

  /** A small cupcake in this wrapper color. */
  private previewWrapper(x: number, y: number, depth: number, o: ColorOption): void {
    cupcakeImage(this, { dough: 'vanilla', bake: 'ready', tone: 0.2, frosting: 'pink', topping: 'sprinkles' }, x, y + 8, 0.5, o.id).setDepth(depth);
  }

  /** The team's plate picture in this color. */
  private previewPlate(x: number, y: number, o: ColorOption, depth: number): void {
    const plate = this.add.image(x, y + 14, stationKey('plate')).setOrigin(0.5, 1).setDepth(depth).setTint(o.color);
    plate.setScale(54 / plate.width);
  }

  /** A strip of counter cloth: the cloth, its gold trim and the scalloped hem. */
  private previewCloth(g: Phaser.GameObjects.Graphics, x: number, y: number, o: ClothOption): void {
    const w = 52;
    const top = y - 12;
    g.fillStyle(o.dark, 1);
    for (let k = 0; k < 5; k++) g.fillCircle(x - w / 2 + 5 + k * 10.5, top + 20, 5.5);
    g.fillStyle(o.base, 1);
    g.fillRect(x - w / 2, top, w, 20);
    g.fillStyle(o.trim, 1);
    g.fillRect(x - w / 2, top + 4, w, 3);
    for (let k = 0; k < 5; k++) g.fillCircle(x - w / 2 + 5 + k * 10.5, top + 14, 1.5);
    g.lineStyle(1.8, INK, 1);
    g.strokeRect(x - w / 2, top, w, 20);
  }

  /** A tiny drawing of each decoration (the shop draws the full-size ones). */
  private previewDecoration(g: Phaser.GameObjects.Graphics, x: number, y: number, item: DecorationItem): void {
    if (item.id === 'webs') {
      // a corner web: spokes and a few threads
      const cx = x - 20;
      const cy = y - 16;
      g.lineStyle(1.4, 0x6a5a7a, 1);
      for (let k = 0; k <= 4; k++) {
        const a = (k / 4) * (Math.PI / 2);
        g.lineBetween(cx, cy, cx + Math.cos(a) * 40, cy + Math.sin(a) * 32);
      }
      for (const r of [12, 22, 32]) {
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI / 2, false);
        g.strokePath();
      }
      g.fillStyle(0x2e2438, 1);
      g.fillCircle(x + 8, y + 4, 4);
    } else if (item.id === 'garland') {
      // a string with little bat-purple and pumpkin-orange flags
      g.lineStyle(1.5, 0x5a4a3a, 1);
      g.lineBetween(x - 26, y - 12, x + 26, y - 12);
      [-18, -6, 6, 18].forEach((dx, k) => {
        g.fillStyle(k % 2 ? 0xf0a24a : 0x6a4fa0, 1);
        g.fillTriangle(x + dx - 5, y - 12, x + dx + 5, y - 12, x + dx, y + 4);
        g.lineStyle(1.2, INK, 1);
        g.strokeTriangle(x + dx - 5, y - 12, x + dx + 5, y - 12, x + dx, y + 4);
      });
    } else if (item.id === 'lights') {
      // a sagging wire with glowing bulbs
      g.lineStyle(1.5, 0x3a3a3a, 1);
      g.beginPath();
      g.moveTo(x - 26, y - 10);
      g.lineTo(x - 9, y - 2);
      g.lineTo(x + 9, y - 2);
      g.lineTo(x + 26, y - 10);
      g.strokePath();
      [
        [-18, -6, 0xffe066],
        [-6, -2, 0xff8fc7],
        [6, -2, 0x8fffd0],
        [18, -6, 0xb98cff],
      ].forEach(([dx, dy, c]) => {
        g.fillStyle(c, 0.35);
        g.fillCircle(x + dx, y + dy + 6, 7);
        g.fillStyle(c, 1);
        g.fillCircle(x + dx, y + dy + 6, 3.5);
      });
    } else {
      // a jack-o'-lantern
      g.fillStyle(0xf08a2a, 1);
      g.fillEllipse(x, y + 4, 34, 26);
      g.lineStyle(1.8, INK, 1);
      g.strokeEllipse(x, y + 4, 34, 26);
      g.lineBetween(x, y - 8, x, y + 16);
      g.fillStyle(0x6e8a3a, 1);
      g.fillRect(x - 2, y - 14, 4, 7);
      g.fillStyle(0x4a2a1a, 1);
      g.fillTriangle(x - 9, y, x - 4, y, x - 6.5, y - 5);
      g.fillTriangle(x + 4, y, x + 9, y, x + 6.5, y - 5);
      g.fillRect(x - 7, y + 7, 14, 3);
    }
  }

  private lockBadge(x: number, y: number, stars: number): void {
    const g = this.add.graphics().setDepth(DEPTH.hud + 2);
    g.fillStyle(0x24163a, 0.9);
    g.fillRoundedRect(x - 17, y - 10, 34, 20, 10);
    g.lineStyle(1.5, 0xffd166, 0.9);
    g.strokeRoundedRect(x - 17, y - 10, 34, 20, 10);
    drawStar(g, x - 7, y, 7, true, 1.2);
    this.add
      .text(x + 4, y, String(stars), { fontFamily: FONT, fontSize: '13px', color: '#ffe08a', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hud + 3);
  }

  private pick(open: boolean, apply: () => void, x: number, y: number, stars = 0): void {
    if (!open) {
      sfx(this, 'nope', 0.35);
      floatText(this, x, y - 34, T.needStars(stars - decor.stars), '#ffe08a', 18);
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
