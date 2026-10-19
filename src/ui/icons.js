// Procedural canvas icons for items and skills, cached as data URLs.
// Item def.icon = { shape, color, color2 } chooses the drawing (see SHAPES below).
// Content may add shapes: registerIconShape('lantern', (ctx, color, color2, def, qty) => {...}).

import * as THREE from 'three';
import { getItem } from '../core/registry.js';

const W = 36, H = 32;
const cache = new Map();
const texCache = new Map();

function adj(hex, f) {
  const c = new THREE.Color(hex);
  if (f > 1) c.lerp(new THREE.Color('#ffffff'), Math.min(1, f - 1)); else c.multiplyScalar(f);
  return '#' + c.getHexString();
}

function grad(ctx, color, x0 = 4, y0 = 2, x1 = 32, y1 = 30) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, adj(color, 1.35));
  g.addColorStop(0.5, color);
  g.addColorStop(1, adj(color, 0.55));
  return g;
}

/** Fill the current path with a shaded colour and a dark outline. */
function paint(ctx, color, outline = true) {
  ctx.fillStyle = grad(ctx, color);
  ctx.fill();
  if (outline) { ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.stroke(); }
}

function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

const WOOD = '#7a5228';

function handle(ctx, x0, y0, x1, y1, w = 2.4, color = WOOD) {
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#000'; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  ctx.restore();
}

