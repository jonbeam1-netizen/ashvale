// Pets / followers. OWNER: activities (pets). Content: src/content/pets.js.
//
// * One follower at a time: a local NPC (`follower_<id>`, never shared over the network, not attackable) that
//   trails the player tile by tile (2 tiles a tick when running) and snaps back after teleports.
// * Drops: rolled on 'npc:death' (local killer), 'gathering:log|ore|fish' and 'minigame:<id>' events
//   (rates in content/pets.js). A pet you already own gives the "funny feeling" message instead.
// * Insurance: every pet ever obtained is remembered (`player.store('pets').owned`); the Petkeeper in
//   Brackenford reclaims any that are not following you, in your inventory or in your bank.
// * Multiplayer: the snapshot carries `pet` (follower id); other clients spawn a look-alike local follower
//   behind that remote player (Examine only).
//
// API: game.pets = { award(id, how), follower(), summon(id), dismiss(), owned(), all() }

import { getItem, getData, allData } from '../core/registry.js';
import { findPath } from '../world/pathfinding.js';
import { el, escapeHtml, fmt } from '../ui/util.js';
import { getItemIcon } from '../ui/icons.js';
import { PET_RECLAIM_FEE } from '../content/pets.js';

let game;
let follower = null;               // local player's follower Npc
const remotePets = new Map();      // peerId -> { id, npc }

const st = () => {
  const s = game.player.store('pets');
  if (!s.owned || typeof s.owned !== 'object' || Array.isArray(s.owned)) s.owned = {};
  return s;
};
const petDef = (id) => getData('pets', id);
const itemId = (id) => `pet_${id}`;

// -------------------------------------------------------------------------------------------------
// Follower movement
// -------------------------------------------------------------------------------------------------
function freeAdjacent(x, y, avoid = null) {
  const w = game.world;
  const dirs = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (avoid && avoid.x === nx && avoid.y === ny) continue;
    if (w.isWalkable(nx, ny) && w.canStep(x, y, dx, dy)) return { x: nx, y: ny };
  }
  return { x, y };
}

function spawnPetNpc(id, near, owner) {
  const at = freeAdjacent(near.x, near.y);
  const npc = game.spawnNpc(`follower_${id}`, at.x, at.y, { wander: 0, respawn: false });
  if (!npc) return null;
  npc.state.petOf = owner;            // 'local' | peerId
  npc.state.noClues = true;
  return npc;
}

/** Moves a follower one tick behind its owner (owner = Player or RemotePlayer). */
function follow(pet, owner) {
  if (!pet || pet.dead || !game.npcs.has(pet.uid)) return;
  pet.path = [];
  const d = Math.max(Math.abs(pet.x - owner.x), Math.abs(pet.y - owner.y));
  if (d > 12 || owner.teleported) {
    const at = freeAdjacent(owner.x, owner.y);
    pet.setPosition(at.x, at.y);
    return;
  }
  const steps = owner.steps || [];
  const moved = Math.max(0, steps.length - 1);
  if (d === 1 && !moved) return;
  // trail the owner: aim for the tile it just left; step off it when standing on it; else get next to it
  let goal, mode = 'tile';
  if (d === 0) goal = freeAdjacent(owner.x, owner.y);
  else if (moved) goal = steps[steps.length - 2];
  else { goal = { x: owner.x, y: owner.y }; mode = 'range'; }
  if (mode === 'tile' && goal.x === pet.x && goal.y === pet.y) return;
  const { path } = findPath(game.world, pet.x, pet.y, { x0: goal.x, y0: goal.y, x1: goal.x, y1: goal.y, mode, range: 1 }, { maxNodes: 600, radius: 16 });
  if (!path.length) return;
  pet.path = path;
  game.stepAlongPath(pet, Math.max(1, Math.min(3, moved + (d > 2 ? 1 : 0))));
  // never end up on the owner's tile
  if (pet.x === owner.x && pet.y === owner.y && pet.steps.length > 1) {
    const back = pet.steps[pet.steps.length - 2];
    pet.x = back.x; pet.y = back.y; pet.steps.pop();
  }
  pet.path = [];
}

