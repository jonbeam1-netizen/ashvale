// Quests 6-9. OWNER: agent F (imported by content/quests.js).
// Crown of the Mire (boss), A Thief in Highmarch (deduction, shop unlock), The Wayward Compass
// (unlocks the Saltmarsh & Calder teleports), The Drowned Bell (exploration + bell puzzle).

import { registerQuest, registerDialogue, registerItem, registerNpc, registerShop } from '../core/registry.js';
import { hook, stageOf, done, flags, has, take, give, strike, red, COMPLETE, questNpc, questItem, questObject, spawnNpc, spawnObj, clearAround, xp } from './quest_util.js';
import { rand } from '../core/rng.js';

// =================================================================================================
// 6. Crown of the Mire (Experienced, boss) - Sister Maud, Brackenford chapel
// =================================================================================================
const CM = 'crown_of_the_mire';
questNpc({ id: 'sister_maud', name: 'Sister Maud', examine: 'A chapel sister with a soldier\'s posture.',
  model: { female: true, hairStyle: 'short', colors: { top: '#e8e4d8', legs: '#e8e4d8', hair: '#8a8a8a' }, equipment: { neck: { shape: 'amulet', color: '#c8b040' } } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('sister_maud', 110, 129);
questItem({ id: 'blessed_salt', name: 'Blessed salt', examine: 'Salt blessed at the Brackenford altar.', stackable: true, icon: { shape: 'bag', color: '#f0f0f0' } });
questItem({ id: 'mire_crown', name: 'Mire crown', examine: 'A crown of black bog-oak, dripping and cold.', icon: { shape: 'helm', color: '#2a3a1a' } });
registerItem({ id: 'mirewarden_charm', name: 'Mirewarden charm', examine: 'A sliver of bog-oak bound in silver. The marsh no longer frightens you.', slot: 'neck', value: 1200, tradeable: false,
  bonuses: { defenceStab: 4, defenceSlash: 4, defenceCrush: 4, defenceMagic: 6, prayer: 4 }, icon: { shape: 'amulet', color: '#d8dce4', color2: '#3a4a2a' }, model: { color: '#d8dce4' } });
const SHRINES = [['mire_shrine_1', 82, 166], ['mire_shrine_2', 95, 175], ['mire_shrine_3', 108, 165]];
for (const [id, x, y] of SHRINES) {
  questObject({ id, name: 'Mire shrine', examine: 'An old shrine, choked with black moss.', options: ['Purify'], model: { template: 'q_shrine' } });
  questObject({ id: `${id}_pure`, name: 'Purified shrine', examine: 'The shrine gleams white again.', model: { template: 'q_shrine', pure: true } });
  clearAround(x, y, 1);
  spawnObj(id, x, y);
}
questObject({ id: 'sunken_throne', name: 'Sunken throne', examine: 'A throne of rotten bog-oak rising out of the mud.', options: ['Disturb'], size: [2, 2], model: { template: 'q_throne' } });
clearAround(95, 166, 3);
spawnObj('sunken_throne', 95, 165);
registerNpc({
  id: 'mire_king', name: 'The Mire King', examine: 'A drowned lord of the fen, crowned in bog-oak.', combatLevel: 86, options: ['Attack'], aggressive: true, aggroRange: 10, size: 2,
  stats: { attack: 68, strength: 70, defence: 60, magic: 40, hitpoints: 150 }, maxHit: 12, attackStyle: 'crush', attackSpeed: 5, respawnTicks: 200, wanderRadius: 3, boss: true,
  bonuses: { defenceStab: 40, defenceSlash: 50, defenceCrush: 30, defenceMagic: 10, defenceRanged: 40 },
  model: { template: 'zombie', scale: 1.6, colors: { skin: '#4a5a3a', top: '#2a3a1a', legs: '#1a2a10' }, extras: { glowEyes: '#a0ff60', crown: '#2a3a1a' } },
});
registerNpc({
  id: 'bog_wisp', name: 'Bog wisp', examine: 'A drifting marsh-light. It shields its master.', combatLevel: 22, options: ['Attack'], aggressive: true,
  stats: { attack: 15, strength: 12, defence: 15, magic: 20, hitpoints: 16 }, maxHit: 3, attackStyle: 'magic', respawnTicks: 999, wanderRadius: 2,
  model: { template: 'bat', scale: 0.9, colors: { body: '#80ff90', wing: '#a0ffb0', eyes: '#ffffff' } },
});

registerQuest({
  id: CM, name: 'Crown of the Mire', difficulty: 'Experienced', questPoints: 3, completeStage: 100,
  start: 'Speak to Sister Maud in the Brackenford chapel.',
  description: 'Something old and angry stirs beneath Murkfen Swamp.',
  rewards: ['3 Quest Points', '4,000 Prayer XP', '3,000 Hitpoints XP', '3,000 Defence XP', 'Mirewarden charm'],
  onComplete: ({ game, player }) => { take(game, 'mire_crown'); take(game, 'blessed_salt', 10); xp(player, { prayer: 4000, hitpoints: 3000, defence: 3000 }); give(game, 'mirewarden_charm'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Sister Maud')} in the ${red('Brackenford chapel')}.`, 'Recommended: combat level 60 and good food. This quest has a boss fight.'];
    if (stage >= 100) return [strike('I purified the mire shrines, defeated the Mire King and brought his crown to Sister Maud.'), '', COMPLETE];
    const out = [strike('Sister Maud says the Mire King is rising in Murkfen Swamp.')];
    const f = flags(game, CM);
    if (stage === 10) {
      out.push(`I must ${red('purify')} the three ${red('mire shrines')} in Murkfen with blessed salt.`);
      SHRINES.forEach(([id], i) => out.push(f[id] ? strike(`Shrine ${i + 1} purified.`) : `Shrine ${i + 1}: ${red('still corrupted')}`));
    }
    if (stage === 20) out.push(strike('I purified all three shrines.'), `Now I must ${red('disturb the sunken throne')} in the heart of the swamp and defeat the Mire King.`, 'When he weakens he will summon bog wisps to shield him - kill them first.');
    if (stage === 30) out.push(strike('I defeated the Mire King.'), `I should bring his ${red('crown')} to ${red('Sister Maud')}.`);
    return out;
  },
});

registerDialogue('sister_maud', ({ game }) => {
  const s = stageOf(game, CM);
  if (s >= 100) return [{ npc: 'The fen is quiet. I sleep better, and so, I think, does the Mire King.' }];
  if (s === 30) return [
    { if: () => has(game, 'mire_crown'), goto: 'crown' },
    { npc: 'You defeated him? Then where is his crown? It must be brought here and blessed, or he will rise again.', end: true },
    { label: 'crown', player: 'The Mire King is dead. Again. Here is his crown.' },
    { npc: 'I will set it on the altar and pray over it every day. Wear this charm - it is carved from the same bog-oak, but blessed. It will keep the marsh from your heart.' },
    { action: () => { game.quests.complete(CM); }, end: true },
  ];
  if (s >= 10) return [
    { npc: s === 10 ? 'Purify all three shrines in Murkfen with the blessed salt. Use the salt on them.' : 'The shrines are clean. Go to the sunken throne and finish this. Mind his wisps.' },
    { if: () => s === 10 && !has(game, 'blessed_salt'), goto: 'salt' },
    { end: true },
    { label: 'salt', npc: 'Out of salt? Here.' },
    { action: () => { give(game, 'blessed_salt', 3); }, end: true },
  ];
  return [
    { npc: 'Traveller. Do you feel it? The ground under Murkfen is restless. The old Mire King is stirring.' },
    { options: [
      { text: 'Who is the Mire King?', goto: 'who' },
      { text: 'How can I help?', goto: 'help' },
      { text: 'Sounds like a problem for someone else.', end: true },
    ] },
    { label: 'who', npc: 'A lord who drowned his own people to keep his throne when the fen flooded, long ago. Every few generations he rises. Sister Ellery put him down last time. She is in the graveyard now.' },
    { label: 'help', npc: 'Three shrines in the swamp hold him down. They have gone foul. Take this blessed salt and purify them, then disturb his throne and end him.' },
    { options: [
      { text: "I'll do it.", action: () => { game.quests.start(CM); game.quests.setStage(CM, 10); give(game, 'blessed_salt', 3); }, goto: 'go' },
      { text: 'Not today.', end: true },
    ] },
    { label: 'go', npc: 'May the light keep you. Bring me his crown when it is done.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  let king = null;
  const wisps = new Set();
  const purify = ({ player, target }) => {
    if (stageOf(game, CM) !== 10) { game.message('The shrine is choked with black moss.'); return; }
    if (!has(game, 'blessed_salt')) { game.message('You need blessed salt to purify the shrine.'); return; }
    take(game, 'blessed_salt');
    game.playAnim(player, 'pickup', 900);
    game.replaceObject(target, `${target.id}_pure`);
    game.spawnEffect('sparkle', target, { color: 0xa0e8ff });
    const f = flags(game, CM);
    f[target.originalId] = true;
    game.message('You scatter the blessed salt. The moss shrivels and the shrine gleams white.');
    if (SHRINES.every(([id]) => f[id])) { game.quests.setStage(CM, 20); game.message('<col=1a5a8a>The swamp groans. Something in its heart is awake.</col>'); }
    else game.events.emit('quest:change', { id: CM, stage: 10 });
  };
  I.onObject('Purify', SHRINES.map((s) => s[0]), purify);
  I.onItemOnObject(['blessed_salt'], SHRINES.map((s) => s[0]), purify);
  // purified state survives reloads
  game.events.on('game:ready', () => {
    const f = flags(game, CM);
    for (const o of game.findObjects((o) => f[o.id])) game.replaceObject(o, `${o.id}_pure`);
  });

  I.onObject('Disturb', ['sunken_throne'], ({ player, target }) => {
    const s = stageOf(game, CM);
    if (s !== 20) { game.message(s < 20 ? 'Something is down there... but the shrines still hold it.' : 'The throne lies still.'); return; }
    if (king && game.npcs.has(king.uid) && !king.dead) { game.message('The Mire King is already here!'); return; }
    game.playAnim(player, 'pickup', 900);
    game.message('You kick the rotten throne. The mud begins to bubble...');
    game.schedule(3, () => {
      king = game.spawnNpc('mire_king', target.x, target.y + 2, { wander: 3, respawn: false });
      if (!king) return;
      king.state.mireWisps = false;
      game.spawnEffect('splash', king, {});
      game.say(king, 'WHO DISTURBS MY THRONE?', { chat: false, color: '#a0ff60' });
      if (game.combat?.retaliate) game.combat.retaliate(king, player); else king.combatTarget = player;
    });
  });
  // boss mechanics: at half health the King calls two wisps; while they live he takes 75% less damage.
  game.events.on('damage:before', (e) => {
    if (e.target?.id !== 'mire_king' || e.target.dead) return;
    const alive = [...wisps].filter((w) => game.npcs.has(w.uid) && !w.dead);
    if (alive.length && e.amount > 0) { e.amount = Math.floor(e.amount * 0.25); if (Math.random() < 0.3) game.message('<col=8a0000>The bog wisps shield the Mire King!</col>'); }
  });
  game.events.on('damage', ({ target }) => {
    if (target?.id !== 'mire_king' || target.dead || target.state.mireWisps) return;
    if (target.hp <= target.maxHp / 2) {
      target.state.mireWisps = true;
      game.say(target, 'RISE, LIGHTS OF THE FEN!', { chat: false, color: '#a0ff60' });
      for (const [dx, dy] of [[-2, 0], [3, 1]]) {
        const w = game.spawnNpc('bog_wisp', target.x + dx, target.y + dy, { wander: 2, respawn: false });
        if (w) { wisps.add(w); if (game.combat?.retaliate) game.combat.retaliate(w, game.player); else w.combatTarget = game.player; }
      }
    }
  });
  // muck hurl every 9 ticks at range
  game.onTick((tick) => {
    if (!king || king.dead || !game.npcs.has(king.uid) || tick % 9) return;
    const p = game.player;
    if (p.dead || game.distance(p, king) > 6 || game.distance(p, king) < 2) return;
    game.spawnEffect('projectile', king, { to: p, color: 0x3a4a1a, ms: 600, size: 0.3, arc: 1.5 });
    game.schedule(1, () => { if (!p.dead) game.applyDamage(p, rand.int(2, 8), { source: king, type: 'typeless' }); });
  }, 45);
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id === 'bog_wisp') { wisps.delete(npc); return; }
    if (npc.id !== 'mire_king') return;
    for (const w of wisps) if (game.npcs.has(w.uid)) game.kill(w, null);
    wisps.clear();
    if (stageOf(game, CM) === 20) {
      game.quests.setStage(CM, 30);
      game.schedule(3, () => game.spawnGroundItem('mire_crown', 1, npc.x, npc.y, { owner: game.player.name }));
      game.message('<col=1a5a8a>The Mire King sinks back into the mud. His crown is left behind.</col>');
    }
  });
});

// =================================================================================================
// 7. A Thief in Highmarch (Intermediate, deduction) - Captain Rowan Ashdown, Highmarch Keep
// =================================================================================================
const TH = 'thief_in_highmarch';
questNpc({ id: 'captain_rowan', name: 'Captain Rowan Ashdown', examine: 'Captain of the Highmarch guard. Tired, sharp, short on patience.', options: ['Talk-to', 'Trade'],
  model: { colors: { top: '#3a4a6a', legs: '#2a2a3a', hair: '#5a3a1a' }, equipment: { body: 'iron_platebody', weapon: 'iron_scimitar', cape: { shape: 'cape', color: '#2a3a6a', color2: '#c8a040' } } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('captain_rowan', 161, 61);
questNpc({ id: 'steward_osric', name: 'Steward Osric', examine: 'The keep steward, in a fine green coat.', model: { colors: { top: '#2a6a3a', legs: '#2a2a2a', hair: '#8a8a7a' } } });
questNpc({ id: 'cook_bettany', name: 'Bettany', examine: 'The keep cook. Flour, gravy and opinions.', model: { female: true, hairStyle: 'long', colors: { top: '#e8e0d0', legs: '#6a4a3a', hair: '#a85a2a' } } });
questNpc({ id: 'stablehand_finn', name: 'Finn', examine: 'A stablehand. His boots are filthy.', model: { colors: { top: '#6a5a3a', legs: '#4a3a2a', hair: '#e0c070', boots: '#3a2a10' } } });
spawnNpc('steward_osric', 158, 58);
spawnNpc('cook_bettany', 172, 95);
spawnNpc('stablehand_finn', 178, 100);
questItem({ id: 'keep_seal_ring', name: 'Keep seal ring', examine: 'The signet ring of Highmarch Keep.', icon: { shape: 'ring', color: '#e8c040', color2: '#2a6a3a' } });
questObject({ id: 'clue_bootprints', name: 'Muddy boot prints', examine: 'Boot prints in the mud.', options: ['Inspect'], blocks: false, model: { template: 'q_clue', color: '#3a2a14' } });
questObject({ id: 'clue_wax', name: 'Window sill', examine: 'A sill below the treasury window.', options: ['Inspect'], blocks: false, model: { template: 'q_clue', color: '#2a6a3a' } });
questObject({ id: 'clue_thread', name: 'Window latch', examine: 'The latch of the treasury window.', options: ['Inspect'], model: { template: 'q_desk' } });
spawnObj('clue_bootprints', 177, 98);
spawnObj('clue_wax', 157, 62);
spawnObj('clue_thread', 158, 63);
registerShop({ id: 'highmarch_quartermaster', name: 'Highmarch Quartermaster', sellRate: 0.9, buyRate: 0.5,
  stock: [{ id: 'lockpick', qty: 10 }, { id: 'nimble_gloves', qty: 3 }, { id: 'trail_tonic', qty: 10 }, { id: 'slayer_gem', qty: 5 }, { id: 'iron_full_helm', qty: 5 }, { id: 'iron_scimitar', qty: 5 }] });
const CLUES = { clue_bootprints: 'boots', clue_wax: 'wax', clue_thread: 'thread' };
const SUSPECTS = { steward_osric: 'osric', cook_bettany: 'bettany', stablehand_finn: 'finn' };

registerQuest({
  id: TH, name: 'A Thief in Highmarch', difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Captain Rowan Ashdown in Highmarch Keep.',
  description: "The keep's seal ring has been stolen, and the captain needs a fresh pair of eyes.",
  rewards: ['2 Quest Points', '2,500 Thieving XP', '1,000 Agility XP', 'Access to the Highmarch Quartermaster'],
  onComplete: ({ game, player }) => { take(game, 'keep_seal_ring'); xp(player, { thieving: 2500, agility: 1000 }); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Captain Rowan Ashdown')} in ${red('Highmarch Keep')}.`];
    if (stage >= 100) return [strike('I unmasked the thief who stole the keep\'s seal ring.'), '', COMPLETE];
    const f = flags(game, TH);
    const out = [strike("Someone climbed in through the treasury window and stole the keep's seal ring.")];
    if (stage === 10) {
      out.push('Clues:');
      out.push(f.boots ? strike('Muddy boot prints lead from the stables - but stables are always muddy.') : `Check the ${red('ground near the stables')} in the south-east.`);
      out.push(f.wax ? strike('Drips of GREEN sealing wax on the treasury window sill.') : `Inspect the ${red('window sill')} inside the keep.`);
      out.push(f.thread ? strike('A scrap of green velvet caught on the window latch.') : `Inspect the ${red('window latch')} inside the keep.`);
      out.push('Suspects:');
      out.push(f.osric ? strike('Steward Osric says he was in the counting room all evening.') : `Talk to ${red('Steward Osric')} in the keep.`);
      out.push(f.bettany ? strike('Bettany brought supper to the counting room - nobody was there.') : `Talk to ${red('Bettany')}, the cook (south-east houses).`);
      out.push(f.finn ? strike('Finn was mucking out the stables all night.') : `Talk to ${red('Finn')}, the stablehand.`);
      out.push(`When I'm sure, I should tell ${red('Captain Rowan')} who did it.`);
    }
    if (stage === 40) out.push(strike('I named Steward Osric as the thief.'), `I should get the ring back from ${red('Osric')}.`);
    if (stage === 50) out.push(strike('Osric handed over the ring.'), `I should return it to ${red('Captain Rowan')}.`);
    return out;
  },
});

registerDialogue('captain_rowan', ({ game }) => {
  const s = stageOf(game, TH);
  const f = flags(game, TH);
  if (s >= 100) return [{ npc: 'The quartermaster has orders to treat you like one of ours. Need anything?' }, { options: [{ text: 'Show me the stores.', action: () => { game.ui.openShop('highmarch_quartermaster'); return false; } }, { text: 'Goodbye.', end: true }] }];
  if (s === 50) return [
    { player: 'Here is your seal ring, Captain.' },
    { npc: 'My ring! And Osric in the cells, the snake. He was going to forge orders to empty the granary - Haverly would have starved by spring.' },
    { action: () => { game.quests.complete(TH); } },
    { npc: "You've a keen eye. I'll tell the quartermaster to sell to you at guard prices.", end: true },
  ];
  if (s === 40) return [{ npc: 'Osric is in his rooms, under guard. Get my ring back from him.' }];
  if (s === 10) return [
    { npc: 'Well? Who did it?' },
    { if: () => Object.keys(f).filter((k) => ['boots', 'wax', 'thread'].includes(k)).length < 2 || !(f.osric && f.bettany && f.finn), goto: 'notyet' },
    { title: 'Who stole the seal ring?', options: [
      { text: 'Steward Osric.', goto: 'right' },
      { text: 'Bettany the cook.', goto: 'wrong' },
      { text: 'Finn the stablehand.', goto: 'wrong' },
      { text: "I'm not sure yet.", end: true },
    ] },
    { label: 'notyet', npc: "Don't come to me with guesses. Look at the treasury window, the stable yard, and talk to everyone who was about last night.", end: true },
    { label: 'wrong', npc: "That doesn't fit what you've found. Think it through again.", end: true },
    { label: 'right', player: 'Osric. The wax on the sill is green - treasury sealing wax, which only the steward uses. The cloth on the latch is green velvet, like his coat. And he lied about being in the counting room.' },
    { npc: 'Osric. Of course. I should have seen it myself. Guards! Bring the steward to his rooms and keep him there.' },
    { action: () => { game.quests.setStage(TH, 40); } },
    { npc: 'Go and get my ring back from him.', end: true },
  ];
  return [
    { npc: "Not now, I'm... wait. You're not from Highmarch, are you? Good. Everyone here is a suspect." },
    { npc: "Last night someone climbed through the treasury window and took the keep's seal ring. With it they could forge any order in the town's name." },
    { options: [
      { text: "I'll find your thief.", action: () => { game.quests.start(TH); game.quests.setStage(TH, 10); }, goto: 'ok' },
      { text: 'Not my business.', end: true },
    ] },
    { label: 'ok', npc: 'Start with the treasury window - just through there. Then talk to anyone who was around: the steward, the cook, the stable lad.', end: true },
  ];
});
const suspectTalk = (id, lines, after) => registerDialogue(id, ({ game }) => {
  const s = stageOf(game, TH);
  if (s !== 10 && !(id === 'steward_osric' && s === 40)) return [{ npc: lines.idle }];
  if (id === 'steward_osric' && s === 40) return [
    { npc: "You! This is your doing. I suppose you want the ring." },
    { player: 'That would be best for everyone.' },
    { npc: "Fine. Take it. I'd have been rich, you know. Rich, and out of this draughty pile." },
    { action: () => { give(game, 'keep_seal_ring'); game.quests.setStage(TH, 50); }, end: true },
  ];
  return [...lines.talk, { action: () => { flags(game, TH)[SUSPECTS[id]] = true; game.events.emit('quest:change', { id: TH, stage: 10 }); }, end: true }];
});
suspectTalk('steward_osric', {
  idle: 'The steward is busy. Very busy. Good day.',
  talk: [{ player: 'Where were you last night?' }, { npc: 'In the counting room, all evening, doing the accounts. Alone. As always.' }, { player: 'Nice coat.' }, { npc: 'Velvet. Green is the colour of the steward\'s office. Is that all?' }],
});
suspectTalk('cook_bettany', {
  idle: "Out of my kitchen unless you're peeling.",
  talk: [{ player: 'Did you see anything strange last night?' }, { npc: 'I took the steward his supper in the counting room like always. Empty! Candle cold. Ate it myself, I did.' }, { npc: 'And that Finn was clattering about the stables till all hours.' }],
});
suspectTalk('stablehand_finn', {
  idle: 'Mind the horse. She bites.',
  talk: [{ player: 'Where were you last night?' }, { npc: 'Here. Mucking out. Look at my boots! A mare was foaling - ask anyone, I was up to my knees all night.' }],
});

hook((game) => {
  const I = game.interactions;
  const text = {
    clue_bootprints: 'Muddy boot prints lead from the stables... towards the stable door, not the keep. Just Finn going about his work.',
    clue_wax: 'There are fresh drips of GREEN sealing wax on the sill. Only official documents are sealed in green.',
    clue_thread: 'A scrap of fine green velvet is caught on the window latch.',
  };
  I.onObject('Inspect', Object.keys(CLUES), ({ target }) => {
    game.message(text[target.id]);
    if (stageOf(game, TH) === 10) { flags(game, TH)[CLUES[target.id]] = true; game.events.emit('quest:change', { id: TH, stage: 10 }); }
  });
  I.onNpc('Trade', ['captain_rowan'], () => {
    if (!done(game, TH)) { game.ui.startDialogue([{ npc: "The stores are for the guard. Earn my trust first.", name: 'Captain Rowan Ashdown' }]); return; }
    game.ui.openShop('highmarch_quartermaster');
  });
});

// =================================================================================================
// 8. The Wayward Compass (Intermediate, magic) - Magister Quill Harrow, Highmarch
// =================================================================================================
const WC = 'wayward_compass';
questNpc({ id: 'magister_quill', name: 'Magister Quill Harrow', examine: 'A wizard with ink on his nose and a hole in his hat.',
  model: { colors: { top: '#4a2a6a', legs: '#3a1a5a', hair: '#d8d8d8' }, extras: { beard: true }, equipment: { head: { shape: 'wizard_hat', color: '#4a2a6a' }, weapon: { shape: 'staff', color: '#6a4a2a' } } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('magister_quill', 152, 92);
questItem({ id: 'wayfinder_compass', name: 'Wayfinder compass', examine: "Its needle points to wherever you're thinking of.", icon: { shape: 'ring', color: '#c8a040', color2: '#60e0e0' } });
const WAYSTONES = [['waystone_brackenford', 88, 138, 'Brackenford'], ['waystone_thornwood', 64, 135, 'Thornwood'], ['waystone_saltmarsh', 125, 177, 'Saltmarsh']];
for (const [id, x, y, place] of WAYSTONES) {
  questObject({ id, name: 'Waystone', examine: `An old standing stone near ${place}. A shallow dish is carved into its face.`, options: ['Attune'], model: { template: 'q_waystone' } });
  clearAround(x, y, 1);
  spawnObj(id, x, y);
}

registerQuest({
  id: WC, name: 'The Wayward Compass', difficulty: 'Intermediate', questPoints: 1, completeStage: 100,
  start: 'Speak to Magister Quill Harrow in Highmarch.',
  description: "A wizard's teleportation compass has been stolen by imps.",
  rewards: ['1 Quest Point', '3,000 Magic XP', '60 Nexus sigils', 'Saltmarsh Teleport & Calder Ruins Teleport spells'],
  onComplete: ({ game, player }) => { take(game, 'wayfinder_compass'); xp(player, { magic: 3000 }); give(game, 'nexus_sigil', 60); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Magister Quill Harrow')} in ${red('Highmarch')}.`];
    if (stage >= 100) return [strike("I recovered Quill's compass and attuned the old waystones."), 'I can now cast the Saltmarsh and Calder Ruins teleports.', '', COMPLETE];
    const out = [strike('Quill\'s wayfinder compass was stolen by imps.')];
    if (stage === 10) out.push(has(game, 'wayfinder_compass') ? `I found the compass! I should take it to ${red('Quill')}.` : `I need to hunt ${red('imps')} until one drops the compass.`);
    if (stage === 20) {
      const f = flags(game, WC);
      out.push(strike('I returned the compass to Quill.'), 'He asked me to attune it at three waystones:');
      for (const [id, , , place] of WAYSTONES) out.push(f[id] ? strike(`${place} waystone`) : `${red(place)} waystone`);
    }
    if (stage === 30) out.push(strike('I attuned all three waystones.'), `I should return to ${red('Quill')}.`);
    return out;
  },
});

registerDialogue('magister_quill', ({ game }) => {
  const s = stageOf(game, WC);
  if (s >= 100) return [{ npc: 'The compass hums happily on my desk. Do practise those new teleports - and do not appear inside any walls.' }];
  if (s === 30) return [
    { player: 'All three waystones are attuned.' },
    { npc: 'Marvellous! With those anchors I can teach you two old routes: the Saltmarsh Teleport and the Calder Ruins Teleport. The second drops you in the Wilderness, so do be careful.' },
    { action: () => { game.quests.complete(WC); }, end: true },
  ];
  if (s === 20) return [
    { npc: 'Attune the compass at the waystones near Brackenford, Thornwood and the Saltmarsh Coast. Just hold it to the stone.' },
    { if: () => !has(game, 'wayfinder_compass'), goto: 'lost' },
    { end: true },
    { label: 'lost', npc: 'You... lost it? It came back to me on its own, thankfully. Here.' },
    { action: () => { give(game, 'wayfinder_compass'); }, end: true },
  ];
  if (s === 10) return [
    { if: () => has(game, 'wayfinder_compass'), goto: 'got' },
    { npc: 'Imps are pests: they love shiny things. Find the imps and you will find my compass eventually.', end: true },
    { label: 'got', player: 'One of the imps had your compass.' },
    { npc: 'My compass! But it has gone all wobbly - the imps have scrambled its sense of place. It needs attuning at the three old waystones.' },
    { npc: 'Near Brackenford, Thornwood and the Saltmarsh Coast. Take it there and use it on each stone.' },
    { action: () => { game.quests.setStage(WC, 20); }, end: true },
  ];
  return [
    { npc: "Have you seen it? Round, brass, about so big, needle points wherever you think? No? Blast." },
    { options: [
      { text: 'Lost something?', goto: 'lost' },
      { text: "I haven't seen anything. Goodbye.", end: true },
    ] },
    { label: 'lost', npc: 'My wayfinder compass! An imp snatched it right off my windowsill. Without it I cannot anchor my teleport research.' },
    { options: [
      { text: "I'll get it back from the imps.", action: () => { game.quests.start(WC); game.quests.setStage(WC, 10); }, goto: 'ok' },
      { text: 'Imps? No thanks.', end: true },
    ] },
    { label: 'ok', npc: 'Splendid! They usually plague the south-west of Brackenford.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id !== 'imp' || stageOf(game, WC) !== 10 || has(game, 'wayfinder_compass')) return;
    if (Math.random() < 0.35) game.schedule(3, () => game.spawnGroundItem('wayfinder_compass', 1, npc.x, npc.y, { owner: game.player.name }));
  });
  const attune = ({ player, target }) => {
    if (stageOf(game, WC) !== 20) { game.message('The stone is silent.'); return; }
    if (!has(game, 'wayfinder_compass')) { game.message('You need the wayfinder compass to attune the stone.'); return; }
    const f = flags(game, WC);
    if (f[target.id]) { game.message('The compass is already attuned to this stone.'); return; }
    f[target.id] = true;
    game.playAnim(player, 'cast', 1300);
    game.spawnEffect('sparkle', target, { color: 0x60e0e0 });
    game.message('You hold the compass to the stone. The needle spins, then settles firmly.');
    if (WAYSTONES.every(([id]) => f[id])) game.quests.setStage(WC, 30);
    else game.events.emit('quest:change', { id: WC, stage: 20 });
  };
  I.onObject('Attune', WAYSTONES.map((w) => w[0]), attune);
  I.onItemOnObject(['wayfinder_compass'], WAYSTONES.map((w) => w[0]), attune);
});

// =================================================================================================
// 9. The Drowned Bell (Intermediate, exploration + puzzle) - Gideon Wrack, Saltmarsh Coast
// =================================================================================================
const DB = 'drowned_bell';
questNpc({ id: 'fisher_gideon', name: 'Gideon Wrack', examine: 'An old fisherman with a far-off look.',
  model: { colors: { top: '#3a4a5a', legs: '#2a3a4a', hair: '#e0e0e0' }, extras: { beard: true }, equipment: { head: { shape: 'hood', color: '#c8a040' } } }, mapIcon: { char: '?', color: '#60c0ff' } });
spawnNpc('fisher_gideon', 163, 178);
questItem({ id: 'bell_clapper', name: 'Bell clapper', examine: 'A heavy bronze clapper, crusted with barnacles.', icon: { shape: 'mace', color: '#8a6a3a' } });
questItem({ id: 'keepers_logbook', name: "Keeper's logbook", examine: 'Water-stained, but legible.', options: ['Read'], icon: { shape: 'book', color: '#3a5a6a' } });
registerItem({ id: 'sea_glass_charm', name: 'Sea-glass charm', examine: 'Smooth green glass on a cord. You can hear the sea in it.', slot: 'neck', value: 800, tradeable: false,
  bonuses: { defenceMagic: 4, defenceRanged: 4, prayer: 2 }, icon: { shape: 'amulet', color: '#d8dce4', color2: '#40c8a0' }, model: { color: '#40c8a0' } });
const POOLS = [['tide_pool_1', 128, 183], ['tide_pool_2', 143, 184], ['tide_pool_3', 154, 184]];
for (const [id, x, y] of POOLS) {
  questObject({ id, name: 'Tide pool', examine: 'Anemones, crabs, and something glinting?', options: ['Search'], blocks: false, model: { template: 'q_tidepool' } });
  clearAround(x, y, 1);
  spawnObj(id, x, y);
}
questObject({ id: 'drowned_belfry', name: 'Drowned belfry', examine: 'All that remains of the old lighthouse: an arch with a bell, missing its clapper.', options: ['Ring'], model: { template: 'q_belfry' } });
clearAround(155, 183, 1);
spawnObj('drowned_belfry', 155, 183);
questNpc({ id: 'drowned_keeper', name: 'Drowned keeper', examine: 'A pale, dripping figure in an old keeper\'s coat.', wanderRadius: 0,
  model: { colors: { skin: '#a8c8c8', top: '#3a5a6a', legs: '#2a4a5a', hair: '#d8e8e8' }, extras: { glowEyes: '#a0ffff' } } });

registerQuest({
  id: DB, name: 'The Drowned Bell', difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Gideon Wrack on the Saltmarsh Coast.',
  description: 'An old fisherman hears a bell under the waves at night.',
  rewards: ['2 Quest Points', '2,500 Fishing XP', '1,500 Agility XP', 'Sea-glass charm', 'A Lamp of Insight (2,500 XP)'],
  onComplete: ({ game, player }) => { take(game, 'keepers_logbook'); xp(player, { fishing: 2500, agility: 1500 }); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Gideon Wrack')} on the ${red('Saltmarsh Coast')}.`];
    if (stage >= 100) return [strike('I rang the drowned bell the way the old keepers did, and laid the last keeper to rest.'), '', COMPLETE];
    const f = flags(game, DB);
    const out = [strike('Gideon hears a drowned bell ringing at night.')];
    if (stage === 10) {
      out.push(`I should search the ${red('tide pools')} along the beach west of Gullhaven. (${POOLS.filter(([id]) => f[id]).length}/3 searched)`);
      if (has(game, 'bell_clapper')) out.push(`I found a bell clapper. I should show it to ${red('Gideon')}.`);
    }
    if (stage === 20) out.push(strike('I found the bell\'s clapper.'), `I must ${red('ring')} the bell in the ${red('drowned belfry')} the way the keepers did.`, has(game, 'keepers_logbook') ? 'The keeper\'s logbook might say how.' : 'Perhaps something in the tide pools records how they rang it.');
    if (stage === 30) out.push(strike('The drowned keeper is at rest.'), `I should tell ${red('Gideon')}.`);
    return out;
  },
});

registerDialogue('fisher_gideon', ({ game }) => {
  const s = stageOf(game, DB);
  if (s >= 100) return [{ npc: 'Not a single bell since. Just gulls. I never thought I would be glad of gulls.' }];
  if (s === 30) return [
    { player: 'The bell rang, and the old keeper came out of the sea. He thanked me, and he is gone now.' },
    { npc: 'Old Haskel... my grandfather knew him. He went down with the lighthouse in the great storm. Thank you, friend. Truly.' },
    { action: () => { game.quests.complete(DB); }, end: true },
  ];
  if (s === 20) return [{ npc: 'Ring the bell in the old belfry, west along the beach. My grandfather said the keepers had a particular way of doing it.' }];
  if (s === 10) return [
    { if: () => has(game, 'bell_clapper'), goto: 'clap' },
    { npc: 'Try the tide pools along the beach to the west. The sea gives things back, now and then.', end: true },
    { label: 'clap', player: 'I found this in a tide pool.' },
    { npc: "A bell clapper... that's from the old lighthouse bell! The belfry still stands at the water's edge, west along the beach. Hang this in it and ring it." },
    { action: () => { game.quests.setStage(DB, 20); }, end: true },
  ];
  return [
    { npc: 'You hear it too? No? Every night, out past the breakers. A bell, ringing under the water.' },
    { options: [
      { text: 'A bell under the sea?', goto: 'bell' },
      { text: 'Too much sun, old man. Goodbye.', end: true },
    ] },
    { label: 'bell', npc: 'There was a lighthouse here once. Went down in the great storm with its keeper. I think something down there wants to be heard.' },
    { options: [
      { text: "I'll look into it.", action: () => { game.quests.start(DB); game.quests.setStage(DB, 10); }, goto: 'ok' },
      { text: 'Leave me out of it.', end: true },
    ] },
    { label: 'ok', npc: 'Search the tide pools along the beach to the west. The sea gives things back, now and then.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  const finds = { tide_pool_1: 'seaweed', tide_pool_2: 'keepers_logbook', tide_pool_3: 'bell_clapper' };
  I.onObject('Search', POOLS.map((p) => p[0]), ({ player, target }) => {
    game.playAnim(player, 'pickup', 900);
    const s = stageOf(game, DB);
    if (s < 10 || s >= 30) { game.message('You find a crab. It finds your finger.'); return; }
    const f = flags(game, DB);
    const it = finds[target.id];
    if (f[target.id] && (it === 'seaweed' || has(game, it))) { game.message('There is nothing else in this pool.'); return; }
    f[target.id] = true;
    if (it === 'seaweed') game.message('You find nothing but seaweed and a very cross crab.');
    else { give(game, it); game.message(it === 'bell_clapper' ? 'Wedged under a rock you find a heavy bronze bell clapper!' : 'Tucked in a crevice is an old oilskin pouch with a logbook inside.'); }
    game.events.emit('quest:change', { id: DB, stage: s });
  });
  I.onItem('Read', ['keepers_logbook'], () => game.ui.startDialogue([
    { message: '"...the bell to be rung at each change of watch, LONG, LONG, SHORT, LONG, as is the keepers\' custom..."' },
    { message: '"...the sea takes, and the bell calls it home. God keep this light. - H. Haskel, Keeper."' },
  ]));
  let keeper = null;
  I.onObject('Ring', ['drowned_belfry'], ({ player, target }) => {
    const s = stageOf(game, DB);
    if (s !== 20) { game.message(s < 20 ? 'The bell has no clapper.' : 'The bell hangs silent.'); return; }
    if (!has(game, 'bell_clapper')) { game.message('The bell has no clapper. You need to find one.'); return; }
    const seq = [];
    const pull = (n) => ({ title: `Pull ${n} of 4`, options: [{ text: 'A long, slow pull.', action: () => { seq.push('L'); } }, { text: 'A short, sharp pull.', action: () => { seq.push('S'); } }] });
    game.ui.startDialogue([
      { message: 'You hang the clapper in the bell. The rope is old but holds.' },
      pull(1), pull(2), pull(3), pull(4),
      { action: () => { game.playAnim(player, 'climb', 1500); return seq.join('') === 'LLSL' ? 'ok' : 'bad'; } },
      { label: 'bad', message: 'BONG... bong... The notes fade over the water. Nothing happens.', end: true },
      { label: 'ok', message: 'BONG... BONG... bong... BONG. Far out under the waves, another bell answers.' },
      { action: () => {
        take(game, 'bell_clapper');
        keeper = game.spawnNpc('drowned_keeper', target.x - 1, target.y - 2, { wander: 0, respawn: false });
        if (keeper) {
          game.spawnEffect('splash', keeper, {});
          game.say(keeper, 'At last... the watch is ended.', { chat: false, color: '#a0ffff' });
          game.schedule(12, () => { if (keeper && game.npcs.has(keeper.uid)) { game.spawnEffect('teleport', keeper, { color: 0xa0ffff }); game.removeNpc(keeper); } });
        }
        give(game, 'sea_glass_charm');
        game.quests.setStage(DB, 30);
      } },
      { message: 'A drowned keeper rises from the surf, presses a charm of sea-glass into your hand, and smiles.', end: true },
    ], { player });
  });
});
registerDialogue('drowned_keeper', [{ npc: 'The light is out, and the watch is ended. Go well, friend of the bell.' }]);
