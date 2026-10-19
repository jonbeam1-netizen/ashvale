// Shop runtime: stock levels, buying/selling and restocking. Content defines shops via registerShop.

import { getShop, getItem } from './registry.js';

export class Shops {
  constructor(game) {
    this.game = game;
    this.state = new Map(); // shopId -> [{id, qty, base}]
    game.onTick((tick) => {
      for (const [id, stock] of this.state) {
        const def = getShop(id);
        if (tick % (def.restockTicks || 20)) continue;
        let changed = false;
        for (let i = stock.length - 1; i >= 0; i--) {
          const s = stock[i];
          if (s.qty < s.base) { s.qty++; changed = true; } else if (s.qty > s.base) { s.qty--; changed = true; }
          if (s.base === 0 && s.qty === 0) { stock.splice(i, 1); changed = true; }
        }
        if (changed) game.events.emit('shop:change', { shopId: id });
      }
    }, 100);
  }

  stock(shopId) {
    if (!this.state.has(shopId)) {
      const def = getShop(shopId);
      this.state.set(shopId, (def?.stock || []).map((s) => ({ id: s.id, qty: s.qty ?? 10, base: s.qty ?? 10 })));
    }
    return this.state.get(shopId);
  }

  /** Price the shop charges for one item. A stock entry may carry its own `rate` (overrides def.sellRate),
   *  used for raw crafting supplies so buy -> craft -> sell/alch is never a money loop (docs/BALANCE.md). */
  buyPrice(shopId, itemId) {
    const def = getShop(shopId), item = getItem(itemId);
    const rate = def.stock?.find((s) => s.id === itemId)?.rate ?? def.sellRate ?? 1;
    return Math.max(1, Math.round((item?.value ?? 1) * rate));
  }

  /** Price the shop pays for one item (0 = won't buy). */
  sellPrice(shopId, itemId) {
    const def = getShop(shopId), item = getItem(itemId);
    if (!item || item.tradeable === false || itemId === def.currency) return 0;
    if (!def.general && !def.stock.some((s) => s.id === itemId)) return 0;
    return Math.floor((item.value ?? 0) * (def.buyRate ?? 0.4));
  }

  buy(player, shopId, itemId, qty) {
    const def = getShop(shopId);
    const stock = this.stock(shopId);
    const s = stock.find((e) => e.id === itemId);
    if (!s || s.qty <= 0) { this.game.message('The shop has run out of stock.'); return 0; }
    const price = this.buyPrice(shopId, itemId);
    let n = Math.min(qty, s.qty);
    const money = player.inventory.count(def.currency);
    n = Math.min(n, Math.floor(money / price));
    if (n <= 0) { this.game.message(`You don't have enough ${getItem(def.currency)?.name.toLowerCase() || 'money'}.`); return 0; }
    n = Math.min(n, player.inventory.capacityFor(itemId));
    if (n <= 0) { this.game.message("You don't have enough inventory space."); return 0; }
    player.inventory.remove(def.currency, n * price);
    const added = player.inventory.add(itemId, n);
    s.qty -= added;
    this.game.events.emit('shop:change', { shopId });
    return added;
  }

  sell(player, shopId, itemId, qty) {
    const def = getShop(shopId);
    const price = this.sellPrice(shopId, itemId);
    if (price <= 0 && !(def.general && getItem(itemId)?.tradeable !== false)) { this.game.message("You can't sell this item to this shop."); return 0; }
    const n = Math.min(qty, player.inventory.count(itemId));
    if (n <= 0) return 0;
    if (price > 0 && player.inventory.capacityFor(def.currency) <= 0 && player.inventory.count(itemId) > n) { this.game.message("You don't have enough inventory space."); return 0; }
    player.inventory.remove(itemId, n);
    if (price > 0) player.inventory.add(def.currency, price * n);
    const stock = this.stock(shopId);
    const s = stock.find((e) => e.id === itemId);
    if (s) s.qty += n; else stock.push({ id: itemId, qty: n, base: 0 });
    this.game.events.emit('shop:change', { shopId });
    return n;
  }
}
