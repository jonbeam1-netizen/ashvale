// The Drowned Sun - a co-op raid (1-4 players). Content: map, rooms, monsters, scenery, telegraph templates.
// Runtime: src/systems/raid.js (state, multiplayer, rooms), raid_rooms.js (puzzle / waves / bosses), raid_rewards.js.
// Reward items, supplies, specials, pet and kits: src/content/raid_items.js.
//
// Lore: the Sunsworn choir raised a citadel to sing a dying sun-wyrm, Aurvael, back to life. The hymn failed, the
// citadel sank beneath the Sunscar Badlands into the old aquifer, and Aurvael has been dreaming in the dark ever since.
//
// Layout (sealed dungeon pockets in the y >= 224 band, each room its own walled pocket, linked by passages):
//   surface   Sunken Stair (279,166) in the south-east Sunscar Badlands; Seeker Ilsabet Corran explains the raid
//   0 lobby   Antechamber          floor (56-64, 238-254)   arrival (60,252), sun-sealed gate (60,238)
//   1 prisms  Hall of Prisms       floor (213-230, 239-254) mirror puzzle: steer the sunbeam into the dawn receptor
//   2 barracks Sunsworn Barracks   floor (11-28, 242-254)   three waves (melee / ranged / magic + an exarch)
//   3 gallery Gallery of the Twin Soul floor (197-216, 225-232) mini-boss: the Twin-Souled Sentinel
//   4 cistern Drowned Cistern      floor (138-146, 225-233) rest room: fish, forage, cook, brew, pray
//   5 throne  Throne of Aurvael    floor (138-158, 239-254) final boss, 3 phases; reliquary chest + exit
//
// Monsters are a fixed pool of map spawns (hidden until their room/wave starts) so they get stable shared ids in
// multiplayer (src/net/npcs.js): the host simulates them, joiners mirror them like any other shared NPC.

import * as THREE from 'three';
import { registerNpc, registerObject, registerArea, registerPaint, registerSpawn, registerDialogue, registerData } from '../core/registry.js';
import { registerSceneryTemplate } from '../render/models.js';
import './raid_items.js';

const paint = registerPaint, area = registerArea, spawn = registerSpawn;
const obj = (id, x, y, rot = 0) => spawn({ type: 'object', id, x, y, rot });

// =================================================================================================
// Geometry
// =================================================================================================
export const RAID_NAME = 'The Drowned Sun';
export const ROOM_KEYS = ['lobby', 'prisms', 'barracks', 'gallery', 'cistern', 'throne'];
export const ROOMS = {
  lobby: { idx: 0, name: 'Antechamber', floor: [56, 238, 64, 254], arrive: [60, 252], terrain: 'sandstone_floor' },
  prisms: { idx: 1, name: 'Hall of Prisms', floor: [213, 239, 230, 254], arrive: [221, 253], terrain: 'sandstone_floor' },
  barracks: { idx: 2, name: 'Sunsworn Barracks', floor: [11, 242, 28, 254], arrive: [19, 253], terrain: 'dark_stone' },
  gallery: { idx: 3, name: 'Gallery of the Twin Soul', floor: [197, 225, 216, 232], arrive: [198, 228], terrain: 'crypt_floor' },
  cistern: { idx: 4, name: 'Drowned Cistern', floor: [138, 225, 146, 233], arrive: [142, 232], terrain: 'wet_rock' },
  throne: { idx: 5, name: 'Throne of Aurvael', floor: [138, 239, 158, 254], arrive: [148, 253], terrain: 'sandstone_floor' },
};
for (const [key, r] of Object.entries(ROOMS)) r.key = key;
export const ROOM_LIST = ROOM_KEYS.map((k) => ROOMS[k]);
export const SURFACE = { stair: [279, 166], out: [279, 169], seeker: [277, 169] };

/** Exit doors (room index -> door tile). The lobby gate starts the raid. */
export const DOORS = { 0: [60, 238], 1: [230, 239], 2: [28, 242], 3: [216, 225], 4: [146, 225] };
/** Return passages (back to the Antechamber), one per room after the lobby. */
export const RETURNS = { 1: [213, 254], 2: [11, 254], 3: [197, 232], 4: [138, 233], 5: [138, 254] };
export const THRONE = { chest: [157, 240], exit: [139, 240], boss: [146, 241] };
export const GALLERY = { boss: [209, 228] };

