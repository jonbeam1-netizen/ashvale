// The Drowned Sun - rewards (personal reliquary rolls), raid-only supplies (cistern gathering / cooking / brewing /
// tonics), ornament kits and the passive effects of the unique gear. Driven by systems/raid.js (context R).
//
// Personal loot: every player opens the reliquary on their own client and rolls from the shared team points:
//   personal = teamPoints * (1 + 0.2 * (party - 1)) / party;  unique chance = min(50%, personal / 80 000)
// plus 2-5 common rolls scaled by `personal`, a 1/15 roll for each ornament kit and a 1/40 roll for the Sunling.
// Claimed runs are remembered per player (player.store('raid').claimed), so a chest can't be opened twice.

import { getItem } from '../core/registry.js';
import { el, escapeHtml } from '../ui/util.js';
import { getItemIcon } from '../ui/icons.js';
import { RAID_UNIQUES, ORNAMENTS, SUNWROUGHT_SET } from '../content/raid_items.js';
import { RAID_NAME } from '../content/raid.js';

let game;
const rnd = (n) => Math.floor(Math.random() * n);
const between = (a, b) => a + rnd(b - a + 1);

const COMMON = [
  { id: 'coins', qty: [30000, 90000], weight: 6 },
  { id: 'aether_sigil', qty: [90, 220], weight: 4 },
  { id: 'crimson_sigil', qty: [60, 160], weight: 3 },
  { id: 'void_sigil', qty: [120, 280], weight: 4 },
  { id: 'wyrm_bones', qty: [6, 14], weight: 4 },
  { id: 'frost_wyrm_bones', qty: [4, 9], weight: 2 },
  { id: 'emberite_bar', qty: [6, 14], weight: 3 },
  { id: 'emberite_ore', qty: [12, 28], weight: 3 },
  { id: 'starwood_logs', qty: [30, 80], weight: 3 },
  { id: 'grimy_wyrmtongue', qty: [4, 10], weight: 3 },
  { id: 'grimy_ghostlily', qty: [3, 8], weight: 3 },
  { id: 'ghostlily_seed', qty: [1, 3], weight: 1 },
  { id: 'raw_heartstone', qty: [15, 35], weight: 3 },
  { id: 'emberite_arrows', qty: [90, 220], weight: 3 },
  { id: 'ancient_coin', qty: [2, 6], weight: 2 },
  { id: 'renewal_potion_4', qty: [2, 4], weight: 2 },
  { id: 'champion_potion_4', qty: [1, 3], weight: 2 },
];

const st = () => {
  const s = game.player.store('raid');
  if (!Array.isArray(s.claimed)) s.claimed = [];
  if (!s.uniques || typeof s.uniques !== 'object') s.uniques = {};
  return s;
};
function wearing(id) {
  const eq = game.player.equipment;
  for (const slot of Object.keys(eq.slots || {})) {
    const it = eq.get(slot);
    if (it && (it.id === id || it.id === `${id}_or`)) return true;
  }
  return false;
}

// =================================================================================================
// Reliquary
// =================================================================================================
function pickWeighted(list) {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of list) { r -= e.weight; if (r <= 0) return e; }
  return list[list.length - 1];
}

export function rollLoot(points, party) {
  const n = Math.max(1, Math.min(4, party || 1));
  const personal = (points * (1 + 0.2 * (n - 1))) / n;
  const loot = [];
  const add = (id, qty) => { if (!getItem(id) || qty <= 0) return; const e = loot.find((l) => l.id === id); if (e) e.qty += qty; else loot.push({ id, qty }); };
  let unique = null;
  const chance = Math.min(0.5, personal / 80000);
  if (Math.random() < chance) { unique = pickWeighted(RAID_UNIQUES).id; add(unique, 1); }
  const scale = Math.max(0.3, Math.min(2.5, personal / 20000));
  const rolls = Math.max(2, Math.min(5, 2 + Math.floor(personal / 12000)));
  for (let i = 0; i < rolls; i++) {
    const c = pickWeighted(COMMON);
    add(c.id, Math.max(1, Math.round(between(c.qty[0], c.qty[1]) * scale)));
  }
  if (Math.random() < 1 / 15) add('raid_kit_dawnfire', 1);
  if (Math.random() < 1 / 15) add('raid_kit_tidewrought', 1);
  return { loot, unique, chance, personal };
}

