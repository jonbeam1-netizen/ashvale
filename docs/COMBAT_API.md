# Ashvale combat, prayer, magic & death – data fields and APIs

Owner: agent A (`src/systems/combat*.js`, `prayer.js`, `magic.js`, `death.js`, `wilderness.js`, `pvp.js`,
`src/content/spells.js`, `src/content/prayers.js`). PvP networking contract: `docs/PVP_API.md`.

## Formulas (OSRS-style, `systems/combat_formulas.js`)
* Effective level = `floor(level × prayer) + stance + 8` (players), `level + 9` (NPCs). Stances:
  accurate +3 att (+3 ranged), aggressive +3 str, defensive +3 def, controlled +1 each, longrange +3 def.
* Attack roll = effective × (attack bonus + 64); defence roll = effective defence × (defence bonus + 64);
  vs magic, players defend with `floor(0.7 × magic + 0.3 × defence) + 8`, NPCs with their Magic level.
* Hit chance: `a > d ? 1 − (d+2)/(2(a+1)) : a/(2(d+1))`; damage uniform 0..max on a hit.
* Max hit melee `floor(0.5 + effStr × (str + 64) / 640)`; ranged same with ranged strength;
  magic = spell max × (1 + magicDamage%/100).
* XP: 4 per damage to the style's skill(s) (split for controlled / longrange) + 1.33 Hitpoints;
  magic: spell base XP on cast + 2 per damage + 1.33 HP.
* Speed: weapon `attackSpeed` (rapid −1), spells 5 ticks (`spell.speed`). Hit delay: melee 0,
  ranged `1 + floor((3+d)/6)`, magic `1 + floor((1+d)/3)` ticks.

## Item fields
| field | meaning |
|---|---|
| `weaponType` | attack styles (see below). Any weapon type with `ranged: true` is a ranged weapon. |
| `attackRange` | tiles (overrides weapon type; melee default 1, halberds 2) |
| `ammoType` (weapon) | `'arrow'` / `'bolt'` / custom; default `arrow` for bows, `bolt` for crossbows |
| `ammoType` (ammo) | which launchers fire it (default guessed from the id: `*arrow*`, `*bolt*`) |
| `ammoMax` (weapon) / `ammoLevel` (ammo) | tier limit: ammo with `ammoLevel > ammoMax` can't be fired |
| `thrown: true` | weapon consumes itself (darts, knives, javelins); its `rangedStrength` counts |
| `rangedStrength` (bonus) | from ammo (bows) or the thrown weapon |
| `projectileColor` | ammo / thrown projectile colour (number or `'#rrggbb'`) |
| `ammoSave: 0.7` | (cape/neck/ring/hands) chance a fired piece of ammo returns to the quiver |
| `poisonous: true`, `poisonDamage` | weapon (melee / thrown) or ammo: 25% chance to poison on a damaging hit |
| `aoe: true` | ranged weapon also hits NPCs next to the target in multi-combat |
| `providesSigil: 'fire_sigil'` or `['fire_sigil','earth_sigil']` | infinite supply of those sigils (staves) |
| `special: { id, cost }` | special attack (ids below) |
| `antiDragonfire: true` | shield (or neck/body/cape) that counts as one dragonfire protection |
| `prayerXp` (+ option `Bury`) | buryable bones (or `registerData('bones', id, {xp})`) |
| `prayer` (bonus) | slows prayer drain: 1 point per `60 + 2 × bonus` drain units |

Ammunition: 80% of fired ammo drops under the target (visible to you), the rest breaks.

### Weapon types added by combat (only if no one registered them first)
`shortbow longbow crossbow thrown dart knife javelin halberd claws whip battlestaff`
(engine: `unarmed sword dagger scimitar longsword axe pickaxe mace warhammer spear twohanded bow staff`).
Weapon-type fields read: `ranged`, `thrown`, `ammoType`, `attackRange`, styles[`style` = `autocast`].

## Special attacks (`systems/combat_specials.js`)
`twin_fang` (2 hits, +15%), `shatter` (+25% acc/dmg, lowers Defence by damage), `soul_harvest`
(heal ½ dmg, prayer ¼), `unerring_strike` (never misses), `venom_rend` (poisons), `hamstring` (binds 6 s),
`whirlwind` (hits up to 2 extra adjacent foes in multi), `twin_shot` (ranged, 2 arrows),
`piercing_shot` (ranged, ×2 accuracy), `war_cry` (instant: −10% att/def/rng/mag, +str).
Register more: `game.combat.registerSpecial(id, {name, cost, modes, hits, accuracy, damage, alwaysHit,
minHitPct, onHit(ctx, dmg), instant(ctx), extraTargets(ctx)})`. Energy regenerates 10% / 30 s (engine).

