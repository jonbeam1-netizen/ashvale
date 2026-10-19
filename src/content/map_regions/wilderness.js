// The Wilderness (y 0-47, full width). OWNER: agent D (world builder).
// Danger grows northward: wild grass near the ditch -> ash, bones and lava -> the frozen Frostfang
// Peaks along the top edge. The eastern third (x 192+) holds Blackbriar Wood and Cinderfall.
//
// Landmarks: Calder Ruins fortress (84-108, 16-40) · Ossuary Flats (18-42, 24-46) · Cinder Pits (60-86, 10-26)
// Scorch Rift (134-160, 18-42) · Bloodstone Circle (128,36) · Wrenhollow Ruins (158-184, 32-46)
// Outlaw Camp (40,44) · Wyrmbone Hollow (180,16) · Rimeglass Tarn (40,6) · Pale Moon Shrine (150,5)
// Blackbriar Wood (192-242, 12-47) + Crow's Glade (214,26) · Cinderfall (242-287, 30-47)
// Cinder Depths entrance (255,31) -> lava cave pocket (see dungeons.js)

import { paint, area, obj, objs, npc, npcScatter, scatter, line, road, keepClear, keepClearCircle, building, signpost, readable, rng, item } from './util.js';

export function paintTerrain() {
  // --- extra ash scars, heavier the further north ------------------------------------------------
  for (const [cx, cy, r] of [[12, 20, 5], [110, 14, 5], [180, 40, 4], [210, 20, 6], [230, 38, 5], [250, 15, 6], [64, 40, 3], [176, 26, 4], [120, 22, 4]]) {
    paint({ shape: 'circle', cx, cy, r, terrain: 'ash', jitter: 2 });
  }
  for (const [cx, cy, r] of [[40, 18, 4], [86, 12, 4], [134, 14, 4], [160, 16, 4]]) paint({ shape: 'circle', cx, cy, r, terrain: 'scorched', jitter: 2 });
  // the southern fringe stays grassy: dry tufts and dirt
  paint({ shape: 'rect', x0: 0, y0: 41, x1: 287, y1: 47, terrain: 'wild_grass', jitter: 2, only: ['ash'] });

  // --- Frostfang Peaks: craggy summits, a frozen tarn ---------------------------------------------
  for (const [cx, cy, r] of [[20, 2, 3], [58, 1, 3], [104, 2, 2.5], [128, 1, 3.5], [172, 2, 3], [214, 3, 3.2], [236, 2, 3], [88, 1, 2]]) {
    paint({ shape: 'circle', cx, cy, r, terrain: 'mountain', raise: 4, falloff: 2, jitter: 1.2, noise: { amp: 1, scale: 3 } });
    paint({ shape: 'circle', cx, cy, r: r - 1, terrain: 'snow', blocked: true, only: ['mountain'] });
  }
  paint({ shape: 'circle', cx: 40, cy: 6, r: 4.5, terrain: 'ice', jitter: 1, height: 1.0, falloff: 2 });
  paint({ shape: 'circle', cx: 196, cy: 7, r: 3, terrain: 'ice', jitter: 0.8, height: 1.4, falloff: 2 });
  paint({ shape: 'circle', cx: 150, cy: 5, r: 4, terrain: 'stone', jitter: 1, height: 2.2, falloff: 2 });

  // --- Calder Ruins: a great broken fortress around the old obelisk ----------------------------------
  paint({ shape: 'rect', x0: 84, y0: 17, x1: 108, y1: 39, terrain: 'dark_stone', jitter: 0.6, height: 1.2, falloff: 2 });
  paint({ shape: 'circle', cx: 96, cy: 28, r: 7.5, terrain: 'stone', jitter: 1 });
  paint({ shape: 'line', points: [[96, 47], [96, 39]], width: 3, terrain: 'gravel', noScatter: true });
  keepClear(84, 17, 108, 40);

  // --- Ossuary Flats --------------------------------------------------------------------------------
  paint({ shape: 'circle', cx: 30, cy: 32, r: 10, terrain: 'bone_ground', jitter: 2.5 });
  // --- Cinder Pits scorch ring (rocks are agent B's, the gauntlet is agent F's) -------------------------
  paint({ shape: 'circle', cx: 70, cy: 18, r: 10, terrain: 'scorched', jitter: 2, only: ['wild_grass', 'grass'] });
  keepClear(71, 12, 85, 23);

  // --- Scorch Rift: a crack of molten rock feeding the eastern lava pool --------------------------------
  paint({ shape: 'line', points: [[136, 21], [143, 25], [148, 29]], width: 1.6, terrain: 'lava', jitter: 0.4 });
  paint({ shape: 'line', points: [[152, 32], [155, 36], [156, 39]], width: 1.4, terrain: 'lava', jitter: 0.3 });
  paint({ shape: 'circle', cx: 146, cy: 27, r: 3, terrain: 'obsidian', jitter: 1, except: ['lava'] });
  // crossing stones over the rift
  paint({ shape: 'rect', x0: 141, y0: 23, x1: 142, y1: 25, terrain: 'obsidian', blocked: false });

  // --- Bloodstone Circle -------------------------------------------------------------------------------
  paint({ shape: 'circle', cx: 128, cy: 36, r: 4.5, terrain: 'scorched', jitter: 0.8 });
  keepClearCircle(128, 36, 5);

  // --- Wrenhollow (abandoned village) ------------------------------------------------------------------
  paint({ shape: 'rect', x0: 160, y0: 33, x1: 183, y1: 45, terrain: 'wild_grass', jitter: 1 });
  road([[159, 40], [171, 40], [182, 38]], 2, 'dirt', 0.5);
  road([[171, 40], [171, 46]], 2, 'dirt', 0.5);
  paint({ shape: 'circle', cx: 168, cy: 37, r: 3, terrain: 'scorched', jitter: 1 });
  keepClear(160, 33, 183, 45);

  // --- Outlaw camp, Wyrmbone Hollow -------------------------------------------------------------------
  paint({ shape: 'circle', cx: 40, cy: 43, r: 4, terrain: 'dirt', jitter: 1, noScatter: true });
  paint({ shape: 'circle', cx: 180, cy: 16, r: 6, terrain: 'bone_ground', jitter: 1.5 });

  // --- Blackbriar Wood (dark forest) ----------------------------------------------------------------------
  paint({ shape: 'rect', x0: 192, y0: 12, x1: 242, y1: 47, terrain: 'dark_grass', jitter: 3, except: ['ash'] });
  for (const [cx, cy, r] of [[200, 24, 4], [224, 36, 5], [236, 18, 4], [206, 42, 3]]) paint({ shape: 'circle', cx, cy, r, terrain: 'moss', jitter: 2 });
  for (const [cx, cy, r] of [[218, 16, 3], [198, 34, 2.5], [232, 28, 3]]) paint({ shape: 'circle', cx, cy, r, terrain: 'mud', jitter: 1.5 });
  paint({ shape: 'circle', cx: 214, cy: 26, r: 4.5, terrain: 'grass', jitter: 1 });
  keepClearCircle(214, 26, 4);
  road([[213, 47], [214, 38], [214, 30]], 2, 'dirt', 0.6);
  road([[214, 22], [222, 16], [232, 14]], 1.5, 'mud', 0.6);

  // --- Cinderfall: obsidian plains and lava -------------------------------------------------------------
  paint({ shape: 'rect', x0: 243, y0: 30, x1: 287, y1: 47, terrain: 'scorched', jitter: 2.5 });
  for (const [cx, cy, r] of [[252, 40, 4], [270, 36, 5], [282, 44, 3], [262, 44, 3]]) paint({ shape: 'circle', cx, cy, r, terrain: 'obsidian', jitter: 1.5 });
  paint({ shape: 'line', points: [[249, 45], [253, 41], [258, 37]], width: 1.5, terrain: 'lava', jitter: 0.4 });
  paint({ shape: 'line', points: [[266, 46], [270, 42], [275, 39]], width: 1.5, terrain: 'lava', jitter: 0.4 });
  paint({ shape: 'circle', cx: 279, cy: 37, r: 2.6, terrain: 'lava', jitter: 0.6 });
  paint({ shape: 'circle', cx: 263, cy: 36, r: 2, terrain: 'lava', jitter: 0.5 });
  // the volcanic massif sealing the Cinder Depths (interior carved in dungeons.js)
  paint({ shape: 'rect', x0: 247, y0: 0, x1: 287, y1: 31, terrain: 'basalt', jitter: 1.2, raise: 4.5, falloff: 3, noise: { amp: 1.2, scale: 4 } });
  // path to the cave mouth
  road([[256, 46], [256, 36], [256, 33]], 2, 'obsidian', 0.4);
  paint({ shape: 'rect', x0: 254, y0: 30, x1: 258, y1: 33, terrain: 'obsidian', blocked: false, height: 2.0, falloff: 1 });
}

