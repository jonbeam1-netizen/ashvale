// Light post-processing for the "High quality" setting: the scene renders into an MSAA half-float
// target, a cheap two-level bloom picks up lamps / flames / spells (strong at night, subtle by day),
// then one composite pass applies colour grading (tint, saturation, contrast) and a vignette.
// Passes: scene (full) -> bright+downsample (1/4) -> blur H/V (1/4) -> downsample (1/8) -> blur H/V
// (1/8) -> composite (full). Without it the renderer draws straight to the screen and a CSS vignette
// stands in.

import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export class PostFX {
  constructor(renderer) {
    this.r = renderer;
    const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.main = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.a = new THREE.WebGLRenderTarget(4, 4, opts); this.b = new THREE.WebGLRenderTarget(4, 4, opts);
    this.c = new THREE.WebGLRenderTarget(4, 4, opts); this.d = new THREE.WebGLRenderTarget(4, 4, opts);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    this.bright = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, texel: { value: new THREE.Vector2() }, thr: { value: 1 } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tex; uniform vec2 texel; uniform float thr; varying vec2 vUv;
        void main(){
          vec3 c = (texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, -1.0)).rgb
                  + texture2D(tex, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 1.0)).rgb) * 0.25;
          float l = max(c.r, max(c.g, c.b));
          if (!(l < 1e4)) c = vec3(0.0); // NaN / Inf guard: one bad pixel would smear a black box through the blur
          gl_FragColor = vec4(c * smoothstep(thr, thr + 0.5, l), 1.0);
        }`,
    });
    this.copy = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, texel: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
        void main(){ gl_FragColor = (texture2D(tex, vUv + texel * vec2(-0.5)) + texture2D(tex, vUv + texel * vec2(0.5, -0.5))
          + texture2D(tex, vUv + texel * vec2(-0.5, 0.5)) + texture2D(tex, vUv + texel * vec2(0.5))) * 0.25; }`,
    });
    this.blur = new THREE.ShaderMaterial({
      uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tex, vUv).rgb * 0.227;
          c += (texture2D(tex, vUv + dir * 1.385).rgb + texture2D(tex, vUv - dir * 1.385).rgb) * 0.316;
          c += (texture2D(tex, vUv + dir * 3.231).rgb + texture2D(tex, vUv - dir * 3.231).rgb) * 0.070;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.composite = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null }, bloomA: { value: null }, bloomB: { value: null }, strength: { value: 0.4 },
        tint: { value: new THREE.Color(1, 1, 1) }, sat: { value: 1.08 }, contrast: { value: 1.05 }, vignette: { value: 0.35 }, aspect: { value: 1 },
      },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tex; uniform sampler2D bloomA; uniform sampler2D bloomB; uniform float strength;
        uniform vec3 tint; uniform float sat; uniform float contrast; uniform float vignette; uniform float aspect; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tex, vUv).rgb;
          if (!(dot(c, vec3(1.0)) < 1e5)) c = vec3(0.0);
          c += (texture2D(bloomA, vUv).rgb * 0.6 + texture2D(bloomB, vUv).rgb * 0.8) * strength;
          c *= tint;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = max(mix(vec3(l), c, sat), 0.0);
          c = 0.18 * pow(c / 0.18 + 1e-5, vec3(contrast));
          vec2 q = (vUv - 0.5) * vec2(aspect, 1.0);
          c *= 1.0 - vignette * smoothstep(0.35, 1.05, length(q) * 1.25);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.grade = { tint: new THREE.Color(1, 1, 1), sat: 1.08, contrast: 1.05, vignette: 0.35, bloom: 0.35, threshold: 1.2 };
  }

  setSize(w, h) {
    const W = Math.max(1, Math.floor(w)), H = Math.max(1, Math.floor(h));
    this.main.setSize(W, H);
    this.a.setSize(Math.max(1, W >> 2), Math.max(1, H >> 2)); this.b.setSize(Math.max(1, W >> 2), Math.max(1, H >> 2));
    this.c.setSize(Math.max(1, W >> 3), Math.max(1, H >> 3)); this.d.setSize(Math.max(1, W >> 3), Math.max(1, H >> 3));
    this.composite.uniforms.aspect.value = W / H;
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  }

  render(scene, camera) {
    const r = this.r;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    if (size.x !== this.main.width || size.y !== this.main.height) this.setSize(size.x, size.y);
    r.setRenderTarget(this.main);
    r.render(scene, camera);
    const g = this.grade;
    // bloom chain
    this.bright.uniforms.tex.value = this.main.texture;
    this.bright.uniforms.texel.value.set(1 / this.main.width, 1 / this.main.height);
    this.bright.uniforms.thr.value = g.threshold;
    this.pass(this.bright, this.a);
    this.blur.uniforms.tex.value = this.a.texture; this.blur.uniforms.dir.value.set(1 / this.a.width, 0); this.pass(this.blur, this.b);
    this.blur.uniforms.tex.value = this.b.texture; this.blur.uniforms.dir.value.set(0, 1 / this.a.height); this.pass(this.blur, this.a);
    this.copy.uniforms.tex.value = this.a.texture; this.copy.uniforms.texel.value.set(1 / this.a.width, 1 / this.a.height); this.pass(this.copy, this.c);
    this.blur.uniforms.tex.value = this.c.texture; this.blur.uniforms.dir.value.set(1 / this.c.width, 0); this.pass(this.blur, this.d);
    this.blur.uniforms.tex.value = this.d.texture; this.blur.uniforms.dir.value.set(0, 1 / this.c.height); this.pass(this.blur, this.c);
    // composite to screen
    const u = this.composite.uniforms;
    u.tex.value = this.main.texture; u.bloomA.value = this.a.texture; u.bloomB.value = this.c.texture;
    u.strength.value = g.bloom; u.tint.value.copy(g.tint); u.sat.value = g.sat; u.contrast.value = g.contrast; u.vignette.value = g.vignette;
    this.pass(this.composite, null);
  }

  dispose() { for (const t of [this.main, this.a, this.b, this.c, this.d]) t.dispose(); }
}
