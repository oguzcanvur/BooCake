// Every text the player reads, in one place (Turkish, as in the design document).
// To translate the game, only this file needs to change.

import type { SpecialId } from './data/gameConfig';

export const T = {
  tagline: 'Bake cupcakes for monsters before they get angry!',
  play: 'Oyna',
  howTo: 'Nasıl Oynanır',
  back: 'Geri',
  menu: 'Menü',

  // HUD
  day: (n: number) => `Gün ${n}`,
  goalOf: (earned: number, goal: number) => `$${earned} / Hedef $${goal}`,

  // station titles
  dough: 'HAMUR',
  oven: 'FIRIN',
  plate: 'TABAK',
  frosting: 'KREMA',
  topping: 'TOPPING',
  tray: 'HAZIR TEPSİ',
  trash: 'ÇÖP',
  ovenLocked: 'Dükkândan al',

  // day intro
  dayIntro: (n: number) => `Gün ${n}`,
  goal: (g: number) => `Hedef: $${g}`,
  openShop: 'Dükkânı aç',
  newCustomer: 'Yeni müşteri',

  // hints and messages during play
  ovenFull: 'Fırın dolu!',
  stillBaking: 'Pişiyor...',
  plateFull: 'Tabak dolu!',
  plateEmpty: 'Önce fırından bir kek al',
  burntNoDecorate: 'Yanık kek süslenemez. Çöpe at!',
  alreadyFrosted: 'Zaten kremalı',
  alreadyTopped: 'Zaten süslü',
  frostingFirst: 'Önce krema!',
  nothingToServe: 'Elinde cupcake yok',
  notFinished: 'Önce krema ve topping ekle',
  burntNoServe: 'Yanık kek servis edilmez',
  trayNeedsFinished: 'Tepsiye tamamlanmış cupcake koy',
  trayFull: 'Tepsi dolu',
  nothingToTrash: 'Çöpe atılacak bir şey seç',
  burntSelected: 'Tabak dolu: yanık kek seçildi, çöpe tıkla',
  ready: 'Hazır!',
  burnt: 'Yandı!',
  wrongOrder: 'Yanlış cupcake!',
  leftAngry: 'Kızıp gitti!',
  bitten: 'ISIRILDIN!',
  garlicScares: 'Sarımsak!',
  ghostDrop: 'Hay aksi!',
  thiefStole: 'Hırsız çaldı!',
  thiefEmpty: 'Çalacak bir şey yok!',
  thiefCaught: 'Hırsız yakalandı!',
  dayOver: 'GÜN BİTTİ!',
  oven_hint: 'Fırın dolu, bekle',

  // day summary
  daySummaryWon: (n: number) => `Gün ${n} tamamlandı!`,
  daySummaryLost: 'Hedefe ulaşılamadı',
  earned: (e: number, g: number) => `Kazanılan: $${e}   (hedef $${g})`,
  served: (n: number) => `Servis edilen müşteri: ${n}`,
  missed: (n: number) => `Kaçan müşteri: ${n}`,
  wrong: (n: number) => `Yanlış cupcake: ${n}`,
  burntCount: (n: number) => `Yanan kek: ${n}`,
  retry: 'Tekrar dene',
  toShop: 'Dükkân',
  finish: 'Bitir',

  // shop
  shopTitle: 'Dükkân',
  wallet: (m: number) => `Cebindeki para: $${m}`,
  buy: 'Satın al',
  owned: 'Satın alındı',
  notEnough: 'Para yetmiyor',
  nextDay: 'Sonraki gün',
  garlicName: 'Sarımsak',
  garlicDesc: 'Vampir artık ısırmaz.',
  guardName: 'Güvenlik Görevlisi',
  guardDesc: 'Hırsız yakalanır ve +$5 bırakır.',
  ovenName: 'Ekstra Fırın',
  ovenDesc: 'Aynı anda bir kek daha pişir (en fazla 3 fırın).',

  // final
  finalTitle: 'Kazandın!',
  finalText: 'BooCake şehrin en iyi canavar pastanesi!',
  playAgain: 'Tekrar oyna',

  // how to play
  howToTitle: 'Nasıl Oynanır',
  howToSteps: [
    'Hamur seç: fırında 5 saniyede pişer. 10 saniyeyi geçirirsen yanar!',
    'Pişen keki tabağa al, sonra krema ve topping ekle.',
    'Doğru cupcake\'i müşteriye ver. Ne kadar hızlıysan o kadar bahşiş! Hazır kekleri tepside bekletebilirsin.',
    'Özel canavarlara dikkat: vampir ısırır, hırsız kek çalar. Dükkândan önlem al!',
  ],
};

/** New-customer cards shown at the start of the day a special monster first appears. */
export const MONSTER_CARDS: Record<SpecialId, { name: string; text: string }> = {
  vampire: { name: 'Vampir', text: 'Yeni müşteri: Vampir! Seni ısırır, sarımsaktan korkar.' },
  ghost: { name: 'Hayalet', text: 'Yeni müşteri: Hayalet! Keki elinden düşürür ama yine de öder.' },
  thief: { name: 'Hırsız', text: 'Yeni müşteri: Hırsız! Hazır tepsideki kekleri kapar. Güvenlik görevlisi onu yakalar.' },
};
