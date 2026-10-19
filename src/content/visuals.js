// Content-side visuals. OWNER: agent D (D2).
//  * extra item icon shapes (battleaxe, twohand, warhammer, wand, trimmed armour)
//  * biped templates re-registered with an equipment "decorator": item model.trim / model.glow /
//    custom weapon shapes (battleaxe, maul, sceptre, wand) / crests are drawn on top of the engine rig
//  * new monster templates (bear, boar, toad, crab, scorpion, slug, lizard, elemental, ghost, troll, ogre ...)
// Uses only public render APIs (registerCharacterTemplate, buildBiped, buildQuad, GeoBuilder, VC_MATERIAL).

import * as THREE from 'three';
import { GeoBuilder, VC_MATERIAL, buildBiped, buildQuad, registerCharacterTemplate } from '../render/models.js';
import { registerIconShape } from '../ui/icons.js';
import { getItem } from '../core/registry.js';

// =================================================================================================
// Icons
// =================================================================================================
function adj(hex, f) {
  const c = new THREE.Color(hex);
  if (f > 1) c.lerp(new THREE.Color('#ffffff'), Math.min(1, f - 1)); else c.multiplyScalar(f);
  return '#' + c.getHexString();
}
function paint(ctx, color, outline = true) {
  const g = ctx.createLinearGradient(4, 2, 32, 30);
  g.addColorStop(0, adj(color, 1.35)); g.addColorStop(0.5, color); g.addColorStop(1, adj(color, 0.55));
  ctx.fillStyle = g; ctx.fill();
  if (outline) { ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.stroke(); }
}
function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
function handle(ctx, x0, y0, x1, y1, w = 2.4, color = '#7a5228') {
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = '#000'; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  ctx.restore();
}
function strokeTrim(ctx, c2, w = 1.6) { if (!c2) return; ctx.lineWidth = w; ctx.strokeStyle = c2; ctx.stroke(); }

registerIconShape('battleaxe', (ctx, c, c2) => {
  handle(ctx, 8, 31, 26, 4, 2.6);
  const cx = 20, cy = 13, ax = 0.55, ay = -0.83, px = 0.83, py = 0.55; // head centre, handle dir, perpendicular
  for (const sd of [1, -1]) {
    const P = (al, pe) => [cx + ax * al + px * pe * sd, cy + ay * al + py * pe * sd];
    const n1 = P(2.5, 2), n2 = P(-2.5, 2), o1 = P(7, 10), o2 = P(-7, 10), k = P(0, 13.5);
    ctx.beginPath(); ctx.moveTo(...n1); ctx.lineTo(...o1); ctx.quadraticCurveTo(...k, ...o2); ctx.lineTo(...n2); ctx.closePath();
    paint(ctx, sd > 0 ? c : adj(c, 0.9));
  }
  if (c2) { ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, 7); ctx.fillStyle = c2; ctx.fill(); }
});
registerIconShape('twohand', (ctx, c, c2) => {
  handle(ctx, 3, 32, 9, 26, 3.2, '#5a3a20');
  poly(ctx, [8, 23, 30, 1, 33, 0, 32, 4, 11, 26]); paint(ctx, c);
  poly(ctx, [3, 21, 6, 18, 15, 27, 12, 30]); paint(ctx, c2 || '#c8a040');
});
registerIconShape('warhammer', (ctx, c, c2) => {
  handle(ctx, 8, 30, 21, 10, 2.8);
  poly(ctx, [13, 6, 25, 1, 31, 12, 19, 17]); paint(ctx, c);
  if (c2) { poly(ctx, [18, 4, 21, 3, 26, 14, 23, 15]); paint(ctx, c2, false); }
});
registerIconShape('wand', (ctx, c, c2) => {
  handle(ctx, 9, 29, 25, 9, 2.2, c);
  ctx.beginPath(); ctx.arc(26, 8, 3.5, 0, 7); paint(ctx, c2 || '#e0d0ff');
  ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(26, 8, 6.5, 0, 7); ctx.fillStyle = c2 || '#e0d0ff'; ctx.fill(); ctx.globalAlpha = 1;
});
registerIconShape('tplatebody', (ctx, c, c2) => {
  poly(ctx, [4, 9, 11, 4, 25, 4, 32, 9, 30, 18, 26, 16, 26, 29, 10, 29, 10, 16, 6, 18]); paint(ctx, c);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(18, 6); ctx.lineTo(18, 28); ctx.stroke();
  if (c2) {
    ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(18, 9); ctx.lineTo(24, 5); strokeTrim(ctx, c2, 1.8);
    ctx.beginPath(); ctx.moveTo(10.5, 26.5); ctx.lineTo(25.5, 26.5); strokeTrim(ctx, c2, 2);
    ctx.beginPath(); ctx.moveTo(4.5, 9.5); ctx.lineTo(11, 4.5); strokeTrim(ctx, c2, 1.5);
    ctx.beginPath(); ctx.moveTo(31.5, 9.5); ctx.lineTo(25, 4.5); strokeTrim(ctx, c2, 1.5);
  }
});
registerIconShape('tchainbody', (ctx, c, c2) => {
  poly(ctx, [4, 9, 11, 4, 25, 4, 32, 9, 30, 18, 26, 16, 26, 29, 10, 29, 10, 16, 6, 18]); paint(ctx, c);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; for (let y = 8; y < 28; y += 3) for (let x = 11 + (y % 2); x < 26; x += 3) ctx.fillRect(x, y, 1, 1);
  if (c2) { ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(18, 8); ctx.lineTo(24, 5); strokeTrim(ctx, c2, 1.6); }
});
registerIconShape('tlegs', (ctx, c, c2) => {
  poly(ctx, [9, 3, 27, 3, 29, 30, 21, 30, 18, 12, 15, 30, 7, 30]); paint(ctx, c);
  if (c2) { ctx.beginPath(); ctx.moveTo(9.5, 4.5); ctx.lineTo(26.5, 4.5); strokeTrim(ctx, c2, 2); ctx.fillStyle = c2; ctx.fillRect(9, 17, 4, 3); ctx.fillRect(23, 17, 4, 3); }
});
registerIconShape('tskirt', (ctx, c, c2) => {
  poly(ctx, [11, 3, 25, 3, 31, 29, 5, 29]); paint(ctx, c);
  if (c2) { ctx.beginPath(); ctx.moveTo(6, 27.5); ctx.lineTo(30, 27.5); strokeTrim(ctx, c2, 2); ctx.beginPath(); ctx.moveTo(11.5, 4.5); ctx.lineTo(24.5, 4.5); strokeTrim(ctx, c2, 1.6); }
});
registerIconShape('tfullhelm', (ctx, c, c2) => {
  ctx.beginPath(); ctx.moveTo(7, 28); ctx.lineTo(7, 13); ctx.quadraticCurveTo(7, 3, 18, 3); ctx.quadraticCurveTo(29, 3, 29, 13); ctx.lineTo(29, 28); ctx.closePath(); paint(ctx, c);
  ctx.fillStyle = '#111'; ctx.fillRect(10, 14, 16, 2.5); ctx.fillRect(17, 14, 2, 9);
  if (c2) { ctx.beginPath(); ctx.moveTo(18, 3.5); ctx.lineTo(18, 11); strokeTrim(ctx, c2, 2.4); ctx.beginPath(); ctx.moveTo(7.5, 27); ctx.lineTo(28.5, 27); strokeTrim(ctx, c2, 1.8); }
});

