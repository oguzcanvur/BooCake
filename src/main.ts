// Latin subset only (English UI); keeps the build small.
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import Phaser from 'phaser';
import { H, W } from './config';
import { MONSTERS } from './data/monsters';
import { MenuScene } from './scenes/MenuScene';
import { NightScene } from './scenes/NightScene';
import { PreloadScene } from './scenes/PreloadScene';
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
  scene: [PreloadScene, MenuScene, NightScene, ResultScene],
});

// Dev-only handle so the game can be inspected/tested from the browser console.
if (import.meta.env.DEV) {
  const dev = window as unknown as { __game: Phaser.Game; __monsters: typeof MONSTERS };
  dev.__game = game;
  dev.__monsters = MONSTERS;
}
