// Combat system. OWNER: agent A.
// Melee / ranged (ammo) / magic (spells, autocast) for the local player, NPC combat AI (aggression,
// tolerance, retaliation, chasing, leashing, single vs multi combat, multi-style `attacks`), projectiles,
// poison, binds, stat drains, special attacks and the Combat tab. Publishes `game.combat`.
// See docs/COMBAT_API.md for the data fields other agents use (weapons, ammo, NPC attacks, specials).

import { getWeaponType, registerWeaponType, getItem, getSpell, allSpells } from '../core/registry.js';
import { rand } from '../core/rng.js';
import * as F from './combat_formulas.js';
import { getSpecial, registerSpecial } from './combat_specials.js';
import { registerCombatIcons, injectCombatCss, OverheadIcons, setupMultiIndicator, renderCombatTab } from './combat_ui.js';
import { el, escapeHtml } from '../ui/util.js';
import { getShapeIcon } from '../ui/icons.js';

const SINGLE_COMBAT_TICKS = 8;     // "in combat" window for single-way combat rules
const TOLERANCE_TICKS = 1000;      // 10 minutes in one region -> aggressive NPCs leave you alone
const TOLERANCE_RADIUS = 10;
const POISON_INTERVAL = 30;        // ticks between poison hits
const BIND_IMMUNITY = 5;           // ticks after a bind ends before another can land

// ---- extra weapon types (only registered when no other module defined them) --------------------
const RANGED_STYLES = (ranged = true) => [
  { name: 'Accurate', type: 'ranged', style: 'accurate', xp: ['ranged'], anim: 'shoot' },
  { name: 'Rapid', type: 'ranged', style: 'rapid', xp: ['ranged'], anim: 'shoot' },
  { name: 'Longrange', type: 'ranged', style: 'longrange', xp: ['ranged', 'defence'], anim: 'shoot' },
].map((s) => ({ ...s, ranged }));
const meleeStyles = (list) => list.map(([name, type, style, anim]) => ({
  name, type, style, anim: anim || (type === 'stab' ? 'stab' : type === 'crush' ? 'crush' : 'slash'),
  xp: style === 'accurate' ? ['attack'] : style === 'aggressive' ? ['strength'] : style === 'defensive' ? ['defence'] : ['attack', 'strength', 'defence'],
}));
const EXTRA_TYPES = [
  { id: 'shortbow', name: 'Bow', ranged: true, ammoType: 'arrow', attackRange: 7, styles: RANGED_STYLES() },
  { id: 'longbow', name: 'Bow', ranged: true, ammoType: 'arrow', attackRange: 9, styles: RANGED_STYLES() },
  { id: 'crossbow', name: 'Crossbow', ranged: true, ammoType: 'bolt', attackRange: 7, styles: RANGED_STYLES() },
  { id: 'thrown', name: 'Thrown', ranged: true, thrown: true, attackRange: 4, styles: RANGED_STYLES() },
  { id: 'dart', name: 'Thrown', ranged: true, thrown: true, attackRange: 3, styles: RANGED_STYLES() },
  { id: 'knife', name: 'Thrown', ranged: true, thrown: true, attackRange: 4, styles: RANGED_STYLES() },
  { id: 'javelin', name: 'Thrown', ranged: true, thrown: true, attackRange: 5, styles: RANGED_STYLES() },
  { id: 'halberd', name: 'Polearm', attackRange: 2, styles: meleeStyles([['Jab', 'stab', 'controlled'], ['Swipe', 'slash', 'aggressive'], ['Fend', 'stab', 'defensive']]) },
  { id: 'claws', name: 'Claws', styles: meleeStyles([['Chop', 'slash', 'accurate'], ['Slash', 'slash', 'aggressive'], ['Lunge', 'stab', 'controlled'], ['Block', 'slash', 'defensive']]) },
  { id: 'whip', name: 'Whip', styles: meleeStyles([['Flick', 'slash', 'accurate'], ['Lash', 'slash', 'controlled'], ['Deflect', 'slash', 'defensive']]) },
  { id: 'battlestaff', name: 'Staff', styles: [...meleeStyles([['Bash', 'crush', 'accurate'], ['Pound', 'crush', 'aggressive'], ['Focus', 'crush', 'defensive']]), { name: 'Spell', type: 'magic', style: 'autocast', xp: ['magic'], anim: 'cast' }] },
];
for (const wt of EXTRA_TYPES) if (getWeaponType(wt.id)?.id !== wt.id) registerWeaponType(wt);
const DEFAULT_RANGE = { bow: 7, shortbow: 7, longbow: 9, crossbow: 7, thrown: 4, dart: 3, knife: 4, javelin: 5 };
const THROWN = new Set(['thrown', 'dart', 'knife', 'javelin']);

let game;
let specArmed = false;
let lastHitBy = null, lastHitTick = -999;      // who last damaged the local player
let lastAttackTick = -999;                     // when the local player last attacked
let chaseFail = 0;

const tick = () => game.tickCount;
const store = (p) => p.store('combat');

// =============================================================================================
// Player attack info
// =============================================================================================

/** Ranged weapon info for the local player's weapon, or null for non-ranged weapons. */
function rangedInfo(p) {
  const w = p.equipment.weapon();
  const wt = getWeaponType(p.equipment.weaponType());
  if (!wt.ranged && !w?.ranged) return null;
  const thrown = !!(w?.thrown ?? wt.thrown ?? THROWN.has(wt.id));
  const ammoType = thrown ? null : (w?.ammoType ?? wt.ammoType ?? (wt.id === 'crossbow' ? 'bolt' : 'arrow'));
  return { thrown, ammoType, base: w?.attackRange ?? wt.attackRange ?? DEFAULT_RANGE[wt.id] ?? 7 };
}

const ammoTypeOf = (def) => def?.ammoType ?? (/bolt/.test(def?.id || '') ? 'bolt' : /arrow/.test(def?.id || '') ? 'arrow' : null);

