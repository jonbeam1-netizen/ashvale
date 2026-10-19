// The eastern lands (x 183-287, y 49-200). OWNER: agent D (world builder).
//
// Greyspine Mountains (183-240, 46-110) with the dwarven hold of DURNHOLD (199-229, 58-94):
//   Highmarch pass (182-199, 74-80) -> Durn Arch (199,76) · Great Hall (206-218,60-68)
//   Forge Hall (201-209,82-90) · Stonemug tavern (214-222,84-91) · Deep Seams mining floor (214-228,72-80)
//   Frostgate path north to the Wilderness (211-215, 49-58) · Durn Falls cistern (226,62)
//   Hollowpick Mine adit (234,94) -> dungeon (see dungeons.js)
// Bramblemoor heath (192-240, 110-134): Starcaller's Spire (218,120), shepherd's fold, cairns
// Faelwood (241-287, 49-128) and the elven town of ILVAREN (252-282, 66-100): Moonwell (265,81),
//   Hall of Leaves, Archive, Eldertree, Silverfall cascade (284,62), Lantern Grove (250,118)
// Sunscar Badlands (192-287, 134-198): Haverly Pass (179-198, 156-161), Scorchgulch canyon,
//   DUSTWATCH outpost (228-250, 146-166), Sunwell oasis (270,152), Sandswallowed Temple (258-272,178-192),
//   Wreckers' Cove (222-242, 190-198)

import { registerObject } from '../../core/registry.js';
import { paint, area, obj, objs, npc, npcScatter, scatter, line, road, keepClear, keepClearCircle, building, bridge, signpost, readable, item, SPOTS } from './util.js';

// ---- local object variants ----------------------------------------------------------------------------
registerObject({ id: 'durn_arch', name: 'Durn Arch', examine: 'The carved gateway of Durnhold. Runes along the lintel read "STRENGTH, STONE, SUPPER".', blocks: false, size: [3, 1], model: { template: 'dec_arch', color: '#5e5a54' } });
registerObject({ id: 'pillar_sand', name: 'Sandstone pillar', examine: 'Carved with suns and serpents.', model: { template: 'pillar', color: '#c8a878' } });
registerObject({ id: 'pillar_sand_broken', name: 'Broken pillar', examine: 'The sand has swallowed half of it.', model: { template: 'pillar', broken: true, color: '#b89868' } });
registerObject({ id: 'wall_ruined_sand', name: 'Crumbling wall', examine: 'Sandstone, scoured by the wind.', model: { template: 'dec_ruined_wall', color: '#c0a070' } });
registerObject({ id: 'pillar_elven', name: 'White pillar', examine: 'Smooth as a river stone.', model: { template: 'pillar', color: '#e4e2dc' } });
registerObject({
  id: 'starcaller_spire', name: "Starcaller's Spire", examine: 'A slender tower of grey-violet stone. The door is ajar and lamplight flickers within.',
  size: [4, 4], options: ['Enter'], teleport: { x: SPOTS.spireStudy[0], y: SPOTS.spireStudy[1], message: 'You climb the long spiral stair to the study at the top of the tower...' },
  model: { template: 'dec_tower_spire' }, mapIcon: { char: '*', color: '#a0b0ff' },
});

