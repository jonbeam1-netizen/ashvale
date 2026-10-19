// Shared helpers for the hand-built map regions. OWNER: agent D (world builder).
// Region modules export build functions that content/map.js calls in a fixed order, because
// paint ops are order-dependent (later ops paint over earlier ones).

import { registerPaint, registerArea, registerSpawn, registerObject } from '../../core/registry.js';

export const paint = registerPaint;
export const area = registerArea;
export const spawn = registerSpawn;

/** Place one object. rot = quarter turns clockwise (0 faces south). */
export const obj = (id, x, y, rot = 0, extra = {}) => spawn({ type: 'object', id, x, y, rot, ...extra });
/** Place the same object at many [x, y, rot?] points. */
export const objs = (id, pts) => { for (const [x, y, rot = 0] of pts) obj(id, x, y, rot); };
export const npc = (id, x, y, wander = 3) => spawn({ type: 'npc', id, x, y, wander });
export const npcScatter = (ids, rect, count, seed, wander = 4, extra = {}) => spawn({ type: 'scatter', kind: 'npc', ids, rect, count, seed, wander, ...extra });
export const scatter = (ids, rect, opts = {}) => spawn({ type: 'scatter', ids, rect, ...opts });
export const line = (id, points, gaps = []) => spawn({ type: 'line', id, points, gaps });
export const item = (id, x, y, qty = 1, respawnTicks = 100) => spawn({ type: 'item', id, x, y, qty, respawnTicks });

/** Roads & paths (noScatter so decoration keeps off them). */
export const road = (points, width = 2, terrain = 'dirt', jitter = 0.3) => paint({ shape: 'line', points, width, terrain, noScatter: true, jitter });
/** Mark a rect as hand-placed (no scatter). */
export const keepClear = (x0, y0, x1, y1) => paint({ shape: 'rect', x0, y0, x1, y1, noScatter: true });
export const keepClearCircle = (cx, cy, r) => paint({ shape: 'circle', cx, cy, r, noScatter: true });

/** Building with walls/floor/roof. doors: [{side, offset, width}] */
export const building = (name, x, y, w, h, wall, roof, doors, extra = {}) =>
  spawn({ type: 'building', name, x, y, w, h, wall, roof, doors, floor: extra.floor || 'wood_floor', ...extra });

/** Wooden bridge over water: floor tiles + fence railings along both sides. */
export function bridge(x0, y0, x1, y1, { rails = true, height = 0.55, terrain = 'wood_floor' } = {}) {
  paint({ shape: 'rect', x0, y0, x1, y1, terrain, height, noScatter: true, blocked: false });
  if (!rails) return;
  if (x1 - x0 >= y1 - y0) { line('fence_wood', [[x0, y0 - 1], [x1, y0 - 1]]); line('fence_wood', [[x0, y1 + 1], [x1, y1 + 1]]); }
  else { line('fence_wood', [[x0 - 1, y0], [x0 - 1, y1]]); line('fence_wood', [[x1 + 1, y0], [x1 + 1, y1]]); }
}

/**
 * Two-way transition (ladder / cave mouth / stairs) using the engine's data-driven `teleport`
 * handler (Climb-up/Climb-down/Enter/Exit/Go-through/Squeeze-through).
 */
export function portalObject(id, name, examine, option, model, dest, { size, message, mapIcon, blocks } = {}) {
  return registerObject({ id, name, examine, options: [option], teleport: { x: dest[0], y: dest[1], message }, model, size, mapIcon, blocks });
}

/** Signpost helper: registers a readable signpost and places it. */
let signN = 0;
export function signpost(x, y, text, rot = 0, arms = 3) {
  const id = `signpost_d${++signN}`;
  registerObject({ id, name: 'Signpost', examine: 'A weathered signpost.', options: ['Read'], readText: text, model: { template: 'dec_signpost', arms } });
  obj(id, x, y, rot);
  return id;
}
/** Readable plaque / notice / gravestone with custom text. */
let readN = 0;
export function readable(base, x, y, name, text, rot = 0, extra = {}) {
  const id = `${base}_r${++readN}`;
  registerObject({ id, name, examine: extra.examine || `A ${name.toLowerCase()}.`, options: ['Read'], readText: text, model: extra.model, size: extra.size, blocks: extra.blocks });
  obj(id, x, y, rot);
  return id;
}

/** Tiny deterministic RNG for hand-placement jitter. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Fixed transition points shared between region modules: [x, y] where the player arrives.
 * (Overworld side = the tile in front of the entrance; dungeon side = first tile inside.)
 */
export const SPOTS = {
  // overworld
  morrowCrypt: [58, 176],        // in front of the mausoleum at (57,173)
  sewerManhole: [158, 98],       // Highmarch, beside the manhole at (157,98)
  sewerOutflow: [121, 104],      // Silverrun west bank, beside the outflow pipe at (121,105)
  mineMouth: [235, 92],          // Greyspine, in front of the Hollowpick adit at (234,94)
  templeStairs: [264, 188],      // Sandswallowed Temple, in front of the stairs at (264,186)
  spireDoor: [219, 124],         // Bramblemoor, south of Starcaller's Spire (218,120)
  cinderMouth: [256, 34],        // Cinderfall, in front of the cave mouth at (255,31)
  // inside
  cryptEntry: [12, 233],
  sewerEntry: [70, 232],
  sewerFar: [134, 248],
  mineEntry: [151, 233],
  templeEntry: [222, 233],
  spireStudy: [278, 244],
  cinderEntry: [262, 25],
};
