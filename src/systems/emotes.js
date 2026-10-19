// Emotes tab + procedural emote poses. OWNER: activities (emotes).
//
// * Emotes play as one-shot animations named `emote_<id>` (game.playAnim), so the network layer already
//   mirrors them to other players (one-shot `fx` in the snapshot) and riddle trails can listen to 'emote'.
// * Poses: the engine's biped animator ignores unknown animation names. Without touching src/render, each
//   player / remote-player rig gets a tiny hook on `rig.root.updateMatrixWorld` that runs after the animator
//   and before three.js computes matrices, blending the emote pose on top of the idle pose.
// * Some emotes are unlocked by reading dance notation scrolls from riddle-trail caskets
//   (`player.store('emotes').unlocked`).
//
// API: game.emotes = { list(), play(id), unlock(id), isUnlocked(id) }    Event: 'emote' {player, id}

import { registerItem } from '../core/registry.js';
import { getShapeIcon } from '../ui/icons.js';
import { el, escapeHtml } from '../ui/util.js';

export const EMOTES = [
  { id: 'yes', name: 'Yes', ms: 1800 },
  { id: 'no', name: 'No', ms: 1800 },
  { id: 'bow', name: 'Bow', ms: 2000 },
  { id: 'angry', name: 'Angry', ms: 2200 },
  { id: 'think', name: 'Think', ms: 2600 },
  { id: 'wave', name: 'Wave', ms: 2000 },
  { id: 'shrug', name: 'Shrug', ms: 1600 },
  { id: 'cheer', name: 'Cheer', ms: 2400 },
  { id: 'beckon', name: 'Beckon', ms: 2000 },
  { id: 'laugh', name: 'Laugh', ms: 2400 },
  { id: 'jump', name: 'Jump for joy', ms: 1800 },
  { id: 'cry', name: 'Cry', ms: 2800 },
  { id: 'dance', name: 'Dance', ms: 3600 },
  { id: 'clap', name: 'Clap', ms: 2200 },
  { id: 'salute', name: 'Salute', ms: 2000 },
  { id: 'panic', name: 'Panic', ms: 2400 },
  { id: 'jig', name: 'Wayfarer\'s jig', ms: 4200, locked: true, color: '#60d060' },
  { id: 'flourish', name: 'Flourish', ms: 2600, locked: true, color: '#60a0ff' },
  { id: 'starfall', name: 'Starfall', ms: 3600, locked: true, color: '#ffd040' },
];
const BY_ID = new Map(EMOTES.map((e) => [e.id, e]));

// dance-notation scrolls that unlock the locked emotes (casket rewards)
for (const e of EMOTES.filter((x) => x.locked)) {
  registerItem({ id: `emote_scroll_${e.id}`, name: `Notation: ${e.name}`, examine: `Dance notation for the "${e.name}" emote. Read it to learn the steps.`,
    value: 0, tradeable: false, options: ['Learn'], icon: { shape: 'scroll', color: '#e8dcb0', color2: e.color } });
}

let game;
const lerp = (a, b, t) => a + (b - a) * t;