// ---- Hall of Prisms puzzle grid -------------------------------------------------------------------
// Mirror pedestals sit on a 2-spaced grid (walkways between them); the sun-lens on the west wall shoots east.
export const PRISM = {
  cols: [217, 219, 221, 223, 225, 227],
  rows: [242, 244, 246, 248, 250],
  bounds: [215, 241, 228, 251],  // the beam travels inside this box; it leaves it at the receptor
  lensX: 214,
};
/**
 * Trace the beam. mirrors: Map 'x,y' -> orientation (0 = '/', 1 = '\'). Returns {path: [[x,y,horizontal]...],
 * end: [x, y] (first tile outside the bounds), hits: distinct mirrors touched}.
 */
export function traceBeam(mirrors, lensY) {
  const [x0, y0, x1, y1] = PRISM.bounds;
  let x = PRISM.lensX, y = lensY, dx = 1, dy = 0;
  const path = [];
  const seen = new Set(), hits = new Set();
  for (let i = 0; i < 400; i++) {
    x += dx; y += dy;
    if (x < x0 || x > x1 || y < y0 || y > y1) return { path, end: [x, y], hits: hits.size };
    const k = `${x},${y}`;
    const o = mirrors.get(k);
    if (o != null) {
      hits.add(k);
      // '/' reflects (dx,dy) -> (-dy,-dx); '\' reflects (dx,dy) -> (dy,dx)
      if (o === 0) { const t = dx; dx = -dy; dy = -t; } else { const t = dx; dx = dy; dy = t; }
      const loop = `${k}:${dx},${dy}`;
      if (seen.has(loop)) return { path, end: null, hits: hits.size };
      seen.add(loop);
      path.push([x, y, 2]);
    } else path.push([x, y, dx !== 0 ? 1 : 0]);
  }
  return { path, end: null, hits: hits.size };
}

// ---- monster pool -----------------------------------------------------------------------------------
/** Barracks waves: base monsters + one extra per additional party member. */
export const WAVES = [
  { base: ['raid_zealot', 'raid_zealot', 'raid_sunbow'], extra: ['raid_zealot', 'raid_sunbow', 'raid_zealot'] },
  { base: ['raid_sunbow', 'raid_hierophant', 'raid_zealot', 'raid_sunbow'], extra: ['raid_hierophant', 'raid_zealot', 'raid_sunbow'] },
  { base: ['raid_exarch', 'raid_hierophant', 'raid_hierophant'], extra: ['raid_zealot', 'raid_sunbow', 'raid_hierophant'] },
];
const WAVE_TILES = [
  [[13, 243], [16, 243], [19, 243], [22, 243], [25, 243], [27, 244]],
  [[12, 245], [15, 245], [18, 245], [21, 245], [24, 245], [27, 246], [14, 247]],
  [[19, 248], [13, 248], [16, 248], [23, 248], [26, 248], [11, 250]],
];
export const THRALL_TILES = [[140, 242], [156, 242], [140, 251], [156, 251], [148, 247]];

/** Every pooled monster: {id, x, y, room, wave?, slot, extra?}. Matched to the spawned Npc by id + spawn tile. */
export const SLOTS = [];
WAVES.forEach((w, wi) => {
  const ids = [...w.base, ...w.extra];
  ids.forEach((id, i) => SLOTS.push({ id, x: WAVE_TILES[wi][i][0], y: WAVE_TILES[wi][i][1], room: 'barracks', wave: wi + 1, extra: Math.max(0, i - w.base.length + 1) }));
});
SLOTS.push({ id: 'raid_sentinel_ember', x: GALLERY.boss[0], y: GALLERY.boss[1], room: 'gallery', boss: true });
SLOTS.push({ id: 'raid_aurvael_sun', x: THRONE.boss[0], y: THRONE.boss[1], room: 'throne', boss: true });
THRALL_TILES.forEach(([x, y], i) => SLOTS.push({ id: 'raid_thrall', x, y, room: 'throne', add: i }));
SLOTS.forEach((s, i) => { s.slot = i; s.key = `${s.id}@${s.x},${s.y}`; });

/** Party scaling (1-4 players): boss HP, wave monster HP. */
export const SCALE = { boss: [1, 1.6, 2.2, 2.8], mob: [1, 1.15, 1.3, 1.45] };

