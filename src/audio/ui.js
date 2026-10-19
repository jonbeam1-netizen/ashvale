// Audio controls: a "Sound" section in the Settings tab and a small speaker toggle on the minimap.

const CSS = `
.audio-settings { margin: 6px 0 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); }
.audio-settings .audio-head { color: #ff981f; font-weight: 700; margin: 2px 0 4px; }
.audio-settings .audio-row { display: grid; grid-template-columns: 62px 1fr 30px; align-items: center; gap: 6px; margin: 3px 0; }
.audio-settings input[type=range] { width: 100%; accent-color: #c8a040; }
.audio-settings .audio-val { text-align: right; font-size: 11px; opacity: 0.85; }
.audio-settings .audio-note { font-size: 11px; opacity: 0.7; margin-top: 2px; }
.audio-toggle { position: absolute; right: -6px; bottom: -4px; width: 28px; height: 28px; border-radius: 50%; padding: 0;
  background: radial-gradient(#5a5044, #2a241c); border: 2px solid #1a1611; box-shadow: inset 0 0 0 1px #8a7a60;
  cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2; }
.audio-toggle:hover { filter: brightness(1.2); }
.audio-toggle svg { width: 16px; height: 16px; fill: #e8d8a8; stroke: #e8d8a8; }
.audio-toggle.off svg { fill: #9a8a70; stroke: #c04030; }
`;

const ICON_ON = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z" stroke="none"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke-width="2.2" stroke-linecap="round"/></svg>';

function injectCss() {
  if (document.getElementById('audio-css')) return;
  const s = document.createElement('style');
  s.id = 'audio-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Append the Sound section to the Settings tab pane. */
export function renderAudioSettings(A, pane) {
  injectCss();
  const box = document.createElement('div');
  box.className = 'audio-ctl audio-settings';
  const s = A.settings;
  box.innerHTML = '<div class="audio-head">Sound</div>';
  const mute = document.createElement('label');
  mute.className = 'set-row';
  mute.innerHTML = `<input type="checkbox" ${s.muted ? '' : 'checked'}> Sound on`;
  mute.querySelector('input').onchange = (e) => A.set('muted', !e.target.checked);
  box.appendChild(mute);
  const sliders = [['master', 'Master'], ['music', 'Music'], ['sfx', 'Effects'], ['ambience', 'Ambience']];
  const vals = {};
  for (const [key, label] of sliders) {
    const row = document.createElement('div');
    row.className = 'audio-row';
    row.innerHTML = `<span>${label}</span><input type="range" min="0" max="100" step="1"><span class="audio-val"></span>`;
    const inp = row.querySelector('input'), val = row.querySelector('.audio-val');
    inp.value = String(Math.round((s[key] ?? 0) * 100));
    val.textContent = inp.value;
    inp.oninput = () => { val.textContent = inp.value; A.settings[key] = Number(inp.value) / 100; A.applyVolumes(); };
    inp.onchange = () => { A.set(key, Number(inp.value) / 100); if (key === 'sfx' || key === 'master') A.sfx.play('coins', null, { n: 3, minGap: 0.2 }); };
    vals[key] = inp;
    box.appendChild(row);
  }
  const steps = document.createElement('label');
  steps.className = 'set-row';
  steps.innerHTML = `<input type="checkbox" ${s.footsteps ? 'checked' : ''}> Footsteps`;
  steps.querySelector('input').onchange = (e) => A.set('footsteps', e.target.checked);
  box.appendChild(steps);
  const note = document.createElement('div');
  note.className = 'audio-note';
  box.appendChild(note);
  let seen = false; // drop the listener once the pane has been re-rendered without this box
  const sync = () => {
    if (box.isConnected) seen = true;
    else if (seen) { off(); return; }
    mute.querySelector('input').checked = !A.settings.muted;
    note.textContent = A.disabled ? 'Audio is not supported by this browser.' : !A.ctx && !A.settings.muted ? 'Sound starts after your first click or key press.' : '';
  };
  const off = A.onUi(sync);
  sync();
  // put it above the Save / Delete buttons when present
  const firstBtn = pane.querySelector(':scope > button');
  if (firstBtn) pane.insertBefore(box, firstBtn); else pane.appendChild(box);
}

/** Small speaker toggle on the minimap (falls back to the top-right HUD). */
export function createHudToggle(A) {
  injectCss();
  const btn = document.createElement('button');
  btn.className = 'audio-ctl audio-toggle';
  const sync = () => {
    const off = A.settings.muted;
    btn.classList.toggle('off', off);
    btn.innerHTML = off ? ICON_OFF : ICON_ON;
    btn.title = off ? 'Sound off (click to turn on)' : 'Sound on (click to mute)';
  };
  btn.onclick = (e) => { e.stopPropagation(); A.toggleMute(); };
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  btn.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); });
  A.onUi(sync);
  sync();
  const place = () => {
    const host = document.querySelector('#hud-topright .minimap-wrap') || document.getElementById('hud-topright');
    if (!host) return false;
    host.appendChild(btn);
    return true;
  };
  if (!place()) setTimeout(place, 500);
  return btn;
}
