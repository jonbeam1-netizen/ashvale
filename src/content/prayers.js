// Prayers. OWNER: agent A.
// registerPrayer({ id, name, level, drain (points drained per minute-ish; see systems/prayer.js), group (mutually exclusive),
//                  effects: { attack?: mult, strength?: mult, defence?: mult, ranged?: mult, magic?: mult, protect?: 'melee'|'ranged'|'magic' },
//                  icon: {shape, color}, description })

import { registerPrayer, registerData } from '../core/registry.js';

registerPrayer({ id: 'stoneskin', name: 'Stoneskin', level: 1, drain: 1, group: 'defence', effects: { defence: 1.05 }, description: 'Increases your Defence by 5%.', icon: { shape: 'shield', color: '#c8c0a8' } });
registerPrayer({ id: 'bulls_vigor', name: "Bull's Vigor", level: 4, drain: 1, group: 'strength', effects: { strength: 1.05 }, description: 'Increases your Strength by 5%.', icon: { shape: 'fist', color: '#e0a060' } });
registerPrayer({ id: 'keen_focus', name: 'Keen Focus', level: 7, drain: 1, group: 'attack', effects: { attack: 1.05 }, description: 'Increases your Attack by 5%.', icon: { shape: 'sword', color: '#f0e8a0' } });

// Bones that can be buried: itemId -> prayer xp
registerData('bones', 'bones', { xp: 4.5 });
registerData('bones', 'big_bones', { xp: 15 });
