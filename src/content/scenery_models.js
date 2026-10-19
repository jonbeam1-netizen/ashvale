// Decorative scenery templates (low-poly, instancing-friendly). OWNER: agent D (world builder).
// Imported by content/objects.js. Every static template here is merged into one geometry per
// variant and rendered instanced, so keep primitive counts modest. Animated templates (windmill,
// waterfall, lighthouse lamp, banners) are individual meshes - only a handful exist in the world.
//
// Units: 1 = one tile. Origin = centre of the footprint on the ground, +Y up, model faces +Z (south).

import * as THREE from 'three';
import { registerSceneryTemplate as T, GeoBuilder, VC_MATERIAL } from '../render/models.js';

const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };
const WOOD = '#7a5530', DARKWOOD = '#4e3420', STONE = '#8f897d', IRON = '#3a3a40', GOLD = '#d8b84a';
const basic = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, ...opts });

// ------------------------------------------------------------------------------------------------
// Furniture
// ------------------------------------------------------------------------------------------------
T('dec_chair', (b, p) => {
  const c = p.color || WOOD;
  b.box(c, 0.5, 0.07, 0.5, [0, 0.45, 0]);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.box(shade(c, 0.8), 0.06, 0.45, 0.06, [x, 0.22, z]);
  b.box(c, 0.5, 0.55, 0.06, [0, 0.75, -0.22]);
  if (p.cushion) b.box(p.cushion, 0.42, 0.05, 0.42, [0, 0.5, 0.02], [0, 0, 0], 0.02);
});

T('dec_stool', (b, p) => {
  const c = p.color || WOOD;
  b.cyl(c, 0.2, 0.2, 0.06, 8, [0, 0.45, 0]);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; b.box(shade(c, 0.8), 0.05, 0.45, 0.05, [Math.cos(a) * 0.13, 0.22, Math.sin(a) * 0.13]); }
});

T('dec_bench', (b, p) => {
  const c = p.color || WOOD, L = Math.max(p.w, p.h) - 0.1;
  const along = p.w >= p.h;
  const box = (col, x, y, z, sx, sy, sz) => along ? b.box(col, sx, sy, sz, [x, y, z]) : b.box(col, sz, sy, sx, [z, y, x]);
  box(c, 0, 0.42, 0, L, 0.07, 0.42);
  for (const x of [-L / 2 + 0.12, L / 2 - 0.12]) box(shade(c, 0.8), x, 0.2, 0, 0.08, 0.4, 0.36);
  if (p.back) box(c, 0, 0.72, -0.2, L, 0.4, 0.06);
});

T('dec_bed', (b, p) => {
  const c = p.color || DARKWOOD, blanket = p.blanket || '#8a3a3a';
  b.box(c, 0.9, 0.3, 1.9, [0, 0.15, 0]);
  b.box('#e8e2d0', 0.82, 0.12, 1.8, [0, 0.36, 0], [0, 0, 0], 0.02);
  b.box(blanket, 0.86, 0.1, 1.2, [0, 0.42, 0.3], [0, 0, 0], 0.05);
  b.box('#f4f0e6', 0.5, 0.1, 0.3, [0, 0.46, -0.68], [0, 0, 0], 0.02);
  b.box(c, 0.9, 0.7, 0.08, [0, 0.35, -0.95]);
  b.box(c, 0.9, 0.45, 0.08, [0, 0.22, 0.95]);
});

T('dec_bookshelf', (b, p) => {
  const c = p.color || DARKWOOD;
  b.box(c, 0.95, 1.9, 0.06, [0, 0.95, -0.44]);
  for (const x of [-0.45, 0.45]) b.box(shade(c, 0.9), 0.06, 1.9, 0.42, [x, 0.95, -0.24]);
  b.box(shade(c, 0.9), 0.96, 0.06, 0.44, [0, 1.9, -0.23]);
  const books = ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#8a6a2a', '#5a3a6a', '#a08060'];
  for (let s = 0; s < 4; s++) {
    b.box(shade(c, 1.2), 0.9, 0.04, 0.36, [0, 0.12 + s * 0.45, -0.22]);
    for (let i = 0; i < 6; i++) {
      const hgt = 0.26 + ((i * 7 + s * 3) % 4) * 0.03;
      b.box(books[(i + s * 2) % books.length], 0.12, hgt, 0.28, [-0.36 + i * 0.145, 0.14 + s * 0.45 + hgt / 2, -0.2], [0, 0, ((i + s) % 5 === 0) ? 0.2 : 0], 0.08);
    }
  }
});

T('dec_fireplace', (b, p) => {
  const c = p.color || '#7d776c';
  b.box(c, 1.0, 1.2, 0.55, [0, 0.6, -0.2], [0, 0, 0], 0.12);
  b.box(shade(c, 0.85), 1.1, 0.12, 0.65, [0, 1.2, -0.17]);
  b.box(c, 0.6, 1.4, 0.4, [0, 1.95, -0.28], [0, 0, 0], 0.12);
  b.box('#141010', 0.6, 0.55, 0.1, [0, 0.38, 0.05], [0, 0, 0], 0);
  b.box('#5a3a20', 0.45, 0.08, 0.12, [0, 0.16, 0.1], [0, 0.3, 0]);
  b.cone('#ff8a20', 0.14, 0.32, 5, [-0.08, 0.32, 0.12], [0, 0, 0], 0);
  b.cone('#ffd050', 0.09, 0.24, 5, [0.1, 0.28, 0.13], [0, 0, 0], 0);
});

T('dec_counter', (b, p) => {
  const c = p.color || WOOD, L = Math.max(p.w, p.h);
  const along = p.w >= p.h;
  const [sx, sz] = along ? [L, 0.7] : [0.7, L];
  b.box(shade(c, 0.85), sx - 0.05, 0.95, sz - 0.05, [0, 0.47, 0]);
  b.box(c, sx, 0.08, sz + 0.06, [0, 0.98, 0]);
  if (p.goods) for (let i = 0; i < L * 2; i++) {
    const t = -L / 2 + 0.25 + i * 0.5;
    b.box(p.goods[i % p.goods.length], 0.18, 0.18, 0.18, along ? [t, 1.11, 0] : [0, 1.11, t], [0, i, 0]);
  }
});

T('dec_wardrobe', (b, p) => {
  const c = p.color || DARKWOOD;
  b.box(c, 0.9, 1.9, 0.5, [0, 0.95, -0.2]);
  b.box(shade(c, 1.15), 0.42, 1.7, 0.03, [-0.22, 0.95, 0.06]);
  b.box(shade(c, 1.15), 0.42, 1.7, 0.03, [0.22, 0.95, 0.06]);
  b.sphere(GOLD, 0.035, [-0.05, 1.0, 0.09]); b.sphere(GOLD, 0.035, [0.05, 1.0, 0.09]);
  b.box(shade(c, 0.8), 0.96, 0.08, 0.56, [0, 1.92, -0.2]);
});

T('dec_rug', (b, p) => {
  const c = p.color || '#8a2a2a', c2 = p.trim || '#d8b84a';
  b.box(c2, p.w - 0.15, 0.02, p.h - 0.15, [0, 0.01, 0], [0, 0, 0], 0.02);
  b.box(c, p.w - 0.35, 0.025, p.h - 0.35, [0, 0.015, 0], [0, 0, 0], 0.03);
  if (p.w >= 2 && p.h >= 2) b.box(c2, 0.4, 0.03, 0.4, [0, 0.02, 0], [0, Math.PI / 4, 0], 0.02);
});

T('dec_candles', (b, p) => {
  const c = p.color || IRON;
  b.cyl(c, 0.04, 0.04, p.tall ? 1.3 : 0.9, 5, [0, p.tall ? 0.65 : 0.45, 0]);
  b.cyl(c, 0.18, 0.2, 0.05, 6, [0, 0.03, 0]);
  const top = p.tall ? 1.3 : 0.9;
  b.box(c, 0.5, 0.04, 0.04, [0, top, 0]);
  for (const x of [-0.24, 0, 0.24]) {
    b.cyl('#f2eee0', 0.035, 0.035, 0.16, 5, [x, top + 0.1, 0]);
    b.cone('#ffd050', 0.03, 0.08, 4, [x, top + 0.22, 0], [0, 0, 0], 0);
  }
});

T('dec_cauldron', (b, p) => {
  b.sphere(IRON, 0.38, [0, 0.42, 0], [1, 0.75, 1], 1, 0.05);
  b.cyl(shade(IRON, 1.2), 0.32, 0.32, 0.05, 10, [0, 0.66, 0]);
  b.cyl(p.brew || '#5aa040', 0.29, 0.29, 0.04, 10, [0, 0.67, 0], [0, 0, 0], 0);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; b.box(IRON, 0.05, 0.25, 0.05, [Math.cos(a) * 0.28, 0.1, Math.sin(a) * 0.28]); }
  if (p.fire) { b.cone('#ff8a20', 0.18, 0.25, 5, [0, 0.13, 0], [0, 0, 0], 0); }
});

T('dec_throne', (b, p) => {
  const c = p.color || GOLD, cl = p.cloth || '#8a1a2a';
  b.box(shade(STONE, 0.9), 1.3, 0.25, 1.1, [0, 0.12, 0]);
  b.box(c, 0.9, 0.5, 0.7, [0, 0.5, 0]);
  b.box(cl, 0.75, 0.08, 0.6, [0, 0.79, 0.03], [0, 0, 0], 0.03);
  b.box(c, 0.9, 1.6, 0.14, [0, 1.3, -0.3]);
  b.box(cl, 0.6, 1.1, 0.03, [0, 1.25, -0.22], [0, 0, 0], 0.03);
  for (const x of [-0.42, 0.42]) { b.box(c, 0.1, 0.35, 0.65, [x, 0.95, 0]); b.sphere(c, 0.08, [x, 2.15, -0.3]); }
  b.cone(c, 0.12, 0.3, 4, [0, 2.25, -0.3]);
});

T('dec_pew', (b, p) => {
  const c = p.color || DARKWOOD, L = p.w - 0.1;
  b.box(c, L, 0.07, 0.45, [0, 0.42, 0]);
  b.box(c, L, 0.55, 0.06, [0, 0.72, -0.2]);
  for (const x of [-L / 2 + 0.05, L / 2 - 0.05]) b.box(shade(c, 0.8), 0.08, 0.95, 0.5, [x, 0.47, 0]);
});

T('dec_weapon_rack', (b, p) => {
  b.box(WOOD, 1.0, 0.08, 0.3, [0, 0.15, -0.2]);
  b.box(WOOD, 1.0, 0.08, 0.1, [0, 1.1, -0.3]);
  for (const x of [-0.45, 0.45]) b.box(DARKWOOD, 0.08, 1.2, 0.08, [x, 0.6, -0.3]);
  const m = p.metal || '#a3abb4';
  for (let i = 0; i < 4; i++) {
    const x = -0.3 + i * 0.2;
    b.box(m, 0.05, 0.85, 0.02, [x, 0.65, -0.22], [0.15, 0, 0]);
    b.box(GOLD, 0.14, 0.03, 0.04, [x, 0.25, -0.18]);
  }
});

T('dec_armour_stand', (b, p) => {
  const m = p.metal || '#a3abb4';
  b.cyl(DARKWOOD, 0.25, 0.28, 0.08, 7, [0, 0.04, 0]);
  b.box(DARKWOOD, 0.06, 1.3, 0.06, [0, 0.7, 0]);
  b.box(m, 0.48, 0.55, 0.28, [0, 1.2, 0], [0, 0, 0], 0.1);
  b.box(shade(m, 1.15), 0.62, 0.12, 0.3, [0, 1.45, 0]);
  b.cyl(m, 0.15, 0.17, 0.25, 7, [0, 1.65, 0]);
  b.box('#111', 0.18, 0.03, 0.02, [0, 1.65, 0.16], [0, 0, 0], 0);
});

T('dec_potted_plant', (b, p) => {
  b.cyl(p.pot || '#a0523a', 0.18, 0.13, 0.3, 7, [0, 0.15, 0]);
  b.sphere(p.color || '#3f8a3a', 0.24, [0, 0.45, 0], [1, 0.9, 1], 0, 0.15);
  if (p.bloom) for (let i = 0; i < 4; i++) b.sphere(p.bloom, 0.05, [Math.cos(i * 1.6) * 0.18, 0.55, Math.sin(i * 1.6) * 0.18]);
});

T('dec_keg_rack', (b) => {
  b.box(DARKWOOD, 1.0, 0.1, 0.6, [0, 0.05, 0]);
  for (const y of [0.32, 0.82]) for (const x of [-0.25, 0.25]) {
    b.cyl('#7a5530', 0.22, 0.22, 0.5, 8, [x, y, 0], [Math.PI / 2, 0, 0]);
    b.cyl(IRON, 0.23, 0.23, 0.04, 8, [x, y, 0.15], [Math.PI / 2, 0, 0]);
  }
  for (const x of [-0.5, 0.5]) b.box(DARKWOOD, 0.06, 1.1, 0.6, [x, 0.55, 0]);
});

