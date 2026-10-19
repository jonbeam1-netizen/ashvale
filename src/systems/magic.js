// Magic: sigil (rune) accounting, spell dispatch and the Magic tab. OWNER: agent A.
// Agent F's utility spells (teleports, alchemy, enchanting...) live in src/content/spells_utility.js /
// src/systems/magic_utility.js and use the helpers below.
//
// game.magic API
//   sigilCost(spell) -> {sigilId: qty}            (spell.sigils ?? spell.runes)
//   infiniteSigils(player) -> Set<sigilId>        from equipped items with `providesSigil` (string | array)
//   sigilCount(player, id) -> number | Infinity
//   hasSigils(spell [, player]) / hasSigils(player, spell) -> bool
//   consumeSigils(spell [, player]) / consumeSigils(player, spell)
//   canCast(player, spell, {silent}) -> bool      level + sigil check, with chat messages
//   hasRunes / consumeRunes                       aliases (Phase-1 names)
//   castUtility(player, spell, target)            runs spell.onCast(game, player, target) with checks
//   autocastSpell(player) -> spell | null
//
// Spell handler contract for utility spells: `spell.onCast(game, player, target)`; target is null
// (no-target spells), an Npc, a RemotePlayer, {item, slot} (spell on inventory item), a WorldObject or
// a GroundItem. Return false to cancel (nothing consumed). Otherwise sigils are consumed, spell.xp is
// awarded and the cast animation plays (set spell.noAnim to skip). spell.cooldown (ticks, default 3)
// is the delay before the next utility cast.

import { getItem, getSpell, allSpells } from '../core/registry.js';
import { el, escapeHtml } from '../ui/util.js';
import { getShapeIcon } from '../ui/icons.js';

