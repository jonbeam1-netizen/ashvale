// Tiny synchronous event bus. Payloads are plain objects; listeners may mutate them
// (e.g. set `payload.handled = true` to suppress engine default behaviour where documented).

export class EventBus {
  constructor() { this.map = new Map(); }

  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set());
    this.map.get(evt).add(fn);
    return () => this.off(evt, fn);
  }

  once(evt, fn) {
    const off = this.on(evt, (p) => { off(); fn(p); });
    return off;
  }

  off(evt, fn) { this.map.get(evt)?.delete(fn); }

  emit(evt, payload = {}) {
    const set = this.map.get(evt);
    if (!set) return payload;
    for (const fn of [...set]) {
      try { fn(payload); } catch (e) { console.error(`[events] listener for "${evt}" threw`, e); }
    }
    return payload;
  }
}
