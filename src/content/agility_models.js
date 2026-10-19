// Scenery templates for agility obstacles. OWNER: agent F (imported by content/agility.js).
// Every template builds along the footprint's long axis (x when w >= h, z otherwise).

import { registerSceneryTemplate } from '../render/models.js';

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};

/** Axis helper: build in "long axis = x" space, map to z when the footprint is vertical. */
function axis(b, p) {
  const vert = p.h > p.w;
  const len = Math.max(p.w, p.h), wid = Math.min(p.w, p.h);
  const pos = (x, y, z) => (vert ? [z, y, x] : [x, y, z]);
  return {
    vert, len, wid,
    box: (c, sx, sy, sz, x, y, z, rotY = 0, j) => b.box(c, vert ? sz : sx, sy, vert ? sx : sz, pos(x, y, z), [0, rotY, 0], j),
    /** cylinder lying along the long axis */
    log: (c, r, l, x, y, z, seg = 7) => b.cyl(c, r, r, l, seg, pos(x, y, z), vert ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]),
    /** cylinder lying across the long axis */
    cross: (c, r, l, x, y, z, seg = 6) => b.cyl(c, r, r, l, seg, pos(x, y, z), vert ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]),
    post: (c, r, h, x, z, y0 = 0) => b.cyl(c, r, r * 1.1, h, 6, pos(x, y0 + h / 2, z)),
    /** sloped rope segment from (x0,y0) to (x1,y1) along the axis */
    rope: (c, r, x0, y0, x1, y1, z = 0) => {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const rot = vert ? [Math.PI / 2 - a, 0, 0] : [0, 0, a - Math.PI / 2];
      b.cyl(c, r, r, l, 4, pos((x0 + x1) / 2, (y0 + y1) / 2, z), rot);
    },
    sphere: (c, r, x, y, z, s) => b.sphere(c, r, pos(x, y, z), s),
    dodeca: (c, r, x, y, z, s) => b.dodeca(c, r, pos(x, y, z), s),
  };
}

// Log on trestles.
registerSceneryTemplate('agi_log', (b, p) => {
  const A = axis(b, p);
  const c = p.color || '#6b4a2b';
  A.log(c, 0.22, A.len, 0, 0.45, 0, 8);
  for (const x of [-A.len / 2 + 0.3, A.len / 2 - 0.3]) {
    A.box('#5a3d24', 0.12, 0.45, 0.6, x, 0.2, 0);
  }
  if (p.mud) A.box('#4a3a22', A.len, 0.04, 0.9, 0, 0.02, 0, 0, 0.05);
});

// Climbing net in a timber frame (frame runs along the long axis).
registerSceneryTemplate('agi_net', (b, p) => {
  const A = axis(b, p);
  const H = p.height || 2.2;
  for (const x of [-A.len / 2 + 0.05, A.len / 2 - 0.05]) A.box('#5a3d24', 0.14, H, 0.14, x, H / 2, 0);
  A.box('#5a3d24', A.len, 0.12, 0.14, 0, H, 0);
  for (let i = 0; i <= A.len * 4; i++) A.box('#c8b48a', 0.03, H - 0.1, 0.03, -A.len / 2 + i / 4, H / 2, 0.02, 0, 0.02);
  for (let k = 1; k < H * 4; k++) A.box('#c8b48a', A.len, 0.03, 0.03, 0, k / 4, 0.02, 0, 0.02);
});

// Balancing beam on posts.
registerSceneryTemplate('agi_beam', (b, p) => {
  const A = axis(b, p);
  const y = p.y ?? 0.6;
  A.box(p.color || '#8a6a40', A.len + 0.2, 0.12, 0.22, 0, y, 0);
  for (let x = -A.len / 2 + 0.3; x <= A.len / 2; x += 2) A.post('#5a3d24', 0.07, y, x, 0);
});

// Low timber wall to vault.
registerSceneryTemplate('agi_wall', (b, p) => {
  const A = axis(b, p);
  const c = p.color || '#7a5634';
  const H = p.height || 1.0;
  A.box(c, A.len, H, 0.35, 0, H / 2, 0, 0, 0.12);
  A.box(shade(c, 0.8), A.len + 0.04, 0.1, 0.4, 0, H, 0);
});

