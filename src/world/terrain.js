// Terrain type table. Index in this array = value stored in world.terrain.
// Agent D may add types by pushing to TERRAIN_TYPES *before* the world is built
// (e.g. from content/map.js via addTerrainType). Never reorder existing entries.

export const TERRAIN_TYPES = [];
const byId = new Map();

/**
 * @param {object} t {id, color, var (0-1 brightness noise), walkable, liquid ('water'|'lava'|null),
 *                    natural (blends with neighbours, gets sandy shores), minimap (css colour)}
 */
export function addTerrainType(t) {
  const def = { var: 0.08, walkable: true, liquid: null, natural: false, ...t };
  def.index = TERRAIN_TYPES.length;
  def.minimap = def.minimap || def.color;
  TERRAIN_TYPES.push(def);
  byId.set(def.id, def);
  return def;
}

export const terrainIndex = (id) => {
  const t = byId.get(id);
  if (!t) { console.warn(`[terrain] unknown terrain "${id}"`); return 0; }
  return t.index;
};
export const terrainDef = (id) => byId.get(id);

addTerrainType({ id: 'grass', color: '#5a8f34', var: 0.1, natural: true });
addTerrainType({ id: 'dark_grass', color: '#3f7329', var: 0.1, natural: true });
addTerrainType({ id: 'dirt', color: '#8b6b43', var: 0.06 });
addTerrainType({ id: 'sand', color: '#d4c288', var: 0.05, natural: true });
addTerrainType({ id: 'stone', color: '#7c7a73', var: 0.08, natural: true });
addTerrainType({ id: 'snow', color: '#e9eef3', var: 0.03, natural: true });
addTerrainType({ id: 'water', color: '#2d5f86', var: 0.02, walkable: false, liquid: 'water', minimap: '#2f6aa0' });
addTerrainType({ id: 'cobble', color: '#8d8a83', var: 0.07 });
addTerrainType({ id: 'wood_floor', color: '#8c6038', var: 0.05 });
addTerrainType({ id: 'wild_grass', color: '#6a6236', var: 0.12, natural: true });
addTerrainType({ id: 'ash', color: '#4d453d', var: 0.1, natural: true });
addTerrainType({ id: 'swamp', color: '#4a5a2c', var: 0.1, natural: true });
addTerrainType({ id: 'cave_floor', color: '#6e604c', var: 0.1 });
addTerrainType({ id: 'void', color: '#1e1a16', var: 0, walkable: false, minimap: '#000000' });
addTerrainType({ id: 'lava', color: '#e2561a', var: 0.05, walkable: false, liquid: 'lava', minimap: '#e05a20' });
addTerrainType({ id: 'farmland', color: '#5e4128', var: 0.06 });
addTerrainType({ id: 'ditch', color: '#3b3025', var: 0.05, minimap: '#2a2018' });
addTerrainType({ id: 'mountain', color: '#6e6b66', var: 0.1, walkable: false, natural: true, minimap: '#55524d' });
addTerrainType({ id: 'stone_floor', color: '#9d988e', var: 0.04 });
addTerrainType({ id: 'flowers', color: '#5f9a3a', var: 0.1, natural: true });
