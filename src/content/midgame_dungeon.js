// The Glimmerdeep - a three-level mid-game dungeon (combat ~40-75) beneath the Whisperstones.
// OWNER: content designer (mid-game). Imported by content/index.js. Monsters: midgame_monsters.js, gear:
// midgame_items.js, quests (gates, puzzles, quest NPCs): midgame_quests.js, coordinates: midgame_common.js.
//
// Lore: the Lanternwrights were a guild of lamp-smiths who lit Highmarch and Brackenford with glimmerstone, a
// pale ore that holds light. They dug the Glimmerdeep under the Whisperstones, built a great forge at its bottom
// and an engine to make light that never dies. The engine took the guild instead. Then the Silverrun broke in.
//
// Map technique: the world grows by one sealed band (y 256-287, world now 288 x 288). The band is painted `void`
// like the other sealed dungeon pockets; floors are carved with paint ops; levels are linked by two-way
// teleport objects. Areas are `dungeon: true` so the world map shows them on the Underground layer.

import { setMapConfig, getMapConfig, registerPaint, registerArea, registerSpawn, registerObject, registerData } from '../core/registry.js';
import { registerSceneryTemplate } from '../render/models.js';
import { GD } from './midgame_common.js';
import './midgame_items.js';
import './midgame_monsters.js';

// ---- world: one more sealed band at the bottom -------------------------------------------------------------
setMapConfig({ height: Math.max(getMapConfig().height || 256, 288) });

const paint = registerPaint, area = registerArea;
const obj = (id, x, y, rot = 0, extra = {}) => registerSpawn({ type: 'object', id, x, y, rot, ...extra });
const objs = (id, pts) => { for (const [x, y, rot = 0] of pts) obj(id, x, y, rot); };
const npc = (id, x, y, wander = 3) => registerSpawn({ type: 'npc', id, x, y, wander });
const npcScatter = (ids, rect, count, seed, wander = 3, extra = {}) => registerSpawn({ type: 'scatter', kind: 'npc', ids, rect, count, seed, wander, ...extra });
const item = (id, x, y, qty = 1, respawnTicks = 100) => registerSpawn({ type: 'item', id, x, y, qty, respawnTicks });
const floor = (shape, terrain, extra = {}) => paint({ height: 0.2, blocked: false, ...shape, terrain, ...extra });
const rect = (x0, y0, x1, y1, terrain, extra = {}) => floor({ shape: 'rect', x0, y0, x1, y1 }, terrain, extra);
const circ = (cx, cy, r, terrain, extra = {}) => floor({ shape: 'circle', cx, cy, r, jitter: 1 }, terrain, extra);
const tunnel = (points, width, terrain, extra = {}) => floor({ shape: 'line', points, width, jitter: 0.6 }, terrain, extra);
let readN = 0;
function lore(x, y, name, text, model = { template: 'sign' }, rot = 0) {
  const id = `gd_lore_${++readN}`;
  registerObject({ id, name, examine: `A ${name.toLowerCase()}.`, options: ['Read'], readText: text, model });
  obj(id, x, y, rot);
  return id;
}
const portal = (id, name, examine, option, model, dest, extra = {}) =>
  registerObject({ id, name, examine, options: [option], teleport: { x: dest[0], y: dest[1], message: extra.message }, model, size: extra.size, mapIcon: extra.mapIcon, blocks: extra.blocks });