T('dec_sacks', (b, p) => {
  const c = p.color || '#c8b088';
  b.sphere(c, 0.25, [-0.15, 0.22, 0], [1, 1.1, 0.9], 0, 0.1);
  b.sphere(shade(c, 0.92), 0.24, [0.18, 0.2, 0.1], [1, 1.05, 0.9], 0, 0.1);
  b.sphere(shade(c, 1.05), 0.22, [0.02, 0.5, 0.04], [1, 1, 0.9], 0, 0.1);
});

T('dec_shelves', (b, p) => {
  const c = p.color || WOOD;
  for (const x of [-0.45, 0.45]) b.box(shade(c, 0.8), 0.06, 1.6, 0.35, [x, 0.8, -0.25]);
  const goods = p.goods || ['#c84a3a', '#d8c070', '#6a9a4a', '#4a6aa0', '#a07a50'];
  for (let s = 0; s < 3; s++) {
    b.box(c, 0.95, 0.05, 0.35, [0, 0.35 + s * 0.5, -0.25]);
    for (let i = 0; i < 4; i++) {
      const g = goods[(i + s) % goods.length];
      if ((i + s) % 2) b.cyl(g, 0.07, 0.07, 0.2, 6, [-0.3 + i * 0.2, 0.48 + s * 0.5, -0.22]);
      else b.box(g, 0.14, 0.16, 0.14, [-0.3 + i * 0.2, 0.46 + s * 0.5, -0.22], [0, i, 0]);
    }
  }
});

T('dec_desk', (b, p) => {
  const c = p.color || DARKWOOD;
  b.box(c, 1.0, 0.07, 0.6, [0, 0.74, 0]);
  b.box(shade(c, 0.85), 0.3, 0.7, 0.55, [-0.33, 0.36, 0]);
  b.box(shade(c, 0.85), 0.06, 0.7, 0.55, [0.45, 0.36, 0]);
  b.box('#f2ead0', 0.3, 0.01, 0.22, [0.1, 0.78, 0.05], [0, 0.3, 0], 0);
  b.cyl('#2a2a3a', 0.04, 0.05, 0.08, 6, [0.3, 0.82, -0.1]);
  b.box('#7a2a2a', 0.22, 0.06, 0.3, [-0.2, 0.8, -0.05], [0, -0.2, 0]);
});

T('dec_chest_deco', (b, p) => {
  const c = p.color || '#6a4426';
  b.box(c, 0.8, 0.45, 0.55, [0, 0.23, 0]);
  b.cyl(shade(c, 1.1), 0.28, 0.28, 0.8, 8, [0, 0.45, 0], [0, 0, Math.PI / 2]);
  b.box(IRON, 0.84, 0.06, 0.06, [0, 0.45, 0.28]);
  for (const x of [-0.3, 0.3]) b.box(IRON, 0.06, 0.5, 0.58, [x, 0.3, 0]);
  b.box(GOLD, 0.1, 0.12, 0.04, [0, 0.4, 0.3]);
  if (p.open) for (let i = 0; i < 6; i++) b.cyl(GOLD, 0.06, 0.06, 0.02, 6, [-0.25 + i * 0.1, 0.5 + (i % 2) * 0.03, 0.05]);
});

T('dec_coffin', (b, p) => {
  const c = p.color || '#4a3424';
  b.box(c, 0.6, 0.4, 1.7, [0, 0.2, 0], [0, 0, 0], 0.06);
  b.box(shade(c, 1.15), 0.64, 0.08, 1.74, [0, 0.42, 0]);
  b.box('#c8b88a', 0.08, 0.02, 0.5, [0, 0.47, -0.3], [0, 0, 0], 0);
  b.box('#c8b88a', 0.3, 0.02, 0.08, [0, 0.47, -0.42], [0, 0, 0], 0);
});

T('dec_sarcophagus', (b, p) => {
  const c = p.color || '#9a9488';
  b.box(shade(c, 0.85), 1.1, 0.2, 2.1, [0, 0.1, 0]);
  b.box(c, 0.95, 0.65, 1.95, [0, 0.52, 0], [0, 0, 0], 0.08);
  b.box(shade(c, 1.1), 1.0, 0.12, 2.0, [0, 0.9, 0]);
  b.sphere(shade(c, 1.05), 0.2, [0, 1.05, -0.65], [1, 0.8, 1.1]);
  b.box(shade(c, 1.05), 0.5, 0.15, 1.1, [0, 1.02, 0.1]);
  if (p.gilded) b.box(GOLD, 0.1, 0.05, 1.6, [0, 0.98, 0.05], [0, 0, 0], 0.02);
});

// ------------------------------------------------------------------------------------------------
// Town & street props
// ------------------------------------------------------------------------------------------------
T('dec_statue', (b, p) => {
  const c = p.color || '#b8b2a6', base = p.base || '#7d776c';
  const s = p.scale || 1;
  b.box(base, 1.1 * s, 0.6, 1.1 * s, [0, 0.3, 0], [0, 0, 0], 0.08);
  b.box(shade(base, 1.1), 1.2 * s, 0.1, 1.2 * s, [0, 0.62, 0]);
  if (p.headless) {
    b.box(c, 0.35 * s, 0.9 * s, 0.3 * s, [0, 0.67 + 0.45 * s, 0]);
    b.box(c, 0.5 * s, 0.25 * s, 0.32 * s, [0, 0.67 + 0.95 * s, 0]);
    return;
  }
  const y0 = 0.67;
  b.box(c, 0.22 * s, 0.7 * s, 0.24 * s, [-0.1 * s, y0 + 0.35 * s, 0]);
  b.box(c, 0.22 * s, 0.7 * s, 0.24 * s, [0.12 * s, y0 + 0.35 * s, 0.05 * s], [0.15, 0, 0]);
  b.box(c, 0.5 * s, 0.65 * s, 0.3 * s, [0, y0 + 1.0 * s, 0]);
  b.box(c, 0.26 * s, 0.28 * s, 0.26 * s, [0, y0 + 1.48 * s, 0]);
  b.box(c, 0.13 * s, 0.6 * s, 0.13 * s, [-0.33 * s, y0 + 1.0 * s, 0], [0, 0, -0.15]);
  b.box(c, 0.13 * s, 0.6 * s, 0.13 * s, [0.35 * s, y0 + 1.35 * s, 0.05], [0, 0, 2.6]);
  if (p.pose === 'sword') b.box(c, 0.07 * s, 1.0 * s, 0.03 * s, [0.42 * s, y0 + 1.95 * s, 0.05]);
  else if (p.pose === 'staff') { b.cyl(c, 0.03 * s, 0.03 * s, 1.6 * s, 5, [0.45 * s, y0 + 1.3 * s, 0.05]); b.sphere(p.gem || c, 0.08 * s, [0.45 * s, y0 + 2.1 * s, 0.05]); }
  else if (p.pose === 'axe') { b.box(c, 0.05 * s, 0.9 * s, 0.05 * s, [0.42 * s, y0 + 1.9 * s, 0.05]); b.box(c, 0.05 * s, 0.25 * s, 0.3 * s, [0.42 * s, y0 + 2.2 * s, 0.15]); }
  if (p.beard) b.box(c, 0.22 * s, 0.25 * s, 0.06 * s, [0, y0 + 1.33 * s, 0.15 * s]);
});

T('dec_fountain', (b, p) => {
  const c = p.color || '#a8a296', R = Math.min(p.w, p.h) / 2 - 0.1;
  b.cyl(c, R, R + 0.05, 0.5, 12, [0, 0.25, 0], [0, 0, 0], 0.08);
  b.cyl(p.water || '#4a8ab8', R - 0.15, R - 0.15, 0.04, 12, [0, 0.45, 0], [0, 0, 0], 0.04);
  b.cyl(c, 0.25, 0.3, 1.0, 8, [0, 0.8, 0]);
  b.cyl(c, 0.6, 0.35, 0.18, 10, [0, 1.3, 0]);
  b.cyl(p.water || '#4a8ab8', 0.5, 0.5, 0.03, 10, [0, 1.38, 0], [0, 0, 0], 0.04);
  b.cyl(c, 0.12, 0.15, 0.5, 6, [0, 1.6, 0]);
  b.sphere('#bfe0f4', 0.13, [0, 1.95, 0], [1, 1.3, 1], 0, 0);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b.cone('#a8d4f0', 0.06, 0.45, 4, [Math.cos(a) * 0.45, 1.15, Math.sin(a) * 0.45], [Math.PI, 0, 0], 0); }
});

T('dec_tent', (b, p) => {
  const c = p.color || '#c8b088', W = p.w - 0.1, D = p.h - 0.1;
  const geo = new THREE.BufferGeometry();
  const hw = W / 2, hd = D / 2, H = p.tall || 1.6;
  const v = [
    -hw, 0, hd, hw, 0, hd, 0, H, hd * 0.95,
    hw, 0, -hd, -hw, 0, -hd, 0, H, -hd * 0.95,
    -hw, 0, -hd, -hw, 0, hd, 0, H, hd * 0.95, -hw, 0, -hd, 0, H, hd * 0.95, 0, H, -hd * 0.95,
    hw, 0, hd, hw, 0, -hd, 0, H, -hd * 0.95, hw, 0, hd, 0, H, -hd * 0.95, 0, H, hd * 0.95,
  ];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  b.add(geo, c, [0, 0, 0], [0, 0, 0], 1, 0.06);
  b.box('#1a1410', 0.5, 0.9, 0.02, [0, 0.45, hd - 0.04], [0, 0, 0], 0);
  b.box(DARKWOOD, 0.05, H + 0.3, 0.05, [0, (H + 0.3) / 2, hd]);
  if (p.stripe) b.box(p.stripe, 0.12, 0.02, D, [0, H - 0.02, 0], [0, 0, 0], 0);
});

T('dec_cart', (b, p) => {
  const c = p.color || WOOD;
  b.box(c, 1.5, 0.12, 0.85, [0, 0.55, 0]);
  b.box(shade(c, 0.9), 1.5, 0.35, 0.06, [0, 0.75, 0.42]);
  b.box(shade(c, 0.9), 1.5, 0.35, 0.06, [0, 0.75, -0.42]);
  b.box(shade(c, 0.9), 0.06, 0.35, 0.85, [-0.72, 0.75, 0]);
  for (const z of [-0.48, 0.48]) {
    b.cyl(DARKWOOD, 0.32, 0.32, 0.07, 10, [0.15, 0.32, z], [Math.PI / 2, 0, 0]);
    b.cyl(IRON, 0.06, 0.06, 0.1, 6, [0.15, 0.32, z], [Math.PI / 2, 0, 0]);
  }
  b.box(DARKWOOD, 1.0, 0.06, 0.06, [1.1, 0.45, 0.2], [0, 0, -0.25]);
  b.box(DARKWOOD, 1.0, 0.06, 0.06, [1.1, 0.45, -0.2], [0, 0, -0.25]);
  if (p.load === 'hay') b.box('#d8b850', 1.3, 0.4, 0.75, [-0.05, 0.85, 0], [0, 0, 0], 0.15);
  else if (p.load === 'crates') { b.box('#8a6a40', 0.5, 0.5, 0.5, [-0.35, 0.86, 0], [0, 0.3, 0]); b.box('#7a5a30', 0.45, 0.45, 0.45, [0.25, 0.84, 0.05], [0, -0.2, 0]); }
  else if (p.load === 'ore') for (let i = 0; i < 5; i++) b.dodeca('#5a5048', 0.2, [-0.5 + i * 0.25, 0.75, (i % 2) * 0.2 - 0.1], [1, 0.8, 1], [i, i, 0], 0.15);
  if (p.broken) b.box(c, 0.6, 0.06, 0.4, [0.5, 0.05, 0.6], [0, 0.6, 0.1]);
});

T('dec_signpost', (b, p) => {
  b.box(DARKWOOD, 0.1, 1.8, 0.1, [0, 0.9, 0]);
  b.cone(DARKWOOD, 0.08, 0.12, 4, [0, 1.86, 0], [0, Math.PI / 4, 0]);
  const arms = p.arms || 3;
  for (let i = 0; i < arms; i++) {
    const a = [0.3, 1.9, -1.2, 3.0][i];
    const y = 1.55 - i * 0.28;
    b.box('#a07a4a', 0.75, 0.18, 0.05, [Math.cos(a) * 0.32, y, Math.sin(a) * 0.32], [0, -a, 0], 0.06);
    b.cone('#a07a4a', 0.13, 0.15, 3, [Math.cos(a) * 0.72, y, Math.sin(a) * 0.72], [Math.PI / 2, 0, -a - Math.PI / 2], 0.06);
  }
});

