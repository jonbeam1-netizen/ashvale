// Agility. OWNER: agent F.
// Obstacles are described by registerData('agility', objectId, {...}) (see content/agility.js).
// The player is force-moved along the obstacle's path tile by tile (collision ignored) with an
// elevation per step (player.elevation, rendered as a vertical offset). Courses track laps, award
// a lap bonus and drop Wayfarer marks. Also: outfit run-regen bonus, trail tonic.
// Imports the utility-magic helper (agent F owns it) and starts it from init.

import { getData, allData } from '../core/registry.js';
import { rand } from '../core/rng.js';
import { initMagicUtility } from './magic_utility.js';

const START_MSG = {
  'walk-across': 'You put your foot on the obstacle and carefully balance across...',
  'climb-over': 'You climb over the obstacle...',
  'squeeze-through': 'You squeeze into the gap...',
  'swing-on': 'You grab the rope and swing...',
  'swing-across': 'You grab the rope and swing...',
  climb: 'You climb up...',
  'climb-up': 'You climb up the wall...',
  'walk-on': 'You step out onto the rope...',
  jump: 'You take a run-up and leap...',
  'jump-across': 'You hop from stone to stone...',
  'shimmy-across': 'You grab hold and shimmy across...',
  'slide-down': 'You grip the vine and slide down...',
  'jump-down': 'You drop down...',
};

let game;
const restHeights = new Map(); // "x,y" -> platform top
const progress = new Map();    // courseId -> Set of obstacle indices done this lap
let run = null;                // current forced traversal {data, obj, tiles, len, fail, startElev}
let pending = null;            // waiting for the player to reach the approach tile

const key = (x, y) => `${x},${y}`;
const elevated = (p) => (p.elevation || 0) > 0.5;

export function init(g) {
  game = g;
  const I = game.interactions;

  for (const [, pf] of allData('agility_platform')) {
    for (let dx = 0; dx < pf.w; dx++) for (let dy = 0; dy < pf.h; dy++) restHeights.set(key(pf.x + dx, pf.y + dy), pf.top);
  }

  // one handler per option, registered with explicit object ids (beats generic '*' handlers)
  const byOption = new Map();
  for (const [id, d] of allData('agility')) {
    if (!d.path) continue; // legacy entries without a path are ignored
    const opt = d.option || 'Walk-across';
    if (!byOption.has(opt)) byOption.set(opt, []);
    byOption.get(opt).push(id);
  }
  for (const [opt, ids] of byOption) {
    I.onObject(opt, ids, ({ player, target }) => attempt(player, target, getData('agility', target.id)), {
      range: ({ player }) => (elevated(player) ? 4 : 1),
    });
  }

  game.onTick(() => tick(), 5);

  game.events.on('player:walk', () => { pending = null; });
  game.events.on('snapshot', ({ snap, player }) => { if (player.elevation) snap.elevation = +player.elevation.toFixed(2); });
  game.events.on('player:death', () => { run = null; pending = null; game.player.elevation = 0; });

  // Run-energy bonus from the Wayfarer's outfit (applied whenever energy is regenerating).
  let lastEnergy = null;
  const pieces = new Set(getData('agility_outfit', 'pieces') || []);
  game.onTick(() => {
    const p = game.player;
    if (lastEnergy != null && p.runEnergy > lastEnergy && p.runEnergy < 10000) {
      const worn = Object.values(p.equipment.ids()).filter((id) => pieces.has(id)).length;
      if (worn) {
        const base = 8 + Math.floor(p.skills.getLevel('agility') / 6) * 1.5;
        const bonus = base * (worn * 0.1 + (worn >= pieces.size ? 0.2 : 0));
        p.runEnergy = Math.min(10000, p.runEnergy + bonus);
      }
    }
    lastEnergy = p.runEnergy;
  }, 30);

  I.onItem('Drink-tonic', ['trail_tonic'], ({ player, slot }) => {
    player.inventory.removeAt(slot, 1);
    player.runEnergy = Math.min(10000, player.runEnergy + 3000);
    game.playAnim(player, 'drink', 900);
    game.message('You drink the trail tonic. You feel light on your feet.');
    game.events.emit('run:change', { player });
  });

  game.agility = {
    restHeightAt: (x, y) => restHeights.get(key(x, y)) || 0,
    laps: (courseId) => game.player.store('agility').laps?.[courseId] || 0,
    isBusy: () => !!run,
  };

  try { initMagicUtility(game); } catch (e) { console.error('[agility] magic utility init failed', e); }
}

// ------------------------------------------------------------------------------------------------
function attempt(player, obj, data) {
  if (!data) return false;
  if (run) return;
  if (player.skills.getLevel('agility') < data.level) {
    game.message(`You need an Agility level of ${data.level} to attempt this.`);
    return;
  }
  let tiles = data.path.map((t) => ({ x: t[0], y: t[1], h: t[2] || 0 }));
  if (data.bidir) {
    const a = tiles[0], b = tiles[tiles.length - 1];
    const da = Math.max(Math.abs(a.x - player.x), Math.abs(a.y - player.y));
    const db = Math.max(Math.abs(b.x - player.x), Math.abs(b.y - player.y));
    if (db < da) tiles = tiles.slice().reverse();
  }
  const first = tiles[0];
  const dist = Math.max(Math.abs(first.x - player.x), Math.abs(first.y - player.y));
  if (dist > 1 && !elevated(player)) {
    // walk to the approach tile first, then start (tick handler)
    game.pathTo(player, { x0: first.x, y0: first.y, x1: first.x, y1: first.y, mode: 'tile' });
    if (!player.path.length && (player.x !== first.x || player.y !== first.y)) { game.message("I can't reach that!"); return; }
    pending = { obj, data, tiles };
    return;
  }
  begin(player, obj, data, tiles);
}

