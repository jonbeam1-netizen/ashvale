// Runebinding (agent C): bind pale essence into sigils at elemental altars. Multiple sigils per
// essence at higher levels (data: registerData('runebinding', altarId) from recipes_runebinding.js).

import { getData, allData, getItem } from '../core/registry.js';

let game;

/** Sigils produced per essence at a given level. */
export const multiplier = (b, level) => 1 + b.multiples.filter((l) => level >= l).length;

function bind(player, altar) {
  const b = getData('runebinding', altar.id);
  if (!b) return false;
  if (!getItem(b.sigil)) { game.message('The altar hums, but nothing happens.'); return true; }
  const level = player.skills.getCurrent('runebinding');
  if (level < b.level) { game.message(`You need a Runebinding level of ${b.level} to bind ${b.name.toLowerCase()} sigils.`); return true; }
  const n = player.inventory.count('pale_essence');
  if (!n) { game.message("You don't have any pale essence to bind."); return true; }
  game.actions.start(player, {
    name: 'runebinding', anim: null, delay: 0, interval: 1, interruptible: false,
    onStart: () => {
      player.faceTile = { x: altar.x + 1, y: altar.y + 1 };
      game.playAnim(player, 'cast', 1500);
      game.spawnEffect('teleport', altar, { color: parseInt(b.glow.slice(1), 16) });
    },
    onTick: ({ ticks }) => {
      if (ticks < 2) return true;
      const count = player.inventory.remove('pale_essence', player.inventory.count('pale_essence'));
      if (!count) return false;
      const per = multiplier(b, level);
      player.inventory.add(b.sigil, count * per);
      player.skills.addXp('runebinding', b.xp * count);
      game.message(`You bind the essence into ${count * per} ${getItem(b.sigil).name.toLowerCase()}${count * per > 1 ? 's' : ''}.`);
      game.events.emit('production:make', { player, recipe: { id: `bind_${b.sigil}`, skill: 'runebinding' }, qty: count * per, success: true });
      return false;
    },
  });
  return true;
}

export function init(g) {
  game = g;
  const altars = allData('runebinding').map(([id]) => id);
  game.interactions.onObject('Bind', altars, ({ player, target }) => bind(player, target));
  game.interactions.onItemOnObject(['pale_essence'], altars, ({ player, target }) => bind(player, target));
  game.runebinding = { multiplier, bind };
}