T('dec_notice_board', (b) => {
  for (const x of [-0.55, 0.55]) b.box(DARKWOOD, 0.1, 1.8, 0.1, [x, 0.9, 0]);
  b.box('#8a6a40', 1.2, 0.8, 0.06, [0, 1.25, 0]);
  b.box(DARKWOOD, 1.35, 0.08, 0.2, [0, 1.72, 0], [0.2, 0, 0]);
  const papers = ['#f2ead0', '#e8e0c0', '#f4f0e6', '#e0d0a8'];
  for (let i = 0; i < 4; i++) b.box(papers[i], 0.24, 0.3, 0.01, [-0.4 + i * 0.27, 1.25 + ((i * 3) % 3 - 1) * 0.12, 0.04], [0, 0, (i - 1.5) * 0.08], 0);
});

T('dec_lantern_post', (b, p) => {
  const c = p.color || IRON;
  b.cyl(c, 0.05, 0.07, 2.4, 6, [0, 1.2, 0]);
  b.box(c, 0.6, 0.05, 0.05, [0.25, 2.35, 0]);
  b.box(c, 0.03, 0.2, 0.03, [0.5, 2.25, 0]);
  b.box(p.glow || '#ffe08a', 0.18, 0.22, 0.18, [0.5, 2.03, 0], [0, 0, 0], 0);
  b.cone(c, 0.15, 0.12, 4, [0.5, 2.2, 0], [0, Math.PI / 4, 0]);
});

T('dec_torch_stake', (b, p) => {
  b.cyl(DARKWOOD, 0.04, 0.05, 1.5, 5, [0, 0.75, 0]);
  b.cyl(IRON, 0.09, 0.06, 0.15, 6, [0, 1.52, 0]);
  b.cone(p.flame || '#ff9a30', 0.09, 0.3, 5, [0, 1.72, 0], [0, 0, 0], 0);
  b.cone('#ffe070', 0.05, 0.18, 4, [0, 1.68, 0], [0, 0.5, 0], 0);
});

T('dec_brazier', (b, p) => {
  const c = p.color || IRON;
  for (let i = 0; i < 3; i++) { const a = i * 2.1; b.box(c, 0.05, 0.7, 0.05, [Math.cos(a) * 0.2, 0.35, Math.sin(a) * 0.2], [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2]); }
  b.cyl(c, 0.35, 0.2, 0.22, 8, [0, 0.8, 0]);
  b.cyl('#3a2018', 0.3, 0.3, 0.03, 8, [0, 0.9, 0], [0, 0, 0], 0);
  b.cone(p.flame || '#ff8a20', 0.24, 0.5, 6, [0, 1.15, 0], [0, 0, 0], 0);
  b.cone(p.flame2 || '#ffd050', 0.13, 0.35, 5, [0.04, 1.1, 0.02], [0, 0.4, 0], 0);
});

T('dec_banner', (b, p) => {
  const c = p.color || '#8a1a2a', c2 = p.emblem || GOLD;
  b.cyl(DARKWOOD, 0.04, 0.05, 2.8, 5, [0, 1.4, 0]);
  b.sphere(GOLD, 0.07, [0, 2.85, 0]);
  b.box(DARKWOOD, 0.8, 0.05, 0.05, [0, 2.6, 0.03]);
  b.box(c, 0.7, 1.3, 0.03, [0, 1.92, 0.05], [0, 0, 0], 0.04);
  b.cone(c, 0.35, 0.3, 3, [0, 1.13, 0.05], [Math.PI, 0, 0], 0.04);
  b.box(c2, 0.25, 0.3, 0.035, [0, 2.0, 0.06], [0, 0, Math.PI / 4], 0.02);
});

T('dec_wall_banner', (b, p) => {
  const c = p.color || '#8a1a2a', c2 = p.emblem || GOLD;
  b.box(DARKWOOD, 0.8, 0.05, 0.05, [0, 2.2, -0.45]);
  b.box(c, 0.65, 1.3, 0.03, [0, 1.52, -0.44], [0, 0, 0], 0.04);
  b.cone(c, 0.33, 0.25, 3, [0, 0.75, -0.44], [Math.PI, 0, 0], 0.04);
  b.box(c2, 0.22, 0.22, 0.035, [0, 1.6, -0.42], [0, 0, Math.PI / 4], 0.02);
});

T('dec_flower_bed', (b, p) => {
  const W = p.w - 0.1, D = p.h - 0.1;
  b.box(p.border || '#8a7a68', W, 0.25, D, [0, 0.12, 0], [0, 0, 0], 0.12);
  b.box('#4a3420', W - 0.15, 0.04, D - 0.15, [0, 0.25, 0], [0, 0, 0], 0.05);
  const cols = p.colors || ['#e8d040', '#d04a6a', '#f2f2f2', '#9a5ad0', '#e87a30'];
  const n = Math.round(W * D * 6);
  for (let i = 0; i < n; i++) {
    const x = (((i * 0.618) % 1) - 0.5) * (W - 0.3), z = (((i * 0.382 + i * i * 0.07) % 1) - 0.5) * (D - 0.3);
    b.sphere('#3f7a2a', 0.08, [x, 0.3, z], [1, 0.8, 1], 0, 0.1);
    b.sphere(cols[i % cols.length], 0.05, [x, 0.38, z], [1, 1, 1], 0, 0);
  }
});

T('dec_hedge', (b, p) => {
  const c = p.color || '#2f6a2a';
  b.box(c, 1.0, 1.0, 0.7, [0, 0.5, 0], [0, 0, 0], 0.15);
  b.sphere(shade(c, 1.1), 0.3, [0.2, 1.0, 0], [1.2, 0.6, 1], 0, 0.15);
  b.sphere(shade(c, 0.95), 0.3, [-0.25, 0.98, 0.05], [1.2, 0.6, 1], 0, 0.15);
});

T('dec_iron_fence', (b, p) => {
  const c = p.color || '#2a2a30';
  b.box(c, 1.0, 0.05, 0.05, [0, 0.25, 0]);
  b.box(c, 1.0, 0.05, 0.05, [0, 1.0, 0]);
  for (let i = 0; i < 5; i++) { b.box(c, 0.035, 1.2, 0.035, [-0.4 + i * 0.2, 0.6, 0]); b.cone(c, 0.04, 0.12, 4, [-0.4 + i * 0.2, 1.25, 0]); }
});

T('dec_palisade', (b, p) => {
  const c = p.color || '#6a4a2a';
  for (let i = 0; i < 4; i++) {
    const x = -0.375 + i * 0.25, h = 2.0 + ((i * 7) % 3) * 0.15;
    b.cyl(shade(c, 0.9 + (i % 2) * 0.15), 0.12, 0.13, h, 6, [x, h / 2, 0]);
    b.cone(shade(c, 1.1), 0.12, 0.3, 6, [x, h + 0.15, 0]);
  }
  b.box(shade(c, 0.7), 1.0, 0.1, 0.08, [0, 1.3, 0.12]);
});

T('dec_trough', (b, p) => {
  b.box(WOOD, 1.6, 0.45, 0.6, [0, 0.25, 0]);
  b.box(p.fill || '#4a7aa0', 1.45, 0.02, 0.45, [0, 0.46, 0], [0, 0, 0], 0);
});

T('dec_woodpile', (b) => {
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
    b.cyl(i % 2 ? '#7a5530' : '#6b4a2b', 0.12, 0.12, 0.9, 6, [-0.35 + i * 0.24 + r * 0.12, 0.12 + r * 0.21, 0], [Math.PI / 2, 0, 0]);
  }
  b.box('#4a3420', 0.15, 0.7, 0.15, [-0.6, 0.35, 0]);
});

T('dec_chopping_block', (b) => {
  b.cyl('#6b4a2b', 0.3, 0.33, 0.45, 8, [0, 0.22, 0]);
  b.cyl('#c9a46a', 0.29, 0.29, 0.02, 8, [0, 0.45, 0], [0, 0, 0], 0.02);
  b.box(DARKWOOD, 0.05, 0.6, 0.05, [0.05, 0.62, 0], [0, 0, 0.5]);
  b.box('#8a8a90', 0.04, 0.16, 0.2, [-0.06, 0.5, 0], [0, 0, 0.5]);
});

T('dec_scarecrow', (b, p) => {
  b.box(DARKWOOD, 0.08, 1.9, 0.08, [0, 0.95, 0]);
  b.box(DARKWOOD, 1.1, 0.07, 0.07, [0, 1.45, 0]);
  b.box(p.shirt || '#7a5a8a', 0.5, 0.6, 0.25, [0, 1.35, 0], [0, 0, 0], 0.15);
  b.box(p.shirt || '#7a5a8a', 1.0, 0.18, 0.2, [0, 1.48, 0], [0, 0, 0], 0.15);
  b.sphere('#d8c088', 0.2, [0, 1.85, 0], [1, 1.1, 1], 0, 0.06);
  b.cyl('#6a5a30', 0.32, 0.32, 0.03, 8, [0, 2.0, 0]);
  b.cone('#6a5a30', 0.18, 0.25, 6, [0, 2.12, 0]);
  b.cone('#d8b850', 0.06, 0.25, 3, [-0.55, 1.4, 0], [0, 0, -1.4], 0.1);
  b.cone('#d8b850', 0.06, 0.25, 3, [0.55, 1.4, 0], [0, 0, 1.4], 0.1);
});

T('dec_crops', (b, p) => {
  const c = p.color || '#c8a040', s = p.crop || 'wheat';
  for (let i = 0; i < 6; i++) {
    const x = ((i % 3) - 1) * 0.3, z = (Math.floor(i / 3) - 0.5) * 0.4;
    if (s === 'wheat') { b.cyl(shade(c, 0.85), 0.012, 0.012, 0.55, 3, [x, 0.27, z]); b.cyl(c, 0.04, 0.03, 0.18, 4, [x, 0.6, z]); }
    else if (s === 'cabbage') b.sphere(c, 0.14, [x, 0.12, z], [1, 0.8, 1], 0, 0.12);
    else { b.cone('#3f7a2a', 0.08, 0.25, 4, [x, 0.12, z]); b.sphere(c, 0.06, [x, 0.28, z]); }
  }
});

T('dec_dummy', (b) => {
  b.box(DARKWOOD, 0.1, 1.2, 0.1, [0, 0.6, 0]);
  b.cyl('#c8b088', 0.22, 0.22, 0.6, 7, [0, 1.25, 0], [0, 0, 0], 0.1);
  b.box(DARKWOOD, 0.9, 0.08, 0.08, [0, 1.3, 0]);
  b.sphere('#c8b088', 0.17, [0, 1.72, 0], [1, 1, 1], 0, 0.08);
  b.box('#7a2a2a', 0.2, 0.2, 0.02, [0, 1.3, 0.22], [0, 0, Math.PI / 4], 0);
});

T('dec_archery_target', (b) => {
  for (const x of [-0.25, 0.25]) b.box(DARKWOOD, 0.06, 1.2, 0.06, [x, 0.6, -0.15], [-0.2, 0, 0]);
  b.cyl('#e8e0c8', 0.45, 0.45, 0.1, 12, [0, 1.0, 0], [Math.PI / 2 - 0.2, 0, 0], 0.04);
  b.cyl('#c03030', 0.3, 0.3, 0.11, 12, [0, 1.0, 0.005], [Math.PI / 2 - 0.2, 0, 0], 0.02);
  b.cyl('#e8d040', 0.12, 0.12, 0.12, 10, [0, 1.0, 0.01], [Math.PI / 2 - 0.2, 0, 0], 0.02);
});

T('dec_anchor', (b) => {
  b.box(IRON, 0.1, 1.1, 0.1, [0, 0.55, 0], [0, 0, 0.3]);
  b.add(new THREE.TorusGeometry(0.4, 0.05, 4, 10, Math.PI), IRON, [0.15, 0.25, 0], [Math.PI, 0, 0.3], 1);
  b.add(new THREE.TorusGeometry(0.12, 0.04, 4, 8), IRON, [-0.17, 1.12, 0], [0, 0, 0], 1);
  b.box(IRON, 0.6, 0.08, 0.08, [-0.12, 0.85, 0], [0, 0, 0.3]);
});

T('dec_rowboat', (b, p) => {
  const c = p.color || '#7a5530';
  b.box(c, 0.9, 0.35, 2.0, [0, 0.18, 0]);
  b.box(shade(c, 1.15), 1.0, 0.08, 2.1, [0, 0.38, 0]);
  b.cone(c, 0.48, 0.6, 4, [0, 0.2, 1.25], [Math.PI / 2, Math.PI / 4, 0], 0.08);
  b.box('#3a2a1a', 0.8, 0.05, 1.8, [0, 0.3, 0], [0, 0, 0], 0);
  b.box(c, 0.9, 0.06, 0.25, [0, 0.33, -0.3]);
  b.box(DARKWOOD, 0.05, 0.05, 1.6, [0.5, 0.45, 0.1], [0, 0.3, 0.2]);
});

