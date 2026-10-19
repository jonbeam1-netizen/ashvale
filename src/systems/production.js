// Production skills: Smithing, Cooking, Firemaking, Crafting, Fletching, Herblore, Runebinding,
// Construction. OWNER: agent C.
//
// Core: a recipe-driven make loop (game.production.make) plus the generic item-on-item /
// item-on-station / station-option handlers. Skill specific behaviour lives in helpers:
//   production_ui.js (grids), firemaking.js, herblore.js, runebinding.js, construction.js
//
// game.production API: make, openRecipeMenu, hasInputs, canMake, maxSets, openSmithing, openJewellery,
//   openTanning, openSawmill, recipesForPair, stationOk. Event emitted: 'production:make'
//   {player, recipe, qty, success} after every action (quests may listen).

import { recipesFor, allRecipes, getItem } from '../core/registry.js';
import { SKILL_NAMES } from '../core/constants.js';
import { openGrid, materialText } from './production_ui.js';
import { SMITH_TIERS, SMITH_PIECES } from '../content/recipes_smithing.js';
import { TANNING, GEMS } from '../content/recipes_crafting.js';
import { PLANKS } from '../content/recipes_construction.js';
import { RANGES } from '../content/recipes_cooking.js';
import * as firemaking from './firemaking.js';
import * as herblore from './herblore.js';
import * as runebinding from './runebinding.js';
import * as construction from './construction.js';

let game;

// ------------------------------------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------------------------------------
const stations = (r) => (r.station == null ? [] : Array.isArray(r.station) ? r.station : [r.station]);
/** Object id a world object counts as (built homestead furniture maps to its station id). */
const KNOWN_STATIONS = new Set(['fire', 'firepit', 'cooking_range', 'homestead_range', 'homestead_firepit', 'furnace', 'anvil']);
/** Other agents' look-alike objects (a campfire with 'Cook', a forge with 'Smelt') count as the generic station. */
function aliasOf(obj) {
  const id = obj?.id, opts = obj?.def?.options || [];
  if (!id || KNOWN_STATIONS.has(id)) return null;
  if (opts.includes('Cook')) return /range|stove|oven|hearth|kitchen/.test(id) ? 'cooking_range' : 'fire';
  if (opts.includes('Smelt')) return 'furnace';
  if (opts.includes('Smith')) return 'anvil';
  return null;
}
const stationId = (obj) => obj?.def?.stationAs || aliasOf(obj) || obj?.id;
export const stationOk = (r, obj) => !r.station || stations(r).includes(stationId(obj));
const lvl = (p, skill) => p.skills.getCurrent(skill);
const nameOf = (id) => getItem(id)?.name || id;
const lower = (id) => nameOf(id).toLowerCase();
const plural = (s) => (/(s|\))$/.test(s) ? s : `${s}s`);
const ucfirst = (s) => s[0].toUpperCase() + s.slice(1);
const article = (s) => (/s$/.test(s) ? 'some' : /^[aeiou]/i.test(s) ? 'an' : 'a');

const hasInputs = (p, r, sets = 1) => r.inputs.every((i) => p.inventory.has(i.id, i.qty * sets)) && r.tools.every((t) => p.inventory.has(t)) && (!r.thread || p.inventory.has('thread'));
/** How many times the inputs allow the recipe. */
function maxSets(p, r) {
  let n = Infinity;
  for (const i of r.inputs) n = Math.min(n, Math.floor(p.inventory.count(i.id) / i.qty));
  return n === Infinity ? 0 : n;
}

