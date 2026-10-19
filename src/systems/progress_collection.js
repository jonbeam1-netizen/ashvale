// Collection log: unique items obtained per source (bosses, slayer monsters, rare monster drops,
// minigames, riddle-trail tiers, pets). Sources are derived from the registries the first time they are
// needed; extra sources can be registered as data:
//   registerData('collection_source', id, { cat: 'Raids', name: 'The Vault', items: [ids], kc?: [npcIds], order? })
// State: player.store('collection') = { items: { itemId: count }, kc: { npcId: kills } }.
// Item gains are seen through game.giveItem (wrapped), 'item:pickup' and 'pet:get'.

import { el, escapeHtml, fmt } from '../ui/util.js';
import { getItemIcon } from '../ui/icons.js';
import { getItem, allItems, allNpcs, allData, getData, getDropTable, getShop } from '../core/registry.js';

const CATS = ['Bosses', 'Slayer', 'Rare drops', 'Minigames', 'Riddle trails', 'Pets'];
const BOSS_MAX_CHANCE = 0.06;   // tertiary entries at or below this chance count as uniques on bosses
const RARE_MAX_CHANCE = 0.02;   // ... and on ordinary monsters

function tertiaryUniques(npc, maxChance) {
  const t = npc.dropTable && getDropTable(npc.dropTable);
  const out = [];
  for (const e of t?.tertiary || []) {
    const def = getItem(e.id);
    if (!def || def.stackable) continue;
    if (e.chance <= maxChance || def.unique === npc.id) out.push(e.id);
  }
  for (const it of allItems()) if (it.unique === npc.id && !out.includes(it.id)) out.push(it.id);
  return out;
}

let SOURCES = null;
export function buildSources() {
  if (SOURCES) return SOURCES;
  const src = [];
  const petsByNpc = new Map(), petsByEvent = new Map();
  for (const [id, p] of allData('pets')) {
    const item = `pet_${id}`;
    if (!getItem(item)) continue;
    for (const n of [].concat(p.source?.npc || [])) petsByNpc.set(n, [...(petsByNpc.get(n) || []), item]);
    if (p.source?.event) petsByEvent.set(p.source.event, [...(petsByEvent.get(p.source.event) || []), item]);
  }
  const usedNames = new Set();
  // bosses + slayer monsters
  for (const n of allNpcs()) {
    const boss = !!n.boss, slayer = !!n.slayerLevel;
    if (!boss && !slayer) continue;
    const items = [...tertiaryUniques(n, boss ? BOSS_MAX_CHANCE : RARE_MAX_CHANCE), ...(petsByNpc.get(n.id) || [])];
    if (!items.length || usedNames.has(n.name)) continue;
    usedNames.add(n.name);
    src.push({ id: `npc_${n.id}`, cat: boss ? 'Bosses' : 'Slayer', name: n.name, items, kc: [n.id], order: n.combatLevel });
  }
  // other monsters with rare drops, merged by identical item sets
  const groups = new Map();
  for (const n of allNpcs()) {
    if (n.boss || n.slayerLevel) continue;
    const items = tertiaryUniques(n, RARE_MAX_CHANCE);
    if (!items.length) continue;
    const key = [...items].sort().join(',');
    const g = groups.get(key) || { items, npcs: [] };
    g.npcs.push(n);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    g.npcs.sort((a, b) => a.combatLevel - b.combatLevel);
    const names = [...new Set(g.npcs.map((n) => n.name))];
    const name = names.length > 2 ? `${names[0]} & ${names.length - 1} more` : names.join(' & ');
    src.push({ id: `rare_${g.npcs[0].id}`, cat: 'Rare drops', name, items: g.items, kc: g.npcs.map((n) => n.id), order: g.npcs[0].combatLevel, tip: names.join(', ') });
  }
  // minigames
  const crucible = ['crucible_cape', ...(getShop('crucible_exchange')?.stock || []).map((s) => s.id), ...(petsByEvent.get('minigame:crucible') || [])].filter((id) => getItem(id));
  if (crucible.length) src.push({ id: 'mg_crucible', cat: 'Minigames', name: 'The Crucible', items: [...new Set(crucible)], order: 1 });
  const wardens = [...allItems().filter((i) => i.wardenSet).map((i) => i.id), ...(petsByEvent.get('minigame:wardens') || [])];
  if (wardens.length) src.push({ id: 'mg_wardens', cat: 'Minigames', name: "Wardens' Rest", items: wardens, order: 2 });
  // riddle trails
  const R = getData('riddles', 'config');
  (R?.TIERS || []).forEach((tier, i) => {
    const t = R.REWARDS?.[tier];
    const items = [...new Set([...(t?.rare || []), ...(t?.megaRare || [])])].filter((id) => getItem(id));
    if (items.length) src.push({ id: `riddle_${tier}`, cat: 'Riddle trails', name: `${tier[0].toUpperCase()}${tier.slice(1)} riddles`, items, order: i, riddle: tier });
  });
  // pets
  const allPets = allData('pets').map(([id]) => `pet_${id}`).filter((id) => getItem(id));
  if (allPets.length) src.push({ id: 'pets', cat: 'Pets', name: 'All pets', items: allPets, order: 0 });
  // registered extras (other modules)
  for (const [id, d] of allData('collection_source')) {
    const items = (d.items || []).filter((i) => getItem(i));
    if (items.length) src.push({ id: `x_${id}`, cat: d.cat || 'Other', name: d.name || id, items, kc: d.kc, order: d.order ?? 0 });
  }
  src.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  SOURCES = src;
  return src;
}

