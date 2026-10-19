// Mastery mantles (level-99 capes, one per skill) and the Hall of Mastery keeper in Highmarch.
// Imported by content/diaries.js. Purchase logic + window: systems/progress_mastery.js.
//   item ids: `mastery_cape_<skill>` (+ `mastery_cape_max` when every skill is 99)
//   registerData('mastery_cape', skill, { item, title, color })

import { registerItem, registerNpc, registerSpawn, registerDialogue, registerData } from '../core/registry.js';
import { SKILLS, SKILL_NAMES } from '../core/constants.js';

export const MASTERY_PRICE = 99000;
export const MASTERY_MAX_PRICE = 990000;
export const MASTERY_KEEPER = { id: 'mastery_keeper', x: 171, y: 87 };

// skill -> [title, main colour, trim colour]
const TITLES = {
  attack: ['Duelist', '#9a2a22', '#e8c040'],
  strength: ['Titan', '#2a7a3a', '#e8c040'],
  defence: ['Bulwark', '#3a5aa0', '#d8d8e0'],
  ranged: ['Marksman', '#4a7a2a', '#d8c890'],
  prayer: ['Devout', '#e8e0c8', '#c8a040'],
  magic: ['Arcanist', '#2a3aa0', '#8ad0ff'],
  runebinding: ['Sigilwright', '#c8a050', '#5a3a1a'],
  construction: ['Housewright', '#a07a48', '#f0e0c0'],
  hitpoints: ['Stalwart', '#c8c8c8', '#c02020'],
  agility: ['Wayrunner', '#2a3a6a', '#8a8a9a'],
  herblore: ['Apothecary', '#3a8a3a', '#e8e0a0'],
  thieving: ['Shadowhand', '#4a2a5a', '#b0a0c0'],
  crafting: ['Artisan', '#8a6a3a', '#e8c890'],
  fletching: ['Bowyer', '#2a6a5a', '#c8a060'],
  slayer: ['Monsterbane', '#3a3a3a', '#c02020'],
  hunter: ['Tracker', '#6a5a3a', '#c8b890'],
  mining: ['Deepdelver', '#4a5a6a', '#c8a040'],
  smithing: ['Anvilsworn', '#5a4a3a', '#ff8a30'],
  fishing: ['Netcaster', '#3a6a9a', '#c8e0f0'],
  cooking: ['Hearthkeeper', '#f0f0f0', '#7a2a6a'],
  firemaking: ['Flamewarden', '#e86a10', '#ffd040'],
  woodcutting: ['Timberfeller', '#5a7a2a', '#a07a48'],
  farming: ['Harvestwarden', '#5a8a2a', '#e8d070'],
};

const CAPE_BONUS = { defenceStab: 6, defenceSlash: 6, defenceCrush: 6, defenceMagic: 6, defenceRanged: 6, prayer: 3 };

for (const skill of SKILLS) {
  const [title, color, color2] = TITLES[skill] || ['Master', '#888888', '#e8c040'];
  const id = `mastery_cape_${skill}`;
  registerItem({
    id, name: `Mantle of the ${title}`,
    examine: `Proof of mastery in ${SKILL_NAMES[skill]}. Only those who reach the very peak may wear it.`,
    value: MASTERY_PRICE, tradeable: false, slot: 'cape', requirements: { [skill]: 99 }, bonuses: { ...CAPE_BONUS },
    equipOptions: ['Flourish'], masterySkill: skill,
    icon: { shape: 'cape', color, color2 }, model: { shape: 'cape', color, color2 },
  });
  registerData('mastery_cape', skill, { item: id, title, color, color2 });
}

registerItem({
  id: 'mastery_cape_max', name: 'Mantle of Ascendancy',
  examine: 'Woven from every mastery mantle in the Hall. There is nothing left to learn.',
  value: MASTERY_MAX_PRICE, tradeable: false, slot: 'cape',
  requirements: Object.fromEntries(SKILLS.map((s) => [s, 99])),
  bonuses: { defenceStab: 9, defenceSlash: 9, defenceCrush: 9, defenceMagic: 9, defenceRanged: 9, prayer: 5, strength: 2, rangedStrength: 2, magicDamage: 1 },
  equipOptions: ['Flourish'], masterySkill: 'all',
  icon: { shape: 'cape', color: '#f0d060', color2: '#7a2aa0' }, model: { shape: 'cape', color: '#f0d060', color2: '#7a2aa0' },
});

registerNpc({
  id: MASTERY_KEEPER.id, name: 'Hallmaster Corvane', examine: 'Keeper of the Hall of Mastery. Every mantle on the wall has a story, and he knows them all.',
  combatLevel: 0, options: ['Talk-to', 'Trade'], dialogue: MASTERY_KEEPER.id, wanderRadius: 1,
  mapIcon: { char: '*', color: '#f0d060' },
  model: {
    template: 'human',
    colors: { top: '#5a2a6a', legs: '#2a2a3a', hair: '#c8c8c8', boots: '#2a1a10' },
    extras: { beard: true },
    equipment: { cape: { shape: 'cape', color: '#f0d060', color2: '#7a2aa0' } },
  },
});
registerSpawn({ type: 'npc', id: MASTERY_KEEPER.id, x: MASTERY_KEEPER.x, y: MASTERY_KEEPER.y, wander: 1 });

registerDialogue(MASTERY_KEEPER.id, [
  { npc: 'Welcome to the Hall of Mastery. Each mantle here belongs to one craft, and is given only to those who have taken that craft as far as it can go.', name: 'Hallmaster Corvane' },
  { label: 'menu', options: [
    { text: 'I would like to see the mantles.', action: ({ game }) => { game.progress?.openMasteryHall(); return false; } },
    { text: 'What does it take to earn one?', goto: 'how' },
    { text: 'How am I doing overall?', action: ({ game }) => { game.progress?.openHiscores(); return false; } },
    { text: 'Goodbye.', end: true },
  ] },
  { label: 'how', npc: `Reach level 99 in a skill and the Hall will sell you its mantle for ${MASTERY_PRICE.toLocaleString('en-US')} coins. Master every skill and you may claim the Mantle of Ascendancy.`, name: 'Hallmaster Corvane', goto: 'menu' },
]);
