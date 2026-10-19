// Shared NPCs (host-authoritative). OWNER: agent E. Design: docs/NET_SHARED_WORLD.md §4.
//
// Every NPC placed by the map builder (respawning spawns, minus Hunter creatures) gets a stable shared id
// (`npc.netSid`, from its sorted `id@spawnX,spawnY` key - the world is built identically on every client).
// In a session the HOST simulates them as usual (wander, aggression - now also against joiners - combat,
// death, drops, respawn) and streams compact, interest-managed deltas to each joiner. JOINERS stop simulating
// them (`npc.netControlled`: the engine only walks them to the host's positions) and:
//   * roll their own hits locally (own stats, like PvP) -> `nhit` -> the host applies them authoritatively
//     (`game.applyDamage(..., {netRaw})`), tracks damage per player and retaliates against the joiner;
//   * roll the NPC's attacks on themselves: the host only decides *that* an NPC attacks whom with which attack
//     (`npc:attack` event -> attack event in the stream); the target's client runs the normal combat code
//     against its real stats/prayers/equipment, so its own HP stays authoritative;
//   * get `npc:death` locally when the host reports the death, with killer = the local player when it dealt
//     damage (slayer / quest kill credit for every contributor); the host rolls the drop for the player who
//     dealt the most damage (private to them for a minute, then shared ground items for everyone).
//
// Messages (session `dm` kinds):
//   host -> joiner: nhello{sig} · ns{u: [[sid, x, y, hp, st, tg]...], e: [[sid, kind, ...]...]}
//                   st: 0 alive · 1 dead · 2 hidden;  tg: target peerId | 0
//                   e kinds: 0 splat [sid, 0, amount, type, srcPeer|0] · 1 attack [sid, 1, attackIndex, targetPeer]
//                            2 death [sid, 2, [contributor peerIds], topDamagePeer|0]
//   joiner -> host: nready{ok} · nhit{s, a, ty, sp?} · neff{s, k, v, sk?} · naggro{s}

import { getData } from '../core/registry.js';
import { findPath } from '../world/pathfinding.js';
import { isObj, int, cleanId } from './protocol.js';

const INTEREST = 32;        // tiles: a joiner receives NPCs within this range (+ NPCs fighting it)
const DORMANT = 44;         // host: NPCs farther than this from every player stop wandering / aggroing
const SPLATS = ['damage', 'block', 'poison', 'venom', 'heal'];
const HIT_TYPES = new Set(['melee', 'stab', 'slash', 'crush', 'ranged', 'magic', 'poison', 'typeless']);
const DRAIN_SKILLS = new Set(['attack', 'strength', 'defence', 'ranged', 'magic']);
const EV_SPLAT = 0, EV_ATTACK = 1, EV_DEATH = 2;
const PREDICT_MS = 1500;    // a local predicted HP drop wins over older host values this long

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
const cheb = (a, x, y) => Math.max(Math.abs(a.x - x), Math.abs(a.y - y));

export class SharedNpcs {
  constructor(net) {
    this.net = net;
    this.game = net.game;
    this.session = net.session;
    this.table = [];          // sid -> Npc
    this.sig = '';
    this.active = false;      // joiner: the host simulates our shared NPCs
    this.ready = new Set();   // host: joiners that share our NPC table
    this.views = new Map();   // host: peerId -> Map(sid -> last state key sent)
    this.events = [];         // host: one-shot events of the current tick
    this.applying = false;
    this._aggro = { tick: -1, list: null };
    this.buildTable();
    this.wire();
  }

  get isHost() { return this.session.role === 'host'; }
  get myId() { return this.session.myId; }

  buildTable() {
    const keyed = new Map(), dup = new Set();
    for (const npc of this.game.npcs.values()) {
      if (!npc.respawns || getData('hunter', npc.id)) continue; // hunter creatures react to each player's own traps
      const k = `${npc.id}@${npc.spawnX},${npc.spawnY}`;
      if (keyed.has(k)) dup.add(k); else keyed.set(k, npc);
    }
    for (const k of dup) keyed.delete(k);
    const keys = [...keyed.keys()].sort();
    keys.forEach((k, i) => { const npc = keyed.get(k); npc.netSid = i; this.table[i] = npc; });
    this.sig = `${keys.length}:${fnv(keys.join('|'))}`;
  }

