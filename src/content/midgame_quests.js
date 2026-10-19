// Mid-game quests tied to the Glimmerdeep (midgame_dungeon.js). OWNER: content designer (mid-game).
// Imported by content/quests.js. Same format as quests_east.js: stage in player.quests[id], runtime in hook(fn).
//   18. Below the Silverrun (Intermediate)   - Ferrywarden Hesk Callow, Silverrun bridge east of Brackenford (117,137)
//       sluice-wheel order puzzle; unlocks the Sporewood (level 2)
//   19. Rot at the Roots (Intermediate)      - Forester Bryn Ashgrove, Thornwood (63,126); needs 18
//       brew a fungicide, dose the mycel ring in order, kill Vorlagh; unlocks the Thornwood root-hollow shortcut
//   20. The Lantern Lock (Intermediate)      - Quarrymaster Odo Flint, Greystone Quarry (50,82); needs 18
//       mine + smelt glimmerstone for a key, solve the five-lantern lock; unlocks the Emberworks (level 3)
//   21. The Last Lanternwright (Experienced) - Archivist Sabelle Venn, Highmarch (168,67); needs 19 + 20
//       Lanternwright cipher at the Heart-gate, boss: the Ashwright Engine; unlocks the Heart Forge for good

import { registerQuest, registerDialogue } from '../core/registry.js';
import { hook, stageOf, done, flags, has, take, give, strike, red, COMPLETE, questNpc, questItem, spawnNpc, xp } from './quest_util.js';
import { GD, QICON, rint } from './midgame_common.js';

const BS = 'below_silverrun', RR = 'rot_at_roots', LL = 'lantern_lock', LW = 'last_lanternwright';

/** Move the player through a gated transition. */
function pass(game, player, [x, y], msg) {
  game.actions.stop(player, 'teleport');
  player.interaction = null; player.combatTarget = null; player.path = [];
  game.teleport(player, x, y);
  if (msg) game.message(msg);
}

// =================================================================================================
// NPCs and quest items
// =================================================================================================
questNpc({ id: 'ferrywarden_hesk', name: 'Ferrywarden Hesk Callow', examine: 'She has kept the Silverrun crossing for thirty years. She does not like what the river is doing.', mapIcon: QICON,
  model: { female: true, hairStyle: 'long', colors: { top: '#3a5a6a', legs: '#3a3a2a', hair: '#8a8a80', skin: '#c8946a' }, equipment: { weapon: { shape: 'spear', color: '#6a5a3a' }, head: { shape: 'hood', color: '#3a5a6a' } } } });
spawnNpc('ferrywarden_hesk', 117, 137, 1);
questNpc({ id: 'forester_bryn', name: 'Forester Bryn Ashgrove', examine: 'Warden of the Thornwood. There is grey dust in the creases of his coat.', mapIcon: QICON,
  model: { colors: { top: '#3a5a2a', legs: '#4a3a2a', hair: '#6a4a2a' }, extras: { beard: true }, equipment: { weapon: 'iron_axe', cape: { shape: 'cape', color: '#2a4a1a' } } } });
spawnNpc('forester_bryn', 63, 126, 1);
questNpc({ id: 'quarrymaster_odo', name: 'Quarrymaster Odo Flint', examine: 'Foreman of the Greystone crews. Built like one of his own boulders.', mapIcon: QICON,
  model: { colors: { top: '#6a5a4a', legs: '#3a3a3a', hair: '#2a2a2a' }, extras: { beard: true }, equipment: { weapon: { shape: 'pickaxe', color: '#8a8a8a' }, head: { shape: 'med_helm', color: '#c8a040' } } } });
spawnNpc('quarrymaster_odo', 50, 82, 1);
questNpc({ id: 'archivist_sabelle', name: 'Archivist Sabelle Venn', examine: 'Keeper of the Highmarch records. She has ink on her fingers and dust on her spectacles.', mapIcon: QICON,
  model: { female: true, hairStyle: 'long', colors: { top: '#4a2a5a', legs: '#2a2a3a', hair: '#3a2a1a' }, equipment: { body: { shape: 'robe_top', color: '#4a2a5a' }, legs: { shape: 'robe', color: '#4a2a5a' } } } });
spawnNpc('archivist_sabelle', 168, 67, 1);
questNpc({ id: 'echo_of_ommra', name: 'Echo of Ommra Vey', examine: 'The last Master Lanternwright - or the light he left behind.',
  model: { template: 'ghost', colors: { skin: '#f0e0b0', top: '#8a6a2a', legs: '#8a6a2a', hair: '#f0f0e0' }, extras: { beard: true, glowEyes: '#ffe9a0' }, equipment: { weapon: { shape: 'hammer', color: '#c8a040' } } } });
spawnNpc('echo_of_ommra', GD.ommra[0], GD.ommra[1], 1);

questItem({ id: 'sluice_handle', name: 'Sluice handle', examine: 'A heavy iron crank. It fits the spindle of a sluice wheel.', icon: { shape: 'key', color: '#5a5a62' } });
questItem({ id: 'rot_sample', name: 'Rot sample', examine: 'A twist of grey rot scraped from the hollow ironbark. It squirms, very slightly.', icon: { shape: 'herb', color: '#9a9a80' } });
questItem({ id: 'fungicide_dose', name: 'Fungicide dose', examine: "A dose of Bryn's fungicide - emberroot and rot, boiled down. Use it on the glowing caps of the Heartrot.", stackable: true, icon: { shape: 'potion', color: '#c06030', color2: '#9a9a80' } });
questItem({ id: 'glimmer_ore', name: 'Glimmer ore', examine: 'Pale ore that glows faintly in your hand.', icon: { shape: 'ore', color: '#e8f4ff' } });
questItem({ id: 'glimmer_ingot', name: 'Glimmer ingot', examine: 'A bar of smelted glimmerstone. It lights your face from below.', icon: { shape: 'bar', color: '#e8f4ff' } });
questItem({ id: 'lanternwright_key', name: 'Lanternwright key', examine: 'A key of glimmerstone, shaped like a sun inside a ring.', icon: { shape: 'key', color: '#e8f4ff' } });

