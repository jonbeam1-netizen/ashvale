// Scenery templates + icon shapes used by production content (agent C).
// Imported from recipes.js. Keeps all art for crafting stations, altars and homestead furniture.

import * as THREE from 'three';
import { registerSceneryTemplate } from '../render/models.js';
import { registerIconShape } from '../ui/icons.js';

const shade = (hex, f) => { const c = new THREE.Color(hex); if (f > 1) c.lerp(new THREE.Color('#ffffff'), Math.min(1, f - 1)); else c.multiplyScalar(f); return '#' + c.getHexString(); };
const WOOD = '#7a5530', DARKWOOD = '#5a3d24', STONE = '#8a857a';

// ------------------------------------------------------------------------------------------------
// Scenery
// ------------------------------------------------------------------------------------------------
registerSceneryTemplate('spinning_wheel', (b) => {
  b.box(WOOD, 0.7, 0.08, 0.3, [0, 0.35, 0]);
  for (const [x, z] of [[-0.3, -0.1], [0.3, -0.1], [-0.3, 0.1], [0.3, 0.1]]) b.box(DARKWOOD, 0.06, 0.35, 0.06, [x, 0.17, z]);
  b.add(new THREE.TorusGeometry(0.32, 0.03, 4, 14), DARKWOOD, [0.1, 0.78, 0], [0, Math.PI / 2, 0]);
  for (let i = 0; i < 4; i++) b.box(WOOD, 0.02, 0.6, 0.02, [0.1, 0.78, 0], [i * Math.PI / 4, 0, 0]);
  b.box(DARKWOOD, 0.05, 0.45, 0.05, [0.1, 0.55, 0]);
  b.cyl('#e8dcb0', 0.06, 0.06, 0.2, 6, [-0.28, 0.55, 0], [0, 0, Math.PI / 2]);
  b.box(DARKWOOD, 0.05, 0.2, 0.05, [-0.28, 0.45, 0]);
});

registerSceneryTemplate('potters_wheel', (b) => {
  b.box(WOOD, 0.8, 0.45, 0.6, [0, 0.22, 0]);
  b.cyl('#6a6058', 0.28, 0.3, 0.06, 12, [0, 0.5, 0]);
  b.cyl('#a8643a', 0.12, 0.16, 0.18, 8, [0, 0.62, 0]);
  b.box(DARKWOOD, 0.3, 0.06, 0.3, [0, 0.08, 0.4]);
});

registerSceneryTemplate('pottery_oven', (b) => {
  b.cyl('#9a5a3a', 0.55, 0.65, 0.9, 8, [0, 0.45, 0], [0, 0, 0], 0.12);
  b.sphere('#9a5a3a', 0.55, [0, 0.9, 0], [1, 0.7, 1], 0);
  b.box('#1a1010', 0.4, 0.35, 0.1, [0, 0.35, 0.6], [0, 0, 0], 0);
  b.box('#ff7a20', 0.3, 0.2, 0.06, [0, 0.3, 0.62], [0, 0, 0], 0.05);
  b.cyl('#6e4a32', 0.12, 0.14, 0.5, 6, [0.25, 1.35, -0.1]);
});

registerSceneryTemplate('tanning_rack', (b) => {
  for (const x of [-0.5, 0.5]) b.box(DARKWOOD, 0.08, 1.4, 0.08, [x, 0.7, 0]);
  b.box(DARKWOOD, 1.1, 0.07, 0.07, [0, 1.35, 0]);
  b.box(DARKWOOD, 1.1, 0.07, 0.07, [0, 0.25, 0]);
  b.box('#a8784a', 0.85, 0.95, 0.03, [0, 0.8, 0], [0, 0, 0], 0.1);
  b.box('#8a5a3a', 0.5, 0.5, 0.03, [0, 0.8, 0.02], [0, 0, 0.3], 0.1);
});

registerSceneryTemplate('sigil_altar', (b, p) => {
  const c = p.glow || '#e8f4ff';
  b.cyl('#6e6860', 0.95, 1.05, 0.25, 8, [0, 0.12, 0], [0, 0, 0], 0.12);
  b.box('#8a847a', 1.1, 0.6, 0.7, [0, 0.55, 0], [0, 0, 0], 0.1);
  b.box('#a8a296', 1.2, 0.08, 0.8, [0, 0.88, 0]);
  b.dodeca(c, 0.22, [0, 1.25, 0], [0.8, 1.4, 0.8], [0.3, 0.6, 0], 0.02);
  b.box(c, 0.35, 0.35, 0.02, [0, 0.55, 0.36], [0, 0, Math.PI / 4], 0);
});

