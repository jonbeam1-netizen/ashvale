// Shops of the eastern lands and the coast (Durnhold, Ilvaren, Dustwatch, Gullhaven, Bogwick).
// OWNER: content designer (east). Imported by shops.js. Shopkeeper NPCs + placement live in npcs_east.js;
// quest-unlocked shops (Brunna's Masterworks, Morwen's hidden shelf) are opened by quest hooks in quests_east*.js.
// New trade goods (waterskins, desert robes, dwarven stout, lamp oil...) are registered here too.

import { registerShop, registerItem } from '../core/registry.js';

const S = (id, qty = 10) => ({ id, qty });
const R = (id, qty, rate) => ({ id, qty, rate }); // per-item price rate (overrides the shop's sellRate)
const tierSet = (tier, pieces, qty = 2) => pieces.map((p) => S(`${tier}_${p}`, qty));
const WEAPONS = ['dagger', 'sword', 'scimitar', 'longsword', 'mace', 'warhammer', 'battleaxe', 'twohand_sword'];
const ARMOUR = ['med_helm', 'full_helm', 'chainbody', 'platebody', 'platelegs', 'plateskirt', 'sq_shield', 'kiteshield', 'boots', 'gloves'];

// =================================================================================================
// Trade goods
// =================================================================================================
// Waterskins (desert heat, see npcs_east.js): 4 sips each, refill at wells and the Sunwell.
for (let n = 1; n <= 4; n++) {
  registerItem({ id: `waterskin_${n}`, name: `Waterskin (${n})`, examine: `A leather waterskin with ${n} sip${n > 1 ? 's' : ''} of water left.`, value: 30, options: ['Drink'],
    icon: { shape: 'bag', color: '#8a6a40', color2: '#4a90d0' } });
}
registerItem({ id: 'waterskin_empty', name: 'Waterskin (empty)', examine: 'An empty leather waterskin. Fill it at a well.', value: 25, icon: { shape: 'bag', color: '#8a6a40' } });
// Desert robes: light cloth that keeps the Sunscar sun off (each piece slows the heat).
registerItem({ id: 'desert_wrap', name: 'Desert wrap', examine: 'A long cotton head-wrap. Cool, if you tie it right.', value: 60, slot: 'head', desertCloth: true,
  bonuses: { defenceMagic: 1, defenceRanged: 1 }, icon: { shape: 'hood', color: '#e8dcc0' }, model: { shape: 'hood', color: '#e8dcc0' } });
registerItem({ id: 'desert_robe_top', name: 'Desert robe', examine: 'Loose, pale and blessedly airy.', value: 90, slot: 'body', desertCloth: true,
  bonuses: { defenceMagic: 2, defenceRanged: 2 }, icon: { shape: 'robe_top', color: '#e8dcc0' }, model: { shape: 'robe_top', color: '#e8dcc0' } });
registerItem({ id: 'desert_robe_bottom', name: 'Desert robe bottom', examine: 'Billowing trousers for billowing heat.', value: 70, slot: 'legs', desertCloth: true,
  bonuses: { defenceMagic: 1, defenceRanged: 1 }, icon: { shape: 'legs', color: '#e8dcc0' }, model: { shape: 'robe', color: '#e8dcc0' } });
// Dwarven stout: heals a little, boosts Strength, makes your aim wobbly (handled in npcs_east.js).
registerItem({ id: 'dwarven_stout', name: 'Dwarven stout', examine: 'Black as coal, thick as mortar. Durnhold\'s finest.', value: 12, options: ['Drink'], drinkHeal: 3,
  icon: { shape: 'pot', color: '#3a2a1a', color2: '#e8dcc0' } });
registerItem({ id: 'emberbrew', name: 'Emberbrew', examine: 'A spiced dwarven ale that tingles all the way down.', value: 30, options: ['Drink'], drinkHeal: 6,
  icon: { shape: 'pot', color: '#a8401a', color2: '#ffd080' } });
registerItem({ id: 'moss_cider', name: 'Moss cider', examine: 'Bogwick\'s own. Green, cloudy and suspiciously cheerful.', value: 8, options: ['Drink'], drinkHeal: 2,
  icon: { shape: 'pot', color: '#6a8a3a', color2: '#d8e0a0' } });
registerItem({ id: 'stonebread', name: 'Stonebread', examine: 'Dwarven travel bread. It has been known to stop arrows.', value: 14, heal: 7, icon: { shape: 'bread', color: '#8a7a5a' } });
registerItem({ id: 'honeyed_dates', name: 'Honeyed dates', examine: 'Sticky, sweet and full of sun.', value: 10, heal: 5, icon: { shape: 'generic', color: '#a8601a' } });
registerItem({ id: 'eel_pie', name: 'Eel pie', examine: 'Bogwick\'s pride. The eel is mostly in there.', value: 24, heal: 9, icon: { shape: 'pie', color: '#6a7a4a' } });
registerItem({ id: 'lamp_oil', name: 'Lamp oil', examine: 'A stoppered flask of clear whale-free lamp oil.', value: 15, icon: { shape: 'potion', color: '#e8d080' } });
registerItem({ id: 'cranes_cure_all', name: "Crane's Cure-All", examine: 'A blue bottle. The label promises to cure "bog fever, eel-rot, heartbreak & all marsh ills".', value: 50, heal: 1,
  icon: { shape: 'potion', color: '#3a6ac8' } });

