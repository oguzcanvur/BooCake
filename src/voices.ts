import type Phaser from 'phaser';

/**
 * Short voices the customers make when they arrive (about 1-2 s each), made in code with the Web Audio API
 * (no audio files, nothing to license). Each one is a buzzy "vocal cord" tone shaped by two vowel filters
 * (formants), so it sounds like a little cartoon voice:
 *   ghost "wooo~", witch "hehehe!", werewolf "auuuu!", vampire "mwa-ha-ha", mummy "mmmhh...", zombie "uuurgh",
 *   thief: sneaky tiptoe plucks.
 * They play through Phaser's sound manager, so the mute button silences them too.
 */

export type VoiceId = 'ghost' | 'witch' | 'wolf' | 'vampire' | 'mummy' | 'zombie' | 'thief';

const VOLUME = 0.32;

/** Vowel formants (Hz): first and second resonance of the mouth. */
const VOWELS = {
  u: [320, 800],
  o: [450, 850],
  a: [750, 1200],
  e: [500, 1900],
  m: [250, 1200],
} as const;
type Vowel = keyof typeof VOWELS;

/** A voice "segment": pitch from/to (Hz), vowel, start and length (s), loudness. */
interface Seg {
  f0: number;
  f1: number;
  vowel: Vowel;
  to?: Vowel;
  at: number;
  len: number;
  amp?: number;
  /** Vibrato depth in Hz (wobble). */
  wob?: number;
  /** Add a breathy "h" at the start. */
  breath?: boolean;
}

const VOICES: Record<Exclude<VoiceId, 'thief'>, Seg[]> = {
  // a long floating "wooo" that rises and falls, with a slow wobble
  ghost: [{ f0: 260, f1: 330, vowel: 'u', to: 'o', at: 0, len: 0.7, amp: 0.8, wob: 9 }, { f0: 330, f1: 200, vowel: 'o', to: 'u', at: 0.7, len: 0.9, amp: 0.8, wob: 12 }],
  // a quick high cackle: "he-he-he-heee"
  witch: [
    { f0: 620, f1: 560, vowel: 'e', at: 0, len: 0.13, breath: true },
    { f0: 600, f1: 540, vowel: 'e', at: 0.17, len: 0.13, breath: true },
    { f0: 580, f1: 520, vowel: 'e', at: 0.34, len: 0.13, breath: true },
    { f0: 640, f1: 480, vowel: 'e', at: 0.51, len: 0.45, breath: true, wob: 18 },
  ],
  // a howl: "a-uuuuu" rising, then falling away
  wolf: [{ f0: 220, f1: 420, vowel: 'a', to: 'u', at: 0, len: 0.55, amp: 0.9 }, { f0: 420, f1: 300, vowel: 'u', at: 0.55, len: 1.0, amp: 0.9, wob: 7 }],
  // a low, grand laugh: "mwa-ha-ha"
  vampire: [
    { f0: 150, f1: 170, vowel: 'm', to: 'a', at: 0, len: 0.32 },
    { f0: 170, f1: 150, vowel: 'a', at: 0.42, len: 0.18, breath: true },
    { f0: 160, f1: 135, vowel: 'a', at: 0.66, len: 0.28, breath: true },
  ],
  // a slow sleepy groan with the mouth closed: "mmmhh..."
  mummy: [{ f0: 140, f1: 110, vowel: 'm', to: 'o', at: 0, len: 1.3, amp: 0.85, wob: 4 }],
  // a dragging "uuurgh", falling at the end
  zombie: [{ f0: 115, f1: 105, vowel: 'u', to: 'o', at: 0, len: 0.8, amp: 0.9, wob: 3 }, { f0: 105, f1: 80, vowel: 'o', to: 'a', at: 0.8, len: 0.5, amp: 0.8 }],
};

/** Play the arrival voice of a character. Does nothing without Web Audio. */
export function playVoice(scene: Phaser.Scene, id: VoiceId): void {
  const sm = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = sm.context as AudioContext | undefined;
  if (!ctx || !sm.destination || sm.mute) return;
  const out = ctx.createGain();
  out.gain.value = VOLUME;
  // a gentle low-pass so nothing sounds harsh
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 3200;
  out.connect(soften);
  soften.connect(sm.destination);
  const t0 = ctx.currentTime + 0.02;
  if (id === 'thief') sneak(ctx, out, t0);
  else VOICES[id].forEach((s) => segment(ctx, out, t0, s));
}

/** One sung piece: a sawtooth "voice" through two formant filters, with an envelope, glide and wobble. */
function segment(ctx: AudioContext, out: AudioNode, t0: number, s: Seg): void {
  const at = t0 + s.at;
  const end = at + s.len;
  const amp = s.amp ?? 1;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.linearRampToValueAtTime(amp, at + Math.min(0.05, s.len * 0.3));
  env.gain.setValueAtTime(amp, Math.max(at + 0.05, end - Math.min(0.12, s.len * 0.4)));
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  env.connect(out);

  const [a1, a2] = VOWELS[s.vowel];
  const [b1, b2] = VOWELS[s.to ?? s.vowel];
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.Q.value = 4;
  f1.frequency.setValueAtTime(a1, at);
  f1.frequency.linearRampToValueAtTime(b1, end);
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.Q.value = 6;
  f2.frequency.setValueAtTime(a2, at);
  f2.frequency.linearRampToValueAtTime(b2, end);
  const g2 = ctx.createGain();
  g2.gain.value = 0.45;
  f1.connect(env);
  f2.connect(g2);
  g2.connect(env);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(s.f0, at);
  osc.frequency.exponentialRampToValueAtTime(s.f1, end);
  if (s.wob) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = s.wob;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(at);
    lfo.stop(end + 0.05);
  }
  osc.connect(f1);
  osc.connect(f2);
  osc.start(at);
  osc.stop(end + 0.05);

  if (s.breath) {
    // a short puff of filtered noise before the vowel: the "h" in "he" / "ha"
    const len = 0.05;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 2200;
    hp.Q.value = 1;
    const ng = ctx.createGain();
    ng.gain.value = 0.35 * amp;
    src.connect(hp);
    hp.connect(ng);
    ng.connect(out);
    src.start(at - 0.03);
  }
}

/** The thief: four quiet, sneaky tiptoe plucks going down, then one more on tiptoe. */
function sneak(ctx: AudioContext, out: AudioNode, t0: number): void {
  const notes = [392, 349, 311, 294, 392];
  notes.forEach((f, i) => {
    const at = t0 + i * 0.22 + (i === 4 ? 0.12 : 0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.7, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    g.connect(out);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(g);
    o.start(at);
    o.stop(at + 0.2);
  });
}
