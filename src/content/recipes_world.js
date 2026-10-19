// Production world content: crafting stations, gathering-for-crafting plants, skill NPCs, shops and
// their placement. OWNER: agent C.

import { registerObject, registerNpc, registerShop, registerDialogue, registerSpawn, registerPaint } from '../core/registry.js';

// ---- stations ------------------------------------------------------------------------------------------
registerObject({ id: 'spinning_wheel', name: 'Spinning wheel', examine: 'Turns flax into bowstrings.', options: ['Spin'], model: { template: 'spinning_wheel' }, mapIcon: { char: 'W', color: '#e8d8a0' } });
registerObject({ id: 'potters_wheel', name: "Potter's wheel", examine: 'Shape soft clay here.', options: ['Form'], model: { template: 'potters_wheel' }, mapIcon: { char: 'P', color: '#c8804a' } });
registerObject({ id: 'pottery_oven', name: 'Pottery oven', examine: 'Fires unfired pottery.', options: ['Fire'], model: { template: 'pottery_oven' } });
registerObject({ id: 'tanning_rack', name: 'Tanning rack', examine: 'Hides are stretched and cured here (for a fee to the tanner).', options: ['Tan'], model: { template: 'tanning_rack' } });
registerObject({ id: 'millstone', name: 'Millstone', examine: 'Use grain and an empty pot here to make flour.', options: ['Grind'], model: { template: 'millstone' } });
registerObject({ id: 'water_pump', name: 'Water pump', examine: 'Fresh water. Use a container on it.', options: ['Fill'], model: { template: 'water_pump' } });
registerObject({ id: 'wheat', name: 'Wheat', examine: 'Golden wheat, ready to pick.', options: ['Pick'], blocks: false, depleted: 'wheat_picked', respawnTicks: [20, 40], model: { template: 'crop', color: '#c8a848', head: '#e8c860', height: 0.75 } });
registerObject({ id: 'wheat_picked', name: 'Stubble', examine: 'It will grow back.', blocks: false, model: { template: 'crop', color: '#a89040', height: 0.2 } });
registerObject({ id: 'flax_plant', name: 'Flax', examine: 'A tall plant with blue flowers.', options: ['Pick'], blocks: false, depleted: 'flax_picked', respawnTicks: [15, 30], model: { template: 'crop', color: '#5a8a3a', flower: '#7a9ae8', height: 0.7 } });
registerObject({ id: 'flax_picked', name: 'Flax stalks', examine: 'It will regrow.', blocks: false, model: { template: 'crop', color: '#5a7a3a', height: 0.25 } });
registerObject({ id: 'grape_vine', name: 'Grapevine', examine: 'Plump purple grapes hang from it.', options: ['Pick'], depleted: 'grape_vine_bare', respawnTicks: [40, 80], model: { template: 'bush', berries: '#6a2a8a' } });
registerObject({ id: 'grape_vine_bare', name: 'Grapevine', examine: 'All picked.', model: { template: 'bush' } });

