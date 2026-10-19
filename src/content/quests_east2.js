// Eastern quests, part 2. OWNER: content designer (east). Imported by content/quests.js (after quests_east.js).
//   14. The Sun-Eyed Warden (Experienced, tomb puzzle + boss) - Excavator Tamsin Reed, Sandswallowed Temple
//   15. The Brinecoil (Experienced, sea-serpent boss) - Harbourmaster Brannoc, Gullhaven
//   16. Trial by Bog (Intermediate, mystery) - Reeve Odelia Sump, Bogwick
//   17. The Ember Under the Mountain (Master, multi-region epic + boss) - Thane Hargrim Ironvein, Durnhold
//       requires The Forge-Heart of Durnhold, Stars over Bramblemoor and The Sun-Eyed Warden.
// Quest bosses are spawned per player at run time (respawn: false) like the Mire King.

import { registerQuest, registerDialogue, registerItem, registerData } from '../core/registry.js';
import { registerSceneryTemplate } from '../render/models.js';
import { hook, stageOf, done, flags, has, take, give, strike, red, COMPLETE, questNpc, questItem, questObject, spawnNpc, spawnObj, xp } from './quest_util.js';
import { DWARF, QICON, aggro, alive, despawn, questTeleport } from './quests_east.js';

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const armour = (n, mag = n, rng = n) => ({ defenceStab: n, defenceSlash: n, defenceCrush: n, defenceMagic: mag, defenceRanged: rng });
/** Telegraphed ground attack: marks the player's tile, hits if they are still on it `delay` ticks later. */
function telegraph(game, boss, { color, text, min, max, delay = 3 }) {
  const p = game.player;
  const tx = p.x, ty = p.y;
  game.spawnEffect('sparkle', { x: tx, y: ty }, { color });
  game.message(text);
  game.schedule(delay, () => {
    if (!alive(game, boss) || p.dead) return;
    game.spawnEffect('splash', { x: tx, y: ty }, {});
    if (p.x === tx && p.y === ty) game.applyDamage(p, rint(min, max), { source: boss, type: 'typeless' });
  });
}
/** Find a free walkable tile near (x, y) (ring search). */
function freeTileNear(game, x, y, r = 3, avoid = null) {
  for (let d = 1; d <= r; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const tx = x + dx, ty = y + dy;
      if (!game.world.isWalkable(tx, ty)) continue;
      if (avoid && avoid.x === tx && avoid.y === ty) continue;
      return [tx, ty];
    }
  }
  return [x, y];
}

registerSceneryTemplate('q_vent', (b) => {
  for (let i = 0; i < 7; i++) b.dodeca(i % 2 ? '#2a2220' : '#3a2e2a', 0.35, [Math.cos(i * 0.9) * 0.45, 0.15, Math.sin(i * 0.9) * 0.45], [1.1, 0.6, 1]);
  b.cyl('#ff6a10', 0.28, 0.32, 0.06, 8, [0, 0.12, 0], [0, 0, 0], 0);
  b.cone('#ffb030', 0.18, 0.5, 6, [0, 0.4, 0], [0, 0, 0], 0);
});

// =================================================================================================
// 14. The Sun-Eyed Warden (Experienced) - Excavator Tamsin Reed, Sandswallowed Temple gate (262,175)
// =================================================================================================
const SW = 'sun_warden';
questNpc({ id: 'excavator_tamsin', name: 'Excavator Tamsin Reed', examine: 'An excavator with a trowel in one hand and a notebook in the other. Sand in every pocket.', mapIcon: QICON,
  model: { female: true, hairStyle: 'long', colors: { top: '#c8a060', legs: '#6a4a2a', hair: '#8a4a1a', skin: '#c8865a' }, equipment: { head: { shape: 'hood', color: '#e8dcc0' }, weapon: { shape: 'dagger', color: '#a0a0a0' } } } });
spawnNpc('excavator_tamsin', 262, 175, 2);
spawnObj('tent_canvas', 258, 173);
questItem({ id: 'sun_seal', name: 'Sun seal', examine: 'A gold seal stamped with a rayed sun. It is warm to the touch.', stackable: true, icon: { shape: 'coins', color: '#f0c040' } });
questItem({ id: 'sun_disc', name: 'Sun disc', examine: 'A disc of beaten gold. An eye is engraved at its centre, and four runes run around the rim.', options: ['Read'], icon: { shape: 'ring', color: '#f0c040', color2: '#ffffff' } });
registerItem({ id: 'sunwarden_amulet', name: 'Sunwarden amulet', examine: 'A sun of gold on a chain of bronze. It keeps a little of the Sun-Wardens\' vigil.', slot: 'neck', value: 2500, tradeable: false,
  bonuses: { attackStab: 8, attackSlash: 8, attackCrush: 8, attackMagic: 4, attackRanged: 4, defenceStab: 3, defenceSlash: 3, defenceCrush: 3, strength: 6, prayer: 3 },
  icon: { shape: 'amulet', color: '#f0c040', color2: '#ffffff' }, model: { color: '#f0c040' } });
questObject({ id: 'warden_inscription', name: 'Warden inscription', examine: 'Lines of sun-script cut into a fallen slab.', options: ['Read'], model: { template: 'gravestone' } });
spawnObj('warden_inscription', 224, 232);
const COFFINS = {
  warden_coffin_dawn: [233, 246, 'The carved face looks east, smiling at a rising sun.', true],
  warden_coffin_dusk: [239, 246, 'The carved face looks west, towards a sun half-sunk behind a hill.', true],
  warden_coffin_open: [247, 246, 'The carved eyes are wide open and painted with gold. They seem to follow you.', true],
  warden_coffin_sleep: [253, 246, 'The carved eyes are sewn shut, the hands folded. Scratched beneath: LET HIM SLEEP.', false],
};
for (const [id, [x, y, ex]] of Object.entries(COFFINS)) {
  questObject({ id, name: "Warden's coffin", examine: ex, options: ['Open', 'Inspect'], model: { template: 'dec_sarcophagus', color: '#b89868' } });
  spawnObj(id, x, y);
}
questObject({ id: 'warden_coffin_opened', name: "Warden's coffin", examine: 'The lid has been pushed aside. Only dust and old linen remain.', model: { template: 'dec_sarcophagus', color: '#8a7050' } });
questNpc({ id: 'ashkar_sun_eyed', name: 'Ashkar, the Sun-Eyed', examine: 'The last high warden of the sun, still keeping his vigil after death. His eyes burn like noon.', options: ['Attack'], dialogue: undefined,
  combatLevel: 118, aggressive: true, aggroRange: 10, size: 2, boss: true, tags: ['undead', 'boss'], respawnTicks: 300, wanderRadius: 3,
  stats: { attack: 80, strength: 84, defence: 80, magic: 70, hitpoints: 200 }, maxHit: 13, attackStyle: 'crush', attackSpeed: 5, bonuses: armour(50, 30, 60),
  attacks: [{ style: 'melee', maxHit: 13, weight: 3 }, { style: 'magic', maxHit: 11, weight: 1, range: 7, projectileColor: '#ffd040' }],
  model: { template: 'zombie', scale: 1.45, colors: { skin: '#c8b890', top: '#e8dcc0', legs: '#c8a878' }, extras: { glowEyes: '#ffd040', crown: '#f0c040' }, equipment: { weapon: { shape: 'staff', color: '#f0c040' } } } });
questNpc({ id: 'sand_scarab', name: 'Sun scarab', examine: 'A golden beetle the size of a dog. It feeds its master with light.', options: ['Attack'], dialogue: undefined,
  combatLevel: 24, aggressive: true, aggroRange: 8, respawnTicks: 999, wanderRadius: 3, stats: { attack: 18, strength: 16, defence: 18, hitpoints: 14 }, maxHit: 3, attackStyle: 'stab',
  model: { template: 'scorpion', scale: 0.55, colors: { body: '#d8a830' }, sting: '#8a6a1a' } });
questNpc({ id: 'vault_mummy', name: 'Sleeping warden', examine: 'He asked to be left to sleep. You did not listen.', options: ['Attack'], dialogue: undefined,
  combatLevel: 44, aggressive: true, aggroRange: 8, respawnTicks: 999, wanderRadius: 3, tags: ['undead'], stats: { attack: 40, strength: 40, defence: 35, hitpoints: 45 }, maxHit: 6, attackStyle: 'crush',
  model: { template: 'zombie', colors: { skin: '#c8b890', top: '#d8ccb0', legs: '#c8b890' }, extras: { glowEyes: '#ffd040' } } });

questTeleport({ id: 'dustwatch_teleport', name: 'Dustwatch Teleport', level: 55, xp: 65, runes: { nexus_sigil: 2, fire_sigil: 3, earth_sigil: 2 }, dest: { x: 239, y: 156, name: 'the Dustwatch outpost' }, color: '#e8a040', questReq: SW, questName: 'The Sun-Eyed Warden' });

