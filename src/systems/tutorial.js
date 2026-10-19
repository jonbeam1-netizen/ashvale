// New-player tutorial: a step tracker panel (top-left), UI highlights with a bouncing arrow, minimap
// flags for world targets and a starter bundle at the end. Steps are data (src/content/tutorial.js);
// each one completes from a real game event ('gathering:log', 'production:make', 'equip', 'ui:open'...)
// or a per-tick poll.
//
// Only characters created in this session start it (no save existed when the systems initialised);
// existing saves are never forced into it, but anyone can ask Wayguide Corin to walk them through it.
// Skipping or finishing is permanent (player.store('tutorial').status = 'skipped' | 'done').
//
// API: game.tutorial = { status(), currentStep(), start(manual), skip(), point(), complete(), steps }

import { getData, getQuest } from '../core/registry.js';
import { SAVE_KEY } from '../core/save.js';

let game = null;
let fresh = false;
let panel = null, arrow = null, hlEl = null, uiTimer = 0;
let skipArm = 0;
let lastHint = '';

const steps = () => getData('tutorial', 'steps') || [];
const store = () => game.player.store('tutorial');
const status = () => store().status || 'none';
const isActive = () => status() === 'active';
const stepIndex = () => Math.max(0, Math.min(steps().length, store().step | 0));
const currentStep = () => (isActive() ? steps()[stepIndex()] || null : null);
const stepState = () => { const s = store(); if (!s.data || typeof s.data !== 'object') s.data = {}; return s.data; };
const ctxFor = (step) => ({ game, player: game.player, step, state: stepState() });

/** Touch screen (phones / tablets): tutorial wording says "tap" / "press and hold" instead of mouse clicks. */
const isTouch = () => !!(game?.ui?.mobile?.touch || document.documentElement.classList.contains('touch'));
/** Mouse wording -> touch wording (used when a step has no explicit `touchText`). */
export function touchify(html) {
  return String(html || '')
    .replace(/\b([Ll])eft-click\b/g, (m, l) => (l === 'L' ? 'Tap' : 'tap'))
    .replace(/\b([Rr])ight-click\b/g, (m, r) => (r === 'R' ? 'Press and hold' : 'press and hold'))
    .replace(/\b([Cc])lick(ing|s|ed)?\b/g, (m, c, suf) => (c === 'C' ? 'Tap' : 'tap') + (suf === 'ing' ? 'ping' : suf === 'ed' ? 'ped' : suf || ''));
}
/** The step's text for this device. */
function stepText(step) {
  if (!step) return '';
  if (!isTouch()) return step.text || '';
  return step.touchText || touchify(step.text);
}

// =================================================================================================
// Flow
// =================================================================================================
function start(manual = false) {
  const s = store();
  s.status = 'active';
  s.step = 0;
  s.data = {};
  s.manual = !!manual;
  game.message(`<col=1a6a1a>Tutorial:</col> follow the guide panel at the top-left of the screen. ${manual ? '' : 'You can skip it at any time.'}`);
  enterStep();
}

function skip() {
  const s = store();
  if (s.status !== 'active') return;
  s.status = 'skipped';
  clearMarker();
  game.message('<col=1a6a1a>Tutorial skipped.</col> Talk to Wayguide Corin in the square if you ever want a refresher.');
  render();
}

function enterStep() {
  const step = currentStep();
  if (!step) { complete(); return; }
  store().data = {};
  try { step.onStart?.(ctxFor(step)); } catch (e) { console.error('[tutorial] onStart', e); }
  point(true);
  render();
  // already satisfied (e.g. the camera was turned during the previous step)?
  checkPoll();
}

function advance() {
  const step = currentStep();
  if (!step) return;
  clearMarker();
  store().step = stepIndex() + 1;
  if (stepIndex() >= steps().length) { complete(); return; }
  game.message(`<col=1a6a1a>Tutorial:</col> ${steps()[stepIndex()].title}.`);
  enterStep();
}

function complete() {
  const s = store();
  s.status = 'done';
  s.step = steps().length;
  clearMarker();
  if (!s.rewarded) {
    s.rewarded = true;
    for (const it of getData('tutorial', 'reward') || []) game.giveItem(it.id, it.qty, game.player);
    game.message('<col=1a6a1a>Tutorial complete!</col> Wayguide Corin has sent you a starter bundle: coins, food and some travelling gear.');
  } else {
    game.message('<col=1a6a1a>Tutorial complete!</col>');
  }
  game.spawnEffect?.('levelup', game.player);
  render();
  setTimeout(() => { if (status() === 'done') hidePanel(); }, 8000);
}

