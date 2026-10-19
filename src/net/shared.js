// Shared ground items (host-authoritative). OWNER: agent E. Design: docs/NET_SHARED_WORLD.md §3.
//
// Every non-permanent, tradeable ground item that appears anywhere on any client (player drops, PvP loot,
// death drops, ammo under a target, monster drops - rolled by the host for shared NPCs...) is registered with the host, which gives it a
// network id (`nid`) and announces it to everyone. Each client keeps an ordinary local GroundItem
// (`gi.nid`) so rendering, menus, privacy (owner / publicTick) and despawn timers work unchanged.
// Taking a shared item asks the host first: the host grants it to exactly one client and tells the
// others to remove it, so items can't be duplicated by two players clicking at once.
//
// Messages (session kinds):
//   joiner -> host (direct): gadd{lid, id, qty, x, y, owner, priv, life} · gtake{nid} · gqty{nid, add} · gdel{nid}|{lid}
//   host -> all (broadcast): gadd{nid, origin, lid?, ...} · gdel{nid} · gset{nid, qty}
//   host -> one (direct):    ggrant{nid, id, qty} · gdeny{nid} · gsync{items:[gadd...]}
// When a player leaves, the host deletes the items it registered (they stay only in that player's own
// world); when the session ends, every client keeps only the items it registered itself. So each item
// lives on in exactly one world and can never be taken twice.

import { getItem } from '../core/registry.js';
import { MAX_STACK } from '../core/constants.js';
import { isObj, int, cleanId, cleanName } from './protocol.js';

const NET_OWNER = '\u0000net';   // temporary owner while spawning (prevents stack-merging into local items)
const MAX_ITEMS = 1500;          // host registry cap
const SYNC_CHUNK = 150;          // items per gsync message
const TAKE_TIMEOUT_MS = 5000;

const cleanItemId = (v) => (typeof v === 'string' && v.length <= 64 && getItem(v) ? v : null);

export class SharedGround {
  constructor(net) {
    this.net = net;
    this.game = net.game;
    this.session = net.session;
    this.reg = new Map();      // host: nid -> {nid, origin, id, qty, x, y, owner, publicTick, despawnTick}
    this.byNid = new Map();    // nid -> local GroundItem
    this.pending = new Map();  // lid (local uid) -> GroundItem waiting for the host's nid
    this.taking = new Map();   // nid -> {timer} take requests in flight
    this.seq = 0;
    this.applying = false;     // true while we change ground items because of a network message
    this.wire();
  }

  get isHost() { return this.session.role === 'host'; }
  get myId() { return this.session.myId; }
  /** Untradeable items (quest items...) stay private to the player who dropped them, like in the classic game. */
  shareable(gi) {
    const def = gi && getItem(gi.itemId);
    return !!def && !gi.nid && !gi.respawnTicks && Number.isFinite(gi.despawnTick) && def.tradeable !== false;
  }

  wire() {
    const g = this.game, ev = g.events;
    ev.on('ground:add', ({ item }) => { if (!this.applying && this.net.connected && this.shareable(item)) this.share(item); });
    ev.on('ground:change', ({ item }) => { if (!this.applying && this.net.connected) this.onLocalChange(item); });
    ev.on('ground:remove', ({ item, expired }) => { if (!this.applying) this.onLocalRemove(item, expired); });

    // Take on a shared item: ask the host first (registered after the engine default, so it runs first)
    g.interactions.onGroundItem('Take', '*', ({ player, target }) => {
      if (!this.net.connected || !target) return false;
      if (target.respawnTicks && !target.nid && !this.isHost) {
        // permanent spawn: the host decides who gets it (net/world.js)
        if (!g.groundItems.has(target.uid)) return;
        if (player.inventory.capacityFor(target.itemId) < target.qty) { g.message("You don't have enough inventory space to hold that item."); return; }
        this.net.world.requestTake(target);
        return;
      }
      if (!target.nid) return false;
      if (!g.groundItems.has(target.uid)) return;
      if (player.inventory.capacityFor(target.itemId) < target.qty) { g.message("You don't have enough inventory space to hold that item."); return; }
      this.requestTake(target);
    });
  }

  // ---- local items -> host -----------------------------------------------------------------------------
  describe(gi) {
    const t = this.game.tickCount;
    return {
      id: gi.itemId, qty: gi.qty, x: gi.x, y: gi.y, owner: gi.owner || null,
      priv: gi.owner ? Math.max(0, gi.publicTick - t) : 0, life: Math.max(1, gi.despawnTick - t),
    };
  }

