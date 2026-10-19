// Regional Chronicles: per-region task lists (easy / medium / hard) that are checked automatically by
// systems/progress_chronicles.js, plus the chronicle medallions handed out as rewards.
// Also imports the mastery mantles + Hall of Mastery (content/mastery.js).
//
// Data: registerData('chronicle_region', id, { name, town, rects, perk, tiers: { easy, medium, hard } })
//   rects : [[x0,y0,x1,y1], ...] tiles that count as "in the region" (tasks with at: 'region')
//   town  : { x, y } or { spell } — where the medallion's Teleport goes
//   perk  : { skills: [...], text } — bonus XP while the medallion is worn (2 / 4 / 6 % by tier)
// Task: { id, text, type, ...params, at?: 'region' | areaId | [areaIds], count?: n }
//   type  chop {target: log id}   mine {target: ore id}   fish {target?: fish id}   catch {target: creature}
//         make {item? | recipe? | skill? | category?}   kill {target: npc id(s)}   lap {target: course}
//         obstacle {target: obstacle id}   quest {target}   pickpocket {target: npc id}   stall {target}
//         chest {target}   cast {target: spell id}   enter {target: area id(s)}   wild {level}
//         interact {option, kind?}   slayer {}   riddle {target: tier}   level {skill, level}
// Other modules may register more regions / tiers with the same shape.

import { registerItem, registerData } from '../core/registry.js';
import './mastery.js';

export const CHRONICLE_TIERS = ['easy', 'medium', 'hard'];
export const TIER_NAMES = { easy: 'Copper', medium: 'Silver', hard: 'Gilded' };
export const TIER_REWARDS = {
  easy: { coins: 5000, lamps: [['insight_lamp', 1]] },
  medium: { coins: 20000, lamps: [['insight_lamp', 2]] },
  hard: { coins: 60000, lamps: [['greater_insight_lamp', 1]] },
};
const TIER_COLORS = { easy: ['#b0793e', '#e8c890'], medium: ['#c8c8d0', '#ffffff'], hard: ['#e8c040', '#fff0a0'] };

