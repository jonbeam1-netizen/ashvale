// Crafting content: spinning, tanning, leather & hide armour, gem cutting, jewellery, pottery.
// OWNER: agent C. Uncut gems + clay come from agent B (mining); hides drop from agent D's NPCs.

import { getItem } from '../core/registry.js';
import { ensureItem, item, recipe } from './recipes_util.js';

// ---- tools & supplies -------------------------------------------------------------------------------
ensureItem({ id: 'chisel', name: 'Chisel', examine: 'Good for detailed crafting.', value: 1, icon: { shape: 'chisel' } });
item({ id: 'needle', name: 'Needle', examine: 'Used with thread to make leather armour.', value: 1, icon: { shape: 'needle' } });
item({ id: 'thread', name: 'Thread', examine: 'A reel of thread. Each lasts for five stitches.', stackable: true, value: 1, icon: { shape: 'string', color: '#e8e4d8' } });
item({ id: 'ring_mould', name: 'Ring mould', examine: 'Used to cast rings at a furnace.', value: 5, icon: { shape: 'mould', color: '#8a8a8a', color2: 'ring' } });
item({ id: 'necklace_mould', name: 'Necklace mould', examine: 'Used to cast necklaces at a furnace.', value: 5, icon: { shape: 'mould', color: '#8a8a8a', color2: 'necklace' } });
item({ id: 'amulet_mould', name: 'Amulet mould', examine: 'Used to cast amulets at a furnace.', value: 5, icon: { shape: 'mould', color: '#8a8a8a', color2: 'amulet' } });

// ---- spinning ---------------------------------------------------------------------------------------------
ensureItem({ id: 'flax', name: 'Flax', examine: 'I should spin this into a bowstring.', value: 5, icon: { shape: 'herb', color: '#7a9ac8' } });
recipe({ id: 'spin_bowstring', skill: 'crafting', category: 'spin', level: 10, xp: 15, station: 'spinning_wheel', ticks: 3, inputs: [{ id: 'flax', qty: 1 }], outputs: [{ id: 'bowstring', qty: 1 }], verb: 'spin' });
if (getItem('wool')) {
  ensureItem({ id: 'ball_of_wool', name: 'Ball of wool', examine: 'Spun from sheep\'s wool.', value: 2, icon: { shape: 'string', color: '#f0f0e8' } });
  recipe({ id: 'spin_wool', skill: 'crafting', category: 'spin', level: 1, xp: 2.5, station: 'spinning_wheel', ticks: 3, inputs: [{ id: 'wool', qty: 1 }], outputs: [{ id: 'ball_of_wool', qty: 1 }], verb: 'spin' });
}

// ---- hides & tanning ---------------------------------------------------------------------------------------
/** Tanning table used by the tanner NPC / tanning rack: hide -> leather for a coin fee. */
export const TANNING = [
  { hide: 'cowhide', leather: 'leather', fee: 1 },
  { hide: 'cowhide', leather: 'hard_leather', fee: 3 },
  { hide: 'fen_drake_hide', leather: 'fen_drake_leather', fee: 20 },
  { hide: 'ashen_wyrm_hide', leather: 'ashen_wyrm_leather', fee: 25 },
  { hide: 'frost_wyrm_hide', leather: 'frost_wyrm_leather', fee: 30 },
];
ensureItem({ id: 'cowhide', name: 'Cowhide', examine: 'I should take this to a tanner.', value: 2, icon: { shape: 'hide', color: '#e8e0d0', color2: '#3a3028' } });
item({ id: 'leather', name: 'Leather', examine: 'Soft tanned leather. Needle and thread will shape it.', value: 2, icon: { shape: 'leather', color: '#9a6a3a' } });
item({ id: 'hard_leather', name: 'Hard leather', examine: 'Tough, stiffened leather.', value: 12, icon: { shape: 'leather', color: '#6a4a2a' } });

