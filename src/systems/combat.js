// Combat system. OWNER: agent A.
// STARTER IMPLEMENTATION: basic melee (accuracy/max-hit rolls), NPC retaliation + aggression,
// auto-retaliate and single-target combat spells. Agent A replaces/extends this file freely
// (ranged + ammo, special attacks, poison, PvP rules, multi-combat, ...).

import { getWeaponType } from '../core/registry.js';
import { rand } from '../core/rng.js';

const STYLE_BONUS = { accurate: { attack: 3 }, aggressive: { strength: 3 }, defensive: { defence: 3 }, controlled: { attack: 1, strength: 1, defence: 1 } };
const ATTACK_KEY = { stab: 'attackStab', slash: 'attackSlash', crush: 'attackCrush', magic: 'attackMagic', ranged: 'attackRanged' };
const DEF_KEY = { stab: 'defenceStab', slash: 'defenceSlash', crush: 'defenceCrush', magic: 'defenceMagic', ranged: 'defenceRanged' };

let game;

/** Level used in combat formulas (players: current boosted level x prayer; npcs: def stats). */
function level(c, skill) {
  if (c.type === 'player') return Math.floor(c.skills.getCurrent(skill) * (game.prayer?.multiplier(c, skill) ?? 1));
  if (c.type === 'npc') return c.def.stats[skill] ?? 1;
  return 1;
}
function bonuses(c) { return c.type === 'player' ? c.equipment.bonuses() : c.type === 'npc' ? c.def.bonuses : null; }

/** Current attack style {name, type, style, xp, anim} for a character. */
export function styleOf(c) {
  if (c.type === 'player') {
    const wt = getWeaponType(c.equipment.weaponType());
    return wt.styles[c.combatStyle] || wt.styles[0];
  }
  return { type: c.def?.attackStyle || 'crush', style: 'accurate', anim: c.def?.attackAnim };
}

export function attackRange(c) {
  if (c.type === 'npc') return c.def.attackRange || 1;
  const wt = getWeaponType(c.equipment.weaponType());
  return wt.ranged ? 7 : 1;
}

function hitChance(att, def) { return att > def ? 1 - (def + 2) / (2 * (att + 1)) : att / (2 * (def + 1)); }

function meleeRoll(attacker, defender) {
  const st = styleOf(attacker);
  const sb = STYLE_BONUS[st.style] || {};
  const ab = bonuses(attacker), db = bonuses(defender);
  const effAtt = level(attacker, 'attack') + (sb.attack || 0) + 8;
  const attRoll = effAtt * ((ab?.[ATTACK_KEY[st.type]] || 0) + 64);
  const effDef = level(defender, 'defence') + 8 + (defender.type === 'player' ? (STYLE_BONUS[styleOf(defender).style]?.defence || 0) : 0);
  const defRoll = effDef * ((db?.[DEF_KEY[st.type]] || 0) + 64);
  let maxHit;
  if (attacker.type === 'npc') maxHit = attacker.def.maxHit;
  else {
    const effStr = level(attacker, 'strength') + (sb.strength || 0) + 8;
    maxHit = Math.floor(0.5 + (effStr * ((ab?.strength || 0) + 64)) / 640);
  }
  const hit = Math.random() < hitChance(attRoll, defRoll);
  return { damage: hit ? rand.int(0, maxHit) : 0, style: st };
}

function giveCombatXp(player, style, damage) {
  if (damage <= 0) return;
  const skills = style.xp || ['attack'];
  for (const s of skills) player.skills.addXp(s, (damage * 4) / skills.length);
  player.skills.addXp('hitpoints', damage * 1.33);
}

/** One melee/basic attack from attacker to defender. */
export function performAttack(attacker, defender) {
  const { damage, style } = meleeRoll(attacker, defender);
  game.playAnim(attacker, style.anim || (style.type === 'stab' ? 'stab' : 'slash'), 600);
  const dealt = game.applyDamage(defender, damage, { source: attacker, type: style.type === 'magic' ? 'magic' : style.type === 'ranged' ? 'ranged' : 'melee' });
  if (attacker.type === 'player') giveCombatXp(attacker, style, dealt);
  engage(defender, attacker);
  return dealt;
}

/** Make `defender` fight back if it should. */
function engage(defender, attacker) {
  if (defender.dead) return;
  if (defender.type === 'npc' && !defender.combatTarget && defender.def.options?.includes('Attack')) {
    defender.combatTarget = attacker;
    defender.faceTarget = attacker;
    defender.attackTimer = Math.max(defender.attackTimer, 1);
  }
}

