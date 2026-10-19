// PeerJS transport: host/join by code, star topology (host relays), heartbeats, timeouts.
//
// Wire messages (JSON objects, `t` = type):
//   joiner -> host : hello{v, snap} · snap{s} · bc{kind, data} · dm{to, kind, data} · ping{ts} · pong{ts} · bye
//   host -> joiner : welcome{v, you, host, code, players:[{id, snap}]} · reject{reason, v} · join{id, snap}
//                    leave{id, reason} · snap{from, s} · bc{from, kind, data} · dm{from, kind, data}
//                    ping{ts} · pong{ts} · roster{players:[{id, ping}]} · end{reason}
// The host always stamps `from` itself (joiners can't spoof senders). Receivers validate every payload.

import {
  PROTOCOL_VERSION, PEER_PREFIX, MAX_PLAYERS, HEARTBEAT_MS, TIMEOUT_MS, CONNECT_TIMEOUT_MS, NAT_HINT,
  makeCode, randomId, normalizeCode, isObj, cleanId, int, cleanText,
} from './protocol.js';

const PEER_OPTS = { debug: 1 };
const CONN_OPTS = { reliable: true, serialization: 'json' };
const RATE_SOFT = 60;    // messages/second per connection before we start ignoring
const RATE_HARD = 400;   // messages/second per connection before we kick
const MAX_RELAY = 16000; // max JSON length of a relayed payload
const SIGNAL_ERRORS = ['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'];

function describeError(err) {
  switch (err?.type) {
    case 'browser-incompatible': return 'Your browser does not support peer-to-peer (WebRTC) connections.';
    case 'network': case 'server-error': case 'socket-error': case 'socket-closed': case 'disconnected':
      return 'Could not reach the matchmaking server. Check your internet connection and try again.';
    case 'unavailable-id': return 'Could not reserve a world code. Please try again.';
    case 'webrtc': return `Peer-to-peer connection error. ${NAT_HINT}`;
    default: return `Connection error (${err?.type || err?.message || 'unknown'}).`;
  }
}

const jsonLen = (v) => { try { return JSON.stringify(v ?? null).length; } catch { return Infinity; } };

export class Session {
  /**
   * @param {object} h callbacks: status(), localSnap(), cleanSnap(raw), playerJoin(id, snap), playerLeave(id, reason),
   *   snapshot(id, snap), broadcast(id, kind, data), direct(id, kind, data), roster(), ended(reason)
   */
  constructor(h) {
    this.h = h;
    this.status = 'offline'; // offline | starting | connecting | hosting | joined
    this.error = null;
    this.reset();
  }

  reset() {
    clearInterval(this._hb); this._hb = null;
    clearTimeout(this._connectTimer); this._connectTimer = null;
    this.peer = null;
    this.role = null;          // 'host' | 'joiner' | null
    this.code = null;
    this.myId = null;
    this.hostId = null;
    this.links = new Map();    // host: peerId -> {id, conn, joined, lastSeen, ping, rate, snap}
    this.hostLink = null;      // joiner: {conn, lastSeen}
    this.pings = new Map();    // peerId -> ms (roster)
    this.myPing = null;
  }

  get connected() { return this.status === 'hosting' || this.status === 'joined'; }
  get isHost() { return this.role === 'host'; }

  setStatus(st, error = null) {
    this.status = st;
    this.error = error;
    this.h.status();
  }

  // ---- host -------------------------------------------------------------------------------------
  host() {
    if (this.role) return;
    if (typeof Peer !== 'function') { this.setStatus('offline', 'The networking library failed to load (check your connection or ad blocker), then reload.'); return; }
    this.role = 'host';
    this.setStatus('starting');
    const attempt = (n) => {
      const code = makeCode();
      const peer = new Peer(PEER_PREFIX + code, PEER_OPTS);
      this.peer = peer;
      peer.on('open', (id) => {
        if (this.peer !== peer) return;
        this.myId = id; this.hostId = id; this.code = code;
        this.setStatus('hosting');
        this.startHeartbeat();
      });
      peer.on('connection', (conn) => { if (this.peer === peer) this.acceptConn(conn); });
      peer.on('disconnected', () => {
        // lost the signalling server: existing peer links keep working; try to get new joins working again
        if (this.peer !== peer || this.status !== 'hosting') return;
        setTimeout(() => { if (this.peer === peer && !peer.destroyed && peer.disconnected) { try { peer.reconnect(); } catch { /* ignore */ } } }, 2000);
      });
      peer.on('error', (err) => {
        if (this.peer !== peer) return;
        if (err.type === 'unavailable-id' && n < 4 && this.status === 'starting') { try { peer.destroy(); } catch { /* ignore */ } attempt(n + 1); return; }
        if (this.status === 'hosting' && (SIGNAL_ERRORS.includes(err.type) || err.type === 'peer-unavailable')) {
          console.warn('[net] signalling problem while hosting', err.type);
          return;
        }
        this.fail(describeError(err));
      });
    };
    attempt(0);
  }

