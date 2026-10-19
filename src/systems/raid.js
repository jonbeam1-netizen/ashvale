// The Drowned Sun - co-op raid runtime (state, multiplayer, doors, HUD). Content: src/content/raid.js (+ raid_items.js).
// Room logic: ./raid_rooms.js (puzzle, waves, bosses, telegraphs). Rewards & supplies: ./raid_rewards.js.
//
// Authority. Offline (or as the multiplayer HOST) this client owns the raid state `S`: run id, furthest room started /
// cleared, party size (fixed when the gate opens), team points, puzzle layout, wave, boss soul/phase. The host
// broadcasts it (`raid:s`) whenever it changes and to every new joiner; joiners only mirror it and send intents
// (`raid:i`: start, enter room, rotate mirror, died). Boss mechanics are host-decided telegraphs (`raid:m`): every client
// draws them and applies the damage to its own player only (each client stays authoritative for its own HP).
// Monsters are a pooled set of map spawns (content/raid.js SLOTS) -> stable shared ids, simulated by the host through the
// shared-NPC system (src/net/npcs.js); joiners fight them like any shared NPC. The host also decides who they attack
// (raid monsters are not `aggressive`: they pick the nearest player inside their own chamber).
// Rewards are personal: each client rolls its own chest from the shared team points (raid_rewards.js).
//
// API: game.raid = { state(), inRaid(entity), roomOf(x, y), points(), debug: {...} }
// Events: 'raid:start' {party}, 'raid:room' {room}, 'raid:complete' {points, party, ticks}, 'raid:reward' {loot, unique}

import { getNpc } from '../core/registry.js';
import { el, escapeHtml } from '../ui/util.js';
import { ROOMS, ROOM_LIST, ROOM_KEYS, SLOTS, SCALE, DOORS, SURFACE, RAID_NAME, RAID_RULES } from '../content/raid.js';
import { RAID_SUPPLIES } from '../content/raid_items.js';
import * as rooms from './raid_rooms.js';
import * as rewards from './raid_rewards.js';

let game;
const R = {};          // shared context for raid_rooms.js / raid_rewards.js

// =================================================================================================
// State
// =================================================================================================
const idle = () => ({
  run: 0, room: 0, cleared: 0, party: 1, pts: 0, deaths: 0, t0: 0, tEnd: 0, done: 0,
  lens: 0, mir: [], recv: [], solved: 0,     // Hall of Prisms
  wave: 0,                                   // Sunsworn Barracks
  soul: 0,                                   // Twin-Souled Sentinel: 0 ember (magic), 1 gale (ranged)
  phase: 0, shield: 0, bv: 0, eclipse: 0,    // Aurvael: phase 1-3, eclipse shield, body variant 0-3
});
let S = idle();
let shown = idle();    // last state applied locally (diffed by applyLocal)
let pendingEnter = false;
let emptyTicks = 0;
let wasJoiner = false;

const clone = (o) => JSON.parse(JSON.stringify(o));
const net = () => game.net;
R.state = () => S;
R.joiner = () => !!(net()?.connected && net().role === 'joiner');
R.auth = () => !R.joiner();
R.connected = () => !!net()?.connected;

// =================================================================================================
// Geometry helpers
// =================================================================================================
function roomOf(x, y) {
  for (const r of ROOM_LIST) {
    const [x0, y0, x1, y1] = r.floor;
    if (x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1) return r;
  }
  return null;
}
R.roomOf = roomOf;
R.inRaid = (e) => !!e && !!roomOf(e.x, e.y);
R.inRoom = (e, key) => !!e && roomOf(e.x, e.y)?.key === key;
R.onFloor = (key, x, y) => { const [x0, y0, x1, y1] = ROOMS[key].floor; return x >= x0 && x <= x1 && y >= y0 && y <= y1; };
/** Every player (local + remote) standing in a chamber, alive. */
R.playersIn = (key) => {
  const out = [];
  const p = game.player;
  if (!p.dead && R.inRoom(p, key)) out.push(p);
  for (const rp of game.remotePlayers.values()) if (!rp.dead && !rp.hidden && R.inRoom(rp, key)) out.push(rp);
  return out;
};
/** Freshest known tile of a player (a remote's last networked tile, not its interpolated walk). */
R.posOf = (p) => (p.type === 'remote' && p.netTarget ? { x: p.netTarget.x, y: p.netTarget.y } : { x: p.x, y: p.y });
/** Players a host-simulated raid monster may attack (local + joiners that share our NPCs). */
R.targetsIn = (key) => {
  const out = [];
  const p = game.player;
  if (!p.dead && R.inRoom(p, key)) out.push(p);
  const rem = R.connected() ? net().npcAggroTargets?.() : null;
  if (rem) for (const rp of rem) if (R.inRoom(rp, key)) out.push(rp);
  return out;
};
R.teleportTo = (key) => { const a = ROOMS[key].arrive; game.teleport(game.player, a[0], a[1]); };