## NPC fields
| field | meaning |
|---|---|
| `aggressive`, `aggroRange` | aggression. Ignored when the player's combat level > 2× the NPC's or after 10 min in the same area (tolerance) – both only **outside** the Wilderness |
| `alwaysAggressive: true` | ignore level/tolerance rules |
| `leashRange` (default 10) | max tiles beyond `wanderRadius` from spawn before it gives up and walks home |
| `chaseRange` (default 16) | max distance to its target |
| `attackStyle`, `maxHit`, `attackRange`, `attackSpeed`, `projectileColor`, `attackAnim` | single attack |
| `attacks: [{ style, type?, maxHit, weight, range, speed?, projectileColor, projectileSize, anim, message, accuracy?, ignoresProtect?, effect?, effectChance?, ... }]` | multi-style attacks; picked by weight among those in range |
| `poisonous: true`, `poisonDamage` | melee attacks may poison (25%) |
| `immunePoison`, `immuneBind` (or `immune: {poison, bind}`) | immunities (size ≥ 3 can't be bound) |

Attack `effect`s: `'poison'` (`poison` = start dmg), `'drain_prayer'` (`drainAmount`, default damage
dealt), `'bind'`/`'freeze'` (`bindTicks`/`freezeTicks`, default 8), `'heal'` (NPC heals the damage),
`'drain_<skill>'` (`drainAmount`), `'dragonfire'` (always lands; each protection – antiDragonfire item,
Spellward, antifire potion – cuts it to 15%, two or more block it), `'aoe'` (splash visual).
Protect prayers fully block NPC attacks of their style unless `ignoresProtect`.
`npc.state.overhead = 'ward_melee'` draws an overhead icon on an NPC (bosses).

## Spells (`src/content/spells.js`, `systems/magic.js`)
Elemental ladder (wind/water/earth/fire): **Dart** (1–13, max 2–8), **Lance** (17–35, 9–12,
`rift_sigil`), **Torrent** (41–59, 13–16, `void_sigil`), **Tempest** (62–75, 17–20, `aether`+`void`),
**Cataclysm** (81–95, 21–24, `aether`+`crimson`). Utility combat spells: `bewilder`/`enfeeble`/`hex`
(−5% att/str/def), `rootgrasp`/`thornbind`/`ironroot` (binds), `blight` (poison), `lifesap` (heals),
`tethering_curse` (players only, teleblock). Combat spell fields: `maxHit, projectile, element, tier,
autocast, bind, poison, heal, drain: {skill, pct}, teleblock, playersOnly, speed`.

Sigils: `wind water earth fire mind` (basic), `thorn rift nexus void aether crimson` (+`_sigil`).

`game.magic`: `hasSigils(spell[, player])`, `consumeSigils(spell[, player])`, `canCast(player, spell)`,
`sigilCount`, `infiniteSigils`, `castUtility(player, spell, target)`, `autocastSpell()`. Utility spells:
`spell.onCast(game, player, target)` – return `false` to cancel; otherwise sigils are consumed and
`spell.xp` awarded. Targets: `null`, Npc, RemotePlayer, `{item, slot}`, WorldObject (`targets:
['object']`, optional `objects: [ids]`), GroundItem. Teleports: always check
`game.wilderness.canTeleport(player)`.

## `game.combat`
`attack(target)`, `castOn(target, spell)`, `stop()`, `attackMode(p)`, `attackSpeed(p)`, `attackRange(p)`,
`maxHit(p)`, `poison(target, dmg)`, `curePoison(player, immunityTicks)` (antipoison), `isPoisoned()`,
`setAntifire(player, ticks, super)`, `bind(target, ticks)`, `isBound()`, `lowerStat(target, skill, n)`,
`drainPct(target, skill, pct)`, `registerSpecial`, `lastHit()`, `inCombat(ticks)`, `formulas`,
`npcAttack(npc, target, index, opts)` (multiplayer replay of a host-decided NPC attack, see `docs/NET_SHARED_WORLD.md` §4).
Every NPC attack emits `'npc:attack' {npc, target, attack, index, fromNet}`. Multiplayer co-op: "Someone else is
fighting that." is not raised when the monster is fighting a remote player; on the host, aggressive NPCs also
consider joiners (`snapshot.tolerant` / `busyWith`).
Poison state: `player.store('combat').poison = {dmg, hits, timer}`; immunity `poisonImmune` (ticks).

## `game.prayer`
`multiplier(p, key)`, `isActive`, `has(p, effectKey)`, `isProtected(p, style)`, `activate/deactivate/toggle`,
`deactivateAll`, `drainPoints(p, n)`, `restorePoints(p, n)` (prayer potions), `toggleQuick`, `overheadIds`.
Prayer def fields: `level, drain, categories, effects, overhead, requires` (see `content/prayers.js`).

## `game.death` / `game.wilderness`
`game.death.itemsKeptOnDeath(player)`, `graves()`. `game.wilderness.canTeleport(p)`, `isSkulled`, `skull`,
`clearSkull`, `teleblock`, `isTeleblocked`, `level()`.
