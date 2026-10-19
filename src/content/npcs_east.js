// People and services of the eastern lands and the coast. OWNER: content designer (east). Imported by npcs.js.
//   * bankers for Durnhold, Ilvaren, Dustwatch, Gullhaven and Bogwick
//   * shopkeepers (shops in shops_east.js) and 20+ named townsfolk with rumours / quest hints
//   * Gullhaven ferry (Beacon Isle, Bogwick, Thrush Isle, Wreckers' Cove) - free after "The Brinecoil"
//   * desert heat in the Sunscar Badlands (waterskins, desert robes), drinkable ales
//   * eight eastern lore books (Search the marked bookshelves; finding all of them is an achievement)
//   * a working furnace + anvil in Durnhold's Forge Hall
// Quest NPCs live with their quests in quests_east.js / quests_east2.js.

import { registerNpc, registerDialogue, registerObject, registerSpawn, getItem } from '../core/registry.js';
import { hook, give, has, take, done } from './quest_util.js';

const npcAt = (id, x, y, wander = 2) => registerSpawn({ type: 'npc', id, x, y, wander });
const objAt = (id, x, y, rot = 0) => registerSpawn({ type: 'object', id, x, y, rot });
const openShop = ({ game, npc }) => { game.ui.openShop(npc.def.shop); return false; };

// Looks
const DWARF = (colors, extra = {}) => ({ template: 'human', scale: 0.78, colors: { skin: '#d8a07a', ...colors }, extras: { beard: true, nose: 0.05 }, proportions: { legLen: 0.4, torsoW: 0.62 }, equipment: {}, ...extra });
const DWARFESS = (colors, extra = {}) => ({ template: 'human', scale: 0.78, female: true, hairStyle: 'long', colors: { skin: '#d8a07a', ...colors }, proportions: { legLen: 0.4, torsoW: 0.6 }, equipment: {}, ...extra });
const ELF = (colors, extra = {}) => ({ template: 'human', scale: 1.06, colors: { skin: '#f0dcc8', ...colors }, extras: { ears: true }, equipment: {}, ...extra });
const ELFESS = (colors, extra = {}) => ({ template: 'human', scale: 1.04, female: true, hairStyle: 'long', colors: { skin: '#f0dcc8', ...colors }, extras: { ears: true }, equipment: {}, ...extra });
const FOLK = (colors, extra = {}) => ({ template: 'human', colors, equipment: {}, ...extra });

// =================================================================================================
// Bankers
// =================================================================================================
registerNpc({ id: 'banker_dwarf', name: 'Vault-keeper', examine: 'A dwarf who guards the Durnhold vaults. He has counted every coin twice.', options: ['Talk-to', 'Bank'], dialogue: 'banker', wanderRadius: 0,
  model: DWARF({ top: '#2a3a6a', legs: '#2a2a3a', hair: '#8a4a1a' }, { equipment: { neck: { shape: 'amulet', color: '#e8c040' } } }), mapIcon: { char: '$', color: '#e8c040' } });
registerNpc({ id: 'banker_elf', name: 'Treasurer', examine: 'An elven treasurer. Her ledgers are written in silver ink.', options: ['Talk-to', 'Bank'], dialogue: 'banker', wanderRadius: 0,
  model: ELFESS({ top: '#2a5a6a', legs: '#2a3a4a', hair: '#e8e0c0' }, { equipment: { neck: { shape: 'amulet', color: '#d8dce4' } } }), mapIcon: { char: '$', color: '#e8c040' } });
registerNpc({ id: 'banker_east', name: 'Banker', examine: 'A Bank of Ashvale clerk posted far from home.', options: ['Talk-to', 'Bank'], dialogue: 'banker', wanderRadius: 0,
  model: FOLK({ top: '#2a3a6a', legs: '#2a2a3a', hair: '#3a2a1a' }, { equipment: { neck: { shape: 'amulet', color: '#e8c040' } } }), mapIcon: { char: '$', color: '#e8c040' } });
npcAt('banker_dwarf', 215, 66, 0);       // Durnhold, Great Hall
npcAt('banker_elf', 264, 71, 0);         // Ilvaren, Hall of Leaves
npcAt('banker_east', 245, 151, 0);       // Dustwatch, trading post
npcAt('banker_east', 171, 183, 0);       // Gullhaven, the Salty Gull
npcAt('banker_east', 100, 193, 0);       // Bogwick, the Sunken Boot

// =================================================================================================
// Shopkeepers
// =================================================================================================
const keeper = (id, name, examine, shop, model, icon, dialogue) => registerNpc({ id, name, examine, options: ['Talk-to', 'Trade'], shop, dialogue, wanderRadius: 1, model, mapIcon: icon });
const shopTalk = (id, intro, chat, reply) => registerDialogue(id, [
  { npc: intro },
  { options: [
    { text: 'Let me see what you have.', action: openShop },
    { text: 'Tell me about yourself.', goto: 'chat' },
    { text: 'Goodbye.', end: true },
  ] },
  { label: 'chat', npc: chat },
  ...(reply ? [{ player: reply }] : []),
  { options: [{ text: "Let's trade.", action: openShop }, { text: 'Goodbye.', end: true }] },
]);