export const HIDE_TIERS = [
  // id, name, hide colour, leather colour, crafting levels [vambraces, chaps, coif, body], ranged req, stat multiplier
  { id: 'fen_drake', name: 'Fen drake', color: '#4a7a3a', leatherColor: '#3e6a32', levels: [57, 60, 61, 63], req: 40, mult: 1, value: 180 },
  { id: 'ashen_wyrm', name: 'Ashen wyrm', color: '#5a5a62', leatherColor: '#4a4a54', levels: [66, 68, 69, 71], req: 50, mult: 1.25, value: 260 },
  { id: 'frost_wyrm', name: 'Frost wyrm', color: '#8ab8d8', leatherColor: '#6a9ac0', levels: [79, 82, 83, 84], req: 60, mult: 1.5, value: 380 },
];
for (const h of HIDE_TIERS) {
  item({ id: `${h.id}_hide`, name: `${h.name} hide`, examine: 'A scaly hide. A tanner can turn it into leather.', value: h.value, icon: { shape: 'hide', color: h.color, color2: '#2a2a2a' } });
  item({ id: `${h.id}_leather`, name: `${h.name} leather`, examine: 'Supple, scaled leather. Light but tough.', value: Math.round(h.value * 1.3), icon: { shape: 'leather', color: h.leatherColor } });
}

// ---- leather crafting (needle + thread) ---------------------------------------------------------------------
const L = (id, name, slot, icon, model, color, bonuses, requirements = {}, value = 10) =>
  ensureItem({ id, name, slot, requirements, bonuses, value, color, icon: { shape: icon, color }, model: { shape: model, color } });
const LEATHER = '#8a5a30', HARD = '#6a4422', STUD = '#7a5a3a';
L('leather_gloves', 'Leather gloves', 'hands', 'gloves', 'gloves', '#7a5530', { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 }, {}, 6);
L('leather_boots', 'Leather boots', 'feet', 'boots', 'boots', '#6a4a2a', { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 }, {}, 6);
L('leather_cowl', 'Leather cowl', 'head', 'hood', 'hood', LEATHER, { attackRanged: 1, defenceStab: 1, defenceSlash: 2, defenceCrush: 1, defenceMagic: 1, defenceRanged: 2 }, {}, 24);
L('leather_vambraces', 'Leather vambraces', 'hands', 'gloves', 'gloves', LEATHER, { attackRanged: 4, defenceStab: 2, defenceSlash: 2, defenceCrush: 2, defenceMagic: 1, defenceRanged: 1 }, {}, 18);
L('leather_body', 'Leather body', 'body', 'chainbody', 'chainbody', LEATHER, { attackMagic: -2, attackRanged: 2, defenceStab: 8, defenceSlash: 9, defenceCrush: 10, defenceMagic: 4, defenceRanged: 9 }, {}, 21);
L('leather_chaps', 'Leather chaps', 'legs', 'legs', 'platelegs', LEATHER, { attackRanged: 4, defenceStab: 2, defenceSlash: 3, defenceCrush: 3, defenceMagic: 2, defenceRanged: 3 }, {}, 20);
L('hard_leather_body', 'Hard leather body', 'body', 'chainbody', 'chainbody', HARD, { attackMagic: -4, attackRanged: 6, defenceStab: 12, defenceSlash: 15, defenceCrush: 18, defenceMagic: 6, defenceRanged: 15 }, { defence: 10 }, 170);
L('leather_coif', 'Leather coif', 'head', 'hood', 'coif', LEATHER, { attackMagic: -1, attackRanged: 2, defenceStab: 2, defenceSlash: 4, defenceCrush: 4, defenceMagic: 3, defenceRanged: 4 }, { ranged: 20 }, 200);
L('studded_body', 'Studded body', 'body', 'chainbody', 'chainbody', STUD, { attackMagic: -4, attackRanged: 8, defenceStab: 18, defenceSlash: 25, defenceCrush: 22, defenceMagic: 8, defenceRanged: 25 }, { ranged: 20, defence: 20 }, 850);
L('studded_chaps', 'Studded chaps', 'legs', 'legs', 'platelegs', STUD, { attackMagic: -5, attackRanged: 6, defenceStab: 15, defenceSlash: 16, defenceCrush: 17, defenceMagic: 6, defenceRanged: 16 }, { ranged: 20 }, 750);

