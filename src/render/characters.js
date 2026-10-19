// CharacterView: renders a Character (player / npc / remote player) with tick interpolation
// and procedural animation (smoothed walk/run blending, idle breathing + look-around, per-weapon
// attack swings, a falling death, hit flash, running dust).

import * as THREE from 'three';
import { buildCharacter } from './models.js';
import { CHAR_MATERIAL, HIT_MATERIAL } from './materials.js';
import { getItem } from '../core/registry.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Item shown in hand while an action runs (action.tool), if it has a weapon-like visual. */
function toolOf(e) {
  const id = e.action?.tool;
  const def = id && getItem(id);
  return def && (def.slot === 'weapon' || def.model?.shape) ? id : null;
}

/** Model description for an entity. */
export function modelForEntity(e) {
  if (e.type === 'npc') {
    const m = e.def.model;
    return { ...m, equipment: m.equipment || {} };
  }
  const a = e.appearance;
  const equipment = { ...(e.type === 'player' ? e.equipment.ids() : e.equipmentIds || {}) };
  const tool = toolOf(e);
  if (tool) equipment.weapon = tool;
  return {
    template: 'human',
    colors: { skin: a.skin, hair: a.hair, top: a.top, legs: a.legs, boots: a.boots, hands: a.hands },
    hairStyle: a.hairStyle,
    female: a.body === 'female',
    equipment,
  };
}

export class CharacterView {
  constructor(rm, entity) {
    this.rm = rm;
    this.entity = entity;
    this.group = new THREE.Group();
    this.group.userData.entity = entity;
    this.rig = null;
    this.version = -1;
    this.angle = entity.faceAngle;
    this.phase = 0;
    this.moveK = 0;   // smoothed 0 idle .. 1 moving
    this.runK = 0;    // smoothed 0 walk .. 1 run
    this.seed = (((entity.uid ?? 0) * 0.618) % 1) * 10;
    this.flashUntil = 0;
    this.flashing = false;
    this.meshes = [];
    this.pos = new THREE.Vector3();
    rm.charGroup.add(this.group);
    this.rebuild();
  }

  rebuild() {
    if (this.rig) this.group.remove(this.rig.root);
    this.rig = buildCharacter(modelForEntity(this.entity));
    this.rig.hitbox.userData.entity = this.entity;
    this.group.add(this.rig.root);
    this.version = this.versionKey();
    this.meshes = [];
    this.rig.root.traverse((m) => { if (m.isMesh && m !== this.rig.hitbox && m.material === CHAR_MATERIAL) this.meshes.push(m); });
    this.flashing = false;
  }

  versionKey() { return `${this.entity.appearanceVersion}|${toolOf(this.entity) || ''}`; }

  dispose() { this.rm.charGroup.remove(this.group); }

  /** Brief red-white flash (taking damage). */
  flash(ms = 150) { this.flashUntil = performance.now() + ms; }

  /** Interpolated tile-space position (x, z) of the entity right now. */
  interpolated(alpha) {
    const e = this.entity, s = e.steps;
    const off = e.size / 2;
    if (!s || s.length < 2 || e.teleported) return [e.x + off, e.y + off, false, 0];
    const p = alpha * (s.length - 1);
    const i = Math.min(s.length - 2, Math.floor(p));
    const f = p - i;
    return [lerp(s[i].x, s[i + 1].x, f) + off, lerp(s[i].y, s[i + 1].y, f) + off, alpha < 1, s.length - 1];
  }

