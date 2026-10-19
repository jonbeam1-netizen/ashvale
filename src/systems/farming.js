// Farming: weeding, planting, compost, watering, disease, real-time growth, harvesting, tree
// check-health / chopping. OWNER: agent B (imported by systems/gathering.js).
//
// Patches are the spawned 'farm_patch_<kind>' objects; each is keyed by '<kind>@x,y'. Per-player
// state lives in player.store('farming').patches[key] and growth uses wall-clock time, so crops keep
// growing while the game is closed. The patch object swaps to a per-state visual def
// (content/gathering_farming.js patchVisualId) whenever its state changes.
//
// game.gathering.farming = { patches, state(key), update(), fastForward(minutes), speed }

import { getData } from '../core/registry.js';
import { PATCH_TYPES, patchVisualId } from '../content/gathering_farming.js';
import { lvl, needLevel, clamp, rand, itemName, hasTool } from './gathering_util.js';

let game;
const patches = new Map();          // key -> WorldObject
const MIN = 60000;
const api = { speed: 1, patches };   // speed: growth multiplier (debug)

const now = () => Date.now();
const store = () => {
  const s = game.player.store('farming');
  if (!s.patches) s.patches = {};
  return s;
};
const stageMs = (kind) => (PATCH_TYPES[kind].growMins * MIN) / api.speed;
const weedMs = (kind) => (PATCH_TYPES[kind].weedMins * MIN) / api.speed;
const STUMP_MS = 8 * MIN;

function stateOf(obj) {
  const { key } = obj.state.patch;
  const s = store().patches;
  if (!s[key]) s[key] = { weeds: 3, weedAt: now() };
  return s[key];
}
const plantOf = (st) => (st.seed ? getData('farming', st.seed) : null);
const patchName = (kind) => (kind === 'allotment' ? 'allotment' : kind === 'herb' ? 'herb patch' : 'tree patch');

function clearPatch(st) {
  for (const k of Object.keys(st)) delete st[k];
  st.weeds = 0;
  st.weedAt = now();
}

function diseaseChance(kind, st) {
  if (st.watered) return 0;
  let c = kind === 'tree' ? 0.06 : 0.1;
  if (st.compost === 'compost') c *= 0.5;
  if (st.compost === 'supercompost') c *= 0.2;
  return c;
}

/** Advance a patch's state to time t. */
function advance(kind, st, t) {
  const plant = plantOf(st);
  if (!plant) {
    if (st.weeds < 3) {
      const step = weedMs(kind);
      while (st.weeds < 3 && t >= st.weedAt + step) { st.weeds++; st.weedAt += step; }
    }
    return;
  }
  if (st.stump) {
    if (t >= st.stumpUntil) { st.stump = false; st.checked = true; }
    return;
  }
  if (st.cond === 'dead') return;
  const step = stageMs(kind);
  while (st.stage < plant.stages && t >= st.nextAt) {
    if (st.cond === 'diseased') { st.cond = 'dead'; break; }
    st.stage++;
    st.nextAt += step;
    if (st.stage < plant.stages && Math.random() < diseaseChance(kind, st)) st.cond = 'diseased';
    st.watered = false;
  }
}

function refresh(obj) {
  const { kind } = obj.state.patch;
  const st = stateOf(obj);
  advance(kind, st, now());
  const id = patchVisualId(kind, st);
  if (obj.id !== id) game.replaceObject(obj, id);
}
function update() { for (const obj of patches.values()) if (game.objects.has(obj.uid)) refresh(obj); }

const patchOf = (target) => (target?.state?.patch ? target : null);

// ---- handlers ------------------------------------------------------------------------------------
function rake({ player, target }) {
  if (!patchOf(target)) return false;
  const st = stateOf(target);
  if (plantOf(st) || !st.weeds) { game.message("This patch doesn't need weeding right now."); return; }
  if (!hasTool(player, 'rake')) { game.message('You need a rake to weed a farming patch.'); return; }
  game.message('You start raking the patch...');
  game.actions.start(player, {
    name: 'farming_rake', anim: 'mine', tool: 'rake', delay: 0,
    onTick: ({ ticks }) => {
      if (!game.objects.has(target.uid)) return false;
      if (ticks % 4 !== 3) return true;
      if (Math.random() > clamp(0.55 + lvl(player, 'farming') * 0.006, 0, 0.95)) return true;
      st.weeds = Math.max(0, st.weeds - 1);
      st.weedAt = now();
      if (!player.inventory.add('weeds', 1)) game.spawnGroundItem('weeds', 1, player.x, player.y, { owner: player.name });
      player.skills.addXp('farming', 4);
      refresh(target);
      if (!st.weeds) { game.message('You have finished weeding the patch.'); return false; }
      return true;
    },
  });
}

