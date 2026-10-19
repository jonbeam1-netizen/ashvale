// The Drowned Sun - reward items, raid-only supplies, special attacks, the Sunling pet and ornament kits.
// Imported by content/raid.js. Runtime handlers (chest, supplies, kits, passives): src/systems/raid_rewards.js.
//
// Uniques (above emberite; level 80):
//   raid_dawnrend         melee longsword        spec Sunder (+30% dmg, +25% acc, saps 10% Defence)
//   raid_hymnstring       bow (ranged)           spec Solar Volley (three arrows)
//   raid_eclipse_staff    staff (magic)          spec Corona (instant: sunfire burst on your target and foes beside it, heals you)
//   raid_sun_helm / raid_sun_cuirass / raid_sun_greaves   Sunwrought armour; full set: 10% less damage from monsters
//   raid_choir_aegis      off-hand (shield)      counts as dragonfire protection
//   raid_hymn_ring        ring                   special energy regenerates 50% faster
// Cosmetics: raid_kit_dawnfire (weapons -> *_or), raid_kit_tidewrought (armour + aegis -> *_or); pet: Sunling.

import { registerItem, registerNpc, registerData } from '../core/registry.js';
import { registerSpecial } from '../systems/combat_specials.js';

const SUN = '#e8b040', SUN_TRIM = '#fff2c0', SUN_GLOW = '#ffd060';
const DAWN = { color: '#f4efe4', trim: '#ffb040', glow: '#ff8020' };      // Dawnfire ornament look
const TIDE = { color: '#2a6a78', trim: '#9af0ff', glow: '#40e0ff' };      // Tidewrought ornament look

const RAID_VALUE = { weapon: 4500000, armour: 2200000, offhand: 1800000, ring: 2500000 };

/** Unique table (weights): rolled by systems/raid_rewards.js. */
export const RAID_UNIQUES = [
  { id: 'raid_sun_helm', weight: 7 },
  { id: 'raid_sun_greaves', weight: 6 },
  { id: 'raid_sun_cuirass', weight: 5 },
  { id: 'raid_choir_aegis', weight: 5 },
  { id: 'raid_hymn_ring', weight: 5 },
  { id: 'raid_dawnrend', weight: 3 },
  { id: 'raid_hymnstring', weight: 3 },
  { id: 'raid_eclipse_staff', weight: 3 },
];
export const RAID_WEAPONS = ['raid_dawnrend', 'raid_hymnstring', 'raid_eclipse_staff'];
export const RAID_ARMOUR = ['raid_sun_helm', 'raid_sun_cuirass', 'raid_sun_greaves', 'raid_choir_aegis'];
export const SUNWROUGHT_SET = ['raid_sun_helm', 'raid_sun_cuirass', 'raid_sun_greaves'];

// =================================================================================================
// Special attacks (registry: systems/combat_specials.js, see docs/COMBAT_API.md)
// =================================================================================================
registerSpecial('sunder', {
  name: 'Sunder', description: 'A blazing cut with 25% boosted accuracy and 30% boosted damage that saps 10% of the target\'s Defence.',
  cost: 50, accuracy: 1.25, damage: 1.3, anim: 'slash', color: 0xffc040,
  onHit({ combat, target }, dmg) { if (dmg > 0) combat.drainPct?.(target, 'defence', 0.1); },
});
registerSpecial('solar_volley', {
  name: 'Solar Volley', description: 'Looses three sun-touched arrows at once, each with 30% boosted accuracy.',
  cost: 60, modes: ['ranged'], hits: 3, ammo: 3, accuracy: 1.3, damage: 0.85, color: 0xffe080,
});
registerSpecial('corona', {
  name: 'Corona', description: 'Instantly bursts sunfire on your target and up to three foes beside it (multi-combat) with 30% boosted damage and 50% boosted accuracy. Heals you for a quarter of the damage. Needs an autocast spell.',
  cost: 50, modes: ['melee', 'ranged', 'magic'],
  instant({ game, combat, attacker }) {
    const t = attacker.combatTarget;
    const mode = combat.attackMode?.(attacker);
    if (!mode || mode.kind !== 'magic' || !mode.spell) { game.message('Corona needs an autocast spell.'); return false; }
    if (!t || t.dead || t.hidden || t.type !== 'npc') { game.message('Corona needs a target - attack something first.'); return false; }
    const F = combat.formulas;
    if (F.footDistance(attacker, t) > 10 || !F.hasLineOfSight(game.world, attacker, t)) { game.message('Your target is too far away.'); return false; }
    const targets = [t];
    if (game.world.isMulti(t.x, t.y)) for (const n of game.npcsNear(t.x, t.y, 1, (n) => n !== t && n.def.options?.includes('Attack') && n.def.combatLevel > 0)) if (targets.length < 4) targets.push(n);
    const max = Math.floor(F.magicMaxHit(attacker, mode.spell) * 1.3);
    const delay = F.hitDelay('magic', F.footDistance(attacker, t));
    game.playAnim(attacker, 'cast', 600);
    game.spawnEffect('special', attacker, { color: 0xffc040 });
    game.spawnEffect('projectile', attacker, { to: t, color: 0xffd040, ms: Math.max(300, delay * 600 - 120), size: 0.3, arc: 0.4 });
    let total = 0;
    game.schedule(delay, () => {
      for (const tg of targets) {
        if (tg.dead || tg.hidden) continue;
        const a = F.attackRoll(attacker, 'magic') * 1.5, d = F.defenceRoll(tg, 'magic');
        const dmg = Math.random() < F.hitChance(a, d) ? Math.floor(Math.random() * (max + 1)) : 0;
        const dealt = game.applyDamage(tg, dmg, { source: attacker, type: 'magic', combatHit: true });
        game.spawnEffect('splash', tg, { color: 0xffb030 });
        total += dealt;
        if (dealt > 0) { attacker.skills.addXp('magic', dealt * 2); attacker.skills.addXp('hitpoints', dealt * 1.33); }
        combat.retaliate?.(tg, attacker);
      }
      if (total > 0) game.heal(attacker, Math.floor(total / 4));
    });
    return true;
  },
});