// =================================================================================================
// Materials / helpers
// =================================================================================================
const glowMats = new Map();
function glowMat(color, opacity = 1) {
  const key = `${color}|${opacity}`;
  let m = glowMats.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    glowMats.set(key, m);
  }
  return m;
}
const GHOST_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.55, depthWrite: false });

const meshOf = (b) => { const m = new THREE.Mesh(b.build(), VC_MATERIAL); m.castShadow = true; return m; };
const glowMesh = (geo, color, pos, rot = [0, 0, 0], scl = [1, 1, 1], opacity = 1) => {
  const m = new THREE.Mesh(geo, glowMat(color, opacity));
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...(typeof scl === 'number' ? [scl, scl, scl] : scl));
  return m;
};
const G_BOX = new THREE.BoxGeometry(1, 1, 1);
const G_OCT = new THREE.OctahedronGeometry(1, 0);
const G_SPH = new THREE.IcosahedronGeometry(1, 1);
const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

/** {model, def} for an equipment entry (item id or visual object). */
function info(v) {
  if (!v) return null;
  if (typeof v === 'string') { const def = getItem(v); if (!def) return null; return { def, m: { color: def.color || def.icon?.color, ...(def.model || {}) } }; }
  return { def: null, m: v };
}

// =================================================================================================
// Weapon meshes for shapes the engine doesn't know
// =================================================================================================
const WOOD = '#5a3d24';
function customWeapon(m) {
  const b = new GeoBuilder();
  const c = m.color || '#888', c2 = m.color2 || shade(c, 0.7);
  switch (m.shape) {
    case 'battleaxe': {
      b.box(WOOD, 0.05, 0.9, 0.05, [0, 0.3, 0]);
      for (const sd of [1, -1]) {
        b.add(new THREE.ConeGeometry(0.2, 0.26, 4, 1), c, [0, 0.64, sd * 0.15], [-sd * Math.PI / 2, 0, 0], [0.18, 1, 1]);
        b.box(shade(c, 1.25), 0.025, 0.4, 0.03, [0, 0.64, sd * 0.28]);
      }
      b.box(c2, 0.08, 0.12, 0.08, [0, 0.64, 0]);
      b.cone(c, 0.03, 0.12, 4, [0, 0.8, 0]);
      return b;
    }
    case 'maul':
      b.box(WOOD, 0.06, 1.05, 0.06, [0, 0.35, 0]);
      b.box(c, 0.26, 0.24, 0.44, [0, 0.9, 0], [0, 0, 0], 0.12);
      for (const sd of [1, -1]) b.box(shade(c, 0.7), 0.28, 0.26, 0.035, [0, 0.9, sd * 0.225]);
      b.box(c2, 0.27, 0.025, 0.45, [0, 0.9, 0]);
      return b;
    case 'sceptre':
      b.cyl('#2a2a30', 0.025, 0.03, 1.1, 5, [0, 0.35, 0]);
      b.box(c2, 0.14, 0.13, 0.14, [0, 0.98, 0]);
      b.box('#111', 0.04, 0.03, 0.02, [-0.03, 0.99, 0.07], [0, 0, 0], 0); b.box('#111', 0.04, 0.03, 0.02, [0.03, 0.99, 0.07], [0, 0, 0], 0);
      return b;
    case 'wand':
      b.cyl(c, 0.015, 0.022, 0.45, 5, [0, 0.18, 0]);
      b.sphere(c2, 0.035, [0, 0.43, 0]);
      return b;
    default: return null;
  }
}

