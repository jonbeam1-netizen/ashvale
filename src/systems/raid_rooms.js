// The Drowned Sun - chamber logic: Hall of Prisms puzzle, Sunsworn Barracks waves, the Twin-Souled Sentinel, Aurvael.
// Driven by systems/raid.js (context R). Functions marked (auth) run only on the authority (offline / multiplayer host);
// applyLocal / onMech / the damage wards run on every client.
//
// Telegraph message (`raid:m`): { k: 'tg', s: style, r: [x0,y0,x1,y1, ...] rects, d: delay ticks, lo, hi, rm: room key,
//   inv?: 1 } - marked tiles burst after `d` ticks; each client damages only its own player (inv: everything in the
//   chamber EXCEPT the rects - the final eclipse's safe circles).

import { getNpc } from '../core/registry.js';
import { ROOMS, PRISM, traceBeam, SLOTS, AURVAEL_IDS, SENTINEL_IDS } from '../content/raid.js';

let game;
export let BOSS_SLOT = -1;
let SENT_SLOT = -1;
let THRALL_SLOTS = [];
const RT = { nextMech: 0, atk: 0, waveAt: 0, roomStart: 0, solution: null, mechN: 0 };   // authority runtime
const P = { key: '', beamKey: '', lens: null, mirrors: new Map(), receptor: null, beams: [] }; // puzzle visuals
const marks = new Set();
const rnd = (n) => Math.floor(Math.random() * n);
const tick = () => game.tickCount;

const MARK_ID = { fire: 'raid_mark_fire', soul: 'raid_mark_soul', beam: 'raid_mark_beam', safe: 'raid_mark_safe', tide: 'raid_mark_tide' };
const MARK_FX = { fire: 0xff6a20, soul: 0xc050ff, beam: 0xffe060, safe: 0xffe080, tide: 0x40d8ff };
const WARN = {
  soul: '<col=c050ff>Soulfire gathers beneath you - step off the violet glow!</col>',
  fire: '<col=ff8030>Sunfall! The ceiling blazes - get off the glowing tiles!</col>',
  beam: '<col=ffe060>Aurvael fixes its gaze - a beam of light will scour the marked line!</col>',
  safe: '<col=ff4020>FINAL ECLIPSE! Aurvael drowns the hall in light - stand inside a golden circle!</col>',
};
const HIT = {
  soul: 'The soulfire sears you!', fire: 'Sunfall scorches you!', beam: 'The beam of light burns through you!', safe: 'The eclipse engulfs you!',
};

// =================================================================================================
// Setup
// =================================================================================================
export function init(R) {
  game = R.game;
  for (const s of SLOTS) {
    if (s.room === 'throne' && s.boss) BOSS_SLOT = s.slot;
    if (s.room === 'gallery' && s.boss) SENT_SLOT = s.slot;
  }
  THRALL_SLOTS = SLOTS.filter((s) => s.add != null).map((s) => s.slot);
  const I = game.interactions, ev = game.events;

  I.onObject('Rotate', ['raid_mirror_0', 'raid_mirror_1'], ({ player, target }) => {
    const S = R.state();
    if (!S.run) return;
    if (S.solved) { game.message('The receptor already blazes with light. The mirrors are locked in place.'); return; }
    const i = mirrorIndex(S, target.x, target.y);
    if (i < 0) return;
    game.playAnim(player, 'pickup', 600);
    if (R.auth()) rotate(R, i, player); else R.intent('rot', { i });
  });
  I.onObject('Inspect', ['raid_receptor'], () => game.message('The dawn receptor waits for the sunbeam. Turn the prism mirrors until the light strikes it.'));

  // the Sentinel wards against the style its soul uses; Aurvael is untouchable while eclipsed
  let noteAt = 0;
  const note = (text) => { if (tick() - noteAt > 4) { noteAt = tick(); game.message(text); } };
  ev.on('damage:before', (e) => {
    const t = e.target;
    if (t?.type !== 'npc' || !t.def.raidPool) return;
    if (blocked(R, t, e.type)) {
      e.amount = 0;
      if (e.source === game.player) {
        if (t.state.raidSlot === BOSS_SLOT) note('<col=ffc040>Aurvael is hidden behind the eclipse - kill its drowned thralls!</col>');
        else note(R.state().soul ? '<col=80ffb0>The Gale soul scatters your missiles! Use melee or magic.</col>' : '<col=ff7a20>The Ember soul drinks your magic! Use melee or missiles.</col>');
      }
    }
  });
  // host: a joiner's hit arrives pre-rolled (netRaw skips damage:before) - undo it if the ward should have stopped it
  ev.on('damage', (e) => {
    const t = e.target;
    if (!R.auth() || !R.connected() || t?.type !== 'npc' || !t.def.raidPool || e.source?.type !== 'remote' || !(e.amount > 0)) return;
    if (blocked(R, t, e.type)) t.hp = Math.min(t.maxHp, t.hp + e.amount);
  });
}