/** Attack mode: { kind: 'melee'|'ranged'|'magic', style, spell?, autocast? } */
function attackMode(p) {
  const style = F.styleOf(p);
  if (p._castOnce) return { kind: 'magic', style, spell: p._castOnce, autocast: false };
  if (style.style === 'autocast') {
    const sp = store(p).autocast && getSpell(store(p).autocast);
    if (sp) return { kind: 'magic', style, spell: sp, autocast: true };
    const wt = getWeaponType(p.equipment.weaponType());
    return { kind: 'melee', style: wt.styles.find((s) => s.style !== 'autocast') || style };
  }
  if (rangedInfo(p)) return { kind: 'ranged', style };
  return { kind: 'melee', style };
}

function attackSpeed(c, mode = null) {
  if (c.type === 'npc') return c.def.attackSpeed;
  mode = mode || attackMode(c);
  if (mode.kind === 'magic') return mode.spell?.speed ?? 5;
  let s = c.equipment.attackSpeed();
  if (mode.style?.style === 'rapid') s -= 1;
  return Math.max(1, s);
}

function attackRange(c, mode = null) {
  if (c.type === 'npc') return c.def.attackRange || 1;
  mode = mode || attackMode(c);
  if (mode.kind === 'magic') return 10;
  if (mode.kind === 'ranged') {
    const r = rangedInfo(c).base + (mode.style?.style === 'longrange' ? 2 : 0);
    return Math.min(10, r);
  }
  const w = c.equipment.weapon();
  return w?.attackRange ?? getWeaponType(c.equipment.weaponType()).attackRange ?? 1;
}

function maxHit(p, mode = attackMode(p)) {
  return mode.kind === 'magic' ? F.magicMaxHit(p, mode.spell) : mode.kind === 'ranged' ? F.rangedMaxHit(p) : F.meleeMaxHit(p);
}

function weaponSpecial(p) {
  const w = p.equipment.weapon();
  if (!w?.special) return null;
  const id = typeof w.special === 'string' ? w.special : w.special.id;
  const def = getSpecial(id);
  if (!def) return null;
  return { ...def, cost: (typeof w.special === 'object' && w.special.cost) || def.cost };
}

/** Human readable ammo line for the Combat tab. */
function ammoStatus(p) {
  const ri = rangedInfo(p);
  if (!ri) return '';
  if (ri.thrown) return `Thrown: <b>${p.equipment.get('weapon')?.qty ?? 0}</b> left`;
  const a = p.equipment.get('ammo'), def = a && getItem(a.id);
  if (!a) return '<span style="color:#ff6050">No ammunition equipped</span>';
  if (ammoTypeOf(def) !== ri.ammoType) return `<span style="color:#ff6050">${escapeHtml(def.name)} can't be fired from this weapon</span>`;
  return `Ammo: <b>${escapeHtml(def.name)} x ${a.qty}</b>`;
}

/** Checks that `n` shots of ammo are available. Messages the player when not. */
function checkAmmo(p, n = 1) {
  const ri = rangedInfo(p);
  if (!ri) return true;
  if (ri.thrown) return (p.equipment.get('weapon')?.qty ?? 0) >= 1;
  const a = p.equipment.get('ammo');
  const def = a && getItem(a.id);
  if (!a || a.qty < 1) { game.message('There is no ammunition left in your quiver.'); return false; }
  if (ammoTypeOf(def) !== ri.ammoType) { game.message(`You can't fire ${def.name.toLowerCase()} from this weapon.`); return false; }
  const w = p.equipment.weapon();
  if (w?.ammoMax != null && (def.ammoLevel ?? 0) > w.ammoMax) { game.message(`Your ${w.name.toLowerCase()} isn't strong enough to fire ${def.name.toLowerCase()}.`); return false; }
  return n > 0;
}

/** Use one piece of ammo; returns the ammo item id (for the projectile / drop) or null. */
function useAmmo(p, target) {
  const ri = rangedInfo(p);
  if (!ri) return null;
  const slot = ri.thrown ? 'weapon' : 'ammo';
  const it = p.equipment.get(slot);
  if (!it) return null;
  const id = it.id;
  let saveChance = 0;
  for (const s of ['cape', 'neck', 'ring', 'hands']) saveChance = Math.max(saveChance, p.equipment.getDef(s)?.ammoSave || 0);
  if (Math.random() < saveChance) return id; // returned to the quiver
  if (it.qty > 1) { it.qty--; game.events.emit('equipment:change', { player: p }); }
  else {
    p.equipment.set(slot, null);
    game.message(ri.thrown ? 'You have run out of throwing weapons.' : 'That was your last piece of ammunition.');
  }
  if (target && Math.random() < 0.8) {
    // most ammo falls under the target and can be picked up again
    const tx = target.x, ty = target.y;
    game.schedule(1 + Math.floor(F.footDistance(p, target) / 4), () => {
      if (!game.world.isWater(tx, ty)) game.spawnGroundItem(id, 1, tx, ty, { owner: p.name });
    });
  }
  return id;
}

// =============================================================================================
// Rolls & hits
// =============================================================================================

/** Roll one hit. opts: { spell, attack (npc attack entry), accuracy, damage, alwaysHit, minHitPct } */
function rollDamage(attacker, defender, type, kind, opts = {}) {
  const a = F.attackRoll(attacker, type) * (opts.accuracy || 1) * (opts.attack?.accuracy || 1);
  const d = F.defenceRoll(defender, type);
  let max;
  if (attacker.type === 'npc') max = opts.attack?.maxHit ?? attacker.def.maxHit;
  else if (kind === 'magic') max = F.magicMaxHit(attacker, opts.spell);
  else if (kind === 'ranged') max = F.rangedMaxHit(attacker);
  else max = F.meleeMaxHit(attacker);
  max = Math.floor(max * (opts.damage || 1));
  const hit = opts.alwaysHit || Math.random() < F.hitChance(a, d);
  if (!hit) return { hit: false, damage: 0, max };
  let dmg = rand.int(0, max);
  if (opts.minHitPct) dmg = Math.max(dmg, Math.floor(max * opts.minHitPct));
  return { hit: true, damage: dmg, max };
}

function giveCombatXp(p, kind, style, dmg) {
  if (dmg <= 0 || p.type !== 'player') return;
  if (kind === 'magic') p.skills.addXp('magic', dmg * 2);
  else {
    const skills = style?.xp?.length ? style.xp : [kind === 'ranged' ? 'ranged' : 'attack'];
    for (const s of skills) p.skills.addXp(s, (dmg * 4) / skills.length);
  }
  p.skills.addXp('hitpoints', dmg * 1.33);
}

