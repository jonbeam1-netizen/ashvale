// Procedural low-poly models built from primitives.
//
//  * Scenery templates  -> one merged, vertex-coloured BufferGeometry per variant (rendered instanced).
//  * Character templates -> a rig: pivot Groups holding merged vertex-coloured meshes, animated in
//    render/characters.js according to rig.kind ('biped' | 'quad' | 'spider' | 'bird' | 'bat').
//
// Units: 1 = one tile. Origin = centre of the footprint at ground level, +Y up, model faces +Z.
// Content can add templates with registerSceneryTemplate / registerCharacterTemplate.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getItem } from '../core/registry.js';

// ------------------------------------------------------------------------------------------------
// Geometry builder
// ------------------------------------------------------------------------------------------------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();

let jitterSeed = 1;
const jrand = () => { jitterSeed = (jitterSeed * 16807) % 2147483647; return jitterSeed / 2147483647; };

export class GeoBuilder {
  constructor() { this.parts = []; }

  /**
   * Add a primitive.
   * @param {THREE.BufferGeometry} geo
   * @param {string|number} color
   * @param {number[]} pos @param {number[]} rot euler xyz @param {number[]|number} scl
   * @param {number} jitter per-face brightness variation
   */
  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], jitter = 0.08) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (typeof scl === 'number') scl = [scl, scl, scl];
    _m.compose(_p.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(scl[0], scl[1], scl[2]));
    g.applyMatrix4(_m);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    _c.set(color);
    for (let i = 0; i < n; i += 3) {
      const f = 1 + (jrand() - 0.5) * 2 * jitter;
      for (let k = 0; k < 3 && i + k < n; k++) {
        col[(i + k) * 3] = _c.r * f; col[(i + k) * 3 + 1] = _c.g * f; col[(i + k) * 3 + 2] = _c.b * f;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  box(color, w, h, d, pos, rot, jitter) { return this.add(BOX, color, pos, rot, [w, h, d], jitter); }
  cyl(color, rTop, rBot, h, seg, pos, rot, jitter) { return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, pos, rot, 1, jitter); }
  sphere(color, r, pos, scl = [1, 1, 1], detail = 0, jitter) { return this.add(new THREE.IcosahedronGeometry(r, detail), color, pos, [0, 0, 0], scl, jitter); }
  cone(color, r, h, seg, pos, rot, jitter) { return this.add(new THREE.ConeGeometry(r, h, seg), color, pos, rot, 1, jitter); }
  dodeca(color, r, pos, scl, rot = [0, 0, 0], jitter) { return this.add(new THREE.DodecahedronGeometry(r, 0), color, pos, rot, scl, jitter); }

  build() {
    if (!this.parts.length) this.box('#ff00ff', 0.01, 0.01, 0.01, [0, 0, 0]);
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 1);

/** Shared vertex-colour material for everything built by GeoBuilder. */
export const VC_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

// ------------------------------------------------------------------------------------------------
// Scenery templates
// ------------------------------------------------------------------------------------------------
const sceneryTemplates = new Map();
const sceneryCache = new Map();

/**
 * Register a scenery template. fn(b: GeoBuilder, params: def.model & {w, h}) adds primitives.
 * Set opts.animated = true and return an update(mesh, timeSec) from fn via params.animate for
 * non-instanced animated objects (see fishing_spot).
 */
export function registerSceneryTemplate(name, fn, opts = {}) { sceneryTemplates.set(name, { fn, ...opts }); }
export const getSceneryTemplate = (name) => sceneryTemplates.get(name);

export function sceneryKey(model, w, h) { return JSON.stringify(model) + `|${w}x${h}`; }

/** Merged geometry for an object model (cached). */
export function buildSceneryGeometry(model, w = 1, h = 1) {
  const key = sceneryKey(model, w, h);
  if (sceneryCache.has(key)) return sceneryCache.get(key);
  const t = sceneryTemplates.get(model.template) || sceneryTemplates.get('crate');
  const b = new GeoBuilder();
  jitterSeed = 1 + (key.length * 131) % 9973;
  t.fn(b, { ...model, w, h });
  const g = b.build();
  sceneryCache.set(key, g);
  return g;
}

// --- trees ---------------------------------------------------------------------------------------
const TREE_STYLES = {
  normal: { trunk: '#6b4a2b', leaf: '#3f7a2a', h: 1.5, r: 0.85, blobs: 3 },
  birch: { trunk: '#d8d2c4', leaf: '#7fae3c', h: 1.7, r: 0.75, blobs: 3 },
  weepwood: { trunk: '#5a4a32', leaf: '#6c9a3a', h: 1.6, r: 1.0, blobs: 2, droop: true },
  redleaf: { trunk: '#5e3d26', leaf: '#c4542a', h: 1.9, r: 1.0, blobs: 4 },
  ironbark: { trunk: '#3d2c22', leaf: '#244d24', h: 2.2, r: 1.25, blobs: 4 },
  starwood: { trunk: '#4a4060', leaf: '#4fd0d8', h: 2.3, r: 1.2, blobs: 4, sparkle: true },
  pine: { trunk: '#5a3d24', leaf: '#2f5e34', h: 1.0, r: 0.8, pine: true },
  dead: { trunk: '#4a3d33', leaf: null, h: 2.0, r: 0, dead: true },
  snowpine: { trunk: '#5a3d24', leaf: '#2f5e34', h: 1.0, r: 0.8, pine: true, snow: true },
};

registerSceneryTemplate('tree', (b, p) => {
  const st = { ...(TREE_STYLES[p.variant] || TREE_STYLES.normal), ...(p.colors || {}) };
  const sc = p.scale || (p.w > 1 ? 1.5 : 1);
  const trunkH = st.h * sc;
  b.cyl(st.trunk, 0.12 * sc, 0.2 * sc, trunkH, 6, [0, trunkH / 2, 0]);
  b.cyl(shade(st.trunk, 0.8), 0.22 * sc, 0.3 * sc, 0.25, 6, [0, 0.12, 0]); // root flare
  if (st.dead) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      b.cyl(st.trunk, 0.04, 0.08, 0.9 * sc, 4, [Math.sin(a) * 0.3 * sc, trunkH * (0.6 + i * 0.1), Math.cos(a) * 0.3 * sc], [Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8]);
    }
    return;
  }
  if (st.pine) {
    for (let i = 0; i < 4; i++) {
      const y = trunkH * 0.6 + i * 0.55 * sc;
      const r = (0.95 - i * 0.2) * sc;
      b.cone(st.leaf, r, 0.9 * sc, 7, [0, y + 0.3, 0], [0, i * 0.4, 0]);
      if (st.snow) b.cone('#eef3f7', r * 0.7, 0.4 * sc, 7, [0, y + 0.62, 0], [0, i * 0.4, 0]);
    }
    return;
  }
  const r = st.r * sc;
  b.sphere(st.leaf, r, [0, trunkH + r * 0.6, 0], [1, 0.85, 1], 0, 0.14);
  for (let i = 0; i < st.blobs; i++) {
    const a = (i / st.blobs) * Math.PI * 2 + 0.5;
    b.sphere(shade(st.leaf, 0.85 + (i % 2) * 0.25), r * 0.65, [Math.cos(a) * r * 0.6, trunkH + r * 0.35 + (i % 2) * 0.25, Math.sin(a) * r * 0.6], [1, 0.85, 1], 0, 0.14);
  }
  if (st.droop) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.cone(shade(st.leaf, 0.9), 0.18, 1.2 * sc, 4, [Math.cos(a) * r * 0.85, trunkH + 0.1, Math.sin(a) * r * 0.85], [Math.PI, 0, 0]);
    }
  }
  if (st.sparkle) {
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      b.sphere('#e8ffff', 0.07, [Math.cos(a) * r * 0.9, trunkH + r * (0.3 + (i % 3) * 0.3), Math.sin(a) * r * 0.9], [1, 1, 1], 0, 0);
    }
  }
});

registerSceneryTemplate('stump', (b, p) => {
  const st = TREE_STYLES[p.variant] || TREE_STYLES.normal;
  const sc = p.w > 1 ? 1.5 : 1;
  b.cyl(st.trunk, 0.2 * sc, 0.26 * sc, 0.32, 7, [0, 0.16, 0]);
  b.cyl('#c9a46a', 0.19 * sc, 0.19 * sc, 0.02, 7, [0, 0.33, 0], [0, 0, 0], 0.02);
});