// =================================================================================================
// Durnhold (Greyspine Mountains)
// =================================================================================================
registerShop({
  id: 'durnhold_smithy', name: "Torvik's Smithy", sellRate: 1.05, buyRate: 0.6, restockTicks: 60,
  stock: [...tierSet('steel', [...WEAPONS, ...ARMOUR], 3), ...tierSet('duskite', [...WEAPONS, ...ARMOUR], 2), ...tierSet('verdite', [...WEAPONS, ...ARMOUR], 1),
    ...tierSet('azurium', ['dagger', 'sword', 'scimitar', 'med_helm', 'sq_shield', 'chainbody'], 1),
    S('steel_bar', 20), S('duskite_bar', 10), S('verdite_bar', 5), S('hammer', 5)],
});
registerShop({
  id: 'durnhold_masterworks', name: "Brunna's Masterworks", sellRate: 1.1, buyRate: 0.6, restockTicks: 100,
  stock: [...tierSet('azurium', [...WEAPONS, ...ARMOUR], 2), ...tierSet('emberite', ['dagger', 'sword', 'scimitar', 'longsword', 'warhammer', 'full_helm', 'kiteshield', 'platelegs', 'platebody'], 1),
    S('azurium_bar', 5), S('emberite_bar', 2)],
});
registerShop({
  id: 'durnhold_mining', name: 'Deepdelve Supplies', sellRate: 1.0, buyRate: 0.5, restockTicks: 40,
  stock: [S('bronze_pickaxe', 5), S('iron_pickaxe', 5), S('steel_pickaxe', 4), S('duskite_pickaxe', 3), S('verdite_pickaxe', 2), S('azurium_pickaxe', 1),
    S('hammer', 5), S('chisel', 5), R('coal', 60, 2.25), R('iron_ore', 30, 2.25), R('silver_ore', 10, 1.6), R('gold_ore', 5, 2), R('duskite_ore', 5, 2.25), S('stonebread', 15)],
});
registerShop({
  id: 'durnhold_tavern', name: 'The Stonemug', sellRate: 1.0, buyRate: 0.4, restockTicks: 15,
  stock: [S('dwarven_stout', 30), S('emberbrew', 10), S('stonebread', 20), S('stew', 10), S('meat_pie', 10), S('cooked_meat', 15), S('bread', 15)],
});

// =================================================================================================
// Ilvaren (Faelwood)
// =================================================================================================
registerShop({
  id: 'ilvaren_bows', name: 'Silverstring Bows', sellRate: 1.05, buyRate: 0.55, restockTicks: 40,
  stock: [S('weepwood_shortbow', 3), S('weepwood_longbow', 3), S('redleaf_shortbow', 2), S('redleaf_longbow', 2), S('ironbark_shortbow', 1), S('ironbark_longbow', 1),
    S('steel_arrows', 500), S('duskite_arrows', 300), S('verdite_arrows', 150), S('azurium_arrows', 50), S('bowstring', 50), S('feather', 500), S('arrow_shaft', 500),
    S('hard_leather_body', 3), S('studded_body', 2), S('studded_chaps', 2), S('leather_vambraces', 5)],
});
registerShop({
  id: 'ilvaren_robes', name: 'Leafweave Robes & Staves', sellRate: 1.05, buyRate: 0.5, restockTicks: 40,
  stock: [S('conjurer_hat', 3), S('conjurer_robe_top', 3), S('conjurer_robe_bottom', 3), S('conjurer_gloves', 3), S('conjurer_boots', 3),
    S('thaumaturge_hat', 2), S('thaumaturge_robe_top', 2), S('thaumaturge_robe_bottom', 2), S('thaumaturge_gloves', 2), S('thaumaturge_boots', 2),
    S('astral_hat', 1), S('astral_robe_top', 1), S('astral_robe_bottom', 1),
    S('wind_battlestaff', 2), S('water_battlestaff', 2), S('earth_battlestaff', 2), S('fire_battlestaff', 2), S('adept_wand', 2), S('starwood_staff', 1),
    S('mind_sigil', 500), S('thorn_sigil', 200), S('nexus_sigil', 80)],
});
registerShop({
  id: 'ilvaren_herbs', name: 'The Dewdrop Apothecary', sellRate: 1.0, buyRate: 0.5, restockTicks: 40,
  stock: [S('vial', 50), S('vial_of_water', 50), S('pestle_and_mortar', 5),
    S('grimy_marshmint', 8), S('grimy_emberroot', 6), S('grimy_silverthistle', 6), S('grimy_duskbloom', 3), S('grimy_starpetal', 2),
    S('silverthistle_seed', 5), S('duskbloom_seed', 3),
    S('wolf_fang', 20), S('bat_wing', 15), S('golem_dust', 15), S('frost_lichen', 8), S('gloom_spores', 8), S('imp_horn', 15),
    S('restoration_potion_4', 3), S('antidote_4', 5)],
});
registerShop({
  id: 'ilvaren_jewels', name: 'Starglass Jewels', sellRate: 1.1, buyRate: 0.6, restockTicks: 60,
  // raw supplies carry their own price rate (docs/BALANCE.md): buy -> cut/cast -> sell or transmute must not profit
  stock: [S('ring_mould', 5), S('necklace_mould', 5), S('amulet_mould', 5), R('gold_bar', 10, 2), R('silver_bar', 10, 1.6),
    R('uncut_moonstone', 5, 4.5), R('uncut_garnet', 4, 6), R('uncut_sunstone', 3, 7.5), R('uncut_tidestone', 2, 8), R('moonstone', 3, 2.5), R('garnet', 2, 2.5), R('sunstone', 1, 2.5),
    S('moonstone_ring', 2), S('garnet_ring', 1), S('moonstone_amulet', 1), S('silver_amulet', 3), S('gold_ring', 3)],
});