// =================================================================================================
// Monsters
// =================================================================================================
function mon(def) {
  const s = { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10, ...(def.stats || {}) };
  const cl = Math.max(1, Math.floor(0.25 * (s.defence + s.hitpoints) + Math.max(0.325 * (s.attack + s.strength), 0.4875 * s.ranged, 0.4875 * s.magic)));
  const style = def.attackStyle || 'crush';
  const anim = def.attackAnim || (style === 'ranged' ? 'shoot' : style === 'magic' ? 'cast' : undefined);
  return registerNpc({
    options: ['Attack'], aggressive: false, aggroRange: 14, wanderRadius: 0, respawnTicks: 9000000, dropTable: null, noClues: true,
    leashRange: 40, chaseRange: 40, raidPool: true, immunePoison: false,
    ...def, ...(anim ? { attackAnim: anim } : {}), stats: s, combatLevel: def.combatLevel ?? cl,
  });
}
const armour = (n, mag = n, rng = n) => ({ defenceStab: n, defenceSlash: n, defenceCrush: n, defenceMagic: mag, defenceRanged: rng });
const SUN = '#e8b040', SUN2 = '#fff0b0', TIDE = '#2a7a84', TIDE2 = '#9af0ff';

mon({ id: 'raid_zealot', name: 'Sunsworn zealot', examine: 'Still singing. Still swinging.', attackStyle: 'slash', attackSpeed: 4, maxHit: 19,
  stats: { attack: 125, strength: 130, defence: 105, hitpoints: 115 }, bonuses: { attackSlash: 60, strength: 45, ...armour(90, 40, 80) },
  model: { template: 'human', colors: { skin: '#9a6a4a', top: '#c89a40', legs: '#6a4a20', hair: '#2a1a10' },
    equipment: { head: { shape: 'hood', color: '#8a6a20' }, body: { shape: 'robe_top', color: '#c89a40' }, weapon: { shape: 'scimitar', color: '#e8d080' } } } });
mon({ id: 'raid_sunbow', name: 'Sunsworn sunbow', examine: 'Her arrows are tipped with drowned light.', attackStyle: 'ranged', attackRange: 8, attackSpeed: 5, maxHit: 18, projectileColor: '#ffe080',
  stats: { ranged: 135, defence: 95, hitpoints: 100 }, bonuses: { attackRanged: 60, ...armour(70, 50, 95) },
  model: { template: 'human', female: true, hairStyle: 'long', colors: { skin: '#b07850', top: '#a87a30', legs: '#5a3a18', hair: '#e8c060' },
    equipment: { head: { shape: 'coif', color: '#8a6a20' }, weapon: { shape: 'bow', color: '#5a3a18', glow: '#ffd060' } } } });
mon({ id: 'raid_hierophant', name: 'Sunsworn hierophant', examine: 'He leads a hymn nobody else can hear.', attackStyle: 'magic', attackRange: 8, attackSpeed: 5, maxHit: 20, projectileColor: '#ffd040',
  stats: { magic: 145, defence: 85, hitpoints: 105 }, bonuses: { attackMagic: 60, ...armour(55, 100, 55) },
  attacks: [{ style: 'magic', maxHit: 20, weight: 3, range: 8, projectileColor: '#ffd040' }, { style: 'magic', maxHit: 12, weight: 1, range: 8, projectileColor: '#ff9a20', effect: 'drain_prayer', drainAmount: 5, message: 'The hierophant\'s dirge saps your faith!' }],
  model: { template: 'human', colors: { skin: '#8a5a3a', top: '#f0e0b0', legs: '#c8a040' },
    equipment: { head: { shape: 'wizard_hat', color: '#e8c060' }, body: { shape: 'robe_top', color: '#f0e0b0' }, weapon: { shape: 'staff', color: '#5a3a18', glow: '#ffd040' } } } });
mon({ id: 'raid_exarch', name: 'Sunsworn exarch', examine: 'The choir\'s last captain. His armour has rusted gold.', attackStyle: 'crush', attackSpeed: 5, maxHit: 27, size: 2, immuneBind: true,
  stats: { attack: 175, strength: 180, defence: 155, hitpoints: 230 }, bonuses: { attackCrush: 80, strength: 70, ...armour(150, 70, 140) },
  model: { template: 'human', scale: 1.45, colors: { skin: '#7a5a3a', top: '#a07a30', legs: '#5a4020' }, extras: { glowEyes: '#ffd040' },
    equipment: { head: { shape: 'full_helm', color: '#c8a040' }, body: { shape: 'platebody', color: '#c8a040' }, legs: { shape: 'platelegs', color: '#8a6a28' }, weapon: { shape: 'warhammer', color: '#d8c070', glow: '#ffb030' } } } });