registerQuest({
  id: SW, name: 'The Sun-Eyed Warden', difficulty: 'Experienced', questPoints: 3, completeStage: 100,
  start: 'Speak to Excavator Tamsin Reed at the gate of the Sandswallowed Temple, south-east of Dustwatch.',
  description: 'Something in the Sandswallowed Vaults is still keeping its vigil.',
  rewards: ['3 Quest Points', '5,000 Attack XP', '5,000 Strength XP', '2,500 Prayer XP', 'Sunwarden amulet', 'The Dustwatch Teleport spell (Magic 55)', 'A Lamp of Insight (2,500 XP)'],
  onComplete: ({ game, player }) => { take(game, 'sun_seal', 3); take(game, 'sun_disc'); xp(player, { attack: 5000, strength: 5000, prayer: 2500 }); give(game, 'sunwarden_amulet'); give(game, 'insight_lamp'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Excavator Tamsin Reed')} at the gate of the ${red('Sandswallowed Temple')}, south-east of Dustwatch.`, 'Recommended: combat level 75, food, water. This quest has a boss fight.'];
    if (stage >= 100) return [strike('I opened the coffins of the three watching wardens, woke Ashkar the Sun-Eyed and brought his sun disc to Tamsin.'), '', COMPLETE];
    const f = flags(game, SW);
    const out = [strike('Tamsin wants to know what the Sun-Wardens were watching.')];
    if (stage === 10) {
      out.push(`I need three ${red('sun seals')} from the wardens' coffins in the ${red('Sandswallowed Vaults')} (${game.player.inventory.count('sun_seal')}/3).`);
      out.push(f.read ? strike('The inscription: the warden who greeted the dawn, the one who bade the dusk farewell, and the one whose eyes never closed. "The fourth sleeps; let him."') : `The ${red('inscription')} near the vault stairs may explain which coffins to open.`);
      out.push(`Then I can set the seals on the ${red('gilded sarcophagus')} in the deepest chamber.`);
      out.push('Thirst bats haunt the side chambers - without Slayer 35 I cannot hurt them, so I should be quick.');
    }
    if (stage === 20) out.push(strike('I set the three seals on the gilded sarcophagus.'), `I must defeat ${red('Ashkar, the Sun-Eyed')}. When his eyes blaze, I must ${red('move off my tile')}. His scarabs feed him light - kill them quickly.`, 'If I left the fight, I can set the seals on the sarcophagus again.');
    if (stage === 30) out.push(strike('Ashkar is at rest.'), has(game, 'sun_disc') ? `I should bring his ${red('sun disc')} to ${red('Tamsin')}.` : `He left behind a ${red('sun disc')}. I should pick it up and bring it to ${red('Tamsin')}.`);
    return out;
  },
});

registerDialogue('excavator_tamsin', ({ game }) => {
  const ep = getEpic(game, 'excavator_tamsin'); if (ep) return ep;
  const s = stageOf(game, SW);
  if (s >= 100) return [
    { npc: 'The disc is safe in my strongbox and my notes are three hundred pages long. The Sun-Wardens were watching something under the mountains to the north. Under the Greyspine!' },
    { options: [{ text: 'Under the Greyspine?', goto: 'g' }, { text: 'Goodbye.', end: true }] },
    { label: 'g', npc: 'Their murals show a great disc carried north, to "the mountain that breathes". I would love to know what the dwarves think of that.', end: true },
  ];
  if (s === 30) return [
    { if: () => has(game, 'sun_disc'), goto: 'disc' },
    { npc: 'You beat him? Then where is the disc? Go back for it - and quickly, before some corsair finds it.', end: true },
    { label: 'disc', player: 'Ashkar is at rest. He was guarding this.' },
    { npc: 'The Sun Disc. Look at the eye in the centre - it is not decoration. They made it to WATCH something. And the runes on the rim are not even sun-script.' },
    { action: () => { game.quests.complete(SW); } },
    { npc: 'I will keep it safe and study it. You have earned more than my thanks - take these, and my notes on the old Dustwatch way-spell.', end: true },
  ];
  if (s === 20) return [{ npc: 'He is awake? Then go and put him back to sleep - gently, with a sword. Move when his eyes blaze; my notes say the light burns where it lands.' }];
  if (s === 10) return [
    { npc: 'Three seals, three coffins - but there are four coffins down there. Read the inscription by the stairs before you open anything.' },
    { options: [{ text: 'What happens if I open the wrong one?', goto: 'w' }, { text: 'I am on my way.', end: true }] },
    { label: 'w', npc: 'I opened one last week. It got out. It is still down there somewhere. So: read the inscription.', end: true },
  ];
  return [
    { npc: 'Careful where you step! That sand is three thousand years old. Well, the bottom bit is.' },
    { options: [
      { text: 'What are you digging for?', goto: 'dig' },
      { text: 'Sorry. Goodbye.', end: true },
    ] },
    { label: 'dig', npc: 'The Sun-Wardens. Priests who kept a vigil in this temple until the desert swallowed it. Their murals show a golden disc - with eyes - carried down into the vaults.' },
    { npc: 'The last high warden, Ashkar, was buried with it. His sarcophagus is sealed with three sun seals, and the seals were buried with three of his wardens.' },
    { options: [
      { text: 'I will get the seals and open his tomb.', action: () => { game.quests.start(SW); game.quests.setStage(SW, 10); }, goto: 'ok' },
      { text: 'Robbing tombs? No thank you.', end: true },
    ] },
    { label: 'ok', npc: 'Excavating! Not robbing. The stairs are in the middle of the ruins. Take water, food and a sharp sword - the vaults are not empty.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  let boss = null;
  const scarabs = new Set();
  I.onObject('Read', ['warden_inscription'], () => {
    if (stageOf(game, SW) === 10) { flags(game, SW).read = true; game.events.emit('quest:change', { id: SW, stage: 10 }); }
    game.ui.startDialogue([
      { message: '"Here lie the wardens of the vigil. Each kept a seal of the sun for the high warden who watches still."' },
      { message: '"Three seals for three wardens: she who greeted the dawn, he who bade the dusk farewell, and the one whose eyes never closed."' },
      { message: '"The fourth sleeps. LET HIM."' },
    ]);
  });
  I.onObject('Inspect', Object.keys(COFFINS), ({ target }) => game.message(COFFINS[target.id][2]));
  I.onObject('Open', Object.keys(COFFINS), ({ player, target }) => {
    const id = target.id;
    const s = stageOf(game, SW);
    if (s !== 10) { game.message(s < 10 ? 'The lid is far too heavy to move without a reason.' : 'You have no reason to disturb the dead again.'); return; }
    const f = flags(game, SW);
    if (f[id]) {
      // lost a seal (e.g. full inventory)? the coffin still holds it
      const opened = Object.keys(COFFINS).filter((k) => f[k]).length;
      if (game.player.inventory.count('sun_seal') < opened) { give(game, 'sun_seal'); game.message('You find the sun seal you left behind in the coffin.'); }
      else game.message('You have already opened this coffin.');
      return;
    }
    game.playAnim(player, 'pickup', 1200);
    game.actions.lock(player, 2);
    f[id] = true;
    game.replaceObject(target, 'warden_coffin_opened', 300);
    if (!COFFINS[id][3]) {
      game.message('<col=8a0000>You heave the lid aside. The sleeping warden opens his sewn eyes - and they are full of sand and fury!</col>');
      f[id] = false;
      const [mx, my] = freeTileNear(game, target.x, target.y, 2, player);
      const m = game.spawnNpc('vault_mummy', mx, my, { wander: 3, respawn: false });
      aggro(game, m);
      return;
    }
    give(game, 'sun_seal');
    game.message('You heave the lid aside. On the warden\'s chest lies a warm gold seal stamped with a rayed sun.');
    game.events.emit('quest:change', { id: SW, stage: 10 });
  });
  const summon = (target) => {
    if (alive(game, boss)) { game.message('Ashkar is already awake!'); return; }
    boss = game.spawnNpc('ashkar_sun_eyed', target.x, target.y - 3, { wander: 3, respawn: false });
    if (!boss) return;
    boss.state.scarabs = 0;
    game.spawnEffect('teleport', boss, { color: 0xffd040 });
    game.say(boss, 'WHO OPENS THE EYE OF THE SUN?', { chat: false, color: '#ffd040' });
    aggro(game, boss);
  };
  I.onItemOnObject(['sun_seal'], ['sarcophagus_gilded'], ({ player, target }) => {
    if (game.world.getArea(target.x, target.y)?.id !== 'sand_vaults') { game.message('The seals do not fit this tomb.'); return; }
    const s = stageOf(game, SW);
    if (s === 30 && !has(game, 'sun_disc') && !alive(game, boss)) { give(game, 'sun_disc'); game.message('In the dust of the open sarcophagus you find the sun disc, where Ashkar dropped it.'); return; }
    if (s !== 10 && s !== 20) { game.message('Nothing interesting happens.'); return; }
    if (!has(game, 'sun_seal', 3)) { game.message('There are three hollows in the lid shaped like suns. You need three seals.'); return; }
    game.playAnim(player, 'pickup', 1000);
    game.message('You press the three sun seals into the lid. Light pours out of the cracks...');
    if (s === 10) game.quests.setStage(SW, 20);
    game.schedule(3, () => summon(target));
  });
  game.onTick((tick) => {
    if (!alive(game, boss)) return;
    const p = game.player;
    if (p.dead || game.distance(p, boss) > 12) return;
    if (scarabs.size) { const alv = [...scarabs].filter((sc) => alive(game, sc)); if (alv.length && tick % 2 === 0 && boss.hp < boss.maxHp) game.heal(boss, 2); }
    if (tick % 9 === 0) telegraph(game, boss, { color: 0xffd040, text: '<col=c08000>Ashkar\'s eyes blaze! The light gathers where you stand - move!</col>', min: 10, max: 18 });
  }, 45);
  game.events.on('damage', ({ target }) => {
    if (target !== boss || target.dead || target.hp <= 0) return;
    const n = target.state.scarabs || 0;
    if ((n === 0 && target.hp <= target.maxHp * 0.6) || (n === 1 && target.hp <= target.maxHp * 0.3)) {
      target.state.scarabs = n + 1;
      game.say(target, 'CHILDREN OF THE SUN, FEED ME!', { chat: false, color: '#ffd040' });
      for (let i = 0; i < 3; i++) {
        const [sx, sy] = freeTileNear(game, target.x + i - 1, target.y + 2, 3, game.player);
        const sc = game.spawnNpc('sand_scarab', sx, sy, { wander: 3, respawn: false });
        if (sc) { scarabs.add(sc); aggro(game, sc); }
      }
      game.message('<col=8a0000>Golden scarabs pour from the sarcophagus! While they live, Ashkar drinks their light.</col>');
    }
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id === 'sand_scarab') { scarabs.delete(npc); return; }
    if (npc.id !== 'ashkar_sun_eyed') return;
    for (const sc of scarabs) if (game.npcs.has(sc.uid)) game.kill(sc, null);
    scarabs.clear();
    if (stageOf(game, SW) === 20) {
      game.quests.setStage(SW, 30);
      game.schedule(3, () => { game.spawnGroundItem('sun_disc', 1, npc.x, npc.y, { owner: game.player.name }); game.spawnGroundItem('coins', rint(400, 900), npc.x, npc.y, { owner: game.player.name }); });
      game.message('<col=1a5a8a>Ashkar sinks to his knees. "The vigil... passes... to you..." A golden disc rolls from his hands.</col>');
    }
  });
  I.onItem('Read', ['sun_disc'], () => game.ui.startDialogue([
    { message: 'An eye is engraved at the centre of the disc. Around the rim run four runes:' },
    { message: '1: a hammer.<br>2: an open eye.<br>3: a wave.<br>4: a closed ring.' },
    { message: 'They are not sun-script. The strokes look elven.' },
  ]));
});

// =================================================================================================
// 15. The Brinecoil (Experienced) - Harbourmaster Brannoc, Gullhaven middle pier (176,189)
// =================================================================================================
const BC = 'brinecoil';
questNpc({ id: 'harbourmaster_brannoc', name: 'Harbourmaster Brannoc', examine: 'The harbourmaster of Gullhaven. He looks like he has not slept in a week.', mapIcon: QICON,
  model: { colors: { top: '#2a3a5a', legs: '#2a2a3a', hair: '#3a2a1a' }, extras: { beard: true }, equipment: { head: { shape: 'hood', color: '#2a3a5a' }, weapon: { shape: 'spear', color: '#8a8a8a' } } } });
spawnNpc('harbourmaster_brannoc', 176, 189, 1);
questNpc({ id: 'nella_netmender', name: 'Nella the net-mender', examine: 'She can mend a net faster than a serpent can tear it. Nearly.',
  model: { female: true, hairStyle: 'long', colors: { top: '#5a6a7a', legs: '#4a4a3a', hair: '#c8c8c0' } } });
spawnNpc('nella_netmender', 172, 188, 2);
questItem({ id: 'chum_bucket', name: 'Chum bucket', examine: 'A bucket of chopped fish. The smell could wake the dead, or worse.', icon: { shape: 'bucket', color: '#8a5a4a' } });
questItem({ id: 'barbed_harpoon', name: 'Barbed harpoon', examine: 'A harpoon with a cruel barbed head and a long line. Made for something big.', icon: { shape: 'spear', color: '#8a8a8a' } });
questItem({ id: 'brinecoil_scale', name: 'Brinecoil scale', examine: 'A scale as big as a shield, the colour of wet slate.', icon: { shape: 'shield', color: '#3a6a7a' } });
registerItem({ id: 'brinescale_shield', name: 'Brinescale shield', examine: 'A shield made from a single scale of the Brinecoil. Salt never rusts it.', slot: 'shield', value: 3000, tradeable: false,
  requirements: { defence: 40 }, bonuses: { defenceStab: 30, defenceSlash: 32, defenceCrush: 28, defenceMagic: 12, defenceRanged: 30, prayer: 1 },
  icon: { shape: 'round_shield', color: '#3a6a7a', color2: '#a0d0d8' }, model: { shape: 'round', color: '#3a6a7a' } });
questObject({ id: 'churning_water', name: 'Churning water', examine: 'The sea boils off the end of the pier. Something big is down there.', options: ['Inspect'], blocks: false, model: { template: 'fishing_spot' } });
spawnObj('churning_water', 189, 195);
questNpc({ id: 'brinecoil_serpent', name: 'The Brinecoil', examine: 'A sea-serpent as long as three boats, with scales like wet slate.', options: ['Attack'], dialogue: undefined,
  combatLevel: 104, aggressive: true, aggroRange: 8, boss: true, tags: ['boss'], respawnTicks: 300, wanderRadius: 1,
  stats: { attack: 76, strength: 78, defence: 70, ranged: 66, hitpoints: 180 }, maxHit: 13, attackStyle: 'slash', attackSpeed: 5, bonuses: armour(55, 25, 45),
  attacks: [{ style: 'melee', maxHit: 13, weight: 3 }, { style: 'ranged', maxHit: 11, weight: 2, range: 7, projectileColor: '#60c0e0' }],
  model: { template: 'lizard', scale: 2.1, colors: { body: '#2a5a6a', belly: '#a0c8c8', eyes: '#e0ff60' }, spikes: '#1a3a4a', horn: '#d8e8e8', glowEyes: '#e0ff60' } });
const RAW_FISH = ['raw_minnow', 'raw_perch', 'raw_mudgill', 'raw_silverling', 'raw_streamdart', 'raw_rosefin', 'raw_bog_eel', 'raw_bluescale', 'raw_rockclaw', 'raw_sabrefish', 'raw_frostfin', 'raw_greyjaw'];

registerQuest({
  id: BC, name: 'The Brinecoil', difficulty: 'Experienced', questPoints: 3, completeStage: 100,
  start: 'Speak to Harbourmaster Brannoc on the middle pier of Gullhaven.',
  description: 'A sea-serpent is tearing the nets of Gullhaven.',
  rewards: ['3 Quest Points', '5,000 Fishing XP', '3,000 Hitpoints XP', '2,500 Ranged XP', 'Brinescale shield', 'Free rides on the Gullhaven ferry'],
  onComplete: ({ game, player }) => { take(game, 'brinecoil_scale'); take(game, 'chum_bucket'); take(game, 'barbed_harpoon'); xp(player, { fishing: 5000, hitpoints: 3000, ranged: 2500 }); give(game, 'brinescale_shield'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Harbourmaster Brannoc')} on the middle pier of ${red('Gullhaven')}.`, 'Recommended: combat level 70 and good food. This quest has a boss fight.'];
    if (stage >= 100) return [strike('I lured the Brinecoil to the east pier with chum, pinned it with a barbed harpoon and slew it.'), 'The Gullhaven ferry is now free for me.', '', COMPLETE];
    const out = [strike('Something huge is tearing the nets of Gullhaven.')];
    if (stage === 10) {
      out.push(has(game, 'chum_bucket') ? strike('Nella made me a chum bucket.') : `${red('Nella the net-mender')} knows how to lure it. She wants ${red('3 raw fish')} for chum.`);
      out.push(has(game, 'barbed_harpoon') ? strike('Brannoc barbed a harpoon for me.') : `${red('Brannoc')} will barb a ${red('harpoon')} for me if I bring one.`);
      out.push(`Then I should tip the chum into the ${red('churning water')} at the end of the ${red('east pier')}.`);
    }
    if (stage === 20) out.push(strike('I lured out the Brinecoil.'), `I must kill it. When it ${red('dives')} it cannot be hurt - ${red('use the barbed harpoon')} on it to pin it at the surface.`, 'If I left the fight, I can tip the chum again.');
    if (stage === 30) out.push(strike('The Brinecoil is dead.'), `I should bring ${red('Brannoc')} one of its scales.`);
    return out;
  },
});

registerDialogue('harbourmaster_brannoc', ({ game }) => {
  const s = stageOf(game, BC);
  if (s >= 100) return [{ npc: 'Full nets, whole boats, and Cobb rows you for nothing - I told him to. Gullhaven owes you, serpent-slayer.' }];
  if (s === 30) return [
    { if: () => has(game, 'brinecoil_scale'), goto: 'scale' },
    { npc: 'Dead, you say? Then bring me a scale. Nobody in this harbour will believe it otherwise.', end: true },
    { label: 'scale', player: 'The Brinecoil is dead. Here is one of its scales.' },
    { npc: 'By the tides... it is as big as a door. My grandfather pinned the last one, and now you have killed this one.' },
    { action: () => { game.quests.complete(BC); } },
    { npc: 'Have the scale back, shaped into a shield by our best smith. And Cobb will never charge you a coin again.', end: true },
  ];
  if (s === 20) return [{ npc: 'It is out there! Pin it with the harpoon when it tries to dive, or it will wear you down. Go!' }];
  if (s === 10) return [
    { npc: 'Chum from Nella, a barbed harpoon from me. Then tip the chum off the end of the east pier and pray.' },
    { if: () => !has(game, 'barbed_harpoon') && has(game, 'harpoon'), goto: 'barb' },
    { if: () => !has(game, 'barbed_harpoon'), goto: 'need' },
    { end: true },
    { label: 'need', npc: 'Bring me a plain harpoon - Bastian sells them - and I will put a barb on it that will hold a whale.', end: true },
    { label: 'barb', player: 'I have a harpoon.' },
    { npc: 'Give it here.' },
    { action: () => { take(game, 'harpoon'); give(game, 'barbed_harpoon'); game.events.emit('quest:change', { id: BC, stage: 10 }); } },
    { message: 'Brannoc files a cruel barb into the harpoon head and knots a long line to the shaft.' },
    { npc: 'There. When it dives, put that in it. It will not dive again with my line in its side.', end: true },
  ];
  return [
    { npc: 'Another boat back with its nets in ribbons. Another one not back at all.' },
    { options: [
      { text: 'What is tearing the nets?', goto: 'what' },
      { text: 'Bad luck. Goodbye.', end: true },
    ] },
    { label: 'what', npc: 'Old Tarrow calls it the Brinecoil - a sea-serpent that comes back every thirty years. I called him a drunk. Then I saw it. It is real, and it is hungry.' },
    { npc: 'My grandfather killed the last one. "Lure it with chum, pin it with a barbed harpoon," his log says. I am too old, and my crews are too scared.' },
    { options: [
      { text: 'I will kill the Brinecoil.', action: () => { game.quests.start(BC); game.quests.setStage(BC, 10); }, goto: 'ok' },
      { text: 'Fight a sea-serpent? No.', end: true },
    ] },
    { label: 'ok', npc: 'Gods bless you. Talk to Nella about the chum - she is mending nets on the front. And bring me a harpoon to barb.', end: true },
  ];
});
registerDialogue('nella_netmender', ({ game }) => {
  const s = stageOf(game, BC);
  const fish = () => RAW_FISH.filter((id) => has(game, id)).reduce((a, id) => a + game.player.inventory.count(id), 0);
  if (s === 10 && !has(game, 'chum_bucket')) return [
    { npc: 'Chum? Aye, the serpent follows its nose. Bring me three raw fish - any kind - and I will chop you a bucket that it cannot resist.' },
    { if: () => fish() >= 3, goto: 'make' },
    { player: 'I will get some fish.', end: true },
    { label: 'make', player: 'Here are three raw fish.' },
    { action: () => {
      let left = 3;
      for (const id of RAW_FISH) { while (left > 0 && has(game, id)) { take(game, id); left--; } }
      give(game, 'chum_bucket');
      game.events.emit('quest:change', { id: BC, stage: 10 });
    } },
    { message: 'Nella chops the fish into a horrible paste and scrapes it into a bucket.' },
    { npc: 'Tip it off the end of the east pier, where the water churns. Then run, or fight. Your choice.', end: true },
  ];
  if (s >= 100) return [{ npc: 'Not a single torn net this week! I am going to have to find a new hobby.' }];
  return [
    { npc: 'Mind the hooks, love.' },
    { options: [{ text: 'Busy?', goto: 'busy' }, { text: 'Goodbye.', end: true }] },
    { label: 'busy', npc: 'Always. Every net in Gullhaven passes through these hands. Lately they come back in more holes than net.', end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  let serp = null;
  I.onObject('Inspect', ['churning_water'], () => game.message('The water heaves and swirls. Now and then a ridge of slate-grey scales breaks the surface.'));
  I.onItemOnObject(['chum_bucket'], ['churning_water'], ({ player, target }) => {
    const s = stageOf(game, BC);
    if (s === 30 && !has(game, 'brinecoil_scale')) { give(game, 'brinecoil_scale'); game.message('No serpent comes - but a great slate-grey scale washes up against the pier. You fish it out.'); return; }
    if (s !== 10 && s !== 20) { game.message('Nothing interesting happens.'); return; }
    if (alive(game, serp)) { game.message('The Brinecoil is already here!'); return; }
    if (!has(game, 'barbed_harpoon')) { game.message('You should not lure it out without something to pin it with. Brannoc can barb a harpoon for you.'); return; }
    game.playAnim(player, 'pickup', 900);
    game.message('You tip the chum into the churning water. For a moment, nothing... then the sea erupts!');
    if (s === 10) game.quests.setStage(BC, 20);
    game.schedule(3, () => {
      const [sx, sy] = freeTileNear(game, target.x - 1, target.y - 1, 3, player);
      serp = game.spawnNpc('brinecoil_serpent', sx, sy, { wander: 1, respawn: false });
      if (!serp) return;
      serp.state.diveUntil = 0; serp.state.pinned = false;
      game.spawnEffect('splash', serp, {});
      game.say(serp, 'HSSSSSSSS!', { chat: false, color: '#60c0e0' });
      aggro(game, serp);
    });
  });
  const diving = () => alive(game, serp) && (serp.state.diveUntil || 0) > game.tickCount;
  game.onTick((tick) => {
    if (!alive(game, serp)) return;
    const p = game.player;
    if (p.dead || game.distance(p, serp) > 12) return;
    if (!serp.state.pinned && !diving() && tick % 14 === 0) {
      serp.state.diveUntil = tick + 5;
      game.spawnEffect('splash', serp, {});
      game.message('<col=8a0000>The Brinecoil dives beneath the waves! Use the barbed harpoon on it to pin it!</col>');
    }
    if (serp.state.diveUntil && serp.state.diveUntil === tick) {
      game.spawnEffect('splash', serp, {});
      game.message('The Brinecoil bursts from the water and lashes its tail!');
      if (game.distance(p, serp) <= 2) game.applyDamage(p, rint(6, 12), { source: serp, type: 'typeless' });
    }
  }, 45);
  game.events.on('damage:before', (e) => {
    if (e.target !== serp || !diving() || !(e.amount > 0)) return;
    e.amount = 0;
    if (e.source === game.player && Math.random() < 0.5) game.message('Your attack splashes harmlessly into the water. The serpent is under the surface!');
  });
  I.onItemOnNpc(['barbed_harpoon'], ['brinecoil_serpent'], ({ player, target }) => {
    if (target.state.pinned) { game.message('The serpent is already pinned.'); return; }
    game.playAnim(player, 'stab', 900);
    target.state.pinned = true; target.state.diveUntil = 0;
    game.applyDamage(target, 15, { source: player, type: 'typeless' });
    game.message('<col=1a5a8a>You drive the barbed harpoon deep into the Brinecoil\'s side and brace the line. It thrashes - but it cannot dive!</col>');
    if (game.combat?.retaliate) game.combat.retaliate(target, player);
  }, { range: 1 });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id !== 'brinecoil_serpent') return;
    if (stageOf(game, BC) === 20) {
      game.quests.setStage(BC, 30);
      game.schedule(3, () => { game.spawnGroundItem('brinecoil_scale', 1, npc.x, npc.y, { owner: game.player.name }); game.spawnGroundItem('raw_greyjaw', 3, npc.x, npc.y, { owner: game.player.name }); });
      game.message('<col=1a5a8a>The Brinecoil slumps across the pier with a crash that rattles every window in Gullhaven.</col>');
    }
  });
});

// =================================================================================================
// 16. Trial by Bog (Intermediate, mystery) - Reeve Odelia Sump, Bogwick (96,187)
// =================================================================================================
const TB = 'trial_by_bog';
questNpc({ id: 'reeve_odelia', name: 'Reeve Odelia Sump', examine: 'The reeve of Bogwick. She would very much like everyone to calm down.', mapIcon: QICON,
  model: { female: true, hairStyle: 'long', colors: { top: '#4a5a3a', legs: '#3a3a2a', hair: '#6a3a1a' }, equipment: { neck: { shape: 'amulet', color: '#a08a5a' } } } });
spawnNpc('reeve_odelia', 96, 187, 1);
questNpc({ id: 'hedgewitch_morwen', name: 'Morwen', examine: 'Bogwick\'s hedgewitch. Accused of everything; guilty, mostly, of knowing things.', options: ['Talk-to', 'Trade'], shop: 'bogwick_remedies',
  mapIcon: { char: 'H', color: '#60d060' }, model: { female: true, hairStyle: 'long', colors: { top: '#3a4a2a', legs: '#2a3a2a', hair: '#1a1a1a' }, equipment: { head: { shape: 'wizard_hat', color: '#3a4a2a' } } } });
spawnNpc('hedgewitch_morwen', 89, 182, 1);
questNpc({ id: 'silas_crane', name: 'Silas Crane', examine: 'A travelling remedy-seller in a tall green hat. His smile has a lot of teeth.', options: ['Talk-to', 'Trade'], shop: 'cranes_wares',
  model: { scale: 1.1, colors: { top: '#3a6a3a', legs: '#2a2a2a', hair: '#1a1a1a' }, equipment: { head: { shape: 'wizard_hat', color: '#2a6a2a' }, cape: { shape: 'cape', color: '#2a4a2a' } } } });
spawnNpc('silas_crane', 92, 184, 2);
questNpc({ id: 'child_tadpole', name: 'Tadpole', examine: 'A Bogwick child. Mud up to the eyebrows.', model: { scale: 0.62, colors: { top: '#6a8a3a', legs: '#4a4a2a', hair: '#8a5a2a' } } });
spawnNpc('child_tadpole', 90, 195, 3);
questItem({ id: 'cranes_ledger', name: "Crane's ledger", examine: 'Purchases: blightroot, nine sacks. Sales: Cure-All, two hundred bottles. Profit: considerable.', icon: { shape: 'book', color: '#2a5a2a' } });
registerItem({ id: 'bogwalker_boots', name: 'Bogwalker boots', examine: 'Waxed boots from Morwen\'s own hand. Mud slides right off.', slot: 'feet', value: 700, tradeable: false,
  bonuses: { defenceStab: 3, defenceSlash: 3, defenceCrush: 3, defenceMagic: 2, prayer: 2 }, icon: { shape: 'boots', color: '#4a5a3a' }, model: { color: '#4a5a3a' } });
questObject({ id: 'eel_trap', name: 'Eel trap', examine: 'A wicker eel trap. The eels inside are not moving much.', options: ['Inspect'], model: { template: 'dec_market_crate', goods: '#6a7a5a' } });
spawnObj('eel_trap', 94, 202);
questObject({ id: 'crane_bottle', name: 'Smashed bottle', examine: 'Blue glass, glinting in the mud by the channel.', options: ['Inspect'], blocks: false, model: { template: 'q_clue', color: '#3a6ac8' } });
spawnObj('crane_bottle', 110, 184);
questNpc({ id: 'silas_crane_hostile', name: 'Silas Crane', examine: 'Cornered, furious, and throwing bottles.', options: ['Attack'], dialogue: undefined,
  combatLevel: 30, aggressive: true, aggroRange: 8, respawnTicks: 999, wanderRadius: 2, stats: { attack: 22, strength: 20, defence: 24, ranged: 30, hitpoints: 40 }, maxHit: 5, attackStyle: 'ranged', attackRange: 5,
  projectileColor: '#3a6ac8', attacks: [{ style: 'ranged', maxHit: 5, weight: 3, range: 5, projectileColor: '#3a6ac8' }, { style: 'ranged', maxHit: 3, weight: 1, range: 5, projectileColor: '#60ff60', effect: 'poison' }],
  model: { scale: 1.1, colors: { top: '#3a6a3a', legs: '#2a2a2a', hair: '#1a1a1a' }, equipment: { head: { shape: 'wizard_hat', color: '#2a6a2a' }, cape: { shape: 'cape', color: '#2a4a2a' } } } });
questNpc({ id: 'blight_toad', name: 'Blighted toad', examine: 'One of Crane\'s test subjects. It is not happy about it.', options: ['Attack'], dialogue: undefined,
  combatLevel: 9, aggressive: true, aggroRange: 6, respawnTicks: 999, wanderRadius: 2, stats: { attack: 7, strength: 6, defence: 5, hitpoints: 10 }, maxHit: 2, attackStyle: 'crush',
  model: { template: 'toad', colors: { body: '#4a6a1a', belly: '#a8c860' } } });

const CLUE_KEYS = ['trap', 'bottle', 'tadpole'];
const TALK_KEYS = ['morwen', 'silas', 'gobbet'];
registerQuest({
  id: TB, name: 'Trial by Bog', difficulty: 'Intermediate', questPoints: 2, completeStage: 100,
  start: 'Speak to Reeve Odelia Sump on the boardwalks of Bogwick.',
  description: 'Bogwick wants to dunk its hedgewitch for poisoning the eels. Someone should find out who really did it.',
  rewards: ['2 Quest Points', '2,500 Herblore XP', '1,500 Thieving XP', '1,000 Prayer XP', 'Bogwalker boots', "Access to Morwen's hidden shelf"],
  onComplete: ({ game, player }) => { take(game, 'cranes_ledger'); xp(player, { herblore: 2500, thieving: 1500, prayer: 1000 }); give(game, 'bogwalker_boots'); },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Reeve Odelia Sump')} in ${red('Bogwick')}.`];
    if (stage >= 100) return [strike('I proved that Silas Crane poisoned the bog to sell his Cure-All, and saved Morwen from a dunking.'), '', COMPLETE];
    const f = flags(game, TB);
    const out = [strike('Bogwick blames Morwen the hedgewitch for the sick eels.')];
    if (stage === 10) {
      out.push('Clues:');
      out.push(f.trap ? strike('The dying eels reek of lamp oil and sour roots - blightroot.') : `Inspect the ${red('eel trap')} at the jetty.`);
      out.push(f.bottle ? strike("A smashed bottle of Crane's Cure-All by the east channel, with the same bitter smell.") : `Look along the ${red('east channel')}.`);
      out.push(f.tadpole ? strike('Tadpole saw a tall man in a green hat pouring something into the water at night.') : `Ask the ${red('children')} if they saw anything.`);
      out.push('People:');
      out.push(f.morwen ? strike('Morwen brews marshmint fever tonic and warns that blightroot must never go in the water.') : `Talk to ${red('Morwen')} in her hut.`);
      out.push(f.silas ? strike('Silas Crane sells a Cure-All and blames Morwen loudly.') : `Talk to ${red('Silas Crane')}, the remedy-seller.`);
      out.push(f.gobbet ? strike('Gobbet says Crane has been paying for rounds with a fat purse since the eels sickened.') : `Talk to ${red('Gobbet Pike')} at the Sunken Boot.`);
      out.push(`When I know who did it, I should tell ${red('Reeve Odelia')}.`);
    }
    if (stage === 40) out.push(strike('I named Silas Crane. He fled across the stepping stones.'), `I must catch him on ${red('Thrush Isle')} and bring back proof.`);
    if (stage === 50) out.push(strike("I caught Silas Crane on Thrush Isle and took his ledger."), `I should give ${red("Crane's ledger")} to ${red('Reeve Odelia')}.`);
    return out;
  },
});

registerDialogue('reeve_odelia', ({ game }) => {
  const s = stageOf(game, TB);
  const f = flags(game, TB);
  if (s >= 100) return [{ npc: 'Morwen is brewing a cure for the eels, Crane is in the stocks, and nobody is getting dunked. A good week for Bogwick.' }];
  if (s === 50) return [
    { if: () => has(game, 'cranes_ledger'), goto: 'l' },
    { npc: 'You caught him? Where is the proof? Bogwick folk will want to see it written down.', end: true },
    { label: 'l', player: "Crane's ledger. Nine sacks of blightroot bought, two hundred bottles of Cure-All sold." },
    { npc: 'He poisoned our eels so he could sell us the cure. The snake. The SNAKE. Into the stocks with him - and somebody fetch Morwen an apology and a cake.' },
    { action: () => { game.quests.complete(TB); }, end: true },
  ];
  if (s === 40) return [{ npc: 'Crane ran off across the stepping stones to Thrush Isle! Catch him, and bring me something that proves what he did.' }];
  if (s === 10) return [
    { npc: 'The village wants to dunk Morwen at sundown. Have you found anything?' },
    { if: () => CLUE_KEYS.filter((k) => f[k]).length < 3 || !(f.morwen && f.silas), goto: 'notyet' },
    { title: 'Who poisoned the bog?', options: [
      { text: 'Morwen the hedgewitch.', goto: 'wrongm' },
      { text: 'Silas Crane, the remedy-seller.', goto: 'right' },
      { text: 'Gobbet Pike of the Sunken Boot.', goto: 'wrongg' },
      { text: 'I am not sure yet.', end: true },
    ] },
    { label: 'notyet', npc: 'Then keep looking - the eel trap at the jetty, the channels, and ask around. Talk to Morwen herself, too. And that pedlar.', end: true },
    { label: 'wrongm', npc: 'That is what everyone says. But you are supposed to be looking at the evidence, not the gossip. Look again.', end: true },
    { label: 'wrongg', npc: 'Gobbet? He waters his ale, not the bog. Think it through.', end: true },
    { label: 'right', player: 'Silas Crane. The bottle by the channel is his Cure-All and it smells of blightroot, like the eels. Tadpole saw a man in a green hat pouring something in at night. And he got rich the moment the eels sickened.' },
    { npc: 'Crane! Of course - the poison and the cure from the same man. Somebody grab... oh, for... HE IS RUNNING! He is off across the stepping stones to Thrush Isle!' },
    { action: () => { game.quests.setStage(TB, 40); game.events.emit('east:silas_hide'); } },
    { npc: 'After him! And bring me proof - his books, his bottles, anything.', end: true },
  ];
  return [
    { npc: 'Order! ORDER! Oh - a stranger. Sorry. We are about to drown a witch, it has been a very long day.' },
    { options: [
      { text: 'Drown a witch?!', goto: 'why' },
      { text: 'I will leave you to it.', end: true },
    ] },
    { label: 'why', npc: 'The eels are dying, two children are sick, and the water tastes of bitterness. Half the village says Morwen cursed it. The other half says Morwen cursed it louder.' },
    { npc: 'I do not believe it. But I need proof, or I cannot stop them. Will you look into it before sundown?' },
    { options: [
      { text: 'I will find out what really happened.', action: () => { game.quests.start(TB); game.quests.setStage(TB, 10); }, goto: 'ok' },
      { text: 'Not my village, not my problem.', end: true },
    ] },
    { label: 'ok', npc: 'Thank you! The sick eels are in the trap by the jetty. Morwen lives in the hut on the north boardwalk. And please hurry.', end: true },
  ];
});
const clue = (key) => ({ action: ({ game }) => { flags(game, TB)[key] = true; game.events.emit('quest:change', { id: TB, stage: 10 }); } });
registerDialogue('hedgewitch_morwen', ({ game }) => {
  const s = stageOf(game, TB);
  if (s >= 100) return [
    { npc: 'They brought me a cake. An apology AND a cake. I may live here forever now.' },
    { options: [
      { text: 'Let me see your remedies.', action: () => { game.ui.openShop('bogwick_remedies'); return false; } },
      { text: 'What is on your hidden shelf?', action: () => { game.ui.openShop('bogwick_hidden_shelf'); return false; } },
      { text: 'Goodbye.', end: true },
    ] },
  ];
  if (s === 10) return [
    { npc: 'Come to see the witch before they dunk her? Look all you like. That is marshmint in the cauldron - for the sick children. Fever tonic.' },
    { player: 'The eels smell of lamp oil and sour roots.' },
    { npc: 'Blightroot. Never, ever into the water - it kills eels and sickens children, exactly as we see. I would no more pour blightroot in the bog than drink it.' },
    { npc: 'And I have not bought blightroot in years. Somebody has. Ask who has been spending money lately.' },
    clue('morwen'),
    { end: true },
  ];
  return [
    { npc: 'Remedies for every ill the bog can give you. And most of the ones it cannot.' },
    { options: [{ text: 'Let me see your remedies.', action: () => { game.ui.openShop('bogwick_remedies'); return false; } }, { text: 'Goodbye.', end: true }] },
  ];
});
registerDialogue('silas_crane', ({ game }) => {
  const s = stageOf(game, TB);
  return [
    { npc: "Crane's Cure-All! Cures bog fever, eel-rot and heartbreak! Only fifty coins!" },
    ...(s === 10 ? [
      { player: 'What do you think is poisoning the bog?' },
      { npc: 'The witch, obviously! Everyone knows it! Curses! Hexes! Terrible business. Luckily, my Cure-All cures curses too. Fifty coins.' },
      { player: 'Nice hat.' },
      { npc: 'Green is the colour of good health, friend. Buy a bottle, or move along.' },
      clue('silas'),
    ] : []),
    { options: [{ text: 'Let me see your wares.', action: () => { game.ui.openShop('cranes_wares'); return false; } }, { text: 'No thanks.', end: true }] },
  ];
});
registerDialogue('child_tadpole', ({ game }) => {
  const s = stageOf(game, TB);
  if (s === 10) return [
    { npc: 'Are you going to dunk Morwen? Please don\'t. She gave me honey when I had the fever.' },
    { player: 'Did you see anything strange near the water?' },
    { npc: 'I am not supposed to be out at night. But if I WAS out at night, I MIGHT have seen a tall man in a green hat pouring a bottle into the east channel. Hypothetically.' },
    clue('tadpole'),
    { npc: 'Don\'t tell Mum.', end: true },
  ];
  return [{ npc: 'I caught a frog THIS big! It got away. It was THIS big.' }];
});
registerDialogue('gobbet', ({ game }) => {
  const s = stageOf(game, TB);
  const shop = { action: () => { game.ui.openShop('bogwick_tavern'); return false; } };
  return [
    { npc: 'Welcome to the Sunken Boot. Eel pie\'s hot, cider\'s cold.' },
    { options: [
      { text: 'Let me see what you have.', ...shop },
      ...(s === 10 ? [{ text: 'What do you make of the poisoned bog?', goto: 'bog' }] : []),
      { text: 'Why the Sunken Boot?', goto: 'boot' },
      { text: 'Goodbye.', end: true },
    ] },
    { label: 'boot', npc: 'I lost the other boot in the bog, the year I opened. Hence the name. People think it\'s poetic.', end: true },
    { label: 'bog', npc: 'Bad for business, that\'s what. Nobody wants eel pie with no eel.' },
    { npc: 'Funny thing, mind. That Crane fellow\'s been buying rounds for the whole tavern since the eels went sick. Fat purse. Selling a lot of his Cure-All, I suppose.' },
    clue('gobbet'),
    { end: true },
  ];
});

hook((game) => {
  const I = game.interactions;
  let foe = null;
  const toads = new Set();
  I.onObject('Inspect', ['eel_trap'], ({ player }) => {
    game.playAnim(player, 'pickup', 900);
    if (stageOf(game, TB) !== 10) { game.message('A wicker eel trap.' + (stageOf(game, TB) > 10 ? ' The eels look a little livelier.' : '')); return; }
    flags(game, TB).trap = true; game.events.emit('quest:change', { id: TB, stage: 10 });
    game.message('The eels inside are pale and barely moving. An oily, bitter film clings to the wicker - it smells of lamp oil and sour roots.');
  });
  I.onObject('Inspect', ['crane_bottle'], ({ player }) => {
    game.playAnim(player, 'pickup', 900);
    if (stageOf(game, TB) !== 10) { game.message('Broken blue glass.'); return; }
    flags(game, TB).bottle = true; game.events.emit('quest:change', { id: TB, stage: 10 });
    game.message("A smashed blue bottle. The label reads \"CRANE'S CURE-ALL\". The dregs inside smell of lamp oil and sour roots - just like the eels.");
  });
  // Silas leaves Bogwick once accused (local hide; he is a shared map NPC)
  const hideSilas = () => {
    const s = stageOf(game, TB);
    for (const n of game.npcs.values()) if (n.id === 'silas_crane') n.hidden = s >= 40;
  };
  game.events.on('east:silas_hide', hideSilas);
  game.events.on('game:ready', hideSilas);
  game.events.on('npc:respawn', ({ npc }) => { if (npc?.id === 'silas_crane') hideSilas(); });
  const ambush = () => {
    if (stageOf(game, TB) !== 40 || alive(game, foe)) return;
    foe = game.spawnNpc('silas_crane_hostile', 79, 212, { wander: 2, respawn: false });
    if (!foe) return;
    game.say(foe, 'You will never take me alive! Toads - to me!', { chat: false, color: '#80ff80' });
    aggro(game, foe);
    for (const [x, y] of [[77, 212], [80, 214]]) { const t = game.spawnNpc('blight_toad', x, y, { wander: 2, respawn: false }); if (t) { toads.add(t); aggro(game, t); } }
  };
  game.events.on('area:enter', ({ area }) => {
    if (area?.id !== 'thrush_isle') return;
    ambush();
    if (stageOf(game, TB) === 50 && !has(game, 'cranes_ledger') && !game.groundItemsAt(79, 212).some((g) => g.id === 'cranes_ledger')) {
      game.spawnGroundItem('cranes_ledger', 1, 79, 212, { owner: game.player.name });
      game.message("Crane's ledger still lies in the flowers where he fell.");
    }
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id === 'blight_toad') { toads.delete(npc); return; }
    if (npc.id !== 'silas_crane_hostile') return;
    for (const t of toads) despawn(game, t);
    toads.clear();
    if (stageOf(game, TB) === 40) {
      game.quests.setStage(TB, 50);
      game.schedule(3, () => game.spawnGroundItem('cranes_ledger', 1, npc.x, npc.y, { owner: game.player.name }));
      game.message('<col=1a5a8a>Crane collapses into the flowers, wheezing. A ledger slips out of his coat.</col>');
    }
  });
  I.onNpc('Trade', ['hedgewitch_morwen'], () => game.ui.openShop('bogwick_remedies'));
});

