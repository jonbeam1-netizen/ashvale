// Ashvale audio engine: fully procedural (Web Audio API, no audio files).
//
//   initAudio(game)  -> AudioEngine, also published as game.audio
//
// Graph:  music ─┬──────────────┐
//         sfx  ──┼─ sends ─► reverb ─► master ─► limiter ─► speakers
//         amb  ──┘──────────────┘
// The AudioContext is created lazily on the first user gesture (browsers block autoplay) and is
// suspended while the tab is hidden or audio is muted, so a muted/hidden game costs no audio CPU.
//
// Settings (localStorage 'ashvale.audio'): master, music, sfx, ambience (0..1), muted, footsteps.
// Tweak: sounds live in sfx.js (SOUNDS table), region music in themes.js, ambience beds in ambience.js,
// event -> sound wiring in hooks.js.

import { Synth } from './synth.js';
import { Sfx } from './sfx.js';
import { Music } from './music.js';
import { Ambience } from './ambience.js';
import { wireHooks } from './hooks.js';
import { renderAudioSettings, createHudToggle } from './ui.js';

const KEY = 'ashvale.audio';
const DEFAULTS = { master: 0.8, music: 0.5, sfx: 0.7, ambience: 0.55, muted: false, footsteps: true };
const MAX_VOICES = 28;          // concurrent positional sound effects
const GESTURES = ['pointerdown', 'keydown', 'touchend'];

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

export class AudioEngine {
  constructor(game) {
    this.game = game;
    this.settings = { ...DEFAULTS, ...loadSettings() };
    this.ctx = null;
    this.disabled = !(window.AudioContext || window.webkitAudioContext);
    this.voices = [];
    this.uiListeners = new Set();
    this.sfx = new Sfx(this);
    this.music = new Music(this);
    this.amb = new Ambience(this);
    // Escape and bare modifier keys don't grant user activation: creating the context then would only warn
    this._unlock = (e) => { if (e?.type === 'keydown' && /^(Escape|Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(e.key)) return; this.unlock(); };
    for (const ev of GESTURES) window.addEventListener(ev, this._unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => this.applyRunState());
  }

  /** True when sounds can be scheduled right now. */
  get ready() { return !!this.ctx && this.ctx.state === 'running'; }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  // ---- lifecycle --------------------------------------------------------------------------------
  unlock() {
    if (this.disabled || this.settings.muted) return;
    if (!this.ctx) {
      try { this.create(); } catch (e) { console.warn('[audio] Web Audio unavailable', e); this.disabled = true; this.dropGestures(); return; }
    }
    this.applyRunState();
  }

  dropGestures() { for (const ev of GESTURES) window.removeEventListener(ev, this._unlock, { capture: true }); }

  create() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const c = this.ctx = new Ctx({ latencyHint: 'interactive' });
    this.S = new Synth(c);
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 8;
    limiter.attack.value = 0.004; limiter.release.value = 0.2;
    limiter.connect(c.destination);
    this.master = c.createGain(); this.master.connect(limiter);
    this.reverb = c.createConvolver(); this.reverb.buffer = this.S.impulse(2.4, 3.2);
    this.reverb.connect(this.master);
    const bus = (send) => {
      const g = c.createGain(); g.connect(this.master);
      const s = c.createGain(); s.gain.value = send; g.connect(s).connect(this.reverb);
      return [g, s];
    };
    [this.musicBus, this.musicSend] = bus(0.32);
    [this.sfxBus, this.sfxSend] = bus(0.06);
    [this.ambBus, this.ambSend] = bus(0.12);
    this.applyVolumes(true);
    this.music.attach();
    this.amb.attach();
    c.onstatechange = () => { if (c.state === 'running') this.dropGestures(); this.notifyUi(); };
  }

  /** Resume/suspend the context: runs only while visible and unmuted. */
  applyRunState() {
    const c = this.ctx;
    if (!c) return;
    const want = !document.hidden && !this.settings.muted;
    if (want && c.state === 'suspended') c.resume().catch(() => {});
    else if (!want && c.state === 'running') c.suspend().catch(() => {});
  }