// =================================================================================================
// Unique gear
// =================================================================================================
const looks = (base, alt) => ({ color: alt?.color ?? base.color, trim: alt?.trim ?? base.trim, glow: alt?.glow ?? base.glow });

function weapon(id, def, alt = null) {
  const L = looks({ color: def.color, trim: def.trim, glow: def.glow }, alt);
  return registerItem({
    value: RAID_VALUE.weapon, tradeable: true, slot: 'weapon', raidUnique: true, ...def,
    id, color: L.color,
    icon: { shape: def.iconShape, color: L.color, color2: L.trim },
    model: { shape: def.modelShape, color: L.color, color2: L.trim, trim: L.trim, glow: L.glow },
  });
}
function armour(id, def, alt = null) {
  const L = looks({ color: SUN, trim: SUN_TRIM, glow: SUN_GLOW }, alt);
  return registerItem({
    value: def.slot === 'shield' ? RAID_VALUE.offhand : RAID_VALUE.armour, tradeable: true, raidUnique: true, ...def,
    id, color: L.color,
    icon: { shape: def.iconShape, color: L.color, color2: L.trim },
    // no emissive glow on worn armour (it floods the whole body with bloom in dark chambers) - trim only
    model: { shape: def.modelShape, color: L.color, color2: L.trim, trim: L.trim, ...(def.model || {}) },
  });
}

