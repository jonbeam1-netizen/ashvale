// Runebinding content: sigil altars and binding data. OWNER: agent C.
// Sigil items are registered by agent A in spells.js (imported after us, so we only reference ids).

import { registerObject, registerData, registerSpawn, registerPaint } from '../core/registry.js';

/**
 * sigil -> binding data. multiples: Runebinding levels at which each essence yields one more sigil.
 * pos: altar tile (2x2 altar, standing stones placed in a ring around it).
 */
export const BINDING = [
  { sigil: 'wind_sigil', name: 'Wind', level: 1, xp: 5, multiples: [11, 22, 33, 44, 55, 66, 77, 88, 99], glow: '#e8f4ff', pos: [81, 107] },
  { sigil: 'mind_sigil', name: 'Mind', level: 2, xp: 5.5, multiples: [14, 28, 42, 56, 70, 84, 98], glow: '#e8a020', pos: [41, 100] },
  { sigil: 'water_sigil', name: 'Water', level: 5, xp: 6, multiples: [19, 38, 57, 76, 95], glow: '#3a80ff', pos: [159, 137] },
  { sigil: 'earth_sigil', name: 'Earth', level: 9, xp: 6.5, multiples: [26, 52, 78], glow: '#8a5a2a', pos: [62, 99] },
  { sigil: 'fire_sigil', name: 'Fire', level: 14, xp: 7, multiples: [35, 70], glow: '#ff5020', pos: [140, 176] },
  { sigil: 'thorn_sigil', name: 'Thorn', level: 20, xp: 7.5, multiples: [46, 92], glow: '#3aa040', pos: [65, 120] },
  { sigil: 'rift_sigil', name: 'Rift', level: 35, xp: 8.5, multiples: [74], glow: '#c060ff', pos: [115, 39], wild: true },
  { sigil: 'nexus_sigil', name: 'Nexus', level: 54, xp: 9.5, multiples: [], glow: '#60e0e0', pos: [175, 129] },
  { sigil: 'void_sigil', name: 'Void', level: 65, xp: 10, multiples: [], glow: '#30303a', pos: [63, 26], wild: true },
  { sigil: 'aether_sigil', name: 'Aether', level: 77, xp: 10.5, multiples: [], glow: '#f0f0a0', pos: [26, 171] },
  { sigil: 'crimson_sigil', name: 'Crimson', level: 90, xp: 11.5, multiples: [], glow: '#b01828', pos: [139, 8], wild: true },
];

for (const b of BINDING) {
  const id = `${b.sigil}_altar`;
  registerObject({
    id, name: `${b.name} altar`, examine: `A binding altar thrumming with ${b.name.toLowerCase()} energy. Bring pale essence here.`,
    options: ['Bind'], size: [2, 2], model: { template: 'sigil_altar', glow: b.glow },
    mapIcon: { char: '*', color: b.glow === '#30303a' ? '#8080a0' : b.glow },
  });
  registerData('runebinding', id, b);
  registerPaint({ shape: 'circle', cx: b.pos[0] + 0.5, cy: b.pos[1] + 0.5, r: 4.5, noScatter: true }); // keep trees/rocks out of the ring
  registerSpawn({ type: 'object', id, x: b.pos[0], y: b.pos[1] });
  // ring of standing stones (radius 3 around the 2x2 altar)
  const [x, y] = b.pos;
  for (const [dx, dy] of [[-2, -2], [3, -2], [-2, 3], [3, 3], [0.5, -3], [0.5, 4]]) {
    registerSpawn({ type: 'object', id: `${b.name.toLowerCase()}_stone`, x: Math.round(x + dx), y: Math.round(y + dy) });
  }
  registerObject({ id: `${b.name.toLowerCase()}_stone`, name: 'Standing stone', examine: 'Faint sigils are carved into the stone.', model: { template: 'standing_stone', glow: b.glow } });
}
