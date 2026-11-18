import type Phaser from 'phaser';

// All files live in src/assets (see CREDITS.md for sources and licenses).
// They are embedded into the JavaScript bundle as data URIs, so the finished game is ONE html file that
// works by double-click (a browser blocks loading separate files when a page is opened from disk).

const binaryFiles = import.meta.glob('./assets/**/*.{png,ogg}', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>;

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

export const fxKey = (n: FxName): string => `fx_${n}`;
export const sfxKey = (n: SfxName): string => `sfx_${n}`;

/** Queue every asset the game uses. Call from a scene's preload(). */
export function queueAssets(scene: Phaser.Scene): void {
  for (const n of FX_NAMES) scene.load.image(fxKey(n), binaryUrl(`fx/${n}.png`));
  for (const n of SFX_NAMES) scene.load.audio(sfxKey(n), binaryUrl(`audio/${n}.ogg`));
}
