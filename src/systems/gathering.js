// Gathering skills: Woodcutting, Mining, Fishing (+ Hunter and Farming in their own helper modules).
// OWNER: agent B. Driven by registerData('woodcutting'|'mining'|'fishing'|'tools'|...) in content/gathering_*.js.
//
// Public API on game.gathering:
//   bestTool(player, skill), farming (see systems/farming.js), hunter (see systems/hunter.js)

import { getData, getItem } from '../core/registry.js';
import { rollDropTable } from '../core/drops.js';
import { bestTool, hasTool, levelChance, lvl, needLevel, roll, rand, catchPhrase, itemName, clamp } from './gathering_util.js';
import * as hunter from './hunter.js';
import * as farming from './farming.js';
import { mulberry32 } from '../core/rng.js';
import { RUNTIME_ROCKS } from '../content/gathering_spawns.js';

let game;

const NEST_CHANCE = 1 / 256;
const GEM_CHANCE = 1 / 256;

export { bestTool };

// =================================================================================================
// Woodcutting
// =================================================================================================
function woodcuttingData(obj) {
  if (obj.state.patch) return farming.treeData(obj);
  return getData('woodcutting', obj.id);
}

function chop(ctx) {
  const { player, target } = ctx;
  const data = woodcuttingData(target);
  if (!data) return false;
  if (lvl(player, 'woodcutting') < data.level) { needLevel(game, 'woodcutting', data.level, 'chop down this tree'); return; }
  const axe = bestTool(player, 'woodcutting');
  if (!axe) { game.message('You do not have an axe which you have the Woodcutting level to use.'); return; }
  if (player.inventory.capacityFor(data.log) <= 0) { game.message(`Your inventory is too full to hold any more ${itemName(data.log)}.`); return; }
  const objId = target.id;
  const st = target.state;
  // tree life regenerates while nobody chops it
  if (data.life) st.life = Math.min(data.life, (st.life ?? data.life) + Math.max(0, game.tickCount - (st.lastChop ?? 0)));
  game.message('You swing your axe at the tree.');
  game.actions.start(player, {
    name: 'woodcutting', anim: 'chop', tool: axe.id, delay: 0, interval: 1,
    onTick: ({ ticks }) => {
      if (target.id !== objId || target.hidden || !game.objects.has(target.uid)) return false;
      if (data.life) { st.life = (st.life ?? data.life) - 1; st.lastChop = game.tickCount; }
      if (ticks % 4 !== 3) return true;
      const chance = clamp(levelChance(lvl(player, 'woodcutting'), data.chance) * axe.power, 0, 0.97);
      if (Math.random() >= chance) return true;
      player.inventory.add(data.log, 1);
      player.skills.addXp('woodcutting', data.xp);
      game.message(`You get some ${itemName(data.log)}.`);
      game.events.emit('gathering:log', { player, log: data.log, object: target });
      if (Math.random() < NEST_CHANCE) {
        game.spawnGroundItem(Math.random() < 0.2 ? 'twig_nest_eggs' : 'twig_nest', 1, player.x, player.y, { owner: player.name });
        game.message('<col=ff0000>A bird\'s nest falls out of the tree.</col>');
      }
      if (!data.life || st.life <= 0) {
        st.life = undefined;
        if (target.state.patch) farming.treeFelled(target);
        else game.depleteObject(target, roll(data.respawnTicks));
        return false;
      }
      if (player.inventory.capacityFor(data.log) <= 0) { game.message(`Your inventory is too full to hold any more ${itemName(data.log)}.`); return false; }
      return true;
    },
  });
}

// =================================================================================================
// Mining
// =================================================================================================
function mine(ctx) {
  const { player, target } = ctx;
  if (target.id === 'rock_depleted') { game.message('There is no ore currently available in this rock.'); return; }
  const data = getData('mining', target.id);
  if (!data) return false;
  if (lvl(player, 'mining') < data.level) { needLevel(game, 'mining', data.level, 'mine this rock'); return; }
  const pick = bestTool(player, 'mining');
  if (!pick) { game.message('You need a pickaxe to mine this rock. You do not have a pickaxe which you have the Mining level to use.'); return; }
  if (player.inventory.capacityFor(data.ore) <= 0) { game.message(`Your inventory is too full to hold any more ${data.what}.`); return; }
  const objId = target.id;
  const interval = data.fast ? Math.max(2, (pick.interval || 6) - 3) : (pick.interval || 6);
  game.message(data.infinite ? 'You swing your pick at the crystal.' : 'You swing your pick at the rock.');
  game.actions.start(player, {
    name: 'mining', anim: 'mine', tool: pick.id, delay: 0, interval: 1,
    onTick: ({ ticks }) => {
      if (target.id !== objId || target.hidden || !game.objects.has(target.uid)) return false;
      if (ticks % interval !== interval - 1) return true;
      const chance = clamp(levelChance(lvl(player, 'mining'), data.chance) * pick.power, 0, 0.97);
      if (Math.random() >= chance) return true;
      player.inventory.add(data.ore, 1);
      player.skills.addXp('mining', data.xp);
      if (!data.infinite) game.message(`You manage to mine some ${data.what}.`);
      game.events.emit('gathering:ore', { player, ore: data.ore, object: target });
      if (data.gems && Math.random() < GEM_CHANCE) {
        for (const g of rollDropTable('gathering_gems')) {
          game.giveItem(g.id, g.qty, player);
          game.message(`You just found ${/^[aeiou]/i.test(itemName(g.id).replace('uncut ', '')) ? 'an' : 'a'} ${itemName(g.id).replace('uncut ', '')}!`);
        }
      }
      if (!data.infinite) { game.depleteObject(target, roll(data.respawnTicks)); return false; }
      if (player.inventory.capacityFor(data.ore) <= 0) { game.message(`Your inventory is too full to hold any more ${data.what}.`); return false; }
      return true;
    },
  });
}

