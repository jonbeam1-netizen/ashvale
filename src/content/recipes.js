// Production content: Smithing, Cooking, Firemaking, Fletching, Crafting, Herblore, Runebinding,
// Construction. OWNER: agent C. Split into recipes_*.js helpers; this module just loads them in order.
//
// registerRecipe({ id, skill, level, xp, inputs:[{id,qty}], outputs:[{id,qty}], tools:[itemId],
//                  station: objectId | [objectIds] | null, ticks, category,
//                  failChance?, failMessage?, burnStop?, failOutput?, failExtra?,   // failure handling
//                  batch?,      // make up to N sets per action (arrows: 15, darts: 10)
//                  thread?,     // crafting: uses thread (one reel lasts 5 stitches)
//                  ferment?,    // cooking: {ticks, xp, ok, bad, stop} delayed result (wine)
//                  verb?, message?, label? })
//
// Item ids other agents may reference (all registered here or in the helpers):
//   bars: <tier>_bar (7 tiers) + silver_bar, gold_bar · <tier>_arrowtips/_dart_tips/_nails, steel_studs
//   cooking: cooked_<fish>/burnt_<fish>, pies, stew, cake, jug_of_wine, ingredients (pot_of_flour, bucket_of_milk...)
//   fletching: arrow_shaft, headless_arrow, bowstring, [<wood>_]shortbow(_u)/longbow(_u), <tier>_arrows, <tier>_dart
//   crafting: needle, thread, *_mould, leather, hard_leather, cowhide, <beast>_hide/_leather (fen_drake, ashen_wyrm,
//             frost_wyrm), leather & hide armour, cut gems, gold/silver jewellery, soft_clay, pottery
//   herblore: vial, vial_of_water, pestle_and_mortar, <herb>_potion_unf, <potion>_1..4, secondaries
//             (beetle_shell wolf_fang rat_tail golem_dust grave_dust imp_horn gloom_spores bat_wing frost_lichen
//              wyrm_scale wyrm_scale_dust; also uses D's spider_silk giant_tooth shell_fragment)
//   construction: plank, birch_plank, redleaf_plank, ironbark_plank, saw

import './recipes_models.js';
import './recipes_smithing.js';
import './recipes_cooking.js';
import './recipes_wood.js';
import './recipes_crafting.js';
import './recipes_herblore.js';
import './recipes_runebinding.js';
import './recipes_construction.js';
import './recipes_world.js';
