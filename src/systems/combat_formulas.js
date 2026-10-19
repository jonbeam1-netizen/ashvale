// Combat formulas (OSRS-style accuracy / defence rolls and max hits). OWNER: agent A.
// Pure-ish helpers: everything reads a "combatant" which may be the local Player, an Npc or a
// RemotePlayer (stats taken from its network snapshot, see docs/PVP_API.md).
//
//   effective level  = floor(level * prayer) + stance bonus + 8          (players)
//                    = level + 9                                         (NPCs)
//   attack roll      = effective attack-ish level * (attack bonus + 64)
//   defence roll     = effective defence * (defence bonus + 64)
//                      (vs magic, players use 70% Magic + 30% Defence)
//   hit chance       = a > d ? 1 - (d + 2) / (2(a + 1)) : a / (2(d + 1))
//   melee max hit    = floor(0.5 + effStr * (strength bonus + 64) / 640)
//   ranged max hit   = floor(0.5 + effRangedStr * (ranged strength + 64) / 640)
//   magic max hit    = floor(spell max * (1 + magic damage % / 100))

import { getWeaponType, getPrayer } from '../core/registry.js';
import { emptyBonuses } from '../core/constants.js';

/** Stance (attack style) invisible level bonuses. */
export const STANCE = {
  accurate: { attack: 3, ranged: 3, magic: 2 },
  aggressive: { strength: 3 },
  defensive: { defence: 3 },
  controlled: { attack: 1, strength: 1, defence: 1 },
  rapid: {},
  longrange: { defence: 3 },
  autocast: {},
};

export const ATTACK_KEY = { stab: 'attackStab', slash: 'attackSlash', crush: 'attackCrush', magic: 'attackMagic', ranged: 'attackRanged' };
export const DEF_KEY = { stab: 'defenceStab', slash: 'defenceSlash', crush: 'defenceCrush', magic: 'defenceMagic', ranged: 'defenceRanged' };
export const MELEE_TYPES = new Set(['stab', 'slash', 'crush']);

/** Balance (docs/BALANCE.md): minimum damage of a player's hit that passed the accuracy roll. */
export const PLAYER_LANDED_MIN = 1;

/** 'stab'|'slash'|'crush' -> 'melee'; 'ranged' / 'magic' unchanged (damage type for applyDamage). */
export const damageType = (t) => (MELEE_TYPES.has(t) || t === 'melee' ? 'melee' : t);

let game = null;
export function bindGame(g) { game = g; }

// ---------------------------------------------------------------------------------------------
// Combatant accessors
// ---------------------------------------------------------------------------------------------

/** Current (boosted / drained) level of a skill for any combatant. */
export function levelOf(c, skill) {
  if (c.type === 'player') return c.skills.getCurrent(skill);
  if (c.type === 'npc') {
    let v = (c.def.stats?.[skill] ?? 1) - (c.state.statLoss?.[skill] || 0);
    const pct = c.state.drain?.[skill];
    if (pct) v = Math.floor(v * (1 - pct));
    return Math.max(1, v);
  }
  if (c.type === 'remote') {
    const l = c.extra?.levels?.[skill];
    if (l != null) return l;
    if (skill === 'hitpoints') return c.maxHp || 10;
    return Math.max(1, Math.round((c.combatLevel || 3) * 0.8));
  }
  return 1;
}

/** Equipment bonuses for any combatant. */
export function bonusesOf(c) {
  if (c.type === 'player') return c.equipment.bonuses();
  if (c.type === 'npc') return c.def.bonuses || emptyBonuses();
  if (c.type === 'remote') return { ...emptyBonuses(), ...(c.extra?.bonuses || {}) };
  return emptyBonuses();
}

/** Prayer multiplier for a stat key (attack/strength/defence/ranged/rangedStrength/magic). */
export function prayerMult(c, key) {
  if (c.type === 'player') return game?.prayer?.multiplier ? game.prayer.multiplier(c, key) : 1;
  if (c.type === 'remote') {
    let m = 1;
    for (const id of c.extra?.prayers || []) {
      const fx = getPrayer(id)?.effects;
      if (!fx) continue;
      const v = fx[key] ?? (key === 'rangedStrength' ? fx.ranged : undefined);
      if (v) m *= v;
    }
    return m;
  }
  return 1;
}

/** Current attack style {name, type, style, xp, anim} of a combatant. */
export function styleOf(c) {
  if (c.type === 'player') {
    const wt = getWeaponType(c.equipment.weaponType());
    return wt.styles[c.combatStyle] || wt.styles[0];
  }
  if (c.type === 'remote') return { type: 'crush', style: c.extra?.stance || 'accurate' };
  return { type: c.def?.attackStyle || 'crush', style: 'accurate', anim: c.def?.attackAnim };
}

const stanceOf = (c) => (c.type === 'npc' ? null : styleOf(c).style);

function effective(c, skill, prayerKey = skill, stance = stanceOf(c)) {
  if (c.type === 'npc') return levelOf(c, skill) + 9;
  return Math.floor(levelOf(c, skill) * prayerMult(c, prayerKey)) + (STANCE[stance]?.[skill] || 0) + 8;
}

// ---------------------------------------------------------------------------------------------
// Rolls
// ---------------------------------------------------------------------------------------------

/**
 * Attack roll.
 * @param attacker combatant
 * @param type 'stab'|'slash'|'crush'|'ranged'|'magic'
 * @param opts { bonuses?: override bonus object (NPC attack entries) }
 */
