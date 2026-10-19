// Interfaces: dialogue (in chatbox), make-X (in chatbox), number prompt, bank, shop,
// generic modal windows and quest journals.

import { el, escapeHtml, markup, formatQty, fmt } from './util.js';
import { getItemIcon } from './icons.js';
import { getItem, getDialogue, getShop, getQuest } from '../core/registry.js';

export class Interfaces {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    this.layer = document.getElementById('interface-layer');
    this.modal = null;      // {id, el, onClose}
    this.chatMode = null;   // 'dialogue' | 'makex' | 'prompt'
    this.dlg = null;
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  capturesKeys() { return this.chatMode === 'dialogue' || this.chatMode === 'makex'; }

  onKey(e) {
    if (e.target instanceof HTMLInputElement && this.chatMode !== 'prompt') return;
    if (e.key === 'Escape') { this.closeAll(); return; }
    if (this.chatMode === 'dialogue' && this.dlg) {
      if (e.key === ' ' && this.dlg.waitingContinue) { e.preventDefault(); this.dlg.continue(); }
      const n = Number(e.key);
      if (n >= 1 && this.dlg.options && this.dlg.options[n - 1]) { e.preventDefault(); this.dlg.choose(n - 1); }
    } else if (this.chatMode === 'makex' && this.makeX) {
      const n = Number(e.key);
      if (e.key === ' ' && this.makeX.items.length === 1) { e.preventDefault(); this.makeX.pick(0); }
      else if (n >= 1 && this.makeX.items[n - 1]) { e.preventDefault(); this.makeX.pick(n - 1); }
    }
  }

  // ---- generic modal --------------------------------------------------------------------------------
  /**
   * Open a modal window. opts { id, title, width, height, render(bodyEl, close), onClose, className }
   * Returns { el, body, close }.
   */
  open(opts) {
    this.closeModal();
    const w = el('div', `iface ${opts.className || ''}`);
    if (opts.width) w.style.width = `${opts.width}px`;
    if (opts.height) w.style.height = `${opts.height}px`;
    const head = el('div', 'iface-head', `<span>${escapeHtml(opts.title || '')}</span>`);
    const x = el('button', 'iface-close', 'X');
    head.appendChild(x);
    const body = el('div', 'iface-body');
    w.append(head, body);
    this.layer.appendChild(w);
    const handle = { id: opts.id, el: w, body, onClose: opts.onClose, close: () => this.closeModal() };
    x.onclick = handle.close;
    this.modal = handle;
    try { opts.render?.(body, handle.close); } catch (e) { console.error('[ui] interface render failed', e); }
    this.game.events.emit('ui:open', { id: opts.id });
    return handle;
  }

  closeModal() {
    const m = this.modal;
    if (!m) return;
    this.modal = null;
    m.el.remove();
    this.ui.bankOpen = false;
    this.ui.shopOpen = null;
    try { m.onClose?.(); } catch (e) { console.error(e); }
    this.game.events.emit('ui:close', { id: m.id });
    this.ui.side.refresh('inventory');
  }

  closeChat() {
    if (!this.chatMode) return;
    const wasDlg = this.chatMode === 'dialogue';
    this.chatMode = null;
    this.ui.chat.hideOverlay();
    if (wasDlg && this.dlg) { const d = this.dlg; this.dlg = null; d.onEnd?.(); }
    if (this.makeX) { const m = this.makeX; this.makeX = null; m.onClose?.(); }
    if (this.promptResolve) { const r = this.promptResolve; this.promptResolve = null; r(null); }
  }

  closeAll() { this.closeModal(); this.closeChat(); }