keeper('durn_smith_torvik', 'Torvik Hammerhand', 'A dwarven smith with forearms like anvils.', 'durnhold_smithy',
  DWARF({ top: '#4a3020', legs: '#2a2a2a', hair: '#2a1a10' }, { equipment: { weapon: 'duskite_warhammer', body: { shape: 'chainbody', color: '#3a2a20' } } }), { char: 'A', color: '#c0c0c8' }, 'torvik');
keeper('durn_prospector_gilda', 'Gilda Deepdelve', 'A prospector with a lamp on her helmet and rock dust in her braids.', 'durnhold_mining',
  DWARFESS({ top: '#6a5a3a', legs: '#3a3a3a', hair: '#c86a2a' }, { equipment: { weapon: 'steel_pickaxe', head: { shape: 'med_helm', color: '#c8a040' } } }), { char: 'P', color: '#c8a040' }, 'gilda');
keeper('stonemug_hedda', 'Hedda Stonemug', 'Landlady of the Stonemug. Her stout is legendary; so is her temper.', 'durnhold_tavern',
  DWARFESS({ top: '#8a3a2a', legs: '#4a3a2a', hair: '#e8c070' }), { char: 'T', color: '#f0a040' }, 'hedda');
keeper('ilv_fletcher_aelindra', 'Aelindra', 'An elven bowyer. She strings a bow without looking.', 'ilvaren_bows',
  ELFESS({ top: '#3a6a3a', legs: '#4a3a2a', hair: '#d8c070' }, { equipment: { weapon: { shape: 'bow', color: '#c8c0a0' }, cape: 'cape_green' } }), { char: 'R', color: '#80c060' }, 'aelindra');
keeper('ilv_weaver_thalion', 'Thalion', 'A robe-weaver. Leaves are stitched into every hem.', 'ilvaren_robes',
  ELF({ top: '#2a6a5a', legs: '#2a4a4a', hair: '#e8e8e0' }, { equipment: { body: 'conjurer_robe_top', legs: 'conjurer_robe_bottom', weapon: 'adept_wand' } }), { char: 'M', color: '#80a0ff' }, 'thalion');
keeper('ilv_herbalist_lirien', 'Lirien', 'An elven apothecary with green-stained fingers.', 'ilvaren_herbs',
  ELFESS({ top: '#4a7a3a', legs: '#3a4a2a', hair: '#6a3a1a' }), { char: 'H', color: '#60d060' }, 'lirien');
keeper('ilv_jeweller_caelis', 'Caelis', 'A gemcutter who squints at everything, including you.', 'ilvaren_jewels',
  ELF({ top: '#4a3a6a', legs: '#2a2a3a', hair: '#1a1a2a' }, { equipment: { neck: { shape: 'amulet', color: '#a0c8ff' } } }), { char: 'J', color: '#d080c0' }, 'caelis');
keeper('dust_trader_sabah', 'Sabah', 'Runs the Dustwatch trading post. Sells water at prices that make you thirstier.', 'dustwatch_trading',
  FOLK({ top: '#c8a060', legs: '#8a6a3a', hair: '#1a1a1a', skin: '#a8724a' }, { female: true, hairStyle: 'long', equipment: { head: { shape: 'hood', color: '#e8dcc0' } } }), { char: 'G', color: '#e8c040' }, 'sabah');
keeper('gull_fishmonger_dorrie', 'Dorrie', 'A fishmonger with a voice that carries to Beacon Isle.', 'gullhaven_fish',
  FOLK({ top: '#3a5a6a', legs: '#4a4a3a', hair: '#a85a2a' }, { female: true }), { char: 'F', color: '#60a0e0' }, 'dorrie');
keeper('gull_chandler_bastian', 'Bastian', 'The Gullhaven chandler. Ropes, nets, oil - if a boat needs it, he has it.', 'gullhaven_chandlery',
  FOLK({ top: '#5a4a3a', legs: '#3a3a3a', hair: '#8a8a7a' }, { extras: { beard: true } }), { char: '$', color: '#60a0e0' }, 'bastian');
keeper('gull_barkeep_marla', 'Marla', 'Keeps the Salty Gull afloat, mostly with fish pie.', 'gullhaven_tavern',
  FOLK({ top: '#6a2a3a', legs: '#3a2a2a', hair: '#2a1a10' }, { female: true, hairStyle: 'long' }), { char: 'T', color: '#f0a040' }, 'marla');
keeper('bog_gobbet', 'Gobbet Pike', 'Landlord of the Sunken Boot. One boot, as it happens.', 'bogwick_tavern',
  FOLK({ top: '#4a5a3a', legs: '#3a3a2a', hair: '#5a3a1a' }, { extras: { beard: true, nose: 0.06 } }), { char: 'T', color: '#f0a040' }, 'gobbet');

