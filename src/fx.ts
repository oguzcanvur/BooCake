import Phaser from 'phaser';
import { fxKey, type FxName } from './assets';
import { COLORS, DEPTH, FONT, H, RES, W } from './config';

/** Show the 1280x720 world on the RES-times-larger canvas (crisp on HiDPI screens). */
export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RES).centerOn(W / 2, H / 2);
}

interface BurstOptions {
  count?: number;
  tint?: number | number[];
  speed?: [number, number];
  scale?: [number, number];
  life?: number;
  gravity?: number;
  additive?: boolean;
}

/** One-shot particle burst. The emitter cleans itself up. */
export function burst(scene: Phaser.Scene, x: number, y: number, name: FxName, opts: BurstOptions = {}): void {
  const { count = 12, tint = 0xffffff, speed = [90, 240], scale = [0.35, 0.05], life = 700, gravity = 220, additive = true } = opts;
  const emitter = scene.add.particles(x, y, fxKey(name), {
    speed: { min: speed[0], max: speed[1] },
    angle: { min: 0, max: 360 },
    lifespan: life,
    scale: { start: scale[0], end: scale[1] },
    alpha: { start: 1, end: 0 },
    gravityY: gravity,
    tint,
    blendMode: additive ? 'ADD' : 'NORMAL',
    emitting: false,
  });
  emitter.setDepth(DEPTH.fx);
  emitter.explode(count);
  scene.time.delayedCall(life + 150, () => emitter.destroy());
}

/** Text that floats up and fades (money, hints, warnings). */
export function floatText(scene: Phaser.Scene, x: number, y: number, msg: string, color = '#ffffff', size = 22): void {
  const t = scene.add
    .text(x, y, msg, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold', stroke: '#140d24', strokeThickness: 5 })
    .setOrigin(0.5)
    .setDepth(DEPTH.fx + 10);
  scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

/** Gold coins that arc from one point to another (tips flying into the jar). */
export function coinFlight(
  scene: Phaser.Scene,
  from: { x: number; y: number },
  to: { x: number; y: number },
  count: number,
  onArrive?: () => void,
): void {
  for (let i = 0; i < count; i++) {
    const coin = scene.add.circle(from.x, from.y, 8, COLORS.gold).setStrokeStyle(2, 0xc98b00).setDepth(DEPTH.fx + 5);
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 650,
      delay: i * 90,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        coin.setPosition(Phaser.Math.Linear(from.x, to.x, t), Phaser.Math.Linear(from.y, to.y, t) - 90 * Math.sin(Math.PI * t));
        coin.setScale(1 - 0.35 * t);
      },
      onComplete: () => {
        coin.destroy();
        onArrive?.();
      },
    });
  }
}

/** Fade the whole camera in when a scene starts. */
export function fadeIn(scene: Phaser.Scene, ms = 350): void {
  setupCamera(scene);
  scene.cameras.main.fadeIn(ms, 58, 44, 62);
}

/** Fade out, then run `then` (usually a scene change). */
export function fadeOutThen(scene: Phaser.Scene, then: () => void, ms = 280): void {
  scene.cameras.main.fadeOut(ms, 58, 44, 62);
  scene.cameras.main.once('camerafadeoutcomplete', then);
}