// Handholds on an existing wall (used for wall-climb shortcuts).
registerSceneryTemplate('agi_handholds', (b) => {
  for (let i = 0; i < 6; i++) b.box('#6e6458', 0.18, 0.1, 0.12, [((i * 37) % 5) / 10 - 0.2, 0.3 + i * 0.32, 0.52], [0, 0, 0], 0.1);
  b.box('#7a6e60', 0.9, 0.25, 0.3, [0.1, 0.12, 0.62], [0, 0.3, 0.2], 0.2);
});

// Pit with a rope swinging from an A-frame overhead.
registerSceneryTemplate('agi_swing', (b, p) => {
  const A = axis(b, p);
  const pit = p.pit || '#3e2f1e';
  A.box(pit, A.len, 0.04, Math.max(1, A.wid) * 0.98, 0, 0.02, 0, 0, 0.1);
  for (let i = 0; i < A.len * 2; i++) A.dodeca(p.glow || '#2a2014', 0.18, -A.len / 2 + 0.25 + i * 0.5, 0.04, ((i * 7) % 5) / 10 - 0.2, [1, 0.4, 1]);
  const H = 3.2;
  for (const z of [-0.6, 0.6]) {
    A.box('#5a3d24', 0.12, H, 0.12, -0.4, H / 2, z);
    A.box('#5a3d24', 0.12, H, 0.12, 0.4, H / 2, z);
  }
  A.box('#5a3d24', 1.0, 0.12, 1.4, 0, H, 0);
  A.rope('#c8a86a', 0.03, 0, H, -0.3, 0.9, 0);
});

// Drain pipe / tunnel to squeeze through.
registerSceneryTemplate('agi_pipe', (b, p) => {
  const A = axis(b, p);
  const c = p.color || '#5e636a';
  A.log(c, 0.45, A.len, 0, 0.45, 0, 10);
  A.log(shade(c, 0.3), 0.36, A.len + 0.04, 0, 0.45, 0, 10);
  for (const x of [-A.len / 2, A.len / 2]) A.log(shade(c, 1.2), 0.5, 0.15, x, 0.45, 0, 10);
});

// Raised platform: roof (flat-roofed house), tree (trunk + deck) or rock (sea stack / crag).
registerSceneryTemplate('agi_platform', (b, p) => {
  const top = p.top ?? 3;
  const w = p.w, d = p.h;
  if (p.variant === 'tree') {
    b.cyl('#5a3d22', 0.35, 0.5, top + 1.6, 8, [0, (top + 1.6) / 2, 0]);
    b.box('#8a6a40', w - 0.1, 0.16, d - 0.1, [0, top - 0.08, 0], [0, 0, 0], 0.08);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('#5a3d24', 0.1, top, 0.1, [x * (w / 2 - 0.2), top / 2, z * (d / 2 - 0.2)]);
    for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (x) b.box('#6a4a2a', 0.06, 0.06, d - 0.2, [x * (w / 2 - 0.08), top + 0.5, 0]);
      else b.box('#6a4a2a', w - 0.2, 0.06, 0.06, [0, top + 0.5, z * (d / 2 - 0.08)]);
    }
    b.cyl('#5a3d22', 0.12, 0.2, 1.4, 6, [-w / 2 + 0.1, top + 2.2, -d / 2 + 0.1], [0.5, 0, -0.5]);
    b.dodeca('#3f6e2c', 0.9, [-w / 2 - 0.3, top + 3.1, -d / 2 - 0.3], [1.3, 0.6, 1.2]);
    b.dodeca('#4a7a32', 0.7, [w / 2 + 0.2, top + 2.9, -d / 2 - 0.4], [1.1, 0.5, 1]);
    return;
  }
  if (p.variant === 'rock') {
    const c = p.color || '#6e675e';
    b.dodeca(c, 0.8, [0, top / 2 - 0.2, 0], [w * 0.75, top * 0.75, d * 0.75]);
    b.box(shade(c, 1.1), w - 0.15, 0.25, d - 0.15, [0, top - 0.12, 0], [0, 0.1, 0], 0.15);
    b.dodeca('#3a5a3a', 0.25, [0.4, top + 0.02, 0.3], [1.2, 0.3, 1]);
    return;
  }
  // roof
  const wall = p.wall || '#d8ccb0';
  b.box(wall, w - 0.1, top - 0.2, d - 0.1, [0, (top - 0.2) / 2, 0], [0, 0, 0], 0.06);
  b.box('#5a3d24', w, 0.12, d, [0, 0.3, 0]);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) b.box('#5a3d24', 0.12, top - 0.2, 0.12, [x, (top - 0.2) / 2, d / 2 - 0.05]);
  b.box(p.roof || '#7a5a4a', w + 0.2, 0.22, d + 0.2, [0, top - 0.1, 0], [0, 0, 0], 0.05);
  b.box('#3a2a1e', 0.6, 1.0, 0.04, [0, 0.5, d / 2], [0, 0, 0], 0);
  for (const x of [-w / 4, w / 4]) b.box('#9ac0d8', 0.4, 0.4, 0.04, [x, top * 0.6, d / 2], [0, 0, 0], 0);
  b.box('#6a5a50', 0.4, 0.6, 0.4, [w / 2 - 0.5, top + 0.3, -d / 2 + 0.5]); // chimney
});

