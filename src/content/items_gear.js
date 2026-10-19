// Magic gear, misc equipment, boss/elite uniques and monster remains. OWNER: agent D (D2).
//
// Extra item fields used here (read by other systems):
//   providesSigil: 'wind_sigil'      - staff supplies unlimited sigils of that kind (agent A)
//   special: { cost, id }            - special attack (agent A's ids, see systems/combat_specials.js)
//   antiDragonfire: true             - shield that blocks most dragonfire (agent A)
//   poisonous: true                  - weapon may poison on hit (agent A)
//   wildernessOnly: true             - only obtainable in the Wilderness (informational)
//   unique: 'boss_id'                - which boss/elite drops it (informational)
// model: { shape, color, color2, trim, glow } - trim/glow are rendered by content/visuals.js.

import { registerItem } from '../core/registry.js';

const eq = (def) => registerItem({ ...def, model: { color: def.color, ...(def.model || {}) } });

// =================================================================================================
// Magic: staves, battlestaves, wands
// =================================================================================================
const ELEMENTS = [
  { el: 'wind', name: 'Wind', sigil: 'wind_sigil', color: '#dfeeff' },
  { el: 'water', name: 'Water', sigil: 'water_sigil', color: '#3a80ff' },
  { el: 'earth', name: 'Earth', sigil: 'earth_sigil', color: '#8a5a2a' },
  { el: 'fire', name: 'Fire', sigil: 'fire_sigil', color: '#ff5020' },
];
const STAFF_WOOD = '#6a4a2a';

eq({ id: 'apprentice_staff', name: 'Apprentice staff', examine: 'A simple staff for budding mages.', value: 15, slot: 'weapon', weaponType: 'staff', attackSpeed: 5, twoHanded: true,
  bonuses: { attackCrush: 7, attackMagic: 4, defenceStab: 2, defenceSlash: 3, defenceCrush: 1, defenceMagic: 4, strength: 7 },
  color: STAFF_WOOD, icon: { shape: 'staff', color: STAFF_WOOD, color2: '#c8c0a0' }, model: { shape: 'staff', color: '#c8c0a0' } });
eq({ id: 'mages_staff', name: "Mage's staff", examine: 'A sturdy staff carved with arcane runes.', value: 200, slot: 'weapon', weaponType: 'staff', attackSpeed: 5, twoHanded: true,
  requirements: { magic: 10 }, bonuses: { attackCrush: 10, attackMagic: 10, defenceStab: 2, defenceSlash: 3, defenceCrush: 1, defenceMagic: 10, strength: 7 },
  color: '#3a2a1a', icon: { shape: 'staff', color: '#3a2a1a', color2: '#9a60e0' }, model: { shape: 'staff', color: '#9a60e0', glow: '#b080ff' } });

for (const E of ELEMENTS) {
  eq({ id: `staff_of_${E.el}`, name: `Staff of ${E.name.toLowerCase()}`, examine: `A staff that channels unlimited ${E.name.toLowerCase()} sigils.`, value: 1500,
    slot: 'weapon', weaponType: 'staff', attackSpeed: 5, twoHanded: true, providesSigil: E.sigil,
    bonuses: { attackCrush: 7, attackMagic: 10, defenceStab: 2, defenceSlash: 3, defenceCrush: 1, defenceMagic: 10, strength: 7 },
    color: STAFF_WOOD, icon: { shape: 'staff', color: STAFF_WOOD, color2: E.color }, model: { shape: 'staff', color: E.color } });
  eq({ id: `${E.el}_battlestaff`, name: `${E.name} battlestaff`, examine: `A battle-hardened staff bound with ${E.name.toLowerCase()} power.`, value: 7000,
    slot: 'weapon', weaponType: 'staff', attackSpeed: 5, twoHanded: true, providesSigil: E.sigil, requirements: { magic: 30, attack: 30 },
    bonuses: { attackStab: 10, attackCrush: 35, attackMagic: 12, defenceStab: 2, defenceSlash: 3, defenceCrush: 1, defenceMagic: 12, strength: 35 },
    color: '#4a4a52', icon: { shape: 'staff', color: '#4a4a52', color2: E.color }, model: { shape: 'staff', color: E.color, glow: E.color } });
  eq({ id: `arcane_${E.el}_staff`, name: `Arcane ${E.name.toLowerCase()} staff`, examine: `A masterwork staff overflowing with ${E.name.toLowerCase()} energy.`, value: 42000,
    slot: 'weapon', weaponType: 'staff', attackSpeed: 5, twoHanded: true, providesSigil: E.sigil, requirements: { magic: 40, attack: 40 },
    bonuses: { attackStab: 10, attackCrush: 40, attackMagic: 14, defenceStab: 2, defenceSlash: 3, defenceCrush: 1, defenceMagic: 14, strength: 40, magicDamage: 2 },
    color: '#2a2a3a', icon: { shape: 'staff', color: '#2a2a3a', color2: E.color }, model: { shape: 'staff', color: E.color, color2: '#d8c060', glow: E.color } });
}
eq({ id: 'starwood_staff', name: 'Starwood staff', examine: 'Cut from a starwood bough, it glitters with captured light.', value: 90000,
  slot: 'weapon', weaponType: 'staff', attackSpeed: 5, twoHanded: true, requirements: { magic: 50 },
  bonuses: { attackCrush: 10, attackMagic: 18, defenceMagic: 18, defenceStab: 3, defenceSlash: 4, defenceCrush: 2, strength: 10, magicDamage: 5 },
  color: '#4a4060', icon: { shape: 'staff', color: '#4a4060', color2: '#4fd0d8' }, model: { shape: 'staff', color: '#4fd0d8', glow: '#9ff8ff' } });