function blocked(R, t, type) {
  const S = R.state();
  if (t.state.raidSlot === SENT_SLOT) return type === (S.soul ? 'ranged' : 'magic');
  if (t.state.raidSlot === BOSS_SLOT) return !!S.shield;
  return false;
}

// =================================================================================================
// Run / room lifecycle (auth)
// =================================================================================================
export function onRunStart() {
  RT.nextMech = 0; RT.atk = 0; RT.waveAt = 0; RT.solution = null; RT.mechN = 0;
}

export function onReset() {
  RT.nextMech = 0; RT.atk = 0; RT.waveAt = 0; RT.solution = null;
  clearPrisms();
  for (const m of marks) if (game.objects.has(m.uid)) game.removeObject(m);
  marks.clear();
}

export function startRoom(R, r) {
  const S = R.state();
  RT.roomStart = tick();
  RT.atk = 0;
  switch (r) {
    case 1: genPuzzle(R); break;
    case 2: S.wave = 0; RT.waveAt = tick() + 6; break;
    case 3: {
      S.soul = 0;
      const n = R.activate(SENT_SLOT, SENTINEL_IDS[0]);
      if (n) n.attackTimer = 5;
      RT.nextMech = tick() + 14;
      break;
    }
    case 4: S.cleared = Math.max(S.cleared, 4); break;
    case 5: {
      S.phase = 1; S.bv = 0; S.shield = 0; S.eclipse = 0;
      const n = R.activate(BOSS_SLOT, AURVAEL_IDS[0]);
      if (n) n.attackTimer = 6;
      RT.nextMech = tick() + 16;
      break;
    }
    default: break;
  }
}

// ---- Hall of Prisms ---------------------------------------------------------------------------------
function mirrorMap(list) {
  const m = new Map();
  for (let i = 0; i + 2 < list.length; i += 3) m.set(`${list[i]},${list[i + 1]}`, list[i + 2]);
  return m;
}
function mirrorIndex(S, x, y) {
  for (let i = 0; i + 2 < S.mir.length; i += 3) if (S.mir[i] === x && S.mir[i + 1] === y) return i / 3;
  return -1;
}