T('dec_ship', (b, p) => {
  // big moored ship hull, footprint ~3x7 (long along z)
  const c = p.color || '#5e3d24', L = p.h - 0.4, W = p.w - 0.4;
  b.box(c, W, 1.2, L * 0.75, [0, 0.4, -L * 0.08]);
  b.cone(c, W / 2 * 1.4, L * 0.32, 4, [0, 0.4, L * 0.43], [Math.PI / 2, Math.PI / 4, 0], 0.06);
  b.box(shade(c, 1.2), W + 0.1, 0.12, L * 0.8, [0, 1.05, -L * 0.05]);
  b.box('#8c6038', W - 0.2, 0.05, L * 0.75, [0, 1.0, -L * 0.07], [0, 0, 0], 0.03);
  b.box(shade(c, 0.9), W, 0.8, 1.2, [0, 1.4, -L * 0.4]);
  b.cyl(DARKWOOD, 0.1, 0.13, 6, 6, [0, 4, 0.2]);
  b.box(DARKWOOD, 2.6, 0.08, 0.08, [0, 5.5, 0.2]);
  b.box(p.sail || '#e8e0c8', 2.4, 2.6, 0.04, [0, 4.15, 0.25], [0.05, 0, 0], 0.05);
  if (p.stripe) b.box(p.stripe, 2.42, 0.4, 0.05, [0, 4.4, 0.27], [0.05, 0, 0], 0.02);
  b.box(DARKWOOD, 0.08, 0.08, 1.4, [0, 1.6, L * 0.55], [-0.4, 0, 0]);
});

T('dec_dock_post', (b) => {
  b.cyl('#5a3d24', 0.12, 0.13, 2.2, 6, [0, 0.2, 0]);
  b.cyl('#c8a86a', 0.135, 0.135, 0.12, 6, [0, 0.95, 0], [0, 0, 0], 0.02);
});

T('dec_net_rack', (b) => {
  for (const x of [-0.6, 0.6]) b.box(DARKWOOD, 0.08, 1.6, 0.08, [x, 0.8, 0]);
  b.box(DARKWOOD, 1.4, 0.07, 0.07, [0, 1.55, 0]);
  b.box('#b8a888', 1.15, 1.2, 0.02, [0, 0.95, 0], [0, 0, 0], 0.15);
  for (let i = 0; i < 5; i++) b.box('#6a5a40', 0.015, 1.2, 0.03, [-0.5 + i * 0.25, 0.95, 0], [0, 0, 0], 0);
  for (let i = 0; i < 4; i++) b.sphere('#e8c040', 0.05, [-0.4 + i * 0.27, 0.45 + (i % 2) * 0.2, 0.03]);
});

T('dec_lobster_pot', (b) => {
  b.cyl('#8a6a40', 0.25, 0.28, 0.35, 7, [0, 0.18, 0], [0, 0, 0], 0.15);
  b.cyl('#6a4a2a', 0.2, 0.25, 0.08, 7, [0, 0.38, 0]);
  b.cyl('#8a6a40', 0.22, 0.25, 0.3, 7, [0.35, 0.15, 0.25], [0, 0, 0], 0.15);
});

T('dec_fish_rack', (b) => {
  for (const x of [-0.5, 0.5]) b.box(DARKWOOD, 0.07, 1.4, 0.07, [x, 0.7, 0]);
  b.box(DARKWOOD, 1.1, 0.05, 0.05, [0, 1.35, 0]);
  for (let i = 0; i < 5; i++) b.cone(i % 2 ? '#a8b0b8' : '#c8a070', 0.06, 0.4, 4, [-0.4 + i * 0.2, 1.1, 0], [Math.PI, 0, 0], 0.05);
});

T('dec_barrel_stack', (b, p) => {
  const c = p.color || '#7a5530';
  for (const [x, z] of [[-0.22, 0.15], [0.22, 0.15], [0, -0.22]]) {
    b.cyl(c, 0.22, 0.22, 0.6, 8, [x, 0.3, z]);
    b.cyl(IRON, 0.225, 0.225, 0.04, 8, [x, 0.5, z]);
  }
  b.cyl(shade(c, 1.1), 0.22, 0.22, 0.6, 8, [0, 0.85, 0.02], [0, 0, 0]);
});

T('dec_crate_stack', (b, p) => {
  const c = p.color || '#8a6a40';
  b.box(c, 0.55, 0.55, 0.55, [-0.2, 0.28, 0.1], [0, 0.1, 0]);
  b.box(shade(c, 0.9), 0.5, 0.5, 0.5, [0.25, 0.25, -0.15], [0, -0.3, 0]);
  b.box(shade(c, 1.1), 0.45, 0.45, 0.45, [0.0, 0.78, 0.0], [0, 0.5, 0]);
});

T('dec_well_rustic', (b) => {
  b.cyl('#7a6a5a', 0.55, 0.6, 0.6, 8, [0, 0.3, 0], [0, 0, 0], 0.15);
  b.cyl('#1a2a3a', 0.45, 0.45, 0.02, 8, [0, 0.58, 0], [0, 0, 0], 0);
  for (const x of [-0.5, 0.5]) b.box(DARKWOOD, 0.08, 1.2, 0.08, [x, 0.9, 0]);
  b.cyl(DARKWOOD, 0.06, 0.06, 1.1, 5, [0, 1.35, 0], [0, 0, Math.PI / 2]);
  b.cyl('#6b4a2b', 0.1, 0.1, 0.18, 6, [0, 1.05, 0]);
});

T('dec_market_crate', (b, p) => {
  const c = p.goods || '#d04a3a';
  b.box('#8a6a40', 0.7, 0.35, 0.5, [0, 0.18, 0]);
  for (let i = 0; i < 6; i++) b.sphere(i % 3 ? c : shade(c, 1.2), 0.09, [-0.22 + (i % 3) * 0.22, 0.4, -0.1 + Math.floor(i / 3) * 0.2]);
});

T('dec_bell_post', (b) => {
  for (const x of [-0.45, 0.45]) b.box(DARKWOOD, 0.1, 2.2, 0.1, [x, 1.1, 0]);
  b.box(DARKWOOD, 1.1, 0.12, 0.15, [0, 2.2, 0]);
  b.cone('#c89a40', 0.3, 0.45, 8, [0, 1.85, 0], [0, 0, 0], 0.05);
  b.sphere('#a07a30', 0.06, [0, 1.6, 0]);
});

// ------------------------------------------------------------------------------------------------
// Nature
// ------------------------------------------------------------------------------------------------
T('dec_grass_tuft', (b, p) => {
  const c = p.color || '#4f8a2e';
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26, r = 0.08 + (i % 2) * 0.12;
    b.cone(shade(c, 0.85 + (i % 3) * 0.12), 0.05, 0.3 + (i % 3) * 0.08, 3, [Math.cos(a) * r, 0.15, Math.sin(a) * r], [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], 0.05);
  }
});

T('dec_pebbles', (b, p) => {
  const c = p.color || '#8a857a';
  for (let i = 0; i < 4; i++) b.dodeca(shade(c, 0.85 + (i % 3) * 0.1), 0.08 + (i % 2) * 0.05, [Math.cos(i * 1.9) * 0.25, 0.04, Math.sin(i * 1.9) * 0.25], [1.3, 0.6, 1], [i, i * 2, 0], 0.1);
});

T('dec_rock_cluster', (b, p) => {
  const c = p.color || '#6e6a63', s = p.scale || 1;
  b.dodeca(c, 0.55 * s, [0, 0.4 * s, 0], [1.2, 0.95, 1], [0.2, 0.4, 0], 0.15);
  b.dodeca(shade(c, 0.9), 0.4 * s, [0.45 * s, 0.25 * s, 0.3 * s], [1.1, 0.8, 1], [0.6, 1.4, 0], 0.15);
  b.dodeca(shade(c, 1.08), 0.35 * s, [-0.45 * s, 0.22 * s, -0.25 * s], [1, 0.9, 1.2], [1.1, 0.3, 0.2], 0.15);
  if (p.moss) b.dodeca(p.moss, 0.3 * s, [0.05, 0.75 * s, 0.05], [1.4, 0.35, 1.2], [0.2, 0.4, 0], 0.15);
  if (p.snow) b.dodeca('#eef3f7', 0.42 * s, [0, 0.72 * s, 0], [1.25, 0.4, 1.05], [0.2, 0.4, 0], 0.05);
});

T('dec_cliff', (b, p) => {
  // big jagged rock formation filling the footprint
  const c = p.color || '#6a665e', W = p.w, D = p.h, H = p.height || 2.5;
  const n = Math.max(3, Math.round(W * D * 1.2));
  for (let i = 0; i < n; i++) {
    const x = (((i * 0.618034) % 1) - 0.5) * (W - 0.6), z = (((i * 0.4142 + 0.3) % 1) - 0.5) * (D - 0.6);
    const h = H * (0.6 + ((i * 7) % 5) * 0.12);
    b.dodeca(shade(c, 0.85 + ((i * 3) % 4) * 0.07), 0.7, [x, h * 0.45, z], [1.1, h / 1.3, 1.1], [i * 0.7, i, 0], 0.12);
  }
  if (p.snow) b.dodeca('#eef3f7', 0.7, [0, H * 0.95, 0], [W * 0.6, 0.4, D * 0.6], [0.2, 0.3, 0], 0.04);
});

T('dec_fallen_log', (b, p) => {
  const c = p.color || '#5e4228', L = Math.max(p.w, p.h) - 0.2, along = p.w >= p.h;
  b.cyl(c, 0.22, 0.26, L, 7, [0, 0.22, 0], along ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0], 0.1);
  b.cyl('#c9a46a', 0.2, 0.2, 0.02, 7, along ? [L / 2 + 0.01, 0.22, 0] : [0, 0.22, L / 2 + 0.01], along ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0], 0.02);
  if (p.moss) b.box(p.moss, along ? L * 0.6 : 0.3, 0.06, along ? 0.3 : L * 0.6, [0, 0.46, 0], [0, 0, 0], 0.15);
  b.cyl(c, 0.05, 0.07, 0.4, 4, along ? [0.2, 0.45, 0.1] : [0.1, 0.45, 0.2], [0.4, 0, 0.6]);
});

T('dec_mushrooms', (b, p) => {
  const c = p.color || '#c03a2a', st = '#e8e0c8';
  const big = p.big ? 4.5 : 1;
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7, r = i ? 0.22 : 0, s = (i ? 0.7 : 1) * big;
    b.cyl(st, 0.04 * s, 0.05 * s, 0.2 * s, 5, [Math.cos(a) * r, 0.1 * s, Math.sin(a) * r]);
    b.sphere(c, 0.12 * s, [Math.cos(a) * r, 0.2 * s, Math.sin(a) * r], [1, 0.55, 1], 0, 0.1);
    if (p.spots !== false) b.sphere('#f4f0e6', 0.025 * s, [Math.cos(a) * r + 0.05 * s, 0.25 * s, Math.sin(a) * r], [1, 1, 1], 0, 0);
  }
});

T('dec_fairy_ring', (b, p) => {
  const R = Math.min(p.w, p.h) / 2 - 0.3, c = p.color || '#d8c8a8';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.cyl('#efe8d8', 0.03, 0.04, 0.12, 4, [Math.cos(a) * R, 0.06, Math.sin(a) * R]);
    b.sphere(c, 0.09, [Math.cos(a) * R, 0.13, Math.sin(a) * R], [1, 0.5, 1], 0, 0.1);
  }
  if (p.glow) b.sphere(p.glow, 0.12, [0, 0.8, 0], [1, 1, 1], 0, 0);
});

T('dec_reeds', (b, p) => {
  const c = p.color || '#6a8a3a';
  for (let i = 0; i < 7; i++) {
    const x = Math.cos(i * 2.4) * 0.28, z = Math.sin(i * 2.4) * 0.28, h = 0.7 + (i % 3) * 0.2;
    b.cyl(shade(c, 0.9 + (i % 2) * 0.15), 0.015, 0.025, h, 3, [x, h / 2, z], [Math.sin(i) * 0.12, 0, Math.cos(i) * 0.12], 0.05);
    if (i % 2 === 0) b.cyl('#5a3a20', 0.04, 0.04, 0.18, 5, [x, h * 0.85, z], [Math.sin(i) * 0.12, 0, Math.cos(i) * 0.12]);
  }
});

T('dec_lily_pads', (b, p) => {
  for (let i = 0; i < 4; i++) {
    const a = i * 1.9, r = 0.15 + (i % 2) * 0.18;
    b.cyl(i % 2 ? '#3f7a2a' : '#4f8a32', 0.16 - (i % 2) * 0.04, 0.16 - (i % 2) * 0.04, 0.02, 7, [Math.cos(a) * r, -0.02, Math.sin(a) * r], [0, 0, 0], 0.05);
  }
  if (p.flower !== false) b.sphere(p.flower || '#f0a0c8', 0.07, [0.15, 0.03, 0], [1, 0.6, 1], 0, 0);
});

T('dec_dead_bush', (b, p) => {
  const c = p.color || '#6a5238';
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    b.cyl(c, 0.015, 0.03, 0.55, 3, [Math.cos(a) * 0.1, 0.25, Math.sin(a) * 0.1], [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7], 0.08);
  }
});