const wand = (id, name, lvl, mag, dmg, value, color, glow) => eq({ id, name, examine: 'A slender wand that focuses spells.', value, slot: 'weapon', weaponType: 'staff', attackSpeed: 4,
  requirements: lvl > 1 ? { magic: lvl } : {}, bonuses: { attackMagic: mag, defenceMagic: Math.floor(mag / 2), magicDamage: dmg },
  color, icon: { shape: 'wand', color, color2: glow }, model: { shape: 'wand', color, color2: glow, glow: lvl >= 40 ? glow : null } });
wand('apprentice_wand', 'Apprentice wand', 1, 6, 0, 120, '#8a6a40', '#d8d0a0');
wand('adept_wand', 'Adept wand', 25, 10, 1, 1800, '#5a3a6a', '#d080ff');
wand('master_wand', 'Master wand', 50, 18, 4, 60000, '#2a2a3a', '#70e0ff');

// =================================================================================================
// Mage robes (4 tiers) + wizard hats
// =================================================================================================
const ROBES = [
  { id: 'apprentice', name: 'Apprentice', lvl: 1, top: '#2a4aa8', trim: '#e8d880', mag: 1, value: 1 },
  { id: 'conjurer', name: "Conjurer's", lvl: 20, top: '#3a7a5a', trim: '#e8e8e0', mag: 2, value: 12 },
  { id: 'thaumaturge', name: "Thaumaturge's", lvl: 40, top: '#6a2a7a', trim: '#e0b040', mag: 3.2, value: 90 },
  { id: 'astral', name: 'Astral', lvl: 60, top: '#1a1e3a', trim: '#9fd8ff', mag: 4.5, value: 600, glow: '#9fd8ff' },
];
for (const R of ROBES) {
  const req = R.lvl > 1 ? { magic: R.lvl, defence: Math.floor(R.lvl / 2) } : {};
  const m = (v) => Math.round(v * R.mag);
  const base = { trim: R.trim, glow: R.glow || null, color2: R.trim };
  eq({ id: `${R.id}_hat`, name: `${R.name} hat`, examine: 'A pointed hat that sharpens the mind.', value: 20 * R.value, slot: 'head', requirements: req,
    bonuses: { attackMagic: m(3), defenceMagic: m(3), defenceStab: R.lvl >= 40 ? 2 : 0, defenceSlash: R.lvl >= 40 ? 2 : 0 },
    color: R.top, icon: { shape: 'hat', color: R.top }, model: { shape: 'wizard_hat', ...base } });
  eq({ id: `${R.id}_robe_top`, name: `${R.name} robe top`, examine: 'Flowing robes woven with protective glyphs.', value: 60 * R.value, slot: 'body', requirements: req,
    bonuses: { attackMagic: m(5), defenceMagic: m(5), defenceStab: m(1), defenceSlash: m(1), defenceCrush: m(1), magicDamage: R.lvl >= 40 ? Math.floor(R.lvl / 20) : 0 },
    color: R.top, icon: { shape: 'robe_top', color: R.top }, model: { shape: 'robe_top', ...base } });
  eq({ id: `${R.id}_robe_bottom`, name: `${R.name} robe bottom`, examine: 'A long, comfortable robe skirt.', value: 40 * R.value, slot: 'legs', requirements: req,
    bonuses: { attackMagic: m(4), defenceMagic: m(4), defenceStab: m(1), defenceSlash: m(1) },
    color: R.top, icon: { shape: 'skirt', color: R.top }, model: { shape: 'robe', ...base } });
  eq({ id: `${R.id}_gloves`, name: `${R.name} gloves`, examine: 'Soft gloves for nimble spellcasting.', value: 10 * R.value, slot: 'hands', requirements: req,
    bonuses: { attackMagic: m(2), defenceMagic: m(2) }, color: R.top, icon: { shape: 'gloves', color: R.top } });
  eq({ id: `${R.id}_boots`, name: `${R.name} boots`, examine: 'Light boots with soft soles.', value: 10 * R.value, slot: 'feet', requirements: req,
    bonuses: { attackMagic: m(2), defenceMagic: m(2) }, color: R.top, icon: { shape: 'boots', color: R.top } });
}
eq({ id: 'wizard_hat_black', name: 'Black wizard hat', examine: 'A hat favoured by hedge wizards of dubious morals.', value: 4, slot: 'head',
  bonuses: { attackMagic: 2, defenceMagic: 2 }, color: '#22222a', icon: { shape: 'hat', color: '#22222a' }, model: { shape: 'wizard_hat' } });
