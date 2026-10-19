// Construction (agent C): the Homestead. Build furniture at hotspots with planks + nails (hammer +
// saw required), remove it again, and use what you built (cooking stoves, larder, altar bonus,
// restoration pools, a travel map). Built furniture persists in player.store('construction').built.

import { getData, getItem, allData } from '../core/registry.js';
import { HOTSPOTS, FURNITURE } from '../content/recipes_construction.js';
import { SMITH_TIERS } from '../content/recipes_smithing.js';
import { openGrid, materialText } from './production_ui.js';

let game;

const NAIL_BEND = [0.25, 0.18, 0.12, 0.08, 0.05, 0.03, 0.01];
const NAILS = SMITH_TIERS.map((t, k) => ({ id: `${t.id}_nails`, bend: NAIL_BEND[k] }));
const store = (p = game.player) => { const s = p.store('construction'); s.built = s.built || {}; return s; };
const hotspotOf = (obj) => HOTSPOTS.find((h) => h.id === obj.id || (obj.x === h.x && obj.y === h.y && obj.def?.homestead));
const nailCount = (p) => NAILS.reduce((n, t) => n + p.inventory.count(t.id), 0);
const matList = (f) => Object.entries(f.materials).map(([id, qty]) => ({ id, qty }));

const DESTINATIONS = [
  ['Brackenford', 96, 141], ['Highmarch', 161, 80], ['Greystone Quarry', 47, 88], ['Haverly Farms', 152, 162], ['Mirrowmere shore', 146, 132],
];
const LORE = [
  'A battered almanac: "Weepwood bends but never breaks. Fletchers prize it for that."',
  'A ledger of old Brackenford trade: duskite bars once paid for a whole house.',
  'A herbal: "Ghostlily grows only where frost and grave meet. Brew with care."',
  'A travelogue: "The Calder Ruins were a binding hall once. The stones still remember."',
  'A cookbook margin note: "Ranges forgive. Campfires do not."',
];

/** Swap every hotspot to its built furniture (or back) according to the saved state. */
function applyBuilt() {
  const built = store().built;
  for (const hs of HOTSPOTS) {
    const obj = game.findObjects((o) => o.x === hs.x && o.y === hs.y && (o.id === hs.id || o.def?.homestead))[0];
    if (!obj) continue;
    const want = built[hs.id] && getData('construction', built[hs.id]) ? `built_${built[hs.id]}` : hs.id;
    if (obj.id !== want) game.replaceObject(obj, want);
  }
}

function canBuild(p, f, silent) {
  const say = (t) => { if (!silent) game.message(t); return false; };
  if (p.skills.getCurrent('construction') < f.level) return say(`You need a Construction level of ${f.level} to build that.`);
  if (!p.inventory.has('hammer') || !p.inventory.has('saw')) return say('You need a hammer and a saw to build furniture.');
  const miss = matList(f).filter((m) => !p.inventory.has(m.id, m.qty));
  if (miss.length) return say(`You need ${materialText(miss).toLowerCase()} to build that.`);
  if (f.nails && nailCount(p) < f.nails) return say(`You need at least ${f.nails} nails to build that.`);
  return true;
}

function build(player, obj, hs, f) {
  if (!canBuild(player, f)) return;
  game.actions.start(player, {
    name: 'construction', anim: 'smith', tool: 'hammer', delay: 3, interval: 1,
    onStart: () => { player.faceTile = { x: obj.x, y: obj.y }; },
    onTick: () => {
      if (!canBuild(player, f)) return false;
      let need = f.nails || 0;
      while (need > 0) {
        const tier = [...NAILS].reverse().find((t) => player.inventory.has(t.id));
        if (!tier) { game.message('You have run out of nails.'); return false; }
        player.inventory.remove(tier.id, 1);
        if (Math.random() < tier.bend) game.message('You accidentally bend a nail.');
        else need--;
      }
      for (const m of matList(f)) player.inventory.remove(m.id, m.qty);
      game.replaceObject(obj, `built_${f.id}`);
      store(player).built[hs.id] = f.id;
      player.skills.addXp('construction', f.xp);
      game.message(`You build a ${f.name.toLowerCase()}.`);
      game.events.emit('production:make', { player, recipe: { id: `build_${f.id}`, skill: 'construction' }, qty: 1, success: true });
      return false;
    },
  });
}

function openBuild(player, obj) {
  const hs = hotspotOf(obj);
  if (!hs) return;
  if (!player.inventory.has('hammer') || !player.inventory.has('saw')) { game.message('You need a hammer and a saw to build here.'); return; }
  const list = FURNITURE.filter((f) => f.type === hs.type);
  openGrid({
    game, id: 'build', title: `Build: ${hs.name.replace(/ space$/, '')}`, width: 520, quantities: false,
    note: `You have ${nailCount(player)} nails. Better nails bend less often.`,
    sections: () => [{ entries: list.map((f) => {
      const objDef = `built_${f.id}`;
      return {
        id: matList(f)[0].id, label: f.name, sub: `Lvl ${f.level} · ${matList(f).map((m) => `${m.qty} ${getItem(m.id)?.name.toLowerCase() || m.id}`).join(', ')}${f.nails ? ` · ${f.nails} nails` : ''}`,
        title: `${f.xp} xp`, state: player.skills.getCurrent('construction') < f.level ? 'lowlvl' : canBuild(player, f, true) ? 'ok' : 'nomat', data: f, objDef,
      };
    }) }],
    onPick: (e) => { build(player, obj, hs, e.data); },
  });
}

