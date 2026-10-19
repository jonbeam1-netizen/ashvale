# Ashvale – Engine Architecture & Contracts

Ashvale is an original tick-based fantasy MMO-style game for the browser. Static site (GitHub Pages):
**no build step, no npm, no node**. Plain ES modules under `src/`, loaded by `index.html`.
three.js `0.169.0` comes from jsdelivr via the import map (`three`, `three/addons/`). PeerJS 1.5.4 is
loaded globally (`window.Peer`) by `index.html` for the networking module.

Originality rule: every name, place, item, monster, quest and piece of text must be our own. Never use
Jagex/RuneScape names or assets. Mechanics (ticks, 23 skills, 28 slots, XP curve, wilderness) are fine.

Run locally: `python -m http.server 8123` in the repo root (or the `game` launch config), open
`http://localhost:8123`. `window.game` is exposed for console debugging.

---------------------------------------------------------------------------------------------------

## 1. File layout & ownership

> **Status:** the parallel build phases are finished and the ownership rules below **no longer apply** –
> any module may be edited (keep changes coherent and update this document). The table is kept as a map
> of *who wrote what* and where each feature lives.

| Path | Original author | Purpose |
|---|---|---|
| `index.html`, `css/style.css` | engine | page shell, all HUD styling |
| `src/main.js` | engine | bootstrap order |
| `src/core/*` | engine | registry, game, events, skills, containers, actions, interactions, save, shops, drops, weapon types, defaults |
| `src/world/*` | engine | world grid, terrain types, map builder, A* |
| `src/entities/entities.js` | engine | Player, Npc, RemotePlayer, WorldObject, GroundItem |
| `src/render/*` | engine | three.js renderer, models, terrain, scenery, characters, overlays, effects, camera |
| `src/input/input.js` | engine | picking, menus |
| `src/ui/*` | engine | HUD, tabs, interfaces, icons |
| `src/content/index.js`, `src/systems/index.js` | engine | **fixed** import lists – do not edit |
| `src/systems/combat*.js`, `prayer.js`, `death.js`, `wilderness.js`, `pvp.js`, **`magic.js`**, `src/content/prayers.js`, **`src/content/spells.js`** (combat spells + sigils) | **A** combat/prayer/magic core/death/wilderness/PvP |
| `src/systems/gathering*.js`, `hunter.js`, `farming.js`, `src/content/gathering*.js` (all resource placement in `gathering_spawns.js`) | **B** woodcutting/mining/fishing/hunter/farming |
| `src/systems/production*.js`, `firemaking.js`, `herblore.js`, `runebinding.js`, `construction.js`, `src/content/recipes*.js` | **C** smithing/cooking/firemaking/crafting/fletching/herblore/runebinding/construction |
| `src/content/items*.js`, `npcs*.js` (all vale NPC spawns in `npcs_spawns.js`), `objects.js`, `scenery_*.js`, `visuals.js`, `drops.js`, `shops.js`, `map.js`, `map_regions/*.js` | **D** items/NPCs/world content/map |
| `src/net/*` | **E** multiplayer |
| `src/systems/agility.js`, `thieving.js`, `slayer.js`, `quests.js`, `magic_utility.js`, `src/content/agility*.js`, `thieving.js`, `slayer.js`, `quest*.js`, **`src/content/spells_utility.js`** (teleports, alchemy, other utility spells) | **F** agility/thieving/slayer/utility magic/quests |

`src/content/index.js` and `src/systems/index.js` list the top-level modules; feature files import their
own helpers (e.g. `npcs.js` imports `npcs_spawns.js`, `gathering.js` imports `gathering_spawns.js`).

**Content placement rule.** Register content in your own content file. Items/objects that belong to a
skill live in that skill's content file (logs/ores/fish/trees/rocks → `gathering.js`; bars/cooked food/
fire → `recipes.js`; sigils → `spells.js`; stalls → `thieving.js`; obstacles → `agility.js`). Generic
equipment, food, tools, NPCs, scenery and the map belong to D. Ids are global and **snake_case**; the
registry warns on duplicates (later wins). Any module may call `registerSpawn` to place its own things.

### Boot order (`src/main.js`)
1. `core/weapontypes.js`, `content/index.js` (all registrations run at import time)
2. `game.buildWorld()` – paints terrain, resolves spawns, creates the local `Player`
3. `game.shops`, engine default interaction handlers (`core/defaults.js`)
4. load save (if any) → `RenderManager` → `UIManager` → `InputManager`
5. `initSystems(game)` – each `src/systems/*.js` `init(game)` in the order of `systems/index.js`
   (magic, prayer, combat, death, wilderness, gathering, production, agility, thieving, slayer, quests)
6. `net.init(game)` → render loop → character creation (first run only) → `game.start()` → welcome/tips
   in chat → `'game:ready'`

Loading screen: an inline script in `index.html` counts module downloads (PerformanceObserver) into the
progress bar; `main.js` then reports its phases via `window.ashvaleLoading(text, fraction)` (and
`performance.mark('ashvale:<phase>')`). Whole boot is ~1 s after the ~125 module files arrive.

Systems registered in step 5 override engine defaults from step 3 (see Interactions precedence).

---------------------------------------------------------------------------------------------------

## 2. Conventions

* **Coordinates**: integer tiles `(x, y)`; `x` grows **east**, `y` grows **south** (`y = 0` is the far
  north). 3D: world X = x, world Z = y, Y up; tile centre is `(x + 0.5, y + 0.5)`. 1 unit = 1 tile.
* **Tick** = 600 ms (`TICK_MS`). All game logic runs in ticks; rendering interpolates between ticks.
* Durations in content are **ticks** unless the field name says `ms`.
* Colours are CSS hex strings (`'#b0793e'`). Chat text supports `<col=rrggbb>…</col>` markup.
* Character facing: `faceAngle` radians, `atan2(dx, dy)`; 0 = facing south (+y).

### Original metal tiers (`METAL_TIERS` in `core/constants.js`)
| id | name | wield/wear level | colour |
|---|---|---|---|
| bronze | Bronze | 1 | `#b0793e` |
| iron | Iron | 10 | `#6f6c6a` |
| steel | Steel | 20 | `#a3abb4` |
| duskite | Duskite | 30 | `#4b3a63` |
| verdite | Verdite | 40 | `#3e9461` |
| azurium | Azurium | 50 | `#3b70c8` |
| emberite | Emberite | 60 | `#c8452a` |

Ores: `copper_ore`, `tin_ore`, `iron_ore`, `coal` exist; add `duskite_ore`, `verdite_ore`, `azurium_ore`,
`emberite_ore`. Item id pattern: `<tier>_<piece>` e.g. `steel_platebody`, `duskite_scimitar`, `<tier>_bar`.