/** Glow accents attached to a weapon mesh (weapon-local coordinates, blade along +y). */
function weaponGlow(mesh, shape, glow) {
  const add = (geo, pos, scl, op = 1) => mesh.add(glowMesh(geo, glow, pos, [0, 0, 0], scl, op));
  switch (shape) {
    case 'dagger': add(G_BOX, [0, 0.24, 0], [0.016, 0.24, 0.026]); break;
    case 'longsword': add(G_BOX, [0, 0.56, 0], [0.018, 0.74, 0.026]); break;
    case 'twohanded': add(G_BOX, [0, 0.74, 0], [0.03, 1.0, 0.03]); break;
    case 'scimitar': add(G_BOX, [0, 0.22, 0], [0.018, 0.26, 0.026]); mesh.add(glowMesh(G_BOX, glow, [0.04, 0.47, 0], [0, 0, -0.25], [0.018, 0.26, 0.026])); break;
    case 'axe': add(G_BOX, [0, 0.52, 0.205], [0.055, 0.2, 0.025]); break;
    case 'battleaxe': add(G_BOX, [0, 0.64, 0.29], [0.03, 0.38, 0.02]); add(G_BOX, [0, 0.64, -0.29], [0.03, 0.38, 0.02]); break;
    case 'mace': add(G_SPH, [0, 0.52, 0], 0.15, 0.35); break;
    case 'warhammer': add(G_BOX, [0, 0.58, 0], [0.15, 0.04, 0.31]); break;
    case 'maul': for (const sd of [1, -1]) mesh.add(glowMesh(G_OCT, glow, [sd * 0.135, 0.9, 0], [0, 0, 0], [0.02, 0.07, 0.1])); break;
    case 'spear': add(G_OCT, [0, 1.15, 0], [0.05, 0.13, 0.05]); add(G_SPH, [0, 1.12, 0], 0.12, 0.3); break;
    case 'staff': add(G_SPH, [0, 1.05, 0], 0.075); add(G_SPH, [0, 1.05, 0], 0.15, 0.35); break;
    case 'sceptre': add(G_SPH, [0, 1.12, 0], 0.06); add(G_SPH, [0, 1.12, 0], 0.13, 0.35); break;
    case 'wand': add(G_SPH, [0, 0.43, 0], 0.04); add(G_SPH, [0, 0.43, 0], 0.09, 0.35); break;
    case 'pickaxe': add(G_OCT, [0, 0.58, 0.3], 0.04); add(G_OCT, [0, 0.58, -0.3], 0.04); break;
    case 'bow': add(G_BOX, [0, 0, -0.08], [0.012, 0.8, 0.012]); break;
    default: add(G_BOX, [0, 0.4, 0], [0.016, 0.5, 0.026]); // sword
  }
}

// =================================================================================================
// Biped equipment decorator
// =================================================================================================
function bipedDims(o) {
  const P = { legLen: 0.6, torsoW: 0.44, torsoH: 0.52, torsoD: 0.25, headS: 0.27, armLen: 0.5, limbW: 0.13, ...(o.proportions || {}) };
  if (o.female) P.torsoW *= 0.9;
  return P;
}

