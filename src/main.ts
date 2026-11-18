// Latin + Latin-extended (Turkish letters such as ş, ğ, ı, İ); other scripts are left out to keep the build small.
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/fredoka/latin-ext-600.css';
import '@fontsource/fredoka/latin-ext-700.css';
import Phaser from 'phaser';
import { H, W } from './config';
import { GUARD_MONSTER, NORMAL_MONSTERS, SPECIAL_MONSTERS } from './data/monsters';
import { FinalScene } from './scenes/FinalScene';
import { HowToScene } from './scenes/HowToScene';
import { MenuScene } from './scenes/MenuScene';
import { NightScene } from './scenes/NightScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SummaryScene } from './scenes/SummaryScene';
import { UpgradeShopScene } from './scenes/UpgradeShopScene';

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
  scene: [PreloadScene, MenuScene, HowToScene, NightScene, SummaryScene, UpgradeShopScene, FinalScene],
});

// Dev-only handle so the game can be inspected/tested from the browser console.
if (import.meta.env.DEV) {
  const dev = window as unknown as { __game: Phaser.Game; __monsters: unknown[] };
  dev.__game = game;
  dev.__monsters = [...NORMAL_MONSTERS, ...Object.values(SPECIAL_MONSTERS), GUARD_MONSTER];
}
