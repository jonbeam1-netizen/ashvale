// Drop tables. OWNER: agent D (D2).
// { id, always: [{id, qty}], main: [{id, qty|[min,max], weight} | {table, weight}], rolls, nothing (weight of empty roll), tertiary: [{id, qty, chance}] }
//
// Shared tables (any agent may reference them with { table: 'id', weight }):
//   rare_drop_table   gems, high sigils, bars, keys, ancient coins, high-tier shields
//   herbs_low / herbs_mid / herbs_high,  sigils_low / sigils_mid / sigils_high,  metal_<tier> (bronze..emberite)
//   (agent B provides gathering_gems, gathering_herbs, gathering_seeds, gathering_seeds_herb, gathering_seeds_tree)

import { registerDropTable } from '../core/registry.js';
import { METAL_TIERS } from '../core/constants.js';

const T = (id, def) => registerDropTable({ id, ...def });
const I = (id, weight, qty) => ({ id, weight, ...(qty != null ? { qty } : {}) });
const tbl = (table, weight) => ({ table, weight });

registerDropTable({ id: 'none' });

// =================================================================================================
// Shared tables
// =================================================================================================
T('herbs_low', { main: [I('grimy_sagewort', 30), I('grimy_bitterleaf', 22), I('grimy_marshmint', 16), I('grimy_emberroot', 10), I('grimy_silverthistle', 5)] });
T('herbs_mid', { main: [I('grimy_marshmint', 16), I('grimy_emberroot', 16), I('grimy_silverthistle', 14), I('grimy_duskbloom', 10), I('grimy_starpetal', 7), I('grimy_frostcap', 4)] });
T('herbs_high', { main: [I('grimy_silverthistle', 10), I('grimy_duskbloom', 10), I('grimy_starpetal', 9), I('grimy_frostcap', 8), I('grimy_wyrmtongue', 5), I('grimy_ghostlily', 3)] });
T('sigils_low', { main: [I('wind_sigil', 10, [5, 15]), I('water_sigil', 8, [5, 12]), I('earth_sigil', 8, [5, 12]), I('fire_sigil', 8, [5, 12]), I('mind_sigil', 10, [5, 15])] });
T('sigils_mid', { main: [I('fire_sigil', 8, [10, 30]), I('wind_sigil', 8, [10, 30]), I('thorn_sigil', 6, [3, 10]), I('rift_sigil', 5, [3, 10]), I('nexus_sigil', 2, [2, 6])] });
T('sigils_high', { main: [I('rift_sigil', 8, [10, 25]), I('void_sigil', 6, [8, 20]), I('nexus_sigil', 4, [5, 15]), I('aether_sigil', 3, [5, 15]), I('crimson_sigil', 2, [5, 12])] });
T('rare_drop_table', {
  nothing: 15,
  main: [
    tbl('gathering_gems', 50), I('uncut_tidestone', 6), I('uncut_starheart', 2), I('coins', 18, [1000, 3000]),
    I('void_sigil', 5, [20, 45]), I('aether_sigil', 4, [10, 30]), I('nexus_sigil', 4, [10, 30]), I('crimson_sigil', 2, [8, 20]),
    I('azurium_bar', 3), I('emberite_ore', 2, [2, 5]), I('azurium_kiteshield', 2), I('azurium_sq_shield', 2), I('emberite_sq_shield', 1),
    I('ancient_coin', 6, [1, 3]), I('gloom_key', 3), I('ashen_key', 2), I('wyrm_scale', 2, [1, 2]),
  ],
});
// metal_<tier>: one random piece of that tier, cheap pieces more common
const PIECE_WEIGHT = { dagger: 8, axe: 6, mace: 6, med_helm: 8, sword: 6, scimitar: 5, longsword: 4, full_helm: 5, sq_shield: 5, warhammer: 4, battleaxe: 4, chainbody: 4,
  kiteshield: 3, twohand_sword: 2, platelegs: 3, plateskirt: 3, platebody: 2, pickaxe: 3, boots: 5, gloves: 5 };
