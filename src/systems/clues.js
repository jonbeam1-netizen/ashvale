// Wayfinder's Riddles: riddle scrolls dropped by monsters lead through 2-6 steps to a reward casket.
// OWNER: activities (clues). Data: src/content/clues.js.
//
// * Drops: on 'npc:death' credited to the local player (tier by monster level, bosses roll hard scrolls), spawned
//   as an untradeable (therefore local) ground item. Only one scroll or casket of each tier at a time.
// * Steps: riddle / coordinate / map -> dig with a spade; emote inside an area; talk to an NPC; hard trails may
//   hand out a sliding puzzle box. Progress lives in player.store('riddles').active[tier].
// * Spade 'Dig' is shared with other activities: handlers return false when the dig is not theirs.
//
// API: game.riddles = { give(tier), state(), describe(tier), complete(tier), openCasket(tier) }

import { getItem, getNpc } from '../core/registry.js';
import { el, escapeHtml, fmt } from '../ui/util.js';
import { getItemIcon } from '../ui/icons.js';
import { TIERS, TIER_COLOR, ORIGIN, REWARDS, DIGS, EMOTE_STEPS, TALK_STEPS, STEP_COUNT, STEP_WEIGHTS, DROP_RATES, BOSS_HARD_CHANCE } from '../content/clues.js';

let game;
const pools = { dig: {}, emote: {}, talk: {} };

const st = () => {
  const s = game.player.store('riddles');
  if (!s.active || typeof s.active !== 'object') s.active = {};
  if (!s.done || typeof s.done !== 'object') s.done = {};
  if (!s.log || typeof s.log !== 'object') s.log = {};
  return s;
};
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
const randInt = ([a, b]) => a + rnd(b - a + 1);
const scrollId = (t) => `riddle_scroll_${t}`;
const casketId = (t) => `riddle_casket_${t}`;
const hasAny = (id) => game.player.inventory.has(id) || game.player.bank.has(id);
const ownsTier = (t) => hasAny(scrollId(t)) || hasAny(casketId(t)) || !!game.groundItems && [...game.groundItems.values()].some((g) => (g.itemId === scrollId(t) || g.itemId === casketId(t)) && g.owner === game.player.name);

// -------------------------------------------------------------------------------------------------
// Pools (validated against the built world)
// -------------------------------------------------------------------------------------------------
function nearestWalkable(x, y, r = 3) {
  const w = game.world;
  if (w.isWalkable(x, y)) return { x, y };
  for (let d = 1; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) === d && w.isWalkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
  }
  return null;
}

function buildPools() {
  const npcIds = new Set([...game.npcs.values()].map((n) => n.id));
  for (const t of TIERS) {
    pools.dig[t] = DIGS[t].map(([id, x, y, riddle]) => { const p = nearestWalkable(x, y); return p ? { id, x: p.x, y: p.y, riddle } : null; }).filter(Boolean);
    pools.emote[t] = EMOTE_STEPS[t].map(([id, emote, x0, y0, x1, y1, text]) => ({ id, emote, x0, y0, x1, y1, text }));
    pools.talk[t] = TALK_STEPS[t].filter(([npc]) => npcIds.has(npc) && (getNpc(npc)?.options || []).includes('Talk-to'))
      .map(([npc, riddle, reply]) => ({ id: npc, npc, riddle, reply }));
  }
}
const findRef = (kind, tier, id) => pools[kind][tier]?.find((r) => r.id === id) || TIERS.map((t) => pools[kind][t]?.find((r) => r.id === id)).find(Boolean);

