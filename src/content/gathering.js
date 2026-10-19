// Gathering content: Woodcutting, Mining, Fishing (+ Hunter later). OWNER: agent B.
// Resource objects, their products and per-node skill data (registerData) live here.
//
// registerData('woodcutting', objectId, { level, xp, log, depleteChance, respawnTicks })
// registerData('mining',      objectId, { level, xp, ore, respawnTicks })
// registerData('fishing',     objectId, { [option]: { tool, bait?, catches: [{ id, level, xp }] } })
// registerData('tools',       itemId,   { skill, level, power })   // axes / pickaxes

import { registerItem, registerObject, registerData } from '../core/registry.js';

// ---- products -----------------------------------------------------------------------------------
registerItem({ id: 'logs', name: 'Logs', examine: 'A number of wooden logs.', value: 4, icon: { shape: 'log', color: '#7a5228', color2: '#d8b070' } });
registerItem({ id: 'birch_logs', name: 'Birch logs', examine: 'Pale logs with papery bark.', value: 20, icon: { shape: 'log', color: '#d8d2c4', color2: '#e8d8a8' } });
registerItem({ id: 'copper_ore', name: 'Copper ore', examine: 'This needs refining.', value: 3, icon: { shape: 'ore', color: '#c87a3a' } });
registerItem({ id: 'tin_ore', name: 'Tin ore', examine: 'This needs refining.', value: 3, icon: { shape: 'ore', color: '#c8c8c0' } });
registerItem({ id: 'iron_ore', name: 'Iron ore', examine: 'This needs refining.', value: 17, icon: { shape: 'ore', color: '#8a4a3a' } });
registerItem({ id: 'coal', name: 'Coal', examine: 'Hmm, a non-renewable energy source!', value: 45, icon: { shape: 'ore', color: '#1a1a1a', color2: '#3a3a3a' } });
registerItem({ id: 'raw_minnow', name: 'Raw minnows', examine: 'Some tiny raw fish.', value: 5, icon: { shape: 'fish', color: '#a8b8c8' } });
registerItem({ id: 'raw_perch', name: 'Raw perch', examine: 'A freshly caught perch.', value: 10, icon: { shape: 'fish', color: '#8aa060' } });

// ---- trees --------------------------------------------------------------------------------------
const tree = (id, name, variant, data, size = [1, 1]) => {
  registerObject({ id, name, examine: `A ${name.toLowerCase()}.`, options: ['Chop down'], size, depleted: `${id}_stump`, respawnTicks: data.respawnTicks, model: { template: 'tree', variant } });
  registerObject({ id: `${id}_stump`, name: 'Tree stump', examine: 'This tree has been cut down.', size, model: { template: 'stump', variant } });
  registerData('woodcutting', id, data);
};
tree('tree_normal', 'Tree', 'normal', { level: 1, xp: 25, log: 'logs', depleteChance: 1, respawnTicks: [15, 30] });
tree('tree_birch', 'Birch tree', 'birch', { level: 15, xp: 37.5, log: 'birch_logs', depleteChance: 0.125, respawnTicks: [25, 40] });
// More tree types are placed on the map already; agent B defines their logs/data:
for (const [id, name, variant, size] of [
  ['tree_weepwood', 'Weepwood tree', 'weepwood', [1, 1]], ['tree_redleaf', 'Redleaf tree', 'redleaf', [1, 1]],
  ['tree_ironbark', 'Ironbark tree', 'ironbark', [2, 2]], ['tree_starwood', 'Starwood tree', 'starwood', [2, 2]],
]) {
  registerObject({ id, name, examine: `A ${name.toLowerCase()}.`, options: ['Chop down'], size, depleted: `${id}_stump`, model: { template: 'tree', variant } });
  registerObject({ id: `${id}_stump`, name: 'Tree stump', examine: 'This tree has been cut down.', size, model: { template: 'stump', variant } });
}

// ---- rocks --------------------------------------------------------------------------------------
registerObject({ id: 'rock_depleted', name: 'Rocks', examine: 'There is no ore left in this rock.', model: { template: 'rock', depleted: true } });
const rock = (id, name, ore, color, data) => {
  registerObject({ id, name, examine: `This rock contains ${name.replace(' rocks', '').toLowerCase()}.`, options: ['Mine'], depleted: 'rock_depleted', respawnTicks: data.respawnTicks, model: { template: 'rock', ore: color } });
  registerData('mining', id, { ...data, ore });
};
rock('rock_copper', 'Copper rocks', 'copper_ore', '#d07a30', { level: 1, xp: 17.5, respawnTicks: 4 });
rock('rock_tin', 'Tin rocks', 'tin_ore', '#d8d8d0', { level: 1, xp: 17.5, respawnTicks: 4 });
rock('rock_iron', 'Iron rocks', 'iron_ore', '#7a3a2a', { level: 15, xp: 35, respawnTicks: 9 });
rock('rock_coal', 'Coal rocks', 'coal', '#151515', { level: 30, xp: 50, respawnTicks: 50 });

// ---- fishing spots --------------------------------------------------------------------------------
registerObject({ id: 'fishing_spot_net', name: 'Fishing spot', examine: 'I can see fish swimming in the water.', options: ['Net'], blocks: false, model: { template: 'fishing_spot' } });
registerObject({ id: 'fishing_spot_bait', name: 'Fishing spot', examine: 'Fish are biting here.', options: ['Net'], blocks: false, model: { template: 'fishing_spot' } });
registerData('fishing', 'fishing_spot_net', { Net: { tool: 'small_net', catches: [{ id: 'raw_minnow', level: 1, xp: 10 }] } });
registerData('fishing', 'fishing_spot_bait', { Net: { tool: 'small_net', catches: [{ id: 'raw_minnow', level: 1, xp: 10 }, { id: 'raw_perch', level: 10, xp: 25 }] } });

// ---- tools --------------------------------------------------------------------------------------
registerData('tools', 'bronze_axe', { skill: 'woodcutting', level: 1, power: 1 });
registerData('tools', 'iron_axe', { skill: 'woodcutting', level: 1, power: 1.3 });
registerData('tools', 'bronze_pickaxe', { skill: 'mining', level: 1, power: 1 });
registerData('tools', 'iron_pickaxe', { skill: 'mining', level: 1, power: 1.3 });
