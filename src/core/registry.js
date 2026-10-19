// Content registry. Content modules call register* at import time; the engine and
// systems look definitions up by id. See ARCHITECTURE.md for every schema.

import { BONUS_KEYS, emptyBonuses } from './constants.js';

const stores = {
  item: new Map(),
  npc: new Map(),
  object: new Map(),
  recipe: new Map(),
  shop: new Map(),
  spell: new Map(),
  prayer: new Map(),
  quest: new Map(),
  dialogue: new Map(),
  dropTable: new Map(),
  weaponType: new Map(),
  area: new Map(),
};
const dataStores = new Map(); // namespace -> Map
const paintOps = [];
const spawns = [];
let mapConfig = {
  width: 192, height: 192,
  spawn: { x: 96, y: 150 },        // new-character spawn tile
  respawn: { x: 96, y: 150 },      // default death respawn tile
  wildernessEdgeY: 48,             // rows y < edge are Wilderness; level = edge - y
  waterLevel: 0,
  baseTerrain: 'grass',
  seed: 1337,
};

function put(kind, def) {
  if (!def || typeof def.id !== 'string') throw new Error(`register ${kind}: def.id (string) required`);
  const store = stores[kind];
  if (store.has(def.id)) console.warn(`[registry] duplicate ${kind} id "${def.id}" - later definition wins`);
  store.set(def.id, def);
  return def;
}

function normBonuses(b) {
  const out = emptyBonuses();
  if (b) for (const k of Object.keys(b)) {
    if (!BONUS_KEYS.includes(k)) console.warn(`[registry] unknown bonus key "${k}"`);
    out[k] = b[k];
  }
  return out;
}

// ---------------------------------------------------------------- items
export function registerItem(def) {
  const d = {
    examine: `It's ${/^[aeiou]/i.test(def.name || '') ? 'an' : 'a'} ${(def.name || def.id).toLowerCase()}.`,
    stackable: false,
    value: 1,
    tradeable: true,
    options: [],
    ...def,
  };
  if (d.slot) {
    d.bonuses = normBonuses(d.bonuses);
    d.requirements = d.requirements || {};
    if (d.slot === 'weapon') {
      d.attackSpeed = d.attackSpeed ?? 4;
      d.weaponType = d.weaponType || 'unarmed';
    }
    if (!d.options.length) d.options = [d.slot === 'weapon' || d.slot === 'shield' ? 'Wield' : 'Wear'];
  }
  if (d.heal != null && !d.options.includes('Eat')) d.options = ['Eat', ...d.options];
  d.icon = { shape: 'generic', color: d.color || '#999999', ...(d.icon || {}) };
  return put('item', d);
}
export const getItem = (id) => stores.item.get(id);
export const allItems = () => [...stores.item.values()];

// ---------------------------------------------------------------- npcs
export function registerNpc(def) {
  const stats = { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10, ...(def.stats || {}) };
  const d = {
    examine: `It's a ${(def.name || def.id).toLowerCase()}.`,
    combatLevel: 0,
    attackSpeed: 4,
    maxHit: 1,
    attackStyle: 'crush',
    attackRange: 1,
    aggressive: false,
    aggroRange: 3,
    wanderRadius: 3,
    respawnTicks: 50,
    size: 1,
    options: [],
    ...def,
    stats,
  };
  d.bonuses = normBonuses(def.bonuses);
  d.model = { template: 'human', colors: {}, scale: 1, ...(def.model || {}) };
  return put('npc', d);
}
export const getNpc = (id) => stores.npc.get(id);
export const allNpcs = () => [...stores.npc.values()];

// ---------------------------------------------------------------- objects (scenery)
export function registerObject(def) {
  const d = {
    examine: `It's a ${(def.name || def.id).toLowerCase()}.`,
    size: [1, 1],
    blocks: true,
    options: [],
    ...def,
  };
  d.model = { template: 'crate', ...(def.model || {}) };
  return put('object', d);
}
export const getObject = (id) => stores.object.get(id);
export const allObjects = () => [...stores.object.values()];

