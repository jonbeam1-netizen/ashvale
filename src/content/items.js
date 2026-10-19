// Core items: currency, equipment, food, tools. OWNER: agent D (items/NPCs/world).
// Skill-specific resources (logs, ores, bars, fish, sigils...) live in that skill's content file.

import { registerItem, registerData } from '../core/registry.js';
import { METAL_TIERS } from '../core/constants.js';

const tier = (id) => METAL_TIERS.find((t) => t.id === id);

registerItem({ id: 'coins', name: 'Coins', examine: 'Lovely money!', stackable: true, value: 1, icon: { shape: 'coins', color: '#e8c040' } });
registerItem({ id: 'bones', name: 'Bones', examine: 'Bones are for burying!', value: 1, options: ['Bury'], icon: { shape: 'bones', color: '#eae4d4' } });
registerItem({ id: 'big_bones', name: 'Big bones', examine: 'Ew, they are still warm.', value: 15, options: ['Bury'], icon: { shape: 'bones', color: '#f4eedc' } });
registerItem({ id: 'feather', name: 'Feather', examine: 'Useful for fletching and fishing.', stackable: true, value: 2, icon: { shape: 'feather', color: '#f0f0f0' } });

// ---- tools ------------------------------------------------------------------------------------
registerItem({ id: 'tinderbox', name: 'Tinderbox', examine: 'Useful for lighting fires.', value: 1, icon: { shape: 'tinderbox' } });
registerItem({ id: 'hammer', name: 'Hammer', examine: 'Good for hitting things.', value: 1, icon: { shape: 'hammer', color: '#8a8a92' } });
registerItem({ id: 'knife', name: 'Knife', examine: 'A sharp knife.', value: 6, icon: { shape: 'knife', color: '#c0c0c8' } });
registerItem({ id: 'chisel', name: 'Chisel', examine: 'Good for detailed crafting.', value: 1, icon: { shape: 'chisel' } });
registerItem({ id: 'small_net', name: 'Small fishing net', examine: 'Useful for catching small fish.', value: 5, icon: { shape: 'string', color: '#c8b88a' } });

// ---- food -------------------------------------------------------------------------------------
registerItem({ id: 'bread', name: 'Bread', examine: 'Nice crusty bread.', value: 12, heal: 5, icon: { shape: 'bread', color: '#c8904a' } });
registerItem({ id: 'raw_beef', name: 'Raw beef', examine: 'I need to cook this first.', value: 1, icon: { shape: 'meat', color: '#c0504a' } });
registerItem({ id: 'cooked_meat', name: 'Cooked meat', examine: 'Mmm, this looks tasty.', value: 4, heal: 3, icon: { shape: 'meat', color: '#7a4a2a' } });
registerItem({ id: 'raw_chicken', name: 'Raw chicken', examine: 'I need to cook this first.', value: 1, icon: { shape: 'meat', color: '#e0a090' } });
registerItem({ id: 'cooked_chicken', name: 'Cooked chicken', examine: 'Mmm, this looks tasty.', value: 4, heal: 3, icon: { shape: 'meat', color: '#b07a40' } });

// ---- equipment --------------------------------------------------------------------------------
/** Helper used below; agent D may extend it to generate every metal tier. */
function weapon(t, kind, extra) {
  const T = tier(t);
  const names = { dagger: 'dagger', sword: 'sword', scimitar: 'scimitar', axe: 'axe', pickaxe: 'pickaxe', mace: 'mace' };
  return registerItem({
    id: `${t}_${kind}`, name: `${T.name} ${names[kind]}`, slot: 'weapon', weaponType: kind,
    requirements: { attack: T.level }, color: T.color, icon: { shape: kind, color: T.color }, ...extra,
  });
}

weapon('bronze', 'dagger', { value: 10, attackSpeed: 4, bonuses: { attackStab: 4, attackSlash: 2, attackCrush: -4, defenceStab: 0, strength: 3 } });
weapon('bronze', 'sword', { value: 26, attackSpeed: 4, bonuses: { attackStab: 4, attackSlash: 3, attackCrush: -1, strength: 5 } });
weapon('bronze', 'axe', { value: 16, attackSpeed: 5, bonuses: { attackStab: -2, attackSlash: 4, attackCrush: 2, strength: 5 } });
weapon('bronze', 'pickaxe', { value: 1, attackSpeed: 5, bonuses: { attackStab: 4, attackSlash: -2, attackCrush: 2, strength: 5 } });
weapon('iron', 'scimitar', { value: 112, attackSpeed: 4, bonuses: { attackStab: 2, attackSlash: 10, attackCrush: -2, strength: 9 } });
weapon('iron', 'axe', { value: 56, attackSpeed: 5, bonuses: { attackStab: -2, attackSlash: 5, attackCrush: 3, strength: 7 } });
weapon('iron', 'pickaxe', { value: 140, attackSpeed: 5, bonuses: { attackStab: 5, attackSlash: -2, attackCrush: 3, strength: 7 } });

