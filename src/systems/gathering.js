// Gathering skills: Woodcutting, Mining, Fishing (Hunter TBD). OWNER: agent B.
// STARTER IMPLEMENTATION driven by registerData('woodcutting'|'mining'|'fishing'|'tools', ...) in
// content/gathering.js. Agent B extends/replaces freely.

import { getData, getItem } from '../core/registry.js';

let game;

/** Best usable tool for a skill from inventory or wielded weapon: {id, level, power} or null. */
export function bestTool(player, skill) {
  let best = null;
  const consider = (id) => {
    const t = getData('tools', id);
    if (!t || t.skill !== skill || player.skills.getLevel(skill) < t.level) return;
    if (!best || t.power > best.power) best = { id, ...t };
  };
  for (const it of player.inventory.items()) consider(it.id);
  const w = player.equipment.get('weapon');
  if (w) consider(w.id);
  return best;
}

const successChance = (lvl, req, power) => Math.max(0.08, Math.min(0.92, 0.4 + (lvl - req) * 0.015 + (power - 1) * 0.25));

/** Generic repeating gather action on an object. */
function gather(ctx, { skill, data, toolName, anim, startMsg, interval, onSuccess }) {
  const { player, target } = ctx;
  const lvl = player.skills.getLevel(skill);
  if (lvl < data.level) { game.message(`You need a ${skill[0].toUpperCase() + skill.slice(1)} level of ${data.level} to do that.`); return; }
  const tool = data.tool ? (player.inventory.has(data.tool) ? { id: data.tool, power: 1 } : null) : bestTool(player, skill);
  if (!tool) { game.message(`You need ${toolName} to do that.`); return; }
  if (player.inventory.isFull()) { game.message("Your inventory is too full to hold any more."); return; }
  const objId = target.id;
  game.message(startMsg);
  game.actions.start(player, {
    name: skill, anim, delay: 1, tool: tool.id,
    onTick: ({ ticks }) => {
      if (target.id !== objId || target.hidden || !game.objects.has(target.uid)) return false;
      if (ticks === 0 || ticks % interval) return true;
      if (Math.random() >= successChance(lvl, data.level, tool.power)) return true;
      const keep = onSuccess(player, target);
      if (player.inventory.isFull()) { game.message('Your inventory is too full to hold any more.'); return false; }
      return keep;
    },
  });
}

export function init(g) {
  game = g;
  const I = game.interactions;

  I.onObject('Chop down', '*', (ctx) => {
    const data = getData('woodcutting', ctx.target.id);
    if (!data) { game.message('This tree is not ready to be cut yet.'); return; }
    gather(ctx, {
      skill: 'woodcutting', data, toolName: 'an axe which you have the Woodcutting level to use', anim: 'chop', interval: 4,
      startMsg: 'You swing your axe at the tree.',
      onSuccess: (p, obj) => {
        p.inventory.add(data.log, 1);
        p.skills.addXp('woodcutting', data.xp);
        game.message(`You get some ${getItem(data.log).name.toLowerCase()}.`);
        if (Math.random() < (data.depleteChance ?? 1)) { game.depleteObject(obj); return false; }
        return true;
      },
    });
  });

  I.onObject('Mine', '*', (ctx) => {
    const data = getData('mining', ctx.target.id);
    if (!data) { game.message('There is no ore currently available in this rock.'); return; }
    gather(ctx, {
      skill: 'mining', data, toolName: 'a pickaxe which you have the Mining level to use', anim: 'mine', interval: 4,
      startMsg: 'You swing your pick at the rock.',
      onSuccess: (p, obj) => {
        p.inventory.add(data.ore, 1);
        p.skills.addXp('mining', data.xp);
        game.message(`You manage to mine some ${getItem(data.ore).name.toLowerCase().replace(' ore', '')}.`);
        game.depleteObject(obj, data.respawnTicks);
        return false;
      },
    });
  });

  for (const opt of ['Net', 'Bait', 'Lure', 'Cage', 'Harpoon']) {
    I.onObject(opt, '*', (ctx) => {
      const spot = getData('fishing', ctx.target.id)?.[opt];
      if (!spot) return false;
      const p = ctx.player;
      const lvl = p.skills.getLevel('fishing');
      const catches = spot.catches.filter((c) => c.level <= lvl);
      if (!catches.length) { game.message(`You need a Fishing level of ${spot.catches[0].level} to fish here.`); return; }
      gather(ctx, {
        skill: 'fishing', data: { level: catches[0].level, tool: spot.tool }, toolName: `a ${getItem(spot.tool)?.name.toLowerCase() || 'tool'}`,
        anim: 'fish', interval: 5, startMsg: 'You cast out your net...',
        onSuccess: (pl) => {
          const c = catches[Math.floor(Math.random() * catches.length)];
          pl.inventory.add(c.id, 1);
          pl.skills.addXp('fishing', c.xp);
          game.message(`You catch some ${getItem(c.id).name.toLowerCase().replace('raw ', '')}.`);
          return true;
        },
      });
    });
  }
}
