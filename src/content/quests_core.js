// Quests 1-5 + quest dialogues. OWNER: agent F. (Imported by content/quests.js.)
// registerQuest({ id, name, difficulty, questPoints, completeStage, start (text), description,
//                 journal(stage, ctx) -> string[] (supports <col=rrggbb>), rewards: string[], onComplete })
// Quest stage lives in player.quests[id] (0 = not started, >= completeStage = complete).
// Use game.quests.getStage/setStage/start/complete (systems/quests.js). Runtime logic (object handlers,
// kill listeners, bosses) is registered with hook(fn) from quest_util.js and run at system init.
//
// Quests: The Lost Ledger, Smoke over Thornwood, The Miller's Riddle, Down in Gloomhollow (dungeon),
// The Ashen Pact (Wilderness) - continued in quests_more.js: Crown of the Mire (boss),
// A Thief in Highmarch, The Wayward Compass (spell unlock), The Drowned Bell.

import { registerQuest, registerDialogue, registerItem, registerSpawn, registerNpc, registerShop } from '../core/registry.js';
import {
  hook, stageOf, done, flags, has, take, give, strike, red, COMPLETE, questNpc, questItem, questObject, spawnNpc, spawnObj,
  clearAround, xp, lampDialogue,
} from './quest_util.js';
import './quest_models.js';

// =================================================================================================
// Shared: Lamp of Insight (XP lamp reward)
// =================================================================================================
registerItem({ id: 'insight_lamp', name: 'Lamp of Insight', examine: 'Rub it and choose what you would like to understand better.', value: 0, tradeable: false, lamp: 2500, options: ['Rub'], icon: { shape: 'pot', color: '#e8c040', color2: '#fff0a0' } });
hook((game) => {
  game.interactions.onItem('Rub', ['insight_lamp'], ({ slot, def }) => lampDialogue(game, slot, def.lamp));
});

// =================================================================================================
// 1. The Lost Ledger (Novice) - Mira, Brackenford
// =================================================================================================
questItem({ id: 'lost_ledger', name: "Mira's ledger", examine: 'A battered ledger full of tidy handwriting.', icon: { shape: 'book', color: '#6a3a8a' } });

registerQuest({
  id: 'lost_ledger', name: 'The Lost Ledger', difficulty: 'Novice', questPoints: 1, completeStage: 100,
  start: 'Speak to Mira, the Brackenford town guide.',
  description: 'Mira has misplaced her ledger somewhere east of town.',
  rewards: ['1 Quest Point', '150 coins', '250 Cooking XP', '250 Thieving XP'],
  onComplete: ({ game, player }) => {
    player.inventory.remove('lost_ledger', 1);
    game.giveItem('coins', 150, player);
    xp(player, { cooking: 250, thieving: 250 });
  },
  journal: (stage, { game }) => {
    if (stage === 0) return ['I can start this quest by speaking to <col=800000>Mira</col> in <col=800000>Brackenford</col>.'];
    if (stage < 100) {
      return [strike('Mira asked me to find her lost ledger.'),
        has(game, 'lost_ledger') ? `I have found the ledger. I should return it to ${red('Mira')}.` : `She thinks she dropped it near the ${red('goblins east of town')}.`];
    }
    return [strike('I found Mira\'s ledger near the goblin camp and returned it.'), '', COMPLETE];
  },
});
registerSpawn({ type: 'item', id: 'lost_ledger', qty: 1, x: 116, y: 158, respawnTicks: 30 });

registerDialogue('town_guide', (ctx) => {
  const { game } = ctx;
  const stage = stageOf(game, 'lost_ledger');
  if (stage >= 100) return [
    { npc: 'Thank you again for finding my ledger! The accounts balance for the first time in weeks.' },
    { options: [
      { text: 'Is there anyone else who needs help?', goto: 'hints' },
      { text: 'Can you tell me about this place?', goto: 'about' },
      { text: 'Goodbye.', end: true },
    ] },
    { label: 'hints', npc: 'Bram the forester was muttering about fires in Thornwood. Sister Maud at the chapel looks troubled too, and old Pell runs a training yard just north of town.' },
    { npc: 'If you fancy something further afield, the miller at Haverly Farms, the quarry foreman out west and the captain up in Highmarch could all use a hand.', end: true },
    { label: 'about', npc: 'Brackenford has a bank, a general store and a fine forge. Thornwood lies west, the quarry north-west, and Highmarch across the river to the north-east.', end: true },
  ];
  if (stage > 0) return [
    { npc: 'Any luck finding my ledger? I think I dropped it near the goblins east of town.' },
    { if: ({ player }) => player.inventory.has('lost_ledger'), goto: 'has' },
    { player: "Not yet. I'll keep looking.", end: true },
    { label: 'has', player: 'Here it is! A bit muddy, I\'m afraid.' },
    { npc: "Muddy, chewed and... is that goblin drawing in the margin? Oh, who cares - it's my ledger!" },
    { action: ({ game: g }) => { g.quests.complete('lost_ledger'); } },
    { npc: "You're a lifesaver. Please, take this for your trouble." },
    { npc: 'If you want more work, Bram the forester is fretting about fires in Thornwood - you will find him on the road just west of town. The bank is north of the square, if your pack gets heavy.', end: true },
  ];
  return [
    { npc: 'Welcome to Brackenford, traveller! I am Mira, the town guide.' },
    { options: [
      { text: 'Can you tell me about this place?', goto: 'about' },
      { text: 'You look worried. Is something wrong?', goto: 'quest' },
      { text: 'Goodbye.', end: true },
    ] },
    { label: 'about', npc: 'Brackenford has a bank, a general store and a fine forge. Thornwood lies west, the quarry north-west, and Highmarch across the river to the north-east.' },
    { npc: 'Whatever you do, mind the ditch to the north. Beyond it is the Wilderness, where anyone may attack you.', end: true },
    { label: 'quest', npc: "I've lost my ledger! All the town accounts are in it. I think I dropped it near the goblins east of town." },
    { options: [
      { text: "I'll find it for you.", action: ({ game: g }) => { g.quests.start('lost_ledger'); }, goto: 'accept' },
      { text: "Sorry, I'm busy.", end: true },
    ] },
    { label: 'accept', npc: 'Oh, thank you! Please be careful of those goblins.', end: true },
  ];
});