// =================================================================================================
// Scenery templates (dungeon furniture + quest props)
// =================================================================================================
registerSceneryTemplate('gd_wheel', (b, p) => {
  b.box('#5a5650', 0.9, 0.4, 0.5, [0, 0.2, -0.25], [0, 0, 0], 0.1);
  b.cyl('#3a3a40', 0.06, 0.06, 0.9, 6, [0, 0.75, -0.1], [Math.PI / 2, 0, 0]);
  b.cyl(p.open ? '#4a8a6a' : '#7a4a2a', 0.42, 0.42, 0.06, 10, [0, 0.95, 0.25], [Math.PI / 2, 0, 0], 0.05);
  for (let i = 0; i < 4; i++) b.box('#2a2a2e', 0.06, 0.8, 0.06, [0, 0.95, 0.27], [0, 0, i * Math.PI / 4]);
});
registerSceneryTemplate('gd_hatch', (b, p) => {
  b.box('#4a4842', 1.9, 0.25, 1.9, [0, 0.12, 0], [0, 0, 0], 0.08);
  b.box(p.open ? '#0a0808' : '#6a665e', 1.3, 0.06, 1.3, [0, 0.27, 0], [0, 0, 0], 0.05);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.cyl('#3a3634', 0.09, 0.09, 0.2, 6, [Math.cos(a) * 0.75, 0.35, Math.sin(a) * 0.75]);
    b.sphere(p.open ? '#ffe9a0' : '#5a5a60', 0.08, [Math.cos(a) * 0.75, 0.5, Math.sin(a) * 0.75]);
  }
});
registerSceneryTemplate('gd_cap', (b, p) => {
  const c = p.color || '#a0d0ff';
  b.cyl('#d8d0b8', 0.12, 0.18, 1.1, 7, [0, 0.55, 0]);
  b.sphere(c, 0.6, [0, 1.15, 0], [1, 0.45, 1], 1);
  for (let i = 0; i < 6; i++) b.sphere('#f8f4e0', 0.06, [Math.cos(i) * 0.38, 1.33, Math.sin(i) * 0.38]);
});
registerSceneryTemplate('gd_gate', (b, p) => {
  for (const x of [-0.5, 0.5]) b.box('#2e2a28', 0.25, 2.6, 0.5, [x, 1.3, 0], [0, 0, 0], 0.08);
  b.box('#2e2a28', 1.3, 0.35, 0.5, [0, 2.6, 0]);
  b.sphere(p.open ? '#ffb040' : '#6a3a1a', 0.16, [0, 2.6, 0.27]);
  if (!p.open) for (let i = 0; i < 4; i++) b.box('#4a4440', 0.08, 2.3, 0.08, [-0.33 + i * 0.22, 1.2, 0]);
});
registerSceneryTemplate('gd_valve', (b, p) => {
  b.cyl('#5a5650', 0.22, 0.26, 0.9, 8, [0, 0.45, 0]);
  b.cyl('#3a6a8a', 0.12, 0.12, 0.6, 6, [0, 0.6, 0.2], [Math.PI / 2, 0, 0]);
  b.cyl(p.spent ? '#5a3a2a' : '#4ab0e0', 0.25, 0.25, 0.05, 8, [0, 1.0, 0], [0, 0, 0], 0.05);
  b.box('#2a2a2e', 0.5, 0.06, 0.06, [0, 1.03, 0]);
});
registerSceneryTemplate('gd_seam', (b) => {
  b.dodeca('#5a5a62', 0.6, [0, 0.45, 0], [1.1, 0.8, 1]);
  for (let i = 0; i < 5; i++) b.box('#e8f4ff', 0.07, 0.45, 0.05, [Math.cos(i * 1.3) * 0.35, 0.5, Math.sin(i * 1.3) * 0.35], [0.3, i, 0.2], 0);
});
registerSceneryTemplate('gd_hollow_tree', (b) => {
  b.cyl('#3e3022', 0.75, 0.95, 2.2, 9, [0, 1.1, 0], [0, 0, 0], 0.08);
  b.box('#050404', 0.7, 1.1, 0.2, [0, 0.55, 0.82], [0, 0, 0], 0);
  b.sphere('#3a5a2a', 1.2, [0, 2.9, 0], [1.2, 0.8, 1.2], 0, 0.1);
  for (let i = 0; i < 5; i++) b.box('#4a3a28', 0.18, 0.18, 0.9, [Math.cos(i * 1.25) * 0.9, 0.12, Math.sin(i * 1.25) * 0.9], [0, i * 1.25, 0], 0.1);
  for (let i = 0; i < 3; i++) b.sphere('#c8c0a0', 0.12, [0.5 - i * 0.3, 1.6 + i * 0.1, 0.8], [1, 0.4, 1]);
});

// =================================================================================================
// Objects: transitions (gated ones get their handlers in midgame_quests.js), resources, shortcuts
// =================================================================================================
registerObject({ id: 'gd_sinkhole', name: 'Glimmerdeep sinkhole', examine: 'The ground has fallen into an old delve. Water from somewhere gurgles far below, and something down there glows.',
  options: ['Climb-down'], teleport: { x: GD.l1Arrive[0], y: GD.l1Arrive[1], message: 'You lower yourself on the knotted rope, down into the cold drip of the Glimmerdeep...' },
  size: [3, 2], model: { template: 'cave_entrance' }, mapIcon: { char: 'D', color: '#a08060' } });
