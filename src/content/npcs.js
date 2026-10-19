// NPC definitions. OWNER: agent D. (Skill/quest-specific NPCs may live in that system's content file.)
// model.template: human | goblin | imp | skeleton | zombie | giant | demon | golem | cow | wolf | rat |
//                 dragon | spider | chicken | bat  (see render/models.js)

import { registerNpc, registerDialogue } from '../core/registry.js';

// ---- townsfolk ---------------------------------------------------------------------------------
registerNpc({
  id: 'banker', name: 'Banker', examine: 'Good with money.', options: ['Talk-to', 'Bank'], dialogue: 'banker', wanderRadius: 0,
  model: { template: 'human', colors: { top: '#2a3a6a', legs: '#2a2a3a', hair: '#3a2a1a' }, equipment: {} },
  mapIcon: { char: '$', color: '#e8c040' },
});
registerNpc({
  id: 'shopkeeper', name: 'Shopkeeper', examine: 'Maybe I can buy something from them.', options: ['Talk-to', 'Trade'], shop: 'brackenford_general', dialogue: 'shopkeeper', wanderRadius: 1,
  model: { template: 'human', colors: { top: '#6a5a3a', legs: '#4a3a2a', hair: '#8a5a2a' }, equipment: {} },
  mapIcon: { char: 'G', color: '#e8c040' },
});
registerNpc({
  id: 'arms_dealer', name: 'Arms dealer', examine: 'Sells weapons and armour.', options: ['Talk-to', 'Trade'], shop: 'highmarch_arms', dialogue: 'shopkeeper', wanderRadius: 1,
  model: { template: 'human', colors: { top: '#5a5a62', legs: '#3a3a3a', hair: '#2a1a10' }, extras: { beard: true }, equipment: { body: 'bronze_platebody' } },
  mapIcon: { char: 'W', color: '#c0c0c8' },
});
registerNpc({
  id: 'town_guide', name: 'Mira', examine: 'The Brackenford town guide.', options: ['Talk-to'], dialogue: 'town_guide', wanderRadius: 2,
  model: { template: 'human', female: true, hairStyle: 'long', colors: { top: '#3a6a5a', legs: '#5a4a3a', hair: '#c88a3a' }, equipment: {} },
  mapIcon: { char: '?', color: '#60c0ff' },
});
registerNpc({
  id: 'villager', name: 'Villager', examine: 'One of the local folk.', combatLevel: 2, options: ['Talk-to', 'Attack', 'Pickpocket'], dialogue: 'villager',
  stats: { attack: 1, strength: 1, defence: 1, hitpoints: 7 }, maxHit: 1, dropTable: 'villager', respawnTicks: 30,
  model: { template: 'human', colors: { top: '#6a5a4a', legs: '#4a4a5a' }, equipment: {} },
});

