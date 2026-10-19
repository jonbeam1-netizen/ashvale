// Agility: courses, shortcuts, Wayfarer marks + outfit. OWNER: agent F.
//
// registerData('agility', objectId, {
//   level, xp, option, anim ('balance'|'climb'|null), name,
//   path: [[x, y, elevation], ...]   // absolute tiles walked in order (repeat a tile to pause/climb);
//                                    // path[0] is the approach tile next to the obstacle
//   bidir: true                      // shortcuts: may be used from either end
//   fail: { stop, chance, damage: [min,max], at: pathIndex, to: [x,y], message }
//   course, index                    // course membership (lap tracking)
// })
// registerData('agility_course', id, { name, level, lapXp, markChance, obstacles: [objectIds], finish: [x,y] })
// registerData('agility_platform', id, { x, y, w, h, top })  // raised standing areas (roofs, decks, sea stacks)
// systems/agility.js runs everything.

import { registerObject, registerData, registerSpawn, registerPaint, registerItem, registerNpc, registerShop, registerDialogue } from '../core/registry.js';
import './agility_models.js';

// ---- path helpers ------------------------------------------------------------------------------
/** Inclusive straight line of tiles from (x0,y0) to (x1,y1), elevation interpolated h0 -> h1. */
function seg(x0, y0, x1, y1, h0 = 0, h1 = h0) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    out.push([Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), +(h0 + (h1 - h0) * t).toFixed(2)]);
  }
  return out;
}
const path = (...parts) => parts.flat().filter((p, i, a) => Array.isArray(p));

const COURSES = {};

/** Register + place one obstacle object and its agility data. */
function obstacle(o) {
  registerObject({
    id: o.id, name: o.name, examine: o.examine, options: [o.option], size: [o.w || 1, o.h || 1],
    blocks: o.blocks ?? true, interactRange: 1, model: o.model,
  });
  registerData('agility', o.id, {
    name: o.name, option: o.option, level: o.level ?? 1, xp: o.xp, anim: o.anim ?? null, path: o.path,
    bidir: !!o.bidir, fail: o.fail || null, course: o.course || null, index: o.index ?? null, start: o.start,
    message: o.message, done: o.done, shortcut: !!o.shortcut,
  });
  registerSpawn({ type: 'object', id: o.id, x: o.x, y: o.y });
  if (o.course) (COURSES[o.course] ||= []).push(o.id);
}

/** Raised standing area. If `option` is given it is also the course's climb-up obstacle. */
function platform(o) {
  registerObject({
    id: o.id, name: o.name, examine: o.examine, size: [o.w, o.h], blocks: true, options: o.option ? [o.option] : [],
    model: { template: 'agi_platform', variant: o.variant, top: o.top, wall: o.wall, roof: o.roof, color: o.color },
  });
  registerData('agility_platform', o.id, { x: o.x, y: o.y, w: o.w, h: o.h, top: o.top });
  registerSpawn({ type: 'object', id: o.id, x: o.x, y: o.y });
}

const clear = (x0, y0, x1, y1) => registerPaint({ shape: 'rect', x0, y0, x1, y1, noScatter: true });