export function initCollection(game) {
  const st = () => {
    const s = game.player.store('collection');
    if (!s.items || typeof s.items !== 'object') s.items = {};
    if (!s.kc || typeof s.kc !== 'object') s.kc = {};
    if (!s.riddles || typeof s.riddles !== 'object') s.riddles = {};
    return s;
  };
  let tracked = null, kcNpcs = null;
  const ensure = () => {
    if (tracked) return;
    tracked = new Set(); kcNpcs = new Set();
    for (const s of buildSources()) { s.items.forEach((i) => tracked.add(i)); (s.kc || []).forEach((n) => kcNpcs.add(n)); }
  };

  function gain(id, qty = 1) {
    ensure();
    if (!tracked.has(id) || !(qty > 0)) return;
    const s = st();
    const first = !s.items[id];
    s.items[id] = (s.items[id] || 0) + qty;
    if (first) {
      const name = getItem(id)?.name || id;
      game.message(`<col=ef1020>New item added to your collection log: ${name}</col>`);
      game.events.emit('collection:new', { player: game.player, id });
    }
  }

  const origGive = game.giveItem;
  game.giveItem = function (id, qty = 1, player = this.player, ...rest) {
    const r = origGive.call(this, id, qty, player, ...rest);
    try { if (player === game.player) gain(id, qty); } catch (e) { console.error('[collection]', e); }
    return r;
  };
  game.events.on('item:pickup', ({ player, itemId, qty }) => { if (player === game.player) gain(itemId, qty || 1); });
  game.events.on('pet:get', ({ id }) => gain(`pet_${id}`, 1));
  game.events.on('npc:death', ({ npc, killer }) => {
    if (killer !== game.player || !npc?.def) return;
    ensure();
    if (kcNpcs.has(npc.def.id)) { const s = st(); s.kc[npc.def.id] = (s.kc[npc.def.id] || 0) + 1; }
  });
  game.events.on('riddle:complete', ({ tier }) => { const s = st(); s.riddles[tier] = (s.riddles[tier] || 0) + 1; });

  let lastSource = null, lastCat = CATS[0];
  function open() {
    const sources = buildSources();
    const cats = [...CATS, ...new Set(sources.map((s) => s.cat))].filter((c, i, a) => a.indexOf(c) === i && sources.some((s) => s.cat === c));
    const s = st();
    const totalItems = new Set(sources.flatMap((x) => x.items));
    const got = [...totalItems].filter((i) => s.items[i]).length;
    return game.ui.openInterface({
      id: 'collection_log', title: `Collection Log - ${got}/${totalItems.size}`, className: 'pg-win collection', width: 560,
      render: (body) => {
        const tabs = el('div', 'pg-tabs');
        const wrap = el('div', 'cl-wrap');
        const list = el('div', 'cl-sources');
        const main = el('div', 'cl-main');
        wrap.append(list, main);
        body.append(tabs, wrap);
        const showSource = (src) => {
          lastSource = src.id;
          for (const r of list.children) r.classList.toggle('on', r.dataset.id === src.id);
          const n = src.items.filter((i) => s.items[i]).length;
          const kc = (src.kc || []).reduce((a, id) => a + (s.kc[id] || 0), 0);
          const extra = src.kc?.length ? `Kills: ${fmt(kc)}` : src.riddle ? `Completed: ${fmt(s.riddles[src.riddle] || 0)}` : '';
          main.innerHTML = `<div class="cl-title">${escapeHtml(src.name)}</div><div class="muted">Obtained: <b style="color:${n === src.items.length ? '#3ae03a' : '#ffff00'}">${n}/${src.items.length}</b>${extra ? ` &nbsp;·&nbsp; ${extra}` : ''}${src.tip ? `<br><small>${escapeHtml(src.tip)}</small>` : ''}</div>`;
          const grid = el('div', 'cl-grid');
          for (const id of src.items) {
            const c = s.items[id] || 0;
            const cell = el('div', `cl-item${c ? '' : ' missing'}`, `<img alt="" src="${getItemIcon(id)}">${c > 1 ? `<span>${fmt(c)}</span>` : ''}`);
            cell.addEventListener('mousemove', (e) => game.ui.showTooltip(e.clientX, e.clientY, `<b>${escapeHtml(getItem(id)?.name || id)}</b>${c ? `<br>Obtained: ${fmt(c)}` : '<br><span class="muted">Not obtained yet</span>'}`));
            cell.addEventListener('mouseleave', () => game.ui.hideTooltip());
            grid.appendChild(cell);
          }
          main.appendChild(grid);
        };
        const showCat = (cat) => {
          lastCat = cat;
          for (const t of tabs.children) t.classList.toggle('on', t.dataset.cat === cat);
          list.innerHTML = '';
          const srcs = sources.filter((x) => x.cat === cat);
          for (const src of srcs) {
            const n = src.items.filter((i) => s.items[i]).length;
            const r = el('div', `cl-src${n === src.items.length ? ' full' : ''}`, `<span>${escapeHtml(src.name)}</span><small>${n}/${src.items.length}</small>`);
            r.dataset.id = src.id;
            r.onclick = () => showSource(src);
            list.appendChild(r);
          }
          const pick = srcs.find((x) => x.id === lastSource) || srcs[0];
          if (pick) showSource(pick); else main.innerHTML = '<div class="muted">Nothing to collect here yet.</div>';
        };
        for (const c of cats) {
          const n = sources.filter((x) => x.cat === c);
          const all = new Set(n.flatMap((x) => x.items));
          const have = [...all].filter((i) => s.items[i]).length;
          const t = el('button', 'pg-tab', `${escapeHtml(c)} <small>${have}/${all.size}</small>`);
          t.dataset.cat = c;
          t.onclick = () => showCat(c);
          tabs.appendChild(t);
        }
        showCat(cats.includes(lastCat) ? lastCat : cats[0]);
      },
      onClose: () => game.ui.hideTooltip(),
    });
  }

  return { open, gain, sources: buildSources, state: st };
}
