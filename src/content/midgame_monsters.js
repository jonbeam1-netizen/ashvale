// The Glimmerdeep: monsters, drop tables and boss mechanics. OWNER: content designer (mid-game).
// Imported by midgame_dungeon.js. Spawns are placed in midgame_dungeon.js; coordinates in midgame_common.js.
//
//  Level 1 Drowned Galleries   drowned_delver 41, gillback_raider 48, silt_slug 50 (Slayer 40, slugs),
//                              drowned_keener 62 (Slayer 50, hags - hushwax earmuffs)
//  Level 2 Sporewood           sporecap_crawler 51 (Slayer 45, crawlers), gloomcap_weaver 56, mycelid_shambler 62,
//                              MID-BOSS Vorlagh the Sporebound 74 (+ sporeling adds)
//  Level 3 Emberworks          slag_hound 67, lanternwright_shade 69, cinderhorn_lizard 74 (Slayer 55, glarehorns),
//                              forge_sentinel 74, BOSS the Ashwright Engine 96
// Slayer categories reuse the existing masters' task lists (content/slayer.js); the keener's 'hags' category also
// brings the earmuffs hazard. Boss mechanics run per client for the local player (like the quest bosses).

import { registerNpc, registerDropTable } from '../core/registry.js';
import { hook } from './quest_util.js';
import { GD, armour, aggro, alive, freeTileNear, telegraph } from './midgame_common.js';

/** Monster with combat level / max hit derived from stats (same formula as npcs_monsters.js). */
function m(def) {
  const s = { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10, ...(def.stats || {}) };
  const cl = Math.max(1, Math.floor(0.25 * (s.defence + s.hitpoints) + Math.max(0.325 * (s.attack + s.strength), 0.4875 * s.ranged, 0.4875 * s.magic)));
  const style = def.attackStyle || 'crush';
  const b = def.bonuses || {};
  const offStat = style === 'ranged' ? s.ranged : style === 'magic' ? s.magic : s.strength;
  const offBonus = style === 'ranged' ? (b.rangedStrength || 0) : style === 'magic' ? 0 : (b.strength || 0);
  const maxHit = Math.max(1, Math.floor(0.5 + ((offStat + 9) * (64 + offBonus)) / 640));
  const anim = def.attackAnim || (style === 'ranged' ? 'shoot' : style === 'magic' ? 'cast' : undefined);
  return registerNpc({
    options: ['Attack'], respawnTicks: Math.min(150, 25 + Math.floor(cl / 2)), wanderRadius: 3, dropTable: def.id,
    ...def, ...(anim ? { attackAnim: anim } : {}), stats: s, combatLevel: def.combatLevel ?? cl, maxHit: def.maxHit ?? maxHit,
  });
}

// =================================================================================================
// Level 1 - the Drowned Galleries
// =================================================================================================
m({ id: 'drowned_delver', name: 'Drowned delver', examine: 'A Lanternwright miner, still wearing his lamp-helm. The lamp went out a long time ago. So did he.',
  attackStyle: 'crush', attackSpeed: 5, aggressive: true, aggroRange: 3, tags: ['undead'], slayerCategory: 'zombies',
  stats: { attack: 34, strength: 34, defence: 30, hitpoints: 46 }, bonuses: { strength: 10, ...armour(15, 5, 15) },
  model: { template: 'zombie', colors: { skin: '#6a8a84', top: '#3a4a4a', legs: '#2a3434', eyes: '#a0fff0' }, extras: { glowEyes: '#a0fff0' },
    equipment: { weapon: { shape: 'pickaxe', color: '#5a5a5a' }, head: { shape: 'med_helm', color: '#4a4a40' } } } });