// =================================================================================================
// Event-driven step completion
// =================================================================================================
function onEvent(name, payload) {
  const step = currentStep();
  if (!step || step.event !== name) return;
  if (payload && payload.player && payload.player !== game.player) return;
  let ok = true;
  try { ok = step.match ? !!step.match(payload || {}, ctxFor(step)) : true; } catch (e) { console.error('[tutorial] match', e); ok = false; }
  if (ok) advance();
}

function checkPoll() {
  const step = currentStep();
  if (!step?.poll) return;
  let ok = false;
  try { ok = !!step.poll(ctxFor(step)); } catch (e) { console.error('[tutorial] poll', e); }
  if (ok) advance();
}

// =================================================================================================
// World targets (minimap flag + distance hint)
// =================================================================================================
function worldTarget(step) {
  const w = step?.world;
  if (!w) return null;
  const p = game.player;
  const at = Array.isArray(w.near) ? { x: w.near[0], y: w.near[1] } : p; // e.g. the river by town, not a far-off coast
  const d = (o) => Math.max(Math.abs(o.x - at.x), Math.abs(o.y - at.y));
  if (w.npc) {
    let best = null;
    for (const n of game.npcs.values()) if (n.def?.id === w.npc && !n.dead && (!best || d(n) < d(best))) best = n;
    return best ? { x: best.x, y: best.y } : null;
  }
  if (w.object) {
    const ids = Array.isArray(w.object) ? w.object : [w.object];
    let best = null;
    for (const o of game.findObjects((o) => ids.includes(o.id))) if (!best || d(o) < d(best)) best = o;
    return best ? { x: best.x, y: best.y } : null;
  }
  if (Number.isFinite(w.x) && Number.isFinite(w.y)) return { x: w.x, y: w.y };
  return null;
}

/** Put a flag on the minimap at the current step's world target (if any). */
function point(quiet = false) {
  const step = currentStep();
  const t = worldTarget(step);
  if (!t) { if (!quiet && step) game.message('<col=1a6a1a>Tutorial:</col> just follow the panel - no walking needed for this step.'); return; }
  const wm = game.ui?.worldMap;
  if (wm?.setMarker) {
    try { wm.setMarker(t.x, t.y); stepState().marker = { x: t.x, y: t.y }; } catch (e) { console.error('[tutorial] marker', e); }
  }
  if (!quiet) game.message('<col=1a6a1a>Tutorial:</col> a flag on your minimap shows the way.');
}

function clearMarker() {
  const m = stepState().marker, wm = game.ui?.worldMap;
  if (!m || !wm) return;
  try { const cur = wm.marker; if (cur && cur.x === m.x && cur.y === m.y) wm.setMarker(null); } catch { /* ignore */ }
  stepState().marker = null;
}

const DIRS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
function hintFor(step) {
  const t = worldTarget(step);
  if (!t) return '';
  const p = game.player;
  const dx = t.x - p.x, dy = t.y - p.y, dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist <= 2) return 'It is right next to you.';
  const ang = Math.atan2(dx, -dy); // 0 = north (y grows south)
  const dir = DIRS[(Math.round(ang / (Math.PI / 4)) + 8) % 8];
  return `About ${dist} tiles ${dir}.`;
}

