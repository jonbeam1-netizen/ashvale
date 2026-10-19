// Utility spells: teleports, transmutation (alchemy), Forgeheart (smelt in hand), Marrowbloom,
// Hearthward home teleport. OWNER: agent F. Imported by systems/magic_utility.js (not content/index.js),
// i.e. evaluated after every content module.
//
// Contract with agent A's magic system: spell.onCast(game, player, target) performs the effect and
// returns false to cancel (then no sigils are consumed and no xp is given). Level and sigil checks,
// sigil consumption and spell.xp happen in the caster (A's tab, or systems/magic_utility.js).
// Extra fields used here: questReq (quest id that must be complete), dest {x, y, name}.

import { registerSpell, getSpell, registerItem, getItem, recipesFor, getQuest } from '../core/registry.js';

const T = (x, y, name) => ({ x, y, name });

// ---- helpers used by onCast handlers ---------------------------------------------------------------
/** Item spells accept {item, slot} (interaction ctx), {slot} or a plain {id, qty}. */
function itemOf(player, target) {
  if (!target) return null;
  if (target.item?.id) return target.item;
  if (typeof target.slot === 'number') return player.inventory.get(target.slot);
  if (target.id && getItem(target.id)) return target;
  return null;
}
function questLocked(game, player, spell) {
  if (!spell.questReq) return false;
  if (game.quests?.isComplete(spell.questReq)) return false;
  game.message(`You need to complete ${getQuest(spell.questReq)?.name || 'a quest'} to cast this spell.`);
  return true;
}

function canTeleport(game, player) {
  if (game.wilderness?.canTeleport) {
    const r = game.wilderness.canTeleport(player);
    if (r === false || r?.ok === false) { game.message(r?.reason || 'A mysterious force prevents you from teleporting.'); return false; }
    return true;
  }
  if (game.world.getWildernessLevel(player.x, player.y) > 20) { game.message('A mysterious force prevents you from teleporting.'); return false; }
  return true;
}

/** Shared teleport sequence: cast animation, sparkles, move after `delay` ticks. */
export function teleportPlayer(game, player, x, y, opts = {}) {
  const delay = opts.delay ?? 3;
  game.ui.closeInterfaces();
  game.actions.stop(player, 'teleport');
  player.interaction = null;
  player.combatTarget = null;
  player.path = [];
  player.teleportUntil = game.tickCount + delay + 2;
  game.actions.lock(player, delay + 1);
  game.playAnim(player, 'cast', 1800);
  game.spawnEffect('teleport', player, { color: opts.color ?? 0x9a7aff });
  game.schedule(delay, () => {
    if (player.dead) return;
    game.teleport(player, x, y);
    player.elevation = 0;
    game.spawnEffect('teleport', player, { color: opts.color ?? 0x9a7aff });
    opts.onArrive?.();
  });
}

function teleportSpell(def) {
  return registerSpell({
    type: 'teleport', targets: [], icon: { shape: 'star', color: def.color || '#9a7aff', color2: '#ffffff' },
    description: `Teleports you to ${def.dest.name}.`,
    ...def,
    onCast(game, player) {
      if ((player.teleportUntil || 0) > game.tickCount) return false;
      if (questLocked(game, player, this)) return false;
      if (!canTeleport(game, player)) return false;
      teleportPlayer(game, player, this.dest.x, this.dest.y, { color: parseInt((this.color || '#9a7aff').slice(1), 16) });
      return true;
    },
  });
}

// ---- city & landmark teleports -------------------------------------------------------------------
teleportSpell({ id: 'brackenford_teleport', name: 'Brackenford Teleport', level: 25, xp: 35, runes: { nexus_sigil: 1, wind_sigil: 3, fire_sigil: 1 }, dest: T(96, 139, 'the Brackenford town square'), color: '#e8a040' });
teleportSpell({ id: 'thornwood_teleport', name: 'Thornwood Teleport', level: 31, xp: 41, runes: { nexus_sigil: 1, wind_sigil: 3, earth_sigil: 2 }, dest: T(62, 138, 'the Thornwood crossroads'), color: '#4aa040' });
teleportSpell({ id: 'greystone_teleport', name: 'Greystone Teleport', level: 37, xp: 48, runes: { nexus_sigil: 1, wind_sigil: 3, earth_sigil: 3 }, dest: T(47, 89, 'Greystone Quarry'), color: '#a09a8a' });
teleportSpell({ id: 'highmarch_teleport', name: 'Highmarch Teleport', level: 45, xp: 55.5, runes: { nexus_sigil: 1, wind_sigil: 5, water_sigil: 1 }, dest: T(161, 80, 'the Highmarch market'), color: '#5a7ad8' });
teleportSpell({ id: 'haverly_teleport', name: 'Haverly Teleport', level: 51, xp: 61, runes: { nexus_sigil: 2, water_sigil: 2, earth_sigil: 2 }, dest: T(157, 158, 'Haverly Farms'), color: '#c8c040' });
teleportSpell({ id: 'saltmarsh_teleport', name: 'Saltmarsh Teleport', level: 58, xp: 68, runes: { nexus_sigil: 2, water_sigil: 4, wind_sigil: 2 }, dest: T(140, 178, 'the Saltmarsh Coast'), color: '#40b0c8', questReq: 'wayward_compass' });
teleportSpell({ id: 'calder_teleport', name: 'Calder Ruins Teleport', level: 64, xp: 74, runes: { nexus_sigil: 2, fire_sigil: 4, wind_sigil: 2 }, dest: T(96, 37, 'the road to the Calder Ruins (Wilderness level 11)'), color: '#c84020', questReq: 'wayward_compass' });

