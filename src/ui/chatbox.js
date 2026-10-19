// Chatbox: message log with All / Game / Public filters and a public chat input line.
// The chatbox body is also used by dialogue / make-X / number prompts (see interfaces.js).

import { el, markup, escapeHtml } from './util.js';

const MAX_LINES = 150;

export class Chatbox {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    this.root = document.getElementById('chatbox');
    this.root.innerHTML = '';
    this.body = el('div', 'chat-body');
    this.log = el('div', 'chat-log');
    this.inputRow = el('div', 'chat-input-row');
    this.nameEl = el('span', 'chat-name');
    this.input = el('input', 'chat-input');
    this.input.maxLength = 80;
    this.input.spellcheck = false;
    this.inputRow.append(this.nameEl, this.input);
    this.body.append(this.log, this.inputRow);
    this.overlay = el('div', 'chat-overlay hidden'); // dialogue etc. render here
    this.tabs = el('div', 'chat-tabs');
    this.filter = 'all';
    for (const [id, label] of [['all', 'All'], ['game', 'Game'], ['public', 'Public']]) {
      const b = el('button', `chat-tab${id === 'all' ? ' active' : ''}`, label);
      b.onclick = () => { this.filter = id; [...this.tabs.children].forEach((c) => c.classList.toggle('active', c === b)); this.applyFilter(); };
      this.tabs.appendChild(b);
    }
    // phones: the chat folds to its last line; this button (and a tap on the folded line) toggles it
    this.foldBtn = el('button', 'chat-fold', '<span></span>');
    this.foldBtn.title = 'Show / hide chat';
    this.foldBtn.onclick = (e) => { e.stopPropagation(); this.ui.mobile?.toggleChat(); };
    this.root.addEventListener('click', () => { if (this.root.classList.contains('folded')) this.ui.mobile?.toggleChat(true); });
    this.root.append(this.body, this.overlay, this.tabs, this.foldBtn);

    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const t = this.input.value.trim();
        this.input.value = '';
        if (t) this.sendPublic(t);
        this.input.blur();
      } else if (e.key === 'Escape') { this.input.value = ''; this.input.blur(); }
    });
    // typing anywhere focuses the chat input
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target;
      if (tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement) return;
      if (this.ui.interfaces?.capturesKeys()) return;
      if (e.key.length === 1 && e.key !== ' ') this.input.focus();
    });

    this.game.events.on('chat', (m) => this.add(m));
    this.updateName();
  }

  updateName() { this.nameEl.textContent = `${this.game.player?.name || 'You'}:`; }

  sendPublic(text) {
    if (text.startsWith('::')) { this.game.events.emit('command', { text: text.slice(2), args: text.slice(2).split(/\s+/) }); return; }
    this.game.say(this.game.player, text);
  }

  add({ type = 'game', text, from }) {
    const line = el('div', `chat-line chat-${type}`);
    line.dataset.type = type;
    if (from) line.innerHTML = `<span class="chat-from">${escapeHtml(from)}:</span> <span class="chat-text">${markup(text)}</span>`;
    else line.innerHTML = markup(text);
    if (!this.visible(type)) line.style.display = 'none';
    const atBottom = this.log.scrollTop + this.log.clientHeight >= this.log.scrollHeight - 4;
    this.log.appendChild(line);
    while (this.log.children.length > MAX_LINES) this.log.firstChild.remove();
    if (atBottom) this.log.scrollTop = this.log.scrollHeight;
  }

  visible(type) {
    if (this.filter === 'all') return true;
    if (this.filter === 'public') return type === 'public';
    return type !== 'public';
  }

  applyFilter() {
    for (const l of this.log.children) l.style.display = this.visible(l.dataset.type) ? '' : 'none';
    this.log.scrollTop = this.log.scrollHeight;
  }

  /** Show an interface inside the chatbox (dialogue, make-X, prompts). Returns the container. */
  showOverlay() {
    this.overlay.innerHTML = '';
    this.overlay.classList.remove('hidden');
    this.body.classList.add('hidden');
    this.root.classList.add('has-overlay');
    this.ui.mobile?.onChatOverlay(true);
    return this.overlay;
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
    this.body.classList.remove('hidden');
    this.root.classList.remove('has-overlay');
    this.ui.mobile?.onChatOverlay(false);
    this.log.scrollTop = this.log.scrollHeight;
  }
}