portal('gd_rope', 'Knotted rope', 'Back up to the Whisperstones.', 'Climb-up', { template: 'rope' }, GD.sinkholeOut, { message: 'You haul yourself back up into the daylight.' });
// level 1 <-> level 2 (flooded until "Below the Silverrun")
registerObject({ id: 'gd_flood_stair', name: 'Drowned stairway', examine: 'Stone steps lead down into black water.', options: ['Climb-down', 'Inspect'], size: [2, 2], model: { template: 'dec_stairs_down', color: '#5a6a70' } });
portal('gd_l2_stair', 'Dripping stairway', 'Back up to the Drowned Galleries.', 'Climb-up', { template: 'ladder', color: '#5a5a5a' }, GD.floodStairOut, { message: 'You climb the slick steps back up to the galleries.' });
// level 2 <-> level 3 (sealed until "The Lantern Lock")
registerObject({ id: 'gd_hatch', name: 'Lanternwright hatch', examine: 'A round stone hatch set into the floor, ringed with five little lantern-cups. A sun-in-a-ring is carved on it.', options: ['Inspect', 'Climb-down'], size: [2, 2], model: { template: 'gd_hatch' } });
registerObject({ id: 'gd_hatch_open', name: 'Lanternwright hatch', examine: 'The hatch stands open. Warm air rises from the forge below.', options: ['Climb-down'], size: [2, 2], model: { template: 'gd_hatch', open: true } });
portal('gd_l3_ladder', 'Iron ladder', 'Up to the Sporewood.', 'Climb-up', { template: 'ladder', color: '#4a4a52' }, GD.hatchOut, { message: 'You climb the iron rungs back up into the Sporewood.' });
// Thornwood root-hollow shortcut (after "Rot at the Roots")
registerObject({ id: 'gd_root_hollow', name: 'Hollow ironbark', examine: 'An ancient ironbark, hollow as a chimney. Thick roots plunge down into the dark.', options: ['Climb-down', 'Inspect'], size: [2, 2], model: { template: 'gd_hollow_tree' }, mapIcon: { char: 'D', color: '#80a060' } });
registerObject({ id: 'gd_root_ladder', name: 'Root ladder', examine: 'Roots grown into rough rungs, leading up towards Thornwood.', options: ['Climb-up'], model: { template: 'ladder', color: '#4a3a22' } });
// level 3: the Heart-gate (after the cipher in "The Last Lanternwright")
registerObject({ id: 'gd_heart_gate', name: 'Heart-gate', examine: 'A portcullis of black iron. Lanternwright letters run along the lintel.', options: ['Open', 'Read-lintel'], model: { template: 'gd_gate' } });
// boss-room coolant valves (mechanic: midgame_monsters.js)
registerObject({ id: 'gd_valve', name: 'Coolant valve', examine: 'A wheel valve on a pipe of river water. It feeds the forge\'s quench-lines.', options: ['Turn'], model: { template: 'gd_valve' } });
registerObject({ id: 'gd_valve_spent', name: 'Coolant valve', examine: 'The pipe gurgles, empty for now. It will refill soon.', options: ['Turn'], model: { template: 'gd_valve', spent: true } });
// quest 1: sluice wheels
for (const [id, label] of [['gd_wheel_upper', 'upper'], ['gd_wheel_middle', 'middle'], ['gd_wheel_lower', 'lower']]) {
  registerObject({ id, name: `Sluice wheel (${label})`, examine: `The wheel that works the ${label} sluice. Its spindle is bare - the handle is missing.`, options: ['Turn', 'Inspect'], model: { template: 'gd_wheel' } });
}
// quest 2: the four caps of the mycel ring
const CAPS = { gd_cap_frost: ['frost-pale', '#e8f4ff'], gd_cap_moon: ['moon-blue', '#80a8ff'], gd_cap_sun: ['sun-amber', '#ffc040'], gd_cap_ember: ['ember-red', '#ff5030'] };
for (const [id, [desc, color]] of Object.entries(CAPS)) {
  registerObject({ id, name: 'Glowing cap', examine: `A giant mushroom whose cap glows ${desc}. It pulses slowly, like breathing.`, options: ['Dose', 'Inspect'], model: { template: 'gd_cap', color } });
  registerObject({ id: `${id}_dim`, name: 'Dimmed cap', examine: `A giant mushroom. Its ${desc} glow has been quenched.`, options: ['Inspect'], model: { template: 'gd_cap', color: '#5a564e' } });
}
// quest 3: glimmer seam
registerObject({ id: 'gd_glimmer_seam', name: 'Glimmer seam', examine: 'Veins of pale ore that glow faintly, like moonlight trapped in stone.', options: ['Mine'], model: { template: 'gd_seam' }, minimap: 'rock' });
// quest 4: forge ledger
registerObject({ id: 'gd_ledger_desk', name: 'Forge ledger', examine: 'A heavy ledger chained to a desk. The last pages are written in a hurried hand.', options: ['Read'], model: { template: 'dec_desk' } });
// fishing pool (Drowned Galleries): harpoon / bait
registerObject({ id: 'gd_fishing_pool', name: 'Fishing spot', examine: 'Pale fish circle in the black water of the flooded hall.', options: ['Harpoon', 'Bait'], blocks: false, model: { template: 'fishing_spot' } });
registerData('fishing', 'gd_fishing_pool', {
  Harpoon: { tool: 'harpoon', verb: 'harpoon', startMsg: 'You start harpooning in the black water.', catches: [
    { id: 'raw_bluescale', level: 35, xp: 80, chance: [10, 70] },
    { id: 'raw_sabrefish', level: 50, xp: 100, chance: [5, 52] }] },
  Bait: { tool: 'fishing_rod', bait: 'fishing_bait', verb: 'bait', startMsg: 'You lower your line into the flooded hall...', catches: [
    { id: 'raw_mudgill', level: 10, xp: 30, chance: [24, 128] },
    { id: 'raw_bog_eel', level: 38, xp: 80, chance: [12, 88] }] },
});

