// Side panel: tab bar + Combat / Skills / Quests / Inventory / Equipment / Prayer / Magic /
// Friends (multiplayer placeholder) / Settings tabs.

import { el, escapeHtml, formatQty, fmt } from './util.js';
import { getItemIcon, getSkillIcon, getShapeIcon } from './icons.js';
import { SKILL_GRID, SKILL_NAMES, EQUIP_SLOTS, BONUS_KEYS, BONUS_LABELS } from '../core/constants.js';
import { xpForLevel } from '../core/xp.js';
import { getItem, getWeaponType, allQuests, allPrayers, allSpells } from '../core/registry.js';
import { saveGame, deleteSave } from '../core/save.js';
import { openHelp } from './help.js';

const TABS = [
  { id: 'combat', title: 'Combat Options', icon: () => getShapeIcon('sword', '#c8c8d0', '#c8a040') },
  { id: 'skills', title: 'Skills', icon: () => getShapeIcon('stats', '#58b848') },
  { id: 'quests', title: 'Quest List', icon: () => getShapeIcon('book', '#3a6ab0') },
  { id: 'inventory', title: 'Inventory', icon: () => getShapeIcon('bag', '#a07a48') },
  { id: 'equipment', title: 'Worn Equipment', icon: () => getShapeIcon('helm', '#9aa3ad') },
  { id: 'prayer', title: 'Prayer', icon: () => getShapeIcon('star', '#f0e8a0') },
  { id: 'magic', title: 'Magic', icon: () => getShapeIcon('hat', '#3a5ab8') },
  { id: 'friends', title: 'Friends & Multiplayer', icon: () => getShapeIcon('smile', '#e8c040') },
  { id: 'settings', title: 'Settings', icon: () => getShapeIcon('gear', '#9a9aa2') },
];

const SLOT_POS = { head: [1, 0], cape: [0, 1], neck: [1, 1], ammo: [2, 1], weapon: [0, 2], body: [1, 2], shield: [2, 2], legs: [1, 3], hands: [0, 4], feet: [1, 4], ring: [2, 4] };
const SLOT_GHOST = { head: 'helm', cape: 'cape', neck: 'amulet', ammo: 'arrow', weapon: 'sword', body: 'platebody', shield: 'shield', legs: 'legs', hands: 'gloves', feet: 'boots', ring: 'ring' };