/** Checks level/tools/materials; messages the player (unless silent). */
function canMake(p, r, silent = false) {
  const say = (t) => { if (!silent) game.message(t); return false; };
  if (lvl(p, r.skill) < r.level) return say(`You need ${/^[aeiou]/i.test(r.skill) ? 'an' : 'a'} ${SKILL_NAMES[r.skill]} level of ${r.level} to ${r.verb || 'make'} that.`);
  const tool = r.tools.find((t) => !p.inventory.has(t));
  if (tool) return say(`You need ${article(lower(tool))} ${lower(tool)} to do that.`);
  if (r.thread && !p.inventory.has('thread')) return say('You need some thread to sew with.');
  const missing = r.inputs.filter((i) => !p.inventory.has(i.id, i.qty));
  if (missing.length) return say(`You need ${materialText(missing).toLowerCase()} to ${r.verb || 'make'} that.`);
  return true;
}

function burnChance(p, r, station) {
  if (!r.burnStop) return 0;
  const sid = stationId(station);
  let stop = r.burnStop;
  if (RANGES.includes(sid)) stop -= sid === 'homestead_range' ? 6 : 3;
  const l = lvl(p, r.skill);
  if (l >= stop) return 0;
  const span = Math.max(1, stop - r.level);
  const base = 0.55 * Math.min(1, (stop - l) / span) + 0.05;
  return Math.min(0.75, base);
}

function successMessage(r, n, out) {
  if (r.message) return r.message;
  const name = nameOf(out.id);
  const q = out.qty * n;
  if (r.category === 'smelt') return `You retrieve a bar of ${name.replace(/ bar$/, '').toLowerCase()}.`;
  if (r.category === 'forge') return `You hammer the ${r.tier} and make ${q > 1 ? `${q} ${name.toLowerCase()}` : `${article(name.toLowerCase())} ${name.toLowerCase()}`}.`;
  if (r.category === 'gem') return `You cut the ${name.toLowerCase()}.`;
  if (r.category === 'spin') return `You spin the ${nameOf(r.inputs[0].id).toLowerCase()} into ${article(name.toLowerCase())} ${name.toLowerCase()}.`;
  if (r.category === 'potion') return `You mix the ${nameOf(r.inputs[r.inputs.length - 1].id).toLowerCase()} into your potion.`;
  if (r.category === 'kiln') return `You fire the ${name.toLowerCase()} in the oven.`;
  if (r.skill === 'cooking' && r.category === 'cook') return `You successfully ${r.verb === 'bake' ? 'bake' : 'cook'} the ${name.toLowerCase()}.`;
  if (q > 1) return `You make ${q} ${plural(name.toLowerCase())}.`;
  return `You make ${article(name.toLowerCase())} ${name.toLowerCase()}.`;
}

const ANIM = { smithing: 'smith', cooking: 'cook', fletching: 'fletch', herblore: 'herblore', crafting: 'craft', construction: 'smith', runebinding: 'craft', firemaking: 'craft' };
const TOOL = { forge: 'hammer', knife: 'knife', gem: 'chisel', leather: 'needle', grind: 'pestle_and_mortar' };

/** Thread: one reel lasts five stitches (counter persisted per player). */
function useThread(p) {
  const st = p.store('crafting');
  st.stitches = (st.stitches || 0) + 1;
  if (st.stitches >= 5) { st.stitches = 0; p.inventory.remove('thread', 1); game.message('You use up one of your reels of thread.'); }
}

/** Wine & co: converts one pending item to its result after a delay. */
function scheduleFerment(p, r) {
  const f = r.ferment;
  const from = r.outputs[0].id;
  game.schedule(f.ticks, () => {
    const inInv = p.inventory.has(from);
    const cont = inInv ? p.inventory : p.bank.has(from) ? p.bank : null;
    if (!cont) return;
    const failChance = Math.max(0, 0.5 * (f.stop - lvl(p, r.skill)) / Math.max(1, f.stop - r.level));
    const ok = Math.random() >= failChance;
    if (cont === p.inventory) { const s = p.inventory.indexOf(from); p.inventory.set(s, { id: ok ? f.ok : f.bad, qty: 1 }); } else { p.bank.remove(from, 1); p.bank.add(ok ? f.ok : f.bad, 1); }
    if (ok) { p.skills.addXp(r.skill, f.xp); if (inInv) game.message('The wine has fermented.'); } else if (inInv) game.message('The wine has turned sour.');
  });
}

