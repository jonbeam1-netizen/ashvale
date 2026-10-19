# Ashvale – shared world state in multiplayer

Owner: agent E (`src/net/*`). Transport and roles: `src/net/session.js` (star topology, the host relays).
Protocol version 2 (`net/protocol.js`; peers with another version get a clear "version mismatch").

Friends who join a world share it: the **host is authoritative for the world**, every client stays
authoritative for **its own player** (HP, prayers, inventory, bank, skills, quests – each player's own save).
Solo play (no session) runs exactly the old code paths: every hook below is inert while offline.

| What | Authority | Module |
|---|---|---|
| Players (position, look, animations, HP, prayers, skull...) | each client for itself (snapshots) | `index.js` |
| PvP hits / effects / deaths / loot | victim's client applies hits; killer spawns loot | `docs/PVP_API.md` |
| Hitsplats on players | the damaged player's client broadcasts every splat it takes (`splat`) | `index.js` |
| Projectiles / sparkles / teleports / level-ups | the client that spawned them mirrors them (`fx`) | `index.js` |
| NPCs / monsters (map spawns) | **host** simulates; joiners render + roll their own hits | `npcs.js` |
| Ground items (all non-permanent tradeable items, everywhere) | **host** | `shared.js` |
| Resource depletion (trees, rocks, picked flax/wheat), fishing spot moves, permanent item spawns | **host** | `world.js` |
| Quests, farming patches, homestead, quest-spawned bosses, hunter creatures & traps, gravestones, fires | per player (local) | – |

---------------------------------------------------------------------------------------------------

## 1. Hitsplats and HP bars on players (`splat`)

* The victim's client applies a PvP hit (`game.pvp.receiveHit`) or an NPC hit (§4) and every `'damage'` on its
  own player is broadcast as `splat {a, t, hp, mhp, hid?, src?}`. Receivers push the splat onto the
  `RemotePlayer`, update its HP immediately and show the HP bar.
* PvP: the attacker waits for the victim's `splat` with the same `hid` (`game.pvp.confirmHit`) and only shows its
  predicted splat if no answer arrives within 1.5 s.

## 2. Mirrored effects (`fx`)

`'effect'` events whose source is the local player (projectiles, cast sparkles, teleports, level-up fireworks) or
that land on a remote player are broadcast as `fx {k, at, to?, c, ms, sz, arc}`; entity references are
`{p: peerId}` (players), `{n: netSid}` (shared NPCs) or `{t: [x, y]}` (tiles). Receivers re-spawn them with
`fromNet: true` so they are never echoed back. NPC attack projectiles are not sent as `fx`: every client replays
the NPC attack itself (§4).

## 3. Shared ground items (`shared.js`)

Every **non-permanent, tradeable ground item** that appears anywhere on any client – player drops, monster drops
(rolled by the host for shared NPCs), PvP loot, death piles, ammo under a target – is registered with the host.

```
joiner -> host  gadd {lid, id, qty, x, y, owner, priv, life}     register a local item (lid = local uid)
host   -> all   gadd {nid, origin, lid?, id, qty, x, y, owner, priv, life}
joiner -> host  gtake {nid}                                       ask to pick it up
host   -> one   ggrant {nid, id, qty} | gdeny {nid}               exactly one client gets it
host   -> all   gdel {nid, to?}                                   it is gone (taken / removed)
joiner -> host  gqty {nid, add, ...}  -> host -> all gset {nid, qty}   a stack was dropped onto it
joiner -> host  gdel {nid} | {lid}                                removed locally (lit as a fire, expired early...)
host   -> new   gsync {items: [...]}                              late joiners (chunks of 150)
```

* Each client keeps an ordinary `GroundItem` (`gi.nid`), so rendering, menus, despawn timers and **privacy**
  work unchanged: `owner` + `priv` (ticks until public) are carried over – monster loot is visible only to the top
  damage dealer for 1 minute, then to everyone (OSRS-like).
* Untradeable items (quest items) are never shared: they stay in the dropping player's world only.
* `Take` on a shared item is intercepted (registered after the engine default, so it runs first) and resolved by
  the host; the host handles its own takes synchronously.
* **No duplication across saves:** when a player leaves, the host deletes the items that player registered (they
  remain only in that player's own world); when the session ends every client keeps only the items it registered
  itself. Consequence: unclaimed loot the host spawned for a joiner stays in the host's world if the joiner leaves.
* Registry cap 1500 items (oldest dropped).

## 4. Shared NPCs (`npcs.js`)

**Identity.** At start-up every NPC placed by the map builder that respawns gets `npc.netSid` = its index in the
sorted list of `id@spawnX,spawnY` keys (spawns are deterministic, so all clients agree). Excluded (stay local on
every client): Hunter creatures (they react to each player's own traps), NPCs spawned at run time by quests
(`respawn: false`: Ember Warden, Mire King + wisps, Drowned Keeper, Miner Pip...), duplicate keys. On join the
host sends `nhello {sig}` (count + hash of the key list); a joiner with a different table answers
`nready {ok: false}` and keeps simulating its own NPCs (chat warning), otherwise `nready {ok: true}`.

**Host simulates.** The host runs the normal AI for all NPCs (wander, aggression, chase, leash, combat, death,
drops, respawn). Changes in `combat.js`: aggression candidates are the local player **and** every ready joiner
(nearest eligible first; remote tolerance/busy state come from snapshot fields `tolerant` / `busyWith`),
`retaliate` accepts remote attackers, and an NPC attack on a remote player only plays the visuals – it emits
`'npc:attack' {npc, target, attack, index}` and the target's client rolls it. NPCs farther than 44 tiles from
every player are dormant (`npc.netDormant`: no wandering / aggression) while joiners are connected.

**State stream** (host → each joiner, `dm` kind `ns`, at most once per tick, only if non-empty):

```
ns { u: [[sid, x, y, hp, st, tg], ...],      // st: 0 alive, 1 dead, 2 hidden; tg: target peerId | 0
     e: [[sid, 0, amount, splatType, srcPeer|0],     // hitsplat (srcPeer = attacker, so it can skip its own)
         [sid, 1, attackIndex, targetPeer],          // NPC attack (anim + projectile; the target rolls it)
         [sid, 2, [contributorPeers], topPeer|0]] }  // death
```

*Interest management:* a record is sent only for NPCs within 32 tiles of that joiner (or fighting it) and only
when `(x, y, hp, st, tg)` changed since the last record that joiner got (per-joiner cache; leaving the interest
area forgets the entry, so re-entering resends the full record). Events are filtered the same way (deaths always
go to every contributor, attacks always to their target).

**Joiners render.** Shared NPCs are `npc.netControlled`: `game.tick` only walks them toward the host's tile
(straight line, A* if blocked, snap if > 8 tiles; 2 steps/tick when behind, so the normal per-tick interpolation
stays smooth), `combat.js` skips their AI, poison and regeneration. Records set HP (a local predicted drop wins for
1.5 s), target/facing, death (quiet death if it died out of sight), hiding and respawn (`game.respawnNpc`).

**Joiner attacks an NPC.** Unchanged combat code: the joiner rolls with its own stats against the NPC def (same
data everywhere), `game.applyDamage` runs `'damage:before'` locally (slayer visor, slayer locks...), shows the splat,
lowers the mirror's HP and calls `game.net.npcDamage` → `nhit {s, a, ty, sp?}`. The host applies it with
`game.applyDamage(npc, a, {source: remotePlayer, netRaw: true})` (no second `'damage:before'`), records the damage
per player and retaliates. XP is granted locally by the attacker as before. Status effects on a mirror are
forwarded: `neff {s, k: poison|bind|lower|drain|heal, v, sk?}`. If local code makes a mirror fight us
(retaliation after a miss, a caught pickpocket) the joiner asks with `naggro {s}`.

**NPC attacks a joiner.** The host decides target and attack (`'npc:attack'` → event 1). The target joiner replays
it with `game.combat.npcAttack(npc, player, index)`: the full normal code path – accuracy vs. its real defence,
protect prayers, dragonfire protection, poison / prayer drain / binds – and its own HP stays authoritative (its
`'damage'` is mirrored with `splat`, auto-retaliate works). Bystanders replay the visuals only.

**Death, credit, loot.** The host's `game.kill` asks `game.net.npcDeath(npc, killer)`:
* contributors = players who dealt > 0 damage; top = most damage (ties: the killer).
* every contributor's client fires `npc:death` with `killer = its own player` → slayer task credit, quest kill
  hooks; others get `killer = the top damage dealer's RemotePlayer` (or null).
* the host rolls the drop table with `owner = top damage dealer's name` → shared ground items (§3), private to
  them for 1 minute. Joiners never roll drops or schedule respawns for shared NPCs; the host's respawn arrives as
  a record.
* Co-op: friends may attack the same monster anywhere – `"Someone else is fighting that."` is no longer raised
  when the monster is fighting a remote player.

**Joining / leaving.** A new joiner keeps its local NPC positions until the first records arrive (the next tick
for everything within 32 tiles). When a joiner leaves, the host forgets it (NPCs fighting it disengage because
the target is gone). When the session ends on a joiner (it left or the host left), `deactivate()` hands control
back: NPCs resume local simulation from their current state, dead/hidden ones get a local respawn timer, targets
other than the local player are dropped. Respawns that were scheduled locally before joining are reverted to the
host's state.

**Robustness / cheating.** Damage is client-rolled like PvP (friends' worlds); the host clamps it (≤ 200), checks
the attacker is ≤ 24 tiles away and that the NPC is alive. All payloads are type/range checked.

## 5. Shared resources (`world.js`)

* **Depletion.** `game.depleteObject` now emits `'object:deplete' {object, ticks}` and restores through
  `game.restoreObject` (`'object:restore'`). Host depletions are broadcast (`odep {k, t}`); a joiner's depletion is
  sent to the host, which depletes its copy and broadcasts. The **host's** timer decides when it returns
  (`orest {k}`); joiners stretch their own timer by 60 ticks as a fallback. Gather rolls stay local, so two players
  can both get the last ore in the same tick (like OSRS). Objects are matched by `originalId@x,y`.
* **Fishing spots** move only on the host (`omove {k, x, y}`, keyed by home tile); joiners freeze their local spot
  timers (`state.moveAt = Infinity`) and unfreeze them when the session ends.
* **Permanent ground spawns** (`respawnTicks` items): a joiner's `Take` asks the host (`ptake {k}` →
  `pgrant {k, id, qty}` / `pdeny {k}`); takes by anyone are broadcast (`ptk {k}`) so every copy disappears and
  respawns on its normal timer. Other local removals are reported with `pgone {k}`.
* **Late joiners** get `osync {d: [[k, ticksLeft]], m: [[k, x, y]], p: [k]}` (depleted resources, fishing spot
  positions, taken spawns).
* Not shared (per player): farming patches (`farming.js` never depletes through the engine), the homestead,
  quest object states (`replaceObject`), thieving stalls/chests, hunter traps, fires, gravestones. A tree's
  remaining "life" counter is per client (only the depletion itself is shared).

## 6. Bandwidth

Measured with `game.net.traffic(true)` … `game.net.traffic()` (JSON bytes per peer) over 30 s / 50 ticks, both
players standing in the busiest spot of the map (107 NPCs within 32 tiles):

| direction | total | of which |
|---|---|---|
| host → joiner | **~0.8 KB/s** | NPC stream `ns` ≈ 0.57 KB/s, player snapshots ≈ 0.14 KB/s, roster/ping ≈ 0.08 KB/s |
| joiner → host | ~0.17 KB/s | snapshots, pings (+ `nhit`/`odep` when fighting / gathering) |

Quiet areas are far below that (only moving NPCs are sent). The host's CPU cost is one pass over ~490 shared
NPCs per joiner per tick.

## 7. Limitations

* Talking to a shared NPC does not stop it on the host (a joiner's dialogue partner may keep wandering).
* NPC overhead text (`game.say` on an NPC) and NPC splash/sparkle effects are not mirrored.
* Stat drains / binds on a shared NPC are applied on the joiner's mirror and on the host separately (the
  attacker's accuracy uses its mirror).
* Loot the host spawned for a joiner stays in the host's world if the joiner leaves before taking it.
* Despawn timers of ground items run per client (ticks are loosely in sync).
