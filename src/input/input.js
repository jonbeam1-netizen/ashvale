// Mouse/keyboard input on the 3D view: picking, menu entry building, left-click default action,
// right-click context menu and hover text. Systems may add/alter entries via the 'menu:entries' event.

import { escapeHtml, levelColor } from '../ui/util.js';
import { getItem } from '../core/registry.js';

const COL = { npc: '#ffff00', object: '#00ffff', ground: '#ff9040', player: '#ffffff' };

export class InputManager {
  constructor(game) {
    this.game = game;
    game.input = this;
    this.canvas = game.renderer.renderer.domElement;
    this.lastHover = 0;
    this.mouse = { x: 0, y: 0, inside: false };
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mousedown', (e) => this.onDown(e));
    this.canvas.addEventListener('mousemove', (e) => { this.mouse = { x: e.clientX, y: e.clientY, inside: true }; });
    this.canvas.addEventListener('mouseleave', () => { this.mouse.inside = false; this.game.ui.setHoverText(''); });
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.initTouch();
  }

  // ---- touch screens: tap = left-click, press-and-hold = right-click menu, one-finger drag = rotate the
  //      camera, two-finger pinch = zoom. (Panels/menus are DOM and get the browser's synthesized clicks.)
  initTouch() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    this.touch = null;
    this.touchTimer = 0;
    const opts = { passive: false };
    c.addEventListener('touchstart', (e) => this.onTouchStart(e), opts);
    c.addEventListener('touchmove', (e) => this.onTouchMove(e), opts);
    c.addEventListener('touchend', (e) => this.onTouchEnd(e), opts);
    c.addEventListener('touchcancel', () => { clearTimeout(this.touchTimer); this.touch = null; }, opts);
  }

  onTouchStart(e) {
    e.preventDefault(); // no emulated mouse events / page zoom on the 3D view
    const ts = e.touches;
    clearTimeout(this.touchTimer);
    if (ts.length === 1) {
      const t = ts[0];
      this.touch = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, moved: false, long: false };
      this.touchTimer = setTimeout(() => {
        const cur = this.touch;
        if (!cur || cur.moved || cur.pinch) return;
        cur.long = true;
        this.onDown({ button: 2, clientX: cur.x, clientY: cur.y });
      }, 450);
    } else if (ts.length === 2) {
      this.touch = { pinch: Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY), moved: true };
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    const t = this.touch;
    if (!t) return;
    const cam = this.game.renderer.cameraCtl;
    const ts = e.touches;
    if (ts.length === 2 && t.pinch) {
      const d = Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
      if (d > 0) cam.targetDist = Math.max(cam.minDist, Math.min(cam.maxDist, cam.targetDist * (t.pinch / d)));
      t.pinch = d;
      return;
    }
    if (ts.length !== 1 || t.pinch) return;
    const p = ts[0];
    if (!t.moved && Math.hypot(p.clientX - t.x, p.clientY - t.y) > 12) { t.moved = true; clearTimeout(this.touchTimer); }
    if (t.moved && !t.long) {
      cam.yaw -= (p.clientX - t.lx) * 0.008;
      cam.pitch = Math.max(cam.minPitch, Math.min(cam.maxPitch, cam.pitch + (p.clientY - t.ly) * 0.006));
    }
    t.lx = p.clientX; t.ly = p.clientY;
  }

  onTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length) return; // other fingers still down
    clearTimeout(this.touchTimer);
    const t = this.touch;
    this.touch = null;
    if (!t || t.moved || t.long || t.pinch) return;
    this.onDown({ button: 0, clientX: t.x, clientY: t.y });
  }

  onKey(e) {
    if (e.target instanceof HTMLInputElement) return;
    const fkeys = { F1: 'combat', F2: 'skills', F3: 'quests', F4: 'inventory', F5: 'equipment', F6: 'prayer', F7: 'magic', F8: 'friends', F9: 'settings' };
    if (fkeys[e.key]) { e.preventDefault(); this.game.ui.selectTab(fkeys[e.key]); }
    // Alt+R toggles run (plain letters focus the chat input, so the shortcut needs a modifier)
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR') { e.preventDefault(); this.game.toggleRun(); }
  }

  /** Display name for an entity with its OSRS-style colour. */
  label(e) {
    const g = this.game;
    if (e.type === 'npc') {
      const lvl = e.def.combatLevel;
      const lv = lvl > 0 ? ` <span style="color:${levelColor(lvl, g.player.combatLevel)}">(level-${lvl})</span>` : '';
      return { text: e.name, html: `<span style="color:${COL.npc}">${escapeHtml(e.name)}</span>${lv}` };
    }
    if (e.type === 'object') return { text: e.name, html: `<span style="color:${COL.object}">${escapeHtml(e.name)}</span>` };
    if (e.type === 'ground') {
      const q = e.qty > 1 ? ` (${e.qty})` : '';
      return { text: e.name, html: `<span style="color:${COL.ground}">${escapeHtml(e.name + q)}</span>` };
    }
    const lv = ` <span style="color:${levelColor(e.combatLevel, g.player.combatLevel)}">(level-${e.combatLevel})</span>`;
    return { text: e.name, html: `<span style="color:${COL.player}">${escapeHtml(e.name)}</span>${lv}` };
  }

  /** Build OSRS menu entries for a pick result. Each entry: {option, targetHtml, action, cross, kind, entity}. */
  buildEntries(pick) {
    const g = this.game, p = g.player, ui = g.ui;
    const entries = [];
    const sel = ui.selected;
    const walk = pick.tile ? {
      option: 'Walk here', targetHtml: '', cross: 'yellow',
      action: () => { ui.clearSelected(); g.walkTo(p, pick.tile.x, pick.tile.y); },
    } : null;

    if (sel) {
      const kindName = (e) => (e.type === 'object' ? 'Object' : e.type === 'npc' ? 'Npc' : e.type === 'ground' ? 'Ground' : 'Player');
      for (const e of pick.entities) {
        if (sel.type === 'spell' && e.type === 'object' && !g.interactions.matches('spellOnObject', 'cast', sel.id, e.id).length) continue;
        const L = this.label(e);
        const isItem = sel.type === 'item';
        entries.push({
          option: isItem ? 'Use' : 'Cast',
          targetHtml: `<span style="color:${isItem ? '#ff9040' : '#00ff00'}">${escapeHtml(sel.name)}</span> -&gt; ${L.html}`,
          cross: 'red', entity: e,
          action: () => {
            ui.clearSelected();
            if (isItem) {
              const it = p.inventory.get(sel.slot);
              if (!it || it.id !== sel.id) return;
              g.interact(p, e, 'use', { kind: `itemOn${kindName(e)}`, item: it, slot: sel.slot });
            } else {
              g.interact(p, e, 'cast', { kind: `spellOn${kindName(e)}`, spell: g.registry.getSpell(sel.id) });
            }
          },
        });
      }
      if (walk) entries.push(walk);
      entries.push({ option: 'Cancel', targetHtml: '', action: () => ui.clearSelected() });
      return g.events.emit('menu:entries', { pick, entries, selected: sel }).entries;
    }

    const examines = [];
    for (const e of pick.entities) {
      const L = this.label(e);
      let opts = [];
      if (e.type === 'npc') opts = e.def.options || [];
      else if (e.type === 'object') opts = e.def.options || [];
      else if (e.type === 'ground') opts = ['Take'];
      else if (e.type === 'remote') opts = g.events.emit('menu:playerOptions', { target: e, options: ['Follow', 'Trade with'] }).options;
      for (const opt of opts) {
        entries.push({ option: opt, targetHtml: L.html, cross: 'red', entity: e, action: () => g.interact(p, e, opt) });
      }
      if (e.type !== 'remote') {
        examines.push({
          option: 'Examine', targetHtml: L.html, entity: e,
          action: () => {
            const def = e.type === 'ground' ? getItem(e.itemId) : e.def;
            g.message(def?.examine || 'Nothing interesting.');
          },
        });
      }
    }
    if (walk) entries.push(walk);
    entries.push(...examines);
    entries.push({ option: 'Cancel', targetHtml: '', action: () => {} });
    return g.events.emit('menu:entries', { pick, entries, selected: null }).entries;
  }

  onDown(e) {
    const g = this.game;
    if (!g.started || e.button === 1) return;
    g.ui.menu.hide();
    const pick = g.renderer.pick(e.clientX, e.clientY);
    const entries = this.buildEntries(pick);
    if (e.button === 2) {
      g.ui.menu.show(e.clientX, e.clientY, entries.map((en) => ({
        option: en.option, targetHtml: en.targetHtml,
        action: () => this.run(en, e.clientX, e.clientY),
      })));
      return;
    }
    if (e.button === 0) {
      const en = entries[0];
      if (en && en.option !== 'Cancel') this.run(en, e.clientX, e.clientY);
    }
  }

  run(en, x, y) {
    const g = this.game;
    if (en.option !== 'Examine' && en.option !== 'Cancel') g.ui.closeInterfaces();
    if (en.cross) g.ui.clickCross(x, y, en.cross);
    en.action();
  }

  /** Called every frame: refresh hover text (throttled). */
  update() {
    const g = this.game;
    if (!this.mouse.inside || g.ui.menu.open) return;
    const now = performance.now();
    if (now - this.lastHover < 90) return;
    this.lastHover = now;
    const pick = g.renderer.pick(this.mouse.x, this.mouse.y);
    const entries = this.buildEntries(pick).filter((x) => x.option !== 'Cancel');
    const top = entries[0];
    if (!top) { g.ui.setHoverText(''); return; }
    const more = entries.length - 1;
    g.ui.setHoverText(`${escapeHtml(top.option)}${top.targetHtml ? ' ' + top.targetHtml : ''}${more > 0 ? ` <span class="more">/ ${more} more option${more > 1 ? 's' : ''}</span>` : ''}`);
  }
}