// ---- Hearthward home teleport (overrides the Phase 1 definition in spells.js) ----------------------
const HOME = { x: 96, y: 141 };
const HOME_COOLDOWN = 1000; // ticks (10 minutes)
const hearth = {
  name: 'Hearthward Teleport', level: 1, xp: 0, type: 'utility', runes: {}, targets: [], teleport: undefined, noAnim: true, cooldown: 1,
  description: 'A slow ritual that returns you home to Brackenford. No sigils needed; usable every 10 minutes.',
  icon: { shape: 'star', color: '#80c0ff', color2: '#ffe080' },
  onCast(game, player) {
    const st = player.store('magic_utility');
    const left = st.hearthAt == null ? 0 : st.hearthAt + HOME_COOLDOWN - player.playTime;
    if (left > 0) { game.message(`You need to wait another ${Math.ceil((left * 0.6) / 60)} minute(s) to cast this spell.`); return false; }
    const fighting = game.combat?.inCombat ? game.combat.inCombat(10) : game.tickCount - (player.lastAttackedTick ?? -999) < 10;
    if (player.combatTarget || fighting) { game.message("You can't do that while in combat."); return false; }
    if (!canTeleport(game, player)) return false;
    game.ui.closeInterfaces();
    const sx = player.x, sy = player.y;
    game.actions.start(player, {
      name: 'hearthward', anim: 'herblore',
      onStart: () => game.message('You begin the Hearthward ritual...'),
      onTick: ({ ticks }) => {
        if (player.x !== sx || player.y !== sy || game.tickCount - (player.lastAttackedTick ?? -999) < 2) return false;
        if (ticks % 3 === 0) game.spawnEffect('sparkle', player, { color: 0x80c0ff });
        if (ticks >= 9) {
          st.hearthAt = player.playTime;
          teleportPlayer(game, player, HOME.x, HOME.y, { color: 0x80c0ff, delay: 2 });
          return false;
        }
        return true;
      },
      onStop: (ctx, reason) => { if (reason !== 'done' && reason !== 'teleport') game.message('Your ritual is interrupted.'); },
    });
    return true;
  },
};
const existing = getSpell('hearth_teleport');
if (existing) { Object.assign(existing, hearth); delete existing.teleport; } else registerSpell({ id: 'hearth_teleport', ...hearth });

// ---- transmutation (alchemy) -------------------------------------------------------------------------
function transmute(def) {
  return registerSpell({
    type: 'alchemy', targets: ['item'], ...def,
    onCast(game, player, target) {
      const it = itemOf(player, target);
      if (!it) return false;
      const item = getItem(it.id);
      if (it.id === 'coins') { game.message("You can't transmute coins."); return false; }
      if (!item || item.tradeable === false || item.alchable === false) { game.message('This item resists the transmutation.'); return false; }
      if ((player.alchUntil || 0) > game.tickCount) return false;
      const coins = Math.max(1, Math.floor((item.value || 1) * this.rate));
      const slot = player.inventory.get(target?.slot)?.id === it.id ? target.slot : player.inventory.indexOf(it.id);
      if (slot < 0) return false;
      player.inventory.removeAt(slot, 1);
      player.inventory.add('coins', coins);
      player.alchUntil = game.tickCount + 4;
      game.actions.lock(player, 3);
      game.playAnim(player, 'cast', 1500);
      game.spawnEffect('sparkle', player, { color: 0xffd040 });
      game.message(`The ${item.name.toLowerCase()} shimmers into ${coins.toLocaleString()} coins.`);
      game.ui.selectTab?.('magic');
      return true;
    },
  });
}
transmute({ id: 'lesser_transmutation', name: 'Lesser Transmutation', level: 21, xp: 31, rate: 0.4, runes: { fire_sigil: 3, thorn_sigil: 1 },
  description: 'Turns an item into coins (40% of its value).', icon: { shape: 'coins', color: '#c8a040' } });