// Rope bridge / tightrope / clothesline at height p.y between two platforms.
registerSceneryTemplate('agi_rope', (b, p) => {
  const A = axis(b, p);
  const y = p.y ?? 3;
  const L = A.len + 1;
  if (p.variant === 'bridge') {
    for (let i = 0; i < A.len * 3; i++) A.box('#8a6a40', 0.26, 0.06, 0.7, -A.len / 2 + 0.17 + i / 3, y - 0.2 - Math.sin((i / (A.len * 3)) * Math.PI) * 0.2, 0, 0, 0.1);
    for (const z of [-0.38, 0.38]) A.log('#c8a86a', 0.025, L, 0, y + 0.55, z, 4);
  } else if (p.variant === 'line') {
    A.log('#e0d8c8', 0.02, L, 0, y + 1.2, 0, 4);
    for (let i = 0; i < A.len; i++) A.box(['#c84a3a', '#3a6ac8', '#e8e0a0'][i % 3], 0.4, 0.5, 0.03, -A.len / 2 + 0.5 + i, y + 0.9, 0, 0, 0.02);
  } else {
    A.log('#c8a86a', 0.035, L, 0, y - 0.1, 0, 4);
  }
});

// A gap between rooftops / rocks: a narrow ledge lip so there is something to click.
registerSceneryTemplate('agi_gap', (b, p) => {
  const A = axis(b, p);
  const y = p.y ?? 3;
  A.box(p.color || '#6a5a4a', 0.3, 0.12, 0.8, -A.len / 2 - 0.05, y - 0.08, 0);
  A.box(p.color || '#6a5a4a', 0.3, 0.12, 0.8, A.len / 2 + 0.05, y - 0.08, 0);
  A.box(p.mark || '#cfc6ae', A.len * 0.5, 0.03, 0.12, 0, y - 0.05, 0, 0, 0); // thin guide line (click target)
});

// Hanging vine / rope to swing on, from a branch at height p.y.
registerSceneryTemplate('agi_vine', (b, p) => {
  const y = p.y ?? 4;
  b.box('#5a3d22', 0.2, 0.2, 1.6, [0, y + 1.2, 0], [0, 0, 0]);
  b.cyl('#4a6a2a', 0.04, 0.04, 2.2, 4, [0, y + 0.1, 0]);
  b.dodeca('#3f6e2c', 0.6, [0, y + 1.5, 0], [1.4, 0.6, 1.2]);
});

// Zipline / vine slide descending from p.y (high end at the +axis side unless p.reverse) to the ground.
registerSceneryTemplate('agi_zipline', (b, p) => {
  const A = axis(b, p);
  const y = p.y ?? 3;
  const hi = p.reverse ? -A.len / 2 - 0.5 : A.len / 2 + 0.5, lo = -hi;
  A.rope('#c8a86a', 0.03, lo, 0.6, hi, y + 1.3);
  A.post('#5a3d24', 0.08, 1.2, lo, 0);
});

// Stepping stones (one per tile along the axis), optionally over embers.
registerSceneryTemplate('agi_stones', (b, p) => {
  const A = axis(b, p);
  if (p.embers) A.box('#3a1a10', A.len, 0.04, 0.95, 0, 0.02, 0, 0, 0.2);
  if (p.embers) for (let i = 0; i < A.len * 2; i++) A.sphere('#ff6020', 0.07, -A.len / 2 + 0.25 + i * 0.5, 0.06, ((i * 3) % 5) / 8 - 0.25, [1, 0.4, 1]);
  for (let i = 0; i < A.len; i++) A.dodeca(p.color || '#7a746a', 0.32, -A.len / 2 + 0.5 + i, 0.08, ((i * 13) % 3) / 10 - 0.1, [1.1, 0.45, 1]);
});