  npc(sid) { const i = int(sid, 0, this.table.length - 1); return i == null ? null : this.table[i] || null; }

  wire() {
    const ev = this.game.events;
    ev.on('damage', (e) => this.onDamage(e));
    ev.on('npc:attack', (e) => this.onAttack(e));
    ev.on('npc:respawn', ({ npc }) => this.onRespawn(npc));
    ev.on('tick', () => {
      if (!this.net.connected) return;
      try { if (this.isHost) this.hostTick(); else if (this.active) this.joinerTick(); } catch (e) { console.error('[net] npc tick', e); }
    });
  }

  // =============================================================================================
  // Host
  // =============================================================================================
  /** A new player joined (host): check that it built the same NPC table. */
  hello(peerId) {
    if (this.isHost) this.session.sendDirect(peerId, 'nhello', { sig: this.sig });
  }

  /** Joiners whose NPCs we simulate (combat.js: aggression candidates). */
  aggroTargets() {
    if (!this.isHost || !this.ready.size) return null;
    const g = this.game;
    if (this._aggro.tick !== g.tickCount) {
      this._aggro.tick = g.tickCount;
      this._aggro.list = [...this.ready].map((id) => g.getRemotePlayer(id)).filter((rp) => rp && !rp.dead && !rp.hidden);
    }
    return this._aggro.list;
  }

  onDamage({ target, amount, source, splat }) {
    if (target?.type !== 'npc' || target.netSid == null || !this.isHost || !this.net.connected) return;
    const by = source === this.game.player ? this.myId : source?.type === 'remote' ? source.peerId : null;
    if (by && amount > 0) { const m = (target.state.netDmg ||= {}); m[by] = (m[by] || 0) + amount; }
    if (!this.ready.size) return;
    const ty = amount > 0 ? Math.max(0, SPLATS.indexOf(splat || 'damage')) : 1;
    this.events.push([target.netSid, EV_SPLAT, amount, ty, by && by !== this.myId ? by : 0]);
  }

  onAttack({ npc, target, index, fromNet }) {
    if (fromNet || npc?.netSid == null || !this.isHost || !this.ready.size || !(index >= 0)) return;
    const to = target === this.game.player ? this.myId : target?.type === 'remote' ? target.peerId : null;
    if (to) this.events.push([npc.netSid, EV_ATTACK, index, to]);
  }

  onRespawn(npc) {
    if (npc.netSid == null) return;
    npc.state.netDmg = null;
    // joiner: a respawn scheduled before we joined must not override the host's state
    if (npc.netControlled && !this.applying) {
      const r = npc._netRec;
      if (r && r[3] !== 0) { npc.dead = true; npc.hidden = true; }
    }
  }

  /** game.kill hook: who gets the kill credit locally and who owns the drop. */
  npcDeath(npc, killer) {
    const g = this.game;
    if (npc.netControlled) return { killer, remote: true };
    if (!this.isHost || !this.net.connected) return null;
    const dmg = npc.state.netDmg || {};
    npc.state.netDmg = null;
    const killerId = killer === g.player ? this.myId : killer?.type === 'remote' ? killer.peerId : null;
    let top = null, best = 0;
    for (const [id, n] of Object.entries(dmg)) if (n > best || (n === best && id === killerId)) { top = id; best = n; }
    if (!top) top = killerId;
    const by = Object.keys(dmg).filter((id) => dmg[id] > 0);
    if (this.ready.size) this.events.push([npc.netSid, EV_DEATH, by, top || 0]);
    const local = by.includes(this.myId) ? g.player : killer;
    let owner = null;
    if (top === this.myId) owner = g.player.name;
    else if (top) owner = g.getRemotePlayer(top)?.name ?? null;
    return { killer: local, dropOwner: owner };
  }

  record(npc) {
    const g = this.game, t = npc.combatTarget;
    const tg = !t ? 0 : t === g.player ? this.myId : t.type === 'remote' ? t.peerId : 0;
    return [npc.netSid, npc.x, npc.y, npc.hp, npc.hidden ? 2 : npc.dead ? 1 : 0, tg];
  }