function inspect({ target }) {
  if (!patchOf(target)) return false;
  const { kind } = target.state.patch;
  const st = stateOf(target);
  advance(kind, st, now());
  const plant = plantOf(st);
  const soil = st.compost ? `The soil has been treated with ${st.compost}.` : 'The soil has not been treated.';
  let msg;
  if (!plant) msg = st.weeds ? `The patch needs weeding.` : 'The patch is empty and weeded.';
  else if (st.stump) msg = 'The tree has been chopped down; the stump will regrow in time.';
  else if (st.cond === 'dead') msg = `The ${plant.name.toLowerCase()} has died. Clear the patch with a spade.`;
  else if (st.cond === 'diseased') msg = `The ${plant.name.toLowerCase()} is diseased! Use a plant cure on it quickly.`;
  else if (st.stage >= plant.stages) msg = kind === 'tree' ? (st.checked ? `The ${plant.name.toLowerCase()} is fully grown.` : `The ${plant.name.toLowerCase()} is fully grown - check its health.`) : `The ${plant.name.toLowerCase()} is ready to harvest.`;
  else {
    const mins = Math.max(1, Math.ceil((st.nextAt - now() + (plant.stages - st.stage - 1) * stageMs(kind)) / MIN));
    msg = `The ${plant.name.toLowerCase()} is growing (stage ${st.stage + 1} of ${plant.stages + 1}), about ${mins} minute${mins > 1 ? 's' : ''} from fully grown.${st.watered ? ' It has been watered.' : ''}`;
  }
  game.message(`This is ${kind === 'allotment' ? 'an' : 'a'} ${patchName(kind)}. ${soil}`);
  game.message(msg);
}

function plant({ player, target, item, slot }) {
  if (!patchOf(target)) return false;
  const seed = getData('farming', item.id);
  if (!seed) return false;
  const { kind } = target.state.patch;
  const st = stateOf(target);
  if (seed.type !== kind) { game.message(`You can't plant ${itemName(item.id).replace(/ seed$/, '')} seeds in ${kind === 'allotment' ? 'an' : 'a'} ${patchName(kind)}.`); return; }
  if (plantOf(st)) { game.message('There is already something growing in this patch.'); return; }
  if (st.weeds) { game.message('This patch needs weeding first.'); return; }
  if (lvl(player, 'farming') < seed.level) { needLevel(game, 'farming', seed.level, `plant ${itemName(item.id).replace(/ seed$/, '')} seeds`); return; }
  const tool = kind === 'tree' ? 'spade' : 'seed_dibber';
  if (!player.inventory.has(tool)) { game.message(kind === 'tree' ? 'You need a spade to plant a tree.' : 'You need a seed dibber to plant seeds.'); return; }
  if (!player.inventory.has(item.id, seed.seeds)) { game.message(`You need ${seed.seeds} seeds to plant ${kind === 'allotment' ? 'an' : 'a'} ${patchName(kind)}.`); return; }
  game.playAnim(player, 'pickup', 1200);
  game.actions.start(player, {
    name: 'farming_plant', delay: 2, interruptible: false,
    onTick: () => {
      if (plantOf(st) || player.inventory.count(item.id) < seed.seeds) return false;
      player.inventory.remove(item.id, seed.seeds);
      const t = now();
      Object.assign(st, { seed: item.id, stage: 0, cond: 'ok', plantedAt: t, nextAt: t + stageMs(kind), watered: false, lives: 3 + (st.compost === 'supercompost' ? 2 : st.compost === 'compost' ? 1 : 0), checked: false, stump: false });
      player.skills.addXp('farming', seed.plantXp);
      game.message(`You plant ${seed.seeds > 1 ? seed.seeds + ' ' : 'the '}${itemName(item.id).replace(/ seed$/, '')} seed${seed.seeds > 1 ? 's' : ''} in the ${patchName(kind)}.`);
      refresh(target);
      return false;
    },
  });
}

function compost({ player, target, item, slot }) {
  if (!patchOf(target)) return false;
  const { kind } = target.state.patch;
  const st = stateOf(target);
  if (st.compost) { game.message(`This ${patchName(kind)} has already been treated with ${st.compost}.`); return; }
  if (!plantOf(st) && st.weeds) { game.message('This patch needs weeding first.'); return; }
  if (plantOf(st) && (st.stage > 0 || st.cond !== 'ok')) { game.message('It is too late to treat this patch now.'); return; }
  player.inventory.removeAt(slot, 1);
  st.compost = item.id;
  if (plantOf(st)) st.lives = (st.lives ?? 3) + (item.id === 'supercompost' ? 2 : 1);
  game.playAnim(player, 'pickup', 900);
  player.skills.addXp('farming', item.id === 'supercompost' ? 26 : 18);
  game.message(`You treat the ${patchName(kind)} with ${item.id}.`);
}

