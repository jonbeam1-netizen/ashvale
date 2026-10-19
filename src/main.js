// Ashvale bootstrap: content -> world -> save -> renderer/UI/input -> systems -> net -> start.

import './core/weapontypes.js';
import './content/index.js';
import { Game } from './core/game.js';
import { registerDefaultHandlers } from './core/defaults.js';
import { Shops } from './core/shops.js';
import { getData } from './core/registry.js';
import { readSave, applySave, saveGame } from './core/save.js';
import { RenderManager } from './render/renderer.js';
import { UIManager } from './ui/ui.js';
import { InputManager } from './input/input.js';
import { showCharacterCreation } from './ui/charcreate.js';
import { initSystems } from './systems/index.js';
import * as net from './net/index.js';

const AUTOSAVE_MS = 30_000;

async function boot() {
  const game = new Game();
  window.game = game; // handy for debugging in the console
  game.buildWorld();
  game.shops = new Shops(game);
  registerDefaultHandlers(game);

  const save = readSave();
  if (save) applySave(game, save);

  game.renderer = new RenderManager(game, document.getElementById('viewport'));
  new UIManager(game);
  new InputManager(game);
  initSystems(game);
  try { net.init(game); } catch (e) { console.error('[net] init failed', e); }

  const frame = () => {
    try {
      game.renderer.frame();
      game.input.update();
      game.ui.update();
    } catch (e) { console.error('[frame]', e); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.getElementById('loading').classList.add('done');

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
  game.message('Welcome to Ashvale.');
  if (!save) game.message('Talk to <col=800000>Mira</col> in the town square if you need guidance.');

  setInterval(() => saveGame(game), AUTOSAVE_MS);
  window.addEventListener('beforeunload', () => saveGame(game));
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(game); });
  game.events.emit('game:ready', { game });
}

boot().catch((e) => {
  console.error(e);
  const l = document.querySelector('#loading .loading-text');
  if (l) l.textContent = `Failed to start: ${e.message}`;
});
