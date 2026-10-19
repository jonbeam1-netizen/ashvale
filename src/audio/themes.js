// Region music themes for the generative music engine (music.js) and the area -> theme mapping.
//
// A theme is pure data. Fields:
//   mode      scale name (SCALES) or an array of semitone offsets       root  MIDI note of the tonic
//   bpm       beats per minute; beats per bar; sub = steps per beat (6/8 = beats 2, sub 3)
//   progs     chord progressions: one scale degree (0-based) per bar, 4 bars = one phrase
//   lead      { inst, oct, density 0..1, range [lowDeg, highDeg], vel }   melody voice
//   lead2     optional answering voice (plays in the 2nd half of phrases)
//   accomp    { kind: 'arp'|'strum'|'pad'|'none', inst, oct, every (steps), vel }
//   bass      { kind: 'root'|'rootfifth'|'walk'|'drone', inst, oct, vel }
//   drums     list of bar patterns: [[step, 'frame'|'tom'|'tick'|'shaker', vel], ...]
//   rest      chance a phrase is "breathing" (lead tacet);  verb  reverb send (0..1)
// Instruments: lute, harp (Karplus-Strong), flute, horn, bell, pad, bass, drone.
// Everything here is original: melodies are generated from these rules at runtime.

export const SCALES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygdom: [0, 1, 4, 5, 7, 8, 10],   // phrygian dominant
  hungarian: [0, 2, 3, 6, 7, 8, 11],  // eerie
};

