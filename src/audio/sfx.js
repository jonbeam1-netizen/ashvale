// Procedural sound effects. Every entry of SOUNDS is (S: Synth, out: AudioNode, t: start time, o: opts)
// -> end time. They are built from noise bursts, filtered oscillators and Karplus-Strong plucks only.
//
//   game.audio.sfx.play(name, at?, { vol, range, priority, minGap, ...soundOpts })
//
// `at` = entity or {x, y} tile for positional sounds (null = at the listener). Tweak a sound by editing
// its recipe below; levels are deliberately modest (the master bus has a limiter).

const r = (a, b) => a + Math.random() * (b - a);
const vary = (x, amt = 0.06) => x * (1 + (Math.random() * 2 - 1) * amt);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// ---- building blocks ------------------------------------------------------------------------------
function thud(S, out, t, f = 110, g = 0.4, d = 0.12) {
  S.tone(out, t, { f: vary(f), f2: f * 0.5, dur: d, gain: g });
  return S.noise(out, t, { type: 'lowpass', f: 500, dur: d * 0.6, gain: g * 0.5 });
}
function whoosh(S, out, t, f1, f2, d = 0.2, g = 0.2, q = 1.4) {
  return S.noise(out, t, { f: f1, f2, q, a: d * 0.35, dur: d * 0.65, gain: g });
}
function clink(S, out, t, base, g = 0.12, d = 0.18) {
  const ratios = [1, 1.51, 2.27, 3.03];
  let end = t;
  for (let i = 0; i < ratios.length; i++) end = Math.max(end, S.tone(out, t, { f: vary(base * ratios[i], 0.02), dur: d * (1 - i * 0.18), gain: g / (1 + i * 0.6), a: 0.001 }));
  S.noise(out, t, { type: 'highpass', f: 3000, dur: 0.015, gain: g * 0.8 });
  return end;
}
function coins(S, out, t, n = 5, g = 0.09) {
  let end = t;
  for (let i = 0; i < n; i++) {
    const tt = t + i * r(0.03, 0.07);
    end = Math.max(end, S.tone(out, tt, { f: r(2800, 4800), dur: r(0.06, 0.14), gain: g, a: 0.001 }));
    S.tone(out, tt, { f: r(5200, 7000), dur: 0.04, gain: g * 0.4, a: 0.001 });
  }
  return end;
}
function crackles(S, out, t, n, span, g = 0.12) {
  let end = t;
  for (let i = 0; i < n; i++) end = Math.max(end, S.noise(out, t + Math.random() * span, { type: 'bandpass', f: r(1500, 5000), q: 2, dur: r(0.008, 0.03), gain: g * r(0.4, 1) }));
  return end;
}
function bubbles(S, out, t, n, span, g = 0.1) {
  let end = t;
  for (let i = 0; i < n; i++) {
    const f = r(350, 900);
    end = Math.max(end, S.tone(out, t + Math.random() * span, { f, f2: f * r(1.6, 2.4), dur: r(0.04, 0.09), gain: g, a: 0.003 }));
  }
  return end;
}
function bell(S, out, t, f, g = 0.15, d = 0.9) {
  S.tone(out, t, { f: f * 2.76, dur: d * 0.35, gain: g * 0.25, a: 0.002 });
  S.tone(out, t, { f: f * 5.4, dur: d * 0.15, gain: g * 0.1, a: 0.002 });
  return S.tone(out, t, { f, dur: d, gain: g, a: 0.003 });
}
/** Tiny melodic phrase: notes [[midi, beat, beats?, inst?]] at tempo spb (seconds per beat). */
function phrase(S, out, t, notes, spb, g = 0.3) {
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let end = t;
  for (const [m, b, len = 1, inst = 'harp'] of notes) {
    const tt = t + b * spb;
    if (inst === 'harp') end = Math.max(end, S.pluck(out, tt, m, g, 'harp'));
    else if (inst === 'lute') end = Math.max(end, S.pluck(out, tt, m, g, 'lute'));
    else if (inst === 'flute') {
      S.tone(out, tt, { type: 'triangle', f: hz(m), a: 0.04, dur: len * spb, gain: g * 0.35, vib: { rate: 5.2, depth: 9 } });
      end = Math.max(end, S.tone(out, tt, { f: hz(m), a: 0.04, dur: len * spb, gain: g * 0.45, vib: { rate: 5.2, depth: 9 } }));
    } else if (inst === 'horn') {
      end = Math.max(end, S.tone(out, tt, { type: 'sawtooth', f: hz(m), a: 0.05, dur: len * spb, gain: g * 0.3, filter: { f: 1400, f2: 700, q: 0.8 } }));
    } else if (inst === 'bell') end = Math.max(end, bell(S, out, tt, hz(m), g * 0.6, len * spb + 0.5));
    else if (inst === 'drum') end = Math.max(end, thud(S, out, tt, 90, g, 0.25));
  }
  return end;
}