eq({ id: 'wizard_hat_red', name: 'Red wizard hat', examine: 'A bright red wizard hat.', value: 4, slot: 'head',
  bonuses: { attackMagic: 2, defenceMagic: 2 }, color: '#a82a2a', icon: { shape: 'hat', color: '#a82a2a' }, model: { shape: 'wizard_hat' } });
eq({ id: 'cultist_hood', name: 'Ashcult hood', examine: 'A soot-grey hood worn by the Ashcult.', value: 30, slot: 'head',
  bonuses: { attackMagic: 3, defenceMagic: 3, prayer: 1 }, color: '#4a4440', icon: { shape: 'hood', color: '#4a4440' }, model: { shape: 'hood' } });
eq({ id: 'cultist_robe_top', name: 'Ashcult robe top', examine: 'Smells of smoke and secrets.', value: 45, slot: 'body',
  bonuses: { attackMagic: 4, defenceMagic: 4, prayer: 2 }, color: '#4a4440', icon: { shape: 'robe_top', color: '#4a4440' }, model: { shape: 'robe_top', trim: '#a02a1a', color2: '#a02a1a' } });
eq({ id: 'cultist_robe_bottom', name: 'Ashcult robe bottom', examine: 'A long soot-grey robe.', value: 35, slot: 'legs',
  bonuses: { attackMagic: 3, defenceMagic: 3, prayer: 2 }, color: '#4a4440', icon: { shape: 'skirt', color: '#4a4440' }, model: { shape: 'robe', trim: '#a02a1a' } });

// =================================================================================================
// Misc wearables
// =================================================================================================
const cape = (id, name, examine, value, c1, c2, bonuses = {}, extra = {}) => {
  const { model, ...rest } = extra;
  return eq({ id, name, examine, value, slot: 'cape', bonuses, color: c1, icon: { shape: 'cape', color: c1, color2: c2 }, ...rest, model: { color: c1, color2: c2, ...(model || {}) } });
};
cape('cape_red', 'Red cape', 'A bold red cape.', 2, '#a82a2a', null, { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 });
cape('cape_blue', 'Blue cape', 'A deep blue cape.', 2, '#2a4aa8', null, { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 });
cape('cape_green', 'Green cape', 'A forest-green cape.', 2, '#2a7a3a', null, { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 });
cape('cape_black', 'Black cape', 'A cape as dark as a moonless night.', 2, '#202024', null, { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 });
cape('highmarch_cape', 'Highmarch cape', 'Worn by the knights of Highmarch.', 400, '#2a3a6a', '#e0c050', { defenceStab: 3, defenceSlash: 3, defenceCrush: 3, defenceMagic: 2, defenceRanged: 3, prayer: 1 });
eq({ id: 'iron_tiara', name: 'Plain circlet', examine: 'A simple metal circlet.', value: 50, slot: 'head', bonuses: { defenceMagic: 1 }, color: '#a0a0a8', icon: { shape: 'ring', color: '#a0a0a8', color2: '#a0a0a8' }, model: { shape: 'med_helm' } });
eq({ id: 'guard_helm', name: 'Guard helm', examine: 'Standard issue for the town watch.', value: 120, slot: 'head', requirements: { defence: 5 },
  bonuses: { defenceStab: 5, defenceSlash: 6, defenceCrush: 4, defenceRanged: 5 }, color: '#8a8a92', icon: { shape: 'helm', color: '#8a8a92' }, model: { shape: 'med_helm', trim: '#a82a2a' } });