export function init(game) {
  const ev = game.events;
  const sigilCost = (spell) => spell?.sigils || spell?.runes || {};

  function infiniteSigils(player) {
    const out = new Set();
    for (const slot of ['weapon', 'shield', 'neck', 'ring', 'hands', 'cape']) {
      const d = player.equipment.getDef(slot);
      if (!d) continue;
      for (const k of ['providesSigil', 'providesSigils']) {
        const v = d[k];
        if (!v) continue;
        for (const id of Array.isArray(v) ? v : [v]) out.add(id);
      }
    }
    return out;
  }
  const sigilCount = (player, id) => (infiniteSigils(player).has(id) ? Infinity : player.inventory.count(id));
  const args = (a, b) => (a && a.skills ? [a, b] : [b || game.player, a]); // -> [player, spell]

  const magic = {
    sigilCost,
    infiniteSigils,
    sigilCount,
    hasSigils(a, b) {
      const [player, spell] = args(a, b);
      const inf = infiniteSigils(player);
      return Object.entries(sigilCost(spell)).every(([id, n]) => inf.has(id) || player.inventory.count(id) >= n);
    },
    consumeSigils(a, b) {
      const [player, spell] = args(a, b);
      const inf = infiniteSigils(player);
      for (const [id, n] of Object.entries(sigilCost(spell))) if (!inf.has(id)) player.inventory.remove(id, n);
    },
    canCast(player, spell, opts = {}) {
      if (!spell) return false;
      if (player.skills.getLevel('magic') < spell.level) {
        if (!opts.silent) game.message(`You need a Magic level of ${spell.level} to cast ${spell.name}.`);
        return false;
      }
      if (!magic.hasSigils(player, spell)) {
        if (!opts.silent) {
          const inf = infiniteSigils(player);
          const miss = Object.entries(sigilCost(spell)).find(([id, n]) => !inf.has(id) && player.inventory.count(id) < n);
          game.message(`You do not have enough ${getItem(miss[0])?.name || miss[0]}s to cast this spell.`);
        }
        return false;
      }
      return true;
    },
    autocastSpell(player = game.player) {
      const id = player.store('combat').autocast;
      return id ? getSpell(id) || null : null;
    },
    castUtility(player, spell, target = null) {
      if ((player._utilCastUntil || 0) > game.tickCount) return false;
      if (!magic.canCast(player, spell)) return false;
      let r;
      try { r = spell.onCast(game, player, target); } catch (e) { console.error(`[magic] ${spell.id}.onCast threw`, e); return false; }
      if (r === false) return false;
      magic.consumeSigils(player, spell);
      if (spell.xp) player.skills.addXp('magic', spell.xp);
      if (!spell.noAnim) game.playAnim(player, 'cast', 1000);
      player._utilCastUntil = game.tickCount + (spell.cooldown ?? 3);
      ev.emit('magic:cast', { player, spell, target });
      return true;
    },
  };
  magic.hasRunes = (player, spell) => magic.hasSigils(player, spell);
  magic.consumeRunes = (player, spell) => magic.consumeSigils(player, spell);
  game.magic = magic;

  // ---- dispatch ------------------------------------------------------------------------------
  const I = game.interactions;
  const combatSpell = (s) => s?.type === 'combat';

  I.onSpellOnNpc('*', '*', ({ player, target, spell }) => {
    if (combatSpell(spell)) { game.combat?.castOn(target, spell, player); return; }
    if (spell?.onCast) { magic.castUtility(player, spell, target); return; }
    return false;
  }, { range: 10 });

  I.onSpellOnPlayer('*', ({ player, target, spell }) => {
    if (combatSpell(spell)) { game.combat?.castOn(target, spell, player); return; }
    if (spell?.onCast) { magic.castUtility(player, spell, target); return; }
    return false;
  }, { range: 10 });

  I.onSpell('*', ({ player, spell }) => {
    if (spell?.onCast && !(spell.targets?.length)) { magic.castUtility(player, spell, null); return; }
    if (spell?.type === 'teleport' && spell.teleport) { teleport(player, spell); return; }
    return false;
  });
  I.onSpellOnItem('*', '*', ({ player, spell, item, slot }) => {
    if (!spell?.onCast) return false;
    magic.castUtility(player, spell, { item, slot });
  });
  I.onSpellOnGround('*', '*', ({ player, spell, target }) => {
    if (!spell?.onCast) return false;
    magic.castUtility(player, spell, target);
  });
  // object-targeted utility spells are registered by id so the menu only offers them where valid
  const objectSpells = new Set();
  const registerObjectSpells = () => {
    for (const s of allSpells()) {
      if (!s.onCast || !s.targets?.includes('object') || objectSpells.has(s.id)) continue;
      objectSpells.add(s.id);
      I.onSpellOnObject([s.id], s.objects || '*', ({ player, spell, target }) => { magic.castUtility(player, spell, target); });
    }
  };
  registerObjectSpells();
  ev.on('game:ready', registerObjectSpells);

  /** Fallback teleport handler for spells with `teleport: {x, y}` (agent F may register its own). */
  function teleport(player, spell) {
    if ((player.teleportUntil || 0) > game.tickCount) return;
    const chk = game.wilderness?.canTeleport(player) || { ok: true };
    if (!chk.ok) { game.message(chk.reason); return; }
    if (!magic.canCast(player, spell)) return;
    magic.consumeSigils(player, spell);
    game.ui.closeInterfaces();
    game.actions.stop(player, 'teleport');
    player.combatTarget = null;
    player.teleportUntil = game.tickCount + 5;
    game.actions.lock(player, 4);
    game.playAnim(player, 'cast', 1800);
    game.spawnEffect('teleport', player, { color: 0x9a7aff });
    game.schedule(3, () => {
      if (player.dead) return;
      game.teleport(player, spell.teleport.x, spell.teleport.y);
      game.spawnEffect('teleport', player, { color: 0x9a7aff });
      if (spell.xp) player.skills.addXp('magic', spell.xp);
    });
  }

  // ---- Magic tab -----------------------------------------------------------------------------
  function sigilLines(player, spell) {
    const inf = infiniteSigils(player);
    return Object.entries(sigilCost(spell)).map(([id, n]) => {
      const have = inf.has(id) ? '&infin;' : player.inventory.count(id);
      const ok = inf.has(id) || player.inventory.count(id) >= n;
      return `<span style="color:${ok ? '#40c040' : '#e04040'}">${have}/${n}</span> ${escapeHtml(getItem(id)?.name || id)}`;
    }).join('<br>');
  }

  function renderMagic(pane) {
    const p = game.player;
    const book = p.data.spellbook || 'standard';
    const lvl = p.skills.getLevel('magic');
    const auto = magic.autocastSpell(p);
    const spells = allSpells().filter((s) => s.book === book).sort((a, b) => a.level - b.level);
    pane.innerHTML = '';
    pane.appendChild(el('div', 'spell-book-head muted', `${book === 'standard' ? 'Standard' : escapeHtml(book)} spellbook &middot; Magic ${p.skills.getCurrent('magic')}/${lvl}`));
    const grid = el('div', 'icon-grid spells spell-grid');
    for (const sp of spells) {
      const ok = lvl >= sp.level;
      const sigils = ok && magic.hasSigils(p, sp);
      const sel = game.ui.selected?.type === 'spell' && game.ui.selected.id === sp.id;
      const c = el('div', `icon-cell spell-cell${ok ? '' : ' locked'}${ok && !sigils ? ' nosigils' : ''}${sel ? ' active' : ''}${auto?.id === sp.id ? ' autocasting' : ''}`,
        `<img alt="" src="${getShapeIcon(sp.icon?.shape || 'rune', sp.icon?.color || '#8ad0ff', sp.icon?.color2)}">`);
      const use = () => {
        if (!ok) { game.message(`You need a Magic level of ${sp.level} to cast ${sp.name}.`); return; }
        if (sp.targets?.length) game.ui.setSelected({ type: 'spell', id: sp.id, name: sp.name });
        else game.castSpell(p, sp.id);
      };
      c.onclick = use;
      c.oncontextmenu = (e) => {
        e.preventDefault();
        const opts = [{ option: 'Cast', target: sp.name, targetColor: '#00ff00', action: use }];
        const st = game.combat?.formulas?.styleOf(p);
        const autoIdx = game.combat ? (game.registry.getWeaponType(p.equipment.weaponType()).styles.findIndex((s) => s.style === 'autocast')) : -1;
        if (sp.type === 'combat' && sp.autocast !== false && !sp.playersOnly && autoIdx >= 0 && ok) {
          opts.push({ option: 'Autocast', target: sp.name, targetColor: '#00ff00', action: () => {
            p.store('combat').autocast = sp.id; p.combatStyle = autoIdx;
            ev.emit('combat:style', { player: p, style: st });
            game.message(`You will now autocast ${sp.name}.`);
            game.ui.refreshTab('magic');
          } });
        }
        opts.push({ option: 'Cancel', action: () => {} });
        game.ui.menu.show(e.clientX, e.clientY, opts);
      };
      c.addEventListener('mousemove', (e) => game.ui.showTooltip(e.clientX, e.clientY,
        `<b>${escapeHtml(sp.name)}</b> (Level ${sp.level})<br>${escapeHtml(sp.description || '')}${sp.xp ? `<br><span class="muted">${sp.xp} xp</span>` : ''}<br>${sigilLines(p, sp)}`));
      c.addEventListener('mouseleave', () => game.ui.hideTooltip());
      grid.appendChild(c);
    }
    pane.appendChild(grid);
  }

  game.ui.registerTab({ id: 'magic', title: 'Magic', render: renderMagic });
  const refresh = () => game.ui.refreshTab('magic');
  ev.on('inventory:change', refresh);
  ev.on('equipment:change', refresh);
  ev.on('combat:style', refresh);
}