const ROUTE = 'The Glimmerdeep sinkhole is north-east of the Whisperstones, just west of the road north of Brackenford.';

// =================================================================================================
// 18. Below the Silverrun (Intermediate)
// =================================================================================================
const WHEEL_ORDER = ['gd_wheel_lower', 'gd_wheel_middle', 'gd_wheel_upper'];
registerQuest({
  id: BS, name: 'Below the Silverrun', difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Ferrywarden Hesk Callow at the Silverrun bridge, east of Brackenford.',
  description: 'The Silverrun is dropping, and nobody knows where the water is going.',
  rewards: ['2 Quest Points', '3,000 Fishing XP', '2,500 Agility XP', "Lanternwright's almanac", 'A Lamp of Insight (2,500 XP)', 'Access to the Sporewood (Glimmerdeep level 2)'],
  onComplete: ({ game, player }) => { take(game, 'sluice_handle'); xp(player, { fishing: 3000, agility: 2500 }); give(game, 'lanternwright_almanac'); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Ferrywarden Hesk Callow')} at the ${red('Silverrun bridge')} east of Brackenford.`, 'Recommended: combat level 45. Monsters in the Glimmerdeep are level 40-60.'];
    if (stage >= 100) return [strike('I found where the Silverrun was going, drained the Drowned Galleries through the old sluices and opened the stair to the Sporewood.'), '', COMPLETE];
    const out = [strike('The Silverrun is dropping. Hesk thinks it drains into the old Lanternwright workings.')];
    if (stage === 10) out.push(`I should go down the ${red('Glimmerdeep sinkhole')} and find the ${red('sluices')}. ${ROUTE}`);
    if (stage === 20) {
      out.push(strike('I found the sluice chamber in the Drowned Galleries.'));
      out.push(has(game, 'sluice_handle') ? strike('I took the sluice handle back from the gillback raiders.') : `The wheels have no handle. The ${red('gillback raiders')} in the galleries must have carried it off.`);
      out.push(`Then I must turn the three ${red('sluice wheels')} in the right order. The ${red("sluice-keeper's slate")} may help.`);
    }
    if (stage === 30) out.push(strike('The sluices are open and the Drowned Galleries have drained.'), `I should tell ${red('Hesk')}.`);
    return out;
  },
});

registerDialogue('ferrywarden_hesk', ({ game }) => {
  const s = stageOf(game, BS);
  if (s >= 100) return [
    { npc: 'The river is back up to my old marks. And there is a whole drowned guild-hall under the Whisperstones. I am writing a very stern letter to the Highmarch Council.' },
    { options: [{ text: 'Any advice for the Glimmerdeep?', goto: 'tips' }, { text: 'Goodbye.', end: true }] },
    { label: 'tips', npc: 'Fish the black pool in the flooded hall with a harpoon - sabrefish, if you are good. Earmuffs for the keeners. And the forge-sentinels on the lava island deeper down cannot reach you across the lava. Bring a bow.', end: true },
  ];
  if (s === 30) return [
    { player: 'The galleries are drained. The water is going down the old drain-stair, not into the hall.' },
    { npc: 'I felt it this morning - the current is back. You have a good head for water, friend.' },
    { action: () => { game.quests.complete(BS); } },
    { npc: 'Here - I found this almanac floating in the shallows by the sinkhole. Lanternwright work. It suits a spellcaster better than a ferrywarden. And mind that stair you opened. Things live down there.', end: true },
  ];
  if (s === 20) return [
    { npc: 'Sluices without a handle? Typical. The gillbacks that came up the river last spring steal anything shiny. Get it back from them.' },
    { npc: 'And remember: water runs downhill. Whoever worked those wheels had a rule for it, I would bet my boat.', end: true },
  ];
  if (s === 10) return [{ npc: `The sinkhole by the Whisperstones. Down there, find whatever is drinking my river. ${ROUTE}`, end: true }];
  return [
    { npc: 'Look at the bank - see the dark line on the stones? That is where the Silverrun ran a month ago. It is dropping a hand a week.' },
    { options: [{ text: 'Where is the water going?', goto: 'where' }, { text: 'Rivers do that. Goodbye.', end: true }] },
    { label: 'where', npc: 'Into the ground. A sinkhole opened by the Whisperstones, right over the old Lanternwright workings - the Glimmerdeep, they called it. Closed and flooded these hundred years.' },
    { npc: 'The guild had sluices down there to keep the river out. If someone opened them right, the water would drain away below instead of eating my river.' },
    { options: [
      { text: 'I will go down and look at those sluices.', action: () => { game.quests.start(BS); game.quests.setStage(BS, 10); }, goto: 'ok' },
      { text: 'Into a flooded dungeon? No thank you.', end: true },
    ] },
    { label: 'ok', npc: 'Bless you. Take food, and something sharp. The things that drowned down there did not stay down.', end: true },
  ];
});

