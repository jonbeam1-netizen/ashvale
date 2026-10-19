// Builds the World from registered map data: config, paint ops, areas and spawn rules.
// See ARCHITECTURE.md "Map data" for the op/rule schemas.

import { World, FLAG_TERRAIN_BLOCK, FLAG_WATER, FLAG_NO_SCATTER, FLAG_INDOORS } from './world.js';
import { TERRAIN_TYPES, terrainIndex } from './terrain.js';
import { getMapConfig, getPaintOps, getSpawns, allAreas, getObject, getNpc, getItem } from '../core/registry.js';
import { fbm, valueNoise, mulberry32 } from '../core/rng.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx, qy = ay + t * dy;
  return Math.hypot(px - qx, py - qy);
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Returns {bbox:[x0,y0,x1,y1], depth(x,y)} where depth > 0 means inside (distance from edge). */
function shapeOf(op, W, H) {
  const pad = (op.jitter || 0) + (op.falloff || 0) + 1;
  switch (op.shape || 'rect') {
    case 'all':
      return { bbox: [0, 0, W - 1, H - 1], depth: () => 1e9 };
    case 'rect': {
      const { x0, y0, x1, y1 } = op;
      return {
        bbox: [x0 - pad, y0 - pad, x1 + pad, y1 + pad],
        depth: (x, y) => Math.min(x - x0, x1 - x, y - y0, y1 - y) + 0.5,
      };
    }
    case 'circle': {
      const { cx, cy, r } = op;
      return {
        bbox: [cx - r - pad, cy - r - pad, cx + r + pad, cy + r + pad],
        depth: (x, y) => r - Math.hypot(x + 0.5 - cx, y + 0.5 - cy),
      };
    }
    case 'line': {
      const pts = op.points, hw = (op.width ?? 2) / 2;
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return {
        bbox: [Math.min(...xs) - hw - pad, Math.min(...ys) - hw - pad, Math.max(...xs) + hw + pad, Math.max(...ys) + hw + pad],
        depth: (x, y) => {
          let d = Infinity;
          for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distToSegment(x + 0.5, y + 0.5, pts[i][0] + 0.5, pts[i][1] + 0.5, pts[i + 1][0] + 0.5, pts[i + 1][1] + 0.5));
          return hw - d + 0.5;
        },
      };
    }
    case 'poly': {
      const pts = op.points;
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return {
        bbox: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad],
        depth: (x, y) => {
          let d = Infinity;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) d = Math.min(d, distToSegment(x + 0.5, y + 0.5, pts[j][0], pts[j][1], pts[i][0], pts[i][1]));
          return pointInPoly(x + 0.5, y + 0.5, pts) ? d : -d;
        },
      };
    }
    default:
      console.warn('[map] unknown paint shape', op.shape);
      return { bbox: [0, 0, -1, -1], depth: () => -1 };
  }
}

function applyPaint(world, op, seed) {
  const W = world.width, H = world.height;
  const { bbox, depth } = shapeOf(op, W, H);
  const tIdx = op.terrain ? terrainIndex(op.terrain) : -1;
  const only = op.only ? new Set(op.only.map(terrainIndex)) : null;
  const except = op.except ? new Set(op.except.map(terrainIndex)) : null;
  const jseed = seed + (op.seed ?? 77);
  for (let y = Math.max(0, Math.floor(bbox[1])); y <= Math.min(H - 1, Math.ceil(bbox[3])); y++) {
    for (let x = Math.max(0, Math.floor(bbox[0])); x <= Math.min(W - 1, Math.ceil(bbox[2])); x++) {
      let d = depth(x, y);
      if (op.jitter) d += (valueNoise(x / 3.3, y / 3.3, jseed) - 0.5) * 2 * op.jitter;
      if (d <= 0) continue;
      const i = world.idx(x, y);
      if (only && !only.has(world.terrain[i])) continue;
      if (except && except.has(world.terrain[i])) continue;
      const w = op.falloff ? clamp01(d / op.falloff) : 1;
      if (tIdx >= 0) world.terrain[i] = tIdx;
      if (op.height != null) world.tileHeight[i] += (op.height - world.tileHeight[i]) * w;
      if (op.raise) world.tileHeight[i] += op.raise * w;
      if (op.noise) world.tileHeight[i] += (fbm(x / (op.noise.scale || 8), y / (op.noise.scale || 8), jseed + 5) - 0.5) * 2 * op.noise.amp * w;
      if (op.blocked === true) world.flags[i] |= FLAG_TERRAIN_BLOCK;
      if (op.blocked === false) world.flags[i] &= ~FLAG_TERRAIN_BLOCK;
      if (op.noScatter) world.flags[i] |= FLAG_NO_SCATTER;
      if (op.indoors) world.flags[i] |= FLAG_INDOORS;
    }
  }
}

function linePoints(x0, y0, x1, y1) {
  const out = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    out.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out;
}