// ---- creatures ---------------------------------------------------------------------------------
registerNpc({
  id: 'chicken', name: 'Chicken', examine: 'Yep, definitely a chicken.', combatLevel: 1, options: ['Attack'],
  stats: { attack: 1, strength: 1, defence: 1, hitpoints: 3 }, maxHit: 1, attackSpeed: 4, dropTable: 'chicken', respawnTicks: 25,
  model: { template: 'chicken' },
});
registerNpc({
  id: 'cow', name: 'Cow', examine: 'Converts grass to beef.', combatLevel: 2, options: ['Attack'],
  stats: { attack: 1, strength: 1, defence: 1, hitpoints: 8 }, maxHit: 1, attackSpeed: 4, dropTable: 'cow', respawnTicks: 30,
  model: { template: 'cow' },
});
registerNpc({
  id: 'goblin', name: 'Goblin', examine: 'An ugly green creature.', combatLevel: 2, options: ['Attack'],
  stats: { attack: 1, strength: 1, defence: 1, hitpoints: 5 }, maxHit: 1, attackSpeed: 4, attackStyle: 'crush', dropTable: 'goblin', respawnTicks: 30,
  model: { template: 'goblin', equipment: { weapon: 'bronze_dagger' } },
});
registerNpc({
  id: 'giant_rat', name: 'Giant rat', examine: 'Overgrown vermin.', combatLevel: 3, options: ['Attack'], aggressive: true, aggroRange: 2,
  stats: { attack: 2, strength: 3, defence: 2, hitpoints: 5 }, maxHit: 2, attackStyle: 'stab', dropTable: 'giant_rat', respawnTicks: 25,
  model: { template: 'rat', scale: 1.3 },
});
registerNpc({
  id: 'giant_spider', name: 'Thornwood spider', examine: 'A hairy, venomous arachnid.', combatLevel: 5, options: ['Attack'], aggressive: true, aggroRange: 3,
  stats: { attack: 5, strength: 4, defence: 3, hitpoints: 12 }, maxHit: 2, attackStyle: 'stab', dropTable: 'none', respawnTicks: 30,
  model: { template: 'spider', scale: 1.4, colors: { body: '#3a2a20', abdomen: '#4a3020' }, marking: '#c08020' },
});
registerNpc({
  id: 'imp', name: 'Imp', examine: 'A cheeky little demon.', combatLevel: 7, options: ['Attack'],
  stats: { attack: 4, strength: 4, defence: 4, hitpoints: 8 }, maxHit: 1, dropTable: 'imp', respawnTicks: 30, wanderRadius: 6,
  model: { template: 'imp' },
});
registerNpc({
  id: 'quarry_golem', name: 'Quarry golem', examine: 'Rock given an unfortunate will of its own.', combatLevel: 28, options: ['Attack'],
  stats: { attack: 25, strength: 28, defence: 30, hitpoints: 40 }, maxHit: 5, attackSpeed: 6, attackStyle: 'crush', dropTable: 'golem', respawnTicks: 60,
  model: { template: 'golem' },
});
registerNpc({
  id: 'skeleton', name: 'Skeleton', examine: 'Could do with gaining a few pounds.', combatLevel: 22, options: ['Attack'], aggressive: true,
  stats: { attack: 17, strength: 17, defence: 17, hitpoints: 24 }, maxHit: 3, attackStyle: 'slash', dropTable: 'skeleton', respawnTicks: 40,
  model: { template: 'skeleton', equipment: { weapon: 'iron_scimitar' } },
});
registerNpc({
  id: 'zombie', name: 'Zombie', examine: 'The walking dead.', combatLevel: 13, options: ['Attack'], aggressive: true,
  stats: { attack: 10, strength: 10, defence: 10, hitpoints: 20 }, maxHit: 2, dropTable: 'skeleton', respawnTicks: 40,
  model: { template: 'zombie' },
});
registerNpc({
  id: 'cave_bat', name: 'Cave bat', examine: 'It flaps about in the dark.', combatLevel: 6, options: ['Attack'], aggressive: true,
  stats: { attack: 5, strength: 4, defence: 4, hitpoints: 8 }, maxHit: 1, dropTable: 'none', respawnTicks: 25, wanderRadius: 5,
  model: { template: 'bat' },
});
registerNpc({
  id: 'dread_wolf', name: 'Dread wolf', examine: 'A snarling wilderness predator.', combatLevel: 25, options: ['Attack'], aggressive: true, aggroRange: 4,
  stats: { attack: 22, strength: 20, defence: 18, hitpoints: 30 }, maxHit: 4, attackSpeed: 4, attackStyle: 'stab', dropTable: 'wolf', respawnTicks: 40,
  model: { template: 'wolf', scale: 1.25, colors: { body: '#4a4642', belly: '#8a8680' } },
});
registerNpc({
  id: 'highland_giant', name: 'Highland giant', examine: 'A very large, very hairy brute.', combatLevel: 28, options: ['Attack'], aggressive: true,
  stats: { attack: 18, strength: 22, defence: 26, hitpoints: 35 }, maxHit: 4, attackSpeed: 6, attackStyle: 'crush', dropTable: 'giant', respawnTicks: 50, size: 2,
  model: { template: 'giant', equipment: { weapon: { shape: 'mace', color: '#6a4a2a' } } },
});
registerNpc({
  id: 'gloom_fiend', name: 'Gloom fiend', examine: 'A demon of the deep dark.', combatLevel: 82, options: ['Attack'], aggressive: true,
  stats: { attack: 70, strength: 72, defence: 65, hitpoints: 87 }, maxHit: 10, attackSpeed: 4, attackStyle: 'slash', dropTable: 'demon', respawnTicks: 80, size: 2, wanderRadius: 3,
  model: { template: 'demon' },
});
registerNpc({
  id: 'ashen_wyrm', name: 'Ashen wyrm', examine: 'A dragon wreathed in cinders. Best avoided.', combatLevel: 79, options: ['Attack'], aggressive: true,
  stats: { attack: 68, strength: 68, defence: 68, hitpoints: 75 }, maxHit: 8, attackSpeed: 4, attackStyle: 'slash', dropTable: 'dragon', respawnTicks: 100, size: 3, wanderRadius: 4,
  model: { template: 'dragon', colors: { body: '#4a3a3a', belly: '#c88a4a', eyes: '#ff6020' }, wings: '#3a2020' },
});
registerNpc({
  id: 'slayer_master_hollis', name: 'Warden Hollis', examine: 'A grizzled hunter of dangerous beasts.', options: ['Talk-to'], dialogue: 'slayer_master', wanderRadius: 1,
  model: { template: 'human', colors: { top: '#3a4a2a', legs: '#2a2a20', hair: '#5a5a5a' }, extras: { beard: true }, equipment: { weapon: 'iron_scimitar', cape: { shape: 'cape', color: '#2a3a20' } } },
  mapIcon: { char: 'S', color: '#c04040' },
});

// ---- generic dialogues (quest/skill NPC dialogues live with their system's content) -------------
registerDialogue('banker', [
  { npc: 'Good day, how may I help you?' },
  { options: [
    { text: "I'd like to access my bank account, please.", action: ({ game }) => { game.ui.openBank(); return false; } },
    { text: 'What is this place?', goto: 'what' },
    { text: 'Nothing, thanks.', end: true },
  ] },
  { label: 'what', npc: 'This is a branch of the Bank of Ashvale. Your belongings are safe with us in every town.' },
  { player: 'Good to know.', end: true },
]);
registerDialogue('shopkeeper', [
  { npc: 'Can I help you at all?' },
  { options: [
    { text: 'Yes please. What are you selling?', action: ({ game, npc }) => { game.ui.openShop(npc.def.shop); return false; } },
    { text: "No thanks, I'm just looking.", end: true },
  ] },
]);
registerDialogue('villager', (ctx) => [
  { npc: ['Lovely weather today.', 'Have you seen the wilderness ditch? Stay south of it if you value your hide.', 'The forge by the square is always warm.'][ctx.npc.uid % 3] },
]);