function genPuzzle(R) {
  const S = R.state();
  const cells = [];
  for (const x of PRISM.cols) for (const y of PRISM.rows) cells.push([x, y]);
  for (let tries = 0; tries < 600; tries++) {
    for (let i = cells.length - 1; i > 0; i--) { const j = rnd(i + 1); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const pick = cells.slice(0, 9 + rnd(4));
    const lens = PRISM.rows[rnd(PRISM.rows.length)];
    const sol = new Map(pick.map(([x, y]) => [`${x},${y}`, rnd(2)]));
    const tr = traceBeam(sol, lens);
    if (!tr.end || tr.hits < 4 || tr.end[0] < PRISM.bounds[0]) continue;
    // scramble: flip at least three of the mirrors on the solution path (and some others at random)
    const onPath = tr.path.filter((p) => p[2] === 2).map((p) => `${p[0]},${p[1]}`);
    const init = new Map(sol);
    let flipped = 0;
    for (const k of onPath) if (Math.random() < 0.6) { init.set(k, 1 - init.get(k)); flipped++; }
    if (flipped < 3) continue;
    for (const k of init.keys()) if (!onPath.includes(k) && Math.random() < 0.5) init.set(k, 1 - init.get(k));
    const tr2 = traceBeam(init, lens);
    if (tr2.end && tr2.end[0] === tr.end[0] && tr2.end[1] === tr.end[1]) continue;
    S.lens = lens;
    S.mir = [];
    for (const [k, o] of init) { const [x, y] = k.split(',').map(Number); S.mir.push(x, y, o); }
    S.recv = [tr.end[0], tr.end[1]];
    S.solved = 0;
    RT.solution = sol;
    return;
  }
  // (practically unreachable) fall back to an already-solved hall
  S.solved = 1; S.cleared = Math.max(S.cleared, 1);
}

/** (auth) Turn mirror i. */
export function rotate(R, i, who) {
  const S = R.state();
  if (!S.run || S.solved || S.room < 1 || i < 0 || i * 3 + 2 >= S.mir.length) return;
  if (who && !R.inRoom(who, 'prisms')) return;
  S.mir[i * 3 + 2] = 1 - S.mir[i * 3 + 2];
  checkSolved(R);
  R.commit();
}

function checkSolved(R) {
  const S = R.state();
  const tr = traceBeam(mirrorMap(S.mir), S.lens);
  if (tr.end && tr.end[0] === S.recv[0] && tr.end[1] === S.recv[1]) {
    S.solved = 1;
    S.cleared = Math.max(S.cleared, 1);
    const secs = (tick() - RT.roomStart) * 0.6;
    R.addPoints(2500 + Math.max(0, Math.round(1500 - secs * 10)));
  }
}

export function debugSolve(R) {
  const S = R.state();
  if (!R.auth() || !RT.solution) return false;
  S.mir = [];
  for (const [k, o] of RT.solution) { const [x, y] = k.split(',').map(Number); S.mir.push(x, y, o); }
  checkSolved(R);
  R.commit();
  return !!S.solved;
}

// ---- tick (auth) --------------------------------------------------------------------------------------
export { tickRooms as tick };

function tickRooms(R) {
  const S = R.state();
  const t = tick();
  aggro(R);
  if (S.room >= 2 && RT.waveAt && t >= RT.waveAt && S.wave < 3) { RT.waveAt = 0; spawnWave(R, S.wave + 1); }
  // Twin-Souled Sentinel: soulfire under every player in the gallery
  const sent = R.npcOf(SENT_SLOT);
  if (S.room >= 3 && S.cleared < 3 && sent && !sent.dead && sent.state.raidActive && t >= RT.nextMech) {
    RT.nextMech = t + 13;
    const rects = R.playersIn('gallery').slice(0, 8).map(R.posOf).flatMap((p) => [p.x - 1, p.y - 1, p.x + 1, p.y + 1]);
    if (rects.length) R.mech({ k: 'tg', s: 'soul', r: rects, d: 3, lo: 16, hi: 26, rm: 'gallery' });
  }
  // Aurvael
  const boss = R.npcOf(BOSS_SLOT);
  if (S.room >= 5 && !S.done && boss && !boss.dead && boss.state.raidActive) bossTick(R, boss, t);
}

/** Raid monsters are not `aggressive`: they hunt the nearest player inside their own chamber (never across walls). */
function aggro(R) {
  for (const s of SLOTS) {
    const n = R.pool[s.slot];
    if (!n || n.dead || n.hidden || !n.state.raidActive) continue;
    const cur = n.combatTarget;
    if (cur && (cur.dead || cur.hidden || !R.inRoom(cur, s.room))) { n.combatTarget = null; n.faceTarget = null; }
    if (n.combatTarget) continue;
    let best = null, bd = Infinity;
    for (const p of R.targetsIn(s.room)) {
      const d = Math.max(Math.abs(p.x - n.x), Math.abs(p.y - n.y));
      if (d < bd) { bd = d; best = p; }
    }
    if (best) { n.combatTarget = best; n.faceTarget = best; n.state.returning = false; }
  }
}

function spawnWave(R, w) {
  const S = R.state();
  S.wave = w;
  for (const s of SLOTS) if (s.room === 'barracks' && s.wave === w && s.extra <= S.party - 1) R.activate(s.slot);
  R.commit();
}

function waveAlive(R, w) {
  return SLOTS.some((s) => s.room === 'barracks' && s.wave === w && R.pool[s.slot]?.state.raidActive && !R.pool[s.slot].dead);
}

/** (auth) A pooled monster died. */
export function onNpcDeath(R, npc) {
  const S = R.state();
  const s = SLOTS[npc.state.raidSlot];
  npc.state.raidActive = false;
  if (!s || !S.run) return;
  R.addPoints(Math.round((npc.def.combatLevel || 50) * 6));
  if (s.room === 'barracks' && s.wave === S.wave && !waveAlive(R, S.wave)) {
    if (S.wave < 3) RT.waveAt = tick() + 8;
    else { S.cleared = Math.max(S.cleared, 2); R.addPoints(1500); }
  } else if (s.slot === SENT_SLOT) {
    S.cleared = Math.max(S.cleared, 3);
    R.addPoints(4000);
  } else if (s.slot === BOSS_SLOT) {
    for (const sl of THRALL_SLOTS) R.hideNpc(R.pool[sl]);
    R.complete();
  }
  R.commit();
}

/** (auth) A pooled monster started an attack. */
export function onNpcAttack(R, npc) {
  const S = R.state();
  const slot = npc.state.raidSlot;
  if (slot === SENT_SLOT) {
    if (++RT.atk % 5 === 0) {
      S.soul = 1 - S.soul;
      npc.attackTimer = Math.max(npc.attackTimer, 7);   // a breath to switch prayers
      R.commit();
    }
  } else if (slot === BOSS_SLOT && S.phase === 3) {
    if (++RT.atk % 4 === 0) {
      S.bv = S.bv === 2 ? 3 : 2;
      npc.attackTimer = Math.max(npc.attackTimer, 6);
      R.commit();
    }
  }
}

// ---- Aurvael ----------------------------------------------------------------------------------------
function bossTick(R, boss, t) {
  const S = R.state();
  const ratio = boss.hp / boss.maxHp;
  if (S.phase === 1 && ratio <= 0.66) {
    S.phase = 2; S.shield = 1; S.bv = 1;
    const n = Math.min(THRALL_SLOTS.length, 1 + S.party);
    for (let i = 0; i < n; i++) R.activate(THRALL_SLOTS[i]);
    RT.nextMech = t + 10;
    R.commit();
  } else if (S.phase === 2 && S.shield && !THRALL_SLOTS.some((sl) => R.pool[sl]?.state.raidActive && !R.pool[sl].dead)) {
    S.shield = 0;
    R.addPoints(1500);
    R.commit();
  } else if (S.phase === 2 && !S.shield && ratio <= 0.33) {
    S.phase = 3; S.bv = 2; RT.atk = 0;
    boss.attackTimer = Math.max(boss.attackTimer, 5);
    R.commit();
  } else if (S.phase === 3 && !S.eclipse && ratio <= 0.15) {
    S.eclipse = 1;
    R.commit();
    finalEclipse(R);
    RT.nextMech = t + 14;
    return;
  }
  if (S.shield && t % 4 === 0) game.spawnEffect('prayer', boss, { color: 0x203040 });
  if (t < RT.nextMech) return;
  RT.mechN++;
  if (S.phase === 1) { sunfall(R); RT.nextMech = t + 14; }
  else if (S.phase === 2) { beams(R, 1); RT.nextMech = t + 11; }
  else { if (RT.mechN % 2) sunfall(R); else beams(R, 2); RT.nextMech = t + 9; }
}

const FLOOR = (key) => ROOMS[key].floor;
function bossTile(x, y) {
  const b = R_bossFoot;
  return b && x >= b[0] && x <= b[0] + 3 && y >= b[1] && y <= b[1] + 3;
}
let R_bossFoot = null;

function sunfall(R) {
  const [x0, y0, x1, y1] = FLOOR('throne');
  const boss = R.npcOf(BOSS_SLOT);
  R_bossFoot = boss ? [boss.x, boss.y] : null;
  const players = R.playersIn('throne').slice(0, 4).map(R.posOf);
  const rects = players.flatMap((p) => [p.x - 1, p.y - 1, p.x + 1, p.y + 1]);
  const extra = Math.min(10 - players.length, 2 + 2 * R.state().party);
  for (let i = 0, tries = 0; i < extra && tries < 60; tries++) {
    const x = x0 + rnd(x1 - x0 + 1), y = y0 + rnd(y1 - y0 + 1);
    if (bossTile(x, y)) continue;
    rects.push(x, y, x, y); i++;
  }
  if (rects.length) R.mech({ k: 'tg', s: 'fire', r: rects, d: 4, lo: 22, hi: 32, rm: 'throne' });
}

function beams(R, perPlayer) {
  const [x0, y0, x1, y1] = FLOOR('throne');
  const players = R.playersIn('throne').map(R.posOf);
  const rects = [];
  let h = rnd(2);
  for (const p of players) {
    for (let i = 0; i < perPlayer && rects.length < 40; i++) {
      if (h) rects.push(x0, p.y, x1, p.y); else rects.push(p.x, y0, p.x, y1);
      h = 1 - h;
    }
  }
  if (rects.length) R.mech({ k: 'tg', s: 'beam', r: rects.slice(0, 40), d: 4, lo: 30, hi: 40, rm: 'throne' });
}

function finalEclipse(R) {
  const [x0, y0, x1, y1] = FLOOR('throne');
  const boss = R.npcOf(BOSS_SLOT);
  R_bossFoot = boss ? [boss.x, boss.y] : null;
  const rects = [];
  for (let tries = 0; rects.length < 8 && tries < 80; tries++) {
    const cx = x0 + 1 + rnd(x1 - x0 - 1), cy = y0 + 1 + rnd(y1 - y0 - 1);
    let bad = false;
    for (let dx = -1; dx <= 1 && !bad; dx++) for (let dy = -1; dy <= 1; dy++) if (bossTile(cx + dx, cy + dy)) { bad = true; break; }
    if (bad) continue;
    if (rects.length && Math.abs(rects[0] + 1 - cx) < 6 && Math.abs(rects[1] + 1 - cy) < 4) continue;
    rects.push(cx - 1, cy - 1, cx + 1, cy + 1);
  }
  R.mech({ k: 'tg', s: 'safe', r: rects, d: 7, lo: 45, hi: 55, rm: 'throne', inv: 1 });
}

// =================================================================================================
// Telegraphs (every client)
// =================================================================================================
const int = (v, lo, hi, d) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);