export function decorateBiped(rig, o) {
  const E = o.equipment || {};
  const P = bipedDims(o);
  const parts = rig.parts;
  const bones = !!o.extras?.bones;

  // --- weapon -------------------------------------------------------------------------------------
  const w = info(E.weapon);
  if (w) {
    const isBow = w.m.shape === 'bow';
    const mount = isBow ? parts.handL : parts.handR;
    let mesh = mount.children[0];
    const cb = customWeapon(w.m);
    if (cb) {
      if (mesh) mount.remove(mesh);
      mesh = meshOf(cb);
      mesh.rotation.x = Math.PI / 2 - 0.25;
      mount.add(mesh);
    }
    if (mesh && w.m.glow) weaponGlow(mesh, w.m.shape || 'sword', w.m.glow);
  }

  // --- body ---------------------------------------------------------------------------------------
  const body = info(E.body);
  if (body && !bones) {
    const t = body.m.trim, g = body.m.glow, sh = body.m.shape;
    const b = new GeoBuilder();
    const H = P.torsoH, Wd = P.torsoW, D = P.torsoD;
    if (t) {
      b.box(t, Wd * 0.62, 0.05, D + 0.07, [0, H * 0.965, 0], [0, 0, 0], 0.02);
      if (sh === 'platebody') {
        b.box(t, Wd + 0.065, 0.035, D + 0.065, [0, H * 0.41, 0], [0, 0, 0], 0.02);
        b.box(t, Wd + 0.045, 0.05, D + 0.045, [0, 0.05, 0], [0, 0, 0], 0.02);
        b.box(t, 0.035, H * 0.5, 0.02, [0, H * 0.66, D / 2 + 0.035], [0, 0, 0], 0.02);
      } else if (sh === 'chainbody') {
        b.box(t, Wd + 0.035, 0.04, D + 0.035, [0, 0.06, 0], [0, 0, 0], 0.02);
      } else {
        b.box(t, 0.05, H * 0.92, 0.02, [0, H * 0.48, D / 2 + 0.018], [0, 0, 0], 0.02);
        b.box(t, Wd + 0.03, 0.04, D + 0.03, [0, 0.05, 0], [0, 0, 0], 0.02);
      }
      parts.torso.add(meshOf(b));
      // shoulder rims / cuffs
      [parts.armL, parts.armR].forEach((arm, i) => {
        const side = i ? 1 : -1;
        const ab = new GeoBuilder();
        if (sh === 'platebody') ab.box(t, P.limbW + 0.095, 0.03, P.limbW + 0.115, [side * 0.02, -0.065, 0], [0, 0, 0], 0.02);
        else ab.box(t, P.limbW + 0.025, 0.035, P.limbW + 0.035, [0, -P.armLen * 0.53, 0], [0, 0, 0], 0.02);
        arm.add(meshOf(ab));
      });
    }
    if (g) {
      parts.torso.add(glowMesh(G_OCT, g, [0, H * 0.72, D / 2 + 0.045], [0, 0, 0], [0.045, 0.06, 0.03]));
      parts.torso.add(glowMesh(G_SPH, g, [0, H * 0.72, D / 2 + 0.045], [0, 0, 0], 0.09, 0.3));
    }
  }

  // --- legs ---------------------------------------------------------------------------------------
  const legs = info(E.legs);
  if (legs && !bones && (legs.m.trim || legs.m.glow)) {
    const t = legs.m.trim, sh = legs.m.shape;
    if (sh === 'skirt' || sh === 'robe') {
      if (t) {
        const b = new GeoBuilder();
        const y = -P.legLen * 0.35 - P.legLen * 0.375 + 0.03;
        b.add(new THREE.CylinderGeometry(P.torsoW * 0.765, P.torsoW * 0.775, 0.05, 8), t, [0, y, 0], [0, Math.PI / 8, 0], [1, 1, 0.76], 0.02);
        parts.torso.add(meshOf(b));
      }
    } else if (t) {
      [parts.legL, parts.legR].forEach((leg) => {
        const b = new GeoBuilder();
        b.box(t, 0.09, 0.08, 0.03, [0, -P.legLen * 0.5, (P.limbW + 0.07) / 2 + 0.012], [0, 0, 0], 0.02);
        b.box(t, P.limbW + 0.045, 0.03, P.limbW + 0.065, [0, -0.04, 0], [0, 0, 0], 0.02);
        leg.add(meshOf(b));
      });
    }
  }

  // --- head ---------------------------------------------------------------------------------------
  const head = info(E.head);
  if (head && !bones) {
    const s = P.headS, t = head.m.trim, g = head.m.glow, sh = head.m.shape;
    const b = new GeoBuilder();
    let any = false;
    if (sh === 'full_helm') {
      if (t) {
        any = true;
        b.box(t, 0.05, s * 0.34, s + 0.12, [0, s * 1.16, 0], [0, 0, 0], 0.02);
        b.box(t, s + 0.08, 0.035, s + 0.08, [0, s * 0.57 - (s + 0.06) / 2 + 0.02, 0], [0, 0, 0], 0.02);
      }
      if (head.m.crest) { any = true; b.cone(head.m.crest, 0.05, s * 0.9, 5, [0, s * 1.3, s * 0.25], [0.5, 0, 0]); }
      if (g) parts.head.add(glowMesh(G_BOX, g, [0, s * 0.62, s / 2 + 0.042], [0, 0, 0], [s * 0.76, 0.04, 0.02]));
    } else if (sh === 'med_helm' && t) {
      any = true;
      b.add(new THREE.CylinderGeometry(s * 0.68, s * 0.68, 0.045, 8), t, [0, s * 0.8, 0], [0, Math.PI / 8, 0], 1, 0.02);
    } else if (sh === 'wizard_hat') {
      if (t) { any = true; b.add(new THREE.CylinderGeometry(s * 0.53, s * 0.56, 0.07, 8), t, [0, s * 1.14, -0.01], [-0.05, 0, 0], 1, 0.02); }
      if (g) { parts.head.add(glowMesh(G_OCT, g, [0, s * 2.4, -0.08], [0, 0, 0], 0.035)); parts.head.add(glowMesh(G_SPH, g, [0, s * 2.4, -0.08], [0, 0, 0], 0.07, 0.35)); }
    } else if (sh === 'hood' && t) {
      any = true;
      b.box(t, s * 0.78, 0.035, 0.04, [0, s * 0.8, s / 2 + 0.03], [0, 0, 0], 0.02);
      for (const sd of [-1, 1]) b.box(t, 0.035, s * 0.6, 0.04, [sd * s * 0.38, s * 0.5, s / 2 + 0.03], [0, 0, 0], 0.02);
    }
    if (any) parts.head.add(meshOf(b));
  }

  // --- shield -------------------------------------------------------------------------------------
  const sh = info(E.shield);
  if (sh && (sh.m.trim || sh.m.glow)) {
    const mount = parts.shieldMount;
    const t = sh.m.trim, g = sh.m.glow;
    const b = new GeoBuilder();
    if (t) {
      if (sh.m.shape === 'square') {
        for (const y of [0.245, -0.245]) b.box(t, 0.065, 0.035, 0.46, [0, y, 0], [0, 0, 0], 0.02);
        for (const z of [0.222, -0.222]) b.box(t, 0.065, 0.5, 0.035, [0, 0, z], [0, 0, 0], 0.02);
      } else if (sh.m.shape === 'round') {
        b.add(new THREE.TorusGeometry(0.255, 0.02, 4, 14), t, [0, 0, 0], [0, Math.PI / 2, 0], 1, 0.02);
      } else {
        b.box(t, 0.065, 0.035, 0.44, [0, 0.31, 0], [0, 0, 0], 0.02);
        for (const z of [0.21, -0.21]) b.box(t, 0.065, 0.45, 0.035, [0, 0.08, z], [0, 0, 0], 0.02);
      }
      mount.add(meshOf(b));
    }
    if (g) {
      mount.add(glowMesh(G_OCT, g, [-0.045, 0.1, 0], [0, 0, 0], [0.03, 0.06, 0.05]));
      mount.add(glowMesh(G_SPH, g, [-0.05, 0.1, 0], [0, 0, 0], 0.1, 0.3));
    }
  }

  // --- cape / neck ----------------------------------------------------------------------------------
  const cape = info(E.cape);
  if (cape?.m.glow && parts.cape) {
    const len = P.torsoH + P.legLen * 0.75;
    parts.cape.add(glowMesh(G_BOX, cape.m.glow, [0, -len + 0.03, -0.005], [0, 0, 0], [P.torsoW + 0.07, 0.035, 0.036]));
  }
  const neck = info(E.neck);
  if (neck?.m.glow && !bones) parts.torso.add(glowMesh(G_OCT, neck.m.glow, [0, P.torsoH - 0.15, P.torsoD / 2 + 0.03], [0, 0, 0], 0.03));

  // --- monster extras -----------------------------------------------------------------------------
  const X = o.extras || {};
  if (X.glowEyes && X.realGlow !== false && !bones) {
    const s = P.headS;
    for (const sd of [-1, 1]) parts.head.add(glowMesh(G_BOX, X.glowEyes, [sd * s * 0.22, s * 0.6, s / 2 + 0.012], [0, 0, 0], [s * 0.17, s * 0.13, 0.02]));
  }
  if (bones && X.glowEyes) {
    const s = P.headS;
    for (const sd of [-1, 1]) parts.head.add(glowMesh(G_BOX, X.glowEyes, [sd * s * 0.2, s * 0.6, s / 2 + 0.012], [0, 0, 0], [s * 0.2, s * 0.15, 0.02]));
  }
  if (X.tusks) {
    const s = P.headS, b = new GeoBuilder();
    for (const sd of [-1, 1]) b.cone(X.tuskColor || '#f0e8d0', 0.025, 0.11, 4, [sd * s * 0.25, s * 0.22, s / 2 + 0.02], [0, 0, sd * 0.2]);
    parts.head.add(meshOf(b));
  }
  if (X.crown) {
    const s = P.headS, b = new GeoBuilder();
    b.add(new THREE.CylinderGeometry(s * 0.55, s * 0.55, s * 0.18, 8, 1, true), X.crown, [0, s * 1.15, 0], [0, 0, 0], 1, 0.05);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.cone(X.crown, 0.035, s * 0.25, 4, [Math.sin(a) * s * 0.52, s * 1.32, Math.cos(a) * s * 0.52]); }
    parts.head.add(meshOf(b));
  }
  if (X.core) { // glowing chest core (elementals, golems)
    parts.torso.add(glowMesh(G_OCT, X.core, [0, P.torsoH * 0.55, P.torsoD / 2 + 0.02], [0, 0.3, 0], [0.08, 0.11, 0.06]));
    parts.torso.add(glowMesh(G_SPH, X.core, [0, P.torsoH * 0.55, P.torsoD / 2], [0, 0, 0], 0.17, 0.3));
  }
  if (X.cracks) { // glowing lava cracks over torso and limbs
    const add = (pivot, pos, scl) => pivot.add(glowMesh(G_BOX, X.cracks, pos, [0, 0, 0.3], scl));
    add(parts.torso, [-P.torsoW * 0.2, P.torsoH * 0.35, P.torsoD / 2 + 0.005], [0.03, P.torsoH * 0.4, 0.01]);
    add(parts.torso, [P.torsoW * 0.22, P.torsoH * 0.7, P.torsoD / 2 + 0.005], [0.025, P.torsoH * 0.3, 0.01]);
    add(parts.armL, [0, -P.armLen * 0.5, P.limbW / 2 + 0.008], [0.02, P.armLen * 0.4, 0.01]);
    add(parts.armR, [0, -P.armLen * 0.4, P.limbW / 2 + 0.008], [0.02, P.armLen * 0.4, 0.01]);
    add(parts.legL, [0, -P.legLen * 0.5, P.limbW / 2 + 0.03], [0.02, P.legLen * 0.4, 0.01]);
  }
  if (X.vortex) { // no legs: a swirling cone instead (elementals / ghosts)
    parts.legL.visible = false; parts.legR.visible = false;
    const b = new GeoBuilder();
    b.cone(X.vortex, P.torsoW * 0.55, P.legLen * 1.1, 7, [0, -P.legLen * 0.5, 0], [Math.PI, 0, 0], 0.15);
    parts.body.add(meshOf(b));
  }
  if (X.orbit) { // floating chunks around the body
    const b = new GeoBuilder();
    for (let i = 0; i < 5; i++) { const a = i * 1.26; b.dodeca(X.orbit, 0.07 + (i % 2) * 0.03, [Math.cos(a) * P.torsoW * 1.25, P.torsoH * (0.2 + (i % 3) * 0.35), Math.sin(a) * P.torsoW * 1.0]); }
    parts.torso.add(meshOf(b));
  }
  if (o.ghost) rig.root.traverse((n) => { if (n.isMesh && n.material === VC_MATERIAL) n.material = GHOST_MAT; });
  return rig;
}

