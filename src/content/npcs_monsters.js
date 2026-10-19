// Monsters and bosses. OWNER: agent D (D2). Imported by npcs.js. Roster: see the comment at the top of npcs.js.
//
// Extra NPC fields (read by other systems; all optional):
//   slayerLevel, slayerCategory          - agent F (slayer requirement / task grouping)
//   tags: ['undead'|'demon'|'dragon'|'boss'|...]
//   attacks: [{ style: 'melee'|'ranged'|'magic', maxHit, weight, range, projectileColor, effect? }]  - agent A
//        effects used: 'dragonfire' (blocked by antiDragonfire shields / protect-magic), 'poison', 'freeze',
//                      'drain_prayer', 'aoe' (hits everyone near the target), 'heal' (boss heals by damage dealt)
//   projectileColor                      - for single-style ranged/magic NPCs
//   attackAnim                           - 'shoot' | 'cast' | 'slash' | 'stab' | 'crush'
//   boss: true                           - large health bar etc. (cosmetic for others)

import { registerNpc } from '../core/registry.js';

/** Registers a monster; combatLevel and maxHit are derived from the stats unless given. */
function m(def) {
  const s = { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10, ...(def.stats || {}) };
  const melee = 0.325 * (s.attack + s.strength);
  const ranged = 0.325 * 1.5 * s.ranged;
  const magic = 0.325 * 1.5 * s.magic;
  const cl = Math.max(1, Math.floor(0.25 * (s.defence + s.hitpoints) + Math.max(melee, ranged, magic)));
  const style = def.attackStyle || 'crush';
  const b = def.bonuses || {};
  const offStat = style === 'ranged' ? s.ranged : style === 'magic' ? s.magic : s.strength;
  const offBonus = style === 'ranged' ? (b.rangedStrength || 0) : style === 'magic' ? 0 : (b.strength || 0);
  const maxHit = Math.max(1, Math.floor(0.5 + ((offStat + 9) * (64 + offBonus)) / 640));
  const anim = def.attackAnim || (style === 'ranged' ? 'shoot' : style === 'magic' ? 'cast' : undefined);
  return registerNpc({
    options: ['Attack'], respawnTicks: Math.min(150, 25 + Math.floor(cl / 2)), wanderRadius: 4,
    dropTable: def.id,
    ...def,
    ...(anim ? { attackAnim: anim } : {}),
    stats: s,
    combatLevel: def.combatLevel ?? cl,
    maxHit: def.maxHit ?? maxHit,
  });
}
/** Even defensive bonus block. */
const armour = (n, mag = n, rng = n) => ({ defenceStab: n, defenceSlash: n, defenceCrush: n, defenceMagic: mag, defenceRanged: rng });
const acc = (style, n) => ({ stab: { attackStab: n }, slash: { attackSlash: n }, crush: { attackCrush: n }, ranged: { attackRanged: n }, magic: { attackMagic: n } }[style]);
const fire = (maxHit, weight = 1, color = '#ff6020') => ({ style: 'magic', maxHit, weight, range: 6, projectileColor: color, effect: 'dragonfire' });

// =================================================================================================
// Critters & beasts
// =================================================================================================
m({ id: 'chicken', name: 'Chicken', examine: 'Yep, definitely a chicken.', stats: { attack: 1, strength: 1, defence: 1, hitpoints: 3 }, respawnTicks: 25, slayerCategory: 'birds', model: { template: 'chicken' } });
m({ id: 'cow', name: 'Cow', examine: 'Converts grass to beef.', stats: { attack: 1, strength: 1, defence: 1, hitpoints: 8 }, respawnTicks: 30, slayerCategory: 'cows', model: { template: 'cow' } });
m({ id: 'giant_rat', name: 'Giant rat', examine: 'Overgrown vermin.', aggressive: true, aggroRange: 2, attackStyle: 'stab',
  stats: { attack: 2, strength: 3, defence: 2, hitpoints: 5 }, respawnTicks: 25, slayerCategory: 'rats', model: { template: 'rat', scale: 1.3 } });
m({ id: 'marsh_toad', name: 'Marsh toad', examine: 'A fat toad with a surprisingly nasty bite.', attackStyle: 'crush',
  stats: { attack: 4, strength: 3, defence: 3, hitpoints: 7 }, slayerCategory: 'toads', model: { template: 'toad', scale: 0.9, colors: { body: '#5a6a2a', belly: '#c8c890' } } });
m({ id: 'saltmarsh_crab', name: 'Saltmarsh crab', examine: 'It snaps its claws at anything that moves.', attackStyle: 'crush', aggressive: true, aggroRange: 2,
  stats: { attack: 6, strength: 6, defence: 9, hitpoints: 12 }, bonuses: armour(8, 0, 12), slayerCategory: 'crabs', model: { template: 'crab', scale: 0.9, colors: { body: '#c8502a' } } });
m({ id: 'wild_boar', name: 'Wild boar', examine: 'Bristles, tusks and a very bad temper.', attackStyle: 'stab',
  stats: { attack: 8, strength: 9, defence: 6, hitpoints: 14 }, slayerCategory: 'boars', model: { template: 'boar' } });
m({ id: 'timber_wolf', name: 'Timber wolf', examine: 'A lean grey hunter of the Thornwood.', attackStyle: 'stab', aggressive: true, aggroRange: 4,
  stats: { attack: 13, strength: 13, defence: 10, hitpoints: 18 }, slayerCategory: 'wolves', model: { template: 'wolf', scale: 1.05, colors: { body: '#7a6a58', belly: '#b8aa98' } } });
m({ id: 'dune_scorpion', name: 'Dune scorpion', examine: 'Its sting glistens in the sun.', attackStyle: 'stab', aggressive: true, aggroRange: 2,
  stats: { attack: 12, strength: 12, defence: 14, hitpoints: 16 }, bonuses: armour(10, 0, 10), slayerCategory: 'scorpions', model: { template: 'scorpion', scale: 0.8, colors: { body: '#c8a060' }, sting: '#6a3a1a' } });
m({ id: 'thornwood_bear', name: 'Thornwood bear', examine: 'A huge brown bear. Best not to startle it.', attackStyle: 'slash', attackSpeed: 5,
  stats: { attack: 18, strength: 20, defence: 16, hitpoints: 30 }, slayerCategory: 'bears', model: { template: 'bear' } });
m({ id: 'giant_spider', name: 'Thornwood spider', examine: 'A hairy, venomous arachnid.', aggressive: true, aggroRange: 3, attackStyle: 'stab',
  stats: { attack: 5, strength: 4, defence: 3, hitpoints: 12 }, respawnTicks: 30, slayerCategory: 'spiders',
  model: { template: 'spider', scale: 1.4, colors: { body: '#3a2a20', abdomen: '#4a3020' }, marking: '#c08020' } });
m({ id: 'cave_bat', name: 'Cave bat', examine: 'It flaps about in the dark.', aggressive: true, attackStyle: 'stab',
  stats: { attack: 5, strength: 4, defence: 4, hitpoints: 8 }, respawnTicks: 25, wanderRadius: 5, slayerCategory: 'bats', model: { template: 'bat' } });
