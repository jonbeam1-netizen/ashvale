// NPC spawn placement in the existing regions. OWNER: agent D (D2). Imported by npcs.js.
// (The original Phase-1 spawns in map.js stay; these add to them. D1 places spawns in new regions.)

import { registerSpawn } from '../core/registry.js';

const npc = (id, x, y, wander = 2) => registerSpawn({ type: 'npc', id, x, y, wander });
let seed = 900;
/** Scatter `count` npcs of ids over rect [x0,y0,x1,y1]; terrain list optional (default: natural terrain). */
const scatter = (ids, rect, count, wander = 4, terrain) => registerSpawn({ type: 'scatter', kind: 'npc', ids, rect, count, seed: seed++, wander, ...(terrain ? { terrain } : {}) });

// =================================================================================================
// Brackenford
// =================================================================================================
npc('banker_female', 102, 128, 0);
npc('bram_bladesmith', 105, 142, 1);
npc('hilde_armourer', 111, 139, 1);
npc('baker_wenna', 88, 148, 1);
npc('fisher_tobin', 119, 136, 1);
npc('crafter_ilsa', 85, 136, 1);
npc('mage_orrin', 93, 130, 1);
npc('fletcher_rowan', 82, 137, 1);
npc('herbalist_maeve', 109, 157, 1);
npc('town_guard', 95, 124, 3);
npc('town_guard', 79, 141, 3);
npc('town_guard', 115, 141, 3);
npc('old_fennick', 91, 139, 2);
npc('bard_lyle', 100, 142, 2);
npc('child_pip', 94, 151, 4);
npc('brother_aldous', 109, 135, 1);
npc('drunk_harlan', 91, 154, 2);
npc('villager', 106, 154, 5);

// goblin camp east of town (Phase-1 goblins live at [108,150,120,162])
scatter(['goblin_scout', 'goblin_brute'], [110, 152, 122, 164], 5, 4);
scatter(['goblin_shaman'], [112, 154, 120, 162], 2, 3);
npc('grubnak_warlord', 116, 159, 3);

// =================================================================================================
// Highmarch
// =================================================================================================
npc('banker_female', 144, 70, 0);
npc('highmarch_smith', 155, 83, 1);
npc('highmarch_mage', 164, 75, 1);
npc('highmarch_grocer', 158, 71, 1);
npc('highmarch_knight', 160, 66, 2);
npc('highmarch_knight', 161, 66, 2);
npc('highmarch_knight', 142, 79, 2);
npc('highmarch_knight', 161, 100, 2);
npc('town_guard', 152, 77, 6);
npc('town_guard', 170, 78, 6);
npc('lady_corvina', 164, 79, 3);
npc('scholar_bede', 148, 77, 3);
npc('ranger_kestrel', 97, 52, 3);

// =================================================================================================
// Haverly Farms
// =================================================================================================
npc('farmer', 150, 160, 4);
npc('farmer', 146, 151, 4);
npc('haverly_supplier', 151, 170, 1);
scatter(['wild_boar'], [168, 146, 180, 160], 3, 4);

// =================================================================================================
// Thornwood
// =================================================================================================
scatter(['timber_wolf'], [48, 106, 74, 150], 5, 5);
scatter(['thornwood_bear'], [50, 112, 72, 150], 3, 4);
scatter(['wild_boar'], [56, 140, 74, 168], 3, 4);
scatter(['highway_bandit'], [50, 126, 66, 142], 3, 4);
scatter(['mosshide_giant'], [52, 158, 74, 170], 2, 3);

// =================================================================================================
// Greystone Quarry
// =================================================================================================
scatter(['loam_elemental'], [32, 64, 56, 88], 3, 3, ['stone']);
scatter(['shalestone_slug'], [32, 66, 58, 90], 4, 3, ['stone']);
scatter(['quarry_golem'], [36, 66, 56, 86], 2, 3, ['stone']);
scatter(['stonegaze_fowl'], [30, 86, 46, 92], 3, 3);
npc('graven_king', 54, 85, 3);

// =================================================================================================
// Silverrun & Mirrowmere
// =================================================================================================
scatter(['hedge_wizard'], [106, 96, 120, 116], 2, 4);
scatter(['tide_elemental'], [134, 108, 158, 132], 3, 3);