mon({ id: 'raid_thrall', name: 'Drowned thrall', examine: 'Aurvael\'s dreams given flesh, and water, and teeth.', attackStyle: 'crush', attackSpeed: 4, maxHit: 18,
  stats: { attack: 130, strength: 130, defence: 120, hitpoints: 150 }, bonuses: { attackCrush: 50, strength: 40, ...armour(100, 60, 100) },
  model: { template: 'zombie', scale: 1.1, colors: { skin: '#4a7a80', top: '#1e3a40', legs: '#1a2e34' }, extras: { glowEyes: TIDE2 } } });

// ---- mini-boss: the Twin-Souled Sentinel -------------------------------------------------------------
// Two definitions (same HP pool, same attack list order so multiplayer replays line up): the Ember soul casts magic,
// the Gale soul fires ranged bolts. Each soul also wards against its own style (systems/raid_rooms.js).
const SENTINEL_ATTACKS = (mw, rw) => [
  { style: 'magic', maxHit: 33, weight: mw, range: 9, projectileColor: '#ff6020', projectileSize: 0.16 },
  { style: 'ranged', maxHit: 31, weight: rw, range: 9, projectileColor: '#80ffb0', projectileSize: 0.1 },
];
const sentinel = (id, soul, colors, mw, rw) => mon({
  id, name: 'The Twin-Souled Sentinel', examine: `A choir-guardian of brass and sunstone. Its ${soul} soul is burning.`, combatLevel: 386, boss: true, size: 2,
  attackStyle: mw ? 'magic' : 'ranged', attackRange: 9, attackSpeed: 5, immuneBind: true, immunePoison: true, tags: ['boss'],
  stats: { attack: 200, strength: 200, defence: 150, ranged: 220, magic: 165, hitpoints: 560 }, bonuses: armour(120, 70, 110),
  attacks: SENTINEL_ATTACKS(mw, rw),
  model: { template: 'elemental', scale: 1.7, colors },
});
sentinel('raid_sentinel_ember', 'ember', { body: '#7a3a18', core: '#ff7a20', eyes: '#ffe080' }, 1, 0);
sentinel('raid_sentinel_gale', 'gale', { body: '#2a5a48', core: '#80ffb0', eyes: '#e0fff0' }, 0, 1);

// ---- final boss: Aurvael, the Drowned Sun ------------------------------------------------------------
// Four definitions sharing one attack list [claw, solar bolt, tide shards] (weights differ): sun (magic), tide (ranged),
// and enraged versions of both (faster). systems/raid_rooms.js swaps them per phase.
const AURVAEL_ATTACKS = (mw, rw, speed) => [
  { style: 'melee', type: 'slash', maxHit: 28, weight: 1, range: 1, speed },
  { style: 'magic', maxHit: 34, weight: mw, range: 11, projectileColor: '#ffd040', projectileSize: 0.22, speed },
  { style: 'ranged', maxHit: 32, weight: rw, range: 11, projectileColor: '#60e0ff', projectileSize: 0.14, speed },
];
const aurvael = (id, examine, colors, mw, rw, speed) => mon({
  id, name: 'Aurvael, the Drowned Sun', examine, combatLevel: 642, boss: true, size: 4, tags: ['boss', 'dragon'],
  attackStyle: 'magic', attackRange: 11, attackSpeed: speed, immuneBind: true, immunePoison: true,
  stats: { attack: 260, strength: 250, defence: 170, ranged: 260, magic: 185, hitpoints: 950 }, bonuses: armour(130, 60, 125),
  attacks: AURVAEL_ATTACKS(mw, rw, speed),
  model: { template: 'glow_dragon', scale: 1.75, ...colors },
});
const SUN_LOOK = { colors: { body: '#c8902a', belly: '#ffe0a0', horn: '#fff0c0' }, wings: '#d8a040', spikes: '#ffd070', glowEyes: '#fff060', breath: '#ffd060' };
const TIDE_LOOK = { colors: { body: '#2a6a70', belly: '#a0e8e0', horn: '#d0fff8' }, wings: '#3a8a90', spikes: '#80f0ff', glowEyes: '#c0ffff', breath: '#60e0ff' };
const SUN_ENR = { colors: { body: '#b0501a', belly: '#ffc070', horn: '#fff0c0' }, wings: '#c84a18', spikes: '#ffa040', glowEyes: '#ffffff', breath: '#ff8020' };
const TIDE_ENR = { colors: { body: '#1a4a60', belly: '#70c0e0', horn: '#ffffff' }, wings: '#205a80', spikes: '#40c0ff', glowEyes: '#ffffff', breath: '#40a0ff' };
aurvael('raid_aurvael_sun', 'A sun-wyrm that drowned dreaming. Its scales still burn with noon.', SUN_LOOK, 1, 0, 5);
aurvael('raid_aurvael_tide', 'The aquifer has seeped into its scales. It sheds them like knives.', TIDE_LOOK, 0, 1, 5);
aurvael('raid_aurvael_sun_enr', 'Furious, blinding, dying all over again.', SUN_ENR, 1, 0, 4);
aurvael('raid_aurvael_tide_enr', 'Furious, cold, dying all over again.', TIDE_ENR, 0, 1, 4);
export const AURVAEL_IDS = ['raid_aurvael_sun', 'raid_aurvael_tide', 'raid_aurvael_sun_enr', 'raid_aurvael_tide_enr'];
export const SENTINEL_IDS = ['raid_sentinel_ember', 'raid_sentinel_gale'];