transmute({ id: 'greater_transmutation', name: 'Greater Transmutation', level: 55, xp: 65, rate: 0.6, runes: { fire_sigil: 5, thorn_sigil: 1 },
  description: 'Turns an item into coins (60% of its value).', icon: { shape: 'coins', color: '#ffd040', color2: '#fff8c0' } });

// ---- Forgeheart: smelt one ore into a bar without a furnace --------------------------------------------
registerSpell({
  id: 'forgeheart', name: 'Forgeheart', level: 43, xp: 53, type: 'utility', targets: ['item'], runes: { fire_sigil: 4, thorn_sigil: 1 },
  description: 'Smelts ore into a bar in your hands (uses coal from your pack when needed).', icon: { shape: 'bar', color: '#ff7030' },
  onCast(game, player, target) {
    const it = itemOf(player, target);
    if (!it) return false;
    const recipes = recipesFor('smithing').filter((r) => r.category === 'smelt' && r.inputs.some((i) => i.id === it.id));
    // prefer the recipe whose *main* (non-coal) ore is this item
    const recipe = recipes.find((r) => r.inputs[0].id === it.id) || recipes.find((r) => r.inputs.every((i) => player.inventory.has(i.id, i.qty)));
    if (!recipe) { game.message('You can only cast Forgeheart on ore.'); return false; }
    if (player.skills.getLevel('smithing') < recipe.level) { game.message(`You need a Smithing level of ${recipe.level} to smelt this.`); return false; }
    const missing = recipe.inputs.find((i) => !player.inventory.has(i.id, i.qty));
    if (missing) { game.message(`You need ${missing.qty} x ${getItem(missing.id)?.name || missing.id} to smelt this.`); return false; }
    for (const i of recipe.inputs) player.inventory.remove(i.id, i.qty);
    for (const o of recipe.outputs) player.inventory.add(o.id, o.qty);
    player.skills.addXp('smithing', recipe.xp || 0);
    game.actions.lock(player, 2);
    game.playAnim(player, 'cast', 1300);
    game.spawnEffect('sparkle', player, { color: 0xff7030 });
    const bar = getItem(recipe.outputs[0].id)?.name.toLowerCase() || 'bar';
    game.message(`The ore glows white-hot and fuses into ${/^[aeiou]/.test(bar) ? 'an' : 'a'} ${bar}.`);
    game.ui.selectTab?.('magic');
    return true;
  },
});

// ---- Marrowbloom: bones into marrowfruit ---------------------------------------------------------------
registerItem({ id: 'marrowfruit', name: 'Marrowfruit', examine: 'A pale, sweet fruit that grew from old bones. Better not think about it.', value: 2, heal: 3, icon: { shape: 'egg', color: '#f0e8c8', color2: '#c8b880' } });
const BONE_IDS = ['bones', 'big_bones', 'bat_bones', 'wolf_bones', 'monkey_bones'];
registerSpell({
  id: 'marrowbloom', name: 'Marrowbloom', level: 15, xp: 25, type: 'utility', targets: [], runes: { earth_sigil: 2, water_sigil: 2, thorn_sigil: 1 },
  description: 'Makes every set of bones in your pack blossom into marrowfruit.', icon: { shape: 'bones', color: '#f0e8c8' },
  onCast(game, player) {
    let n = 0;
    for (let s = 0; s < player.inventory.size; s++) {
      const it = player.inventory.get(s);
      if (it && (BONE_IDS.includes(it.id) || /_bones$/.test(it.id))) { player.inventory.set(s, { id: 'marrowfruit', qty: 1 }); n++; }
    }
    if (!n) { game.message("You aren't carrying any bones."); return false; }
    game.playAnim(player, 'cast', 1300);
    game.spawnEffect('sparkle', player, { color: 0xf0e8c8 });
    game.message(`${n} set${n > 1 ? 's' : ''} of bones blossom into marrowfruit.`);
    return true;
  },
});

export const UTILITY_SPELLS = [
  'brackenford_teleport', 'thornwood_teleport', 'greystone_teleport', 'highmarch_teleport', 'haverly_teleport', 'saltmarsh_teleport', 'calder_teleport',
  'hearth_teleport', 'lesser_transmutation', 'greater_transmutation', 'forgeheart', 'marrowbloom',
];