### Other original names in use
Skill "Runebinding" (makes **sigils**: `wind_sigil`, `water_sigil`, `earth_sigil`, `fire_sigil`,
`mind_sigil` from `pale_essence`). Trees: Tree (`tree_normal`), Birch, Weepwood, Redleaf, Ironbark,
Starwood. Places: Brackenford (start), Highmarch, Thornwood, Greystone Quarry, Silverrun river,
Mirrowmere lake, Haverly Farms, Murkfen Swamp, Saltmarsh Coast, Gloomhollow Depths, the Wilderness
(Ashen Wastes, Frostfang Peaks, Calder Ruins).

### Skills (ids)
`attack strength defence ranged prayer magic runebinding construction hitpoints agility herblore
thieving crafting fletching slayer hunter mining smithing fishing cooking firemaking woodcutting farming`

---------------------------------------------------------------------------------------------------

## 3. Registry (`src/core/registry.js`)

All functions are named exports (also on the default `registry` object and `game.registry`).
`register*(def)` stores and returns the normalised def; `get*(id)` returns it or `undefined`;
`all*()` returns an array.

| Kind | register | lookup |
|---|---|---|
| item | `registerItem` | `getItem`, `allItems` |
| npc | `registerNpc` | `getNpc`, `allNpcs` |
| object (scenery) | `registerObject` | `getObject`, `allObjects` |
| recipe | `registerRecipe` | `getRecipe`, `allRecipes`, `recipesFor(skill)` |
| shop | `registerShop` | `getShop`, `allShops` |
| spell | `registerSpell` | `getSpell`, `allSpells` |
| prayer | `registerPrayer` | `getPrayer`, `allPrayers` |
| quest | `registerQuest` | `getQuest`, `allQuests` |
| dialogue | `registerDialogue(id, nodes)` | `getDialogue(id)` → `{id, nodes}` |
| drop table | `registerDropTable` | `getDropTable` |
| weapon type | `registerWeaponType` | `getWeaponType(id)` (falls back to `unarmed`) |
| map config | `setMapConfig(partial)` | `getMapConfig()` |
| area | `registerArea` | `allAreas()` |
| terrain paint | `registerPaint(op)` | `getPaintOps()` |
| spawn rule | `registerSpawn(rule)` | `getSpawns()` |
| free-form data | `registerData(ns, id, value)` | `getData(ns, id)`, `allData(ns)` → `[[id, value]...]` |

Use `registerData` for anything without a dedicated registry (skill node data, tools, slayer masters…).
Namespaces in use: `woodcutting`, `mining`, `fishing`, `tools`, `firemaking`, `bones`, `agility`,
`thieving_stall`, `pickpocket`, `slayer_master`, `starter` (`kit` = new-player items).

### 3.1 Item
```js
registerItem({
  id: 'bronze_sword',            // required, snake_case
  name: 'Bronze sword',          // required
  examine: 'A razor-sharp sword.',// default "It's a <name>."
  stackable: false,              // stacks in inventory
  value: 26,                     // base coin value (shops, alchemy)
  tradeable: true,
  destroy: false,                // true -> 'Destroy' instead of 'Drop'
  options: ['Wield'],            // inventory options shown before Use/Drop/Examine (auto-filled for equipment & food)
  // equipment (any item with `slot` is equippable)
  slot: 'weapon',                // head|cape|neck|ammo|weapon|body|shield|legs|hands|feet|ring
  requirements: { attack: 1 },   // skill -> level to equip
  bonuses: {                     // missing keys default to 0 (BONUS_KEYS)
    attackStab: 4, attackSlash: 3, attackCrush: -1, attackMagic: 0, attackRanged: 0,
    defenceStab: 0, defenceSlash: 0, defenceCrush: 0, defenceMagic: 0, defenceRanged: 0,
    strength: 5, rangedStrength: 0, magicDamage: 0, prayer: 0,
  },
  attackSpeed: 4,                // ticks (weapons; default 4)
  weaponType: 'sword',           // see weapon types (default 'unarmed')
  twoHanded: false,              // removes shield when wielded
  special: null,                 // free-form, for agent A (spec bar enabled when truthy)
  equipOptions: [],              // extra right-click options in the Equipment tab
  // consumables
  heal: 5,                       // food: HP healed by the default 'Eat' handler (adds 'Eat' option)
  eatReplace: 'half_pie',        // optional item left behind after eating
  doses: 4,                      // potions (icon fill level)
  // presentation
  color: '#b0793e',              // material colour (fallback for icon/model)
  icon: { shape: 'sword', color: '#b0793e', color2: '#c8a040' },
  model: { shape: 'sword', color: '#b0793e', color2: null }, // worn/held look (defaults from icon)
});
```
**Icon shapes** (`src/ui/icons.js`): `generic sword longsword dagger scimitar axe pickaxe mace hammer
spear staff bow arrow helm fullhelm hood hat platebody chainbody robe_top legs skirt shield sq_shield
round_shield boots gloves cape ring amulet ore bar log fish bones rune essence potion coins bread pie meat
cake herb gem seed tinderbox knife chisel needle bucket pot feather string egg key scroll book bag`
(+ skill/tab shapes `fist star heart mask skull paw anvil flame tree sprout chef boot stats smile gear`).
Add new ones with `registerIconShape(name, (ctx, color, color2, def, qty) => {...})` (36×32 canvas).

**Model shapes** (worn): weapons `sword longsword twohanded scimitar dagger axe pickaxe mace warhammer
spear staff bow`; head `med_helm full_helm hood wizard_hat coif`; body `platebody chainbody robe_top`;
legs `platelegs skirt robe`; shield `kite square round`; cape (uses `color`/`color2`); feet/hands/neck use
`color`. If `model.shape` is omitted it is derived from `icon.shape`.

### 3.2 NPC
```js
registerNpc({
  id: 'goblin', name: 'Goblin', examine: 'An ugly green creature.',
  combatLevel: 2,                          // 0 = no "(level-N)" in menus
  stats: { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 5 },
  bonuses: { /* same keys as items */ },
  attackSpeed: 4, maxHit: 1,
  attackStyle: 'crush',                    // stab|slash|crush|ranged|magic
  attackRange: 1,                          // tiles (1 = melee)
  aggressive: false, aggroRange: 3,
  wanderRadius: 3,                         // tiles from spawn (spawn rules can override)
  respawnTicks: 30,
  size: 1,                                 // footprint N x N
  dropTable: 'goblin',
  options: ['Attack'],                     // right-click options ('Talk-to', 'Trade', 'Bank', 'Pickpocket'...)
  dialogue: 'dialogue_id',                 // used by default 'Talk-to'
  shop: 'shop_id',                         // used by default 'Trade'
  mapIcon: { char: '$', color: '#e8c040' },// optional minimap marker at spawn
  model: {
    template: 'goblin',                    // see templates below
    colors: { skin: '#6a9a3a', top: '...', legs: '...', hair: '...', boots: '...', hands: '...', eyes: '...',
              body: '...', belly: '...', spots: '...' /* quad/creature keys */ },
    scale: 1,
    equipment: { weapon: 'bronze_dagger', shield: { shape: 'round', color: '#888' } }, // item ids or visuals (bipeds)
    female: false, hairStyle: 'short',     // short|long|bald
    extras: { horns, wings, tail, ears, nose, beard, glowEyes },
  },
});
```
**Character templates** (`render/models.js`): `human goblin imp skeleton zombie giant demon golem`
(bipeds), `cow wolf rat dragon` (quadrupeds), `spider chicken bat`. Add more with
`registerCharacterTemplate(name, opts => rig)` (+ `registerAnimator(kind, fn)` for a new rig kind).