for (const t of METAL_TIERS) T(`metal_${t.id}`, { main: Object.entries(PIECE_WEIGHT).map(([p, w]) => I(`${t.id}_${p}`, w)) });

// =================================================================================================
// Builder: standard monster table
// =================================================================================================
/**
 * std(id, { bones, always, coins: [lo,hi], items: [...], herbs: 'low'|'mid'|'high', seeds, gems, rdt, sigils, metal: [tier...],
 *           nothing, rolls, tertiary })
 */
function std(id, o = {}) {
  const always = [...(o.bones ? [{ id: o.bones }] : []), ...(o.always || [])];
  const main = [...(o.items || [])];
  if (o.coins) main.push(I('coins', o.coinWeight ?? 30, o.coins));
  if (o.herbs) main.push(tbl(`herbs_${o.herbs}`, o.herbWeight ?? 8));
  if (o.seeds) main.push(tbl(o.seeds === 'herb' ? 'gathering_seeds_herb' : o.seeds === 'tree' ? 'gathering_seeds_tree' : 'gathering_seeds', o.seedWeight ?? 5));
  if (o.gems) main.push(tbl('gathering_gems', o.gems));
  if (o.rdt) main.push(tbl('rare_drop_table', o.rdt));
  if (o.sigils) main.push(tbl(`sigils_${o.sigils}`, o.sigilWeight ?? 8));
  for (const t of o.metal || []) main.push(tbl(`metal_${t}`, o.metalWeight ?? 4));
  return T(id, { always, main, nothing: o.nothing ?? 20, rolls: o.rolls ?? 1, tertiary: o.tertiary || [] });
}
const chance = (id, c, qty) => ({ id, chance: c, ...(qty != null ? { qty } : {}) });

// =================================================================================================
// Critters & beasts
// =================================================================================================
T('chicken', { always: [{ id: 'bones' }, { id: 'raw_chicken' }], main: [I('feather', 1, [5, 15])], nothing: 1 });
T('cow', { always: [{ id: 'bones' }, { id: 'raw_beef' }, { id: 'cowhide' }] });
std('giant_rat', { items: [I('rat_tail', 12)], bones: 'bones', coins: [1, 5], nothing: 60 });
std('marsh_toad', { bones: 'bones', coins: [1, 8], herbs: 'low', seeds: 'allotment', nothing: 40 });
std('saltmarsh_crab', { always: [{ id: 'shell_fragment', qty: [1, 3] }], coins: [2, 20], items: [I('raw_rockclaw', 6), I('raw_bluescale', 4)], gems: 1, nothing: 30 });
std('wild_boar', { bones: 'bones', always: [{ id: 'raw_beef' }], coins: [3, 15], nothing: 50 });
std('timber_wolf', { bones: 'wolf_bones', coins: [5, 30], items: [I('wolf_fang', 10), I('bramble_fur', 4)], nothing: 30 });
std('dune_scorpion', { coins: [5, 30], items: [I('beetle_shell', 10), I('iron_ore', 4), I('copper_ore', 4)], gems: 2, nothing: 25 });
std('thornwood_bear', { bones: 'big_bones', always: [{ id: 'raw_beef', qty: [1, 2] }], coins: [10, 50], herbs: 'low', nothing: 25 });
std('giant_spider', { always: [{ id: 'spider_silk', qty: [1, 3] }], coins: [1, 10], nothing: 40 });
std('cave_bat', { items: [I('bat_wing', 12)], bones: 'bat_bones', coins: [1, 8], nothing: 50 });
std('dread_wolf', { items: [I('wolf_fang', 10)], bones: 'wolf_bones', coins: [10, 60], herbs: 'low', metal: ['iron', 'steel'], nothing: 25 });
std('ironshell_crab', { always: [{ id: 'shell_fragment', qty: [3, 8] }], coins: [20, 120], items: [I('raw_rockclaw', 6, [1, 2]), I('iron_ore', 5, [1, 4]), I('coal', 4, [1, 3])], gems: 3, rdt: 1 });
std('pitch_scorpion', { coins: [20, 120], items: [I('gloom_spores', 6), I('beetle_shell', 8), I('coal', 6, [1, 3]), I('duskite_ore', 3)], herbs: 'mid', gems: 3, rdt: 1 });
std('rimefang_wolf', { bones: 'wolf_bones', coins: [20, 150], items: [I('wolf_fang', 8), I('frost_lichen', 6), I('grimy_frostcap', 5)], metal: ['steel', 'duskite'], rdt: 1 });
std('gloom_widow', { items: [I('gloom_spores', 8)], always: [{ id: 'spider_silk', qty: [5, 15] }], coins: [50, 300], sigils: 'mid', herbs: 'mid', gems: 4, rdt: 2 });

