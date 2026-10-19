// Wayfinder's Riddles (treasure-trail style riddle scrolls). OWNER: activities (clues).
// Items, casket rewards and the step pools. Runtime: src/systems/clues.js.
//
// Step types: riddle (cryptic text -> dig), coord (paces from Brackenford square -> dig), map (drawn map ->
// dig), emote (perform an emote inside a rect), talk (talk to an NPC), puzzle (hard: solve a sliding puzzle box).
// Dig spots / NPCs that are missing or unwalkable at runtime are dropped from the pools automatically.

import { registerItem, getItem, registerData } from '../core/registry.js';
import { registerIconShape } from '../ui/icons.js';

export const TIERS = ['easy', 'medium', 'hard'];
export const TIER_NAME = { easy: 'easy', medium: 'medium', hard: 'hard' };
export const TIER_COLOR = { easy: '#58b848', medium: '#3a8ad8', hard: '#c83a3a' };
/** Reference point for coordinate riddles (the heart of Brackenford square). */
export const ORIGIN = { x: 96, y: 141, name: "the heart of Brackenford's square" };

// ---- icons -------------------------------------------------------------------------------------
registerIconShape('casket', (ctx, color, color2) => {
  ctx.fillStyle = '#2a1a0a'; ctx.fillRect(6, 11, 24, 16);
  ctx.fillStyle = color || '#8a5a2a'; ctx.fillRect(7, 12, 22, 14);
  ctx.fillStyle = color2 || '#e8c040'; ctx.fillRect(7, 16, 22, 2); ctx.fillRect(16, 12, 4, 14);
  ctx.fillStyle = '#ffe890'; ctx.fillRect(17, 18, 2, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(8, 13, 20, 1);
});
registerIconShape('puzzlebox', (ctx, color) => {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    ctx.fillStyle = (i + j) % 2 ? '#3a2a1a' : (color || '#c8a060');
    if (!(i === 2 && j === 2)) ctx.fillRect(7 + i * 8, 5 + j * 8, 7, 7);
  }
});

// ---- scrolls, caskets, puzzle box -------------------------------------------------------------------
for (const t of TIERS) {
  registerItem({ id: `riddle_scroll_${t}`, name: `Riddle scroll (${t})`, examine: "A Wayfinder's riddle. Someone wants to be found... or something does.",
    value: 0, tradeable: false, options: ['Read'], riddleTier: t, icon: { shape: 'scroll', color: '#e8dcb0', color2: TIER_COLOR[t] } });
  registerItem({ id: `riddle_casket_${t}`, name: `Wayfinder's casket (${t})`, examine: 'Your reward for following the trail to its end.',
    value: 0, tradeable: false, options: ['Open'], riddleTier: t, icon: { shape: 'casket', color: '#7a4a1a', color2: TIER_COLOR[t] } });
}
registerItem({ id: 'riddle_puzzle_box', name: 'Puzzle box', examine: 'A box of sliding tiles. It will not open until the picture is whole.',
  value: 0, tradeable: false, options: ['Open'], icon: { shape: 'puzzlebox', color: '#c8a060' } });

// ---- cosmetic rewards ---------------------------------------------------------------------------------
const GOLD = '#e8c040';
/** Gilded copy of an existing metal piece (same stats, golden trim). */
function gilt(base) {
  const b = getItem(base);
  if (!b) return null;
  const { id, name, examine, model, ...rest } = b;
  return registerItem({ ...rest, id: `${base}_gilt`, name: `${name} (gilt)`, examine: `${examine} Edged in Wayfinder gold.`, riddleReward: true,
    model: { ...(model || {}), trim: GOLD }, icon: { ...(b.icon || {}), color2: GOLD } }).id;
}
const SET = ['full_helm', 'platebody', 'platelegs', 'kiteshield'];
const giltSet = (tier) => SET.map((p) => gilt(`${tier}_${p}`)).filter(Boolean);

