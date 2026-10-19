// Gathering visuals: scenery templates (farming patches, hunter traps, essence rock, compost bin)
// and inventory icon shapes for gathering tools/products. OWNER: agent B.
// Imported first by content/gathering.js.

import * as THREE from 'three';
import { registerSceneryTemplate, getSceneryTemplate } from '../render/models.js';
import { registerIconShape } from '../ui/icons.js';

const _a = new THREE.Color(), _b = new THREE.Color();
/** Mix two hex colours (t = 0 -> a, 1 -> b). */
export function mix(a, b, t) { _a.set(a); _b.set(b); _a.lerp(_b, t); return '#' + _a.getHexString(); }
const shade = (hex, f) => { _a.set(hex); _a.multiplyScalar(f); return '#' + _a.getHexString(); };

// small deterministic rng so a patch looks the same every time it is rebuilt
function rng(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// =================================================================================================
// Farming patch: soil bed + weeds / crops / herbs / tree by growth stage
//   model: { template: 'farm_patch', kind: 'allotment'|'herb'|'tree', weeds: 0-3, look: 'veg'|'herb'|'tree'|null,
//            pc: plant colour, fc: fruit colour, f: growth 0..1, ripe: bool, cond: 'ok'|'diseased'|'dead',
//            tree: tree variant, stump: bool }
// =================================================================================================
const SOIL = '#5b3e27', EDGE = '#7a5a36';

registerSceneryTemplate('farm_patch', (b, p) => {
  const w = p.w || 1, h = p.h || 1;
  const r = rng(w * 31 + h * 17 + (p.weeds || 0) * 7 + Math.round((p.f || 0) * 13));
  // bed + wooden edging
  b.box(p.weeds >= 2 ? '#4f4a26' : SOIL, w - 0.15, 0.14, h - 0.15, [0, 0.07, 0], [0, 0, 0], 0.12);
  b.box(EDGE, w - 0.05, 0.12, 0.08, [0, 0.08, -(h / 2) + 0.06]);
  b.box(EDGE, w - 0.05, 0.12, 0.08, [0, 0.08, h / 2 - 0.06]);
  b.box(EDGE, 0.08, 0.12, h - 0.05, [-(w / 2) + 0.06, 0.08, 0]);
  b.box(EDGE, 0.08, 0.12, h - 0.05, [w / 2 - 0.06, 0.08, 0]);
  // furrows for allotments
  if (p.kind === 'allotment' && !p.weeds) for (let i = 0; i < 3; i++) b.box(shade(SOIL, 0.8), w - 0.35, 0.03, 0.06, [0, 0.15, -h / 2 + (i + 1) * (h / 4)], [0, 0, 0], 0.05);

  // weeds
  const nWeeds = (p.weeds || 0) * Math.round(w * h * 2.2);
  for (let i = 0; i < nWeeds; i++) {
    const x = (r() - 0.5) * (w - 0.4), z = (r() - 0.5) * (h - 0.4);
    const ht = 0.18 + r() * 0.25 * (p.weeds / 2);
    b.cone(mix('#5f8a2a', '#8a9a3a', r()), 0.07 + r() * 0.05, ht, 4, [x, 0.14 + ht / 2, z], [r() * 0.3, r() * 3, 0], 0.15);
  }
  if (!p.look) return;

  const cond = p.cond || 'ok';
  const tint = (c) => (cond === 'dead' ? mix(c, '#5a4a35', 0.85) : cond === 'diseased' ? mix(c, '#9a7a3a', 0.5) : c);
  const f = Math.max(0.12, p.f || 0);
  const pc = tint(p.pc || '#5a9a3a'), fc = tint(p.fc || '#d04030');

  if (p.look === 'tree') {
    if (p.stump) { getSceneryTemplate('stump').fn(b, { variant: p.tree, w: 1, h: 1 }); return; }
    const tpl = getSceneryTemplate('tree');
    if (f >= 1 && cond === 'ok') { tpl.fn(b, { variant: p.tree, w, h, scale: 1.25 }); return; }
    // sapling / young tree
    tpl.fn(b, { variant: p.tree, w, h, scale: 0.3 + f * 0.8, colors: cond === 'ok' ? undefined : { leaf: tint('#4a7a2a'), trunk: tint('#6b4a2b') } });
    return;
  }
  if (p.look === 'herb') {
    const cols = Math.max(2, Math.round(w * 1.6)), rows = Math.max(2, Math.round(h * 1.6));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = -w / 2 + (i + 0.5) * (w / cols), z = -h / 2 + (j + 0.5) * (h / rows);
      const ht = 0.12 + f * 0.4;
      for (let k = 0; k < 3; k++) b.cone(pc, 0.05, ht, 4, [x + (k - 1) * 0.06, 0.14 + ht / 2, z + (k % 2) * 0.05], [(k - 1) * 0.35, k, (k - 1) * 0.2], 0.12);
      if (p.ripe && cond !== 'dead') b.sphere(fc, 0.06, [x, 0.14 + ht + 0.03, z]);
    }
    return;
  }
  // veg (allotment)
  const cols = Math.max(2, Math.round(w * 1.4)), rows = Math.max(2, Math.round(h * 1.3));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = -w / 2 + (i + 0.5) * (w / cols), z = -h / 2 + (j + 0.5) * (h / rows);
    const s = 0.08 + f * 0.17;
    if (p.tall) { // corn-like stalks
      const ht = 0.2 + f * 0.75;
      b.cyl(pc, 0.03, 0.04, ht, 4, [x, 0.14 + ht / 2, z]);
      b.cone(shade(pc, 1.1), 0.12 * f + 0.04, ht * 0.6, 4, [x, 0.14 + ht * 0.6, z], [0, i + j, 0]);
      if (p.ripe && cond !== 'dead') b.cyl(fc, 0.05, 0.05, 0.2, 5, [x + 0.06, 0.14 + ht * 0.55, z], [0, 0, 0.3]);
    } else {
      b.sphere(pc, s, [x, 0.14 + s * 0.7, z], [1.2, 0.7, 1.2], 0, 0.15);
      b.sphere(shade(pc, 1.15), s * 0.7, [x + s * 0.4, 0.14 + s, z - s * 0.3], [1, 0.7, 1], 0, 0.15);
      if (p.ripe && cond !== 'dead') { b.sphere(fc, p.big ? 0.16 : 0.08, [x - s * 0.35, 0.14 + (p.big ? 0.1 : s * 1.3), z + s * 0.35], [1, p.big ? 0.8 : 1, 1], 0, 0.1); if (!p.big) b.sphere(fc, 0.07, [x + s * 0.4, 0.14 + s * 1.2, z - s * 0.1], [1, 1, 1], 0, 0.1); }
    }
  }
});