registerItem({ id: 'bronze_med_helm', name: 'Bronze med helm', slot: 'head', value: 24, color: tier('bronze').color, icon: { shape: 'helm', color: tier('bronze').color }, bonuses: { defenceStab: 3, defenceSlash: 4, defenceCrush: 2, defenceMagic: -1, defenceRanged: 3 } });
registerItem({ id: 'bronze_platebody', name: 'Bronze platebody', slot: 'body', value: 160, color: tier('bronze').color, icon: { shape: 'platebody', color: tier('bronze').color }, bonuses: { attackMagic: -30, attackRanged: -10, defenceStab: 15, defenceSlash: 14, defenceCrush: 9, defenceMagic: -6, defenceRanged: 14 } });
registerItem({ id: 'bronze_platelegs', name: 'Bronze platelegs', slot: 'legs', value: 80, color: tier('bronze').color, icon: { shape: 'legs', color: tier('bronze').color }, model: { shape: 'platelegs' }, bonuses: { attackMagic: -21, attackRanged: -7, defenceStab: 8, defenceSlash: 7, defenceCrush: 6, defenceMagic: -4, defenceRanged: 7 } });
registerItem({ id: 'bronze_kiteshield', name: 'Bronze kiteshield', slot: 'shield', value: 68, color: tier('bronze').color, icon: { shape: 'shield', color: tier('bronze').color, color2: '#7a4a2a' }, bonuses: { attackMagic: -8, attackRanged: -2, defenceStab: 5, defenceSlash: 7, defenceCrush: 6, defenceMagic: -1, defenceRanged: 6 } });
registerItem({ id: 'iron_full_helm', name: 'Iron full helm', slot: 'head', value: 154, requirements: { defence: 10 }, color: tier('iron').color, icon: { shape: 'fullhelm', color: tier('iron').color }, bonuses: { attackMagic: -3, attackRanged: -1, defenceStab: 6, defenceSlash: 7, defenceCrush: 5, defenceMagic: -1, defenceRanged: 6 } });
registerItem({ id: 'wooden_shield', name: 'Wooden shield', slot: 'shield', value: 20, icon: { shape: 'round_shield', color: '#8a5a2a', color2: '#6a6a6a' }, model: { shape: 'round', color: '#8a5a2a' }, bonuses: { defenceStab: 4, defenceSlash: 5, defenceCrush: 3, defenceRanged: 4 } });
registerItem({ id: 'leather_boots', name: 'Leather boots', slot: 'feet', value: 6, icon: { shape: 'boots', color: '#6a4a2a' }, bonuses: { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 } });
registerItem({ id: 'leather_gloves', name: 'Leather gloves', slot: 'hands', value: 6, icon: { shape: 'gloves', color: '#7a5530' }, bonuses: { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 } });
registerItem({ id: 'wizard_hat_blue', name: 'Blue wizard hat', slot: 'head', value: 2, icon: { shape: 'hat', color: '#2a4aa8' }, model: { shape: 'wizard_hat', color: '#2a4aa8' }, bonuses: { attackMagic: 2, defenceMagic: 2 } });
registerItem({ id: 'traveller_cape', name: "Traveller's cape", slot: 'cape', value: 20, icon: { shape: 'cape', color: '#7a2a2a', color2: '#e8c040' }, model: { color: '#7a2a2a', color2: '#e8c040' }, bonuses: { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 } });

// Items given to a brand-new character (read by main.js).
registerData('starter', 'kit', [
  { id: 'bronze_axe', qty: 1 }, { id: 'bronze_pickaxe', qty: 1 }, { id: 'small_net', qty: 1 }, { id: 'tinderbox', qty: 1 },
  { id: 'bronze_dagger', qty: 1 }, { id: 'wooden_shield', qty: 1 }, { id: 'bread', qty: 3 }, { id: 'coins', qty: 25 },
]);
