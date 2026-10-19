// World layout. OWNER: agent D.
// Coordinates are tiles: x east, y SOUTH (y=0 is the far north). World is 288 x 256.
// Order matters: paint ops are applied top to bottom, then building floors, then spawn rules.
// See ARCHITECTURE.md "Map data" for every op / rule field.
//
//   y 0-11    Frostfang Peaks (Wilderness, snow)                    x 0-287
//   y 12-47   Ashen Wastes (Wilderness) - Calder Ruins (96,28), Ossuary Flats, Cinder Pits, Wrenhollow,
//             Blackbriar Wood (x 192-240), Cinderfall (x 241-287), Cinder Depths cave (NE pocket)
//   y 48      Wilderness Ditch (full width)
//   x 0-191   the original vale: Brackenford, Thornwood, Greystone, Silverrun, Mirrowmere, Highmarch,
//             Haverly Farms, Murkfen, Saltmarsh Coast (+ Bogwick, Gullhaven, Morrow's Rest)
//   x 183-240 Greyspine Mountains (Durnhold) · x 241-287 Faelwood (Ilvaren) · y 112-134 Bramblemoor
//   x 192-287, y 134-200  Sunscar Badlands (Dustwatch)
//   y 184-215 the Southern Sea (islands) · y 216-223 sea cliffs · y 224-255 sealed dungeon band
//
// The detailed regions live in content/map_regions/*.js and are called below in a fixed order.

import { setMapConfig, registerPaint as paint, registerArea as area, registerSpawn as spawn } from '../core/registry.js';
import { addTerrainType } from '../world/terrain.js';
import * as wild from './map_regions/wilderness.js';
import * as vale from './map_regions/vale.js';
import * as coast from './map_regions/coast.js';
import * as east from './map_regions/east.js';
import * as dungeons from './map_regions/dungeons.js';

export const WORLD_W = 288, WORLD_H = 256;

setMapConfig({
  width: WORLD_W, height: WORLD_H, seed: 1337, baseTerrain: 'grass', waterLevel: 0, hillAmplitude: 2.2,
  spawn: { x: 96, y: 141 }, respawn: { x: 96, y: 141 }, wildernessEdgeY: 48,
});

// ---- extra terrain types (append-only) --------------------------------------------------------------
addTerrainType({ id: 'heath', color: '#77704a', var: 0.12, natural: true });
addTerrainType({ id: 'red_sand', color: '#c47c4c', var: 0.07, natural: true, minimap: '#c8845a' });
addTerrainType({ id: 'cracked_earth', color: '#a3825e', var: 0.1, natural: true });
addTerrainType({ id: 'redrock', color: '#93533a', var: 0.1, walkable: false, natural: true, minimap: '#7a4430' });
addTerrainType({ id: 'ice', color: '#bfdceb', var: 0.04, natural: true, minimap: '#cfe6f2' });
addTerrainType({ id: 'glade_grass', color: '#4e9a5c', var: 0.1, natural: true });
addTerrainType({ id: 'moss', color: '#4a6e34', var: 0.1, natural: true });
addTerrainType({ id: 'gravel', color: '#8e877a', var: 0.08 });
addTerrainType({ id: 'obsidian', color: '#2c2630', var: 0.12, natural: true, minimap: '#2a2430' });
addTerrainType({ id: 'mud', color: '#5a4a32', var: 0.08, natural: true });
addTerrainType({ id: 'crypt_floor', color: '#5e5a56', var: 0.05 });
addTerrainType({ id: 'sandstone_floor', color: '#c8b088', var: 0.05 });
addTerrainType({ id: 'sewer_floor', color: '#5c5a50', var: 0.06 });
addTerrainType({ id: 'basalt', color: '#36302e', var: 0.1, walkable: false, natural: true, minimap: '#262222' });
addTerrainType({ id: 'bone_ground', color: '#9a8e78', var: 0.1, natural: true });
addTerrainType({ id: 'wet_rock', color: '#6e6a64', var: 0.08 });
addTerrainType({ id: 'scorched', color: '#3e342c', var: 0.12, natural: true });
addTerrainType({ id: 'dark_stone', color: '#4a4644', var: 0.08 });