function prospect({ player, target }) {
  const data = getData('mining', target.id);
  if (target.id === 'rock_depleted') { game.message('There is currently no ore available in this rock.'); return; }
  if (!data) return false;
  game.message('You examine the rock for ores...');
  game.actions.start(player, {
    name: 'prospect', delay: 2,
    onTick: () => { game.message(`This rock contains ${data.what}.`); return false; },
  });
}

// =================================================================================================
// Fishing
// =================================================================================================
const FISH_OPTIONS = ['Net', 'Bait', 'Lure', 'Cage', 'Harpoon', 'Big-net'];

function fish(ctx) {
  const { player, target, option } = ctx;
  const all = getData('fishing', target.id);
  if (!all) return false;
  const key = Object.keys(all).find((k) => k.toLowerCase() === String(option).toLowerCase());
  const spot = key && all[key];
  if (!spot) return false;
  const level = lvl(player, 'fishing');
  const minLevel = Math.min(...spot.catches.map((c) => c.level));
  if (level < minLevel) { game.message(`You need a Fishing level of at least ${minLevel} to fish here.`); return; }
  if (!hasTool(player, spot.tool)) { game.message(`You need ${/^[aeiou]/i.test(itemName(spot.tool)) ? 'an' : 'a'} ${itemName(spot.tool)} to ${spot.verb} these fish.`); return; }
  if (spot.bait && !player.inventory.has(spot.bait)) { game.message(spot.bait === 'feather' ? "You don't have any feathers left." : "You don't have any bait left."); return; }
  if (player.inventory.isFull()) { game.message("You can't carry any more fish."); return; }
  const sx = target.x, sy = target.y, objUid = target.uid;
  game.message(spot.startMsg);
  const catches = [...spot.catches].sort((a, b) => b.level - a.level);
  game.actions.start(player, {
    name: 'fishing', anim: 'fish', tool: spot.tool, delay: 0, interval: 1,
    onTick: ({ ticks }) => {
      if (!game.objects.has(objUid) || target.hidden || target.x !== sx || target.y !== sy) return false;
      if (ticks % 5 !== 4) return true;
      if (spot.bait && !player.inventory.has(spot.bait)) { game.message(spot.bait === 'feather' ? "You don't have any feathers left." : "You don't have any bait left."); return false; }
      const L = lvl(player, 'fishing');
      const c = catches.find((f) => f.level <= L && Math.random() < levelChance(L, f.chance));
      if (!c) return true;
      if (spot.bait) player.inventory.remove(spot.bait, 1);
      player.inventory.add(c.id, 1);
      player.skills.addXp('fishing', c.xp);
      game.message(`You catch ${catchPhrase(c.id)}.`);
      game.events.emit('gathering:fish', { player, fish: c.id, object: target });
      if (player.inventory.isFull()) { game.message("You can't carry any more fish."); return false; }
      return true;
    },
  });
}

/** Fishing spots occasionally move to another nearby water tile. */
const spots = new Set();
function trackSpot(obj) {
  if (!getData('fishing', obj.id)) return;
  obj.state.homeX ??= obj.x; obj.state.homeY ??= obj.y;
  obj.state.moveAt = game.tickCount + 300 + rand(500);
  spots.add(obj);
}
const shoreOk = (w, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => w.isWalkable(x + dx, y + dy));
/** Spots placed at map build can end up cut off by later scenery: move them (deterministically) to the nearest fishable tile. */
function fixSpot(obj) {
  const w = game.world;
  if (!w.isWater(obj.x, obj.y) || shoreOk(w, obj.x, obj.y)) return;
  for (let r = 1; r <= 10; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = obj.x + dx, y = obj.y + dy;
      if (!w.isWater(x, y) || w.objectsAt(x, y).length || !shoreOk(w, x, y)) continue;
      game.removeObject(obj);
      game.spawnObject(obj.id, x, y);
      return;
    }
  }
  game.removeObject(obj);
}
function moveSpots(tick) {
  const w = game.world;
  for (const obj of spots) {
    if (!game.objects.has(obj.uid)) { spots.delete(obj); continue; }
    if (tick < obj.state.moveAt) continue;
    const { homeX, homeY } = obj.state;
    let dest = null;
    for (let tries = 0; tries < 40 && !dest; tries++) {
      const x = homeX + rand(13) - 6, y = homeY + rand(13) - 6;
      if ((x === obj.x && y === obj.y) || !w.isWater(x, y) || w.objectsAt(x, y).length) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => w.isWalkable(x + dx, y + dy))) dest = { x, y };
    }
    obj.state.moveAt = tick + 300 + rand(500);
    if (!dest) continue;
    const state = { ...obj.state };
    spots.delete(obj);
    game.removeObject(obj);
    const moved = game.spawnObject(obj.id, dest.x, dest.y);
    if (moved) { Object.assign(moved.state, state); spots.add(moved); }
  }
}