m({ id: 'gillback_raider', name: 'Gillback raider', examine: 'A river-lizard that followed the Silverrun down into the dark and found it liked the taste of miners.',
  attackStyle: 'stab', aggressive: true, aggroRange: 4, slayerCategory: 'lizardfolk',
  stats: { attack: 42, strength: 40, defence: 36, hitpoints: 50 }, bonuses: { attackStab: 25, strength: 15, ...armour(25, 5, 20) },
  model: { template: 'lizardfolk', colors: { skin: '#3a6a6a', top: '#2a3a3a', legs: '#2a5050', eyes: '#e0ff80' }, equipment: { weapon: { shape: 'spear', color: '#a0a090' }, shield: { shape: 'round', color: '#5a4a3a' } } } });
m({ id: 'silt_slug', name: 'Silt slug', examine: 'A slug the size of a barrow, armoured in river silt. Its slime burns.', slayerLevel: 40, slayerCategory: 'slugs',
  attackStyle: 'crush', stats: { attack: 36, strength: 38, defence: 50, hitpoints: 56 }, bonuses: armour(55, 10, 45),
  attacks: [{ style: 'melee', maxHit: 5, weight: 3 }, { style: 'melee', maxHit: 6, weight: 1, effect: 'poison', effectChance: 0.6 }],
  model: { template: 'slug', scale: 1.5, colors: { body: '#5a5a48', belly: '#3a3a30', horn: '#6a6a50' }, spikes: '#7a7a60' } });
m({ id: 'drowned_keener', name: 'Drowned keener', examine: 'She keens for every soul the flood took. Her wail claws at your ears.', slayerLevel: 50, slayerCategory: 'hags',
  attackStyle: 'magic', attackRange: 1, aggressive: true, aggroRange: 3, tags: ['undead'],
  stats: { attack: 30, strength: 30, defence: 44, magic: 72, hitpoints: 64 }, bonuses: armour(15, 40, 15),
  model: { template: 'ghost', female: true, colors: { skin: '#9ac8c0', top: '#3a6a70', legs: '#3a6a70', hair: '#c8e8e0' }, extras: { nose: 0.07, glowEyes: '#80ffe0' } } });

// =================================================================================================
// Level 2 - the Sporewood
// =================================================================================================
m({ id: 'sporecap_crawler', name: 'Sporecap crawler', examine: 'A cave crawler with a mushroom growing out of its back. Or a mushroom with a crawler growing under it.', slayerLevel: 45, slayerCategory: 'crawlers',
  attackStyle: 'stab', aggressive: true, aggroRange: 3, poisonous: true, stats: { attack: 44, strength: 42, defence: 40, hitpoints: 56 }, bonuses: armour(20),
  model: { template: 'crab', scale: 1.4, colors: { body: '#8a6a5a', eyes: '#c0ff60' } } });
m({ id: 'gloomcap_weaver', name: 'Gloomcap weaver', examine: 'A pale spider that spins its webs from glowing spore-thread.', slayerCategory: 'spiders',
  attackStyle: 'ranged', attackRange: 7, aggressive: true, aggroRange: 5, projectileColor: '#d8e8c0',
  stats: { attack: 30, strength: 30, defence: 46, ranged: 62, hitpoints: 60 }, bonuses: { attackRanged: 20, ...armour(20, 10, 30) },
  attacks: [{ style: 'ranged', maxHit: 7, weight: 3, range: 7, projectileColor: '#d8e8c0' }, { style: 'ranged', maxHit: 4, weight: 1, range: 7, projectileColor: '#c0ff80', effect: 'freeze', freezeTicks: 4 }],
  model: { template: 'spider', scale: 1.7, colors: { body: '#c8c8b0', abdomen: '#a8b890', eyes: '#80ff60' }, marking: '#60c040' } });