// =================================================================================================
// 1. Brackenford Training Yard (level 1) - north-east of Brackenford
// =================================================================================================
clear(99, 101, 118, 122);
const BY = 'brackenford_yard';
obstacle({
  id: 'yard_log', name: 'Log balance', examine: 'A greasy log laid over a mud pit.', option: 'Walk-across', course: BY, index: 0,
  x: 103, y: 106, w: 6, h: 1, model: { template: 'agi_log', mud: true }, anim: 'balance', level: 1, xp: 6,
  path: seg(102, 106, 110, 106),
  fail: { stop: 12, chance: 0.12, damage: [1, 2], at: 4, to: [106, 107], message: 'You slip off the log and land in the mud!' },
});
obstacle({
  id: 'yard_net', name: 'Obstacle net', examine: 'A rope net strung on a timber frame.', option: 'Climb-over', course: BY, index: 1,
  x: 111, y: 105, w: 1, h: 3, model: { template: 'agi_net' }, anim: 'climb', level: 1, xp: 7,
  path: [[110, 106, 0], [111, 106, 1.0], [111, 106, 1.9], [112, 106, 1.0], [113, 106, 0]],
});
obstacle({
  id: 'yard_beam', name: 'Balancing beam', examine: 'A narrow beam on posts.', option: 'Walk-across', course: BY, index: 2,
  x: 114, y: 108, w: 1, h: 8, model: { template: 'agi_beam', y: 0.6 }, anim: 'balance', level: 1, xp: 7, blocks: true,
  path: path([[114, 107, 0]], seg(114, 108, 114, 115, 0.65), [[114, 116, 0]]),
  fail: { stop: 15, chance: 0.12, damage: [1, 2], at: 4, to: [115, 112], message: 'You wobble and tumble off the beam.' },
});
obstacle({
  id: 'yard_wall', name: 'Low wall', examine: 'A low timber wall.', option: 'Climb-over', course: BY, index: 3,
  x: 111, y: 117, w: 1, h: 3, model: { template: 'agi_wall', height: 1.0 }, anim: 'climb', level: 1, xp: 6,
  path: [[112, 118, 0], [111, 118, 1.0], [110, 118, 0]],
});
obstacle({
  id: 'yard_swing', name: 'Rope swing', examine: 'A rope dangling over a muddy pit.', option: 'Swing-on', course: BY, index: 4,
  x: 105, y: 118, w: 3, h: 1, model: { template: 'agi_swing' }, level: 1, xp: 9,
  path: [[108, 118, 0], [107, 118, 0.6], [106, 118, 0.9], [105, 118, 0.6], [104, 118, 0]],
  fail: { stop: 18, chance: 0.15, damage: [1, 3], at: 2, to: [106, 119], message: 'You lose your grip and drop into the pit!' },
});
obstacle({
  id: 'yard_pipe', name: 'Drain pipe', examine: 'Wide enough to crawl through. Just.', option: 'Squeeze-through', course: BY, index: 5,
  x: 102, y: 110, w: 1, h: 6, model: { template: 'agi_pipe' }, level: 1, xp: 8,
  path: path([[102, 116, 0]], seg(102, 115, 102, 110, 0), [[102, 109, 0]]),
});
registerData('agility_course', BY, { name: 'Brackenford Training Yard', level: 1, lapXp: 30, markChance: 0.3, obstacles: COURSES[BY], finish: [102, 109] });

