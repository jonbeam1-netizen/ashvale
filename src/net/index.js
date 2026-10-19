// Networking entry point. OWNER: agent E. Peer-to-peer multiplayer via PeerJS (global `Peer`).
//
// Host World -> 6-char code (PeerJS id `ashvale-v1-<CODE>` on the public PeerJS cloud signalling server);
// friends join with the code or an invite link (`?join=CODE`). Star topology: the host relays.
// Shared: players (position/appearance/equipment/anim/hp/prayers...), public + private chat,
// trading, PvP hits/loot/deaths/hitsplats/projectiles, and Wilderness ground items (host-authoritative,
// net/shared.js). NOT shared: NPCs, resources, ground items outside the Wilderness (each client runs its own).
//
// game.net API (see also docs in ARCHITECTURE.md §11):
//   connected, peerId, role ('host'|'joiner'|null), code, status
//   host(), join(code), leave(), inviteLink(), players() -> [{peerId, name, combatLevel, ping}]
//   send(peerId, type, data) / broadcast(type, data)  -> receivers get event 'net:message' {from, remote, type, data}
//   sendHit(peerId, {damage, style, attackerName, ts}) -> receiver: game.pvp.receiveHit(remote, payload)
//   sendLoot(peerId, {items:[{id,qty}], x, y})         -> receiver: game.pvp.receiveLoot(remote, payload)
//   sendPrivateMessage(peerId, text)
// Events: 'net:status' {status, error}, 'net:join' {remote}, 'net:leave' {remote, reason},
//         'net:message', 'net:remoteDeath' {remote, killerPeerId}

import { getItem } from '../core/registry.js';
import { Session } from './session.js';
import { TradeManager } from './trade.js';
import { NetPanel } from './panel.js';
import { SharedGround } from './shared.js';
import { cleanSnapshot, cleanText, cleanHit, cleanLoot, cleanPayload, cleanId, cleanFx, cleanSplat, int, isObj } from './protocol.js';

const KEEPALIVE_TICKS = 10; // resend an unchanged snapshot this often

class NetManager {
  constructor(game) {
    this.game = game;
    this.deaths = 0;
    this.fxId = 0;
    this.curHid = null;
    this.lastAnim = null;
    this.lastSent = '';
    this.lastSentTick = -999;
    this.session = new Session({
      status: () => this.onStatus(),
      localSnap: () => this.buildSnap(),
      cleanSnap: (raw) => cleanSnapshot(raw, game.world),
      playerJoin: (id, snap, initial) => this.onPlayerJoin(id, snap, initial),
      playerLeave: (id, reason) => this.onPlayerLeave(id, reason),
      snapshot: (id, snap) => this.applyRemote(id, snap),
      broadcast: (id, kind, data) => this.onBroadcast(id, kind, data),
      direct: (id, kind, data) => this.onDirect(id, kind, data),
      roster: () => this.panel?.update(),
      ended: (reason) => this.onEnded(reason),
    });
    this.trade = new TradeManager(this);
    this.shared = new SharedGround(this);
    this.panel = null;
    this.api = this.makeApi();
    this.wire();
  }

  get connected() { return this.session.connected; }

  makeApi() {
    const net = this, s = this.session;
    return {
      get connected() { return s.connected; },
      get peerId() { return s.myId; },
      get role() { return s.role; },
      get code() { return s.code; },
      get status() { return s.status; },
      get error() { return s.error; },
      host: () => net.host(),
      join: (code) => net.join(code),
      leave: () => net.leave(),
      inviteLink: () => net.inviteLink(),
      players: () => [...net.game.remotePlayers.values()].map((rp) => ({ peerId: rp.peerId, name: rp.name, combatLevel: rp.combatLevel, ping: s.pings.get(rp.peerId) ?? null })),
      /** Custom message to one peer -> 'net:message' on the receiver. */
      send: (peerId, type, data) => s.sendDirect(peerId, 'x', { type: String(type).slice(0, 40), data }),
      /** Custom message to everyone -> 'net:message' on receivers. */
      broadcast: (type, data) => s.broadcast('x', { type: String(type).slice(0, 40), data }),
      sendHit: (peerId, payload) => net.sendHit(peerId, payload),
      sendLoot: (peerId, payload) => net.sendLoot(peerId, payload),
      sendPrivateMessage: (peerId, text) => net.sendPrivateMessage(peerId, text),
      getRemote: (peerId) => net.game.getRemotePlayer(peerId),
      trade: this.trade,
    };
  }