m({ id: 'dread_wolf', name: 'Dread wolf', examine: 'A snarling wilderness predator.', aggressive: true, aggroRange: 4, attackStyle: 'stab',
  stats: { attack: 22, strength: 20, defence: 18, hitpoints: 30 }, respawnTicks: 40, slayerCategory: 'wolves',
  model: { template: 'wolf', scale: 1.25, colors: { body: '#4a4642', belly: '#8a8680', eyes: '#d02020' } } });
m({ id: 'ironshell_crab', name: 'Ironshell crab', examine: 'Its shell is as hard as forged iron.', attackStyle: 'crush', aggressive: true, aggroRange: 2, attackSpeed: 5,
  stats: { attack: 28, strength: 30, defence: 40, hitpoints: 36 }, bonuses: armour(40, 10, 60), slayerCategory: 'crabs',
  model: { template: 'crab', scale: 1.6, colors: { body: '#4a5a6a', eyes: '#ffcc40' } } });
m({ id: 'pitch_scorpion', name: 'Pitch scorpion', examine: 'Black as the cave it lurks in.', attackStyle: 'stab', aggressive: true, aggroRange: 3, poisonous: true,
  stats: { attack: 32, strength: 34, defence: 30, hitpoints: 40 }, bonuses: armour(20), slayerCategory: 'scorpions',
  model: { template: 'scorpion', scale: 1.2, colors: { body: '#2a2a2a', eyes: '#ff3020' }, sting: '#c02020' } });
m({ id: 'rimefang_wolf', name: 'Rimefang wolf', examine: 'Its breath freezes in the air.', attackStyle: 'stab', aggressive: true, aggroRange: 5,
  stats: { attack: 38, strength: 38, defence: 34, hitpoints: 46 }, slayerCategory: 'wolves',
  model: { template: 'wolf', scale: 1.35, colors: { body: '#d8e4ec', belly: '#ffffff', eyes: '#40a0ff' } } });
m({ id: 'gloom_widow', name: 'Gloom widow', examine: 'A spider the size of a cart, with a blood-red mark.', attackStyle: 'stab', aggressive: true, aggroRange: 4, poisonous: true,
  stats: { attack: 50, strength: 48, defence: 46, hitpoints: 58 }, bonuses: armour(25), slayerCategory: 'spiders', size: 2,
  model: { template: 'spider', scale: 2.2, colors: { body: '#141414', abdomen: '#1a1a1a', eyes: '#ff2020' }, marking: '#c01818' } });

// =================================================================================================
// Goblin-kin
// =================================================================================================
m({ id: 'goblin', name: 'Goblin', examine: 'An ugly green creature.', stats: { attack: 1, strength: 1, defence: 1, hitpoints: 5 }, respawnTicks: 30, slayerCategory: 'goblins',
  model: { template: 'goblin', equipment: { weapon: 'bronze_dagger' } } });
m({ id: 'goblin_scout', name: 'Goblin scout', examine: 'Twitchy, with a crooked little bow.', attackStyle: 'ranged', attackRange: 6, projectileColor: '#c8a060', aggressive: true, aggroRange: 5,
  stats: { attack: 2, strength: 2, defence: 3, ranged: 8, hitpoints: 8 }, slayerCategory: 'goblins',
  model: { template: 'goblin', colors: { top: '#4a6a2a', legs: '#3a3a20' }, equipment: { weapon: { shape: 'bow', color: '#6a4a2a' }, head: { shape: 'hood', color: '#4a5a2a' } } } });
m({ id: 'goblin_brute', name: 'Goblin brute', examine: 'A goblin that ate all the other goblins\' dinners.', attackStyle: 'crush', attackSpeed: 5,
  stats: { attack: 10, strength: 11, defence: 9, hitpoints: 16 }, bonuses: armour(6), slayerCategory: 'goblins',
  model: { template: 'goblin', scale: 1.3, colors: { skin: '#4a7a2a', top: '#5a3a2a' }, equipment: { weapon: 'iron_mace', body: 'bronze_chainbody', head: 'bronze_med_helm' } } });
m({ id: 'goblin_shaman', name: 'Goblin shaman', examine: 'It mutters, and the air crackles.', attackStyle: 'magic', attackRange: 6, projectileColor: '#80ff40',
  stats: { attack: 2, strength: 2, defence: 8, magic: 16, hitpoints: 14 }, bonuses: { attackMagic: 10, ...armour(2, 12, 2) }, slayerCategory: 'goblins',
  model: { template: 'goblin', colors: { skin: '#7aa04a', top: '#6a2a5a', legs: '#4a2a3a' }, extras: { glowEyes: '#80ff40' },
    equipment: { weapon: { shape: 'staff', color: '#80ff40', glow: '#80ff40' }, head: { shape: 'hood', color: '#6a2a5a', trim: '#e8c040' }, body: { shape: 'robe_top', color: '#6a2a5a' } } } });

// =================================================================================================
// Humanoids
// =================================================================================================
m({ id: 'villager', name: 'Villager', examine: 'One of the local folk.', options: ['Talk-to', 'Attack', 'Pickpocket'], dialogue: 'villager',
  stats: { attack: 1, strength: 1, defence: 1, hitpoints: 7 }, respawnTicks: 30, slayerCategory: 'humans',
  model: { template: 'human', colors: { top: '#6a5a4a', legs: '#4a4a5a' }, equipment: {} } });
m({ id: 'farmer', name: 'Farmer', examine: 'Weathered hands and a sunburnt neck.', options: ['Talk-to', 'Attack', 'Pickpocket'], dialogue: 'farmer',
  stats: { attack: 5, strength: 5, defence: 5, hitpoints: 12 }, slayerCategory: 'humans',
  model: { template: 'human', colors: { top: '#8a7a4a', legs: '#4a5a7a', hair: '#8a6a3a' }, extras: { beard: true }, equipment: { weapon: { shape: 'pickaxe', color: '#8a8a8a' } } } });
m({ id: 'highway_bandit', name: 'Highway bandit', examine: 'He has a very sharp knife and very few morals.', attackStyle: 'stab', aggressive: true, aggroRange: 4,
  stats: { attack: 16, strength: 16, defence: 14, hitpoints: 22 }, bonuses: { attackStab: 10, ...armour(8, 2, 8) }, slayerCategory: 'bandits',
  model: { template: 'human', colors: { top: '#4a3a2a', legs: '#2a2a2a', hair: '#1a1a1a' }, equipment: { weapon: 'iron_dagger', head: { shape: 'hood', color: '#2a2622' }, cape: { shape: 'cape', color: '#3a3026' } } } });
m({ id: 'town_guard', name: 'Guard', examine: 'Keeps the peace. Mostly.', options: ['Talk-to', 'Attack', 'Pickpocket'], dialogue: 'guard', attackStyle: 'slash',
  stats: { attack: 19, strength: 18, defence: 18, hitpoints: 22 }, bonuses: { attackSlash: 12, strength: 10, ...armour(25, -2, 22) }, slayerCategory: 'humans',
  model: { template: 'human', colors: { top: '#7a2a2a', legs: '#3a3a42' }, equipment: { weapon: 'iron_sword', head: 'guard_helm', body: 'iron_chainbody', shield: 'iron_sq_shield', legs: 'iron_platelegs' } } });