// =================================================================================================
// 2. Thornwood Canopy (level 20) - treetop decks in south Thornwood
// =================================================================================================
clear(55, 145, 73, 158);
const TC = 'thornwood_canopy';
platform({ id: 'canopy_deck_1', name: 'Treetop deck', examine: 'A wooden deck built into an old oak.', x: 57, y: 149, w: 3, h: 3, top: 3, variant: 'tree', option: 'Climb' });
platform({ id: 'canopy_deck_2', name: 'Treetop deck', examine: 'A wooden deck high in the canopy.', x: 64, y: 149, w: 3, h: 3, top: 3, variant: 'tree' });
platform({ id: 'canopy_deck_3', name: 'Treetop deck', examine: 'A wooden deck high in the canopy.', x: 68, y: 149, w: 3, h: 3, top: 3, variant: 'tree' });
platform({ id: 'canopy_deck_4', name: 'Treetop deck', examine: 'A wooden deck high in the canopy.', x: 68, y: 155, w: 3, h: 3, top: 3, variant: 'tree' });
registerData('agility', 'canopy_deck_1', {
  name: 'Treetop deck', option: 'Climb', level: 20, xp: 12, anim: 'climb', course: TC, index: 0,
  path: [[58, 152, 0], [58, 152, 0.9], [58, 152, 1.8], [58, 152, 2.6], [58, 151, 3], [58, 150, 3]],
});
(COURSES[TC] ||= []).push('canopy_deck_1');
obstacle({
  id: 'canopy_bridge', name: 'Rope bridge', examine: 'Planks lashed between two trees.', option: 'Walk-across', course: TC, index: 1,
  x: 60, y: 150, w: 4, h: 1, blocks: false, model: { template: 'agi_rope', variant: 'bridge', y: 3 }, anim: 'balance', level: 20, xp: 16,
  path: path([[59, 150, 3]], seg(60, 150, 63, 150, 2.8), [[64, 150, 3], [65, 150, 3]]),
  fail: { stop: 40, chance: 0.18, damage: [2, 4], at: 3, to: [62, 151], message: 'A plank snaps and you fall to the forest floor!' },
});
obstacle({
  id: 'canopy_gap', name: 'Branch gap', examine: 'A short leap between decks.', option: 'Jump', course: TC, index: 2,
  x: 67, y: 150, w: 1, h: 1, blocks: false, model: { template: 'agi_gap', y: 3, color: '#5a3d22' }, level: 20, xp: 14,
  path: [[66, 150, 3], [67, 150, 3.5], [68, 150, 3], [69, 150, 3]],
  fail: { stop: 42, chance: 0.15, damage: [2, 5], at: 1, to: [67, 151], message: 'You misjudge the jump and crash through the leaves!' },
});
obstacle({
  id: 'canopy_vine', name: 'Hanging vine', examine: 'A thick vine hanging from a high bough.', option: 'Swing-on', course: TC, index: 3,
  x: 69, y: 153, w: 1, h: 1, blocks: false, model: { template: 'agi_vine', y: 3 }, level: 20, xp: 18,
  path: [[69, 151, 3], [69, 152, 2.6], [69, 153, 2.2], [69, 154, 2.6], [69, 155, 3], [69, 156, 3]],
  fail: { stop: 45, chance: 0.18, damage: [2, 5], at: 2, to: [70, 153], message: 'The vine slips through your fingers!' },
});
obstacle({
  id: 'canopy_slide', name: 'Vine slide', examine: 'A taut vine sloping down to the forest floor.', option: 'Slide-down', course: TC, index: 4,
  x: 61, y: 156, w: 6, h: 1, blocks: false, model: { template: 'agi_zipline', y: 3 }, level: 20, xp: 15,
  path: path([[68, 156, 3]], seg(67, 156, 61, 156, 2.7, 0.3), [[60, 156, 0]]),
});
registerData('agility_course', TC, { name: 'Thornwood Canopy', level: 20, lapXp: 110, markChance: 0.35, obstacles: COURSES[TC], finish: [60, 156] });

