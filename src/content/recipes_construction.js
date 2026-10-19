// Construction content: planks, the Homestead plot (house + garden west of Thornwood), hotspots and
// furniture. OWNER: agent C. Runtime building/removal lives in src/systems/construction.js.

import { registerObject, registerData, registerSpawn } from '../core/registry.js';
import { ensureItem, item } from './recipes_util.js';

// ---- planks & tools ----------------------------------------------------------------------------------
export const PLANKS = [
  { id: 'plank', log: 'logs', name: 'Plank', fee: 100, xp: 29, color: '#a8804a' },
  { id: 'birch_plank', log: 'birch_logs', name: 'Birch plank', fee: 250, xp: 60, color: '#e0d4b8' },
  { id: 'redleaf_plank', log: 'redleaf_logs', name: 'Redleaf plank', fee: 500, xp: 90, color: '#9a4a2a' },
  { id: 'ironbark_plank', log: 'ironbark_logs', name: 'Ironbark plank', fee: 1500, xp: 140, color: '#4a3424' },
];
for (const p of PLANKS) item({ id: p.id, name: p.name, examine: 'A sawn plank, ready for building.', value: Math.round(p.fee * 0.9), icon: { shape: 'plank', color: p.color } });
item({ id: 'saw', name: 'Saw', examine: 'Good for cutting wood.', value: 13, icon: { shape: 'saw' } });
ensureItem({ id: 'hammer', name: 'Hammer', examine: 'Good for hitting things.', value: 1, icon: { shape: 'hammer', color: '#8a8a92' } });

// ---- homestead layout ---------------------------------------------------------------------------------
// The Homestead is a sealed house standing on stilts in the open Southern Sea, reachable only through the
// portal on crafters' row (east of Brackenford). A building rule turns its footprint into walkable floor;
// it has no door, so it behaves like a private plot. All coordinates are relative to (OX, OY).
const OX = 244, OY = 203;
export const HOMESTEAD = {
  house: { x: OX, y: OY, w: 16, h: 12 },  // interior x OX+1..OX+14, y OY+1..OY+10
  entry: { x: OX + 5, y: OY + 9 },        // where the portal drops you
  portal: { x: 146, y: 146 },             // portal tile (crafters' row east of Brackenford)
  portalExit: { x: 145, y: 147 },         // where you appear back
  area: { x0: OX, y0: OY, x1: OX + 15, y1: OY + 11 },
};
const H = HOMESTEAD;

/** Hotspots: id, name, tile, footprint, rotation (quarter turns) */
export const HOTSPOTS = [
  { id: 'hs_bookcase', type: 'bookcase', name: 'Bookcase space', x: OX + 3, y: OY + 1 },
  { id: 'hs_map', type: 'map', name: 'Wall map space', x: OX + 7, y: OY + 1 },
  { id: 'hs_altar', type: 'altar', name: 'Altar space', x: OX + 11, y: OY + 1, w: 2, h: 1 },
  { id: 'hs_larder', type: 'larder', name: 'Larder space', x: OX + 1, y: OY + 3, rot: 1 },
  { id: 'hs_stove', type: 'stove', name: 'Stove space', x: OX + 1, y: OY + 5, rot: 1 },
  { id: 'hs_seat_1', type: 'seat', name: 'Seat space', x: OX + 6, y: OY + 5, rot: 3 },
  { id: 'hs_table', type: 'table', name: 'Table space', x: OX + 7, y: OY + 5 },
  { id: 'hs_seat_2', type: 'seat', name: 'Seat space', x: OX + 8, y: OY + 5, rot: 1 },
  { id: 'hs_pool', type: 'pool', name: 'Pool space', x: OX + 11, y: OY + 7, w: 2, h: 2 },
];

/**
 * Furniture: hotspot type -> list. materials consumed; nails = number of nails needed (bend chance applies).
 * object = world object id spawned when built. fn = behaviour key used by systems/construction.js.
 */
