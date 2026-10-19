// Herblore (agent C): cleaning grimy herbs, drinking potions (dose by dose, boosts that decay
// through the engine's passive restore), combining doses, wine. Potion data: registerData('potion', id).

import { getData, allData, getItem } from '../core/registry.js';
import { SKILL_NAMES } from '../core/constants.js';

let game;

const amount = (base, pct, level) => Math.floor(base + pct * level);

/** Apply one potion effect to a player. */
function applyEffect(p, e) {
  const S = p.skills;
  if (e.boost) for (const s of e.boost) { const b = S.getLevel(s); S.setCurrent(s, Math.max(S.getCurrent(s), b + amount(e.base, e.pct, b))); }
  if (e.drain) for (const s of e.drain) { const b = S.getLevel(s); S.setCurrent(s, Math.max(0, S.getCurrent(s) - amount(e.base, e.pct, b))); }
  if (e.restore) for (const s of e.restore) { if (s === 'hitpoints' || s === 'prayer') continue; S.restore(s, amount(e.base, e.pct, S.getLevel(s))); }
  if (e.prayer) {
    const b = S.getLevel('prayer');
    const n = amount(e.base, e.pct, b);
    if (game.prayer?.restorePoints) game.prayer.restorePoints(p, n); else S.setCurrent('prayer', Math.min(b, S.getCurrent('prayer') + n));
  }
  if (e.heal) {
    const n = amount(e.base, e.pct, p.maxHp);
    if (e.over) p.hp = Math.min(p.maxHp + n, p.hp + n); else game.heal(p, n);
  }
  if (e.energy) { p.runEnergy = Math.min(10000, (p.runEnergy || 0) + e.energy * 100); game.events.emit('run:change', { player: p }); }
  if (e.antidote) {
    if (game.combat?.curePoison) game.combat.curePoison(p, e.antidote);
    else p.store('combat').poisonImmune = e.antidote;
  }
}

function drink(player, slot, item) {
  const d = getData('potion', item.id);
  if (!d) return false;
  if ((player.drinkDelayUntil || 0) > game.tickCount) return true;
  player.drinkDelayUntil = game.tickCount + 3;
  player.attackTimer = Math.max(player.attackTimer || 0, 2);
  player.inventory.set(slot, { id: d.next, qty: 1 });
  for (const e of d.effects) applyEffect(player, e);
  game.playAnim(player, 'drink', 900);
  game.message(`You drink some of your ${d.name.toLowerCase()}.`);
  game.message(d.doses > 1 ? `You have ${d.doses - 1} dose${d.doses > 2 ? 's' : ''} of potion left.` : 'You have finished your potion.');
  game.events.emit('item:drink', { player, item, potion: d.potion });
  return true;
}

export function init(g) {
  game = g;
  const I = game.interactions;
  const potions = allData('potion').map(([id]) => id);

  // ---- clean -------------------------------------------------------------------------------------
  const grimy = allData('herb').map(([id]) => id);
  I.onItem('Clean', grimy, ({ player, slot, item }) => {
    const h = getData('herb', item.id);
    if (player.skills.getCurrent('herblore') < h.level) { game.message(`You need a Herblore level of ${h.level} to clean this herb.`); return; }
    if ((player.cleanDelayUntil || 0) > game.tickCount) return;
    player.cleanDelayUntil = game.tickCount + 1;
    player.inventory.set(slot, { id: h.clean, qty: 1 });
    player.skills.addXp('herblore', h.xp);
    game.message(`You clean the ${getItem(h.clean).name.toLowerCase()}.`);
  });

  // ---- drink ------------------------------------------------------------------------------------
  I.onItem('Drink', potions, ({ player, slot, item }) => drink(player, slot, item));
  I.onItem('Drink', ['jug_of_wine'], ({ player, slot, def }) => {
    if ((player.drinkDelayUntil || 0) > game.tickCount) return;
    player.drinkDelayUntil = game.tickCount + 3;
    player.inventory.set(slot, { id: 'jug', qty: 1 });
    game.heal(player, def.drinkHeal || 11);
    player.skills.setCurrent('attack', Math.max(0, player.skills.getCurrent('attack') - 2));
    game.playAnim(player, 'drink', 900);
    game.message('You drink the wine. It heals some health, and you feel slightly reckless.');
  });

  // ---- combine doses: potion on potion of the same kind ---------------------------------------------
  I.onItemOnItem(potions, potions, ({ player, item, slot, other, otherSlot }) => {
    const a = getData('potion', item.id), b = getData('potion', other.id);
    if (a.potion !== b.potion) return false;
    const total = a.doses + b.doses;
    const into = Math.min(4, total), left = total - into;
    player.inventory.set(otherSlot, { id: `${a.potion}_${into}`, qty: 1 });
    player.inventory.set(slot, left > 0 ? { id: `${a.potion}_${left}`, qty: 1 } : { id: 'vial', qty: 1 });
    game.message(`You combine the doses: ${a.name}(${into})${left ? ` and (${left})` : ''}.`);
  });
  // empty a potion out
  I.onItem('Empty', potions, ({ player, slot }) => { player.inventory.set(slot, { id: 'vial', qty: 1 }); game.message('You empty the vial.'); });

  game.herblore = { applyEffect, drink, skillName: (s) => SKILL_NAMES[s] };
}