  acceptConn(conn) {
    const id = cleanId(conn.peer);
    if (!id || this.links.has(id) || !id.startsWith(PEER_PREFIX)) { try { conn.close(); } catch { /* ignore */ } return; }
    const link = { id, conn, joined: false, lastSeen: Date.now(), ping: null, rate: { t: 0, n: 0 }, snap: null };
    this.links.set(id, link);
    const helloTimer = setTimeout(() => { if (!link.joined) this.dropLink(id, null); }, 15000);
    conn.on('data', (d) => { try { this.onHostData(link, d); } catch (e) { console.error('[net] bad message', e); } });
    conn.on('close', () => { clearTimeout(helloTimer); this.dropLink(id, 'left'); });
    conn.on('error', (e) => console.warn('[net] connection error', e?.type || e));
  }

  joinedLinks() { return [...this.links.values()].filter((l) => l.joined); }

  rateOk(link) {
    const s = Math.floor(Date.now() / 1000);
    if (link.rate.t !== s) { link.rate.t = s; link.rate.n = 0; }
    link.rate.n++;
    if (link.rate.n > RATE_HARD) { this.dropLink(link.id, 'was disconnected (flooding)'); return false; }
    return link.rate.n <= RATE_SOFT;
  }

  onHostData(link, d) {
    if (this.links.get(link.id) !== link || !isObj(d) || typeof d.t !== 'string') return;
    if (!this.rateOk(link)) return;
    link.lastSeen = Date.now();
    if (!link.joined) {
      if (d.t !== 'hello') return;
      if (d.v !== PROTOCOL_VERSION) {
        this.sendRaw(link.conn, { t: 'reject', reason: 'version', v: PROTOCOL_VERSION });
        setTimeout(() => this.dropLink(link.id, null), 800);
        return;
      }
      if (this.joinedLinks().length + 1 >= MAX_PLAYERS) {
        this.sendRaw(link.conn, { t: 'reject', reason: 'full' });
        setTimeout(() => this.dropLink(link.id, null), 800);
        return;
      }
      const snap = this.h.cleanSnap(d.snap);
      if (!snap) { this.sendRaw(link.conn, { t: 'reject', reason: 'bad' }); setTimeout(() => this.dropLink(link.id, null), 800); return; }
      link.joined = true;
      link.snap = snap;
      const players = [{ id: this.myId, snap: this.h.localSnap() }];
      for (const l of this.joinedLinks()) if (l !== link) players.push({ id: l.id, snap: l.snap });
      this.sendRaw(link.conn, { t: 'welcome', v: PROTOCOL_VERSION, you: link.id, host: this.myId, code: this.code, players });
      this.relay(link.id, { t: 'join', id: link.id, snap });
      this.h.playerJoin(link.id, snap);
      this.h.roster();
      return;
    }
    const kind = typeof d.kind === 'string' && d.kind.length <= 32 ? d.kind : null;
    switch (d.t) {
      case 'snap': {
        const s = this.h.cleanSnap(d.s);
        if (!s) return;
        link.snap = { ...link.snap, ...s };
        this.relay(link.id, { t: 'snap', from: link.id, s });
        this.h.snapshot(link.id, s);
        break;
      }
      case 'bc':
        if (!kind || jsonLen(d.data) > MAX_RELAY) return;
        this.relay(link.id, { t: 'bc', from: link.id, kind, data: d.data });
        this.h.broadcast(link.id, kind, d.data);
        break;
      case 'dm': {
        if (!kind || jsonLen(d.data) > MAX_RELAY) return;
        if (d.to === this.myId) { this.h.direct(link.id, kind, d.data); return; }
        const to = this.links.get(d.to);
        if (to?.joined) this.sendRaw(to.conn, { t: 'dm', from: link.id, kind, data: d.data });
        break;
      }
      case 'ping': this.sendRaw(link.conn, { t: 'pong', ts: d.ts }); break;
      case 'pong': { const ts = int(d.ts, 0, 1e15); if (ts != null) link.ping = Math.max(0, Date.now() - ts); break; }
      case 'bye': this.dropLink(link.id, 'left'); break;
      default: break;
    }
  }

