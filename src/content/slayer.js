// Slayer masters and task lists. OWNER: agent F.
// registerData('slayer_master', npcId, { combatReq, tasks: [{ npc: [npcIds], name, amount: [min,max], weight, slayerLevel }] })

import { registerData, registerDialogue } from '../core/registry.js';

registerData('slayer_master', 'slayer_master_hollis', {
  combatReq: 3,
  tasks: [
    { npc: ['goblin'], name: 'goblins', amount: [10, 20], weight: 5, slayerLevel: 1 },
    { npc: ['giant_rat'], name: 'giant rats', amount: [10, 20], weight: 5, slayerLevel: 1 },
    { npc: ['giant_spider'], name: 'Thornwood spiders', amount: [10, 20], weight: 3, slayerLevel: 1 },
  ],
});

registerDialogue('slayer_master', [
  { npc: "I'm Warden Hollis. I keep the beasts of this land in check." },
  { options: [
    { text: 'I need a slayer task.', action: ({ game, player, npc }) => { game.events.emit('slayer:assign', { player, master: npc.id }); return false; } },
    { text: 'Nothing, thanks.', end: true },
  ] },
]);