  // ---- settings ---------------------------------------------------------------------------------
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch { /* storage unavailable */ } }

  set(key, value) {
    this.settings[key] = value;
    this.save();
    if (key === 'muted') {
      if (!value) this.unlock();
      this.applyVolumes();
      this.applyRunState();
    } else this.applyVolumes();
    this.notifyUi();
  }

  toggleMute() { this.set('muted', !this.settings.muted); }

  applyVolumes(instant = false) {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    const curve = (v) => Math.max(0, Math.min(1, v)) ** 1.6; // roughly perceptual
    const put = (node, v) => { if (instant) node.gain.value = v; else node.gain.setTargetAtTime(v, t, 0.05); };
    // bus make-up gains (tweak overall balance here)
    put(this.master, s.muted ? 0 : curve(s.master) * 1.2);
    put(this.musicBus, curve(s.music) * 1.8);
    put(this.sfxBus, curve(s.sfx) * 1.6);
    put(this.ambBus, curve(s.ambience) * 1.8);
  }

  onUi(fn) { this.uiListeners.add(fn); return () => this.uiListeners.delete(fn); }
  notifyUi() { for (const fn of this.uiListeners) { try { fn(); } catch { /* ui gone */ } } }

  renderSettings(pane) { renderAudioSettings(this, pane); }

  // ---- positional voices ------------------------------------------------------------------------
  /**
   * Gain/pan for a sound at an entity or tile relative to the local player and camera.
   * Returns null when it is too far away to hear.
   */
  spatial(at, range = 14) {
    const p = this.game.player;
    if (!at || !p || at === p) return { gain: 1, pan: 0 };
    const sz = at.size || 1;
    const ax = (at.x ?? p.x) + (sz - 1) / 2, ay = (at.y ?? p.y) + (sz - 1) / 2;
    const dx = ax - p.x, dy = ay - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > range) return null;
    const gain = d <= 1.5 ? 1 : Math.pow(1 - (d - 1.5) / (range - 1.5), 1.7);
    const yaw = this.game.renderer?.cameraCtl?.yaw || 0;
    const right = dx * Math.cos(yaw) - dy * Math.sin(yaw);
    const pan = Math.max(-1, Math.min(1, right / 6)) * 0.75;
    return { gain, pan };
  }

  /** Allocate a voice (gain + pan) on the sfx bus; null when over the voice budget. */
  voice(sp, vol, priority = 0, bus = this.sfxBus) {
    const c = this.ctx, now = c.currentTime;
    let n = 0;
    for (let i = this.voices.length - 1; i >= 0; i--) {
      if (this.voices[i].end < now) this.voices.splice(i, 1); else n++;
    }
    if (n >= MAX_VOICES) {
      if (priority <= 0) return null;
      const old = this.voices.shift(); // steal the oldest
      try { old.g.gain.setTargetAtTime(0, now, 0.02); } catch { /* gone */ }
    }
    const g = c.createGain();
    g.gain.value = vol * sp.gain;
    let out = g;
    if (sp.pan && c.createStereoPanner) {
      const pn = c.createStereoPanner();
      pn.pan.value = sp.pan;
      g.connect(pn).connect(bus);
    } else g.connect(bus);
    const v = { g, out, end: now + 5 };
    this.voices.push(v);
    return v;
  }

  endVoice(v, end) {
    v.end = end;
    const ms = Math.max(50, (end - this.ctx.currentTime + 0.6) * 1000);
    setTimeout(() => { try { v.g.disconnect(); } catch { /* gone */ } }, ms);
  }
}

/** Boot hook (src/main.js). Never throws: audio is optional. */
export function initAudio(game) {
  try {
    const audio = new AudioEngine(game);
    game.audio = audio;
    wireHooks(game, audio);
    createHudToggle(audio);
    return audio;
  } catch (e) {
    console.error('[audio] init failed', e);
    return null;
  }
}
