// Player-to-player trading over the net session (direct messages of kind 'trade').
//
// Flow: A "Trade with" B -> req -> B accepts (toast / Trade with A) -> open -> both windows open.
// Screen 1: offer items; any change resets both accepts. Each accept carries a key of both offers so
// a stale accept (offer changed in flight) is ignored. Both accepted -> screen 2 (confirm).
// Screen 2: accepting escrows your offered items (removed from the inventory, restored on cancel and
// written back into saves while held). The requester (coordinator) commits once it has both screen-2
// accepts and tells the other side to commit. A responder that has accepted screen 2 is bound to the
// trade: if its window closes it still waits briefly for the commit.
// Ops: req{tid} open{tid} offer{tid, items, free} acc{tid, stage, key} commit{tid, key} decline{tid, reason}

import { getItem } from '../core/registry.js';
import { Container } from '../core/container.js';
import { INVENTORY_SIZE } from '../core/constants.js';
import { saveGame } from '../core/save.js';
import { getItemIcon } from '../ui/icons.js';
import { el, escapeHtml, formatQty, fmt } from '../ui/util.js';
import { cleanItems, cleanId, isObj, int, randomId } from './protocol.js';

const REQUEST_MS = 30000;

const offerStr = (list) => list.map((i) => `${i.id}:${i.qty}`).sort().join(',');
const mergeList = (list) => {
  const m = new Map();
  for (const it of list) m.set(it.id, (m.get(it.id) || 0) + it.qty);
  return [...m].map(([id, qty]) => ({ id, qty }));
};
const valueOf = (list) => list.reduce((s, i) => s + (getItem(i.id)?.value || 0) * i.qty, 0);

export class TradeManager {
  constructor(net) {
    this.net = net;
    this.game = net.game;
    this.incoming = new Map(); // peerId -> {tid, at}
    this.outgoing = null;      // {peer, tid, at}
    this.t = null;             // active trade
    const ev = this.game.events;
    ev.on('inventory:change', ({ player }) => { if (player === this.game.player) this.onInventoryChange(); });
    ev.on('remote:remove', ({ remote }) => {
      this.incoming.delete(remote.peerId);
      this.net.panel?.dismissToast(remote.peerId);
      if (this.t && this.t.peer === remote.peerId) this.cancel('Other player has left.', false);
    });
    // escrowed items must never vanish from a save written mid-trade
    ev.on('save', ({ data }) => {
      const esc = this.t?.escrow;
      if (!esc || !data) return;
      const c = new Container(INVENTORY_SIZE);
      c.fromJSON(data.inventory);
      for (const it of esc) c.add(it.id, it.qty, { silent: true });
      data.inventory = c.toJSON();
    });
  }

  send(peer, data) { return this.net.session.sendDirect(peer, 'trade', data); }
  nameOf(peer) { return this.game.getRemotePlayer(peer)?.name || 'Other player'; }

  // ---- requests -----------------------------------------------------------------------------------
  /** Local player chose "Trade with" on a remote player (after walking up to them). */
  request(rp) {
    const g = this.game;
    if (!this.net.connected || !rp?.peerId) return;
    if (this.t) { g.message('You are already in a trade.'); return; }
    const id = rp.peerId;
    const inc = this.incoming.get(id);
    if (inc && Date.now() - inc.at < REQUEST_MS) {
      this.send(id, { op: 'open', tid: inc.tid });
      this.open(id, inc.tid, false);
      return;
    }
    if (this.outgoing?.peer === id && Date.now() - this.outgoing.at < 3000) return; // spam guard
    const tid = randomId(8);
    this.outgoing = { peer: id, tid, at: Date.now() };
    this.send(id, { op: 'req', tid });
    g.message('Sending trade offer...');
  }

  acceptRequest(peer) {
    const rp = this.game.getRemotePlayer(peer);
    if (!rp) return;
    this.game.interact(this.game.player, rp, 'Trade with');
  }