/**
 * Repeatedly perform a recipe. opts: { station (WorldObject), anim, silentStart }.
 * qty = number of actions (Infinity = all). Returns the started action or null.
 */
function make(player, recipe, qty = 1, opts = {}) {
  if (!canMake(player, recipe)) return null;
  let made = 0;
  const anim = opts.anim || (recipe.category === 'smelt' ? 'cook' : ANIM[recipe.skill] || 'craft');
  const tool = TOOL[recipe.category] || (recipe.skill === 'herblore' && recipe.category === 'grind' ? 'pestle_and_mortar' : undefined);
  return game.actions.start(player, {
    name: `make:${recipe.id}`, anim, tool, delay: 1, interval: recipe.ticks,
    onStart: () => { if (opts.station) player.faceTile = { x: opts.station.x, y: opts.station.y }; },
    onTick: () => {
      if (made >= qty || !canMake(player, recipe, made > 0)) return false;
      if (opts.station && game.targetGone(opts.station)) { game.message('The fire has gone out.'); return false; }
      const n = recipe.batch ? Math.max(1, Math.min(recipe.batch, maxSets(player, recipe))) : 1;
      for (const i of recipe.inputs) player.inventory.remove(i.id, i.qty * n);
      let fail = typeof recipe.failChance === 'function' ? recipe.failChance(player) : recipe.failChance ?? 0;
      if (recipe.burnStop) fail = burnChance(player, recipe, opts.station);
      const success = Math.random() >= fail;
      if (!success) {
        if (recipe.failOutput) game.giveItem(recipe.failOutput, 1, player);
        for (const o of recipe.failExtra || []) game.giveItem(o.id, o.qty, player);
        game.message(recipe.failOutput ? `You accidentally burn the ${lower(recipe.outputs[0].id)}.` : recipe.failMessage || 'Your attempt fails.');
      } else {
        for (const o of recipe.outputs) game.giveItem(o.id, o.qty * n, player);
        player.skills.addXp(recipe.skill, recipe.xp * n);
        game.message(successMessage(recipe, n, recipe.outputs[0]));
        if (recipe.thread) useThread(player);
        if (recipe.ferment) scheduleFerment(player, recipe);
      }
      made++;
      game.events.emit('production:make', { player, recipe, qty: n, success });
      return made < qty && canMake(player, recipe, true);
    },
  });
}

/** Make-X chat menu for a list of recipes (first output icon) that starts the chosen one. */
function openRecipeMenu(player, recipes, station, title = 'What would you like to make?') {
  if (!recipes.length) { game.message("You don't have anything to use here."); return; }
  game.ui.openMakeX({
    title,
    items: recipes.map((r) => ({ id: r.outputs[0].id, label: r.label || (r.outputs[0].qty > 1 ? `${nameOf(r.outputs[0].id)} (${r.outputs[0].qty})` : undefined), data: r })),
    onSelect: (it, qty) => make(player, it.data, qty, { station }),
  });
}

/** Recipes made without a station that use both items (inputs or tools). */
function recipesForPair(a, b) {
  const uses = (r, id) => r.inputs.some((i) => i.id === id) || r.tools.includes(id);
  return allRecipes().filter((r) => !r.station && a !== b && uses(r, a) && uses(r, b));
}

// ------------------------------------------------------------------------------------------------
// interfaces
// ------------------------------------------------------------------------------------------------
function cellState(p, r) {
  if (lvl(p, r.skill) < r.level) return 'lowlvl';
  return hasInputs(p, r) ? 'ok' : 'nomat';
}

