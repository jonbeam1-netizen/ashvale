// Production interfaces (agent C): a reusable icon grid (anvil, jewellery, tanning, sawmill,
// furniture building, leather crafting) with OSRS-style quantity buttons.

import { getItem } from '../core/registry.js';
import { getItemIcon } from '../ui/icons.js';
import { el, escapeHtml } from '../ui/util.js';

const CSS = `
.prod .iface-body { padding: 6px 8px 8px; }
.prod-sec { color: #ff981f; font-size: 13px; margin: 4px 2px 3px; }
.prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 3px; }
.prod-cell { position: relative; display: flex; flex-direction: column; align-items: center; padding: 3px 2px 2px; background: rgba(0,0,0,0.22);
  border: 1px solid #1a1611; border-radius: 3px; cursor: pointer; min-height: 62px; text-align: center; font-size: 12px; line-height: 1.15; }
.prod-cell:hover { background: rgba(255,255,255,0.09); }
.prod-cell img { width: 36px; height: 32px; pointer-events: none; }
.prod-cell .pn { color: #fff; }
.prod-cell .ps { color: #c8b890; font-size: 11px; font-weight: 400; }
.prod-cell.nomat .pn { color: #b0a890; }
.prod-cell.lowlvl .pn, .prod-cell.lowlvl .ps { color: #ff5040; }
.prod-cell.lowlvl img, .prod-cell.nomat img { opacity: 0.55; }
.prod-qty { display: flex; justify-content: center; align-items: center; gap: 2px; margin-top: 6px; }
.prod-qty .btn { min-width: 38px; }
.prod-tabs { display: flex; flex-wrap: wrap; gap: 2px; margin-bottom: 4px; }
.prod-tabs .btn { margin: 0; padding: 2px 6px; display: flex; align-items: center; gap: 3px; }
.prod-tabs .btn img { width: 27px; height: 24px; }
.prod-note { color: #c8b890; font-weight: 400; font-size: 12px; text-align: center; margin-top: 4px; }
`;

let injected = false;
function injectCss() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.id = 'production-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

let lastQty = 1;

/**
 * Open an icon grid.
 * opts: { game, title, width, tabs?: [{label, icon, key}], tab?, sections(tabKey) -> [{title, entries}],
 *         entry: { id (icon item), label, sub, title (tooltip), state: 'ok'|'nomat'|'lowlvl', data },
 *         onPick(entry, qty) (return true to keep window open), quantities: false to hide qty row, note }
 */
export function openGrid(opts) {
  injectCss();
  const game = opts.game;
  let tab = opts.tab ?? opts.tabs?.[0]?.key;
  let qty = lastQty;
  return game.ui.openInterface({
    id: opts.id || 'production', title: opts.title, className: 'prod', width: opts.width || 520,
    render: (body, close) => {
      const draw = () => {
        body.innerHTML = '';
        if (opts.tabs?.length > 1) {
          const tabs = el('div', 'prod-tabs');
          for (const t of opts.tabs) {
            const b = el('button', `btn${t.key === tab ? ' active' : ''}`, `${t.icon ? `<img alt="" src="${getItemIcon(t.icon)}">` : ''}${escapeHtml(t.label)}`);
            b.onclick = () => { tab = t.key; draw(); };
            tabs.appendChild(b);
          }
          body.appendChild(tabs);
        }
        for (const sec of opts.sections(tab)) {
          if (sec.title) body.appendChild(el('div', 'prod-sec', escapeHtml(sec.title)));
          const grid = el('div', 'prod-grid');
          for (const e of sec.entries) {
            const c = el('div', `prod-cell ${e.state || 'ok'}`, `<img alt="" src="${getItemIcon(e.id, e.iconQty || 1)}"><span class="pn">${escapeHtml(e.label || getItem(e.id)?.name || e.id)}</span>${e.sub ? `<span class="ps">${e.sub}</span>` : ''}`);
            if (e.title) c.title = e.title;
            c.onclick = () => { if (!opts.onPick(e, qty)) close(); };
            grid.appendChild(c);
          }
          body.appendChild(grid);
        }
        if (opts.note) body.appendChild(el('div', 'prod-note', opts.note));
        if (opts.quantities !== false) {
          const row = el('div', 'prod-qty', '<span class="muted">Quantity:</span>');
          for (const q of [1, 5, 10, 'X', 'All']) {
            const v = q === 'All' ? Infinity : q;
            const b = el('button', `btn${(q === 'X' ? ![1, 5, 10, Infinity].includes(qty) : qty === v) ? ' active' : ''}`, q === 'X' && ![1, 5, 10, Infinity].includes(qty) ? String(qty) : String(q));
            b.onclick = async () => {
              if (q === 'X') { const n = await game.ui.promptNumber('Enter amount:'); if (!n) return; qty = n; } else qty = v;
              lastQty = qty; draw();
            };
            row.appendChild(b);
          }
          body.appendChild(row);
        }
      };
      draw();
    },
  });
}

/** "2 x Bronze bar, 1 x Coal" style material list. */
export function materialText(list) {
  return list.map(({ id, qty }) => `${qty} x ${getItem(id)?.name || id}`).join(', ');
}
