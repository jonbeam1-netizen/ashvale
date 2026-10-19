// Thieving. OWNER: agent F.
// STARTER IMPLEMENTATION: stall stealing + pickpocketing from registerData('thieving_stall' | 'pickpocket').

import { getData, getItem } from '../core/registry.js';
import { rand } from '../core/rng.js';

const qtyOf = (q) => (Array.isArray(q) ? rand.int(q[0], q[1]) : q ?? 1);

export function init(game) {
  const I = game.interactions;

  I.onObject('Steal-from', '*', ({ player, target }) => {
    const d = getData('thieving_stall', target.id);
    if (!d) return false;
    if (player.skills.getLevel('thieving') < d.level) { game.message(`You need a Thieving level of ${d.level} to steal from this stall.`); return; }
    if (player.inventory.isFull()) { game.message("You don't have enough inventory space."); return; }
    game.playAnim(player, 'pickup', 900);
    game.actions.lock(player, 2);
    game.schedule(1, () => {
      const loot = d.loot[Math.floor(Math.random() * d.loot.length)];
      player.inventory.add(loot.id, qtyOf(loot.qty));
      player.skills.addXp('thieving', d.xp);
      game.message(`You steal ${getItem(loot.id).name.toLowerCase()} from the stall.`);
      if (d.emptyId) game.replaceObject(target, d.emptyId, d.respawnTicks ?? 5);
    });
  });

  I.onNpc('Pickpocket', '*', ({ player, target }) => {
    const d = getData('pickpocket', target.id);
    if (!d) return false;
    if (player.skills.getLevel('thieving') < d.level) { game.message(`You need a Thieving level of ${d.level} to pickpocket this.`); return; }
    if ((player.stunnedUntil || 0) > game.tickCount) return;
    game.message(`You attempt to pick the ${target.name.toLowerCase()}'s pocket.`);
    game.playAnim(player, 'pickup', 900);
    game.actions.lock(player, 2);
    game.schedule(2, () => {
      const lvl = player.skills.getLevel('thieving');
      const chance = Math.min(0.95, 0.55 + (lvl - d.level) * 0.02);
      if (Math.random() < chance) {
        const loot = d.loot[Math.floor(Math.random() * d.loot.length)];
        player.inventory.add(loot.id, qtyOf(loot.qty));
        player.skills.addXp('thieving', d.xp);
        game.message(`You pick the ${target.name.toLowerCase()}'s pocket.`);
      } else {
        game.say(target, 'What do you think you\'re doing?', { chat: false });
        target.faceTarget = player;
        game.message("You fail to pick the pocket. You've been stunned!");
        game.applyDamage(player, d.stunDamage ?? 1, { source: target, type: 'typeless' });
        player.stunnedUntil = game.tickCount + (d.stunTicks ?? 8);
        game.actions.lock(player, d.stunTicks ?? 8);
      }
    });
  });
}