m({ id: 'highmarch_knight', name: 'Highmarch knight', examine: 'Sworn to defend Highmarch, and very proud of it.', options: ['Talk-to', 'Attack'], dialogue: 'knight', attackStyle: 'slash', attackSpeed: 5,
  stats: { attack: 44, strength: 40, defence: 46, hitpoints: 44 }, bonuses: { attackSlash: 40, strength: 38, ...armour(70, -5, 65) }, slayerCategory: 'humans',
  model: { template: 'human', colors: { top: '#2a3a6a', legs: '#2a2a3a' }, equipment: { weapon: 'steel_longsword', head: 'steel_full_helm', body: 'steel_platebody', legs: 'steel_platelegs', shield: 'steel_kiteshield', cape: 'highmarch_cape' } } });
m({ id: 'ashcult_acolyte', name: 'Ashcult acolyte', examine: 'A soot-faced follower of the Ashcult.', attackStyle: 'magic', attackRange: 6, projectileColor: '#ff6a20', aggressive: true, aggroRange: 3,
  stats: { attack: 4, strength: 4, defence: 12, magic: 18, hitpoints: 18 }, bonuses: { attackMagic: 8, ...armour(4, 10, 4) }, slayerCategory: 'cultists',
  model: { template: 'human', colors: { skin: '#b8a090', hair: '#1a1a1a' }, equipment: { head: 'cultist_hood', body: 'cultist_robe_top', legs: 'cultist_robe_bottom', weapon: 'apprentice_wand' } } });
m({ id: 'ashcult_zealot', name: 'Ashcult zealot', examine: 'Their eyes glow like coals.', attackStyle: 'magic', attackRange: 7, projectileColor: '#ff4010', aggressive: true, aggroRange: 4,
  stats: { attack: 20, strength: 20, defence: 30, magic: 40, hitpoints: 40 }, bonuses: { attackMagic: 20, ...armour(15, 25, 15) }, slayerCategory: 'cultists',
  model: { template: 'human', colors: { skin: '#a89080', hair: '#1a1a1a' }, extras: { glowEyes: '#ff6a20' },
    equipment: { head: { shape: 'hood', color: '#2a2220', trim: '#c02a1a' }, body: { shape: 'robe_top', color: '#2a2220', trim: '#c02a1a', glow: '#ff6a20' }, legs: { shape: 'robe', color: '#2a2220', trim: '#c02a1a' }, weapon: 'fire_battlestaff' } } });
m({ id: 'hedge_wizard', name: 'Hedge wizard', examine: 'A wizard who learned his trade from the wrong books.', attackStyle: 'magic', attackRange: 7, projectileColor: '#a060ff', aggressive: true, aggroRange: 4,
  stats: { attack: 8, strength: 8, defence: 14, magic: 28, hitpoints: 22 }, bonuses: { attackMagic: 14, ...armour(3, 14, 3) }, slayerCategory: 'wizards',
  model: { template: 'human', colors: { top: '#22222a', legs: '#22222a', hair: '#5a5a5a' }, extras: { beard: true }, equipment: { head: 'wizard_hat_black', body: { shape: 'robe_top', color: '#22222a', trim: '#7a3aa8' }, legs: { shape: 'robe', color: '#22222a' }, weapon: 'mages_staff' } } });
m({ id: 'saltmarsh_corsair', name: 'Saltmarsh corsair', examine: 'Smells of brine and bad decisions.', attackStyle: 'slash', aggressive: true, aggroRange: 3,
  stats: { attack: 24, strength: 24, defence: 20, hitpoints: 28 }, bonuses: { attackSlash: 14, strength: 12, ...armour(12, 0, 12) }, slayerCategory: 'pirates',
  model: { template: 'human', colors: { top: '#e8e4d8', legs: '#2a3a5a', hair: '#3a2a1a' }, equipment: { weapon: 'iron_scimitar', head: { shape: 'coif', color: '#a82a2a' }, feet: { shape: 'boots', color: '#1a1a1a' } } } });
m({ id: 'wasteland_reaver', name: 'Wasteland reaver', examine: 'A raider of the Ashen Wastes, scarred and patient.', attackStyle: 'slash', aggressive: true, aggroRange: 5, attackSpeed: 5,
  stats: { attack: 32, strength: 32, defence: 28, hitpoints: 36 }, bonuses: { attackSlash: 30, strength: 30, ...armour(30, -3, 28) }, slayerCategory: 'bandits',
  model: { template: 'human', colors: { top: '#3a3430', legs: '#2a2420', skin: '#b08a6a', hair: '#2a1a10' }, extras: { beard: true },
    equipment: { weapon: 'duskite_battleaxe', body: 'duskite_chainbody', head: { shape: 'hood', color: '#3a3430' }, cape: 'reavers_cloak' } } });
m({ id: 'stormcaller', name: 'Stormcaller', examine: 'Lightning dances between her fingers.', attackStyle: 'magic', attackRange: 8, projectileColor: '#c0e8ff', aggressive: true, aggroRange: 5,
  stats: { attack: 20, strength: 20, defence: 40, magic: 60, hitpoints: 50 }, bonuses: { attackMagic: 30, ...armour(15, 40, 15) }, slayerCategory: 'wizards',
  model: { template: 'human', female: true, hairStyle: 'long', colors: { hair: '#e8e8f0', skin: '#c8a888' }, extras: { glowEyes: '#c0e8ff' },
    equipment: { head: 'thaumaturge_hat', body: 'thaumaturge_robe_top', legs: 'thaumaturge_robe_bottom', weapon: 'wind_battlestaff' } } });
m({ id: 'fen_stalker', name: 'Fen stalker', examine: 'A scaled hunter that moves silently through the reeds.', attackStyle: 'stab', aggressive: true, aggroRange: 4,
  stats: { attack: 42, strength: 40, defence: 36, hitpoints: 46 }, bonuses: { attackStab: 30, strength: 25, ...armour(25, 5, 20) }, slayerCategory: 'lizardfolk',
  model: { template: 'lizardfolk', equipment: { weapon: { shape: 'spear', color: '#8a8a7a' }, body: { shape: 'chainbody', color: '#5a4a2a' } } } });
m({ id: 'marsh_ogre', name: 'Marsh ogre', examine: 'Huge, hungry and not very bright.', attackStyle: 'crush', attackSpeed: 6, size: 2,
  stats: { attack: 46, strength: 52, defence: 40, hitpoints: 60 }, bonuses: { strength: 20, ...armour(20, 0, 20) }, slayerCategory: 'ogres',
  model: { template: 'ogre', equipment: { weapon: { shape: 'mace', color: '#5a3d24' } } } });
