// Minigame content: The Crucible (wave survival, Dustwatch) and Wardens' Rest (crypt champions, Bramblemoor).
// OWNER: activities (minigames). Runtime: src/systems/minigames.js.
//
//  The Crucible        walled pit west of Dustwatch: walls (211-226, 141-154), gate (219,154), arena floor
//                      (212-225, 142-153) - area `crucible` (multi, safeDeath). Warden + token shop outside the gate.
//  Wardens' Rest       five barrow mounds on south-west Bramblemoor around (201,130) - area `wardens_rest`.
//  Wardens' Crypts     five sealed rooms in the dungeon band, (64-118, 225-229) - area `warden_crypts`.
//  The Hollow Tunnels  ring tunnels + reward chest, (272-286, 225-233) - area `warden_tunnels`.
// All monsters here are spawned at run time per player (respawn: false), never shared over the network.

import { registerItem, registerNpc, registerObject, registerShop, registerArea, registerPaint, registerSpawn, registerData } from '../core/registry.js';

const paint = registerPaint, area = registerArea, spawn = registerSpawn;
const obj = (id, x, y, rot = 0, extra = {}) => spawn({ type: 'object', id, x, y, rot, ...extra });

/** Monster helper: combat level from stats (same formula as the vale's monsters). */
function mon(def) {
  const s = { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10, ...(def.stats || {}) };
  const cl = Math.max(1, Math.floor(0.25 * (s.defence + s.hitpoints) + Math.max(0.325 * (s.attack + s.strength), 0.4875 * s.ranged, 0.4875 * s.magic)));
  const style = def.attackStyle || 'crush';
  const anim = def.attackAnim || (style === 'ranged' ? 'shoot' : style === 'magic' ? 'cast' : undefined);
  return registerNpc({
    options: ['Attack'], aggressive: true, alwaysAggressive: true, aggroRange: 20, wanderRadius: 8, respawnTicks: 9999, dropTable: null, noClues: true,
    leashRange: 30, chaseRange: 30,
    ...def, ...(anim ? { attackAnim: anim } : {}), stats: s, combatLevel: def.combatLevel ?? cl,
  });
}
const armour = (n, mag = n, rng = n) => ({ defenceStab: n, defenceSlash: n, defenceCrush: n, defenceMagic: mag, defenceRanged: rng });

// =================================================================================================
// The Crucible
// =================================================================================================
export const CRUCIBLE = {
  gate: [219, 154], outside: [219, 156], entry: [219, 151],
  floor: [212, 142, 225, 153], spawnRect: [213, 143, 224, 148],
  warden: [222, 156],
};

registerItem({ id: 'crucible_token', name: 'Crucible token', examine: 'Stamped with a flame. The Crucible Warden trades in these.', stackable: true, value: 0, tradeable: true,
  icon: { shape: 'coins', color: '#ff7a20' } });
registerItem({ id: 'crucible_cape', name: 'Crucible cape', examine: 'Proof that you survived every wave of the Crucible. It is still warm.', value: 0, tradeable: false,
  slot: 'cape', requirements: {}, color: '#7a1a08',
  bonuses: { attackStab: 4, attackSlash: 4, attackCrush: 4, attackMagic: 3, attackRanged: 3, defenceStab: 12, defenceSlash: 12, defenceCrush: 12, defenceMagic: 12, defenceRanged: 12, strength: 6, rangedStrength: 2, magicDamage: 2, prayer: 3 },
  icon: { shape: 'cape', color: '#7a1a08', color2: '#ffb030' }, model: { color: '#7a1a08', color2: '#ffb030', glow: '#ff7a20' } });
registerItem({ id: 'crucible_gauntlets', name: 'Crucible gauntlets', examine: 'Heat-scarred gauntlets from the Warden\'s own armoury.', value: 150000, tradeable: true,
  slot: 'hands', requirements: { defence: 60 }, color: '#4a2a1a',
  bonuses: { attackStab: 10, attackSlash: 10, attackCrush: 10, attackMagic: 6, attackRanged: 10, defenceStab: 10, defenceSlash: 10, defenceCrush: 10, defenceMagic: 6, defenceRanged: 10, strength: 10, rangedStrength: 2, magicDamage: 2 },
  icon: { shape: 'gloves', color: '#4a2a1a', color2: '#ff7a20' } });
