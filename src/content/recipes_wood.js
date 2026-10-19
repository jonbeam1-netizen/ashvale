// Firemaking + Fletching content. OWNER: agent C.
//
// Logs are registered by agent B (gathering.js, imported before us). We discover every log item
// (id 'logs' or '*_logs') and rank them by the woodcutting level of the tree that yields them, so
// new trees automatically get firemaking data, arrow shafts and bows.

import { getItem, allItems, allData, registerData, registerObject } from '../core/registry.js';
import { METAL_TIERS } from '../core/constants.js';
import { ensureItem, item, recipe } from './recipes_util.js';
import { SMITH_TIERS } from './recipes_smithing.js';

// ---- discover woods -------------------------------------------------------------------------------
const wcLevel = {};
for (const [, d] of allData('woodcutting')) if (d?.log) wcLevel[d.log] = Math.min(wcLevel[d.log] ?? 99, d.level ?? 1);
const KNOWN = ['logs', 'birch_logs', 'weepwood_logs', 'redleaf_logs', 'ironbark_logs', 'starwood_logs'];
const logIds = new Set(KNOWN.filter((id) => getItem(id)));
for (const d of allItems()) if (d.id === 'logs' || /_logs$/.test(d.id)) logIds.add(d.id);
const rank = (id) => wcLevel[id] ?? (KNOWN.indexOf(id) >= 0 ? [1, 15, 30, 45, 60, 75][KNOWN.indexOf(id)] : 50);
export const WOODS = [...logIds].sort((a, b) => rank(a) - rank(b) || KNOWN.indexOf(a) - KNOWN.indexOf(b)).map((log, k) => {
  const prefix = log === 'logs' ? '' : log.replace(/_logs$/, '');
  const name = prefix ? prefix.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : '';
  return { log, prefix, name, tier: Math.min(k, 5), level: rank(log), color: getItem(log)?.icon?.color || '#7a5228' };
});

// ---- firemaking ---------------------------------------------------------------------------------------
const FM = [ // level, xp, burn ticks
  [1, 40, [60, 100]], [15, 60, [70, 110]], [30, 90, [80, 120]], [45, 135, [90, 130]], [60, 202.5, [100, 140]], [75, 303.8, [110, 160]],
];
for (const w of WOODS) {
  const [lvl, xp, burnTicks] = FM[w.tier];
  registerData('firemaking', w.log, { level: lvl, xp, burnTicks });
}
registerObject({ id: 'fire', name: 'Fire', examine: 'A hot fire. Good for cooking on.', options: ['Cook'], model: { template: 'fire' } });
ensureItem({ id: 'ashes', name: 'Ashes', examine: "A heap of ashes. Herbalists find a use for them.", value: 2, icon: { shape: 'lump', color: '#8a8580' } });
ensureItem({ id: 'tinderbox', name: 'Tinderbox', examine: 'Useful for lighting fires.', value: 1, icon: { shape: 'tinderbox' } });

// ---- fletching ------------------------------------------------------------------------------------------
ensureItem({ id: 'knife', name: 'Knife', examine: 'A sharp knife.', value: 6, icon: { shape: 'knife', color: '#c0c0c8' } });
ensureItem({ id: 'feather', name: 'Feather', examine: 'Useful for fletching and fishing.', stackable: true, value: 2, icon: { shape: 'feather', color: '#f0f0f0' } });
item({ id: 'bowstring', name: 'Bowstring', examine: 'I need a bow to attach this to.', value: 5, icon: { shape: 'string', color: '#e8e0c0' } });
item({ id: 'arrow_shaft', name: 'Arrow shaft', examine: 'A wooden arrow shaft.', stackable: true, value: 1, icon: { shape: 'shafts', color: '#9a7a48' } });
item({ id: 'headless_arrow', name: 'Headless arrow', examine: 'I need to attach arrowtips to this.', stackable: true, value: 1, icon: { shape: 'headless', color: '#eeeeee' } });

// per wood tier: shafts per log, [short lvl, cut xp, string xp], [long lvl, cut xp, string xp], ranged req, ranged attack, max arrow tier
const BOW = [
  [15, [5, 5, 5], [10, 10, 10], 1, 8, 1],
  [30, [20, 16.5, 16.5], [25, 25, 25], 5, 14, 2],
  [45, [35, 33.3, 33.3], [40, 41.5, 41.5], 20, 20, 3],
  [60, [50, 50, 50], [55, 58.3, 58.3], 30, 29, 4],
  [75, [65, 67.5, 67.5], [70, 75, 75], 40, 47, 5],
  [90, [80, 83.3, 83.3], [85, 91.5, 91.5], 50, 69, 6],
];

