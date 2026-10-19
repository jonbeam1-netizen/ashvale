// Shared materials + global shader uniforms (time, wind, night glow, wetness, rim light).
//
//  * GLOBAL uniforms are shared by reference between every patched material, so the renderer updates
//    them once per frame (render/renderer.js).
//  * Every GeoBuilder geometry carries a per-vertex `glow` attribute (0..1, see models.js glowOf):
//    flames, lamp glass and glowing crystals self-illuminate, a little in daylight and fully at night.
//  * Foliage materials sway in the wind (vertex shader), characters get a soft rim light so they pop
//    against the terrain, and HIT_MATERIAL is swapped in for a few frames when a character is hit.

import * as THREE from 'three';

export const GLOBAL = {
  uTime: { value: 0 },
  uWind: { value: 0.35 },           // 0 calm .. 1 gale
  uGlow: { value: 0.15 },           // self-illumination of glow vertices (night -> ~1)
  uWet: { value: 0 },               // rain darkens the ground
  uRim: { value: new THREE.Color(0.28, 0.3, 0.34) },
  uWindowGlow: { value: new THREE.Color(0, 0, 0) },
};

const GLOW_VERT_DECL = 'attribute float glow;\nvarying float vGlow;\n';
const GLOW_FRAG_DECL = 'uniform float uGlow;\nvarying float vGlow;\n';

function patchGlow(shader) {
  shader.uniforms.uGlow = GLOBAL.uGlow;
  shader.vertexShader = GLOW_VERT_DECL + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGlow = glow;');
  shader.fragmentShader = GLOW_FRAG_DECL + shader.fragmentShader.replace('#include <emissivemap_fragment>',
    '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * vGlow * uGlow;');
}

/** Wind sway: displacement grows with height above `base` (quadratic), phase from the instance position. */
function patchSway(shader, base, amount, maxH) {
  shader.uniforms.uTime = GLOBAL.uTime;
  shader.uniforms.uWind = GLOBAL.uWind;
  shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  {
  #ifdef USE_INSTANCING
    vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  #else
    vec3 ip = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
  #endif
    float hh = clamp(transformed.y - ${base.toFixed(3)}, 0.0, ${maxH.toFixed(3)});
    float k = hh * hh * ${amount.toFixed(4)} * (0.35 + uWind);
    float ph = ip.x * 0.37 + ip.z * 0.29;
    float s = sin(uTime * 1.6 + ph) * 0.6 + sin(uTime * 2.7 + ph * 1.7 + transformed.y) * 0.25 + sin(uTime * 7.0 + ph * 3.1 + transformed.x * 4.0) * 0.08 * uWind;
    transformed.x += s * k;
    transformed.z += cos(uTime * 1.25 + ph * 1.3) * k * 0.45;
  }`);
}

function patchRim(shader) {
  shader.uniforms.uRim = GLOBAL.uRim;
  shader.fragmentShader = 'uniform vec3 uRim;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float rimK = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
    totalEmissiveRadiance += uRim * pow(rimK, 2.2) * (0.45 + diffuseColor.rgb);
  }`);
}

function vcLambert(key, patches, extra = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...extra });
  m.onBeforeCompile = (shader) => { for (const p of patches) p(shader); };
  m.customProgramCacheKey = () => key;
  return m;
}

/** Static scenery / generic GeoBuilder material (glow aware). */
export const makeVCMaterial = () => vcLambert('vc-glow', [patchGlow]);

/** Tall foliage (tree canopies) and low foliage (grass, flowers, reeds, crops, bushes). */
export const FOLIAGE_TREE = vcLambert('vc-sway-tree', [patchGlow, (s) => patchSway(s, 0.7, 0.012, 5.0)]);
export const FOLIAGE_LOW = vcLambert('vc-sway-low', [patchGlow, (s) => patchSway(s, 0.0, 0.45, 0.6)]);

/** Characters: glow + rim light. HIT_MATERIAL flashes red-white when hit. */
export const CHAR_MATERIAL = vcLambert('vc-char', [patchGlow, patchRim]);
export const HIT_MATERIAL = vcLambert('vc-hit', [patchGlow, patchRim], { emissive: new THREE.Color(0.85, 0.22, 0.18) });

/** Building windows: dark glass by day, warm light at night (glow attribute = lit pane). */
export const WINDOW_MATERIAL = (() => {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWindowGlow = GLOBAL.uWindowGlow;
    shader.vertexShader = GLOW_VERT_DECL + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGlow = glow;');
    shader.fragmentShader = 'uniform vec3 uWindowGlow;\nvarying float vGlow;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += uWindowGlow * vGlow;');
  };
  m.customProgramCacheKey = () => 'vc-window';
  return m;
})();

/** Terrain: rain darkens it. */
export function patchTerrain(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = GLOBAL.uWet;
    shader.fragmentShader = 'uniform float uWet;\n' + shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n diffuseColor.rgb *= 1.0 - uWet * 0.2;');
  };
  mat.customProgramCacheKey = () => 'terrain-wet';
  return mat;
}

// ------------------------------------------------------------------------------------------------
// Soft round point sprites (particles, halos, smoke, weather)
// ------------------------------------------------------------------------------------------------
/** Pixel scale for size-attenuated points: worldSize * uPx / depth = pixels. */
export const POINT_SCALE = { value: 600 };
