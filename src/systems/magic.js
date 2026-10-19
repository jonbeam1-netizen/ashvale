// Magic utility: rune checks, teleports, utility spells. OWNER: agent F (combat spells: agent A).
// STARTER IMPLEMENTATION: game.magic helpers + teleport spells (spell.type === 'teleport').

import { getItem } from '../core/registry.js';

export function init(game) {
  game.magic = {
    hasRunes(player, spell) {
      return Object.entries(spell.runes || {}).every(([id, n]) => player.inventory.count(id) >= n);
    },
    /** Level + rune check with player messages. */
    canCast(player, spell) {
      if (player.skills.getLevel('magic') < spell.level) { game.message(`You need a Magic level of ${spell.level} to cast this spell.`); return false; }
      if (!this.hasRunes(player, spell)) {
        const miss = Object.entries(spell.runes).find(([id, n]) => player.inventory.count(id) < n);
        game.message(`You do not have enough ${getItem(miss[0])?.name || miss[0]}s to cast this spell.`);
        return false;
      }
      return true;
    },
    consumeRunes(player, spell) {
      for (const [id, n] of Object.entries(spell.runes || {})) player.inventory.remove(id, n);
    },
  };

  game.interactions.onSpell('*', ({ player, spell }) => {
    if (spell.type !== 'teleport' || !spell.teleport) return false;
    if ((player.teleportUntil || 0) > game.tickCount) return;
    if (game.world.getWildernessLevel(player.x, player.y) > 20) { game.message('A mysterious force prevents you from teleporting.'); return; }
    if (!game.magic.canCast(player, spell)) return;
    game.magic.consumeRunes(player, spell);
    game.ui.closeInterfaces();
    game.actions.stop(player, 'teleport');
    player.teleportUntil = game.tickCount + 5;
    game.actions.lock(player, 4);
    game.playAnim(player, 'cast', 1800);
    game.spawnEffect('teleport', player, { color: 0x9a7aff });
    game.schedule(3, () => {
      game.teleport(player, spell.teleport.x, spell.teleport.y);
      game.spawnEffect('teleport', player, { color: 0x9a7aff });
      player.skills.addXp('magic', spell.xp);
    });
  });
}