  update(dt, time, alpha, now) {
    const e = this.entity;
    if (this.versionKey() !== this.version) this.rebuild();
    const deathDone = e.dead && e.anim?.name === 'death' && now - e.anim.start > (e.anim.duration || 1800) + 400;
    this.group.visible = !e.hidden && !(e.type !== 'player' && deathDone && e.type === 'npc');
    if (!this.group.visible) return;

    const [x, z, moving, tilesPerTick] = this.interpolated(alpha);
    const world = this.rm.game.world;
    let y = world.heightAt(x, z);
    const inWater = world.isWater(Math.floor(x), Math.floor(z));
    if (inWater) y = Math.max(y, world.waterLevel - 0.2);
    // optional vertical offset (agility rooftops/treetops): entity.elevation or remote extra.elevation
    const elev = e.elevation ?? e.extra?.elevation ?? 0;
    this.elev = (this.elev ?? elev) + (elev - (this.elev ?? elev)) * Math.min(1, dt * 8);
    y += this.elev;
    this.pos.set(x, y, z);
    this.group.position.copy(this.pos);

    // facing
    const target = e.faceAngle;
    let diff = target - this.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.angle += diff * Math.min(1, dt * 12);
    this.group.rotation.y = this.angle;

    const running = tilesPerTick >= 2;
    this.moveK += ((moving ? 1 : 0) - this.moveK) * Math.min(1, dt * (moving ? 10 : 7));
    this.runK += (((moving && running) ? 1 : 0) - this.runK) * Math.min(1, dt * 6);
    const prevPhase = this.phase;
    if (moving) this.phase += dt * (running ? 14.5 : 9.5);
    // running kicks up a little dust on each foot strike (only near the camera)
    if (running && moving && !inWater && this.rig.kind === 'biped' && Math.floor(prevPhase / Math.PI) !== Math.floor(this.phase / Math.PI)) {
      const fx = this.rm.effects?.debris;
      const p = this.rm.game.player;
      if (fx && Math.abs(e.x - p.x) < 20 && Math.abs(e.y - p.y) < 20) {
        for (let i = 0; i < 2; i++) fx.emit(x + (Math.random() - 0.5) * 0.3, y + 0.05, z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6, 0x9a8a72, 0.45, 0.06, -1.5, 2, 0.11);
      }
    }
    const anim = e.anim && now - e.anim.start < (e.anim.duration || 1200) ? e.anim : null;
    const deathAnim = e.dead && e.anim?.name === 'death' ? e.anim : null;
    const cur = deathAnim || anim;
    const st = {
      moving, running, phase: this.phase, time, moveK: this.moveK, runK: this.runK, seed: this.seed,
      anim: cur, t: cur ? (now - cur.start) / (cur.duration || 1200) : 0,
      loop: e.loopAnim,
    };
    ANIMATORS[this.rig.kind]?.(this.rig, st);

    // hit flash: swap the rig to the flash material for a few frames
    const fl = now < this.flashUntil;
    if (fl !== this.flashing) {
      this.flashing = fl;
      for (const m of this.meshes) m.material = fl ? HIT_MATERIAL : CHAR_MATERIAL;
    }
  }

  /** World position of the overhead anchor (for hitsplats / text). */
  headPosition(out) {
    return out.set(this.pos.x, this.pos.y + this.rig.height + (this.rig.flying ? 0.8 : 0.25), this.pos.z);
  }
}

// ------------------------------------------------------------------------------------------------
// Animators
// ------------------------------------------------------------------------------------------------
function resetRoot(rig) {
  rig.root.rotation.set(0, 0, 0);
  rig.root.position.set(0, 0, 0);
}

/** Brief stagger, a gravity-like fall, a small bounce, then a slow sink after the animation. */
function deathPose(rig, t, axis = 'x') {
  const s = clamp01(t / 0.18);
  const f = clamp01((t - 0.12) / 0.42);
  const k = f * f;
  const bounce = f >= 1 ? Math.sin(clamp01((t - 0.54) / 0.18) * Math.PI) * 0.06 : 0;
  const lean = Math.sin(s * Math.PI) * 0.12 * (1 - f);
  if (axis === 'x') { rig.root.rotation.x = -(Math.PI / 2) * k + lean - bounce; rig.root.position.y = 0.12 * k; }
  else { rig.root.rotation.z = (Math.PI / 2) * k - bounce; rig.root.position.y = 0.05 * k; }
  if (t > 1) rig.root.position.y -= (t - 1) * 0.5;
}

/** 3-key pose curve: 0 -> wind-up (a) -> strike (b) -> 0; tw = wind-up end, ts = strike end. */
const curve = (t, a, b, tw = 0.38, ts = 0.58) => (t < tw ? lerp(0, a, easeOut(t / tw)) : t < ts ? lerp(a, b, smoothstep(0, 1, (t - tw) / (ts - tw))) : lerp(b, 0, smoothstep(0, 1, (t - ts) / (1 - ts))));