registerItem({ id: 'crucible_greaves', name: 'Crucible greaves', examine: 'They leave scorch marks on carpets.', value: 120000, tradeable: true,
  slot: 'feet', requirements: { defence: 60 }, color: '#4a2a1a',
  bonuses: { defenceStab: 16, defenceSlash: 18, defenceCrush: 20, defenceMagic: 4, defenceRanged: 12, strength: 5, prayer: 1 },
  icon: { shape: 'boots', color: '#4a2a1a', color2: '#ff7a20' } });
registerItem({ id: 'crucible_charm', name: 'Ember charm', examine: 'A little cinder in a cage of brass. Wards off the cold - and a bit more.', value: 60000, tradeable: true,
  slot: 'neck', requirements: {}, color: '#ff7a20',
  bonuses: { attackStab: 8, attackSlash: 8, attackCrush: 8, attackMagic: 8, attackRanged: 8, defenceStab: 4, defenceSlash: 4, defenceCrush: 4, defenceMagic: 4, defenceRanged: 4, strength: 6, prayer: 2 },
  icon: { shape: 'amulet', color: '#c8a040', color2: '#ff7a20' } });
registerShop({ id: 'crucible_exchange', name: 'Crucible Exchange', currency: 'crucible_token', sellRate: 0.01, buyRate: 0, restockTicks: 200,
  stock: [{ id: 'crucible_charm', qty: 5 }, { id: 'crucible_gauntlets', qty: 3 }, { id: 'crucible_greaves', qty: 3 }] });

// ---- monsters --------------------------------------------------------------------------------------
mon({ id: 'crucible_brawler', name: 'Pit brawler', examine: 'He fights for the crowd, and the crowd is not here.', attackStyle: 'crush', attackSpeed: 4, maxHit: 8,
  stats: { attack: 45, strength: 50, defence: 40, hitpoints: 50 }, bonuses: { attackCrush: 20, strength: 20, ...armour(30, 10, 30) },
  model: { template: 'human', colors: { skin: '#a8724a', top: '#7a3a1a', legs: '#3a2a1a', hair: '#1a1a1a' }, equipment: { weapon: { shape: 'mace', color: '#8a8a8a' } } } });
mon({ id: 'crucible_slinger', name: 'Pit slinger', examine: 'A goblin with very good aim and very bad manners.', attackStyle: 'ranged', attackRange: 7, attackSpeed: 4, maxHit: 8, projectileColor: '#c8b080',
  stats: { ranged: 60, defence: 35, hitpoints: 45 }, bonuses: { attackRanged: 25, ...armour(25, 10, 35) },
  model: { template: 'goblin', scale: 1.1, colors: { skin: '#8a9a3a', top: '#6a4a2a' }, equipment: { weapon: { shape: 'bow', color: '#6a4a2a' } } } });
mon({ id: 'crucible_adept', name: 'Ember adept', examine: 'An apprentice of the pyre, eager to prove herself.', attackStyle: 'magic', attackRange: 8, attackSpeed: 5, maxHit: 9, projectileColor: '#ff7a20',
  stats: { magic: 70, defence: 30, hitpoints: 45 }, bonuses: { attackMagic: 25, ...armour(20, 40, 20) },
  model: { template: 'human', female: true, hairStyle: 'long', colors: { top: '#8a2a10', legs: '#5a1a08', hair: '#e8a040' },
    equipment: { head: { shape: 'hood', color: '#5a1a08' }, body: { shape: 'robe_top', color: '#8a2a10' }, weapon: { shape: 'staff', color: '#5a3a1a' } } } });
mon({ id: 'crucible_ravager', name: 'Ash ravager', examine: 'Scaled, fast and venomous.', attackStyle: 'slash', attackSpeed: 4, maxHit: 14, poisonous: true, poisonDamage: 6,
  stats: { attack: 90, strength: 95, defence: 70, hitpoints: 90 }, bonuses: { attackSlash: 50, strength: 40, ...armour(60, 30, 60) },
  model: { template: 'lizardfolk', colors: { skin: '#5a4a3a' }, equipment: { weapon: { shape: 'scimitar', color: '#c8c8d0' } } } });
