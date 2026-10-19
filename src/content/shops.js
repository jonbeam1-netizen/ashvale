// Shops. OWNER: agent D (D2). Shopkeeper NPCs live in npcs_town.js (npc.def.shop -> shop id).
// { id, name, currency:'coins', sellRate (price multiplier when buying from shop), buyRate (multiplier the shop pays),
//   general (buys anything tradeable), restockTicks, stock: [{id, qty}] }

import { registerShop } from '../core/registry.js';

const S = (id, qty = 10) => ({ id, qty });
const tierSet = (tier, pieces, qty = 3) => pieces.map((p) => S(`${tier}_${p}`, qty));
const WEAPONS = ['dagger', 'sword', 'scimitar', 'longsword', 'mace', 'warhammer', 'battleaxe', 'twohand_sword'];
const ARMOUR = ['med_helm', 'full_helm', 'chainbody', 'platebody', 'platelegs', 'plateskirt', 'sq_shield', 'kiteshield', 'boots', 'gloves'];

// =================================================================================================
// Brackenford
// =================================================================================================
registerShop({
  id: 'brackenford_general', name: 'Brackenford General Store', general: true, sellRate: 1.0, buyRate: 0.4, restockTicks: 20,
  stock: [
    S('tinderbox', 5), S('hammer', 5), S('knife', 5), S('chisel', 5), S('needle', 5), S('thread', 30),
    S('small_net', 5), S('bronze_axe', 5), S('bronze_pickaxe', 5), S('pot', 5), S('bucket', 5), S('jug', 5),
    S('bread', 10), S('cooked_meat', 10), S('wooden_shield', 3), S('leather_boots', 3), S('leather_gloves', 3), S('cape_red', 2), S('cape_blue', 2),
    S('bird_snare', 5), S('butterfly_net', 3), S('butterfly_jar', 20),
  ],
});
registerShop({
  id: 'brackenford_swords', name: "Garrick's Blades", sellRate: 1.0, buyRate: 0.55, restockTicks: 30,
  stock: [...tierSet('bronze', WEAPONS, 5), ...tierSet('iron', WEAPONS, 3), ...tierSet('steel', ['dagger', 'sword', 'scimitar', 'longsword'], 2)],
});
registerShop({
  id: 'brackenford_armour', name: "Hilde's Hauberks", sellRate: 1.0, buyRate: 0.55, restockTicks: 30,
  stock: [...tierSet('bronze', ARMOUR, 4), ...tierSet('iron', ARMOUR, 3), ...tierSet('steel', ['med_helm', 'chainbody', 'sq_shield'], 2), S('wooden_shield', 5)],
});
registerShop({
  id: 'brackenford_food', name: 'The Crusty Loaf', sellRate: 1.0, buyRate: 0.4, restockTicks: 15,
  stock: [S('bread', 20), S('cooked_meat', 15), S('cooked_chicken', 15), S('cake', 5), S('stew', 5), S('pot_of_flour', 10), S('egg', 10), S('bucket_of_milk', 5), S('jug_of_wine', 3)],
});
registerShop({
  id: 'brackenford_fishing', name: "Tobin's Tackle", sellRate: 1.0, buyRate: 0.45, restockTicks: 20,
  stock: [S('small_net', 10), S('big_net', 5), S('fishing_rod', 10), S('fly_rod', 5), S('harpoon', 5), S('fishing_cage', 5), S('fishing_bait', 500), S('feather', 500), S('raw_minnow', 0), S('raw_perch', 0)],
});
registerShop({
  id: 'brackenford_crafting', name: "Ilsa's Craft Supplies", sellRate: 1.0, buyRate: 0.5, restockTicks: 20,
  stock: [S('needle', 10), S('thread', 100), S('chisel', 10), S('ring_mould', 5), S('necklace_mould', 5), S('amulet_mould', 5), S('leather', 20), S('cowhide', 0), S('clay', 20), S('uncut_moonstone', 2)],
});
registerShop({
  id: 'brackenford_magic', name: "Orrin's Arcana", sellRate: 1.0, buyRate: 0.5, restockTicks: 10,
  stock: [
    S('wind_sigil', 1000), S('water_sigil', 1000), S('earth_sigil', 1000), S('fire_sigil', 1000), S('mind_sigil', 1000), S('pale_essence', 200),
    S('apprentice_staff', 5), S('apprentice_wand', 3), S('mages_staff', 2),
    S('staff_of_wind', 2), S('staff_of_water', 2), S('staff_of_earth', 2), S('staff_of_fire', 2),
    S('wizard_hat_blue', 5), S('apprentice_hat', 5), S('apprentice_robe_top', 5), S('apprentice_robe_bottom', 5), S('apprentice_gloves', 5), S('apprentice_boots', 5),
  ],
});
registerShop({
  id: 'brackenford_archery', name: "Rowan's Bows", sellRate: 1.0, buyRate: 0.5, restockTicks: 15,
  stock: [S('shortbow', 5), S('longbow', 5), S('birch_shortbow', 3), S('birch_longbow', 3), S('bronze_arrows', 500), S('iron_arrows', 300), S('steel_arrows', 100), S('bronze_dart', 300), S('iron_dart', 200),
    S('arrow_shaft', 500), S('headless_arrow', 200), S('bowstring', 50), S('feather', 500), S('leather_body', 3), S('leather_chaps', 3), S('leather_coif', 3), S('leather_vambraces', 3),
    // hunter gear
    S('bird_snare', 10), S('box_trap', 10), S('butterfly_net', 5), S('butterfly_jar', 50)],
});
registerShop({
  id: 'brackenford_herbalist', name: "Maeve's Remedies", sellRate: 1.0, buyRate: 0.5, restockTicks: 25,
  stock: [S('vial', 50), S('vial_of_water', 50), S('pestle_and_mortar', 5), S('grimy_sagewort', 5), S('grimy_bitterleaf', 3), S('sagewort_seed', 10), S('bitterleaf_seed', 5),
    S('might_potion_4', 3), S('precision_potion_4', 3), S('antidote_4', 5), S('restoration_potion_4', 3), S('beetle_shell', 30), S('rat_tail', 30), S('ashes', 30)],
});