// =================================================================================================
// 17. The Ember Under the Mountain (Master, epic) - Thane Hargrim Ironvein, Durnhold Great Hall (212,62)
// =================================================================================================
const EU = 'ember_under_mountain';
const EPIC_REQ = [['forge_heart', 'The Forge-Heart of Durnhold'], ['stars_over_bramblemoor', 'Stars over Bramblemoor'], [SW, 'The Sun-Eyed Warden']];
questNpc({ id: 'thane_hargrim', name: 'Thane Hargrim Ironvein', examine: 'Thane of Durnhold, heir of Borrik. A crown of black iron sits heavy on his brow.', mapIcon: QICON,
  model: DWARF({ top: '#5a1a1a', legs: '#2a2a2a', hair: '#3a2a1a' }, { scale: 0.85, extras: { beard: true, crown: '#2a2a2a' }, equipment: { body: 'steel_platebody', cape: { shape: 'cape', color: '#8a1a1a', color2: '#c8a040' }, weapon: 'verdite_warhammer' } }) });
spawnNpc('thane_hargrim', 212, 62, 1);
questItem({ id: 'warden_cipher', name: 'Warden cipher', examine: "Loremaster Faelith's key to the old elven ward-runes.", options: ['Read'], icon: { shape: 'scroll', color: '#c8d8ff' } });
questItem({ id: 'crystal_flask', name: 'Crystal flask', examine: 'An empty elven flask.', icon: { shape: 'potion', color: '#e0f0ff' } });
questItem({ id: 'moonwater_flask', name: 'Flask of moonwater', examine: 'Water from the Moonwell. It glows silver in the dark.', icon: { shape: 'potion', color: '#c0d8ff' } });
questItem({ id: 'oathfire_ember', name: 'Oathfire ember', examine: 'A coal from the great hearth of Durnhold, in a little iron cage. It breathes.', icon: { shape: 'gem', color: '#ff6a10' } });
questItem({ id: 'runed_ingot', name: 'Runed ingot', examine: 'An ingot of old dwarven steel stamped with a closed eye inside a ring of fire.', icon: { shape: 'bar', color: '#8a8a9a', color2: '#ff6a10' } });
questItem({ id: 'wyrmbinder_brand', name: 'Wyrmbinder brand', examine: 'A rod of runed steel, its head set with the sun disc. Forge-fire, moonwater and the watcher\'s light.', icon: { shape: 'staff', color: '#8a8a9a', color2: '#f0c040' } });
questItem({ id: 'velkesh_scale', name: "Vel'Kesh's scale", examine: 'A scale from the Under-King, still too hot to hold for long.', icon: { shape: 'shield', color: '#5a1a10', color2: '#ff6a10' } });
registerItem({ id: 'underking_cape', name: 'Cape of the Under-King', examine: 'Woven by dwarves and elves from threads of wyrm-scale. It is always warm.', slot: 'cape', value: 8000, tradeable: false,
  bonuses: { attackStab: 6, attackSlash: 6, attackCrush: 6, attackMagic: 6, attackRanged: 6, defenceStab: 8, defenceSlash: 8, defenceCrush: 8, defenceMagic: 8, defenceRanged: 8, strength: 5, rangedStrength: 3, magicDamage: 2, prayer: 4 },
  icon: { shape: 'cape', color: '#5a1a10', color2: '#ff8a20' }, model: { color: '#5a1a10', color2: '#ff8a20' } });
