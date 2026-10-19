// Drop-table rolling. Schema: see ARCHITECTURE.md "Drop tables".

import { getDropTable } from './registry.js';

function qtyOf(q) {
  if (Array.isArray(q)) return q[0] + Math.floor(Math.random() * (q[1] - q[0] + 1));
  return q ?? 1;
}

/** Returns [{id, qty}] for one kill. Nested tables: entry {table: 'other_table_id', weight}. */
export function rollDropTable(tableId, depth = 0) {
  const t = getDropTable(tableId);
  if (!t || depth > 4) return [];
  const out = [];
  for (const e of t.always) out.push({ id: e.id, qty: qtyOf(e.qty) });
  const total = t.main.reduce((a, e) => a + (e.weight ?? 1), 0);
  const nothingWeight = t.nothing ?? 0;
  for (let r = 0; r < t.rolls && total > 0; r++) {
    let roll = Math.random() * (total + nothingWeight);
    for (const e of t.main) {
      roll -= e.weight ?? 1;
      if (roll < 0) {
        if (e.table) out.push(...rollDropTable(e.table, depth + 1));
        else if (e.id) out.push({ id: e.id, qty: qtyOf(e.qty) });
        break;
      }
    }
  }
  for (const e of t.tertiary) if (Math.random() < (e.chance ?? 0)) out.push({ id: e.id, qty: qtyOf(e.qty) });
  return out;
}
