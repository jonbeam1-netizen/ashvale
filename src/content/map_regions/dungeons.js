// Dungeons: sealed pockets of `void` with carved floors, linked to the surface by two-way
// teleport objects (engine `def.teleport`). OWNER: agent D (world builder).
//
//  The Sunless Deep    (0-44, 192-223)   physically continues Gloomhollow Depths southwards
//  Crypt of Morrow's Rest (0-60, 226-255)  <- mausoleum at Morrow's Rest (57,173)
//  Highmarch Sewers    (62-140, 226-255)  <- manhole in Highmarch (157,98); outflow pipe on the Silverrun (121,105)
//  Hollowpick Mine     (144-212, 226-255) <- adit in the Greyspine Mountains (234,94)
//  Sandswallowed Vaults (214-270, 226-255) <- stairs in the Sandswallowed Temple (264,186)
//  Starcaller's Study  (272-286, 234-250) <- Starcaller's Spire (218,120)  (lit interior, not a dungeon)
//  Cinder Depths       (252-287, 0-29)    <- cave mouth in Cinderfall (255,31) - WILDERNESS lvl 19-46, multi
//  Southern cliffs (45-287, 216-223) wall the sea off from the dungeon band.

import { registerObject } from '../../core/registry.js';
import { paint, area, obj, objs, npc, npcScatter, scatter, line, building, readable, portalObject, item, SPOTS } from './util.js';

const floor = (shape, terrain = 'cave_floor', extra = {}) => paint({ height: 0.2, blocked: false, ...shape, terrain, ...extra });
const rect = (x0, y0, x1, y1, terrain, extra = {}) => floor({ shape: 'rect', x0, y0, x1, y1 }, terrain, extra);
const circ = (cx, cy, r, terrain, extra = {}) => floor({ shape: 'circle', cx, cy, r, jitter: 1 }, terrain, extra);
const tunnel = (points, width, terrain, extra = {}) => floor({ shape: 'line', points, width, jitter: 0.6 }, terrain, extra);

// ---- transitions ---------------------------------------------------------------------------------------
portalObject('morrow_mausoleum', 'Mausoleum', 'The tomb of the Morrow family. The door has been forced open from the inside.', 'Enter', { template: 'dec_mausoleum' }, SPOTS.cryptEntry, { size: [3, 3], message: 'You descend the worn steps into the crypt...', mapIcon: { char: 'D', color: '#a08060' } });
portalObject('crypt_stairs_up', 'Stairs', 'Daylight, faint and far above.', 'Climb-up', { template: 'ladder' }, SPOTS.morrowCrypt);
portalObject('sewer_manhole', 'Manhole', 'A heavy iron cover. It smells exactly as you would expect.', 'Climb-down', { template: 'dec_manhole' }, SPOTS.sewerEntry, { blocks: false, message: 'You climb down into the sewers. Oh, the smell...', mapIcon: { char: 'D', color: '#a08060' } });
portalObject('sewer_ladder', 'Ladder', 'Back up to the streets of Highmarch.', 'Climb-up', { template: 'ladder' }, SPOTS.sewerManhole);
portalObject('sewer_outflow_in', 'Outflow pipe', 'A rusted grate hangs loose. Daylight beyond.', 'Squeeze-through', { template: 'dec_sewer_pipe' }, SPOTS.sewerOutflow, { message: 'You squeeze through the outflow and out onto the riverbank.' });
portalObject('sewer_outflow_out', 'Outflow pipe', 'Water trickles out of the Highmarch sewers. The grate is loose.', 'Squeeze-through', { template: 'dec_sewer_pipe' }, SPOTS.sewerFar, { message: 'You squeeze into the pipe...' });
portalObject('hollowpick_adit', 'Mine entrance', 'The old Hollowpick workings. Cold air breathes out of the dark.', 'Enter', { template: 'dec_mine_entrance', sign: true }, SPOTS.mineEntry, { size: [3, 2], message: 'You duck under the timbers and into the abandoned mine.', mapIcon: { char: 'D', color: '#a08060' } });
portalObject('mine_rope', 'Rope', 'Leads back up to the adit.', 'Climb-up', { template: 'rope' }, SPOTS.mineMouth);
portalObject('temple_stairs', 'Sunken stairs', 'Steps lead down beneath the sand.', 'Climb-down', { template: 'dec_stairs_down', color: '#c8a878' }, SPOTS.templeEntry, { size: [2, 2], message: 'You descend into the cool dark of the buried vaults.', mapIcon: { char: 'D', color: '#a08060' } });
portalObject('temple_stairs_up', 'Stairs', 'Sand trickles down from the temple above.', 'Climb-up', { template: 'ladder' }, SPOTS.templeStairs);
portalObject('spire_ladder', 'Spiral stair', 'Down, and down, and down again.', 'Climb-down', { template: 'ladder', down: true }, SPOTS.spireDoor, { message: 'You wind your way back down the spiral stair.' });
portalObject('cinder_mouth', 'Smoking cave', 'Heat rolls out of the opening. The rock around it glows faintly.', 'Enter', { template: 'cave_entrance' }, SPOTS.cinderEntry, { size: [3, 2], message: 'You step into the stifling heat of the Cinder Depths...', mapIcon: { char: 'D', color: '#ff6030' } });
portalObject('cinder_rope', 'Rope', 'Back out to the (relatively) fresh air.', 'Climb-up', { template: 'rope' }, SPOTS.cinderMouth);
registerObject({ id: 'hoard_pile', name: 'Treasure hoard', examine: 'Coins, cups and crowns, melted together by dragonfire. Far too hot to touch.', model: { template: 'dec_chest_deco', open: true, color: '#8a6a30' } });