// ---- agility shortcuts (systems/agility.js runs them) ------------------------------------------------------
function shortcut(o) {
  registerObject({ id: o.id, name: o.name, examine: o.examine, options: [o.option], size: [o.w || 1, o.h || 1], blocks: o.blocks ?? true, interactRange: 1, model: o.model });
  registerData('agility', o.id, { name: o.name, option: o.option, level: o.level, xp: o.xp, anim: o.anim ?? null, path: o.path, bidir: true, fail: o.fail || null, course: null, index: null, shortcut: true });
  obj(o.id, o.x, o.y, o.rot || 0);
}
const seg = (x0, y0, x1, y1, h = 0) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), out = [];
  for (let i = 0; i <= n; i++) out.push([Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), i === 0 || i === n ? 0 : h]);
  return out;
};
// one obstacle object at each end of the slope (both run the same bidirectional path)
for (const [id, y, rot] of [['gd_rubble_slope', 265, 0], ['gd_rubble_slope_low', 269, 2]]) {
  shortcut({ id, name: 'Rubble slope', examine: 'A tumble of fallen masonry between the gallery and the sluice chamber. Climbable, if you are nimble.', option: 'Climb',
    x: 36, y, rot, model: { template: 'agi_handholds' }, anim: 'climb', level: 48, xp: 16, path: seg(36, 264, 36, 270, 0.8),
    fail: { stop: 60, chance: 0.12, damage: [2, 5], at: 2, to: null, message: 'The rubble shifts under you and you slide back down!' } });
}
shortcut({ id: 'gd_root_bridge', name: 'Root bridge', examine: 'A single giant root arches over the spore-choked stream.', option: 'Walk-across',
  x: 113, y: 276, w: 6, h: 1, blocks: false, model: { template: 'agi_log', color: '#5a4a30', mud: false }, anim: 'balance', level: 58, xp: 22, path: seg(112, 276, 119, 276, 0.4),
  fail: { stop: 70, chance: 0.12, damage: [3, 7], at: 3, to: null, message: 'The slimy root twists and you tumble into the stream!' } });
shortcut({ id: 'gd_slag_ledge', name: 'Slag ledge', examine: 'A narrow lip of cooled slag running along the forge wall, above the foundry floor.', option: 'Shimmy-across',
  x: 161, y: 259, w: 23, h: 1, blocks: true, model: { template: 'agi_beam', color: '#3a3430', y: 0.4 }, anim: 'balance', level: 66, xp: 30, path: seg(160, 259, 184, 259, 0.5),
  fail: { stop: 78, chance: 0.1, damage: [4, 9], at: 6, to: null, message: 'Hot slag crumbles beneath your feet and you drop back to the hall!' } });

// =================================================================================================
// Terrain
// =================================================================================================
paint({ shape: 'rect', x0: 0, y0: 256, x1: 287, y1: 287, terrain: 'void', raise: 3, falloff: 2 });

