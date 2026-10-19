// Cooking content: cooked + burnt fish/meat, ingredients and multi-step dishes. OWNER: agent C.
//
// Raw fish/meat are registered by agents B (fishing/hunter) and D (drops). Every `raw_*` item that
// exists when this module is imported gets a cooking recipe: explicit stats from FOOD below, or
// stats derived from the fishing data (catch level) / item value for anything new.

import { getItem, allItems, allData, getData } from '../core/registry.js';
import { ensureItem, item, recipe, clamp } from './recipes_util.js';

export const FIRES = ['fire', 'firepit', 'cooking_range', 'homestead_range', 'homestead_firepit'];
export const RANGES = ['cooking_range', 'homestead_range'];

// raw id -> [cooked id, cooked name, level, xp, heal, burnStop]
const FOOD = {
  raw_minnow: ['cooked_minnow', 'Minnows', 1, 30, 3, 34],
  raw_perch: ['cooked_perch', 'Perch', 5, 50, 5, 38],
  raw_beef: ['cooked_meat', 'Cooked meat', 1, 30, 3, 31],
  raw_chicken: ['cooked_chicken', 'Cooked chicken', 1, 30, 3, 31],
  raw_rat_meat: ['cooked_rat_meat', 'Cooked rat meat', 1, 30, 3, 31],
  raw_bird_meat: ['cooked_bird_meat', 'Cooked bird meat', 1, 30, 3, 30],
  raw_rabbit: ['cooked_rabbit', 'Cooked rabbit', 1, 30, 5, 32],
  raw_venison: ['cooked_venison', 'Cooked venison', 15, 70, 8, 45],
  raw_boar_meat: ['cooked_boar_meat', 'Cooked boar meat', 20, 80, 9, 50],
};

/** Catch level for each raw fish from the fishing data (agent B). */
function fishLevels() {
  const out = {};
  for (const [, spot] of allData('fishing')) {
    for (const opt of Object.values(spot || {})) for (const c of opt?.catches || []) out[c.id] = Math.min(out[c.id] ?? 99, c.level ?? 1);
  }
  return out;
}

function cookable(raw, cookedId, name, level, xp, heal, burnStop) {
  const rawDef = getItem(raw);
  const shape = rawDef?.icon?.shape === 'meat' ? 'meat' : 'fish';
  const baseCol = rawDef?.icon?.color || '#a07030';
  const cooked = ensureItem({
    id: cookedId, name, examine: shape === 'fish' ? `A nicely cooked ${name.toLowerCase()}.` : 'Mmm, this looks tasty.',
    value: Math.max(2, Math.round((rawDef?.value || 4) * 1.3)), heal,
    icon: { shape, color: shape === 'fish' ? mixBrown(baseCol) : '#7a4a2a' },
  });
  const burntId = `burnt_${cookedId.replace(/^cooked_/, '')}`;
  ensureItem({ id: burntId, name: `Burnt ${name.toLowerCase().replace(/^cooked /, '')}`, examine: 'Oops! Charred beyond eating.', value: 1, icon: { shape, color: '#2a2420' } });
  recipe({
    id: `cook_${raw.replace(/^raw_/, '')}`, skill: 'cooking', category: 'cook', level, xp, station: FIRES, ticks: 4,
    inputs: [{ id: raw, qty: 1 }], outputs: [{ id: cooked.id, qty: 1 }], burnStop, failOutput: burntId, verb: 'cook',
  });
}