// -------------------------------------------------------------------------------------------------
// Poses
// -------------------------------------------------------------------------------------------------
const POSES = {
  yes: (s) => { s.r('head', 'x', 0.35 * Math.sin(s.time * 9)); },
  no: (s) => { s.r('head', 'y', 0.55 * Math.sin(s.time * 8)); },
  bow: (s) => { const b = Math.sin(Math.PI * s.t); s.r('torso', 'x', 0.85 * b); s.r('head', 'x', 0.25 * b); s.r('armR', 'x', -0.9 * b); s.r('armR', 'z', -0.5 * b); s.r('armL', 'x', 0.4 * b); },
  angry: (s) => { s.r('torso', 'x', 0.15); s.r('head', 'x', 0.15); s.r('armR', 'x', -2.5 + 0.35 * Math.sin(s.time * 14)); s.r('armL', 'x', -0.3); s.r('armL', 'z', -0.3); s.r('legR', 'x', -0.35 * Math.max(0, Math.sin(s.time * 7))); },
  think: (s) => { s.r('armR', 'x', -2.0); s.r('armR', 'z', -0.75); s.r('armL', 'x', -0.9); s.r('armL', 'z', 0.6); s.r('head', 'x', 0.2); s.r('head', 'z', 0.15); },
  shrug: (s) => { const b = Math.sin(Math.PI * s.t); s.r('armL', 'x', -0.6 * b); s.r('armL', 'z', -0.8 * b); s.r('armR', 'x', -0.6 * b); s.r('armR', 'z', 0.8 * b); s.r('head', 'z', 0.25 * b); s.lift(0.04 * b); },
  cheer: (s) => { const w = Math.sin(s.time * 12); s.r('armL', 'x', -2.9 + 0.2 * w); s.r('armR', 'x', -2.9 - 0.2 * w); s.r('armL', 'z', -0.35); s.r('armR', 'z', 0.35); s.lift(Math.abs(Math.sin(s.time * 8)) * 0.15); },
  beckon: (s) => { s.r('armR', 'x', -1.5 + 0.5 * Math.sin(s.time * 7)); s.r('armR', 'z', -0.2); s.r('torso', 'x', -0.05); },
  laugh: (s) => { s.r('torso', 'x', -0.25 + 0.08 * Math.sin(s.time * 16)); s.r('head', 'x', -0.35); s.r('armL', 'x', -0.6); s.r('armR', 'x', -0.6); s.r('armL', 'z', 0.5); s.r('armR', 'z', -0.5); },
  jump: (s) => { const f = (s.t * 2) % 1, a = Math.sin(Math.PI * f); s.lift(0.55 * a); s.r('armL', 'x', -2.6 * a); s.r('armR', 'x', -2.6 * a); s.r('legL', 'x', 0.5 * (1 - a)); s.r('legR', 'x', 0.5 * (1 - a)); },
  cry: (s) => { s.r('head', 'x', 0.45); s.r('armL', 'x', -2.1); s.r('armR', 'x', -2.1); s.r('armL', 'z', 0.55); s.r('armR', 'z', -0.55); s.r('torso', 'x', 0.2 + 0.03 * Math.sin(s.time * 18)); },
  dance: (s) => { const w = Math.sin(s.time * 7); s.lift(Math.abs(w) * 0.1); s.r('torso', 'y', 0.4 * Math.sin(s.time * 3.5)); s.r('torso', 'z', 0.12 * w); s.r('armL', 'x', -1.2 + w); s.r('armR', 'x', -1.2 - w); s.r('armL', 'z', -0.6); s.r('armR', 'z', 0.6); s.r('legL', 'x', 0.4 * w); s.r('legR', 'x', -0.4 * w); },
  clap: (s) => { const c = 0.45 + 0.35 * Math.sin(s.time * 16); s.r('armL', 'x', -1.3); s.r('armR', 'x', -1.3); s.r('armL', 'z', c); s.r('armR', 'z', -c); },
  salute: (s) => { s.r('armR', 'x', -2.5); s.r('armR', 'z', -1.0); s.r('head', 'x', -0.05); },
  panic: (s) => { const w = Math.sin(s.time * 15); s.r('armL', 'x', -2.8 + 0.6 * w); s.r('armR', 'x', -2.8 - 0.6 * w); s.r('legL', 'x', 0.7 * w); s.r('legR', 'x', -0.7 * w); s.r('head', 'y', 0.6 * Math.sin(s.time * 6)); s.lift(Math.abs(w) * 0.05); },
  jig: (s) => { const w = Math.sin(s.time * 9); s.r('legL', 'x', -1.1 * Math.max(0, w)); s.r('legR', 'x', -1.1 * Math.max(0, -w)); s.r('armL', 'z', -1.0); s.r('armR', 'z', 1.0); s.r('armL', 'x', 0.4); s.r('armR', 'x', 0.4); s.lift(Math.abs(w) * 0.12); s.r('torso', 'y', 0.2 * w); },
  flourish: (s) => { const b = Math.sin(Math.PI * s.t); s.r('torso', 'x', 0.6 * b); s.r('armR', 'x', lerp(-2.8, 0.6, s.t)); s.r('armR', 'z', 0.9 * b); s.r('legR', 'x', 0.45 * b); s.r('armL', 'z', -0.8 * b); s.r('head', 'x', 0.2 * b); },
  starfall: (s) => { s.r('armL', 'x', -2.9); s.r('armR', 'x', -2.9); s.r('armL', 'z', -0.6); s.r('armR', 'z', 0.6); s.r('head', 'x', -0.5); s.lift(0.1 + 0.08 * Math.sin(s.time * 4)); s.r('torso', 'y', s.t * Math.PI * 2); },
};

function applyPose(entity, rig) {
  const a = entity.anim;
  if (!a || typeof a.name !== 'string' || !a.name.startsWith('emote_') || entity.dead) return;
  const pose = POSES[a.name.slice(6)];
  if (!pose) return;
  const now = performance.now(), dur = a.duration || 1200;
  const el = now - a.start;
  if (el < 0 || el > dur) return;
  const t = el / dur;
  const k = Math.max(0, Math.min(1, t * 7, (1 - t) * 7));       // blend in / out
  const P = rig.parts;
  const s = {
    t, time: now / 1000,
    r: (part, axis, v) => { const o = P[part]; if (o) o.rotation[axis] = lerp(o.rotation[axis], v, k); },
    lift: (dy) => { if (P.body) P.body.position.y += dy * k; },
  };
  pose(s);
}