registerSceneryTemplate('standing_stone', (b, p) => {
  const c = p.color || '#7a746a';
  b.box(c, 0.45, 1.6 + (p.tall || 0), 0.35, [0, 0.8, 0], [0, 0.2, 0.05], 0.15);
  if (p.glow) b.box(p.glow, 0.47, 0.12, 0.37, [0, 1.2, 0], [0, 0.2, 0.05], 0);
});

registerSceneryTemplate('sawmill', (b) => {
  b.box(WOOD, 1.8, 0.7, 0.8, [0, 0.35, 0]);
  b.box(DARKWOOD, 1.9, 0.08, 0.9, [0, 0.72, 0]);
  b.cyl('#b8bcc4', 0.32, 0.32, 0.03, 14, [0.2, 0.85, 0], [Math.PI / 2, 0, 0], 0.02);
  b.cyl('#6b4a2b', 0.18, 0.18, 1.2, 7, [-0.3, 0.92, 0], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 3; i++) b.cyl('#6b4a2b', 0.13, 0.13, 1.6, 6, [-0.1 + i * 0.05, 0.13 + i * 0.22, 0.75 - (i % 2) * 0.24], [0, 0, Math.PI / 2]);
  b.box('#d8b070', 0.9, 0.06, 0.25, [0.6, 0.12, -0.7]);
});

registerSceneryTemplate('log_pile', (b) => {
  for (let i = 0; i < 6; i++) {
    const row = i < 3 ? 0 : 1, k = i % 3;
    b.cyl('#6b4a2b', 0.14, 0.14, 0.9, 7, [0, 0.14 + row * 0.25, -0.28 + k * 0.28 + row * 0.14], [0, 0, Math.PI / 2]);
  }
});

registerSceneryTemplate('millstone', (b) => {
  b.cyl(STONE, 0.55, 0.6, 0.35, 12, [0, 0.17, 0]);
  b.cyl('#a8a296', 0.45, 0.45, 0.2, 12, [0, 0.45, 0]);
  b.box(DARKWOOD, 0.9, 0.06, 0.06, [0, 0.6, 0]);
  b.box(WOOD, 0.3, 0.35, 0.3, [0, 0.75, 0], [0, 0.6, 0]);
});

registerSceneryTemplate('crop', (b, p) => {
  const c = p.color || '#d8b850', h = p.height || 0.7;
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, r = 0.12 + (i % 3) * 0.1;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    b.box(shade(c, 0.8), 0.03, h, 0.03, [x, h / 2, z], [0.08 * Math.cos(a), 0, 0.08 * Math.sin(a)], 0.1);
    if (p.head) b.box(p.head, 0.06, 0.16, 0.06, [x, h + 0.05, z]);
    if (p.flower) b.sphere(p.flower, 0.05, [x, h + 0.02, z]);
  }
});

registerSceneryTemplate('clay_deposit', (b) => {
  b.dodeca('#a8643a', 0.45, [0, 0.1, 0], [1.2, 0.45, 1.0]);
  b.dodeca('#c07a48', 0.25, [0.25, 0.2, 0.15], [1, 0.6, 1]);
  b.dodeca('#8a5030', 0.2, [-0.3, 0.12, -0.15], [1, 0.6, 1]);
});

registerSceneryTemplate('water_pump', (b) => {
  b.box(STONE, 0.7, 0.3, 0.5, [0, 0.15, 0.15]);
  b.box('#3a4a5a', 0.5, 0.06, 0.35, [0, 0.31, 0.15], [0, 0, 0], 0.02);
  b.cyl('#4a4b52', 0.08, 0.08, 1.1, 6, [0, 0.55, -0.2]);
  b.box('#4a4b52', 0.06, 0.06, 0.35, [0, 0.95, -0.05]);
  b.box('#4a4b52', 0.5, 0.04, 0.04, [-0.2, 1.1, -0.2], [0, 0, 0.4]);
});

// --- Homestead ----------------------------------------------------------------------------------
registerSceneryTemplate('hotspot', (b, p) => {
  const c = p.color || '#d8c890';
  const w = (p.w || 1) * 0.8, d = (p.h || 1) * 0.8;
  b.box(c, w, 0.02, 0.06, [0, 0.03, -d / 2], [0, 0, 0], 0);
  b.box(c, w, 0.02, 0.06, [0, 0.03, d / 2], [0, 0, 0], 0);
  b.box(c, 0.06, 0.02, d, [-w / 2, 0.03, 0], [0, 0, 0], 0);
  b.box(c, 0.06, 0.02, d, [w / 2, 0.03, 0], [0, 0, 0], 0);
  b.box(shade(c, 0.6), 0.25, 0.02, 0.25, [0, 0.03, 0], [0, Math.PI / 4, 0], 0);
});