const cos = (def) => registerItem({ value: 500, riddleReward: true, ...def }).id;
const hat = (id, name, examine, shape, color, trim, extra = {}) => cos({ id, name, examine, slot: 'head', bonuses: {}, color,
  icon: { shape: shape === 'wizard_hat' ? 'hat' : shape === 'full_helm' ? 'fullhelm' : shape === 'hood' ? 'hood' : 'helm', color, color2: trim }, model: { shape, color, trim, ...extra } });
const cape = (id, name, examine, c1, c2, extra = {}) => cos({ id, name, examine, slot: 'cape', bonuses: { defenceStab: 1, defenceSlash: 1, defenceCrush: 1 }, color: c1,
  icon: { shape: 'cape', color: c1, color2: c2 }, model: { color: c1, color2: c2, ...extra } });

export const REWARDS = {
  easy: {
    rolls: [2, 4],
    rare: [
      ...giltSet('bronze'), ...giltSet('iron'),
      hat('wayfarer_hat_brown', "Wayfarer's hat (brown)", 'A wide hat for long roads.', 'wizard_hat', '#7a5a3a', '#c8a060'),
      hat('wayfarer_hat_green', "Wayfarer's hat (green)", 'A wide hat for long roads.', 'wizard_hat', '#3a6a3a', '#c8a060'),
      hat('motley_hood', 'Motley hood', 'Bells not included.', 'hood', '#c83a3a', '#e8c040'),
      cape('rambler_cape_red', "Rambler's cape (red)", 'Dusty from a hundred roads.', '#a83a2a', '#e8c040'),
      cape('rambler_cape_blue', "Rambler's cape (blue)", 'Dusty from a hundred roads.', '#2a4a9a', '#e8c040'),
      cape('rambler_cape_green', "Rambler's cape (green)", 'Dusty from a hundred roads.', '#2a7a3a', '#e8c040'),
      'emote_scroll_jig',
    ],
    rareChance: 0.32,
    common: [['coins', [60, 400]], ['bread', [2, 5]], ['wind_sigil', [20, 60]], ['mind_sigil', [20, 50]], ['iron_arrow', [15, 40]], ['cooked_trout', [3, 6]]],
  },
  medium: {
    rolls: [3, 5],
    rare: [
      ...giltSet('steel'), ...giltSet('duskite'),
      hat('plumed_helm_red', 'Plumed helm (red)', 'Mostly feather, partly helm.', 'full_helm', '#a3abb4', '#e8c040', { crest: '#c83a3a' }),
      hat('plumed_helm_white', 'Plumed helm (white)', 'Mostly feather, partly helm.', 'full_helm', '#a3abb4', '#e8c040', { crest: '#f0f0f0' }),
      hat('starwatcher_hat', "Starwatcher's hat", 'Embroidered with constellations that do not quite exist.', 'wizard_hat', '#1a2a5a', '#e8c040', { glow: '#80c0ff' }),
      cape('pilgrim_cape', "Pilgrim's cape", 'Worn by those who walk to every shrine in Ashvale.', '#d8d0b8', '#8a5a2a'),
      cape('wayfinder_cape', "Wayfinder's cape", 'The badge of a Wayfinder in good standing.', '#2a5a5a', '#e8c040'),
      'emote_scroll_flourish',
    ],
    rareChance: 0.28,
    common: [['coins', [300, 2200]], ['fire_sigil', [30, 90]], ['thorn_sigil', [10, 30]], ['steel_bar', [2, 6]], ['cooked_trout', [5, 10]], ['steel_arrow', [20, 60]]],
  },
  hard: {
    rolls: [4, 6],
    rare: [
      ...giltSet('verdite'), ...giltSet('azurium'),
      hat('crown_of_riddles', 'Crown of riddles', 'Whoever wears it is said to never get lost. Whoever says it is usually lost.', 'med_helm', '#e8c040', '#ffffff', { glow: '#ffe080' }),
      hat('plumed_helm_gold', 'Plumed helm (gold)', 'A plume for a champion of the long road.', 'full_helm', '#e8c040', '#ffffff', { crest: '#e8c040' }),
      cape('wayfinder_mantle', "Wayfinder's mantle", 'Woven with a map of all Ashvale. The map is accurate. Mostly.', '#1a3a3a', '#e8c040', { glow: '#ffe080' }),
      cape('starweave_cape', 'Starweave cape', 'It glitters like the sky over Frostfang.', '#141a3a', '#c0d8ff', { glow: '#80c0ff' }),
      'emote_scroll_starfall',
    ],
    rareChance: 0.26,
    common: [['coins', [2000, 12000]], ['void_sigil', [20, 60]], ['aether_sigil', [10, 40]], ['ancient_coin', [1, 4]], ['azurium_bar', [1, 3]], ['verdite_bar', [2, 4]]],
    megaRare: [gilt('emberite_platebody'), gilt('emberite_full_helm')].filter(Boolean),
    megaChance: 1 / 60,
  },
};

