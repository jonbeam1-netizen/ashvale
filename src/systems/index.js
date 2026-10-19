// Fixed list of gameplay systems (engine-owned). Each module exports init(game), called once after
// the world, renderer and UI exist and before the first tick. Order below = init order.

import * as magic from './magic.js';
import * as prayer from './prayer.js';
import * as combat from './combat.js';
import * as death from './death.js';
import * as wilderness from './wilderness.js';
import * as gathering from './gathering.js';
import * as production from './production.js';
import * as agility from './agility.js';
import * as thieving from './thieving.js';
import * as slayer from './slayer.js';
import * as quests from './quests.js';
// activities (minigames, riddle trails, pets, emotes)
import * as minigames from './minigames.js';
import * as clues from './clues.js';
import * as pets from './pets.js';
import * as emotes from './emotes.js';

const SYSTEMS = { magic, prayer, combat, death, wilderness, gathering, production, agility, thieving, slayer, quests };
Object.assign(SYSTEMS, { minigames, clues, pets, emotes });

export function initSystems(game) {
  for (const [name, mod] of Object.entries(SYSTEMS)) {
    try { mod.init?.(game); } catch (e) { console.error(`[systems] ${name}.init failed`, e); }
  }
}

// progression & UI polish (skill guides, XP tracker, collection log, Regional Chronicles, mastery)
import * as progress from './progress.js';
Object.assign(SYSTEMS, { progress });
// new-player tutorial (guide panel, highlights, starter bundle)
import * as tutorial from './tutorial.js';
Object.assign(SYSTEMS, { tutorial });
// endgame co-op raid: The Drowned Sun (state, multiplayer, chambers, rewards)
import * as raid from './raid.js';
Object.assign(SYSTEMS, { raid });