function animateBiped(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  for (const k of ['legL', 'legR', 'armL', 'armR', 'torso', 'head']) P[k].rotation.set(0, 0, 0);
  P.body.position.y = rig.legLen;
  P.body.rotation.set(0, 0, 0);
  P.torso.scale.set(1, 1, 1);

  const mk = st.moveK, rk = st.runK, ik = 1 - mk;
  const sw = Math.sin(st.phase);
  const legAmp = (0.55 + 0.4 * rk) * mk;
  P.legL.rotation.x = sw * legAmp;
  P.legR.rotation.x = -sw * legAmp;
  const armAmp = (0.45 + 0.5 * rk) * mk;
  P.armL.rotation.x = -sw * armAmp - 0.25 * rk * mk;
  P.armR.rotation.x = sw * armAmp - 0.25 * rk * mk;
  P.armL.rotation.z = -0.06 - 0.12 * rk * mk;
  P.armR.rotation.z = 0.06 + 0.12 * rk * mk;
  // bob (two bumps per stride), pelvis twist with torso counter-twist, run lean, steady head
  P.body.position.y = rig.legLen + Math.abs(Math.cos(st.phase)) * (0.035 + 0.04 * rk) * mk - 0.03 * rk * mk;
  P.body.rotation.y = -sw * 0.08 * mk;
  P.torso.rotation.y = sw * 0.16 * mk;
  P.torso.rotation.x = (0.04 + 0.2 * rk) * mk;
  P.torso.rotation.z = Math.cos(st.phase) * 0.03 * mk;
  P.head.rotation.y = -sw * 0.08 * mk;
  P.head.rotation.x = -P.torso.rotation.x * 0.6;
  // idle: breathing + an occasional look around
  if (ik > 0.01) {
    const br = Math.sin(st.time * 1.9 + st.seed);
    P.torso.scale.set(1 + br * 0.012 * ik, 1 + br * 0.01 * ik, 1 + br * 0.018 * ik);
    P.torso.rotation.x += br * 0.012 * ik;
    P.armL.rotation.z -= (0.02 + br * 0.02) * ik; P.armR.rotation.z += (0.02 + br * 0.02) * ik;
    const look = Math.sin(st.time * 0.31 + st.seed) * Math.sin(st.time * 0.13 + st.seed * 2.1);
    P.head.rotation.y += Math.max(-0.45, Math.min(0.45, look * 0.9)) * ik;
    P.head.rotation.x += Math.sin(st.time * 0.23 + st.seed * 1.3) * 0.05 * ik;
  }
  if (P.cape) P.cape.rotation.set(0.06 + mk * (0.18 + 0.3 * rk) + Math.abs(sw) * 0.12 * mk + Math.sin(st.time * 2.3 + st.seed) * 0.025, 0, Math.sin(st.time * 1.7) * 0.02);
  if (rig.zombie) { P.armL.rotation.x = -1.4 + sw * 0.1; P.armR.rotation.x = -1.3 - sw * 0.1; P.head.rotation.z = 0.25; }
  if (rig.flying) P.body.position.y = rig.legLen + 0.4 + Math.sin(st.time * 3) * 0.1;

  const name = st.anim?.name || st.loop;
  if (!name) return;
  const t = st.anim ? clamp01(st.t) : (st.time % 1.2) / 1.2;
  const swing = (ws, we) => (t < 0.4 ? lerp(0, ws, easeOut(t / 0.4)) : t < 0.65 ? lerp(ws, we, (t - 0.4) / 0.25) : lerp(we, 0, (t - 0.65) / 0.35));
  switch (name) {
    case 'slash':
      // diagonal sweep: raise out to the side, cut across the body
      P.armR.rotation.x = curve(t, -2.3, -1.0);
      P.armR.rotation.z = curve(t, 0.95, -0.55);
      P.armR.rotation.y = curve(t, -0.4, 0.5);
      P.torso.rotation.y = curve(t, 0.55, -0.5);
      P.torso.rotation.x += curve(t, -0.05, 0.12);
      P.armL.rotation.x = curve(t, -0.5, 0.2);
      break;
    case 'crush':
      // overhead smash with a lean back and a dip on impact
      P.armR.rotation.x = curve(t, -3.0, -0.55, 0.42, 0.6);
      P.armR.rotation.z = curve(t, 0.15, -0.05, 0.42, 0.6);
      P.armL.rotation.x = curve(t, -2.4, -0.8, 0.42, 0.6);
      P.torso.rotation.x += curve(t, -0.2, 0.35, 0.42, 0.6);
      P.body.position.y -= Math.max(0, curve(t, 0, 0.07, 0.42, 0.6));
      P.legL.rotation.x = curve(t, 0, -0.3, 0.42, 0.6); P.legR.rotation.x = curve(t, 0, 0.25, 0.42, 0.6);
      break;
    case 'stab':
      // pull back, then lunge forward
      P.armR.rotation.x = curve(t, 0.45, -1.65, 0.35, 0.52);
      P.armR.rotation.z = curve(t, 0.2, 0.05, 0.35, 0.52);
      P.torso.rotation.y = curve(t, 0.4, -0.35, 0.35, 0.52);
      P.torso.rotation.x += curve(t, -0.05, 0.2, 0.35, 0.52);
      P.legL.rotation.x = curve(t, 0.1, -0.45, 0.35, 0.52); P.legR.rotation.x = curve(t, -0.05, 0.35, 0.35, 0.52);
      P.armL.rotation.x = curve(t, -0.3, 0.3, 0.35, 0.52);
      break;
    case 'punch':
      P.armR.rotation.x = curve(t, 0.3, -1.6, 0.3, 0.48);
      P.armL.rotation.x = -1.1; P.armL.rotation.z = 0.35;
      P.torso.rotation.y = curve(t, 0.35, -0.4, 0.3, 0.48);
      break;
    case 'shoot': {
      // bow arm out, draw the string back to the cheek, release with a flick
      const draw = t < 0.55 ? easeOut(t / 0.55) : 1;
      const rel = t < 0.55 ? 0 : clamp01((t - 0.55) / 0.15);
      P.armL.rotation.x = -1.52; P.armL.rotation.z = 0.12;
      P.armR.rotation.x = -1.45 + draw * 0.1;
      P.armR.rotation.z = lerp(-0.25, 0.75, draw) + Math.sin(rel * Math.PI) * 0.4 - (t > 0.7 ? ((t - 0.7) / 0.3) * 0.9 : 0);
      P.torso.rotation.y = -0.45 * Math.min(1, t * 4);
      P.head.rotation.y = 0.4 * Math.min(1, t * 4);
      break;
    }
    case 'cast':
      // gather overhead, then thrust both hands at the target
      P.armL.rotation.x = curve(t, -2.5, -1.45, 0.4, 0.55); P.armR.rotation.x = curve(t, -2.5, -1.45, 0.4, 0.55);
      P.armL.rotation.z = curve(t, -0.45, 0.12, 0.4, 0.55); P.armR.rotation.z = curve(t, 0.45, -0.12, 0.4, 0.55);
      P.torso.rotation.x += curve(t, -0.12, 0.18, 0.4, 0.55);
      P.head.rotation.x = curve(t, -0.15, 0.05, 0.4, 0.55);
      break;
    case 'block':
      P.armL.rotation.x = -1.3; P.armL.rotation.z = 0.4;
      P.torso.rotation.x -= 0.08;
      break;
    case 'chop':
      P.armR.rotation.x = -1.3 + Math.sin(t * Math.PI * 2) * 0.35;
      P.armR.rotation.z = Math.sin(t * Math.PI * 2) * 0.6;
      P.armL.rotation.x = -1.0 + Math.sin(t * Math.PI * 2) * 0.3;
      P.torso.rotation.y = Math.sin(t * Math.PI * 2) * 0.45;
      break;
    case 'mine':
      P.armR.rotation.x = swing(-2.9, -0.5); P.armL.rotation.x = swing(-2.6, -0.6);
      P.torso.rotation.x = swing(-0.15, 0.3);
      break;
    case 'fish':
      P.armR.rotation.x = -0.9 + Math.sin(st.time * 2) * 0.06; P.armL.rotation.x = -0.8;
      P.torso.rotation.x = 0.08;
      break;
    case 'cook': case 'craft': case 'fletch': case 'herblore':
      P.armR.rotation.x = -0.9 + Math.sin(t * Math.PI * 4) * 0.25; P.armL.rotation.x = -0.8;
      P.torso.rotation.x = 0.15;
      P.head.rotation.x = 0.25;
      break;
    case 'smith': {
      const u = (t % 0.5) / 0.5;
      P.armR.rotation.x = u < 0.6 ? lerp(-0.7, -2.0, easeOut(u / 0.6)) : lerp(-2.0, -0.7, smoothstep(0, 1, (u - 0.6) / 0.15));
      P.armL.rotation.x = -0.7;
      P.torso.rotation.x = 0.12;
      break;
    }
    case 'eat': case 'drink':
      P.armR.rotation.x = t < 0.5 ? lerp(0, -2.4, easeOut(t / 0.5)) : lerp(-2.4, 0, smoothstep(0, 1, (t - 0.5) / 0.5));
      P.armR.rotation.z = -0.5 * Math.sin(t * Math.PI);
      P.head.rotation.x = name === 'drink' ? -0.3 * Math.sin(t * Math.PI) : 0.1;
      break;
    case 'pickup': case 'bury':
      P.torso.rotation.x = Math.sin(t * Math.PI) * 0.7;
      P.armR.rotation.x = -Math.sin(t * Math.PI) * 0.9;
      P.body.position.y = rig.legLen - Math.sin(t * Math.PI) * 0.15;
      P.legL.rotation.x = -Math.sin(t * Math.PI) * 0.3; P.legR.rotation.x = Math.sin(t * Math.PI) * 0.15;
      break;
    case 'balance':
      P.armL.rotation.z = -1.35 + Math.sin(st.time * 3) * 0.15; P.armR.rotation.z = 1.35 + Math.sin(st.time * 3) * 0.15;
      P.armL.rotation.x = 0; P.armR.rotation.x = 0;
      break;
    case 'climb':
      P.armL.rotation.x = -2.6 + Math.sin(st.time * 8) * 0.4; P.armR.rotation.x = -2.6 - Math.sin(st.time * 8) * 0.4;
      P.legL.rotation.x = -Math.max(0, Math.sin(st.time * 8)) * 0.6; P.legR.rotation.x = -Math.max(0, -Math.sin(st.time * 8)) * 0.6;
      break;
    case 'emote_wave':
      P.armR.rotation.x = -2.6; P.armR.rotation.z = 0.4 + Math.sin(st.time * 10) * 0.4;
      break;
    case 'death': {
      deathPose(rig, st.t, 'x');
      const k = clamp01(st.t / 0.5);
      const fl = Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.6);
      P.armL.rotation.x = -1.6 * fl; P.armR.rotation.x = -1.4 * fl;
      P.armL.rotation.z = -0.9 * k; P.armR.rotation.z = 0.9 * k;
      P.legL.rotation.x = -0.25 * k; P.legR.rotation.x = 0.15 * k;
      P.head.rotation.x = -0.3 * k;
      P.body.position.y = rig.legLen;
      P.torso.rotation.set(0, 0, 0);
      break;
    }
    default:
      break;
  }
}

