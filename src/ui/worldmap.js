// World map: a full-screen map of the whole world (288x288) (button under the minimap, Alt+M, Esc closes).
// The base image is the minimap's terrain/scenery image (4 px per tile), split once into two cached layers:
// the surface ("Surface") and the sealed dungeon pockets ("Underground", every `dungeon: true` area).
// Drag / one-finger drag pans, wheel / pinch zooms, a click places a marker that shows as a flag on the
// minimap (click it again to remove it). Icons are derived from the live world (banks, shops, altars...)
// once, when the map is first opened.

import { allAreas, allData, getShop } from '../core/registry.js';
import { el, escapeHtml } from './util.js';

const PX = 4;              // base image pixels per tile (same as the minimap image)
const MIN_SCALE = 1.2;     // screen px per tile
const MAX_SCALE = 18;
// settlements whose names always win label placement
const MAP_TOWNS = new Set(['Brackenford', 'Highmarch', 'Durnhold', 'Ilvaren', 'Dustwatch', 'Gullhaven', 'Bogwick']);

// Icon categories, in drawing order (later = on top). `def: false` = hidden until ticked in the legend.
export const MAP_CATEGORIES = [
  { id: 'mining', label: 'Mining site', color: '#8a8478' },
  { id: 'fishing', label: 'Fishing spot', color: '#4a90c8' },
  { id: 'range', label: 'Cooking range', color: '#c86a3a' },
  { id: 'anvil', label: 'Anvil', color: '#9aa3ad' },
  { id: 'furnace', label: 'Furnace', color: '#ff8030' },
  { id: 'altar', label: 'Altar', color: '#e8e4f8' },
  { id: 'agility', label: 'Agility course', color: '#5ac8a0' },
  { id: 'slayer', label: 'Slayer master', color: '#c04040' },
  { id: 'shop', label: 'Shop', color: '#60c080' },
  { id: 'bank', label: 'Bank', color: '#e8c040' },
  { id: 'transport', label: 'Ladder, stairs or portal', color: '#b080e8' },
  { id: 'dungeon', label: 'Dungeon entrance / exit', color: '#a07850' },
  { id: 'quest', label: 'Quest start', color: '#60c0ff' },
];
const CAT = Object.fromEntries(MAP_CATEGORIES.map((c) => [c.id, c]));