m({ id: 'crag_troll', name: 'Crag troll', examine: 'Its hide is like weathered granite.', attackStyle: 'crush', attackSpeed: 5, aggressive: true, aggroRange: 5, size: 2,
  stats: { attack: 60, strength: 62, defence: 55, hitpoints: 80 }, bonuses: { strength: 30, ...armour(40, 10, 40) }, slayerCategory: 'trolls',
  model: { template: 'troll', equipment: { weapon: { shape: 'mace', color: '#7a756c' } } } });

// =================================================================================================
// Undead
// =================================================================================================
m({ id: 'zombie', name: 'Zombie', examine: 'The walking dead.', aggressive: true, stats: { attack: 10, strength: 10, defence: 10, hitpoints: 20 }, respawnTicks: 40, tags: ['undead'], slayerCategory: 'zombies',
  model: { template: 'zombie' } });
m({ id: 'wailing_shade', name: 'Wailing shade', examine: 'A sorrowful spirit. Its touch is freezing cold.', attackStyle: 'magic', attackRange: 1, aggressive: true, tags: ['undead'],
  stats: { attack: 10, strength: 10, defence: 14, magic: 20, hitpoints: 25 }, bonuses: armour(30, 0, 30), slayerCategory: 'ghosts',
  model: { template: 'ghost' } });
m({ id: 'skeleton', name: 'Skeleton', examine: 'Could do with gaining a few pounds.', aggressive: true, attackStyle: 'slash',
  stats: { attack: 17, strength: 17, defence: 17, hitpoints: 24 }, respawnTicks: 40, tags: ['undead'], slayerCategory: 'skeletons',
  model: { template: 'skeleton', equipment: { weapon: 'iron_scimitar' } } });
m({ id: 'drowned_one', name: 'Drowned one', examine: 'It has been under the bog for a very long time.', aggressive: true, attackStyle: 'crush',
  stats: { attack: 26, strength: 26, defence: 22, hitpoints: 32 }, tags: ['undead'], slayerCategory: 'zombies',
  model: { template: 'zombie', colors: { skin: '#5a8a8a', top: '#3a4a2a', legs: '#2a3a2a', eyes: '#80ffe0' }, extras: { glowEyes: '#80ffe0' } } });
m({ id: 'bone_archer', name: 'Bone archer', examine: 'It never seems to run out of arrows.', aggressive: true, attackStyle: 'ranged', attackRange: 7, projectileColor: '#e6e0cc',
  stats: { attack: 8, strength: 8, defence: 22, ranged: 32, hitpoints: 28 }, bonuses: { attackRanged: 15, ...armour(10, 5, 20) }, tags: ['undead'], slayerCategory: 'skeletons',
  model: { template: 'skeleton', colors: { skin: '#d8d0b8' }, equipment: { weapon: { shape: 'bow', color: '#5a4a3a' } } } });
m({ id: 'skeleton_warden', name: 'Skeleton warden', examine: 'Still guarding the ruins, centuries after its masters fell.', aggressive: true, attackStyle: 'slash', attackSpeed: 5,
  stats: { attack: 54, strength: 54, defence: 56, hitpoints: 60 }, bonuses: { attackSlash: 40, strength: 40, ...armour(70, 10, 60) }, tags: ['undead'], slayerCategory: 'skeletons',
  model: { template: 'skeleton', scale: 1.15, colors: { skin: '#c8c0a8' }, extras: { glowEyes: '#60c0ff' }, equipment: { weapon: 'duskite_longsword', shield: 'duskite_kiteshield' } } });
m({ id: 'grave_wraith', name: 'Grave wraith', examine: 'A hooded shadow that drinks warmth from the living.', attackStyle: 'magic', attackRange: 6, projectileColor: '#4a2a6a', aggressive: true, aggroRange: 5,
  stats: { attack: 30, strength: 30, defence: 52, magic: 70, hitpoints: 64 }, bonuses: { attackMagic: 30, ...armour(60, 30, 60) }, tags: ['undead'], slayerCategory: 'ghosts',
  model: { template: 'ghost', hairStyle: 'bald', colors: { skin: '#2a2a3a', top: '#1a1a24', legs: '#1a1a24' }, extras: { glowEyes: '#a060ff' }, equipment: { head: { shape: 'hood', color: '#1a1a24' } } } });
m({ id: 'ash_revenant', name: 'Ash revenant', examine: 'A dead raider, still raiding.', attackStyle: 'slash', aggressive: true, aggroRange: 6, attackSpeed: 5,
  stats: { attack: 80, strength: 80, defence: 78, hitpoints: 100 }, bonuses: { attackSlash: 60, strength: 55, ...armour(80, 40, 80) }, tags: ['undead'], slayerCategory: 'revenants',
  attacks: [{ style: 'melee', maxHit: 18, weight: 3 }, { style: 'magic', maxHit: 16, weight: 1, range: 7, projectileColor: '#ff5020' }],
  model: { template: 'ghost', scale: 1.15, hairStyle: 'bald', colors: { skin: '#5a5048', top: '#3a3430', legs: '#3a3430' }, extras: { glowEyes: '#ff5020' }, equipment: { weapon: 'reaver_axe', head: { shape: 'hood', color: '#3a3430', trim: '#8a1a1a' } } } });

// =================================================================================================
// Giants
// =================================================================================================
m({ id: 'highland_giant', name: 'Highland giant', examine: 'A very large, very hairy brute.', aggressive: true, attackStyle: 'crush', attackSpeed: 6, size: 2,
  stats: { attack: 18, strength: 22, defence: 26, hitpoints: 35 }, respawnTicks: 50, slayerCategory: 'giants',
  model: { template: 'giant', equipment: { weapon: { shape: 'mace', color: '#6a4a2a' } } } });
m({ id: 'mosshide_giant', name: 'Mosshide giant', examine: 'Moss grows thick on its shoulders. It seems not to mind.', attackStyle: 'crush', attackSpeed: 6, size: 2,
  stats: { attack: 34, strength: 38, defence: 32, hitpoints: 50 }, bonuses: armour(15), slayerCategory: 'giants',
  model: { template: 'giant', colors: { skin: '#7a9a5a', top: '#4a6a3a', legs: '#3a4a2a', hair: '#3a5a2a' }, equipment: { weapon: { shape: 'mace', color: '#4a3a2a' } } } });
m({ id: 'rime_giant', name: 'Rime giant', examine: 'Icicles hang from its beard.', aggressive: true, attackStyle: 'crush', attackSpeed: 6, size: 2,
  stats: { attack: 44, strength: 48, defence: 44, hitpoints: 64 }, bonuses: armour(25, 10, 25), slayerCategory: 'giants',
  model: { template: 'giant', colors: { skin: '#9ab8d8', top: '#c8d8e8', legs: '#6a7a9a', hair: '#f0f4ff', eyes: '#2060c0' }, equipment: { weapon: { shape: 'warhammer', color: '#bfe8ff', glow: '#a0e8ff' } } } });
