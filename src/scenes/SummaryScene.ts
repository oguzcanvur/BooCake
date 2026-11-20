import Phaser from 'phaser';
import { sfx } from '../audio';
import { DEPTH, FONT, H, W } from '../config';
import { burst, fadeIn, fadeOutThen } from '../fx';
import { Shop } from '../objects/Shop';
import { decor } from '../data/decor';
import { CONFIG } from '../data/gameConfig';
import { currentNight, finishNight, gameState, isLastNight, starsFor } from '../systems/GameState';
import { leagueScore, submitLeagueScore } from '../systems/league';
import { progress, saveGame } from '../systems/save';
import { T } from '../text';
import { makeButton } from '../ui/button';
import { drawStar } from '../ui/icons';
import { drawPanel } from '../ui/panel';
import type { DayStats, NightEnd } from './NightScene';

const PANEL_W = 660;
const PANEL_H = 620;

/**
 * End-of-night screen: stars pop in one by one, stats, records, what went into the wallet and what to do next.
 * Campaign: money goes to the wallet only on the first clear or a better star record (see finishNight).
 * League: the score with its parts and the best score for this seed.
 */
export class SummaryScene extends Phaser.Scene {
  private end!: NightEnd;

  constructor() {
    super('Summary');
  }

  init(data: NightEnd): void {
    this.end = data;
  }