  share(gi) {
    const d = this.describe(gi);
    gi.netQty = gi.qty;
    gi.netMine = true;
    if (this.isHost) { this.register(this.myId, d, gi); return; }
    this.pending.set(gi.uid, gi);
    gi.netPending = true;
    this.session.sendDirect(this.session.hostId, 'gadd', { lid: gi.uid, ...d });
  }

  /** A shared/pending item's quantity changed locally (a stack was dropped onto it). */
  onLocalChange(gi) {
    if (!gi || (!gi.nid && !gi.netPending)) return;
    const add = gi.qty - (gi.netQty ?? gi.qty);
    if (add <= 0 || !gi.nid) return; // pending items are reconciled when the host answers
    gi.netQty = gi.qty;
    if (this.isHost) this.hostAddQty(this.myId, gi.nid, add, null);
    else this.session.sendDirect(this.session.hostId, 'gqty', { nid: gi.nid, add, ...this.describe(gi), qty: add });
  }

  /** A shared item disappeared locally without going through our Take (expired, lit as a fire...). */
  onLocalRemove(gi, expired) {
    if (gi.netPending) {
      this.pending.delete(gi.uid);
      gi.netPending = false;
      if (this.net.connected && !this.isHost) this.session.sendDirect(this.session.hostId, 'gdel', { lid: gi.uid });
      return;
    }
    if (!gi.nid) return;
    this.byNid.delete(gi.nid);
    if (expired || !this.net.connected) return; // every client expires its own copy
    if (this.isHost) this.hostDelete(gi.nid);
    else this.session.sendDirect(this.session.hostId, 'gdel', { nid: gi.nid });
  }

  // ---- taking ------------------------------------------------------------------------------------------
  requestTake(gi) {
    const nid = gi.nid;
    if (this.taking.has(nid)) return;
    if (this.isHost) { this.hostTake(this.myId, nid); return; }
    const timer = setTimeout(() => { this.taking.delete(nid); }, TAKE_TIMEOUT_MS);
    this.taking.set(nid, { timer });
    this.session.sendDirect(this.session.hostId, 'gtake', { nid });
  }

  /** The host granted us an item: put it in the inventory (or back on the ground if we're full now). */
  granted(nid, id, qty) {
    const g = this.game, p = g.player;
    const t = this.taking.get(nid);
    if (t) { clearTimeout(t.timer); this.taking.delete(nid); }
    const gi = this.byNid.get(nid);
    const x = gi?.x ?? p.x, y = gi?.y ?? p.y;
    if (gi) this.removeLocal(gi);
    const fit = Math.min(qty, p.inventory.capacityFor(id));
    if (fit > 0) p.inventory.add(id, fit);
    if (qty - fit > 0) g.spawnGroundItem(id, qty - fit, x, y, { owner: p.name }); // re-shared normally
    if (fit > 0) {
      g.playAnim(p, 'pickup', 600);
      g.events.emit('item:pickup', { player: p, itemId: id, qty: fit });
    }
  }

  denied(nid) {
    const t = this.taking.get(nid);
    if (t) { clearTimeout(t.timer); this.taking.delete(nid); }
    const gi = this.byNid.get(nid);
    if (gi) this.removeLocal(gi);
    this.game.message('Too late - someone else has taken that.');
  }

  // ---- host authority -------------------------------------------------------------------------------------
  register(origin, d, localGi = null, lid = null) {
    if (this.reg.size >= MAX_ITEMS) {
      // drop the oldest entry to stay bounded
      const oldest = this.reg.keys().next().value;
      this.hostDelete(oldest);
    }
    const t = this.game.tickCount;
    const nid = `n${(++this.seq).toString(36)}`;
    const e = { nid, origin, lid, id: d.id, qty: d.qty, x: d.x, y: d.y, owner: d.owner, publicTick: t + d.priv, despawnTick: t + d.life };
    this.reg.set(nid, e);
    if (localGi) { localGi.nid = nid; localGi.netQty = localGi.qty; localGi.netMine = true; this.byNid.set(nid, localGi); }
    else if (origin !== this.myId) this.spawnLocal(this.wireEntry(e));
    const msg = this.wireEntry(e);
    if (lid != null) msg.lid = lid;
    this.session.broadcast('gadd', msg);
    return e;
  }