// Re-register the engine's biped templates with the decorator (same parameters as render/models.js).
const biped = (o) => decorateBiped(buildBiped(o), o);
registerCharacterTemplate('human', (o) => biped(o));
registerCharacterTemplate('goblin', (o) => biped({
  ...o, scale: (o.scale || 1) * 0.78,
  colors: { skin: '#6a9a3a', top: '#6a4a2a', legs: '#4a3a2a', hair: '#2a2a1a', ...(o.colors || {}) },
  proportions: { headS: 0.32, legLen: 0.5, ...(o.proportions || {}) }, hairStyle: 'bald', extras: { ears: true, nose: 0.12, ...(o.extras || {}) },
}));
registerCharacterTemplate('imp', (o) => biped({
  ...o, scale: (o.scale || 1) * 0.6,
  colors: { skin: '#b83a2a', top: '#b83a2a', legs: '#9a2a1a', boots: '#4a1a10', ...(o.colors || {}) },
  hairStyle: 'bald', extras: { horns: true, tail: true, ears: true, tailColor: '#b83a2a', ...(o.extras || {}) },
}));
registerCharacterTemplate('skeleton', (o) => biped({
  ...o, colors: { skin: '#e6e0cc', ...(o.colors || {}) }, hairStyle: 'bald', extras: { bones: true, ...(o.extras || {}) },
}));
registerCharacterTemplate('zombie', (o) => biped({
  ...o, colors: { skin: '#7a9070', top: '#4a4038', legs: '#3a3430', hair: '#2a2a20', eyes: '#d0d040', ...(o.colors || {}) },
  hairStyle: o.hairStyle || 'short', extras: { zombie: true, ...(o.extras || {}) },
}));
registerCharacterTemplate('giant', (o) => biped({
  ...o, scale: (o.scale || 1) * 1.9,
  colors: { skin: '#c8946a', top: '#c8946a', legs: '#6a4a2a', hair: '#5a3a1a', ...(o.colors || {}) },
  extras: { beard: true, ...(o.extras || {}) },
}));
registerCharacterTemplate('demon', (o) => biped({
  ...o, scale: (o.scale || 1) * 1.6,
  colors: { skin: '#8a1e1a', top: '#8a1e1a', legs: '#6a1410', boots: '#2a0a08', hands: '#2a0a08', eyes: '#ffd040', ...(o.colors || {}) },
  hairStyle: 'bald', extras: { horns: true, wings: true, tail: true, tailColor: '#6a1410', wingColor: '#3a0a08', hornColor: '#2a2420', ...(o.extras || {}) },
}));
registerCharacterTemplate('golem', (o) => biped({
  ...o, scale: (o.scale || 1) * 1.4,
  colors: { skin: '#7a756c', top: '#6a655c', legs: '#6a655c', boots: '#5a554c', eyes: '#60e0ff', ...(o.colors || {}) },
  proportions: { torsoW: 0.62, torsoD: 0.4, limbW: 0.2, headS: 0.26, ...(o.proportions || {}) }, hairStyle: 'bald', extras: { glowEyes: '#60e0ff', ...(o.extras || {}) },
}));