m({ id: 'mycelid_shambler', name: 'Mycelid shambler', examine: 'What is left of a delver once the Sporewood has finished with him. It is mostly mushroom now.', slayerCategory: 'zombies',
  attackStyle: 'crush', attackSpeed: 5, aggressive: true, aggroRange: 3, stats: { attack: 48, strength: 52, defence: 46, hitpoints: 72 }, bonuses: { strength: 15, ...armour(25, 10, 25) },
  model: { template: 'zombie', scale: 1.15, colors: { skin: '#a89a7a', top: '#6a5a4a', legs: '#4a4034', eyes: '#c0ff60' }, extras: { glowEyes: '#c0ff60' },
    equipment: { head: { shape: 'wizard_hat', color: '#c86a3a' } } } });
m({ id: 'vorlagh_sporebound', name: 'Vorlagh the Sporebound', examine: 'A cave troll that fell asleep in the Heartrot a century ago. The Sporewood grew through it, and now it is the Sporewood. It only stirs when struck.',
  boss: true, tags: ['boss'], combatLevel: 74, size: 2, attackStyle: 'crush', attackSpeed: 5, aggressive: false, wanderRadius: 2, respawnTicks: 100, slayerCategory: 'trolls',
  stats: { attack: 62, strength: 64, defence: 48, magic: 50, hitpoints: 120 }, bonuses: { strength: 20, ...armour(30, 15, 30) }, maxHit: 12,
  attacks: [{ style: 'melee', maxHit: 12, weight: 3 }, { style: 'magic', maxHit: 9, weight: 1, range: 6, projectileColor: '#b0d060', effect: 'poison', effectChance: 0.5 }],
  model: { template: 'troll', scale: 1.15, colors: { skin: '#7a8a5a', top: '#5a4a3a', legs: '#4a3a2a', hair: '#c86a3a', eyes: '#c0ff60' }, extras: { glowEyes: '#c0ff60' },
    equipment: { weapon: { shape: 'mace', color: '#5a4a30' }, head: { shape: 'wizard_hat', color: '#c86a3a' } } } });
m({ id: 'sporeling', name: 'Sporeling', examine: 'A walking puffball. While it lives, Vorlagh drinks its spores.', dropTable: 'none',
  attackStyle: 'stab', aggressive: true, aggroRange: 8, respawnTicks: 999, stats: { attack: 14, strength: 12, defence: 10, hitpoints: 10 }, maxHit: 2,
  model: { template: 'toad', scale: 0.8, colors: { body: '#c8a878', belly: '#e8dcc0', eyes: '#c0ff60' }, warts: '#a07850' } });

// =================================================================================================
// Level 3 - the Emberworks
// =================================================================================================
m({ id: 'slag_hound', name: 'Slag hound', examine: 'A forge-hound of riveted plate and banked coals. It breathes cinders.', slayerCategory: 'wolves',
  attackStyle: 'slash', aggressive: true, aggroRange: 5, stats: { attack: 56, strength: 58, defence: 48, hitpoints: 74 }, bonuses: { strength: 10, ...armour(30, 20, 30) },
  attacks: [{ style: 'melee', maxHit: 8, weight: 3 }, { style: 'magic', maxHit: 7, weight: 1, range: 3, projectileColor: '#ff8030' }],
  model: { template: 'hound', scale: 1.1, colors: { body: '#3a3230', belly: '#2a2422', horn: '#1a1a1a' }, spikes: '#ff6a20', glowEyes: '#ffb030' } });
m({ id: 'cinderhorn_lizard', name: 'Cinderhorn lizard', examine: 'A forge-lizard whose horn glows white before it spits fire.', slayerLevel: 55, slayerCategory: 'glarehorns',
  attackStyle: 'stab', size: 2, stats: { attack: 58, strength: 60, defence: 66, hitpoints: 80 }, bonuses: armour(55, 25, 55),
  attacks: [{ style: 'melee', maxHit: 7, weight: 3 }, { style: 'magic', maxHit: 9, weight: 1, range: 5, projectileColor: '#ff6a20' }],
  model: { template: 'lizard', scale: 1.35, horn: '#fff0c0', glowEyes: '#ff8030', colors: { body: '#5a3a2a', belly: '#c8784a' }, spikes: '#ff6a20' } });