export function onMech(R, m) {
  if (m.k !== 'tg' || !ROOMS[m.rm] || !MARK_ID[m.s] || !Array.isArray(m.r)) return;
  const [fx0, fy0, fx1, fy1] = ROOMS[m.rm].floor;
  const rects = [];
  for (let i = 0; i + 3 < Math.min(m.r.length, 40); i += 4) {
    const a = m.r.slice(i, i + 4).map((v) => int(v, 0, 1000, 0));
    rects.push([Math.max(fx0, a[0]), Math.max(fy0, a[1]), Math.min(fx1, a[2]), Math.min(fy1, a[3])]);
  }
  const d = int(m.d, 1, 12, 3), lo = int(m.lo, 0, 99, 10), hi = int(m.hi, 0, 99, 20);
  const p = game.player;
  if (!R.inRoom(p, m.rm)) return;
  if (WARN[m.s]) game.message(WARN[m.s]);
  const boss = m.rm === 'gallery' ? R.npcOf(SENT_SLOT) : R.npcOf(BOSS_SLOT);
  if (boss && !boss.dead && m.s !== 'soul') game.say(boss, m.s === 'safe' ? 'BE UNMADE IN MY LIGHT!' : m.s === 'beam' ? 'SEE ME!' : 'FALL, SUN!', { chat: false, color: '#ffd060' });
  // draw
  const mine = [];
  const tiles = new Set();
  for (const [x0, y0, x1, y1] of rects) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.add(`${x},${y}`);
  for (const k of tiles) {
    const [x, y] = k.split(',').map(Number);
    const o = game.spawnObject(MARK_ID[m.s], x, y);
    if (o) { mine.push(o); marks.add(o); }
  }
  game.schedule(d, () => {
    for (const o of mine) { if (game.objects.has(o.uid)) game.removeObject(o); marks.delete(o); }
    // a few bursts for flavour (bounded)
    const list = [...tiles];
    const step = Math.max(1, Math.floor(list.length / 14));
    if (!m.inv) for (let i = 0; i < list.length; i += step) { const [x, y] = list[i].split(',').map(Number); game.spawnEffect('impact', { x, y }, { color: MARK_FX[m.s], size: 0.3 }); }
    const S = R.state();
    if (p.dead || !R.inRoom(p, m.rm) || !S.run || S.done) return;   // a finished fight cancels bursts in flight
    const on = tiles.has(`${p.x},${p.y}`);
    if (m.inv) game.spawnEffect('sparkle', p, { color: on ? 0x60ff90 : 0xff4020 });
    if (on === !m.inv) {
      const dmg = lo + rnd(Math.max(0, hi - lo) + 1);
      game.spawnEffect('splash', p, { color: MARK_FX[m.s] });
      game.message(`<col=ff4020>${HIT[m.s]}</col>`);
      game.applyDamage(p, dmg, { source: boss && !boss.dead ? boss : null, type: 'typeless' });
    }
  });
}

