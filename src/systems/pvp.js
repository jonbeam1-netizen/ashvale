// Player-vs-player combat (Wilderness). OWNER: agent A. Contract for agent E: docs/PVP_API.md.
// Imported and initialised by systems/wilderness.js.
//
// game.pvp
//   canAttack(remote) -> {ok, reason}
//   attack(remote)                         start attacking (same as right-click "Attack")
//   receiveHit(fromRemote, {damage, style, attackerName?, ts?, effect?, effectTicks?, poison?, drain?, drainPrayer?}) -> dealt
//   receiveLoot(fromRemote, {items:[{id,qty}], x, y})
//   onRemoteDeath(remote)
//   landHit(remote, rawDamage, info) -> shown damage (used by combat.js; sends the hit)
//   noteOutgoingAttack(remote)             skull bookkeeping (combat.js calls it on every attack)
//   killerOf(player, engineKiller) -> RemotePlayer | null
//   attackedBy -> Map peerId -> tick they last hit us

import { getItem } from '../core/registry.js';
import { damageType } from './combat_formulas.js';

const SKULL_TICKS = 2000;              // 20 minutes
const FIRST_STRIKE_MEMORY = 2000;      // they attacked you first if within 20 minutes
const PVP_PROTECT = 0.6;               // protect prayers block 40% in PvP
const KILL_CREDIT_TICKS = 17;          // a remote that hit you within ~10 s gets the kill
const WILD_GRACE_TICKS = 4;            // hits arriving this long after leaving the Wilderness still count
const LOOT_PRIVATE_TICKS = 100;        // PvP loot is the killer's alone for a minute, then anyone's (shared Wilderness items)

const SPECIAL_EFFECTS = {
  venom_rend: (dmg) => (dmg > 0 ? { poison: 6 } : null),
  hamstring: (dmg) => (dmg > 0 ? { effect: 'bind', effectTicks: 10 } : null),
  shatter: (dmg) => (dmg > 0 ? { drain: { skill: 'defence', amount: dmg } } : null),
};