function validTarget(t) {
  return t && !t.dead && !t.hidden && !game.targetGone(t);
}

/**
 * Land a hit on a target (now or after `delay` ticks). info: { kind, type, style, spell, special, onHit(dealt) }
 */
function land(attacker, target, dmg, delay, info) {
  const go = () => {
    if (!validTarget(target)) return;
    let dealt;
    if (target.type === 'remote') dealt = game.pvp ? game.pvp.landHit(target, dmg, info) : 0;
    else dealt = game.applyDamage(target, dmg, { source: attacker, type: F.damageType(info.type), combatHit: true, ignoresProtect: info.ignoresProtect });
    if (attacker === game.player) giveCombatXp(attacker, info.kind, info.style, dealt);
    try { info.onHit?.(dealt); } catch (e) { console.error('[combat] onHit', e); }
    retaliate(target, attacker);
  };
  if (delay > 0) game.schedule(delay, go); else go();
}

function projectileFor(attacker, target, color, delay, opts = {}) {
  game.spawnEffect('projectile', attacker, { to: target, color, ms: Math.max(300, delay * 600 - 120), size: opts.size, arc: opts.arc });
}

// =============================================================================================
// Player attacks
// =============================================================================================

function playerAttack(p, t, mode) {
  if (t.type === 'remote') {
    const chk = game.pvp?.canAttack(t) || { ok: false, reason: 'You cannot attack that player.' };
    if (!chk.ok) { game.message(chk.reason); stopAttacking(p); return false; }
    game.pvp.noteOutgoingAttack?.(t);
  }
  lastAttackTick = tick();
  if (mode.kind === 'magic') return castCombatSpell(p, t, mode.spell, mode);

  // special attack
  let spec = null;
  if (specArmed) {
    const s = weaponSpecial(p);
    if (s && s.modes.includes(mode.kind)) {
      if (p.specialEnergy >= s.cost) { spec = s; p.specialEnergy -= s.cost; game.events.emit('special:change', { player: p }); }
      else game.message('You do not have enough special attack energy left.');
    }
    specArmed = false;
    game.ui.refreshTab('combat');
  }

  const style = mode.style;
  const type = mode.kind === 'ranged' ? 'ranged' : (F.MELEE_TYPES.has(style.type) ? style.type : 'crush');
  const hits = spec?.hits ?? 1;
  if (mode.kind === 'ranged' && !checkAmmo(p, spec?.ammo ?? hits)) { stopAttacking(p); return false; }

  const dist = F.footDistance(p, t);
  const delay = F.hitDelay(mode.kind, dist);
  game.playAnim(p, spec?.anim || style.anim || (mode.kind === 'ranged' ? 'shoot' : 'slash'), 600);
  if (spec) game.spawnEffect('sparkle', p, { color: spec.color ?? 0xffff80 });

  const weapon = p.equipment.weapon();
  const targets = [t, ...(spec?.extraTargets?.({ game, combat: api, attacker: p, target: t, mode: mode.kind, spec }) || [])];
  // area weapons (e.g. explosive thrown critters) also hit foes around the target in multi-combat
  if (weapon?.aoe && t.type === 'npc' && isMultiAt(t)) {
    for (const n of game.npcsNear(t.x, t.y, 1, (n) => n !== t && n.def.combatLevel > 0)) if (!targets.includes(n) && targets.length < 9) targets.push(n);
  }
  for (let i = 0; i < hits; i++) {
    let ammoDef = null;
    if (mode.kind === 'ranged') {
      const ammoId = useAmmo(p, t);
      if (!ammoId) break;
      ammoDef = getItem(ammoId);
      const col = colorNum(ammoDef?.projectileColor ?? ammoDef?.icon?.color, 0xd8c8a0);
      game.schedule(i, () => projectileFor(p, t, col, delay, { size: 0.06, arc: 0.35 }));
    }
    // poisonous weapons / ammo
    const venom = mode.kind === 'ranged' ? (ammoDef?.poisonous || (rangedInfo(p)?.thrown && weapon?.poisonous)) : weapon?.poisonous;
    const venomDmg = (mode.kind === 'ranged' ? ammoDef?.poisonDamage ?? weapon?.poisonDamage : weapon?.poisonDamage) ?? 4;
    for (const tg of targets) {
      const r = rollDamage(p, tg, type, mode.kind, { accuracy: spec?.accuracy, damage: spec?.damage, alwaysHit: spec?.alwaysHit, minHitPct: spec?.minHitPct });
      land(p, tg, r.damage, delay + (mode.kind === 'melee' ? 0 : i), {
        kind: mode.kind, type, style, special: spec,
        onHit: (dealt) => {
          spec?.onHit?.({ game, combat: api, attacker: p, target: tg, mode: mode.kind, spec }, dealt, i);
          if (venom && dealt > 0 && Math.random() < 0.25) poison(tg, venomDmg, p);
        },
      });
    }
    if (weapon?.aoe && mode.kind === 'ranged') game.schedule(delay, () => game.spawnEffect('splash', t, { color: 0xffa040 }));
  }
  return true;
}