m({ id: 'cinder_giant', name: 'Cinder giant', examine: 'Its hair is literally on fire.', aggressive: true, attackStyle: 'crush', attackSpeed: 6, size: 2,
  stats: { attack: 70, strength: 72, defence: 64, hitpoints: 100 }, bonuses: { strength: 20, ...armour(40, 20, 40) }, slayerCategory: 'giants',
  model: { template: 'giant', colors: { skin: '#8a3a2a', top: '#3a2420', legs: '#2a1a14', hair: '#ff6a20' }, extras: { glowEyes: '#ffb030' }, equipment: { weapon: { shape: 'twohanded', color: '#3a2a26', glow: '#ff6a10' } } } });

// =================================================================================================
// Golems & elementals
// =================================================================================================
m({ id: 'quarry_golem', name: 'Quarry golem', examine: 'Rock given an unfortunate will of its own.', attackStyle: 'crush', attackSpeed: 6,
  stats: { attack: 25, strength: 28, defence: 30, hitpoints: 40 }, bonuses: armour(30, 0, 50), respawnTicks: 60, slayerCategory: 'golems', model: { template: 'golem' } });
m({ id: 'loam_elemental', name: 'Loam elemental', examine: 'Earth and stone, held together by spite.', attackStyle: 'crush', attackSpeed: 5,
  stats: { attack: 30, strength: 32, defence: 40, hitpoints: 40 }, bonuses: armour(20, 0, 40), slayerCategory: 'elementals',
  model: { template: 'elemental', colors: { body: '#7a5a3a', core: '#c8a040', eyes: '#ffe080' } } });
m({ id: 'tide_elemental', name: 'Tide elemental', examine: 'A living wave.', attackStyle: 'magic', attackRange: 6, projectileColor: '#3a80ff', aggressive: true,
  stats: { attack: 20, strength: 20, defence: 44, magic: 50, hitpoints: 50 }, bonuses: { attackMagic: 20, ...armour(20, 40, 20) }, slayerCategory: 'elementals',
  model: { template: 'elemental', colors: { body: '#3a80c8', core: '#aee8ff', eyes: '#e0ffff' } } });
m({ id: 'gale_elemental', name: 'Gale elemental', examine: 'It howls with the voice of a hundred storms.', attackStyle: 'magic', attackRange: 7, projectileColor: '#e8f4ff', aggressive: true,
  stats: { attack: 20, strength: 20, defence: 46, magic: 58, hitpoints: 56 }, bonuses: { attackMagic: 25, ...armour(25, 40, 10) }, slayerCategory: 'elementals',
  model: { template: 'elemental', colors: { body: '#c8d8e4', core: '#ffffff', eyes: '#80c0ff' } } });
m({ id: 'ember_elemental', name: 'Ember elemental', examine: 'A walking bonfire with a grudge.', attackStyle: 'magic', attackRange: 6, projectileColor: '#ff6020', aggressive: true,
  stats: { attack: 30, strength: 30, defence: 50, magic: 66, hitpoints: 64 }, bonuses: { attackMagic: 30, ...armour(30, 50, 30) }, slayerCategory: 'elementals',
  model: { template: 'elemental', colors: { body: '#c84a1a', core: '#ffd040', eyes: '#ffff80' }, extras: { orbit: '#ff9a30' } } });
m({ id: 'ironbound_golem', name: 'Ironbound golem', examine: 'Iron plates riveted over a heart of stone.', attackStyle: 'crush', attackSpeed: 6,
  stats: { attack: 56, strength: 64, defence: 62, hitpoints: 70 }, bonuses: armour(80, 10, 100), slayerCategory: 'golems',
  model: { template: 'golem', colors: { skin: '#4a4a52', top: '#3a3a42', legs: '#3a3a42', boots: '#2a2a30' }, extras: { glowEyes: '#ff9a30', core: '#ff9a30' } } });
m({ id: 'shardstone_golem', name: 'Shardstone golem', examine: 'Crystals jut from every joint, humming with stored light.', attackStyle: 'crush', attackSpeed: 5, size: 2,
  stats: { attack: 86, strength: 90, defence: 100, hitpoints: 110 }, bonuses: armour(100, 50, 140), slayerCategory: 'golems',
  attacks: [{ style: 'melee', maxHit: 20, weight: 3 }, { style: 'magic', maxHit: 18, weight: 1, range: 7, projectileColor: '#80e0ff' }],
  model: { template: 'golem', scale: 1.25, colors: { skin: '#6ab0d0', top: '#4a8ab0', legs: '#4a8ab0', boots: '#3a6a8a' }, extras: { glowEyes: '#e0ffff', core: '#e0ffff', orbit: '#9ae0ff' } } });

// =================================================================================================
// Demons
// =================================================================================================
m({ id: 'imp', name: 'Imp', examine: 'A cheeky little demon.', stats: { attack: 4, strength: 4, defence: 4, hitpoints: 8 }, respawnTicks: 30, wanderRadius: 6, tags: ['demon'], slayerCategory: 'imps',
  model: { template: 'imp' } });
m({ id: 'ashfiend', name: 'Ashfiend', examine: 'A grey, smouldering lesser demon.', attackStyle: 'slash', aggressive: true, aggroRange: 4,
  stats: { attack: 48, strength: 50, defence: 44, hitpoints: 56 }, bonuses: armour(20, 0, 20), tags: ['demon'], slayerCategory: 'fiends',
  model: { template: 'demon', scale: 0.85, colors: { skin: '#5a5048', top: '#5a5048', legs: '#4a4038' }, extras: { wingColor: '#2a2420', glowEyes: '#ff8a30' } } });
m({ id: 'gloom_fiend', name: 'Gloom fiend', examine: 'A demon of the deep dark.', aggressive: true, attackStyle: 'slash', size: 2, wanderRadius: 3, respawnTicks: 80,
  stats: { attack: 70, strength: 72, defence: 65, hitpoints: 87 }, bonuses: armour(30, 10, 30), tags: ['demon'], slayerCategory: 'fiends',
  model: { template: 'demon', colors: { skin: '#3a1e4a', top: '#3a1e4a', legs: '#2a1438' }, extras: { wingColor: '#1e0a2a', glowEyes: '#d080ff' } } });
m({ id: 'pyre_fiend', name: 'Pyre fiend', examine: 'A greater demon, wreathed in flame.', attackStyle: 'slash', aggressive: true, aggroRange: 5, size: 2,
  stats: { attack: 100, strength: 104, defence: 90, hitpoints: 130 }, bonuses: armour(60, 30, 60), tags: ['demon'], slayerCategory: 'fiends',
  attacks: [{ style: 'melee', maxHit: 22, weight: 3 }, { style: 'magic', maxHit: 20, weight: 1, range: 7, projectileColor: '#ff6020' }],
  model: { template: 'demon', scale: 1.15, colors: { skin: '#c84a1a', top: '#c84a1a', legs: '#8a2a10' }, extras: { wingColor: '#4a1408', glowEyes: '#ffd040', cracks: '#ffd040' } } });

