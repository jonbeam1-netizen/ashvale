// Classic exponential XP curve (levels 1-99) and combat level formula.

export const MAX_LEVEL = 99;
export const MAX_XP = 200_000_000;

const XP_TABLE = [0, 0]; // XP_TABLE[level] = xp needed for level
{
  let points = 0;
  for (let lvl = 1; lvl < 120; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    XP_TABLE[lvl + 1] = Math.floor(points / 4);
  }
}

export function xpForLevel(level) {
  if (level <= 1) return 0;
  return XP_TABLE[Math.min(level, 120)];
}

export function levelForXp(xp) {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= XP_TABLE[lvl + 1]) lvl++;
  return lvl;
}

/** levels: {attack, strength, defence, hitpoints, prayer, ranged, magic} (base levels). */
export function combatLevel(l) {
  const base = 0.25 * (l.defence + l.hitpoints + Math.floor(l.prayer / 2));
  const melee = 0.325 * (l.attack + l.strength);
  const range = 0.325 * Math.floor(l.ranged * 1.5);
  const mage = 0.325 * Math.floor(l.magic * 1.5);
  return Math.floor(base + Math.max(melee, range, mage));
}
