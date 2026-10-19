// Minimap (rotates with the camera), compass and status orbs (HP / Prayer / Run / Special).

import { TERRAIN_TYPES } from '../world/terrain.js';
import { tileRand } from '../core/rng.js';
import { MAX_RUN_ENERGY } from '../core/constants.js';
import { el } from './util.js';

const S = 4;          // pixels per tile in the minimap image
const SIZE = 164;     // minimap canvas size (css px)

// Small inline-SVG icons drawn over each status orb (24×24 viewBox).
const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ORB_GLYPHS = {
  // heart
  hp: svg('<path d="M12 20.5 4.2 13A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 7.8 6.4Z"/>'),
  // radiant star (devotion)
  prayer: svg('<path d="M12 2.5l1.9 5.6 5.7-1.9-3.4 4.8 4.3 3-5.6.6.1 5.9L12 16.3l-3 4.2.1-5.9-5.6-.6 4.3-3-3.4-4.8 5.7 1.9Z"/>'),
  // boot
  run: svg('<path d="M8 3.5h6l-.6 8.2 5.1 2.3c1.5.7 2 1.7 2 3.2V19H4.2l.6-3.1L8 13.2Z"/><path d="M4 20.5h17" stroke-width="1.6" fill="none"/>'),
  // sword
  spec: svg('<path d="M18.7 3.3h2v2L10.4 15.6 8.4 13.6Z"/><path d="M5.6 12.8l5.6 5.6-1.4 1.4-1.8-1.8-2.9 2.9-1.4-1.4 2.9-2.9-1.8-1.8Z"/>'),
};

// How scenery shows on the minimap. Object defs may override with `minimap: '#rrggbb' | 'wall' | 'tree' |
// 'rock' | 'bush' | 'fence' | 'door' | 'block' | false`.
const KIND_BY_TEMPLATE = {
  wall: 'wall', stone_wall_low: 'wall', dec_ruined_wall: 'wall', dec_turret: 'wall', dec_cliff: 'rock',
  fence: 'fence', dec_palisade: 'fence', dec_iron_fence: 'fence', dec_hedge: 'bush',
  door: 'door',
  tree: 'tree', dec_decor_tree: 'tree', dec_palm: 'tree', stump: false,
  bush: 'bush', dec_cactus: 'bush', dec_dead_bush: false,
  rock: 'rock', ore_rock: 'rock', boulder: 'rock', essence_rock: 'rock', clay_deposit: 'rock', dec_rock_cluster: 'rock',
  standing_stone: 'rock', dec_standing_stone: 'rock', dec_stalagmite: 'rock', dec_lava_rock: 'rock', dec_obsidian_spike: 'rock',
  dec_ice_spike: 'rock', dec_crystal: 'rock', dec_dolmen: 'rock', pillar: 'rock',
  fishing_spot: false, ditch: false,
};
function minimapKind(def) {
  if (def.minimap !== undefined) return def.minimap;
  const t = def.model?.template;
  if (t && Object.prototype.hasOwnProperty.call(KIND_BY_TEMPLATE, t)) return KIND_BY_TEMPLATE[t];
  if (t && /tree|pine/.test(t)) return 'tree';
  if (t && /rock|boulder|crag|stalag/.test(t)) return 'rock';
  return def.blocks ? 'block' : false;
}

export class Minimap {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    const root = document.getElementById('hud-topright');
    root.innerHTML = '';
    this.wrap = el('div', 'minimap-wrap');
    this.canvas = el('canvas', 'minimap');
    this.canvas.width = SIZE; this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.compass = el('div', 'compass', '<div class="compass-needle"><span>N</span></div>');
    this.compass.title = 'Face north';
    this.compass.onclick = () => this.game.renderer.cameraCtl.resetNorth();
    this.wrap.append(this.canvas, this.compass);
    this.orbs = {};
    const orbDefs = [['hp', 'Hitpoints'], ['prayer', 'Prayer'], ['run', 'Run energy (click or Alt+R to toggle)'], ['spec', 'Special attack']];
    const orbCol = el('div', 'orbs');
    for (const [id, title] of orbDefs) {
      const o = el('div', `orb orb-${id}`, `<div class="orb-num"></div><div class="orb-ball"><div class="orb-fill"></div><div class="orb-glyph">${ORB_GLYPHS[id]}</div></div>`);
      o.title = title;
      orbCol.appendChild(o);
      this.orbs[id] = { root: o, num: o.querySelector('.orb-num'), fill: o.querySelector('.orb-fill') };
    }
    this.orbs.run.root.onclick = () => this.game.toggleRun();
    this.orbs.prayer.root.onclick = () => this.ui.selectTab('prayer');
    this.orbs.spec.root.onclick = () => this.game.events.emit('ui:special', { handled: false });
    root.append(orbCol, this.wrap);