  // ---- dialogue -----------------------------------------------------------------------------------
  /** Start a dialogue by id (registerDialogue) or with an inline node array. ctx: {npc, player, ...} */
  startDialogue(idOrNodes, ctx = {}) {
    this.closeChat();
    const fullCtx = { game: this.game, player: this.game.player, ...ctx };
    let nodes = typeof idOrNodes === 'string' ? getDialogue(idOrNodes)?.nodes : idOrNodes;
    if (typeof nodes === 'function') nodes = nodes(fullCtx);
    if (!Array.isArray(nodes) || !nodes.length) { console.warn('[dialogue] missing', idOrNodes); return; }
    const d = {
      nodes, i: 0, ctx: fullCtx, waitingContinue: false, options: null,
      onEnd: () => {
        if (fullCtx.npc) { fullCtx.npc.talkingTo = null; fullCtx.npc.faceTarget = null; }
        this.game.events.emit('dialogue:end', { ctx: fullCtx });
      },
    };
    d.goto = (label) => {
      if (label === 'end' || label == null) { d.i = nodes.length; return; }
      const idx = nodes.findIndex((n) => n.label === label);
      d.i = idx >= 0 ? idx : nodes.length;
    };
    d.continue = () => {
      const n = nodes[d.i];
      if (n?.end) d.i = nodes.length;
      else if (n?.goto) d.goto(n.goto);
      else d.i++;
      this.runDialogue();
    };
    d.choose = (k) => {
      const o = d.options[k];
      d.options = null;
      let r;
      if (o.action) r = o.action(fullCtx);
      if (typeof r === 'string') d.goto(r);
      else if (o.goto) d.goto(o.goto);
      else if (o.end || r === false) d.i = nodes.length;
      else d.i++;
      this.runDialogue();
    };
    this.dlg = d;
    this.chatMode = 'dialogue';
    this.game.events.emit('dialogue:start', { ctx: fullCtx });
    this.runDialogue();
  }

  runDialogue() {
    const d = this.dlg;
    if (!d) return;
    const val = (v) => (typeof v === 'function' ? v(d.ctx) : v);
    for (let guard = 0; guard < 200; guard++) {
      const n = d.nodes[d.i];
      if (!n || this.dlg !== d) { if (this.dlg === d) this.closeChat(); return; }
      if (n.if) {
        const ok = n.if(d.ctx);
        if (ok && n.goto) d.goto(n.goto); else if (!ok && n.else) d.goto(n.else); else d.i++;
        continue;
      }
      if (n.action && !n.options) {
        const r = n.action(d.ctx);
        if (this.dlg !== d) return; // action opened something else (bank/shop) and closed us
        if (typeof r === 'string') d.goto(r);
        else if (r === false || n.end) { this.closeChat(); return; }
        else if (n.goto) d.goto(n.goto);
        else d.i++;
        continue;
      }
      if (n.goto && !n.npc && !n.player && !n.message && !n.options) { d.goto(n.goto); continue; }
      if (n.end && !n.npc && !n.player && !n.message) { this.closeChat(); return; }
      const box = this.ui.chat.showOverlay();
      box.className = 'chat-overlay dialogue';
      if (n.options) {
        const opts = val(n.options).filter((o) => !o.if || o.if(d.ctx));
        d.options = opts;
        d.waitingContinue = false;
        box.appendChild(el('div', 'dlg-title', escapeHtml(val(n.title) || 'Select an Option')));
        opts.forEach((o, k) => {
          const b = el('div', 'dlg-option', markup(val(o.text)));
          b.onclick = () => d.choose(k);
          box.appendChild(b);
        });
        return;
      }
      d.waitingContinue = true;
      let name = '', text = '';
      if (n.npc != null) { name = val(n.name) || d.ctx.npc?.name || 'Stranger'; text = val(n.npc); }
      else if (n.player != null) { name = d.ctx.player.name; text = val(n.player); }
      else text = val(n.message);
      if (name) box.appendChild(el('div', 'dlg-name', escapeHtml(name)));
      box.appendChild(el('div', `dlg-text${name ? '' : ' plain'}`, markup(text)));
      const c = el('div', 'dlg-continue', 'Click here to continue');
      c.onclick = () => d.continue();
      box.appendChild(c);
      return;
    }
  }