### 3.3 Object (scenery)
```js
registerObject({
  id: 'tree_normal', name: 'Tree', examine: 'A tree.',
  size: [1, 1],            // footprint [w, h] in tiles (unrotated)
  blocks: true,            // blocks movement
  options: ['Chop down'],  // right-click options (first = left-click default); Examine is automatic
  depleted: 'tree_normal_stump', // id swapped in by game.depleteObject(); omitted -> object hides
  respawnTicks: [15, 30],  // number or [min,max] used by depleteObject when no ticks given
  interactRange: 1,        // default walk-to range for this object (1 = cardinally adjacent)
  teleport: { x, y, message }, // default handler for Climb-up/Climb-down/Climb/Enter/Exit/Go-through/Squeeze-through
  openId / closedId,       // doors: default 'Open'/'Close' swap
  readText: '...',         // default 'Read'
  mapIcon: { char: 'F', color: '#ff8030' },
  minimap: 'rock',         // optional minimap look: '#rrggbb' | 'wall' | 'fence' | 'door' | 'tree' | 'bush' | 'rock' | 'block' | false
                           // (default: derived from model.template, see ui/minimap.js KIND_BY_TEMPLATE)
  model: { template: 'tree', variant: 'oak-like', /* template params */ },
});
```
**Scenery templates**: `tree` (variants `normal birch weepwood redleaf ironbark starwood pine dead
snowpine`), `stump`, `bush` (`berries`), `flowers`, `rock` (`ore` colour, `depleted`), `boulder`,
`fishing_spot` (animated), `fire` (animated + light), `wall` (`variant stone|wood|plaster|dark|brick`,
`height`), `fence`, `stone_wall_low`, `door` (`open`), `ladder` (`down`), `furnace`, `anvil`, `range`,
`bank_booth`, `altar`, `crate`, `barrel`, `table`, `stall` (`cloth`, `goods`), `well`, `lamp`, `sign`,
`chest`, `cave_entrance`, `rope`, `log_balance`, `pillar` (`broken`), `ruin`, `gravestone`, `hay`,
`ditch`, `portal`, `obelisk` (`glow`). Add more with `registerSceneryTemplate(name, (b: GeoBuilder, params)
=> {...})`; params include `w`, `h` (footprint). Static templates are merged + instanced per variant;
pass `{ animated: true, create(model) -> Object3D with userData.update(t) }` for animated ones. A
model faces +z (south) at `rot: 0`; `rot` is quarter turns clockwise.

### 3.4 Recipe
```js
registerRecipe({
  id: 'smelt_bronze', skill: 'smithing', category: 'smelt', level: 1, xp: 6.2,
  inputs: [{ id: 'copper_ore', qty: 1 }, { id: 'tin_ore', qty: 1 }],
  outputs: [{ id: 'bronze_bar', qty: 1 }],
  tools: ['hammer'],          // required, not consumed
  station: 'furnace',         // object id, array of ids, or null (inventory)
  ticks: 4,                   // ticks per item
  failChance: 0.5,            // optional flat failure chance
  burnStop: 34, failOutput: 'burnt_fish', // cooking-style failure that falls to 0 at burnStop
});
```
### 3.5 Shop
```js
registerShop({ id, name, currency: 'coins', sellRate: 1.0 /* price = value*sellRate */,
  buyRate: 0.4 /* shop pays value*buyRate */, general: false /* buys any tradeable */,
  restockTicks: 20, stock: [{ id: 'bronze_axe', qty: 5 }] });
```
Runtime: `game.shops.stock(id)`, `buyPrice(id,item)`, `sellPrice(id,item)`, `buy(player,id,item,n)`,
`sell(player,id,item,n)`; event `'shop:change' {shopId}`.

### 3.6 Spell, Prayer, Quest, Drop table, Weapon type
```js
registerSpell({ id, name, level, xp, book: 'standard', type: 'combat'|'teleport'|'utility'|'alchemy'|'enchant',
  runes: { wind_sigil: 1, mind_sigil: 1 }, targets: [] | ['npc','player'] | ['item'] | ['object'],
  maxHit, teleport: { x, y }, projectile: 0xffffff, icon: { shape, color }, description });
registerPrayer({ id, name, level, drain /* per-tick drain units, 1 point lost per 60+2*prayerBonus units */,
  group /* mutually exclusive group */, effects: { attack: 1.05, ... , protect: 'melee' }, icon, description });
registerQuest({ id, name, difficulty, questPoints, completeStage: 100, start, description, rewards: [...],
  journal: (stage, ctx) => ['line', '<col=ff0000>red</col>'], onComplete: ({game, player}) => {} });
registerDropTable({ id, always: [{id, qty}], main: [{ id, qty: 5 | [min,max], weight } | { table: 'other', weight }],
  rolls: 1, nothing: 0 /* weight of an empty roll */, tertiary: [{ id, qty, chance: 0.01 }] });
registerWeaponType({ id, ranged?: true, styles: [{ name, type: 'stab'|'slash'|'crush'|'ranged'|'magic',
  style: 'accurate'|'aggressive'|'defensive'|'controlled'|'rapid'|'longrange'|'autocast', xp: ['attack'], anim: 'slash' }] });
```
Defaults (`core/weapontypes.js`): `unarmed sword dagger scimitar longsword axe pickaxe mace warhammer
spear twohanded bow staff`. `rollDropTable(id)` (`core/drops.js`) → `[{id, qty}]`.

### 3.7 Dialogue
`registerDialogue(id, nodes)` where `nodes` is an array or `(ctx) => array`. ctx = `{game, player, npc, ...}`.
Node types (any text may be a `(ctx) => string`; `label` names a node for `goto`):
```js
{ npc: 'Hello!', name?: 'Override name' }      // NPC line (click/space to continue)
{ player: 'Hi.' }                             // player line
{ message: 'Plain text.' }                    // no speaker
{ title?: 'Select an Option', options: [      // option list (keys 1-9)
    { text, goto?: 'label', action?: (ctx) => string|false|void, end?: true, if?: (ctx) => bool } ] }
{ action: (ctx) => 'label' | false | void }   // run code; string = goto, false = end
{ if: (ctx) => bool, goto: 'label', else?: 'label' }
{ goto: 'label' }   { end: true }             // any node may also carry goto / end (applied after continue)
```
Open with `game.ui.startDialogue(idOrNodes, { npc, player })`. Events: `'dialogue:start'`, `'dialogue:end'`.

---------------------------------------------------------------------------------------------------

## 4. Map data (`src/content/map.js`, owner D)

World is built once after all content imports: base terrain + fBm hills → paint ops in order →
building floors → liquids (water lowered, blocked) → sandy shores → border blocked → vertex heights →
areas → spawn rules in order.