export function paintTerrain() {
  // ---- sea cliffs and the sealed band -------------------------------------------------------------------
  paint({ shape: 'rect', x0: 45, y0: 216, x1: 287, y1: 223, terrain: 'mountain', raise: 5, jitter: 2, falloff: 2, noise: { amp: 1.5, scale: 4 }, blocked: true });
  paint({ shape: 'rect', x0: 0, y0: 192, x1: 44, y1: 223, terrain: 'void', raise: 3, falloff: 2 });
  paint({ shape: 'rect', x0: 0, y0: 224, x1: 287, y1: 255, terrain: 'void', raise: 3, falloff: 2 });

  // =================================================================================================
  // The Sunless Deep (continues Gloomhollow Depths south of the existing caverns)
  // =================================================================================================
  tunnel([[32, 186], [31, 192], [26, 198]], 3, 'cave_floor');
  circ(24, 202, 5, 'cave_floor');                                   // Crystal Grotto
  circ(12, 206, 7, 'cave_floor');                                   // Black Lake shore
  circ(12, 207, 4, 'water', { jitter: 0.6 });
  tunnel([[24, 202], [36, 208]], 2.5, 'cave_floor'); circ(36, 209, 5, 'cave_floor');           // Widow's nest
  tunnel([[18, 208], [20, 214], [28, 217]], 3, 'cave_floor'); circ(29, 217, 5, 'dark_stone');  // Wyrm's Hoard
  circ(33, 219, 1.6, 'lava', { jitter: 0.4 });

  // =================================================================================================
  // Crypt of Morrow's Rest
  // =================================================================================================
  rect(8, 230, 18, 238, 'crypt_floor');                              // entry hall
  rect(18, 233, 40, 235, 'crypt_floor');                             // long gallery
  for (const x of [22, 30]) { rect(x, 228, x + 4, 232, 'crypt_floor'); rect(x, 236, x + 4, 240, 'crypt_floor'); } // burial niches
  rect(40, 228, 54, 242, 'crypt_floor');                             // ossuary
  rect(46, 242, 48, 246, 'crypt_floor');
  rect(30, 246, 54, 253, 'crypt_floor');                             // tomb of the Hollow King
  rect(4, 236, 8, 238, 'crypt_floor'); rect(3, 238, 9, 252, 'crypt_floor');   // flooded vault
  paint({ shape: 'line', points: [[6, 240], [6, 251]], width: 1, terrain: 'water' });

  // =================================================================================================
  // Highmarch Sewers
  // =================================================================================================
  rect(66, 231, 136, 235, 'sewer_floor'); rect(66, 245, 136, 249, 'sewer_floor');
  for (const x of [72, 100, 130]) rect(x, 231, x + 4, 249, 'sewer_floor');
  paint({ shape: 'line', points: [[68, 233], [134, 233]], width: 1, terrain: 'water' });
  paint({ shape: 'line', points: [[68, 247], [134, 247]], width: 1, terrain: 'water' });
  for (const x of [74, 102, 132]) paint({ shape: 'line', points: [[x, 233], [x, 247]], width: 1, terrain: 'water' });
  // crossings over the channels (grates)
  for (const [x, y] of [[70, 233], [86, 233], [96, 233], [112, 233], [124, 233], [80, 247], [94, 247], [110, 247], [120, 247], [74, 238], [74, 243], [102, 236], [102, 242], [132, 238], [132, 244]]) rect(x, y, x, y, 'sewer_floor');
  circ(88, 240, 5, 'sewer_floor', { jitter: 0 }); circ(88, 240, 2.5, 'water', { jitter: 0 });         // overflow cistern
  rect(80, 239, 84, 241, 'sewer_floor'); rect(92, 239, 100, 241, 'sewer_floor');
  rect(104, 239, 108, 241, 'sewer_floor'); rect(108, 237, 122, 243, 'sewer_floor');                   // rat nest

  // =================================================================================================
  // Hollowpick Mine
  // =================================================================================================
  rect(148, 230, 156, 236, 'cave_floor');
  tunnel([[152, 233], [170, 234], [186, 232], [200, 236]], 3, 'gravel');
  tunnel([[166, 234], [164, 246], [176, 250]], 3, 'cave_floor');
  tunnel([[186, 232], [190, 244], [204, 248]], 3, 'cave_floor');
  circ(178, 243, 5, 'cave_floor');                                    // collapsed hall
  tunnel([[176, 250], [178, 243]], 2.5, 'cave_floor');
  circ(201, 237, 4, 'cave_floor');                                    // old dwarf camp
  circ(206, 248, 5, 'obsidian'); circ(208, 249, 2.2, 'lava', { jitter: 0.4 });   // Forgeheart

  // =================================================================================================
  // Sandswallowed Vaults
  // =================================================================================================
  rect(218, 229, 228, 237, 'sandstone_floor');
  rect(228, 231, 262, 235, 'sandstone_floor');
  rect(232, 239, 240, 247, 'sandstone_floor'); rect(235, 235, 237, 239, 'sandstone_floor');
  rect(246, 239, 254, 247, 'sandstone_floor'); rect(249, 235, 251, 239, 'sandstone_floor');
  rect(261, 235, 264, 238, 'sandstone_floor'); rect(258, 238, 268, 252, 'sandstone_floor');
  for (const [cx, cy, r] of [[222, 236, 2], [250, 245, 2], [264, 250, 2.5], [244, 233, 1.5]]) paint({ shape: 'circle', cx, cy, r, terrain: 'red_sand', jitter: 1, only: ['sandstone_floor'] });

  // =================================================================================================
  // Starcaller's Study (an upper-floor interior; lit, not a dungeon)
  // =================================================================================================
  rect(272, 236, 284, 250, 'stone_floor', { height: 1.0 });

  // =================================================================================================
  // Cinder Depths (inside the basalt massif, Wilderness)
  // =================================================================================================
  paint({ shape: 'rect', x0: 252, y0: 1, x1: 286, y1: 28, terrain: 'void', raise: -1.5, falloff: 2 });
  circ(262, 24, 3.5, 'obsidian');
  tunnel([[262, 24], [268, 16], [266, 9], [277, 6]], 3, 'obsidian');
  circ(276, 16, 6, 'obsidian'); circ(277, 16, 2.8, 'lava', { jitter: 0.6 });
  circ(278, 6, 4.5, 'scorched');
  tunnel([[268, 16], [259, 12], [258, 5]], 2.5, 'obsidian'); circ(258, 5, 3, 'obsidian');
  paint({ shape: 'line', points: [[266, 21], [271, 19], [283, 22]], width: 1.2, terrain: 'lava', jitter: 0.3 });
  rect(270, 18, 271, 21, 'obsidian');
}

