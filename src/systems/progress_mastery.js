// Level-up polish: Hall of Mastery (mastery mantles, content/mastery.js), level-99 and total-level
// milestone messages, and the local hiscores panel (own skills + session players' totals from snapshots).

import { el, escapeHtml, fmt } from '../ui/util.js';
import { getItemIcon, getSkillIcon } from '../ui/icons.js';
import { SKILLS, SKILL_GRID, SKILL_NAMES } from '../core/constants.js';
import { getItem, getData, allQuests } from '../core/registry.js';
import { MASTERY_PRICE, MASTERY_MAX_PRICE } from '../content/mastery.js';

const MILESTONES = [100, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2100, 2200, SKILLS.length * 99];

export function initMastery(game, P) {
  const p = () => game.player;
  const store = () => p().store('progress');
  const total = () => p().skills.totalLevel();
  if (!(store().lastTotal > 0)) store().lastTotal = total();

  function banner(html) {
    const b = el('div', 'levelup milestone-banner', html);
    (document.getElementById('game-root') || document.body).appendChild(b);
    setTimeout(() => b.classList.add('fade'), 4200);
    setTimeout(() => b.remove(), 5000);
  }

  game.events.on('levelup', ({ player, skill, level }) => {
    if (player !== game.player) return;
    const s = store();
    const prev = s.lastTotal || total() - 1, now = total();
    s.lastTotal = now;
    if (level >= 99) {
      const mc = getData('mastery_cape', skill);
      game.message(`<col=7a2aa0>You have mastered ${SKILL_NAMES[skill]}! Hallmaster Corvane in Highmarch will sell you the ${getItem(mc?.item)?.name || 'mastery mantle'}.</col>`);
      if (SKILLS.every((k) => player.skills.getLevel(k) >= 99)) game.message('<col=7a2aa0>Every skill mastered! The Mantle of Ascendancy awaits you in the Hall of Mastery.</col>');
    }
    for (const m of MILESTONES) {
      if (prev < m && now >= m) {
        game.message(`<col=7a2aa0>Well done! You have reached a total level of ${fmt(m)}.</col>`);
        setTimeout(() => banner(`<img alt="" src="${getSkillIcon(skill)}"><div><b>Milestone reached!</b><br>Your total level is now ${fmt(now)}.</div>`), 1200);
        game.spawnEffect('sparkle', player, { color: 0xd080ff });
      }
    }
  });

  // multiplayer: share total level in the snapshot
  game.events.on('snapshot', ({ player, snap }) => { if (player === game.player) snap.totalLevel = total(); });

  // ---- Hall of Mastery ------------------------------------------------------------------------------
  const capeIds = [...SKILLS.map((s) => getData('mastery_cape', s)?.item).filter(Boolean), 'mastery_cape_max'];
  const owns = (id) => p().inventory.has(id) || p().bank.has(id) || p().equipment.has?.(id);

  function buy(id) {
    const def = getItem(id);
    if (!def) return false;
    const price = id === 'mastery_cape_max' ? MASTERY_MAX_PRICE : MASTERY_PRICE;
    const missing = Object.entries(def.requirements || {}).filter(([s, l]) => p().skills.getLevel(s) < l);
    if (missing.length) { game.message(`You need level 99 in ${missing.map(([s]) => SKILL_NAMES[s]).join(', ')} to buy that.`); return false; }
    if (!p().inventory.has('coins', price)) { game.message(`You need ${fmt(price)} coins to buy the ${def.name}.`); return false; }
    if (p().inventory.freeSlots() < 1) { game.message("You don't have enough inventory space."); return false; }
    p().inventory.remove('coins', price);
    game.giveItem(id, 1);
    game.message(`<col=7a2aa0>Hallmaster Corvane hands you the ${def.name}. "Wear it well."</col>`);
    game.spawnEffect('sparkle', p(), { color: 0xffe080 });
    return true;
  }

  function openMasteryHall() {
    return game.ui.openInterface({
      id: 'mastery_hall', title: 'Hall of Mastery', className: 'pg-win mastery', width: 520,
      render: (body) => {
        const draw = () => {
          body.innerHTML = `<div class="muted">Mastery mantles cost ${fmt(MASTERY_PRICE)} coins and need level 99 in their skill. You have ${fmt(p().inventory.count('coins'))} coins.</div>`;
          const grid = el('div', 'mh-grid');
          const skills = [...SKILL_GRID.filter((s) => SKILLS.includes(s)), ...SKILLS.filter((s) => !SKILL_GRID.includes(s))];
          const rows = skills.map((s) => [s, getData('mastery_cape', s)?.item]).filter(([, id]) => id);
          rows.push(['all', 'mastery_cape_max']);
          for (const [s, id] of rows) {
            const def = getItem(id);
            const lv = s === 'all' ? total() : p().skills.getLevel(s);
            const ok = s === 'all' ? SKILLS.every((k) => p().skills.getLevel(k) >= 99) : lv >= 99;
            const price = s === 'all' ? MASTERY_MAX_PRICE : MASTERY_PRICE;
            const c = el('div', `mh-cape${ok ? '' : ' locked'}`, `<img alt="" src="${getItemIcon(id)}"><div>${escapeHtml(def.name)}<small>${s === 'all' ? `Total level ${fmt(lv)} / ${SKILLS.length * 99}` : `${SKILL_NAMES[s]} ${lv}/99`}${owns(id) ? ' · owned' : ''}</small></div>`);
            const b = el('button', 'btn', `${s === 'all' ? '990k' : '99k'}`);
            b.title = `Buy for ${fmt(price)} coins`;
            if (!ok) b.disabled = true;
            b.onclick = () => { if (buy(id)) draw(); };
            c.appendChild(b);
            c.addEventListener('mousemove', (e) => game.ui.showTooltip(e.clientX, e.clientY, `<b>${escapeHtml(def.name)}</b><br>${escapeHtml(def.examine || '')}`));
            c.addEventListener('mouseleave', () => game.ui.hideTooltip());
            grid.appendChild(c);
          }
          body.appendChild(grid);
        };
        draw();
      },
      onClose: () => game.ui.hideTooltip(),
    });
  }
  game.interactions.onNpc('Trade', ['mastery_keeper'], () => openMasteryHall());
  game.interactions.onEquipment('Flourish', capeIds, ({ player, def }) => {
    game.playAnim(player, 'cast', 1400);
    game.spawnEffect('levelup', player);
    game.say(player, def.masterySkill === 'all' ? 'Master of all!' : `Master of ${SKILL_NAMES[def.masterySkill]}!`, { chat: false });
  });

  // ---- hiscores ---------------------------------------------------------------------------------------------
  function openHiscores() {
    return game.ui.openInterface({
      id: 'hiscores', title: 'Hiscores', className: 'pg-win hiscores', width: 520,
      render: (body) => {
        const sk = p().skills;
        const rows = SKILLS.map((s) => ({ s, lv: sk.getLevel(s), xp: sk.getXp(s) }));
        const totXp = rows.reduce((a, r) => a + r.xp, 0);
        let html = `<div class="hs-cols"><div><table class="hs-table"><tr><th>Skill</th><th>Level</th><th>XP</th></tr>`;
        for (const r of [...rows].sort((a, b) => b.xp - a.xp)) {
          html += `<tr class="${r.lv >= 99 ? 'max' : ''}"><td><img alt="" src="${getSkillIcon(r.s)}">${SKILL_NAMES[r.s]}</td><td>${r.lv}</td><td>${fmt(r.xp)}</td></tr>`;
        }
        html += `<tr><th>Overall</th><th>${fmt(sk.totalLevel())}</th><th>${fmt(totXp)}</th></tr></table></div><div>`;
        const qp = allQuests().reduce((a, q) => a + ((p().quests[q.id] || 0) >= q.completeStage ? q.questPoints || 0 : 0), 0);
        const qDone = allQuests().filter((q) => (p().quests[q.id] || 0) >= q.completeStage).length;
        const ch = P.chronicles?.state();
        const chDone = ch ? Object.keys(ch.done).length : 0;
        const chTotal = P.chronicles ? P.chronicles.regions().reduce((a, r) => a + Object.values(r.tiers || {}).flat().length, 0) : 0;
        const col = P.collection?.state();
        const colTotal = P.collection ? new Set(P.collection.sources().flatMap((x) => x.items)).size : 0;
        const colHave = col ? Object.keys(col.items).filter((k) => col.items[k] > 0).length : 0;
        const ninety9 = rows.filter((r) => r.lv >= 99).length;
        html += `<table class="hs-table"><tr><th>${escapeHtml(p().name)}</th><th></th></tr>
          <tr><td>Combat level</td><td>${sk.combatLevel()}</td></tr>
          <tr><td>Total level</td><td>${fmt(sk.totalLevel())}</td></tr>
          <tr><td>Skills mastered</td><td>${ninety9}/${SKILLS.length}</td></tr>
          <tr><td>Quest points</td><td>${qp} (${qDone}/${allQuests().length})</td></tr>
          <tr><td>Chronicle tasks</td><td>${chDone}/${chTotal}</td></tr>
          <tr><td>Collection log</td><td>${colHave}/${colTotal}</td></tr>
          <tr><td>Time played</td><td>${fmt(Math.floor((p().playTime * 0.6) / 3600))}h ${Math.floor(((p().playTime * 0.6) % 3600) / 60)}m</td></tr></table>`;
        const others = [...(game.remotePlayers?.values() || [])];
        html += '<br><table class="hs-table"><tr><th>Players in session</th><th>Total</th><th>Combat</th></tr>';
        const list = [{ name: p().name, total: sk.totalLevel(), cb: sk.combatLevel(), me: true },
          ...others.map((r) => ({ name: r.name || 'Player', total: r.extra?.totalLevel, cb: r.combatLevel ?? r.extra?.combatLevel }))];
        list.sort((a, b) => (b.total || 0) - (a.total || 0));
        list.forEach((r, i) => { html += `<tr${r.me ? ' style="color:#fff"' : ''}><td>${i + 1}. ${escapeHtml(r.name)}</td><td>${r.total != null ? fmt(r.total) : '?'}</td><td>${r.cb ?? '?'}</td></tr>`; });
        if (!others.length) html += '<tr><td colspan="3" class="muted">Play together (Friends tab) to compare.</td></tr>';
        html += '</table></div></div>';
        body.innerHTML = html;
      },
    });
  }

  return { openMasteryHall, openHiscores, buy };
}