  declineRequest(peer) {
    const inc = this.incoming.get(peer);
    if (!inc) return;
    this.incoming.delete(peer);
    this.send(peer, { op: 'decline', tid: inc.tid, reason: 'declined' });
  }

  // ---- incoming messages --------------------------------------------------------------------------
  onMessage(from, d) {
    if (!isObj(d) || typeof d.op !== 'string') return;
    const tid = cleanId(d.tid);
    if (!tid) return;
    const t = this.t && this.t.peer === from && this.t.tid === tid ? this.t : null;
    switch (d.op) {
      case 'req': {
        const rp = this.game.getRemotePlayer(from);
        if (!rp) return;
        if (this.t) { this.send(from, { op: 'decline', tid, reason: 'busy' }); return; }
        const had = this.incoming.get(from);
        this.incoming.set(from, { tid, at: Date.now() });
        if (had && Date.now() - had.at < 3000) return;
        this.game.message(`<col=800080>${rp.name} wishes to trade with you.</col>`, 'trade');
        this.net.panel?.showTradeToast(from, rp.name);
        break;
      }
      case 'open': {
        const o = this.outgoing;
        if (!this.t && o && o.peer === from && o.tid === tid && Date.now() - o.at < 120000) this.open(from, tid, true);
        else if (!t) this.send(from, { op: 'decline', tid, reason: 'busy' });
        break;
      }
      case 'offer': {
        if (!t) return;
        if (t.stage !== 1) { this.cancel('Trade cancelled (offer changed after accepting).', true); return; }
        const prev = new Map(t.theirs.map((i) => [i.id, i.qty]));
        t.theirs = mergeList(cleanItems(d.items, INVENTORY_SIZE, { tradeableOnly: true }));
        t.theirFree = int(d.free, 0, INVENTORY_SIZE);
        if ([...prev].some(([id, q]) => (t.theirs.find((i) => i.id === id)?.qty || 0) < q)) t.warnUntil = Date.now() + 4000;
        t.myAcc = null; t.theirAcc = null;
        this.render();
        break;
      }
      case 'acc': {
        if (!t) return;
        const stage = int(d.stage, 1, 2);
        if (stage !== t.stage || typeof d.key !== 'string') return;
        t.theirAcc = { stage, key: d.key };
        this.checkAdvance();
        break;
      }
      case 'commit': {
        if (!t || t.coord) return;
        if (t.myAcc?.stage === 2 && d.key === t.myAcc.key && d.key === this.key()) this.finish();
        else this.cancel('Trade cancelled.', true);
        break;
      }
      case 'decline': {
        if (t) { this.cancel('Other player declined trade.', false); return; }
        if (this.outgoing && this.outgoing.peer === from && this.outgoing.tid === tid) {
          this.outgoing = null;
          this.game.message(d.reason === 'busy' ? 'Other player is busy at the moment.' : 'Other player declined trade.');
        }
        const inc = this.incoming.get(from);
        if (inc && inc.tid === tid) { this.incoming.delete(from); this.net.panel?.dismissToast(from); }
        break;
      }
      default: break;
    }
  }

  // ---- trade session ------------------------------------------------------------------------------
  open(peer, tid, coord) {
    this.outgoing = null;
    this.incoming.delete(peer);
    this.net.panel?.dismissToast(peer);
    const t = { peer, tid, coord, stage: 1, mine: new Map(), theirs: [], theirFree: null, myAcc: null, theirAcc: null, escrow: null, done: false, warnUntil: 0, handle: null };
    this.t = t;
    const name = this.nameOf(peer);
    this.game.ui.closeInterfaces();
    t.handle = this.game.ui.openInterface({
      id: 'trade', title: `Trading with: ${name}`, className: 'net-trade', width: 600,
      render: (body) => { t.body = body; },
      onClose: () => this.onWindowClosed(t),
    });
    this.render();
    this.sendOffer();
  }

