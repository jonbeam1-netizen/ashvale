// Agility. OWNER: agent F.
// STARTER IMPLEMENTATION: 'Walk-across' style obstacles described by registerData('agility', objectId, {...}).
// The player is force-walked along the obstacle's long axis to the far side.

import { getData } from '../core/registry.js';

export function init(game) {
  for (const opt of ['Walk-across', 'Cross', 'Climb-over', 'Squeeze-through', 'Balance']) {
    game.interactions.onObject(opt, '*', ({ player, target }) => {
      const data = getData('agility', target.id);
      if (!data) return false;
      if (player.skills.getLevel('agility') < data.level) { game.message(`You need an Agility level of ${data.level} to attempt this.`); return; }
      const alongX = target.w >= target.h;
      const tiles = [];
      if (alongX) {
        const y = target.y;
        if (player.y !== y) tiles.push({ x: player.x, y });
        const east = player.x <= target.x;
        const endX = east ? target.x + target.w : target.x - 1;
        for (let x = player.x + (east ? 1 : -1); east ? x <= endX : x >= endX; x += east ? 1 : -1) tiles.push({ x, y });
      } else {
        const x = target.x;
        if (player.x !== x) tiles.push({ x, y: player.y });
        const south = player.y <= target.y;
        const endY = south ? target.y + target.h : target.y - 1;
        for (let y = player.y + (south ? 1 : -1); south ? y <= endY : y >= endY; y += south ? 1 : -1) tiles.push({ x, y });
      }
      game.message('You walk carefully across...');
      game.forceWalk(player, tiles, {
        anim: data.anim || 'balance',
        onDone: () => { player.skills.addXp('agility', data.xp); game.message('...and make it safely to the other side.'); },
      });
    });
  }
}
