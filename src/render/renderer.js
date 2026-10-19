// RenderManager: three.js scene, sky, lights, terrain, scenery, characters, overlays, effects, picking.

import * as THREE from 'three';
import { TerrainMesh } from './terrainmesh.js';
import { SceneryRenderer } from './scenery.js';
import { CharacterView } from './characters.js';
import { CameraController } from './camera.js';
import { Overlays } from './overlays.js';
import { Effects } from './effects.js';

const SKY = {
  normal: { top: new THREE.Color('#5a8fd0'), horizon: new THREE.Color('#c9dcea'), fog: new THREE.Color('#bcd2e2'), sun: new THREE.Color('#fff2dc'), hemi: new THREE.Color('#cfe2ff') },
  wild: { top: new THREE.Color('#3a2c30'), horizon: new THREE.Color('#8a6a5a'), fog: new THREE.Color('#6e584c'), sun: new THREE.Color('#ffc8a0'), hemi: new THREE.Color('#b09080') },
  cave: { top: new THREE.Color('#080605'), horizon: new THREE.Color('#1c1612'), fog: new THREE.Color('#16110d'), sun: new THREE.Color('#a08a6a'), hemi: new THREE.Color('#b8a48a') },
};
const VIEW_RADIUS = 48;

export class RenderManager {
  constructor(game, container) {
    this.game = game;
    this.container = container;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);
    r.domElement.id = 'game-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.scene.fog = new THREE.Fog(SKY.normal.fog.clone(), 38, 95);

