// Screen size, colors, font, draw order and screen layout.
// (Gameplay numbers such as prices, times and the day table live in data/gameConfig.ts.)

export const W = 1280;
export const H = 720;
/**
 * Internal render scale. The game world is laid out in 1280x720 units, but the canvas is RES times bigger
 * and every camera zooms by RES, so vector art and text stay crisp on Full HD, 2K and 4K screens.
 */
export const RES = 2;

/** Ink color of all outlines (soft art style: warm brown-maroon lines, light from the top-left). */
export const INK = 0x4a2a2e;

export const FONT = 'Fredoka, "Trebuchet MS", Verdana, sans-serif';

export const COLORS = {
  bg: 0x140d24,
  wallTop: 0x3b2a6b,
  wallBottom: 0x231a45,
  wainscot: 0x1c1438,
  counter: 0x7a4f3f,
  counterTop: 0xa8725a,
  counterShade: 0x5a3a30,
  floor: 0x1d1338,
  table: 0x4a3a80,
  tableTop: 0x6a58b0,
  panel: 0x3a2a63,
  panelEdge: 0x6a56a8,
  white: 0xffffff,
  good: 0x7dffb0,
  warn: 0xffd166,
  bad: 0xff6b6b,
  pink: 0xff8fc7,
  gold: 0xffc83d,
};

/** Draw order. Higher is drawn on top. */
export const DEPTH = {
  wall: 0,
  deco: 5,
  monster: 20,
  floor: 25,
  counter: 30,
  counterDeco: 35,
  bubble: 40,
  station: 50,
  items: 60,
  thief: 70,
  fx: 80,
  hand: 100,
  hud: 120,
  overlay: 200,
};

export const LAYOUT = {
  hudH: 56,
  /** Top edge of the counter. Customers stand behind it, stations are below it. */
  counterTop: 410,
  customerSlotsX: [260, 640, 1020],
  /** Size of the customers (the art is drawn at scale 1). */
  customerScale: 1.2,
  /** Center of a customer's head: the hands rest on the counter (100 px * customerScale lower). */
  customerY: 290,
  /** Center of the order bubble (it sits to the right of the customer's head). */
  bubbleY: 230,
  /** How far right of the customer the bubble's center is. */
  bubbleDX: 154,
  /** Center of the row with the ready tray and the trash can. */
  trayY: 488,
  /** Center of the row with the dough bowls, ovens, plate, frosting and toppings. */
  stationY: 616,
};

/**
 * The workbench has two rows. Bottom row: dough table, ovens, plates, frosting pockets, topping jars.
 * Top row: the second dough table, the tray (above the ovens), the bought plates, the trash and the second jar row.
 */
export const STATION_X = {
  oven: [312, 436],
  tray: [316, 436],
};

/** The security guard stands behind the counter, at the left end (next to the door). */
export const GUARD = { x: 92, y: 322, scale: 0.72 };

/** The two dough tables (3 bowls each): center x, width, and where each one stands (bottom edge). */
export const DOUGH_TABLES = { x: 128, w: 236, bottoms: [700, 576] };

/** The two frosting pockets (3 piping bags each), side by side. */
/** The frosting pocket (one wide cloth with all 6 piping bags, the team's drawing): center x, width, bottom edge. */
export const POCKET = { x: 901, w: 318, bottom: 700 };

/** Topping jars: 3 columns, 2 rows (bottom row first). */
export const JARS = { xs: [1098, 1166, 1234], bottoms: [700, 580], h: 112 };

/** Trash can (center), on the top row above the second frosting pocket. */
export const TRASH = { x: 1000, y: 494, h: 72 };

/**
 * The plates (preparation spots). x = center, bottom = where the plate picture stands.
 * The first two are on the workbench; the two bought in the shop sit right above them, in the same columns.
 */
export const PLATES: { x: number; bottom: number }[] = [
  { x: 560, bottom: 700 },
  { x: 680, bottom: 700 },
  { x: 560, bottom: 586 },
  { x: 680, bottom: 586 },
];