  dropLink(id, reason) {
    const link = this.links.get(id);
    if (!link) return;
    this.links.delete(id);
    try { link.conn.close(); } catch { /* ignore */ }
    if (link.joined) {
      this.relay(id, { t: 'leave', id, reason });
      this.pings.delete(id);
      this.h.playerLeave(id, reason);
      this.h.roster();
    }
  }

  /** Host: send to every joined link except `exceptId`. */
  relay(exceptId, msg) {
    for (const l of this.links.values()) if (l.joined && l.id !== exceptId) this.sendRaw(l.conn, msg);
  }

  // ---- joiner -----------------------------------------------------------------------------------
  join(codeInput) {
    if (this.role) return;
    const code = normalizeCode(codeInput);
    if (!code) { this.setStatus('offline', 'That is not a valid world code (6 letters and numbers).'); return; }
    if (typeof Peer !== 'function') { this.setStatus('offline', 'The networking library failed to load (check your connection or ad blocker), then reload.'); return; }
    this.role = 'joiner';
    this.code = code;
    this.hostId = PEER_PREFIX + code;
    this.setStatus('connecting');
    const peer = new Peer(`${PEER_PREFIX}p-${randomId(10)}`, PEER_OPTS);
    this.peer = peer;
    this._connectTimer = setTimeout(() => {
      if (this.peer === peer && this.status === 'connecting') this.fail(`Could not connect to world ${code}. ${NAT_HINT}`);
    }, CONNECT_TIMEOUT_MS);
    peer.on('open', (id) => {
      if (this.peer !== peer) return;
      this.myId = id;
      const conn = peer.connect(this.hostId, CONN_OPTS);
      this.hostLink = { conn, lastSeen: Date.now() };
      conn.on('open', () => { if (this.peer === peer) this.sendRaw(conn, { t: 'hello', v: PROTOCOL_VERSION, snap: this.h.localSnap() }); });
      conn.on('data', (d) => { if (this.peer === peer) { try { this.onJoinerData(d); } catch (e) { console.error('[net] bad message', e); } } });
      conn.on('close', () => {
        if (this.peer !== peer) return;
        this.end(this.status === 'joined' ? 'The host has left; the world session has ended.' : `The connection to world ${code} was closed.`);
      });
      conn.on('error', (e) => console.warn('[net] connection error', e?.type || e));
      conn.on('iceStateChanged', (st) => {
        if (this.peer === peer && st === 'failed') this.fail(`The peer-to-peer connection failed. ${NAT_HINT}`);
      });
    });
    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (this.status === 'joined' && SIGNAL_ERRORS.includes(err.type)) return; // the data link to the host still works
      if (err.type === 'peer-unavailable') { this.fail(`No world found with code ${code}. Check the code - the host may have left.`); return; }
      this.fail(describeError(err));
    });
  }

  onJoinerData(d) {
    if (!isObj(d) || typeof d.t !== 'string' || !this.hostLink) return;
    this.hostLink.lastSeen = Date.now();
    if (d.t === 'welcome') {
      if (this.status !== 'connecting') return;
      clearTimeout(this._connectTimer);
      if (d.v !== PROTOCOL_VERSION) { this.fail(this.versionMsg(d.v)); return; }
      this.setStatus('joined');
      this.startHeartbeat();
      if (Array.isArray(d.players)) {
        for (const p of d.players.slice(0, MAX_PLAYERS)) {
          const id = cleanId(p?.id), s = this.h.cleanSnap(p?.snap);
          if (id && s && id !== this.myId) this.h.playerJoin(id, s, true);
        }
      }
      this.h.roster();
      return;
    }
    if (d.t === 'reject') {
      if (d.reason === 'version') this.fail(this.versionMsg(d.v));
      else if (d.reason === 'full') this.fail(`That world is full (${MAX_PLAYERS} players).`);
      else this.fail('The host refused the connection.');
      return;
    }
    if (d.t === 'end') { this.end(cleanText(d.reason, 120) || 'The host has closed the world.'); return; }
    if (this.status !== 'joined') return;
    const from = cleanId(d.from);
    const kind = typeof d.kind === 'string' && d.kind.length <= 32 ? d.kind : null;
    switch (d.t) {
      case 'join': { const id = cleanId(d.id), s = this.h.cleanSnap(d.snap); if (id && s && id !== this.myId) { this.h.playerJoin(id, s); this.h.roster(); } break; }
      case 'leave': { const id = cleanId(d.id); if (id) { this.pings.delete(id); this.h.playerLeave(id, cleanText(d.reason, 60) || 'left'); this.h.roster(); } break; }
      case 'snap': { const s = this.h.cleanSnap(d.s); if (from && s && from !== this.myId) this.h.snapshot(from, s); break; }
      case 'bc': if (from && kind && from !== this.myId) this.h.broadcast(from, kind, d.data); break;
      case 'dm': if (from && kind && from !== this.myId) this.h.direct(from, kind, d.data); break;
      case 'ping': this.sendRaw(this.hostLink.conn, { t: 'pong', ts: d.ts }); break;
      case 'pong': { const ts = int(d.ts, 0, 1e15); if (ts != null) this.myPing = Math.max(0, Date.now() - ts); break; }
      case 'roster':
        if (Array.isArray(d.players)) {
          for (const p of d.players.slice(0, MAX_PLAYERS)) { const id = cleanId(p?.id); if (id) this.pings.set(id, int(p.ping, 0, 99999)); }
          this.h.roster();
        }
        break;
      default: break;
    }
  }

  versionMsg(v) {
    return `Version mismatch: the host runs a different version of Ashvale (network v${int(v, 0, 9999, '?')}, yours v${PROTOCOL_VERSION}). Both players should reload the page to get the latest version.`;
  }

  // ---- heartbeat ----------------------------------------------------------------------------------
  startHeartbeat() {
    clearInterval(this._hb);
    this._hb = setInterval(() => { try { this.heartbeat(); } catch (e) { console.error('[net] heartbeat', e); } }, HEARTBEAT_MS);
  }

  heartbeat() {
    const now = Date.now();
    if (this.role === 'host' && this.status === 'hosting') {
      for (const l of [...this.links.values()]) {
        if (now - l.lastSeen > TIMEOUT_MS) { this.dropLink(l.id, 'timed out'); continue; }
        if (l.joined) this.sendRaw(l.conn, { t: 'ping', ts: now });
      }
      const players = [{ id: this.myId, ping: 0 }, ...this.joinedLinks().map((l) => ({ id: l.id, ping: l.ping }))];
      for (const p of players) this.pings.set(p.id, p.ping);
      this.relay(null, { t: 'roster', players });
      this.h.roster();
    } else if (this.role === 'joiner' && this.status === 'joined') {
      if (now - this.hostLink.lastSeen > TIMEOUT_MS) { this.end('Lost connection to the host (timed out).'); return; }
      this.sendRaw(this.hostLink.conn, { t: 'ping', ts: now });
    }
  }

  // ---- sending ------------------------------------------------------------------------------------
  sendRaw(conn, msg) {
    if (!conn || !conn.open) return false;
    try { conn.send(msg); return true; } catch (e) { console.warn('[net] send failed', e); return false; }
  }

  /** Send to one peer (host relays for joiners). */
  sendDirect(to, kind, data) {
    if (!this.connected || !to || to === this.myId) return false;
    if (this.role === 'host') {
      const l = this.links.get(to);
      return l?.joined ? this.sendRaw(l.conn, { t: 'dm', from: this.myId, kind, data }) : false;
    }
    return this.sendRaw(this.hostLink?.conn, { t: 'dm', to, kind, data });
  }

  /** Send to everyone else. */
  broadcast(kind, data) {
    if (!this.connected) return false;
    if (this.role === 'host') { this.relay(null, { t: 'bc', from: this.myId, kind, data }); return true; }
    return this.sendRaw(this.hostLink?.conn, { t: 'bc', kind, data });
  }

  sendSnapshot(s) {
    if (!this.connected) return;
    if (this.role === 'host') this.relay(null, { t: 'snap', from: this.myId, s });
    else this.sendRaw(this.hostLink?.conn, { t: 'snap', s });
  }

  // ---- teardown -----------------------------------------------------------------------------------
  /** Graceful leave (tells the others). */
  leave() {
    if (!this.role) return;
    if (this.role === 'host') this.relay(null, { t: 'end', reason: 'The host has closed the world.' });
    else if (this.hostLink) this.sendRaw(this.hostLink.conn, { t: 'bye' });
    this.end(null);
  }

  fail(msg) { this.end(msg); }

  /** Tear down the session; `reason` is shown as an error/notice (null for a voluntary leave). */
  end(reason) {
    if (!this.role && !this.peer) { if (reason) this.setStatus('offline', reason); return; }
    const peer = this.peer;
    const links = [...this.links.values()];
    const hostLink = this.hostLink;
    this.reset();
    this.h.ended(reason);
    setTimeout(() => {
      for (const l of links) { try { l.conn.close(); } catch { /* ignore */ } }
      try { hostLink?.conn.close(); } catch { /* ignore */ }
      try { peer?.destroy(); } catch { /* ignore */ }
    }, 400);
    this.setStatus('offline', reason);
  }
}
