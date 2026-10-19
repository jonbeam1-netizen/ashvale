// Thieving: pickpocket targets, market stalls, locked chests/doors, the Cutpurse Den. OWNER: agent F.
//
// registerData('pickpocket', npcId, { level, xp, loot: [{ id, qty: n|[min,max], weight }], stunTicks, stunDamage: [min,max] | n })
// registerData('thieving_stall', objectId, { level, xp, loot: [{id, qty, weight}], emptyId, respawnTicks, guarded })
// registerData('thieving_chest', objectId, { level, xp, loot, openId, respawnTicks, lockpick, trap: {damage, poison} })
// registerData('thieving_door', objectId, { level, xp, lockpick, inside: [x,y], outside: [x,y] })
// registerData('thieving_watch', npcId, true)  // NPCs that notice stall thieves (guards)
// Loot entries referencing items that don't exist at runtime are skipped.

import { registerObject, registerData, registerSpawn, registerItem, registerNpc, registerDialogue, registerShop, registerPaint } from '../core/registry.js';

// ---- items --------------------------------------------------------------------------------------------
registerItem({ id: 'worn_purse', name: 'Worn purse', examine: 'A threadbare purse. Something jingles inside.', stackable: true, value: 1, options: ['Open-all'], icon: { shape: 'bag', color: '#8a6a4a' } });
registerItem({ id: 'silk_purse', name: 'Silk purse', examine: 'A fine purse of embroidered silk.', stackable: true, value: 1, options: ['Open-all'], icon: { shape: 'bag', color: '#8a3a8a', color2: '#e8c040' } });
registerItem({ id: 'gilded_purse', name: 'Gilded purse', examine: 'Heavy, and stitched with gold thread.', stackable: true, value: 1, options: ['Open-all'], icon: { shape: 'bag', color: '#c8a030', color2: '#fff0a0' } });
registerData('thieving_purse', 'worn_purse', { coins: [6, 18] });
registerData('thieving_purse', 'silk_purse', { coins: [30, 75] });
registerData('thieving_purse', 'gilded_purse', { coins: [140, 320] });

registerItem({ id: 'lockpick', name: 'Lockpick', examine: 'A slim steel pick for persuading locks.', value: 25, icon: { shape: 'key', color: '#a0a8b0' } });
registerItem({ id: 'nimble_gloves', name: 'Nimble gloves', examine: 'Supple kidskin gloves. Your fingers feel quicker already.', slot: 'hands', value: 2500, icon: { shape: 'gloves', color: '#3a3a3a' }, bonuses: { defenceStab: 1, defenceSlash: 1 } });
registerItem({ id: 'honey_bun', name: 'Honey bun', examine: 'Sticky and sweet.', value: 14, heal: 4, icon: { shape: 'bread', color: '#d8a040', color2: '#f0d070' } });
registerItem({ id: 'seed_cake', name: 'Seed cake', examine: 'Dense, nutty and filling.', value: 30, heal: 7, icon: { shape: 'cake', color: '#c89a5a' } });
registerItem({ id: 'fine_linen', name: 'Bolt of fine linen', examine: 'Beautifully woven linen.', value: 60, icon: { shape: 'scroll', color: '#ece4d0' } });
registerItem({ id: 'dyed_wool', name: 'Bolt of dyed wool', examine: 'Wool dyed a deep madder red.', value: 85, icon: { shape: 'scroll', color: '#a83a3a' } });
registerItem({ id: 'cinder_pepper', name: 'Cinder pepper', examine: 'A tiny red pepper that is very, very hot.', stackable: true, value: 40, icon: { shape: 'herb', color: '#d83a1a' } });
registerItem({ id: 'saffron_threads', name: 'Saffron threads', examine: 'Worth more than their weight in silver.', stackable: true, value: 90, icon: { shape: 'herb', color: '#e89a20' } });
registerItem({ id: 'marten_pelt', name: 'Marten pelt', examine: 'A sleek, glossy pelt.', value: 110, icon: { shape: 'fur', color: '#5a3a22' } });
registerItem({ id: 'tarnished_locket', name: 'Tarnished locket', examine: 'Someone will miss this.', value: 150, icon: { shape: 'amulet', color: '#a8a088' } });