`setMapConfig({ width: 288, height: 256, seed, baseTerrain: 'grass', waterLevel: 0, hillAmplitude,
spawn: {x,y}, respawn: {x,y}, wildernessEdgeY: 48, shores: true })` (current world: **288 × 256**, spawn and
respawn `(96,141)` in Brackenford's square).

Where things are placed: `map.js` + `map_regions/*.js` paint terrain and place scenery/buildings (and the
NPCs of the newer regions); **all vale NPC spawns** are in `content/npcs_spawns.js`; **all gathering
resources** (trees, rocks, fishing spots, hunter creatures, farming patches) are in
`content/gathering_spawns.js`; quest NPCs/objects live with their quest (`quests_*.js`).

**Terrain types** (`src/world/terrain.js`): `grass dark_grass dirt sand stone snow water cobble wood_floor
wild_grass ash swamp cave_floor void lava farmland ditch mountain stone_floor flowers`. Unwalkable:
`water void lava mountain`. Add more with `addTerrainType({id, color, var, walkable, liquid, natural,
minimap})` at import time (append only).

**Paint op** `registerPaint({...})`:
| field | meaning |
|---|---|
| `shape` | `'rect'` (`x0,y0,x1,y1` inclusive) · `'circle'` (`cx,cy,r`) · `'line'` (`points:[[x,y]...]`, `width`) · `'poly'` (`points`) · `'all'` |
| `terrain` | terrain id to set |
| `height` | set tile height (blended by `falloff`) |
| `raise` | add to height · `noise: {amp, scale}` adds fBm |
| `falloff` | tiles over which height edits fade in from the edge |
| `jitter` | noisy edges (tiles) |
| `blocked` | `true` / `false` force collision |
| `noScatter` | scatter rules skip these tiles (roads, towns) |
| `only` / `except` | terrain id lists filtering affected tiles |

**Areas** `registerArea({ id, name, x0, y0, x1, y1, priority, safe?, multi?, dungeon? })` – highest
priority containing the tile wins. `safe` areas never count as Wilderness; `dungeon` switches the sky
to cave darkness + player torch light; `multi` enables multi-combat (`world.isMulti`).

**Spawn rules** `registerSpawn({...})`:
| type | fields |
|---|---|
| `object` | `id, x, y, rot?, w?, h?` (w/h override footprint, e.g. the 190-tile ditch) |
| `npc` | `id, x, y, wander?` |
| `item` | `id, qty, x, y, respawnTicks` – permanent ground spawn |
| `line` | `id, points:[[x,y]...], gaps:[[x,y]...]` – fences/walls along segments (auto-rotated) |
| `building` | `x, y, w, h, wall: 'wall_stone', floor: 'wood_floor', roof: '#7a3a2a' \| false, doors: [{side:'n'\|'s'\|'e'\|'w', offset, width}], doorObject?: 'door_wood', name, height?` – perimeter walls, floor, flattened ground, roof mesh (hidden while the player is inside) |
| `scatter` | `ids: ['a', {id:'b', weight:3}], kind: 'object'\|'npc', rect: [x0,y0,x1,y1], circle?: [cx,cy,r], count \| density, seed, spacing (objects), terrain?: [ids] (default natural terrains), water?: true (water tiles next to land), wander?, indoors? (npc)` |

Spawn resolution order: all scenery/item/building rules first (in registration order), **then** all NPC
rules, so a creature never starts inside a rock or wall placed by a later rule. NPC rules: a fixed `npc`
spawn on a blocked/occupied tile moves to the nearest free tile (≤ 5); NPC scatters only use free,
walkable, outdoor tiles (`indoors: true` allows house floors) and ignore `noScatter`/natural-terrain
filters (creatures may roam roads and towns). Object scatters: walk-over decoration (non-blocking objects
without options – grass tufts, pebbles, lily pads) doesn't count against `spacing` for real scenery and is
removed from its footprint; decoration itself keeps clear of everything. Each scatter rule records
`rule._placed` (compare with `count` when tuning).

### World queries (`game.world`)
`width, height` · `inBounds(x,y)` · `terrainAt(x,y)` → terrain def · `isWalkable(x,y)` ·
`canStep(x,y,dx,dy)` · `isWater(x,y)` · `heightAt(fx,fy)` (continuous) · `tileCenterHeight(x,y)` ·
`getArea(x,y)` / `getAreaName(x,y)` · `getWildernessLevel(x,y)` (0 outside; `edgeY - y` inside) ·
`isWilderness(x,y)` · `isMulti(x,y)` · `buildingAt(x,y)` · `objectsAt(x,y)` · `refreshObject(obj)`.
Pathfinding: `findPath(world, sx, sy, goal, opts)` in `world/pathfinding.js` (A*, 8-dir, diagonal needs
both orthogonals free; returns path to closest reachable tile if blocked).

### Current layout (288×256)
The original 192×192 vale is unchanged; the world grew **east** (x 192–287) and **south** (y 192–255).
Region code: `src/content/map.js` (base + order) and `src/content/map_regions/*.js` (wilderness, vale,
coast, east, dungeons). Decorative templates are `dec_*` in `content/scenery_models.js`, object defs in
`content/scenery_defs.js`. Two-way transitions use `def.teleport`; shared arrival tiles are `SPOTS` in
`map_regions/util.js`. Extra terrain types registered in map.js: `heath red_sand cracked_earth redrock`(blocked)
`ice glade_grass moss gravel obsidian mud crypt_floor sandstone_floor sewer_floor basalt`(blocked)` bone_ground wet_rock
scorched dark_stone`.

**Wilderness `y 0–47`, full width** (ditch object at `y 48`, x 1–286). Frostfang Peaks snow `y 0–11` (Rimeglass
Tarn `(40,6)`, Shrine of the Pale Moon `(150,4)`, Frostfang Heights multi `x 192–246`). Ashen Wastes `y 12–47`:
Calder Ruins fortress `(84–108, 16–40)` multi, obelisk `(96,27)`; Ossuary Flats `(18–42, 22–46)` multi; Outlaw
Camp `(40,43)`; Cinder Pits `(60–86, 8–28)` (agent F's gauntlet `x 72–84, y 13–22`); Scorch Rift lava crack
`(134–160, 18–42)`; Bloodstone Circle `(128,36)` multi; Wrenhollow Ruins `(158–184, 32–46)`; Wyrmbone Hollow
`(180,16)` multi; Blackbriar Wood `(192–242, 12–47)` (Thicket `y 12–29` multi, Crow's Glade `(214,26)`);
Cinderfall lava plains `(243–287, 30–47)` multi with the Cinder Depths cave mouth `(255,31)`.

**Vale (x 0–191)** — Brackenford `(78–116, 124–158)`: bank `(98,127)`, general store, kitchen with range
`(86,150)`, chapel altar `(111,128)` + churchyard `(117–122,124–134)`, furnace `(107,137)`, anvils, market
`(96,140)`; Crooked Kettle inn `(84–93,113–120)`. Thornwood `x 46–76, y 104–172` (hidden clearing `(66,118)`,
woodcutter's cabin `(50,125)`). Greystone Quarry `(44,76)`, cave entrance `(33,63)` → Gloomhollow Depths
(`x 0–44, y 158–191`, continues south into The Sunless Deep `y 192–223`). Silverrun river ≈ `x 120–132`
(bridges `y 92`, `y 140`; spring falls `(130,50)`), Mirrowmere lake `(146,120)` with island shrine `(146,118)`
+ bridge from `(146,129)`. Highmarch walled town `(140–182, 52–102)`: gates W `(140,76–78)`, S `(160–162,102)`,
E `(182,76–78)`; keep throne room, Gilded Tankard inn `(141–149,93–100)`, barracks `(176–181,79–91)`, sewer
manhole `(157,98)`. Haverly Farms `(140–180, 146–177)` + windmill `(168,142)`, barn `(170–178,148–155)`,
wheat field `(129–139,162–172)`. Murkfen `(76–112, 160–177)`. Starter goblin camp (level-2 goblins only)
`(107–121,149–163)`; Grubnak's War Camp (Grubnak + goblin warband, multi) palisade `(29–43,116–130)` west of
Thornwood; Brackenford starter outcrop (copper/tin) `(99–103,101–104)`. Gloomhollow's upper caverns are a
level ~5–40 area (quest "Down in Gloomhollow"); its bosses (Varrath – Tyrant's Hollow `(8,218)`, Mother
Skitterlace – Widow's nest, azure dragon – Azure Grotto `(39,218)`) live in The Sunless Deep. Landmarks: Whisperstones `(70,96)`, Sentinel Hill
`(108,72)`, Barrowfield `(6–26,100–122)`, Fort Rowan `(8–22,136–152)`, Westcrag Bluffs `(0–26,82–96)`,
Hagstone Cottage `(14,64)`, Thistledown Lumber Camp `(66,58)`, Ditchwatch `(101,53)`.

**Coast & sea** — sand `y ≈ 178–183`, Southern Sea `y 184–215`, sea cliffs `y 216–223`. Morrow's Rest graveyard
`(46–70, 166–184)` with crypt mausoleum `(57,173)`; Bogwick swamp hamlet on boardwalks `(72–118, 176–206)`;
Thrush Isle `(80,212)` via stepping stones from Bogwick's jetty; Gullhaven fishing village `(156–192, 176–200)`
(3 piers `x 164/176/187`); Beacon Isle lighthouse `(195,204)`. (Agent C's Homestead plot stands in the sea at
`(244–259, 203–214)`.)

**East (x 183–287)** — Craghorn ridge `x 183–191` (passes at `y 74–80` from Highmarch and `y 156–161` from
Haverly). Greyspine Mountains `(192–240, 46–110)`: dwarven hold **Durnhold** `(199–229, 58–94)` (Great Hall,
Forge Hall `(201–209,82–90)` — free floor `204–207, 84–88` for a furnace/anvil, Stonemug tavern, **Deep Seams**
mining floor `(214–228, 71–81)` left open for rocks), Frostgate Path to the Wilderness `(210–216, 49–58)`,
Hollowpick Mine adit `(234,94)`. Bramblemoor heath `(192–240, 110–134)` with Starcaller's Spire `(218,120)`.
Faelwood `(241–287, 49–128)` with elven town **Ilvaren** `(252–282, 66–100)` (Moonwell `(265,81)`), Silverfall
`(283,64)`, Lantern Grove `(250,118)`. Sunscar Badlands `(192–287, 134–199)`: outpost **Dustwatch**
`(228–250, 146–166)`, Scorchgulch canyon `(195–222, 163–178)`, Sunwell Oasis `(270,152)`, Sandswallowed Temple
`(258–272, 178–192)`, Wreckers' Cove `(232,195)`.

**Dungeons** (sealed `void` pockets, `dungeon: true`): The Sunless Deep `(0–44, 192–223)` (walk south from
Gloomhollow); Crypt of Morrow's Rest `(0–60, 224–255)`; Highmarch Sewers `(61–141, 224–255)` (also an outflow
pipe on the Silverrun bank `(121,105)`); Hollowpick Mine `(142–212, 224–255)`; Sandswallowed Vaults
`(213–270, 224–255)`; Starcaller's Study `(271–287, 224–255)` (lit interior); Cinder Depths `(252–287, 0–29)`
— inside the Wilderness (levels 19–46), multi.

---------------------------------------------------------------------------------------------------

## 5. Game API (`src/core/game.js`, global `window.game`)

### State
`game.events` (EventBus) · `game.registry` · `game.world` · `game.player` (Player) ·
`game.npcs` Map uid→Npc · `game.objects` Map uid→WorldObject · `game.groundItems` Map uid→GroundItem ·
`game.remotePlayers` Map peerId→RemotePlayer · `game.tickCount` · `game.config` (`tickMs`,
`runDrainPerTick`, `restoreIntervalTicks`, `groundItemTicks`, `groundItemPrivateTicks`) ·
`game.interactions` · `game.actions` · `game.shops` · `game.ui` · `game.renderer` · `game.input` ·
`game.net` · shortcuts `game.skills / inventory / bank / equipment` (local player).
Systems publish their own APIs on `game`: `game.prayer`, `game.magic`, `game.quests`,
`game.production` (and A/B may add `game.combat`, `game.gathering` …).

### Tick
Order each tick: scheduled callbacks → reset step records → **player** (follow, pending interaction
re-path, movement 1 tile walking / 2 running, interaction arrival → handler, action tick, run energy) →
**NPCs** (action tick, wander when idle & no `combatTarget`, movement) → remote players → **tick
handlers** (by priority) → ground item despawn → passive restore (every 100 ticks) → `'tick'` event.
```js
game.onTick(fn(tick), priority = 0) -> unsubscribe   // lower priority runs first (combat uses 10, prayer 20, shops 100)
game.schedule(ticks, fn) -> { cancel() }
```

### Movement & interaction
```js
game.walkTo(entity, x, y)            // interrupts actions, clears combat/follow, paths to tile (closest reachable)
game.teleport(entity, x, y)
game.pathTo(entity, {x0,y0,x1,y1, mode:'tile'|'adjacent'|'range', range}) -> reached
game.moveToward(entity, target, range) -> inRangeAlready   // re-path to stay within range (chasing)
game.inRange(entity, target, range)  // 0 = on it, 1 = cardinally adjacent, n = Chebyshev ≤ n (not inside)
game.distance(a, b)                  // Chebyshev to b's footprint
game.forceWalk(entity, tiles, { anim, onDone })  // ignores collision, locks entity (agility, knockback)
game.interact(player, target, option, extra?)    // walk to target then dispatch the handler (see §6)
game.useItemOption(player, slot, option) / useItemOnItem(player, slotA, slotB) / castSpell(player, spellId)
game.toggleRun(on?)
```
### Items & equipment
```js
game.giveItem(id, qty, player?) -> addedToInventory   // overflow drops to the ground
game.removeItem(id, qty, player?) / game.hasItem(id, qty, player?)
game.equip(player, invSlot) -> bool   // requirement checks, 2h/shield swaps; 'equip:before' can cancel
game.unequip(player, eqSlot) -> bool
player.inventory / player.bank : Container
  add(id, qty) -> added · remove(id, qty) -> removed · removeAt(slot, qty) · get(slot) · set(slot, {id,qty})
  count(id) · has(id, qty) · indexOf(id) · freeSlots() · isFull() · capacityFor(id) · items() · swap(a,b)
player.equipment : Equipment
  get(slot) · getDef(slot) · weapon() · set(slot, item) · bonuses() · attackSpeed() · weaponType() · ids()
```
### Skills
```js
player.skills.addXp(skill, amount)   // also game.skills.addXp for the local player; fires 'xp' / 'levelup'
getLevel(skill) · getXp(skill) · getCurrent(skill) · setCurrent(skill, v) · boost(skill, amount, cap?) ·
restore(skill, amount?) · totalLevel() · combatLevel() · xpMultiplier (field)
// core/xp.js: xpForLevel(l), levelForXp(xp), combatLevel(levels), MAX_LEVEL, MAX_XP
```
Hitpoints current = `player.hp` (getter/setter over the `hitpoints` current level), `player.maxHp`.
Prayer points = `skills.getCurrent('prayer')`.

### Objects, NPCs, ground items
```js
game.spawnObject(id, x, y, { rot, w, h }) -> WorldObject
game.removeObject(obj)
game.replaceObject(obj, newId, revertTicks?)   // in-place swap (door open, stall emptied); auto-revert
game.depleteObject(obj, ticks?)                // -> def.depleted (or hide) then restore
game.getObjectAt(x, y, pred?) · game.findObjects(pred)
game.spawnNpc(id, x, y, { wander, respawn = true, homeX, homeY }) -> Npc
game.removeNpc(npc) · game.npcsNear(x, y, r, pred?) · game.respawnNpc(npc)
game.spawnGroundItem(id, qty, x, y, { owner: playerName, ticks, privateTicks, permanent, respawnTicks }) -> GroundItem
game.removeGroundItem(gi) · game.groundItemsAt(x, y) · game.canSeeGroundItem(gi, player?)
```
### Combat core (engine)
```js
game.applyDamage(target, amount, { source, type: 'melee'|'ranged'|'magic'|'poison'|'typeless', splat: 'damage'|'block'|'poison'|'venom'|'heal' }) -> dealt
   // emits 'damage:before' (listeners may change payload.amount, e.g. protection prayers) then 'damage';
   // shows hitsplat + HP bar; calls game.kill at 0 HP. On a RemotePlayer it only shows the splat.
game.heal(target, amount)
game.kill(target, killer)        // npc: 'npc:death' (set noDrops), drops after 3 ticks, respawn after def.respawnTicks
                                 // player: 'player:death' (set handled to replace default respawn)
game.respawnPlayer(player, x, y)
```
Character fields used by combat: `combatTarget`, `attackTimer` (ticks), `lastAttacker`,
`lastAttackedTick`, `dead`, `hidden`, `faceTarget`, `faceTile`, `size`. Npc: `def`, `hp`, `maxHp`,
`spawnX/Y`, `wanderRadius`, `state` (free-form), `talkingTo`. Player: `autoRetaliate`, `combatStyle`
(index into weapon type styles), `specialEnergy` (0-100), `activePrayers` (Set), `runEnergy` (0-10000),
`runToggled`, `running`, `settings`, `quests` ({id: stage}), `data` (see Save), `appearance`.

### Presentation
```js
game.message(text, type = 'game')      // chat line; types: game | public | private | clan | trade | system
game.say(entity, text, { duration, color, chat, broadcast })   // overhead text (+ public chat for players)
game.playAnim(entity, name, durationMs = 1200)  // one-shot: slash stab crush punch shoot cast block eat drink pickup bury climb death emote_wave
game.spawnEffect(kind, atEntityOrTile, opts)    // 'levelup' | 'sparkle' {color} | 'splash' | 'teleport' {color} | 'projectile' {to, color, ms, size, arc}
```
Looping skilling animations come from the running action's `anim`: `chop mine fish cook craft fletch
herblore smith balance climb` (bipeds). `action.tool = itemId` shows that item in hand while it runs.

---------------------------------------------------------------------------------------------------

## 6. Interactions (`game.interactions`, `src/core/interactions.js`)

Every click resolves to `(kind, option, idA, idB)` and runs matching handlers. Engine defaults are
registered first (`core/defaults.js`); handlers are tried **most specific first** (explicit ids beat
`'*'`), then **most recently registered first**. A handler returning `false` means "not mine" and the
next one is tried; if none handles it the player sees "Nothing interesting happens." Option matching is
case-insensitive. Each registration returns an unregister function.

```js
const I = game.interactions;
I.onObject(option, ids | '*', handler, opts?)        // world objects       ctx: {game, player, target, option, def}
I.onNpc(option, ids | '*', handler, opts?)           // NPCs                ctx.target = Npc
I.onPlayer(option, handler, opts?)                   // remote players      ctx.target = RemotePlayer
I.onGroundItem(option, ids | '*', handler, opts?)    // ground items        ctx.target = GroundItem
I.onItem(option, ids | '*', handler)                 // inventory option    ctx: {item:{id,qty}, slot, def}
I.onEquipment(option, ids | '*', handler)            // equipment tab       ctx: {item, slot (equip slot), def}
I.onItemOnItem(idsA, idsB, handler)                  // order-insensitive   ctx: {item, slot, other, otherSlot}
I.onItemOnObject(itemIds, objectIds, handler, opts?) // ctx: {item, slot, target}
I.onItemOnNpc(itemIds, npcIds, handler, opts?)
I.onItemOnPlayer(itemIds, handler, opts?) · I.onItemOnGround(itemIds, groundIds, handler, opts?)
I.onSpell(spellIds, handler)                         // non-targeted cast from the spellbook  ctx: {spell}
I.onSpellOnNpc(spellIds, npcIds, handler, opts?) · I.onSpellOnPlayer(spellIds, handler, opts?)
I.onSpellOnItem(spellIds, itemIds, handler) · I.onSpellOnObject(...) · I.onSpellOnGround(...)
I.register(kind, option, idsA, idsB, handler, opts)  // generic form
I.dispatch(kind, option, idA, idB, ctx) -> handled   // run handlers manually
```
`opts.range`: number or `(ctx) => number` – how close the player must get before the handler runs
(0 = stand on it, 1 = cardinally adjacent (default), n = within n tiles). Defaults: objects use
`def.interactRange ?? 1`, ground items 0 (1 if the tile is blocked), `spellOn*` 10.

Handlers for world targets run **when the player arrives** (facing the target). Typical pattern: check
requirements, then start a repeating action:
```js
I.onObject('Chop down', '*', ({ player, target }) => {
  game.actions.start(player, { name: 'woodcutting', anim: 'chop', tool: 'bronze_axe', delay: 1,
    onTick: ({ ticks }) => { /* return false to stop */ } });
});
```
**Engine defaults**: item `Eat` (def.heal), `Wield`/`Wear`/`Equip`, `Drop`, `Examine`; equipment
`Remove`/`Examine`; ground `Take`; object `Bank`, `Open`/`Close` (openId/closedId), `Read`,
`Climb-up`/`Climb-down`/`Climb`/`Enter`/`Exit`/`Go-through`/`Squeeze-through` (def.teleport); npc
`Talk-to` (def.dialogue), `Trade` (def.shop), `Bank`; player `Follow`.
**Starter system handlers** (owned & replaceable by agents): `Attack`, combat spells, `Cross` (ditch),
`Pray-at`, `Bury`, `Chop down`, `Mine`, `Net/Bait/Lure/Cage/Harpoon`, `Smelt`, `Smith`, `Cook`,
item-on-range cooking, tinderbox-on-logs, `Walk-across` etc. (agility), `Steal-from`, `Pickpocket`,
teleport spells.

**Menus.** Right-click lists, per entity under the cursor (nearest first): each `def.options` entry,
then `Walk here`, then `Examine <target>` entries, then `Cancel`; left-click runs the first entry.
Colours: option white; NPC yellow + `(level-N)` coloured by level difference; objects cyan; items
orange; players white. With an item/spell selected ("Use X ->" / "Cast X ->") entries become
`Use X -> target` / `Cast X -> target`. Hooks:
* `'menu:entries' {pick, entries, selected}` – mutate `entries` (array of `{option, targetHtml, action, cross, entity}`).
* `'menu:playerOptions' {target, options}` – options for a RemotePlayer (default `['Follow', 'Trade with']`);
  agent A pushes `'Attack'` when both are in the Wilderness, then registers `I.onPlayer('Attack', ...)`.

---------------------------------------------------------------------------------------------------

## 7. Actions (`game.actions`, `src/core/actions.js`)

One action per entity; starting a new one (or walking / a new interaction) interrupts the old one.
```js
game.actions.start(entity, {
  name: 'woodcutting',   // label (isBusy checks / debugging)
  anim: 'chop',          // looped animation while running
  tool: 'bronze_axe',    // optional item shown in hand while running
  delay: 0,              // ticks before the first onTick
  interval: 1,           // onTick every N ticks
  interruptible: true,   // false -> walking can't cancel it
  onStart(ctx), onTick(ctx) /* return false to finish */, onStop(ctx, reason),
})  // ctx = { game, entity, player, action, ticks }
game.actions.stop(entity, reason) · interrupt(entity, reason) · current(entity) · isBusy(entity)
game.actions.lock(entity, ticks) · isLocked(entity)   // no walking / interacting while locked
```
Stop reasons: `'done'`, `'replaced'`, `'moved'`, `'interrupted'`, `'death'`, `'forced'`, `'teleport'`.

---------------------------------------------------------------------------------------------------

## 8. UI API (`game.ui`, `src/ui/*`)

```js
game.ui.startDialogue(idOrNodes, ctx)
game.ui.openBank() · game.ui.openShop(shopId)
game.ui.openMakeX({ title, items: [{ id: outputItemId, label?, data? }], onSelect(item, qty), onClose?, quantities? })
     // chatbox "What would you like to make?" with 1/5/10/X/All (qty may be Infinity); keys 1-9 / space pick
game.ui.openInterface({ id, title, width, height, className, render(bodyEl, close), onClose }) -> { el, body, close }
game.ui.openQuestJournal(questId)
game.ui.promptNumber(title) -> Promise<number|null>   (accepts 10k / 2m)  · game.ui.promptText(title)
game.ui.closeInterfaces() · game.ui.isInterfaceOpen()
game.ui.selectTab(id) · game.ui.refreshTab(id) · game.ui.getTabElement(id)
game.ui.registerTab({ id, title, icon: dataUrl | () => dataUrl, render(paneEl), order? })  // add or override a tab's renderer
game.ui.setSelected({ type: 'item', slot, id, name } | { type: 'spell', id, name }) · game.ui.clearSelected()
game.ui.showTooltip(x, y, html) · hideTooltip() · clickCross(x, y, 'yellow'|'red')
game.ui.bankOpen (bool) · game.ui.shopOpen (shopId|null)
```
Tabs (F-keys F1–F9): `combat skills quests inventory equipment prayer magic friends settings`.
The Prayer tab emits `'ui:prayer' {id, player, handled}`; the special bar / spec orb emit
`'ui:special' {handled}`; the Magic tab casts non-targeted spells via `game.castSpell` and enters "Cast"
selection for spells with `targets`. Interfaces close when the player walks/interacts.
Icons: `getItemIcon(id, qty)`, `getItemIconTexture(id, qty)`, `getSkillIcon(skill)`,
`getShapeIcon(shape, color, color2)` (`src/ui/icons.js`). Chat commands typed as `::foo bar` emit
`'command' {text, args}` (nothing handles them by default).

---------------------------------------------------------------------------------------------------

## 9. Events (`game.events.on(name, fn) -> off`, `once`, `emit`)

| Event | Payload |
|---|---|
| `tick:start`, `tick` | `{tick}` |
| `game:start`, `game:ready` | `{game}` |
| `xp` | `{player, skill, amount, total}` |
| `levelup` | `{player, skill, level, name}` |
| `combatlevel` | `{player, level}` |
| `stats:change` | `{player, skill, current}` |
| `inventory:change`, `bank:change`, `equipment:change` | `{player}` |
| `equip:before` (set `cancel`), `equip`, `unequip` | `{player, item, def / slot}` |
| `item:eat`, `item:drop`, `item:pickup` | `{player, item / itemId, qty}` |
| `run:change`, `special:change` | `{player}` |
| `player:walk` | `{x, y}` (local click-walk) |
| `player:move` | `{player}` (local player changed tile this tick) |
| `teleport` | `{entity, x, y}` |
| `area:enter` | `{area, prev}` |
| `wilderness:change` / `wilderness:enter` / `wilderness:leave` | `{level, prev}` / `{level}` / `{}` |
| `interaction` | `{kind, option, idA, idB, ctx}` (after a handler ran) |
| `action:start` / `action:stop` | `{entity, action}` / `{entity, action, reason}` |
| `damage:before` (mutate `amount`), `damage` | `{target, amount, source, type, splat}` |
| `npc:death` (set `noDrops`) | `{npc, killer}` |
| `player:death` (set `handled`) | `{player, killer}` |
| `player:respawn`, `npc:respawn` | `{player}` / `{npc}` |
| `npc:add`, `npc:remove` | `{npc}` |
| `object:add`, `object:remove`, `object:change` | `{object, from?}` |
| `ground:add`, `ground:remove`, `ground:change` | `{item, expired?}` |
| `remote:add`, `remote:remove` | `{remote}` |
| `chat` | `{type, text, from}` (every chatbox line) |
| `chat:public` | `{player, text}` (local player spoke – broadcast it) |
| `snapshot` | `{player, snap}` (add fields to the network snapshot) |
| `effect` | `{kind, at, ...opts}` |
| `shop:change` | `{shopId}` |
| `quest:change` | `{id, stage}` |
| `prayer:change` | `{player}` |
| `dialogue:start`, `dialogue:end` | `{ctx}` |
| `ui:open`, `ui:close` | `{id}` |
| `ui:selection` | `{selected}` |
| `ui:prayer`, `ui:special` | `{id?, player?, handled}` |
| `menu:entries`, `menu:playerOptions` | see §6 |
| `settings:change` | `{key, value}` |
| `save` (mutate `data`), `load` | `{data}` |
| `command` | `{text, args}` |
| `slayer:assign` | `{player, master}` (emitted by the slayer master dialogue) |

Systems may emit their own namespaced events (`combat:*`, `net:*`, `quest:*` …).

---------------------------------------------------------------------------------------------------

## 10. Save / load (`src/core/save.js`)

localStorage key `ashvale.save`, JSON, `version: SAVE_VERSION` (1) with a `migrate()` hook.

**Save slots:** `?profile=<name>` (letters, digits, `_`, `-`; max 32) switches to the key
`ashvale.save.<name>` (`SAVE_PROFILE` / `SAVE_KEY` exports) – handy for several test characters or tabs.
**Robustness:** an unparsable save is moved to `<key>.broken` and the game starts with character creation;
`applySave` type-checks every field (bad items/quantities are dropped, a position on a blocked tile moves
to the nearest free tile), `player.store(ns)` replaces a corrupt namespace with `{}`, and if applying a
save still throws, it is moved aside and the page reloads. Saved:
name, appearance, position, skills (xp + current), inventory, equipment, bank, run energy/toggle,
combat style, auto-retaliate, special energy, `quests`, `settings`, playTime and **`player.data`**.
Autosave every 30 s, on tab hide and on unload. First load (no save) shows character creation and
grants `getData('starter','kit')`.

**System state:** store anything persistent under your own namespace:
`player.store('slayer').task = {...}` (`player.store(ns)` returns `player.data[ns]`, creating it).
Ephemeral runtime state can live on entities (`npc.state`, `obj.state`) or module scope. For bespoke
serialisation listen to `'save'` (write into `e.data`) / `'load'` (read `e.data`).
`saveGame(game)`, `readSave()`, `applySave(game, data)`, `deleteSave()`, `serialize(game)` are exported.

---------------------------------------------------------------------------------------------------

## 11. Networking hooks (agent E)

`src/net/index.js` exports `init(game)` and must assign `game.net` (offline stub today:
`{ connected, peerId, send(), broadcast() }`). PeerJS is available as `window.Peer` (script is `defer`,
so check `typeof Peer` / wait for `DOMContentLoaded` before constructing).

* **Local state out:** `game.player.snapshot()` → `{ name, appearance, equipment: {slot: itemId},
  x, y, running, hp, maxHp, combatLevel, anim, faceAngle, dead, overhead, prayers, wildernessLevel }`.
  Systems can add fields via `'snapshot'`. Send it on `'tick'` (or when it changes).
* **Remote players in:** `game.addRemotePlayer(peerId, snap)`, `game.updateRemotePlayer(peerId, snap)`
  (creates if missing), `game.removeRemotePlayer(peerId)`, `game.getRemotePlayer(peerId)`,
  `game.remotePlayers` (Map). `RemotePlayer` (`type: 'remote'`) walks toward the last networked tile
  (re-paths, teleports if > 12 tiles), renders with the humanoid model + name tag, shows `overhead`
  text, plays death when `dead` flips; unknown snapshot keys land in `remote.extra`.
* **Chat:** listen to `'chat:public' {player, text}` and broadcast; on receipt call
  `game.say(remotePlayer, text)` (overhead + chatbox line). `game.message(text, 'public', name)` adds a
  line without overhead.
* **PvP damage:** the attacker's client shows its hit on the RemotePlayer with
  `game.applyDamage(remote, dmg, {source: game.player, type})` (splat only) and sends it; the victim's
  client applies it authoritatively with `game.applyDamage(game.player, dmg, {source: remotePlayer, type})`
  (handles HP, auto-retaliate, `'player:death'`). Remote HP comes from snapshots.
* **Menus:** add remote-player options via `'menu:playerOptions'`; handle with
  `game.interactions.onPlayer(option, handler, {range})`.
* **UI:** render the Friends/Multiplayer tab with `game.ui.registerTab({ id: 'friends', render(pane) {...} })`
  (or write into `game.ui.getTabElement('friends')`).
* **Shared state (implemented in `src/net/`):** every hitsplat a player takes is mirrored from its own
  client (`splat`; the attacker's PvP splat waits for it – `game.pvp.confirmHit`), effects involving
  players are mirrored (`fx`, receivers get `fromNet: true` on `'effect'`), agility `forced` walks are sent
  in snapshots, and non-permanent ground items inside the Wilderness are host-authoritative shared items
  (`gi.nid`, `src/net/shared.js`). Details: `docs/NET_SHARED_WORLD.md`.

---------------------------------------------------------------------------------------------------

## 12. Rendering notes (engine)

* `RenderManager` (`game.renderer`): `scene`, `camera`, `cameraCtl` (`yaw`, `pitch`, `targetDist`,
  `resetNorth()`), `viewFor(entity)` → CharacterView (`pos`, `rig`), `pick(x, y)`, `toScreen(vec3)`,
  `applySettings()`, `fps`. Systems should not touch meshes directly – use events/APIs
  (`spawnEffect`, `playAnim`, object/npc spawns) instead.
* Terrain: 32×32 chunks, vertex-coloured flat shading, animated water/lava via shader injection.
* Scenery: one `InstancedMesh` per model variant (merged vertex-coloured geometry, shared material);
  animated templates are individual meshes. Roofs hide while the player is inside a building.
* Characters: rigs of pivot groups with merged meshes; procedural animation per rig kind
  (`biped quad spider bird bat`). Overlays (hitsplats, HP bars, overhead text, name tags) are DOM.
* Camera: arrow keys / middle-drag rotate, wheel zooms, compass resets north. Touch (`input.js`): tap = left-click,
  press-and-hold = right-click menu, one-finger drag rotates, pinch zooms. Phones (< 600 px wide) get a stacked HUD.
* Performance: scenery is instanced per variant *per 32-tile chunk* and chunks beyond the fog are hidden;
  characters further than 48 tiles are not updated/drawn. `RenderManager.autoQuality()` turns shadows off and
  then shortens the draw distance after ~5 s below 30 fps (Settings > Auto quality). Typical cost on a desktop GPU:
  2–3.5 ms per frame, ≤ 270 draw calls, ≤ 230k triangles in the busiest towns; a game tick with ~580 NPCs < 0.5 ms. Shadows from a sun that
  follows the player (toggle in Settings). Wilderness tints the sky/fog; `dungeon` areas go dark with a
  player torch light.
