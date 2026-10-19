// Prayer system. OWNER: agent A.
// STARTER IMPLEMENTATION: toggling from the Prayer tab ('ui:prayer'), exclusive groups, point drain,
// altar recharge, burying bones. Exposes game.prayer.multiplier(player, skill) for combat.

import { getPrayer, getData } from '../core/registry.js';

export function init(game) {
  const ev = game.events;

  game.prayer = {
    /** Product of active prayer effects for a stat (attack/strength/defence/ranged/magic). */
    multiplier(player, skill) {
      let m = 1;
      for (const id of player.activePrayers) m *= getPrayer(id)?.effects?.[skill] ?? 1;
      return m;
    },
    deactivateAll(player) {
      if (!player.activePrayers.size) return;
      player.activePrayers.clear();
      ev.emit('prayer:change', { player });
    },
  };

  ev.on('ui:prayer', (e) => {
    if (e.handled) return;
    e.handled = true;
    const p = e.player, pr = getPrayer(e.id);
    if (!pr) return;
    if (p.activePrayers.has(pr.id)) { p.activePrayers.delete(pr.id); ev.emit('prayer:change', { player: p }); return; }
    if (p.skills.getLevel('prayer') < pr.level) { game.message(`You need a Prayer level of ${pr.level} to use ${pr.name}.`); return; }
    if (p.skills.getCurrent('prayer') <= 0) { game.message('You need to recharge your Prayer at an altar.'); return; }
    if (pr.group) for (const id of [...p.activePrayers]) if (getPrayer(id)?.group === pr.group) p.activePrayers.delete(id);
    p.activePrayers.add(pr.id);
    ev.emit('prayer:change', { player: p });
  });

  // drain: each tick add the sum of active drain rates; lose a point every (60 + 2*prayerBonus)
  game.onTick(() => {
    const p = game.player;
    if (!p.activePrayers.size || p.dead) return;
    const st = p.store('prayer');
    let rate = 0;
    for (const id of p.activePrayers) rate += getPrayer(id)?.drain ?? 1;
    st.acc = (st.acc || 0) + rate;
    const resist = 60 + 2 * p.equipment.bonuses().prayer;
    while (st.acc >= resist) {
      st.acc -= resist;
      p.skills.setCurrent('prayer', p.skills.getCurrent('prayer') - 1);
    }
    if (p.skills.getCurrent('prayer') <= 0) {
      game.prayer.deactivateAll(p);
      game.message('You have run out of Prayer points; you can recharge at an altar.');
    }
  }, 20);

  game.interactions.onObject('Pray-at', '*', ({ player }) => {
    game.playAnim(player, 'pickup', 1200);
    if (player.skills.getCurrent('prayer') >= player.skills.getLevel('prayer')) { game.message('You already have full Prayer points.'); return; }
    player.skills.setCurrent('prayer', player.skills.getLevel('prayer'));
    game.message('You recharge your Prayer points.');
  });

  game.interactions.onItem('Bury', '*', ({ player, slot, item }) => {
    const data = getData('bones', item.id);
    if (!data) return false;
    if ((player.buryDelayUntil || 0) > game.tickCount) return;
    player.buryDelayUntil = game.tickCount + 2;
    player.inventory.removeAt(slot, 1);
    game.playAnim(player, 'bury', 1000);
    game.message('You dig a hole in the ground...');
    game.schedule(1, () => { game.message('You bury the bones.'); player.skills.addXp('prayer', data.xp); });
  });

  game.events.on('player:respawn', ({ player }) => game.prayer.deactivateAll(player));
}
