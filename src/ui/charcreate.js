// First-run character creation: name + appearance colours, with a live 3D preview.

import * as THREE from 'three';
import { buildCharacter } from '../render/models.js';
import { DEFAULT_APPEARANCE } from '../entities/entities.js';
import { el } from './util.js';

const PALETTES = {
  skin: ['#f2c8a0', '#d9a77a', '#b98058', '#8a5a3a', '#5e3a24', '#7a9a5a'],
  hair: ['#1a1410', '#4a2f1b', '#8a5a2a', '#d8b060', '#e8e0d0', '#a03020', '#3a3a8a'],
  top: ['#7a3b2e', '#2e5a7a', '#3a6a3a', '#6a4a8a', '#8a7a3a', '#5a5a5a', '#c8c0b0', '#2a2a2a'],
  legs: ['#3b4a6b', '#4a3a2a', '#2a2a2a', '#5a6a3a', '#7a2a2a', '#8a8070'],
  boots: ['#3a2a1c', '#1a1a1a', '#6a4a2a', '#4a4a5a'],
};
const LABELS = { skin: 'Skin', hair: 'Hair', top: 'Torso', legs: 'Legs', boots: 'Feet' };

/** Shows the creation screen. Resolves with {name, appearance}. */
export function showCharacterCreation() {
  return new Promise((resolve) => {
    const root = document.getElementById('charcreate');
    root.style.display = 'flex';
    root.innerHTML = '';
    const app = { ...DEFAULT_APPEARANCE };
    const panel = el('div', 'cc-panel');
    panel.appendChild(el('div', 'cc-title', 'Welcome to Ashvale'));
    panel.appendChild(el('div', 'cc-sub', 'Create your adventurer'));
    const row = el('div', 'cc-row');
    const prev = el('div', 'cc-preview');
    const opts = el('div', 'cc-opts');
    row.append(prev, opts);
    panel.appendChild(row);

    // preview renderer
    const W = 220, H = 280;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(W, H);
    prev.appendChild(r.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 50);
    cam.position.set(0, 1.0, 4.2);
    cam.lookAt(0, 0.8, 0);
    scene.add(new THREE.HemisphereLight(0xdde8ff, 0x553322, 1.4));
    const sun = new THREE.DirectionalLight(0xfff0dd, 1.6);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.12, 12), new THREE.MeshLambertMaterial({ color: 0x5a4a3a, flatShading: true }));
    pedestal.position.y = -0.06;
    scene.add(pedestal);
    let rig = null;
    const rebuild = () => {
      if (rig) scene.remove(rig.root);
      rig = buildCharacter({
        template: 'human',
        colors: { skin: app.skin, hair: app.hair, top: app.top, legs: app.legs, boots: app.boots },
        hairStyle: app.hairStyle, female: app.body === 'female', equipment: {},
      });
      scene.add(rig.root);
    };
    rebuild();
    let alive = true;
    const t0 = performance.now();
    const loop = () => {
      if (!alive) return;
      const t = (performance.now() - t0) / 1000;
      rig.root.rotation.y = Math.sin(t * 0.6) * 0.8;
      rig.parts.armL.rotation.z = -0.05 - Math.sin(t * 2.2) * 0.02;
      r.render(scene, cam);
      requestAnimationFrame(loop);
    };
    loop();

    // name
    const nameRow = el('div', 'cc-field', '<label>Name</label>');
    const name = el('input', 'cc-name');
    name.maxLength = 12;
    name.placeholder = 'Adventurer';
    name.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(); });
    nameRow.appendChild(name);
    opts.appendChild(nameRow);

    const toggleRow = (label, key, values) => {
      const f = el('div', 'cc-field', `<label>${label}</label>`);
      const wrap = el('div', 'cc-toggle');
      for (const [v, text] of values) {
        const b = el('button', `btn${app[key] === v ? ' active' : ''}`, text);
        b.onclick = () => { app[key] = v; [...wrap.children].forEach((c) => c.classList.toggle('active', c === b)); rebuild(); };
        wrap.appendChild(b);
      }
      f.appendChild(wrap);
      opts.appendChild(f);
    };
    toggleRow('Body', 'body', [['male', 'A'], ['female', 'B']]);
    toggleRow('Hair style', 'hairStyle', [['short', 'Short'], ['long', 'Long'], ['bald', 'None']]);

    for (const key of Object.keys(PALETTES)) {
      const f = el('div', 'cc-field', `<label>${LABELS[key]}</label>`);
      const sw = el('div', 'cc-swatches');
      for (const c of PALETTES[key]) {
        const s = el('div', `cc-swatch${app[key] === c ? ' active' : ''}`);
        s.style.background = c;
        s.onclick = () => { app[key] = c; [...sw.children].forEach((x) => x.classList.toggle('active', x === s)); rebuild(); };
        sw.appendChild(s);
      }
      f.appendChild(sw);
      opts.appendChild(f);
    }
    const go = el('button', 'btn cc-go', 'Enter Ashvale');
    const err = el('div', 'cc-err');
    panel.append(err, go);
    root.appendChild(panel);
    setTimeout(() => name.focus(), 50);

    function done() {
      const n = name.value.trim() || 'Adventurer';
      if (!/^[A-Za-z0-9 _-]{1,12}$/.test(n)) { err.textContent = 'Names may only use letters, numbers, spaces, - and _.'; return; }
      alive = false;
      r.dispose();
      root.style.display = 'none';
      root.innerHTML = '';
      resolve({ name: n, appearance: app });
    }
    go.onclick = done;
  });
}
