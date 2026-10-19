// Regional Chronicles: auto-checked achievement tasks per region and tier (data: content/diaries.js,
// namespace 'chronicle_region'). Rewards (medallion tier, lamps, coins) are claimed from the Chronicles
// window (Quests tab). Worn medallions give bonus XP in the region's skills and a region teleport.
// State: player.store('chronicles') = { done: {taskId: true}, prog: {taskId: n}, claimed: {region_tier: true}, tele: {region: {day, used}} }
// Events: 'chronicle:task' {region, tier, task}, 'chronicle:tier' {region, tier} (all tasks of a tier done).

import { el, escapeHtml, fmt } from '../ui/util.js';
import { getItemIcon } from '../ui/icons.js';
import { allData, getData, getItem, getQuest, getSpell, allRecipes } from '../core/registry.js';
import { SKILL_NAMES } from '../core/constants.js';
import { CHRONICLE_TIERS, TIER_NAMES, TIER_REWARDS } from '../content/diaries.js';

const TIER_PCT = [0, 0.02, 0.04, 0.06];
const TELE_USES = [0, 1, 3, Infinity];
const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

export function regions() {
  return allData('chronicle_region').map(([, r]) => r).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function taskText(t) {
  if (t.type === 'quest') return `Complete the quest "${getQuest(t.target)?.name || t.target}".`;
  return t.text || t.id;
}

export function initChronicles(game) {
  const st = () => {
    const s = game.player.store('chronicles');
    for (const k of ['done', 'prog', 'claimed', 'tele']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
    return s;
  };

  // index: type -> [{ region, tier, task }]
  const byType = new Map();
  for (const r of regions()) {
    for (const tier of Object.keys(r.tiers || {})) {
      for (const task of r.tiers[tier]) {
        if (!byType.has(task.type)) byType.set(task.type, []);
        byType.get(task.type).push({ region: r, tier, task });
      }
    }
  }

  const inRects = (rects, x, y) => (rects || []).some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  function locOk(entry, at = game.player) {
    const t = entry.task;
    if (!t.at) return true;
    const x = at?.x ?? game.player.x, y = at?.y ?? game.player.y;
    if (t.at === 'region') return inRects(entry.region.rects, x, y);
    const area = game.world.getArea?.(x, y);
    return list(t.at).includes(area?.id);
  }
  const tierDone = (r, tier) => (r.tiers?.[tier] || []).every((t) => st().done[t.id]);

  function complete(entry, silent = false) {
    const s = st(), t = entry.task;
    if (s.done[t.id]) return;
    s.done[t.id] = true;
    if (!silent) {
      game.message(`<col=0a7a8a>Chronicle task complete: ${taskText(t)} (${entry.region.name}, ${entry.tier})</col>`);
      game.audio?.sfx?.play?.('levelup_minor');
    }
    game.events.emit('chronicle:task', { region: entry.region.id, tier: entry.tier, task: t.id });
    if (tierDone(entry.region, entry.tier)) {
      if (!silent) game.message(`<col=c06a00>You have completed every ${entry.tier} task of the ${entry.region.name} Chronicle! Claim your reward from the Chronicles (Quests tab).</col>`);
      game.events.emit('chronicle:tier', { region: entry.region.id, tier: entry.tier });
    }
    if (win) win.refresh?.();
  }

  /** Progress a task of `type` whose predicate matches; count-based tasks accumulate. */
  function hit(type, match, { n = 1, at } = {}) {
    const entries = byType.get(type);
    if (!entries) return;
    const s = st();
    for (const e of entries) {
      if (s.done[e.task.id]) continue;
      try { if (!match(e.task) || !locOk(e, at)) continue; } catch { continue; }
      const need = e.task.count || 1;
      if (need > 1) {
        s.prog[e.task.id] = (s.prog[e.task.id] || 0) + n;
        if (s.prog[e.task.id] < need) continue;
      }
      complete(e);
    }
  }
  const tgt = (t, id) => !t.target || list(t.target).includes(id);
  const me = (p) => !p || p === game.player;

  const ev = game.events;
  ev.on('gathering:log', ({ player, log }) => me(player) && hit('chop', (t) => tgt(t, log)));
  ev.on('gathering:ore', ({ player, ore }) => me(player) && hit('mine', (t) => tgt(t, ore)));
  ev.on('gathering:fish', ({ player, fish }) => me(player) && hit('fish', (t) => tgt(t, fish)));
  ev.on('hunter:catch', ({ player, creature }) => me(player) && hit('catch', (t) => tgt(t, creature)));
  ev.on('production:make', ({ player, recipe, success, qty }) => {
    if (!me(player) || success === false || !recipe) return;
    const outs = (recipe.outputs || []).map((o) => o.id);
    hit('make', (t) => (!t.recipe || t.recipe === recipe.id) && (!t.item || outs.includes(t.item))
      && (!t.skill || t.skill === recipe.skill) && (!t.category || t.category === recipe.category), { n: qty || 1 });
  });
  ev.on('npc:death', ({ npc, killer }) => killer === game.player && hit('kill', (t) => tgt(t, npc?.def?.id), { at: npc }));
  ev.on('agility:lap', ({ player, course }) => me(player) && hit('lap', (t) => tgt(t, course)));
  ev.on('agility:obstacle', ({ player, obstacle }) => me(player) && hit('obstacle', (t) => tgt(t, obstacle)));
  ev.on('quest:complete', ({ id }) => hit('quest', (t) => t.target === id));
  ev.on('thieving:pickpocket', ({ player, npc, success }) => me(player) && success !== false && hit('pickpocket', (t) => tgt(t, npc?.def?.id), { at: npc }));
  ev.on('thieving:stall', ({ player, stall }) => me(player) && hit('stall', (t) => tgt(t, stall)));
  ev.on('thieving:chest', ({ player, chest }) => me(player) && hit('chest', (t) => tgt(t, chest)));
  ev.on('magic:cast', ({ player, spell }) => me(player) && hit('cast', (t) => tgt(t, spell?.id)));
  ev.on('area:enter', ({ area }) => area && hit('enter', (t) => tgt(t, area.id)));
  ev.on('wilderness:change', ({ level }) => hit('wild', (t) => level >= (t.level || 1)));
  ev.on('slayer:complete', ({ player }) => me(player) && hit('slayer', () => true));
  ev.on('riddle:complete', ({ tier }) => hit('riddle', (t) => tgt(t, tier)));
  ev.on('minigame:reward', ({ id }) => hit('minigame', (t) => tgt(t, id)));
  ev.on('emote', ({ player, id }) => me(player) && hit('emote', (t) => tgt(t, id)));
  ev.on('item:eat', ({ player, item }) => me(player) && hit('eat', (t) => tgt(t, item?.id)));
  ev.on('equip', ({ player, item }) => me(player) && hit('equip', (t) => tgt(t, item?.id)));
  ev.on('interaction', ({ kind, option, idA, ctx }) => {
    if (ctx?.player && ctx.player !== game.player) return;
    hit('interact', (t) => (!t.kind || t.kind === kind) && String(t.option).toLowerCase() === String(option).toLowerCase() && tgt(t, idA), { at: ctx?.target?.x != null ? ctx.target : game.player });
  });
  ev.on('levelup', ({ player }) => me(player) && checkStatic(false));

  /** Retroactive checks: completed quests, skill levels (on load and level-ups). */
  function checkStatic(silent) {
    const sk = game.player.skills;
    for (const e of byType.get('quest') || []) if (game.quests?.isComplete?.(e.task.target) || (game.player.quests?.[e.task.target] || 0) >= (getQuest(e.task.target)?.completeStage ?? 100)) complete(e, silent);
    for (const e of byType.get('level') || []) if (sk.getLevel(e.task.skill) >= e.task.level) complete(e, silent);
  }
  checkStatic(true);

  // ---- medallion perks -----------------------------------------------------------------------------
  const worn = () => getItem(game.player.equipment.get('neck')?.id)?.chronicle || null;
  let bonusing = false;
  ev.on('xp', ({ player, skill, amount }) => {
    if (bonusing || player !== game.player) return;
    const c = worn();
    if (!c) return;
    const r = getData('chronicle_region', c.region);
    if (!r?.perk?.skills?.includes(skill)) return;
    bonusing = true;
    try { player.skills.addXp(skill, amount * TIER_PCT[c.tier], { ignoreMultiplier: true }); } finally { bonusing = false; }
  });

  function teleport(itemId) {
    const c = getItem(itemId)?.chronicle;
    if (!c) return;
    const r = getData('chronicle_region', c.region);
    const p = game.player;
    if (game.world.getWildernessLevel?.(p.x, p.y) > 20) { game.message('The medallion is silent this deep in the Wilderness.'); return; }
    if (p.combatTarget && game.tickCount - (p.lastAttackedTick || -99) < 8) { game.message("You can't teleport while you're under attack."); return; }
    const s = st();
    const day = new Date().toDateString();
    const u = s.tele[c.region] && s.tele[c.region].day === day ? s.tele[c.region] : (s.tele[c.region] = { day, used: 0 });
    const max = TELE_USES[c.tier];
    if (u.used >= max) { game.message(`The medallion's charge is spent for today. (${max} use${max === 1 ? '' : 's'} a day)`); return; }
    const sp = r.town?.spell && getSpell(r.town.spell)?.teleport;
    let x = sp?.x ?? r.town?.x, y = sp?.y ?? r.town?.y;
    if (x == null) return;
    // nearest walkable tile
    if (!game.world.isWalkable(x, y)) {
      outer: for (let d = 1; d < 6; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (game.world.isWalkable(x + dx, y + dy)) { x += dx; y += dy; break outer; }
    }
    u.used++;
    game.actions.interrupt?.(p, 'teleport');
    game.playAnim(p, 'cast', 1200);
    game.spawnEffect('teleport', p, { color: 0x60e0c0 });
    game.actions.lock?.(p, 3);
    game.schedule(3, () => {
      game.teleport(p, x, y);
      game.spawnEffect('teleport', p, { color: 0x60e0c0 });
      game.message(`The medallion carries you to ${r.name}.${Number.isFinite(max) ? ` (${max - u.used} left today)` : ''}`);
    });
  }
  const ids = [];
  for (const r of regions()) for (let i = 1; i <= 3; i++) if (getItem(`chronicle_${r.id}_${i}`)) ids.push(`chronicle_${r.id}_${i}`);
  game.interactions.onItem('Teleport', ids, ({ item }) => teleport(item.id));
  game.interactions.onEquipment('Teleport', ids, ({ item }) => teleport(item.id));

  // ---- rewards ------------------------------------------------------------------------------------------
  const owns = (id) => game.player.inventory.has(id) || game.player.bank.has(id) || game.player.equipment.get('neck')?.id === id;
  function claim(region, tier) {
    const r = getData('chronicle_region', region);
    const s = st();
    const key = `${region}_${tier}`;
    if (!r || s.claimed[key] || !tierDone(r, tier)) return false;
    const idx = CHRONICLE_TIERS.indexOf(tier) + 1;
    const rew = TIER_REWARDS[tier] || {};
    const free = game.player.inventory.freeSlots();
    const need = 1 + (rew.lamps || []).reduce((a, [, n]) => a + n, 0) + (rew.coins && !game.player.inventory.has('coins') ? 1 : 0);
    if (free < need) { game.message(`You need ${need} free inventory slots to claim this reward.`); return false; }
    s.claimed[key] = true;
    // swap a lower medallion of this region for the new one
    for (let i = 1; i < idx; i++) {
      const lower = `chronicle_${region}_${i}`;
      if (game.player.inventory.has(lower)) game.player.inventory.remove(lower, 1);
      else if (game.player.equipment.get('neck')?.id === lower) game.player.equipment.set('neck', null);
    }
    game.giveItem(`chronicle_${region}_${idx}`, 1);
    for (const [id, n] of rew.lamps || []) if (getItem(id)) game.giveItem(id, n);
    if (rew.coins) game.giveItem('coins', rew.coins);
    game.spawnEffect('levelup', game.player);
    game.message(`<col=c06a00>You claim the ${tier} ${r.name} Chronicle reward: ${getItem(`chronicle_${region}_${idx}`)?.name || 'a medallion'}${rew.coins ? `, ${fmt(rew.coins)} coins` : ''}${(rew.lamps || []).length ? ' and XP lamps' : ''}.</col>`);
    game.events.emit('chronicle:claim', { region, tier });
    return true;
  }
  function reclaim(region) {
    const s = st();
    let best = 0;
    CHRONICLE_TIERS.forEach((t, i) => { if (s.claimed[`${region}_${t}`]) best = i + 1; });
    if (!best) return;
    const id = `chronicle_${region}_${best}`;
    if (owns(id)) { game.message('You already have that medallion.'); return; }
    if (game.player.inventory.isFull()) { game.message("You don't have enough inventory space."); return; }
    game.giveItem(id, 1);
    game.message('The Chronicle keepers send you a replacement medallion.');
  }

  // ---- window -----------------------------------------------------------------------------------------------
  let win = null, selRegion = null, selTier = 'easy';
  function open(regionId) {
    const regs = regions();
    if (regionId) selRegion = regionId;
    if (!regs.some((r) => r.id === selRegion)) selRegion = regs[0]?.id;
    const handle = game.ui.openInterface({
      id: 'chronicles', title: 'Regional Chronicles', className: 'pg-win chronicles', width: 520,
      render: (body) => {
        const draw = () => {
          const s = st();
          body.innerHTML = '';
          const rtabs = el('div', 'ch-regions');
          let allDone = 0, allTotal = 0;
          for (const r of regs) {
            const tasks = Object.values(r.tiers || {}).flat();
            const d = tasks.filter((t) => s.done[t.id]).length;
            allDone += d; allTotal += tasks.length;
            const b = el('button', `pg-tab${r.id === selRegion ? ' on' : ''}`, `${escapeHtml(r.name)} <small>${d}/${tasks.length}</small>`);
            b.onclick = () => { selRegion = r.id; draw(); };
            rtabs.appendChild(b);
          }
          body.appendChild(rtabs);
          const r = regs.find((x) => x.id === selRegion);
          if (!r) { body.appendChild(el('div', 'muted', 'No chronicles registered.')); return; }
          const ttabs = el('div', 'ch-tiers');
          for (const tier of CHRONICLE_TIERS) {
            const tasks = r.tiers?.[tier] || [];
            const d = tasks.filter((t) => s.done[t.id]).length;
            const claimed = s.claimed[`${r.id}_${tier}`];
            const b = el('button', `pg-tab${tier === selTier ? ' on' : ''}`, `${tier[0].toUpperCase()}${tier.slice(1)} <small>${claimed ? 'claimed' : `${d}/${tasks.length}`}</small>`);
            b.style.color = claimed ? '#3ae03a' : d === tasks.length ? '#ffff00' : '';
            b.onclick = () => { selTier = tier; draw(); };
            ttabs.appendChild(b);
          }
          body.appendChild(ttabs);
          const lst = el('div', 'ch-list');
          for (const t of r.tiers?.[selTier] || []) {
            const done = !!s.done[t.id];
            const need = t.count || 1;
            const prog = need > 1 && !done ? ` <small>(${Math.min(s.prog[t.id] || 0, need)}/${need})</small>` : '';
            lst.appendChild(el('div', `ch-task${done ? ' done' : ''}`, `${escapeHtml(taskText(t))}${prog}`));
          }
          body.appendChild(lst);
          const idx = CHRONICLE_TIERS.indexOf(selTier) + 1;
          const med = `chronicle_${r.id}_${idx}`;
          const rew = TIER_REWARDS[selTier] || {};
          const lampTxt = (rew.lamps || []).map(([id, n]) => `${n} x ${getItem(id)?.name || id}`).join(', ');
          const foot = el('div', 'ch-foot', `<img alt="" src="${getItemIcon(med)}" style="width:36px;height:32px"><div class="muted"><b style="color:#ffde72">${escapeHtml(getItem(med)?.name || '')}</b><br><small>+${idx * 2}% ${escapeHtml(r.perk?.text || '')} while worn; region teleport ${idx === 3 ? 'unlimited' : idx === 1 ? 'once a day' : '3 times a day'}.<br>Also: ${escapeHtml(lampTxt)}${rew.coins ? `, ${fmt(rew.coins)} coins` : ''}.</small></div>`);
          const key = `${r.id}_${selTier}`;
          if (s.claimed[key]) {
            const rb = el('button', 'btn', 'Reclaim medallion');
            rb.onclick = () => reclaim(r.id);
            foot.appendChild(rb);
          } else {
            const cb = el('button', 'btn', 'Claim reward');
            const ok = tierDone(r, selTier);
            cb.disabled = !ok;
            if (!ok) cb.style.opacity = '0.5';
            cb.onclick = () => { if (claim(r.id, selTier)) draw(); };
            foot.appendChild(cb);
          }
          body.appendChild(foot);
          body.appendChild(el('div', 'ch-sum', `<small>All regions: ${allDone}/${allTotal} tasks · Tasks complete automatically as you play.</small>`));
        };
        draw();
        win = { refresh: draw };
      },
      onClose: () => { win = null; },
    });
    return handle;
  }

  /** Dev check: report task targets that don't exist in the registries. */
  function validate() {
    const bad = [];
    const recipes = new Set(allRecipes().map((r) => r.id));
    for (const r of regions()) for (const [tier, tasks] of Object.entries(r.tiers || {})) for (const t of tasks) {
      const ids = list(t.target);
      const chk = {
        chop: (i) => getItem(i), mine: (i) => getItem(i), fish: (i) => getItem(i), quest: (i) => getQuest(i),
        cast: (i) => getSpell(i), kill: (i) => game.registry.getNpc(i), pickpocket: (i) => game.registry.getNpc(i),
        lap: (i) => getData('agility_course', i), obstacle: (i) => getData('agility', i), stall: (i) => getData('thieving_stall', i),
        chest: (i) => getData('thieving_chest', i), catch: (i) => getData('hunter', i),
        enter: (i) => game.registry.allAreas().some((a) => a.id === i),
      }[t.type];
      if (chk) for (const i of ids) if (!chk(i)) bad.push(`${r.id}/${tier}/${t.id}: ${t.type} ${i}`);
      if (t.type === 'make') {
        if (t.item && !getItem(t.item)) bad.push(`${t.id}: item ${t.item}`);
        if (t.recipe && !recipes.has(t.recipe) && !/^(bind|burn|build)_/.test(t.recipe)) bad.push(`${t.id}: recipe ${t.recipe}`);
        if (t.item && !allRecipes().some((x) => x.outputs?.some((o) => o.id === t.item))) bad.push(`${t.id}: no recipe makes ${t.item}`);
      }
      if (t.type === 'level' && !SKILL_NAMES[t.skill]) bad.push(`${t.id}: skill ${t.skill}`);
    }
    return bad;
  }

  return { open, claim, reclaim, validate, state: st, regions, teleport, checkStatic };
}
