// Ambience beds: continuous wind / water / lava-rumble loops whose levels follow the player's surroundings,
// plus sparse one-shot critters (birds by day, crickets & owls at night, frogs in swamps, gulls on the
// coast, drips and rumbles in caves, crackle near fires and lava).
//
// The surroundings are sampled once per second around the local player (tile lookups only, no allocation);
// a 250 ms timer eases the bed levels and rolls the dice for one-shots. Day/night: uses game.time if a
// day/night clock exists (isNight() / phase / hour), else render/daynight.js's shared wall-clock cycle, else
// the 'time:phase' event; otherwise always day.

const TICK_MS = 250;
const r = (a, b) => a + Math.random() * (b - a);

const WINDY = { mountain: 0.75, wilderness: 0.6, dwarf: 0.15, desert: 0.4, coast: 0.3, dungeon: 0.25, eerie: 0.3 };
const TREE_RE = /tree|oak|willow|yew|maple|pine|birch|elder|ash_|redwood|magic_|teak|mahogany/;
const FIRE_RE = /fire|brazier|torch|hearth|bonfire|campfire|lantern_post/;

export class Ambience {
  constructor(engine) {
    this.A = engine;
    this.theme = 'pastoral';
    this.night = false;
    this.lv = { wind: 0, water: 0, lava: 0 };
    this.env = { water: 0, sea: 0, lava: 0, trees: 0, fire: 0, indoor: false };
    this.treeCache = new Map();
    this.ticks = 0;
  }

  attach() {
    const A = this.A, c = A.ctx, S = A.S;
    const bed = (buf, setup, modRate, modDepth) => {
      const src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      const level = c.createGain(); level.gain.value = 0;
      const mod = c.createGain(); mod.gain.value = 1;
      const head = setup(src);
      head.connect(mod).connect(level).connect(A.ambBus);
      let lfoGain = null;
      if (modRate) {
        const lfo = c.createOscillator(); lfo.frequency.value = modRate;
        lfoGain = c.createGain(); lfoGain.gain.value = modDepth;
        lfo.connect(lfoGain).connect(mod.gain); lfo.start();
      }
      src.start(0, Math.random() * 2);
      return { level, lfoGain };
    };
    // wind: brown noise through a wandering bandpass
    this.windBed = bed(S.brownBuf, (src) => {
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.13; lg.gain.value = 220; lfo.connect(lg).connect(f.frequency); lfo.start();
      src.connect(f);
      return f;
    }, 0.07, 0.45);
    // water: soft white noise band (river babble / waves; wave swell depth set per place)
    this.waterBed = bed(S.noiseBuf, (src) => {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 0.4;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
      src.connect(lp).connect(hp);
      return hp;
    }, 0.11, 0.15);
    // lava / deep rumble
    this.lavaBed = bed(S.brownBuf, (src) => {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.Q.value = 0.9;
      src.connect(lp);
      return lp;
    }, 0.05, 0.3);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    // shared wall-clock day/night cycle (render/daynight.js), if present
    import('../render/daynight.js').then((m) => { this.dayMod = m; }).catch(() => { /* no day/night cycle */ });
  }

  setTheme(id) { this.theme = id; }
  setNight(n) { this.night = !!n; }

  isNight() {
    const t = this.A.game.time;
    if (t) {
      try {
        if (typeof t.isNight === 'function') return !!t.isNight();
        if (typeof t.isNight === 'boolean') return t.isNight;
        if (typeof t.phase === 'string') return /night|dusk|evening/i.test(t.phase);
        if (typeof t.hour === 'number') return t.hour < 6 || t.hour >= 20;
      } catch { /* clock not ready */ }
    }
    const D = this.dayMod;
    if (D?.phaseOf && D.worldDayT) { try { return D.phaseOf(D.worldDayT()) === 'night'; } catch { /* ignore */ } }
    return this.night;
  }