eq({ id: 'wyrmward_shield', name: 'Wyrmward shield', examine: 'Its scaled face deflects most dragonfire.', value: 220, slot: 'shield', antiDragonfire: true, requirements: { defence: 1 },
  bonuses: { attackMagic: -10, attackRanged: -2, defenceStab: 7, defenceSlash: 9, defenceCrush: 8, defenceMagic: 2, defenceRanged: 7 },
  color: '#5a5a62', icon: { shape: 'shield', color: '#5a5a62', color2: '#c8382a' }, model: { shape: 'kite', color2: '#c8382a', trim: '#c8382a' } });

// =================================================================================================
// Uniques (boss / elite / slayer drops)
// =================================================================================================
// -- weapons
eq({ id: 'warlords_cleaver', name: "Warlord's cleaver", examine: "Grubnak's notched cleaver. Somehow still sharp.", value: 9000, unique: 'grubnak_warlord',
  slot: 'weapon', weaponType: 'axe', attackSpeed: 5, requirements: { attack: 30, strength: 30 }, special: { cost: 50, id: 'whirlwind' },
  bonuses: { attackStab: -2, attackSlash: 26, attackCrush: 18, strength: 30 },
  color: '#5a5048', icon: { shape: 'battleaxe', color: '#5a5048', color2: '#a02a1a' }, model: { shape: 'battleaxe', color2: '#a02a1a', trim: '#a02a1a' } });
eq({ id: 'saltreaver_cutlass', name: 'Saltreaver cutlass', examine: 'A corsair captain\'s blade, pitted by sea-spray.', value: 32000, unique: 'corsair_captain',
  slot: 'weapon', weaponType: 'scimitar', attackSpeed: 4, requirements: { attack: 45 }, special: { cost: 50, id: 'twin_fang' },
  bonuses: { attackStab: 8, attackSlash: 46, attackCrush: -2, strength: 42 },
  color: '#c8d0d4', icon: { shape: 'scimitar', color: '#c8d0d4', color2: '#d8a830' }, model: { shape: 'scimitar', color2: '#d8a830' } });
eq({ id: 'graven_maul', name: 'Graven maul', examine: 'Carved from the Graven King\'s own stone fist.', value: 54000, unique: 'graven_king',
  slot: 'weapon', weaponType: 'warhammer', attackSpeed: 7, twoHanded: true, requirements: { strength: 50 }, special: { cost: 60, id: 'shatter' },
  bonuses: { attackCrush: 72, attackStab: -4, attackSlash: -4, strength: 80, defenceCrush: 6 },
  color: '#7a756c', icon: { shape: 'warhammer', color: '#7a756c', color2: '#60e0ff' }, model: { shape: 'maul', color2: '#60e0ff', glow: '#60e0ff' } });
eq({ id: 'mirecaller_staff', name: 'Mirecaller staff', examine: 'Bog-water endlessly drips from its tip.', value: 60000, unique: 'bog_matriarch',
  slot: 'weapon', weaponType: 'staff', attackSpeed: 5, twoHanded: true, providesSigil: 'water_sigil', requirements: { magic: 55 },
  bonuses: { attackCrush: 15, attackMagic: 20, defenceMagic: 20, defenceStab: 3, defenceSlash: 3, strength: 15, magicDamage: 6 },
  color: '#3a4a2a', icon: { shape: 'staff', color: '#3a4a2a', color2: '#4ad0a0' }, model: { shape: 'staff', color: '#4ad0a0', glow: '#4ad0a0' } });