// =================================================================================================
// Base terrain painting (the original 192x192 layout, widened to the new size)
// =================================================================================================
// --- Wilderness --------------------------------------------------------------------------------------
paint({ shape: 'rect', x0: 0, y0: 0, x1: WORLD_W - 1, y1: 47, terrain: 'wild_grass', noise: { amp: 0.7, scale: 9 } });
for (const [cx, cy, r] of [[30, 30, 7], [70, 18, 6], [120, 40, 6], [165, 22, 8], [140, 32, 5], [52, 26, 7], [150, 30, 7]]) {
  paint({ shape: 'circle', cx, cy, r, terrain: 'ash', jitter: 2 });
}
paint({ shape: 'rect', x0: 0, y0: 0, x1: WORLD_W - 1, y1: 11, terrain: 'snow', jitter: 2.5, raise: 1.6, noise: { amp: 1.4, scale: 6 } });
paint({ shape: 'circle', cx: 52, cy: 26, r: 3.5, terrain: 'lava', jitter: 1 });
paint({ shape: 'circle', cx: 150, cy: 30, r: 4, terrain: 'lava', jitter: 1 });
paint({ shape: 'circle', cx: 96, cy: 28, r: 8, terrain: 'stone', jitter: 1.5, height: 1.2, falloff: 3 });
paint({ shape: 'line', points: [[96, 47], [96, 36]], width: 2, terrain: 'dirt', noScatter: true });
wild.paintTerrain();
// ditch band
paint({ shape: 'rect', x0: 0, y0: 46, x1: WORLD_W - 1, y1: 50, height: 1.0 });
paint({ shape: 'rect', x0: 0, y0: 48, x1: WORLD_W - 1, y1: 48, terrain: 'ditch', height: 0.2, noScatter: true });

// --- East mountains (Craghorn Ridge between the vale and the eastern lands) ---------------------------
paint({ shape: 'rect', x0: 183, y0: 46, x1: 191, y1: 178, terrain: 'mountain', jitter: 2.5, raise: 5, falloff: 3, noise: { amp: 1.5, scale: 4 } });
paint({ shape: 'rect', x0: 187, y0: 46, x1: 191, y1: 178, terrain: 'snow', jitter: 1.5, blocked: true, only: ['mountain'] });

// --- Coast & southern sea ----------------------------------------------------------------------------
paint({ shape: 'rect', x0: 45, y0: 178, x1: WORLD_W - 1, y1: 191, terrain: 'sand', jitter: 1.5, height: 0.35, falloff: 3 });
paint({ shape: 'rect', x0: 45, y0: 184, x1: WORLD_W - 1, y1: 217, terrain: 'water', jitter: 1.5 });

// --- Forest, swamp, quarry ----------------------------------------------------------------------------
paint({ shape: 'rect', x0: 46, y0: 104, x1: 76, y1: 172, terrain: 'dark_grass', jitter: 3 });
paint({ shape: 'rect', x0: 50, y0: 120, x1: 72, y1: 160, terrain: 'flowers', jitter: 2, only: ['grass'] });
paint({ shape: 'rect', x0: 76, y0: 162, x1: 112, y1: 177, terrain: 'swamp', jitter: 3, height: 0.25, falloff: 3 });
paint({ shape: 'circle', cx: 88, cy: 170, r: 2.5, terrain: 'water', jitter: 0.8 });
paint({ shape: 'circle', cx: 101, cy: 168, r: 1.8, terrain: 'water', jitter: 0.6 });
paint({ shape: 'circle', cx: 44, cy: 76, r: 15, terrain: 'stone', jitter: 3, raise: 0.9, falloff: 5, noise: { amp: 0.6, scale: 5 } });

// --- Rivers and lake ------------------------------------------------------------------------------------
paint({ shape: 'line', points: [[132, 49], [128, 70], [124, 95], [126, 115], [127, 135], [124, 160], [120, 186]], width: 4, terrain: 'water', jitter: 0.6 });
paint({ shape: 'circle', cx: 146, cy: 120, r: 8, terrain: 'water', jitter: 1.5 });
paint({ shape: 'line', points: [[126, 115], [139, 118]], width: 3, terrain: 'water', jitter: 0.4 });

