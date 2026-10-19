// Phones & tablets (`game.ui.mobile`). Sets layout classes on <html> that css/style.css keys off:
//   .touch      – a touch screen (bigger menus / buttons, long-press menus on panels)
//   .m          – compact layout: phones (width <= 600 or height <= 500), with .portrait or .landscape
//   .sheet-open – the side panel's content is showing (tab bar is always visible), .chat-open – chat unfolded,
//   .chat-overlay – a dialogue / make-X / prompt is in the chatbox, .kb-open – the on-screen keyboard is up
//   (.kb-chat / .kb-side: the focused field is in the chat / the side panel)
// and CSS variables: --stack (px from the bottom that the side panel covers), --stack-w (its width in landscape),
// --kb (keyboard height). Also: floating Run / Menu buttons (the menu holds what desktop reaches with hotkeys),
// press-and-hold = right-click on any panel (inventory, bank, shop, equipment...), no page zoom / bounce.

import { el } from './util.js';
import { openHelp } from './help.js';

const LONG_PRESS_MS = 450;
const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICONS = {
  menu: svg('<path d="M4 6.5h16M4 12h16M4 17.5h16" stroke-width="2.6" stroke-linecap="round" fill="none"/>'),
  run: svg('<path d="M8 3.5h6l-.6 8.2 5.1 2.3c1.5.7 2 1.7 2 3.2V19H4.2l.6-3.1L8 13.2Z"/>'),
};
/** Windows that work together with the inventory: the sheet stays open for these (trade has its own inventory). */
const WITH_INVENTORY = /^(bank|shop|deposit)/;

export class MobileUI {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    ui.mobile = this;
    this.html = document.documentElement;
    // primary pointer is a finger (phones, tablets). Touch-screen laptops keep the mouse UI (hover text etc.)
    // but still get press-and-hold menus on the panels.
    this.touch = !!window.matchMedia?.('(pointer: coarse)').matches;
    this.html.classList.toggle('touch', this.touch);
    const anyTouch = this.touch || navigator.maxTouchPoints > 0;
    this.compact = false;
    this.chatOpen = false;
    this.buildFab();
    this.layout();
    window.addEventListener('resize', () => this.layout());
    window.addEventListener('orientationchange', () => setTimeout(() => this.layout(), 120));
    if (window.ResizeObserver) new ResizeObserver(() => this.measure()).observe(this.ui.side.root);
    this.initKeyboard();
    this.preventZoom();
    if (anyTouch) this.initLongPress();