// =================================================================================================
// 3. Highmarch Rooftops (level 35) - flat roofs in the north-west quarter of Highmarch
// =================================================================================================
clear(141, 53, 154, 68);
const HR = 'highmarch_rooftops';
platform({ id: 'roof_tannery', name: 'Tannery roof', examine: 'A flat-roofed workshop.', x: 142, y: 62, w: 4, h: 5, top: 3.2, roof: '#6a5a4a', option: 'Climb-up' });
platform({ id: 'roof_chandler', name: "Chandler's roof", examine: 'A flat roof of tarred boards.', x: 142, y: 54, w: 4, h: 4, top: 3.2, roof: '#5a4a3e', wall: '#cfc2a4' });
platform({ id: 'roof_granary', name: 'Granary roof', examine: 'The roof of the old town granary.', x: 149, y: 54, w: 5, h: 4, top: 3.2, roof: '#7a5a3a', wall: '#c8b898' });
platform({ id: 'roof_cooper', name: "Cooper's roof", examine: 'A roof stacked with spare barrel hoops.', x: 149, y: 62, w: 5, h: 5, top: 3.2, roof: '#6a4a3a' });
registerData('agility', 'roof_tannery', {
  name: 'Tannery roof', option: 'Climb-up', level: 35, xp: 18, anim: 'climb', course: HR, index: 0,
  path: [[143, 67, 0], [143, 67, 0.9], [143, 67, 1.8], [143, 67, 2.7], [143, 66, 3.2], [143, 65, 3.2]],
});
(COURSES[HR] ||= []).push('roof_tannery');
obstacle({
  id: 'roof_tightrope', name: 'Tightrope', examine: 'A rope pulled tight between two roofs.', option: 'Walk-on', course: HR, index: 1,
  x: 143, y: 58, w: 1, h: 4, blocks: false, model: { template: 'agi_rope', y: 3.2 }, anim: 'balance', level: 35, xp: 24,
  path: path([[143, 62, 3.2]], seg(143, 61, 143, 58, 3.1), [[143, 57, 3.2], [143, 56, 3.2]]),
  fail: { stop: 60, chance: 0.2, damage: [3, 6], at: 2, to: [144, 60], message: 'You lose your balance and plummet to the street!' },
});
obstacle({
  id: 'roof_gap', name: 'Roof gap', examine: 'A gap between two buildings.', option: 'Jump', course: HR, index: 2,
  x: 146, y: 55, w: 3, h: 1, blocks: false, model: { template: 'agi_gap', y: 3.2 }, level: 35, xp: 22,
  path: [[145, 55, 3.2], [146, 55, 3.5], [147, 55, 3.7], [148, 55, 3.5], [149, 55, 3.2], [150, 55, 3.2]],
  fail: { stop: 62, chance: 0.18, damage: [3, 7], at: 2, to: [147, 56], message: 'You come up short and fall into the alley below!' },
});
obstacle({
  id: 'roof_plank', name: 'Narrow plank', examine: 'A scaffold plank bridging the roofs.', option: 'Walk-across', course: HR, index: 3,
  x: 151, y: 58, w: 1, h: 4, blocks: false, model: { template: 'agi_beam', y: 3.05, color: '#9a7a4a' }, anim: 'balance', level: 35, xp: 22,
  path: path([[151, 57, 3.2]], seg(151, 58, 151, 61, 3.05), [[151, 62, 3.2], [151, 63, 3.2]]),
  fail: { stop: 64, chance: 0.18, damage: [3, 6], at: 3, to: [152, 60], message: 'The plank bucks and throws you off!' },
});
obstacle({
  id: 'roof_line', name: 'Washing line', examine: 'Laundry flaps on a sturdy line between roofs.', option: 'Shimmy-across', course: HR, index: 4,
  x: 146, y: 64, w: 3, h: 1, blocks: false, model: { template: 'agi_rope', variant: 'line', y: 2.0 }, anim: 'climb', level: 35, xp: 26,
  path: [[149, 64, 3.2], [148, 64, 2.6], [147, 64, 2.5], [146, 64, 2.6], [145, 64, 3.2], [144, 64, 3.2]],
  fail: { stop: 66, chance: 0.2, damage: [3, 7], at: 2, to: [147, 65], message: 'A peg pops loose and you tumble down!' },
});
obstacle({
  id: 'roof_barrel', name: 'Rain barrel', examine: 'A sturdy barrel to break your fall.', option: 'Jump-down', course: HR, index: 5,
  x: 141, y: 65, w: 1, h: 1, model: { template: 'barrel' }, level: 35, xp: 12,
  path: [[142, 64, 3.2], [141, 64, 1.4], [141, 64, 0]],
});
registerData('agility_course', HR, { name: 'Highmarch Rooftops', level: 35, lapXp: 220, markChance: 0.4, obstacles: COURSES[HR], finish: [141, 64] });

