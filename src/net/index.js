// Networking entry point. OWNER: agent E (peer-to-peer multiplayer via PeerJS, global `Peer`).
// STUB: installs an offline game.net. See ARCHITECTURE.md "Networking" for the hooks to use:
//   game.player.snapshot()                         - serializable local state (send every tick)
//   game.addRemotePlayer / updateRemotePlayer / removeRemotePlayer(peerId, snapshot)
//   game.applyDamage(game.player, amount, {source: remotePlayer, type})  - incoming PvP hits
//   events: 'tick', 'chat:public', 'damage', 'player:death', 'menu:playerOptions', ...
//   UI: game.ui.getTabElement('friends') / game.ui.registerTab({id:'friends', render})

export function init(game) {
  game.net = {
    connected: false,
    peerId: null,
    /** Send a message to one peer (no-op offline). */
    send(/* peerId, type, data */) {},
    /** Send a message to all peers (no-op offline). */
    broadcast(/* type, data */) {},
  };
}