// =================================================================================================
// Monster pool
// =================================================================================================
R.pool = [];           // slot index -> Npc
R.slots = SLOTS;
let activating = false;

function buildPool() {
  const byKey = new Map();
  for (const n of game.npcs.values()) if (n.def.raidPool) byKey.set(`${n.id}@${n.spawnX},${n.spawnY}`, n);
  for (const s of SLOTS) {
    const n = byKey.get(s.key) || null;
    R.pool[s.slot] = n;
    if (!n) { console.warn('[raid] missing pooled monster', s.key); continue; }
    n.state.raidSlot = s.slot;
    hideNpc(n, true);
  }
}

function hideNpc(n, force = false) {
  if (!n || (n.netControlled && !force)) return;
  n.dead = true; n.hidden = true;
  n.combatTarget = null; n.faceTarget = null; n.path = [];
  n.state.raidActive = false;
  n.state.overhead = null;
  for (const c of game.characters()) if (c.combatTarget === n) c.combatTarget = null;
}
R.hideNpc = hideNpc;

/** Scale a pooled monster's hitpoints for the party (own property shadows the Npc maxHp getter). */
function scaleNpc(n) {
  const s = SLOTS[n.state.raidSlot];
  if (!s) return;
  const base = getNpc(s.id).stats.hitpoints;
  const mult = (s.boss ? SCALE.boss : SCALE.mob)[Math.max(0, Math.min(3, S.party - 1))];
  const v = Math.round(base * mult);
  if (n.maxHp !== v) Object.defineProperty(n, 'maxHp', { value: v, writable: true, configurable: true });
}
R.scaleAll = () => { for (const n of R.pool) if (n) scaleNpc(n); };

/** Authority: bring a pooled monster to life at its spawn tile. */
R.activate = (slot, defId = null) => {
  const n = R.pool[slot];
  if (!n) return null;
  const s = SLOTS[slot];
  n.def = getNpc(defId || s.id);
  n.appearanceVersion++;
  scaleNpc(n);
  activating = true;
  try { game.respawnNpc(n); } finally { activating = false; }
  n.state.raidActive = true;
  n.state.netDmg = null;
  n.attackTimer = 3;
  game.spawnEffect('teleport', n, { color: 0xffc040 });
  return n;
};
R.npcOf = (slot) => R.pool[slot] || null;
R.slotsWhere = (pred) => SLOTS.filter(pred);

// =================================================================================================
// Networking
// =================================================================================================
function broadcast(type, data) { if (R.connected()) { try { net().broadcast(type, data); } catch (e) { console.warn('[raid] send failed', e); } } }

/** Authority: apply the current state locally and send it to everyone. */
R.commit = () => {
  if (!R.auth()) return;
  applyLocal();
  broadcast('raid:s', S);
};
/** Authority: a mechanic event (telegraphs) - run it here and on every client. */
R.mech = (m) => {
  if (!R.auth()) return;
  rooms.onMech(R, m);
  broadcast('raid:m', m);
};
/** Joiner -> host (the host relays broadcasts; other joiners ignore intents). */
R.intent = (a, extra = {}) => broadcast('raid:i', { a, ...extra });