function begin(player, obj, data, tiles) {
  pending = null;
  // straight-line steps from where we stand to the approach tile
  const pre = [];
  let cx = player.x, cy = player.y;
  const h0 = player.elevation || 0;
  while (cx !== tiles[0].x || cy !== tiles[0].y) {
    cx += Math.sign(tiles[0].x - cx); cy += Math.sign(tiles[0].y - cy);
    pre.push({ x: cx, y: cy, h: cx === tiles[0].x && cy === tiles[0].y ? tiles[0].h : h0 });
  }
  let body = tiles.slice(1);
  let fail = null;
  if (data.fail) {
    const lvl = player.skills.getLevel('agility');
    const f = data.fail;
    if (lvl < f.stop) {
      const span = Math.max(1, f.stop - data.level);
      const chance = f.chance * Math.min(1, (f.stop - lvl) / span);
      if (Math.random() < chance) {
        fail = f;
        const at = Math.max(1, Math.min(f.at ?? 1, tiles.length - 1));
        body = tiles.slice(1, at + 1);
      }
    }
  }
  const all = [...pre, ...body];
  if (!all.length) all.push({ x: player.x, y: player.y, h: h0 });
  game.actions.stop(player, 'forced');
  player.interaction = null;
  player.combatTarget = null;
  player.following = null;
  player.path = all.map((t) => ({ x: t.x, y: t.y }));
  player.forced = true;
  player.loopAnim = data.anim || null;
  game.actions.lock(player, all.length + 1);
  run = { data, obj, tiles: all, len: all.length, fail, startElev: h0, origin: tiles[0] };
  const msg = data.message || START_MSG[(data.option || '').toLowerCase()];
  if (msg) game.message(msg);
}

function tick() {
  const p = game.player;
  if (pending) {
    const t = pending.tiles[0];
    if (p.x === t.x && p.y === t.y) begin(p, pending.obj, pending.data, pending.tiles);
    else if (!p.path.length || p.interaction || p.dead) pending = null;
  }
  if (run) {
    const moved = run.len - p.path.length;
    const cur = run.tiles[Math.max(0, moved - 1)];
    p.elevation = moved > 0 ? cur.h : run.startElev;
    if (!p.path.length || p.dead) finish(p);
    return;
  }
  const rest = !game.world.isWalkable(p.x, p.y) ? restHeights.get(key(p.x, p.y)) : 0;
  p.elevation = rest || 0;
}

function finish(p) {
  const r = run;
  run = null;
  p.forced = false;
  p.lockedUntil = Math.min(p.lockedUntil || 0, game.tickCount);
  if (r.data.anim && p.loopAnim === r.data.anim) p.loopAnim = null;
  const last = r.tiles[r.tiles.length - 1];
  if (p.dead || p.x !== last.x || p.y !== last.y) { p.elevation = 0; return; } // interrupted (teleport/death)
  const d = r.data;
  if (r.fail) {
    const to = r.fail.to || [r.origin.x, r.origin.y];
    game.teleport(p, to[0], to[1]);
    p.elevation = 0;
    game.playAnim(p, 'block', 600);
    game.message(`<col=8a0000>${r.fail.message || 'You fall!'}</col>`);
    const [a, b] = r.fail.damage || [1, 2];
    game.applyDamage(p, rand.int(a, b), { type: 'typeless' });
    game.events.emit('agility:fail', { player: p, obstacle: r.obj.id });
    return;
  }
  p.elevation = last.h || (!game.world.isWalkable(p.x, p.y) ? restHeights.get(key(p.x, p.y)) || 0 : 0);
  p.skills.addXp('agility', d.xp);
  game.events.emit('agility:obstacle', { player: p, obstacle: r.obj.id, course: d.course });
  if (d.course) courseProgress(p, d);
  else if (d.done) game.message(d.done);
  else game.message('...and you make it safely to the other side.');
}

function courseProgress(p, d) {
  const c = getData('agility_course', d.course);
  if (!c) return;
  let set = progress.get(d.course);
  if (d.index === 0 || !set) { set = new Set(); progress.set(d.course, set); }
  set.add(d.index);
  if (d.index !== c.obstacles.length - 1) return;
  progress.delete(d.course);
  if (set.size < c.obstacles.length) { game.message('You skipped part of the course, so you get no lap bonus.'); return; }
  const st = p.store('agility');
  st.laps ||= {};
  st.laps[d.course] = (st.laps[d.course] || 0) + 1;
  p.skills.addXp('agility', c.lapXp);
  game.message(`Your ${c.name} lap count is: <col=c00000>${st.laps[d.course]}</col>.`);
  game.events.emit('agility:lap', { player: p, course: d.course, laps: st.laps[d.course] });
  // Wayfarer marks: more likely when the course is well below your level
  const lvl = p.skills.getLevel('agility');
  const chance = Math.max(0.1, c.markChance - Math.max(0, lvl - c.level - 20) * 0.01);
  if (Math.random() < chance) {
    const qty = c.wilderness ? rand.int(1, 3) : 1;
    const [fx, fy] = c.finish || [p.x, p.y];
    game.spawnGroundItem('wayfarer_mark', qty, fx, fy, { owner: p.name, ticks: 300 });
    game.message('<col=1a7a4a>A Wayfarer mark glints on the ground nearby.</col>');
  }
  if (c.wilderness && Math.random() < 0.3) game.giveItem('coins', rand.int(80, 260), p);
}