// --- Gloomhollow Depths (dungeon, SW corner, sealed by void) ----------------------------------------------
paint({ shape: 'rect', x0: 0, y0: 158, x1: 44, y1: 191, terrain: 'void', raise: 3, falloff: 2 });
paint({ shape: 'line', points: [[20, 177], [30, 170], [38, 178], [32, 186], [16, 185], [8, 174], [16, 166], [30, 170]], width: 4, terrain: 'cave_floor', height: 0.2, jitter: 0.8 });
for (const [cx, cy, r] of [[20, 177, 4.5], [34, 182, 5], [10, 168, 3.5], [24, 165, 3]]) paint({ shape: 'circle', cx, cy, r, terrain: 'cave_floor', height: 0.2, jitter: 1 });

// --- Towns: flatten + streets ------------------------------------------------------------------------------
// Brackenford
paint({ shape: 'rect', x0: 78, y0: 124, x1: 116, y1: 158, height: 1.0, falloff: 5, noScatter: true });
paint({ shape: 'circle', cx: 96, cy: 140, r: 6, terrain: 'cobble', noScatter: true });
paint({ shape: 'line', points: [[80, 140], [114, 140]], width: 3, terrain: 'cobble', noScatter: true });
paint({ shape: 'line', points: [[96, 126], [96, 156]], width: 3, terrain: 'cobble', noScatter: true });
// Highmarch
paint({ shape: 'rect', x0: 140, y0: 52, x1: 182, y1: 102, height: 1.3, falloff: 5, noScatter: true });
paint({ shape: 'line', points: [[141, 77], [181, 77]], width: 3, terrain: 'cobble', noScatter: true });
paint({ shape: 'line', points: [[161, 54], [161, 101]], width: 3, terrain: 'cobble', noScatter: true });
paint({ shape: 'circle', cx: 161, cy: 77, r: 6, terrain: 'cobble', noScatter: true });
// Haverly Farms fields
paint({ shape: 'rect', x0: 141, y0: 149, x1: 156, y1: 161, terrain: 'farmland', height: 0.9, noScatter: true });

// --- Roads -------------------------------------------------------------------------------------------------
const road = (points, width = 2) => paint({ shape: 'line', points, width, terrain: 'dirt', noScatter: true, jitter: 0.3 });
road([[96, 124], [96, 104], [92, 84], [94, 64], [96, 49]], 3);                 // north to the ditch
road([[80, 140], [62, 138], [50, 132]]);                                        // west into Thornwood
road([[62, 138], [56, 110], [46, 88]]);                                         // quarry
road([[114, 140], [121, 140]], 3); road([[132, 140], [140, 140], [150, 150], [158, 158]]); // east + farm
road([[138, 140], [135, 128], [138, 106], [161, 103]], 3);                     // Highmarch south gate
road([[96, 100], [110, 92], [119, 92]]); road([[132, 92], [138, 84], [141, 77]]); // Highmarch west gate
road([[96, 156], [94, 166], [96, 178]]);                                        // to the coast

// --- Bridges (after rivers so they replace the water) ---------------------------------------------------------
paint({ shape: 'rect', x0: 120, y0: 139, x1: 132, y1: 141, terrain: 'wood_floor', height: 0.55, noScatter: true });
paint({ shape: 'rect', x0: 118, y0: 91, x1: 132, y1: 93, terrain: 'wood_floor', height: 0.55, noScatter: true });

// --- Detailed regions (terrain) ----------------------------------------------------------------------------------
vale.paintTerrain();
coast.paintTerrain();
east.paintTerrain();
dungeons.paintTerrain();

