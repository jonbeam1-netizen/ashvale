// Progression & UI polish system: skill guides, XP tracker, collection log, Regional Chronicles,
// Hall of Mastery / milestones / hiscores. Publishes game.progress:
//   openSkillGuide(skill) · openCollectionLog() · openChronicles(regionId?) · openHiscores() · openMasteryHall()
//   xpTracker { toggle(), setVisible(on), reset() } · collection { gain, sources, state } ·
//   chronicles { claim, reclaim, validate, state, regions } · mastery { buy }
// Helpers: progress_ui.js (styles + tab hooks), progress_xptracker.js, progress_collection.js,
// progress_chronicles.js, progress_mastery.js; window: ui/skillguide.js; data: content/diaries.js (+ mastery.js).

import { openSkillGuide } from '../ui/skillguide.js';
import { injectCss, initTabHooks } from './progress_ui.js';
import { initXpTracker } from './progress_xptracker.js';
import { initCollection } from './progress_collection.js';
import { initChronicles } from './progress_chronicles.js';
import { initMastery } from './progress_mastery.js';

export function init(game) {
  injectCss();
  const P = {
    openSkillGuide: (skill) => openSkillGuide(game, skill),
    openCollectionLog: () => P.collection.open(),
    openChronicles: (region) => P.chronicles.open(region),
    openHiscores: () => P.mastery.openHiscores(),
    openMasteryHall: () => P.mastery.openMasteryHall(),
  };
  game.progress = P;
  const step = (name, fn) => { try { fn(); } catch (e) { console.error(`[progress] ${name} failed`, e); } };
  step('xpTracker', () => { P.xpTracker = initXpTracker(game); });
  step('collection', () => { P.collection = initCollection(game); });
  step('chronicles', () => { P.chronicles = initChronicles(game); });
  step('mastery', () => { P.mastery = initMastery(game, P); });
  step('tabs', () => initTabHooks(game, P));
  // a character created after init (first run) gets fresh stores; re-check quests/levels once the game is up
  game.events.on('game:ready', () => step('recheck', () => P.chronicles?.checkStatic(true)));
}
