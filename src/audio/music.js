// Generative region music. A lookahead scheduler (setInterval, ~120 ms) asks each active ThemePlayer to
// schedule whole bars slightly ahead of the audio clock; nothing happens per animation frame.
//
// Form: a "section" is 4 phrases (A B A' C) of 4 bars; each bar has one chord from the theme's
// progression. The lead melody is a constrained random walk over the mode (chord tones on strong steps,
// mostly stepwise motion, motif rhythm repeated in bar 3, cadence on the tonic at phrase ends), and
// phrase A is replayed later so the music has recognisable repetition. Occasionally a whole phrase
// rests (only pad / drone) to avoid fatigue. Region changes crossfade between players.
//
// Tweak themes in themes.js; instrument voicings in ThemePlayer.note() below.

import { THEMES, SCALES } from './themes.js';
import { midiToHz } from './synth.js';

const LOOKAHEAD = 0.45;  // s: schedule bars that start before now + LOOKAHEAD
const TICK_MS = 120;
const FADE = 3.5;        // s crossfade between region themes

const rnd = Math.random;
const pick = (a) => a[(rnd() * a.length) | 0];
const mod = (n, m) => ((n % m) + m) % m;

// Rhythms (in steps) per bar length; denser patterns first.
const RHYTHMS = {
  8: [[1, 1, 2, 1, 1, 2], [2, 1, 1, 2, 2], [1, 1, 1, 1, 2, 2], [3, 1, 2, 2], [2, 2, 2, 2], [3, 1, 3, 1], [2, 2, 4], [4, 2, 2], [6, 2], [4, 4]],
  6: [[1, 1, 1, 1, 2], [2, 1, 1, 2], [1, 1, 2, 2], [2, 2, 2], [3, 1, 2], [2, 1, 3], [4, 2], [3, 3]],
};
const CADENCE = { 8: [[2, 2, 4], [4, 4], [3, 1, 4], [8]], 6: [[2, 4], [3, 3], [6], [2, 1, 3]] };

export class Music {
  constructor(engine) {
    this.A = engine;
    this.players = [];
    this.themeId = null;
    this.wanted = null;
    this.combat = 0;
  }

  attach() {
    const c = this.A.ctx;
    this.out = c.createGain();
    this.out.connect(this.A.musicBus);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    if (this.wanted) { const w = this.wanted; this.wanted = null; this.setTheme(w, true); }
  }

  /** Switch to region theme `id` (crossfades). */
  setTheme(id, quick = false) {
    if (id === this.wanted) return;
    this.wanted = id;
    const c = this.A.ctx;
    if (!c || !THEMES[id]) return;
    const now = c.currentTime, fade = quick ? 1 : FADE;
    for (const p of this.players) if (!p.fading) p.fadeOut(now, fade);
    this.themeId = id;
    this.players.push(new ThemePlayer(this, THEMES[id], id, now + (quick ? 0.15 : 0.8), fade));
    this.A.musicSend.gain.setTargetAtTime(THEMES[id].verb ?? 0.3, now, 1.2);
  }

  /** Combat intensity layer, 0..1. */
  setCombat(level) { this.combat = level; }

  /** Lower the music for `seconds` (jingles). */
  duck(seconds) {
    if (!this.out) return;
    const g = this.out.gain, now = this.A.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(0.2, now, 0.08);
    g.setTargetAtTime(1, now + seconds, 0.7);
  }

  tick() {
    const A = this.A;
    if (!A.ready) return;
    const now = A.ctx.currentTime;
    const silent = A.settings.music <= 0;
    for (let i = this.players.length - 1; i >= 0; i--) {
      const p = this.players[i];
      if (p.fading && now > p.fadeEnd + 0.5) { p.dispose(); this.players.splice(i, 1); continue; }
      if (p.nextBar < now - 0.05) p.nextBar = now + 0.05; // resync after a stall / while silent
      if (!p.fading && !silent) p.scheduleUntil(now + LOOKAHEAD);
    }
  }
}

