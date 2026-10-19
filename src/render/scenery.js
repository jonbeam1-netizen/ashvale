// Renders world objects (instanced per model variant), animated objects, building roofs (+ chimneys,
// smoke and windows that light up at night) and ground items. Listens to object/ground events so
// systems never touch meshes directly. Foliage variants use wind-swaying materials; light-emitting
// templates register pooled light sources (render/lights.js).

import * as THREE from 'three';
import { buildSceneryGeometry, sceneryKey, getSceneryTemplate, VC_MATERIAL, GeoBuilder } from './models.js';
import { FOLIAGE_TREE, FOLIAGE_LOW, WINDOW_MATERIAL, GLOBAL, POINT_SCALE } from './materials.js';
import { getItemIconTexture } from '../ui/icons.js';
import { tileRand } from '../core/rng.js';

// Scenery is instanced per model variant *per chunk* so frustum / distance culling can skip far
// chunks (a single world-wide InstancedMesh is never culled). Free slots park at the chunk centre
// with zero scale so they don't inflate the chunk's bounding sphere.
const SCENERY_CHUNK = 32;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);

const TREE_TEMPLATES = new Set(['tree', 'dec_decor_tree', 'dec_palm']);
const LOW_FOLIAGE = new Set(['bush', 'flowers', 'dec_grass_tuft', 'dec_reeds', 'dec_crops', 'crop', 'dec_flower_bed', 'dec_mushrooms']);
const materialFor = (model) => (TREE_TEMPLATES.has(model?.template) ? FOLIAGE_TREE : LOW_FOLIAGE.has(model?.template) ? FOLIAGE_LOW : VC_MATERIAL);

export class SceneryRenderer {
  constructor(rm, game) {
    this.rm = rm;
    this.game = game;
    this.world = game.world;
    this.group = new THREE.Group();
    this.group.name = 'scenery';
    rm.scene.add(this.group);
    this.variants = new Map();   // key -> {key, geo, mesh, cap, objs[], free[]}
    this.slots = new Map();      // obj.uid -> {variant, index, light} | {dynamic: Object3D, lights}
    this.dynamic = new Set();
    this.groundSprites = new Map();
    this.roofs = [];

    // initial bulk build: count per variant so meshes start with the right capacity
    const counts = new Map(), first = new Map();
    for (const o of game.objects.values()) {
      const k = this.keyOf(o);
      counts.set(k, (counts.get(k) || 0) + 1);
      if (!first.has(k)) first.set(k, o);
    }
    for (const [k, n] of counts) this.ensureVariant(k, this.modelInfo(first.get(k)), n + 4, first.get(k));
    this._cullAcc = 1;
    for (const o of game.objects.values()) this.addObject(o);
    for (const g of game.groundItems.values()) this.addGround(g);
    this.chimneys = [];
    this.buildRoofs();
    this.buildWindows();
    this.buildSmoke();

    const ev = game.events;
    ev.on('object:add', ({ object }) => this.addObject(object));
    ev.on('object:remove', ({ object }) => this.removeObject(object));
    ev.on('object:change', ({ object }) => { this.removeObject(object); this.addObject(object); });
    ev.on('ground:add', ({ item }) => this.addGround(item));
    ev.on('ground:remove', ({ item }) => this.removeGround(item));
    ev.on('ground:change', ({ item }) => { this.removeGround(item); this.addGround(item); });
  }

  modelInfo(o) {
    const [w, h] = o.sizeOverride || o.def.size || [1, 1];
    return { model: o.def.model, w, h };
  }
  chunkOf(o) { return `${Math.floor(o.x / SCENERY_CHUNK)},${Math.floor(o.y / SCENERY_CHUNK)}`; }
  keyOf(o) { const { model, w, h } = this.modelInfo(o); return sceneryKey(model, w, h) + '@' + this.chunkOf(o); }

  ensureVariant(key, info, cap = 32, o = null) {
    let v = this.variants.get(key);
    if (v) return v;
    const geo = buildSceneryGeometry(info.model, info.w, info.h);
    const ccx = o ? (Math.floor(o.x / SCENERY_CHUNK) + 0.5) * SCENERY_CHUNK : 0, ccy = o ? (Math.floor(o.y / SCENERY_CHUNK) + 0.5) * SCENERY_CHUNK : 0;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(ccx, o ? this.world.heightAt(ccx, ccy) : 0, ccy);
    v = { key, geo, mesh: null, cap: 0, objs: [], free: [], zero, cx: ccx, cy: ccy, material: materialFor(info.model) };
    this.variants.set(key, v);
    this.growVariant(v, cap);
    return v;
  }