registerSceneryTemplate('bush', (b, p) => {
  const c = p.color || '#3d7a2c';
  b.sphere(c, 0.38, [0, 0.3, 0], [1.1, 0.75, 1], 0, 0.15);
  b.sphere(shade(c, 1.15), 0.26, [0.2, 0.42, 0.1], [1, 0.8, 1], 0, 0.15);
  if (p.berries) for (let i = 0; i < 5; i++) b.sphere(p.berries, 0.05, [Math.cos(i * 1.3) * 0.3, 0.35 + (i % 2) * 0.15, Math.sin(i * 1.3) * 0.3]);
});

registerSceneryTemplate('flowers', (b, p) => {
  const cols = p.colors || ['#e8d040', '#d04a6a', '#f2f2f2', '#9a5ad0'];
  for (let i = 0; i < 7; i++) {
    const x = Math.cos(i * 2.4) * 0.3, z = Math.sin(i * 2.4) * 0.3;
    b.cyl('#3f7a2a', 0.01, 0.01, 0.2, 3, [x, 0.1, z]);
    b.sphere(cols[i % cols.length], 0.05, [x, 0.21, z]);
  }
});

// --- rocks -----------------------------------------------------------------------------------------
registerSceneryTemplate('rock', (b, p) => {
  const base = p.color || '#7d776e';
  const dep = !!p.depleted;
  const sc = p.scale || 1;
  b.dodeca(dep ? shade(base, 0.8) : base, 0.42 * sc, [0, 0.28 * sc, 0], [1.1, 0.75, 1], [0.3, 0.5, 0], 0.15);
  b.dodeca(shade(base, dep ? 0.7 : 0.9), 0.3 * sc, [0.24 * sc, 0.2 * sc, 0.18 * sc], [1, 0.8, 1], [0.1, 1.2, 0.4], 0.15);
  b.dodeca(shade(base, dep ? 0.75 : 1.05), 0.26 * sc, [-0.22 * sc, 0.18 * sc, -0.16 * sc], [1, 0.9, 1], [0.7, 0.2, 0.1], 0.15);
  if (p.ore && !dep) {
    const spots = [[0.1, 0.55, 0.25], [-0.25, 0.42, 0.12], [0.33, 0.35, -0.05], [-0.05, 0.4, -0.32], [0.3, 0.2, 0.35], [-0.38, 0.22, -0.2]];
    for (const [x, y, z] of spots) b.add(new THREE.OctahedronGeometry(0.075, 0), p.ore, [x * sc, y * sc, z * sc], [x, y, z], 1, 0.1);
  }
});

registerSceneryTemplate('boulder', (b, p) => {
  const c = p.color || '#6e6a63';
  b.dodeca(c, 0.45, [0, 0.3, 0], [1.2, 0.8, 1], [0.2, 0.4, 0], 0.15);
});

// --- fishing spot (animated, non-instanced) ---------------------------------------------------------
registerSceneryTemplate('fishing_spot', (b) => {
  b.add(new THREE.TorusGeometry(0.35, 0.03, 4, 14), '#d8ecff', [0, 0.05, 0], [Math.PI / 2, 0, 0], 1, 0);
}, {
  animated: true,
  create() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xdaf0ff, transparent: true, opacity: 0.7 });
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 16), mat.clone());
      m.rotation.x = Math.PI / 2;
      m.position.y = 0.04;
      g.add(m); rings.push(m);
    }
    const bubbles = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), mat);
      g.add(s); bubbles.push(s);
    }
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.1;
    g.add(hit);
    g.userData.update = (t) => {
      rings.forEach((r, i) => {
        const ph = (t * 0.6 + i / 3) % 1;
        r.scale.setScalar(0.4 + ph * 1.2);
        r.material.opacity = 0.75 * (1 - ph);
      });
      bubbles.forEach((s, i) => {
        const ph = (t * 0.9 + i * 0.27) % 1;
        s.position.set(Math.sin(i * 2.1 + t) * 0.2, ph * 0.2, Math.cos(i * 1.7) * 0.2);
        s.scale.setScalar(1 - ph);
      });
    };
    return g;
  },
});

registerSceneryTemplate('fire', (b) => { b.box('#333', 0.1, 0.1, 0.1, [0, 0.05, 0]); }, {
  animated: true,
  create() {
    const g = new THREE.Group();
    const logs = new GeoBuilder();
    logs.cyl('#5a3a20', 0.07, 0.07, 0.7, 5, [0, 0.07, 0], [0, 0.5, Math.PI / 2]);
    logs.cyl('#5a3a20', 0.07, 0.07, 0.7, 5, [0, 0.07, 0], [0, -0.6, Math.PI / 2]);
    g.add(new THREE.Mesh(logs.build(), VC_MATERIAL));
    const flames = [];
    const cols = [0xffd040, 0xff8a20, 0xe04010];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.05, 0.6 - i * 0.1, 5), new THREE.MeshBasicMaterial({ color: cols[i] }));
      f.position.set((i - 1) * 0.08, 0.35, (i % 2) * 0.06);
      g.add(f); flames.push(f);
    }
    const light = new THREE.PointLight(0xff8a30, 1.2, 5, 1.6);
    light.position.y = 0.6;
    g.add(light);
    g.userData.update = (t) => {
      flames.forEach((f, i) => { const s = 0.85 + Math.sin(t * 12 + i * 2) * 0.15; f.scale.set(1, s, 1); f.rotation.y = t * (1 + i); });
      light.intensity = 1.1 + Math.sin(t * 15) * 0.2;
    };
    return g;
  },
});

// --- buildings & structures --------------------------------------------------------------------------
const WALL_COLORS = { stone: '#8f897d', wood: '#7a5634', plaster: '#d8ccb0', dark: '#4a4440', brick: '#8a4a36' };

registerSceneryTemplate('wall', (b, p) => {
  const c = p.color || WALL_COLORS[p.variant] || WALL_COLORS.stone;
  const h = p.height || 2.4;
  b.box(c, 1, h + 0.5, 1, [0, h / 2 - 0.25, 0], [0, 0, 0], 0.1);
  b.box(shade(c, 0.8), 1.04, 0.15, 1.04, [0, h, 0], [0, 0, 0], 0.05);
  if (p.variant === 'plaster' || p.variant === 'wood') {
    b.box('#5a3d24', 1.02, 0.12, 1.02, [0, 0.2, 0], [0, 0, 0], 0.04);
  }
});

registerSceneryTemplate('fence', (b, p) => {
  const c = p.color || '#7a5a36';
  b.box(c, 0.1, 0.9, 0.1, [-0.45, 0.4, 0]);
  b.box(c, 0.1, 0.9, 0.1, [0.45, 0.4, 0]);
  b.box(shade(c, 1.1), 1.0, 0.07, 0.06, [0, 0.65, 0]);
  b.box(shade(c, 1.1), 1.0, 0.07, 0.06, [0, 0.35, 0]);
});

registerSceneryTemplate('stone_wall_low', (b, p) => {
  const c = p.color || '#7d786e';
  b.box(c, 1, 0.8, 0.5, [0, 0.35, 0], [0, 0, 0], 0.15);
  b.box(shade(c, 0.85), 1.02, 0.1, 0.55, [0, 0.78, 0]);
});

registerSceneryTemplate('door', (b, p) => {
  const c = p.color || '#6a4628';
  if (p.open) {
    b.box(c, 0.08, 2.0, 0.9, [-0.46, 1.0, 0.45 - 0.45]);
    return;
  }
  b.box(c, 0.92, 2.0, 0.1, [0, 1.0, 0]);
  b.box(shade(c, 0.7), 0.94, 0.08, 0.12, [0, 1.6, 0]);
  b.box(shade(c, 0.7), 0.94, 0.08, 0.12, [0, 0.4, 0]);
  b.sphere('#c8b040', 0.04, [0.3, 1.0, 0.07]);
  b.box('#3d3d3d', 1, 0.3, 0.16, [0, 2.25, 0]); // lintel
});