/** Cast a combat spell at a target (manual cast or autocast). */
function castCombatSpell(p, t, spell, mode = {}) {
  const magic = game.magic;
  if (p.skills.getLevel('magic') < spell.level) { game.message(`You need a Magic level of ${spell.level} to cast ${spell.name}.`); stopAttacking(p); return false; }
  if (spell.playersOnly && t.type !== 'remote') { game.message('This spell can only be cast on other players.'); stopAttacking(p); return false; }
  if (spell.drain && t.type === 'npc' && (t.state.drain?.[spell.drain.skill] || 0) >= spell.drain.pct) {
    game.message('Your target has already been weakened.'); stopAttacking(p); return false;
  }
  if (spell.bind && isBound(t)) { game.message('Your target is already held fast.'); stopAttacking(p); return false; }
  if (!magic?.canCast(p, spell)) { stopAttacking(p); return false; }
  magic.consumeSigils(p, spell);
  if (!mode.autocast) p._castOnce = null;
  const dist = F.footDistance(p, t);
  const delay = F.hitDelay('magic', dist);
  p.faceTarget = t;
  game.playAnim(p, 'cast', 1000);
  game.spawnEffect('sparkle', p, { color: spell.projectile ?? 0xffffff });
  projectileFor(p, t, spell.projectile ?? 0xffffff, delay, { size: 0.11 + (spell.tier || 1) * 0.02, arc: 0.4 });
  p.skills.addXp('magic', spell.xp || 0);
  const r = rollDamage(p, t, 'magic', 'magic', { spell });
  const go = () => {
    if (!validTarget(t)) return;
    if (!r.hit) {
      game.spawnEffect('splash', t, { color: 0x6aa8ff });
      if (t.type !== 'remote') t.hpBarUntil = performance.now() + 3000;
      retaliate(t, p);
      return;
    }
    let dealt = 0;
    if (t.type === 'remote') dealt = game.pvp ? game.pvp.landHit(t, r.damage, { kind: 'magic', type: 'magic', spell }) : 0;
    else if ((spell.maxHit || 0) > 0) dealt = game.applyDamage(t, r.damage, { source: p, type: 'magic', combatHit: true });
    giveCombatXp(p, 'magic', null, dealt);
    if (t.type !== 'remote') applySpellEffects(p, t, spell, dealt);
    else if (spell.heal && dealt > 0) game.heal(p, Math.floor(dealt * spell.heal));
    game.spawnEffect('sparkle', t, { color: spell.projectile ?? 0xffffff });
    retaliate(t, p);
  };
  game.schedule(delay, go);
  if (!mode.autocast) {
    // a manual cast doesn't keep attacking unless the player is autocasting
    const m = attackMode(p);
    if (!(m.kind === 'magic' && m.autocast)) p.combatTarget = null;
  }
  return true;
}

function applySpellEffects(caster, t, spell, dealt) {
  if (spell.bind) bind(t, spell.bind);
  if (spell.poison && dealt > 0) poison(t, spell.poison, caster);
  if (spell.heal && dealt > 0) game.heal(caster, Math.floor(dealt * spell.heal));
  if (spell.drain) drainPct(t, spell.drain.skill, spell.drain.pct);
}

function stopAttacking(p) {
  p.combatTarget = null;
  p._castOnce = null;
}

// =============================================================================================
// Engagement rules
// =============================================================================================

/** True if the local player is "in combat" with someone other than `other` (single-way rules). */
function busyWithOther(p, other) {
  const t = tick();
  if (lastHitBy && lastHitBy !== other && !lastHitBy.dead && !game.targetGone(lastHitBy) && t - lastHitTick < SINGLE_COMBAT_TICKS) return true;
  const ct = p.combatTarget;
  if (ct && ct !== other && !ct.dead && t - lastAttackTick < SINGLE_COMBAT_TICKS) return true;
  return false;
}

function isMultiAt(e) { return game.world.isMulti(e.x, e.y); }

/** Can the local player start attacking an NPC? Returns a reason string or null. */
function npcAttackBlocked(p, npc) {
  if (npc.dead) return 'That creature is already dead.';
  if (!isMultiAt(p) && !isMultiAt(npc)) {
    if (lastHitBy && lastHitBy !== npc && !lastHitBy.dead && !game.targetGone(lastHitBy) && tick() - lastHitTick < SINGLE_COMBAT_TICKS) return "I'm already under attack.";
    // co-op: friends in a multiplayer world may fight the same monster (src/net/npcs.js)
    const fighting = npc.combatTarget && npc.combatTarget !== p && npc.combatTarget.type !== 'remote';
    if (fighting) return 'Someone else is fighting that.';
  }
  return null;
}

/** Make `defender` fight back against `attacker` if it should. */
function retaliate(defender, attacker) {
  if (!defender || defender.dead || !attacker || attacker === defender) return;
  if (defender.type === 'npc') {
    // remote attackers: only on the multiplayer host, for shared NPCs (src/net/npcs.js)
    if (attacker.type !== 'player' && attacker.type !== 'remote') return;
    if (!defender.def.combatLevel && !defender.def.attacks) return;
    defender.state.returning = false;
    if (!defender.combatTarget || defender.combatTarget.dead) {
      defender.combatTarget = attacker;
      defender.faceTarget = attacker;
      defender.attackTimer = Math.max(defender.attackTimer, 1);
    }
  }
}

function canAggro(npc, p) {
  const d = npc.def;
  if (!d.aggressive || npc.state.returning || p.dead || p.hidden) return false;
  if (npc.talkingTo) return false;
  const remote = p.type === 'remote'; // multiplayer host: joiners sharing its NPCs (snapshot fields)
  const wild = game.world.getWildernessLevel(p.x, p.y) > 0;
  if (!wild && !d.alwaysAggressive) {
    if (p.combatLevel > (d.combatLevel || 1) * 2) return false;
    if (remote ? p.extra?.tolerant : (store(p).tol?.ticks || 0) >= TOLERANCE_TICKS) return false;
  }
  if (F.footDistance(npc, p) > (d.aggroRange ?? 3)) return false;
  if (Math.max(Math.abs(p.x - npc.spawnX), Math.abs(p.y - npc.spawnY)) > npc.wanderRadius + (d.aggroRange ?? 3) + 2) return false;
  if (!isMultiAt(p) && (remote ? !!p.extra?.busyWith : busyWithOther(p, npc))) return false;
  if (!isMultiAt(p)) for (const o of game.npcs.values()) if (o !== npc && o.combatTarget === p && !o.dead) return false;
  return true;
}

function disengage(npc, goHome = true) {
  npc.combatTarget = null;
  npc.faceTarget = null;
  if (goHome && (npc.x !== npc.spawnX || npc.y !== npc.spawnY)) {
    npc.state.returning = true;
    game.pathTo(npc, { x0: npc.spawnX, y0: npc.spawnY, x1: npc.spawnX, y1: npc.spawnY });
  }
}

// =============================================================================================
// NPC attacks
// =============================================================================================