class ThemePlayer {
  constructor(M, T, id, t0, fadeIn) {
    this.M = M; this.T = T; this.id = id;
    const A = M.A, c = A.ctx;
    this.c = c; this.S = A.S;
    this.gain = c.createGain();
    this.gain.gain.setValueAtTime(0.0001, Math.max(c.currentTime, t0 - 0.05));
    this.gain.gain.linearRampToValueAtTime(1, t0 + fadeIn);
    this.gain.connect(M.out);
    this.scale = Array.isArray(T.mode) ? T.mode : SCALES[T.mode] || SCALES.ionian;
    this.stepDur = 60 / T.bpm / T.sub;
    this.steps = T.beats * T.sub;
    this.barDur = this.stepDur * this.steps;
    this.nextBar = t0;
    this.bar = 0;
    this.phraseNo = 0;
    this.fading = false;
    this.deg = 4;
    this.memA = null;
    if (T.bass?.kind === 'drone') this.makeDrone(t0);
  }

  fadeOut(now, fade) {
    this.fading = true;
    this.fadeEnd = now + fade + this.barDur;
    const g = this.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.linearRampToValueAtTime(0.0001, now + fade);
  }

  dispose() {
    try { this.drone?.forEach((o) => o.stop()); } catch { /* already stopped */ }
    try { this.gain.disconnect(); } catch { /* gone */ }
  }

  midi(deg, oct = 0) {
    const n = this.scale.length;
    return this.T.root + 12 * (Math.floor(deg / n) + oct) + this.scale[mod(deg, n)];
  }

  chordDegs(root) { return [root, root + 2, root + 4]; }

  // ---- scheduling ---------------------------------------------------------------------------------
  scheduleUntil(tEnd) {
    while (this.nextBar < tEnd) {
      try { this.scheduleBar(this.nextBar); } catch (e) { console.error('[music]', e); }
      this.nextBar += this.barDur;
      this.bar++;
    }
  }

  planPhrase() {
    const T = this.T, slot = this.phraseNo % 4;
    let ph;
    if (slot === 0 && rnd() < 0.22 && this.phraseNo > 0) ph = { form: 'R', prog: pick(T.progs), bars: null };
    else if (slot === 2 && this.memA) ph = { ...this.memA, form: 'A2' };
    else {
      const prog = slot === 3 && this.memA ? this.memA.prog : pick(T.progs);
      const lead = slot % 2 === 1 && T.lead2 ? T.lead2 : T.lead;
      const tacet = rnd() < (T.rest ?? 0.1);
      ph = { form: slot === 0 ? 'A' : slot === 1 ? 'B' : 'C', prog, lead, bars: tacet ? null : this.melody(prog, lead) };
      if (slot === 0) this.memA = ph;
    }
    this.phraseNo++;
    return ph;
  }

  /** 4 bars of lead melody: [[{step, len, deg}...] x4] */
  melody(prog, L) {
    const steps = this.steps;
    const dens = L.density ?? 0.5;
    const bank = RHYTHMS[steps] || RHYTHMS[8];
    const pickRhythm = () => {
      // density 1 -> denser patterns at the front of the bank
      const i = Math.min(bank.length - 1, Math.floor((1 - dens) * bank.length * 0.8 + rnd() * bank.length * 0.45));
      return bank[i];
    };
    const motif = pickRhythm();
    const [lo, hi] = L.range || [0, 7];
    const bars = [];
    let deg = Math.max(lo, Math.min(hi, this.deg));
    for (let b = 0; b < 4; b++) {
      const rh = b === 0 || b === 2 ? motif : b === 3 ? pick(CADENCE[steps] || CADENCE[8]) : pickRhythm();
      const chord = this.chordDegs(prog[b]);
      const notes = [];
      let s = 0;
      for (let i = 0; i < rh.length; i++) {
        const len = rh[i];
        const strong = s === 0 || (s % (this.T.sub * 2) === 0);
        const last = b === 3 && i === rh.length - 1;
        if (last) {
          // cadence: nearest tonic/chord root
          const target = prog[3];
          deg = nearest(deg, (d) => mod(d - target, 7) === 0, lo, hi);
        } else if (strong) {
          deg = nearest(deg + (rnd() < 0.5 ? -1 : 1), (d) => chord.some((c) => mod(d - c, 7) === 0), lo, hi);
        } else {
          const r = rnd();
          let step = r < 0.32 ? 1 : r < 0.64 ? -1 : r < 0.76 ? 2 : r < 0.88 ? -2 : r < 0.94 ? 0 : (rnd() < 0.5 ? 3 : -4);
          if (L.falling && rnd() < 0.4) step = -Math.abs(step || 1);
          deg += step;
          if (deg > hi) deg -= 2; if (deg < lo) deg += 2;
        }
        const rest = !strong && !last && rnd() < (1 - dens) * 0.35;
        if (!rest) notes.push({ step: s, len, deg });
        s += len;
      }
      bars.push(notes);
    }
    this.deg = deg;
    return bars;
  }

