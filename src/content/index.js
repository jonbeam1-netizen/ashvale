// Fixed list of content modules (engine-owned). Each module registers its content at import time.
// Do not add imports here from feature work - add content inside your own module instead.
// Order: map config first; everything else is order-independent because the world is built
// after all imports have run.

import './map.js';
import './items.js';
import './npcs.js';
import './objects.js';
import './drops.js';
import './shops.js';
import './gathering.js';
import './recipes.js';
import './spells.js';
import './prayers.js';
import './quests.js';
import './agility.js';
import './thieving.js';
import './slayer.js';
// activities (minigames, riddle trails, pets)
import './minigames.js';
import './clues.js';
import './pets.js';
// progression: Regional Chronicles + mastery mantles / Hall of Mastery
import './diaries.js';
// new-player tutorial: Wayguide Corin, practice dummies, step list
import './tutorial.js';
// endgame co-op raid: The Drowned Sun (rooms, monsters, rewards)
import './raid.js';
// mid-game dungeon: the Glimmerdeep (levels 40-75; map, monsters, gear) - quests in midgame_quests.js
import './midgame_dungeon.js';
