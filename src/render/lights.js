// Pooled point lights + glow halos for light-emitting scenery (lamps, torches, braziers, fires, forges,
// glowing crystals, lava).
//
// A fixed pool of real PointLights (8 high quality / 4 otherwise; a fixed count means no shader
// recompiles) is assigned every few frames to the light sources nearest the camera focus. Every source
// within ~40 tiles also gets an additive halo sprite (one Points draw call) which reads as bloom at night.
// Sources come from scenery templates (LIGHT_TEMPLATES), PointLights found inside animated scenery
// (stripped and re-registered here), lava pools, and transient flashes (spell impacts, level-ups).

import * as THREE from 'three';
import { GLOBAL, POINT_SCALE } from './materials.js';

const FIRE = '#ff8a30', LAMP = '#ffd890';
/** template -> light description. x/z are local offsets (rotated with the object), y height. */
export const LIGHT_TEMPLATES = {
  lamp: { y: 2.25, color: LAMP, i: 7, range: 9, halo: 1.4 },
  dec_lantern_post: { x: 0.5, y: 2.03, color: (m) => m.glow || '#ffe08a', i: 7, range: 9, halo: 1.3 },
  dec_torch_stake: { y: 1.75, color: '#ff9a40', i: 6, range: 8, flicker: 1, halo: 1.1 },
  dec_brazier: { y: 1.2, color: (m) => m.flame || FIRE, i: 9, range: 10, flicker: 1, halo: 1.8 },
  q_brazier: { y: 1.45, color: FIRE, i: 9, range: 10, flicker: 1, halo: 1.8, when: (m) => !!m.lit },
  dec_candles: { y: (m) => (m.tall ? 1.52 : 1.12), color: '#ffc860', i: 2.5, range: 5, flicker: 0.5, halo: 0.7 },
  dec_fireplace: { y: 0.4, z: 0.25, color: FIRE, i: 6, range: 7, flicker: 1, halo: 1.0 },
  furnace: { y: 0.55, z: 0.95, color: '#ff7a20', i: 8, range: 8, flicker: 0.6, halo: 1.4 },
  range: { y: 0.4, z: 0.5, color: '#ff6a20', i: 3, range: 5, flicker: 0.6, halo: 0.6 },
  dec_forge_hearth: { y: 1.1, color: '#ff6a20', i: 9, range: 9, flicker: 0.6, halo: 1.6 },
  firepit: { y: 0.45, color: FIRE, i: 7, range: 8, flicker: 1, halo: 1.3 },
  fire: { y: 0.5, color: FIRE, i: 7, range: 8, flicker: 1, halo: 1.3 },
  dec_campfire: { y: 0.5, color: (m) => m.lightColor || FIRE, i: 8, range: 9, flicker: 1, halo: 1.5 },
  dec_crystal_lamp: { y: 1.95, color: (m) => m.glow || '#8ad8f0', i: 5, range: 8, halo: 1.2 },
  dec_moonwell: { y: 1.3, color: (m) => m.glow || '#8ad8f0', i: 6, range: 9, halo: 2.0 },
  obelisk: { y: 2.0, color: (m) => m.glow, i: 4, range: 7, halo: 1.2, when: (m) => !!m.glow },
  portal: { y: 1.1, color: (m) => m.color || '#7a4ac8', i: 5, range: 7, halo: 2.2 },
  dec_shrine: { y: 1.0, color: (m) => m.glow, i: 3, range: 6, halo: 1.0, when: (m) => !!m.glow },
};

const val = (v, m) => (typeof v === 'function' ? v(m) : v);
const CELL = 16;
const _c = new THREE.Color();