/** Building pre-pass: floors, flattening, indoor flags (before heights are finalised). */
function prepareBuilding(world, r) {
  const { x, y, w, h } = r;
  const floor = terrainIndex(r.floor || 'wood_floor');
  let sum = 0, n = 0;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { sum += world.tileHeight[world.idx(xx, yy)]; n++; }
  const avg = r.height ?? sum / n;
  for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
    if (!world.inBounds(xx, yy)) continue;
    const i = world.idx(xx, yy);
    world.tileHeight[i] = avg;
    world.flags[i] |= FLAG_NO_SCATTER;
    const inner = xx > x - 1 && xx < x + w && yy > y - 1 && yy < y + h;
    if (inner) { world.terrain[i] = floor; world.flags[i] |= FLAG_INDOORS; }
  }
  if (r.roof !== false) {
    world.buildings.push({ x0: x, y0: y, x1: x + w - 1, y1: y + h - 1, roof: r.roof || '#7a3a2a', wallHeight: r.wallHeight ?? 2.4, name: r.name || '', base: avg });
  }
}

function doorTiles(r) {
  const out = new Set();
  for (const d of r.doors || [{ side: 's' }]) {
    const side = d.side || 's';
    const horiz = side === 'n' || side === 's';
    const len = horiz ? r.w : r.h;
    const off = d.offset ?? Math.floor(len / 2);
    const width = d.width || 1;
    for (let k = 0; k < width; k++) {
      const o = off + k;
      if (side === 'n') out.add(`${r.x + o},${r.y}`);
      if (side === 's') out.add(`${r.x + o},${r.y + r.h - 1}`);
      if (side === 'w') out.add(`${r.x},${r.y + o}`);
      if (side === 'e') out.add(`${r.x + r.w - 1},${r.y + o}`);
    }
  }
  return out;
}

export function buildWorld(game) {
  const cfg = getMapConfig();
  const world = new World(cfg);
  game.world = world;
  const W = world.width, H = world.height, seed = cfg.seed || 1;

  // 1. base terrain + rolling hills
  const base = terrainIndex(cfg.baseTerrain || 'grass');
  const amp = cfg.hillAmplitude ?? 2.4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = world.idx(x, y);
    world.terrain[i] = base;
    world.tileHeight[i] = 0.9 + (fbm(x / 26, y / 26, seed) - 0.5) * 2 * amp + (fbm(x / 6, y / 6, seed + 3) - 0.5) * 0.35;
  }

  // 2. paint ops in order
  for (const op of getPaintOps()) applyPaint(world, op, seed);

  // 3. buildings (terrain part)
  const rules = getSpawns();
  for (const r of rules) if (r.type === 'building') prepareBuilding(world, r);

  // 4. terrain walkability, liquids
  world.liquidHeight = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const t = TERRAIN_TYPES[world.terrain[i]];
    if (!t.walkable) world.flags[i] |= FLAG_TERRAIN_BLOCK;
    if (t.liquid === 'water') {
      world.flags[i] |= FLAG_WATER | FLAG_TERRAIN_BLOCK;
      world.liquidHeight[i] = world.waterLevel;
      world.tileHeight[i] = Math.min(world.tileHeight[i], world.waterLevel - 1.1);
    } else if (t.liquid === 'lava') {
      world.flags[i] |= FLAG_TERRAIN_BLOCK;
      world.liquidHeight[i] = world.tileHeight[i] - 0.25;
      world.tileHeight[i] -= 0.9;
    }
  }

  // 5. sandy shores next to water
  if (cfg.shores !== false) {
    const sand = terrainIndex('sand');
    const grassy = new Set(['grass', 'dark_grass', 'flowers', 'swamp'].map(terrainIndex));
    const toSand = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = world.idx(x, y);
      if (!grassy.has(world.terrain[i])) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (world.isWater(x + dx, y + dy)) { near = true; break; }
      if (near) toSand.push(i);
    }
    for (const i of toSand) world.terrain[i] = sand;
  }

  // 6. world border is never walkable
  for (let x = 0; x < W; x++) { world.flags[x] |= FLAG_TERRAIN_BLOCK; world.flags[(H - 1) * W + x] |= FLAG_TERRAIN_BLOCK; }
  for (let y = 0; y < H; y++) { world.flags[y * W] |= FLAG_TERRAIN_BLOCK; world.flags[y * W + W - 1] |= FLAG_TERRAIN_BLOCK; }

  // 7. vertex heights = average of surrounding tiles
  const VW = W + 1;
  for (let vy = 0; vy <= H; vy++) for (let vx = 0; vx <= W; vx++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
      const x = vx + dx, y = vy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      s += world.tileHeight[y * W + x]; n++;
    }
    world.heights[vy * VW + vx] = s / n;
  }

  // 8. areas
  world.setAreas(allAreas());

  // 9. spawns
  for (const r of rules) {
    try { resolveSpawn(game, world, r, seed); } catch (e) { console.error('[map] spawn rule failed', r, e); }
  }
  return world;
}