questObject({ id: 'forgeheart_vent', name: 'Forgeheart vent', examine: 'A crack in the obsidian floor. Something below is breathing - slowly, hugely.', options: ['Inspect'], model: { template: 'q_vent' } });
spawnObj('forgeheart_vent', 205, 249);
questNpc({ id: 'velkesh_under_king', name: "Vel'Kesh, the Under-King", examine: 'The wyrm beneath the Greyspine. The heat of every dwarven forge was once his breath.', options: ['Attack'], dialogue: undefined,
  combatLevel: 204, aggressive: true, aggroRange: 12, size: 2, boss: true, tags: ['dragon', 'boss'], dragonfire: true, respawnTicks: 500, wanderRadius: 2,
  stats: { attack: 140, strength: 145, defence: 118, magic: 120, hitpoints: 300 }, maxHit: 22, attackStyle: 'slash', attackSpeed: 5, bonuses: armour(65, 45, 65),
  attacks: [{ style: 'melee', maxHit: 22, weight: 3 }, { style: 'magic', maxHit: 45, weight: 1, range: 7, projectileColor: '#ff6a10', effect: 'dragonfire' }],
  model: { template: 'glow_dragon', scale: 0.9, colors: { body: '#3a1a14', belly: '#c85a1a', horn: '#1a1a1a' }, wings: '#2a1008', spikes: '#ff6a10', glowEyes: '#ffd040', breath: '#ff6a10' } });