// ---- Level 1: the Drowned Galleries ----------------------------------------------------------------------
circ(8, 262, 4.5, 'wet_rock');                                               // entry grotto + delvers' camp
rect(12, 259, 40, 264, 'wet_rock');                                          // pillared gallery
tunnel([[8, 265], [9, 269]], 3, 'wet_rock');
rect(4, 268, 30, 284, 'wet_rock');                                           // flooded hall
circ(17, 277, 5.5, 'water', { jitter: 0.4 });
circ(26, 271, 1.6, 'water', { jitter: 0.3 }); circ(7, 283, 1.4, 'water', { jitter: 0.3 });
tunnel([[30, 276], [33, 276]], 2, 'wet_rock');
rect(33, 270, 46, 283, 'stone_floor');                                       // sluice chamber
rect(35, 283, 44, 283, 'water');                                             // drain channel
tunnel([[40, 262], [44, 262]], 3, 'wet_rock');
rect(44, 258, 64, 268, 'wet_rock');                                          // keeners' cistern
circ(52, 265, 1.6, 'water', { jitter: 0.3 }); circ(60, 260, 1.4, 'water', { jitter: 0.3 });
tunnel([[54, 268], [50, 272], [46, 275]], 2.5, 'wet_rock');
rect(36, 265, 36, 269, 'wet_rock', { blocked: true, raise: 0.6 });           // rubble slope (agility)

// ---- Level 2: the Sporewood -------------------------------------------------------------------------------
circ(80, 278, 6, 'mud');                                                    // spore grove (arrival)
rect(74, 258, 90, 268, 'gravel');                                            // the Old Delve (mining)
tunnel([[80, 272], [81, 268]], 3, 'mud');
rect(88, 270, 112, 284, 'mud');                                             // Gloamcap Hollow
for (const [cx, cy, r] of [[95, 274, 2.5], [104, 281, 2], [109, 272, 1.8], [84, 276, 1.6], [79, 281, 1.8], [100, 271, 1.5]]) circ(cx, cy, r, 'moss', { only: ['mud'] });
tunnel([[85, 278], [89, 277]], 3, 'mud');
rect(102, 258, 124, 264, 'cave_floor');                                      // the Weaver's gallery
tunnel([[104, 270], [106, 264]], 3, 'cave_floor');
tunnel([[124, 264], [126, 268]], 3, 'mud');
circ(127, 276, 8.5, 'mud', { jitter: 0.5 });                                 // the Heartrot (Vorlagh)
circ(127, 276, 3, 'moss', { jitter: 0.5 });
rect(113, 273, 118, 279, 'water');                                           // spore-choked stream (root bridge)

// ---- Level 3: the Emberworks ------------------------------------------------------------------------------
rect(147, 258, 160, 266, 'dark_stone');                                      // entry hall
rect(160, 261, 182, 268, 'dark_stone');                                      // foundry
rect(163, 265, 180, 265, 'lava');                                            // quench channel ...
rect(168, 265, 168, 265, 'dark_stone'); rect(175, 265, 175, 265, 'dark_stone');   // ... with two crossings
rect(184, 258, 196, 266, 'stone_floor');                                     // the Lanternwright archive
tunnel([[182, 263], [184, 263]], 2, 'stone_floor');
rect(150, 270, 186, 285, 'scorched');                                        // slag pits
tunnel([[153, 266], [153, 270]], 3, 'dark_stone');
tunnel([[176, 268], [176, 270]], 2, 'dark_stone');
circ(157, 281, 1.5, 'lava', { jitter: 0.3 }); circ(183, 283, 1.2, 'lava', { jitter: 0.3 }); circ(162, 274, 1.1, 'lava', { jitter: 0.2 });
circ(170, 279, 4.5, 'lava', { jitter: 0 }); circ(170, 279, 2.3, 'dark_stone', { jitter: 0 });   // sentinel island (safe-spot)
rect(187, 277, 190, 277, 'dark_stone');                                      // Heart-gate corridor
circ(198, 277, 7, 'obsidian', { jitter: 0.4 });                              // the Heart Forge (boss)
for (const [cx, cy] of [[192, 274], [204, 280], [198, 271], [198, 283]]) circ(cx, cy, 0.9, 'lava', { jitter: 0 });
rect(161, 259, 183, 259, 'basalt', { blocked: true, raise: 0.5 });           // slag ledge (agility)