const SHAPES = {
  generic(ctx, c) { rrect(ctx, 9, 8, 18, 18, 4); paint(ctx, c); poly(ctx, [13, 8, 18, 3, 23, 8]); paint(ctx, adj(c, 0.8)); },
  sword(ctx, c, c2) { handle(ctx, 7, 27, 11, 23, 3, '#5a3a20'); poly(ctx, [10, 21, 27, 4, 30, 2, 28, 6, 12, 23]); paint(ctx, c); poly(ctx, [7, 19, 9, 17, 16, 24, 14, 26]); paint(ctx, c2 || '#c8a040'); },
  longsword(ctx, c, c2) { handle(ctx, 5, 29, 9, 25, 3, '#5a3a20'); poly(ctx, [8, 23, 29, 2, 32, 1, 31, 4, 10, 25]); paint(ctx, c); poly(ctx, [5, 21, 7, 19, 14, 26, 12, 28]); paint(ctx, c2 || '#c8a040'); },
  dagger(ctx, c, c2) { handle(ctx, 9, 25, 13, 21, 3, '#5a3a20'); poly(ctx, [12, 19, 23, 9, 25, 8, 24, 11, 14, 21]); paint(ctx, c); poly(ctx, [10, 18, 12, 16, 17, 21, 15, 23]); paint(ctx, c2 || '#c8a040'); },
  scimitar(ctx, c, c2) {
    handle(ctx, 7, 27, 11, 23, 3, '#5a3a20');
    ctx.beginPath(); ctx.moveTo(11, 22); ctx.quadraticCurveTo(14, 8, 30, 3); ctx.quadraticCurveTo(20, 12, 14, 24); ctx.closePath(); paint(ctx, c);
    poly(ctx, [7, 20, 9, 18, 15, 24, 13, 26]); paint(ctx, c2 || '#c8a040');
  },
  axe(ctx, c) { handle(ctx, 9, 29, 24, 6, 2.6); ctx.beginPath(); ctx.moveTo(20, 4); ctx.quadraticCurveTo(31, 6, 30, 16); ctx.lineTo(22, 12); ctx.closePath(); paint(ctx, c); },
  pickaxe(ctx, c) { handle(ctx, 10, 30, 22, 8, 2.6); ctx.beginPath(); ctx.moveTo(6, 10); ctx.quadraticCurveTo(20, 1, 33, 12); ctx.quadraticCurveTo(20, 6, 6, 10); ctx.closePath(); ctx.lineWidth = 1; paint(ctx, c); ctx.beginPath(); ctx.moveTo(6, 10); ctx.quadraticCurveTo(20, 2, 33, 12); ctx.lineWidth = 3.5; ctx.strokeStyle = c; ctx.stroke(); },
  mace(ctx, c) { handle(ctx, 9, 29, 20, 13, 2.6); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; poly(ctx, [23 + Math.cos(a) * 6, 9 + Math.sin(a) * 6, 23 + Math.cos(a + 0.3) * 9, 9 + Math.sin(a + 0.3) * 9, 23 + Math.cos(a + 0.6) * 6, 9 + Math.sin(a + 0.6) * 6]); paint(ctx, adj(c, 0.8), false); } circle(ctx, 23, 9, 6.5); paint(ctx, c); },
  hammer(ctx, c) { handle(ctx, 9, 29, 21, 11, 2.6); poly(ctx, [15, 7, 26, 3, 30, 11, 19, 15]); paint(ctx, c); },
  spear(ctx, c) { handle(ctx, 5, 31, 26, 9, 2); poly(ctx, [24, 10, 31, 2, 28, 11]); paint(ctx, c); },
  staff(ctx, c, c2) { handle(ctx, 6, 31, 25, 8, 2.6); circle(ctx, 27, 6, 4.5); paint(ctx, c2 || c); },
  bow(ctx, c) { ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(34, 6, 28, 29); ctx.lineWidth = 4.5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = c; ctx.stroke(); ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(28, 29); ctx.lineWidth = 0.8; ctx.strokeStyle = '#ddd'; ctx.stroke(); },
  arrow(ctx, c, c2, def, qty) {
    const n = Math.min(4, Math.max(1, qty > 1 ? Math.ceil(Math.log10(qty + 1)) + 1 : 1));
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      handle(ctx, 6 + o, 28 - o, 26 + o, 8 - o, 1.4, '#9a7a48');
      poly(ctx, [25 + o, 5 - o, 31 + o, 3 - o, 29 + o, 9 - o]); paint(ctx, c);
      poly(ctx, [5 + o, 25 - o, 9 + o, 27 - o, 5 + o, 31 - o, 3 + o, 29 - o]); paint(ctx, c2 || '#e8e8e8', false);
    }
  },
  helm(ctx, c) { ctx.beginPath(); ctx.moveTo(7, 24); ctx.quadraticCurveTo(7, 5, 18, 5); ctx.quadraticCurveTo(29, 5, 29, 24); ctx.closePath(); paint(ctx, c); poly(ctx, [16, 14, 20, 14, 19, 27, 17, 27]); paint(ctx, adj(c, 0.8)); },
  fullhelm(ctx, c) { ctx.beginPath(); ctx.moveTo(7, 28); ctx.lineTo(7, 13); ctx.quadraticCurveTo(7, 3, 18, 3); ctx.quadraticCurveTo(29, 3, 29, 13); ctx.lineTo(29, 28); ctx.closePath(); paint(ctx, c); ctx.fillStyle = '#111'; ctx.fillRect(10, 14, 16, 2.5); ctx.fillRect(17, 14, 2, 9); },
  hood(ctx, c) { ctx.beginPath(); ctx.moveTo(6, 29); ctx.quadraticCurveTo(5, 3, 18, 3); ctx.quadraticCurveTo(31, 3, 30, 29); ctx.closePath(); paint(ctx, c); ellipse(ctx, 18, 18, 7, 9); ctx.fillStyle = '#1a1210'; ctx.fill(); },
  hat(ctx, c) { ellipse(ctx, 18, 25, 15, 4); paint(ctx, c); poly(ctx, [10, 24, 19, 1, 26, 24]); paint(ctx, c); },
  platebody(ctx, c) { poly(ctx, [4, 9, 11, 4, 25, 4, 32, 9, 30, 18, 26, 16, 26, 29, 10, 29, 10, 16, 6, 18]); paint(ctx, c); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(18, 6); ctx.lineTo(18, 28); ctx.stroke(); },
  chainbody(ctx, c) { SHAPES.platebody(ctx, c); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 8; y < 28; y += 3) for (let x = 11 + (y % 2); x < 26; x += 3) ctx.fillRect(x, y, 1, 1); },
  robe_top(ctx, c) { poly(ctx, [4, 10, 11, 4, 25, 4, 32, 10, 30, 20, 26, 18, 27, 30, 9, 30, 10, 18, 6, 20]); paint(ctx, c); },
  legs(ctx, c) { poly(ctx, [9, 3, 27, 3, 29, 30, 21, 30, 18, 12, 15, 30, 7, 30]); paint(ctx, c); },
  skirt(ctx, c) { poly(ctx, [11, 3, 25, 3, 31, 29, 5, 29]); paint(ctx, c); },
  shield(ctx, c, c2) { poly(ctx, [7, 4, 29, 4, 29, 15, 18, 30, 7, 15]); paint(ctx, c); poly(ctx, [16.5, 5, 19.5, 5, 19.5, 26, 16.5, 26]); paint(ctx, c2 || adj(c, 0.75), false); },
  sq_shield(ctx, c, c2) { rrect(ctx, 6, 3, 24, 26, 3); paint(ctx, c); ctx.fillStyle = c2 || adj(c, 0.75); ctx.fillRect(9, 13, 18, 4); },
  round_shield(ctx, c, c2) { circle(ctx, 18, 16, 13); paint(ctx, c); circle(ctx, 18, 16, 4); paint(ctx, c2 || adj(c, 0.7)); },
  boots(ctx, c) { poly(ctx, [6, 6, 13, 6, 13, 20, 18, 24, 18, 28, 4, 28]); paint(ctx, c); poly(ctx, [19, 4, 26, 4, 26, 18, 31, 22, 31, 26, 17, 26]); paint(ctx, adj(c, 1.1)); },
  gloves(ctx, c) { poly(ctx, [8, 28, 8, 14, 10, 8, 12, 14, 13, 6, 15, 14, 17, 7, 19, 14, 21, 9, 22, 18, 26, 14, 27, 18, 21, 28]); paint(ctx, c); },
  cape(ctx, c, c2) { poly(ctx, [12, 3, 24, 3, 31, 29, 5, 29]); paint(ctx, c); if (c2) { poly(ctx, [15, 10, 21, 10, 22, 20, 14, 20]); paint(ctx, c2, false); } },
  ring(ctx, c, c2) { ctx.beginPath(); ctx.arc(18, 19, 8, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = c; ctx.stroke(); poly(ctx, [15, 9, 18, 5, 21, 9, 18, 13]); paint(ctx, c2 || '#e04040'); },
  amulet(ctx, c, c2) { ctx.beginPath(); ctx.moveTo(7, 3); ctx.quadraticCurveTo(18, 30, 29, 3); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = c; ctx.stroke(); circle(ctx, 18, 22, 5); paint(ctx, c2 || '#4080e0'); },
  ore(ctx, c, c2) { poly(ctx, [6, 18, 9, 9, 18, 5, 27, 8, 31, 17, 27, 26, 15, 28, 8, 25]); paint(ctx, c2 || '#6e6a64'); ctx.fillStyle = c; for (const [x, y] of [[13, 12], [21, 10], [24, 18], [15, 21], [19, 16]]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); } },
  bar(ctx, c) { poly(ctx, [4, 22, 10, 12, 32, 12, 26, 22]); paint(ctx, adj(c, 1.15)); poly(ctx, [4, 22, 26, 22, 26, 27, 4, 27]); paint(ctx, c); poly(ctx, [26, 22, 32, 12, 32, 17, 26, 27]); paint(ctx, adj(c, 0.7)); },
  log(ctx, c, c2) { poly(ctx, [7, 12, 26, 6, 30, 18, 11, 24]); paint(ctx, c); ellipse(ctx, 9, 18, 4, 6.3, -0.3); paint(ctx, c2 || '#d8b070'); ctx.strokeStyle = adj(c2 || '#d8b070', 0.6); ctx.beginPath(); ctx.ellipse(9, 18, 1.8, 3, -0.3, 0, 7); ctx.stroke(); },
  fish(ctx, c) { ctx.beginPath(); ctx.moveTo(5, 16); ctx.quadraticCurveTo(15, 5, 26, 14); ctx.lineTo(32, 8); ctx.lineTo(31, 24); ctx.lineTo(26, 18); ctx.quadraticCurveTo(15, 27, 5, 16); ctx.closePath(); paint(ctx, c); ctx.fillStyle = '#000'; ctx.fillRect(9, 13, 2, 2); },
  bones(ctx, c) { handle(ctx, 9, 23, 27, 9, 3.5, c || '#eae4d4'); for (const [x, y] of [[7, 21], [10, 25], [25, 7], [29, 11]]) { circle(ctx, x, y, 3); paint(ctx, c || '#eae4d4'); } },
  rune(ctx, c) { rrect(ctx, 6, 5, 24, 23, 7); paint(ctx, '#8a8a92'); ctx.save(); ctx.lineWidth = 2.6; ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(18, 16.5, 6, 0.4, Math.PI * 1.8); ctx.moveTo(18, 10); ctx.lineTo(18, 23); ctx.stroke(); ctx.restore(); },
  essence(ctx, c) { poly(ctx, [8, 20, 11, 8, 22, 5, 29, 13, 27, 25, 15, 28]); paint(ctx, c || '#d8d4e8'); },
  potion(ctx, c, c2, def) { const doses = def?.doses ?? 4; rrect(ctx, 14, 3, 8, 5, 1); paint(ctx, '#8a6a40'); ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(22, 8); ctx.lineTo(22, 12); ctx.quadraticCurveTo(29, 15, 28, 22); ctx.quadraticCurveTo(27, 30, 18, 30); ctx.quadraticCurveTo(9, 30, 8, 22); ctx.quadraticCurveTo(7, 15, 14, 12); ctx.closePath(); paint(ctx, 'rgba(200,220,230,0.5)'); const lv = 30 - (doses / 4) * 15; ctx.save(); ctx.clip(); ctx.fillStyle = grad(ctx, c); ctx.fillRect(6, lv, 24, 30); ctx.restore(); },
  coins(ctx, c, c2, def, qty) {
    const n = qty >= 10000 ? 9 : qty >= 1000 ? 7 : qty >= 250 ? 6 : qty >= 100 ? 5 : qty >= 25 ? 4 : Math.min(qty, 3);
    const pos = [[18, 24], [12, 22], [24, 22], [18, 19], [12, 17], [24, 17], [18, 14], [15, 10], [21, 10]];
    for (let i = 0; i < Math.max(1, n); i++) { ellipse(ctx, pos[i][0], pos[i][1], 5.5, 3.6); paint(ctx, c || '#e8c040'); }
  },
  bread(ctx, c) { ellipse(ctx, 18, 18, 13, 8); paint(ctx, c || '#c8904a'); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; for (const x of [12, 18, 24]) { ctx.beginPath(); ctx.moveTo(x - 2, 13); ctx.lineTo(x + 2, 20); ctx.stroke(); } },
  pie(ctx, c, c2) { ellipse(ctx, 18, 19, 14, 8); paint(ctx, '#d0a060'); ellipse(ctx, 18, 17, 11, 5.5); paint(ctx, c2 || c || '#a04040'); },
  meat(ctx, c) { ellipse(ctx, 20, 15, 11, 9, -0.4); paint(ctx, c || '#b04a3a'); handle(ctx, 6, 27, 12, 21, 3.5, '#eae4d4'); },
  cake(ctx, c) { poly(ctx, [6, 14, 30, 14, 30, 27, 6, 27]); paint(ctx, c || '#e8d8b0'); poly(ctx, [6, 14, 18, 8, 30, 14]); paint(ctx, '#f4f0f0'); },
  herb(ctx, c) { for (let i = 0; i < 5; i++) { const a = -1.9 + i * 0.5; ellipse(ctx, 18 + Math.cos(a) * 8, 18 + Math.sin(a) * 8, 6, 2.6, a); paint(ctx, c || '#4a9a3a'); } handle(ctx, 18, 30, 18, 18, 1.5, '#3a6a2a'); },
  gem(ctx, c) { poly(ctx, [10, 12, 14, 6, 22, 6, 26, 12, 18, 27]); paint(ctx, c); poly(ctx, [10, 12, 26, 12, 18, 27]); paint(ctx, adj(c, 0.8)); },
  seed(ctx, c) { for (const [x, y] of [[13, 14], [21, 12], [17, 20], [24, 20], [11, 22]]) { ellipse(ctx, x, y, 3, 2, 0.5); paint(ctx, c || '#8a6a2a'); } },
  tinderbox(ctx) { rrect(ctx, 7, 10, 22, 14, 2); paint(ctx, '#8a8a8a'); rrect(ctx, 7, 8, 22, 4, 1); paint(ctx, '#6a6a6a'); },
  knife(ctx, c) { handle(ctx, 8, 27, 14, 21, 3, '#5a3a20'); poly(ctx, [13, 20, 28, 6, 26, 14, 15, 22]); paint(ctx, c || '#c0c0c8'); },
  chisel(ctx, c) { handle(ctx, 8, 27, 16, 19, 3.2, '#5a3a20'); poly(ctx, [15, 18, 26, 7, 29, 10, 18, 21]); paint(ctx, c || '#a0a0a8'); },
  needle(ctx) { handle(ctx, 8, 28, 28, 6, 1.2, '#c8c8d0'); },
  bucket(ctx, c, c2) { poly(ctx, [8, 10, 28, 10, 25, 29, 11, 29]); paint(ctx, c || '#8a8a8a'); if (c2) { ellipse(ctx, 18, 11, 9.5, 2.4); paint(ctx, c2, false); } ctx.beginPath(); ctx.arc(18, 11, 10, Math.PI, 0); ctx.strokeStyle = '#333'; ctx.stroke(); },
  pot(ctx, c, c2) { ellipse(ctx, 18, 19, 11, 10); paint(ctx, c || '#8a5a3a'); rrect(ctx, 11, 6, 14, 5, 2); paint(ctx, adj(c || '#8a5a3a', 0.8)); if (c2) { ellipse(ctx, 18, 9, 6, 2); paint(ctx, c2, false); } },
  feather(ctx, c) { ctx.beginPath(); ctx.moveTo(8, 28); ctx.quadraticCurveTo(10, 8, 28, 4); ctx.quadraticCurveTo(24, 20, 8, 28); ctx.closePath(); paint(ctx, c || '#f0f0f0'); },
  string(ctx, c) { ctx.lineWidth = 2; ctx.strokeStyle = c || '#e8e0c0'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(18, 17, 10 - i * 3, 6 - i * 1.5, 0, 0, 7); ctx.stroke(); } },
  egg(ctx, c) { ellipse(ctx, 18, 17, 8, 10.5); paint(ctx, c || '#f0e8d8'); },
  key(ctx, c) { circle(ctx, 11, 12, 6); paint(ctx, c || '#d0b040'); handle(ctx, 15, 16, 29, 27, 3, c || '#d0b040'); },
  scroll(ctx, c) { rrect(ctx, 7, 7, 22, 19, 2); paint(ctx, c || '#e8dcb8'); for (let y = 11; y < 24; y += 3) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(10, y, 16, 1); } },
  book(ctx, c) { rrect(ctx, 7, 5, 22, 24, 2); paint(ctx, c || '#7a3a2a'); ctx.fillStyle = '#e8dcb8'; ctx.fillRect(26, 7, 2, 20); },
  bag(ctx, c) { ctx.beginPath(); ctx.moveTo(13, 8); ctx.lineTo(23, 8); ctx.quadraticCurveTo(32, 20, 26, 29); ctx.lineTo(10, 29); ctx.quadraticCurveTo(4, 20, 13, 8); ctx.closePath(); paint(ctx, c || '#a08050'); },
  // skill-only shapes
  fist(ctx, c) { rrect(ctx, 8, 9, 20, 16, 5); paint(ctx, c || '#c8946a'); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; for (const x of [13, 18, 23]) { ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x, 16); ctx.stroke(); } },
  star(ctx, c) { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 13, a = -Math.PI / 2 + i * Math.PI / 5; p.push(18 + Math.cos(a) * r, 17 + Math.sin(a) * r); } poly(ctx, p); paint(ctx, c || '#f0e8a0'); },
  heart(ctx, c) { ctx.beginPath(); ctx.moveTo(18, 28); ctx.bezierCurveTo(4, 18, 6, 5, 18, 11); ctx.bezierCurveTo(30, 5, 32, 18, 18, 28); ctx.closePath(); paint(ctx, c || '#d02828'); },
  mask(ctx, c) { ellipse(ctx, 18, 15, 13, 9); paint(ctx, c || '#3a3a44'); ctx.fillStyle = '#000'; ellipse(ctx, 12, 15, 3.5, 2.2); ctx.fill(); ellipse(ctx, 24, 15, 3.5, 2.2); ctx.fill(); },
  skull(ctx, c) { ellipse(ctx, 18, 13, 10, 9); paint(ctx, c || '#e8e4d4'); rrect(ctx, 12, 18, 12, 8, 2); paint(ctx, c || '#e8e4d4'); ctx.fillStyle = '#000'; circle(ctx, 14, 14, 2.6); ctx.fill(); circle(ctx, 22, 14, 2.6); ctx.fill(); },
  paw(ctx, c) { ellipse(ctx, 18, 21, 7, 6); paint(ctx, c || '#8a6a4a'); for (const [x, y] of [[10, 12], [15, 8], [21, 8], [26, 12]]) { ellipse(ctx, x, y, 2.8, 3.5); paint(ctx, c || '#8a6a4a'); } },
  anvil(ctx, c) { poly(ctx, [4, 9, 30, 9, 30, 14, 24, 16, 24, 22, 28, 27, 8, 27, 12, 22, 12, 16, 8, 14]); paint(ctx, c || '#5a5a62'); },
  flame(ctx, c) { ctx.beginPath(); ctx.moveTo(18, 3); ctx.quadraticCurveTo(30, 16, 25, 25); ctx.quadraticCurveTo(18, 32, 11, 25); ctx.quadraticCurveTo(6, 16, 18, 3); ctx.closePath(); paint(ctx, c || '#f08020'); ctx.beginPath(); ctx.moveTo(18, 13); ctx.quadraticCurveTo(24, 21, 21, 25); ctx.quadraticCurveTo(18, 28, 15, 25); ctx.quadraticCurveTo(12, 21, 18, 13); ctx.closePath(); paint(ctx, '#ffe060', false); },
  tree(ctx, c) { handle(ctx, 18, 29, 18, 18, 4, '#6a4a2a'); circle(ctx, 18, 12, 9); paint(ctx, c || '#3a8a2a'); },
  sprout(ctx, c) { handle(ctx, 18, 29, 18, 16, 2, '#4a8a2a'); ellipse(ctx, 12, 14, 6, 3, -0.5); paint(ctx, c || '#5aaa3a'); ellipse(ctx, 24, 12, 6, 3, 0.5); paint(ctx, c || '#5aaa3a'); ellipse(ctx, 18, 29, 9, 2.5); paint(ctx, '#6a4a2a'); },
  chef(ctx, c) { rrect(ctx, 11, 18, 14, 8, 1); paint(ctx, c || '#f0f0f0'); circle(ctx, 13, 14, 5); paint(ctx, c || '#f0f0f0'); circle(ctx, 23, 14, 5); paint(ctx, c || '#f0f0f0'); circle(ctx, 18, 10, 6); paint(ctx, c || '#f0f0f0'); },
  boot(ctx, c) { poly(ctx, [10, 4, 19, 4, 19, 18, 29, 22, 29, 28, 8, 28]); paint(ctx, c || '#3a7a3a'); },
  // tab-only shapes
  stats(ctx, c) { [[7, 18], [15, 10], [23, 5]].forEach(([x, y]) => { rrect(ctx, x, y, 6, 28 - y, 1); paint(ctx, c || '#c8a040'); }); },
  smile(ctx, c) { circle(ctx, 18, 16, 12); paint(ctx, c || '#e8c040'); ctx.fillStyle = '#000'; circle(ctx, 14, 13, 1.6); ctx.fill(); circle(ctx, 22, 13, 1.6); ctx.fill(); ctx.beginPath(); ctx.arc(18, 17, 6, 0.3, Math.PI - 0.3); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke(); },
  gear(ctx, c) { const p = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? 9 : 12.5, a = i * Math.PI / 8; p.push(18 + Math.cos(a) * r, 16 + Math.sin(a) * r); } poly(ctx, p); paint(ctx, c || '#9a9aa2'); circle(ctx, 18, 16, 4); ctx.fillStyle = '#3a3128'; ctx.fill(); },
};