export class LightManager {
  constructor(rm, count = 8) {
    this.rm = rm;
    this.scene = rm.scene;
    this.sources = new Set();
    this.grid = new Map();
    this.flashes = [];
    this.pool = [];
    this.setCount(count);
    this._acc = 1;
    this.near = [];

    // halos
    const MAX = 160;
    this.haloMax = MAX;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    g.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAX), 1));
    g.setAttribute('phase', new THREE.BufferAttribute(new Float32Array(MAX), 1));
    g.setDrawRange(0, 0);
    this.haloUniforms = { uPx: POINT_SCALE, uTime: GLOBAL.uTime, uK: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.haloUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: `attribute float size; attribute float phase; uniform float uPx; uniform float uTime; uniform float uK;
        varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          float fl = 1.0 - phase * (0.12 + 0.12 * sin(uTime * 11.0 + position.x * 7.0) * sin(uTime * 7.3 + position.z * 5.0));
          gl_PointSize = size * fl * uPx / -mv.z; vC = color; vA = uK * fl * (1.0 - smoothstep(35.0, 70.0, -mv.z)); }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.4);
          gl_FragColor = vec4(vC * a * vA, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.halos = new THREE.Points(g, m);
    this.halos.frustumCulled = false;
    this.halos.renderOrder = 5;
    this.scene.add(this.halos);
  }

  setCount(n) {
    for (const l of this.pool) this.scene.remove(l.light);
    this.pool = [];
    for (let i = 0; i < n; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 10, 1.7);
      light.castShadow = false;
      this.scene.add(light);
      this.pool.push({ light, src: null, fade: 0 });
    }
    this._acc = 1;
  }

  key(x, z) { return `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`; }

  add(src) {
    src.color = src.color instanceof THREE.Color ? src.color : new THREE.Color(src.color || LAMP);
    src.phase = src.phase ?? Math.random() * 10;
    const k = this.key(src.x, src.z);
    let cell = this.grid.get(k);
    if (!cell) this.grid.set(k, cell = new Set());
    cell.add(src);
    src._cell = cell;
    this.sources.add(src);
    this._acc = 1;
    return src;
  }

  remove(src) {
    if (!src || !this.sources.has(src)) return;
    this.sources.delete(src);
    src._cell?.delete(src);
    for (const p of this.pool) if (p.src === src) { p.src = null; p.light.intensity = 0; }
    this._acc = 1;
  }

  /** Light source for a world object (template table), or null. pos = object centre {x, y, z}, rot quarter turns. */
  addForObject(o, model, pos, rot) {
    const L = LIGHT_TEMPLATES[model.template];
    if (!L || (L.when && !L.when(model))) return null;
    const col = val(L.color, model);
    if (!col) return null;
    const lx = L.x || 0, lz = L.z || 0, th = -rot * Math.PI / 2;
    const c = Math.cos(th), s = Math.sin(th);
    return this.add({
      x: pos.x + lx * c + lz * s, y: pos.y + val(L.y, model), z: pos.z - lx * s + lz * c,
      color: col, intensity: L.i, range: L.range, flicker: L.flicker || 0, halo: L.halo || 0, obj: o,
    });
  }

  /** Lava pools: one source per 6x6 block with enough lava. */
  addLava(world, terrainTypes) {
    const B = 6;
    for (let by = 0; by < world.height; by += B) for (let bx = 0; bx < world.width; bx += B) {
      let n = 0, sx = 0, sy = 0, sh = 0;
      for (let y = by; y < Math.min(world.height, by + B); y++) for (let x = bx; x < Math.min(world.width, bx + B); x++) {
        const i = world.idx(x, y);
        if (terrainTypes[world.terrain[i]].liquid !== 'lava') continue;
        n++; sx += x + 0.5; sy += y + 0.5; sh += world.liquidHeight[i];
      }
      if (n >= 5) this.add({ x: sx / n, y: sh / n + 1.0, z: sy / n, color: '#ff5a1a', intensity: 6 + n * 0.4, range: 10, flicker: 0.3, halo: 0, lava: true });
    }
  }

  /** Short-lived light (spell impact, level-up). */
  flash(x, y, z, color, intensity = 10, ttl = 0.35, range = 8) {
    this.flashes.push({ x, y, z, color: new THREE.Color(color), intensity, range, ttl, max: ttl, flash: true });
    this._acc = 1;
  }

  /**
   * @param focus Vector3 camera focus; env {lightK (scales static sources), haloK}
   */
  update(dt, time, focus, env) {
    for (let i = this.flashes.length - 1; i >= 0; i--) if ((this.flashes[i].ttl -= dt) <= 0) this.flashes.splice(i, 1);
    if ((this._acc += dt) > 0.2 || this.flashes.length) { this._acc = 0; this.assign(focus); }
    const R = 34;
    for (const p of this.pool) {
      const s = p.src;
      if (!s) { p.light.intensity = 0; continue; }
      p.fade = Math.min(1, p.fade + dt * 3);
      let k;
      if (s.flash) { const f = Math.max(0, s.ttl) / s.max; k = f * f; }
      else {
        const d = Math.hypot(s.x - focus.x, s.z - focus.z);
        k = env.lightK * (1 - Math.max(0, (d - R * 0.6) / (R * 0.4))) * p.fade;
        if (s.flicker) k *= 1 - s.flicker * (0.12 + 0.1 * Math.sin(time * 13 + s.phase) * Math.sin(time * 7.7 + s.phase * 2));
      }
      p.light.intensity = s.intensity * Math.max(0, k);
    }
    this.haloUniforms.uK.value = env.haloK;
    this.halos.visible = env.haloK > 0.01;
  }

  assign(focus) {
    const near = [];
    const R = 34, HR = 46;
    const cx0 = Math.floor((focus.x - HR) / CELL), cx1 = Math.floor((focus.x + HR) / CELL);
    const cz0 = Math.floor((focus.z - HR) / CELL), cz1 = Math.floor((focus.z + HR) / CELL);
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const cell = this.grid.get(`${cx},${cz}`);
      if (!cell) continue;
      for (const s of cell) {
        if (s.obj?.hidden) continue;
        const d = Math.hypot(s.x - focus.x, s.z - focus.z);
        if (d < HR) near.push({ s, d });
      }
    }
    near.sort((a, b) => a.d - b.d);
    // halos
    const g = this.halos.geometry;
    const P = g.attributes.position.array, Cc = g.attributes.color.array, S = g.attributes.size.array, Ph = g.attributes.phase.array;
    let n = 0;
    for (const { s } of near) {
      if (!s.halo || n >= this.haloMax) continue;
      P[n * 3] = s.x; P[n * 3 + 1] = s.y; P[n * 3 + 2] = s.z;
      _c.copy(s.color).multiplyScalar(0.55);
      Cc[n * 3] = _c.r; Cc[n * 3 + 1] = _c.g; Cc[n * 3 + 2] = _c.b;
      S[n] = s.halo * 1.6; Ph[n] = s.flicker || 0;
      n++;
    }
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = g.attributes.phase.needsUpdate = true;
    // real lights: flashes first, then nearest sources
    const want = [...this.flashes, ...near.filter((e) => e.d < R).map((e) => e.s)].slice(0, this.pool.length);
    const keep = new Set(want);
    const free = [];
    for (const p of this.pool) { if (p.src && keep.has(p.src)) keep.delete(p.src); else free.push(p); }
    for (const s of keep) {
      const p = free.pop();
      if (!p) break;
      p.src = s; p.fade = s.flash ? 1 : 0;
      p.light.color.copy(s.color);
      p.light.distance = s.range || 9;
      p.light.position.set(s.x, s.y, s.z);
    }
    for (const p of free) p.src = null;
  }
}
