// Wilderness rules. OWNER: agent A.
// STARTER IMPLEMENTATION: crossing the Wilderness Ditch (with a warning the first time).
// Agent A adds: PvP attack options (via 'menu:playerOptions'), skulls, level-based combat range, teleblock...

export function init(game) {
  const edge = game.registry.getMapConfig().wildernessEdgeY;

  const jump = (player, northward) => {
    game.actions.lock(player, 2);
    game.playAnim(player, 'climb', 900);
    game.schedule(1, () => game.teleport(player, player.x, northward ? edge - 1 : edge + 1));
  };

  game.interactions.onObject('Cross', ['wilderness_ditch'], ({ player }) => {
    const northward = player.y > edge;
    if (!northward || !player.settings.wildyWarning) { jump(player, northward); return; }
    game.ui.startDialogue([
      { message: '<col=c00000>WARNING!</col> Beyond this ditch lies the Wilderness. Other players may attack you there, and the deeper you go (further north), the more dangerous it becomes.' },
      { title: 'Enter the Wilderness?', options: [
        { text: 'Yes, cross the ditch.', action: () => jump(player, true), end: true },
        { text: "Yes, and don't warn me again.", action: () => { player.settings.wildyWarning = false; jump(player, true); }, end: true },
        { text: 'No, stay here.', end: true },
      ] },
    ], { player });
  });

  game.events.on('wilderness:enter', ({ level }) => {
    game.message(`<col=c00000>You have entered the Wilderness (level ${level}).</col>`);
  });
  game.events.on('wilderness:leave', () => game.message('You have left the Wilderness.'));
}