const sew = (id, level, xp, inputs, extra = {}) => recipe({ id: `sew_${id}`, skill: 'crafting', category: 'leather', level, xp, tools: ['needle'], thread: 1, ticks: 3, inputs, outputs: [{ id, qty: 1 }], verb: 'sew', ...extra });
sew('leather_gloves', 1, 13.8, [{ id: 'leather', qty: 1 }]);
sew('leather_boots', 7, 16.3, [{ id: 'leather', qty: 1 }]);
sew('leather_cowl', 9, 18.5, [{ id: 'leather', qty: 1 }]);
sew('leather_vambraces', 11, 22, [{ id: 'leather', qty: 1 }]);
sew('leather_body', 14, 25, [{ id: 'leather', qty: 1 }]);
sew('leather_chaps', 18, 27, [{ id: 'leather', qty: 1 }]);
sew('hard_leather_body', 28, 35, [{ id: 'hard_leather', qty: 1 }]);
sew('leather_coif', 38, 37, [{ id: 'leather', qty: 1 }]);
recipe({ id: 'stud_body', skill: 'crafting', category: 'leather', level: 41, xp: 40, ticks: 3, inputs: [{ id: 'leather_body', qty: 1 }, { id: 'steel_studs', qty: 1 }], outputs: [{ id: 'studded_body', qty: 1 }], verb: 'stud' });
recipe({ id: 'stud_chaps', skill: 'crafting', category: 'leather', level: 44, xp: 42, ticks: 3, inputs: [{ id: 'leather_chaps', qty: 1 }, { id: 'steel_studs', qty: 1 }], outputs: [{ id: 'studded_chaps', qty: 1 }], verb: 'stud' });

const HIDE_PIECES = [
  // piece, label, slot, icon, model, leathers, xp per leather, base bonuses
  ['vambraces', 'vambraces', 'hands', 'gloves', 'gloves', 1, { attackRanged: 8, defenceStab: 3, defenceSlash: 2, defenceCrush: 4, defenceMagic: 2 }],
  ['chaps', 'chaps', 'legs', 'legs', 'platelegs', 2, { attackMagic: -10, attackRanged: 8, defenceStab: 12, defenceSlash: 15, defenceCrush: 18, defenceMagic: 12, defenceRanged: 15 }],
  ['coif', 'coif', 'head', 'hood', 'coif', 2, { attackMagic: -1, attackRanged: 4, defenceStab: 4, defenceSlash: 7, defenceCrush: 10, defenceMagic: 4, defenceRanged: 8 }],
  ['body', 'body', 'body', 'chainbody', 'chainbody', 3, { attackMagic: -15, attackRanged: 15, defenceStab: 18, defenceSlash: 27, defenceCrush: 24, defenceMagic: 20, defenceRanged: 26 }],
];
const XP_PER_LEATHER = [62, 70, 78];
HIDE_TIERS.forEach((h, k) => {
  HIDE_PIECES.forEach(([piece, label, slot, icon, model, n, base], i) => {
    const id = `${h.id}_${piece}`;
    const bonuses = Object.fromEntries(Object.entries(base).map(([key, v]) => [key, Math.round(v * h.mult)]));
    const requirements = piece === 'body' ? { ranged: h.req, defence: 40 } : { ranged: h.req };
    item({ id, name: `${h.name} ${label}`, examine: `${h.name} leather ${label}, light enough for an archer.`, slot, requirements, bonuses, value: Math.round(h.value * n * 2.2), color: h.leatherColor, icon: { shape: icon, color: h.leatherColor }, model: { shape: model, color: h.leatherColor } });
    sew(id, h.levels[i], XP_PER_LEATHER[k] * n, [{ id: `${h.id}_leather`, qty: n }]);
  });
});