export function registerIconShape(name, fn) { SHAPES[name] = fn; }

function draw(shape, color, color2, def, qty) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  (SHAPES[shape] || SHAPES.generic)(ctx, color, color2, def, qty);
  return cv.toDataURL();
}

const coinBucket = (q) => (q >= 10000 ? 10000 : q >= 1000 ? 1000 : q >= 250 ? 250 : q >= 100 ? 100 : q >= 25 ? 25 : Math.min(q, 3));

/** Data URL for an item icon. qty only matters for coin/arrow-like stack shapes. */
export function getItemIcon(itemId, qty = 1) {
  const def = getItem(itemId);
  const shape = def?.icon?.shape || 'generic';
  const qk = shape === 'coins' ? coinBucket(qty) : shape === 'arrow' ? Math.min(4, String(qty).length) : 1;
  const key = `${itemId}|${qk}`;
  let url = cache.get(key);
  if (!url) {
    url = draw(shape, def?.icon?.color || '#999', def?.icon?.color2, def, qty);
    cache.set(key, url);
  }
  return url;
}

export function getItemIconTexture(itemId, qty = 1) {
  const url = getItemIcon(itemId, qty);
  let t = texCache.get(url);
  if (!t) {
    t = new THREE.TextureLoader().load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    texCache.set(url, t);
  }
  return t;
}

