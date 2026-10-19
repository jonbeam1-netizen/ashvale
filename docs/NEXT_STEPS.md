# Ashvale – where we left off

Snapshot of the project for the next work session.

## Where things live
- **Play:** https://jonbeam1-netizen.github.io/ashvale/
- **Code:** this folder (Desktop\Ashvale), git remote `origin` = https://github.com/jonbeam1-netizen/ashvale (branch `main`).
- **Run locally:** `python -m http.server 8123` in this folder, open http://localhost:8123 (`?profile=name` gives a separate save slot).
- **Deploy:** run `python -I tools/bump_build.py` (refreshes the module list + cache-busting build id), commit, `git push`. GitHub Pages updates in ~1 minute.
- **Docs:** `ARCHITECTURE.md` (engine contract, all systems §1–19+), `docs/COMBAT_API.md`, `docs/PVP_API.md`, `docs/NET_SHARED_WORLD.md`, `docs/BALANCE.md`, `docs/PLAYTEST_LOG.md` (bug-hunt log).

## What's done
23 skills with skill guides, XP tracker and mastery capes · 288×288 world with towns, 9+ dungeons, the Wilderness · 21 quests · combat (melee/ranged/magic, 29 prayers, specials) · Crucible wave arena, Wardens' Rest, riddle trails, pets, emotes · The Drowned Sun co-op raid · Glimmerdeep mid-game dungeon · Regional Chronicles + collection log · peer-to-peer multiplayer (join codes, shared NPCs/loot/resources, PvP, trading) · procedural music/SFX · day/night, weather, lighting · tutorial · phone layouts + graphics presets.

## In progress / next up
1. **Team PvP minigame** (`src/systems/teamwar*.js`, `src/content/teamwar*.js`) – see its status section in ARCHITECTURE.md; finish + test with 3+ peers.
2. **Unfixed items in `docs/PLAYTEST_LOG.md`** – work through them by severity.
3. Ideas not started: more Wilderness bosses/events, construction expansion, inventory drag-to-rearrange on touch, real-phone testing (iOS keyboard/touch), stats/hiscores across sessions.

## Notes for whoever continues
- The test server's audio is muted via localStorage (`ashvale.audio`) – unmute with the speaker button by the minimap.
- After adding/removing/renaming any module, **always** re-run `tools/bump_build.py` or the deployed site 404s on boot.
- Parallel agents should own separate files; `ARCHITECTURE.md` describes the registries/events everything plugs into.