eq({ id: 'skitterfang', name: 'Skitterfang', examine: 'A dagger made from the fang of Mother Skitterlace. It drips venom.', value: 80000, unique: 'mother_skitterlace', poisonous: true,
  slot: 'weapon', weaponType: 'dagger', attackSpeed: 4, requirements: { attack: 60 }, special: { cost: 25, id: 'venom_rend' },
  bonuses: { attackStab: 50, attackSlash: 30, attackCrush: -4, strength: 48, defenceStab: 2 },
  color: '#d8d0b0', icon: { shape: 'dagger', color: '#d8d0b0', color2: '#60a020' }, model: { shape: 'dagger', color2: '#60a020', glow: '#80ff40' } });
eq({ id: 'lich_sceptre', name: 'Sceptre of the Calder Lich', examine: 'Cold fire burns within its skull-shaped head.', value: 220000, unique: 'calder_lich', wildernessOnly: true,
  slot: 'weapon', weaponType: 'staff', attackSpeed: 5, requirements: { magic: 70 }, special: { cost: 50, id: 'soul_harvest' },
  bonuses: { attackCrush: 12, attackMagic: 28, defenceMagic: 24, defenceStab: 4, defenceSlash: 4, strength: 10, magicDamage: 12, prayer: 3 },
  color: '#3a3a44', icon: { shape: 'staff', color: '#3a3a44', color2: '#7aff9a' }, model: { shape: 'sceptre', color2: '#e6e0cc', glow: '#7aff9a' } });
eq({ id: 'cinderbrand', name: 'Cinderbrand', examine: 'A colossal blade that never stops smouldering.', value: 260000, unique: 'cinder_colossus', wildernessOnly: true,
  slot: 'weapon', weaponType: 'twohanded', attackSpeed: 7, twoHanded: true, requirements: { attack: 70, strength: 60 }, special: { cost: 60, id: 'war_cry' },
  bonuses: { attackSlash: 110, attackCrush: 90, attackStab: -4, strength: 116 },
  color: '#3a2a26', icon: { shape: 'twohand', color: '#3a2a26', color2: '#ff7a20' }, model: { shape: 'twohanded', color2: '#ff9a40', glow: '#ff6a10' } });
eq({ id: 'frostmaw_fang', name: "Frostmaw's fang", examine: 'A spear tipped with a tooth of the elder wyrm. Frost creeps along the shaft.', value: 300000, unique: 'frostmaw', wildernessOnly: true,
  slot: 'weapon', weaponType: 'spear', attackSpeed: 5, requirements: { attack: 75 }, special: { cost: 50, id: 'hamstring' },
  bonuses: { attackStab: 98, attackSlash: 90, attackCrush: 90, strength: 98, defenceStab: 5, defenceSlash: 5, defenceCrush: 5 },
  color: '#e8f4ff', icon: { shape: 'spear', color: '#bfe8ff' }, model: { shape: 'spear', color2: '#5a6a7a', glow: '#a0e8ff' } });
eq({ id: 'umbral_edge', name: 'Umbral edge', examine: 'Varrath\'s blade. It drinks the light around it.', value: 400000, unique: 'varrath_gloom_tyrant',
  slot: 'weapon', weaponType: 'longsword', attackSpeed: 5, requirements: { attack: 75 }, special: { cost: 50, id: 'soul_harvest' },
  bonuses: { attackStab: 70, attackSlash: 96, attackCrush: -2, strength: 96 },
  color: '#2a1e3a', icon: { shape: 'longsword', color: '#3a2a5a', color2: '#b040ff' }, model: { shape: 'longsword', color2: '#b040ff', glow: '#b040ff' } });
eq({ id: 'voidlash_rapier', name: 'Voidlash rapier', examine: 'Whisper-thin and impossibly fast.', value: 150000, unique: 'void_stalker',
  slot: 'weapon', weaponType: 'sword', attackSpeed: 4, requirements: { attack: 70 }, special: { cost: 50, id: 'unerring_strike' },
  bonuses: { attackStab: 82, attackSlash: 60, strength: 82 },
  color: '#1a1a2a', icon: { shape: 'sword', color: '#3a3a6a', color2: '#7a40ff' }, model: { shape: 'longsword', color: '#2a2a4a', color2: '#7a40ff', glow: '#9a70ff' } });
eq({ id: 'umbral_longbow', name: 'Umbral longbow', examine: 'Strung with the sinew of an umbral beast.', value: 180000, unique: 'umbral_beast',
  slot: 'weapon', weaponType: 'bow', attackSpeed: 5, twoHanded: true, requirements: { ranged: 70 }, special: { cost: 55, id: 'twin_shot' },
  bonuses: { attackRanged: 80, rangedStrength: 10 },
  color: '#2a2030', icon: { shape: 'bow', color: '#3a2a4a' }, model: { shape: 'bow', glow: '#a060ff' } });
