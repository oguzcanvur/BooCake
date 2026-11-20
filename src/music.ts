import type Phaser from 'phaser';

/**
 * Background music, made in code with the Web Audio API (no audio file, so nothing to license).
 * An original, cute-spooky Halloween tune in D minor: a bouncy swung "monster march" with a plucked walking
 * bass, a woody skeleton-xylophone melody with creepy half-step slides, soft off-beat chord stabs, and in the
 * second half a wobbly theremin-like "ghost" voice that glides between long notes. 16 bars (about 29 s), looped.
 * It plays through Phaser's sound manager, so the sound button (mute) silences it too.
 */

const BPM = 132;
const BEAT = 60 / BPM;
/** Swing: the second eighth of each beat comes late (a lazy, bouncy triplet feel). */
const SWING = 0.64;
const VOLUME = 0.2;
const LOOKAHEAD = 2.5; // schedule this far ahead (seconds)

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

interface Bar {
  /** Bass root and fifth (low octave). */
  root: number;
  fifth: number;
  /** Chord tones for the soft off-beat stabs. */
  chord: number[];
}

const DM: Bar = { root: 38, fifth: 45, chord: [62, 65, 69] };
const GM: Bar = { root: 43, fifth: 50, chord: [62, 67, 70] };
const A7: Bar = { root: 45, fifth: 52, chord: [61, 64, 67] };
const BB: Bar = { root: 46, fifth: 53, chord: [62, 65, 70] };
const EDIM: Bar = { root: 40, fifth: 46, chord: [64, 67, 70] };

const BARS: Bar[] = [
  DM, DM, GM, A7, DM, BB, GM, A7, // phrase A: the xylophone tune
  DM, BB, GM, A7, DM, BB, EDIM, A7, // phrase B: the ghost voice
];

/** Phrase A melody: 8 eighth notes per bar (0 = rest). */
const XYLO: number[][] = [
  [62, 0, 65, 0, 69, 68, 69, 0],
  [74, 0, 72, 0, 69, 0, 65, 0],
  [67, 0, 70, 0, 74, 73, 74, 0],
  [73, 0, 70, 0, 67, 0, 64, 0],
  [62, 0, 65, 0, 69, 68, 69, 0],
  [70, 0, 74, 0, 77, 0, 74, 0],
  [79, 77, 74, 70, 67, 0, 64, 0],
  [69, 0, 0, 0, 61, 0, 0, 0],
];

/** Phrase B ghost voice: [note, length in beats] per bar (it glides from one note to the next). */
const GHOST: [number, number][][] = [
  [[74, 2], [77, 2]],
  [[74, 4]],
  [[79, 2], [77, 2]],
  [[76, 3], [73, 1]],
  [[74, 2], [81, 2]],
  [[77, 4]],
  [[76, 2], [70, 2]],
  [[73, 4]],
];

/** Little xylophone answers under the ghost voice (beat index -> note), so phrase B keeps its bounce. */
const ANSWERS: Record<number, number>[] = [
  { 3: 69 }, { 2: 70, 3: 69 }, { 3: 70 }, { 2: 69, 3: 67 },
  { 3: 69 }, { 2: 74, 3: 72 }, { 3: 70 }, { 1: 61, 2: 64, 3: 67 },
];

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

  /** An envelope-shaped oscillator; returns the oscillator so callers can bend its pitch. */
  const voice = (freq: number, when: number, type: OscillatorType, peak: number, decay: number, attack = 0.005): OscillatorNode => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    g.connect(master);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    o.connect(g);
    o.start(when);
    o.stop(when + decay + 0.05);
    return o;
  };

  /** Plucked bass: a quick triangle thump with a tiny pitch drop, like a plucked string. */
  const bass = (midi: number, when: number): void => {
    const o = voice(hz(midi) * 1.02, when, 'triangle', 0.6, 0.32);
    o.frequency.exponentialRampToValueAtTime(hz(midi), when + 0.04);
  };

  /** Skeleton xylophone: a short woody tone plus a bright knock on top. */
  const xylo = (midi: number, when: number, peak = 0.26): void => {
    voice(hz(midi), when, 'triangle', peak, 0.28);
    voice(hz(midi) * 4, when, 'sine', peak * 0.25, 0.06);
  };

  /** Soft chord stab (quiet, short). */
  const stab = (chord: number[], when: number): void => {
    for (const n of chord) voice(hz(n), when, 'square', 0.022, 0.12);
  };

  /** The ghost voice: a sine with a slow wobble (vibrato) that slides into each note. */
  const ghost = (notes: [number, number][], start: number): void => {
    const total = notes.reduce((s, [, len]) => s + len, 0) * BEAT;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(0.16, start + 0.18);
    g.gain.setValueAtTime(0.16, start + total - 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, start + total);
    g.connect(master);
    const o = ctx.createOscillator();
    o.type = 'sine';
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = 7;
    lfo.connect(depth);
    depth.connect(o.frequency);
    let t = start;
    o.frequency.setValueAtTime(hz(notes[0][0]) * 0.94, t);
    for (const [n, len] of notes) {
      // the eerie slide: a short glide up into each note
      o.frequency.exponentialRampToValueAtTime(hz(n), t + 0.12);
      t += len * BEAT;
      o.frequency.setValueAtTime(hz(n), t - 0.02);
    }
    o.connect(g);
    o.start(start);
    lfo.start(start);
    o.stop(start + total + 0.05);
    lfo.stop(start + total + 0.05);
  };

  /** Time of an eighth note within the bar (every second eighth is swung late). */
  const eighthAt = (t: number, i: number): number => t + Math.floor(i / 2) * BEAT + (i % 2) * BEAT * SWING;

  const scheduleBar = (index: number, t: number): void => {
    const b = BARS[index];
    const next = BARS[(index + 1) % BARS.length];
    // walking bass: root, fifth, root, then a step toward the next bar's root
    const approach = next.root + (next.root > b.root ? -1 : 1);
    [b.root, b.fifth, b.root + 12, approach].forEach((n, beat) => bass(n, t + beat * BEAT));
    // off-beat chord stabs on the "and" of beats 2 and 4
    for (const beat of [1, 3]) stab(b.chord, eighthAt(t, beat * 2 + 1));

    if (index < 8) {
      XYLO[index].forEach((n, i) => {
        if (n > 0) xylo(n, eighthAt(t, i));
      });
    } else {
      const k = index - 8;
      ghost(GHOST[k], t);
      for (const [beat, n] of Object.entries(ANSWERS[k])) xylo(n - 12, t + Number(beat) * BEAT + BEAT * SWING, 0.16);
    }
  };

  let bar = 0;
  let next = ctx.currentTime + 0.3;
  window.setInterval(() => {
    while (next < ctx.currentTime + LOOKAHEAD) {
      scheduleBar(bar, next);
      next += 4 * BEAT;
      bar = (bar + 1) % BARS.length;
    }
  }, 500);
}