function water({ player, target }) {
  if (!patchOf(target)) return false;
  const { kind } = target.state.patch;
  const st = stateOf(target);
  const p = plantOf(st);
  if (kind !== 'allotment') { game.message("This patch doesn't need watering."); return; }
  if (!p || st.stage >= p.stages || st.cond !== 'ok') { game.message("This patch doesn't need watering right now."); return; }
  if (st.watered) { game.message('This patch has already been watered.'); return; }
  st.watered = true;
  game.playAnim(player, 'pickup', 900);
  game.message(`You water the ${p.name.toLowerCase()}.`);
}

function cure({ player, target }) {
  if (!patchOf(target)) return false;
  const st = stateOf(target);
  const p = plantOf(st);
  if (!p || st.cond !== 'diseased') { game.message("This patch doesn't need curing."); return; }
  if (!player.inventory.has('plant_cure')) { game.message('You need a plant cure to cure this patch.'); return; }
  player.inventory.remove('plant_cure', 1);
  st.cond = 'ok';
  game.playAnim(player, 'pickup', 900);
  player.skills.addXp('farming', 4);
  game.message(`You treat the ${p.name.toLowerCase()} with plant cure. It is restored to health.`);
  refresh(target);
}

function clear({ player, target }) {
  if (!patchOf(target)) return false;
  const st = stateOf(target);
  if (!plantOf(st) || (st.cond !== 'dead' && !st.stump)) { game.message('There is nothing to clear.'); return; }
  if (!player.inventory.has('spade')) { game.message('You need a spade to clear this patch.'); return; }
  game.message('You start digging up the patch...');
  game.actions.start(player, {
    name: 'farming_clear', anim: 'mine', tool: 'spade', delay: 3,
    onTick: () => {
      if (!game.objects.has(target.uid)) return false;
      clearPatch(st);
      player.skills.addXp('farming', 4);
      game.message('You have successfully cleared this patch for new crops.');
      refresh(target);
      return false;
    },
  });
}

function harvest({ player, target }) {
  if (!patchOf(target)) return false;
  const { kind } = target.state.patch;
  const st = stateOf(target);
  advance(kind, st, now());
  const p = plantOf(st);
  if (!p || kind === 'tree' || st.stage < p.stages || st.cond !== 'ok') { game.message('There is nothing ready to harvest here.'); return; }
  if (kind === 'allotment' && !player.inventory.has('spade')) { game.message('You need a spade to harvest your crops.'); return; }
  if (player.inventory.capacityFor(p.crop) <= 0) { game.message("You don't have enough inventory space."); return; }
  game.message(kind === 'herb' ? 'You begin to harvest the herb patch.' : 'You begin to harvest the allotment.');
  game.actions.start(player, {
    name: 'farming_harvest', anim: kind === 'herb' ? 'craft' : 'mine', tool: kind === 'allotment' ? 'spade' : undefined, delay: 1,
    onTick: ({ ticks }) => {
      if (!game.objects.has(target.uid) || plantOf(st) !== p) return false;
      if (ticks % 2) return true;
      if (player.inventory.capacityFor(p.crop) <= 0) { game.message("You don't have enough inventory space."); return false; }
      player.inventory.add(p.crop, 1);
      player.skills.addXp('farming', p.harvestXp);
      const save = clamp(0.3 + (lvl(player, 'farming') - p.level) * 0.012, 0.3, 0.8);
      if (Math.random() >= save) st.lives = (st.lives ?? 3) - 1;
      if (st.lives <= 0) {
        clearPatch(st);
        game.message(`The ${patchName(kind)} is now empty.`);
        refresh(target);
        return false;
      }
      return true;
    },
  });
}

function checkHealth({ player, target }) {
  if (!patchOf(target)) return false;
  const st = stateOf(target);
  const p = plantOf(st);
  if (!p || target.state.patch.kind !== 'tree' || st.stage < p.stages || st.checked || st.cond !== 'ok') { game.message("There's nothing to check here right now."); return; }
  st.checked = true;
  game.playAnim(player, 'pickup', 900);
  player.skills.addXp('farming', p.checkXp);
  game.message(`You examine the tree for signs of disease and find that it is in perfect health.`);
  refresh(target);
}

