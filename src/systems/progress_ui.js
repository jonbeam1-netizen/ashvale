// Progress UI glue: injected styles + hooks into the Skills / Quests / Settings tabs (wraps the existing
// tab renderers instead of replacing them, so other modules may wrap them too).

import { el } from '../ui/util.js';
import { SKILL_GRID, SKILL_NAMES } from '../core/constants.js';
import { xpForLevel } from '../core/xp.js';

const CSS = `
.tab-skills .skill-cell { cursor: pointer; }
.tab-skills .skill-cell:hover { filter: brightness(1.2); }
.pg-btnrow { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; margin: 5px 0 2px; }
.pg-btnrow .btn { margin: 0; padding: 3px 6px; font-size: 11px; }
.tab-quests .pg-btnrow { margin: 0 0 6px; }

.skill-guide .iface-body, .pg-win .iface-body { display: flex; flex-direction: column; gap: 6px; }
.sg-strip { display: flex; flex-wrap: wrap; gap: 1px; justify-content: center; }
.sg-skill { width: 26px; height: 24px; padding: 0; background: linear-gradient(#4a4134, #3a3228); border: 1px solid #1a1611; border-radius: 2px; }
.sg-skill img { width: 20px; height: 18px; display: block; margin: auto; }
.sg-skill.on { background: linear-gradient(#8a3a2a, #5a2218); box-shadow: inset 0 0 0 1px #c05a3a; }
.sg-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sg-head img { width: 36px; height: 32px; }
.sg-head-txt { flex: 1; color: var(--text); }
.sg-head-txt small { color: #c8b890; font-weight: 400; }
.sg-bar, .xt-bar { position: relative; height: 8px; background: #200; border: 1px solid #000; width: 100%; }
.sg-bar div, .xt-bar div { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(#3ac03a, #1a7a1a); }
.sg-tabs, .pg-tabs { display: flex; flex-wrap: wrap; gap: 2px; }
.sg-tab, .pg-tab { background: linear-gradient(#5d5244, #463d31); border: 1px solid #1a1611; color: var(--text); padding: 3px 7px; border-radius: 3px 3px 0 0; text-shadow: 1px 1px 0 #000; font: inherit; font-size: 11px; }
.sg-tab.on, .pg-tab.on { background: linear-gradient(#8a3a2a, #5a2218); color: #fff; }
.sg-list { position: relative; max-height: 300px; min-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.22); border: 1px solid #1a1611; padding: 2px; scrollbar-width: thin; }
.sg-row { display: flex; align-items: center; gap: 6px; padding: 1px 4px; border-bottom: 1px solid rgba(0,0,0,0.25); color: #ffb83f; }
.sg-row img { width: 30px; height: 27px; flex: none; }
.sg-lv { width: 22px; text-align: right; color: #ffff00; flex: none; }
.sg-name { display: flex; flex-direction: column; min-width: 0; }
.sg-name small { color: #c8b890; font-weight: 400; font-size: 10px; }
.sg-row.locked { opacity: 0.45; }
.sg-row.locked img { filter: grayscale(0.8); }
.sg-row.cur { background: rgba(255,230,120,0.14); box-shadow: inset 2px 0 0 #ffde72; }
.sg-marker { text-align: center; color: #fff; font-size: 11px; padding: 2px 0; margin: 2px 0; border-top: 1px solid #ffde72; border-bottom: 1px solid #ffde72; background: rgba(255,222,114,0.12); }

#xp-tracker-btn { position: absolute; top: 40px; right: 262px; width: 22px; height: 22px; padding: 0; z-index: 11; border-radius: 50%; background: radial-gradient(#5a5044, #2a241c); border: 2px solid #1a1611; box-shadow: inset 0 0 0 1px #8a7a60; color: #ffde72; font: 700 9px/18px Verdana, sans-serif; cursor: pointer; }
#xp-tracker-btn.on { box-shadow: inset 0 0 0 1px #8a7a60, 0 0 6px 2px rgba(255,240,120,0.7); }
.xp-tracker { position: absolute; top: 26px; left: 6px; width: 214px; max-height: 50vh; overflow-y: auto; z-index: 12; padding: 4px; background: rgba(40,34,26,0.82); border: 2px solid #1a1611; box-shadow: inset 0 0 0 1px #6e604c; border-radius: 4px; color: var(--text); text-shadow: 1px 1px 0 #000; font-size: 11px; scrollbar-width: thin; }
.xt-head { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
.xt-head b { flex: 1; color: #ffde72; }
.xt-head button { font: inherit; font-size: 10px; padding: 0 5px; background: linear-gradient(#5d5244, #463d31); border: 1px solid #1a1611; color: var(--text); border-radius: 3px; cursor: pointer; }
.xt-row { display: grid; grid-template-columns: 24px 1fr; gap: 0 4px; padding: 2px 0; border-top: 1px solid rgba(0,0,0,0.35); }
.xt-row img { width: 22px; height: 20px; grid-row: span 3; }
.xt-row .xt-l { display: flex; justify-content: space-between; gap: 4px; }
.xt-row .xt-l span:last-child { color: #fff; }
.xt-row .xt-bar { height: 7px; }
.xt-row .xt-bar span { position: absolute; inset: 0; font-size: 8px; line-height: 7px; text-align: center; color: #fff; }

.pg-win .muted { color: #c8b890; }
.cl-wrap { display: grid; grid-template-columns: 150px 1fr; gap: 6px; min-height: 300px; }
.cl-sources { max-height: 330px; overflow-y: auto; background: rgba(0,0,0,0.22); border: 1px solid #1a1611; scrollbar-width: thin; }
.cl-src { padding: 2px 5px; cursor: pointer; color: #ffb83f; display: flex; justify-content: space-between; gap: 4px; }
.cl-src:hover { background: rgba(255,255,255,0.06); }
.cl-src.on { background: rgba(255,222,114,0.18); color: #fff; }
.cl-src.full { color: #3ae03a; }
.cl-src small { color: #c8b890; font-weight: 400; }
.cl-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cl-title { color: #ffde72; font-size: 13px; }
.cl-grid { display: grid; grid-template-columns: repeat(auto-fill, 44px); grid-auto-rows: 42px; gap: 3px; background: rgba(0,0,0,0.22); border: 1px solid #1a1611; padding: 4px; }
.cl-item { position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); border-radius: 3px; }
.cl-item img { width: 36px; height: 32px; }
.cl-item.missing img { filter: brightness(0) opacity(0.38); }
.cl-item span { position: absolute; top: 0; left: 2px; font-size: 10px; color: #ffff00; }

.ch-regions { display: flex; flex-wrap: wrap; gap: 2px; }
.ch-tiers { display: flex; gap: 2px; }
.ch-sum { color: #c8b890; }
.ch-list { max-height: 270px; overflow-y: auto; background: #d8c49e; color: #000; text-shadow: none; font-weight: 400; padding: 4px 8px; border: 1px solid #1a1611; scrollbar-width: thin; }
.ch-task { padding: 2px 0; }
.ch-task.done { color: #2a7a2a; text-decoration: line-through; }
.ch-task small { color: #6a5a40; }
.ch-foot { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.ch-foot .muted { flex: 1; }

.hs-table { width: 100%; border-collapse: collapse; color: #ffb83f; }
.hs-table td, .hs-table th { padding: 1px 6px; border-bottom: 1px solid rgba(0,0,0,0.3); text-align: right; }
.hs-table td:first-child, .hs-table th:first-child { text-align: left; }
.hs-table th { color: #ffde72; }
.hs-table img { width: 20px; height: 18px; vertical-align: middle; margin-right: 4px; }
.hs-table tr.max td { color: #3ae03a; }
.hs-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.mh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 3px; max-height: 340px; overflow-y: auto; scrollbar-width: thin; }
.mh-cape { display: flex; align-items: center; gap: 5px; padding: 2px 4px; background: rgba(0,0,0,0.22); border: 1px solid #1a1611; border-radius: 3px; color: #ffb83f; }
.mh-cape img { width: 32px; height: 28px; }
.mh-cape div { flex: 1; min-width: 0; }
.mh-cape small { display: block; color: #c8b890; font-weight: 400; font-size: 10px; }
.mh-cape.locked { opacity: 0.5; }
.mh-cape .btn { margin: 0; padding: 2px 6px; font-size: 11px; }
.milestone-banner b { color: #7a2aa0 !important; }
@media (max-width: 600px) { .cl-wrap { grid-template-columns: 1fr; } .xp-tracker { width: 170px; } }
`;