export function paintTerrain() {
  // =================================================================================================
  // Greyspine Mountains & Durnhold
  // =================================================================================================
  paint({ shape: 'rect', x0: 192, y0: 46, x1: 240, y1: 110, terrain: 'mountain', jitter: 2.5, raise: 5, falloff: 3, noise: { amp: 1.6, scale: 4 } });
  for (const [cx, cy, r] of [[197, 55, 5], [230, 54, 6], [203, 103, 5], [236, 104, 4], [190, 96, 4], [222, 100, 4], [238, 66, 4], [194, 66, 3.5]]) {
    paint({ shape: 'circle', cx, cy, r, terrain: 'snow', jitter: 1.5, raise: 1.5, falloff: 2, only: ['mountain'], blocked: true });
  }
  // walkable valleys (blocked:false clears the ridge's forced collision)
  const carve = (x0, y0, x1, y1, terrain, height, falloff = 2) => paint({ shape: 'rect', x0, y0, x1, y1, terrain, height, falloff, blocked: false, jitter: 0.6 });
  carve(182, 74, 200, 80, 'gravel', 2.2);                       // Highmarch pass
  carve(199, 58, 229, 94, 'stone', 3.0, 3);                      // Durnhold plateau
  carve(209, 94, 216, 112, 'gravel', 2.2);                       // south valley to Bramblemoor
  carve(210, 46, 216, 58, 'gravel', 2.4);                        // Frostgate path to the Wilderness
  carve(229, 74, 242, 80, 'gravel', 2.4);                        // east pass to Faelwood
  carve(231, 80, 238, 93, 'gravel', 2.6);                        // spur to the Hollowpick adit
  paint({ shape: 'rect', x0: 210, y0: 46, x1: 216, y1: 50, height: 1.0, falloff: 2 });   // meet the ditch level
  // hold streets & floors
  road([[183, 77], [214, 77]], 3, 'cobble', 0.2);
  road([[212, 68], [212, 94], [212, 111]], 3, 'cobble', 0.2);
  road([[212, 58], [213, 49]], 2, 'gravel', 0.3);
  road([[214, 77], [242, 77]], 2, 'gravel', 0.3);
  road([[234, 80], [235, 92]], 2, 'gravel', 0.3);
  paint({ shape: 'rect', x0: 214, y0: 71, x1: 228, y1: 81, terrain: 'stone', noScatter: true });      // Deep Seams (agent B mining floor)
  paint({ shape: 'circle', cx: 207, cy: 77, r: 4, terrain: 'dark_stone', noScatter: true });           // statue plaza
  paint({ shape: 'circle', cx: 226, cy: 62, r: 2.3, terrain: 'water', jitter: 0.3 });                  // Durn Falls cistern
  keepClear(199, 58, 229, 94);

  // =================================================================================================
  // Bramblemoor
  // =================================================================================================
  paint({ shape: 'rect', x0: 192, y0: 108, x1: 240, y1: 136, terrain: 'heath', jitter: 3, except: ['mountain', 'snow'] });
  for (const [cx, cy, r, h] of [[218, 121, 7, 1.8], [200, 116, 5, 1.2], [232, 128, 5, 1.0], [205, 130, 4, 0.8]]) paint({ shape: 'circle', cx, cy, r, raise: h, falloff: 5 });
  paint({ shape: 'circle', cx: 219, cy: 122, r: 4, terrain: 'stone', jitter: 0.8, noScatter: true });
  road([[212, 111], [215, 116], [215, 125], [219, 125], [226, 132], [238, 146]], 2);                             // Durnhold -> Spire -> Dustwatch
  road([[219, 125], [240, 118], [258, 110], [264, 100]], 2);                                          // Spire -> Ilvaren
  paint({ shape: 'circle', cx: 200, cy: 116, r: 1.5, terrain: 'gravel' });

  // =================================================================================================
  // Faelwood & Ilvaren
  // =================================================================================================
  paint({ shape: 'rect', x0: 241, y0: 49, x1: 287, y1: 128, terrain: 'glade_grass', jitter: 3, except: ['mountain', 'snow'] });
  paint({ shape: 'rect', x0: 241, y0: 49, x1: 287, y1: 128, blocked: false, only: ['glade_grass'] });
  for (const [cx, cy, r] of [[248, 60, 5], [282, 110, 6], [246, 98, 4], [286, 52, 4]]) paint({ shape: 'circle', cx, cy, r, terrain: 'dark_grass', jitter: 2 });
  for (const [cx, cy, r] of [[258, 104, 3], [276, 60, 3], [250, 84, 2.5]]) paint({ shape: 'circle', cx, cy, r, terrain: 'flowers', jitter: 1.5 });
  // Silverfall stream: cascade in the north-east corner, down to the Silvermere pool
  paint({ shape: 'circle', cx: 283, cy: 64, r: 3, terrain: 'water', jitter: 0.6 });
  paint({ shape: 'line', points: [[283, 64], [284, 90], [278, 106], [271, 112]], width: 2, terrain: 'water', jitter: 0.4 });
  paint({ shape: 'circle', cx: 268, cy: 114, r: 4.5, terrain: 'water', jitter: 1 });
  paint({ shape: 'rect', x0: 278, y0: 57, x1: 287, y1: 61, terrain: 'mountain', raise: 3.5, falloff: 2, blocked: true });
  // town ground
  paint({ shape: 'rect', x0: 252, y0: 66, x1: 282, y1: 100, height: 1.6, falloff: 4, noScatter: true });
  paint({ shape: 'circle', cx: 266, cy: 82, r: 5.5, terrain: 'stone_floor', noScatter: true });
  road([[242, 77], [252, 78], [261, 82]], 2, 'gravel', 0.2);
  road([[266, 87], [266, 98], [264, 100]], 2, 'gravel', 0.2);
  road([[262, 76], [262, 78]], 2, 'gravel', 0.1);
  road([[271, 82], [281, 84]], 2, 'gravel', 0.2);
  bridge(282, 83, 285, 85, { rails: true });
  // the Lantern Grove (hidden)
  paint({ shape: 'circle', cx: 250, cy: 118, r: 4, terrain: 'moss', jitter: 1, noScatter: true });

  // =================================================================================================
  // Sunscar Badlands
  // =================================================================================================
  paint({ shape: 'rect', x0: 192, y0: 134, x1: 287, y1: 198, terrain: 'red_sand', jitter: 3, height: 1.0, falloff: 4, blocked: false, except: ['mountain'] });
  paint({ shape: 'rect', x0: 192, y0: 196, x1: 287, y1: 199, terrain: 'sand', jitter: 1.5 });
  for (const [cx, cy, r] of [[214, 146, 5], [256, 140, 6], [278, 176, 5], [236, 182, 4], [208, 188, 4], [276, 136, 4]]) paint({ shape: 'circle', cx, cy, r, terrain: 'cracked_earth', jitter: 2 });
  // Haverly pass through the Craghorn ridge
  carve(178, 156, 199, 161, 'gravel', 1.4);
  road([[158, 159], [170, 159], [181, 158], [198, 158], [228, 156]], 2);
  // mesas
  for (const [cx, cy, r] of [[205, 141, 4], [226, 136, 3], [262, 136, 3.5], [283, 150, 3.5], [250, 186, 3], [273, 168, 3], [196, 150, 2.5], [258, 162, 2.5]]) {
    paint({ shape: 'circle', cx, cy, r, terrain: 'redrock', raise: 3.5, falloff: 1.5, jitter: 1.2, noise: { amp: 0.6, scale: 3 } });
  }
  // Scorchgulch canyon
  paint({ shape: 'line', points: [[196, 164], [208, 163], [222, 166]], width: 3, terrain: 'redrock', raise: 3, falloff: 1, jitter: 0.8 });
  paint({ shape: 'line', points: [[196, 177], [210, 178], [222, 175]], width: 3, terrain: 'redrock', raise: 3, falloff: 1, jitter: 0.8 });
  paint({ shape: 'line', points: [[195, 170], [222, 170]], width: 3, terrain: 'cracked_earth', jitter: 0.8 });
  // Dustwatch
  paint({ shape: 'rect', x0: 228, y0: 146, x1: 250, y1: 166, terrain: 'cracked_earth', height: 1.2, falloff: 3, noScatter: true });
  road([[228, 156], [250, 156]], 2, 'dirt', 0.2); road([[239, 146], [239, 166], [240, 178], [232, 192]], 2, 'dirt', 0.3);
  // Sunwell oasis
  paint({ shape: 'circle', cx: 270, cy: 152, r: 6, terrain: 'grass', jitter: 1.2 });
  paint({ shape: 'circle', cx: 270, cy: 152, r: 3.2, terrain: 'water', jitter: 0.6 });
  road([[250, 156], [263, 154]], 2, 'dirt', 0.3);
  // Sandswallowed Temple
  paint({ shape: 'rect', x0: 258, y0: 178, x1: 272, y1: 192, terrain: 'sandstone_floor', jitter: 1, height: 1.4, falloff: 2, noScatter: true });
  paint({ shape: 'rect', x0: 256, y0: 176, x1: 274, y1: 194, terrain: 'red_sand', jitter: 1.5, only: ['cracked_earth'] });
  road([[250, 156], [256, 168], [264, 177]], 2, 'dirt', 0.4);
  // Wreckers' Cove
  paint({ shape: 'circle', cx: 232, cy: 196, r: 6, terrain: 'sand', jitter: 1.5 });
}