mon({ id: 'crucible_marksman', name: 'Dune marksman', examine: 'She never misses. Well - rarely.', attackStyle: 'ranged', attackRange: 8, attackSpeed: 5, maxHit: 15, projectileColor: '#e8d0a0',
  stats: { ranged: 110, defence: 70, hitpoints: 80 }, bonuses: { attackRanged: 50, ...armour(50, 30, 70) },
  model: { template: 'human', female: true, colors: { top: '#c8a060', legs: '#8a6a3a', skin: '#c08050' }, equipment: { head: { shape: 'coif', color: '#8a6a3a' }, weapon: { shape: 'bow', color: '#3a2a1a' } } } });
mon({ id: 'crucible_pyromancer', name: 'Pyre caller', examine: 'It speaks only in flames.', attackStyle: 'magic', attackRange: 8, attackSpeed: 5, maxHit: 18, projectileColor: '#ff4a10',
  stats: { magic: 130, defence: 60, hitpoints: 85 }, bonuses: { attackMagic: 50, ...armour(40, 70, 40) },
  attacks: [{ style: 'magic', maxHit: 18, weight: 3, range: 8, projectileColor: '#ff4a10' }, { style: 'magic', maxHit: 12, weight: 1, range: 8, projectileColor: '#ffa020', effect: 'aoe' }],
  model: { template: 'imp', scale: 2.1, colors: { skin: '#c83a10', top: '#7a1a08', legs: '#5a1008' }, extras: { glowEyes: '#ffd040' }, equipment: { weapon: { shape: 'staff', color: '#2a1a10' } } } });
mon({ id: 'crucible_juggernaut', name: 'Crucible juggernaut', examine: 'Sandstone and spite, bolted together.', attackStyle: 'crush', attackSpeed: 6, maxHit: 22, size: 2,
  stats: { attack: 140, strength: 150, defence: 130, hitpoints: 160 }, bonuses: { attackCrush: 60, strength: 50, ...armour(110, 50, 110) },
  model: { template: 'golem', scale: 1.15, colors: { skin: '#c8a878', top: '#a88a60', legs: '#a88a60', eyes: '#ff7a20' }, extras: { glowEyes: '#ff7a20' } } });

// The champion swaps between three phase definitions (same name and HP pool): melee / ranged / magic.
const champ = (suffix, style, eyes, attacks, examineExtra) => mon({
  id: `crucible_champion${suffix}`, name: 'Ignarax, Champion of the Crucible', examine: `The undefeated master of the pit. ${examineExtra}`, combatLevel: 312, boss: true, size: 2,
  attackStyle: style, attackRange: style === 'melee' || style === 'crush' ? 1 : 9, attackSpeed: 5, tags: ['boss', 'demon'], immuneBind: true,
  stats: { attack: 220, strength: 220, defence: 180, ranged: 220, magic: 220, hitpoints: 480 }, bonuses: armour(130, 110, 130), attacks,
  model: { template: 'demon', scale: 1.05, colors: { skin: '#4a1408', top: '#4a1408', legs: '#2a0a04' }, extras: { wingColor: '#7a2008', glowEyes: eyes, cracks: eyes, crown: '#ffb030' },
    equipment: { weapon: { shape: style === 'ranged' ? 'bow' : style === 'magic' ? 'staff' : 'twohanded', color: '#2a1a14', glow: eyes } } },
});
champ('', 'crush', '#ff4020', [{ style: 'melee', type: 'crush', maxHit: 34, weight: 1, message: null }], 'Right now it wants to get close.');
champ('_ranged', 'ranged', '#80ff40', [{ style: 'ranged', maxHit: 30, weight: 1, range: 9, projectileColor: '#a0ff60', projectileSize: 0.12 }], 'It is keeping its distance.');
champ('_magic', 'magic', '#40a0ff', [{ style: 'magic', maxHit: 30, weight: 1, range: 9, projectileColor: '#60b0ff' }], 'Blue fire crawls along its arms.');

