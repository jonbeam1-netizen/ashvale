// Gathering content: Woodcutting, Mining, Fishing, Hunter, Farming. OWNER: agent B.
// Split into helper modules (all imported here, in this order):
//   gathering_visuals.js  scenery templates (farm patches, traps, essence rock) + icon shapes
//   gathering_items.js    logs, ores, gems, fish, hunter products, herbs, seeds, produce, B's tools, tool stats, drop tables
//   gathering_nodes.js    trees, rocks, fishing spots + registerData('woodcutting'|'mining'|'fishing')
//   gathering_hunter.js   hunter creatures (NPCs), trap objects + registerData('hunter'|'hunter_trap')
//   gathering_farming.js  farming patch objects (+ per-state visual ids), compost bin, seed crate
//   gathering_spawns.js   world placement of all of the above
//
// Data namespaces other agents may read:
//   'tools' (axes/pickaxes), 'woodcutting', 'mining', 'fishing', 'fish' (suggestedHeal), 'hunter',
//   'farming' (seedId -> plant), 'herb' (grimy id -> { clean, level, xp } for Herblore)
// Drop tables: gathering_gems, gathering_seeds(_allotment|_herb|_tree), gathering_herbs, gathering_nest

import './gathering_visuals.js';
import './gathering_items.js';
import './gathering_nodes.js';
import './gathering_hunter.js';
import './gathering_farming.js';
import './gathering_spawns.js';