// ---- step pools -----------------------------------------------------------------------------------------
// Dig spots: [id, x, y, riddle]. Used for riddle / coordinate / map steps of their tier.
export const DIGS = {
  easy: [
    ['bk_market', 96, 139, 'Where coin changes hands beneath an open sky, in the town where every road begins - dig where the stalls crowd closest.'],
    ['whisperstones', 70, 96, 'Stones that gossip in a ring, though not one of them can talk. Dig at the heart of their conversation.'],
    ['sentinel_hill', 108, 72, 'A lone hill keeps watch north of Brackenford. Dig upon its crown.'],
    ['kettle_step', 88, 122, 'Outside the inn whose kettle was never straight, dig where the regulars stagger out.'],
    ['churchyard', 119, 129, "Among Brackenford's honoured dead, in the shadow of the chapel, dig where the grass grows greenest."],
    ['windmill', 168, 145, "Great sails turn above Haverly's fields. Dig in their shadow."],
    ['mirrow_bridge', 146, 131, "Where planks reach out to the lake's island shrine, dig at the shore end."],
    ['outcrop', 101, 106, 'Copper and tin poke through the turf north of town. Dig where new miners swing their first pick.'],
    ['woodcutter', 52, 128, "Deep in Thornwood, an axeman keeps his cabin. Dig on his doorstep."],
    ['goblin_camp', 114, 156, 'Little green warriors squabble south-east of town. Dig in the middle of their camp.'],
  ],
  medium: [
    ['quarry', 44, 77, 'Greystone gives up its bones to the west. Dig in the belly of the quarry.'],
    ['hagstone', 16, 67, 'A crooked cottage in the far north-west, where something is always brewing. Dig in its garden.'],
    ['lumber_camp', 66, 60, "Thistledown's saws bite into the northern woods. Dig among the stacked timber."],
    ['ditchwatch', 101, 55, 'A lookout stares across the great ditch into the ash. Dig at its foot.'],
    ['fort_rowan', 15, 144, 'An old fort guards the western road. Dig in its yard.'],
    ['barrowfield', 16, 111, 'Old mounds in the west, where the dead sleep beneath the turf. Dig between them.'],
    ['morrows_rest', 62, 171, 'Graves look out over the southern shore, where a family tomb gapes open. Dig among the headstones.'],
    ['gullhaven', 172, 184, 'Three piers jut into the sea where gulls rule the roofs. Dig in the village square.'],
    ['highmarch_gate', 161, 105, 'Outside the walled town\'s southern gate, dig where travellers wait to be let in.'],
    ['dustwatch_well', 237, 153, 'An outpost of sun-baked walls keeps watch over the badlands. Dig beside its well.'],
    ['spire_door', 219, 125, 'A tower that counts the stars rises from the heath. Dig at its door.'],
    ['lantern_grove', 250, 119, 'Where elven lanterns hang from the boughs, dig at the heart of the grove.'],
  ],
  hard: [
    ['calder_obelisk', 96, 31, 'In the burnt fortress of the north, before the obelisk that drinks the ash - dig, if you dare the Wilderness.'],
    ['outlaw_camp', 40, 42, 'Outlaws make camp just beyond the ditch. Dig among their stolen goods.'],
    ['bloodstone', 128, 36, 'A ring of red stones stands in the ashen north. Dig at its centre.'],
    ['crows_glade', 214, 27, 'In a black wood beyond the ditch, the crows hold council in a glade. Dig where they roost.'],
    ['wrenhollow', 170, 40, 'Ruins named for a little bird lie broken in the eastern Wilderness. Dig among the rubble.'],
    ['thrush_isle', 80, 212, 'A small isle south of the swamp, reached by stepping stones. Dig at its heart.'],
    ['beacon_isle', 195, 206, 'A light that warns ships from the southern rocks. Dig at its base.'],
    ['sun_temple', 264, 189, 'The sand swallowed a temple to the sun. Dig before its sunken stair.'],
    ['silverfall', 281, 65, 'Where silver water falls at the eastern edge of the world, dig at the pool\'s edge.'],
    ['wreckers', 234, 194, 'Wreckers lure ships onto the eastern rocks. Dig beside the broken hull.'],
    ['moonwell', 265, 84, 'The elves keep a well that holds the moon. Dig beside it.'],
    ['sunwell', 270, 158, 'Palms and still water in the Sunscar. Dig by the southern palms.'],
  ],
};

