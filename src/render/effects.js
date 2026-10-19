// Particle effects and projectiles. Triggered via game.spawnEffect(kind, at, opts):
//   'levelup'    rockets + fireworks + golden ring around an entity
//   'sparkle'    glowing burst {color}
//   'splash'     magic splash (blue droplets + ring) on a target
//   'teleport'   light beam, spiralling motes and ground ring {color}
//   'projectile' at = source entity, opts {to: target entity, color, ms, size, arc}: arrows (size <= 0.07) fly
//                as oriented shafts; spells are glowing orbs with trails and burst by element on impact
//                (element guessed from the colour: fire / water-ice / earth-nature / wind / arcane)
//   'impact'     element burst {color}
//   'prayer'     rising glow at the feet {color}
//   'special'    special-attack shockwave {color}
// Also listens to 'damage' (hit flash on the character), 'prayer:change' (activation glow) and
// 'special:change' (special attack used).
//
// All particles live in two pooled Points draw calls (additive glow + normal debris); no per-particle
// meshes or materials are allocated.

import * as THREE from 'three';
import { POINT_SCALE } from './materials.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3(), _c = new THREE.Color(), _hsl = { h: 0, s: 0, l: 0 };
const rnd = (a, b) => a + Math.random() * (b - a);

/** Pool of CPU-simulated point particles drawn in one call. */
class ParticlePool {
  constructor(scene, max, additive) {
    this.max = max;
    this.n = 0;
    this.P = new Float32Array(max * 3); this.V = new Float32Array(max * 3); this.C = new Float32Array(max * 3);
    this.S = new Float32Array(max); this.A = new Float32Array(max);
    this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.P, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.C, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.S, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.A, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const m = new THREE.ShaderMaterial({
      uniforms: { uPx: POINT_SCALE }, transparent: true, depthWrite: false, vertexColors: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float size; attribute float alpha; uniform float uPx; varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * uPx / -mv.z; vC = color; vA = alpha; }`,
      fragmentShader: additive
        ? `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 1.6) * vA;
            gl_FragColor = vec4(vC * a + vec3(a * a * 0.35), 1.0);
            #include <colorspace_fragment>
          }`
        : `varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; if (max(abs(c.x), abs(c.y)) > 0.42) discard;
            gl_FragColor = vec4(vC, vA);
            #include <colorspace_fragment>
          }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 7;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, color, life, size, gravity = -3, drag = 0, sizeEnd = null) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.P[i * 3] = x; this.P[i * 3 + 1] = y; this.P[i * 3 + 2] = z;
    this.V[i * 3] = vx; this.V[i * 3 + 1] = vy; this.V[i * 3 + 2] = vz;
    _c.set(color);
    this.C[i * 3] = _c.r; this.C[i * 3 + 1] = _c.g; this.C[i * 3 + 2] = _c.b;
    this.life[i] = this.maxLife[i] = life; this.grav[i] = gravity; this.drag[i] = drag;
    this.s0[i] = size; this.s1[i] = sizeEnd ?? size;
    this.S[i] = size; this.A[i] = 1;
  }

  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); continue; }
      const k = this.life[i] / this.maxLife[i];
      const d = Math.max(0, 1 - this.drag[i] * dt);
      const j = i * 3;
      this.V[j] *= d; this.V[j + 2] *= d; this.V[j + 1] = this.V[j + 1] * d + this.grav[i] * dt;
      this.P[j] += this.V[j] * dt; this.P[j + 1] += this.V[j + 1] * dt; this.P[j + 2] += this.V[j + 2] * dt;
      this.A[i] = Math.min(1, k * 2.2);
      this.S[i] = this.s1[i] + (this.s0[i] - this.s1[i]) * k;
      i++;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, this.n);
    if (this.n || this._had) for (const a of ['position', 'color', 'size', 'alpha']) { g.attributes[a].needsUpdate = true; g.attributes[a].addUpdateRange(0, Math.max(1, this.n) * g.attributes[a].itemSize); }
    this._had = this.n > 0;
  }

  /** swap-remove particle i with the last one */
  kill(i) {
    const l = --this.n;
    if (i === l) return;
    for (const arr of [this.P, this.V, this.C]) { arr[i * 3] = arr[l * 3]; arr[i * 3 + 1] = arr[l * 3 + 1]; arr[i * 3 + 2] = arr[l * 3 + 2]; }
    for (const arr of [this.S, this.A, this.life, this.maxLife, this.grav, this.drag, this.s0, this.s1]) arr[i] = arr[l];
  }
}