shopTalk('torvik', 'Steel, duskite, verdite - and azurium for them as can afford it. What do you need?', 'Forty years at the anvil. The Forge Hall\'s great hearth went cold this spring, mind. Forgemaster Brunna is beside herself.', 'Maybe I can help her.');
shopTalk('gilda', 'Picks, coal, ore, and stonebread to keep you going. Mind the Deep Seams - they\'re deeper than they look.', 'I\'ve dug every seam in the Greyspine. All but Hollowpick. The Thane closed it after the singing started.', 'Singing?');
shopTalk('hedda', 'Welcome to the Stonemug! Sit, drink, don\'t touch the beer you haven\'t paid for.', 'My family has poured stout in this hall for nine generations. The tenth will be my nephew, gods help us.');
shopTalk('aelindra', 'Silverstring bows, the finest that ever left the Faelwood.', 'A good bow is grown, not made. I only finish what the tree started.');
shopTalk('thalion', 'Robes woven with intent, staves carved with patience.', 'Each robe holds a little of the moonlight from the well. Or it did, before the well went bitter.', 'The well went bitter?');
shopTalk('lirien', 'Herbs, secondaries, vials. Please do not lick anything.', 'I learnt my trade beside the Moonwell. Its water made every potion sweeter... until lately.');
shopTalk('caelis', 'Gems cut true, metal worked fine. Mind the counter, it is older than your kingdom.', 'A moonstone remembers every hand that has held it. That is why I wear gloves.');
shopTalk('sabah', 'Water, robes, dates. Out there the sun kills more fools than scorpions do.', 'Dustwatch only exists because of the old well. No water, no outpost. No outpost, no prices like mine.', 'Your prices are robbery.');
shopTalk('dorrie', 'FRESH FISH! Oh - sorry, love, habit. What can I get you?', 'Our boats used to come back full. Now half of them come back with torn nets, and some don\'t come back at all.');
shopTalk('bastian', 'Nets, rods, oil and odds and ends. If it floats or catches, I sell it.', 'Old Agnes buys her lamp oil from me. Or did - she hasn\'t been in for a while.');
shopTalk('marla', 'Pull up a stool. The pie is fish, the stew is fish, the bread is... mostly bread.', 'The Salty Gull has stood here two hundred years. The roof has stood here about six.');
// (Gobbet's dialogue lives in quests_east2.js - he is a witness in Trial by Bog)

for (const [id, x, y] of [['durn_smith_torvik', 204, 86], ['durn_prospector_gilda', 213, 73], ['stonemug_hedda', 221, 86],
  ['ilv_fletcher_aelindra', 257, 82], ['ilv_weaver_thalion', 271, 80], ['ilv_herbalist_lirien', 261, 89], ['ilv_jeweller_caelis', 273, 84],
  ['dust_trader_sabah', 243, 149], ['gull_fishmonger_dorrie', 179, 180], ['gull_chandler_bastian', 183, 186], ['gull_barkeep_marla', 170, 180],
  ['bog_gobbet', 103, 193]]) npcAt(id, x, y, 1);

// Durnhold Forge Hall: a working furnace and anvil (the great anvil and hearth are scenery/quest objects)
objAt('furnace', 202, 84);
objAt('anvil', 205, 88);

// =================================================================================================
// Townsfolk (rumours, hints and a little colour)
// =================================================================================================
const folk = (id, name, examine, model, x, y, lines, wander = 3) => {
  registerNpc({ id, name, examine, options: ['Talk-to'], dialogue: id, wanderRadius: wander, model });
  npcAt(id, x, y, wander);
  registerDialogue(id, lines);
};
/** A "rumour" dialogue: greeting, then a small menu of topics, every branch ends cleanly. */
const chat = (greet, topics) => [
  { npc: greet },
  { label: 'menu', options: [...topics.map((t, i) => ({ text: t[0], goto: `t${i}` })), { text: 'Goodbye.', end: true }] },
  ...topics.flatMap((t, i) => {
    const lines = Array.isArray(t[1]) ? t[1] : [t[1]];
    return lines.map((l, k) => ({ ...(k === 0 ? { label: `t${i}` } : {}), npc: l, ...(k === lines.length - 1 ? { goto: 'menu' } : {}) }));
  }),
];

// ---- Durnhold ------------------------------------------------------------------------------------
folk('dwarf_grimbold', 'Old Grimbold', 'A retired miner with one eyebrow singed off.', DWARF({ top: '#5a5040', legs: '#3a3428', hair: '#d8d8d0' }, { equipment: { weapon: { shape: 'pickaxe', color: '#6a6a6a' } } }), 220, 78,
  chat('Eh? Another surface-walker. Mind the carts.', [
    ['What happened at Hollowpick?', ['We dug too deep and too warm. The rock got hot to the touch, then the seam started... singing. Low, like breath through a bellows.', 'The Thane shut it. I told them it was the wind. There is no wind down there. I knew that. I said it anyway.']],
    ['Any advice for a miner?', 'Duskite and verdite in the Deep Seams, if your arms are up to it. Gilda sells picks. And never, ever mine a rock that hums.'],
  ]));
folk('dwarf_ysra', 'Shieldmaiden Ysra', 'Captain of the Durn Arch watch.', DWARFESS({ top: '#5a5a62', legs: '#3a3a42', hair: '#8a2a1a' }, { equipment: { body: 'steel_platebody', shield: 'steel_kiteshield', weapon: 'steel_warhammer' } }), 203, 77,
  chat('Halt and be welcome, in that order.', [
    ['What lies north of the hold?', 'The Frostgate Path. It climbs straight into the Wilderness. We guard this side; nobody guards the other.'],
    ['Who rules Durnhold?', 'Thane Hargrim Ironvein, in the Great Hall. He has been brooding lately. Something about the mountain.'],
    ['Where can I bank?', 'The vault-keeper sits in the Great Hall. Dwarven vaults - nothing gets out of them, not even interest.'],
  ]), 1);
