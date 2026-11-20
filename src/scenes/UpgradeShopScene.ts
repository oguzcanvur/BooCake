import Phaser from 'phaser';
import { sfx } from '../audio';
import { COLORS, DEPTH, FONT, H, W } from '../config';
import { CONFIG } from '../data/gameConfig';
import { GUARD_MONSTER } from '../data/monsters';
import { fadeIn, fadeOutThen, floatText } from '../fx';
import { stationKey } from '../assets';
import { drawCupcake } from '../objects/cupcake';
import { MonsterView } from '../objects/MonsterView';
import { Shop } from '../objects/Shop';
import { gameState, MAX_EXTRA_OVENS, MAX_EXTRA_PLATES, type Upgrades } from '../systems/GameState';
import { progress, saveGame } from '../systems/save';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawPanel } from '../ui/panel';

interface Item {
  key: keyof Upgrades;
  name: string;
  desc: string;
  price: number;
  /** How many times it can be bought (1 for garlic and the guard, more for ovens). */
  max: number;
}

/** How many of an upgrade the player owns. */
function ownedCount(key: keyof Upgrades): number {
  const v = gameState.upgrades[key];
  return typeof v === 'number' ? v : v ? 1 : 0;
}

const ITEMS: Item[] = [
  { key: 'garlic', name: T.garlicName, desc: T.garlicDesc, price: CONFIG.shop.garlic, max: 1 },
  { key: 'guard', name: T.guardName, desc: T.guardDesc, price: CONFIG.shop.guard, max: 1 },
  { key: 'ovens', name: T.ovenName, desc: T.ovenDesc, price: CONFIG.shop.oven, max: MAX_EXTRA_OVENS },
  { key: 'plates', name: T.plateName, desc: T.plateDesc, price: CONFIG.shop.plate, max: MAX_EXTRA_PLATES },
];

/** Distance between the card centers, and a card's width. */
const CARD_GAP = 262;
const CARD_W = 244;

/** Between days: spend the wallet on permanent upgrades (garlic, security guard, an extra oven, extra plates). */
export class UpgradeShopScene extends Phaser.Scene {
  private walletText!: Phaser.GameObjects.Text;
  /** Everything that must be rebuilt when the money or the owned items change (buy buttons / status texts). */
  private dynamic: { destroy: () => void }[] = [];
  /** Where each card's buy button / status text goes. */
  private cardPos: Partial<Record<keyof Upgrades, { x: number; y: number }>> = {};

  constructor() {
    super('UpgradeShop');
  }

  create(): void {
    fadeIn(this);
    new Shop(this).update(0.6);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0618, 0.7).setDepth(DEPTH.bubble);

    const panelW = 1100;
    const panelH = 560;
    const cy = H / 2 - 24;
    const panel = this.add.container(W / 2, cy).setDepth(DEPTH.hud);
    const g = this.add.graphics();
    drawPanel(g, panelW, panelH);
    panel.add(g);
    panel.add(
      this.add
        .text(0, -panelH / 2 + 48, T.shopTitle, { fontFamily: FONT, fontSize: '46px', color: '#ffb4d9', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 7 })
        .setOrigin(0.5),
    );
    this.walletText = this.add
      .text(W / 2, cy - panelH / 2 + 104, '', { fontFamily: FONT, fontSize: '30px', color: '#ffd166', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 1);

    ITEMS.forEach((item, i) => this.drawCard(item, W / 2 + (i - (ITEMS.length - 1) / 2) * CARD_GAP, cy + 20));
    this.refresh();

    makeButton(this, W / 2 - 290, cy + panelH / 2 + 46, 220, 64, T.decorate, () => fadeOutThen(this, () => this.scene.start('Decorate', { from: 'UpgradeShop' })), {
      color: 'yellow',
      fontSize: 26,
      depth: DEPTH.hud + 2,
    });
    makeButton(this, W / 2, cy + panelH / 2 + 46, 320, 72, T.nextDay, () => {
      gameState.day++;
      progress.resumeAt = 'night';
      saveGame();
      fadeOutThen(this, () => this.scene.start('Night'));
    }, { color: 'green', fontSize: 32, depth: DEPTH.hud + 2 });
  }