// =================================================================================================
// Panel + highlights (DOM). Every lookup is optional: if an element is missing we just show text.
// =================================================================================================
const CSS = `
#tutorial-panel { position: absolute; top: 8px; left: 8px; width: 290px; max-width: calc(100vw - 200px); z-index: 12;
  background: rgba(30,26,20,0.92); border: 2px solid #6e604c; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.6);
  color: #f0e6d0; font-size: 13px; line-height: 1.35; padding: 6px 8px 7px; text-shadow: 1px 1px 0 #000; }
#tutorial-panel .tut-head { display: flex; align-items: center; gap: 6px; color: #ffde72; font-weight: 700; font-size: 12px; letter-spacing: .5px; }
#tutorial-panel .tut-head .tut-count { margin-left: auto; color: #c8b890; font-weight: 400; white-space: nowrap; }
#tutorial-panel .tut-title { font-size: 15px; font-weight: 700; color: #fff; margin: 3px 0 2px; }
#tutorial-panel .tut-text b { color: #ffde72; }
#tutorial-panel .tut-hint { color: #9fe09f; margin-top: 3px; font-size: 12px; }
#tutorial-panel .tut-bar { height: 4px; background: #1a1611; border-radius: 2px; margin: 5px 0 2px; overflow: hidden; }
#tutorial-panel .tut-bar > i { display: block; height: 100%; background: linear-gradient(90deg, #6ac04a, #c8e060); }
#tutorial-panel .tut-btns { display: flex; gap: 6px; margin-top: 5px; }
#tutorial-panel button { font-size: 11px; padding: 2px 7px; background: linear-gradient(#5d5244, #3d352b); color: #f0e6d0; border: 1px solid #1a1611; border-radius: 3px; cursor: pointer; }
#tutorial-panel button:hover { filter: brightness(1.2); }
#tutorial-panel button.tut-skip.armed { background: linear-gradient(#8a3a2a, #5a2218); }
#tutorial-panel.collapsed .tut-body { display: none; }
.tut-hl { outline: 2px solid #ffde40 !important; outline-offset: -2px; animation: tutpulse 1s ease-in-out infinite; }
@keyframes tutpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,222,64,0.0); } 50% { box-shadow: 0 0 10px 3px rgba(255,222,64,0.85); } }
#tutorial-arrow { position: fixed; z-index: 2000; width: 0; height: 0; pointer-events: none; border-left: 11px solid transparent; border-right: 11px solid transparent;
  border-top: 16px solid #ffde40; filter: drop-shadow(0 0 2px #000); animation: tutbob 0.8s ease-in-out infinite; display: none; }
@keyframes tutbob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@media (max-width: 600px) { #tutorial-panel { font-size: 12px; width: auto; right: 190px; } }
/* mouse UIs show the hover text ("Chop down Tree / 2 more options") in the top-left corner: sit below it */
html:not(.touch) #tutorial-panel { top: 28px; }
`;