m({ id: 'forge_sentinel', name: 'Forge sentinel', examine: 'A Lanternwright guardian of riveted iron. Its chest-furnace still burns. Spells seem to bother it.', slayerCategory: 'golems',
  attackStyle: 'crush', attackSpeed: 6, aggressive: true, aggroRange: 3, stats: { attack: 56, strength: 62, defence: 66, hitpoints: 80 }, bonuses: { strength: 15, ...armour(85, 0, 70) },
  model: { template: 'golem', colors: { skin: '#4a4440', top: '#3a3430', legs: '#3a3430', boots: '#2a2420' }, extras: { glowEyes: '#ffb030', core: '#ff8a20' }, equipment: { weapon: { shape: 'warhammer', color: '#3a3430' } } } });
m({ id: 'lanternwright_shade', name: 'Lanternwright shade', examine: 'One of the forty-one. It still carries a lantern, and the lantern still burns.', slayerCategory: 'ghosts',
  attackStyle: 'magic', attackRange: 7, aggressive: true, aggroRange: 5, tags: ['undead'], projectileColor: '#ffe9a0',
  stats: { attack: 30, strength: 30, defence: 50, magic: 82, hitpoints: 70 }, bonuses: { attackMagic: 15, ...armour(30, 45, 30) },
  attacks: [{ style: 'magic', maxHit: 9, weight: 3, range: 7, projectileColor: '#ffe9a0' }, { style: 'magic', maxHit: 5, weight: 1, range: 7, projectileColor: '#c8a0ff', effect: 'drain_prayer', drainAmount: 4 }],
  model: { template: 'ghost', colors: { skin: '#e8d8a8', top: '#6a5a3a', legs: '#6a5a3a', hair: '#e8e0c8' }, extras: { glowEyes: '#ffe9a0' },
    equipment: { weapon: { shape: 'staff', color: '#c8a040', glow: '#ffe9a0' }, head: { shape: 'hood', color: '#5a4a2a' } } } });
m({ id: 'ashwright_engine', name: 'The Ashwright Engine', examine: 'The Lanternwrights\' masterwork: a hearth that walks, feeds itself, and never, ever goes out.',
  boss: true, tags: ['boss'], combatLevel: 96, size: 3, attackStyle: 'crush', attackSpeed: 5, aggressive: true, aggroRange: 7, wanderRadius: 2, respawnTicks: 120, slayerCategory: 'golems',
  stats: { attack: 80, strength: 84, defence: 64, ranged: 70, magic: 70, hitpoints: 180 }, bonuses: armour(50, 30, 50), maxHit: 16,
  attacks: [{ style: 'melee', maxHit: 16, weight: 3 }, { style: 'ranged', maxHit: 14, weight: 2, range: 8, projectileColor: '#ff8a30' },
    { style: 'magic', maxHit: 12, weight: 1, range: 8, projectileColor: '#ffb030', effect: 'aoe' }],
  model: { template: 'magma_golem', scale: 1.45, extras: { crown: '#c8a040', glowEyes: '#fff0a0', core: '#ffe080' }, equipment: { weapon: { shape: 'maul', color: '#2e2420', color2: '#ffb030', glow: '#ff8a20' } } } });