/** Woodcutting data for a grown patch tree (used by the Chop down handler). */
export function treeData(obj) {
  const st = stateOf(obj);
  const p = plantOf(st);
  if (!p || p.type !== 'tree' || !st.checked || st.stump) return null;
  const wc = getData('woodcutting', p.treeObject);
  return wc ? { ...wc, respawnTicks: 0 } : null;
}
export function treeFelled(obj) {
  const st = stateOf(obj);
  st.stump = true;
  st.stumpUntil = now() + STUMP_MS / api.speed;
  refresh(obj);
}

// ---- compost bin & seed crate ---------------------------------------------------------------------------
const SUPER_INPUTS = new Set(['honeycorn', 'rubyberry', 'dewmelon']);
function useOnBin({ player, item }) {
  const isSuper = SUPER_INPUTS.has(item.id) || /^grimy_/.test(item.id);
  if (item.id !== 'weeds' && !isSuper && !getData('farming', `${item.id}_seed`)) { game.message('That won\'t rot down into anything useful.'); return; }
  const need = 3;
  if (player.inventory.count(item.id) < need) { game.message(`You need ${need} of those to make a batch of compost.`); return; }
  player.inventory.remove(item.id, need);
  const out = isSuper ? 'supercompost' : 'compost';
  player.inventory.add(out, 1);
  player.skills.addXp('farming', isSuper ? 8.5 : 4.5);
  game.playAnim(player, 'pickup', 900);
  game.message(`You fill the bin and take out a sack of ${out}.`);
}

const CRATE_SEEDS = [['fieldroot_seed', [3, 6]], ['goldbulb_seed', [3, 5]], ['leafhead_seed', [3, 4]], ['sagewort_seed', [1, 1]], ['bitterleaf_seed', [1, 1]]];
function searchCrate({ player }) {
  const s = store();
  if (s.crateAt && now() - s.crateAt < 2 * MIN) { game.message("You've already taken your share for now. Come back later."); return; }
  const [id, [a, b]] = CRATE_SEEDS[rand(CRATE_SEEDS.length)];
  const qty = a + rand(b - a + 1);
  s.crateAt = now();
  game.playAnim(player, 'pickup', 900);
  game.giveItem(id, qty, player);
  game.message(`You search the crate and find ${qty} ${itemName(id)}${qty > 1 ? 's' : ''}.`);
}

// ---- init ---------------------------------------------------------------------------------------------------
export function init(g) {
  game = g;
  for (const obj of game.objects.values()) {
    const m = /^farm_patch_(allotment|herb|tree)$/.exec(obj.originalId);
    if (!m) continue;
    const key = `${m[1]}@${obj.x},${obj.y}`;
    obj.state.patch = { key, kind: m[1] };
    patches.set(key, obj);
  }
  const I = game.interactions;
  I.onObject('Rake', '*', rake);
  I.onObject('Inspect', '*', inspect);
  I.onObject('Harvest', '*', harvest);
  I.onObject('Pick', '*', harvest);
  I.onObject('Cure', '*', cure);
  I.onObject('Clear', '*', clear);
  I.onObject('Check-health', '*', checkHealth);
  const seedIds = game.registry.allItems().filter((d) => getData('farming', d.id)).map((d) => d.id);
  I.onItemOnObject(seedIds, '*', plant);
  I.onItemOnObject(['compost', 'supercompost'], '*', compost);
  I.onItemOnObject(['watering_can'], '*', water);
  I.onItemOnObject(['plant_cure'], '*', cure);
  I.onItemOnObject(['rake'], '*', rake);
  I.onItemOnObject(['spade'], '*', (ctx) => (patchOf(ctx.target) && (stateOf(ctx.target).cond === 'dead' || stateOf(ctx.target).stump) ? clear(ctx) : false));
  I.onItemOnObject('*', ['compost_bin'], useOnBin);
  I.onObject('Inspect', ['compost_bin'], () => game.message('Put weeds or spare crops in here, three at a time, to make compost. Herbs and fine crops make supercompost.'));
  I.onObject('Search', ['seed_crate'], searchCrate);

  update();
  game.onTick((tick) => { if (tick % 5 === 0) update(); }, 60);
  game.events.on('load', () => game.schedule(1, update));

  api.state = (key) => { const o = patches.get(key); return o ? stateOf(o) : null; };
  api.update = update;
  api.fastForward = (minutes) => {
    const d = minutes * MIN;
    for (const st of Object.values(store().patches)) for (const k of ['weedAt', 'nextAt', 'plantedAt', 'stumpUntil']) if (st[k]) st[k] -= d;
    if (store().crateAt) store().crateAt -= d;
    update();
  };
  return api;
}

export { api as farming };
