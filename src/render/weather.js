// Regional weather + ambient life, deterministic from the wall clock and the region so multiplayer
// peers agree: rain/storms (forests, swamp, coast, vale), snow (Frostfang Peaks, northern Wilderness,
// Greyspine), falling ash and embers (Ashen Wastes, Cinder Pits, Scorch Rift, Cinderfall), sandstorms
// (Sunscar), fog (Murkfen, dungeons), plus fireflies at night, butterflies and birds by day, cave dust.
//
// Every particle field is one GPU-animated draw call wrapped around the camera focus (positions are
// computed in the vertex shader from a random seed + time, so the CPU cost is ~0).
//
// game.weather = { climate, kind: 'clear'|'rain'|'storm'|'snow'|'blizzard'|'ash'|'embers'|'sandstorm'|'fog'|'cave', intensity }
// Event 'weather:change' {climate, kind, intensity, prev}.

import * as THREE from 'three';
import { GLOBAL, POINT_SCALE } from './materials.js';

const WINDOW_MS = 5 * 60 * 1000;
const inR = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

/** Climate id for a tile. */
export function climateAt(world, x, y) {
  const a = world.getArea(x, y);
  if (a?.dungeon) return 'cave';
  if (y >= 224) return 'indoor'; // sealed pockets below the map that are lit interiors (Starcaller's Study, crypt rooms)
  if (y < 48) {
    if (y < 12) return 'snow';
    if (inR(x, y, 243, 30, 287, 47) || inR(x, y, 60, 8, 86, 28) || inR(x, y, 134, 18, 160, 42) || inR(x, y, 252, 0, 287, 29)) return 'embers';
    if (inR(x, y, 192, 12, 242, 47)) return 'forest';
    if (y < 22) return 'northwild';
    return 'ash';
  }
  if (inR(x, y, 183, 46, 240, 110)) return 'mountain';
  if (inR(x, y, 74, 158, 118, 206)) return 'swamp';
  if (inR(x, y, 192, 134, 287, 199)) return 'desert';
  if (inR(x, y, 46, 104, 76, 172) || inR(x, y, 241, 49, 287, 128) || inR(x, y, 28, 100, 46, 132)) return 'forest';
  if (y >= 176) return 'coast';
  return 'temperate';
}

const CLIMATE_SEED = { temperate: 1, forest: 2, swamp: 3, coast: 4, snow: 5, northwild: 6, mountain: 7, ash: 8, embers: 9, desert: 10, cave: 11 };
function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

/** Weather kind + intensity for a climate at a wall-clock time. */
export function weatherFor(climate, now = Date.now()) {
  const w = Math.floor(now / WINDOW_MS);
  const s = CLIMATE_SEED[climate] || 0;
  const r = hash(w, s), r2 = hash(w * 3 + 1, s * 7 + 3);
  switch (climate) {
    case 'cave': return { kind: 'cave', intensity: 1 };
    case 'indoor': return { kind: 'clear', intensity: 0 };
    case 'snow': return r < 0.3 ? { kind: 'blizzard', intensity: 1 } : { kind: 'snow', intensity: 0.45 + r2 * 0.4 };
    case 'northwild': return r < 0.5 ? { kind: 'snow', intensity: 0.3 + r2 * 0.35 } : { kind: 'ash', intensity: 0.4 };
    case 'mountain': return r < 0.4 ? { kind: 'snow', intensity: 0.35 + r2 * 0.4 } : { kind: 'clear', intensity: 0 };
    case 'ash': return { kind: 'ash', intensity: 0.5 + r2 * 0.4 };
    case 'embers': return { kind: 'embers', intensity: 0.6 + r2 * 0.4 };
    case 'desert': return r < 0.3 ? { kind: 'sandstorm', intensity: 0.6 + r2 * 0.4 } : { kind: 'clear', intensity: 0 };
    case 'swamp': return r < 0.4 ? { kind: 'rain', intensity: 0.4 + r2 * 0.4, fog: 1 } : { kind: 'fog', intensity: 1 };
    default: {
      const rain = { temperate: 0.16, forest: 0.28, coast: 0.25 }[climate] ?? 0.15;
      const storm = { temperate: 0.03, forest: 0.06, coast: 0.08 }[climate] ?? 0.03;
      if (r < storm) return { kind: 'storm', intensity: 1 };
      if (r < rain) return { kind: 'rain', intensity: 0.35 + r2 * 0.5 };
      return { kind: 'clear', intensity: 0 };
    }
  }
}

