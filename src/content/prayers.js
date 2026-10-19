// Prayers + buryable bones. OWNER: agent A.
//
// registerPrayer({ id, name, level, drain, categories, effects, overhead?, requires?, icon, description })
//   drain       drain effect per tick; one prayer point is lost each time the running total passes
//               60 + 2 * prayer bonus (so drain 1 ~ 1 point / 36 s, drain 12 ~ 1 point / 3 s with no bonus)
//   categories  conflict slots: attack | strength | defence | ranged | magic | overhead | restore.
//               Same slot conflicts; ranged & magic also conflict with attack & strength (and each other).
//   effects     stat multipliers used by combat formulas: attack, strength, defence, ranged (accuracy),
//               rangedStrength (damage; defaults to `ranged`), magic. Special keys: protect: 'melee'|'ranged'|'magic',
//               restoreStats / restoreHp (x2 rate), protectItem, retribution, secondWind, soulrend, preserve.
//   overhead    icon shape drawn above the head while active (see systems/combat_ui.js)
//   requires    { defence: 65 } extra skill requirements

import { registerPrayer, registerData } from '../core/registry.js';

const P = (def) => registerPrayer({ categories: [], effects: {}, ...def });

// ---- stat boosts (three tiers each) ----------------------------------------------------------
P({ id: 'stoneskin', name: 'Stoneskin', level: 1, drain: 1, categories: ['defence'], effects: { defence: 1.05 },
  description: 'Increases your Defence by 5%.', icon: { shape: 'shield', color: '#c8c0a8' } });
P({ id: 'bulls_vigor', name: "Bull's Vigor", level: 4, drain: 1, categories: ['strength'], effects: { strength: 1.05 },
  description: 'Increases your Strength by 5%.', icon: { shape: 'fist', color: '#e0a060' } });
P({ id: 'keen_focus', name: 'Keen Focus', level: 7, drain: 1, categories: ['attack'], effects: { attack: 1.05 },
  description: 'Increases your Attack by 5%.', icon: { shape: 'sword', color: '#f0e8a0', color2: '#c8a040' } });
P({ id: 'steady_aim', name: 'Steady Aim', level: 8, drain: 1, categories: ['ranged'], effects: { ranged: 1.05 },
  description: 'Increases your Ranged accuracy and damage by 5%.', icon: { shape: 'bow', color: '#c8b070' } });
P({ id: 'spark_of_insight', name: 'Spark of Insight', level: 9, drain: 1, categories: ['magic'], effects: { magic: 1.05 },
  description: 'Increases your Magic accuracy and defence by 5%.', icon: { shape: 'pr_orb', color: '#90b8ff' } });

P({ id: 'ironhide', name: 'Ironhide', level: 10, drain: 6, categories: ['defence'], effects: { defence: 1.10 },
  description: 'Increases your Defence by 10%.', icon: { shape: 'shield', color: '#9aa3ad', color2: '#e8e8f0' } });
P({ id: 'giants_might', name: "Giant's Might", level: 13, drain: 6, categories: ['strength'], effects: { strength: 1.10 },
  description: 'Increases your Strength by 10%.', icon: { shape: 'fist', color: '#d07840' } });
P({ id: 'honed_mind', name: 'Honed Mind', level: 16, drain: 6, categories: ['attack'], effects: { attack: 1.10 },
  description: 'Increases your Attack by 10%.', icon: { shape: 'sword', color: '#e8d070', color2: '#e8e8f0' } });

P({ id: 'steady_pulse', name: 'Steady Pulse', level: 19, drain: 1, categories: ['restore'], effects: { restoreStats: true },
  description: 'Doubles the rate at which drained stats (except Hitpoints and Prayer) recover.', icon: { shape: 'pr_restore', color: '#80e0a0' } });
P({ id: 'mending_light', name: 'Mending Light', level: 22, drain: 2, categories: ['restore'], effects: { restoreHp: true },
  description: 'Doubles your natural Hitpoints regeneration.', icon: { shape: 'heart', color: '#ff7090' } });
P({ id: 'keepsake', name: 'Keepsake', level: 25, drain: 2, categories: [], effects: { protectItem: true },
  description: 'Keep one extra item if you die.', icon: { shape: 'pr_keep', color: '#e8c040' } });

P({ id: 'falcon_sight', name: 'Falcon Sight', level: 26, drain: 6, categories: ['ranged'], effects: { ranged: 1.10 },
  description: 'Increases your Ranged accuracy and damage by 10%.', icon: { shape: 'bow', color: '#a8c070' } });
P({ id: 'arcane_flow', name: 'Arcane Flow', level: 27, drain: 6, categories: ['magic'], effects: { magic: 1.10 },
  description: 'Increases your Magic accuracy and defence by 10%.', icon: { shape: 'pr_orb', color: '#6090ff' } });

P({ id: 'bastion', name: 'Bastion', level: 28, drain: 12, categories: ['defence'], effects: { defence: 1.15 },
  description: 'Increases your Defence by 15%.', icon: { shape: 'shield', color: '#c8d0e0', color2: '#e8c040' } });
P({ id: 'titans_wrath', name: "Titan's Wrath", level: 31, drain: 12, categories: ['strength'], effects: { strength: 1.15 },
  description: 'Increases your Strength by 15%.', icon: { shape: 'fist', color: '#ff6030' } });
