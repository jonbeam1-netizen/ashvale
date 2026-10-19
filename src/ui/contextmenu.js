// OSRS-style right-click menu: "Choose Option" header, white option text + coloured target.

import { el, escapeHtml } from './util.js';

export class ContextMenu {
  constructor(ui) {
    this.ui = ui;
    this.root = document.getElementById('context-menu');
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.addEventListener('mouseleave', () => this.hide());
    window.addEventListener('mousedown', (e) => { if (!this.root.contains(e.target)) this.hide(); }, true);
    // touch: a new touch outside the menu closes it (the 3D view swallows its touches, so no mousedown comes)
    window.addEventListener('touchstart', (e) => { if (this.open && !this.root.contains(e.target)) this.hide(); }, { capture: true, passive: true });
  }

  get open() { return this.root.style.display === 'block'; }

  /** entries: [{option, target?, targetColor?, targetHtml?, action}] */
  show(x, y, entries) {
    if (!entries.length) return;
    // touch screens have no "move away to close": always end with Cancel
    if (document.documentElement.classList.contains('touch') && entries[entries.length - 1]?.option !== 'Cancel') entries = [...entries, { option: 'Cancel' }];
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
    this.root.scrollTop = 0;
    const r = this.root.getBoundingClientRect();
    // touch screens: bigger rows (CSS) and the menu opens just above the finger so the options stay visible
    const touch = document.documentElement.classList.contains('touch');
    const m = touch ? 6 : 2;
    const left = Math.max(m, Math.min(window.innerWidth - r.width - m, x - r.width / 2));
    const top = Math.max(m, Math.min(window.innerHeight - r.height - m, touch ? y - r.height * 0.35 : y - 4));
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
  }

  hide() { this.root.style.display = 'none'; }
}
