// Townsfolk, shopkeepers and their dialogues. OWNER: agent D (D2). Imported by npcs.js.

import { registerNpc, registerDialogue } from '../core/registry.js';

const shopIcon = (char, color = '#e8c040') => ({ char, color });
const keeper = (id, name, examine, shop, look, icon, dialogue = 'shopkeeper') => registerNpc({
  id, name, examine, options: ['Talk-to', 'Trade'], shop, dialogue, wanderRadius: 1, mapIcon: icon,
  model: { template: 'human', equipment: {}, ...look },
});

// ---- bankers / guides --------------------------------------------------------------------------
registerNpc({
  id: 'banker', name: 'Banker', examine: 'Good with money.', options: ['Talk-to', 'Bank'], dialogue: 'banker', wanderRadius: 0,
  model: { template: 'human', colors: { top: '#2a3a6a', legs: '#2a2a3a', hair: '#3a2a1a' }, equipment: { neck: { shape: 'amulet', color: '#e8c040' } } },
  mapIcon: { char: '$', color: '#e8c040' },
});
registerNpc({
  id: 'banker_female', name: 'Banker', examine: 'She counts coins faster than you can blink.', options: ['Talk-to', 'Bank'], dialogue: 'banker', wanderRadius: 0,
  model: { template: 'human', female: true, hairStyle: 'long', colors: { top: '#2a3a6a', legs: '#2a2a3a', hair: '#8a5a2a' }, equipment: { neck: { shape: 'amulet', color: '#e8c040' } } },
});
registerNpc({
  id: 'town_guide', name: 'Mira', examine: 'The Brackenford town guide.', options: ['Talk-to'], dialogue: 'town_guide', wanderRadius: 2,
  model: { template: 'human', female: true, hairStyle: 'long', colors: { top: '#3a6a5a', legs: '#5a4a3a', hair: '#c88a3a' }, equipment: {} },
  mapIcon: { char: '?', color: '#60c0ff' },
});
registerNpc({
  id: 'slayer_master_hollis', name: 'Warden Hollis', examine: 'A grizzled hunter of dangerous beasts.', options: ['Talk-to'], dialogue: 'slayer_master', wanderRadius: 1,
  model: { template: 'human', colors: { top: '#3a4a2a', legs: '#2a2a20', hair: '#5a5a5a' }, extras: { beard: true }, equipment: { weapon: 'iron_scimitar', cape: { shape: 'cape', color: '#2a3a20' } } },
  mapIcon: { char: 'S', color: '#c04040' },
});

// ---- shopkeepers -------------------------------------------------------------------------------
keeper('shopkeeper', 'Shopkeeper', 'Maybe I can buy something from them.', 'brackenford_general',
  { colors: { top: '#6a5a3a', legs: '#4a3a2a', hair: '#8a5a2a' } }, shopIcon('G'));
keeper('bram_bladesmith', 'Garrick', 'A burly bladesmith with singed eyebrows.', 'brackenford_swords',
  { colors: { top: '#5a3a2a', legs: '#3a3a3a', hair: '#2a1a10', skin: '#c8946a' }, extras: { beard: true }, equipment: { weapon: 'iron_longsword', body: { shape: 'chainbody', color: '#4a3a2a' } } }, shopIcon('W', '#c0c0c8'), 'bram');
keeper('hilde_armourer', 'Hilde', 'She can size a breastplate by eye.', 'brackenford_armour',
  { female: true, hairStyle: 'long', colors: { top: '#6a6a72', legs: '#3a3a42', hair: '#d8c070' }, equipment: { body: 'iron_chainbody', shield: 'bronze_kiteshield' } }, shopIcon('A', '#c0c0c8'), 'hilde');
keeper('baker_wenna', 'Wenna', 'Flour up to her elbows.', 'brackenford_food',
  { female: true, colors: { top: '#e8e4d8', legs: '#8a5a3a', hair: '#5a3a1a' } }, shopIcon('F', '#f0a040'), 'wenna');
keeper('fisher_tobin', 'Tobin', 'An old angler who smells faintly of perch.', 'brackenford_fishing',
  { colors: { top: '#3a5a6a', legs: '#4a4a3a', hair: '#c8c8c0' }, extras: { beard: true }, equipment: { head: { shape: 'hood', color: '#c8a050' } } }, shopIcon('$', '#60a0e0'), 'tobin');
keeper('crafter_ilsa', 'Ilsa', 'Her fingers are never still.', 'brackenford_crafting',
  { female: true, hairStyle: 'long', colors: { top: '#8a3a5a', legs: '#4a3a4a', hair: '#1a1a1a' } }, shopIcon('C', '#d080c0'), 'ilsa');
