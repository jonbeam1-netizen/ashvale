// Gathering items: logs, ores, gems, essence, raw fish, hunter products, farming produce, herbs,
// seeds and the gathering tools agent B owns (fishing / hunter / farming tools). Also tool stats
// for every axe & pickaxe tier (the axe/pickaxe ITEMS are registered by agent D). OWNER: agent B.

import { registerItem, registerData, registerWeaponType, registerDropTable } from '../core/registry.js';
import { METAL_TIERS } from '../core/constants.js';

const item = (def) => registerItem({ ...def });

// =================================================================================================
// Logs (woodcutting)
// =================================================================================================
export const LOGS = [
  { id: 'logs', name: 'Logs', value: 4, color: '#7a5228', ring: '#d8b070', examine: 'A number of wooden logs.' },
  { id: 'birch_logs', name: 'Birch logs', value: 20, color: '#d8d2c4', ring: '#e8d8a8', examine: 'Pale logs with papery bark.' },
  { id: 'weepwood_logs', name: 'Weepwood logs', value: 32, color: '#6a5a3a', ring: '#c8c090', examine: 'Supple logs from a weepwood tree.' },
  { id: 'redleaf_logs', name: 'Redleaf logs', value: 64, color: '#7a3e26', ring: '#e0a070', examine: 'Logs with a warm, ruddy grain.' },
  { id: 'ironbark_logs', name: 'Ironbark logs', value: 180, color: '#3d2c22', ring: '#9a7a5a', examine: 'Dense logs, heavy as stone.' },
  { id: 'starwood_logs', name: 'Starwood logs', value: 640, color: '#4a4060', ring: '#9ae8f0', examine: 'These logs glitter faintly in the dark.' },
];
for (const l of LOGS) item({ id: l.id, name: l.name, examine: l.examine, value: l.value, icon: { shape: 'log', color: l.color, color2: l.ring } });

// =================================================================================================
// Ores, essence, gems (mining)
// =================================================================================================
const tierColor = (id) => METAL_TIERS.find((t) => t.id === id)?.color;
export const ORES = [
  { id: 'clay', name: 'Clay', value: 2, color: '#c8a878', examine: 'Soft, wet clay. Useful for pottery.' },
  { id: 'copper_ore', name: 'Copper ore', value: 3, color: '#c87a3a' },
  { id: 'tin_ore', name: 'Tin ore', value: 3, color: '#c8c8c0' },
  { id: 'iron_ore', name: 'Iron ore', value: 17, color: '#8a4a3a' },
  { id: 'silver_ore', name: 'Silver ore', value: 75, color: '#e8eef4' },
  { id: 'coal', name: 'Coal', value: 45, color: '#1a1a1a', color2: '#3a3a3a', examine: 'Hmm, a non-renewable energy source!' },
  { id: 'gold_ore', name: 'Gold ore', value: 150, color: '#f0c030' },
  { id: 'duskite_ore', name: 'Duskite ore', value: 162, color: '#6a4f90', examine: 'A violet ore that drinks the light.' },
  { id: 'verdite_ore', name: 'Verdite ore', value: 400, color: tierColor('verdite') || '#3e9461', examine: 'Green-veined ore, cool to the touch.' },
  { id: 'azurium_ore', name: 'Azurium ore', value: 3200, color: tierColor('azurium') || '#3b70c8', examine: 'Deep blue ore with a crystalline sheen.' },
  { id: 'emberite_ore', name: 'Emberite ore', value: 6400, color: tierColor('emberite') || '#c8452a', examine: 'It is warm. Very warm.' },
];
for (const o of ORES) item({ id: o.id, name: o.name, examine: o.examine || 'This needs refining.', value: o.value, icon: { shape: 'ore', color: o.color, color2: o.color2 } });
item({ id: 'pale_essence', name: 'Pale essence', examine: 'An uncharged fragment of a pale crystal. Used in Runebinding.', value: 4, icon: { shape: 'essence', color: '#d8d4e8' } });