registerSceneryTemplate('ladder', (b, p) => {
  const c = p.color || '#7a5634';
  const down = p.down;
  if (down) {
    b.box('#2a2622', 0.9, 0.05, 0.9, [0, 0.02, 0], [0, 0, 0], 0);
    b.box(c, 0.06, 0.6, 0.06, [-0.28, 0.2, -0.3]);
    b.box(c, 0.06, 0.6, 0.06, [0.28, 0.2, -0.3]);
    b.box(c, 0.6, 0.05, 0.05, [0, 0.4, -0.3]);
    return;
  }
  b.box(c, 0.07, 2.6, 0.07, [-0.25, 1.3, 0], [-0.2, 0, 0]);
  b.box(c, 0.07, 2.6, 0.07, [0.25, 1.3, 0], [-0.2, 0, 0]);
  for (let i = 0; i < 7; i++) b.box(shade(c, 1.15), 0.5, 0.05, 0.05, [0, 0.25 + i * 0.35, -0.05 - i * 0.07]);
});

registerSceneryTemplate('furnace', (b) => {
  b.box('#7a6a5c', 1.8, 1.4, 1.6, [0, 0.7, 0], [0, 0, 0], 0.12);
  b.box('#5e5248', 1.9, 0.15, 1.7, [0, 1.42, 0]);
  b.box('#6e6054', 0.6, 1.2, 0.6, [0.4, 2.0, -0.3]);
  b.box('#1c1410', 0.8, 0.6, 0.1, [0, 0.55, 0.8], [0, 0, 0], 0);
  b.box('#ff7a20', 0.6, 0.35, 0.08, [0, 0.48, 0.82], [0, 0, 0], 0.05);
  b.box('#ffd060', 0.4, 0.15, 0.06, [0, 0.42, 0.85], [0, 0, 0], 0);
});

registerSceneryTemplate('anvil', (b) => {
  b.cyl('#6b4a2b', 0.25, 0.3, 0.45, 7, [0, 0.22, 0]);
  b.box('#3e3f44', 0.32, 0.18, 0.22, [0, 0.52, 0]);
  b.box('#4a4b52', 0.7, 0.14, 0.3, [0, 0.66, 0]);
  b.cone('#4a4b52', 0.1, 0.25, 4, [0.45, 0.66, 0], [0, 0, -Math.PI / 2]);
});

registerSceneryTemplate('range', (b) => {
  b.box('#8a4a36', 1.0, 0.85, 0.8, [0, 0.42, 0], [0, 0, 0], 0.12);
  b.box('#2a2a2c', 1.04, 0.08, 0.84, [0, 0.88, 0]);
  b.box('#1a1010', 0.5, 0.3, 0.05, [0, 0.4, 0.41], [0, 0, 0], 0);
  b.box('#ff6a20', 0.4, 0.12, 0.04, [0, 0.33, 0.42], [0, 0, 0], 0);
  b.cyl('#555', 0.18, 0.15, 0.22, 8, [0.2, 1.02, 0]);
  b.box('#6e3a2c', 0.25, 0.8, 0.25, [-0.35, 1.25, -0.25]);
});

registerSceneryTemplate('bank_booth', (b) => {
  b.box('#6a4426', 1.0, 1.0, 0.7, [0, 0.5, 0], [0, 0, 0], 0.08);
  b.box('#8a6036', 1.04, 0.08, 0.8, [0, 1.02, 0.03]);
  b.box('#5a3a20', 0.1, 1.3, 0.1, [-0.45, 1.65, -0.2]);
  b.box('#5a3a20', 0.1, 1.3, 0.1, [0.45, 1.65, -0.2]);
  b.box('#a8823c', 1.06, 0.12, 0.5, [0, 2.3, -0.1]);
  b.box('#2c3a4e', 0.8, 0.9, 0.04, [0, 1.6, -0.22], [0, 0, 0], 0.03);
  b.box('#d8b84a', 0.7, 0.06, 0.06, [0, 0.8, 0.36]);
});

registerSceneryTemplate('altar', (b, p) => {
  const c = p.color || '#cfc8b8';
  b.box(shade(c, 0.85), 1.6, 0.25, 0.9, [0, 0.12, 0]);
  b.box(c, 1.4, 0.75, 0.75, [0, 0.62, 0], [0, 0, 0], 0.05);
  b.box(p.cloth || '#e8e4dc', 1.45, 0.05, 0.6, [0, 1.0, 0], [0, 0, 0], 0.02);
  b.box(p.cloth2 || '#3a5ab8', 0.4, 0.5, 0.02, [0, 0.8, 0.38], [0, 0, 0], 0.02);
  b.cyl('#f2eee0', 0.04, 0.04, 0.25, 5, [-0.55, 1.15, 0]);
  b.cyl('#f2eee0', 0.04, 0.04, 0.25, 5, [0.55, 1.15, 0]);
  b.sphere('#ffd060', 0.04, [-0.55, 1.31, 0]);
  b.sphere('#ffd060', 0.04, [0.55, 1.31, 0]);
});

registerSceneryTemplate('crate', (b, p) => {
  const c = p.color || '#8a6a40';
  b.box(c, 0.7, 0.7, 0.7, [0, 0.35, 0], [0, 0.2, 0]);
  b.box(shade(c, 0.75), 0.72, 0.08, 0.72, [0, 0.35, 0], [0, 0.2, 0]);
});

registerSceneryTemplate('barrel', (b, p) => {
  const c = p.color || '#7a5530';
  b.cyl(c, 0.26, 0.26, 0.75, 8, [0, 0.375, 0]);
  b.cyl(shade(c, 1.2), 0.3, 0.3, 0.3, 8, [0, 0.375, 0]);
  b.cyl('#3a3a3a', 0.27, 0.27, 0.05, 8, [0, 0.7, 0]);
});

registerSceneryTemplate('table', (b, p) => {
  const c = p.color || '#7a5530';
  b.box(c, 1.0, 0.08, 0.7, [0, 0.72, 0]);
  for (const [x, z] of [[-0.42, -0.28], [0.42, -0.28], [-0.42, 0.28], [0.42, 0.28]]) b.box(shade(c, 0.8), 0.07, 0.7, 0.07, [x, 0.35, z]);
});

registerSceneryTemplate('stall', (b, p) => {
  const c = p.cloth || '#b03a2e';
  b.box('#7a5530', 1.8, 0.8, 0.9, [0, 0.4, 0.2]);
  for (const x of [-0.85, 0.85]) b.box('#5a3d24', 0.08, 2.0, 0.08, [x, 1.0, -0.35]);
  for (let i = 0; i < 4; i++) b.box(i % 2 ? '#f2eee0' : c, 0.48, 0.06, 1.3, [-0.68 + i * 0.45, 2.0, 0.15], [0.25, 0, 0], 0.02);
  if (p.goods) for (let i = 0; i < 6; i++) b.sphere(p.goods, 0.1, [-0.6 + i * 0.24, 0.88, 0.25 + (i % 2) * 0.15]);
});

registerSceneryTemplate('well', (b) => {
  b.cyl('#8a857a', 0.55, 0.6, 0.7, 10, [0, 0.35, 0]);
  b.cyl('#1a2a3a', 0.45, 0.45, 0.02, 10, [0, 0.66, 0], [0, 0, 0], 0);
  for (const x of [-0.5, 0.5]) b.box('#5a3d24', 0.08, 1.3, 0.08, [x, 1.0, 0]);
  b.cone('#7a3a2a', 0.8, 0.5, 4, [0, 1.85, 0], [0, Math.PI / 4, 0]);
});

registerSceneryTemplate('lamp', (b) => {
  b.cyl('#2e2e30', 0.04, 0.06, 2.2, 6, [0, 1.1, 0]);
  b.box('#ffe9a0', 0.2, 0.25, 0.2, [0, 2.25, 0], [0, 0, 0], 0);
  b.cone('#2e2e30', 0.18, 0.15, 4, [0, 2.45, 0], [0, Math.PI / 4, 0]);
});

registerSceneryTemplate('sign', (b) => {
  b.box('#5a3d24', 0.08, 1.2, 0.08, [0, 0.6, 0]);
  b.box('#8a6a40', 0.7, 0.35, 0.05, [0, 1.1, 0.05]);
});