const SKILL_ICONS = {
  attack: ['sword', '#c8c8d0', '#c8a040'], strength: ['fist', '#c8946a'], defence: ['shield', '#5a7ac8', '#c8c8d0'],
  ranged: ['bow', '#8a5a2a'], prayer: ['star', '#f0e8a0'], magic: ['hat', '#3a5ab8'], runebinding: ['rune', '#e8a020'],
  construction: ['hammer', '#9a9aa2'], hitpoints: ['heart', '#d02828'], agility: ['boot', '#3a7a3a'], herblore: ['herb', '#4a9a3a'],
  thieving: ['mask', '#4a3a5a'], crafting: ['chisel', '#a0a0a8'], fletching: ['arrow', '#c0c0c8'], slayer: ['skull', '#e8e4d4'],
  hunter: ['paw', '#8a6a4a'], mining: ['pickaxe', '#8a8a92'], smithing: ['anvil', '#5a5a62'], fishing: ['fish', '#6a9ac8'],
  cooking: ['chef', '#f0f0f0'], firemaking: ['flame', '#f08020'], woodcutting: ['tree', '#3a8a2a'], farming: ['sprout', '#5aaa3a'],
};

export function getSkillIcon(skill) {
  const key = `skill|${skill}`;
  let url = cache.get(key);
  if (!url) {
    const [shape, c, c2] = SKILL_ICONS[skill] || ['generic', '#888'];
    url = draw(shape, c, c2, null, 1);
    cache.set(key, url);
  }
  return url;
}

/** Generic icon from a shape + colour (for spells, prayers, tabs). */
export function getShapeIcon(shape, color, color2) {
  const key = `shape|${shape}|${color}|${color2}`;
  let url = cache.get(key);
  if (!url) { url = draw(shape, color, color2, null, 1); cache.set(key, url); }
  return url;
}