  wireEntry(e) {
    const t = this.game.tickCount;
    return { nid: e.nid, origin: e.origin, id: e.id, qty: e.qty, x: e.x, y: e.y, owner: e.owner,
      priv: Math.max(0, e.publicTick - t), life: Math.max(1, e.despawnTick - t) };
  }

  hostTake(from, nid) {
    const e = this.reg.get(nid);
    if (!e || e.despawnTick <= this.game.tickCount) {
      if (e) this.reg.delete(nid);
      if (from === this.myId) this.denied(nid); else this.session.sendDirect(from, 'gdeny', { nid });
      return;
    }
    this.reg.delete(nid);
    this.session.broadcast('gdel', { nid, to: from });
    if (from === this.myId) this.granted(nid, e.id, e.qty);
    else {
      const gi = this.byNid.get(nid);
      if (gi) this.removeLocal(gi);
      this.session.sendDirect(from, 'ggrant', { nid, id: e.id, qty: e.qty });
    }
  }

  /** `d` (joiners): the merged stack's description, used if the shared stack was taken meanwhile. */
  hostAddQty(from, nid, add, d) {
    const e = this.reg.get(nid);
    if (e) {
      e.qty = Math.min(MAX_STACK, e.qty + add);
      this.session.broadcast('gset', { nid, qty: e.qty });
      if (from !== this.myId) this.setLocalQty(nid, e.qty);
      return;
    }
    // the stack was taken meanwhile: the added part becomes a new item (nothing is lost)
    if (d) this.register(from, { ...d, qty: add });
  }

  hostDelete(nid) {
    const e = this.reg.get(nid);
    if (!e) return;
    this.reg.delete(nid);
    this.session.broadcast('gdel', { nid });
    const gi = this.byNid.get(nid);
    if (gi) this.removeLocal(gi);
  }

  /** Host: a player left -> the items it registered leave the shared world (they stay in its own world). */
  onPlayerLeave(peerId) {
    if (!this.isHost) return;
    for (const e of [...this.reg.values()]) if (e.origin === peerId) this.hostDelete(e.nid);
  }

  /** Host: tell a new player about every shared item. */
  syncTo(peerId) {
    if (!this.isHost) return;
    const t = this.game.tickCount;
    const items = [];
    for (const e of this.reg.values()) if (e.despawnTick > t) items.push(this.wireEntry(e));
    for (let i = 0; i < items.length; i += SYNC_CHUNK) this.session.sendDirect(peerId, 'gsync', { items: items.slice(i, i + SYNC_CHUNK) });
  }

  // ---- local mirror -----------------------------------------------------------------------------------------
  spawnLocal(d) {
    if (this.byNid.has(d.nid)) return this.byNid.get(d.nid);
    const g = this.game;
    this.applying = true;
    let gi = null;
    try {
      gi = g.spawnGroundItem(d.id, d.qty, d.x, d.y, { owner: NET_OWNER, ticks: d.life, privateTicks: d.priv });
      if (gi) {
        gi.owner = d.owner || null;
        gi.publicTick = d.owner ? g.tickCount + d.priv : g.tickCount;
        gi.nid = d.nid;
        gi.netQty = gi.qty;
        gi.netOrigin = d.origin;
        gi.netMine = d.origin != null && d.origin === this.myId;
        this.byNid.set(d.nid, gi);
        g.events.emit('ground:change', { item: gi });
      }
    } finally { this.applying = false; }
    return gi;
  }

  removeLocal(gi) {
    this.byNid.delete(gi.nid);
    this.applying = true;
    try { this.game.removeGroundItem(gi); } finally { this.applying = false; }
  }

  setLocalQty(nid, qty) {
    const gi = this.byNid.get(nid);
    if (!gi) return;
    gi.qty = qty;
    gi.netQty = qty;
    this.applying = true;
    try { this.game.events.emit('ground:change', { item: gi }); } finally { this.applying = false; }
  }

  // ---- incoming -------------------------------------------------------------------------------------------
  cleanEntry(d) {
    if (!isObj(d)) return null;
    const id = cleanItemId(d.id);
    const qty = int(d.qty, 1, MAX_STACK);
    const x = int(d.x, 0, 100000), y = int(d.y, 0, 100000);
    if (!id || qty == null || x == null || y == null || !this.game.world.inBounds(x, y)) return null;
    const out = { id, qty, x, y, owner: d.owner == null ? null : cleanName(d.owner), priv: int(d.priv, 0, 6000, 0), life: int(d.life, 1, 6000, 200) };
    if (!getItem(id).stackable) out.qty = 1;
    return out;
  }