  // ---- lifecycle ------------------------------------------------------------------------------------
  host() { this.session.host(); }
  join(code) { this.session.join(code); }
  leave() {
    if (!this.session.role) return;
    this.session.leave();
    this.game.message('You have left the world.');
    // stop auto-joining on reload once the player left on purpose
    try {
      const u = new URL(location.href);
      if (u.searchParams.has('join')) { u.searchParams.delete('join'); history.replaceState(null, '', u.toString()); }
    } catch { /* ignore */ }
  }

  inviteLink() {
    if (!this.session.code) return '';
    return `${location.origin}${location.pathname}?join=${this.session.code}`;
  }

  wire() {
    const g = this.game, ev = g.events;
    if (g.ui) this.panel = new NetPanel(this);

    // local state out: snapshot every tick when changed (+ keepalive)
    ev.on('tick', ({ tick }) => {
      if (!this.connected) return;
      const snap = this.buildSnap();
      let str;
      try { str = JSON.stringify(snap); } catch { return; }
      if (str === this.lastSent && tick - this.lastSentTick < KEEPALIVE_TICKS) return;
      this.lastSent = str;
      this.lastSentTick = tick;
      this.session.sendSnapshot(snap);
    });
    // standing remote players keep their networked facing
    g.onTick(() => {
      for (const rp of g.remotePlayers.values()) {
        if (!rp.path.length && rp.netFace != null && !rp.faceTarget) rp.faceAngle = rp.netFace;
      }
    }, 50);

    ev.on('chat:public', ({ player, text }) => {
      if (player !== g.player || !this.connected) return;
      const t = cleanText(text, 80);
      if (t) this.session.broadcast('chat', { text: t });
    });

    ev.on('player:death', ({ player, killer }) => {
      if (player !== g.player) return;
      this.deaths++;
      if (this.connected) this.session.broadcast('death', { n: this.deaths, killer: killer?.type === 'remote' ? killer.peerId : null });
    });

    // visual effects involving our player (projectiles we fire, sparkles / teleports / level-ups on us,
    // splashes on the remote we target) are mirrored on the other clients
    ev.on('effect', (e) => {
      if (!this.connected || e.fromNet) return;
      const msg = this.fxMessage(e);
      if (msg) this.session.broadcast('fx', msg);
    });

    // our client is authoritative for our HP: every hitsplat we take is mirrored to the others
    // (the attacker shows it instead of its prediction - see game.pvp.confirmHit)
    ev.on('damage', (e) => {
      if (e.target !== g.player || !this.connected) return;
      const msg = {
        a: e.amount, t: e.amount > 0 ? e.splat || 'damage' : 'block', hp: g.player.hp, mhp: g.player.maxHp,
        hid: this.curHid || undefined, src: e.source?.type === 'remote' ? e.source.peerId : undefined,
      };
      if (this.curHid) this.curHid = null;
      this.session.broadcast('splat', msg);
    });

    // remote-player menu: trade
    g.interactions.onPlayer('Trade with', ({ target }) => {
      if (!this.connected || target?.type !== 'remote') { g.message('That player is not connected.'); return; }
      this.trade.request(target);
    }, { range: 2 });

    ev.on('command', (e) => {
      const [cmd, ...rest] = e.args || [];
      if (cmd === 'host') this.host();
      else if (cmd === 'join' && rest[0]) this.join(rest[0]);
      else if (cmd === 'leave') this.leave();
      else if (cmd === 'pm' && rest.length >= 2) {
        const target = [...g.remotePlayers.values()].find((rp) => rp.name.toLowerCase() === rest[0].toLowerCase());
        if (target) this.sendPrivateMessage(target.peerId, rest.slice(1).join(' '));
        else g.message(`${rest[0]} is not in this world.`);
      }
    });

    // auto-join from an invite link once the character is loaded
    ev.on('game:ready', () => {
      const code = new URLSearchParams(location.search).get('join');
      if (code && !this.session.role) {
        g.message(`Joining world ${code.toUpperCase()}...`);
        this.join(code);
      }
    });

    window.addEventListener('beforeunload', () => { try { this.session.leave(); } catch { /* ignore */ } });
  }