// ---- the Seeker (surface) ---------------------------------------------------------------------------
registerNpc({ id: 'raid_seeker', name: 'Seeker Ilsabet Corran', examine: 'A scholar of drowned things, sunburnt and unrepentant.',
  options: ['Talk-to', 'Rewards'], wanderRadius: 0, mapIcon: { char: 'R', color: SUN },
  model: { template: 'human', female: true, hairStyle: 'long', colors: { skin: '#b07850', top: '#c8a060', legs: '#6a4a2a', hair: '#e8e0d0' },
    equipment: { head: { shape: 'hood', color: '#a87a40' }, weapon: { shape: 'staff', color: '#5a3a18', glow: SUN } } } });

const RULES = [
  'Bring friends - up to four. The citadel weighs whoever stands in the Antechamber when the gate opens, and grows stronger for each of you.',
  'The Hall of Prisms: rotate the mirrors until the sunbeam strikes the dawn receptor. Anyone may turn any mirror.',
  'The Sunsworn Barracks: three waves of the choir - blades, bows and hymns. Pray against what hurts most and keep moving.',
  'The Twin-Souled Sentinel switches souls every few attacks. Ember soul: protect from MAGIC and do not strike it with magic. Gale soul: protect from MISSILES and do not shoot it. When the floor glows violet under you - move!',
  'The Drowned Cistern is safe. Fish eels from the pool, pick glowcaps and lotus, cook on the brazier and brew Sunwell tonic at the font. The shrine restores prayer. Nothing you make there survives outside.',
  'Aurvael, the Drowned Sun: golden scales mean solar bolts (protect from magic), teal scales mean tide shards (protect from missiles). Glowing tiles burst - step off. A beam of light across the floor will scour its whole line. At two thirds it hides behind an eclipse until its thralls fall. Near the end it will try to drown the whole hall in light - find the golden circles.',
  'Fall inside and you wake in the Antechamber with everything you brought, but the team loses a tenth of its points.',
  'At the end, each of you opens the reliquary yourself. Your share depends on the team\'s points - nobody can take your loot, and you can take nobody\'s.',
];
export const RAID_RULES = RULES;
registerDialogue('raid_seeker', [
  { npc: 'Beneath these stairs lies the Drowned Sun - the sunken citadel of the Sunsworn choir. And at its heart, Aurvael, still dreaming.' },
  { label: 'menu', options: [
    { text: 'How does it work?', goto: 'how' },
    { text: 'Tell me about each chamber.', goto: 'rooms' },
    { text: 'What can I find down there?', goto: 'loot' },
    { text: 'Goodbye.', end: true },
  ] },
  { label: 'how', npc: RULES[0] },
  { npc: RULES[6] },
  { npc: RULES[7], goto: 'menu' },
  { label: 'rooms', npc: RULES[1] },
  { npc: RULES[2] },
  { npc: RULES[3] },
  { npc: RULES[4] },
  { npc: RULES[5], goto: 'menu' },
  { label: 'loot', npc: 'The choir buried its relics with Aurvael: Dawnrend, the Hymnstring, the Eclipse staff, Sunwrought armour, the Aegis of the Sunken Choir and the Ring of the Seventh Hymn. Some say a little wyrmling sleeps in the reliquary, too.' },
  { npc: 'And the choir\'s artisans left ornament kits - Dawnfire for the weapons, Tidewrought for the armour - if you like to look the part.', goto: 'menu' },
]);

