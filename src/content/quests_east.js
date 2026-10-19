// Eastern quests, part 1. OWNER: content designer (east). Imported by content/quests.js.
//   10. The Forge-Heart of Durnhold (Intermediate, smithing + heat puzzle) - Forgemaster Brunna, Durnhold Forge Hall
//   11. The Moonwell's Lament (Intermediate, herblore + moon-phase puzzle + magic-only fight) - Moonwarden Sylvaine, Ilvaren
//   12. Stars over Bramblemoor (Intermediate, astronomy puzzle) - Starcaller Orrin Vale, Starcaller's Spire
//   13. The Keeper's Light (Novice, lighthouse + signal puzzle) - Old Agnes, Beacon Isle
// Continued in quests_east2.js (Sun-Eyed Warden, The Brinecoil, Trial by Bog, The Ember Under the Mountain).
// Same format as quests_core.js: stage in player.quests[id], runtime logic in hook(fn) (systems/quests.js init).

import { registerQuest, registerDialogue, registerItem, registerSpell, getSpell, getData } from '../core/registry.js';
import { registerSceneryTemplate } from '../render/models.js';
import {
  hook, stageOf, done, flags, has, take, give, strike, red, COMPLETE, questNpc, questItem, questObject, spawnNpc, spawnObj, xp, lampDialogue,
} from './quest_util.js';

// =================================================================================================
// Shared: Greater Lamp of Insight (10,000 xp), quest-unlocked teleports, scenery templates, NPC looks
// =================================================================================================
registerItem({ id: 'greater_insight_lamp', name: 'Greater Lamp of Insight', examine: 'It burns with a steady golden light. Rub it and choose what to master.', value: 0, tradeable: false, lamp: 10000, options: ['Rub'],
  icon: { shape: 'pot', color: '#ffb020', color2: '#ffffff' } });
hook((game) => {
  game.interactions.onItem('Rub', ['greater_insight_lamp'], ({ slot, def }) => lampDialogue(game, slot, def.lamp));
});

export const DWARF = (colors, extra = {}) => ({ scale: 0.78, colors: { skin: '#d8a07a', ...colors }, extras: { beard: true, nose: 0.05 }, proportions: { legLen: 0.4, torsoW: 0.62 }, ...extra });
export const ELF = (colors, extra = {}) => ({ scale: 1.05, colors: { skin: '#f0dcc8', ...colors }, extras: { ears: true }, ...extra });
export const QICON = { char: '?', color: '#60c0ff' };
/** Make a quest boss fight the local player now. */
export function aggro(game, npc, player = game.player) {
  if (!npc) return;
  if (game.combat?.retaliate) game.combat.retaliate(npc, player); else npc.combatTarget = player;
}
/** Remove a per-player quest NPC if it is still around. */
export function despawn(game, npc) { if (npc && game.npcs.has(npc.uid)) game.removeNpc(npc); }
export const alive = (game, npc) => !!npc && game.npcs.has(npc.uid) && !npc.dead;
/** Lines for the epic quest (quests_east2.js) that take precedence in shared NPC dialogues. */
const epicTalk = (game, npcId) => getData('east_epic_talk', 'get')?.(game, npcId) || null;

function canTeleport(game, player) {
  if (game.wilderness?.canTeleport) {
    const r = game.wilderness.canTeleport(player);
    if (r === false || r?.ok === false) { game.message(r?.reason || 'A mysterious force prevents you from teleporting.'); return false; }
    return true;
  }
  if (game.world.getWildernessLevel(player.x, player.y) > 20) { game.message('A mysterious force prevents you from teleporting.'); return false; }
  return true;
}
/** Quest-unlocked teleport spells (registered at system init so they sit after the core teleports in the spellbook). */
export function questTeleport(def) {
  hook(() => {
    if (getSpell(def.id)) return;
    registerSpell({
      book: 'standard', type: 'teleport', targets: [], icon: { shape: 'star', color: def.color, color2: '#ffffff' },
      description: `Teleports you to ${def.dest.name}. (Requires ${def.questName}.)`, ...def,
      onCast(game, player) {
        if ((player.teleportUntil || 0) > game.tickCount) return false;
        if (!game.quests.isComplete(def.questReq)) { game.message(`You need to complete ${def.questName} to cast this spell.`); return false; }
        if (!canTeleport(game, player)) return false;
        const color = parseInt(def.color.slice(1), 16);
        game.ui.closeInterfaces();
        game.actions.stop(player, 'teleport');
        player.interaction = null; player.combatTarget = null; player.path = [];
        player.teleportUntil = game.tickCount + 5;
        game.actions.lock(player, 4);
        game.spawnEffect('teleport', player, { color });
        game.schedule(3, () => { if (player.dead) return; game.teleport(player, def.dest.x, def.dest.y); game.spawnEffect('teleport', player, { color }); });
        return true;
      },
    });
  });
}

registerSceneryTemplate('q_orrery', (b, p) => {
  b.cyl('#4a3a2a', 0.35, 0.45, 0.25, 8, [0, 0.12, 0]);
  b.cyl('#6a5a3a', 0.06, 0.08, 1.0, 6, [0, 0.7, 0]);
  b.cyl('#c8a040', 0.12, 0.16, 1.4, 8, [0, 1.35, 0.1], [0.9, 0, 0]);
  b.cyl(p.fixed ? '#a0e0ff' : '#3a3a3a', 0.14, 0.14, 0.05, 8, [0, 1.75, 0.65], [0.9, 0, 0], 0.1);
  for (let i = 0; i < 3; i++) b.sphere(['#c8a040', '#a0c0ff', '#e86a3a'][i], 0.07, [Math.cos(i * 2.1) * 0.45, 1.0, Math.sin(i * 2.1) * 0.45]);
});
registerSceneryTemplate('q_cairn', (b) => {
  for (let i = 0; i < 6; i++) b.dodeca(i % 2 ? '#8a857a' : '#6e6a64', 0.32 - i * 0.03, [Math.cos(i * 1.3) * 0.15, 0.2 + i * 0.22, Math.sin(i * 1.3) * 0.15], [1.2, 0.7, 1]);
  b.dodeca('#a0c0ff', 0.06, [0.18, 0.15, 0.25]);
});
registerSceneryTemplate('q_bloom', (b, p) => {
  for (let i = 0; i < 5; i++) {
    const a = i * 1.25, r = 0.25;
    b.cyl('#3a7a4a', 0.02, 0.03, 0.45, 4, [Math.cos(a) * r, 0.22, Math.sin(a) * r]);
    b.sphere(p.color || '#c8e8ff', 0.09, [Math.cos(a) * r, 0.48, Math.sin(a) * r], [1, 0.6, 1]);
  }
});
registerSceneryTemplate('q_seam', (b) => {
  b.dodeca('#5e5a54', 0.6, [0, 0.45, 0], [1.1, 0.8, 1]);
  for (let i = 0; i < 4; i++) b.box('#ff9040', 0.08, 0.5, 0.05, [Math.cos(i * 1.6) * 0.35, 0.5, Math.sin(i * 1.6) * 0.35], [0.3, i, 0.2], 0);
});

// =================================================================================================
// 10. The Forge-Heart of Durnhold (Intermediate) - Forgemaster Brunna, Forge Hall (206,86)
// =================================================================================================
const FH = 'forge_heart';
questNpc({ id: 'forgemaster_brunna', name: 'Forgemaster Brunna', examine: 'Forgemaster of Durnhold. Her braids are tied back with iron wire.', options: ['Talk-to', 'Trade'], mapIcon: QICON,
  model: DWARF({ top: '#6a2a1a', legs: '#2a2a2a', hair: '#c84a1a' }, { female: true, hairStyle: 'long', extras: { nose: 0.04 }, equipment: { weapon: 'steel_warhammer', body: { shape: 'chainbody', color: '#3a2a20' } } }) });
