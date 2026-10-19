// Farming content: patch objects (base + lazily generated per-state visuals), compost bin, seed crate.
// Plant data lives in gathering_items.js (registerData('farming', seedId, ...)). OWNER: agent B.

import { registerObject, getObject, getData } from '../core/registry.js';

export const PATCH_TYPES = {
  allotment: { size: [4, 2], name: 'Allotment', growMins: 2.5, weedMins: 3 },
  herb: { size: [2, 2], name: 'Herb patch', growMins: 5, weedMins: 3 },
  tree: { size: [2, 2], name: 'Tree patch', growMins: 6, weedMins: 4 },
};

// Base (spawned) patch objects: fully weeded look.
for (const [kind, t] of Object.entries(PATCH_TYPES)) {
  registerObject({
    id: `farm_patch_${kind}`, name: t.name, examine: `A patch for growing ${kind === 'allotment' ? 'vegetables' : kind === 'herb' ? 'herbs' : 'trees'}.`,
    size: t.size, options: ['Rake', 'Inspect'], model: { template: 'farm_patch', kind, weeds: 3 },
    mapIcon: kind === 'tree' ? undefined : { char: kind === 'herb' ? 'h' : 'v', color: '#7ad060' },
  });
}

registerObject({ id: 'compost_bin', name: 'Compost bin', examine: 'Throw weeds and spare crops in here to make compost.', options: ['Inspect'], model: { template: 'compost_bin' } });
registerObject({ id: 'seed_crate', name: 'Seed crate', examine: 'A crate of spare seeds. The farmers say you may help yourself.', options: ['Search'], model: { template: 'crate', color: '#9a7a4a' } });

/**
 * Object id (registered on demand) for a patch in a given visual state.
 * s = { weeds, seed, stage, cond: 'ok'|'diseased'|'dead', ripe, stump, checked }
 */
export function patchVisualId(kind, s) {
  const t = PATCH_TYPES[kind];
  const plant = s.seed ? getData('farming', s.seed) : null;
  if (!plant) {
    const w = s.weeds ?? 0;
    const id = `farm_patch_${kind}_w${w}`;
    if (!getObject(id)) {
      registerObject({
        id, name: t.name, examine: w ? 'This patch needs weeding.' : 'The soil has been cleared and is ready for planting.',
        size: t.size, options: w ? ['Rake', 'Inspect'] : ['Inspect'], model: { template: 'farm_patch', kind, weeds: w },
      });
    }
    return w === 3 ? `farm_patch_${kind}` : id;
  }
  const max = plant.stages;
  const stage = Math.min(s.stage, max);
  const f = stage / max;
  const cond = s.cond || 'ok';
  const look = kind === 'tree' ? 'tree' : kind === 'herb' ? 'herb' : 'veg';
  const tag = s.stump ? 'stump' : s.checked ? 'grown' : `${stage}`;
  const id = `farm_patch_${kind}__${s.seed}__${tag}__${cond}`;
  if (!getObject(id)) {
    let options, examine, name = t.name;
    if (cond === 'dead') { options = ['Clear', 'Inspect']; examine = 'The plants here have died.'; }
    else if (cond === 'diseased') { options = ['Cure', 'Inspect']; examine = 'The plants here are diseased.'; }
    else if (kind === 'tree' && s.stump) { options = ['Clear', 'Inspect']; name = 'Tree stump'; examine = 'The stump of a tree you grew.'; }
    else if (kind === 'tree' && s.checked) { options = ['Chop down', 'Inspect']; name = plant.name; examine = `A fully grown ${plant.name.toLowerCase()}.`; }
    else if (kind === 'tree' && stage >= max) { options = ['Check-health', 'Inspect']; name = plant.name; examine = `A fully grown ${plant.name.toLowerCase()}. It looks healthy.`; }
    else if (stage >= max) { options = [kind === 'herb' ? 'Pick' : 'Harvest', 'Inspect']; examine = `${plant.name} ready to be ${kind === 'herb' ? 'picked' : 'harvested'}.`; }
    else { options = ['Inspect']; examine = `${plant.name} growing here.`; }
    const ripe = stage >= max;
    registerObject({
      id, name, examine, size: t.size, options,
      model: {
        template: 'farm_patch', kind, weeds: 0, look, f: s.checked || s.stump ? 1 : f, ripe, cond,
        pc: plant.pc, fc: plant.fc, tree: plant.tree, stump: !!s.stump, tall: !!plant.tall, big: !!plant.big,
      },
    });
  }
  return id;
}