// ------------------------------------------------------------------------------------------------
// GPU particle fields
// ------------------------------------------------------------------------------------------------
const FIELD_VS = `
  attribute vec3 seed;
  uniform vec3 uCenter; uniform float uBox; uniform float uH; uniform float uGround; uniform float uTime;
  uniform float uFall; uniform vec2 uDrift; uniform float uWobble; uniform float uSize; uniform float uPx;
  varying float vA; varying float vTw; varying float vSeed;
  vec3 fieldPos(){
    float sp = 0.75 + fract(seed.x * 13.7) * 0.5;
    vec3 p = seed * vec3(uBox, uH, uBox);
    p.y = mod(p.y - uTime * uFall * sp, uH);
    p.x += uDrift.x * uTime * sp + sin(uTime * 0.9 + seed.z * 40.0) * uWobble;
    p.z += uDrift.y * uTime * sp + cos(uTime * 0.7 + seed.x * 40.0) * uWobble;
    p.xz = mod(p.xz - uCenter.xz + uBox * 0.5, uBox) + uCenter.xz - uBox * 0.5;
    p.y += uCenter.y - uGround;
    vec2 e = abs(p.xz - uCenter.xz) / (uBox * 0.5);
    float yy = (p.y - (uCenter.y - uGround)) / uH;
    vA = (1.0 - smoothstep(0.65, 1.0, max(e.x, e.y))) * smoothstep(0.0, 0.08, yy) * smoothstep(1.0, 0.82, yy);
    vTw = sin(uTime * (1.5 + seed.y * 5.0) + seed.z * 80.0);
    vSeed = seed.y;
    return p;
  }`;

const POINT_VS = FIELD_VS + `
  void main(){ vec3 p = fieldPos(); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPx / -mv.z * (0.7 + vSeed * 0.6); }`;