questNpc({ id: 'magma_whelp', name: 'Magma whelp', examine: 'A lump of living lava that wants to be a wyrm when it grows up.', options: ['Attack'], dialogue: undefined,
  combatLevel: 62, aggressive: true, aggroRange: 10, respawnTicks: 999, wanderRadius: 3, stats: { attack: 50, strength: 52, defence: 45, hitpoints: 50 }, maxHit: 8, attackStyle: 'crush',
  model: { template: 'magma_golem', scale: 0.55 } });

registerQuest({
  id: EU, name: 'The Ember Under the Mountain', difficulty: 'Master', questPoints: 5, completeStage: 100,
  start: 'Speak to Thane Hargrim Ironvein in the Great Hall of Durnhold.',
  description: 'The mountain under Durnhold is breathing. Dwarves, elves, a starcaller and a sun-priest\'s disc must bind what sleeps beneath it.',
  rewards: ['5 Quest Points', '2 Greater Lamps of Insight (10,000 XP each)', '10,000 Smithing XP', '7,500 Magic XP', '7,500 Hitpoints XP', 'Cape of the Under-King'],
  onComplete: ({ game, player }) => {
    for (const id of ['velkesh_scale', 'wyrmbinder_brand', 'warden_cipher', 'crystal_flask']) take(game, id, 5);
    xp(player, { smithing: 10000, magic: 7500, hitpoints: 7500 }); give(game, 'greater_insight_lamp', 2); give(game, 'underking_cape');
  },
  journal: (stage, { game }) => {
    if (!stage) return [`I can start this quest by speaking to ${red('Thane Hargrim Ironvein')} in the ${red('Great Hall of Durnhold')}.`, 'Requirements:',
      ...EPIC_REQ.map(([id, n]) => (done(game, id) ? strike(n) : red(n))), game.player.skills.getLevel('smithing') >= 45 ? strike('Smithing 45') : red('Smithing 45'), 'Recommended: combat level 100+, a Wyrmward shield, plenty of food. This quest ends with a very dangerous boss.'];
    if (stage >= 100) return [strike("The Under-King Vel'Kesh is bound beneath the Greyspine once more, by forge-fire, moonwater and the watcher's light."), '', COMPLETE];
    const f = flags(game, EU);
    const out = [strike('The mountain under Durnhold is breathing, and the Thane wants to know why.')];
    if (stage === 10) out.push(`I should ask ${red('Starcaller Orrin Vale')} about the Wyrm in the sky.`);
    if (stage === 20) out.push(strike('The Wyrm is a warning drawn by the Sun-Wardens.'), has(game, 'sun_disc') ? `I should bring the ${red('sun disc')} to ${red('Orrin')}.` : `I should borrow the ${red('sun disc')} from ${red('Excavator Tamsin')}, then bring it to ${red('Orrin')}.`);
    if (stage === 30) out.push(strike('The disc watches something under the Greyspine. Its runes are elven.'), `I should take it to ${red('Loremaster Faelith')} in the ${red('Ilvaren Archive')} and translate the runes with her cipher.`);
    if (stage === 40) {
      out.push(strike('The runes say: bind him with forge-fire, the watcher\'s light and moonwater.'));
      out.push(has(game, 'oathfire_ember') ? strike('I have an oathfire ember.') : `Get an ${red('oathfire ember')} from ${red('Forgemaster Brunna')}.`);
      out.push(has(game, 'moonwater_flask') ? strike('I have a flask of moonwater.') : `Fill the ${red('crystal flask')} at the ${red('Moonwell')} in Ilvaren.`);
      out.push(has(game, 'runed_ingot') ? strike('I have the Thane\'s runed ingot.') : `Ask ${red('Thane Hargrim')} for the runed ingot.`);
      out.push(`Then forge them, with the ${red('sun disc')}, into a brand on the ${red('great anvil')} in the Forge Hall. (Smithing 45, hammer)`);
    }
    if (stage === 50) out.push(strike('I forged the Wyrmbinder brand.'), `I must go down ${red('Hollowpick Mine')} to the ${red('Forgeheart')} and use the brand on the ${red('vent')} there. Then survive.`,
      "Vel'Kesh breathes dragonfire; a Wyrmward shield will help. When the ground glows beneath me, I must move. Magma whelps shield him while they live.");
    if (stage === 60) out.push(strike("Vel'Kesh is bound."), `I should return to ${red('Thane Hargrim')}.`);
    if (f.note) out.push('', `<col=6a6a6a>${f.note}</col>`);
    return out;
  },
});

