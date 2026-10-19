// Shared helpers for quest content. OWNER: agent F.
// Quest runtime hooks: registerData('quest_hook', id, (game) => {...}) are run by systems/quests.js init
// (after game.quests exists) - use them for interactions, death listeners and boss mechanics.

import { registerData, registerNpc, registerObject, registerSpawn, registerItem, registerPaint, getItem } from '../core/registry.js';
import { SKILLS } from '../core/constants.js';

let hookN = 0;
export const hook = (fn) => registerData('quest_hook', `hook_${hookN++}`, fn);

export const stageOf = (game, q) => game.quests?.getStage(q) || 0;
export const done = (game, q) => !!game.quests?.isComplete(q);
/** Per-quest persistent flags (player.data.quest_flags[q]). */
export const flags = (game, q) => { const s = game.player.store('quest_flags'); return (s[q] ||= {}); };
export const has = (game, id, n = 1) => game.player.inventory.has(id, n);
export const take = (game, id, n = 1) => game.player.inventory.remove(id, n);
export const give = (game, id, n = 1) => game.giveItem(id, n, game.player);

/** Journal line helpers. */
export const strike = (s) => `<col=6a6a6a>${s}</col>`;
export const red = (s) => `<col=800000>${s}</col>`;
export const COMPLETE = '<col=ff0000>QUEST COMPLETE!</col>';

export function questNpc(def) {
  return registerNpc({
    options: ['Talk-to'], dialogue: def.id, wanderRadius: 1, combatLevel: 0,
    ...def,
    model: { template: 'human', equipment: {}, ...(def.model || {}) },
  });
}
export function questItem(def) {
  return registerItem({ value: 0, tradeable: false, destroy: true, examine: def.examine || `It's ${def.name}.`, ...def });
}
export function questObject(def) {
  return registerObject({ ...def });
}
export const spawnNpc = (id, x, y, wander = 1) => registerSpawn({ type: 'npc', id, x, y, wander });
export const spawnObj = (id, x, y, rot = 0) => registerSpawn({ type: 'object', id, x, y, rot });
export const clearAround = (x, y, r = 1) => registerPaint({ shape: 'rect', x0: x - r, y0: y - r, x1: x + r, y1: y + r, noScatter: true });

/** XP reward helper used in onComplete. */
export function xp(player, map) { for (const [s, n] of Object.entries(map)) player.skills.addXp(s, n, { ignoreMultiplier: true }); }

/** Lamp: lets the player pick any skill for `amount` xp. */
export function lampDialogue(game, slot, amount) {
  const pages = [];
  const names = SKILLS.slice();
  for (let i = 0; i < names.length; i += 7) pages.push(names.slice(i, i + 7));
  const nodes = [];
  pages.forEach((pg, k) => {
    nodes.push({
      label: `p${k}`, title: `Choose a skill (${k + 1}/${pages.length})`,
      options: [
        ...pg.map((s) => ({
          text: s[0].toUpperCase() + s.slice(1),
          action: () => {
            const it = game.player.inventory.get(slot);
            if (!it || !getItem(it.id)?.lamp) return false;
            game.player.inventory.removeAt(slot, 1);
            game.player.skills.addXp(s, amount, { ignoreMultiplier: true });
            game.spawnEffect('sparkle', game.player, { color: 0xffe080 });
            game.message(`The lamp flares and you gain ${amount.toLocaleString()} ${s[0].toUpperCase() + s.slice(1)} experience.`);
            return false;
          },
        })),
        { text: 'More...', goto: `p${(k + 1) % pages.length}` },
      ],
    });
  });
  game.ui.startDialogue(nodes, { player: game.player });
}