// =================================================================================================
// Hunter traps: model { template: 'hunter_trap', trap: 'snare'|'box', state: 'set'|'full'|'failed', color }
// =================================================================================================
registerSceneryTemplate('hunter_trap', (b, p) => {
  const wood = '#8a6a40';
  if (p.trap === 'box') {
    const tipped = p.state === 'failed';
    const rot = tipped ? [0, 0.4, 0.5] : [0, 0.4, 0];
    const y = tipped ? 0.22 : 0.18;
    b.box(wood, 0.55, 0.34, 0.42, [0, y, 0], rot, 0.12);
    for (const dz of [-0.12, 0, 0.12]) b.box(shade(wood, 0.75), 0.57, 0.04, 0.03, [0, y + 0.1, dz], rot, 0.05);
    if (p.state === 'set') {
      b.box(shade(wood, 1.1), 0.04, 0.3, 0.4, [0.36, 0.3, 0], [0, 0.4, -0.7]); // propped door
      b.cyl('#c8b080', 0.01, 0.01, 0.3, 3, [0.2, 0.32, 0], [0, 0, 0.6]);
      b.sphere('#c04030', 0.04, [0, 0.06, 0]); // bait
    } else {
      b.box(shade(wood, 1.1), 0.04, 0.34, 0.42, [0.28, y, 0], rot);
      if (p.state === 'full') b.cone(p.color || '#7a7a7a', 0.04, 0.14, 4, [-0.32, 0.2, 0.05], [0, 0, -1.2]); // tail poking out
    }
    return;
  }
  // bird snare: bent sapling + noose
  const bent = p.state === 'set';
  b.cyl('#3a2a1a', 0.06, 0.06, 0.08, 5, [0.3, 0.04, 0]); // stake
  b.cyl('#7a5a32', 0.035, 0.05, 0.8, 5, [0.2, 0.38, 0], [0, 0, bent ? 0.75 : 0.1]);
  b.cyl('#7a5a32', 0.025, 0.025, 0.3, 4, [-0.1, 0.1, 0], [0, 0, 1.2]);
  b.sphere('#5a8a3a', 0.08, [bent ? -0.08 : 0.25, bent ? 0.62 : 0.78, 0], [1, 0.7, 1]); // leafy tip
  if (bent) b.add(new THREE.TorusGeometry(0.16, 0.02, 3, 12), '#e8d898', [-0.2, 0.05, 0], [Math.PI / 2, 0, 0], 1, 0);
  else b.cyl('#e8d898', 0.012, 0.012, 0.4, 3, [0.3, 0.55, 0]);
  if (p.state === 'full') {
    const c = p.color || '#c04030';
    b.sphere(c, 0.13, [0.3, 0.3, 0], [0.8, 1, 1.2]);
    b.cone(shade(c, 0.8), 0.07, 0.16, 4, [0.3, 0.13, 0], [Math.PI, 0, 0]);
    b.cone('#e8b030', 0.025, 0.07, 4, [0.3, 0.33, 0.15], [Math.PI / 2, 0, 0]);
  }
  if (p.state === 'failed') b.add(new THREE.TorusGeometry(0.12, 0.02, 3, 12), '#e8d898', [0.05, 0.03, 0.15], [Math.PI / 2, 0, 0], 1, 0);
});

