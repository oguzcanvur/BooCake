import Phaser from 'phaser';
import { LOGO } from '../assets';
import { COLORS, DEPTH, FONT, H, LAYOUT, W } from '../config';
import { NORMAL_MONSTERS } from '../data/monsters';
import { fadeIn, fadeOutThen } from '../fx';
import { MonsterView } from '../objects/MonsterView';
import { Shop } from '../objects/Shop';
import { gameState, resetGame } from '../systems/GameState';
import { canContinue, progress } from '../systems/save';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawFullscreen } from '../ui/icons';

/** Main menu: the shop at night with two customers and the BooCake logo. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    fadeIn(this, 500);
    new Shop(this).update(0.12);

    // two customers waiting at the counter
    const left = new MonsterView(this, LAYOUT.customerSlotsX[0], LAYOUT.customerY, NORMAL_MONSTERS[2], { counter: true, scale: LAYOUT.customerScale });
    const right = new MonsterView(this, LAYOUT.customerSlotsX[2], LAYOUT.customerY, NORMAL_MONSTERS[0], { counter: true, scale: LAYOUT.customerScale });
    for (const m of [left, right]) {
      m.root.setDepth(DEPTH.monster);
      m.enter();
    }

    // soft dark glow behind the logo so it reads well over the shop
    const glow = this.add.graphics().setDepth(DEPTH.bubble);
    for (let i = 7; i >= 1; i--) {
      glow.fillStyle(COLORS.bg, 0.09);
      glow.fillEllipse(W / 2, 214, 300 + i * 60, 260 + i * 34);
    }

    // the game logo: pops in, then floats and sways gently
    const logo = this.add.image(W / 2, 218, LOGO).setDepth(DEPTH.bubble + 1);
    const scale = 370 / logo.height;
    logo.setScale(scale * 0.4).setAlpha(0);
    this.tweens.add({ targets: logo, scale, alpha: 1, duration: 650, ease: 'Back.easeOut' });
    this.tweens.add({ targets: logo, y: logo.y - 7, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 650 });
    this.tweens.add({ targets: logo, angle: { from: -1.2, to: 1.2 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 650 });

    this.add
      .text(W / 2, 428, T.tagline, { fontFamily: FONT, fontSize: '28px', color: '#fff1fa', fontStyle: 'bold', stroke: '#2b1d4f', strokeThickness: 7 })
      .setOrigin(0.5)
      .setDepth(DEPTH.bubble + 1);

    if (canContinue()) {
      // a saved game: continue it, or start over (asks for a second click so progress is not lost by accident)
      makeButton(this, W / 2 - 175, 500, 330, 86, T.continueDay(gameState.day + (progress.resumeAt === 'shop' ? 2 : 1)), () => {
        fadeOutThen(this, () => this.scene.start(progress.resumeAt === 'shop' ? 'UpgradeShop' : 'Map'));
      }, { color: 'green', fontSize: 34, depth: DEPTH.hud });
      this.newGameButton(false);
    } else {
      makeButton(
        this,
        W / 2,
        500,
        340,
        86,
        T.play,
        () => {
          resetGame();
          fadeOutThen(this, () => this.scene.start('Map'));
        },
        { color: 'green', fontSize: 42, depth: DEPTH.hud },
      );
    }
    makeButton(this, W / 2 - 150, 606, 280, 72, T.howTo, () => fadeOutThen(this, () => this.scene.start('HowTo')), {
      color: 'blue',
      fontSize: 30,
      depth: DEPTH.hud,
    });
    makeButton(this, W / 2 + 150, 606, 280, 72, T.decorate, () => fadeOutThen(this, () => this.scene.start('Decorate', { from: 'Menu' })), {
      color: 'yellow',
      fontSize: 30,
      depth: DEPTH.hud,
    });

    this.add
      .text(W / 2, H - 22, 'v0.3  -  art & sounds by Kenney (CC0), font Fredoka (OFL)', {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#9d8fd0',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.addFullscreenButton();
  }

  /** "New game" next to Continue. The first click turns it into "Sure?"; a second click within 3 s starts over. */
  private newGameButton(confirm: boolean): void {
    const btn = makeButton(
      this,
      W / 2 + 175,
      500,
      300,
      86,
      confirm ? T.newGameSure : T.newGame,
      () => {
        if (confirm) {
          resetGame();
          fadeOutThen(this, () => this.scene.start('Map'));
          return;
        }
        // rebuild on the next frame so the clicked button is not destroyed while it handles the click
        this.time.delayedCall(0, () => {
          btn.destroy();
          this.newGameButton(true);
        });
      },
      { color: confirm ? 'red' : 'blue', fontSize: 30, depth: DEPTH.hud },
    );
    if (confirm) {
      this.time.delayedCall(3000, () => {
        if (!this.scene.isActive()) return;
        btn.destroy();
        this.newGameButton(false);
      });
    }
  }

  /**
   * Round "full screen" button in the top-right corner (phones and tablets: hides the browser bars).
   * Browsers only allow full screen from a tap, so it switches on pointerup. iPhone Safari has no full screen
   * for pages: there the button explains how to add the game to the home screen (it then opens without bars).
   */
  private addFullscreenButton(): void {
    const x = W - 44;
    const y = 40;
    const g = this.add.graphics().setDepth(DEPTH.hud + 2);
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillCircle(x, y + 3, 26);
      g.fillStyle(hover ? 0x5d4280 : 0x4a3266, 1);
      g.fillCircle(x, y, 26);
      g.lineStyle(3, 0x4a2a2e, 1);
      g.strokeCircle(x, y, 26);
      drawFullscreen(g, x, y, this.scale.isFullscreen);
    };
    draw(false);
    const label = this.add
      .text(x - 36, y, T.fullscreen, { fontFamily: FONT, fontSize: '18px', color: '#fff1fa', fontStyle: 'bold', stroke: '#2b1d4f', strokeThickness: 5 })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud + 2);
    const zone = this.add.zone(x - 50, y, 170, 60).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => {
      if (!this.scale.fullscreen.available) {
        this.showHint(T.fullscreenIphone, x + 26, y + 40);
        return;
      }
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else {
        this.scale.startFullscreen();
        // Android: keep it sideways while in full screen (ignored where not supported)
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        orientation.lock?.('landscape').catch(() => undefined);
      }
    });
    const refresh = () => {
      draw(false);
      label.setVisible(!this.scale.isFullscreen);
    };
    this.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, refresh);
    this.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, refresh);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, refresh);
      this.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, refresh);
    });
    label.setVisible(!this.scale.isFullscreen);
  }

  private hintBox?: Phaser.GameObjects.Container;

  /** A small dark note under the top-right corner (right edge at `right`), gone after 5 seconds. */
  private showHint(msg: string, right: number, top: number): void {
    this.hintBox?.destroy();
    const text = this.add
      .text(0, 0, msg, { fontFamily: FONT, fontSize: '17px', color: '#fff1fa', fontStyle: 'bold', wordWrap: { width: 320 }, lineSpacing: 2 })
      .setOrigin(1, 0);
    const pad = 12;
    const g = this.add.graphics();
    g.fillStyle(0x2e2230, 0.95);
    g.fillRoundedRect(-text.width - pad, -pad, text.width + pad * 2, text.height + pad * 2, 14);
    g.lineStyle(2.5, 0x4a2a2e, 1);
    g.strokeRoundedRect(-text.width - pad, -pad, text.width + pad * 2, text.height + pad * 2, 14);
    const box = this.add.container(right - pad, top + pad, [g, text]).setDepth(DEPTH.hud + 3);
    this.hintBox = box;
    this.tweens.add({ targets: box, alpha: 0, delay: 5000, duration: 400, onComplete: () => box.destroy() });
  }
}
