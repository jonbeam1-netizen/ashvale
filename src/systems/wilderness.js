// Wilderness rules. OWNER: agent A.
// Ditch crossing (with warning), skulls (20 min after attacking a player who didn't attack you first),
// teleport restrictions (above level 20 or while tethered), multi-combat zones, and PvP (systems/pvp.js).
//
// game.wilderness
//   level(entity?) -> wilderness level at the entity (0 outside)
//   canTeleport(player?) -> {ok, reason}      agent F: call before every teleport
//   isSkulled(player?) / skull(player?, ticks) / clearSkull(player?) / skullTicks(player?)
//   teleblock(player?, ticks) / isTeleblocked(player?) / clearTeleblock(player?)

import { initPvp } from './pvp.js';

const SKULL_TICKS = 2000;
const TELEPORT_MAX_LEVEL = 20;

export function init(game) {
  const ev = game.events;
  const edge = game.registry.getMapConfig().wildernessEdgeY;
  const cst = (p) => p.store('combat');

  const wild = {
    level: (e = game.player) => game.world.getWildernessLevel(e.x, e.y),
    skullTicks: (p = game.player) => (p.type === 'remote' ? (p.extra?.skulled ? 1 : 0) : cst(p).skull || 0),
    isSkulled: (p = game.player) => (p.type === 'remote' ? !!p.extra?.skulled : (cst(p).skull || 0) > 0),
    skull(p = game.player, ticks = SKULL_TICKS) {
      const was = wild.isSkulled(p);
      cst(p).skull = Math.max(cst(p).skull || 0, ticks);
      if (!was) { game.message('<col=c00000>A skull mark burns above your head.</col>'); ev.emit('wilderness:skull', { player: p, skulled: true }); }
    },
    clearSkull(p = game.player) { if (cst(p).skull) { cst(p).skull = 0; ev.emit('wilderness:skull', { player: p, skulled: false }); } },
    teleblock(p = game.player, ticks = 500) {
      const was = wild.isTeleblocked(p);
      cst(p).teleblock = Math.max(cst(p).teleblock || 0, ticks);
      if (!was) game.message('<col=008080>A tethering curse anchors you - you cannot teleport!</col>');
    },
    isTeleblocked: (p = game.player) => (cst(p).teleblock || 0) > 0,
    clearTeleblock(p = game.player) { cst(p).teleblock = 0; },
    canTeleport(p = game.player) {
      if (p.dead) return { ok: false, reason: "You can't do that right now." };
      if (wild.isTeleblocked(p)) return { ok: false, reason: `A tethering curse holds you here for another ${Math.ceil(cst(p).teleblock * 0.6)} seconds.` };
      const lvl = wild.level(p);
      if (lvl > TELEPORT_MAX_LEVEL) return { ok: false, reason: `A dark force binds you here; you cannot teleport above level ${TELEPORT_MAX_LEVEL} Wilderness.` };
      return { ok: true, reason: '' };
    },
  };
  game.wilderness = wild;

  // ---- ditch -----------------------------------------------------------------------------------
  const jump = (player, northward) => {
    game.actions.lock(player, 2);
    game.playAnim(player, 'climb', 900);
    game.schedule(1, () => game.teleport(player, player.x, northward ? edge - 1 : edge + 1));
  };
  game.interactions.onObject('Cross', ['wilderness_ditch'], ({ player }) => {
    const northward = player.y > edge;
    if (!northward || !player.settings.wildyWarning) { jump(player, northward); return; }
    game.ui.startDialogue([
      { message: '<col=c00000>WARNING!</col> Beyond this ditch lies the Wilderness. Other players can attack you there, and the further north you go, the wider the range of foes who may. If you die there, you may lose most of your belongings.' },
      { title: 'Enter the Wilderness?', options: [
        { text: 'Yes, cross the ditch.', action: () => jump(player, true), end: true },
        { text: "Yes, and don't warn me again.", action: () => { player.settings.wildyWarning = false; jump(player, true); }, end: true },
        { text: 'No, stay here.', end: true },
      ] },
    ], { player });
  });

  ev.on('wilderness:enter', ({ level }) => game.message(`<col=c00000>You have entered the Wilderness (level ${level}).</col>`));
  ev.on('wilderness:leave', () => game.message('You have left the Wilderness.'));

  // ---- multi-combat zones -------------------------------------------------------------------------
  // If the map (agent D) defines no multi-combat area inside the Wilderness, make the deep north and
  // the Calder Ruins multi-way so group fights / boss hunting work there.
  const wildAreas = game.world.areas.filter((a) => a.y0 < edge && !a.safe);
  if (!wildAreas.some((a) => a.multi)) for (const a of wildAreas) if (a.id === 'calder_ruins' || a.id === 'frostfang') a.multi = true;

  // ---- timers -------------------------------------------------------------------------------------
  game.onTick(() => {
    const p = game.player;
    const st = cst(p);
    if (st.skull > 0 && --st.skull === 0) { game.message('The skull above your head fades away.'); ev.emit('wilderness:skull', { player: p, skulled: false }); }
    if (st.teleblock > 0 && --st.teleblock === 0) game.message('<col=008080>The tethering curse fades. You can teleport again.</col>');
  }, 15);

  initPvp(game);
}