/** Install the pose hook on every humanoid player rig that does not have it yet. */
function hookRigs() {
  const views = game.renderer?.views;
  if (!views) return;
  for (const v of views.values()) {
    const rig = v.rig, e = v.entity;
    if (!rig || rig._emoteHook || rig.kind !== 'biped' || (e.type !== 'player' && e.type !== 'remote')) continue;
    rig._emoteHook = true;
    const root = rig.root, base = root.updateMatrixWorld;
    root.updateMatrixWorld = function hooked(force) {
      try { applyPose(v.entity, rig); } catch { /* cosmetic only */ }
      return base.call(this, force);
    };
  }
}

// -------------------------------------------------------------------------------------------------
const unlocked = () => { const s = game.player.store('emotes'); if (!s.unlocked || typeof s.unlocked !== 'object') s.unlocked = {}; return s.unlocked; };
const isUnlocked = (id) => !BY_ID.get(id)?.locked || !!unlocked()[id];

function play(id) {
  const e = BY_ID.get(id);
  const p = game.player;
  if (!e || p.dead) return false;
  if (!isUnlocked(id)) { game.message('You have not learned that emote yet. Rumour has it riddle-trail caskets hold dance notation.'); return false; }
  if (game.actions.isLocked(p) || p.forced) { game.message("You can't do that right now."); return false; }
  game.actions.interrupt(p, 'moved');
  p.path = []; p.destination = null; p.interaction = null; p.combatTarget = null;
  game.playAnim(p, `emote_${id}`, e.ms);
  if (id === 'starfall') {
    for (let i = 0; i < 4; i++) game.schedule(1 + i, () => game.spawnEffect('sparkle', p, { color: [0xffd040, 0x80c0ff, 0xff80ff, 0xffffff][i] }));
  }
  if (id === 'jig') game.schedule(2, () => game.spawnEffect('sparkle', p, { color: 0x60d060 }));
  hookRigs();
  game.events.emit('emote', { player: p, id });
  return true;
}

function unlock(id, silent = false) {
  const e = BY_ID.get(id);
  if (!e?.locked) return false;
  if (unlocked()[id]) return false;
  unlocked()[id] = true;
  if (!silent) game.message(`<col=60d060>You have learned a new emote: ${e.name}!</col>`);
  game.ui.refreshTab('emotes');
  return true;
}

function renderTab(pane) {
  pane.innerHTML = '';
  const wrap = el('div', 'emote-tab');
  wrap.appendChild(el('div', 'emote-title', 'Emotes'));
  const grid = el('div', 'emote-grid');
  for (const e of EMOTES) {
    const ok = isUnlocked(e.id);
    const b = el('button', `emote-btn${ok ? '' : ' locked'}`, `<img alt="" src="${getShapeIcon('smile', ok ? (e.color || '#f0c040') : '#5a5048')}"><span>${escapeHtml(e.name)}</span>`);
    b.title = ok ? e.name : `${e.name} (locked)`;
    b.onclick = () => play(e.id);
    grid.appendChild(b);
  }
  wrap.appendChild(grid);
  pane.appendChild(wrap);
}

function injectCss() {
  if (document.getElementById('emotes-css')) return;
  const css = document.createElement('style');
  css.id = 'emotes-css';
  css.textContent = `
.emote-tab .emote-title { text-align: center; color: #ff981f; margin-bottom: 4px; }
.emote-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
.emote-btn { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 3px 1px; font-size: 11px; line-height: 1.1;
  background: rgba(0,0,0,0.22); border: 1px solid #1a1611; border-radius: 3px; color: #ffd890; cursor: pointer; min-height: 44px; }
.emote-btn:hover { background: rgba(255,255,255,0.08); }
.emote-btn img { width: 24px; height: 21px; }
.emote-btn.locked { color: #6a6058; }
`;
  document.head.appendChild(css);
}

export function init(g) {
  game = g;
  injectCss();
  game.ui.registerTab({ id: 'emotes', title: 'Emotes', icon: () => getShapeIcon('mask', '#f0c040', '#c83a3a'), render: renderTab });
  game.interactions.onItem('Learn', EMOTES.filter((e) => e.locked).map((e) => `emote_scroll_${e.id}`), ({ player, slot, item }) => {
    const id = item.id.replace('emote_scroll_', '');
    if (isUnlocked(id)) { game.message('You already know those steps.'); return; }
    player.inventory.removeAt(slot, 1);
    unlock(id);
  });
  game.onTick(hookRigs, 90);
  game.events.on('command', ({ args }) => {
    if (args?.[0] === 'emote' && args[1]) play(args[1]);
  });
  game.emotes = { list: () => EMOTES.map((e) => ({ ...e, unlocked: isUnlocked(e.id) })), play, unlock, isUnlocked };
}