export function areas() {
  area({ id: 'sunless_deep', name: 'The Sunless Deep', x0: 0, y0: 192, x1: 44, y1: 223, priority: 10, dungeon: true, multi: true });
  area({ id: 'morrow_crypt', name: "Crypt of Morrow's Rest", x0: 0, y0: 224, x1: 60, y1: 255, priority: 10, dungeon: true });
  area({ id: 'highmarch_sewers', name: 'Highmarch Sewers', x0: 61, y0: 224, x1: 141, y1: 255, priority: 10, dungeon: true });
  area({ id: 'hollowpick', name: 'Hollowpick Mine', x0: 142, y0: 224, x1: 212, y1: 255, priority: 10, dungeon: true });
  area({ id: 'sand_vaults', name: 'Sandswallowed Vaults', x0: 213, y0: 224, x1: 270, y1: 255, priority: 10, dungeon: true });
  area({ id: 'spire_study', name: "Starcaller's Study", x0: 271, y0: 224, x1: 287, y1: 255, priority: 10 });
  area({ id: 'cinder_depths', name: 'Cinder Depths', x0: 252, y0: 0, x1: 287, y1: 29, priority: 10, dungeon: true, multi: true });
}

export function spawns() {
  // ---- surface entrances ---------------------------------------------------------------------------------
  obj('morrow_mausoleum', 57, 173);
  obj('sewer_manhole', 157, 98);
  obj('sewer_outflow_out', 121, 105, 1);
  obj('hollowpick_adit', 234, 94, 2);
  obj('temple_stairs', 264, 186);
  obj('cinder_mouth', 255, 31);

  // =================================================================================================
  // The Sunless Deep
  // =================================================================================================
  objs('crystal_purple', [[21, 199], [27, 205], [20, 204], [28, 199]]); obj('crystal_large', 24, 201);
  objs('stalagmite_dark', [[30, 194], [18, 210], [34, 205], [6, 202], [16, 213], [39, 211]]);
  obj('waterfall_tall', 11, 200); objs('mushrooms_glow', [[8, 210], [16, 203], [6, 206]]); obj('giant_mushroom_glow', 17, 205);
  objs('cobweb', [[33, 206], [38, 208], [35, 212], [39, 207]]); objs('bones_pile', [[36, 210], [34, 207]]);
  obj('hoard_pile', 29, 215); obj('hoard_pile', 27, 219); objs('bones_scattered', [[25, 216], [31, 218]]); obj('dragon_skull', 31, 213, 2);
  npcScatter(['gloom_widow'], [31, 205, 41, 213], 3, 9101, 3, { terrain: ['cave_floor'] });
  npcScatter(['ironbound_golem'], [19, 197, 29, 207], 2, 9102, 3, { terrain: ['cave_floor'] });
  npc('shardstone_golem', 12, 212, 3);
  npcScatter(['drakeling'], [22, 210, 34, 222], 2, 9103, 3, { terrain: ['dark_stone', 'cave_floor'] });
  npc('crimson_dragon', 28, 218, 2);
  item('coins', 28, 216, 250, 300); item('ancient_coin', 26, 218, 1, 400);

  // =================================================================================================
  // Crypt of Morrow's Rest
  // =================================================================================================
  obj('crypt_stairs_up', 12, 231);
  objs('torch_stake_green', [[9, 231], [17, 231], [9, 237], [17, 237]]);
  objs('coffin', [[23, 229], [25, 229], [31, 229], [33, 229], [23, 239], [25, 239], [31, 239]]); obj('coffin_open', 33, 239);
  objs('sarcophagus', [[42, 230], [52, 230], [42, 238], [52, 238]]);
  for (const [x, y] of [[44, 231], [50, 231], [44, 239], [50, 239]]) obj('pillar', x, y);
  objs('bones_pile', [[46, 233], [48, 236], [43, 235], [51, 234], [47, 240]]); objs('bones_scattered', [[45, 229], [49, 241], [20, 234]]);
  objs('cobweb', [[40, 228], [54, 228], [8, 230], [30, 246], [54, 253]]);
  obj('sarcophagus_gilded', 42, 247); obj('throne_ruined', 42, 250, 2);
  objs('brazier_blue', [[38, 248], [46, 248], [38, 252], [46, 252]]); objs('candelabra', [[33, 247], [51, 247]]);
  objs('statue_headless', [[31, 249], [53, 249]]);
  readable('hollow_king', 44, 247, 'Engraved lid', '"Here lies the Hollow King, who ruled the vale before Brackenford had a name. He will rise when the last lantern of Morrow\'s Rest goes dark." Someone has been letting the lanterns go out.', 0, { model: { template: 'gravestone' } });
  objs('coffin', [[4, 242], [8, 245], [4, 249]]); objs('lily_pads_plain', [[6, 244], [6, 249]]);
  npcScatter(['skeleton'], [8, 230, 40, 240], 4, 9201, 3, { terrain: ['crypt_floor'] });
  npcScatter(['zombie'], [18, 228, 36, 240], 3, 9202, 3, { terrain: ['crypt_floor'] });
  npcScatter(['wailing_shade', 'bone_archer'], [40, 228, 54, 242], 4, 9203, 4, { terrain: ['crypt_floor'] });
  npc('grave_wraith', 47, 235, 3);
  npcScatter(['rot_specter'], [32, 246, 52, 253], 2, 9204, 3, { terrain: ['crypt_floor'] });
  npcScatter(['drowned_one'], [3, 238, 9, 252], 2, 9205, 2, { terrain: ['crypt_floor'] });
  item('ancient_coin', 43, 249, 1, 400); item('big_bones', 47, 233, 1, 120); item('coins', 5, 251, 40, 200);

  // =================================================================================================
  // Highmarch Sewers
  // =================================================================================================
  obj('sewer_ladder', 68, 232);
  obj('sewer_outflow_in', 136, 249, 1);
  for (const [x, y] of [[70, 233], [86, 233], [96, 233], [112, 233], [124, 233], [80, 247], [94, 247], [110, 247], [120, 247], [74, 238], [74, 243], [102, 236], [102, 242], [132, 238], [132, 244]]) obj('sewer_grate', x, y);
  objs('pipe_valve', [[67, 235], [99, 231], [129, 235], [136, 245], [76, 249]]);
  objs('barrel', [[79, 231], [118, 249]]); objs('crate', [[119, 249], [90, 235]]);
  objs('bones_scattered', [[112, 239], [118, 242], [84, 245]]); objs('bones_pile', [[115, 240], [121, 238]]);
  objs('mushrooms_brown', [[106, 249], [72, 245], [131, 231]]); objs('cobweb', [[66, 245], [136, 231], [122, 243]]);
  objs('sacks', [[109, 238], [121, 242]]); obj('cart_broken', 116, 237);
  readable('sewer_scrawl', 104, 240, 'Scrawled wall', '"THE KING OF RATS SEES ALL" - and underneath, in neater writing: "No he doesn\'t. He\'s just a big rat. - Sewer Maintenance."', 0, { model: { template: 'sign' } });
  npcScatter(['giant_rat'], [66, 231, 136, 249], 10, 9301, 5, { terrain: ['sewer_floor'] });
  npcScatter(['gloom_crawler', 'shalestone_slug'], [66, 231, 136, 249], 6, 9302, 4, { terrain: ['sewer_floor'] });
  npcScatter(['zombie'], [100, 231, 136, 249], 3, 9303, 4, { terrain: ['sewer_floor'] });

  // =================================================================================================
  // Hollowpick Mine
  // =================================================================================================
  obj('mine_rope', 149, 231);
  objs('mine_support', [[156, 233], [162, 234], [170, 234], [178, 233], [186, 232], [194, 234], [165, 240], [189, 240], [196, 246]]);
  obj('rails', 157, 234, 0, { w: 10, h: 1 }); obj('rails', 172, 233, 0, { w: 10, h: 1 });
  objs('minecart_tipped', [[168, 235], [192, 238]]); obj('minecart_ore', 184, 233); obj('minecart', 155, 231);
  objs('rubble', [[176, 241], [180, 245], [182, 241], [174, 244], [166, 246]]); objs('crag_cave', [[179, 239], [174, 246]]);
  obj('tent_ragged', 199, 236); obj('campfire', 202, 239); objs('crate_stack', [[203, 235], [198, 240]]); obj('bed_straw', 204, 237);
  readable('dwarf_diary', 200, 239, 'Torn journal', '"Day 40. The singing in the deep seam is louder. Grimbold says it is the wind. There is no wind down here." The rest of the pages are blank.', 0, { model: { template: 'dec_desk' } });
  objs('stalagmite', [[160, 244], [170, 251], [192, 246], [200, 251], [182, 249]]);
  objs('lava_rock', [[204, 246], [210, 250], [203, 251]]); objs('obsidian_spike', [[202, 249], [211, 246]]); obj('embers', 207, 247);
  objs('crystal_red', [[205, 245], [210, 252]]);
  npcScatter(['cave_bat'], [148, 230, 204, 252], 4, 9401, 5);
  npcScatter(['pitch_scorpion', 'shalestone_slug'], [150, 230, 190, 252], 5, 9402, 4);
  npcScatter(['loam_elemental'], [170, 238, 186, 250], 2, 9403, 3);
  npc('crag_troll', 196, 244, 3); npc('stone_grotesque', 205, 247, 2);
  item('bread', 201, 238, 1, 100); item('coins', 207, 251, 60, 250);

  // =================================================================================================
  // Sandswallowed Vaults
  // =================================================================================================
  obj('temple_stairs_up', 220, 230);
  for (let x = 230; x <= 260; x += 4) { obj('pillar_sand', x, 231); obj(x % 8 ? 'pillar_sand' : 'pillar_sand_broken', x, 235); }
  objs('brazier', [[219, 236], [227, 236], [258, 239], [268, 239]]);
  objs('statue_sun', [[233, 240], [239, 240], [247, 240], [253, 240]]);
  objs('sarcophagus_sand', [[234, 243], [238, 243], [248, 243], [252, 243]]);
  obj('sarcophagus_gilded', 263, 246); objs('statue_sun', [[259, 245], [267, 245]]); obj('shrine_sun', 263, 249);
  objs('hoard_pile', [[260, 251], [266, 251]]); objs('stalagmite_sand', [[221, 230], [227, 230], [244, 246], [256, 236]]);
  objs('bones_pile', [[236, 246], [250, 246], [262, 241]]); objs('cobweb', [[218, 229], [262, 231], [232, 239], [254, 247]]);
  readable('sun_mural', 263, 239, 'Faded mural', 'A painted procession of Sun-Wardens carries a golden disc into the dark. In the final panel, the disc has eyes.', 0, { model: { template: 'sign' } });
  npcScatter(['skeleton', 'bone_archer'], [228, 231, 262, 235], 5, 9501, 4, { terrain: ['sandstone_floor', 'red_sand'] });
  npcScatter(['thirst_bat'], [232, 239, 254, 247], 3, 9502, 4, { terrain: ['sandstone_floor', 'red_sand'] });
  npcScatter(['skeleton_warden'], [258, 240, 268, 250], 2, 9503, 3, { terrain: ['sandstone_floor', 'red_sand'] });
  item('coins', 262, 251, 120, 300); item('ancient_coin', 265, 251, 1, 400);

  // =================================================================================================
  // Starcaller's Study
  // =================================================================================================
  building("Starcaller's Study", 273, 237, 11, 12, 'wall_stone', '#3a4a9a', [], { floor: 'wood_floor' });
  obj('spire_ladder', 276, 240);
  objs('bookshelf', [[274, 238], [275, 238], [277, 238], [278, 238], [280, 238], [281, 238]]);
  obj('desk', 280, 242); obj('chair_dark', 280, 243, 2); obj('crystal_large', 282, 246); obj('cauldron_purple', 275, 246);
  obj('rug_purple', 277, 242, 0, { w: 3, h: 4 }); objs('candelabra_gold', [[274, 242], [282, 240]]);
  obj('bed_blue', 274, 244); obj('shelves_potions', 282, 238); obj('armour_stand_dark', 276, 247); obj('potted_plant', 279, 247);
  obj('treasure_chest', 281, 247); obj('wisps_blue', 278, 241);
  readable('star_notes', 279, 242, 'Star charts', '"The Wyrm constellation has moved again. Three degrees east since the Calder fell. When it touches the Pale Moon, the ash will wake." Most of the notes are doodles of cats.', 0, { model: { template: 'dec_desk' } });

  // =================================================================================================
  // Cinder Depths
  // =================================================================================================
  obj('cinder_rope', 260, 25);
  objs('obsidian_spike', [[259, 22], [265, 22], [270, 13], [282, 14], [272, 21], [274, 8], [283, 8]]);
  objs('lava_rock', [[264, 26], [263, 19], [279, 20], [271, 11], [275, 3]]); objs('embers', [[276, 13], [265, 18], [279, 6]]);
  objs('bones_pile', [[276, 4], [281, 7], [257, 7]]); obj('dragon_skull', 281, 3, 2); obj('hoard_pile', 278, 8); obj('hoard_pile', 280, 5);
  obj('treasure_chest_open', 258, 4); objs('crystal_red', [[256, 6], [260, 3]]);
  npcScatter(['ember_elemental', 'ashfiend'], [262, 8, 282, 22], 4, 9601, 3, { terrain: ['obsidian'] });
  npcScatter(['ash_devil'], [256, 3, 270, 20], 2, 9602, 3, { terrain: ['obsidian'] });
  npc('pyre_fiend', 272, 16, 2); npc('obsidian_dragon', 278, 6, 2);
  item('coins', 279, 7, 600, 400); item('ancient_coin', 258, 5, 2, 400); item('big_bones', 280, 9, 1, 150);
}