// ---- footsteps --------------------------------------------------------------------------------------
const STEP = {
  grass: (S, o, t) => S.noise(o, t, { f: vary(1700, 0.15), q: 0.8, dur: 0.06, gain: 0.05 }),
  dirt: (S, o, t) => { S.tone(o, t, { f: 90, f2: 60, dur: 0.04, gain: 0.05 }); return S.noise(o, t, { f: vary(900, 0.15), q: 0.9, dur: 0.05, gain: 0.06 }); },
  stone: (S, o, t) => { S.tone(o, t, { type: 'triangle', f: vary(420, 0.1), dur: 0.02, gain: 0.04 }); return S.noise(o, t, { f: vary(2600, 0.1), q: 2, dur: 0.03, gain: 0.06 }); },
  wood: (S, o, t) => { S.tone(o, t, { type: 'triangle', f: vary(190, 0.08), f2: 150, dur: 0.06, gain: 0.08 }); return S.noise(o, t, { f: 1100, q: 1.5, dur: 0.03, gain: 0.04 }); },
  sand: (S, o, t) => S.noise(o, t, { f: vary(3200, 0.2), f2: 1500, q: 0.7, a: 0.01, dur: 0.08, gain: 0.05 }),
  snow: (S, o, t) => { S.noise(o, t, { f: 2600, q: 0.6, a: 0.015, dur: 0.1, gain: 0.05, rate: 0.5 }); return S.noise(o, t + 0.02, { type: 'highpass', f: 4000, dur: 0.05, gain: 0.025 }); },
  wet: (S, o, t) => { S.tone(o, t, { f: vary(320), f2: 650, dur: 0.05, gain: 0.03 }); return S.noise(o, t, { type: 'lowpass', f: 1100, f2: 400, a: 0.01, dur: 0.12, gain: 0.08 }); },
};

