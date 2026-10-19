// Metal-tier melee equipment for all 7 tiers (bronze .. emberite). OWNER: agent D (D2).
// Ids follow `<tier>_<piece>` (agent C's smithing recipes rely on them).
// Stats follow a classic progression: bronze base stats x per-tier multiplier.
// model: { shape, color, color2 (guard / trim), trim, glow } - trim/glow are drawn by content/visuals.js.

import { registerItem } from '../core/registry.js';
import { METAL_TIERS } from '../core/constants.js';

/** Visual accents per tier: trim colour (edges, guards, crests) and an optional emissive glow. */
export const TIER_STYLE = {
  bronze: { trim: '#6a4220', glow: null },
  iron: { trim: '#3e3b39', glow: null },
  steel: { trim: '#e4e8ec', glow: null },
  duskite: { trim: '#a88ad8', glow: null },
  verdite: { trim: '#e0c050', glow: null },
  azurium: { trim: '#e8f2ff', glow: '#7fd0ff' },
  emberite: { trim: '#ffc040', glow: '#ff7a20' },
};

// Per-tier multipliers (index = tier order).
const WEAPON_MULT = [1, 1.45, 2.1, 3.0, 4.1, 6.3, 7.8];
const ARMOUR_MULT = [1, 1.4, 2.15, 3.05, 4.35, 5.5, 6.9];
const VALUE_MULT = [1, 3.5, 12.5, 32, 80, 200, 500];

const PIECES = {
  // weapons ---------------------------------------------------------------------------------
  dagger: { name: 'dagger', slot: 'weapon', weaponType: 'dagger', speed: 4, value: 10, icon: 'dagger', model: 'dagger', b: { attackStab: 4, attackSlash: 2, attackCrush: -4, strength: 3 }, ex: 'A short, sharp blade.' },
  axe: { name: 'axe', slot: 'weapon', weaponType: 'axe', speed: 5, value: 16, icon: 'axe', model: 'axe', b: { attackStab: -2, attackSlash: 4, attackCrush: 2, strength: 5 }, ex: 'A woodcutter\'s axe.' },
  pickaxe: { name: 'pickaxe', slot: 'weapon', weaponType: 'pickaxe', speed: 5, value: 20, icon: 'pickaxe', model: 'pickaxe', b: { attackStab: 4, attackSlash: -2, attackCrush: 2, strength: 5 }, ex: 'Used for mining.' },
  mace: { name: 'mace', slot: 'weapon', weaponType: 'mace', speed: 4, value: 18, icon: 'mace', model: 'mace', b: { attackStab: 2, attackSlash: -2, attackCrush: 6, strength: 5, prayer: 1 }, ex: 'A spiked mace.' },
  sword: { name: 'sword', slot: 'weapon', weaponType: 'sword', speed: 4, value: 26, icon: 'sword', model: 'sword', b: { attackStab: 4, attackSlash: 3, attackCrush: -1, strength: 5 }, ex: 'A razor-sharp sword.' },
  scimitar: { name: 'scimitar', slot: 'weapon', weaponType: 'scimitar', speed: 4, value: 32, icon: 'scimitar', model: 'scimitar', b: { attackStab: 1, attackSlash: 7, attackCrush: -2, strength: 6 }, ex: 'A vicious, curved sword.' },
  longsword: { name: 'longsword', slot: 'weapon', weaponType: 'longsword', speed: 5, value: 40, icon: 'longsword', model: 'longsword', b: { attackStab: 4, attackSlash: 8, attackCrush: -2, strength: 7 }, ex: 'A long blade with a generous reach.' },
  warhammer: { name: 'warhammer', slot: 'weapon', weaponType: 'warhammer', speed: 6, value: 52, icon: 'warhammer', model: 'warhammer', b: { attackStab: -4, attackSlash: -4, attackCrush: 9, strength: 8 }, ex: 'A heavy hammer built for breaking armour.' },
  battleaxe: { name: 'battleaxe', slot: 'weapon', weaponType: 'axe', speed: 6, value: 52, icon: 'battleaxe', model: 'battleaxe', b: { attackStab: -2, attackSlash: 8, attackCrush: 5, strength: 10 }, ex: 'A vicious double-bladed axe.' },
  twohand_sword: { name: '2h sword', slot: 'weapon', weaponType: 'twohanded', speed: 7, value: 80, icon: 'twohand', model: 'twohanded', twoHanded: true, b: { attackStab: -4, attackSlash: 9, attackCrush: 8, strength: 10 }, ex: 'A massive two-handed sword.' },
  // armour ----------------------------------------------------------------------------------
  med_helm: { name: 'med helm', slot: 'head', value: 24, icon: 'helm', model: 'med_helm', b: { defenceStab: 3, defenceSlash: 4, defenceCrush: 2, defenceMagic: -1, defenceRanged: 3 }, ex: 'A medium-sized helmet.' },
  full_helm: { name: 'full helm', slot: 'head', value: 44, icon: 'tfullhelm', model: 'full_helm', b: { attackMagic: -3, attackRanged: -1, defenceStab: 4, defenceSlash: 5, defenceCrush: 3, defenceMagic: -1, defenceRanged: 4 }, ex: 'A full-face helmet.' },
  sq_shield: { name: 'sq shield', slot: 'shield', value: 48, icon: 'sq_shield', model: 'square', b: { attackMagic: -6, attackRanged: -2, defenceStab: 5, defenceSlash: 6, defenceCrush: 4, defenceMagic: -1, defenceRanged: 5 }, ex: 'A square shield.' },
  kiteshield: { name: 'kiteshield', slot: 'shield', value: 68, icon: 'shield', model: 'kite', b: { attackMagic: -8, attackRanged: -2, defenceStab: 5, defenceSlash: 7, defenceCrush: 6, defenceMagic: -1, defenceRanged: 6 }, ex: 'A large, kite-shaped shield.' },
  chainbody: { name: 'chainbody', slot: 'body', value: 60, icon: 'tchainbody', model: 'chainbody', b: { attackMagic: -15, defenceStab: 7, defenceSlash: 11, defenceCrush: 13, defenceMagic: -3, defenceRanged: 9 }, ex: 'A series of connected metal rings.' },
  platebody: { name: 'platebody', slot: 'body', value: 160, icon: 'tplatebody', model: 'platebody', b: { attackMagic: -30, attackRanged: -10, defenceStab: 15, defenceSlash: 14, defenceCrush: 9, defenceMagic: -6, defenceRanged: 14 }, ex: 'Provides excellent protection.' },
  platelegs: { name: 'platelegs', slot: 'legs', value: 80, icon: 'tlegs', model: 'platelegs', b: { attackMagic: -21, attackRanged: -7, defenceStab: 8, defenceSlash: 7, defenceCrush: 6, defenceMagic: -4, defenceRanged: 7 }, ex: 'These look pretty heavy.' },
  plateskirt: { name: 'plateskirt', slot: 'legs', value: 80, icon: 'tskirt', model: 'skirt', b: { attackMagic: -21, attackRanged: -7, defenceStab: 8, defenceSlash: 7, defenceCrush: 6, defenceMagic: -4, defenceRanged: 7 }, ex: 'Designer leg protection.' },
  boots: { name: 'boots', slot: 'feet', value: 18, icon: 'boots', model: 'boots', b: { defenceStab: 1, defenceSlash: 2, defenceCrush: 3 }, ex: 'Sturdy metal-shod boots.' },
  gloves: { name: 'gauntlets', slot: 'hands', value: 14, icon: 'gloves', model: 'gloves', b: { attackStab: 2, attackSlash: 2, attackCrush: 2, defenceStab: 2, defenceSlash: 2, defenceCrush: 2, defenceMagic: 1, defenceRanged: 2 }, ex: 'Armoured gauntlets.' },
};

