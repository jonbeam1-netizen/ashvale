// CharacterView: renders a Character (player / npc / remote player) with tick interpolation
// and procedural animation.

import * as THREE from 'three';
import { buildCharacter } from './models.js';
import { getItem } from '../core/registry.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - (1 - t) * (1 - t);

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
  }

  versionKey() { return `${this.entity.appearanceVersion}|${toolOf(this.entity) || ''}`; }

  dispose() { this.rm.charGroup.remove(this.group); }

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
    if (world.isWater(Math.floor(x), Math.floor(z))) y = Math.max(y, world.waterLevel - 0.2);
    // optional vertical offset (agility rooftops/treetops): entity.elevation or remote extra.elevation
    const elev = e.elevation ?? e.extra?.elevation ?? 0;
    this.elev = (this.elev ?? elev) + (elev - (this.elev ?? elev)) * Math.min(1, dt * 8);
    y += this.elev;
    this.pos.set(x, y, z);
    this.group.position.copy(this.pos);

    // facing
    let target = e.faceAngle;
    let diff = target - this.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.angle += diff * Math.min(1, dt * 12);
    this.group.rotation.y = this.angle;

    if (moving) this.phase += dt * (tilesPerTick >= 2 ? 15 : 9.5);
    const anim = e.anim && now - e.anim.start < (e.anim.duration || 1200) ? e.anim : null;
    const deathAnim = e.dead && e.anim?.name === 'death' ? e.anim : null;
    const st = {
      moving, running: tilesPerTick >= 2, phase: this.phase, time,
      anim: deathAnim || anim, t: (deathAnim || anim) ? (now - (deathAnim || anim).start) / ((deathAnim || anim).duration || 1200) : 0,
      loop: e.loopAnim,
    };
    ANIMATORS[this.rig.kind]?.(this.rig, st);
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

function deathPose(rig, t, axis = 'x') {
  const k = easeOut(clamp01(t * 1.6));
  if (axis === 'x') { rig.root.rotation.x = -Math.PI / 2 * k; rig.root.position.y = 0.12 * k; }
  else { rig.root.rotation.z = Math.PI / 2 * k; rig.root.position.y = 0.05 * k; }
  if (t > 1) rig.root.position.y -= (t - 1) * 0.5;
}

function animateBiped(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  for (const k of ['legL', 'legR', 'armL', 'armR', 'torso', 'head']) P[k].rotation.set(0, 0, 0);
  P.body.position.y = rig.legLen;
  P.body.rotation.set(0, 0, 0);
  if (P.cape) P.cape.rotation.set(0.05, 0, 0);

  const sw = st.moving ? Math.sin(st.phase) : 0;
  const amp = st.running ? 0.9 : 0.6;
  P.legL.rotation.x = sw * amp;
  P.legR.rotation.x = -sw * amp;
  P.armL.rotation.x = -sw * amp * 0.8;
  P.armR.rotation.x = sw * amp * 0.8;
  if (st.moving) {
    P.body.position.y = rig.legLen + Math.abs(Math.cos(st.phase)) * (st.running ? 0.06 : 0.035);
    if (st.running) P.torso.rotation.x = 0.12;
    if (P.cape) P.cape.rotation.x = 0.25 + Math.abs(sw) * 0.2;
  } else {
    const br = Math.sin(st.time * 2.2) * 0.02;
    P.torso.rotation.x = br * 0.5;
    P.armL.rotation.z = -0.05 - br; P.armR.rotation.z = 0.05 + br;
  }
  if (rig.zombie) { P.armL.rotation.x = -1.4 + sw * 0.1; P.armR.rotation.x = -1.3 - sw * 0.1; }
  if (rig.flying) P.body.position.y = rig.legLen + 0.4 + Math.sin(st.time * 3) * 0.1;

  const name = st.anim?.name || st.loop;
  if (!name) return;
  const t = st.anim ? clamp01(st.t) : (st.time % 1.2) / 1.2;
  const swing = (ws, we) => (t < 0.4 ? lerp(0, ws, easeOut(t / 0.4)) : t < 0.65 ? lerp(ws, we, (t - 0.4) / 0.25) : lerp(we, 0, (t - 0.65) / 0.35));
  switch (name) {
    case 'slash': case 'crush':
      P.armR.rotation.x = swing(-2.7, -0.4);
      P.armR.rotation.z = swing(0.4, -0.3);
      P.torso.rotation.y = swing(0.35, -0.35);
      break;
    case 'stab': case 'punch':
      P.armR.rotation.x = t < 0.35 ? lerp(0, -1.0, t / 0.35) : t < 0.55 ? lerp(-1.0, -1.65, (t - 0.35) / 0.2) : lerp(-1.65, 0, (t - 0.55) / 0.45);
      P.torso.rotation.y = t < 0.55 ? lerp(0.2, -0.3, t / 0.55) : lerp(-0.3, 0, (t - 0.55) / 0.45);
      break;
    case 'shoot':
      P.armL.rotation.x = -1.5; P.armL.rotation.z = 0.1;
      P.armR.rotation.x = -1.4; P.armR.rotation.z = t < 0.6 ? lerp(-0.2, 0.6, t / 0.6) : 0.6 - (t - 0.6);
      P.torso.rotation.y = -0.4;
      break;
    case 'cast':
      P.armL.rotation.x = swing(-2.2, -1.4); P.armR.rotation.x = swing(-2.2, -1.4);
      P.armL.rotation.z = -0.3; P.armR.rotation.z = 0.3;
      break;
    case 'block':
      P.armL.rotation.x = -1.3; P.armL.rotation.z = 0.4;
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
      break;
    case 'smith':
      P.armR.rotation.x = t % 0.5 < 0.25 ? -2.0 : -0.7; P.armL.rotation.x = -0.7;
      P.torso.rotation.x = 0.12;
      break;
    case 'eat': case 'drink':
      P.armR.rotation.x = t < 0.5 ? lerp(0, -2.4, t / 0.5) : lerp(-2.4, 0, (t - 0.5) / 0.5);
      P.armR.rotation.z = -0.5 * Math.sin(t * Math.PI);
      break;
    case 'pickup': case 'bury':
      P.torso.rotation.x = Math.sin(t * Math.PI) * 0.7;
      P.armR.rotation.x = -Math.sin(t * Math.PI) * 0.9;
      P.body.position.y = rig.legLen - Math.sin(t * Math.PI) * 0.15;
      break;
    case 'balance':
      P.armL.rotation.z = -1.35 + Math.sin(st.time * 3) * 0.15; P.armR.rotation.z = 1.35 + Math.sin(st.time * 3) * 0.15;
      P.armL.rotation.x = 0; P.armR.rotation.x = 0;
      break;
    case 'climb':
      P.armL.rotation.x = -2.6 + Math.sin(st.time * 8) * 0.4; P.armR.rotation.x = -2.6 - Math.sin(st.time * 8) * 0.4;
      break;
    case 'emote_wave':
      P.armR.rotation.x = -2.6; P.armR.rotation.z = 0.4 + Math.sin(st.time * 10) * 0.4;
      break;
    case 'death':
      deathPose(rig, st.t, 'x');
      break;
    default:
      break;
  }
}

