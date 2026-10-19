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
2. Talk to **Mira**, the town guide in Brackenford square (the blue **?** on the minimap) – she'll get you started.
3. Click the ground to walk; click people, monsters and objects to interact. **Right-click** shows every option.

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
- **17 quests**, from novice errands to a multi-region epic, each with its own story, puzzles and rewards.
- **A big hand-made world** – a river vale with towns and farms, dwarven halls, an elven forest town, desert
  badlands, a stormy coast with islands and a ferry, deep dungeons and the dangerous Wilderness.
- **Combat** with weapon styles, special attacks, prayers, spells, slayer tasks and huge multi-tile bosses.
- **Minigames** – survive 18 waves in *The Crucible*, raid the barrow mounds of *Wardens' Rest*, and follow
  *Wayfinder's Riddles* (treasure trails with maps, riddles, emotes and puzzle boxes).
- **Pets**, an **Emotes** tab, banks, shops, player trading and a death gravestone so you can reclaim your items.
- **Living world** – a shared day/night cycle, regional weather (rain, snow, sandstorms, embers), night lights,
  swaying foliage and a world map with icons and markers.
- **Procedural music and sound** – every tune and sound effect is generated live in your browser.
- Graphics settings with *High quality* and *Auto quality* for slower devices.

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
