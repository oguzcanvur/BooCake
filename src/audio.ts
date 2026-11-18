import type Phaser from 'phaser';
import { sfxKey, type SfxName } from './assets';

const MUTE_KEY = 'boocake.muted';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(scene: Phaser.Scene, muted: boolean): void {
  scene.sound.mute = muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* storage can be unavailable (private mode); mute just won't persist */
  }
}

/** Apply the saved mute setting (call once at startup). */
export function applySavedMute(scene: Phaser.Scene): void {
  scene.sound.mute = isMuted();
}

/** Play a one-shot sound effect. */
export function sfx(scene: Phaser.Scene, name: SfxName, volume = 0.5, rate = 1): void {
  scene.sound.play(sfxKey(name), { volume, rate });
}
