// Death rules. OWNER: agent A.
//
// Outside the Wilderness: you keep your 3 most valuable items (+1 with Keepsake); everything else is
// placed in a gravestone at the spot you died. It lasts 15 minutes of play time and can be reclaimed
// for free ("Reclaim"); "Check" lists the contents. Gravestones persist in the save.
// Inside the Wilderness: keep 3 (0 when skulled, +1 with Keepsake); the rest drops on the ground at the
// death spot - or, when killed by another player, is sent to the killer (game.net.sendLoot).
// Untradeable items are always kept. You respawn in Brackenford (map respawn point) with full stats.
//
// game.death API: itemsKeptOnDeath(player?) -> {kept, lost, keepCount}, graves() -> saved graves.

import { getItem, registerObject, getMapConfig } from '../core/registry.js';
import { getItemIcon } from '../ui/icons.js';
import { el } from '../ui/util.js';

const GRAVE_TICKS = 1500;          // 15 minutes
const WILD_DROP_TICKS = 6000;      // items dropped in the Wilderness last an hour

registerObject({
  id: 'grave_marker', name: 'Gravestone', examine: 'A fresh grave marker. Your belongings rest beneath it.',
  blocks: false, options: ['Reclaim', 'Check'], model: { template: 'gravestone' }, mapIcon: { char: '+', color: '#c0c0c0' },
});