// ---- the library --------------------------------------------------------------------------------------
export const SOUNDS = {
  step: (S, out, t, o) => (STEP[o.surface] || STEP.grass)(S, out, t),

  // -- melee
  swing: (S, out, t, o) => {
    const s = o.style;
    if (s === 'stab') return whoosh(S, out, t, 900, 2600, 0.12, 0.13, 2);
    if (s === 'crush') return whoosh(S, out, t, 350, 900, 0.24, 0.16, 1.2);
    if (s === 'punch') return whoosh(S, out, t, 500, 1200, 0.09, 0.08, 1);
    return whoosh(S, out, t, vary(600), 2200, 0.18, 0.15, 1.6);
  },
  hit: (S, out, t, o) => {
    const s = o.style;
    if (s === 'crush') { S.noise(out, t, { type: 'lowpass', f: 450, dur: 0.12, gain: 0.32 }); return S.tone(out, t, { f: vary(95), f2: 40, dur: 0.2, gain: 0.5 }); }
    if (s === 'punch') { S.noise(out, t, { type: 'lowpass', f: 900, dur: 0.05, gain: 0.25 }); return S.tone(out, t, { f: vary(150), f2: 70, dur: 0.09, gain: 0.35 }); }
    if (s === 'stab') { S.noise(out, t, { f: vary(1600), q: 2, dur: 0.05, gain: 0.2 }); return thud(S, out, t + 0.01, 120, 0.3, 0.09); }
    // slash: metallic edge + body thud
    S.tone(out, t, { f: vary(2300, 0.04), dur: 0.12, gain: 0.04, a: 0.001 });
    S.tone(out, t, { f: vary(3350, 0.04), dur: 0.09, gain: 0.03, a: 0.001 });
    S.noise(out, t, { f: 2400, q: 1.2, dur: 0.06, gain: 0.16 });
    return thud(S, out, t + 0.005, 115, 0.32, 0.1);
  },
  block: (S, out, t) => {
    S.tone(out, t, { type: 'triangle', f: vary(300, 0.08), dur: 0.08, gain: 0.16 });
    S.tone(out, t, { f: vary(760, 0.05), dur: 0.05, gain: 0.05 });
    return S.noise(out, t, { f: 1300, q: 1.2, dur: 0.04, gain: 0.14 });
  },
  hitsplat: (S, out, t) => S.tone(out, t, { type: 'triangle', f: vary(180, 0.05), f2: 100, dur: 0.07, gain: 0.14 }),

  // -- ranged
  bow: (S, out, t) => { S.pluck(out, t, 47 + ((Math.random() * 3) | 0), 0.28, 'twang'); return whoosh(S, out, t + 0.01, 1800, 3500, 0.12, 0.08, 1.5); },
  throw: (S, out, t) => whoosh(S, out, t, 900, 3000, 0.14, 0.12, 1.4),
  arrow_hit: (S, out, t) => { S.noise(out, t, { f: 2200, q: 1.5, dur: 0.03, gain: 0.14 }); S.tone(out, t, { type: 'triangle', f: vary(240), f2: 170, dur: 0.12, gain: 0.08, vib: { rate: 28, depth: 60 } }); return thud(S, out, t, 140, 0.22, 0.07); },
  arrow_miss: (S, out, t) => S.noise(out, t, { type: 'lowpass', f: 700, dur: 0.07, gain: 0.12 }),

  // -- magic
  cast: (S, out, t) => {
    S.noise(out, t, { f: 3000, f2: 6000, q: 3, a: 0.12, dur: 0.18, gain: 0.04 });
    return S.tone(out, t, { f: 520, f2: 1040, glide: 0.25, a: 0.05, dur: 0.25, gain: 0.05, vib: { rate: 9, depth: 25 } });
  },
  spell: (S, out, t, o) => {
    switch (o.element) {
      case 'wind': return whoosh(S, out, t, 300, 2600, 0.38, 0.22, 2.2);
      case 'water': { S.noise(out, t, { type: 'lowpass', f: 1200, f2: 500, a: 0.04, dur: 0.25, gain: 0.12 }); return bubbles(S, out, t, 7, 0.25, 0.07); }
      case 'earth': { S.noise(out, t, { type: 'lowpass', f: 380, a: 0.03, dur: 0.3, gain: 0.32, brown: true }); return S.tone(out, t, { f: 75, f2: 50, dur: 0.3, gain: 0.25 }); }
      case 'fire': { S.noise(out, t, { f: 700, f2: 1400, q: 0.8, a: 0.06, dur: 0.35, gain: 0.2 }); return Math.max(crackles(S, out, t, 6, 0.35, 0.08), t + 0.4); }
      default: {
        S.tone(out, t, { f: 660, f2: 990, a: 0.03, dur: 0.35, gain: 0.05, vib: { rate: 11, depth: 40 } });
        return S.tone(out, t, { f: 663, f2: 995, a: 0.03, dur: 0.35, gain: 0.05, vib: { rate: 7, depth: 30 } });
      }
    }
  },
  impact: (S, out, t, o) => {
    switch (o.element) {
      case 'wind': return whoosh(S, out, t, 1600, 500, 0.2, 0.18, 1.2);
      case 'water': { S.noise(out, t, { f: 1800, f2: 500, q: 0.8, dur: 0.25, gain: 0.16 }); return bubbles(S, out, t + 0.03, 5, 0.2, 0.06); }
      case 'earth': { S.noise(out, t, { type: 'lowpass', f: 600, dur: 0.18, gain: 0.3 }); crackles(S, out, t, 5, 0.12, 0.1); return S.tone(out, t, { f: 90, f2: 45, dur: 0.18, gain: 0.35 }); }
      case 'fire': { S.noise(out, t, { type: 'lowpass', f: 1600, f2: 300, dur: 0.3, gain: 0.25 }); return crackles(S, out, t, 8, 0.4, 0.09); }
      default: { S.tone(out, t, { f: 1320, f2: 660, dur: 0.25, gain: 0.05 }); return S.noise(out, t, { f: 4000, q: 2, dur: 0.15, gain: 0.07 }); }
    }
  },
  splash: (S, out, t) => { S.noise(out, t, { f: 2400, f2: 500, q: 1, dur: 0.28, gain: 0.12 }); return S.tone(out, t, { f: 880, f2: 300, dur: 0.22, gain: 0.04 }); },
  poison: (S, out, t) => bubbles(S, out, t, 4, 0.15, 0.06),

  // -- death
  death_npc: (S, out, t) => {
    S.tone(out, t, { type: 'sawtooth', f: vary(260, 0.1), f2: 90, a: 0.02, dur: 0.45, gain: 0.06, filter: { f: 900, q: 1 } });
    return thud(S, out, t + 0.4, 85, 0.35, 0.18);
  },
  death_player: (S, out, t) => phrase(S, out, t, [[69, 0], [65, 1], [62, 2], [57, 3, 2, 'flute'], [45, 3, 1, 'harp']], 0.32, 0.32),

  // -- consumables
  eat: (S, out, t) => { let e = t; for (let i = 0; i < 3; i++) e = S.noise(out, t + i * r(0.11, 0.15), { f: vary(2400, 0.2), q: 1.5, dur: 0.045, gain: 0.12 }); return e; },
  drink: (S, out, t) => { let e = t; for (let i = 0; i < 3; i++) { const tt = t + i * 0.17; S.tone(out, tt, { f: vary(260), f2: 170, dur: 0.08, gain: 0.12, filter: { f: 900 } }); e = S.noise(out, tt, { type: 'lowpass', f: 700, dur: 0.08, gain: 0.08 }); } return e; },
  bury: (S, out, t) => { S.noise(out, t, { type: 'lowpass', f: 800, a: 0.03, dur: 0.18, gain: 0.14 }); return S.noise(out, t + 0.28, { type: 'lowpass', f: 650, a: 0.03, dur: 0.2, gain: 0.14 }); },

  // -- prayer
  prayer_on: (S, out, t) => { bell(S, out, t, 880, 0.08, 0.5); return bell(S, out, t + 0.07, 1318.5, 0.07, 0.6); },
  prayer_off: (S, out, t) => { bell(S, out, t, 1318.5, 0.06, 0.3); return bell(S, out, t + 0.06, 880, 0.05, 0.35); },

  // -- gathering
  chop: (S, out, t) => { S.tone(out, t, { type: 'triangle', f: vary(170, 0.08), f2: 110, dur: 0.08, gain: 0.22 }); S.tone(out, t, { f: vary(430, 0.05), dur: 0.05, gain: 0.05 }); return S.noise(out, t, { f: 1200, q: 2, dur: 0.06, gain: 0.16 }); },
  mine: (S, out, t) => { thud(S, out, t, 150, 0.12, 0.05); return clink(S, out, t, vary(1650, 0.08), 0.06, 0.16); },
  fish_cast: (S, out, t) => { S.noise(out, t, { type: 'lowpass', f: 1300, f2: 450, a: 0.01, dur: 0.18, gain: 0.08 }); return S.tone(out, t, { f: 520, f2: 240, dur: 0.12, gain: 0.04 }); },
  fish_catch: (S, out, t) => { S.noise(out, t, { f: 1500, f2: 600, q: 0.7, dur: 0.25, gain: 0.16 }); return S.noise(out, t + 0.15, { type: 'lowpass', f: 1000, dur: 0.2, gain: 0.1 }); },
  tree_fall: (S, out, t) => {
    S.tone(out, t, { type: 'sawtooth', f: 70, f2: 95, a: 0.1, dur: 0.6, gain: 0.05, filter: { type: 'bandpass', f: 600, q: 6 }, vib: { rate: 13, depth: 50 } });
    S.noise(out, t + 0.6, { type: 'lowpass', f: 900, f2: 200, a: 0.02, dur: 0.6, gain: 0.25, brown: true });
    return thud(S, out, t + 0.65, 70, 0.4, 0.3);
  },
  rock_deplete: (S, out, t) => { crackles(S, out, t, 8, 0.3, 0.12); return S.noise(out, t, { type: 'lowpass', f: 500, a: 0.02, dur: 0.35, gain: 0.2, brown: true }); },

  // -- firemaking / production
  fire_light: (S, out, t) => { S.noise(out, t, { f: 400, f2: 1600, q: 0.8, a: 0.15, dur: 0.5, gain: 0.14 }); S.noise(out, t, { type: 'lowpass', f: 300, a: 0.2, dur: 0.8, gain: 0.25, brown: true }); return crackles(S, out, t + 0.2, 10, 1.0, 0.1); },
  crackle: (S, out, t) => crackles(S, out, t, 3, 0.4, 0.08),
  anvil: (S, out, t) => { S.noise(out, t, { type: 'highpass', f: 2000, dur: 0.02, gain: 0.15 }); return clink(S, out, t, vary(540, 0.03), 0.09, 0.45); },
  furnace: (S, out, t) => { S.noise(out, t, { type: 'lowpass', f: 250, f2: 900, a: 0.15, dur: 0.7, gain: 0.4, brown: true }); return S.noise(out, t, { f: 700, q: 0.7, a: 0.2, dur: 0.5, gain: 0.07 }); },
  sizzle: (S, out, t) => { S.noise(out, t, { f: 5200, q: 0.6, a: 0.06, dur: 0.6, gain: 0.07 }); return crackles(S, out, t, 5, 0.6, 0.05); },
  fletch: (S, out, t) => { S.noise(out, t, { f: 3600, q: 3, a: 0.01, dur: 0.07, gain: 0.08 }); return S.noise(out, t + 0.12, { f: 3000, q: 3, a: 0.01, dur: 0.09, gain: 0.08 }); },
  craft: (S, out, t) => { S.tone(out, t, { type: 'triangle', f: vary(500, 0.1), dur: 0.03, gain: 0.05 }); return S.noise(out, t + 0.05, { f: 2000, q: 0.8, a: 0.02, dur: 0.1, gain: 0.04 }); },
  herb: (S, out, t) => { S.noise(out, t, { type: 'lowpass', f: 900, a: 0.05, dur: 0.25, gain: 0.06 }); return bubbles(S, out, t + 0.05, 4, 0.3, 0.05); },
  rune: (S, out, t) => phrase(S, out, t, [[79, 0, 1, 'bell'], [83, 0.5, 1, 'bell'], [86, 1, 2, 'bell']], 0.12, 0.2),
  build: (S, out, t) => { S.tone(out, t, { type: 'triangle', f: 220, f2: 160, dur: 0.07, gain: 0.18 }); return S.tone(out, t + 0.22, { type: 'triangle', f: 230, f2: 165, dur: 0.07, gain: 0.18 }); },

  // -- items / interface
  pickup: (S, out, t) => { S.noise(out, t, { type: 'lowpass', f: 1600, dur: 0.06, gain: 0.08 }); return S.tone(out, t, { f: 520, f2: 640, dur: 0.04, gain: 0.04 }); },
  drop: (S, out, t) => thud(S, out, t, 150, 0.16, 0.07),
  coins: (S, out, t, o) => coins(S, out, t, o.n || 5),
  bank_open: (S, out, t) => {
    S.tone(out, t, { type: 'sawtooth', f: 110, f2: 135, a: 0.05, dur: 0.35, gain: 0.04, filter: { type: 'bandpass', f: 800, q: 5 }, vib: { rate: 17, depth: 40 } });
    thud(S, out, t + 0.35, 120, 0.18, 0.08);
    return coins(S, out, t + 0.15, 3, 0.05);
  },
  shop_open: (S, out, t) => { bell(S, out, t, 1568, 0.06, 0.45); return bell(S, out, t + 0.12, 2093, 0.05, 0.5); },
  click: (S, out, t) => { S.tone(out, t, { type: 'triangle', f: 1150, dur: 0.02, gain: 0.05, a: 0.001 }); return S.noise(out, t, { type: 'highpass', f: 3500, dur: 0.01, gain: 0.03 }); },
  trade: (S, out, t) => phrase(S, out, t, [[84, 0, 1, 'bell'], [88, 0.5, 1, 'bell']], 0.16, 0.25),

  // -- jingles (original): short harp + flute phrases in C major
  levelup: (S, out, t) => phrase(S, out, t, [
    [60, 0], [64, 0.5], [67, 1], [72, 1.5], [76, 2, 1, 'flute'], [74, 2.5, 0.5, 'flute'], [79, 3, 3, 'flute'],
    [48, 0, 1, 'lute'], [55, 1.5, 1, 'lute'], [52, 3, 1, 'harp'], [55, 3, 1, 'harp'], [60, 3, 1, 'harp'], [43, 3, 1, 'drum'],
  ], 0.2, 0.3),
  quest: (S, out, t) => phrase(S, out, t, [
    [67, 0], [72, 0.5], [76, 1], [74, 1.5, 1, 'flute'], [72, 2, 0.5, 'flute'], [74, 2.5, 0.5, 'flute'], [77, 3, 1, 'flute'], [76, 4, 0.5, 'flute'], [74, 4.5, 0.5, 'flute'], [72, 5, 3, 'flute'],
    [48, 0, 1, 'lute'], [53, 3, 1, 'lute'], [55, 4, 1, 'lute'], [48, 5, 1, 'harp'], [55, 5.25, 1, 'harp'], [64, 5.5, 1, 'harp'], [67, 5.75, 1, 'harp'],
    [36, 0, 1, 'drum'], [36, 3, 1, 'drum'], [36, 5, 1, 'drum'],
  ], 0.24, 0.3),

  // -- movement / world
  teleport: (S, out, t) => {
    S.noise(out, t, { f: 300, f2: 3200, q: 4, a: 0.5, dur: 0.6, gain: 0.2 });
    S.tone(out, t, { f: 300, f2: 1200, glide: 1.0, a: 0.4, dur: 0.6, gain: 0.06, vib: { rate: 8, depth: 30 } });
    return bell(S, out, t + 0.9, 1760, 0.05, 0.6);
  },
  door: (S, out, t) => {
    S.tone(out, t, { type: 'sawtooth', f: vary(85, 0.1), f2: 115, a: 0.05, dur: 0.45, gain: 0.05, filter: { type: 'bandpass', f: 900, q: 7 }, vib: { rate: 19, depth: 45 } });
    return thud(S, out, t + 0.45, 130, 0.12, 0.06);
  },
  ladder: (S, out, t) => { let e = t; for (let i = 0; i < 3; i++) e = S.tone(out, t + i * 0.28, { type: 'triangle', f: vary(240, 0.1), f2: 170, dur: 0.06, gain: 0.14 }); return e; },
  jump: (S, out, t) => whoosh(S, out, t, 500, 1500, 0.22, 0.1, 1.2),
  land: (S, out, t) => thud(S, out, t, 105, 0.3, 0.1),
  balance: (S, out, t) => S.tone(out, t, { type: 'sawtooth', f: 70, f2: 80, a: 0.08, dur: 0.3, gain: 0.03, filter: { type: 'bandpass', f: 700, q: 6 }, vib: { rate: 15, depth: 40 } }),
  fall: (S, out, t) => {
    whoosh(S, out, t, 1800, 300, 0.4, 0.14, 1);
    S.tone(out, t + 0.42, { type: 'sawtooth', f: 210, f2: 150, a: 0.01, dur: 0.15, gain: 0.05, filter: { f: 900 } });
    return thud(S, out, t + 0.4, 80, 0.4, 0.2);
  },
  steal: (S, out, t) => { S.noise(out, t, { f: 2500, q: 0.8, a: 0.02, dur: 0.1, gain: 0.06 }); return coins(S, out, t + 0.1, 2, 0.05); },
  stun: (S, out, t) => {
    S.tone(out, t, { type: 'triangle', f: 620, f2: 260, dur: 0.1, gain: 0.18 });
    S.tone(out, t + 0.1, { f: 1300, f2: 900, a: 0.02, dur: 0.9, gain: 0.04, vib: { rate: 7, depth: 120 } });
    return S.tone(out, t + 0.1, { f: 1650, f2: 1150, a: 0.02, dur: 0.9, gain: 0.03, vib: { rate: 6, depth: 140 } });
  },
  caught: (S, out, t) => phrase(S, out, t, [[76, 0, 1, 'flute'], [72, 0.6, 1, 'flute']], 0.2, 0.25),
  trap: (S, out, t) => { S.noise(out, t, { type: 'highpass', f: 3000, dur: 0.02, gain: 0.2 }); S.tone(out, t, { type: 'triangle', f: 900, f2: 200, dur: 0.05, gain: 0.12 }); return S.noise(out, t + 0.05, { f: 2000, q: 0.7, a: 0.02, dur: 0.25, gain: 0.06 }); },
  skull: (S, out, t) => {
    S.tone(out, t, { type: 'sawtooth', f: 110, a: 0.05, dur: 0.9, gain: 0.07, filter: { f: 700, f2: 250 } });
    S.tone(out, t, { type: 'sawtooth', f: 155.6, a: 0.05, dur: 0.9, gain: 0.05, filter: { f: 700, f2: 250 } });
    return bell(S, out, t, 220, 0.12, 1.4);
  },
  wild_warn: (S, out, t) => phrase(S, out, t, [[57, 0, 1, 'horn'], [52, 1, 2, 'horn'], [40, 0, 1, 'drum'], [40, 1, 1, 'drum']], 0.35, 0.35),
  drip: (S, out, t) => S.tone(out, t, { f: r(1100, 1900), f2: r(500, 700), dur: 0.06, gain: 0.05, a: 0.001 }),
};