// =================================================================================================
// Areas (names shown on entry; `safe` areas never count as Wilderness; `dungeon` darkens the sky)
// =================================================================================================
area({ id: 'vale', name: 'Ashvale', x0: 0, y0: 49, x1: WORLD_W - 1, y1: WORLD_H - 1, priority: -10 });
area({ id: 'wilderness', name: 'The Wilderness', x0: 0, y0: 0, x1: WORLD_W - 1, y1: 47, priority: 0 });
area({ id: 'ashen_wastes', name: 'Ashen Wastes', x0: 0, y0: 12, x1: WORLD_W - 1, y1: 47, priority: 1 });
area({ id: 'frostfang', name: 'Frostfang Peaks', x0: 0, y0: 0, x1: WORLD_W - 1, y1: 11, priority: 1 });
area({ id: 'calder_ruins', name: 'Calder Ruins', x0: 87, y0: 19, x1: 105, y1: 37, priority: 2, multi: true });
area({ id: 'brackenford', name: 'Brackenford', x0: 78, y0: 124, x1: 116, y1: 158, priority: 5 });
area({ id: 'highmarch', name: 'Highmarch', x0: 140, y0: 52, x1: 182, y1: 102, priority: 5 });
area({ id: 'thornwood', name: 'Thornwood', x0: 46, y0: 104, x1: 76, y1: 172, priority: 3 });
area({ id: 'greystone', name: 'Greystone Quarry', x0: 29, y0: 60, x1: 60, y1: 92, priority: 3 });
area({ id: 'mirrowmere', name: 'Mirrowmere', x0: 134, y0: 108, x1: 158, y1: 132, priority: 3 });
area({ id: 'haverly', name: 'Haverly Farms', x0: 140, y0: 146, x1: 180, y1: 177, priority: 3 });
area({ id: 'murkfen', name: 'Murkfen Swamp', x0: 76, y0: 160, x1: 112, y1: 177, priority: 3 });
area({ id: 'saltmarsh', name: 'Saltmarsh Coast', x0: 45, y0: 178, x1: 191, y1: 191, priority: 2 });
area({ id: 'gloomhollow', name: 'Gloomhollow Depths', x0: 0, y0: 158, x1: 44, y1: 191, priority: 10, dungeon: true, multi: true });
wild.areas();
vale.areas();
coast.areas();
east.areas();
dungeons.areas();

// =================================================================================================
// Spawns (hand-placed regions first so the random scatters below flow around them)
// =================================================================================================
// --- Wilderness ditch (one long object) -------------------------------------------------------------------
spawn({ type: 'object', id: 'wilderness_ditch', x: 1, y: 48, w: WORLD_W - 2, h: 1 });

vale.spawns();
coast.spawns();
east.spawns();
wild.spawns();
dungeons.spawns();

// --- Brackenford ----------------------------------------------------------------------------------------------
spawn({ type: 'building', name: 'Bank', x: 98, y: 127, w: 8, h: 7, wall: 'wall_stone', floor: 'stone_floor', roof: '#5a4a6a', doors: [{ side: 's', offset: 3 }] });
for (const x of [100, 101, 102, 103]) spawn({ type: 'object', id: 'bank_booth', x, y: 129 });
spawn({ type: 'building', name: 'General Store', x: 84, y: 127, w: 8, h: 7, wall: 'wall_plaster', roof: '#8a3a2a', doors: [{ side: 's', offset: 4 }] });
spawn({ type: 'object', id: 'table', x: 86, y: 129 });
spawn({ type: 'object', id: 'crate', x: 85, y: 128 });
spawn({ type: 'object', id: 'barrel', x: 90, y: 128 });
spawn({ type: 'building', name: 'Kitchen', x: 84, y: 146, w: 7, h: 7, wall: 'wall_wood', roof: '#6a4a2a', doors: [{ side: 'n', offset: 4 }] });
spawn({ type: 'object', id: 'cooking_range', x: 86, y: 150 });
spawn({ type: 'object', id: 'table', x: 88, y: 150 });
spawn({ type: 'building', name: 'House', x: 101, y: 147, w: 7, h: 6, wall: 'wall_plaster', roof: '#7a3a2a', doors: [{ side: 'n', offset: 2 }], doorObject: 'door_wood' });
spawn({ type: 'building', name: 'Chapel', x: 108, y: 126, w: 8, h: 8, wall: 'wall_stone', floor: 'stone_floor', roof: '#4a4a5a', doors: [{ side: 's', offset: 3, width: 2 }] });
spawn({ type: 'object', id: 'altar', x: 111, y: 128 });
spawn({ type: 'object', id: 'furnace', x: 107, y: 137 });
spawn({ type: 'object', id: 'anvil', x: 107, y: 142 });
spawn({ type: 'object', id: 'anvil', x: 109, y: 142 });
spawn({ type: 'object', id: 'barrel', x: 110, y: 137 });
spawn({ type: 'object', id: 'well', x: 92, y: 136 });
for (const [x, y] of [[90, 134], [102, 134], [91, 146], [102, 146]]) spawn({ type: 'object', id: 'lamp_post', x, y });
spawn({ type: 'object', id: 'signpost', x: 93, y: 143 });
spawn({ type: 'object', id: 'market_stall', x: 98, y: 145 });

