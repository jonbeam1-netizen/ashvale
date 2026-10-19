// The original vale (x 0-191, y 49-191): Brackenford & Highmarch interiors, landmarks, roads.
// OWNER: agent D (world builder). Existing region coordinates are unchanged; everything here is
// additive. Skill nodes / production objects / agility / thieving belong to other agents.
//
// New landmarks: The Crooked Kettle inn (84-93,113-120) · Brackenford churchyard (117-122,124-134)
// Mirrowmere island shrine (146,118) · Whisperstones (70,96) · Fairy ring clearing (66,118)
// Woodcutter's cabin (50-55,125-129) · Sentinel Hill tower (108,72) · Barrowfield (6-26,100-122)
// Fort Rowan ruins (8-22,136-152) · Ditchwatch post (99,52) · Silverrun spring falls (130,50)
// Highmarch: keep throne room, Gilded Tankard inn (141-149,93-100), barracks (176-181,79-91),
// east gate (182,76-78), corner towers, sewer manhole (157,98) · Haverly windmill (168,142) + barn

import { registerObject } from '../../core/registry.js';
import { paint, area, obj, objs, npc, npcScatter, scatter, line, road, keepClear, keepClearCircle, building, bridge, signpost, readable, item } from './util.js';

export function paintTerrain() {
  // ---- extra paths --------------------------------------------------------------------------------
  road([[93, 117], [96, 117]], 2, 'cobble', 0);                                  // inn door -> north road
  road([[51, 99], [60, 97], [66, 96]], 1.5);                                      // Whisperstones path
  road([[136, 129], [146, 130]], 2);                                              // Mirrowmere island path
  road([[140, 77], [136, 70], [133, 66]], 2);                                     // Highmarch -> river jetty
  road([[182, 77], [190, 77]], 3, 'cobble', 0.2);                                 // Highmarch east gate (continues in east.js)
  road([[158, 158], [158, 168], [158, 177]], 2);                                  // Haverly -> Gullhaven
  road([[62, 138], [56, 130], [53, 129]], 1.5);                                   // woodcutter's cabin
  road([[96, 84], [104, 78], [108, 74]], 1.5);                                    // Sentinel Hill
  road([[50, 132], [30, 136], [18, 142]], 2);                                     // west to Fort Rowan
  road([[46, 88], [30, 100], [18, 110]], 1.5);                                    // quarry -> Barrowfield
  // ---- Highmarch outer yard & sewer manhole path --------------------------------------------------
  paint({ shape: 'rect', x0: 141, y0: 96, x1: 159, y1: 99, terrain: 'cobble', only: ['grass', 'dirt', 'flowers'] });

  // ---- Mirrowmere island + bridge -----------------------------------------------------------------
  paint({ shape: 'circle', cx: 146, cy: 119, r: 2.9, terrain: 'grass', height: 0.7, blocked: false, noScatter: true });
  bridge(146, 122, 147, 129, { rails: false });

  // ---- Highmarch river jetty -------------------------------------------------------------------------
  paint({ shape: 'rect', x0: 128, y0: 65, x1: 132, y1: 66, terrain: 'wood_floor', height: 0.55, blocked: false, noScatter: true });

  // ---- Sentinel Hill ----------------------------------------------------------------------------------
  paint({ shape: 'circle', cx: 108, cy: 72, r: 7, raise: 2.2, falloff: 6, terrain: 'grass' });
  paint({ shape: 'circle', cx: 108, cy: 72, r: 3, terrain: 'stone', jitter: 1, noScatter: true });

  // ---- Whisperstones, fairy clearing, cabin -------------------------------------------------------------
  paint({ shape: 'circle', cx: 70, cy: 96, r: 5, terrain: 'grass', noScatter: true });
  paint({ shape: 'circle', cx: 66, cy: 118, r: 3.5, terrain: 'flowers', noScatter: true });
  keepClear(49, 124, 56, 130);

  // ---- Barrowfield (old burial mounds) & Fort Rowan ---------------------------------------------------
  paint({ shape: 'rect', x0: 6, y0: 100, x1: 26, y1: 122, terrain: 'heath', jitter: 2.5 });
  for (const [cx, cy, r] of [[11, 106, 2.5], [19, 104, 2], [14, 115, 3], [22, 116, 2]]) paint({ shape: 'circle', cx, cy, r, raise: 1.3, falloff: 2 });
  paint({ shape: 'rect', x0: 8, y0: 136, x1: 22, y1: 152, terrain: 'dirt', jitter: 1.5, height: 1.4, falloff: 3 });
  paint({ shape: 'rect', x0: 10, y0: 138, x1: 20, y1: 150, terrain: 'gravel', noScatter: true });

  // ---- Westcrag Bluffs (a rocky ridge west of the quarry) ----------------------------------------------
  paint({ shape: 'line', points: [[1, 86], [12, 89], [22, 92]], width: 3, terrain: 'mountain', raise: 3.5, falloff: 1.5, jitter: 1, noise: { amp: 0.8, scale: 3 } });
  // ---- Hagstone Cottage (NW) and the lumber camp (N) ------------------------------------------------------
  paint({ shape: 'circle', cx: 14, cy: 64, r: 6, terrain: 'dark_grass', jitter: 1.5, noScatter: true });
  paint({ shape: 'circle', cx: 66, cy: 58, r: 6, terrain: 'dirt', jitter: 2, noScatter: true });
  road([[46, 88], [58, 78], [62, 66], [64, 60]], 1.5);
  road([[64, 60], [60, 56], [48, 55], [30, 58], [20, 63]], 1.5);
  // ---- Ditchwatch post, river spring --------------------------------------------------------------------
  keepClear(98, 50, 104, 56);
  keepClear(125, 49, 137, 52);

  // ---- Haverly extra field (west) + windmill hill --------------------------------------------------------
  paint({ shape: 'rect', x0: 129, y0: 162, x1: 139, y1: 172, terrain: 'farmland', height: 0.9, noScatter: true });
  paint({ shape: 'circle', cx: 169, cy: 143, r: 3.5, raise: 0.6, falloff: 2, noScatter: true });
  keepClear(170, 148, 179, 157);

  keepClear(74, 131, 79, 138);   // agent B's hunter tool spawns
  // ---- Brackenford churchyard, goblin camp ground ----------------------------------------------------------
  keepClear(116, 123, 122, 135);
  paint({ shape: 'circle', cx: 114, cy: 156, r: 5, terrain: 'dirt', jitter: 2 });
}