export const FURNITURE = [
  { id: 'crude_chair', type: 'seat', name: 'Crude chair', level: 1, xp: 58, materials: { plank: 2 }, nails: 2, model: { template: 'chair', color: '#8a6a40' } },
  { id: 'wooden_chair', type: 'seat', name: 'Wooden chair', level: 8, xp: 87, materials: { plank: 3 }, nails: 3, model: { template: 'chair', color: '#7a5530' } },
  { id: 'birch_armchair', type: 'seat', name: 'Birch armchair', level: 19, xp: 120, materials: { birch_plank: 2 }, nails: 2, model: { template: 'chair', color: '#d8c8a0', arms: true } },
  { id: 'ironbark_armchair', type: 'seat', name: 'Ironbark armchair', level: 52, xp: 280, materials: { ironbark_plank: 2 }, model: { template: 'chair', color: '#4a3424', arms: true, cushion: '#8a2a2a' } },

  { id: 'wooden_table', type: 'table', name: 'Wooden table', level: 12, xp: 87, materials: { plank: 3 }, nails: 3, model: { template: 'table', color: '#7a5530' } },
  { id: 'birch_table', type: 'table', name: 'Birch table', level: 32, xp: 240, materials: { birch_plank: 4 }, nails: 4, model: { template: 'table', color: '#d8c8a0' } },
  { id: 'redleaf_table', type: 'table', name: 'Redleaf dining table', level: 52, xp: 360, materials: { redleaf_plank: 4 }, model: { template: 'table', color: '#8a3e22' } },

  { id: 'wooden_bookcase', type: 'bookcase', name: 'Wooden bookcase', level: 4, xp: 115, materials: { plank: 4 }, nails: 4, fn: 'books', options: ['Search'], model: { template: 'bookcase', color: '#7a5530' } },
  { id: 'birch_bookcase', type: 'bookcase', name: 'Birch bookcase', level: 29, xp: 180, materials: { birch_plank: 3 }, nails: 3, fn: 'books', options: ['Search'], model: { template: 'bookcase', color: '#d8c8a0' } },
  { id: 'ironbark_bookcase', type: 'bookcase', name: 'Ironbark bookcase', level: 60, xp: 420, materials: { ironbark_plank: 3 }, fn: 'books', options: ['Search'], model: { template: 'bookcase', color: '#4a3424' } },

  { id: 'wayfarers_map', type: 'map', name: "Wayfarer's map", level: 50, xp: 400, materials: { redleaf_plank: 3, nexus_sigil: 5 }, fn: 'map', options: ['Travel'], model: { template: 'wall_map', frame: '#9a4a2a' } },

  { id: 'clay_firepit', type: 'stove', name: 'Clay firepit', level: 5, xp: 40, materials: { soft_clay: 2, steel_bar: 1 }, fn: 'cook', station: 'homestead_firepit', options: ['Cook'], model: { template: 'firepit' } },
  { id: 'iron_range', type: 'stove', name: 'Iron range', level: 34, xp: 200, materials: { iron_bar: 4, birch_plank: 2 }, nails: 2, fn: 'cook', station: 'homestead_range', options: ['Cook'], model: { template: 'range' } },

  { id: 'wooden_larder', type: 'larder', name: 'Wooden larder', level: 9, xp: 228, materials: { plank: 8 }, nails: 8, fn: 'larder', options: ['Search'], larder: ['egg', 'pot_of_flour', 'bucket_of_milk'], model: { template: 'larder', color: '#7a5530' } },
  { id: 'birch_larder', type: 'larder', name: 'Birch larder', level: 33, xp: 480, materials: { birch_plank: 8 }, nails: 8, fn: 'larder', options: ['Search'], larder: ['egg', 'pot_of_flour', 'bucket_of_milk', 'jug_of_water', 'grapes', 'bowl_of_water', 'cake_tin', 'pie_dish'], model: { template: 'larder', color: '#d8c8a0' } },

  { id: 'birch_altar', type: 'altar', name: 'Birch altar', level: 45, xp: 240, materials: { birch_plank: 4 }, nails: 4, fn: 'altar', boneMult: 2.5, options: ['Pray-at'], model: { template: 'altar', color: '#d8c8a0', cloth: '#f0ece0', cloth2: '#3a7a3a' } },
  { id: 'ironbark_altar', type: 'altar', name: 'Gilded ironbark altar', level: 65, xp: 590, materials: { ironbark_plank: 4, gold_bar: 2 }, fn: 'altar', boneMult: 3.5, options: ['Pray-at'], model: { template: 'altar', color: '#4a3424', cloth: '#e8c040', cloth2: '#8a1a2a' } },

  { id: 'vigour_pool', type: 'pool', name: 'Pool of vigour', level: 60, xp: 500, materials: { birch_plank: 5, vigour_potion_4: 2 }, nails: 5, fn: 'pool', pool: 1, options: ['Drink'], model: { template: 'pool', water: '#d8b040' } },
  { id: 'restoration_pool', type: 'pool', name: 'Pool of restoration', level: 72, xp: 760, materials: { redleaf_plank: 5, restoration_potion_4: 2 }, fn: 'pool', pool: 2, options: ['Drink'], model: { template: 'pool', water: '#d070b0', glow: '#ffd0f0' } },
  { id: 'renewal_pool', type: 'pool', name: 'Pool of renewal', level: 86, xp: 1100, materials: { ironbark_plank: 5, renewal_potion_4: 2 }, fn: 'pool', pool: 3, options: ['Drink'], model: { template: 'pool', water: '#a060e0', glow: '#f0e0ff', rim: '#c8c0b0' } },
];