// ---- pickpocketing --------------------------------------------------------------------------------------
const P = (id, d) => registerData('pickpocket', id, d);
// agent D's townsfolk
P('villager', { level: 1, xp: 8, loot: [{ id: 'worn_purse', qty: 1, weight: 10 }, { id: 'coins', qty: 3, weight: 6 }], stunTicks: 8, stunDamage: 1 });
P('farmer', { level: 10, xp: 14.5, loot: [{ id: 'worn_purse', qty: 1, weight: 10 }, { id: 'fieldroot_seed', qty: [1, 4], weight: 3 }, { id: 'coins', qty: 9, weight: 4 }], stunTicks: 8, stunDamage: [1, 2] });
P('town_guard', { level: 40, xp: 46.8, loot: [{ id: 'silk_purse', qty: 1, weight: 12 }, { id: 'coins', qty: 30, weight: 4 }], stunTicks: 8, stunDamage: [2, 4] });
P('highmarch_knight', { level: 55, xp: 84.3, loot: [{ id: 'silk_purse', qty: 1, weight: 8 }, { id: 'gilded_purse', qty: 1, weight: 2 }], stunTicks: 8, stunDamage: [3, 5] });
P('highway_bandit', { level: 48, xp: 65, loot: [{ id: 'silk_purse', qty: 1, weight: 8 }, { id: 'lockpick', qty: 1, weight: 1 }], stunTicks: 8, stunDamage: [3, 5] });
// our own targets
P('wandering_bard', { level: 15, xp: 22, loot: [{ id: 'worn_purse', qty: 1, weight: 8 }, { id: 'honey_bun', qty: 1, weight: 2 }, { id: 'coins', qty: [10, 20], weight: 3 }], stunTicks: 8, stunDamage: [1, 2] });
P('market_trader', { level: 25, xp: 30, loot: [{ id: 'worn_purse', qty: 1, weight: 6 }, { id: 'silk_purse', qty: 1, weight: 3 }, { id: 'cinder_pepper', qty: 1, weight: 1 }], stunTicks: 8, stunDamage: [1, 3] });
P('temple_curate', { level: 32, xp: 38, loot: [{ id: 'silk_purse', qty: 1, weight: 6 }, { id: 'mind_sigil', qty: [2, 6], weight: 3 }, { id: 'tarnished_locket', qty: 1, weight: 1 }], stunTicks: 8, stunDamage: [2, 3] });
P('highmarch_noble', { level: 65, xp: 110, loot: [{ id: 'gilded_purse', qty: 1, weight: 8 }, { id: 'uncut_garnet', qty: 1, weight: 1 }, { id: 'tarnished_locket', qty: 1, weight: 1 }], stunTicks: 9, stunDamage: [3, 6] });
P('ash_smuggler', { level: 80, xp: 160, loot: [{ id: 'gilded_purse', qty: [1, 2], weight: 8 }, { id: 'uncut_sunstone', qty: 1, weight: 1 }, { id: 'nexus_sigil', qty: [2, 5], weight: 2 }], stunTicks: 10, stunDamage: [4, 8] });

