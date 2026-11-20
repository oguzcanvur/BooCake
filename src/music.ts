import type Phaser from 'phaser';

/**
 * Background music, made in code with the Web Audio API (no audio file, so nothing to license).
 * A slow, slightly spooky music-box waltz in A minor: 16 bars (about 24 s) that loop forever.
 * It plays through Phaser's sound manager, so the sound button (mute) silences it too.
 */

const EIGHTH = 0.25; // seconds per eighth note (3/4 time, 120 bpm quarter)
const VOLUME = 0.2;
const LOOKAHEAD = 2.5; // schedule this far ahead (seconds)

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// chords per bar: [bass note, triad]
const AM: [number, number[]] = [45, [57, 60, 64]];
const F: [number, number[]] = [41, [53, 57, 60]];
const E: [number, number[]] = [40, [56, 59, 64]];
const DM: [number, number[]] = [38, [53, 57, 62]];

const CHORDS: [number, number[]][] = [
  AM, AM, F, E, DM, AM, E, AM, // phrase A
  AM, DM, F, E, AM, F, E, AM, // phrase B
];

// phrase A melody: 6 eighth notes per bar, 0 = rest
const MELODY_A: number[][] = [
  [76, 0, 72, 0, 69, 72],
  [76, 0, 81, 0, 79, 76],
  [77, 0, 72, 0, 69, 72],
  [76, 0, 71, 0, 68, 71],
  [74, 0, 77, 0, 74, 69],
  [72, 0, 76, 0, 72, 69],
  [71, 0, 68, 71, 74, 76],
  [81, 0, 76, 0, 72, 0],
];

/** Phrase B: the bar's chord played as a rising and falling arpeggio, an octave up. */
function arpeggio(triad: number[]): number[] {
  const [a, b, c] = triad.map((n) => n + 12);
  return [a, b, c, b + 12, c, b];
}

let started = false;

export function startMusic(scene: Phaser.Scene): void {
  if (started) return;
  const sm = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = sm.context as AudioContext | undefined;
  if (!ctx || !sm.destination) return; // HTML5 audio fallback: no music
  started = true;

  const master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(sm.destination);

  const tone = (freq: number, when: number, type: OscillatorType, peak: number, decay: number, overtone = 0): void => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    g.connect(master);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    o.start(when);
    o.stop(when + decay + 0.05);
    if (overtone > 0) {
      // soft bell-like partial, makes the music-box sparkle
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, when);
      g2.gain.linearRampToValueAtTime(peak * overtone, when + 0.004);
      g2.gain.exponentialRampToValueAtTime(0.0001, when + decay * 0.5);
      g2.connect(master);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = freq * 3;
      o2.connect(g2);
      o2.start(when);
      o2.stop(when + decay * 0.5 + 0.05);
    }
  };

  const scheduleBar = (bar: number, t: number): void => {
    const [bass, triad] = CHORDS[bar];
    // bass on beat 1, soft chord stabs on beats 2 and 3
    tone(hz(bass), t, 'triangle', 0.55, 0.7);
    for (const beat of [1, 2]) {
      const at = t + beat * 2 * EIGHTH;
      for (const n of triad) tone(hz(n), at, 'triangle', 0.12, 0.3);
    }
    const notes = bar < 8 ? MELODY_A[bar] : arpeggio(triad);
    notes.forEach((n, i) => {
      if (n > 0) tone(hz(n), t + i * EIGHTH, 'sine', 0.3, 1.1, 0.35);
    });
  };

  let bar = 0;
  let next = ctx.currentTime + 0.3;
  window.setInterval(() => {
    while (next < ctx.currentTime + LOOKAHEAD) {
      scheduleBar(bar, next);
      next += 6 * EIGHTH;
      bar = (bar + 1) % CHORDS.length;
    }
  }, 500);
}