export function decor() {
  scatter([{ id: 'stalagmite', weight: 2 }, { id: 'pebbles_dark', weight: 3 }, { id: 'mushrooms_glow', weight: 1 }], [0, 192, 44, 223], { density: 0.05, seed: 9701, spacing: 1, terrain: ['cave_floor'] });
  scatter([{ id: 'bones_scattered', weight: 2 }, { id: 'rubble_dark', weight: 2 }, { id: 'cobweb', weight: 1 }], [0, 224, 60, 255], { density: 0.04, seed: 9702, spacing: 1, terrain: ['crypt_floor'] });
  scatter([{ id: 'pebbles', weight: 3 }, { id: 'rubble', weight: 2 }, { id: 'stalagmite', weight: 1 }], [142, 224, 212, 255], { density: 0.04, seed: 9703, spacing: 1, terrain: ['cave_floor', 'gravel'] });
  scatter([{ id: 'pebbles_sand', weight: 3 }, { id: 'rubble', weight: 1 }], [213, 224, 270, 255], { density: 0.03, seed: 9704, spacing: 1, terrain: ['sandstone_floor', 'red_sand'] });
  scatter([{ id: 'pebbles_dark', weight: 3 }, { id: 'lava_rock', weight: 1 }], [252, 0, 287, 29], { density: 0.04, seed: 9705, spacing: 1, terrain: ['obsidian', 'scorched'] });
}