// =================================================================================================
// Local presentation of state changes (every client)
// =================================================================================================
export function applyLocal(R, prev, S) {
  // def swaps (the host already did them; joiners mirror the soul / scale colour)
  const sent = R.npcOf(SENT_SLOT);
  if (sent) {
    const want = getNpc(SENTINEL_IDS[S.soul] || SENTINEL_IDS[0]);
    if (S.run && S.room >= 3 && sent.def !== want) { sent.def = want; sent.appearanceVersion++; }
    sent.state.overhead = S.run && S.room >= 3 && S.cleared < 3 ? (S.soul ? 'ward_ranged' : 'ward_magic') : null;
  }
  const boss = R.npcOf(BOSS_SLOT);
  if (boss) {
    const want = getNpc(AURVAEL_IDS[S.bv] || AURVAEL_IDS[0]);
    if (S.run && S.room >= 5 && boss.def !== want) { boss.def = want; boss.appearanceVersion++; }
  }
  renderPrisms(R, S);
  if (!S.run || S.run !== prev.run) return;
  const here = (key) => R.inRoom(game.player, key);
  const say = (npc, text, color) => { if (npc && !npc.dead) game.say(npc, text, { chat: false, color }); };
  // room intros
  if (S.room > prev.room) {
    const intro = {
      1: '<col=ffc040>The Hall of Prisms: turn the mirrors until the sunbeam strikes the dawn receptor.</col>',
      2: '<col=ffc040>The Sunsworn Barracks: the choir\'s dead stir. Three waves are coming.</col>',
      3: '<col=ff7a20>The Twin-Souled Sentinel wakes! EMBER soul: protect from magic and don\'t strike it with magic. It switches souls every few attacks.</col>',
      4: '<col=60d0ff>The Drowned Cistern is quiet. Fish, forage, cook and brew - then descend to the throne when you are ready.</col>',
      5: '<col=ffc040>Aurvael, the Drowned Sun, lifts its head. Golden scales: SOLAR BOLTS - protect from magic. Keep off the glowing floor!</col>',
    }[S.room];
    if (intro && (here(ROOM_KEYS_BY_IDX[S.room]) || here('lobby') || R.inRaid(game.player))) game.message(intro);
    if (S.room === 3) say(sent, 'TWO SOULS. ONE VIGIL.', '#ff7a20');
    if (S.room === 5) say(boss, 'WHO SINGS? WHO WAKES ME?', '#ffd060');
  }
  if (S.wave > prev.wave && here('barracks')) game.message(`<col=ffc040>Wave ${S.wave} of 3: the Sunsworn choir attacks!</col>`);
  if (S.solved && !prev.solved && here('prisms')) game.message('<col=fff0a0>The sunbeam strikes the dawn receptor - it blazes, and the sealed passage unlocks!</col>');
  if (S.room >= 3 && S.soul !== prev.soul && S.cleared < 3) {
    if (here('gallery')) game.message(S.soul
      ? '<col=80ffb0>The Sentinel\'s GALE soul takes over - protect from MISSILES, and don\'t shoot it!</col>'
      : '<col=ff7a20>The Sentinel\'s EMBER soul takes over - protect from MAGIC, and don\'t cast at it!</col>');
    say(sent, S.soul ? 'THE GALE ANSWERS.' : 'THE EMBER ANSWERS.', S.soul ? '#80ffb0' : '#ff7a20');
  }
  if (S.cleared >= 3 && prev.cleared < 3 && here('gallery')) game.message('<col=60e060>The Twin-Souled Sentinel shatters into brass and sunstone.</col>');
  if (S.phase !== prev.phase && here('throne')) {
    if (S.phase === 2) { game.message('<col=40d8ff>Aurvael pulls an ECLIPSE over itself and calls its drowned thralls! Kill them to break the shield. Its scales turn TEAL - protect from MISSILES!</col>'); say(boss, 'RISE, MY DROWNED.', '#60e0ff'); }
    if (S.phase === 3) { game.message('<col=ff6020>Aurvael ENRAGES! It strikes faster and alternates sun (magic) and tide (missiles) every few attacks.</col>'); say(boss, 'I WILL BURN AGAIN!', '#ff8020'); }
  }
  if (!S.shield && prev.shield && here('throne')) game.message('<col=ffe060>The eclipse shatters - Aurvael is vulnerable!</col>');
  if (S.phase === 3 && S.bv !== prev.bv && here('throne')) game.message(S.bv === 2 ? '<col=ffc040>Aurvael\'s scales flare GOLD - protect from magic!</col>' : '<col=40d8ff>Aurvael\'s scales darken to TEAL - protect from missiles!</col>');
}
const ROOM_KEYS_BY_IDX = ['lobby', 'prisms', 'barracks', 'gallery', 'cistern', 'throne'];