export const BOWS = [];
for (const w of WOODS) {
  const [shafts, sb, lb, req, atk, maxTier] = BOW[w.tier];
  recipe({ id: `fletch_shafts_${w.log}`, skill: 'fletching', category: 'knife', level: 1, xp: 5, tools: ['knife'], ticks: 3, inputs: [{ id: w.log, qty: 1 }], outputs: [{ id: 'arrow_shaft', qty: shafts }], label: `${shafts} arrow shafts`, verb: 'carve' });
  for (const [kind, [lvl, cutXp, strXp], speed, range] of [['shortbow', sb, 4, 7], ['longbow', lb, 6, 9]]) {
    const id = w.prefix ? `${w.prefix}_${kind}` : kind;
    const name = w.name ? `${w.name} ${kind}` : kind[0].toUpperCase() + kind.slice(1);
    const value = Math.round(30 * Math.pow(2.4, w.tier) * (kind === 'longbow' ? 1.6 : 1));
    item({ id: `${id}_u`, name: `${name} (u)`, examine: 'I need to find a string for this.', value: Math.round(value * 0.6), icon: { shape: 'bow_u', color: w.color } });
    item({
      id, name, examine: `A ${kind === 'longbow' ? 'tall, powerful' : 'nimble'} bow of ${w.name ? w.name.toLowerCase() : 'plain'} wood.`, value,
      slot: 'weapon', twoHanded: true, weaponType: kind, attackSpeed: speed, attackRange: range,
      ammoType: 'arrow', ammoMax: maxTier,
      requirements: { ranged: req }, bonuses: { attackRanged: atk },
      color: w.color, icon: { shape: 'bow', color: w.color }, model: { shape: 'bow', color: w.color },
    });
    recipe({ id: `fletch_${id}_u`, skill: 'fletching', category: 'knife', level: lvl, xp: cutXp, tools: ['knife'], ticks: 3, inputs: [{ id: w.log, qty: 1 }], outputs: [{ id: `${id}_u`, qty: 1 }], verb: 'carve' });
    recipe({ id: `string_${id}`, skill: 'fletching', category: 'string', level: lvl, xp: strXp, ticks: 2, inputs: [{ id: `${id}_u`, qty: 1 }, { id: 'bowstring', qty: 1 }], outputs: [{ id, qty: 1 }], verb: 'string' });
    BOWS.push({ id, kind, wood: w.log, maxTier });
  }
}

// ---- arrows & darts ------------------------------------------------------------------------------------
recipe({ id: 'fletch_headless_arrow', skill: 'fletching', category: 'arrow', level: 1, xp: 1, ticks: 2, batch: 15, inputs: [{ id: 'arrow_shaft', qty: 1 }, { id: 'feather', qty: 1 }], outputs: [{ id: 'headless_arrow', qty: 1 }], verb: 'attach' });

const ARROW_LVL = [1, 15, 30, 45, 60, 75, 90], ARROW_XP = [1.3, 2.5, 5, 7.5, 10, 12.5, 15];
const ARROW_STR = [7, 10, 16, 22, 31, 49, 60], AMMO_REQ = [1, 1, 5, 20, 30, 40, 60];
const ARROW_VAL = [2, 4, 14, 36, 90, 220, 700];
const DART_LVL = [10, 22, 37, 52, 67, 81, 95], DART_XP = [1.8, 3.8, 7.5, 11.2, 15, 18.8, 25];
const DART_STR = [1, 3, 4, 7, 10, 14, 20], DART_VAL = [3, 6, 20, 50, 120, 300, 900];
SMITH_TIERS.forEach((t, k) => {
  const color = METAL_TIERS.find((m) => m.id === t.id)?.color || '#888';
  item({
    id: `${t.id}_arrows`, name: `${t.name} arrows`, examine: `Arrows with ${t.name.toLowerCase()} heads.`, stackable: true, value: ARROW_VAL[k],
    slot: 'ammo', ammoType: 'arrow', ammoLevel: k, requirements: { ranged: AMMO_REQ[k] }, bonuses: { rangedStrength: ARROW_STR[k] },
    color, icon: { shape: 'arrow', color }, model: { shape: 'arrows', color },
  });
  recipe({ id: `fletch_${t.id}_arrows`, skill: 'fletching', category: 'arrow', level: ARROW_LVL[k], xp: ARROW_XP[k], ticks: 2, batch: 15, inputs: [{ id: 'headless_arrow', qty: 1 }, { id: `${t.id}_arrowtips`, qty: 1 }], outputs: [{ id: `${t.id}_arrows`, qty: 1 }], verb: 'attach' });
  item({
    id: `${t.id}_dart`, name: `${t.name} dart`, examine: `A deadly throwing dart with a ${t.name.toLowerCase()} tip.`, stackable: true, value: DART_VAL[k],
    slot: 'weapon', weaponType: 'dart', thrown: true, attackSpeed: 3, attackRange: 3, requirements: { ranged: AMMO_REQ[k] },
    bonuses: { attackRanged: 0, rangedStrength: DART_STR[k] }, color, icon: { shape: 'dart', color }, model: { shape: 'dagger', color },
  });
  recipe({ id: `fletch_${t.id}_dart`, skill: 'fletching', category: 'dart', level: DART_LVL[k], xp: DART_XP[k], ticks: 2, batch: 10, inputs: [{ id: `${t.id}_dart_tips`, qty: 1 }, { id: 'feather', qty: 1 }], outputs: [{ id: `${t.id}_dart`, qty: 1 }], verb: 'attach' });
});