function animateQuad(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  P.body.position.y = rig.bodyY;
  P.head.rotation.set(0, 0, 0);
  P.head.position.z = P.head.userData.z0 ?? (P.head.userData.z0 = P.head.position.z);
  const sw = st.moving ? Math.sin(st.phase) : 0;
  for (const l of P.legs) l.pivot.rotation.x = st.moving ? Math.sin(st.phase + l.phase) * 0.6 : 0;
  if (P.tail) P.tail.rotation.y = Math.sin(st.time * 3) * 0.3;
  if (!st.moving) P.head.rotation.x = Math.sin(st.time * 0.8) * 0.08 + 0.08;
  else P.body.position.y = rig.bodyY + Math.abs(sw) * 0.03;
  const name = st.anim?.name || st.loop;
  if (!name) return;
  const t = clamp01(st.t);
  if (name === 'death') { deathPose(rig, t, 'z'); return; }
  if (name !== 'block') {
    const k = Math.sin(clamp01(t * 1.6) * Math.PI);
    P.head.rotation.x = 0.4 * k;
    P.head.position.z = P.head.userData.z0 + 0.15 * k;
    P.body.rotation.x = 0.06 * k;
  }
}

function animateSpider(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  P.body.position.y = 0.3 + (st.moving ? Math.abs(Math.sin(st.phase * 2)) * 0.03 : Math.sin(st.time * 2) * 0.01);
  P.body.rotation.x = 0;
  for (const l of P.legs) l.pivot.rotation.z = st.moving ? Math.sin(st.phase * 1.5 + l.phase) * 0.25 : 0;
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
  for (const l of P.legs) l.pivot.rotation.x = st.moving ? Math.sin(st.phase * 1.4 + l.phase) * 0.7 : 0;
  if (st.moving) P.head.position.z = 0.17 + Math.sin(st.phase * 2.8) * 0.04;
  else P.head.rotation.x = Math.max(0, Math.sin(st.time * 1.3)) * 0.6; // pecking
  const name = st.anim?.name;
  if (!name) return;
  const t = clamp01(st.t);
  if (name === 'death') { deathPose(rig, t, 'z'); return; }
  P.head.rotation.x = Math.sin(t * Math.PI) * 1.0;
}

function animateBat(rig, st) {
  const P = rig.parts;
  resetRoot(rig);
  P.body.position.y = 1.1 + Math.sin(st.time * 4) * 0.12;
  for (const w of P.wings) w.pivot.rotation.z = w.side * Math.sin(st.time * 18) * 0.7;
  const name = st.anim?.name;
  if (name === 'death') {
    const k = clamp01(st.t * 1.4);
    P.body.position.y = lerp(1.1, 0.12, k);
    rig.root.rotation.z = Math.PI / 2 * k;
    for (const w of P.wings) w.pivot.rotation.z = 0;
  } else if (name) {
    P.body.position.z = Math.sin(clamp01(st.t) * Math.PI) * 0.3;
  }
}

const ANIMATORS = { biped: animateBiped, quad: animateQuad, spider: animateSpider, bird: animateBird, bat: animateBat };

/** Allow content to add rig kinds: registerAnimator('serpent', (rig, st) => {...}) */
export function registerAnimator(kind, fn) { ANIMATORS[kind] = fn; }