// =================================================================================================
// Goblin-kin & humanoids
// =================================================================================================
std('goblin', { bones: 'goblin_bones', coins: [1, 12], items: [I('bronze_dagger', 6), I('bronze_med_helm', 3), I('bread', 6), I('bronze_sq_shield', 2)], nothing: 40, tertiary: [chance('goblin_war_banner', 1 / 128)] });
std('goblin_scout', { bones: 'goblin_bones', coins: [2, 18], items: [I('feather', 8, [5, 15]), I('arrow_shaft', 6, [5, 15])], seeds: 'allotment', nothing: 30, tertiary: [chance('goblin_war_banner', 1 / 100)] });
std('goblin_brute', { bones: 'goblin_bones', coins: [5, 30], metal: ['bronze', 'iron'], metalWeight: 6, nothing: 30, tertiary: [chance('goblin_war_banner', 1 / 64)] });
std('goblin_shaman', { bones: 'goblin_bones', coins: [5, 30], sigils: 'low', sigilWeight: 14, herbs: 'low', nothing: 25, tertiary: [chance('apprentice_wand', 1 / 64)] });
std('villager', { bones: 'bones', coins: [3, 8], nothing: 10 });
std('farmer', { bones: 'bones', coins: [3, 12], seeds: 'allotment', seedWeight: 10, nothing: 20 });
std('highway_bandit', { bones: 'bones', coins: [10, 60], items: [I('iron_dagger', 4), I('steel_dagger', 1), I('bread', 4)], herbs: 'low', nothing: 25 });
std('town_guard', { bones: 'bones', coins: [10, 40], items: [I('iron_sword', 3), I('guard_helm', 1), I('iron_sq_shield', 2)], herbs: 'low', nothing: 30 });
std('highmarch_knight', { bones: 'bones', coins: [40, 200], metal: ['steel', 'duskite'], herbs: 'mid', rdt: 1, tertiary: [chance('highmarch_cape', 1 / 128)] });
std('ashcult_acolyte', { bones: 'bones', coins: [5, 40], sigils: 'low', sigilWeight: 14, herbs: 'low', items: [I('cultist_hood', 2), I('cultist_robe_top', 1), I('cultist_robe_bottom', 1)], nothing: 25 });
std('ashcult_zealot', { bones: 'bones', coins: [30, 160], sigils: 'mid', sigilWeight: 14, herbs: 'mid', items: [I('cultist_robe_top', 2), I('cultist_robe_bottom', 2)], rdt: 1, tertiary: [chance('fire_battlestaff', 1 / 200)] });
std('hedge_wizard', { bones: 'bones', coins: [10, 60], sigils: 'low', sigilWeight: 16, herbs: 'low', items: [I('wizard_hat_black', 3), I('apprentice_staff', 2)], nothing: 25, tertiary: [chance('mages_staff', 1 / 128)] });
std('saltmarsh_corsair', { bones: 'bones', coins: [20, 90], items: [I('iron_scimitar', 3), I('raw_bluescale', 5), I('raw_sabrefish', 2)], herbs: 'low', gems: 2, nothing: 25 });
std('wasteland_reaver', { bones: 'bones', coins: [40, 220], metal: ['steel', 'duskite'], herbs: 'mid', rdt: 1, tertiary: [chance('reavers_cloak', 1 / 256), chance('ashen_key', 1 / 64)] });
std('stormcaller', { bones: 'bones', coins: [60, 300], sigils: 'high', sigilWeight: 12, herbs: 'mid', items: [I('thaumaturge_hat', 1), I('thaumaturge_gloves', 1)], rdt: 2, tertiary: [chance('wind_battlestaff', 1 / 128)] });
std('fen_stalker', { bones: 'bones', coins: [30, 160], herbs: 'mid', herbWeight: 12, seeds: 'herb', metal: ['steel', 'duskite'], rdt: 1 });
std('marsh_ogre', { bones: 'big_bones', coins: [30, 200], herbs: 'mid', seeds: 'herb', items: [I('coal', 4, [2, 5])], rdt: 1 });
std('crag_troll', { bones: 'big_bones', always: [{ id: 'troll_hide' }], coins: [80, 400], herbs: 'high', metal: ['verdite', 'azurium'], metalWeight: 2, rdt: 2 });

