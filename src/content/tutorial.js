// New-player tutorial content: the Wayguide NPC, practice dummies and the step list.
// Runtime (step tracker panel, highlights, rewards, save state) lives in src/systems/tutorial.js.
//
// Step schema (registerData('tutorial', 'steps', [...]), in order):
//   { id, title, text, touchText?                           (touchText: wording for touch screens; without it the
//                                                            mouse wording is converted: click -> tap, right-click -> press and hold)
//     event: 'player:walk' | 'gathering:log' | ... | null   game event that may complete the step
//     match?: (payload, ctx) => bool                         filter for that event (ctx = { game, player, step, state })
//     poll?: (ctx) => bool                                    checked every tick (camera moved, tab open...)
//     ui?: 'tab:<id>' | 'quest:<questId>' | 'minimap' | 'orbs' | css selector     UI element to highlight
//     world?: { npc: id } | { object: id | [ids], near?: [x, y] } | { x, y }  world target (nearest to `near`, else to
//             the player): minimap flag + distance hint
//     onStart?: (ctx) => void }

import { registerNpc, registerDialogue, registerSpawn, registerData } from '../core/registry.js';

export const GUIDE_ID = 'tutorial_guide';
export const DUMMY_ID = 'practice_dummy';

// ---- NPCs ------------------------------------------------------------------------------------------
registerNpc({
  id: GUIDE_ID, name: 'Wayguide Corin', examine: 'He has walked every road in the vale and will happily tell you about all of them.',
  options: ['Talk-to'], dialogue: GUIDE_ID, wanderRadius: 1,
  mapIcon: { char: '?', color: '#7ae07a' },
  model: { template: 'human', colors: { top: '#4a7a3a', legs: '#5a4a32', hair: '#b8b0a0', boots: '#3a2a1a' }, extras: { beard: true },
    equipment: { weapon: { shape: 'staff', color: '#8a6a3a' }, cape: { shape: 'cape', color: '#2e5a28' } } },
});
// Straw practice dummies: they can be attacked but never hit back (combatLevel 0 = no retaliation).
registerNpc({
  id: DUMMY_ID, name: 'Practice dummy', examine: 'Stuffed with straw and old grudges. It will not fight back.',
  options: ['Attack'], combatLevel: 0, stats: { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 3 },
  wanderRadius: 0, respawnTicks: 6, dropTable: 'none', immuneBind: true,
  model: { template: 'golem', scale: 0.62, colors: { skin: '#d0b070', top: '#a88a50', legs: '#8a6a38', boots: '#5a4020', eyes: '#2a2015' }, extras: { glowEyes: null } },
});
registerSpawn({ type: 'npc', id: GUIDE_ID, x: 94, y: 139, wander: 1 });
registerSpawn({ type: 'npc', id: DUMMY_ID, x: 89, y: 141, wander: 0 });
registerSpawn({ type: 'npc', id: DUMMY_ID, x: 89, y: 143, wander: 0 });

// ---- starter bundle given on completion --------------------------------------------------------------
registerData('tutorial', 'reward', [
  { id: 'coins', qty: 250 }, { id: 'cooked_perch', qty: 5 }, { id: 'leather_gloves', qty: 1 }, { id: 'leather_boots', qty: 1 }, { id: 'traveller_cape', qty: 1 },
]);

