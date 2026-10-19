// Slayer. OWNER: agent F.
// Tasks by monster category (npc def.slayerCategory), kill tracking via 'npc:death', points + streaks,
// reward shop, slayer-level locks (def.slayerLevel) and protective gear hazards. Data: content/slayer.js.
// State: player.data.slayer = { task: {category, name, amount, remaining, master} | null, streak, points,
//                                unlocks: {id: true}, blocked: [category], completed, last }
// API: game.slayer.{ task, assign(npc|masterId), describeTask, points, addPoints, openRewards, matches(npc), master(id) }

import { getData, allData, allNpcs, getNpc, getItem } from '../core/registry.js';
import { rand } from '../core/rng.js';
import { el, escapeHtml } from '../ui/util.js';
import { getItemIcon } from '../ui/icons.js';

let game;
const st = () => {
  const s = game.player.store('slayer');
  s.streak ??= 0; s.points ??= 0; s.unlocks ??= {}; s.blocked ??= []; s.completed ??= 0;
  return s;
};
const masterIds = () => allData('slayer_master').map(([id]) => id);

function categoryNpcs(cat) { return allNpcs().filter((n) => n.slayerCategory === cat); }
function catSlayerReq(cat) {
  const lv = categoryNpcs(cat).map((n) => n.slayerLevel || 1);
  return lv.length ? Math.min(...lv) : 1;
}

function matches(npc, task = st().task) {
  if (!task || !npc?.def) return false;
  if (task.npcs?.includes(npc.id)) return true;
  return !!task.category && npc.def.slayerCategory === task.category;
}

function describeTask() {
  const t = st().task;
  if (!t || t.remaining <= 0) return "You don't have a task right now. Speak to a Slayer master for one.";
  return `You're assigned to kill ${t.name}; only ${t.remaining} more to go.`;
}

function say(npc, lines) {
  game.ui.startDialogue(lines.map((l) => (typeof l === 'string' ? { npc: l } : l)), { npc, player: game.player });
}

function assign(npcOrId) {
  const npc = typeof npcOrId === 'string' ? null : npcOrId;
  const id = npc ? npc.id : npcOrId;
  const m = getData('slayer_master', id);
  if (!m) return;
  const p = game.player, s = st();
  if (p.combatLevel < m.combatReq) {
    say(npc, [`You're too green for my assignments. Come back when your combat level is at least ${m.combatReq}.`]);
    return;
  }
  if (s.task && s.task.remaining > 0) {
    say(npc, [`You're still hunting ${s.task.name}; you have ${s.task.remaining} to go. Come back when you're done, or cancel it with points.`]);
    return;
  }
  const slv = p.skills.getLevel('slayer');
  const pool = m.tasks.filter((t) => categoryNpcs(t.category).length
    && slv >= catSlayerReq(t.category)
    && p.combatLevel >= (t.combat || 0)
    && (!t.unlock || s.unlocks[t.unlock])
    && !s.blocked.includes(t.category)
    && t.category !== s.last);
  if (!pool.length) { say(npc, ["I don't have anything suitable for you right now."]); return; }
  const total = pool.reduce((a, t) => a + (t.weight || 1), 0);
  let r = Math.random() * total, pick = pool[0];
  for (const t of pool) { r -= t.weight || 1; if (r < 0) { pick = t; break; } }
  let amount = rand.int(pick.amount[0], pick.amount[1]);
  const ext = allData('slayer_reward').find(([rid, rw]) => rw.extend === pick.category && s.unlocks[rid]);
  if (ext) amount = Math.round(amount * 1.5);
  s.task = { category: pick.category, name: pick.name, amount, remaining: amount, master: id };
  s.last = pick.category;
  game.events.emit('slayer:task', { player: p, task: s.task });
  const gear = getData('slayer_gear', pick.category);
  const lines = [`Your new task is to kill ${amount} ${pick.name}.`];
  if (gear) lines.push(`You'll want ${gear.name} for those. I sell them if you need.`);
  lines.push({ player: "Right, I'm on it." });
  say(npc, lines);
}