// ---- surface: the sinkhole and the Thornwood root hollow ------------------------------------------------
paint({ shape: 'rect', x0: 81, y0: 86, x1: 89, y1: 92, noScatter: true });
paint({ shape: 'circle', cx: 85, cy: 89, r: 2.2, terrain: 'dirt', jitter: 0.8, noScatter: true });
paint({ shape: 'rect', x0: 61, y0: 124, x1: 68, y1: 131, noScatter: true });

// =================================================================================================
// Areas
// =================================================================================================
area({ id: 'glimmerdeep', name: 'The Glimmerdeep', x0: 0, y0: 256, x1: 207, y1: 287, priority: 9, dungeon: true });
area({ id: 'gd_galleries', name: 'Glimmerdeep: Drowned Galleries', x0: 0, y0: 256, x1: 69, y1: 287, priority: 10, dungeon: true });
area({ id: 'gd_sporewood', name: 'Glimmerdeep: the Sporewood', x0: 70, y0: 256, x1: 141, y1: 287, priority: 10, dungeon: true });
area({ id: 'gd_heartrot', name: 'The Heartrot', x0: 118, y0: 266, x1: 137, y1: 286, priority: 11, dungeon: true, multi: true });
area({ id: 'gd_emberworks', name: 'Glimmerdeep: the Emberworks', x0: 142, y0: 256, x1: 207, y1: 287, priority: 10, dungeon: true });
area({ id: 'gd_heartforge', name: 'The Heart Forge', x0: 190, y0: 268, x1: 207, y1: 286, priority: 11, dungeon: true, multi: true });

// =================================================================================================
// Spawns
// =================================================================================================
// ---- surface ------------------------------------------------------------------------------------------------
obj('gd_sinkhole', GD.sinkhole[0], GD.sinkhole[1]);
lore(88, 90, 'Warning post', '"GLIMMERDEEP - Lanternwright workings. Closed by order of the Highmarch Council, year 312. Flooded. Do not enter." Underneath, freshly carved: "Not flooded any more. Something is drinking the Silverrun. - H.C."', { template: 'dec_signpost', arms: 1 });
obj('gd_root_hollow', GD.rootHollow[0], GD.rootHollow[1]);

// ---- Level 1: the Drowned Galleries ------------------------------------------------------------------------
obj('gd_rope', GD.l1Rope[0], GD.l1Rope[1]);
obj('cooking_range', 11, 260); obj('tent_ragged', 5, 265, 1); obj('crate_stack', 4, 261); obj('campfire_lit', 7, 265);
lore(11, 264, "Delver's slate", '"Notes for the next fool down here. 1) The keeners in the cistern WAIL - plug your ears (hushwax). 2) The forge-sentinels on the lava island can\'t cross the lava. A bow from the bank and they just stand there and take it. 3) Ropes and ranges are free. Bring your own food anyway. - Hesk C."');
for (const x of [16, 22, 28, 34]) { obj('pillar', x, 259); obj(x === 28 ? 'broken_pillar' : 'pillar', x, 264); }
objs('stalagmite_dark', [[13, 262], [39, 260], [25, 259]]);
objs('lily_pads_plain', [[15, 276], [19, 279], [17, 274]]); objs('reeds', [[11, 274], [23, 280]]);
obj('waterfall_tall', 5, 270); objs('crystal_blue', [[4, 277], [29, 283], [30, 269]]); objs('mushrooms_glow', [[6, 279], [27, 282]]);
for (const [x, y] of [[11, 276], [21, 277], [16, 272], [16, 281]]) obj('gd_fishing_pool', x, y);
// sluice chamber (quest 1)
for (const [id, [x, y]] of Object.entries(GD.wheels)) obj(id, x, y, 2);
objs('pipe_valve', [[34, 271], [46, 271]]); obj('sewer_grate', 39, 283); objs('barrel', [[34, 282], [35, 282]]);
obj('gd_flood_stair', GD.floodStair[0], GD.floodStair[1]);
lore(35, 274, "Sluice-keeper's slate", '"For the wheel-turner on night watch: when the river runs high, DRAIN THE DEEP BEFORE THE HIGH. Lowest sluice first, then the middle, and the upper last - or the deep water has nowhere to go and comes back up the stair at you. (Ask Garrow what happened last spring.)"');
// keeners' cistern
objs('stalagmite', [[47, 259], [63, 266], [57, 267]]); objs('cobweb', [[44, 258], [64, 258]]); objs('bones_scattered', [[50, 261], [59, 264]]);
lore(62, 262, 'Drowned plaque', '"THE LANTERNWRIGHTS OF HIGHMARCH - WE CARRY THE LIGHT DOWN SO THE TOWNS ABOVE MAY CARRY IT ON." The plaque is half-eaten by green rust.');
item('fishing_bait', 9, 259, 10, 200);