export const THEMES = {
  town: {
    mode: 'ionian', root: 62, bpm: 100, beats: 4, sub: 2, verb: 0.3,
    progs: [[0, 3, 4, 0], [0, 5, 3, 4], [0, 3, 0, 4], [5, 3, 4, 0]],
    lead: { inst: 'lute', oct: 0, density: 0.62, range: [-1, 9], vel: 0.55 },
    lead2: { inst: 'flute', oct: 1, density: 0.35, range: [0, 7], vel: 0.4 },
    accomp: { kind: 'strum', inst: 'lute', oct: -1, vel: 0.32 },
    bass: { kind: 'rootfifth', inst: 'bass', oct: -2, vel: 0.5 },
    drums: [[[0, 'frame', 0.5], [4, 'frame', 0.3], [6, 'tick', 0.18]], [[0, 'frame', 0.5], [3, 'tick', 0.15], [4, 'frame', 0.3]]],
    rest: 0.12,
  },
  tavern: {
    mode: 'mixolydian', root: 64, bpm: 126, beats: 4, sub: 2, verb: 0.18,
    progs: [[0, 6, 3, 0], [0, 3, 4, 0], [0, 0, 6, 4]],
    lead: { inst: 'lute', oct: 0, density: 0.78, range: [0, 9], vel: 0.55 },
    lead2: { inst: 'flute', oct: 1, density: 0.5, range: [0, 7], vel: 0.35 },
    accomp: { kind: 'strum', inst: 'lute', oct: -1, vel: 0.3 },
    bass: { kind: 'rootfifth', inst: 'bass', oct: -2, vel: 0.5 },
    drums: [[[0, 'frame', 0.55], [2, 'tick', 0.25], [4, 'frame', 0.45], [6, 'tick', 0.25], [7, 'tick', 0.15]]],
    rest: 0.05,
  },
  pastoral: {
    mode: 'ionian', root: 65, bpm: 88, beats: 3, sub: 2, verb: 0.35,
    progs: [[0, 4, 5, 3], [0, 3, 4, 4], [0, 1, 4, 0], [3, 4, 0, 0]],
    lead: { inst: 'flute', oct: 0, density: 0.5, range: [0, 9], vel: 0.45 },
    accomp: { kind: 'arp', inst: 'harp', oct: -1, every: 1, vel: 0.28 },
    bass: { kind: 'root', inst: 'bass', oct: -2, vel: 0.45 },
    rest: 0.15,
  },
  forest: {
    mode: 'dorian', root: 62, bpm: 78, beats: 4, sub: 2, verb: 0.42,
    progs: [[0, 3, 0, 3], [0, 6, 3, 0], [0, 2, 3, 6], [0, 3, 6, 0]],
    lead: { inst: 'flute', oct: 0, density: 0.42, range: [-2, 8], vel: 0.42 },
    lead2: { inst: 'harp', oct: 1, density: 0.3, range: [0, 7], vel: 0.3 },
    accomp: { kind: 'arp', inst: 'harp', oct: -1, every: 1, vel: 0.26 },
    pad: { vel: 0.12 },
    bass: { kind: 'root', inst: 'bass', oct: -2, vel: 0.35 },
    rest: 0.2,
  },
  swamp: {
    mode: 'hungarian', root: 57, bpm: 62, beats: 4, sub: 2, verb: 0.55,
    progs: [[0, 0, 1, 0], [0, 5, 1, 0], [0, 3, 0, 1]],
    lead: { inst: 'flute', oct: 0, density: 0.3, range: [-3, 6], vel: 0.38, vib: 22 },
    lead2: { inst: 'bell', oct: 1, density: 0.18, range: [0, 7], vel: 0.25 },
    accomp: { kind: 'none' },
    pad: { vel: 0.14 },
    bass: { kind: 'drone', oct: -2, vel: 0.12 },
    rest: 0.25,
  },
  eerie: {
    mode: 'aeolian', root: 57, bpm: 58, beats: 4, sub: 2, verb: 0.6,
    progs: [[0, 5, 0, 4], [0, 1, 0, 5], [0, 3, 5, 4]],
    lead: { inst: 'harp', oct: 0, density: 0.32, range: [-2, 7], vel: 0.35, falling: true },
    lead2: { inst: 'bell', oct: 1, density: 0.15, range: [0, 7], vel: 0.22 },
    accomp: { kind: 'none' },
    pad: { vel: 0.15 },
    bass: { kind: 'drone', oct: -2, vel: 0.12 },
    rest: 0.25,
  },
  desert: {
    mode: 'phrygdom', root: 62, bpm: 94, beats: 4, sub: 2, verb: 0.3,
    progs: [[0, 1, 0, 1], [0, 6, 1, 0], [0, 3, 1, 0], [0, 0, 6, 1]],
    lead: { inst: 'lute', oct: 0, density: 0.6, range: [-1, 8], vel: 0.5, ornament: 0.3 },
    lead2: { inst: 'flute', oct: 0, density: 0.3, range: [0, 7], vel: 0.35, vib: 16 },
    accomp: { kind: 'none' },
    bass: { kind: 'drone', oct: -2, vel: 0.1 },
    drums: [[[0, 'frame', 0.65], [3, 'tick', 0.3], [4, 'frame', 0.45], [6, 'tick', 0.3], [7, 'tick', 0.2]], [[0, 'frame', 0.65], [2, 'tick', 0.25], [3, 'frame', 0.4], [6, 'tick', 0.3]]],
    rest: 0.12,
  },
  mountain: {
    mode: 'aeolian', root: 50, bpm: 70, beats: 4, sub: 2, verb: 0.5,
    progs: [[0, 5, 6, 0], [0, 3, 5, 4], [0, 6, 5, 6]],
    lead: { inst: 'horn', oct: 1, density: 0.38, range: [-1, 7], vel: 0.42 },
    accomp: { kind: 'pad' },
    pad: { vel: 0.14 },
    bass: { kind: 'drone', oct: -1, vel: 0.11 },
    drums: [[[0, 'tom', 0.5], [4, 'tom', 0.25]], [[0, 'tom', 0.5]]],
    rest: 0.2,
  },
  dwarf: {
    mode: 'dorian', root: 50, bpm: 92, beats: 4, sub: 2, verb: 0.38,
    progs: [[0, 6, 3, 0], [0, 3, 6, 0], [0, 4, 6, 0]],
    lead: { inst: 'horn', oct: 1, density: 0.5, range: [0, 7], vel: 0.42 },
    lead2: { inst: 'lute', oct: 1, density: 0.45, range: [0, 7], vel: 0.4 },
    accomp: { kind: 'strum', inst: 'lute', oct: 0, vel: 0.28 },
    bass: { kind: 'walk', inst: 'bass', oct: -1, vel: 0.55 },
    drums: [[[0, 'tom', 0.65], [2, 'tick', 0.22], [4, 'tom', 0.5], [5, 'tom', 0.32], [6, 'tick', 0.22]]],
    rest: 0.08,
  },
  elven: {
    mode: 'lydian', root: 64, bpm: 74, beats: 3, sub: 2, verb: 0.6,
    progs: [[0, 1, 0, 1], [0, 4, 1, 5], [0, 1, 5, 4], [3, 1, 0, 0]],
    lead: { inst: 'flute', oct: 0, density: 0.42, range: [0, 9], vel: 0.38 },
    lead2: { inst: 'bell', oct: 1, density: 0.28, range: [0, 7], vel: 0.25 },
    accomp: { kind: 'arp', inst: 'harp', oct: 0, every: 1, vel: 0.24, wide: true },
    pad: { vel: 0.13 },
    bass: { kind: 'root', inst: 'harp', oct: -2, vel: 0.35 },
    rest: 0.15,
  },
  coast: {
    mode: 'mixolydian', root: 60, bpm: 64, beats: 2, sub: 3, verb: 0.4,
    progs: [[0, 3, 4, 0], [0, 6, 3, 0], [0, 4, 3, 4], [0, 3, 6, 0]],
    lead: { inst: 'flute', oct: 0, density: 0.55, range: [0, 9], vel: 0.42 },
    lead2: { inst: 'lute', oct: 0, density: 0.45, range: [0, 7], vel: 0.42 },
    accomp: { kind: 'strum', inst: 'lute', oct: -1, vel: 0.28, beatsOnly: true },
    bass: { kind: 'root', inst: 'bass', oct: -2, vel: 0.45 },
    drums: [[[0, 'shaker', 0.25], [2, 'shaker', 0.12], [3, 'shaker', 0.2], [5, 'shaker', 0.12]]],
    rest: 0.12,
  },
  dungeon: {
    mode: 'phrygian', root: 45, bpm: 48, beats: 4, sub: 2, verb: 0.75,
    progs: [[0, 0, 1, 0], [0, 0, 5, 5], [0, 1, 0, 6]],
    lead: { inst: 'bell', oct: 1, density: 0.16, range: [-2, 6], vel: 0.25 },
    lead2: { inst: 'harp', oct: 0, density: 0.12, range: [-2, 5], vel: 0.25 },
    accomp: { kind: 'none' },
    pad: { vel: 0.12, dark: true },
    bass: { kind: 'drone', oct: -1, vel: 0.14 },
    drums: [[[0, 'tom', 0.3]], [], []],
    rest: 0.35,
  },
  wilderness: {
    mode: 'harmonic', root: 52, bpm: 82, beats: 4, sub: 2, verb: 0.45,
    progs: [[0, 5, 4, 0], [0, 3, 4, 0], [0, 5, 1, 4], [0, 0, 5, 4]],
    lead: { inst: 'flute', oct: 1, density: 0.36, range: [-3, 6], vel: 0.38 },
    lead2: { inst: 'horn', oct: 0, density: 0.25, range: [-2, 5], vel: 0.32 },
    accomp: { kind: 'pad' },
    pad: { vel: 0.13 },
    bass: { kind: 'drone', oct: -1, vel: 0.12 },
    drums: [[[0, 'tom', 0.45], [1, 'tom', 0.25]], [[0, 'tom', 0.45], [1, 'tom', 0.25], [6, 'tick', 0.15]]],
    rest: 0.2,
  },
};