// Emote steps: [id, emote, x0, y0, x1, y1, text]
export const EMOTE_STEPS = {
  easy: [
    ['market_cheer', 'cheer', 90, 135, 102, 146, "Raise a cheer where the stalls crowd in Brackenford's square."],
    ['altar_bow', 'bow', 107, 124, 115, 132, "Show your respect before Brackenford's altar."],
    ['kettle_dance', 'dance', 84, 113, 93, 120, 'Kick up your heels inside the Crooked Kettle.'],
    ['goblin_laugh', 'laugh', 107, 149, 121, 163, 'Mock the little green warriors in their own camp.'],
    ['shrine_wave', 'wave', 142, 114, 150, 122, 'Greet the lake from its island shrine.'],
    ['churchyard_cry', 'cry', 116, 123, 123, 135, "Weep among the graves beside Brackenford's chapel."],
  ],
  medium: [
    ['barracks_salute', 'salute', 175, 78, 182, 92, "Salute the soldiers in Highmarch's barracks."],
    ['tankard_clap', 'clap', 141, 93, 149, 100, 'Applaud the minstrels of the Gilded Tankard.'],
    ['spire_think', 'think', 213, 116, 225, 128, 'Ponder the stars at the foot of the counting tower.'],
    ['windmill_jump', 'jump', 164, 138, 172, 146, 'Leap for joy beneath the Haverly sails.'],
    ['hall_beckon', 'beckon', 206, 60, 218, 68, 'Beckon the dwarves to their own feast, in the Great Hall of the mountain.'],
    ['dustwatch_shrug', 'shrug', 228, 146, 250, 166, 'Shrug at the endless sand inside the outpost walls.'],
  ],
  hard: [
    ['calder_panic', 'panic', 84, 16, 108, 40, 'Panic in the burnt fortress of the north. It will not take much acting.'],
    ['warcamp_angry', 'angry', 29, 116, 43, 130, "Rage at the goblin warlord's palisade, west of the woods."],
    ['moonwell_dance', 'dance', 259, 75, 271, 87, 'Dance beside the elves\' moon-filled well.'],
    ['cinder_yes', 'yes', 60, 8, 86, 28, 'Nod in agreement with the fires of the Cinder Pits.'],
    ['bloodstone_no', 'no', 123, 31, 133, 41, 'Refuse the red stones of the ashen north.'],
    ['palemoon_bow', 'bow', 144, 0, 156, 9, 'Bow at the shrine where the pale moon is worshipped, high in the frozen peaks.'],
  ],
};