// =================================================================================================
// 19. Rot at the Roots (Intermediate)
// =================================================================================================
const CAP_ORDER = ['gd_cap_frost', 'gd_cap_moon', 'gd_cap_sun', 'gd_cap_ember'];
registerQuest({
  id: RR, name: 'Rot at the Roots', difficulty: 'Intermediate', questPoints: 2, completeStage: 100, skillRequirements: { herblore: 40 },
  start: 'Speak to Forester Bryn Ashgrove in Thornwood, east of the woodcutter\'s cabin.',
  description: 'A grey rot is climbing up the roots of the Thornwood from somewhere deep below.',
  rewards: ['2 Quest Points', '3,500 Herblore XP', '2,500 Woodcutting XP', 'Sporeward amulet', 'A Lamp of Insight (2,500 XP)', 'The Thornwood root-hollow: a shortcut straight down to the Sporewood'],
  onComplete: ({ game, player }) => { take(game, 'fungicide_dose', 10); take(game, 'rot_sample'); xp(player, { herblore: 3500, woodcutting: 2500 }); give(game, 'sporeward_amulet'); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Forester Bryn Ashgrove')} in ${red('Thornwood')}.`, 'Requirements: Below the Silverrun, Herblore 40. Recommended: combat level 60 (Vorlagh is level 74).'];
    if (stage >= 100) return [strike('I quenched the mycel ring in the Heartrot and cut down Vorlagh the Sporebound. The Thornwood roots are clean again.'), '', COMPLETE];
    const out = [strike('Grey rot is creeping up into the Thornwood from below.')];
    if (stage === 10) {
      out.push(has(game, 'rot_sample') ? strike('I scraped a rot sample from the hollow ironbark.') : `I need a ${red('rot sample')} from the ${red('hollow ironbark')} next to Bryn.`);
      out.push(`Then brew a fungicide by using a clean ${red('emberroot')} on the sample. (Herblore 40)`);
    }
    if (stage === 20) out.push(strike('I brewed four doses of fungicide.'), `I must dose the four ${red('glowing caps')} around the ${red('Heartrot')} in the Sporewood - in the right order. A ${red("spore-keeper's journal")} lies nearby.`);
    if (stage === 30) out.push(strike('The mycel ring is quenched.'), `Now ${red('Vorlagh the Sporebound')} can be killed for good.`);
    if (stage === 40) out.push(strike('Vorlagh is dead.'), `I should tell ${red('Bryn')}.`);
    return out;
  },
});

registerDialogue('forester_bryn', ({ game }) => {
  const s = stageOf(game, RR);
  if (s >= 100) return [
    { npc: 'Clean roots, green leaves. And the hollow ironbark makes a fine ladder down to that cave of yours, now the rot is gone - use it whenever you like.' },
    { options: [{ text: 'Thanks.', end: true }] },
  ];
  if (s === 40) return [
    { player: 'Vorlagh is dead, and the ring has gone dark.' },
    { npc: 'I knew it the moment it happened - every tree in the wood sighed. Here, I carved this from the heart-root cap. Wear it, and no poison will take you.' },
    { action: () => { game.quests.complete(RR); }, end: true },
  ];
  if (s === 30) return [{ npc: 'The ring is quenched? Then the troll at its heart can die like anything else. Go on - the Heartrot, at the far end of the Sporewood.', end: true }];
  if (s === 20) return [
    { npc: 'Four caps around the heart-root. Dose them in the order the spore-keeper wrote down, or they will spit at you.' },
    { if: () => !has(game, 'fungicide_dose'), goto: 'more' },
    { npc: 'The Heartrot is east of the Weaver\'s gallery, across the spore-choked stream - or the long way round through the web-tunnels.', end: true },
    { label: 'more', npc: 'Out of fungicide? I boiled a spare batch. Here.' },
    { action: () => { give(game, 'fungicide_dose', 4); }, end: true },
  ];
  if (s === 10) return [
    { npc: 'A sample from the hollow ironbark, then emberroot on it. You have the hands for it - Herblore 40, at least.' },
    { if: () => !!flags(game, RR).seenRoot, goto: 'below' },
    { npc: 'The hollow is right beside me. Go on, have a look.', end: true },
    { label: 'below', npc: 'The roots go down further than any root should. Into that Glimmerdeep, I would wager.', end: true },
  ];
  const ok = done(game, BS);
  return [
    { npc: 'Do not lean on that tree. Do not lean on ANY tree. Look at the bark - grey, soft. The rot is coming up the roots.' },
    { options: [{ text: 'Where is it coming from?', goto: 'where' }, { text: 'I will leave you to your trees.', end: true }] },
    { label: 'where', npc: 'From below. Something down in the dark is feeding it. The old Lanternwright delve - folk say it is open again.' },
    { if: () => !ok, goto: 'notyet' },
    { npc: 'If you have been down there, you can help. We burn it out with a fungicide - emberroot and a sample of the rot itself - and dose the heart of it.' },
    { options: [
      { text: 'I will help you cure the Thornwood.', action: () => { game.quests.start(RR); game.quests.setStage(RR, 10); }, goto: 'ok' },
      { text: 'Not today.', end: true },
    ] },
    { label: 'ok', npc: 'Good. First, scrape a sample from the hollow ironbark there. Carefully.', end: true },
    { label: 'notyet', npc: 'But the way down is flooded, they say. Ask the ferrywarden at the Silverrun - Hesk knows that water better than anyone. (Requires: Below the Silverrun.)', end: true },
  ];
});