  /** Sample the player's surroundings (cheap tile queries). */
  sense() {
    const g = this.A.game, p = g.player, w = g.world;
    if (!p || !w) return;
    const px = p.x, py = p.y;
    let water = 0, lava = 0, trees = 0, fireD = 99;
    const grid = w.objectGrid;
    for (let dy = -7; dy <= 7; dy++) {
      for (let dx = -7; dx <= 7; dx++) {
        const x = px + dx, y = py + dy;
        if (!w.inBounds(x, y)) continue;
        if (w.isWater(x, y)) water++;
        if ((dx & 1) === 0 && (dy & 1) === 0) {
          const tid = w.terrainAt(x, y)?.id;
          if (tid === 'lava') lava++;
        }
        if (dx >= -5 && dx <= 5 && dy >= -5 && dy <= 5) {
          const set = grid ? grid.get(w.idx(x, y)) : null;
          if (set) {
            for (const o of set) {
              if (o.hidden) continue;
              if (this.isTree(o)) trees++;
              else if (FIRE_RE.test(o.id)) { const d = Math.max(Math.abs(dx), Math.abs(dy)); if (d < fireD) fireD = d; }
            }
          }
        }
      }
    }
    const e = this.env;
    e.water = Math.min(1, water / 30);
    e.sea = water > 110 || this.theme === 'coast' ? 1 : 0;
    e.lava = Math.min(1, lava / 6);
    e.trees = Math.min(1, trees / 7);
    e.fire = fireD <= 6 ? 1 - fireD / 7 : 0;
    e.indoor = !!w.buildingAt?.(px, py);
  }

  isTree(o) {
    let v = this.treeCache.get(o.id);
    if (v === undefined) {
      v = TREE_RE.test(o.id) || !!o.def?.options?.some?.((s) => /chop/i.test(s));
      this.treeCache.set(o.id, v);
    }
    return v;
  }

  tick() {
    const A = this.A;
    if (!A.ready) return;
    if (this.ticks++ % 4 === 0) { try { this.sense(); } catch (e) { /* world mid-rebuild */ } }
    const e = this.env, th = this.theme, night = this.isNight();
    const cave = th === 'dungeon';
    const inside = e.indoor ? 0.25 : 1;
    // bed targets
    const wind = (WINDY[th] ?? 0.12) * (cave ? 0.6 : inside);
    const water = Math.max(e.water * 0.55, e.sea * 0.5) * (e.indoor ? 0.5 : 1);
    const lava = Math.max(e.lava * 0.8, cave ? 0.18 : 0);
    const now = A.ctx.currentTime;
    this.windBed.level.gain.setTargetAtTime(wind * 0.5, now, 1.2);
    this.waterBed.level.gain.setTargetAtTime(water * 0.18, now, 1.2);
    this.waterBed.lfoGain.gain.setTargetAtTime(e.sea ? 0.6 : 0.12, now, 2);
    this.lavaBed.level.gain.setTargetAtTime(lava * 0.6, now, 1.2);
    if (A.settings.ambience <= 0) return;

    // one-shots (probabilities per 250 ms tick)
    const outdoors = !e.indoor && !cave;
    const greenery = Math.max(e.trees, th === 'forest' || th === 'elven' ? 0.7 : th === 'pastoral' ? 0.4 : th === 'town' ? 0.15 : 0);
    if (outdoors && !night && th !== 'wilderness' && th !== 'desert' && Math.random() < greenery * 0.09) this.bird();
    if (outdoors && night && greenery > 0.1 && Math.random() < 0.18) this.cricket();
    if (outdoors && night && greenery > 0.4 && Math.random() < 0.006) this.owl();
    if (outdoors && th === 'swamp' && Math.random() < (night ? 0.08 : 0.04)) this.frog();
    if (outdoors && !night && e.sea && Math.random() < 0.018) this.gull();
    if (cave && Math.random() < 0.1) this.drip();
    if (cave && Math.random() < 0.004) this.rumble();
    if ((e.fire > 0 || e.lava > 0) && Math.random() < Math.max(e.fire, e.lava * 0.6) * 0.5) this.crackle(Math.max(e.fire, e.lava * 0.6));
    if (th === 'wilderness' && outdoors && Math.random() < 0.004) this.crow();
  }

  // ---- one-shot critters ------------------------------------------------------------------------------
  shot(vol, fn, spread = 0.8) {
    const A = this.A;
    const v = A.voice({ gain: 1, pan: (Math.random() * 2 - 1) * spread }, vol, -1, A.ambBus);
    if (!v) return;
    const t = A.ctx.currentTime + 0.02;
    let end = t + 1;
    try { end = fn(A.S, v.out, t); } catch (err) { console.error('[audio] ambience', err); }
    A.endVoice(v, end);
  }

