// Firemaking (agent C): tinderbox on logs (inventory or ground 'Light'), level-based lighting
// chance, fires that burn out into ashes, and the classic step west after lighting.

import { getData, allData, getItem } from '../core/registry.js';
import { rand } from '../core/rng.js';
import { escapeHtml } from '../ui/util.js';

let game;

function canLightHere(x, y) {
  const w = game.world;
  if (!w.isWalkable(x, y) || w.buildingAt(x, y)) return false;
  // decoration you can walk over (grass tufts, pebbles, flowers...) doesn't stop a fire; real objects do
  if (game.world.objectsAt(x, y).some((o) => !o.hidden && (o.blocks || o.def.options?.length))) return false;
  const area = w.getArea?.(x, y);
  return !(area && /bank/i.test(area.id || ''));
}

/** Tiles to step to after lighting: west first, then east, south, north. */
function stepAway(player) {
  const { x, y } = player;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
    if (game.world.canStep ? game.world.canStep(x, y, dx, dy) : game.world.isWalkable(x + dx, y + dy)) {
      game.forceWalk(player, [{ x: x + dx, y: y + dy }]);
      return;
    }
  }
}

/** Light the logs lying on the ground item `gi` (player stands on it). */
function lightGroundLogs(player, gi) {
  const data = getData('firemaking', gi.itemId);
  if (!data) return false;
  if (!player.inventory.has('tinderbox')) { game.message('You need a tinderbox to light a fire.'); return true; }
  if (player.skills.getCurrent('firemaking') < data.level) { game.message(`You need a Firemaking level of ${data.level} to burn ${getItem(gi.itemId).name.toLowerCase()}.`); return true; }
  if (!canLightHere(gi.x, gi.y)) { game.message("You can't light a fire here."); return true; }
  game.message('You attempt to light the logs.');
  game.actions.start(player, {
    name: 'firemaking', anim: 'craft', tool: 'tinderbox', delay: 1, interval: 1,
    onTick: () => {
      if (!game.groundItems.has(gi.uid)) return false;
      if (player.x !== gi.x || player.y !== gi.y) return false;
      const lvl = player.skills.getCurrent('firemaking');
      const chance = Math.min(1, 0.35 + (lvl - data.level) * 0.025);
      if (Math.random() > chance) return true; // keep trying
      game.removeGroundItem(gi);
      const fire = game.spawnObject('fire', gi.x, gi.y);
      fire.state = { ...(fire.state || {}), owner: player.name };
      player.skills.addXp('firemaking', data.xp);
      game.message('The fire catches and the logs begin to burn.');
      game.events.emit('production:make', { player, recipe: { id: `burn_${gi.itemId}`, skill: 'firemaking' }, qty: 1, success: true });
      const ticks = rand.int(data.burnTicks[0], data.burnTicks[1]);
      game.schedule(ticks, () => {
        if (!game.objects.has(fire.uid)) return;
        game.removeObject(fire);
        game.spawnGroundItem('ashes', 1, fire.x, fire.y, {});
      });
      stepAway(player);
      return false;
    },
  });
  return true;
}

/** Tinderbox used on logs in the inventory: drop the logs and light them. */
function lightFromInventory(player, slot, logId) {
  const data = getData('firemaking', logId);
  if (!data) return false;
  if (player.skills.getCurrent('firemaking') < data.level) { game.message(`You need a Firemaking level of ${data.level} to burn these logs.`); return true; }
  if (!canLightHere(player.x, player.y) || game.groundItemsAt(player.x, player.y).some((g) => getData('firemaking', g.itemId))) { game.message("You can't light a fire here."); return true; }
  const it = player.inventory.get(slot);
  if (!it || it.id !== logId) return true;
  player.inventory.removeAt(slot, 1);
  const gi = game.spawnGroundItem(logId, 1, player.x, player.y, { owner: player.name });
  return lightGroundLogs(player, gi);
}

export function init(g) {
  game = g;
  const I = game.interactions;
  const logs = allData('firemaking').map(([id]) => id);

  I.onItemOnItem('tinderbox', logs, ({ player, other, otherSlot }) => lightFromInventory(player, otherSlot, other.id));
  I.onGroundItem('Light', logs, ({ player, target }) => lightGroundLogs(player, target), { range: 0 });
  I.onItemOnGround(['tinderbox'], logs, ({ player, target }) => lightGroundLogs(player, target), { range: 0 });

  // add 'Light' to the right-click menu of logs lying on the ground
  game.events.on('menu:entries', (e) => {
    if (e.selected) return;
    for (let i = e.entries.length - 1; i >= 0; i--) {
      const en = e.entries[i];
      if (en.option !== 'Take' || en.entity?.type !== 'ground' || !getData('firemaking', en.entity.itemId)) continue;
      const gi = en.entity;
      e.entries.splice(i + 1, 0, {
        option: 'Light', targetHtml: en.targetHtml || `<span style="color:#ff9040">${escapeHtml(getItem(gi.itemId).name)}</span>`, cross: 'red', entity: gi,
        action: () => game.interact(game.player, gi, 'Light'),
      });
    }
  });
}