// =================================================================================================
// Undead
// =================================================================================================
std('zombie', { items: [I('grave_dust', 8)], bones: 'bones', coins: [5, 30], herbs: 'low', nothing: 30 });
std('wailing_shade', { coins: [5, 40], sigils: 'low', gems: 2, items: [I('grave_dust', 8), I('ashes', 6)], nothing: 30 });
std('skeleton', { bones: 'bones', coins: [5, 40], metal: ['iron'], items: [I('grave_dust', 6), I('iron_scimitar', 2), I('iron_full_helm', 2)], nothing: 30 });
std('drowned_one', { bones: 'bones', coins: [10, 70], items: [I('grave_dust', 8), I('raw_bog_eel', 5)], herbs: 'mid', nothing: 25 });
std('bone_archer', { bones: 'bones', coins: [10, 60], items: [I('grave_dust', 6), I('feather', 6, [10, 30]), I('arrow_shaft', 6, [10, 30]), I('bowstring', 3)], nothing: 25 });
std('skeleton_warden', { bones: 'big_bones', coins: [60, 300], metal: ['duskite', 'verdite'], items: [I('grave_dust', 6, [1, 2]), I('ancient_coin', 3)], rdt: 2 });
std('grave_wraith', { coins: [60, 300], sigils: 'high', items: [I('grave_dust', 8, [1, 3]), I('ashes', 6)], herbs: 'mid', gems: 3, rdt: 2 });
std('ash_revenant', { coins: [200, 900], sigils: 'high', items: [I('ancient_coin', 6, [1, 3])], metal: ['verdite', 'azurium'], metalWeight: 2, rdt: 3,
  tertiary: [chance('reaver_axe', 1 / 400), chance('ashen_key', 1 / 40), chance('reavers_cloak', 1 / 150)] });