  scheduleBar(t0) {
    const T = this.T;
    const bi = this.bar % 4;
    if (bi === 0) this.phrase = this.planPhrase();
    const ph = this.phrase;
    const chordRoot = ph.prog[bi];
    const chord = this.chordDegs(chordRoot);
    const sd = this.stepDur, steps = this.steps;
    const hum = () => (rnd() - 0.5) * 0.012;
    const resting = ph.form === 'R';

    // lead
    if (ph.bars) {
      const L = ph.lead;
      for (const n of ph.bars[bi]) {
        const t = t0 + n.step * sd + hum();
        const vel = (L.vel ?? 0.5) * (n.step === 0 ? 1 : 0.85) * (0.9 + rnd() * 0.2);
        const m = this.midi(n.deg, L.oct || 0);
        if (L.ornament && n.len >= 2 && rnd() < L.ornament) {
          this.note(L.inst, t, this.midi(n.deg + 1, L.oct || 0), sd * 0.25, vel * 0.7, L);
          this.note(L.inst, t + sd * 0.25, m, n.len * sd - sd * 0.25, vel, L);
        } else this.note(L.inst, t, m, n.len * sd, vel, L);
      }
    }

    // accompaniment
    const Ac = T.accomp || { kind: 'none' };
    const accVel = (Ac.vel ?? 0.3) * (resting ? 0.6 : 1);
    if (Ac.kind === 'arp') {
      const tones = Ac.wide ? [chord[0], chord[1], chord[2], chord[0] + 7, chord[1] + 7, chord[2] + 7] : [chord[0], chord[1], chord[2], chord[0] + 7];
      const order = bi % 2 === 0 ? [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 5] : [0, 2, 1, 3, 1, 2, 0, 2, 3, 4, 5, 3];
      const every = Ac.every || 1;
      for (let s = 0, k = 0; s < steps; s += every, k++) {
        const d = tones[order[k % order.length] % tones.length];
        this.note(Ac.inst || 'harp', t0 + s * sd + hum(), this.midi(d, Ac.oct || 0), sd * every, accVel * (s === 0 ? 1.15 : 0.85));
      }
    } else if (Ac.kind === 'strum') {
      const beat = T.sub;
      for (let s = 0; s < steps; s += beat) {
        const strong = s === 0 || (!Ac.beatsOnly && s === steps / 2);
        if (!strong && Ac.beatsOnly) continue;
        const notes = strong ? [chord[0], chord[2], chord[0] + 7, chord[1] + 7] : [chord[2], chord[1] + 7];
        notes.forEach((d, i) => this.note(Ac.inst || 'lute', t0 + s * sd + i * 0.018, this.midi(d, Ac.oct || 0), sd * beat, accVel * (strong ? 1 : 0.6)));
      }
    } else if (Ac.kind === 'pad' || T.pad) {
      // handled below with T.pad defaults
    }
    if (Ac.kind === 'pad' || T.pad) {
      const pv = (T.pad?.vel ?? 0.13) * (resting ? 0.8 : 1);
      this.pad(t0, [this.midi(chord[0], -1), this.midi(chord[1], -1), this.midi(chord[2], -1)], this.barDur, pv, T.pad?.dark);
    }

    // bass
    const B = T.bass;
    if (B) {
      const bv = B.vel ?? 0.5;
      if (B.kind === 'drone') this.setDrone(t0, chordRoot);
      else if (B.kind === 'root') this.note(B.inst || 'bass', t0, this.midi(chordRoot, B.oct ?? -2), this.barDur, bv);
      else if (B.kind === 'rootfifth') {
        this.note(B.inst || 'bass', t0, this.midi(chordRoot, B.oct ?? -2), this.barDur / 2, bv);
        if (!resting) this.note(B.inst || 'bass', t0 + this.barDur / 2, this.midi(chordRoot + 4, (B.oct ?? -2) - 1), this.barDur / 2, bv * 0.8);
      } else if (B.kind === 'walk') {
        const next = ph.prog[(bi + 1) % 4];
        const walk = [chordRoot, chordRoot + 2, chordRoot + 4, next + (next > chordRoot ? -1 : 1)];
        for (let k = 0; k < T.beats; k++) this.note(B.inst || 'bass', t0 + k * T.sub * sd, this.midi(walk[k % 4], B.oct ?? -1), T.sub * sd, bv * (k === 0 ? 1 : 0.75));
      }
    }

    // drums (+ combat layer on the live player)
    if (!resting && T.drums?.length) {
      const pat = T.drums[this.bar % T.drums.length];
      for (const [s, kind, v] of pat) if (s < steps) this.drum(kind, t0 + s * sd + hum(), v);
    }
    const cb = this.M.combat;
    if (cb > 0 && !this.fading) {
      for (let s = 0; s < steps; s += T.sub) {
        this.drum('tom', t0 + s * sd, (s === 0 ? 0.55 : 0.32) * cb);
        if (T.sub > 1) this.drum('tick', t0 + (s + T.sub / 2) * sd, 0.15 * cb);
      }
      this.note('bass', t0, this.midi(chordRoot, -2), sd * 2, 0.35 * cb);
      this.note('bass', t0 + this.barDur / 2, this.midi(chordRoot, -2), sd * 2, 0.3 * cb);
    }
  }

