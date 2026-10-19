// Game -> audio wiring. Listens to engine events (ARCHITECTURE §9) and watches entity animations near the
// listener, so sounds also play for NPCs and other players (their animations arrive through game.playAnim
// and entity.loopAnim, which the multiplayer layer replays too).
//
// Polling is cheap: a list of nearby characters is rebuilt every 500 ms, and each animation frame only
// compares a few object references against a WeakMap (30 Hz).

import { allSpells, getWeaponType } from '../core/registry.js';
import { themeAt } from './themes.js';

const NEAR = 15;              // tiles: characters whose animations we listen to
const THEME_CHECK_MS = 1500;

// looping skilling animations -> [sound, period s, first-hit offset s, volume]
const LOOPS = {
  chop: ['chop', 1.2, 0.55, 0.9],
  mine: ['mine', 1.2, 0.62, 0.9],
  smith: ['anvil', 0.6, 0.3, 0.7],
  cook: ['sizzle', 1.8, 0.4, 0.8],
  fish: ['fish_cast', 3.2, 0.6, 0.7],
  fletch: ['fletch', 1.2, 0.4, 0.8],
  craft: ['craft', 1.6, 0.5, 0.7],
  herblore: ['herb', 1.6, 0.5, 0.7],
  balance: ['balance', 1.1, 0.3, 0.6],
  climb: ['ladder', 0.9, 0.2, 0.5],
};
const SWING = { slash: 'slash', stab: 'stab', crush: 'crush', punch: 'punch' };

const SURFACE = {
  grass: 'grass', dark_grass: 'grass', wild_grass: 'grass', flowers: 'grass', glade_grass: 'grass', farmland: 'dirt',
  moss: 'grass', heath: 'grass', dirt: 'dirt', ash: 'dirt', ditch: 'dirt', cracked_earth: 'dirt', scorched: 'dirt', bone_ground: 'dirt',
  mud: 'wet', swamp: 'wet', sand: 'sand', red_sand: 'sand', snow: 'snow', ice: 'snow', wood_floor: 'wood',
  stone: 'stone', cobble: 'stone', stone_floor: 'stone', cave_floor: 'stone', crypt_floor: 'stone', sewer_floor: 'wet',
  sandstone_floor: 'stone', dark_stone: 'stone', obsidian: 'stone', gravel: 'sand', wet_rock: 'stone',
};

