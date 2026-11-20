import Phaser from 'phaser';
import { stationKey } from '../assets';
import { sfx } from '../audio';
import { DEPTH, FONT, INK, W } from '../config';
import { CLOTHS, DECORATIONS, PLATE_COLORS, WRAPPERS, decor, plateColor, type ColorOption, type DecorationItem } from '../data/decor';
import { fadeIn, fadeOutThen, setupCamera } from '../fx';
import { drawCupcake } from '../objects/cupcake';
import { Shop } from '../objects/Shop';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawStar } from '../ui/icons';
import { drawPanel } from '../ui/panel';

interface DecorateData {
  /** Scene to go back to ('Menu' or 'UpgradeShop'). */
  from: string;
  /** True when the scene restarts itself after a change (no fade, so the change shows at once). */
  refresh?: boolean;
}

/** Panel at the bottom of the screen; the shop above it shows the decorations live. */
const PANEL = { x: W / 2, y: 562, w: 1220, h: 296 };
const ROW_X = 300;
const SWATCH_X = 520;
const SWATCH_GAP = 88;
const ROWS_Y = [512, 566, 620, 674];

/**
 * Decorate the shop: cupcake wrapper, plate color, counter cloth and a few decorations. Purely cosmetic;
 * options unlock with stars (decor.stars). Every change restarts the scene so the shop behind redraws.
 */
export class DecorateScene extends Phaser.Scene {
  private from = 'Menu';

  constructor() {
    super('Decorate');
  }

  init(data: DecorateData): void {
    this.from = data.from ?? 'Menu';
    if (data.refresh) setupCamera(this);
    else fadeIn(this);
  }

  create(): void {
    setupCamera(this);
    new Shop(this).update(0.3);

    const d = DEPTH.hud;
    const g = this.add.graphics().setDepth(d).setPosition(PANEL.x, PANEL.y);
    drawPanel(g, PANEL.w, PANEL.h);
    const top = PANEL.y - PANEL.h / 2;
    const left = PANEL.x - PANEL.w / 2;

    this.add
      .text(left + 36, top + 34, T.decorateTitle, { fontFamily: FONT, fontSize: '30px', color: '#ffb4d9', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 6 })
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    this.add
      .text(left + 420, top + 36, T.decorHint, { fontFamily: FONT, fontSize: '17px', color: '#c9bdf0', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(d + 1);
    const star = this.add.graphics().setDepth(d + 1);
    drawStar(star, PANEL.x + PANEL.w / 2 - 150, top + 34, 15, true, 2.5);
    this.add
      .text(PANEL.x + PANEL.w / 2 - 128, top + 35, T.decorStars(decor.stars), { fontFamily: FONT, fontSize: '24px', color: '#ffe08a', fontStyle: 'bold' })
      .setOrigin(0, 0.5)
      .setDepth(d + 1);

    // preview: a cupcake on a plate, as it looks with the current choices
    const plate = this.add.image(left + 130, ROWS_Y[3] + 8, stationKey('plate')).setOrigin(0.5, 1).setDepth(d + 1);
    plate.setScale(150 / plate.width).setTint(plateColor());
    const cake = this.add.graphics().setDepth(d + 2);
    drawCupcake(cake, left + 130, ROWS_Y[3] - 56, { dough: 'chocolate', bake: 'ready', tone: 0.2, frosting: 'pink', topping: 'sprinkles' }, 1.25);

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

    makeButton(this, PANEL.x + PANEL.w / 2 - 110, ROWS_Y[1] + 8, 170, 64, T.done, () => fadeOutThen(this, () => this.scene.start(this.from)), {
      color: 'green',
      fontSize: 28,
      depth: d + 3,
    });
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
    sfx(this, 'place', 0.45);
    // restart without a fade so the shop behind redraws with the new look
    this.scene.restart({ from: this.from, refresh: true });
  }
}