// ---- area id -> theme ---------------------------------------------------------------------------------
const AREA_THEME = {
  brackenford: 'town', highmarch: 'town', highmarch_keep: 'town', ditchwatch: 'town', fort_rowan: 'town', haverly: 'pastoral',
  crooked_kettle: 'tavern', gilded_tankard: 'tavern', stonemug: 'tavern', salty_gull: 'tavern', sunken_boot: 'tavern',
  vale: 'pastoral', haverly_pass: 'mountain', mirrowmere: 'pastoral', sentinel_hill: 'pastoral',
  thornwood: 'forest', fairy_clearing: 'elven', lumber_camp: 'forest', hagstone: 'swamp', goblin_camp: 'forest', grubnak_camp: 'wilderness',
  whisperstones: 'elven', mirrowmere_isle: 'elven', barrowfield: 'eerie', morrows_rest: 'eerie',
  greystone: 'mountain', westcrag: 'mountain', greyspine: 'mountain', frostgate: 'mountain', bramblemoor: 'forest', starcaller: 'elven',
  durnhold: 'dwarf', durn_hall: 'dwarf', deep_seams: 'dwarf',
  faelwood: 'elven', ilvaren: 'elven', silverfall: 'elven', lantern_grove: 'elven', spire_study: 'elven',
  murkfen: 'swamp', bogwick: 'swamp',
  saltmarsh: 'coast', gullhaven: 'coast', southern_sea: 'coast', thrush_isle: 'coast', beacon_isle: 'coast', wreckers_cove: 'coast',
  sunscar: 'desert', dustwatch: 'desert', scorchgulch: 'desert', sunwell: 'desert', sand_temple: 'desert',
};

