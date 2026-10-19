// The Glimmerdeep (mid-game dungeon, combat ~40-75): shared coordinates and small runtime helpers.
// OWNER: content designer (mid-game). Used by midgame_dungeon.js, midgame_monsters.js, midgame_items.js and
// midgame_quests.js.
//
// The dungeon lives in a NEW sealed band below the old map: the world grows from 288 x 256 to 288 x 288
// (setMapConfig in midgame_dungeon.js); the whole band y 256-287 is void rock. The Glimmerdeep uses x 0-207,
// x 208-287 of the band is left free (void) for future pockets.
//
//   Level 1  The Drowned Galleries  (2-66, 257-285)    combat ~40-60, fishing pool, sluice puzzle (quest 1)
//   Level 2  The Sporewood          (72-136, 257-285)  combat ~50-62, Old Delve mining, mid-boss Vorlagh
//   Level 3  The Emberworks         (146-206, 257-285) combat ~62-75, working forge, boss: the Ashwright Engine

export const GD = {
  bandY: 256,
  // ---- surface ---------------------------------------------------------------------------------------
  sinkhole: [84, 88],           // cave mouth (3x2) north-east of the Whisperstones, west of the north road
  sinkholeOut: [85, 91],        // overworld tile in front of it
  rootHollow: [65, 127],        // Thornwood hollow ironbark (quest 2 shortcut), next to Forester Bryn
  rootHollowOut: [65, 129],
  // ---- level 1: the Drowned Galleries -------------------------------------------------------------------
  l1Arrive: [8, 262],
  l1Rope: [6, 259],
  wheels: { gd_wheel_upper: [37, 271], gd_wheel_middle: [40, 271], gd_wheel_lower: [43, 271] },
  floodStair: [44, 280],        // 2x2 stairway down (flooded until quest 1)
  floodStairOut: [42, 281],
  // ---- level 2: the Sporewood ---------------------------------------------------------------------------
  l2Arrive: [77, 280],
  l2Stair: [75, 279],
  rootLadder: [79, 284],        // quest 2 shortcut back up to Thornwood
  rootLadderOut: [79, 283],
  heartroot: [127, 276],        // Vorlagh's lair centre
  caps: { gd_cap_frost: [121, 271], gd_cap_moon: [133, 271], gd_cap_sun: [133, 281], gd_cap_ember: [121, 281] },
  hatch: [122, 259],            // 2x2 sealed Lanternwright hatch (quest 3) -> level 3
  hatchOut: [121, 261],
  glimmerSeam: [76, 259],
  // ---- level 3: the Emberworks ---------------------------------------------------------------------------
  l3Arrive: [150, 260],
  l3Ladder: [148, 259],
  gate: [188, 277],             // the Heart-gate (quest 4), corridor x 187-190
  gateWest: [187, 277],
  gateEast: [190, 277],
  engine: [197, 276],           // 3x3 boss spawn
  valves: [[194, 273], [202, 273], [194, 281], [202, 281]],
  ommra: [190, 262],
  ledger: [194, 259],
};

export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const armour = (n, mag = n, rng = n) => ({ defenceStab: n, defenceSlash: n, defenceCrush: n, defenceMagic: mag, defenceRanged: rng });
export const QICON = { char: '?', color: '#60c0ff' };

/** Make an NPC fight the local player now. */
export function aggro(game, npc, player = game.player) {
  if (!npc) return;
  if (game.combat?.retaliate) game.combat.retaliate(npc, player); else npc.combatTarget = player;
}
export const alive = (game, npc) => !!npc && game.npcs.has(npc.uid) && !npc.dead;

/** Find a free walkable tile near (x, y) (ring search). */
export function freeTileNear(game, x, y, r = 3, avoid = null) {
  for (let d = 1; d <= r; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const tx = x + dx, ty = y + dy;
      if (!game.world.isWalkable(tx, ty)) continue;
      if (avoid && avoid.x === tx && avoid.y === ty) continue;
      return [tx, ty];
    }
  }
  return [x, y];
}

/** Telegraphed ground attack on the local player's tile: hits if they are still on it `delay` ticks later. */
export function telegraph(game, boss, { color, text, min, max, delay = 3, radius = 0 }) {
  const p = game.player;
  const tx = p.x, ty = p.y;
  game.spawnEffect('sparkle', { x: tx, y: ty }, { color });
  game.message(text);
  game.schedule(delay, () => {
    if (!alive(game, boss) || p.dead) return;
    game.spawnEffect('splash', { x: tx, y: ty }, { color });
    if (Math.max(Math.abs(p.x - tx), Math.abs(p.y - ty)) <= radius) game.applyDamage(p, rint(min, max), { source: boss, type: 'typeless' });
  });
}

/** Is the local player inside the rect [x0, y0, x1, y1]? */
export const inRect = (p, [x0, y0, x1, y1]) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
