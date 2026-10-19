// Quests + quest dialogues. OWNER: agent F.
// registerQuest({ id, name, difficulty, questPoints, completeStage, start (text), description,
//                 journal(stage, ctx) -> string[] (supports <col=rrggbb>), rewards: string[] })
// Quest stage lives in player.quests[id] (0 = not started, >= completeStage = complete).
// Use game.quests.getStage/setStage/complete (systems/quests.js).

import { registerQuest, registerDialogue, registerItem, registerSpawn } from '../core/registry.js';

registerItem({ id: 'lost_ledger', name: "Mira's ledger", examine: 'A battered ledger full of tidy handwriting.', value: 0, tradeable: false, destroy: true, icon: { shape: 'book', color: '#6a3a8a' } });

registerQuest({
  id: 'lost_ledger', name: 'The Lost Ledger', difficulty: 'Novice', questPoints: 1, completeStage: 100,
  start: 'Speak to Mira, the Brackenford town guide.',
  description: 'Mira has misplaced her ledger somewhere east of town.',
  rewards: ['1 Quest Point', '150 coins', '250 Cooking XP'],
  onComplete: ({ game, player }) => {
    player.inventory.remove('lost_ledger', 1);
    game.giveItem('coins', 150, player);
    player.skills.addXp('cooking', 250);
  },
  journal: (stage) => {
    if (stage === 0) return ['I can start this quest by speaking to <col=800000>Mira</col> in <col=800000>Brackenford</col>.'];
    if (stage < 100) return ['<col=555555>Mira asked me to find her lost ledger.</col>', 'She thinks she dropped it near the <col=800000>goblins east of town</col>.'];
    return ['<col=555555>I found Mira\'s ledger and returned it.</col>', '', '<col=ff0000>QUEST COMPLETE!</col>'];
  },
});

// The ledger lies near the goblins.
registerSpawn({ type: 'item', id: 'lost_ledger', qty: 1, x: 116, y: 158, respawnTicks: 30 });

registerDialogue('town_guide', (ctx) => {
  const q = ctx.game.quests;
  const stage = q ? q.getStage('lost_ledger') : 0;
  if (stage >= 100) return [
    { npc: 'Thank you again for finding my ledger! Have you explored Thornwood to the west yet?' },
    { player: 'Not yet, but I will.' },
  ];
  if (stage > 0) return [
    { npc: 'Any luck finding my ledger? I think I dropped it near the goblins east of town.' },
    { if: ({ player }) => player.inventory.has('lost_ledger'), goto: 'has' },
    { player: "Not yet. I'll keep looking.", end: true },
    { label: 'has', player: 'Here it is!' },
    { action: ({ game }) => { game.quests.complete('lost_ledger'); } },
    { npc: "My ledger! You're a lifesaver. Please, take this for your trouble.", end: true },
  ];
  return [
    { npc: 'Welcome to Brackenford, traveller! I am Mira, the town guide.' },
    { options: [
      { text: 'Can you tell me about this place?', goto: 'about' },
      { text: 'You look worried. Is something wrong?', goto: 'quest' },
      { text: 'Goodbye.', end: true },
    ] },
    { label: 'about', npc: 'Brackenford has a bank, a general store and a fine forge. Thornwood lies west, the quarry north-west, and Highmarch across the river to the north-east.' },
    { npc: 'Whatever you do, mind the ditch to the north. Beyond it is the Wilderness, where anyone may attack you.', end: true },
    { label: 'quest', npc: "I've lost my ledger! All the town accounts are in it. I think I dropped it near the goblins east of town." },
    { options: [
      { text: "I'll find it for you.", action: ({ game }) => { game.quests.start('lost_ledger'); }, goto: 'accept' },
      { text: "Sorry, I'm busy.", end: true },
    ] },
    { label: 'accept', npc: 'Oh, thank you! Please be careful of those goblins.', end: true },
  ];
});