  growVariant(v, cap) {
    const mesh = new THREE.InstancedMesh(v.geo, v.material, cap);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, i < v.cap && v.mesh ? (v.mesh.getMatrixAt(i, _m), _m) : v.zero);
    mesh.userData.variant = v;
    if (v.mesh) { mesh.visible = v.mesh.visible; this.group.remove(v.mesh); v.mesh.dispose(); }
    for (let i = v.cap; i < cap; i++) v.free.push(i);
    v.free.sort((a, b) => b - a);
    v.cap = cap;
    v.mesh = mesh;
    mesh.count = cap;
    this.group.add(mesh);
  }

  objectMatrix(o) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    let h = this.world.heightAt(cx, cy);
    if (o.w > 1 || o.h > 1) {
      // sit on the lowest corner so large objects never float
      h = Math.min(h, this.world.heightAt(o.x + 0.1, o.y + 0.1), this.world.heightAt(o.x + o.w - 0.1, o.y + 0.1),
        this.world.heightAt(o.x + 0.1, o.y + o.h - 0.1), this.world.heightAt(o.x + o.w - 0.1, o.y + o.h - 0.1));
    }
    if (this.world.isWater(o.x, o.y)) h = Math.max(h, this.world.waterLevel);
    _q.setFromAxisAngle(_up, -o.rot * Math.PI / 2);
    _m.compose(_p.set(cx, h, cy), _q, _s);
    return _m;
  }

  addObject(o) {
    if (this.slots.has(o.uid)) return;
    if (o.hidden) { this.slots.set(o.uid, { hiddenOnly: true }); return; }
    const info = this.modelInfo(o);
    const tpl = getSceneryTemplate(info.model.template);
    const lights = this.rm.lights;
    if (tpl?.animated && tpl.create) {
      const obj3d = tpl.create(info.model, info.w, info.h);
      obj3d.applyMatrix4(this.objectMatrix(o));
      obj3d.traverse((c) => { c.userData.entity = o; });
      // embedded point lights would change the scene's light count (shader recompiles): pool them instead
      const srcs = [];
      const found = [];
      obj3d.traverse((c) => { if (c.isPointLight) found.push(c); });
      obj3d.updateMatrixWorld(true);
      for (const l of found) {
        const wp = l.getWorldPosition(new THREE.Vector3());
        l.parent.remove(l);
        if (!lights?.addForObject || (info.model.template in LIGHTED)) continue;
        srcs.push(lights.add({ x: wp.x, y: wp.y, z: wp.z, color: l.color.clone(), intensity: Math.max(6, Math.min(12, l.intensity * 4)), range: Math.max(8, Math.min(16, l.distance || 9)), flicker: 0.5, halo: 1.6, obj: o }));
      }
      const own = lights?.addForObject(o, info.model, _p.setFromMatrixPosition(this.objectMatrix(o)).clone(), o.rot);
      if (own) srcs.push(own);
      this.enhance(info.model.template, obj3d);
      this.group.add(obj3d);
      this.dynamic.add(obj3d);
      this.slots.set(o.uid, { dynamic: obj3d, lights: srcs });
      return;
    }
    const key = this.keyOf(o);
    const v = this.ensureVariant(key, info, 8, o);
    if (!v.free.length) this.growVariant(v, Math.max(8, v.cap * 2));
    const idx = v.free.pop();
    v.objs[idx] = o;
    const mat = this.objectMatrix(o);
    v.mesh.setMatrixAt(idx, mat);
    v.mesh.instanceMatrix.needsUpdate = true;
    v.mesh.boundingSphere = null;
    const light = lights?.addForObject(o, info.model, new THREE.Vector3().setFromMatrixPosition(mat), o.rot) || null;
    this.slots.set(o.uid, { variant: v, index: idx, light });
  }

  removeObject(o) {
    const s = this.slots.get(o.uid);
    if (!s) return;
    this.slots.delete(o.uid);
    if (s.light) this.rm.lights?.remove(s.light);
    if (s.lights) for (const l of s.lights) this.rm.lights?.remove(l);
    if (s.dynamic) { this.group.remove(s.dynamic); this.dynamic.delete(s.dynamic); return; }
    if (s.variant) {
      s.variant.mesh.setMatrixAt(s.index, s.variant.zero);
      s.variant.mesh.instanceMatrix.needsUpdate = true;
      s.variant.mesh.boundingSphere = null;
      s.variant.objs[s.index] = null;
      s.variant.free.push(s.index);
    }
  }

  /** Extra polish for some animated templates (render-only, content stays untouched). */
  enhance(template, obj3d) {
    if (template !== 'dec_waterfall') return;
    const sheet = obj3d.children.find((c) => c.isMesh && c.geometry?.type === 'PlaneGeometry');
    if (!sheet) return;
    sheet.material = WATERFALL_MAT;
    // the shader draws the falling streaks; hide the old streak boxes
    for (const c of obj3d.children) if (c.isMesh && c.geometry?.type === 'BoxGeometry' && c.material?.opacity === 0.8) c.visible = false;
  }

  /** Map a raycast hit to an object entity. */
  entityFromHit(hit) {
    const v = hit.object.userData.variant;
    if (v && hit.instanceId != null) return v.objs[hit.instanceId] || null;
    return hit.object.userData.entity || null;
  }

  pickables() {
    const out = [];
    for (const v of this.variants.values()) out.push(v.mesh);
    for (const d of this.dynamic) out.push(d);
    for (const s of this.groundSprites.values()) out.push(s);
    return out;
  }

  // ---- roofs (+ chimneys) -----------------------------------------------------------------------
  buildRoofs() {
    for (const b of this.world.buildings) {
      const g = new GeoBuilder();
      const w = b.x1 - b.x0 + 1, d = b.y1 - b.y0 + 1;
      const base = b.base + b.wallHeight + 0.05;
      const alongX = w >= d;
      const span = alongX ? d : w, len = alongX ? w : d;
      const rise = Math.min(2.2, span * 0.45);
      const ov = 0.35;
      const geo = new THREE.BufferGeometry();
      const hs = span / 2 + ov, hl = len / 2 + ov;
      // ridge along local X (len), slopes along local Z (span)
      const v = [
        // slope 1
        -hl, 0, hs, hl, 0, hs, hl, rise, 0,
        -hl, 0, hs, hl, rise, 0, -hl, rise, 0,
        // slope 2
        hl, 0, -hs, -hl, 0, -hs, -hl, rise, 0,
        hl, 0, -hs, -hl, rise, 0, hl, rise, 0,
        // gables
        -hl + ov, 0, -hs + ov, -hl + ov, 0, hs - ov, -hl + ov, rise - ov * 0.6, 0,
        hl - ov, 0, hs - ov, hl - ov, 0, -hs + ov, hl - ov, rise - ov * 0.6, 0,
      ];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      geo.computeVertexNormals();
      const rotY = alongX ? 0 : Math.PI / 2;
      g.add(geo, b.roof, [0, 0, 0], [0, rotY, 0], 1, 0.1);
      // chimney on about half of the houses (deterministic), with smoke
      const area = this.world.getArea(b.x0, b.y0);
      if (!area?.dungeon && w * d >= 12 && tileRand(b.x0, b.y0, 77) < 0.6) {
        const lx = hl * 0.45 * (tileRand(b.x0, b.y0, 78) < 0.5 ? -1 : 1), lz = hs * 0.3;
        const slopeY = rise * (1 - lz / hs);
        const topY = rise + 0.55;
        const c = Math.cos(rotY), s = Math.sin(rotY);
        const px = lx * c + lz * s, pz = -lx * s + lz * c;
        g.box('#6e665c', 0.42, topY - slopeY + 0.3, 0.42, [px, (topY + slopeY - 0.3) / 2, pz], [0, 0, 0], 0.1);
        g.box('#4e4840', 0.5, 0.1, 0.5, [px, topY, pz], [0, 0, 0], 0.05);
        this.chimneys.push({ x: b.x0 + w / 2 + px, y: base + topY + 0.05, z: b.y0 + d / 2 + pz, b });
      }
      const mesh = new THREE.Mesh(g.build(), ROOF_MAT);
      mesh.position.set(b.x0 + w / 2, base, b.y0 + d / 2);
      mesh.castShadow = true;
      mesh.userData.building = b;
      this.group.add(mesh);
      this.roofs.push({ mesh, b });
    }
  }

  updateRoofs() {
    const p = this.game.player;
    const forceHide = !p.settings.roofs;
    const inside = this.world.buildingAt(p.x, p.y);
    for (const r of this.roofs) r.mesh.visible = !forceHide && r.b !== inside;
  }

  // ---- windows: dark glass by day, warm light at night -----------------------------------------
  buildWindows() {
    const W = this.world;
    const isWall = (x, y) => W.inBounds(x, y) && W.objectsAt(x, y).some((o) => o.def.model?.template === 'wall');
    const g = new GeoBuilder();
    let n = 0;
    for (const b of W.buildings) {
      if (W.getArea(b.x0, b.y0)?.dungeon) continue;
      const y = b.base + Math.min(1.35, b.wallHeight * 0.56);
      const sides = [
        { tiles: (f) => { for (let x = b.x0 + 1; x < b.x1; x++) f(x, b.y0, x + 0.5, b.y0 - 0.03, 0); } , dx: 1, dy: 0, out: [0, -1] },
        { tiles: (f) => { for (let x = b.x0 + 1; x < b.x1; x++) f(x, b.y1, x + 0.5, b.y1 + 1.03, 0); }, dx: 1, dy: 0, out: [0, 1] },
        { tiles: (f) => { for (let yy = b.y0 + 1; yy < b.y1; yy++) f(b.x0, yy, b.x0 - 0.03, yy + 0.5, Math.PI / 2); }, dx: 0, dy: 1, out: [-1, 0] },
        { tiles: (f) => { for (let yy = b.y0 + 1; yy < b.y1; yy++) f(b.x1, yy, b.x1 + 1.03, yy + 0.5, Math.PI / 2); }, dx: 0, dy: 1, out: [1, 0] },
      ];
      for (const sd of sides) {
        sd.tiles((tx, ty, wx, wz, rot) => {
          if ((tx + ty) % 3 !== 1) return;
          if (!isWall(tx, ty) || !isWall(tx - sd.dx, ty - sd.dy) || !isWall(tx + sd.dx, ty + sd.dy)) return; // keep clear of doors
          const ox = tx + sd.out[0], oy = ty + sd.out[1];
          if (W.buildingAt(ox, oy) || isWall(ox, oy)) return; // wall shared with a neighbour
          const lit = tileRand(tx, ty, 91) < 0.8 ? 1 : 0;
          g.glowNext = 0; g.box('#3a2a1c', 0.56, 0.66, 0.06, [wx, y, wz], [0, rot, 0], 0.05);
          g.glowNext = lit; g.box(lit ? '#2c3646' : '#262c36', 0.42, 0.52, 0.08, [wx, y, wz], [0, rot, 0], 0.03);
          g.glowNext = 0; g.box('#3a2a1c', 0.05, 0.52, 0.1, [wx, y, wz], [0, rot, 0], 0);
          g.glowNext = 0; g.box('#3a2a1c', 0.6, 0.06, 0.14, [wx, y - 0.33, wz], [0, rot, 0], 0);
          n++;
        });
      }
    }
    if (!n) return;
    const mesh = new THREE.Mesh(g.build(), WINDOW_MATERIAL);
    mesh.receiveShadow = true;
    this.windows = mesh;
    this.group.add(mesh);
  }

  // ---- chimney smoke (GPU-animated points) ------------------------------------------------------
  buildSmoke() {
    const PER = 9;
    const n = this.chimneys.length * PER;
    if (!n) return;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    this.chimneys.forEach((c, i) => {
      for (let k = 0; k < PER; k++) { const j = i * PER + k; pos[j * 3] = c.x; pos[j * 3 + 1] = c.y; pos[j * 3 + 2] = c.z; seed[j] = k / PER + tileRand(i, k, 5) * 0.05; }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.smokeUniforms = { uTime: GLOBAL.uTime, uWind: GLOBAL.uWind, uPx: POINT_SCALE, uCol: { value: new THREE.Color(0.75, 0.75, 0.75) }, uA: { value: 0.5 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.smokeUniforms, transparent: true, depthWrite: false,
      vertexShader: `attribute float seed; uniform float uTime; uniform float uWind; uniform float uPx; varying float vA;
        void main(){
          float life = fract(uTime * 0.12 + seed);
          vec3 p = position;
          float ph = position.x * 1.7 + position.z * 1.3;
          p.y += life * 3.2;
          p.x += life * life * (0.6 + uWind * 2.2) + sin(uTime * 0.8 + seed * 6.0 + ph) * 0.18 * life;
          p.z += life * life * (0.3 + uWind * 0.8) + cos(uTime * 0.7 + seed * 5.0 + ph) * 0.15 * life;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.35 + life * 1.3) * uPx / -mv.z;
          vA = smoothstep(0.0, 0.12, life) * (1.0 - life) * (1.0 - smoothstep(40.0, 70.0, -mv.z));
        }`,
      fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.35, d) * vA * uA;
          if (a < 0.01) discard; gl_FragColor = vec4(uCol, a);
          #include <colorspace_fragment>
        }`,
    });
    this.smoke = new THREE.Points(g, m);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 4;
    this.group.add(this.smoke);
  }

  // ---- ground items ------------------------------------------------------------------------------
  addGround(g) {
    if (this.groundSprites.has(g.uid)) return;
    const mat = new THREE.SpriteMaterial({ map: getItemIconTexture(g.itemId, g.qty), transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const n = [...this.groundSprites.values()].filter((o) => o.userData.entity.x === g.x && o.userData.entity.y === g.y).length;
    const ox = ((n * 37) % 5 - 2) * 0.08, oz = ((n * 53) % 5 - 2) * 0.08;
    s.position.set(g.x + 0.5 + ox, this.world.tileCenterHeight(g.x, g.y) + 0.22, g.y + 0.5 + oz);
    s.scale.set(0.5, 0.45, 1);
    s.userData.entity = g;
    this.group.add(s);
    this.groundSprites.set(g.uid, s);
  }

  removeGround(g) {
    const s = this.groundSprites.get(g.uid);
    if (!s) return;
    this.group.remove(s);
    s.material.dispose();
    this.groundSprites.delete(g.uid);
  }

  /** Hide whole chunk meshes beyond the fog (frustum culling alone keeps far chunks in view). */
  cullChunks() {
    const p = this.game.player;
    // a chunk is drawn while any part of it can be closer than the fog's far plane (half a chunk = 16 tiles)
    const far = (this.rm.scene.fog?.far ?? 95) + SCENERY_CHUNK * 0.5;
    for (const v of this.variants.values()) {
      if (!v.mesh) continue;
      v.mesh.visible = Math.abs(v.cx - p.x) < far && Math.abs(v.cy - p.y) < far;
    }
    for (const d of this.dynamic) {
      d.visible = Math.abs(d.position.x - p.x) < far && Math.abs(d.position.z - p.y) < far;
    }
  }

  /** env: {smokeCol: Color, smokeA} from the renderer's atmosphere. */
  update(time, env) {
    if (++this._cullAcc > 15) { this._cullAcc = 0; this.cullChunks(); }
    for (const d of this.dynamic) if (d.visible) d.userData.update?.(time);
    for (const s of this.groundSprites.values()) s.visible = this.game.canSeeGroundItem(s.userData.entity);
    this.updateRoofs();
    WATERFALL_MAT.uniforms.uTime.value = time;
    if (this.smoke && env) { this.smokeUniforms.uCol.value.copy(env.smokeCol); this.smokeUniforms.uA.value = env.smokeA; }
  }
}

/** Templates whose light is described by LIGHT_TEMPLATES (embedded PointLights are just dropped). */
const LIGHTED = { dec_campfire: 1, fire: 1 };

const ROOF_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });

const WATERFALL_MAT = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uTime; varying vec2 vUv;
    void main(){
      float col = floor(vUv.x * 16.0);
      float r = fract(sin(col * 91.7) * 437.5);
      float s = fract(vUv.y * (2.0 + r) + uTime * (1.1 + r * 0.9) + r);
      float streak = smoothstep(0.0, 0.25, s) * smoothstep(1.0, 0.55, s);
      vec3 c = mix(vec3(0.42, 0.66, 0.86), vec3(0.93, 0.97, 1.0), streak * 0.75);
      float foam = smoothstep(0.16, 0.0, vUv.y + sin(vUv.x * 30.0 + uTime * 6.0) * 0.02);
      c = mix(c, vec3(1.0), foam);
      float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
      gl_FragColor = vec4(c, (0.62 + streak * 0.3 + foam * 0.3) * edge);
      #include <colorspace_fragment>
    }`,
});