// =================================================================================================
// Giants, golems, elementals
// =================================================================================================
std('highland_giant', { bones: 'giant_bones', coins: [10, 80], items: [I('giant_tooth', 3), I('iron_full_helm', 2), I('steel_med_helm', 1)], herbs: 'low', seeds: 'herb', nothing: 20 });
std('mosshide_giant', { bones: 'giant_bones', coins: [20, 150], items: [I('giant_tooth', 3)], herbs: 'mid', seeds: 'herb', seedWeight: 8, metal: ['steel'], rdt: 1 });
std('rime_giant', { bones: 'giant_bones', coins: [40, 200], items: [I('frost_lichen', 8, [1, 2]), I('grimy_frostcap', 6), I('giant_tooth', 3)], metal: ['steel', 'duskite'], rdt: 1 });
std('cinder_giant', { bones: 'giant_bones', coins: [80, 400], items: [I('grimy_emberroot', 6, [1, 3]), I('coal', 6, [3, 8])], metal: ['verdite', 'azurium'], metalWeight: 3, rdt: 2 });
std('quarry_golem', { coins: [20, 80], items: [I('golem_dust', 10), I('iron_ore', 6, [1, 3]), I('coal', 5, [1, 2]), I('iron_pickaxe', 2), I('clay', 4, [2, 5])], gems: 4, nothing: 20 });
std('loam_elemental', { coins: [10, 80], items: [I('golem_dust', 6), I('earth_sigil', 10, [10, 30]), I('clay', 6, [3, 8]), I('elemental_core', 1)], gems: 3, nothing: 20 });
std('tide_elemental', { coins: [20, 120], items: [I('water_sigil', 12, [15, 40]), I('raw_silverling', 5, [1, 3]), I('elemental_core', 1)], gems: 2, rdt: 1 });
std('gale_elemental', { coins: [30, 150], items: [I('frost_lichen', 6), I('wind_sigil', 12, [20, 50]), I('aether_sigil', 2, [2, 6]), I('elemental_core', 1)], gems: 2, rdt: 1 });
std('ember_elemental', { coins: [30, 180], items: [I('fire_sigil', 12, [20, 50]), I('emberite_ore', 1), I('elemental_core', 1)], gems: 2, rdt: 1 });
std('ironbound_golem', { coins: [60, 300], items: [I('golem_dust', 10, [1, 2]), I('iron_bar', 6, [2, 5]), I('steel_bar', 4, [1, 3]), I('coal', 6, [3, 8]), I('elemental_core', 1)], metal: ['steel', 'duskite'], rdt: 1 });
std('shardstone_golem', { coins: [100, 600], items: [I('golem_dust', 8, [2, 4]), I('azurium_ore', 4, [1, 3]), I('elemental_core', 2)], gems: 12, rdt: 3, rolls: 2 });

// =================================================================================================
// Demons
// =================================================================================================
std('imp', { items: [I('imp_horn', 10), I('wizard_hat_blue', 2), I('bread', 3), I('ashes', 8)], coins: [1, 20], nothing: 20 });
std('ashfiend', { bones: 'fiend_bones', coins: [50, 250], sigils: 'mid', herbs: 'mid', metal: ['duskite'], rdt: 1 });
std('gloom_fiend', { bones: 'fiend_bones', coins: [100, 400], sigils: 'high', herbs: 'mid', metal: ['duskite', 'verdite'], rdt: 2 });
std('pyre_fiend', { bones: 'fiend_bones', coins: [200, 800], sigils: 'high', herbs: 'high', metal: ['verdite', 'azurium'], metalWeight: 3, items: [I('emberite_ore', 2, [1, 2])], rdt: 3,
  tertiary: [chance('emberite_longsword', 1 / 256)] });

// =================================================================================================
// Dragons
// =================================================================================================
const wyrm = (id, bones, hide, o) => std(id, { bones, always: [{ id: hide, qty: o.hides ?? 1 }], rdt: o.rdt ?? 2, ...o,
  items: [I('wyrm_scale', 6, [1, 2]), ...(o.items || [])], tertiary: [chance('wyrmtooth_amulet', o.amulet ?? 1 / 256), ...(o.tertiary || [])] });
wyrm('drakeling', 'drake_bones', 'fen_drake_hide', { coins: [50, 250], metal: ['steel', 'duskite'], herbs: 'mid', amulet: 1 / 512 });
wyrm('fen_drake', 'drake_bones', 'fen_drake_hide', { coins: [80, 300], metal: ['duskite', 'verdite'], herbs: 'mid', amulet: 1 / 400 });
wyrm('moss_dragon', 'wyrm_bones', 'fen_drake_hide', { coins: [120, 500], metal: ['verdite', 'azurium'], metalWeight: 2, herbs: 'high' });
wyrm('ashen_wyrm', 'wyrm_bones', 'ashen_wyrm_hide', { coins: [150, 600], metal: ['verdite', 'azurium'], metalWeight: 2, herbs: 'high' });
wyrm('azure_dragon', 'wyrm_bones', 'ashen_wyrm_hide', { coins: [200, 800], metal: ['azurium'], metalWeight: 3, sigils: 'high', herbs: 'high' });
wyrm('frost_wyrm', 'frost_wyrm_bones', 'frost_wyrm_hide', { coins: [300, 1200], metal: ['azurium', 'emberite'], metalWeight: 2, sigils: 'high', herbs: 'high', rdt: 3 });
wyrm('crimson_dragon', 'frost_wyrm_bones', 'frost_wyrm_hide', { coins: [300, 1400], metal: ['azurium', 'emberite'], metalWeight: 2, sigils: 'high', herbs: 'high', rdt: 3 });
wyrm('obsidian_dragon', 'frost_wyrm_bones', 'frost_wyrm_hide', { hides: 2, coins: [800, 3000], metal: ['emberite'], metalWeight: 4, sigils: 'high', herbs: 'high', rdt: 5, rolls: 2,
  amulet: 1 / 64, tertiary: [chance('obsidian_cloak', 1 / 256)] });

