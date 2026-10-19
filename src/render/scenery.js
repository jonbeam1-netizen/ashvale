// Renders world objects (instanced per model variant), animated objects, building roofs and
// ground items. Listens to object/ground events so systems never touch meshes directly.

import * as THREE from 'three';
import { buildSceneryGeometry, sceneryKey, getSceneryTemplate, VC_MATERIAL, GeoBuilder } from './models.js';
import { getItemIconTexture } from '../ui/icons.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
// Scenery is instanced per model variant *per chunk* so frustum / distance culling can skip far
// chunks (a single world-wide InstancedMesh is never culled). Free slots park at the chunk centre
// with zero scale so they don't inflate the chunk's bounding sphere.
const SCENERY_CHUNK = 32;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);

export class SceneryRenderer {
  constructor(rm, game) {
    this.rm = rm;
    this.game = game;
    this.world = game.world;
    this.group = new THREE.Group();
    this.group.name = 'scenery';
    rm.scene.add(this.group);
    this.variants = new Map();   // key -> {key, geo, mesh, cap, objs[], free[]}
    this.slots = new Map();      // obj.uid -> {variant, index} | {dynamic: Object3D}
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
    this.buildRoofs();

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
    v = { key, geo, mesh: null, cap: 0, objs: [], free: [], zero, cx: ccx, cy: ccy };
    this.variants.set(key, v);
    this.growVariant(v, cap);
    return v;
  }

  growVariant(v, cap) {
    const mesh = new THREE.InstancedMesh(v.geo, VC_MATERIAL, cap);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, i < v.cap && v.mesh ? (v.mesh.getMatrixAt(i, _m), _m) : v.zero);
    mesh.userData.variant = v;
    if (v.mesh) { this.group.remove(v.mesh); v.mesh.dispose(); }
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
    if (tpl?.animated && tpl.create) {
      const obj3d = tpl.create(info.model, info.w, info.h);
      obj3d.applyMatrix4(this.objectMatrix(o));
      obj3d.traverse((c) => { c.userData.entity = o; });
      this.group.add(obj3d);
      this.dynamic.add(obj3d);
      this.slots.set(o.uid, { dynamic: obj3d });
      return;
    }
    const key = this.keyOf(o);
    const v = this.ensureVariant(key, info, 8, o);
    if (!v.free.length) this.growVariant(v, Math.max(8, v.cap * 2));
    const idx = v.free.pop();
    v.objs[idx] = o;
    v.mesh.setMatrixAt(idx, this.objectMatrix(o));
    v.mesh.instanceMatrix.needsUpdate = true;
    v.mesh.boundingSphere = null;
    this.slots.set(o.uid, { variant: v, index: idx });
  }

  removeObject(o) {
    const s = this.slots.get(o.uid);
    if (!s) return;
    this.slots.delete(o.uid);
    if (s.dynamic) { this.group.remove(s.dynamic); this.dynamic.delete(s.dynamic); return; }
    if (s.variant) {
      s.variant.mesh.setMatrixAt(s.index, s.variant.zero);
      s.variant.mesh.instanceMatrix.needsUpdate = true;
      s.variant.mesh.boundingSphere = null;
      s.variant.objs[s.index] = null;
      s.variant.free.push(s.index);
    }
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

  // ---- roofs ------------------------------------------------------------------------------------
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
      g.add(geo, b.roof, [0, 0, 0], [0, alongX ? 0 : Math.PI / 2, 0], 1, 0.1);
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
    const far = (this.rm.scene.fog?.far ?? 95) + SCENERY_CHUNK * 0.75;
    for (const v of this.variants.values()) {
      if (!v.mesh) continue;
      v.mesh.visible = Math.abs(v.cx - p.x) < far && Math.abs(v.cy - p.y) < far;
    }
    for (const d of this.dynamic) {
      d.visible = Math.abs(d.position.x - p.x) < far && Math.abs(d.position.z - p.y) < far;
    }
  }

  update(time) {
    if (++this._cullAcc > 15) { this._cullAcc = 0; this.cullChunks(); }
    for (const d of this.dynamic) if (d.visible) d.userData.update?.(time);
    for (const s of this.groundSprites.values()) s.visible = this.game.canSeeGroundItem(s.userData.entity);
    this.updateRoofs();
  }
}

const ROOF_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