export const GEMS = [
  { id: 'uncut_moonstone', name: 'Uncut moonstone', value: 25, color: '#a8c8e8', weight: 32 },
  { id: 'uncut_garnet', name: 'Uncut garnet', value: 50, color: '#a02838', weight: 16 },
  { id: 'uncut_sunstone', name: 'Uncut sunstone', value: 100, color: '#f0a020', weight: 8 },
  { id: 'uncut_tidestone', name: 'Uncut tidestone', value: 200, color: '#20a8a0', weight: 4 },
  { id: 'uncut_starheart', name: 'Uncut starheart', value: 1000, color: '#d8b8f8', weight: 1 },
];
for (const g of GEMS) item({ id: g.id, name: g.name, examine: 'An uncut gem. A chisel would bring out its beauty.', value: g.value, icon: { shape: 'gem', color: g.color } });
registerDropTable({ id: 'gathering_gems', main: GEMS.map((g) => ({ id: g.id, weight: g.weight })) });

// =================================================================================================
// Raw fish (fishing). suggestedHeal/cookLevel are hints for the Cooking owner.
// =================================================================================================
export const FISH = [
  { id: 'raw_minnow', name: 'Raw minnows', value: 5, color: '#a8b8c8', heal: 3, examine: 'Some tiny raw fish.' },
  { id: 'raw_perch', name: 'Raw perch', value: 10, color: '#8aa060', heal: 5, examine: 'A freshly caught perch.' },
  { id: 'raw_mudgill', name: 'Raw mudgill', value: 15, color: '#7a6a4a', heal: 6, examine: 'A whiskered bottom-feeder.' },
  { id: 'raw_silverling', name: 'Raw silverlings', value: 15, color: '#d8e4ec', heal: 4, examine: 'A handful of flashing silver fish.' },
  { id: 'raw_streamdart', name: 'Raw streamdart', value: 20, color: '#9ab870', heal: 7, examine: 'A quick river fish with speckled fins.' },
  { id: 'raw_rosefin', name: 'Raw rosefin', value: 30, color: '#e08a8a', heal: 9, examine: 'Its fins blush pink.' },
  { id: 'raw_bog_eel', name: 'Raw bog eel', value: 40, color: '#4a5a3a', heal: 11, examine: 'Slippery and rather smelly.' },
  { id: 'raw_bluescale', name: 'Raw bluescale', value: 60, color: '#3a6ab0', heal: 10, examine: 'A fat ocean fish with sapphire scales.' },
  { id: 'raw_rockclaw', name: 'Raw rockclaw', value: 80, color: '#b04a2a', heal: 12, examine: 'A crusty, snapping crustacean.' },
  { id: 'raw_sabrefish', name: 'Raw sabrefish', value: 120, color: '#7a8aa8', heal: 14, examine: 'Mind the long, sharp bill.' },
  { id: 'raw_frostfin', name: 'Raw frostfin', value: 150, color: '#a8e0f0', heal: 16, examine: 'Its flesh stays cold even out of the water.' },
  { id: 'raw_greyjaw', name: 'Raw greyjaw', value: 300, color: '#6a7078', heal: 20, examine: 'A fearsome ocean hunter. Not so fearsome now.' },
];
for (const f of FISH) {
  item({ id: f.id, name: f.name, examine: f.examine, value: f.value, icon: { shape: 'fish', color: f.color } });
  registerData('fish', f.id, { suggestedHeal: f.heal });
}

// =================================================================================================
// Hunter products
// =================================================================================================
item({ id: 'raw_bird_meat', name: 'Raw bird meat', examine: 'I should cook this first.', value: 4, icon: { shape: 'meat', color: '#d89a80' } });
item({ id: 'bramble_fur', name: 'Bramble fur', examine: 'Soft brown fur with tiny burrs caught in it.', value: 30, icon: { shape: 'fur', color: '#8a6a4a' } });
item({ id: 'snowcap_down', name: 'Snowcap down', examine: 'Feather-light white down.', stackable: true, value: 6, icon: { shape: 'feather', color: '#f4f8ff' } });

