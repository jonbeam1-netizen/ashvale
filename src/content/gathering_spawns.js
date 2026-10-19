// Placement of every gathering resource: trees, rocks, essence, fishing spots, hunter creatures,
// farming patches and a few free tool spawns. OWNER: agent B.
//
// All gathering resources are placed here (map.js only keeps mixed forest dressing: normal/birch/redleaf
// trees and pines).

import { registerSpawn as spawn, registerPaint as paint } from '../core/registry.js';

const scatter = (ids, opts) => spawn({ type: 'scatter', ids, ...opts });
const npcs = (id, opts) => spawn({ type: 'scatter', kind: 'npc', ids: [id], ...opts });
const W = (id, weight) => ({ id, weight });

// =================================================================================================
// Trees (normal / birch / redleaf forest scatter lives in map.js)
// =================================================================================================
scatter(['tree_ironbark'], { rect: [50, 112, 72, 165], count: 5, seed: 901, spacing: 1 });          // deep Thornwood
scatter(['tree_starwood'], { rect: [52, 140, 72, 168], count: 2, seed: 902, spacing: 1 });          // Thornwood glade
scatter(['tree_weepwood'], { rect: [130, 104, 162, 136], circle: [146, 120, 13], count: 10, seed: 903 }); // Mirrowmere shore
scatter(['tree_weepwood'], { rect: [112, 96, 138, 178], count: 10, seed: 904, terrain: ['grass', 'sand', 'dark_grass'] }); // Silverrun banks
scatter(['tree_redleaf'], { rect: [100, 88, 118, 106], count: 6, seed: 905, spacing: 1 });          // north of Brackenford
scatter([W('tree_birch', 3), W('tree_normal', 2), W('tree_redleaf', 1)], { rect: [134, 104, 160, 110], count: 6, seed: 906 }); // below Highmarch
scatter(['tree_ironbark'], { rect: [10, 14, 180, 44], count: 4, seed: 907, spacing: 1 });           // Wilderness
scatter(['tree_starwood'], { rect: [60, 13, 140, 24], count: 2, seed: 908, spacing: 1 });           // deep Wilderness
// Faelwood (elven forest, far east) - the richest woodland
const FAEL = ['glade_grass', 'dark_grass', 'flowers', 'moss', 'grass'];
scatter(['tree_redleaf'], { rect: [241, 50, 287, 128], count: 10, seed: 909, spacing: 1, terrain: FAEL });
scatter(['tree_ironbark'], { rect: [241, 50, 287, 128], count: 6, seed: 910, spacing: 1, terrain: FAEL });
scatter(['tree_starwood'], { rect: [241, 100, 287, 128], count: 3, seed: 916, spacing: 1, terrain: FAEL });
scatter([W('tree_normal', 3), W('tree_birch', 2)], { rect: [192, 111, 240, 133], count: 8, seed: 917, spacing: 2 }); // Bramblemoor
scatter([W('tree_ironbark', 2), W('tree_starwood', 1)], { rect: [192, 12, 242, 47], count: 5, seed: 918, spacing: 0 }); // Blackbriar Wood (Wilderness)

// =================================================================================================
// Mining
// =================================================================================================
// Greystone Quarry (stone ground around (44,76))
scatter([W('rock_copper', 9), W('rock_tin', 9), W('rock_iron', 8), W('rock_coal', 7), W('rock_clay', 4), W('rock_silver', 3), W('rock_gold', 2)],
  { rect: [30, 62, 58, 90], circle: [44, 76, 12], count: 42, seed: 7, terrain: ['stone'] });
scatter(['pale_essence_rock'], { rect: [34, 64, 44, 72], count: 1, seed: 911, terrain: ['stone'], spacing: 1 });
// Brackenford outcrop: a few starter rocks just north of town so new players can try mining/smithing early
paint({ shape: 'circle', cx: 101, cy: 102.5, r: 3, terrain: 'stone', jitter: 0.6, noScatter: true });
for (const [id, x, y] of [['rock_copper', 99, 102], ['rock_tin', 101, 101], ['rock_copper', 103, 102], ['rock_tin', 100, 104], ['rock_copper', 102, 104]]) spawn({ type: 'object', id, x, y });

// Highmarch mine: rocky shelf south-east of Highmarch against the mountains
paint({ shape: 'circle', cx: 171, cy: 116, r: 8, terrain: 'stone', jitter: 2, raise: 0.6, falloff: 3, only: ['grass', 'dark_grass', 'flowers'] });
scatter([W('rock_iron', 5), W('rock_coal', 8), W('rock_gold', 2), W('rock_duskite', 4), W('rock_verdite', 2), W('rock_azurium', 1), W('rock_silver', 2)],
  { rect: [162, 107, 181, 125], circle: [171, 116, 8], count: 24, seed: 912, terrain: ['stone'] });