function completeTask(player) {
  const s = st();
  const m = getData('slayer_master', s.task.master) || { points: 2 };
  s.streak++;
  s.completed++;
  let pts = m.points;
  if (s.streak % 100 === 0) pts *= 25; else if (s.streak % 50 === 0) pts *= 15; else if (s.streak % 10 === 0) pts *= 5;
  if (s.unlocks.bounty_broker) pts = Math.round(pts * 1.25);
  s.points += pts;
  s.task.remaining = 0;
  game.message(`<col=7f0000>You've completed ${s.streak} task${s.streak > 1 ? 's' : ''} in a row and received ${pts} point${pts === 1 ? '' : 's'}; return to a Slayer master.</col>`);
  game.events.emit('slayer:complete', { player, streak: s.streak, points: pts });
}

// ---- rewards interface ---------------------------------------------------------------------------------
function openRewards() {
  game.ui.closeInterfaces();
  game.ui.openInterface({
    id: 'slayer_rewards', title: 'Slayer Rewards', width: 460, className: 'slayer-rewards',
    render: (body) => {
      const draw = () => {
        const s = st();
        body.innerHTML = '';
        body.appendChild(el('div', '', `<b>Slayer points: <span style="color:#ffcc33">${s.points}</span></b> &nbsp; Task streak: ${s.streak}${s.task?.remaining > 0 ? ` &nbsp; <span class="muted">(${escapeHtml(s.task.name)}: ${s.task.remaining} left)</span>` : ''}`));
        const list = el('div', '');
        list.style.cssText = 'max-height:340px;overflow:auto;margin-top:8px;';
        for (const [id, r] of allData('slayer_reward')) {
          const owned = r.type === 'unlock' && s.unlocks[id];
          const row = el('div', '');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 2px;border-bottom:1px solid rgba(255,255,255,0.08);';
          const icon = r.item ? `<img alt="" src="${getItemIcon(r.item, r.qty || 1)}" style="width:36px;height:32px">` : '<div style="width:36px"></div>';
          row.innerHTML = `${icon}<div style="flex:1"><b>${escapeHtml(r.name)}</b> <span class="muted">(${r.cost} pts)</span><br><span class="muted">${escapeHtml(r.description || '')}</span></div>`;
          const b = el('button', 'btn', owned ? 'Owned' : r.type === 'unlock' ? 'Unlock' : r.type === 'item' ? 'Buy' : 'Use');
          b.disabled = owned;
          b.onclick = () => { buyReward(id); draw(); };
          row.appendChild(b);
          list.appendChild(row);
        }
        body.appendChild(list);
        if (s.blocked.length) body.appendChild(el('div', 'muted', `Blocked: ${s.blocked.map(escapeHtml).join(', ')}`));
      };
      draw();
    },
  });
}

function buyReward(id) {
  const r = getData('slayer_reward', id);
  const s = st(), p = game.player;
  if (!r) return;
  if (r.type === 'unlock' && s.unlocks[id]) return;
  if (s.points < r.cost) { game.message(`You need ${r.cost} Slayer points for that.`); return; }
  if (r.type === 'item') {
    if (!getItem(r.item)) { game.message('That reward is not available.'); return; }
    if (p.inventory.capacityFor(r.item) < (r.qty || 1)) { game.message("You don't have enough inventory space."); return; }
    p.inventory.add(r.item, r.qty || 1);
  } else if (r.type === 'action') {
    if (!s.task || s.task.remaining <= 0) { game.message("You don't have a task to cancel."); return; }
    if (r.action === 'block') {
      if (s.blocked.length >= 5) { game.message('You cannot block any more tasks.'); return; }
      s.blocked.push(s.task.category);
    }
    game.message(`Your ${s.task.name} task has been ${r.action === 'block' ? 'blocked' : 'cancelled'}.`);
    s.task = null;
  } else s.unlocks[id] = true;
  s.points -= r.cost;
  if (r.type !== 'action') game.message(`You spend ${r.cost} Slayer points on ${r.name}.`);
}