// -------------------------------------------------------------------------------------------------
// Trail generation & description
// -------------------------------------------------------------------------------------------------
function generate(tier) {
  const n = randInt(STEP_COUNT[tier]);
  const weights = STEP_WEIGHTS[tier];
  const steps = [];
  const used = new Set();
  let guard = 0;
  while (steps.length < n && guard++ < 200) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total, type = 'riddle';
    for (const [k, w] of Object.entries(weights)) { r -= w; if (r <= 0) { type = k; break; } }
    if (type === 'puzzle') {
      if (steps.length === 0 || steps.some((s) => s.type === 'puzzle')) continue;
      steps.push({ type }); continue;
    }
    const kind = type === 'emote' ? 'emote' : type === 'talk' ? 'talk' : 'dig';
    const pool = pools[kind][tier];
    if (!pool?.length) continue;
    const ref = pick(pool);
    if (used.has(`${kind}:${ref.id}`)) continue;
    used.add(`${kind}:${ref.id}`);
    steps.push({ type, ref: ref.id });
  }
  if (!steps.length) steps.push({ type: 'riddle', ref: pools.dig[tier][0]?.id });
  return { steps, i: 0 };
}

function active(tier) {
  const s = st();
  let a = s.active[tier];
  if (!a || !Array.isArray(a.steps) || !a.steps.length || a.i >= a.steps.length) a = s.active[tier] = generate(tier);
  return a;
}
const currentStep = (tier) => { const a = active(tier); return a.steps[a.i]; };

const paces = (dx, dy) => {
  const ew = dx === 0 ? '' : `${Math.abs(dx)} pace${Math.abs(dx) === 1 ? '' : 's'} ${dx > 0 ? 'east' : 'west'}`;
  const ns = dy === 0 ? '' : `${Math.abs(dy)} pace${Math.abs(dy) === 1 ? '' : 's'} ${dy > 0 ? 'south' : 'north'}`;
  return [ew, ns].filter(Boolean).join(' and ') || 'right on the spot';
};

/** {title, text, map?: {x,y}} for the current step of a tier. */
function describe(tier) {
  const step = currentStep(tier);
  const a = active(tier);
  const head = `Step ${a.i + 1} of ${a.steps.length}`;
  switch (step.type) {
    case 'riddle': { const d = findRef('dig', tier, step.ref); return { head, text: d?.riddle || 'The ink has run...', hint: 'Dig with a spade at the place described.' }; }
    case 'coord': {
      const d = findRef('dig', tier, step.ref);
      return { head, text: d ? `From ${ORIGIN.name}, walk ${paces(d.x - ORIGIN.x, d.y - ORIGIN.y)}. Then dig.` : '...', hint: 'coord' };
    }
    case 'map': { const d = findRef('dig', tier, step.ref); return { head, text: 'A rough sketch of somewhere in Ashvale. X marks the spot.', map: d, hint: 'Dig with a spade where the X is drawn.' }; }
    case 'emote': { const e = findRef('emote', tier, step.ref); return { head, text: e?.text || '...', hint: 'Perform the right emote in the right place (Emotes tab).' }; }
    case 'talk': { const t = findRef('talk', tier, step.ref); return { head, text: t?.riddle || '...', hint: 'Speak to the person described.' }; }
    case 'puzzle': return { head, text: 'Within this scroll lies a box of sliding tiles. Make the picture whole and the trail will continue.', hint: 'Open the puzzle box in your pack.' };
    default: return { head, text: '...' };
  }
}

// -------------------------------------------------------------------------------------------------
// Progress
// -------------------------------------------------------------------------------------------------
function carried(tier) { return game.player.inventory.has(scrollId(tier)); }

function complete(tier) {
  const a = active(tier);
  a.i++;
  game.spawnEffect('sparkle', game.player, { color: 0xffe080 });
  if (a.i >= a.steps.length) {
    const slot = game.player.inventory.indexOf(scrollId(tier));
    if (slot >= 0) { game.player.inventory.removeAt(slot, 1); game.player.inventory.set(slot, { id: casketId(tier), qty: 1 }); }
    else game.giveItem(casketId(tier), 1);
    st().active[tier] = null;
    game.message(`<col=${TIER_COLOR[tier].slice(1)}>Well done! You have reached the end of the trail and found a Wayfinder's casket.</col>`);
  } else {
    game.message('<col=a06000>You find another riddle. The scroll rewrites itself before your eyes.</col>');
    if (a.steps[a.i].type === 'puzzle' && !game.player.inventory.has('riddle_puzzle_box')) game.giveItem('riddle_puzzle_box', 1);
  }
}