eq({ id: 'rotlight_wand', name: 'Rotlight wand', examine: 'A sickly green light wavers at its tip.', value: 90000, unique: 'rot_specter',
  slot: 'weapon', weaponType: 'staff', attackSpeed: 4, requirements: { magic: 65 },
  bonuses: { attackMagic: 22, defenceMagic: 10, magicDamage: 8 },
  color: '#3a4a2a', icon: { shape: 'wand', color: '#4a5a3a', color2: '#a0ff60' }, model: { shape: 'wand', color: '#4a5a3a', color2: '#a0ff60', glow: '#a0ff60' } });
eq({ id: 'reaver_axe', name: "Reaver's axe", examine: 'Taken from the ash-choked hands of a revenant.', value: 120000, unique: 'ash_revenant', wildernessOnly: true,
  slot: 'weapon', weaponType: 'axe', attackSpeed: 6, requirements: { attack: 65 }, special: { cost: 50, id: 'whirlwind' },
  bonuses: { attackStab: -2, attackSlash: 80, attackCrush: 60, strength: 92 },
  color: '#3a3430', icon: { shape: 'battleaxe', color: '#4a4440', color2: '#c04020' }, model: { shape: 'battleaxe', color2: '#c04020', glow: '#ff5020' } });

// -- armour / shields
eq({ id: 'frostmaw_aegis', name: 'Frostmaw aegis', examine: 'Scales of the elder wyrm, fused into a shield. Dragonfire barely warms it.', value: 350000, unique: 'frostmaw', wildernessOnly: true,
  slot: 'shield', antiDragonfire: true, requirements: { defence: 75 },
  bonuses: { attackMagic: -6, attackRanged: -2, defenceStab: 70, defenceSlash: 72, defenceCrush: 66, defenceMagic: 20, defenceRanged: 70, prayer: 2 },
  color: '#bfe8ff', icon: { shape: 'shield', color: '#bfe8ff', color2: '#5a8ab0' }, model: { shape: 'kite', color2: '#5a8ab0', trim: '#ffffff', glow: '#a0e8ff' } });
eq({ id: 'ashen_crown', name: 'Ashen crown', examine: 'A crown of fused cinder, pried from the Cinder Colossus.', value: 140000, unique: 'cinder_colossus', wildernessOnly: true,
  slot: 'head', requirements: { defence: 65 },
  bonuses: { attackStab: 3, attackSlash: 3, attackCrush: 3, defenceStab: 40, defenceSlash: 42, defenceCrush: 38, defenceMagic: -1, defenceRanged: 40, strength: 4 },
  color: '#3a2a26', icon: { shape: 'fullhelm', color: '#3a2a26' }, model: { shape: 'full_helm', trim: '#ff9a40', glow: '#ff6a10' } });
eq({ id: 'glarehorn_helm', name: 'Glarehorn helm', examine: 'A helm crowned with a glarehorn\'s horn.', value: 50000, unique: 'glarehorn_lizard',
  slot: 'head', requirements: { defence: 55 },
  bonuses: { defenceStab: 31, defenceSlash: 29, defenceCrush: 34, defenceRanged: 30, strength: 3, prayer: 1 },
  color: '#6a7a5a', icon: { shape: 'fullhelm', color: '#6a7a5a' }, model: { shape: 'full_helm', trim: '#e8e0c8', crest: '#e8e0c8' } });
eq({ id: 'grotesque_gauntlets', name: 'Grotesque gauntlets', examine: 'Heavy stone gauntlets that hit like a landslide.', value: 60000, unique: 'stone_grotesque',
  slot: 'hands', requirements: { defence: 60, strength: 60 },
  bonuses: { attackStab: 6, attackSlash: 6, attackCrush: 10, defenceStab: 8, defenceSlash: 8, defenceCrush: 8, defenceRanged: 6, strength: 9 },
  color: '#7a7a72', icon: { shape: 'gloves', color: '#7a7a72' } });
eq({ id: 'hollowsteel_boots', name: 'Hollowsteel boots', examine: 'They make no sound at all.', value: 45000, unique: 'hollow_reaver',
  slot: 'feet', requirements: { defence: 60 },
  bonuses: { defenceStab: 12, defenceSlash: 14, defenceCrush: 16, defenceMagic: 2, defenceRanged: 8, strength: 4 },
  color: '#3a3a4a', icon: { shape: 'boots', color: '#3a3a4a' } });