// =================================================================================================
// 4. Saltmarsh Cliffs (level 50) - sea stacks along the coast
// =================================================================================================
clear(128, 176, 158, 183);
const SC = 'saltmarsh_cliffs';
platform({ id: 'stack_1', name: 'Sea stack', examine: 'A pillar of wave-worn rock.', x: 130, y: 180, w: 3, h: 3, top: 2.6, variant: 'rock', option: 'Climb' });
platform({ id: 'stack_2', name: 'Sea stack', examine: 'A pillar of wave-worn rock.', x: 138, y: 180, w: 3, h: 3, top: 2.6, variant: 'rock', color: '#726a60' });
platform({ id: 'stack_3', name: 'Sea stack', examine: 'A pillar of wave-worn rock.', x: 144, y: 180, w: 3, h: 3, top: 2.6, variant: 'rock', color: '#686058' });
platform({ id: 'stack_4', name: 'Sea stack', examine: 'A pillar of wave-worn rock.', x: 152, y: 180, w: 3, h: 3, top: 2.6, variant: 'rock' });
registerData('agility', 'stack_1', {
  name: 'Sea stack', option: 'Climb', level: 50, xp: 25, anim: 'climb', course: SC, index: 0,
  path: [[131, 179, 0], [131, 179, 0.9], [131, 179, 1.8], [131, 180, 2.6], [131, 181, 2.6]],
});
(COURSES[SC] ||= []).push('stack_1');
obstacle({
  id: 'cliff_traverse', name: 'Rope traverse', examine: 'A rope strung between the stacks.', option: 'Shimmy-across', course: SC, index: 1,
  x: 133, y: 181, w: 5, h: 1, blocks: false, model: { template: 'agi_rope', y: 2.6 }, anim: 'climb', level: 50, xp: 34,
  path: path([[132, 181, 2.6]], seg(133, 181, 137, 181, 2.2), [[138, 181, 2.6], [139, 181, 2.6]]),
  fail: { stop: 75, chance: 0.2, damage: [4, 7], at: 3, to: [135, 179], message: 'Your hands slip on the wet rope and you splash down!' },
});
obstacle({
  id: 'cliff_leap', name: 'Wide gap', examine: 'Surf churns below.', option: 'Jump', course: SC, index: 2,
  x: 141, y: 181, w: 3, h: 1, blocks: false, model: { template: 'agi_gap', y: 2.6, color: '#6e675e' }, level: 50, xp: 36,
  path: [[140, 181, 2.6], [141, 181, 3.0], [142, 181, 3.2], [143, 181, 3.0], [144, 181, 2.6], [145, 181, 2.6]],
  fail: { stop: 78, chance: 0.2, damage: [4, 8], at: 2, to: [142, 179], message: 'You plunge into the surf and wash up on the beach.' },
});
obstacle({
  id: 'cliff_driftwood', name: 'Driftwood beam', examine: 'A bleached tree trunk wedged between the stacks.', option: 'Walk-across', course: SC, index: 3,
  x: 147, y: 181, w: 5, h: 1, blocks: false, model: { template: 'agi_beam', y: 2.45, color: '#c8b89a' }, anim: 'balance', level: 50, xp: 34,
  path: path([[146, 181, 2.6]], seg(147, 181, 151, 181, 2.5), [[152, 181, 2.6], [153, 181, 2.6]]),
  fail: { stop: 80, chance: 0.2, damage: [4, 8], at: 3, to: [149, 179], message: 'The beam rolls and pitches you into the shallows!' },
});
obstacle({
  id: 'cliff_rope', name: 'Mooring rope', examine: 'An old mooring rope tied to a post on the beach.', option: 'Swing-on', course: SC, index: 4,
  x: 153, y: 178, w: 1, h: 1, blocks: false, model: { template: 'agi_vine', y: 1.4 }, level: 50, xp: 30,
  path: [[153, 180, 2.6], [153, 179, 2.0], [153, 178, 1.0], [153, 177, 0.3], [153, 176, 0]],
});
registerData('agility_course', SC, { name: 'Saltmarsh Cliffs', level: 50, lapXp: 360, markChance: 0.45, obstacles: COURSES[SC], finish: [153, 176] });