// --- new biped templates ------------------------------------------------------------------------------
registerCharacterTemplate('troll', (o) => biped({
  ...o, scale: (o.scale || 1) * 1.55,
  colors: { skin: '#6a7a62', top: '#5a4a3a', legs: '#4a3a2a', hair: '#2a2a22', eyes: '#e8d040', boots: '#5a6a52', ...(o.colors || {}) },
  proportions: { legLen: 0.5, armLen: 0.68, torsoW: 0.52, torsoD: 0.32, headS: 0.3, limbW: 0.16, ...(o.proportions || {}) },
  hairStyle: 'short', extras: { nose: 0.16, ears: true, tusks: true, ...(o.extras || {}) },
}));
registerCharacterTemplate('ogre', (o) => biped({
  ...o, scale: (o.scale || 1) * 1.7,
  colors: { skin: '#a8945a', top: '#6a4a2a', legs: '#4a3a22', hair: '#2a1a10', eyes: '#1a1a1a', ...(o.colors || {}) },
  proportions: { legLen: 0.48, torsoW: 0.6, torsoD: 0.42, headS: 0.3, limbW: 0.17, armLen: 0.56, ...(o.proportions || {}) },
  hairStyle: 'bald', extras: { tusks: true, nose: 0.06, ...(o.extras || {}) },
}));
registerCharacterTemplate('lizardfolk', (o) => biped({
  ...o, colors: { skin: '#4a7a3a', top: '#5a4a2a', legs: '#4a6a32', boots: '#3a5a2a', eyes: '#e8c020', ...(o.colors || {}) },
  proportions: { headS: 0.26, ...(o.proportions || {}) },
  hairStyle: 'bald', extras: { tail: true, tailColor: (o.colors && o.colors.skin) || '#4a7a3a', nose: 0.16, ...(o.extras || {}) },
}));
registerCharacterTemplate('elemental', (o) => {
  const c = o.colors?.body || '#8a8a8a';
  return biped({
    ...o, scale: (o.scale || 1) * 1.2,
    colors: { skin: c, top: shade(c, 0.85), legs: c, boots: c, hands: shade(c, 1.2), eyes: o.colors?.eyes || '#ffffff', ...(o.colors || {}) },
    proportions: { torsoW: 0.52, torsoD: 0.34, limbW: 0.15, headS: 0.25, ...(o.proportions || {}) }, hairStyle: 'bald',
    extras: { flying: true, vortex: shade(c, 0.8), core: o.colors?.core || '#ffffff', orbit: shade(c, 1.1), glowEyes: o.colors?.eyes || '#ffffff', ...(o.extras || {}) },
  });
});
registerCharacterTemplate('ghost', (o) => biped({
  ...o, ghost: true,
  colors: { skin: '#c8d8e0', top: '#a8b8c8', legs: '#a8b8c8', hair: '#d8e8f0', eyes: '#203040', ...(o.colors || {}) },
  hairStyle: o.hairStyle || 'long',
  extras: { flying: true, vortex: (o.colors && o.colors.top) || '#a8b8c8', ...(o.extras || {}) },
}));
registerCharacterTemplate('magma_golem', (o) => biped({
  ...o, scale: (o.scale || 1) * 1.4,
  colors: { skin: '#3a2e2a', top: '#2e2420', legs: '#2e2420', boots: '#241c18', hands: '#3a2e2a', eyes: '#ffb030', ...(o.colors || {}) },
  proportions: { torsoW: 0.66, torsoD: 0.42, limbW: 0.21, headS: 0.24, ...(o.proportions || {}) }, hairStyle: 'bald',
  extras: { glowEyes: '#ffb030', cracks: '#ff6a10', core: '#ff8a20', ...(o.extras || {}) },
}));