/** Waves 1..18 (the last one is the champion). */
export const CRUCIBLE_WAVES = [
  ['crucible_brawler'],
  ['crucible_brawler', 'crucible_brawler'],
  ['crucible_slinger'],
  ['crucible_brawler', 'crucible_slinger'],
  ['crucible_adept'],
  ['crucible_slinger', 'crucible_adept'],
  ['crucible_brawler', 'crucible_brawler', 'crucible_adept'],
  ['crucible_ravager'],
  ['crucible_ravager', 'crucible_slinger'],
  ['crucible_marksman'],
  ['crucible_ravager', 'crucible_adept', 'crucible_slinger'],
  ['crucible_pyromancer'],
  ['crucible_marksman', 'crucible_pyromancer'],
  ['crucible_juggernaut'],
  ['crucible_juggernaut', 'crucible_adept', 'crucible_slinger'],
  ['crucible_marksman', 'crucible_pyromancer', 'crucible_ravager'],
  ['crucible_juggernaut', 'crucible_marksman', 'crucible_pyromancer'],
  ['crucible_champion'],
];

// ---- warden + gate --------------------------------------------------------------------------------
registerNpc({ id: 'crucible_warden', name: 'Warden Saska', examine: 'Keeper of the Crucible. Her armour has more dents than plates.',
  options: ['Talk-to', 'Trade', 'Records'], shop: 'crucible_exchange', wanderRadius: 0, mapIcon: { char: 'C', color: '#ff7a20' },
  model: { template: 'human', female: true, hairStyle: 'long', colors: { skin: '#b07850', top: '#6a3a1a', legs: '#3a2a1a', hair: '#2a1a10' },
    equipment: { body: 'emberite_platebody', cape: { shape: 'cape', color: '#7a1a08', color2: '#ffb030' }, weapon: { shape: 'spear', color: '#c8c8d0' } } } });
registerObject({ id: 'crucible_gate', name: 'Crucible gate', examine: 'Iron-banded and scorched. Beyond it, the pit waits.', options: ['Enter', 'Records'],
  model: { template: 'door', color: '#3a2a20' }, mapIcon: { char: 'C', color: '#ff7a20' } });
registerObject({ id: 'crucible_sign', name: 'Notice', examine: 'Nailed to the pit wall.', options: ['Read'],
  readText: 'THE CRUCIBLE. Eighteen waves. One champion. Fall in the pit and the Warden drags you out - your belongings stay yours. Survive, and wear the flame.',
  model: { template: 'sign' } });

// terrain: the pit sits west of Dustwatch's palisade, south of the mesas, north of the Haverly road
paint({ shape: 'rect', x0: 209, y0: 139, x1: 227, y1: 154, terrain: 'cracked_earth', blocked: false, noScatter: true, falloff: 2, height: 1.1 });
paint({ shape: 'rect', x0: 213, y0: 155, x1: 225, y1: 155, blocked: false, noScatter: true });
spawn({ type: 'building', name: 'The Crucible', x: 211, y: 141, w: 16, h: 14, wall: 'wall_sandstone', floor: 'sand', roof: false, doors: [{ side: 's', offset: 8, width: 1 }] });
obj('crucible_gate', 219, 154);
obj('crucible_sign', 217, 155);
for (const [x, y] of [[214, 155], [224, 155]]) obj('brazier', x, y);
for (const [x, y] of [[213, 143], [224, 143]]) obj('banner_sand', x, y);
spawn({ type: 'npc', id: 'crucible_warden', x: CRUCIBLE.warden[0], y: CRUCIBLE.warden[1], wander: 0 });
area({ id: 'crucible', name: 'The Crucible', x0: 212, y0: 142, x1: 225, y1: 153, priority: 20, multi: true, safe: true,
  safeDeath: { x: CRUCIBLE.outside[0], y: CRUCIBLE.outside[1] } });

