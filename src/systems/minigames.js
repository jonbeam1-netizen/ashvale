// Minigames: The Crucible (wave survival) and Wardens' Rest (crypt champions). OWNER: activities (minigames).
// Content (map, NPCs, items): src/content/minigames.js.
//
// The Crucible: 18 waves of locally spawned monsters with mixed combat styles, ending with Ignarax, who switches
//   between melee / ranged / magic every few attacks (announced) - protection prayers fully block him. Dying in
//   the pit is safe (area `safeDeath`, see systems/death.js). Rewards: tokens (Crucible Exchange shop) for every
//   wave cleared, the Crucible cape for a full run. Best wave / completions: player.store('crucible').
// Wardens' Rest: dig into five barrow mounds (spade) to reach the champions' crypts; search a sarcophagus to wake
//   its champion. One random champion's tomb hides the way to the tunnels; that champion guards the chest.
//   Loot scales with champions put to rest; each champion has a 4-piece set with a set effect.
//   State: player.store('wardens') = { killed: {id: true}, hidden, chests }.
// Shared: the spade 'Dig' fallback ("you find nothing") and the 'death:safe' respawn.
//
// API: game.minigames = { crucible: { start, forfeit, state }, wardens: { state, reset }, setWorn(id) }
// Events: 'minigame:reward' {id: 'crucible' | 'wardens'} (pets roll on it), 'crucible:wave' {wave}

import { getNpc, getItem } from '../core/registry.js';
import { el, fmt } from '../ui/util.js';
import { getItemIcon } from '../ui/icons.js';
import { CRUCIBLE, CRUCIBLE_WAVES, WARDENS, WARDEN_SURFACE, WARDEN_TUNNELS, WARDEN_PIECES } from '../content/minigames.js';

let game;
const rnd = (n) => Math.floor(Math.random() * n);
const cheb = (a, x, y) => Math.max(Math.abs(a.x - x), Math.abs(a.y - y));
const inRect = (p, r) => p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3];
const areaId = (p) => game.world.getArea(p.x, p.y)?.id || null;

function freeTileIn(rect, avoid, minDist = 3) {
  for (let tries = 0; tries < 60; tries++) {
    const x = rect[0] + rnd(rect[2] - rect[0] + 1), y = rect[1] + rnd(rect[3] - rect[1] + 1);
    if (!game.world.isWalkable(x, y)) continue;
    if (avoid && cheb(avoid, x, y) < minDist) continue;
    if ([...game.npcs.values()].some((n) => !n.dead && n.x === x && n.y === y)) continue;
    return { x, y };
  }
  return { x: rect[0] + 1, y: rect[1] + 1 };
}

function spawnFoe(id, x, y, opts = {}) {
  const npc = game.spawnNpc(id, x, y, { wander: opts.wander ?? 8, respawn: false, homeX: opts.homeX, homeY: opts.homeY });
  if (!npc) return null;
  npc.state.minigame = opts.tag || true;
  const p = game.player;
  npc.combatTarget = p; npc.faceTarget = p; npc.attackTimer = opts.delay ?? 2;
  game.spawnEffect('teleport', npc, { color: opts.color ?? 0xff7a20 });
  return npc;
}

// =================================================================================================
// The Crucible
// =================================================================================================
let run = null;   // { wave, npcs: Set, champion, ended, addsSpawned }
let hud = null;
const cst = () => game.player.store('crucible');
const inCrucible = (p = game.player) => areaId(p) === 'crucible';
const waveTokens = (n) => { let t = 0; for (let w = 1; w <= n; w++) t += w * 12; return t; };

function showHud(text) {
  if (!hud) {
    hud = el('div', 'crucible-hud');
    (document.getElementById('game-root') || document.body).appendChild(hud);
  }
  hud.innerHTML = text;
  hud.style.display = '';
}
function hideHud() { if (hud) hud.style.display = 'none'; }
function updateHud() {
  if (!run) return hideHud();
  const left = [...run.npcs].filter((n) => !n.dead).length;
  showHud(`<b>The Crucible</b> &nbsp; Wave ${Math.max(1, run.wave)} / ${CRUCIBLE_WAVES.length}${run.wave ? ` &nbsp;·&nbsp; Foes left: ${left}` : ''}`);
}