eq({ id: 'skittersilk_robe', name: 'Skittersilk robe', examine: 'Spider silk spun into a shimmering robe.', value: 70000, unique: 'mother_skitterlace',
  slot: 'body', requirements: { magic: 60, defence: 30 },
  bonuses: { attackMagic: 24, defenceMagic: 24, defenceStab: 8, defenceSlash: 8, defenceCrush: 6, magicDamage: 4 },
  color: '#d8d4e0', icon: { shape: 'robe_top', color: '#d8d4e0' }, model: { shape: 'robe_top', trim: '#9a80c0', color2: '#9a80c0' } });

// -- capes
cape('ember_mantle', 'Ember mantle', 'A cape woven from the Colossus\'s smouldering hide.', 90000, '#4a1a10', '#ff7a20',
  { attackStab: 2, attackSlash: 2, attackCrush: 2, defenceStab: 8, defenceSlash: 8, defenceCrush: 8, defenceMagic: 6, defenceRanged: 8, strength: 4, prayer: 2 },
  { unique: 'cinder_colossus', wildernessOnly: true, requirements: { defence: 60 }, model: { glow: '#ff7a20' } });
cape('reavers_cloak', "Reaver's cloak", 'Tattered, ash-stained and oddly reassuring.', 15000, '#3a3430', '#8a1a1a',
  { attackStab: 2, attackSlash: 2, attackCrush: 2, attackRanged: 2, attackMagic: 2, defenceStab: 4, defenceSlash: 4, defenceCrush: 4, defenceMagic: 4, defenceRanged: 4, strength: 1 },
  { unique: 'wasteland_reaver', wildernessOnly: true, requirements: { defence: 40 } });
cape('obsidian_cloak', 'Obsidian cloak', 'Black scales, stitched together. Warm to the touch.', 120000, '#1a1a1e', '#8a40c0',
  { defenceStab: 10, defenceSlash: 10, defenceCrush: 10, defenceMagic: 10, defenceRanged: 10, strength: 2, prayer: 3 },
  { unique: 'obsidian_dragon', wildernessOnly: true, requirements: { defence: 70 }, model: { glow: '#8a40c0' } });

// -- jewellery
const ring = (id, name, examine, value, c1, c2, bonuses, extra = {}) => eq({ id, name, examine, value, slot: 'ring', bonuses, color: c1, icon: { shape: 'ring', color: c1, color2: c2 }, ...extra });
const amulet = (id, name, examine, value, c1, c2, bonuses, extra = {}) => eq({ id, name, examine, value, slot: 'neck', bonuses, color: c2, icon: { shape: 'amulet', color: c1, color2: c2 }, ...extra });
ring('warlords_signet', "Warlord's signet", 'A crude ring stamped with a goblin war-mark.', 8000, '#8a6a3a', '#a02a1a', { attackSlash: 2, attackCrush: 2, attackStab: 2, strength: 2 }, { unique: 'grubnak_warlord' });
ring('corsairs_eye', "Corsair's eye", 'A ring set with a glass eye. It seems to follow you.', 20000, '#d8a830', '#40a0e0', { attackRanged: 6, rangedStrength: 2 }, { unique: 'corsair_captain' });
ring('graven_band', 'Graven band', 'A ring of living stone.', 40000, '#7a756c', '#60e0ff', { defenceStab: 6, defenceSlash: 6, defenceCrush: 6, defenceRanged: 6 }, { unique: 'graven_king' });
ring('tidecaller_ring', 'Tidecaller ring', 'Cool and damp, no matter what.', 60000, '#5a8a7a', '#4ad0a0', { attackMagic: 8, defenceMagic: 6, magicDamage: 2 }, { unique: 'bog_matriarch' });
ring('bloodstone_ring', 'Bloodstone ring', 'It pulses with every heartbeat.', 150000, '#3a3a3a', '#c02020', { strength: 5, attackStab: 2, attackSlash: 2, attackCrush: 2 }, { unique: 'varrath_gloom_tyrant' });
amulet('heart_of_varrath', 'Heart of Varrath', 'The still-warm heart-stone of the Gloom Tyrant.', 350000, '#2a1e3a', '#b040ff',
  { attackStab: 12, attackSlash: 12, attackCrush: 12, attackMagic: 6, attackRanged: 6, defenceStab: 6, defenceSlash: 6, defenceCrush: 6, defenceMagic: 6, defenceRanged: 6, strength: 8, prayer: 3 },
  { unique: 'varrath_gloom_tyrant', model: { glow: '#b040ff' } });