registerSceneryTemplate('chest', (b, p) => {
  const c = p.color || '#6a4426';
  b.box(c, 0.8, 0.45, 0.55, [0, 0.23, 0]);
  b.box(shade(c, 1.1), 0.82, 0.18, 0.57, [0, 0.52, 0]);
  b.box('#c8b040', 0.1, 0.12, 0.04, [0, 0.42, 0.29]);
});

registerSceneryTemplate('cave_entrance', (b) => {
  b.dodeca('#5a544c', 0.9, [-0.9, 0.7, 0], [0.8, 1.2, 0.9], [0, 0.3, 0]);
  b.dodeca('#625b52', 0.9, [0.9, 0.7, 0], [0.8, 1.2, 0.9], [0, 0.8, 0]);
  b.dodeca('#575148', 1.0, [0, 1.6, 0], [1.4, 0.6, 0.9], [0.4, 0, 0]);
  b.box('#050404', 1.0, 1.3, 0.2, [0, 0.65, 0.3], [0, 0, 0], 0);
});

registerSceneryTemplate('rope', (b) => {
  b.dodeca('#5a544c', 0.4, [0, 0.2, 0], [1.2, 0.5, 1.2]);
  b.cyl('#c8a86a', 0.03, 0.03, 3, 4, [0, 1.6, 0]);
});

registerSceneryTemplate('log_balance', (b, p) => {
  const len = Math.max(p.w, p.h);
  b.cyl('#6b4a2b', 0.2, 0.2, len, 7, [0, 0.05, 0], [0, 0, Math.PI / 2]);
});

registerSceneryTemplate('pillar', (b, p) => {
  const c = p.color || '#b8b2a6';
  b.box(c, 0.6, 0.2, 0.6, [0, 0.1, 0]);
  b.cyl(c, 0.22, 0.25, 2.4, 8, [0, 1.3, 0]);
  b.box(c, 0.6, 0.2, 0.6, [0, 2.5, 0]);
  if (p.broken) b.box(c, 0.2, 0.2, 0.2, [0.4, 0.1, 0.3]);
});

registerSceneryTemplate('ruin', (b, p) => {
  const c = p.color || '#6e6860';
  b.box(c, 1, 0.6 + (p.h1 || 0.8), 1, [0, 0.3 + (p.h1 || 0.8) / 2 - 0.2, 0], [0, 0, 0.04], 0.15);
  b.box(shade(c, 0.85), 0.5, 0.3, 0.5, [0.3, 0.15, 0.6], [0.2, 0.4, 0.1]);
});

registerSceneryTemplate('gravestone', (b) => {
  b.box('#8a857a', 0.5, 0.7, 0.15, [0, 0.35, 0]);
  b.cyl('#8a857a', 0.25, 0.25, 0.15, 8, [0, 0.7, 0], [Math.PI / 2, 0, 0]);
});

registerSceneryTemplate('hay', (b) => {
  b.cyl('#d8b850', 0.4, 0.4, 0.8, 8, [0, 0.4, 0], [0, 0, Math.PI / 2], 0.12);
});

registerSceneryTemplate('stall_counter', (b) => { b.box('#7a5530', 1, 0.9, 1, [0, 0.45, 0]); });

registerSceneryTemplate('ditch', (b, p) => {
  const len = Math.max(p.w, p.h);
  const horiz = p.w >= p.h;
  for (let i = 0; i < len; i++) {
    const o = i - len / 2 + 0.5;
    const off = Math.sin(i * 2.3) * 0.1;
    for (const side of [-0.5, 0.5]) {
      const pos = horiz ? [o, 0.05, side + off] : [side + off, 0.05, o];
      b.dodeca(i % 3 ? '#4a4038' : '#5a5048', 0.22 + ((i * 7) % 5) * 0.03, pos, [1.4, 0.6, 1], [i, i * 0.5, 0], 0.15);
    }
  }
});

registerSceneryTemplate('portal', (b, p) => {
  const c = p.color || '#7a4ac8';
  b.box('#6e6860', 0.25, 2.4, 0.4, [-0.8, 1.2, 0]);
  b.box('#6e6860', 0.25, 2.4, 0.4, [0.8, 1.2, 0]);
  b.box('#6e6860', 1.85, 0.3, 0.4, [0, 2.4, 0]);
  b.box(c, 1.35, 2.1, 0.1, [0, 1.1, 0], [0, 0, 0], 0.2);
});

registerSceneryTemplate('obelisk', (b, p) => {
  const c = p.color || '#5a5a6a';
  b.box(c, 0.6, 2.6, 0.6, [0, 1.3, 0], [0, 0.2, 0]);
  b.cone(c, 0.42, 0.6, 4, [0, 2.9, 0], [0, Math.PI / 4 + 0.2, 0]);
  if (p.glow) b.box(p.glow, 0.62, 0.15, 0.62, [0, 2.0, 0], [0, 0.2, 0], 0);
});

// ------------------------------------------------------------------------------------------------
// Character rigs
// ------------------------------------------------------------------------------------------------
const characterTemplates = new Map();

/** fn(opts) -> rig {kind, root, parts, height, width}. See buildBiped for the parts contract. */
export function registerCharacterTemplate(name, fn) { characterTemplates.set(name, fn); }

const meshOf = (b) => { const m = new THREE.Mesh(b.build(), VC_MATERIAL); m.castShadow = true; return m; };
const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

/** Visual description of an equipped item: {shape, color, color2}. */
export function equipVisual(itemId) {
  const def = typeof itemId === 'string' ? getItem(itemId) : itemId;
  if (!def) return null;
  const m = def.model || {};
  let shape = m.shape;
  if (!shape) {
    const s = def.icon?.shape;
    const byIcon = { sword: 'sword', scimitar: 'scimitar', dagger: 'dagger', axe: 'axe', pickaxe: 'pickaxe', mace: 'mace', spear: 'spear', staff: 'staff', bow: 'bow', hammer: 'warhammer', helm: 'med_helm', fullhelm: 'full_helm', hood: 'hood', hat: 'wizard_hat', platebody: 'platebody', chainbody: 'chainbody', robe_top: 'robe_top', legs: 'platelegs', skirt: 'skirt', shield: 'kite', sq_shield: 'square', round_shield: 'round', boots: 'boots', gloves: 'gloves', cape: 'cape', amulet: 'amulet', ring: 'ring', arrow: 'arrows' };
    shape = byIcon[s] || (def.slot === 'weapon' ? 'sword' : def.slot);
  }
  return { shape, color: m.color || def.color || def.icon?.color || '#888', color2: m.color2 || def.icon?.color2 || null, twoHanded: !!def.twoHanded };
}

