// Thieving: stalls and pickpocket targets. OWNER: agent F.
// registerData('thieving_stall', objectId, { level, xp, loot: [{id, qty}], emptyId, respawnTicks })
// registerData('pickpocket', npcId, { level, xp, loot: [{id, qty|[min,max]}], stunTicks, stunDamage })

import { registerObject, registerData, registerSpawn } from '../core/registry.js';

registerObject({ id: 'bakers_stall', name: "Baker's stall", examine: 'Fresh bread and cakes.', options: ['Steal-from'], size: [2, 1], model: { template: 'stall', cloth: '#b03a2e', goods: '#d8a050' } });
registerObject({ id: 'bakers_stall_empty', name: 'Market stall', examine: 'An empty market stall.', size: [2, 1], model: { template: 'stall', cloth: '#b03a2e' } });
registerData('thieving_stall', 'bakers_stall', { level: 5, xp: 16, loot: [{ id: 'bread', qty: 1 }], emptyId: 'bakers_stall_empty', respawnTicks: 4 });
registerData('pickpocket', 'villager', { level: 1, xp: 8, loot: [{ id: 'coins', qty: 3 }], stunTicks: 8, stunDamage: 1 });

registerSpawn({ type: 'object', id: 'bakers_stall', x: 100, y: 145 });