T('dec_cactus', (b, p) => {
  const c = p.color || '#4a8a4a', h = p.tall ? 1.9 : 1.3;
  b.cyl(c, 0.17, 0.2, h, 7, [0, h / 2, 0], [0, 0, 0], 0.08);
  b.sphere(c, 0.17, [0, h, 0], [1, 0.6, 1], 0, 0.08);
  b.cyl(c, 0.1, 0.11, 0.45, 6, [0.32, h * 0.55, 0]);
  b.cyl(c, 0.1, 0.1, 0.3, 6, [0.18, h * 0.42, 0], [0, 0, Math.PI / 2]);
  if (p.tall) { b.cyl(c, 0.09, 0.1, 0.5, 6, [-0.3, h * 0.65, 0]); b.cyl(c, 0.09, 0.09, 0.25, 6, [-0.17, h * 0.52, 0], [0, 0, Math.PI / 2]); }
  if (p.flower) b.sphere(p.flower, 0.07, [0, h + 0.1, 0]);
});

T('dec_palm', (b, p) => {
  const h = p.tall ? 3.4 : 2.8, lean = 0.25;
  for (let i = 0; i < 6; i++) b.cyl(i % 2 ? '#8a6a44' : '#7a5a38', 0.13 - i * 0.008, 0.15 - i * 0.008, h / 6 + 0.05, 6, [Math.sin(lean) * (i * h / 6), (i + 0.5) * h / 6, 0], [0, 0, -lean], 0.05);
  const tx = Math.sin(lean) * h, ty = h;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.box('#3f8a3a', 0.25, 0.03, 1.3, [tx + Math.cos(a) * 0.55, ty - 0.12, Math.sin(a) * 0.55], [0.35, -a + Math.PI / 2, 0], 0.08);
  }
  b.sphere('#6a4a2a', 0.09, [tx + 0.1, ty - 0.15, 0.05]); b.sphere('#6a4a2a', 0.09, [tx - 0.05, ty - 0.18, -0.08]);
});

T('dec_decor_tree', (b, p) => {
  // non-choppable showpiece trees: blossom | autumn | gnarled | silverleaf | elder (big, w=2/3) | willow
  const v = p.variant || 'blossom';
  const sc = p.scale || (p.w >= 3 ? 2.2 : p.w >= 2 ? 1.6 : 1);
  if (v === 'gnarled') {
    const c = p.trunk || '#3a3028';
    b.cyl(c, 0.14 * sc, 0.3 * sc, 1.6 * sc, 6, [0, 0.8 * sc, 0], [0.1, 0, 0.12], 0.1);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      b.cyl(c, 0.03 * sc, 0.08 * sc, 1.1 * sc, 4, [Math.sin(a) * 0.35 * sc, (1.3 + (i % 3) * 0.25) * sc, Math.cos(a) * 0.35 * sc], [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9], 0.1);
    }
    if (p.leaf) for (let i = 0; i < 3; i++) b.sphere(p.leaf, 0.35 * sc, [Math.sin(i * 2.1) * 0.6 * sc, (1.9 + i * 0.15) * sc, Math.cos(i * 2.1) * 0.6 * sc], [1, 0.6, 1], 0, 0.15);
    b.cyl(shade(c, 0.8), 0.32 * sc, 0.45 * sc, 0.25, 6, [0, 0.12, 0]);
    return;
  }
  const styles = {
    blossom: { trunk: '#5e3d26', leaf: '#f0a8c8', leaf2: '#f8d0e0', h: 1.5 },
    autumn: { trunk: '#5e3d26', leaf: '#d88a2a', leaf2: '#c45a2a', h: 1.6 },
    silverleaf: { trunk: '#d8d8e0', leaf: '#b8e0e8', leaf2: '#e8f8ff', h: 2.0 },
    elder: { trunk: '#6a5a4a', leaf: '#3f8a4a', leaf2: '#7ad0a0', h: 2.2 },
    goldleaf: { trunk: '#6a5040', leaf: '#e8c040', leaf2: '#f8e080', h: 1.8 },
    willow: { trunk: '#5a4a32', leaf: '#7aa040', leaf2: '#8ab050', h: 1.6, droop: true },
  };
  const st = { ...(styles[v] || styles.blossom), ...(p.colors || {}) };
  const th = st.h * sc;
  b.cyl(st.trunk, 0.13 * sc, 0.22 * sc, th, 7, [0, th / 2, 0]);
  b.cyl(shade(st.trunk, 0.85), 0.24 * sc, 0.34 * sc, 0.3, 7, [0, 0.15, 0]);
  if (v === 'elder') for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; b.cyl(shade(st.trunk, 0.9), 0.06 * sc, 0.12 * sc, 0.9 * sc, 4, [Math.cos(a) * 0.3 * sc, 0.3 * sc, Math.sin(a) * 0.3 * sc], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]); }
  const r = 0.85 * sc;
  b.sphere(st.leaf, r, [0, th + r * 0.55, 0], [1.05, 0.8, 1.05], 0, 0.12);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    b.sphere(i % 2 ? st.leaf2 : shade(st.leaf, 0.9), r * 0.6, [Math.cos(a) * r * 0.7, th + r * (0.3 + (i % 2) * 0.35), Math.sin(a) * r * 0.7], [1, 0.8, 1], 0, 0.12);
  }
  if (st.droop) for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.cone(st.leaf2, 0.14 * sc, 1.4 * sc, 4, [Math.cos(a) * r * 0.9, th - 0.1, Math.sin(a) * r * 0.9], [Math.PI, 0, 0], 0.1); }
  if (v === 'silverleaf' || v === 'elder') for (let i = 0; i < 6; i++) { const a = i * 1.05; b.sphere(v === 'elder' ? '#c8ffe0' : '#ffffff', 0.06 * sc, [Math.cos(a) * r * 1.0, th + r * (0.2 + (i % 3) * 0.3), Math.sin(a) * r * 1.0], [1, 1, 1], 0, 0); }
  if (p.fallen) for (let i = 0; i < 6; i++) b.cyl(st.leaf, 0.08, 0.08, 0.01, 5, [Math.cos(i * 2.3) * (0.7 + i * 0.08) * sc, 0.01, Math.sin(i * 2.3) * (0.7 + i * 0.08) * sc], [0, 0, 0], 0.1);
});

T('dec_ice_spike', (b, p) => {
  const c = p.color || '#a8d8f0';
  b.cone(c, 0.3, 1.6, 5, [0, 0.8, 0], [0.05, 0, 0.08], 0.12);
  b.cone(shade(c, 1.1), 0.18, 1.0, 5, [0.3, 0.5, 0.15], [0.3, 0, -0.3], 0.12);
  b.cone(shade(c, 0.9), 0.15, 0.8, 5, [-0.25, 0.4, -0.1], [-0.2, 0, 0.35], 0.12);
});

T('dec_snowdrift', (b) => {
  b.sphere('#eef3f7', 0.5, [0, 0.05, 0], [1.3, 0.35, 1], 0, 0.04);
  b.sphere('#f4f8fb', 0.35, [0.3, 0.08, 0.2], [1.2, 0.4, 1], 0, 0.04);
});

T('dec_crystal', (b, p) => {
  const c = p.color || '#7ad0f0', s = p.scale || 1;
  b.add(new THREE.OctahedronGeometry(0.25 * s, 0), c, [0, 0.55 * s, 0], [0, 0, 0], [1, 2.6, 1], 0.15);
  b.add(new THREE.OctahedronGeometry(0.16 * s, 0), shade(c, 1.15), [0.25 * s, 0.32 * s, 0.1 * s], [0, 0.5, -0.4], [1, 2.4, 1], 0.15);
  b.add(new THREE.OctahedronGeometry(0.14 * s, 0), shade(c, 0.9), [-0.2 * s, 0.28 * s, -0.12 * s], [0.3, 0, 0.45], [1, 2.2, 1], 0.15);
  b.dodeca('#4a4650', 0.25 * s, [0, 0.05, 0], [1.4, 0.4, 1.2], [0, 0, 0], 0.1);
});

T('dec_stalagmite', (b, p) => {
  const c = p.color || '#6e604c';
  b.cone(c, 0.3, 1.5, 6, [0, 0.75, 0], [0.04, 0, 0.06], 0.12);
  b.cone(shade(c, 0.9), 0.18, 0.8, 5, [0.3, 0.4, 0.2], [0, 0, -0.1], 0.12);
  b.cone(shade(c, 1.1), 0.14, 0.55, 5, [-0.25, 0.27, -0.15], [0, 0, 0.1], 0.12);
});

T('dec_lava_rock', (b, p) => {
  b.dodeca('#2a2224', 0.45, [0, 0.3, 0], [1.2, 0.8, 1], [0.3, 0.6, 0], 0.15);
  b.box(p.glow || '#ff5a14', 0.5, 0.04, 0.06, [0.05, 0.42, 0.33], [0, 0.3, 0.2], 0);
  b.box(p.glow || '#ff5a14', 0.04, 0.3, 0.06, [-0.2, 0.3, 0.32], [0, 0, 0.4], 0);
});

T('dec_obsidian_spike', (b) => {
  b.cone('#241e2a', 0.25, 1.6, 4, [0, 0.8, 0], [0.1, 0.3, 0.08], 0.15);
  b.cone('#2e2634', 0.18, 1.1, 4, [0.25, 0.55, 0.1], [0.3, 0, -0.35], 0.15);
  b.cone('#1e1822', 0.14, 0.8, 4, [-0.2, 0.4, -0.15], [-0.2, 0.5, 0.4], 0.15);
});

T('dec_bones', (b, p) => {
  const c = p.color || '#e0d8c0';
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    b.cyl(c, 0.025, 0.025, 0.4, 4, [Math.cos(a) * 0.18, 0.04 + (i % 2) * 0.04, Math.sin(a) * 0.18], [Math.PI / 2, a, 0], 0.05);
  }
  if (p.skull !== false) { b.sphere(c, 0.1, [0.05, 0.09, 0.05], [1, 0.9, 1.15], 0, 0.05); b.box('#1a1410', 0.04, 0.03, 0.02, [0.03, 0.1, 0.17], [0, 0, 0], 0); b.box('#1a1410', 0.04, 0.03, 0.02, [0.09, 0.1, 0.17], [0, 0, 0], 0); }
});

T('dec_ribcage', (b, p) => {
  // giant beast remains (2x3 footprint)
  const c = p.color || '#d8d0b8', L = Math.max(p.w, p.h) - 0.6;
  b.cyl(c, 0.12, 0.12, L, 6, [0, 0.15, 0], [Math.PI / 2, 0, 0], 0.06);
  for (let i = 0; i < 6; i++) {
    const z = -L / 2 + 0.3 + i * (L - 0.6) / 5;
    for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.75, 0.05, 4, 8, Math.PI * 0.55), c, [0, 0.15, z], [0, 0, s > 0 ? 0.15 : Math.PI - 0.15], [1, 1.3, 1], 0.05);
  }
  b.dodeca(c, 0.4, [0.1, 0.35, L / 2 + 0.2], [1, 0.8, 1.4], [0.2, 0, 0], 0.06);
  b.cone(c, 0.08, 0.6, 4, [0.3, 0.6, L / 2 + 0.3], [-0.6, 0, -0.5], 0.05);
});

T('dec_skull_pike', (b) => {
  b.cyl(DARKWOOD, 0.035, 0.045, 1.6, 5, [0, 0.8, 0], [0.05, 0, 0.05]);
  b.sphere('#e0d8c0', 0.13, [0.04, 1.62, 0.04], [1, 0.95, 1.15], 0, 0.05);
  b.box('#1a1410', 0.05, 0.04, 0.02, [0.0, 1.64, 0.18], [0, 0, 0], 0);
  b.box('#1a1410', 0.05, 0.04, 0.02, [0.08, 1.64, 0.18], [0, 0, 0], 0);
});

T('dec_spike_barricade', (b) => {
  b.box(DARKWOOD, 1.0, 0.12, 0.12, [0, 0.35, 0]);
  for (let i = 0; i < 3; i++) {
    const x = -0.35 + i * 0.35;
    b.cyl('#6a4a2a', 0.05, 0.06, 1.2, 5, [x, 0.5, 0.15], [0.7, 0, 0]);
    b.cyl('#6a4a2a', 0.05, 0.06, 1.2, 5, [x, 0.5, -0.15], [-0.7, 0, 0]);
  }
});

T('dec_cobweb', (b) => {
  for (let i = 0; i < 4; i++) b.box('#e8e8e8', 0.9, 0.01, 0.01, [0, 0.9 + i * 0.05, 0], [0, i * Math.PI / 4, 0.4], 0);
  b.add(new THREE.TorusGeometry(0.25, 0.008, 3, 8), '#e0e0e0', [0, 1.0, 0], [Math.PI / 2 - 0.4, 0, 0], 1, 0);
  b.add(new THREE.TorusGeometry(0.4, 0.008, 3, 8), '#e0e0e0', [0, 0.95, 0], [Math.PI / 2 - 0.4, 0, 0], 1, 0);
});