/** Anvil interface: every piece for the chosen bar (tabs for each bar type carried). */
function openSmithing(player, station, barId) {
  if (!player.inventory.has('hammer')) { game.message('You need a hammer to work the metal with.'); return; }
  const tiers = SMITH_TIERS.filter((t) => player.inventory.has(`${t.id}_bar`));
  if (!tiers.length) { game.message('You should select a metal bar to smith with.'); return; }
  const tab = barId ? barId.replace(/_bar$/, '') : tiers[tiers.length - 1].id;
  openGrid({
    game, id: 'smithing', title: 'What would you like to make?', width: 560,
    tabs: tiers.map((t) => ({ key: t.id, label: t.name, icon: `${t.id}_bar` })), tab,
    sections: (tier) => {
      const t = SMITH_TIERS.find((x) => x.id === tier);
      const entries = [];
      for (const [piece] of SMITH_PIECES) {
        const r = allRecipes().find((x) => x.category === 'forge' && x.tier === tier && x.piece === piece);
        if (!r || !getItem(r.outputs[0].id)) continue;
        const bars = r.inputs[0].qty;
        entries.push({ id: r.outputs[0].id, iconQty: r.outputs[0].qty, label: ucfirst(nameOf(r.outputs[0].id).replace(`${t.name} `, '')) +(r.outputs[0].qty > 1 ? ` (${r.outputs[0].qty})` : ''), sub: `${bars} bar${bars > 1 ? 's' : ''} · Lvl ${r.level}`, title: `${nameOf(r.outputs[0].id)}: level ${r.level}, ${r.xp} xp`, state: cellState(player, r), data: r });
      }
      const studs = tier === 'steel' && allRecipes().find((x) => x.id === 'forge_steel_studs');
      if (studs) entries.push({ id: 'steel_studs', label: 'Studs', sub: `1 bar · Lvl ${studs.level}`, state: cellState(player, studs), data: studs });
      return [{ title: `${t.name} bars in inventory: ${player.inventory.count(`${tier}_bar`)}`, entries }];
    },
    onPick: (e, qty) => { make(player, e.data, qty, { station }); },
  });
}

/** Furnace jewellery interface (needs a mould + gold/silver bar). */
function openJewellery(player, station) {
  const rs = recipesFor('crafting').filter((r) => r.category === 'jewellery');
  const sections = [];
  for (const metal of ['gold', 'silver']) {
    for (const kind of ['ring', 'necklace', 'amulet']) {
      const list = rs.filter((r) => r.metal === metal && r.kind === kind);
      if (!list.length) continue;
      sections.push({
        title: `${metal === 'gold' ? 'Gold' : 'Silver'} ${kind}s${player.inventory.has(`${kind}_mould`) ? '' : ` (needs a ${kind} mould)`}`,
        entries: list.map((r) => ({ id: r.outputs[0].id, sub: `Lvl ${r.level}${r.gem ? ` · ${nameOf(r.gem)}` : ''}`, title: `${nameOf(r.outputs[0].id)}: ${materialText(r.inputs)}, ${r.xp} xp`, state: player.inventory.has(`${kind}_mould`) ? cellState(player, r) : 'nomat', data: r })),
      });
    }
  }
  openGrid({ game, id: 'jewellery', title: 'What would you like to cast?', width: 600, sections: () => sections.filter((s) => s.entries.length), onPick: (e, qty) => { make(player, e.data, qty, { station }); } });
}