// =================================================================================================
// Drop tables
// =================================================================================================
const I = (id, weight, qty) => ({ id, weight, ...(qty != null ? { qty } : {}) });
const tbl = (table, weight) => ({ table, weight });
const chance = (id, c, qty) => ({ id, chance: c, ...(qty != null ? { qty } : {}) });
function std(id, o = {}) {
  const always = [...(o.bones ? [{ id: o.bones }] : []), ...(o.always || [])];
  const main = [...(o.items || [])];
  if (o.coins) main.push(I('coins', o.coinWeight ?? 30, o.coins));
  if (o.herbs) main.push(tbl(`herbs_${o.herbs}`, o.herbWeight ?? 8));
  if (o.seeds) main.push(tbl('gathering_seeds_herb', o.seedWeight ?? 5));
  if (o.gems) main.push(tbl('gathering_gems', o.gems));
  if (o.rdt) main.push(tbl('rare_drop_table', o.rdt));
  if (o.sigils) main.push(tbl(`sigils_${o.sigils}`, o.sigilWeight ?? 8));
  for (const t of o.metal || []) main.push(tbl(`metal_${t}`, o.metalWeight ?? 4));
  return registerDropTable({ id, always, main, nothing: o.nothing ?? 20, rolls: o.rolls ?? 1, tertiary: o.tertiary || [] });
}
std('drowned_delver', { bones: 'bones', coins: [30, 180], herbs: 'mid', metal: ['steel', 'duskite'], items: [I('raw_bog_eel', 5), I('coal', 5, [1, 3]), I('fishing_bait', 4, [10, 25])], rdt: 1 });
std('gillback_raider', { bones: 'bones', coins: [40, 220], herbs: 'mid', metal: ['duskite', 'verdite'], metalWeight: 3, items: [I('raw_bluescale', 6, [1, 2]), I('harpoon', 1)], gems: 3, rdt: 1 });
std('silt_slug', { coins: [30, 150], items: [I('coal', 6, [2, 4]), I('gold_ore', 4), I('duskite_ore', 2), I('clay', 4, [3, 6])], gems: 5, herbs: 'mid', rdt: 1,
  tertiary: [chance('lanternwright_almanac', 1 / 300)] });
std('drowned_keener', { coins: [40, 200], herbs: 'mid', herbWeight: 14, sigils: 'mid', seeds: true, rdt: 2,
  tertiary: [chance('tidewoven_hood', 1 / 110), chance('tidewoven_robe_top', 1 / 110), chance('tidewoven_robe_bottom', 1 / 110)] });
std('sporecap_crawler', { always: [{ id: 'sporehide' }], coins: [30, 160], herbs: 'mid', seeds: true, gems: 2, rdt: 1, tertiary: [chance('sporeward_amulet', 1 / 350)] });
std('gloomcap_weaver', { always: [{ id: 'spider_silk', qty: [3, 8] }], coins: [40, 200], herbs: 'mid', sigils: 'mid', rdt: 1 });
std('mycelid_shambler', { items: [I('sporehide', 20, [1, 2]), I('gloom_spores', 5, [1, 2])], coins: [40, 220], herbs: 'mid', herbWeight: 12, seeds: true, seedWeight: 8, rdt: 1 });
std('vorlagh_sporebound', { bones: 'big_bones', always: [{ id: 'coins', qty: [400, 1200] }, { id: 'sporehide', qty: [3, 6] }], herbs: 'high', herbWeight: 14, seeds: true, seedWeight: 10, gems: 6,
  metal: ['verdite'], metalWeight: 4, rdt: 2, rolls: 2, nothing: 5, tertiary: [chance('sporeward_amulet', 1 / 40), chance('tidewoven_hood', 1 / 80)] });
std('slag_hound', { bones: 'bones', coins: [50, 240], items: [I('coal', 8, [2, 5]), I('fire_sigil', 6, [10, 25])], metal: ['duskite', 'verdite'], metalWeight: 3, rdt: 1 });
std('cinderhorn_lizard', { bones: 'big_bones', coins: [60, 260], herbs: 'mid', metal: ['verdite'], metalWeight: 4, items: [I('fire_sigil', 5, [12, 30])], rdt: 2,
  tertiary: [chance('emberheart_ring', 1 / 320)] });