registerSceneryTemplate('chair', (b, p) => {
  const c = p.color || WOOD;
  b.box(c, 0.5, 0.07, 0.5, [0, 0.45, 0]);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.box(shade(c, 0.8), 0.06, 0.45, 0.06, [x, 0.22, z]);
  b.box(c, 0.5, 0.55, 0.06, [0, 0.75, -0.22]);
  if (p.arms) for (const x of [-0.25, 0.25]) b.box(shade(c, 0.9), 0.06, 0.06, 0.5, [x, 0.65, 0]);
  if (p.cushion) b.box(p.cushion, 0.44, 0.06, 0.44, [0, 0.51, 0.02], [0, 0, 0], 0.03);
});

registerSceneryTemplate('bookcase', (b, p) => {
  const c = p.color || WOOD;
  b.box(c, 0.9, 1.6, 0.35, [0, 0.8, -0.3]);
  const cols = ['#7a2a2a', '#2a4a7a', '#2a6a3a', '#8a6a2a', '#4a2a5a'];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) b.box(cols[(i + row * 2) % 5], 0.11, 0.32, 0.25, [-0.33 + i * 0.13, 0.3 + row * 0.48, -0.15], [0, 0, (i % 3 === 2) ? 0.15 : 0], 0.05);
});

registerSceneryTemplate('larder', (b, p) => {
  const c = p.color || WOOD;
  b.box(c, 0.9, 1.5, 0.45, [0, 0.75, -0.25]);
  b.box(shade(c, 0.85), 0.42, 1.3, 0.03, [-0.22, 0.75, 0], [0, 0, 0], 0.03);
  b.box(shade(c, 0.85), 0.42, 1.3, 0.03, [0.22, 0.75, 0], [0, 0, 0], 0.03);
  b.sphere('#c8b040', 0.03, [-0.05, 0.8, 0.03]);
  b.sphere('#c8b040', 0.03, [0.05, 0.8, 0.03]);
});

registerSceneryTemplate('firepit', (b) => {
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; b.dodeca(STONE, 0.14, [Math.cos(a) * 0.38, 0.08, Math.sin(a) * 0.38], [1, 0.7, 1]); }
  b.cyl('#5a3a20', 0.06, 0.06, 0.6, 5, [0, 0.08, 0], [0, 0.5, Math.PI / 2]);
  b.cyl('#5a3a20', 0.06, 0.06, 0.6, 5, [0, 0.08, 0], [0, -0.6, Math.PI / 2]);
  b.cone('#ff8a20', 0.18, 0.45, 5, [0, 0.3, 0], [0, 0, 0], 0);
  b.cone('#ffd040', 0.1, 0.3, 5, [0.04, 0.26, 0.03], [0, 0, 0], 0);
});

registerSceneryTemplate('pool', (b, p) => {
  const c = p.water || '#4a90c8';
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; b.box(p.rim || STONE, 0.42, 0.3, 0.2, [Math.cos(a) * 0.85, 0.15, Math.sin(a) * 0.85], [0, -a + Math.PI / 2, 0]); }
  b.cyl(c, 0.8, 0.8, 0.05, 12, [0, 0.22, 0], [0, 0, 0], 0.04);
  if (p.glow) { b.dodeca(p.glow, 0.12, [0, 0.45, 0], [1, 1.6, 1], [0.3, 0.3, 0], 0); b.cyl(p.glow, 0.04, 0.04, 0.4, 5, [0.3, 0.35, 0.2]); }
});

registerSceneryTemplate('wall_map', (b, p) => {
  b.box(DARKWOOD, 0.08, 1.5, 0.08, [-0.4, 0.75, 0]);
  b.box(DARKWOOD, 0.08, 1.5, 0.08, [0.4, 0.75, 0]);
  b.box(p.frame || WOOD, 1.0, 0.75, 0.06, [0, 1.25, 0.03]);
  b.box('#e8dcb8', 0.88, 0.63, 0.02, [0, 1.25, 0.07], [0, 0, 0], 0.02);
  b.box('#5a9a4a', 0.3, 0.2, 0.01, [-0.15, 1.3, 0.085], [0, 0, 0.2], 0);
  b.box('#4a80c0', 0.2, 0.35, 0.01, [0.2, 1.2, 0.085], [0, 0, -0.3], 0);
  b.box('#c03030', 0.05, 0.05, 0.02, [0.05, 1.32, 0.09], [0, 0, 0], 0);
});