// =================================================================================================
// Misc items: bird nests
// =================================================================================================
function searchNest({ player, slot, item }) {
  if (player.inventory.freeSlots() < 1) { game.message("You don't have enough inventory space to do that."); return; }
  player.inventory.removeAt(slot, 1);
  player.inventory.set(slot, { id: 'empty_nest', qty: 1 });
  if (item.id === 'twig_nest_eggs') {
    player.inventory.add('speckled_egg', 1);
    game.message('You take the egg out of the nest.');
    return;
  }
  const loot = rollDropTable('gathering_nest');
  for (const l of loot) game.giveItem(l.id, l.qty, player);
  game.message(loot.length ? `You take ${loot.map((l) => `${l.qty > 1 ? l.qty + ' x ' : ''}${itemName(l.id)}`).join(', ')} out of the bird's nest.` : 'The nest is empty.');
}


// =================================================================================================
// Runtime, corridor-safe rock placement (deterministic per seed, so every client agrees)
// =================================================================================================
function placeRuntimeRocks() {
  const w = game.world;
  // never drop a rock on a creature's spawn tile (spawn tiles are deterministic, so clients still agree)
  const npcTiles = new Set();
  for (const n of game.npcs.values()) for (let dy = 0; dy < (n.size || 1); dy++) for (let dx = 0; dx < (n.size || 1); dx++) npcTiles.add(`${n.spawnX + dx},${n.spawnY + dy}`);
  for (const rule of RUNTIME_ROCKS) {
    const rng = mulberry32(rule.seed * 7919 + 17);
    const [x0, y0, x1, y1] = rule.rect;
    const terrain = new Set(rule.terrain);
    const total = rule.ids.reduce((a, e) => a + e.weight, 0);
    const placed = [];
    const open = (x, y) => w.isWalkable(x, y) && !w.objectsAt(x, y).length && !npcTiles.has(`${x},${y}`);
    for (let tries = 0; tries < rule.count * 60 && placed.length < rule.count; tries++) {
      const x = x0 + Math.floor(rng() * (x1 - x0 + 1)), y = y0 + Math.floor(rng() * (y1 - y0 + 1));
      let r = rng() * total, id = rule.ids[0].id;
      for (const e of rule.ids) { r -= e.weight; if (r < 0) { id = e.id; break; } }
      const [sw, sh] = game.registry.getObject(id)?.size || [1, 1];
      let ok = true;
      for (let dy = -1; dy <= sh && ok; dy++) for (let dx = -1; dx <= sw && ok; dx++) {
        const inside = dx >= 0 && dy >= 0 && dx < sw && dy < sh;
        // the rock's own tiles must be empty; the ring around it only needs to stay walkable
        if (inside ? !open(x + dx, y + dy) || !terrain.has(w.terrainAt(x + dx, y + dy)?.id) : !w.isWalkable(x + dx, y + dy)) ok = false;
      }
      if (!ok || placed.some((p) => Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2)) continue;
      const obj = game.spawnObject(id, x, y);
      if (obj) placed.push(obj);
    }
  }
}

// =================================================================================================
export function init(g) {
  game = g;
  const I = game.interactions;

  I.onObject('Chop down', '*', chop);
  I.onObject('Mine', '*', mine);
  I.onObject('Prospect', '*', prospect);
  for (const opt of FISH_OPTIONS) I.onObject(opt, '*', fish);

  I.onItem('Search', ['twig_nest', 'twig_nest_eggs'], searchNest);

  placeRuntimeRocks();
  for (const o of [...game.objects.values()]) if (getData('fishing', o.id)) fixSpot(o);
  for (const o of game.objects.values()) trackSpot(o);
  game.events.on('object:add', ({ object }) => { if (!spots.has(object) && getData('fishing', object.id) && !object.state.moveAt) trackSpot(object); });
  game.onTick(moveSpots, 40);

  game.gathering = { bestTool, levelChance, spots };
  game.gathering.hunter = hunter.init(game);
  game.gathering.farming = farming.init(game);
}