function placeObject(game, world, id, x, y, opts = {}) {
  if (!getObject(id)) { console.warn(`[map] unknown object ${id}`); return null; }
  if (!opts.force) {
    const def = getObject(id);
    const [w, h] = opts.w ? [opts.w, opts.h || 1] : def.size || [1, 1];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      if (!world.inBounds(x + dx, y + dy)) return null;
      if (world.objectsAt(x + dx, y + dy).some((o) => o.blocks)) return null;
    }
  }
  return game.spawnObject(id, x, y, opts);
}

function resolveSpawn(game, world, r, seed) {
  switch (r.type) {
    case 'object':
      placeObject(game, world, r.id, r.x, r.y, { rot: r.rot, w: r.w, h: r.h, force: r.force ?? true });
      break;
    case 'npc':
      if (!getNpc(r.id)) { console.warn(`[map] unknown npc ${r.id}`); break; }
      game.spawnNpc(r.id, r.x, r.y, { wander: r.wander });
      break;
    case 'item':
      if (!getItem(r.id)) { console.warn(`[map] unknown item ${r.id}`); break; }
      game.spawnGroundItem(r.id, r.qty || 1, r.x, r.y, { permanent: true, respawnTicks: r.respawnTicks ?? 50 });
      break;
    case 'line': {
      const gaps = new Set((r.gaps || []).map((g) => `${g[0]},${g[1]}`));
      for (let k = 0; k < r.points.length - 1; k++) {
        const [ax, ay] = r.points[k], [bx, by] = r.points[k + 1];
        const rot = Math.abs(bx - ax) >= Math.abs(by - ay) ? 0 : 1;
        for (const [x, y] of linePoints(ax, ay, bx, by)) {
          if (gaps.has(`${x},${y}`)) continue;
          if (world.objectsAt(x, y).some((o) => o.id === r.id)) continue;
          placeObject(game, world, r.id, x, y, { rot, force: true });
          world.flags[world.idx(x, y)] |= FLAG_NO_SCATTER;
        }
      }
      break;
    }
    case 'building': {
      const doors = doorTiles(r);
      const wall = r.wall || 'wall_stone';
      for (let yy = r.y; yy < r.y + r.h; yy++) for (let xx = r.x; xx < r.x + r.w; xx++) {
        const edge = xx === r.x || yy === r.y || xx === r.x + r.w - 1 || yy === r.y + r.h - 1;
        if (!edge) continue;
        if (doors.has(`${xx},${yy}`)) {
          if (r.doorObject) {
            const vertical = xx === r.x || xx === r.x + r.w - 1;
            placeObject(game, world, r.doorObject, xx, yy, { rot: vertical ? 1 : 0, force: true });
          }
          continue;
        }
        placeObject(game, world, wall, xx, yy, { force: true });
      }
      break;
    }
    case 'scatter': {
      const rng = mulberry32((r.seed ?? 1) * 7919 + seed);
      const [x0, y0, x1, y1] = r.rect || [0, 0, world.width - 1, world.height - 1];
      const allowed = r.terrain ? new Set(r.terrain.map(terrainIndex)) : null;
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const count = r.count ?? Math.round(area * (r.density ?? 0.02));
      const ids = (r.ids || [r.id]).map((e) => (typeof e === 'string' ? { id: e, weight: 1 } : e));
      const totalW = ids.reduce((a, e) => a + (e.weight ?? 1), 0);
      const spacing = r.spacing ?? 1;
      const kind = r.kind || 'object';
      let placed = 0;
      for (let tries = 0; tries < count * 25 && placed < count; tries++) {
        const x = x0 + Math.floor(rng() * (x1 - x0 + 1));
        const y = y0 + Math.floor(rng() * (y1 - y0 + 1));
        const i = world.idx(x, y);
        if (r.water) {
          // water tiles with a walkable cardinal neighbour (fishing spots etc.)
          if (!world.isWater(x, y) || world.objectsAt(x, y).length) continue;
          if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => world.isWalkable(x + dx, y + dy))) continue;
        } else {
          if (!world.isWalkable(x, y)) continue;
          if (world.flags[i] & FLAG_NO_SCATTER) continue;
          const t = TERRAIN_TYPES[world.terrain[i]];
          if (allowed ? !allowed.has(world.terrain[i]) : !t.natural) continue;
        }
        if (r.circle && Math.hypot(x - r.circle[0], y - r.circle[1]) > r.circle[2]) continue;
        let roll = rng() * totalW, pick = ids[0].id;
        for (const e of ids) { roll -= e.weight ?? 1; if (roll < 0) { pick = e.id; break; } }
        if (kind === 'npc') {
          game.spawnNpc(pick, x, y, { wander: r.wander });
          placed++;
          continue;
        }
        let clear = true;
        for (let dy = -spacing; dy <= spacing && clear; dy++) for (let dx = -spacing; dx <= spacing; dx++) {
          if (!world.inBounds(x + dx, y + dy)) continue;
          if (world.objectsAt(x + dx, y + dy).length) { clear = false; break; }
        }
        if (!clear) continue;
        if (placeObject(game, world, pick, x, y, { rot: Math.floor(rng() * 4) })) placed++;
      }
      break;
    }
    default:
      console.warn('[map] unknown spawn rule type', r.type);
  }
}
