// Day/night cycle driven by the wall clock, so every multiplayer peer sees the same time of day.
//
//   t = 0 midnight, 0.235 sunrise, 0.5 noon, 0.765 sunset. One day = DAY_MS (40 minutes).
//   Phases: night (t >= 0.84 or t < 0.19), dawn (0.19-0.29), day (0.29-0.74), dusk (0.74-0.84).
//
// sample(t) -> palette {top, horizon, fog, light, lightI, hemi, hemiI, ground, glow, night, sunDir, moonDir,
// sunVis, moonVis, starVis, sunElev}. Also builds the sky dome (gradient, sun disc + glow, moon, stars).

import * as THREE from 'three';

export const DAY_MS = 40 * 60 * 1000;
const SUNRISE = 0.235, SUNSET = 0.765;

/** Shared world time of day 0..1 (0 = midnight). */
export function worldDayT(now = Date.now()) { return (now % DAY_MS) / DAY_MS; }

export function phaseOf(t) {
  if (t >= 0.84 || t < 0.19) return 'night';
  if (t < 0.29) return 'dawn';
  if (t < 0.74) return 'day';
  return 'dusk';
}

const C = (h) => new THREE.Color(h);
// keyframes: t, sky top, horizon, fog, dir light colour, dir light intensity, hemi sky, hemi I, hemi ground, glow
const KEYS = [
  [0.00, '#0c1532', '#2a3a62', '#24304e', '#a4b8ec', 0.62, '#7890c8', 0.92, '#3a3848', 1.0],
  [0.17, '#121c40', '#354372', '#2c3858', '#a8b4e0', 0.55, '#7c8cc4', 0.92, '#3c3a4a', 1.0],
  [0.215, '#3a4c88', '#c88a7a', '#8a7c8a', '#ffb880', 0.9, '#b8a8c8', 0.98, '#4a4038', 0.75],
  [0.25, '#5a7cc0', '#f0b080', '#d2b0a0', '#ffc890', 1.5, '#d8c8d0', 1.05, '#5a4a32', 0.4],
  [0.31, '#5a8fd0', '#c9dcea', '#bcd2e2', '#ffeed6', 1.9, '#cfe2ff', 1.12, '#5a4a32', 0.12],
  [0.50, '#5a8fd0', '#c9dcea', '#bcd2e2', '#fff2dc', 2.0, '#cfe2ff', 1.15, '#5a4a32', 0.1],
  [0.69, '#5888cc', '#d2dce6', '#c4d2de', '#ffe8c8', 1.9, '#d4e0f8', 1.12, '#5a4a32', 0.12],
  [0.75, '#5068a8', '#ffa070', '#dca490', '#ffa060', 1.4, '#e0c0b8', 1.02, '#5a4232', 0.45],
  [0.785, '#3a3c78', '#c06a6a', '#7a5a70', '#ff8860', 0.85, '#b0a0c0', 0.96, '#4a3a38', 0.8],
  [0.83, '#182048', '#4a4a78', '#34385a', '#a8b0dc', 0.55, '#8088c0', 0.92, '#3c3a48', 1.0],
  [1.00, '#0c1532', '#2a3a62', '#24304e', '#a4b8ec', 0.62, '#7890c8', 0.92, '#3a3848', 1.0],
].map(([t, top, hor, fog, lc, li, hc, hi, gc, glow]) => ({ t, top: C(top), horizon: C(hor), fog: C(fog), light: C(lc), lightI: li, hemi: C(hc), hemiI: hi, ground: C(gc), glow }));

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Direction (unit vector, towards the body) for an arc parameter a (0 = rising in the east, PI = setting in the west). */
function arcDir(a, out) {
  return out.set(Math.cos(a) * 0.9 - Math.sin(a) * 0.4, Math.sin(a) * 0.85, 0.35 + Math.sin(a) * 0.15).normalize();
}