export function wireHooks(game, A) {
  const ev = game.events;
  const sfx = A.sfx;
  const play = (name, at, o) => sfx.play(name, at, o);
  const isMe = (e) => e === game.player;

  // ---- per-entity memory ----------------------------------------------------------------------------
  const seenAnim = new WeakMap();     // entity -> last anim object handled
  const loopState = new WeakMap();    // entity -> { anim, next }
  const npcAttackType = new WeakMap();
  const lastElement = new WeakMap();
  let near = [];
  let nearAt = 0;

  const rebuildNear = () => {
    const p = game.player;
    near = p ? [p] : [];
    if (!p) return;
    for (const n of game.npcs.values()) if (!n.dead && Math.abs(n.x - p.x) <= NEAR && Math.abs(n.y - p.y) <= NEAR) near.push(n);
    for (const rp of game.remotePlayers?.values?.() || []) if (Math.abs(rp.x - p.x) <= NEAR && Math.abs(rp.y - p.y) <= NEAR) near.push(rp);
  };

  const playerStyle = () => {
    try {
      const p = game.player;
      const wt = getWeaponType(p.equipment.weaponType?.() || 'unarmed');
      const t = wt?.styles?.[p.combatStyle]?.type;
      return SWING[t] ? t : null;
    } catch { return null; }
  };
  const styleOf = (src) => {
    if (!src) return 'slash';
    if (isMe(src)) return playerStyle() || SWING[src.anim?.name] || 'slash';
    return SWING[npcAttackType.get(src)] || SWING[src.anim?.name] || 'slash';
  };

  // ---- animation polling (one-shots + skilling loops) -------------------------------------------------
  let wasForced = false;
  const onAnim = (e, name) => {
    if (SWING[name]) { play('swing', e, { style: isMe(e) ? playerStyle() || name : name, vol: isMe(e) ? 1 : 0.8, key: `sw${e.uid ?? ''}` }); return; }
    switch (name) {
      case 'cast': play('cast', e, { key: `cast${e.uid ?? ''}` }); break;
      case 'eat': play('eat', e); break;
      case 'drink': play('drink', e); break;
      case 'bury': play('bury', e); break;
      case 'climb': play('ladder', e); break;
      case 'death': play(isMe(e) ? 'death_player' : 'death_npc', e, { priority: isMe(e) ? 2 : 0, key: `d${e.uid ?? ''}` }); break;
      default: break;
    }
  };

  const frame = () => {
    if (!A.ready) return;
    const ms = performance.now();
    if (ms - nearAt > 500) { nearAt = ms; rebuildNear(); }
    const now = A.ctx.currentTime;
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      const an = e.anim;
      if (an && seenAnim.get(e) !== an) {
        seenAnim.set(e, an);
        if (ms - (an.start || ms) < 400) onAnim(e, an.name);
      }
      const la = e.loopAnim;
      let ls = loopState.get(e);
      if (la && LOOPS[la]) {
        if (!ls || ls.anim !== la) { ls = { anim: la, next: now + LOOPS[la][2] }; loopState.set(e, ls); }
        if (now >= ls.next) {
          const [snd0, period, , vol] = LOOPS[la];
          let snd = snd0, per = period;
          if (la === 'cook' && isMe(e) && /smelt/.test(e.action?.name || '')) { snd = 'furnace'; per = 2.4; }
          play(snd, e, { vol, key: `${snd}${e.uid ?? ''}` });
          ls.next = Math.max(ls.next + per, now + per * 0.5);
        }
      } else if (ls) loopState.delete(e);
    }
    // agility: the obstacle run starts when the player becomes force-walked
    const p = game.player;
    if (p) {
      if (p.forced && !wasForced && !p.loopAnim) play('jump', p);
      wasForced = !!p.forced;
    }
  };
  setInterval(frame, 33); // a timer, not rAF: keeps working when the page is visible but not painting

  // ---- region music / ambience --------------------------------------------------------------------
  let theme = null, pending = null, pendingN = 0;
  const applyTheme = (id, quick) => {
    theme = id;
    A.music.setTheme(id, quick);
    A.amb.setTheme(id);
    if (A.ctx) A.sfxSend.gain.setTargetAtTime(id === 'dungeon' ? 0.32 : 0.06, A.ctx.currentTime, 0.5);
  };
  const checkTheme = (force = false, quick = false) => {
    const p = game.player;
    if (!p || !game.world) return;
    let id;
    try { id = themeAt(game, p.x, p.y); } catch { return; }
    if (id === theme) { pending = null; return; }
    // area changes switch at once; terrain-mood drift must persist for two checks
    if (force || id === pending && ++pendingN >= 2) { pending = null; applyTheme(id, quick); }
    else if (id !== pending) { pending = id; pendingN = 1; }
  };
  ev.on('area:enter', () => checkTheme(true));
  ev.on('wilderness:change', () => checkTheme(true));
  ev.on('teleport', ({ entity }) => { if (isMe(entity)) setTimeout(() => checkTheme(true, true), 50); });
  ev.on('game:ready', () => checkTheme(true, true));
  setInterval(() => checkTheme(false), THEME_CHECK_MS);
  // music theme must also be applied once the AudioContext exists (first gesture)
  const kick = () => { if (A.ctx && theme) applyTheme(theme, true); };
  A.onUi(kick);

  // optional day/night clock
  ev.on('time:phase', (e) => A.amb.setNight(/night|dusk|evening/i.test(e?.phase || '')));

  // ---- combat intensity layer ---------------------------------------------------------------------
  ev.on('tick', () => {
    const p = game.player;
    if (!p || !A.ready) return;
    const foe = p.combatTarget || ((game.tickCount - (p.lastAttackedTick || -99)) < 8 ? p.lastAttacker : null);
    let lvl = 0;
    if (foe && !foe.dead) {
      const pc = p.skills?.combatLevel?.() || 3;
      const fc = foe.def?.combatLevel ?? foe.combatLevel ?? 0;
      if (foe.type === 'remote' || foe.def?.boss || fc >= Math.max(25, pc * 0.8)) lvl = 1;
    }
    A.music.setCombat(lvl);
  });

  // ---- footsteps ------------------------------------------------------------------------------------
  ev.on('player:move', ({ player }) => {
    if (!A.ready || !A.settings.footsteps || player.forced || player.teleported) return;
    const tiles = Math.max(1, (player.steps?.length || 2) - 1);
    const w = game.world;
    const tid = w.terrainAt(player.x, player.y)?.id;
    const surface = SURFACE[tid] || 'grass';
    const n = tiles >= 2 ? 3 : 2, gap = (game.config?.tickMs || 600) / 1000 / n;
    for (let i = 0; i < n; i++) play('step', null, { surface, delay: i * gap, vol: tiles >= 2 ? 0.9 : 0.75, minGap: 0.05 });
  });

  // ---- combat ---------------------------------------------------------------------------------------
  ev.on('npc:attack', ({ npc, attack }) => { if (attack?.type) npcAttackType.set(npc, attack.type); });

  ev.on('damage', ({ target, amount, source, type, splat }) => {
    if (!A.ready || !target) return;
    const o = { key: `dmg${target.uid ?? ''}`, minGap: 0.03 };
    if (splat === 'poison' || splat === 'venom' || type === 'poison') play('poison', target, o);
    // melee damage lands the instant the swing starts: delay the impact to the swing's follow-through
    else if (type === 'melee') play(amount > 0 ? 'hit' : 'block', target, { ...o, style: styleOf(source), delay: 0.2 });
    else if (type === 'ranged') play(amount > 0 ? 'arrow_hit' : 'arrow_miss', target, o);
    else if (type === 'magic') play('impact', target, { ...o, element: lastElement.get(source) || 'other' });
    if (isMe(target) && amount > 0) play('hitsplat', target, { delay: type === 'melee' ? 0.22 : 0.02 });
  });

  let elemByColor = null;
  const elementOf = (color) => {
    if (!elemByColor) {
      elemByColor = new Map();
      try { for (const s of allSpells()) if (s.element && s.projectile != null) elemByColor.set(s.projectile, s.element); } catch { /* registry */ }
    }
    if (elemByColor.has(color)) return elemByColor.get(color);
    const c = typeof color === 'number' ? color : 0xffffff;
    const rr = (c >> 16) & 255, gg = (c >> 8) & 255, bb = c & 255;
    const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
    if (mx - mn < 40) return 'wind';
    if (rr === mx && gg < rr * 0.7) return 'fire';
    if (bb === mx) return 'water';
    if (gg === mx && rr > bb) return 'earth';
    return 'other';
  };

  ev.on('effect', (e) => {
    if (!A.ready) return;
    const at = e.at;
    switch (e.kind) {
      case 'projectile': {
        const anim = at?.anim?.name;
        const magic = anim === 'cast' || (anim !== 'shoot' && (e.size ?? 0) >= 0.1);
        if (magic) {
          const el = elementOf(e.color);
          if (at) lastElement.set(at, el);
          play('spell', at, { element: el, key: `sp${at?.uid ?? ''}` });
        } else play(anim === 'shoot' ? 'bow' : 'throw', at, { key: `rg${at?.uid ?? ''}` });
        break;
      }
      case 'teleport': play('teleport', at, { priority: 1 }); break;
      case 'splash': if (e.color === 0x6aa8ff) play('splash', at); break;
      default: break;
    }
  });

  // ---- skills, items, world -----------------------------------------------------------------------
  ev.on('levelup', ({ player }) => { if (isMe(player)) sfx.jingle('levelup', 2.4); });
  ev.on('quest:complete', () => sfx.jingle('quest', 3.2));

  let prayers = game.player?.activePrayers?.size || 0;
  ev.on('prayer:change', ({ player }) => {
    if (!isMe(player)) return;
    const n = player.activePrayers?.size || 0;
    if (n > prayers) play('prayer_on', null, { minGap: 0.08 });
    else if (n < prayers) play('prayer_off', null, { minGap: 0.08 });
    prayers = n;
  });

  ev.on('item:drop', ({ player }) => { if (isMe(player)) play('drop'); });
  ev.on('item:pickup', ({ player, itemId }) => { if (isMe(player)) play(itemId === 'coins' ? 'coins' : 'pickup', null, { n: 4 }); });

  let coins = null;
  ev.on('inventory:change', ({ player }) => {
    if (!isMe(player)) return;
    const c = player.inventory.count('coins');
    if (coins !== null && c !== coins && game.ui?.shopOpen) play('coins', null, { n: c > coins ? 5 : 3, minGap: 0.15 });
    coins = c;
  });

  ev.on('ui:open', ({ id }) => {
    if (id === 'bank') play('bank_open', null, { priority: 1 });
    else if (id === 'shop') play('shop_open', null, { priority: 1 });
  });

  ev.on('gathering:fish', ({ player }) => play('fish_catch', player));
  ev.on('object:deplete', ({ object }) => {
    const id = object?.id || '';
    if (/tree|oak|willow|yew|maple|pine|birch/.test(id) || object?.def?.options?.some?.((s) => /chop/i.test(s))) play('tree_fall', object);
    else if (/rock|ore|vein|seam|deposit/.test(id) || object?.def?.options?.some?.((s) => /mine/i.test(s))) play('rock_deplete', object);
  });
  ev.on('object:change', ({ object }) => {
    const d = object?.def;
    if (d && (d.openId || d.closedId) && !/gate_wild/.test(d.id)) play('door', object, { minGap: 0.2 });
  });

  ev.on('production:make', ({ player, recipe, success }) => {
    if (!isMe(player) || !recipe) return;
    switch (recipe.skill) {
      case 'firemaking': play('fire_light', player); break;
      case 'runebinding': play('rune', player); break;
      case 'construction': play('build', player); break;
      case 'herblore': play('herb', player); break;
      case 'cooking': if (!success) play('crackle', player); break;
      default: break;
    }
  });

  ev.on('thieving:pickpocket', ({ player, success }) => play(success ? 'steal' : 'stun', player, { priority: 1 }));
  ev.on('thieving:stall', ({ player }) => play('steal', player));
  ev.on('thieving:chest', ({ player }) => play('coins', player, { n: 6 }));
  ev.on('thieving:caught', ({ player }) => play('caught', player, { priority: 1 }));
  ev.on('hunter:catch', ({ player }) => play('trap', player));
  ev.on('agility:obstacle', ({ player }) => play('land', player));
  ev.on('agility:fail', ({ player }) => play('fall', player, { priority: 1 }));

  ev.on('chat', ({ type }) => {
    if (type === 'trade') play('trade', null, { priority: 1, minGap: 1 });
    else if (type === 'private') play('trade', null, { minGap: 1, vol: 0.6 });
  });
  ev.on('wilderness:skull', ({ player, skulled }) => { if (skulled && (!player || isMe(player))) play('skull', null, { priority: 2, minGap: 2 }); });
  ev.on('wilderness:enter', () => play('wild_warn', null, { priority: 2, minGap: 3 }));

  // ---- interface clicks ---------------------------------------------------------------------------
  const CLICKABLE = 'button, .tab-btn, .inv-slot, .cm-row, .orb, .compass, select, input[type=checkbox], .iface .slot, .iface [data-slot], .eq-slot, .spell, .prayer';
  document.addEventListener('pointerdown', (e) => {
    if (!A.ready || e.button > 0) return;
    const t = e.target;
    if (!(t instanceof Element) || t.closest('#viewport') || t.closest('.audio-ctl')) return;
    if (t.closest(CLICKABLE)) play('click', null, { minGap: 0.03, priority: 1 });
  }, { capture: true, passive: true });
}
