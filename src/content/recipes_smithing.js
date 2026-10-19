// Smithing content: bars (smelting) and anvil pieces (forging). OWNER: agent C.
// Metal equipment items (<tier>_<piece>) are registered by agent D; we register the bars and the
// ammunition/construction parts we produce ourselves (arrowtips, dart tips, nails, studs).

import { METAL_TIERS } from '../core/constants.js';
import { ensureItem, item, recipe } from './recipes_util.js';

const COL = Object.fromEntries(METAL_TIERS.map((t) => [t.id, t.color]));

/** Smithing tiers. level = smithing level to smelt and to forge the cheapest piece. */
export const SMITH_TIERS = [
  { id: 'bronze', name: 'Bronze', level: 1, smeltXp: 6.2, barXp: 12.5, value: 20, ores: [['copper_ore', 1], ['tin_ore', 1]] },
  { id: 'iron', name: 'Iron', level: 15, smeltXp: 12.5, barXp: 25, value: 70, ores: [['iron_ore', 1]], failChance: 0.5 },
  { id: 'steel', name: 'Steel', level: 30, smeltXp: 17.5, barXp: 37.5, value: 250, ores: [['iron_ore', 1], ['coal', 2]] },
  { id: 'duskite', name: 'Duskite', level: 50, smeltXp: 30, barXp: 50, value: 600, ores: [['duskite_ore', 1], ['coal', 4]] },
  { id: 'verdite', name: 'Verdite', level: 70, smeltXp: 37.5, barXp: 62.5, value: 1600, ores: [['verdite_ore', 1], ['coal', 5]] },
  { id: 'azurium', name: 'Azurium', level: 85, smeltXp: 50, barXp: 75, value: 4000, ores: [['azurium_ore', 1], ['coal', 6]] },
  { id: 'emberite', name: 'Emberite', level: 92, smeltXp: 65, barXp: 90, value: 10000, ores: [['emberite_ore', 1], ['coal', 8]] },
];

/** Anvil pieces: [piece, level offset, bars, qty made, display name]. Order = interface order. */
export const SMITH_PIECES = [
  ['dagger', 0, 1, 1, 'Dagger'], ['axe', 1, 1, 1, 'Axe'], ['mace', 2, 1, 1, 'Mace'], ['med_helm', 3, 1, 1, 'Med helm'],
  ['sword', 4, 1, 1, 'Sword'], ['dart_tips', 4, 1, 10, 'Dart tips'], ['nails', 4, 1, 15, 'Nails'],
  ['scimitar', 5, 2, 1, 'Scimitar'], ['arrowtips', 5, 1, 15, 'Arrowtips'], ['pickaxe', 5, 2, 1, 'Pickaxe'],
  ['longsword', 6, 2, 1, 'Longsword'], ['full_helm', 7, 2, 1, 'Full helm'], ['sq_shield', 8, 2, 1, 'Square shield'],
  ['warhammer', 9, 3, 1, 'Warhammer'], ['battleaxe', 10, 3, 1, 'Battleaxe'], ['chainbody', 11, 3, 1, 'Chainbody'],
  ['kiteshield', 12, 3, 1, 'Kiteshield'], ['twohand_sword', 14, 3, 1, '2h sword'], ['platelegs', 16, 3, 1, 'Platelegs'],
  ['plateskirt', 16, 3, 1, 'Plateskirt'], ['platebody', 18, 5, 1, 'Platebody'],
];

export const pieceLevel = (tier, offset) => Math.min(99, tier.level + Math.round(offset * Math.min(1, (99 - tier.level) / 18)));