// =================================================================================================
// Ore rock: engine rock + chunky ore veins.  model { template: 'ore_rock', ore: colour, rare?: bool }
// =================================================================================================
registerSceneryTemplate('ore_rock', (b, p) => {
  const sc = 1.1;
  getSceneryTemplate('rock').fn(b, { color: p.color || '#7d776e', scale: sc });
  const ore = p.ore || '#c87a3a';
  const dirs = [[0.2, 0.9, 0.4], [-0.6, 0.6, 0.4], [0.7, 0.5, -0.3], [-0.2, 0.7, -0.7], [0.8, 0.3, 0.5], [-0.8, 0.35, -0.3], [0.1, 0.5, 0.9], [-0.4, 0.95, -0.1], [0.5, 0.75, 0.1]];
  dirs.forEach(([x, y, z], i) => {
    const l = Math.hypot(x, y, z);
    const r = 0.42 * sc * 0.97;
    const pos = [(x / l) * r * 1.1, 0.28 * sc + (y / l) * r * 0.75, (z / l) * r];
    const s = 0.07 + (i % 3) * 0.025;
    b.add(new THREE.OctahedronGeometry(s, 0), i % 4 === 0 ? mix(ore, '#ffffff', 0.35) : ore, pos, [x * 2, y * 3, z], [1.3, 0.8, 1.1], 0.12);
  });
  if (p.rare) for (const [x, y, z] of [[0.15, 0.62, 0.15], [-0.2, 0.55, -0.15]]) b.add(new THREE.OctahedronGeometry(0.06, 0), '#ffffff', [x, y, z], [0, 0, 0], [0.6, 1.6, 0.6], 0);
});

// =================================================================================================
// Pale essence rock (2x2, never depletes), compost bin, seed crate
// =================================================================================================
registerSceneryTemplate('essence_rock', (b, p) => {
  const c = p.color || '#cfc8e8';
  b.dodeca(shade(c, 0.85), 0.8, [0, 0.5, 0], [1.2, 0.75, 1.1], [0.3, 0.4, 0], 0.12);
  b.dodeca(c, 0.55, [0.45, 0.4, 0.35], [1, 0.9, 1], [0.2, 1.1, 0.4], 0.12);
  b.dodeca(shade(c, 0.95), 0.5, [-0.5, 0.35, -0.3], [1, 0.9, 1], [0.6, 0.3, 0.2], 0.12);
  const crystals = [[0.1, 1.0, 0.1, 0.3], [-0.3, 0.85, 0.25, -0.4], [0.45, 0.8, -0.25, 0.5], [-0.15, 0.7, -0.5, -0.2], [0.6, 0.6, 0.55, 0.7]];
  for (const [x, y, z, t] of crystals) b.add(new THREE.OctahedronGeometry(0.16, 0), '#f2eeff', [x, y, z], [t, t * 2, t], [0.7, 1.8, 0.7], 0.08);
});

