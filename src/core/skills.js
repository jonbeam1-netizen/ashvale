// Per-player skill state: XP (base level derived) + current (boosted/drained) levels.

import { SKILLS, SKILL_NAMES } from './constants.js';
import { levelForXp, xpForLevel, combatLevel, MAX_XP } from './xp.js';

export class Skills {
  /** @param {object} owner the Player; @param {import('./events.js').EventBus} bus */
  constructor(owner, bus) {
    this.owner = owner;
    this.bus = bus;
    this.xp = {};
    this.current = {};
    this.levels = {};
    this.xpMultiplier = 1;
    for (const s of SKILLS) {
      this.xp[s] = s === 'hitpoints' ? xpForLevel(10) : 0;
      this.levels[s] = levelForXp(this.xp[s]);
      this.current[s] = this.levels[s];
    }
  }

  getXp(skill) { return this.xp[skill] ?? 0; }
  /** Base (real) level 1-99. */
  getLevel(skill) { return this.levels[skill] ?? 1; }
  /** Current level including boosts/drains (Hitpoints current = HP, Prayer current = prayer points). */
  getCurrent(skill) { return this.current[skill] ?? 1; }

  setCurrent(skill, value) {
    const v = Math.max(0, Math.round(value));
    if (this.current[skill] === v) return;
    this.current[skill] = v;
    this.bus?.emit('stats:change', { player: this.owner, skill, current: v });
  }

  /** Temporary boost (positive) or drain (negative) relative to current; boosts capped at base+cap. */
  boost(skill, amount, cap = amount) {
    const base = this.getLevel(skill);
    const cur = this.getCurrent(skill);
    if (amount >= 0) this.setCurrent(skill, Math.max(cur, Math.min(cur + amount, base + cap)));
    else this.setCurrent(skill, Math.max(0, cur + amount));
  }

  /** Restore current toward base (used by passive restore & potions). */
  restore(skill, amount = Infinity) {
    const base = this.getLevel(skill);
    const cur = this.getCurrent(skill);
    if (cur < base) this.setCurrent(skill, Math.min(base, cur + amount));
  }

  addXp(skill, amount, opts = {}) {
    if (!(skill in this.xp) || !(amount > 0)) return;
    const gained = amount * (opts.ignoreMultiplier ? 1 : this.xpMultiplier);
    const before = this.levels[skill];
    const prevCombat = this.combatLevel();
    this.xp[skill] = Math.min(MAX_XP, this.xp[skill] + gained);
    this.levels[skill] = levelForXp(this.xp[skill]);
    this.bus?.emit('xp', { player: this.owner, skill, amount: gained, total: this.xp[skill] });
    if (this.levels[skill] > before) {
      const diff = this.levels[skill] - before;
      // Current level rises with base level (keeps boosts/drains relative).
      this.current[skill] = this.current[skill] + diff;
      this.bus?.emit('levelup', { player: this.owner, skill, level: this.levels[skill], name: SKILL_NAMES[skill] });
      const cb = this.combatLevel();
      if (cb !== prevCombat) this.bus?.emit('combatlevel', { player: this.owner, level: cb });
      this.bus?.emit('stats:change', { player: this.owner, skill, current: this.current[skill] });
    }
  }

  /** Directly set XP (admin / save load). */
  setXp(skill, xp) {
    this.xp[skill] = Math.max(0, Math.min(MAX_XP, xp));
    this.levels[skill] = levelForXp(this.xp[skill]);
    this.current[skill] = this.levels[skill];
  }

  totalLevel() { return SKILLS.reduce((a, s) => a + this.levels[s], 0); }
  totalXp() { return SKILLS.reduce((a, s) => a + Math.floor(this.xp[s]), 0); }
  combatLevel() { return combatLevel(this.levels); }

  /** Passive restoration, called by the engine every 100 ticks (1 minute). */
  passiveRestore() {
    for (const s of SKILLS) {
      if (s === 'prayer') continue; // prayer only restores via altars/potions
      const base = this.levels[s];
      const cur = this.current[s];
      if (cur < base) this.setCurrent(s, cur + 1);
      else if (cur > base && s !== 'hitpoints') this.setCurrent(s, cur - 1);
    }
  }

  toJSON() { return { xp: { ...this.xp }, current: { ...this.current } }; }

  fromJSON(data) {
    if (!data) return;
    for (const s of SKILLS) {
      const xp = Number(data.xp?.[s]), cur = Number(data.current?.[s]);
      if (Number.isFinite(xp) && xp >= 0) this.setXp(s, xp);
      if (Number.isFinite(cur) && cur >= 0) this.current[s] = Math.floor(cur);
    }
  }
}