function remove(player, obj) {
  const hs = hotspotOf(obj);
  if (!hs) return;
  const name = obj.def.name.toLowerCase();
  game.ui.startDialogue([
    { title: `Remove your ${name}? (materials are lost)`, options: [
      { text: 'Yes, remove it.', action: () => {
        game.playAnim(player, 'smith', 1200);
        game.replaceObject(obj, hs.id);
        delete store(player).built[hs.id];
        game.message(`You dismantle the ${name}.`);
        return false;
      } },
      { text: 'No, keep it.', end: true },
    ] },
  ], { player });
}

function usePool(player, f) {
  const p = player;
  game.playAnim(p, 'drink', 900);
  p.runEnergy = 10000; game.events.emit('run:change', { player: p });
  const msgs = ['You feel refreshed.'];
  if (f.pool >= 2) {
    for (const s of Object.keys(p.skills.levels)) if (s !== 'hitpoints' && s !== 'prayer') p.skills.restore(s);
    p.specialEnergy = 100; game.events.emit('special:change', { player: p });
    msgs[0] = 'You feel restored.';
  }
  if (f.pool >= 3) {
    game.heal(p, p.maxHp);
    p.skills.setCurrent('prayer', Math.max(p.skills.getCurrent('prayer'), p.skills.getLevel('prayer')));
    if (game.combat?.curePoison) game.combat.curePoison(p, 0);
    msgs[0] = 'You feel completely renewed.';
  }
  game.spawnEffect('sparkle', p, { color: 0xc0e0ff });
  game.message(msgs[0]);
}

export function init(g) {
  game = g;
  const I = game.interactions;
  const builtIds = FURNITURE.map((f) => `built_${f.id}`);
  const byObj = (obj) => getData('construction', obj.def.homestead);

  I.onObject('Build', HOTSPOTS.map((h) => h.id), ({ player, target }) => openBuild(player, target));
  I.onObject('Remove', builtIds, ({ player, target }) => remove(player, target));
  I.onObject('Search', builtIds, ({ player, target }) => {
    const f = byObj(target);
    if (f.fn === 'books') { game.message(LORE[Math.floor(Math.random() * LORE.length)]); return; }
    if (f.fn === 'larder') {
      game.ui.openMakeX({
        title: 'What would you like to take?', items: f.larder.filter((id) => getItem(id)).map((id) => ({ id })),
        onSelect: (it, qty) => {
          const n = Math.min(qty, player.inventory.capacityFor(it.id));
          if (n <= 0) { game.message("You don't have enough inventory space."); return; }
          player.inventory.add(it.id, n);
          game.message(`You take ${n > 1 ? `${n} items` : 'it'} from the larder.`);
        },
      });
      return;
    }
    return false;
  });
  I.onObject('Travel', builtIds, ({ player }) => {
    game.ui.startDialogue([{ title: 'Where would you like to travel?', options: [
      ...DESTINATIONS.map(([name, x, y]) => ({ text: name, action: () => {
        game.spawnEffect('teleport', player, { color: 0xe8a040 });
        game.playAnim(player, 'cast', 1200);
        game.actions.lock(player, 3);
        game.schedule(2, () => { game.teleport(player, x, y); game.message(`You arrive at ${name}.`); });
        return false;
      } })),
      { text: 'Stay here.', end: true },
    ] }], { player });
  });
  I.onObject('Drink', builtIds, ({ player, target }) => { const f = byObj(target); if (f?.fn !== 'pool') return false; usePool(player, f); });
  I.onObject('Search', ['homestead_workbench'], ({ player }) => {
    const missing = ['hammer', 'saw'].filter((t) => !player.inventory.has(t));
    if (!missing.length) { game.message('The workbench is tidy. You already have the tools you need.'); return; }
    for (const t of missing) player.inventory.add(t, 1);
    game.message(`You take a ${missing.join(' and a ')} from the workbench.`);
  });

  // bones on a built altar: offering bonus
  const altars = FURNITURE.filter((f) => f.fn === 'altar').map((f) => `built_${f.id}`);
  const bones = allData('bones').map(([id]) => id);
  const boneList = bones.length ? bones : ['bones', 'big_bones'];
  I.onItemOnObject(boneList, altars, ({ player, item, target }) => {
    const f = byObj(target);
    const xp = getData('bones', item.id)?.xp ?? (item.id === 'big_bones' ? 15 : 4.5);
    const id = item.id;
    game.actions.start(player, {
      name: 'offer_bones', delay: 0, interval: 3,
      onTick: () => {
        if (!player.inventory.has(id)) { game.message('You have no more of those bones to offer.'); return false; }
        player.inventory.remove(id, 1);
        game.playAnim(player, 'bury', 1200);
        game.spawnEffect('sparkle', target, { color: 0xfff0b0 });
        player.skills.addXp('prayer', xp * f.boneMult);
        game.message(`You offer the ${getItem(id)?.name.toLowerCase() || 'bones'} at your altar.`);
        return player.inventory.has(id);
      },
    });
  });

  applyBuilt();
  game.events.on('load', () => game.schedule(1, applyBuilt));
  game.events.on('game:ready', applyBuilt);
  game.construction = { applyBuilt, build, remove, HOTSPOTS, FURNITURE };
}