function crucibleStart() {
  const p = game.player;
  if (run) return;
  if (p.dead) return;
  run = { wave: 0, npcs: new Set(), champion: null, ended: false, addsSpawned: false };
  game.teleport(p, CRUCIBLE.entry[0], CRUCIBLE.entry[1]);
  game.message('<col=ff7a20>The gate grinds shut behind you. "Fight well," calls Warden Saska. "Or at least fight loudly."</col>');
  updateHud();
  game.schedule(5, nextWave);
}

function nextWave() {
  if (!run || run.ended) return;
  run.wave++;
  const ids = CRUCIBLE_WAVES[run.wave - 1];
  const p = game.player;
  const champ = ids.includes('crucible_champion');
  game.message(champ ? '<col=ff3000>Final wave! Ignarax, Champion of the Crucible, enters the pit!</col>' : `<col=ff7a20>Wave ${run.wave}</col>`);
  for (const id of ids) {
    const at = freeTileIn(CRUCIBLE.spawnRect, p, getNpc(id)?.size > 1 ? 4 : 3);
    const npc = spawnFoe(id, at.x, at.y, { tag: 'crucible', homeX: 218, homeY: 147, delay: 3 });
    if (!npc) continue;
    run.npcs.add(npc);
    if (id === 'crucible_champion') {
      run.champion = npc;
      npc.state.atkCount = 0; npc.state.phase = '';
      game.say(npc, 'ANOTHER CHALLENGER? GOOD.', { chat: false, color: '#ff7a20' });
    }
  }
  game.events.emit('crucible:wave', { wave: run.wave });
  updateHud();
}

const PHASE_LINES = {
  '': ['IGNARAX RAISES HIS BLADE!', 'Ignarax charges in to crush you - protect from melee!'],
  _ranged: ['FEEL THE STING OF MY ARROWS!', 'Ignarax leaps back and draws a blazing bow - protect from missiles!'],
  _magic: ['BURN!', 'Ignarax wreathes his hands in blue fire - protect from magic!'],
};
function switchPhase(npc) {
  const opts = ['', '_ranged', '_magic'].filter((s) => s !== npc.state.phase);
  const next = opts[rnd(opts.length)];
  const def = getNpc(`crucible_champion${next}`);
  if (!def) return;
  npc.state.phase = next;
  npc.def = def;
  npc.appearanceVersion++;
  npc.attackTimer = Math.max(npc.attackTimer, 3);   // a moment to switch prayers
  const [shout, msg] = PHASE_LINES[next];
  game.say(npc, shout, { chat: false, color: next === '_ranged' ? '#a0ff60' : next === '_magic' ? '#60b0ff' : '#ff6030' });
  game.message(`<col=ff7a20>${msg}</col>`);
}

function crucibleCleanup() {
  if (!run) return;
  for (const n of run.npcs) if (game.npcs.has(n.uid)) game.removeNpc(n);
  run.npcs.clear();
}

/** reason: 'victory' | 'death' | 'forfeit' | 'left' */
function crucibleEnd(reason) {
  if (!run || run.ended) return;
  run.ended = true;
  const s = cst();
  const cleared = reason === 'victory' ? CRUCIBLE_WAVES.length : Math.max(0, run.wave - 1);
  s.best = Math.max(s.best || 0, cleared);
  crucibleCleanup();
  let tokens = reason === 'victory' ? waveTokens(cleared) + 2500 : Math.floor(waveTokens(cleared) / 2);
  if (reason === 'victory') {
    s.completions = (s.completions || 0) + 1;
    const p = game.player;
    const hasCape = p.inventory.has('crucible_cape') || p.bank.has('crucible_cape') || p.equipment.get('cape')?.id === 'crucible_cape';
    game.message('<col=ff3000>You have defeated Ignarax! The Crucible is yours.</col>');
    if (!hasCape) { game.giveItem('crucible_cape', 1); game.message('<col=ff7a20>Warden Saska hands you the Crucible cape. "Wear it with pride. And maybe a little ointment."</col>'); }
    else tokens += 2000;
    game.events.emit('minigame:reward', { id: 'crucible' });
    if (Math.random() < 0.2) game.riddles?.give?.('hard');
    game.message(`<col=ff7a20>Completions: ${s.completions}.</col>`);
  } else if (reason === 'death') {
    game.message(`<col=ff7a20>Warden Saska drags you from the pit. You reached wave ${run.wave}. Your belongings are safe.</col>`);
  } else {
    game.message(`<col=ff7a20>You leave the Crucible after ${cleared} wave${cleared === 1 ? '' : 's'}.</col>`);
  }
  if (tokens > 0) { game.giveItem('crucible_token', tokens); game.message(`You receive ${fmt(tokens)} Crucible tokens.`); }
  s.tokens = (s.tokens || 0) + tokens;
  const wasInside = inCrucible();
  run = null;
  hideHud();
  if (reason === 'victory' || reason === 'forfeit') {
    if (wasInside) game.schedule(reason === 'victory' ? 4 : 1, () => { if (inCrucible() && !game.player.dead) game.teleport(game.player, CRUCIBLE.outside[0], CRUCIBLE.outside[1]); });
  }
}