  create(): void {
    fadeIn(this);
    new Shop(this).update(1);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0618, 0.62).setDepth(DEPTH.bubble);
    if (this.end.mode === 'league') this.league();
    else this.campaign();
  }

  // ---------------------------------------------------------------- campaign

  private campaign(): void {
    const { earned, stats } = this.end;
    const night = currentNight();
    const index = gameState.day;
    const result = finishNight(index, earned, stats.bestStreak);
    const won = result.stars > 0;
    decor.stars += result.starsGained;
    // a cleared night continues in the shop (the last one goes to the final screen); a missed one is replayed
    progress.resumeAt = won && !isLastNight() ? 'shop' : 'night';
    saveGame();

    const panel = this.panel(won ? T.daySummaryWon(index + 1) : T.daySummaryLost, won ? '#7dffb0' : '#ff8a8a');
    this.stars(panel, result.stars, won);

    const lines = [T.earned(earned, night.goal), `${T.served(stats.served)}   ·   ${T.streakLine(stats.bestStreak)}`, this.problemLine(stats)];
    panel.add(this.add.text(0, 10, lines.join('\n'), { fontFamily: FONT, fontSize: '23px', color: '#ffffff', align: 'center', lineSpacing: 8 }).setOrigin(0.5));

    // the wallet line explains why money came in (or why not), so replays are clear
    const paidText = !won ? T.paidLost : result.firstClear ? T.paidFirst(result.paid) : result.paid > 0 ? T.paidImproved(result.paid) : T.paidNone;
    panel.add(this.add.text(0, 120, paidText, { fontFamily: FONT, fontSize: '22px', color: won && result.paid > 0 ? '#ffe08a' : '#c9bdf0', fontStyle: 'bold' }).setOrigin(0.5));
    const recs = [result.newMoney ? T.recMoney : '', result.newStreak ? T.recStreak : '', result.newStars ? T.recStars : ''].filter(Boolean);
    if (recs.length > 0) panel.add(this.add.text(0, 152, T.records(recs), { fontFamily: FONT, fontSize: '22px', color: '#7dffb0', fontStyle: 'bold' }).setOrigin(0.5));

    const bottom = H / 2 - 10 + PANEL_H / 2;
    const depth = DEPTH.hud + 2;
    if (won) {
      const last = isLastNight();
      // scenes keep the data of their last start, so the shop is told it is "between nights" (Next night button)
      makeButton(this, W / 2, bottom - 100, 320, 70, last ? T.finish : T.toShop, () => (last ? this.go('Final') : this.go('Decorate', { from: 'between' })), {
        color: 'green',
        depth,
        fontSize: 32,
      });
    } else {
      makeButton(this, W / 2, bottom - 100, 320, 70, T.retry, () => this.go('Night', { mode: 'campaign' }), { color: 'red', depth, fontSize: 32 });
    }
    makeButton(this, W / 2, bottom - 36, 220, 52, T.menu, () => this.go('Menu'), { color: 'grey', tint: 0xb9a8ff, depth, fontSize: 22 });
  }

  // ---------------------------------------------------------------- league

  private league(): void {
    const { earned, stats, seed } = this.end;
    const parts = leagueScore({ earned, happy: stats.happy, bestStreak: stats.bestStreak, lost: stats.left, burnt: stats.burnt });
    const best = submitLeagueScore(seed, parts.total);
    saveGame();

    const panel = this.panel(T.leagueOver, '#ffb4d9');
    // stars against the league's par money, just for the feeling
    this.stars(panel, starsFor(earned, CONFIG.league.par), true);

    panel.add(this.add.text(0, -56, T.score(parts.total), { fontFamily: FONT, fontSize: '44px', color: '#ffe08a', fontStyle: 'bold', stroke: '#140d24', strokeThickness: 6 }).setOrigin(0.5));
    panel.add(this.add.text(0, -2, T.scoreParts(parts), { fontFamily: FONT, fontSize: '19px', color: '#c9bdf0', align: 'center', lineSpacing: 4 }).setOrigin(0.5));
    const lines = [`$${earned}   ·   ${T.served(stats.served)}   ·   ${T.streakLine(stats.bestStreak)}`, this.problemLine(stats)];
    panel.add(this.add.text(0, 76, lines.join('\n'), { fontFamily: FONT, fontSize: '20px', color: '#ffffff', align: 'center', lineSpacing: 6 }).setOrigin(0.5));
    const bestText = best.newSeedBest ? T.leagueNewBest : T.leagueYourBest(best.prevSeedBest);
    panel.add(this.add.text(0, 140, bestText, { fontFamily: FONT, fontSize: '22px', color: best.newSeedBest ? '#7dffb0' : '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    if (best.newSeedBest) this.time.delayedCall(300, () => sfx(this, 'win', 0.5));

    const bottom = H / 2 - 10 + PANEL_H / 2;
    const depth = DEPTH.hud + 2;
    makeButton(this, W / 2, bottom - 100, 320, 70, T.raceAgain, () => fadeOutThen(this, () => this.scene.start('Night', { mode: 'league', seed })), {
      color: 'green',
      depth,
      fontSize: 32,
    });
    makeButton(this, W / 2, bottom - 36, 220, 52, T.menu, () => this.go('Menu'), { color: 'grey', tint: 0xb9a8ff, depth, fontSize: 22 });
  }

  // ---------------------------------------------------------------- parts

  /** Lost customers, then wrong / burnt / stolen / bites (only the ones that happened), on one line. */
  private problemLine(stats: DayStats): string {
    const out: string[] = [T.missed(stats.left)];
    if (stats.wrong > 0) out.push(T.wrong(stats.wrong));
    if (stats.burnt > 0) out.push(T.burntCount(stats.burnt));
    if (stats.stolen > 0) out.push(T.stolenCount(stats.stolen));
    if (stats.bites > 0) out.push(T.bitesCount(stats.bites));
    return out.join('  ·  ');
  }

  private panel(title: string, color: string): Phaser.GameObjects.Container {
    const panel = this.add.container(W / 2, H / 2 - 10).setDepth(DEPTH.hud);
    const g = this.add.graphics();
    drawPanel(g, PANEL_W, PANEL_H);
    panel.add(g);
    panel.add(
      this.add
        .text(0, -PANEL_H / 2 + 50, title, { fontFamily: FONT, fontSize: '46px', color, fontStyle: 'bold', stroke: '#140d24', strokeThickness: 7 })
        .setOrigin(0.5),
    );
    return panel;
  }

  /** Three stars that pop in one after another (`count` of them gold). */
  private stars(panel: Phaser.GameObjects.Container, count: number, cheer: boolean): void {
    const imgs: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < 3; i++) {
      const s = this.add.graphics().setPosition((i - 1) * 100, -PANEL_H / 2 + 138 + (i === 1 ? -12 : 0));
      drawStar(s, 0, 0, 38, false, 4);
      panel.add(s);
      imgs.push(s);
    }
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(450 + i * 420, () => {
        const s = imgs[i];
        s.clear();
        drawStar(s, 0, 0, 38, true, 4);
        this.tweens.add({ targets: s, scale: { from: 1.8, to: 1 }, angle: { from: -25, to: 0 }, duration: 420, ease: 'Back.easeOut' });
        sfx(this, 'star', 0.55, 1 + i * 0.18);
        burst(this, panel.x + s.x, panel.y + s.y, 'star_04', { count: 10, tint: 0xffe066, gravity: 80 });
      });
    }
    if (cheer && count > 0) {
      this.time.delayedCall(300, () => sfx(this, 'win', 0.5));
      this.confetti();
    }
  }

  private go(scene: string, data?: object): void {
    fadeOutThen(this, () => this.scene.start(scene, data));
  }

  /** A shower of stars from the top of the screen. */
  private confetti(): void {
    const emitter = this.add
      .particles(0, -20, 'fx_star_01', {
        x: { min: 0, max: W },
        speedY: { min: 80, max: 200 },
        speedX: { min: -40, max: 40 },
        lifespan: 3600,
        frequency: 70,
        quantity: 1,
        scale: { start: 0.24, end: 0.08 },
        alpha: { start: 1, end: 0.2 },
        rotate: { min: 0, max: 360 },
        tint: [0xffe066, 0xff8fc7, 0x8fffd0, 0xb98cff],
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.bubble + 1);
    this.time.delayedCall(2600, () => emitter.stop());
    this.time.delayedCall(6500, () => emitter.destroy());
  }
}
