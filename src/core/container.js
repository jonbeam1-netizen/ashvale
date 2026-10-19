// Item container (inventory, bank, shop stock...). Slots hold {id, qty} or null.

import { getItem } from './registry.js';
import { MAX_STACK } from './constants.js';

export class Container {
  /**
   * @param {number} size slot count
   * @param {object} opts {alwaysStack: bool (bank), onChange: fn(container)}
   */
  constructor(size, opts = {}) {
    this.size = size;
    this.slots = new Array(size).fill(null);
    this.alwaysStack = !!opts.alwaysStack;
    this.onChange = opts.onChange || null;
  }

  changed() { this.onChange?.(this); }

  isStackable(id) { return this.alwaysStack || !!getItem(id)?.stackable; }

  get(slot) { return this.slots[slot]; }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.qty; return n; }
  has(id, qty = 1) { return this.count(id) >= qty; }
  indexOf(id) { return this.slots.findIndex((s) => s && s.id === id); }
  freeSlots() { return this.slots.reduce((n, s) => n + (s ? 0 : 1), 0); }
  isFull() { return this.freeSlots() === 0; }
  isEmpty() { return this.freeSlots() === this.size; }
  items() { return this.slots.filter(Boolean); }

  /** How many of `id` could be added right now. */
  capacityFor(id) {
    if (this.isStackable(id)) {
      const i = this.indexOf(id);
      if (i >= 0) return MAX_STACK - this.slots[i].qty;
      return this.freeSlots() > 0 ? MAX_STACK : 0;
    }
    return this.freeSlots();
  }

  /** Adds items; returns the amount actually added. */
  add(id, qty = 1, { silent = false } = {}) {
    if (!getItem(id)) { console.warn(`[container] unknown item ${id}`); return 0; }
    if (qty <= 0) return 0;
    let added = 0;
    if (this.isStackable(id)) {
      const i = this.indexOf(id);
      if (i >= 0) {
        added = Math.min(qty, MAX_STACK - this.slots[i].qty);
        this.slots[i].qty += added;
      } else {
        const f = this.slots.indexOf(null);
        if (f >= 0) { added = Math.min(qty, MAX_STACK); this.slots[f] = { id, qty: added }; }
      }
    } else {
      for (let n = 0; n < qty; n++) {
        const f = this.slots.indexOf(null);
        if (f < 0) break;
        this.slots[f] = { id, qty: 1 };
        added++;
      }
    }
    if (added && !silent) this.changed();
    return added;
  }

  /** Removes up to qty of id; returns amount removed. */
  remove(id, qty = 1, { silent = false } = {}) {
    let removed = 0;
    for (let i = 0; i < this.size && removed < qty; i++) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const take = Math.min(s.qty, qty - removed);
      s.qty -= take;
      removed += take;
      if (s.qty <= 0) this.slots[i] = null;
    }
    if (removed && !silent) this.changed();
    return removed;
  }

  /** Remove from a specific slot; returns {id, qty} removed or null. */
  removeAt(slot, qty = Infinity) {
    const s = this.slots[slot];
    if (!s) return null;
    const take = Math.min(s.qty, qty);
    s.qty -= take;
    if (s.qty <= 0) this.slots[slot] = null;
    this.changed();
    return { id: s.id, qty: take };
  }

  set(slot, item) { this.slots[slot] = item ? { id: item.id, qty: item.qty } : null; this.changed(); }

  swap(a, b) {
    const t = this.slots[a]; this.slots[a] = this.slots[b]; this.slots[b] = t;
    this.changed();
  }

  /** Move slot `from` to position `to`, shifting others (bank insert mode). */
  insert(from, to) {
    const [it] = this.slots.splice(from, 1);
    this.slots.splice(to, 0, it);
    this.changed();
  }

  /** Bank-style compaction: remove gaps. */
  compact() {
    const items = this.slots.filter(Boolean);
    this.slots = items.concat(new Array(this.size - items.length).fill(null));
  }

  clear() { this.slots.fill(null); this.changed(); }

  toJSON() { return this.slots.map((s) => (s ? [s.id, s.qty] : 0)); }

  fromJSON(arr) {
    this.slots.fill(null);
    if (!Array.isArray(arr)) return;
    arr.slice(0, this.size).forEach((s, i) => {
      if (s && getItem(s[0])) this.slots[i] = { id: s[0], qty: s[1] };
    });
  }
}
