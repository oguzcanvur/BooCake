import Phaser from 'phaser';
import { H, W } from './config';
import { MenuScene } from './scenes/MenuScene';
import { NightScene } from './scenes/NightScene';
import { ResultScene } from './scenes/ResultScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#140d24',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, NightScene, ResultScene],
});

// Dev-only handle so the game can be inspected/tested from the browser console.
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