// ---- NPCs ---------------------------------------------------------------------------------------------
const human = (colors, extra = {}) => ({ template: 'human', colors, ...extra });
registerNpc({
  id: 'tanner', name: 'Hesk the tanner', examine: 'Smells of lime and leather.', options: ['Talk-to', 'Tan'], dialogue: 'tanner', wanderRadius: 1,
  mapIcon: { char: 'T', color: '#c8a070' }, model: human({ skin: '#c8946a', top: '#6a4a2a', legs: '#3a2a1a', hair: '#2a1a10' }, { extras: { beard: '#2a1a10' } }),
});
registerNpc({
  id: 'sawmill_operator', name: 'Oswin the sawyer', examine: 'Sawdust in his hair, sawdust everywhere.', options: ['Talk-to', 'Buy-plank'], dialogue: 'sawmill_operator', wanderRadius: 1,
  model: human({ skin: '#d8a880', top: '#8a3a2a', legs: '#4a3a2a', hair: '#a87a3a' }),
});
registerNpc({
  id: 'artisan_supplier', name: 'Tilda Coil', examine: 'She sells tools for every trade.', options: ['Talk-to', 'Trade'], dialogue: 'artisan_supplier', shop: 'artisan_supplies', wanderRadius: 1,
  mapIcon: { char: '$', color: '#c8a070' }, model: human({ skin: '#e0b090', top: '#3a6a8a', legs: '#4a4a5a', hair: '#6a3a1a' }, { female: true, hairStyle: 'long' }),
});
registerNpc({
  id: 'apothecary', name: 'Apothecary Venn', examine: 'Smells faintly of herbs and vinegar.', options: ['Talk-to', 'Trade'], dialogue: 'apothecary', shop: 'apothecary', wanderRadius: 0,
  mapIcon: { char: '$', color: '#60c080' }, model: human({ skin: '#c89070', top: '#2a5a3a', legs: '#2a3a2a', hair: '#d8d8d8' }, { extras: { beard: '#d8d8d8' } }),
});
registerNpc({
  id: 'provisioner', name: 'Provisioner Bram', examine: 'He keeps the town fed.', options: ['Talk-to', 'Trade'], dialogue: 'provisioner', shop: 'provisions', wanderRadius: 0,
  mapIcon: { char: '$', color: '#e8c040' }, model: human({ skin: '#d8a880', top: '#c8b890', legs: '#5a4a3a', hair: '#3a2a1a' }),
});

registerShop({ id: 'artisan_supplies', name: "Tilda's Tools & Trades", restockTicks: 30, stock: [
  { id: 'hammer', qty: 5 }, { id: 'saw', qty: 5 }, { id: 'chisel', qty: 5 }, { id: 'knife', qty: 5 }, { id: 'tinderbox', qty: 5 },
  { id: 'needle', qty: 5 }, { id: 'thread', qty: 200 }, { id: 'ring_mould', qty: 3 }, { id: 'necklace_mould', qty: 3 }, { id: 'amulet_mould', qty: 3 },
  { id: 'pestle_and_mortar', qty: 3 }, { id: 'bucket', qty: 10 }, { id: 'jug', qty: 10 }, { id: 'pot', qty: 10 }, { id: 'bowl', qty: 10 },
  { id: 'pie_dish', qty: 10 }, { id: 'cake_tin', qty: 5 }, { id: 'vial', qty: 30 },
] });
registerShop({ id: 'apothecary', name: "Venn's Apothecary", restockTicks: 40, stock: [
  { id: 'vial', qty: 50 }, { id: 'vial_of_water', qty: 50 }, { id: 'pestle_and_mortar', qty: 5 },
  { id: 'beetle_shell', qty: 15 }, { id: 'rat_tail', qty: 15 }, { id: 'ashes', qty: 20 }, { id: 'antidote_4', qty: 5 },
] });
registerShop({ id: 'provisions', name: "Bram's Provisions", restockTicks: 30, stock: [
  { id: 'grapes', qty: 30 }, { id: 'egg', qty: 20 }, { id: 'bucket_of_milk', qty: 10 }, { id: 'pot_of_flour', qty: 10 },
  { id: 'fieldroot', qty: 20 }, { id: 'bread', qty: 10 }, { id: 'jug_of_water', qty: 20 },
] });

