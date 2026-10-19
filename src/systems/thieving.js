// Thieving. OWNER: agent F.
// Pickpocketing (stun + damage on failure, purses), market stalls watched by guards, locked chests
// (lockpicks, traps) and lockable doors. Data: see content/thieving.js.

import { getData, allData, getItem, getNpc } from '../core/registry.js';
import { rand } from '../core/rng.js';

let game;
const qtyOf = (q) => (Array.isArray(q) ? rand.int(q[0], q[1]) : q ?? 1);
const MAX_PURSES = 28;

/** Weighted pick from a loot list, ignoring items that don't exist. */
function pick(loot) {
  const list = (loot || []).filter((l) => getItem(l.id));
  const total = list.reduce((a, l) => a + (l.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const l of list) { r -= l.weight ?? 1; if (r < 0) return l; }
  return list[0];
}

function stunned(player) { return (player.stunnedUntil || 0) > game.tickCount; }

function stun(player, source, ticks, dmg) {
  player.stunnedUntil = game.tickCount + ticks;
  game.actions.stop(player, 'interrupted');
  player.path = [];
  game.actions.lock(player, ticks);
  game.spawnEffect('sparkle', player, { color: 0xffe040 });
  game.playAnim(player, 'block', 900);
  const d = Array.isArray(dmg) ? rand.int(dmg[0], dmg[1]) : dmg ?? 1;
  if (d > 0) game.applyDamage(player, d, { source: null, type: 'typeless' });
  game.message("You've been stunned!");
}

/** Success chance for a level-gated thieving attempt. */
function chance(level, req, base = 0.55, cap = 0.95) {
  let c = base + (level - req) * 0.015;
  if (game.player.equipment.ids().hands === 'nimble_gloves') c += 0.05;
  return Math.max(0.05, Math.min(cap, c));
}

function lootTo(player, l) {
  const q = qtyOf(l.qty);
  const pd = getData('thieving_purse', l.id);
  if (pd && player.inventory.count(l.id) + q > MAX_PURSES) {
    game.message(`You need to open your ${getItem(l.id).name.toLowerCase()}s before you can carry any more.`);
    return false;
  }
  if (player.inventory.capacityFor(l.id) < q) { game.message("You don't have enough inventory space."); return false; }
  player.inventory.add(l.id, q);
  return q;
}

export function init(g) {
  game = g;
  const I = game.interactions;

  // ---- pickpocketing -----------------------------------------------------------------------------
  const pocketIds = allData('pickpocket').map(([id]) => id);
  // make sure every target offers the option (agent D's NPCs may not list it)
  for (const id of pocketIds) {
    const def = getNpc(id);
    if (def && !def.options.includes('Pickpocket')) def.options = [...def.options, 'Pickpocket'];
  }
  I.onNpc('Pickpocket', pocketIds, ({ player, target }) => {
    const d = getData('pickpocket', target.id);
    if (!d) return false;
    if (stunned(player)) { game.message("You're stunned!"); return; }
    if (player.skills.getLevel('thieving') < d.level) { game.message(`You need a Thieving level of ${d.level} to pickpocket the ${target.name.toLowerCase()}.`); return; }
    if (target.combatTarget) { game.message("You can't pickpocket someone who is fighting."); return; }
    if (player.inventory.isFull() && !d.loot.some((l) => player.inventory.has(l.id) && getItem(l.id)?.stackable)) { game.message("You don't have enough inventory space."); return; }
    game.message(`You attempt to pick the ${target.name.toLowerCase()}'s pocket.`);
    game.playAnim(player, 'pickup', 900);
    game.actions.lock(player, 2);
    game.schedule(2, () => {
      if (player.dead || target.dead) return;
      if (Math.random() < chance(player.skills.getLevel('thieving'), d.level)) {
        const l = pick(d.loot);
        if (!l || lootTo(player, l) === false) return;
        player.skills.addXp('thieving', d.xp);
        game.message(`You pick the ${target.name.toLowerCase()}'s pocket.`);
        game.events.emit('thieving:pickpocket', { player, npc: target, success: true });
      } else {
        target.faceTarget = player;
        target.path = [];
        game.say(target, ['What do you think you\'re doing?', 'Oi! Thief!', 'Hands off!'][rand.int(0, 2)], { chat: false });
        game.playAnim(target, 'punch', 600);
        game.message(`You fail to pick the ${target.name.toLowerCase()}'s pocket.`);
        stun(player, target, d.stunTicks ?? 8, d.stunDamage ?? 1);
        game.events.emit('thieving:pickpocket', { player, npc: target, success: false });
      }
    });
  });

  // ---- purses ---------------------------------------------------------------------------------------
  const purseIds = allData('thieving_purse').map(([id]) => id);
  I.onItem('Open-all', purseIds, ({ player, item }) => {
    const pd = getData('thieving_purse', item.id);
    const n = player.inventory.count(item.id);
    let coins = 0;
    for (let i = 0; i < n; i++) coins += rand.int(pd.coins[0], pd.coins[1]);
    player.inventory.remove(item.id, n);
    player.inventory.add('coins', coins);
    game.message(`You open ${n} ${getItem(item.id).name.toLowerCase()}${n > 1 ? 's' : ''} and find ${coins.toLocaleString()} coins.`);
  });

  // ---- stalls ----------------------------------------------------------------------------------------
  const stallIds = allData('thieving_stall').map(([id]) => id);
  I.onObject('Steal-from', stallIds, ({ player, target }) => {
    const d = getData('thieving_stall', target.id);
    if (!d) return false;
    if (stunned(player)) return;
    if (player.skills.getLevel('thieving') < d.level) { game.message(`You need a Thieving level of ${d.level} to steal from this stall.`); return; }
    if (player.inventory.isFull()) { game.message("You don't have enough inventory space."); return; }
    // guards nearby may notice
    {
      const watchers = game.npcsNear(player.x, player.y, 6, (n) => getData('thieving_watch', n.id) && !n.combatTarget);
      const lvl = player.skills.getLevel('thieving');
      for (const w of watchers) {
        const notice = Math.max(0.08, 0.35 - (lvl - d.level) * 0.006);
        if (Math.random() < notice) {
          game.say(w, ['Hey! Get your hands off there!', 'Thief! Stop right there!', 'I saw that!'][rand.int(0, 2)], { chat: false });
          game.message(`<col=8a0000>The ${w.name.toLowerCase()} catches you in the act!</col>`);
          if (game.combat?.retaliate) game.combat.retaliate(w, player);
          else { w.combatTarget = player; w.faceTarget = player; }
          game.events.emit('thieving:caught', { player, npc: w, stall: target.id });
          return;
        }
      }
    }
    game.playAnim(player, 'pickup', 900);
    game.actions.lock(player, 2);
    game.schedule(1, () => {
      if (target.id !== target.originalId && target.id === d.emptyId) return; // someone emptied it
      const l = pick(d.loot);
      if (!l || lootTo(player, l) === false) return;
      player.skills.addXp('thieving', d.xp);
      game.message(`You steal ${/^[aeiou]/i.test(getItem(l.id).name) ? 'an' : 'a'} ${getItem(l.id).name.toLowerCase()} from the stall.`);
      if (d.emptyId) game.replaceObject(target, d.emptyId, d.respawnTicks ?? 5);
      game.events.emit('thieving:stall', { player, stall: target.id, item: l.id });
    });
  });

  // ---- chests -------------------------------------------------------------------------------------------
  const chestIds = allData('thieving_chest').map(([id]) => id);
  I.onObject('Search-for-traps', chestIds, ({ player, target }) => {
    const d = getData('thieving_chest', target.id);
    if (!d.trap) { game.message('You find no traps on the chest.'); target.state.disarmed = true; return; }
    if (player.skills.getLevel('thieving') < d.level) { game.message(`You need a Thieving level of ${d.level} to disarm this trap.`); return; }
    game.playAnim(player, 'pickup', 900);
    game.actions.lock(player, 2);
    game.schedule(2, () => {
      if (Math.random() < chance(player.skills.getLevel('thieving'), d.level, 0.7)) {
        target.state.disarmed = game.tickCount + 100;
        game.message('You find a trap on the chest and carefully disarm it.');
        player.skills.addXp('thieving', d.xp * 0.1);
      } else {
        game.message('You fumble and set off the trap!');
        game.applyDamage(player, rand.int(d.trap.damage[0], d.trap.damage[1]), { type: 'typeless' });
      }
    });
  });
  I.onObject('Pick-lock', chestIds, ({ player, target }) => {
    const d = getData('thieving_chest', target.id);
    if (stunned(player)) return;
    if (player.skills.getLevel('thieving') < d.level) { game.message(`You need a Thieving level of ${d.level} to pick this lock.`); return; }
    if (d.lockpick && !player.inventory.has('lockpick')) { game.message('You need a lockpick for this lock.'); return; }
    if (d.trap && !(target.state.disarmed > game.tickCount)) {
      game.message('<col=8a0000>A hidden needle springs out of the lock!</col>');
      game.applyDamage(player, rand.int(d.trap.damage[0], d.trap.damage[1]), { type: 'typeless' });
      game.combat?.poison?.(player, 4);
      return;
    }
    game.message('You attempt to pick the lock...');
    game.playAnim(player, 'pickup', 1200);
    game.actions.lock(player, 3);
    game.schedule(3, () => {
      if (target.id !== target.originalId) return;
      if (Math.random() < chance(player.skills.getLevel('thieving'), d.level, 0.6)) {
        const l = pick(d.loot);
        if (!l) return;
        const q = qtyOf(l.qty);
        game.giveItem(l.id, q, player);
        player.skills.addXp('thieving', d.xp);
        const nm = getItem(l.id).name.toLowerCase();
        const what = l.id === 'coins' ? `${q.toLocaleString()} coins` : q > 1 ? `${q} x ${nm}` : `${/^[aeiou]/.test(nm) ? 'an' : 'a'} ${nm}`;
        game.message(`You manage to pick the lock and find ${what} inside.`);
        target.state.disarmed = 0;
        game.replaceObject(target, d.openId, d.respawnTicks ?? 20);
        game.events.emit('thieving:chest', { player, chest: target.id });
      } else {
        game.message('You fail to pick the lock.');
        if (d.lockpick && Math.random() < 0.1) { player.inventory.remove('lockpick', 1); game.message('Your lockpick snaps.'); }
      }
    });
  });

  // ---- locked doors -----------------------------------------------------------------------------------------
  const doorIds = allData('thieving_door').map(([id]) => id);
  I.onObject('Pick-lock', doorIds, ({ player, target }) => {
    const d = getData('thieving_door', target.id);
    const inside = d.inside, outside = d.outside;
    const isInside = player.x === inside[0] && player.y === inside[1] || game.world.buildingAt?.(player.x, player.y);
    if (isInside) { // leaving is always allowed
      passDoor(player, target, outside);
      return;
    }
    if (player.skills.getLevel('thieving') < d.level) { game.message(`You need a Thieving level of ${d.level} to pick this lock.`); return; }
    if (d.lockpick && !player.inventory.has('lockpick')) { game.message('You need a lockpick for this lock.'); return; }
    game.message('You attempt to pick the lock...');
    game.playAnim(player, 'pickup', 1200);
    game.actions.lock(player, 2);
    game.schedule(2, () => {
      if (Math.random() < chance(player.skills.getLevel('thieving'), d.level, 0.7)) {
        player.skills.addXp('thieving', d.xp);
        game.message('You pick the lock.');
        passDoor(player, target, inside);
      } else game.message('You fail to pick the lock.');
    });
  });

  function passDoor(player, door, to) {
    game.actions.lock(player, 2);
    game.forceWalk(player, [{ x: door.x, y: door.y }, { x: to[0], y: to[1] }, { x: to[0], y: to[1] }], {});
  }

  game.thieving = { chance, stun, isStunned: stunned };
}