const folk = (id, name, examine, look, extra = {}) => registerNpc({
  id, name, examine, combatLevel: extra.combatLevel ?? 3, options: ['Talk-to', 'Attack', 'Pickpocket'], dialogue: `thief_${id}`,
  stats: { attack: 3, strength: 3, defence: 3, hitpoints: 10, ...(extra.stats || {}) }, maxHit: extra.maxHit ?? 1, respawnTicks: 30, wanderRadius: 3, slayerCategory: 'humans',
  model: { template: 'human', equipment: {}, ...look }, ...extra,
});
folk('wandering_bard', 'Wandering bard', 'He strums a lute and keeps one eye on your purse.', { colors: { top: '#8a3a6a', legs: '#3a3a5a', hair: '#c8a050' }, equipment: { cape: { shape: 'cape', color: '#5a2a5a' } } });
folk('market_trader', 'Market trader', 'Loud, cheerful and always counting.', { colors: { top: '#6a7a3a', legs: '#4a3a2a', hair: '#3a2a1a' }, extras: { beard: true } }, { combatLevel: 8, stats: { attack: 7, strength: 7, defence: 7, hitpoints: 14 } });
folk('temple_curate', 'Temple curate', 'A soft-spoken servant of the Highmarch temple.', { colors: { top: '#d8d0b8', legs: '#d8d0b8', hair: '#5a4a3a' } }, { combatLevel: 12, stats: { attack: 8, strength: 8, defence: 10, hitpoints: 18 } });
folk('highmarch_noble', 'Highmarch noble', 'Dripping with rings and self-regard.', { female: true, hairStyle: 'long', colors: { top: '#3a2a6a', legs: '#2a1a4a', hair: '#e0c070' }, equipment: { cape: { shape: 'cape', color: '#6a1a2a', color2: '#e8c040' } } }, { combatLevel: 20, stats: { attack: 15, strength: 14, defence: 15, hitpoints: 25 }, maxHit: 3 });
folk('ash_smuggler', 'Ash smuggler', 'Hauls contraband through the Wastes. Armed, nervous and rich.', { colors: { top: '#3a3430', legs: '#2a2420', hair: '#1a1410' }, extras: { beard: true }, equipment: { weapon: 'iron_scimitar' } }, { combatLevel: 46, stats: { attack: 40, strength: 40, defence: 38, hitpoints: 50 }, maxHit: 6, aggressive: false });

registerDialogue('thief_wandering_bard', [{ npc: 'Oh, the river is wide and the road is long, and nobody pays for a wandering song...' }, { player: "I'll leave you to it." }]);
registerDialogue('thief_market_trader', [{ npc: 'Best prices in Highmarch! Well. Second best. Fine, third.' }]);
registerDialogue('thief_temple_curate', [{ npc: 'Peace be upon you, traveller. Mind your belongings in the market - there are cutpurses about.' }]);
registerDialogue('thief_highmarch_noble', [{ npc: 'Do I know you? No. I would remember someone so... ordinary.' }]);
registerDialogue('thief_ash_smuggler', [{ npc: "Didn't see me. Didn't see the crates. Walk on." }]);

registerSpawn({ type: 'npc', id: 'wandering_bard', x: 99, y: 141, wander: 5 });
registerSpawn({ type: 'npc', id: 'market_trader', x: 158, y: 76, wander: 3 });
registerSpawn({ type: 'npc', id: 'market_trader', x: 165, y: 79, wander: 3 });
registerSpawn({ type: 'npc', id: 'temple_curate', x: 175, y: 66, wander: 3 });
registerSpawn({ type: 'npc', id: 'highmarch_noble', x: 161, y: 68, wander: 4 });
registerSpawn({ type: 'npc', id: 'ash_smuggler', x: 118, y: 30, wander: 4 });
registerSpawn({ type: 'npc', id: 'ash_smuggler', x: 124, y: 26, wander: 4 });

// ---- market stalls -----------------------------------------------------------------------------------------
function stall(id, name, examine, cloth, goods, data) {
  registerObject({ id, name, examine, options: ['Steal-from'], size: [2, 1], model: { template: 'stall', cloth, goods }, mapIcon: { char: '¤', color: '#e0a040' } });
  registerObject({ id: `${id}_empty`, name, examine: 'The stall has been picked clean for now.', size: [2, 1], model: { template: 'stall', cloth } });
  registerData('thieving_stall', id, { emptyId: `${id}_empty`, ...data });
}
stall('bakers_stall', 'Bakehouse stall', 'Fresh loaves, buns and cakes.', '#b03a2e', '#d8a050',
  { level: 5, xp: 16, respawnTicks: 4, loot: [{ id: 'bread', weight: 5 }, { id: 'honey_bun', weight: 3 }, { id: 'seed_cake', weight: 1 }] });
stall('weavers_stall', "Weaver's stall", 'Bolts of cloth in every colour.', '#e8e0c8', '#a83a3a',
  { level: 20, xp: 24, respawnTicks: 8, guarded: true, loot: [{ id: 'fine_linen', weight: 4 }, { id: 'dyed_wool', weight: 2 }, { id: 'spider_silk', qty: [1, 3], weight: 1 }] });