export function init(game) {
  const ev = game.events;
  const dst = () => game.player.store('death');
  const markers = new Map(); // grave id -> WorldObject

  const unitValue = (id) => Math.max(0, getItem(id)?.value ?? 0);

  /** Compute which items a player keeps. */
  function itemsKeptOnDeath(player = game.player, opts = {}) {
    const wild = opts.wild ?? game.world.getWildernessLevel(player.x, player.y) > 0;
    const skulled = !!game.wilderness?.isSkulled(player);
    let keepCount = wild && skulled ? 0 : 3;
    if (game.prayer?.has(player, 'protectItem')) keepCount++;
    const kept = [], lost = [], cands = [];
    const consider = (it) => {
      if (!it) return;
      const def = getItem(it.id);
      if (!def) return;
      const qty = def.stackable ? it.qty : Math.max(1, it.qty);
      if (!(qty > 0)) return;
      if (def.tradeable === false) { kept.push({ id: it.id, qty }); return; }
      if (def.stackable) cands.push({ id: it.id, qty, value: unitValue(it.id) });
      else for (let i = 0; i < qty; i++) cands.push({ id: it.id, qty: 1, value: unitValue(it.id) });
    };
    for (const it of player.inventory.items()) consider(it);
    for (const slot of Object.keys(player.equipment.slots)) consider(player.equipment.get(slot));
    cands.sort((a, b) => b.value - a.value);
    let left = keepCount;
    for (const c of cands) {
      const k = Math.min(left, c.qty);
      if (k > 0) { kept.push({ id: c.id, qty: k }); left -= k; }
      if (c.qty - k > 0) lost.push({ id: c.id, qty: c.qty - k });
    }
    return { kept: merge(kept), lost: merge(lost), keepCount };
  }

  function merge(list) {
    const out = [];
    for (const it of list) {
      const def = getItem(it.id);
      const ex = def?.stackable ? out.find((o) => o.id === it.id) : null;
      if (ex) ex.qty += it.qty; else out.push({ ...it });
    }
    return out;
  }

  // ---- gravestones ---------------------------------------------------------------------------
  const graveName = (g) => `Gravestone (${Math.max(1, Math.ceil(g.ticks / 100))} min)`;

  function spawnMarker(g) {
    const obj = game.spawnObject('grave_marker', g.x, g.y);
    if (!obj) return;
    obj.state.graveId = g.id;
    obj.name = graveName(g);
    markers.set(g.id, obj);
  }

  function createGrave(x, y, items) {
    const st = dst();
    st.graves ||= [];
    const g = { id: `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, x, y, items, ticks: GRAVE_TICKS };
    st.graves.push(g);
    spawnMarker(g);
    return g;
  }

  function removeGrave(g) {
    const st = dst();
    st.graves = (st.graves || []).filter((o) => o.id !== g.id);
    const obj = markers.get(g.id);
    if (obj) game.removeObject(obj);
    markers.delete(g.id);
  }

  const graveFor = (obj) => (dst().graves || []).find((g) => g.id === obj.state.graveId);

  game.interactions.onObject('Reclaim', ['grave_marker'], ({ player, target }) => {
    const g = graveFor(target);
    if (!g) { game.removeObject(target); return; }
    game.playAnim(player, 'pickup', 900);
    const remaining = [];
    let got = 0;
    for (const it of g.items) {
      const fit = Math.min(it.qty, player.inventory.capacityFor(it.id));
      if (fit > 0) { player.inventory.add(it.id, fit); got += fit; }
      if (it.qty - fit > 0) remaining.push({ id: it.id, qty: it.qty - fit });
    }
    if (!remaining.length) {
      removeGrave(g);
      game.message('You reclaim your belongings and the gravestone crumbles away.');
    } else {
      g.items = remaining;
      game.message(got ? 'You reclaim what you can carry; the rest remains in the grave.' : 'You have no room to carry anything from the grave.');
    }
  });

  game.interactions.onObject('Check', ['grave_marker'], ({ target }) => {
    const g = graveFor(target);
    if (!g) return;
    game.ui.openInterface({
      id: 'gravestone', title: 'Gravestone', width: 300,
      render: (body) => {
        body.innerHTML = '';
        const wrap = el('div', 'grave-list', `<div>Time remaining: <b>${Math.ceil(g.ticks / 100)} minute(s)</b></div>`);
        const grid = el('div', 'grave-items');
        for (const it of g.items) {
          const def = getItem(it.id);
          const c = el('div', '', `<img alt="" src="${getItemIcon(it.id, it.qty)}">${def?.stackable || it.qty > 1 ? `<span>${it.qty}</span>` : ''}`);
          c.title = def?.name || it.id;
          grid.appendChild(c);
        }
        wrap.appendChild(grid);
        wrap.appendChild(el('div', 'muted', 'Reclaiming is free. Stand by the grave and choose "Reclaim".'));
        body.appendChild(wrap);
      },
    });
  });

  // restore graves from the save
  for (const g of dst().graves || []) spawnMarker(g);

  game.onTick((t) => {
    const graves = dst().graves;
    if (!graves?.length || game.player.dead) return;
    for (const g of [...graves]) {
      g.ticks--;
      const obj = markers.get(g.id);
      if (obj && t % 10 === 0) obj.name = graveName(g);
      if (g.ticks === 300) game.message('<col=c06000>Your gravestone will collapse in 3 minutes!</col>');
      if (g.ticks <= 0) {
        removeGrave(g);
        game.message('<col=c00000>Your gravestone has crumbled to dust, and the belongings within are lost.</col>');
      }
    }
  }, 30);

  // ---- death ---------------------------------------------------------------------------------
  ev.on('player:death', (e) => {
    const p = e.player;
    if (p !== game.player || e.handled) return;
    e.handled = true;
    // safe-death areas (minigames, registerArea({ safeDeath: {x, y} })): nothing is lost; the area's owner
    // respawns the player on 'death:safe' {player, area, killer}
    const safeArea = game.world.getArea(p.x, p.y);
    if (safeArea?.safeDeath) { game.message('<col=c00000>You have been defeated!</col>'); ev.emit('death:safe', { player: p, area: safeArea, killer: e.killer }); return; }
    const x = p.x, y = p.y;
    const wild = game.world.getWildernessLevel(x, y) > 0;
    const killer = game.pvp?.killerOf(p, e.killer) || null;
    game.message('<col=c00000>Your vision greys and the world slips away... you have died.</col>');
    if (killer) game.message(`<col=c00000>You have been defeated by ${killer.name}.</col>`);
    game.schedule(4, () => {
      const { kept, lost, keepCount } = itemsKeptOnDeath(p, { wild });
      p.inventory.clear();
      for (const slot of Object.keys(p.equipment.slots)) p.equipment.slots[slot] = null;
      p.equipment.set('weapon', null);
      for (const it of kept) p.inventory.add(it.id, it.qty);
      p.combatStyle = 0;

      if (wild) {
        const loot = [...lost, { id: 'bones', qty: 1 }].filter((it) => getItem(it.id));
        // the killer may have left during the death animation: then the loot drops here instead
        let sent = false;
        if (killer && typeof game.net?.sendLoot === 'function' && game.remotePlayers.has(killer.peerId)) {
          try { sent = !!game.net.sendLoot(killer.peerId, { items: loot, x, y }); } catch (err) { console.warn('[death] sendLoot failed', err); }
        }
        if (sent) {
          game.message(`${killer.name} has claimed your belongings.`);
        } else {
          for (const it of lost) game.spawnGroundItem(it.id, it.qty, x, y, { owner: null, ticks: WILD_DROP_TICKS });
          if (lost.length) game.message('Your belongings lie scattered where you fell in the Wilderness.');
        }
      } else if (lost.length) {
        createGrave(x, y, lost);
      }

      game.wilderness?.clearSkull(p);
      game.wilderness?.clearTeleblock?.(p);
      game.combat?.curePoison(p);
      p.specialEnergy = 100;
      ev.emit('special:change', { player: p });
      const cfg = getMapConfig();
      game.respawnPlayer(p, cfg.respawn.x, cfg.respawn.y);
      game.message('You awaken in Brackenford, whole once more.');
      if (!wild && lost.length) game.message(`<col=8a4000>A gravestone marks where you fell. Reclaim your items within ${GRAVE_TICKS / 100} minutes.</col>`);
      if (kept.length) game.message(`You kept ${keepCount} of your most valuable item${keepCount === 1 ? '' : 's'}.`);
      ev.emit('combat:death', { player: p, x, y, wild, kept, lost, killer });
    });
  });

  game.death = {
    itemsKeptOnDeath,
    graves: () => dst().graves || [],
    createGrave,
  };
}
