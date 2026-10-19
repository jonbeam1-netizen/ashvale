// General scenery objects. OWNER: agent D.
// Skill resources (trees, rocks, fishing spots), agility obstacles, thieving stalls etc. are
// registered by their skill's content file.
// model.template: see render/models.js (wall, fence, door, furnace, anvil, range, bank_booth, altar, ...)

import { registerObject } from '../core/registry.js';
import './scenery_models.js';   // decorative templates (dec_*)
import './scenery_defs.js';     // decorative object definitions
import './world_flavor.js';     // tiny flavour handlers (Search bookshelves, Ring bells...)

// ---- structure ----------------------------------------------------------------------------------
registerObject({ id: 'wall_stone', name: 'Wall', examine: 'A sturdy stone wall.', model: { template: 'wall', variant: 'stone' } });
registerObject({ id: 'wall_plaster', name: 'Wall', examine: 'A whitewashed wall.', model: { template: 'wall', variant: 'plaster' } });
registerObject({ id: 'wall_wood', name: 'Wall', examine: 'A timber wall.', model: { template: 'wall', variant: 'wood' } });
registerObject({ id: 'wall_dark', name: 'Wall', examine: 'Old, soot-stained stone.', model: { template: 'wall', variant: 'dark' } });
registerObject({ id: 'fence_wood', name: 'Fence', examine: 'A wooden fence.', model: { template: 'fence' } });
registerObject({ id: 'stone_wall_low', name: 'Low wall', examine: 'A low dry-stone wall.', model: { template: 'stone_wall_low' } });
registerObject({ id: 'door_wood', name: 'Door', examine: 'A wooden door.', options: ['Open'], openId: 'door_wood_open', model: { template: 'door' } });
registerObject({ id: 'door_wood_open', name: 'Door', examine: 'An open wooden door.', options: ['Close'], closedId: 'door_wood', blocks: false, model: { template: 'door', open: true } });

// ---- wilderness border ----------------------------------------------------------------------------
registerObject({
  id: 'wilderness_ditch', name: 'Wilderness Ditch', examine: 'Beyond lies the lawless Wilderness.',
  options: ['Cross'], model: { template: 'ditch' }, size: [1, 1],
});

// ---- town furniture --------------------------------------------------------------------------------
registerObject({ id: 'bank_booth', name: 'Bank booth', examine: 'A place to keep your valuables safe.', options: ['Bank'], model: { template: 'bank_booth' }, mapIcon: { char: '$', color: '#e8c040' } });
registerObject({ id: 'furnace', name: 'Furnace', examine: 'A red-hot furnace for smelting ore.', options: ['Smelt'], size: [2, 2], model: { template: 'furnace' }, mapIcon: { char: 'F', color: '#ff8030' } });
registerObject({ id: 'anvil', name: 'Anvil', examine: 'Used for shaping metal.', options: ['Smith'], model: { template: 'anvil' }, mapIcon: { char: 'A', color: '#b0b0b8' } });
registerObject({ id: 'cooking_range', name: 'Cooking range', examine: 'A well-used cooking range.', options: ['Cook'], model: { template: 'range' }, mapIcon: { char: 'C', color: '#f0a040' } });
registerObject({ id: 'altar', name: 'Altar', examine: 'A place of quiet devotion.', options: ['Pray-at'], size: [2, 1], model: { template: 'altar' }, mapIcon: { char: '+', color: '#f0f0f0' } });
registerObject({ id: 'well', name: 'Well', examine: 'A deep stone well.', model: { template: 'well' } });
registerObject({ id: 'lamp_post', name: 'Lamp post', examine: 'Keeps the streets lit.', model: { template: 'lamp' } });
registerObject({ id: 'signpost', name: 'Signpost', examine: 'Brackenford - Thornwood west, Highmarch north-east, Wilderness north.', options: ['Read'], model: { template: 'sign' } });
registerObject({ id: 'crate', name: 'Crate', examine: 'A wooden crate.', model: { template: 'crate' } });
registerObject({ id: 'barrel', name: 'Barrel', examine: 'A barrel.', model: { template: 'barrel' } });
registerObject({ id: 'table', name: 'Table', examine: 'A sturdy table.', model: { template: 'table' } });
registerObject({ id: 'market_stall', name: 'Market stall', examine: 'Colourful wares are on display.', size: [2, 1], model: { template: 'stall', cloth: '#2a5aa0', goods: '#e0b040' } });
registerObject({ id: 'hay_bale', name: 'Hay bale', examine: 'Rolled-up hay.', model: { template: 'hay' } });

// ---- nature (decorative) -----------------------------------------------------------------------------
registerObject({ id: 'bush', name: 'Bush', examine: 'A leafy bush.', model: { template: 'bush' } });
registerObject({ id: 'berry_bush', name: 'Berry bush', examine: 'Bright berries. Probably not edible.', model: { template: 'bush', berries: '#c02040' } });
registerObject({ id: 'flowers', name: 'Flowers', examine: 'Pretty wildflowers.', blocks: false, model: { template: 'flowers' } });
registerObject({ id: 'boulder', name: 'Boulder', examine: 'A large rock.', model: { template: 'boulder' } });
registerObject({ id: 'dead_tree', name: 'Dead tree', examine: 'This tree has long since died.', model: { template: 'tree', variant: 'dead' } });
registerObject({ id: 'snow_pine', name: 'Frosted pine', examine: 'A pine tree heavy with snow.', model: { template: 'tree', variant: 'snowpine' } });
registerObject({ id: 'pine_tree', name: 'Pine', examine: 'An evergreen pine.', model: { template: 'tree', variant: 'pine' } });

// ---- ruins / dungeon ---------------------------------------------------------------------------------
registerObject({ id: 'pillar', name: 'Pillar', examine: 'An ancient pillar.', model: { template: 'pillar' } });
registerObject({ id: 'broken_pillar', name: 'Broken pillar', examine: 'It has seen better days.', model: { template: 'pillar', broken: true, color: '#8a847a' } });
registerObject({ id: 'ruin_wall', name: 'Ruined wall', examine: 'Crumbling masonry.', model: { template: 'ruin' } });
registerObject({ id: 'gravestone', name: 'Gravestone', examine: 'The name has worn away.', model: { template: 'gravestone' } });
registerObject({ id: 'obelisk', name: 'Dark obelisk', examine: 'It hums with a faint energy.', model: { template: 'obelisk', glow: '#a040ff' } });
registerObject({
  id: 'cave_entrance', name: 'Cave entrance', examine: 'A dark opening leads underground.', options: ['Enter'], size: [3, 2],
  teleport: { x: 20, y: 177, message: 'You venture into the darkness...' }, model: { template: 'cave_entrance' }, mapIcon: { char: 'D', color: '#a08060' },
});
registerObject({
  id: 'cave_rope', name: 'Rope', examine: 'Leads back to the surface.', options: ['Climb-up'],
  teleport: { x: 34, y: 65 }, model: { template: 'rope' },
});
