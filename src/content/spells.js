// Sigils + combat spells. OWNER: agent A. (Utility / teleport / alchemy spells: agent F, registered in
// src/content/spells_utility.js. The Magic tab shows every registered spell of the player's book.)
//
// registerSpell({ id, name, level, xp, runes: {sigilId: qty}, book: 'standard',
//   type: 'combat'|'teleport'|'utility'|'alchemy'|'enchant', targets: [] | ['npc','player'] | ['item'] | ['object'] | ['ground'],
//   icon: {shape, color, color2}, description,
//   // combat spells (handled by systems/magic.js + combat.js):
//   maxHit, projectile: 0xRRGGBB, element, tier, autocast: true,
//   bind: ticks, poison: startDamage, heal: fraction of damage healed, drain: {skill, pct},
//   teleblock: ticks, playersOnly: true,
//   // utility spells (agent F): onCast(game, player, target) -> false to cancel (no sigils / xp used)
// })
//
// `runes` holds the sigil cost (field name kept for engine compatibility). Equipped items with
// `providesSigil: 'fire_sigil'` (or an array) count as an infinite supply of that sigil (elemental staves).
//
// SIGIL IDS (for Runebinding, agent C): wind_sigil water_sigil earth_sigil fire_sigil mind_sigil (basic)
//   rift_sigil (tier-2 catalyst), void_sigil (tier-3), aether_sigil (tier-4), crimson_sigil (tier-5 / life-sap),
//   thorn_sigil (binding & curses; also usable as a nature-style catalyst), nexus_sigil (teleport/tether catalyst).

import { registerItem, registerSpell } from '../core/registry.js';

const sigil = (id, name, color, value, examine) => registerItem({
  id, name, stackable: true, value, icon: { shape: 'rune', color },
  examine: examine || `A sigil-stone bound with ${name.split(' ')[0].toLowerCase()} essence.`,
});
sigil('wind_sigil', 'Wind sigil', '#e8f4ff', 4);
sigil('water_sigil', 'Water sigil', '#3a80ff', 4);
sigil('earth_sigil', 'Earth sigil', '#8a5a2a', 4);
sigil('fire_sigil', 'Fire sigil', '#ff5020', 4);
sigil('mind_sigil', 'Mind sigil', '#e8a020', 3);
sigil('thorn_sigil', 'Thorn sigil', '#3aa040', 45, 'A sigil-stone laced with living briar. Used for binding and curses.');
sigil('rift_sigil', 'Rift sigil', '#c060ff', 70, 'A sigil-stone that hums with a tear between places.');
sigil('nexus_sigil', 'Nexus sigil', '#60e0e0', 160, 'A sigil-stone that knots distant places together.');
sigil('void_sigil', 'Void sigil', '#30303a', 180, 'A sigil-stone so dark it seems to drink the light.');
sigil('aether_sigil', 'Aether sigil', '#f0f0a0', 260, 'A sigil-stone that floats a hair above your palm.');
sigil('crimson_sigil', 'Crimson sigil', '#b01828', 320, 'A sigil-stone that pulses like a heartbeat.');
// (pale_essence is registered by agent B in gathering_items.js)

// Home teleport (kept here from Phase 1; agent F may override it from spells_utility.js).
registerSpell({
  id: 'hearth_teleport', name: 'Hearthward Teleport', level: 1, xp: 0, type: 'teleport', runes: {}, teleport: { x: 96, y: 141 },
  description: 'Teleports you home to Brackenford.', icon: { shape: 'star', color: '#80c0ff' },
});

// ---- elemental ladder ------------------------------------------------------------------------
const ELEMENTS = [
  { el: 'wind', name: 'Wind', color: '#e8f4ff', proj: 0xe8f4ff, sigil: 'wind_sigil' },
  { el: 'water', name: 'Water', color: '#3a80ff', proj: 0x3a80ff, sigil: 'water_sigil' },
  { el: 'earth', name: 'Earth', color: '#8a5a2a', proj: 0x9a6a30, sigil: 'earth_sigil' },
  { el: 'fire', name: 'Fire', color: '#ff5020', proj: 0xff6020, sigil: 'fire_sigil' },
];
// per tier: name suffix, levels per element, max hits, base xp, catalysts, element sigil counts [wind, other, wind-with-other]
const TIERS = [
  { tier: 1, word: 'Dart', levels: [1, 5, 9, 13], max: [2, 4, 6, 8], xp: [5.5, 7.5, 9.5, 11.5], cat: { mind_sigil: 1 },
    cost: [{ wind_sigil: 1 }, { water_sigil: 1, wind_sigil: 1 }, { earth_sigil: 2, wind_sigil: 1 }, { fire_sigil: 3, wind_sigil: 2 }],
    desc: 'A basic missile of' },
  { tier: 2, word: 'Lance', levels: [17, 23, 29, 35], max: [9, 10, 11, 12], xp: [13.5, 16.5, 19.5, 22.5], cat: { rift_sigil: 1 },
    cost: [{ wind_sigil: 2 }, { water_sigil: 2, wind_sigil: 2 }, { earth_sigil: 3, wind_sigil: 2 }, { fire_sigil: 4, wind_sigil: 3 }],
    desc: 'A piercing lance of' },
  { tier: 3, word: 'Torrent', levels: [41, 47, 53, 59], max: [13, 14, 15, 16], xp: [25.5, 28.5, 31.5, 34.5], cat: { void_sigil: 1 },
    cost: [{ wind_sigil: 3 }, { water_sigil: 3, wind_sigil: 3 }, { earth_sigil: 4, wind_sigil: 3 }, { fire_sigil: 5, wind_sigil: 4 }],
    desc: 'A roaring torrent of' },
  { tier: 4, word: 'Tempest', levels: [62, 65, 70, 75], max: [17, 18, 19, 20], xp: [36, 37.5, 40, 42.5], cat: { aether_sigil: 1, void_sigil: 1 },
    cost: [{ wind_sigil: 5 }, { water_sigil: 7, wind_sigil: 5 }, { earth_sigil: 7, wind_sigil: 5 }, { fire_sigil: 7, wind_sigil: 5 }],
    desc: 'A howling tempest of' },
  { tier: 5, word: 'Cataclysm', levels: [81, 85, 90, 95], max: [21, 22, 23, 24], xp: [44.5, 46.5, 48.5, 50.5], cat: { aether_sigil: 1, crimson_sigil: 1 },
    cost: [{ wind_sigil: 7 }, { water_sigil: 10, wind_sigil: 7 }, { earth_sigil: 10, wind_sigil: 7 }, { fire_sigil: 10, wind_sigil: 7 }],
    desc: 'A world-shaking cataclysm of' },
];