export class DayNight {
  constructor() {
    this.override = null; // debug: fixed t
    this.p = {
      top: new THREE.Color(), horizon: new THREE.Color(), fog: new THREE.Color(), light: new THREE.Color(), hemi: new THREE.Color(),
      ground: new THREE.Color(), lightI: 1, hemiI: 1, glow: 0, night: 0,
      sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), lightDir: new THREE.Vector3(), sunVis: 1, moonVis: 0, starVis: 0, sunElev: 1,
    };
    this.uniforms = {
      top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, sunVis: { value: 1 },
      moonDir: { value: new THREE.Vector3(0, -1, 0) }, moonVis: { value: 0 }, starVis: { value: 0 }, time: { value: 0 },
    };
  }

  t(alwaysDay) {
    if (this.override != null) return this.override;
    if (alwaysDay) return 0.45;
    return worldDayT();
  }

  /** Interpolate the palette for time t. */
  sample(t) {
    const p = this.p;
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1].t <= t) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const f = smooth(0, 1, (t - a.t) / (b.t - a.t));
    for (const k of ['top', 'horizon', 'fog', 'light', 'hemi', 'ground']) p[k].copy(a[k]).lerp(b[k], f);
    p.lightI = a.lightI + (b.lightI - a.lightI) * f;
    p.hemiI = a.hemiI + (b.hemiI - a.hemiI) * f;
    p.glow = a.glow + (b.glow - a.glow) * f;
    // sun & moon
    const dayLen = SUNSET - SUNRISE;
    const sa = ((t - SUNRISE) / dayLen) * Math.PI;                       // in (0, PI) while the sun is up
    const ma = ((((t - SUNSET) % 1) + 1) % 1) / (1 - dayLen) * Math.PI;   // in (0, PI) while the moon is up
    arcDir(sa, p.sunDir);
    arcDir(ma, p.moonDir);
    p.sunElev = Math.sin(sa);
    const up = p.sunElev > 0;
    p.sunVis = smooth(-0.08, 0.06, p.sunElev);
    p.moonVis = smooth(-0.05, 0.12, Math.sin(ma));
    p.starVis = smooth(0.05, -0.2, p.sunElev);
    p.night = smooth(0.12, -0.1, p.sunElev);
    // the shadow-casting light follows whichever body is up; it fades to 0 at the horizon crossing
    const elev = up ? p.sunElev : Math.sin(ma);
    p.lightDir.copy(up ? p.sunDir : p.moonDir);
    if (p.lightDir.y < 0.42) { p.lightDir.y = 0.42; p.lightDir.normalize(); } // no grazing shadows
    p.lightI *= smooth(0.0, 0.14, elev);
    return p;
  }

  /** Sky dome mesh. */
  buildSky() {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `
        uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunVis;
        uniform vec3 moonDir; uniform float moonVis; uniform float starVis; uniform float time;
        varying vec3 vP;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vP);
          float h = clamp(d.y * 1.6 + 0.05, 0.0, 1.0);
          vec3 col = mix(horizon, top, pow(h, 0.7));
          float sd = max(dot(d, sunDir), 0.0);
          col += sunCol * (pow(sd, 6.0) * 0.3 + pow(sd, 48.0) * 0.5) * sunVis;
          col = mix(col, sunCol * 1.6 + 0.2, smoothstep(0.9988, 0.9993, sd) * sunVis);
          if (starVis > 0.0 && d.y > -0.05) {
            vec3 c = floor(d * 160.0);
            float r = hash(c);
            float s = step(0.9965, r) * (0.55 + 0.45 * sin(time * (1.0 + r * 3.0) + r * 90.0));
            col += vec3(0.9, 0.95, 1.0) * s * starVis * smoothstep(-0.05, 0.25, d.y);
          }
          float md = dot(d, moonDir);
          col += vec3(0.45, 0.55, 0.8) * pow(max(md, 0.0), 90.0) * 0.35 * moonVis;
          col = mix(col, vec3(0.92, 0.94, 1.0), smoothstep(0.9989, 0.9993, md) * moonVis);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), mat);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    return sky;
  }
}