// =================================================================================================
// Slayer monsters
// =================================================================================================
std('gloom_crawler', { items: [I('gloom_spores', 10), I('beetle_shell', 6)], bones: 'bones', coins: [5, 40], herbs: 'low', seeds: 'herb', nothing: 20 });
std('shalestone_slug', { coins: [10, 60], items: [I('iron_ore', 5, [1, 3]), I('coal', 4), I('clay', 4, [2, 5])], gems: 3, herbs: 'low', nothing: 20 });
std('stonegaze_fowl', { items: [I('beetle_shell', 4)], bones: 'bones', always: [{ id: 'feather', qty: [10, 30] }], coins: [10, 80], herbs: 'mid', seeds: 'herb', nothing: 20 });
std('keening_hag', { coins: [20, 120], herbs: 'mid', herbWeight: 14, sigils: 'mid', seeds: 'herb', rdt: 1 });
std('thirst_bat', { bones: 'bat_bones', coins: [30, 160], herbs: 'mid', items: [I('bat_wing', 10, [1, 2]), I('crimson_sigil', 2, [2, 6])], rdt: 1 });
std('glarehorn_lizard', { bones: 'big_bones', coins: [40, 220], herbs: 'mid', metal: ['duskite', 'verdite'], rdt: 1, tertiary: [chance('glarehorn_helm', 1 / 512)] });
std('ash_devil', { coins: [80, 400], items: [I('ashes', 10, [1, 3]), I('coal', 4, [2, 6])], herbs: 'high', metal: ['verdite', 'azurium'], metalWeight: 2, rdt: 2 });
std('rot_specter', { items: [I('gloom_spores', 8, [1, 3])], coins: [60, 300], herbs: 'high', herbWeight: 16, seeds: 'herb', sigils: 'high', rdt: 2, tertiary: [chance('rotlight_wand', 1 / 512)] });
std('stone_grotesque', { coins: [150, 600], items: [I('azurium_ore', 3, [1, 2]), I('emberite_ore', 1)], gems: 6, metal: ['azurium'], metalWeight: 3, rdt: 3, tertiary: [chance('grotesque_gauntlets', 1 / 512)] });
std('hollow_reaver', { items: [I('gloom_spores', 6, [2, 4])], bones: 'fiend_bones', coins: [150, 700], sigils: 'high', sigilWeight: 12, herbs: 'high', metal: ['azurium'], metalWeight: 3, rdt: 3, tertiary: [chance('hollowsteel_boots', 1 / 400)] });
std('void_stalker', { bones: 'fiend_bones', coins: [200, 800], sigils: 'high', herbs: 'high', metal: ['azurium', 'emberite'], metalWeight: 2, rdt: 3, tertiary: [chance('voidlash_rapier', 1 / 512)] });
std('umbral_beast', { bones: 'big_bones', coins: [300, 1200], herbs: 'high', metal: ['azurium', 'emberite'], metalWeight: 3, rdt: 4, rolls: 2, tertiary: [chance('umbral_longbow', 1 / 512)] });

// =================================================================================================
// Bosses (always: remains + supplies; tertiary: uniques)
// =================================================================================================
std('grubnak_warlord', { bones: 'big_bones', always: [{ id: 'coins', qty: [200, 600] }], coins: [100, 400], metal: ['iron', 'steel'], metalWeight: 8, herbs: 'low', rolls: 2, nothing: 5,
  tertiary: [chance('warlords_cleaver', 1 / 32), chance('warlords_signet', 1 / 48), chance('goblin_war_banner', 1 / 6)] });