export function initPvp(game) {
  const ev = game.events;
  const attackedBy = new Map();   // peerId -> tick they hit us
  const myAttacks = new Map();    // peerId -> tick we hit them
  const tick = () => game.tickCount;
  const wl = (x, y) => game.world.getWildernessLevel(x, y);
  const remoteWl = (r) => wl(r.x, r.y) || (r.extra?.wildernessLevel ?? 0);
  const myPeer = () => game.net?.peerId ?? null;

  function busyWith(p) {
    const lh = game.combat?.lastHit?.();
    if (lh?.source && tick() - lh.tick < 8 && !lh.source.dead && !game.targetGone?.(lh.source)) return lh.source.type === 'remote' ? lh.source.peerId : 'npc';
    const t = p.combatTarget;
    if (t && game.combat?.inCombat?.(8)) return t.type === 'remote' ? t.peerId : 'npc';
    return null;
  }

  let lastWildTick = -999;
  game.onTick(() => { const p = game.player; if (!p.dead && wl(p.x, p.y) > 0) lastWildTick = tick(); }, 5);
  const pending = new Map();      // hid -> {remote, shown, timer}: predicted splats waiting for the victim's real one
  let hidSeq = 0;
  const showSplat = (remote, amount) => {
    if (!remote || !game.remotePlayers.has(remote.peerId)) return;
    game.applyDamage(remote, amount, { source: game.player, type: 'typeless', predicted: true });
  };

  const pvp = {
    attackedBy,

    /** Wilderness + level-bracket rule only (no single-way check). */
    bracket(remote) {
      const p = game.player;
      const mine = wl(p.x, p.y), theirs = remoteWl(remote);
      if (mine <= 0) return { ok: false, reason: 'You can only fight other players in the Wilderness.' };
      if (theirs <= 0) return { ok: false, reason: `${remote.name} is not in the Wilderness.` };
      const diff = Math.abs(p.combatLevel - (remote.combatLevel || 3));
      if (diff > Math.min(mine, theirs)) return { ok: false, reason: `The level difference between you and ${remote.name} is too great. Venture deeper into the Wilderness.` };
      return { ok: true, reason: '' };
    },

    /**
     * The victim's client reported the real hitsplat for one of our hits (net calls this).
     * Returns true when it matched a pending predicted splat (which is then cancelled).
     */
    confirmHit(hid) {
      const h = hid != null && pending.get(hid);
      if (!h) return false;
      clearTimeout(h.timer);
      pending.delete(hid);
      return true;
    },

    canAttack(remote) {
      const p = game.player;
      if (!remote || remote.type !== 'remote') return { ok: false, reason: 'You can only attack other players.' };
      if (p.dead) return { ok: false, reason: 'You are dead.' };
      if (remote.dead) return { ok: false, reason: 'That player is already dead.' };
      if (!game.remotePlayers.has(remote.peerId)) return { ok: false, reason: 'That player has left.' };
      const br = pvp.bracket(remote);
      if (!br.ok) return br;
      const multi = game.world.isMulti(p.x, p.y) && game.world.isMulti(remote.x, remote.y);
      if (!multi) {
        const theirBusy = remote.extra?.busyWith;
        if (theirBusy && theirBusy !== myPeer()) return { ok: false, reason: `${remote.name} is already in combat.` };
        if (game.combat?.busyWithOther(remote)) {
          const lh = game.combat.lastHit();
          if (lh.source && lh.source !== remote && tick() - lh.tick < 8) return { ok: false, reason: "I'm already under attack." };
        }
      }
      return { ok: true, reason: '' };
    },

    attack(remote) { return game.combat?.attack(remote); },

    noteOutgoingAttack(remote) {
      const t = tick();
      myAttacks.set(remote.peerId, t);
      const first = attackedBy.get(remote.peerId);
      const theyStarted = first != null && t - first < FIRST_STRIKE_MEMORY;
      if (!theyStarted) game.wilderness?.skull(game.player);
    },

    /** Called by combat.js when a local hit lands on a remote player: show the splat and send it. */
    landHit(remote, raw, info = {}) {
      const p = game.player;
      const style = info.kind === 'magic' ? 'magic' : info.kind === 'ranged' ? 'ranged' : info.type === 'typeless' ? 'typeless' : 'melee';
      raw = Math.max(0, Math.floor(raw));
      const prot = Array.isArray(remote.extra?.overheads) && remote.extra.overheads.some((id) => game.registry.getPrayer(id)?.effects?.protect === style);
      const shown = Math.min(prot ? Math.floor(raw * PVP_PROTECT) : raw, Math.max(0, remote.hp));
      const hid = `${game.tickCount.toString(36)}-${(++hidSeq).toString(36)}`;
      const payload = { damage: raw, style, attackerName: p.name, attackerCombat: p.combatLevel, ts: Date.now(), hid };
      const sp = info.spell;
      if (sp) {
        if (sp.bind) Object.assign(payload, { effect: 'bind', effectTicks: sp.bind });
        if (sp.teleblock) Object.assign(payload, { effect: 'teleblock', effectTicks: sp.teleblock });
        if (sp.poison && raw > 0) payload.poison = sp.poison;
        if (sp.drain) payload.drain = { skill: sp.drain.skill, pct: sp.drain.pct };
      }
      const sfx = info.special && SPECIAL_EFFECTS[info.special.id]?.(raw);
      if (sfx) Object.assign(payload, sfx);
      if (raw > 0 && game.prayer?.has(p, 'soulrend')) payload.drainPrayer = Math.floor(raw / 4);
      let sent = false;
      try { sent = !!game.net?.sendHit?.(remote.peerId, payload); } catch (e) { console.error('[pvp] sendHit failed', e); }
      // The victim's client is authoritative: it answers with the real hitsplat (game.net -> confirmHit).
      // Show our prediction only if that answer doesn't arrive in time (or we're offline).
      if (sent) {
        const timer = setTimeout(() => { if (pending.delete(hid)) showSplat(remote, shown); }, 1500);
        pending.set(hid, { remote, shown, timer });
      } else showSplat(remote, shown);
      remote.lastAttackedTick = game.tickCount;
      ev.emit('pvp:hit', { remote, payload, shown });
      return shown;
    },

    /** Incoming hit from a remote attacker (agent E calls this). Returns damage dealt. */
    receiveHit(fromRemote, data = {}) {
      const p = game.player;
      if (!p || p.dead) return 0;
      // PvP only happens in the Wilderness; hits already in flight when we stepped out still land
      if (wl(p.x, p.y) <= 0 && tick() - lastWildTick > WILD_GRACE_TICKS) return 0;
      if (fromRemote?.peerId != null) attackedBy.set(fromRemote.peerId, tick());
      let style = String(data.style || 'melee');
      if (['stab', 'slash', 'crush'].includes(style)) style = 'melee';
      let dmg = Math.max(0, Math.min(200, Math.floor(Number(data.damage) || 0)));
      const prot = style !== 'typeless' && game.prayer?.isProtected(p, style);
      if (prot) dmg = Math.floor(dmg * PVP_PROTECT);
      // status effects (values clamped: they come from another client)
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));
      const halved = game.prayer?.isProtected(p, 'magic') ? 0.5 : 1;
      if (data.effect === 'bind') game.combat?.bind(p, Math.max(1, Math.floor(clamp(data.effectTicks || 8, 1, 30) * halved)));
      if (data.effect === 'teleblock') game.wilderness?.teleblock(p, Math.floor(clamp(data.effectTicks || 500, 1, 600) * halved));
      if (data.poison) game.combat?.poison(p, clamp(data.poison, 1, 12), fromRemote);
      if (data.drain?.skill && ['attack', 'strength', 'defence', 'ranged', 'magic'].includes(data.drain.skill)) {
        const amt = data.drain.amount != null ? clamp(data.drain.amount, 0, 50) : Math.max(1, Math.floor(p.skills.getLevel(data.drain.skill) * Math.min(0.2, Number(data.drain.pct) || 0)));
        if (amt > 0) p.skills.boost(data.drain.skill, -amt);
      }
      if (data.drainPrayer) game.prayer?.drainPoints(p, clamp(data.drainPrayer, 0, 30));
      const dealt = game.applyDamage(p, dmg, {
        source: fromRemote || null, type: style === 'typeless' ? 'typeless' : damageType(style), pvp: true, ignoresProtect: true,
      });
      ev.emit('pvp:received', { from: fromRemote, data, dealt });
      return dealt;
    },

    /** Loot from a player we killed (agent E calls this on the killer's client). */
    receiveLoot(fromRemote, data = {}) {
      const p = game.player;
      const x = Number.isFinite(data.x) ? data.x : fromRemote?.x ?? p.x;
      const y = Number.isFinite(data.y) ? data.y : fromRemote?.y ?? p.y;
      let n = 0;
      for (const it of data.items || []) {
        if (!it || !getItem(it.id) || !(it.qty > 0)) continue;
        game.spawnGroundItem(it.id, Math.floor(it.qty), x, y, { owner: p.name, ticks: 6000, privateTicks: LOOT_PRIVATE_TICKS });
        n++;
      }
      const name = fromRemote?.name || 'Your foe';
      game.message(n ? `<col=c00000>${name}'s belongings spill onto the ground.</col>` : `${name} had nothing worth taking.`);
      ev.emit('pvp:loot', { from: fromRemote, items: data.items || [], x, y });
    },

    /** A remote player reported its death (agent E calls this). */
    onRemoteDeath(remote, info = {}) {
      const p = game.player;
      if (!remote) return;
      const fighting = p.combatTarget === remote;
      const recent = (info.killerPeerId != null && info.killerPeerId === myPeer())
        || (myAttacks.has(remote.peerId) && tick() - myAttacks.get(remote.peerId) < 30);
      if (fighting) game.combat?.stop(p);
      if (p.faceTarget === remote) p.faceTarget = null;
      if (fighting || recent) game.message(`<col=c00000>You have defeated ${remote.name}!</col>`);
      attackedBy.delete(remote.peerId);
      myAttacks.delete(remote.peerId);
      ev.emit('pvp:kill', { remote, credited: fighting || recent });
    },

    /** The remote player that gets credit for killing `player`, if any. */
    killerOf(player, engineKiller = null) {
      if (engineKiller?.type === 'remote' && game.remotePlayers.has(engineKiller.peerId)) return engineKiller;
      const lh = game.combat?.lastHit?.();
      if (lh?.source?.type === 'remote' && tick() - lh.tick <= KILL_CREDIT_TICKS && game.remotePlayers.has(lh.source.peerId)) return lh.source;
      return null;
    },

    busyWith: () => busyWith(game.player),
  };
  game.pvp = pvp;

  // ---- snapshot fields for remote clients ------------------------------------------------------
  const LEVEL_KEYS = ['attack', 'strength', 'defence', 'ranged', 'magic', 'hitpoints', 'prayer'];
  ev.on('snapshot', ({ player, snap }) => {
    if (player !== game.player) return;
    const sk = player.skills;
    snap.combatLevel = player.combatLevel;
    snap.levels = Object.fromEntries(LEVEL_KEYS.map((k) => [k, sk.getCurrent(k)]));
    snap.bonuses = player.equipment.bonuses();
    snap.overheads = game.prayer?.overheadIds(player) || [];
    snap.skulled = !!game.wilderness?.isSkulled(player);
    snap.hp = player.hp;
    snap.maxHp = player.maxHp;
    snap.stance = game.combat?.formulas?.styleOf(player)?.style || 'accurate';
    snap.busyWith = busyWith(player);
  });

  // ---- menus -----------------------------------------------------------------------------------
  ev.on('menu:playerOptions', (e) => {
    const p = game.player;
    const r = e.target;
    // Attack is only offered when both are in the Wilderness and within each other's level bracket
    // (left-click attacks); the single-way "already in combat" rule is reported when it is chosen.
    if (!r || r.dead || p.dead || e.options.includes('Attack') || !pvp.bracket(r).ok) return;
    e.options.unshift('Attack');
  });

  game.interactions.onPlayer('Attack', ({ player, target }) => {
    const chk = pvp.canAttack(target);
    if (!chk.ok) { game.message(chk.reason); return; }
    game.combat?.attack(target, player);
  }, { range: (ctx) => game.combat?.attackRange(ctx.player) ?? 1 });

  ev.on('remote:remove', ({ remote }) => {
    if (game.player.combatTarget === remote) game.combat?.stop(game.player);
    if (game.player.faceTarget === remote) game.player.faceTarget = null;
    attackedBy.delete(remote.peerId);
    for (const [hid, h] of pending) if (h.remote === remote) { clearTimeout(h.timer); pending.delete(hid); }
  });
  ev.on('player:respawn', () => { attackedBy.clear(); myAttacks.clear(); });
}