// Wilderness: the Cinder Pits (deep, around (70,18)) - only place emberite appears
scatter([W('rock_emberite', 4), W('rock_azurium', 2), W('rock_verdite', 3), W('rock_duskite', 3), W('rock_coal', 4)],
  { rect: [60, 12, 80, 24], circle: [70, 18, 8], count: 16, seed: 913 });
// Wilderness: low-level coal & duskite field near the ditch
scatter([W('rock_coal', 3), W('rock_duskite', 2), W('rock_iron', 2)], { rect: [24, 30, 36, 42], count: 10, seed: 914 });

// Greyspine foothills: a few common ores on the shelves
scatter([W('rock_copper', 2), W('rock_tin', 2), W('rock_iron', 3), W('rock_coal', 2)], { rect: [184, 88, 240, 114], count: 8, seed: 941, terrain: ['gravel', 'stone', 'heath'] });
// Durnhold's Deep Seams (a no-scatter mining floor) and the narrow Hollowpick tunnels are filled at
// runtime by systems/gathering.js with corridor-safe placement (rocks never block a passage).
export const RUNTIME_ROCKS = [
  { name: 'Deep Seams', rect: [214, 71, 228, 81], count: 22, seed: 940, terrain: ['stone'],
    ids: [W('rock_iron', 4), W('rock_coal', 6), W('rock_silver', 2), W('rock_gold', 3), W('rock_duskite', 4), W('rock_verdite', 2), W('rock_azurium', 1)] },
  { name: 'Hollowpick Mine', rect: [142, 224, 212, 255], count: 26, seed: 942, terrain: ['cave_floor', 'gravel'],
    ids: [W('rock_coal', 6), W('rock_duskite', 5), W('rock_verdite', 4), W('rock_azurium', 2), W('rock_gold', 3), W('rock_silver', 2)] },];
// Scorchgulch (Sunscar Badlands): precious metals and clay
scatter([W('rock_gold', 3), W('rock_silver', 3), W('rock_clay', 3), W('rock_iron', 2)], { rect: [194, 162, 223, 179], count: 11, seed: 944, terrain: ['red_sand', 'cracked_earth', 'sand'] });
// Cinderfall (Wilderness, far east): a second emberite seam
scatter([W('rock_emberite', 2), W('rock_azurium', 1), W('rock_coal', 3)], { rect: [243, 30, 287, 47], count: 6, seed: 945 });

// Gloomhollow Depths: pale crystals
scatter(['pale_essence_rock'], { rect: [8, 164, 36, 186], count: 3, seed: 915, terrain: ['cave_floor'], spacing: 2 });

// =================================================================================================
// Fishing spots (water tiles next to land)
// =================================================================================================
scatter(['fishing_spot_lure'], { rect: [118, 50, 134, 136], count: 6, seed: 921, water: true });     // Silverrun (upper)
scatter(['fishing_spot_net'], { rect: [116, 143, 130, 178], count: 3, seed: 922, water: true });      // Silverrun (lower)
scatter(['fishing_spot_net'], { rect: [136, 110, 156, 130], count: 2, seed: 923, water: true });      // Mirrowmere
scatter(['fishing_spot_lure'], { rect: [136, 110, 156, 130], count: 2, seed: 924, water: true });     // Mirrowmere
scatter(['fishing_spot_net'], { rect: [46, 182, 112, 188], count: 4, seed: 925, water: true });       // Saltmarsh west
scatter(['fishing_spot_cage'], { rect: [112, 182, 160, 188], count: 4, seed: 926, water: true });     // Saltmarsh
scatter(['fishing_spot_deep'], { rect: [160, 194, 192, 202], count: 3, seed: 927, water: true });     // off the Gullhaven pier ends (deep water)
scatter(['fishing_spot_swamp'], { rect: [80, 160, 106, 176], count: 3, seed: 928, water: true });     // Murkfen pools
scatter(['fishing_spot_cage'], { rect: [156, 182, 192, 200], count: 3, seed: 929, water: true });     // Gullhaven piers
scatter(['fishing_spot_net'], { rect: [156, 182, 192, 200], count: 2, seed: 930, water: true });      // Gullhaven piers
scatter(['fishing_spot_cage'], { rect: [186, 196, 206, 214], count: 2, seed: 946, water: true });     // Beacon Isle
scatter(['fishing_spot_deep'], { rect: [206, 192, 260, 215], count: 4, seed: 947, water: true });     // off Wreckers' Cove
scatter(['fishing_spot_lure'], { rect: [270, 54, 287, 74], count: 2, seed: 948, water: true });       // Silverfall
scatter(['fishing_spot_net'], { rect: [263, 145, 277, 159], count: 2, seed: 949, water: true });      // Sunwell Oasis
scatter(['fishing_spot_ice'], { rect: [33, 0, 47, 11], count: 3, seed: 950, terrain: ['ice'], spacing: 2 }); // Rimeglass Tarn (Wilderness)

