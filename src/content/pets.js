// Pets: rare followers from bosses, minigames and skilling. OWNER: activities (pets).
// Each pet is an inventory item (`pet_<id>`, untradeable) and a follower NPC (`follower_<id>`, local only,
// not attackable). Drop sources are data (`registerData('pets', id, def)`), read by systems/pets.js:
//   source: { npc: 'boss_id' | [ids], chance }      rolled on 'npc:death' (killer = local player)
//           { event: 'gathering:log' | 'gathering:ore' | 'gathering:fish' | 'minigame:<id>', chance }
// The Petkeeper (Brackenford, south of the market) reclaims lost (insured) pets for a fee.

import { registerItem, registerNpc, registerData, registerSpawn, registerPaint, registerDialogue } from '../core/registry.js';

export const PET_RECLAIM_FEE = 25000;

const PETS = [
  { id: 'grubling', name: 'Grubling', examine: 'A goblin warlord in miniature. He has appointed himself your general.',
    source: { npc: 'grubnak_warlord', chance: 1 / 1000 }, icon: '#5a8a2a',
    model: { template: 'goblin', scale: 0.45, colors: { skin: '#5a8a2a', top: '#5a2a1a' }, extras: { crown: '#c8a040' } },
    talk: ['Grubling WANTS the shiny things.', 'Grubling is general now. You march. Grubling rides.', 'More stabbing soon? Grubling hopes so.'] },
  { id: 'captain_squawk', name: 'Captain Squawk', examine: "Brinehook's parrot. It still thinks it's in charge.",
    source: { npc: 'corsair_captain', chance: 1 / 1000 }, icon: '#c83a2a',
    model: { template: 'chicken', scale: 0.7, colors: { body: '#c83a2a', wing: '#2a8a3a', comb: '#e8c040', beak: '#e8c040', legs: '#3a3a3a' } },
    talk: ['SQUAWK! Pieces of brass!', 'Raise the anchor! Lower the anchor! SQUAWK!', 'Rrrrrum? No rum? SQUAWK.'] },
  { id: 'pebblet', name: 'Pebblet', examine: 'A chip off the old Graven King.',
    source: { npc: 'graven_king', chance: 1 / 1000 }, icon: '#7a756c',
    model: { template: 'golem', scale: 0.32, colors: { skin: '#8a847a', top: '#7a746a', legs: '#7a746a' }, extras: { glowEyes: '#ffd040' } },
    talk: ['*grinding noises*', 'Pebblet is small. Pebblet will be mountain one day.', '*a contented crunch*'] },
  { id: 'tadling', name: 'Tadling', examine: 'One of the Bog Matriarch\'s many, many children.',
    source: { npc: 'bog_matriarch', chance: 1 / 1200 }, icon: '#5a7a3a',
    model: { template: 'toad', scale: 0.55 },
    talk: ['Rrribbit.', '*blinks slowly at you*', 'Rrrrrrribbit?'] },
  { id: 'skitterling', name: 'Skitterling', examine: 'Eight legs, eight eyes, one enormous appetite.',
    source: { npc: 'mother_skitterlace', chance: 1 / 2000 }, icon: '#3a2a3a',
    model: { template: 'spider', scale: 0.3, colors: { body: '#2a2030', legs: '#1a1420' } },
    talk: ['*clicks its mandibles fondly*', '*spins you a tiny, sticky gift*', '*all eight eyes stare lovingly*'] },
  { id: 'lichling', name: 'Lichling', examine: 'A fragment of the Calder Lich\'s phylactery took a liking to you.',
    source: { npc: 'calder_lich', chance: 1 / 2000 }, icon: '#7aff9a',
    model: { template: 'ghost', scale: 0.45, hairStyle: 'bald', colors: { skin: '#e6e0cc', top: '#2a1e3a', legs: '#2a1e3a' }, extras: { glowEyes: '#7aff9a' } },
    talk: ['One day I shall rule Calder again. Today, I follow you.', 'Your mortality amuses me. Pleasantly.', 'Do you have any spare souls? No? Pity.'] },
  { id: 'emberkin', name: 'Emberkin', examine: 'A smouldering chunk of the Cinder Colossus. Warm hands guaranteed.',
    source: { npc: 'cinder_colossus', chance: 1 / 2000 }, icon: '#ff6a10',
    model: { template: 'magma_golem', scale: 0.3 },
    talk: ['*crackles happily*', '*a small puff of smoke*', 'HOT. Hot hot hot.'] },
  { id: 'gloomling', name: 'Gloomling', examine: 'Varrath\'s shadow, cut loose and looking for a new master.',
    source: { npc: 'varrath_gloom_tyrant', chance: 1 / 3000 }, icon: '#7a20c0',
    model: { template: 'demon', scale: 0.28, colors: { skin: '#1e1428', top: '#1e1428', legs: '#140e1e' }, extras: { wingColor: '#2a1040', glowEyes: '#c060ff' } },
    talk: ['The dark is cosy. You are cosy too.', '*its little wings flutter menacingly*', 'I will be a TYRANT when I grow up.'] },
  { id: 'frostwhelp', name: 'Frostwhelp', examine: 'A wyrmling of the frozen north. It sneezes snowflakes.',
    source: { npc: 'frostmaw', chance: 1 / 3000 }, icon: '#a0e8ff',
    model: { template: 'glow_dragon', scale: 0.22, colors: { body: '#e0eef8', belly: '#ffffff', horn: '#80b0e0' }, wings: '#a0c0e0', spikes: '#80a8d0', glowEyes: '#40e0ff', breath: '#a0f0ff' },
    talk: ['*sneezes a small blizzard*', '*curls its tail around your ankle*', 'Rawr. (It is trying very hard.)'] },
  { id: 'ignarling', name: 'Ignarling', examine: 'A cub of the Crucible Champion. Already picking fights with pebbles.',
    source: { event: 'minigame:crucible', chance: 1 / 100 }, icon: '#ff9a40',
    model: { template: 'demon', scale: 0.3, colors: { skin: '#5a1a0a', top: '#5a1a0a', legs: '#3a1008' }, extras: { wingColor: '#8a2a10', glowEyes: '#ffd040', horns: true } },
    talk: ['Again! Again! Do the waves again!', 'I could take them. I could take ALL of them.', '*breathes a tiny, proud flame*'] },
  { id: 'wardenling', name: 'Wardenling', examine: 'A restless little bone-guard from Wardens\' Rest.',
    source: { event: 'minigame:wardens', chance: 1 / 300 }, icon: '#c8c0a8',
    model: { template: 'skeleton', scale: 0.42, extras: { glowEyes: '#60c0ff' }, equipment: { weapon: 'iron_sword', shield: 'iron_sq_shield' } },
    talk: ['*rattles at attention*', 'None shall pass. Except you. You may pass.', '*polishes its tiny sword*'] },
  { id: 'timberkit', name: 'Timberkit', examine: 'A bright-eyed squirrel that lives on sawdust and ambition.',
    source: { event: 'gathering:log', chance: 1 / 5000 }, icon: '#a0603a',
    model: { template: 'rat', scale: 0.8, colors: { body: '#a0603a', snout: '#e8c0a0' }, tail: 0.75 },
    talk: ['*chitters about trees*', '*stashes an acorn in your pocket*', 'Chk chk chk!'] },
  { id: 'nugget', name: 'Nugget', examine: 'A tiny rock golem with a vein of gold running through its heart.',
    source: { event: 'gathering:ore', chance: 1 / 5000 }, icon: '#c8a040',
    model: { template: 'golem', scale: 0.26, colors: { skin: '#6a645a', top: '#c8a040', legs: '#6a645a' }, extras: { glowEyes: '#ffe080' } },
    talk: ['*clink*', 'Dig. Dig. Dig. Good day.', '*it hums like a struck bell*'] },
  { id: 'pinchwick', name: 'Pinchwick', examine: 'A crab with a very serious expression.',
    source: { event: 'gathering:fish', chance: 1 / 5000 }, icon: '#d0603a',
    model: { template: 'crab', scale: 0.45 },
    talk: ['*clack clack*', '*waves a claw - friendly? threatening? unclear*', '*sideways enthusiasm*'] },
];

