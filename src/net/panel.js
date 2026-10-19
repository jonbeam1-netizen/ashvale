// Multiplayer side-panel tab (replaces the Friends placeholder), trade-request toasts and net CSS.

import { el, escapeHtml } from '../ui/util.js';
import { getShapeIcon } from '../ui/icons.js';
import { MAX_PLAYERS } from './protocol.js';

const CSS = `
.net-root { display: flex; flex-direction: column; gap: 4px; }
.net-status { color: #fff; text-align: center; padding: 2px 4px; }
.net-error { color: #ff6b5b; background: rgba(0,0,0,0.35); border: 1px solid #5a2a1e; border-radius: 3px; padding: 4px 6px; font-weight: 400; }
.net-label { color: var(--text); margin-top: 4px; }
.net-joinrow { display: flex; align-items: center; }
.net-input { flex: 1; min-width: 0; background: rgba(0,0,0,0.4); border: 1px solid #1a1611; color: #ffff00; font: inherit; font-size: 15px; letter-spacing: 2px; padding: 3px 5px; text-transform: uppercase; user-select: text; }
.net-code { font-size: 30px; letter-spacing: 5px; color: #ffff00; text-align: center; padding: 4px 0; background: rgba(0,0,0,0.35); border: 1px solid #1a1611; border-radius: 3px; user-select: text; cursor: text; }
.net-row { display: flex; flex-wrap: wrap; justify-content: center; }
.net-row .btn, .net-root > .btn { font-size: 12px; }
.net-list { display: flex; flex-direction: column; gap: 1px; }
.net-player { display: flex; align-items: center; gap: 4px; padding: 2px 4px; background: rgba(0,0,0,0.25); border-radius: 2px; cursor: pointer; }
.net-player:hover { background: rgba(255,255,255,0.08); }
.net-player.me { cursor: default; }
.net-pname { color: #fff; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.net-plvl { color: #ffff00; font-size: 11px; }
.net-ping { font-size: 11px; min-width: 40px; text-align: right; }
.net-note { font-size: 11px; padding: 4px 2px; }
.net-toast { position: absolute; left: 10px; bottom: 196px; z-index: 45; pointer-events: auto; background: linear-gradient(180deg, var(--stone-1), var(--stone-2)); border: 2px solid var(--stone-dark); box-shadow: inset 0 0 0 1px var(--stone-light), 0 4px 14px rgba(0,0,0,0.6); border-radius: 4px; padding: 6px 8px; color: var(--text); }
.net-toast b { color: #fff; }
.net-toast + .net-toast { bottom: 262px; }
.net-trade .iface-body { padding: 6px 8px; }
.net-tr-cols { display: flex; gap: 8px; justify-content: center; }
.net-tr-col { display: flex; flex-direction: column; align-items: center; }
.net-tr-h { color: var(--text); margin-bottom: 3px; text-align: center; }
.net-tr-foot { font-size: 11px; margin-top: 2px; }
.net-grid { display: grid; grid-template-columns: repeat(4, 38px); grid-auto-rows: 34px; gap: 2px; padding: 3px; min-height: ${7 * 36}px; align-content: start; background: rgba(0,0,0,0.3); border: 1px solid #1a1611; border-radius: 3px; }
.net-slot.empty { cursor: default; }
.net-tr-status { text-align: center; color: var(--text); min-height: 18px; margin: 6px 0 2px; }
.net-tr-btns { display: flex; justify-content: center; gap: 30px; }
.net-tr-btns .btn { min-width: 90px; }
.net-tr-btns .btn:disabled { opacity: 0.5; }
.net-accept { color: #40ff40; }
.net-tr-list { min-width: 220px; align-items: stretch; background: rgba(0,0,0,0.3); border: 1px solid #1a1611; border-radius: 3px; padding: 4px; }
.net-tr-li { color: #ff9040; }
.chat-private .chat-text, .chat-private .chat-from { color: #00ffff; text-shadow: 1px 1px 0 #000; }
.chat-trade { color: #800080; }
`;