// ------------------------------------------------------------------------------------------------
// Ruins, graves, monuments
// ------------------------------------------------------------------------------------------------
T('dec_standing_stone', (b, p) => {
  const c = p.color || '#7a786e', h = p.tall || 2.4;
  b.box(c, 0.7, h, 0.4, [0, h / 2 - 0.1, 0], [0.04, 0.2, 0.05], 0.12);
  b.box(shade(c, 0.9), 0.55, 0.3, 0.35, [0.02, h - 0.05, 0], [0, 0.2, 0.3], 0.12);
  if (p.rune) b.box(p.rune, 0.12, 0.5, 0.02, [0.05, h * 0.55, 0.2], [0, 0.2, 0], 0);
  if (p.moss) b.box(p.moss, 0.72, 0.3, 0.42, [0, 0.15, 0], [0.04, 0.2, 0.05], 0.15);
});

T('dec_dolmen', (b, p) => {
  const c = p.color || '#7a786e';
  b.box(c, 0.5, 1.6, 0.6, [-0.7, 0.75, 0], [0, 0, 0.05], 0.12);
  b.box(c, 0.5, 1.6, 0.6, [0.7, 0.75, 0], [0, 0, -0.04], 0.12);
  b.box(shade(c, 1.1), 2.2, 0.4, 1.0, [0, 1.7, 0], [0, 0.1, 0.04], 0.12);
});

T('dec_arch', (b, p) => {
  const c = p.color || '#8f897d', W = p.w;
  for (const x of [-W / 2 + 0.35, W / 2 - 0.35]) b.box(c, 0.6, 2.8, 0.6, [x, 1.4, 0], [0, 0, 0], 0.1);
  if (!p.broken) b.box(c, W, 0.5, 0.65, [0, 3.0, 0], [0, 0, 0], 0.1);
  else { b.box(c, W * 0.55, 0.5, 0.65, [-W * 0.22, 3.0, 0], [0, 0, -0.05], 0.1); b.box(c, 0.6, 0.4, 0.5, [W * 0.3, 0.2, 0.6], [0.3, 0.5, 0.2], 0.1); }
  if (p.vines) for (let i = 0; i < 6; i++) b.box(p.vines, 0.15, 0.6, 0.05, [-W / 2 + 0.35 + (i % 2) * 0.2, 0.5 + i * 0.4, 0.32], [0, 0, (i % 2 - 0.5) * 0.4], 0.15);
});

T('dec_ruined_wall', (b, p) => {
  const c = p.color || '#7a746a';
  const h = p.height || 1.6;
  b.box(c, 1, h, 0.8, [0, h / 2, 0], [0, 0, 0], 0.15);
  b.box(shade(c, 0.9), 0.5, 0.5, 0.75, [0.25, h + 0.2, 0], [0, 0, 0.3], 0.15);
  b.dodeca(shade(c, 0.85), 0.22, [0.35, 0.1, 0.6], [1.2, 0.6, 1], [0.4, 0.2, 0], 0.15);
  if (p.moss) b.box(p.moss, 1.02, 0.12, 0.82, [0, 0.06, 0], [0, 0, 0], 0.15);
});

T('dec_rubble', (b, p) => {
  const c = p.color || '#7a746a';
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1, r = 0.12 + (i % 3) * 0.13;
    if (i % 2) b.box(shade(c, 0.85 + (i % 3) * 0.1), 0.3, 0.2, 0.25, [Math.cos(a) * r, 0.1 + (i === 5 ? 0.15 : 0), Math.sin(a) * r], [i, i * 0.7, 0.2], 0.12);
    else b.dodeca(shade(c, 0.9), 0.15 + (i % 3) * 0.04, [Math.cos(a) * r, 0.08, Math.sin(a) * r], [1.2, 0.7, 1], [i, i, 0], 0.12);
  }
});

T('dec_turret', (b, p) => {
  // round tower (w x h footprint), optional ruined top
  const c = p.color || '#8f897d', R = Math.min(p.w, p.h) / 2 - 0.05, H = p.height || 6;
  b.cyl(c, R, R + 0.12, H, 10, [0, H / 2, 0], [0, 0, 0], 0.1);
  b.cyl(shade(c, 1.1), R + 0.18, R + 0.18, 0.35, 10, [0, H + 0.1, 0]);
  if (p.ruined) {
    for (let i = 0; i < 5; i++) { const a = i * 1.25; b.box(c, 0.5, 0.6 + (i % 3) * 0.4, 0.4, [Math.cos(a) * R * 0.9, H + 0.5, Math.sin(a) * R * 0.9], [0, -a, 0], 0.15); }
  } else {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.box(c, 0.4, 0.45, 0.35, [Math.cos(a) * (R + 0.05), H + 0.5, Math.sin(a) * (R + 0.05)], [0, -a, 0], 0.08); }
    if (p.roof) { b.cone(p.roof, R + 0.35, R * 2.2, 10, [0, H + 0.3 + R * 1.1, 0]); if (p.flag) b.box(p.flag, 0.5, 0.3, 0.03, [0.27, H + 0.4 + R * 2.2 + 0.4, 0], [0, 0, 0], 0); }
  }
  for (let i = 0; i < 3; i++) b.box('#1a1614', 0.18, 0.5, 0.05, [0, H * (0.3 + i * 0.22), R + 0.08], [0, 0, 0], 0);
  b.box(shade(c, 0.8), 0.9, 0.12, 0.2, [0, H * 0.85, R + 0.06], [0, 0, 0], 0.05);
});

T('dec_gravestone_cross', (b, p) => {
  const c = p.color || '#8a857a';
  b.box(c, 0.14, 0.95, 0.12, [0, 0.47, 0], [0, 0, p.tilt || 0]);
  b.box(c, 0.5, 0.13, 0.12, [0, 0.7, 0], [0, 0, p.tilt || 0]);
  b.box('#4a6a2a', 0.5, 0.05, 0.9, [0, 0.02, 0.35], [0, 0, 0], 0.15);
});

T('dec_grave_slab', (b, p) => {
  const c = p.color || '#8a857a';
  b.box(shade(c, 0.85), 0.75, 0.2, 1.5, [0, 0.1, 0], [0, 0, 0], 0.1);
  b.box(c, 0.65, 0.12, 1.4, [0, 0.25, 0]);
  b.box(c, 0.6, 0.8, 0.14, [0, 0.4, -0.7], [0, 0, p.tilt || 0]);
  b.cyl(c, 0.3, 0.3, 0.14, 8, [0, 0.8, -0.7], [Math.PI / 2, 0, 0]);
});

T('dec_grave_mound', (b) => {
  b.sphere('#5a4630', 0.5, [0, 0.0, 0.1], [0.7, 0.35, 1.5], 0, 0.1);
  b.box(DARKWOOD, 0.06, 0.7, 0.06, [0, 0.35, -0.7]);
  b.box(DARKWOOD, 0.35, 0.06, 0.06, [0, 0.55, -0.7]);
});

T('dec_mausoleum', (b, p) => {
  // 3x3 small tomb house with a dark doorway facing +z
  const c = p.color || '#9a958a', W = p.w - 0.2, D = p.h - 0.2;
  b.box(shade(c, 0.85), W + 0.2, 0.3, D + 0.2, [0, 0.15, 0]);
  b.box(c, W, 2.2, D, [0, 1.4, 0], [0, 0, 0], 0.08);
  b.add(new THREE.ConeGeometry(W * 0.75, 1.0, 4), shade(c, 0.9), [0, 3.0, 0], [0, Math.PI / 4, 0], [1, 1, D / W]);
  b.box('#0c0a0a', 1.0, 1.6, 0.1, [0, 1.1, D / 2 + 0.01], [0, 0, 0], 0);
  for (const x of [-0.65, 0.65]) b.cyl(shade(c, 1.1), 0.12, 0.14, 2.2, 6, [x, 1.4, D / 2 + 0.15]);
  b.box(shade(c, 1.1), 1.7, 0.25, 0.4, [0, 2.45, D / 2 + 0.1]);
  b.box(p.trim || '#4a4a52', 0.5, 0.15, 0.05, [0, 2.1, D / 2 + 0.02], [0, 0, 0], 0);
});

T('dec_shrine', (b, p) => {
  const c = p.color || '#b8b2a6', g = p.glow || '#a8e0ff';
  b.box(shade(c, 0.85), 1.6, 0.2, 1.6, [0, 0.1, 0]);
  b.box(c, 1.2, 0.2, 1.2, [0, 0.3, 0]);
  b.cyl(c, 0.25, 0.35, 0.9, 6, [0, 0.85, 0]);
  b.cyl(shade(c, 1.1), 0.5, 0.35, 0.2, 8, [0, 1.38, 0]);
  b.add(new THREE.OctahedronGeometry(0.22, 0), g, [0, 1.75, 0], [0, 0.4, 0], [1, 1.6, 1], 0);
});

T('dec_well_ruined', (b) => {
  b.cyl('#6a645a', 0.55, 0.6, 0.5, 8, [0, 0.25, 0], [0, 0, 0], 0.18);
  b.cyl('#0c0a08', 0.45, 0.45, 0.02, 8, [0, 0.48, 0], [0, 0, 0], 0);
  b.box(DARKWOOD, 0.08, 1.0, 0.08, [-0.5, 0.75, 0], [0, 0, 0.2]);
  b.dodeca('#6a645a', 0.15, [0.6, 0.08, 0.4], [1.3, 0.7, 1], [1, 1, 0], 0.15);
});

T('dec_burnt_house', (b, p) => {
  // collapsed burnt shell (footprint w x h): charred posts and fallen beams
  const W = p.w - 0.4, D = p.h - 0.4;
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) b.box('#2a2220', 0.25, 1.4 + Math.abs(x * z) % 0.8, 0.25, [x, 0.7, z], [0, 0, 0], 0.15);
  b.box('#3a2e28', W, 0.2, 0.2, [0, 0.4, D / 4], [0.1, 0.3, 0.2], 0.15);
  b.box('#2e2420', 0.2, 0.2, D, [W / 5, 0.25, 0], [0.2, 0.1, 0.1], 0.15);
  b.box('#4a4038', W * 0.6, 0.6, 0.3, [-W / 5, 0.3, -D / 2], [0, 0, 0], 0.18);
  b.dodeca('#1e1a18', 0.5, [0, 0.1, 0], [W * 0.5, 0.3, D * 0.4], [0, 0, 0], 0.15);
});

T('dec_dragon_skull', (b, p) => {
  const c = p.color || '#d8d0b8';
  b.box(c, 1.2, 0.9, 1.6, [0, 0.45, -0.2], [0.1, 0, 0], 0.08);
  b.box(c, 0.8, 0.45, 1.3, [0, 0.35, 1.0], [0.15, 0, 0], 0.08);
  b.box(shade(c, 0.85), 0.75, 0.15, 1.1, [0, 0.05, 0.9], [-0.05, 0, 0], 0.08);
  for (const s of [-1, 1]) {
    b.cone(shade(c, 0.95), 0.12, 1.2, 5, [s * 0.5, 1.1, -0.7], [-0.9, 0, s * 0.5], 0.05);
    b.box('#0e0a08', 0.25, 0.2, 0.05, [s * 0.3, 0.6, 0.62], [0, 0, 0], 0);
    for (let i = 0; i < 3; i++) b.cone('#f0ead8', 0.04, 0.2, 4, [s * 0.32, 0.12, 0.7 + i * 0.25], [Math.PI, 0, 0], 0.02);
  }
});

// ------------------------------------------------------------------------------------------------
// Mines, dwarves, sewers, elves
// ------------------------------------------------------------------------------------------------
T('dec_mine_support', (b) => {
  for (const x of [-0.45, 0.45]) b.box(DARKWOOD, 0.16, 2.2, 0.16, [x, 1.1, 0]);
  b.box(DARKWOOD, 1.2, 0.18, 0.2, [0, 2.2, 0]);
  b.box('#5a3d24', 0.1, 0.5, 0.1, [-0.32, 1.95, 0], [0, 0, 0.8]);
  b.box('#5a3d24', 0.1, 0.5, 0.1, [0.32, 1.95, 0], [0, 0, -0.8]);
});

T('dec_rails', (b, p) => {
  const L = Math.max(p.w, p.h), along = p.w >= p.h;
  for (const s of [-0.25, 0.25]) b.box('#5a5a60', along ? L : 0.05, 0.05, along ? 0.05 : L, along ? [0, 0.05, s] : [s, 0.05, 0], [0, 0, 0], 0.05);
  for (let i = 0; i < L * 2; i++) { const t = -L / 2 + 0.25 + i * 0.5; b.box('#4a3420', along ? 0.12 : 0.7, 0.04, along ? 0.7 : 0.12, along ? [t, 0.02, 0] : [0, 0.02, t], [0, 0, 0], 0.08); }
});

