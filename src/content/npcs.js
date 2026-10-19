// =================================================================================================
// ROSTER (agent D2 keeps this current; D1 uses it to populate new regions)   id — combat level — habitat
// critters:   chicken 1 farms · cow 2 farms · giant_rat 3 swamp/sewers · marsh_toad 4 Murkfen · saltmarsh_crab 9 coast
//             wild_boar 10 Thornwood/farms · timber_wolf 15 Thornwood · dune_scorpion 15 coast · thornwood_bear 23 Thornwood
// goblin-kin: goblin 2 · goblin_scout 6 (ranged) · goblin_brute 13 · goblin_shaman 13 (magic) — goblins at the camp E of Brackenford, the rest at Grubnak's War Camp W of Thornwood
// humanoids:  villager 2 · farmer 7 · highway_bandit 19 roads · town_guard 22 towns · ashcult_acolyte 16 · ashcult_zealot 37
//             hedge_wizard 22 (magic) · saltmarsh_corsair 27 coast · fen_stalker 47 Murkfen · highmarch_knight 49 Highmarch
//             wasteland_reaver 36 Wilderness · stormcaller 51 (magic) Wilderness · marsh_ogre 56 Murkfen · crag_troll 73 mountains
// undead:     zombie 14 · wailing_shade 19 · skeleton 21 · drowned_one 30 Murkfen · bone_archer 28 · skeleton_warden 64 Calder Ruins
//             grave_wraith 63 Wilderness graveyard · ash_revenant 96 Wilderness
// beasts:     giant_spider 6 Thornwood · cave_bat 5 Gloomhollow · dread_wolf 25 Wilderness · ironshell_crab 37 coast
//             pitch_scorpion 38 Gloomhollow · rimefang_wolf 44 Frostfang · gloom_widow 57 Gloomhollow
// giants:     highland_giant 28 · mosshide_giant 43 Thornwood/Murkfen · rime_giant 56 Frostfang · cinder_giant 87 Ashen Wastes
// golems/el.: quarry_golem 34 Greystone · loam_elemental 40 Greystone · tide_elemental 47 Mirrowmere · gale_elemental 53 Frostfang
//             ember_elemental 60 Ashen Wastes · ironbound_golem 72 Gloomhollow · shardstone_golem 109 Gloomhollow
// demons:     imp 5 · ashfiend 56 Wilderness · gloom_fiend 84 Gloomhollow · pyre_fiend 121 Wilderness
// dragons:    drakeling 49 Gloomhollow · fen_drake 65 Murkfen · moss_dragon 79 Wilderness · ashen_wyrm 79 Wilderness · azure_dragon 111 Gloomhollow
//             frost_wyrm 143 Frostfang · crimson_dragon 154 Wilderness (lava, 144,23) · obsidian_dragon 225 deep Wilderness
// slayer:     gloom_crawler 22 (sl 10) · shalestone_slug 30 (sl 20) · stonegaze_fowl 37 (sl 25) · keening_hag 43 (sl 30)
//             thirst_bat 54 (sl 35) · glarehorn_lizard 66 (sl 45) · ash_devil 97 (sl 60) · rot_specter 91 (sl 65)
//             stone_grotesque 117 (sl 75) · hollow_reaver 123 (sl 80) · void_stalker 124 (sl 85) · umbral_beast 185 (sl 90)
// bosses:     grubnak_warlord 48 war camp · corsair_captain 78 Wreckers' Cove · graven_king 95 Greystone (not aggressive) · bog_matriarch 120 Murkfen
//             mother_skitterlace 140 Sunless Deep · calder_lich 190 Calder Ruins · cinder_colossus 210 Ashen Wastes
//             frostmaw 320 Frostfang · varrath_gloom_tyrant 300 Sunless Deep (deepest)
// townsfolk:  banker · banker_female · town_guard 22 · farmer 7 · villager 2 · old_fennick · bard_lyle · child_pip · brother_aldous
//             drunk_harlan · lady_corvina · scholar_bede · dockhand_moira · ranger_kestrel · town_guide · slayer_master_hollis
// shops:      shopkeeper (general) · bram_bladesmith "Garrick" (swords) · hilde_armourer · baker_wenna (food) · fisher_tobin
//             crafter_ilsa · mage_orrin (sigils/staves) · fletcher_rowan (archery) · herbalist_maeve · arms_dealer · highmarch_smith
//             highmarch_mage · highmarch_grocer · haverly_supplier (farming) · bandit_fence (Wilderness outlaw camp, 41,46)
// =================================================================================================
// NPC definitions. OWNER: agent D (D2). (Skill/quest-specific NPCs may live in that system's content file.)
// model.template: engine  human goblin imp skeleton zombie giant demon golem cow wolf rat dragon spider chicken bat
//                 content troll ogre lizardfolk elemental ghost magma_golem bear boar toad lizard slug hound
//                         glow_dragon crab scorpion   (content/visuals.js)
//
//   npcs_town.js      bankers, shopkeepers, townsfolk + dialogues
//   npcs_monsters.js  monsters, slayer monsters, bosses
//   npcs_spawns.js    spawn placement in the existing regions (D1 places spawns in new regions)

import './npcs_town.js';
import './npcs_monsters.js';
import './npcs_spawns.js';
import './npcs_east.js';      // eastern lands & coast: bankers, shopkeepers, townsfolk, ferry, desert heat, lore books
