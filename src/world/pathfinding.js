// A* pathfinding on the tile grid (8 directions, diagonal = same cost as OSRS).
// If the goal is unreachable the path leads to the reachable tile closest to it.

class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= n.f) break;
      a[i] = a[p]; i = p;
    }
    a[i] = n;
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        const mf = () => (m === i ? last.f : a[m].f);
        if (l < a.length && a[l].f < mf()) m = l;
        if (r < a.length && a[r].f < mf()) m = r;
        if (m === i) break;
        a[i] = a[m]; i = m;
      }
      a[i] = last;
    }
    return top;
  }
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

/**
 * @param {import('./world.js').World} world
 * @param {number} sx start x  @param {number} sy start y
 * @param {object} goal { x0, y0, x1, y1 } target rect (inclusive) and mode:
 *   mode 'tile'     - stand anywhere inside the rect (default)
 *   mode 'adjacent' - stand on a tile cardinally adjacent to the rect (not inside)
 *   mode 'range'    - stand within Chebyshev `range` of the rect (not inside)
 * @param {object} opts { maxNodes = 8000, radius = 64 }
 * @returns {{path: {x,y}[], reached: boolean}}
 */
export function findPath(world, sx, sy, goal, opts = {}) {
  const maxNodes = opts.maxNodes ?? 8000;
  const radius = opts.radius ?? 72;
  const mode = goal.mode || 'tile';
  const range = goal.range ?? 1;
  const { x0, y0, x1, y1 } = goal;

  const distToRect = (x, y) => Math.max(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const isGoal = (x, y) => {
    if (mode === 'tile') return inside(x, y);
    if (inside(x, y)) return false;
    if (mode === 'adjacent') {
      // cardinal adjacency to the rect
      const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1);
      return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
    return distToRect(x, y) <= range;
  };
  const h = (x, y) => {
    const d = distToRect(x, y);
    return mode === 'tile' ? d : Math.max(0, d - (mode === 'range' ? range : 1));
  };

  if (isGoal(sx, sy)) return { path: [], reached: true };

  const W = world.width;
  const key = (x, y) => y * W + x;
  const nodes = new Map();
  const open = new Heap();
  const start = { x: sx, y: sy, g: 0, f: h(sx, sy), parent: null, closed: false };
  nodes.set(key(sx, sy), start);
  open.push(start);
  let best = start, bestH = h(sx, sy);
  let expanded = 0;
  let found = null;

  while (open.size && expanded < maxNodes) {
    const cur = open.pop();
    if (cur.closed) continue;
    cur.closed = true;
    expanded++;
    if (isGoal(cur.x, cur.y)) { found = cur; break; }
    const ch = h(cur.x, cur.y);
    if (ch < bestH || (ch === bestH && cur.g < best.g)) { best = cur; bestH = ch; }
    for (let d = 0; d < 8; d++) {
      const dx = DIRS[d][0], dy = DIRS[d][1];
      const nx = cur.x + dx, ny = cur.y + dy;
      if (Math.abs(nx - sx) > radius || Math.abs(ny - sy) > radius) continue;
      if (!world.canStep(cur.x, cur.y, dx, dy)) continue;
      const g = cur.g + (d < 4 ? 1 : 1.0001);
      const k = key(nx, ny);
      let n = nodes.get(k);
      if (n && (n.closed || n.g <= g)) continue;
      if (!n) { n = { x: nx, y: ny, g, f: 0, parent: cur, closed: false }; nodes.set(k, n); }
      n.g = g; n.parent = cur; n.f = g + h(nx, ny) * 1.001;
      open.push(n);
    }
  }

  const end = found || best;
  const path = [];
  for (let n = end; n && n.parent; n = n.parent) path.push({ x: n.x, y: n.y });
  path.reverse();
  return { path, reached: !!found };
}

/** Chebyshev distance between a tile and a rect. */
export function rectDistance(x, y, x0, y0, x1, y1) {
  return Math.max(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
}
