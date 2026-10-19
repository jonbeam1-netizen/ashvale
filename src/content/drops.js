// Drop tables. OWNER: agent D.
// { id, always: [{id, qty}], main: [{id, qty|[min,max], weight} | {table, weight}], rolls, nothing (weight of empty roll), tertiary: [{id, qty, chance}] }

import { registerDropTable } from '../core/registry.js';

registerDropTable({ id: 'none' });
registerDropTable({
  id: 'goblin', always: [{ id: 'bones' }], nothing: 30,
  main: [{ id: 'coins', qty: [1, 12], weight: 30 }, { id: 'bronze_dagger', weight: 6 }, { id: 'bronze_med_helm', weight: 3 }, { id: 'bread', weight: 8 }],
});
registerDropTable({ id: 'chicken', always: [{ id: 'bones' }, { id: 'raw_chicken' }], main: [{ id: 'feather', qty: [5, 15], weight: 1 }], nothing: 1 });
registerDropTable({ id: 'cow', always: [{ id: 'bones' }, { id: 'raw_beef' }] });
registerDropTable({ id: 'giant_rat', always: [{ id: 'bones' }], main: [{ id: 'coins', qty: [1, 5], weight: 1 }], nothing: 3 });
registerDropTable({ id: 'villager', always: [{ id: 'bones' }], main: [{ id: 'coins', qty: [3, 8], weight: 1 }], nothing: 1 });
registerDropTable({ id: 'imp', main: [{ id: 'coins', qty: [1, 20], weight: 3 }, { id: 'bread', weight: 1 }, { id: 'wizard_hat_blue', weight: 1 }], nothing: 2 });
registerDropTable({ id: 'skeleton', always: [{ id: 'bones' }], main: [{ id: 'coins', qty: [5, 40], weight: 4 }, { id: 'iron_scimitar', weight: 1 }, { id: 'iron_full_helm', weight: 1 }], nothing: 6 });
registerDropTable({ id: 'wolf', always: [{ id: 'bones' }], main: [{ id: 'coins', qty: [5, 30], weight: 1 }], nothing: 2 });
registerDropTable({ id: 'giant', always: [{ id: 'big_bones' }], main: [{ id: 'coins', qty: [10, 60], weight: 4 }, { id: 'iron_full_helm', weight: 1 }], nothing: 4 });
registerDropTable({ id: 'golem', main: [{ id: 'coins', qty: [20, 80], weight: 3 }, { id: 'iron_pickaxe', weight: 1 }], nothing: 2 });
registerDropTable({ id: 'demon', always: [{ id: 'big_bones' }], main: [{ id: 'coins', qty: [100, 400], weight: 1 }] });
registerDropTable({ id: 'dragon', always: [{ id: 'big_bones' }], main: [{ id: 'coins', qty: [200, 600], weight: 1 }] });