// =================================================================================================
// Scenery templates (telegraphs, beams, puzzle pieces)
// =================================================================================================
const noPick = (o) => { o.traverse((c) => { if (c.isMesh) c.raycast = () => {}; }); return o; };
const MARK_GEO = new THREE.RingGeometry(0.28, 0.47, 20).rotateX(-Math.PI / 2);
const MARK_DISC = new THREE.CircleGeometry(0.44, 16).rotateX(-Math.PI / 2);
const markMats = new Map();
function markMat(color) {
  if (!markMats.has(color)) {
    markMats.set(color, {
      ring: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      disc: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    });
  }
  return markMats.get(color);
}
registerSceneryTemplate('raid_mark', (b) => { b.box('#000', 0.01, 0.01, 0.01, [0, 0, 0]); }, {
  animated: true,
  create(model) {
    const g = new THREE.Group();
    const m = markMat(model.color || '#ff5020');
    const ring = new THREE.Mesh(MARK_GEO, m.ring), disc = new THREE.Mesh(MARK_DISC, m.disc);
    ring.position.y = 0.06; disc.position.y = 0.05;
    ring.renderOrder = 6; disc.renderOrder = 6;
    g.add(disc, ring);
    const phase = Math.random() * 6;
    g.userData.update = (t) => {
      const k = 0.5 + 0.5 * Math.sin(t * 9 + phase);
      ring.scale.setScalar(0.85 + k * 0.25);
      disc.scale.setScalar(0.6 + k * 0.4);
    };
    return noPick(g);
  },
});
const BEAM_GEO = new THREE.BoxGeometry(1.02, 0.07, 0.07);
const BEAM_GLOW = new THREE.BoxGeometry(1.02, 0.2, 0.2);
const BEAM_MAT = new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
const BEAM_GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
registerSceneryTemplate('raid_beam', (b) => { b.box('#000', 0.01, 0.01, 0.01, [0, 0, 0]); }, {
  animated: true,
  create(model) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(BEAM_GEO, BEAM_MAT), glow = new THREE.Mesh(BEAM_GLOW, BEAM_GLOW_MAT);
    core.position.y = glow.position.y = 0.95;
    if (model.corner) { core.scale.x = glow.scale.x = 0.3; }
    g.add(core, glow);
    g.userData.update = (t) => { glow.scale.y = glow.scale.z = 0.8 + 0.3 * Math.sin(t * 14); };
    return noPick(g);
  },
});
registerSceneryTemplate('raid_mirror', (b, p) => {
  b.cyl('#6a5a48', 0.32, 0.38, 0.5, 8, [0, 0.25, 0], [0, 0, 0], 0);
  b.cyl('#c8a040', 0.06, 0.06, 0.5, 6, [0, 0.7, 0], [0, 0, 0], 0);
  // the reflective pane: '/' runs from south-west to north-east (+45deg about Y), '\' the other way
  const a = p.o ? -Math.PI / 4 : Math.PI / 4;
  b.box('#e8f4ff', 0.95, 0.75, 0.06, [0, 1.15, 0], [0, a, 0], 0);
  b.box('#c8a040', 1.0, 0.08, 0.1, [0, 0.76, 0], [0, a, 0], 0);
  b.box('#c8a040', 1.0, 0.08, 0.1, [0, 1.54, 0], [0, a, 0], 0);
});
registerSceneryTemplate('raid_lens', (b) => {
  b.box('#6a5a48', 0.8, 0.9, 0.8, [0, 0.45, 0], [0, 0, 0], 0.04);
  b.cyl('#c8a040', 0.3, 0.3, 0.2, 10, [0.4, 1.1, 0], [0, 0, Math.PI / 2], 0);
  b.sphere('#fff4c0', 0.24, [0.45, 1.1, 0], [0.6, 1, 1], 1, 0);
  b.cone('#e8b040', 0.18, 0.5, 6, [0, 1.25, 0], [0, 0, 0], 0);
});

// =================================================================================================
// Objects
// =================================================================================================
const O = (def) => registerObject(def);
O({ id: 'raid_wall', name: 'Sunken wall', examine: 'Sandstone blocks, sweating aquifer water.', model: { template: 'wall', color: '#6e5e4a', height: 1.1 }, minimap: 'wall' });
O({ id: 'raid_sunken_stair', name: 'Sunken stair', examine: 'Steps of gold-veined sandstone lead down into cool, wet darkness.', size: [2, 2],
  options: ['Descend', 'Read'], readText: 'Carved above the stair: "WE SANG AND IT DID NOT WAKE. WE SANG AND THE SANDS TOOK US. DO NOT SING."',
  model: { template: 'dec_stairs_down', color: '#c8a878' }, mapIcon: { char: 'R', color: SUN } });