for (const T of TIERS) {
  ELEMENTS.forEach((E, i) => {
    registerSpell({
      id: `${E.el}_${T.word.toLowerCase()}`, name: `${E.name} ${T.word}`, level: T.levels[i], xp: T.xp[i],
      type: 'combat', targets: ['npc', 'player'], maxHit: T.max[i], element: E.el, tier: T.tier, autocast: true,
      runes: { ...T.cost[i], ...T.cat }, projectile: E.proj,
      description: `${T.desc} ${E.el}. Max hit ${T.max[i]}.`,
      icon: { shape: `spell${T.tier}`, color: E.color, color2: T.tier >= 4 ? '#fff6c0' : null },
    });
  });
}

// ---- curses, binds and drains ------------------------------------------------------------------
const util = (def) => registerSpell({ type: 'combat', targets: ['npc', 'player'], maxHit: 0, ...def });

util({ id: 'bewilder', name: 'Bewilder', level: 3, xp: 13, runes: { mind_sigil: 1, water_sigil: 3, earth_sigil: 2 },
  drain: { skill: 'attack', pct: 0.05 }, projectile: 0xc0a0ff,
  description: "Clouds your target's mind, lowering its Attack by 5%.", icon: { shape: 'spell_curse', color: '#a080e0' } });
util({ id: 'enfeeble', name: 'Enfeeble', level: 11, xp: 21, runes: { mind_sigil: 1, water_sigil: 3, earth_sigil: 2 },
  drain: { skill: 'strength', pct: 0.05 }, projectile: 0xa0c0ff,
  description: "Saps your target's might, lowering its Strength by 5%.", icon: { shape: 'spell_curse', color: '#6090e0' } });
util({ id: 'hex', name: 'Hex', level: 19, xp: 29, runes: { mind_sigil: 1, water_sigil: 2, earth_sigil: 3, thorn_sigil: 1 },
  drain: { skill: 'defence', pct: 0.05 }, projectile: 0xe060c0,
  description: "Rots your target's guard, lowering its Defence by 5%.", icon: { shape: 'spell_curse', color: '#c050a0' } });
util({ id: 'rootgrasp', name: 'Rootgrasp', level: 20, xp: 30, runes: { thorn_sigil: 2, earth_sigil: 3, water_sigil: 3 },
  bind: 8, projectile: 0x50a030,
  description: 'Roots erupt to hold your target in place for 5 seconds.', icon: { shape: 'spell_bind', color: '#50a030' } });
util({ id: 'blight', name: 'Blight', level: 33, xp: 35, maxHit: 8, runes: { rift_sigil: 1, earth_sigil: 2, thorn_sigil: 1 },
  poison: 4, projectile: 0x60e040,
  description: 'A festering bolt that poisons on a successful hit. Max hit 8.', icon: { shape: 'spell_drain', color: '#60c030' } });
util({ id: 'thornbind', name: 'Thornbind', level: 50, xp: 60, maxHit: 3, runes: { thorn_sigil: 3, earth_sigil: 4, water_sigil: 4 },
  bind: 16, projectile: 0x308a20,
  description: 'Barbed vines hold your target for 10 seconds. Max hit 3.', icon: { shape: 'spell_bind', color: '#2a8a1a', color2: '#c0e060' } });
util({ id: 'lifesap', name: 'Lifesap', level: 56, xp: 52, maxHit: 14, runes: { void_sigil: 1, crimson_sigil: 1, rift_sigil: 2 },
  heal: 0.25, projectile: 0xc01830,
  description: 'Draws the life from your target, healing you for a quarter of the damage. Max hit 14.', icon: { shape: 'spell_drain', color: '#c01830' } });
util({ id: 'ironroot', name: 'Ironroot', level: 79, xp: 89, maxHit: 5, runes: { thorn_sigil: 4, earth_sigil: 5, water_sigil: 5 },
  bind: 24, projectile: 0x507050,
  description: 'Iron-hard roots hold your target for 15 seconds. Max hit 5.', icon: { shape: 'spell_bind', color: '#607a60', color2: '#e0e0e0' } });
util({ id: 'tethering_curse', name: 'Tethering Curse', level: 85, xp: 80, runes: { void_sigil: 1, nexus_sigil: 1, rift_sigil: 1 },
  teleblock: 500, playersOnly: true, targets: ['player'], projectile: 0x40e0e0,
  description: 'Anchors another player, preventing teleports for 5 minutes (halved by Spellward).', icon: { shape: 'spell_tether', color: '#40d0d0' } });
