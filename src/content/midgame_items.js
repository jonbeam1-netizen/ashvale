// The Glimmerdeep: mid-tier gear (levels 35-45, between the duskite and azurium tiers) + crafting materials,
// recipes, item effects and the collection-log source. OWNER: content designer (mid-game). Imported by
// midgame_dungeon.js. Balance notes (docs/BALANCE.md): bonuses sit between the neighbouring tiers of each style;
// values follow those tiers; hides only drop (no shop sells them), so sewing them is not a coin loop.
//
//  Ranged   Sporehide coif / body / chaps / vambraces (Ranged 35) - sewn from sporehide (Crafting 48-53)
//  Magic    Tidewoven hood / robe top / robe bottom (Magic 45) - drowned keeners, Vorlagh
//           Lanternwright's almanac (off-hand, Magic 40) - quest 1 reward; silt slugs, Lanternwright shades
//  Melee    Forgefather's hammer (Attack 45, +15% vs golems & elementals) - quest 4 reward; the Ashwright Engine
//           Slagweave gauntlets (Defence 45) - quest 3 reward; forge sentinels, the Engine
//  Jewels   Sporeward amulet (poison immunity) - quest 2 reward; Vorlagh, sporecap crawlers
//           Emberheart ring (+10% damage below half Hitpoints) - the Engine, cinderhorn lizards

import { registerItem, registerData } from '../core/registry.js';
import { recipe } from './recipes_util.js';
import { hook } from './quest_util.js';

const eq = (def) => registerItem({ ...def, model: { color: def.color, ...(def.model || {}) } });

// ---- materials ------------------------------------------------------------------------------------------
registerItem({ id: 'sporehide', name: 'Sporehide', examine: 'A tough, leathery skin of fungal felt. The spores have already cured it - a needle and thread will do the rest.',
  value: 90, icon: { shape: 'hide', color: '#8a6a5a', color2: '#c0ff60' } });

// ---- ranged: sporehide (Ranged 35) ------------------------------------------------------------------------
const SPORE = '#7a5e4e', SPORE2 = '#b8d070';
const SPORE_PIECES = [
  // id, name, slot, icon, model, hides, crafting level, value, bonuses, extra requirements
  ['sporehide_vambraces', 'Sporehide vambraces', 'hands', 'gloves', 'gloves', 1, 48, 270, { attackRanged: 7, defenceStab: 3, defenceSlash: 2, defenceCrush: 3, defenceMagic: 2 }],
  ['sporehide_chaps', 'Sporehide chaps', 'legs', 'legs', 'platelegs', 2, 50, 540, { attackMagic: -8, attackRanged: 7, defenceStab: 10, defenceSlash: 13, defenceCrush: 15, defenceMagic: 10, defenceRanged: 13 }],
  ['sporehide_coif', 'Sporehide coif', 'head', 'hood', 'coif', 2, 51, 540, { attackMagic: -1, attackRanged: 3, defenceStab: 3, defenceSlash: 6, defenceCrush: 8, defenceMagic: 3, defenceRanged: 7 }],
  ['sporehide_body', 'Sporehide body', 'body', 'chainbody', 'chainbody', 3, 53, 810, { attackMagic: -12, attackRanged: 13, defenceStab: 15, defenceSlash: 23, defenceCrush: 20, defenceMagic: 17, defenceRanged: 22 }, { defence: 30 }],
];
for (const [id, name, slot, icon, model, hides, level, value, bonuses, req = {}] of SPORE_PIECES) {
  eq({ id, name, examine: 'Fungal leather, light and springy. It smells faintly of mushrooms after rain.', slot, value, requirements: { ranged: 35, ...req }, bonuses,
    color: SPORE, icon: { shape: icon, color: SPORE, color2: SPORE2 }, model: { shape: model, color: SPORE, trim: SPORE2 } });
  recipe({ id: `sew_${id}`, skill: 'crafting', category: 'leather', level, xp: 55 * hides, tools: ['needle'], thread: 1, ticks: 3,
    inputs: [{ id: 'sporehide', qty: hides }], outputs: [{ id, qty: 1 }], verb: 'sew' });
}

// ---- magic: tidewoven robes (Magic 45) + the almanac ------------------------------------------------------
const TIDE = '#2a5a6a', TIDE2 = '#a0e8e0';
eq({ id: 'tidewoven_hood', name: 'Tidewoven hood', examine: 'Woven from river-weed and drowned silk. It never quite dries.', value: 4000, slot: 'head',
  requirements: { magic: 45, defence: 22 }, bonuses: { attackMagic: 11, defenceMagic: 11, defenceStab: 2, defenceSlash: 2, prayer: 1 },
  color: TIDE, icon: { shape: 'hood', color: TIDE, color2: TIDE2 }, model: { shape: 'hood', trim: TIDE2 } });
eq({ id: 'tidewoven_robe_top', name: 'Tidewoven robe top', examine: 'The keeners wore these into the flood. The flood did not want them.', value: 12000, slot: 'body',
  requirements: { magic: 45, defence: 22 }, bonuses: { attackMagic: 19, defenceMagic: 19, defenceStab: 4, defenceSlash: 4, defenceCrush: 4, magicDamage: 2, prayer: 1 },
  color: TIDE, icon: { shape: 'robe_top', color: TIDE, color2: TIDE2 }, model: { shape: 'robe_top', trim: TIDE2, color2: TIDE2 } });
eq({ id: 'tidewoven_robe_bottom', name: 'Tidewoven robe bottom', examine: 'A long robe of river-weed and silk, cold as the Silverrun.', value: 8000, slot: 'legs',
  requirements: { magic: 45, defence: 22 }, bonuses: { attackMagic: 15, defenceMagic: 15, defenceStab: 3, defenceSlash: 3, prayer: 1 },
  color: TIDE, icon: { shape: 'skirt', color: TIDE, color2: TIDE2 }, model: { shape: 'robe', trim: TIDE2 } });
