// Entity classes: Character (base for Player / Npc / RemotePlayer), WorldObject, GroundItem.

import { getItem, getObject } from '../core/registry.js';
import { Skills } from '../core/skills.js';
import { Container } from '../core/container.js';
import { Equipment } from '../core/equipment.js';
import { INVENTORY_SIZE, BANK_SIZE, MAX_RUN_ENERGY } from '../core/constants.js';

let nextUid = 1;

export class Entity {
  constructor(type) {
    this.uid = nextUid++;
    this.type = type; // 'player' | 'npc' | 'remote' | 'object' | 'ground'
    this.x = 0;
    this.y = 0;
  }
}

export class Character extends Entity {
  constructor(type) {
    super(type);
    this.name = '';
    this.size = 1;
    this.prevX = 0; this.prevY = 0;
    this.steps = [];            // tiles traversed during the last tick (incl. start) - for interpolation
    this.teleported = false;    // true for the tick the entity teleported (views snap)
    this.path = [];             // queued tiles to walk
    this.running = false;
    this.faceAngle = 0;         // radians, 0 = facing south (+y); updated by movement / faceTarget
    this.faceTarget = null;     // Character to face
    this.faceTile = null;       // {x,y} to face once
    this.action = null;         // see core/actions.js
    this.loopAnim = null;       // looping animation name (from action.anim)
    this.anim = null;           // one-shot {name, start, duration}
    this.hitsplats = [];        // [{amount, type, time}]
    this.hpBarUntil = 0;        // performance.now() ms
    this.overhead = null;       // {text, until, color}
    this.dead = false;
    this.hidden = false;
    this.combatTarget = null;   // Character this entity is fighting (owned by combat system)
    this.attackTimer = 0;       // ticks until next attack (combat system)
    this.lastAttackedTick = -999;
    this.lastAttacker = null;
    this.interaction = null;    // pending walk-to interaction (engine)
    this.lockedUntil = 0;
    this.appearanceVersion = 0; // bump to force a model rebuild
  }

  setPosition(x, y) {
    this.x = x; this.y = y;
    this.prevX = x; this.prevY = y;
    this.steps = [{ x, y }];
    this.path = [];
    this.teleported = true;
  }

  /** Footprint rect (inclusive). */
  rect() { return { x0: this.x, y0: this.y, x1: this.x + this.size - 1, y1: this.y + this.size - 1 }; }
  centerX() { return this.x + this.size / 2; }
  centerY() { return this.y + this.size / 2; }

  get alive() { return !this.dead; }
}

export const DEFAULT_APPEARANCE = {
  body: 'male',          // 'male' | 'female' (proportions only)
  skin: '#d9a77a',
  hair: '#4a2f1b',
  hairStyle: 'short',    // 'short' | 'long' | 'bald'
  top: '#7a3b2e',
  legs: '#3b4a6b',
  boots: '#3a2a1c',
  hands: null,
};

export class Player extends Character {
  constructor(game) {
    super('player');
    this.game = game;
    this.name = 'Adventurer';
    this.appearance = { ...DEFAULT_APPEARANCE };
    const bus = game.events;
    this.skills = new Skills(this, bus);
    this.inventory = new Container(INVENTORY_SIZE, { onChange: () => bus.emit('inventory:change', { player: this }) });
    this.bank = new Container(BANK_SIZE, { alwaysStack: true, onChange: () => bus.emit('bank:change', { player: this }) });
    this.equipment = new Equipment(() => { this.appearanceVersion++; bus.emit('equipment:change', { player: this }); });
    this.runEnergy = MAX_RUN_ENERGY;
    this.runToggled = false;
    this.combatStyle = 0;
    this.autoRetaliate = true;
    this.specialEnergy = 100;
    this.activePrayers = new Set();
    this.quests = {};           // questId -> stage (0 = not started)
    this.data = {};             // namespaced persistent data for systems: player.data[ns] = {...}
    this.settings = { shadows: true, roofs: true, xpDrops: true, wildyWarning: true, showFps: false, drawDistance: 1 };
    this.playTime = 0;          // ticks
    this.destination = null;    // {x,y} minimap flag
    this.following = null;
  }

  get hp() { return this.skills.getCurrent('hitpoints'); }
  set hp(v) { this.skills.setCurrent('hitpoints', Math.max(0, Math.min(v, this.maxHp))); }
  get maxHp() { return this.skills.getLevel('hitpoints'); }
  get combatLevel() { return this.skills.combatLevel(); }
  get id() { return 'player'; }

  /** Namespaced persistent storage for systems. */
  store(ns) { if (!this.data[ns]) this.data[ns] = {}; return this.data[ns]; }