  /** The static part of a card: background, icon, name and description. */
  private drawCard(item: Item, x: number, y: number): void {
    const d = DEPTH.hud + 1;
    const g = this.add.graphics().setDepth(d);
    g.fillStyle(0x000000, 0.22);
    g.fillRoundedRect(x - CARD_W / 2, y - 170, CARD_W, 350, 22);
    g.fillStyle(0xffffff, 0.07);
    g.fillRoundedRect(x - CARD_W / 2, y - 176, CARD_W, 350, 22);

    const icon = this.add.graphics().setDepth(d + 1);
    if (item.key === 'garlic') this.drawGarlicIcon(icon, x, y - 90);
    else if (item.key === 'ovens') this.drawOvenIcon(icon, x, y - 90);
    else if (item.key === 'plates') this.drawPlateIcon(x, y - 90, d + 1);
    else {
      const guard = new MonsterView(this, x, y - 118, GUARD_MONSTER);
      guard.root.setDepth(d + 1).setScale(0.5);
    }

    this.add.text(x, y - 6, item.name, { fontFamily: FONT, fontSize: '25px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: CARD_W - 24 } }).setOrigin(0.5).setDepth(d + 1);
    this.add.text(x, y + 38, item.desc, { fontFamily: FONT, fontSize: '19px', color: '#c9bdf0', align: 'center', wordWrap: { width: CARD_W - 30 } }).setOrigin(0.5).setDepth(d + 1);
    this.add.text(x, y + 88, `$${item.price}`, { fontFamily: FONT, fontSize: '32px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5).setDepth(d + 1);
    this.cardPos[item.key] = { x, y: y + 140 };
  }

  /** Redraw the wallet and the buy buttons (called after every purchase). */
  private refresh(): void {
    this.walletText.setText(T.wallet(gameState.wallet));
    this.dynamic.forEach((o) => o.destroy());
    this.dynamic = [];
    for (const item of ITEMS) {
      const pos = this.cardPos[item.key];
      if (!pos) continue;
      const { x, y } = pos;
      const owned = ownedCount(item.key);
      if (owned >= item.max) {
        const t = this.add
          .text(x, y, `✓ ${T.owned}`, { fontFamily: FONT, fontSize: '26px', color: '#7dffb0', fontStyle: 'bold' })
          .setOrigin(0.5)
          .setDepth(DEPTH.hud + 3);
        this.dynamic.push({ destroy: () => t.destroy() });
        continue;
      }
      if (owned > 0) {
        const t = this.add
          // top-right corner of the card
          .text(x + CARD_W / 2 - 18, y - 300, `${owned}/${item.max}`, { fontFamily: FONT, fontSize: '22px', color: '#7dffb0', fontStyle: 'bold' })
          .setOrigin(1, 0)
          .setDepth(DEPTH.hud + 3);
        this.dynamic.push({ destroy: () => t.destroy() });
      }
      const affordable = gameState.wallet >= item.price;
      const btn = makeButton(
        this,
        x,
        y,
        200,
        58,
        affordable ? T.buy : T.notEnough,
        () => this.buy(item, x, y),
        affordable ? { color: 'yellow', fontSize: 24, depth: DEPTH.hud + 3 } : { color: 'grey', tint: 0x9a90c0, fontSize: 22, depth: DEPTH.hud + 3 },
      );
      this.dynamic.push(btn);
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
    floatText(this, x, y - 40, T.owned, '#7dffb0', 26);
    // rebuild on the next frame so the clicked button is not destroyed while it handles the click
    this.time.delayedCall(0, () => this.refresh());
  }

  /** The team's plate drawing with a little cupcake on it. */
  private drawPlateIcon(x: number, y: number, depth: number): void {
    const plate = this.add.image(x, y + 46, stationKey('plate')).setOrigin(0.5, 1).setDepth(depth);
    plate.setScale(150 / plate.width);
    const g = this.add.graphics().setDepth(depth + 1);
    drawCupcake(g, x, y - 4, { dough: 'chocolate', bake: 'ready', tone: 0.2, frosting: 'mint', topping: 'sprinkles' }, 1);
  }

  private drawGarlicIcon(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const bulb = (bx: number, by: number, s: number) => {
      g.fillStyle(0xe9e2cf, 1);
      g.fillEllipse(bx, by, 50 * s, 46 * s);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(bx - 9 * s, by - 6 * s, 16 * s, 16 * s);
      g.lineStyle(2.5, 0xc9c0a8, 1);
      g.lineBetween(bx, by - 20 * s, bx - 6 * s, by + 16 * s);
      g.lineBetween(bx, by - 20 * s, bx + 10 * s, by + 16 * s);
      g.fillStyle(0xe9e2cf, 1);
      g.fillTriangle(bx - 6 * s, by - 18 * s, bx + 6 * s, by - 18 * s, bx, by - 36 * s);
    };
    bulb(x - 28, y + 14, 1);
    bulb(x + 28, y + 14, 1);
    bulb(x, y - 14, 1.1);
    g.lineStyle(3, 0x7a8f4a, 1);
    g.lineBetween(x, y - 54, x, y - 66);
  }

  private drawOvenIcon(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x6f7fa6, 1);
    g.fillRoundedRect(x - 52, y - 62, 104, 124, 14);
    g.fillStyle(0x93a4cc, 1);
    g.fillRoundedRect(x - 52, y - 62, 104, 24, { tl: 14, tr: 14, bl: 4, br: 4 });
    g.fillStyle(0x4a567c, 1);
    g.fillRoundedRect(x - 44, y - 32, 88, 86, 10);
    g.fillStyle(COLORS.warn, 0.9);
    g.fillRoundedRect(x - 36, y - 24, 72, 54, 8);
    g.fillStyle(0xff8a2a, 0.9);
    g.fillRoundedRect(x - 30, y - 6, 60, 30, 8);
    g.fillStyle(0xd9e2ff, 1);
    g.fillRoundedRect(x - 28, y - 42, 56, 6, 3);
  }
}