const REGIONS = {
  brackenford: {
    name: 'Brackenford', order: 1, town: { spell: 'brackenford_teleport', x: 96, y: 141 }, rects: [[76, 95, 135, 177]],
    perk: { skills: ['cooking', 'firemaking'], text: 'bonus Cooking and Firemaking XP' },
    tiers: {
      easy: [
        { id: 'br_e_chop', text: 'Chop some logs from a tree around Brackenford.', type: 'chop', target: 'logs', at: 'region' },
        { id: 'br_e_copper', text: 'Mine copper ore at the outcrop north of town.', type: 'mine', target: 'copper_ore', at: 'region' },
        { id: 'br_e_minnow', text: 'Net a minnow from the Silverrun.', type: 'fish', target: 'raw_minnow', at: 'region' },
        { id: 'br_e_cook', text: 'Cook something in Brackenford.', type: 'make', skill: 'cooking', at: 'region' },
        { id: 'br_e_yard', text: 'Complete a lap of the Brackenford Training Yard.', type: 'lap', target: 'brackenford_yard' },
        { id: 'br_e_baker', text: "Steal from the baker's stall.", type: 'stall', target: 'bakers_stall' },
        { id: 'br_e_pray', text: 'Pray at the altar of the Brackenford chapel.', type: 'interact', option: 'Pray-at', at: 'region' },
        { id: 'br_e_goblin', text: 'Slay a goblin in the camp south-east of town.', type: 'kill', target: 'goblin' },
        { id: 'br_e_ledger', text: 'Complete the quest "The Lost Ledger".', type: 'quest', target: 'lost_ledger' },
      ],
      medium: [
        { id: 'br_m_weep', text: 'Chop a weepwood tree near Brackenford.', type: 'chop', target: 'weepwood_logs', at: 'region' },
        { id: 'br_m_wind', text: 'Bind wind sigils at the Wind Altar.', type: 'make', recipe: 'bind_wind_sigil' },
        { id: 'br_m_weaver', text: "Steal from the weaver's stall.", type: 'stall', target: 'weavers_stall' },
        { id: 'br_m_steel', text: 'Smelt a steel bar in the Brackenford furnace.', type: 'make', item: 'steel_bar', at: 'region' },
        { id: 'br_m_log', text: 'Cross the fallen log shortcut by the Silverrun.', type: 'obstacle', target: 'log_balance' },
        { id: 'br_m_yard10', text: 'Complete 10 laps of the Training Yard.', type: 'lap', target: 'brackenford_yard', count: 10 },
        { id: 'br_m_guard', text: 'Pickpocket a town guard in Brackenford.', type: 'pickpocket', target: 'town_guard', at: 'region' },
        { id: 'br_m_riddle', text: "Complete an easy Wayfinder's riddle trail.", type: 'riddle', target: 'easy' },
      ],
      hard: [
        { id: 'br_h_redleaf', text: 'Chop a redleaf tree near Brackenford.', type: 'chop', target: 'redleaf_logs', at: 'region' },
        { id: 'br_h_matriarch', text: 'Defeat the Bog Matriarch in Murkfen.', type: 'kill', target: 'bog_matriarch' },
        { id: 'br_h_mire', text: 'Complete the quest "Crown of the Mire".', type: 'quest', target: 'crown_of_the_mire' },
        { id: 'br_h_verdite', text: 'Smelt a verdite bar in the Brackenford furnace.', type: 'make', item: 'verdite_bar', at: 'region' },
        { id: 'br_h_sabre', text: 'Cook a sabrefish in Brackenford.', type: 'make', item: 'cooked_sabrefish', at: 'region' },
        { id: 'br_h_hag', text: 'Slay a keening hag in Murkfen.', type: 'kill', target: 'keening_hag', at: 'region' },
        { id: 'br_h_slayer', text: 'Complete 5 Slayer assignments.', type: 'slayer', count: 5 },
        { id: 'br_h_riddle', text: "Complete a hard Wayfinder's riddle trail.", type: 'riddle', target: 'hard' },
      ],
    },
  },
  highmarch: {
    name: 'Highmarch', order: 2, town: { spell: 'highmarch_teleport', x: 161, y: 78 }, rects: [[134, 49, 190, 135]],
    perk: { skills: ['agility', 'thieving'], text: 'bonus Agility and Thieving XP' },
    tiers: {
      easy: [
        { id: 'hm_e_keep', text: 'Visit the throne room of Highmarch Keep.', type: 'enter', target: 'highmarch_keep' },
        { id: 'hm_e_tankard', text: 'Step into the Gilded Tankard.', type: 'enter', target: 'gilded_tankard' },
        { id: 'hm_e_isle', text: 'Cross the bridge to the Mirrowmere island shrine.', type: 'enter', target: 'mirrowmere_isle' },
        { id: 'hm_e_iron', text: 'Mine iron ore near Highmarch.', type: 'mine', target: 'iron_ore', at: 'region' },
        { id: 'hm_e_fish', text: "Catch a fish in Highmarch's waters.", type: 'fish', at: 'region' },
        { id: 'hm_e_trader', text: 'Pickpocket a market trader.', type: 'pickpocket', target: 'market_trader' },
        { id: 'hm_e_pray', text: 'Pray at the altar of the Highmarch temple.', type: 'interact', option: 'Pray-at', at: 'region' },
        { id: 'hm_e_weep', text: 'Chop a weepwood tree near Highmarch.', type: 'chop', target: 'weepwood_logs', at: 'region' },
      ],
      medium: [
        { id: 'hm_m_roof', text: 'Complete a Highmarch Rooftops lap.', type: 'lap', target: 'highmarch_rooftops' },
        { id: 'hm_m_tele', text: 'Cast the Highmarch Teleport spell.', type: 'cast', target: 'highmarch_teleport' },
        { id: 'hm_m_thief', text: 'Complete the quest "A Thief in Highmarch".', type: 'quest', target: 'thief_in_highmarch' },
        { id: 'hm_m_compass', text: 'Complete the quest "The Wayward Compass".', type: 'quest', target: 'wayward_compass' },
        { id: 'hm_m_furs', text: "Steal from the furrier's stall.", type: 'stall', target: 'furriers_stall' },
        { id: 'hm_m_wall', text: 'Climb the crumbling wall shortcut into Highmarch.', type: 'obstacle', target: 'highmarch_handholds' },
        { id: 'hm_m_gold', text: 'Mine gold ore near Highmarch.', type: 'mine', target: 'gold_ore', at: 'region' },
        { id: 'hm_m_nexus', text: 'Bind nexus sigils.', type: 'make', recipe: 'bind_nexus_sigil' },
      ],
      hard: [
        { id: 'hm_h_roof25', text: 'Complete 25 Highmarch Rooftops laps.', type: 'lap', target: 'highmarch_rooftops', count: 25 },
        { id: 'hm_h_noble', text: 'Pickpocket a Highmarch noble.', type: 'pickpocket', target: 'highmarch_noble' },
        { id: 'hm_h_jewel', text: "Steal from the jeweller's stall.", type: 'stall', target: 'jewellers_stall' },
        { id: 'hm_h_pact', text: 'Complete the quest "The Ashen Pact".', type: 'quest', target: 'ashen_pact' },
        { id: 'hm_h_lockbox', text: "Crack the warden's lockbox.", type: 'chest', target: 'wardens_lockbox' },
        { id: 'hm_h_azurium', text: 'Mine azurium ore near Highmarch.', type: 'mine', target: 'azurium_ore', at: 'region' },
        { id: 'hm_h_tide', text: 'Defeat a tide elemental.', type: 'kill', target: 'tide_elemental' },
        { id: 'hm_h_knight', text: 'Pickpocket a Highmarch knight.', type: 'pickpocket', target: 'highmarch_knight' },
      ],
    },
  },
  thornwood: {
    name: 'Thornwood & Haverly', order: 3, town: { spell: 'thornwood_teleport', x: 60, y: 140 }, rects: [[28, 104, 76, 175], [128, 136, 182, 177]],
    perk: { skills: ['woodcutting', 'farming', 'hunter'], text: 'bonus Woodcutting, Farming and Hunter XP' },
    tiers: {
      easy: [
        { id: 'th_e_birch', text: 'Chop a birch tree in Thornwood.', type: 'chop', target: 'birch_logs', at: 'region' },
        { id: 'th_e_finch', text: 'Snare a crested finch.', type: 'catch', target: 'crested_finch' },
        { id: 'th_e_boar', text: 'Slay a wild boar.', type: 'kill', target: 'wild_boar' },
        { id: 'th_e_scout', text: 'Defeat a goblin scout in the woods.', type: 'kill', target: 'goblin_scout' },
        { id: 'th_e_flour', text: 'Grind a pot of flour at the Haverly windmill.', type: 'make', item: 'pot_of_flour' },
        { id: 'th_e_amber', text: 'Net an amber flutterwing.', type: 'catch', target: 'amber_flutterwing' },
        { id: 'th_e_smoke', text: 'Complete the quest "Smoke over Thornwood".', type: 'quest', target: 'smoke_over_thornwood' },
        { id: 'th_e_clearing', text: 'Find the hidden clearing in Thornwood.', type: 'enter', target: 'fairy_clearing' },
      ],
      medium: [
        { id: 'th_m_weep', text: 'Chop a weepwood tree in Thornwood.', type: 'chop', target: 'weepwood_logs', at: 'region' },
        { id: 'th_m_canopy', text: 'Complete a lap of the Thornwood Canopy.', type: 'lap', target: 'thornwood_canopy' },
        { id: 'th_m_miller', text: "Complete the quest \"The Miller's Riddle\".", type: 'quest', target: 'millers_riddle' },
        { id: 'th_m_grubnak', text: 'Defeat Grubnak in his war camp.', type: 'kill', target: 'grubnak_warlord' },
        { id: 'th_m_ferret', text: 'Catch a bramble ferret in a box trap.', type: 'catch', target: 'bramble_ferret' },
        { id: 'th_m_strongbox', text: "Crack a merchant's strongbox.", type: 'chest', target: 'merchant_strongbox' },
        { id: 'th_m_farmer', text: 'Pickpocket a farmer.', type: 'pickpocket', target: 'farmer' },
        { id: 'th_m_thorn', text: 'Bind thorn sigils.', type: 'make', recipe: 'bind_thorn_sigil' },
      ],
      hard: [
        { id: 'th_h_ironbark', text: 'Chop an ironbark tree in Thornwood.', type: 'chop', target: 'ironbark_logs', at: 'region' },
        { id: 'th_h_starwood', text: 'Chop a starwood tree in Thornwood.', type: 'chop', target: 'starwood_logs', at: 'region' },
        { id: 'th_h_giant', text: 'Slay a mosshide giant.', type: 'kill', target: 'mosshide_giant' },
        { id: 'th_h_coffer', text: 'Crack an ironclad coffer.', type: 'chest', target: 'ironclad_coffer' },
        { id: 'th_h_canopy10', text: 'Complete 10 laps of the Thornwood Canopy.', type: 'lap', target: 'thornwood_canopy', count: 10 },
        { id: 'th_h_bow', text: 'String a redleaf longbow.', type: 'make', item: 'redleaf_longbow' },
        { id: 'th_h_hunter', text: 'Reach level 60 Hunter.', type: 'level', skill: 'hunter', level: 60 },
      ],
    },
  },
  greyspine: {
    name: 'Durnhold & Greyspine', order: 4, town: { x: 212, y: 71 }, rects: [[183, 46, 240, 134]],
    perk: { skills: ['mining', 'smithing'], text: 'bonus Mining and Smithing XP' },
    tiers: {
      easy: [
        { id: 'gs_e_hall', text: 'Enter the Great Hall of Durnhold.', type: 'enter', target: 'durn_hall' },
        { id: 'gs_e_stonemug', text: 'Raise a mug in the Stonemug tavern.', type: 'enter', target: 'stonemug' },
        { id: 'gs_e_iron', text: 'Mine iron ore in the Greyspine Mountains.', type: 'mine', target: 'iron_ore', at: 'region' },
        { id: 'gs_e_lark', text: 'Snare a snowcap lark.', type: 'catch', target: 'snowcap_lark' },
        { id: 'gs_e_smelt', text: "Smelt a bar in Durnhold's Forge Hall.", type: 'make', skill: 'smithing', category: 'smelt', at: 'region' },
        { id: 'gs_e_spire', text: "Visit the Starcaller's Spire on Bramblemoor.", type: 'enter', target: 'starcaller' },
        { id: 'gs_e_frostgate', text: 'Walk the Frostgate Path.', type: 'enter', target: 'frostgate' },
      ],
      medium: [
        { id: 'gs_m_forge', text: 'Complete the quest "The Forge-Heart of Durnhold".', type: 'quest', target: 'forge_heart' },
        { id: 'gs_m_stars', text: 'Complete the quest "Stars over Bramblemoor".', type: 'quest', target: 'stars_over_bramblemoor' },
        { id: 'gs_m_coal', text: 'Mine coal in the Greyspine Mountains.', type: 'mine', target: 'coal', at: 'region' },
        { id: 'gs_m_seams', text: 'Descend to the Deep Seams.', type: 'enter', target: 'deep_seams' },
        { id: 'gs_m_troll', text: 'Defeat a crag troll.', type: 'kill', target: 'crag_troll' },
        { id: 'gs_m_ferret', text: 'Catch a bramble ferret on Bramblemoor.', type: 'catch', target: 'bramble_ferret', at: 'region' },
        { id: 'gs_m_plate', text: 'Smith a steel platebody in Durnhold.', type: 'make', item: 'steel_platebody', at: 'region' },
      ],
      hard: [
        { id: 'gs_h_ember', text: 'Complete the quest "The Ember Under the Mountain".', type: 'quest', target: 'ember_under_mountain' },
        { id: 'gs_h_duskite', text: 'Mine duskite ore in the Greyspine Mountains.', type: 'mine', target: 'duskite_ore', at: 'region' },
        { id: 'gs_h_verdite', text: 'Mine verdite ore in the Greyspine Mountains.', type: 'mine', target: 'verdite_ore', at: 'region' },
        { id: 'gs_h_vplate', text: 'Smith a verdite platebody in Durnhold.', type: 'make', item: 'verdite_platebody', at: 'region' },
        { id: 'gs_h_hollow', text: 'Explore the Hollowpick Mine.', type: 'enter', target: 'hollowpick' },
        { id: 'gs_h_bandit', text: 'Pickpocket a highway bandit.', type: 'pickpocket', target: 'highway_bandit' },
        { id: 'gs_h_bombtail', text: 'Catch a grey bombtail.', type: 'catch', target: 'grey_bombtail_critter' },
      ],
    },
  },
  faelwood: {
    name: 'Faelwood & Ilvaren', order: 5, town: { spell: 'ilvaren_teleport', x: 266, y: 84 }, rects: [[241, 49, 287, 128]],
    perk: { skills: ['fletching', 'herblore', 'crafting'], text: 'bonus Fletching, Herblore and Crafting XP' },
    tiers: {
      easy: [
        { id: 'fw_e_ilvaren', text: 'Walk the streets of Ilvaren.', type: 'enter', target: 'ilvaren' },
        { id: 'fw_e_birch', text: 'Chop a birch tree in the Faelwood.', type: 'chop', target: 'birch_logs', at: 'region' },
        { id: 'fw_e_finch', text: 'Snare a crested finch in the Faelwood.', type: 'catch', target: 'crested_finch', at: 'region' },
        { id: 'fw_e_silverfall', text: 'Admire Silverfall.', type: 'enter', target: 'silverfall' },
        { id: 'fw_e_lantern', text: 'Visit the Lantern Grove.', type: 'enter', target: 'lantern_grove' },
        { id: 'fw_e_wolf', text: 'Slay a timber wolf in the Faelwood.', type: 'kill', target: 'timber_wolf', at: 'region' },
        { id: 'fw_e_bow', text: 'Fletch a shortbow.', type: 'make', item: 'shortbow' },
      ],
      medium: [
        { id: 'fw_m_moonwell', text: "Complete the quest \"The Moonwell's Lament\".", type: 'quest', target: 'moonwell_lament' },
        { id: 'fw_m_redleaf', text: 'Chop a redleaf tree in the Faelwood.', type: 'chop', target: 'redleaf_logs', at: 'region' },
        { id: 'fw_m_azure', text: 'Net an azure flutterwing.', type: 'catch', target: 'azure_flutterwing' },
        { id: 'fw_m_tele', text: 'Cast the Ilvaren Teleport spell.', type: 'cast', target: 'ilvaren_teleport' },
        { id: 'fw_m_bear', text: 'Slay a bear in the Faelwood.', type: 'kill', target: 'thornwood_bear', at: 'region' },
        { id: 'fw_m_weepbow', text: 'String a weepwood longbow.', type: 'make', item: 'weepwood_longbow' },
        { id: 'fw_m_potion', text: 'Mix a potion.', type: 'make', skill: 'herblore', category: 'potion' },
        { id: 'fw_m_fish', text: "Catch a fish in the Faelwood's streams.", type: 'fish', at: 'region' },
      ],
      hard: [
        { id: 'fw_h_ironbark', text: 'Chop an ironbark tree in the Faelwood.', type: 'chop', target: 'ironbark_logs', at: 'region' },
        { id: 'fw_h_starwood', text: 'Chop a starwood tree in the Faelwood.', type: 'chop', target: 'starwood_logs', at: 'region' },
        { id: 'fw_h_ironbow', text: 'String an ironbark longbow.', type: 'make', item: 'ironbark_longbow' },
        { id: 'fw_h_might', text: 'Mix a greater might potion.', type: 'make', item: 'greater_might_3' },
        { id: 'fw_h_renewal', text: 'Mix a renewal potion.', type: 'make', item: 'renewal_potion_3' },
        { id: 'fw_h_fletch', text: 'Reach level 60 Fletching.', type: 'level', skill: 'fletching', level: 60 },
        { id: 'fw_h_craft', text: 'Reach level 60 Crafting.', type: 'level', skill: 'crafting', level: 60 },
      ],
    },
  },
  wilderness: {
    name: 'Wilderness', order: 6, town: { x: 101, y: 54 }, rects: [[0, 0, 287, 47]],
    perk: { skills: ['prayer', 'slayer'], text: 'bonus Prayer and Slayer XP' },
    tiers: {
      easy: [
        { id: 'wd_e_cross', text: 'Cross the ditch into the Wilderness.', type: 'wild', level: 1 },
        { id: 'wd_e_lvl10', text: 'Venture to Wilderness level 10.', type: 'wild', level: 10 },
        { id: 'wd_e_bandit', text: 'Slay a highway bandit in the Wilderness.', type: 'kill', target: 'highway_bandit', at: 'region' },
        { id: 'wd_e_skeleton', text: 'Destroy a skeleton in the Wilderness.', type: 'kill', target: 'skeleton', at: 'region' },
        { id: 'wd_e_coal', text: 'Mine coal in the Wilderness.', type: 'mine', target: 'coal', at: 'region' },
        { id: 'wd_e_outlaw', text: 'Visit the Outlaw Camp.', type: 'enter', target: 'outlaw_camp' },
        { id: 'wd_e_wolf', text: 'Slay a dread wolf.', type: 'kill', target: 'dread_wolf' },
      ],
      medium: [
        { id: 'wd_m_calder', text: 'Enter the Calder Ruins.', type: 'enter', target: 'calder_ruins' },
        { id: 'wd_m_lvl30', text: 'Venture to Wilderness level 30.', type: 'wild', level: 30 },
        { id: 'wd_m_reaver', text: 'Slay a wasteland reaver.', type: 'kill', target: 'wasteland_reaver' },
        { id: 'wd_m_moss', text: 'Slay a moss dragon.', type: 'kill', target: 'moss_dragon' },
        { id: 'wd_m_ember', text: 'Destroy an ember elemental.', type: 'kill', target: 'ember_elemental' },
        { id: 'wd_m_ironbark', text: 'Chop an ironbark tree in the Wilderness.', type: 'chop', target: 'ironbark_logs', at: 'region' },
        { id: 'wd_m_rift', text: 'Bind rift sigils.', type: 'make', recipe: 'bind_rift_sigil' },
      ],
      hard: [
        { id: 'wd_h_crimson', text: 'Kill a crimson dragon.', type: 'kill', target: 'crimson_dragon' },
        { id: 'wd_h_lich', text: 'Defeat the Calder Lich.', type: 'kill', target: 'calder_lich' },
        { id: 'wd_h_colossus', text: 'Topple the Cinder Colossus.', type: 'kill', target: 'cinder_colossus' },
        { id: 'wd_h_gauntlet', text: 'Complete a lap of the Ashen Gauntlet.', type: 'lap', target: 'ashen_gauntlet' },
        { id: 'wd_h_emberite', text: 'Mine emberite ore in the Wilderness.', type: 'mine', target: 'emberite_ore', at: 'region' },
        { id: 'wd_h_frostfin', text: 'Catch a frostfin.', type: 'fish', target: 'raw_frostfin' },
        { id: 'wd_h_peaks', text: 'Reach the Frostfang Peaks.', type: 'enter', target: 'frostfang' },
      ],
    },
  },
};

for (const [id, def] of Object.entries(REGIONS)) {
  registerData('chronicle_region', id, { id, ...def });
  CHRONICLE_TIERS.forEach((tier, i) => {
    const [color, color2] = TIER_COLORS[tier];
    const pct = (i + 1) * 2;
    registerItem({
      id: `chronicle_${id}_${i + 1}`, name: `${TIER_NAMES[tier]} ${def.name} medallion`,
      examine: `Earned by completing the ${tier} ${def.name} Chronicle. While worn: +${pct}% ${def.perk.text}; it can teleport you to the region${i === 2 ? ' as often as you like' : ` ${i === 0 ? 'once' : 'three times'} a day`}.`,
      value: 0, tradeable: false, slot: 'neck', options: ['Wear', 'Teleport'], equipOptions: ['Teleport'],
      bonuses: { prayer: i + 1, defenceStab: i, defenceSlash: i, defenceCrush: i, defenceMagic: i, defenceRanged: i },
      chronicle: { region: id, tier: i + 1 },
      icon: { shape: 'amulet', color, color2 }, model: { color },
    });
  });
}