spawnNpc('forgemaster_brunna', 206, 86, 1);
questNpc({ id: 'mason_dunmore', name: 'Mason Dunmore', examine: 'Guildmaster of the Durnhold masons. He tests everyone, especially himself.',
  model: DWARF({ top: '#6a6a62', legs: '#3a3a3a', hair: '#e0e0d8' }, { equipment: { weapon: { shape: 'hammer', color: '#8a8a8a' } } }) });
spawnNpc('mason_dunmore', 203, 62, 1);
questItem({ id: 'raw_heartstone', name: 'Raw heartstone', examine: 'A lump of warm, faintly humming ore from the singing seam.', icon: { shape: 'ore', color: '#ff9040' } });
questItem({ id: 'mason_flux', name: "Mason's flux", examine: 'A pouch of fine grey flux. Masons swear by it; smiths swear at it.', icon: { shape: 'bag', color: '#8a8a8a' } });
questItem({ id: 'heartstone', name: 'Heartstone', examine: 'A cut and fluxed heartstone, ready to set into a great hearth.', icon: { shape: 'gem', color: '#ff7020', color2: '#ffd080' } });
registerItem({ id: 'forgemasters_gloves', name: "Forgemaster's gloves", examine: 'Thick hide gloves scorched black at the fingertips. A gift from Durnhold.', slot: 'hands', value: 900, tradeable: false,
  requirements: { defence: 20 }, bonuses: { attackCrush: 4, defenceStab: 4, defenceSlash: 4, defenceCrush: 5, strength: 3 }, icon: { shape: 'gloves', color: '#3a2418' }, model: { color: '#3a2418' } });
questObject({ id: 'singing_seam', name: 'Singing seam', examine: 'A seam of glowing ore. It hums, very softly, like breath through a bellows.', options: ['Mine'], model: { template: 'q_seam' }, minimap: 'rock' });
spawnObj('singing_seam', 223, 74);