// ---- Level 2: the Sporewood ---------------------------------------------------------------------------------
obj('gd_l2_stair', GD.l2Stair[0], GD.l2Stair[1]);
obj('gd_root_ladder', GD.rootLadder[0], GD.rootLadder[1]);
objs('giant_mushroom_glow', [[78, 274], [83, 283], [92, 272], [99, 283], [107, 276], [96, 279], [110, 282]]);
objs('giant_mushroom', [[75, 277], [90, 281], [101, 271], [111, 270]]);
objs('mushrooms_glow', [[81, 275], [88, 284], [94, 276], [103, 278], [108, 284], [85, 272]]); objs('mushrooms_purple', [[93, 282], [105, 274]]);
objs('fallen_log_mossy', [[98, 276]]); objs('wisps_blue', [[100, 279], [80, 280]]);
// the Old Delve - mid-tier mining
for (const [id, x, y] of [['rock_coal', 77, 262], ['rock_coal', 79, 266], ['rock_coal', 84, 260], ['rock_coal', 88, 265], ['rock_gold', 82, 264], ['rock_gold', 87, 259],
  ['rock_duskite', 80, 260], ['rock_duskite', 85, 267], ['rock_duskite', 89, 262], ['rock_iron', 75, 265], ['rock_iron', 83, 258], ['rock_silver', 78, 268]]) obj(id, x, y);
obj('gd_glimmer_seam', GD.glimmerSeam[0], GD.glimmerSeam[1]);
objs('mine_support', [[74, 261], [90, 261], [81, 262]]); obj('minecart_ore', 86, 263); obj('rails', 76, 263, 0, { w: 6, h: 1 });
lore(74, 258, 'Glimmer survey', '"Seam 9: coal, gold and a little duskite - good for the forge. The GLIMMER vein in the north-west corner is guild property. Glimmerstone must be smelted hot and worked by a Lanternwright hand only." Somebody has scratched out "only".', { template: 'sign' });
// the Weaver's gallery + the hatch
objs('cobweb', [[103, 258], [110, 258], [118, 263], [124, 258], [106, 263], [115, 259]]); objs('bones_pile', [[112, 261], [120, 263]]);
obj('gd_hatch', GD.hatch[0], GD.hatch[1]);
// the Heartrot (quest 2 caps, Vorlagh)
for (const [id, [x, y]] of Object.entries(GD.caps)) obj(id, x, y);
objs('mushrooms_purple', [[124, 271], [131, 283], [135, 275]]); objs('bones_scattered', [[127, 280], [123, 277]]);
lore(124, 267, "Spore-keeper's journal", '"The ring around the heart-root wakes the way the year does - from the coldest to the warmest. Frost-pale, then moon-blue, then sun-amber, then ember-red. Dose them out of turn and the whole ring spits at you." The last page just says "it is MOVING".', { template: 'dec_desk' });

