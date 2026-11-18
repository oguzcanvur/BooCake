import type Phaser from 'phaser';

// All files live in public/assets (see CREDITS.md for sources and licenses).

export const UI_IMAGES = [
  'btn_blue',
  'btn_green',
  'btn_grey',
  'btn_red',
  'btn_yellow',
  'btn_round_grey',
  'btn_square_grey',
  'star',
  'star_empty',
] as const;

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

export type UiImage = (typeof UI_IMAGES)[number];
export type FxName = (typeof FX_NAMES)[number];
export type SfxName = (typeof SFX_NAMES)[number];

export const MONSTER_ATLAS = 'monsters';
export const fxKey = (n: FxName): string => `fx_${n}`;
export const sfxKey = (n: SfxName): string => `sfx_${n}`;

/** Queue every asset the game uses. Call from a scene's preload(). */
export function queueAssets(scene: Phaser.Scene): void {
  scene.load.setPath('assets/');
  scene.load.atlasXML(MONSTER_ATLAS, 'monsters/monsters.png', 'monsters/monsters.xml');
  for (const n of UI_IMAGES) scene.load.image(n, `ui/${n}.png`);
  for (const n of FX_NAMES) scene.load.image(fxKey(n), `fx/${n}.png`);
  for (const n of SFX_NAMES) scene.load.audio(sfxKey(n), `audio/${n}.ogg`);
}