keeper('mage_orrin', 'Orrin', 'A mage who sells sigils to fund his research.', 'brackenford_magic',
  { colors: { hair: '#d8d8d8' }, extras: { beard: true }, equipment: { head: 'apprentice_hat', body: 'apprentice_robe_top', legs: 'apprentice_robe_bottom', weapon: 'mages_staff' } }, shopIcon('M', '#80a0ff'), 'orrin');
keeper('fletcher_rowan', 'Rowan', 'Calloused fingers and a keen eye.', 'brackenford_archery',
  { colors: { top: '#3a5a2a', legs: '#4a3a2a', hair: '#7a4a1a' }, equipment: { weapon: { shape: 'bow', color: '#8a5a2a' }, head: { shape: 'coif', color: '#3a5a2a' } } }, shopIcon('R', '#80c060'), 'rowan');
keeper('herbalist_maeve', 'Maeve', 'She smells of a dozen different herbs.', 'brackenford_herbalist',
  { female: true, hairStyle: 'long', colors: { top: '#4a6a3a', legs: '#3a4a2a', hair: '#a8a8a0' } }, shopIcon('H', '#60d060'), 'maeve');
keeper('arms_dealer', 'Arms dealer', 'Sells weapons and armour.', 'highmarch_arms',
  { colors: { top: '#5a5a62', legs: '#3a3a3a', hair: '#2a1a10' }, extras: { beard: true }, equipment: { body: 'steel_platebody' } }, shopIcon('W', '#c0c0c8'));
keeper('highmarch_smith', 'Master smith Dorran', 'The finest smith in Highmarch, or so he says.', 'highmarch_plate',
  { colors: { top: '#3a2a20', legs: '#2a2a2a', hair: '#4a4a4a', skin: '#b8845a' }, extras: { beard: true }, equipment: { weapon: 'verdite_warhammer', body: { shape: 'chainbody', color: '#3a2a20' } } }, shopIcon('A', '#3e9461'), 'dorran');
keeper('highmarch_mage', 'Archivist Selene', 'Keeper of the Highmarch arcane stores.', 'highmarch_arcana',
  { female: true, hairStyle: 'long', colors: { hair: '#2a2a3a' }, equipment: { head: 'conjurer_hat', body: 'conjurer_robe_top', legs: 'conjurer_robe_bottom', weapon: 'water_battlestaff' } }, shopIcon('M', '#80a0ff'), 'selene');
keeper('highmarch_grocer', 'Grocer Pim', 'He has strong opinions about cheese.', 'highmarch_general',
  { colors: { top: '#8a6a3a', legs: '#4a3a2a', hair: '#d8a050' } }, shopIcon('G'));
keeper('haverly_supplier', 'Gertie', 'Runs the Haverly seed and tool shed.', 'haverly_farm_supplies',
  { female: true, colors: { top: '#6a7a3a', legs: '#5a4a2a', hair: '#8a5a2a' }, equipment: { head: { shape: 'hood', color: '#c8b070' } } }, shopIcon('T', '#80c060'), 'gertie');
keeper('bandit_fence', 'Corrin the Fence', 'He asks no questions and expects none in return.', 'wilderness_bandit_camp',
  { colors: { top: '#3a3026', legs: '#2a2420', hair: '#1a1a1a' }, extras: { beard: true }, equipment: { head: { shape: 'hood', color: '#2a2622' }, weapon: 'steel_dagger', cape: 'reavers_cloak' } }, shopIcon('$', '#c04040'), 'corrin');