// ---- gems ------------------------------------------------------------------------------------------------
export const GEMS = [
  // cut id, uncut id, name, level, xp, colour
  { id: 'moonstone', uncut: 'uncut_moonstone', name: 'Moonstone', level: 20, xp: 50, color: '#a8c8e8', tier: 1 },
  { id: 'garnet', uncut: 'uncut_garnet', name: 'Garnet', level: 27, xp: 67.5, color: '#a02838', tier: 2 },
  { id: 'sunstone', uncut: 'uncut_sunstone', name: 'Sunstone', level: 34, xp: 85, color: '#f0a020', tier: 3 },
  { id: 'tidestone', uncut: 'uncut_tidestone', name: 'Tidestone', level: 43, xp: 107.5, color: '#20a8a0', tier: 4 },
  { id: 'starheart', uncut: 'uncut_starheart', name: 'Starheart', level: 55, xp: 137.5, color: '#d8b8f8', tier: 5 },
];
for (const g of GEMS) {
  ensureItem({ id: g.uncut, name: `Uncut ${g.name.toLowerCase()}`, examine: 'An uncut gem.', value: 25 * 2 ** g.tier, icon: { shape: 'gem', color: g.color } });
  item({ id: g.id, name: g.name, examine: `A beautifully cut ${g.name.toLowerCase()}.`, value: 50 * 2 ** g.tier, icon: { shape: 'gem', color: g.color } });
  recipe({ id: `cut_${g.id}`, skill: 'crafting', category: 'gem', level: g.level, xp: g.xp, tools: ['chisel'], ticks: 2, inputs: [{ id: g.uncut, qty: 1 }], outputs: [{ id: g.id, qty: 1 }], verb: 'cut' });
}

// ---- jewellery (furnace + mould) ---------------------------------------------------------------------------------
// gem tier 0 = plain gold. [ring, necklace, amulet] levels & xp per gem tier.
const JEWEL_LV = [[5, 6, 8], [20, 22, 24], [27, 29, 31], [34, 40, 50], [43, 56, 70], [55, 72, 80]];
const JEWEL_XP = [[15, 20, 30], [40, 55, 65], [55, 60, 70], [70, 75, 85], [85, 90, 100], [100, 105, 150]];
const KINDS = [['ring', 'ring', 'ring_mould'], ['necklace', 'necklace', 'necklace_mould'], ['amulet', 'amulet', 'amulet_mould']];
const GOLD = '#e8c040', SILVER = '#d8dce4';

function jewelBonuses(kind, g) {
  if (kind === 'ring') return { defenceStab: g, defenceSlash: g, defenceCrush: g, defenceMagic: g, defenceRanged: g, prayer: Math.ceil(g / 2) };
  if (kind === 'necklace') return { defenceStab: 2 * g + 1, defenceSlash: 2 * g + 1, defenceCrush: 2 * g + 1, defenceMagic: 2 * g + 1, defenceRanged: 2 * g + 1, prayer: g >= 3 ? 1 : 0 };
  const a = 2 * g + 2;
  return { attackStab: a, attackSlash: a, attackCrush: a, attackMagic: a, attackRanged: a, strength: g ? g + 1 : 0, prayer: g >= 3 ? 1 : 0 };
}

