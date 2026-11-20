import Phaser from 'phaser';
import { queueLogo } from '../assets';

/** Loads only the logo (a single embedded image), so the loading screen can show it right away. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    queueLogo(this);
  }

  create(): void {
    this.scene.start('Preload');
  }
}