// =================================================================================================
// 20. The Lantern Lock (Intermediate)
// =================================================================================================
const LANTERNS = 5;
const LOCK_START = [1, 0, 1, 0, 0];
registerQuest({
  id: LL, name: 'The Lantern Lock', difficulty: 'Intermediate', questPoints: 2, completeStage: 100, skillRequirements: { mining: 45, smithing: 40 },
  start: 'Speak to Quarrymaster Odo Flint in Greystone Quarry.',
  description: 'The quarry crews have found a sealed Lanternwright hatch in the depths, and Odo wants to know what is under it.',
  rewards: ['2 Quest Points', '4,000 Mining XP', '3,500 Smithing XP', 'Slagweave gauntlets', 'A Lamp of Insight (2,500 XP)', 'Access to the Emberworks (Glimmerdeep level 3)'],
  onComplete: ({ game, player }) => { take(game, 'lanternwright_key'); xp(player, { mining: 4000, smithing: 3500 }); give(game, 'slagweave_gauntlets'); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Quarrymaster Odo Flint')} in ${red('Greystone Quarry')}.`, 'Requirements: Below the Silverrun, Mining 45, Smithing 40. I will need a pickaxe.'];
    if (stage >= 100) return [strike('I forged a glimmerstone key, lit the five lanterns of the Lanternwright hatch and opened the way to the Emberworks.'), '', COMPLETE];
    const out = [strike('Odo\'s crews heard of a sealed hatch deep in the Glimmerdeep.')];
    if (stage === 10) out.push(`I should find the ${red('Lanternwright hatch')} in the ${red("Weaver's gallery")} of the Sporewood and take a look at it.`);
    if (stage === 20) {
      out.push(strike('The hatch needs a sun-shaped key.'));
      if (has(game, 'glimmer_ingot')) out.push(strike('I smelted a glimmer ingot.'), `I should take it to ${red('Odo')}.`);
      else out.push(`I need ${red('two glimmer ore')} from the ${red('glimmer seam')} in the ${red('Old Delve')} (${game.player.inventory.count('glimmer_ore')}/2), smelted at a ${red('furnace')}. (Mining 45, Smithing 40)`);
    }
    if (stage === 30) out.push(strike('Odo forged me a Lanternwright key.'), `I must open the ${red('hatch')} with it and light its lanterns.`);
    if (stage === 40) out.push(strike('The hatch stands open.'), `I should tell ${red('Odo')}.`);
    return out;
  },
});

registerDialogue('quarrymaster_odo', ({ game }) => {
  const s = stageOf(game, LL);
  if (s >= 100) return [{ npc: 'A whole forge down there? The lads want to go and look. I told them they can look when they can lift a hammer the size of a cow.' }];
  if (s === 40) return [
    { player: 'The hatch is open. Below it is a forge - an enormous one.' },
    { npc: 'Ha! I knew it. The Lanternwrights did not dig all that way for the view. Here, my old gauntlets - woven from slag-wire off the Greystone furnaces. Better on your hands than on my shelf.' },
    { action: () => { game.quests.complete(LL); }, end: true },
  ];
  if (s === 30) return [{ npc: 'Key in the hatch, then. And if it asks you a riddle, answer politely.', end: true }];
  if (s === 20) return [
    { npc: 'A sun in a ring for a keyhole? That is a Lanternwright lock. They made their keys of glimmerstone - two good lumps, smelted hot.' },
    { if: () => has(game, 'glimmer_ingot'), goto: 'forge' },
    { npc: 'There is a glimmer seam in the old delve-workings down there. Mine two lumps, smelt them at any furnace, and bring me the ingot. I will shape the key.', end: true },
    { label: 'forge', player: 'Here is the glimmer ingot.' },
    { action: () => { take(game, 'glimmer_ingot'); give(game, 'lanternwright_key'); game.quests.setStage(LL, 30); } },
    { npc: 'Lovely stuff. A tap here, a tap there... one sun-in-a-ring. Off you go.', end: true },
  ];
  if (s === 10) return [{ npc: 'The hatch is in the Sporewood, past the spider tunnels - the Weaver\'s gallery, my lads called it before they ran. Have a look and tell me what it needs.', end: true }];
  const ok = done(game, BS);
  return [
    { npc: 'Mind the edge. Greystone drops a long way, and so does everything underneath it.' },
    { options: [{ text: 'Underneath it?', goto: 'under' }, { text: 'Goodbye.', end: true }] },
    { label: 'under', npc: 'Two of my lads went down that sinkhole by the Whisperstones. Came back white as chalk, talking about a stone hatch in the spider tunnels, ringed with little lantern-cups.' },
    { if: () => !ok, goto: 'notyet' },
    { npc: 'I want to know what is under it. Quarrymen are curious folk. Will you look?' },
    { options: [
      { text: 'I will find out what is under the hatch.', action: () => { game.quests.start(LL); game.quests.setStage(LL, 10); }, goto: 'ok' },
      { text: 'Your lads can look themselves.', end: true },
    ] },
    { label: 'ok', npc: 'Good. Go and look at it, then come back and tell me what it needs.', end: true },
    { label: 'notyet', npc: 'Mind you, the way down past the drowned stair is under water. Hesk at the Silverrun bridge has opinions about that water. (Requires: Below the Silverrun.)', end: true },
  ];
});

// =================================================================================================
// 21. The Last Lanternwright (Experienced)
// =================================================================================================
const WORDS = ['EMBER', 'FLAME', 'LIGHT', 'NIGHT', 'HEART'];
registerQuest({
  id: LW, name: 'The Last Lanternwright', difficulty: 'Experienced', questPoints: 3, completeStage: 100,
  start: 'Speak to Archivist Sabelle Venn by the founder\'s statue in Highmarch.',
  description: 'Highmarch\'s archivist wants to know what became of the Lanternwrights. The answer is at the bottom of the Glimmerdeep, and it is still burning.',
  rewards: ['3 Quest Points', '6,000 Smithing XP', '4,000 Firemaking XP', "Forgefather's hammer", 'A Greater Lamp of Insight (10,000 XP)', 'Permanent access to the Heart Forge (the Ashwright Engine)'],
  onComplete: ({ game, player }) => { xp(player, { smithing: 6000, firemaking: 4000 }); give(game, 'forgefather_hammer'); give(game, 'greater_insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Archivist Sabelle Venn')} by the ${red("founder's statue")} in ${red('Highmarch')}.`, 'Requirements: Rot at the Roots, The Lantern Lock. Recommended: combat level 70 - the Ashwright Engine is level 96.'];
    if (stage >= 100) return [strike('I learned the fate of the Lanternwrights, opened the Heart-gate with their word and shut down the Ashwright Engine. The forty-one are at peace.'), '', COMPLETE];
    const out = [strike('Sabelle wants to know what became of the Lanternwrights.')];
    if (stage === 10) out.push(`I should search the ${red('Lanternwright archive')} in the ${red('Emberworks')}, at the bottom of the Glimmerdeep.`);
    if (stage === 20) out.push(strike('The Echo of Ommra Vey told me of the Ashwright Engine.'), `The ${red('Heart-gate')} opens to the Lanternwrights' word. Ommra says it is written in his ${red('forge ledger')}, in their cant.`);
    if (stage === 30) out.push(strike('The Heart-gate is open.'), `I must destroy the ${red('Ashwright Engine')} in the Heart Forge. The ${red('engine schematic')} in the foundry may help.`);
    if (stage === 40) out.push(strike('The Engine is cold.'), `I should tell ${red('Sabelle')} in Highmarch.`);
    return out;
  },
});