function tiersWith(pred) { return TIERS.filter((t) => carried(t) && pred(currentStep(t), t)); }

// -------------------------------------------------------------------------------------------------
// UI
// -------------------------------------------------------------------------------------------------
function drawMap(canvas, at) {
  const R = 9, S = 10, N = R * 2 + 1;
  canvas.width = N * S; canvas.height = N * S;
  const ctx = canvas.getContext('2d');
  const w = game.world;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = at.x + dx, y = at.y + dy;
    const t = w.terrainAt(x, y);
    ctx.fillStyle = t?.minimap || t?.color || '#000';
    ctx.fillRect((dx + R) * S, (dy + R) * S, S, S);
    const objs = w.inBounds(x, y) ? w.objectsAt(x, y) : [];
    for (const o of objs) {
      if (o.hidden) continue;
      const tpl = o.def.model?.template || '';
      if (tpl === 'tree' || tpl.includes('tree') || tpl === 'dec_palm') { ctx.fillStyle = '#1e4a1e'; ctx.beginPath(); ctx.arc((dx + R + 0.5) * S, (dy + R + 0.5) * S, S * 0.42, 0, Math.PI * 2); ctx.fill(); }
      else if (o.blocks) { ctx.fillStyle = tpl === 'wall' ? '#2a2420' : 'rgba(40,30,20,0.6)'; ctx.fillRect((dx + R) * S + 1, (dy + R) * S + 1, S - 2, S - 2); }
    }
  }
  // the X
  const cx = (R + 0.5) * S, cy = (R + 0.5) * S;
  ctx.strokeStyle = '#b01010'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6); ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6); ctx.stroke();
  // torn edges
  ctx.fillStyle = '#d8c49e';
  for (let i = 0; i < N * S; i += 6) {
    ctx.fillRect(i, 0, 6, 2 + rnd(5)); ctx.fillRect(i, N * S - 2 - rnd(5), 6, 8);
    ctx.fillRect(0, i, 2 + rnd(5), 6); ctx.fillRect(N * S - 2 - rnd(5), i, 8, 6);
  }
}

function openScroll(tier) {
  const d = describe(tier);
  game.ui.openInterface({
    id: 'riddle_scroll', title: `Riddle scroll (${tier})`, width: 330, className: 'journal riddle-scroll',
    render: (body) => {
      body.innerHTML = '';
      body.appendChild(el('div', 'rs-head', escapeHtml(d.head)));
      if (d.map) {
        const c = document.createElement('canvas');
        c.className = 'rs-map';
        drawMap(c, d.map);
        body.appendChild(c);
      }
      body.appendChild(el('div', 'rs-text', escapeHtml(d.text)));
      if (d.hint === 'coord') {
        const p = game.player;
        body.appendChild(el('div', 'rs-hint', `Your own bearing: ${escapeHtml(paces(p.x - ORIGIN.x, p.y - ORIGIN.y))} of ${escapeHtml(ORIGIN.name)}.`));
      } else if (d.hint) body.appendChild(el('div', 'rs-hint', escapeHtml(d.hint)));
    },
  });
}