// Explosive critters - thrown ranged weapons (stackable). Weapon type registered below; agent A's
// combat treats any weaponType with `ranged: true` as a ranged weapon.
registerWeaponType({
  id: 'bombtail', ranged: true, thrown: true,
  styles: [
    { name: 'Short fuse', type: 'ranged', style: 'accurate', xp: ['ranged'], anim: 'shoot' },
    { name: 'Medium fuse', type: 'ranged', style: 'rapid', xp: ['ranged'], anim: 'shoot' },
    { name: 'Long fuse', type: 'ranged', style: 'longrange', xp: ['ranged', 'defence'], anim: 'shoot' },
  ],
});
item({
  id: 'grey_bombtail', name: 'Grey bombtail', examine: 'A twitchy critter that goes off with a bang when thrown.', stackable: true, value: 600,
  slot: 'weapon', weaponType: 'bombtail', attackSpeed: 4, requirements: { ranged: 45 }, thrown: true, aoe: true,
  bonuses: { attackRanged: 45, rangedStrength: 15 }, icon: { shape: 'critter', color: '#8a8a88' }, model: { shape: 'mace', color: '#8a8a88' },
});
item({
  id: 'ember_bombtail', name: 'Ember bombtail', examine: 'Hot to the touch and very, very angry.', stackable: true, value: 1200,
  slot: 'weapon', weaponType: 'bombtail', attackSpeed: 4, requirements: { ranged: 55 }, thrown: true, aoe: true,
  bonuses: { attackRanged: 70, rangedStrength: 30 }, icon: { shape: 'critter', color: '#d0502a' }, model: { shape: 'mace', color: '#d0502a' },
});

export const BUTTERFLIES = [
  { id: 'amber_flutterwing', name: 'Amber flutterwing', color: '#f0a020' },
  { id: 'azure_flutterwing', name: 'Azure flutterwing', color: '#3a80e0' },
  { id: 'frost_flutterwing', name: 'Frost flutterwing', color: '#d8f0ff' },
];
item({ id: 'butterfly_jar', name: 'Butterfly jar', examine: 'An empty jar with air holes in the lid.', value: 1, icon: { shape: 'jar' } });
for (const b of BUTTERFLIES) {
  item({ id: `jar_${b.id}`, name: `Jarred ${b.name.toLowerCase()}`, examine: `A ${b.name.toLowerCase()} fluttering in a jar.`, value: 20, options: ['Release'], icon: { shape: 'jar', color2: b.color } });
}