amulet('lich_phylactery', 'Phylactery amulet', 'Something inside it is still whispering.', 180000, '#a0a0a8', '#7aff9a',
  { attackMagic: 15, defenceMagic: 10, magicDamage: 5, prayer: 2 }, { unique: 'calder_lich', wildernessOnly: true, model: { glow: '#7aff9a' } });
amulet('wyrmtooth_amulet', 'Wyrmtooth amulet', 'A dragon\'s tooth on a cord. Grants courage, if nothing else.', 25000, '#8a6a3a', '#e8e0c8',
  { attackStab: 4, attackSlash: 4, attackCrush: 4, attackRanged: 4, attackMagic: 4, strength: 3, prayer: 1 }, { unique: 'dragons' });

// =================================================================================================
// Remains (prayer) + misc drop items
// =================================================================================================
const bones = (id, name, examine, value, xp, color, extra = {}) =>
  registerItem({ id, name, examine, value, options: ['Bury'], ...(xp != null ? { prayerXp: xp } : {}), icon: { shape: 'bones', color }, ...extra });
bones('wolf_bones', 'Wolf bones', 'Bones of a wolf.', 6, 4.5, '#e0dccc');
bones('bat_bones', 'Bat bones', 'Tiny, fragile bones.', 6, 5.3, '#d8d0c0');
bones('goblin_bones', 'Goblin bones', 'Small, crooked bones.', 4, 5, '#d8d4b8');
bones('drake_bones', 'Drake bones', 'Bones of a young dragon.', 400, 30, '#e8e0c8');
bones('wyrm_bones', 'Wyrm bones', 'These belonged to a fully-grown dragon.', 900, null, '#f2ecd8');
bones('frost_wyrm_bones', 'Frost wyrm bones', 'Cold enough to sting your fingers.', 1800, 110, '#e0f0ff');
bones('giant_bones', 'Giant bones', 'Huge bones from a giant.', 120, 25, '#f4eedc');
bones('fiend_bones', 'Fiend bones', 'Charred, horned bones of a fiend.', 400, null, '#5a5050', { icon: { shape: 'bones', color: '#5a5050' } });
registerItem({ id: 'ashes', name: 'Ashes', examine: 'A heap of fine ashes.', value: 2, icon: { shape: 'seed', color: '#9a9a9a' } });

registerItem({ id: 'goblin_war_banner', name: 'Goblin war banner', examine: 'A tattered goblin standard.', value: 40, icon: { shape: 'cape', color: '#6a8a3a', color2: '#a02a1a' } });
registerItem({ id: 'ancient_coin', name: 'Ancient coin', examine: 'A coin minted by a kingdom long gone. Collectors pay well.', value: 250, stackable: true, icon: { shape: 'coins', color: '#c8a050' } });
registerItem({ id: 'ashen_key', name: 'Ashen key', examine: 'A soot-black key from the Wilderness. It must open something.', value: 500, icon: { shape: 'key', color: '#4a4440' } });
registerItem({ id: 'gloom_key', name: 'Gloomhollow key', examine: 'An iron key found in the Depths.', value: 300, icon: { shape: 'key', color: '#5a5a7a' } });
registerItem({ id: 'giant_tooth', name: 'Giant tooth', examine: 'Surprisingly clean.', value: 80, icon: { shape: 'bones', color: '#f0e8d0' } });
registerItem({ id: 'spider_silk', name: 'Spider silk', examine: 'Strong, sticky strands.', value: 30, stackable: true, icon: { shape: 'string', color: '#e8e8f0' } });
registerItem({ id: 'elemental_core', name: 'Elemental core', examine: 'A pulsing core of bound elemental power.', value: 900, icon: { shape: 'gem', color: '#80e0ff' } });
registerItem({ id: 'shell_fragment', name: 'Shell fragment', examine: 'A piece of hard crab shell.', value: 12, stackable: true, icon: { shape: 'gem', color: '#c86a3a' } });
registerItem({ id: 'troll_hide', name: 'Troll hide', examine: 'Thick, grey and pungent.', value: 400, icon: { shape: 'bag', color: '#6a6a5a' } });
