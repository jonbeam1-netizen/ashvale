// Shared resource state (host-authoritative). OWNER: agent E. Design: docs/NET_SHARED_WORLD.md §5.
//
// * Depletion: whenever a resource is depleted through game.depleteObject (trees falling, rocks running out,
//   flax / wheat picked bare...) the host broadcasts it and every client depletes its copy; the HOST's respawn
//   timer decides when it comes back (`orest`). Gather rolls stay local. A joiner's own depletion is reported
//   to the host (its local timer is stretched so the host restores it).
// * Fishing spots: only the host moves them (`omove`); joiners freeze their local spot timers.
// * Permanent ground spawns (`respawnTicks` items): a joiner's Take asks the host (`ptake`), exactly one
//   player gets each spawn and everyone sees it gone until it respawns (`ptk`).
// Objects are matched by `originalId@x,y` (fishing spots by their home tile) - the world is built identically on
// every client. Per-player objects (farming patches, the construction homestead, quest objects, hunter traps,
// fires, gravestones) never go through depleteObject and stay local.
//
// Messages: joiner -> host: odep{k, t} · ptake{k} · pgone{k}
//           host -> all:    odep{k, t} · orest{k} · omove{k, x, y} · ptk{k}
//           host -> one:    osync{d: [[k, ticks]...], m: [[k, x, y]...], p: [k...]} · pgrant{k, id, qty} · pdeny{k}

import { getData, getItem } from '../core/registry.js';
import { MAX_STACK } from '../core/constants.js';
import { isObj, int } from './protocol.js';

const SLACK = 60;           // joiner: local respawn fallback beyond the host's timer (ticks)
const KEY_RE = /^[a-z0-9_:-]{1,64}@\d{1,6},\d{1,6}$/i;

const cleanKey = (k) => (typeof k === 'string' && KEY_RE.test(k) ? k : null);

export class SharedWorld {
  constructor(net) {
    this.net = net;
    this.game = net.game;
    this.session = net.session;
    this.index = null;          // key -> WorldObject (built on first use)
    this.newSpots = [];         // spots added this tick (indexed once their state is copied over)
    this.missing = new Map();   // host: permanent item key -> tick it respawns
    this.applying = false;
    this.wire();
  }

  get isHost() { return this.session.role === 'host'; }
  get active() { return this.net.connected; }

  isSpot(o) { return !!getData('fishing', o.id); }
  key(o) { return this.isSpot(o) ? `f:${o.id}@${o.state.homeX ?? o.x},${o.state.homeY ?? o.y}` : `${o.originalId}@${o.x},${o.y}`; }
  gkey(gi) { return `${gi.itemId}@${gi.x},${gi.y}`; }

  buildIndex() {
    this.index = new Map();
    for (const o of this.game.objects.values()) { const k = this.key(o); if (!this.index.has(k)) this.index.set(k, o); }
  }
  find(k) {
    if (!this.index) this.buildIndex();
    const o = this.index.get(k);
    return o && this.game.objects.has(o.uid) ? o : null;
  }

  wire() {
    const g = this.game, ev = g.events;
    ev.on('object:add', ({ object }) => {
      if (!this.index) return;
      if (this.isSpot(object)) this.newSpots.push(object);
      else { const k = this.key(object); if (!this.find(k)) this.index.set(k, object); }
    });
    ev.on('object:remove', ({ object }) => {
      if (!this.index) return;
      const k = this.key(object);
      if (this.index.get(k) === object) this.index.delete(k);
    });
    ev.on('object:deplete', ({ object, ticks }) => { if (!this.applying && this.active) this.onLocalDeplete(object, ticks); });
    ev.on('object:restore', ({ object }) => {
      if (this.applying || !this.active || !this.isHost) return;
      this.session.broadcast('orest', { k: this.key(object) });
    });
    ev.on('ground:add', ({ item }) => { if (item.respawnTicks) this.missing.delete(this.gkey(item)); });
    ev.on('ground:remove', ({ item, expired }) => {
      if (!item.respawnTicks || expired) return;
      const k = this.gkey(item);
      this.missing.set(k, g.tickCount + item.respawnTicks);
      if (this.applying || !this.active) return;
      if (this.isHost) this.session.broadcast('ptk', { k });
      else this.session.sendDirect(this.session.hostId, 'pgone', { k });
    });
    ev.on('tick', () => this.onTick());
  }