const DAWNREND = {
  name: 'Dawnrend', examine: 'A Sunsworn blade that still remembers noon. It cuts through shadow and plate alike.',
  requirements: { attack: 80 }, weaponType: 'longsword', attackSpeed: 4, special: { id: 'sunder', cost: 50 },
  bonuses: { attackStab: 62, attackSlash: 116, attackCrush: -2, defenceStab: 2, defenceSlash: 4, defenceCrush: 2, strength: 108 },
  color: '#e8c060', trim: '#fff2c0', glow: '#ffb030', iconShape: 'longsword', modelShape: 'longsword',
};
const HYMNSTRING = {
  name: 'Hymnstring', examine: 'Its string hums a single, endless note. Arrows loosed from it shine like falling stars.',
  requirements: { ranged: 80 }, weaponType: 'bow', twoHanded: true, attackSpeed: 5, special: { id: 'solar_volley', cost: 60 },
  bonuses: { attackRanged: 108, rangedStrength: 10, defenceMagic: 6 },
  color: '#8a5a20', trim: '#ffe080', glow: '#ffd060', iconShape: 'bow', modelShape: 'bow',
};
const ECLIPSE = {
  name: 'Eclipse staff', examine: 'A staff crowned with a sun swallowed by a moon. It burns with fire and water both.',
  requirements: { magic: 80 }, weaponType: 'staff', twoHanded: true, attackSpeed: 5, special: { id: 'corona', cost: 50 },
  providesSigil: ['fire_sigil', 'water_sigil'],
  bonuses: { attackCrush: 22, attackMagic: 34, defenceMagic: 22, defenceStab: 4, defenceSlash: 4, defenceCrush: 4, magicDamage: 15, strength: 8 },
  color: '#3a2a4a', trim: '#ffd060', glow: '#ff9a20', iconShape: 'staff', modelShape: 'staff',
};
const HELM = {
  name: 'Sunwrought helm', examine: 'Gold-skinned armour forged for the choir\'s guard. Part of the Sunwrought set.', slot: 'head', requirements: { defence: 80 },
  bonuses: { attackStab: 3, attackSlash: 3, attackCrush: 3, attackMagic: 2, attackRanged: 3, defenceStab: 56, defenceSlash: 58, defenceCrush: 54, defenceMagic: 12, defenceRanged: 56, strength: 4, prayer: 2 },
  iconShape: 'fullhelm', modelShape: 'full_helm', model: { crest: '#ffd060' },
};
const CUIRASS = {
  name: 'Sunwrought cuirass', examine: 'It never tarnishes, even in the aquifer. Part of the Sunwrought set.', slot: 'body', requirements: { defence: 80 },
  bonuses: { attackStab: 4, attackSlash: 4, attackCrush: 4, attackMagic: -6, attackRanged: 4, defenceStab: 122, defenceSlash: 120, defenceCrush: 114, defenceMagic: 22, defenceRanged: 120, strength: 6, prayer: 3 },
  iconShape: 'platebody', modelShape: 'platebody',
};
const GREAVES = {
  name: 'Sunwrought greaves', examine: 'Golden leg plates, light as linen. Part of the Sunwrought set.', slot: 'legs', requirements: { defence: 80 },
  bonuses: { attackStab: 3, attackSlash: 3, attackCrush: 3, attackMagic: -4, attackRanged: 3, defenceStab: 86, defenceSlash: 84, defenceCrush: 80, defenceMagic: 15, defenceRanged: 84, strength: 4, prayer: 1 },
  iconShape: 'legs', modelShape: 'platelegs',
};
const AEGIS = {
  name: 'Aegis of the Sunken Choir', examine: 'A sunburst shield. The choir sang into it, and it still sings back. Wards off dragonfire.', slot: 'shield', requirements: { defence: 80 },
  antiDragonfire: true,
  bonuses: { attackMagic: -4, attackRanged: -2, defenceStab: 72, defenceSlash: 74, defenceCrush: 70, defenceMagic: 32, defenceRanged: 76, strength: 3, prayer: 5 },
  iconShape: 'shield', modelShape: 'kite',
};

weapon('raid_dawnrend', DAWNREND);
weapon('raid_hymnstring', HYMNSTRING);
weapon('raid_eclipse_staff', ECLIPSE);
armour('raid_sun_helm', HELM);
armour('raid_sun_cuirass', CUIRASS);
armour('raid_sun_greaves', GREAVES);
armour('raid_choir_aegis', AEGIS);
registerItem({
  id: 'raid_hymn_ring', name: 'Ring of the Seventh Hymn', examine: 'The seventh hymn was the one that worked - briefly. While worn, special attack energy regenerates 50% faster.',
  value: RAID_VALUE.ring, tradeable: true, slot: 'ring', requirements: {}, raidUnique: true, color: SUN, hymnRing: true,
  bonuses: { attackStab: 8, attackSlash: 8, attackCrush: 8, attackMagic: 8, attackRanged: 8, strength: 5, rangedStrength: 3, magicDamage: 3, prayer: 2 },
  icon: { shape: 'ring', color: SUN, color2: '#ffffff' },
});

// ---- ornamented versions (cosmetic only; same stats) --------------------------------------------------
export const ORNAMENTS = {};   // base id -> {or: ornament id, kit}
const ornament = (base, def, kit, alt, reg) => {
  const id = `${base}_or`;
  const wear = (def.slot || 'weapon') === 'weapon' || def.slot === 'shield' ? 'Wield' : 'Wear';
  reg(id, { ...def, name: `${def.name} (or)`, examine: `${def.examine} It has been ornamented.`, value: 0, options: [wear, 'Dismantle'], ornamentOf: base, kit }, alt);
  ORNAMENTS[base] = { or: id, kit };
};
ornament('raid_dawnrend', DAWNREND, 'raid_kit_dawnfire', DAWN, weapon);
ornament('raid_hymnstring', HYMNSTRING, 'raid_kit_dawnfire', DAWN, weapon);
ornament('raid_eclipse_staff', ECLIPSE, 'raid_kit_dawnfire', { color: '#f4efe4', trim: '#ffd060', glow: '#ffffff' }, weapon);
ornament('raid_sun_helm', HELM, 'raid_kit_tidewrought', TIDE, armour);
ornament('raid_sun_cuirass', CUIRASS, 'raid_kit_tidewrought', TIDE, armour);
ornament('raid_sun_greaves', GREAVES, 'raid_kit_tidewrought', TIDE, armour);
ornament('raid_choir_aegis', AEGIS, 'raid_kit_tidewrought', TIDE, armour);
registerItem({ id: 'raid_kit_dawnfire', name: 'Dawnfire ornament kit', examine: 'Use it on Dawnrend, the Hymnstring or the Eclipse staff to gild it in white-gold flame.',
  value: 0, tradeable: true, icon: { shape: 'scroll', color: '#f4efe4', color2: '#ffb040' } });
