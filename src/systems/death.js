// Death rules. OWNER: agent A.
// STUB: the engine default (Game.kill) already respawns a dead player at mapConfig.respawn with
// full stats and keeps all items. To implement item loss / gravestones / PvP loot, listen to
// 'player:death', set `e.handled = true`, and call game.respawnPlayer(player, x, y) yourself.

export function init(game) {
  // Hook point (engine default behaviour is kept while `handled` stays false):
  // game.events.on('player:death', (e) => { e.handled = true; ...; game.respawnPlayer(e.player, x, y); });
  void game;
}
