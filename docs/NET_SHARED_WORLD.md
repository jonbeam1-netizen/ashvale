# Ashvale – shared world state in multiplayer

Owner: agent E (`src/net/*`). Transport and roles: `src/net/session.js` (star topology, the host relays).

Each client normally simulates its own world (NPCs, resources, ground items) and is authoritative for its
own player. A few things are shared so that the Wilderness feels like one place:

| What | Authority | Status |
|---|---|---|
| Players (position, look, animations, HP, prayers, skull...) | each client for itself (snapshots) | done |
| PvP hits / effects / deaths / loot | victim's client applies hits; killer spawns loot | done (`docs/PVP_API.md`) |
| Hitsplats on players | the damaged player's client broadcasts every splat it takes (`splat`) | done |
| Projectiles / sparkles / teleports / level-ups on players | the client that spawned them mirrors them (`fx`) | done |
| Ground items in the Wilderness | **host** | done (`src/net/shared.js`) |
| NPCs in the Wilderness | host | design only (below) |

---------------------------------------------------------------------------------------------------

## 1. Hitsplats and HP bars (`splat`)

* The victim's client applies a PvP hit (`game.pvp.receiveHit`) and every `'damage'` on its own player
  is broadcast as `splat {a, t, hp, mhp, hid?, src?}`. Receivers push the splat onto the `RemotePlayer`,
  update its HP immediately (no need to wait for the next snapshot) and show the HP bar.
* The attacker sends each hit with a hit id (`hid`). `game.pvp.landHit` does **not** draw its own guess:
  it waits for the victim's `splat` with the same `hid` (`game.pvp.confirmHit`) and only shows the
  predicted splat if no answer arrives within 1.5 s (or when offline). A victim that ignores the hit
  (already dead...) answers `splat {hid, none: true}`. Result: attacker, victim and bystanders see the
  same numbers, including protect-prayer reductions, poison and NPC damage.

## 2. Mirrored effects (`fx`)

`'effect'` events whose source is the local player (projectiles, cast sparkles, teleports, level-up
fireworks) or that land on a remote player (spell splashes) are broadcast as
`fx {k, at, to?, c, ms, sz, arc}`; entity references are `{p: peerId}` (players) or `{t: [x, y]}` (tiles,
e.g. a local NPC). Receivers re-spawn them with `fromNet: true` so they are never echoed back.

## 3. Shared Wilderness ground items (implemented)

Every **non-permanent ground item that appears inside the Wilderness** on any client – drops, PvP loot,
death piles, ammo under a target, monster drops – is registered with the host.

```
joiner -> host  gadd {lid, id, qty, x, y, owner, priv, life}     register a local item (lid = local uid)
host   -> all   gadd {nid, origin, lid?, id, qty, x, y, owner, priv, life}
joiner -> host  gtake {nid}                                       ask to pick it up
host   -> one   ggrant {nid, id, qty} | gdeny {nid}               exactly one client gets it
host   -> all   gdel {nid, to?}                                   it is gone (taken / removed)
joiner -> host  gqty {nid, add, ...}  -> host -> all gset {nid, qty}   a stack was dropped onto it
joiner -> host  gdel {nid} | {lid}                                removed locally (lit as a fire, expired early...)
host   -> new   gsync {items: [...]}                              late joiners get everything
```

* Each client still keeps an ordinary `GroundItem` (tagged `gi.nid`), so rendering, menus, despawn
  timers and **privacy** keep working: `owner` + `priv` (ticks until public) are carried over, so loot is
  visible only to its owner first (PvP loot: 1 minute) and then to everyone, like any MMO drop.
* `Take` on a shared item is intercepted (`interactions.onGroundItem('Take', '*')`, registered after the
  engine default) and goes through the host; the host handles its own takes synchronously.
* Stacks merged while the `gadd` is in flight are reconciled when the host acknowledges; a `gqty` for a
  stack that was taken meanwhile becomes a new item, so nothing is lost.
* **No duplication across saves:** when a player leaves, the host deletes the items that player
  registered (they remain only in that player's own world); when the session ends, every client keeps only
  the items it registered itself. Every item therefore lives on in exactly one world.
* Limits: the registry is capped at 400 items (oldest dropped). Despawn timers run per client (ticks are
  loosely in sync); a take that reaches the host after its copy expired is denied. Systems that remove a
  shared ground item without `Take` (e.g. firemaking lighting logs) report it after the fact (`gdel`), so a
  simultaneous take by another player in that same instant could still duplicate that one item.

## 4. Host-simulated Wilderness NPCs (design, not implemented)

Goal: friends fight the same monsters (same HP, same drops) inside the Wilderness.

**Ownership.** NPC spawns whose spawn tile is in the Wilderness become *shared NPCs*. Spawn data is
identical on every client (same content, same `buildWorld()`), so a stable id can be derived from the
spawn (`npcId@spawnX,spawnY#index`). The host runs the full AI for them (`combat.js processNpc`, wander,
aggression, leash); joiners **do not** tick shared NPCs (skip them in the NPC loop – needs a small engine
hook such as `npc.remoteControlled = true` checked by `game.tick` and `combat.js`).

**State stream.** The host broadcasts at most every tick, only for NPCs that changed:
`npcs {list: [[sid, x, y, hp, anim?, target?, dead?]]}` (target = peerId or null). Joiners apply it like a
remote player: walk toward `x, y` with the existing interpolation, set `hp`, play `anim`, face `target`.
Interest management: send only NPCs within ~24 tiles of some player in the Wilderness.

**Damage.** A joiner attacking a shared NPC rolls its hit locally (own stats vs. the NPC def – the same
data on every client), shows a provisional splat and sends `npchit {sid, dmg, type, hid}` to the host.
The host applies it with `game.applyDamage(npc, dmg, {source: remotePlayer})`, broadcasts the real splat
(`npcsplat {sid, a, t, hp, hid}`) and handles retaliation (the NPC's `combatTarget` may now be a
`RemotePlayer`; NPC attacks on a remote player are sent to that player as a PvP-style `hit` with
`style` = the NPC attack type and `npc: sid`, so its client applies protection prayers and effects).

**Death and drops.** The host decides the kill, rolls the drop table and spawns the drop as a shared
ground item (section 3) owned by the player who dealt the most damage – which automatically gives the
"private for a minute, then public" behaviour. Respawns are host-timed and broadcast.

**Failure modes.** If the host leaves, the session ends anyway; joiners resume local simulation of the
NPCs (re-enable their AI, keep current positions/HP). Joining mid-fight: the host sends a full `npcs`
snapshot in `welcome`. Cheating: like PvP, damage is client-rolled; the host can clamp `dmg` to the
attacker's theoretical max hit (computable from its snapshot `levels`/`bonuses`).

**Why it is not implemented yet.** It needs engine changes (an NPC "remote-controlled" flag in the tick
and combat loops, NPC-vs-remote-player attacks in `combat.js`) owned by other agents, plus careful
testing of aggression/leash logic when the target is a remote player. The ground-item layer above is the
foundation it will reuse for drops.
