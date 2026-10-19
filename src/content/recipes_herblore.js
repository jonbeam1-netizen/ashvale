// Herblore content: vials, unfinished potions, secondaries and potions (4/3/2/1 doses). OWNER: agent C.
// Grimy/clean herbs are registered by agent B (getData('herb', grimyId) -> {clean, level, xp}).
// Secondaries drop from agent D's monsters; ids are kept plain and readable.
//
// Potion ids: `<potion>_<doses>`, e.g. precision_potion_4. Drinking effects (registerData('potion', id))
// are applied by src/systems/herblore.js.

import { getItem, allData, registerData } from '../core/registry.js';
import { ensureItem, item, recipe } from './recipes_util.js';

ensureItem({ id: 'vial', name: 'Vial', examine: 'An empty glass vial.', value: 2, doses: 0, icon: { shape: 'flask', color: '#c8e0f0' } });
item({ id: 'vial_of_water', name: 'Vial of water', examine: 'A glass vial containing water.', value: 3, doses: 4, icon: { shape: 'flask', color: '#6aa0e0' } });
item({ id: 'pestle_and_mortar', name: 'Pestle and mortar', examine: 'Used for grinding ingredients.', value: 4, icon: { shape: 'pestle' } });

// ---- secondaries --------------------------------------------------------------------------------------
const SEC = [
  ['beetle_shell', 'Beetle shell', 'A glossy shell from a cave beetle.', 'gem', '#3a5a3a', 6],
  ['wolf_fang', 'Wolf fang', 'A long, cruel fang.', 'bones', '#e8e0c8', 12],
  ['rat_tail', 'Rat tail', 'Long, pink and slightly twitchy.', 'string', '#d89a9a', 8],
  ['golem_dust', 'Golem dust', 'Fine grey dust that crackles faintly.', 'lump', '#9a948a', 20],
  ['grave_dust', 'Grave dust', 'Dust scraped from an old tomb.', 'lump', '#6a6258', 25],
  ['imp_horn', 'Imp horn', 'A small, twisted horn.', 'bones', '#8a2a1a', 30],
  ['gloom_spores', 'Gloom spores', 'They glow a sickly violet.', 'seed', '#8a5ac8', 60],
  ['bat_wing', 'Bat wing', 'Leathery and thin.', 'feather', '#4a3a3a', 40],
  ['frost_lichen', 'Frost lichen', 'A pale lichen that only grows in bitter cold.', 'herb', '#c8e8f0', 80],
  ['wyrm_scale', 'Wyrm scale', 'A heavy scale. Grind it before use.', 'gem', '#5a5a62', 120],
  ['wyrm_scale_dust', 'Wyrm scale dust', 'Finely ground wyrm scale.', 'lump', '#7a7a84', 130],
];
for (const [id, name, examine, shape, color, value] of SEC) ensureItem({ id, name, examine, value, stackable: false, icon: { shape, color } });
recipe({ id: 'grind_wyrm_scale', skill: 'herblore', category: 'grind', level: 1, xp: 0, tools: ['pestle_and_mortar'], ticks: 2, inputs: [{ id: 'wyrm_scale', qty: 1 }], outputs: [{ id: 'wyrm_scale_dust', qty: 1 }], verb: 'grind' });

// ---- herbs (cleaning data from agent B; fall back to our own table) ------------------------------------------
export const HERB_INFO = {}; // clean id -> {grimy, level, xp, color, name}
for (const [grimy, d] of allData('herb')) {
  const def = getItem(d.clean);
  HERB_INFO[d.clean] = { grimy, level: d.level, xp: d.xp, name: def?.name || d.clean, color: def?.icon?.color || '#4a9a3a' };
}

// unfinished potions: vial of water + clean herb. level = herb's cleaning level (min 1).
for (const [herb, h] of Object.entries(HERB_INFO)) {
  item({ id: `${herb}_potion_unf`, name: `${h.name} potion (unf)`, examine: 'I need another ingredient to finish this potion.', value: Math.max(3, Math.round((getItem(herb)?.value || 10) * 1.1)), doses: 4, icon: { shape: 'flask', color: h.color } });
  recipe({ id: `unf_${herb}`, skill: 'herblore', category: 'unf', level: Math.max(1, h.level), xp: 0, ticks: 2, inputs: [{ id: 'vial_of_water', qty: 1 }, { id: herb, qty: 1 }], outputs: [{ id: `${herb}_potion_unf`, qty: 1 }], verb: 'mix', message: `You put the ${h.name.toLowerCase()} into the vial of water.` });
}

