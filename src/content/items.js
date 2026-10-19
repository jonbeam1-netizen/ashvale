// Core items: currency, equipment, food, tools. OWNER: agent D (items/NPCs/world).
// Skill-specific resources (logs, ores, bars, fish, sigils...) live in that skill's content file.

import { registerItem, registerData } from '../core/registry.js';
import './visuals.js';
import './items_metal.js';
import './items_gear.js';

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
// Metal tiers (bronze..emberite, every piece): items_metal.js. Magic gear, uniques, remains: items_gear.js.
// Icon shapes / equipment trims & glow / monster templates: visuals.js.
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