// =================================================================================================
// Dragons (dragonfire: magic-style attack with effect 'dragonfire', blocked by antiDragonfire shields)
// =================================================================================================
const dragon = (def) => m({ attackStyle: 'slash', aggressive: true, aggroRange: 4, size: 3, wanderRadius: 4, tags: ['dragon'], slayerCategory: 'dragons', dragonfire: true, ...def });
dragon({ id: 'drakeling', name: 'Drakeling', examine: 'A young dragon, all teeth and ambition.', size: 2,
  stats: { attack: 42, strength: 42, defence: 40, hitpoints: 50 }, bonuses: armour(40, 30, 40),
  attacks: [{ style: 'melee', maxHit: 8, weight: 4 }, fire(20)],
  model: { template: 'glow_dragon', scale: 0.55, colors: { body: '#5a8a3a', belly: '#d8c87a' } } });
dragon({ id: 'fen_drake', name: 'Fen drake', examine: 'A marsh-green drake that nests among the reeds.', size: 2,
  stats: { attack: 55, strength: 55, defence: 52, hitpoints: 65 }, bonuses: armour(40, 30, 40),
  attacks: [{ style: 'melee', maxHit: 7, weight: 3 }, fire(35, 1, '#a0ff60')],
  model: { template: 'glow_dragon', scale: 0.75, colors: { body: '#4a7a3a', belly: '#a8b870' }, glowEyes: '#c0ff40' } });
dragon({ id: 'moss_dragon', name: 'Moss dragon', examine: 'A green dragon with lichen growing between its scales.',
  stats: { attack: 68, strength: 68, defence: 68, hitpoints: 75 }, bonuses: armour(40, 40, 40),
  attacks: [{ style: 'melee', maxHit: 8, weight: 3 }, fire(50)],
  model: { template: 'glow_dragon', colors: { body: '#3a7a2a', belly: '#c8b86a' } } });
dragon({ id: 'ashen_wyrm', name: 'Ashen wyrm', examine: 'A dragon wreathed in cinders. Best avoided.', respawnTicks: 100,
  stats: { attack: 68, strength: 68, defence: 68, hitpoints: 75 }, bonuses: armour(40, 40, 40),
  attacks: [{ style: 'melee', maxHit: 8, weight: 3 }, fire(50)],
  model: { template: 'glow_dragon', colors: { body: '#4a3a3a', belly: '#c88a4a' }, wings: '#3a2020', glowEyes: '#ff6020', breath: '#ff6020' } });
dragon({ id: 'azure_dragon', name: 'Azure dragon', examine: 'A deep-blue dragon whose scales shimmer like the sea.',
  stats: { attack: 95, strength: 95, defence: 95, hitpoints: 105 }, bonuses: armour(60, 50, 60),
  attacks: [{ style: 'melee', maxHit: 10, weight: 3 }, fire(50, 1, '#40a0ff')],
  model: { template: 'glow_dragon', colors: { body: '#2a5ab0', belly: '#a8c8f0' }, glowEyes: '#a0e8ff' } });
dragon({ id: 'frost_wyrm', name: 'Frost wyrm', examine: 'The air around it crackles with frost.', size: 3,
  stats: { attack: 120, strength: 120, defence: 120, hitpoints: 140 }, bonuses: armour(80, 60, 80),
  attacks: [{ style: 'melee', maxHit: 15, weight: 3 }, { ...fire(55, 1, '#a0f0ff'), effect: 'dragonfire' }, { style: 'magic', maxHit: 12, weight: 1, range: 6, projectileColor: '#a0f0ff', effect: 'freeze' }],
  model: { template: 'glow_dragon', scale: 1.1, colors: { body: '#c8e0f0', belly: '#ffffff', horn: '#a0c0e0' }, spikes: '#90b0d0', glowEyes: '#40c0ff', breath: '#a0f0ff' } });
dragon({ id: 'crimson_dragon', name: 'Crimson dragon', examine: 'A red dragon. The heat coming off it is unbearable.',
  stats: { attack: 130, strength: 130, defence: 130, hitpoints: 150 }, bonuses: armour(80, 60, 80),
  attacks: [{ style: 'melee', maxHit: 18, weight: 3 }, fire(55, 1, '#ff4010')],
  model: { template: 'glow_dragon', scale: 1.1, colors: { body: '#a82a1a', belly: '#e8a050' }, glowEyes: '#ffd040', breath: '#ff4010' } });
dragon({ id: 'obsidian_dragon', name: 'Obsidian dragon', examine: 'An ancient black dragon. Its scales drink the light.', size: 4,
  stats: { attack: 200, strength: 200, defence: 190, hitpoints: 190 }, bonuses: armour(110, 80, 110),
  attacks: [{ style: 'melee', maxHit: 21, weight: 3 }, fire(60, 1, '#a040ff'), { style: 'magic', maxHit: 15, weight: 1, range: 7, projectileColor: '#60ff60', effect: 'poison' }],
  model: { template: 'glow_dragon', scale: 1.4, colors: { body: '#1a1a1e', belly: '#3a3a44', horn: '#8a40c0' }, wings: '#2a1a3a', spikes: '#8a40c0', glowEyes: '#c060ff', breath: '#a040ff' } });

// =================================================================================================
// Slayer monsters (slayerLevel required to damage them - enforced by agent F)
// =================================================================================================
const slayer = (lvl, cat, def) => m({ slayerLevel: lvl, slayerCategory: cat, ...def });
slayer(10, 'crawlers', { id: 'gloom_crawler', name: 'Gloom crawler', examine: 'Pale, many-legged and fond of ceilings.', attackStyle: 'stab', aggressive: true,
  stats: { attack: 20, strength: 18, defence: 16, hitpoints: 26 }, model: { template: 'crab', scale: 1.15, colors: { body: '#8a8070', eyes: '#c02020' } } });
slayer(20, 'slugs', { id: 'shalestone_slug', name: 'Shalestone slug', examine: 'Its shell is a slab of shale. Its slime eats through steel.', attackStyle: 'crush',
  stats: { attack: 22, strength: 24, defence: 32, hitpoints: 30 }, bonuses: armour(40, 10, 40), model: { template: 'slug' } });
slayer(25, 'fowl', { id: 'stonegaze_fowl', name: 'Stonegaze fowl', examine: 'Do not meet its eyes. Seriously.', attackStyle: 'stab',
  stats: { attack: 32, strength: 30, defence: 28, hitpoints: 40 }, model: { template: 'chicken', scale: 2.4, colors: { body: '#8a8a80', comb: '#6a2a8a', beak: '#3a3a3a', legs: '#5a5a50' } } });
slayer(30, 'hags', { id: 'keening_hag', name: 'Keening hag', examine: 'Her wail could curdle milk at a hundred paces.', attackStyle: 'magic', attackRange: 1, aggressive: true,
  stats: { attack: 20, strength: 20, defence: 30, magic: 50, hitpoints: 46 }, bonuses: armour(10, 30, 10), tags: ['undead'],
  model: { template: 'ghost', female: true, colors: { skin: '#b8c8b0', top: '#6a7a6a', legs: '#6a7a6a', hair: '#e8e8e0' }, extras: { nose: 0.08, glowEyes: '#80ff80' } } });