  // ---- instruments --------------------------------------------------------------------------------
  note(inst, t, midi, len, vel, L = {}) {
    const S = this.S, d = this.gain;
    const f = midiToHz(midi);
    switch (inst) {
      case 'lute': return S.pluck(d, t, midi, vel * 0.5, 'lute');
      case 'harp': return S.pluck(d, t, midi, vel * 0.45, 'harp');
      case 'bass': return S.pluck(d, t, midi, vel * 0.6, 'bass');
      case 'flute': {
        const hold = Math.max(0.02, len - 0.16);
        S.tone(d, t, { type: 'triangle', f: f * 2, a: 0.07, hold, dur: 0.15, gain: vel * 0.012 });
        S.noise(d, t, { f: Math.min(8000, f * 2), q: 2, a: 0.015, dur: 0.07, gain: vel * 0.03 });
        return S.tone(d, t, { f, a: 0.07, hold, dur: 0.2, gain: vel * 0.15, vib: { rate: 5, depth: L.vib || 8 } });
      }
      case 'horn': {
        const hold = Math.max(0.02, len - 0.2);
        const filter = { f: Math.min(1800, f * 3), q: 0.7 };
        S.tone(d, t, { type: 'sawtooth', f, detune: 6, a: 0.09, hold, dur: 0.25, gain: vel * 0.045, filter });
        return S.tone(d, t, { type: 'sawtooth', f, detune: -6, a: 0.09, hold, dur: 0.25, gain: vel * 0.045, filter, vib: { rate: 4.5, depth: 6 } });
      }
      case 'bell': {
        S.tone(d, t, { f: f * 2.76, dur: 0.6, gain: vel * 0.03, a: 0.002 });
        S.tone(d, t, { f: f * 5.4, dur: 0.25, gain: vel * 0.012, a: 0.002 });
        return S.tone(d, t, { f, dur: 1.8, gain: vel * 0.12, a: 0.003 });
      }
      default: return S.pluck(d, t, midi, vel * 0.45, 'harp');
    }
  }