/** Tanner / tanning rack: hide -> leather for a fee per hide. */
function openTanning(player) {
  openGrid({
    game, id: 'tanning', title: 'Tanning', width: 460, note: 'Tanning costs coins per hide. Choose how many to tan.',
    sections: () => [{ entries: TANNING.filter((t) => getItem(t.hide) && getItem(t.leather)).map((t) => ({ id: t.leather, sub: `${t.fee} coin${t.fee > 1 ? 's' : ''} · ${nameOf(t.hide)}`, state: player.inventory.has(t.hide) ? 'ok' : 'nomat', data: t })) }],
    onPick: (e, qty) => {
      const t = e.data;
      const have = player.inventory.count(t.hide);
      if (!have) { game.message(`You don't have any ${lower(t.hide)} to tan.`); return true; }
      const afford = Math.floor(player.inventory.count('coins') / t.fee);
      const n = Math.min(qty, have, afford);
      if (n <= 0) { game.message("You haven't got enough coins to pay for that."); return true; }
      player.inventory.remove('coins', n * t.fee);
      for (let i = 0; i < n; i++) { const s = player.inventory.indexOf(t.hide); player.inventory.set(s, { id: t.leather, qty: 1 }); }
      game.message(`The tanner tans ${n} ${n > 1 ? 'hides' : 'hide'} for you.`);
      return true;
    },
  });
}

/** Sawmill: logs -> planks for a fee. */
function openSawmill(player) {
  openGrid({
    game, id: 'sawmill', title: 'Sawmill', width: 460, note: 'Bring logs and coins. The sawyer converts them into planks.',
    sections: () => [{ entries: PLANKS.filter((p) => getItem(p.log)).map((p) => ({ id: p.id, sub: `${p.fee} coins · ${nameOf(p.log)}`, state: player.inventory.has(p.log) ? 'ok' : 'nomat', data: p })) }],
    onPick: (e, qty) => {
      const p = e.data;
      const have = player.inventory.count(p.log);
      if (!have) { game.message(`You don't have any ${lower(p.log)}.`); return true; }
      const n = Math.min(qty, have, Math.floor(player.inventory.count('coins') / p.fee));
      if (n <= 0) { game.message("You haven't got enough coins to pay for that."); return true; }
      player.inventory.remove('coins', n * p.fee);
      for (let i = 0; i < n; i++) { const s = player.inventory.indexOf(p.log); player.inventory.set(s, { id: p.id, qty: 1 }); }
      game.message(`The sawyer turns your logs into ${n} ${n > 1 ? 'planks' : 'plank'}.`);
      return true;
    },
  });
}

