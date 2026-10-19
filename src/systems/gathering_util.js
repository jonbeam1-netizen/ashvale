// Shared helpers for the gathering systems (woodcutting, mining, fishing, hunter, farming). OWNER: agent B.

import { getData, getItem } from '../core/registry.js';

export const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const rand = (n) => Math.floor(Math.random() * n);
/** number or [min, max] (inclusive) -> number */
export const roll = (v) => (Array.isArray(v) ? v[0] + rand(v[1] - v[0] + 1) : v);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** OSRS-style success chance: linear between lo (level 1) and hi (level 99), out of 256. */
export function levelChance(level, [lo, hi]) {
  const l = clamp(level, 1, 99);
  return clamp((lo + ((hi - lo) * (l - 1)) / 98) / 256, 0, 1);
}

/** Effective level (boosts count, as in OSRS). */
export const lvl = (player, skill) => player.skills.getCurrent(skill);

export function needLevel(game, skill, level, what) {
  game.message(`You need ${/^[aeiou]/i.test(skill) ? 'an' : 'a'} ${cap(skill)} level of ${level} to ${what}.`);
}

/** Best usable tool for a skill from inventory or wielded weapon: {id, level, power, interval} or null. */
export function bestTool(player, skill) {
  let best = null;
  const consider = (id) => {
    const t = getData('tools', id);
    if (!t || t.skill !== skill || player.skills.getLevel(skill) < t.level) return;
    if (!best || t.power > best.power) best = { id, ...t };
  };
  for (const it of player.inventory.items()) consider(it.id);
  const w = player.equipment.get('weapon');
  if (w) consider(w.id);
  return best;
}

/** True if the player carries the item (inventory or wielded). */
export function hasTool(player, id) {
  return player.inventory.has(id) || player.equipment.get('weapon')?.id === id;
}

/** "a perch" / "some minnows" style phrase from an item id (drops a leading "Raw "). */
export function catchPhrase(id) {
  const name = (getItem(id)?.name || id).replace(/^Raw /i, '').toLowerCase();
  if (/s$/.test(name)) return `some ${name}`;
  return `${/^[aeiou]/.test(name) ? 'an' : 'a'} ${name}`;
}

/** Item name in lower case. */
export const itemName = (id) => (getItem(id)?.name || id).toLowerCase();

/** Free inventory space needed to accept a list of [{id, qty}]. */
export function canHold(player, items) {
  let slots = 0;
  for (const { id, qty = 1 } of items) {
    const def = getItem(id);
    if (def?.stackable) { if (!player.inventory.has(id)) slots++; } else slots += qty;
  }
  return player.inventory.freeSlots() >= slots;
}