  // ---- local snapshot --------------------------------------------------------------------------------
  buildSnap() {
    const p = this.game.player;
    const s = p.snapshot();
    const now = performance.now();
    s.anim = p.loopAnim || null;
    // one-shot animations (attacks, eating...) are sent with an id so the receiver plays each once
    const a = p.anim;
    if (a && a.name !== 'death' && now - a.start < (a.duration || 1200)) {
      if (a !== this.lastAnim) { this.lastAnim = a; this.fxId++; }
      s.fx = { n: a.name, id: this.fxId, d: Math.round(a.duration || 1200) };
    } else delete s.fx;
    s.overhead = p.overhead && p.overhead.until > now ? p.overhead.text : null;
    // show the skilling tool in hand
    const tool = p.action?.tool;
    const tdef = tool && getItem(tool);
    if (tdef && (tdef.slot === 'weapon' || tdef.model?.shape)) s.equipment = { ...s.equipment, weapon: tool };
    s.deathCount = this.deaths;
    // agility: collision-free forced walking (logs, ledges...); the height offset (`elevation`) is added by
    // systems/agility.js through the 'snapshot' event
    if (p.forced) s.forced = true;
    return s;
  }

  // ---- remote players -------------------------------------------------------------------------------
  onPlayerJoin(id, snap, initial = false) {
    const isNew = !this.game.getRemotePlayer(id);
    const rp = this.applyRemote(id, snap);
    if (isNew && rp) {
      this.game.message(initial ? `${rp.name} is in this world.` : `<col=00a000>${rp.name} has joined the world.</col>`);
      this.game.events.emit('net:join', { remote: rp });
      if (!initial) this.shared.syncTo(id);
    }
    this.panel?.update();
  }

  onPlayerLeave(id, reason) {
    const g = this.game;
    const rp = g.getRemotePlayer(id);
    if (!rp) return;
    if (g.player.following === rp) g.player.following = null;
    if (g.player.combatTarget === rp) g.player.combatTarget = null;
    g.removeRemotePlayer(id);
    this.shared.onPlayerLeave(id);
    const why = reason && reason !== 'left' ? ` (${reason})` : '';
    g.message(`<col=a00000>${rp.name} has left the world${why}.</col>`);
    g.events.emit('net:leave', { remote: rp, reason });
    this.panel?.update();
  }

  applyRemote(id, s) {
    if (!s) return null;
    const g = this.game;
    const existed = g.getRemotePlayer(id);
    const snap = { ...s };
    delete snap.fx;
    const rp = g.updateRemotePlayer(id, snap);
    if (!rp) return null;
    rp.peerId = id;
    if (s.fx) {
      if (existed && rp._fxId !== s.fx.id && !rp.dead) g.playAnim(rp, s.fx.n, s.fx.d);
      rp._fxId = s.fx.id;
    }
    if (typeof s.faceAngle === 'number') rp.netFace = s.faceAngle;
    if (!('elevation' in s)) rp.extra.elevation = 0;
    // forced walks and raised platforms (non-walkable tiles) can't be path-found: walk straight there
    const t = rp.netTarget;
    this.applyForced(rp, !!s.forced || (!!t && !g.world.isWalkable(t.x, t.y)));
    if (s.deathCount != null) {
      if (rp._deaths == null) rp._deaths = s.deathCount;
      else if (s.deathCount > rp._deaths) { rp._deaths = s.deathCount; this.remoteDied(rp, null); }
    }
    return rp;
  }

  /** Forced walks (agility) ignore collision: walk the remote in a straight line instead of path-finding. */
  applyForced(rp, forced) {
    const t = rp.netTarget;
    if (!forced) {
      if (rp.forced) { rp.forced = false; rp._pathTarget = null; }
      return;
    }
    rp.forced = true;
    if (!t) return;
    const d = Math.max(Math.abs(t.x - rp.x), Math.abs(t.y - rp.y));
    if (d === 0 || d > 12) return;
    const path = [];
    let x = rp.x, y = rp.y;
    while (x !== t.x || y !== t.y) { x += Math.sign(t.x - x); y += Math.sign(t.y - y); path.push({ x, y }); }
    rp.path = path;
    rp._pathTarget = `${t.x},${t.y}`;
  }

  remoteDied(rp, killerPeerId) {
    try { this.game.pvp?.onRemoteDeath?.(rp, { killerPeerId }); } catch (e) { console.error('[net] pvp.onRemoteDeath threw', e); }
    this.game.events.emit('net:remoteDeath', { remote: rp, killerPeerId });
  }