// ---- puzzle visuals ---------------------------------------------------------------------------------
function clearPrisms() {
  const rm = (o) => { if (o && game.objects.has(o.uid)) game.removeObject(o); };
  rm(P.lens); rm(P.receptor);
  for (const o of P.mirrors.values()) rm(o);
  for (const o of P.beams) rm(o);
  P.lens = null; P.receptor = null; P.mirrors.clear(); P.beams = []; P.key = ''; P.beamKey = '';
}

function renderPrisms(R, S) {
  const live = S.run && S.room >= 1 && S.mir.length >= 3;
  const key = live ? `${S.run}:${S.lens}:${S.mir.filter((_, i) => i % 3 !== 2).join(',')}` : '';
  if (key !== P.key) {
    clearPrisms();
    P.key = key;
    if (!live) return;
    P.lens = game.spawnObject('raid_lens', PRISM.lensX, S.lens);
    for (let i = 0; i + 2 < S.mir.length; i += 3) P.mirrors.set(`${S.mir[i]},${S.mir[i + 1]}`, game.spawnObject(`raid_mirror_${S.mir[i + 2]}`, S.mir[i], S.mir[i + 1]));
  }
  if (!live) return;
  // orientations
  for (let i = 0; i + 2 < S.mir.length; i += 3) {
    const o = P.mirrors.get(`${S.mir[i]},${S.mir[i + 1]}`);
    const want = `raid_mirror_${S.mir[i + 2]}`;
    if (o && o.id !== want) game.replaceObject(o, want);
  }
  const bkey = `${S.mir.join(',')}|${S.solved}`;
  if (bkey === P.beamKey) return;
  P.beamKey = bkey;
  for (const o of P.beams) if (game.objects.has(o.uid)) game.removeObject(o);
  P.beams = [];
  const tr = traceBeam(mirrorMap(S.mir), S.lens);
  for (const [x, y, kind] of tr.path) {
    if (kind === 2) continue;
    const o = game.spawnObject('raid_beam_h', x, y, { rot: kind === 1 ? 0 : 1 });
    if (o) P.beams.push(o);
  }
  const lit = !!S.solved;
  if (P.receptor && game.objects.has(P.receptor.uid)) game.removeObject(P.receptor);
  P.receptor = S.recv.length === 2 ? game.spawnObject(lit ? 'raid_receptor_lit' : 'raid_receptor', S.recv[0], S.recv[1]) : null;
  if (lit && P.receptor) game.spawnEffect('special', P.receptor, { color: 0xffe080 });
}