registerSceneryTemplate('workbench', (b, p) => {
  const c = p.color || WOOD;
  b.box(c, 1.0, 0.1, 0.6, [0, 0.75, 0]);
  for (const [x, z] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) b.box(shade(c, 0.8), 0.08, 0.72, 0.08, [x, 0.36, z]);
  b.box('#8a8a92', 0.25, 0.05, 0.05, [0.2, 0.83, 0.05], [0, 0.5, 0]);
  b.box('#d8b070', 0.4, 0.04, 0.15, [-0.2, 0.82, 0]);
});

registerSceneryTemplate('rug', (b, p) => {
  b.box(p.color || '#8a2a2a', 1.6, 0.02, 1.0, [0, 0.015, 0], [0, 0, 0], 0.03);
  b.box(p.color2 || '#d8b040', 1.3, 0.025, 0.7, [0, 0.02, 0], [0, 0, 0], 0.03);
});

// ------------------------------------------------------------------------------------------------
// Icons (36x32 canvas)
// ------------------------------------------------------------------------------------------------
const ICON_WOOD = '#9a7a48';
function outline(ctx) { ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.stroke(); }
function fillPath(ctx, color) { ctx.fillStyle = color; ctx.fill(); outline(ctx); }
function line(ctx, x0, y0, x1, y1, w, color) {
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#000'; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke(); ctx.restore();
}
const nStack = (qty) => Math.min(4, Math.max(1, qty > 1 ? Math.ceil(Math.log10(qty + 1)) + 1 : 1));

