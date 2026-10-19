// Hunter content: creatures (non-combat NPCs), trap objects and per-creature data. OWNER: agent B.
//
// registerData('hunter', npcId, { method: 'snare'|'box'|'net', level, xp, loot: [{id, qty}], respawnTicks })
// registerData('hunter_trap', itemId, { set, full, failed, method })

import { registerNpc, registerObject, registerData } from '../core/registry.js';

// ---- creatures ------------------------------------------------------------------------------------
const creature = (def, data) => {
  registerNpc({
    combatLevel: 0, options: [], stats: { hitpoints: 2 }, respawnTicks: data.respawnTicks ?? 20, wanderRadius: 5, ...def,
  });
  registerData('hunter', def.id, { respawnTicks: 20, ...data });
};

// bird snare
creature({ id: 'crested_finch', name: 'Crested finch', examine: 'A small red bird with a jaunty crest.', model: { template: 'chicken', scale: 0.45, colors: { body: '#c0402a', comb: '#f0c040', beak: '#e8b030', legs: '#6a4a2a' } } },
  { method: 'snare', level: 1, xp: 34, color: '#c0402a', loot: [{ id: 'bones' }, { id: 'raw_bird_meat' }, { id: 'feather', qty: [5, 10] }] });
creature({ id: 'reed_warbler', name: 'Reed warbler', examine: 'It sings from the bulrushes.', model: { template: 'chicken', scale: 0.45, colors: { body: '#a88a40', comb: '#a88a40', beak: '#3a3a3a', legs: '#4a3a2a' } } },
  { method: 'snare', level: 9, xp: 48, color: '#a88a40', loot: [{ id: 'bones' }, { id: 'raw_bird_meat' }, { id: 'feather', qty: [8, 14] }] });
creature({ id: 'snowcap_lark', name: 'Snowcap lark', examine: 'A plump lark with a snow-white cap.', model: { template: 'chicken', scale: 0.5, colors: { body: '#7a8a9a', comb: '#f4f8ff', beak: '#e8b030', legs: '#4a3a2a' } } },
  { method: 'snare', level: 19, xp: 95, color: '#7a8a9a', loot: [{ id: 'bones' }, { id: 'raw_bird_meat' }, { id: 'snowcap_down', qty: [6, 12] }, { id: 'feather', qty: [4, 8] }] });

// box traps
creature({ id: 'bramble_ferret', name: 'Bramble ferret', examine: 'A wiry ferret that lives in the undergrowth.', model: { template: 'rat', scale: 1.1, colors: { body: '#8a6a4a', snout: '#e8d0b0' } } },
  { method: 'box', level: 27, xp: 115, color: '#8a6a4a', loot: [{ id: 'bramble_fur' }] });
creature({ id: 'grey_bombtail_critter', name: 'Grey bombtail', examine: 'A twitchy grey critter. Its tail smells of burnt powder.', model: { template: 'rat', scale: 1.0, colors: { body: '#8a8a88', snout: '#d8d0d0' } } },
  { method: 'box', level: 53, xp: 198, color: '#8a8a88', loot: [{ id: 'grey_bombtail', qty: 1 }], respawnTicks: 30 });
creature({ id: 'ember_bombtail_critter', name: 'Ember bombtail', examine: 'It glows faintly, like a coal about to catch.', model: { template: 'rat', scale: 1.05, colors: { body: '#c8502a', snout: '#f0c060' } } },
  { method: 'box', level: 63, xp: 265, color: '#c8502a', loot: [{ id: 'ember_bombtail', qty: 1 }], respawnTicks: 30 });

// butterfly net (NPC option 'Catch')
const fly = (id, name, examine, color, level, xp) => creature(
  { id, name, examine, options: ['Catch'], wanderRadius: 6, model: { template: 'bat', scale: 0.35, colors: { body: '#2a2420', wing: color, eyes: '#000000' } } },
  { method: 'net', level, xp, color, jar: `jar_${id}`, respawnTicks: 15 },
);
fly('amber_flutterwing', 'Amber flutterwing', 'A butterfly with wings like warm honey.', '#f0a020', 15, 24);
fly('azure_flutterwing', 'Azure flutterwing', 'Its wings shimmer like the lake.', '#3a80e0', 35, 44);
fly('frost_flutterwing', 'Frost flutterwing', 'A pale butterfly that thrives in the cold.', '#d8f0ff', 55, 70);

// ---- traps ----------------------------------------------------------------------------------------
const trapObjects = (prefix, trap, name) => {
  registerObject({ id: `${prefix}_set`, name, examine: `A ${name.toLowerCase()}, ready and waiting.`, blocks: false, options: ['Dismantle'], model: { template: 'hunter_trap', trap, state: 'set' } });
  registerObject({ id: `${prefix}_failed`, name, examine: 'It has been triggered, but caught nothing.', blocks: false, options: ['Dismantle'], model: { template: 'hunter_trap', trap, state: 'failed' } });
};
trapObjects('bird_snare', 'snare', 'Bird snare');
trapObjects('box_trap', 'box', 'Box trap');
// a "full" object per creature so the catch is visible on the trap
for (const [id, trap, color] of [['crested_finch', 'snare', '#c0402a'], ['reed_warbler', 'snare', '#a88a40'], ['snowcap_lark', 'snare', '#7a8a9a'],
  ['bramble_ferret', 'box', '#8a6a4a'], ['grey_bombtail_critter', 'box', '#8a8a88'], ['ember_bombtail_critter', 'box', '#c8502a']]) {
  const prefix = trap === 'snare' ? 'bird_snare' : 'box_trap';
  registerObject({ id: `${prefix}_full_${id}`, name: trap === 'snare' ? 'Bird snare' : 'Shaking box', examine: 'Something has been caught!', blocks: false, options: ['Check', 'Dismantle'], model: { template: 'hunter_trap', trap, state: 'full', color } });
}
registerData('hunter_trap', 'bird_snare', { method: 'snare', set: 'bird_snare_set', failed: 'bird_snare_failed', fullPrefix: 'bird_snare_full_', name: 'bird snare' });
registerData('hunter_trap', 'box_trap', { method: 'box', set: 'box_trap_set', failed: 'box_trap_failed', fullPrefix: 'box_trap_full_', name: 'box trap' });