slayer(35, 'thirst_bats', { id: 'thirst_bat', name: 'Thirst bat', examine: 'It drinks blood and heals as it does.', attackStyle: 'stab', aggressive: true, aggroRange: 4,
  stats: { attack: 48, strength: 46, defence: 40, hitpoints: 55 },
  attacks: [{ style: 'melee', maxHit: 8, weight: 1, effect: 'heal' }],
  model: { template: 'bat', scale: 1.7, colors: { body: '#5a1a1a', wing: '#3a0a0a', eyes: '#ff2020' } } });
slayer(45, 'glarehorns', { id: 'glarehorn_lizard', name: 'Glarehorn lizard', examine: 'A hulking lizard whose horn glows before it strikes.', attackStyle: 'stab', size: 2,
  stats: { attack: 52, strength: 54, defence: 60, hitpoints: 70 }, bonuses: armour(50, 20, 50),
  model: { template: 'lizard', scale: 1.5, horn: '#e8e0c8', glowEyes: '#ffe040', colors: { body: '#6a7a4a' } } });
slayer(60, 'ash_devils', { id: 'ash_devil', name: 'Ash devil', examine: 'A whirling column of choking ash.', attackStyle: 'crush', aggressive: true,
  stats: { attack: 82, strength: 84, defence: 70, hitpoints: 105 }, bonuses: armour(40, 20, 40),
  model: { template: 'elemental', colors: { body: '#5a5048', core: '#ff6a20', eyes: '#ffb060' } } });
slayer(65, 'specters', { id: 'rot_specter', name: 'Rot specter', examine: 'The stench is overwhelming.', attackStyle: 'magic', attackRange: 1, aggressive: true,
  stats: { attack: 40, strength: 40, defence: 70, magic: 100, hitpoints: 100 }, bonuses: armour(40, 60, 40), tags: ['undead'],
  model: { template: 'ghost', scale: 1.25, hairStyle: 'bald', colors: { skin: '#7a8a4a', top: '#4a5a2a', legs: '#4a5a2a' }, extras: { glowEyes: '#c0ff40' } } });
slayer(75, 'grotesques', { id: 'stone_grotesque', name: 'Stone grotesque', examine: 'A carved horror that decided to stop being decorative.', attackStyle: 'crush', attackSpeed: 5,
  stats: { attack: 96, strength: 100, defence: 110, hitpoints: 105 }, bonuses: armour(120, 30, 140),
  model: { template: 'demon', scale: 0.9, colors: { skin: '#7a7a72', top: '#7a7a72', legs: '#6a6a62', hands: '#5a5a52', boots: '#5a5a52' }, extras: { wingColor: '#6a6a62', hornColor: '#5a5a52', glowEyes: '#ffe080' } } });
slayer(80, 'reavers', { id: 'hollow_reaver', name: 'Hollow reaver', examine: 'A faceless thing that steals breath.', attackStyle: 'slash', aggressive: true,
  stats: { attack: 110, strength: 108, defence: 90, hitpoints: 120 }, bonuses: armour(40, 20, 40), tags: ['demon'],
  model: { template: 'demon', scale: 0.8, colors: { skin: '#3a3a4a', top: '#2a2a38', legs: '#2a2a38' }, extras: { wings: false, glowEyes: '#80ffff' } } });
slayer(85, 'void_stalkers', { id: 'void_stalker', name: 'Void stalker', examine: 'It flickers in and out of being.', attackStyle: 'stab', aggressive: true, aggroRange: 4,
  stats: { attack: 105, strength: 105, defence: 95, hitpoints: 130 }, bonuses: armour(20, 0, 20), tags: ['demon'],
  model: { template: 'demon', scale: 0.9, colors: { skin: '#120e1e', top: '#120e1e', legs: '#0e0a18' }, extras: { wingColor: '#2a1048', glowEyes: '#a060ff', cracks: '#7a40ff' } } });
slayer(90, 'umbral_beasts', { id: 'umbral_beast', name: 'Umbral beast', examine: 'Darkness given teeth.', attackStyle: 'slash', attackSpeed: 5, aggressive: true, size: 2,
  stats: { attack: 150, strength: 160, defence: 140, hitpoints: 200 }, bonuses: armour(60, 60, 60),
  attacks: [{ style: 'melee', maxHit: 17, weight: 3 }, { style: 'magic', maxHit: 15, weight: 1, range: 7, projectileColor: '#7a40ff' }],
  model: { template: 'hound', scale: 1.6, glowEyes: '#c080ff' } });

// =================================================================================================
// Bosses
// =================================================================================================
const boss = (def) => m({ boss: true, aggressive: true, aggroRange: 6, wanderRadius: 3, respawnTicks: 150, tags: ['boss', ...(def.tags || [])], ...def });

boss({ id: 'grubnak_warlord', name: 'Grubnak the Warlord', examine: 'The self-proclaimed king of all goblins. He has a very big axe.', combatLevel: 48,
  attackStyle: 'slash', attackSpeed: 5, respawnTicks: 100, slayerCategory: 'goblins',
  stats: { attack: 44, strength: 46, defence: 40, hitpoints: 90 }, bonuses: { attackSlash: 30, strength: 25, ...armour(30, 5, 30) }, maxHit: 9,
  attacks: [{ style: 'melee', maxHit: 9, weight: 4 }, { style: 'melee', maxHit: 14, weight: 1, effect: 'aoe' }],
  model: { template: 'goblin', scale: 1.7, colors: { skin: '#5a8a2a', top: '#5a2a1a' }, extras: { crown: '#c8a040', glowEyes: '#ff4020' },
    equipment: { weapon: 'warlords_cleaver', body: 'iron_platebody', cape: { shape: 'cape', color: '#8a1a1a', color2: '#6a8a3a' }, legs: 'iron_platelegs' } } });
boss({ id: 'corsair_captain', name: 'Captain Brinehook', examine: 'Captain of the Saltmarsh corsairs, terror of the southern coast.', combatLevel: 78,
  attackStyle: 'slash', size: 1, slayerCategory: 'pirates',
  stats: { attack: 70, strength: 72, defence: 60, ranged: 70, hitpoints: 150 }, bonuses: { attackSlash: 40, attackRanged: 30, strength: 30, ...armour(45, 10, 40) },
  attacks: [{ style: 'melee', maxHit: 13, weight: 3 }, { style: 'ranged', maxHit: 12, weight: 2, range: 7, projectileColor: '#d8d0b0' }],
  model: { template: 'human', scale: 1.15, colors: { top: '#2a2a3a', legs: '#2a3a5a', hair: '#1a1a1a' }, extras: { beard: true },
    equipment: { weapon: 'saltreaver_cutlass', head: { shape: 'coif', color: '#1a1a1a', trim: '#d8a830' }, cape: { shape: 'cape', color: '#8a1a1a', color2: '#d8a830' }, body: { shape: 'chainbody', color: '#3a2a20', trim: '#d8a830' }, feet: { shape: 'boots', color: '#1a1a1a' } } } });