export function areas() {
  area({ id: 'crooked_kettle', name: 'The Crooked Kettle', x0: 84, y0: 113, x1: 93, y1: 120, priority: 6 });
  area({ id: 'mirrowmere_isle', name: "Mirrowmere's Heart", x0: 143, y0: 115, x1: 149, y1: 121, priority: 4 });
  area({ id: 'whisperstones', name: 'The Whisperstones', x0: 63, y0: 90, x1: 77, y1: 102, priority: 4 });
  area({ id: 'fairy_clearing', name: 'Hidden Clearing', x0: 62, y0: 114, x1: 70, y1: 122, priority: 4 });
  area({ id: 'sentinel_hill', name: 'Sentinel Hill', x0: 101, y0: 65, x1: 115, y1: 79, priority: 3 });
  area({ id: 'barrowfield', name: 'Barrowfield', x0: 4, y0: 98, x1: 28, y1: 124, priority: 3 });
  area({ id: 'fort_rowan', name: 'Fort Rowan', x0: 6, y0: 134, x1: 24, y1: 154, priority: 3 });
  area({ id: 'ditchwatch', name: 'Ditchwatch', x0: 97, y0: 49, x1: 106, y1: 57, priority: 3 });
  area({ id: 'hagstone', name: 'Hagstone Cottage', x0: 7, y0: 57, x1: 21, y1: 71, priority: 3 });
  area({ id: 'lumber_camp', name: 'Thistledown Lumber Camp', x0: 59, y0: 51, x1: 73, y1: 65, priority: 3 });
  area({ id: 'westcrag', name: 'Westcrag Bluffs', x0: 0, y0: 82, x1: 26, y1: 96, priority: 2 });
  area({ id: 'goblin_camp', name: 'Goblin Camp', x0: 107, y0: 149, x1: 121, y1: 163, priority: 4 });
  area({ id: 'gilded_tankard', name: 'The Gilded Tankard', x0: 141, y0: 93, x1: 149, y1: 100, priority: 6 });
  area({ id: 'highmarch_keep', name: 'Highmarch Keep', x0: 155, y0: 55, x1: 167, y1: 64, priority: 6 });
}