// =================================================================================================
// Wardens' Rest
// =================================================================================================
/** Champions: id, crypt room x0 (rooms are 7 wide at y 225-229), mound centre, colours, set. */
export const WARDENS = [
  { id: 'halvard', name: 'Halvard the Unbowed', style: 'melee', mound: [195, 125], stone: [195, 122], room: 64, color: '#4a4a52', trim: '#c8a040',
    effect: 'Unbowed: melee hits grow stronger the more wounded you are (up to +60%).' },
  { id: 'morwen', name: 'Morwen the Hexbinder', style: 'magic', mound: [207, 125], stone: [207, 122], room: 76, color: '#3a1e4a', trim: '#9aff9a',
    effect: 'Hexbite: magic hits may sap the target\'s Defence and Magic.' },
  { id: 'sorrel', name: 'Sorrel the Quiet Bow', style: 'ranged', mound: [209, 131], stone: [212, 131], room: 88, color: '#4a3a2a', trim: '#a0d0a0',
    effect: 'Twinned fletch: ranged hits may strike with 40% more force.' },
  { id: 'grimbald', name: 'Grimbald the Gravedigger', style: 'crush', mound: [200, 135], stone: [203, 136], room: 100, color: '#5a4a3a', trim: '#8a6a3a',
    effect: 'Gravefeast: melee hits may heal you for the damage dealt.' },
  { id: 'ysmera', name: 'Ysmera the Venomous', style: 'stab', mound: [193, 132], stone: [193, 129], room: 112, color: '#2a4a3a', trim: '#80ff60',
    effect: 'Venom tithe: hits may poison the target and restore a little Prayer.' },
];
export const WARDEN_SURFACE = [201, 130];             // the cairn in the middle of the mounds (tunnel exit)
export const WARDEN_TUNNELS = { entry: [273, 226], chest: [279, 229], stairs: [272, 225] };
const CRYPT_Y0 = 225, CRYPT_Y1 = 229;