folk('dwarf_orvar', 'Skald Orvar', 'A dwarven skald with a voice like a rockslide.', DWARF({ top: '#2a4a6a', legs: '#2a2a3a', hair: '#e8a040' }, { equipment: { cape: 'cape_blue' } }), 217, 88,
  chat('Ah! An audience! Shall I sing of the Under-King?', [
    ['Who is the Under-King?', ['Before the hold, before the hammer, a wyrm slept under the Greyspine with fire for blood. The first dwarves drank its heat to light their forges.', 'The song says the sun-priests of the south set a great eye to watch it, and the elves sang it to sleep. Pretty song. Nobody believes it.']],
    ['Sing something cheerful.', 'Ninety-nine kegs on the Stonemug wall, ninety-nine kegs of stout... no? Philistine.'],
  ]), 2);
folk('dwarf_brisk', 'Brisk', 'A dwarf child with a wooden pickaxe and enormous ambitions.', DWARF({ top: '#c86a2a', legs: '#4a4a6a', hair: '#7a4a1a' }, { scale: 0.55, extras: { beard: false } }), 209, 79,
  chat('I\'m going to be a forgemaster! Like Brunna! Only taller.', [
    ['What does a forgemaster do?', 'Keeps the great hearth burning! Only it went out, and Brunna shouted so loud the bats left.'],
    ['Seen anything interesting?', 'Old Grimbold says the mountain is breathing. I put my ear to the floor and it went "whumm". I think it was my tummy.'],
  ]), 4);

// ---- Ilvaren ------------------------------------------------------------------------------------
folk('elf_ithiel', 'Lantern-keeper Ithiel', 'He tends the glowing grove to the south.', ELF({ top: '#2a4a5a', legs: '#2a3a3a', hair: '#c8d8e8' }, { equipment: { weapon: { shape: 'staff', color: '#a0e8ff' } } }), 262, 96,
  chat('The lanterns are lit and the grove is quiet. Good evening, traveller.', [
    ['What is the Lantern Grove?', 'A ring of glowing mushrooms south-west of the town, where the wisps dance. Dewcap blooms open there at night - the moonwardens gather their dew.'],
    ['Any advice?', 'Wolves on the southern road, bears to the north. And if a wisp offers to show you the way - politely decline.'],
  ]), 2);
folk('elf_nim', 'Nim', 'An elf child chasing a butterfly with great determination.', ELF({ top: '#6aa04a', legs: '#4a5a3a', hair: '#e8d080' }, { scale: 0.62 }), 268, 88,
  chat('Shh! I nearly had it! An azure flutterwing!', [
    ['Where do flutterwings live?', 'All over the Faelwood. You need a net and a jar. And patience. I have a net.'],
    ['Why is everyone so sad?', 'The Moonwell stopped singing. Moonwarden Sylvaine sits by it all day. I brought her a flower but it didn\'t help.'],
  ]), 5);
folk('elf_caradh', 'Sentinel Caradh', 'An elven sentinel, bow strung, eyes on the treeline.', ELF({ top: '#3a5a3a', legs: '#2a3a2a', hair: '#1a1a1a' }, { equipment: { weapon: { shape: 'bow', color: '#c8c0a0' }, head: { shape: 'hood', color: '#3a5a3a' }, cape: 'cape_green' } }), 256, 78,
  chat('Peace, stranger. Ilvaren welcomes those who come by the road.', [
    ['Where does the road go?', 'West to Durnhold and the Greyspine passes. South past the Lantern Grove to Bramblemoor and the Starcaller\'s Spire.'],
    ['Seen anything strange?', 'Smoke over the Greyspine at night, where no dwarf would light a fire. And the stars are wrong. Ask the Starcaller - he will talk until dawn.'],
  ]), 1);
folk('elf_velenor', 'Velenor the poet', 'A poet. He has been searching for a rhyme for "moonwell" for nine years.', ELF({ top: '#6a2a6a', legs: '#3a2a4a', hair: '#a0a0b0' }), 268, 94,
  chat('Moonwell... moon-dwell... soon-swell... oh, hello.', [
    ['Recite something.', '"The well beneath the silver sky / remembers every passer-by; / it sang when first the moon rose full, / and wept when..." I have not finished it. The well has not either.'],
    ['Any tales of the Archive?', 'Loremaster Faelith keeps books older than the Faelwood. She lets you read them if you ask nicely and do not breathe on them.'],
  ]), 2);
folk('elf_olwen', 'Olwen', 'A gardener caring for the Eldertree.', ELFESS({ top: '#5a7a3a', legs: '#4a3a2a', hair: '#c88a3a' }), 276, 81,
  chat('The Eldertree is older than the town. We are only its guests.', [
    ['What grows in the Faelwood?', 'Silverleaf and goldleaf trees, starwood if you know where to look, and herbs along every stream.'],
    ['Where is Silverfall?', 'North-east, where the stream drops off the cliffs. Lovely to paint, terrible to fall down.'],
  ]), 2);

