// RenderManager: three.js scene, sky + day/night, lights, weather, terrain, scenery, characters,
// overlays, effects, post-processing, picking.

import * as THREE from 'three';
import { TerrainMesh, WATER } from './terrainmesh.js';
import { SceneryRenderer } from './scenery.js';
import { CharacterView } from './characters.js';
import { CameraController } from './camera.js';
import { Overlays } from './overlays.js';
import { Effects } from './effects.js';
import { DayNight, phaseOf, worldDayT, DAY_MS } from './daynight.js';
import { LightManager } from './lights.js';
import { Weather } from './weather.js';
import { PostFX } from './post.js';
import { GLOBAL, POINT_SCALE } from './materials.js';
import { TERRAIN_TYPES } from '../world/terrain.js';

const C = (h) => new THREE.Color(h);
// region palettes: the wilderness tints the time-of-day palette (colour ratio vs. the normal day),
// caves replace it (no day/night underground)
const DAY = { top: C('#5a8fd0'), horizon: C('#c9dcea'), fog: C('#bcd2e2'), light: C('#fff2dc'), hemi: C('#cfe2ff') };
const WILD = { top: C('#3a2c30'), horizon: C('#8a6a5a'), fog: C('#6e584c'), light: C('#ffc8a0'), hemi: C('#b09080') };
const CAVE = { top: C('#080605'), horizon: C('#1c1612'), fog: C('#16110d'), light: C('#a08a6a'), hemi: C('#b8a48a') };
const WILD_RATIO = Object.fromEntries(Object.keys(DAY).map((k) => [k, new THREE.Color(WILD[k].r / DAY[k].r, WILD[k].g / DAY[k].g, WILD[k].b / DAY[k].b)]));
const VIEW_RADIUS = 48;
const isMobile = () => (window.matchMedia?.('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900) || window.innerWidth < 600;

/**
 * Graphics presets (Settings > Graphics). 'auto' picks one from the device (deviceTier) and lets auto quality step
 * it down; 'custom' = the individual toggles (shadows / high quality / draw distance) exactly as set.
 *   dpr: pixel-ratio cap · post: bloom/grading pass · lights: pooled PointLights · weather/fx: particle share ·
 *   draw: draw distance index · cull: clip the camera just past the fog · cheapWater: no glints/noise · view: char radius ·
 *   charShadow: only characters within this many tiles cast shadows (0 = all)
 */
export const GRAPHICS_PRESETS = {
  low: { label: 'Low', dpr: 1, shadows: false, post: false, shadowMap: 1024, lights: 2, weather: 0.3, fx: 0.5, draw: 0, cull: true, cheapWater: true, view: 36 },
  medium: { label: 'Medium', dpr: 1.25, shadows: true, post: false, shadowMap: 1024, lights: 4, weather: 0.55, fx: 1, draw: 1, cull: false, cheapWater: false, view: VIEW_RADIUS, charShadow: 14 },
  high: { label: 'High', dpr: 1.5, shadows: true, post: true, shadowMap: 2048, lights: 8, weather: 1, fx: 1, draw: 1, cull: false, cheapWater: false, view: VIEW_RADIUS },
};
const TIERS = ['low', 'medium', 'high'];

/** Best preset for this device: phones / low memory -> low, tablets / small CPUs -> medium, else high. */
export function deviceTier() {
  const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height);
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
  if ((coarse && small < 600) || window.innerWidth < 600 || mem <= 2 || cores <= 2) return 'low';
  if ((coarse && small < 1100) || mem <= 4 || cores <= 4) return 'medium';
  return 'high';
}
const lum = (c) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
const _col = new THREE.Color(), _col2 = new THREE.Color(), _v = new THREE.Vector3();

export class RenderManager {
  constructor(game, container) {
    this.game = game;
    this.container = container;
    this.mobile = isMobile();
    this.tier = deviceTier();
    this.viewRadius = VIEW_RADIUS;
    this.fpsCap = 0;
    this._lastFrame = 0;
    this.skipped = false;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.info.autoReset = false; // reset once per frame (frame()), so post-processing passes are counted too
    container.appendChild(r.domElement);
    r.domElement.id = 'game-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.scene.fog = new THREE.Fog(DAY.fog.clone(), 38, 95);

    // sky dome (gradient, sun, moon, stars)
    this.dayNight = new DayNight();
    this.sky = this.dayNight.buildSky();
    this.skyUniforms = this.dayNight.uniforms;
    this.scene.add(this.sky);

    // lights
    this.hemi = new THREE.HemisphereLight(DAY.hemi.clone(), 0x5a4a32, 1.15);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(DAY.light.clone(), 2.0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.sunOffset = new THREE.Vector3(-28, 48, 22);
    // warm 'torch' light that follows the player in dark areas (and a faint lantern glow at night)
    this.torch = new THREE.PointLight(0xffb070, 0, 14, 1.2);
    this.scene.add(this.torch);
    this.lights = new LightManager(this, 8);
    this.lights.addLava(game.world, TERRAIN_TYPES);

    this.terrain = new TerrainMesh(this.scene, game.world);
    this.scenery = new SceneryRenderer(this, game);
    this.charGroup = new THREE.Group();
    this.scene.add(this.charGroup);
    this.views = new Map();
    this.cameraCtl = new CameraController(this.camera, r.domElement);
    this.overlays = new Overlays(this);
    this.effects = new Effects(this);
    this.weather = new Weather(this);
    this.post = null;
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();
    this.time = 0;
    this.fps = 0;
    this._fpsAcc = 0; this._fpsN = 0;
    this.atmos = 0;
    this.env = { lightK: 0, haloK: 0, smokeCol: new THREE.Color(), smokeA: 0.5 };

    // CSS vignette (used when the post-processing pass is off)
    this.vignette = document.createElement('div');
    this.vignette.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(10,8,20,0.32) 100%);';
    r.domElement.after(this.vignette);

    // shared time of day
    game.time = { t: 0, phase: 'day', worldT: 0, worldPhase: 'day', dayLength: DAY_MS, night: 0, alwaysDay: false };

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
    this.applySettings();
  }

  addView(e) { if (!this.views.has(e.uid)) this.views.set(e.uid, new CharacterView(this, e)); }
  removeView(e) { const v = this.views.get(e.uid); if (v) { v.dispose(); this.views.delete(e.uid); } }
  viewFor(e) { return e ? this.views.get(e.uid) || null : null; }

  resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.width = w; this.height = h;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Settings defaults that depend on the device (called before reading them). */
  settingsDefaults(s) {
    if (s.graphics === undefined) {
      // older saves: phones move to Auto; on other devices keep hand-tuned toggles as 'custom'
      const t = GRAPHICS_PRESETS[this.tier];
      const hq = s.highQuality === undefined ? !this.mobile : !!s.highQuality;
      const same = hq === t.post && !!s.shadows === t.shadows && (s.drawDistance ?? 1) === t.draw;
      s.graphics = this.mobile || same || s.highQuality === undefined ? 'auto' : 'custom';
    }
    if (s.highQuality === undefined) s.highQuality = !this.mobile;
    if (s.alwaysDay === undefined) s.alwaysDay = false;
    if (s.weather === undefined) s.weather = true;
    if (s.fpsCap === undefined) s.fpsCap = this.mobile ? 60 : 0;
  }

  /** The preset in effect ('low' | 'medium' | 'high') or null for 'custom'. */
  graphicsTier(s = this.game.player.settings) {
    if (s.graphics === 'custom') return null;
    if (GRAPHICS_PRESETS[s.graphics]) return s.graphics;
    // auto: the device tier, possibly lowered by auto quality (s.autoCap)
    const cap = TIERS.indexOf(s.autoCap);
    return TIERS[Math.min(TIERS.indexOf(this.tier), cap < 0 ? 2 : cap)];
  }

  /** Choose a graphics preset ('auto' | 'low' | 'medium' | 'high' | 'custom') and apply it. */
  setGraphics(name) {
    const s = this.game.player.settings;
    s.graphics = name;
    if (name === 'auto') delete s.autoCap;
    this.applySettings();
  }

  applySettings() {
    const s = this.game.player.settings;
    this.settingsDefaults(s);
    const tier = this.graphicsTier(s);
    const P = tier ? GRAPHICS_PRESETS[tier] : null;
    if (P) { s.highQuality = P.post; s.shadows = P.shadows; s.drawDistance = P.draw; } // toggles mirror the preset
    const hq = !!s.highQuality;
    // custom = the pre-preset behaviour: high quality decides pixel ratio, lights and particles
    const Q = P || { dpr: hq ? 1.5 : 1.25, shadowMap: hq ? 2048 : 1024, lights: hq ? 8 : 4, weather: hq ? 1 : 0.55, fx: 1, cull: false, cheapWater: false, view: VIEW_RADIUS };
    this.quality = { tier: tier || 'custom', ...Q };
    this.renderer.shadowMap.enabled = !!s.shadows;
    this.sun.castShadow = !!s.shadows;
    const sm = Q.shadowMap;
    if (this.sun.shadow.mapSize.x !== sm) { this.sun.shadow.mapSize.set(sm, sm); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr));
    this.resize();
    const n = Q.lights;
    if (this.lights.pool.length !== n) this.lights.setCount(n);
    this.weather.quality = Q.weather;
    this.weather.enabled = s.weather !== false;
    this.effects.setQuality?.(Q.fx);
    this.terrain.setCheapWater?.(Q.cheapWater);
    this.viewRadius = Q.view;
    this.shadowRadius = Q.charShadow || 0;
    if (!this.shadowRadius) for (const v of this.views.values()) if (v._sh === false) this.charShadow(v, true);
    if (hq && !this.post) this.post = new PostFX(this.renderer);
    if (!hq && this.post) { this.post.dispose(); this.post = null; }
    this.vignette.style.display = hq || tier === 'low' ? 'none' : '';
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    const dd = [0.75, 1, 1.4][s.drawDistance ?? 1] || 1;
    this.drawScale = dd;
    // Low: clip the camera just past the fog so far terrain chunks are culled (the sky dome shrinks to fit)
    const far = Q.cull ? 95 * dd + 30 : 500;
    if (this.camera.far !== far) { this.camera.far = far; this.camera.updateProjectionMatrix(); this.sky.scale.setScalar(Math.min(1, (far * 0.9) / 400)); }
    this.fpsCap = Number(s.fpsCap) || 0;
  }

  /**
   * Frame pacing: true when this animation frame should not render (tab hidden, the world map covers the whole
   * screen on a phone, or the frame-rate limit says wait). Ticks keep running regardless.
   */
  skipFrame(now) {
    if (document.hidden) return true;
    const wm = this.game.ui?.worldMap;
    if (wm?.isOpen && document.documentElement.classList.contains('m')) return true;
    const cap = this.minFrameMs ? Math.min(this.fpsCap || 1000, 1000 / this.minFrameMs) : this.fpsCap; // minFrameMs: e.g. behind character creation
    if (!cap) return false;
    const iv = 1000 / cap;
    if (now - this._lastFrame < iv - 2) return true; // 2 ms slack for rAF jitter
    this._lastFrame = Math.max(this._lastFrame + iv, now - iv);
    return false;
  }

  /**
   * Auto quality: if the game keeps running below ~30 fps (visible tab, game started), step the graphics preset
   * down (High -> Medium -> Low); with custom settings turn high quality off, then shadows, then shorten the draw
   * distance, telling the player once each. Settings > 'Auto quality' disables it.
   */
  autoQuality() {
    const g = this.game, s = g.player?.settings;
    if (!s || !g.started || document.hidden || s.autoQuality === false) { this._slow = 0; return; }
    const slowBelow = Math.min(this.mobile ? 26 : 30, this.fpsCap ? this.fpsCap - 4 : 99);
    if (this.fps >= slowBelow) { this._slow = Math.max(0, (this._slow || 0) - 1); return; }
    if (++this._slow < 10) return; // ~5 s of sustained low frame rate
    this._slow = 0;
    const tier = this.graphicsTier(s);
    if (tier) {
      if (tier === 'low') return;
      const next = TIERS[TIERS.indexOf(tier) - 1];
      if (s.graphics === 'auto') s.autoCap = next; else s.graphics = next;
      g.message(`<col=8a5a00>The game was running slowly, so graphics were lowered to ${GRAPHICS_PRESETS[next].label} (Settings tab to change).</col>`);
    } else if (s.highQuality) {
      s.highQuality = false;
      g.message('<col=8a5a00>The game was running slowly, so high quality graphics were turned off (Settings tab to change).</col>');
    } else if (s.shadows) {
      s.shadows = false;
      g.message('<col=8a5a00>The game was running slowly, so shadows were turned off (Settings tab to change).</col>');
    } else if ((s.drawDistance ?? 1) > 0) {
      s.drawDistance = (s.drawDistance ?? 1) - 1;
      g.message('<col=8a5a00>The game was running slowly, so the draw distance was reduced (Settings tab to change).</col>');
    } else return;
    this.applySettings();
    g.ui?.refreshTab?.('settings');
  }

  /** Time of day + region (normal / wilderness / cave) + weather -> sky, fog, lights, glow, water, grading. */
  updateAtmosphere(dt) {
    const g = this.game, p = g.player, s = p.settings;
    const wl = g.world.getWildernessLevel(p.x, p.y);
    const area = g.world.getArea(p.x, p.y);
    const target = area?.dungeon ? 2 : wl > 0 ? Math.min(1, 0.35 + wl / 40) : 0;
    this.atmos += (target - this.atmos) * Math.min(1, dt * 1.5);
    const a = this.atmos;

    // time of day
    const t = this.dayNight.t(s.alwaysDay);
    const D = this.dayNight.sample(t);
    const T = g.time;
    const wt = worldDayT();
    T.t = t; T.worldT = wt; T.worldPhase = phaseOf(wt); T.alwaysDay = !!s.alwaysDay; T.night = D.night;
    const ph = phaseOf(t);
    if (ph !== T.phase || !this._phaseSent) {
      const prev = this._phaseSent ? T.phase : null;
      T.phase = ph; this._phaseSent = true;
      g.events.emit('time:phase', { phase: ph, prev, t });
    }

    const W = this.weather;
    // the frozen north keeps its white snow: weaker wilderness tint there
    const cl = W.state.climate;
    this.snowy = (this.snowy ?? 0) + ((cl === 'snow' ? 0.7 : cl === 'northwild' ? 0.4 : 0) - (this.snowy ?? 0)) * Math.min(1, dt * 1.5);
    const cave = Math.max(0, a - 1), wild = Math.min(1, a) * (1 - this.snowy);
    const night = D.night * (1 - cave);
    const overcast = W.overcast * (1 - cave);
    const mixK = (k, base, out) => {
      out.copy(base);
      _col.copy(base).multiply(WILD_RATIO[k]);
      out.lerp(_col, wild);
      if (cave > 0) out.lerp(CAVE[k], cave);
      return out;
    };
    const U = this.skyUniforms;
    mixK('top', D.top, U.top.value);
    mixK('horizon', D.horizon, U.horizon.value);
    // overcast skies go grey
    for (const c of [U.top.value, U.horizon.value]) { const l = lum(c); _col.setRGB(l, l, l).multiplyScalar(1.1); c.lerp(_col, overcast * 0.6); }
    U.sunDir.value.copy(D.sunDir); U.moonDir.value.copy(D.moonDir);
    U.sunCol.value.copy(D.light); U.sunVis.value = D.sunVis * (1 - overcast * 0.8) * (1 - cave);
    U.moonVis.value = D.moonVis * (1 - overcast) * (1 - cave); U.starVis.value = D.starVis * (1 - overcast) * (1 - cave);
    U.time.value = this.time;

    // fog: time-of-day colour, tinted by region, blended towards the weather's fog colour
    const fog = this.scene.fog;
    mixK('fog', D.fog, fog.color);
    const bright = Math.min(1, Math.max(0.18, lum(D.fog) / lum(DAY.fog)));
    _col2.copy(W.fogColor).multiplyScalar(bright);
    fog.color.lerp(_col2, Math.min(0.85, W.fog * 0.8 + overcast * 0.3) * (1 - cave * 0.7));
    const wfog = W.fog * (cave > 0.5 ? 0.6 : 1);
    const dd = this.drawScale || 1;
    fog.near = 38 * dd * (1 - 0.9 * wfog) * (1 - 0.15 * night);
    fog.far = 95 * dd * (1 - 0.6 * wfog) * (1 - 0.1 * night);

    // sun / moon light
    mixK('light', D.light, this.sun.color);
    this.sun.intensity = D.lightI * (1 - overcast * 0.55) * (cave > 0 ? 1 - cave * 0.6 : 1 - wild * 0.2);
    this.sunOffset.copy(D.lightDir).multiplyScalar(60);
    mixK('hemi', D.hemi, this.hemi.color);
    this.hemi.groundColor.copy(D.ground).lerp(_col.set(0x3a3024), cave);
    this.hemi.intensity = (D.hemiI * (1 - overcast * 0.12)) * (1 - cave) + 1.15 * cave + W.flash * 2.2;
    if (W.flash > 0) { U.top.value.lerp(_col.set(0xdde4ff), W.flash * 0.6); U.horizon.value.lerp(_col, W.flash * 0.6); }
    this.torch.intensity = cave * 32 + night * 6 * (1 - cave);
    this.torch.distance = cave > 0.5 ? 14 : 10;

    // glow, windows, rim light, water, smoke, pooled lights
    GLOBAL.uGlow.value = Math.max(D.glow, cave, overcast * 0.35);
    GLOBAL.uWindowGlow.value.setRGB(1.0, 0.68, 0.34).multiplyScalar(Math.min(1.2, night * 1.25 + overcast * 0.25 + (D.glow > 0.4 ? 0.2 : 0)) * (1 - cave));
    GLOBAL.uRim.value.copy(this.hemi.color).multiplyScalar(0.16 + 0.22 * night + 0.1 * cave);
    WATER.uSky.value.copy(U.horizon.value).lerp(this.hemi.color, 0.3).multiplyScalar(0.7 + 0.3 * (1 - night));
    WATER.uSpark.value = (D.sunVis * (1 - overcast) + D.moonVis * 0.35 * (1 - overcast)) * (1 - cave);
    this.env.smokeCol.copy(this.hemi.color).multiplyScalar(Math.min(1, 0.35 + this.hemi.intensity * 0.45));
    this.env.smokeA = 0.36;
    this.env.lightK = cave > 0.5 ? 1 : 0.12 + 0.88 * Math.max(night, overcast * 0.35, D.glow * 0.8);
    this.env.haloK = cave > 0.5 ? 0.85 : Math.max(0, night * 0.95 + overcast * 0.1 - 0.05);

    // colour grading (post pass) by time of day
    if (this.post) {
      const G = this.post.grade;
      const dusk = Math.max(0, 1 - Math.abs(D.sunElev) * 6) * (1 - night * 0.6);
      G.tint.setRGB(1, 1, 1).lerp(_col.setRGB(0.9, 0.95, 1.12), night).lerp(_col.setRGB(1.08, 0.98, 0.9), dusk * 0.6);
      G.sat = 1.1 - night * 0.08 - overcast * 0.1;
      G.contrast = 1.06;
      G.vignette = 0.32 + night * 0.15 + cave * 0.15;
      G.bloom = 0.22 + night * 0.55 + cave * 0.12;
      G.threshold = 1.25 - Math.max(night, cave * 0.4) * 0.6;
    }
  }

  frame() {
    // input.update / ui.update read `skipped` too, so a skipped frame costs (almost) nothing
    this.skipped = this.skipFrame(performance.now());
    if (this.skipped) return;
    const t0 = performance.now();
    this._frame();
    // CPU time of the last rendered frames (exponential average, ms) - Settings > Show FPS
    this.cpuMs = (this.cpuMs ?? 0) * 0.9 + (performance.now() - t0) * 0.1;
  }

  _frame() {
    this.renderer.info.reset();
    const dt = Math.min(0.1, this.clock.getDelta());
    this.time += dt;
    GLOBAL.uTime.value = this.time;
    const now = performance.now();
    const game = this.game;
    const alpha = game.tickProgress;
    const p = game.player;

    // fps
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 0.5) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; this.autoQuality(); }

    // characters (cull by distance from the player)
    const visible = [];
    const VR = this.viewRadius;
    const SR = this.shadowRadius; // medium: only characters near the player cast shadows (the shadow pass is per mesh)
    for (const v of this.views.values()) {
      const e = v.entity;
      if (Math.abs(e.x - p.x) > VR || Math.abs(e.y - p.y) > VR) { v.group.visible = false; continue; }
      v.update(dt, this.time, alpha, now);
      if (v.group.visible) { visible.push(v); if (SR) this.charShadow(v, Math.abs(e.x - p.x) <= SR && Math.abs(e.y - p.y) <= SR); }
    }

    // camera follows the interpolated player position
    const pv = this.viewFor(p);
    const focus = _v.copy(pv.pos).add({ x: 0, y: 1.0, z: 0 });
    if (this.snapCamera) { this.cameraCtl.target.copy(focus); this.snapCamera = false; }
    this.cameraCtl.update(dt, focus);
    this.sky.position.copy(this.camera.position);
    this.torch.position.set(pv.pos.x, pv.pos.y + 2.2, pv.pos.z);
    POINT_SCALE.value = this.renderer.getContext().drawingBufferHeight * 0.5 * this.camera.projectionMatrix.elements[5];

    this.updateAtmosphere(dt);

    // sun + shadow camera follow the player (snapped to texels to avoid shimmering)
    const t = this.cameraCtl.target;
    const texel = 60 / this.sun.shadow.mapSize.x;
    const sx = Math.round(t.x / texel) * texel, sz = Math.round(t.z / texel) * texel;
    this.sun.target.position.set(sx, t.y, sz);
    this.sun.position.set(sx + this.sunOffset.x, t.y + this.sunOffset.y, sz + this.sunOffset.z);

    const night = game.time.night;
    this.weather.update(dt, this.time, t, night);
    this.lights.update(dt, this.time, t, this.env);
    this.terrain.update(this.time);
    this.scenery.update(this.time, this.env);
    this.effects.update(dt);
    if (this.post) this.post.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
    this.overlays.update(visible, now);
  }

  /** Turn a character's shadow casting on/off (only touches its meshes when the state or the rig changes). */
  charShadow(v, on) {
    if (v.meshes !== v._shMeshes) { v._shMeshes = v.meshes; v._sh = true; } // rebuilt rig: casts by default
    if (on === v._sh || !v.meshes) return;
    v._sh = on;
    for (const m of v.meshes) m.castShadow = on;
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