function crucibleRecords() {
  const s = cst();
  game.message(`<col=ff7a20>Crucible records - best wave: ${s.best || 0} / ${CRUCIBLE_WAVES.length}, completions: ${s.completions || 0}, tokens earned: ${fmt(s.tokens || 0)}.</col>`);
}

function initCrucible() {
  const I = game.interactions, ev = game.events;
  const askEnter = () => game.ui.startDialogue([
    { message: 'Enter the Crucible? Eighteen waves of foes await, ending with the champion Ignarax. Dying inside is safe - you keep everything.' },
    { title: 'Enter the Crucible?', options: [
      { text: 'Yes, open the gate.', action: () => { crucibleStart(); return false; } },
      { text: 'Not yet.', end: true },
    ] },
  ]);
  const askForfeit = () => game.ui.startDialogue([
    { title: 'Leave the Crucible? (half tokens for waves cleared)', options: [
      { text: 'Yes, I give up.', action: () => { crucibleEnd('forfeit'); return false; } },
      { text: 'No, keep fighting!', end: true },
    ] },
  ]);
  I.onObject('Enter', ['crucible_gate'], ({ player }) => {
    if (run || inCrucible(player)) askForfeit(); else askEnter();
  });
  I.onObject('Records', ['crucible_gate'], () => crucibleRecords());
  I.onNpc('Records', ['crucible_warden'], () => crucibleRecords());
  I.onNpc('Talk-to', ['crucible_warden'], ({ target }) => {
    const s = cst();
    game.ui.startDialogue([
      { npc: 'Welcome to the Crucible, Dustwatch\'s proving pit. Eighteen waves, then the champion himself.' },
      { options: [
        { text: 'I want to fight.', action: () => { askEnter(); return false; } },
        { text: 'What do I get?', goto: 'reward' },
        { text: 'I lost my Crucible cape.', goto: 'cape', if: () => (s.completions || 0) > 0 },
        { text: 'Let me see your exchange.', action: () => { game.ui.openShop('crucible_exchange'); return false; } },
        { text: 'Goodbye.', end: true },
      ] },
      { label: 'reward', npc: 'Tokens for every wave you clear - spend them at my exchange. Beat Ignarax and you earn the Crucible cape. Fall, and I drag you out with your gear intact. Mostly intact.', end: true },
      { label: 'cape', action: () => {
        const p = game.player;
        if (p.inventory.has('crucible_cape') || p.bank.has('crucible_cape') || p.equipment.get('cape')?.id === 'crucible_cape') return 'have';
        game.giveItem('crucible_cape', 1);
        return 'given';
      } },
      { label: 'have', npc: 'You still have one, champion. Check your bank.', end: true },
      { label: 'given', npc: 'Here. Try not to set this one on fire.', end: true },
    ], { npc: target });
  });

  ev.on('npc:death', ({ npc }) => {
    if (!run || !run.npcs.has(npc)) return;
    run.npcs.delete(npc);
    updateHud();
    if ([...run.npcs].some((n) => !n.dead)) return;
    if (run.wave >= CRUCIBLE_WAVES.length) { game.schedule(2, () => crucibleEnd('victory')); return; }
    game.message(`<col=60c060>Wave ${run.wave} cleared!</col>`);
    const s = cst();
    s.best = Math.max(s.best || 0, run.wave);
    game.schedule(6, nextWave);
  });
  ev.on('npc:attack', ({ npc }) => {
    if (!run || npc !== run.champion) return;
    npc.state.atkCount = (npc.state.atkCount || 0) + 1;
    if (npc.state.atkCount % 5 === 0) switchPhase(npc);
  });
  ev.on('damage', ({ target }) => {
    if (!run || target !== run.champion || run.addsSpawned || target.hp > target.maxHp / 2 || target.hp <= 0) return;
    run.addsSpawned = true;
    game.say(target, 'TO ME, MY PIT-SPAWN!', { chat: false, color: '#ff7a20' });
    for (const id of ['crucible_adept', 'crucible_slinger']) {
      const at = freeTileIn(CRUCIBLE.spawnRect, game.player, 3);
      const n = spawnFoe(id, at.x, at.y, { tag: 'crucible', homeX: 218, homeY: 147 });
      if (n) run.npcs.add(n);
    }
    updateHud();
  });
  ev.on('area:enter', ({ area, prev }) => {
    if (run && prev?.id === 'crucible' && area?.id !== 'crucible' && !game.player.dead) crucibleEnd('left');
  });
  // a save made inside the pit wakes up outside the gate
  if (inCrucible()) game.teleport(game.player, CRUCIBLE.outside[0], CRUCIBLE.outside[1]);
}

