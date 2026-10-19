// Tile world: terrain types, heights, collision, areas, object occupancy.
// Coordinates: tile (x, y); x grows east, y grows SOUTH. North = smaller y.
// 3D mapping: world X = x, world Z = y, tile centre = (x + 0.5, y + 0.5).

import { TERRAIN_TYPES } from './terrain.js';

export const FLAG_TERRAIN_BLOCK = 1;
export const FLAG_WATER = 2;
export const FLAG_NO_SCATTER = 4; // paths, buildings: scatter rules skip these tiles
export const FLAG_INDOORS = 8;

export class World {
  constructor(cfg) {
    this.cfg = cfg;
    this.width = cfg.width;
    this.height = cfg.height;
    const n = this.width * this.height;
    this.terrain = new Uint8Array(n);
    this.tileHeight = new Float32Array(n);
    this.flags = new Uint8Array(n);
    this.objBlock = new Uint8Array(n);       // count of blocking objects on tile
    this.heights = new Float32Array((this.width + 1) * (this.height + 1)); // vertex heights
    this.objectGrid = new Map();             // idx -> Set<WorldObject>
    this.areas = [];
    this.buildings = [];                     // {x0,y0,x1,y1,roof,height,name}
    this.waterLevel = cfg.waterLevel ?? 0;
  }

  idx(x, y) { return y * this.width + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.width && y < this.height; }

  terrainAt(x, y) { return this.inBounds(x, y) ? TERRAIN_TYPES[this.terrain[this.idx(x, y)]] : null; }

  /** Interpolated ground height at continuous world coords (tile units; centre of tile = x+0.5). */
  heightAt(fx, fy) {
    const W = this.width + 1;
    fx = Math.max(0, Math.min(this.width - 0.001, fx));
    fy = Math.max(0, Math.min(this.height - 0.001, fy));
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const h = this.heights;
    const a = h[y0 * W + x0], b = h[y0 * W + x0 + 1], c = h[(y0 + 1) * W + x0], d = h[(y0 + 1) * W + x0 + 1];
    // match the triangle split used by the terrain mesh (diagonal a-d)
    if (tx >= ty) return a + (b - a) * tx + (d - b) * ty;
    return a + (d - c) * tx + (c - a) * ty;
  }

  /** Ground height at a tile's centre. */
  tileCenterHeight(x, y) { return this.heightAt(x + 0.5, y + 0.5); }

  isWater(x, y) { return this.inBounds(x, y) && (this.flags[this.idx(x, y)] & FLAG_WATER) !== 0; }

  /** True if an entity may stand on the tile. */
  isWalkable(x, y) {
    if (!this.inBounds(x, y)) return false;
    const i = this.idx(x, y);
    return (this.flags[i] & FLAG_TERRAIN_BLOCK) === 0 && this.objBlock[i] === 0;
  }

  /** Can an entity step from (x,y) by (dx,dy) (each -1..1)? Diagonals need both orthogonals clear. */
  canStep(x, y, dx, dy) {
    const nx = x + dx, ny = y + dy;
    if (!this.isWalkable(nx, ny)) return false;
    if (dx !== 0 && dy !== 0) return this.isWalkable(x + dx, y) && this.isWalkable(x, y + dy);
    return true;
  }

  /** Can a `size` x `size` footprint stand with its north-west corner on (x, y)? */
  fits(x, y, size = 1) {
    if (size <= 1) return this.isWalkable(x, y);
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) if (!this.isWalkable(x + dx, y + dy)) return false;
    return true;
  }

  /**
   * Footprint-aware step (NPCs bigger than 1x1): only the tiles entering the footprint are tested (the leading
   * column/row); a diagonal needs both orthogonal steps to be possible, like canStep.
   */
  canStepSize(x, y, dx, dy, size = 1) {
    if (size <= 1) return this.canStep(x, y, dx, dy);
    if (dx) {
      const cx = dx > 0 ? x + size : x - 1;
      const ya = dy < 0 ? y - 1 : y, yb = dy > 0 ? y + size : y + size - 1;
      for (let yy = ya; yy <= yb; yy++) if (!this.isWalkable(cx, yy)) return false;
    }
    if (dy) {
      const ry = dy > 0 ? y + size : y - 1;
      const xa = dx < 0 ? x - 1 : x, xb = dx > 0 ? x + size : x + size - 1;
      for (let xx = xa; xx <= xb; xx++) if (!this.isWalkable(xx, ry)) return false;
    }
    return true;
  }

  // ---- areas --------------------------------------------------------------------------------
  setAreas(list) { this.areas = [...list].sort((a, b) => (b.priority || 0) - (a.priority || 0)); }

  getArea(x, y) {
    for (const a of this.areas) if (x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1) return a;
    return null;
  }
  getAreaName(x, y) { return this.getArea(x, y)?.name || ''; }

  /** 0 outside the Wilderness, otherwise 1.. increasing northward. */
  getWildernessLevel(x, y) {
    const edge = this.cfg.wildernessEdgeY;
    if (y >= edge) return 0;
    const a = this.getArea(x, y);
    if (a && a.safe) return 0;
    return edge - y;
  }
  isWilderness(x, y) { return this.getWildernessLevel(x, y) > 0; }
  isMulti(x, y) { return !!this.getArea(x, y)?.multi; }

  /** Building (roofed rect) containing the tile, if any. */
  buildingAt(x, y) {
    for (const b of this.buildings) if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return b;
    return null;
  }

  // ---- objects --------------------------------------------------------------------------------
  objectsAt(x, y) {
    const s = this.objectGrid.get(this.idx(x, y));
    return s ? [...s] : [];
  }

  addObject(obj) {
    for (const [x, y] of obj.tiles()) {
      if (!this.inBounds(x, y)) continue;
      const i = this.idx(x, y);
      if (!this.objectGrid.has(i)) this.objectGrid.set(i, new Set());
      this.objectGrid.get(i).add(obj);
      if (obj.blocks) this.objBlock[i]++;
    }
    obj._blocking = obj.blocks;
  }

  removeObject(obj) {
    for (const [x, y] of obj.tiles()) {
      if (!this.inBounds(x, y)) continue;
      const i = this.idx(x, y);
      this.objectGrid.get(i)?.delete(obj);
      if (obj._blocking && this.objBlock[i] > 0) this.objBlock[i]--;
    }
    obj._blocking = false;
  }

  /** Call after an object's `blocks` changes (e.g. door opened). */
  refreshObject(obj) { this.removeObject(obj); this.addObject(obj); }
}
