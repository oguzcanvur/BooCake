// Screen size, colors, font, draw order and screen layout.
// (Gameplay numbers such as prices, times and the day table live in data/gameConfig.ts.)

export const W = 1280;
export const H = 720;

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
  counterTop: 338,
  customerSlotsX: [260, 640, 1020],
  /** Center of a customer's body. */
  customerY: 262,
  /** Center of the order bubble. */
  bubbleY: 128,
  /** Center of the row with the ready tray and the trash can. */
  trayY: 416,
  /** Center of the row with the dough bowls, ovens, plate, frosting and toppings. */
  stationY: 604,
};

/** Horizontal centers of everything on the table. */
export const STATION_X = {
  dough: [72, 144, 216],
  oven: [328, 452, 576],
  plate: 717,
  frosting: [832, 904, 976],
  topping: [1062, 1134, 1206],
  tray: [150, 270],
  trash: 1196,
  guard: 430,
};