export class NetPanel {
  constructor(net) {
    this.net = net;
    this.game = net.game;
    this.root = null;
    this.toasts = new Map(); // peerId -> el
    const style = document.createElement('style');
    style.id = 'net-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    const t = this.game.ui.registerTab({
      id: 'friends', title: 'Multiplayer', icon: () => getShapeIcon('smile', '#e8c040'),
      render: (pane) => this.render(pane),
    });
    if (t?.btn) t.btn.title = 'Multiplayer';
    this.update();
  }

  render(pane) {
    if (!this.root || this.root.parentNode !== pane) this.build(pane);
    this.update();
  }

  build(pane) {
    pane.innerHTML = '';
    pane.dataset.custom = '1';
    const r = el('div', 'net-root');
    r.innerHTML = `
      <div class="tab-title">Multiplayer</div>
      <div class="net-status"></div>
      <div class="net-error hidden"></div>
      <div class="net-offline">
        <button class="btn net-host" style="width:calc(100% - 6px)">Host World</button>
        <div class="net-label">Join a friend's world:</div>
        <div class="net-joinrow"><input class="net-input" maxlength="80" placeholder="CODE" spellcheck="false" autocomplete="off"><button class="btn net-join">Join</button></div>
      </div>
      <div class="net-online hidden">
        <div class="net-label">World code:</div>
        <div class="net-code" title="Share this code with friends"></div>
        <div class="net-row"><button class="btn net-copylink">Copy invite link</button><button class="btn net-copycode">Copy code</button></div>
      </div>
      <div class="net-players hidden"><div class="net-label">Players <span class="net-count muted"></span></div><div class="net-list"></div></div>
      <button class="btn danger net-leave hidden">Leave world</button>
      <div class="muted net-note">Everyone shares the same map and keeps their own save. Monsters and resources are local to each player; other players, chat, trading and Wilderness PvP are shared.</div>`;
    pane.appendChild(r);
    this.root = r;
    const q = (s) => r.querySelector(s);
    this.els = {
      status: q('.net-status'), error: q('.net-error'), offline: q('.net-offline'), online: q('.net-online'),
      code: q('.net-code'), players: q('.net-players'), list: q('.net-list'), count: q('.net-count'),
      leave: q('.net-leave'), host: q('.net-host'), join: q('.net-join'), input: q('.net-input'),
    };
    const { input } = this.els;
    const doJoin = () => { const v = input.value; if (v.trim()) this.net.join(v); };
    for (const evt of ['keydown', 'keyup', 'keypress']) input.addEventListener(evt, (e) => { e.stopPropagation(); if (evt === 'keydown' && e.key === 'Enter') doJoin(); });
    this.els.host.onclick = () => this.net.host();
    this.els.join.onclick = doJoin;
    this.els.leave.onclick = () => this.net.leave();
    q('.net-copylink').onclick = () => this.copy(this.net.inviteLink(), 'Invite link copied to the clipboard.');
    q('.net-copycode').onclick = () => this.copy(this.net.session.code, 'World code copied to the clipboard.');
  }

  async copy(text, okMsg) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.game.message(okMsg);
    } catch {
      this.game.message(`Copy this: ${text}`);
    }
  }

  update() {
    if (!this.root || !this.els) return;
    const s = this.net.session, E = this.els;
    const st = s.status;
    const busy = st === 'starting' || st === 'connecting';
    const online = st === 'hosting' || st === 'joined';
    E.status.textContent = {
      offline: 'Not connected. Host a world or join a friend with their code.',
      starting: 'Creating world...',
      connecting: `Connecting to world ${s.code || ''}...`,
      hosting: 'Hosting! Share the code or invite link with friends.',
      joined: `Connected to world ${s.code || ''}.`,
    }[st] || st;
    const err = s.error;
    E.error.classList.toggle('hidden', !err);
    if (err) E.error.textContent = err;
    E.offline.classList.toggle('hidden', online);
    E.host.disabled = busy; E.join.disabled = busy; E.input.disabled = busy;
    E.online.classList.toggle('hidden', !online);
    if (online && E.code.textContent !== s.code) E.code.textContent = s.code;
    E.leave.classList.toggle('hidden', !(online || busy));
    E.leave.textContent = busy ? 'Cancel' : 'Leave world';
    E.players.classList.toggle('hidden', !online);
    if (online) this.renderPlayers();
  }

  pingText(ms) {
    if (ms == null) return '<span class="muted">...</span>';
    const c = ms < 120 ? '#40ff40' : ms < 250 ? '#ffff00' : '#ff5040';
    return `<span style="color:${c}">${ms}ms</span>`;
  }

  renderPlayers() {
    const g = this.game, s = this.net.session, E = this.els;
    E.list.innerHTML = '';
    const me = g.player;
    const myPing = s.isHost ? null : s.myPing;
    const row = (name, lvl, pingHtml, tag, isMe, rp) => {
      const r = el('div', `net-player${isMe ? ' me' : ''}`,
        `<span class="net-pname">${escapeHtml(name)}${tag ? ` <span class="muted">${tag}</span>` : ''}</span><span class="net-plvl">lvl ${lvl}</span><span class="net-ping">${pingHtml}</span>`);
      if (rp) {
        r.title = 'Click for options';
        const menu = (e) => {
          e.preventDefault();
          g.ui.menu.show(e.clientX, e.clientY, [
            { option: 'Message', target: rp.name, targetColor: '#ffffff', action: () => this.net.promptPrivateMessage(rp) },
            { option: 'Cancel', action: () => {} },
          ]);
        };
        r.onclick = menu; r.oncontextmenu = menu;
      }
      E.list.appendChild(r);
    };
    row(me.name, me.combatLevel, s.isHost ? '<span class="muted">host</span>' : this.pingText(myPing), '(you)', true, null);
    const rps = [...g.remotePlayers.values()];
    for (const rp of rps) {
      const isHost = rp.peerId === s.hostId;
      const ping = s.isHost ? s.pings.get(rp.peerId) : isHost ? myPing : s.pings.get(rp.peerId);
      row(rp.name, rp.combatLevel, this.pingText(ping), isHost ? '(host)' : '', false, rp);
    }
    E.count.textContent = `(${rps.length + 1}/${MAX_PLAYERS})`;
  }

  // ---- toasts ----------------------------------------------------------------------------------
  showTradeToast(peer, name) {
    this.dismissToast(peer);
    const t = el('div', 'net-toast', `<div><b>${escapeHtml(name)}</b> wishes to trade with you.</div>`);
    const row = el('div', 'net-row');
    const a = el('button', 'btn net-accept', 'Accept');
    const d = el('button', 'btn danger', 'Decline');
    a.onclick = () => { this.dismissToast(peer); this.net.trade.acceptRequest(peer); };
    d.onclick = () => { this.dismissToast(peer); this.net.trade.declineRequest(peer); };
    row.append(a, d);
    t.appendChild(row);
    t.addEventListener('mousedown', (e) => e.stopPropagation());
    document.getElementById('game-root').appendChild(t);
    const timer = setTimeout(() => this.dismissToast(peer), 30000);
    this.toasts.set(peer, { el: t, timer });
  }

  dismissToast(peer) {
    const t = this.toasts.get(peer);
    if (!t) return;
    clearTimeout(t.timer);
    t.el.remove();
    this.toasts.delete(peer);
  }

  clearToasts() { for (const p of [...this.toasts.keys()]) this.dismissToast(p); }
}