registerDialogue('thane_hargrim', ({ game }) => {
  const s = stageOf(game, EU);
  if (s >= 100) return [{ npc: 'The mountain sleeps, the forges burn, and the Stonemug has named a stout after you. It is terrible. Drink it anyway, it is an honour.' }];
  if (s === 60) return [
    { player: "It is done. Vel'Kesh is bound beneath the mountain again." },
    { npc: 'I felt the mountain go still. For the first time since I took the crown, I can hear myself think.' },
    { npc: 'Borrik lit our forges from a sleeping wyrm\'s breath and never told his children. Now we know. Now we will keep the watch ourselves - dwarf, elf and sun-priest\'s heir together.' },
    { action: () => { game.quests.complete(EU); } },
    { npc: 'Take this cape, woven from the Under-King\'s own shed scale by our weavers and Ilvaren\'s. And these lamps - learn something. You have earned the right.', end: true },
  ];
  if (s === 50) return [{ npc: 'Down Hollowpick to the Forgeheart. Bind him, or the Greyspine burns. No pressure.' }];
  if (s === 40) return [
    { npc: 'Forge-fire, moonwater and the watcher\'s light. And the ingot - the old runed ingot from Borrik\'s strongroom.' },
    { if: () => has(game, 'runed_ingot') || has(game, 'wyrmbinder_brand'), goto: 'have' },
    { npc: 'Here. It carries the closed eye in a ring of fire - the mark nobody could name. Borrik knew. Borrik always knew.' },
    { action: () => { give(game, 'runed_ingot'); game.events.emit('quest:change', { id: EU, stage: 40 }); }, end: true },
    { label: 'have', npc: 'You have the ingot. Get to the great anvil when you have the rest.', end: true },
  ];
  if (s > 0) return [{ npc: s === 10 ? 'Go to the Starcaller. He has been writing to me for months about stars. I wrote back about beer. I may owe him an apology.' : 'Follow the trail, friend. The mountain breathes louder every night.' }];
  const missing = EPIC_REQ.filter(([id]) => !done(game, id));
  return [
    { npc: 'Can you hear it? Put your hand on the floor. There. The mountain is BREATHING.' },
    { options: [
      { text: 'What is happening to the mountain?', goto: 'what' },
      { text: 'I would rather not touch your floor.', end: true },
    ] },
    { label: 'what', npc: 'Since Brunna relit the Forge-Heart, the deep seams sing, Hollowpick runs hot, and the starcaller writes that some "Wyrm" in the sky is touching the moon.' },
    { if: () => missing.length > 0, goto: 'notready' },
    { if: () => game.player.skills.getLevel('smithing') < 45, goto: 'nosmith' },
    { npc: 'You relit our forge, read the starcaller\'s sky and woke the sun-priest in his tomb. If anyone can find out what lies under my hold, it is you.' },
    { options: [
      { text: 'I will find out what sleeps beneath Durnhold.', action: () => { game.quests.start(EU); game.quests.setStage(EU, 10); }, goto: 'ok' },
      { text: 'Not yet.', end: true },
    ] },
    { label: 'ok', npc: 'Start with Orrin Vale, the Starcaller, in his spire on Bramblemoor. And hurry - the stout is going warm in the barrels.', end: true },
    { label: 'notready', npc: () => `I need someone who knows this land better. Come back when you have done more for the east: ${missing.map((m) => m[1]).join(', ')}.`, end: true },
    { label: 'nosmith', npc: 'I need someone who can work steel at the great anvil. Come back when your Smithing is at least 45.', end: true },
  ];
});

