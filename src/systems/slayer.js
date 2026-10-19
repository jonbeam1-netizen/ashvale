// Slayer. OWNER: agent F.
// STARTER IMPLEMENTATION: task assignment from registerData('slayer_master', ...), kill counting, XP.
// State: player.data.slayer = { task: {npcs, name, remaining} | null, streak }.

import { getData } from '../core/registry.js';
import { rand } from '../core/rng.js';

export function init(game) {
  game.events.on('slayer:assign', ({ player, master }) => {
    const m = getData('slayer_master', master);
    const st = player.store('slayer');
    if (!m) return;
    if (st.task?.remaining > 0) {
      game.ui.startDialogue([{ npc: `You're still hunting ${st.task.name}; you have ${st.task.remaining} to go.` }], { player });
      return;
    }
    const pool = m.tasks.filter((t) => player.skills.getLevel('slayer') >= (t.slayerLevel || 1));
    const total = pool.reduce((a, t) => a + (t.weight || 1), 0);
    let r = Math.random() * total, pick = pool[0];
    for (const t of pool) { r -= t.weight || 1; if (r < 0) { pick = t; break; } }
    st.task = { npcs: pick.npc, name: pick.name, remaining: rand.int(pick.amount[0], pick.amount[1]) };
    game.ui.startDialogue([{ npc: `Your new task is to kill ${st.task.remaining} ${pick.name}.` }], { player });
  });

  game.events.on('npc:death', ({ npc, killer }) => {
    if (!killer || killer.type !== 'player') return;
    const st = killer.store('slayer');
    if (!st.task || st.task.remaining <= 0 || !st.task.npcs.includes(npc.id)) return;
    st.task.remaining--;
    killer.skills.addXp('slayer', npc.maxHp);
    if (st.task.remaining === 0) {
      st.streak = (st.streak || 0) + 1;
      game.message("<col=7f0000>You've completed your Slayer task; return to a Slayer master.</col>");
    }
  });
}
