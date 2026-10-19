// OSRS-style right-click menu: "Choose Option" header, white option text + coloured target.

import { el, escapeHtml } from './util.js';

export class ContextMenu {
  constructor(ui) {
    this.ui = ui;
    this.root = document.getElementById('context-menu');
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.addEventListener('mouseleave', () => this.hide());
    window.addEventListener('mousedown', (e) => { if (!this.root.contains(e.target)) this.hide(); }, true);
  }

  get open() { return this.root.style.display === 'block'; }

  /** entries: [{option, target?, targetColor?, targetHtml?, action}] */
  show(x, y, entries) {
    if (!entries.length) return;
    this.root.innerHTML = '';
    this.root.appendChild(el('div', 'cm-head', 'Choose Option'));
    for (const en of entries) {
      const row = el('div', 'cm-row');
      const tgt = en.targetHtml ?? (en.target ? `<span style="color:${en.targetColor || '#ffff00'}">${escapeHtml(en.target)}</span>` : '');
      row.innerHTML = `<span class="cm-opt">${escapeHtml(en.option)}</span>${tgt ? ' ' + tgt : ''}`;
      row.addEventListener('mouseup', (e) => {
        if (e.button > 2) return;
        this.hide();
        try { en.action?.(); } catch (err) { console.error('[menu] action failed', err); }
      });
      this.root.appendChild(row);
    }
    this.root.style.display = 'block';
    const r = this.root.getBoundingClientRect();
    const left = Math.max(2, Math.min(window.innerWidth - r.width - 2, x - r.width / 2));
    const top = Math.max(2, Math.min(window.innerHeight - r.height - 2, y - 4));
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
  }

  hide() { this.root.style.display = 'none'; }
}