/** Sound player with per-name rate limiting and positional voices. */
export class Sfx {
  constructor(engine) {
    this.A = engine;
    this.last = new Map();
  }

  /** Play sound `name` at entity/tile `at` (null = listener). Returns true when it was scheduled. */
  play(name, at = null, o = {}) {
    const A = this.A;
    if (!A.ready || A.settings.sfx <= 0) return false;
    const fn = SOUNDS[name];
    if (!fn) return false;
    const t = A.ctx.currentTime + 0.01 + (o.delay || 0);
    const key = o.key || name;
    if (Math.abs(t - (this.last.get(key) ?? -9)) < (o.minGap ?? 0.04)) return false;
    const sp = A.spatial(at, o.range ?? 14);
    if (!sp) return false;
    const v = A.voice(sp, o.vol ?? 1, o.priority ?? 0);
    if (!v) return false;
    this.last.set(key, t);
    let end = t + 1;
    try { end = fn(A.S, v.out, t, o) || end; } catch (e) { console.error(`[audio] sound ${name}`, e); }
    A.endVoice(v, end);
    return true;
  }

  /** A jingle: plays at the listener and ducks the music while it runs. */
  jingle(name, seconds) {
    if (this.play(name, null, { priority: 2, minGap: 1 })) this.A.music.duck(seconds);
  }
}

export { pick };