/** Epic-stage lines for NPCs whose dialogues live elsewhere (checked first by those dialogues). */
function getEpic(game, npcId) {
  const s = stageOf(game, EU);
  if (!s || s >= 100) return null;
  if (npcId === 'starcaller_orrin') {
    if (s === 10) return [
      { player: 'The Thane of Durnhold says his mountain is breathing.' },
      { npc: 'Breathing! Of course it is breathing! The Wyrm in the sky is not a constellation - it is a WARNING. Somebody drew it on the sky to say: something sleeps, and when this touches the moon, it wakes.' },
      { npc: 'Who draws warnings on the sky? Sun-priests. The Sun-Wardens. That excavator has their disc, has she not? Bring it to me - I want to look at it through the orrery.' },
      { action: () => { game.quests.setStage(EU, 20); }, end: true },
    ];
    if (s === 20) return [
      { if: () => has(game, 'sun_disc'), goto: 'd' },
      { npc: 'The sun disc! From the excavator at the temple, in the Sunscar. Go!', end: true },
      { label: 'd', player: 'Here is the sun disc.' },
      { message: 'Orrin holds the disc up to the orrery. Light pours through the engraved eye and paints a picture on the ceiling: the Greyspine, and beneath it, a coiled shape.' },
      { npc: 'It is a ward-eye. The Sun-Wardens made it to WATCH the sleeper under the Greyspine. And these runes around the rim are not sun-script. They are elven.' },
      { npc: 'Take it to the Ilvaren Archive. Loremaster Faelith reads every script there is, and some there are not.' },
      { action: () => { game.quests.setStage(EU, 30); }, end: true },
    ];
    return [{ npc: s === 30 ? 'To Faelith, in the Ilvaren Archive! The runes, the runes!' : 'Bind it. Whatever it is. Please.' }];
  }
  if (npcId === 'excavator_tamsin' && s === 20 && !has(game, 'sun_disc')) return [
    { player: 'The Starcaller needs the sun disc. Something is waking under the Greyspine.' },
    { npc: 'Under the Greyspine... the murals said "the mountain that breathes". Here. Bring it back in one piece. Or at least in one piece of history.' },
    { action: () => { give(game, 'sun_disc'); game.events.emit('quest:change', { id: EU, stage: 20 }); }, end: true },
  ];
  if (npcId === 'loremaster_faelith') {
    if (s === 30) {
      const ans = [];
      const MEAN = ['Forge-fire', "The watcher's light", 'Moonwater', 'Bind', 'Wake', 'King'];
      const q = (n) => ({ title: `Rune ${n} means...`, options: MEAN.map((m) => ({ text: m, action: () => { ans[n - 1] = m; } })) });
      return [
        { if: () => !has(game, 'sun_disc'), goto: 'nodisc' },
        { npc: 'A ward-eye from the south, with OUR runes on it. Our singers and their priests worked together once - before either of us forgot.' },
        { if: () => !has(game, 'warden_cipher'), goto: 'cipher' },
        { npc: 'Read the runes on the disc, then read my cipher, and tell me what they say. I want to see if you can.' },
        { options: [{ text: 'I am ready.', goto: 'q' }, { text: 'Not yet.', end: true }] },
        { label: 'q', ...q(1) }, q(2), q(3), q(4),
        { action: () => (ans.join() === "Forge-fire,The watcher's light,Moonwater,Bind" ? 'right' : 'wrong') },
        { label: 'wrong', npc: 'No. Read them again, slowly. A hammer is not a ring.', end: true },
        { label: 'right', npc: '"Forge-fire, the watcher\'s light, moonwater: bind." A binding! Three wards to put a sleeper back to sleep - the dwarves\' fire, the sun-priests\' light, and our moonwater.' },
        { npc: 'Take this flask and fill it at the Moonwell. The dwarves must give you fire from their great hearth. And all of it must be forged together - by someone who can swing a hammer.' },
        { action: () => { if (!has(game, 'crystal_flask') && !has(game, 'moonwater_flask')) give(game, 'crystal_flask'); game.quests.setStage(EU, 40); }, end: true },
        { label: 'cipher', npc: 'Here is my cipher for the old ward-runes.' },
        { action: () => { give(game, 'warden_cipher'); }, goto: 'q0' },
        { label: 'q0', npc: 'Read the disc, read the cipher, then come back and tell me.', end: true },
        { label: 'nodisc', npc: 'The Starcaller sent you about a disc? Then bring me the disc.', end: true },
      ];
    }
    if (s === 40) return [
      { npc: 'Fill the flask at the Moonwell, take fire from the dwarves, and forge it all with the disc.' },
      { if: () => has(game, 'crystal_flask') || has(game, 'moonwater_flask') || has(game, 'wyrmbinder_brand'), goto: 'e' },
      { npc: 'You lost the flask? Here.' },
      { action: () => { give(game, 'crystal_flask'); }, end: true },
      { label: 'e', end: true },
    ];
  }
  if (npcId === 'forgemaster_brunna' && s === 40) return [
    { if: () => has(game, 'oathfire_ember') || has(game, 'wyrmbinder_brand'), goto: 'h' },
    { player: 'I need fire from the great hearth, to bind whatever sleeps under the mountain.' },
    { npc: 'Fire from the Forge-Heart? For a binding? Well, I lit it with your help - it is half yours.' },
    { message: 'Brunna scoops a coal from the hearth into a little iron cage. It pulses, slowly, like breathing.' },
    { action: () => { give(game, 'oathfire_ember'); game.events.emit('quest:change', { id: EU, stage: 40 }); } },
    { npc: 'Oathfire. Do not drop it. Do not pocket it near anything you love.', end: true },
    { label: 'h', npc: 'You have your fire. Get to the great anvil when you have the rest.', end: true },
  ];
  return null;
}
registerData('east_epic_talk', 'get', getEpic);