std('forge_sentinel', { coins: [60, 280], items: [I('golem_dust', 8, [1, 2]), I('coal', 8, [5, 12]), I('steel_bar', 6, [1, 3]), I('duskite_bar', 3), I('verdite_bar', 1), I('elemental_core', 1)],
  metal: ['duskite', 'verdite'], metalWeight: 2, rdt: 1, tertiary: [chance('slagweave_gauntlets', 1 / 200)] });
std('lanternwright_shade', { always: [{ id: 'ashes' }], coins: [50, 240], sigils: 'mid', sigilWeight: 14, herbs: 'mid', rdt: 2, tertiary: [chance('lanternwright_almanac', 1 / 150)] });
std('ashwright_engine', { always: [{ id: 'coins', qty: [1500, 4000] }, { id: 'coal', qty: [10, 25] }, { id: 'duskite_bar', qty: [2, 4] }],
  items: [I('verdite_bar', 8, [1, 3]), I('azurium_ore', 4, [2, 4]), I('elemental_core', 3), I('fire_sigil', 6, [40, 90])], metal: ['verdite', 'azurium'], metalWeight: 5, gems: 8, rdt: 3, rolls: 3, nothing: 5,
  tertiary: [chance('forgefather_hammer', 1 / 48), chance('slagweave_gauntlets', 1 / 40), chance('emberheart_ring', 1 / 64)] });

