// Worn equipment (11 slots). Equip/unequip rules live in Game.equip / Game.unequip.

import { EQUIP_SLOTS, emptyBonuses, BONUS_KEYS } from './constants.js';
import { getItem } from './registry.js';

export class Equipment {
  constructor(onChange) {
    this.slots = {};
    for (const s of EQUIP_SLOTS) this.slots[s] = null; // {id, qty}
    this.onChange = onChange || null;
  }

  get(slot) { return this.slots[slot]; }
  getDef(slot) { const s = this.slots[slot]; return s ? getItem(s.id) : null; }
  weapon() { return this.getDef('weapon'); }

  set(slot, item) {
    this.slots[slot] = item ? { id: item.id, qty: item.qty ?? 1 } : null;
    this.onChange?.(this);
  }

  has(id) { return EQUIP_SLOTS.some((s) => this.slots[s]?.id === id); }

  /** Sum of all worn bonuses. */
  bonuses() {
    const b = emptyBonuses();
    for (const s of EQUIP_SLOTS) {
      const def = this.getDef(s);
      if (!def?.bonuses) continue;
      for (const k of BONUS_KEYS) b[k] += def.bonuses[k] || 0;
    }
    return b;
  }

  attackSpeed() { return this.weapon()?.attackSpeed ?? 4; }
  weaponType() { return this.weapon()?.weaponType ?? 'unarmed'; }

  /** Ids only, used for appearance snapshots / networking. */
  ids() { const o = {}; for (const s of EQUIP_SLOTS) if (this.slots[s]) o[s] = this.slots[s].id; return o; }

  toJSON() { const o = {}; for (const s of EQUIP_SLOTS) if (this.slots[s]) o[s] = [this.slots[s].id, this.slots[s].qty]; return o; }
  fromJSON(o) {
    for (const s of EQUIP_SLOTS) this.slots[s] = null;
    if (!o) return;
    for (const s of EQUIP_SLOTS) if (o[s] && getItem(o[s][0])) this.slots[s] = { id: o[s][0], qty: o[s][1] };
  }
}