    // sky dome
    this.skyUniforms = { top: { value: SKY.normal.top.clone() }, horizon: { value: SKY.normal.horizon.clone() } };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.6 + 0.05, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.7)), 1.0); }',
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), skyMat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    // lights
    this.hemi = new THREE.HemisphereLight(SKY.normal.hemi.clone(), 0x5a4a32, 1.15);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(SKY.normal.sun.clone(), 2.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.sunOffset = new THREE.Vector3(-28, 48, 22);
    // warm 'torch' light that follows the player in dark areas
    this.torch = new THREE.PointLight(0xffb070, 0, 14, 1.2);
    this.scene.add(this.torch);

    this.terrain = new TerrainMesh(this.scene, game.world);
    this.scenery = new SceneryRenderer(this, game);
    this.charGroup = new THREE.Group();
    this.scene.add(this.charGroup);
    this.views = new Map();
    this.cameraCtl = new CameraController(this.camera, r.domElement);
    this.overlays = new Overlays(this);
    this.effects = new Effects(this);
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.time = 0;
    this.fps = 0;
    this._fpsAcc = 0; this._fpsN = 0;
    this.atmos = 0;

    // views
    this.addView(game.player);
    for (const n of game.npcs.values()) this.addView(n);
    for (const p of game.remotePlayers.values()) this.addView(p);
    const ev = game.events;
    ev.on('npc:add', ({ npc }) => this.addView(npc));
    ev.on('npc:remove', ({ npc }) => this.removeView(npc));
    ev.on('remote:add', ({ remote }) => this.addView(remote));
    ev.on('remote:remove', ({ remote }) => this.removeView(remote));
    ev.on('teleport', ({ entity }) => { if (entity === game.player) this.snapCamera = true; });

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.snapCamera = true;
  }

  addView(e) { if (!this.views.has(e.uid)) this.views.set(e.uid, new CharacterView(this, e)); }
  removeView(e) { const v = this.views.get(e.uid); if (v) { v.dispose(); this.views.delete(e.uid); } }
  viewFor(e) { return this.views.get(e.uid) || null; }

  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.width = w; this.height = h;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  applySettings() {
    const s = this.game.player.settings;
    this.renderer.shadowMap.enabled = !!s.shadows;
    this.sun.castShadow = !!s.shadows;
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    const dd = [0.75, 1, 1.4][s.drawDistance ?? 1] || 1;
    this.scene.fog.near = 38 * dd; this.scene.fog.far = 95 * dd;
  }

  /** Mix sky/fog/sun between normal, wilderness and cave palettes. */
  updateAtmosphere(dt) {
    const p = this.game.player;
    const wl = this.game.world.getWildernessLevel(p.x, p.y);
    const area = this.game.world.getArea(p.x, p.y);
    const target = area?.dungeon ? 2 : wl > 0 ? Math.min(1, 0.35 + wl / 40) : 0;
    this.atmos += (target - this.atmos) * Math.min(1, dt * 1.5);
    const a = this.atmos;
    const mix = (k, out) => {
      if (a <= 1) out.copy(SKY.normal[k]).lerp(SKY.wild[k], a);
      else out.copy(SKY.wild[k]).lerp(SKY.cave[k], a - 1);
      return out;
    };
    mix('top', this.skyUniforms.top.value);
    mix('horizon', this.skyUniforms.horizon.value);
    mix('fog', this.scene.fog.color);
    mix('sun', this.sun.color);
    mix('hemi', this.hemi.color);
    this.sun.intensity = a > 1 ? 2.0 - (a - 1) * 1.2 : 2.0 - a * 0.4;
    this.torch.intensity = Math.max(0, a - 1) * 40;
  }

  frame() {
    const dt = Math.min(0.1, this.clock.getDelta());
    this.time += dt;
    const now = performance.now();
    const game = this.game;
    const alpha = game.tickProgress;
    const p = game.player;

    // fps
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 0.5) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }

    // characters (cull by distance from the player)
    const visible = [];
    for (const v of this.views.values()) {
      const e = v.entity;
      if (Math.abs(e.x - p.x) > VIEW_RADIUS || Math.abs(e.y - p.y) > VIEW_RADIUS) { v.group.visible = false; continue; }
      v.update(dt, this.time, alpha, now);
      if (v.group.visible) visible.push(v);
    }

    // camera follows the interpolated player position
    const pv = this.viewFor(p);
    const focus = pv.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
    if (this.snapCamera) { this.cameraCtl.target.copy(focus); this.snapCamera = false; }
    this.cameraCtl.update(dt, focus);
    this.sky.position.copy(this.camera.position);
    this.torch.position.set(pv.pos.x, pv.pos.y + 2.2, pv.pos.z);

    // sun + shadow camera follow the player (snapped to texels to avoid shimmering)
    const t = this.cameraCtl.target;
    const texel = 60 / 2048;
    const sx = Math.round(t.x / texel) * texel, sz = Math.round(t.z / texel) * texel;
    this.sun.target.position.set(sx, t.y, sz);
    this.sun.position.set(sx + this.sunOffset.x, t.y + this.sunOffset.y, sz + this.sunOffset.z);

    this.updateAtmosphere(dt);
    this.terrain.update(this.time);
    this.scenery.update(this.time);
    this.effects.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.overlays.update(visible, now);
  }

  /** Project a world position to screen pixels. */
  toScreen(vec) {
    const v = vec.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, visible: v.z < 1 };
  }

  /**
   * Raycast at screen coords. Returns { tile: {x,y}|null, entities: [entity...] } with entities ordered
   * nearest first (characters, objects, ground items). Objects whose footprint covers the hovered
   * tile are appended so flat/thin objects remain clickable.
   */
  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const out = { tile: null, entities: [], point: null };
    const thits = this.raycaster.intersectObjects(this.terrain.pickables(), false);
    let maxDist = Infinity;
    if (thits.length) {
      const pt = thits[0].point;
      out.point = pt;
      out.tile = { x: Math.floor(pt.x), y: Math.floor(pt.z) };
      maxDist = thits[0].distance + 0.6;
    }
    const cand = [];
    const hb = [];
    for (const v of this.views.values()) if (v.group.visible && v.entity !== this.game.player) hb.push(v.rig.hitbox);
    for (const h of this.raycaster.intersectObjects(hb, false)) cand.push({ e: h.object.userData.entity, d: h.distance - 0.4 });
    for (const h of this.raycaster.intersectObjects(this.scenery.pickables(), true)) {
      const e = this.scenery.entityFromHit(h);
      if (e) cand.push({ e, d: h.distance });
    }
    cand.sort((a, b) => a.d - b.d);
    const seen = new Set();
    for (const c of cand) {
      if (c.d > maxDist + 2 || seen.has(c.e)) continue;
      if (c.e.type === 'ground' && !this.game.canSeeGroundItem(c.e)) continue;
      seen.add(c.e); out.entities.push(c.e);
    }
    if (out.tile) {
      for (const g of this.game.groundItemsAt(out.tile.x, out.tile.y)) if (!seen.has(g)) { seen.add(g); out.entities.push(g); }
      for (const o of this.game.world.objectsAt(out.tile.x, out.tile.y)) if (!seen.has(o) && !o.hidden && o.def.options?.length) { seen.add(o); out.entities.push(o); }
    }
    return out;
  }
}