export class SidePanel {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    this.root = document.getElementById('sidepanel');
    this.root.innerHTML = '';
    this.tabBar = el('div', 'tab-bar');
    this.content = el('div', 'tab-content');
    this.root.append(this.tabBar, this.content);
    this.tabs = new Map();
    this.current = null;
    for (const t of TABS) this.registerTab(t);
    this.selectTab('inventory');
    this.wire();
  }

  /** Add (or replace) a tab. render(el) builds content; update() refreshes it. */
  registerTab({ id, title, icon, render, order }) {
    let t = this.tabs.get(id);
    if (!t) {
      const btn = el('button', 'tab-btn');
      const fkey = { combat: 'F1', skills: 'F2', quests: 'F3', inventory: 'F4', equipment: 'F5', prayer: 'F6', magic: 'F7', friends: 'F8', settings: 'F9' }[id];
      btn.title = fkey ? `${title} (${fkey})` : title;
      btn.innerHTML = `<img alt="" src="${typeof icon === 'function' ? icon() : icon || getShapeIcon('generic', '#888')}">`;
      btn.onclick = () => this.selectTab(id);
      const pane = el('div', `tab-pane tab-${id}`);
      pane.style.display = 'none';
      this.content.appendChild(pane);
      if (order != null && this.tabBar.children[order]) this.tabBar.insertBefore(btn, this.tabBar.children[order]);
      else this.tabBar.appendChild(btn);
      t = { id, title, btn, pane, render: null };
      this.tabs.set(id, t);
    }
    if (render) t.render = render;
    const builtin = this[`render_${id}`];
    if (!t.render && builtin) t.render = (pane) => builtin.call(this, pane);
    if (this.current === id) this.refresh(id);
    return t;
  }

  getTabElement(id) { return this.tabs.get(id)?.pane || null; }

  selectTab(id) {
    if (!this.tabs.has(id)) return;
    this.current = id;
    for (const t of this.tabs.values()) {
      t.btn.classList.toggle('active', t.id === id);
      t.pane.style.display = t.id === id ? '' : 'none';
    }
    this.refresh(id);
  }

  refresh(id = this.current) {
    const t = this.tabs.get(id);
    if (!t || !t.render) return;
    if (id !== this.current && id !== 'inventory') { t.dirty = true; return; }
    t.render(t.pane);
  }

  wire() {
    const ev = this.game.events;
    ev.on('inventory:change', ({ player }) => { if (player === this.game.player) this.refresh('inventory'); });
    ev.on('equipment:change', ({ player }) => { if (player === this.game.player) { this.refresh('equipment'); this.refresh('combat'); } });
    let skillsQueued = false;
    const qs = () => { if (skillsQueued) return; skillsQueued = true; requestAnimationFrame(() => { skillsQueued = false; this.refresh('skills'); this.refresh('combat'); this.refresh('prayer'); this.refresh('magic'); }); };
    ev.on('xp', qs); ev.on('stats:change', qs);
    ev.on('quest:change', () => this.refresh('quests'));
    ev.on('prayer:change', () => this.refresh('prayer'));
    ev.on('spellbook:change', () => this.refresh('magic'));
    ev.on('ui:selection', () => { this.refresh('inventory'); this.refresh('magic'); });
  }

  // ------------------------------------------------------------------------------------------
  // Inventory
  // ------------------------------------------------------------------------------------------
  render_inventory(pane) {
    if (!this.invSlots) {
      pane.innerHTML = '';
      const grid = el('div', 'inv-grid');
      this.invSlots = [];
      for (let i = 0; i < 28; i++) {
        const s = el('div', 'inv-slot', '<img alt=""><span class="qty"></span>');
        s.dataset.slot = i;
        s.addEventListener('mousedown', (e) => this.invMouseDown(e, i));
        s.addEventListener('mouseup', (e) => this.invMouseUp(e, i));
        s.addEventListener('contextmenu', (e) => { e.preventDefault(); this.invContext(e, i); });
        s.addEventListener('mouseenter', () => { this.hoverSlot = i; this.invHover(i); });
        s.addEventListener('mouseleave', () => { this.hoverSlot = null; this.ui.setHoverText(''); });
        grid.appendChild(s);
        this.invSlots.push(s);
      }
      pane.appendChild(grid);
      // pressing / releasing Shift over an item flips its hover text to "Drop" (shift-drop) and back
      const shiftHover = (e) => { if (e.key === 'Shift' && this.hoverSlot != null) this.invHover(this.hoverSlot); };
      window.addEventListener('keydown', shiftHover);
      window.addEventListener('keyup', shiftHover);
    }
    const inv = this.game.player.inventory;
    const sel = this.ui.selected;
    for (let i = 0; i < 28; i++) {
      const it = inv.get(i), s = this.invSlots[i];
      const img = s.firstChild, q = s.lastChild;
      if (!it) { img.style.display = 'none'; q.textContent = ''; s.classList.remove('selected'); continue; }
      const def = getItem(it.id);
      img.style.display = '';
      const src = getItemIcon(it.id, it.qty);
      if (img.getAttribute('src') !== src) img.src = src;
      const showQty = def.stackable || it.qty > 1;
      const f = formatQty(it.qty);
      q.textContent = showQty ? f.text : '';
      q.className = `qty ${f.cls}`;
      s.classList.toggle('selected', sel?.type === 'item' && sel.slot === i);
    }
  }

  itemOptions(slot) {
    const it = this.game.player.inventory.get(slot);
    if (!it) return [];
    const def = getItem(it.id);
    if (this.ui.bankOpen) return ['Deposit-1', 'Deposit-5', 'Deposit-10', 'Deposit-X', 'Deposit-All', 'Examine'];
    if (this.ui.shopOpen) return ['Value', 'Sell 1', 'Sell 5', 'Sell 10', 'Sell 50', 'Examine'];
    const opts = [...(def.options || [])];
    if (!opts.includes('Use')) opts.push('Use');
    if (!opts.includes('Drop') && !opts.includes('Destroy')) opts.push(def.destroy ? 'Destroy' : 'Drop');
    opts.push('Examine');
    return opts;
  }

  invMouseDown(e, slot) {
    if (e.button !== 0) return;
    this.dragFrom = { slot, x: e.clientX, y: e.clientY };
  }

  invMouseUp(e, slot) {
    if (e.button !== 0) return;
    const d = this.dragFrom;
    this.dragFrom = null;
    if (d && d.slot !== slot && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
      this.game.player.inventory.swap(d.slot, slot);
      return;
    }
    this.invClick(slot, e.shiftKey);
  }

  /** Shift-click drops (OSRS-style), unless switched off in Settings or a bank/shop/selection is active. */
  shiftDropOn(shift) {
    return !!shift && this.game.player.settings.shiftDrop !== false && !this.ui.selected && !this.ui.bankOpen && !this.ui.shopOpen;
  }

  invClick(slot, shift = false) {
    if (this.shiftDropOn(shift) && this.game.player.inventory.get(slot) && this.itemOptions(slot).includes('Drop')) {
      this.doItemOption(slot, 'Drop');
      return;
    }
    const inv = this.game.player.inventory;
    const it = inv.get(slot);
    const sel = this.ui.selected;
    if (sel?.type === 'item') {
      this.ui.clearSelected();
      if (it && sel.slot !== slot) this.game.useItemOnItem(this.game.player, sel.slot, slot);
      return;
    }
    if (sel?.type === 'spell') {
      this.ui.clearSelected();
      if (it) this.ui.castSpellOnItem(sel.id, slot);
      return;
    }
    if (!it) return;
    const opt = this.itemOptions(slot)[0];
    this.doItemOption(slot, opt);
  }

  doItemOption(slot, opt) {
    const g = this.game, p = g.player;
    const it = p.inventory.get(slot);
    if (!it) return;
    const def = getItem(it.id);
    const m = /^Deposit-(\w+)$/.exec(opt);
    if (m) return this.ui.interfaces.deposit(slot, m[1]);
    if (opt === 'Value') return this.ui.interfaces.valueSell(it.id);
    const sm = /^Sell (\d+)$/.exec(opt);
    if (sm) return this.ui.interfaces.sell(it.id, Number(sm[1]));
    if (opt === 'Use') { this.ui.setSelected({ type: 'item', slot, id: it.id, name: def.name }); return; }
    if (opt === 'Examine') { g.interactions.dispatch('item', 'Examine', it.id, null, { game: g, player: p, item: it, slot, def }); return; }
    if (opt === 'Destroy') { p.inventory.removeAt(slot); g.message(`You destroy the ${def.name}.`); return; }
    g.useItemOption(p, slot, opt);
  }

  invContext(e, slot) {
    const it = this.game.player.inventory.get(slot);
    const sel = this.ui.selected;
    if (sel?.type === 'item' && it) {
      this.ui.menu.show(e.clientX, e.clientY, [
        { option: 'Use', target: `${sel.name} -> ${getItem(it.id).name}`, targetColor: '#ff9040', action: () => { this.ui.clearSelected(); this.game.useItemOnItem(this.game.player, sel.slot, slot); } },
        { option: 'Cancel', action: () => this.ui.clearSelected() },
      ]);
      return;
    }
    if (!it) return;
    const name = getItem(it.id).name;
    this.ui.menu.show(e.clientX, e.clientY, this.itemOptions(slot).map((opt) => ({ option: opt, target: name, targetColor: '#ff9040', action: () => this.doItemOption(slot, opt) })));
  }

  invHover(slot) {
    const it = this.game.player.inventory.get(slot);
    if (!it) { this.ui.setHoverText(''); return; }
    const opts = this.itemOptions(slot);
    const name = getItem(it.id).name;
    const sel = this.ui.selected;
    if (sel?.type === 'item') this.ui.setHoverText(`Use <span style="color:#ff9040">${escapeHtml(sel.name)} -&gt; ${escapeHtml(name)}</span>`);
    else if (this.shiftDropOn(this.game.input?.mods?.shift) && opts.includes('Drop')) this.ui.setHoverText(`Drop <span style="color:#ff9040">${escapeHtml(name)}</span>`);
    else this.ui.setHoverText(`${escapeHtml(opts[0])} <span style="color:#ff9040">${escapeHtml(name)}</span>${opts.length > 1 ? ` / ${opts.length - 1} more options` : ''}`);
  }

  // ------------------------------------------------------------------------------------------
  // Equipment
  // ------------------------------------------------------------------------------------------
  render_equipment(pane) {
    const p = this.game.player;
    pane.innerHTML = '';
    const grid = el('div', 'equip-grid');
    for (const slot of EQUIP_SLOTS) {
      const [cx, cy] = SLOT_POS[slot];
      const it = p.equipment.get(slot);
      const s = el('div', 'equip-slot');
      s.style.gridColumn = cx + 1; s.style.gridRow = cy + 1;
      if (it) {
        const def = getItem(it.id);
        s.innerHTML = `<img alt="" src="${getItemIcon(it.id, it.qty)}">${def.stackable ? `<span class="qty">${formatQty(it.qty).text}</span>` : ''}`;
        s.title = def.name;
        s.onclick = () => this.game.interactions.dispatch('equipment', 'Remove', it.id, null, { game: this.game, player: p, item: it, slot, def });
        s.oncontextmenu = (e) => {
          e.preventDefault();
          const opts = ['Remove', ...(def.equipOptions || []), 'Examine'];
          this.ui.menu.show(e.clientX, e.clientY, opts.map((o) => ({ option: o, target: def.name, targetColor: '#ff9040', action: () => this.game.interactions.dispatch('equipment', o, it.id, null, { game: this.game, player: p, item: it, slot, def }) })));
        };
      } else {
        s.innerHTML = `<img alt="" class="ghost" src="${getShapeIcon(SLOT_GHOST[slot], '#5a5046')}">`;
      }
      grid.appendChild(s);
    }
    pane.appendChild(grid);
    const btn = el('button', 'btn', 'Equipment Stats');
    btn.onclick = () => this.showBonuses();
    pane.appendChild(btn);
  }

  showBonuses() {
    const b = this.game.player.equipment.bonuses();
    const row = (k) => `<div class="bonus-row"><span>${BONUS_LABELS[k]}:</span><span>${b[k] >= 0 ? '+' : ''}${b[k]}</span></div>`;
    this.ui.openInterface({
      id: 'equipment_stats', title: 'Equipment Stats', width: 360,
      render: (body) => {
        body.innerHTML = `<div class="bonus-cols">
          <div><h4>Attack bonus</h4>${BONUS_KEYS.slice(0, 5).map(row).join('')}</div>
          <div><h4>Defence bonus</h4>${BONUS_KEYS.slice(5, 10).map(row).join('')}</div>
          <div><h4>Other bonuses</h4>${BONUS_KEYS.slice(10).map(row).join('')}<div class="bonus-row"><span>Attack speed:</span><span>${this.game.player.equipment.attackSpeed()} ticks</span></div></div></div>`;
      },
    });
  }

  // ------------------------------------------------------------------------------------------
  // Skills
  // ------------------------------------------------------------------------------------------
  render_skills(pane) {
    const sk = this.game.player.skills;
    if (!this.skillCells) {
      pane.innerHTML = '';
      const grid = el('div', 'skills-grid');
      this.skillCells = {};
      for (const s of SKILL_GRID) {
        const c = el('div', 'skill-cell', `<img alt="" src="${getSkillIcon(s)}"><span class="lv"><b class="cur"></b><i>/</i><b class="base"></b></span>`);
        c.addEventListener('mousemove', (e) => this.ui.showTooltip(e.clientX, e.clientY, this.skillTip(s)));
        c.addEventListener('mouseleave', () => this.ui.hideTooltip());
        grid.appendChild(c);
        this.skillCells[s] = c;
      }
      this.totalCell = el('div', 'skill-cell total');
      grid.appendChild(this.totalCell);
      pane.appendChild(grid);
    }
    for (const s of SKILL_GRID) {
      const c = this.skillCells[s];
      c.querySelector('.cur').textContent = sk.getCurrent(s);
      c.querySelector('.base').textContent = sk.getLevel(s);
    }
    this.totalCell.innerHTML = `<span>Total level:</span><b>${sk.totalLevel()}</b>`;
  }

  skillTip(s) {
    const sk = this.game.player.skills;
    const xp = sk.getXp(s), lv = sk.getLevel(s);
    const next = lv < 99 ? xpForLevel(lv + 1) : null;
    return `<b>${SKILL_NAMES[s]} XP:</b> ${fmt(xp)}` + (next ? `<br><b>Next level at:</b> ${fmt(next)}<br><b>Remaining XP:</b> ${fmt(next - xp)}` : '');
  }

  // ------------------------------------------------------------------------------------------
  // Combat
  // ------------------------------------------------------------------------------------------
  render_combat(pane) {
    const p = this.game.player;
    const w = p.equipment.weapon();
    const wt = getWeaponType(p.equipment.weaponType());
    pane.innerHTML = '';
    pane.appendChild(el('div', 'combat-head', `<b>${escapeHtml(w ? w.name : 'Unarmed')}</b><br>Combat Lvl: ${p.combatLevel}<br><small>Category: ${escapeHtml(wt.id)}</small>`));
    const styles = el('div', 'combat-styles');
    wt.styles.forEach((st, i) => {
      const b = el('button', `style-btn${p.combatStyle === i ? ' active' : ''}`, `<b>${escapeHtml(st.name)}</b><small>(${st.type}) ${st.style}</small>`);
      b.title = `XP: ${st.xp.map((x) => SKILL_NAMES[x]).join(', ')}`;
      b.onclick = () => { p.combatStyle = i; this.game.events.emit('combat:style', { player: p, style: st }); this.refresh('combat'); };
      styles.appendChild(b);
    });
    pane.appendChild(styles);
    const ar = el('button', `btn retaliate${p.autoRetaliate ? ' on' : ''}`, `Auto Retaliate (${p.autoRetaliate ? 'On' : 'Off'})`);
    ar.onclick = () => { p.autoRetaliate = !p.autoRetaliate; this.refresh('combat'); };
    pane.appendChild(ar);
    const spec = el('div', 'spec-bar', `<div class="spec-fill" style="width:${p.specialEnergy}%"></div><span>Special Attack: ${p.specialEnergy}%</span>`);
    spec.classList.toggle('disabled', !w?.special);
    spec.onclick = () => this.game.events.emit('ui:special', { handled: false });
    pane.appendChild(spec);
  }

  // ------------------------------------------------------------------------------------------
  // Quests
  // ------------------------------------------------------------------------------------------
  render_quests(pane) {
    const p = this.game.player;
    const qs = allQuests();
    const qp = qs.reduce((a, q) => a + ((p.quests[q.id] || 0) >= q.completeStage ? q.questPoints : 0), 0);
    pane.innerHTML = `<div class="quest-head">Quest Points: ${qp}</div>`;
    const list = el('div', 'quest-list');
    for (const q of qs) {
      const st = p.quests[q.id] || 0;
      const cls = st >= q.completeStage ? 'q-done' : st > 0 ? 'q-started' : 'q-new';
      const row = el('div', `quest-row ${cls}`, escapeHtml(q.name));
      row.onclick = () => this.ui.openQuestJournal(q.id);
      list.appendChild(row);
    }
    if (!qs.length) list.appendChild(el('div', 'muted', 'No quests registered.'));
    pane.appendChild(list);
  }

  // ------------------------------------------------------------------------------------------
  // Prayer
  // ------------------------------------------------------------------------------------------
  render_prayer(pane) {
    const p = this.game.player;
    pane.innerHTML = `<div class="pray-head">Prayer: ${p.skills.getCurrent('prayer')} / ${p.skills.getLevel('prayer')}</div>`;
    const grid = el('div', 'icon-grid');
    for (const pr of allPrayers()) {
      const ok = p.skills.getLevel('prayer') >= pr.level;
      const c = el('div', `icon-cell${ok ? '' : ' locked'}${p.activePrayers.has(pr.id) ? ' active' : ''}`, `<img alt="" src="${getShapeIcon(pr.icon?.shape || 'star', pr.icon?.color || '#f0e8a0', pr.icon?.color2)}">`);
      c.onclick = () => this.game.events.emit('ui:prayer', { id: pr.id, player: p, handled: false });
      c.addEventListener('mousemove', (e) => this.ui.showTooltip(e.clientX, e.clientY, `<b>${escapeHtml(pr.name)}</b> (Level ${pr.level})<br>${escapeHtml(pr.description || '')}`));
      c.addEventListener('mouseleave', () => this.ui.hideTooltip());
      grid.appendChild(c);
    }
    pane.appendChild(grid);
  }

  // ------------------------------------------------------------------------------------------
  // Magic
  // ------------------------------------------------------------------------------------------
  render_magic(pane) {
    const p = this.game.player;
    const book = p.data.spellbook || 'standard';
    pane.innerHTML = '';
    const grid = el('div', 'icon-grid spells');
    for (const sp of allSpells().filter((s) => s.book === book)) {
      const ok = p.skills.getLevel('magic') >= sp.level;
      const sel = this.ui.selected?.type === 'spell' && this.ui.selected.id === sp.id;
      const c = el('div', `icon-cell${ok ? '' : ' locked'}${sel ? ' active' : ''}`, `<img alt="" src="${getShapeIcon(sp.icon?.shape || 'rune', sp.icon?.color || '#8ad0ff', sp.icon?.color2)}">`);
      c.onclick = () => {
        if (!ok) { this.game.message(`You need a Magic level of ${sp.level} to cast this spell.`); return; }
        if (sp.targets?.length) this.ui.setSelected({ type: 'spell', id: sp.id, name: sp.name });
        else this.game.castSpell(p, sp.id);
      };
      const runes = Object.entries(sp.runes || {}).map(([id, n]) => `${n} x ${escapeHtml(getItem(id)?.name || id)}`).join('<br>');
      c.addEventListener('mousemove', (e) => this.ui.showTooltip(e.clientX, e.clientY, `<b>${escapeHtml(sp.name)}</b> (Level ${sp.level})<br>${escapeHtml(sp.description || '')}${runes ? `<br><span class="muted">${runes}</span>` : ''}`));
      c.addEventListener('mouseleave', () => this.ui.hideTooltip());
      grid.appendChild(c);
    }
    pane.appendChild(grid);
  }

  // ------------------------------------------------------------------------------------------
  // Friends (multiplayer placeholder - owned by the networking agent)
  // ------------------------------------------------------------------------------------------
  render_friends(pane) {
    if (pane.dataset.custom) return;
    pane.innerHTML = '<div class="tab-title">Multiplayer</div><div class="muted pad">Peer-to-peer play is not connected yet.</div>';
  }

  // ------------------------------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------------------------------
  render_settings(pane) {
    const p = this.game.player, s = p.settings;
    pane.innerHTML = '<div class="tab-title">Settings</div>';
    const toggle = (key, label, after) => {
      const row = el('label', 'set-row', `<input type="checkbox" ${s[key] ? 'checked' : ''}> ${label}`);
      row.querySelector('input').onchange = (e) => { s[key] = e.target.checked; after?.(); this.game.events.emit('settings:change', { key, value: s[key] }); };
      pane.appendChild(row);
    };
    toggle('shadows', 'Shadows', () => this.game.renderer.applySettings());
    this.game.renderer.settingsDefaults?.(s); // graphics (render/renderer.js)
    toggle('highQuality', 'High quality (glow, colour grading)', () => this.game.renderer.applySettings());
    toggle('weather', 'Weather effects', () => this.game.renderer.applySettings());
    toggle('alwaysDay', 'Always day');
    toggle('roofs', 'Show roofs');
    toggle('xpDrops', 'XP drops');
    toggle('wildyWarning', 'Wilderness warning');
    toggle('showFps', 'Show FPS');
    if (s.autoQuality === undefined) s.autoQuality = true;
    toggle('autoQuality', 'Auto quality (lower settings if slow)');
    if (s.shiftDrop === undefined) s.shiftDrop = true;
    toggle('shiftDrop', 'Shift-click drops items');
    const dd = el('label', 'set-row', `Draw distance <select><option value="0">Short</option><option value="1">Normal</option><option value="2">Far</option></select>`);
    const sel = dd.querySelector('select');
    sel.value = String(s.drawDistance ?? 1);
    sel.onchange = () => { s.drawDistance = Number(sel.value); this.game.renderer.applySettings(); };
    pane.appendChild(dd);
    this.game.audio?.renderSettings(pane); // Sound section (src/audio/ui.js)
    const save = el('button', 'btn', 'Save game');
    save.onclick = () => { if (saveGame(this.game)) this.game.message('Game saved.'); };
    const reset = el('button', 'btn danger', 'Delete character');
    reset.onclick = () => {
      if (!confirm('Delete your character and start over? This cannot be undone.')) return;
      this.game.player._noSave = true;
      deleteSave();
      location.reload();
    };
    const info = el('div', 'muted pad', `Played: ${Math.floor((p.playTime * 0.6) / 60)} min`);
    const help = el('button', 'btn help-btn', 'Controls &amp; tips');
    help.onclick = () => openHelp(this.ui);
    pane.append(help, save, reset, info);
  }
}