O({ id: 'raid_stair_up', name: 'Stairs', examine: 'Daylight, far above.', options: ['Climb-up'], model: { template: 'ladder' } });
O({ id: 'raid_tablet', name: 'Choir tablet', examine: 'The Sunsworn left instructions. Helpful of them.', options: ['Read'],
  model: { template: 'dec_notice_board', color: '#8a6a40' } });
O({ id: 'raid_gate', name: 'Sun-sealed gate', examine: 'A gate of beaten gold. It only opens for a full choir.', options: ['Enter', 'Inspect'],
  model: { template: 'portal', color: SUN } });
O({ id: 'raid_door', name: 'Sealed passage', examine: 'Sunstone wards seal the way onward until this chamber is cleansed.', options: ['Enter', 'Inspect'],
  model: { template: 'portal', color: '#b08030' } });
O({ id: 'raid_return', name: 'Return passage', examine: 'A narrow stair back up to the Antechamber.', options: ['Return'], model: { template: 'ladder' } });
O({ id: 'raid_lens', name: 'Sun-lens', examine: 'It gathers the last light of the drowned sun and throws it east.', model: { template: 'raid_lens' } });
O({ id: 'raid_mirror_0', name: 'Prism mirror', examine: 'A polished pane on a turning plinth. It leans like a "/".', options: ['Rotate'], model: { template: 'raid_mirror', o: 0 } });
O({ id: 'raid_mirror_1', name: 'Prism mirror', examine: 'A polished pane on a turning plinth. It leans like a "\\".', options: ['Rotate'], model: { template: 'raid_mirror', o: 1 } });
O({ id: 'raid_receptor', name: 'Dawn receptor', examine: 'A great crystal waiting for the morning.', options: ['Inspect'], model: { template: 'dec_crystal', color: '#ffe0a0', scale: 1.6 } });
O({ id: 'raid_receptor_lit', name: 'Dawn receptor', examine: 'It blazes with captured sunlight.', model: { template: 'dec_crystal', color: '#fff8d0', scale: 1.9 } });
O({ id: 'raid_beam_h', name: 'Sunbeam', examine: 'Light.', blocks: false, model: { template: 'raid_beam' }, minimap: false });
O({ id: 'raid_beam_c', name: 'Sunbeam', examine: 'Light.', blocks: false, model: { template: 'raid_beam', corner: true }, minimap: false });
for (const [k, color] of Object.entries({ fire: '#ff6a20', soul: '#c050ff', beam: '#ffe060', safe: '#60ff90', tide: '#40d8ff' })) {
  O({ id: `raid_mark_${k}`, name: 'Glowing floor', examine: 'Move!', blocks: false, model: { template: 'raid_mark', color }, minimap: false });
}
// cistern (rest room)
O({ id: 'raid_pool', name: 'Cistern pool', examine: 'Pale eels coil in the clear, cold water.', size: [2, 2], options: ['Fish'],
  model: { template: 'pool', water: '#3a8a9a', glow: '#a0f0ff' } });
O({ id: 'raid_glowcap_patch', name: 'Glowcap cluster', examine: 'Mushrooms that drink the dark and glow gold.', options: ['Pick'], model: { template: 'dec_mushrooms', color: '#ffd060' } });
O({ id: 'raid_lotus_patch', name: 'Drowned lotus', examine: 'A lotus that blooms underwater, in the dark, out of spite.', options: ['Pick'], model: { template: 'flowers', color: '#a0e8ff' } });
O({ id: 'raid_brazier', name: 'Choir brazier', examine: 'Still burning, after all these years.', options: ['Cook'], model: { template: 'dec_brazier', flame: '#ffb040' } });
O({ id: 'raid_font', name: 'Sunwell font', examine: 'A basin for brewing the choir\'s tonic.', options: ['Brew'], model: { template: 'dec_cauldron', color: '#8a6a40' } });
O({ id: 'raid_shrine', name: 'Choir shrine', examine: 'A small altar to a sun that never rose again.', options: ['Pray-at'], model: { template: 'altar' } });
// throne
O({ id: 'raid_chest', name: 'Reliquary of the Drowned Sun', examine: 'The choir\'s treasures, sealed while Aurvael lives.', options: ['Open', 'Inspect'], size: [1, 1],
  model: { template: 'dec_chest_deco', color: '#c8a040' } });
O({ id: 'raid_exit', name: 'Sunlit passage', examine: 'A shaft of real daylight. The way out.', options: ['Leave'], model: { template: 'portal', color: '#fff0b0' } });

