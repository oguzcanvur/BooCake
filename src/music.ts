import type Phaser from 'phaser';

/**
 * Background music, made in code with the Web Audio API (no audio file, so nothing to license).
 * An original, soft Halloween lullaby in D minor: a slow, gentle celesta (music-box) arpeggio and a velvet
 * bass, with a ghost choir singing "ooo" on top (a voice-like tone shaped by "oo" vowel filters, swelling in
 * slowly and gliding between notes), and now and then a soft wind breath. 16 bars (about 42 s), looped.
 * It plays through Phaser's sound manager, so the sound button (mute) silences it too.
 */

const BPM = 92;
const BEAT = 60 / BPM;
const VOLUME = 0.22;
const LOOKAHEAD = 3; // schedule this far ahead (seconds)

const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

interface Bar {
  /** Bass note (low octave). */
  bass: number;
  /** Chord tones for the celesta arpeggio. */
  chord: number[];
}

const DM: Bar = { bass: 38, chord: [62, 65, 69, 74] };
const BB: Bar = { bass: 34, chord: [62, 65, 70, 74] };
const GM: Bar = { bass: 43, chord: [62, 67, 70, 74] };
const A: Bar = { bass: 45, chord: [61, 64, 69, 73] };
const EDIM: Bar = { bass: 40, chord: [64, 67, 70, 76] };

const BARS: Bar[] = [DM, BB, GM, A, DM, BB, EDIM, A, DM, BB, GM, A, DM, GM, A, DM];

/** The ghost choir's "ooo" line: [note, length in beats] per bar, 0 = silence. It glides into each note. */
const OOO: [number, number][][] = [
  [[0, 4]],
  [[74, 2], [72, 2]],
  [[70, 3], [69, 1]],
  [[69, 4]],
  [[0, 2], [74, 2]],
  [[77, 2], [74, 2]],
  [[76, 2], [70, 2]],
  [[73, 4]],
  [[74, 4]],
  [[81, 2], [77, 2]],
  [[79, 3], [77, 1]],
  [[76, 4]],
  [[74, 2], [77, 2]],
  [[79, 2], [74, 2]],
  [[73, 4]],
  [[74, 4]],
];

/** Bars that start with a soft wind breath. */
const WIND_BARS = new Set([0, 8]);

let started = false;