// ---- townsfolk ---------------------------------------------------------------------------------
const citizen = (id, name, examine, dialogue, model, extra = {}) => registerNpc({ id, name, examine, options: ['Talk-to'], dialogue, wanderRadius: 4, model: { template: 'human', equipment: {}, ...model }, ...extra });
citizen('old_fennick', 'Old Fennick', 'He has lived in Brackenford longer than the well.', 'fennick', { colors: { top: '#5a4a3a', legs: '#3a3a3a', hair: '#e0e0e0' }, extras: { beard: true }, equipment: { weapon: { shape: 'staff', color: '#6a4a2a' } } });
citizen('bard_lyle', 'Lyle the bard', 'He is tuning a lute that is already out of tune.', 'lyle', { colors: { top: '#8a2a6a', legs: '#2a4a6a', hair: '#e8b040' }, equipment: { cape: 'cape_blue' } });
citizen('child_pip', 'Pip', 'A small child with a big stick.', 'pip', { scale: 0.7, colors: { top: '#c86a2a', legs: '#4a4a6a', hair: '#7a4a1a' }, equipment: { weapon: { shape: 'staff', color: '#6a4a2a' } } });
citizen('brother_aldous', 'Brother Aldous', 'A quiet monk of the chapel.', 'aldous', { hairStyle: 'bald', colors: { top: '#6a4a2a', legs: '#6a4a2a' }, equipment: { legs: { shape: 'robe', color: '#6a4a2a' }, body: { shape: 'robe_top', color: '#6a4a2a' } } });
citizen('drunk_harlan', 'Harlan', 'He is having a lovely time.', 'harlan', { colors: { top: '#6a6a3a', legs: '#3a3a2a', hair: '#7a3a1a' }, extras: { beard: true, nose: 0.06 } });
citizen('lady_corvina', 'Lady Corvina', 'A noblewoman of Highmarch. She looks you up and down.', 'corvina', { female: true, hairStyle: 'long', colors: { top: '#6a1a3a', legs: '#6a1a3a', hair: '#1a1a1a' }, equipment: { legs: { shape: 'robe', color: '#6a1a3a', trim: '#e8c040' }, neck: { shape: 'amulet', color: '#e8c040' } } });
citizen('scholar_bede', 'Scholar Bede', 'He is reading while walking. Bold.', 'bede', { colors: { top: '#3a3a5a', legs: '#2a2a3a', hair: '#8a7a6a' }, equipment: { body: { shape: 'robe_top', color: '#3a3a5a' } } });
citizen('dockhand_moira', 'Moira', 'A dockhand with arms like ship ropes.', 'moira', { female: true, colors: { top: '#3a5a7a', legs: '#4a3a2a', hair: '#a83a1a' } });
citizen('ranger_kestrel', 'Kestrel', 'A ranger who watches the Wilderness border.', 'kestrel', { female: true, hairStyle: 'long', colors: { top: '#3a4a2a', legs: '#3a3a2a', hair: '#4a2a1a' }, equipment: { weapon: { shape: 'bow', color: '#6a4a2a' }, cape: 'cape_green', head: { shape: 'hood', color: '#3a4a2a' } } });

// =================================================================================================
// Dialogues
// =================================================================================================
const openShop = ({ game, npc }) => { game.ui.openShop(npc.def.shop); return false; };

registerDialogue('banker', [
  { npc: 'Good day, how may I help you?' },
  { options: [
    { text: "I'd like to access my bank account, please.", action: ({ game }) => { game.ui.openBank(); return false; } },
    { text: 'What is this place?', goto: 'what' },
    { text: 'Nothing, thanks.', end: true },
  ] },
  { label: 'what', npc: 'This is a branch of the Bank of Ashvale. Your belongings are safe with us in every town.' },
  { player: 'Good to know.', end: true },
]);
registerDialogue('shopkeeper', [
  { npc: 'Can I help you at all?' },
  { options: [
    { text: 'Yes please. What are you selling?', action: openShop },
    { text: "No thanks, I'm just looking.", end: true },
  ] },
]);
/** Shopkeeper dialogue with a little personality: intro line, then trade / chat / leave. */
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
shopTalk('bram', 'Blades! Sharp ones! Well, mostly sharp.', 'I forge every blade on the anvils out back. Bronze for beginners, iron and steel for those who survive the beginning.', 'I intend to survive.');
shopTalk('hilde', "You look underdressed for adventuring. Let's fix that.", "Armour won't make you brave, but it will make you alive. I'd take alive.");
shopTalk('wenna', 'Fresh out of the oven! Well, most of it.', "Bread, pies and cake - everything a hungry adventurer needs. Eat before a fight, not during. That's my advice.");
shopTalk('tobin', 'Fish are biting today. They always say that, but today it is true.', 'Fifty years I have fished the Silverrun. The trick is patience. And bait. Mostly bait.', 'I will buy some bait, then.');
shopTalk('ilsa', 'Needles, thread, moulds, chisels - whatever your hands need.', 'I spin, I sew, I set gems. If it can be made by hand, I have probably made it twice.');
shopTalk('orrin', 'Ah, a seeker of the arcane! Or a buyer of sigils. Either will do.', 'Sigils are essence bound with intent. Wind, water, earth, fire - each one a little spell waiting to happen. A staff can save you carrying them.', 'Fascinating.');
shopTalk('rowan', 'Bows, arrows, everything that flies true.', 'A bow is only as good as its string and the arm that draws it. I can help with the first one.');
shopTalk('maeve', 'Mind the drying racks, dear.', 'Herbs grow wild in Thornwood and Murkfen, if you know where to look. Clean them, mix them, and you have a potion.');
shopTalk('dorran', 'Highmarch steel is the finest in Ashvale. Highmarch duskite and verdite even more so.', 'My grandfather forged the gates of this city. I forge things that are slightly smaller and much more expensive.');
shopTalk('selene', 'Quietly, please. The archive is listening.', 'Highmarch keeps the oldest spellbooks in Ashvale. We sell what we can spare - battlestaves, robes, sigils of every sort.');
shopTalk('gertie', 'Seeds, tools, compost. Everything a growing farm needs.', 'Plant in good soil, water, keep the weeds down - and keep the cows out of the cabbages.');
shopTalk('corrin', "Well, well. Someone brave enough to come out here. Buying or selling?", "Folks out here lose their things all the time. Somebody's got to look after them. For a price.", "I'm not sure that's legal.");