// ---- steps -----------------------------------------------------------------------------------------
const isTool = (id) => /^forge_bronze_/.test(id);
registerData('tutorial', 'steps', [
  { id: 'walk', title: 'Getting around', text: '<b>Left-click</b> on the ground to walk there. Try walking a few steps.',
    touchText: '<b>Tap</b> the ground to walk there. Try walking a few steps.',
    event: 'player:walk' },
  { id: 'camera', title: 'Looking around', text: 'Turn the camera with the <b>arrow keys</b> (or drag with the middle mouse button) and <b>scroll</b> to zoom.',
    touchText: '<b>Drag one finger</b> across the world to turn the camera, and <b>pinch</b> with two fingers to zoom.',
    poll: ({ state, game }) => {
      const c = game.renderer?.cameraCtl;
      if (!c) return true; // no camera controller (headless): don't block the tutorial
      state.cam ||= { yaw: c.yaw, pitch: c.pitch, dist: c.dist };
      return Math.abs(c.yaw - state.cam.yaw) > 0.4 || Math.abs(c.pitch - state.cam.pitch) > 0.15 || Math.abs((c.dist ?? 0) - (state.cam.dist ?? 0)) > 1.5;
    } },
  { id: 'guide', title: 'Meet the Wayguide', text: 'Talk to <b>Wayguide Corin</b> (the green <b>?</b> on the minimap): <b>left-click</b> him, or right-click and choose <b>Talk-to</b>.',
    touchText: 'Talk to <b>Wayguide Corin</b> (the green <b>?</b> on the minimap): <b>tap</b> him, or press and hold him and choose <b>Talk-to</b>.',
    world: { npc: GUIDE_ID }, event: 'dialogue:end', match: (e) => e.ctx?.npc?.def?.id === GUIDE_ID },
  { id: 'chop', title: 'Woodcutting', text: 'You carry a <b>bronze axe</b>. Click a normal <b>tree</b> to chop some logs. The flag on your minimap marks one.',
    world: { object: 'tree_normal', near: [84, 146] }, event: 'gathering:log' },
  { id: 'fire', title: 'Firemaking', text: 'Use your <b>tinderbox</b> on the <b>logs</b>: click the tinderbox in your inventory, then click the logs.',
    ui: 'tab:inventory', event: 'production:make', match: (e) => /^burn_/.test(e.recipe?.id || '') && e.success !== false },
  { id: 'fish', title: 'Fishing', text: 'Take your <b>small fishing net</b> to the river east of town and click a <b>fishing spot</b> to catch something.',
    world: { object: 'fishing_spot_net', near: [112, 146] }, event: 'gathering:fish' },
  { id: 'cook', title: 'Cooking', text: 'Cook your catch: light a fire (or find the range in the town kitchen), then <b>use the raw fish on it</b>. Burnt food happens - try again!',
    world: { object: 'cooking_range', near: [96, 141] }, event: 'production:make', match: (e) => e.recipe?.skill === 'cooking' && e.success !== false },
  { id: 'mine', title: 'Mining', text: 'With your <b>bronze pickaxe</b>, mine one <b>copper</b> and one <b>tin</b> ore from the rocks north of town.',
    world: { object: ['rock_copper', 'rock_tin'], near: [100, 112] }, event: 'gathering:ore',
    match: (e, { state, player }) => {
      if (e.ore === 'copper_ore' || e.ore === 'tin_ore') state.ores = { ...(state.ores || {}), [e.ore]: true };
      return !!(state.ores?.copper_ore || player.inventory.has('copper_ore')) && !!(state.ores?.tin_ore || player.inventory.has('tin_ore'));
    } },
  { id: 'smelt', title: 'Smelting', text: 'Take the ores to the <b>furnace</b> in Brackenford and smelt a <b>bronze bar</b> (use an ore on the furnace, or click it).',
    world: { object: 'furnace' }, event: 'production:make', match: (e) => e.recipe?.id === 'smelt_bronze' && e.success !== false },
  { id: 'smith', title: 'Smithing', text: 'With your <b>hammer</b>, use the bar on an <b>anvil</b> and hammer out a <b>bronze dagger</b>.',
    world: { object: 'anvil' }, event: 'production:make', match: (e) => isTool(e.recipe?.id || '') && e.success !== false },
  { id: 'equip', title: 'Arm yourself', text: 'Open your <b>inventory</b> and click the <b>bronze dagger</b> to wield it. Your gear shows in the <b>Worn Equipment</b> tab.',
    ui: 'tab:inventory', event: 'equip', match: (e) => e.def?.slot === 'weapon',
    poll: ({ player, state }) => state.sawUnarmed && !!player.equipment.get('weapon'),
    onStart: ({ player, state }) => { state.sawUnarmed = !player.equipment.get('weapon'); } },
  { id: 'fight', title: 'Combat', text: 'Attack a <b>practice dummy</b> beside the Wayguide (or a chicken or goblin). Pick an attack style in the <b>Combat</b> tab.',
    ui: 'tab:combat', world: { npc: 'practice_dummy' }, event: 'npc:death', match: (e, { player }) => e.killer === player },
  { id: 'bank', title: 'The bank', text: 'Visit the <b>bank</b> north of the square and click a <b>bank booth</b> (or talk to a banker) to open your bank.',
    world: { object: 'bank_booth' }, event: 'ui:open', match: (e) => e.id === 'bank' },
  { id: 'questtab', title: 'Quests', text: 'Open the <b>Quest List</b> tab.',
    ui: 'tab:quests', poll: ({ game }) => game.ui?.side?.current === 'quests' },
  { id: 'journal', title: 'Your first quest', text: 'Click <b>The Lost Ledger</b> in the quest list to read its journal. Mira, the town guide, is waiting for you.',
    ui: 'quest:lost_ledger', event: 'ui:open', match: (e) => /^quest_/.test(e.id || '') },
]);

// ---- Wayguide dialogue -------------------------------------------------------------------------------
// The live tutorial API (game.tutorial) supplies the current step / skip / restart.
registerDialogue(GUIDE_ID, ({ game }) => {
  const T = game.tutorial;
  const st = T?.status?.() || 'none';
  const step = T?.currentStep?.();
  if (st === 'active' && step?.id === 'guide') {
    return [
      { npc: 'Welcome to Ashvale, traveller! I am Corin, and I show newcomers the ropes.' },
      { npc: 'Everything here is learned by doing. Chop, fish, mine, cook, smith, fight - every skill grows the more you use it.' },
      { npc: 'Follow the little guide panel at the top of your screen. When a step needs you somewhere, a flag appears on your minimap.' },
      { player: 'Sounds simple enough.' },
      { npc: 'It is! First, grab some logs: there are plenty of trees just west and south of town. Off you go.' },
    ];
  }
  if (st === 'active') {
    return [
      { npc: (ctx) => `How goes it? Your current task: ${(step?.title || 'keep exploring').toLowerCase()}.` },
      { npc: () => (T.stepText?.(step) ?? step?.text ?? '').replace(/<[^>]+>/g, '') },
      { options: [
        { text: 'Thanks, I will get to it.', end: true },
        { text: 'Show me where to go.', action: () => { T.point?.(); return false; } },
        { text: 'I know all this already. (Skip the tutorial)', action: () => { T.skip?.(); return false; } },
      ] },
    ];
  }
  return [
    { npc: st === 'done' ? 'Back again? You did splendidly in your lessons.' : 'Hello there! I teach newcomers the basics of life in the vale.' },
    { options: [
      { text: 'Any advice?', goto: 'tips' },
      { text: 'Could you walk me through the basics?', if: () => st !== 'active', action: () => { T?.start?.(true); return false; } },
      { text: 'Goodbye.', end: true },
    ] },
    { label: 'tips', npc: 'Bank often, eat before you are low on health, and always carry a tinderbox. Mira by the square has work for a willing pair of hands.' },
  ];
});