function openChest(R) {
  const S = R.state();
  const p = game.player;
  if (!S.run || !S.done) { game.message('The reliquary is sealed with sunstone. It will not open while Aurvael lives.'); return; }
  const s = st();
  if (s.claimed.includes(S.run)) { game.message('You have already claimed your share of this reliquary.'); return; }
  s.claimed.push(S.run);
  if (s.claimed.length > 30) s.claimed.splice(0, s.claimed.length - 30);
  const { loot, unique, chance } = rollLoot(S.pts, S.party);
  const sentToBank = [];
  for (const l of loot) {
    // piles of unstackable things (herbs, bones...) go straight to the bank instead of flooding the pack
    const pile = !getItem(l.id)?.stackable && l.qty > 1;
    if (!pile && p.inventory.capacityFor(l.id) >= l.qty) game.giveItem(l.id, l.qty);
    else { p.bank.add(l.id, l.qty); sentToBank.push(l); }
  }
  s.chests = (s.chests || 0) + 1;
  game.message(`<col=ffc040>You open the Reliquary of the Drowned Sun. (Team points ${S.pts.toLocaleString('en-US')}, your unique chance ${(chance * 100).toFixed(1)}%.)</col>`);
  if (sentToBank.length) game.message(`<col=ffc040>Sent to your bank: ${sentToBank.map((l) => `${l.qty.toLocaleString('en-US')} x ${getItem(l.id).name}`).join(', ')}.</col>`);
  if (unique) {
    s.uniques[unique] = (s.uniques[unique] || 0) + 1;
    game.message(`<col=ff3060>A relic of the choir: ${getItem(unique).name}!</col>`);
    if (R.connected()) game.net.broadcast('raid:loot', { item: unique });
  }
  for (const l of loot) if (l.id.startsWith('raid_kit_')) game.message(`<col=ffc040>You find a ${getItem(l.id).name}.</col>`);
  if (Math.random() < 1 / 40) game.pets?.award?.('sunling', RAID_NAME);
  game.events.emit('minigame:reward', { id: 'drowned_sun' });
  game.events.emit('raid:reward', { loot, unique });
  game.spawnEffect('special', p, { color: 0xffc040 });
  game.ui.openInterface({
    id: 'raid_chest', title: 'Reliquary of the Drowned Sun', width: 300,
    render: (body) => {
      body.innerHTML = '';
      const grid = el('div', 'raid-loot');
      for (const l of loot) {
        const def = getItem(l.id);
        const c = el('div', def?.raidUnique || l.id.startsWith('raid_kit_') ? 'rare' : '', `<img alt="" src="${getItemIcon(l.id, l.qty)}">${def?.stackable || l.qty > 1 ? `<span>${l.qty.toLocaleString('en-US')}</span>` : ''}`);
        c.title = def?.name || l.id;
        grid.appendChild(c);
      }
      body.appendChild(grid);
    },
  });
}

/** Completion bookkeeping on every client in the raid when Aurvael dies. */
export function onComplete(R, S) {
  const s = st();
  s.kc = (s.kc || 0) + 1;
  const ticks = S.tEnd - S.t0;
  if (!s.best || ticks < s.best) { s.best = ticks; if (s.kc > 1) game.message('<col=ffc040>A new personal best time!</col>'); }
  game.message(`<col=ffc040>Your Drowned Sun completion count is: ${s.kc}.</col>`);
}

function showRewards(npc) {
  const s = st();
  const best = s.best ? `${Math.floor(s.best * 0.6 / 60)}:${String(Math.round(s.best * 0.6) % 60).padStart(2, '0')}` : '-';
  game.ui.openInterface({
    id: 'raid_rewards', title: `${RAID_NAME} - relics`, width: 380,
    render: (body) => {
      body.innerHTML = '';
      const head = el('div', 'raid-rules', `<p>Completions: <b>${s.kc || 0}</b> &nbsp;·&nbsp; Best time: <b>${best}</b> &nbsp;·&nbsp; Chests opened: <b>${s.chests || 0}</b></p>
        <p>Your unique chance is your share of the team's points (with a small group bonus) out of 80,000, up to 50%. Kits drop 1 in 15 each; the Sunling 1 in 40.</p>`);
      body.appendChild(head);
      for (const u of RAID_UNIQUES) {
        const def = getItem(u.id);
        const row = el('div', 'raid-uniq', `<img alt="" src="${getItemIcon(u.id, 1)}"><div>${escapeHtml(def.name)} ${s.uniques[u.id] ? `<b style="color:#60e060">x${s.uniques[u.id]}</b>` : ''}<small>${escapeHtml(def.examine)}</small></div>`);
        body.appendChild(row);
      }
    },
  });
  if (npc) npc.talkingTo = null;
}