    this.canvas.addEventListener('mousedown', (e) => this.onClick(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.buildImage();
    // systems spawn more scenery during init (runtime mine rocks, construction...): redraw once the game is up
    this.game.events.on('game:ready', () => this.buildImage());
  }

  buildImage() {
    const w = this.game.world;
    const cv = document.createElement('canvas');
    cv.width = w.width * S; cv.height = w.height * S;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) {
      const t = TERRAIN_TYPES[w.terrain[w.idx(x, y)]];
      ctx.fillStyle = t.minimap;
      ctx.globalAlpha = 1;
      ctx.fillRect(x * S, y * S, S, S);
      const n = tileRand(x, y, 3);
      if (n > 0.5) { ctx.globalAlpha = (n - 0.5) * 0.25; ctx.fillStyle = '#000'; ctx.fillRect(x * S, y * S, S, S); }
    }
    ctx.globalAlpha = 1;
    this.icons = [];
    for (const o of this.game.objects.values()) {
      const kind = minimapKind(o.def);
      const px = o.x * S, py = o.y * S;
      if (typeof kind === 'string' && kind.startsWith('#')) { ctx.fillStyle = kind; ctx.fillRect(px, py, o.w * S, o.h * S); }
      else if (kind === 'wall') { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(px, py, o.w * S, o.h * S); }
      else if (kind === 'fence') { ctx.fillStyle = '#c8b89a'; ctx.fillRect(px, py, o.w * S, o.h * S); }
      else if (kind === 'door') { ctx.fillStyle = '#c03020'; ctx.fillRect(px, py, o.w * S, o.h * S); }
      else if (kind === 'tree') { ctx.fillStyle = '#1e4a18'; ctx.beginPath(); ctx.arc(px + (o.w * S) / 2, py + (o.h * S) / 2, S * 0.8 * o.w, 0, 7); ctx.fill(); }
      else if (kind === 'bush') { ctx.fillStyle = '#2c5a22'; ctx.beginPath(); ctx.arc(px + (o.w * S) / 2, py + (o.h * S) / 2, S * 0.45 * o.w, 0, 7); ctx.fill(); }
      else if (kind === 'rock') { ctx.fillStyle = '#5a564e'; ctx.fillRect(px + 0.5, py + 0.5, o.w * S - 1, o.h * S - 1); ctx.fillStyle = '#9a9488'; ctx.fillRect(px + 1, py + 1, o.w * S - 2.5, o.h * S - 2.5); }
      else if (kind === 'block') { ctx.fillStyle = 'rgba(40,30,20,0.4)'; ctx.fillRect(px, py, o.w * S, o.h * S); }
      if (o.def.mapIcon) this.icons.push({ x: o.x + o.w / 2, y: o.y + o.h / 2, ...o.def.mapIcon });
    }
    for (const n of this.game.npcs.values()) if (n.def.mapIcon) this.icons.push({ x: n.spawnX + 0.5, y: n.spawnY + 0.5, ...n.def.mapIcon });
    // de-duplicate icons that sit close together
    const kept = [];
    for (const ic of this.icons) if (!kept.some((k) => k.char === ic.char && Math.abs(k.x - ic.x) < 6 && Math.abs(k.y - ic.y) < 6)) kept.push(ic);
    this.icons = kept;
    this.image = cv;
  }

  onClick(e) {
    if (e.button !== 0) return;
    const r = this.canvas.getBoundingClientRect();
    const dx = (e.clientX - r.left) * (SIZE / r.width) - SIZE / 2, dy = (e.clientY - r.top) * (SIZE / r.height) - SIZE / 2;
    if (dx * dx + dy * dy > (SIZE / 2) ** 2) return;
    const yaw = this.game.renderer.cameraCtl.yaw;
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    const mx = dx * c - dy * s, my = dx * s + dy * c;
    const pv = this.game.renderer.viewFor(this.game.player);
    const tx = Math.floor(pv.pos.x + mx / S), ty = Math.floor(pv.pos.z + my / S);
    this.ui.closeInterfaces();
    this.game.walkTo(this.game.player, tx, ty);
  }