// =================================================================================================
// Farming: produce, herbs, seeds, supplies
// =================================================================================================
export const ALLOTMENT_CROPS = [
  { id: 'fieldroot', name: 'Fieldroot', level: 1, plantXp: 8, harvestXp: 9, stages: 4, value: 2, heal: 1, pc: '#5a9a3a', fc: '#c8a060', color: '#b89058' },
  { id: 'goldbulb', name: 'Goldbulb', level: 5, plantXp: 9.5, harvestXp: 10.5, stages: 4, value: 3, heal: 1, pc: '#7ab04a', fc: '#e8c050', color: '#e8c050' },
  { id: 'leafhead', name: 'Leafhead', level: 7, plantXp: 10, harvestXp: 11.5, stages: 4, value: 4, heal: 2, pc: '#80c060', fc: '#a8d880', color: '#90c868', big: true },
  { id: 'sunberry', name: 'Sunberry', level: 12, plantXp: 12.5, harvestXp: 14, stages: 4, value: 8, heal: 2, pc: '#4a8a3a', fc: '#e04030', color: '#e04030' },
  { id: 'honeycorn', name: 'Honeycorn', level: 20, plantXp: 17, harvestXp: 19, stages: 6, value: 12, heal: 3, pc: '#6a9a3a', fc: '#f0d040', color: '#f0d040', tall: true },
  { id: 'rubyberry', name: 'Rubyberry', level: 31, plantXp: 26, harvestXp: 29, stages: 6, value: 30, heal: 6, pc: '#3a7a30', fc: '#d02050', color: '#d02050' },
  { id: 'dewmelon', name: 'Dewmelon', level: 47, plantXp: 48.5, harvestXp: 54.5, stages: 8, value: 60, heal: 5, pc: '#3a8a3a', fc: '#5ab048', color: '#5ab048', big: true },
];
export const HERBS = [
  { id: 'sagewort', name: 'Sagewort', level: 9, plantXp: 11, harvestXp: 12.5, cleanLevel: 3, cleanXp: 2.5, color: '#6aa040' },
  { id: 'bitterleaf', name: 'Bitterleaf', level: 14, plantXp: 13.5, harvestXp: 15, cleanLevel: 5, cleanXp: 3.8, color: '#8a9a30' },
  { id: 'marshmint', name: 'Marshmint', level: 19, plantXp: 16, harvestXp: 18, cleanLevel: 11, cleanXp: 5, color: '#40a080' },
  { id: 'emberroot', name: 'Emberroot', level: 26, plantXp: 21.5, harvestXp: 24, cleanLevel: 20, cleanXp: 6.3, color: '#c06030' },
  { id: 'silverthistle', name: 'Silverthistle', level: 32, plantXp: 27, harvestXp: 30.5, cleanLevel: 25, cleanXp: 7.5, color: '#a0b8c0' },
  { id: 'duskbloom', name: 'Duskbloom', level: 38, plantXp: 34, harvestXp: 38.5, cleanLevel: 40, cleanXp: 8.8, color: '#7050a0' },
  { id: 'starpetal', name: 'Starpetal', level: 44, plantXp: 43, harvestXp: 48.5, cleanLevel: 48, cleanXp: 10, color: '#e0e080' },
  { id: 'frostcap', name: 'Frostcap', level: 56, plantXp: 69, harvestXp: 78, cleanLevel: 54, cleanXp: 11.3, color: '#a0d8f0' },
  { id: 'wyrmtongue', name: 'Wyrmtongue', level: 62, plantXp: 85, harvestXp: 96, cleanLevel: 65, cleanXp: 12.5, color: '#a03040' },
  { id: 'ghostlily', name: 'Ghostlily', level: 73, plantXp: 120, harvestXp: 135, cleanLevel: 75, cleanXp: 15, color: '#e8e8f0' },
];
export const TREE_SEEDS = [
  { id: 'birch', name: 'Birch', level: 15, plantXp: 14, checkXp: 230, stages: 4, variant: 'birch' },
  { id: 'weepwood', name: 'Weepwood', level: 30, plantXp: 25, checkXp: 700, stages: 5, variant: 'weepwood' },
  { id: 'redleaf', name: 'Redleaf', level: 45, plantXp: 45, checkXp: 1700, stages: 6, variant: 'redleaf' },
  { id: 'ironbark', name: 'Ironbark', level: 60, plantXp: 81, checkXp: 3500, stages: 7, variant: 'ironbark' },
  { id: 'starwood', name: 'Starwood', level: 75, plantXp: 145, checkXp: 6900, stages: 8, variant: 'starwood' },
];