export function startMusic(scene: Phaser.Scene): void {
  if (started) return;
  const sm = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = sm.context as AudioContext | undefined;
  if (!ctx || !sm.destination) return; // HTML5 audio fallback: no music
  started = true;

  const master = ctx.createGain();
  master.gain.value = VOLUME;
  // everything goes through a gentle low-pass, so nothing sounds buzzy or hissy
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 2200;
  soften.Q.value = 0.5;
  master.connect(soften);
  soften.connect(sm.destination);

  // a little echo (feedback delay) makes everything sound far away and dreamy
  const echo = ctx.createDelay();
  echo.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.35;
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(echoOut);
  echoOut.connect(master);

  /** A tone with a soft attack and a long fade, sent to the master and (a little) to the echo. */
  const tone = (freq: number, when: number, type: OscillatorType, peak: number, decay: number, attack = 0.01, wet = 0.5): void => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    g.connect(master);
    const send = ctx.createGain();
    send.gain.value = wet;
    g.connect(send);
    send.connect(echo);
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    o.start(when);
    o.stop(when + decay + 0.05);
  };

  /** Celesta: a pure tone plus a faint bell partial, fading slowly. */
  const celesta = (midi: number, when: number, peak = 0.11): void => {
    tone(hz(midi), when, 'sine', peak, 1.6, 0.008);
    tone(hz(midi) * 4, when, 'sine', peak * 0.12, 0.35, 0.004);
  };

  /** Velvet bass: a low sine that swells in and fades. */
  const bass = (midi: number, when: number): void => tone(hz(midi), when, 'sine', 0.42, BEAT * 3.6, 0.12, 0.1);

  /**
   * The ghost choir: two slightly detuned sawtooth voices through "oo" vowel filters (formants near 320 and
   * 800 Hz), with a slow vibrato. It swells in, glides into each new note and fades out at the end of the phrase.
   */
  const ooo = (notes: [number, number][], start: number): void => {
    let t = start;
    // split the bar into sung stretches (consecutive notes) separated by silences
    const groups: { at: number; notes: [number, number][] }[] = [];
    for (const [n, len] of notes) {
      if (n === 0) {
        t += len * BEAT;
        continue;
      }
      const last = groups[groups.length - 1];
      if (last && Math.abs(last.at + last.notes.reduce((s, [, l]) => s + l, 0) * BEAT - t) < 1e-6) last.notes.push([n, len]);
      else groups.push({ at: t, notes: [[n, len]] });
      t += len * BEAT;
    }
    for (const grp of groups) {
      const total = grp.notes.reduce((s, [, l]) => s + l, 0) * BEAT;
      const at = grp.at;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.linearRampToValueAtTime(0.9, at + 0.45);
      env.gain.setValueAtTime(0.9, at + total - 0.5);
      env.gain.exponentialRampToValueAtTime(0.0001, at + total + 0.4);
      env.connect(master);
      const send = ctx.createGain();
      send.gain.value = 0.6;
      env.connect(send);
      send.connect(echo);

      // "oo" vowel: two band-pass formant filters in parallel
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = 400;
      f1.Q.value = 2.5;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 880;
      f2.Q.value = 4;
      const f2gain = ctx.createGain();
      f2gain.gain.value = 0.35;
      f1.connect(env);
      f2.connect(f2gain);
      f2gain.connect(env);

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4.8;
      const end = at + total + 0.5;
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator();
        // triangle (not sawtooth): far fewer high harmonics, so the choir hums instead of buzzing
        o.type = 'triangle';
        o.detune.value = detune;
        const depth = ctx.createGain();
        depth.gain.value = 5;
        lfo.connect(depth);
        depth.connect(o.frequency);
        // start a little below the first note and slide up into it ("ooOOO"), then glide note to note
        let tt = at;
        // the choir sings an octave below the written line, where the "oo" vowel sounds full
        const sung = (n: number) => hz(n - 12);
        o.frequency.setValueAtTime(sung(grp.notes[0][0]) * 0.89, tt);
        for (const [n, len] of grp.notes) {
          o.frequency.exponentialRampToValueAtTime(sung(n), tt + 0.3);
          tt += len * BEAT;
          o.frequency.setValueAtTime(sung(n), tt - 0.05);
        }
        // the phrase ends with a small falling sigh
        o.frequency.exponentialRampToValueAtTime(sung(grp.notes[grp.notes.length - 1][0]) * 0.92, end);
        const voiceGain = ctx.createGain();
        voiceGain.gain.value = 0.5;
        o.connect(voiceGain);
        voiceGain.connect(f1);
        voiceGain.connect(f2);
        o.start(at);
        o.stop(end + 0.05);
      }
      lfo.start(at);
      lfo.stop(end + 0.05);
    }
  };

  /** A soft wind breath: filtered noise that rises and falls. */
  const wind = (when: number): void => {
    const len = BEAT * 6;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(400, when);
    filter.frequency.linearRampToValueAtTime(1100, when + len * 0.5);
    filter.frequency.linearRampToValueAtTime(500, when + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.035, when + len * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, when + len);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(when);
    src.stop(when + len);
  };

  const scheduleBar = (index: number, t: number): void => {
    const b = BARS[index];
    bass(b.bass, t);
    // gentle celesta arpeggio: up and back down, one note per eighth
    const [c1, c2, c3, c4] = b.chord;
    [c1, c2, c3, c4, c3 + 12, c4, c3, c2].forEach((n, i) => celesta(n + 12, t + i * BEAT * 0.5, i === 0 ? 0.12 : 0.08));
    ooo(OOO[index], t);
    if (WIND_BARS.has(index)) wind(t);
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