/** Normalised attack list for an NPC (def.attacks or one derived from attackStyle/maxHit/attackRange). */
function npcAttacks(npc) {
  if (npc.state._atk && npc.state._atkDef === npc.def) return npc.state._atk;
  const d = npc.def;
  const baseType = d.attackStyle || 'crush';
  const list = (Array.isArray(d.attacks) && d.attacks.length ? d.attacks : [{
    style: baseType === 'ranged' || baseType === 'magic' ? baseType : 'melee', maxHit: d.maxHit, range: d.attackRange,
    projectileColor: d.projectileColor,
  }]).map((a) => {
    const style = a.style || 'melee';
    const type = style === 'melee' ? (F.MELEE_TYPES.has(a.type) ? a.type : F.MELEE_TYPES.has(baseType) ? baseType : 'crush') : style;
    const range = a.range ?? (style === 'melee' ? 1 : (d.attackRange > 1 ? d.attackRange : 7));
    const out = { weight: 1, ...a, style, type, range, maxHit: a.maxHit ?? d.maxHit };
    if (!out.effect && d.poisonous && style === 'melee') { out.effect = 'poison'; out.effectChance = 0.25; }
    out.projectileColor = colorNum(out.projectileColor ?? d.projectileColor, style === 'magic' ? 0xb070ff : 0xc8b080);
    return out;
  });
  npc.state._atk = list; npc.state._atkDef = d;
  return list;
}

function pickWeighted(list) {
  const total = list.reduce((s, a) => s + (a.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const a of list) { r -= a.weight ?? 1; if (r <= 0) return a; }
  return list[list.length - 1];
}

/**
 * An NPC attacks `t` with attack `a`. Multiplayer (src/net/npcs.js): on the host an attack on a remote player only
 * plays the visuals - the target's own client rolls and applies it (opts.fromNet) against its real stats; bystanders
 * replay the visuals only (opts.visual).
 */
function npcAttack(npc, t, a, opts = {}) {
  const kind = a.style === 'melee' ? 'melee' : a.style;
  const dist = F.footDistance(npc, t);
  const delay = a.delay ?? F.hitDelay(kind, dist);
  const anim = a.anim || (kind === 'magic' ? 'cast' : kind === 'ranged' ? 'shoot' : (kind === 'melee' && npc.def.attackAnim && !['shoot', 'cast'].includes(npc.def.attackAnim) ? npc.def.attackAnim : a.type));
  game.playAnim(npc, anim, 600);
  if (kind !== 'melee') projectileFor(npc, t, a.projectileColor, delay, { size: a.projectileSize ?? (a.effect === 'dragonfire' ? 0.22 : kind === 'magic' ? 0.14 : 0.07), arc: kind === 'magic' ? 0.5 : 0.3 });
  game.events.emit('npc:attack', { npc, target: t, attack: a, index: npcAttacks(npc).indexOf(a), fromNet: !!opts.fromNet });
  if (opts.visual || t.type === 'remote') return;
  if (a.message && t === game.player) game.message(a.message);
  let r, ignoresProtect = !!a.ignoresProtect;
  if (a.effect === 'dragonfire') {
    // dragonfire always lands; shields, Spellward and antifire potions each cut it down
    ignoresProtect = true;
    const prot = dragonfireProtection(t);
    const max = prot >= 2 ? 0 : prot === 1 ? Math.ceil(a.maxHit * 0.15) : a.maxHit;
    r = { hit: true, damage: rand.int(0, max) };
    game.schedule(delay, () => {
      if (t !== game.player || t.dead) return;
      game.message(prot >= 2 ? 'Your defences turn the dragonfire aside.' : prot === 1 ? 'You are protected from the worst of the dragonfire.' : '<col=c03000>You are horribly scorched by the dragonfire!</col>');
    });
  } else r = rollDamage(npc, t, a.type, kind, { attack: a });
  land(npc, t, r.damage, delay, {
    kind, type: a.type, ignoresProtect,
    onHit: (dealt) => npcHitEffect(npc, t, a, dealt, r.hit),
  });
  if (a.effect === 'aoe') game.schedule(delay, () => game.spawnEffect('splash', t, { color: a.projectileColor }));
}

/** Number of dragonfire protections the player has (shield, Spellward, antifire potion). */
function dragonfireProtection(p) {
  if (p.type !== 'player') return 0;
  let n = 0;
  for (const s of ['shield', 'neck', 'body', 'cape']) if (p.equipment.getDef(s)?.antiDragonfire) { n++; break; }
  if (game.prayer?.isProtected(p, 'magic')) n++;
  const st = store(p);
  if ((st.antifire || 0) > 0) n += st.superAntifire ? 2 : 1;
  return n;
}

/** CSS '#rrggbb' or number -> number. */
function colorNum(c, fallback) {
  if (typeof c === 'number') return c;
  if (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c)) return parseInt(c.replace('#', ''), 16);
  return fallback;
}

function npcHitEffect(npc, t, a, dealt, hit) {
  if (!a.effect || !hit) return;
  if (Math.random() > (a.effectChance ?? (a.effect === 'poison' ? 0.25 : 1))) return;
  switch (a.effect) {
    case 'poison': if (dealt > 0 || a.style !== 'melee') poison(t, a.poison ?? npc.def.poisonDamage ?? 4, npc); break;
    case 'drain_prayer': if (t.type === 'player') { const n = a.drainAmount ?? Math.max(1, dealt); t.skills.setCurrent('prayer', t.skills.getCurrent('prayer') - n); } break;
    case 'bind': case 'freeze': bind(t, a.bindTicks ?? a.freezeTicks ?? 8); break;
    case 'heal': if (dealt > 0) { if (npc.netControlled) game.net?.npcEffect?.(npc, 'heal', dealt); else game.heal(npc, dealt); } break;
    default:
      if (a.effect.startsWith('drain_') && t.type === 'player') lowerStat(t, a.effect.slice(6), a.drainAmount ?? 1);
  }
}

// =============================================================================================
// Status effects: poison, bind, stat drains
// =============================================================================================

function poisonState(t) { return t.type === 'player' ? store(t) : t.state; }

