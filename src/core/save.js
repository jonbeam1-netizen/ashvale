// localStorage save/load with a versioned schema.
// Systems persist their own state in player.data[namespace] (saved automatically) or by listening
// to 'save' (payload.data is the object being written) and 'load' (payload.data was read).

import { SAVE_VERSION, MAX_RUN_ENERGY } from './constants.js';

export const SAVE_KEY = 'ashvale.save';

/** Upgrade older save objects to the current schema. Add a case per version bump. */
function migrate(data) {
  let d = data;
  if (!d.version) d.version = 1;
  // if (d.version === 1) { ...; d.version = 2; }
  return d;
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.error('[save] failed to read save', e);
    return null;
  }
}

export function serialize(game) {
  const p = game.player;
  const data = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    name: p.name,
    appearance: p.appearance,
    pos: { x: p.x, y: p.y },
    skills: p.skills.toJSON(),
    inventory: p.inventory.toJSON(),
    equipment: p.equipment.toJSON(),
    bank: p.bank.toJSON(),
    runEnergy: p.runEnergy,
    runToggled: p.runToggled,
    combatStyle: p.combatStyle,
    autoRetaliate: p.autoRetaliate,
    specialEnergy: p.specialEnergy,
    quests: p.quests,
    settings: p.settings,
    playTime: p.playTime,
    data: p.data,
  };
  game.events.emit('save', { data });
  return data;
}

export function saveGame(game) {
  if (!game.player || game.player._noSave) return false;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(game)));
    return true;
  } catch (e) {
    console.error('[save] failed', e);
    return false;
  }
}

export function applySave(game, data) {
  const p = game.player;
  p.name = data.name || p.name;
  p.appearance = { ...p.appearance, ...(data.appearance || {}) };
  p.skills.fromJSON(data.skills);
  p.inventory.fromJSON(data.inventory);
  p.equipment.fromJSON(data.equipment);
  p.bank.fromJSON(data.bank);
  p.runEnergy = data.runEnergy ?? MAX_RUN_ENERGY;
  p.runToggled = !!data.runToggled;
  p.running = p.runToggled;
  p.combatStyle = data.combatStyle ?? 0;
  p.autoRetaliate = data.autoRetaliate ?? true;
  p.specialEnergy = data.specialEnergy ?? 100;
  p.quests = data.quests || {};
  p.settings = { ...p.settings, ...(data.settings || {}) };
  p.playTime = data.playTime || 0;
  p.data = data.data || {};
  if (data.pos && game.world.isWalkable(data.pos.x, data.pos.y)) p.setPosition(data.pos.x, data.pos.y);
  p.appearanceVersion++;
  game.events.emit('load', { data });
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