// =================================================================================================
// Cistern supplies
// =================================================================================================
function gatherAction(player, { name, anim, interval, item, xp, skill, chance, verb, full }) {
  if (player.inventory.isFull()) { game.message(full || 'Your pack is too full.'); return; }
  game.message(verb);
  game.actions.start(player, {
    name, anim, delay: interval, interval,
    onTick: () => {
      if (player.inventory.isFull()) { game.message(full || 'Your pack is too full.'); return false; }
      if (Math.random() < (typeof chance === 'function' ? chance() : chance)) {
        player.inventory.add(item, 1);
        if (skill) player.skills.addXp(skill, xp);
        if (anim === 'pickup') game.playAnim(player, 'pickup', 600);
      }
      return true;
    },
  });
}

function processAction(player, { name, anim, interval, need, make }) {
  const has = () => need.every((id) => player.inventory.has(id));
  if (!has()) return false;
  game.actions.start(player, {
    name, anim, delay: 1, interval,
    onTick: () => { if (!has()) return false; make(); return has(); },
  });
  return true;
}

function cook(player) {
  const ok = processAction(player, {
    name: 'raid_cook', anim: 'cook', interval: 3, need: ['raid_raw_eel'],
    make: () => {
      player.inventory.remove('raid_raw_eel', 1);
      const burn = Math.max(0, 0.32 - player.skills.getLevel('cooking') * 0.0035);
      if (Math.random() < burn) { player.inventory.add('raid_burnt_eel', 1); game.message('You accidentally burn the eel.'); }
      else { player.inventory.add('raid_eel', 1); player.skills.addXp('cooking', 45); }
    },
  });
  if (!ok) game.message('You have no raw eels to cook. Fish some from the cistern pool.');
}

function brew(player) {
  const ok = processAction(player, {
    name: 'raid_brew', anim: 'herblore', interval: 3, need: ['raid_glowcap', 'raid_lotus'],
    make: () => {
      player.inventory.remove('raid_glowcap', 1);
      player.inventory.remove('raid_lotus', 1);
      player.inventory.add('raid_tonic_4', 1);
      player.skills.addXp('herblore', 55);
      game.message('You brew a Sunwell tonic.');
    },
  });
  if (!ok) game.message('You need a glowcap and a drowned lotus to brew a Sunwell tonic.');
}

function drinkTonic(player, slot, def) {
  if ((player.eatDelayUntil || 0) > game.tickCount) return;
  const n = def.raidTonic;
  player.inventory.removeAt(slot, 1);
  if (n > 1) player.inventory.set(slot, { id: `raid_tonic_${n - 1}`, qty: 1 });
  player.eatDelayUntil = game.tickCount + 3;
  game.playAnim(player, 'drink', 900);
  game.heal(player, 8);
  const sk = player.skills;
  const maxPr = sk.getLevel('prayer');
  sk.setCurrent('prayer', Math.min(maxPr, sk.getCurrent('prayer') + 8 + Math.floor(maxPr * 0.12)));
  for (const s of ['attack', 'strength', 'defence', 'ranged', 'magic']) {
    const amt = 4 + Math.floor(sk.getLevel(s) * 0.1);
    sk.boost(s, amt, amt);
  }
  game.message(`You drink some of the Sunwell tonic. ${n > 1 ? `You have ${n - 1} dose${n - 1 > 1 ? 's' : ''} left.` : 'The vial crumbles to sand.'}`);
  game.events.emit('stats:change', { player, skill: 'prayer' });
}