std('corsair_captain', { bones: 'bones', always: [{ id: 'coins', qty: [500, 1500] }], items: [I('raw_sabrefish', 6, [3, 8]), I('ancient_coin', 4, [1, 4])], metal: ['duskite', 'verdite'], metalWeight: 6, gems: 6, rdt: 3, rolls: 2, nothing: 5,
  tertiary: [chance('saltreaver_cutlass', 1 / 64), chance('corsairs_eye', 1 / 64)] });
std('graven_king', { always: [{ id: 'coins', qty: [800, 2000] }, { id: 'elemental_core' }], items: [I('golem_dust', 8, [3, 6]), I('verdite_ore', 6, [3, 8]), I('azurium_ore', 3, [2, 5]), I('coal', 6, [10, 20])], gems: 10, rdt: 3, rolls: 2, nothing: 5,
  tertiary: [chance('graven_maul', 1 / 96), chance('graven_band', 1 / 96)] });
std('bog_matriarch', { bones: 'big_bones', always: [{ id: 'coins', qty: [1000, 3000] }], herbs: 'high', herbWeight: 20, seeds: 'herb', seedWeight: 12, sigils: 'mid', rdt: 3, rolls: 3, nothing: 5,
  tertiary: [chance('mirecaller_staff', 1 / 128), chance('tidecaller_ring', 1 / 100)] });
std('mother_skitterlace', { always: [{ id: 'spider_silk', qty: [20, 50] }, { id: 'coins', qty: [1500, 4000] }], herbs: 'high', sigils: 'high', gems: 10, metal: ['azurium'], metalWeight: 4, rdt: 4, rolls: 3, nothing: 5,
  tertiary: [chance('skitterfang', 1 / 128), chance('skittersilk_robe', 1 / 128)] });
std('calder_lich', { bones: 'big_bones', always: [{ id: 'coins', qty: [3000, 8000] }, { id: 'ancient_coin', qty: [2, 6] }], sigils: 'high', sigilWeight: 20, herbs: 'high', metal: ['azurium', 'emberite'], metalWeight: 5, rdt: 5, rolls: 3, nothing: 5,
  tertiary: [chance('lich_sceptre', 1 / 128), chance('lich_phylactery', 1 / 128), chance('ashen_key', 1 / 8)] });
std('cinder_colossus', { always: [{ id: 'coins', qty: [4000, 10000] }, { id: 'emberite_ore', qty: [3, 8] }], items: [I('emberite_bar', 6, [2, 4]), I('coal', 6, [20, 40])], metal: ['emberite'], metalWeight: 6, rdt: 5, rolls: 3, nothing: 5,
  tertiary: [chance('cinderbrand', 1 / 150), chance('ashen_crown', 1 / 150), chance('ember_mantle', 1 / 100)] });
std('varrath_gloom_tyrant', { bones: 'fiend_bones', always: [{ id: 'coins', qty: [6000, 15000] }, { id: 'void_sigil', qty: [30, 80] }], sigils: 'high', sigilWeight: 15, herbs: 'high', metal: ['emberite'], metalWeight: 8, gems: 10, rdt: 6, rolls: 4, nothing: 5,
  tertiary: [chance('umbral_edge', 1 / 200), chance('heart_of_varrath', 1 / 200), chance('bloodstone_ring', 1 / 128)] });
std('frostmaw', { bones: 'frost_wyrm_bones', always: [{ id: 'frost_wyrm_hide', qty: [3, 5] }, { id: 'coins', qty: [8000, 20000] }, { id: 'wyrm_scale', qty: [3, 8] }], sigils: 'high', herbs: 'high', metal: ['emberite'], metalWeight: 8, rdt: 6, rolls: 4, nothing: 5,
  tertiary: [chance('frostmaw_fang', 1 / 200), chance('frostmaw_aegis', 1 / 200), chance('wyrmtooth_amulet', 1 / 20)] });
