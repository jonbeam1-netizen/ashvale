// Global engine constants. Engine-owned (do not edit from content/system modules).

export const TICK_MS = 600;
export const INVENTORY_SIZE = 28;
export const BANK_SIZE = 816;
export const MAX_STACK = 2147483647;
export const MAX_RUN_ENERGY = 10000; // displayed as /100
export const SAVE_VERSION = 1;

/** All 23 skills, by id. Order = internal order (save files key by id, not index). */
export const SKILLS = [
  'attack', 'strength', 'defence', 'ranged', 'prayer', 'magic', 'runebinding', 'construction',
  'hitpoints', 'agility', 'herblore', 'thieving', 'crafting', 'fletching', 'slayer', 'hunter',
  'mining', 'smithing', 'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming',
];

export const SKILL_NAMES = {
  attack: 'Attack', strength: 'Strength', defence: 'Defence', ranged: 'Ranged', prayer: 'Prayer',
  magic: 'Magic', runebinding: 'Runebinding', construction: 'Construction', hitpoints: 'Hitpoints',
  agility: 'Agility', herblore: 'Herblore', thieving: 'Thieving', crafting: 'Crafting',
  fletching: 'Fletching', slayer: 'Slayer', hunter: 'Hunter', mining: 'Mining', smithing: 'Smithing',
  fishing: 'Fishing', cooking: 'Cooking', firemaking: 'Firemaking', woodcutting: 'Woodcutting',
  farming: 'Farming',
};

/** Skills tab layout: 3 columns, row-major. */
export const SKILL_GRID = [
  'attack', 'hitpoints', 'mining',
  'strength', 'agility', 'smithing',
  'defence', 'herblore', 'fishing',
  'ranged', 'thieving', 'cooking',
  'prayer', 'crafting', 'firemaking',
  'magic', 'fletching', 'woodcutting',
  'runebinding', 'slayer', 'farming',
  'construction', 'hunter',
];

export const COMBAT_SKILLS = ['attack', 'strength', 'defence', 'ranged', 'prayer', 'magic', 'hitpoints'];

/** Equipment slots (11). */
export const EQUIP_SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];

/** Equipment bonus keys. Every item/npc `bonuses` object is normalised to contain all of these (default 0). */
export const BONUS_KEYS = [
  'attackStab', 'attackSlash', 'attackCrush', 'attackMagic', 'attackRanged',
  'defenceStab', 'defenceSlash', 'defenceCrush', 'defenceMagic', 'defenceRanged',
  'strength', 'rangedStrength', 'magicDamage', 'prayer',
];

export const BONUS_LABELS = {
  attackStab: 'Stab', attackSlash: 'Slash', attackCrush: 'Crush', attackMagic: 'Magic', attackRanged: 'Range',
  defenceStab: 'Stab', defenceSlash: 'Slash', defenceCrush: 'Crush', defenceMagic: 'Magic', defenceRanged: 'Range',
  strength: 'Melee strength', rangedStrength: 'Ranged strength', magicDamage: 'Magic damage', prayer: 'Prayer',
};

/** Original metal tier list (documented in ARCHITECTURE.md). */
export const METAL_TIERS = [
  { id: 'bronze', name: 'Bronze', level: 1, color: '#b0793e' },
  { id: 'iron', name: 'Iron', level: 10, color: '#6f6c6a' },
  { id: 'steel', name: 'Steel', level: 20, color: '#a3abb4' },
  { id: 'duskite', name: 'Duskite', level: 30, color: '#4b3a63' },
  { id: 'verdite', name: 'Verdite', level: 40, color: '#3e9461' },
  { id: 'azurium', name: 'Azurium', level: 50, color: '#3b70c8' },
  { id: 'emberite', name: 'Emberite', level: 60, color: '#c8452a' },
];

export function emptyBonuses() {
  const b = {};
  for (const k of BONUS_KEYS) b[k] = 0;
  return b;
}

/** Simple chat colour markup: "<col=ff0000>red</col>". */
export const COLORS = {
  option: '#ffffff',
  object: '#00ffff',
  npc: '#ffff00',
  item: '#ff9040',
  player: '#ffffff',
  game: '#000000',
};