// ---- gear sets -----------------------------------------------------------------------------------
const MELEE_HELM = { attackMagic: -6, attackRanged: -2, defenceStab: 44, defenceSlash: 46, defenceCrush: 42, defenceMagic: -1, defenceRanged: 45, strength: 2 };
const MELEE_BODY = { attackMagic: -30, attackRanged: -10, defenceStab: 102, defenceSlash: 100, defenceCrush: 96, defenceMagic: -6, defenceRanged: 102, strength: 2 };
const MELEE_LEGS = { attackMagic: -21, attackRanged: -7, defenceStab: 74, defenceSlash: 72, defenceCrush: 70, defenceMagic: -4, defenceRanged: 72, strength: 1 };
const gear = (w, piece, def) => registerItem({
  value: 90000, tradeable: true, wardenSet: w.id, color: w.color, ...def,
  id: `${w.id}_${piece}`, examine: def.examine || `Part of ${w.name}'s grave-gear.`,
  icon: { color: w.color, color2: w.trim, ...(def.icon || {}) },
  model: { color: w.color, trim: w.trim, ...(def.model || {}) },
});
{
  const [h, m, s, g, y] = WARDENS;
  gear(h, 'helm', { name: "Halvard's greathelm", slot: 'head', requirements: { defence: 70 }, bonuses: MELEE_HELM, icon: { shape: 'fullhelm' }, model: { shape: 'full_helm', crest: h.trim } });
  gear(h, 'body', { name: "Halvard's platebody", slot: 'body', requirements: { defence: 70 }, bonuses: MELEE_BODY, icon: { shape: 'platebody' }, model: { shape: 'platebody' } });
  gear(h, 'legs', { name: "Halvard's platelegs", slot: 'legs', requirements: { defence: 70 }, bonuses: MELEE_LEGS, icon: { shape: 'legs' }, model: { shape: 'platelegs' } });
  gear(h, 'weapon', { name: "Halvard's greatsword", slot: 'weapon', weaponType: 'twohanded', twoHanded: true, attackSpeed: 7, requirements: { attack: 70, strength: 70 },
    bonuses: { attackStab: -4, attackSlash: 106, attackCrush: 94, strength: 114 }, icon: { shape: 'twohand' }, model: { shape: 'twohanded', glow: h.trim } });

  gear(m, 'helm', { name: "Morwen's hood", slot: 'head', requirements: { defence: 70, magic: 70 }, bonuses: { attackMagic: 10, defenceMagic: 12, defenceStab: 12, defenceSlash: 12, defenceCrush: 10, defenceRanged: 12 }, icon: { shape: 'hood' }, model: { shape: 'hood' } });
  gear(m, 'body', { name: "Morwen's robe top", slot: 'body', requirements: { defence: 70, magic: 70 }, bonuses: { attackMagic: 30, defenceMagic: 30, defenceStab: 22, defenceSlash: 20, defenceCrush: 24, defenceRanged: 20 }, icon: { shape: 'robe_top' }, model: { shape: 'robe_top', glow: m.trim } });
  gear(m, 'legs', { name: "Morwen's robe skirt", slot: 'legs', requirements: { defence: 70, magic: 70 }, bonuses: { attackMagic: 22, defenceMagic: 22, defenceStab: 16, defenceSlash: 14, defenceCrush: 18, defenceRanged: 14 }, icon: { shape: 'skirt' }, model: { shape: 'robe' } });
  gear(m, 'weapon', { name: "Morwen's staff", slot: 'weapon', weaponType: 'staff', twoHanded: true, attackSpeed: 5, requirements: { magic: 70 },
    bonuses: { attackCrush: 15, attackMagic: 26, defenceMagic: 20, defenceStab: 3, defenceSlash: 3, magicDamage: 8, strength: 10 }, icon: { shape: 'staff' }, model: { shape: 'staff', glow: m.trim } });

  gear(s, 'helm', { name: "Sorrel's coif", slot: 'head', requirements: { defence: 70, ranged: 70 }, bonuses: { attackRanged: 8, defenceStab: 22, defenceSlash: 24, defenceCrush: 26, defenceMagic: 18, defenceRanged: 24 }, icon: { shape: 'hood' }, model: { shape: 'coif' } });
  gear(s, 'body', { name: "Sorrel's jerkin", slot: 'body', requirements: { defence: 70, ranged: 70 }, bonuses: { attackMagic: -10, attackRanged: 30, defenceStab: 62, defenceSlash: 56, defenceCrush: 66, defenceMagic: 50, defenceRanged: 64 }, icon: { shape: 'chainbody' }, model: { shape: 'chainbody' } });
  gear(s, 'legs', { name: "Sorrel's chaps", slot: 'legs', requirements: { defence: 70, ranged: 70 }, bonuses: { attackMagic: -8, attackRanged: 18, defenceStab: 34, defenceSlash: 30, defenceCrush: 36, defenceMagic: 30, defenceRanged: 36 }, icon: { shape: 'legs' }, model: { shape: 'platelegs' } });
  gear(s, 'weapon', { name: "Sorrel's warbow", slot: 'weapon', weaponType: 'bow', twoHanded: true, attackSpeed: 5, requirements: { ranged: 70 },
    bonuses: { attackRanged: 88, rangedStrength: 6 }, icon: { shape: 'bow' }, model: { shape: 'bow', glow: s.trim } });

  gear(g, 'helm', { name: "Grimbald's helm", slot: 'head', requirements: { defence: 70 }, bonuses: MELEE_HELM, icon: { shape: 'helm' }, model: { shape: 'med_helm' } });
  gear(g, 'body', { name: "Grimbald's platebody", slot: 'body', requirements: { defence: 70 }, bonuses: MELEE_BODY, icon: { shape: 'platebody' }, model: { shape: 'platebody' } });
  gear(g, 'legs', { name: "Grimbald's platelegs", slot: 'legs', requirements: { defence: 70 }, bonuses: MELEE_LEGS, icon: { shape: 'legs' }, model: { shape: 'platelegs' } });
  gear(g, 'weapon', { name: "Grimbald's grave-maul", slot: 'weapon', weaponType: 'warhammer', attackSpeed: 6, requirements: { attack: 70, strength: 70 },
    bonuses: { attackStab: -4, attackSlash: -4, attackCrush: 96, strength: 100, defenceCrush: 6 }, icon: { shape: 'warhammer' }, model: { shape: 'maul', glow: g.trim } });

  gear(y, 'helm', { name: "Ysmera's helm", slot: 'head', requirements: { defence: 70 }, bonuses: MELEE_HELM, icon: { shape: 'fullhelm' }, model: { shape: 'full_helm', crest: y.trim } });
  gear(y, 'body', { name: "Ysmera's chainbody", slot: 'body', requirements: { defence: 70 }, bonuses: { ...MELEE_BODY, defenceCrush: 84, attackMagic: -14 }, icon: { shape: 'chainbody' }, model: { shape: 'chainbody' } });
  gear(y, 'legs', { name: "Ysmera's plateskirt", slot: 'legs', requirements: { defence: 70 }, bonuses: MELEE_LEGS, icon: { shape: 'skirt' }, model: { shape: 'skirt' } });
  gear(y, 'weapon', { name: "Ysmera's spear", slot: 'weapon', weaponType: 'spear', attackSpeed: 5, requirements: { attack: 70 }, poisonous: true,
    bonuses: { attackStab: 92, attackSlash: 82, attackCrush: 80, strength: 94 }, icon: { shape: 'spear' }, model: { shape: 'spear', glow: y.trim } });
}
export const WARDEN_PIECES = ['helm', 'body', 'legs', 'weapon'];