// ---- potions -----------------------------------------------------------------------------------------------
// effect kinds (see systems/herblore.js): boost {skills, base, pct}, drain, restore {skills, base, pct}, heal {base, pct},
// energy (run energy %), antidote (immunity ticks), prayer {base, pct}
export const POTIONS = [
  { id: 'precision_potion', name: 'Precision potion', herb: 'sagewort', sec: 'beetle_shell', level: 3, xp: 25, color: '#40a0e0', effects: [{ boost: ['attack'], base: 3, pct: 0.1 }], desc: 'boosts Attack' },
  { id: 'antidote', name: 'Antidote', herb: 'bitterleaf', sec: 'spider_silk', level: 5, xp: 37.5, color: '#e0e0a0', effects: [{ antidote: 150 }], desc: 'cures poison' },
  { id: 'might_potion', name: 'Might potion', herb: 'marshmint', sec: 'wolf_fang', level: 12, xp: 50, color: '#e05040', effects: [{ boost: ['strength'], base: 3, pct: 0.1 }], desc: 'boosts Strength' },
  { id: 'restoration_potion', name: 'Restoration potion', herb: 'marshmint', sec: 'ashes', level: 22, xp: 62.5, color: '#e080c0', effects: [{ restore: ['attack', 'strength', 'defence', 'ranged', 'magic'], base: 10, pct: 0.3 }], desc: 'restores lowered combat stats' },
  { id: 'vigour_potion', name: 'Vigour potion', herb: 'emberroot', sec: 'rat_tail', level: 26, xp: 67.5, color: '#f0c040', effects: [{ energy: 20 }], desc: 'restores run energy' },
  { id: 'warding_potion', name: 'Warding potion', herb: 'emberroot', sec: 'golem_dust', level: 30, xp: 75, color: '#50c060', effects: [{ boost: ['defence'], base: 3, pct: 0.1 }], desc: 'boosts Defence' },
  { id: 'devotion_potion', name: 'Devotion potion', herb: 'silverthistle', sec: 'grave_dust', level: 38, xp: 87.5, color: '#40d0c0', effects: [{ prayer: true, base: 7, pct: 0.25 }], desc: 'restores Prayer points' },
  { id: 'greater_precision', name: 'Greater precision potion', herb: 'duskbloom', sec: 'imp_horn', level: 45, xp: 100, color: '#2060c0', effects: [{ boost: ['attack'], base: 5, pct: 0.15 }], desc: 'greatly boosts Attack' },
  { id: 'greater_might', name: 'Greater might potion', herb: 'starpetal', sec: 'giant_tooth', level: 55, xp: 125, color: '#b02020', effects: [{ boost: ['strength'], base: 5, pct: 0.15 }], desc: 'greatly boosts Strength' },
  { id: 'renewal_potion', name: 'Renewal potion', herb: 'starpetal', sec: 'gloom_spores', level: 63, xp: 142.5, color: '#c060e0', effects: [{ restore: ['attack', 'strength', 'defence', 'ranged', 'magic', 'agility', 'herblore', 'thieving', 'crafting', 'fletching', 'slayer', 'hunter', 'mining', 'smithing', 'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming', 'runebinding', 'construction'], base: 8, pct: 0.25 }, { prayer: true, base: 8, pct: 0.25 }], desc: 'restores all stats and Prayer' },
  { id: 'greater_warding', name: 'Greater warding potion', herb: 'frostcap', sec: 'shell_fragment', level: 66, xp: 150, color: '#208030', effects: [{ boost: ['defence'], base: 5, pct: 0.15 }], desc: 'greatly boosts Defence' },
  { id: 'marksman_potion', name: 'Marksman potion', herb: 'wyrmtongue', sec: 'bat_wing', level: 72, xp: 162.5, color: '#3ab0b0', effects: [{ boost: ['ranged'], base: 4, pct: 0.1 }], desc: 'boosts Ranged' },
  { id: 'focus_potion', name: 'Focus potion', herb: 'wyrmtongue', sec: 'frost_lichen', level: 76, xp: 172.5, color: '#8080f0', effects: [{ boost: ['magic'], base: 4, pct: 0 }], desc: 'boosts Magic' },
  { id: 'bulwark_brew', name: 'Bulwark brew', herb: 'ghostlily', sec: 'wyrm_scale_dust', level: 81, xp: 180, color: '#e8d870', effects: [{ heal: true, base: 2, pct: 0.15, over: true }, { boost: ['defence'], base: 2, pct: 0.2 }, { drain: ['attack', 'strength', 'ranged', 'magic'], base: 2, pct: 0.1 }], desc: 'heals and boosts Defence, but weakens offence' },
  { id: 'champion_potion', name: 'Champion potion', combo: ['greater_precision_4', 'greater_might_4', 'greater_warding_4'], herbClean: 'ghostlily', level: 90, xp: 150, color: '#307a40', effects: [{ boost: ['attack', 'strength', 'defence'], base: 5, pct: 0.15 }], desc: 'greatly boosts Attack, Strength and Defence' },
];

for (const p of POTIONS) {
  for (let d = 4; d >= 1; d--) {
    item({
      id: `${p.id}_${d}`, name: `${p.name}(${d})`, examine: `${d} dose${d > 1 ? 's' : ''} of ${p.name.toLowerCase()}. It ${p.desc}.`,
      value: Math.round(p.level * 4 * d + 10), doses: d, options: ['Drink', 'Empty'], potion: p.id, icon: { shape: 'flask', color: p.color },
    });
    registerData('potion', `${p.id}_${d}`, { potion: p.id, doses: d, next: d > 1 ? `${p.id}_${d - 1}` : 'vial', effects: p.effects, name: p.name });
  }
  if (p.combo) {
    recipe({ id: `brew_${p.id}`, skill: 'herblore', category: 'potion', level: p.level, xp: p.xp, ticks: 2, inputs: [...p.combo.map((id) => ({ id, qty: 1 })), { id: p.herbClean, qty: 1 }], outputs: [{ id: `${p.id}_4`, qty: 1 }, { id: 'vial', qty: 2 }], verb: 'mix' });
  } else {
    recipe({ id: `brew_${p.id}`, skill: 'herblore', category: 'potion', level: p.level, xp: p.xp, ticks: 2, inputs: [{ id: `${p.herb}_potion_unf`, qty: 1 }, { id: p.sec, qty: 1 }], outputs: [{ id: `${p.id}_3`, qty: 1 }], verb: 'mix' });
  }
}