function mixBrown(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * 0.55 + 0xa0 * 0.45, g = ((n >> 8) & 255) * 0.55 + 0x6a * 0.45, b = (n & 255) * 0.55 + 0x30 * 0.45;
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

const levels = fishLevels();
const handled = new Set();
for (const [raw, [cooked, name, lvl, xp, heal, stop]] of Object.entries(FOOD)) {
  if (!getItem(raw)) continue;
  cookable(raw, cooked, name, levels[raw] ?? lvl, xp, heal, stop);
  handled.add(raw);
}
// Anything raw_* we don't know yet (new fish / hunter meat): derive stats.
for (const def of allItems()) {
  if (!/^raw_/.test(def.id) || handled.has(def.id)) continue;
  const shape = def.icon?.shape;
  if (shape !== 'fish' && shape !== 'meat') continue;
  const base = def.id.replace(/^raw_/, '');
  const lvl = clamp(levels[def.id] ?? Math.round(Math.sqrt(def.value || 1) * 4), 1, 95);
  const name = def.name.replace(/^Raw /i, '');
  const cookedName = shape === 'meat' ? `Cooked ${name.toLowerCase()}` : name[0].toUpperCase() + name.slice(1);
  cookable(def.id, `cooked_${base}`, cookedName, lvl, Math.round(30 + lvl * 2.4), getData('fish', def.id)?.suggestedHeal ?? clamp(3 + Math.floor(lvl / 5), 3, 23), Math.min(99, lvl + 32));
}

// ---- ingredients & containers ---------------------------------------------------------------------
ensureItem({ id: 'pot', name: 'Pot', examine: 'This pot is empty.', value: 1, icon: { shape: 'pot', color: '#8a5a3a' } });
ensureItem({ id: 'pot_of_flour', name: 'Pot of flour', examine: 'There is flour in this pot.', value: 14, icon: { shape: 'pot', color: '#8a5a3a', color2: '#f4f0e8' } });
ensureItem({ id: 'bucket', name: 'Bucket', examine: "It's an empty bucket.", value: 2, icon: { shape: 'bucket', color: '#8a8a8a' } });
ensureItem({ id: 'bucket_of_water', name: 'Bucket of water', examine: "It's a bucket of water.", value: 6, icon: { shape: 'bucket', color: '#8a8a8a', color2: '#3a7ac8' } });
ensureItem({ id: 'bucket_of_milk', name: 'Bucket of milk', examine: "It's a bucket of milk.", value: 6, icon: { shape: 'bucket', color: '#8a8a8a', color2: '#f8f8f0' } });
ensureItem({ id: 'jug', name: 'Jug', examine: 'An empty jug.', value: 1, icon: { shape: 'jug', color: '#b0a090' } });
ensureItem({ id: 'jug_of_water', name: 'Jug of water', examine: 'A jug full of fresh water.', value: 2, icon: { shape: 'jug', color: '#b0a090', color2: '#3a7ac8' } });
ensureItem({ id: 'bowl', name: 'Bowl', examine: 'A plain clay bowl.', value: 4, icon: { shape: 'bowl', color: '#a8643a' } });
ensureItem({ id: 'bowl_of_water', name: 'Bowl of water', examine: 'A bowl of water.', value: 5, icon: { shape: 'bowl', color: '#a8643a', color2: '#3a7ac8' } });
ensureItem({ id: 'pie_dish', name: 'Pie dish', examine: 'Deep and round, perfect for pies.', value: 3, icon: { shape: 'tin', color: '#a8643a' } });
ensureItem({ id: 'cake_tin', name: 'Cake tin', examine: 'Useful for baking cakes.', value: 10, icon: { shape: 'tin', color: '#9a9aa2' } });
ensureItem({ id: 'grain', name: 'Grain', examine: 'Wheat, ready to be milled.', value: 2, icon: { shape: 'wheat', color: '#d8b850' } });
ensureItem({ id: 'egg', name: 'Egg', examine: 'A nice fresh egg.', value: 4, icon: { shape: 'egg', color: '#f0e8d8' } });
ensureItem({ id: 'grapes', name: 'Grapes', examine: 'Good grapes for wine making.', value: 2, icon: { shape: 'seed', color: '#6a2a8a' } });
ensureItem({ id: 'bread', name: 'Bread', examine: 'Nice crusty bread.', value: 12, heal: 5, icon: { shape: 'bread', color: '#c8904a' } });

item({ id: 'bread_dough', name: 'Bread dough', examine: 'Some uncooked dough.', value: 2, icon: { shape: 'bread', color: '#f0e0c0' } });
item({ id: 'pastry_dough', name: 'Pastry dough', examine: 'Some pastry dough.', value: 2, icon: { shape: 'lump', color: '#f0e0c0' } });
item({ id: 'pie_shell', name: 'Pie shell', examine: "I need to find a filling for this pie.", value: 4, icon: { shape: 'pie', color: '#e8d0a0', color2: '#e8d0a0' } });
item({ id: 'burnt_bread', name: 'Burnt bread', examine: 'Rock hard and black.', value: 1, icon: { shape: 'bread', color: '#2a2420' } });
item({ id: 'burnt_pie', name: 'Burnt pie', examine: 'Oops.', value: 1, icon: { shape: 'pie', color: '#2a2420', color2: '#1a1410' } });
item({ id: 'burnt_stew', name: 'Burnt stew', examine: 'Smells awful.', value: 1, icon: { shape: 'bowl', color: '#a8643a', color2: '#2a2420' } });
item({ id: 'burnt_cake', name: 'Burnt cake', examine: 'Argh, what a mess!', value: 1, icon: { shape: 'cake', color: '#2a2420' } });

// ---- doughs ----------------------------------------------------------------------------------------
for (const [water, empty] of [['bucket_of_water', 'bucket'], ['jug_of_water', 'jug'], ['bowl_of_water', 'bowl']]) {
  recipe({ id: `bread_dough_${water}`, skill: 'cooking', category: 'prep', level: 1, xp: 1, ticks: 2, inputs: [{ id: 'pot_of_flour', qty: 1 }, { id: water, qty: 1 }], outputs: [{ id: 'bread_dough', qty: 1 }, { id: 'pot', qty: 1 }, { id: empty, qty: 1 }], verb: 'mix' });
  recipe({ id: `pastry_dough_${water}`, skill: 'cooking', category: 'prep', level: 1, xp: 1, ticks: 2, inputs: [{ id: 'pot_of_flour', qty: 1 }, { id: water, qty: 1 }], outputs: [{ id: 'pastry_dough', qty: 1 }, { id: 'pot', qty: 1 }, { id: empty, qty: 1 }], verb: 'mix' });
}
recipe({ id: 'cook_bread', skill: 'cooking', category: 'cook', level: 1, xp: 40, station: FIRES, ticks: 4, inputs: [{ id: 'bread_dough', qty: 1 }], outputs: [{ id: 'bread', qty: 1 }], burnStop: 35, failOutput: 'burnt_bread', verb: 'bake' });
recipe({ id: 'pie_shell', skill: 'cooking', category: 'prep', level: 1, xp: 0, ticks: 2, inputs: [{ id: 'pastry_dough', qty: 1 }, { id: 'pie_dish', qty: 1 }], outputs: [{ id: 'pie_shell', qty: 1 }], verb: 'line' });

// ---- pies (two bites each) ---------------------------------------------------------------------------
const PIES = [
  // id, name, filling, level, xp, heal per bite, burnStop, colour
  ['berry_pie', 'Berry pie', 'rubyberry', 10, 78, 5, 44, '#8a1a3a'],
  ['meat_pie', 'Meat pie', 'cooked_meat', 20, 110, 6, 54, '#7a4a2a'],
  ['fish_pie', 'Fish pie', 'cooked_perch', 34, 164, 8, 64, '#c8a060'],
];
for (const [id, name, filling, level, xp, heal, stop, col] of PIES) {
  item({ id: `uncooked_${id}`, name: `Uncooked ${name.toLowerCase()}`, examine: 'This needs baking.', value: 10, icon: { shape: 'pie', color: '#e8d0a0', color2: col } });
  item({ id: `half_${id}`, name: `Half a ${name.toLowerCase()}`, examine: 'Half of it is gone already.', value: 15, heal, eatReplace: 'pie_dish', icon: { shape: 'pie', color: '#d0a060', color2: col } });
  item({ id, name, examine: 'Freshly baked.', value: 30, heal, eatReplace: `half_${id}`, icon: { shape: 'pie', color: '#d0a060', color2: col } });
  recipe({ id: `fill_${id}`, skill: 'cooking', category: 'prep', level, xp: 0, ticks: 2, inputs: [{ id: 'pie_shell', qty: 1 }, { id: filling, qty: 1 }], outputs: [{ id: `uncooked_${id}`, qty: 1 }], verb: 'fill' });
  recipe({ id: `cook_${id}`, skill: 'cooking', category: 'cook', level, xp, station: RANGES, ticks: 4, inputs: [{ id: `uncooked_${id}`, qty: 1 }], outputs: [{ id, qty: 1 }], burnStop: stop, failOutput: 'burnt_pie', verb: 'bake' });
}

// ---- stew ---------------------------------------------------------------------------------------------
item({ id: 'meaty_broth', name: 'Meaty broth', examine: 'It needs some vegetables.', value: 8, icon: { shape: 'bowl', color: '#a8643a', color2: '#8a5a3a' } });
item({ id: 'uncooked_stew', name: 'Uncooked stew', examine: 'I need to cook this.', value: 10, icon: { shape: 'bowl', color: '#a8643a', color2: '#b08850' } });
item({ id: 'stew', name: 'Stew', examine: 'A hearty bowl of stew.', value: 20, heal: 11, eatReplace: 'bowl', icon: { shape: 'bowl', color: '#a8643a', color2: '#9a5a2a' } });
recipe({ id: 'meaty_broth', skill: 'cooking', category: 'prep', level: 25, xp: 0, ticks: 2, inputs: [{ id: 'bowl_of_water', qty: 1 }, { id: 'cooked_meat', qty: 1 }], outputs: [{ id: 'meaty_broth', qty: 1 }], verb: 'add' });
recipe({ id: 'uncooked_stew', skill: 'cooking', category: 'prep', level: 25, xp: 0, ticks: 2, inputs: [{ id: 'meaty_broth', qty: 1 }, { id: 'fieldroot', qty: 1 }], outputs: [{ id: 'uncooked_stew', qty: 1 }], verb: 'add' });
recipe({ id: 'cook_stew', skill: 'cooking', category: 'cook', level: 25, xp: 117, station: FIRES, ticks: 4, inputs: [{ id: 'uncooked_stew', qty: 1 }], outputs: [{ id: 'stew', qty: 1 }], burnStop: 58, failOutput: 'burnt_stew', verb: 'cook' });

// ---- cake (three slices) ----------------------------------------------------------------------------
item({ id: 'uncooked_cake', name: 'Uncooked cake', examine: 'Now all I need to do is cook it.', value: 20, icon: { shape: 'tin', color: '#9a9aa2' } });
item({ id: 'slice_of_cake', name: 'Slice of cake', examine: 'The last bit of a tasty cake.', value: 15, heal: 4, icon: { shape: 'cake', color: '#e8d8b0' } });
item({ id: 'two_thirds_cake', name: '2/3 cake', examine: 'Someone has eaten a slice.', value: 30, heal: 4, eatReplace: 'slice_of_cake', icon: { shape: 'cake', color: '#e8d8b0' } });
item({ id: 'cake', name: 'Cake', examine: 'A plain sponge cake.', value: 50, heal: 4, eatReplace: 'two_thirds_cake', icon: { shape: 'cake', color: '#f0dca8' } });
recipe({
  id: 'uncooked_cake', skill: 'cooking', category: 'prep', level: 40, xp: 0, ticks: 2,
  inputs: [{ id: 'cake_tin', qty: 1 }, { id: 'pot_of_flour', qty: 1 }, { id: 'egg', qty: 1 }, { id: 'bucket_of_milk', qty: 1 }],
  outputs: [{ id: 'uncooked_cake', qty: 1 }, { id: 'pot', qty: 1 }, { id: 'bucket', qty: 1 }], verb: 'mix',
});
recipe({ id: 'cook_cake', skill: 'cooking', category: 'cook', level: 40, xp: 180, station: RANGES, ticks: 4, inputs: [{ id: 'uncooked_cake', qty: 1 }], outputs: [{ id: 'cake', qty: 1 }, { id: 'cake_tin', qty: 1 }], burnStop: 74, failOutput: 'burnt_cake', failExtra: [{ id: 'cake_tin', qty: 1 }], verb: 'bake' });

// ---- wine (ferments over time) ----------------------------------------------------------------------
item({ id: 'unfermented_wine', name: 'Unfermented wine', examine: 'It needs time to ferment.', value: 2, icon: { shape: 'jug', color: '#b0a090', color2: '#8a4a9a' } });
item({ id: 'jug_of_wine', name: 'Jug of wine', examine: 'It smells rich and fruity.', value: 25, drinkHeal: 11, options: ['Drink'], icon: { shape: 'jug', color: '#b0a090', color2: '#6a1a3a' } });
item({ id: 'jug_of_bad_wine', name: 'Jug of bad wine', examine: 'Vinegar, really.', value: 1, icon: { shape: 'jug', color: '#b0a090', color2: '#4a4a2a' } });
recipe({ id: 'unfermented_wine', skill: 'cooking', category: 'prep', level: 35, xp: 0, ticks: 2, inputs: [{ id: 'jug_of_water', qty: 1 }, { id: 'grapes', qty: 1 }], outputs: [{ id: 'unfermented_wine', qty: 1 }], ferment: { ticks: 20, xp: 200, ok: 'jug_of_wine', bad: 'jug_of_bad_wine', stop: 68 }, verb: 'squeeze' });

// ---- milling ----------------------------------------------------------------------------------------
recipe({ id: 'mill_flour', skill: 'cooking', category: 'mill', level: 1, xp: 0, station: 'millstone', ticks: 3, inputs: [{ id: 'grain', qty: 1 }, { id: 'pot', qty: 1 }], outputs: [{ id: 'pot_of_flour', qty: 1 }], verb: 'grind', message: 'You grind the grain into flour and fill the pot.' });