// =================================================================================================
// Hunter creatures
// =================================================================================================
npcs('crested_finch', { rect: [50, 108, 74, 165], count: 7, seed: 931, wander: 5 });
npcs('reed_warbler', { rect: [78, 163, 110, 176], count: 6, seed: 932, wander: 5, terrain: ['swamp'] });
npcs('snowcap_lark', { rect: [172, 126, 182, 146], count: 3, seed: 933, wander: 5 });
npcs('snowcap_lark', { rect: [192, 111, 240, 133], count: 6, seed: 951, wander: 5 });              // Bramblemoor
npcs('bramble_ferret', { rect: [192, 111, 240, 133], count: 5, seed: 952, wander: 4 });             // Bramblemoor
npcs('bramble_ferret', { rect: [48, 110, 74, 170], count: 6, seed: 934, wander: 4 });
npcs('grey_bombtail_critter', { rect: [128, 177, 156, 184], count: 3, seed: 935, wander: 4, terrain: ['sand'] });
npcs('grey_bombtail_critter', { rect: [192, 134, 287, 199], count: 8, seed: 953, wander: 4, terrain: ['red_sand', 'cracked_earth', 'sand'] }); // Sunscar Badlands
npcs('ember_bombtail_critter', { rect: [138, 20, 162, 40], count: 5, seed: 936, wander: 4 });
npcs('ember_bombtail_critter', { rect: [243, 30, 287, 47], count: 4, seed: 954, wander: 4 });      // Cinderfall
npcs('amber_flutterwing', { rect: [50, 120, 72, 160], count: 7, seed: 937, wander: 6 });
npcs('azure_flutterwing', { rect: [134, 108, 158, 132], count: 6, seed: 938, wander: 6 });
npcs('azure_flutterwing', { rect: [241, 50, 287, 128], count: 5, seed: 955, wander: 6, terrain: FAEL }); // Faelwood
npcs('crested_finch', { rect: [241, 50, 287, 128], count: 4, seed: 956, wander: 5, terrain: FAEL });
npcs('frost_flutterwing', { rect: [20, 2, 180, 10], count: 7, seed: 939, wander: 6, terrain: ['snow'] });
npcs('frost_flutterwing', { rect: [192, 0, 246, 11], count: 4, seed: 957, wander: 6, terrain: ['snow'] }); // Frostfang Heights

// =================================================================================================
// Farming patches (keys are their tiles; state is per player in player.store('farming'))
// =================================================================================================
const patch = (kind, x, y) => spawn({ type: 'object', id: `farm_patch_${kind}`, x, y });
// Haverly Farms (main)
patch('allotment', 142, 150); patch('allotment', 142, 158); patch('herb', 148, 154); patch('tree', 152, 150);
spawn({ type: 'object', id: 'compost_bin', x: 147, y: 151 });
spawn({ type: 'object', id: 'seed_crate', x: 151, y: 158 });
// Brackenford north fields
paint({ shape: 'rect', x0: 107, y0: 100, x1: 116, y1: 103, noScatter: true });
patch('allotment', 108, 101); patch('herb', 114, 101);
spawn({ type: 'object', id: 'compost_bin', x: 112, y: 101 });
// Ilvaren gardens (Faelwood)
paint({ shape: 'rect', x0: 250, y0: 83, x1: 253, y1: 91, noScatter: true });
paint({ shape: 'rect', x0: 259, y0: 104, x1: 264, y1: 107, noScatter: true });
patch('herb', 251, 84); patch('tree', 251, 89); patch('allotment', 260, 105);
// Below Highmarch's south gate
paint({ shape: 'rect', x0: 150, y0: 104, x1: 160, y1: 108, noScatter: true });
patch('tree', 151, 105); patch('herb', 156, 105);

// =================================================================================================
// Free tool spawns: basic farming tools at Haverly, hunter gear at the Thornwood edge.
// (All of these are also sold: hunter gear at Rowan's Bows and the general stores, farming tools at Haverly.)
// =================================================================================================
const item = (id, x, y, qty = 1, respawnTicks = 100) => spawn({ type: 'item', id, x, y, qty, respawnTicks });
item('rake', 146, 152); item('seed_dibber', 147, 153); item('spade', 146, 156);
paint({ shape: 'rect', x0: 76, y0: 133, x1: 77, y1: 136, noScatter: true });
item('bird_snare', 77, 134); item('box_trap', 76, 136); item('butterfly_net', 77, 135); item('butterfly_jar', 77, 133, 1, 60);