// =================================================================================================
// Wardens' Rest
// =================================================================================================
let champion = null;  // the awake champion Npc
const wst = () => {
  const s = game.player.store('wardens');
  if (!s.killed || typeof s.killed !== 'object') s.killed = {};
  if (!WARDENS.some((w) => w.id === s.hidden)) s.hidden = WARDENS[rnd(WARDENS.length)].id;
  return s;
};
const wardenOf = (cid) => WARDENS.find((w) => w.id === cid);
const killedCount = () => WARDENS.filter((w) => wst().killed[w.id]).length;

function wakeChampion(w, x, y) {
  if (champion && game.npcs.has(champion.uid) && !champion.dead) { game.message(`${champion.name} is already awake!`); return; }
  champion = spawnFoe(`warden_${w.id}`, x, y, { tag: 'warden', wander: 4, color: 0x60c0ff, delay: 3 });
  if (!champion) return;
  champion.state.warden = w.id;
  game.say(champion, ['YOU DARE?', 'WHO DISTURBS MY REST?', 'THE VALE IS STILL MINE TO GUARD.'][rnd(3)], { chat: false, color: w.trim });
}

function moundExit(w) {
  const dx = Math.sign(WARDEN_SURFACE[0] - w.mound[0]), dy = Math.sign(WARDEN_SURFACE[1] - w.mound[1]);
  return { x: w.mound[0] + dx * 3, y: w.mound[1] + dy * 3 };
}

function chestLoot() {
  const s = wst();
  const n = killedCount();
  const loot = [];
  const add = (id, qty) => { if (getItem(id) && qty > 0) loot.push({ id, qty }); };
  add('coins', n * (250 + rnd(450)) + 100);
  const sig = [['mind_sigil', [40, 120]], ['thorn_sigil', [15, 50]], ['rift_sigil', [10, 40]], ['void_sigil', [8, 30]], ['nexus_sigil', [5, 20]]];
  for (let i = 0; i < Math.max(1, Math.ceil(n / 2)); i++) { const [id, [a, b]] = sig[rnd(sig.length)]; add(id, a + rnd(b - a + 1)); }
  if (n >= 3) add('big_bones', 2 + rnd(4));
  if (n >= 4 && Math.random() < 0.5) add('ancient_coin', 1 + rnd(3));
  // set pieces: one roll per champion put to rest
  const pool = WARDENS.filter((w) => s.killed[w.id]).flatMap((w) => WARDEN_PIECES.map((p) => `${w.id}_${p}`));
  for (let i = 0; i < n; i++) if (pool.length && Math.random() < 1 / 45) add(pool[rnd(pool.length)], 1);
  return loot;
}