// =================================================================================================
// Map: surface entrance + six sealed chambers
// =================================================================================================
// surface: a ring of sunken ruins around the stair in the south-east Sunscar Badlands
paint({ shape: 'circle', cx: SURFACE.stair[0] + 1, cy: SURFACE.stair[1] + 1, r: 3.2, terrain: 'sandstone_floor', jitter: 0.6, only: ['red_sand', 'cracked_earth', 'sand'], noScatter: true });
obj('raid_sunken_stair', SURFACE.stair[0], SURFACE.stair[1]);
for (const [x, y] of [[278, 165], [283, 166]]) obj('pillar_sand_broken', x, y);
obj('brazier', 282, 169);
spawn({ type: 'npc', id: 'raid_seeker', x: SURFACE.seeker[0], y: SURFACE.seeker[1], wander: 0 });

for (const r of ROOM_LIST) {
  const [x0, y0, x1, y1] = r.floor;
  paint({ shape: 'rect', x0, y0, x1, y1, terrain: r.terrain, height: 0.2, blocked: false, noScatter: true });
  // perimeter walls (block movement and line of sight between chambers)
  for (let x = x0 - 1; x <= x1 + 1; x++) { obj('raid_wall', x, y0 - 1); obj('raid_wall', x, y1 + 1); }
  for (let y = y0; y <= y1; y++) { obj('raid_wall', x0 - 1, y); obj('raid_wall', x1 + 1, y); }
  area({ id: `raid_${r.key}`, name: r.idx === 0 ? `${RAID_NAME}: Antechamber` : `${RAID_NAME}: ${r.name}`, x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1,
    priority: 30, dungeon: true, safe: true, multi: r.idx > 0, raid: r.key, safeDeath: { x: ROOMS.lobby.arrive[0], y: ROOMS.lobby.arrive[1] } });
}
// lobby
obj('raid_stair_up', 60, 254);
obj('raid_gate', DOORS[0][0], DOORS[0][1]);
obj('raid_tablet', 57, 250);
for (const [x, y] of [[56, 240], [64, 240], [56, 246], [64, 246]]) obj('brazier', x, y);
for (const [x, y] of [[57, 243], [63, 243]]) obj('statue_sun', x, y);
obj('pillar_sand', 56, 253); obj('pillar_sand_broken', 64, 253);
// exits / returns
for (const [i, [x, y]] of Object.entries(DOORS)) if (+i > 0) obj('raid_door', x, y);
for (const [x, y] of Object.values(RETURNS)) obj('raid_return', x, y);
// prisms: the lens moves with the puzzle (spawned at run time); braziers + lamps
for (const [x, y] of [[213, 239], [213, 248], [230, 248], [230, 254]]) obj('brazier', x, y);
// barracks
for (const [x, y] of [[11, 242], [11, 247], [28, 248], [28, 254]]) obj('brazier', x, y);
for (const [x, y] of [[14, 252], [24, 252]]) obj('banner_sand', x, y);
obj('bones_pile', 26, 251); obj('cobweb', 11, 245);
// gallery
for (const [x, y] of [[197, 225], [204, 225], [204, 232], [216, 232]]) obj('brazier_blue', x, y);
for (const [x, y] of [[201, 229], [213, 226]]) obj('pillar_sand', x, y);
// cistern
obj('raid_pool', 138, 225);
for (const [x, y] of [[144, 225], [138, 229]]) obj('raid_glowcap_patch', x, y);
for (const [x, y] of [[141, 225], [138, 231]]) obj('raid_lotus_patch', x, y);
obj('raid_brazier', 146, 228);
obj('raid_font', 146, 231);
obj('raid_shrine', 143, 228);
// throne
obj('raid_chest', THRONE.chest[0], THRONE.chest[1]);
obj('raid_exit', THRONE.exit[0], THRONE.exit[1]);
for (const [x, y] of [[138, 245], [158, 245], [138, 250], [158, 250], [143, 239], [153, 239]]) obj('brazier', x, y);
for (const [x, y] of [[141, 247], [155, 247]]) obj('pillar_sand', x, y);
paint({ shape: 'circle', cx: 148, cy: 243, r: 4.5, terrain: 'scorched', jitter: 1, only: ['sandstone_floor'] });

// the monster pool (hidden until needed; systems/raid.js)
for (const s of SLOTS) spawn({ type: 'npc', id: s.id, x: s.x, y: s.y, wander: 0 });

registerData('raid', 'config', { ROOMS, DOORS, RETURNS, THRONE, SLOTS, WAVES });
