// Slayer masters, task lists, rewards and equipment. OWNER: agent F.
//
// registerData('slayer_master', npcId, { name, combatReq, points, tasks: [{ category, name, amount: [min,max], weight, combat?, unlock? }] })
//   category = NPC def.slayerCategory (agent D's monsters); tasks whose category has no NPCs are skipped at runtime.
// registerData('slayer_gear', npcIdOrCategory, { items: [ids], slot, name, effect: { damage: [a,b], drain, message } })
// registerData('slayer_reward', id, { name, cost, type: 'unlock'|'item'|'action', ... })
// Runtime: systems/slayer.js (game.slayer).

import { registerData, registerDialogue, registerItem, registerNpc, registerSpawn, registerShop } from '../core/registry.js';

// ---- masters ---------------------------------------------------------------------------------------------
registerData('slayer_master', 'slayer_master_tamsin', {
  name: 'Tamsin Reed', combatReq: 1, points: 2,
  tasks: [
    { category: 'goblins', name: 'goblins', amount: [12, 30], weight: 6 },
    { category: 'rats', name: 'giant rats', amount: [12, 30], weight: 5 },
    { category: 'spiders', name: 'spiders', amount: [10, 25], weight: 5 },
    { category: 'bats', name: 'bats', amount: [10, 25], weight: 4 },
    { category: 'birds', name: 'birds', amount: [10, 20], weight: 3 },
    { category: 'cows', name: 'cows', amount: [10, 20], weight: 3 },
    { category: 'toads', name: 'marsh toads', amount: [10, 25], weight: 4 },
    { category: 'crabs', name: 'crabs', amount: [10, 25], weight: 4, combat: 8 },
    { category: 'boars', name: 'boars', amount: [10, 25], weight: 4, combat: 10 },
    { category: 'imps', name: 'imps', amount: [10, 25], weight: 3 },
    { category: 'wolves', name: 'wolves', amount: [10, 25], weight: 4, combat: 15 },
    { category: 'zombies', name: 'zombies', amount: [10, 25], weight: 4, combat: 12 },
    { category: 'crawlers', name: 'gloom crawlers', amount: [10, 25], weight: 3, combat: 15 },
  ],
});
registerData('slayer_master', 'slayer_master_hollis', {
  name: 'Warden Hollis', combatReq: 20, points: 6,
  tasks: [
    { category: 'wolves', name: 'wolves', amount: [20, 45], weight: 6 },
    { category: 'scorpions', name: 'scorpions', amount: [20, 45], weight: 5 },
    { category: 'bears', name: 'bears', amount: [15, 35], weight: 5 },
    { category: 'skeletons', name: 'skeletons', amount: [20, 45], weight: 6 },
    { category: 'zombies', name: 'zombies', amount: [20, 45], weight: 5 },
    { category: 'goblins', name: 'goblins', amount: [30, 60], weight: 4 },
    { category: 'bandits', name: 'bandits', amount: [15, 35], weight: 4, combat: 30 },
    { category: 'giants', name: 'giants', amount: [20, 40], weight: 6, combat: 30 },
    { category: 'crawlers', name: 'gloom crawlers', amount: [20, 45], weight: 5 },
    { category: 'slugs', name: 'shalestone slugs', amount: [20, 45], weight: 5 },
    { category: 'fowl', name: 'stonegaze fowl', amount: [20, 40], weight: 5 },
    { category: 'hags', name: 'keening hags', amount: [20, 40], weight: 5, combat: 30 },
    { category: 'ghosts', name: 'ghosts', amount: [15, 35], weight: 4, combat: 25 },
    { category: 'golems', name: 'golems', amount: [15, 30], weight: 3, combat: 35 },
    { category: 'elementals', name: 'elementals', amount: [15, 35], weight: 4, combat: 35 },
  ],
});
registerData('slayer_master', 'slayer_master_corwen', {
  name: 'Corwen Ashby', combatReq: 50, points: 10,
  tasks: [
    { category: 'giants', name: 'giants', amount: [40, 80], weight: 7 },
    { category: 'ogres', name: 'ogres', amount: [30, 60], weight: 6 },
    { category: 'trolls', name: 'trolls', amount: [30, 60], weight: 6, combat: 60 },
    { category: 'lizardfolk', name: 'lizardfolk', amount: [30, 60], weight: 5 },
    { category: 'thirst_bats', name: 'thirst bats', amount: [30, 60], weight: 6 },
    { category: 'glarehorns', name: 'glarehorn lizards', amount: [30, 60], weight: 6 },
    { category: 'hags', name: 'keening hags', amount: [40, 80], weight: 5 },
    { category: 'elementals', name: 'elementals', amount: [30, 60], weight: 5 },
    { category: 'golems', name: 'golems', amount: [30, 60], weight: 5 },
    { category: 'pirates', name: 'corsairs', amount: [30, 60], weight: 4 },
    { category: 'fiends', name: 'fiends', amount: [20, 45], weight: 5, combat: 70 },
    { category: 'ash_devils', name: 'ash devils', amount: [40, 80], weight: 6 },
    { category: 'skeletons', name: 'skeletons', amount: [40, 80], weight: 4 },
  ],
});
registerData('slayer_master', 'slayer_master_vesna', {
  name: 'Vesna Coldhollow', combatReq: 80, points: 15,
  tasks: [
    { category: 'ash_devils', name: 'ash devils', amount: [100, 160], weight: 7 },
    { category: 'specters', name: 'rot specters', amount: [100, 160], weight: 7 },
    { category: 'grotesques', name: 'stone grotesques', amount: [80, 140], weight: 6 },
    { category: 'reavers', name: 'hollow reavers', amount: [80, 140], weight: 6 },
    { category: 'void_stalkers', name: 'void stalkers', amount: [80, 140], weight: 5 },
    { category: 'umbral_beasts', name: 'umbral beasts', amount: [60, 120], weight: 5 },
    { category: 'fiends', name: 'fiends', amount: [100, 160], weight: 7 },
    { category: 'giants', name: 'giants', amount: [100, 160], weight: 5 },
    { category: 'revenants', name: 'revenants', amount: [40, 80], weight: 4 },
    { category: 'trolls', name: 'trolls', amount: [100, 160], weight: 5 },
    { category: 'dragons', name: 'dragons', amount: [40, 90], weight: 6, unlock: 'dragon_tasks' },
  ],
});

