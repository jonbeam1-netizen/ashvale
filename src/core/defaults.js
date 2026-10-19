// Engine default interaction handlers. Registered first, so any system registering the same
// option (especially with specific ids) takes precedence. See ARCHITECTURE.md "Interactions".

export function registerDefaultHandlers(game) {
  const I = game.interactions;

  // ---- inventory items --------------------------------------------------------------------
  I.onItem('Eat', '*', ({ player, slot, item, def }) => {
    if (def.heal == null) return false;
    if ((player.eatDelayUntil || 0) > game.tickCount) return true;
    player.inventory.removeAt(slot, 1);
    if (def.eatReplace) player.inventory.set(slot, { id: def.eatReplace, qty: 1 });
    const before = player.hp;
    game.heal(player, def.heal);
    player.eatDelayUntil = game.tickCount + 3;
    player.attackTimer = Math.max(player.attackTimer, 3);
    game.playAnim(player, 'eat', 900);
    game.message(`You eat the ${def.name.toLowerCase()}.`);
    if (player.hp > before) game.message('It heals some health.');
    game.events.emit('item:eat', { player, item, def });
  });

  const wield = ({ player, slot }) => { game.equip(player, slot); };
  I.onItem('Wield', '*', wield);
  I.onItem('Wear', '*', wield);
  I.onItem('Equip', '*', wield);

  I.onItem('Drop', '*', ({ player, slot }) => {
    const it = player.inventory.removeAt(slot);
    if (!it) return;
    game.spawnGroundItem(it.id, it.qty, player.x, player.y, { owner: player.name });
    game.events.emit('item:drop', { player, item: it });
  });

  I.onItem('Examine', '*', ({ def, item }) => {
    const qty = item.qty >= 100000 ? `${item.qty.toLocaleString()} x ${def.name}` : def.examine;
    game.message(qty);
  });

  I.onEquipment('Remove', '*', ({ player, slot }) => { game.unequip(player, slot); });
  I.onEquipment('Examine', '*', ({ def }) => game.message(def.examine));

  // ---- ground items -----------------------------------------------------------------------
  I.onGroundItem('Take', '*', ({ player, target }) => {
    if (!game.groundItems.has(target.uid)) return;
    if (player.inventory.capacityFor(target.itemId) < target.qty) {
      game.message("You don't have enough inventory space to hold that item.");
      return;
    }
    player.inventory.add(target.itemId, target.qty);
    game.removeGroundItem(target);
    game.playAnim(player, 'pickup', 600);
    game.events.emit('item:pickup', { player, itemId: target.itemId, qty: target.qty });
  });

  // ---- objects ----------------------------------------------------------------------------
  I.onObject('Bank', '*', () => game.ui.openBank());
  I.onObject('Use', ['bank_chest'], () => game.ui.openBank());

  const toggleDoor = ({ target, def }) => {
    const other = def.openId || def.closedId;
    if (!other) return false;
    game.replaceObject(target, other);
  };
  I.onObject('Open', '*', toggleDoor);
  I.onObject('Close', '*', toggleDoor);

  I.onObject('Read', '*', ({ def }) => game.message(def.readText || def.examine));

  // Generic teleport objects: def.teleport = {x, y, message?}
  const climb = ({ player, def, option }) => {
    if (!def.teleport) return false;
    const anim = /climb/i.test(option) ? 'climb' : 'pickup';
    game.playAnim(player, anim, 1200);
    game.actions.lock(player, 2);
    if (def.teleport.message) game.message(def.teleport.message);
    game.schedule(2, () => game.teleport(player, def.teleport.x, def.teleport.y));
  };
  for (const opt of ['Climb-up', 'Climb-down', 'Climb', 'Enter', 'Exit', 'Go-through', 'Squeeze-through']) I.onObject(opt, '*', climb);

  // ---- npcs -------------------------------------------------------------------------------
  I.onNpc('Talk-to', '*', ({ player, target, def }) => {
    if (!def.dialogue) { game.message(`${def.name} doesn't seem interested in talking.`); return; }
    target.talkingTo = player;
    target.faceTarget = player;
    target.path = [];
    game.ui.startDialogue(def.dialogue, { npc: target, player });
  });
  I.onNpc('Trade', '*', ({ def }) => {
    if (!def.shop) return false;
    game.ui.openShop(def.shop);
  });
  I.onNpc('Bank', '*', () => game.ui.openBank());

  // ---- other players ----------------------------------------------------------------------
  I.onPlayer('Follow', ({ player, target }) => { player.following = target; }, { range: 1 });
}