  /** Host side: a joiner sent a direct ground message. */
  onDirect(from, kind, data) {
    if (!isObj(data)) return;
    if (this.isHost) {
      switch (kind) {
        case 'gadd': {
          const d = this.cleanEntry(data);
          const lid = int(data.lid, 0, 1e12);
          if (d) this.register(from, d, null, lid);
          break;
        }
        case 'gtake': { const nid = cleanId(data.nid); if (nid) this.hostTake(from, nid); break; }
        case 'gqty': { const nid = cleanId(data.nid), add = int(data.add, 1, MAX_STACK); if (nid && add) this.hostAddQty(from, nid, add, this.cleanEntry(data)); break; }
        case 'gdel': {
          const nid = cleanId(data.nid);
          if (nid) { this.hostDelete(nid); break; }
          const lid = int(data.lid, 0, 1e12);
          if (lid != null) for (const e of this.reg.values()) if (e.origin === from && e.lid === lid) { this.hostDelete(e.nid); break; }
          break;
        }
        default: break;
      }
      return;
    }
    if (from !== this.session.hostId) return;
    switch (kind) {
      case 'ggrant': {
        const nid = cleanId(data.nid), id = cleanItemId(data.id), qty = int(data.qty, 1, MAX_STACK);
        if (nid && id && qty) this.granted(nid, id, qty);
        break;
      }
      case 'gdeny': { const nid = cleanId(data.nid); if (nid) this.denied(nid); break; }
      case 'gsync':
        if (Array.isArray(data.items)) for (const it of data.items.slice(0, SYNC_CHUNK)) this.onAdd(it);
        break;
      default: break;
    }
  }

  /** Joiner side: a host broadcast. */
  onBroadcast(from, kind, data) {
    if (this.isHost || from !== this.session.hostId || !isObj(data)) return;
    switch (kind) {
      case 'gadd': this.onAdd(data); break;
      case 'gdel': {
        const nid = cleanId(data.nid);
        if (!nid) return;
        if (this.taking.has(nid) && data.to === this.myId) return; // ours: the grant follows
        const gi = this.byNid.get(nid);
        if (gi) this.removeLocal(gi);
        break;
      }
      case 'gset': { const nid = cleanId(data.nid), qty = int(data.qty, 1, MAX_STACK); if (nid && qty) this.setLocalQty(nid, qty); break; }
      default: break;
    }
  }

  onAdd(data) {
    const nid = cleanId(data?.nid);
    const d = this.cleanEntry(data);
    if (!nid || !d) return;
    const origin = cleanId(data.origin);
    const lid = int(data.lid, 0, 1e12);
    if (origin === this.myId && lid != null) {
      // the host acknowledged one of our own items
      const gi = this.pending.get(lid);
      this.pending.delete(lid);
      if (gi && this.game.groundItems.has(gi.uid)) {
        gi.netPending = false;
        gi.nid = nid;
        this.byNid.set(nid, gi);
        const sentQty = gi.netQty ?? d.qty;
        gi.netQty = d.qty;
        if (gi.qty > sentQty) this.onLocalChange(gi); // merged while pending
        return;
      }
      return; // already gone locally (the gdel{lid} we sent removes it on the host)
    }
    this.spawnLocal({ ...d, nid, origin });
  }

  // ---- session lifecycle ------------------------------------------------------------------------------------
  /** We started hosting / joined: share the items already lying around in our world. */
  onConnected() {
    for (const gi of [...this.game.groundItems.values()]) if (this.shareable(gi)) this.share(gi);
  }

  /** The session ended: keep only the items we registered ourselves. */
  onEnded() {
    const g = this.game;
    for (const t of this.taking.values()) clearTimeout(t.timer);
    this.taking.clear();
    for (const gi of [...this.byNid.values()]) if (!gi.netMine) this.removeLocal(gi);
    for (const gi of g.groundItems.values()) { gi.nid = null; gi.netQty = null; gi.netPending = false; gi.netMine = false; gi.netOrigin = null; }
    this.byNid.clear();
    this.pending.clear();
    this.reg.clear();
  }
}
