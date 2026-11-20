import type Phaser from 'phaser';

// All files live in src/assets (see CREDITS.md for sources and licenses).
// They are embedded into the JavaScript bundle as data URIs, so the finished game is ONE html file that
// works by double-click (a browser blocks loading separate files when a page is opened from disk).

const binaryFiles = import.meta.glob('./assets/**/*.{png,ogg,webp}', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;

function binaryUrl(path: string): string {
  const url = binaryFiles[`./assets/${path}`];
  if (!url) throw new Error(`Missing asset: ${path}`);
  return url;
}

export const FX_NAMES = [
  'star_01',
  'star_04',
  'spark_01',
  'spark_05',
  'smoke_01',
  'smoke_05',
  'circle_05',
  'flame_01',
  'magic_02',
  'light_01',
] as const;

export const SFX_NAMES = [
  'ui_click',
  'pickup',
  'place',
  'bake_start',
  'serve_ok',
  'serve_wrong',
  'burnt',
  'trash',
  'customer_arrive',
  'customer_left',
  'tick',
  'win',
  'star',
  'nope',
  'night_start',
  'oven_ready',
  'coin',
] as const;

export type FxName = (typeof FX_NAMES)[number];
export type SfxName = (typeof SFX_NAMES)[number];

/** Game logo (the team's art, background cut away). Loaded first by BootScene so the splash screen can show it. */
export const LOGO = 'logo';
export function queueLogo(scene: Phaser.Scene): void {
  scene.load.image(LOGO, binaryUrl('ui/logo.webp'));
}

/** Shop interior painting behind the counter (the team's background art). */
export const BG_SHOP = 'bg_shop';

/** Workbench station pictures (the team's drawings, cut out of one sheet). */
export const STATION_SPRITES = [
  'dough_table',
  'bowl_vanilla',
  'bowl_chocolate',
  'bowl_strawberry',
  'oven',
  'oven_locked',
  'plate',
  'frosting_pocket',
  'bag_pink',
  'bag_mint',
  'bag_lilac',
  'jar_sprinkles',
  'jar_eyes',
  'jar_spiders',
  'tray',
  'trash',
] as const;
export type StationSprite = (typeof STATION_SPRITES)[number];
export const stationKey = (n: StationSprite): string => `st_${n}`;

/** Customer pictures (the team's character drawings, cut out of one sheet). */
export const CHAR_SPRITES = ['wolf', 'vampire', 'ghost', 'witch', 'mummy', 'zombie'] as const;
export type CharSprite = (typeof CHAR_SPRITES)[number];
export const charKey = (n: CharSprite): string => `char_${n}`;

export const fxKey = (n: FxName): string => `fx_${n}`;
export const sfxKey = (n: SfxName): string => `sfx_${n}`;

/** Queue every asset the game uses. Call from a scene's preload(). */
export function queueAssets(scene: Phaser.Scene): void {
  scene.load.image(BG_SHOP, binaryUrl('bg/shop.webp'));
  for (const n of CHAR_SPRITES) scene.load.image(charKey(n), binaryUrl(`chars/${n}.png`));
  for (const n of STATION_SPRITES) scene.load.image(stationKey(n), binaryUrl(`stations/${n}.png`));
  for (const n of FX_NAMES) scene.load.image(fxKey(n), binaryUrl(`fx/${n}.png`));
  for (const n of SFX_NAMES) scene.load.audio(sfxKey(n), binaryUrl(`audio/${n}.ogg`));
}