// --- quadrupeds ---------------------------------------------------------------------------------------
registerCharacterTemplate('bear', (o) => buildQuad({
  len: 1.15, bodyH: 0.6, bodyW: 0.6, legLen: 0.38, legW: 0.2, headS: 0.36, snout: 0.16, ears: 0.08, tail: 0.12, hump: true, ...o,
  colors: { body: '#5a3e26', belly: '#4a3220', snout: '#c8a080', ...(o.colors || {}) }, snoutColor: o.snoutColor || '#8a6a4a', hoof: '#2a1a10',
}));
registerCharacterTemplate('boar', (o) => buildQuad({
  len: 0.85, bodyH: 0.42, bodyW: 0.36, legLen: 0.26, legW: 0.1, headS: 0.3, snout: 0.16, ears: 0.08, horns: 0.12, tail: 0.18, ...o,
  colors: { body: '#5a4434', horn: '#f0e8d0', ...(o.colors || {}) }, snoutColor: '#a07060', spikes: o.spikes || '#2a2018', hoof: '#1a1410',
}));
registerCharacterTemplate('toad', (o) => {
  const rig = buildQuad({
    len: 0.5, bodyH: 0.3, bodyW: 0.46, legLen: 0.1, legW: 0.11, headS: 0.32, snout: 0.05, neck: 0, ...o,
    colors: { body: '#5a7a32', belly: '#c8c890', eyes: '#e8c020', ...(o.colors || {}) }, snoutColor: (o.colors && o.colors.body) || '#5a7a32', spikes: o.warts || null,
  });
  // bulging eyes
  const b = new GeoBuilder();
  for (const sd of [-1, 1]) { b.sphere((o.colors && o.colors.body) || '#5a7a32', 0.07, [sd * 0.11, 0.2, 0.12]); b.sphere('#111', 0.035, [sd * 0.12, 0.23, 0.17]); }
  rig.parts.head.add(meshOf(b));
  return rig;
});
registerCharacterTemplate('lizard', (o) => {
  const rig = buildQuad({
    len: 1.3, bodyH: 0.34, bodyW: 0.42, legLen: 0.2, legW: 0.12, headS: 0.3, snout: 0.25, neck: 0.12, tail: 1.1, tailW: 0.08, ...o,
    colors: { body: '#5a6a3a', belly: '#b8b080', eyes: '#ff4020', ...(o.colors || {}) }, spikes: o.spikes || '#3a4a2a',
  });
  if (o.horn) { const b = new GeoBuilder(); b.cone(o.horn, 0.06, 0.3, 5, [0, 0.2, 0.32], [0.9, 0, 0]); rig.parts.head.add(meshOf(b)); }
  if (o.glowEyes) for (const sd of [-1, 1]) rig.parts.head.add(glowMesh(G_BOX, o.glowEyes, [sd * 0.1, 0.13, 0.3], [0, 0, 0], [0.06, 0.05, 0.02]));
  return rig;
});
registerCharacterTemplate('slug', (o) => {
  const rig = buildQuad({
    len: 1.0, bodyH: 0.3, bodyW: 0.42, legLen: 0.02, legW: 0.05, headS: 0.26, snout: 0.05, neck: 0, horns: 0.25, ...o,
    colors: { body: '#7a7468', belly: '#5a564e', horn: '#7a7468', ...(o.colors || {}) }, spikes: o.spikes || '#6a665e',
  });
  for (const l of rig.parts.legs) l.pivot.visible = false;
  return rig;
});
registerCharacterTemplate('hound', (o) => {
  const rig = buildQuad({
    len: 1.2, bodyH: 0.5, bodyW: 0.42, legLen: 0.55, legW: 0.15, headS: 0.34, snout: 0.25, ears: 0.18, horns: 0.25, tail: 0.7, ...o,
    colors: { body: '#2a2230', belly: '#3a3040', horn: '#1a1a1a', ...(o.colors || {}) }, spikes: o.spikes || '#5a2a8a',
  });
  if (o.glowEyes) for (const sd of [-1, 1]) rig.parts.head.add(glowMesh(G_BOX, o.glowEyes, [sd * 0.11, 0.13, 0.33], [0, 0, 0], [0.06, 0.05, 0.02]));
  return rig;
});
registerCharacterTemplate('glow_dragon', (o) => { // dragon template + glowing eyes / breath glow
  const body = (o.colors && o.colors.body) || '#3a7a2a';
  const rig = buildQuad({
    len: 2.2, bodyH: 0.9, bodyW: 0.9, legLen: 0.7, legW: 0.25, headS: 0.55, snout: 0.45, neck: 0.8, horns: 0.4, tail: 1.8, tailW: 0.15, ...o,
    colors: { body, belly: '#c8b86a', horn: '#e8e0c8', eyes: '#ffd020', ...(o.colors || {}) },
    wings: o.wings || shade(body, 0.7), spikes: o.spikes || '#2a2a2a',
  });
  const eye = o.glowEyes || '#ffd020';
  for (const sd of [-1, 1]) rig.parts.head.add(glowMesh(G_BOX, eye, [sd * 0.18, 0.15, 0.53], [0, 0, 0], [0.07, 0.06, 0.03]));
  if (o.breath) rig.parts.head.add(glowMesh(G_SPH, o.breath, [0, 0, 0.78], [0, 0, 0], 0.09, 0.5));
  return rig;
});