P({ id: 'blademasters_clarity', name: "Blademaster's Clarity", level: 34, drain: 12, categories: ['attack'], effects: { attack: 1.15 },
  description: 'Increases your Attack by 15%.', icon: { shape: 'sword', color: '#fff0a0', color2: '#ffd040' } });

// ---- protection (overheads) ----------------------------------------------------------------------
P({ id: 'spellward', name: 'Spellward', level: 37, drain: 12, categories: ['overhead'], effects: { protect: 'magic' }, overhead: 'ward_magic',
  description: 'Protects you from magic attacks (fully against creatures, 40% against players).', icon: { shape: 'ward_magic', color: '#70a0ff' } });
P({ id: 'arrowward', name: 'Arrowward', level: 40, drain: 12, categories: ['overhead'], effects: { protect: 'ranged' }, overhead: 'ward_ranged',
  description: 'Protects you from ranged attacks (fully against creatures, 40% against players).', icon: { shape: 'ward_ranged', color: '#70e070' } });
P({ id: 'bladeward', name: 'Bladeward', level: 43, drain: 12, categories: ['overhead'], effects: { protect: 'melee' }, overhead: 'ward_melee',
  description: 'Protects you from melee attacks (fully against creatures, 40% against players).', icon: { shape: 'ward_melee', color: '#e8e8e8' } });

P({ id: 'deadeye', name: 'Deadeye', level: 44, drain: 12, categories: ['ranged'], effects: { ranged: 1.15 },
  description: 'Increases your Ranged accuracy and damage by 15%.', icon: { shape: 'bow', color: '#e0e070' } });
P({ id: 'archmages_will', name: "Archmage's Will", level: 45, drain: 12, categories: ['magic'], effects: { magic: 1.15 },
  description: 'Increases your Magic accuracy and defence by 15%.', icon: { shape: 'pr_orb', color: '#b070ff' } });

P({ id: 'last_rites', name: 'Last Rites', level: 46, drain: 3, categories: ['overhead'], effects: { retribution: true }, overhead: 'ward_rites',
  description: 'When you die, unleash a burst that damages everything beside you.', icon: { shape: 'ward_rites', color: '#ff8020' } });
P({ id: 'second_wind', name: 'Second Wind', level: 49, drain: 6, categories: ['overhead'], effects: { secondWind: true }, overhead: 'ward_wind',
  description: 'When your Hitpoints fall below 10%, consume all your Prayer to heal a quarter of your Prayer level.', icon: { shape: 'ward_wind', color: '#a0ffd0' } });
P({ id: 'soulrend', name: 'Soulrend', level: 52, drain: 18, categories: ['overhead'], effects: { soulrend: true }, overhead: 'ward_rend',
  description: "Your hits on other players drain a quarter of the damage from their Prayer.", icon: { shape: 'ward_rend', color: '#ff5050' } });
P({ id: 'lingering_blessing', name: 'Lingering Blessing', level: 55, drain: 2, categories: [], effects: { preserve: true },
  description: 'Stat boosts last 50% longer before fading.', icon: { shape: 'pr_restore', color: '#f0d080' } });

// ---- combined blessings ----------------------------------------------------------------------------
P({ id: 'valor', name: 'Oath of Valor', level: 60, drain: 24, requires: { defence: 65 }, categories: ['attack', 'strength', 'defence'],
  effects: { attack: 1.15, strength: 1.18, defence: 1.20 },
  description: 'Increases Attack by 15%, Strength by 18% and Defence by 20%. Requires 65 Defence.', icon: { shape: 'pr_combo', color: '#e8e0c0', color2: '#c84030' } });
P({ id: 'paragon', name: "Paragon's Oath", level: 70, drain: 24, requires: { defence: 70 }, categories: ['attack', 'strength', 'defence'],
  effects: { attack: 1.20, strength: 1.23, defence: 1.25 },
  description: 'Increases Attack by 20%, Strength by 23% and Defence by 25%. Requires 70 Defence.', icon: { shape: 'pr_combo', color: '#fff0a0', color2: '#e02020' } });
P({ id: 'hunters_creed', name: "Hunter's Creed", level: 74, drain: 24, requires: { defence: 70 }, categories: ['ranged', 'defence'],
  effects: { ranged: 1.20, rangedStrength: 1.23, defence: 1.25 },
  description: 'Increases Ranged accuracy by 20%, Ranged damage by 23% and Defence by 25%. Requires 70 Defence.', icon: { shape: 'pr_combo', color: '#c8e090', color2: '#3a8a3a' } });
P({ id: 'sages_covenant', name: "Sage's Covenant", level: 77, drain: 24, requires: { defence: 70 }, categories: ['magic', 'defence'],
  effects: { magic: 1.25, defence: 1.25 },
  description: 'Increases Magic accuracy and defence by 25% and Defence by 25%. Requires 70 Defence.', icon: { shape: 'pr_combo', color: '#c0c8ff', color2: '#4040c0' } });

// ---- bones: itemId -> prayer xp when buried (offering at an altar gives 2.5x) -----------------------
// Other agents can make any item buryable either with registerData('bones', id, { xp }) or with the
// item field `prayerXp: 30` (plus options: ['Bury']).
registerData('bones', 'bones', { xp: 4.5 });
registerData('bones', 'big_bones', { xp: 15 });
registerData('bones', 'wyrm_bones', { xp: 60 });
registerData('bones', 'fiend_bones', { xp: 50 });
