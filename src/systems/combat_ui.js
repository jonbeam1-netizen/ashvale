// Combat-area UI helpers. OWNER: agent A.
// Icon shapes for spells / prayers / overheads, injected CSS, the overhead icon overlay (protect
// prayers + skulls above characters), the multi-combat indicator and the Combat tab renderer.

import * as THREE from 'three';
import { registerIconShape, getShapeIcon } from '../ui/icons.js';
import { el, escapeHtml } from '../ui/util.js';
import { getWeaponType, getPrayer, getSpell } from '../core/registry.js';
import { SKILL_NAMES } from '../core/constants.js';

// ---------------------------------------------------------------------------------------------
// Icon shapes (36 x 32 canvas)
// ---------------------------------------------------------------------------------------------
function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f > 1) c.lerp(new THREE.Color('#ffffff'), Math.min(1, f - 1)); else c.multiplyScalar(f);
  return '#' + c.getHexString();
}
function fillShaded(ctx, color, outline = true) {
  const g = ctx.createRadialGradient(14, 11, 1, 18, 16, 16);
  g.addColorStop(0, shade(color, 1.5)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, 0.5));
  ctx.fillStyle = g; ctx.fill();
  if (outline) { ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.stroke(); }
}
const circ = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
const poly = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };
function stroke(ctx, color, w) { ctx.lineWidth = w + 2; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke(); }

function badge(ctx, color) { circ(ctx, 18, 16, 13); fillShaded(ctx, '#2a2420'); circ(ctx, 18, 16, 11); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke(); }