export const JEWELLERY = [];
[{ id: null, name: '', color: null, tier: 0 }, ...GEMS].forEach((g) => {
  KINDS.forEach(([kind, shape, mould], k) => {
    const id = g.id ? `${g.id}_${kind}` : `gold_${kind}`;
    const name = g.id ? `${g.name} ${kind}` : `Gold ${kind}`;
    const slot = kind === 'ring' ? 'ring' : 'neck';
    item({
      id, name, examine: g.id ? `A gold ${kind} set with a ${g.name.toLowerCase()}.` : `A plain gold ${kind}.`,
      value: Math.round((150 + 100 * 2 ** g.tier) * (1 + k * 0.4)), slot, bonuses: jewelBonuses(kind, g.tier),
      color: GOLD, icon: { shape, color: GOLD, color2: g.color || (kind === 'necklace' ? null : GOLD) }, model: { color: GOLD },
    });
    const inputs = [{ id: 'gold_bar', qty: 1 }];
    if (g.id) inputs.push({ id: g.id, qty: 1 });
    recipe({ id: `jewel_${id}`, skill: 'crafting', category: 'jewellery', metal: 'gold', kind, gem: g.id, level: JEWEL_LV[g.tier][k], xp: JEWEL_XP[g.tier][k], station: 'furnace', tools: [mould], ticks: 3, inputs, outputs: [{ id, qty: 1 }], verb: 'cast' });
    JEWELLERY.push(id);
  });
});
// silver: plain pieces with devotional bonuses
[['ring', 3, 12, { prayer: 1, defenceMagic: 1 }], ['necklace', 7, 18, { prayer: 2, defenceMagic: 3 }], ['amulet', 12, 25, { prayer: 4, attackMagic: 2 }]].forEach(([kind, lvl, xp, bonuses], k) => {
  const id = `silver_${kind}`;
  item({ id, name: `Silver ${kind}`, examine: `A delicate silver ${kind}. It feels calming to wear.`, value: 90 + k * 40, slot: kind === 'ring' ? 'ring' : 'neck', bonuses, color: SILVER, icon: { shape: kind, color: SILVER, color2: kind === 'necklace' ? null : '#f0f4ff' }, model: { color: SILVER } });
  recipe({ id: `jewel_${id}`, skill: 'crafting', category: 'jewellery', metal: 'silver', kind, gem: null, level: lvl, xp, station: 'furnace', tools: [KINDS[k][2]], ticks: 3, inputs: [{ id: 'silver_bar', qty: 1 }], outputs: [{ id, qty: 1 }], verb: 'cast' });
  JEWELLERY.push(id);
});

// ---- pottery ------------------------------------------------------------------------------------------------------
ensureItem({ id: 'clay', name: 'Clay', examine: 'Some hard dry clay.', value: 2, icon: { shape: 'ore', color: '#c8a878' } });
item({ id: 'soft_clay', name: 'Soft clay', examine: 'Clay that is ready to be shaped.', value: 3, icon: { shape: 'lump', color: '#b88a5a' } });
for (const [water, empty] of [['bucket_of_water', 'bucket'], ['jug_of_water', 'jug'], ['bowl_of_water', 'bowl']]) {
  recipe({ id: `soften_clay_${water}`, skill: 'crafting', category: 'prep', level: 1, xp: 0, ticks: 2, inputs: [{ id: 'clay', qty: 1 }, { id: water, qty: 1 }], outputs: [{ id: 'soft_clay', qty: 1 }, { id: empty, qty: 1 }], verb: 'mix', message: 'You mix the clay and water into soft clay.' });
}
const POTTERY = [
  // fired id, unfired name, level, shape xp, fire xp
  ['pot', 'Unfired pot', 1, 6.3, 6.3, 'pot'],
  ['pie_dish', 'Unfired pie dish', 7, 15, 10, 'tin'],
  ['bowl', 'Unfired bowl', 8, 18, 15, 'bowl'],
];
for (const [id, name, level, xp1, xp2, shape] of POTTERY) {
  item({ id: `unfired_${id}`, name, examine: 'I need to put this in a pottery oven.', value: 1, icon: { shape, color: '#b88a5a' } });
  recipe({ id: `shape_${id}`, skill: 'crafting', category: 'pottery', level, xp: xp1, station: 'potters_wheel', ticks: 3, inputs: [{ id: 'soft_clay', qty: 1 }], outputs: [{ id: `unfired_${id}`, qty: 1 }], verb: 'shape' });
  recipe({ id: `fire_${id}`, skill: 'crafting', category: 'kiln', level, xp: xp2, station: 'pottery_oven', ticks: 3, inputs: [{ id: `unfired_${id}`, qty: 1 }], outputs: [{ id, qty: 1 }], verb: 'fire' });
}
