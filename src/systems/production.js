// Production skills: Smithing, Cooking, Firemaking, Crafting, Fletching, Herblore. OWNER: agent C.
// STARTER IMPLEMENTATION: recipe-driven make loop (game.production.make), furnace/anvil/range/fire
// make-X menus, item-on-station cooking, tinderbox-on-logs firemaking.

import { recipesFor, allRecipes, getItem, getData } from '../core/registry.js';
import { rand } from '../core/rng.js';

let game;

const stationOk = (recipe, obj) => !recipe.station || (Array.isArray(recipe.station) ? recipe.station : [recipe.station]).includes(obj?.id);
const hasInputs = (p, r) => r.inputs.every((i) => p.inventory.has(i.id, i.qty)) && r.tools.every((t) => p.inventory.has(t));

/**
 * Repeatedly perform a recipe. opts: { station (WorldObject), anim }.
 * Returns the started action or null.
 */
function make(player, recipe, qty, opts = {}) {
  if (player.skills.getLevel(recipe.skill) < recipe.level) {
    game.message(`You need a ${recipe.skill[0].toUpperCase() + recipe.skill.slice(1)} level of ${recipe.level} to make that.`);
    return null;
  }
  if (!hasInputs(player, recipe)) {
    const missing = [...recipe.tools.filter((t) => !player.inventory.has(t)), ...recipe.inputs.filter((i) => !player.inventory.has(i.id, i.qty)).map((i) => i.id)];
    game.message(`You need ${missing.map((m) => getItem(m)?.name.toLowerCase() || m).join(', ')} to make that.`);
    return null;
  }
  let made = 0;
  const anim = opts.anim || { smithing: recipe.category === 'smelt' ? 'cook' : 'smith', cooking: 'cook' }[recipe.skill] || 'craft';
  return game.actions.start(player, {
    name: `make:${recipe.id}`, anim, delay: 0, interval: recipe.ticks,
    onStart: () => { if (opts.station) player.faceTile = { x: opts.station.x, y: opts.station.y }; },
    onTick: () => {
      if (made >= qty || !hasInputs(player, recipe)) return false;
      for (const i of recipe.inputs) player.inventory.remove(i.id, i.qty);
      // burn/fail chance falls linearly to 0 at burnStop (cooking) or uses failChance (smelting)
      let fail = recipe.failChance ?? 0;
      if (recipe.burnStop) fail = Math.max(0, 0.6 * (recipe.burnStop - player.skills.getLevel(recipe.skill)) / Math.max(1, recipe.burnStop - recipe.level));
      if (Math.random() < fail) {
        if (recipe.failOutput) player.inventory.add(recipe.failOutput, 1);
        game.message(recipe.failOutput ? `You accidentally burn the ${getItem(recipe.outputs[0].id).name.toLowerCase()}.` : 'Your attempt fails.');
      } else {
        for (const o of recipe.outputs) player.inventory.add(o.id, o.qty);
        player.skills.addXp(recipe.skill, recipe.xp);
        game.message(`You make ${/s$/.test(getItem(recipe.outputs[0].id).name) ? 'some' : 'a'} ${getItem(recipe.outputs[0].id).name.toLowerCase()}.`);
      }
      made++;
      return made < qty && hasInputs(player, recipe);
    },
  });
}

/** Opens a make-X menu for recipes and starts the chosen one. */
function openRecipeMenu(player, recipes, station, title) {
  if (!recipes.length) { game.message("You don't have anything to use here."); return; }
  game.ui.openMakeX({
    title,
    items: recipes.map((r) => ({ id: r.outputs[0].id, data: r })),
    onSelect: (it, qty) => make(player, it.data, qty, { station }),
  });
}

export function init(g) {
  game = g;
  game.production = { make, openRecipeMenu, hasInputs };
  const I = game.interactions;

  I.onObject('Smelt', '*', ({ player, target }) => openRecipeMenu(player, recipesFor('smithing').filter((r) => r.category === 'smelt' && stationOk(r, target)), target, 'What would you like to smelt?'));
  I.onObject('Smith', '*', ({ player, target }) => {
    if (!player.inventory.has('hammer')) { game.message('You need a hammer to work the metal with.'); return; }
    openRecipeMenu(player, recipesFor('smithing').filter((r) => r.category === 'forge' && stationOk(r, target)), target, 'What would you like to make?');
  });
  I.onObject('Cook', '*', ({ player, target }) => {
    const rs = recipesFor('cooking').filter((r) => stationOk(r, target) && r.inputs.every((i) => player.inventory.has(i.id)));
    if (!rs.length) { game.message("You don't have anything to cook."); return; }
    openRecipeMenu(player, rs, target, 'What would you like to cook?');
  });
  // raw food used on a range/fire
  I.onItemOnObject('*', '*', ({ player, item, target }) => {
    const r = allRecipes().find((x) => x.inputs.length === 1 && x.inputs[0].id === item.id && x.station && stationOk(x, target));
    if (!r) return false;
    const n = player.inventory.count(item.id);
    if (n > 1) openRecipeMenu(player, [r], target, 'How many would you like to make?');
    else make(player, r, 1, { station: target });
  });

  // Firemaking: tinderbox on logs
  I.onItemOnItem('tinderbox', '*', ({ player, other, otherSlot }) => {
    const data = getData('firemaking', other.id);
    if (!data) return false;
    if (player.skills.getLevel('firemaking') < data.level) { game.message(`You need a Firemaking level of ${data.level} to burn these logs.`); return; }
    if (game.world.objectsAt(player.x, player.y).length || game.world.buildingAt(player.x, player.y)) { game.message("You can't light a fire here."); return; }
    game.message('You attempt to light the logs.');
    game.actions.start(player, {
      name: 'firemaking', anim: 'craft', delay: 2,
      onTick: () => {
        if (!player.inventory.get(otherSlot) || player.inventory.get(otherSlot).id !== other.id) return false;
        player.inventory.removeAt(otherSlot, 1);
        const x = player.x, y = player.y;
        const fire = game.spawnObject('fire', x, y);
        player.skills.addXp('firemaking', data.xp);
        game.message('The fire catches and the logs begin to burn.');
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
          if (game.world.isWalkable(x + dx, y + dy)) { game.forceWalk(player, [{ x: x + dx, y: y + dy }]); break; }
        }
        game.schedule(rand.int(data.burnTicks[0], data.burnTicks[1]), () => game.removeObject(fire));
        return false;
      },
    });
  });
}