for (const p of PETS) {
  registerItem({
    id: `pet_${p.id}`, name: p.name, examine: p.examine, value: 0, tradeable: false, destroy: false,
    options: ['Summon'], pet: p.id, icon: { shape: 'paw', color: p.icon, color2: '#ffffff' },
  });
  registerNpc({
    id: `follower_${p.id}`, name: p.name, examine: p.examine, combatLevel: 0, options: ['Talk-to', 'Pick-up'],
    wanderRadius: 0, stats: { hitpoints: 1 }, model: p.model, pet: p.id,
  });
  registerData('pets', p.id, p);
}

// ---- the Petkeeper: reclaims insured pets ------------------------------------------------------------
registerNpc({
  id: 'petkeeper_odessa', name: 'Odessa the Petkeeper', examine: 'She smells faintly of hay, feathers and brimstone.',
  options: ['Talk-to', 'Reclaim'], dialogue: 'petkeeper_odessa', wanderRadius: 1, mapIcon: { char: 'P', color: '#ffb0d0' },
  model: { template: 'human', female: true, hairStyle: 'long', colors: { top: '#8a5a8a', legs: '#4a3a2a', hair: '#c87a3a' },
    equipment: { head: { shape: 'hood', color: '#6a4a6a' } } },
});
registerDialogue('petkeeper_odessa', [
  { npc: "Lost a little friend? Every pet that's ever chosen you is written in my book - I can always call them home." },
  { options: [
    { text: 'Show me my pets.', action: ({ game, npc }) => { game.pets?.openPetHouse(npc); return false; } },
    { text: 'How do I find pets?', goto: 'how' },
    { text: 'Goodbye.', end: true },
  ] },
  { label: 'how', npc: "Mighty foes sometimes leave a little one behind. So do trees, rocks and rivers, if you work them long enough. And the champions of the Crucible and the Wardens' Rest have cubs of their own..." },
  { npc: `If one goes missing, come to me. ${PET_RECLAIM_FEE.toLocaleString('en-US')} coins and a whistle, and they come running.`, end: true },
]);
registerSpawn({ type: 'npc', id: 'petkeeper_odessa', x: 100, y: 147, wander: 1 });

export { PETS };