function applyLocal() {
  const prev = shown;
  const cur = S;
  shown = clone(S);
  try { rooms.applyLocal(R, prev, cur); } catch (e) { console.error('[raid] applyLocal', e); }
  // transitions every client reports
  if (cur.run !== prev.run && cur.run) {
    game.message(`<col=ffc040>The sun-sealed gate grinds open. The Drowned Sun stirs for a party of ${cur.party}.</col>`);
    game.events.emit('raid:start', { party: cur.party });
  }
  if (cur.run === prev.run && cur.cleared > prev.cleared && cur.cleared < 5 && cur.run) {
    const next = ROOM_LIST[cur.cleared + 1];
    game.message(`<col=60e060>The sunstone wards fade - the way to the ${next.name} is open.</col>`);
  }
  if (cur.run === prev.run && cur.pts < prev.pts && cur.deaths > prev.deaths) game.message(`<col=ff6040>A member of the party has fallen. The team loses ${(prev.pts - cur.pts).toLocaleString('en-US')} points.</col>`);
  if (cur.done && !prev.done && cur.run === prev.run) {
    const secs = Math.round((cur.tEnd - cur.t0) * 0.6);
    game.message(`<col=ffc040>Aurvael, the Drowned Sun, sinks into the dark. Raid complete in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} with ${cur.pts.toLocaleString('en-US')} team points.</col>`);
    game.message('<col=ffc040>The Reliquary of the Drowned Sun unseals. Each of you may claim your own share.</col>');
    if (R.inRaid(game.player)) rewards.onComplete(R, cur);
    game.events.emit('raid:complete', { points: cur.pts, party: cur.party, ticks: cur.tEnd - cur.t0 });
  }
  if (pendingEnter && cur.run && cur.room >= 1 && R.inRoom(game.player, 'lobby')) { pendingEnter = false; R.teleportTo('prisms'); }
  updateHud();
}

function onNetMessage({ from, type, data }) {
  if (type === 'raid:s' && R.joiner()) {
    if (!data || typeof data !== 'object') return;
    const next = { ...idle(), ...data };
    for (const k of ['mir', 'recv']) if (!Array.isArray(next[k])) next[k] = [];
    S = next;
    R.scaleAll();
    applyLocal();
  } else if (type === 'raid:m' && R.joiner()) {
    if (data && typeof data === 'object') rooms.onMech(R, data);
  } else if (type === 'raid:i' && R.auth() && R.connected()) {
    onIntent(from, data || {});
  }
}

function onIntent(from, d) {
  const rp = game.getRemotePlayer(from);
  if (!rp || !R.inRaid(rp)) return;
  switch (d.a) {
    case 'start':
      if (!R.inRoom(rp, 'lobby')) return;
      if (S.run && !S.done) { R.commit(); return; }
      startRun();
      break;
    case 'room': {
      const r = d.r | 0;
      if (S.run && r >= 2 && r <= 5 && S.cleared >= r - 1 && S.room < r) startRoom(r);
      break;
    }
    case 'rot': rooms.rotate(R, d.i | 0, rp); break;
    case 'death': penalty(); break;
    default: break;
  }
}

// =================================================================================================
// Run flow (authority)
// =================================================================================================
function startRun() {
  for (const n of R.pool) hideNpc(n);
  const party = Math.max(1, Math.min(4, R.playersIn('lobby').length));
  S = idle();
  S.run = 1 + Math.floor(Math.random() * 2e9);
  S.party = party;
  S.t0 = game.tickCount;
  R.scaleAll();
  rooms.onRunStart(R);
  startRoom(1);
}

function startRoom(r) {
  S.room = Math.max(S.room, r);
  rooms.startRoom(R, r);
  R.commit();
  game.events.emit('raid:room', { room: ROOM_KEYS[r] });
}
R.startRoom = startRoom;

function resetRun() {
  for (const n of R.pool) hideNpc(n);
  rooms.onReset(R);
  S = idle();
  R.commit();
}

function penalty() {
  if (!S.run || S.done) return;
  S.deaths++;
  S.pts = Math.floor(S.pts * 0.9);
  R.commit();
}

R.addPoints = (n) => { if (S.run && !S.done) S.pts = Math.max(0, Math.round(S.pts + n)); };
R.complete = () => {
  S.done = 1;
  S.cleared = 5;
  S.tEnd = game.tickCount;
  const secs = (S.tEnd - S.t0) * 0.6;
  R.addPoints(8000);
  if (secs < 1800) S.pts += Math.round((1800 - secs) * 4);  // speed bonus under 30 minutes
};

function authTick() {
  if (!S.run) return;
  // nobody left inside: the citadel resets
  let anyone = R.inRaid(game.player) && !game.player.dead;
  if (!anyone) for (const rp of game.remotePlayers.values()) if (R.inRaid(rp)) { anyone = true; break; }
  if (game.player.dead && R.inRaid(game.player)) anyone = true;
  emptyTicks = anyone ? 0 : emptyTicks + 1;
  if (emptyTicks >= 20) { emptyTicks = 0; resetRun(); return; }
  rooms.tick(R);
}