// =================================================================================================
// Text
// =================================================================================================
export function hudInfo(R, key) {
  const S = R.state();
  if (!S.run) return '';
  switch (key) {
    case 'prisms': return S.solved ? 'Receptor lit' : 'Guide the sunbeam';
    case 'barracks': return S.cleared >= 2 ? 'Barracks cleared' : `Wave ${Math.max(1, S.wave)}/3`;
    case 'gallery': return S.cleared >= 3 ? 'Sentinel defeated' : S.room >= 3 ? (S.soul ? '<span style="color:#80ffb0">Gale soul (ranged)</span>' : '<span style="color:#ff8a40">Ember soul (magic)</span>') : '';
    case 'cistern': return 'Safe';
    case 'throne': return S.done ? '' : S.room >= 5 ? `Phase ${S.phase}${S.shield ? ' · <span style="color:#60e0ff">Eclipsed</span>' : ''}` : '';
    default: return '';
  }
}

export function sealedText(r) {
  return {
    0: 'The gate is sealed.',
    1: 'The passage is sealed with sunstone. It will open when the sunbeam strikes the dawn receptor.',
    2: 'The barracks door is barred until the last of the Sunsworn falls.',
    3: 'The Twin-Souled Sentinel\'s vigil holds the way shut.',
    4: 'The way down to the throne is sealed.',
  }[r] || 'The way is sealed.';
}