function buildWeapon(v) {
  const b = new GeoBuilder();
  const c = v.color, h = '#5a3d24', c2 = v.color2 || '#d8c060';
  switch (v.shape) {
    case 'dagger': b.box(c, 0.05, 0.3, 0.02, [0, 0.22, 0]); b.box(c2, 0.14, 0.04, 0.05, [0, 0.07, 0]); b.box(h, 0.04, 0.1, 0.04, [0, 0, 0]); break;
    case 'longsword': b.box(c, 0.06, 0.85, 0.02, [0, 0.52, 0]); b.box(c2, 0.24, 0.05, 0.06, [0, 0.08, 0]); b.box(h, 0.04, 0.16, 0.04, [0, -0.02, 0]); break;
    case 'twohanded': b.box(c, 0.1, 1.15, 0.025, [0, 0.7, 0]); b.box(c2, 0.36, 0.06, 0.07, [0, 0.1, 0]); b.box(h, 0.05, 0.3, 0.05, [0, -0.05, 0]); break;
    case 'scimitar':
      b.box(c, 0.07, 0.3, 0.02, [0, 0.2, 0]); b.box(c, 0.07, 0.3, 0.02, [0.04, 0.47, 0], [0, 0, -0.25]); b.box(c, 0.06, 0.18, 0.02, [0.1, 0.66, 0], [0, 0, -0.55]);
      b.box(c2, 0.16, 0.04, 0.05, [0, 0.06, 0]); b.box(h, 0.04, 0.12, 0.04, [0, -0.02, 0]); break;
    case 'axe': b.box(h, 0.05, 0.7, 0.05, [0, 0.25, 0]); b.box(c, 0.05, 0.2, 0.2, [0, 0.52, 0.1], [0.2, 0, 0]); break;
    case 'pickaxe': b.box(h, 0.05, 0.7, 0.05, [0, 0.25, 0]); b.cone(c, 0.05, 0.3, 4, [0, 0.58, 0.16], [Math.PI / 2, 0, 0]); b.cone(c, 0.05, 0.3, 4, [0, 0.58, -0.16], [-Math.PI / 2, 0, 0]); break;
    case 'mace': b.box(h, 0.05, 0.55, 0.05, [0, 0.2, 0]); b.add(new THREE.IcosahedronGeometry(0.11, 0), c, [0, 0.52, 0]); break;
    case 'warhammer': b.box(h, 0.05, 0.65, 0.05, [0, 0.25, 0]); b.box(c, 0.14, 0.14, 0.3, [0, 0.58, 0]); break;
    case 'spear': b.box(h, 0.04, 1.3, 0.04, [0, 0.4, 0]); b.cone(c, 0.06, 0.25, 4, [0, 1.15, 0]); break;
    case 'staff': b.cyl(h, 0.03, 0.035, 1.3, 5, [0, 0.35, 0]); b.add(new THREE.IcosahedronGeometry(0.08, 0), c, [0, 1.05, 0]); break;
    case 'bow': {
      const t = new THREE.TorusGeometry(0.42, 0.025, 4, 10, Math.PI * 0.9);
      b.add(t, c, [0, 0, -0.1], [0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.05], 1);
      b.box('#e8e4d8', 0.01, 0.8, 0.01, [0, 0, -0.08]);
      break;
    }
    default: b.box(c, 0.05, 0.6, 0.02, [0, 0.38, 0]); b.box(c2, 0.2, 0.04, 0.05, [0, 0.08, 0]); b.box(h, 0.04, 0.12, 0.04, [0, 0, 0]);
  }
  return meshOf(b);
}

function buildShield(v) {
  const b = new GeoBuilder();
  const c = v.color, c2 = v.color2 || shade(v.color, 0.7);
  if (v.shape === 'round') { b.cyl(c, 0.26, 0.26, 0.05, 10, [0, 0, 0], [0, 0, Math.PI / 2]); b.sphere(c2, 0.06, [-0.03, 0, 0]); }
  else if (v.shape === 'square') { b.box(c, 0.05, 0.5, 0.45, [0, 0, 0]); b.box(c2, 0.06, 0.08, 0.47, [0, 0.15, 0]); }
  else { // kite
    b.box(c, 0.05, 0.45, 0.42, [0, 0.08, 0]);
    b.add(new THREE.ConeGeometry(0.3, 0.35, 4), c, [0, -0.3, 0], [Math.PI, Math.PI / 4, 0], [1, 1, 0.17]);
    b.box(c2, 0.06, 0.6, 0.06, [-0.01, 0, 0]);
  }
  return meshOf(b);
}

/**
 * Biped (humanoid) rig. opts:
 *  colors {skin, hair, top, legs, boots, hands, eyes, belt}, hairStyle, female, scale,
 *  proportions {legLen, torsoW, torsoH, headS, armLen, limbW}, equipment {slot: itemId|visual},
 *  extras {horns, wings, tail, ears, nose, beard, bones (skeleton), glowEyes}
 * parts: body, torso, head, armL, armR, legL, legR, handR (weapon mount), handL (bow mount),
 *        shieldMount, cape
 */
