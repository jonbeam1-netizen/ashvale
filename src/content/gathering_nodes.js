// Resource nodes: trees, rocks, essence, fishing spots and their skill data. OWNER: agent B.
//
// registerData('woodcutting', objectId, { level, xp, log, chance: [lo, hi], life, respawnTicks })
//   chance = success out of 256 at level 1 / 99 with a bronze axe (scaled by axe power), rolled every 4 ticks.
//   life   = ticks of chopping before the tree falls (0/undefined = falls after one log, like a normal tree).
// registerData('mining', objectId, { level, xp, ore, chance: [lo, hi], respawnTicks, infinite?, gems? })
// registerData('fishing', objectId, { [option]: { tool, bait?, verb, catches: [{ id, level, xp, chance: [lo, hi] }] } })

import { registerObject, registerData } from '../core/registry.js';

// =================================================================================================
// Trees
// =================================================================================================
export const TREES = [
  { id: 'tree_normal', name: 'Tree', variant: 'normal', size: [1, 1], level: 1, xp: 25, log: 'logs', chance: [64, 200], life: 0, respawnTicks: [15, 30], examine: 'A commonly found tree.' },
  { id: 'tree_birch', name: 'Birch tree', variant: 'birch', size: [1, 1], level: 15, xp: 37.5, log: 'birch_logs', chance: [32, 100], life: 70, respawnTicks: [20, 35], examine: 'A slender tree with pale, peeling bark.' },
  { id: 'tree_weepwood', name: 'Weepwood tree', variant: 'weepwood', size: [1, 1], level: 30, xp: 67.5, log: 'weepwood_logs', chance: [24, 80], life: 80, respawnTicks: [20, 35], examine: 'Its long branches trail sadly toward the water.' },
  { id: 'tree_redleaf', name: 'Redleaf tree', variant: 'redleaf', size: [1, 1], level: 45, xp: 100, log: 'redleaf_logs', chance: [16, 50], life: 160, respawnTicks: [60, 90], examine: 'Its leaves are the colour of embers.' },
  { id: 'tree_ironbark', name: 'Ironbark tree', variant: 'ironbark', size: [2, 2], level: 60, xp: 175, log: 'ironbark_logs', chance: [8, 26], life: 300, respawnTicks: [100, 140], examine: 'Old, dark and impossibly hard.' },
  { id: 'tree_starwood', name: 'Starwood tree', variant: 'starwood', size: [2, 2], level: 75, xp: 250, log: 'starwood_logs', chance: [4, 13], life: 600, respawnTicks: [200, 260], examine: 'The leaves shimmer with a light of their own.' },
];
for (const t of TREES) {
  registerObject({ id: t.id, name: t.name, examine: t.examine, options: ['Chop down'], size: t.size, depleted: `${t.id}_stump`, respawnTicks: t.respawnTicks, model: { template: 'tree', variant: t.variant } });
  registerObject({ id: `${t.id}_stump`, name: 'Tree stump', examine: 'This tree has been cut down.', size: t.size, model: { template: 'stump', variant: t.variant } });
  registerData('woodcutting', t.id, { level: t.level, xp: t.xp, log: t.log, chance: t.chance, life: t.life, respawnTicks: t.respawnTicks });
}

// =================================================================================================
// Rocks
// =================================================================================================
registerObject({ id: 'rock_depleted', name: 'Rocks', examine: 'There is no ore left in this rock.', model: { template: 'rock', depleted: true } });
export const ROCKS = [
  { id: 'rock_clay', name: 'Clay rocks', ore: 'clay', color: '#c8a878', level: 1, xp: 5, chance: [128, 300], respawnTicks: 2 },
  { id: 'rock_copper', name: 'Copper rocks', ore: 'copper_ore', color: '#d07a30', level: 1, xp: 17.5, chance: [100, 300], respawnTicks: 4 },
  { id: 'rock_tin', name: 'Tin rocks', ore: 'tin_ore', color: '#d8d8d0', level: 1, xp: 17.5, chance: [100, 300], respawnTicks: 4 },
  { id: 'rock_iron', name: 'Iron rocks', ore: 'iron_ore', color: '#7a3a2a', level: 15, xp: 35, chance: [96, 300], respawnTicks: 9 },
  { id: 'rock_silver', name: 'Silver rocks', ore: 'silver_ore', color: '#eef4fa', level: 20, xp: 40, chance: [25, 200], respawnTicks: 100 },
  { id: 'rock_coal', name: 'Coal rocks', ore: 'coal', color: '#151515', level: 30, xp: 50, chance: [16, 100], respawnTicks: 50 },
  { id: 'rock_gold', name: 'Gold rocks', ore: 'gold_ore', color: '#f0c030', level: 40, xp: 65, chance: [7, 75], respawnTicks: 100 },
  { id: 'rock_duskite', name: 'Duskite rocks', ore: 'duskite_ore', color: '#6a4f90', level: 55, xp: 80, chance: [4, 50], respawnTicks: 200 },
  { id: 'rock_verdite', name: 'Verdite rocks', ore: 'verdite_ore', color: '#3fb070', level: 70, xp: 95, chance: [2, 28], respawnTicks: 400 },
  { id: 'rock_azurium', name: 'Azurium rocks', ore: 'azurium_ore', color: '#3b80e0', level: 85, xp: 125, chance: [1, 20], respawnTicks: [700, 900] },
  { id: 'rock_emberite', name: 'Emberite rocks', ore: 'emberite_ore', color: '#ff5a24', level: 90, xp: 150, chance: [1, 16], respawnTicks: [1100, 1300] },
];
for (const r of ROCKS) {
  const what = r.ore === 'clay' ? 'clay' : r.ore === 'coal' ? 'coal' : r.name.replace(' rocks', '').toLowerCase();
  registerObject({ id: r.id, name: r.name, examine: `This rock contains ${what}.`, options: ['Mine', 'Prospect'], depleted: 'rock_depleted', respawnTicks: r.respawnTicks, model: { template: 'ore_rock', ore: r.color, rare: r.level >= 70 } });
  registerData('mining', r.id, { level: r.level, xp: r.xp, ore: r.ore, chance: r.chance, respawnTicks: r.respawnTicks, gems: true, what });
}
registerObject({ id: 'pale_essence_rock', name: 'Pale crystal', examine: 'A huge pale crystal. Chips of it could be bound into sigils.', options: ['Mine', 'Prospect'], size: [2, 2], model: { template: 'essence_rock' }, mapIcon: { char: '*', color: '#d8d0f8' } });
registerData('mining', 'pale_essence_rock', { level: 1, xp: 5, ore: 'pale_essence', chance: [180, 400], infinite: true, fast: true, what: 'pale essence' });

