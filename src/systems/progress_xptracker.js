// XP tracker overlay: session XP, XP/hour, actions and time to the next level per skill.
// Toggle: Settings > "XP tracker overlay", the small "XP" button by the XP drops, or game.progress.xpTracker.toggle().
// Session data lives in memory (resets on reload or with the Reset button); visibility is player.settings.xpTracker.

import { el, escapeHtml, fmt } from '../ui/util.js';
import { getSkillIcon } from '../ui/icons.js';
import { SKILL_NAMES } from '../core/constants.js';
import { xpForLevel } from '../core/xp.js';

const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : fmt(n));
function dur(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '-';
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 99 ? '99h+' : h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

export function initXpTracker(game) {
  const root = document.getElementById('game-root') || document.body;
  let session = { start: Date.now(), skills: new Map() }; // skill -> { first, last, gained, drops }
  let box = null, timer = null;

  const btn = el('button', '', 'XP');
  btn.id = 'xp-tracker-btn';
  btn.title = 'XP tracker';
  btn.onclick = () => api.toggle();
  root.appendChild(btn);

  game.events.on('xp', ({ player, skill, amount }) => {
    if (player !== game.player || !(amount > 0)) return;
    const now = Date.now();
    let s = session.skills.get(skill);
    if (!s) { s = { first: now, gained: 0, drops: 0 }; session.skills.set(skill, s); }
    s.gained += amount; s.drops++; s.last = now; s.lastDrop = amount;
    if (box) render();
  });

  function render() {
    if (!box) return;
    const sk = game.player.skills;
    const now = Date.now();
    const rows = [...session.skills.entries()].sort((a, b) => b[1].last - a[1].last);
    const total = rows.reduce((a, [, s]) => a + s.gained, 0);
    const elapsed = now - session.start;
    let html = `<div class="xt-head"><b>XP tracker</b><span>${dur(elapsed)}</span><button data-a="reset" title="Start a new session">Reset</button><button data-a="close" title="Hide">X</button></div>`;
    html += `<div class="xt-l" style="display:flex;justify-content:space-between"><span>Total gained</span><span>${short(total)} (${short(total / Math.max(elapsed, 30000) * 3600000)}/h)</span></div>`;
    if (!rows.length) html += '<div class="muted" style="color:#c8b890;padding:3px 0">Gain some XP to start tracking.</div>';
    for (const [skill, s] of rows) {
      const lv = sk.getLevel(skill), xp = sk.getXp(skill);
      const t = Math.max(now - s.first, 30000);
      const rate = (s.gained / t) * 3600000;
      let bar = 100, left = 0, actions = '-', ttl = '-';
      if (lv < 99) {
        const a = xpForLevel(lv), b = xpForLevel(lv + 1);
        bar = ((xp - a) / (b - a)) * 100;
        left = b - xp;
        const avg = s.gained / s.drops;
        actions = fmt(Math.ceil(left / Math.max(avg, 0.1)));
        ttl = rate > 0 ? dur((left / rate) * 3600000) : '-';
      }
      html += `<div class="xt-row"><img alt="" src="${getSkillIcon(skill)}">
        <div class="xt-l"><span>${escapeHtml(SKILL_NAMES[skill] || skill)} ${lv}</span><span>+${short(s.gained)}</span></div>
        <div class="xt-l"><span>${short(rate)}/h</span><span>${lv < 99 ? `${actions} acts · ${ttl}` : 'mastered'}</span></div>
        <div class="xt-bar"><div style="width:${bar.toFixed(1)}%"></div><span>${lv < 99 ? `${bar.toFixed(1)}% · ${short(left)} left` : '100%'}</span></div></div>`;
    }
    box.innerHTML = html;
  }

  function show(on) {
    btn.classList.toggle('on', on);
    if (on && !box) {
      box = el('div', 'xp-tracker');
      box.addEventListener('click', (e) => {
        const a = e.target.closest('button')?.dataset.a;
        if (a === 'reset') api.reset();
        else if (a === 'close') api.setVisible(false);
      });
      box.addEventListener('mousedown', (e) => e.stopPropagation());
      root.appendChild(box);
      render();
      timer = setInterval(render, 1000);
    } else if (!on && box) {
      box.remove(); box = null;
      clearInterval(timer); timer = null;
    }
  }

  const api = {
    get visible() { return !!box; },
    setVisible(on) {
      game.player.settings.xpTracker = !!on;
      show(!!on);
      game.events.emit('settings:change', { key: 'xpTracker', value: !!on });
      if (game.ui.side.current === 'settings') game.ui.refreshTab('settings');
    },
    toggle() { api.setVisible(!box); },
    reset() { session = { start: Date.now(), skills: new Map() }; render(); },
    session: () => session,
  };
  show(!!game.player.settings.xpTracker);
  return api;
}
