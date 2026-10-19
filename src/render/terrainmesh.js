// Chunked, vertex-coloured, flat-shaded terrain + animated liquid surfaces.

import * as THREE from 'three';
import { TERRAIN_TYPES } from '../world/terrain.js';
import { tileRand } from '../core/rng.js';

export const CHUNK = 32;

function liquidMaterial(kind) {
  const isLava = kind === 'lava';
  const mat = isLava
    ? new THREE.MeshLambertMaterial({ color: 0xff5a14, emissive: 0xc83a08, flatShading: true })
    : new THREE.MeshPhongMaterial({ color: 0x2f6c9e, specular: 0x9fc4e0, shininess: 70, transparent: true, opacity: 0.84, flatShading: true });
  mat.userData.uTime = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = mat.userData.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float wv = sin(position.x * 1.7 + uTime * ${isLava ? '0.6' : '1.6'}) * 0.05 + cos(position.z * 1.3 + uTime * ${isLava ? '0.5' : '1.25'}) * 0.05
                + sin((position.x + position.z) * 0.6 + uTime * 0.7) * 0.03;
       transformed.y += wv;`,
    );
  };
  return mat;
}

export class TerrainMesh {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    scene.add(this.group);
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.liquidMats = { water: liquidMaterial('water'), lava: liquidMaterial('lava') };
    this.chunks = [];
    this.tileColors = this.computeTileColors();
    for (let cy = 0; cy < Math.ceil(world.height / CHUNK); cy++) {
      for (let cx = 0; cx < Math.ceil(world.width / CHUNK); cx++) this.buildChunk(cx, cy);
    }
  }

  computeTileColors() {
    const w = this.world;
    const cols = new Float32Array(w.width * w.height * 3);
    const c = new THREE.Color();
    for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++) {
      const i = w.idx(x, y);
      const t = TERRAIN_TYPES[w.terrain[i]];
      c.set(t.color);
      let f = 1 + (tileRand(x, y, 11) - 0.5) * 2 * t.var;
      if (t.id === 'flowers' && tileRand(x, y, 5) > 0.7) c.set(['#e8d040', '#d04a6a', '#f2f2f2'][Math.floor(tileRand(x, y, 6) * 3)]);
      const h = w.tileHeight[i];
      if (t.natural) f *= 1 + Math.max(-0.15, Math.min(0.12, h * 0.025));
      cols[i * 3] = c.r * f; cols[i * 3 + 1] = c.g * f; cols[i * 3 + 2] = c.b * f;
    }
    return cols;
  }

  /** Colour at a vertex for a given tile: natural tiles blend with natural neighbours. */
  vertexColor(tx, ty, vx, vy, out) {
    const w = this.world, tc = this.tileColors;
    const ti = w.idx(tx, ty);
    const t = TERRAIN_TYPES[w.terrain[ti]];
    out[0] = tc[ti * 3]; out[1] = tc[ti * 3 + 1]; out[2] = tc[ti * 3 + 2];
    if (!t.natural) return out;
    let r = 0, g = 0, b = 0, n = 0;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
      const x = vx + dx, y = vy + dy;
      if (!w.inBounds(x, y)) continue;
      const j = w.idx(x, y);
      if (!TERRAIN_TYPES[w.terrain[j]].natural) continue;
      r += tc[j * 3]; g += tc[j * 3 + 1]; b += tc[j * 3 + 2]; n++;
    }
    if (n) { out[0] = out[0] * 0.45 + (r / n) * 0.55; out[1] = out[1] * 0.45 + (g / n) * 0.55; out[2] = out[2] * 0.45 + (b / n) * 0.55; }
    return out;
  }

  buildChunk(cx, cy) {
    const w = this.world;
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const x1 = Math.min(w.width, x0 + CHUNK), y1 = Math.min(w.height, y0 + CHUNK);
    const VW = w.width + 1;
    const pos = [], col = [];
    const liquids = { water: [], lava: [] };
    const tmp = [0, 0, 0];
    const H = (vx, vy) => w.heights[vy * VW + vx];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = TERRAIN_TYPES[w.terrain[w.idx(x, y)]];
        // corners: a(x,y) b(x+1,y) c(x,y+1) d(x+1,y+1); triangles (a,d,b) and (a,c,d)
        const A = [x, H(x, y), y], B = [x + 1, H(x + 1, y), y], C = [x, H(x, y + 1), y + 1], D = [x + 1, H(x + 1, y + 1), y + 1];
        const vc = (vx, vy) => [...this.vertexColor(x, y, vx, vy, tmp)];
        const ca = vc(x, y), cb = vc(x + 1, y), cc = vc(x, y + 1), cd = vc(x + 1, y + 1);
        pos.push(...A, ...D, ...B, ...A, ...C, ...D);
        col.push(...ca, ...cd, ...cb, ...ca, ...cc, ...cd);
        if (t.liquid) {
          const lh = w.liquidHeight[w.idx(x, y)];
          liquids[t.liquid].push(x, lh, y, x + 1, lh, y + 1, x + 1, lh, y, x, lh, y, x, lh, y + 1, x + 1, lh, y + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.receiveShadow = true;
    mesh.userData.terrain = true;
    this.group.add(mesh);
    const chunk = { cx, cy, mesh, liquids: [] };
    for (const kind of ['water', 'lava']) {
      if (!liquids[kind].length) continue;
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(liquids[kind], 3));
      lg.computeVertexNormals();
      lg.computeBoundingSphere();
      const lm = new THREE.Mesh(lg, this.liquidMats[kind]);
      lm.receiveShadow = kind === 'water';
      lm.renderOrder = 1;
      this.group.add(lm);
      chunk.liquids.push(lm);
    }
    this.chunks.push(chunk);
  }

  update(time) {
    this.liquidMats.water.userData.uTime.value = time;
    this.liquidMats.lava.userData.uTime.value = time;
    this.liquidMats.lava.emissive.setRGB(0.75 + Math.sin(time * 2) * 0.1, 0.22, 0.03);
  }

  /** Terrain meshes for raycasting. */
  pickables() { return this.chunks.map((c) => c.mesh); }
}