  draw() {
    const g = this.game, ctx = this.ctx;
    const pv = g.renderer.viewFor(g.player);
    if (!pv) return;
    const px = pv.pos.x, py = pv.pos.z;
    const yaw = g.renderer.cameraCtl.yaw;
    ctx.save();
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.beginPath(); ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(yaw);
    ctx.drawImage(this.image, -px * S, -py * S);
    const dot = (x, y, col, r = 2) => { ctx.fillStyle = '#000'; ctx.fillRect((x - px) * S - r - 0.5, (y - py) * S - r - 0.5, r * 2 + 1, r * 2 + 1); ctx.fillStyle = col; ctx.fillRect((x - px) * S - r, (y - py) * S - r, r * 2, r * 2); };
    const range = 30;
    for (const gi of g.groundItems.values()) if (Math.abs(gi.x - px) < range && Math.abs(gi.y - py) < range && g.canSeeGroundItem(gi)) dot(gi.x + 0.5, gi.y + 0.5, '#ff2020', 1.5);
    for (const n of g.npcs.values()) {
      if (n.dead || n.hidden || Math.abs(n.x - px) > range || Math.abs(n.y - py) > range) continue;
      const v = g.renderer.viewFor(n);
      const [nx, ny] = v && v.group.visible ? [v.pos.x, v.pos.z] : [n.x + n.size / 2, n.y + n.size / 2];
      dot(nx, ny, '#ffff20', 1.6);
    }
    for (const r of g.remotePlayers.values()) { const v = g.renderer.viewFor(r); if (v) dot(v.pos.x, v.pos.z, '#ffffff', 1.8); }
    const dest = g.player.destination;
    if (dest) {
      const fx = (dest.x + 0.5 - px) * S, fy = (dest.y + 0.5 - py) * S;
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(fx - 0.5, fy - 9, 1.5, 9);
      ctx.fillStyle = '#e02020'; ctx.beginPath(); ctx.moveTo(fx + 1, fy - 9); ctx.lineTo(fx + 7, fy - 7); ctx.lineTo(fx + 1, fy - 4.5); ctx.fill();
    }
    // map icons (kept upright)
    for (const ic of this.icons) {
      const ix = (ic.x - px) * S, iy = (ic.y - py) * S;
      if (Math.abs(ix) > SIZE || Math.abs(iy) > SIZE) continue;
      ctx.save(); ctx.translate(ix, iy); ctx.rotate(-yaw);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
      ctx.fillStyle = ic.color || '#e8c040'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ic.char || '?', 0, 0.5);
      ctx.restore();
    }
    ctx.restore();
    // local player (always centre, upright)
    ctx.fillStyle = '#fff'; ctx.fillRect(SIZE / 2 - 2, SIZE / 2 - 2, 4, 4);
    this.compass.firstChild.style.transform = `rotate(${yaw}rad)`;
    this.updateOrbs();
  }

  updateOrbs() {
    const p = this.game.player;
    const set = (id, cur, max, text) => {
      const o = this.orbs[id];
      const pct = Math.max(0, Math.min(1, cur / Math.max(1, max)));
      const t = String(text ?? cur);
      if (o.num.textContent !== t) o.num.textContent = t;
      o.fill.style.height = `${(pct * 100).toFixed(1)}%`;
      o.num.style.color = pct > 0.75 ? '#00ff00' : pct > 0.5 ? '#ffff00' : pct > 0.25 ? '#ff9800' : '#ff0000';
    };
    set('hp', p.hp, p.maxHp);
    set('prayer', p.skills.getCurrent('prayer'), p.skills.getLevel('prayer'));
    set('run', p.runEnergy, MAX_RUN_ENERGY, Math.floor(p.runEnergy / 100));
    set('spec', p.specialEnergy, 100);
    this.orbs.run.root.classList.toggle('on', !!p.runToggled);
    this.orbs.prayer.root.classList.toggle('on', p.activePrayers.size > 0);
  }
}