  onTick() {
    if (!this.newSpots.length) return;
    const spots = this.newSpots;
    this.newSpots = [];
    for (const o of spots) {
      if (!this.game.objects.has(o.uid)) continue;
      const k = this.key(o);
      this.index?.set(k, o);
      if (!this.active || this.applying) continue;
      if (this.isHost) this.session.broadcast('omove', { k, x: o.x, y: o.y });
      else o.state.moveAt = Infinity; // joiners never move spots themselves
    }
  }

  // ---- depletion ----------------------------------------------------------------------------------------
  onLocalDeplete(obj, ticks) {
    const k = this.key(obj);
    if (this.isHost) { this.session.broadcast('odep', { k, t: ticks }); return; }
    // the host decides when it comes back; our own timer is only a fallback
    this.stretch(obj, ticks + SLACK);
    this.session.sendDirect(this.session.hostId, 'odep', { k, t: ticks });
  }

  stretch(obj, ticks) {
    const g = this.game;
    obj._revert?.cancel();
    obj._revert = g.schedule(ticks, () => { obj._revert = null; g.restoreObject(obj); });
  }

  deplete(obj, ticks) {
    if (!obj || obj._depleted || obj.hidden) return false;
    this.applying = true;
    try { this.game.depleteObject(obj, ticks); } finally { this.applying = false; }
    return true;
  }

  restore(obj) {
    if (!obj?._depleted) return;
    this.applying = true;
    try { this.game.restoreObject(obj); } finally { this.applying = false; }
  }

  // ---- fishing spots ------------------------------------------------------------------------------------
  moveSpot(k, x, y) {
    const g = this.game;
    const obj = this.find(k);
    if (!obj || (obj.x === x && obj.y === y) || !g.world.inBounds(x, y) || !g.world.isWater(x, y)) return;
    const state = { ...obj.state };
    this.applying = true;
    try {
      g.removeObject(obj);
      const moved = g.spawnObject(obj.id, x, y);
      if (moved) { Object.assign(moved.state, state, { moveAt: Infinity }); this.index?.set(k, moved); }
    } finally { this.applying = false; }
  }

  freezeSpots(on) {
    const spots = this.game.gathering?.spots;
    if (!spots) return;
    for (const o of spots) o.state.moveAt = on ? Infinity : this.game.tickCount + 300 + Math.floor(Math.random() * 500);
  }

  // ---- permanent ground spawns --------------------------------------------------------------------------
  findPerm(k) {
    for (const gi of this.game.groundItems.values()) if (gi.respawnTicks && this.gkey(gi) === k) return gi;
    return null;
  }

  removePerm(gi) {
    this.applying = true;
    try { this.game.removeGroundItem(gi); } finally { this.applying = false; }
  }

  /** Joiner: Take on a permanent spawn goes through the host. */
  requestTake(gi) {
    const k = this.gkey(gi);
    if (this._taking === k) return;
    this._taking = k;
    clearTimeout(this._takeTimer);
    this._takeTimer = setTimeout(() => { this._taking = null; }, 4000);
    this.session.sendDirect(this.session.hostId, 'ptake', { k });
  }

  granted(k, id, qty) {
    const g = this.game, p = g.player;
    if (this._taking === k) this._taking = null;
    const gi = this.findPerm(k);
    if (gi) this.removePerm(gi);
    const fit = Math.min(qty, p.inventory.capacityFor(id));
    if (fit > 0) {
      p.inventory.add(id, fit);
      g.playAnim(p, 'pickup', 600);
      g.events.emit('item:pickup', { player: p, itemId: id, qty: fit });
    }
    if (qty - fit > 0) g.spawnGroundItem(id, qty - fit, p.x, p.y, { owner: p.name });
  }

