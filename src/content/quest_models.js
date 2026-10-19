// Scenery templates for quest objects. OWNER: agent F (imported by content/quests.js).

import { registerSceneryTemplate } from '../render/models.js';

registerSceneryTemplate('q_scarecrow', (b, p) => {
  b.box('#6a4a2a', 0.1, 2.0, 0.1, [0, 1.0, 0]);
  b.box('#6a4a2a', 1.3, 0.08, 0.08, [0, 1.45, 0]);
  b.box(p.coat || '#5a6a3a', 0.6, 0.7, 0.3, [0, 1.3, 0], [0, 0, 0], 0.15);
  b.sphere('#d8c080', 0.2, [0, 1.85, 0], [1, 1.1, 1]);
  b.cone('#8a6a3a', 0.32, 0.3, 8, [0, 2.1, 0]);
  for (const x of [-0.6, 0.6]) b.box('#e0c860', 0.12, 0.2, 0.06, [x, 1.38, 0], [0, 0, x > 0 ? -0.4 : 0.4]);
});

registerSceneryTemplate('q_stump', (b, p) => {
  b.cyl(p.burnt ? '#2a2420' : '#6a4a2b', 0.35, 0.45, 0.5, 7, [0, 0.25, 0]);
  b.cyl(p.burnt ? '#1a1612' : '#c8a070', 0.34, 0.34, 0.04, 7, [0, 0.51, 0], [0, 0, 0], 0.1);
  if (p.burnt) for (let i = 0; i < 4; i++) b.dodeca('#3a3430', 0.12, [Math.cos(i * 1.7) * 0.5, 0.05, Math.sin(i * 1.7) * 0.5], [1, 0.4, 1]);
});

registerSceneryTemplate('q_brazier', (b, p) => {
  b.cyl('#3a3634', 0.08, 0.12, 0.9, 6, [0, 0.45, 0]);
  b.cyl('#4a4440', 0.4, 0.25, 0.3, 8, [0, 1.0, 0]);
  if (p.lit) {
    b.cone('#ff8a20', 0.3, 0.6, 6, [0, 1.45, 0], [0, 0, 0], 0.15);
    b.cone('#ffe060', 0.16, 0.4, 6, [0, 1.4, 0], [0, 0.5, 0], 0.1);
  } else b.dodeca('#2a2420', 0.25, [0, 1.15, 0], [1, 0.4, 1]);
});

registerSceneryTemplate('q_seal', (b, p) => {
  b.box('#4a4450', 1.0, 2.4, 0.5, [0, 1.2, 0], [0, 0, 0], 0.1);
  b.box(p.glow || '#7a40ff', 0.5, 0.5, 0.04, [0, 1.3, 0.26], [0, 0, Math.PI / 4], 0);
  b.box(p.glow || '#7a40ff', 0.08, 1.6, 0.04, [0, 1.2, 0.27], [0, 0, 0], 0);
});

registerSceneryTemplate('q_shrine', (b, p) => {
  b.box('#5a5650', 0.7, 0.3, 0.7, [0, 0.15, 0]);
  b.box(p.pure ? '#d8d4c8' : '#4a5a3a', 0.4, 1.1, 0.4, [0, 0.8, 0], [0, 0.3, 0], 0.12);
  b.dodeca(p.pure ? '#a0e8ff' : '#2a3a1a', 0.18, [0, 1.5, 0]);
  if (!p.pure) b.dodeca('#3a5a2a', 0.3, [0.25, 0.4, 0.2], [1.2, 0.5, 1]);
});

registerSceneryTemplate('q_throne', (b) => {
  b.box('#3a4a2a', 1.6, 0.5, 1.4, [0, 0.25, 0], [0, 0, 0], 0.2);
  b.box('#2a3a1a', 1.4, 2.0, 0.3, [0, 1.3, -0.55], [0.08, 0, 0], 0.15);
  for (const x of [-0.65, 0.65]) b.box('#2a3a1a', 0.2, 0.7, 1.1, [x, 0.75, 0]);
  for (let i = 0; i < 5; i++) b.cone('#5a6a3a', 0.08, 0.4, 4, [-0.5 + i * 0.25, 2.45, -0.55]);
});

registerSceneryTemplate('q_waystone', (b, p) => {
  b.box('#6e6a64', 0.9, 0.25, 0.9, [0, 0.12, 0]);
  b.box('#8a857a', 0.45, 1.8, 0.3, [0, 1.15, 0], [0, 0.2, 0], 0.08);
  b.box(p.glow || '#60e0e0', 0.2, 0.2, 0.04, [0, 1.5, 0.16], [0, 0.2, Math.PI / 4], 0);
});

registerSceneryTemplate('q_tidepool', (b) => {
  b.cyl('#3a6a7a', 0.45, 0.45, 0.03, 9, [0, 0.03, 0], [0, 0, 0], 0.1);
  for (let i = 0; i < 6; i++) b.dodeca(i % 2 ? '#6a645a' : '#5a6a5a', 0.16, [Math.cos(i) * 0.5, 0.06, Math.sin(i) * 0.5], [1.2, 0.5, 1]);
  b.sphere('#c84a3a', 0.06, [0.15, 0.06, -0.1]);
});

registerSceneryTemplate('q_belfry', (b) => {
  for (const x of [-0.55, 0.55]) b.box('#8a8478', 0.3, 2.6, 0.4, [x, 1.3, 0], [0, 0, 0], 0.15);
  b.box('#8a8478', 1.5, 0.3, 0.45, [0, 2.65, 0]);
  b.cone('#6a5a2a', 0.35, 0.6, 8, [0, 2.15, 0]);
  b.dodeca('#3a5a5a', 0.4, [0.3, 0.15, 0.3], [1.4, 0.4, 1]);
});

registerSceneryTemplate('q_desk', (b) => {
  b.box('#5a3d24', 1.0, 0.75, 0.6, [0, 0.38, 0]);
  b.box('#ece4d0', 0.3, 0.02, 0.2, [0.2, 0.77, 0]);
  b.box('#2a6a3a', 0.06, 0.08, 0.06, [-0.3, 0.8, 0.1]);
});

registerSceneryTemplate('q_clue', (b, p) => {
  for (let i = 0; i < 5; i++) b.box(p.color || '#4a3a22', 0.14, 0.02, 0.24, [-0.4 + i * 0.2, 0.02, (i % 2) * 0.2 - 0.1], [0, 0.3, 0], 0);
});