for (const c of ALLOTMENT_CROPS) {
  item({ id: c.id, name: c.name, examine: `A freshly picked ${c.name.toLowerCase()}.`, value: c.value, heal: c.heal, icon: { shape: 'produce', color: c.color, color2: c.pc } });
  item({ id: `${c.id}_seed`, name: `${c.name} seed`, examine: `${c.name} seeds - plant 3 in an allotment.`, stackable: true, value: Math.max(1, Math.round(c.value / 2)), icon: { shape: 'seed', color: c.color } });
  registerData('farming', `${c.id}_seed`, { type: 'allotment', crop: c.id, name: c.name, level: c.level, plantXp: c.plantXp, harvestXp: c.harvestXp, stages: c.stages, seeds: 3, pc: c.pc, fc: c.fc, tall: !!c.tall, big: !!c.big });
}
for (const h of HERBS) {
  item({ id: `grimy_${h.id}`, name: `Grimy ${h.name.toLowerCase()}`, examine: 'I need to clean this herb before I can use it.', value: h.level * 4, options: ['Clean'], icon: { shape: 'herb', color: '#5a5a3a', color2: h.color } });
  item({ id: h.id, name: h.name, examine: `A clean ${h.name.toLowerCase()} leaf.`, value: h.level * 5, icon: { shape: 'herb', color: h.color } });
  item({ id: `${h.id}_seed`, name: `${h.name} seed`, examine: `A ${h.name.toLowerCase()} seed - plant in a herb patch.`, stackable: true, value: h.level * 3, icon: { shape: 'seed', color: h.color } });
  registerData('farming', `${h.id}_seed`, { type: 'herb', crop: `grimy_${h.id}`, name: h.name, level: h.level, plantXp: h.plantXp, harvestXp: h.harvestXp, stages: 4, seeds: 1, pc: '#4a8a3a', fc: h.color });
  // For Herblore (agent C): getData('herb', 'grimy_x') -> { clean, level, xp }
  registerData('herb', `grimy_${h.id}`, { clean: h.id, level: h.cleanLevel, xp: h.cleanXp });
}
for (const t of TREE_SEEDS) {
  item({ id: `${t.id}_seed`, name: `${t.name} seed`, examine: `Plant this in a tree patch with a spade.`, stackable: true, value: t.level * 10, icon: { shape: 'seed', color: '#7a5a2a' } });
  registerData('farming', `${t.id}_seed`, { type: 'tree', tree: t.variant, treeObject: `tree_${t.variant}`, name: `${t.name} tree`, level: t.level, plantXp: t.plantXp, checkXp: t.checkXp, stages: t.stages, seeds: 1 });
}

item({ id: 'weeds', name: 'Weeds', examine: 'A handful of pulled weeds.', value: 1, icon: { shape: 'weeds' } });
item({ id: 'compost', name: 'Compost', examine: 'A sack of rich compost. Reduces disease and improves yield.', value: 30, icon: { shape: 'sack', color: '#4a3a20' } });
item({ id: 'supercompost', name: 'Supercompost', examine: 'Very rich compost. Greatly reduces disease and improves yield.', value: 90, icon: { shape: 'sack', color: '#2a3a18' } });
item({ id: 'plant_cure', name: 'Plant cure', examine: 'Cures a diseased crop.', value: 25, icon: { shape: 'potion', color: '#60c060' }, doses: 4 });

// Twig nests (rare woodcutting drop)
item({ id: 'twig_nest', name: "Bird's nest", examine: 'A nest that fell from a tree. There might be something inside.', value: 50, options: ['Search'], icon: { shape: 'nest', color2: '#7a5a2a' } });
item({ id: 'twig_nest_eggs', name: "Bird's nest", examine: 'It has eggs in it!', value: 80, options: ['Search'], icon: { shape: 'nest', color2: '#e8e0c8' } });
item({ id: 'empty_nest', name: 'Empty nest', examine: 'An empty bird nest. Useful in herblore, perhaps.', value: 5, icon: { shape: 'nest' } });
item({ id: 'speckled_egg', name: 'Speckled egg', examine: 'A small speckled egg from a bird nest.', value: 40, icon: { shape: 'egg', color: '#d8e0c0' } });

// =================================================================================================
// Tools owned by B (fishing / hunter / farming). Axes & pickaxes are D's items.
// =================================================================================================
item({ id: 'big_net', name: 'Big fishing net', examine: 'Useful for catching lots of fish.', value: 20, icon: { shape: 'string', color: '#a89060' } });
item({ id: 'fishing_rod', name: 'Fishing rod', examine: 'Useful for catching sardines... er, fish.', value: 5, icon: { shape: 'rod', color: '#8a6a3a' }, model: { shape: 'staff', color: '#8a6a3a' } });
item({ id: 'fly_rod', name: 'Fly fishing rod', examine: 'Useful for fly fishing.', value: 5, icon: { shape: 'rod', color: '#5a7a4a' }, model: { shape: 'staff', color: '#5a7a4a' } });
item({ id: 'harpoon', name: 'Harpoon', examine: 'Useful for catching really big fish.', value: 5, icon: { shape: 'harpoon' }, model: { shape: 'spear', color: '#a0a0a8' } });
item({ id: 'fishing_cage', name: 'Fishing cage', examine: 'Useful for catching rockclaws.', value: 20, icon: { shape: 'cage' } });
item({ id: 'fishing_bait', name: 'Fishing bait', examine: 'For use with a fishing rod.', stackable: true, value: 3, icon: { shape: 'bag', color: '#8a6a4a' } });