export function injectCss() {
  if (document.getElementById('progress-css')) return;
  const s = document.createElement('style');
  s.id = 'progress-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Chain an extra step after a side-panel tab's current renderer. */
export function wrapTab(game, id, after) {
  const t = game.ui?.side?.tabs?.get(id);
  if (!t) return;
  const prev = t.render;
  game.ui.registerTab({
    id,
    render: (pane) => {
      prev?.(pane);
      try { after(pane); } catch (e) { console.error(`[progress] ${id} tab hook failed`, e); }
    },
  });
}

export function initTabHooks(game, P) {
  const side = game.ui.side;

  // Skills tab: click a skill -> guide; total level -> hiscores; buttons below the grid.
  wrapTab(game, 'skills', (pane) => {
    if (!pane.dataset.pgWired) {
      pane.dataset.pgWired = '1';
      pane.addEventListener('click', (e) => {
        const cell = e.target.closest('.skill-cell');
        if (!cell) return;
        const cells = [...pane.querySelectorAll('.skills-grid .skill-cell')];
        const i = cells.indexOf(cell);
        if (cell.classList.contains('total')) { P.openHiscores(); return; }
        const skill = SKILL_GRID[i];
        if (skill) { game.ui.hideTooltip(); P.openSkillGuide(skill); }
      });
    }
    if (!pane.querySelector('.pg-btnrow')) {
      const row = el('div', 'pg-btnrow');
      const mk = (label, title, fn) => { const b = el('button', 'btn', label); b.title = title; b.onclick = fn; row.appendChild(b); };
      mk('Hiscores', 'Your skills, totals and other players', () => P.openHiscores());
      mk('Collections', 'Collection log', () => P.openCollectionLog());
      mk('XP tracker', 'Toggle the XP tracker overlay', () => P.xpTracker.toggle());
      pane.appendChild(row);
    }
  });
  if (typeof side.skillTip === 'function' && !side._pgTip) {
    side._pgTip = true;
    const orig = side.skillTip.bind(side);
    side.skillTip = (s) => {
      const sk = game.player.skills, lv = sk.getLevel(s), xp = sk.getXp(s);
      let extra = '';
      if (lv < 99) {
        const a = xpForLevel(lv), b = xpForLevel(lv + 1);
        extra = `<br><b>Progress:</b> ${(((xp - a) / (b - a)) * 100).toFixed(1)}%`;
      }
      return `${orig(s)}${extra}<br><span class="muted">Click for the ${SKILL_NAMES[s]} guide</span>`;
    };
  }

  // Quests tab: Chronicles + Collection log buttons on top.
  wrapTab(game, 'quests', (pane) => {
    if (pane.querySelector('.pg-btnrow')) return;
    const row = el('div', 'pg-btnrow');
    const a = el('button', 'btn', 'Regional Chronicles');
    a.onclick = () => P.openChronicles();
    const b = el('button', 'btn', 'Collection log');
    b.onclick = () => P.openCollectionLog();
    row.append(a, b);
    pane.insertBefore(row, pane.firstChild);
  });

  // Settings tab: XP tracker toggle right after "XP drops".
  wrapTab(game, 'settings', (pane) => {
    if (pane.querySelector('.pg-xt-toggle')) return;
    const s = game.player.settings;
    const row = el('label', 'set-row pg-xt-toggle', `<input type="checkbox" ${s.xpTracker ? 'checked' : ''}> XP tracker overlay`);
    row.querySelector('input').onchange = (e) => P.xpTracker.setVisible(e.target.checked);
    const anchor = [...pane.querySelectorAll('.set-row')].find((r) => /XP drops/.test(r.textContent));
    if (anchor) anchor.after(row); else pane.appendChild(row);
  });

  for (const id of ['skills', 'quests', 'settings']) if (side.current === id) side.refresh(id);
}