// ---- equipment -------------------------------------------------------------------------------------------
registerItem({ id: 'slayer_gem', name: 'Slayer gem', examine: 'A cut gem that whispers your assignment when you hold it to your ear.', value: 1, options: ['Check', 'Activate'], icon: { shape: 'gem', color: '#2a2a2a', color2: '#c02020' } });
registerItem({ id: 'hushwax_earmuffs', name: 'Hushwax earmuffs', examine: 'Wool earmuffs packed with beeswax. Mutes a hag\'s keening.', slot: 'head', value: 200, requirements: { slayer: 15 }, icon: { shape: 'hood', color: '#c8a870' }, model: { shape: 'hood', color: '#c8a870' }, bonuses: { defenceMagic: 1 } });
registerItem({ id: 'smoked_goggles', name: 'Smoked goggles', examine: 'Dark lenses. You can meet a stonegaze fowl\'s stare through these.', slot: 'head', value: 300, requirements: { slayer: 20, defence: 10 }, icon: { shape: 'helm', color: '#3a3a3a', color2: '#8a6a3a' }, model: { shape: 'med_helm', color: '#3a3a3a' }, bonuses: { defenceRanged: 2 } });
registerItem({ id: 'filter_mask', name: 'Filter mask', examine: 'Charcoal and herbs sewn into linen. Keeps out ash and rot.', slot: 'head', value: 400, requirements: { slayer: 55 }, icon: { shape: 'mask', color: '#9a9a8a' }, model: { shape: 'coif', color: '#9a9a8a' }, bonuses: { defenceStab: 2, defenceSlash: 2 } });
registerItem({
  id: 'slayer_visor', name: "Hunter's visor", examine: 'Earmuffs, goggles and a filter mask in one fearsome helm. Bites harder against your quarry.', slot: 'head', value: 20000, tradeable: false,
  requirements: { slayer: 40, defence: 10 }, icon: { shape: 'fullhelm', color: '#2a2a30', color2: '#c02020' }, model: { shape: 'full_helm', color: '#2a2a30' },
  bonuses: { attackMagic: -3, attackRanged: -1, defenceStab: 30, defenceSlash: 32, defenceCrush: 27, defenceMagic: -1, defenceRanged: 30 }, slayerVisor: true,
});

registerData('slayer_gear', 'hags', { items: ['hushwax_earmuffs', 'slayer_visor'], name: 'hushwax earmuffs',
  effect: { damage: [3, 7], drain: ['attack', 'strength', 'defence'], message: "The hag's keening claws at your mind! You need something to muffle it." } });
registerData('slayer_gear', 'fowl', { items: ['smoked_goggles', 'slayer_visor'], name: 'smoked goggles',
  effect: { damage: [2, 6], drain: ['attack', 'defence', 'ranged', 'magic'], message: "The fowl's stare stiffens your limbs like stone! You need to protect your eyes." } });
registerData('slayer_gear', 'specters', { items: ['filter_mask', 'slayer_visor'], name: 'a filter mask',
  effect: { damage: [5, 10], drain: ['attack', 'strength', 'defence', 'ranged', 'magic', 'prayer'], message: "The specter's stench overwhelms you! You need a mask." } });
registerData('slayer_gear', 'ash_devils', { items: ['filter_mask', 'slayer_visor'], name: 'a filter mask',
  effect: { damage: [4, 9], drain: ['strength'], message: 'You choke on the whirling ash! You need a mask.' } });

registerShop({
  id: 'slayer_equipment', name: 'Slayer Equipment', sellRate: 1, buyRate: 0.4,
  stock: [{ id: 'slayer_gem', qty: 10 }, { id: 'hushwax_earmuffs', qty: 5 }, { id: 'smoked_goggles', qty: 5 }, { id: 'filter_mask', qty: 5 }, { id: 'lockpick', qty: 3 }],
});

