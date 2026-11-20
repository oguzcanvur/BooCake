// Latin + Latin-extended (Turkish letters such as ş, ğ, ı, İ); other scripts are left out to keep the build small.
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/fredoka/latin-ext-600.css';
import '@fontsource/fredoka/latin-ext-700.css';
import Phaser from 'phaser';
import { H, RES, W } from './config';
import { GUARD_MONSTER, NORMAL_MONSTERS, SPECIAL_VARIANTS } from './data/monsters';
import { BootScene } from './scenes/BootScene';
import { DecorateScene } from './scenes/DecorateScene';
import { FinalScene } from './scenes/FinalScene';
import { HowToScene } from './scenes/HowToScene';
import { MenuScene } from './scenes/MenuScene';
import { MapScene } from './scenes/MapScene';
import { NightScene } from './scenes/NightScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SummaryScene } from './scenes/SummaryScene';
import { UpgradeShopScene } from './scenes/UpgradeShopScene';
import { loadGame } from './systems/save';
import { addPaperGrain, installSoftStyle, softenTextStyle } from './softStyle';

installSoftStyle();
// pick up where the player left off (browser storage)
loadGame();
addPaperGrain();

// Every text is rendered at RES x resolution so it stays sharp after the camera zoom (see config.RES).
const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
  text: (...args: unknown[]) => Phaser.GameObjects.Text;
};
const makeText = factory.text;
factory.text = function (this: unknown, ...args: unknown[]) {
  // args: x, y, text, style (style colors go through the soft art style)
  if (args.length > 3) args[3] = softenTextStyle(args[3]);
  return makeText.apply(this, args).setResolution(RES);
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  // the canvas is RES times larger than the 1280x720 world; each scene's camera zooms by RES
  width: W * RES,
  height: H * RES,
  backgroundColor: '#2e2230',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, MenuScene, HowToScene, MapScene, NightScene, PauseScene, SummaryScene, UpgradeShopScene, DecorateScene, FinalScene],
});

// Dev-only handle so the game can be inspected/tested from the browser console.
if (import.meta.env.DEV) {
  const dev = window as unknown as { __game: Phaser.Game; __monsters: unknown[] };
  dev.__game = game;
  dev.__monsters = [...NORMAL_MONSTERS, ...Object.values(SPECIAL_VARIANTS).flat(), GUARD_MONSTER];
}