  onEnded(reason) {
    const g = this.game;
    this.trade.reset();
    this.shared.onEnded();
    this.panel?.clearToasts();
    for (const id of [...g.remotePlayers.keys()]) {
      const rp = g.remotePlayers.get(id);
      if (g.player.following === rp) g.player.following = null;
      if (g.player.combatTarget === rp) g.player.combatTarget = null;
      g.removeRemotePlayer(id);
    }
    this.lastSent = '';
    if (reason) g.message(`<col=a00000>${reason}</col>`);
  }

  onStatus() {
    const s = this.session;
    if (s.status === 'hosting') this.game.message(`<col=00a000>You are hosting world ${s.code}. Friends can join with that code (Multiplayer tab).</col>`);
    if (s.status === 'joined') this.game.message(`<col=00a000>You have joined world ${s.code}.</col>`);
    if (s.status === 'hosting' || s.status === 'joined') { this.lastSent = ''; this.shared.onConnected(); }
    this.panel?.update();
    this.game.events.emit('net:status', { status: s.status, error: s.error });
  }

  // ---- incoming messages ----------------------------------------------------------------------------
  onBroadcast(from, kind, data) {
    const g = this.game;
    const rp = g.getRemotePlayer(from);
    if (!rp || !isObj(data)) return;
    switch (kind) {
      case 'chat': {
        const text = cleanText(data.text, 80);
        if (text) g.say(rp, text);
        break;
      }
      case 'death': {
        const n = int(data.n, 0, 1e9);
        if (n == null) return;
        if (rp._deaths == null || n > rp._deaths) { rp._deaths = n; this.remoteDied(rp, cleanId(data.killer)); }
        break;
      }
      case 'fx': this.applyFx(rp, data); break;
      case 'gadd': case 'gdel': case 'gset': this.shared.onBroadcast(from, kind, data); break;
      case 'splat': this.applySplat(rp, data); break;
      case 'x': this.emitCustom(from, rp, data); break;
      default: break;
    }
  }

  // ---- mirrored effects & hitsplats -----------------------------------------------------------------
  fxRef(ent) {
    const g = this.game;
    if (!ent) return null;
    if (ent === g.player) return { p: this.session.myId };
    if (ent.type === 'remote') return ent.peerId ? { p: ent.peerId } : null;
    if (typeof ent.x === 'number' && typeof ent.y === 'number') {
      const sz = ent.size || 1;
      return { t: [Math.floor(ent.x + (sz - 1) / 2), Math.floor(ent.y + (sz - 1) / 2)] };
    }
    return null;
  }

  fxMessage(e) {
    const g = this.game, at = e.at, to = e.to;
    const mine = at === g.player;
    // only effects that are about players are mirrored (NPCs are local to each client)
    if (e.kind === 'projectile') { if (!mine || !to) return null; }
    else if (!(mine || at?.type === 'remote')) return null;
    const msg = { k: e.kind, at: this.fxRef(at) };
    if (to) msg.to = this.fxRef(to);
    if (!msg.at || (to && !msg.to)) return null;
    if (typeof e.color === 'number') msg.c = e.color;
    if (typeof e.ms === 'number') msg.ms = Math.round(e.ms);
    if (typeof e.size === 'number') msg.sz = e.size;
    if (typeof e.arc === 'number') msg.arc = e.arc;
    return msg;
  }

  resolveRef(r) {
    const g = this.game;
    if (r.p) return r.p === this.session.myId ? g.player : g.getRemotePlayer(r.p);
    return { x: r.t[0], y: r.t[1] };
  }

  applyFx(rp, data) {
    const d = cleanFx(data, this.game.world);
    if (!d) return;
    const at = this.resolveRef(d.at), to = d.to ? this.resolveRef(d.to) : null;
    if (!at || (d.to && !to)) return;
    const me = this.game.player;
    if (Math.max(Math.abs(at.x - me.x), Math.abs(at.y - me.y)) > 40) return; // out of sight
    const o = { fromNet: true };
    if (to) o.to = to;
    if (d.c != null) o.color = d.c;
    if (d.ms != null) o.ms = d.ms;
    if (d.sz != null) o.size = d.sz;
    if (d.arc != null) o.arc = d.arc;
    this.game.spawnEffect(d.k, at, o);
  }

