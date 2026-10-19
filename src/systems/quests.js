// Quest state API + quest completion. OWNER: agent F.
// game.quests.getStage(id) / setStage(id, n) / start(id) / complete(id) / isComplete(id)
// Quest-specific logic lives in content/quests*.js (dialogues + def.onComplete + registerData('quest_hook', id, fn)).

import { getQuest, allQuests, allData } from '../core/registry.js';
import { escapeHtml } from '../ui/util.js';

export function init(game) {
  const p = () => game.player;
  game.quests = {
    getStage: (id) => p().quests[id] || 0,
    /** Total quest points earned. */
    points: () => allQuests().reduce((a, q) => a + ((p().quests[q.id] || 0) >= q.completeStage ? q.questPoints : 0), 0),
    isComplete: (id) => (p().quests[id] || 0) >= (getQuest(id)?.completeStage ?? 100),
    setStage(id, stage) {
      p().quests[id] = stage;
      game.events.emit('quest:change', { id, stage });
    },
    start(id) {
      if (this.getStage(id) > 0) return;
      this.setStage(id, 1);
      game.message(`<col=0000a0>You have started a new quest: ${getQuest(id).name}.</col>`);
    },
    complete(id) {
      const q = getQuest(id);
      if (!q || this.isComplete(id)) return;
      this.setStage(id, q.completeStage);
      try { q.onComplete?.({ game, player: p() }); } catch (e) { console.error('[quests] onComplete failed', e); }
      game.message(`<col=0000a0>Congratulations, you've completed a quest: ${q.name}!</col>`);
      game.events.emit('quest:complete', { id, player: p() });
      game.spawnEffect('levelup', p());
      game.ui.openInterface({
        id: 'quest_complete', title: 'Quest Complete!', className: 'journal', width: 340,
        render: (body) => {
          body.innerHTML = `<p><b>Congratulations! You have completed ${escapeHtml(q.name)}!</b></p><p>You are awarded:</p>${(q.rewards || []).map((r) => `<p>&bull; ${escapeHtml(r)}</p>`).join('')}`;
        },
      });
    },
  };

  // quest runtime hooks registered by content/quests*.js (interactions, kill listeners, bosses)
  for (const [id, fn] of allData('quest_hook')) {
    try { fn(game); } catch (e) { console.error(`[quests] hook ${id} failed`, e); }
  }
}