registerQuest({
  id: FH, name: 'The Forge-Heart of Durnhold', difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Forgemaster Brunna in the Forge Hall of Durnhold.',
  description: 'The great hearth of Durnhold has gone cold, and the hold cannot forge without it.',
  rewards: ['2 Quest Points', '4,000 Smithing XP', '1,500 Mining XP', '1,000 Crafting XP', "Forgemaster's gloves", "Access to Brunna's Masterworks"],
  onComplete: ({ game, player }) => { take(game, 'heartstone'); xp(player, { smithing: 4000, mining: 1500, crafting: 1000 }); give(game, 'forgemasters_gloves'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Forgemaster Brunna')} in the ${red('Forge Hall of Durnhold')}.`, 'Requirements: Mining 30, Smithing 30. I will need a pickaxe, a hammer and a chisel.'];
    if (stage >= 100) return [strike('I mined a new heartstone from the singing seam, cut it on the great anvil and woke the Forge-Heart of Durnhold.'), '', COMPLETE];
    const out = [strike("The heartstone of Durnhold's great hearth has cracked.")];
    if (stage === 10) {
      out.push(has(game, 'raw_heartstone') ? strike('I mined a raw heartstone from the singing seam.') : `I must mine a raw heartstone from the ${red('singing seam')} in the ${red('Deep Seams')}. (Mining 30)`);
      out.push(has(game, 'mason_flux') ? strike('Mason Dunmore gave me his flux.') : `I need flux from ${red('Mason Dunmore')} at the masons' guild, north-west of the Great Hall.`);
      out.push(`Then I can cut the stone on the ${red('great anvil')} in the Forge Hall. (Smithing 30, hammer and chisel)`);
    }
    if (stage === 20) out.push(strike('I cut a new heartstone.'), `I must set it in the ${red('great hearth')} and bring it to welding heat. ${red('Brunna')} can explain how.`);
    if (stage === 30) out.push(strike('The Forge-Heart burns again.'), `I should tell ${red('Brunna')}.`);
    return out;
  },
});

const HEAT_RULES = [
  { npc: 'On the old gauge, a breath from the bellows adds two, a shovel of coal adds three, and a ladle of water takes one back.' },
  { npc: 'The stone must set at white-gold - nine on the gauge, no more, no less. You have four moves before it sets.' },
  { npc: 'And mark this: a forge-heart wakes on breath, not on fuel. The last thing it feels must be the bellows.' },
];
registerDialogue('forgemaster_brunna', ({ game }) => {
  const ep = epicTalk(game, 'forgemaster_brunna'); if (ep) return ep;
  const s = stageOf(game, FH);
  if (s >= 100) return [
    { npc: 'Hear that roar? That is the sound of a hold that can forge again. My masterworks are yours to buy, friend of the hearth.' },
    { options: [{ text: 'Show me your masterworks.', action: () => { game.ui.openShop('durnhold_masterworks'); return false; } }, { text: 'Goodbye.', end: true }] },
  ];
  if (s === 30) return [
    { player: 'The Forge-Heart is burning!' },
    { npc: 'I felt it through my boots before you said a word. White-gold, and breathing. You have the makings of a forgemaster, surface-walker.' },
    { action: () => { game.quests.complete(FH); } },
    { npc: 'Take my spare gloves - and come to me when you want metal worth wearing.', end: true },
  ];
  if (s === 20) return [
    { npc: 'A fine cut! Now use it on the great hearth - the big one by the west wall - and bring it up to heat.' },
    { options: [{ text: 'How do I bring it to heat?', goto: 'rules' }, { text: "I'll manage.", end: true }] },
    { label: 'rules', ...HEAT_RULES[0] }, HEAT_RULES[1], { ...HEAT_RULES[2], end: true },
  ];
  if (s === 10) return [
    { npc: 'Well? A raw heartstone from the singing seam, flux from old Dunmore, then cut it on the great anvil.' },
    { options: [
      { text: 'Where is the singing seam?', goto: 'seam' },
      { text: 'Where do I find Dunmore?', goto: 'mason' },
      { text: "I'm on it.", end: true },
    ] },
    { label: 'seam', npc: 'In the Deep Seams, east of the plaza. You will hear it before you see it. Bring a pickaxe - and a Mining level of at least 30.', end: true },
    { label: 'mason', npc: "The masons' guild, the little hall north-west of the Great Hall. He will test you. He tests everyone.", end: true },
  ];
  return [
    { npc: 'Cold. COLD! Nine hundred years that hearth has burned, and it goes out on MY watch!' },
    { options: [
      { text: 'What happened to the forge?', goto: 'what' },
      { text: 'I will leave you to it.', end: true },
    ] },
    { label: 'what', npc: 'The heartstone cracked. Every great hearth needs one - a stone from the mountain\'s warm heart that holds the heat and breathes it back.' },
    { npc: 'The only seam warm enough is the singing seam in the Deep Seams. Dunmore of the masons has the flux to cut it, and the great anvil here will shape it. I cannot leave the hall.' },
    { options: [
      { text: "I'll get you a new heartstone.", action: () => { game.quests.start(FH); game.quests.setStage(FH, 10); }, goto: 'ok' },
      { text: 'Sounds like hard work. No.', end: true },
    ] },
    { label: 'ok', npc: 'Ha! Bring a pickaxe, a hammer and a chisel. And mind the seam - it does not like to be rushed.', end: true },
  ];
});

registerDialogue('mason_dunmore', ({ game }) => {
  const s = stageOf(game, FH);
  const answer = [];
  if (s === 10 && !has(game, 'mason_flux')) return [
    { npc: 'Flux? For Brunna\'s hearth? Hmph. Flux is for masons who look at things. Do you look at things, surface-walker?' },
    { options: [{ text: 'Test me.', goto: 'q1' }, { text: 'Maybe later.', end: true }] },
    { label: 'q1', title: 'Which word is third on the lintel of the Durn Arch?', options: ['Strength', 'Stone', 'Silver', 'Supper'].map((w) => ({ text: w, action: () => { answer[0] = w; } })) },
    { title: 'Who founded Durnhold, according to the tablet in the Great Hall?', options: ['Thane Hargrim Ironvein', 'Thane Borrik Ironvein', 'Forgemaster Brunna', 'Old Grimbold'].map((w) => ({ text: w, action: () => { answer[1] = w; } })) },
    { action: () => (answer[0] === 'Supper' && answer[1] === 'Thane Borrik Ironvein' ? 'right' : 'wrong') },
    { label: 'wrong', npc: 'Wrong. Go and LOOK at things. The arch at the west gate, the tablet in the Great Hall. Then come back.', end: true },
    { label: 'right', npc: 'Strength, stone, supper - in that order, as every dwarf knows. And old Borrik, who started it all. You do look at things.' },
    { action: () => { give(game, 'mason_flux'); game.events.emit('quest:change', { id: FH, stage: 10 }); } },
    { npc: 'Here is my flux. Dust it on the stone before you strike, or it will shatter like a bad joke.', end: true },
  ];
  if (s === 10) return [{ npc: 'Dust the flux on before you strike. And use a chisel, not your teeth.' }];
  return [
    { npc: 'Every stone in this hold carries a mason\'s mark. Mine is a square inside a square. Very modest.' },
    { options: [{ text: 'What is the oldest mark?', goto: 'old' }, { text: 'Goodbye.', end: true }] },
    { label: 'old', npc: 'The deepest stones of the Forge Hall carry a mark no guild claims: a closed eye inside a ring of fire. Nobody knows who cut it. I lose sleep over it.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  const pickaxe = (p) => {
    const w = p.equipment.get('weapon')?.id;
    if (w?.endsWith('_pickaxe')) return w;
    for (let i = 0; i < p.inventory.size; i++) { const it = p.inventory.get(i); if (it?.id?.endsWith('_pickaxe')) return it.id; }
    return null;
  };
  I.onObject('Mine', ['singing_seam'], ({ player }) => {
    const s = stageOf(game, FH);
    if (s !== 10 || has(game, 'raw_heartstone')) { game.message('The seam hums softly. You feel no need to disturb it.'); return; }
    const pick = pickaxe(player);
    if (!pick) { game.message('You need a pickaxe to mine this seam.'); return; }
    if (player.skills.getLevel('mining') < 30) { game.message('You need a Mining level of 30 to mine the singing seam.'); return; }
    game.message('You swing at the seam. It hums louder with every strike...');
    game.actions.start(player, { name: 'mine_seam', anim: 'mine', tool: pick, interval: 1,
      onTick: ({ ticks }) => {
        if (ticks < 5) return true;
        give(game, 'raw_heartstone');
        player.skills.addXp('mining', 120);
        game.message('A warm lump of ore breaks free. The humming stops, as if the mountain held its breath.');
        game.events.emit('quest:change', { id: FH, stage: 10 });
        return false;
      } });
  });
  I.onItemOnObject(['raw_heartstone'], ['anvil_great'], ({ player }) => {
    if (stageOf(game, FH) !== 10) { game.message('Nothing interesting happens.'); return; }
    if (!has(game, 'hammer') || !has(game, 'chisel')) { game.message('You need a hammer and a chisel to cut the heartstone.'); return; }
    if (!has(game, 'mason_flux')) { game.message('Without flux the stone will shatter. Mason Dunmore has some.'); return; }
    if (player.skills.getLevel('smithing') < 30) { game.message('You need a Smithing level of 30 to cut a heartstone.'); return; }
    game.playAnim(player, 'smith', 2400);
    game.actions.lock(player, 4);
    game.schedule(3, () => {
      take(game, 'raw_heartstone'); take(game, 'mason_flux'); give(game, 'heartstone');
      player.skills.addXp('smithing', 350); player.skills.addXp('crafting', 150);
      game.quests.setStage(FH, 20);
      game.message('You dust the stone with flux, set the chisel and strike. It splits clean along its glowing veins: a heartstone.');
    });
  });
  // the heat puzzle at the great hearth
  I.onItemOnObject(['heartstone'], ['forge_hearth'], ({ player }) => {
    if (stageOf(game, FH) !== 20) { game.message('Nothing interesting happens.'); return; }
    const st = { heat: 0, moves: 0, last: null };
    const COLOURS = ['cold and black', 'cold and black', 'a dull red', 'cherry red', 'orange', 'orange', 'yellow', 'yellow', 'bright yellow', 'WHITE-GOLD'];
    const step = (kind, n) => {
      st.heat += n; st.moves += 1; st.last = kind;
      game.playAnim(player, kind === 'bellows' ? 'crush' : 'pickup', 700);
      if (st.heat < 0) st.heat = 0;
      if (st.heat === 9 && kind === 'bellows') return 'win';
      if (st.heat > 9 || st.moves >= 4) return 'fail';
      return 'stoke';
    };
    game.ui.startDialogue([
      { message: 'You set the heartstone into the cold bed of the great hearth.' },
      { label: 'stoke', message: () => `The heartstone glows ${COLOURS[Math.min(9, st.heat)]}. (Moves left: ${4 - st.moves})` },
      { options: [
        { text: 'Work the bellows.', action: () => step('bellows', 2) },
        { text: 'Shovel in coal.', action: () => step('coal', 3) },
        { text: 'Quench with a ladle of water.', action: () => step('quench', -1) },
        { text: 'Step away from the hearth.', end: true },
      ] },
      { label: 'fail', message: () => (st.heat > 9 ? 'The heat runs past white into a blinding glare, then the stone spits and goes dark. You will have to start again.' : 'The stone sets before it wakes, and the glow fades. You will have to start again.'), end: true },
      { label: 'win', message: 'One last breath from the bellows - and the heartstone flares white-gold. The great hearth ROARS into life, and the whole hall seems to breathe out.' },
      { action: () => {
        take(game, 'heartstone');
        player.skills.addXp('smithing', 500);
        game.spawnEffect('levelup', player);
        game.quests.setStage(FH, 30);
        return false;
      } },
    ], { player });
  });
  I.onNpc('Trade', ['forgemaster_brunna'], () => {
    if (!done(game, FH)) { game.ui.startDialogue([{ npc: 'Trade? With what forge? Get my hearth burning first.', name: 'Forgemaster Brunna' }]); return; }
    game.ui.openShop('durnhold_masterworks');
  });
});

// =================================================================================================
// 11. The Moonwell's Lament (Intermediate) - Moonwarden Sylvaine, Ilvaren (268,83)
// =================================================================================================
const ML = 'moonwell_lament';
questNpc({ id: 'moonwarden_sylvaine', name: 'Moonwarden Sylvaine', examine: 'Keeper of the Moonwell. Her eyes are the colour of its water - or what it used to be.', mapIcon: QICON,
  model: ELF({ top: '#c8d8e8', legs: '#8a9ab0', hair: '#e8e8f0' }, { female: true, hairStyle: 'long', equipment: { weapon: { shape: 'staff', color: '#c8d8ff' }, legs: { shape: 'robe', color: '#c8d8e8' } } }) });
spawnNpc('moonwarden_sylvaine', 268, 83, 1);
questNpc({ id: 'loremaster_faelith', name: 'Loremaster Faelith', examine: 'Keeper of the Ilvaren Archive. She has read every book in it, twice, and argued with most of them.',
  model: ELF({ top: '#3a3a6a', legs: '#2a2a4a', hair: '#a8a8c0' }, { female: true, hairStyle: 'long', equipment: { body: { shape: 'robe_top', color: '#3a3a6a' }, legs: { shape: 'robe', color: '#3a3a6a' } } }) });
spawnNpc('loremaster_faelith', 273, 71, 1);
questItem({ id: 'crystal_phial', name: 'Crystal phial', examine: 'An empty phial cut from a single crystal.', icon: { shape: 'potion', color: '#e0f0ff' } });
questItem({ id: 'phial_of_moondew', name: 'Phial of moondew', examine: 'Dew from the Lantern Grove. It glows faintly.', icon: { shape: 'potion', color: '#a0d8ff' } });
questItem({ id: 'moonwell_draught', name: 'Moonwell draught', examine: 'Moondew steeped with silverthistle. It smells like the first night of spring.', icon: { shape: 'potion', color: '#c0e8ff', color2: '#80c080' } });
questItem({ id: 'well_hymn', name: 'Hymn of the well', examine: 'A verse copied out in Sylvaine\'s careful hand.', options: ['Read'], icon: { shape: 'scroll', color: '#e8eef8' } });
questObject({ id: 'dewcap_bloom', name: 'Dewcap bloom', examine: 'Pale flowers that open at dusk. Their cups are full of glowing dew.', options: ['Gather'], blocks: false, model: { template: 'q_bloom', color: '#c8e8ff' } });
spawnObj('dewcap_bloom', 247, 118);
const PHASES = ['new moon', 'crescent', 'half moon', 'gibbous moon', 'full moon'];
const STONES = { phase_stone_e: ['east', 263 + 6, 82, 1], phase_stone_w: ['west', 263, 82, 2], phase_stone_s: ['south', 266, 85, 3] };
const STONE_ANSWER = { phase_stone_e: 4, phase_stone_w: 1, phase_stone_s: 0 };
const STONE_START = { phase_stone_e: 2, phase_stone_w: 3, phase_stone_s: 4 };
for (const [id, [side, x, y]] of Object.entries(STONES)) {
  questObject({ id, name: 'Phase stone', examine: `A pale stone ${side} of the Moonwell. Its face can be turned to show the phases of the moon.`, options: ['Turn', 'Inspect'], model: { template: 'q_waystone', glow: '#c0d8ff' } });
  spawnObj(id, x, y);
}
questNpc({ id: 'bitter_reflection', name: 'Bitter reflection', examine: 'The Moonwell\'s sorrow, given shape. Blades pass straight through it.', options: ['Attack'], combatLevel: 46, dialogue: undefined,
  aggressive: true, aggroRange: 6, stats: { attack: 30, strength: 30, defence: 35, magic: 45, hitpoints: 60 }, maxHit: 6, attackStyle: 'magic', attackRange: 4, attackSpeed: 5, respawnTicks: 100, wanderRadius: 2,
  bonuses: { defenceMagic: 0, defenceStab: 20, defenceSlash: 20, defenceCrush: 20, defenceRanged: 20 }, projectileColor: '#a0c8ff', tags: ['undead'],
  model: { template: 'ghost', scale: 1.15, colors: { skin: '#a8c8e8', top: '#6a8ab0', legs: '#6a8ab0', hair: '#e8f0ff' }, extras: { glowEyes: '#e0f0ff' } } });

questTeleport({ id: 'ilvaren_teleport', name: 'Ilvaren Teleport', level: 47, xp: 57, runes: { nexus_sigil: 2, water_sigil: 2, earth_sigil: 3 }, dest: { x: 266, y: 88, name: 'the Moonwell of Ilvaren' }, color: '#a0d0ff', questReq: ML, questName: "The Moonwell's Lament" });

registerQuest({
  id: ML, name: "The Moonwell's Lament", difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Moonwarden Sylvaine beside the Moonwell in Ilvaren.',
  description: 'The Moonwell of Ilvaren has stopped singing, and its water has turned bitter.',
  rewards: ['2 Quest Points', '3,000 Magic XP', '2,500 Herblore XP', 'The Ilvaren Teleport spell (Magic 47)', 'A Lamp of Insight (2,500 XP)'],
  onComplete: ({ game, player }) => { for (const id of ['well_hymn', 'crystal_phial', 'phial_of_moondew', 'moonwell_draught']) take(game, id, 5); xp(player, { magic: 3000, herblore: 2500 }); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Moonwarden Sylvaine')} beside the ${red('Moonwell')} in ${red('Ilvaren')}.`, 'Requirements: Herblore 25. I should be able to cast combat spells.'];
    if (stage >= 100) return [strike('I brewed a moonwell draught, set the phase stones as on the night the well was first sung, and laid its bitter reflection to rest.'), 'I can now cast Ilvaren Teleport.', '', COMPLETE];
    const out = [strike('The Moonwell has gone bitter and silent.')];
    if (stage === 10) {
      const f = flags(game, ML);
      if (has(game, 'moonwell_draught')) out.push(strike('I brewed a moonwell draught.'));
      else {
        out.push(has(game, 'phial_of_moondew') ? strike('I gathered moondew in the Lantern Grove.') : `Gather dew from a ${red('dewcap bloom')} in the ${red('Lantern Grove')} south-west of Ilvaren, using the crystal phial.`);
        out.push(`Mix the moondew with a clean ${red('silverthistle')} herb. (Herblore 25)`);
      }
      out.push(f.stones ? strike('The phase stones are set as in the hymn.') : `Turn the three ${red('phase stones')} around the well to match the ${red('hymn of the well')}.`);
      out.push(`Then pour the draught into the ${red('Moonwell')}. Sylvaine warns that its sorrow may take shape - only magic will touch it.`);
    }
    if (stage === 20) out.push(strike('The draught drew a bitter reflection out of the well.'), `I must defeat the ${red('bitter reflection')} with magic.`);
    if (stage === 30) out.push(strike('The reflection is gone and the well is singing.'), `I should speak to ${red('Sylvaine')}.`);
    return out;
  },
});

registerDialogue('moonwarden_sylvaine', ({ game }) => {
  const s = stageOf(game, ML);
  const f = flags(game, ML);
  if (s >= 100) return [{ npc: 'Listen... it sings again. Every elf in Ilvaren slept soundly last night for the first time in a season. Thank you.' }];
  if (s === 30) return [
    { player: 'The reflection is gone. Can you hear the well?' },
    { npc: 'I hear it. It is singing the oldest song - the one it sang on its first night. You have given us back our memory.' },
    { action: () => { game.quests.complete(ML); } },
    { npc: 'The well knows you now. Speak its name in the old way - I will teach you - and it will draw you home to Ilvaren whenever you wish.', end: true },
  ];
  if (s === 20) return [
    { npc: 'The reflection still lurks in the water. Only spellcraft can touch it. Shall I call it out again?' },
    { options: [{ text: 'Call it out. I am ready.', action: () => { game.events.emit('east:moonwell_call'); return false; } }, { text: 'Not yet.', end: true }] },
  ];
  if (s === 10) return [
    { npc: 'The dew from the Lantern Grove, a clean sprig of silverthistle, and the stones set as the hymn tells. Then pour.' },
    { if: () => !has(game, 'crystal_phial') && !has(game, 'phial_of_moondew') && !has(game, 'moonwell_draught'), goto: 'phial' },
    { if: () => !has(game, 'well_hymn'), goto: 'hymn' },
    { if: () => !f.sigils, goto: 'sigils' },
    { npc: 'The apothecary across the plaza sells silverthistle, if you cannot find your own.', end: true },
    { label: 'phial', npc: 'You have lost the phial? Here is another. Crystal is cheap. Patience is not.' },
    { action: () => { give(game, 'crystal_phial'); }, end: true },
    { label: 'hymn', npc: 'Here, another copy of the hymn.' },
    { action: () => { give(game, 'well_hymn'); }, end: true },
    { label: 'sigils', npc: 'One more thing. When the draught touches the water, the bitterness may rise. Steel will not touch it - take these sigils, in case you have none.' },
    { action: () => { f.sigils = true; give(game, 'wind_sigil', 80); give(game, 'mind_sigil', 40); }, end: true },
  ];
  return [
    { npc: '...' },
    { player: 'Are you all right?' },
    { npc: 'The Moonwell has stopped singing. For nine hundred years it has hummed beneath the town - you feel it in your teeth, your dreams. Now: silence. And the water is bitter.' },
    { options: [
      { text: 'Can the well be healed?', goto: 'heal' },
      { text: 'I am sorry. Goodbye.', end: true },
    ] },
    { label: 'heal', npc: 'Perhaps. A draught of moondew and silverthistle can remind it of sweetness. And the phase stones must be set as they were on the night it was first sung.' },
    { npc: 'Grief does not leave quietly, though. Something may rise when the draught touches the water.' },
    { options: [
      { text: 'I will help you heal the well.', action: () => { game.quests.start(ML); game.quests.setStage(ML, 10); give(game, 'crystal_phial'); give(game, 'well_hymn'); }, goto: 'ok' },
      { text: 'That sounds beyond me.', end: true },
    ] },
    { label: 'ok', npc: 'Take this crystal phial for the dew - the dewcaps bloom in the Lantern Grove, south-west of the town. And this, the hymn of the well. Read it well.', goto: 'more' },
    { label: 'more', npc: 'Steel will not touch whatever rises from the water, so take these sigils too.' },
    { action: () => { f.sigils = true; give(game, 'wind_sigil', 80); give(game, 'mind_sigil', 40); }, end: true },
  ];
});

registerDialogue('loremaster_faelith', ({ game }) => {
  const ep = epicTalk(game, 'loremaster_faelith'); if (ep) return ep;
  return [
    { npc: 'Quietly, please. The books are older than you, and some of them are listening.' },
    { label: 'menu', options: [
      { text: 'What is kept in the Archive?', goto: 'arch' },
      { text: 'Do you know anything about the Moonwell?', goto: 'well' },
      { text: 'Goodbye.', end: true },
    ] },
    { label: 'arch', npc: 'Songs, mostly. Elves write everything as songs - histories, recipes, tax records. There is a shelf behind me with the oldest; you may look, if you wipe your hands.', goto: 'menu' },
    { label: 'well', npc: done(game, ML) ? 'It sings again, thanks to you. I have added a verse about you. It does not scan, but it is sincere.' : 'It was sung awake on the night of the first full moon, and the phase stones still remember that night. Sylvaine will tell you more.', goto: 'menu' },
  ];
});

hook((game) => {
  const I = game.interactions;
  let refl = null;
  const callReflection = () => {
    if (alive(game, refl)) { game.message('The reflection is already here!'); return; }
    refl = game.spawnNpc('bitter_reflection', 266, 84, { wander: 2, respawn: false });
    if (!refl) return;
    game.spawnEffect('splash', refl, {});
    game.say(refl, 'Remember... remember what you lost...', { chat: false, color: '#a0c8ff' });
    aggro(game, refl);
  };
  game.events.on('east:moonwell_call', callReflection);
  I.onItem('Read', ['well_hymn'], () => game.ui.startDialogue([
    { message: '"When first the well was sung awake, three stones stood watch around it:"' },
    { message: '"In the east the moon stood round and whole; in the west it was a sliver, thin as a fingernail; and in the south there was no moon at all."' },
    { message: '"Set the stones as on that night, and the well will remember."' },
  ]));
  I.onObject('Gather', ['dewcap_bloom'], ({ player }) => {
    if (stageOf(game, ML) !== 10) { game.message('The dewcaps glisten. You leave them be.'); return; }
    if (!has(game, 'crystal_phial')) { game.message(has(game, 'phial_of_moondew') || has(game, 'moonwell_draught') ? 'You already have enough moondew.' : 'You need something to hold the dew. Sylvaine had a crystal phial.'); return; }
    game.playAnim(player, 'pickup', 900);
    take(game, 'crystal_phial'); give(game, 'phial_of_moondew');
    game.message('You tip the glowing dew from a dozen blooms into the crystal phial.');
    game.events.emit('quest:change', { id: ML, stage: 10 });
  });
  I.onItemOnItem(['phial_of_moondew'], ['silverthistle'], ({ player }) => {
    if (player.skills.getLevel('herblore') < 25) { game.message('You need a Herblore level of 25 to steep the moondew properly.'); return; }
    take(game, 'phial_of_moondew'); take(game, 'silverthistle'); give(game, 'moonwell_draught');
    player.skills.addXp('herblore', 300);
    game.playAnim(player, 'herblore', 1200);
    game.message('You crush the silverthistle into the moondew. The phial glows brighter and smells of spring.');
    game.events.emit('quest:change', { id: ML, stage: 10 });
  });
  const phaseOf = (id) => { const f = flags(game, ML); f.phase ||= { ...STONE_START }; return f.phase[id]; };
  const checkStones = () => { const f = flags(game, ML); const ok = Object.keys(STONES).every((id) => phaseOf(id) === STONE_ANSWER[id]); f.stones = ok; return ok; };
  I.onObject('Turn', Object.keys(STONES), ({ player, target }) => {
    const f = flags(game, ML);
    phaseOf(target.id);
    f.phase[target.id] = (f.phase[target.id] + 1) % PHASES.length;
    game.playAnim(player, 'pickup', 700);
    game.message(`You turn the stone. Its face now shows the ${PHASES[f.phase[target.id]]}.`);
    const was = f.stones;
    if (checkStones() && !was && stageOf(game, ML) === 10) { game.spawnEffect('sparkle', target, { color: 0xc0d8ff }); game.message('<col=1a5a8a>A soft chime rings from the well.</col>'); }
    if (stageOf(game, ML) === 10) game.events.emit('quest:change', { id: ML, stage: 10 });
  });
  I.onObject('Inspect', Object.keys(STONES), ({ target }) => game.message(`The ${STONES[target.id][0]} stone shows the ${PHASES[phaseOf(target.id)]}.`));
  I.onItemOnObject(['moonwell_draught'], ['moonwell'], ({ player }) => {
    if (stageOf(game, ML) !== 10) { game.message('Nothing interesting happens.'); return; }
    if (!checkStones()) { game.message('You hesitate. The hymn said the stones must be set as on the night the well was first sung - and they are not.'); return; }
    take(game, 'moonwell_draught');
    game.playAnim(player, 'pickup', 900);
    game.message('You pour the draught into the Moonwell. The water shivers... and something dark rises out of it!');
    game.quests.setStage(ML, 20);
    game.schedule(2, callReflection);
  });
  // only magic can touch the reflection
  game.events.on('damage:before', (e) => {
    if (e.target?.id !== 'bitter_reflection' || e.type === 'magic' || !(e.amount > 0)) return;
    e.amount = 0;
    if (e.source === game.player) game.message('<col=8a0000>Your attack passes straight through the reflection. Only magic can touch it!</col>');
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id !== 'bitter_reflection') return;
    if (stageOf(game, ML) === 20) {
      game.quests.setStage(ML, 30);
      game.message('<col=1a5a8a>The reflection breaks like a ripple. Behind you, the Moonwell begins - softly - to sing.</col>');
    }
  });
});

// =================================================================================================
// 12. Stars over Bramblemoor (Intermediate) - Starcaller Orrin Vale, Starcaller's Study (279,240)
// =================================================================================================
const SB = 'stars_over_bramblemoor';
questNpc({ id: 'starcaller_orrin', name: 'Starcaller Orrin Vale', examine: 'The Starcaller of Bramblemoor. His robe is embroidered with constellations, some of them correct.', mapIcon: QICON,
  model: { colors: { top: '#2a2a6a', legs: '#1a1a4a', hair: '#e8e8e8' }, extras: { beard: true }, equipment: { head: { shape: 'wizard_hat', color: '#2a2a6a' }, body: { shape: 'robe_top', color: '#2a2a6a' }, legs: { shape: 'robe', color: '#2a2a6a' }, weapon: { shape: 'staff', color: '#c8a040' } } } });
spawnNpc('starcaller_orrin', 279, 240, 1);
questNpc({ id: 'apprentice_tobiah', name: 'Apprentice Tobiah', examine: 'The Starcaller\'s apprentice. He has been sent outside "to think about what he did".',
  model: { colors: { top: '#4a4a8a', legs: '#2a2a4a', hair: '#c8803a' }, equipment: { body: { shape: 'robe_top', color: '#4a4a8a' } } } });
spawnNpc('apprentice_tobiah', 222, 125, 2);
questNpc({ id: 'shepherd_wyn', name: 'Shepherd Wyn', examine: 'A shepherd of Bramblemoor. Her flock is, technically, cows.',
  model: { female: true, hairStyle: 'long', colors: { top: '#7a6a4a', legs: '#4a3a2a', hair: '#c8a060' }, equipment: { weapon: { shape: 'staff', color: '#6a4a2a' }, head: { shape: 'hood', color: '#7a6a4a' } } } });
spawnNpc('shepherd_wyn', 206, 124, 3);
questItem({ id: 'lens_shard', name: 'Lens shard', examine: 'A curved piece of polished crystal. It makes the sky look closer.', stackable: true, icon: { shape: 'gem', color: '#c8e0ff' } });
questItem({ id: 'star_catalogue', name: 'Star catalogue', examine: "The Starcaller's catalogue of lesser constellations.", options: ['Read'], icon: { shape: 'book', color: '#2a2a6a' } });
registerItem({ id: 'starcaller_circlet', name: "Starcaller's circlet", examine: 'A thin silver circlet set with a chip of the great lens. Stars seem a little closer.', slot: 'head', value: 1500, tradeable: false,
  requirements: { magic: 30 }, bonuses: { attackMagic: 6, defenceMagic: 5, magicDamage: 2, prayer: 1 }, icon: { shape: 'ring', color: '#d8dce4', color2: '#a0c0ff' }, model: { shape: 'med_helm', color: '#d8dce4' } });
questObject({ id: 'starfall_cairn', name: 'Starfall cairn', examine: 'A cairn of piled stones. Something glints between them.', options: ['Search'], model: { template: 'q_cairn' } });
spawnObj('starfall_cairn', 230, 130);
questObject({ id: 'great_orrery', name: 'Great orrery', examine: 'A brass star-telescope on a turning base. Its lens is missing.', options: ['Look-through', 'Inspect'], model: { template: 'q_orrery' } });
questObject({ id: 'great_orrery_fixed', name: 'Great orrery', examine: 'A brass star-telescope, its lens mended with three shards.', options: ['Look-through', 'Inspect'], model: { template: 'q_orrery', fixed: true } });
spawnObj('great_orrery', 274, 240);

const CONSTELLATIONS = ['The Anvil', 'The Heron', 'The Lantern', 'The Sickle', 'The Wyrm'];
registerQuest({
  id: SB, name: 'Stars over Bramblemoor', difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: "Speak to Starcaller Orrin Vale at the top of the Starcaller's Spire in Bramblemoor.",
  description: "The Starcaller's great orrery is broken, and something is wrong with the sky.",
  rewards: ['2 Quest Points', '2,500 Magic XP', '1,500 Crafting XP', "Starcaller's circlet", 'A Lamp of Insight (2,500 XP)'],
  onComplete: ({ game, player }) => { take(game, 'lens_shard', 3); xp(player, { magic: 2500, crafting: 1500 }); give(game, 'starcaller_circlet'); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Starcaller Orrin Vale')} at the top of the ${red("Starcaller's Spire")} in ${red('Bramblemoor')}.`, 'I may have to deal with a few highway bandits.'];
    if (stage >= 100) return [strike('I mended the great orrery and read the sky for the Starcaller: the Wyrm is creeping towards the Pale Moon.'), '', COMPLETE];
    const f = flags(game, SB);
    const out = [strike("The Starcaller's great orrery lost its lens.")];
    if (stage === 10) {
      out.push(`I need three ${red('lens shards')} (${game.player.inventory.count('lens_shard')}/3):`);
      out.push(f.cairn ? strike('A shard from the starfall cairn.') : `Apprentice Tobiah says one fell near a ${red('cairn')} in the south-east of Bramblemoor.`);
      out.push(f.wyn ? strike('A shard from Shepherd Wyn.') : `${red('Shepherd Wyn')} at the fold in the west found something shiny.`);
      out.push(f.bandit ? strike('A shard from a highway bandit.') : `A ${red('highway bandit')} on the moor picked one up.`);
      out.push(`Then I can fit them to the ${red('great orrery')} in the study.`);
    }
    if (stage === 20) out.push(strike('I mended the orrery.'), f.looked ? `I have looked through the orrery. I should tell ${red('Orrin')} what I saw, using his ${red('star catalogue')}.` : `I should ${red('look through')} the orrery, then tell ${red('Orrin')} what I saw.`);
    return out;
  },
});

registerDialogue('starcaller_orrin', ({ game }) => {
  const ep = epicTalk(game, 'starcaller_orrin'); if (ep) return ep;
  const s = stageOf(game, SB);
  const ans = [];
  const ask = (dir) => ({ title: `What did you see in the ${dir}?`, options: CONSTELLATIONS.map((c) => ({ text: c, action: () => { ans.push(c); } })) });
  if (s >= 100) return [
    { npc: 'The Wyrm creeps on, a hair\'s breadth a night. I write to the Thane of Durnhold weekly. He writes back about beer.' },
    { options: [{ text: 'What does the Wyrm mean?', goto: 'w' }, { text: 'Goodbye.', end: true }] },
    { label: 'w', npc: 'I do not know - yet. But somebody drew those stars on the sky as a warning, long ago. The Sun-Wardens of the south, perhaps. Their temple is buried in the Sunscar.', end: true },
  ];
  if (s === 20) return [
    { npc: 'Well? What did the sky show you? Name them properly - use my catalogue, I did not write it for decoration.' },
    { if: () => !has(game, 'star_catalogue'), goto: 'cat' },
    { if: () => !flags(game, SB).looked, goto: 'look' },
    { options: [{ text: 'I am ready to tell you.', goto: 'q' }, { text: 'Not yet.', end: true }] },
    { label: 'q', ...ask('north') }, ask('east'), ask('south'),
    { action: () => (ans.join() === 'The Lantern,The Anvil,The Wyrm' ? 'right' : 'wrong') },
    { label: 'wrong', npc: 'No, no, NO. Look again, and read the catalogue properly. Squares are not rings. Rings are not chains.', end: true },
    { label: 'right', npc: 'The Lantern in the north, the Anvil in the east... and the Wyrm, in the south, touching the Pale Moon. Touching it! It has never been so close.' },
    { npc: '"When the Wyrm touches the Pale Moon, the ash will wake." That is what my notes say. I wrote them. I wish I had not.' },
    { action: () => { game.quests.complete(SB); }, end: true },
    { label: 'cat', npc: 'You lost my catalogue? Here, my spare. Do not lose this one, I only have the one spare.' },
    { action: () => { give(game, 'star_catalogue'); }, end: true },
    { label: 'look', npc: 'You have not even looked yet! Put your eye to the orrery, then come and tell me.', end: true },
  ];
  if (s === 10) return [
    { npc: 'Three shards. One by a cairn on the moor, one with the shepherd, one in a bandit\'s pocket - so says my idiot apprentice.' },
    { if: () => !has(game, 'star_catalogue'), goto: 'cat' },
    { npc: 'Fit them to the orrery when you have all three.', end: true },
    { label: 'cat', npc: 'And take my star catalogue. You will need it.' },
    { action: () => { give(game, 'star_catalogue'); }, end: true },
  ];
  return [
    { npc: 'Do not touch anything! Especially not the orrery. Especially not the orrery\'s lens, which is GONE.' },
    { options: [
      { text: 'What happened to the lens?', goto: 'lens' },
      { text: 'I will touch nothing. Goodbye.', end: true },
    ] },
    { label: 'lens', npc: 'My apprentice "cleaned" it. On the balcony. In a gale. It went over the rail and shattered somewhere on Bramblemoor.' },
    { npc: 'And tonight of all nights I must read the southern sky. The Wyrm is moving - I need to know how close it is to the Pale Moon.' },
    { options: [
      { text: 'I can find the pieces.', action: () => { game.quests.start(SB); game.quests.setStage(SB, 10); give(game, 'star_catalogue'); }, goto: 'ok' },
      { text: 'Sounds like your apprentice\'s problem.', end: true },
    ] },
    { label: 'ok', npc: 'You can? Splendid! Ask Tobiah, outside - he saw where they fell. And take my star catalogue; you will want it once the orrery is mended.', end: true },
  ];
});
registerDialogue('apprentice_tobiah', ({ game }) => {
  const s = stageOf(game, SB);
  if (s === 10) return [
    { npc: 'Did he send you? I said I was sorry! I saw the lens bounce off the balcony and break into three.' },
    { npc: 'One piece landed by the old cairn, south-east of here. Shepherd Wyn picked up another - she was waving it at the cows. And a bandit pocketed the third. The bandits on the moor, you know. Big knives.' },
    { player: 'Thanks.', end: true },
  ];
  if (s >= 100) return [{ npc: 'He let me back in! I am not allowed to clean anything ever again. Best day of my life.' }];
  return [
    { npc: 'Hello. I am thinking about what I did.' },
    { options: [{ text: 'What did you do?', goto: 'what' }, { text: 'Carry on, then.', end: true }] },
    { label: 'what', npc: 'Broke the Starcaller\'s lens. It is a long story. It is also a very short story. Go up and ask him - the spire door is just there.', end: true },
  ];
});
registerDialogue('shepherd_wyn', ({ game }) => {
  const s = stageOf(game, SB);
  const f = flags(game, SB);
  const FOOD = ['bread', 'stonebread'];
  if (s === 10 && !f.wyn) return [
    { npc: 'A piece of glass? Aye, this shiny thing. The cows like it. They stare at it for hours.' },
    { player: 'It belongs to the Starcaller. Could I have it?' },
    { npc: 'I have been out on this moor a week with nothing but cows to talk to. Bring me a loaf of bread and it is yours.' },
    { if: () => FOOD.some((id) => has(game, id)), goto: 'give' },
    { player: 'I will find some bread.', end: true },
    { label: 'give', player: 'Here - some bread.' },
    { action: () => { const id = FOOD.find((i) => has(game, i)); take(game, id); f.wyn = true; give(game, 'lens_shard'); game.events.emit('quest:change', { id: SB, stage: 10 }); } },
    { npc: 'Bread! Real bread! Take your shiny glass. The cows will sulk, but they always sulk.', end: true },
  ];
  return [
    { npc: 'Mind the fold gate. And the cows. And the moor, really.' },
    { options: [{ text: 'Why cows, not sheep?', goto: 'cows' }, { text: 'Goodbye.', end: true }] },
    { label: 'cows', npc: 'Sheep wander off a cliff the first chance they get. Cows think about it first. I like a beast that thinks.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  I.onItem('Read', ['star_catalogue'], () => game.ui.startDialogue([
    { message: '<b>A Catalogue of Lesser Constellations</b>, by Orrin Vale, Starcaller.' },
    { message: 'THE ANVIL: four stars in a neat square, with a bright fifth hanging beneath.<br>THE HERON: five stars in a line, bent sharply at the top like a neck.' },
    { message: 'THE LANTERN: a ring of six faint stars around a single red one.<br>THE SICKLE: seven stars in a curving hook.' },
    { message: 'THE WYRM: a long, winding chain of faint stars ending in two bright "eyes". It wanders a little every century.' },
  ]));
  I.onObject('Search', ['starfall_cairn'], ({ player }) => {
    game.playAnim(player, 'pickup', 900);
    const f = flags(game, SB);
    if (stageOf(game, SB) !== 10 || f.cairn) { game.message('You search the cairn but find only stones and a sleepy beetle.'); return; }
    f.cairn = true; give(game, 'lens_shard');
    game.message('Wedged between two stones is a curved shard of polished crystal.');
    game.events.emit('quest:change', { id: SB, stage: 10 });
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id !== 'highway_bandit' || stageOf(game, SB) !== 10 || flags(game, SB).bandit) return;
    if (npc.spawnY > 140 || npc.spawnX < 192) return;   // the Bramblemoor bandits
    game.schedule(3, () => game.spawnGroundItem('lens_shard', 1, npc.x, npc.y, { owner: game.player.name }));
  });
  game.events.on('item:pickup', ({ player, itemId }) => {
    if (itemId !== 'lens_shard' || (player && player !== game.player)) return;
    const f = flags(game, SB);
    if (stageOf(game, SB) !== 10 || f.bandit) return;
    f.bandit = true;
    game.events.emit('quest:change', { id: SB, stage: 10 });
  });
  I.onItemOnObject(['lens_shard'], ['great_orrery'], ({ player, target }) => {
    if (stageOf(game, SB) !== 10) { game.message('Nothing interesting happens.'); return; }
    if (!has(game, 'lens_shard', 3)) { game.message('You need all three lens shards to mend the orrery.'); return; }
    take(game, 'lens_shard', 3);
    game.playAnim(player, 'craft', 1800);
    game.replaceObject(target, 'great_orrery_fixed');
    player.skills.addXp('crafting', 400);
    game.quests.setStage(SB, 20);
    game.message('You fit the three shards into the brass ring. They lock together with a click, and the lens gleams whole.');
  });
  I.onObject('Inspect', ['great_orrery', 'great_orrery_fixed'], ({ target }) => game.message(target.id === 'great_orrery' ? 'The lens ring is empty. Three curved shards would fit it.' : 'The lens is whole again.'));
  I.onObject('Look-through', ['great_orrery', 'great_orrery_fixed'], ({ player }) => {
    const s = stageOf(game, SB);
    if (s < 20) { game.message('Without its lens, the orrery shows you only the ceiling.'); return; }
    if (s < 100) flags(game, SB).looked = true;
    game.playAnim(player, 'pickup', 900);
    game.ui.startDialogue([
      { message: 'You put your eye to the orrery and turn it slowly around the sky...' },
      { message: 'NORTH: a ring of six faint stars around a single red one.' },
      { message: 'EAST: four stars in a neat square, with a bright fifth hanging beneath.' },
      { message: 'SOUTH: a long, winding chain of faint stars ending in two bright ones - right beside the pale disc of the moon.' },
      { message: 'WEST: five stars in a line, bent sharply at the top.' },
    ], { player });
    if (s === 20) game.events.emit('quest:change', { id: SB, stage: 20 });
  });
  // the orrery stays mended for players who finished it
  game.events.on('game:ready', () => {
    if (stageOf(game, SB) < 20) return;
    for (const o of game.findObjects((o) => o.id === 'great_orrery')) game.replaceObject(o, 'great_orrery_fixed');
  });
});