  // ---- messages ---------------------------------------------------------------------------------------------
  onHostMessage(from, kind, d) {
    const k = cleanKey(d.k);
    if (!k) return;
    switch (kind) {
      case 'odep': {
        const obj = this.find(k);
        const t = int(d.t, 1, 6000, 30);
        if (this.deplete(obj, t)) this.session.broadcast('odep', { k, t });
        break;
      }
      case 'ptake': {
        const gi = this.findPerm(k);
        if (!gi) { this.session.sendDirect(from, 'pdeny', { k }); return; }
        this.removePerm(gi);
        this.session.sendDirect(from, 'pgrant', { k, id: gi.itemId, qty: gi.qty });
        this.session.broadcast('ptk', { k });
        break;
      }
      case 'pgone': {
        const gi = this.findPerm(k);
        if (gi) { this.removePerm(gi); this.session.broadcast('ptk', { k }); }
        break;
      }
      default: break;
    }
  }

  onJoinerMessage(kind, d) {
    if (!isObj(d)) return;
    if (kind === 'osync') { this.applySync(d); return; }
    const k = cleanKey(d.k);
    if (!k) return;
    switch (kind) {
      case 'odep': { const obj = this.find(k); this.deplete(obj, int(d.t, 1, 6000, 30) + SLACK); break; }
      case 'orest': this.restore(this.find(k)); break;
      case 'omove': { const x = int(d.x, 0, 100000), y = int(d.y, 0, 100000); if (x != null && y != null) this.moveSpot(k, x, y); break; }
      case 'ptk': { const gi = this.findPerm(k); if (gi) this.removePerm(gi); break; }
      case 'pgrant': {
        const id = typeof d.id === 'string' && getItem(d.id) ? d.id : null;
        const qty = int(d.qty, 1, MAX_STACK);
        if (id && qty) this.granted(k, id, qty);
        break;
      }
      case 'pdeny': {
        if (this._taking === k) this._taking = null;
        const gi = this.findPerm(k);
        if (gi) this.removePerm(gi);
        this.game.message('Too late - someone else has taken that.');
        break;
      }
      default: break;
    }
  }

  // ---- session lifecycle ------------------------------------------------------------------------------------
  /** Host: bring a new player up to date (depleted resources, fishing spot positions, taken spawns). */
  syncTo(peerId) {
    if (!this.isHost) return;
    const g = this.game, t = g.tickCount;
    if (!this.index) this.buildIndex();
    const d = [], m = [], p = [];
    for (const o of g.objects.values()) {
      if (o._depleted) d.push([this.key(o), Math.max(1, (o._revert?.at ?? t + 30) - t)]);
      if (this.isSpot(o)) m.push([this.key(o), o.x, o.y]);
    }
    for (const [k, at] of this.missing) if (at > t) p.push(k); else this.missing.delete(k);
    // chunked: one message per 300 entries
    const CH = 300;
    for (let i = 0; i < Math.max(d.length, m.length, p.length, 1); i += CH) {
      this.session.sendDirect(peerId, 'osync', { d: d.slice(i, i + CH), m: m.slice(i, i + CH), p: p.slice(i, i + CH) });
    }
  }

  applySync(data) {
    if (Array.isArray(data.d)) for (const e of data.d.slice(0, 2000)) {
      if (!Array.isArray(e)) continue;
      const k = cleanKey(e[0]);
      if (k) this.deplete(this.find(k), int(e[1], 1, 6000, 30) + SLACK);
    }
    if (Array.isArray(data.m)) for (const e of data.m.slice(0, 2000)) {
      if (!Array.isArray(e)) continue;
      const k = cleanKey(e[0]), x = int(e[1], 0, 100000), y = int(e[2], 0, 100000);
      if (k && x != null && y != null) this.moveSpot(k, x, y);
    }
    if (Array.isArray(data.p)) for (const e of data.p.slice(0, 2000)) {
      const k = cleanKey(e);
      const gi = k && this.findPerm(k);
      if (gi) this.removePerm(gi);
    }
  }

  onConnected() {
    if (!this.index) this.buildIndex();
    if (!this.isHost) this.freezeSpots(true);
  }

  onEnded(wasJoiner) {
    clearTimeout(this._takeTimer);
    this._taking = null;
    if (wasJoiner) this.freezeSpots(false);
  }
}