// ---- objects --------------------------------------------------------------------------------------------
const HS_COLORS = { pool: '#a0d0e8', altar: '#f0e8a0' };
for (const hs of HOTSPOTS) {
  registerObject({
    id: hs.id, name: hs.name, examine: 'An empty space in your homestead. You could build something here.',
    options: ['Build'], blocks: false, size: [hs.w || 1, hs.h || 1], model: { template: 'hotspot', color: HS_COLORS[hs.type] },
  });
}
for (const f of FURNITURE) {
  registerObject({
    id: `built_${f.id}`, name: f.name, examine: `Your ${f.name.toLowerCase()}. Built it yourself!`,
    options: [...(f.options || []), 'Remove'], blocks: true, size: f.type === 'pool' ? [2, 2] : f.type === 'altar' ? [2, 1] : [1, 1],
    model: f.model, homestead: f.id, stationAs: f.station,
  });
  registerData('construction', f.id, f);
}

registerObject({
  id: 'homestead_portal', name: 'Homestead portal', examine: 'A shimmering doorway to your homestead plot.', options: ['Enter'], size: [1, 1],
  teleport: { x: H.entry.x, y: H.entry.y, message: 'You step through the portal to your homestead.' },
  model: { template: 'portal', color: '#e8a040' }, mapIcon: { char: 'H', color: '#e8a040' },
});
registerObject({
  id: 'homestead_exit', name: 'Exit portal', examine: 'Leads back to Brackenford.', options: ['Exit'], size: [1, 1],
  teleport: { x: H.portalExit.x, y: H.portalExit.y, message: 'You step back out into Brackenford.' },
  model: { template: 'portal', color: '#e8a040' },
});
registerObject({ id: 'sawmill', name: 'Sawmill', examine: 'Logs go in, planks come out.', options: ['Use'], size: [2, 1], model: { template: 'sawmill' }, mapIcon: { char: 'S', color: '#c8a060' } });
registerObject({ id: 'log_pile', name: 'Log pile', examine: 'Neatly stacked logs.', model: { template: 'log_pile' } });
registerObject({ id: 'homestead_workbench', name: 'Workbench', examine: 'Tools for homestead building hang above it.', options: ['Search'], model: { template: 'workbench' } });

// ---- spawns ----------------------------------------------------------------------------------------------
registerSpawn({ type: 'building', name: 'Homestead', x: H.house.x, y: H.house.y, w: H.house.w, h: H.house.h, wall: 'wall_wood', floor: 'wood_floor', roof: '#5a3a2a', doors: [] });
for (const hs of HOTSPOTS) registerSpawn({ type: 'object', id: hs.id, x: hs.x, y: hs.y, rot: hs.rot || 0 });
registerSpawn({ type: 'object', id: 'homestead_exit', x: OX + 3, y: OY + 9 });
registerSpawn({ type: 'object', id: 'homestead_workbench', x: OX + 14, y: OY + 4 });
registerSpawn({ type: 'object', id: 'water_pump', x: OX + 14, y: OY + 9 });
registerSpawn({ type: 'object', id: 'barrel', x: OX + 14, y: OY + 1 });
registerSpawn({ type: 'object', id: 'homestead_portal', x: H.portal.x, y: H.portal.y });