// ---- champions -----------------------------------------------------------------------------------
const wardenNpc = (w, def) => mon({
  id: `warden_${w.id}`, name: w.name, tags: ['undead'], wanderRadius: 4, aggroRange: 10, ...def,
  model: { template: 'skeleton', scale: 1.15, colors: { skin: '#d8d0b8' }, extras: { glowEyes: w.trim },
    equipment: Object.fromEntries(WARDEN_PIECES.map((p) => [p === 'helm' ? 'head' : p, `${w.id}_${p}`])), ...(def.model || {}) },
});
{
  const [h, m, s, g, y] = WARDENS;
  wardenNpc(h, { examine: 'He did not yield in life. He has not started now.', attackStyle: 'slash', attackSpeed: 6, maxHit: 24,
    stats: { attack: 120, strength: 128, defence: 112, hitpoints: 125 }, bonuses: { attackSlash: 70, strength: 60, ...armour(120, 20, 110) } });
  wardenNpc(m, { examine: 'Her curses outlived her by three hundred years.', attackStyle: 'magic', attackRange: 8, attackSpeed: 5, maxHit: 21, projectileColor: m.trim,
    stats: { magic: 132, defence: 92, hitpoints: 112 }, bonuses: { attackMagic: 60, ...armour(60, 110, 60) },
    attacks: [{ style: 'magic', maxHit: 21, weight: 3, range: 8, projectileColor: m.trim }, { style: 'magic', maxHit: 14, weight: 1, range: 8, projectileColor: '#c060ff', effect: 'drain_prayer', drainAmount: 6 }],
    model: { template: 'ghost', hairStyle: 'bald', colors: { skin: '#d8d0e0', top: m.color, legs: m.color }, extras: { glowEyes: m.trim } } });
  wardenNpc(s, { examine: 'You never hear the bowstring.', attackStyle: 'ranged', attackRange: 8, attackSpeed: 5, maxHit: 20, projectileColor: s.trim,
    stats: { ranged: 132, defence: 96, hitpoints: 112 }, bonuses: { attackRanged: 60, ...armour(80, 70, 100) } });
  wardenNpc(g, { examine: 'He dug every grave in the Rest. Then he dug his own.', attackStyle: 'crush', attackSpeed: 5, maxHit: 22,
    stats: { attack: 115, strength: 132, defence: 120, hitpoints: 132 }, bonuses: { attackCrush: 70, strength: 60, ...armour(110, 20, 110) },
    attacks: [{ style: 'melee', type: 'crush', maxHit: 22, weight: 3 }, { style: 'melee', type: 'crush', maxHit: 16, weight: 1, effect: 'heal' }] });
  wardenNpc(y, { examine: 'Her spear still drips.', attackStyle: 'stab', attackSpeed: 5, maxHit: 21, poisonous: true, poisonDamage: 8,
    stats: { attack: 130, strength: 116, defence: 106, hitpoints: 118 }, bonuses: { attackStab: 75, strength: 55, ...armour(100, 30, 100) },
    model: { template: 'skeleton', scale: 1.1, colors: { skin: '#c8d8c0' }, extras: { glowEyes: y.trim } } });
}

// ---- objects ---------------------------------------------------------------------------------------
for (const w of WARDENS) {
  registerObject({ id: `warden_stone_${w.id}`, name: `${w.name.split(' ')[0]}'s stone`, examine: 'A weathered grave-stone at the foot of a barrow mound.', options: ['Read'],
    readText: `"Here sleeps ${w.name}, Warden of the Rest. Disturb not the mound." Someone has scratched underneath: "bring a spade".`,
    model: { template: 'dec_standing_stone', color: '#7a786e', moss: w.trim } });
  registerObject({ id: `warden_tomb_${w.id}`, name: 'Sarcophagus', examine: `The tomb of ${w.name}.`, options: ['Search'], size: [1, 2],
    model: { template: 'dec_sarcophagus', gilded: true, color: '#6a665e' } });
  registerObject({ id: `warden_stairs_${w.id}`, name: 'Stairs', examine: 'Back up to the barrow mound.', options: ['Climb-up'], model: { template: 'ladder' } });
}
registerObject({ id: 'warden_chest', name: 'Wardens\' chest', examine: 'An iron-bound chest, heavy with grave-goods.', options: ['Open'], size: [1, 1],
  model: { template: 'dec_chest_deco', color: '#5a4a3a' } });
