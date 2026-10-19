// Saltmarsh Coast & the Southern Sea. OWNER: agent D (world builder).
//
// Morrow's Rest graveyard (46-70, 166-184) - crypt entrance mausoleum at (57,173), see dungeons.js
// Bogwick, swamp hamlet on boardwalks (72-118, 176-204) - Sunken Boot tavern (98-104,191-196)
// Thrush Isle (80,212) reached by a stepping-stone causeway from Bogwick's jetty
// Gullhaven, fishing village (156-192, 176-200) - Salty Gull tavern (167-175,178-184), three piers
// Beacon Isle lighthouse (195,204) reached by a causeway from Gullhaven's east pier

import { paint, area, obj, objs, npc, npcScatter, scatter, line, road, keepClear, keepClearCircle, building, bridge, signpost, readable, item } from './util.js';

export function paintTerrain() {
  // ---- Morrow's Rest: a dark hill between Thornwood and the sea ----------------------------------------
  paint({ shape: 'rect', x0: 46, y0: 166, x1: 70, y1: 184, terrain: 'dark_grass', jitter: 1.2, height: 1.2, falloff: 3, blocked: false });
  paint({ shape: 'rect', x0: 48, y0: 169, x1: 68, y1: 181, terrain: 'moss', jitter: 1 });
  paint({ shape: 'line', points: [[58, 168], [58, 172]], width: 2, terrain: 'gravel', noScatter: true });
  paint({ shape: 'line', points: [[60, 174], [69, 174]], width: 2, terrain: 'gravel', noScatter: true });
  keepClear(46, 166, 70, 184);
  road([[70, 174], [80, 177], [90, 179], [96, 178]], 2);
  road([[58, 167], [60, 160], [62, 150]], 1.5);   // north into Thornwood

  // ---- Bogwick: reclaimed marsh with water channels and boardwalks -------------------------------------
  paint({ shape: 'rect', x0: 72, y0: 176, x1: 118, y1: 202, terrain: 'swamp', jitter: 2, height: 0.35, falloff: 2, blocked: false });
  paint({ shape: 'rect', x0: 74, y0: 180, x1: 116, y1: 200, terrain: 'mud', jitter: 3, only: ['swamp'] });
  paint({ shape: 'line', points: [[72, 188], [96, 189], [118, 191]], width: 3, terrain: 'water', jitter: 0.5 });
  paint({ shape: 'line', points: [[85, 178], [86, 190], [85, 202]], width: 2, terrain: 'water', jitter: 0.4 });
  paint({ shape: 'line', points: [[108, 179], [107, 190], [107, 202]], width: 2, terrain: 'water', jitter: 0.4 });
  paint({ shape: 'circle', cx: 78, cy: 182, r: 2, terrain: 'water', jitter: 0.5 });
  paint({ shape: 'circle', cx: 113, cy: 199, r: 2.5, terrain: 'water', jitter: 0.5 });
  // boardwalks (after the channels so they bridge them)
  const walk = (points, width = 2) => paint({ shape: 'line', points, width, terrain: 'wood_floor', height: 0.55, blocked: false, noScatter: true });
  walk([[96, 177], [96, 200]], 2);
  walk([[82, 184], [112, 184]], 1);
  walk([[78, 196], [112, 196]], 1);
  walk([[89, 184], [89, 196]], 1);
  paint({ shape: 'rect', x0: 95, y0: 200, x1: 97, y1: 206, terrain: 'wood_floor', height: 0.55, blocked: false, noScatter: true });
  keepClear(72, 176, 118, 206);

  // ---- Thrush Isle + causeway ----------------------------------------------------------------------------
  paint({ shape: 'circle', cx: 80, cy: 212, r: 6, terrain: 'grass', jitter: 1.2, height: 0.9, falloff: 2, blocked: false });
  paint({ shape: 'circle', cx: 80, cy: 212, r: 3, terrain: 'flowers', jitter: 1 });
  paint({ shape: 'line', points: [[95, 207], [91, 209], [86, 210]], width: 1, terrain: 'wet_rock', height: 0.3, blocked: false, noScatter: true });

  // ---- Gullhaven -------------------------------------------------------------------------------------------
  paint({ shape: 'rect', x0: 156, y0: 176, x1: 192, y1: 190, terrain: 'grass', jitter: 1.5, height: 0.9, falloff: 2, blocked: false });
  paint({ shape: 'line', points: [[158, 177], [160, 186], [191, 186]], width: 3, terrain: 'cobble', noScatter: true });
  keepClear(156, 176, 192, 200);
  for (const [x0, x1, y1] of [[164, 165, 200], [176, 177, 198], [187, 188, 196]]) {
    paint({ shape: 'rect', x0, y0: 188, x1, y1, terrain: 'wood_floor', height: 0.55, blocked: false, noScatter: true });
  }
  // Beacon Isle + causeway
  paint({ shape: 'circle', cx: 196, cy: 206, r: 4.6, terrain: 'grass', jitter: 0.8, height: 1.1, falloff: 2, blocked: false });
  paint({ shape: 'line', points: [[188, 197], [190, 199], [192, 202]], width: 1, terrain: 'wet_rock', height: 0.3, blocked: false, noScatter: true });
}