// ---- Dustwatch ----------------------------------------------------------------------------------
folk('commander_raske', 'Commander Raske', 'The commander of Dustwatch. Sunburnt, short-tempered and very good at both.', FOLK({ top: '#8a5a2a', legs: '#4a3a2a', hair: '#8a8a8a', skin: '#c8865a' }, { extras: { beard: true }, equipment: { body: 'steel_chainbody', weapon: 'steel_scimitar', head: { shape: 'hood', color: '#e8dcc0' } } }), 233, 151,
  chat('If you are here to complain about the water prices, take it up with the sun.', [
    ['Any advice for the badlands?', ['Carry water. Wear pale cloth. The heat out there takes a little life from you every few breaths, and it never gets tired.', 'The well here and the Sunwell oasis to the east are the only sweet water for miles. Sabah sells waterskins at the trading post.']],
    ['What is the old temple to the south?', 'The Sandswallowed Temple. Sun-priests built it, the desert ate it. An excavator called Tamsin Reed is camped at its gate. Brave woman. Possibly mad.'],
    ['What about Wreckers\' Cove?', 'Corsairs. Captain Brinehook\'s lot. They raid the coast and hide in the wreck. Do not go alone.'],
  ]), 1);
folk('dust_hollin', 'Prospector Hollin Dray', 'He is sure the next canyon is the one with the gold.', FOLK({ top: '#8a7a5a', legs: '#5a4a3a', hair: '#c8c8b0', skin: '#c8865a' }, { extras: { beard: true }, equipment: { weapon: 'iron_pickaxe' } }), 236, 159,
  chat('Gold, friend! There\'s gold in them canyons! Probably!', [
    ['What is in Scorchgulch?', 'Glarehorn lizards the size of carts, bones, and a broken wagon that used to be mine. The gold I am still looking for.'],
    ['Any tips?', 'Do not dig at noon. Do not dig near anything with a horn. Do not dig in the temple - Tamsin gets very cross.'],
  ]), 3);
folk('dust_amara', 'Scout Amara', 'A scout fresh back from the southern dunes.', FOLK({ top: '#c8a060', legs: '#6a4a2a', hair: '#2a1a10', skin: '#9a6a4a' }, { female: true, hairStyle: 'long', equipment: { weapon: { shape: 'bow', color: '#8a5a2a' }, head: { shape: 'hood', color: '#c8a060' } } }), 239, 163,
  chat('Back from the dunes. Still have all my fingers. Good day.', [
    ['What did you see?', 'Corsair smoke at Wreckers\' Cove, scorpions everywhere, and lights moving inside the temple at night. Tamsin swears it is not her.'],
    ['How do I get to the coast?', 'Follow the road south from the gate. Or take a boat from Gullhaven - the ferryman there will drop you at the cove if you are foolish enough to ask.'],
  ]), 2);
folk('dust_ma_kettridge', 'Ma Kettridge', 'The outpost cook. She has fed soldiers, smugglers and once a very polite scorpion.', FOLK({ top: '#e8e0d0', legs: '#6a4a3a', hair: '#a8a8a0', skin: '#c8865a' }, { female: true }), 234, 161,
  chat('Hungry? Course you are. Nobody comes to Dustwatch for the view.', [
    ['What is cooking?', 'Lizard stew. Do not ask which lizard.'],
    ['How do you survive the heat?', 'A waterskin on my hip and a wet cloth on my head. When the skin runs dry, I go back to the well. Simple.'],
  ]), 2);

// ---- Gullhaven & Beacon Isle ------------------------------------------------------------------------
folk('gull_tarrow', 'Old Tarrow', 'A retired sailor. Most of his stories are true. Some of them twice.', FOLK({ top: '#2a3a5a', legs: '#2a2a3a', hair: '#e0e0e0' }, { extras: { beard: true }, equipment: { head: { shape: 'hood', color: '#2a3a5a' } } }), 173, 183,
  chat('Sit down, sit down. Did I ever tell you about the serpent?', [
    ['The serpent?', ['Brinecoil, we called it. Long as three boats, scales like wet slate. It came every thirty years, my grandfather said, and tore every net from here to Beacon Isle.', 'It is back. I have seen the water churn off the east pier. Brannoc the harbourmaster will not listen to an old man.']],
    ['What is Beacon Isle?', 'The lighthouse rock. Old Agnes keeps the light. Walk the stones off the east pier at low tide.'],
  ]), 1);
folk('gull_finch', 'Finch', 'A boy with a spyglass made from a rolled-up map.', FOLK({ top: '#c8a040', legs: '#3a4a6a', hair: '#c86a2a' }, { scale: 0.68 }), 168, 187,
  chat('I\'m going to be a lighthouse keeper when I grow up!', [
    ['Why a keeper?', 'You get a tower AND a fire AND you can see everything! Agnes says it is mostly polishing. I do not believe her.'],
    ['Seen anything out to sea?', 'The light on Beacon Isle has been flickering. And last night something big went under the pier. Mum says it was a seal. Seals do not have spines.'],
  ]), 4);

