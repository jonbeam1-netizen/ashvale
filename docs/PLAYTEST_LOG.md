# Playtest log (October 2026)

A hands-on session as a new player (`?profile=bughunt`, real mouse and keyboard). It was cut short by time after
the tutorial's first 8 steps: walk, camera, guide, chop, fire, fish, cook and mine. Next session: continue from
**Smelting**, then the early quests and everything else on the to-do list below.
Severity: **High** = blocks progress, loses data or logs a console error. **Med** = confusing or clearly wrong.
**Low** = polish.

> **Testing note:** the `game` dev server on :8123 serves a **scratch-workspace copy**
> (`...\Claude\scratch-workspaces\...\scratch-2026-10-19-11912a`), not this repo. Edits in the repo don't show up
> there. To check repo changes, serve the repo itself (for example `python -m http.server 8129` in the repo root).

| # | Issue | Where | Sev | Fixed? / how |
|---|---|---|---|---|
| 1 | The chat log stopped auto-scrolling after the window was resized. The log shrank without a scroll event, so the "was at bottom" check kept failing and new lines (tutorial steps, loot) stayed hidden below the visible area | `ui/chatbox.js` | Med | **Fixed**: the log stays at the bottom until the player scrolls up (a scroll listener sets a `stick` flag; a ResizeObserver keeps it at the bottom). Checked in the browser |
| 2 | The world map never showed **Brackenford**, the starting town. Labels are placed biggest-first: the catch-all "Ashvale" area (the whole world, centred near Haverly) went first, and Thornwood's label overlapped Brackenford's by about 2 px, so Brackenford was skipped | `ui/worldmap.js` | Med | **Fixed**: areas with a negative priority (the catch-all "Ashvale") get no label, and towns (`MAP_TOWNS`: Brackenford, Highmarch, Durnhold, Ilvaren, Dustwatch, Gullhaven, Bogwick) are placed first. Checked: the label order now starts with the towns |
| 3 | Make-X ("How many would you like to cook?"): clicking **All** (or 1/5/10/X) only selects a quantity. A new player clicks "All", nothing happens, and they think it's broken | `ui/interfaces.js` `openMakeX` | Med | **Fixed**: when only one item is offered, a quantity click starts making it straight away. With several items it still just selects the quantity. Cancelling X does nothing. Checked |
| 4 | The tutorial route is mostly walking: tree about 19 tiles W, fishing about 47 E, range about 36 W, ore about 45 N, furnace about 34 S. Roughly 180 tiles before smelting | `content/tutorial.js` step targets | Low | Open. Consider a fishing spot, rocks and a range closer to the square, or a line that tells players to turn on run (it's off by default and new players don't know) |
| 5 | The player is often hidden: behind the south walls of a house they're inside (the roof hides, the walls don't), and behind trees directly south of them (for example while chopping the tutorial tree at 76,150). There is no wall cut-away or see-through | `render/scenery.js` (roofs only) | Med | Open. Idea: a dithered fade in the scenery shader for fragments between the camera and the local player (uniform with the player's position) |
| 6 | The tutorial panel's text sometimes renders **centre-aligned** (seen while the cooking make-X box was open) instead of left-aligned | tutorial panel CSS | Low | Open, not investigated |
| 7 | The first Space press on a fresh dialogue didn't advance it. A second press did | `ui/interfaces.js` dialogue keys | Low | Open, may be an intentional anti-skip guard |
| 8 | Chat order: "You swing your axe at the tree." comes **before** "You have reached your map marker." | world-map marker vs. action messages | Low | Open, cosmetic |
| 9 | Wilderness level labels on the world map ("Level 20+", "Level 10+") are cut off at the left edge when the map is panned | `ui/worldmap.js` | Low | Open |

## Not reached this session (to-do for next session)
Smelt, smith, wield and combat dummy, bank and Quest List steps; first quests (Mira); goblins/cows → mid-level
combat; the other skills (crafting, fletching, herblore, runebinding, agility, thieving, hunter, farming, prayer,
magic); shops; skill guides, chronicles, collection log, emotes, settings; then the late game: Glimmerdeep,
slayer, the Crucible, Wardens' Rest, riddle trails, raid rooms, Wilderness PvP rules, death/gravestone, ferry,
desert heat, construction, farming growth, save/reload.

No console errors or warnings during the session (window error / console hooks plus the console reader).