export function areas() {
  area({ id: 'ossuary_flats', name: 'Ossuary Flats', x0: 18, y0: 22, x1: 42, y1: 46, priority: 2, multi: true });
  area({ id: 'cinder_pits', name: 'Cinder Pits', x0: 60, y0: 8, x1: 86, y1: 28, priority: 2 });
  area({ id: 'scorch_rift', name: 'Scorch Rift', x0: 134, y0: 18, x1: 160, y1: 42, priority: 2 });
  area({ id: 'bloodstone', name: 'Bloodstone Circle', x0: 122, y0: 30, x1: 134, y1: 42, priority: 3, multi: true });
  area({ id: 'wrenhollow', name: 'Wrenhollow Ruins', x0: 158, y0: 32, x1: 184, y1: 46, priority: 2 });
  area({ id: 'outlaw_camp', name: 'Outlaw Camp', x0: 34, y0: 39, x1: 47, y1: 47, priority: 3 });
  area({ id: 'wyrmbone', name: 'Wyrmbone Hollow', x0: 172, y0: 9, x1: 188, y1: 23, priority: 2, multi: true });
  area({ id: 'rimeglass', name: 'Rimeglass Tarn', x0: 33, y0: 0, x1: 47, y1: 11, priority: 2 });
  area({ id: 'pale_moon', name: 'Shrine of the Pale Moon', x0: 144, y0: 0, x1: 156, y1: 10, priority: 2 });
  area({ id: 'frostfang_heights', name: 'Frostfang Heights', x0: 192, y0: 0, x1: 246, y1: 11, priority: 2, multi: true });
  area({ id: 'blackbriar', name: 'Blackbriar Wood', x0: 192, y0: 12, x1: 242, y1: 47, priority: 2 });
  area({ id: 'blackbriar_deep', name: 'Blackbriar Thicket', x0: 192, y0: 12, x1: 242, y1: 29, priority: 3, multi: true });
  area({ id: 'crows_glade', name: "Crow's Glade", x0: 209, y0: 21, x1: 219, y1: 31, priority: 4, multi: true });
  area({ id: 'cinderfall', name: 'Cinderfall', x0: 243, y0: 30, x1: 287, y1: 47, priority: 2, multi: true });
}