// Top-tier weapons carry a special attack (ids from agent A's systems/combat_specials.js).
const EMBER_SPECIALS = {
  dagger: { id: 'twin_fang', cost: 25 }, scimitar: { id: 'hamstring', cost: 50 }, longsword: { id: 'unerring_strike', cost: 25 },
  warhammer: { id: 'shatter', cost: 50 }, battleaxe: { id: 'war_cry', cost: 100 }, twohand_sword: { id: 'whirlwind', cost: 60 },
};

export const METAL_PIECES = Object.keys(PIECES);

/** Scale a bronze stat to tier i (penalties grow slowly, bonuses by the tier multiplier). */
function scale(v, mult, i) {
  if (v <= 0) return Math.round(v * (1 + i * 0.05));
  return Math.max(v, Math.round(v * mult));
}

const EXAMINE_TIER = {
  bronze: '', iron: '', steel: '',
  duskite: ' Forged from dusky violet metal.', verdite: ' The green metal is surprisingly light.',
  azurium: ' The blue metal hums faintly.', emberite: ' It is warm to the touch, as though still in the forge.',
};

METAL_TIERS.forEach((T, i) => {
  const style = TIER_STYLE[T.id];
  for (const [piece, P] of Object.entries(PIECES)) {
    const weapon = P.slot === 'weapon';
    const mult = weapon ? WEAPON_MULT[i] : ARMOUR_MULT[i];
    const bonuses = {};
    for (const [k, v] of Object.entries(P.b)) {
      if (k === 'prayer') bonuses[k] = v + Math.floor(i / 2);
      else if (piece === 'gloves' || piece === 'boots') bonuses[k] = v <= 0 ? v : v + i * (piece === 'gloves' ? 1.5 : 1.3) | 0;
      else bonuses[k] = scale(v, mult, i);
    }
    // the tool pieces get a slightly lower combat profile than the dedicated weapons
    const lvl = T.level;
    const requirements = lvl > 1 ? (weapon ? { attack: lvl } : { defence: lvl }) : {};
    const name = `${T.name} ${P.name}`;
    registerItem({
      id: `${T.id}_${piece}`, name,
      examine: `${P.ex}${EXAMINE_TIER[T.id]}`,
      value: Math.round(P.value * VALUE_MULT[i]),
      slot: P.slot, requirements, bonuses,
      ...(weapon ? { weaponType: P.weaponType, attackSpeed: P.speed, twoHanded: !!P.twoHanded } : {}),
      color: T.color,
      tier: T.id,
      ...(T.id === 'emberite' && EMBER_SPECIALS[piece] ? { special: EMBER_SPECIALS[piece] } : {}),
      icon: { shape: P.icon, color: T.color, color2: style.trim },
      model: { shape: P.model, color: T.color, color2: style.trim, trim: i >= 2 ? style.trim : null, glow: style.glow },
    });
  }
});