T('dec_minecart', (b, p) => {
  b.box('#5a5048', 0.75, 0.45, 0.55, [0, 0.42, 0], [0, 0, 0], 0.1);
  b.box(IRON, 0.8, 0.06, 0.6, [0, 0.65, 0]);
  for (const [x, z] of [[-0.25, -0.28], [0.25, -0.28], [-0.25, 0.28], [0.25, 0.28]]) b.cyl(IRON, 0.11, 0.11, 0.05, 8, [x, 0.13, z], [Math.PI / 2, 0, 0]);
  if (p.ore) for (let i = 0; i < 4; i++) b.dodeca(i % 2 ? p.ore : '#5a5048', 0.13, [-0.18 + (i % 2) * 0.3, 0.7, -0.1 + Math.floor(i / 2) * 0.2], [1, 0.8, 1], [i, i, 0], 0.15);
  if (p.tipped) b.box('#5a5048', 0.4, 0.15, 0.4, [0.6, 0.07, 0.2], [0, 0.4, 0], 0.15);
});

T('dec_mine_entrance', (b, p) => {
  // timber-framed adit cut into rock, footprint ~3x2
  b.dodeca('#5a544c', 0.9, [-1.0, 0.8, -0.2], [0.7, 1.3, 0.9], [0, 0.3, 0]);
  b.dodeca('#625b52', 0.9, [1.0, 0.8, -0.2], [0.7, 1.3, 0.9], [0, 0.8, 0]);
  b.dodeca('#575148', 1.0, [0, 2.0, -0.3], [1.5, 0.6, 0.9], [0.4, 0, 0]);
  b.box('#050404', 1.1, 1.6, 0.3, [0, 0.8, 0.15], [0, 0, 0], 0);
  for (const x of [-0.65, 0.65]) b.box(DARKWOOD, 0.18, 1.9, 0.18, [x, 0.95, 0.35]);
  b.box(DARKWOOD, 1.6, 0.2, 0.22, [0, 1.95, 0.35]);
  if (p.boarded) for (let i = 0; i < 3; i++) b.box('#7a5a38', 1.3, 0.14, 0.05, [0, 0.5 + i * 0.45, 0.45], [0, 0, (i - 1) * 0.25], 0.08);
  if (p.sign) b.box('#8a6a40', 0.6, 0.3, 0.04, [0, 2.25, 0.47], [0, 0, 0.05], 0.05);
});

T('dec_stairs_down', (b, p) => {
  // stone stairway descending into the ground (2x2): dark pit with steps
  const c = p.color || '#7d776c';
  b.box(shade(c, 0.9), 1.9, 0.25, 0.2, [0, 0.12, -0.9]);
  for (const x of [-0.9, 0.9]) b.box(shade(c, 0.9), 0.2, 0.25, 1.9, [x, 0.12, 0]);
  b.box('#0a0808', 1.6, 0.02, 1.6, [0, 0.01, 0], [0, 0, 0], 0);
  for (let i = 0; i < 4; i++) b.box(shade(c, 0.9 - i * 0.15), 1.5, 0.05, 0.3, [0, 0.03, 0.6 - i * 0.35], [0, 0, 0], 0.04);
});

T('dec_trapdoor', (b, p) => {
  const c = p.color || DARKWOOD;
  b.box('#0a0808', 0.9, 0.02, 0.9, [0, 0.01, 0], [0, 0, 0], 0);
  b.box(c, 0.9, 0.06, 0.9, [0, 0.45, -0.45], [-Math.PI / 2 + 0.1, 0, 0], 0.08);
  b.box(IRON, 0.7, 0.05, 0.05, [0, 0.6, -0.42], [0, 0, 0]);
});

T('dec_manhole', (b) => {
  b.cyl('#3a3a3e', 0.42, 0.45, 0.06, 10, [0, 0.03, 0], [0, 0, 0], 0.05);
  for (let i = 0; i < 5; i++) b.box('#1a1a1c', 0.6, 0.07, 0.05, [0, 0.04, -0.24 + i * 0.12], [0, 0, 0], 0);
});

T('dec_sewer_pipe', (b, p) => {
  b.box(p.color || '#6e6860', 1.0, 1.4, 0.6, [0, 0.7, -0.2], [0, 0, 0], 0.15);
  b.cyl('#4a4a4e', 0.38, 0.38, 0.5, 10, [0, 0.55, 0.2], [Math.PI / 2, 0, 0]);
  b.cyl('#0a0c0a', 0.3, 0.3, 0.02, 10, [0, 0.55, 0.46], [Math.PI / 2, 0, 0], 0);
  for (let i = 0; i < 4; i++) b.box('#2a2a2c', 0.04, 0.6, 0.04, [-0.2 + i * 0.13, 0.55, 0.45]);
  b.box('#4a6a3a', 0.4, 0.05, 0.6, [0, 0.03, 0.6], [0, 0, 0], 0.1);
});

T('dec_pipe_valve', (b) => {
  b.cyl('#4a4a4e', 0.12, 0.12, 1.0, 8, [0, 0.5, 0]);
  b.cyl('#4a4a4e', 0.12, 0.12, 0.8, 8, [0, 0.9, -0.3], [Math.PI / 2, 0, 0]);
  b.add(new THREE.TorusGeometry(0.2, 0.03, 4, 10), '#a03020', [0, 1.05, 0], [Math.PI / 2, 0, 0], 1);
});

T('dec_grate', (b) => {
  b.box('#2a2a2c', 0.9, 0.04, 0.9, [0, 0.02, 0], [0, 0, 0], 0);
  for (let i = 0; i < 6; i++) b.box('#4a4a50', 0.85, 0.05, 0.05, [0, 0.05, -0.37 + i * 0.15]);
});

T('dec_anvil_big', (b) => {
  b.box('#6e6860', 1.0, 0.5, 0.8, [0, 0.25, 0], [0, 0, 0], 0.1);
  b.box('#3e3f44', 0.45, 0.3, 0.3, [0, 0.65, 0]);
  b.box('#4a4b52', 1.2, 0.2, 0.42, [0, 0.88, 0]);
  b.cone('#4a4b52', 0.15, 0.4, 4, [0.78, 0.88, 0], [0, 0, -Math.PI / 2]);
});

T('dec_dwarf_door', (b, p) => {
  // huge carved stone gate (3x1), closed
  const c = p.color || '#5e5a54';
  for (const x of [-1.3, 1.3]) b.box(shade(c, 0.9), 0.5, 3.6, 0.9, [x, 1.8, 0], [0, 0, 0], 0.1);
  b.box(shade(c, 1.1), 3.2, 0.6, 1.0, [0, 3.7, 0], [0, 0, 0], 0.1);
  b.box(c, 2.1, 3.3, 0.3, [0, 1.65, 0], [0, 0, 0], 0.06);
  b.box(GOLD, 0.06, 3.0, 0.32, [0, 1.6, 0.01], [0, 0, 0], 0.02);
  for (const y of [0.9, 2.3]) b.add(new THREE.TorusGeometry(0.2, 0.05, 4, 8), GOLD, [0, y, 0.2], [0, 0, 0], 1);
  b.add(new THREE.OctahedronGeometry(0.25, 0), '#c84a2a', [0, 3.7, 0.52], [0, 0, 0], [1, 1, 0.3], 0);
});

T('dec_forge_hearth', (b) => {
  b.box('#5e5248', 1.8, 0.8, 1.6, [0, 0.4, 0], [0, 0, 0], 0.12);
  b.box('#2a1a14', 1.4, 0.06, 1.2, [0, 0.82, 0], [0, 0, 0], 0);
  b.box('#ff6a20', 1.0, 0.05, 0.8, [0, 0.86, 0], [0, 0, 0], 0.15);
  b.box('#ffc050', 0.5, 0.06, 0.4, [0.1, 0.89, 0.1], [0, 0.3, 0], 0);
  b.cone('#4a4038', 1.1, 1.4, 4, [0, 2.2, 0], [0, Math.PI / 4, 0], 0.1);
  b.box('#4a4038', 0.5, 1.6, 0.5, [0, 3.4, 0]);
});

T('dec_moonwell', (b, p) => {
  const c = p.color || '#e8e8f0', g = p.glow || '#8ad8f0';
  const R = Math.min(p.w, p.h) / 2 - 0.1;
  b.cyl(c, R, R + 0.1, 0.5, 14, [0, 0.25, 0], [0, 0, 0], 0.04);
  b.cyl(g, R - 0.2, R - 0.2, 0.04, 14, [0, 0.47, 0], [0, 0, 0], 0.04);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.cyl(c, 0.08, 0.1, 1.4, 6, [Math.cos(a) * R, 0.95, Math.sin(a) * R]);
    b.add(new THREE.OctahedronGeometry(0.1, 0), g, [Math.cos(a) * R, 1.75, Math.sin(a) * R], [0, 0, 0], [1, 1.6, 1], 0);
  }
  b.add(new THREE.OctahedronGeometry(0.3, 0), '#c8f4ff', [0, 1.2, 0], [0, 0.3, 0], [1, 1.8, 1], 0);
});

T('dec_crystal_lamp', (b, p) => {
  const c = p.color || '#e8e8f0', g = p.glow || '#8ad8f0';
  b.cyl(c, 0.05, 0.08, 1.8, 6, [0, 0.9, 0]);
  b.add(new THREE.TorusGeometry(0.18, 0.025, 4, 10, Math.PI * 1.4), c, [0, 1.9, 0], [0, 0, -0.7 * Math.PI], 1, 0.04);
  b.add(new THREE.OctahedronGeometry(0.12, 0), g, [0, 1.95, 0], [0, 0.4, 0], [1, 1.7, 1], 0);
});

T('dec_elven_arch', (b, p) => {
  const c = p.color || '#e8e4dc', W = p.w;
  for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) { b.cyl(c, 0.14, 0.18, 3, 7, [x, 1.5, 0]); b.add(new THREE.OctahedronGeometry(0.1, 0), p.glow || '#8ad8f0', [x, 3.1, 0], [0, 0, 0], [1, 1.6, 1], 0); }
  b.add(new THREE.TorusGeometry(W / 2 - 0.25, 0.1, 4, 12, Math.PI), c, [0, 3.0, 0], [0, 0, 0], [1, 0.6, 1], 0.04);
  for (let i = 0; i < 8; i++) b.sphere(i % 2 ? '#5aa060' : '#7ac080', 0.12, [-W / 2 + 0.25 + (i % 2) * 0.05, 0.6 + i * 0.3, 0.12], [1, 0.8, 1], 0, 0.1);
});

T('dec_totem', (b, p) => {
  const c = p.color || '#6a4a2a';
  b.cyl(c, 0.22, 0.25, 2.6, 6, [0, 1.3, 0], [0, 0, 0], 0.1);
  for (let i = 0; i < 3; i++) {
    const y = 0.6 + i * 0.8;
    b.box(['#c84a2a', '#2a6a8a', '#e8c040'][i], 0.48, 0.12, 0.05, [0, y, 0.24], [0, 0, 0], 0.05);
    b.box('#1a1410', 0.1, 0.1, 0.05, [-0.1, y + 0.2, 0.24], [0, 0, 0], 0);
    b.box('#1a1410', 0.1, 0.1, 0.05, [0.1, y + 0.2, 0.24], [0, 0, 0], 0);
  }
  b.box(c, 1.1, 0.12, 0.15, [0, 2.4, 0], [0, 0, 0], 0.1);
  if (p.skull) b.sphere('#e0d8c0', 0.16, [0, 2.75, 0], [1, 0.95, 1.1], 0, 0.05);
});

T('dec_stepping_stone', (b, p) => {
  const c = p.color || '#7a766e';
  b.cyl(c, 0.42, 0.48, 0.5, 7, [0, -0.15, 0], [0, 0.3, 0], 0.12);
  b.cyl('#5a7a4a', 0.2, 0.2, 0.02, 6, [0.12, 0.11, 0.1], [0, 0, 0], 0.15);
});

T('dec_boardwalk_post', (b) => {
  for (const x of [-0.45, 0.45]) b.cyl('#4a3420', 0.07, 0.08, 1.6, 5, [x, -0.2, 0.45]);
  b.box('#5a3d24', 1.0, 0.06, 0.06, [0, 0.55, 0.45]);
});

