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
    // modifier state for clicks on menus (Ctrl+click = run / walk for one trip, Shift = shift-drop in the inventory)
    this.mods = { ctrl: false, shift: false };
    const mod = (e) => { this.mods.ctrl = e.ctrlKey || e.metaKey; this.mods.shift = e.shiftKey; };
    window.addEventListener('keydown', mod, true);
    window.addEventListener('keyup', mod, true);
    window.addEventListener('blur', () => { this.mods.ctrl = this.mods.shift = false; });
    this.initTouch();
  }

  // ---- touch screens: tap = left-click, press-and-hold = right-click menu (a ring fills while holding),
  //      one-finger drag = rotate/tilt the camera, two fingers: pinch = zoom, twist = rotate, drag up/down = tilt.
  //      (Panels/menus are DOM and get the browser's synthesized clicks; ui/mobile.js adds long-press there.)
  initTouch() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    this.touch = null;
    this.touchTimer = 0;
    this.ring = document.createElement('div');
    this.ring.className = 'lp-ring';
    document.getElementById('game-root')?.appendChild(this.ring);
    const opts = { passive: false };
    c.addEventListener('touchstart', (e) => this.onTouchStart(e), opts);
    c.addEventListener('touchmove', (e) => this.onTouchMove(e), opts);
    c.addEventListener('touchend', (e) => this.onTouchEnd(e), opts);
    c.addEventListener('touchcancel', () => { clearTimeout(this.touchTimer); this.touch = null; this.showRing(false); }, opts);
  }

  /** Long-press feedback: a ring that fills up over the hold time (shown after a short delay, so taps don't flash). */
  showRing(on, x, y) {
    const r = this.ring;
    if (!r) return;
    clearTimeout(this.ringTimer);
    r.classList.remove('on');
    if (!on) return;
    r.style.left = `${x}px`; r.style.top = `${y}px`;
    this.ringTimer = setTimeout(() => { void r.offsetWidth; r.classList.add('on'); }, 110);
  }

  twoFinger(ts) {
    const a = ts[0], b = ts[1];
    return {
      d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      ang: Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX),
      my: (a.clientY + b.clientY) / 2,
    };
  }

  onTouchStart(e) {
    e.preventDefault(); // no emulated mouse events / page zoom on the 3D view
    const ts = e.touches;
    clearTimeout(this.touchTimer);
    this.game.ui?.menu?.hide();
    if (ts.length === 1) {
      const t = ts[0];
      this.touch = { x: t.clientX, y: t.clientY, lx: t.clientX, ly: t.clientY, moved: false, long: false };
      this.showRing(true, t.clientX, t.clientY);
      this.touchTimer = setTimeout(() => {
        const cur = this.touch;
        this.showRing(false);
        if (!cur || cur.moved || cur.pinch) return;
        cur.long = true;
        try { navigator.vibrate?.(12); } catch { /* not allowed */ }
        this.onDown({ button: 2, clientX: cur.x, clientY: cur.y });
      }, 450);
    } else if (ts.length >= 2) {
      this.showRing(false);
      const f = this.twoFinger(ts);
      this.touch = { pinch: f.d || 1, ang: f.ang, my: f.my, moved: true };
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    const t = this.touch;
    if (!t) return;
    const cam = this.game.renderer.cameraCtl;
    const ts = e.touches;
    if (ts.length >= 2 && t.pinch) {
      const f = this.twoFinger(ts);
      if (f.d > 0) cam.targetDist = Math.max(cam.minDist, Math.min(cam.maxDist, cam.targetDist * (t.pinch / f.d)));
      let da = f.ang - t.ang;
      if (da > Math.PI) da -= Math.PI * 2; else if (da < -Math.PI) da += Math.PI * 2;
      cam.yaw += da; // twist: the world turns with the fingers
      cam.pitch = Math.max(cam.minPitch, Math.min(cam.maxPitch, cam.pitch + (f.my - t.my) * 0.005));
      t.pinch = f.d || t.pinch; t.ang = f.ang; t.my = f.my;
      return;
    }
    if (ts.length !== 1 || t.pinch) return;
    const p = ts[0];
    if (!t.moved && Math.hypot(p.clientX - t.x, p.clientY - t.y) > 12) { t.moved = true; clearTimeout(this.touchTimer); this.showRing(false); }
    if (t.moved && !t.long) {
      cam.yaw -= (p.clientX - t.lx) * 0.008;
      cam.pitch = Math.max(cam.minPitch, Math.min(cam.maxPitch, cam.pitch + (p.clientY - t.ly) * 0.006));
    }
    t.lx = p.clientX; t.ly = p.clientY;
  }

  onTouchEnd(e) {
    e.preventDefault();
    if (e.touches.length) {
      // a finger of a pinch lifted: keep tracking the other two (if any), never turn it into a tap
      if (e.touches.length >= 2 && this.touch?.pinch) { const f = this.twoFinger(e.touches); Object.assign(this.touch, { pinch: f.d || 1, ang: f.ang, my: f.my }); }
      return;
    }
    clearTimeout(this.touchTimer);
    this.showRing(false);
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
        action: () => this.run(en, e.clientX, e.clientY, this.mods.ctrl),
      })));
      return;
    }
    if (e.button === 0) {
      const en = entries[0];
      if (en && en.option !== 'Cancel') this.run(en, e.clientX, e.clientY, !!(e.ctrlKey || e.metaKey));
    }
  }

  /** Run a menu entry. ctrl: Ctrl+click runs for this one trip (or walks, when run is switched on). */
  run(en, x, y, ctrl = false) {
    const g = this.game;
    if (en.option !== 'Examine' && en.option !== 'Cancel') {
      g.ui.closeInterfaces();
      g.player.tripRun = ctrl ? !g.player.runToggled : null;
    }
    if (en.cross) g.ui.clickCross(x, y, en.cross);
    en.action();
  }

  /** Called every frame: refresh hover text (throttled). */
  update() {
    const g = this.game;
    if (!this.mouse.inside || g.ui.menu.open || g.renderer.skipped) return;
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