// =================================================================================================
// Murkfen Swamp
// =================================================================================================
scatter(['marsh_toad'], [78, 162, 110, 176], 5, 4, ['swamp']);
scatter(['drowned_one'], [80, 164, 108, 176], 3, 3, ['swamp']);
scatter(['fen_stalker'], [78, 162, 96, 176], 3, 4, ['swamp']);
scatter(['marsh_ogre'], [96, 162, 110, 170], 2, 3, ['swamp']);
scatter(['keening_hag'], [82, 170, 100, 177], 2, 3, ['swamp']);
scatter(['glarehorn_lizard'], [100, 164, 110, 176], 2, 3, ['swamp']);
scatter(['ashcult_acolyte'], [104, 168, 111, 176], 3, 3, ['swamp']);
scatter(['fen_drake'], [80, 164, 110, 176], 2, 3, ['swamp']);
npc('bog_matriarch', 92, 170, 2);

// =================================================================================================
// Saltmarsh Coast (sand y 178-183)
// =================================================================================================
scatter(['saltmarsh_crab'], [100, 178, 150, 183], 6, 3, ['sand']);
scatter(['dune_scorpion'], [120, 178, 160, 183], 4, 3, ['sand']);
for (const [x, y] of [[132, 178], [144, 178], [153, 178]]) npc('ironshell_crab', x, y, 3);
scatter(['saltmarsh_corsair'], [52, 178, 84, 183], 4, 4, ['sand']);
npc('corsair_captain', 64, 179, 3);
npc('dockhand_moira', 98, 180, 3);

// =================================================================================================
// Gloomhollow Depths (cave floor)
// =================================================================================================
const CAVE = ['cave_floor'];
scatter(['gloom_crawler'], [12, 170, 30, 186], 4, 3, CAVE);
scatter(['pitch_scorpion', 'wailing_shade'], [4, 162, 30, 188], 5, 3, CAVE);
scatter(['thirst_bat'], [4, 162, 40, 188], 3, 4, CAVE);
scatter(['ironbound_golem', 'shardstone_golem'], [26, 174, 42, 190], 3, 2, CAVE);
scatter(['rot_specter', 'hollow_reaver'], [6, 164, 30, 188], 4, 3, CAVE);
scatter(['void_stalker', 'umbral_beast'], [28, 176, 42, 190], 2, 2, CAVE);
scatter(['gloom_widow'], [6, 164, 16, 172], 2, 2, CAVE);
scatter(['drakeling'], [18, 162, 30, 168], 2, 2, CAVE);
npc('mother_skitterlace', 20, 166, 1);
npc('azure_dragon', 22, 165, 1);
npc('varrath_gloom_tyrant', 32, 182, 1);

// =================================================================================================
// Wilderness: Ashen Wastes (y 12-47), Calder Ruins (~96,28), Frostfang Peaks (y 0-11)
// =================================================================================================
// near the ditch (low level)
scatter(['wasteland_reaver'], [10, 36, 180, 46], 6, 5);
scatter(['highway_bandit'], [34, 38, 50, 46], 3, 4);
npc('bandit_fence', 41, 46, 1);
// mid wilderness
scatter(['ashfiend'], [16, 18, 80, 34], 3, 4);
scatter(['grave_wraith'], [22, 34, 36, 44], 3, 3);
scatter(['ash_revenant'], [104, 14, 180, 30], 3, 5);
scatter(['cinder_giant'], [130, 16, 176, 36], 3, 4);
scatter(['ember_elemental'], [40, 18, 64, 34], 3, 3);
scatter(['ash_devil'], [60, 28, 86, 40], 3, 3);
scatter(['stormcaller'], [60, 12, 124, 24], 2, 4);
scatter(['moss_dragon'], [106, 34, 126, 44], 2, 3);
scatter(['pyre_fiend'], [150, 13, 182, 22], 2, 3);
npc('crimson_dragon', 147, 20, 3);
// Calder Ruins
scatter(['skeleton_warden'], [87, 19, 105, 37], 4, 3);
scatter(['bone_archer'], [87, 19, 105, 37], 3, 3);
scatter(['ashcult_zealot'], [84, 34, 108, 42], 3, 3);
scatter(['stone_grotesque'], [84, 16, 108, 22], 2, 2);
npc('calder_lich', 96, 30, 2);
npc('cinder_colossus', 163, 20, 4);
npc('obsidian_dragon', 36, 16, 3);
// Frostfang Peaks
scatter(['rimefang_wolf'], [4, 2, 186, 11], 6, 5, ['snow']);
scatter(['rime_giant'], [16, 2, 96, 10], 3, 4, ['snow']);
scatter(['gale_elemental'], [100, 2, 182, 10], 3, 4, ['snow']);
npc('frost_wyrm', 125, 9, 3);
npc('frostmaw', 161, 3, 3);