export function spawns() {
  // ---- warning signs just south of the ditch -------------------------------------------------------
  const warn = 'WARNING! Beyond the ditch lies the Wilderness. Those who fall there lose what they carry, and other adventurers may attack you. Turn back if you value your belongings.';
  for (const x of [40, 93, 150, 213, 256]) readable('wild_warning', x, 50, 'Warning sign', warn, 0, { model: { template: 'sign' }, examine: 'Red paint, hastily applied.' });

  // ---- Calder Ruins fortress -----------------------------------------------------------------------
  const R = rng(4242);
  const curtainGaps = [];
  for (let x = 85; x <= 107; x++) { if (R() < 0.3) curtainGaps.push([x, 17]); if (R() < 0.25) curtainGaps.push([x, 39]); }
  for (let y = 18; y <= 38; y++) { if (R() < 0.3) curtainGaps.push([84, y]); if (R() < 0.3) curtainGaps.push([108, y]); }
  for (const x of [94, 95, 96, 97, 98]) curtainGaps.push([x, 39]);
  line('wall_ruined', [[84, 17], [108, 17], [108, 39], [84, 39], [84, 17]], curtainGaps);
  for (const [x, y] of [[83, 16], [106, 16], [83, 37], [106, 37]]) obj('turret_ruined', x, y);
  obj('turret_ruined', 91, 38); obj('turret_ruined', 99, 38);
  obj('throne_ruined', 96, 24); item('ancient_coin', 97, 24, 1, 300);
  objs('statue_headless', [[88, 20], [104, 20], [88, 36, 2], [104, 36, 2]]);
  objs('banner_black', [[86, 19], [106, 19], [93, 37], [99, 37]]);
  objs('brazier_cold', [[94, 26], [98, 26], [94, 30], [98, 30]]);
  objs('skull_pike', [[93, 41], [99, 41], [92, 43], [100, 43]]);
  objs('rubble', [[87, 24], [105, 26], [89, 31], [103, 33], [97, 20], [86, 35], [106, 30]]);
  objs('rubble_dark', [[95, 36], [91, 19], [101, 21]]);
  objs('bones_pile', [[92, 29], [101, 27], [96, 32]]);
  objs('wall_ruined_low', [[88, 26], [88, 27], [104, 29], [104, 30], [93, 32], [94, 32]]);
  readable('calder_plaque', 96, 36, 'Cracked plaque', '"Here stood Calder, Shield of the North. May its stones remember us when we are gone." Below, scratched by another hand: "They don\'t."', 0, { model: { template: 'gravestone' } });

  // ---- Ossuary Flats -----------------------------------------------------------------------------------
  obj('ribcage', 19, 27); obj('ribcage', 36, 30, 1); obj('dragon_skull', 22, 34, 3);
  objs('skull_pike', [[24, 24], [34, 25], [18, 38], [40, 37]]);
  objs('grave_mound', [[22, 41], [35, 41], [38, 34]]);
  objs('grave_cross_tilted', [[24, 44], [36, 44, 1]]);
  for (const [x, y] of [[26, 36], [29, 36], [32, 36]]) readable('ossuary_grave', x, y + 9, 'Gravestone', ['"Here lies a fool who thought he could outrun a wolf."', '"Gone to look for treasure. Found it. Then found the skeletons."', '"Rest well, Brannoc. You were wrong about the ditch."'][(x - 26) / 3], 0, { model: { template: 'gravestone' } });

  // ---- Bloodstone Circle -------------------------------------------------------------------------------
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; obj('menhir_dark', Math.round(128 + Math.cos(a) * 3.6), Math.round(36 + Math.sin(a) * 3.6), i % 4); }
  obj('shrine_red', 128, 36);
  objs('bones_pile', [[126, 34], [131, 38]]);
  obj('campfire_ghost', 125, 39);

  // ---- Scorch Rift -------------------------------------------------------------------------------------
  objs('obsidian_spike', [[139, 20], [145, 22], [151, 26], [154, 30], [158, 37], [137, 25], [149, 34]]);
  objs('lava_rock', [[140, 24], [147, 31], [153, 35], [144, 27], [157, 34]]);
  obj('embers', 146, 29); obj('embers', 154, 34);
  readable('rift_sign', 140, 26, 'Charred sign', '"BRIDGE OUT." Someone has added: "There never was a bridge."', 0, { model: { template: 'sign' } });

  // ---- Wrenhollow ruins -----------------------------------------------------------------------------------
  obj('burnt_house', 161, 34); obj('burnt_house', 174, 34); obj('burnt_house', 177, 41);
  building('Ruined cottage', 163, 41, 5, 4, 'wall_ruined_low', false, [{ side: 'n', offset: 2 }]);
  building('Ruined chapel', 166, 34, 6, 5, 'wall_ruined', false, [{ side: 's', offset: 2, width: 2 }], { floor: 'dark_stone' });
  obj('well_ruined', 171, 43);
  obj('cart_broken', 168, 45); obj('scarecrow', 181, 44);
  objs('grave_cross_tilted', [[160, 44], [161, 46, 1]]); obj('grave_mound', 162, 45);
  objs('rubble_dark', [[170, 36], [179, 38], [164, 39]]);
  obj('pew', 167, 36);
  readable('wren_notice', 172, 40, 'Notice board', '"By order of the Reeve: Wrenhollow is to be abandoned before the first snows. The Ashen host is coming. Take only what you can carry." The notice is dated over a century ago.', 0, { model: { template: 'dec_notice_board' } });

  // ---- Outlaw camp -------------------------------------------------------------------------------------------
  obj('tent_ragged', 36, 41); obj('tent_ragged', 43, 40, 1); obj('tent_canvas', 38, 45, 2);
  obj('campfire', 40, 43);
  objs('crate_stack', [[44, 44], [35, 44]]); obj('barrel_stack', 45, 42);
  objs('spike_barricade', [[33, 42, 1], [47, 43, 1], [41, 39]]);
  obj('stool', 41, 44); obj('stool', 39, 42);
  npc('highway_bandit', 40, 42, 3); npc('highway_bandit', 37, 44, 3); npc('highway_bandit', 44, 42, 3);

  // ---- Wyrmbone Hollow ------------------------------------------------------------------------------------------
  obj('dragon_skull', 178, 13, 1); obj('ribcage', 182, 16, 1);
  objs('bones_pile', [[176, 18], [184, 13], [180, 20], [174, 14]]);
  objs('bones_scattered', [[177, 16], [183, 19], [186, 15]]);
  objs('obsidian_spike', [[175, 11], [186, 20]]);
  item('big_bones', 179, 17, 1, 100); item('big_bones', 183, 14, 1, 100); item('coins', 181, 12, 80, 200);

  // ---- Frostfang: Rimeglass Tarn & the Pale Moon shrine ------------------------------------------------------------
  objs('ice_spike', [[35, 4], [45, 3], [36, 9], [44, 9], [47, 6]]);
  objs('rocks_snow', [[33, 7], [46, 1]]);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; obj('menhir_snow', Math.round(150 + Math.cos(a) * 3.2), Math.round(5 + Math.sin(a) * 3.2)); }
  obj('shrine_blue', 150, 4);
  obj('wisps_blue', 151, 6);
  readable('pale_moon', 149, 8, 'Frosted plaque', '"When the pale moon is full, the dead of Calder walk to this place to remember the sun." The ice around the shrine never melts.', 0, { model: { template: 'gravestone' } });
  objs('ice_spike', [[192, 5], [199, 4], [200, 9], [226, 6], [208, 9], [241, 8]]);
  objs('crag_snow', [[202, 2], [229, 3], [244, 5]]);

  // ---- Blackbriar Wood --------------------------------------------------------------------------------------------
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; obj('menhir', Math.round(214 + Math.cos(a) * 3.4), Math.round(26 + Math.sin(a) * 3.4)); }
  obj('dolmen', 213, 26); obj('totem_skull', 214, 23);
  obj('wisps', 216, 28);
  obj('stilt_hut_green', 230, 18);
  obj('cauldron_purple', 233, 20); item('ancient_coin', 231, 21, 1, 300); objs('skull_pike', [[228, 21], [234, 17]]); obj('totem_skull', 229, 22);
  readable('hag_sign', 227, 20, 'Crooked sign', '"Hexes removed. Hexes applied. No refunds." The sign is nailed up with a finger bone.', 0, { model: { template: 'sign' } });
  objs('cobweb', [[198, 20], [205, 16], [222, 14], [238, 24], [201, 30], [226, 27]]);
  // Blackbriar & Cinderfall monsters (new regions)
  npcScatter(['dread_wolf'], [194, 30, 240, 46], 5, 4401, 6);
  npcScatter(['wasteland_reaver'], [194, 32, 240, 46], 3, 4402, 5);
  npcScatter(['moss_dragon'], [196, 13, 240, 26], 2, 4403, 4);
  npcScatter(['keening_hag'], [222, 14, 238, 24], 2, 4404, 3);
  npcScatter(['giant_spider'], [194, 14, 240, 30], 4, 4405, 5);
  npcScatter(['ember_elemental'], [244, 34, 286, 46], 3, 4406, 4);
  npcScatter(['ashfiend'], [244, 34, 286, 46], 3, 4407, 4);
  npc('cinder_giant', 276, 44, 4);
  npcScatter(['rimefang_wolf'], [194, 1, 246, 11], 4, 4408, 5);
  npc('rime_giant', 220, 6, 3);
  npc('wailing_shade', 167, 37, 4); npc('wailing_shade', 173, 42, 4);
}