function openCasket(tier, slot) {
  const R = REWARDS[tier];
  const p = game.player;
  const loot = [];
  const add = (id, qty) => { if (!getItem(id)) return; const ex = loot.find((l) => l.id === id && getItem(id).stackable); if (ex) ex.qty += qty; else loot.push({ id, qty }); };
  const rolls = randInt(R.rolls);
  for (let r = 0; r < rolls; r++) {
    if (R.megaRare?.length && Math.random() < R.megaChance) add(pick(R.megaRare), 1);
    else if (Math.random() < R.rareChance) add(pick(R.rare.filter((id) => getItem(id))), 1);
    else { const [id, q] = pick(R.common.filter(([id]) => getItem(id))); add(id, randInt(q)); }
  }
  if (!loot.some((l) => l.id === 'coins')) add('coins', randInt(R.common.find(([id]) => id === 'coins')?.[1] || [50, 100]));
  p.inventory.removeAt(slot, 1);
  for (const l of loot) game.giveItem(l.id, l.qty);
  const s = st();
  s.done[tier] = (s.done[tier] || 0) + 1;
  for (const l of loot) if (getItem(l.id)?.riddleReward || l.id.startsWith('emote_scroll_')) s.log[l.id] = (s.log[l.id] || 0) + l.qty;
  const value = loot.reduce((a, l) => a + (getItem(l.id)?.value || 0) * l.qty, 0);
  game.message(`<col=${TIER_COLOR[tier].slice(1)}>You have completed ${s.done[tier]} ${tier} riddle trail${s.done[tier] === 1 ? '' : 's'}.</col>`);
  game.events.emit('riddle:complete', { tier, loot, count: s.done[tier] });
  game.ui.openInterface({
    id: 'riddle_casket', title: "Wayfinder's casket", width: 300,
    render: (body) => {
      body.innerHTML = '';
      const grid = el('div', 'rc-grid');
      for (const l of loot) {
        const def = getItem(l.id);
        const c = el('div', `rc-item${def?.riddleReward || l.id.startsWith('emote_scroll_') ? ' rc-rare' : ''}`, `<img alt="" src="${getItemIcon(l.id, l.qty)}">${def?.stackable || l.qty > 1 ? `<span>${fmt(l.qty)}</span>` : ''}`);
        c.title = def?.name || l.id;
        grid.appendChild(c);
      }
      body.appendChild(grid);
      body.appendChild(el('div', 'rc-value', `Value: ${fmt(value)} coins`));
    },
  });
}