// ---- init -----------------------------------------------------------------------------------------------
export function init(g) {
  game = g;
  const I = game.interactions;
  const ev = game.events;

  // masters: make sure every master NPC (incl. agent D's Warden Hollis) has the options + dialogue
  for (const id of masterIds()) {
    const def = getNpc(id);
    if (!def) continue;
    for (const o of ['Assignment', 'Trade', 'Rewards']) if (!def.options.includes(o)) def.options = [...def.options, o];
    def.shop ||= 'slayer_equipment';
    def.dialogue ||= 'slayer_master';
  }
  const face = (player, target) => { target.faceTarget = player; target.path = []; };
  I.onNpc('Assignment', masterIds(), ({ player, target }) => { face(player, target); assign(target); });
  I.onNpc('Rewards', masterIds(), ({ player, target }) => { face(player, target); openRewards(); });
  I.onNpc('Trade', masterIds(), () => { game.ui.openShop('slayer_equipment'); });
  ev.on('slayer:assign', ({ master }) => assign(master)); // legacy event (Phase 1 dialogue)

  // kill tracking
  ev.on('npc:death', ({ npc, killer }) => {
    const p = game.player;
    const k = killer || (npc.lastAttacker === p ? p : null);
    if (k !== p) return;
    const s = st();
    if (!s.task || s.task.remaining <= 0 || !matches(npc)) return;
    s.task.remaining--;
    p.skills.addXp('slayer', npc.maxHp || 1);
    if (s.task.remaining <= 0) completeTask(p);
  });

  // slayer-level locks: block the attack up front, and zero any damage that slips through
  const locked = () => new Set(allNpcs().filter((n) => n.slayerLevel > 1).map((n) => n.id));
  const lockedIds = [...locked()];
  const blockedMsg = (npc) => `You need a Slayer level of ${npc.def.slayerLevel} to know how to wound this creature.`;
  const tooLow = (p, npc) => npc?.def?.slayerLevel > p.skills.getLevel('slayer');
  if (lockedIds.length) {
    const atkOpts = I.optsFor('npc', 'Attack', '__none__', null);
    I.onNpc('Attack', lockedIds, ({ player, target }) => { if (!tooLow(player, target)) return false; game.message(blockedMsg(target)); }, atkOpts);
    const spOpts = I.optsFor('spellOnNpc', 'cast', '__none__', '__none__');
    I.onSpellOnNpc('*', lockedIds, ({ player, target, spell }) => {
      if (spell?.type !== 'combat' || !tooLow(player, target)) return false;
      game.message(blockedMsg(target));
    }, spOpts);
  }
  let lastLockMsg = 0;
  ev.on('damage:before', (e) => {
    const src = e.source, t = e.target;
    if (!src || src.type !== 'player' || t?.type !== 'npc') return;
    if (tooLow(src, t)) {
      e.amount = 0;
      src.combatTarget = null;
      if (game.tickCount - lastLockMsg > 3) { game.message(blockedMsg(t)); lastLockMsg = game.tickCount; }
      return;
    }
    if (e.amount > 0 && src.equipment.ids().head === 'slayer_visor' && matches(t)) e.amount = Math.floor(e.amount * 1.15 + 0.5);
  });

  // protective gear hazards
  game.onTick((tick) => {
    if (tick % 4) return;
    const p = game.player;
    if (p.dead) return;
    const head = p.equipment.ids();
    for (const n of game.npcsNear(p.x, p.y, 3)) {
      if (!(n.combatTarget === p || p.combatTarget === n)) continue;
      const gear = getData('slayer_gear', n.id) || getData('slayer_gear', n.def.slayerCategory);
      if (!gear || Object.values(head).some((id) => gear.items.includes(id))) continue;
      const f = gear.effect;
      game.message(`<col=8a0000>${f.message}</col>`);
      for (const sk of f.drain || []) p.skills.boost(sk, -2);
      game.applyDamage(p, rand.int(f.damage[0], f.damage[1]), { source: n, type: 'typeless', ignoresProtect: true });
      break;
    }
  }, 40);

  // slayer gem
  I.onItem('Check', ['slayer_gem'], () => game.message(describeTask()));
  I.onItem('Activate', ['slayer_gem'], () => {
    const s = st();
    const m = getData('slayer_master', s.task?.master);
    game.ui.startDialogue([
      { npc: describeTask(), name: m?.name || 'Slayer gem' },
      { npc: `You have ${s.points} Slayer point${s.points === 1 ? '' : 's'} and a streak of ${s.streak}.`, name: m?.name || 'Slayer gem' },
    ], { player: game.player });
  });

  game.slayer = {
    task: () => (st().task?.remaining > 0 ? st().task : null),
    master: (id) => getData('slayer_master', id),
    assign, describeTask, matches, openRewards,
    points: () => st().points,
    addPoints: (n) => { st().points += n; },
    state: st,
  };
}
