// Small flavour interactions for decorative scenery (no gameplay effect). OWNER: agent D (world).
// Content modules load before the Game exists, so the handlers are registered on the first task
// after boot, once `window.game.interactions` is available. Only explicit object ids are used, so
// these never shadow any system's '*' handlers.

const BOOKS = [
  'You find "A Brief History of the Ford" - it is not brief.',
  'You find "Ninety-Nine Uses for a Bucket". You skim the first forty.',
  'You find a dog-eared romance: "The Knight of Highmarch and the Fishwife".',
  'You find "On the Nature of Sigils" by Magister Quill. The margins are full of angry corrections.',
  'You find a ledger. Someone owes the Crooked Kettle a great deal of money.',
  'You find "Monsters of the Ashen Wastes, Volume III". Volumes I and II are missing. Ominous.',
  'You find a cookbook. The page on pies is sticky.',
  'You find "Dwarven for Beginners". The first word you learn means both "hello" and "get out".',
  'You find a pressed silverleaf between the pages of an old elven almanac.',
  'Nothing of interest - just dust and a very surprised spider.',
];

function register(game) {
  const I = game.interactions;
  let n = 0;
  I.onObject('Search', ['bookshelf'], () => { game.message(BOOKS[(n++ + (game.tickCount || 0)) % BOOKS.length]); });
  I.onObject('Ring', ['bell_post'], ({ player }) => {
    game.message('<col=8a6a20>DONG!</col> The bell rings out across the rooftops.');
    game.playAnim(player, 'crush', 900);
  });
}

if (typeof window !== 'undefined') {
  const tryRegister = (tries = 0) => {
    const game = window.game;
    if (game?.interactions) { try { register(game); } catch (e) { console.warn('[world_flavor]', e); } return; }
    if (tries < 200) setTimeout(() => tryRegister(tries + 1), 50);
  };
  setTimeout(tryRegister, 0);
}