// --- Bridges railings ------------------------------------------------------------------------------------------
spawn({ type: 'line', id: 'fence_wood', points: [[120, 138], [132, 138]] });
spawn({ type: 'line', id: 'fence_wood', points: [[120, 142], [132, 142]] });
spawn({ type: 'line', id: 'fence_wood', points: [[118, 90], [132, 90]] });
spawn({ type: 'line', id: 'fence_wood', points: [[118, 94], [132, 94]] });

// --- Goblin camp east of town ------------------------------------------------------------------------------------
spawn({ type: 'object', id: 'crate', x: 114, y: 155 });
spawn({ type: 'object', id: 'barrel', x: 115, y: 155 });

// --- Highmarch -----------------------------------------------------------------------------------------------------
spawn({ type: 'line', id: 'wall_stone', points: [[140, 52], [182, 52], [182, 102], [140, 102], [140, 52]], gaps: [[140, 76], [140, 77], [140, 78], [160, 102], [161, 102], [162, 102], [182, 76], [182, 77], [182, 78]] });
spawn({ type: 'building', name: 'Highmarch Keep', x: 155, y: 55, w: 13, h: 10, wall: 'wall_dark', floor: 'stone_floor', roof: '#3a3a4a', doors: [{ side: 's', offset: 6 }] });
spawn({ type: 'building', name: 'Bank', x: 143, y: 69, w: 8, h: 6, wall: 'wall_stone', floor: 'stone_floor', roof: '#5a4a6a', doors: [{ side: 'e', offset: 3 }] });
for (const y of [70, 71, 72]) spawn({ type: 'object', id: 'bank_booth', x: 145, y, rot: 3 });
spawn({ type: 'building', name: 'Arms shop', x: 168, y: 69, w: 7, h: 6, wall: 'wall_plaster', roof: '#2a5a3a', doors: [{ side: 'w', offset: 3 }] });
spawn({ type: 'building', name: 'House', x: 168, y: 84, w: 7, h: 7, wall: 'wall_plaster', roof: '#7a3a2a', doors: [{ side: 'w', offset: 3 }] });
spawn({ type: 'building', name: "Warden's lodge", x: 143, y: 85, w: 8, h: 7, wall: 'wall_wood', roof: '#4a3a2a', doors: [{ side: 'e', offset: 3 }] });
spawn({ type: 'building', name: 'Temple', x: 171, y: 55, w: 9, h: 8, wall: 'wall_stone', floor: 'stone_floor', roof: '#4a4a5a', doors: [{ side: 's', offset: 4 }] });
spawn({ type: 'object', id: 'altar', x: 175, y: 57 });
spawn({ type: 'building', name: 'House', x: 150, y: 90, w: 6, h: 6, wall: 'wall_plaster', roof: '#8a4a2a', doors: [{ side: 'n', offset: 2 }] });
spawn({ type: 'building', name: 'House', x: 170, y: 93, w: 7, h: 6, wall: 'wall_wood', roof: '#6a3a2a', doors: [{ side: 'n', offset: 3 }] });
for (const [x, y] of [[156, 73], [164, 73], [156, 81], [164, 81]]) spawn({ type: 'object', id: 'market_stall', x, y });
spawn({ type: 'object', id: 'well', x: 161, y: 77 });
for (const [x, y] of [[152, 76], [170, 76], [160, 68], [160, 96]]) spawn({ type: 'object', id: 'lamp_post', x, y });

