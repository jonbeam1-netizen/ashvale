// Skill guides: a window per skill listing everything that unlocks at each level, generated from the
// registries (item requirements, recipes, gathering/thieving/agility/... data namespaces, spells, prayers,
// slayer levels on monsters, construction builds, quests that need the skill, mastery mantles).
// Opened by clicking a skill in the Skills tab (systems/progress_ui.js) or game.progress.openSkillGuide(skill).

import { el, escapeHtml, fmt } from './util.js';
import { getItemIcon, getSkillIcon, getShapeIcon } from './icons.js';
import { SKILLS, SKILL_NAMES, SKILL_GRID } from '../core/constants.js';
import { xpForLevel } from '../core/xp.js';
import {
  getItem, allItems, allRecipes, allSpells, allPrayers, allNpcs, allQuests, allData, getObject, getNpc, getData,
} from '../core/registry.js';

/** Known quest skill requirements that are only enforced in quest code (merged with def.skillRequirements). */
const QUEST_SKILL_REQS = {
  forge_heart: { mining: 30, smithing: 30 },
  moonwell_lament: { herblore: 25 },
  ember_under_mountain: { smithing: 45 },
};

/** Category order per skill (anything else is appended in first-seen order). */
const CAT_ORDER = {
  attack: ['Weapons', 'Armour & other'],
  strength: ['Weapons', 'Armour & other'],
  defence: ['Helmets', 'Body', 'Legs', 'Shields', 'Other'],
  ranged: ['Weapons', 'Ammunition', 'Armour'],
  magic: ['Combat spells', 'Teleports', 'Utility', 'Equipment'],
  prayer: ['Prayers', 'Bones', 'Equipment'],
  smithing: ['Bars', 'Weapons', 'Armour', 'Other'],
  cooking: ['Cooking', 'Preparation'],
  fletching: ['Bows', 'Arrows', 'Darts'],
  crafting: ['Leather', 'Jewellery', 'Gems', 'Pottery', 'Other'],
  herblore: ['Cleaning', 'Unfinished', 'Potions', 'Other'],
  thieving: ['Pickpocketing', 'Stalls', 'Chests & doors'],
  agility: ['Courses', 'Shortcuts', 'Equipment'],
  woodcutting: ['Trees', 'Axes'],
  mining: ['Rocks', 'Pickaxes'],
  fishing: ['Fish', 'Tools'],
  farming: ['Allotments', 'Herbs', 'Trees'],
  hunter: ['Creatures', 'Equipment'],
  slayer: ['Monsters', 'Equipment'],
  runebinding: ['Sigils'],
  firemaking: ['Logs'],
  construction: ['Seating', 'Tables', 'Bookcases', 'Stoves', 'Larders', 'Altars', 'Pools', 'Maps'],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const itemName = (id) => getItem(id)?.name || id;

/** Build [{ level, name, item?, icon?, note?, cat }] for one skill. Cached until the registries change. */
const cache = new Map();
export function guideEntries(skill) {
  if (cache.has(skill)) return cache.get(skill);
  const out = [];
  const seen = new Set();
  const add = (cat, level, name, opts = {}) => {
    level = Math.max(1, Math.round(Number(level) || 1));
    const key = `${cat}|${level}|${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ cat, level, name, ...opts });
  };

  // ---- skill-specific data sources ------------------------------------------------------------
  const tools = allData('tools').filter(([, t]) => t.skill === skill);
  switch (skill) {
    case 'woodcutting':
      for (const [id, d] of allData('woodcutting')) add('Trees', d.level, getObject(id)?.name || id, { item: d.log, note: `${d.xp} xp` });
      for (const [id, t] of tools) add('Axes', t.level, itemName(id), { item: id });
      break;
    case 'mining':
      for (const [id, d] of allData('mining')) add('Rocks', d.level, getObject(id)?.name || itemName(d.ore), { item: d.ore, note: `${d.xp} xp` });
      for (const [id, t] of tools) add('Pickaxes', t.level, itemName(id), { item: id });
      break;
    case 'fishing': {
      const fish = new Map(), gear = new Map();
      for (const [, spot] of allData('fishing')) {
        for (const [method, m] of Object.entries(spot)) {
          for (const id of [m.tool, m.bait].filter(Boolean)) {
            const lv = Math.min(...(m.catches || []).map((c) => c.level), gear.get(id)?.level ?? 99);
            gear.set(id, { level: lv, note: `${m.bait === id ? 'bait' : 'tool'} for "${method}"` });
          }
          for (const c of m.catches || []) {
            const f = fish.get(c.id) || { level: c.level, xp: c.xp, methods: new Set() };
            f.level = Math.min(f.level, c.level);
            f.methods.add(`${method}${m.tool ? ` (${itemName(m.tool)})` : ''}`);
            fish.set(c.id, f);
          }
        }
      }
      for (const [id, f] of fish) add('Fish', f.level, itemName(id), { item: id, note: `${f.xp} xp · ${[...f.methods].join(', ')}` });
      for (const [id, t] of tools) add('Tools', t.level, itemName(id), { item: id });
      for (const [id, g] of gear) if (!tools.some(([t]) => t === id)) add('Tools', g.level, itemName(id), { item: id, note: g.note });
      break;
    }
    case 'hunter':
      for (const [id, d] of allData('hunter')) {
        const loot = (d.loot || []).find((l) => l.id !== 'bones') || d.loot?.[0];
        add('Creatures', d.level, getNpc(id)?.name || id.replace(/_/g, ' '), { item: loot?.id, shape: loot ? null : 'paw', note: `${d.xp} xp · ${d.method}` });
      }
      break;
    case 'farming': {
      const cat = { allotment: 'Allotments', herb: 'Herbs', tree: 'Trees' };
      for (const [id, d] of allData('farming')) add(cat[d.type] || cap(d.type || 'Other'), d.level, d.name || itemName(id), { item: id, note: `${d.plantXp} xp planting · ${d.harvestXp} xp harvest` });
      break;
    }
    case 'agility':
      for (const [, c] of allData('agility_course')) add('Courses', c.level, c.name, { shape: 'boot', color: '#c8a060', note: `${c.lapXp} xp per lap` });
      for (const [, o] of allData('agility')) if (o.shortcut) add('Shortcuts', o.level, o.name, { shape: 'boot', color: '#7a9a6a', note: `${o.xp} xp` });
      break;
    case 'thieving':
      for (const [id, d] of allData('pickpocket')) add('Pickpocketing', d.level, getNpc(id)?.name || id.replace(/_/g, ' '), { shape: 'mask', color: '#8a7a6a', note: `${d.xp} xp` });
      for (const [id, d] of allData('thieving_stall')) add('Stalls', d.level, getObject(id)?.name || id.replace(/_/g, ' '), { item: d.loot?.[0]?.id, note: `${d.xp} xp` });
      for (const [id, d] of allData('thieving_chest')) add('Chests & doors', d.level, getObject(id)?.name || id.replace(/_/g, ' '), { shape: 'chest', item: 'coins', note: `${d.xp} xp` });
      for (const [id, d] of allData('thieving_door')) add('Chests & doors', d.level, getObject(id)?.name || 'Locked door', { shape: 'key', color: '#c8a040', note: `${d.xp} xp` });
      break;
    case 'firemaking':
      for (const [id, d] of allData('firemaking')) add('Logs', d.level, itemName(id), { item: id, note: `${d.xp} xp` });
      break;
    case 'runebinding':
      for (const [, d] of allData('runebinding')) {
        const m = d.multiples?.[0];
        add('Sigils', d.level, itemName(d.sigil), { item: d.sigil, note: `${d.xp} xp${m ? ` · double sigils at ${m}` : ''}` });
        for (const lv of (d.multiples || []).slice(0, 4)) add('Multiple sigils', lv, `${itemName(d.sigil)} (more per essence)`, { item: d.sigil });
      }
      break;
    case 'construction':
      for (const [, d] of allData('construction')) {
        const mat = Object.keys(d.materials || {})[0];
        const mats = Object.entries(d.materials || {}).map(([m, n]) => `${n} ${itemName(m)}`).join(', ');
        const cat = { seat: 'Seating', table: 'Tables', bookcase: 'Bookcases', stove: 'Stoves', larder: 'Larders', altar: 'Altars', map: 'Maps', pool: 'Pools' }[d.type] || cap(d.type || 'Other');
        add(cat, d.level, d.name, { item: mat, note: `${d.xp} xp${mats ? ` · ${mats}` : ''}` });
      }
      break;
    case 'prayer':
      for (const p of allPrayers()) add('Prayers', p.level, p.name, { shape: p.icon?.shape || 'star', color: p.icon?.color || '#f0e8a0', color2: p.icon?.color2, note: p.description });
      for (const [id, d] of allData('bones')) add('Bones', 1, itemName(id), { item: id, note: `${d.xp} xp when buried` });
      break;
    case 'magic':
      for (const s of allSpells()) {
        const cat = s.type === 'combat' ? 'Combat spells' : s.type === 'teleport' ? 'Teleports' : 'Utility';
        add(cat, s.level, s.name, { shape: s.icon?.shape || 'rune', color: s.icon?.color || '#8ad0ff', color2: s.icon?.color2, note: `${s.description || ''}${s.book && s.book !== 'standard' ? ` (${s.book} book)` : ''}`.trim() });
      }
      break;
    case 'slayer':
      for (const n of allNpcs()) if (n.slayerLevel) add('Monsters', n.slayerLevel, n.name, { shape: 'skull', color: '#d8d0c0', note: n.combatLevel ? `combat level ${n.combatLevel}` : '' });
      break;
    case 'herblore':
      for (const [id, d] of allData('herb')) add('Cleaning', d.level, itemName(d.clean || id), { item: d.clean || id, note: `${d.xp} xp` });
      break;
    default:
  }

  // ---- recipes ---------------------------------------------------------------------------------
  for (const r of allRecipes()) {
    if (r.skill !== skill) continue;
    const out0 = r.outputs?.[0];
    if (!out0) continue;
    const def = getItem(out0.id);
    let cat = cap(r.category || 'Other');
    if (skill === 'smithing') cat = r.category === 'smelt' ? 'Bars' : def?.slot === 'weapon' || def?.weaponType ? 'Weapons' : def?.slot ? 'Armour' : 'Other';
    else if (skill === 'cooking') cat = r.category === 'cook' ? 'Cooking' : 'Preparation';
    else if (skill === 'fletching') cat = { knife: 'Bows', string: 'Bows', arrow: 'Arrows', dart: 'Darts' }[r.category] || 'Other';
    else if (skill === 'crafting') cat = { leather: 'Leather', jewellery: 'Jewellery', gem: 'Gems', pottery: 'Pottery', kiln: 'Pottery' }[r.category] || 'Other';
    else if (skill === 'herblore') cat = { unf: 'Unfinished', potion: 'Potions' }[r.category] || 'Other';
    const inputs = (r.inputs || []).map((i) => `${i.qty > 1 ? `${i.qty} ` : ''}${itemName(i.id)}`).join(', ');
    add(cat, r.level, `${def?.name || out0.id}${out0.qty > 1 ? ` (x${out0.qty})` : ''}`, { item: out0.id, note: `${r.xp} xp${inputs ? ` · ${inputs}` : ''}` });
  }

  // ---- equipment requirements ---------------------------------------------------------------
  const toolIds = new Set(tools.map(([id]) => id));
  for (const it of allItems()) {
    const lv = it.requirements?.[skill];
    if (!lv || toolIds.has(it.id) || it.masterySkill) continue;
    let cat = 'Equipment';
    if (skill === 'attack' || skill === 'strength') cat = it.slot === 'weapon' ? 'Weapons' : 'Armour & other';
    else if (skill === 'defence') cat = { head: 'Helmets', body: 'Body', legs: 'Legs', shield: 'Shields' }[it.slot] || 'Other';
    else if (skill === 'ranged') cat = it.slot === 'weapon' ? 'Weapons' : it.slot === 'ammo' ? 'Ammunition' : 'Armour';
    const also = Object.entries(it.requirements).filter(([s]) => s !== skill).map(([s, l]) => `${SKILL_NAMES[s] || s} ${l}`).join(', ');
    add(cat, lv, it.name, { item: it.id, note: also ? `also needs ${also}` : '' });
  }

  // ---- quests -------------------------------------------------------------------------------------
  for (const q of allQuests()) {
    const reqs = { ...(QUEST_SKILL_REQS[q.id] || {}), ...(q.skillRequirements || {}) };
    if (reqs[skill]) add('Quests', reqs[skill], q.name, { shape: 'book', color: '#3a6ab0', note: `${q.difficulty || ''} quest`, quest: q.id });
  }

  // ---- mastery mantle -------------------------------------------------------------------------------
  const mc = getData('mastery_cape', skill);
  if (mc) add('Mastery', 99, getItem(mc.item)?.name || 'Mastery mantle', { item: mc.item, note: 'Sold by Hallmaster Corvane in Highmarch' });

  out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  cache.set(skill, out);
  return out;
}

function categoriesFor(skill, entries) {
  const order = [...(CAT_ORDER[skill] || [])];
  for (const e of entries) if (!order.includes(e.cat)) order.push(e.cat);
  // keep Quests / Mastery last
  const tail = ['Equipment', 'Quests', 'Mastery'].filter((c) => order.includes(c));
  const head = order.filter((c) => !tail.includes(c));
  return [...head, ...tail].filter((c) => entries.some((e) => e.cat === c));
}

const lastCat = {};

function iconFor(e) {
  if (e.item && getItem(e.item)) return getItemIcon(e.item);
  return getShapeIcon(e.shape || 'generic', e.color || '#c8b890', e.color2);
}

/** Open the guide window for a skill. */
export function openSkillGuide(game, skill) {
  if (!SKILLS.includes(skill)) return null;
  const ui = game.ui;
  let current = skill;
  const render = (body) => {
    body.innerHTML = '';
    const sk = game.player.skills;
    const lv = sk.getLevel(current), xp = sk.getXp(current);
    const entries = guideEntries(current);
    const cats = categoriesFor(current, entries);
    let cat = cats.includes(lastCat[current]) ? lastCat[current] : cats[0];

    // skill strip
    const strip = el('div', 'sg-strip');
    for (const s of SKILL_GRID) {
      const b = el('button', `sg-skill${s === current ? ' on' : ''}`, `<img alt="" src="${getSkillIcon(s)}">`);
      b.title = `${SKILL_NAMES[s]} (${sk.getLevel(s)})`;
      b.onclick = () => { current = s; handle.el.querySelector('.iface-head span').textContent = `${SKILL_NAMES[s]} guide`; render(body); };
      strip.appendChild(b);
    }
    body.appendChild(strip);

    const next = lv < 99 ? xpForLevel(lv + 1) : null;
    const curLvXp = xpForLevel(lv);
    const pct = next ? Math.max(0, Math.min(100, ((xp - curLvXp) / (next - curLvXp)) * 100)) : 100;
    body.appendChild(el('div', 'sg-head', `<img alt="" src="${getSkillIcon(current)}"><div class="sg-head-txt"><b>${SKILL_NAMES[current]}</b> &nbsp;Level ${lv}<br><small>${fmt(xp)} xp${next ? ` · ${fmt(next - xp)} to level ${lv + 1}` : ' · mastered'}</small></div><div class="sg-bar"><div style="width:${pct.toFixed(1)}%"></div></div>`));

    const tabs = el('div', 'sg-tabs');
    const list = el('div', 'sg-list');
    const showCat = (c) => {
      cat = c; lastCat[current] = c;
      for (const t of tabs.children) t.classList.toggle('on', t.dataset.cat === c);
      list.innerHTML = '';
      const rows = entries.filter((e) => e.cat === c);
      let markerDone = false;
      for (const e of rows) {
        if (!markerDone && e.level > lv) {
          list.appendChild(el('div', 'sg-marker', `Your level: ${lv}`));
          markerDone = true;
        }
        const r = el('div', `sg-row${e.level > lv ? ' locked' : ''}${e.level === lv ? ' cur' : ''}`,
          `<span class="sg-lv">${e.level}</span><img alt="" src="${iconFor(e)}"><span class="sg-name">${escapeHtml(e.name)}${e.note ? `<small>${escapeHtml(e.note)}</small>` : ''}</span>`);
        if (e.quest) { r.style.cursor = 'pointer'; r.onclick = () => ui.openQuestJournal(e.quest); }
        list.appendChild(r);
      }
      if (!rows.length) list.appendChild(el('div', 'muted pad', 'Nothing here.'));
      const first = list.querySelector('.sg-marker');
      list.scrollTop = first ? Math.max(0, first.offsetTop - 120) : 0;
    };
    for (const c of cats) {
      const t = el('button', 'sg-tab', escapeHtml(c));
      t.dataset.cat = c;
      t.onclick = () => showCat(c);
      tabs.appendChild(t);
    }
    body.append(tabs, list);
    if (!cats.length) {
      list.appendChild(el('div', 'muted pad', current === 'hitpoints'
        ? 'Every Hitpoints level raises your maximum life by one. Train it by fighting.'
        : 'Nothing is unlocked by this skill yet.'));
    } else showCat(cat);
  };
  const handle = ui.openInterface({ id: 'skill_guide', title: `${SKILL_NAMES[skill]} guide`, className: 'skill-guide', width: 470, render });
  return handle;
}