function openChest() {
  const s = wst();
  const w = wardenOf(s.hidden);
  if (!s.killed[w.id]) {
    if (champion && !champion.dead && game.npcs.has(champion.uid)) { game.message(`${champion.name} still guards the hoard!`); return; }
    game.message(`<col=60c0ff>The lid will not budge. Behind you, bones rattle - ${w.name} rises to defend the hoard!</col>`);
    wakeChampion(w, WARDEN_TUNNELS.chest[0], WARDEN_TUNNELS.chest[1] + 2);
    return;
  }
  const n = killedCount();
  const loot = chestLoot();
  for (const l of loot) game.giveItem(l.id, l.qty);
  s.chests = (s.chests || 0) + 1;
  const uniques = loot.filter((l) => getItem(l.id)?.wardenSet);
  game.message(`<col=60c0ff>You open the Wardens' chest. (${n}/5 champions at rest; chests opened: ${s.chests})</col>`);
  for (const u of uniques) game.message(`<col=ff3060>A piece of grave-gear: ${getItem(u.id).name}!</col>`);
  if (n >= 4) game.events.emit('minigame:reward', { id: 'wardens' });
  if (n >= 3 && Math.random() < 1 / 30) game.riddles?.give?.('hard');
  game.ui.openInterface({
    id: 'warden_chest', title: "The Wardens' hoard", width: 300,
    render: (body) => {
      body.innerHTML = '';
      const grid = el('div', 'rc-grid');
      for (const l of loot) {
        const def = getItem(l.id);
        const c = el('div', `rc-item${def?.wardenSet ? ' rc-rare' : ''}`, `<img alt="" src="${getItemIcon(l.id, l.qty)}">${def?.stackable || l.qty > 1 ? `<span>${fmt(l.qty)}</span>` : ''}`);
        c.title = def?.name || l.id;
        grid.appendChild(c);
      }
      body.appendChild(grid);
    },
  });
  // the wardens settle back into their tombs; a new one guards the way next time
  s.killed = {};
  s.hidden = WARDENS[rnd(WARDENS.length)].id;
}

function initWardens() {
  const I = game.interactions, ev = game.events;

  // dig into a mound
  I.onItem('Dig', ['spade'], ({ player }) => {
    const w = WARDENS.find((m) => cheb(player, m.mound[0], m.mound[1]) <= 2);
    if (!w) return false;
    game.actions.start(player, {
      name: 'dig', anim: 'mine', tool: 'spade', delay: 2,
      onTick: () => {
        game.message(`You dig into the mound... and break through into ${w.name.split(' ')[0]}'s crypt!`);
        game.teleport(player, w.room + 1, 228);
        return false;
      },
    });
  });

  I.onObject('Search', WARDENS.map((w) => `warden_tomb_${w.id}`), ({ target }) => {
    const w = wardenOf(target.id.replace('warden_tomb_', ''));
    const s = wst();
    if (s.hidden === w.id) {
      game.ui.startDialogue([
        { message: 'Beneath the sarcophagus lid, a narrow passage leads down into darkness. A draught smells of old gold.' },
        { title: 'Climb into the tunnel?', options: [
          { text: 'Yes, I\'m fearless.', action: () => { game.teleport(game.player, WARDEN_TUNNELS.entry[0], WARDEN_TUNNELS.entry[1]); game.message('You squeeze into the Hollow Tunnels.'); return false; } },
          { text: 'No way.', end: true },
        ] },
      ]);
      return;
    }
    if (s.killed[w.id]) { game.message(`The sarcophagus is empty. ${w.name} already rests.`); return; }
    game.playAnim(game.player, 'pickup', 900);
    wakeChampion(w, w.room + 3, 227);
  });

  for (const w of WARDENS) {
    I.onObject('Climb-up', [`warden_stairs_${w.id}`], ({ player }) => {
      const at = moundExit(w);
      game.teleport(player, at.x, at.y);
      game.message('You climb back up into the daylight.');
    });
  }
  I.onObject('Climb-up', ['warden_tunnel_stairs'], ({ player }) => {
    game.teleport(player, WARDEN_SURFACE[0], WARDEN_SURFACE[1] + 1);
    game.message('You climb up beside the cairn.');
  });
  I.onObject('Open', ['warden_chest'], () => openChest());

  ev.on('npc:death', ({ npc, killer }) => {
    const cid = npc?.state?.warden;
    if (!cid) return;
    if (npc === champion) champion = null;
    if (killer && killer !== game.player) return;
    const s = wst();
    s.killed[cid] = true;
    const w = wardenOf(cid);
    game.message(`<col=60c0ff>${w.name} crumbles back into the dust. (${killedCount()}/5 at rest)</col>`);
  });
  // leaving the crypts lets an awake champion sleep again
  ev.on('area:enter', ({ area }) => {
    if (!champion) return;
    if (area?.id === 'warden_crypts' || area?.id === 'warden_tunnels') return;
    if (game.npcs.has(champion.uid)) game.removeNpc(champion);
    champion = null;
  });
}