export function buildBiped(opts = {}) {
  const C = { skin: '#d9a77a', hair: '#4a2f1b', top: '#7a3b2e', legs: '#3b4a6b', boots: '#3a2a1c', hands: null, eyes: '#1a1a1a', belt: '#4a3420', ...(opts.colors || {}) };
  const P = { legLen: 0.6, torsoW: 0.44, torsoH: 0.52, torsoD: 0.25, headS: 0.27, armLen: 0.5, limbW: 0.13, ...(opts.proportions || {}) };
  if (opts.female) { P.torsoW *= 0.9; }
  const X = opts.extras || {};
  const eq = {};
  for (const [slot, v] of Object.entries(opts.equipment || {})) eq[slot] = typeof v === 'string' ? equipVisual(v) : v;

  const root = new THREE.Group();
  const scaleG = pivot(root, 0, 0, 0);
  scaleG.scale.setScalar(opts.scale || 1);
  const body = pivot(scaleG, 0, P.legLen, 0);

  // legs
  const legColor = eq.legs?.color || C.legs;
  const legs = [];
  for (const side of [-1, 1]) {
    const lp = pivot(body, side * P.torsoW * 0.25, 0, 0);
    const b = new GeoBuilder();
    if (X.bones) { b.box(C.skin, 0.06, P.legLen * 0.9, 0.06, [0, -P.legLen / 2, 0]); }
    else b.box(legColor, P.limbW + 0.02, P.legLen - 0.08, P.limbW + 0.04, [0, -P.legLen / 2 + 0.02, 0]);
    if (eq.legs?.shape === 'platelegs') b.box(shade(legColor, 1.15), P.limbW + 0.05, 0.1, P.limbW + 0.07, [0, -P.legLen * 0.5, 0.0]);
    b.box(eq.feet?.color || C.boots, P.limbW + 0.03, 0.1, P.limbW + 0.12, [0, -P.legLen + 0.05, 0.03]);
    lp.add(meshOf(b));
    legs.push(lp);
  }

  // torso
  const torso = pivot(body, 0, 0, 0);
  {
    const b = new GeoBuilder();
    const topC = eq.body?.color || C.top;
    if (X.bones) {
      b.box(C.skin, 0.08, P.torsoH, 0.08, [0, P.torsoH / 2, -0.04]);
      for (let i = 0; i < 4; i++) b.box(C.skin, P.torsoW * 0.8, 0.04, P.torsoD * 0.7, [0, P.torsoH * 0.4 + i * 0.09, 0]);
      b.box(C.skin, P.torsoW * 0.7, 0.12, P.torsoD * 0.6, [0, 0.04, 0]);
    } else {
      b.box(topC, P.torsoW, P.torsoH, P.torsoD, [0, P.torsoH / 2, 0], [0, 0, 0], 0.06);
      b.box(eq.legs?.color && eq.legs.shape === 'skirt' ? eq.legs.color : C.belt, P.torsoW + 0.02, 0.07, P.torsoD + 0.02, [0, 0.04, 0]);
      if (eq.body?.shape === 'platebody') {
        b.box(shade(topC, 1.15), P.torsoW + 0.04, P.torsoH * 0.55, P.torsoD + 0.04, [0, P.torsoH * 0.68, 0.0]);
        b.box(shade(topC, 0.85), 0.06, P.torsoH * 0.5, 0.02, [0, P.torsoH * 0.5, P.torsoD / 2 + 0.02]);
      } else if (eq.body?.shape === 'chainbody') {
        b.box(shade(topC, 0.9), P.torsoW + 0.02, P.torsoH * 0.3, P.torsoD + 0.02, [0, P.torsoH * 0.2, 0]);
      } else if (eq.body?.shape === 'robe_top') {
        b.box(shade(topC, 1.2), 0.08, P.torsoH, 0.02, [0, P.torsoH / 2, P.torsoD / 2 + 0.01]);
      }
      if (eq.legs?.shape === 'skirt' || eq.legs?.shape === 'robe') {
        b.add(new THREE.CylinderGeometry(P.torsoW * 0.55, P.torsoW * 0.75, P.legLen * 0.75, 8), eq.legs.color, [0, -P.legLen * 0.35, 0], [0, Math.PI / 8, 0], [1, 1, 0.75]);
      }
      if (eq.neck) b.add(new THREE.TorusGeometry(0.09, 0.015, 3, 8), eq.neck.color, [0, P.torsoH - 0.06, P.torsoD / 2 + 0.01], [0.3, 0, 0], 1, 0);
      if (opts.female && !eq.body) b.box(topC, P.torsoW * 0.8, 0.12, 0.06, [0, P.torsoH * 0.68, P.torsoD / 2 + 0.02]);
    }
    if (X.wings) {
      for (const side of [-1, 1]) {
        b.add(new THREE.ConeGeometry(0.5, 1.1, 3), X.wingColor || '#3a1a1a', [side * 0.55, P.torsoH * 0.8, -0.25], [0, 0, side * 1.1], [1, 1, 0.12]);
      }
    }
    if (X.tail) b.cone(X.tailColor || C.skin, 0.06, 0.7, 4, [0, 0.0, -0.4], [-1.9, 0, 0]);
    torso.add(meshOf(b));
  }

  // head
  const head = pivot(torso, 0, P.torsoH + 0.02, 0);
  {
    const b = new GeoBuilder();
    const s = P.headS;
    b.box(C.skin, 0.1, 0.06, 0.1, [0, 0.0, 0]); // neck
    if (X.bones) {
      b.box(C.skin, s * 0.9, s * 0.85, s, [0, s * 0.55, 0]);
      b.box('#111', s * 0.25, s * 0.2, 0.02, [-s * 0.2, s * 0.6, s / 2]);
      b.box('#111', s * 0.25, s * 0.2, 0.02, [s * 0.2, s * 0.6, s / 2]);
      b.box(shade(C.skin, 0.85), s * 0.6, s * 0.2, s * 0.6, [0, s * 0.12, 0.05]);
    } else {
      b.box(C.skin, s, s, s, [0, s * 0.55, 0], [0, 0, 0], 0.05);
      const eyeC = X.glowEyes || C.eyes;
      b.box(eyeC, s * 0.16, s * 0.12, 0.02, [-s * 0.22, s * 0.6, s / 2 + 0.005], [0, 0, 0], 0);
      b.box(eyeC, s * 0.16, s * 0.12, 0.02, [s * 0.22, s * 0.6, s / 2 + 0.005], [0, 0, 0], 0);
      if (X.nose) b.cone(C.skin, 0.04, X.nose, 4, [0, s * 0.45, s / 2 + X.nose / 2], [Math.PI / 2, 0, 0]);
      if (X.ears) for (const sd of [-1, 1]) b.cone(C.skin, 0.05, 0.2, 4, [sd * (s / 2 + 0.07), s * 0.62, 0], [0, 0, -sd * 1.3]);
      if (X.horns) for (const sd of [-1, 1]) b.cone(X.hornColor || '#e8e0c8', 0.05, 0.25, 5, [sd * s * 0.35, s * 1.15, 0], [0, 0, -sd * 0.4]);
      if (X.beard) b.box(C.hair, s * 0.8, s * 0.35, 0.08, [0, s * 0.18, s / 2 + 0.03]);
      const helm = eq.head;
      if (!helm || helm.shape === 'wizard_hat' || helm.shape === 'med_helm') {
        if (opts.hairStyle !== 'bald') {
          b.box(C.hair, s + 0.03, s * 0.25, s + 0.03, [0, s * 0.98, -0.005]);
          b.box(C.hair, s + 0.03, s * 0.5, 0.06, [0, s * 0.7, -s / 2 - 0.01]);
          if (opts.hairStyle === 'long' || opts.female) b.box(C.hair, s + 0.02, s * 0.9, 0.08, [0, s * 0.35, -s / 2 - 0.03]);
        }
      }
      if (helm) {
        const hc = helm.color;
        switch (helm.shape) {
          case 'full_helm':
            b.box(hc, s + 0.06, s + 0.06, s + 0.06, [0, s * 0.57, 0], [0, 0, 0], 0.04);
            b.box('#111', s * 0.75, 0.04, 0.02, [0, s * 0.62, s / 2 + 0.035], [0, 0, 0], 0);
            b.box(shade(hc, 1.2), 0.04, s * 0.3, s + 0.1, [0, s * 1.15, 0]);
            break;
          case 'wizard_hat':
            b.cyl(hc, s * 0.85, s * 0.85, 0.03, 10, [0, s * 1.08, 0]);
            b.cone(hc, s * 0.5, s * 1.4, 8, [0, s * 1.75, -0.04], [-0.15, 0, 0]);
            break;
          case 'hood':
            b.box(hc, s + 0.06, s + 0.06, s + 0.04, [0, s * 0.6, -0.02]);
            b.cone(hc, s * 0.4, s * 0.5, 4, [0, s * 0.9, -s * 0.5], [-1.0, Math.PI / 4, 0]);
            b.box(C.skin, s * 0.7, s * 0.55, 0.03, [0, s * 0.5, s / 2 + 0.01], [0, 0, 0], 0);
            break;
          case 'coif':
            b.box(hc, s + 0.05, s * 0.75, s + 0.05, [0, s * 0.75, -0.01]);
            break;
          default: // med_helm
            b.cyl(hc, s * 0.58, s * 0.66, s * 0.45, 8, [0, s * 1.0, 0], [0, Math.PI / 8, 0]);
            b.box(hc, 0.04, s * 0.4, 0.04, [0, s * 0.6, s / 2 + 0.03]);
        }
      }
    }
    head.add(meshOf(b));
  }

  // arms
  const arms = [];
  const sleeve = eq.body?.color || C.top;
  for (const side of [-1, 1]) {
    const ap = pivot(torso, side * (P.torsoW / 2 + P.limbW / 2 + 0.01), P.torsoH - 0.06, 0);
    const b = new GeoBuilder();
    if (X.bones) b.box(C.skin, 0.05, P.armLen, 0.05, [0, -P.armLen / 2, 0]);
    else {
      b.box(sleeve, P.limbW, P.armLen * 0.55, P.limbW + 0.01, [0, -P.armLen * 0.27, 0]);
      b.box(eq.body?.shape === 'platebody' || eq.body?.shape === 'chainbody' ? shade(sleeve, 0.9) : C.skin, P.limbW - 0.01, P.armLen * 0.45, P.limbW, [0, -P.armLen * 0.75, 0]);
      if (eq.body?.shape === 'platebody') b.box(shade(sleeve, 1.2), P.limbW + 0.08, 0.12, P.limbW + 0.1, [side * 0.02, 0.0, 0]);
    }
    b.box(eq.hands?.color || C.hands || C.skin, P.limbW + 0.01, 0.1, P.limbW + 0.02, [0, -P.armLen - 0.03, 0]);
    ap.add(meshOf(b));
    arms.push(ap);
  }
  const handR = pivot(arms[1], 0, -P.armLen - 0.03, 0.02);
  const handL = pivot(arms[0], 0, -P.armLen - 0.03, 0.02);
  const shieldMount = pivot(arms[0], -P.limbW / 2 - 0.05, -P.armLen * 0.6, 0.05);

  if (eq.weapon) {
    if (eq.weapon.shape === 'bow') {
      const w = buildWeapon(eq.weapon);
      w.rotation.set(0, 0, 0);
      handL.add(w);
    } else {
      const w = buildWeapon(eq.weapon);
      w.rotation.x = Math.PI / 2 - 0.25;
      handR.add(w);
    }
  }
  if (eq.shield) shieldMount.add(buildShield(eq.shield));

  let cape = null;
  if (eq.cape) {
    cape = pivot(torso, 0, P.torsoH - 0.02, -P.torsoD / 2 - 0.02);
    const b = new GeoBuilder();
    b.box(eq.cape.color, P.torsoW + 0.06, P.torsoH + P.legLen * 0.75, 0.03, [0, -(P.torsoH + P.legLen * 0.75) / 2, 0]);
    if (eq.cape.color2) b.box(eq.cape.color2, P.torsoW * 0.3, P.torsoH * 0.3, 0.035, [0, -P.torsoH * 0.5, -0.005]);
    cape.add(meshOf(b));
  }

  const height = (P.legLen + P.torsoH + P.headS + 0.1) * (opts.scale || 1);
  return {
    kind: 'biped', root, height, width: (P.torsoW + 0.3) * (opts.scale || 1),
    parts: { scaleG, body, torso, head, armL: arms[0], armR: arms[1], legL: legs[0], legR: legs[1], handR, handL, shieldMount, cape },
    legLen: P.legLen, zombie: !!X.zombie, flying: !!X.flying,
  };
}