// =================================================================================================
// HUD
// =================================================================================================
let hud = null, hudText = '';
function updateHud() {
  const p = game.player;
  const room = roomOf(p.x, p.y);
  let text = '';
  if (room) {
    const info = rooms.hudInfo(R, room.key);
    text = `<b>${RAID_NAME}</b> &nbsp;·&nbsp; ${escapeHtml(room.name)}`;
    if (S.run) text += ` &nbsp;·&nbsp; Points: <b>${S.pts.toLocaleString('en-US')}</b> &nbsp;·&nbsp; Party: ${S.party}${info ? ` &nbsp;·&nbsp; ${info}` : ''}${S.done ? ' &nbsp;·&nbsp; <b>Complete</b>' : ''}`;
    else text += ' &nbsp;·&nbsp; <i>the gate is sealed</i>';
  }
  if (text === hudText) return;
  hudText = text;
  if (!hud) {
    hud = el('div', 'raid-hud');
    (document.getElementById('game-root') || document.body).appendChild(hud);
  }
  hud.innerHTML = text;
  hud.style.display = text ? '' : 'none';
}
R.updateHud = updateHud;

function injectCss() {
  if (document.getElementById('raid-css')) return;
  const css = document.createElement('style');
  css.id = 'raid-css';
  css.textContent = `
.raid-hud { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 6; pointer-events: none; max-width: 92%;
  padding: 3px 12px; background: rgba(28,20,6,0.8); border: 1px solid #8a6a20; border-radius: 4px; color: #ffe0a0; font-size: 13px;
  text-shadow: 1px 1px 0 #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.raid-hud b { color: #ffc040; }
.raid-rules { font-size: 12px; line-height: 1.45; color: #e8dcc0; max-height: 360px; overflow-y: auto; padding-right: 4px; }
.raid-rules p { margin: 0 0 7px; }
.raid-rules b { color: #ffc040; }
.raid-loot { display: grid; grid-template-columns: repeat(auto-fill, 44px); gap: 4px; margin: 6px 0; }
.raid-loot div { position: relative; width: 44px; height: 40px; background: rgba(0,0,0,0.35); border: 1px solid #5a4a2a; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
.raid-loot div.rare { border-color: #ffc040; box-shadow: 0 0 6px #ffc040; }
.raid-loot span { position: absolute; left: 2px; top: 0; font-size: 10px; color: #ffff60; text-shadow: 1px 1px 0 #000; }
.raid-uniq { display: flex; align-items: center; gap: 6px; font-size: 12px; margin: 3px 0; color: #e8dcc0; }
.raid-uniq img { width: 36px; height: 32px; }
.raid-uniq small { color: #b0a080; display: block; }
@media (max-width: 600px) { .raid-hud { font-size: 11px; top: 4px; } }
`;
  document.head.appendChild(css);
}

function showRules() {
  game.ui.openInterface({
    id: 'raid_rules', title: `${RAID_NAME} - the choir's instructions`, width: 420,
    render: (body) => {
      body.innerHTML = '';
      const d = el('div', 'raid-rules');
      d.innerHTML = RAID_RULES.map((t) => `<p>${escapeHtml(t).replace(/(MAGIC|MISSILES|move!)/g, '<b>$1</b>')}</p>`).join('');
      body.appendChild(d);
    },
  });
}
R.showRules = showRules;

// =================================================================================================
// Doors, stairs and passages (every client)
// =================================================================================================
function canUseRaid() {
  if (R.joiner() && !net().sharedNpcs) {
    game.message('<col=ff6040>The citadel\'s wards reject you: your game version differs from the host\'s (reload both games).</col>');
    return false;
  }
  return true;
}

function askStart() {
  const n = R.playersIn('lobby').length;
  game.ui.startDialogue([
    { message: `Open the sun-sealed gate? The citadel will weigh the ${n === 1 ? 'one soul' : `${n} souls`} in the Antechamber${n > 4 ? ' (at most four count)' : ''} and wake to match. Monsters grow tougher and more numerous with every party member.` },
    { title: 'Begin the raid?', options: [
      { text: 'Open the gate.', action: () => { beginFromGate(); return false; } },
      { text: 'Read the choir\'s instructions first.', action: () => { showRules(); return false; } },
      { text: 'Not yet.', end: true },
    ] },
  ]);
}

