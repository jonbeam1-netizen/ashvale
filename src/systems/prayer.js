// Prayer system. OWNER: agent A.
// Activation with conflict rules, point drain (prayer bonus slows it), overhead prayers, quick-prayers
// (prayer orb), restore/heal/preserve effects, Second Wind / Last Rites, burying bones and offering
// bones at altars, altar recharge. Publishes `game.prayer` (see the API object below).

import { getPrayer, allPrayers, getData, getItem } from '../core/registry.js';
import { SKILLS } from '../core/constants.js';
import { el, escapeHtml } from '../ui/util.js';
import { getShapeIcon } from '../ui/icons.js';
import { rand } from '../core/rng.js';

const BOOST_CATS = new Set(['ranged', 'magic']);
const MELEE_CATS = new Set(['attack', 'strength']);

/** Do two prayers conflict? Same category, or ranged/magic against attack/strength/ranged/magic. */
export function prayersConflict(a, b) {
  if (!a || !b || a.id === b.id) return false;
  const ca = a.categories || (a.group ? [a.group] : []), cb = b.categories || (b.group ? [b.group] : []);
  for (const x of ca) for (const y of cb) {
    if (x === y && x !== 'restore') return true;
    if ((BOOST_CATS.has(x) && (MELEE_CATS.has(y) || BOOST_CATS.has(y))) || (BOOST_CATS.has(y) && MELEE_CATS.has(x))) return true;
  }
  return false;
}