registerIconShape('plank', (ctx, c) => {
  for (let i = 0; i < 2; i++) {
    ctx.beginPath(); ctx.moveTo(4, 20 - i * 7); ctx.lineTo(28, 8 - i * 7 + 7); ctx.lineTo(32, 12 - i * 7 + 7); ctx.lineTo(8, 24 - i * 7); ctx.closePath();
    fillPath(ctx, i ? shade(c, 1.15) : c);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(8, 21); ctx.lineTo(28, 11); ctx.stroke();
});
registerIconShape('nails', (ctx, c, c2, def, qty) => {
  const n = nStack(qty) + 1;
  for (let i = 0; i < n; i++) { const x = 8 + i * 5, y = 6 + (i % 2) * 3; line(ctx, x, y + 3, x + 6, y + 20, 1.6, c); ctx.fillStyle = c; ctx.fillRect(x - 3, y, 7, 3); ctx.strokeRect(x - 3, y, 7, 3); }
});
registerIconShape('tips', (ctx, c, c2, def, qty) => {
  const n = nStack(qty);
  for (let i = 0; i < n + 1; i++) {
    const x = 7 + i * 6, y = 8 + (i % 2) * 8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 3); ctx.lineTo(x, y + 6); ctx.lineTo(x + 2, y + 3); ctx.closePath(); fillPath(ctx, c);
  }
});
registerIconShape('shafts', (ctx, c, c2, def, qty) => {
  const n = nStack(qty);
  for (let i = 0; i < n; i++) { const o = i * 3; line(ctx, 6 + o, 28 - o, 28 + o, 6 - o, 1.4, c || ICON_WOOD); }
});
registerIconShape('headless', (ctx, c, c2, def, qty) => {
  const n = nStack(qty);
  for (let i = 0; i < n; i++) {
    const o = i * 3; line(ctx, 6 + o, 28 - o, 28 + o, 6 - o, 1.4, ICON_WOOD);
    ctx.beginPath(); ctx.moveTo(5 + o, 25 - o); ctx.lineTo(9 + o, 27 - o); ctx.lineTo(5 + o, 31 - o); ctx.lineTo(3 + o, 29 - o); ctx.closePath(); ctx.fillStyle = c || '#eee'; ctx.fill();
  }
});
registerIconShape('dart', (ctx, c, c2, def, qty) => {
  const n = Math.min(3, nStack(qty));
  for (let i = 0; i < n; i++) {
    const o = i * 5;
    line(ctx, 8 + o, 26 - o * 0.4, 20 + o, 14 - o * 0.4, 1.4, '#6a6a6a');
    ctx.beginPath(); ctx.moveTo(19 + o, 15 - o * 0.4); ctx.lineTo(27 + o, 6 - o * 0.4); ctx.lineTo(23 + o, 17 - o * 0.4); ctx.closePath(); fillPath(ctx, c);
    ctx.beginPath(); ctx.moveTo(8 + o, 26 - o * 0.4); ctx.lineTo(4 + o, 24 - o * 0.4); ctx.lineTo(7 + o, 30 - o * 0.4); ctx.closePath(); ctx.fillStyle = c2 || '#e8e8e8'; ctx.fill();
  }
});
registerIconShape('bow_u', (ctx, c) => {
  ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(34, 6, 28, 29);
  ctx.lineWidth = 4.5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = c; ctx.stroke();
});
registerIconShape('hide', (ctx, c, c2) => {
  ctx.beginPath(); ctx.moveTo(6, 8); ctx.lineTo(11, 4); ctx.lineTo(18, 7); ctx.lineTo(25, 4); ctx.lineTo(30, 8); ctx.lineTo(28, 16); ctx.lineTo(31, 26);
  ctx.lineTo(23, 28); ctx.lineTo(18, 25); ctx.lineTo(13, 28); ctx.lineTo(5, 26); ctx.lineTo(8, 16); ctx.closePath(); fillPath(ctx, c);
  if (c2) { ctx.fillStyle = c2; for (const [x, y] of [[12, 12], [21, 10], [16, 18], [24, 20]]) { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); } }
});
registerIconShape('leather', (ctx, c) => {
  ctx.beginPath(); ctx.moveTo(5, 8); ctx.lineTo(31, 8); ctx.lineTo(29, 26); ctx.lineTo(7, 26); ctx.closePath(); fillPath(ctx, c);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.setLineDash([2, 2]); ctx.strokeRect(9, 11, 18, 12); ctx.setLineDash([]);
});
registerIconShape('lump', (ctx, c) => {
  ctx.beginPath(); ctx.moveTo(6, 22); ctx.quadraticCurveTo(6, 9, 17, 9); ctx.quadraticCurveTo(30, 8, 30, 21); ctx.quadraticCurveTo(29, 27, 18, 27); ctx.quadraticCurveTo(6, 28, 6, 22); ctx.closePath(); fillPath(ctx, c);
});
registerIconShape('mould', (ctx, c, c2) => {
  ctx.beginPath(); ctx.roundRect(5, 7, 26, 19, 3); fillPath(ctx, c || '#8a8a8a');
  ctx.fillStyle = '#2a2a2a';
  if (c2 === 'ring') { ctx.beginPath(); ctx.arc(18, 16.5, 6, 0, 7); ctx.lineWidth = 2.4; ctx.strokeStyle = '#2a2a2a'; ctx.stroke(); }
  else if (c2 === 'amulet') { ctx.beginPath(); ctx.moveTo(10, 10); ctx.quadraticCurveTo(18, 24, 26, 10); ctx.lineWidth = 1.6; ctx.strokeStyle = '#2a2a2a'; ctx.stroke(); ctx.beginPath(); ctx.arc(18, 19, 3.5, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.moveTo(9, 10); ctx.quadraticCurveTo(18, 28, 27, 10); ctx.lineWidth = 2.4; ctx.strokeStyle = '#2a2a2a'; ctx.stroke(); }
});
registerIconShape('jug', (ctx, c, c2) => {
  ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(22, 5); ctx.lineTo(22, 9); ctx.quadraticCurveTo(29, 14, 27, 23); ctx.quadraticCurveTo(26, 29, 17, 29); ctx.quadraticCurveTo(8, 29, 8, 22); ctx.quadraticCurveTo(7, 14, 12, 9); ctx.closePath();
  fillPath(ctx, c || '#b0a090');
  if (c2) { ctx.save(); ctx.clip(); ctx.fillStyle = c2; ctx.fillRect(6, 15, 24, 16); ctx.restore(); outline(ctx); }
  ctx.beginPath(); ctx.arc(26, 15, 4, -1.2, 1.4); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
});
registerIconShape('saw', (ctx, c) => {
  ctx.beginPath(); ctx.moveTo(4, 22); ctx.lineTo(26, 8); ctx.lineTo(29, 13); ctx.lineTo(8, 27); ctx.closePath(); fillPath(ctx, c || '#c0c0c8');
  ctx.fillStyle = '#000'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(7 + i * 3.1, 26 - i * 2, 0.8, 0, 7); ctx.fill(); }
  ctx.beginPath(); ctx.roundRect(25, 3, 8, 9, 2); fillPath(ctx, '#7a5228');
});
registerIconShape('necklace', (ctx, c, c2) => {
  ctx.beginPath(); ctx.moveTo(6, 4); ctx.quadraticCurveTo(18, 34, 30, 4); ctx.lineWidth = 3.5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = c; ctx.stroke();
  if (c2) { ctx.beginPath(); ctx.moveTo(18, 16); ctx.lineTo(22, 21); ctx.lineTo(18, 26); ctx.lineTo(14, 21); ctx.closePath(); fillPath(ctx, c2); }
});
registerIconShape('wheat', (ctx, c) => {
  for (let i = 0; i < 3; i++) {
    const x = 12 + i * 6; line(ctx, x, 30, x + 2, 10, 1, '#b89a40');
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + 2 - k * 0.3, 6 + k * 3.5, 2, 3, 0.3, 0, 7); fillPath(ctx, c || '#d8b850'); }
  }
});
registerIconShape('pestle', (ctx, c) => {
  ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(30, 16); ctx.quadraticCurveTo(28, 29, 18, 29); ctx.quadraticCurveTo(8, 29, 6, 16); ctx.closePath(); fillPath(ctx, c || '#9a948a');
  line(ctx, 16, 18, 26, 4, 3, '#b8b2a6');
});
registerIconShape('tin', (ctx, c) => {
  ctx.beginPath(); ctx.ellipse(18, 21, 14, 6, 0, 0, 7); fillPath(ctx, c || '#9a9aa2');
  ctx.beginPath(); ctx.ellipse(18, 17, 14, 6, 0, 0, 7); fillPath(ctx, shade(c || '#9a9aa2', 1.2));
  ctx.beginPath(); ctx.ellipse(18, 17, 10, 4, 0, 0, 7); fillPath(ctx, shade(c || '#9a9aa2', 0.7));
});
registerIconShape('bowl', (ctx, c, c2) => {
  ctx.beginPath(); ctx.moveTo(4, 13); ctx.lineTo(32, 13); ctx.quadraticCurveTo(30, 28, 18, 28); ctx.quadraticCurveTo(6, 28, 4, 13); ctx.closePath(); fillPath(ctx, c || '#a8643a');
  if (c2) { ctx.beginPath(); ctx.ellipse(18, 14, 13, 3, 0, 0, 7); ctx.fillStyle = c2; ctx.fill(); }
});
registerIconShape('studs', (ctx, c) => {
  for (const [x, y] of [[10, 10], [20, 8], [26, 16], [14, 20], [22, 24], [9, 26]]) { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); fillPath(ctx, c); }
});
registerIconShape('flatpack', (ctx, c) => {
  ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(20, 6); ctx.lineTo(32, 12); ctx.lineTo(16, 20); ctx.closePath(); fillPath(ctx, shade(c, 1.2));
  ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(16, 20); ctx.lineTo(16, 27); ctx.lineTo(4, 21); ctx.closePath(); fillPath(ctx, c);
  ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(32, 12); ctx.lineTo(32, 19); ctx.lineTo(16, 27); ctx.closePath(); fillPath(ctx, shade(c, 0.75));
});
// Potion flask (like the engine 'potion' shape, but without rgba colours so three.js stays quiet).
registerIconShape('flask', (ctx, c, c2, def) => {
  const doses = def?.doses ?? 4;
  ctx.beginPath(); ctx.roundRect(14, 3, 8, 5, 1); fillPath(ctx, '#8a6a40');
  const body = () => { ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(22, 8); ctx.lineTo(22, 12); ctx.quadraticCurveTo(29, 15, 28, 22); ctx.quadraticCurveTo(27, 30, 18, 30); ctx.quadraticCurveTo(9, 30, 8, 22); ctx.quadraticCurveTo(7, 15, 14, 12); ctx.closePath(); };
  body(); ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#c8dce6'; ctx.fill(); ctx.restore();
  if (doses > 0) {
    ctx.save(); body(); ctx.clip();
    const g = ctx.createLinearGradient(6, 12, 30, 30); g.addColorStop(0, shade(c, 1.35)); g.addColorStop(0.5, c); g.addColorStop(1, shade(c, 0.55));
    ctx.fillStyle = g; ctx.fillRect(6, 30 - (doses / 4) * 15, 24, 30); ctx.restore();
  }
  body(); outline(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(11, 16, 2, 6);
});