// Talk steps: [npcId, riddle, reply]
export const TALK_STEPS = {
  easy: [
    ['town_guide', 'Seek the one who points every newcomer the right way.', 'Lost? No - a riddle! Here, this was left for whoever came asking.'],
    ['baker_wenna', 'Ask the one whose ovens are lit before the sun is up.', 'A riddle-hunter! Mind the flour. This came baked into a loaf, believe it or not.'],
    ['fisher_tobin', 'An old angler sells his tackle in town. He kept your next clue dry.', 'Fished this out of the river this morning. Reckon it\'s yours.'],
    ['bard_lyle', 'The town\'s songsmith will hum you the next verse.', '*strums* ...and the riddle goes on, la la la. Here, take it.'],
    ['old_fennick', 'He has lived in Brackenford longer than the well. Ask him.', 'Ah, the Wayfinders. Haven\'t seen one of their scrolls in years. Off you go.'],
    ['brother_aldous', 'A quiet brother of the chapel keeps secrets for a living.', 'Bless you, traveller. I was asked to keep this until you came.'],
    ['drunk_harlan', 'He sways even when the wind is still. He has something for you.', 'Shhh! *hic* It\'s a SECRET. Here. Don\'t tell anyone. *hic*'],
    ['herbalist_maeve', 'She grinds leaves into cures. She has ground out your next clue.', 'This was wrapped around a bundle of sagewort. Odd sort of customer.'],
    ['mage_orrin', 'A seller of sigils who funds strange research.', 'Fascinating... the ink is warded. Take it before it starts humming again.'],
  ],
  medium: [
    ['slayer_master_hollis', "Highmarch's monster-hunter hands out more than tasks.", 'Not the task you expected, eh? Here. Hunt this down instead.'],
    ['highmarch_smith', 'The finest smith in the walled town - so he says. Ask him.', 'Found this in a crate of ingots. Not my problem now.'],
    ['highmarch_mage', 'The keeper of the walled town\'s arcane stores has filed your clue.', 'Catalogued, indexed, and now... dispatched. Good luck.'],
    ['highmarch_grocer', 'A grocer with strong opinions about cheese has your next clue.', 'It was under the cheddar. Everything important is under the cheddar.'],
    ['lady_corvina', 'A noblewoman of the walled town looks you up and down. Endure it.', 'A Wayfinder? How quaint. Take your little note and go.'],
    ['scholar_bede', 'A scholar who reads while he walks. Bold.', 'Hm? Oh! Yes, this. Footnote seven. Off you go.'],
    ['haverly_supplier', 'She runs the seed and tool shed on the farms.', 'Came in with a sack of seeds. Smelt of adventure. Yours, I think.'],
    ['dockhand_moira', 'A dockhand with arms like ship ropes.', 'Washed up with the tide. I don\'t read. You do.'],
  ],
  hard: [
    ['ranger_kestrel', 'A ranger watches the Wilderness border from the south side of the ditch.', 'I took this off a wolf. Don\'t ask. The trail leads north, I fear.'],
    ['bandit_fence', 'A fence who asks no questions waits beyond the ditch.', 'No charge. Someone already paid. Generously. Now go away.'],
    ['slayer_master_hollis', "Highmarch's monster-hunter has the hardest tasks of all.", 'This one is worse than any wyrm. Off with you.'],
    ['petkeeper_odessa', 'She keeps the lost little ones of Ashvale.', 'One of my pets coughed this up. Charming. Take it.'],
  ],
};

export const STEP_COUNT = { easy: [2, 3], medium: [3, 4], hard: [4, 6] };
export const STEP_WEIGHTS = {
  easy: { riddle: 3, emote: 2, talk: 2, map: 1, coord: 1 },
  medium: { riddle: 3, emote: 2, talk: 2, map: 2, coord: 2 },
  hard: { riddle: 3, emote: 2, talk: 1, map: 2, coord: 2, puzzle: 1 },
};

/** Drop rates by monster combat level (rolled on kills credited to the local player). */
export const DROP_RATES = [
  { tier: 'easy', min: 2, max: 45, chance: 1 / 64 },
  { tier: 'medium', min: 30, max: 110, chance: 1 / 110 },
  { tier: 'hard', min: 80, max: 9999, chance: 1 / 160 },
];
export const BOSS_HARD_CHANCE = 1 / 25;

registerData('riddles', 'config', { TIERS, REWARDS, DIGS, EMOTE_STEPS, TALK_STEPS });