// =================================================================================================
// Init
// =================================================================================================
export function init(R) {
  game = R.game;
  const I = game.interactions, ev = game.events;

  I.onObject('Open', ['raid_chest'], () => openChest(R));
  I.onObject('Inspect', ['raid_chest'], () => {
    const S = R.state();
    game.message(S.done ? (st().claimed.includes(S.run) ? 'You have already claimed your share.' : 'The reliquary is open. Your share is waiting.') : 'Sealed with sunstone while Aurvael lives.');
  });
  I.onNpc('Rewards', ['raid_seeker'], ({ target }) => showRewards(target));
  I.onNpc('Talk-to', ['raid_seeker'], ({ target }) => game.ui.startDialogue('raid_seeker', { npc: target }));

  // cistern
  I.onObject('Fish', ['raid_pool'], ({ player }) => gatherAction(player, {
    name: 'raid_fish', anim: 'fish', interval: 3, item: 'raid_raw_eel', skill: 'fishing', xp: 28,
    chance: () => 0.45 + player.skills.getLevel('fishing') / 250, verb: 'You lower your hands into the cold water and wait for an eel...',
  }));
  I.onObject('Pick', ['raid_glowcap_patch'], ({ player }) => gatherAction(player, {
    name: 'raid_pick', anim: 'pickup', interval: 2, item: 'raid_glowcap', skill: 'farming', xp: 10, chance: 0.85, verb: 'You start picking glowcaps.',
  }));
  I.onObject('Pick', ['raid_lotus_patch'], ({ player }) => gatherAction(player, {
    name: 'raid_pick', anim: 'pickup', interval: 2, item: 'raid_lotus', skill: 'farming', xp: 10, chance: 0.85, verb: 'You start gathering drowned lotus.',
  }));
  I.onObject('Cook', ['raid_brazier'], ({ player }) => cook(player));
  I.onItemOnObject(['raid_raw_eel'], ['raid_brazier'], ({ player }) => cook(player));
  I.onObject('Brew', ['raid_font'], ({ player }) => brew(player));
  I.onItemOnObject(['raid_glowcap', 'raid_lotus'], ['raid_font'], ({ player }) => brew(player));
  I.onObject('Pray-at', ['raid_shrine'], ({ player }) => {
    const sk = player.skills;
    game.playAnim(player, 'emote_wave', 900);
    if (sk.getCurrent('prayer') >= sk.getLevel('prayer')) { game.message('Your prayer is already full.'); return; }
    sk.setCurrent('prayer', sk.getLevel('prayer'));
    game.spawnEffect('prayer', player, { color: 0xffe080 });
    game.message('You kneel at the choir shrine. A warm hymn fills you - your prayer is restored.');
    game.events.emit('stats:change', { player, skill: 'prayer' });
  });
  I.onItem('Drink', ['raid_tonic_1', 'raid_tonic_2', 'raid_tonic_3', 'raid_tonic_4'], ({ player, slot, def }) => drinkTonic(player, slot, def));

  // ornament kits
  const bases = Object.keys(ORNAMENTS);
  I.onItemOnItem(['raid_kit_dawnfire', 'raid_kit_tidewrought'], bases, ({ player, item, slot, other, otherSlot }) => {
    const kitIsA = item.id.startsWith('raid_kit_');
    const kit = kitIsA ? item : other, base = kitIsA ? other : item;
    const kitSlot = kitIsA ? slot : otherSlot, baseSlot = kitIsA ? otherSlot : slot;
    const o = ORNAMENTS[base.id];
    if (!o || o.kit !== kit.id) { game.message('That kit is meant for a different relic.'); return; }
    player.inventory.removeAt(kitSlot, 1);
    player.inventory.set(baseSlot, { id: o.or, qty: 1 });
    game.message(`You apply the ${getItem(kit.id).name.toLowerCase()} to your ${getItem(base.id).name}.`);
    game.spawnEffect('sparkle', player, { color: 0xffc040 });
  });
  I.onItem('Dismantle', bases.map((b) => ORNAMENTS[b].or), ({ player, slot, def }) => {
    if (player.inventory.freeSlots() < 1) { game.message('You need a free inventory slot to remove the ornament kit.'); return; }
    player.inventory.set(slot, { id: def.ornamentOf, qty: 1 });
    player.inventory.add(def.kit, 1);
    game.message(`You carefully remove the ornament kit from your ${getItem(def.ornamentOf).name}.`);
  });

  // passives: Sunwrought set (10% less damage from monsters), Ring of the Seventh Hymn (+50% special energy regen)
  ev.on('damage:before', (e) => {
    if (e.target !== game.player || e.source?.type !== 'npc' || !(e.amount > 0)) return;
    if (SUNWROUGHT_SET.every((id) => wearing(id))) e.amount = Math.floor(e.amount * 0.9);
  });
  game.onTick((t) => {
    const p = game.player;
    if (t % 50 !== 25 || p.dead || p.specialEnergy >= 100) return;
    if (!p.equipment.getDef('ring')?.hymnRing) return;
    p.specialEnergy = Math.min(100, p.specialEnergy + 5);
    ev.emit('special:change', { player: p });
  }, 60);

  // someone in the party found a relic (chat line for the others)
  ev.on('net:message', ({ remote, type, data }) => {
    if (type !== 'raid:loot' || !remote || !data || typeof data.item !== 'string') return;
    const def = getItem(data.item);
    if (def?.raidUnique) game.message(`<col=ff3060>${escapeHtml(remote.name)} found a relic of the choir: ${escapeHtml(def.name)}!</col>`);
  });
}