// =================================================================================================
// Fishing spots
// =================================================================================================
const spot = (id, examine, options, data) => {
  registerObject({ id, name: 'Fishing spot', examine, options, blocks: false, model: { template: 'fishing_spot' } });
  registerData('fishing', id, data);
};
const NET = { tool: 'small_net', verb: 'net', startMsg: 'You cast out your net...', catches: [
  { id: 'raw_minnow', level: 1, xp: 10, chance: [48, 256] },
  { id: 'raw_silverling', level: 15, xp: 40, chance: [24, 128] }] };
const BAIT_SEA = { tool: 'fishing_rod', bait: 'fishing_bait', verb: 'bait', startMsg: 'You cast out your line...', catches: [
  { id: 'raw_perch', level: 5, xp: 20, chance: [32, 192] },
  { id: 'raw_mudgill', level: 10, xp: 30, chance: [24, 128] }] };
const LURE = { tool: 'fly_rod', bait: 'feather', verb: 'lure', startMsg: 'You cast out your line...', catches: [
  { id: 'raw_streamdart', level: 20, xp: 50, chance: [32, 192] },
  { id: 'raw_rosefin', level: 30, xp: 70, chance: [16, 96] }] };
const BAIT_RIVER = { tool: 'fishing_rod', bait: 'fishing_bait', verb: 'bait', startMsg: 'You cast out your line...', catches: [
  { id: 'raw_perch', level: 5, xp: 20, chance: [32, 192] },
  { id: 'raw_mudgill', level: 10, xp: 30, chance: [24, 128] }] };
const CAGE = { tool: 'fishing_cage', verb: 'cage', startMsg: 'You attempt to catch a rockclaw.', catches: [
  { id: 'raw_rockclaw', level: 40, xp: 90, chance: [6, 95] }] };
const HARPOON = { tool: 'harpoon', verb: 'harpoon', startMsg: 'You start harpooning fish.', catches: [
  { id: 'raw_bluescale', level: 35, xp: 80, chance: [8, 64] },
  { id: 'raw_sabrefish', level: 50, xp: 100, chance: [4, 48] }] };
const BIG_NET = { tool: 'big_net', verb: 'net', startMsg: 'You cast out your big net...', catches: [
  { id: 'raw_silverling', level: 15, xp: 40, chance: [24, 128] },
  { id: 'raw_bluescale', level: 35, xp: 80, chance: [10, 72] }] };
const ICE = { tool: 'fishing_rod', bait: 'fishing_bait', verb: 'bait', startMsg: 'You lower your line through the hole in the ice...', catches: [
  { id: 'raw_frostfin', level: 62, xp: 120, chance: [10, 60] }] };
const SHARK = { tool: 'harpoon', verb: 'harpoon', startMsg: 'You start harpooning fish.', catches: [
  { id: 'raw_greyjaw', level: 76, xp: 110, chance: [3, 40] }] };
const SWAMP = { tool: 'fishing_rod', bait: 'fishing_bait', verb: 'bait', startMsg: 'You cast your line into the murky water...', catches: [
  { id: 'raw_mudgill', level: 10, xp: 30, chance: [24, 128] },
  { id: 'raw_bog_eel', level: 38, xp: 80, chance: [10, 80] }] };

spot('fishing_spot_net', 'I can see small fish darting about.', ['Net', 'Bait'], { Net: NET, Bait: BAIT_SEA });
spot('fishing_spot_bait', 'I can see small fish darting about.', ['Net', 'Bait'], { Net: NET, Bait: BAIT_SEA }); // legacy id
spot('fishing_spot_lure', 'Fish are rising to the surface here.', ['Lure', 'Bait'], { Lure: LURE, Bait: BAIT_RIVER });
spot('fishing_spot_cage', 'Something big is swimming down there.', ['Cage', 'Harpoon'], { Cage: CAGE, Harpoon: HARPOON });
spot('fishing_spot_deep', 'Dark shapes circle far below.', ['Big-net', 'Harpoon'], { 'Big-net': BIG_NET, Harpoon: SHARK });
registerObject({ id: 'fishing_spot_ice', name: 'Ice hole', examine: 'A hole in the ice. Something pale circles below.', options: ['Bait'], blocks: false, model: { template: 'fishing_spot' } });
registerData('fishing', 'fishing_spot_ice', { Bait: ICE });
spot('fishing_spot_swamp', 'Bubbles rise from the murky water.', ['Bait'], { Bait: SWAMP });