// ---- Bogwick & Thrush Isle -----------------------------------------------------------------------
folk('bog_granny_sedge', 'Granny Sedge', 'Bogwick\'s oldest eel-wife. She has outlived three husbands and nine boats.', FOLK({ top: '#4a5a3a', legs: '#3a3a2a', hair: '#d8d8d0' }, { female: true, hairStyle: 'long', equipment: { weapon: { shape: 'staff', color: '#5a4a2a' } } }), 90, 190,
  chat('Mind your feet, dearie. The boards bite.', [
    ['How are the eels?', 'Sick! Pale as milk and floating belly-up. Sixty years I have fished this bog and never seen the like.'],
    ['Tell me about Thrush Isle.', 'Little isle off the jetty - follow the stepping stones. Songbirds go there to sing their last songs. A hermit feeds them crumbs.'],
  ]), 3);
folk('bog_dob', 'Duckweed Dob', 'A Bogwick fisherman. Green to the knees, and proud of it.', FOLK({ top: '#5a6a4a', legs: '#4a5a3a', hair: '#6a4a2a', boots: '#3a4a2a' }, { extras: { nose: 0.05 } }), 96, 197,
  chat('Afternoon. Fish aren\'t biting. Nothing is, except the midges.', [
    ['What is wrong with the water?', 'Tastes bitter, smells like lamp oil and sour roots. Started a fortnight back - same time that pedlar with the green hat turned up, now I think of it.'],
    ['Where can I get a drink?', 'The Sunken Boot, east side. Gobbet pours a fine moss cider and a terrible ale.'],
  ]), 2);
folk('thrush_linnet', 'Brother Linnet', 'A hermit who talks to birds. Some of them seem to answer.', FOLK({ top: '#6a5a3a', legs: '#6a5a3a' }, { hairStyle: 'bald', extras: { beard: true }, equipment: { body: { shape: 'robe_top', color: '#6a5a3a' }, legs: { shape: 'robe', color: '#6a5a3a' } } }), 82, 213,
  chat('Peace, friend. Mind the thrushes; they are busy.', [
    ['Why do the birds come here?', 'To sing their last song where someone will hear it. Leave a crumb. They like crumbs, and so do I.'],
    ['How do I leave the isle?', 'Back over the stepping stones to Bogwick, or wave down the Gullhaven ferry at the landing on the west shore.'],
  ]), 2);

// =================================================================================================
// Gullhaven ferry
// =================================================================================================
const FERRY = {
  gullhaven: { name: 'Gullhaven (middle pier)', x: 177, y: 196, npc: [177, 197] },
  beacon: { name: 'Beacon Isle', x: 194, y: 207, npc: [193, 207] },
  bogwick: { name: 'Bogwick jetty', x: 96, y: 204, npc: [96, 205] },
  thrush: { name: 'Thrush Isle', x: 76, y: 209, npc: [75, 209] },
  cove: { name: "Wreckers' Cove", x: 222, y: 198, npc: [221, 197] },
};
const FARE = { gullhaven: 15, beacon: 10, bogwick: 30, thrush: 40, cove: 45 };
const freeFerry = (game) => done(game, 'brinecoil');
export function ferryTravel(game, key) {
  const d = FERRY[key];
  const p = game.player;
  const fare = freeFerry(game) ? 0 : FARE[key];
  if (fare && !p.inventory.has('coins', fare)) { game.message(`You need ${fare} coins for the crossing.`); return false; }
  if (fare) p.inventory.remove('coins', fare);
  game.ui.closeInterfaces();
  game.actions.lock(p, 4);
  game.message(fare ? `You pay ${fare} coins and climb into the boat...` : 'The ferryman waves away your coins. "Serpent-slayers ride free."');
  game.spawnEffect('splash', p, {});
  game.schedule(3, () => {
    if (p.dead) return;
    game.teleport(p, d.x, d.y);
    game.message(`The boat bumps gently against the landing at ${d.name}.`);
  });
  return true;
}
for (const [key, d] of Object.entries(FERRY)) {
  const id = `ferry_${key}`;
  registerNpc({ id, name: key === 'gullhaven' ? 'Ferryman Cobb' : 'Boatman', examine: key === 'gullhaven' ? 'Ferryman Cobb. He has rowed these waters for thirty years and complained for all of them.' : 'One of Cobb\'s boatmen, waiting with a rowboat.',
    options: ['Talk-to', 'Travel'], dialogue: id, wanderRadius: 0, mapIcon: { char: 'B', color: '#60a0e0' },
    model: FOLK({ top: '#3a5a6a', legs: '#3a3a2a', hair: key === 'gullhaven' ? '#c8c8c0' : '#5a3a1a' }, { extras: { beard: key === 'gullhaven' }, equipment: { head: { shape: 'hood', color: '#c8a050' } } }) });
  npcAt(id, d.npc[0], d.npc[1], 0);
  registerDialogue(id, ({ game }) => [
    { npc: key === 'gullhaven' ? 'Where to? Beacon Isle, Bogwick, Thrush Isle or the Cove - if you are mad. Coin first.' : 'Need a ride? Cobb\'s boats go all along the coast.' },
    { title: 'Travel to...', options: [
      ...Object.keys(FERRY).filter((k) => k !== key).map((k) => ({ text: `${FERRY[k].name} (${freeFerry(game) ? 'free' : `${FARE[k]} coins`})`, action: () => { ferryTravel(game, k); return false; } })),
      { text: 'Nowhere, thanks.', end: true },
    ] },
  ]);
}
hook((game) => {
  game.interactions.onNpc('Travel', Object.keys(FERRY).map((k) => `ferry_${k}`), ({ target }) => { game.ui.startDialogue(target.def.dialogue, { npc: target, player: game.player }); });
});