registerSceneryTemplate('compost_bin', (b) => {
  const wood = '#6a4a2a';
  b.box(wood, 0.9, 0.6, 0.9, [0, 0.3, 0], [0, 0, 0], 0.1);
  for (const y of [0.15, 0.35, 0.55]) b.box(shade(wood, 0.8), 0.92, 0.05, 0.92, [0, y, 0], [0, 0, 0], 0.05);
  b.box('#3a2a18', 0.8, 0.04, 0.8, [0, 0.61, 0]);
  b.sphere('#4a6a2a', 0.18, [0.15, 0.62, -0.1], [1.2, 0.4, 1]);
});

// =================================================================================================
// Icons (36x32 canvas)
// =================================================================================================
const P = {};
function stroke(ctx, pts, color, w = 2.4) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [col, lw] of [['#000', w + 2], [color, w]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  }
  ctx.restore();
}
function fillPoly(ctx, pts, color) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.stroke();
}
function fillEllipse(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.stroke();
}
const WOOD = '#7a5228';

P.rake = (ctx, c) => { stroke(ctx, [8, 30, 24, 8], WOOD); stroke(ctx, [18, 4, 32, 14], c || '#8a8a92', 2.4); for (let i = 0; i < 4; i++) stroke(ctx, [20 + i * 3.5, 5.5 + i * 2.5, 18 + i * 3.5, 9 + i * 2.5], c || '#8a8a92', 1.2); };
P.spade = (ctx, c) => { stroke(ctx, [24, 4, 14, 22], WOOD); stroke(ctx, [21, 3, 28, 6], WOOD, 2); fillPoly(ctx, [11, 18, 18, 23, 13, 31, 6, 27], c || '#9a9aa2'); };
P.dibber = (ctx) => { stroke(ctx, [10, 6, 22, 6], WOOD, 3); stroke(ctx, [16, 6, 16, 22], WOOD, 3.5); fillPoly(ctx, [13.5, 21, 18.5, 21, 16, 30], '#5a3a1a'); };
P.watering_can = (ctx, c) => { fillPoly(ctx, [8, 12, 22, 12, 23, 28, 7, 28], c || '#7a8a7a'); stroke(ctx, [22, 22, 31, 10], c || '#7a8a7a', 2.6); fillEllipse(ctx, 31, 9, 2.5, 2, c || '#7a8a7a'); ctx.beginPath(); ctx.arc(15, 12, 6, Math.PI, 0); ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke(); };
P.rod = (ctx, c) => { stroke(ctx, [6, 30, 30, 4], c || '#8a6a3a', 2); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(30, 4); ctx.quadraticCurveTo(33, 18, 28, 26); ctx.stroke(); fillEllipse(ctx, 11, 25, 3, 3, '#444'); };
P.harpoon = (ctx, c) => { stroke(ctx, [5, 31, 25, 9], WOOD, 2.4); fillPoly(ctx, [23, 11, 31, 2, 27, 13], c || '#a0a0a8'); stroke(ctx, [25, 10, 23, 5], c || '#a0a0a8', 1.4); stroke(ctx, [26, 12, 31, 10], c || '#a0a0a8', 1.4); };
P.cage = (ctx, c) => { const col = c || '#8a6a3a'; ctx.beginPath(); ctx.moveTo(6, 28); ctx.lineTo(6, 14); ctx.quadraticCurveTo(18, 0, 30, 14); ctx.lineTo(30, 28); ctx.closePath(); ctx.fillStyle = 'rgba(60,40,20,0.35)'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke(); for (const x of [12, 18, 24]) stroke(ctx, [x, 7, x, 28], col, 1); stroke(ctx, [6, 20, 30, 20], col, 1); };
P.snare = (ctx, c) => { stroke(ctx, [8, 30, 14, 8], WOOD, 2); ctx.beginPath(); ctx.ellipse(22, 20, 7, 5, 0.3, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = c || '#e0d090'; ctx.stroke(); stroke(ctx, [14, 8, 17, 16], c || '#e0d090', 1.2); };
P.box_trap = (ctx, c) => { fillPoly(ctx, [5, 13, 25, 13, 25, 28, 5, 28], c || '#8a6a40'); fillPoly(ctx, [25, 13, 31, 9, 31, 24, 25, 28], '#6a4a2a'); fillPoly(ctx, [5, 13, 11, 9, 31, 9, 25, 13], '#a08050'); ctx.fillStyle = '#2a1a0a'; ctx.fillRect(8, 17, 14, 2); ctx.fillRect(8, 22, 14, 2); };
P.butterfly_net = (ctx, c) => { stroke(ctx, [6, 31, 20, 14], WOOD, 2.2); ctx.beginPath(); ctx.ellipse(25, 9, 8, 6, -0.6, 0, 7); ctx.fillStyle = 'rgba(240,240,230,0.55)'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = c || '#ddd'; ctx.stroke(); };
P.jar = (ctx, c, c2) => { fillPoly(ctx, [13, 4, 23, 4, 23, 8, 13, 8], '#8a6a40'); ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(24, 8); ctx.quadraticCurveTo(30, 12, 28, 28); ctx.lineTo(8, 28); ctx.quadraticCurveTo(6, 12, 12, 8); ctx.closePath(); ctx.fillStyle = 'rgba(200,225,235,0.45)'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke(); if (c2) { fillEllipse(ctx, 15, 18, 4, 2.5, c2, -0.6); fillEllipse(ctx, 21, 18, 4, 2.5, c2, 0.6); stroke(ctx, [18, 15, 18, 22], '#222', 1); } };
P.nest = (ctx, c, c2) => { fillEllipse(ctx, 18, 20, 13, 7, c || '#8a6a3a'); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(7 + i * 4, 15 + (i % 2) * 3); ctx.lineTo(10 + i * 4, 25 - (i % 2) * 2); ctx.stroke(); } fillEllipse(ctx, 18, 17, 8, 3.5, '#4a3418'); if (c2) for (const [x, y] of [[14, 15], [19, 14], [22, 16]]) fillEllipse(ctx, x, y, 2.4, 1.6, c2, 0.5); };
P.critter = (ctx, c) => { fillEllipse(ctx, 17, 19, 10, 7, c || '#8a8a88'); fillEllipse(ctx, 26, 13, 5, 5, c || '#8a8a88'); fillPoly(ctx, [8, 16, 2, 8, 6, 20], c || '#8a8a88'); ctx.fillStyle = '#000'; ctx.fillRect(27, 11, 2, 2); fillEllipse(ctx, 24, 8, 1.8, 3, c || '#8a8a88'); };
P.fur = (ctx, c) => { ctx.beginPath(); ctx.moveTo(6, 10); ctx.quadraticCurveTo(18, 4, 30, 10); ctx.lineTo(28, 26); ctx.quadraticCurveTo(18, 30, 8, 26); ctx.closePath(); ctx.fillStyle = c || '#8a6a4a'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 3.5, 12); ctx.lineTo(9 + i * 3.5, 24); ctx.stroke(); } };
P.produce = (ctx, c, c2) => { fillEllipse(ctx, 18, 19, 10, 9, c || '#c04030'); stroke(ctx, [18, 11, 20, 5], '#4a6a2a', 1.6); fillEllipse(ctx, 23, 7, 4, 2, c2 || '#5a9a3a', -0.4); };
P.weeds = (ctx, c) => { for (let i = 0; i < 6; i++) { const x = 8 + i * 4; stroke(ctx, [x, 29, x + (i % 2 ? 3 : -3), 10 + (i % 3) * 4], c || '#6a8a2a', 1.6); } };
P.sack = (ctx, c) => { ctx.beginPath(); ctx.moveTo(12, 9); ctx.lineTo(24, 9); ctx.quadraticCurveTo(32, 20, 27, 29); ctx.lineTo(9, 29); ctx.quadraticCurveTo(4, 20, 12, 9); ctx.closePath(); ctx.fillStyle = '#b09060'; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke(); fillEllipse(ctx, 18, 10, 7, 2.5, c || '#4a3a20'); stroke(ctx, [13, 12, 23, 12], '#6a4a2a', 1.2); };

for (const [name, fn] of Object.entries(P)) registerIconShape(name, fn);
