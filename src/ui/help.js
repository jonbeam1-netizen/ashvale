// "Controls & tips" window (Settings tab button): every control, hotkey, touch gesture and a multiplayer how-to.

const SECTIONS = [
  ['Moving & doing things', [
    ['Left-click', 'Walk there, or do the main action on a person, monster or object (shown top-left).'],
    ['Right-click', 'Every option for what is under the cursor: Talk-to, Trade, Attack, Examine...'],
    ['Ctrl + click', 'Run for this one trip (or walk, if run is switched on).'],
    ['Click the minimap', 'Walk to that spot. A red flag marks where you are heading.'],
    ['Run orb / Alt + R', 'Switch running on or off. Running uses energy, which comes back while you walk or stand still.'],
  ]],
  ['Camera', [
    ['Arrow keys', 'Turn and tilt the camera.'],
    ['Middle-drag', 'Turn and tilt the camera with the mouse.'],
    ['Mouse wheel', 'Zoom in and out.'],
    ['Compass', 'Click it to face north.'],
  ]],
  ['Inventory & items', [
    ['Click an item', 'Its first option (Eat, Wield, Bury...).'],
    ['Right-click an item', 'All options, including Use, Drop and Examine.'],
    ['Use, then click', 'Use an item on another item, an object, a person or the ground.'],
    ['Drag an item', 'Move it to another inventory slot.'],
    ['Shift + click', 'Drop the item straight away (can be turned off in Settings).'],
  ]],
  ['Hotkeys', [
    ['F1 - F9', 'Combat, Skills, Quests, Inventory, Equipment, Prayer, Magic, Multiplayer, Settings tabs.'],
    ['Emotes tab', 'Wave, bow, dance and more (the mask icon under the other tabs). Some emotes are learned from scrolls.'],
    ['Alt + M', 'Open or close the world map (or the map button under the minimap).'],
    ['Alt + R', 'Toggle run.'],
    ['Esc', 'Close the open window, dialogue or map.'],
    ['Space', 'Continue a conversation; hold it to skip through quickly.'],
    ['1 - 9', 'Pick a dialogue option, or an item in a "What would you like to make?" box.'],
    ['Enter', 'Send a chat message (just start typing to chat).'],
  ]],
  ['World map', [
    ['Drag / wheel', 'Pan and zoom the map. Pinch to zoom on touch screens.'],
    ['Click', 'Place a marker. It shows as a yellow flag on your minimap (an arrow on the rim when it is far away) and clears when you arrive. Click it again to remove it.'],
    ['Surface / Underground', 'Dungeons are shown on their own layer.'],
    ['Key', 'Show or hide each kind of icon: banks, shops, quests, altars, furnaces, anvils, dungeons, agility, slayer masters, transport.'],
  ]],
  ['Touch screens', [
    ['Tap', 'Same as a left-click: walk, or do the main action.'],
    ['Press and hold', 'Opens the right-click menu (a ring fills while you hold). Works on items, the bank, shops and equipment too.'],
    ['One-finger drag', 'Turn and tilt the camera.'],
    ['Two fingers', 'Pinch to zoom, twist to turn the camera, slide up or down to tilt it.'],
    ['Tab bar', 'Tap a tab to open it; tap it again to fold the panel away.'],
    ['Chat', 'Tap the chat line (or the arrow above it) to open the chat; tap the arrow again to fold it.'],
    ['Menu button', 'World map, emotes, settings, chronicles, collection log and these tips.'],
    ['Run button', 'Switch running on or off (the number is your run energy).'],
  ]],
  ['Graphics & battery', [
    ['Graphics', 'Settings > Graphics: Auto picks Low on phones, Medium on tablets and small laptops, High otherwise. Low = no shadows or glow, shorter view, fewer particles.'],
    ['Frame rate', 'Settings > Frame rate: 30 fps saves battery, 60 fps is smoother. The game stops drawing while the tab is hidden.'],
    ['Auto quality', 'If the game keeps running slowly, graphics are lowered one step at a time (you are told in chat).'],
  ]],
  ['Playing with friends', [
    ['Host', 'Open the Multiplayer tab (smiley face, F8) and press Host World.'],
    ['Invite', 'Press Copy invite link and send it to your friends, or read them the short code.'],
    ['Join', 'Open the invite link, or type the code into the Multiplayer tab and press Join. Up to 8 players per world.'],
    ['Together', 'Right-click a player to Follow or Trade with them. Monsters, drops and resources are shared; your character, items and quests stay your own.'],
    ['Chat', 'Type to talk to everyone nearby. ::pm name message sends a private message.'],
  ]],
  ['Tips', [
    ['Lost?', 'The world map shows banks, shops and where quests start. Mira in Brackenford square helps new adventurers.'],
    ['Saving', 'Your progress saves by itself every 30 seconds and when you close the tab.'],
    ['Danger', 'North of the long ditch lies the Wilderness: other players can attack you there, and the deeper you go the worse it gets.'],
  ]],
];

/** Opens the Controls & tips window. */
export function openHelp(ui) {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  ui.openInterface({
    id: 'help', title: 'Controls & tips', width: 520, className: 'help-iface',
    render: (body) => {
      body.innerHTML = SECTIONS.map(([title, rows]) => `
        <h4 class="help-h">${esc(title)}</h4>
        <dl class="help-list">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`).join('');
    },
  });
}
