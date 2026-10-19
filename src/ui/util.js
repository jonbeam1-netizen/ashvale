// Small DOM helpers shared by UI modules.

export function el(tag, cls = '', html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Escape text but keep <col=rrggbb>...</col> colour markup. */
export function markup(text) {
  return escapeHtml(text)
    .replace(/&lt;col=([0-9a-fA-F]{6})&gt;/g, '<span style="color:#$1">')
    .replace(/&lt;\/col&gt;/g, '</span>');
}

/** OSRS-style stack size text + colour class. */
export function formatQty(n) {
  if (n >= 10_000_000) return { text: `${Math.floor(n / 1_000_000)}M`, cls: 'qty-m' };
  if (n >= 100_000) return { text: `${Math.floor(n / 1000)}K`, cls: 'qty-k' };
  return { text: String(n), cls: 'qty' };
}

export const fmt = (n) => Math.floor(n).toLocaleString('en-US');

/** Colour for "(level-N)" based on the level difference. */
export function levelColor(other, mine) {
  const d = other - mine;
  if (d > 9) return '#ff0000';
  if (d > 6) return '#ff3000';
  if (d > 3) return '#ff7000';
  if (d > 0) return '#ffb000';
  if (d === 0) return '#ffff00';
  if (d > -4) return '#c0ff00';
  if (d > -7) return '#80ff00';
  if (d > -10) return '#40ff00';
  return '#00ff00';
}