export function spawns() {
  // =================================================================================================
  // Brackenford
  // =================================================================================================
  // -- bank interior
  obj('rug_blue', 101, 130, 0, { w: 2, h: 3 });
  objs('potted_plant', [[99, 132], [104, 132]]);
  // -- general store interior
  for (const x of [85, 86, 87]) obj('shop_counter', x, 130);
  objs('shelves', [[87, 128], [89, 128]]);
  obj('sacks', 90, 132); obj('barrel_stack', 85, 132);
  // -- kitchen interior
  obj('shelves', 85, 148, 3); obj('sacks', 89, 151); obj('barrel', 85, 151); obj('chair_wood', 89, 150, 1);
  // -- house (101,147)
  obj('bed_red', 106, 148); obj('wardrobe', 105, 148); obj('bookshelf', 102, 148);
  obj('fireplace', 102, 151, 2); obj('rug_red', 103, 149, 0, { w: 2, h: 2 }); obj('table', 105, 151); obj('chair_cushion', 104, 151, 3);
  // -- chapel interior
  obj('pew', 109, 130, 0, { w: 2, h: 1 }); obj('pew', 113, 130, 0, { w: 2, h: 1 });
  obj('pew', 109, 131, 0, { w: 2, h: 1 }); obj('pew', 113, 131, 0, { w: 2, h: 1 });
  objs('candelabra', [[109, 127], [114, 127]]);
  obj('rug_purple', 111, 129, 0, { w: 2, h: 4 });
  // -- churchyard
  line('iron_fence', [[117, 124], [122, 124], [122, 134], [117, 134], [117, 124]], [[117, 129], [117, 130]]);
  objs('grave_cross', [[119, 126], [121, 126], [119, 132]]);
  readable('bf_grave', 121, 129, 'Gravestone', '"Old Tam Cooper. He made the best barrels in the vale and the worst jokes."', 0, { model: { template: 'gravestone' } });
  readable('bf_grave', 119, 129, 'Gravestone', '"Ellyn Brackenwell, keeper of the ford. She is still watching."', 0, { model: { template: 'gravestone' } });
  obj('grave_cross_tilted', 121, 132);
  obj('tree_autumn', 118, 133);
  // -- new houses
  building('House', 78, 143, 6, 6, 'wall_plaster', '#6a3a2a', [{ side: 'e', offset: 2 }], { doorObject: 'door_wood' });
  obj('bed_blue', 79, 144); obj('table', 81, 146); obj('chair_wood', 80, 146, 3); obj('fireplace_brick', 79, 147, 2); obj('wardrobe', 81, 144);
  building('House', 84, 154, 7, 5, 'wall_wood', '#7a4a2a', [{ side: 'e', offset: 2 }]);
  obj('bed_green', 85, 155); obj('table', 87, 156); obj('stool', 88, 156); obj('woodpile', 89, 155); obj('bookshelf', 86, 155);
  building("Smith's house", 109, 144, 7, 6, 'wall_brick', '#5a3a3a', [{ side: 'n', offset: 3 }], { doorObject: 'door_wood' });
  obj('bed_straw', 110, 145); obj('armour_stand', 114, 145); obj('weapon_rack', 113, 145); obj('fireplace', 111, 148, 2); obj('treasure_chest', 114, 148);
  building('Cottage', 76, 116, 7, 6, 'wall_wood', '#5a4a2a', [{ side: 'e', offset: 2 }]);
  obj('bed_red', 77, 117); obj('fireplace', 77, 120, 2); obj('table', 80, 119); obj('chair_wood', 79, 119, 3); obj('potted_flowers', 81, 117);
  // -- The Crooked Kettle inn
  building('The Crooked Kettle', 84, 113, 10, 8, 'wall_plaster', '#8a5a2a', [{ side: 'e', offset: 4 }], { doorObject: 'door_wood' });
  for (const x of [85, 86, 87, 88]) obj('bar_counter', x, 116);
  objs('keg_rack', [[85, 114], [87, 114]]); obj('shelves', 88, 114);
  obj('table', 91, 115); objs('stool', [[90, 115], [92, 115], [91, 114]]);
  obj('table', 86, 118); objs('stool', [[85, 118], [87, 118]]);
  obj('table', 91, 118); obj('chair_wood', 90, 118, 3); obj('chair_wood', 92, 118, 1);
  obj('fireplace_brick', 88, 119, 2); obj('rug_hide', 89, 116, 0, { w: 2, h: 2 });
  readable('kettle_sign', 94, 115, 'Inn sign', '"THE CROOKED KETTLE - ale, stew, and a bed that mostly doesn\'t creak."', 0, { model: { template: 'sign' } });
  npc('villager', 90, 117, 2);
  // -- market & streets
  obj('stall_red', 99, 135); obj('stall_green', 91, 144); obj('stall_yellow', 101, 143);
  objs('apple_crate', [[101, 136], [93, 145]]); obj('pumpkin_crate', 103, 144);
  obj('statue_hero', 96, 136);
  readable('bf_notice', 94, 137, 'Notice board', 'NOTICES: "Lost: one goat, answers to Mildred." - "Volunteers wanted to clear the sewers of Highmarch. Bring your own boots." - "The Crooked Kettle, north of town: hot stew and cold ale!" - "Do NOT feed the imps."', 0, { model: { template: 'dec_notice_board' } });
  obj('bench_park', 104, 137); obj('bench_park', 87, 137);
  obj('bell_post', 99, 138);
  objs('lantern_post', [[85, 138], [113, 138], [94, 125], [94, 155]]);
  obj('flower_bed', 103, 135); obj('flower_bed_red', 106, 134);
  obj('sacks_coal', 109, 137); obj('weapon_rack', 111, 137);
  objs('barrel', [[83, 133], [97, 158]]); obj('crate_stack', 92, 125);
  // -- goblin camp
  obj('tent_ragged', 109, 151); obj('tent_ragged', 117, 150, 1); obj('tent_ragged', 118, 160, 3);
  obj('campfire', 113, 157); obj('totem_skull', 111, 159);
  objs('skull_pike', [[108, 155], [120, 154], [112, 162], [119, 157]]);
  objs('spike_barricade', [[107, 158, 1], [121, 152, 1], [110, 163]]);
  objs('bones_pile', [[115, 152], [110, 156]]);
  // -- signposts
  signpost(63, 136, 'West: Thornwood, Fort Rowan. North-west: Greystone Quarry, Barrowfield. East: Brackenford.');
  signpost(98, 101, 'North: the Wilderness (danger!). North-east: Highmarch via the Silverrun bridge. South: Brackenford. North-west: Sentinel Hill.');
  signpost(133, 137, 'West: Brackenford. North: Mirrowmere, Highmarch. South-east: Haverly Farms, Gullhaven.');
  signpost(98, 159, 'South: Murkfen Swamp, Bogwick and the Saltmarsh Coast. North: Brackenford.');
  signpost(157, 160, 'South: Gullhaven. North-west: Brackenford. East: the Haverly Pass to the Sunscar Badlands.');

  // =================================================================================================
  // Highmarch
  // =================================================================================================
  // -- keep throne room
  obj('throne', 161, 57);
  obj('rug_purple', 160, 58, 0, { w: 3, h: 6 });
  for (const y of [59, 60, 61]) { obj('table', 157, y); obj('chair_dark', 156, y, 3); obj('chair_dark', 158, y, 1); obj('table', 165, y); obj('chair_dark', 164, y, 3); obj('chair_dark', 166, y, 1); }
  objs('banner_red', [[156, 56], [166, 56]]);
  objs('brazier', [[158, 57], [164, 57]]);
  objs('candelabra_gold', [[160, 56], [162, 56]]);
  objs('armour_stand', [[156, 63], [166, 63]]);
  npc('town_guard', 159, 63, 1); npc('town_guard', 163, 63, 1);
  // -- courtyard
  obj('statue_founder', 165, 66);
  obj('flower_bed', 168, 66); obj('flower_bed_red', 155, 66);
  objs('banner_red', [[159, 66], [163, 66]]);
  // -- corner & gate towers
  for (const [x, y] of [[139, 51], [181, 51], [139, 101], [181, 101]]) obj('turret', x, y);
  for (const [x, y] of [[138, 72], [138, 80], [156, 101], [164, 101], [181, 72], [181, 80]]) obj('turret_plain', x, y);
  npc('town_guard', 139, 76, 1); npc('town_guard', 161, 104, 1); npc('town_guard', 184, 78, 1);
  objs('flag_red', [[141, 75], [159, 103]]);
  // -- bank, arms shop, temple, houses
  obj('rug_blue', 147, 70, 0, { w: 2, h: 4 }); objs('potted_plant', [[149, 70], [149, 73]]);
  objs('weapon_rack', [[170, 70], [171, 70]]); objs('armour_stand', [[173, 73], [169, 73]]);
  obj('pew', 172, 59, 0, { w: 2, h: 1 }); obj('pew', 177, 59, 0, { w: 2, h: 1 }); obj('pew', 172, 60, 0, { w: 2, h: 1 }); obj('pew', 177, 60, 0, { w: 2, h: 1 });
  objs('candelabra_gold', [[172, 56], [178, 56]]); obj('rug_red', 175, 58, 0, { w: 2, h: 3 });
  obj('bed_red', 173, 85); obj('wardrobe', 172, 85); obj('table', 170, 88); obj('chair_cushion', 171, 88, 1); obj('fireplace', 173, 89, 1); obj('bookshelf', 169, 85);
  obj('desk', 144, 86); obj('bookshelf', 145, 86); obj('weapon_rack', 148, 86); obj('rug_hide', 146, 88, 0, { w: 2, h: 2 }); obj('chair_dark', 144, 87, 2);
  obj('bed_blue', 154, 91); obj('table', 152, 93); obj('chair_wood', 153, 93, 1); obj('fireplace_brick', 151, 94, 2);
  obj('bed_blue', 175, 94); obj('bed_green', 171, 94); obj('fireplace', 173, 97, 2); obj('table', 174, 96); obj('stool', 175, 96);
  // -- barracks + training yard
  building('Barracks', 176, 79, 6, 13, 'wall_stone', '#4a3a3a', [{ side: 'n', offset: 2 }], { floor: 'stone_floor' });
  for (const y of [81, 84, 87]) obj('bed_straw', 180, y);
  obj('weapon_rack', 177, 81, 3); obj('armour_stand', 177, 83); obj('table', 178, 87); objs('stool', [[177, 87], [178, 88]]); obj('treasure_chest', 177, 90);
  objs('training_dummy', [[178, 94], [180, 94], [179, 96]]); objs('archery_target', [[178, 99, 2], [180, 99, 2]]);
  npc('town_guard', 179, 92, 3);
  // -- The Gilded Tankard
  building('The Gilded Tankard', 141, 93, 9, 8, 'wall_plaster', '#7a2a2a', [{ side: 'e', offset: 4 }], { doorObject: 'door_wood' });
  for (const x of [142, 143, 144, 145]) obj('bar_counter', x, 96);
  objs('keg_rack', [[142, 94], [143, 94]]); obj('shelves', 144, 94);
  obj('table', 147, 95); obj('chair_cushion', 146, 95, 3); obj('chair_cushion', 148, 95, 1);
  obj('table', 146, 98); objs('stool', [[145, 98], [147, 98]]);
  obj('fireplace_brick', 142, 99, 2);
  npc('villager', 146, 97, 2);
  // -- sewer manhole (see dungeons.js), plaza dressing
  objs('apple_crate', [[158, 74], [166, 74]]); objs('fish_crate', [[158, 82], [166, 82]]);
  obj('bench_stone', 152, 79); obj('bench_stone', 168, 79);
  objs('lantern_post', [[149, 79], [173, 79], [163, 70], [159, 90]]);

  // =================================================================================================
  // Landmarks around the vale
  // =================================================================================================
  // -- Mirrowmere's Heart
  obj('shrine_blue', 146, 118); obj('wisps_blue', 147, 119);
  objs('flowers', [[145, 120], [147, 117]]);
  readable('mirrow_plaque', 145, 118, 'Plaque', '"Mirrowmere: the lake that remembers. Speak a name over the water and it will be spoken back to you on the night of the new moon."', 0, { model: { template: 'gravestone' } });
  objs('dock_post', [[145, 129], [148, 129], [145, 123], [148, 123]]);
  obj('rowboat', 140, 128);
  // -- Highmarch river jetty
  objs('dock_post', [[128, 64], [128, 67]]); obj('rowboat_blue', 129, 67); obj('lobster_pot', 132, 64); obj('barrel', 132, 67);
  // -- Silverrun spring falls (river head)
  obj('waterfall', 130, 50); obj('crag_large', 126, 49); obj('crag_large', 134, 49); objs('reeds', [[129, 52], [135, 53]]);
  // -- Ditchwatch post
  obj('tent_canvas', 100, 52); obj('campfire_lit', 103, 54); obj('flag_blue', 104, 51); obj('crate_stack', 99, 55); obj('barrel', 103, 52);
  npc('town_guard', 101, 55, 2);
  // -- Sentinel Hill
  obj('turret_ruined', 107, 71);
  objs('rubble', [[105, 70], [111, 73], [109, 75]]); obj('wall_ruined_mossy', 105, 74); obj('wall_ruined_mossy', 110, 69);
  readable('sentinel', 106, 75, 'Weathered plaque', '"From this tower the Wardens of Brackenford watched the north. Light the beacon if the ash-host stirs." The beacon has not been lit in living memory.', 0, { model: { template: 'gravestone' } });
  // -- Whisperstones
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; obj(i % 2 ? 'menhir' : 'menhir_rune', Math.round(70 + Math.cos(a) * 3.6), Math.round(96 + Math.sin(a) * 3.6)); }
  obj('dolmen', 69, 96);
  // -- hidden clearing
  obj('fairy_ring', 65, 117); obj('wisps', 66, 118); objs('mushrooms_glow', [[63, 116], [68, 120]]); obj('treasure_chest_open', 68, 116); item('ancient_coin', 67, 116, 1, 300);
  // -- woodcutter's cabin
  building("Woodcutter's cabin", 50, 125, 6, 5, 'wall_log', '#4a3a2a', [{ side: 's', offset: 2 }]);
  obj('bed_straw', 51, 126); obj('fireplace', 54, 126, 0); obj('table', 53, 127);
  objs('woodpile', [[49, 130], [56, 129]]); obj('chopping_block', 54, 130);
  // -- Barrowfield
  obj('dolmen', 13, 110); objs('menhir', [[9, 104], [24, 112], [16, 121]]);
  objs('grave_slab', [[11, 106], [19, 104], [22, 116]]);
  readable('barrow', 14, 115, 'Barrow stone', '"Here sleep the kings who came before the kings. Do not wake them." The stone is warm, as if someone sat here moments ago.', 0, { model: { template: 'dec_standing_stone', rune: '#c8a040' } });
  objs('bones_scattered', [[12, 112], [20, 108]]);
  // -- Fort Rowan
  {
    const gaps = [[15, 136], [16, 136], [15, 152], [16, 152], [8, 141], [8, 146], [22, 143], [12, 136], [20, 152]];
    line('wall_ruined', [[8, 136], [22, 136], [22, 152], [8, 152], [8, 136]], gaps);
    obj('turret_ruined', 7, 135); obj('turret_ruined', 20, 150);
    obj('campfire_lit', 15, 144); obj('tent_ragged', 11, 139); obj('tent_ragged', 18, 140, 1); obj('crate_stack', 12, 148); obj('cart_broken', 17, 147);
    objs('banner_black', [[10, 138], [20, 138]]);
    npcScatter(['highway_bandit'], [10, 138, 20, 150], 4, 6101, 3);
  }
  // -- Haverly windmill, barn and west field
  obj('windmill', 168, 142); obj('windmill_sails', 168, 142);
  building('Barn', 170, 148, 9, 8, 'wall_wood', '#8a3a2a', [{ side: 'w', offset: 3, width: 2 }]);
  objs('hay_bale', [[172, 150], [173, 150], [177, 149], [177, 154]]); obj('cart_hay', 174, 153); obj('trough', 171, 154); obj('sacks', 177, 151);
  for (let x = 130; x <= 138; x += 2) for (let y = 163; y <= 171; y += 2) obj(y < 168 ? 'crops_wheat' : 'crops_cabbage', x, y);
  obj('scarecrow', 134, 167); obj('scarecrow_red', 156, 163);
  obj('bed_green', 147, 169); obj('table', 145, 168); obj('chair_wood', 144, 168, 3); obj('rug_hide', 145, 166, 0, { w: 2, h: 2 });
  npc('farmer', 135, 165, 4); npc('farmer', 172, 152, 3);
  // -- Murkfen hag's hut
  obj('stilt_hut_green', 104, 171); obj('cauldron', 103, 175); objs('totem_skull', [[102, 170], [108, 174]]);
  // -- Greystone Quarry dressing
  building("Foreman's hut", 52, 58, 6, 5, 'wall_wood', '#5a4a3a', [{ side: 's', offset: 2 }]);
  obj('desk', 53, 59); obj('bed_straw', 56, 59);
  objs('mine_support', [[31, 66], [36, 66]]); obj('rails', 33, 66, 0, { w: 1, h: 4 }); obj('minecart_ore', 33, 69);
  obj('cart_ore', 57, 72, 1); obj('tent_canvas', 58, 86); objs('crag', [[27, 70], [29, 86]]);
  readable('quarry_sign', 37, 62, 'Sign', '"GREYSTONE QUARRY. The lower galleries are CLOSED by order of the Foreman. Something down there is eating the pit ponies."', 0, { model: { template: 'sign' } });
  // -- broken wagon on the north road
  obj('cart_broken', 90, 82); objs('crate', [[89, 84]]);
  // -- wayside shrine
  obj('shrine_green', 98, 87);
  // -- Hagstone Cottage
  building('Hagstone Cottage', 11, 61, 6, 5, 'wall_log', '#3a4a2a', [{ side: 's', offset: 2 }]);
  obj('cauldron', 12, 62); obj('shelves_potions', 14, 62); obj('bed_straw', 15, 62); obj('rug_hide', 12, 64, 0, { w: 2, h: 1 });
  objs('crops_pumpkin', [[9, 67], [10, 68], [17, 67], [18, 68], [9, 69]]); obj('scarecrow', 13, 69); obj('totem', 19, 63);
  objs('mushrooms_purple', [[8, 63], [19, 66]]); obj('well_rustic', 17, 69);
  readable('hag_note', 14, 67, 'Note on a post', '"Gone gathering toadstools. If you are here for a love potion, the answer is no. If you are here for a wart cure, leave the coins in the pot."', 0, { model: { template: 'sign' } });
  // -- lumber camp
  objs('tent_canvas', [[62, 54], [68, 54]]); obj('campfire', 66, 58); objs('woodpile', [[61, 59], [70, 60], [63, 62]]);
  objs('chopping_block', [[65, 61], [69, 57]]); obj('cart_empty', 71, 62); objs('fallen_log', [[60, 56], [72, 55]]);
  obj('bench_wood', 64, 57); obj('barrel', 70, 58);
  readable('lumber_board', 67, 62, 'Job board', '"WANTED: strong arms for felling. Pay: three meals a day and all the splinters you can carry. Ask for Foreman Brannagh."', 0, { model: { template: 'dec_notice_board' } });
  npc('farmer', 66, 60, 4);
  // -- Westcrag crags
  objs('crag_large', [[5, 84], [17, 87]]); objs('crag', [[10, 92], [24, 89]]);
}