// =================================================================================================
// Grave-gear set effects
// =================================================================================================
const SLOT_OF = { helm: 'head', body: 'body', legs: 'legs', weapon: 'weapon' };
function setWorn(cid, p = game.player) { return WARDEN_PIECES.every((piece) => p.equipment.get(SLOT_OF[piece])?.id === `${cid}_${piece}`); }
function wornSet(p = game.player) { return WARDENS.find((w) => setWorn(w.id, p))?.id || null; }

function initSetEffects() {
  const ev = game.events;
  ev.on('damage:before', (e) => {
    if (e.source !== game.player || !e.combatHit || !(e.amount > 0) || e.target === game.player) return;
    const set = wornSet();
    if (set === 'halvard' && e.type === 'melee') {
      const p = game.player;
      e.amount = Math.floor(e.amount * (1 + 0.6 * (1 - p.hp / Math.max(1, p.maxHp))));
    } else if (set === 'sorrel' && e.type === 'ranged' && Math.random() < 0.25) {
      e.amount = Math.floor(e.amount * 1.4);
      game.spawnEffect('sparkle', e.target, { color: 0xa0d0a0 });
    }
  });
  ev.on('damage', (e) => {
    if (e.source !== game.player || !e.combatHit || !(e.amount > 0) || e.target === game.player || e.target.dead) return;
    const set = wornSet();
    if (!set || Math.random() >= 0.25) return;
    const p = game.player;
    if (set === 'morwen' && e.type === 'magic') {
      const n = Math.max(1, Math.floor(e.amount / 4));
      game.combat?.lowerStat(e.target, 'defence', n); game.combat?.lowerStat(e.target, 'magic', n);
      game.spawnEffect('splash', e.target, { color: 0x9aff9a });
    } else if (set === 'grimbald' && e.type === 'melee') {
      game.heal(p, e.amount);
      game.spawnEffect('sparkle', p, { color: 0xc04040 });
    } else if (set === 'ysmera' && e.type === 'melee') {
      game.combat?.poison(e.target, 8, p);
      game.prayer?.restorePoints?.(p, 2);
      game.spawnEffect('sparkle', e.target, { color: 0x80ff60 });
    }
  });
  // examine text of the set pieces lists the effect
  for (const w of WARDENS) for (const piece of WARDEN_PIECES) {
    const def = getItem(`${w.id}_${piece}`);
    if (def && !def.examine.includes('Set effect')) def.examine = `${def.examine} Set effect - ${w.effect}`;
  }
}

// =================================================================================================
function injectCss() {
  if (document.getElementById('minigames-css')) return;
  const css = document.createElement('style');
  css.id = 'minigames-css';
  css.textContent = `
.crucible-hud { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 6; pointer-events: none;
  padding: 3px 12px; background: rgba(30,12,4,0.78); border: 1px solid #7a3a10; border-radius: 4px; color: #ffb060; font-size: 13px;
  text-shadow: 1px 1px 0 #000; white-space: nowrap; }
.crucible-hud b { color: #ff7a20; }
`;
  document.head.appendChild(css);
}

export function init(g) {
  game = g;
  injectCss();
  const I = game.interactions;
  const ev = game.events;
  // spade fallback: registered first, so every other 'Dig' handler is tried before it
  I.onItem('Dig', ['spade'], ({ player }) => {
    game.actions.start(player, {
      name: 'dig', anim: 'mine', tool: 'spade', delay: 2,
      onTick: () => { game.message('You dig a little hole, but find nothing of interest.'); return false; },
    });
  });

  // safe-death areas (systems/death.js emits 'death:safe' instead of the normal death)
  ev.on('death:safe', ({ player, area }) => {
    if (player !== game.player) return;
    if (area?.id === 'crucible') crucibleEnd('death');
    game.schedule(4, () => {
      const to = area?.safeDeath || game.registry.getMapConfig().respawn;
      game.combat?.curePoison?.(player);
      game.respawnPlayer(player, to.x, to.y);
      game.message('You come to your senses outside, battered but whole.');
    });
  });

  initCrucible();
  initWardens();
  initSetEffects();

  game.minigames = {
    crucible: { start: crucibleStart, forfeit: () => crucibleEnd('forfeit'), state: () => run, records: () => ({ ...cst() }), nextWave },
    wardens: { state: () => wst(), reset: () => { const s = wst(); s.killed = {}; }, champion: () => champion },
    setWorn, wornSet,
  };
}
