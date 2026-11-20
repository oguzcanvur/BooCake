import Phaser from 'phaser';
import { sfx } from '../audio';
import { DEPTH, FONT, H, W } from '../config';
import { setupCamera } from '../fx';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawPanel } from '../ui/panel';

/**
 * Pause menu, opened on top of the Night scene (which is paused underneath, so customers' patience,
 * the ovens, timers and animations all stand still). Resume, restart the day, or go back to the menu.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    setupCamera(this);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0618, 0.6).setInteractive();

    const panelW = 460;
    const panelH = 400;
    const cy = H / 2;
    const g = this.add.graphics().setPosition(W / 2, cy);
    drawPanel(g, panelW, panelH);
    this.add
      .text(W / 2, cy - panelH / 2 + 48, T.paused, { fontFamily: FONT, fontSize: '46px', color: '#ffb4d9', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 7 })
      .setOrigin(0.5);

    const d = DEPTH.hud;
    makeButton(this, W / 2, cy - 40, 300, 66, T.resume, () => this.resume(), { color: 'green', fontSize: 28, depth: d });
    makeButton(this, W / 2, cy + 44, 300, 62, T.restartDay, () => this.leave((night) => night.scene.restart(night.sys.settings.data)), { color: 'yellow', fontSize: 24, depth: d });
    makeButton(this, W / 2, cy + 122, 300, 62, T.mainMenu, () => this.leave((night) => night.scene.start('Menu')), { color: 'grey', fontSize: 24, depth: d });

    // P or Esc also resumes
    this.input.keyboard?.on('keydown-P', () => this.resume());
    this.input.keyboard?.on('keydown-ESC', () => this.resume());
  }

  private resume(): void {
    sfx(this, 'ui_click', 0.4);
    this.scene.resume('Night');
    this.scene.stop();
  }

  /** Close the pause menu and do something with the (still paused) Night scene. */
  private leave(then: (night: Phaser.Scene) => void): void {
    const night = this.scene.get('Night');
    this.scene.stop();
    night.scene.resume();
    then(night);
  }
}
