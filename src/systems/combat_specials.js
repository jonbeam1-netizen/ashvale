// Special attack registry. OWNER: agent A.
//
// A weapon gets a special attack with the item field:
//     special: { id: 'twin_fang', cost: 25 }          // cost = % special energy (default: the special's cost)
// Special energy (player.specialEnergy, 0-100) regenerates 10% every 30 s (engine). Clicking the
// special bar (Combat tab) or the spec orb arms it; the next attack uses it if energy suffices.
//
// Special definition fields (registerSpecial(id, def)):
//   name, description, cost (default cost), modes: ['melee'|'ranged'|'magic'] it works with,
//   hits (number of hits, default 1), accuracy (attack roll multiplier), damage (max hit multiplier),
//   alwaysHit (skip the accuracy roll), minHitPct (min damage as a fraction of max on a hit),
//   ammo (ammo consumed for ranged, default = hits), anim, color (sparkle colour on the attacker),
//   onHit(ctx, dmg, hitIndex)   ctx = { game, combat, attacker, target, mode, spec }
//   instant(ctx) -> bool        no target needed; runs immediately when the bar is clicked
//   extraTargets(ctx) -> [targets]  additional targets hit with the same rolls (multi-combat sweeps)

const SPECIALS = new Map();

export function registerSpecial(id, def) { SPECIALS.set(id, { id, cost: 50, modes: ['melee'], hits: 1, accuracy: 1, damage: 1, ...def }); }
export function getSpecial(id) { return SPECIALS.get(id) || null; }
export function allSpecials() { return [...SPECIALS.values()]; }

registerSpecial('twin_fang', {
  name: 'Twin Fang', description: 'Two quick strikes with 15% boosted accuracy and damage.',
  cost: 25, hits: 2, accuracy: 1.15, damage: 1.15, color: 0x80ff80,
});

registerSpecial('shatter', {
  name: 'Shatter', description: 'A crushing blow with 25% boosted accuracy and damage that lowers the target\'s Defence by the damage dealt.',
  cost: 50, accuracy: 1.25, damage: 1.25, anim: 'crush', color: 0xffd060,
  onHit({ target, combat }, dmg) { if (dmg > 0) combat.lowerStat(target, 'defence', dmg); },
});

registerSpecial('soul_harvest', {
  name: 'Soul Harvest', description: 'Heals you for half the damage dealt and restores a quarter of it as Prayer.',
  cost: 50, accuracy: 1.1, damage: 1.0, color: 0xff60c0,
  onHit({ game, attacker }, dmg) {
    if (dmg <= 0 || attacker.type !== 'player') return;
    game.heal(attacker, Math.floor(dmg / 2));
    const pr = attacker.skills.getCurrent('prayer');
    attacker.skills.setCurrent('prayer', Math.min(attacker.skills.getLevel('prayer'), pr + Math.floor(dmg / 4)));
  },
});

registerSpecial('unerring_strike', {
  name: 'Unerring Strike', description: 'A strike that can never miss, dealing 10% extra damage.',
  cost: 55, alwaysHit: true, damage: 1.1, minHitPct: 0.2, color: 0xffffff,
});

registerSpecial('venom_rend', {
  name: 'Venomous Rend', description: 'A tearing strike that poisons the target on a successful hit.',
  cost: 25, accuracy: 1.25, damage: 1.0, color: 0x40d040,
  onHit({ combat, target, attacker }, dmg) { if (dmg > 0) combat.poison(target, 6, attacker); },
});

registerSpecial('hamstring', {
  name: 'Hamstring', description: 'A low strike that binds the target in place for 6 seconds.',
  cost: 40, accuracy: 1.2, damage: 1.0, color: 0x80a0ff,
  onHit({ combat, target }, dmg) { if (dmg > 0) combat.bind(target, 10); },
});

registerSpecial('whirlwind', {
  name: 'Whirlwind', description: 'Strikes your target and, in multi-combat areas, up to two other foes beside you.',
  cost: 50, damage: 1.1, accuracy: 1.1, anim: 'slash', color: 0xffa040,
  extraTargets({ game, attacker, target }) {
    if (!game.world.isMulti(attacker.x, attacker.y)) return [];
    return game.npcsNear(attacker.x, attacker.y, 1, (n) => n !== target && n.def.options?.includes('Attack')).slice(0, 2);
  },
});

registerSpecial('twin_shot', {
  name: 'Twin Shot', description: 'Fires two projectiles at once.',
  cost: 55, modes: ['ranged'], hits: 2, ammo: 2, accuracy: 1.0, damage: 1.0, color: 0xffe080,
});

registerSpecial('piercing_shot', {
  name: 'Piercing Shot', description: 'A carefully aimed shot with doubled accuracy and 20% extra damage.',
  cost: 50, modes: ['ranged'], accuracy: 2.0, damage: 1.2, color: 0xc0e0ff,
});

registerSpecial('war_cry', {
  name: 'War Cry', description: 'Lowers your Attack, Defence, Ranged and Magic by 10% and raises your Strength by 10 plus a quarter of the levels lost.',
  cost: 100, modes: ['melee', 'ranged', 'magic'],
  instant({ game, attacker }) {
    const sk = attacker.skills;
    let lost = 0;
    for (const s of ['attack', 'defence', 'ranged', 'magic']) {
      const d = Math.floor(sk.getCurrent(s) * 0.1);
      lost += d;
      sk.setCurrent(s, sk.getCurrent(s) - d);
    }
    sk.boost('strength', 10 + Math.floor(lost / 4));
    game.say(attacker, 'Steel and fury!', { color: '#ff4020' });
    game.spawnEffect('sparkle', attacker, { color: 0xff4020 });
    return true;
  },
});