// ---------------------------------------------------------------- recipes
export function registerRecipe(def) {
  return put('recipe', { inputs: [], outputs: [], tools: [], ticks: 3, xp: 0, level: 1, ...def });
}
export const getRecipe = (id) => stores.recipe.get(id);
export const allRecipes = () => [...stores.recipe.values()];
export const recipesFor = (skill) => allRecipes().filter((r) => r.skill === skill);

// ---------------------------------------------------------------- shops
export function registerShop(def) {
  return put('shop', { currency: 'coins', sellRate: 1.0, buyRate: 0.4, general: false, restockTicks: 20, stock: [], ...def });
}
export const getShop = (id) => stores.shop.get(id);
export const allShops = () => [...stores.shop.values()];

// ---------------------------------------------------------------- magic / prayer / quests
export function registerSpell(def) {
  return put('spell', { book: 'standard', level: 1, xp: 0, runes: {}, type: 'utility', targets: [], ...def });
}
export const getSpell = (id) => stores.spell.get(id);
export const allSpells = () => [...stores.spell.values()];

export function registerPrayer(def) {
  return put('prayer', { level: 1, drain: 1, group: null, effects: {}, ...def });
}
export const getPrayer = (id) => stores.prayer.get(id);
export const allPrayers = () => [...stores.prayer.values()];

export function registerQuest(def) {
  return put('quest', { difficulty: 'Novice', questPoints: 1, completeStage: 100, ...def });
}
export const getQuest = (id) => stores.quest.get(id);
export const allQuests = () => [...stores.quest.values()];

// ---------------------------------------------------------------- dialogue
/** nodes: array of dialogue nodes, or (ctx) => array. See ARCHITECTURE.md "Dialogue". */
export function registerDialogue(id, nodes) {
  return put('dialogue', { id, nodes });
}
export const getDialogue = (id) => stores.dialogue.get(id);

// ---------------------------------------------------------------- drops
export function registerDropTable(def) {
  return put('dropTable', { always: [], main: [], rolls: 1, tertiary: [], ...def });
}
export const getDropTable = (id) => stores.dropTable.get(id);

// ---------------------------------------------------------------- weapon types (attack styles)
export function registerWeaponType(def) {
  return put('weaponType', def);
}
export const getWeaponType = (id) => stores.weaponType.get(id) || stores.weaponType.get('unarmed');

// ---------------------------------------------------------------- map / world
export function setMapConfig(cfg) { mapConfig = { ...mapConfig, ...cfg }; }
export const getMapConfig = () => mapConfig;

/** Named area: {id, name, x0,y0,x1,y1 (inclusive), priority?, safe?, multi?, dungeon?, color?} */
export function registerArea(def) {
  return put('area', { priority: 0, ...def });
}
export const allAreas = () => [...stores.area.values()];

/** Terrain paint operation; applied in registration order. */
export function registerPaint(op) { paintOps.push(op); return op; }
export const getPaintOps = () => paintOps;

/** Spawn rule (object/npc/item/scatter/building/fence/line); resolved in order after painting. */
export function registerSpawn(rule) { spawns.push(rule); return rule; }
export const getSpawns = () => spawns;

// ---------------------------------------------------------------- generic namespaced data
/** For anything without a dedicated registry, e.g. registerData('woodcutting', 'tree', {...}). */
export function registerData(ns, id, value) {
  if (!dataStores.has(ns)) dataStores.set(ns, new Map());
  const m = dataStores.get(ns);
  if (m.has(id)) console.warn(`[registry] duplicate data ${ns}:${id}`);
  m.set(id, value);
  return value;
}
export const getData = (ns, id) => dataStores.get(ns)?.get(id);
export const allData = (ns) => [...(dataStores.get(ns)?.entries() || [])];

export const registry = {
  registerItem, getItem, allItems, registerNpc, getNpc, allNpcs, registerObject, getObject, allObjects,
  registerRecipe, getRecipe, allRecipes, recipesFor, registerShop, getShop, allShops,
  registerSpell, getSpell, allSpells, registerPrayer, getPrayer, allPrayers, registerQuest, getQuest, allQuests,
  registerDialogue, getDialogue, registerDropTable, getDropTable, registerWeaponType, getWeaponType,
  setMapConfig, getMapConfig, registerArea, allAreas, registerPaint, getPaintOps, registerSpawn, getSpawns,
  registerData, getData, allData,
};
export default registry;