  // ---- make-X -------------------------------------------------------------------------------------
  /**
   * opts { title, items: [{id, label?, data?}], onSelect(item, qty), onClose?, quantities? }
   * qty is a number (Infinity for "All").
   */
  openMakeX(opts) {
    this.closeChat();
    const box = this.ui.chat.showOverlay();
    box.className = 'chat-overlay makex';
    this.chatMode = 'makex';
    const qtys = opts.quantities || [1, 5, 10, 'X', 'All'];
    let qty = this.lastMakeQty ?? 1;
    const mx = { items: opts.items, onClose: opts.onClose };
    box.appendChild(el('div', 'dlg-title', escapeHtml(opts.title || 'What would you like to make?')));
    const qrow = el('div', 'mx-qty');
    const qbtns = [];
    qtys.forEach((q) => {
      const b = el('button', 'mx-q', String(q));
      b.onclick = async () => {
        if (q === 'X') {
          const n = await this.promptNumberInline(qrow);
          if (n) { qty = n; this.lastMakeQty = n; }
        } else { qty = q === 'All' ? Infinity : q; this.lastMakeQty = qty; }
        qbtns.forEach((x) => x.classList.toggle('active', x === b));
      };
      if ((q === 'All' && qty === Infinity) || q === qty) b.classList.add('active');
      qbtns.push(b);
      qrow.appendChild(b);
    });
    const irow = el('div', 'mx-items');
    mx.pick = (k) => {
      const it = opts.items[k];
      this.makeX = null;
      this.closeChat();
      opts.onSelect?.(it, qty);
    };
    opts.items.forEach((it, k) => {
      const def = getItem(it.id);
      const b = el('div', 'mx-item', `<img alt="" src="${getItemIcon(it.id)}"><span>${escapeHtml(it.label || def?.name || it.id)}</span><small>${k + 1}</small>`);
      b.onclick = () => mx.pick(k);
      irow.appendChild(b);
    });
    box.append(irow, qrow);
    this.makeX = mx;
    return mx;
  }