// ---- bars ---------------------------------------------------------------------------------------
for (const t of SMITH_TIERS) {
  item({ id: `${t.id}_bar`, name: `${t.name} bar`, examine: `A bar of ${t.name.toLowerCase()}.`, value: t.value, icon: { shape: 'bar', color: COL[t.id] } });
}
item({ id: 'silver_bar', name: 'Silver bar', examine: 'A gleaming bar of silver. Good for jewellery.', value: 75, icon: { shape: 'bar', color: '#d8dce4' } });
item({ id: 'gold_bar', name: 'Gold bar', examine: 'A heavy bar of gold. Good for jewellery.', value: 150, icon: { shape: 'bar', color: '#e8c040' } });
ensureItem({ id: 'hammer', name: 'Hammer', examine: 'Good for hitting things.', value: 1, icon: { shape: 'hammer', color: '#8a8a92' } });

// ---- smelting -----------------------------------------------------------------------------------
for (const t of SMITH_TIERS) {
  recipe({
    id: `smelt_${t.id}`, skill: 'smithing', category: 'smelt', level: t.level, xp: t.smeltXp, station: 'furnace', ticks: 4,
    inputs: t.ores.map(([id, qty]) => ({ id, qty })), outputs: [{ id: `${t.id}_bar`, qty: 1 }],
    failChance: t.failChance, failMessage: 'The ore is too impure and you fail to refine it.',
    verb: 'smelt', sound: 'smelt',
  });
}
recipe({ id: 'smelt_silver', skill: 'smithing', category: 'smelt', level: 20, xp: 13.7, station: 'furnace', ticks: 4, inputs: [{ id: 'silver_ore', qty: 1 }], outputs: [{ id: 'silver_bar', qty: 1 }], verb: 'smelt' });
recipe({ id: 'smelt_gold', skill: 'smithing', category: 'smelt', level: 40, xp: 22.5, station: 'furnace', ticks: 4, inputs: [{ id: 'gold_ore', qty: 1 }], outputs: [{ id: 'gold_bar', qty: 1 }], verb: 'smelt' });

// ---- parts we own: arrowtips, dart tips, nails ----------------------------------------------------
const ARROW_VALUE = [1, 3, 12, 30, 75, 190, 600];
SMITH_TIERS.forEach((t, k) => {
  item({ id: `${t.id}_arrowtips`, name: `${t.name} arrowtips`, examine: 'I can make some arrows with these.', stackable: true, value: ARROW_VALUE[k], icon: { shape: 'tips', color: COL[t.id] } });
  item({ id: `${t.id}_dart_tips`, name: `${t.name} dart tips`, examine: 'Dart tips, ready to be fletched with feathers.', stackable: true, value: Math.round(ARROW_VALUE[k] * 1.5), icon: { shape: 'tips', color: COL[t.id] } });
  item({ id: `${t.id}_nails`, name: `${t.name} nails`, examine: 'Nails for construction. Better metal bends less often.', stackable: true, value: Math.max(1, Math.round(ARROW_VALUE[k] * 0.7)), icon: { shape: 'nails', color: COL[t.id] } });
});
item({ id: 'steel_studs', name: 'Steel studs', examine: 'Studs for reinforcing leather armour.', value: 60, icon: { shape: 'studs', color: COL.steel } });

// ---- forging -------------------------------------------------------------------------------------
for (const t of SMITH_TIERS) {
  for (const [piece, off, bars, qty, label] of SMITH_PIECES) {
    recipe({
      id: `forge_${t.id}_${piece}`, skill: 'smithing', category: 'forge', tier: t.id, piece, label,
      level: pieceLevel(t, off), xp: t.barXp * bars, station: 'anvil', tools: ['hammer'], ticks: 5,
      inputs: [{ id: `${t.id}_bar`, qty: bars }], outputs: [{ id: `${t.id}_${piece}`, qty }], verb: 'hammer',
    });
  }
}
recipe({
  id: 'forge_steel_studs', skill: 'smithing', category: 'forge', tier: 'steel', piece: 'studs', label: 'Studs',
  level: 36, xp: 37.5, station: 'anvil', tools: ['hammer'], ticks: 5,
  inputs: [{ id: 'steel_bar', qty: 1 }], outputs: [{ id: 'steel_studs', qty: 1 }],
});