registerDialogue('archivist_sabelle', ({ game }) => {
  const s = stageOf(game, LW);
  if (s >= 100) return [{ npc: 'I have written it all down: the guild, the forge, the Engine, and you. The Council has agreed to put the lamps back in the keep. Glimmerstone ones.' }];
  if (s === 40) return [
    { player: 'The Ashwright Engine is cold. Ommra and the others are free.' },
    { npc: 'Forty-one names on a charter, and not one of them came home. And now they can rest.' },
    { npc: 'The Echo left something for you, did he? No? Then take this. It came up from the sinkhole in Hesk\'s nets - the guild master-hammer. It belongs with the one who finished their work.' },
    { action: () => { game.quests.complete(LW); }, end: true },
  ];
  if (s === 30) return [{ npc: 'The gate is open? Then whatever is behind it is what took them. Be careful. I would like at least one Lanternwright story to have a happy ending.', end: true }];
  if (s === 20) return [{ npc: 'A cipher! The guild wrote everything in their cant - each letter one step along from the true one. Read his ledger and work it backwards.', end: true }];
  if (s === 10) return [{ npc: 'The Lanternwright archive should be at the very bottom - the Emberworks. If anything of the guild survives, it will be there.', end: true }];
  const ok = done(game, RR) && done(game, LL);
  return [
    { npc: 'Shh. No - sorry. Hello. I am reading about lamps. Do you know who lit the lamps of this town, a hundred years ago?' },
    { options: [{ text: 'Who?', goto: 'who' }, { text: 'I do not, and I do not need to. Goodbye.', end: true }] },
    { label: 'who', npc: 'The Lanternwrights. A guild of forty-one. Their lamps burned glimmerstone and never needed oil. Then one winter the whole guild went down into their delve and did not come back.' },
    { if: () => !ok, goto: 'notyet' },
    { npc: 'You have been down there - Odo Flint says you opened the old hatch. Will you go to the very bottom and find out what happened to them?' },
    { options: [
      { text: 'I will find the Lanternwrights.', action: () => { game.quests.start(LW); game.quests.setStage(LW, 10); }, goto: 'ok' },
      { text: 'Some stories are better unfinished.', end: true },
    ] },
    { label: 'ok', npc: 'Thank you. Their last master was Ommra Vey. If anything is left of him, it will be in the archive.', end: true },
    { label: 'notyet', npc: 'If only someone could reach the bottom of the Glimmerdeep. They say the deep levels are sealed, and the roots are rotten. (Requires: Rot at the Roots and The Lantern Lock.)', end: true },
  ];
});

registerDialogue('echo_of_ommra', ({ game }) => {
  const s = stageOf(game, LW);
  if (s >= 100 || s === 40) return [{ npc: 'The Engine sleeps, and we sleep with it. Light the lamps of the towns for us, traveller. That was all we ever wanted.', name: 'Echo of Ommra Vey' }];
  if (s === 30) return [{ npc: 'Beyond the gate. Mind its vents, and when it shields itself in white heat, turn the river on it - the quench-valves still flow.', name: 'Echo of Ommra Vey' }];
  if (s === 20) return [{ npc: 'The word of the Heart is in my ledger, written in our cant. One step past the truth - that is the rule. Walk it back.', name: 'Echo of Ommra Vey' }];
  if (s === 10) return [
    { npc: 'Living light. It has been a long time since anything living came this far down.', name: 'Echo of Ommra Vey' },
    { player: 'Are you Ommra Vey? Archivist Sabelle sent me to find out what became of the Lanternwrights.' },
    { npc: 'We built a hearth that would feed itself, so the lamps of the towns would never go out. The Ashwright Engine. It fed on coal, then on glimmer, then on us.', name: 'Echo of Ommra Vey' },
    { npc: 'Forty-one went into the Heart Forge to put it out. Forty-one are still in its fire. The Heart-gate opens to our word - it is in my ledger, on the desk there. End it.', name: 'Echo of Ommra Vey' },
    { action: () => { game.quests.setStage(LW, 20); }, end: true },
  ];
  return [{ npc: 'Forty-one names... forty-one lamps... it never goes out...', name: 'Echo of Ommra Vey' }];
});

