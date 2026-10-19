# Ashvale balance pass (October 2026)

Data-driven review of combat pacing, skill XP rates, the combat curve, the economy and rare-drop rates, plus
the list of tuning changes made. Numbers come from a registry dump of the running game (items 859, NPCs 250,
recipes 322, shops 40) fed into small Python models (see *Method* at the end).

## Summary of changes

| Area | Change | Why |
|---|---|---|
| Combat formula | A player's hit that passes the accuracy roll deals **1..max** instead of 0..max (`PLAYER_LANDED_MIN` in `systems/combat_formulas.js`, used by `rollDamage` in `systems/combat.js`). NPC hits unchanged. | At max hit 1 half of all landed hits were 0s: a level-1 character needed ~40 s per goblin and ~65 s per cow. Doubles DPS at max hit 1, +50% at 2, ~+3% at max hit 30, so late-game balance barely moves. Misses are now the only "0" splats. |
| Early NPCs | Goblin HP 5 → **4**, cow 8 → **6**, giant rat 5 → **4** (combat levels pinned at 2 / 2 / 3). | Together with the rule above: level-1 goblin 39.5 s → **~15 s** (measured 12–15 s in game), cow 63 s → 24 s, chicken 24 s → 12 s. |
| Starter safety | Hedge wizard scatter (`npcs_spawns.js`) moved from `[106,96,120,116]` to `[113,86,119,96]`, wander 4 → 3. | Aggressive level-22 casters (range 7) spawned on top of the starter copper/tin rocks north of Brackenford and killed level-3 characters (found while testing the tutorial). |
| Fishing | Minnow catch chance `[48,256]` → `[112,256]`, perch `[32,192]` → `[64,192]`. | Level-1 fishing was ~2.1k XP/h, 4–5× slower than level-1 woodcutting/mining (8–10k). Now ~5k, level 15 ~12k. |
| Runebinding | XP per essence: rift 8.5 → 9.5, nexus 9.5 → 12, void 10 → 15, aether 10.5 → 18, crimson 11.5 → 23. | High-level runebinding capped at ~20k XP/h (5× below woodcutting/fishing at 90). Now 25k at 75, ~39k at 90 – still the slowest gathering-style skill, as intended. |
| Smithing economy | Bar values: bronze 8 → **20**, iron 28 → **70**, steel 100 → **250**, duskite 300 → **600**, verdite 640 → **1600**, azurium 2500 → **4000**, emberite 6000 → **10000**. | Bars are sold by Durnhold shops; buying bars and forging platebodies to sell/transmute was an unlimited loop (steel platebody +675 gp per 5 bars, emberite +15k). Bars are now worth ≥ 0.57 × the best per-bar item value, so buy → forge → sell/alch always loses. |
| Shop engine | Shop stock entries may carry a per-item price **`rate`** (overrides the shop's `sellRate`; `core/shops.js` `buyPrice`). | Lets raw crafting supplies be priced above their resale value without touching item (alchemy) values. |
| Raw supplies in shops | Starglass Jewels: uncut moonstone / garnet / sunstone / tidestone rate 4.5 / 6 / 7.5 / 8, cut gems 2.5, gold bar 2.0, silver bar 1.6; Ilsa's uncut moonstone 4.5. Deepdelve Supplies: coal, iron ore, duskite ore rate 2.25, gold ore 2.0, silver ore 1.6. | Buy uncut → cut → sell was +100% (uncut tidestone 200 → tidestone sells 480), gold bar + gem → amulet up to +640 gp each, shop ores → smelt → forge platebody +345 gp. Re-checked through whole recipe chains (ore → bar → item, uncut → cut → jewellery): every loop is now ≤ 0 except a handful of ≤ 19 gp crafts (bows, basic leather, cake, flour) that shop restocking caps at a few thousand gp/h. |
| Item values | Leather coif 200 → **25** (in line with other leather pieces); studded body 850 → **400**, studded chaps 750 → **350** (shop leather + one steel bar sold for +240 gp). Drake bones 1200 → **400**, wyrm bones 2600 → **900**, frost wyrm bones 5200 → **1800** (≈ 13–16 gp per Prayer XP, like giant bones). | Coif was a 100× outlier (1 leather → 120 gp sale). Bone values made dragons 5–10× more gp/h than any peer (drakeling, level 49: 158k/h). |
| Pets | Skilling pets (log / ore / fish) 1/5,000 → **1/25,000** per action. | At 1,000–1,500 actions/h a skilling pet came in ~4 h, rarer than none of the boss pets. Now ~20 h, still below boss-pet effort. |

## 1. Early pacing (level 1–10)

Model: OSRS accuracy/max-hit formulas from `combat_formulas.js`, accurate stance, starter bronze dagger,
4-tick attacks. "Measured" = in-game run on a fresh character (`?profile=ttk`).

| Target | HP before → after | TTK lvl 1 before | TTK lvl 1 after | TTK lvl 5 after | XP to level 2 |
|---|---|---|---|---|---|
| Chicken (1) | 3 | 23.7 s | **11.9 s** | 10.2 s | ~7 kills |
| Goblin (2) | 5 → 4 | 39.5 s | **15.8 s** (measured 12–15 s) | 13.6 s | ~5 kills |
| Giant rat (3) | 5 → 4 | 42.3 s | **16.9 s** | 14.2 s | ~5 kills |
| Cow (2) | 8 → 6 | 63.3 s | **23.7 s** | 20.4 s | ~4 kills |
| Practice dummy (new, never hits back) | 3 | – | **~12 s** (measured 12.6 s) | – | – |

Attack 1 → 10 now takes ~7 minutes of goblin killing (≈10k combat XP/h at level 5, ~13.7k/h including
Hitpoints); max hit 2 arrives at Strength 4 (aggressive) / 7 (accurate).

## 2. XP per hour (best available method, level 1 / 30 / 60 / 90)

Power-training models (drop, no banking for gathering; one bank trip per inventory for production, ~12 ticks):

| Skill | Lvl 1 | Lvl 30 | Lvl 60 | Lvl 90 | Method at 90 | Notes |
|---|---|---|---|---|---|---|
| Woodcutting | 9.7k | 35k | 73k | 106k | redleaf, emberite axe | |
| Mining | 8.3k | 28k | 39k | 39k | iron (3 rocks) | slowest gatherer; higher ores are slow, OSRS-like |
| Fishing | 2.1k → **5.0k** | 27k | 41k | 53k | lure spot | |
| Hunter | 4k | 28k | 74k | 124k | ember bombtails (traps) | rough model |
| Agility | 8.3k | 26k | 74k | 112k | course laps (path-length estimate) | lap times estimated, likely optimistic |
| Thieving | 4k | 36k | 64k | 166k | pickpocketing | |
| Runebinding | 8.5k | 12.8k | 16.1k → **20.4k** | 19.6k → **39.1k** | crimson altar, ~1,700 ess/h | intentionally the slow one |
| Firemaking | 40k | 91k | 204k | 423k | buyable (logs) | |
| Cooking | 22k | 86k | 207k | 244k | buyable | |
| Smithing | 14k | 71k | 152k | 253k | buyable (bars now costlier) | |
| Crafting | 24k | 166k | 338k | 338k | gem cutting, buyable | |
| Fletching | 48k | 185k | 371k | 556k | arrows (batches of 15), buyable | |
| Herblore | – (lvl 3) | 158k | 263k | 378k | buyable | |
| Construction | 52k | 144k | 336k | 566k | buyable (planks + sawmill fee) | |
| Prayer | 13.5k (bury) | | | 279k | wyrm bones at an altar | |
| Magic | | | 78k | 78k | greater transmutation (5-tick casts) | |
| Melee | 13.7k | ~25k | ~55k | ~80k | tier gear vs level-matched NPCs (no armour bonuses) | |

Bands after the pass: gathering skills sit within ~3× of each other at every level (fishing at level 1 and
runebinding at 90 were the >4× outliers); buyable skills are 2–5× faster and cost coins/materials, as intended.

## 3. Combat curve

Attackable NPCs grouped by combat level (current data):

| Band | NPCs | Median HP | Median max hit (non-dragonfire) | Highest max hit | Median drop EV (gp/kill) |
|---|---|---|---|---|---|
| 1-9 | 16 | 8 | 1 | 2 (saltmarsh_crab) | 12 |
| 10-24 | 18 | 19 | 3 | 4 (hedge_wizard) | 26 |
| 25-44 | 19 | 40 | 4 | 6 (wasteland_reaver) | 80 |
| 45-64 | 22 | 56 | 8 | 14 (grubnak_warlord, boss) | 310 |
| 65-89 | 10 | 78 | 8 | 13 (corsair_captain, boss) | 990 |
| 90-129 | 18 | 111 | 14 | 22 (pyre_fiend) | 1330 |
| 130+ | 17 | 300 | 22 | 38 (varrath_gloom_tyrant, boss) | 9254 |

* No monster has an absurd max hit for its level: the only flags were dragonfire attacks (drakeling 20,
  fen drake 35, dragons 50–60, Frostmaw 70), which are blocked to 15% by one protection and fully by two.
  The biggest non-dragonfire hit in the game is 38 (level-300 boss) – under 40% of 99 Hitpoints.
* Bosses: every boss max hit is ≤ ~1/3 of the HP of a character at the recommended level, so they are
  beatable with tier gear + food (and protection prayers, which fully block a style).
* Gear tiers (`items_metal.js`): offensive and defensive bonuses rise monotonically bronze → emberite for every
  piece (only the magic/ranged penalties grow slightly, as intended); values rise ×3.5/×12.5/×32/×80/×200/×500.
  Gilded kiteshield/platelegs have no emberite version (cosmetic gap only). Battlestaves (+35 crush/+35 str at 30
  Attack) are strong for their level but mirror the classic reference; left as is.

## 4. Economy

**Direct loops** (buy from a shop → sell to another shop or transmute): none. Every coin shop sells at
≥ 0.9 × value and buys at ≤ 0.6 × value; greater transmutation pays 0.6 × value and costs ~67 gp in sigils.

**Production loops** (all inputs buyable, output sold/transmuted for more): found and fixed

| Loop | Before (per craft) | After |
|---|---|---|
| Steel bars (Durnhold) → steel platebody | 525 → 1200 sell (+675) | 1313 → 1200 (loss) |
| Emberite bars → emberite platebody | 33,000 → 48,000 (+15,000) | 55,000 → 48,000 (loss) |
| Shop iron ore + coal → steel bar → platebody | 535 → 1200 (+665) | 1205 → 1200 (loss) |
| Uncut tidestone → tidestone | 200 → 480 (+280) | 1600 → 480 (loss) |
| Gold bar + uncut sunstone → sunstone amulet | 165 + 110 → 1026 (+750) | 300 + 750 → 1026 (loss) |
| Gold ore → gold bar → gold amulet | 150 → 270 (+120) | 300 → 270 (loss) |
| Leather body + steel studs → studded body | 21 + 105 → 510 (+384) | 21 + 263 → 240 (loss) |
| Leather → leather coif | 2 → 120 (+118) | 2 → 15 (+13, ~4k/h cap from shop stock) |

Remaining small positive margins (flour, unstrung bows, basic leather) are a few thousand gp/h at most because
shop stock restocks one unit per `restockTicks`.

**Drop value per hour** (model: player ~0.8 × NPC level + 3, tier scimitar, 3 ticks looting per kill):
starters 1–5k/h, mid levels (25–45) 3–18k/h, 45–65 10–45k/h, 65–90 80–155k/h, bosses 100–540k/h. Dragons were
the outlier (drakeling 158k/h at level 49, moss dragon 321k/h at 79) and are now 82k/h and 156k/h – still the best
non-boss earners, but they require dragonfire protection.

**Coin sinks:** shop purchases (food, sigils, ammo, supplies, now pricier raw crafting materials), tanning fees,
sawmill fees, ferry fares, pet reclaim fee, sigil cost of transmutation.

## 5. Rare drops

| Drop | Rate | Verdict |
|---|---|---|
| Boss uniques | 1/32 (Grubnak cleaver) – 1/200 (endgame) | fine; scale with boss difficulty |
| Monster uniques (wands, helms, rapier...) | 1/128 – 1/512 | fine |
| Rare drop table (shared) | ~2–3% of rolls on mid/high monsters | fine (emberite sq shield ~1/4,000–1/11,000) |
| Boss pets | 1/1,000 – 1/3,000 | fine |
| Minigame pets | 1/100 (Crucible), 1/300 (Wardens) | fine (per completed run) |
| Skilling pets | 1/5,000 → **1/25,000** per action | fixed |
| Riddle scrolls | easy 1/64 (levels 2–45), medium 1/110, hard 1/160, bosses hard 1/25 | fine: only one scroll per tier can be held |

## Method

1. In the browser console of a running game, dump the registries:
   ```js
   const r = game.registry, strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'function' ? '[fn]' : (k === 'model' || k === 'icon' ? undefined : v)));
   const ns = ['woodcutting','mining','fishing','tools','firemaking','runebinding','pickpocket','thieving_stall','agility','agility_course','hunter','bones','construction','pets'];
   const data = Object.fromEntries(ns.map((n) => [n, strip(r.allData(n))]));
   const tables = {}; for (const n of r.allNpcs()) if (n.dropTable && r.getDropTable(n.dropTable)) tables[n.dropTable] = strip(r.getDropTable(n.dropTable)); // + nested {table} refs
   copy(JSON.stringify({ items: strip(r.allItems()), npcs: strip(r.allNpcs()), recipes: strip(r.allRecipes()), shops: strip(r.allShops()), tables, data }));
   ```
2. Models (Python): expected drop-table value (nested tables, `nothing` weight, tertiaries), OSRS-style hit
   chance/max hit vs each NPC, gathering success curves (`levelChance` linear 1→99 out of 256, roll intervals:
   woodcutting 4 ticks, fishing 5, mining = pickaxe interval), production `ticks` per item + bank overhead, shop
   buy/sell/transmute prices for every recipe whose inputs are shop-buyable.
3. Spot checks in game: goblin kill times on a fresh character, full tutorial run.
