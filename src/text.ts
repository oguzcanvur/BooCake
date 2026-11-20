// Every text the player reads, in one place (English).
// To translate the game, only this file (and the ingredient names in data/recipes.ts) needs to change.

import type { SpecialId } from './data/gameConfig';

export const T = {
  tagline: 'Bake cupcakes for monsters before they get angry!',
  play: 'Play',
  howTo: 'How to Play',
  back: 'Back',
  menu: 'Menu',

  // HUD
  day: (n: number) => `Day ${n}`,
  goalOf: (earned: number, goal: number) => `$${earned} / Goal $${goal}`,

  // station titles
  dough: 'DOUGH',
  oven: 'OVEN',
  plate: 'PLATE',
  frosting: 'FROSTING',
  topping: 'TOPPING',
  tray: 'TRAY',
  trash: 'TRASH',
  ovenLocked: 'Buy in shop',
  /** Tag on an ingredient that opens on a later day. */
  fromDay: (n: number) => `Day ${n}`,

  // day intro
  dayIntro: (n: number) => `Day ${n}`,
  goal: (g: number) => `Goal: $${g}`,
  startDay: 'Start day',
  newCustomer: 'New customer',

  // hints and messages during play
  ovenFull: 'Oven is full!',
  stillBaking: 'Baking...',
  plateFull: 'All plates are full!',
  plateEmpty: 'Take a cake from the oven first',
  burntNoDecorate: "Can't decorate a burnt cake. Trash it!",
  alreadyFrosted: 'Already frosted',
  alreadyTopped: 'Already topped',
  frostingFirst: 'Frosting first!',
  nothingToServe: 'No cupcake in hand',
  notFinished: 'Add frosting and a topping first',
  burntNoServe: "Can't serve a burnt cake",
  trayNeedsFinished: 'Pick a cake first',
  burntNoTray: 'Burnt cakes go in the trash',
  plateFullTray: 'Plates are full: drag it to the tray',
  trayFull: 'Tray is full',
  nothingToTrash: 'Pick something to throw away',
  burntSelected: 'Plates are full: burnt cake picked, click the trash',
  ready: 'Ready!',
  burnt: 'Burnt!',
  wrongOrder: 'Wrong cupcake!',
  leftAngry: 'Left angry!',
  bitten: 'BITTEN!',
  garlicScares: 'Garlic!',
  ghostDrop: 'Oops!',
  thiefStole: 'The thief stole it!',
  thiefEmpty: 'Nothing to steal!',
  thiefCaught: 'Thief caught!',
  dayOver: 'DAY OVER!',
  oven_hint: 'Oven is full, wait',

  // day summary
  daySummaryWon: (n: number) => `Day ${n} complete!`,
  daySummaryLost: 'Goal not reached',
  earned: (e: number, g: number) => `Earned: $${e}   (goal $${g})`,
  served: (n: number) => `Customers served: ${n}`,
  missed: (n: number) => `Customers lost: ${n}`,
  wrong: (n: number) => `Wrong cupcakes: ${n}`,
  burntCount: (n: number) => `Burnt cakes: ${n}`,
  stolenCount: (n: number) => `Cakes stolen: ${n}`,
  bitesCount: (n: number) => `Times bitten: ${n}`,
  retry: 'Try again',
  toShop: 'Shop',
  finish: 'Finish',

  // shop
  shopTitle: 'Shop',
  wallet: (m: number) => `Your money: $${m}`,
  buy: 'Buy',
  owned: 'Owned',
  notEnough: 'Not enough money',
  paused: 'Paused',
  resume: 'Resume',
  restartDay: 'Restart day',
  mainMenu: 'Main menu',
  nextDay: 'Next day',
  garlicName: 'Garlic',
  garlicDesc: "The vampire can't bite anymore.",
  guardName: 'Security Guard',
  guardDesc: 'Catches the thief, who leaves +$5.',
  ovenName: 'Extra Oven',
  ovenDesc: 'Bake two cakes at a time.',
  plateName: 'Extra Plate',
  plateDesc: 'Room for one more cupcake (up to 4 plates).',

  // final
  finalTitle: 'You won!',
  finalText: 'BooCake is the best monster bakery in town!',
  playAgain: 'Play again',

  // how to play
  howToTitle: 'How to Play',
  howToSteps: [
    'Pick a dough: it bakes in 5 seconds. Leave it past 10 seconds and it burns!',
    'Move the baked cake to the plate, then add frosting and a topping.',
    'Give (or drag) the right cupcake to the customer. The faster, the bigger the tip! Cakes can wait on the tray, even plain ones.',
    'Watch out for special monsters: the vampire bites, the thief steals cakes. Buy protection in the shop!',
  ],
};

/** New-customer cards shown at the start of the day a special monster first appears. */
export const MONSTER_CARDS: Record<SpecialId, { name: string; text: string }> = {
  vampire: { name: 'Vampire', text: 'New customer: Vampire! Bites you, but is scared of garlic.' },
  ghost: { name: 'Ghost', text: 'New customer: Ghost! Drops the cake right through, but still pays.' },
  thief: { name: 'Thief', text: 'New customer: Thief! Grabs the cakes on the ready tray. A security guard catches him.' },
};
