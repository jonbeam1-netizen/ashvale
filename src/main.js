// Ashvale bootstrap: content -> world -> save -> renderer/UI/input -> systems -> net -> start.

import './core/weapontypes.js';
import './content/index.js';
import { Game } from './core/game.js';
import { registerDefaultHandlers } from './core/defaults.js';
import { Shops } from './core/shops.js';
import { getData } from './core/registry.js';
import { readSave, applySave, saveGame, SAVE_KEY } from './core/save.js';
import { RenderManager } from './render/renderer.js';
import { UIManager } from './ui/ui.js';
import { InputManager } from './input/input.js';
import { showCharacterCreation } from './ui/charcreate.js';
import { initSystems } from './systems/index.js';
import * as net from './net/index.js';
import { initAudio } from './audio/audio.js';

const AUTOSAVE_MS = 30_000;

/** Loading-screen progress (defined by the inline script in index.html). */
const progress = (text, frac) => {
  try { performance.mark(`ashvale:${text}`); window.ashvaleLoading?.(text, frac); } catch { /* ignore */ }
};
/**
 * Let the browser paint the loading screen before a long synchronous step. A hidden tab (an invite link opened
 * in the background) paints nothing and gets no animation frames and ~1 s timers, so it just carries on.
 */
const nextPaint = () => (document.hidden ? Promise.resolve() : new Promise((r) => {
  let done = false;
  const go = () => { if (!done) { done = true; setTimeout(r, 0); } };
  requestAnimationFrame(go);
  setTimeout(go, 50); // the tab may be hidden meanwhile: don't stall the boot
}));

async function boot() {
  progress('Building the world...', 0.88);
  await nextPaint();
  const game = new Game();
  window.game = game; // handy for debugging in the console
  game.buildWorld();
  game.shops = new Shops(game);
  registerDefaultHandlers(game);

  let save = readSave();
  if (save) {
    try { applySave(game, save); } catch (e) {
      // a corrupt or incompatible save must never brick the game: keep it aside and start fresh
      console.error('[save] could not apply save, starting a new character', e);
      quarantineSave();
      location.reload();
      return;
    }
  }

  progress('Preparing graphics...', 0.94);
  await nextPaint();
  game.renderer = new RenderManager(game, document.getElementById('viewport'));
  new UIManager(game);
  new InputManager(game);
  initSystems(game);
  try { net.init(game); } catch (e) { console.error('[net] init failed', e); }
  initAudio(game); // procedural music / sfx / ambience (src/audio); never throws
  progress('Ready', 1);

  const frame = () => {
    try {
      game.renderer.frame();
      game.input.update();
      game.ui.update();
    } catch (e) { console.error('[frame]', e); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const loading = document.getElementById('loading');
  loading.classList.add('done');
  setTimeout(() => { loading.style.display = 'none'; }, 700); // also when no transition runs (background tab)

  if (!save) {
    const { name, appearance } = await showCharacterCreation();
    const p = game.player;
    p.name = name;
    p.appearance = appearance;
    p.appearanceVersion++;
    for (const it of getData('starter', 'kit') || []) p.inventory.add(it.id, it.qty);
    saveGame(game);
  }
  game.ui.chat.updateName();
  game.renderer.applySettings();
  game.ui.side.refresh('inventory');
  game.start();
  welcome(game, !save);

  setInterval(() => saveGame(game), AUTOSAVE_MS);
  window.addEventListener('beforeunload', () => saveGame(game));
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(game); });
  game.events.emit('game:ready', { game });
  watchForUpdates(game);
}

/** Chat greeting; first-time players also get a short controls primer. */
function welcome(game, firstTime) {
  game.message('Welcome to Ashvale.');
  if (!firstTime) return;
  const tip = (t) => game.message(`<col=1a4a8a>${t}</col>`);
  const touch = !!(game.ui.mobile?.touch || document.documentElement.classList.contains('touch'));
  const tutorial = !!game.tutorial; // fresh characters get the guided tutorial (it starts on 'game:ready')
  if (touch) {
    tip('<col=000000>How to play:</col> <col=800000>tap</col> the ground to walk, or a person, monster or object to do its main action.');
    tip('<col=800000>Press and hold</col> anything to see every option (Talk-to, Trade, Attack, Examine...).');
    tip(`<col=800000>Drag one finger</col> to turn the camera, <col=800000>pinch</col> to zoom. Tap the compass to face north.${game.ui.mobile?.compact ? ' The <col=800000>Menu</col> button holds the world map, settings and more.' : ''}`);
  } else {
    tip('<col=000000>How to play:</col> <col=800000>left-click</col> the ground to walk, or a person, monster or object to do its main action.');
    tip('<col=800000>Right-click</col> anything to see every option (Talk-to, Trade, Attack, Examine...).');
    tip('Turn the camera with the <col=800000>arrow keys</col> or by dragging with the <col=800000>middle mouse button</col>; <col=800000>scroll</col> to zoom. Click the compass to face north.');
  }
  tip(tutorial
    ? 'Once you know the basics, talk to <col=800000>Mira</col>, the town guide in the square (the blue <col=800000>?</col> on the minimap). She needs a hand.'
    : 'Your first goal: talk to <col=800000>Mira</col>, the town guide in the square (the blue <col=800000>?</col> on the minimap). She needs a hand.');
  tip(`Want company? Open the <col=800000>Multiplayer</col> tab (the smiley face${game.ui.mobile?.compact ? ', or via the Menu button' : ''}) to play with friends.`);
}

/**
 * Deployed builds (see index.html / tools/bump_build.py): every 10 minutes check version.json and tell the
 * player once when a newer build is out (the save is kept; a refresh loads the new version).
 */
function watchForUpdates(game) {
  const build = window.ASHVALE_BUILD;
  if (!build || window.ASHVALE_DEV) return;
  let told = false;
  const check = () => {
    if (told || document.hidden) return;
    fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (told || !j?.build || j.build === build) return;
      told = true;
      game.message('<col=8a5a00>A new version of Ashvale is available. Your progress is saved - refresh the page to update.</col>');
    }).catch(() => { /* offline: try again later */ });
  };
  setInterval(check, 10 * 60_000);
}

/** Move an unreadable save out of the way (kept under a .broken key so it is not lost). */
function quarantineSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) localStorage.setItem(SAVE_KEY + '.broken', raw);
    localStorage.removeItem(SAVE_KEY);
  } catch { /* storage unavailable */ }
}

boot().catch((e) => {
  console.error(e);
  const l = document.querySelector('#loading .loading-text');
  if (l) l.textContent = `Failed to start: ${e.message}`;
});