  async promptNumberInline(parent) {
    const inp = el('input', 'mx-input');
    inp.type = 'number'; inp.min = 1; inp.placeholder = 'Amount';
    parent.appendChild(inp);
    inp.focus();
    return new Promise((res) => {
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { const n = parseAmount(inp.value); inp.remove(); res(n); }
        if (e.key === 'Escape') { inp.remove(); res(null); }
      });
      inp.addEventListener('blur', () => { setTimeout(() => { if (inp.isConnected) { inp.remove(); res(null); } }, 150); });
    });
  }

  /** Ask for a number in the chatbox. Resolves to a positive integer or null. Accepts 10k / 2m. */
  promptNumber(title = 'Enter amount:') {
    return this.promptText(title).then((v) => (v == null ? null : parseAmount(v)));
  }

  promptText(title = 'Enter text:') {
    this.closeChat();
    const box = this.ui.chat.showOverlay();
    box.className = 'chat-overlay prompt';
    this.chatMode = 'prompt';
    box.appendChild(el('div', 'dlg-title', escapeHtml(title)));
    const inp = el('input', 'prompt-input');
    box.appendChild(inp);
    setTimeout(() => inp.focus(), 0);
    return new Promise((res) => {
      this.promptResolve = res;
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { this.promptResolve = null; const v = inp.value; this.closeChat(); res(v); }
        if (e.key === 'Escape') { this.closeChat(); }
      });
    });
  }

  // ---- bank ---------------------------------------------------------------------------------------
  openBank() {
    const g = this.game, p = g.player;
    this.closeChat();
    const h = this.open({
      id: 'bank', title: `The Bank of Ashvale`, className: 'bank', width: 520,
      render: (body) => {
        const top = el('div', 'bank-top');
        const search = el('input', 'bank-search');
        search.placeholder = 'Search...';
        search.addEventListener('keydown', (e) => e.stopPropagation());
        search.oninput = () => this.renderBank();
        const count = el('span', 'bank-count');
        top.append(search, count);
        const grid = el('div', 'bank-grid');
        const bottom = el('div', 'bank-bottom');
        const di = el('button', 'btn', 'Deposit inventory');
        di.onclick = () => { for (let i = 0; i < 28; i++) if (p.inventory.get(i)) this.deposit(i, 'All', true); p.inventory.changed(); };
        const de = el('button', 'btn', 'Deposit worn items');
        de.onclick = () => {
          for (const [slot, it] of Object.entries(p.equipment.slots)) if (it && p.bank.capacityFor(it.id) > 0) { p.bank.add(it.id, it.qty); p.equipment.slots[slot] = null; }
          p.equipment.onChange?.(p.equipment);
        };
        bottom.append(di, de);
        body.append(top, grid, bottom);
        this.bankEls = { grid, search, count };
      },
      onClose: () => { this.bankEls = null; offBank(); },
    });
    const offBank = g.events.on('bank:change', () => this.renderBank());
    this.ui.bankOpen = true;
    this.ui.side.selectTab('inventory');
    this.ui.side.refresh('inventory');
    this.renderBank();
    return h;
  }

  renderBank() {
    const els = this.bankEls;
    if (!els) return;
    const bank = this.game.player.bank;
    bank.compact();
    const q = els.search.value.trim().toLowerCase();
    els.grid.innerHTML = '';
    let used = 0;
    bank.slots.forEach((it, i) => {
      if (!it) return;
      used++;
      const def = getItem(it.id);
      if (q && !def.name.toLowerCase().includes(q)) return;
      const f = formatQty(it.qty);
      const c = el('div', 'bank-slot', `<img alt="" src="${getItemIcon(it.id, it.qty)}"><span class="qty ${f.cls}">${f.text}</span>`);
      c.title = `${def.name} (${fmt(it.qty)})`;
      c.onclick = () => this.withdraw(i, 1);
      c.oncontextmenu = (e) => {
        e.preventDefault();
        const opts = [['Withdraw-1', 1], ['Withdraw-5', 5], ['Withdraw-10', 10], ['Withdraw-X', 'X'], ['Withdraw-All', Infinity], ['Withdraw-All-but-1', -1]];
        this.ui.menu.show(e.clientX, e.clientY, [
          ...opts.map(([o, n]) => ({ option: o, target: def.name, targetColor: '#ff9040', action: () => this.withdraw(i, n) })),
          { option: 'Examine', target: def.name, targetColor: '#ff9040', action: () => this.game.message(def.examine) },
        ]);
      };
      els.grid.appendChild(c);
    });
    els.count.textContent = `${used} / ${bank.size}`;
  }

  async withdraw(slot, n) {
    const p = this.game.player;
    if (n === 'X') { n = await this.promptNumber('Enter amount:'); if (!n) return; }
    const it = p.bank.get(slot);
    if (!it) return;
    let want = n === -1 ? it.qty - 1 : Math.min(n, it.qty);
    want = Math.min(want, p.inventory.capacityFor(it.id));
    if (want <= 0) { if (n !== -1) this.game.message("You don't have enough inventory space."); return; }
    const id = it.id;
    p.inventory.add(id, want);
    p.bank.removeAt(slot, want);
  }

  /** Deposit from an inventory slot. amount: '1' | '5' | '10' | 'X' | 'All' (strings from menu) or number. */
  async deposit(slot, amount, silent = false) {
    const p = this.game.player;
    const it = p.inventory.get(slot);
    if (!it) return;
    let n = amount === 'All' ? Infinity : amount === 'X' ? await this.promptNumber('Enter amount:') : Number(amount);
    if (!n) return;
    const id = it.id;
    n = Math.min(n, p.inventory.count(id));
    if (p.bank.capacityFor(id) < n) { this.game.message('Your bank is full.'); return; }
    p.inventory.remove(id, n, { silent });
    p.bank.add(id, n);
  }

  // ---- shop ---------------------------------------------------------------------------------------
  openShop(shopId) {
    const def = getShop(shopId);
    if (!def) { console.warn('[ui] unknown shop', shopId); return; }
    this.closeChat();
    const h = this.open({
      id: 'shop', title: def.name, className: 'shop', width: 460,
      render: (body) => {
        const grid = el('div', 'shop-grid');
        body.append(grid, el('div', 'muted pad', 'Left-click: Value. Right-click to buy. Right-click your inventory to sell.'));
        this.shopEls = { grid, shopId };
      },
      onClose: () => { this.shopEls = null; off(); },
    });
    const off = this.game.events.on('shop:change', (e) => { if (e.shopId === shopId) this.renderShop(); });
    this.ui.shopOpen = shopId;
    this.ui.side.selectTab('inventory');
    this.ui.side.refresh('inventory');
    this.renderShop();
    return h;
  }

  renderShop() {
    const els = this.shopEls;
    if (!els) return;
    const shops = this.game.shops;
    els.grid.innerHTML = '';
    for (const s of shops.stock(els.shopId)) {
      const def = getItem(s.id);
      const f = formatQty(s.qty);
      const c = el('div', `bank-slot${s.qty <= 0 ? ' empty' : ''}`, `<img alt="" src="${getItemIcon(s.id, s.qty)}"><span class="qty ${f.cls}">${f.text}</span>`);
      c.title = def.name;
      const value = () => this.game.message(`${def.name}: currently costs ${fmt(shops.buyPrice(els.shopId, s.id))} coins.`);
      c.onclick = value;
      c.oncontextmenu = (e) => {
        e.preventDefault();
        this.ui.menu.show(e.clientX, e.clientY, [
          { option: 'Value', target: def.name, targetColor: '#ff9040', action: value },
          ...[1, 5, 10, 50].map((n) => ({ option: `Buy ${n}`, target: def.name, targetColor: '#ff9040', action: () => shops.buy(this.game.player, els.shopId, s.id, n) })),
          { option: 'Examine', target: def.name, targetColor: '#ff9040', action: () => this.game.message(def.examine) },
        ]);
      };
      els.grid.appendChild(c);
    }
  }

  valueSell(itemId) {
    const shopId = this.ui.shopOpen;
    if (!shopId) return;
    const price = this.game.shops.sellPrice(shopId, itemId);
    const def = getItem(itemId);
    this.game.message(price > 0 ? `${def.name}: shop will buy for ${fmt(price)} coins.` : `You can't sell ${def.name.toLowerCase()} to this shop.`);
  }

  sell(itemId, n) {
    const shopId = this.ui.shopOpen;
    if (shopId) this.game.shops.sell(this.game.player, shopId, itemId, n);
  }

  // ---- quest journal --------------------------------------------------------------------------------
  openQuestJournal(questId) {
    const q = getQuest(questId);
    if (!q) return;
    const stage = this.game.player.quests[questId] || 0;
    let lines;
    try { lines = q.journal ? q.journal(stage, { game: this.game, player: this.game.player }) : null; } catch (e) { console.error(e); }
    if (!lines) lines = stage === 0 ? [q.description || 'I have not started this quest yet.', q.start ? `<col=ff0000>Start:</col> ${q.start}` : ''] : stage >= q.completeStage ? ['<col=00ff00>QUEST COMPLETE!</col>'] : ['I am working on this quest.'];
    this.open({
      id: `quest_${questId}`, title: q.name, className: 'journal', width: 380,
      render: (body) => { body.innerHTML = lines.filter(Boolean).map((l) => `<p>${markup(l)}</p>`).join(''); },
    });
  }
}

export function parseAmount(v) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([kmb]?)\s*$/i.exec(String(v));
  if (!m) return null;
  const mult = { '': 1, k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()];
  const n = Math.floor(Number(m[1]) * mult);
  return n > 0 ? n : null;
}