// -------------------------------------------------------------------------------------------------
// Ownership
// -------------------------------------------------------------------------------------------------
function holds(id) {
  const p = game.player, iid = itemId(id);
  return (follower && follower.def.pet === id) || p.inventory.has(iid) || p.bank.has(iid);
}

function summon(id) {
  if (follower) dismiss(false);
  follower = spawnPetNpc(id, game.player, 'local');
  st().following = follower ? id : null;
  if (follower) game.spawnEffect('sparkle', follower, { color: 0xffe0f0 });
  return follower;
}

function dismiss(toInventory = true) {
  if (!follower) return false;
  const id = follower.def.pet;
  if (toInventory) {
    if (game.player.inventory.isFull()) { game.message("You don't have enough inventory space."); return false; }
    game.player.inventory.add(itemId(id), 1);
  }
  game.removeNpc(follower);
  follower = null;
  st().following = null;
  return true;
}

/** A pet drop. how: short text for the broadcast ("killing X", "woodcutting"...). */
function award(id, how = '') {
  const def = petDef(id);
  if (!def) return false;
  const s = st();
  if (holds(id)) {
    game.message('<col=ef20ff>You have a funny feeling like you would have been followed...</col>');
    return false;
  }
  const first = !s.owned[id];
  s.owned[id] = s.owned[id] || game.tickCount || 1;
  if (!follower) {
    summon(id);
    game.message('<col=ef20ff>You have a funny feeling like you\'re being followed.</col>');
  } else if (!game.player.inventory.isFull()) {
    game.player.inventory.add(itemId(id), 1);
    game.message('<col=ef20ff>You feel something weird sneaking into your backpack.</col>');
  } else {
    game.message('<col=ef20ff>You hear a tiny squeak of disappointment - your backpack is full. Visit the Petkeeper in Brackenford to reclaim your new pet.</col>');
  }
  if (first) game.message(`<col=ef20ff>${escapeHtml(game.player.name)} has a funny feeling... ${escapeHtml(def.name)} has joined the collection${how ? ` (${escapeHtml(how)})` : ''}!</col>`, 'system');
  game.events.emit('pet:get', { id, how, first });
  return true;
}

function roll(source, how) {
  for (const [id, def] of allData('pets')) {
    const src = def.source || {};
    const hit = typeof source === 'string' ? src.event === source : (src.npc === source.npc || (Array.isArray(src.npc) && src.npc.includes(source.npc)));
    if (hit && Math.random() < (src.chance ?? 0)) award(id, how);
  }
}

// -------------------------------------------------------------------------------------------------
// Petkeeper interface
// -------------------------------------------------------------------------------------------------
function openPetHouse(npc) {
  game.ui.openInterface({
    id: 'pet_house', title: "Odessa's Pet House", width: 420, className: 'pet-house',
    render: (body) => {
      const draw = () => {
        body.innerHTML = '';
        const s = st();
        const all = allData('pets');
        const got = all.filter(([id]) => s.owned[id]).length;
        body.appendChild(el('div', 'ph-head', `Pets found: <b>${got}</b> / ${all.length} &nbsp;·&nbsp; Reclaim fee: <b>${fmt(PET_RECLAIM_FEE)}</b> coins`));
        const grid = el('div', 'ph-grid');
        for (const [id, def] of all) {
          const owned = !!s.owned[id];
          const where = !owned ? null : follower?.def.pet === id ? 'Following you' : game.player.inventory.has(itemId(id)) ? 'In your pack' : game.player.bank.has(itemId(id)) ? 'In your bank' : null;
          const card = el('div', `ph-card${owned ? '' : ' ph-unknown'}`);
          card.innerHTML = `<img alt="" src="${getItemIcon(itemId(id), 1)}"><div class="ph-name">${owned ? escapeHtml(def.name) : '???'}</div>`
            + `<div class="ph-src">${owned ? escapeHtml(sourceText(def)) : escapeHtml(hintText(def))}</div>`;
          if (owned && where) card.appendChild(el('div', 'ph-where', where));
          else if (owned) {
            const b = el('button', 'ph-btn', 'Reclaim');
            b.onclick = () => {
              if (holds(id)) { draw(); return; }
              if (game.player.inventory.count('coins') < PET_RECLAIM_FEE) { game.message(`You need ${fmt(PET_RECLAIM_FEE)} coins to reclaim a pet.`); return; }
              if (follower && game.player.inventory.isFull()) { game.message("You don't have enough inventory space."); return; }
              game.player.inventory.remove('coins', PET_RECLAIM_FEE);
              if (!follower) summon(id); else game.player.inventory.add(itemId(id), 1);
              game.message(`Odessa whistles, and ${def.name} comes bounding out of the pet house.`);
              draw();
            };
            card.appendChild(b);
          }
          grid.appendChild(card);
        }
        body.appendChild(grid);
      };
      draw();
    },
  });
  if (npc) npc.talkingTo = null;
}