const NAME_HINTS = [
  [/inn|tavern|tankard|kettle|gull|boot|mug/i, 'tavern'],
  [/crypt|grave|barrow|tomb|ossuary|haunt/i, 'eerie'],
  [/swamp|fen|bog|marsh|mire/i, 'swamp'],
  [/desert|dune|sand|oasis|badland|scorch/i, 'desert'],
  [/elf|elven|fae|grove|moon|star/i, 'elven'],
  [/dwar|hold|forge|mine/i, 'dwarf'],
  [/mount|peak|crag|ridge|pass|cliff|bluff/i, 'mountain'],
  [/coast|sea|bay|cove|isle|harbou?r|pier|port|beach/i, 'coast'],
  [/wood|forest|thicket|glade/i, 'forest'],
  [/town|village|keep|castle|market|watch|fort|camp/i, 'town'],
];

const TERRAIN_THEME = {
  sand: 'desert', red_sand: 'desert', cracked_earth: 'desert', sandstone_floor: 'desert',
  swamp: 'swamp', mud: 'swamp', snow: 'mountain', ice: 'mountain', mountain: 'mountain',
  dark_grass: 'forest', moss: 'forest', glade_grass: 'elven', farmland: 'pastoral',
  cave_floor: 'dungeon', crypt_floor: 'dungeon', sewer_floor: 'dungeon',
};

/** Majority vote of the terrain around a tile (a sparse 13x13 sample), so roads don't flip the theme. */
function terrainMood(w, x, y) {
  const votes = {};
  let best = 'pastoral', bestN = 0;
  for (let dy = -6; dy <= 6; dy += 2) {
    for (let dx = -6; dx <= 6; dx += 2) {
      const th = TERRAIN_THEME[w.terrainAt(x + dx, y + dy)?.id];
      if (!th) continue;
      const n = (votes[th] = (votes[th] || 0) + 1);
      if (n > bestN) { bestN = n; best = th; }
    }
  }
  return bestN >= 12 ? best : 'pastoral';
}

/** Pick the music theme for a tile. */
export function themeAt(game, x, y) {
  const w = game.world;
  const area = w.getArea(x, y);
  if (area?.dungeon) return 'dungeon';
  if (w.getWildernessLevel?.(x, y) > 0) return 'wilderness';
  if (area && AREA_THEME[area.id]) return AREA_THEME[area.id];
  if (area && area.id !== 'vale') {
    for (const [re, th] of NAME_HINTS) if (re.test(area.name || area.id)) return th;
  }
  return terrainMood(w, x, y);
}
