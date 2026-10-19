// Chunked, vertex-coloured, flat-shaded terrain + animated liquid surfaces.
//
// Water: vertex waves (calmer near the shore), depth-tinted colour (shallow turquoise -> deep blue),
// a fresnel-ish sky reflection, animated shoreline foam and twinkling sun glints. Lava: moving dark
// crust over bright veins. Per-vertex `aShore` (corner touches land) and `aDepth` drive the shaders.

import * as THREE from 'three';
import { TERRAIN_TYPES } from '../world/terrain.js';
import { tileRand } from '../core/rng.js';
import { GLOBAL, patchTerrain } from './materials.js';

export const CHUNK = 32;

/** Uniforms the renderer tweaks with time of day / weather. */
export const WATER = {
  uShallow: { value: new THREE.Color('#3aa5b5') },
  uDeep: { value: new THREE.Color('#225a92') },
  uSky: { value: new THREE.Color('#c9dcea') },
  uFoam: { value: new THREE.Color('#eef7ff') },
  uSpark: { value: 1 },
};

const WAVE = `
  float wv = sin(position.x * 1.7 + uTime * WSPD1) * 0.05 + cos(position.z * 1.3 + uTime * WSPD2) * 0.05
           + sin((position.x + position.z) * 0.6 + uTime * 0.7) * 0.03;
  transformed.y += wv * (1.0 - aShore * 0.55);
  vShore = aShore; vDepth = aDepth; vWPos = position;`;

function liquidMaterial(kind) {
  const isLava = kind === 'lava';
  const mat = isLava
    ? new THREE.MeshLambertMaterial({ color: 0xff5a14, emissive: 0xc83a08, flatShading: true })
    : new THREE.MeshPhongMaterial({ color: 0x2f6c9e, specular: 0xb8d8f0, shininess: 80, transparent: true, opacity: 0.86, flatShading: true });
  mat.userData.uTime = GLOBAL.uTime;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = GLOBAL.uTime;
    Object.assign(shader.uniforms, WATER);
    shader.vertexShader = 'uniform float uTime;\nattribute float aShore;\nattribute float aDepth;\nvarying float vShore;\nvarying float vDepth;\nvarying vec3 vWPos;\n'
      + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WAVE.replace('WSPD1', isLava ? '0.6' : '1.6').replace('WSPD2', isLava ? '0.5' : '1.25'));
    const decl = 'uniform float uTime;\nuniform vec3 uShallow;\nuniform vec3 uDeep;\nuniform vec3 uSky;\nuniform vec3 uFoam;\nuniform float uSpark;\nvarying float vShore;\nvarying float vDepth;\nvarying vec3 vWPos;\n';
    const body = isLava ? `
      {
        float n = sin(vWPos.x * 1.3 + uTime * 0.35 + sin(vWPos.z * 0.9 + uTime * 0.2) * 1.4) * sin(vWPos.z * 1.1 - uTime * 0.27)
                + sin((vWPos.x - vWPos.z) * 2.1 + uTime * 0.6) * 0.45;
        float crust = clamp(smoothstep(0.25, 0.95, n) * 0.85 + vShore * 0.45, 0.0, 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.025, 0.015), crust);
        totalEmissiveRadiance *= 1.0 - crust * 0.92;
        totalEmissiveRadiance += vec3(1.0, 0.55, 0.12) * pow(max(0.0, 1.0 - abs(n - 0.1) * 2.2), 3.0) * 0.7;
      }` : `
      {
        float vd = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        float fres = pow(1.0 - vd, 2.5);
        vec3 wc = mix(uShallow, uDeep, smoothstep(0.15, 1.1, vDepth));
        float n1 = sin(vWPos.x * 2.3 + uTime * 0.9 + sin(vWPos.z * 1.7 + uTime * 0.6) * 1.5);
        float shore = vShore + n1 * 0.12;
        float band = fract(vShore * 1.6 - uTime * 0.22);
        float foam = smoothstep(0.8, 0.98, shore) * 0.7 + vShore * vShore * smoothstep(0.0, 0.05, band) * smoothstep(0.2, 0.08, band) * 0.55;
        foam = clamp(foam, 0.0, 0.85);
        diffuseColor.rgb = mix(wc, uFoam, foam);
        diffuseColor.a = mix(diffuseColor.a, 0.96, foam);
        totalEmissiveRadiance += uSky * (fres * 0.35 + 0.04) * (1.0 - foam);
        vec2 cell = floor(vWPos.xz * 5.0);
        float hsh = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
        float tw = sin(uTime * (1.5 + hsh * 3.0) + hsh * 60.0);
        totalEmissiveRadiance += vec3(step(0.94, hsh) * smoothstep(0.8, 1.0, tw) * uSpark * (1.0 - foam) * 0.9);
      }`;
    shader.fragmentShader = decl + shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + body);
  };
  mat.customProgramCacheKey = () => 'liquid-' + kind;
  return mat;
}

export class TerrainMesh {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    scene.add(this.group);
    this.material = patchTerrain(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
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

  /** 1 if any of the four tiles sharing vertex (vx, vy) is not the same liquid. */
  shoreAt(vx, vy, liquid) {
    const w = this.world;
    for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
      const x = vx + dx, y = vy + dy;
      if (!w.inBounds(x, y)) continue;
      if (TERRAIN_TYPES[w.terrain[w.idx(x, y)]].liquid !== liquid) return 1;
    }
    return 0;
  }

  buildChunk(cx, cy) {
    const w = this.world;
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const x1 = Math.min(w.width, x0 + CHUNK), y1 = Math.min(w.height, y0 + CHUNK);
    const VW = w.width + 1;
    const pos = [], col = [];
    const liquids = { water: { p: [], s: [], d: [] }, lava: { p: [], s: [], d: [] } };
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
          const L = liquids[t.liquid];
          L.p.push(x, lh, y, x + 1, lh, y + 1, x + 1, lh, y, x, lh, y, x, lh, y + 1, x + 1, lh, y + 1);
          for (const [vx, vy] of [[x, y], [x + 1, y + 1], [x + 1, y], [x, y], [x, y + 1], [x + 1, y + 1]]) {
            L.s.push(this.shoreAt(vx, vy, t.liquid));
            L.d.push(Math.max(0, lh - H(vx, vy)));
          }
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
      const L = liquids[kind];
      if (!L.p.length) continue;
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(L.p, 3));
      lg.setAttribute('aShore', new THREE.Float32BufferAttribute(L.s, 1));
      lg.setAttribute('aDepth', new THREE.Float32BufferAttribute(L.d, 1));
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
    this.liquidMats.lava.emissive.setRGB(0.75 + Math.sin(time * 2) * 0.1, 0.22, 0.03);
  }

  /** Terrain meshes for raycasting. */
  pickables() { return this.chunks.map((c) => c.mesh); }
}