export function areas() {
  area({ id: 'morrows_rest', name: "Morrow's Rest", x0: 46, y0: 166, x1: 70, y1: 184, priority: 4 });
  area({ id: 'bogwick', name: 'Bogwick', x0: 74, y0: 178, x1: 116, y1: 206, priority: 4 });
  area({ id: 'sunken_boot', name: 'The Sunken Boot', x0: 98, y0: 191, x1: 104, y1: 196, priority: 6 });
  area({ id: 'thrush_isle', name: 'Thrush Isle', x0: 73, y0: 205, x1: 87, y1: 219, priority: 4 });
  area({ id: 'gullhaven', name: 'Gullhaven', x0: 156, y0: 176, x1: 192, y1: 200, priority: 4 });
  area({ id: 'salty_gull', name: 'The Salty Gull', x0: 167, y0: 178, x1: 175, y1: 184, priority: 6 });
  area({ id: 'beacon_isle', name: 'Beacon Isle', x0: 189, y0: 199, x1: 202, y1: 212, priority: 4 });
  area({ id: 'southern_sea', name: 'The Southern Sea', x0: 45, y0: 192, x1: 287, y1: 217, priority: 1 });
}

export function spawns() {
  // =================================================================================================
  // Morrow's Rest
  // =================================================================================================
  line('iron_fence', [[47, 168], [69, 168], [69, 182], [47, 182], [47, 168]], [[58, 168], [59, 168], [69, 174], [69, 175]]);
  const epitaphs = [
    '"Here lies Odo Fenwick. He was right about the mushrooms."',
    '"Beloved wife, mother, and terror of the Crooked Kettle\'s darts board."',
    '"I told you I was ill."',
    '"Captain Hesk of the Salted Duchess. The sea gave him back, eventually."',
    '"Sleep softly, little Wren. The lantern is lit for you."',
    '"Gone to the Wilderness for treasure. Came back for burial."',
    '"Mags the Unbreakable. Broken at last by a falling barrel."',
    '"Here rests the Hollow King\'s gravedigger. He dug too deep."',
  ];
  let e = 0;
  for (let x = 50; x <= 66; x += 4) for (let y = 171; y <= 180; y += 3) {
    if (x >= 55 && x <= 61 && y <= 177) continue; // the mausoleum plaza
    if ((x + y) % 3 === 0 && e < epitaphs.length) readable('morrow_grave', x, y, 'Gravestone', epitaphs[e++], 0, { model: { template: 'gravestone' } });
    else obj((x * 7 + y) % 4 === 0 ? 'grave_cross_tilted' : (x + y) % 2 ? 'grave_cross' : 'grave_slab', x, y);
  }
  objs('tree_gnarled', [[48, 170], [67, 170], [48, 180], [67, 180]]);
  objs('torch_stake_green', [[56, 177], [61, 177], [56, 172], [61, 172]]);
  objs('grave_mound', [[64, 177], [52, 177]]);
  obj('statue_headless', 65, 173); obj('wisps', 53, 175); obj('wisps', 63, 179);
  obj('coffin_open', 60, 179, 1);
  readable('morrow_sign', 70, 172, 'Sign', '"MORROW\'S REST. Visitors welcome between dawn and dusk. After dusk, visitors are on their own."', 0, { model: { template: 'sign' } });

  // =================================================================================================
  // Bogwick
  // =================================================================================================
  building('The Sunken Boot', 98, 191, 7, 6, 'wall_log', '#4a5a3a', [{ side: 'w', offset: 2 }], { doorObject: 'door_wood' });
  for (const y of [192, 193]) obj('bar_counter', 102, y, 1);
  obj('keg_rack', 103, 192); obj('table', 100, 195); objs('stool', [[99, 195], [101, 195]]); obj('fireplace', 103, 195, 1); obj('sacks', 99, 192);
  building("Hedgewitch's hut", 88, 179, 5, 5, 'wall_log', '#5a6a3a', [{ side: 's', offset: 2 }]);
  obj('cauldron', 90, 181); obj('shelves_potions', 89, 180); obj('bed_straw', 91, 180);
  objs('stilt_hut', [[100, 179], [110, 185], [79, 192], [110, 197]]); obj('stilt_hut_green', 87, 198);
  objs('totem', [[94, 186], [99, 186]]); obj('totem_skull', 82, 186);
  objs('lantern_post_blue', [[94, 180], [98, 186], [94, 194], [98, 199]]);
  objs('fish_rack', [[93, 197], [99, 201]]); obj('net_rack', 93, 202);
  objs('rowboat', [[94, 203], [98, 204]]); objs('dock_post', [[94, 206], [98, 206], [94, 200]]);
  objs('boardwalk_post', [[95, 189], [98, 189], [88, 184], [104, 184], [86, 196], [106, 196]]);
  objs('reeds', [[80, 181], [76, 184], [112, 181], [116, 194], [83, 200], [104, 199]]);
  objs('lily_pads', [[78, 182], [113, 199], [86, 192]]);
  signpost(98, 176, 'South: Bogwick. West: Morrow\'s Rest. North: Brackenford, through Murkfen.');
  readable('bog_notice', 94, 183, 'Notice board', '"Lost: one boot. If found, keep it - Bogwick has plenty." / "Ferry to Thrush Isle cancelled until the eels calm down. Use the stones."', 0, { model: { template: 'dec_notice_board' } });
  npc('villager', 96, 190, 4); npc('villager', 90, 196, 4); npc('villager', 101, 193, 1);
  npcScatter(['marsh_toad'], [74, 178, 116, 202], 5, 7101, 3, { terrain: ['swamp', 'mud'] });

  // ---- Thrush Isle -------------------------------------------------------------------------------------
  obj('stone_arch_vines', 79, 209); obj('wall_ruined_mossy', 76, 211); obj('wall_ruined_mossy', 76, 212); obj('wall_ruined_mossy', 84, 213);
  obj('shrine_green', 80, 213); obj('tree_willow', 82, 215); obj('tree_blossom', 76, 215);
  obj('treasure_chest_open', 83, 210); item('coins', 84, 211, 15, 150); obj('wisps', 78, 214);
  objs('stepping_stone', [[93, 208], [91, 209], [89, 209], [87, 210]]);
  readable('thrush', 80, 211, 'Mossy tablet', '"Thrush Isle, where the songbirds go to sing their last song. Leave a crumb for them." There are crumbs everywhere.', 0, { model: { template: 'gravestone' } });
  npc('hedge_wizard', 81, 211, 2);

  // =================================================================================================
  // Gullhaven
  // =================================================================================================
  building('Cottage', 160, 179, 6, 6, 'wall_wood', '#5a3a2a', [{ side: 's', offset: 2 }], { doorObject: 'door_wood' });
  obj('bed_blue', 161, 180); obj('table', 164, 182); obj('chair_wood', 163, 182, 3); obj('fireplace', 164, 180, 0); obj('sacks', 161, 183);
  building('The Salty Gull', 167, 178, 9, 7, 'wall_plaster', '#3a5a7a', [{ side: 's', offset: 4 }], { doorObject: 'door_wood' });
  for (const x of [168, 169, 170, 171]) obj('bar_counter', x, 181);
  objs('keg_rack', [[168, 179], [170, 179]]); obj('shelves', 171, 179);
  obj('table', 174, 180); objs('stool', [[173, 180], [174, 181]]); obj('table', 173, 183); obj('chair_wood', 174, 183, 1); obj('anchor', 168, 183);
  building('Fishmonger', 177, 179, 6, 6, 'wall_wood', '#2a4a5a', [{ side: 's', offset: 2 }]);
  obj('shop_counter', 178, 181); obj('shop_counter', 179, 181); obj('fish_crate', 181, 180); obj('barrel', 178, 183);
  building('Cottage', 184, 179, 6, 6, 'wall_wood', '#6a3a2a', [{ side: 's', offset: 2 }]);
  obj('bed_red', 185, 180); obj('wardrobe', 188, 180); obj('fireplace_brick', 188, 183, 1); obj('table', 186, 182);
  objs('lantern_post', [[166, 188], [175, 188], [183, 188], [157, 185]]);
  obj('stall_fish', 161, 188); obj('fish_crate', 168, 188);
  objs('net_rack', [[171, 188], [181, 188]]); objs('fish_rack', [[173, 188], [184, 188]]); objs('lobster_pot', [[167, 189], [179, 189], [190, 189]]);
  obj('ship_moored', 166, 191); objs('rowboat', [[162, 192], [175, 192], [178, 194]]); obj('rowboat_blue', 186, 191);
  objs('dock_post', [[163, 194], [166, 199], [163, 199], [175, 197], [178, 197], [186, 195], [189, 195]]);
  obj('anchor', 191, 188); obj('barrel_stack', 191, 184); obj('crate_stack', 158, 188);
  signpost(156, 183, 'North: Haverly Farms, Brackenford. East pier: the Beacon Isle causeway. West: the sea stacks.');
  // Beacon Isle
  obj('lighthouse', 195, 204); obj('lighthouse_lamp', 195, 204);
  objs('stepping_stone', [[189, 198], [190, 199], [191, 200], [192, 201]]);
  obj('bench_wood', 193, 208); obj('barrel_stack', 199, 203); obj('rocks_mossy', 199, 208);
  readable('beacon', 193, 203, 'Brass plaque', '"The Beacon of Gullhaven. Lit every night for two hundred and six years. Keeper: Old Agnes (do not knock after supper)."', 0, { model: { template: 'gravestone' } });
  npc('villager', 170, 186, 5); npc('villager', 180, 186, 5); npc('villager', 171, 182, 1); npc('villager', 196, 208, 1);
  npcScatter(['saltmarsh_crab'], [120, 178, 190, 184], 5, 7102, 3, { terrain: ['sand'] });
}