function beginFromGate() {
  if (!canUseRaid()) return;
  if (R.auth()) {
    if (S.run) resetRun();
    startRun();
    R.teleportTo('prisms');
  } else {
    pendingEnter = true;
    R.intent('start');
    game.message('<col=ffc040>You lean on the gate. It begins to grind open...</col>');
  }
}

function enterDoor(roomIdx) {
  if (!canUseRaid()) return;
  if (!S.run) { game.message('The way is sealed. The raid has not begun - open the gate in the Antechamber.'); return; }
  if (S.cleared < roomIdx) { game.message(rooms.sealedText(roomIdx)); return; }
  const next = roomIdx + 1;
  R.teleportTo(ROOM_KEYS[next]);
  if (S.room < next) {
    if (R.auth()) startRoom(next);
    else R.intent('room', { r: next });
  }
}

function initDoors() {
  const I = game.interactions;
  I.onObject('Descend', ['raid_sunken_stair'], ({ player }) => {
    if (!canUseRaid()) return;
    game.actions.start(player, {
      name: 'raid_descend', anim: 'climb', delay: 1,
      onTick: () => {
        R.teleportTo('lobby');
        game.message('<col=ffc040>You descend the sunken stair into cool, dripping darkness.</col>');
        const st = player.store('raid');
        if (!st.seenRules) { st.seenRules = true; game.message('Read the choir tablet in the Antechamber before opening the gate - or ask Seeker Ilsabet on the surface.'); }
        return false;
      },
    });
  });
  I.onObject('Climb-up', ['raid_stair_up'], ({ player }) => {
    game.actions.start(player, { name: 'raid_ascend', anim: 'climb', delay: 1, onTick: () => { game.teleport(player, SURFACE.out[0], SURFACE.out[1]); return false; } });
  });
  I.onObject('Read', ['raid_tablet'], () => showRules());
  I.onObject('Enter', ['raid_gate'], () => {
    if (!canUseRaid()) return;
    if (S.run && !S.done) { R.teleportTo('prisms'); return; }
    if (S.done) {
      game.ui.startDialogue([{ title: 'This raid is complete. Begin a new one?', options: [
        { text: 'Yes - wake the citadel again.', action: () => { askStart(); return false; } },
        { text: 'No.', end: true },
      ] }]);
      return;
    }
    askStart();
  });
  I.onObject('Inspect', ['raid_gate'], () => {
    if (!S.run) game.message('The gate is sealed. It will open for whoever stands in the Antechamber - one to four souls.');
    else game.message(`A raid is under way for a party of ${S.party}: ${S.done ? 'complete' : `the ${ROOM_LIST[S.room].name}`}, ${S.pts.toLocaleString('en-US')} team points.`);
  });
  const doorIdx = (t) => +(Object.entries(DOORS).find(([, [x, y]]) => x === t.x && y === t.y)?.[0] ?? -1);
  I.onObject('Enter', ['raid_door'], ({ target }) => { const r = doorIdx(target); if (r > 0) enterDoor(r); });
  I.onObject('Inspect', ['raid_door'], ({ target }) => {
    const r = doorIdx(target);
    game.message(S.run && S.cleared >= r ? 'The wards have faded. The way onward is open.' : rooms.sealedText(r));
  });
  I.onObject('Return', ['raid_return'], ({ player }) => {
    game.actions.start(player, { name: 'raid_return', anim: 'climb', delay: 1, onTick: () => { R.teleportTo('lobby'); game.message('You climb back up to the Antechamber.'); return false; } });
  });
  I.onObject('Leave', ['raid_exit'], ({ player }) => {
    if (!S.done && S.run) { game.message('Daylight glimmers far above, but the passage will not open while Aurvael lives.'); return; }
    game.teleport(player, SURFACE.out[0], SURFACE.out[1]);
    game.spawnEffect('teleport', player, { color: 0xfff0b0 });
    game.message('You climb the sunlit shaft back to the Sunscar Badlands.');
  });
}