/** Four-legged creature rig. opts: colors {body, belly, head, legs, horn, spots}, scale, len, neck, horns, wings, tail, snout, ears, spikes */
export function buildQuad(opts = {}) {
  const C = { body: '#8a6a4a', belly: null, head: null, legs: null, horn: '#e8e0c8', spots: null, eyes: '#111', ...(opts.colors || {}) };
  C.head = C.head || C.body; C.legs = C.legs || C.body;
  const L = opts.len ?? 0.9, H = opts.bodyH ?? 0.45, Wd = opts.bodyW ?? 0.42, legLen = opts.legLen ?? 0.45;
  const root = new THREE.Group();
  const scaleG = pivot(root, 0, 0, 0);
  scaleG.scale.setScalar(opts.scale || 1);
  const body = pivot(scaleG, 0, legLen + H / 2, 0);
  {
    const b = new GeoBuilder();
    b.box(C.body, Wd, H, L, [0, 0, 0], [0, 0, 0], 0.08);
    if (C.belly) b.box(C.belly, Wd * 0.8, 0.05, L * 0.7, [0, -H / 2 - 0.01, 0]);
    if (C.spots) for (let i = 0; i < 4; i++) b.box(C.spots, 0.02 + Wd * 1.01, H * 0.35, L * 0.2, [0, H * (0.1 - (i % 2) * 0.2), -L * 0.3 + i * L * 0.2]);
    if (opts.spikes) for (let i = 0; i < 5; i++) b.cone(opts.spikes, 0.06, 0.2, 4, [0, H / 2 + 0.08, -L * 0.4 + i * L * 0.2]);
    if (opts.wings) for (const sd of [-1, 1]) b.add(new THREE.ConeGeometry(0.9, 1.4, 3), opts.wings, [sd * (Wd / 2 + 0.6), H * 0.6, 0], [0, 0, sd * 1.25], [1, 1, 0.1]);
    if (opts.hump) b.box(C.body, Wd * 0.8, 0.12, L * 0.3, [0, H / 2 + 0.05, L * 0.25]);
    body.add(meshOf(b));
  }
  // head
  const neckLen = opts.neck ?? 0.1;
  const head = pivot(body, 0, H * 0.3 + neckLen * 0.6, L / 2 + neckLen * 0.6);
  {
    const b = new GeoBuilder();
    const hs = opts.headS ?? 0.3;
    if (neckLen > 0.15) b.box(C.head, hs * 0.6, neckLen, hs * 0.6, [0, -neckLen * 0.3, -neckLen * 0.35], [0.7, 0, 0]);
    b.box(C.head, hs, hs, hs * 1.1, [0, 0.05, hs * 0.4]);
    const sn = opts.snout ?? 0.15;
    b.box(opts.snoutColor || shade(C.head, 0.9), hs * 0.7, hs * 0.55, sn, [0, -0.02, hs * 0.95 + sn / 2 - 0.05]);
    b.box(C.eyes, 0.05, 0.05, 0.02, [-hs * 0.32, hs * 0.25, hs * 0.96], [0, 0, 0], 0);
    b.box(C.eyes, 0.05, 0.05, 0.02, [hs * 0.32, hs * 0.25, hs * 0.96], [0, 0, 0], 0);
    if (opts.horns) for (const sd of [-1, 1]) b.cone(C.horn, 0.05, opts.horns, 5, [sd * hs * 0.45, hs * 0.55, hs * 0.2], [-0.4, 0, -sd * 0.7]);
    if (opts.ears) for (const sd of [-1, 1]) b.cone(C.head, 0.06, opts.ears, 4, [sd * hs * 0.35, hs * 0.6, hs * 0.1], [0, 0, -sd * 0.3]);
    head.add(meshOf(b));
  }
  // legs
  const legs = [];
  const lw = opts.legW ?? 0.12;
  const pos = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
  pos.forEach(([sx, sz], i) => {
    const lp = pivot(body, sx * (Wd / 2 - lw / 2), -H / 2 + 0.05, sz * (L / 2 - lw));
    const b = new GeoBuilder();
    b.box(C.legs, lw, legLen + 0.05, lw, [0, -legLen / 2, 0]);
    b.box(opts.hoof || shade(C.legs, 0.6), lw + 0.01, 0.06, lw + 0.02, [0, -legLen + 0.02, 0.01]);
    lp.add(meshOf(b));
    legs.push({ pivot: lp, phase: i === 0 || i === 3 ? 0 : Math.PI });
  });
  // tail
  let tail = null;
  if (opts.tail) {
    tail = pivot(body, 0, H * 0.2, -L / 2);
    const b = new GeoBuilder();
    b.cone(opts.tailColor || C.body, 0.05 + (opts.tailW || 0), opts.tail, 4, [0, 0, -opts.tail / 2], [-Math.PI / 2 - 0.4, 0, 0]);
    tail.add(meshOf(b));
  }
  const s = opts.scale || 1;
  return { kind: 'quad', root, height: (legLen + H + 0.3) * s, width: Math.max(Wd, L) * s, parts: { scaleG, body, head, legs, tail }, legLen, bodyY: legLen + H / 2 };
}

function buildSpider(opts = {}) {
  const C = { body: '#2a2420', abdomen: null, legs: null, eyes: '#c02020', ...(opts.colors || {}) };
  const root = new THREE.Group();
  const scaleG = pivot(root, 0, 0, 0);
  scaleG.scale.setScalar(opts.scale || 1);
  const body = pivot(scaleG, 0, 0.3, 0);
  {
    const b = new GeoBuilder();
    b.sphere(C.body, 0.18, [0, 0, 0.12], [1, 0.7, 1.1]);
    b.sphere(C.abdomen || C.body, 0.27, [0, 0.08, -0.25], [1, 0.8, 1.2]);
    if (opts.marking) b.box(opts.marking, 0.12, 0.02, 0.2, [0, 0.29, -0.25], [0, 0, 0], 0);
    for (const sd of [-1, 1]) b.box(C.eyes, 0.04, 0.04, 0.02, [sd * 0.06, 0.06, 0.3], [0, 0, 0], 0);
    body.add(meshOf(b));
  }
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const sd = i < 4 ? -1 : 1, k = i % 4;
    const lp = pivot(body, sd * 0.12, 0, 0.2 - k * 0.12);
    lp.rotation.y = sd * (0.3 - k * 0.35) * -1 + (sd < 0 ? Math.PI : 0);
    const b = new GeoBuilder();
    b.box(C.legs || C.body, 0.4, 0.04, 0.04, [0.2, 0.08, 0], [0, 0, 0.5]);
    b.box(C.legs || C.body, 0.04, 0.4, 0.04, [0.4, -0.08, 0], [0, 0, 0.35]);
    lp.add(meshOf(b));
    legs.push({ pivot: lp, phase: (i % 2) * Math.PI + k * 0.5, side: sd });
  }
  return { kind: 'spider', root, height: 0.55 * (opts.scale || 1), width: 0.9 * (opts.scale || 1), parts: { scaleG, body, legs } };
}

function buildBird(opts = {}) {
  const C = { body: '#f2efe6', comb: '#d02020', beak: '#e8b030', legs: '#e8b030', ...(opts.colors || {}) };
  const root = new THREE.Group();
  const scaleG = pivot(root, 0, 0, 0);
  scaleG.scale.setScalar(opts.scale || 1);
  const body = pivot(scaleG, 0, 0.32, 0);
  {
    const b = new GeoBuilder();
    b.sphere(C.body, 0.2, [0, 0, 0], [0.85, 0.85, 1.15]);
    b.cone(C.body, 0.12, 0.25, 4, [0, 0.1, -0.22], [-0.9, 0, 0]);
    for (const sd of [-1, 1]) b.box(shade(C.body, 0.9), 0.04, 0.16, 0.25, [sd * 0.17, 0.0, -0.02]);
    body.add(meshOf(b));
  }
  const head = pivot(body, 0, 0.12, 0.17);
  {
    const b = new GeoBuilder();
    b.sphere(C.body, 0.1, [0, 0.08, 0.03]);
    b.cone(C.beak, 0.035, 0.1, 4, [0, 0.07, 0.15], [Math.PI / 2, 0, 0]);
    b.box(C.comb, 0.03, 0.08, 0.12, [0, 0.19, 0.02]);
    b.box(C.comb, 0.03, 0.06, 0.03, [0, 0.0, 0.11]);
    for (const sd of [-1, 1]) b.box('#111', 0.02, 0.025, 0.025, [sd * 0.08, 0.1, 0.07], [0, 0, 0], 0);
    head.add(meshOf(b));
  }
  const legs = [];
  for (const sd of [-1, 1]) {
    const lp = pivot(body, sd * 0.07, -0.12, 0);
    const b = new GeoBuilder();
    b.box(C.legs, 0.025, 0.2, 0.025, [0, -0.1, 0]);
    b.box(C.legs, 0.08, 0.02, 0.1, [0, -0.2, 0.03]);
    lp.add(meshOf(b));
    legs.push({ pivot: lp, phase: sd > 0 ? 0 : Math.PI });
  }
  return { kind: 'bird', root, height: 0.6 * (opts.scale || 1), width: 0.5 * (opts.scale || 1), parts: { scaleG, body, head, legs } };
}