function canAggro(npc, p) {
  if (!npc.def.aggressive || p.dead) return false;
  const wild = game.world.getWildernessLevel(p.x, p.y) > 0;
  if (!wild && p.combatLevel > npc.def.combatLevel * 2) return false;
  if (game.distance(npc, p) > (npc.def.aggroRange ?? 3)) return false;
  if (Math.max(Math.abs(p.x - npc.spawnX), Math.abs(p.y - npc.spawnY)) > npc.wanderRadius + 6) return false;
  if (!game.world.isMulti(p.x, p.y)) {
    for (const o of game.npcs.values()) if (o !== npc && o.combatTarget === p && !o.dead) return false;
  }
  return true;
}

function processAttacker(c) {
  const t = c.combatTarget;
  if (!t) return;
  if (t.dead || t.hidden || game.targetGone(t)) { c.combatTarget = null; c.faceTarget = null; return; }
  if (c.type === 'npc') {
    // give up when dragged too far from home
    if (Math.max(Math.abs(c.x - c.spawnX), Math.abs(c.y - c.spawnY)) > c.wanderRadius + 12) {
      c.combatTarget = null; c.faceTarget = null;
      game.pathTo(c, { x0: c.spawnX, y0: c.spawnY, x1: c.spawnX, y1: c.spawnY });
      return;
    }
  }
  const range = attackRange(c);
  c.faceTarget = t;
  if (!game.inRange(c, t, range)) {
    if (c.type === 'npc' || !c.path.length || c._chaseX !== t.x || c._chaseY !== t.y) {
      c._chaseX = t.x; c._chaseY = t.y;
      game.moveToward(c, t, range);
    }
    return;
  }
  c.path = [];
  if (c.attackTimer <= 0) {
    performAttack(c, t);
    c.attackTimer = c.type === 'player' ? c.equipment.attackSpeed() : c.def.attackSpeed;
  }
}

export function init(g) {
  game = g;
  const I = game.interactions;

  I.onNpc('Attack', '*', ({ player, target }) => {
    if (target.dead) return;
    player.combatTarget = target;
    player.faceTarget = target;
    if (player.attackTimer <= 0) { performAttack(player, target); player.attackTimer = player.equipment.attackSpeed(); }
  }, { range: (ctx) => attackRange(ctx.player) });

  // Single-target combat spells (spell.type === 'combat')
  I.onSpellOnNpc('*', '*', ({ player, target, spell }) => {
    if (spell.type !== 'combat') return false;
    if (!game.magic?.canCast(player, spell)) return;
    if (player.attackTimer > 0) return;
    game.magic.consumeRunes(player, spell);
    player.faceTarget = target;
    game.playAnim(player, 'cast', 1000);
    game.spawnEffect('projectile', player, { to: target, color: spell.projectile ?? 0xffffff, ms: 900 });
    player.attackTimer = 5;
    player.skills.addXp('magic', spell.xp);
    game.schedule(2, () => {
      if (target.dead) return;
      const att = (level(player, 'magic') + 8) * ((player.equipment.bonuses().attackMagic || 0) + 64);
      const def = ((target.def.stats.magic ?? 1) + 9) * ((target.def.bonuses.defenceMagic || 0) + 64);
      if (Math.random() < hitChance(att, def)) {
        const d = game.applyDamage(target, rand.int(0, spell.maxHit || 1), { source: player, type: 'magic' });
        player.skills.addXp('magic', d * 2);
        player.skills.addXp('hitpoints', d * 1.33);
      } else {
        game.spawnEffect('splash', target);
        game.applyDamage(target, 0, { source: player, type: 'magic' });
      }
      engage(target, player);
    });
  }, { range: 10 });

  // auto retaliate
  game.events.on('damage', ({ target, source }) => {
    if (target.type !== 'player' || !source || target.dead) return;
    if (target.autoRetaliate && !target.combatTarget && !target.path.length && !target.action && !target.interaction) {
      target.combatTarget = source;
      target.faceTarget = source;
    }
  });

  game.onTick(() => {
    const p = game.player;
    for (const c of game.characters()) if (c.attackTimer > 0) c.attackTimer--;
    if (!p.dead) processAttacker(p);
    for (const npc of game.npcs.values()) {
      if (npc.dead || npc.hidden) continue;
      if (!npc.combatTarget && canAggro(npc, p)) { npc.combatTarget = p; npc.attackTimer = 1; }
      processAttacker(npc);
    }
  }, 10);
}