// --- arthropods (use the engine 'spider' rig kind so the spider animator drives them) --------------------
function arthropod(o, build) {
  const C = { body: '#8a3a2a', legs: null, eyes: '#111', ...(o.colors || {}) };
  const root = new THREE.Group();
  const scaleG = new THREE.Group(); scaleG.scale.setScalar(o.scale || 1); root.add(scaleG);
  const body = new THREE.Group(); body.position.set(0, 0.3, 0); scaleG.add(body);
  const b = new GeoBuilder();
  build(b, C);
  body.add(meshOf(b));
  const legs = [];
  const n = o.legPairs || 4;
  for (let i = 0; i < n * 2; i++) {
    const sd = i < n ? -1 : 1, k = i % n;
    const lp = new THREE.Group(); lp.position.set(sd * 0.14, 0, 0.12 - k * 0.12); body.add(lp);
    lp.rotation.y = sd * (0.3 - k * 0.3) * -1 + (sd < 0 ? Math.PI : 0);
    const lb = new GeoBuilder();
    lb.box(C.legs || shade(C.body, 0.85), 0.36, 0.045, 0.045, [0.18, 0.06, 0], [0, 0, 0.45]);
    lb.box(C.legs || shade(C.body, 0.85), 0.045, 0.38, 0.045, [0.36, -0.1, 0], [0, 0, 0.3]);
    lp.add(meshOf(lb));
    legs.push({ pivot: lp, phase: (i % 2) * Math.PI + k * 0.6, side: sd });
  }
  const s = o.scale || 1;
  return { kind: 'spider', root, height: 0.6 * s, width: 1.0 * s, parts: { scaleG, body, legs } };
}
registerCharacterTemplate('crab', (o) => arthropod({ legPairs: 3, ...o }, (b, C) => {
  b.sphere(C.body, 0.26, [0, 0.02, 0], [1.35, 0.5, 1]);
  b.sphere(shade(C.body, 1.15), 0.2, [0, 0.07, 0.02], [1.2, 0.4, 0.9]);
  for (const sd of [-1, 1]) {
    b.box(C.body, 0.06, 0.06, 0.25, [sd * 0.2, 0.0, 0.3], [0, sd * -0.4, 0]);
    b.box(shade(C.body, 1.1), 0.14, 0.1, 0.16, [sd * 0.27, 0.02, 0.45], [0, sd * -0.3, 0]);
    b.box(shade(C.body, 0.9), 0.05, 0.05, 0.12, [sd * 0.24, 0.05, 0.57], [0, sd * 0.3, 0]);
    b.cyl(C.body, 0.015, 0.015, 0.12, 4, [sd * 0.07, 0.14, 0.2]);
    b.sphere(C.eyes, 0.03, [sd * 0.07, 0.21, 0.2]);
  }
}));
registerCharacterTemplate('scorpion', (o) => arthropod({ legPairs: 4, ...o }, (b, C) => {
  b.sphere(C.body, 0.2, [0, 0, 0.12], [1, 0.55, 1.1]);
  b.sphere(shade(C.body, 0.92), 0.22, [0, 0.02, -0.2], [1, 0.55, 1.3]);
  for (const sd of [-1, 1]) {
    b.box(C.body, 0.05, 0.05, 0.25, [sd * 0.13, 0, 0.35], [0, sd * -0.5, 0]);
    b.box(shade(C.body, 1.1), 0.1, 0.08, 0.16, [sd * 0.22, 0.01, 0.5], [0, sd * -0.2, 0]);
    b.box(C.eyes, 0.025, 0.025, 0.02, [sd * 0.04, 0.09, 0.3], [0, 0, 0], 0);
  }
  // segmented tail arcing over the back
  const seg = 6;
  for (let i = 0; i < seg; i++) {
    const a = (i / (seg - 1)) * Math.PI * 0.85;
    b.sphere(shade(C.body, 1 + i * 0.03), 0.075 - i * 0.004, [0, 0.05 + Math.sin(a) * 0.42, -0.42 - Math.sin(a * 0.5) * 0.18 + (1 - Math.cos(a)) * 0.12]);
  }
  b.cone(o.sting || '#e8d040', 0.04, 0.14, 4, [0, 0.42, -0.05], [2.4, 0, 0]);
}));