export function decor() {
  // Brackenford / north road blossom grove
  scatter([{ id: 'tree_blossom', weight: 3 }, { id: 'tree_autumn', weight: 1 }], [78, 104, 94, 124], { count: 8, seed: 6201, spacing: 2 });
  // vale-wide ground clutter
  scatter([{ id: 'grass_tuft', weight: 6 }, { id: 'pebbles', weight: 2 }, { id: 'rocks', weight: 1 }, { id: 'mushrooms_brown', weight: 1 }],
    [1, 50, 182, 178], { density: 0.018, seed: 6202, spacing: 0, terrain: ['grass', 'flowers', 'dark_grass'] });
  scatter([{ id: 'rocks_mossy', weight: 2 }, { id: 'mushrooms_red', weight: 3 }, { id: 'grass_tuft_dark', weight: 4 }], [46, 104, 76, 172], { density: 0.025, seed: 6203, spacing: 0 });
  scatter(['fallen_log', 'fallen_log_mossy'], [46, 104, 76, 172], { count: 14, seed: 6212, spacing: 1 });
  scatter([{ id: 'tree_autumn', weight: 2 }, { id: 'tree_goldleaf', weight: 1 }, { id: 'tree_blossom', weight: 1 }], [1, 52, 182, 178], { count: 24, seed: 6204, spacing: 3, terrain: ['grass', 'flowers'] });
  // river banks & lake shores
  scatter([{ id: 'reeds', weight: 4 }, { id: 'reeds_dry', weight: 1 }], [112, 49, 160, 182], { count: 70, seed: 6205, spacing: 1, terrain: ['sand'] });
  scatter(['lily_pads', 'lily_pads_plain'], [134, 110, 158, 130], { count: 10, seed: 6206, water: true, spacing: 1 });
  // Murkfen
  scatter([{ id: 'reeds', weight: 3 }, { id: 'mushrooms_purple', weight: 1 }, { id: 'grass_tuft_dark', weight: 3 }], [76, 160, 112, 177], { density: 0.06, seed: 6207, spacing: 0, terrain: ['swamp', 'sand'] });
  scatter(['lily_pads'], [80, 164, 106, 174], { count: 6, seed: 6208, water: true, spacing: 0 });
  scatter(['wisps'], [78, 162, 110, 176], { count: 3, seed: 6209, spacing: 5 });
  // Barrowfield heath
  scatter([{ id: 'grass_tuft_dry', weight: 3 }, { id: 'dead_bush', weight: 1 }, { id: 'rocks', weight: 1 }], [4, 98, 28, 124], { density: 0.05, seed: 6210, spacing: 0 });
  // Greystone rim boulders & crags
  scatter([{ id: 'crag', weight: 1 }, { id: 'rocks', weight: 3 }, { id: 'pebbles', weight: 3 }], [26, 58, 62, 94], { count: 24, seed: 6211, spacing: 1, terrain: ['stone', 'grass'] });
}