/** Poison a player / NPC with a starting damage. Remote players are poisoned through PvP hits. */
function poison(t, dmg = 4, source = null) {
  if (!t || t.dead || t.type === 'remote') return false;
  if (t.type === 'npc' && (t.def.immunePoison || t.def.immune?.poison)) return false;
  if (t.netControlled) return !!game.net?.npcEffect?.(t, 'poison', dmg); // shared NPC: poisoned on the host
  const st = poisonState(t);
  if ((st.poisonImmune || 0) > 0) return false;
  if (st.poison && st.poison.dmg >= dmg) return false;
  st.poison = { dmg, hits: 0, timer: 1 };
  if (t === game.player) { game.message('<col=00a000>You have been poisoned!</col>'); updatePoisonOrb(); }
  t._poisonSource = source;
  return true;
}

/** Cure poison; immunityTicks protects against new poison (antipoison potions: agent C). */
function curePoison(t = game.player, immunityTicks = 0) {
  const st = poisonState(t);
  const was = !!st.poison;
  st.poison = null;
  if (immunityTicks > 0) st.poisonImmune = Math.max(st.poisonImmune || 0, immunityTicks);
  if (t === game.player) updatePoisonOrb();
  return was;
}

function isPoisoned(t = game.player) { return !!poisonState(t).poison; }

function tickPoison(t) {
  const st = poisonState(t);
  if (st.poisonImmune > 0) st.poisonImmune--;
  const ps = st.poison;
  if (!ps || t.dead) return;
  if (--ps.timer > 0) return;
  ps.timer = POISON_INTERVAL;
  game.applyDamage(t, ps.dmg, { type: 'poison', splat: 'poison', source: null });
  ps.hits++;
  if (ps.hits % 5 === 0) ps.dmg--;
  if (ps.dmg <= 0) {
    st.poison = null;
    if (t === game.player) { game.message('The poison has worn off.'); updatePoisonOrb(); }
  }
}

function updatePoisonOrb() {
  const orb = game.ui?.minimap?.orbs?.hp?.root;
  if (orb) orb.classList.toggle('poisoned', !!store(game.player).poison);
}

function bindState(t) { return t.type === 'player' ? (t._bind ||= {}) : t.state; }
function isBound(t) { return t && t.type !== 'remote' && (bindState(t).boundUntil || 0) > tick(); }

/** Hold a character in place for `ticks` (no effect while immune right after a previous bind). */
function bind(t, ticks) {
  if (!t || t.dead || t.type === 'remote') return false;
  if (t.type === 'npc' && (t.def.immuneBind || t.def.immune?.bind || (t.size || 1) >= 3)) return false;
  const st = bindState(t);
  if ((st.boundUntil || 0) + BIND_IMMUNITY > tick()) return false;
  st.boundUntil = tick() + ticks;
  t.path = [];
  if (t.netControlled) game.net?.npcEffect?.(t, 'bind', ticks); // shared NPC: also held on the host
  game.spawnEffect('sparkle', t, { color: 0x50a030 });
  if (t === game.player) game.message('<col=307020>You are held fast and cannot move!</col>');
  return true;
}

/** Lower a stat by a flat amount (NPC: tracked loss; player: drain). */
function lowerStat(t, skill, amount) {
  if (!t || amount <= 0) return;
  if (t.type === 'npc') {
    const loss = (t.state.statLoss ||= {});
    const base = t.def.stats?.[skill] ?? 1;
    loss[skill] = Math.min(base - 1, (loss[skill] || 0) + amount);
    if (t.netControlled) game.net?.npcEffect?.(t, 'lower', amount, skill);
  } else if (t.type === 'player') t.skills.boost(skill, -amount);
}

/** Lower a stat by a percentage (curses). */
function drainPct(t, skill, pct) {
  if (t.type === 'npc') {
    (t.state.drain ||= {})[skill] = Math.max(t.state.drain[skill] || 0, pct); t.state.drainTick = tick();
    if (t.netControlled) game.net?.npcEffect?.(t, 'drain', pct, skill);
  }
  else if (t.type === 'player') t.skills.boost(skill, -Math.max(1, Math.floor(t.skills.getLevel(skill) * pct)));
}

// =============================================================================================
// Per-tick processing
// =============================================================================================

function processPlayer(p) {
  const t = p.combatTarget;
  if (!t) { chaseFail = 0; return; }
  if (!validTarget(t)) { stopAttacking(p); p.faceTarget = null; return; }
  const mode = attackMode(p);
  const range = attackRange(p, mode);
  p.faceTarget = t;
  const inRange = F.inAttackRange(p, t, range) && (range <= 1 || F.hasLineOfSight(game.world, p, t));
  if (!inRange) {
    if (isBound(p)) return;
    const losBlocked = F.inAttackRange(p, t, range);
    if (!p.path.length || p._chaseX !== t.x || p._chaseY !== t.y) {
      p._chaseX = t.x; p._chaseY = t.y;
      game.moveToward(p, t, losBlocked ? 1 : range);
      if (!p.path.length && !game.inRange(p, t, losBlocked ? 1 : range)) {
        if (++chaseFail >= 3) { game.message("I can't reach that!"); stopAttacking(p); chaseFail = 0; }
      } else chaseFail = 0;
    }
    return;
  }
  chaseFail = 0;
  p.path = [];
  if (p.attackTimer > 0) return;
  if (playerAttack(p, t, mode)) p.attackTimer = attackSpeed(p, mode);
}