export function attackRoll(attacker, type, opts = {}) {
  const b = opts.bonuses || bonusesOf(attacker);
  let eff;
  if (type === 'ranged') eff = effective(attacker, 'ranged');
  else if (type === 'magic') {
    eff = attacker.type === 'npc' ? levelOf(attacker, 'magic') + 9 : Math.floor(levelOf(attacker, 'magic') * prayerMult(attacker, 'magic')) + 9;
  } else eff = effective(attacker, 'attack');
  return Math.max(0, eff * ((b[ATTACK_KEY[type]] || 0) + 64));
}

/** Defence roll of `defender` against an attack of `type`. */
export function defenceRoll(defender, type) {
  const b = bonusesOf(defender);
  const key = DEF_KEY[type] || 'defenceCrush';
  if (defender.type === 'npc') {
    const lvl = type === 'magic' ? levelOf(defender, 'magic') : levelOf(defender, 'defence');
    return (lvl + 9) * ((b[key] || 0) + 64);
  }
  if (type === 'magic') {
    const mag = Math.floor(levelOf(defender, 'magic') * prayerMult(defender, 'magic'));
    const def = Math.floor(levelOf(defender, 'defence') * prayerMult(defender, 'defence'));
    const eff = Math.floor(mag * 0.7 + def * 0.3) + 8;
    return eff * ((b[key] || 0) + 64);
  }
  return effective(defender, 'defence') * ((b[key] || 0) + 64);
}

/** OSRS hit chance from the two rolls. */
export function hitChance(a, d) {
  if (a > d) return 1 - (d + 2) / (2 * (a + 1));
  return a / (2 * (d + 1));
}

/** Melee max hit for a player / remote. */
export function meleeMaxHit(c) {
  const b = bonusesOf(c);
  const effStr = effective(c, 'strength');
  return Math.max(1, Math.floor(0.5 + (effStr * ((b.strength || 0) + 64)) / 640));
}

/** Ranged max hit (ranged strength from ammo / thrown weapon is part of the equipment total). */
export function rangedMaxHit(c) {
  const b = bonusesOf(c);
  const eff = Math.floor(levelOf(c, 'ranged') * prayerMult(c, 'rangedStrength')) + (STANCE[stanceOf(c)]?.ranged || 0) + 8;
  return Math.max(1, Math.floor(0.5 + (eff * ((b.rangedStrength || 0) + 64)) / 640));
}

/** Magic max hit for a spell, boosted by the caster's % magic damage bonus. */
export function magicMaxHit(c, spell) {
  const base = typeof spell.maxHit === 'function' ? spell.maxHit(c) : (spell.maxHit || 0);
  if (c.type === 'npc') return base;
  const pct = bonusesOf(c).magicDamage || 0;
  return Math.floor(base * (1 + pct / 100));
}

/** Player max hit for the given mode (for UI). */
export function maxHitFor(c, mode, spell) {
  if (mode === 'magic' && spell) return magicMaxHit(c, spell);
  if (mode === 'ranged') return rangedMaxHit(c);
  return meleeMaxHit(c);
}

// ---------------------------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------------------------

const rectOf = (e) => (e.rect ? e.rect() : { x0: e.x, y0: e.y, x1: e.x, y1: e.y });

/** Gap between two footprints along each axis (0 = overlapping on that axis). */
export function gap(a, b) {
  const A = rectOf(a), B = rectOf(b);
  const dx = Math.max(B.x0 - A.x1, A.x0 - B.x1, 0);
  const dy = Math.max(B.y0 - A.y1, A.y0 - B.y1, 0);
  return { dx, dy };
}

/** Footprint-aware attack range test (1 = cardinal melee, n = Chebyshev <= n, never overlapping). */
export function inAttackRange(a, b, range) {
  const { dx, dy } = gap(a, b);
  if (dx === 0 && dy === 0) return false;
  if (range <= 1) return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  return Math.max(dx, dy) <= range;
}

/** Chebyshev distance between footprints. */
export function footDistance(a, b) { const { dx, dy } = gap(a, b); return Math.max(dx, dy); }

/** Line-of-sight for projectiles: walls / blocking objects stop it; water and pits don't. */
export function hasLineOfSight(world, a, b) {
  const ax = a.centerX ? a.centerX() : a.x + 0.5, ay = a.centerY ? a.centerY() : a.y + 0.5;
  const bx = b.centerX ? b.centerX() : b.x + 0.5, by = b.centerY ? b.centerY() : b.y + 0.5;
  const steps = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2);
  const A = rectOf(a), B = rectOf(b);
  for (let i = 1; i < steps; i++) {
    const x = Math.floor(ax + ((bx - ax) * i) / steps), y = Math.floor(ay + ((by - ay) * i) / steps);
    if (x >= A.x0 && x <= A.x1 && y >= A.y0 && y <= A.y1) continue;
    if (x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1) continue;
    if (world.isWalkable(x, y) || world.isWater(x, y)) continue;
    // terrain like lava/void doesn't stop projectiles either; only blocking objects / mountains do
    const t = world.terrainAt(x, y);
    const objBlocked = world.objBlock?.[world.idx(x, y)] > 0;
    if (!objBlocked && t && (t.liquid || t.id === 'void' || t.id === 'lava' || t.id === 'ditch')) continue;
    return false;
  }
  return true;
}

/** Ticks before a projectile lands (OSRS-like). */
export function hitDelay(mode, distance) {
  if (mode === 'ranged') return 1 + Math.floor((3 + distance) / 6);
  if (mode === 'magic') return 1 + Math.floor((1 + distance) / 3);
  return 0;
}