export function decor() {
  // beaches: driftwood, pebbles, dry reeds
  scatter([{ id: 'pebbles_sand', weight: 3 }, { id: 'reeds_dry', weight: 2 }, { id: 'bones_scattered', weight: 0.3 }], [45, 176, 287, 200], { density: 0.022, seed: 7201, spacing: 0, terrain: ['sand'] });
  scatter(['fallen_log'], [45, 176, 287, 200], { count: 18, seed: 7208, spacing: 1, terrain: ['sand'] });
  // Bogwick marsh
  scatter([{ id: 'reeds', weight: 5 }, { id: 'grass_tuft_dark', weight: 3 }, { id: 'mushrooms_brown', weight: 1 }, { id: 'dead_bush', weight: 1 }], [72, 176, 118, 204], { density: 0.08, seed: 7202, spacing: 0, terrain: ['swamp', 'mud'] });
  scatter(['lily_pads', 'lily_pads_plain'], [72, 178, 118, 204], { count: 12, seed: 7203, water: true, spacing: 1 });
  scatter([{ id: 'dead_tree', weight: 2 }, { id: 'tree_willow', weight: 1 }], [72, 176, 118, 204], { count: 8, seed: 7204, spacing: 2, terrain: ['swamp', 'mud'] });
  // graveyard ground
  scatter([{ id: 'grass_tuft_dark', weight: 3 }, { id: 'mushrooms_purple', weight: 1 }, { id: 'bones_scattered', weight: 0.5 }], [47, 168, 69, 182], { density: 0.06, seed: 7205, spacing: 0, terrain: ['moss', 'dark_grass'] });
  // Thrush Isle
  scatter([{ id: 'flowers', weight: 3 }, { id: 'grass_tuft', weight: 2 }], [74, 206, 86, 218], { density: 0.15, seed: 7206, spacing: 0 });
  // Gullhaven
  scatter([{ id: 'grass_tuft', weight: 3 }, { id: 'flowers', weight: 1 }], [156, 176, 192, 190], { density: 0.04, seed: 7207, spacing: 0, terrain: ['grass'] });
}