/** Element of a spell from its projectile colour. */
export function elementOf(color) {
  _c.set(color ?? 0xffffff);
  _c.getHSL(_hsl);
  if (_hsl.s < 0.22) return 'wind';
  const h = _hsl.h * 360;
  if (h < 45 || h >= 340) return 'fire';
  if (h < 75) return _hsl.l > 0.6 ? 'holy' : 'earth';
  if (h < 160) return 'earth';
  if (h < 250) return 'water';
  return 'arcane';
}

const RING_GEO = new THREE.RingGeometry(0.75, 1, 32, 1).rotateX(-Math.PI / 2);
const BEAM_GEO = new THREE.CylinderGeometry(0.42, 0.55, 1, 16, 1, true).translate(0, 0.5, 0);
const ARROW_GEO = (() => {
  const g = new THREE.CylinderGeometry(0.012, 0.012, 0.55, 4).rotateX(Math.PI / 2);
  return g;
})();
const BEAM_MAT = (color) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: 1 }, uTime: { value: 0 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 uColor; uniform float uK; uniform float uTime; varying vec2 vUv;
    void main(){ float v = clamp(1.0 - vUv.y, 0.0, 1.0); float s = 0.6 + 0.4 * sin(vUv.x * 40.0 + uTime * 6.0 - vUv.y * 10.0);
      gl_FragColor = vec4(uColor * pow(v, 1.4) * s * uK, 1.0);
      #include <colorspace_fragment>
    }`,
});

export class Effects {
  constructor(rm) {
    this.rm = rm;
    this.group = new THREE.Group();
    rm.scene.add(this.group);
    this.glow = new ParticlePool(rm.scene, 3000, true);
    this.debris = new ParticlePool(rm.scene, 1200, false);
    this.projectiles = [];
    this.meshes = [];   // timed meshes (rings, beams): {m, t, dur, update}
    this.timers = [];   // [{at, fn}]
    this.time = 0;
    const ev = rm.game.events;
    ev.on('effect', (e) => { try { this.spawn(e.kind, e.at, e); } catch (err) { console.error('[effects]', err); } });
    ev.on('damage', ({ target, amount }) => { if (amount > 0) this.rm.viewFor?.(target)?.flash?.(); });
    this._prayers = 0;
    ev.on('prayer:change', ({ player }) => {
      if (player !== rm.game.player) return;
      const n = player.activePrayers?.size || 0;
      if (n > this._prayers) this.spawn('prayer', player, { color: 0x9adcff });
      this._prayers = n;
    });
    this._spec = null;
    ev.on('special:change', ({ player }) => {
      if (player !== rm.game.player) return;
      const e = player.specialEnergy;
      if (this._spec != null && e < this._spec - 0.5) this.after(0.12, () => this.spawn('special', player, { color: 0xffc040 }));
      this._spec = e;
    });
  }

  after(sec, fn) { this.timers.push({ at: this.time + sec, fn }); }

  posOf(at, out, frac = 0.6) {
    if (!at) return out.set(0, 0, 0);
    const v = at.uid != null ? this.rm.viewFor(at) : null;
    if (v) return out.set(v.pos.x, v.pos.y + v.rig.height * frac, v.pos.z);
    const w = this.rm.game.world;
    if (at.x == null) return out.set(0, 0, 0);
    return out.set(at.x + 0.5, w.tileCenterHeight(at.x, at.y) + 0.5, at.y + 0.5);
  }
  feetOf(at, out) {
    const v = at?.uid != null ? this.rm.viewFor(at) : null;
    if (v) return out.set(v.pos.x, v.pos.y + 0.05, v.pos.z);
    const w = this.rm.game.world;
    return out.set(at.x + 0.5, w.tileCenterHeight(at.x, at.y) + 0.05, at.y + 0.5);
  }

  /** burst of glowing sparks */
  burst(p, color, n, speed, life, size, gravity = -2, drag = 1.5, up = 0) {
    for (let i = 0; i < n; i++) {
      _a.set(Math.random() - 0.5, Math.random() - 0.5 + up, Math.random() - 0.5).normalize().multiplyScalar(speed * rnd(0.4, 1));
      this.glow.emit(p.x, p.y, p.z, _a.x, _a.y, _a.z, color, life * rnd(0.6, 1), size * rnd(0.7, 1.2), gravity, drag, size * 0.2);
    }
  }

  ring(p, color, r0, r1, dur, opacity = 0.9) {
    const m = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(p);
    m.scale.setScalar(r0);
    m.renderOrder = 7;
    this.group.add(m);
    this.meshes.push({ m, t: 0, dur, update: (k) => { m.scale.setScalar(r0 + (r1 - r0) * (1 - (1 - k) * (1 - k))); m.material.opacity = opacity * (1 - k); } });
  }

  flashLight(p, color, intensity = 10, ttl = 0.35, range = 8) { this.rm.lights?.flash(p.x, p.y, p.z, color, intensity, ttl, range); }

  spawn(kind, at, o = {}) {
    const p = this.posOf(at, new THREE.Vector3());
    switch (kind) {
      case 'levelup': this.levelup(at); break;
      case 'sparkle':
        this.burst(p, o.color ?? 0xffffff, 22, 2.2, 0.75, 0.16, -1.5, 2, 0.4);
        break;
      case 'splash': {
        const c = o.color ?? 0x4a8aff;
        for (let i = 0; i < 18; i++) this.debris.emit(p.x, p.y, p.z, rnd(-1.3, 1.3), rnd(0.5, 2.6), rnd(-1.3, 1.3), c, rnd(0.45, 0.7), 0.06, -7, 0.5);
        this.burst(p, c, 10, 1.5, 0.5, 0.18, 0, 3);
        this.ring(this.feetOf(at, new THREE.Vector3()), c, 0.2, 1.1, 0.45, 0.6);
        break;
      }
      case 'teleport': this.teleport(at, o.color ?? 0xb080ff); break;
      case 'projectile': this.projectile(at, o); break;
      case 'impact': this.impact(p, o.color ?? 0xffffff, o.size ?? 0.12); break;
      case 'prayer': {
        const f = this.feetOf(at, new THREE.Vector3());
        const c = o.color ?? 0x9adcff;
        this.ring(f, c, 0.3, 1.3, 0.6, 0.8);
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2, r = rnd(0.2, 0.55);
          this.glow.emit(f.x + Math.cos(a) * r, f.y + rnd(0, 0.3), f.z + Math.sin(a) * r, 0, rnd(1.2, 2.4), 0, c, rnd(0.6, 1.0), 0.13, 0, 1.2, 0.03);
        }
        this.flashLight(_a.copy(f).setY(f.y + 1), c, 6, 0.5, 6);
        break;
      }
      case 'special': {
        const f = this.feetOf(at, new THREE.Vector3());
        const c = o.color ?? 0xffc040;
        this.ring(f.clone().setY(f.y + 0.1), c, 0.3, 2.2, 0.45, 1);
        this.ring(f.clone().setY(f.y + 0.6), 0xffffff, 0.2, 1.2, 0.3, 0.6);
        for (let i = 0; i < 30; i++) {
          const a = (i / 30) * Math.PI * 2;
          this.glow.emit(p.x, p.y, p.z, Math.cos(a) * 4, rnd(0.2, 1.2), Math.sin(a) * 4, i % 2 ? c : 0xffffff, 0.45, 0.14, -2, 4, 0.03);
        }
        this.flashLight(p, c, 12, 0.3, 8);
        break;
      }
      default: break;
    }
  }

  levelup(at) {
    const cols = [0xffd040, 0xff5a5a, 0x60ff90, 0x60b0ff, 0xff80ff, 0xffffff];
    const f = this.feetOf(at, new THREE.Vector3());
    this.ring(f.clone().setY(f.y + 0.05), 0xffd040, 0.3, 2.4, 0.9, 0.9);
    this.ring(f.clone().setY(f.y + 0.05), 0xfff0b0, 0.2, 1.4, 0.6, 0.7);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      this.glow.emit(f.x + Math.cos(a) * 0.5, f.y + 0.1, f.z + Math.sin(a) * 0.5, Math.cos(a) * 0.3, rnd(2, 3.5), Math.sin(a) * 0.3, 0xffe080, rnd(0.6, 1), 0.12, -1, 1, 0.02);
    }
    this.flashLight(_a.copy(f).setY(f.y + 1.5), 0xffe0a0, 14, 0.8, 10);
    for (let r = 0; r < 4; r++) {
      const col = cols[(r * 2 + Math.floor(Math.random() * 6)) % cols.length];
      const col2 = cols[(r * 3 + 1) % cols.length];
      const launch = r * 0.28;
      const dx = rnd(-1.4, 1.4), dz = rnd(-1.4, 1.4), height = rnd(2.4, 3.4);
      const rocket = { t: 0, dur: 0.55 };
      this.after(launch, () => {
        const start = this.feetOf(at, new THREE.Vector3()).add(_b.set(0, 0.8, 0));
        const end = start.clone().add(_b.set(dx, height, dz));
        rocket.update = (k) => {
          const pos = _a.copy(start).lerp(end, 1 - (1 - k) * (1 - k));
          this.glow.emit(pos.x, pos.y, pos.z, rnd(-0.2, 0.2), rnd(-0.6, -0.2), rnd(-0.2, 0.2), 0xffd8a0, 0.35, 0.09, -1, 2, 0.02);
          if (k >= 1) {
            for (let i = 0; i < 46; i++) {
              _b.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(rnd(2.2, 3.2));
              this.glow.emit(end.x, end.y, end.z, _b.x, _b.y, _b.z, i % 3 ? col : col2, rnd(0.9, 1.4), 0.15, -2.2, 2.2, 0.05);
            }
            this.flashLight(end, col, 10, 0.5, 10);
          }
        };
        rocket.m = null;
        this.meshes.push(rocket);
      });
    }
  }

  teleport(at, color) {
    const f = this.feetOf(at, new THREE.Vector3());
    const m = new THREE.Mesh(BEAM_GEO, BEAM_MAT(color));
    m.position.copy(f);
    m.renderOrder = 7;
    this.group.add(m);
    const dur = 1.3;
    this.meshes.push({ m, t: 0, dur, update: (k, dt) => {
      const grow = Math.min(1, k * 4);
      m.scale.set(1 - k * 0.6, 3.2 * grow, 1 - k * 0.6);
      m.material.uniforms.uK.value = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.9;
      m.material.uniforms.uTime.value += dt;
    } });
    this.ring(f.clone().setY(f.y + 0.04), color, 0.2, 1.6, 0.8, 0.9);
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, r = rnd(0.25, 0.6);
      const sp = rnd(1.4, 3.2);
      this.glow.emit(f.x + Math.cos(a) * r, f.y + rnd(0, 0.4), f.z + Math.sin(a) * r, -Math.sin(a) * 0.9, sp, Math.cos(a) * 0.9, i % 4 ? color : 0xffffff, rnd(0.8, 1.3), 0.13, 0, 0.6, 0.02);
    }
    this.flashLight(_a.copy(f).setY(f.y + 1.2), color, 14, 0.9, 9);
  }

  projectile(at, o) {
    const color = o.color ?? 0xffffff;
    const size = o.size ?? 0.09;
    const arrow = size <= 0.07;
    let m = null;
    if (arrow) {
      m = new THREE.Mesh(ARROW_GEO, new THREE.MeshBasicMaterial({ color: 0x6a4a2a }));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4).rotateX(Math.PI / 2).translate(0, 0, 0.3), new THREE.MeshBasicMaterial({ color }));
      m.add(tip);
    } else {
      m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.scale.setScalar(size * 0.55);
    }
    m.renderOrder = 7;
    this.group.add(m);
    const pr = { m, from: at, to: o.to, t: 0, ms: o.ms ?? 600, arc: o.arc ?? 0.6, color, size, arrow, element: arrow ? null : elementOf(color), last: new THREE.Vector3(), spin: Math.random() * 6 };
    this.posOf(at, pr.last);
    this.projectiles.push(pr);
  }

  /** Spell / arrow impact by element. */
  impact(p, color, size = 0.12, element = elementOf(color)) {
    const s = Math.max(1, size / 0.1);
    const B = (pp, c, n, sp, life, sz, g, d, up) => this.burst(pp, c, Math.round(n), sp * 1.15, life, sz * 1.45, g, d, up);
    switch (element) {
      case 'fire':
        B(p, color, 26 * s, 3, 0.55, 0.2, 1.5, 3);
        B(p, 0xffd060, 14, 1.6, 0.4, 0.16, 2, 2);
        for (let i = 0; i < 8; i++) this.debris.emit(p.x, p.y, p.z, rnd(-0.5, 0.5), rnd(0.5, 1.2), rnd(-0.5, 0.5), 0x4a4440, rnd(0.6, 1), 0.12, 0.4, 1.5);
        this.flashLight(p, 0xff8030, 14, 0.4, 8);
        break;
      case 'water':
        for (let i = 0; i < 22 * s; i++) this.debris.emit(p.x, p.y, p.z, rnd(-1.8, 1.8), rnd(0.4, 2.8), rnd(-1.8, 1.8), i % 3 ? color : 0xdff4ff, rnd(0.45, 0.75), 0.07, -8, 0.4);
        B(p, color, 12, 1.4, 0.45, 0.2, 0, 3);
        this.ring(p.clone(), 0xbfe8ff, 0.1, 1.0, 0.35, 0.7);
        this.flashLight(p, color, 8, 0.3, 7);
        break;
      case 'earth':
        for (let i = 0; i < 16 * s; i++) this.debris.emit(p.x, p.y, p.z, rnd(-2, 2), rnd(1, 3), rnd(-2, 2), i % 2 ? 0x6a5030 : color, rnd(0.6, 0.9), rnd(0.07, 0.12), -9, 0.3);
        B(p, color, 10, 1.2, 0.5, 0.16, 0, 2);
        this.flashLight(p, color, 6, 0.3, 6);
        break;
      case 'wind':
        for (let i = 0; i < 28 * s; i++) {
          const a = (i / 28) * Math.PI * 2;
          this.glow.emit(p.x + Math.cos(a) * 0.2, p.y + rnd(-0.3, 0.3), p.z + Math.sin(a) * 0.2, -Math.sin(a) * 2.6 + Math.cos(a) * 0.8, rnd(0.2, 1), Math.cos(a) * 2.6 + Math.sin(a) * 0.8, i % 3 ? 0xe8f4ff : color, 0.5, 0.12, 0, 2.5, 0.02);
        }
        this.flashLight(p, 0xe0f0ff, 6, 0.25, 6);
        break;
      case 'holy':
        B(p, color, 24, 2, 0.7, 0.18, 1, 2, 0.4);
        this.ring(p.clone(), color, 0.1, 1.2, 0.4, 0.8);
        this.flashLight(p, color, 10, 0.4, 8);
        break;
      case 'arrow':
        for (let i = 0; i < 6; i++) this.debris.emit(p.x, p.y, p.z, rnd(-1, 1), rnd(0.5, 1.5), rnd(-1, 1), 0xd8c8a0, 0.3, 0.05, -6, 0.5);
        break;
      default: // arcane
        B(p, color, 24 * s, 2.4, 0.6, 0.18, 0, 2.5);
        B(p, 0xffffff, 8, 1, 0.35, 0.14, 0, 3);
        this.ring(p.clone(), color, 0.1, 0.9, 0.35, 0.7);
        this.flashLight(p, color, 10, 0.35, 7);
    }
  }

  update(dt) {
    this.time += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].at <= this.time) { const t = this.timers[i]; this.timers.splice(i, 1); try { t.fn(); } catch (e) { console.error('[effects]', e); } }
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const e = this.meshes[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.dur);
      e.update?.(k, dt);
      if (k >= 1) {
        if (e.m) { this.group.remove(e.m); e.m.material.dispose(); }
        this.meshes.splice(i, 1);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.t += (dt * 1000) / pr.ms;
      if (pr.t >= 1) {
        this.group.remove(pr.m);
        pr.m.traverse((c) => { if (c.material) c.material.dispose(); if (c !== pr.m && c.geometry) c.geometry.dispose(); });
        if (!pr.arrow) pr.m.geometry.dispose();
        if (this.rm.viewFor(pr.to)?.group?.visible || pr.to?.x != null) this.impact(pr.m.position, pr.color, pr.size, pr.arrow ? 'arrow' : pr.element);
        this.projectiles.splice(i, 1);
        continue;
      }
      this.posOf(pr.from, _a); this.posOf(pr.to, _b);
      const m = pr.m;
      pr.last.copy(m.position);
      m.position.lerpVectors(_a, _b, pr.t);
      m.position.y += Math.sin(pr.t * Math.PI) * pr.arc;
      if (pr.arrow) {
        if (m.position.distanceToSquared(pr.last) > 1e-6) m.lookAt(_a.copy(m.position).sub(pr.last).add(m.position));
        if (Math.random() < 0.4) this.glow.emit(m.position.x, m.position.y, m.position.z, 0, 0, 0, 0x806850, 0.18, 0.05, 0, 0, 0.01);
        continue;
      }
      // spell orb: bright core + coloured halo + trail flavoured by element
      const p = m.position, c = pr.color, s = pr.size;
      this.glow.emit(p.x, p.y, p.z, 0, 0, 0, c, 0.1, s * 4.5, 0, 0, s * 2.5);
      for (let k = 0; k < 2; k++) {
        const f = k / 2;
        _a.copy(pr.last).lerp(p, f);
        switch (pr.element) {
          case 'fire': this.glow.emit(_a.x, _a.y, _a.z, rnd(-0.3, 0.3), rnd(0.3, 1), rnd(-0.3, 0.3), Math.random() < 0.5 ? c : 0xffd060, 0.35, s * 2.2, 1, 1, s * 0.4); break;
          case 'water': this.glow.emit(_a.x, _a.y, _a.z, rnd(-0.2, 0.2), rnd(-0.6, 0), rnd(-0.2, 0.2), Math.random() < 0.5 ? c : 0xdff4ff, 0.3, s * 1.6, -2, 1, s * 0.3); break;
          case 'earth': this.debris.emit(_a.x, _a.y, _a.z, rnd(-0.3, 0.3), rnd(-0.2, 0.3), rnd(-0.3, 0.3), Math.random() < 0.5 ? c : 0x6a5030, 0.35, s * 0.6, -4, 0.5); break;
          case 'wind': {
            pr.spin += dt * 14;
            this.glow.emit(_a.x + Math.cos(pr.spin) * s * 1.6, _a.y + Math.sin(pr.spin) * s * 1.6, _a.z, 0, 0, 0, 0xe8f4ff, 0.3, s * 1.2, 0, 0, s * 0.2);
            break;
          }
          default: this.glow.emit(_a.x, _a.y, _a.z, rnd(-0.2, 0.2), rnd(-0.2, 0.2), rnd(-0.2, 0.2), c, 0.32, s * 1.8, 0, 1, s * 0.3);
        }
      }
    }
    this.glow.update(dt);
    this.debris.update(dt);
  }
}