// =================================================================================================
// Drinks (ales) and waterskins
// =================================================================================================
const SKINS = ['waterskin_4', 'waterskin_3', 'waterskin_2', 'waterskin_1'];
const nextSkin = (id) => ({ waterskin_4: 'waterskin_3', waterskin_3: 'waterskin_2', waterskin_2: 'waterskin_1', waterskin_1: 'waterskin_empty' }[id]);
hook((game) => {
  const I = game.interactions;
  I.onItem('Drink', ['dwarven_stout', 'emberbrew', 'moss_cider'], ({ player, item, slot, def }) => {
    if ((player.drinkDelayUntil || 0) > game.tickCount) return;
    player.drinkDelayUntil = game.tickCount + 3;
    player.inventory.removeAt(slot, 1);
    game.playAnim(player, 'drink', 900);
    game.heal(player, def.drinkHeal || 1);
    if (item.id === 'moss_cider') { game.message('You drink the moss cider. It tastes green, in a good way.'); return; }
    player.skills.boost('strength', item.id === 'emberbrew' ? 4 : 2);
    player.skills.setCurrent('attack', Math.max(1, player.skills.getCurrent('attack') - (item.id === 'emberbrew' ? 4 : 3)));
    game.message(item.id === 'emberbrew' ? 'Fire runs down your throat and into your arms. Your aim, sadly, is elsewhere.' : 'You drain the stout. You feel mighty - and slightly cross-eyed.');
  });
  I.onItem('Drink', SKINS, ({ player, item, slot }) => {
    player.inventory.set(slot, { id: nextSkin(item.id), qty: 1 });
    game.playAnim(player, 'drink', 900);
    game.heal(player, 1);
    const st = player.store('desert'); st.lastSip = game.tickCount;
    game.message('You take a long drink from the waterskin. Lukewarm, and wonderful.');
  });
  // refill at wells, fountains, the Moonwell and the Sunwell spring
  const WELLS = ['well_rustic', 'well', 'moonwell', 'fountain', 'sunwell_spring'].filter((id) => game.registry.getObject(id));
  I.onObject('Drink-from', ['sunwell_spring'], ({ player }) => {
    game.playAnim(player, 'drink', 900);
    game.heal(player, 2);
    player.store('desert').heat = 0;
    game.message('You cup your hands and drink from the spring. Cool, sweet, and very welcome.');
  });
  I.onItemOnObject(['waterskin_empty', 'waterskin_1', 'waterskin_2', 'waterskin_3'], WELLS, ({ player }) => {
    let n = 0;
    for (let i = 0; i < player.inventory.size; i++) {
      const it = player.inventory.get(i);
      if (it && (it.id === 'waterskin_empty' || (SKINS.includes(it.id) && it.id !== 'waterskin_4'))) { player.inventory.set(i, { id: 'waterskin_4', qty: 1 }); n++; }
    }
    game.playAnim(player, 'pickup', 900);
    game.message(n > 1 ? `You fill ${n} waterskins.` : 'You fill the waterskin.');
  });
});

// the Sunwell oasis spring (sweet water in the badlands)
registerObject({ id: 'sunwell_spring', name: 'Sunwell spring', examine: 'Clear water bubbles up between the palms. Use a waterskin on it to fill it.', options: ['Drink-from'], model: { template: 'well' }, mapIcon: { char: 'W', color: '#60a0e0' } });
objAt('sunwell_spring', 265, 151);

// =================================================================================================
// Desert heat: the Sunscar sun drains a little life unless you drink. Dustwatch, the Sunwell oasis and the
// coast are shaded / breezy; dungeons are cool. Each piece of desert cloth worn makes the heat slower.
// =================================================================================================
const HOT = new Set(['sunscar', 'scorchgulch', 'sand_temple']);
hook((game) => {
  let warned = false;
  game.onTick((tick) => {
    const p = game.player;
    if (!p || p.dead || tick % 5) return;
    const area = game.world.getArea(p.x, p.y);
    if (!area || !HOT.has(area.id)) { warned = false; return; }
    const st = p.store('desert');
    if (!warned) { warned = true; game.message('<col=a0501a>The Sunscar sun beats down on you. Keep some water handy.</col>'); st.heat = 0; }
    const cloth = ['head', 'body', 'legs'].filter((s) => getItem(p.equipment.get(s)?.id)?.desertCloth).length;
    st.heat = (st.heat || 0) + 5;
    if (st.heat < 30 + cloth * 15) return;
    st.heat = 0;
    // sip automatically if a waterskin has water
    for (let i = 0; i < p.inventory.size; i++) {
      const it = p.inventory.get(i);
      if (it && SKINS.includes(it.id)) {
        p.inventory.set(i, { id: nextSkin(it.id), qty: 1 });
        game.message(it.id === 'waterskin_1' ? 'You drink the last of your water. Better find a well.' : 'You take a sip of water from your waterskin.');
        return;
      }
    }
    if (p.hp <= 2) { game.message('<col=a0501a>You are parched and dizzy. Find water - the Dustwatch well or the Sunwell oasis!</col>'); return; }
    game.applyDamage(p, 1 + Math.floor(Math.random() * 3), { type: 'typeless' });
    game.message('<col=a0501a>The heat of the badlands saps your strength. You need water!</col>');
  }, 60);
});

