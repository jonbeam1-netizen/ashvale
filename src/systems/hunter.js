// Hunter: bird snares and box traps (laid as world objects, creatures wander in and get caught over
// ticks), plus butterfly-net catching. OWNER: agent B (imported by systems/gathering.js).
//
// Content: registerData('hunter', npcId, {method, level, xp, loot, jar?, respawnTicks})
//          registerData('hunter_trap', itemId, {method, set, failed, fullPrefix, name})

import { getData, getObject } from '../core/registry.js';
import { lvl, needLevel, roll, rand, clamp, canHold, itemName, hasTool } from './gathering_util.js';

let game;
const traps = new Set();          // trap objects laid by the local player
const TRAP_LIFE = 300;            // ticks before an unchecked trap collapses
const LURE_RANGE = 6;
/** Objects that stop a trap being laid (walk-over decoration such as grass tufts doesn't). */
const solid = (o) => !o.hidden && (o.blocks || o.def.options?.length);

export const maxTraps = (player) => 1 + Math.floor(player.skills.getLevel('hunter') / 20) + (game.world.isWilderness(player.x, player.y) ? 1 : 0);

function trapDataFor(obj) {
  const item = obj.state.trapItem;
  return item ? getData('hunter_trap', item) : null;
}

// ---- laying -----------------------------------------------------------------------------------------
function layTrap({ player, slot, item }) {
  const td = getData('hunter_trap', item.id);
  if (!td) return false;
  const max = maxTraps(player);
  for (const t of traps) if (!game.objects.has(t.uid)) traps.delete(t);
  if (traps.size >= max) { game.message(`You don't have a high enough Hunter level to set up more than ${max} trap${max > 1 ? 's' : ''}.`); return; }
  const { x, y } = player;
  if (game.world.objectsAt(x, y).some(solid) || game.world.buildingAt?.(x, y)) { game.message("You can't lay a trap here."); return; }
  game.message('You begin setting up the trap.');
  game.playAnim(player, 'pickup', 1500);
  game.actions.start(player, {
    name: 'hunter_lay', delay: 2, interruptible: false,
    onTick: () => {
      const cur = player.inventory.get(slot);
      if (!cur || cur.id !== item.id) return false;
      if (game.world.objectsAt(x, y).some(solid)) { game.message("You can't lay a trap here."); return false; }
      player.inventory.removeAt(slot, 1);
      const obj = game.spawnObject(td.set, x, y);
      obj.state.trapItem = item.id;
      obj.state.owner = player.name;
      obj.state.since = game.tickCount;
      obj.state.status = 'set';
      traps.add(obj);
      // step off the trap (west first, like the classic games)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
        if (game.world.canStep(x, y, dx, dy)) { game.schedule(1, () => game.walkTo(player, x + dx, y + dy)); break; }
      }
      return false;
    },
  });
}

function collapse(obj, msg = 'Your trap has collapsed.') {
  traps.delete(obj);
  if (!game.objects.has(obj.uid)) return;
  const item = obj.state.trapItem;
  game.removeObject(obj);
  if (item) game.spawnGroundItem(item, 1, obj.x, obj.y, { owner: game.player.name });
  game.message(msg);
}

function dismantle({ player, target }) {
  const td = trapDataFor(target);
  if (!td) return false;
  if (target.state.owner && target.state.owner !== player.name) { game.message("This isn't your trap."); return; }
  if (target.state.status === 'full') return check({ player, target });
  if (player.inventory.isFull()) { game.message("You don't have enough inventory space to do that."); return; }
  game.playAnim(player, 'pickup', 900);
  traps.delete(target);
  game.removeObject(target);
  player.inventory.add(target.state.trapItem, 1);
  game.message(`You dismantle the ${td.name}.`);
}

function check({ player, target }) {
  const td = trapDataFor(target);
  if (!td) return false;
  if (target.state.owner && target.state.owner !== player.name) { game.message("This isn't your trap."); return; }
  const data = getData('hunter', target.state.caught);
  if (!data) { target.state.status = 'failed'; return dismantle({ player, target }); }
  const loot = data.loot.map((l) => ({ id: l.id, qty: roll(l.qty ?? 1) }));
  if (!canHold(player, [...loot, { id: target.state.trapItem, qty: 1 }])) { game.message("You don't have enough inventory space to do that."); return; }
  game.playAnim(player, 'pickup', 900);
  traps.delete(target);
  game.removeObject(target);
  player.inventory.add(target.state.trapItem, 1);
  for (const l of loot) player.inventory.add(l.id, l.qty);
  player.skills.addXp('hunter', data.xp);
  const name = getNpcName(target.state.caught);
  game.message(`You've caught ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}.`);
  game.events.emit('hunter:catch', { player, creature: target.state.caught });
}

const getNpcName = (id) => (game.registry.getNpc(id)?.name || id).toLowerCase();

// ---- creature behaviour ----------------------------------------------------------------------------------
function hideCreature(npc, data) {
  npc.hidden = true;
  npc.path = [];
  npc.state.lured = null;
  game.schedule(data.respawnTicks ?? 20, () => { if (game.npcs.has(npc.uid)) game.respawnNpc(npc); });
}