function sourceText(def) {
  const s = def.source || {};
  const rate = s.chance ? `1/${Math.round(1 / s.chance)}` : '';
  if (s.npc) return `${(Array.isArray(s.npc) ? s.npc : [s.npc]).map((n) => game.registry.getNpc(n)?.name || n).join(', ')} ${rate}`;
  const ev = { 'gathering:log': 'Woodcutting', 'gathering:ore': 'Mining', 'gathering:fish': 'Fishing', 'minigame:crucible': 'The Crucible', 'minigame:wardens': "Wardens' Rest chest", 'minigame:bannerfall': 'Bannerfall' }[s.event] || s.event;
  return `${ev} ${rate}`;
}
function hintText(def) {
  const s = def.source || {};
  if (s.npc) return 'Dropped by a mighty foe';
  if (String(s.event).startsWith('gathering')) return 'Found while gathering';
  return 'Earned in a minigame';
}

function injectCss() {
  if (document.getElementById('pets-css')) return;
  const css = document.createElement('style');
  css.id = 'pets-css';
  css.textContent = `
.pet-house .ph-head { margin-bottom: 6px; color: #ffd890; }
.pet-house .ph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 5px; max-height: 380px; overflow-y: auto; }
.pet-house .ph-card { background: rgba(0,0,0,0.25); border: 1px solid #1a1611; border-radius: 3px; padding: 4px; text-align: center; font-size: 12px; }
.pet-house .ph-card img { width: 36px; height: 32px; }
.pet-house .ph-unknown img { filter: brightness(0) opacity(0.5); }
.pet-house .ph-name { color: #ffff00; }
.pet-house .ph-src { color: #c8b890; font-size: 11px; min-height: 14px; }
.pet-house .ph-where { color: #80ff80; font-size: 11px; }
.pet-house .ph-btn { margin-top: 2px; font-size: 11px; padding: 1px 6px; }
`;
  document.head.appendChild(css);
}