boss({ id: 'graven_king', name: 'The Graven King', examine: 'A golem crowned in the old quarry. The stone obeys him.', combatLevel: 95,
  attackStyle: 'crush', attackSpeed: 6, size: 2, slayerCategory: 'golems',
  aggressive: false, // he sits in the quarry where beginners mine: only fights when challenged
  stats: { attack: 80, strength: 90, defence: 110, magic: 60, hitpoints: 200 }, bonuses: armour(120, 20, 160),
  attacks: [{ style: 'melee', maxHit: 17, weight: 3 }, { style: 'ranged', maxHit: 14, weight: 1, range: 8, projectileColor: '#8a857a', effect: 'aoe' }],
  model: { template: 'golem', scale: 1.5, colors: { skin: '#8a857a', top: '#7a756c', legs: '#6a655c' }, extras: { crown: '#d8b040', glowEyes: '#60e0ff', core: '#60e0ff' }, equipment: { weapon: 'graven_maul' } } });
boss({ id: 'bog_matriarch', name: 'The Bog Matriarch', examine: 'Mother of every toad in Murkfen. She is enormous, and hungry.', combatLevel: 120,
  aggroRange: 3, // the fen borders Brackenford and the coast road: she only notices you up close
  attackStyle: 'crush', attackSpeed: 5, size: 3, slayerCategory: 'toads',
  stats: { attack: 100, strength: 100, defence: 90, magic: 110, hitpoints: 260 }, bonuses: armour(50, 70, 50),
  attacks: [{ style: 'melee', maxHit: 20, weight: 2 }, { style: 'magic', maxHit: 18, weight: 2, range: 8, projectileColor: '#4ad0a0', effect: 'poison' }],
  model: { template: 'toad', scale: 4.2, colors: { body: '#3a4a22', belly: '#a8a870', eyes: '#ff6020' }, warts: '#6a7a32' } });
boss({ id: 'mother_skitterlace', name: 'Mother Skitterlace', examine: 'The broodmother of the Depths. Her web fills the cavern.', combatLevel: 140,
  attackStyle: 'stab', attackSpeed: 4, size: 3, poisonous: true, slayerCategory: 'spiders',
  stats: { attack: 120, strength: 120, defence: 110, ranged: 100, hitpoints: 300 }, bonuses: armour(70, 40, 70),
  attacks: [{ style: 'melee', maxHit: 22, weight: 3, effect: 'poison' }, { style: 'ranged', maxHit: 18, weight: 2, range: 8, projectileColor: '#e8e8f0', effect: 'freeze' }],
  model: { template: 'spider', scale: 4, colors: { body: '#d8d4e0', abdomen: '#c8c0d8', legs: '#a8a0b8', eyes: '#c040ff' }, marking: '#7a2aa8' } });
boss({ id: 'calder_lich', name: 'The Calder Lich', examine: 'Once the lord of Calder. Now its undying warden.', combatLevel: 190,
  attackStyle: 'magic', attackRange: 8, attackSpeed: 5, projectileColor: '#7aff9a', tags: ['undead'], slayerCategory: 'skeletons',
  stats: { attack: 80, strength: 80, defence: 150, magic: 220, hitpoints: 350 }, bonuses: { attackMagic: 60, ...armour(100, 150, 100) },
  attacks: [{ style: 'magic', maxHit: 30, weight: 3, range: 8, projectileColor: '#7aff9a' }, { style: 'magic', maxHit: 22, weight: 1, range: 8, projectileColor: '#4aff6a', effect: 'drain_prayer' },
    { style: 'melee', maxHit: 24, weight: 1 }],
  model: { template: 'human', scale: 1.3, hairStyle: 'bald', colors: { skin: '#e6e0cc', eyes: '#111111' }, extras: { glowEyes: '#7aff9a' },
    equipment: { weapon: 'lich_sceptre', head: { shape: 'hood', color: '#2a1e3a' }, body: { shape: 'robe_top', color: '#2a1e3a', trim: '#c8a040', glow: '#7aff9a' }, legs: { shape: 'robe', color: '#2a1e3a', trim: '#c8a040' }, neck: 'lich_phylactery' } } });
boss({ id: 'cinder_colossus', name: 'The Cinder Colossus', examine: 'A mountain of slag and fire that walks the Ashen Wastes.', combatLevel: 210,
  attackStyle: 'crush', attackSpeed: 6, size: 3, slayerCategory: 'golems', multi: true,
  stats: { attack: 160, strength: 180, defence: 160, magic: 150, hitpoints: 450 }, bonuses: armour(120, 60, 120),
  attacks: [{ style: 'melee', maxHit: 32, weight: 3 }, { style: 'magic', maxHit: 26, weight: 2, range: 10, projectileColor: '#ff6a10', effect: 'aoe' }],
  model: { template: 'magma_golem', scale: 1.7, extras: { crown: '#ff9a40' }, equipment: { weapon: { shape: 'maul', color: '#2e2420', color2: '#ff6a10', glow: '#ff6a10' } } } });
boss({ id: 'varrath_gloom_tyrant', name: 'Varrath, the Gloom Tyrant', examine: 'The demon lord who rules the deepest dark of Gloomhollow.', combatLevel: 300,
  attackStyle: 'slash', attackSpeed: 4, size: 3, tags: ['demon'], slayerCategory: 'fiends',
  stats: { attack: 240, strength: 240, defence: 200, magic: 220, hitpoints: 600 }, bonuses: armour(150, 100, 150),
  attacks: [{ style: 'melee', maxHit: 38, weight: 3 }, { style: 'magic', maxHit: 34, weight: 2, range: 10, projectileColor: '#b040ff', effect: 'drain_prayer' },
    { style: 'magic', maxHit: 28, weight: 1, range: 10, projectileColor: '#7a20c0', effect: 'aoe' }],
  model: { template: 'demon', scale: 1.5, colors: { skin: '#1e1428', top: '#1e1428', legs: '#140e1e' }, extras: { wingColor: '#2a1040', glowEyes: '#c060ff', crown: '#8a40c0', cracks: '#b040ff' },
    equipment: { weapon: 'umbral_edge' } } });
boss({ id: 'frostmaw', name: 'Frostmaw, the Elder Wyrm', examine: 'The oldest dragon in Ashvale. Winter follows wherever it goes.', combatLevel: 320,
  attackStyle: 'slash', attackSpeed: 5, size: 4, tags: ['dragon'], slayerCategory: 'dragons', dragonfire: true,
  stats: { attack: 260, strength: 260, defence: 240, magic: 200, hitpoints: 700 }, bonuses: armour(160, 120, 160),
  attacks: [{ style: 'melee', maxHit: 34, weight: 3 }, fire(70, 2, '#a0f0ff'), { style: 'magic', maxHit: 30, weight: 1, range: 8, projectileColor: '#d0f8ff', effect: 'freeze' },
    { style: 'ranged', maxHit: 32, weight: 1, range: 8, projectileColor: '#e0f4ff', effect: 'aoe' }],
  model: { template: 'glow_dragon', scale: 1.6, colors: { body: '#e0eef8', belly: '#ffffff', horn: '#80b0e0' }, wings: '#a0c0e0', spikes: '#80a8d0', glowEyes: '#40e0ff', breath: '#a0f0ff' } });