// =================================================================================================
// Boss mechanics (local player; quest_util hook = run at systems init)
// =================================================================================================
hook((game) => {
  const near = (boss, r = 12) => { const p = game.player; return alive(game, boss) && !p.dead && game.distance(p, boss) <= r && (p.combatTarget === boss || boss.combatTarget === p); };
  const findBoss = (id) => { for (const n of game.npcs.values()) if (n.id === id && !n.dead) return n; return null; };

  // ---- Vorlagh the Sporebound: rot-bloom telegraphs; sporelings at 66% / 33% heal him while they live -------------
  const sporelings = new Set();
  game.onTick((tick) => {
    if (tick % 3) return;
    const v = findBoss('vorlagh_sporebound');
    if (!v || !near(v)) return;
    const alv = [...sporelings].filter((s) => alive(game, s));
    if (alv.length && tick % 6 === 0 && v.hp < v.maxHp && !v.netControlled) game.heal(v, alv.length);
    if (tick % 15 === 0) telegraph(game, v, { color: 0xb0d060, text: '<col=4a7a1a>Vorlagh\'s spores swell beneath your feet - move!</col>', min: 6, max: 10 });
  }, 46);
  game.events.on('damage', ({ target }) => {
    if (target?.id !== 'vorlagh_sporebound' || target.dead || target.hp <= 0) return;
    if (game.distance(game.player, target) > 12) return;
    const n = target.state.gdWaves || 0;
    if ((n === 0 && target.hp <= target.maxHp * 0.66) || (n === 1 && target.hp <= target.maxHp * 0.33)) {
      target.state.gdWaves = n + 1;
      game.say(target, 'Grrrow... GROW!', { chat: false, color: '#c0ff60' });
      for (let i = 0; i < 2; i++) {
        const [sx, sy] = freeTileNear(game, target.x + i, target.y + 2, 3, game.player);
        const s = game.spawnNpc('sporeling', sx, sy, { wander: 3, respawn: false });
        if (s) { sporelings.add(s); aggro(game, s); }
      }
      game.message('<col=8a0000>Sporelings burst out of Vorlagh\'s hide! While they live, he feeds on their spores.</col>');
    }
  });

  // ---- the Ashwright Engine: vent telegraphs; heat-shield below 50% (coolant valves drop it); hounds at 25% ---------
  const SHIELD_FACTOR = 0.5, VENT_TICKS = 30, VALVE_COOLDOWN = 60;
  const st = (e) => (e.state.gd ||= { shield: false, ventedUntil: 0, hounds: false });
  game.onTick((tick) => {
    const e = findBoss('ashwright_engine');
    if (!e) return;
    const s = st(e);
    if (s.shield && s.ventedUntil && tick === s.ventedUntil && near(e, 16)) {
      game.message('<col=c04000>The Engine\'s plates glow white again - its heat-shield is back up!</col>');
      game.spawnEffect('sparkle', e, { color: 0xffb030 });
    }
    if (!near(e)) return;
    if (tick % 12 === 0) telegraph(game, e, { color: 0xff8a30, text: '<col=c04000>The Engine\'s bellows-vents swing towards you - move!</col>', min: 12, max: 20, radius: 0 });
  }, 47);
  game.events.on('damage:before', (ev) => {
    const t = ev.target;
    if (t?.id !== 'ashwright_engine' || !(ev.amount > 0)) return;
    const s = st(t);
    if (s.shield && game.tickCount >= (s.ventedUntil || 0)) {
      ev.amount = Math.max(1, Math.floor(ev.amount * SHIELD_FACTOR));
      if (ev.source === game.player && game.tickCount - (s.lastMsg || 0) > 8) { s.lastMsg = game.tickCount; game.message('<col=c04000>Your blow glances off the white-hot plates. Turn a coolant valve to drop the heat-shield!</col>'); }
    }
  });
  game.events.on('damage', ({ target }) => {
    if (target?.id !== 'ashwright_engine' || target.dead || target.hp <= 0) return;
    const s = st(target);
    if (!s.shield && target.hp <= target.maxHp * 0.5) {
      s.shield = true;
      game.say(target, 'TEMPERATURE CRITICAL. SHIELDING.', { chat: false, color: '#ffb030' });
      game.message('<col=c04000>The Engine overheats and its plates glow white! A heat-shield now turns most of your damage aside.</col>');
    }
    if (!s.hounds && target.hp <= target.maxHp * 0.25 && game.distance(game.player, target) <= 12) {
      s.hounds = true;
      game.say(target, 'RELEASE THE HOUNDS OF THE HEARTH.', { chat: false, color: '#ffb030' });
      for (let i = 0; i < 2; i++) {
        const [hx, hy] = freeTileNear(game, target.x + 1 + i, target.y + 4, 3, game.player);
        const h = game.spawnNpc('slag_hound', hx, hy, { wander: 3, respawn: false });
        if (h) aggro(game, h);
      }
    }
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id === 'vorlagh_sporebound') { for (const s of sporelings) if (game.npcs.has(s.uid)) game.removeNpc(s); sporelings.clear(); delete npc.state.gdWaves; }
    if (npc.id === 'sporeling') sporelings.delete(npc);
    if (npc.id === 'ashwright_engine') npc.state.gd = null;
  });
  game.events.on('npc:respawn', ({ npc }) => { if (npc?.id === 'ashwright_engine') npc.state.gd = null; if (npc?.id === 'vorlagh_sporebound') delete npc.state.gdWaves; });

  game.interactions.onObject('Turn', ['gd_valve', 'gd_valve_spent'], ({ player, target }) => {
    if (target.id === 'gd_valve_spent') { game.message('The pipe only gurgles. It needs time to refill.'); return; }
    game.playAnim(player, 'crush', 900);
    const e = findBoss('ashwright_engine');
    game.replaceObject(target, 'gd_valve_spent', VALVE_COOLDOWN);
    game.spawnEffect('splash', target, { color: 0x80c0ff });
    if (!e || game.distance(player, e) > 14) { game.message('River water roars through the quench-lines and hisses out into the forge.'); return; }
    const s = st(e);
    if (!s.shield) { game.message('Steam bursts from the quench-lines. The Engine shudders, but it is not hot enough to need quenching yet.'); return; }
    s.ventedUntil = game.tickCount + VENT_TICKS;
    game.spawnEffect('splash', e, { color: 0xc0e8ff });
    game.message('<col=1a5a8a>A torrent of river water hits the Engine - its plates hiss and darken. The heat-shield is down!</col>');
  });
});
