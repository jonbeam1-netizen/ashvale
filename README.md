# Ashvale

**Ashvale** is a free fantasy adventure that runs in your browser – a low-poly world of towns, forests, deserts,
dungeons and a lawless Wilderness, inspired by classic tick-based MMOs. Train 23 skills, fight monsters and bosses,
finish quests, and explore it alone or with friends. No download, no account: your character is saved in your
browser.

### ▶ Play now: **https://jonbeam1-netizen.github.io/ashvale/**

Works in current desktop browsers (Chrome, Edge, Firefox, Safari) and on phones and tablets.

---

## Getting started

1. Open the link, create your character and press **Enter Ashvale**.
2. Follow the short **tutorial** (the guide panel at the top-left): Wayguide Corin walks you through walking, the
   camera, chopping, fishing, cooking, mining, smithing, combat and the bank, and hands you a starter bundle.
   You can skip it at any time.
3. Then talk to **Mira**, the town guide in Brackenford square (the blue **?** on the minimap) for your first quest.
4. Click the ground to walk; click people, monsters and objects to interact. **Right-click** shows every option
   (on a touch screen: tap, and press-and-hold).

Your progress saves automatically every 30 seconds and when you close the tab.

## Controls

| Input | What it does |
|---|---|
| Left-click | Walk, or do the main action on a person, monster or object |
| Right-click | Every option for what's under the cursor (Talk-to, Trade, Attack, Examine…) |
| Ctrl + click | Run for this one trip (or walk, if run is switched on) |
| Shift + click (inventory) | Drop the item straight away |
| Alt + R / run orb | Toggle running |
| Alt + M / map button | World map (drag to pan, wheel to zoom, click to place a marker) |
| Arrow keys / middle-drag | Turn and tilt the camera; mouse wheel zooms; click the compass to face north |
| F1 – F9 | Combat, Skills, Quests, Inventory, Equipment, Prayer, Magic, Multiplayer, Settings tabs |
| Space / 1 – 9 | Continue a conversation / pick a dialogue option |
| Esc | Close the open window, dialogue or map |
| Enter | Chat (just start typing) |

**Touch screens:** tap = left-click, press-and-hold = right-click menu, drag to turn the camera, pinch to zoom.
The full list is in-game under **Settings → Controls & tips**.

## Play with friends

1. Open the **Multiplayer** tab (the smiley face, F8) and press **Host World**.
2. Press **Copy invite link** and send it to your friends – or just read them the short 6-letter code.
3. Friends open the link, or type the code into their Multiplayer tab and press **Join**. Up to 8 players per world.

Everyone shares the same monsters, drops and resources and can chat, trade, follow each other, fight bosses
together and duel in the Wilderness. Each player keeps their own character, items and quests. It's peer-to-peer:
the world lives on the host's browser, so the session ends when the host leaves.

## Features

- **23 skills** – melee, ranged and magic combat, prayer, gathering (woodcutting, mining, fishing, hunter, farming),
  production (smithing, cooking, crafting, fletching, herblore, runebinding, construction, firemaking) and more.
  Click any skill for its **skill guide** – everything it unlocks, level by level.
- **21 quests**, from novice errands to a multi-region epic, each with its own story, puzzles and rewards.
- **A new-player tutorial** with a guide panel, highlights and minimap flags (skippable).
- **A big hand-made world** – a river vale with towns and farms, dwarven halls, an elven forest town, desert
  badlands, a stormy coast with islands and a ferry, deep dungeons and the dangerous Wilderness.
- **The Glimmerdeep** – a three-level mid-game dungeon beneath the vale (combat ~40–75): drowned galleries, a fungal
  forest and the Lanternwrights' old forge, two bosses, new gear, agility shortcuts and four quests that open it up.
- **The Drowned Sun** – an endgame co-op raid for 1–4 players: a sunbeam puzzle, monster waves, a twin-soul sentinel,
  a supply cistern and a three-phase final boss, with team points, personal reward rolls and rare relics.
- **Combat** with weapon styles, special attacks, prayers, spells, slayer tasks and huge multi-tile bosses.
- **Minigames** – survive 18 waves in *The Crucible*, raid the barrow mounds of *Wardens' Rest*, and follow
  *Wayfinder's Riddles* (treasure trails with maps, riddles, emotes and puzzle boxes).
- **Regional Chronicles** – easy / medium / hard task lists for six regions with medallion rewards (bonus XP and
  teleports), plus a **collection log** of boss, slayer, minigame, riddle and pet uniques, **hiscores**, an **XP
  tracker** overlay and **mastery mantles** for every level-99 skill.
- **Pets**, an **Emotes** tab, banks, shops, player trading and a death gravestone so you can reclaim your items.
- **Living world** – a shared day/night cycle, regional weather (rain, snow, sandstorms, embers), night lights,
  swaying foliage and a world map (surface and underground) with icons and markers.
- **Procedural music and sound** – every tune and sound effect is generated live in your browser.
- **Phones and tablets** – a compact touch layout (portrait and landscape) with tap / press-and-hold controls and
  floating Menu and Run buttons.
- **Graphics presets** – Auto / Low / Medium / High / Custom, a frame-rate limit, shadows, draw distance, weather and
  *Always day* toggles, and *Auto quality* for slower devices.

## Running it locally

There is no build step. From the repository root:

```sh
python -m http.server 8123
```

then open http://localhost:8123. See [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organised. Before
deploying, run `python tools/bump_build.py` so browsers pick up the new version.

---

Ashvale is an original game: all names, places, characters, quests, art, music and code were made for it.

*Built with Claude Code.*