function buildBat(opts = {}) {
  const C = { body: '#3a2e2a', wing: '#2a201e', eyes: '#e04040', ...(opts.colors || {}) };
  const root = new THREE.Group();
  const scaleG = pivot(root, 0, 0, 0);
  scaleG.scale.setScalar(opts.scale || 1);
  const body = pivot(scaleG, 0, 1.1, 0);
  {
    const b = new GeoBuilder();
    b.sphere(C.body, 0.13, [0, 0, 0], [1, 1.1, 1]);
    b.sphere(C.body, 0.09, [0, 0.13, 0.06]);
    for (const sd of [-1, 1]) {
      b.cone(C.body, 0.03, 0.09, 3, [sd * 0.05, 0.24, 0.05]);
      b.box(C.eyes, 0.025, 0.025, 0.02, [sd * 0.035, 0.15, 0.15], [0, 0, 0], 0);
    }
    body.add(meshOf(b));
  }
  const wings = [];
  for (const sd of [-1, 1]) {
    const wp = pivot(body, sd * 0.1, 0.02, 0);
    const b = new GeoBuilder();
    b.add(new THREE.ConeGeometry(0.22, 0.5, 3), C.wing, [sd * 0.28, 0, 0], [0, 0, sd * Math.PI / 2], [1, 1, 0.12]);
    wp.add(meshOf(b));
    wings.push({ pivot: wp, side: sd });
  }
  return { kind: 'bat', root, height: 1.3 * (opts.scale || 1), width: 0.6, parts: { scaleG, body, wings }, flying: true };
}

// Template table ------------------------------------------------------------------------------------
registerCharacterTemplate('human', (o) => buildBiped(o));
registerCharacterTemplate('goblin', (o) => buildBiped({
  ...o, scale: (o.scale || 1) * 0.78,
  colors: { skin: '#6a9a3a', top: '#6a4a2a', legs: '#4a3a2a', hair: '#2a2a1a', ...(o.colors || {}) },
  proportions: { headS: 0.32, legLen: 0.5 }, hairStyle: 'bald', extras: { ears: true, nose: 0.12, ...(o.extras || {}) },
}));
registerCharacterTemplate('imp', (o) => buildBiped({
  ...o, scale: (o.scale || 1) * 0.6,
  colors: { skin: '#b83a2a', top: '#b83a2a', legs: '#9a2a1a', boots: '#4a1a10', ...(o.colors || {}) },
  hairStyle: 'bald', extras: { horns: true, tail: true, ears: true, tailColor: '#b83a2a', ...(o.extras || {}) },
}));
registerCharacterTemplate('skeleton', (o) => buildBiped({
  ...o, colors: { skin: '#e6e0cc', ...(o.colors || {}) }, hairStyle: 'bald', extras: { bones: true, ...(o.extras || {}) },
}));
registerCharacterTemplate('zombie', (o) => buildBiped({
  ...o, colors: { skin: '#7a9070', top: '#4a4038', legs: '#3a3430', hair: '#2a2a20', eyes: '#d0d040', ...(o.colors || {}) },
  hairStyle: 'short', extras: { zombie: true, ...(o.extras || {}) },
}));
registerCharacterTemplate('giant', (o) => buildBiped({
  ...o, scale: (o.scale || 1) * 1.9,
  colors: { skin: '#c8946a', top: '#c8946a', legs: '#6a4a2a', hair: '#5a3a1a', ...(o.colors || {}) },
  extras: { beard: true, ...(o.extras || {}) },
}));
registerCharacterTemplate('demon', (o) => buildBiped({
  ...o, scale: (o.scale || 1) * 1.6,
  colors: { skin: '#8a1e1a', top: '#8a1e1a', legs: '#6a1410', boots: '#2a0a08', hands: '#2a0a08', eyes: '#ffd040', ...(o.colors || {}) },
  hairStyle: 'bald', extras: { horns: true, wings: true, tail: true, tailColor: '#6a1410', wingColor: '#3a0a08', hornColor: '#2a2420', ...(o.extras || {}) },
}));
registerCharacterTemplate('golem', (o) => buildBiped({
  ...o, scale: (o.scale || 1) * 1.4,
  colors: { skin: '#7a756c', top: '#6a655c', legs: '#6a655c', boots: '#5a554c', eyes: '#60e0ff', ...(o.colors || {}) },
  proportions: { torsoW: 0.62, torsoD: 0.4, limbW: 0.2, headS: 0.26 }, hairStyle: 'bald', extras: { glowEyes: '#60e0ff', ...(o.extras || {}) },
}));
registerCharacterTemplate('cow', (o) => buildQuad({
  len: 1.1, bodyH: 0.55, bodyW: 0.5, legLen: 0.45, headS: 0.32, horns: 0.15, ears: 0.1, tail: 0.5, ...o,
  colors: { body: '#f0ece2', spots: '#2a2622', head: '#f0ece2', snout: '#e8b0a0', ...(o.colors || {}) }, snoutColor: '#d8a090',
}));
registerCharacterTemplate('wolf', (o) => buildQuad({
  len: 0.9, bodyH: 0.35, bodyW: 0.3, legLen: 0.42, headS: 0.25, snout: 0.2, ears: 0.14, tail: 0.5, ...o,
  colors: { body: '#6a6660', belly: '#a8a49c', ...(o.colors || {}) },
}));
registerCharacterTemplate('rat', (o) => buildQuad({
  len: 0.55, bodyH: 0.22, bodyW: 0.22, legLen: 0.1, legW: 0.06, headS: 0.16, snout: 0.12, ears: 0.06, tail: 0.6, tailW: -0.03, ...o,
  colors: { body: '#6a5a4a', snout: '#d8a090', ...(o.colors || {}) }, snoutColor: '#c89080',
}));
registerCharacterTemplate('dragon', (o) => buildQuad({
  len: 2.2, bodyH: 0.9, bodyW: 0.9, legLen: 0.7, legW: 0.25, headS: 0.55, snout: 0.45, neck: 0.8, horns: 0.4, tail: 1.8, tailW: 0.15, ...o,
  colors: { body: '#3a7a2a', belly: '#c8b86a', horn: '#e8e0c8', eyes: '#ffd020', ...(o.colors || {}) },
  wings: o.wings || shade((o.colors && o.colors.body) || '#3a7a2a', 0.7), spikes: '#2a2a2a',
}));
registerCharacterTemplate('spider', (o) => buildSpider(o));
registerCharacterTemplate('chicken', (o) => buildBird(o));
registerCharacterTemplate('bat', (o) => buildBat(o));

/**
 * Build a character rig from an npc model description ({template, colors, scale, equipment, ...})
 * or a player appearance ({template:'human', colors..., equipment}).
 */
export function buildCharacter(model) {
  const fn = characterTemplates.get(model.template) || characterTemplates.get('human');
  const rig = fn({ ...model });
  // invisible hitbox for picking
  const hb = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.6, rig.width), Math.max(0.5, rig.height), Math.max(0.6, rig.width)), new THREE.MeshBasicMaterial({ visible: false }));
  hb.position.y = rig.height / 2 + (rig.flying ? 0.6 : 0);
  rig.root.add(hb);
  rig.hitbox = hb;
  return rig;
}