export function decor() {
  // near the ditch: dry grass, stones, dead bushes
  scatter([{ id: 'grass_tuft_dry', weight: 4 }, { id: 'dead_bush', weight: 2 }, { id: 'pebbles', weight: 1 }, { id: 'rocks', weight: 1 }], [1, 36, 286, 47], { density: 0.03, seed: 4501, spacing: 0 });
  // the wastes: bones, charred bushes, black stones
  scatter([{ id: 'dead_bush_ash', weight: 4 }, { id: 'bones_scattered', weight: 2 }, { id: 'pebbles_dark', weight: 3 }, { id: 'bones_pile', weight: 1 }, { id: 'rocks_dark', weight: 1 }], [1, 12, 246, 40], { density: 0.022, seed: 4502, spacing: 0 });
  scatter([{ id: 'skull_pike', weight: 1 }, { id: 'menhir_dark', weight: 1 }, { id: 'crag_dark', weight: 1 }], [1, 12, 190, 36], { count: 18, seed: 4503, spacing: 3 });
  scatter([{ id: 'lava_rock', weight: 3 }, { id: 'obsidian_spike', weight: 2 }], [40, 16, 64, 34], { count: 10, seed: 4504, spacing: 1 });
  scatter([{ id: 'bones_pile', weight: 3 }, { id: 'bones_scattered', weight: 3 }], [18, 22, 42, 46], { count: 26, seed: 4505, spacing: 0, terrain: ['bone_ground'] });
  // Frostfang
  scatter([{ id: 'snowdrift', weight: 4 }, { id: 'rocks_snow', weight: 2 }, { id: 'ice_spike', weight: 1 }, { id: 'menhir_snow', weight: 0.2 }], [1, 1, 246, 11], { density: 0.035, seed: 4506, spacing: 1, terrain: ['snow'] });
  scatter(['crag_snow'], [1, 1, 246, 10], { count: 16, seed: 4507, spacing: 3, terrain: ['snow'] });
  // Blackbriar Wood: dense gnarled trees and undergrowth
  scatter([{ id: 'tree_gnarled_leafy', weight: 5 }, { id: 'tree_gnarled', weight: 3 }, { id: 'tree_gnarled_large', weight: 1 }, { id: 'dead_tree', weight: 2 }], [192, 12, 242, 46], { density: 0.07, seed: 4508, spacing: 1 });
  scatter([{ id: 'mushrooms_purple', weight: 3 }, { id: 'grass_tuft_dark', weight: 4 }, { id: 'rocks_mossy', weight: 1 }, { id: 'mushrooms_glow', weight: 1 }], [192, 12, 242, 46], { density: 0.035, seed: 4509, spacing: 0 });
  scatter(['fallen_log_mossy'], [192, 12, 242, 46], { count: 12, seed: 4513, spacing: 1 });
  scatter(['wisps'], [192, 12, 242, 40], { count: 5, seed: 4510, spacing: 4 });
  // Cinderfall
  scatter([{ id: 'obsidian_spike', weight: 3 }, { id: 'lava_rock', weight: 3 }, { id: 'crag_dark', weight: 1 }, { id: 'bones_pile', weight: 1 }], [243, 32, 286, 46], { density: 0.035, seed: 4511, spacing: 1 });
  scatter(['embers'], [243, 32, 286, 46], { count: 6, seed: 4512, spacing: 4 });
}