// -------------------------------------------------------------------------------------------------
export function init(g) {
  game = g;
  const ev = game.events, I = game.interactions;
  injectCss();

  const followerIds = allData('pets').map(([id]) => `follower_${id}`);
  const petItems = allData('pets').map(([id]) => itemId(id));

  I.onItem('Summon', petItems, ({ player, slot, item }) => {
    const id = getItem(item.id)?.pet;
    if (!id) return false;
    if (follower) { game.message('You already have a follower.'); return; }
    player.inventory.removeAt(slot, 1);
    st().owned[id] ||= game.tickCount || 1;
    summon(id);
  });
  // dropping a pet item also lets it out (OSRS style), it never lands on the ground
  I.onItem('Drop', petItems, ({ player, slot, item }) => {
    const id = getItem(item.id)?.pet;
    if (follower) { game.message('You already have a follower.'); return; }
    player.inventory.removeAt(slot, 1);
    summon(id);
  });

  I.onNpc('Pick-up', followerIds, ({ target }) => {
    if (target !== follower) { game.message("That's not your pet."); return; }
    game.playAnim(game.player, 'pickup', 900);
    if (dismiss(true)) game.message(`You pick up ${target.name}.`);
  }, { range: 1 });
  I.onNpc('Talk-to', followerIds, ({ target }) => {
    const def = petDef(target.def.pet);
    if (target !== follower) { game.message(`${target.name} ignores you.`); return; }
    const lines = def?.talk || ['...'];
    game.ui.startDialogue([{ player: `Hello, ${target.name}!` }, { npc: lines[Math.floor(Math.random() * lines.length)] }], { npc: target });
  }, { range: 2 });

  // Petkeeper (her Talk-to dialogue lives in content/pets.js so other activities can intercept it first)
  I.onNpc('Reclaim', ['petkeeper_odessa'], ({ target }) => openPetHouse(target));

  // drops
  ev.on('npc:death', ({ npc, killer }) => {
    if (killer !== game.player || !npc?.def || npc.state?.petOf) return;
    roll({ npc: npc.id }, `killing ${npc.name}`);
  });
  ev.on('gathering:log', ({ player }) => { if (player === game.player) roll('gathering:log', 'woodcutting'); });
  ev.on('gathering:ore', ({ player }) => { if (player === game.player) roll('gathering:ore', 'mining'); });
  ev.on('gathering:fish', ({ player }) => { if (player === game.player) roll('gathering:fish', 'fishing'); });
  ev.on('minigame:reward', ({ id }) => roll(`minigame:${id}`, id === 'crucible' ? 'The Crucible' : "Wardens' Rest"));

  // pets are never hurt (stray spells, area attacks...)
  ev.on('damage:before', (e) => { if (e.target?.state?.petOf) e.amount = 0; });

  // following
  game.onTick(() => {
    const p = game.player;
    if (follower) {
      if (!game.npcs.has(follower.uid)) { follower = null; }
      else if (!p.dead) follow(follower, p);
    }
    // other players' pets
    for (const [peer, rec] of remotePets) {
      const rp = game.remotePlayers.get(peer);
      const want = rp?.extra?.pet;
      if (!rp || !want || want !== rec.id || !game.npcs.has(rec.npc.uid)) { game.removeNpc(rec.npc); remotePets.delete(peer); continue; }
      follow(rec.npc, rp);
    }
    for (const rp of game.remotePlayers.values()) {
      const want = rp.extra?.pet;
      if (!want || remotePets.has(rp.peerId) || !petDef(want)) continue;
      const npc = spawnPetNpc(want, rp, rp.peerId);
      if (npc) remotePets.set(rp.peerId, { id: want, npc });
    }
  }, 6);
  ev.on('remote:remove', ({ remote }) => {
    const rec = remotePets.get(remote.peerId);
    if (rec) { game.removeNpc(rec.npc); remotePets.delete(remote.peerId); }
  });
  ev.on('snapshot', ({ player, snap }) => { if (player === game.player) snap.pet = follower ? follower.def.pet : null; });

  // pets never take a left-click: their options sit below "Walk here"; other players' pets only examine
  ev.on('menu:entries', (e) => {
    const ents = e.entries;
    const isPet = (x) => x.entity?.type === 'npc' && x.entity.state?.petOf;
    if (!ents.some(isPet)) return;
    const keep = ents.filter((x) => !(isPet(x) && x.entity.state.petOf !== 'local' && x.option !== 'Examine'));
    const pets = keep.filter((x) => isPet(x) && x.option !== 'Examine');
    const rest = keep.filter((x) => !pets.includes(x));
    const wi = rest.findIndex((x) => x.option === 'Walk here');
    if (wi >= 0) rest.splice(wi + 1, 0, ...pets); else rest.push(...pets);
    e.entries = rest;
  });

  // restore the follower from the save
  const s = st();
  if (s.following && petDef(s.following)) summon(s.following);
  else s.following = null;

  game.pets = {
    award, summon, dismiss,
    follower: () => follower,
    owned: () => Object.keys(st().owned),
    all: () => allData('pets').map(([id, d]) => ({ id, name: d.name, owned: !!st().owned[id] })),
    openPetHouse,
  };
}