/** Draw a category glyph (round badge + symbol) centred on (x, y) with radius r. Shared by map and legend. */
export function drawMapGlyph(ctx, cat, x, y, r) {
  const c = CAT[cat];
  if (!c) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, r + 1.2, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = c.color; ctx.fill();
  const s = r * 0.62;
  ctx.fillStyle = '#16120c'; ctx.strokeStyle = '#16120c';
  ctx.lineWidth = Math.max(1, r * 0.2); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const text = (t, k = 1.35) => {
    ctx.font = `bold ${Math.round(r * k)}px Verdana, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t, 0, r * 0.08);
  };
  const poly = (pts, fill = true) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s)));
    if (fill) { ctx.closePath(); ctx.fill(); } else ctx.stroke();
  };
  switch (cat) {
    case 'bank': text('$'); break;
    case 'quest': text('?'); break;
    case 'shop': // bag with a handle
      poly([[-0.8, -0.2], [0.8, -0.2], [0.65, 0.95], [-0.65, 0.95]]);
      ctx.beginPath(); ctx.arc(0, -0.25 * s, 0.45 * s, Math.PI, 0); ctx.stroke();
      break;
    case 'altar': // cross
      poly([[-0.22, -1], [0.22, -1], [0.22, -0.4], [0.75, -0.4], [0.75, 0.05], [0.22, 0.05], [0.22, 1], [-0.22, 1], [-0.22, 0.05], [-0.75, 0.05], [-0.75, -0.4], [-0.22, -0.4]]);
      break;
    case 'furnace': // flame
      ctx.beginPath();
      ctx.moveTo(0, -1 * s);
      ctx.bezierCurveTo(0.9 * s, -0.1 * s, 0.85 * s, 0.95 * s, 0, 0.95 * s);
      ctx.bezierCurveTo(-0.85 * s, 0.95 * s, -0.9 * s, 0.1 * s, -0.25 * s, -0.25 * s);
      ctx.bezierCurveTo(-0.1 * s, 0.1 * s, 0.1 * s, -0.4 * s, 0, -1 * s);
      ctx.fill();
      break;
    case 'anvil':
      poly([[-1, -0.55], [0.95, -0.55], [0.55, -0.1], [0.3, -0.1], [0.3, 0.35], [0.7, 0.85], [-0.7, 0.85], [-0.3, 0.35], [-0.3, -0.1], [-0.65, -0.1]]);
      break;
    case 'range': // cooking pot
      ctx.beginPath(); ctx.moveTo(-0.8 * s, -0.25 * s); ctx.lineTo(0.8 * s, -0.25 * s); ctx.arc(0, -0.25 * s, 0.8 * s, 0, Math.PI); ctx.fill();
      poly([[-1, -0.45], [1, -0.45]], false);
      break;
    case 'dungeon': // steps going down
      poly([[-0.95, -0.85], [-0.35, -0.85], [-0.35, -0.3], [0.2, -0.3], [0.2, 0.25], [0.8, 0.25], [0.8, 0.85], [-0.95, 0.85]]);
      break;
    case 'transport': // swirl ring
      ctx.beginPath(); ctx.arc(0, 0, 0.8 * s, 0.3, Math.PI * 1.75); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 0.3 * s, 0, Math.PI * 2); ctx.fill();
      break;
    case 'agility': // double chevron
      poly([[-0.9, -0.7], [-0.2, 0], [-0.9, 0.7]], false);
      poly([[0.0, -0.7], [0.7, 0], [0.0, 0.7]], false);
      break;
    case 'slayer': // skull
      ctx.beginPath(); ctx.arc(0, -0.15 * s, 0.75 * s, 0, Math.PI * 2); ctx.fill();
      poly([[-0.42, 0.35], [0.42, 0.35], [0.42, 0.95], [-0.42, 0.95]]);
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(-0.3 * s, -0.15 * s, 0.2 * s, 0, Math.PI * 2); ctx.arc(0.3 * s, -0.15 * s, 0.2 * s, 0, Math.PI * 2); ctx.fill();
      break;
    case 'mining': // pickaxe
      ctx.beginPath(); ctx.arc(0, 0.55 * s, 1.15 * s, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      poly([[0, -0.6], [0, 1]], false);
      break;
    case 'fishing': // fish
      ctx.beginPath(); ctx.ellipse(-0.15 * s, 0, 0.65 * s, 0.4 * s, 0, 0, Math.PI * 2); ctx.fill();
      poly([[0.4, 0], [1, -0.5], [1, 0.5]]);
      break;
    default: text('•');
  }
  ctx.restore();
}

export class WorldMap {
  constructor(ui) {
    this.ui = ui;
    this.game = ui.game;
    this.isOpen = false;
    this.layer = 'surface';
    this.view = { cx: 144, cy: 128, scale: 3 };
    this.layers = null;      // { surface: {canvas, box, labels}, underground: {...} }
    this.icons = null;       // [{cat, x, y, label, under}]
    this.pointers = new Map();
    this.buildDom();
    // the minimap gets a world-map button (bottom-left of the minimap ring, like the run orb's neighbours)
    const btn = el('button', 'wm-open', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5 8.5 3.5l7 2.5 5.5-2v14.5l-5.5 2-7-2.5L3 20Z"/><path d="M8.5 3.5v14.5M15.5 6v14.5" fill="none"/></svg>');
    btn.title = 'World map (Alt+M)';
    btn.setAttribute('aria-label', 'World map');
    btn.onclick = (e) => { e.stopPropagation(); this.toggle(); };
    ui.minimap?.wrap?.appendChild(btn);
    window.addEventListener('keydown', (e) => this.onKey(e), true);
    window.addEventListener('resize', () => { if (this.isOpen) this.resize(); });
    this.game.events.on('player:move', () => this.checkArrival());
    // systems spawn scenery during init: rebuild the cached layers if the minimap image is redrawn
    this.game.events.on('game:ready', () => { this.layers = null; this.icons = null; if (this.isOpen) this.draw(); });
  }

  // ---- persistent state (marker + hidden legend categories live in the save) --------------------
  get store() { return this.game.player.store('worldmap'); }
  get marker() { const m = this.store.marker; return m && Number.isFinite(m.x) && Number.isFinite(m.y) ? m : null; }
  setMarker(x, y) {
    this.store.marker = x == null ? null : { x, y };
    this.updateButtons();
  }
  hidden(cat) { return (this.store.hidden || []).includes(cat); }
  setHidden(cat, hide) {
    const h = new Set(this.store.hidden || []);
    if (hide) h.add(cat); else h.delete(cat);
    this.store.hidden = [...h];
  }

  checkArrival() {
    const m = this.marker, p = this.game.player;
    if (!m || Math.max(Math.abs(p.x - m.x), Math.abs(p.y - m.y)) > 1) return;
    this.setMarker(null);
    this.game.message('You have reached your map marker.');
    if (this.isOpen) this.draw();
  }

  // ---- DOM -------------------------------------------------------------------------------------
  buildDom() {
    const root = el('div', 'worldmap panel');
    root.style.display = 'none';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'World map');
    const head = el('div', 'wm-head');
    head.innerHTML = `
      <span class="wm-title">World Map</span>
      <span class="wm-layers"><button class="btn wm-layer" data-layer="surface">Surface</button><button class="btn wm-layer" data-layer="underground">Underground</button></span>
      <span class="wm-tools">
        <button class="btn wm-zoom" data-z="-1" title="Zoom out">&minus;</button><button class="btn wm-zoom" data-z="1" title="Zoom in">+</button>
        <button class="btn wm-me" title="Centre on your position">Find me</button>
        <button class="btn wm-clear" title="Remove your map marker">Clear marker</button>
        <button class="btn wm-legend-btn" title="Show or hide the key">Key</button>
      </span>
      <button class="iface-close wm-close" title="Close (Esc)">X</button>`;
    const body = el('div', 'wm-body');
    this.canvas = el('canvas', 'wm-canvas');
    this.legend = el('div', 'wm-legend');
    body.append(this.canvas, this.legend);
    this.status = el('div', 'wm-status');
    root.append(head, body, this.status);
    document.getElementById('game-root').appendChild(root);
    this.root = root;
    this.ctx = this.canvas.getContext('2d');

    head.querySelector('.wm-close').onclick = () => this.close();
    head.querySelectorAll('.wm-layer').forEach((b) => { b.onclick = () => this.setLayer(b.dataset.layer, true); });
    head.querySelectorAll('.wm-zoom').forEach((b) => { b.onclick = () => this.zoomAt(Number(b.dataset.z) > 0 ? 1.5 : 1 / 1.5); });
    head.querySelector('.wm-me').onclick = () => this.centreOnPlayer();
    this.clearBtn = head.querySelector('.wm-clear');
    this.clearBtn.onclick = () => { this.setMarker(null); this.draw(); };
    head.querySelector('.wm-legend-btn').onclick = () => { this.legend.classList.toggle('collapsed'); };
    if (window.innerWidth < 700) this.legend.classList.add('collapsed');

    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    c.addEventListener('pointermove', (e) => this.onPointerMove(e));
    c.addEventListener('pointerup', (e) => this.onPointerUp(e));
    c.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.drag = null; });
    c.addEventListener('pointerleave', () => { this.ui.hideTooltip(); if (!this.pointers.size) this.updateStatus(null); });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX, e.offsetY); }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    root.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  buildLegend() {
    this.legend.innerHTML = '<div class="wm-legend-title">Key</div>';
    for (const cat of MAP_CATEGORIES) {
      const row = el('label', 'wm-key');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !this.hidden(cat.id);
      cb.onchange = () => { this.setHidden(cat.id, !cb.checked); this.draw(); };
      const ic = el('canvas', 'wm-key-ic');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ic.width = 18 * dpr; ic.height = 18 * dpr;
      const ictx = ic.getContext('2d');
      ictx.scale(dpr, dpr);
      drawMapGlyph(ictx, cat.id, 9, 9, 7.5);
      row.append(cb, ic, el('span', '', escapeHtml(cat.label)));
      this.legend.appendChild(row);
    }
    const extra = el('div', 'wm-key-extra');
    extra.innerHTML = `
      <div><i class="wm-sw wm-sw-you"></i>You</div>
      <div><i class="wm-sw wm-sw-player"></i>Other players</div>
      <div><i class="wm-sw wm-sw-flag"></i>Your marker</div>
      <div><i class="wm-sw wm-sw-wild"></i>Wilderness (darker = higher level)</div>
      <div class="muted">Drag to pan, scroll or pinch to zoom. Click to place a marker; click it again to remove it.</div>`;
    this.legend.appendChild(extra);
  }

  // ---- open / close ----------------------------------------------------------------------------
  toggle() { if (this.isOpen) this.close(); else this.open(); }

  open() {
    if (this.isOpen) return;
    if (!this.game.started && !this.game.player) return;
    this.ui.menu?.hide?.();
    this.ensureBuilt();
    if (!this.legend.childElementCount) this.buildLegend();
    this.isOpen = true;
    this.root.style.display = '';
    const p = this.game.player;
    this.setLayer(this.isUnder(p.x, p.y) ? 'underground' : 'surface', false);
    this.resize();
    this.view.scale = Math.max(this.view.scale, 3);
    this.centreOnPlayer();
    this.updateButtons();
    this.game.events.emit('ui:open', { id: 'worldmap' });
    const loop = () => {
      if (!this.isOpen) return;
      // live markers (you / other players) move: redraw a few times a second
      const t = performance.now();
      if (this.dirty || t - (this.lastDraw || 0) > 250) this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    this.root.style.display = 'none';
    this.pointers.clear();
    this.drag = null;
    this.ui.hideTooltip();
    this.game.events.emit('ui:close', { id: 'worldmap' });
  }

  onKey(e) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') {
      e.preventDefault(); e.stopPropagation();
      this.toggle();
      return;
    }
    if (!this.isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); return; }
    const pan = 40 / this.view.scale;
    const k = { ArrowLeft: [-pan, 0], ArrowRight: [pan, 0], ArrowUp: [0, -pan], ArrowDown: [0, pan] }[e.key];
    if (k) { e.preventDefault(); e.stopPropagation(); this.view.cx += k[0]; this.view.cy += k[1]; this.clampView(); this.draw(); }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); e.stopPropagation(); this.zoomAt(1.5); }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); e.stopPropagation(); this.zoomAt(1 / 1.5); }
  }

  updateButtons() {
    if (!this.root) return;
    this.root.querySelectorAll('.wm-layer').forEach((b) => b.classList.toggle('active', b.dataset.layer === this.layer));
    if (this.clearBtn) this.clearBtn.disabled = !this.marker;
  }

  setLayer(layer, fit) {
    this.layer = layer;
    this.updateButtons();
    if (fit) {
      const p = this.game.player;
      if (this.isUnder(p.x, p.y) === (layer === 'underground')) this.centreOnPlayer();
      else this.fitBox(this.layers[layer].box);
    }
    this.draw();
  }

  // ---- cached layers & icons ---------------------------------------------------------------------
  isUnder(x, y) {
    const w = this.game.world;
    return !!this.underMask && w.inBounds(x, y) && this.underMask[w.idx(x, y)] === 1;
  }

  ensureBuilt() {
    const mm = this.ui.minimap;
    if (this.layers && this.baseSrc === mm.image) return;
    const w = this.game.world, W = w.width, H = w.height;
    // underground mask: every tile inside an area flagged `dungeon`
    const under = new Uint8Array(W * H);
    for (const a of allAreas()) {
      if (!a.dungeon) continue;
      for (let y = Math.max(0, a.y0); y <= Math.min(H - 1, a.y1); y++) for (let x = Math.max(0, a.x0); x <= Math.min(W - 1, a.x1); x++) under[y * W + x] = 1;
    }
    this.underMask = under;
    this.baseSrc = mm.image;
    const make = (wantUnder) => {
      const cv = document.createElement('canvas');
      cv.width = W * PX; cv.height = H * PX;
      const ctx = cv.getContext('2d', { willReadFrequently: false });
      ctx.drawImage(mm.image, 0, 0);
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const d = img.data;
      let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
      for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
        const mine = (under[ty * W + tx] === 1) === wantUnder;
        if (mine) {
          if (tx < bx0) bx0 = tx; if (tx > bx1) bx1 = tx; if (ty < by0) by0 = ty; if (ty > by1) by1 = ty;
          continue;
        }
        // other layer: very dark, faintly textured so the shape of the world is still readable
        for (let py = 0; py < PX; py++) {
          let o = ((ty * PX + py) * cv.width + tx * PX) * 4;
          for (let px = 0; px < PX; px++, o += 4) { d[o] = d[o] * 0.12 + 8; d[o + 1] = d[o + 1] * 0.12 + 7; d[o + 2] = d[o + 2] * 0.12 + 6; }
        }
      }
      ctx.putImageData(img, 0, 0);
      if (!wantUnder) {
        // Wilderness tint: a red wash that deepens every 10 levels
        for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
          if (under[ty * W + tx]) continue;
          const lv = w.getWildernessLevel(tx, ty);
          if (!lv) continue;
          ctx.fillStyle = `rgba(150, 10, 0, ${0.08 + 0.05 * Math.floor((lv - 1) / 10)})`;
          ctx.fillRect(tx * PX, ty * PX, PX, PX);
        }
      }
      const box = bx1 >= 0 ? { x0: bx0, y0: by0, x1: bx1, y1: by1 } : { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
      return { canvas: cv, box, labels: [] };
    };
    this.layers = { surface: make(false), underground: make(true) };
    // area labels per layer, biggest first (placement skips labels that would overlap a bigger one)
    const seen = new Map();
    for (const a of allAreas()) {
      if (!a.name || (a.priority ?? 0) < 0) continue; // the catch-all 'Ashvale' area would sit on Haverly and hide town names
      const cx = (a.x0 + a.x1 + 1) / 2, cy = (a.y0 + a.y1 + 1) / 2;
      const lay = this.isUnder(Math.floor(cx), Math.floor(cy)) ? 'underground' : 'surface';
      const size = (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1);
      const key = `${lay}:${a.name}`;
      if (seen.has(key) && seen.get(key).size >= size) continue;
      seen.set(key, { name: a.name, cx, cy, w: a.x1 - a.x0 + 1, h: a.y1 - a.y0 + 1, size, lay, wild: !lay.startsWith('u') && w.getWildernessLevel(Math.floor(cx), Math.floor(cy)) > 0 });
    }
    for (const l of seen.values()) this.layers[l.lay].labels.push(l);
    // towns are placed first so a neighbouring region (Thornwood) can never hide the starting town's name
    const rank = (l) => (MAP_TOWNS.has(l.name) ? 1e6 : 0) + l.size;
    for (const L of Object.values(this.layers)) L.labels.sort((a, b) => rank(b) - rank(a));
    this.icons = this.collectIcons();
  }

  /** Scan the world for map features once (objects, NPC spawns, registered data). */
  collectIcons() {
    const g = this.game, out = [];
    const add = (cat, x, y, label, cluster = 4) => {
      // de-duplicate: one icon per feature cluster (a row of bank booths, a mine full of rocks...)
      for (const o of out) if (o.cat === cat && Math.abs(o.x - x) <= cluster && Math.abs(o.y - y) <= cluster) { o.n = (o.n || 1) + 1; return; }
      out.push({ cat, x, y, label, under: this.isUnder(Math.floor(x), Math.floor(y)) });
    };
    const has = (opts, re) => (opts || []).some((o) => re.test(o));
    const agilityIds = new Set(allData('agility').map(([id]) => id));
    const agility = [];
    for (const o of g.objects.values()) {
      const d = o.def, t = d.model?.template || '', opts = d.options || [];
      const x = o.x + o.w / 2, y = o.y + o.h / 2;
      if (agilityIds.has(o.id)) { agility.push({ x, y }); continue; }
      if (has(opts, /^bank$/i) || /bank_booth|bank_chest/.test(t)) add('bank', x, y, d.name || 'Bank', 6);
      else if (t === 'altar' || has(opts, /^pray(-at)?$/i) || has(opts, /^bind/i)) add('altar', x, y, d.name || 'Altar', 3);
      else if (t === 'furnace' || has(opts, /^smelt$/i)) add('furnace', x, y, d.name || 'Furnace', 3);
      else if (t === 'anvil' || has(opts, /^smith$/i)) add('anvil', x, y, d.name || 'Anvil', 3);
      else if (t === 'range' || /range|oven|stove/i.test(o.id)) { if (has(opts, /cook/i) || t === 'range') add('range', x, y, d.name || 'Range', 3); }
      else if (has(opts, /^mine$/i)) add('mining', x, y, 'Mining site', 8);
      else if (t === 'fishing_spot') add('fishing', x, y, 'Fishing spot', 8);
      if (d.teleport && Number.isFinite(d.teleport.x)) {
        const fromUnder = this.isUnder(o.x, o.y), toUnder = this.isUnder(d.teleport.x, d.teleport.y);
        const verb = opts[0] ? `${opts[0]}: ` : '';
        if (fromUnder !== toUnder) add('dungeon', x, y, `${verb}${d.name}${toUnder ? ' (to the underground)' : ' (to the surface)'}`, 2);
        else add('transport', x, y, `${verb}${d.name}`, 2);
      } else if (t === 'portal' || /portal/i.test(o.id)) add('transport', x, y, d.name || 'Portal', 2);
    }
    // agility: one icon per course (obstacles within ~16 tiles of each other)
    const courses = [];
    for (const a of agility) {
      const c = courses.find((k) => Math.abs(k.x / k.n - a.x) < 16 && Math.abs(k.y / k.n - a.y) < 16);
      if (c) { c.x += a.x; c.y += a.y; c.n++; } else courses.push({ x: a.x, y: a.y, n: 1 });
    }
    for (const c of courses) if (c.n >= 2) add('agility', c.x / c.n, c.y / c.n, 'Agility course', 0);
    const slayer = new Map(allData('slayer_master'));
    for (const n of g.npcs.values()) {
      const d = n.def, opts = d.options || [];
      const x = n.spawnX + (n.size || 1) / 2, y = n.spawnY + (n.size || 1) / 2;
      if (slayer.has(n.id)) add('slayer', x, y, `Slayer master: ${d.name}`, 0);
      if (d.mapIcon?.char === '?') add('quest', x, y, `Quest: ${d.name}`, 0);
      if (has(opts, /^bank$/i)) add('bank', x, y, 'Bank', 6);
      else if (d.shop || has(opts, /^trade$/i)) add('shop', x, y, d.shop && getShop(d.shop)?.name ? getShop(d.shop).name : `Shop: ${d.name}`, 1);
    }
    for (const o of out) if (o.n > 1 && o.cat === 'bank') o.label = 'Bank';
    return out;
  }

  // ---- view ----------------------------------------------------------------------------------------
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = Math.max(50, r.width); this.cssH = Math.max(50, r.height);
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.dpr = dpr;
    this.clampView();
    this.draw();
  }

  clampView() {
    const v = this.view, w = this.game.world;
    v.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale));
    v.cx = Math.max(0, Math.min(w.width, v.cx));
    v.cy = Math.max(0, Math.min(w.height, v.cy));
  }

  fitBox(b) {
    const v = this.view;
    const bw = b.x1 - b.x0 + 3, bh = b.y1 - b.y0 + 3;
    v.scale = Math.min((this.cssW || 800) / bw, (this.cssH || 600) / bh);
    v.cx = (b.x0 + b.x1 + 1) / 2; v.cy = (b.y0 + b.y1 + 1) / 2;
    this.clampView();
  }

  centreOnPlayer() {
    const p = this.game.player;
    this.view.cx = p.x + 0.5; this.view.cy = p.y + 0.5;
    this.clampView();
    this.draw();
  }

  zoomAt(f, sx = (this.cssW || 0) / 2, sy = (this.cssH || 0) / 2) {
    const v = this.view;
    const [tx, ty] = this.toTile(sx, sy);
    v.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * f));
    // keep the tile under the cursor fixed
    v.cx = tx - (sx - this.cssW / 2) / v.scale;
    v.cy = ty - (sy - this.cssH / 2) / v.scale;
    this.clampView();
    this.draw();
  }

  toScreen(tx, ty) { const v = this.view; return [(tx - v.cx) * v.scale + this.cssW / 2, (ty - v.cy) * v.scale + this.cssH / 2]; }
  toTile(sx, sy) { const v = this.view; return [(sx - this.cssW / 2) / v.scale + v.cx, (sy - this.cssH / 2) / v.scale + v.cy]; }

  // ---- pointer input (mouse + touch: drag pans, pinch zooms, tap/click places the marker) ----------
  onPointerDown(e) {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (this.pointers.size === 1) this.drag = { x: e.offsetX, y: e.offsetY, cx: this.view.cx, cy: this.view.cy, moved: false, button: e.button };
    else { this.drag = null; this.pinch = this.pinchState(); }
  }

  pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  onPointerMove(e) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (this.pointers.size >= 2 && this.pinch) {
      const cur = this.pinchState();
      this.zoomAt(cur.d / this.pinch.d, cur.mx, cur.my);
      // pan with the midpoint too
      this.view.cx -= (cur.mx - this.pinch.mx) / this.view.scale;
      this.view.cy -= (cur.my - this.pinch.my) / this.view.scale;
      this.clampView();
      this.pinch = cur;
      return;
    }
    const d = this.drag;
    if (d) {
      const dx = e.offsetX - d.x, dy = e.offsetY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 5) d.moved = true;
      if (d.moved) {
        this.view.cx = d.cx - dx / this.view.scale;
        this.view.cy = d.cy - dy / this.view.scale;
        this.clampView();
        this.dirty = true;
      }
      return;
    }
    this.onHover(e.offsetX, e.offsetY, e.clientX, e.clientY);
  }

  onPointerUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    const d = this.drag;
    this.drag = null;
    if (!d || d.moved || this.pointers.size) return;
    if (d.button !== 0 && e.pointerType === 'mouse') return;
    this.clickAt(e.offsetX, e.offsetY);
  }

  clickAt(sx, sy) {
    const [fx, fy] = this.toTile(sx, sy);
    const tx = Math.floor(fx), ty = Math.floor(fy);
    const w = this.game.world;
    const m = this.marker;
    if (m) {
      const [mx, my] = this.toScreen(m.x + 0.5, m.y + 0.5);
      if (Math.hypot(mx - sx, my - sy) < 12 || (m.x === tx && m.y === ty)) { this.setMarker(null); this.draw(); return; }
    }
    if (!w.inBounds(tx, ty)) return;
    this.setMarker(tx, ty);
    this.game.message('You place a marker on your map. It shows as a flag on the minimap.');
    this.draw();
  }

  iconAt(sx, sy) {
    let best = null, bd = Infinity;
    for (const ic of this.visibleIcons || []) {
      const d = Math.hypot(ic.sx - sx, ic.sy - sy);
      if (d <= ic.r + 2 && d < bd) { best = ic; bd = d; }
    }
    return best;
  }

  onHover(sx, sy, cx, cy) {
    const ic = this.iconAt(sx, sy);
    if (ic) this.ui.showTooltip(cx, cy, escapeHtml(ic.label));
    else this.ui.hideTooltip();
    const [fx, fy] = this.toTile(sx, sy);
    this.updateStatus([Math.floor(fx), Math.floor(fy)]);
  }

  updateStatus(tile) {
    const w = this.game.world;
    let txt = 'Drag to move the map, scroll or pinch to zoom, click to place a marker.';
    if (tile && w.inBounds(tile[0], tile[1])) {
      const [x, y] = tile;
      const under = this.isUnder(x, y);
      if (under === (this.layer === 'underground')) {
        const name = w.getAreaName(x, y);
        const wl = w.getWildernessLevel(x, y);
        txt = `${name ? escapeHtml(name) + ' &middot; ' : ''}${x}, ${y}${wl ? ` &middot; <span class="wm-wild">Wilderness level ${wl}</span>` : ''}`;
      }
    }
    if (this.status.innerHTML !== txt) this.status.innerHTML = txt;
  }

  // ---- drawing -----------------------------------------------------------------------------------
  draw() {
    if (!this.isOpen || !this.layers || !this.cssW) return;
    this.dirty = false;
    this.lastDraw = performance.now();
    const ctx = this.ctx, v = this.view, g = this.game, w = g.world;
    const L = this.layers[this.layer];
    const under = this.layer === 'underground';
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0d0b09';
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    const [ox, oy] = this.toScreen(0, 0);
    ctx.imageSmoothingEnabled = v.scale < PX;
    ctx.drawImage(L.canvas, ox, oy, w.width * v.scale, w.height * v.scale);
    ctx.imageSmoothingEnabled = true;

    // Wilderness level bands
    if (!under) {
      const edge = w.cfg.wildernessEdgeY ?? 48;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.font = 'bold 11px Verdana, sans-serif';
      ctx.textBaseline = 'bottom';
      const lx = Math.max(ox + 6, 6), rx = Math.min(ox + w.width * v.scale, this.cssW);
      for (const lv of [1, 10, 20, 30, 40]) {
        const yy = edge - lv + 1; // bottom edge of the first row at this level
        const [, sy] = this.toScreen(0, yy);
        if (sy < -10 || sy > this.cssH + 10) continue;
        ctx.strokeStyle = lv === 1 ? 'rgba(255,60,40,0.9)' : 'rgba(255,90,60,0.55)';
        ctx.lineWidth = lv === 1 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(Math.max(ox, 0), sy); ctx.lineTo(rx, sy); ctx.stroke();
        const t = lv === 1 ? 'Wilderness' : `Level ${lv}+`;
        ctx.fillStyle = '#000'; ctx.fillText(t, lx + 1, sy - 2 + 1);
        ctx.fillStyle = '#ff7a5a'; ctx.fillText(t, lx, sy - 2);
      }
      ctx.restore();
    }

    // icons
    const vis = [];
    const r = Math.max(5, Math.min(9, v.scale * 1.6));
    for (const cat of MAP_CATEGORIES) {
      if (this.hidden(cat.id)) continue;
      const placed = [];
      for (const ic of this.icons) {
        if (ic.cat !== cat.id || ic.under !== under) continue;
        const [sx, sy] = this.toScreen(ic.x, ic.y);
        if (sx < -r || sy < -r || sx > this.cssW + r || sy > this.cssH + r) continue;
        if (placed.some((p) => Math.abs(p[0] - sx) < r * 1.6 && Math.abs(p[1] - sy) < r * 1.6)) continue; // declutter when zoomed out
        placed.push([sx, sy]);
        drawMapGlyph(ctx, cat.id, sx, sy, r);
        vis.push({ sx, sy, r, label: ic.label });
      }
    }
    this.visibleIcons = vis;

    // area names (biggest first, skip overlaps)
    const boxes = [];
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const a of L.labels) {
      const sw = a.w * v.scale, sh = a.h * v.scale;
      const big = a.size >= 900;
      const fs = Math.round(Math.max(10, Math.min(big ? 17 : 13, Math.sqrt(sw * sh) / 7)));
      ctx.font = `${big ? 'bold ' : ''}${fs}px ${big ? 'Georgia, serif' : 'Verdana, sans-serif'}`;
      const tw = ctx.measureText(a.name).width;
      if (sw < tw * 0.55 && v.scale < 7) continue; // too small at this zoom
      const [sx, sy] = this.toScreen(a.cx, a.cy);
      if (sx + tw / 2 < 0 || sx - tw / 2 > this.cssW || sy < -fs || sy > this.cssH + fs) continue;
      const box = [sx - tw / 2 - 3, sy - fs / 2 - 2, sx + tw / 2 + 3, sy + fs / 2 + 2];
      if (boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      boxes.push(box);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(a.name, sx, sy);
      ctx.fillStyle = a.wild ? '#ffb090' : big ? '#ffde72' : '#ffffff';
      ctx.fillText(a.name, sx, sy);
    }
    ctx.restore();

    // other players
    ctx.save();
    ctx.font = '11px Verdana, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const rp of g.remotePlayers.values()) {
      if (this.isUnder(rp.x, rp.y) !== under) continue;
      const [sx, sy] = this.toScreen(rp.x + 0.5, rp.y + 0.5);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, 7); ctx.fill();
      if (rp.name) {
        ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(rp.name, sx, sy - 6);
        ctx.fillStyle = '#ffffff'; ctx.fillText(rp.name, sx, sy - 6);
      }
    }
    ctx.restore();

    // marker flag
    const m = this.marker;
    if (m && this.isUnder(m.x, m.y) === under) {
      const [sx, sy] = this.toScreen(m.x + 0.5, m.y + 0.5);
      drawFlag(ctx, sx, sy, 1.6, '#ffd21f');
    }

    // you are here (pulsing ring + arrow)
    const p = g.player;
    if (this.isUnder(p.x, p.y) === under) {
      const pv = g.renderer?.viewFor?.(p);
      const px = pv ? pv.pos.x : p.x + 0.5, py = pv ? pv.pos.z : p.y + 0.5;
      const [sx, sy] = this.toScreen(px, py);
      const t = (performance.now() % 1400) / 1400;
      ctx.strokeStyle = `rgba(255,255,255,${1 - t})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 6 + t * 14, 0, 7); ctx.stroke();
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.PI - (p.faceAngle || 0));
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else {
      // the player is on the other layer: say so
      ctx.font = '12px Verdana, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = '#000'; ctx.fillText(`You are ${under ? 'on the surface' : 'underground'}.`, 9, 9);
      ctx.fillStyle = '#ffde72'; ctx.fillText(`You are ${under ? 'on the surface' : 'underground'}.`, 8, 8);
    }
    if (!this.status.innerHTML) this.updateStatus(null);
  }
}

/** Little flag (pole + pennant) with its foot at (x, y). Also used by the minimap for the map marker. */
export function drawFlag(ctx, x, y, k = 1, color = '#ffd21f') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = '#000';
  ctx.fillRect(-1.2, -10.5, 2.6, 11);
  ctx.beginPath(); ctx.moveTo(0.5, -11); ctx.lineTo(8.5, -8); ctx.lineTo(0.5, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-0.5, -10, 1.2, 10);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(1, -10); ctx.lineTo(7, -7.8); ctx.lineTo(1, -5); ctx.closePath(); ctx.fill();
  ctx.restore();
}