  /** Serializable public state for networking (see ARCHITECTURE.md "Networking"). */
  snapshot() {
    const snap = {
      name: this.name,
      appearance: this.appearance,
      equipment: this.equipment.ids(),
      x: this.x, y: this.y,
      running: this.running,
      hp: this.hp, maxHp: this.maxHp,
      combatLevel: this.combatLevel,
      anim: this.loopAnim || (this.anim ? this.anim.name : null),
      faceAngle: this.faceAngle,
      dead: this.dead,
      overhead: this.overhead ? this.overhead.text : null,
      prayers: [...this.activePrayers],
      wildernessLevel: this.game.world.getWildernessLevel(this.x, this.y),
    };
    this.game.events.emit('snapshot', { player: this, snap });
    return snap;
  }
}

export class Npc extends Character {
  constructor(def, x, y, opts = {}) {
    super('npc');
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.size = def.size || 1;
    this.spawnX = opts.homeX ?? x;
    this.spawnY = opts.homeY ?? y;
    this.wanderRadius = opts.wander ?? def.wanderRadius ?? 3;
    this.respawns = opts.respawn !== false;
    this.hp = def.stats.hitpoints;
    this.talkingTo = null;
    this.state = {};            // free-form per-npc state for systems
    this.setPosition(x, y);
  }
  get maxHp() { return this.def.stats.hitpoints; }
  get combatLevel() { return this.def.combatLevel; }
}

export class RemotePlayer extends Character {
  constructor(peerId, snap = {}) {
    super('remote');
    this.peerId = peerId;
    this.id = 'player';
    this.appearance = { ...DEFAULT_APPEARANCE };
    this.equipmentIds = {};
    this.hp = 10; this.maxHp = 10;
    this.combatLevel = 3;
    this.netTarget = null;      // {x,y} last known server position
    this.netAnim = null;
    this.extra = {};            // any additional snapshot fields
    this.applySnapshot(snap, true);
  }

  applySnapshot(s, initial = false) {
    if (!s) return;
    if (s.name) this.name = s.name;
    if (s.appearance && JSON.stringify(s.appearance) !== JSON.stringify(this.appearance)) {
      this.appearance = { ...this.appearance, ...s.appearance }; this.appearanceVersion++;
    }
    if (s.equipment && JSON.stringify(s.equipment) !== JSON.stringify(this.equipmentIds)) {
      this.equipmentIds = { ...s.equipment }; this.appearanceVersion++;
    }
    if (s.hp != null) this.hp = s.hp;
    if (s.maxHp != null) this.maxHp = s.maxHp;
    if (s.combatLevel != null) this.combatLevel = s.combatLevel;
    if (s.running != null) this.running = s.running;
    if (s.anim !== undefined) { this.netAnim = s.anim; this.loopAnim = s.anim && s.anim !== 'death' ? s.anim : null; }
    if (s.x != null && s.y != null) {
      if (initial) this.setPosition(s.x, s.y);
      this.netTarget = { x: s.x, y: s.y };
    }
    for (const k of Object.keys(s)) {
      if (!['name', 'appearance', 'equipment', 'hp', 'maxHp', 'combatLevel', 'running', 'anim', 'x', 'y'].includes(k)) this.extra[k] = s[k];
    }
  }
}

export class WorldObject extends Entity {
  constructor(def, x, y, opts = {}) {
    super('object');
    this.x = x; this.y = y;
    this.rot = opts.rot || 0;       // quarter turns clockwise (0-3)
    this.originalId = def.id;
    this.sizeOverride = opts.w ? [opts.w, opts.h || 1] : null;
    this.state = {};                // free-form state for systems (e.g. remaining logs)
    this.hidden = false;
    this.setDef(def);
  }

  setDef(def) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.blocks = def.blocks !== false;
    const [w, h] = this.sizeOverride || def.size || [1, 1];
    // odd rotations swap the footprint
    this.w = this.rot % 2 ? h : w;
    this.h = this.rot % 2 ? w : h;
  }

  rect() { return { x0: this.x, y0: this.y, x1: this.x + this.w - 1, y1: this.y + this.h - 1 }; }
  contains(x, y) { return x >= this.x && x < this.x + this.w && y >= this.y && y < this.y + this.h; }
  *tiles() { for (let dy = 0; dy < this.h; dy++) for (let dx = 0; dx < this.w; dx++) yield [this.x + dx, this.y + dy]; }
  centerX() { return this.x + this.w / 2; }
  centerY() { return this.y + this.h / 2; }
}

export class GroundItem extends Entity {
  constructor(itemId, qty, x, y, opts = {}) {
    super('ground');
    this.itemId = itemId;
    this.id = itemId;
    this.qty = qty;
    this.x = x; this.y = y;
    this.owner = opts.owner ?? null;          // player name who can see it while private
    this.spawnTick = opts.tick ?? 0;
    this.publicTick = opts.publicTick ?? Infinity;
    this.despawnTick = opts.despawnTick ?? Infinity;
    this.respawnTicks = opts.respawnTicks ?? 0;  // permanent spawns respawn after being taken
  }
  get def() { return getItem(this.itemId); }
  get name() { return this.def?.name || this.itemId; }
}

export { getObject };