stall('furriers_stall', "Furrier's stall", 'Pelts and furs from the northern trappers.', '#6a4a2a', '#8a6a4a',
  { level: 35, xp: 36, respawnTicks: 12, guarded: true, loot: [{ id: 'bramble_fur', weight: 4 }, { id: 'marten_pelt', weight: 2 }] });
stall('spicers_stall', "Spicer's stall", 'A heady smell of exotic spices.', '#c8601a', '#d83a1a',
  { level: 50, xp: 81, respawnTicks: 16, guarded: true, loot: [{ id: 'cinder_pepper', qty: [1, 2], weight: 4 }, { id: 'saffron_threads', weight: 2 }] });
stall('jewellers_stall', "Jeweller's stall", 'Gems glitter under a striped awning.', '#2a3a8a', '#a8c8e8',
  { level: 70, xp: 160, respawnTicks: 30, guarded: true,
    loot: [{ id: 'uncut_moonstone', weight: 8 }, { id: 'uncut_garnet', weight: 5 }, { id: 'uncut_sunstone', weight: 3 }, { id: 'uncut_tidestone', weight: 1 }, { id: 'gold_ring', weight: 2 }] });

registerSpawn({ type: 'object', id: 'bakers_stall', x: 100, y: 145 });
registerSpawn({ type: 'object', id: 'weavers_stall', x: 86, y: 142 });
registerSpawn({ type: 'object', id: 'furriers_stall', x: 152, y: 80 });
registerSpawn({ type: 'object', id: 'spicers_stall', x: 152, y: 73 });
registerSpawn({ type: 'object', id: 'jewellers_stall', x: 168, y: 80 });
registerPaint({ shape: 'rect', x0: 151, y0: 73, x1: 170, y1: 82, noScatter: true });

// Guards that notice stall thieves.
for (const id of ['town_guard', 'highmarch_knight', 'market_watchman']) registerData('thieving_watch', id, true);
registerNpc({
  id: 'market_watchman', name: 'Market watchman', examine: 'Paid to keep an eye on the stalls. He takes it seriously.', combatLevel: 30,
  options: ['Talk-to', 'Attack'], dialogue: 'market_watchman', aggressive: false, attackStyle: 'crush', maxHit: 4, respawnTicks: 40, wanderRadius: 4,
  stats: { attack: 26, strength: 26, defence: 28, hitpoints: 36 }, slayerCategory: 'humans',
  bonuses: { attackCrush: 12, strength: 10, defenceStab: 20, defenceSlash: 22, defenceCrush: 18 },
  model: { template: 'human', colors: { top: '#3a4a6a', legs: '#2a2a3a', hair: '#4a3a2a' }, equipment: { weapon: { shape: 'mace', color: '#6f6c6a' }, head: { shape: 'med_helm', color: '#6f6c6a' } } },
});
registerDialogue('market_watchman', [{ npc: "Move along. And keep your hands where I can see them." }]);
registerSpawn({ type: 'npc', id: 'market_watchman', x: 154, y: 77, wander: 3 });
registerSpawn({ type: 'npc', id: 'market_watchman', x: 166, y: 78, wander: 3 });
registerSpawn({ type: 'npc', id: 'market_watchman', x: 97, y: 143, wander: 3 });

// ---- the Cutpurse Den (eastern edge of Thornwood, west of Brackenford) --------------------------------------
registerPaint({ shape: 'rect', x0: 67, y0: 140, x1: 77, y1: 148, noScatter: true });
registerObject({ id: 'den_door', name: 'Locked door', examine: 'A stout door with a fiddly lock.', options: ['Pick-lock'], model: { template: 'door', color: '#4a3020' } });
registerData('thieving_door', 'den_door', { level: 7, xp: 15, inside: [72, 146], outside: [72, 148] });
registerSpawn({ type: 'building', name: 'Cutpurse Den', x: 68, y: 141, w: 9, h: 7, wall: 'wall_dark', floor: 'wood_floor', roof: '#3a2a2a', doors: [{ side: 's', offset: 4 }], doorObject: 'den_door' });