export function areas() {
  area({ id: 'greyspine', name: 'Greyspine Mountains', x0: 183, y0: 49, x1: 240, y1: 110, priority: 2 });
  area({ id: 'durnhold', name: 'Durnhold', x0: 199, y0: 58, x1: 229, y1: 94, priority: 5 });
  area({ id: 'durn_hall', name: 'Great Hall of Durnhold', x0: 206, y0: 60, x1: 218, y1: 68, priority: 6 });
  area({ id: 'stonemug', name: 'The Stonemug', x0: 214, y0: 84, x1: 222, y1: 91, priority: 6 });
  area({ id: 'deep_seams', name: 'The Deep Seams', x0: 214, y0: 71, x1: 228, y1: 81, priority: 6 });
  area({ id: 'frostgate', name: 'Frostgate Path', x0: 209, y0: 49, x1: 217, y1: 57, priority: 3 });
  area({ id: 'bramblemoor', name: 'Bramblemoor', x0: 192, y0: 111, x1: 240, y1: 133, priority: 2 });
  area({ id: 'starcaller', name: "Starcaller's Spire", x0: 213, y0: 116, x1: 225, y1: 128, priority: 4 });
  area({ id: 'faelwood', name: 'Faelwood', x0: 241, y0: 49, x1: 287, y1: 128, priority: 2 });
  area({ id: 'ilvaren', name: 'Ilvaren', x0: 252, y0: 66, x1: 282, y1: 100, priority: 5 });
  area({ id: 'lantern_grove', name: 'The Lantern Grove', x0: 245, y0: 113, x1: 255, y1: 123, priority: 4 });
  area({ id: 'silverfall', name: 'Silverfall', x0: 278, y0: 58, x1: 287, y1: 70, priority: 4 });
  area({ id: 'sunscar', name: 'Sunscar Badlands', x0: 192, y0: 134, x1: 287, y1: 199, priority: 2 });
  area({ id: 'haverly_pass', name: 'Haverly Pass', x0: 178, y0: 154, x1: 199, y1: 163, priority: 3 });
  area({ id: 'scorchgulch', name: 'Scorchgulch', x0: 194, y0: 162, x1: 223, y1: 179, priority: 3 });
  area({ id: 'dustwatch', name: 'Dustwatch', x0: 228, y0: 146, x1: 250, y1: 166, priority: 5 });
  area({ id: 'sunwell', name: 'Sunwell Oasis', x0: 263, y0: 145, x1: 277, y1: 159, priority: 4 });
  area({ id: 'sand_temple', name: 'Sandswallowed Temple', x0: 256, y0: 176, x1: 274, y1: 194, priority: 4 });
  area({ id: 'wreckers_cove', name: "Wreckers' Cove", x0: 222, y0: 189, x1: 242, y1: 199, priority: 4 });
}