function animateQuad(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  P.body.position.y = rig.bodyY;
  P.body.rotation.set(0, 0, 0);
  P.head.rotation.set(0, 0, 0);
  P.head.position.z = P.head.userData.z0 ?? (P.head.userData.z0 = P.head.position.z);
  const mk = st.moveK ?? (st.moving ? 1 : 0), seed = st.seed || 0;
  const sw = Math.sin(st.phase) * mk;
  for (const l of P.legs) l.pivot.rotation.x = Math.sin(st.phase + l.phase) * (0.6 + 0.2 * (st.runK || 0)) * mk;
  if (P.tail) P.tail.rotation.y = Math.sin(st.time * 3 + seed) * 0.3;
  P.head.rotation.x = (Math.sin(st.time * 0.8 + seed) * 0.08 + 0.08) * (1 - mk) + Math.cos(st.phase * 2) * 0.06 * mk;
  P.head.rotation.y = Math.sin(st.time * 0.27 + seed) * Math.sin(st.time * 0.11 + seed * 2) * 0.35 * (1 - mk);
  P.body.position.y = rig.bodyY + Math.abs(sw) * 0.03 + Math.sin(st.time * 1.8 + seed) * 0.006 * (1 - mk);
  P.body.rotation.x = Math.cos(st.phase * 2) * 0.03 * mk;
  const name = st.anim?.name || st.loop;
  if (!name) return;
  const t = clamp01(st.t);
  if (name === 'death') { deathPose(rig, t, 'z'); return; }
  if (name !== 'block') {
    // lunge & bite
    const k = Math.sin(clamp01(t * 1.6) * Math.PI);
    P.head.rotation.x = 0.4 * k;
    P.head.position.z = P.head.userData.z0 + 0.15 * k;
    P.body.rotation.x = 0.06 * k;
    P.body.position.y += 0.04 * k;
    for (const l of P.legs) if (l.phase === 0) l.pivot.rotation.x -= 0.25 * k;
  }
}