registerObject({ id: 'warden_tunnel_stairs', name: 'Stairs', examine: 'A narrow stair winds up towards daylight.', options: ['Climb-up'], model: { template: 'ladder' } });
registerObject({ id: 'warden_cairn', name: 'Wardens\' cairn', examine: 'A cairn of grey stones. Five paths lead from it to five mounds.', options: ['Read'], size: [2, 2],
  readText: 'Five wardens guarded the vale in the old wars, and five sleep here still. Dig into a mound with a spade to enter its crypt. Lay all five to rest - one of them guards the way to their hoard.',
  model: { template: 'dec_rock_cluster', color: '#8a867c' } });

// surface: heath clearing with five raised barrows
paint({ shape: 'rect', x0: 190, y0: 121, x1: 213, y1: 137, noScatter: true });
paint({ shape: 'circle', cx: WARDEN_SURFACE[0], cy: WARDEN_SURFACE[1], r: 8, terrain: 'moss', jitter: 1.5, only: ['heath', 'grass', 'dark_grass', 'cracked_earth', 'red_sand'] });
for (const w of WARDENS) {
  paint({ shape: 'circle', cx: w.mound[0], cy: w.mound[1], r: 2.6, terrain: 'dark_grass', raise: 1.7, falloff: 1.6, jitter: 0.4, blocked: false });
  paint({ shape: 'line', points: [WARDEN_SURFACE, w.mound], width: 0.5, terrain: 'gravel', jitter: 0.2 });
  obj(`warden_stone_${w.id}`, w.stone[0], w.stone[1]);
}
obj('warden_cairn', WARDEN_SURFACE[0] - 1, WARDEN_SURFACE[1] - 2);
area({ id: 'wardens_rest', name: "Wardens' Rest", x0: 190, y0: 121, x1: 213, y1: 137, priority: 5 });

// crypts: five sealed rooms in the dungeon band
const floor = (x0, y0, x1, y1, terrain = 'crypt_floor') => paint({ shape: 'rect', x0, y0, x1, y1, terrain, height: 0.2, blocked: false });
for (const w of WARDENS) {
  const x0 = w.room;
  floor(x0, CRYPT_Y0, x0 + 6, CRYPT_Y1);
  obj(`warden_tomb_${w.id}`, x0 + 3, CRYPT_Y0);
  obj(`warden_stairs_${w.id}`, x0, CRYPT_Y1);
  obj('brazier_blue', x0, CRYPT_Y0); obj('brazier_blue', x0 + 6, CRYPT_Y0);
  obj('cobweb', x0 + 6, CRYPT_Y1);
}
area({ id: 'warden_crypts', name: "Wardens' Crypts", x0: 61, y0: 224, x1: 125, y1: 229, priority: 20, dungeon: true });

// tunnels: a two-wide ring around the chest chamber
{
  const T = 'crypt_floor';
  floor(272, 225, 286, 226, T); floor(272, 232, 286, 233, T);
  floor(272, 225, 273, 233, T); floor(285, 225, 286, 233, T);
  floor(277, 228, 281, 230, T);
  floor(279, 227, 279, 227, T); floor(279, 231, 279, 231, T); floor(274, 229, 276, 229, T); floor(282, 229, 284, 229, T);
  obj('warden_chest', WARDEN_TUNNELS.chest[0], WARDEN_TUNNELS.chest[1]);
  obj('warden_tunnel_stairs', WARDEN_TUNNELS.stairs[0], WARDEN_TUNNELS.stairs[1]);
  for (const [x, y] of [[277, 228], [281, 228], [277, 230], [281, 230]]) obj('torch_stake_green', x, y);
  for (const [x, y] of [[286, 225], [272, 233], [286, 233]]) obj('bones_pile', x, y);
}
area({ id: 'warden_tunnels', name: 'The Hollow Tunnels', x0: 271, y0: 224, x1: 287, y1: 234, priority: 20, dungeon: true });

registerData('minigames', 'config', { CRUCIBLE, CRUCIBLE_WAVES, WARDENS, WARDEN_SURFACE, WARDEN_TUNNELS });