// =================================================================================================
// Eastern lore books (achievement): search the marked bookshelves
// =================================================================================================
const LORE = [
  ['lore_durn_hall', 207, 62, 'The Founding of Durnhold', [
    'Thane Borrik Ironvein led forty families into the Greyspine "to dig until the stone ran warm".',
    'At the Deep Seams the stone did run warm, and the first great hearth was lit from the mountain\'s own heat, carried up in an iron cradle.',
    'The chronicle adds, in a different hand: "We did not ask what kept the mountain warm. We should have."']],
  ['lore_mason_guild', 204, 61, 'Masons\' Marks', [
    'Every mason of Durnhold cuts a mark into the stones they lay. Borrik\'s mark is a hammer over a flame.',
    'The oldest stones of the Forge Hall carry a mark nobody can name: a closed eye inside a ring of fire.']],
  ['lore_ilvaren_archive', 274, 69, 'Songs of the Moonwell', [
    'The Moonwell was sung awake on the first night of the first full moon. Its water remembers that night, and is sweetest when the old stones are set as they were then.',
    'The oldest verse tells of a "sleeper in the mountain" whom the elves sang to rest, "with moonwater, forge-fire and the watcher\'s gold".']],
  ['lore_spire_study', 279, 238, 'A Catalogue of Lesser Constellations', [
    'The Anvil, the Heron, the Lantern, the Sickle, and the Wyrm - the last a chain of faint stars that wanders a little each century.',
    'Margin note in Orrin Vale\'s hand: "The Wyrm is not a constellation. It is a warning. Who drew it?"']],
  ['lore_dustwatch', 235, 152, 'Commander\'s Log, Dustwatch', [
    'Day 112: Water ration halved. Sabah has raised her prices again. I have raised her rent.',
    'Day 140: Lights in the Sandswallowed Temple at night. The excavator says the Sun-Wardens "watched something". She will not say what.']],
  ['lore_salty_gull', 173, 179, 'The Salty Gull Logbook', [
    'A tavern logbook full of tall tales. One page, written by a steadier hand, records a "great sea-serpent seen off the east pier, every thirty years since the lighthouse was built".',
    'Below it: "Pinned it with a barbed harpoon in my grandfather\'s day. Stopped it diving. Then we had it." - Harbourmaster Brannoc the Elder.']],
  ['lore_hedgewitch', 91, 182, 'Morwen\'s Receipt Book', [
    'A neat herbal: marshmint for fevers, bitterleaf for sickness, honey for everything.',
    'A note on blightroot: "Poisonous to eels and children. Smells of lamp oil and sour earth. Never, ever into the water."']],
  ['lore_lighthouse', 194, 203, 'The Keeper\'s Signal Book', [
    'Signals by lamp: LONG-LONG-SHORT means "Where is the channel?". SHORT-SHORT means "Hold position".',
    'The reply for a ship seeking the safe channel is SHORT-LONG-SHORT: "The channel lies east of the isle." LONG-SHORT-LONG means "Rocks ahead - turn back".']],
];
for (const [id, x, y, title] of LORE) {
  registerObject({ id, name: 'Bookshelf', examine: `A bookshelf. One spine stands out: "${title}".`, options: ['Search'], model: { template: 'dec_bookshelf' }, minimap: 'block' });
  objAt(id, x, y, y === 238 || y === 69 || y === 179 || y === 61 ? 0 : 1);
}
hook((game) => {
  game.interactions.onObject('Search', LORE.map((l) => l[0]), ({ player, target }) => {
    const book = LORE.find((l) => l[0] === target.id);
    const st = player.store('east_lore');
    const first = !st[book[0]];
    st[book[0]] = true;
    const n = LORE.filter((l) => st[l[0]]).length;
    game.playAnim(player, 'pickup', 700);
    game.ui.startDialogue([
      { message: `You find a book: <b>${book[3]}</b>.` },
      ...book[4].map((t) => ({ message: t })),
      { action: () => {
        if (!first) return false;
        game.message(`<col=0000a0>Eastern lore books found: ${n}/${LORE.length}.</col>`);
        if (n === LORE.length && !st.rewarded) {
          st.rewarded = true;
          give(game, 'insight_lamp');
          game.player.skills.addXp('magic', 1000, { ignoreMultiplier: true });
          game.spawnEffect('levelup', game.player);
          game.message('<col=ff7000>Achievement unlocked: Eastern Loremaster! You receive a Lamp of Insight and 1,000 Magic XP.</col>');
        }
        return false;
      } },
    ], { player });
  });
});