  mineList() { return [...this.t.mine].filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty })); }

  key() {
    const t = this.t;
    const m = offerStr(this.mineList()), th = offerStr(t.theirs);
    return `${t.tid}|${t.coord ? m : th}|${t.coord ? th : m}`;
  }

  /** Simulated free slots after giving away my offer. */
  freeAfter() {
    const c = new Container(INVENTORY_SIZE);
    c.fromJSON(this.game.player.inventory.toJSON());
    for (const it of this.mineList()) c.remove(it.id, it.qty, { silent: true });
    return c.freeSlots();
  }

  canReceive() {
    const c = new Container(INVENTORY_SIZE);
    c.fromJSON(this.game.player.inventory.toJSON());
    if (!this.t.escrow) for (const it of this.mineList()) c.remove(it.id, it.qty, { silent: true });
    for (const it of this.t.theirs) if (c.add(it.id, it.qty, { silent: true }) < it.qty) return false;
    return true;
  }

  available(id) { return this.game.player.inventory.count(id) - (this.t.mine.get(id) || 0); }

  sendOffer() {
    const t = this.t;
    this.send(t.peer, { op: 'offer', tid: t.tid, items: this.mineList(), free: this.freeAfter() });
  }

  changed() {
    const t = this.t;
    t.myAcc = null; t.theirAcc = null;
    this.sendOffer();
    this.render();
  }

  offer(id, n) {
    const t = this.t;
    if (!t || t.stage !== 1) return;
    const def = getItem(id);
    if (!def || def.tradeable === false) { this.game.message("You can't trade that item."); return; }
    const k = Math.min(n, this.available(id));
    if (k <= 0) return;
    t.mine.set(id, (t.mine.get(id) || 0) + k);
    this.changed();
  }

  remove(id, n) {
    const t = this.t;
    if (!t || t.stage !== 1) return;
    const cur = t.mine.get(id) || 0;
    const k = Math.min(n, cur);
    if (k <= 0) return;
    if (cur - k <= 0) t.mine.delete(id); else t.mine.set(id, cur - k);
    this.changed();
  }

  onInventoryChange() {
    const t = this.t;
    if (!t || t.escrow) return;
    let clamped = false;
    for (const [id, q] of t.mine) {
      const have = this.game.player.inventory.count(id);
      if (have < q) { clamped = true; if (have > 0) t.mine.set(id, have); else t.mine.delete(id); }
    }
    if (clamped) {
      if (t.stage === 2) { this.cancel('Trade cancelled: your offered items changed.', true); return; }
      this.changed();
    } else if (t.stage === 1) this.render();
  }

  accept() {
    const t = this.t, g = this.game;
    if (!t || t.myAcc) return;
    if (!this.canReceive()) { g.message("You don't have enough inventory space for this trade."); return; }
    const key = this.key();
    if (t.stage === 2) {
      for (const it of this.mineList()) {
        if (g.player.inventory.count(it.id) < it.qty) { this.cancel('Trade cancelled: your offered items changed.', true); return; }
      }
      // escrow my side so it can't be used/dropped while the other side commits
      t.escrow = this.mineList();
      for (const it of t.escrow) g.player.inventory.remove(it.id, it.qty, { silent: true });
      g.player.inventory.changed();
    }
    t.myAcc = { stage: t.stage, key };
    this.send(t.peer, { op: 'acc', tid: t.tid, stage: t.stage, key });
    this.checkAdvance();
  }

  checkAdvance() {
    const t = this.t;
    if (!t) return;
    const key = this.key();
    const both = t.myAcc && t.theirAcc && t.myAcc.stage === t.stage && t.theirAcc.stage === t.stage && t.myAcc.key === key && t.theirAcc.key === key;
    if (both && t.stage === 1) {
      t.stage = 2; t.myAcc = null; t.theirAcc = null;
    } else if (both && t.stage === 2 && t.coord) {
      this.send(t.peer, { op: 'commit', tid: t.tid, key });
      this.finish();
      return;
    }
    this.render();
  }

  /** Exchange: my offer is already in escrow; receive theirs. */
  finish() {
    const t = this.t, g = this.game;
    if (!t) return;
    t.done = true;
    this.t = null;
    clearTimeout(t.bgTimer);
    t.escrow = null;
    for (const it of t.theirs) g.giveItem(it.id, it.qty);
    g.message('Accepted trade.');
    t.handle?.close();
    saveGame(g);
  }

  /** Cancel and restore escrowed items. */
  cancel(reason, notify) {
    const t = this.t, g = this.game;
    if (!t) return;
    t.done = true;
    this.t = null;
    clearTimeout(t.bgTimer);
    if (t.escrow) {
      for (const it of t.escrow) g.player.inventory.add(it.id, it.qty, { silent: true });
      g.player.inventory.changed();
      t.escrow = null;
    }
    if (notify) this.send(t.peer, { op: 'decline', tid: t.tid, reason: 'declined' });
    if (reason) g.message(reason);
    t.handle?.close();
  }

  onWindowClosed(t) {
    t.handle = null;
    t.body = null;
    if (t.done || this.t !== t) return;
    // a responder that accepted the final screen is bound to the trade: wait briefly for the commit
    if (!t.coord && t.myAcc?.stage === 2) {
      t.bgTimer = setTimeout(() => { if (this.t === t) this.cancel('Trade timed out.', true); }, 10000);
      return;
    }
    this.cancel('You decline the trade.', true);
  }

  // ---- rendering ----------------------------------------------------------------------------------
  slotEl(id, qty, onClick, onMenu) {
    const def = getItem(id);
    const f = formatQty(qty);
    const showQty = def?.stackable || qty > 1;
    const s = el('div', 'bank-slot net-slot', `<img alt="" src="${getItemIcon(id, qty)}"><span class="qty ${f.cls}">${showQty ? f.text : ''}</span>`);
    s.title = def?.name || id;
    s.onclick = onClick;
    s.oncontextmenu = (e) => { e.preventDefault(); onMenu(e); };
    return s;
  }

  menu(e, id, entries) {
    const def = getItem(id);
    this.game.ui.menu.show(e.clientX, e.clientY, [
      ...entries.map(([option, action]) => ({ option, target: def?.name || id, targetColor: '#ff9040', action })),
      { option: 'Value', target: def?.name || id, targetColor: '#ff9040', action: () => this.game.message(`${def?.name}: ${fmt(def?.value || 0)} coins each.`) },
      { option: 'Examine', target: def?.name || id, targetColor: '#ff9040', action: () => this.game.message(def?.examine || '') },
    ]);
  }

  async askAmount(fn) {
    const n = await this.game.ui.promptNumber('Enter amount:');
    if (n && n > 0) fn(n);
  }

  render() {
    const t = this.t;
    if (!t || !t.body) return;
    const body = t.body;
    body.innerHTML = '';
    const name = escapeHtml(this.nameOf(t.peer));
    const mine = this.mineList();
    if (t.stage === 1) {
      const cols = el('div', 'net-tr-cols');
      // my offer
      const myGrid = el('div', 'net-grid');
      for (const it of mine) {
        myGrid.appendChild(this.slotEl(it.id, it.qty, () => this.remove(it.id, 1), (e) => this.menu(e, it.id, [
          ['Remove-1', () => this.remove(it.id, 1)], ['Remove-5', () => this.remove(it.id, 5)], ['Remove-10', () => this.remove(it.id, 10)],
          ['Remove-All', () => this.remove(it.id, Infinity)], ['Remove-X', () => this.askAmount((n) => this.remove(it.id, n))],
        ])));
      }
      // their offer
      const thGrid = el('div', 'net-grid');
      for (const it of t.theirs) thGrid.appendChild(this.slotEl(it.id, it.qty, () => {}, (e) => this.menu(e, it.id, [])));
      // my inventory minus what is on offer
      const invGrid = el('div', 'net-grid');
      const left = new Map(t.mine);
      const inv = this.game.player.inventory;
      for (let i = 0; i < INVENTORY_SIZE; i++) {
        const it = inv.get(i);
        if (!it) { invGrid.appendChild(el('div', 'net-slot empty')); continue; }
        const used = Math.min(left.get(it.id) || 0, it.qty);
        if (used) left.set(it.id, left.get(it.id) - used);
        const q = it.qty - used;
        if (q <= 0) { invGrid.appendChild(el('div', 'net-slot empty')); continue; }
        invGrid.appendChild(this.slotEl(it.id, q, () => this.offer(it.id, 1), (e) => this.menu(e, it.id, [
          ['Offer', () => this.offer(it.id, 1)], ['Offer-5', () => this.offer(it.id, 5)], ['Offer-10', () => this.offer(it.id, 10)],
          ['Offer-All', () => this.offer(it.id, Infinity)], ['Offer-X', () => this.askAmount((n) => this.offer(it.id, n))],
        ])));
      }
      const col = (title, grid, foot) => {
        const c = el('div', 'net-tr-col', `<div class="net-tr-h">${title}</div>`);
        c.appendChild(grid);
        c.appendChild(el('div', 'net-tr-foot muted', foot));
        return c;
      };
      cols.append(
        col('Your offer', myGrid, `Value: ${fmt(valueOf(mine))} coins`),
        col(`${name}'s offer`, thGrid, `Value: ${fmt(valueOf(t.theirs))} coins`),
        col('Your inventory', invGrid, 'Click to offer, right-click for more'),
      );
      body.appendChild(cols);
      let status = '';
      if (t.warnUntil > Date.now()) status = '<span style="color:#ff3030">Other player has removed an item!</span>';
      else if (t.myAcc && !t.theirAcc) status = 'Waiting for other player...';
      else if (t.theirAcc && !t.myAcc) status = '<span style="color:#ffffff">Other player has accepted.</span>';
      else if (t.theirFree != null) status = `${name} has ${t.theirFree} free inventory slot${t.theirFree === 1 ? '' : 's'}.`;
      body.appendChild(el('div', 'net-tr-status', status));
      if (t.warnUntil > Date.now()) setTimeout(() => { if (this.t === t) this.render(); }, t.warnUntil - Date.now() + 50);
    } else {
      const wrap = el('div', 'net-tr-confirm');
      wrap.appendChild(el('div', 'net-tr-status', 'Are you sure you want to make this trade?'));
      const lists = el('div', 'net-tr-cols');
      const list = (title, items) => {
        const c = el('div', 'net-tr-col net-tr-list', `<div class="net-tr-h">${title}</div>`);
        if (!items.length) c.appendChild(el('div', 'muted', 'Absolutely nothing!'));
        for (const it of items) {
          const def = getItem(it.id);
          c.appendChild(el('div', 'net-tr-li', `${escapeHtml(def?.name || it.id)}${it.qty > 1 || def?.stackable ? ` x <span style="color:#fff">${fmt(it.qty)}</span>` : ''}`));
        }
        c.appendChild(el('div', 'net-tr-foot muted', `Value: ${fmt(valueOf(items))} coins`));
        return c;
      };
      lists.append(list('You are about to give:', t.escrow || mine), list('In return you will receive:', t.theirs));
      wrap.appendChild(lists);
      let status = `Trading with: ${name}`;
      if (t.myAcc && !t.theirAcc) status = 'Waiting for other player...';
      else if (t.theirAcc && !t.myAcc) status = '<span style="color:#ffffff">Other player has accepted.</span>';
      wrap.appendChild(el('div', 'net-tr-status', status));
      body.appendChild(wrap);
    }
    const btns = el('div', 'net-tr-btns');
    const acc = el('button', 'btn net-accept', 'Accept');
    acc.disabled = !!t.myAcc;
    acc.onclick = () => this.accept();
    const dec = el('button', 'btn danger', 'Decline');
    dec.disabled = !t.coord && t.myAcc?.stage === 2;
    dec.onclick = () => this.cancel('You decline the trade.', true);
    btns.append(acc, dec);
    body.appendChild(btns);
  }

  /** Session ended / left. */
  reset() {
    if (this.t) this.cancel('The trade was cancelled (disconnected).', false);
    this.incoming.clear();
    this.outgoing = null;
  }
}