// =================================================================================================
// 13. The Keeper's Light (Novice) - Old Agnes, Beacon Isle (198,207)
// =================================================================================================
const KL = 'keepers_light';
questNpc({ id: 'keeper_agnes', name: 'Old Agnes', examine: 'Keeper of the Beacon of Gullhaven. Her knees are older than the lighthouse; her temper is older still.', mapIcon: QICON,
  model: { female: true, hairStyle: 'long', colors: { top: '#2a3a5a', legs: '#3a3a3a', hair: '#e8e8e8' }, equipment: { weapon: { shape: 'staff', color: '#6a4a2a' } } } });
spawnNpc('keeper_agnes', 198, 207, 1);
questObject({ id: 'beacon_lamp', name: 'Beacon lamp', examine: 'The great lamp of the Beacon, brought down for cleaning. It is cold.', options: ['Fill', 'Trim', 'Light', 'Signal'], model: { template: 'q_brazier' } });
questObject({ id: 'beacon_lamp_lit', name: 'Beacon lamp', examine: 'The great lamp of the Beacon, burning bright.', options: ['Signal'], model: { template: 'q_brazier', lit: true } });
spawnObj('beacon_lamp', 199, 205);
registerItem({ id: 'keepers_lantern', name: "Keeper's lantern", examine: 'A storm lantern from the Beacon. It never quite goes out.', slot: 'shield', value: 400, tradeable: false,
  bonuses: { defenceMagic: 3, defenceRanged: 2, prayer: 1 }, icon: { shape: 'pot', color: '#c8a040', color2: '#ffe080' }, model: { shape: 'round', color: '#c8a040' } });