hook((game) => {
  const I = game.interactions;
  let boss = null;
  const whelps = new Set();
  I.onItem('Read', ['warden_cipher'], () => game.ui.startDialogue([
    { message: '<b>Ward-runes of the old singers</b>, set down by Faelith:' },
    { message: 'A sun - DAWN. A crown - KING. A wing - WAKE. A closed eye - SLEEP.' },
    { message: 'A hammer - FORGE-FIRE. An open eye - THE WATCHER\'S LIGHT. A wave - MOONWATER. A closed ring - BIND.' },
  ]));
  I.onItemOnObject(['crystal_flask'], ['moonwell'], ({ player }) => {
    if (stageOf(game, EU) !== 40) { game.message('Nothing interesting happens.'); return; }
    take(game, 'crystal_flask'); give(game, 'moonwater_flask');
    game.playAnim(player, 'pickup', 900);
    game.message(done(game, 'moonwell_lament') ? 'You fill the flask. The moonwater glows silver and hums with the well\'s song.' : 'You fill the flask. The water is faintly bitter, but it still glows silver.');
    game.events.emit('quest:change', { id: EU, stage: 40 });
  });
  I.onItemOnObject(['runed_ingot', 'oathfire_ember', 'moonwater_flask', 'sun_disc'], ['anvil_great'], ({ player }) => {
    if (stageOf(game, EU) !== 40) { game.message('Nothing interesting happens.'); return; }
    const need = [['runed_ingot', 'the runed ingot'], ['oathfire_ember', 'an oathfire ember'], ['moonwater_flask', 'a flask of moonwater'], ['sun_disc', 'the sun disc'], ['hammer', 'a hammer']].filter(([id]) => !has(game, id));
    if (need.length) { game.message(`To forge the brand you still need ${need.map((n) => n[1]).join(', ')}.`); return; }
    if (player.skills.getLevel('smithing') < 45) { game.message('You need a Smithing level of 45 to forge the brand.'); return; }
    game.playAnim(player, 'smith', 3000);
    game.actions.lock(player, 6);
    game.message('You lay the runed ingot on the great anvil, set the oathfire beneath it and begin to strike...');
    game.schedule(5, () => {
      for (const id of ['runed_ingot', 'oathfire_ember', 'moonwater_flask', 'sun_disc']) take(game, id);
      give(game, 'wyrmbinder_brand');
      player.skills.addXp('smithing', 1500);
      game.spawnEffect('levelup', player);
      game.quests.setStage(EU, 50);
      game.message('<col=1a5a8a>You quench the glowing rod in moonwater and set the sun disc into its head. The Wyrmbinder brand hums in your hand.</col>');
    });
  });
  I.onObject('Inspect', ['forgeheart_vent'], () => game.message(stageOf(game, EU) >= 100 ? 'The vent is cool. Far below, something sleeps soundly.' : 'Heat rolls out of the crack in slow, enormous breaths.'));
  const summon = (target, player) => {
    if (alive(game, boss)) { game.message("Vel'Kesh is already awake!"); return; }
    boss = game.spawnNpc('velkesh_under_king', 202, 244, { wander: 2, respawn: false });
    if (!boss) return;
    boss.state.whelps = 0;
    game.spawnEffect('teleport', boss, { color: 0xff6a10 });
    game.say(boss, 'WHO WAKES THE UNDER-KING WITH STOLEN FIRE?', { chat: false, color: '#ff8a30' });
    aggro(game, boss, player);
  };
  I.onItemOnObject(['wyrmbinder_brand'], ['forgeheart_vent'], ({ player, target }) => {
    if (stageOf(game, EU) !== 50) { game.message('Nothing interesting happens.'); return; }
    game.playAnim(player, 'cast', 1500);
    game.message('You drive the brand into the crack. The mountain stops breathing - and then, with a roar that shakes dust from the ceiling, it wakes!');
    game.schedule(3, () => summon(target, player));
  });
  game.onTick((tick) => {
    if (!alive(game, boss)) return;
    const p = game.player;
    if (p.dead || game.distance(p, boss) > 14) return;
    if (tick % 11 === 0) telegraph(game, boss, { color: 0xff6a10, text: '<col=c04000>The obsidian glows red-hot beneath your feet - move!</col>', min: 15, max: 25 });
  }, 45);
  game.events.on('damage:before', (e) => {
    if (e.target !== boss || !(e.amount > 0)) return;
    if ([...whelps].some((w) => alive(game, w))) { e.amount = Math.floor(e.amount * 0.2); if (e.source === game.player && Math.random() < 0.3) game.message('<col=8a0000>Molten rock shields the Under-King while his whelps live!</col>'); }
  });
  game.events.on('damage', ({ target }) => {
    if (target !== boss || target.dead || target.hp <= 0) return;
    const n = target.state.whelps || 0;
    if ((n === 0 && target.hp <= target.maxHp * 0.66) || (n === 1 && target.hp <= target.maxHp * 0.33)) {
      target.state.whelps = n + 1;
      game.say(target, 'RISE, CHILDREN OF THE DEEP FIRE!', { chat: false, color: '#ff8a30' });
      for (let i = 0; i < 2; i++) {
        const [wx, wy] = freeTileNear(game, target.x + (i ? 3 : -1), target.y + 1, 3, game.player);
        const w = game.spawnNpc('magma_whelp', wx, wy, { wander: 3, respawn: false });
        if (w) { whelps.add(w); aggro(game, w); }
      }
    }
  });
  game.events.on('npc:death', ({ npc }) => {
    if (npc.id === 'magma_whelp') { whelps.delete(npc); return; }
    if (npc.id !== 'velkesh_under_king') return;
    for (const w of whelps) if (game.npcs.has(w.uid)) game.kill(w, null);
    whelps.clear();
    if (stageOf(game, EU) === 50) {
      game.quests.setStage(EU, 60);
      game.schedule(3, () => { game.spawnGroundItem('velkesh_scale', 1, npc.x, npc.y, { owner: game.player.name }); game.spawnGroundItem('coins', rint(2000, 4000), npc.x, npc.y, { owner: game.player.name }); });
      game.message('<col=1a5a8a>The brand blazes with forge-fire, moonlight and sunlight all at once. Vel\'Kesh sinks into the obsidian, his eyes closing... and the mountain falls quiet.</col>');
    }
  });
});
