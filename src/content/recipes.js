// Production recipes: Smithing (smelt + forge), Cooking, Crafting, Fletching, Herblore, Firemaking.
// OWNER: agent C.
//
// registerRecipe({ id, skill, level, xp, inputs:[{id,qty}], outputs:[{id,qty}], tools:[itemId],
//                  station: objectId | [objectIds] | null, ticks, category, failChance?, failOutput? })

import { registerItem, registerRecipe, registerData, registerObject } from '../core/registry.js';
import { METAL_TIERS } from '../core/constants.js';

const bronze = METAL_TIERS[0].color, iron = METAL_TIERS[1].color;

registerItem({ id: 'bronze_bar', name: 'Bronze bar', examine: "It's a bar of bronze.", value: 8, icon: { shape: 'bar', color: bronze } });
registerItem({ id: 'iron_bar', name: 'Iron bar', examine: "It's a bar of iron.", value: 28, icon: { shape: 'bar', color: iron } });
registerItem({ id: 'cooked_minnow', name: 'Minnows', examine: 'Some nicely cooked minnows.', value: 6, heal: 3, icon: { shape: 'fish', color: '#c08a4a' } });
registerItem({ id: 'cooked_perch', name: 'Perch', examine: 'A nicely cooked perch.', value: 14, heal: 5, icon: { shape: 'fish', color: '#a07030' } });
registerItem({ id: 'burnt_fish', name: 'Burnt fish', examine: 'Oops!', value: 1, icon: { shape: 'fish', color: '#2a2420' } });
registerItem({ id: 'burnt_meat', name: 'Burnt meat', examine: 'Oops!', value: 1, icon: { shape: 'meat', color: '#2a2420' } });

const RANGES = ['cooking_range', 'fire'];

// smelting
registerRecipe({ id: 'smelt_bronze', skill: 'smithing', category: 'smelt', level: 1, xp: 6.2, station: 'furnace', ticks: 4, inputs: [{ id: 'copper_ore', qty: 1 }, { id: 'tin_ore', qty: 1 }], outputs: [{ id: 'bronze_bar', qty: 1 }] });
registerRecipe({ id: 'smelt_iron', skill: 'smithing', category: 'smelt', level: 15, xp: 12.5, station: 'furnace', ticks: 4, inputs: [{ id: 'iron_ore', qty: 1 }], outputs: [{ id: 'iron_bar', qty: 1 }], failChance: 0.5 });
// forging
registerRecipe({ id: 'forge_bronze_dagger', skill: 'smithing', category: 'forge', level: 1, xp: 12.5, station: 'anvil', tools: ['hammer'], ticks: 4, inputs: [{ id: 'bronze_bar', qty: 1 }], outputs: [{ id: 'bronze_dagger', qty: 1 }] });
registerRecipe({ id: 'forge_bronze_med_helm', skill: 'smithing', category: 'forge', level: 3, xp: 12.5, station: 'anvil', tools: ['hammer'], ticks: 4, inputs: [{ id: 'bronze_bar', qty: 1 }], outputs: [{ id: 'bronze_med_helm', qty: 1 }] });
// cooking
registerRecipe({ id: 'cook_minnow', skill: 'cooking', level: 1, xp: 30, station: RANGES, ticks: 4, inputs: [{ id: 'raw_minnow', qty: 1 }], outputs: [{ id: 'cooked_minnow', qty: 1 }], burnStop: 34, failOutput: 'burnt_fish' });
registerRecipe({ id: 'cook_perch', skill: 'cooking', level: 10, xp: 50, station: RANGES, ticks: 4, inputs: [{ id: 'raw_perch', qty: 1 }], outputs: [{ id: 'cooked_perch', qty: 1 }], burnStop: 40, failOutput: 'burnt_fish' });
registerRecipe({ id: 'cook_beef', skill: 'cooking', level: 1, xp: 30, station: RANGES, ticks: 4, inputs: [{ id: 'raw_beef', qty: 1 }], outputs: [{ id: 'cooked_meat', qty: 1 }], burnStop: 31, failOutput: 'burnt_meat' });
registerRecipe({ id: 'cook_chicken', skill: 'cooking', level: 1, xp: 30, station: RANGES, ticks: 4, inputs: [{ id: 'raw_chicken', qty: 1 }], outputs: [{ id: 'cooked_chicken', qty: 1 }], burnStop: 31, failOutput: 'burnt_meat' });

// firemaking (tinderbox on logs) - creates a temporary 'fire' object that can be cooked on
registerObject({ id: 'fire', name: 'Fire', examine: 'A hot fire.', options: ['Cook'], model: { template: 'fire' } });
registerData('firemaking', 'logs', { level: 1, xp: 40, burnTicks: [60, 100] });
registerData('firemaking', 'birch_logs', { level: 15, xp: 60, burnTicks: [60, 100] });
