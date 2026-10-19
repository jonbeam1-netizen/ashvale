// Spells + sigils (rune-stones used as spell reagents; made with Runebinding). OWNER: agent A (combat
// spells) & agent F (utility/teleport spells). Coordinate by id; both may add to this file's lists
// by registering from their own modules if preferred.
//
// registerSpell({ id, name, level, xp, runes: {itemId: qty}, book: 'standard', type: 'combat'|'teleport'|'utility'|'alchemy'|'enchant',
//                 targets: [] | ['npc','player'] | ['item'] | ['object'], maxHit?, teleport?: {x,y}, icon: {shape, color}, description })

import { registerItem, registerSpell } from '../core/registry.js';

const sigil = (id, name, color, value) => registerItem({ id, name, examine: `A sigil-stone bound with ${name.split(' ')[0].toLowerCase()} essence.`, stackable: true, value, icon: { shape: 'rune', color } });
sigil('wind_sigil', 'Wind sigil', '#e8f4ff', 4);
sigil('water_sigil', 'Water sigil', '#3a80ff', 4);
sigil('earth_sigil', 'Earth sigil', '#8a5a2a', 4);
sigil('fire_sigil', 'Fire sigil', '#ff5020', 4);
sigil('mind_sigil', 'Mind sigil', '#e8a020', 3);
registerItem({ id: 'pale_essence', name: 'Pale essence', examine: 'An uncharged stone, ready for Runebinding.', value: 4, icon: { shape: 'essence', color: '#d8d4e8' } });

registerSpell({
  id: 'hearth_teleport', name: 'Hearthward Teleport', level: 1, xp: 0, type: 'teleport', runes: {}, teleport: { x: 96, y: 141 },
  description: 'Teleports you home to Brackenford.', icon: { shape: 'star', color: '#80c0ff' },
});
registerSpell({
  id: 'wind_dart', name: 'Wind Dart', level: 1, xp: 5.5, type: 'combat', maxHit: 2, runes: { wind_sigil: 1, mind_sigil: 1 }, targets: ['npc', 'player'],
  description: 'A basic wind missile.', icon: { shape: 'rune', color: '#e8f4ff' }, projectile: 0xe8f4ff,
});
registerSpell({
  id: 'water_dart', name: 'Water Dart', level: 5, xp: 7.5, type: 'combat', maxHit: 4, runes: { water_sigil: 1, wind_sigil: 1, mind_sigil: 1 }, targets: ['npc', 'player'],
  description: 'A basic water missile.', icon: { shape: 'rune', color: '#3a80ff' }, projectile: 0x3a80ff,
});