function processNpc(npc) {
  const p = game.player;
  const d = npc.def;
  let t = npc.combatTarget;
  if (!t) {
    if (npc.state.returning) {
      if (npc.x === npc.spawnX && npc.y === npc.spawnY) npc.state.returning = false;
      else if (!npc.path.length) { npc.state.returning = false; }
      return;
    }
    // multiplayer host: joiners sharing this NPC can be attacked too (nearest eligible player first)
    const others = npc.netSid != null ? game.net?.npcAggroTargets?.() : null;
    if (others?.length) {
      let best = null, bd = Infinity;
      for (const c of [p, ...others]) {
        const dd = F.footDistance(npc, c);
        if (dd < bd && canAggro(npc, c)) { best = c; bd = dd; }
      }
      if (!best) return;
      t = best;
    } else {
      if (!canAggro(npc, p)) return;
      t = p;
    }
    npc.combatTarget = t;
    npc.faceTarget = t;
  }
  if (t.dead || t.hidden || game.targetGone(t) || (t.type !== 'player' && t.type !== 'remote')) { disengage(npc); return; }
  const fromHome = Math.max(Math.abs(npc.x - npc.spawnX), Math.abs(npc.y - npc.spawnY));
  if (fromHome > npc.wanderRadius + (d.leashRange ?? 10) || F.footDistance(npc, t) > (d.chaseRange ?? 16)) { disengage(npc); return; }
  const atks = npcAttacks(npc);
  const usable = atks.filter((a) => F.inAttackRange(npc, t, a.range) && (a.range <= 1 || F.hasLineOfSight(game.world, npc, t)));
  npc.faceTarget = t;
  if (!usable.length) {
    if (isBound(npc)) return;
    const maxR = Math.max(...atks.map((a) => a.range));
    if (!npc.path.length || npc._chaseX !== t.x || npc._chaseY !== t.y) {
      npc._chaseX = t.x; npc._chaseY = t.y;
      game.moveToward(npc, t, F.inAttackRange(npc, t, maxR) ? 1 : maxR);
    }
    return;
  }
  npc.path = [];
  if (npc.attackTimer > 0) return;
  const a = pickWeighted(usable);
  npcAttack(npc, t, a);
  npc.attackTimer = a.speed ?? d.attackSpeed;
}

function updateTolerance(p) {
  const st = store(p);
  const tol = st.tol || (st.tol = { x: p.x, y: p.y, ticks: 0 });
  if (Math.max(Math.abs(p.x - tol.x), Math.abs(p.y - tol.y)) > TOLERANCE_RADIUS) { tol.x = p.x; tol.y = p.y; tol.ticks = 0; }
  else if (tol.ticks < TOLERANCE_TICKS) tol.ticks++;
}

function onTick() {
  const p = game.player;
  const t = tick();
  for (const c of game.characters()) if (c.attackTimer > 0) c.attackTimer--;
  if (!p.dead) {
    tickPoison(p);
    updateTolerance(p);
    const st = store(p);
    if (st.antifire > 0) {
      st.antifire--;
      if (st.antifire === 25) game.message('<col=c06000>Your resistance to dragonfire is about to wear off.</col>');
      if (st.antifire === 0) { st.superAntifire = false; game.message('<col=c06000>Your resistance to dragonfire has worn off.</col>'); }
    }
  }
  // (multiplayer: shared NPCs on a joiner - npc.netControlled - are simulated by the host, see src/net/npcs.js)
  for (const npc of game.npcs.values()) {
    if (npc.dead || npc.hidden || npc.netControlled) continue;
    if (npc.state.poison || npc.state.poisonImmune) tickPoison(npc);
  }
  if (!p.dead) processPlayer(p);
  for (const npc of game.npcs.values()) {
    if (npc.dead || npc.hidden || npc.netControlled || (npc.netDormant && !npc.combatTarget)) continue;
    processNpc(npc);
  }
  // slow NPC recovery: 1 HP and 1 lost level per minute out of combat; curses fade after 3 minutes
  if (t % 100 === 0) {
    for (const npc of game.npcs.values()) {
      if (npc.dead || npc.combatTarget || npc.netControlled) continue;
      if (npc.hp < npc.maxHp) npc.hp++;
      const loss = npc.state.statLoss;
      if (loss) for (const k of Object.keys(loss)) if (--loss[k] <= 0) delete loss[k];
      if (npc.state.drain && t - (npc.state.drainTick || 0) > 300) npc.state.drain = null;
    }
  }
}

// =============================================================================================
// UI helpers
// =============================================================================================

function chooseAutocast(styleIndex) {
  const p = game.player;
  const lvl = p.skills.getLevel('magic');
  const spells = allSpells().filter((s) => s.type === 'combat' && s.autocast !== false && !s.playersOnly && (s.maxHit || 0) > 0 && s.book === (p.data.spellbook || 'standard'));
  game.ui.openInterface({
    id: 'autocast', title: 'Choose a spell to autocast', width: 280,
    render: (body, close) => {
      const grid = el('div', 'spell-pick');
      for (const sp of spells) {
        const ok = lvl >= sp.level;
        const c = el('div', `icon-cell${ok ? '' : ' locked'}`, `<img alt="" src="${getShapeIcon(sp.icon?.shape || 'rune', sp.icon?.color || '#8ad0ff', sp.icon?.color2)}">`);
        c.title = `${sp.name} (level ${sp.level}) - max hit ${sp.maxHit}`;
        c.onclick = () => {
          if (!ok) { game.message(`You need a Magic level of ${sp.level} to autocast ${sp.name}.`); return; }
          store(p).autocast = sp.id;
          p.combatStyle = styleIndex;
          game.events.emit('combat:style', { player: p, style: F.styleOf(p) });
          close();
          game.ui.refreshTab('combat');
          game.ui.refreshTab('magic');
        };
        grid.appendChild(c);
      }
      const none = el('button', 'btn', 'Clear autocast');
      none.onclick = () => { store(p).autocast = null; if (F.styleOf(p).style === 'autocast') p.combatStyle = 0; close(); game.ui.refreshTab('combat'); game.ui.refreshTab('magic'); };
      body.append(grid, none);
    },
  });
}

// =============================================================================================
// Public API
// =============================================================================================

