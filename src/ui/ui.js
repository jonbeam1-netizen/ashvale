// UIManager: composes the HUD and exposes the UI API used by systems (game.ui.*).

import { Chatbox } from './chatbox.js';
import { Minimap } from './minimap.js';
import { SidePanel } from './sidepanel.js';
import { Interfaces } from './interfaces.js';
import { ContextMenu } from './contextmenu.js';
import { getSkillIcon } from './icons.js';
import { el, escapeHtml, fmt } from './util.js';
import { SKILL_NAMES } from '../core/constants.js';
import { getItem } from '../core/registry.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    game.ui = this;
    this.selected = null;       // {type:'item', slot, id, name} | {type:'spell', id, name}
    this.bankOpen = false;
    this.shopOpen = null;
    this.chat = new Chatbox(this);
    this.menu = new ContextMenu(this);
    this.interfaces = new Interfaces(this);
    this.side = new SidePanel(this);
    this.minimap = new Minimap(this);
    this.hoverEl = document.getElementById('hover-text');
    this.tooltipEl = document.getElementById('tooltip');
    this.xpEl = document.getElementById('xp-drops');
    this.areaEl = document.getElementById('area-popup');
    this.wildEl = document.getElementById('wild-level');
    this.fpsEl = document.getElementById('fps');
    this.crossEl = document.getElementById('click-cross');
    this.wire();
  }

  wire() {
    const ev = this.game.events;
    ev.on('xp', ({ player, skill, amount }) => { if (player === this.game.player) this.xpDrop(skill, amount); });
    ev.on('levelup', ({ player, skill, level }) => {
      if (player !== this.game.player) return;
      const name = SKILL_NAMES[skill];
      this.game.message(`<col=0000a0>Congratulations, you've just advanced your ${name} level. You are now level ${level}.</col>`);
      this.levelUpBanner(skill, level);
      this.game.spawnEffect('levelup', player);
    });
    ev.on('area:enter', ({ area }) => {
      if (!area?.name) return;
      this.areaEl.textContent = area.name;
      this.areaEl.classList.remove('show');
      void this.areaEl.offsetWidth;
      this.areaEl.classList.add('show');
    });
    ev.on('wilderness:change', ({ level }) => {
      this.wildEl.style.display = level > 0 ? '' : 'none';
      this.wildEl.innerHTML = `<div class="skull"></div>Level: ${level}`;
    });
    ev.on('player:walk', () => this.closeInterfaces());
  }

  // ---- public API ---------------------------------------------------------------------------
  openBank() { return this.interfaces.openBank(); }
  openShop(shopId) { return this.interfaces.openShop(shopId); }
  startDialogue(idOrNodes, ctx) { return this.interfaces.startDialogue(idOrNodes, ctx); }
  openMakeX(opts) { return this.interfaces.openMakeX(opts); }
  openInterface(opts) { return this.interfaces.open(opts); }
  openQuestJournal(id) { return this.interfaces.openQuestJournal(id); }
  promptNumber(title) { return this.interfaces.promptNumber(title); }
  promptText(title) { return this.interfaces.promptText(title); }
  closeInterfaces() { this.interfaces.closeAll(); }
  isInterfaceOpen() { return !!this.interfaces.modal || !!this.interfaces.chatMode; }
  selectTab(id) { this.side.selectTab(id); }
  getTabElement(id) { return this.side.getTabElement(id); }
  registerTab(def) { return this.side.registerTab(def); }
  refreshTab(id) { this.side.refresh(id); }

  setSelected(sel) {
    this.selected = sel;
    this.game.events.emit('ui:selection', { selected: sel });
  }
  clearSelected() {
    if (!this.selected) return;
    this.selected = null;
    this.game.events.emit('ui:selection', { selected: null });
  }

  castSpellOnItem(spellId, slot) {
    const g = this.game, p = g.player;
    const it = p.inventory.get(slot);
    if (!it) return;
    const ctx = { game: g, player: p, spell: g.registry.getSpell(spellId), item: it, slot, def: getItem(it.id) };
    if (!g.interactions.dispatch('spellOnItem', 'cast', spellId, it.id, ctx)) g.message('Nothing interesting happens.');
  }

  setHoverText(html) {
    if (this._hover === html) return;
    this._hover = html;
    this.hoverEl.innerHTML = html;
  }

  showTooltip(x, y, html) {
    const t = this.tooltipEl;
    if (t.innerHTML !== html) t.innerHTML = html;
    t.style.display = 'block';
    const r = t.getBoundingClientRect();
    t.style.left = `${Math.min(window.innerWidth - r.width - 4, x + 12)}px`;
    t.style.top = `${Math.min(window.innerHeight - r.height - 4, y + 14)}px`;
  }
  hideTooltip() { this.tooltipEl.style.display = 'none'; }

  /** Animated click cross: color 'yellow' (walk) or 'red' (interact). */
  clickCross(x, y, color = 'yellow') {
    const c = el('div', `cross cross-${color}`);
    c.style.left = `${x}px`; c.style.top = `${y}px`;
    this.crossEl.appendChild(c);
    setTimeout(() => c.remove(), 420);
  }

  xpDrop(skill, amount) {
    if (!this.game.player.settings.xpDrops) return;
    const d = el('div', 'xp-drop', `<img alt="" src="${getSkillIcon(skill)}"><span>+${fmt(Math.round(amount))}</span>`);
    this.xpEl.appendChild(d);
    setTimeout(() => d.remove(), 1800);
  }

  levelUpBanner(skill, level) {
    const b = el('div', 'levelup', `<img alt="" src="${getSkillIcon(skill)}"><div><b>Congratulations!</b><br>You've just advanced your ${escapeHtml(SKILL_NAMES[skill])} level.<br>You are now level ${level}.</div>`);
    document.getElementById('game-root').appendChild(b);
    setTimeout(() => b.classList.add('fade'), 3200);
    setTimeout(() => b.remove(), 4000);
  }

  /** Per-frame update. */
  update() {
    this.minimap.draw();
    const show = this.game.player.settings.showFps;
    this.fpsEl.style.display = show ? '' : 'none';
    if (show) this.fpsEl.textContent = `${this.game.renderer.fps} fps`;
  }
}