export function spawns() {
  // =================================================================================================
  // Durnhold
  // =================================================================================================
  obj('durn_arch', 199, 76, 1);
  obj('turret_dwarf', 197, 72); obj('turret_dwarf', 197, 79);
  objs('flag_orange', [[201, 74], [201, 80]]);
  objs('brazier', [[203, 75], [203, 79], [210, 75], [210, 79], [210, 70], [214, 70]]);
  obj('statue_dwarf', 207, 74);
  objs('banner_dwarf', [[205, 73], [209, 73]]);
  // Great Hall
  building('Great Hall of Durnhold', 206, 60, 13, 9, 'wall_dwarven', '#3a3a40', [{ side: 's', offset: 6, width: 1 }], { floor: 'dark_stone' });
  obj('throne', 212, 61);
  obj('rug_red', 211, 62, 0, { w: 3, h: 6 });
  for (const y of [63, 64, 65]) { obj('table', 208, y); obj('stool', 207, y); obj('stool', 209, y); obj('table', 216, y); obj('stool', 215, y); obj('stool', 217, y); }
  objs('brazier', [[208, 61], [216, 61]]); objs('banner_dwarf', [[207, 61], [217, 61]]);
  objs('armour_stand', [[207, 67], [217, 67]]);
  obj('keg_rack', 210, 61); obj('keg_rack', 214, 61);
  readable('durn_tablet', 213, 67, 'Stone tablet', '"Durnhold. Founded by Thane Borrik Ironvein in the Year of the Long Dig. Visitors are welcome. Visitors who touch the beer without paying are welcome to leave."', 0, { model: { template: 'gravestone' } });
  // Forge Hall (room left for a production furnace/anvil inside: tiles 204-207, 84-88)
  building('Forge Hall', 201, 82, 9, 9, 'wall_dwarven', '#3a3a40', [{ side: 'n', offset: 4, width: 2 }], { floor: 'dark_stone' });
  obj('forge_hearth', 202, 87); obj('anvil_great', 208, 84); obj('weapon_rack_dwarf', 208, 87, 1); obj('armour_stand', 208, 89); obj('sacks_coal', 202, 83); obj('sacks_coal', 203, 83);
  // Stonemug tavern
  building('The Stonemug', 214, 84, 9, 8, 'wall_dwarven', '#4a3a30', [{ side: 'w', offset: 3 }], { doorObject: 'door_wood', floor: 'wood_floor' });
  for (const y of [85, 86, 87]) obj('bar_counter', 220, y, 1);
  objs('keg_rack', [[221, 85], [221, 87]]); obj('barrel_stack', 221, 89);
  obj('table', 216, 86); objs('stool', [[215, 86], [217, 86]]); obj('table', 217, 89); objs('stool', [[216, 89], [218, 89]]);
  obj('fireplace', 215, 90, 2);
  objs('barrel_stack', [[223, 92], [209, 91]]); objs('crate_stack', [[204, 69], [228, 82]]); objs('lantern_post', [[204, 81], [219, 82], [219, 69]]);
  // houses
  building('Dwarf house', 222, 66, 6, 5, 'wall_dwarven', '#3a3a40', [{ side: 'w', offset: 2 }]);
  obj('bed_red', 226, 67); obj('table', 224, 69); obj('stool', 225, 69); obj('treasure_chest', 223, 67);
  building('Dwarf house', 224, 83, 6, 6, 'wall_dwarven', '#3a3a40', [{ side: 'w', offset: 2 }]);
  obj('bed_green', 228, 84); obj('fireplace', 227, 87, 2); obj('weapon_rack_dwarf', 225, 84);
  building('Mason guild', 200, 60, 6, 7, 'wall_dwarven', '#4a4040', [{ side: 's', offset: 2 }]);
  obj('anvil_great', 201, 62); obj('rubble', 203, 64); obj('desk', 201, 65);
  // Deep Seams dressing (rocks themselves are agent B's)
  obj('rails', 214, 79, 0, { w: 8, h: 1 }); obj('rails', 222, 79, 0, { w: 7, h: 1 });
  obj('minecart_ore', 216, 79); obj('minecart', 225, 79);
  objs('mine_support', [[214, 72], [220, 72], [226, 72]]); objs('lantern_post', [[215, 73], [228, 74]]);
  // Durn Falls
  obj('waterfall_tall', 225, 59); objs('reeds', [[224, 64], [228, 63]]);
  // south gate & valley
  obj('turret_dwarf', 207, 92); obj('turret_dwarf', 215, 92);
  signpost(214, 96, 'North: Durnhold. South: Bramblemoor and Starcaller\'s Spire. Beyond: the Sunscar Badlands.');
  signpost(200, 74, 'West: Highmarch. East: Durnhold, then the Faelwood and Ilvaren. North: the Frostgate Path to the Wilderness.');
  signpost(214, 57, 'North: the Wilderness. You have been warned. South: Durnhold.');
  // Hollowpick adit spur
  objs('mine_support', [[233, 84], [236, 88]]); obj('cart_broken', 232, 90); objs('bones_scattered', [[236, 91]]);
  readable('hollowpick_sign', 233, 92, 'Warning sign', '"HOLLOWPICK MINE - CLOSED. Too deep, too dark, too many teeth. - by order of the Thane."', 0, { model: { template: 'sign' } });
  // townsfolk
  npcScatter(['villager'], [203, 70, 228, 80], 4, 8101, 5);
  npc('town_guard', 201, 77, 1); npc('town_guard', 212, 93, 1);
  npc('crag_troll', 235, 86, 2);

  // =================================================================================================
  // Bramblemoor
  // =================================================================================================
  obj('starcaller_spire', 218, 120);
  objs('crystal_lamp', [[216, 124], [223, 124], [216, 119], [223, 119]]);
  obj('statue_bronze', 222, 126);
  objs('flower_bed', [[219, 117], [216, 127]]);
  readable('spire_sign', 220, 125, 'Brass plate', '"MAGISTER ORRIN VALE, STARCALLER. Visitors by appointment. Hawkers will be turned into toads (again)."', 0, { model: { template: 'sign' } });
  // shepherd's fold
  line('stone_wall_low', [[196, 116], [204, 116], [204, 123], [196, 123], [196, 116]], [[200, 123]]);
  building("Shepherd's bothy", 205, 117, 5, 4, 'wall_log', '#5a5040', [{ side: 's', offset: 2 }]);
  obj('bed_straw', 206, 118); obj('woodpile', 210, 120);
  npc('cow', 199, 119, 2); npc('cow', 202, 121, 2); npc('cow', 198, 121, 2);
  // cairns & crags
  objs('rocks', [[232, 128], [233, 127]]); obj('menhir', 232, 129); obj('crag_large', 228, 112); obj('crag', 194, 128);
  npcScatter(['highway_bandit'], [222, 126, 238, 140], 2, 8202, 4);

  // =================================================================================================
  // Faelwood & Ilvaren
  // =================================================================================================
  obj('elven_arch', 252, 77, 1); obj('elven_arch', 265, 99);
  obj('moonwell', 265, 81);
  building('Hall of Leaves', 258, 68, 9, 8, 'wall_elven', '#2a7a6a', [{ side: 's', offset: 4 }], { floor: 'stone_floor' });
  obj('statue_elf', 262, 70); obj('rug_green', 261, 72, 0, { w: 3, h: 3 }); objs('crystal_lamp_gold', [[259, 69], [265, 69]]); objs('potted_flowers', [[259, 74], [265, 74]]); obj('bench_stone', 259, 72);
  building('The Archive', 270, 68, 8, 7, 'wall_elven', '#2a6a7a', [{ side: 's', offset: 3 }], { floor: 'stone_floor' });
  objs('bookshelf', [[271, 69], [272, 69], [273, 69], [275, 69], [276, 69]]); obj('desk', 274, 72); obj('chair_dark', 274, 73, 2); obj('crystal_blue', 276, 73);
  building('Elven house', 254, 86, 6, 6, 'wall_elven', '#2a7a6a', [{ side: 'e', offset: 2 }]);
  obj('bed_green', 255, 87); obj('potted_plant', 258, 87); obj('table', 256, 90); obj('wardrobe', 255, 90, 3);
  building('Elven house', 272, 88, 7, 6, 'wall_elven', '#2a6a5a', [{ side: 'w', offset: 2 }]);
  obj('bed_blue', 277, 89); obj('bookshelf', 275, 89); obj('table', 275, 91); obj('potted_flowers', 273, 92);
  building('Elven house', 260, 92, 5, 5, 'wall_elven', '#3a7a6a', [{ side: 'e', offset: 2 }]);
  obj('bed_green', 261, 93); obj('potted_plant', 263, 93);
  obj('turret_elf', 254, 80); obj('turret_elf', 278, 78);
  obj('elder_tree', 274, 77);
  objs('crystal_lamp', [[258, 78], [262, 86], [270, 86], [270, 78], [268, 90], [268, 96], [255, 84], [279, 86]]);
  objs('pillar_elven', [[262, 79], [262, 85], [269, 79], [269, 85]]);
  objs('flower_bed', [[257, 84], [272, 79]]);
  obj('waterfall_tall', 282, 61); objs('lily_pads', [[282, 65], [284, 63]]);
  objs('tree_silverleaf', [[257, 96], [270, 97], [279, 95], [254, 70], [280, 72], [253, 92]]);
  objs('banner_green', [[258, 80], [273, 86], [260, 76], [269, 76]]);
  obj('bench_stone', 268, 93); objs('potted_flowers', [[264, 77], [268, 77]]); objs('crystal_green', [[256, 95], [276, 96]]);
  readable('moonwell_plaque', 264, 84, 'Silver plaque', '"Drink, traveller, and remember. Forget, and drink again." The water tastes of mint and starlight.', 0, { model: { template: 'gravestone' } });
  signpost(250, 75, 'East: Ilvaren. West: Durnhold and the Greyspine passes. South: the Lantern Grove and Bramblemoor.');
  npcScatter(['villager'], [255, 76, 280, 98], 5, 8301, 5);
  // Lantern Grove
  obj('fairy_ring', 249, 117); obj('giant_mushroom_glow', 246, 115); obj('giant_mushroom_glow', 253, 121); obj('wisps_blue', 250, 118); obj('wisps', 247, 120);
  objs('mushrooms_glow', [[252, 116], [247, 122], [254, 118]]); obj('shrine_green', 250, 115);
  // forest creatures
  npcScatter(['timber_wolf'], [242, 100, 286, 127], 3, 8302, 5);
  npcScatter(['thornwood_bear'], [242, 50, 286, 64], 2, 8303, 4);

  // =================================================================================================
  // Sunscar Badlands
  // =================================================================================================
  signpost(181, 160, 'East: the Haverly Pass to Dustwatch and the Sunscar Badlands. West: Haverly Farms.');
  objs('skull_pike', [[199, 156], [199, 161]]);
  // Dustwatch
  {
    const gaps = [[228, 155], [228, 156], [228, 157], [238, 166], [239, 166], [240, 166], [238, 146], [239, 146], [240, 146], [250, 155], [250, 156], [250, 157]];
    line('palisade', [[228, 146], [250, 146], [250, 166], [228, 166], [228, 146]], gaps);
  }
  obj('turret_sand', 227, 145); obj('turret_sand', 249, 165);
  building("Commander's house", 230, 148, 7, 6, 'wall_sandstone', '#a85a2a', [{ side: 's', offset: 3 }], { floor: 'sandstone_floor' });
  obj('desk', 231, 149); obj('bed_red', 235, 149); obj('banner_sand', 233, 149); obj('treasure_chest', 231, 152);
  building('Trading post', 241, 148, 7, 6, 'wall_sandstone', '#c8902a', [{ side: 's', offset: 3 }], { floor: 'sandstone_floor' });
  objs('shop_counter', [[242, 150], [243, 150], [244, 150]]); objs('crate_stack', [[246, 149], [242, 152]]); obj('sacks', 246, 152);
  building('Outpost barracks', 241, 158, 8, 7, 'wall_sandstone', '#a85a2a', [{ side: 'w', offset: 3 }], { floor: 'sandstone_floor' });
  for (const x of [243, 245, 247]) obj('bed_straw', x, 159);
  obj('weapon_rack', 242, 159); obj('table', 245, 162); obj('stool', 244, 162);
  obj('well_rustic', 237, 151); objs('tent_red', [[230, 159], [233, 162]]); obj('campfire_lit', 235, 161);
  obj('cart_crates', 243, 165); objs('barrel_stack', [[237, 149], [248, 154]]); objs('flag_sand', [[236, 147], [229, 153]]);
  objs('cactus', [[229, 164], [249, 148]]);
  npc('town_guard', 239, 156, 3); npc('town_guard', 229, 156, 1); npcScatter(['villager'], [230, 154, 248, 165], 3, 8401, 4);
  // Sunwell oasis
  objs('palm_tree', [[265, 148], [275, 149], [266, 157], [274, 156]]); obj('palm_tree_tall', 270, 146); obj('palm_tree_tall', 264, 153);
  objs('reeds', [[268, 149], [273, 153]]); obj('tent_canvas', 276, 152); obj('campfire', 276, 155);
  // Scorchgulch canyon dressing
  objs('bones_pile', [[202, 170], [214, 171]]); objs('cactus_tall', [[198, 168], [218, 172]]); obj('cart_broken', 208, 169); objs('crag_red', [[200, 172], [216, 168]]);
  // Sandswallowed Temple ruins (stairs down: see dungeons.js)
  for (let i = 0; i < 6; i++) { obj(i % 2 ? 'pillar_sand' : 'pillar_sand_broken', 260, 179 + i * 2); obj(i % 3 ? 'pillar_sand' : 'pillar_sand_broken', 270, 179 + i * 2); }
  objs('wall_ruined_sand', [[258, 178], [259, 178], [262, 178], [268, 178], [271, 178], [272, 179], [258, 191], [263, 192], [272, 190]]);
  obj('statue_sun', 262, 182); obj('statue_sun', 268, 182); obj('sarcophagus_sand', 266, 189); obj('shrine_sun', 265, 180);
  objs('pebbles_sand', [[261, 186], [269, 185]]);
  readable('sun_tablet', 268, 186, 'Half-buried tablet', '"Here the Sun-Wardens kept their vigil, until the sand came for them as it comes for all things." Fresh footprints lead down the stairs.', 0, { model: { template: 'gravestone' } });
  // Wreckers' Cove
  obj('ship_wreck', 230, 191, 1); objs('crate_stack', [[226, 193], [237, 194]]); obj('anchor', 240, 195); obj('barrel_stack', 225, 196); obj('campfire', 233, 189);
  npcScatter(['saltmarsh_corsair'], [222, 189, 242, 198], 3, 8402, 3);
  item('coins', 229, 195, 30, 200);
  // badlands creatures
  npcScatter(['dune_scorpion'], [192, 134, 286, 196], 7, 8403, 5, { terrain: ['red_sand', 'cracked_earth'] });
  npcScatter(['glarehorn_lizard'], [196, 166, 222, 174], 3, 8404, 4);
  npcScatter(['highway_bandit'], [252, 160, 286, 196], 2, 8405, 4);
}

