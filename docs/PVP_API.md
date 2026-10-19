# Ashvale PvP API (combat ↔ networking contract)

Owner of this contract: agent A (combat, `src/systems/pvp.js`, `src/systems/wilderness.js`).
Implemented against it: agent E (networking, `src/net/*`).

PvP only happens in the **Wilderness**. Each client is authoritative for **its own** player: the
attacker rolls damage with its local stats against the victim's snapshot, shows the hitsplat on the
`RemotePlayer` and sends the hit; the victim's client applies it (protect prayers, effects, death).

---------------------------------------------------------------------------------------------------

## 1. Snapshot fields (local → remote)

`game.player.snapshot()` (engine) emits `'snapshot'`; `pvp.js` adds:

| field | type | meaning |
|---|---|---|
| `combatLevel` | number | combat level (engine also sends it) |
| `levels` | `{attack, strength, defence, ranged, magic, hitpoints, prayer}` | **current** (boosted/drained) levels |
| `bonuses` | object (all `BONUS_KEYS`) | equipment bonus totals |
| `overheads` | `string[]` | active overhead prayer ids (`bladeward`, `arrowward`, `spellward`, `last_rites`, `second_wind`, `soulrend`) |
| `skulled` | bool | skull mark active |
| `hp`, `maxHp` | number | hitpoints (engine also sends them) |
| `stance` | string | current attack style (`accurate`, `aggressive`, `defensive`, `controlled`, `rapid`, `longrange`, `autocast`) |
| `busyWith` | `peerId` \| `'npc'` \| `null` | who the player is fighting (single-way combat rule) |

Engine fields also used: `x, y`, `dead`, `prayers` (all active prayer ids – used for the defender's
prayer multipliers), `wildernessLevel`. On the receiving side unknown keys land in `remote.extra`
(e.g. `remote.extra.levels`, `remote.extra.overheads`); `hp`, `maxHp`, `combatLevel` are copied onto the
`RemotePlayer` itself.

## 2. Functions agent E calls (`game.pvp`)

### `game.pvp.receiveHit(fromRemote, payload) -> dealt`
Call on the **victim's** client when a `hit` message arrives from `fromRemote` (a `RemotePlayer`).

```js
payload = {
  damage: 12,                 // raw damage rolled by the attacker (before protect prayers)
  style: 'melee'|'ranged'|'magic'|'typeless',   // 'stab'|'slash'|'crush' are treated as melee
  attackerName: 'Name', attackerCombat: 54, ts: Date.now(),
  // optional status effects (all optional, values are clamped on receipt):
  effect: 'bind' | 'teleblock', effectTicks: 8,
  poison: 6,                  // start poison at this damage
  drain: { skill: 'defence', amount: 12 } | { skill: 'attack', pct: 0.05 },
  drainPrayer: 3,             // Soulrend: prayer points to drain
}
```
Behaviour: records that `fromRemote` attacked first (skull logic), applies **protect prayers (40%
reduction in PvP)** for the matching style, applies effects (binds/teleblocks halved by Spellward),
then `game.applyDamage(game.player, dmg, {source: fromRemote, type, pvp: true})` which shows the splat,
triggers **auto-retaliate** (if on and the attacker is attackable) and death.

### `game.pvp.receiveLoot(fromRemote, {items: [{id, qty}], x, y})`
Call on the **killer's** client when the victim sends its loot. Spawns the items as ground items at
`(x, y)` (they last 1 hour; only the killer sees them for the first minute, then - being Wilderness items -
they are shared with every player in the world, see `docs/NET_SHARED_WORLD.md`), with a chat message.

### `game.pvp.onRemoteDeath(remote, {killerPeerId}?)`
Call when a remote player reports its death. Stops attacking it and prints
"You have defeated <name>!" if we were fighting it (or `killerPeerId === game.net.peerId`).

### `game.pvp.confirmHit(hid) -> bool`
Call on the **attacker's** client when the victim's `splat` message carries the `hid` of one of our hits
(`landHit` adds `hid` to every payload). The predicted splat is then dropped in favour of the victim's real
one; without an answer within 1.5 s the prediction is shown (see `docs/NET_SHARED_WORLD.md` §1).

### `game.pvp.bracket(remote) -> {ok, reason}`
Wilderness + level-bracket rule only. The `Attack` menu option is offered only when this is ok.

### `game.pvp.canAttack(remote) -> {ok, reason}`
Both players in the Wilderness; combat-level difference ≤ the **lower** of the two Wilderness
levels; in single-way combat neither may already be fighting someone else (`busyWith`).

## 3. Functions agent E implements (`game.net`)

| call | when |
|---|---|
| `game.net.sendHit(peerId, payload)` | every time a local hit lands on a `RemotePlayer` (payload as above). Guarded with `?.`. |
| `game.net.sendLoot(peerId, {items, x, y})` | once, when the local player dies in the Wilderness and a remote player gets the kill. If missing / offline the items drop on the ground locally instead. |

`peerId` is `RemotePlayer.peerId`; `game.net.peerId` is our own id (used for `busyWith`).

## 4. Local flow (for reference)

* **Menu:** `'menu:playerOptions'` adds `Attack` for remote players while both are in the Wilderness
  (first entry when `canAttack` is ok, so left-click attacks). Handler: `interactions.onPlayer('Attack')`.
  Spells: "Cast X -> Player" via `onSpellOnPlayer` (combat spells only on attackable players;
  `tethering_curse` is players-only and sends `effect: 'teleblock'`).
* **Attacking:** `game.combat` runs the normal combat loop against the `RemotePlayer`. Accuracy uses the
  local attack roll vs. the snapshot's `levels.defence`/`levels.magic`, `bonuses` and `prayers`. The
  splat shown locally already includes the 40% protect-prayer reduction (from `overheads`); the raw
  roll is sent and reduced again identically on the victim.
* **Skulls:** attacking someone who didn't hit you first within the last 20 minutes skulls you for
  20 minutes (`game.wilderness.isSkulled()`, snapshot `skulled`). Skulled players keep 0 items (+1 with
  Keepsake).
* **Death:** the victim keeps its 3 most valuable items (0 if skulled, +1 Keepsake). The remote that
  hit it within the last ~10 s (`game.pvp.killerOf`) gets everything else (+ bones) through
  `sendLoot`. The victim respawns in Brackenford.
* **Teleblock:** `game.wilderness.canTeleport(player) -> {ok, reason}`: false above Wilderness level 20
  or while tethered.

## 5. Events emitted

`pvp:hit {remote, payload, shown}`, `pvp:received {from, data, dealt}`, `pvp:loot {from, items, x, y}`,
`pvp:kill {remote, credited}`, `wilderness:skull {player, skulled}`, `combat:death {player, x, y, wild, kept, lost, killer}`.

## 6. Testing without networking

```js
const r = game.addRemotePlayer('peer-test', { name: 'Rival', x: game.player.x + 2, y: game.player.y,
  combatLevel: game.player.combatLevel, hp: 40, maxHp: 40, wildernessLevel: 10,
  levels: { attack: 40, strength: 40, defence: 40, ranged: 1, magic: 1, hitpoints: 40, prayer: 1 },
  bonuses: {}, overheads: [], prayers: [] });
game.teleport(game.player, 96, 38);                          // Wilderness level 10
game.net.sendHit = (id, p) => console.log('sendHit', id, p); // capture outgoing hits
game.pvp.receiveHit(r, { damage: 5, style: 'melee' });       // incoming hit
game.pvp.onRemoteDeath(r);
```