export function init(game) {
  const ev = game.events;
  const pst = (p) => p.store('prayer');
  let setupMode = false;
  let preserveCount = 0;
  let boostSnap = null;

  const active = (p) => [...p.activePrayers].map(getPrayer).filter(Boolean);
  const changed = (p) => { ev.emit('prayer:change', { player: p }); updateOrb(); };

  const api = {
    conflicts: prayersConflict,
    /** Product of active prayer multipliers for attack/strength/defence/ranged/rangedStrength/magic. */
    multiplier(player, key) {
      let m = 1;
      for (const id of player.activePrayers) {
        const fx = getPrayer(id)?.effects;
        if (!fx) continue;
        const v = fx[key] ?? (key === 'rangedStrength' ? fx.ranged : undefined);
        if (typeof v === 'number') m *= v;
      }
      return m;
    },
    isActive: (player, id) => player.activePrayers.has(id),
    /** Any active prayer with a truthy `effects[key]` (protectItem, retribution, secondWind, soulrend, ...). */
    has: (player, key) => active(player).some((pr) => pr.effects?.[key]),
    isProtected: (player, style) => active(player).some((pr) => pr.effects?.protect === style),
    protectStyles: (player) => active(player).map((pr) => pr.effects?.protect).filter(Boolean),
    overheadIds: (player) => active(player).filter((pr) => pr.overhead).map((pr) => pr.id),
    overheadOf: (player) => active(player).find((pr) => pr.overhead)?.overhead || null,
    overheadShape: (id) => getPrayer(id)?.overhead || null,

    activate(player, id, opts = {}) {
      const pr = getPrayer(id);
      if (!pr) return false;
      if (player.activePrayers.has(id)) return true;
      const say = (m) => { if (!opts.silent) game.message(m); };
      if (player.skills.getLevel('prayer') < pr.level) { say(`You need a Prayer level of ${pr.level} to use ${pr.name}.`); return false; }
      for (const [s, l] of Object.entries(pr.requires || {})) {
        if (player.skills.getLevel(s) < l) { say(`You need ${/^[aeiou]/i.test(s) ? 'an' : 'a'} ${s[0].toUpperCase() + s.slice(1)} level of ${l} to use ${pr.name}.`); return false; }
      }
      if (player.skills.getCurrent('prayer') <= 0) { say('You have no Prayer points left. Pray at an altar to restore them.'); return false; }
      for (const other of active(player)) if (prayersConflict(pr, other)) player.activePrayers.delete(other.id);
      player.activePrayers.add(id);
      if (!opts.noEvent) changed(player);
      return true;
    },
    deactivate(player, id) { if (player.activePrayers.delete(id)) changed(player); },
    toggle(player, id) { return player.activePrayers.has(id) ? (api.deactivate(player, id), false) : api.activate(player, id); },
    deactivateAll(player) {
      if (!player.activePrayers.size) return;
      player.activePrayers.clear();
      changed(player);
    },
    drainPoints(player, n) { player.skills.setCurrent('prayer', Math.max(0, player.skills.getCurrent('prayer') - n)); if (player.skills.getCurrent('prayer') <= 0) api.deactivateAll(player); },
    restorePoints(player, n) { player.skills.setCurrent('prayer', Math.min(player.skills.getLevel('prayer'), player.skills.getCurrent('prayer') + n)); },

    // ---- quick-prayers -------------------------------------------------------------------------
    quickList: (player = game.player) => (pst(player).quick || []).filter((id) => getPrayer(id)),
    quickActive(player = game.player) {
      const q = api.quickList(player);
      return q.length > 0 && q.every((id) => player.activePrayers.has(id));
    },
    toggleQuick(player = game.player) {
      const q = api.quickList(player);
      if (!q.length) { game.message("You haven't chosen any quick-prayers. Right-click the Prayer orb to set them up."); return; }
      if (api.quickActive(player)) { for (const id of q) player.activePrayers.delete(id); changed(player); return; }
      let any = false;
      for (const id of q) any = api.activate(player, id, { noEvent: true }) || any;
      if (any) changed(player);
    },
  };
  game.prayer = api;

  // ---- prayer tab clicks ---------------------------------------------------------------------
  ev.on('ui:prayer', (e) => {
    if (e.handled) return;
    e.handled = true;
    const p = e.player || game.player, pr = getPrayer(e.id);
    if (!pr) return;
    if (setupMode) {
      if (p.skills.getLevel('prayer') < pr.level) { game.message(`You need a Prayer level of ${pr.level} to use ${pr.name}.`); return; }
      const q = new Set(api.quickList(p));
      if (q.has(pr.id)) q.delete(pr.id);
      else { for (const id of [...q]) if (prayersConflict(pr, getPrayer(id))) q.delete(id); q.add(pr.id); }
      pst(p).quick = [...q];
      game.ui.refreshTab('prayer');
      return;
    }
    api.toggle(p, pr.id);
  });

  // ---- drain ---------------------------------------------------------------------------------
  game.onTick((t) => {
    const p = game.player;
    if (p.dead) return;
    if (p.activePrayers.size) {
      const st = pst(p);
      let rate = 0;
      for (const id of p.activePrayers) rate += getPrayer(id)?.drain ?? 1;
      st.acc = (st.acc || 0) + rate;
      const resist = 60 + 2 * Math.max(0, p.equipment.bonuses().prayer || 0);
      while (st.acc >= resist) {
        st.acc -= resist;
        p.skills.setCurrent('prayer', p.skills.getCurrent('prayer') - 1);
      }
      if (p.skills.getCurrent('prayer') <= 0) {
        api.deactivateAll(p);
        game.message('Your Prayer points are spent. Pray at an altar to restore them.');
      }
    }
    // Steady Pulse / Mending Light: an extra restore tick half-way between the engine's restores
    if (t % 100 === 50) {
      if (api.has(p, 'restoreStats')) for (const s of SKILLS) if (s !== 'hitpoints' && s !== 'prayer') p.skills.restore(s, 1);
      if (api.has(p, 'restoreHp') && p.hp < p.maxHp) game.heal(p, 1);
    }
    // Lingering Blessing: cancel every third boost decay (boosts last ~50% longer)
    if (t % 100 === 0) {
      boostSnap = {};
      for (const s of SKILLS) if (s !== 'hitpoints' && s !== 'prayer' && p.skills.getCurrent(s) > p.skills.getLevel(s)) boostSnap[s] = p.skills.getCurrent(s);
    } else if (t % 100 === 1 && boostSnap) {
      if (api.has(p, 'preserve') && ++preserveCount % 3 === 0) {
        for (const [s, v] of Object.entries(boostSnap)) if (p.skills.getCurrent(s) === v - 1) p.skills.setCurrent(s, v);
      }
      boostSnap = null;
    }
  }, 20);

  // ---- Second Wind ---------------------------------------------------------------------------
  ev.on('damage', ({ target }) => {
    const p = game.player;
    if (target !== p || p.dead || p.hp <= 0) return;
    if (p.hp > Math.floor(p.maxHp / 10) || !api.has(p, 'secondWind')) return;
    const heal = Math.floor(p.skills.getLevel('prayer') / 4);
    p.skills.setCurrent('prayer', 0);
    api.deactivateAll(p);
    game.heal(p, heal);
    game.spawnEffect('sparkle', p, { color: 0x80ffc0 });
    game.message('<col=008060>A second wind fills your lungs as your prayer is spent.</col>');
  });

  // ---- Last Rites (on death) ------------------------------------------------------------------
  ev.on('player:death', ({ player }) => {
    if (player !== game.player || !api.has(player, 'retribution')) return;
    const max = Math.floor(player.skills.getLevel('prayer') / 4);
    for (let i = 0; i < 3; i++) game.spawnEffect('sparkle', { x: player.x + rand.int(-1, 1), y: player.y + rand.int(-1, 1) }, { color: 0xff8020 });
    game.spawnEffect('splash', player, { color: 0xff6010 });
    for (const n of game.npcsNear(player.x, player.y, 1)) if (n.def.combatLevel) game.applyDamage(n, rand.int(0, max), { source: player, type: 'typeless' });
    if (game.world.isWilderness(player.x, player.y)) {
      for (const r of game.remotePlayers.values()) {
        if (r.dead || Math.max(Math.abs(r.x - player.x), Math.abs(r.y - player.y)) > 1) continue;
        const dmg = rand.int(0, max);
        game.applyDamage(r, dmg, { source: player, type: 'typeless' });
        game.net?.sendHit?.(r.peerId, { damage: dmg, style: 'typeless', attackerName: player.name, ts: Date.now() });
      }
    }
  });

  ev.on('player:respawn', ({ player }) => { player.activePrayers.clear(); changed(player); });

  // ---- altars ----------------------------------------------------------------------------------
  game.interactions.onObject('Pray-at', '*', ({ player }) => {
    game.playAnim(player, 'pickup', 1200);
    if (player.skills.getCurrent('prayer') >= player.skills.getLevel('prayer')) { game.message('Your Prayer is already full.'); return; }
    player.skills.setCurrent('prayer', player.skills.getLevel('prayer'));
    game.spawnEffect('sparkle', player, { color: 0xfff0b0 });
    game.message('You kneel at the altar and your Prayer is restored.');
  });

  // ---- bones -----------------------------------------------------------------------------------
  const boneXp = (id) => getData('bones', id)?.xp ?? getItem(id)?.prayerXp ?? null;

  game.interactions.onItem('Bury', '*', ({ player, slot, item }) => {
    const xp = boneXp(item.id);
    if (xp == null) return false;
    if ((player.buryDelayUntil || 0) > game.tickCount) return;
    player.buryDelayUntil = game.tickCount + 2;
    player.inventory.removeAt(slot, 1);
    game.playAnim(player, 'bury', 1000);
    game.message('You kneel and lay the bones to rest...');
    game.schedule(1, () => { game.message('The bones are buried.'); player.skills.addXp('prayer', xp); });
  });

  // Use bones on an altar: offer every bone of that kind for 2.5x experience.
  game.interactions.onItemOnObject('*', '*', ({ player, item, target }) => {
    if (!item?.id || !player || !target?.def) return false; // slot emptied before arrival / object gone
    const xp = boneXp(item.id);
    if (xp == null || !target.def.options?.some((o) => /^pray/i.test(o))) return false;
    const id = item.id;
    game.actions.start(player, {
      name: 'offer_bones', anim: null, delay: 0, interval: 3,
      onTick: () => {
        if (!player.inventory.has(id)) { game.message('You have no more of those bones to offer.'); return false; }
        player.inventory.remove(id, 1);
        game.playAnim(player, 'bury', 1200);
        game.spawnEffect('sparkle', target, { color: 0xfff0b0 });
        player.skills.addXp('prayer', xp * 2.5);
        game.message(`The gods accept your offering of ${getItem(id)?.name.toLowerCase() || 'bones'}.`);
      },
    });
  });

  // ---- UI: Prayer tab + orb --------------------------------------------------------------------
  function renderPrayer(pane) {
    const p = game.player;
    const quick = new Set(api.quickList(p));
    pane.innerHTML = '';
    const bonus = p.equipment.bonuses().prayer || 0;
    pane.appendChild(el('div', 'pray-head', setupMode
      ? '<b style="color:#40d0ff">Select your quick-prayers</b>'
      : `Prayer: ${p.skills.getCurrent('prayer')} / ${p.skills.getLevel('prayer')} <span class="muted">(bonus ${bonus >= 0 ? '+' : ''}${bonus})</span>`));
    const grid = el('div', `icon-grid${setupMode ? ' pray-setup' : ''}`);
    for (const pr of allPrayers().sort((a, b) => a.level - b.level)) {
      const ok = p.skills.getLevel('prayer') >= pr.level;
      const on = setupMode ? quick.has(pr.id) : p.activePrayers.has(pr.id);
      const c = el('div', `icon-cell${ok ? '' : ' locked'}${on ? ' active' : ''}${!setupMode && quick.has(pr.id) ? ' quick' : ''}`,
        `<img alt="" src="${getShapeIcon(pr.icon?.shape || 'star', pr.icon?.color || '#f0e8a0', pr.icon?.color2)}">`);
      c.onclick = () => ev.emit('ui:prayer', { id: pr.id, player: p, handled: false });
      const req = Object.entries(pr.requires || {}).map(([s, l]) => `${l} ${s[0].toUpperCase() + s.slice(1)}`).join(', ');
      c.addEventListener('mousemove', (e) => game.ui.showTooltip(e.clientX, e.clientY,
        `<b>${escapeHtml(pr.name)}</b> (Level ${pr.level}${req ? `, ${escapeHtml(req)}` : ''})<br>${escapeHtml(pr.description || '')}<br><span class="muted">Drain rate: ${pr.drain}</span>`));
      c.addEventListener('mouseleave', () => game.ui.hideTooltip());
      grid.appendChild(c);
    }
    pane.appendChild(grid);
    const tools = el('div', 'pray-tools');
    const qb = el('button', `btn${setupMode ? ' on' : ''}`, setupMode ? 'Done' : 'Setup quick');
    qb.onclick = () => { setupMode = !setupMode; game.ui.refreshTab('prayer'); };
    const qt = el('button', `btn${api.quickActive(p) ? ' on' : ''}`, 'Quick-pray');
    qt.onclick = () => api.toggleQuick(p);
    tools.append(qb, qt);
    pane.appendChild(tools);
  }

  function updateOrb() {
    const orb = game.ui?.minimap?.orbs?.prayer?.root;
    if (orb) orb.classList.toggle('quick-on', api.quickActive(game.player));
  }

  game.ui.registerTab({ id: 'prayer', title: 'Prayer', render: renderPrayer });
  ev.on('prayer:change', () => game.ui.refreshTab('prayer'));
  ev.on('equipment:change', () => game.ui.refreshTab('prayer'));

  // Prayer orb: left-click toggles quick-prayers, right-click offers setup.
  const orb = game.ui?.minimap?.orbs?.prayer?.root;
  if (orb) {
    orb.title = 'Prayer (click: quick-prayers, right-click: options)';
    orb.onclick = () => api.toggleQuick(game.player);
    orb.oncontextmenu = (e) => {
      e.preventDefault();
      game.ui.menu.show(e.clientX, e.clientY, [
        { option: api.quickActive(game.player) ? 'Deactivate' : 'Activate', target: 'Quick-prayers', targetColor: '#ff9040', action: () => api.toggleQuick(game.player) },
        { option: 'Setup', target: 'Quick-prayers', targetColor: '#ff9040', action: () => { setupMode = true; game.ui.selectTab('prayer'); game.ui.refreshTab('prayer'); } },
        { option: 'Cancel', action: () => {} },
      ]);
    };
  }
}