function flee(npc, fromX, fromY) {
  const dx = Math.sign(npc.x - fromX) || (Math.random() < 0.5 ? -1 : 1), dy = Math.sign(npc.y - fromY) || (Math.random() < 0.5 ? -1 : 1);
  const tx = npc.x + dx * (3 + rand(3)), ty = npc.y + dy * (3 + rand(3));
  game.pathTo(npc, { x0: tx, y0: ty, x1: tx, y1: ty, mode: 'tile' });
}

function resolve(trap, npc, data) {
  const td = trapDataFor(trap);
  const player = game.player;
  const L = lvl(player, 'hunter');
  const chance = clamp(0.45 + (L - data.level) * 0.02, 0.35, 0.92);
  npc.state.lured = null;
  if (Math.random() < chance) {
    const fullId = td.fullPrefix + npc.id;
    game.replaceObject(trap, getObject(fullId) ? fullId : td.failed);
    trap.state.status = 'full';
    trap.state.caught = npc.id;
    trap.state.since = game.tickCount;
    hideCreature(npc, data);
  } else {
    game.replaceObject(trap, td.failed);
    trap.state.status = 'failed';
    trap.state.since = game.tickCount;
    flee(npc, trap.x, trap.y);
  }
}

function tickTraps(tick) {
  const p = game.player;
  for (const trap of [...traps]) {
    if (!game.objects.has(trap.uid)) { traps.delete(trap); continue; }
    if (tick - trap.state.since > TRAP_LIFE || Math.max(Math.abs(p.x - trap.x), Math.abs(p.y - trap.y)) > 40 || p.dead) { collapse(trap); continue; }
    if (trap.state.status !== 'set') continue;
    const td = trapDataFor(trap);
    const L = lvl(p, 'hunter');
    // creatures already heading for this trap
    for (const npc of game.npcsNear(trap.x, trap.y, LURE_RANGE + 4, (n) => n.state.lured === trap.uid)) {
      const data = getData('hunter', npc.id);
      if (npc.x === trap.x && npc.y === trap.y) { resolve(trap, npc, data); break; }
      if (tick - npc.state.lureTick > 25) { npc.state.lured = null; continue; }
      if (!npc.path.length) game.pathTo(npc, { x0: trap.x, y0: trap.y, x1: trap.x, y1: trap.y, mode: 'tile' });
    }
    if (trap.state.status !== 'set') continue;
    // attract new creatures
    const lured = game.npcsNear(trap.x, trap.y, LURE_RANGE + 4, (n) => n.state.lured === trap.uid).length;
    if (lured) continue;
    for (const npc of game.npcsNear(trap.x, trap.y, LURE_RANGE)) {
      const data = getData('hunter', npc.id);
      if (!data || data.method !== td.method || npc.state.lured || L < data.level) continue;
      if (Math.random() >= 0.07) continue;
      npc.state.lured = trap.uid;
      npc.state.lureTick = tick;
      game.pathTo(npc, { x0: trap.x, y0: trap.y, x1: trap.x, y1: trap.y, mode: 'tile' });
      break;
    }
  }
}

// ---- butterfly net ---------------------------------------------------------------------------------------
function catchWithNet({ player, target }) {
  const data = getData('hunter', target.id);
  if (!data || data.method !== 'net') return false;
  if (!hasTool(player, 'butterfly_net')) { game.message('You need a butterfly net to catch this.'); return; }
  if (lvl(player, 'hunter') < data.level) { needLevel(game, 'hunter', data.level, 'catch this'); return; }
  if (target.hidden || target.dead) return;
  const useJar = player.inventory.has('butterfly_jar');
  game.playAnim(player, 'slash', 900);
  game.actions.lock(player, 2);
  const L = lvl(player, 'hunter');
  const name = target.name.toLowerCase();
  if (Math.random() < clamp(0.5 + (L - data.level) * 0.02, 0.4, 0.92)) {
    hideCreature(target, data);
    player.skills.addXp('hunter', data.xp);
    if (useJar) {
      player.inventory.remove('butterfly_jar', 1);
      player.inventory.add(data.jar, 1);
      game.message(`You catch the ${name} and put it in a jar.`);
    } else game.message(`You catch the ${name}, admire it for a moment, then let it go.`);
    game.events.emit('hunter:catch', { player, creature: target.id });
  } else {
    game.message(`You swing your net, but the ${name} flutters away.`);
    flee(target, player.x, player.y);
  }
}

function release({ player, slot, item }) {
  if (!/^jar_/.test(item.id)) return false;
  player.inventory.set(slot, { id: 'butterfly_jar', qty: 1 });
  game.message(`You release the ${itemName(item.id).replace('jarred ', '')}.`);
}

export function init(g) {
  game = g;
  const I = game.interactions;
  I.onItem('Lay', ['bird_snare', 'box_trap'], layTrap);
  I.onObject('Dismantle', '*', dismantle);
  I.onObject('Check', '*', check);
  I.onNpc('Catch', '*', catchWithNet);
  I.onItem('Release', '*', release);
  game.onTick(tickTraps, 45);
  game.events.on('teleport', ({ entity }) => {
    if (entity !== game.player) return;
    game.schedule(1, () => { for (const t of [...traps]) if (Math.max(Math.abs(entity.x - t.x), Math.abs(entity.y - t.y)) > 40) collapse(t); });
  });
  return { traps, maxTraps };
}

export { traps };