// ---- Level 3: the Emberworks ---------------------------------------------------------------------------------
obj('gd_l3_ladder', GD.l3Ladder[0], GD.l3Ladder[1]);
objs('statue_dwarf', [[147, 262], [160, 258]]); objs('brazier', [[152, 258], [156, 266]]); objs('banner_black', [[149, 258], [158, 258]]);
// the foundry (working furnace + anvils)
obj('furnace', 164, 262); obj('anvil', 167, 262); obj('anvil', 170, 262); obj('anvil_great', 178, 262);
objs('embers', [[166, 265], [172, 265], [179, 265]]); objs('barrel_stack', [[181, 267]]); objs('sacks_coal', [[161, 267], [162, 267]]);
lore(173, 268, 'Engine schematic', '"THE ASHWRIGHT ENGINE - a hearth that feeds itself. NOTE: the bellows-heart overheats past half load. Quench-lines from the Silverrun run to four valves in the Heart Forge; open one and the heat-shield drops while the steam vents." In the margin: "it does not WANT to be quenched".');
// the archive
objs('bookshelf', [[185, 258], [186, 258], [188, 258], [189, 258], [191, 258], [192, 258]]); obj('gd_ledger_desk', GD.ledger[0], GD.ledger[1]);
objs('candelabra', [[184, 265], [196, 265]]); obj('rug_red', 188, 262, 0, { w: 3, h: 3 }); objs('statue_headless', [[196, 259]]);
lore(185, 266, 'Lanternwright charter', '"Granted by the Crown of Highmarch to the Worshipful Company of Lanternwrights: the right to dig beneath the Whisperstones, to keep the glimmer-light, and to light every lamp from the keep to the ford." Forty-one names are signed below. The last is "Ommra Vey, Master".');
// slag pits + sentinel island
objs('lava_rock', [[152, 272], [165, 283], [178, 274], [184, 279]]); objs('obsidian_spike', [[159, 276], [185, 272], [151, 284]]); objs('embers', [[160, 280], [180, 278]]);
objs('crystal_red', [[150, 276], [186, 285]]); objs('bones_pile', [[166, 277], [174, 284]]);
// the Heart-gate and the Heart Forge
obj('gd_heart_gate', GD.gate[0], GD.gate[1], 1);
for (const [x, y] of GD.valves) obj('gd_valve', x, y);
objs('anvil_great', [[198, 271]]); objs('obsidian_spike', [[192, 281], [204, 274]]); objs('embers', [[195, 279], [201, 274]]);
item('coins', 205, 277, 120, 300);

// ---- monsters --------------------------------------------------------------------------------------------------
// level 1 (combat 40-61)
npcScatter(['drowned_delver', 'gillback_raider'], [13, 259, 40, 264], 4, 9811, 3, { terrain: ['wet_rock'] });
npcScatter(['drowned_delver', 'gillback_raider', 'gillback_raider'], [4, 268, 30, 284], 6, 9812, 3, { terrain: ['wet_rock'] });
npcScatter(['silt_slug'], [44, 258, 64, 268], 4, 9813, 3, { terrain: ['wet_rock'] });
npcScatter(['drowned_keener'], [46, 258, 64, 268], 3, 9814, 3, { terrain: ['wet_rock'] });
// level 2 (combat 50-62) + Vorlagh
npcScatter(['sporecap_crawler'], [87, 270, 112, 284], 6, 9821, 3, { terrain: ['moss', 'mud'] });
npcScatter(['mycelid_shambler'], [92, 270, 112, 284], 5, 9822, 3, { terrain: ['moss', 'mud'] });
npcScatter(['gloomcap_weaver'], [102, 258, 114, 264], 4, 9823, 2, { terrain: ['cave_floor'] });
npc('vorlagh_sporebound', 126, 275, 3);
// level 3 (combat 63-75) + the Ashwright Engine
npcScatter(['slag_hound', 'cinderhorn_lizard'], [150, 270, 179, 285], 7, 9831, 3, { terrain: ['scorched'] });
npc('forge_sentinel', 169, 279, 1); npc('forge_sentinel', 171, 279, 1);
npcScatter(['forge_sentinel'], [160, 261, 182, 264], 2, 9832, 2, { terrain: ['dark_stone'] });
npcScatter(['lanternwright_shade'], [184, 258, 196, 266], 3, 9833, 3, { terrain: ['stone_floor'] });
npcScatter(['lanternwright_shade'], [160, 266, 182, 268], 1, 9834, 3, { terrain: ['dark_stone'] });
npc('ashwright_engine', GD.engine[0], GD.engine[1], 2);

// ---- decoration scatter ------------------------------------------------------------------------------------------
registerSpawn({ type: 'scatter', ids: [{ id: 'pebbles_dark', weight: 3 }, { id: 'stalagmite', weight: 1 }], rect: [2, 257, 66, 285], density: 0.03, seed: 9841, spacing: 1, terrain: ['wet_rock'] });
registerSpawn({ type: 'scatter', ids: [{ id: 'mushrooms_glow', weight: 2 }, { id: 'mushrooms_brown', weight: 2 }, { id: 'pebbles', weight: 1 }], rect: [72, 257, 136, 285], density: 0.035, seed: 9842, spacing: 1, terrain: ['moss', 'mud', 'gravel', 'cave_floor'] });
registerSpawn({ type: 'scatter', ids: [{ id: 'pebbles_dark', weight: 3 }, { id: 'lava_rock', weight: 1 }], rect: [146, 257, 206, 285], density: 0.025, seed: 9843, spacing: 1, terrain: ['scorched', 'dark_stone'] });