const api = {
  formulas: F,
  store,
  attackMode, attackSpeed, attackRange, maxHit, ammoStatus, weaponSpecial, rangedInfo, chooseAutocast,
  specArmed: () => specArmed,
  rollDamage, giveCombatXp,
  /** Start attacking an NPC or RemotePlayer with the local player (no walking-to; the loop chases). */
  attack(target, player = game.player) {
    if (!target || target.dead) return false;
    if (target.type === 'npc') {
      const why = npcAttackBlocked(player, target);
      if (why) { game.message(why); return false; }
    } else if (target.type === 'remote') {
      const chk = game.pvp?.canAttack(target);
      if (!chk?.ok) { game.message(chk?.reason || 'You cannot attack that player.'); return false; }
    }
    player._castOnce = null;
    player.combatTarget = target;
    player.faceTarget = target;
    return true;
  },
  /** Cast a combat spell at a target (spellbook "Cast X -> target"). */
  castOn(target, spell, player = game.player) {
    if (!target || target.dead) return false;
    if (target.type === 'npc') {
      const why = npcAttackBlocked(player, target);
      if (why) { game.message(why); return false; }
    } else if (target.type === 'remote') {
      const chk = game.pvp?.canAttack(target);
      if (!chk?.ok) { game.message(chk?.reason || 'You cannot attack that player.'); return false; }
    }
    player._castOnce = spell;
    player.combatTarget = target;
    player.faceTarget = target;
    return true;
  },
  stop(player = game.player) { stopAttacking(player); },
  retaliate,
  poison, curePoison, isPoisoned,
  bind, isBound, lowerStat, drainPct,
  applySpellEffects,
  /** Dragonfire resistance from potions (agent C): ticks of protection; super = full protection alone. */
  setAntifire(player = game.player, ticks = 600, superAntifire = false) {
    const st = store(player);
    st.antifire = Math.max(st.antifire || 0, ticks);
    st.superAntifire = !!superAntifire || !!st.superAntifire;
  },
  dragonfireProtection,
  registerSpecial, getSpecial,
  npcAttacks,
  /** Multiplayer replay of a host-decided NPC attack (src/net/npcs.js): rolls it when `target` is the local player. */
  npcAttack(npc, target, index, opts = {}) {
    const a = npcAttacks(npc)[index];
    if (a && target) npcAttack(npc, target, a, { ...opts, fromNet: true, visual: opts.visual || target !== game.player });
  },
  /** {source, tick} of the last thing that damaged the local player. */
  lastHit: () => ({ source: lastHitBy, tick: lastHitTick }),
  /** True if the local player attacked or was attacked within `ticks` ticks. */
  inCombat(ticks = SINGLE_COMBAT_TICKS) { return tick() - Math.max(lastHitTick, lastAttackTick) < ticks; },
  busyWithOther: (other) => busyWithOther(game.player, other),
  noteAttack() { lastAttackTick = tick(); },
};

export function init(g) {
  game = g;
  F.bindGame(game);
  game.combat = api;
  registerCombatIcons();
  injectCombatCss();
  const I = game.interactions;
  const ev = game.events;

  I.onNpc('Attack', '*', ({ player, target }) => { api.attack(target, player); },
    { range: (ctx) => attackRange(ctx.player) });

  // protect prayers fully block NPC attacks of the matching style
  ev.on('damage:before', (e) => {
    const t = e.target;
    if (t.type !== 'player' || !e.source || e.source.type !== 'npc' || e.ignoresProtect) return;
    const style = e.type === 'melee' || e.type === 'ranged' || e.type === 'magic' ? e.type : null;
    if (style && game.prayer?.isProtected?.(t, style)) e.amount = 0;
  });

  ev.on('damage', ({ target, source }) => {
    if (target === game.player && source && source !== target) {
      lastHitBy = source; lastHitTick = tick();
      // auto retaliate
      const p = target;
      if (p.dead || !p.autoRetaliate || p.combatTarget || p.path.length || p.interaction || p.action) return;
      if (source.type === 'remote' && !game.pvp?.canAttack(source)?.ok) return;
      if (source.dead) return;
      p.combatTarget = source;
      p.faceTarget = source;
    }
  });

  // binds: clear queued movement before the engine moves anyone
  ev.on('tick:start', () => {
    const p = game.player;
    if (isBound(p) && p.path.length) { p.path = []; if (!p._bindMsg || p._bindMsg < tick()) { game.message("You're held fast and can't move!"); p._bindMsg = tick() + 4; } }
    for (const n of game.npcs.values()) if (n.state.boundUntil > tick()) n.path = [];
  });

  ev.on('ui:special', (e) => {
    if (e.handled) return;
    e.handled = true;
    const p = game.player;
    const s = weaponSpecial(p);
    if (!s) { game.message("Your weapon doesn't have a special attack."); return; }
    if (s.instant) {
      if (p.specialEnergy < s.cost) { game.message('You do not have enough special attack energy left.'); return; }
      if (s.instant({ game, combat: api, attacker: p, spec: s })) { p.specialEnergy -= s.cost; ev.emit('special:change', { player: p }); }
    } else {
      specArmed = !specArmed;
      if (specArmed && p.specialEnergy < s.cost) { specArmed = false; game.message('You do not have enough special attack energy left.'); }
    }
    game.ui.refreshTab('combat');
  });
  ev.on('special:change', () => game.ui.refreshTab('combat'));
  ev.on('equip', () => { specArmed = false; });
  ev.on('combat:style', () => game.ui.refreshTab('combat'));

  ev.on('player:respawn', ({ player }) => { curePoison(player); player._bind = {}; specArmed = false; lastHitBy = null; stopAttacking(player); });
  // multiplayer: the host's NPCs leave a tolerant joiner alone (see canAggro)
  ev.on('snapshot', ({ player, snap }) => { if (player === game.player) snap.tolerant = (store(player).tol?.ticks || 0) >= TOLERANCE_TICKS; });
  ev.on('npc:respawn', ({ npc }) => { npc.state.poison = null; npc.state.statLoss = null; npc.state.drain = null; npc.state.boundUntil = 0; npc.state.returning = false; });
  ev.on('game:start', updatePoisonOrb);

  game.onTick(onTick, 10);

  game.ui.registerTab({ id: 'combat', title: 'Combat Options', render: (pane) => renderCombatTab(game, api, pane) });
  ev.on('combatlevel', () => game.ui.refreshTab('combat'));

  setupMultiIndicator(game);
  new OverheadIcons(game, (e) => {
    if (e.type === 'player') return { prayer: game.prayer?.overheadOf?.(e) || null, skull: !!game.wilderness?.isSkulled?.(e) };
    if (e.type === 'remote') {
      const oh = e.extra?.overheads;
      const shape = Array.isArray(oh) && oh.length ? game.prayer?.overheadShape?.(oh[0]) : null;
      return { prayer: shape || null, skull: !!e.extra?.skulled };
    }
    if (e.type === 'npc') return { prayer: e.state.overhead || null, skull: false };
    return null;
  });
}