  hostTick() {
    const g = this.game;
    const peers = [];
    for (const id of this.ready) { const rp = g.getRemotePlayer(id); if (rp) peers.push(rp); }
    const evs = this.events;
    this.events = [];
    if (!peers.length) { this.clearDormant(); return; }
    // NPCs far from every player rest (no wandering / aggression checks)
    const players = [g.player, ...peers];
    for (const npc of this.table) {
      let near = false;
      for (const p of players) if (cheb(p, npc.x, npc.y) <= DORMANT) { near = true; break; }
      npc.netDormant = !near;
    }
    for (const rp of peers) {
      let view = this.views.get(rp.peerId);
      if (!view) { view = new Map(); this.views.set(rp.peerId, view); }
      const px = rp.netTarget?.x ?? rp.x, py = rp.netTarget?.y ?? rp.y;
      const u = [];
      for (const npc of this.table) {
        if (cheb(npc, px, py) > INTEREST && npc.combatTarget !== rp) { view.delete(npc.netSid); continue; }
        const rec = this.record(npc);
        const key = rec.join(',');
        if (view.get(npc.netSid) === key) continue;
        view.set(npc.netSid, key);
        u.push(rec);
      }
      const me = rp.peerId;
      const e = evs.filter((v) => view.has(v[0]) || (v[1] === EV_DEATH && v[2].includes(me)) || (v[1] === EV_ATTACK && v[3] === me));
      if (!u.length && !e.length) continue;
      const msg = {};
      if (u.length) msg.u = u;
      if (e.length) msg.e = e;
      this.session.sendDirect(me, 'ns', msg);
    }
  }

  clearDormant() { for (const npc of this.table) if (npc.netDormant) npc.netDormant = false; }

  /** Host: messages from a joiner. */
  onHostMessage(from, kind, d) {
    const g = this.game;
    if (kind === 'nready') {
      if (d.ok === true) { this.ready.add(from); this.views.set(from, new Map()); } else { this.ready.delete(from); this.views.delete(from); }
      return;
    }
    if (!this.ready.has(from)) return;
    const rp = g.getRemotePlayer(from);
    const npc = this.npc(d.s);
    if (!rp || !npc || npc.dead || npc.hidden || cheb(rp, npc.x, npc.y) > 24) return;
    switch (kind) {
      case 'nhit': {
        const a = int(d.a, 0, 200);
        if (a == null) return;
        const type = HIT_TYPES.has(d.ty) ? d.ty : 'typeless';
        const splat = SPLATS.includes(d.sp) ? d.sp : undefined;
        g.applyDamage(npc, a, { source: rp, type, combatHit: type !== 'poison', netRaw: true, splat });
        if (type !== 'poison') g.combat?.retaliate?.(npc, rp);
        break;
      }
      case 'naggro': g.combat?.retaliate?.(npc, rp); break;
      case 'neff': {
        const sk = DRAIN_SKILLS.has(d.sk) ? d.sk : null;
        if (d.k === 'poison') g.combat?.poison?.(npc, int(d.v, 1, 20, 4), rp);
        else if (d.k === 'bind') g.combat?.bind?.(npc, int(d.v, 1, 30, 8));
        else if (d.k === 'lower' && sk) g.combat?.lowerStat?.(npc, sk, int(d.v, 1, 50, 1));
        else if (d.k === 'drain' && sk && typeof d.v === 'number' && Number.isFinite(d.v)) g.combat?.drainPct?.(npc, sk, Math.max(0, Math.min(0.5, d.v)));
        else if (d.k === 'heal') g.heal(npc, int(d.v, 0, 200, 0));
        break;
      }
      default: break;
    }
  }

  onPlayerLeave(peerId) {
    this.ready.delete(peerId);
    this.views.delete(peerId);
  }

