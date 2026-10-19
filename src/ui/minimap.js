// Minimap (rotates with the camera), compass and status orbs (HP / Prayer / Run / Special).

import { TERRAIN_TYPES } from '../world/terrain.js';
import { tileRand } from '../core/rng.js';
import { MAX_RUN_ENERGY } from '../core/constants.js';
import { el } from './util.js';

const S = 4;          // pixels per tile in the minimap image
const SIZE = 164;     // minimap canvas size (css px)

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
    const orbDefs = [['hp', 'Hitpoints'], ['prayer', 'Prayer'], ['run', 'Run energy'], ['spec', 'Special attack']];
    const orbCol = el('div', 'orbs');
    for (const [id, title] of orbDefs) {
      const o = el('div', `orb orb-${id}`, '<div class="orb-num"></div><div class="orb-ball"><div class="orb-fill"></div><div class="orb-glyph"></div></div>');
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
      const m = o.def.model?.template;
      const px = o.x * S, py = o.y * S;
      if (m === 'wall' || m === 'fence' || m === 'stone_wall_low') { ctx.fillStyle = m === 'fence' ? '#c8b89a' : '#e8e8e8'; ctx.fillRect(px, py, o.w * S, o.h * S); }
      else if (m === 'door') { ctx.fillStyle = '#c03020'; ctx.fillRect(px, py, o.w * S, o.h * S); }
      else if (m === 'tree') { ctx.fillStyle = '#1e4a18'; ctx.beginPath(); ctx.arc(px + (o.w * S) / 2, py + (o.h * S) / 2, S * 0.8 * o.w, 0, 7); ctx.fill(); }
      else if (m === 'rock' || m === 'boulder') { ctx.fillStyle = '#8a8478'; ctx.fillRect(px + 1, py + 1, S - 2, S - 2); }
      else if (o.blocks) { ctx.fillStyle = 'rgba(40,30,20,0.55)'; ctx.fillRect(px, py, o.w * S, o.h * S); }
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
