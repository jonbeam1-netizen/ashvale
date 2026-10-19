// Interaction handler registry: maps (kind, option, ids) -> handler.
//
// Handlers receive a ctx object and may return `false` to mean "not handled", in which case
// the next matching handler is tried (more specific registrations first, then later ones first).
// See ARCHITECTURE.md "Interactions" for every kind and ctx field.

const norm = (s) => String(s ?? '*').toLowerCase();
const toSet = (ids) => (ids == null || ids === '*' ? null : new Set(Array.isArray(ids) ? ids : [ids]));

export class Interactions {
  constructor(game) {
    this.game = game;
    this.map = new Map();
    this.counter = 0;
  }

  /**
   * Generic registration.
   * @param {string} kind object|npc|item|equipment|ground|player|itemOnItem|itemOnObject|itemOnNpc|itemOnPlayer|itemOnGround|spell|spellOnNpc|spellOnPlayer|spellOnItem|spellOnObject|spellOnGround
   * @param {string} option menu option text ('*' for any); case-insensitive
   * @param {string|string[]|'*'} idsA primary ids (object/npc/item/spell id)
   * @param {string|string[]|'*'|null} idsB secondary ids (for X-on-Y kinds)
   * @param {(ctx)=>any} fn
   * @param {object} opts { range: number | (ctx)=>number, walk: bool }
   * @returns {() => void} unregister function
   */
  register(kind, option, idsA, idsB, fn, opts = {}) {
    const key = `${kind}|${norm(option)}`;
    if (!this.map.has(key)) this.map.set(key, []);
    const entry = { a: toSet(idsA), b: toSet(idsB), fn, opts, order: this.counter++ };
    const list = this.map.get(key);
    list.push(entry);
    const spec = (e) => (e.a ? 2 : 0) + (e.b ? 1 : 0);
    list.sort((x, y) => spec(y) - spec(x) || y.order - x.order);
    return () => { const i = list.indexOf(entry); if (i >= 0) list.splice(i, 1); };
  }

  // ---- convenience wrappers --------------------------------------------------------------
  onObject(option, ids, fn, opts) { return this.register('object', option, ids, null, fn, opts); }
  onNpc(option, ids, fn, opts) { return this.register('npc', option, ids, null, fn, opts); }
  onItem(option, ids, fn, opts) { return this.register('item', option, ids, null, fn, opts); }
  onEquipment(option, ids, fn, opts) { return this.register('equipment', option, ids, null, fn, opts); }
  onGroundItem(option, ids, fn, opts) { return this.register('ground', option, ids, null, fn, opts); }
  onPlayer(option, fn, opts) { return this.register('player', option, '*', null, fn, opts); }
  onItemOnItem(idsA, idsB, fn) {
    const u1 = this.register('itemOnItem', 'use', idsA, idsB, fn);
    const u2 = this.register('itemOnItem', 'use', idsB, idsA, (ctx) => fn({ ...ctx, item: ctx.other, slot: ctx.otherSlot, other: ctx.item, otherSlot: ctx.slot }));
    return () => { u1(); u2(); };
  }
  onItemOnObject(itemIds, objectIds, fn, opts) { return this.register('itemOnObject', 'use', itemIds, objectIds, fn, opts); }
  onItemOnNpc(itemIds, npcIds, fn, opts) { return this.register('itemOnNpc', 'use', itemIds, npcIds, fn, opts); }
  onItemOnPlayer(itemIds, fn, opts) { return this.register('itemOnPlayer', 'use', itemIds, null, fn, opts); }
  onItemOnGround(itemIds, groundIds, fn, opts) { return this.register('itemOnGround', 'use', itemIds, groundIds, fn, opts); }
  /** Non-targeted spell cast from the spellbook (teleports, utility). */
  onSpell(spellIds, fn) { return this.register('spell', 'cast', spellIds, null, fn); }
  onSpellOnNpc(spellIds, npcIds, fn, opts) { return this.register('spellOnNpc', 'cast', spellIds, npcIds, fn, opts); }
  onSpellOnPlayer(spellIds, fn, opts) { return this.register('spellOnPlayer', 'cast', spellIds, null, fn, opts); }
  onSpellOnItem(spellIds, itemIds, fn) { return this.register('spellOnItem', 'cast', spellIds, itemIds, fn); }
  onSpellOnObject(spellIds, objectIds, fn, opts) { return this.register('spellOnObject', 'cast', spellIds, objectIds, fn, opts); }
  onSpellOnGround(spellIds, itemIds, fn, opts) { return this.register('spellOnGround', 'cast', spellIds, itemIds, fn, opts); }

  // ---- lookup ----------------------------------------------------------------------------
  matches(kind, option, idA, idB) {
    const out = [];
    for (const k of [`${kind}|${norm(option)}`, `${kind}|*`]) {
      const list = this.map.get(k);
      if (!list) continue;
      for (const e of list) {
        if (e.a && !e.a.has(idA)) continue;
        if (e.b && !e.b.has(idB)) continue;
        out.push(e);
      }
    }
    return out;
  }

  /** First matching handler's opts (used for walk range). */
  optsFor(kind, option, idA, idB) {
    return this.matches(kind, option, idA, idB)[0]?.opts || {};
  }

  /** Runs handlers until one doesn't return false. Returns true if handled. */
  dispatch(kind, option, idA, idB, ctx) {
    for (const e of this.matches(kind, option, idA, idB)) {
      let r;
      try { r = e.fn(ctx); } catch (err) { console.error(`[interactions] ${kind}/${option} handler threw`, err); return true; }
      if (r !== false) {
        this.game.events.emit('interaction', { kind, option, idA, idB, ctx });
        return true;
      }
    }
    return false;
  }
}
