// DOM overlays projected from 3D: hitsplats, HP bars, overhead text and remote player name tags.

import * as THREE from 'three';

const SPLAT_MS = 1300;
const SPLAT_OFFSETS = [[0, 0], [0, -22], [-20, -11], [20, -11]];
const _v = new THREE.Vector3();

export class Overlays {
  constructor(rm) {
    this.rm = rm;
    this.root = document.getElementById('overlays');
    this.items = new Map();
  }

  item(uid) {
    let it = this.items.get(uid);
    if (it) return it;
    const el = document.createElement('div');
    el.className = 'ov';
    el.innerHTML = '<div class="ov-name"></div><div class="ov-text"></div><div class="ov-hp"><div class="ov-hp-fill"></div></div><div class="ov-splats"></div>';
    this.root.appendChild(el);
    it = { el, name: el.children[0], text: el.children[1], hp: el.children[2], fill: el.children[2].firstChild, splats: el.children[3], splatEls: [] };
    this.items.set(uid, it);
    return it;
  }

  drop(uid) {
    const it = this.items.get(uid);
    if (!it) return;
    it.el.remove();
    this.items.delete(uid);
  }

  update(views, now) {
    const cam = this.rm.camera;
    const W = this.rm.width, H = this.rm.height;
    const seen = new Set();
    for (const v of views) {
      const e = v.entity;
      if (!v.group.visible) continue;
      const splats = e.hitsplats.filter((s) => now - s.time < SPLAT_MS);
      if (splats.length !== e.hitsplats.length) e.hitsplats = splats;
      const showHp = e.hpBarUntil > now && !(e.dead && e.type === 'npc' && e.hidden);
      const text = e.overhead && e.overhead.until > now ? e.overhead : null;
      const nameTag = e.type === 'remote';
      if (!splats.length && !showHp && !text && !nameTag) continue;
      v.headPosition(_v);
      _v.project(cam);
      if (_v.z > 1 || _v.x < -1.2 || _v.x > 1.2 || _v.y < -1.2 || _v.y > 1.2) continue;
      seen.add(e.uid);
      const it = this.item(e.uid);
      const sx = (_v.x * 0.5 + 0.5) * W, sy = (-_v.y * 0.5 + 0.5) * H;
      it.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      // name tag
      it.name.style.display = nameTag ? '' : 'none';
      if (nameTag && it.name.textContent !== e.name) it.name.textContent = e.name;
      // overhead text
      it.text.style.display = text ? '' : 'none';
      if (text) { if (it.text.textContent !== text.text) it.text.textContent = text.text; it.text.style.color = text.color; }
      // hp bar
      it.hp.style.display = showHp ? '' : 'none';
      if (showHp) it.fill.style.width = `${Math.max(0, Math.min(100, (e.hp / Math.max(1, e.maxHp)) * 100))}%`;
      // hitsplats (newest first, max 4)
      const list = splats.slice(-4).reverse();
      while (it.splatEls.length < list.length) {
        const s = document.createElement('div');
        s.className = 'splat';
        it.splats.appendChild(s);
        it.splatEls.push(s);
      }
      it.splatEls.forEach((s, i) => {
        const sp = list[i];
        if (!sp) { s.style.display = 'none'; return; }
        s.style.display = '';
        s.className = `splat splat-${sp.type}`;
        s.textContent = sp.amount;
        const [ox, oy] = SPLAT_OFFSETS[i];
        s.style.transform = `translate(${ox - 13}px, ${oy + 18}px)`;
      });
    }
    for (const uid of [...this.items.keys()]) if (!seen.has(uid)) this.drop(uid);
  }
}