// =================================================================================================
// Runtime: gates, puzzles, kill credit
// =================================================================================================
hook((game) => {
  const I = game.interactions;
  const ev = game.events;
  const qc = (id) => ev.emit('quest:change', { id, stage: stageOf(game, id) });

  // ---- transitions ----------------------------------------------------------------------------------------
  I.onObject('Climb-down', ['gd_flood_stair'], ({ player }) => {
    if (stageOf(game, BS) >= 30) return pass(game, player, GD.l2Arrive, 'You splash down the stair. The last of the floodwater gurgles away beneath you into the Sporewood...');
    game.message('Black water fills the stairway to the ceiling. You would never hold your breath that long.');
  });
  I.onObject('Inspect', ['gd_flood_stair'], () => game.message(stageOf(game, BS) >= 30 ? 'The stair is wet but clear. Warm, spore-heavy air rises from below.' : 'The stairway is drowned. Somewhere above, sluices must control this water.'));
  I.onObject('Climb-down', ['gd_hatch', 'gd_hatch_open'], ({ player }) => {
    if (stageOf(game, LL) >= 40) return pass(game, player, GD.l3Arrive, 'You climb down the iron ladder into a breath of forge-heat...');
    game.message('The hatch is sealed fast. Five empty lantern-cups ring a sun-shaped keyhole.');
  });
  I.onObject('Climb-down', ['gd_root_hollow'], ({ player }) => {
    if (done(game, RR)) return pass(game, player, GD.rootLadderOut, 'You climb down the root-rungs, deep under the Thornwood, and drop into the Sporewood.');
    game.message(stageOf(game, RR) ? 'The roots inside are soft and grey with rot. They would never take your weight.' : 'The hollow drops away into darkness. The roots inside are soft and grey; they would never take your weight.');
  });
  I.onObject('Climb-up', ['gd_root_ladder'], ({ player }) => {
    if (done(game, RR)) return pass(game, player, GD.rootHollowOut, 'You climb the roots up and up, and out through the hollow ironbark into Thornwood.');
    game.message('The root-rungs are rotten through. They crumble in your hands.');
  });
  I.onObject('Open', ['gd_heart_gate'], ({ player }) => {
    const s = stageOf(game, LW);
    const east = player.x > GD.gate[0];
    if (s >= 30) return pass(game, player, east ? GD.gateWest : GD.gateEast, east ? 'The Heart-gate lifts to let you out.' : 'The Heart-gate knows you. It grinds upward and you step into the heat of the Heart Forge.');
    if (s !== 20) { game.message('The portcullis will not move. Lanternwright letters are cut into the lintel above it.'); return; }
    game.ui.startDialogue([
      { message: 'You put your hand on the cold iron. The letters on the lintel seem to wait for a word.' },
      { title: 'Speak the word of the Heart:', options: [...WORDS.map((w) => ({ text: w, action: () => (w === 'LIGHT' ? 'right' : 'wrong') })), { text: 'Say nothing.', end: true }] },
      { label: 'wrong', message: 'Your voice echoes away. The gate does not stir.', end: true },
      { label: 'right', message: '"LIGHT." The letters on the lintel flare gold, one by one, and the portcullis grinds up into the dark.' },
      { action: () => { game.quests.setStage(LW, 30); pass(game, player, GD.gateEast, null); return false; } },
    ], { player });
  });
  I.onObject('Read-lintel', ['gd_heart_gate'], () => game.message('"THE HEART OPENS TO THE WORD OF THE WRIGHTS. WE CARRY IT DOWN SO THE TOWNS MAY CARRY IT ON."'));
  I.onObject('Read', ['gd_ledger_desk'], ({ player }) => {
    const s = stageOf(game, LW);
    game.playAnim(player, 'pickup', 900);
    game.ui.startDialogue([
      { message: '<col=8a4a00>Forge ledger of Ommra Vey, Master.</col> Coal, tallies, the names of apprentices. The last pages are rushed.' },
      { message: '"Day 90. The Engine burned its own coal-store dry and took the glimmer. Today it took Hobb. Tomorrow we go in, all of us, to put it out."' },
      { message: '"If we do not come back: the Heart-gate opens to our word. In the cant, as always: <col=8a4a00>M - J - H - I - U</col>."' },
      { message: () => (s >= 20 && s < 30 ? '(The Lanternwright cant: every letter is written one step past the true one - B for A, C for B, and so on.)' : 'The rest of the page is scorched.'), end: true },
    ], { player });
  });

  // ---- quest 1: the sluices -----------------------------------------------------------------------------------
  ev.on('area:enter', ({ area }) => {
    if (stageOf(game, BS) === 10 && area?.id === 'gd_galleries') game.message('<col=1a5a8a>Water roars somewhere ahead. The Silverrun must be pouring in through here.</col>');
  });
  const wheelLabel = (id) => id.replace('gd_wheel_', '');
  I.onObject('Inspect', Object.keys(GD.wheels), ({ target }) => {
    const s = stageOf(game, BS);
    if (s === 10) { game.quests.setStage(BS, 20); game.message('The sluice wheel\'s spindle is bare: someone has taken the handle. Wet claw-marks lead away into the galleries.'); return; }
    if (s >= 30) { game.message(`The ${wheelLabel(target.id)} sluice stands open. Water drains away below with a steady roar.`); return; }
    game.message(`The ${wheelLabel(target.id)} sluice wheel. ${has(game, 'sluice_handle') ? 'Your handle fits its spindle.' : 'Its handle is missing.'}`);
  });
  I.onItemOnObject(['sluice_handle'], Object.keys(GD.wheels), (ctx) => { I.dispatch('object', 'Turn', ctx.target.id, null, ctx); });
  I.onObject('Turn', Object.keys(GD.wheels), ({ player, target }) => {
    const s = stageOf(game, BS);
    if (s >= 30) { game.message('The sluices are already open.'); return; }
    if (s < 20) { if (s === 10) game.quests.setStage(BS, 20); game.message('The wheel has no handle to turn it by.'); return; }
    if (!has(game, 'sluice_handle')) { game.message('The wheel has no handle. The gillback raiders must have it.'); return; }
    const f = flags(game, BS);
    f.order ||= [];
    if (f.order.includes(target.id)) { game.message('That sluice is already open.'); return; }
    game.playAnim(player, 'crush', 1200);
    f.order.push(target.id);
    const i = f.order.length - 1;
    if (f.order[i] !== WHEEL_ORDER[i]) {
      f.order = [];
      game.spawnEffect('splash', player, { color: 0x3a80ff });
      game.applyDamage(player, rint(3, 8), { source: null, type: 'typeless' });
      game.message('<col=8a0000>The sluice bangs open - and the deep water has nowhere to go! A surge bursts back up through the chamber and slams every gate shut again.</col>');
      return;
    }
    game.message(`You crank the ${wheelLabel(target.id)} sluice open. Water churns away below${i < 2 ? '...' : ' - and the whole chamber shudders as the flood drains down the old stair!'}`);
    if (i === 2) {
      player.skills.addXp('agility', 300);
      game.spawnEffect('splash', { x: GD.floodStair[0], y: GD.floodStair[1] }, { color: 0x3a80ff });
      game.quests.setStage(BS, 30);
    }
  });
  ev.on('npc:death', ({ npc, killer }) => {
    if (killer && killer !== game.player) return;
    if (npc.id === 'gillback_raider' && stageOf(game, BS) === 20 && !has(game, 'sluice_handle') && !flags(game, BS).dropPending && Math.random() < 0.34) {
      flags(game, BS).dropPending = true;
      game.schedule(3, () => { flags(game, BS).dropPending = false; game.spawnGroundItem('sluice_handle', 1, npc.x, npc.y, { owner: game.player.name }); game.message('<col=1a5a8a>The raider drops a heavy iron crank - a sluice handle!</col>'); });
    }
    if (npc.id === 'vorlagh_sporebound' && stageOf(game, RR) === 30) {
      game.quests.setStage(RR, 40);
      game.message('<col=1a5a8a>Vorlagh crumbles into a heap of dry grey dust. Far above, the Thornwood stops rotting.</col>');
    }
    if (npc.id === 'ashwright_engine' && stageOf(game, LW) === 30) {
      game.quests.setStage(LW, 40);
      game.message('<col=1a5a8a>The Engine\'s heart-fire gutters and goes out. For a moment you see forty-one faces in the smoke - and then they are gone.</col>');
    }
  });
  ev.on('item:pickup', ({ itemId }) => { if (itemId === 'sluice_handle') qc(BS); });

  // ---- quest 2: rot sample, fungicide, the mycel ring --------------------------------------------------------------
  I.onObject('Inspect', ['gd_root_hollow'], ({ player }) => {
    const s = stageOf(game, RR);
    if (s === 10) {
      flags(game, RR).seenRoot = true;
      if (has(game, 'rot_sample') || has(game, 'fungicide_dose')) { game.message('Grey rot oozes from the roots. You already have a sample.'); return; }
      game.playAnim(player, 'pickup', 900);
      give(game, 'rot_sample');
      game.message('You scrape a twist of the grey rot from the roots into a scrap of cloth. It squirms.');
      qc(RR);
      return;
    }
    game.message(done(game, RR) ? 'Clean roots, worn smooth into rungs, lead down into the dark.' : 'Thick roots plunge down into the dark. They are soft and grey with rot.');
  });
  I.onItemOnItem(['rot_sample'], ['emberroot'], ({ player }) => {
    if (stageOf(game, RR) !== 10) { game.message('Nothing interesting happens.'); return; }
    if (player.skills.getLevel('herblore') < 40) { game.message('You need a Herblore level of 40 to brew a fungicide.'); return; }
    take(game, 'rot_sample'); take(game, 'emberroot');
    give(game, 'fungicide_dose', 4);
    player.skills.addXp('herblore', 400);
    game.playAnim(player, 'herblore', 1200);
    game.message('You crush the emberroot into the rot. It hisses, shrivels and boils down into four doses of fungicide.');
    game.quests.setStage(RR, 20);
  });
  const capName = (id) => ({ gd_cap_frost: 'frost-pale', gd_cap_moon: 'moon-blue', gd_cap_sun: 'sun-amber', gd_cap_ember: 'ember-red' }[id]);
  const DIM = CAP_ORDER.map((id) => `${id}_dim`);
  const setCaps = (dim) => { for (const o of game.findObjects((o) => (dim ? CAP_ORDER : DIM).includes(o.id))) game.replaceObject(o, dim ? `${o.id}_dim` : o.id.replace(/_dim$/, '')); };
  I.onObject('Inspect', [...CAP_ORDER, ...DIM], ({ target }) => {
    const id = target.id.replace(/_dim$/, '');
    game.message(target.id.endsWith('_dim') ? `The ${capName(id)} cap has gone dim and still.` : `A giant cap glowing ${capName(id)}. It pulses slowly, like breathing.`);
  });
  I.onItemOnObject(['fungicide_dose'], CAP_ORDER, (ctx) => { I.dispatch('object', 'Dose', ctx.target.id, null, ctx); });
  I.onObject('Dose', CAP_ORDER, ({ player, target }) => {
    const s = stageOf(game, RR);
    if (s >= 30) { game.message('The ring is already quenched.'); return; }
    if (s !== 20) { game.message('You poke the cap. It puffs a little cloud of spores at you, offended.'); return; }
    const f = flags(game, RR);
    f.caps ||= [];
    if (f.caps.includes(target.id)) { game.message('That cap is already dosed.'); return; }
    if (game.player.inventory.count('fungicide_dose') < 4 - f.caps.length) { game.message('You do not have enough fungicide left. Bryn has spare doses.'); return; }
    game.playAnim(player, 'pickup', 900);
    f.caps.push(target.id);
    const i = f.caps.length - 1;
    if (f.caps[i] !== CAP_ORDER[i]) {
      f.caps = [];
      setCaps(false);
      game.spawnEffect('splash', player, { color: 0xb0d060 });
      game.applyDamage(player, rint(4, 8), { source: null, type: 'typeless' });
      game.combat?.poison?.(player, 4);
      game.message('<col=8a0000>The cap convulses and spits a cloud of spores in your face! All around the ring, the caps flare bright again.</col>');
      return;
    }
    game.spawnEffect('sparkle', target, { color: 0xffffff });
    game.replaceObject(target, `${target.id}_dim`);
    game.message(`You splash fungicide over the ${capName(target.id)} cap. Its glow sputters and dies.`);
    if (i === 3) {
      take(game, 'fungicide_dose', 4);
      player.skills.addXp('herblore', 500);
      game.quests.setStage(RR, 30);
      game.message('<col=1a5a8a>The last cap goes dark. Deep in the Heartrot, something huge groans as the ring stops feeding it.</col>');
    }
  });

  // ---- quest 3: hatch, glimmer seam, smelting, the lantern lock -----------------------------------------------------
  const pickaxe = (p) => {
    const w = p.equipment.get('weapon')?.id;
    if (w?.endsWith('_pickaxe')) return w;
    for (let i = 0; i < p.inventory.size; i++) { const it = p.inventory.get(i); if (it?.id?.endsWith('_pickaxe')) return it.id; }
    return null;
  };
  I.onObject('Inspect', ['gd_hatch', 'gd_hatch_open'], ({ player }) => {
    const s = stageOf(game, LL);
    if (s === 10) { game.quests.setStage(LL, 20); game.message('A Lanternwright hatch: five empty lantern-cups in a ring, and in the middle a keyhole shaped like a sun inside a ring. You should tell Odo it needs a key.'); return; }
    if (s >= 40) { game.message('The hatch stands open over an iron ladder.'); return; }
    if (s === 30) return lanternLock(player);
    game.message('Five little lantern-cups ring a sun-shaped keyhole. The hatch is sealed fast.');
  });
  I.onItemOnObject(['lanternwright_key'], ['gd_hatch'], ({ player }) => lanternLock(player));
  function lanternLock(player) {
    if (stageOf(game, LL) !== 30) { game.message('Nothing interesting happens.'); return; }
    if (!has(game, 'lanternwright_key')) { game.message('The keyhole is shaped like a sun inside a ring. You need the right key.'); return; }
    const f = flags(game, LL);
    if (!Array.isArray(f.lamps) || f.lamps.length !== LANTERNS) f.lamps = LOCK_START.slice();
    const show = () => f.lamps.map((on, i) => `${i + 1}:${on ? '<col=c08000>LIT</col>' : 'dark'}`).join('  ');
    const press = (i) => {
      for (const d of [-1, 0, 1]) { const k = (i + d + LANTERNS) % LANTERNS; f.lamps[k] = f.lamps[k] ? 0 : 1; }
      game.playAnim(player, 'pickup', 500);
      return f.lamps.every(Boolean) ? 'win' : 'lock';
    };
    game.ui.startDialogue([
      { message: 'You turn the glimmerstone key. The five lantern-cups around the hatch stir; touching one flips it and its two neighbours, lit to dark and dark to lit.' },
      { label: 'lock', message: () => `The lanterns around the ring: ${show()}` },
      { title: 'Touch a lantern', options: [
        ...Array.from({ length: LANTERNS }, (_, i) => ({ text: `Lantern ${i + 1}`, action: () => press(i) })),
        { text: 'Step back from the hatch.', end: true },
      ] },
      { label: 'win', message: 'All five lanterns blaze at once. The sun-in-a-ring turns with a grinding click, and the hatch swings open onto an iron ladder.' },
      { action: () => {
        take(game, 'lanternwright_key');
        player.skills.addXp('smithing', 400);
        game.quests.setStage(LL, 40);
        openHatch();
        return false;
      } },
    ], { player });
  }
  function openHatch() { for (const o of game.findObjects((o) => o.id === 'gd_hatch')) game.replaceObject(o, 'gd_hatch_open'); }
  I.onObject('Mine', ['gd_glimmer_seam'], ({ player }) => {
    if (stageOf(game, LL) !== 20) { game.message(done(game, LL) || stageOf(game, LL) > 20 ? 'You have no more need of glimmerstone.' : 'Guild property, says the survey. The seam hums faintly; you leave it be.'); return; }
    if (has(game, 'glimmer_ingot') || game.player.inventory.count('glimmer_ore') >= 2) { game.message('You already have enough glimmerstone.'); return; }
    const pick = pickaxe(player);
    if (!pick) { game.message('You need a pickaxe to mine this seam.'); return; }
    if (player.skills.getLevel('mining') < 45) { game.message('You need a Mining level of 45 to mine glimmerstone.'); return; }
    game.message('You swing at the glimmer seam...');
    game.actions.start(player, { name: 'mine_glimmer', anim: 'mine', tool: pick, interval: 1,
      onTick: ({ ticks }) => {
        if (ticks === 0 || ticks % 4) return true;
        give(game, 'glimmer_ore');
        player.skills.addXp('mining', 90);
        const n = game.player.inventory.count('glimmer_ore');
        game.message(n >= 2 ? 'A second lump of glimmer ore breaks free. That should be enough for an ingot.' : 'A lump of pale, glowing ore breaks free.');
        qc(LL);
        return n < 2;
      } });
  });
  I.onItemOnObject(['glimmer_ore'], ['furnace'], ({ player }) => {
    if (stageOf(game, LL) !== 20) { game.message('Nothing interesting happens.'); return; }
    if (player.skills.getLevel('smithing') < 40) { game.message('You need a Smithing level of 40 to smelt glimmerstone.'); return; }
    if (!has(game, 'glimmer_ore', 2)) { game.message('You need two lumps of glimmer ore for an ingot.'); return; }
    game.playAnim(player, 'smith', 1800);
    game.actions.lock(player, 3);
    game.schedule(3, () => {
      if (!has(game, 'glimmer_ore', 2)) return;
      take(game, 'glimmer_ore', 2); give(game, 'glimmer_ingot');
      player.skills.addXp('smithing', 250);
      game.message('The glimmer ore melts into a bar that glows like a lamp. Odo can shape it into a key.');
      qc(LL);
    });
  });

  // ---- quest 4 ----------------------------------------------------------------------------------------------------
  // (Echo of Ommra dialogue moves 10 -> 20, the Heart-gate 20 -> 30, the Engine's death 30 -> 40.)

  // re-apply quest-changed scenery from the saved stage
  ev.on('game:ready', () => {
    if (stageOf(game, LL) >= 40) openHatch();
    if (stageOf(game, RR) >= 30) setCaps(true);
    else if (stageOf(game, RR) === 20) for (const o of game.findObjects((o) => (flags(game, RR).caps || []).includes(o.id))) game.replaceObject(o, `${o.id}_dim`);
  });
});