const shopTalk = (id, lines) => registerDialogue(id, [
  { npc: lines[0] },
  { options: [{ text: 'Let me see your wares.', action: (ctx) => { ctx.game.ui.openShop(ctx.npc.def.shop); return false; } }, { text: lines[1], goto: 'more' }, { text: 'Goodbye.', end: true }] },
  { label: 'more', npc: lines[2], end: true },
]);
shopTalk('artisan_supplier', ["Tools for every trade! Needles, moulds, saws - if you make it, I've got what you make it with.", 'Any crafting advice?', 'Gold bars and a mould at a furnace make fine jewellery. Cut a gem with a chisel first and set it in. Leather wants a needle and thread - each reel lasts five stitches.']);
shopTalk('apothecary', ['Vials, water, and a few of the commoner secondaries. Looking to brew?', 'How does brewing work?', "Clean your herb, drop it in a vial of water, then add the secondary. Monsters carry the rarer ingredients - fangs, dusts, scales. Grind scales with a pestle first."]);
shopTalk('provisioner', ['Fresh eggs, milk, flour and grapes. Everything a cook needs.', 'Any cooking tips?', 'Ranges burn less than open fires. Pies and cakes need a proper range. Grapes and a jug of water make wine - give it time to ferment.']);
registerDialogue('tanner', [
  { npc: "Hides to tan? Cowhide's cheap, drake and wyrm hides cost more - the scales are a nightmare." },
  { options: [{ text: 'Please tan my hides.', action: (ctx) => { ctx.game.production.openTanning(ctx.player); return false; } }, { text: 'Never mind.', end: true }] },
]);
registerDialogue('sawmill_operator', [
  { npc: 'Bring me logs and coin and I will saw you planks. Plain, birch, redleaf or ironbark.' },
  { options: [
    { text: 'Make me some planks.', action: (ctx) => { ctx.game.production.openSawmill(ctx.player); return false; } },
    { text: 'What are planks for?', goto: 'why' }, { text: 'Goodbye.', end: true },
  ] },
  { label: 'why', npc: 'Building! Step through that portal to your homestead. Bring a hammer, a saw, nails and planks and you can furnish the place.', end: true },
]);

// ---- placement -------------------------------------------------------------------------------------------
const obj = (id, x, y, rot) => registerSpawn({ type: 'object', id, x, y, rot });
const npc = (id, x, y, wander = 1) => registerSpawn({ type: 'npc', id, x, y, wander });

// Crafters' row, just east of the Brackenford bridge: workshop + sawmill + homestead portal
const keepClear = (x0, y0, x1, y1) => registerPaint({ shape: 'rect', x0, y0, x1, y1, noScatter: true }); // no scatter (trees, rocks) here
keepClear(132, 142, 148, 149);
registerSpawn({ type: 'building', name: 'Workshop', x: 133, y: 142, w: 9, h: 7, wall: 'wall_wood', floor: 'wood_floor', roof: '#4a5a3a', doors: [{ side: 'n', offset: 4 }] });
obj('spinning_wheel', 134, 143); obj('potters_wheel', 134, 145); obj('pottery_oven', 140, 143); obj('tanning_rack', 140, 146);
npc('tanner', 139, 145); npc('artisan_supplier', 136, 146);
obj('sawmill', 143, 143); obj('log_pile', 145, 143); obj('log_pile', 146, 144);
npc('sawmill_operator', 144, 145);
// Market stalls for apothecary & provisioner
obj('market_stall', 100, 155); npc('apothecary', 100, 154, 0);
obj('market_stall', 104, 155); npc('provisioner', 104, 154, 0);
obj('water_pump', 93, 153);

// Haverly Farms: wheat field, millstone, flax field, grapevines, eggs
keepClear(142, 172, 152, 177); keepClear(131, 159, 139, 169);
for (let x = 143; x <= 149; x++) for (let y = 173; y <= 176; y++) if ((x + y) % 2 === 0) obj('wheat', x, y);
obj('millstone', 151, 172);
for (let x = 132; x <= 137; x++) for (let y = 160; y <= 165; y++) if ((x * 3 + y) % 2 === 0) obj('flax_plant', x, y);
for (const [x, y] of [[134, 168], [136, 168], [138, 168]]) obj('grape_vine', x, y);
for (const [x, y] of [[161, 151], [165, 157]]) registerSpawn({ type: 'item', id: 'egg', qty: 1, x, y, respawnTicks: 60 });

// Extra smithing / cooking stations
obj('furnace', 58, 95); obj('anvil', 61, 96);                // Greystone quarry smithy
obj('furnace', 174, 99); obj('anvil', 177, 100);             // Highmarch south-east
obj('cooking_range', 170, 85);                               // Highmarch house
obj('cooking_range', 143, 166);                              // Haverly farmhouse kitchen

// Herblore secondaries lying about
for (const [x, y] of [[40, 6], [62, 4], [110, 8], [150, 5], [172, 9]]) registerSpawn({ type: 'item', id: 'frost_lichen', qty: 1, x, y, respawnTicks: 120 });
for (const [x, y] of [[27, 37], [33, 40], [30, 43]]) registerSpawn({ type: 'item', id: 'grave_dust', qty: 1, x, y, respawnTicks: 100 });
