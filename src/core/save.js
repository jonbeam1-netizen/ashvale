// localStorage save/load with a versioned schema.
// Systems persist their own state in player.data[namespace] (saved automatically) or by listening
// to 'save' (payload.data is the object being written) and 'load' (payload.data was read).

import { SAVE_VERSION, MAX_RUN_ENERGY } from './constants.js';
import { getWeaponType } from './registry.js';

/** `?profile=<name>` selects a separate save slot (lets several tabs test without clobbering each other). */
function profileSuffix() {
  try {
    const p = new URLSearchParams(location.search).get('profile');
    const clean = p ? p.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) : '';
    return clean ? '.' + clean : '';
  } catch { return ''; }
}

export const SAVE_PROFILE = profileSuffix().slice(1);
export const SAVE_KEY = 'ashvale.save' + profileSuffix();

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
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('save is not an object');
    return migrate(data);
  } catch (e) {
    // unreadable save: keep a copy aside (never silently destroy progress) and start fresh
    console.warn('[save] save data is unreadable; it was moved to', SAVE_KEY + '.broken', e);
    try { localStorage.setItem(SAVE_KEY + '.broken', localStorage.getItem(SAVE_KEY)); localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
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
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  p.name = typeof data.name === 'string' && data.name.trim() ? data.name.slice(0, 12) : p.name;
  p.appearance = { ...p.appearance, ...(obj(data.appearance) || {}) };
  p.skills.fromJSON(data.skills);
  p.inventory.fromJSON(data.inventory);
  p.equipment.fromJSON(data.equipment);
  p.bank.fromJSON(data.bank);
  p.runEnergy = Math.max(0, Math.min(MAX_RUN_ENERGY, num(data.runEnergy, MAX_RUN_ENERGY)));
  p.runToggled = !!data.runToggled;
  p.running = p.runToggled;
  p.combatStyle = Math.max(0, Math.floor(num(data.combatStyle, 0)));
  if (p.combatStyle >= (getWeaponType(p.equipment.weaponType())?.styles?.length || 1)) p.combatStyle = 0;
  p.autoRetaliate = data.autoRetaliate ?? true;
  p.specialEnergy = Math.max(0, Math.min(100, num(data.specialEnergy, 100)));
  p.quests = obj(data.quests) || {};
  p.settings = { ...p.settings, ...(obj(data.settings) || {}) };
  p.playTime = num(data.playTime, 0);
  p.data = obj(data.data) || {};
  const pos = obj(data.pos);
  if (pos && Number.isInteger(pos.x) && Number.isInteger(pos.y) && game.world.inBounds(pos.x, pos.y)) {
    // saved on something you can't stand on (a rooftop/obstacle, or the map changed): use the nearest free tile
    const w = game.world;
    let spot = w.isWalkable(pos.x, pos.y) ? [pos.x, pos.y] : null;
    for (let r = 1; r <= 8 && !spot; r++) {
      for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && w.isWalkable(pos.x + dx, pos.y + dy)) { spot = [pos.x + dx, pos.y + dy]; break; }
      }
    }
    if (spot) p.setPosition(spot[0], spot[1]);
  }
  p.appearanceVersion++;
  game.events.emit('load', { data });
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