function animateSpider(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  const mk = st.moveK ?? (st.moving ? 1 : 0);
  P.body.position.y = 0.3 + Math.abs(Math.sin(st.phase * 2)) * 0.03 * mk + Math.sin(st.time * 2) * 0.01 * (1 - mk);
  P.body.rotation.x = 0;
  for (const l of P.legs) l.pivot.rotation.z = Math.sin(st.phase * 1.5 + l.phase) * 0.25 * mk + Math.sin(st.time * 3 + l.phase) * 0.03 * (1 - mk);
  const name = st.anim?.name;
  if (!name) return;
  const t = clamp01(st.t);
  if (name === 'death') {
    const k = easeOut(clamp01(t * 1.6));
    rig.root.rotation.z = Math.PI * k; rig.root.position.y = 0.6 * k;
    return;
  }
  P.body.rotation.x = -Math.sin(t * Math.PI) * 0.4;
}

function animateBird(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  P.head.rotation.set(0, 0, 0);
  P.body.position.y = 0.32;
  const mk = st.moveK ?? (st.moving ? 1 : 0);
  for (const l of P.legs) l.pivot.rotation.x = Math.sin(st.phase * 1.4 + l.phase) * 0.7 * mk;
  if (st.moving) P.head.position.z = 0.17 + Math.sin(st.phase * 2.8) * 0.04;
  else P.head.rotation.x = Math.max(0, Math.sin(st.time * 1.3 + (st.seed || 0))) * 0.6; // pecking
  const name = st.anim?.name;
  if (!name) return;
  const t = clamp01(st.t);
  if (name === 'death') { deathPose(rig, t, 'z'); return; }
  P.head.rotation.x = Math.sin(t * Math.PI) * 1.0;
}

function animateBat(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  P.body.position.y = 1.1 + Math.sin(st.time * 4 + (st.seed || 0)) * 0.12;
  for (const w of P.wings) w.pivot.rotation.z = w.side * Math.sin(st.time * 18 + (st.seed || 0)) * 0.7;
  const name = st.anim?.name;
  if (name === 'death') {
    const k = clamp01(st.t * 1.4);
    P.body.position.y = lerp(1.1, 0.12, k * k);
    rig.root.rotation.z = (Math.PI / 2) * k;
    for (const w of P.wings) w.pivot.rotation.z = 0;
  } else if (name) {
    P.body.position.z = Math.sin(clamp01(st.t) * Math.PI) * 0.3;
  }
}

const ANIMATORS = { biped: animateBiped, quad: animateQuad, spider: animateSpider, bird: animateBird, bat: animateBat };

/** Allow content to add rig kinds: registerAnimator('serpent', (rig, st) => {...}) */
export function registerAnimator(kind, fn) { ANIMATORS[kind] = fn; }