// ---- puzzle box --------------------------------------------------------------------------------------
let puzzleImage = null;
function puzzlePicture() {
  if (puzzleImage) return puzzleImage;
  const c = document.createElement('canvas'); c.width = c.height = 150;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(75, 75, 10, 75, 75, 100); grd.addColorStop(0, '#f0d890'); grd.addColorStop(1, '#5a3a1a');
  g.fillStyle = grd; g.fillRect(0, 0, 150, 150);
  g.strokeStyle = '#3a2410'; g.lineWidth = 3;
  for (const r of [60, 42]) { g.beginPath(); g.arc(75, 75, r, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = '#b01010';
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    g.beginPath(); g.moveTo(75 + Math.cos(a) * 66, 75 + Math.sin(a) * 66); g.lineTo(75 + Math.cos(a + 0.35) * 14, 75 + Math.sin(a + 0.35) * 14);
    g.lineTo(75, 75); g.lineTo(75 + Math.cos(a - 0.35) * 14, 75 + Math.sin(a - 0.35) * 14); g.closePath(); g.fill();
  }
  g.fillStyle = '#e8c040'; g.beginPath(); g.arc(75, 75, 9, 0, Math.PI * 2); g.fill();
  g.font = 'bold 16px serif'; g.fillStyle = '#2a1808'; g.textAlign = 'center';
  g.fillText('N', 75, 22); g.fillText('S', 75, 140); g.fillText('W', 14, 80); g.fillText('E', 136, 80);
  puzzleImage = c.toDataURL();
  return puzzleImage;
}

function openPuzzle(slot) {
  const s = st();
  if (!Array.isArray(s.puzzle) || s.puzzle.length !== 9) {
    const b = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    let z = 8;
    for (let k = 0; k < 120; k++) {
      const nb = [z - 3, z + 3, z % 3 ? z - 1 : -1, z % 3 < 2 ? z + 1 : -1].filter((n) => n >= 0 && n < 9);
      const n = pick(nb); [b[z], b[n]] = [b[n], b[z]]; z = n;
    }
    s.puzzle = b;
  }
  const solved = () => s.puzzle.every((v, i) => v === (i === 8 ? 0 : i + 1));
  game.ui.openInterface({
    id: 'riddle_puzzle', title: 'Puzzle box', width: 240, className: 'riddle-puzzle',
    render: (body, close) => {
      const draw = () => {
        body.innerHTML = '';
        const grid = el('div', 'rp-grid');
        const img = puzzlePicture();
        s.puzzle.forEach((v, i) => {
          const c = el('div', `rp-tile${v ? '' : ' rp-blank'}`);
          if (v) { const k = v - 1; c.style.backgroundImage = `url(${img})`; c.style.backgroundPosition = `${-(k % 3) * 50}px ${-Math.floor(k / 3) * 50}px`; }
          c.onclick = () => {
            const z = s.puzzle.indexOf(0);
            const adj = (Math.abs(z - i) === 3) || (Math.abs(z - i) === 1 && Math.floor(z / 3) === Math.floor(i / 3));
            if (!v || !adj) return;
            [s.puzzle[z], s.puzzle[i]] = [s.puzzle[i], s.puzzle[z]];
            if (solved()) {
              s.puzzle = null;
              close();
              const t = tiersWith((step) => step.type === 'puzzle')[0];
              const at = game.player.inventory.indexOf('riddle_puzzle_box');
              if (at >= 0) game.player.inventory.removeAt(at, 1);
              game.message('With a click, the tiles lock into place and the box springs open!');
              if (t) complete(t); else game.message('The box is empty. It seems it was meant for another trail.');
              return;
            }
            draw();
          };
          grid.appendChild(c);
        });
        body.appendChild(grid);
        body.appendChild(el('div', 'rp-hint', 'Slide the tiles to make the compass whole.'));
      };
      draw();
    },
  });
}

function injectCss() {
  if (document.getElementById('riddles-css')) return;
  const css = document.createElement('style');
  css.id = 'riddles-css';
  css.textContent = `
.riddle-scroll .iface-body { text-align: center; }
.riddle-scroll .rs-head { font-size: 12px; color: #5a3a10; margin-bottom: 4px; }
.riddle-scroll .rs-text { font-size: 14px; line-height: 1.35; margin: 6px 4px; font-style: italic; }
.riddle-scroll .rs-hint { font-size: 11px; color: #6a4a20; margin-top: 6px; }
.riddle-scroll .rs-map { display: block; margin: 2px auto; width: 190px; height: 190px; image-rendering: pixelated; filter: sepia(0.6) saturate(0.8) contrast(1.05); border: 1px solid #8a6a3a; }
.rc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.rc-item { position: relative; background: rgba(0,0,0,0.25); border: 1px solid #1a1611; border-radius: 3px; height: 40px; display: flex; align-items: center; justify-content: center; }
.rc-item.rc-rare { box-shadow: inset 0 0 0 1px #e8c040; }
.rc-item img { width: 36px; height: 32px; }
.rc-item span { position: absolute; left: 2px; top: 0; font-size: 11px; color: #ffff00; }
.rc-value { text-align: center; margin-top: 6px; color: #ffd890; }
.riddle-puzzle .rp-grid { display: grid; grid-template-columns: repeat(3, 50px); gap: 2px; justify-content: center; }
.riddle-puzzle .rp-tile { width: 50px; height: 50px; border: 1px solid #1a1611; cursor: pointer; background-size: 150px 150px; }
.riddle-puzzle .rp-blank { background: rgba(0,0,0,0.5); cursor: default; }
.riddle-puzzle .rp-hint { text-align: center; font-size: 11px; margin-top: 6px; color: #c8b890; }
`;
  document.head.appendChild(css);
}

// -------------------------------------------------------------------------------------------------
function dropFor(npc) {
  const lvl = npc.def.combatLevel || 0;
  if (!lvl || npc.state?.petOf || npc.state?.noClues || npc.def.noClues) return null;
  if (npc.def.boss && Math.random() < BOSS_HARD_CHANCE) return 'hard';
  for (const r of DROP_RATES) if (lvl >= r.min && lvl <= r.max && Math.random() < r.chance) return r.tier;
  return null;
}

/** Give a scroll of `tier` (used by drops and other activities). Returns true if given. */
function give(tier, at = null) {
  if (!TIERS.includes(tier) || ownsTier(tier)) return false;
  st().active[tier] = null;
  if (at) game.spawnGroundItem(scrollId(tier), 1, at.x, at.y, { owner: game.player.name, privateTicks: 600, ticks: 600 });
  else game.giveItem(scrollId(tier), 1);
  return true;
}

export function init(g) {
  game = g;
  const ev = game.events, I = game.interactions;
  injectCss();
  buildPools();

  const spade = getItem('spade');
  if (spade && !spade.options.includes('Dig')) spade.options.unshift('Dig');

  I.onItem('Read', TIERS.map(scrollId), ({ item }) => { openScroll(getItem(item.id).riddleTier); });
  I.onItem('Open', TIERS.map(casketId), ({ item, slot }) => { openCasket(getItem(item.id).riddleTier, slot); });
  I.onItem('Open', ['riddle_puzzle_box'], ({ slot }) => openPuzzle(slot));

  // digging (riddle / coordinate / map steps)
  I.onItem('Dig', ['spade'], ({ player }) => {
    const t = tiersWith((step, tier) => {
      if (!['riddle', 'coord', 'map'].includes(step.type)) return false;
      const d = findRef('dig', tier, step.ref);
      return d && Math.max(Math.abs(player.x - d.x), Math.abs(player.y - d.y)) <= (step.type === 'riddle' ? 2 : 1);
    })[0];
    if (!t) return false;
    game.actions.start(player, {
      name: 'dig', anim: 'mine', tool: 'spade', delay: 2,
      onTick: () => {
        game.message('You dig a hole... and find a small bundle of oilcloth!');
        complete(t);
        return false;
      },
    });
  });

  // talk steps (handlers fall through to the NPC's normal dialogue when not on a matching step)
  const talkIds = [...new Set(TIERS.flatMap((t) => pools.talk[t].map((r) => r.npc)))];
  if (talkIds.length) {
    I.onNpc('Talk-to', talkIds, ({ target }) => {
      const t = tiersWith((step, tier) => step.type === 'talk' && findRef('talk', tier, step.ref)?.npc === target.id)[0];
      if (!t) return false;
      const ref = findRef('talk', t, currentStep(t).ref);
      game.ui.startDialogue([{ player: 'I have a riddle scroll from the Wayfinders...' }, { npc: ref.reply }, { action: () => { complete(t); return false; } }], { npc: target });
    });
  }

  // emote steps
  ev.on('emote', ({ player, id }) => {
    if (player !== game.player) return;
    const t = tiersWith((step, tier) => {
      if (step.type !== 'emote') return false;
      const e = findRef('emote', tier, step.ref);
      return e && e.emote === id && player.x >= e.x0 && player.x <= e.x1 && player.y >= e.y0 && player.y <= e.y1;
    })[0];
    if (!t) return;
    game.schedule(3, () => {
      game.message('<col=a06000>A faint voice on the wind: "Well performed, Wayfinder." A new riddle unfurls in your pack.</col>');
      complete(t);
    });
  });

  // drops
  ev.on('npc:death', ({ npc, killer }) => {
    if (killer !== game.player || !npc?.def) return;
    const tier = dropFor(npc);
    if (!tier || ownsTier(tier)) return;
    const at = { x: npc.x, y: npc.y };
    game.schedule(3, () => { if (give(tier, at)) game.message(`<col=${TIER_COLOR[tier].slice(1)}>A riddle scroll (${tier}) flutters to the ground.</col>`); });
  });

  // a lost scroll can be read again only when carried; the puzzle box is re-issued from the scroll
  ev.on('ui:open', ({ id }) => {
    if (id !== 'riddle_scroll') return;
    for (const t of tiersWith((s) => s.type === 'puzzle')) if (!game.player.inventory.has('riddle_puzzle_box')) game.giveItem('riddle_puzzle_box', 1);
  });

  game.riddles = {
    give, complete, describe, openCasket,
    state: () => st(),
    pools: () => pools,
    current: (tier) => currentStep(tier),
  };
}