  pad(t, midis, len, vel, dark) {
    const S = this.S, a = Math.min(0.9, len * 0.35), hold = Math.max(0.05, len - a);
    const filter = { f: dark ? 600 : 1100, q: 0.5 };
    for (const m of midis) {
      const f = midiToHz(m);
      S.tone(this.gain, t, { type: 'triangle', f, detune: 7, a, hold, dur: 0.9, gain: vel * 0.09, filter });
      S.tone(this.gain, t, { type: 'triangle', f, detune: -7, a, hold, dur: 0.9, gain: vel * 0.09, filter });
    }
  }

  drum(kind, t, v) {
    const S = this.S, d = this.gain;
    switch (kind) {
      case 'frame': S.noise(d, t, { f: 700, q: 1, dur: 0.05, gain: v * 0.08 }); return S.tone(d, t, { f: 115, f2: 60, dur: 0.22, gain: v * 0.45 });
      case 'tom': S.noise(d, t, { type: 'lowpass', f: 300, dur: 0.1, gain: v * 0.15 }); return S.tone(d, t, { f: 95, f2: 50, dur: 0.35, gain: v * 0.55 });
      case 'tick': return S.noise(d, t, { type: 'highpass', f: 4500, dur: 0.025, gain: v * 0.12 });
      case 'shaker': return S.noise(d, t, { f: 7000, q: 1, a: 0.012, dur: 0.05, gain: v * 0.12 });
      default: return t;
    }
  }

  // continuous low drone (root + fifth) through a slowly breathing lowpass
  makeDrone(t0) {
    const c = this.c, T = this.T;
    const g = c.createGain();
    g.gain.value = (T.bass.vel ?? 0.12) * 0.5;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.8;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 160;
    lfo.connect(lg).connect(lp.frequency);
    lp.connect(g).connect(this.gain);
    const oct = T.bass.oct ?? -1;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), o3 = c.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'sine';
    o1.frequency.value = midiToHz(this.midi(0, oct)); o2.frequency.value = midiToHz(this.midi(4, oct)); o3.frequency.value = midiToHz(this.midi(0, oct - 1));
    o2.detune.value = 5;
    const og3 = c.createGain(); og3.gain.value = 2.5;
    o1.connect(lp); o2.connect(lp); o3.connect(og3).connect(g);
    for (const o of [o1, o2, o3, lfo]) o.start(t0);
    this.drone = [o1, o2, o3, lfo];
    this.droneRoot = 0;
  }

  setDrone(t, root) {
    if (!this.drone) return;
    // drones mostly hold the tonic; follow the chord only on the phrase's first bar
    const target = this.bar % 4 === 0 ? (rnd() < 0.7 ? 0 : root) : this.droneRoot;
    if (target === this.droneRoot) return;
    this.droneRoot = target;
    const oct = this.T.bass.oct ?? -1;
    this.drone[0].frequency.setTargetAtTime(midiToHz(this.midi(target, oct)), t, 0.4);
    this.drone[1].frequency.setTargetAtTime(midiToHz(this.midi(target + 4, oct)), t, 0.4);
    this.drone[2].frequency.setTargetAtTime(midiToHz(this.midi(target, oct - 1)), t, 0.4);
  }
}

/** Nearest degree to `from` (searching outward) satisfying ok(), kept within [lo, hi]. */
function nearest(from, ok, lo, hi) {
  for (let k = 0; k <= 7; k++) {
    for (const d of rnd() < 0.5 ? [from - k, from + k] : [from + k, from - k]) if (d >= lo && d <= hi && ok(d)) return d;
  }
  return Math.max(lo, Math.min(hi, from));
}
