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

const SYSTEMS = { magic, prayer, combat, death, wilderness, gathering, production, agility, thieving, slayer, quests };

export function initSystems(game) {
  for (const [name, mod] of Object.entries(SYSTEMS)) {
    try { mod.init?.(game); } catch (e) { console.error(`[systems] ${name}.init failed`, e); }
  }
}