export function decor() {
  // mountains: snowy rocks on the walkable shelves
  scatter([{ id: 'rocks_snow', weight: 2 }, { id: 'snowdrift', weight: 2 }, { id: 'pebbles', weight: 2 }], [183, 46, 240, 110], { density: 0.03, seed: 8501, spacing: 1, terrain: ['snow', 'stone', 'gravel'] });
  scatter(['snow_pine', 'pine_tree'], [183, 46, 240, 110], { count: 30, seed: 8502, spacing: 2, terrain: ['snow', 'gravel'] });
  // Bramblemoor heath
  scatter([{ id: 'grass_tuft_dry', weight: 4 }, { id: 'rocks', weight: 1 }, { id: 'dead_bush', weight: 1 }, { id: 'flowers', weight: 1 }], [192, 108, 240, 136], { density: 0.06, seed: 8503, spacing: 0, terrain: ['heath'] });
  scatter([{ id: 'crag', weight: 2 }, { id: 'menhir', weight: 1 }, { id: 'tree_autumn', weight: 1 }, { id: 'pine_tree', weight: 2 }], [192, 108, 240, 136], { count: 22, seed: 8504, spacing: 3, terrain: ['heath'] });
  // Faelwood: silverleaf trees, flowers, glowing mushrooms
  scatter([{ id: 'tree_silverleaf', weight: 6 }, { id: 'tree_silverleaf_large', weight: 1 }, { id: 'tree_goldleaf', weight: 2 }, { id: 'tree_birch', weight: 2 }, { id: 'tree_blossom', weight: 1 }], [241, 49, 287, 128], { density: 0.05, seed: 8505, spacing: 1, terrain: ['glade_grass', 'dark_grass', 'flowers'] });
  scatter([{ id: 'flowers', weight: 4 }, { id: 'grass_tuft', weight: 3 }, { id: 'mushrooms_glow', weight: 1 }, { id: 'rocks_mossy', weight: 1 }], [241, 49, 287, 128], { density: 0.05, seed: 8506, spacing: 0, terrain: ['glade_grass', 'dark_grass', 'flowers', 'moss'] });
  scatter(['wisps_blue'], [242, 50, 286, 127], { count: 6, seed: 8507, spacing: 6 });
  scatter(['crystal_blue', 'crystal_green'], [242, 50, 286, 127], { count: 8, seed: 8508, spacing: 4 });
  // badlands
  scatter([{ id: 'cactus', weight: 3 }, { id: 'cactus_tall', weight: 1 }, { id: 'cactus_flower', weight: 1 }, { id: 'dead_bush', weight: 3 }, { id: 'pebbles_sand', weight: 3 }, { id: 'rocks_red', weight: 2 }, { id: 'bones_scattered', weight: 1 }],
    [192, 134, 287, 198], { density: 0.035, seed: 8509, spacing: 0, terrain: ['red_sand', 'cracked_earth'] });
  scatter([{ id: 'crag_red', weight: 3 }, { id: 'crag_red_large', weight: 1 }], [192, 134, 287, 196], { count: 26, seed: 8510, spacing: 3, terrain: ['red_sand', 'cracked_earth'] });
}