  applySplat(rp, data) {
    const d = cleanSplat(data);
    if (!d) return;
    const g = this.game;
    const mine = d.hid != null && g.pvp?.confirmHit?.(d.hid);
    if (d.none) return;
    if (d.hp != null) rp.hp = d.hp;
    if (d.mhp != null) rp.maxHp = d.mhp;
    // a hit of ours that we already drew ourselves (sent without an id, e.g. Last Rites, or whose answer came
    // after the prediction timed out) must not show twice
    if (!mine && d.src && d.src === this.session.myId) return;
    rp.hitsplats.push({ amount: d.a, type: d.t, time: performance.now() });
    if (rp.hitsplats.length > 6) rp.hitsplats.shift();
    rp.hpBarUntil = performance.now() + 6000;
    rp.lastAttackedTick = g.tickCount;
  }

  onDirect(from, kind, data) {
    const g = this.game;
    const rp = g.getRemotePlayer(from);
    if (!rp) return;
    switch (kind) {
      case 'hit': this.receiveHit(rp, data); break;
      case 'loot': this.receiveLoot(rp, data); break;
      case 'splat': this.applySplat(rp, data); break;
      case 'gadd': case 'gtake': case 'gqty': case 'gdel': case 'ggrant': case 'gdeny': case 'gsync': this.shared.onDirect(from, kind, data); break;
      case 'trade': this.trade.onMessage(from, data); break;
      case 'pm': {
        const text = isObj(data) ? cleanText(data.text, 80) : '';
        if (text) g.message(text, 'private', `From ${rp.name}`);
        break;
      }
      case 'x': this.emitCustom(from, rp, data); break;
      default: break;
    }
  }

  emitCustom(from, remote, d) {
    if (!isObj(d) || typeof d.type !== 'string') return;
    this.game.events.emit('net:message', { from, remote, type: d.type.slice(0, 40), data: cleanPayload(d.data) });
  }

  // ---- PvP ---------------------------------------------------------------------------------------------
  sendHit(peerId, payload) {
    const d = cleanHit(payload);
    if (!d) return false;
    return this.session.sendDirect(peerId, 'hit', d);
  }

  sendLoot(peerId, payload) {
    if (!isObj(payload)) return false;
    const d = cleanLoot(payload, this.game.world);
    return this.session.sendDirect(peerId, 'loot', d);
  }

  receiveHit(rp, data) {
    const g = this.game;
    const d = cleanHit(data);
    if (!d) return;
    if (typeof g.pvp?.receiveHit === 'function') {
      const hid = typeof d.hid === 'string' && d.hid.length <= 40 ? d.hid : null;
      this.curHid = hid; // picked up by the 'damage' listener -> the splat answers this hit
      try { g.pvp.receiveHit(rp, d); } catch (e) { console.error('[net] pvp.receiveHit threw', e); }
      if (hid && this.curHid === hid) this.session.sendDirect(rp.peerId, 'splat', { hid, none: true }); // no damage applied (dead...)
      this.curHid = null;
      return;
    }
    // fallback (no PvP system loaded): apply the hit authoritatively, only inside the Wilderness
    const p = g.player;
    if (p.dead || !g.world.isWilderness(p.x, p.y)) return;
    const type = ['ranged', 'magic'].includes(d.style) ? d.style : 'melee';
    g.applyDamage(p, d.damage, { source: rp, type });
  }

  receiveLoot(rp, data) {
    const g = this.game;
    const d = cleanLoot(data, g.world);
    if (!d || !d.items.length) return;
    if (typeof g.pvp?.receiveLoot === 'function') {
      try { g.pvp.receiveLoot(rp, d); } catch (e) { console.error('[net] pvp.receiveLoot threw', e); }
      return;
    }
    // fallback: drop the loot for us where the victim died
    const x = d.x ?? rp.x, y = d.y ?? rp.y;
    for (const it of d.items) g.spawnGroundItem(it.id, it.qty, x, y, { owner: g.player.name });
  }

  // ---- private messages ---------------------------------------------------------------------------------
  sendPrivateMessage(peerId, text) {
    const g = this.game;
    const rp = g.getRemotePlayer(peerId);
    const t = cleanText(text, 80);
    if (!rp || !t) return false;
    const ok = this.session.sendDirect(peerId, 'pm', { text: t });
    if (ok) g.message(t, 'private', `To ${rp.name}`);
    else g.message('That player is not online.');
    return ok;
  }

  async promptPrivateMessage(rp) {
    const text = await this.game.ui.promptText(`Enter message to send to ${rp.name}:`);
    if (text) this.sendPrivateMessage(rp.peerId, text);
  }
}

export function init(game) {
  const net = new NetManager(game);
  game.net = net.api;
  return net;
}