  // =============================================================================================
  // Joiner
  // =============================================================================================
  onJoinerMessage(kind, d) {
    if (kind === 'nhello') {
      const ok = d.sig === this.sig;
      this.session.sendDirect(this.session.hostId, 'nready', { ok });
      if (ok) this.activate();
      else {
        console.warn('[net] NPC tables differ from the host; monsters stay local', d.sig, this.sig);
        this.game.message('<col=a00000>Your game version differs from the host\'s: monsters are not shared (reload both games to fix).</col>');
      }
      return;
    }
    if (kind === 'ns' && this.active) this.onState(d);
  }

  activate() {
    if (this.active) return;
    this.active = true;
    const g = this.game;
    for (const npc of this.table) {
      npc.netControlled = true;
      npc.netSpeed = 1;
      npc.netTgt = null;
      npc._netRec = null;
      npc.path = [];
      npc.combatTarget = null;
      if (npc.action) g.actions.stop(npc, 'net');
      npc.state.poison = null;
      npc.state.returning = false;
    }
  }

  /** Session over (or never matched): our NPCs resume local simulation from their current state. */
  deactivate() {
    const g = this.game;
    this.clearDormant();
    this.ready.clear();
    this.views.clear();
    this.events = [];
    if (!this.active) return;
    this.active = false;
    for (const npc of this.table) {
      if (!npc.netControlled) continue;
      npc.netControlled = false;
      npc.netSpeed = 0;
      npc.netTgt = null;
      npc._netRec = null;
      npc.path = [];
      if (npc.combatTarget && npc.combatTarget !== g.player) npc.combatTarget = null;
      if (npc.faceTarget?.type === 'remote') npc.faceTarget = null;
      if (npc.dead || npc.hidden) {
        npc.dead = true;
        npc.hidden = true;
        g.schedule(Math.max(5, Math.min(npc.def.respawnTicks || 30, 100)), () => { if (npc.dead && g.npcs.has(npc.uid) && !npc.netControlled) g.respawnNpc(npc); });
      }
    }
  }

  joinerTick() {
    const g = this.game, p = g.player, t = g.tickCount;
    for (const npc of this.table) {
      if (!npc.netControlled || npc.combatTarget === npc.netTgt) continue;
      // local code made it fight us (retaliation, a caught pickpocket...): ask the host
      if (npc.combatTarget === p && !npc.dead && !npc.hidden && !(npc._aggroAt > t - 3)) {
        npc._aggroAt = t;
        this.session.sendDirect(this.session.hostId, 'naggro', { s: npc.netSid });
      }
      npc.combatTarget = npc.netTgt && !g.targetGone(npc.netTgt) ? npc.netTgt : null;
    }
  }

  /** game.applyDamage hook: our hit on a shared NPC (already shown locally) goes to the host. */
  damage(npc, dmg, opts = {}) {
    npc.hp = Math.max(0, npc.hp - dmg);
    npc._predAt = performance.now();
    const msg = { s: npc.netSid, a: dmg, ty: opts.type || 'typeless' };
    if (opts.splat) msg.sp = opts.splat;
    this.session.sendDirect(this.session.hostId, 'nhit', msg);
  }

  /** combat.js hook: a status effect on a shared NPC (poison, bind, stat drains, heal). */
  effect(npc, k, v, sk) {
    if (!this.active || !npc?.netControlled) return false;
    const msg = { s: npc.netSid, k, v };
    if (sk) msg.sk = sk;
    return this.session.sendDirect(this.session.hostId, 'neff', msg);
  }

  onState(d) {
    if (!isObj(d)) return;
    this.applying = true;
    try {
      if (Array.isArray(d.e)) for (const ev of d.e.slice(0, 600)) if (Array.isArray(ev)) this.applyEvent(ev);
      if (Array.isArray(d.u)) for (const r of d.u.slice(0, 1200)) if (Array.isArray(r)) this.applyRecord(r);
    } finally { this.applying = false; }
  }

  resolve(id) {
    const g = this.game;
    const c = cleanId(id);
    if (!c) return null;
    return c === this.myId ? g.player : g.getRemotePlayer(c);
  }