/** Leather crafting grid (needle used on leather). */
function openLeather(player, leatherId) {
  const rs = recipesFor('crafting').filter((r) => r.category === 'leather' && r.tools.includes('needle'));
  const groups = new Map();
  for (const r of rs) { const k = r.inputs[0].id; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const tabs = [...groups.keys()].map((k) => ({ key: k, label: nameOf(k), icon: k }));
  openGrid({
    game, id: 'leather', title: 'What would you like to make?', width: 520, tabs, tab: groups.has(leatherId) ? leatherId : tabs[0]?.key,
    sections: (k) => [{ title: `${nameOf(k)} in inventory: ${player.inventory.count(k)}`, entries: (groups.get(k) || []).map((r) => ({ id: r.outputs[0].id, sub: `Lvl ${r.level} · ${r.inputs[0].qty} leather`, title: `${r.xp} xp`, state: cellState(player, r), data: r })) }],
    onPick: (e, qty) => { make(player, e.data, qty); },
  });
}

// ------------------------------------------------------------------------------------------------
// water
// ------------------------------------------------------------------------------------------------
export const FILLABLE = { bucket: 'bucket_of_water', jug: 'jug_of_water', bowl: 'bowl_of_water', vial: 'vial_of_water' };
const isWaterSource = (obj) => /well|fountain|pump|sink|water_trough/.test(obj?.id || '');
function fillContainers(player, itemId, target) {
  const full = FILLABLE[itemId];
  game.actions.start(player, {
    name: 'fill', anim: 'craft', delay: 0, interval: 1,
    onStart: () => { player.faceTile = { x: target.x, y: target.y }; },
    onTick: () => {
      const s = player.inventory.indexOf(itemId);
      if (s < 0) return false;
      player.inventory.set(s, { id: full, qty: 1 });
      game.message(`You fill the ${lower(itemId)} from the ${target.def.name.toLowerCase()}.`);
      return player.inventory.indexOf(itemId) >= 0;
    },
  });
}

/**
 * Our purely decorative / field objects (standing stones, crops) are placed with fixed coordinates;
 * drop any that ended up on unwalkable terrain or on top of another agent's object.
 */
const DECOR = /^(wind|mind|water|earth|fire|thorn|rift|nexus|void|aether|crimson)_stone$|^(wheat|flax_plant|grape_vine)$/;
function tidyDecor() {
  for (const o of [...game.objects.values()]) {
    if (!DECOR.test(o.id)) continue;
    const clash = !game.world.terrainAt(o.x, o.y)?.walkable || game.world.objectsAt(o.x, o.y).some((x) => x !== o && !DECOR.test(x.id));
    if (clash) game.removeObject(o);
  }
}

// ------------------------------------------------------------------------------------------------
// init
// ------------------------------------------------------------------------------------------------
export function init(g) {
  game = g;
  game.production = { make, openRecipeMenu, hasInputs, canMake, maxSets, openSmithing, openJewellery, openTanning, openSawmill, openLeather, recipesForPair, stationOk };
  const I = game.interactions;

  // ---- furnace ---------------------------------------------------------------------------------
  const smeltMenu = (player, target) => openRecipeMenu(player, recipesFor('smithing').filter((r) => r.category === 'smelt' && stationOk(r, target)).sort((a, b) => a.level - b.level), target, 'What would you like to smelt?');
  I.onObject('Smelt', '*', ({ player, target }) => {
    const mould = ['ring_mould', 'necklace_mould', 'amulet_mould'].some((m) => player.inventory.has(m));
    if (mould && (player.inventory.has('gold_bar') || player.inventory.has('silver_bar'))) {
      game.ui.startDialogue([{ title: 'What would you like to do?', options: [
        { text: 'Smelt ore into bars.', action: () => { smeltMenu(player, target); return false; } },
        { text: 'Cast jewellery.', action: () => { openJewellery(player, target); return false; } },
      ] }], { player });
      return;
    }
    smeltMenu(player, target);
  });
  // ---- anvil -----------------------------------------------------------------------------------
  I.onObject('Smith', '*', ({ player, target }) => openSmithing(player, target));
  I.onItemOnObject(SMITH_TIERS.map((t) => `${t.id}_bar`), '*', ({ player, item, target }) => { if (stationId(target) !== 'anvil') return false; openSmithing(player, target, item.id); });
  I.onItemOnObject(['gold_bar', 'silver_bar', 'ring_mould', 'necklace_mould', 'amulet_mould', ...GEMS.map((x) => x.id)], '*', ({ player, target }) => { if (stationId(target) !== 'furnace') return false; openJewellery(player, target); });

  // ---- generic station options (cook, spin, form, fire, grind) ---------------------------------
  const stationMenu = (skill, cats, title) => ({ player, target }) => {
    const rs = allRecipes().filter((r) => (!skill || r.skill === skill) && (!cats || cats.includes(r.category)) && stationOk(r, target) && r.inputs.every((i) => player.inventory.has(i.id)));
    if (!rs.length) { game.message(`You don't have anything to ${title.toLowerCase()} here.`); return; }
    if (rs.length === 1 && maxSets(player, rs[0]) === 1) { make(player, rs[0], 1, { station: target }); return; }
    openRecipeMenu(player, rs, target, `What would you like to ${title.toLowerCase()}?`);
  };
  I.onObject('Cook', '*', stationMenu('cooking', ['cook'], 'Cook'));
  I.onObject('Spin', '*', stationMenu('crafting', ['spin'], 'Spin'));
  I.onObject('Form', '*', ({ player, target }) => openRecipeMenu(player, allRecipes().filter((r) => r.category === 'pottery' && stationOk(r, target)), target, 'What would you like to shape?'));
  I.onObject('Fire', ['pottery_oven'], stationMenu('crafting', ['kiln'], 'Fire'));
  I.onObject('Grind', ['millstone'], stationMenu('cooking', ['mill'], 'Grind'));
  I.onObject('Tan', ['tanning_rack'], ({ player }) => openTanning(player));
  I.onNpc('Tan', ['tanner'], ({ player }) => openTanning(player));
  I.onNpc('Buy-plank', ['sawmill_operator'], ({ player }) => openSawmill(player));
  I.onObject('Use', ['sawmill'], ({ player }) => openSawmill(player));
  I.onItemOnNpc(TANNING.map((t) => t.hide), ['tanner'], ({ player }) => openTanning(player));
  I.onItemOnNpc(PLANKS.map((p) => p.log), ['sawmill_operator'], ({ player }) => openSawmill(player));

  // ---- picking plants --------------------------------------------------------------------------
  const PICK = { wheat: ['grain', 0.4, 'You pick some wheat.'], flax_plant: ['flax', 0.2, 'You pick some flax.'], grape_vine: ['grapes', 0.3, 'You pick a bunch of grapes.'] };
  I.onObject('Pick', Object.keys(PICK), ({ player, target }) => {
    const [id, deplete, msg] = PICK[target.id];
    if (player.inventory.capacityFor(id) <= 0) { game.message("You don't have enough inventory space."); return; }
    game.playAnim(player, 'pickup', 600);
    game.actions.lock(player, 1);
    player.inventory.add(id, 1);
    game.message(msg);
    if (Math.random() < deplete) game.depleteObject(target);
  });

  // ---- water -----------------------------------------------------------------------------------
  I.onItemOnObject(Object.keys(FILLABLE), '*', ({ player, item, target }) => {
    if (!isWaterSource(target)) return false;
    fillContainers(player, item.id, target);
  });
  I.onObject('Fill', '*', ({ player, target }) => {
    if (!isWaterSource(target)) return false;
    const id = Object.keys(FILLABLE).find((k) => player.inventory.has(k));
    if (!id) { game.message('You have nothing to fill.'); return; }
    fillContainers(player, id, target);
  });
  I.onItemOnNpc(['bucket'], ['cow'], ({ player, target }) => {
    game.playAnim(player, 'pickup', 1200);
    target.faceTarget = player;
    const s = player.inventory.indexOf('bucket');
    if (s < 0) return;
    player.inventory.set(s, { id: 'bucket_of_milk', qty: 1 });
    game.message('You milk the cow.');
  });

  // ---- raw food / ore / anything used on a matching station ----------------------------------------
  I.onItemOnObject('*', '*', ({ player, item, target }) => {
    const rs = allRecipes().filter((x) => x.station && stationOk(x, target) && x.inputs.some((i) => i.id === item.id));
    if (!rs.length) return false;
    if (rs.length === 1 && maxSets(player, rs[0]) <= 1) { make(player, rs[0], 1, { station: target }); return; }
    openRecipeMenu(player, rs, target, rs[0].skill === 'cooking' ? 'How many would you like to cook?' : 'How many would you like to make?');
  });

  // ---- item on item: knife on logs, needle on leather, herb on vial, string on bow... ------------
  I.onItemOnItem('needle', '*', ({ player, other }) => {
    if (!recipesFor('crafting').some((r) => r.category === 'leather' && r.inputs[0]?.id === other.id)) return false;
    openLeather(player, other.id);
  });
  I.onItemOnItem('*', '*', ({ player, item, other }) => {
    const rs = recipesForPair(item.id, other.id);
    if (!rs.length) return false;
    if (rs.length === 1 && maxSets(player, rs[0]) <= 1) { make(player, rs[0], 1); return; }
    if (rs.length === 1 && rs[0].batch) { make(player, rs[0], Infinity); return; }
    openRecipeMenu(player, rs.sort((a, b) => a.level - b.level), null);
  });

  tidyDecor();
  firemaking.init(game);
  herblore.init(game);
  runebinding.init(game);
  construction.init(game);
}