T('dec_stilt_hut', (b, p) => {
  // swamp hut raised on stilts (w x h footprint) - solid scenery, not enterable
  const W = p.w - 0.3, D = p.h - 0.3, c = p.color || '#6a5034';
  for (const [x, z] of [[-W / 2 + 0.15, -D / 2 + 0.15], [W / 2 - 0.15, -D / 2 + 0.15], [-W / 2 + 0.15, D / 2 - 0.15], [W / 2 - 0.15, D / 2 - 0.15]]) b.cyl('#4a3420', 0.09, 0.1, 1.4, 5, [x, 0.5, z]);
  b.box('#5a3d24', W + 0.3, 0.12, D + 0.3, [0, 1.2, 0]);
  b.box(c, W - 0.2, 1.4, D - 0.2, [0, 1.95, 0], [0, 0, 0], 0.12);
  b.box('#1a1410', 0.5, 0.9, 0.05, [0, 1.75, D / 2 - 0.08], [0, 0, 0], 0);
  b.box('#2a2018', 0.35, 0.3, 0.05, [W / 3, 2.15, D / 2 - 0.08], [0, 0, 0], 0);
  const geo = new THREE.ConeGeometry(Math.max(W, D) * 0.78, 1.3, 4);
  b.add(geo, p.roof || '#8a7a48', [0, 3.3, 0], [0, Math.PI / 4, 0], [W / Math.max(W, D), 1, D / Math.max(W, D)], 0.12);
  for (let i = 0; i < 3; i++) b.box('#5a3d24', 0.2, 0.05, 0.6, [0, 0.95 - i * 0.35, D / 2 + 0.35 + i * 0.25], [0, 0, 0], 0.05);
});

T('dec_lighthouse', (b, p) => {
  // tall striped tower (3x3). The lamp room glow is a separate animated object ('lighthouse_lamp').
  const H = 8;
  b.cyl('#8a8478', 1.45, 1.5, 0.6, 10, [0, 0.3, 0], [0, 0, 0], 0.1);
  for (let i = 0; i < 4; i++) b.cyl(i % 2 ? '#c03a2a' : '#f2eee6', 1.1 - i * 0.1, 1.2 - i * 0.1, H / 4, 10, [0, 0.6 + H / 8 + i * H / 4, 0], [0, 0, 0], 0.04);
  b.cyl('#3a3a40', 1.0, 0.95, 0.15, 10, [0, H + 0.65, 0]);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.box('#3a3a40', 0.06, 1.0, 0.06, [Math.cos(a) * 0.62, H + 1.2, Math.sin(a) * 0.62]); }
  b.cone('#c03a2a', 0.85, 0.8, 10, [0, H + 2.1, 0]);
  b.box('#1a1614', 0.6, 1.1, 0.1, [0, 1.15, 1.18], [0, 0, 0], 0);
  for (let i = 0; i < 3; i++) b.box('#2a3a4a', 0.25, 0.4, 0.05, [0, 2.8 + i * 1.9, 1.07 - i * 0.1], [0, 0, 0], 0);
});

T('dec_tower_spire', (b, p) => {
  // wizard tower (w x h, ~4x4): stone shaft with blue conical roof, balcony and windows
  const R = Math.min(p.w, p.h) / 2 - 0.15, H = p.height || 10, c = p.color || '#8a8598', roof = p.roof || '#3a4a9a';
  b.cyl(shade(c, 0.85), R + 0.2, R + 0.35, 0.8, 12, [0, 0.4, 0], [0, 0, 0], 0.08);
  b.cyl(c, R - 0.1, R, H * 0.6, 12, [0, H * 0.3 + 0.6, 0], [0, 0, 0], 0.08);
  b.cyl(shade(c, 1.1), R + 0.4, R + 0.4, 0.25, 12, [0, H * 0.6 + 0.6, 0]);
  b.cyl(c, R - 0.25, R - 0.1, H * 0.4, 12, [0, H * 0.8 + 0.6, 0], [0, 0, 0], 0.08);
  b.cyl(shade(c, 1.1), R + 0.15, R + 0.15, 0.2, 12, [0, H + 0.65, 0]);
  b.cone(roof, R + 0.5, H * 0.45, 12, [0, H + 0.75 + H * 0.225, 0], [0, 0, 0], 0.06);
  b.add(new THREE.OctahedronGeometry(0.3, 0), p.gem || '#f0e060', [0, H + 1.2 + H * 0.45, 0], [0, 0.3, 0], [1, 1.5, 1], 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.box('#3a3a40', 0.06, 0.5, 0.06, [Math.cos(a) * (R + 0.35), H * 0.6 + 0.95, Math.sin(a) * (R + 0.35)]); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4, y = 2 + i * 1.7; b.box('#f0d880', 0.3, 0.55, 0.06, [Math.sin(a) * (R - 0.05), y, Math.cos(a) * (R - 0.05)], [0, a, 0], 0); }
  b.box('#2a1a10', 0.8, 1.6, 0.12, [0, 1.4, R - 0.02], [0, 0, 0], 0);
  b.cone(shade(c, 1.1), 0.5, 0.4, 4, [0, 2.4, R], [0, Math.PI / 4, 0]);
  for (let i = 0; i < 5; i++) b.sphere('#e8f0ff', 0.06, [Math.cos(i * 1.3) * (R + 0.6), H * 0.75 + i * 0.4, Math.sin(i * 1.3) * (R + 0.6)], [1, 1, 1], 0, 0);
});

T('dec_windmill_base', (b, p) => {
  const R = Math.min(p.w, p.h) / 2 - 0.2;
  b.cyl('#d8ccb0', R - 0.35, R, 4.2, 8, [0, 2.1, 0], [0, 0, 0], 0.08);
  b.cone('#6a4a2a', R - 0.1, 1.6, 8, [0, 5.0, 0], [0, 0, 0], 0.08);
  b.box('#5a3d24', 0.8, 1.4, 0.1, [0, 0.7, R - 0.02], [0, 0, 0], 0);
  b.box('#4a6a8a', 0.4, 0.5, 0.06, [0, 2.6, R - 0.17], [0, 0, 0], 0);
  b.box('#5a3d24', 0.3, 0.3, 0.6, [0, 4.4, R - 0.1]);
});

// ------------------------------------------------------------------------------------------------
// Animated (individual meshes, use sparingly)
// ------------------------------------------------------------------------------------------------
const hitbox = (w, h, d, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basic(0, { visible: false })); m.position.y = y; return m; };

T('dec_windmill_sails', (b) => { b.box(WOOD, 0.1, 0.1, 0.1, [0, 4.4, 0]); }, {
  animated: true,
  create(model, w, h) {
    const g = new THREE.Group();
    const R = Math.min(w, h) / 2 - 0.2;
    const sails = new GeoBuilder();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      sails.box(DARKWOOD, 0.12, 3.0, 0.08, [Math.sin(a) * 1.5, Math.cos(a) * 1.5, 0], [0, 0, -a]);
      sails.box('#e8e0c8', 0.65, 2.4, 0.04, [Math.sin(a) * 1.6 + Math.cos(a) * 0.38, Math.cos(a) * 1.6 - Math.sin(a) * 0.38, 0.03], [0, 0, -a], 0.04);
    }
    sails.cyl(DARKWOOD, 0.2, 0.2, 0.4, 6, [0, 0, 0], [Math.PI / 2, 0, 0]);
    const m = new THREE.Mesh(sails.build(), VC_MATERIAL);
    m.castShadow = true;
    const hub = new THREE.Group();
    hub.position.set(0, 4.4, R + 0.25);
    hub.add(m);
    g.add(hub);
    g.userData.update = (t) => { m.rotation.z = t * 0.6; };
    return g;
  },
});

T('dec_waterfall', (b) => { b.box('#a8d0f0', 0.1, 0.1, 0.1, [0, 0, 0]); }, {
  animated: true,
  create(model, w, h) {
    const g = new THREE.Group();
    const H = model.height || 3, W = Math.max(w, h) - 0.2;
    const mat = new THREE.MeshBasicMaterial({ color: 0xbfe2f6, transparent: true, opacity: 0.75, depthWrite: false });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), mat);
    sheet.position.set(0, H / 2, 0);
    g.add(sheet);
    const streaks = [];
    const smat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.02), smat);
      s.position.set(-W / 2 + 0.1 + (i / 8) * (W - 0.2), 0, 0.03);
      g.add(s); streaks.push(s);
    }
    const foam = [];
    const fmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), fmat);
      f.position.set(-W / 2 + (i / 5) * W, 0.1, 0.3);
      g.add(f); foam.push(f);
    }
    g.add(hitbox(W, H, 0.4, H / 2));
    g.userData.update = (t) => {
      streaks.forEach((s, i) => { const ph = (t * 1.6 + i * 0.37) % 1; s.position.y = H * (1 - ph); });
      foam.forEach((f, i) => { const s = 0.7 + Math.sin(t * 6 + i * 1.7) * 0.3; f.scale.setScalar(s); f.position.y = 0.1 + Math.abs(Math.sin(t * 3 + i)) * 0.15; });
    };
    return g;
  },
});

T('dec_lighthouse_lamp', (b) => { b.box('#ffe080', 0.1, 0.1, 0.1, [0, 0, 0]); }, {
  animated: true,
  create() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), basic(0xfff0a0));
    core.position.y = 9.2;
    g.add(core);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 14, 10, 1, true), beamMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.x = 7;
    const pivotG = new THREE.Group();
    pivotG.position.y = 9.2;
    pivotG.add(beam);
    g.add(pivotG);
    const light = new THREE.PointLight(0xffe0a0, 2, 18, 1.5);
    light.position.y = 9.2;
    g.add(light);
    g.userData.update = (t) => { pivotG.rotation.y = t * 0.8; };
    return g;
  },
});

T('dec_flag_pole', (b) => { b.box(DARKWOOD, 0.1, 0.1, 0.1, [0, 0, 0]); }, {
  animated: true,
  create(model) {
    const g = new THREE.Group();
    const H = model.height || 4;
    const pole = new GeoBuilder();
    pole.cyl('#5a5a60', 0.05, 0.07, H, 6, [0, H / 2, 0]);
    pole.sphere(GOLD, 0.09, [0, H + 0.05, 0]);
    g.add(new THREE.Mesh(pole.build(), VC_MATERIAL));
    const geo = new THREE.PlaneGeometry(1.2, 0.7, 6, 1);
    const flag = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: model.color || '#8a1a2a', side: THREE.DoubleSide }));
    flag.position.set(0.62, H - 0.4, 0);
    g.add(flag);
    const base = geo.attributes.position.array.slice();
    g.add(hitbox(0.3, H, 0.3, H / 2));
    g.userData.update = (t) => {
      const a = geo.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) { const x = base[i] + 0.6; a[i + 2] = Math.sin(x * 4 - t * 5) * 0.12 * x; }
      geo.attributes.position.needsUpdate = true;
    };
    return g;
  },
});

T('dec_campfire', (b) => { b.box('#333', 0.1, 0.1, 0.1, [0, 0.05, 0]); }, {
  animated: true,
  create(model) {
    const g = new THREE.Group();
    const s = new GeoBuilder();
    for (let i = 0; i < 7; i++) { const a = i * 0.9; s.dodeca('#6a645a', 0.12, [Math.cos(a) * 0.4, 0.05, Math.sin(a) * 0.4], [1.2, 0.7, 1], [i, i, 0], 0.1); }
    s.cyl('#5a3a20', 0.06, 0.06, 0.6, 5, [0, 0.08, 0], [0, 0.5, Math.PI / 2]);
    s.cyl('#5a3a20', 0.06, 0.06, 0.6, 5, [0, 0.08, 0], [0, -0.7, Math.PI / 2]);
    g.add(new THREE.Mesh(s.build(), VC_MATERIAL));
    const flames = [];
    const cols = model.colors || [0xffd040, 0xff8a20, 0xe04010];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.2 - i * 0.04, 0.55 - i * 0.1, 5), basic(cols[i]));
      f.position.set((i - 1) * 0.07, 0.32, (i % 2) * 0.05);
      g.add(f); flames.push(f);
    }
    let light = null;
    if (model.light === true) { light = new THREE.PointLight(model.lightColor || 0xff8a30, 1.2, 6, 1.6); light.position.y = 0.7; g.add(light); }
    g.add(hitbox(0.8, 0.6, 0.8, 0.3));
    g.userData.update = (t) => {
      flames.forEach((f, i) => { const k = 0.85 + Math.sin(t * 11 + i * 2) * 0.15; f.scale.set(1, k, 1); f.rotation.y = t * (1 + i); });
      if (light) light.intensity = 1.1 + Math.sin(t * 14) * 0.2;
    };
    return g;
  },
});

T('dec_glow_orb', (b) => { b.box('#fff', 0.1, 0.1, 0.1, [0, 0, 0]); }, {
  // floating will-o'-wisp / magic mote cluster (no light, purely visual)
  animated: true,
  create(model) {
    const g = new THREE.Group();
    const motes = [];
    const mat = basic(model.color || '#a0ffd0', { transparent: true, opacity: 0.85 });
    for (let i = 0; i < (model.count || 5); i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat);
      g.add(m); motes.push(m);
    }
    g.add(hitbox(0.6, 1.4, 0.6, 0.9));
    g.userData.update = (t) => {
      motes.forEach((m, i) => {
        const a = t * (0.5 + i * 0.13) + i * 1.9;
        m.position.set(Math.cos(a) * (0.3 + (i % 3) * 0.2), 0.8 + Math.sin(t * 1.3 + i) * 0.35 + i * 0.08, Math.sin(a) * (0.3 + (i % 2) * 0.25));
      });
    };
    return g;
  },
});