    const ev = this.game.events;
    // a window that does not need the inventory gets the whole screen: fold the sheet away
    // (bank / shop instead bring the inventory up next to the window)
    ev.on('ui:open', ({ id }) => {
      if (!this.compact) return;
      if (!WITH_INVENTORY.test(id || '')) { this.ui.side.collapse(); return; }
      if (this.ui.side.collapsed) this.ui.side.selectTab('inventory');
    });
    ev.on('run:change', () => this.syncRun());
    ev.on('game:ready', () => this.syncRun());
  }

  // ---- layout ------------------------------------------------------------------------------------
  layout() {
    const w = window.innerWidth, h = window.innerHeight;
    // the keyboard shrinks innerHeight on Android: don't flip to the landscape layout while typing
    const typing = this.kbOpen && this.compact;
    const compact = typing ? true : w <= 600 || h <= 500;
    const portrait = typing ? this.portrait : h >= w;
    const changed = compact !== this.compact;
    this.compact = compact;
    this.portrait = portrait;
    const c = this.html.classList;
    c.toggle('m', compact);
    c.toggle('portrait', compact && portrait);
    c.toggle('landscape', compact && !portrait);
    if (changed) {
      if (compact) { this.ui.side.collapse(); this.setChat(false); } else {
        const side = this.ui.side;
        if (side.collapsed) side.selectTab(side.lastTab || 'inventory');
        this.setChat(true);
      }
    }
    this.measure();
  }

  /** Publish how much of the screen the side panel takes (the chat, windows and buttons sit beside it). */
  measure() {
    const r = this.ui.side.root.getBoundingClientRect();
    const st = this.html.style;
    st.setProperty('--stack', `${Math.max(0, Math.round(window.innerHeight - r.top))}px`);
    st.setProperty('--stack-w', `${Math.max(0, Math.round(window.innerWidth - r.left))}px`);
  }

  /** Side panel content shown / folded away (called by SidePanel). */
  onSheet(open) {
    this.html.classList.toggle('sheet-open', open);
    // portrait: the sheet and an unfolded chat would bury the view - fold the chat (unless it's a dialogue)
    if (open && this.compact && this.portrait && this.chatOpen && !this.ui.interfaces?.chatMode) this.setChat(false);
    this.measure();
  }

  // ---- chat --------------------------------------------------------------------------------------
  setChat(open) {
    this.chatOpen = open;
    this.html.classList.toggle('chat-open', open);
    const root = this.ui.chat.root;
    root.classList.toggle('folded', this.compact && !open);
    const log = this.ui.chat.log;
    log.scrollTop = log.scrollHeight;
  }

  toggleChat(force) {
    if (!this.compact) return;
    const open = force ?? !this.chatOpen;
    this.setChat(open);
    if (open && this.portrait && !this.ui.bankOpen && !this.ui.shopOpen && !this.ui.interfaces?.modal) this.ui.side.collapse();
  }

  /** Dialogue / make-X / prompt shown in the chatbox. */
  onChatOverlay(open) {
    this.html.classList.toggle('chat-overlay', open);
    if (!this.compact) return;
    this.ui.chat.root.classList.toggle('folded', !open && !this.chatOpen);
    if (!open) return;
    this.ui.chat.root.classList.remove('folded');
    // chatMode is set right after the overlay opens; a number prompt (bank Withdraw-X) keeps the inventory up
    queueMicrotask(() => {
      const mode = this.ui.interfaces?.chatMode;
      if (mode === 'prompt' || this.ui.bankOpen || this.ui.shopOpen || this.ui.interfaces?.modal) return;
      if (this.portrait) this.ui.side.collapse();
    });
  }

  // ---- floating buttons: Menu (world map, emotes, settings...) and Run ---------------------------------
  buildFab() {
    const fab = el('div', 'm-fab');
    fab.id = 'm-fab';
    this.menuBtn = el('button', 'm-fab-btn m-fab-menu', ICONS.menu);
    this.menuBtn.title = 'Menu';
    this.menuBtn.onclick = (e) => { e.stopPropagation(); this.toggleMenu(); };
    this.runBtn = el('button', 'm-fab-btn m-fab-run', `${ICONS.run}<b></b>`);
    this.runBtn.title = 'Run';
    this.runBtn.onclick = (e) => { e.stopPropagation(); this.game.toggleRun(); this.syncRun(); };
    fab.append(this.menuBtn, this.runBtn);
    this.menuEl = el('div', 'm-menu panel hidden');
    document.getElementById('game-root').append(fab, this.menuEl);
    window.addEventListener('pointerdown', (e) => {
      if (!this.menuEl.classList.contains('hidden') && !this.menuEl.contains(e.target) && !this.menuBtn.contains(e.target)) this.toggleMenu(false);
    }, true);
    setInterval(() => this.syncRun(), 1000); // energy number
  }

  syncRun() {
    const p = this.game.player;
    if (!p || !this.runBtn) return;
    this.runBtn.classList.toggle('on', !!p.runToggled);
    const b = this.runBtn.lastChild;
    const txt = String(Math.floor(p.runEnergy / 100));
    if (b.textContent !== txt) b.textContent = txt;
  }

  menuEntries() {
    const g = this.game, ui = this.ui, P = g.progress;
    const tab = (id) => () => ui.selectTab(id);
    return [
      ['World map', () => ui.worldMap.open()],
      ['Emotes', tab('emotes')],
      ['Settings', tab('settings')],
      ['Multiplayer', tab('friends')],
      P?.openChronicles && ['Chronicles', () => P.openChronicles()],
      P?.openCollectionLog && ['Collection log', () => P.openCollectionLog()],
      P?.openHiscores && ['Hiscores', () => P.openHiscores()],
      ['Chat', () => { this.toggleChat(true); setTimeout(() => ui.chat.input.focus(), 50); }],
      ['Face north', () => g.renderer.cameraCtl.resetNorth()],
      ['Controls & tips', () => openHelp(ui)],
    ].filter((e) => e && (e[0] !== 'Emotes' || ui.side.tabs.has('emotes')));
  }

  toggleMenu(open = this.menuEl.classList.contains('hidden')) {
    const m = this.menuEl;
    if (!open) { m.classList.add('hidden'); this.menuBtn.classList.remove('on'); return; }
    m.innerHTML = '';
    m.appendChild(el('div', 'm-menu-head', 'Menu'));
    const grid = el('div', 'm-menu-grid');
    for (const [label, fn] of this.menuEntries()) {
      const b = el('button', 'btn m-menu-btn', label);
      b.onclick = () => { this.toggleMenu(false); try { fn(); } catch (err) { console.error('[menu]', err); } };
      grid.appendChild(b);
    }
    m.appendChild(grid);
    m.classList.remove('hidden');
    this.menuBtn.classList.add('on');
  }

  // ---- press-and-hold on panels = right-click ---------------------------------------------------------
  /**
   * Any DOM element under a held finger gets a synthetic `contextmenu` event (iOS never sends one; Android's
   * native one is swallowed so the menu doesn't open twice) and the click that would follow is suppressed.
   * The 3D view handles its own touches (input.js).
   */
  initLongPress() {
    let lp = null;
    const cancel = () => { if (lp) clearTimeout(lp.timer); lp = null; };
    const skip = (t) => !(t instanceof Element) || t.id === 'game-canvas' || t.closest('input, textarea, select, .wm-body, #charcreate, #context-menu');
    document.addEventListener('touchstart', (e) => {
      cancel();
      if (e.touches.length !== 1 || skip(e.target)) return;
      const t = e.touches[0];
      const cur = lp = { x: t.clientX, y: t.clientY, target: e.target, fired: false, native: false };
      cur.timer = setTimeout(() => {
        if (lp !== cur || cur.native) return;
        cur.fired = true;
        try { navigator.vibrate?.(12); } catch { /* not allowed */ }
        cur.target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: cur.x, clientY: cur.y, button: 2, buttons: 2 }));
      }, LONG_PRESS_MS);
    }, { capture: true, passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!lp) return;
      const t = e.touches[0];
      if (!t || Math.hypot(t.clientX - lp.x, t.clientY - lp.y) > 10) cancel();
    }, { capture: true, passive: true });
    document.addEventListener('touchend', (e) => {
      if (lp?.fired || lp?.native) e.preventDefault(); // no click after a long press
      cancel();
    }, { capture: true, passive: false });
    document.addEventListener('touchcancel', cancel, { capture: true, passive: true });
    document.addEventListener('contextmenu', (e) => {
      if (!e.isTrusted || !lp) return;
      if (lp.fired) { e.preventDefault(); e.stopPropagation(); return; } // ours already opened the menu
      lp.native = true; clearTimeout(lp.timer); // the browser was faster: let its event through
    }, true);
    // tooltips (skills, prayers, spells) come from emulated mouse moves: the next touch hides them
    document.addEventListener('touchstart', () => this.ui.hideTooltip(), { capture: true, passive: true });
  }

  // ---- on-screen keyboard (iOS keeps the layout viewport; Android shrinks it) -----------------------------
  initKeyboard() {
    const vv = window.visualViewport;
    const update = () => {
      const kb = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
      const focused = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      this.kbOpen = focused && (kb > 60 || (this.touch && this.compact));
      this.html.style.setProperty('--kb', `${focused ? kb : 0}px`);
      this.html.classList.toggle('kb-open', !!this.kbOpen);
      // which part has the focused field: the chat (also prompts) moves above the keyboard, or the side panel lifts
      const a = document.activeElement;
      this.html.classList.toggle('kb-chat', !!this.kbOpen && this.ui.chat.root.contains(a));
      this.html.classList.toggle('kb-side', !!this.kbOpen && this.ui.side.root.contains(a));
    };
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    document.addEventListener('focusin', (e) => {
      update();
      const t = e.target;
      if (!this.touch || !(t instanceof HTMLInputElement)) return;
      // keep the field in view above the keyboard
      setTimeout(() => { update(); t.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); }, 350);
    });
    document.addEventListener('focusout', () => setTimeout(() => {
      update();
      if (this.touch) window.scrollTo(0, 0); // iOS leaves the page scrolled after the keyboard closes
      this.layout();
    }, 60));
  }

  // ---- no pinch-zoom / double-tap zoom / overscroll bounce on the page itself ----------------------------
  preventZoom() {
    const stop = (e) => e.preventDefault();
    document.addEventListener('gesturestart', stop, { passive: false }); // iOS Safari pinch
    document.addEventListener('gesturechange', stop, { passive: false });
    document.addEventListener('dblclick', (e) => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1 && !e.target.closest?.('#game-canvas, .wm-body')) e.preventDefault();
    }, { passive: false });
  }
}