let shapesDone = false;
export function registerCombatIcons() {
  if (shapesDone) return;
  shapesDone = true;
  const orb = (tier) => (ctx, c, c2) => {
    const r = 6 + tier;
    if (tier >= 3) { circ(ctx, 18, 16, r + 3); ctx.lineWidth = 1.5; ctx.strokeStyle = shade(c, 0.8); ctx.stroke(); }
    if (tier >= 4) { ctx.beginPath(); ctx.ellipse(18, 16, r + 5, 4, -0.5, 0, Math.PI * 2); ctx.lineWidth = 1.2; ctx.strokeStyle = c2 || shade(c, 1.4); ctx.stroke(); }
    if (tier >= 5) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; poly(ctx, [18 + Math.cos(a) * (r + 1), 16 + Math.sin(a) * (r + 1), 18 + Math.cos(a + 0.2) * (r + 6), 16 + Math.sin(a + 0.2) * (r + 6), 18 + Math.cos(a + 0.4) * (r + 1), 16 + Math.sin(a + 0.4) * (r + 1)]); fillShaded(ctx, c2 || c, false); }
    if (tier === 2) { poly(ctx, [4, 28, 12, 18, 14, 21]); fillShaded(ctx, shade(c, 0.9), false); }
    circ(ctx, 18, 16, r); fillShaded(ctx, c);
    circ(ctx, 15, 13, r / 3); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  };
  for (let t = 1; t <= 5; t++) registerIconShape(`spell${t}`, orb(t));
  registerIconShape('spell_curse', (ctx, c) => {
    ctx.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.45, r = 2 + i * 0.32; const x = 18 + Math.cos(a) * r, y = 16 + Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    stroke(ctx, c, 2.4);
  });
  registerIconShape('spell_bind', (ctx, c, c2) => {
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(18, 9 + k * 7, 11, 3.5, 0, 0, Math.PI * 2); stroke(ctx, k === 1 && c2 ? c2 : c, 2); }
    poly(ctx, [16, 2, 20, 2, 20, 30, 16, 30]); fillShaded(ctx, shade(c, 0.7));
  });
  registerIconShape('spell_drain', (ctx, c) => {
    ctx.beginPath(); ctx.moveTo(18, 3); ctx.quadraticCurveTo(30, 18, 25, 25); ctx.quadraticCurveTo(18, 32, 11, 25); ctx.quadraticCurveTo(6, 18, 18, 3); ctx.closePath(); fillShaded(ctx, c);
  });
  registerIconShape('spell_tether', (ctx, c) => {
    for (const [x, y] of [[11, 9], [18, 16], [25, 23]]) { ctx.beginPath(); ctx.ellipse(x, y, 5, 3, 0.78, 0, Math.PI * 2); stroke(ctx, c, 2); }
  });
  registerIconShape('pr_orb', (ctx, c) => { circ(ctx, 18, 16, 9); fillShaded(ctx, c); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(18 + Math.cos(a) * 11, 16 + Math.sin(a) * 11); ctx.lineTo(18 + Math.cos(a) * 14, 16 + Math.sin(a) * 14); stroke(ctx, c, 1.5); } });
  registerIconShape('pr_restore', (ctx, c) => { ctx.beginPath(); ctx.arc(18, 16, 9, 0.3, Math.PI * 1.7); stroke(ctx, c, 3); poly(ctx, [24, 4, 30, 10, 22, 12]); fillShaded(ctx, c); });
  registerIconShape('pr_keep', (ctx, c) => { poly(ctx, [18, 3, 29, 9, 27, 22, 18, 29, 9, 22, 7, 9]); fillShaded(ctx, c); circ(ctx, 18, 15, 4); fillShaded(ctx, '#e04040'); });
  registerIconShape('pr_combo', (ctx, c, c2) => {
    poly(ctx, [7, 5, 29, 5, 29, 16, 18, 30, 7, 16]); fillShaded(ctx, c);
    poly(ctx, [17, 7, 19, 7, 19, 24, 17, 24]); fillShaded(ctx, c2 || '#c03030', false);
    poly(ctx, [11, 12, 25, 12, 25, 14, 11, 14]); fillShaded(ctx, c2 || '#c03030', false);
  });
  registerIconShape('ward_melee', (ctx, c) => {
    badge(ctx, c);
    poly(ctx, [10, 24, 24, 8, 26, 10, 12, 26]); fillShaded(ctx, '#e0e0e8');
    poly(ctx, [26, 24, 12, 8, 10, 10, 24, 26]); fillShaded(ctx, '#c8c8d0');
  });
  registerIconShape('ward_ranged', (ctx, c) => {
    badge(ctx, c);
    ctx.beginPath(); ctx.moveTo(9, 25); ctx.lineTo(25, 9); stroke(ctx, '#d8c090', 1.6);
    poly(ctx, [22, 7, 28, 6, 27, 12]); fillShaded(ctx, '#e0e0e8');
    poly(ctx, [8, 22, 11, 26, 7, 27]); fillShaded(ctx, '#e04040', false);
  });
  registerIconShape('ward_magic', (ctx, c) => {
    badge(ctx, c);
    const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.5 : 9, a = -Math.PI / 2 + i * Math.PI / 5; p.push(18 + Math.cos(a) * r, 16 + Math.sin(a) * r); }
    poly(ctx, p); fillShaded(ctx, '#9ac0ff');
  });
  registerIconShape('ward_rites', (ctx, c) => {
    badge(ctx, c);
    ctx.beginPath(); ctx.moveTo(18, 6); ctx.quadraticCurveTo(27, 16, 23, 22); ctx.quadraticCurveTo(18, 27, 13, 22); ctx.quadraticCurveTo(9, 16, 18, 6); ctx.closePath(); fillShaded(ctx, '#ff8020');
  });
  registerIconShape('ward_wind', (ctx, c) => {
    badge(ctx, c);
    ctx.beginPath(); ctx.moveTo(18, 25); ctx.bezierCurveTo(8, 18, 10, 8, 18, 13); ctx.bezierCurveTo(26, 8, 28, 18, 18, 25); ctx.closePath(); fillShaded(ctx, '#80f0b0');
  });
  registerIconShape('ward_rend', (ctx, c) => {
    badge(ctx, c);
    poly(ctx, [20, 5, 12, 17, 18, 17, 15, 27, 25, 13, 19, 13]); fillShaded(ctx, '#ff5050');
  });
  registerIconShape('pk_skull', (ctx) => {
    circ(ctx, 18, 13, 10); fillShaded(ctx, '#f0ece0');
    ctx.beginPath(); ctx.roundRect(12, 18, 12, 9, 2); fillShaded(ctx, '#f0ece0');
    ctx.fillStyle = '#b00000'; circ(ctx, 14, 14, 2.8); ctx.fill(); circ(ctx, 22, 14, 2.8); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(15, 23, 1.2, 4); ctx.fillRect(18, 23, 1.2, 4); ctx.fillRect(21, 23, 1.2, 4);
  });
  registerIconShape('multi_swords', (ctx) => {
    poly(ctx, [6, 26, 24, 6, 27, 6, 27, 9, 9, 28]); fillShaded(ctx, '#d8d8e0');
    poly(ctx, [30, 26, 12, 6, 9, 6, 9, 9, 27, 28]); fillShaded(ctx, '#c8c8d0');
    poly(ctx, [4, 22, 8, 20, 13, 27, 10, 29]); fillShaded(ctx, '#c8a040');
    poly(ctx, [32, 22, 28, 20, 23, 27, 26, 29]); fillShaded(ctx, '#c8a040');
  });
}