// =================================================================================================
// Dustwatch (Sunscar Badlands)
// =================================================================================================
registerShop({
  id: 'dustwatch_trading', name: 'Dustwatch Trading Post', general: true, sellRate: 1.1, buyRate: 0.4, restockTicks: 25,
  stock: [S('waterskin_4', 15), S('waterskin_empty', 5), S('desert_wrap', 5), S('desert_robe_top', 5), S('desert_robe_bottom', 5),
    S('honeyed_dates', 20), S('cooked_meat', 15), S('bread', 15), S('knife', 5), S('tinderbox', 5), S('hammer', 3), S('iron_pickaxe', 3), S('steel_axe', 2),
    S('antidote_4', 5), S('leather_boots', 3), S('leather_body', 3), S('bird_snare', 5), S('box_trap', 5)],
});

// =================================================================================================
// Gullhaven (fishing village)
// =================================================================================================
registerShop({
  id: 'gullhaven_fish', name: "Dorrie's Fresh Fish", sellRate: 1.0, buyRate: 0.5, restockTicks: 20,
  stock: [S('raw_perch', 15), S('raw_silverling', 10), S('raw_bluescale', 8), S('raw_rockclaw', 5),
    S('cooked_perch', 15), S('cooked_silverling', 10), S('cooked_bluescale', 8), S('cooked_rockclaw', 5), S('cooked_sabrefish', 3), S('fish_pie', 5)],
});
registerShop({
  id: 'gullhaven_chandlery', name: "Bastian's Chandlery", general: true, sellRate: 1.0, buyRate: 0.45, restockTicks: 20,
  stock: [S('small_net', 10), S('big_net', 5), S('fishing_rod', 10), S('fly_rod', 5), S('harpoon', 5), S('fishing_cage', 8), S('fishing_bait', 1000), S('feather', 1000),
    S('lamp_oil', 20), S('tinderbox', 5), S('knife', 5), S('bucket', 5), S('thread', 50), S('needle', 5), S('logs', 20)],
});
registerShop({
  id: 'gullhaven_tavern', name: 'The Salty Gull', sellRate: 1.0, buyRate: 0.4, restockTicks: 15,
  stock: [S('fish_pie', 10), S('stew', 8), S('bread', 15), S('cooked_perch', 10), S('jug_of_wine', 5), S('moss_cider', 10)],
});

// =================================================================================================
// Bogwick (swamp hamlet)
// =================================================================================================
registerShop({
  id: 'bogwick_remedies', name: "Morwen's Swamp Remedies", sellRate: 1.0, buyRate: 0.5, restockTicks: 30,
  stock: [S('antidote_4', 8), S('restoration_potion_4', 4), S('vigour_potion_4', 3), S('vial_of_water', 30), S('vial', 30), S('pestle_and_mortar', 3),
    S('grimy_marshmint', 10), S('grimy_bitterleaf', 8), S('marshmint_seed', 5), S('rat_tail', 20), S('beetle_shell', 20), S('grave_dust', 10)],
});
// unlocked by "Trial by Bog"
registerShop({
  id: 'bogwick_hidden_shelf', name: "Morwen's Hidden Shelf", sellRate: 1.15, buyRate: 0.5, restockTicks: 80,
  stock: [S('greater_precision_4', 2), S('greater_might_4', 2), S('greater_warding_4', 2), S('renewal_potion_4', 2), S('focus_potion_4', 2), S('marksman_potion_4', 2),
    S('grimy_ghostlily', 2), S('grimy_wyrmtongue', 3), S('wyrm_scale_dust', 5)],
});
registerShop({
  id: 'bogwick_tavern', name: 'The Sunken Boot', sellRate: 1.0, buyRate: 0.4, restockTicks: 15,
  stock: [S('eel_pie', 12), S('moss_cider', 20), S('cooked_bog_eel', 10), S('bread', 10), S('stew', 5)],
});
registerShop({
  id: 'cranes_wares', name: "Crane's Miraculous Wares", sellRate: 1.0, buyRate: 0.3, restockTicks: 30,
  stock: [S('cranes_cure_all', 25), S('vial', 10)],
});