function ensureDom() {
  if (panel) return true;
  const root = document.getElementById('game-root') || document.body;
  if (!root) return false;
  if (!document.getElementById('tutorial-css')) {
    const st = document.createElement('style');
    st.id = 'tutorial-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  panel = document.createElement('div');
  panel.id = 'tutorial-panel';
  panel.style.display = 'none';
  panel.innerHTML = `<div class="tut-head"><span>TUTORIAL</span><span class="tut-count"></span><button class="tut-min" title="Minimise">_</button></div>
    <div class="tut-body"><div class="tut-title"></div><div class="tut-text"></div><div class="tut-hint"></div>
    <div class="tut-bar"><i></i></div>
    <div class="tut-btns"><button class="tut-point" title="Put a flag on the minimap">Show me</button><button class="tut-skip">Skip tutorial</button></div></div>`;
  // keep clicks on the panel from walking the player
  for (const ev of ['mousedown', 'mouseup', 'click', 'contextmenu', 'pointerdown', 'touchstart', 'wheel']) panel.addEventListener(ev, (e) => e.stopPropagation());
  panel.querySelector('.tut-min').onclick = () => panel.classList.toggle('collapsed');
  panel.querySelector('.tut-point').onclick = () => point(false);
  const skipBtn = panel.querySelector('.tut-skip');
  skipBtn.onclick = () => {
    if (status() === 'done') { hidePanel(); return; }
    if (Date.now() < skipArm) { skipArm = 0; skip(); return; }
    skipArm = Date.now() + 3000;
    skipBtn.classList.add('armed');
    skipBtn.textContent = isTouch() ? 'Tap again to skip' : 'Click again to skip';
    setTimeout(() => { skipBtn.classList.remove('armed'); render(); }, 3000);
  };
  root.appendChild(panel);
  arrow = document.createElement('div');
  arrow.id = 'tutorial-arrow';
  document.body.appendChild(arrow);
  return true;
}

function hidePanel() {
  if (panel) panel.style.display = 'none';
  setHighlight(null);
}

function render() {
  if (!ensureDom()) return;
  const st = status();
  if (st !== 'active' && st !== 'done') { hidePanel(); return; }
  panel.style.display = '';
  const all = steps();
  const step = currentStep();
  const n = st === 'done' ? all.length : stepIndex();
  panel.querySelector('.tut-count').textContent = `${Math.min(n + (st === 'done' ? 0 : 1), all.length)} / ${all.length}`;
  panel.querySelector('.tut-bar > i').style.width = `${Math.round((n / Math.max(1, all.length)) * 100)}%`;
  const skipBtn = panel.querySelector('.tut-skip');
  if (Date.now() >= skipArm) { skipBtn.textContent = st === 'done' ? 'Close' : 'Skip tutorial'; skipBtn.classList.remove('armed'); }
  if (st === 'done') {
    panel.querySelector('.tut-title').textContent = 'All done!';
    panel.querySelector('.tut-text').innerHTML = 'You know the basics. Check your inventory for a small <b>starter bundle</b>, then go and find Mira for your first quest.';
    panel.querySelector('.tut-hint').textContent = '';
    panel.querySelector('.tut-point').style.display = 'none';
    setHighlight(null);
    return;
  }
  panel.querySelector('.tut-title').textContent = step?.title || '';
  panel.querySelector('.tut-text').innerHTML = stepText(step);
  panel.querySelector('.tut-point').style.display = step?.world ? '' : 'none';
  updateHint();
  setHighlight(findUiTarget(step));
}

function updateHint() {
  if (!panel || !isActive()) return;
  const h = hintFor(currentStep());
  if (h !== lastHint) { lastHint = h; panel.querySelector('.tut-hint').textContent = h; }
}

/** Resolve a step's `ui` descriptor to a DOM element (or null). */
function findUiTarget(step) {
  const ui = step?.ui;
  if (!ui) return null;
  try {
    if (ui.startsWith('tab:')) {
      const id = ui.slice(4);
      const side = game.ui?.side;
      // once the tab is open, point at something inside it where that makes sense
      if (side?.current === id && step.id === 'fire') return findItemSlot('tinderbox') || side.tabs?.get(id)?.btn || null;
      if (side?.current === id && step.id === 'equip') return findItemSlot('bronze_dagger') || null;
      if (side?.current === id) return null;
      return side?.tabs?.get(id)?.btn || null;
    }
    if (ui.startsWith('quest:')) {
      const q = getQuest(ui.slice(6));
      const pane = game.ui?.getTabElement?.('quests');
      if (!q || !pane) return null;
      if (game.ui?.side?.current !== 'quests') return game.ui?.side?.tabs?.get('quests')?.btn || null;
      return [...pane.querySelectorAll('.quest-row')].find((r) => r.textContent.trim() === q.name) || null;
    }
    if (ui === 'minimap') return document.querySelector('.minimap-wrap');
    return document.querySelector(ui);
  } catch { return null; }
}

/** Inventory slot element showing `itemId` (best effort; layout-agnostic). */
function findItemSlot(itemId) {
  const pane = game.ui?.getTabElement?.('inventory');
  const slot = game.player.inventory.indexOf(itemId);
  if (!pane || slot < 0) return null;
  const bySlot = pane.querySelector(`[data-slot="${slot}"]`);
  if (bySlot) return bySlot;
  const cells = pane.querySelectorAll('.inv-slot, .slot, .item-slot');
  return cells[slot] || null;
}

function setHighlight(elm) {
  if (hlEl && hlEl !== elm) hlEl.classList.remove('tut-hl');
  hlEl = elm && elm.isConnected ? elm : null;
  if (hlEl) hlEl.classList.add('tut-hl');
  placeArrow();
}

function placeArrow() {
  if (!arrow) return;
  if (!hlEl || !hlEl.isConnected || hlEl.offsetParent === null) { arrow.style.display = 'none'; return; }
  const r = hlEl.getBoundingClientRect();
  if (!r.width || !r.height) { arrow.style.display = 'none'; return; }
  arrow.style.display = 'block';
  arrow.style.left = `${Math.round(r.left + r.width / 2 - 11)}px`;
  arrow.style.top = `${Math.round(Math.max(2, r.top - 20))}px`;
}

/** Re-resolve highlights a few times a second (tabs re-render, interfaces open and close). */
function uiLoop() {
  if (!isActive()) { if (hlEl) setHighlight(null); return; }
  const want = findUiTarget(currentStep());
  if (want !== hlEl || (hlEl && !hlEl.classList.contains('tut-hl'))) setHighlight(want);
  else placeArrow();
}

// =================================================================================================
// Init
// =================================================================================================
export function init(g) {
  game = g;
  // a character is "fresh" when no save existed when the systems started (main.js then shows character creation)
  try { fresh = !localStorage.getItem(SAVE_KEY); } catch { fresh = false; }

  const names = new Set(steps().map((s) => s.event).filter(Boolean));
  for (const name of names) game.events.on(name, (payload) => { if (isActive()) onEvent(name, payload); });

  game.onTick((tick) => {
    if (!isActive()) return;
    checkPoll();
    if (tick % 3 === 0) updateHint();
  }, 200);

  game.events.on('load', () => { if (panel) render(); });
  game.events.on('game:ready', () => {
    const s = store();
    if (fresh && !s.status) start(false);
    else if (s.status === 'active') { enterStep(); }
    if (!uiTimer) uiTimer = setInterval(uiLoop, 300);
  });

  game.tutorial = {
    status, currentStep, start, skip, point: () => point(false), complete, advance, stepText, isTouch,
    get steps() { return steps(); },
  };
}