// ---------------------------------------------------------------------------------------------
// CSS (injected once; engine stylesheet is not ours)
// ---------------------------------------------------------------------------------------------
let cssDone = false;
export function injectCombatCss() {
  if (cssDone) return;
  cssDone = true;
  const s = document.createElement('style');
  s.id = 'combat-css';
  s.textContent = `
  #combat-overheads { position: absolute; inset: 0; pointer-events: none; z-index: 4; overflow: hidden; }
  .ohd { position: absolute; left: 0; top: 0; width: 0; height: 0; }
  .ohd img { position: absolute; width: 30px; height: 27px; transform: translateX(-50%); filter: drop-shadow(0 0 2px rgba(0,0,0,0.8)); }
  #multi-indicator { position: absolute; right: 18px; bottom: 318px; width: 32px; height: 29px; z-index: 8; pointer-events: auto; }
  #multi-indicator img { width: 32px; height: 29px; filter: drop-shadow(1px 1px 0 #000); }
  .combat-info { font-size: 11px; color: #c8b890; text-align: center; margin: 6px 0 2px; line-height: 1.35; }
  .combat-info b { color: #ffb83f; font-weight: 400; }
  .style-btn.autocast-btn img { width: 22px; height: 20px; align-self: center; }
  .spec-bar.armed { outline: 2px solid #ffff40; }
  .spec-bar .spec-cost { position: absolute; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.7); }
  .spell-cell { position: relative; }
  .spell-cell.nosigils img { opacity: 0.45; }
  .spell-cell.autocasting { box-shadow: inset 0 0 0 2px #40ff40; }
  .spell-grid .icon-cell { height: 34px; }
  .spell-grid .icon-cell img { width: 30px; height: 27px; }
  .spell-book-head { text-align: center; margin-bottom: 4px; }
  .pray-tools { display: flex; justify-content: space-between; gap: 4px; margin-top: 6px; }
  .pray-tools .btn { flex: 1; margin: 0; padding: 3px 2px; font-size: 11px; }
  .icon-cell.quick { box-shadow: inset 0 0 0 2px #40d0ff; }
  .tab-prayer .icon-grid { gap: 2px; }
  .tab-prayer .icon-cell { height: 31px; }
  .tab-prayer .icon-cell img { width: 30px; height: 27px; }
  .pray-setup .icon-cell.locked { opacity: 0.3; }
  .orb.orb-hp.poisoned .orb-fill { background: linear-gradient(#3ac03a, #146a14) !important; }
  .orb.orb-prayer.quick-on .orb-ball { box-shadow: 0 0 6px 2px #a0e0ff; }
  .spell-pick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; padding: 6px; }
  .spell-pick .icon-cell { background: rgba(0,0,0,0.2); }
  .grave-list { padding: 8px; }
  .grave-list .grave-items { display: grid; grid-template-columns: repeat(6, 38px); gap: 4px; margin: 6px 0; }
  .grave-list .grave-items div { position: relative; width: 38px; height: 34px; background: rgba(0,0,0,0.25); border-radius: 3px; }
  .grave-list .grave-items img { width: 36px; height: 32px; }
  .grave-list .grave-items span { position: absolute; left: 2px; top: 0; color: #ffff00; font-size: 10px; text-shadow: 1px 1px 0 #000; }
  `;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------------------------
// Overhead icons (protect prayers + skull) above the local player, remote players and NPCs.
// ---------------------------------------------------------------------------------------------
export class OverheadIcons {
  /** @param provider (entity) => { prayer: shape|null, skull: bool } */
  constructor(game, provider) {
    this.game = game;
    this.provider = provider;
    this.root = document.createElement('div');
    this.root.id = 'combat-overheads';
    const ov = document.getElementById('overlays');
    ov?.parentNode ? ov.parentNode.insertBefore(this.root, ov) : document.body.appendChild(this.root);
    this.items = new Map();
    this.v = new THREE.Vector3();
    const loop = () => { try { this.update(); } catch (e) { console.error('[combat] overheads', e); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  update() {
    const g = this.game, rm = g.renderer;
    if (!rm || !g.player) return;
    const seen = new Set();
    const consider = (e) => {
      if (e.hidden) return;
      const info = this.provider(e);
      if (!info || (!info.prayer && !info.skull)) return;
      const view = rm.viewFor(e);
      if (!view || !view.group.visible) return;
      view.headPosition(this.v);
      this.v.project(rm.camera);
      if (this.v.z > 1 || Math.abs(this.v.x) > 1.2 || Math.abs(this.v.y) > 1.2) return;
      seen.add(e.uid);
      let it = this.items.get(e.uid);
      if (!it) {
        const d = el('div', 'ohd', '<img alt="" class="ohd-pray"><img alt="" class="ohd-skull">');
        this.root.appendChild(d);
        it = { el: d, pray: d.children[0], skull: d.children[1] };
        this.items.set(e.uid, it);
      }
      const sx = (this.v.x * 0.5 + 0.5) * rm.width, sy = (-this.v.y * 0.5 + 0.5) * rm.height;
      it.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      const base = e.type === 'remote' ? -34 : -20;
      let top = base;
      if (info.prayer) {
        top -= 28;
        const src = getShapeIcon(info.prayer, '#e8e0c8');
        if (it.pray.getAttribute('src') !== src) it.pray.src = src;
        it.pray.style.display = '';
        it.pray.style.top = `${top}px`;
      } else it.pray.style.display = 'none';
      if (info.skull) {
        top -= 24;
        const src = getShapeIcon('pk_skull', '#fff');
        if (it.skull.getAttribute('src') !== src) it.skull.src = src;
        it.skull.style.display = '';
        it.skull.style.top = `${top}px`;
      } else it.skull.style.display = 'none';
    };
    consider(g.player);
    for (const r of g.remotePlayers.values()) consider(r);
    for (const n of g.npcs.values()) if (n.state?.overhead && !n.dead) consider(n);
    for (const [uid, it] of this.items) if (!seen.has(uid)) { it.el.remove(); this.items.delete(uid); }
  }
}

/** Crossed-swords indicator shown while the player stands in a multi-combat area. */
export function setupMultiIndicator(game) {
  const d = el('div', '', `<img alt="" src="${getShapeIcon('multi_swords', '#ddd')}">`);
  d.id = 'multi-indicator';
  d.title = 'Multi-way combat area';
  d.style.display = 'none';
  document.getElementById('game-root')?.appendChild(d);
  const upd = () => { const p = game.player; d.style.display = game.world.isMulti(p.x, p.y) ? '' : 'none'; };
  game.events.on('player:move', upd);
  game.events.on('teleport', upd);
  game.events.on('game:start', upd);
  upd();
}

// ---------------------------------------------------------------------------------------------
// Combat tab
// ---------------------------------------------------------------------------------------------
export function renderCombatTab(game, combat, pane) {
  const p = game.player;
  const w = p.equipment.weapon();
  const wt = getWeaponType(p.equipment.weaponType());
  const st = combat.store(p);
  pane.innerHTML = '';
  pane.appendChild(el('div', 'combat-head', `<b>${escapeHtml(w ? w.name : 'Unarmed')}</b><br>Combat Lvl: ${p.combatLevel}<br><small>Category: ${escapeHtml(wt.name || wt.id)}</small>`));
  const styles = el('div', 'combat-styles');
  wt.styles.forEach((s, i) => {
    const active = p.combatStyle === i;
    let html;
    if (s.style === 'autocast') {
      const sp = st.autocast ? getSpell(st.autocast) : null;
      html = sp
        ? `<img alt="" src="${getShapeIcon(sp.icon?.shape || 'rune', sp.icon?.color || '#8ad0ff', sp.icon?.color2)}"><b>${escapeHtml(sp.name)}</b><small>autocast</small>`
        : '<b>Spell</b><small>choose spell</small>';
    } else html = `<b>${escapeHtml(s.name)}</b><small>(${s.type}) ${s.style}</small>`;
    const b = el('button', `style-btn${active ? ' active' : ''}${s.style === 'autocast' ? ' autocast-btn' : ''}`, html);
    b.title = s.style === 'autocast' ? 'Autocast a combat spell. XP: Magic' : `XP: ${(s.xp || []).map((x) => SKILL_NAMES[x]).join(', ')}`;
    b.onclick = () => {
      if (s.style === 'autocast' && (!st.autocast || active)) { combat.chooseAutocast(i); return; }
      p.combatStyle = i;
      game.events.emit('combat:style', { player: p, style: s });
      game.ui.refreshTab('combat');
    };
    styles.appendChild(b);
  });
  pane.appendChild(styles);

  const mode = combat.attackMode(p);
  const speed = combat.attackSpeed(p, mode);
  const range = combat.attackRange(p, mode);
  const mh = combat.maxHit(p, mode);
  const ammo = mode.kind === 'ranged' ? combat.ammoStatus(p) : null;
  pane.appendChild(el('div', 'combat-info',
    `Speed: <b>${speed} ticks</b> (${(speed * 0.6).toFixed(1)}s) &middot; Range: <b>${range}</b> &middot; Max hit: <b>${mh}</b>` +
    (ammo ? `<br>${ammo}` : '')));

  const ar = el('button', `btn retaliate${p.autoRetaliate ? ' on' : ''}`, `Auto Retaliate (${p.autoRetaliate ? 'On' : 'Off'})`);
  ar.onclick = () => { p.autoRetaliate = !p.autoRetaliate; game.ui.refreshTab('combat'); };
  pane.appendChild(ar);

  const spec = combat.weaponSpecial(p);
  const energy = Math.floor(p.specialEnergy);
  const bar = el('div', `spec-bar${spec ? '' : ' disabled'}${combat.specArmed(p) ? ' armed' : ''}`,
    `<div class="spec-fill" style="width:${energy}%"></div>${spec ? `<div class="spec-cost" style="left:${spec.cost}%"></div>` : ''}<span>Special Attack: ${energy}%</span>`);
  bar.title = spec ? `${spec.name} (${spec.cost}%): ${spec.description || ''}` : 'This weapon has no special attack.';
  bar.onclick = () => game.events.emit('ui:special', { handled: false });
  pane.appendChild(bar);
  if (spec) pane.appendChild(el('div', 'combat-info', `<b>${escapeHtml(spec.name)}</b> &middot; ${spec.cost}% &middot; ${escapeHtml(spec.description || '')}`));
}

/** Simple prayer-id -> overhead shape lookup. */
export function overheadShape(prayerId) { return getPrayer(prayerId)?.overhead || null; }