item({ id: 'bird_snare', name: 'Bird snare', examine: 'A simple bird catcher.', value: 6, options: ['Lay'], icon: { shape: 'snare' } });
item({ id: 'box_trap', name: 'Box trap', examine: 'For trapping small creatures.', value: 38, options: ['Lay'], icon: { shape: 'box_trap' } });
item({ id: 'butterfly_net', name: 'Butterfly net', examine: 'For catching butterflies.', value: 24, icon: { shape: 'butterfly_net' }, model: { shape: 'staff', color: '#e8e8e0' } });

item({ id: 'rake', name: 'Rake', examine: 'Use this to clear weeds.', value: 6, icon: { shape: 'rake' }, model: { shape: 'spear', color: '#8a8a92' } });
item({ id: 'seed_dibber', name: 'Seed dibber', examine: 'Use this to plant seeds with.', value: 6, icon: { shape: 'dibber' } });
item({ id: 'spade', name: 'Spade', examine: 'A slightly muddy spade.', value: 3, icon: { shape: 'spade' }, model: { shape: 'spear', color: '#9a9aa2' } });
item({ id: 'watering_can', name: 'Watering can', examine: 'Keeps your crops healthy. Refills itself from any rain barrel. Probably.', value: 25, icon: { shape: 'watering_can' } });

// =================================================================================================
// Tool stats: axes (woodcutting) and pickaxes (mining) for every metal tier.
//   { skill, level (skill level to use), power (success multiplier), interval (mining ticks per roll) }
// =================================================================================================
const TOOL_TIERS = [
  ['bronze', 1, 1.0, 6], ['iron', 1, 1.5, 6], ['steel', 6, 2.0, 5], ['duskite', 21, 2.5, 5],
  ['verdite', 31, 3.0, 4], ['azurium', 41, 3.6, 3], ['emberite', 61, 4.2, 3],
];
for (const [t, level, power, interval] of TOOL_TIERS) {
  registerData('tools', `${t}_axe`, { skill: 'woodcutting', level, power });
  registerData('tools', `${t}_pickaxe`, { skill: 'mining', level, power: 1 + (power - 1) * 0.5, interval });
}

// =================================================================================================
// Shared drop tables other agents may reference ({ table: 'gathering_seeds_allotment', weight } etc.)
// =================================================================================================
registerDropTable({ id: 'gathering_seeds_allotment', main: ALLOTMENT_CROPS.map((c, i) => ({ id: `${c.id}_seed`, qty: [1, 4], weight: Math.max(1, 14 - i * 2) })) });
registerDropTable({ id: 'gathering_seeds_herb', main: HERBS.map((h, i) => ({ id: `${h.id}_seed`, qty: 1, weight: Math.max(1, 20 - i * 2) })) });
registerDropTable({ id: 'gathering_seeds_tree', main: TREE_SEEDS.map((t, i) => ({ id: `${t.id}_seed`, qty: 1, weight: [16, 8, 4, 2, 1][i] })) });
registerDropTable({ id: 'gathering_seeds', main: [{ table: 'gathering_seeds_allotment', weight: 60 }, { table: 'gathering_seeds_herb', weight: 34 }, { table: 'gathering_seeds_tree', weight: 6 }] });
registerDropTable({ id: 'gathering_herbs', main: HERBS.map((h, i) => ({ id: `grimy_${h.id}`, qty: 1, weight: Math.max(1, 20 - i * 2) })) });
registerDropTable({ id: 'gathering_nest', main: [{ table: 'gathering_seeds_herb', weight: 40 }, { table: 'gathering_seeds_allotment', weight: 30 }, { table: 'gathering_seeds_tree', weight: 25 }, { table: 'gathering_gems', weight: 5 }] });