// =================================================================================================
// Init
// =================================================================================================
export function init(g) {
  game = g;
  R.game = game;
  injectCss();
  buildPool();
  initDoors();
  rooms.init(R);
  rewards.init(R);
  const ev = game.events;

  game.onTick(() => {
    if (R.auth()) authTick();
    updateHud();
  }, 5);

  ev.on('net:message', onNetMessage);
  ev.on('net:join', () => { if (R.auth() && R.connected()) broadcast('raid:s', S); });
  ev.on('net:status', () => {
    const j = R.joiner();
    if (j && !wasJoiner) {
      // we joined someone's world: their raid (if any) replaces ours
      rooms.onReset(R);
      S = idle(); shown = idle();
      if (R.inRaid(game.player) && !R.inRoom(game.player, 'lobby')) { R.teleportTo('lobby'); game.message('The citadel shifts around you as you join your friend\'s world.'); }
    } else if (!j && wasJoiner) {
      // the session ended: the host's raid is gone
      rooms.onReset(R);
      for (const n of R.pool) hideNpc(n, true);
      S = idle(); shown = idle();
      if (R.inRaid(game.player) && !R.inRoom(game.player, 'lobby')) { R.teleportTo('lobby'); game.message('The host\'s citadel fades. You find yourself back in the Antechamber.'); }
    }
    wasJoiner = j;
    updateHud();
  });
  // pooled monsters only live when the raid wakes them (a joiner leaving a session gets local respawns from net/npcs.js)
  ev.on('npc:respawn', ({ npc }) => {
    if (!npc.def.raidPool || activating || npc.netControlled) return;
    hideNpc(npc, true);
  });
  ev.on('npc:death', ({ npc, killer }) => {
    if (!npc.def.raidPool) return;
    if (R.auth() && npc.state.raidActive) rooms.onNpcDeath(R, npc, killer);
  });
  ev.on('npc:attack', ({ npc, fromNet }) => {
    if (fromNet || !npc.def.raidPool || !R.auth()) return;
    rooms.onNpcAttack(R, npc);
  });
  ev.on('death:safe', ({ player, area }) => {
    if (player !== game.player || !area?.raid) return;
    if (R.auth()) penalty(); else R.intent('death');
  });
  ev.on('area:enter', ({ area, prev }) => {
    if (prev?.raid && !area?.raid) {
      // raid-made supplies crumble outside the citadel
      const p = game.player;
      let n = 0;
      for (const id of RAID_SUPPLIES) { const c = p.inventory.count(id); if (c) { p.inventory.remove(id, c); n += c; } }
      if (n) game.message('Your citadel supplies crumble to sand in the daylight.');
    }
    updateHud();
  });
  // a save made deep inside wakes up in the Antechamber
  ev.on('game:ready', () => { if (R.inRaid(game.player) && !R.inRoom(game.player, 'lobby')) R.teleportTo('lobby'); updateHud(); });

  game.raid = {
    state: () => clone(S),
    inRaid: (e = game.player) => R.inRaid(e),
    roomOf,
    points: () => S.pts,
    rules: showRules,
    debug: {
      /** Max combat stats + a raid-ready loadout (testing only). */
      kit() {
        const p = game.player;
        for (const s of ['attack', 'strength', 'defence', 'ranged', 'magic', 'hitpoints', 'prayer']) {
          const need = 13034431 - p.skills.getXp(s);
          if (need > 0) p.skills.addXp(s, need);
          p.skills.setCurrent(s, p.skills.getLevel(s));
        }
        for (const id of ['raid_dawnrend', 'raid_sun_helm', 'raid_sun_cuirass', 'raid_sun_greaves', 'raid_choir_aegis', 'raid_hymn_ring']) {
          p.inventory.add(id, 1);
          const slot = p.inventory.indexOf(id);
          if (slot >= 0) game.equip(p, slot);
        }
        game.giveItem('raid_eel', 10);
        game.giveItem('raid_tonic_4', 4);
        game.message('[raid debug] Combat stats maxed and a raid loadout equipped.');
      },
      start() { if (!R.auth()) return 'joiner'; if (S.run) resetRun(); startRun(); R.teleportTo('prisms'); return S.run; },
      solve() { return rooms.debugSolve(R); },
      room(key) { const i = ROOM_KEYS.indexOf(key); if (i < 1 || !R.auth()) return false; if (!S.run) startRun(); S.cleared = Math.max(S.cleared, i - 1); for (let r = S.room + 1; r <= i; r++) startRoom(r); R.teleportTo(key); return true; },
      killAll() { if (!R.auth()) return 0; let k = 0; for (const n of R.pool) if (n && !n.dead && n.state.raidActive && !(S.shield && n.state.raidSlot === rooms.BOSS_SLOT)) { game.applyDamage(n, n.hp, { source: game.player, type: 'typeless' }); k++; } return k; },
      reset() { if (R.auth()) resetRun(); },
      R,
    },
  };
}