// ---- rewards (points) -------------------------------------------------------------------------------------
registerData('slayer_reward', 'bounty_broker', { type: 'unlock', name: 'Bounty Broker', cost: 300, description: 'Earn 25% more Slayer points per task.' });
registerData('slayer_reward', 'dragon_tasks', { type: 'unlock', name: 'Scales and Cinders', cost: 80, description: 'Vesna may assign dragons.' });
registerData('slayer_reward', 'extend_giants', { type: 'unlock', name: 'Big, Bigger, Biggest', cost: 100, extend: 'giants', description: 'Giant tasks are 50% longer.' });
registerData('slayer_reward', 'extend_fiends', { type: 'unlock', name: 'Fiendish Persistence', cost: 100, extend: 'fiends', description: 'Fiend tasks are 50% longer.' });
registerData('slayer_reward', 'extend_ash_devils', { type: 'unlock', name: 'Ashes to Ashes', cost: 100, extend: 'ash_devils', description: 'Ash devil tasks are 50% longer.' });
registerData('slayer_reward', 'buy_visor', { type: 'item', name: "Hunter's visor", cost: 400, item: 'slayer_visor', description: 'A helm that protects against all slayer hazards and boosts damage on task.' });
registerData('slayer_reward', 'buy_sigils', { type: 'item', name: '250 Nexus sigils', cost: 35, item: 'nexus_sigil', qty: 250, description: 'A pouch of teleport sigils.' });
registerData('slayer_reward', 'skip', { type: 'action', name: 'Cancel task', cost: 30, action: 'skip', description: 'Cancel your current task (keeps your streak).' });
registerData('slayer_reward', 'block', { type: 'action', name: 'Block task', cost: 100, action: 'block', description: 'Cancel your current task and never be assigned it again (max 5).' });

// ---- master NPCs ---------------------------------------------------------------------------------------------
const master = (id, name, examine, look, x, y) => {
  registerNpc({ id, name, examine, options: ['Talk-to', 'Assignment', 'Trade', 'Rewards'], dialogue: 'slayer_master', shop: 'slayer_equipment', wanderRadius: 1,
    model: { template: 'human', equipment: {}, ...look }, mapIcon: { char: 'S', color: '#c04040' } });
  registerSpawn({ type: 'npc', id, x, y, wander: 1 });
};
master('slayer_master_tamsin', 'Tamsin Reed', 'A young huntress with a quick bow and quicker tongue.',
  { female: true, hairStyle: 'long', colors: { top: '#4a5a2a', legs: '#3a3020', hair: '#a85a2a' }, equipment: { weapon: { shape: 'bow', color: '#6a4a2a' }, cape: { shape: 'cape', color: '#3a4a20' } } }, 91, 137);
master('slayer_master_corwen', 'Corwen Ashby', 'A broad-shouldered veteran with more scars than teeth.',
  { colors: { top: '#5a3a2a', legs: '#3a2a20', hair: '#8a8a8a' }, extras: { beard: true }, equipment: { weapon: 'iron_axe', cape: { shape: 'cape', color: '#5a1a1a' } } }, 153, 172);
master('slayer_master_vesna', 'Vesna Coldhollow', 'Pale, unblinking, and wrapped in furs. She only hunts the worst things.',
  { female: true, hairStyle: 'long', colors: { top: '#e0e0e8', legs: '#4a4a5a', hair: '#f0f0f0' }, equipment: { weapon: 'iron_scimitar', cape: { shape: 'cape', color: '#d8d8e0', color2: '#3a3a5a' } } }, 103, 55);
// Warden Hollis (agent D's NPC, Highmarch) uses the same dialogue; system adds the extra options.

registerDialogue('slayer_master', (ctx) => {
  const { game, npc } = ctx;
  const S = game.slayer;
  const m = S?.master(npc?.id);
  const task = S?.task();
  return [
    { npc: m?.greeting || `I'm ${npc?.name}. I keep the beasts of this land in check. What do you want?` },
    { label: 'menu', options: [
      { text: 'I need a new assignment.', action: () => { S.assign(npc); return false; } },
      { text: 'How am I doing on my task?', if: () => !!task, goto: 'status' },
      { text: 'Let me see your rewards.', action: () => { S.openRewards(); return false; } },
      { text: 'I need some equipment.', action: () => { game.ui.openShop('slayer_equipment'); return false; } },
      { text: 'Tell me about Slayer.', goto: 'about' },
      { text: 'Goodbye.', end: true },
    ] },
    { label: 'status', npc: () => S.describeTask(), goto: 'menu' },
    { label: 'about', npc: 'We slayers are given a kind of creature to hunt, and a number. Finish the job and come back for points and a new assignment.' },
    { npc: "Some beasts can only be wounded by someone who knows how - that's your Slayer level. Others need special gear: earmuffs, goggles, masks. Buy them from any of us." },
    { npc: 'Tamsin in Brackenford trains beginners. Hollis in Highmarch takes those of 20 combat, Corwen at Haverly 50, and Vesna by the Wilderness ditch only bothers with 80 and up.', goto: 'menu' },
  ];
});
