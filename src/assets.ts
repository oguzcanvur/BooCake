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
/** Night view of the town with the bakery (the team's picture), behind the day map. */
export const BG_MAP = 'bg_map';

/** Workbench station pictures (the team's drawings, cut out of one sheet). */
export const STATION_SPRITES = [
  'dough_table',
  'bowl_vanilla',
  'bowl_chocolate',
  'bowl_strawberry',
  'bowl_redvelvet',
  'bowl_lemon',
  'bowl_matcha',
  'oven',
  'oven_locked',
  'plate',
  'frosting_pocket',
  'bag_pink',
  'bag_mint',
  'bag_lilac',
  'bag_vanilla',
  'bag_chocolate',
  'bag_caramel',
  'jar_sprinkles',
  'jar_cherry',
  'jar_bats',
  'jar_ghosts',
  'jar_eyes',
  'jar_spiders',
  'jar_empty',
  'tray',
  'trash',
  'trash_lid',
] as const;
export type StationSprite = (typeof STATION_SPRITES)[number];
export const stationKey = (n: StationSprite): string => `st_${n}`;

/** Customer pictures (the team's character drawings, cut out of one sheet). */
export const CHAR_SPRITES = ['wolf', 'vampire', 'ghost', 'witch', 'mummy', 'zombie'] as const;
export type CharSprite = (typeof CHAR_SPRITES)[number];
/** A character has three pictures, one per face: happy (the plain name), neutral (uneasy) and angry. */
export type CharFace = 'happy' | 'neutral' | 'angry';
export const charKey = (n: CharSprite, face: CharFace = 'happy'): string => (face === 'happy' ? `char_${n}` : `char_${n}_${face}`);
const CHAR_FILE: Record<CharFace, string> = { happy: '', neutral: '_neutral', angry: '_angry' };
/** The pictures are drawn at this many times the size they are shown at (sharp on the 2x canvas). */
export const CHAR_TEX_K = 2;
/**
 * Where each character stands in its pictures (all three faces share one frame, so they line up):
 * ox/oy = anchor (bottom center of the body, as a share of the picture), bodyW/bodyH = body size in picture pixels.
 */
export const CHAR_FRAME: Record<CharSprite, { ox: number; oy: number; bodyW: number; bodyH: number }> = {
  witch: { ox: 0.4987, oy: 0.9753, bodyW: 379.6, bodyH: 474.0 },
  wolf: { ox: 0.4956, oy: 0.9924, bodyW: 412.1, bodyH: 470.0 },
  zombie: { ox: 0.5003, oy: 0.9877, bodyW: 277.1, bodyH: 492.0 },
  mummy: { ox: 0.5078, oy: 0.9515, bodyW: 239.4, bodyH: 430.0 },
  ghost: { ox: 0.5059, oy: 0.996, bodyW: 286.0, bodyH: 430.0 },
  vampire: { ox: 0.5008, oy: 0.9964, bodyW: 282.3, bodyH: 438.0 },
};

/** The thief's pictures: standing, holding a cupcake (the cupcake itself is drawn in code), and the hand that goes over it. */
export const THIEF_KEYS = { stand: 'thief_stand', hold: 'thief_hold', hand: 'thief_hand' } as const;
/** Picture size, anchor (share of the picture) and where the cupcake sits in his hand (wrapper middle, shares of the picture). */
export const THIEF_FRAME = { w: 297, h: 440, ox: 0.4968, cupX: 0.391, cupY: 0.585 };

export const fxKey = (n: FxName): string => `fx_${n}`;
export const sfxKey = (n: SfxName): string => `sfx_${n}`;

/** Queue every asset the game uses. Call from a scene's preload(). */
export function queueAssets(scene: Phaser.Scene): void {
  scene.load.image(BG_SHOP, binaryUrl('bg/shop.webp'));
  scene.load.image(BG_MAP, binaryUrl('bg/map.webp'));
  for (const n of CHAR_SPRITES) for (const f of ['happy', 'neutral', 'angry'] as const) scene.load.image(charKey(n, f), binaryUrl(`chars/${n}${CHAR_FILE[f]}.webp`));
  scene.load.image(THIEF_KEYS.stand, binaryUrl('chars/thief.webp'));
  scene.load.image(THIEF_KEYS.hold, binaryUrl('chars/thief_hold.webp'));
  scene.load.image(THIEF_KEYS.hand, binaryUrl('chars/thief_hand.webp'));
  for (const n of STATION_SPRITES) scene.load.image(stationKey(n), binaryUrl(`stations/${n}.png`));
  for (const n of FX_NAMES) scene.load.image(fxKey(n), binaryUrl(`fx/${n}.png`));
  for (const n of SFX_NAMES) scene.load.audio(sfxKey(n), binaryUrl(`audio/${n}.ogg`));
}
