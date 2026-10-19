// Agility obstacles. OWNER: agent F.
// registerData('agility', objectId, { level, xp, anim, ticksPerTile, axis?: 'x'|'y' })
// Obstacle objects are placed with registerSpawn from this file.

import { registerObject, registerData, registerSpawn } from '../core/registry.js';

registerObject({
  id: 'log_balance', name: 'Log balance', examine: 'A slippery log spanning the river.', options: ['Walk-across'], blocks: false, size: [1, 1],
  model: { template: 'log_balance' },
});
registerData('agility', 'log_balance', { level: 1, xp: 7.5, anim: 'balance' });

// A log across the Silverrun north of Brackenford.
registerSpawn({ type: 'object', id: 'log_balance', x: 119, y: 112, w: 12, h: 1 });