// --- Haverly Farms --------------------------------------------------------------------------------------------------
spawn({ type: 'line', id: 'fence_wood', points: [[158, 150], [167, 150], [167, 158], [158, 158], [158, 150]], gaps: [[162, 158]] });
spawn({ type: 'line', id: 'fence_wood', points: [[160, 161], [178, 161], [178, 175], [160, 175], [160, 161]], gaps: [[160, 166], [160, 167]] });
spawn({ type: 'building', name: 'Farmhouse', x: 142, y: 165, w: 8, h: 7, wall: 'wall_wood', roof: '#8a6a3a', doors: [{ side: 'e', offset: 3 }], doorObject: 'door_wood' });
for (const [x, y] of [[152, 164], [154, 166], [151, 168]]) spawn({ type: 'object', id: 'hay_bale', x, y });

// --- Thornwood + vale trees -------------------------------------------------------------------------------------------
spawn({ type: 'scatter', ids: [{ id: 'tree_normal', weight: 6 }, { id: 'tree_birch', weight: 3 }, { id: 'tree_redleaf', weight: 1 }, { id: 'pine_tree', weight: 1 }], rect: [46, 104, 76, 172], density: 0.075, seed: 1 });
spawn({ type: 'scatter', ids: [{ id: 'tree_normal', weight: 4 }, { id: 'pine_tree', weight: 2 }, { id: 'tree_birch', weight: 1 }], rect: [1, 50, 182, 178], density: 0.006, seed: 2 });
spawn({ type: 'scatter', ids: ['bush', 'berry_bush'], rect: [1, 50, 182, 178], density: 0.004, seed: 4 });
spawn({ type: 'scatter', ids: ['flowers'], rect: [1, 50, 182, 178], density: 0.006, seed: 6, spacing: 0 });

// --- Greystone Quarry -------------------------------------------------------------------------------------------------
spawn({ type: 'object', id: 'cave_entrance', x: 33, y: 63 });
spawn({ type: 'scatter', ids: ['boulder'], rect: [29, 60, 60, 92], count: 10, seed: 8, terrain: ['stone'] });

// --- Murkfen ---------------------------------------------------------------------------------------------------------------
spawn({ type: 'scatter', ids: ['dead_tree', 'bush'], rect: [76, 162, 112, 177], count: 14, seed: 13, terrain: ['swamp'] });

// --- Gloomhollow Depths ---------------------------------------------------------------------------------------------------
spawn({ type: 'object', id: 'cave_rope', x: 20, y: 175 });
spawn({ type: 'scatter', ids: ['boulder'], rect: [2, 160, 42, 190], count: 8, seed: 19, terrain: ['cave_floor'] });

// --- Wilderness ---------------------------------------------------------------------------------------------------------------
spawn({ type: 'scatter', ids: ['dead_tree'], rect: [1, 12, 190, 46], density: 0.012, seed: 20 });
spawn({ type: 'scatter', ids: ['snow_pine'], rect: [1, 1, 250, 11], density: 0.04, seed: 21, terrain: ['snow'] });
spawn({ type: 'scatter', ids: ['boulder'], rect: [1, 1, 190, 46], density: 0.004, seed: 22 });
for (const [x, y] of [[90, 22], [102, 22], [90, 34], [102, 34], [93, 22], [99, 34]]) spawn({ type: 'object', id: 'pillar', x, y });
for (const [x, y] of [[96, 22], [90, 28], [102, 28], [96, 34]]) spawn({ type: 'object', id: 'broken_pillar', x, y });
for (const [x, y] of [[92, 25], [93, 25], [100, 31], [101, 31], [100, 25]]) spawn({ type: 'object', id: 'ruin_wall', x, y });
spawn({ type: 'object', id: 'obelisk', x: 96, y: 27 });
for (let i = 0; i < 9; i++) spawn({ type: 'object', id: 'gravestone', x: 26 + (i % 3) * 3, y: 36 + Math.floor(i / 3) * 3 });

// --- Decorative scatter (last, so it fills whatever space is left) ---------------------------------------------------
vale.decor();
coast.decor();
east.decor();
wild.decor();
dungeons.decor();