// =================================================================================================
// 5. Ashen Gauntlet (level 65, Wilderness levels 28-35)
// =================================================================================================
clear(70, 12, 85, 22);
const AG = 'ashen_gauntlet';
obstacle({
  id: 'gauntlet_pipe', name: 'Obsidian pipe', examine: 'A glassy black tube, still warm.', option: 'Squeeze-through', course: AG, index: 0,
  x: 75, y: 20, w: 5, h: 1, model: { template: 'agi_pipe', color: '#2a2630' }, level: 65, xp: 40,
  path: path([[74, 20, 0]], seg(75, 20, 79, 20, 0), [[80, 20, 0]]),
});
obstacle({
  id: 'gauntlet_swing', name: 'Ember pit', examine: 'A rope hangs over a pit of glowing coals.', option: 'Swing-across', course: AG, index: 1,
  x: 80, y: 15, w: 3, h: 4, model: { template: 'agi_swing', pit: '#3a1a10', glow: '#ff5a1a' }, level: 65, xp: 50,
  path: [[81, 19, 0], [81, 18, 0.8], [81, 17, 1.2], [81, 16, 1.2], [81, 15, 0.8], [81, 14, 0]],
  fail: { stop: 90, chance: 0.2, damage: [6, 10], at: 2, to: [83, 17], message: 'You drop onto the coals and scramble out, badly burned!' },
});
obstacle({
  id: 'gauntlet_stones', name: 'Cinder stones', examine: 'Stones poking out of a smouldering bed.', option: 'Jump-across', course: AG, index: 2,
  x: 75, y: 13, w: 5, h: 1, model: { template: 'agi_stones', embers: true, color: '#4a4440' }, level: 65, xp: 46,
  path: path([[80, 13, 0]], seg(79, 13, 75, 13, 0.15), [[74, 13, 0]]),
  fail: { stop: 92, chance: 0.2, damage: [5, 9], at: 3, to: [77, 14], message: 'A stone crumbles and your boots sink into the embers!' },
});
obstacle({
  id: 'gauntlet_log', name: 'Charred log', examine: 'A blackened log over a crack in the earth.', option: 'Walk-across', course: AG, index: 3,
  x: 72, y: 15, w: 1, h: 4, model: { template: 'agi_log', color: '#2e2620' }, anim: 'balance', level: 65, xp: 44,
  path: path([[72, 14, 0]], seg(72, 15, 72, 18, 0), [[72, 19, 0]]),
  fail: { stop: 92, chance: 0.18, damage: [5, 9], at: 2, to: [71, 17], message: 'The charred log cracks under you!' },
});
obstacle({
  id: 'gauntlet_wall', name: 'Scorched wall', examine: 'A crumbling, soot-blackened wall.', option: 'Climb-over', course: AG, index: 4,
  x: 73, y: 19, w: 1, h: 3, model: { template: 'agi_wall', color: '#3a3430', height: 1.3 }, anim: 'climb', level: 65, xp: 40,
  path: [[72, 20, 0], [73, 20, 1.3], [74, 20, 0]],
});
registerData('agility_course', AG, { name: 'Ashen Gauntlet', level: 65, lapXp: 520, markChance: 0.6, obstacles: COURSES[AG], finish: [74, 20], wilderness: true });

// =================================================================================================
// Shortcuts (bidirectional)
// =================================================================================================
obstacle({
  id: 'log_balance', name: 'Fallen log', examine: 'A slippery log spanning the Silverrun.', option: 'Walk-across', shortcut: true, bidir: true,
  x: 119, y: 112, w: 12, h: 1, blocks: false, model: { template: 'agi_log' }, anim: 'balance', level: 8, xp: 9,
  path: seg(118, 112, 131, 112),
  fail: { stop: 25, chance: 0.15, damage: [1, 3], at: 5, to: null, message: 'You slip and are swept to the bank!' },
});
obstacle({
  id: 'silverrun_stones', name: 'Stepping stones', examine: 'Slick stones across the river.', option: 'Jump-across', shortcut: true, bidir: true,
  x: 122, y: 160, w: 5, h: 1, blocks: false, model: { template: 'agi_stones' }, level: 18, xp: 12,
  path: seg(121, 160, 127, 160, 0.1),
  fail: { stop: 35, chance: 0.15, damage: [1, 4], at: 3, to: null, message: 'You slip off a stone and flounder back to the bank.' },
});
obstacle({
  id: 'highmarch_handholds', name: 'Crumbling wall', examine: 'Loose stones make good handholds.', option: 'Climb-over', shortcut: true, bidir: true,
  x: 140, y: 92, w: 1, h: 1, model: { template: 'agi_handholds' }, anim: 'climb', level: 26, xp: 10,
  path: [[139, 92, 0], [139, 92, 1.0], [140, 92, 2.6], [141, 92, 1.0], [141, 92, 0]],
});