eq({ id: 'lanternwright_almanac', name: "Lanternwright's almanac", examine: 'Star tables, tide tables and lamp-oil recipes, bound in brass. Holding it, spells come a little easier.', value: 6000, slot: 'shield',
  requirements: { magic: 40 }, bonuses: { attackMagic: 8, defenceMagic: 6, defenceStab: 2, defenceSlash: 2, magicDamage: 1, prayer: 2 },
  color: '#6a4a2a', icon: { shape: 'book', color: '#6a4a2a', color2: '#e8c060' }, model: { shape: 'square', color: '#6a4a2a', trim: '#e8c060' } });

// ---- melee: the Forgefather's hammer + slagweave gauntlets --------------------------------------------------
eq({ id: 'forgefather_hammer', name: "Forgefather's hammer", examine: 'The Lanternwright master-hammer. It rings like a bell against anything made of stone or iron.', value: 7000,
  slot: 'weapon', weaponType: 'warhammer', attackSpeed: 6, requirements: { attack: 45 }, bonuses: { attackStab: -4, attackSlash: -4, attackCrush: 48, strength: 44 },
  constructBane: 0.15, color: '#4a4440', icon: { shape: 'warhammer', color: '#5a5450', color2: '#ffb030' }, model: { shape: 'warhammer', color2: '#ffb030', glow: '#ff8a20' } });
eq({ id: 'slagweave_gauntlets', name: 'Slagweave gauntlets', examine: 'Mail woven from drawn slag-wire, still faintly warm.', value: 2000, slot: 'hands',
  requirements: { defence: 45 }, bonuses: { attackStab: 7, attackSlash: 7, attackCrush: 7, defenceStab: 8, defenceSlash: 8, defenceCrush: 8, defenceMagic: 6, defenceRanged: 8, strength: 3 },
  color: '#4a4038', icon: { shape: 'gloves', color: '#4a4038', color2: '#ff8a30' } });

// ---- jewellery with effects ----------------------------------------------------------------------------------
eq({ id: 'sporeward_amulet', name: 'Sporeward amulet', examine: 'A cap of the heart-root, dried hard and set in silver. Poison simply will not take hold of you.', value: 4000, slot: 'neck',
  bonuses: { attackStab: 5, attackSlash: 5, attackCrush: 5, attackMagic: 3, attackRanged: 3, defenceStab: 3, defenceSlash: 3, defenceCrush: 3, defenceMagic: 3, defenceRanged: 3, strength: 2, prayer: 2 },
  poisonWard: true, color: '#c0d0a0', icon: { shape: 'amulet', color: '#c8c8d0', color2: '#a0d060' } });
eq({ id: 'emberheart_ring', name: 'Emberheart ring', examine: 'A band of forge-iron around a coal that never cools. It burns hotter the closer you are to falling.', value: 15000, slot: 'ring',
  bonuses: { attackStab: 2, attackSlash: 2, attackCrush: 2, attackRanged: 2, attackMagic: 2, strength: 3 },
  lastStand: 0.1, color: '#5a3a2a', icon: { shape: 'ring', color: '#5a4a40', color2: '#ff6a20' } });

export const GD_GEAR = ['sporehide_coif', 'sporehide_body', 'sporehide_chaps', 'sporehide_vambraces', 'tidewoven_hood', 'tidewoven_robe_top', 'tidewoven_robe_bottom',
  'lanternwright_almanac', 'forgefather_hammer', 'slagweave_gauntlets', 'sporeward_amulet', 'emberheart_ring'];

// ---- collection log ----------------------------------------------------------------------------------------
registerData('collection_source', 'glimmerdeep', {
  cat: 'Rare drops', name: 'The Glimmerdeep', order: 55,
  items: GD_GEAR.filter((id) => !id.startsWith('sporehide_')),
  kc: ['drowned_delver', 'gillback_raider', 'silt_slug', 'drowned_keener', 'sporecap_crawler', 'gloomcap_weaver', 'mycelid_shambler', 'vorlagh_sporebound',
    'slag_hound', 'cinderhorn_lizard', 'forge_sentinel', 'lanternwright_shade', 'ashwright_engine'],
});

// ---- item effects (local player) -------------------------------------------------------------------------------
hook((game) => {
  // Sporeward amulet: cures poison and keeps it off while worn
  game.onTick(() => {
    const p = game.player;
    if (p.dead || p.equipment.ids().neck !== 'sporeward_amulet' || !game.combat?.curePoison) return;
    const st = p.store('combat');
    if (game.combat.isPoisoned(p) || !(st.poisonImmune > 1)) {
      if (game.combat.curePoison(p, 3)) game.message('<col=4a7a1a>Your sporeward amulet drinks the poison from your blood.</col>');
    }
  }, 60);
  // Forgefather's hammer (vs golems / elementals) and the Emberheart ring (below half Hitpoints)
  game.events.on('damage:before', (e) => {
    const p = game.player;
    if (e.source !== p || e.target?.type !== 'npc' || !(e.amount > 0)) return;
    const ids = p.equipment.ids();
    let mult = 1;
    if (ids.weapon === 'forgefather_hammer' && ['golems', 'elementals'].includes(e.target.def?.slayerCategory)) mult += 0.15;
    if (ids.ring === 'emberheart_ring' && p.hp < p.maxHp / 2) mult += 0.1;
    if (mult > 1) e.amount = Math.max(e.amount + 1, Math.floor(e.amount * mult + 0.5));
  });
});
