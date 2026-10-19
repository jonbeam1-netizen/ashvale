// Utility magic runtime. OWNER: agent F. Started from systems/agility.js (initMagicUtility).
// The spells themselves live in content/spells_utility.js (spell.onCast(game, player, target)).
// Agent A's systems/magic.js dispatches every spell with an onCast through game.magic.castUtility
// (level + sigil checks, sigils, xp). If that API is missing we register equivalent handlers here.

import { getSpell, getItem } from '../core/registry.js';
import { UTILITY_SPELLS } from '../content/spells_utility.js';

let game;

function fallbackCast(player, spell, target) {
  if (player.skills.getLevel('magic') < spell.level) { game.message(`You need a Magic level of ${spell.level} to cast this spell.`); return false; }
  const cost = Object.entries(spell.runes || {});
  const miss = cost.find(([id, n]) => player.inventory.count(id) < n);
  if (miss) { game.message(`You do not have enough ${getItem(miss[0])?.name || miss[0]}s to cast this spell.`); return false; }
  let ok;
  try { ok = spell.onCast(game, player, target); } catch (e) { console.error('[magic_utility] onCast failed', e); ok = false; }
  if (ok === false) return false;
  for (const [id, n] of cost) player.inventory.remove(id, n);
  if (spell.xp) player.skills.addXp('magic', spell.xp);
  return true;
}

/** Cast a utility spell with the standard checks (A's castUtility when available). */
export function castUtility(player, spell, target = null) {
  if (game.magic?.castUtility) return game.magic.castUtility(player, spell, target);
  return fallbackCast(player, spell, target);
}

export function initMagicUtility(g) {
  game = g;
  const ids = UTILITY_SPELLS.filter((id) => getSpell(id)?.onCast);
  if (!game.magic?.castUtility) {
    const I = game.interactions;
    const noTarget = ids.filter((id) => !getSpell(id).targets?.length);
    const itemTarget = ids.filter((id) => getSpell(id).targets?.includes('item'));
    if (noTarget.length) I.onSpell(noTarget, ({ player, spell }) => { castUtility(player, spell); });
    if (itemTarget.length) I.onSpellOnItem(itemTarget, '*', ({ player, spell, item, slot }) => { castUtility(player, spell, { item, slot }); });
  }
  game.magicUtility = { castUtility, spells: ids };
}