  bird() {
    const kind = (Math.random() * 3) | 0;
    this.shot(r(0.4, 1), (S, o, t) => {
      let end = t;
      if (kind === 0) { // two-note call
        const f = r(2600, 3800), n = 2 + ((Math.random() * 3) | 0);
        for (let i = 0; i < n; i++) end = S.tone(o, t + i * r(0.13, 0.18), { f, f2: f * r(1.15, 1.3), glide: 0.05, dur: 0.06, gain: 0.035, a: 0.005 });
      } else if (kind === 1) { // fast trill
        const f = r(3800, 5200);
        end = S.tone(o, t, { f, f2: f * 0.85, a: 0.01, dur: r(0.3, 0.5), gain: 0.025, vib: { rate: r(22, 32), depth: 160 } });
      } else { // falling whistle
        const f = r(2800, 3600);
        S.tone(o, t, { f: f * 1.2, f2: f, dur: 0.08, gain: 0.03, a: 0.01 });
        end = S.tone(o, t + 0.14, { f, f2: f * 0.72, a: 0.02, dur: 0.22, gain: 0.03 });
      }
      return end;
    });
  }

  cricket() {
    this.shot(r(0.4, 0.9), (S, o, t) => {
      const f = r(4200, 4900), n = 3 + ((Math.random() * 4) | 0);
      let end = t;
      for (let i = 0; i < n; i++) end = S.tone(o, t + i * 0.045, { f, dur: 0.018, gain: 0.012, a: 0.003 });
      return end;
    });
  }

  owl() {
    this.shot(0.7, (S, o, t) => {
      S.tone(o, t, { f: 390, f2: 370, a: 0.06, hold: 0.08, dur: 0.18, gain: 0.05 });
      return S.tone(o, t + 0.55, { f: 380, f2: 340, a: 0.07, hold: 0.25, dur: 0.3, gain: 0.05 });
    });
  }

  frog() {
    this.shot(r(0.5, 1), (S, o, t) => {
      const f = r(95, 150);
      let end = t;
      for (let i = 0; i < 3; i++) end = S.tone(o, t + i * 0.055, { type: 'sawtooth', f, f2: f * 0.85, dur: 0.04, gain: 0.05, filter: { type: 'bandpass', f: 650, q: 4 } });
      return end;
    });
  }

  gull() {
    this.shot(r(0.4, 0.8), (S, o, t) => {
      let end = t;
      for (let i = 0; i < 2 + ((Math.random() * 2) | 0); i++) end = S.tone(o, t + i * 0.32, { type: 'triangle', f: r(1500, 1700), f2: r(950, 1100), a: 0.03, dur: 0.22, gain: 0.025, vib: { rate: 14, depth: 40 } });
      return end;
    });
  }

  crow() {
    this.shot(0.6, (S, o, t) => {
      S.noise(o, t, { f: 1300, q: 3, a: 0.02, dur: 0.18, gain: 0.05 });
      return S.tone(o, t, { type: 'sawtooth', f: 520, f2: 430, a: 0.02, dur: 0.2, gain: 0.03, filter: { type: 'bandpass', f: 1300, q: 3 } });
    });
  }

  drip() {
    this.shot(r(0.4, 1), (S, o, t) => S.tone(o, t, { f: r(1100, 1900), f2: r(450, 700), dur: 0.06, gain: 0.04, a: 0.001 }));
  }

  rumble() {
    this.shot(0.8, (S, o, t) => S.noise(o, t, { type: 'lowpass', f: 140, a: 0.6, dur: 1.8, gain: 0.5, brown: true }), 0.3);
  }

  crackle(level) {
    this.shot(0.4 + level * 0.6, (S, o, t) => {
      let end = t;
      for (let i = 0; i < 3; i++) end = Math.max(end, S.noise(o, t + Math.random() * 0.25, { f: r(1500, 5000), q: 2, dur: r(0.006, 0.025), gain: r(0.03, 0.08) }));
      return end;
    }, 0.4);
  }
}