const LINE_VS = FIELD_VS + `
  attribute float tail; uniform float uLen;
  void main(){ vec3 p = fieldPos(); vec3 dir = normalize(vec3(uDrift.x, -uFall, uDrift.y));
    p -= dir * tail * uLen; vA *= 1.0 - tail * 0.7;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;

const FRAG = {
  soft: `uniform vec3 uColor; uniform vec3 uColor2; uniform float uAlpha; varying float vA; varying float vTw; varying float vSeed;
    void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.4, d) * vA * uAlpha; if (a < 0.01) discard;
      gl_FragColor = vec4(mix(uColor, uColor2, vSeed), a);
      #include <colorspace_fragment>
    }`,
  glow: `uniform vec3 uColor; uniform vec3 uColor2; uniform float uAlpha; uniform float uBlink; varying float vA; varying float vTw; varying float vSeed;
    void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float core = pow(max(0.0, 1.0 - d), 2.0);
      float b = mix(1.0, max(0.0, vTw), uBlink);
      gl_FragColor = vec4(mix(uColor, uColor2, vSeed) * core * vA * uAlpha * b, 1.0);
      #include <colorspace_fragment>
    }`,
  butterfly: `uniform vec3 uColor; uniform vec3 uColor2; uniform float uAlpha; uniform float uTime; varying float vA; varying float vTw; varying float vSeed;
    void main(){ vec2 c = gl_PointCoord - 0.5; float flap = 0.25 + 0.75 * abs(sin(uTime * 14.0 + vSeed * 50.0));
      vec2 w = vec2(abs(c.x) / max(0.05, flap * 0.5) - 0.5, c.y * 2.2 + 0.1);
      float wing = step(length(w), 0.55); float body = step(abs(c.x), 0.035) * step(abs(c.y), 0.3);
      float a = max(wing, body) * vA * uAlpha; if (a < 0.5) discard;
      gl_FragColor = vec4(body > 0.5 ? vec3(0.12) : mix(uColor, uColor2, fract(vSeed * 7.3)), 1.0);
      #include <colorspace_fragment>
    }`,
  line: `uniform vec3 uColor; uniform float uAlpha; varying float vA;
    void main(){ gl_FragColor = vec4(uColor, vA * uAlpha);
      #include <colorspace_fragment>
    }`,
};

class Field {
  /** opts: {count, box, h, ground, fall, drift:[x,z], wobble, size, color, color2, alpha, kind: soft|glow|butterfly|line, len, blink} */
  constructor(scene, o) {
    this.o = o;
    this.max = o.count;
    const lines = o.kind === 'line';
    const nv = lines ? o.count * 2 : o.count;
    const seed = new Float32Array(nv * 3), tail = lines ? new Float32Array(nv) : null;
    for (let i = 0; i < o.count; i++) {
      const s = [Math.random(), Math.random(), Math.random()];
      for (let k = 0; k < (lines ? 2 : 1); k++) {
        const j = lines ? i * 2 + k : i;
        seed.set(s, j * 3);
        if (lines) tail[j] = k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
    if (lines) g.setAttribute('tail', new THREE.BufferAttribute(tail, 1));
    this.u = {
      uCenter: { value: new THREE.Vector3() }, uBox: { value: o.box }, uH: { value: o.h }, uGround: { value: o.ground ?? o.h * 0.3 },
      uTime: GLOBAL.uTime, uFall: { value: o.fall }, uDrift: { value: new THREE.Vector2(...(o.drift || [0, 0])) }, uWobble: { value: o.wobble || 0 },
      uSize: { value: o.size || 0.1 }, uPx: POINT_SCALE, uColor: { value: new THREE.Color(o.color) }, uColor2: { value: new THREE.Color(o.color2 || o.color) },
      uAlpha: { value: o.alpha ?? 1 }, uLen: { value: o.len || 0.7 }, uBlink: { value: o.blink || 0 },
    };
    const additive = o.kind === 'glow';
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: lines ? LINE_VS : POINT_VS, fragmentShader: FRAG[o.kind],
    });
    this.obj = lines ? new THREE.LineSegments(g, mat) : new THREE.Points(g, mat);
    this.obj.frustumCulled = false;
    this.obj.renderOrder = 6;
    this.obj.visible = false;
    this.lines = lines;
    this.level = 0;
    scene.add(this.obj);
  }

  /** level 0..1 (fraction of particles drawn). */
  /** level 0..1 (fraction of particles drawn); scale shrinks the box when the camera is zoomed in. */
  set(level, center, quality = 1, scale = 1) {
    this.level = level;
    this.u.uBox.value = this.o.box * scale;
    this.u.uH.value = this.o.h * (0.6 + 0.4 * scale);
    const n = Math.floor(this.max * Math.min(1, level) * quality);
    this.obj.visible = n > 0;
    if (!n) return;
    this.obj.geometry.setDrawRange(0, this.lines ? n * 2 : n);
    this.u.uCenter.value.copy(center);
  }
}

// ------------------------------------------------------------------------------------------------
// Birds: a small flock circling overhead (one draw call, CPU-built triangles)
// ------------------------------------------------------------------------------------------------
class Birds {
  constructor(scene, n = 9) {
    this.n = n;
    this.pos = new Float32Array(n * 2 * 3 * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.MeshBasicMaterial({ color: 0x2a2a30, side: THREE.DoubleSide, fog: true, transparent: true });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.k = 0;
    this.seed = Math.random() * 100;
    scene.add(this.mesh);
  }

  update(dt, time, center, want, color) {
    this.k += ((want ? 1 : 0) - this.k) * Math.min(1, dt * 0.5);
    this.mesh.visible = this.k > 0.02;
    if (!this.mesh.visible) return;
    this.mat.opacity = this.k;
    this.mat.color.set(color);
    const P = this.pos;
    let j = 0;
    const cx = center.x + Math.sin(time * 0.05 + this.seed) * 10, cz = center.z + Math.cos(time * 0.04 + this.seed) * 10;
    for (let i = 0; i < this.n; i++) {
      const a = time * 0.22 + i * 0.22 + (i % 3) * 0.08;
      const r = 13 + (i % 4) * 1.3;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = center.y + 11 + Math.sin(time * 0.6 + i) * 0.8 + (i % 3) * 0.5;
      const fx = -Math.sin(a), fz = Math.cos(a);          // flying direction (tangent)
      const rx = fz, rz = -fx;                            // right
      const flap = Math.sin(time * 9 + i * 1.7) * 0.32;
      const S = 0.45;
      const nose = [x + fx * S * 0.6, y, z + fz * S * 0.6], tailp = [x - fx * S * 0.3, y, z - fz * S * 0.3];
      for (const sd of [-1, 1]) {
        const tip = [x + rx * sd * S, y + flap, z + rz * sd * S];
        P.set(nose, j); P.set(tailp, j + 3); P.set(tip, j + 6); j += 9;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}

// ------------------------------------------------------------------------------------------------
export class Weather {
  constructor(rm) {
    this.rm = rm;
    this.game = rm.game;
    const s = rm.scene;
    this.fields = {
      rain: new Field(s, { kind: 'line', count: 5000, box: 44, h: 22, ground: 4, fall: 22, drift: [3, 1.2], size: 0, color: '#dce6f0', alpha: 0.55, len: 1.3 }),
      snow: new Field(s, { kind: 'soft', count: 2600, box: 46, h: 20, ground: 3, fall: 1.4, drift: [0.6, 0.3], wobble: 0.6, size: 0.13, color: '#ffffff', color2: '#e4ecf6', alpha: 0.9 }),
      ash: new Field(s, { kind: 'soft', count: 1100, box: 46, h: 18, ground: 3, fall: 0.7, drift: [0.5, 0.2], wobble: 0.9, size: 0.09, color: '#8a8480', color2: '#4a4644', alpha: 0.8 }),
      embers: new Field(s, { kind: 'glow', count: 320, box: 40, h: 12, ground: 2, fall: -0.9, drift: [0.4, 0.15], wobble: 0.7, size: 0.1, color: '#ff7a20', color2: '#ffd060', alpha: 1.0, blink: 0.5 }),
      sand: new Field(s, { kind: 'soft', count: 4000, box: 46, h: 10, ground: 1, fall: 0.25, drift: [9, 2.5], wobble: 0.4, size: 0.1, color: '#e0c08a', color2: '#b89060', alpha: 0.75 }),
      fireflies: new Field(s, { kind: 'glow', count: 260, box: 40, h: 3.5, ground: 0.4, fall: 0.02, drift: [0, 0], wobble: 1.1, size: 0.17, color: '#d8ff70', color2: '#90ff90', alpha: 1.0, blink: 1 }),
      butterflies: new Field(s, { kind: 'butterfly', count: 18, box: 34, h: 2.2, ground: -0.4, fall: 0.03, drift: [0.15, 0.1], wobble: 1.4, size: 0.24, color: '#f0d040', color2: '#e070c0', alpha: 1.0 }),
      dust: new Field(s, { kind: 'glow', count: 300, box: 30, h: 6, ground: 1, fall: 0.06, drift: [0.05, 0.03], wobble: 0.5, size: 0.06, color: '#a89070', color2: '#806850', alpha: 0.6, blink: 0.4 }),
    };
    this.birds = new Birds(s);
    this.levels = Object.fromEntries(Object.keys(this.fields).map((k) => [k, 0]));
    this.fog = 0; this.overcast = 0; this.wind = 0.35; this.wet = 0; this.flash = 0;
    this.fogColor = new THREE.Color('#9aa6b2');
    this._fogTarget = new THREE.Color('#9aa6b2');
    this._acc = 10;
    this.state = { climate: 'temperate', kind: 'clear', intensity: 0 };
    this.game.weather = this.state;
    this.quality = 1;
    this.enabled = true;
  }

  /** Recompute the target weather (every ~2 s). */
  target(night) {
    const p = this.game.player;
    const climate = climateAt(this.game.world, p.x, p.y);
    const w = this.force ? { kind: this.force, intensity: 1, fog: this.force === 'rain' && climate === 'swamp' } : this.enabled ? weatherFor(climate) :{ kind: climate === 'cave' ? 'cave' : 'clear', intensity: climate === 'cave' ? 1 : 0 };
    if (w.kind !== this.state.kind || climate !== this.state.climate) {
      const prev = this.state.kind;
      Object.assign(this.state, { climate, kind: w.kind, intensity: w.intensity });
      this.game.events.emit('weather:change', { climate, kind: w.kind, intensity: w.intensity, prev });
    } else this.state.intensity = w.intensity;
    const k = w.kind, I = w.intensity;
    const T = { rain: 0, snow: 0, ash: 0, embers: 0, sand: 0, fireflies: 0, butterflies: 0, dust: 0 };
    let fog = 0, overcast = 0, wind = 0.3, fogCol = '#9aa6b2';
    if (k === 'rain' || k === 'storm') { T.rain = k === 'storm' ? 1 : I; overcast = k === 'storm' ? 1 : 0.4 + I * 0.4; wind = k === 'storm' ? 1 : 0.5 + I * 0.3; fog = k === 'storm' ? 0.35 : 0.15; fogCol = '#8a96a4'; }
    if (k === 'snow' || k === 'blizzard') { T.snow = k === 'blizzard' ? 1 : I; overcast = 0.5 + I * 0.3; wind = k === 'blizzard' ? 1 : 0.4; fog = k === 'blizzard' ? 0.6 : 0.2 + I * 0.15; fogCol = '#d4dce6'; }
    if (k === 'ash') { T.ash = I; T.embers = 0.15; overcast = 0.2; wind = 0.35; fog = 0.1; fogCol = '#6e5e54'; }
    if (k === 'embers') { T.embers = I; T.ash = 0.5; overcast = 0.15; wind = 0.4; fog = 0.15; fogCol = '#7a4a34'; }
    if (k === 'sandstorm') { T.sand = I; overcast = 0.3; wind = 0.9; fog = 0.85 * I; fogCol = '#d0ac78'; }
    if (k === 'fog' || w.fog) { fog = Math.max(fog, 0.85); fogCol = '#7d8a7a'; overcast = Math.max(overcast, 0.25); }
    if (k === 'cave') { T.dust = 1; fog = 0.5; fogCol = '#1a1612'; }
    const clear = k === 'clear' || k === 'fog' || k === 'ash' || k === 'embers';
    const lush = climate === 'forest' || climate === 'swamp' || climate === 'temperate';
    if (night > 0.5 && lush && T.rain < 0.6) T.fireflies = climate === 'temperate' ? 0.35 : 1;
    if (night < 0.3 && (climate === 'forest' || climate === 'temperate') && k === 'clear') T.butterflies = 1;
    this.birdsWanted = night < 0.35 && clear && climate !== 'cave' && climate !== 'indoor' && climate !== 'snow' && climate !== 'desert';
    this.birdColor = climate === 'coast' ? '#f0f0ea' : (climate === 'ash' || climate === 'embers' || climate === 'forest' && p.y < 48) ? '#18161a' : '#2a2a30';
    this.lightning = k === 'storm';
    this._t = { T, fog, overcast, wind, wet: T.rain > 0 ? 0.4 + T.rain * 0.6 : 0 };
    this._fogTarget.set(fogCol);
  }

  update(dt, time, center, night) {
    if ((this._acc += dt) > 2) { this._acc = 0; this.target(night); }
    // keep the particle volume inside the view: shift it ahead of the camera, shrink it when zoomed in
    const cc = this.rm.cameraCtl;
    const dist = cc?.dist ?? 15, yaw = cc?.yaw ?? 0;
    this._scale = Math.max(0.5, Math.min(1, (16 + dist * 1.0) / 46));
    this._center = (this._center || center.clone()).set(center.x - Math.sin(yaw) * dist * 0.3, center.y, center.z - Math.cos(yaw) * dist * 0.3);
    const tg = this._t;
    const r = Math.min(1, dt * 0.35);
    for (const [k, f] of Object.entries(this.fields)) {
      this.levels[k] += (tg.T[k] - this.levels[k]) * r;
      if (Math.abs(tg.T[k] - this.levels[k]) < 0.002) this.levels[k] = tg.T[k];
      f.set(this.levels[k], this._center, this.quality, this._scale);
    }
    this.fog += (tg.fog - this.fog) * r;
    this.overcast += (tg.overcast - this.overcast) * r;
    this.wind += (tg.wind - this.wind) * r;
    this.wet += (tg.wet - this.wet) * Math.min(1, dt * (tg.wet > this.wet ? 0.05 : 0.02)); // puddles dry slowly
    this.fogColor.lerp(this._fogTarget, r);
    GLOBAL.uWind.value = this.wind;
    GLOBAL.uWet.value = this.wet;
    // rain slants with the wind
    this.fields.rain.u.uDrift.value.set(1 + this.wind * 4, 0.5 + this.wind * 1.2);
    this.fields.snow.u.uDrift.value.set(0.3 + this.wind * 2.5, 0.2 + this.wind * 0.8);
    // lightning: deterministic per wall-clock second so peers flash together
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.lightning) {
      const sec = Math.floor(Date.now() / 1000);
      if (sec !== this._lastSec) { this._lastSec = sec; if (hash(sec, 99) < 0.035) { this.flash = 1; this.game.events.emit('weather:lightning', {}); } }
    }
    this.birds.update(dt, time, center, this.birdsWanted, this.birdColor);
  }
}