// =================================================================================================
// Highmarch (higher tiers)
// =================================================================================================
registerShop({
  id: 'highmarch_arms', name: 'Highmarch Arms & Armour', sellRate: 1.1, buyRate: 0.55, restockTicks: 40,
  stock: [...tierSet('steel', WEAPONS, 3), ...tierSet('steel', ARMOUR, 3), S('wyrmward_shield', 3), S('highmarch_cape', 1)],
});
registerShop({
  id: 'highmarch_plate', name: "Dorran's Plate & Blade", sellRate: 1.15, buyRate: 0.55, restockTicks: 60,
  stock: [...tierSet('duskite', [...WEAPONS, ...ARMOUR], 2), ...tierSet('verdite', [...WEAPONS, ...ARMOUR], 1), S('steel_pickaxe', 3), S('duskite_pickaxe', 2), S('verdite_pickaxe', 1),
    S('steel_axe', 3), S('duskite_axe', 2), S('verdite_axe', 1)],
});
registerShop({
  id: 'highmarch_arcana', name: 'Highmarch Arcane Archive', sellRate: 1.1, buyRate: 0.5, restockTicks: 20,
  stock: [
    S('wind_sigil', 2000), S('water_sigil', 2000), S('earth_sigil', 2000), S('fire_sigil', 2000), S('mind_sigil', 2000), S('thorn_sigil', 300), S('rift_sigil', 250), S('nexus_sigil', 100),
    S('wind_battlestaff', 2), S('water_battlestaff', 2), S('earth_battlestaff', 2), S('fire_battlestaff', 2), S('adept_wand', 2),
    S('conjurer_hat', 3), S('conjurer_robe_top', 3), S('conjurer_robe_bottom', 3), S('conjurer_gloves', 3), S('conjurer_boots', 3),
    S('thaumaturge_hat', 1), S('thaumaturge_robe_top', 1), S('thaumaturge_robe_bottom', 1),
  ],
});
registerShop({
  id: 'highmarch_general', name: 'Highmarch Provisions', general: true, sellRate: 1.05, buyRate: 0.4, restockTicks: 20,
  stock: [S('bread', 20), S('cooked_chicken', 15), S('cake', 5), S('tinderbox', 5), S('hammer', 5), S('knife', 5), S('chisel', 5), S('iron_axe', 3), S('iron_pickaxe', 3), S('steel_axe', 2), S('steel_pickaxe', 2), S('cape_green', 2), S('cape_black', 2),
    S('bird_snare', 5), S('box_trap', 5), S('butterfly_net', 3), S('butterfly_jar', 20)],
});

// =================================================================================================
// Haverly Farms
// =================================================================================================
registerShop({
  id: 'haverly_farm_supplies', name: 'Haverly Seed & Tool', sellRate: 1.0, buyRate: 0.45, restockTicks: 30,
  stock: [S('rake', 5), S('seed_dibber', 5), S('spade', 5), S('watering_can', 5), S('compost', 20), S('plant_cure', 5),
    S('fieldroot_seed', 50), S('goldbulb_seed', 30), S('leafhead_seed', 20), S('sagewort_seed', 10), S('egg', 10), S('bucket_of_milk', 5)],
});

// =================================================================================================
// Wilderness bandit camp (Ashen Wastes) - pays well, charges a lot
// =================================================================================================
registerShop({
  id: 'wilderness_bandit_camp', name: "Corrin's Contraband", general: true, sellRate: 1.5, buyRate: 0.6, restockTicks: 50,
  stock: [S('cooked_meat', 20), S('stew', 10), S('restoration_potion_4', 3), S('might_potion_4', 2), S('antidote_4', 3), S('wyrmward_shield', 2), S('rift_sigil', 100), S('void_sigil', 30),
    S('duskite_scimitar', 2), S('duskite_battleaxe', 1), S('verdite_chainbody', 1), S('reavers_cloak', 1)],
});