// =================================================================================================
// 2. Smoke over Thornwood (Novice) - Bram the forester
// =================================================================================================
const SOT = 'smoke_over_thornwood';
questNpc({ id: 'forester_bram', name: 'Bram Tolliver', examine: 'The Thornwood forester. Smells of pine sap and worry.',
  model: { colors: { top: '#3a5a2a', legs: '#4a3a2a', hair: '#6a4a2a' }, extras: { beard: true }, equipment: { weapon: 'bronze_axe' } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('forester_bram', 76, 137);
questItem({ id: 'charred_tinder', name: 'Charred tinder', examine: 'A twist of oil-soaked bark. Someone started a fire on purpose.', stackable: true, icon: { shape: 'log', color: '#2a2420' } });
questItem({ id: 'firebug_torch', name: "Firebug's torch", examine: 'A crude goblin torch, still smoking.', icon: { shape: 'staff', color: '#ff8a20' } });
const STUMPS = [['scorched_stump_1', 55, 121], ['scorched_stump_2', 66, 128], ['scorched_stump_3', 53, 158]];
for (const [id, x, y] of STUMPS) {
  questObject({ id, name: 'Scorched stump', examine: 'All that is left of a fine old tree.', options: ['Search'], model: { template: 'q_stump', burnt: true } });
  clearAround(x, y, 1);
  spawnObj(id, x, y);
}
registerNpc({
  // a Novice-quest fight: beatable by a fresh character with the starter dagger and some bread
  id: 'goblin_firebug', name: 'Goblin firebug', examine: 'A goblin who really, really likes fire.', combatLevel: 5, options: ['Attack'], aggressive: true, aggroRange: 2,
  stats: { attack: 3, strength: 3, defence: 2, hitpoints: 8 }, maxHit: 1, attackStyle: 'crush', dropTable: 'goblin', respawnTicks: 30, wanderRadius: 3, slayerCategory: 'goblins',
  model: { template: 'goblin', colors: { skin: '#7a8a2a' }, equipment: { weapon: { shape: 'mace', color: '#ff8a20' } }, extras: { glowEyes: '#ff8a20' } },
});
questObject({ id: 'firebug_fire', name: 'Campfire', examine: 'Far too big for a campfire.', blocks: true, model: { template: 'fire' } });
clearAround(50, 146, 3);
spawnObj('firebug_fire', 50, 146);
for (const [x, y] of [[48, 144], [52, 147], [49, 148]]) spawnNpc('goblin_firebug', x, y, 3);

registerQuest({
  id: SOT, name: 'Smoke over Thornwood', difficulty: 'Novice', questPoints: 1, completeStage: 100,
  start: 'Speak to Bram Tolliver at the eastern edge of Thornwood.',
  description: 'Someone has been setting fires in Thornwood.',
  rewards: ['1 Quest Point', '800 Woodcutting XP', '500 Firemaking XP', 'An iron axe'],
  onComplete: ({ game, player }) => { take(game, 'firebug_torch'); take(game, 'charred_tinder', 3); xp(player, { woodcutting: 800, firemaking: 500 }); give(game, 'iron_axe'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Bram Tolliver')} at the eastern edge of ${red('Thornwood')}.`, 'I may have to fight a few goblins, so I should bring some food.'];
    if (stage >= 100) return [strike('Bram asked me to find out who was setting fires in Thornwood.'), strike('I found charred tinder and tracked down the goblin firebugs.'), '', COMPLETE];
    const out = [strike('Bram asked me to find out who was setting fires in Thornwood.')];
    if (stage === 10) {
      const n = Object.keys(flags(game, SOT)).filter((k) => k.startsWith('stump')).length;
      out.push(`I should search the ${red('scorched stumps')} around the forest. (${n}/3 searched)`);
      if (n >= 3) out.push(`I've found three bits of tinder. I should show them to ${red('Bram')}.`);
    } else {
      out.push(strike('The fires were started with oil-soaked tinder.'));
      out.push(has(game, 'firebug_torch') ? `I took a torch from a firebug. I should bring it to ${red('Bram')}.` : `Bram thinks goblins camping in the ${red('south-west of Thornwood')} are to blame. I should defeat one and bring back its torch.`);
    }
    return out;
  },
});

registerDialogue('forester_bram', ({ game }) => {
  const s = stageOf(game, SOT);
  if (s >= 100) return [{ npc: 'No new fires since you sorted those goblins out. The birds are singing again.' }];
  if (s === 20) return [
    { npc: 'Any luck with those firebugs?' },
    { if: () => has(game, 'firebug_torch'), goto: 'torch' },
    { player: 'Not yet.' },
    { npc: "They're camped in the south-west of the forest. Bring me one of their torches so I know it's done.", end: true },
    { label: 'torch', player: "Here's one of their torches. They won't be lighting anything for a while." },
    { action: () => { game.quests.complete(SOT); } },
    { npc: 'Ha! Smell that - lamp oil and goblin. Thank you, friend. Take my spare axe; it bites better than bronze.', end: true },
  ];
  if (s === 10) return [
    { npc: 'Found anything in those burnt stumps?' },
    { if: () => has(game, 'charred_tinder', 3), goto: 'tinder' },
    { player: 'Still looking.' },
    { npc: "There are three that went up last week. Search them all - there must be something.", end: true },
    { label: 'tinder', player: 'I found these twists of bark in every stump.' },
    { npc: "Oil-soaked tinder... and goblin-chewed at the ends. Those firebugs! They've been camping in the south-west corner of the woods." },
    { npc: "I'm no fighter. Could you drive them off? Bring me one of their torches as proof." },
    { action: () => { game.quests.setStage(SOT, 20); } },
    { player: "I'll deal with them.", end: true },
  ];
  return [
    { npc: 'Smell that? Smoke. Again. Third fire this month and it is not lightning, I can tell you that.' },
    { options: [
      { text: 'Do you want me to look into it?', goto: 'yes' },
      { text: 'Fires? Sounds dangerous. Goodbye.', end: true },
    ] },
    { label: 'yes', npc: 'Would you? Three old trees went up - their stumps are still standing. Search them and see what you can find.' },
    { action: () => { game.quests.start(SOT); game.quests.setStage(SOT, 10); } },
    { player: "I'll take a look.", end: true },
  ];
});

hook((game) => {
  game.interactions.onObject('Search', STUMPS.map((s) => s[0]), ({ player, target }) => {
    if (stageOf(game, SOT) !== 10) { game.message('You search the stump but find only ash.'); return; }
    const f = flags(game, SOT);
    const key = `stump_${target.id}`;
    if (f[key]) { game.message("You've already searched this stump."); return; }
    game.playAnim(player, 'pickup', 900);
    f[key] = true;
    give(game, 'charred_tinder');
    game.message('Among the ashes you find a twist of oil-soaked bark.');
    game.events.emit('quest:change', { id: SOT, stage: 10 });
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id !== 'goblin_firebug' || stageOf(game, SOT) !== 20 || has(game, 'firebug_torch')) return;
    game.schedule(3, () => game.spawnGroundItem('firebug_torch', 1, npc.x, npc.y, { owner: game.player.name }));
  });
});

// =================================================================================================
// 3. The Miller's Riddle (Intermediate, puzzle) - Ansel the miller, Haverly Farms
// =================================================================================================
const MR = 'millers_riddle';
questNpc({ id: 'miller_ansel', name: 'Ansel the miller', examine: 'Flour in his beard, flour in his eyebrows, flour everywhere.', options: ['Talk-to', 'Trade'],
  model: { colors: { top: '#e8e0d0', legs: '#8a7a5a', hair: '#d8d0c0' }, extras: { beard: true } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('miller_ansel', 152, 163);
questItem({ id: 'granary_deed', name: 'Granary deed', examine: "The deed to Haverly's granary, sealed with green wax.", icon: { shape: 'scroll', color: '#e8dcb8' } });
const SCARECROWS = [
  ['scarecrow_1', 144, 152, '#5a6a3a', 'A riddle is scratched on a board around its neck: "My FIRST is the one I was built to frighten."'],
  ['scarecrow_2', 150, 157, '#6a3a3a', 'Painted on its hat: "My SECOND rises when the farmer sleeps."'],
  ['scarecrow_3', 155, 151, '#3a4a6a', 'Stitched into its coat: "My THIRD is the gold the farmer reaps."'],
];
for (const [id, x, y, coat] of SCARECROWS) {
  questObject({ id, name: 'Scarecrow', examine: 'It has a riddle about it somewhere.', options: ['Inspect'], model: { template: 'q_scarecrow', coat } });
  spawnObj(id, x, y);
}
questObject({ id: 'granary_strongbox', name: 'Granary strongbox', examine: 'A strongbox with three brass dials, each engraved with symbols.', options: ['Open'], model: { template: 'chest', color: '#6a4a2a' } });
spawnObj('granary_strongbox', 143, 170);
registerShop({ id: 'ansel_granary', name: "Ansel's Granary", sellRate: 1, buyRate: 0.4, stock: [{ id: 'seed_cake', qty: 20 }, { id: 'honey_bun', qty: 20 }, { id: 'bread', qty: 30 }, { id: 'fieldroot_seed', qty: 20 }, { id: 'honeycorn_seed', qty: 20 }, { id: 'pot_of_flour', qty: 20 }, { id: 'grain', qty: 20 }] });

registerQuest({
  id: MR, name: "The Miller's Riddle", difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Ansel the miller at Haverly Farms.',
  description: "Ansel has forgotten the combination to his late father's strongbox.",
  rewards: ['2 Quest Points', '1,500 Farming XP', '800 Thieving XP', '1,000 coins', "Access to Ansel's granary shop"],
  onComplete: ({ game, player }) => { take(game, 'granary_deed'); xp(player, { farming: 1500, thieving: 800 }); give(game, 'coins', 1000); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Ansel the miller')} at ${red('Haverly Farms')}.`];
    if (stage >= 100) return [strike('I solved the riddle of the scarecrows and opened the granary strongbox for Ansel.'), '', COMPLETE];
    const f = flags(game, MR);
    const out = [strike("Ansel's father hid the granary deed in a strongbox with a three-dial lock."), 'The clues are hidden on the three scarecrows in the fields:'];
    SCARECROWS.forEach(([id], i) => out.push(f[id] ? strike(`Scarecrow ${i + 1}: ${['the one it was built to frighten', 'what rises when the farmer sleeps', 'the gold the farmer reaps'][i]}`) : `Scarecrow ${i + 1}: ${red('not yet inspected')}`));
    if (stage >= 20) out.push(`I opened the strongbox! I should take the deed to ${red('Ansel')}.`);
    else out.push(`Then I can try the dials on the ${red('strongbox')} in the farmhouse.`);
    return out;
  },
});

registerDialogue('miller_ansel', ({ game }) => {
  const s = stageOf(game, MR);
  if (s >= 100) return [{ npc: 'The granary is mine again, thanks to you. Buy anything you like - friends of the farm get fair prices.' }, { options: [{ text: 'Let me see your stock.', action: () => { game.ui.openShop('ansel_granary'); return false; } }, { text: 'Goodbye.', end: true }] }];
  if (s >= 10) return [
    { npc: 'Any luck with that confounded box?' },
    { if: () => has(game, 'granary_deed'), goto: 'deed' },
    { player: 'Not yet.' },
    { npc: "Father said the answer was 'in the fields, where the birds won't sit'. He loved his riddles. I hated them.", end: true },
    { label: 'deed', player: 'Crow, moon and wheat. Here is your deed.' },
    { action: () => { game.quests.complete(MR); } },
    { npc: 'The granary deed! Now that swindler from Highmarch can whistle for it. Thank you, thank you!', end: true },
  ];
  return [
    { npc: "Oh, hello. Sorry, I'm not much company today. My father passed last winter, and he left the deed to the granary locked in his strongbox." },
    { npc: "There's a merchant in Highmarch claiming the granary is his unless I can show the deed. And I can't remember the combination!" },
    { options: [
      { text: 'Maybe I can help you open it.', goto: 'yes' },
      { text: "That's rotten luck. Goodbye.", end: true },
    ] },
    { label: 'yes', npc: "Would you? Father was always going on about his scarecrows. 'The answer is in the fields', he'd say. The box is in the farmhouse." },
    { action: () => { game.quests.start(MR); game.quests.setStage(MR, 10); }, end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  I.onNpc('Trade', ['miller_ansel'], () => {
    if (!done(game, MR)) { game.ui.startDialogue([{ npc: "Sorry, I can't sell anything while that merchant has a claim on my granary.", name: 'Ansel the miller' }]); return; }
    game.ui.openShop('ansel_granary');
  });
  I.onObject('Inspect', SCARECROWS.map((s) => s[0]), ({ target }) => {
    const sc = SCARECROWS.find((s) => s[0] === target.id);
    game.message(sc[4]);
    if (stageOf(game, MR) >= 10 && stageOf(game, MR) < 100) { flags(game, MR)[target.id] = true; game.events.emit('quest:change', { id: MR, stage: stageOf(game, MR) }); }
  });
  const SYMBOLS = ['Sun', 'Moon', 'Crow', 'Wheat'];
  I.onObject('Open', ['granary_strongbox'], () => {
    const s = stageOf(game, MR);
    if (s >= 20 || done(game, MR)) { game.message('The strongbox is empty.'); return; }
    if (s < 10) { game.message("It's locked with a three-dial combination. It's not yours to open."); return; }
    const pick = [];
    const dial = (n) => ({ title: `Set dial ${n}`, options: SYMBOLS.map((sym) => ({ text: sym, action: () => { pick[n - 1] = sym; } })) });
    game.ui.startDialogue([
      { message: 'Each dial is engraved with a sun, a moon, a crow and a sheaf of wheat.' },
      dial(1), dial(2), dial(3),
      { action: () => (pick.join() === 'Crow,Moon,Wheat' ? 'open' : 'fail') },
      { label: 'fail', message: "You turn the last dial and pull. The lock doesn't budge.", end: true },
      { label: 'open', message: 'Click... click... CLUNK. The strongbox swings open! Inside is a rolled-up deed.' },
      { action: () => { give(game, 'granary_deed'); game.quests.setStage(MR, 20); }, end: true },
    ], { player: game.player });
  });
});

// =================================================================================================
// 4. Down in Gloomhollow (Intermediate, dungeon) - Hilde Stonebrook, Greystone Quarry
// =================================================================================================
const DG = 'down_in_gloomhollow';
questNpc({ id: 'foreman_hilde', name: 'Hilde Stonebrook', examine: 'The quarry foreman. Arms like hawsers.',
  model: { female: true, hairStyle: 'short', colors: { top: '#6a5a3a', legs: '#3a3a3a', hair: '#3a2a1a' }, equipment: { weapon: 'iron_pickaxe', head: { shape: 'med_helm', color: '#c8a040' } } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('foreman_hilde', 37, 67);
questNpc({ id: 'miner_pip', name: 'Pip Marrow', examine: 'A young miner, grimy and very relieved.', wanderRadius: 0,
  model: { colors: { top: '#5a5040', legs: '#3a3428', hair: '#c8803a' }, equipment: { head: { shape: 'med_helm', color: '#c8a040' } } } });
questItem({ id: 'pips_lamp', name: "Pip's lamp", examine: 'A dented miner\'s lamp with a scratched name: PIP.', icon: { shape: 'pot', color: '#c8a040' } });
questObject({ id: 'miners_tablet', name: 'Carved tablet', examine: 'Old miners carved something here.', options: ['Read'], model: { template: 'gravestone' } });
questObject({ id: 'rune_seal', name: 'Rune-sealed passage', examine: 'A passage blocked by a slab of rune-cut stone. It hums.', options: ['Inspect'], model: { template: 'q_seal' } });
questObject({ id: 'rune_seal_open', name: 'Open passage', examine: 'The seal has slid into the floor.', blocks: false, model: { template: 'q_seal', glow: '#3a3440' } });
const BRAZIERS = [['brazier_east', 'east-facing brazier', 'The bowl faces the east wall of the cavern.'], ['brazier_drip', 'dripping brazier', 'Water drips onto it from a stalactite above.'], ['brazier_bones', 'bone-strewn brazier', 'Old bones are piled around its base.']];
for (const [id, , ex] of BRAZIERS) {
  questObject({ id, name: 'Brazier', examine: ex, options: ['Light'], model: { template: 'q_brazier' } });
  questObject({ id: `${id}_lit`, name: 'Lit brazier', examine: 'It burns with a steady flame.', model: { template: 'q_brazier', lit: true } });
}
// placement inside Gloomhollow Depths (cave floor)
export const GLOOM = { tablet: [16, 185], seal: [18, 188], pipAt: [18, 187], east: [27, 184], drip: [13, 184], bones: [22, 187] };
spawnObj('miners_tablet', ...GLOOM.tablet);
spawnObj('rune_seal', ...GLOOM.seal);
spawnObj('brazier_east', ...GLOOM.east);
spawnObj('brazier_drip', ...GLOOM.drip);
spawnObj('brazier_bones', ...GLOOM.bones);

registerQuest({
  id: DG, name: 'Down in Gloomhollow', difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Hilde Stonebrook by the cave in Greystone Quarry.',
  description: 'A young miner has gone missing in the Gloomhollow Depths.',
  rewards: ['2 Quest Points', '2,500 Mining XP', '800 Firemaking XP', '600 Agility XP', 'A Lamp of Insight (2,500 XP)'],
  onComplete: ({ game, player }) => { take(game, 'pips_lamp'); xp(player, { mining: 2500, firemaking: 800, agility: 600 }); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Hilde Stonebrook')} in ${red('Greystone Quarry')}.`, 'I will need a tinderbox and should be able to defend myself.'];
    if (stage >= 100) return [strike('Hilde asked me to find Pip, a miner lost in the Gloomhollow Depths.'), strike('I lit the old braziers in the right order and freed him.'), '', COMPLETE];
    const out = [strike('Hilde asked me to find Pip, a miner lost in the Gloomhollow Depths.')];
    if (stage === 10) out.push(`Pip is trapped behind a ${red('rune-sealed passage')} in the southern caverns of the Depths. The ${red('carved tablet')} nearby might explain how to open it.`, `I'll need a ${red('tinderbox')} to light the three braziers.`);
    if (stage === 20) out.push(strike('I opened the seal.'), `I should talk to ${red('Pip')}.`);
    if (stage === 30) out.push(strike('I freed Pip.'), `I should return to ${red('Hilde')} with Pip's lamp.`);
    return out;
  },
});

registerDialogue('foreman_hilde', ({ game }) => {
  const s = stageOf(game, DG);
  if (s >= 100) return [{ npc: "Pip's back at work, the daft lad. Mind yourself down there." }];
  if (s === 30) return [
    { npc: 'Well? Did you find him?' },
    { if: () => has(game, 'pips_lamp'), goto: 'lamp' },
    { player: "I found him, but I've lost his lamp." },
    { npc: "Then go back and get it. I won't believe it till I see it.", end: true },
    { label: 'lamp', player: "Pip's safe - he was stuck behind an old rune seal. Here's his lamp." },
    { action: () => { game.quests.complete(DG); } },
    { npc: "That boy! Thank you. Take this - an old lamp the guild gives to people who've earned it. Rub it and learn something.", end: true },
  ];
  if (s >= 10) return [{ npc: 'Pip went in through that cave and never came back out. He was poking about the southern caverns of the Depths. Take a tinderbox and a weapon.' }];
  return [
    { npc: "You there! Can you fight? One of my lads, Pip, went into the Gloomhollow Depths after a rumour of silver and hasn't come back." },
    { npc: "I can't spare anyone else, and the things down there have been bolder lately. Will you look for him?" },
    { options: [
      { text: "I'll find him.", action: () => { game.quests.start(DG); game.quests.setStage(DG, 10); }, goto: 'ok' },
      { text: 'Not my problem.', end: true },
    ] },
    { label: 'ok', npc: "Bless you. Climb in through the cave there. Bring a tinderbox - the old miners kept braziers burning down there for a reason.", end: true },
  ];
});
registerDialogue('miner_pip', ({ game }) => {
  const s = stageOf(game, DG);
  if (s === 20) return [
    { npc: 'Light! Oh, thank the stones. I slipped through here chasing a silver seam and the slab slid shut behind me!' },
    { player: 'Hilde sent me. Can you walk?' },
    { npc: "I can run! Here, take my lamp to Hilde so she knows I'm alive - I'm going the long way round, I'm not passing those bats again." },
    { action: () => { give(game, 'pips_lamp'); game.quests.setStage(DG, 30); } },
    { npc: 'Thank you!', end: true },
  ];
  return [{ npc: 'I am never chasing a rumour again. Never.' }];
});

hook((game) => {
  const I = game.interactions;
  const order = ['brazier_east', 'brazier_drip', 'brazier_bones'];
  let pip = null;
  const resetBraziers = () => {
    for (const o of game.findObjects((o) => order.includes(o.originalId) && o.id !== o.originalId)) game.replaceObject(o, o.originalId);
  };
  I.onObject('Read', ['miners_tablet'], () => {
    game.ui.startDialogue([
      { message: 'The tablet reads: "When the dark comes in and the way is shut, light the fires as the old crews did:"' },
      { message: '"First the flame that greets the rising sun; then the one that weeps beneath the stone; last the one that keeps the dead company."' },
    ]);
  });
  I.onObject('Inspect', ['rune_seal'], () => {
    game.message('The slab hums faintly. Behind it, someone is shouting for help!');
    if (stageOf(game, DG) === 10) game.message('Perhaps the carved tablet nearby explains how to open it.');
  });
  I.onObject('Light', order, ({ player, target }) => {
    if (!has(game, 'tinderbox')) { game.message('You need a tinderbox to light this.'); return; }
    if (stageOf(game, DG) !== 10) { game.message('You have no reason to light this now.'); return; }
    const f = flags(game, DG);
    f.seq ||= [];
    game.playAnim(player, 'cook', 1200);
    game.actions.lock(player, 2);
    game.replaceObject(target, `${target.id}_lit`);
    const expect = order[f.seq.length];
    if (target.originalId !== expect) {
      f.seq = [];
      game.schedule(2, () => { resetBraziers(); game.message('<col=8a0000>A cold wind howls through the cavern and every flame dies. That was not the right order.</col>'); });
      return;
    }
    f.seq.push(target.originalId);
    game.message('The brazier flares into life.');
    if (f.seq.length === order.length) {
      f.seq = [];
      game.schedule(2, () => {
        const seal = game.findObjects((o) => o.id === 'rune_seal')[0];
        if (seal) game.replaceObject(seal, 'rune_seal_open', 200);
        game.message('<col=1a5a8a>With a grinding roar, the rune-sealed slab sinks into the floor!</col>');
        game.quests.setStage(DG, 20);
        if (!pip || !game.npcs.has(pip.uid)) pip = game.spawnNpc('miner_pip', GLOOM.pipAt[0], GLOOM.pipAt[1], { wander: 0, respawn: false });
        if (pip) game.say(pip, "Is someone there?! I'm free!", { chat: false });
        game.schedule(60, resetBraziers);
      });
    }
  });
  game.events.on('quest:change', ({ id, stage }) => {
    if (id === DG && stage >= 30 && pip && game.npcs.has(pip.uid)) { const p = pip; game.schedule(5, () => game.removeNpc(p)); pip = null; }
  });
  // if a save reloads mid-quest at stage 20, bring Pip back when the player enters the Depths
  game.events.on('area:enter', ({ area }) => {
    if (area?.id === 'gloomhollow' && stageOf(game, DG) === 20 && (!pip || !game.npcs.has(pip.uid))) pip = game.spawnNpc('miner_pip', GLOOM.pipAt[0], GLOOM.pipAt[1], { wander: 0, respawn: false });
  });
});

// =================================================================================================
// 5. The Ashen Pact (Experienced, Wilderness) - Ysolde Varne, Highmarch temple
// =================================================================================================
const AP = 'ashen_pact';
questNpc({ id: 'scholar_ysolde', name: 'Ysolde Varne', examine: 'A scholar of old scripts, ink up to the elbows.',
  model: { female: true, hairStyle: 'long', colors: { top: '#3a3a6a', legs: '#2a2a4a', hair: '#1a1a1a' }, equipment: { head: { shape: 'wizard_hat', color: '#3a3a6a' } } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('scholar_ysolde', 173, 61);
questItem({ id: 'blank_parchment', name: 'Blank parchment', examine: 'Good for taking rubbings.', icon: { shape: 'scroll', color: '#f0e8d0' } });
questItem({ id: 'obelisk_rubbing', name: 'Obelisk rubbing', examine: 'Three glyphs, smudged in charcoal.', options: ['Read'], icon: { shape: 'scroll', color: '#6a6a6a' } });
questItem({ id: 'glyph_primer', name: 'Glyph primer', examine: "Ysolde's notes on the Calder script.", options: ['Read'], icon: { shape: 'book', color: '#3a3a6a' } });
questItem({ id: 'pact_candle', name: 'Pact candle', examine: 'A black candle that burns cold.', icon: { shape: 'staff', color: '#2a2a2a', color2: '#80ff80' } });
questItem({ id: 'warden_ember', name: "Warden's ember", examine: 'It burns without heat, and whispers.', icon: { shape: 'gem', color: '#ff6020' } });
registerNpc({
  id: 'ember_warden', name: 'Ember Warden', examine: 'The spirit bound to guard the Calder pact. It is not pleased to be woken.', combatLevel: 64, options: ['Attack'],
  aggressive: true, aggroRange: 8, stats: { attack: 55, strength: 55, defence: 48, magic: 50, hitpoints: 70 }, maxHit: 9, attackStyle: 'crush', attackSpeed: 5, respawnTicks: 100, wanderRadius: 2,
  bonuses: { defenceStab: 30, defenceSlash: 30, defenceCrush: 20, defenceMagic: 10 },
  model: { template: 'demon', scale: 1.1, colors: { skin: '#5a2a1a', top: '#3a1a10', legs: '#2a1008' }, extras: { glowEyes: '#ffa030' } },
});

registerQuest({
  id: AP, name: 'The Ashen Pact', difficulty: 'Experienced', questPoints: 3, completeStage: 100,
  start: 'Speak to Ysolde Varne in the Highmarch temple.',
  description: 'A scholar wants to read the dark obelisk in the Calder Ruins - deep in the Wilderness.',
  rewards: ['3 Quest Points', '4,000 Magic XP', '2,000 Prayer XP', 'A Lamp of Insight (2,500 XP)'],
  onComplete: ({ game, player }) => { for (const id of ['warden_ember', 'obelisk_rubbing', 'glyph_primer', 'pact_candle', 'blank_parchment']) take(game, id, 5); xp(player, { magic: 4000, prayer: 2000 }); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Ysolde Varne')} in the ${red('Highmarch temple')}.`, '<col=c00000>This quest takes me into the Wilderness.</col>', 'Recommended: combat level 50, Magic 30.'];
    if (stage >= 100) return [strike('I took a rubbing of the dark obelisk, translated the Calder pact and put its Ember Warden to rest.'), '', COMPLETE];
    const out = [strike('Ysolde wants to study the dark obelisk in the Calder Ruins.')];
    if (stage === 10) out.push(has(game, 'obelisk_rubbing') ? `I have a rubbing. I should take it to ${red('Ysolde')}.` : `I should use the ${red('blank parchment')} on the ${red('dark obelisk')} in the Calder Ruins (Wilderness).`);
    if (stage === 20) out.push(strike('I brought Ysolde a rubbing.'), `I need to translate the three glyphs using her ${red('glyph primer')}, then tell her what they say.`);
    if (stage === 30) out.push(strike('The pact reads: "The warden watches, bound."'), has(game, 'warden_ember') ? `I defeated the Ember Warden. I should bring its ember to ${red('Ysolde')}.` : `I must light the ${red('pact candle')} at the obelisk (use it on the obelisk) and defeat what wakes.`);
    return out;
  },
});

registerDialogue('scholar_ysolde', ({ game }) => {
  const s = stageOf(game, AP);
  const WORDS = ['Bind', 'Release', 'Warden', 'Watch', 'Slay'];
  const answer = [];
  const q = (n) => ({ title: `Glyph ${n} means...`, options: WORDS.map((w) => ({ text: w, action: () => { answer[n - 1] = w; } })) });
  if (s >= 100) return [{ npc: "My monograph on the Calder pact is nearly finished. You'll get a footnote. A long one." }];
  if (s === 30) return [
    { if: () => has(game, 'warden_ember'), goto: 'ember' },
    { npc: 'Light the pact candle at the obelisk. Whatever wakes, put it to rest - and be careful.' },
    { if: () => has(game, 'pact_candle'), goto: 'end' },
    { npc: 'Lost the candle? I have another. Do try to keep this one.' },
    { action: () => { give(game, 'pact_candle'); } },
    { label: 'end', end: true },
    { label: 'ember', player: 'The Ember Warden is at rest. It left this behind.' },
    { npc: 'Its ember! Listen - can you hear it? It is thanking you. Three hundred years on watch...' },
    { action: () => { game.quests.complete(AP); } },
    { npc: 'You have done the vale a quiet kindness. Take this, with my gratitude.', end: true },
  ];
  if (s === 20) return [
    { npc: 'Have you worked out the glyphs? Read the rubbing, compare it with my primer, and tell me what each one means.' },
    { options: [{ text: "I'm ready to answer.", goto: 'ans' }, { text: 'Not yet.', end: true }] },
    { label: 'ans', ...q(1) }, q(2), q(3),
    { action: () => (answer.join() === 'Warden,Watch,Bind' ? 'right' : 'wrong') },
    { label: 'wrong', npc: 'No, that makes no sense at all. Look at the rubbing and my primer again.', end: true },
    { label: 'right', npc: '"The warden watches, bound." Yes! Something was bound to guard the ruins, and the pact is fraying.' },
    { npc: 'Take this pact candle. Light it at the obelisk - use it on the stone - and the warden will wake. Free it the only way we can.' },
    { action: () => { give(game, 'pact_candle'); game.quests.setStage(AP, 30); }, end: true },
  ];
  if (s === 10) return [
    { if: () => has(game, 'obelisk_rubbing'), goto: 'rub' },
    { npc: 'The obelisk stands in the middle of the Calder Ruins. Use the parchment on it. Watch your back out there.' },
    { if: () => has(game, 'blank_parchment'), goto: 'end' },
    { npc: 'Here, another sheet of parchment.' },
    { action: () => { give(game, 'blank_parchment'); } },
    { label: 'end', end: true },
    { label: 'rub', player: 'I have your rubbing.' },
    { npc: 'Wonderful! Three glyphs... I have a primer for the Calder script. You translate - fresh eyes and all that - and tell me what it says.' },
    { action: () => { if (!has(game, 'glyph_primer')) give(game, 'glyph_primer'); game.quests.setStage(AP, 20); } },
    { npc: 'Read the rubbing, then read the primer. Come back when you think you have it.', end: true },
  ];
  return [
    { npc: 'Ah, an adventurer! Just the sort of reckless person I need.' },
    { npc: 'In the Calder Ruins - out in the Wilderness, I am afraid - there stands a dark obelisk covered in glyphs nobody has read in three centuries.' },
    { options: [
      { text: 'I can get you a copy of the glyphs.', goto: 'yes' },
      { text: 'The Wilderness? No thank you.', end: true },
    ] },
    { label: 'yes', npc: 'Splendid! Take this parchment and use it on the obelisk to make a rubbing. And do not die; it ruins the parchment.' },
    { action: () => { game.quests.start(AP); game.quests.setStage(AP, 10); give(game, 'blank_parchment'); }, end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  let warden = null;
  const obeliskIds = ['obelisk', 'dark_obelisk', 'calder_obelisk'];
  I.onItemOnObject(['blank_parchment'], obeliskIds, ({ player }) => {
    if (stageOf(game, AP) !== 10) { game.message('Nothing interesting happens.'); return; }
    game.playAnim(player, 'craft', 1500);
    game.actions.lock(player, 3);
    game.schedule(2, () => { take(game, 'blank_parchment'); give(game, 'obelisk_rubbing'); game.message('You press the parchment against the stone and rub it with charcoal. The glyphs come up clearly.'); });
  });
  I.onItemOnObject(['pact_candle'], obeliskIds, ({ player, target }) => {
    if (stageOf(game, AP) !== 30) { game.message('Nothing interesting happens.'); return; }
    if (warden && game.npcs.has(warden.uid) && !warden.dead) { game.message('The warden is already awake!'); return; }
    if (has(game, 'warden_ember')) { game.message('The warden is already at rest.'); return; }
    game.playAnim(player, 'cast', 1500);
    game.message('You light the pact candle. Its cold flame bends towards the obelisk...');
    game.schedule(3, () => {
      warden = game.spawnNpc('ember_warden', target.x + 2, target.y + 2, { wander: 2, respawn: false });
      if (!warden) return;
      game.spawnEffect('teleport', warden, { color: 0xff6020 });
      game.say(warden, 'WHO BREAKS THE PACT?', { chat: false, color: '#ff8030' });
      if (game.combat?.retaliate) game.combat.retaliate(warden, player); else warden.combatTarget = player;
    });
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id !== 'ember_warden') return;
    if (stageOf(game, AP) === 30) game.schedule(3, () => game.spawnGroundItem('warden_ember', 1, npc.x, npc.y, { owner: game.player.name }));
  });
  I.onItem('Read', ['obelisk_rubbing'], () => game.ui.startDialogue([
    { message: 'The rubbing shows three glyphs:' },
    { message: '1: a flame inside a circle.<br>2: an eye with three lashes.<br>3: a coiled serpent.' },
  ]));
  I.onItem('Read', ['glyph_primer'], () => game.ui.startDialogue([
    { message: "Ysolde's notes on the Calder script:" },
    { message: 'Coiled serpent - BIND. Broken ring - RELEASE. Crossed spears - SLAY.' },
    { message: 'Flame in a circle - WARDEN (lit. "keeper of the fire"). Eye with three lashes - WATCH.' },
  ]));
});