registerDialogue('villager', (ctx) => [
  { npc: ['Lovely weather today.', 'Have you seen the wilderness ditch? Stay south of it if you value your hide.', 'The forge by the square is always warm.',
    'They say a goblin warlord has taken over the camp east of town.', 'My cousin went into Gloomhollow once. Only once.'][ctx.npc.uid % 5] },
]);
registerDialogue('farmer', (ctx) => [
  { npc: ['Mind the cows, they kick.', 'Boars have been at the turnips again.', 'A good harvest this year, if the crows leave us any.'][ctx.npc.uid % 3] },
  { player: 'I will keep that in mind.' },
]);
registerDialogue('guard', (ctx) => [
  { npc: ['Move along, citizen.', 'Keep your weapon sheathed in town.', 'Quiet day. I like quiet days.', 'If you see any goblins, let me know. Then run.'][ctx.npc.uid % 4] },
]);
registerDialogue('knight', [
  { npc: 'Hail, traveller. Highmarch stands.' },
  { options: [
    { text: 'What do the knights guard against?', goto: 'guard' },
    { text: 'Farewell.', end: true },
  ] },
  { label: 'guard', npc: 'The Wilderness, mostly. Wyrms, reavers, worse. The Calder Lich stirs in its ruins again.' },
  { npc: 'If you go north, bring a Wyrmward shield. Dragonfire is not a pleasant way to die.', end: true },
]);
registerDialogue('fennick', [
  { npc: "Eh? Speak up, youngster." },
  { player: 'Have you lived here long?' },
  { npc: 'Long enough to remember when the Ashen Wastes were green. Then the Colossus woke, and it all burned.' },
  { npc: "Mark my words: anything that big doesn't stay asleep forever.", end: true },
]);
registerDialogue('lyle', [
  { npc: '*strums* Oh, the Lich of Calder had a very cold heart... no, wait, that does not rhyme.' },
  { options: [
    { text: 'Play me something.', goto: 'play' },
    { text: 'Maybe practise more.', end: true },
  ] },
  { label: 'play', message: 'Lyle plays a jaunty tune. It is almost good.' },
  { npc: 'Thank you, thank you. Tips are welcome. Tips are always welcome.', end: true },
]);
registerDialogue('pip', [
  { npc: 'I am a fearsome warrior! I have slain eleven rats!' },
  { player: 'Very impressive.' },
  { npc: 'One day I will fight a dragon. A small one. To start.', end: true },
]);
registerDialogue('aldous', [
  { npc: 'Peace be with you, friend. The altar is open to all who would pray.' },
  { npc: 'Bury the bones of your fallen foes. It honours them, and it will strengthen your prayers.', end: true },
]);
registerDialogue('harlan', [
  { npc: "Hic! You're my besht friend, you know that?" },
  { player: 'We have never met.' },
  { npc: "Thash what makesh it sho special!", end: true },
]);
registerDialogue('corvina', [
  { npc: 'You are tracking mud on the cobbles.' },
  { player: 'Sorry.' },
  { npc: 'Hmph. Adventurers. At least the knights wipe their boots.', end: true },
]);
registerDialogue('bede', [
  { npc: 'Did you know the Gloom Tyrant Varrath was sealed beneath Gloomhollow three centuries ago? The seal is... less sealed now.' },
  { player: 'That sounds bad.' },
  { npc: 'Oh, very. Fascinating, but very bad.', end: true },
]);
registerDialogue('moira', [
  { npc: 'Corsairs again. Captain Brinehook raids the coast whenever the tide is low.' },
  { npc: 'Somebody ought to take that cutlass off him.', end: true },
]);
registerDialogue('kestrel', [
  { npc: 'North of the ditch, nobody keeps the peace. Not the guards, not the knights. Only you.' },
  { options: [
    { text: 'What lives out there?', goto: 'what' },
    { text: 'Thanks for the warning.', end: true },
  ] },
  { label: 'what', npc: 'Dread wolves and reavers near the ditch. Further north, revenants and wyrms. And in the far frost, Frostmaw. Do not go there.', end: true },
]);
