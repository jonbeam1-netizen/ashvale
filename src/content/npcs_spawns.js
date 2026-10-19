// NPC spawn placement for the original vale (x 0-191). Imported by npcs.js.
// All vale NPC spawns live here (map.js only paints terrain and places scenery); the newer regions place
// their own NPCs in content/map_regions/*.js, hunter creatures are in gathering_spawns.js.

import { registerSpawn } from '../core/registry.js';

const npc = (id, x, y, wander = 2) => registerSpawn({ type: 'npc', id, x, y, wander });
let seed = 900;
/** Scatter `count` npcs of ids over rect [x0,y0,x1,y1]; terrain list optional (default: natural terrain). */
const scatter = (ids, rect, count, wander = 4, terrain) => registerSpawn({ type: 'scatter', kind: 'npc', ids, rect, count, seed: seed++, wander, ...(terrain ? { terrain } : {}) });

// =================================================================================================
// Brackenford
// =================================================================================================
npc('banker', 100, 128, 0);
npc('banker_female', 103, 128, 0);
npc('shopkeeper', 88, 129, 1);
npc('town_guide', 98, 138, 2);
npc('villager', 94, 144, 5);
npc('villager', 104, 139, 5);
npc('imp', 82, 150, 6);
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

// goblin camp east of town: starter goblins only (level 2) so new players can train safely
scatter(['goblin'], [108, 150, 120, 162], 8, 4);

// Grubnak's war camp, west of Thornwood (palisade 29-43, 116-130; see map_regions/vale.js)
scatter(['goblin_scout', 'goblin_brute'], [30, 117, 42, 129], 6, 3);
scatter(['goblin_shaman'], [31, 118, 41, 128], 2, 2);
npc('grubnak_warlord', 36, 121, 2);

// =================================================================================================
// Highmarch
// =================================================================================================
npc('banker_female', 144, 70, 0);
npc('banker', 144, 71, 0);
npc('arms_dealer', 172, 71, 1);
npc('slayer_master_hollis', 146, 88, 1);
scatter(['villager'], [145, 74, 178, 82], 4, 6);
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
for (const [x, y] of [[161, 153], [164, 154], [162, 156], [160, 155]]) npc('chicken', x, y, 2);
for (const [x, y] of [[164, 164], [170, 166], [174, 170], [166, 171], [172, 163], [168, 168]]) npc('cow', x, y, 4);

// =================================================================================================
// Thornwood
// =================================================================================================
scatter(['giant_spider'], [50, 110, 72, 165], 5, 5);
// Thornwood is a novice area ("Smoke over Thornwood"): wolves keep to the deep north-west, away from the
// beginner trees on the town side and the firebug camp (~50,146); bandits live at Fort Rowan.
scatter(['timber_wolf'], [48, 106, 64, 134], 5, 4);
scatter(['thornwood_bear'], [50, 112, 72, 150], 3, 4);
scatter(['wild_boar'], [56, 140, 74, 168], 3, 4);
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
scatter(['tide_elemental'], [151, 114, 158, 130], 3, 2);   // east shore, away from the Highmarch roads

// =================================================================================================
// Murkfen Swamp
// =================================================================================================
// The coast road runs straight through the swamp (x ~93-97): only harmless creatures near it, the dangerous
// fen-dwellers keep to the west (x <= 85) and east (x >= 104) marshes so the aggressive ones can't reach it.
const FEN_W = [77, 164, 86, 168], FEN_E = [104, 163, 111, 177];   // (the Morrow's Rest path runs along y 173-176)
scatter(['giant_rat'], [78, 163, 110, 176], 6, 4, ['swamp']);
scatter(['marsh_toad'], [78, 162, 110, 176], 5, 4, ['swamp']);
scatter(['drowned_one'], FEN_W, 2, 2, ['swamp']);
scatter(['drowned_one'], FEN_E, 1, 2, ['swamp']);
scatter(['fen_stalker'], FEN_W, 3, 2, ['swamp']);
scatter(['marsh_ogre'], [100, 162, 111, 170], 2, 3, ['swamp']);
scatter(['keening_hag'], FEN_W, 2, 2, ['swamp']);
scatter(['glarehorn_lizard'], [100, 164, 110, 176], 2, 3, ['swamp']);
scatter(['ashcult_acolyte'], FEN_E, 3, 2, ['swamp']);
scatter(['fen_drake'], FEN_W, 1, 2, ['swamp']);
scatter(['fen_drake'], FEN_E, 1, 2, ['swamp']);
npc('bog_matriarch', 81, 165, 1);                  // the west fen, away from the coast road and the Morrow's Rest path

// =================================================================================================
// Saltmarsh Coast (sand y 178-183)
// =================================================================================================
scatter(['saltmarsh_crab'], [100, 178, 150, 183], 6, 3, ['sand']);
scatter(['dune_scorpion'], [120, 178, 160, 183], 4, 3, ['sand']);
for (const [x, y] of [[132, 179], [139, 179], [146, 179]]) npc('ironshell_crab', x, y, 3);
// corsairs raid from Wreckers' Cove (222-242, 189-199; three more are placed by map_regions/east.js)
scatter(['saltmarsh_corsair'], [223, 190, 241, 198], 2, 3);
npc('corsair_captain', 232, 195, 3);
npc('dockhand_moira', 98, 180, 3);

// =================================================================================================
// Gloomhollow Depths (cave floor, y 158-191): the upper caverns are a level ~5-40 area (and home to the
// "Down in Gloomhollow" puzzle at 13-27, 184-188). The big beasts and bosses live further south in
// The Sunless Deep (y 192-223) - see map_regions/dungeons.js.
// =================================================================================================
const CAVE = ['cave_floor'];
scatter(['cave_bat'], [4, 162, 40, 188], 4, 4, CAVE);
scatter(['zombie', 'skeleton'], [4, 162, 30, 182], 5, 3, CAVE);
scatter(['gloom_crawler'], [12, 166, 34, 182], 4, 3, CAVE);
scatter(['wailing_shade'], [4, 162, 30, 182], 3, 3, CAVE);
scatter(['pitch_scorpion'], [26, 172, 40, 184], 2, 3, CAVE);

// =================================================================================================
// Wilderness: Ashen Wastes (y 12-47), Calder Ruins (~96,28), Frostfang Peaks (y 0-11)
// =================================================================================================
// near the ditch (low level)
scatter(['wasteland_reaver'], [10, 36, 180, 46], 6, 5);
scatter(['highway_bandit'], [34, 38, 50, 46], 3, 4);
npc('bandit_fence', 41, 46, 1);
scatter(['skeleton'], [10, 14, 180, 44], 8, 4);
scatter(['dread_wolf'], [10, 12, 180, 40], 6, 5);
// mid wilderness
scatter(['highland_giant'], [120, 14, 180, 40], 3, 4);
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
npc('ashen_wyrm', 70, 6, 4);
npc('frostmaw', 161, 3, 3);
