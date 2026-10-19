// Low-level procedural synthesis helpers (Web Audio). Everything here is stateless except the small
// buffer caches on the Synth instance (noise, Karplus-Strong plucks, reverb impulse).
//
// Each voice helper schedules nodes on `dest` at absolute context time `t` and returns the time the
// sound ends, so callers can chain / size their voice lifetime. Nodes disconnect themselves when done.

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MIN = 0.0001;
const KS_RATE = 32000; // Karplus-Strong render rate (Hz)

export class Synth {
  constructor(ctx) {
    this.ctx = ctx;
    this.noiseBuf = makeNoise(ctx, 2.5);
    this.brownBuf = makeBrown(ctx, 4);
    this.ks = new Map(); // pluck buffers keyed by `${style}|${midi}`
  }

  /** Attack / hold / exponential-decay envelope on a fresh GainNode. */
  envGain(t, peak, a, d, dest, hold = 0) {
    const g = this.ctx.createGain();
    const p = Math.max(peak, MIN * 2);
    g.gain.setValueAtTime(MIN, t);
    if (a > 0.002) g.gain.exponentialRampToValueAtTime(p, t + a);
    else g.gain.setValueAtTime(p, t);
    if (hold > 0) g.gain.setValueAtTime(p, t + a + hold);
    g.gain.exponentialRampToValueAtTime(MIN, t + a + hold + d);
    g.connect(dest);
    return g;
  }

  /**
   * Oscillator voice. o: { type, f, f2 (glide target), glide (s), a (attack), hold (s at peak), dur (decay),
   * gain, detune, filter: {type, f, f2, q}, vib: {rate, depth (cents)} }
   */
  tone(dest, t, o) {
    const c = this.ctx;
    const a = o.a ?? 0.004, d = o.dur ?? 0.2, h = o.hold || 0;
    const end = t + a + h + d;
    const g = this.envGain(t, o.gain ?? 0.3, a, d, dest, h);
    let out = g;
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = o.filter.type || 'lowpass';
      f.frequency.setValueAtTime(o.filter.f, t);
      if (o.filter.f2) f.frequency.exponentialRampToValueAtTime(o.filter.f2, end);
      f.Q.value = o.filter.q ?? 0.7;
      f.connect(g);
      out = f;
    }
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.glide ?? a + d));
    if (o.detune) osc.detune.value = o.detune;
    let lfo = null;
    if (o.vib) {
      lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = o.vib.rate || 5;
      lg.gain.value = o.vib.depth || 10;
      lfo.connect(lg).connect(osc.detune);
      lfo.start(t); lfo.stop(end + 0.05);
    }
    osc.connect(out);
    osc.start(t);
    osc.stop(end + 0.05);
    osc.onended = () => { try { g.disconnect(); } catch { /* gone */ } };
    return end;
  }

  /** Filtered noise burst. o: { dur, a, gain, type ('bandpass'), f, f2, q, brown, rate, offset } */
  noise(dest, t, o) {
    const c = this.ctx;
    const a = o.a ?? 0.002, d = o.dur ?? 0.15;
    const end = t + a + d;
    const g = this.envGain(t, o.gain ?? 0.3, a, d, dest);
    const src = c.createBufferSource();
    src.buffer = o.brown ? this.brownBuf : this.noiseBuf;
    src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    let node = g;
    if (o.f) {
      const f = c.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.setValueAtTime(o.f, t);
      if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, end);
      f.Q.value = o.q ?? 1;
      f.connect(g);
      node = f;
    }
    src.connect(node);
    const off = o.offset ?? Math.random() * 1.5;
    src.start(t, off);
    src.stop(end + 0.05);
    src.onended = () => { try { g.disconnect(); } catch { /* gone */ } };
    return end;
  }

  /** Karplus-Strong pluck (cached buffer per pitch/style). style: 'lute' | 'harp' | 'bass' | 'twang' */
  pluck(dest, t, midi, gain = 0.4, style = 'lute', rate = 1) {
    const key = `${style}|${midi}`;
    let ks = this.ks.get(key);
    if (!ks) {
      const P = PLUCK[style] || PLUCK.lute;
      ks = ksBuffer(this.ctx, midiToHz(midi), P.dur, P.damp, P.blend, P.soft);
      if (this.ks.size > 72) this.ks.delete(this.ks.keys().next().value); // bounded cache
      this.ks.set(key, ks);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = ks.buf;
    const r = rate * ks.tune;
    src.playbackRate.value = r;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(dest);
    src.start(t);
    src.onended = () => { try { g.disconnect(); } catch { /* gone */ } };
    return t + ks.buf.duration / r;
  }

  /** Synthetic reverb impulse response (stereo, exponential decay). */
  impulse(seconds = 2.2, decay = 3) {
    const c = this.ctx, n = Math.floor(c.sampleRate * seconds);
    const b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        lp += ((Math.random() * 2 - 1) - lp) * (0.55 - 0.4 * k); // darker tail
        d[i] = lp * Math.pow(1 - k, decay) * (i < 40 ? i / 40 : 1);
      }
    }
    return b;
  }
}

const PLUCK = {
  lute: { dur: 1.4, damp: 0.994, blend: 0.5, soft: 0.55 },
  harp: { dur: 2.0, damp: 0.9975, blend: 0.48, soft: 0.35 },
  bass: { dur: 1.3, damp: 0.992, blend: 0.5, soft: 0.8 },
  twang: { dur: 0.5, damp: 0.985, blend: 0.45, soft: 0.2 },
};

function makeNoise(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function makeBrown(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  // crossfade the loop seam
  const fade = Math.min(2000, n >> 2);
  for (let i = 0; i < fade; i++) { const k = i / fade; d[n - fade + i] = d[n - fade + i] * (1 - k) + d[i] * k; }
  return b;
}

/**
 * Karplus-Strong string: a noise burst circulating through an averaging delay line. Rendered at a reduced
 * sample rate to keep the cache small; `tune` corrects the integer delay-line length back to `freq`.
 */
function ksBuffer(ctx, freq, seconds, damp, blend, soft) {
  const sr = KS_RATE;
  const n = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, n, sr);
  const out = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) { lp += ((Math.random() * 2 - 1) - lp) * (1 - soft); ring[i] = lp; }
  let idx = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    const nx = idx + 1 === N ? 0 : idx + 1;
    const v = ring[idx];
    ring[idx] = damp * ((1 - blend) * v + blend * ring[nx]);
    out[i] = v;
    const av = v < 0 ? -v : v;
    if (av > peak) peak = av;
    idx = nx;
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.floor(sr * 0.08);
  for (let i = 0; i < n; i++) out[i] *= norm * (i > n - fade ? (n - i) / fade : 1);
  // the averaging filter adds half a sample of delay
  return { buf, tune: freq / (sr / (N + blend)) };
}