function chest(id, name, examine, color, data) {
  registerObject({ id, name, examine, options: ['Pick-lock', 'Search-for-traps'], model: { template: 'chest', color } });
  registerObject({ id: `${id}_open`, name, examine: 'Empty, for now.', model: { template: 'chest', color: '#3a2a1a' } });
  registerData('thieving_chest', id, { openId: `${id}_open`, ...data });
}
chest('brass_chest', 'Brass-bound chest', 'A small chest with a cheap brass lock.', '#8a6a3a',
  { level: 13, xp: 7.8, respawnTicks: 12, loot: [{ id: 'coins', qty: [10, 30], weight: 1 }] });
chest('merchant_strongbox', "Merchant's strongbox", 'A strongbox stamped with a guild seal.', '#5a4a3a',
  { level: 28, xp: 25, respawnTicks: 25, loot: [{ id: 'coins', qty: [40, 90], weight: 4 }, { id: 'nexus_sigil', qty: 1, weight: 1 }, { id: 'silk_purse', qty: 1, weight: 2 }] });
chest('ironclad_coffer', 'Ironclad coffer', 'Iron bands, rivets and a very serious lock.', '#4a4a52',
  { level: 43, xp: 125, respawnTicks: 50, lockpick: true, trap: { damage: [4, 9] },
    loot: [{ id: 'coins', qty: [120, 260], weight: 5 }, { id: 'uncut_garnet', qty: 1, weight: 2 }, { id: 'uncut_sunstone', qty: 1, weight: 1 }] });
chest('wardens_lockbox', "Warden's lockbox", 'A lockbox bearing the Highmarch seal. Probably trapped.', '#2a2a3a',
  { level: 60, xp: 210, respawnTicks: 80, lockpick: true, trap: { damage: [8, 14] },
    loot: [{ id: 'gilded_purse', qty: [1, 3], weight: 5 }, { id: 'uncut_tidestone', qty: 1, weight: 1 }, { id: 'saffron_threads', qty: [2, 4], weight: 2 }] });
registerSpawn({ type: 'object', id: 'brass_chest', x: 69, y: 142 });
registerSpawn({ type: 'object', id: 'brass_chest', x: 71, y: 142 });
registerSpawn({ type: 'object', id: 'merchant_strongbox', x: 75, y: 142 });
registerSpawn({ type: 'object', id: 'ironclad_coffer', x: 75, y: 145 });
registerSpawn({ type: 'object', id: 'wardens_lockbox', x: 166, y: 58 }); // inside Highmarch Keep

// Sly Nettie runs the den and sells tools.
registerNpc({
  id: 'sly_nettie', name: 'Sly Nettie', examine: 'Her smile does not reach her quick, clever eyes.', options: ['Talk-to', 'Trade'], dialogue: 'sly_nettie', shop: 'nettie_tools', wanderRadius: 1,
  model: { template: 'human', female: true, hairStyle: 'long', colors: { top: '#2a2a2a', legs: '#3a2a2a', hair: '#7a2a1a' }, equipment: { cape: { shape: 'cape', color: '#1a1a1a' } } },
  mapIcon: { char: 'T', color: '#a0a0a0' },
});
registerShop({ id: 'nettie_tools', name: "Nettie's Discreet Tools", sellRate: 1, buyRate: 0.5, stock: [{ id: 'lockpick', qty: 10 }, { id: 'nimble_gloves', qty: 2 }, { id: 'bread', qty: 10 }] });
registerSpawn({ type: 'npc', id: 'sly_nettie', x: 72, y: 144, wander: 1 });
registerDialogue('sly_nettie', [
  { npc: "Shut the door behind you, love. Welcome to the Den. We practise our... fingerwork here." },
  { options: [
    { text: 'How do I get better at thieving?', goto: 'how' },
    { text: 'What do you sell?', action: ({ game }) => { game.ui.openShop('nettie_tools'); return false; } },
    { text: 'Goodbye.', end: true },
  ] },
  { label: 'how', npc: 'Start on the chests in here. Then pick the pockets of folk in town - villagers, farmers, the bard if he ever stops singing.' },
  { npc: "Market stalls pay better, but watchmen and guards notice. Don't get caught. And when you do get caught, don't mention my name." },
  { npc: 'The fancy locks need a proper lockpick. Some of them bite back - search for traps before you put your fingers in.', end: true },
]);