  applyRecord(r) {
    const g = this.game;
    const npc = this.npc(r[0]);
    if (!npc?.netControlled) return;
    const x = int(r[1], 0, 100000), y = int(r[2], 0, 100000), hp = int(r[3], 0, 99999), st = int(r[4], 0, 2);
    if (x == null || y == null || hp == null || st == null || !g.world.inBounds(x, y)) return;
    npc._netRec = [x, y, hp, st];
    const tgt = r[5] ? this.resolve(r[5]) : null;
    if (st === 0) {
      if (npc.dead || npc.hidden) { g.respawnNpc(npc); npc.setPosition(x, y); }
      else this.moveTo(npc, x, y);
      const predicted = npc._predAt && performance.now() - npc._predAt < PREDICT_MS && npc.hp < hp;
      if (!predicted) npc.hp = Math.min(hp, npc.maxHp);
      npc.netTgt = tgt;
      npc.combatTarget = tgt;
      if (tgt) npc.faceTarget = tgt;
      else if (npc.faceTarget && (npc.faceTarget.type === 'remote' || npc.faceTarget === g.player) && !npc.talkingTo) npc.faceTarget = null;
    } else {
      npc.hp = Math.min(hp, npc.maxHp);
      npc.netTgt = null;
      if (!npc.dead) {
        // it died out of our sight
        npc.dead = true;
        npc.path = [];
        npc.combatTarget = null;
        for (const c of g.characters()) if (c.combatTarget === npc) c.combatTarget = null;
        if (st === 1) g.playAnim(npc, 'death', 1800);
      }
      if (st === 2) npc.hidden = true;
      if (npc.x !== x || npc.y !== y) npc.setPosition(x, y);
    }
  }

  moveTo(npc, x, y) {
    const w = this.game.world;
    const d = cheb(npc, x, y);
    npc.netSpeed = 1;
    if (d === 0) { npc.path = []; return; }
    if (d > 8) { npc.setPosition(x, y); return; }
    let path = [];
    let cx = npc.x, cy = npc.y, ok = true;
    while (cx !== x || cy !== y) {
      const sx = Math.sign(x - cx), sy = Math.sign(y - cy);
      if (!w.canStep(cx, cy, sx, sy)) { ok = false; break; }
      cx += sx; cy += sy;
      path.push({ x: cx, y: cy });
    }
    if (!ok) {
      const r = findPath(w, npc.x, npc.y, { x0: x, y0: y, x1: x, y1: y, mode: 'tile' }, { maxNodes: 400, radius: 12 });
      if (!r.reached || !r.path.length || r.path.length > d * 3) { npc.setPosition(x, y); return; }
      path = r.path;
    }
    npc.path = path;
    npc.netSpeed = path.length >= 2 ? 2 : 1;
  }

  applyEvent(ev) {
    const g = this.game;
    const npc = this.npc(ev[0]);
    if (!npc?.netControlled) return;
    switch (ev[1]) {
      case EV_SPLAT: {
        const a = int(ev[2], 0, 9999), ty = SPLATS[int(ev[3], 0, SPLATS.length - 1, 0)];
        if (a == null || (ev[4] && ev[4] === this.myId)) return; // our own hit: already shown when we rolled it
        npc.hitsplats.push({ amount: a, type: a > 0 ? ty : 'block', time: performance.now() });
        if (npc.hitsplats.length > 6) npc.hitsplats.shift();
        npc.hpBarUntil = performance.now() + 6000;
        npc.lastAttackedTick = g.tickCount;
        break;
      }
      case EV_ATTACK: {
        if (npc.dead || npc.hidden) return;
        const ai = int(ev[2], 0, 50);
        const t = this.resolve(ev[3]);
        if (ai == null || !t || t.dead) return;
        if (cheb(t, npc.x, npc.y) > 24) return;
        npc.faceTarget = t;
        g.combat?.npcAttack?.(npc, t, ai);
        break;
      }
      case EV_DEATH: {
        if (npc.dead) return;
        const by = Array.isArray(ev[2]) ? ev[2].slice(0, 16).map(cleanId) : [];
        const top = ev[3] ? this.resolve(ev[3]) : null;
        const killer = by.includes(this.myId) ? g.player : top || null;
        npc.hp = 0;
        npc.netTgt = null;
        g.kill(npc, killer);
        break;
      }
      default: break;
    }
  }
}