registerItem({ id: 'raid_kit_tidewrought', name: 'Tidewrought ornament kit', examine: 'Use it on Sunwrought armour or the Aegis to give it the aquifer\'s deep teal.',
  value: 0, tradeable: true, icon: { shape: 'scroll', color: '#2a6a78', color2: '#9af0ff' } });

// =================================================================================================
// Raid-only supplies (made in the Drowned Cistern; they crumble outside the citadel)
// =================================================================================================
const CRUMBLE = ' It would crumble to sand outside the citadel.';
const supply = (def) => registerItem({ value: 0, tradeable: false, raidSupply: true, ...def, examine: def.examine + CRUMBLE });
supply({ id: 'raid_raw_eel', name: 'Raw cistern eel', examine: 'Pale, cold and wriggling.', icon: { shape: 'fish', color: '#c8d8d0', color2: '#8aa0a0' } });
supply({ id: 'raid_eel', name: 'Cistern eel', examine: 'Cooked over a choir brazier. Surprisingly filling.', heal: 22, icon: { shape: 'fish', color: '#d8a060', color2: '#8a5a30' } });
supply({ id: 'raid_burnt_eel', name: 'Burnt eel', examine: 'Charcoal with a tail.', icon: { shape: 'fish', color: '#3a2a20', color2: '#1a1410' } });
supply({ id: 'raid_glowcap', name: 'Glowcap', examine: 'A mushroom that glows faintly gold.', icon: { shape: 'herb', color: '#ffd060', color2: '#8a6a20' } });
supply({ id: 'raid_lotus', name: 'Drowned lotus', examine: 'A pale blue lotus, still wet.', icon: { shape: 'herb', color: '#a0e8ff', color2: '#4a8aa0' } });
for (let n = 1; n <= 4; n++) {
  supply({ id: `raid_tonic_${n}`, name: `Sunwell tonic (${n})`, examine: 'Restores health and prayer and sharpens every combat skill.', options: ['Drink'], doses: n, raidTonic: n,
    icon: { shape: 'potion', color: '#ffc040', color2: '#fff0b0' } });
}
export const RAID_SUPPLIES = ['raid_raw_eel', 'raid_eel', 'raid_burnt_eel', 'raid_glowcap', 'raid_lotus', 'raid_tonic_1', 'raid_tonic_2', 'raid_tonic_3', 'raid_tonic_4'];

// =================================================================================================
// Pet: Sunling (rolled by systems/raid_rewards.js on completion)
// =================================================================================================
const SUNLING = {
  id: 'sunling', name: 'Sunling', examine: 'A sliver of Aurvael that woke up hungry for daylight. It glows when it is happy, which is always.',
  source: { event: 'The Drowned Sun', chance: 1 / 40 }, icon: '#ffc040',
  model: { template: 'glow_dragon', scale: 0.22, colors: { body: '#d8a040', belly: '#fff0c0', horn: '#ffffff' }, wings: '#e8b040', spikes: '#ffe080', glowEyes: '#ffffff', breath: '#ffd060' },
  talk: ['*chirps a tiny, off-key hymn*', '*basks in the light of your torch*', 'Rrrrr! (It is trying to be a sun.)'],
};
registerItem({ id: 'pet_sunling', name: SUNLING.name, examine: SUNLING.examine, value: 0, tradeable: false, destroy: false, options: ['Summon'], pet: SUNLING.id,
  icon: { shape: 'paw', color: SUNLING.icon, color2: '#ffffff' } });
registerNpc({ id: 'follower_sunling', name: SUNLING.name, examine: SUNLING.examine, combatLevel: 0, options: ['Talk-to', 'Pick-up'], wanderRadius: 0,
  stats: { hitpoints: 1 }, model: SUNLING.model, pet: SUNLING.id });
registerData('pets', SUNLING.id, SUNLING);