registerQuest({
  id: KL, name: "The Keeper's Light", difficulty: 'Novice', questPoints: 1, completeStage: 100,
  start: 'Speak to Old Agnes on Beacon Isle, off the east pier of Gullhaven.',
  description: 'The Beacon of Gullhaven has gone dark, and a ship is out in the fog.',
  rewards: ['1 Quest Point', '1,200 Firemaking XP', '800 Crafting XP', '300 coins', "Keeper's lantern"],
  onComplete: ({ game, player }) => { xp(player, { firemaking: 1200, crafting: 800 }); give(game, 'coins', 300); give(game, 'keepers_lantern'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Old Agnes')} on ${red('Beacon Isle')}, reached by the stepping stones off Gullhaven's east pier.`];
    if (stage >= 100) return [strike('I relit the Beacon and signalled a lost ship safely into the channel.'), '', COMPLETE];
    const f = flags(game, KL);
    const out = [strike('Old Agnes cannot climb the tower any more, and the beacon lamp is dark.')];
    if (stage === 10) {
      out.push(f.oil ? strike('I filled the lamp with oil.') : `Fill the ${red('beacon lamp')} with ${red('lamp oil')} (Bastian's Chandlery in Gullhaven sells it).`);
      out.push(f.trim ? strike('I trimmed the wick.') : `Trim the wick with a ${red('knife')}.`);
      out.push(`Then light it with a ${red('tinderbox')}. Agnes says: oil, trim, light - in that order.`);
    }
    if (stage === 20) out.push(strike('The beacon burns again.'), `A ship is signalling from the fog. I should answer with the lamp (${red('Signal')}). The ${red("keeper's signal book")} in the lighthouse lists the replies.`);
    if (stage === 30) out.push(strike('The ship found the channel.'), `I should tell ${red('Agnes')}.`);
    return out;
  },
});

registerDialogue('keeper_agnes', ({ game }) => {
  const s = stageOf(game, KL);
  if (s >= 100) return [{ npc: 'Two hundred and six years, and not one night dark - well, one. Nobody needs to know about that one. Thank you, dear.' }];
  if (s === 30) return [
    { player: 'The ship turned east and found the channel.' },
    { npc: 'I watched it from the window. Short, long, short - just as my mother taught me. You have a keeper\'s hands.' },
    { action: () => { game.quests.complete(KL); } },
    { npc: 'Take my old storm lantern, and a little something for your trouble. Come and polish things whenever you like.', end: true },
  ];
  if (s === 20) return [{ npc: 'She is lit! Now - that ship. Answer her with the lamp. The signal book is on the shelf in the lighthouse, if your memory is as bad as mine.' }];
  if (s === 10) return [
    { npc: 'Oil first, then trim the wick, then light her. Light a dry wick and it burns away to nothing; light an untrimmed one and it just smokes.' },
    { options: [{ text: 'Where do I get lamp oil?', goto: 'oil' }, { text: 'Right you are.', end: true }] },
    { label: 'oil', npc: 'Bastian\'s Chandlery in Gullhaven, on the main street. Tell him it is for me and he will still charge you full price.', end: true },
  ];
  return [
    { npc: 'Is that a visitor? On my rock? Nobody visits. Unless they want something. Do you want something?' },
    { options: [
      { text: 'Why is the beacon dark?', goto: 'dark' },
      { text: 'Just admiring the lighthouse.', end: true },
    ] },
    { label: 'dark', npc: 'Because my knees will not climb the tower, my oil has run out, and the wick is a disgrace. I brought the lamp down to fix it, and here we both sit.' },
    { npc: 'And there is a ship out in that fog. I can see its lantern blinking. It needs a light to find the channel.' },
    { options: [
      { text: 'I will relight the beacon for you.', action: () => { game.quests.start(KL); game.quests.setStage(KL, 10); }, goto: 'ok' },
      { text: 'Good luck with that.', end: true },
    ] },
    { label: 'ok', npc: 'Oil, trim, light - in that order! The lamp is just there by the tower. Bastian in Gullhaven sells oil.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  const lamp = (cb) => ({ player, target }) => {
    const s = stageOf(game, KL);
    if (s !== 10) { game.message(s < 10 ? 'Old Agnes would not want you meddling with her lamp.' : 'The lamp is burning nicely.'); return; }
    cb(player, target, flags(game, KL));
    game.events.emit('quest:change', { id: KL, stage: 10 });
  };
  I.onObject('Fill', ['beacon_lamp'], lamp((player, target, f) => {
    if (f.oil) { game.message('The lamp is already full of oil.'); return; }
    if (!has(game, 'lamp_oil')) { game.message('You need some lamp oil. Bastian\'s Chandlery in Gullhaven sells it.'); return; }
    take(game, 'lamp_oil'); f.oil = true; game.playAnim(player, 'pickup', 900);
    game.message('You pour the oil into the lamp\'s reservoir. The wick drinks it up.');
  }));
  I.onItemOnObject(['lamp_oil'], ['beacon_lamp'], (ctx) => { game.interactions.dispatch('object', 'Fill', 'beacon_lamp', null, ctx); });
  I.onObject('Trim', ['beacon_lamp'], lamp((player, target, f) => {
    if (!has(game, 'knife')) { game.message('You need a knife to trim the wick.'); return; }
    f.trim = true; game.playAnim(player, 'craft', 900);
    game.message('You trim the charred end of the wick neat and square.');
  }));
  I.onObject('Light', ['beacon_lamp'], lamp((player, target, f) => {
    if (!has(game, 'tinderbox')) { game.message('You need a tinderbox to light the lamp.'); return; }
    game.playAnim(player, 'cook', 1000);
    if (!f.oil) { f.trim = false; game.message('<col=8a0000>The dry wick flares up and burns away to a stub! You will have to trim it again - and fill the lamp first.</col>'); return; }
    if (!f.trim) { game.message('<col=8a0000>The ragged wick smokes and sputters and goes out. It needs trimming.</col>'); return; }
    game.replaceObject(target, 'beacon_lamp_lit');
    game.spawnEffect('sparkle', target, { color: 0xffe080 });
    player.skills.addXp('firemaking', 150);
    game.quests.setStage(KL, 20);
    game.message('The beacon lamp catches with a whump and burns a steady gold. Far out in the fog, a ship\'s lantern starts to blink.');
  }));
  I.onObject('Signal', ['beacon_lamp', 'beacon_lamp_lit'], ({ player }) => {
    const s = stageOf(game, KL);
    if (s !== 20) { game.message(s < 20 ? 'You cannot signal with an unlit lamp.' : 'The fog is empty now. The ship is safe.'); return; }
    const seq = [];
    const pulse = (n) => ({ title: `Signal ${n} of 3`, options: [{ text: 'A long flash.', action: () => { seq.push('L'); } }, { text: 'A short flash.', action: () => { seq.push('S'); } }] });
    game.ui.startDialogue([
      { message: 'Out in the fog the ship\'s lantern blinks: LONG... LONG... SHORT. Then it waits.' },
      pulse(1), pulse(2), pulse(3),
      { action: () => { game.playAnim(player, 'cast', 1200); return seq.join('') === 'SLS' ? 'ok' : seq.join('') === 'LSL' ? 'rocks' : 'bad'; } },
      { label: 'bad', message: 'The ship\'s lantern blinks LONG-LONG-SHORT again, patiently. It did not understand you.', end: true },
      { label: 'rocks', message: 'The ship\'s lantern swings about wildly - you told it to turn back from the rocks! It hovers, confused, and asks again.', end: true },
      { label: 'ok', message: 'SHORT... LONG... SHORT. A pause - then the ship\'s lantern blinks twice in thanks and turns east, gliding safely past the rocks into the channel.' },
      { action: () => { game.quests.setStage(KL, 30); return false; } },
    ], { player });
  });
  game.events.on('game:ready', () => {
    if (stageOf(game, KL) < 20) return;
    for (const o of game.findObjects((o) => o.id === 'beacon_lamp')) game.replaceObject(o, 'beacon_lamp_lit');
  });
});
