// Default weapon types -> attack styles shown in the Combat tab.
// style: accurate (+3 att) | aggressive (+3 str) | defensive (+3 def) | controlled (+1 all) | rapid | longrange | autocast
// type: stab | slash | crush | ranged | magic.   xp: skills that receive combat XP for this style.
// anim: humanoid animation played when attacking with the style.
// Agent A may register more (registerWeaponType) from its own files.

import { registerWeaponType } from './registry.js';

const melee = (list) => list.map(([name, type, style, anim]) => ({
  name, type, style, anim: anim || (type === 'stab' ? 'stab' : 'slash'),
  xp: style === 'accurate' ? ['attack'] : style === 'aggressive' ? ['strength'] : style === 'defensive' ? ['defence'] : ['attack', 'strength', 'defence'],
}));

registerWeaponType({ id: 'unarmed', styles: melee([['Punch', 'crush', 'accurate', 'punch'], ['Kick', 'crush', 'aggressive', 'punch'], ['Block', 'crush', 'defensive', 'punch']]) });
registerWeaponType({ id: 'sword', styles: melee([['Stab', 'stab', 'accurate'], ['Lunge', 'stab', 'aggressive'], ['Slash', 'slash', 'aggressive'], ['Block', 'stab', 'defensive']]) });
registerWeaponType({ id: 'dagger', styles: melee([['Stab', 'stab', 'accurate'], ['Lunge', 'stab', 'aggressive'], ['Slash', 'slash', 'aggressive'], ['Block', 'stab', 'defensive']]) });
registerWeaponType({ id: 'scimitar', styles: melee([['Chop', 'slash', 'accurate'], ['Slash', 'slash', 'aggressive'], ['Lunge', 'stab', 'controlled'], ['Block', 'slash', 'defensive']]) });
registerWeaponType({ id: 'longsword', styles: melee([['Chop', 'slash', 'accurate'], ['Slash', 'slash', 'aggressive'], ['Lunge', 'stab', 'controlled'], ['Block', 'slash', 'defensive']]) });
registerWeaponType({ id: 'axe', styles: melee([['Chop', 'slash', 'accurate'], ['Hack', 'slash', 'aggressive'], ['Smash', 'crush', 'aggressive'], ['Block', 'slash', 'defensive']]) });
registerWeaponType({ id: 'pickaxe', styles: melee([['Spike', 'stab', 'accurate'], ['Impale', 'stab', 'aggressive'], ['Smash', 'crush', 'aggressive'], ['Block', 'stab', 'defensive']]) });
registerWeaponType({ id: 'mace', styles: melee([['Pound', 'crush', 'accurate'], ['Pummel', 'crush', 'aggressive'], ['Spike', 'stab', 'controlled'], ['Block', 'crush', 'defensive']]) });
registerWeaponType({ id: 'warhammer', styles: melee([['Pound', 'crush', 'accurate'], ['Pummel', 'crush', 'aggressive'], ['Block', 'crush', 'defensive']]) });
registerWeaponType({ id: 'spear', styles: melee([['Lunge', 'stab', 'controlled'], ['Swipe', 'slash', 'controlled'], ['Pound', 'crush', 'controlled'], ['Block', 'stab', 'defensive']]) });
registerWeaponType({ id: 'twohanded', styles: melee([['Chop', 'slash', 'accurate'], ['Slash', 'slash', 'aggressive'], ['Smash', 'crush', 'aggressive'], ['Block', 'slash', 'defensive']]) });
registerWeaponType({
  id: 'bow', ranged: true, styles: [
    { name: 'Accurate', type: 'ranged', style: 'accurate', xp: ['ranged'], anim: 'shoot' },
    { name: 'Rapid', type: 'ranged', style: 'rapid', xp: ['ranged'], anim: 'shoot' },
    { name: 'Longrange', type: 'ranged', style: 'longrange', xp: ['ranged', 'defence'], anim: 'shoot' },
  ],
});
registerWeaponType({
  id: 'staff', styles: [
    ...melee([['Bash', 'crush', 'accurate'], ['Pound', 'crush', 'aggressive'], ['Focus', 'crush', 'defensive']]),
    { name: 'Spell', type: 'magic', style: 'autocast', xp: ['magic'], anim: 'cast' },
  ],
});