// =================================================================================================
// Wayfarer marks, outfit and the mark exchange
// =================================================================================================
registerItem({ id: 'wayfarer_mark', name: 'Wayfarer mark', examine: 'A brass token left for nimble travellers. Pell trades for these.', stackable: true, value: 1, tradeable: true, icon: { shape: 'coins', color: '#5ac8a0' } });
const outfit = (id, name, slot, shape, value, extra = {}) => registerItem({
  id, name, slot, value, tradeable: false, examine: `Part of the Wayfarer's outfit. Light as a breeze.`, color: '#4a8a6a',
  icon: { shape, color: '#4a8a6a', color2: '#d8c890' }, bonuses: { defenceStab: 1, defenceSlash: 1 }, wayfarer: true, ...extra,
});
outfit('wayfarer_hood', "Wayfarer's hood", 'head', 'hood', 10, { model: { shape: 'hood', color: '#4a8a6a' } });
outfit('wayfarer_tunic', "Wayfarer's tunic", 'body', 'robe_top', 18, { model: { shape: 'robe_top', color: '#4a8a6a' } });
outfit('wayfarer_trousers', "Wayfarer's trousers", 'legs', 'legs', 15, { model: { shape: 'robe', color: '#3e7a5c' } });
outfit('wayfarer_gloves', "Wayfarer's gloves", 'hands', 'gloves', 8);
outfit('wayfarer_boots', "Wayfarer's boots", 'feet', 'boots', 10);
outfit('wayfarer_cape', "Wayfarer's cape", 'cape', 'cape', 12, { model: { color: '#4a8a6a', color2: '#d8c890' } });
registerItem({ id: 'trail_tonic', name: 'Trail tonic', examine: 'Minty and fizzy. Restores 30% run energy.', value: 1, options: ['Drink-tonic'], icon: { shape: 'potion', color: '#7ad8b0' } });
registerData('agility_outfit', 'pieces', ['wayfarer_hood', 'wayfarer_tunic', 'wayfarer_trousers', 'wayfarer_gloves', 'wayfarer_boots', 'wayfarer_cape']);

registerShop({
  id: 'wayfarer_exchange', name: "Pell's Wayfarer Exchange", currency: 'wayfarer_mark', sellRate: 1, buyRate: 0, restockTicks: 50,
  stock: [
    { id: 'wayfarer_hood', qty: 5 }, { id: 'wayfarer_tunic', qty: 5 }, { id: 'wayfarer_trousers', qty: 5 }, { id: 'wayfarer_gloves', qty: 5 },
    { id: 'wayfarer_boots', qty: 5 }, { id: 'wayfarer_cape', qty: 5 }, { id: 'trail_tonic', qty: 20 },
  ],
});

registerNpc({
  id: 'wayfarer_pell', name: 'Pell the Wayfarer', examine: 'A wiry old courier who has run every road in Ashvale.', options: ['Talk-to', 'Trade'],
  dialogue: 'wayfarer_pell', shop: 'wayfarer_exchange', wanderRadius: 2,
  model: { template: 'human', colors: { top: '#4a8a6a', legs: '#3e7a5c', hair: '#c8c8c0', boots: '#5a3a1a' }, extras: { beard: true }, equipment: {} },
  mapIcon: { char: 'A', color: '#5ac8a0' },
});
registerSpawn({ type: 'npc', id: 'wayfarer_pell', x: 100, y: 112, wander: 2 });

registerDialogue('wayfarer_pell', [
  { npc: "Ha! Another pair of legs. I'm Pell. I carried letters across every hill in this vale before my knees gave out." },
  { options: [
    { text: 'Where can I train my agility?', goto: 'courses' },
    { text: 'What are Wayfarer marks?', goto: 'marks' },
    { text: "Let's trade.", action: ({ game }) => { game.ui.openShop('wayfarer_exchange'); return false; } },
    { text: 'Goodbye.', end: true },
  ] },
  { label: 'courses', npc: "This yard is where every courier starts. When you're nimble enough (20), try the Thornwood Canopy - decks up in the old oaks." },
  { npc: 'At 35 the Highmarch rooftops, at 50 the sea stacks on the Saltmarsh Coast, and if you are mad, the Ashen Gauntlet up in the Wilderness at 65.' },
  { npc: 'Finish a full lap without skipping anything and the course rewards you with a bonus. Shortcuts all over the vale open up as you improve, too.', end: true },
  { label: 'marks', npc: 'Couriers leave little brass marks for one another along the courses. Spot one, keep it.' },
  { npc: "Bring them to me and I'll trade you a Wayfarer's outfit. Each piece helps you catch your breath faster - wear the lot and you'll barely need to stop.", end: true },
]);
