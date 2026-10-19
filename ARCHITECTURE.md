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
6. `net.init(game)` → `initAudio(game)` (§14) → render loop → character creation (first run only) →
   `game.start()` → welcome/tips in chat → `'game:ready'`

Loading screen: an inline script in `index.html` counts module downloads (PerformanceObserver) into the
progress bar; `main.js` then reports its phases via `window.ashvaleLoading(text, fraction)` (and
`performance.mark('ashvale:<phase>')`). Whole boot is ~1 s after the ~130 module files arrive. A hidden tab
(invite link opened in the background) boots without waiting for animation frames.

**Loader, preloading & cache-busting (`index.html`, `version.json`, `tools/bump_build.py`).** The head's inline
loader holds a generated block (`BUILD` id + `MODULES`, the static import graph from `src/main.js`). It writes
the import map, the stylesheets and one `<link rel="modulepreload">` per module (+ three.js) so all files
download in parallel, then injects `src/main.js`. On a deployed host every module URL is mapped to
`<path>?v=BUILD` through the import map (CSS too), so GitHub Pages' ~10 min cache can never mix old and new
modules; before starting, the loader fetches `version.json` uncached and, if it names another build than the
(possibly cached) page, reloads once as `?v=<build>` (other query params such as `?join=` are kept). In-game,
a newer `version.json` is announced in chat (checked every 10 min). On localhost / `file:` nothing is versioned
(`?cachebust` forces the deploy path for testing). **Bump BUILD on deploy: `python tools/bump_build.py`**
(re-run it after adding modules so they are preloaded and versioned).
Why it is safe: import-map keys are matched against the *resolved* absolute URL, so every relative import of a
module (from any file, and the one dynamic `import('../render/daynight.js')` in audio) maps to the same
`?v=BUILD` URL – one module instance, never two copies of a registry (verified: identical registry counts and
zero duplicate URLs with `?cachebust`). A module missing from `MODULES` (bump not re-run) still loads, just
unversioned; a listed module that no longer exists would 404 in the preload, so always re-run the script after
deleting/renaming files. The version check never blocks boot for more than 2.5 s and reloads at most once.

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
  restockTicks: 20, stock: [{ id: 'bronze_axe', qty: 5 }, { id: 'uncut_garnet', qty: 4, rate: 6 /* per-item price rate, overrides sellRate */ }] });
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
spawn: {x,y}, respawn: {x,y}, wildernessEdgeY: 48, shores: true })` (current world: **288 × 288** - `map.js` sets 288 × 256, `midgame_dungeon.js` adds the sealed band `y 256–287`; spawn and
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
Pathfinding: `findPath(world, sx, sy, goal, opts)` in `world/pathfinding.js` (`opts.size` for N×N movers; A*, 8-dir, diagonal needs
both orthogonals free; returns path to closest reachable tile if blocked).

**Size-aware movement.** NPCs with `size` N > 1 occupy an N×N footprint anchored at their north-west tile
(`npc.x, npc.y`). They only path, wander, chase and step where the whole footprint fits
(`world.fits(x, y, size)`, `world.canStepSize(x, y, dx, dy, size)`; `findPath(..., { size })`, used by
`game.pathTo` / `moveToward` / `wander`), and `game.inRange` measures between footprints like
`combat_formulas.inAttackRange` (melee = a footprint edge cardinally touching the target, never overlapping).
Idle wanderers don't step onto another NPC's footprint (per-tick occupancy grid, `game.npcOccupied(npc, x, y)`);
chasing / returning / forced movement is never held up by it. A size-1 NPC standing on its (player) target holds still in
`game.moveToward` so the player steps out (both re-pathing made them swap tiles in lockstep forever in 1-wide corridors). At world build `game.makeRoomForBigNpcs()` removes
blocking *decorative* scenery (no options, not structural) from the wander area of any large NPC whose footprint
fits on fewer than half of its wander tiles (e.g. the 4×4 lair bosses boxed in by lava rocks / pines);
deterministic, so all multiplayer peers build the same world. On a multiplayer joiner shared NPCs just follow the
host's (already valid) positions.

### Current layout (288×288)
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
— inside the Wilderness (levels 19–46), multi. **The Glimmerdeep** (mid-game, §19) fills `x 0–207` of the extra sealed band
`y 256–287` (`x 208–287` of that band is still free void) - sinkhole entrance north-east of the Whisperstones `(84,88)`.

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
player.tripRun                       // Ctrl+click: true/false overrides running for the current trip (null = off)
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
game.depleteObject(obj, ticks?)                // -> def.depleted (or hide) then restore; emits 'object:deplete'
game.restoreObject(obj)                        // restore a depleted resource now ('object:restore'; multiplayer)
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
   // shows hitsplat + HP bar; calls game.kill at 0 HP. On a RemotePlayer it only shows the splat; on a shared NPC
   // simulated by the multiplayer host (npc.netControlled) it predicts the HP and sends the hit to the host.
   // opts.netRaw skips 'damage:before' (a hit already modified on the attacker's client).
game.heal(target, amount)
game.kill(target, killer)        // npc: 'npc:death' (set noDrops), drops after 3 ticks, respawn after def.respawnTicks
                                 // (shared NPCs in multiplayer: game.net.npcDeath decides credit / drop owner)
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
Hotkeys: Alt+R run, Alt+M world map, Esc closes windows/map, Space continues dialogue (hold to skip), 1–9
dialogue options. Ctrl+click = run (walk if run is on) for one trip; Shift+click in the inventory drops
(`settings.shiftDrop`, default on). The Settings tab has a **Controls & tips** window (`ui/help.js`) – keep it
in sync when adding controls.

**Phones & touch (`ui/mobile.js`, `game.ui.mobile`).** Sets classes on `<html>` that `css/style.css` keys off:
`touch` (touch screen: finger-sized context menu rows with a Cancel row, bigger close buttons, 16 px inputs so iOS
doesn't zoom, no hover text), `m` (compact phone layout: width ≤ 600 or height ≤ 500) + `portrait` / `landscape`,
`sheet-open`, `chat-open`, `chat-overlay`, `kb-open` / `kb-chat` / `kb-side` (on-screen keyboard; the focused
field's panel moves above it), and CSS vars `--stack` / `--stack-w` (what the side panel covers) and `--kb`, plus
safe-area insets (`viewport-fit=cover`). Compact layout: the side panel's tab bar is always visible (portrait: along
the bottom; landscape: a 2-column rail on the right) and its content is a sheet – tapping the open tab again folds
it (`side.collapse()`; then `side.current` is `null`, `side.lastTab` remembers it). Settings and Emotes live in the
floating **Menu** button (world map, emotes, settings, multiplayer, chronicles, collection log, hiscores, chat, face
north, Controls & tips); a floating **Run** button shows energy. The chat folds to its last line (tap to unfold);
dialogue / make-X / prompts unfold it. Windows fill the free area and scroll; windows that don't need the inventory
fold the sheet away, bank/shop bring the inventory up beside them. Press-and-hold anywhere in the DOM UI dispatches
a synthetic `contextmenu` (so every `oncontextmenu` handler works on iOS too) and swallows the following click;
page pinch / double-tap zoom and overscroll bounce are blocked. Character creation stacks on phones with the
Enter button pinned, and an invite link (`?join=`) says which world you'll join.

**World map** (`ui/worldmap.js`, `game.ui.worldMap`): button under the minimap / Alt+M. Cached base images
(the minimap image split into *Surface* and *Underground* – every `dungeon: true` area – layers, Wilderness
tinted per 10 levels), area labels from `allAreas()`, icons derived once from the world: objects with a
`Bank` option / `bank_booth`, NPCs with `shop`/`Trade`, NPCs whose `mapIcon.char` is `'?'` (quest start),
`altar`/`Pray-at`/`Bind*`, `furnace`/`Smelt`, `anvil`/`Smith`, `range`, `Mine`, `fishing_spot`, `def.teleport`
objects (surface↔underground = dungeon entrance, otherwise transport), `portal`, `agility` data (one icon per
course) and `slayer_master` data. A click sets a marker (`player.store('worldmap').marker`) drawn as a flag on
the minimap (rim arrow when far); it clears on arrival. `open() / close() / toggle() / setMarker(x, y)`.
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
| `npc:attack` | `{npc, target, attack, index, fromNet}` (an NPC starts an attack; `fromNet` = replayed from the multiplayer host) |
| `player:death` (set `handled`) | `{player, killer}` |
| `player:respawn`, `npc:respawn` | `{player}` / `{npc}` |
| `npc:add`, `npc:remove` | `{npc}` |
| `object:add`, `object:remove`, `object:change` | `{object, from?}` |
| `object:deplete`, `object:restore` | `{object, ticks}` / `{object}` (resource depletion, shared in multiplayer) |
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
* **Shared world (implemented in `src/net/`, design in `docs/NET_SHARED_WORLD.md`).** In a session the HOST is
  authoritative for the world, every client stays authoritative for its own player (HP, inventory, save):
  * *NPCs* (`net/npcs.js`): map-spawned NPCs get a stable `npc.netSid`; the host simulates them (also aggression
    against and retaliation on joiners) and streams interest-managed deltas (32 tiles, per tick, ~0.6 KB/s per
    joiner in the busiest area). On joiners they are `npc.netControlled` (engine + combat skip their AI; they walk
    to the host's positions). A joiner rolls its own hits (`game.applyDamage` -> `game.net.npcDamage` -> host
    applies with `netRaw`); the host only decides *that* an NPC attacks whom (`'npc:attack'`), the target's client
    rolls/applies it with `game.combat.npcAttack`. Deaths: every contributor gets `npc:death` with
    `killer = its own player` (slayer/quest credit); the host rolls the drop for the top damage dealer.
    Friends may fight the same monster anywhere (co-op: "someone else is fighting that" ignores remote players). The host leaves NPCs > 44 tiles from every player dormant (`npc.netDormant`).
  * *Ground items* (`net/shared.js`): every non-permanent tradeable ground item anywhere (`gi.nid`), with owner
    privacy timers and host-resolved takes. Untradeable (quest) items stay local.
  * *Resources* (`net/world.js`): `object:deplete` / `object:restore` are mirrored (host timer decides), the host
    moves fishing spots, permanent item spawns are taken through the host.
  * Per player: quests, farming patches, homestead, quest-spawned NPCs (`respawn: false`), hunter creatures/traps,
    gravestones, fires. Other mirrored state: hitsplats on players (`splat`), effects (`fx`, refs `{p}`/`{n}`/`{t}`),
    agility `forced` walks. `game.net.traffic(true)` / `traffic()` meters bandwidth per peer.

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
  press-and-hold = right-click menu (a ring fills while holding), one-finger drag rotates/tilts, two fingers: pinch
  zooms, twist rotates, slide up/down tilts. Phones get the compact layout (§8 *Phones & touch*).
* Performance: scenery is instanced per variant *per 32-tile chunk* and chunks beyond the fog are hidden;
  characters further than 48 tiles are not updated/drawn. `RenderManager.autoQuality()` turns shadows off and
  then shortens the draw distance after ~5 s below 30 fps (Settings > Auto quality). Typical cost on a desktop GPU:
  2–3.5 ms per frame, ≤ 270 draw calls, ≤ 230k triangles in the busiest towns; a game tick with ~580 NPCs < 0.5 ms. Shadows from a sun that
  follows the player (toggle in Settings). Wilderness tints the sky/fog; `dungeon` areas go dark with a
  player torch light. Auto quality first turns *High quality* off, then shadows, then draw distance.
* **Day/night** (`render/daynight.js`): wall-clock driven (`DAY_MS` = 40 min, `worldDayT()`), so every peer shares
  the time. `game.time = { t, phase: 'dawn'|'day'|'dusk'|'night', worldT, worldPhase, night (0..1), dayLength,
  alwaysDay }` (`t`/`phase` = what is shown, i.e. forced to day by Settings > *Always day*; `world*` = the real
  clock). Event `'time:phase' {phase, prev, t}`. Sun/moon direction + colour, sky dome (gradient, sun, moon, stars),
  fog and hemisphere light follow the palette; caves ignore it. Debug: `game.renderer.dayNight.override = 0.0`.
* **Lights** (`render/lights.js`): light-emitting scenery templates are listed in `LIGHT_TEMPLATES` (lamp, lantern
  posts, torches, braziers, fires, forges, furnaces, candles, crystal lamps, moonwell, portals…) plus lava pools and
  transient flashes (`lights.flash(x,y,z,color,…)`). A fixed pool of PointLights (8 HQ / 4) goes to the sources nearest
  the camera; every source also gets an additive halo. PointLights created inside animated templates are stripped and
  pooled (a changing light count would recompile every shader) – don't add lights to the scene yourself.
  GeoBuilder primitives with flame/lamp-like colours (or `b.glowNext = 1` before a primitive) self-illuminate at night.
  Building windows (on outer wall tiles) light up at dusk; ~60 % of houses get a chimney with smoke.
* **Weather** (`render/weather.js`): `climateAt(world, x, y)` → `temperate forest swamp coast snow northwild mountain
  ash embers desert cave indoor` (`indoor` = non-dungeon pockets in the sealed band `y ≥ 224`, e.g. Starcaller's Study:
  always clear); `weatherFor(climate, now)` is deterministic per 5-minute wall-clock window (peers agree).
  `game.weather = {climate, kind, intensity}`, event `'weather:change' {climate, kind, intensity, prev}` and
  `'weather:lightning'` (storms). GPU particle fields around the camera (rain, snow, ash, embers, sand, fireflies at
  night, butterflies/birds by day, cave dust), fog density/colour, wind (`GLOBAL.uWind`, drives foliage sway) and
  wet ground. Settings > *Weather effects* turns it off.
* **Materials** (`render/materials.js`): shared uniforms (`GLOBAL.uTime/uWind/uGlow/uWet/uRim/uWindowGlow`); trees and
  low plants sway (`FOLIAGE_TREE`/`FOLIAGE_LOW`, chosen per template in scenery.js), characters use `CHAR_MATERIAL`
  (rim light) and flash with `HIT_MATERIAL` on damage. Water has depth tint, fresnel sky, shore foam and glints.
* **Effects** (`render/effects.js`): two pooled Points draw calls; spell projectiles get trails and element impacts
  (element guessed from the colour: fire/water/earth/wind/holy/arcane), arrows fly as shafts; extra kinds `'impact'`,
  `'prayer'`, `'special'`; prayer activation and special attacks are picked up from `'prayer:change'` /
  `'special:change'`.
* **Graphics presets** (`GRAPHICS_PRESETS` in `renderer.js`, Settings > Graphics: Auto / Low / Medium / High /
  Custom; `s.graphics`). Auto = `deviceTier()`: phones (coarse pointer + small screen), ≤ 2 GB or ≤ 2 cores → Low;
  tablets, ≤ 4 GB or ≤ 4 cores → Medium; else High; auto quality lowers it one step at a time (`s.autoCap`).
  Low: pixel ratio 1, no shadows / post / CSS vignette, 2 pooled lights, 30 % weather and 50 % effect particles,
  short draw distance with the camera clipped just past the fog (far terrain culled), cheap water (no glints /
  shore noise, `CHEAP_WATER` define), characters drawn within 36 tiles. Medium: pixel ratio 1.25, 1024 shadows
  (only characters within 14 tiles cast them – the shadow pass is per mesh), 4 lights, no post. High: the old
  desktop default. Picking a preset sets the Shadows / High quality / Draw distance toggles; touching one of those
  switches to Custom (= the pre-preset behaviour). Old saves: phones → Auto, others → Auto if their toggles match
  else Custom. **Frame rate** (`s.fpsCap`: 30 / 60 / 0 = unlimited; default 60 on phones): `renderer.skipFrame()`
  also skips while the tab is hidden, while the full-screen world map is open on a phone and paces to ~15 fps
  behind character creation (`renderer.minFrameMs`); `renderer.skipped` makes `ui.update` / `input.update` return
  early. Game ticks are unaffected. Settings > Show FPS also shows CPU ms per frame, draw calls and the tier.
  Measured (375×812 at DPR 2, Brackenford square, desktop CPU): Low 2.0 ms / 128 calls / 70k tris / 375×812 px;
  Medium 3.3 ms / 697 calls / 577k tris / 468×1015; High 3.5 ms / 1162 calls / 593k tris / 562×1218 + post; the
  old phone default (hq off, shadows on) was 3.3 ms / 1155 calls / 594k tris / 468×1015.
* **High quality** (Settings, default on for desktop, off on phones; part of the presets above): post pass (`render/post.js`: MSAA half-float
  target, small two-level bloom, colour grading by time of day, vignette), 2048 shadow map, 8 pooled lights, full
  particle counts, pixel ratio ≤ 1.5 (else ≤ 1.25 and a CSS vignette).

---------------------------------------------------------------------------------------------------

## 13. Activities: minigames, riddle trails, pets, emotes

Files: `src/content/{minigames,clues,pets}.js` (data, map, items, NPCs) + `src/systems/{minigames,clues,pets,emotes}.js`.
All monsters/followers here are spawned at run time per player (`respawn: false`) and never shared over the network.

* **The Crucible** (wave survival) – walled pit west of Dustwatch, walls `(211–226, 141–154)`, gate `(219,154)`,
  Warden Saska + token shop `(222,156)`. 18 waves (`CRUCIBLE_WAVES`), wave 18 = Ignarax, who swaps melee/ranged/magic
  phase definitions every 5 attacks (announced). Area `crucible` is `multi` and has **`safeDeath: {x, y}`**:
  `systems/death.js` then emits `'death:safe' {player, area, killer}` instead of the normal death (nothing lost) – any
  area may use this flag. Rewards: `crucible_token` (shop `crucible_exchange`), `crucible_cape` on completion.
  State `player.store('crucible')` = `{best, completions, tokens}`.
* **Wardens' Rest** – five barrow mounds on SW Bramblemoor around the cairn `(201,130)`; dig (spade) on a mound →
  crypt rooms in the dungeon band `(64–118, 225–229)`, `Search` the sarcophagus to wake its champion; one random
  champion's tomb leads to the Hollow Tunnels `(272–286, 225–233)` and guards the chest. Four-piece sets
  `<champion>_{helm,body,legs,weapon}` with set effects (`game.minigames.wornSet()`). State `player.store('wardens')`.
* **Wayfinder's Riddles** – `riddle_scroll_{easy,medium,hard}` drop on kills (local, untradeable); steps: riddle /
  coordinate (paces from Brackenford square) / map → spade `Dig`; emote in a rect; talk to an NPC; hard: sliding puzzle
  box. Casket rewards: gilt metal sets, hats, capes, emote notation. `game.riddles.give(tier)` hands one out.
  Spade `Dig` handlers return `false` when the dig is not theirs (fallback "nothing here" in minigames).
* **Pets** – `pet_<id>` item + `follower_<id>` NPC (`state.petOf`), sources in `content/pets.js`
  (`npc:death`, `gathering:log|ore|fish`, `'minigame:reward' {id}`); Petkeeper Odessa `(100,147)` reclaims lost pets.
  Snapshot field `pet` shows other players' followers. `game.pets.award(id)`.
* **Emotes** tab – `game.emotes.play(id)` plays the one-shot anim `emote_<id>` (mirrored by the net `fx` snapshot) and
  emits `'emote' {player, id}`; poses are blended on top of the biped animator through a hook on the rig root's
  `updateMatrixWorld` (no render edits). Locked emotes are learned from `emote_scroll_<id>` items.

---------------------------------------------------------------------------------------------------

## 14. Audio (`src/audio/*`, `game.audio`)

Fully procedural Web Audio – there are **no audio files**. `initAudio(game)` (called from `main.js` after
`net.init`, never throws) builds the engine and publishes it as `game.audio`.

| File | Role |
|---|---|
| `audio.js` | `AudioEngine`: buses (music / sfx / ambience → reverb sends → master → limiter), settings, voice pool, `spatial(at, range)` |
| `synth.js` | stateless synthesis helpers (noise bursts, filtered oscillators, Karplus-Strong plucks, reverb impulse) |
| `sfx.js` | `SOUNDS` recipe table; `game.audio.sfx.play(name, at?, { vol, range, priority, minGap })` (`at` = entity or tile → positional) |
| `music.js` + `themes.js` | generative region music (theme = data: mode, bpm, progressions, instruments); area → theme map; crossfades on region change |
| `ambience.js` | wind / water / lava beds sampled from the tiles around the player + sparse critter one-shots (day/night aware) |
| `hooks.js` | event → sound wiring (§9 events + watching nearby entities' animations, so NPCs and remote players are audible too) |
| `ui.js` | "Sound" section in the Settings tab + the speaker toggle under the minimap |

* The `AudioContext` is created lazily on the **first user gesture** (no autoplay warnings) and is **suspended** while
  the tab is hidden or the game is muted (no audio CPU then). If Web Audio is unavailable the engine is a silent no-op.
* Settings live in `localStorage['ashvale.audio']` (not in the save): `master music sfx ambience` (0..1), `muted`,
  `footsteps`. API: `game.audio.set(key, value)`, `toggleMute()`, `settings`.
* Add a sound: a recipe in `SOUNDS` (sfx.js) + a trigger in hooks.js (or call `game.audio?.sfx.play(...)` from a system).

---------------------------------------------------------------------------------------------------

## 15. Eastern lands content (round 3)

Files: `src/content/npcs_east.js` (imported by `npcs.js`), `shops_east.js` (imported by `shops.js`),
`quests_east.js` + `quests_east2.js` (imported by `quests.js`). Same patterns as the vale content (`quest_util.js`
helpers: `hook(fn)` runs at systems init, `stageOf/flags/has/give/take`, `questNpc/questObject/spawnNpc/spawnObj`).

* **Towns & services** – bankers in Durnhold, Ilvaren, Dustwatch, Gullhaven and Bogwick; shops (Durnhold smiths /
  stout, Ilvaren herbs & bows, Dustwatch trading post, Bastian's Chandlery in Gullhaven, Bogwick); 20+ townsfolk with
  rumours / quest hints; eight lore books (Search the marked bookshelves); furnace + anvil in Durnhold's Forge Hall.
* **Gullhaven ferry** – `ferry_<stop>` NPCs (Gullhaven, Beacon Isle, Bogwick, Thrush Isle, Wreckers' Cove), option
  `Travel`; fares in coins, free after *The Brinecoil*. `ferryTravel(game, key)` is exported.
* **Desert heat** – in the Sunscar Badlands (outside Dustwatch / Sunwell Oasis / the coast / dungeons) the heat drains
  HP every few ticks unless a `waterskin_1..4` is carried (sipped automatically); each worn piece of desert cloth slows
  it. Refill waterskins on the Dustwatch well / Sunwell spring. State `player.store('desert')`.
* **Quests** (stage in `player.quests[id]`, all 100 = complete):

| id | Name | Start |
|---|---|---|
| `forge_heart` | The Forge-Heart of Durnhold (Intermediate) | Forgemaster Brunna, Durnhold Forge Hall |
| `moonwell_lament` | The Moonwell's Lament (Intermediate) | Moonwarden Sylvaine, Ilvaren Moonwell |
| `stars_over_bramblemoor` | Stars over Bramblemoor (Intermediate) | Starcaller Orrin Vale, Starcaller's Spire/Study |
| `keepers_light` | The Keeper's Light (Novice) | Old Agnes, Beacon Isle |
| `sun_warden` | The Sun-Eyed Warden (Experienced) | Excavator Tamsin Reed, Sandswallowed Temple |
| `brinecoil` | The Brinecoil (Experienced) | Harbourmaster Brannoc, Gullhaven |
| `trial_by_bog` | Trial by Bog (Intermediate) | Reeve Odelia Sump, Bogwick |
| `ember_under_mountain` | The Ember Under the Mountain (Master) | Thane Hargrim, Durnhold – needs Forge-Heart, Stars over Bramblemoor, Sun-Eyed Warden |

  Quest bosses are spawned per player at run time (`respawn: false`) and are never shared over the network.
  Quest-changed scenery (relit beacon, mended orrery…) is re-applied on `'game:ready'` from the saved stage.

---------------------------------------------------------------------------------------------------

## 16. Progression & UI polish (`game.progress`)

Files: `src/systems/progress.js` (init, publishes `game.progress`) + helpers `progress_ui.js` (injected CSS; wraps the
Skills / Quests / Settings tab renderers instead of replacing them), `progress_xptracker.js`, `progress_collection.js`,
`progress_chronicles.js`, `progress_mastery.js`; window `src/ui/skillguide.js`; data `src/content/diaries.js` (+ `mastery.js`).

* **Skill guides** – click a skill in the Skills tab (or `game.progress.openSkillGuide(skill)`). Entries are generated from
  the registries (item `requirements`, recipes by skill/category, `woodcutting mining fishing hunter farming agility
  agility_course pickpocket thieving_* firemaking runebinding construction bones herb tools` data, spells, prayers, NPC
  `slayerLevel`, quests via `def.skillRequirements` or `QUEST_SKILL_REQS` in skillguide.js, mastery mantles). Skill tooltips add progress %.
* **XP tracker** – overlay toggled by Settings > *XP tracker overlay* (`settings.xpTracker`), the small `XP` button by the
  XP drops, or the Skills tab button. Session-only XP, XP/h, actions and time to level, Reset.
* **Collection log** – `player.store('collection') = {items, kc, riddles}`. Sources are derived on first use: `boss` NPCs and
  `slayerLevel` NPCs (non-stackable tertiary drops ≤ 6 % / 2 %, items with `unique: npcId`, pets with `source.npc`), other
  monsters' rare tertiaries (grouped by identical item sets), Crucible (cape + exchange stock), Wardens' Rest (`wardenSet`),
  riddle tiers (`riddles` config rare/megaRare), pets. **Add sources** with
  `registerData('collection_source', id, { cat, name, items: [ids], kc?: [npcIds], order? })`. Gains are counted through a
  wrapper around `game.giveItem`, `'item:pickup'` and `'pet:get'`; new uniques emit `'collection:new' {player, id}`.
* **Regional Chronicles** – `registerData('chronicle_region', id, { name, order, town, rects, perk, tiers: {easy, medium,
  hard} })` (task types listed at the top of `content/diaries.js`; checked from gathering/production/agility/thieving/
  hunter/magic/quest/slayer/riddle/area/wilderness/interaction events). State `player.store('chronicles')`. Rewards are
  claimed in the Chronicles window (Quests tab): `chronicle_<region>_<1..3>` neck medallion (+2/4/6 % XP in the region's
  perk skills, region teleport 1/3/unlimited per day), Lamps of Insight and coins. `game.progress.chronicles.validate()`
  lists task targets missing from the registries. Events `'chronicle:task'`, `'chronicle:tier'`, `'chronicle:claim'`.
* **Mastery** – `mastery_cape_<skill>` ("Mantle of the …", requirement 99) sold for 99,000 coins (+ `mastery_cape_max`,
  990,000, all 99s) by Hallmaster Corvane (`mastery_keeper`, Highmarch house at `(171,87)`; Talk-to / Trade). Equipment
  option `Flourish`. Level-99 and total-level milestone messages (100, 250, 500 … 2277); `store('progress').lastTotal`.
* **Hiscores** – Skills tab button / click the total-level cell: own skills, totals, quest points, chronicle and collection
  counts, and session players (snapshot field `totalLevel`).

---------------------------------------------------------------------------------------------------

## 17. Balance & new-player tutorial

**Balance** – numbers, method and every tuning change are in `docs/BALANCE.md`. Rules worth knowing when adding content:
a player's hit that passes the accuracy roll deals 1..max (`PLAYER_LANDED_MIN`, NPC hits stay 0..max); shops must
never sell an input for less than what its crafted output sells/transmutes for (use a stock entry `rate` for raw
supplies); bar values are ≥ 0.57 × the best per-bar value of any smithed piece.

**Tutorial** (`src/content/tutorial.js` data + NPCs, `src/systems/tutorial.js` runtime, `game.tutorial`). Starts only for a
character created this session (no save existed when systems initialised); existing saves are never forced into it.
Wayguide Corin (`tutorial_guide`, `(94,139)`) can start it on request; two practice dummies (`practice_dummy`, combat
level 0 = never retaliate) stand west of him. Steps are `registerData('tutorial', 'steps', [...])` entries
`{ id, title, text, event, match(payload, ctx), poll(ctx), ui, world, onStart }` that complete from real events
(`player:walk`, `dialogue:end`, `gathering:log|fish|ore`, `production:make`, `equip`, `npc:death`, `ui:open`) or a per-tick
poll (camera moved, Quest List tab open). `ui` = `tab:<id>` / `quest:<id>` / `minimap` / CSS selector (highlight + bouncing
arrow; text only if the element is missing); `world` = `{npc}` / `{object, near}` / `{x,y}` (minimap flag via
`game.ui.worldMap.setMarker` + "N tiles <dir>" hint). Flow: walk → camera → talk to guide → chop → fire → fish → cook → mine
copper+tin → smelt → smith → wield → kill a dummy/monster → open bank → Quest List → Lost Ledger journal → starter bundle
(`registerData('tutorial','reward')`, once). State: `player.store('tutorial') = { status: active|done|skipped, step, data, rewarded }`;
skipping (double-click "Skip tutorial", or via the guide) is permanent.

---------------------------------------------------------------------------------------------------

## 18. Endgame co-op raid: The Drowned Sun

Files: `src/content/raid.js` (geometry, map, monster pool, scenery/telegraph templates, Seeker dialogue),
`src/content/raid_items.js` (relics, specials, supplies, Sunling pet, ornament kits), `src/systems/raid.js` (state, multiplayer,
doors, HUD, `game.raid`), `src/systems/raid_rooms.js` (puzzle, waves, bosses, telegraphs), `src/systems/raid_rewards.js` (chest,
cistern supplies, kits, gear passives).

* **Where.** Sunken Stair `(279,166)` in the south-east Sunscar Badlands (Seeker Ilsabet Corran explains it, `Rewards` shows the
  relic table). Six walled chambers in free void pockets of the sealed band, each its own area `raid_<key>` (priority 30,
  `dungeon`, `multi` except the lobby, `safeDeath` → Antechamber): Antechamber `(56–64,238–254)`, Hall of Prisms `(213–230,239–254)`,
  Sunsworn Barracks `(11–28,242–254)`, Gallery of the Twin Soul `(197–216,225–232)`, Drowned Cistern `(138–146,225–233)`, Throne
  of Aurvael `(138–158,239–254)`. Chambers link by `raid_door` (onward, once cleared) and `raid_return` (back to the Antechamber).
* **Rooms.** Prisms: rotate mirrors (`raid_mirror_0/1`, generated per run) until the sunbeam hits the dawn receptor. Barracks:
  3 waves (+1 monster per extra player). Sentinel: Ember soul (magic attacks, immune to magic) / Gale soul (ranged, immune to
  ranged), switching every 5 attacks; soulfire 3×3 under every player. Cistern: fish/pick/cook/brew raid-only supplies
  (`raidSupply`, removed on leaving), shrine restores prayer. Aurvael: P1 solar bolts + sunfall; P2 at 66% eclipse shield until
  its thralls die, tide shards + light beams across rows/columns; P3 at 33% enraged, alternating sun/tide every 4 attacks;
  final eclipse at 15% (stand in the golden circles).
* **Multiplayer.** The authority (offline, or the session HOST) owns `S` (run id, room started/cleared, party size fixed at the
  gate from the players in the Antechamber, team points, puzzle, wave, soul, phase/shield) and broadcasts it as `raid:s`;
  joiners mirror it and send intents `raid:i` (`start`, `room`, `rot`, `death`). Telegraphs are host-decided `raid:m`
  (`{k:'tg', s, r: rects, d, lo, hi, rm, inv}`), drawn by every client, each damaging only its own player. Monsters are a
  **fixed pool of map spawns** (`SLOTS`, hidden until needed) so `net/npcs.js` gives them stable shared ids – the host simulates
  them, joiners fight their mirrors as usual. They are not `aggressive`: the host picks the nearest player in their own chamber.
  HP scales with party size (`SCALE`, own `maxHp` property on the Npc). Boss/Sentinel variants are def swaps with identical
  attack-list order, so replayed attack indices match on every client. A joiner leaving the session drops back to its lobby.
* **Rewards** are personal: each client opens the reliquary and rolls from the shared team points
  (`personal = pts × (1 + 0.2(n−1)) / n`, unique chance `min(50%, personal / 80 000)`), once per run id. Relics (level 80):
  Dawnrend (`sunder`), Hymnstring (`solar_volley`), Eclipse staff (`corona`), Sunwrought helm/cuirass/greaves (set: −10% damage
  from monsters), Aegis of the Sunken Choir (dragonfire ward), Ring of the Seventh Hymn (+50% spec regen); Dawnfire/Tidewrought
  ornament kits (`<id>_or`, `Dismantle` reverts); Sunling pet (1/40). State `player.store('raid')` = `{kc, best, chests,
  claimed: [runIds], uniques}`. Events: `raid:start`, `raid:room`, `raid:complete`, `raid:reward`, `minigame:reward {id:'drowned_sun'}`.
* **Testing:** `game.raid.debug.kit()` (99 combat + relic loadout), `.start()`, `.solve()`, `.room('throne')`, `.killAll()`, `.reset()`.

---------------------------------------------------------------------------------------------------

## 19. Mid-game: the Glimmerdeep (combat ~40–75) + four quests

Files: `src/content/midgame_common.js` (coordinates `GD`, helpers: telegraph, freeTileNear), `midgame_dungeon.js` (world band,
terrain, areas, scenery, transitions, resources, agility shortcuts, lore, spawns; imported by `content/index.js`, imports the next
two), `midgame_monsters.js` (NPCs, drop tables, boss mechanics), `midgame_items.js` (gear, sporehide recipes, item effects,
`collection_source` `glimmerdeep`), `midgame_quests.js` (imported by `content/quests.js`: quest NPCs, gates, puzzles).

* **World** – `setMapConfig({ height: 288 })`; the band `y 256–287` is void rock like the other sealed pockets. Areas
  `glimmerdeep` (x 0–207, prio 9) + `gd_galleries` / `gd_sporewood` / `gd_emberworks` (prio 10), `gd_heartrot` and `gd_heartforge`
  (prio 11, multi). All `dungeon: true` (Underground world-map layer).
* **Level 1 – Drowned Galleries `(2–66, 257–285)`**: rope from the sinkhole `(84,88)` → camp with a cooking range `(8,262)`;
  drowned delver 41, gillback raider 48, silt slug 50 (Slayer 40, *slugs*), drowned keener 62 (Slayer 50, *hags*: earmuffs);
  harpoon/bait pool in the flooded hall; sluice chamber (quest 18); rubble-slope shortcut (Agility 48).
  Drowned stairway `(44,280)` → level 2 after *Below the Silverrun*.
* **Level 2 – the Sporewood `(72–136, 257–285)`**: sporecap crawler 51 (Slayer 45, *crawlers*), gloomcap weaver 56, mycelid
  shambler 62; the Old Delve mining (coal, gold, duskite, iron, silver) + quest glimmer seam; root bridge (Agility 58) into the
  Heartrot; **Vorlagh the Sporebound** (74, mid-boss, not aggressive): rot-bloom telegraphs (every 15 ticks), sporelings at 66 % / 33 %
  heal him while alive. Lanternwright hatch `(122,259)` → level 3 after *The Lantern Lock*; root ladder `(79,284)` ↔ Thornwood
  hollow ironbark `(65,127)` after *Rot at the Roots*.
* **Level 3 – the Emberworks `(146–206, 257–285)`**: working furnace + anvils, slag hound 67, Lanternwright shade 69, cinderhorn
  lizard 74 (Slayer 55, *glarehorns*), forge sentinel 74 (two on a lava-moated island = ranged/magic safe-spot); slag ledge
  (Agility 66); Heart-gate `(188,277)` (after the quest-21 cipher) → **the Ashwright Engine** (96, boss, 3×3): vent telegraphs
  every 12 ticks, heat-shield below 50 % (damage ×0.5, HP 180) dropped for 30 ticks by turning one of four `gd_valve`s (60-tick refill),
  two slag hounds at 25 %.
* **Gear** (levels 35–45, between the duskite and azurium tiers): sporehide coif/body/chaps/vambraces (Ranged 35, sewn from
  `sporehide`, Crafting 48–53), tidewoven hood/robe top/bottom (Magic 45), Lanternwright's almanac (off-hand, Magic 40),
  Forgefather's hammer (Attack 45, `constructBane` +15 % vs golems/elementals), slagweave gauntlets (Defence 45), sporeward amulet
  (`poisonWard`: cures / blocks poison), emberheart ring (`lastStand`: +10 % damage below half HP). Effects live in `midgame_items.js`.
* **Quests** (all `completeStage` 100):

| id | Name | Start | Unlocks |
|---|---|---|---|
| `below_silverrun` | Below the Silverrun (Intermediate) | Ferrywarden Hesk Callow, Silverrun bridge `(117,137)` | Sporewood |
| `rot_at_roots` | Rot at the Roots (Intermediate) | Forester Bryn Ashgrove, Thornwood `(63,126)` – needs 18 | root-hollow shortcut |
| `lantern_lock` | The Lantern Lock (Intermediate) | Quarrymaster Odo Flint, Greystone `(50,82)` – needs 18 | Emberworks |
| `last_lanternwright` | The Last Lanternwright (Experienced) | Archivist Sabelle Venn, Highmarch `(168,67)` – needs 19 + 20 | Heart Forge |

  Quest-changed scenery (open hatch, dimmed caps) is re-applied on `'game:ready'`.

