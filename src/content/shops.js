// Shops. OWNER: agent D.
// { id, name, currency:'coins', sellRate (price multiplier when buying from shop), buyRate (multiplier the shop pays),
//   general (buys anything tradeable), restockTicks, stock: [{id, qty}] }

import { registerShop } from '../core/registry.js';

registerShop({
  id: 'brackenford_general', name: 'Brackenford General Store', general: true, sellRate: 1.0, buyRate: 0.4,
  stock: [
    { id: 'tinderbox', qty: 5 }, { id: 'hammer', qty: 5 }, { id: 'knife', qty: 5 }, { id: 'chisel', qty: 5 },
    { id: 'small_net', qty: 5 }, { id: 'bronze_axe', qty: 5 }, { id: 'bronze_pickaxe', qty: 5 }, { id: 'bread', qty: 10 },
  ],
});
registerShop({
  id: 'highmarch_arms', name: 'Highmarch Arms & Armour', sellRate: 1.1, buyRate: 0.5,
  stock: [
    { id: 'bronze_sword', qty: 5 }, { id: 'bronze_med_helm', qty: 5 }, { id: 'bronze_platebody', qty: 3 }, { id: 'bronze_platelegs', qty: 3 },
    { id: 'bronze_kiteshield', qty: 3 }, { id: 'iron_scimitar', qty: 2 }, { id: 'iron_full_helm', qty: 2 },
  ],
});
