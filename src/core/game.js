// The Game: owns world state, entities and the 600ms tick. This is the main API surface
// systems and networking use (see ARCHITECTURE.md "Game API").

import { EventBus } from './events.js';
import registry, { getItem, getObject, getNpc } from './registry.js';
import { Interactions } from './interactions.js';
import { ActionManager } from './actions.js';
import { TICK_MS, MAX_RUN_ENERGY } from './constants.js';
import { rollDropTable } from './drops.js';
import { buildWorld } from '../world/mapbuilder.js';
import { findPath, rectDistance } from '../world/pathfinding.js';
import { Player, Npc, RemotePlayer, WorldObject, GroundItem } from '../entities/entities.js';

const now = () => performance.now();

export class Game {
  constructor() {
    this.events = new EventBus();
    this.registry = registry;
    this.tickCount = 0;
    this.lastTickTime = now();
    this.config = {
      tickMs: TICK_MS,
      runDrainPerTick: 60,          // energy units (of 10000) per tick spent running
      restoreIntervalTicks: 100,    // HP regen / stat restore interval
      groundItemTicks: 200,         // dropped item lifetime
      groundItemPrivateTicks: 100,  // ticks before a drop becomes visible to others
    };
    this.interactions = new Interactions(this);
    this.actions = new ActionManager(this);
    this.tickHandlers = [];
    this.scheduled = [];
    this.npcs = new Map();          // uid -> Npc
    this.objects = new Map();       // uid -> WorldObject
    this.groundItems = new Map();   // uid -> GroundItem
    this.remotePlayers = new Map(); // peerId -> RemotePlayer
    this.player = null;
    this.world = null;
    this.ui = null;                 // UIManager (set by main)
    this.renderer = null;           // RenderManager (set by main)
    this.input = null;              // InputManager (set by main)
    this.net = { connected: false, init() {}, send() {}, broadcast() {} }; // replaced by src/net
    this.started = false;
  }

  // ---- convenience accessors for the local player ------------------------------------------
  get skills() { return this.player.skills; }
  get inventory() { return this.player.inventory; }
  get bank() { return this.player.bank; }
  get equipment() { return this.player.equipment; }
  /** 0..1 progress through the current tick (for render interpolation). */
  get tickProgress() { return Math.max(0, Math.min(1, (now() - this.lastTickTime) / this.config.tickMs)); }

  // ---- setup ------------------------------------------------------------------------------
  buildWorld() {
    buildWorld(this);
    this.makeRoomForBigNpcs();
    const cfg = registry.getMapConfig();
    this.player = new Player(this);
    this.player.setPosition(cfg.spawn.x, cfg.spawn.y);
  }

  /**
   * Size-aware movement: a 3x3/4x4 boss boxed in by scattered decoration (pines, lava rocks, bone piles) could not
   * take a single step. For every large NPC whose wander area has little room for its footprint, remove blocking
   * *decorative* scenery (no options, no transition, not structural) inside that area. Runs once before rendering;
   * deterministic, so every multiplayer peer gets the same world.
   */
  makeRoomForBigNpcs() {
    const w = this.world;
    const STRUCTURAL = /wall|fence|door|gate|bridge|pillar|ruin|ditch|statue|stair|ladder|portal|altar|tower|spire|house|hut|tent|palisade|booth|bank|gravestone|obelisk|cave|crypt|mound|sign/i;
    let removed = 0;
    for (const npc of [...this.npcs.values()]) {
      const s = npc.size || 1;
      if (s < 2) continue;
      const r = Math.max(1, npc.wanderRadius || 0);
      let fit = 0, total = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { total++; if (w.fits(npc.spawnX + dx, npc.spawnY + dy, s)) fit++; }
      if (fit / total >= 0.5) continue;
      const x0 = npc.spawnX - r, y0 = npc.spawnY - r, x1 = npc.spawnX + r + s - 1, y1 = npc.spawnY + r + s - 1;
      for (const obj of [...this.objects.values()]) {
        const d = obj.def;
        if (!d?.blocks || obj.x < x0 || obj.x > x1 || obj.y < y0 || obj.y > y1) continue;
        if ((d.options || []).some((o) => !/^examine$/i.test(o)) || d.teleport || d.openId || d.closedId) continue;
        if (STRUCTURAL.test(d.id) || STRUCTURAL.test(d.model?.template || '')) continue;
        this.removeObject(obj);
        removed++;
      }
    }
    return removed;
  }

  // ---- tick loop ----------------------------------------------------------------------------
  start() {
    if (this.started) return;
    this.started = true;
    this.lastTickTime = now();
    this._lastArea = null;
    this._lastWild = 0;
    this.checkArea(true);
    this._interval = setInterval(() => {
      const t = now();
      let n = 0;
      while (t - this.lastTickTime >= this.config.tickMs && n < 3) {
        this.lastTickTime += this.config.tickMs;
        this.tick();
        n++;
      }
      if (t - this.lastTickTime > this.config.tickMs * 5) this.lastTickTime = t; // fell far behind (tab hidden)
    }, 20);
    this.events.emit('game:start', { game: this });
  }

  /**
   * Register a per-tick handler. Lower priority runs first (engine movement runs before all handlers).
   * @returns {() => void} unsubscribe
   */
  onTick(fn, priority = 0) {
    const h = { fn, priority };
    this.tickHandlers.push(h);
    this.tickHandlers.sort((a, b) => a.priority - b.priority);
    return () => { const i = this.tickHandlers.indexOf(h); if (i >= 0) this.tickHandlers.splice(i, 1); };
  }

  /** Run fn after `ticks` ticks. Returns a handle with cancel(). */
  schedule(ticks, fn) {
    const h = { at: this.tickCount + Math.max(1, ticks), fn, cancelled: false, cancel() { this.cancelled = true; } };
    this.scheduled.push(h);
    return h;
  }

  tick() {
    const tick = ++this.tickCount;
    this.events.emit('tick:start', { tick });

    // scheduled callbacks
    if (this.scheduled.length) {
      const due = this.scheduled.filter((s) => s.at <= tick);
      this.scheduled = this.scheduled.filter((s) => s.at > tick);
      for (const s of due) if (!s.cancelled) { try { s.fn(); } catch (e) { console.error('[game] scheduled fn threw', e); } }
    }

    const p = this.player;
    // reset per-tick movement records
    for (const c of this.characters()) { c.prevX = c.x; c.prevY = c.y; c.steps = [{ x: c.x, y: c.y }]; c.teleported = false; }

    // player
    if (!p.dead) {
      this.updateFollow(p);
      this.preInteraction(p);
      // p.tripRun (Ctrl+click): run (or walk, when run is on) for this one trip only
      this.stepAlongPath(p, (p.tripRun ?? p.running) && p.runEnergy > 0 ? 2 : 1);
      this.postInteraction(p);
      if (p.tripRun != null && !p.path.length && !p.interaction) p.tripRun = null;
      this.actions.process(p);
      this.updateRunEnergy(p);
      p.playTime++;
    }

    // npcs (an NPC the player is walking over to talk/trade with waits instead of wandering off)
    const approaching = p.interaction?.target?.type === 'npc' && p.interaction.option?.toLowerCase() !== 'attack' ? p.interaction.target : null;
    this.buildNpcOccupancy();
    for (const npc of this.npcs.values()) {
      if (npc.dead || npc.hidden) continue;
      const ox = npc.x, oy = npc.y;
      // multiplayer (src/net/npcs.js): a joiner only walks shared NPCs to the host's positions; the host
      // leaves NPCs far from every player dormant
      if (npc.netControlled) { this.stepAlongPath(npc, npc.netSpeed || 1); continue; }
      if (npc.netDormant && !npc.combatTarget) continue;
      if (npc.action) this.actions.process(npc);
      if (npc === approaching && !npc.combatTarget && !npc.forced) npc.path = [];
      if (!npc.combatTarget && !npc.path.length && !npc.talkingTo && npc !== approaching && npc.wanderRadius > 0 && Math.random() < 0.08) this.wander(npc);
      // idle wanderers don't walk into each other (chasing / returning / forced movement is never held up, and an
      // NPC already overlapping another one may always step away)
      if (npc.path.length && !npc.combatTarget && !npc.forced && !npc.state?.returning
        && this.npcOccupied(npc, npc.path[0].x, npc.path[0].y) && !this.npcOccupied(npc, npc.x, npc.y)) npc.path = [];
      this.stepAlongPath(npc, 1);
      if (npc.x !== ox || npc.y !== oy) { this.markNpc(npc, ox, oy, -1); this.markNpc(npc, npc.x, npc.y, 1); }
    }

    // remote players: walk toward their last networked position
    for (const rp of this.remotePlayers.values()) this.updateRemote(rp);

    // system tick handlers
    for (const h of [...this.tickHandlers]) {
      try { h.fn(tick); } catch (e) { console.error('[game] tick handler threw', e); }
    }

    // ground items
    for (const gi of this.groundItems.values()) if (gi.despawnTick <= tick) this.removeGroundItem(gi, true);

    // passive restoration
    if (tick % this.config.restoreIntervalTicks === 0) p.skills.passiveRestore();
    if (tick % 50 === 0 && p.specialEnergy < 100) { p.specialEnergy = Math.min(100, p.specialEnergy + 10); this.events.emit('special:change', { player: p }); }

    for (const c of this.characters()) this.updateFacing(c);
    if (p.x !== p.prevX || p.y !== p.prevY) { this.checkArea(); this.events.emit('player:move', { player: p }); }
    this.events.emit('tick', { tick });
  }

  *characters() {
    if (this.player) yield this.player;
    yield* this.npcs.values();
    yield* this.remotePlayers.values();
  }

  // ---- movement -----------------------------------------------------------------------------
  /** Compute a path for `entity` to a goal rect (see pathfinding.js). Sets entity.path. */
  pathTo(entity, goal) {
    const { path, reached } = findPath(this.world, entity.x, entity.y, goal, { size: entity.size || 1 });
    entity.path = path;
    return reached;
  }

  /** Player/entity walks to a tile (closest reachable if blocked). Interrupts actions. */
  walkTo(entity, x, y) {
    if (this.actions.isLocked(entity)) return false;
    if (!this.actions.interrupt(entity, 'moved')) return false;
    entity.interaction = null;
    entity.combatTarget = null;
    entity.following = null;
    entity.faceTarget = null;
    this.pathTo(entity, { x0: x, y0: y, x1: x, y1: y, mode: 'tile' });
    if (entity === this.player) {
      const last = entity.path[entity.path.length - 1];
      entity.destination = last ? { x: last.x, y: last.y } : null;
      this.events.emit('player:walk', { x, y });
    }
    return true;
  }

  /** Instantly moves an entity. */
  teleport(entity, x, y) {
    const far = Math.max(Math.abs(entity.x - x), Math.abs(entity.y - y)) > 1;
    entity.setPosition(x, y);
    entity.interaction = null;
    entity.path = [];
    entity.following = null;
    if (far) {
      // a real relocation: forget whatever we were fighting/doing at the old spot
      entity.combatTarget = null;
      entity.faceTarget = null;
      if (entity.action && !entity.forced) this.actions.stop(entity, 'teleport');
      for (const n of this.npcs.values()) if (n.combatTarget === entity && Math.max(Math.abs(n.x - x), Math.abs(n.y - y)) > 16) n.combatTarget = null;
    }
    if (entity.elevation) entity.elevation = 0;
    if (entity === this.player) { entity.destination = null; this.checkArea(); }
    this.events.emit('teleport', { entity, x, y });
  }

  /**
   * Move an entity along `tiles` ignoring collision (agility obstacles, knock-backs...).
   * The entity is locked until it arrives. opts: { anim: loop animation, onDone() }
   */
  forceWalk(entity, tiles, opts = {}) {
    this.actions.stop(entity, 'forced');
    entity.interaction = null;
    entity.combatTarget = null;
    entity.path = tiles.map((t) => ({ x: t.x, y: t.y }));
    entity.forced = true;
    if (opts.anim) entity.loopAnim = opts.anim;
    this.actions.lock(entity, tiles.length);
    this.schedule(Math.max(1, tiles.length), () => {
      entity.forced = false;
      if (opts.anim && entity.loopAnim === opts.anim) entity.loopAnim = null;
      opts.onDone?.();
    });
  }

  stepAlongPath(c, maxSteps) {
    let moved = 0;
    if (c.forced) maxSteps = 1;
    // big NPCs need their whole footprint free (shared NPCs on a joiner just follow the host's valid positions)
    const size = c.netControlled ? 1 : c.size || 1;
    while (moved < maxSteps && c.path.length) {
      const next = c.path[0];
      const dx = Math.sign(next.x - c.x), dy = Math.sign(next.y - c.y);
      if (Math.abs(next.x - c.x) > 1 || Math.abs(next.y - c.y) > 1 || (!c.forced && !this.world.canStepSize(c.x, c.y, dx, dy, size))) {
        c.path = []; // blocked: give up (caller may re-path)
        break;
      }
      c.path.shift();
      c.x = next.x; c.y = next.y;
      c.steps.push({ x: c.x, y: c.y });
      moved++;
    }
    if (moved && c.type === 'player') {
      if (!c.path.length) c.destination = null;
      if (moved >= 2) c._ranThisTick = true;
    }
    return moved;
  }

  updateRunEnergy(p) {
    const ran = p._ranThisTick; p._ranThisTick = false;
    if (ran) {
      p.runEnergy = Math.max(0, p.runEnergy - this.config.runDrainPerTick);
      if (p.runEnergy === 0 && p.runToggled) { p.runToggled = false; p.running = false; this.message('You have run out of energy.'); }
    } else if (p.runEnergy < MAX_RUN_ENERGY) {
      p.runEnergy = Math.min(MAX_RUN_ENERGY, p.runEnergy + 8 + Math.floor(p.skills.getLevel('agility') / 6) * 1.5);
    }
    this.events.emit('run:change', { player: p });
  }

  toggleRun(on = !this.player.runToggled) {
    const p = this.player;
    if (on && p.runEnergy < 100) { this.message('You do not have enough energy to run.'); on = false; }
    p.runToggled = on;
    p.running = on;
    this.events.emit('run:change', { player: p });
  }

  wander(npc) {
    const r = npc.wanderRadius, size = npc.size || 1;
    const tx = npc.spawnX + Math.round((Math.random() * 2 - 1) * r);
    const ty = npc.spawnY + Math.round((Math.random() * 2 - 1) * r);
    // the whole footprint must fit, and don't pick a spot another NPC is standing on
    if (!this.world.fits(tx, ty, size) || this.npcOccupied(npc, tx, ty)) return;
    const { path } = findPath(this.world, npc.x, npc.y, { x0: tx, y0: ty, x1: tx, y1: ty }, { maxNodes: 200, radius: r + 4, size });
    npc.path = path.slice(0, 8);
  }

  /** Rebuild the per-tick NPC occupancy grid (counts of NPC footprints per tile; used to stop wanderers stacking). */
  buildNpcOccupancy() {
    const w = this.world;
    if (!this._npcOcc || this._npcOcc.length !== w.width * w.height) this._npcOcc = new Uint8Array(w.width * w.height);
    else this._npcOcc.fill(0);
    for (const n of this.npcs.values()) if (!n.dead && !n.hidden) this.markNpc(n, n.x, n.y, 1);
  }

  markNpc(npc, x, y, d) {
    const occ = this._npcOcc, w = this.world, s = npc.size || 1;
    if (!occ) return;
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      if (!w.inBounds(x + dx, y + dy)) continue;
      const i = w.idx(x + dx, y + dy);
      occ[i] = d > 0 ? Math.min(255, occ[i] + 1) : Math.max(0, occ[i] - 1);
    }
  }

  /** True if `npc`'s footprint placed at (x, y) would overlap another NPC (its own current tiles excluded). */
  npcOccupied(npc, x, y) {
    const occ = this._npcOcc, w = this.world, s = npc.size || 1;
    if (!occ) return false;
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!w.inBounds(tx, ty)) continue;
      const own = !npc.dead && !npc.hidden && tx >= npc.x && tx < npc.x + s && ty >= npc.y && ty < npc.y + s ? 1 : 0;
      if (occ[w.idx(tx, ty)] > own) return true;
    }
    return false;
  }

  /** Re-path `entity` so it ends up within `range` of `target` (1 = cardinal adjacency). Returns true if already in range. */
  moveToward(entity, target, range = 1) {
    if (this.inRange(entity, target, range)) { entity.path = []; return true; }
    const r = target.rect ? target.rect() : { x0: target.x, y0: target.y, x1: target.x, y1: target.y };
    const goal = { ...r, mode: range <= 0 ? 'tile' : range === 1 ? 'adjacent' : 'range', range };
    const { path } = findPath(this.world, entity.x, entity.y, goal, { maxNodes: 3000, radius: 40, size: entity.size || 1 });
    entity.path = path;
    return false;
  }

  /**
   * Range test between an entity and a target footprint. range 0 = on it, 1 = cardinally adjacent, n = Chebyshev <= n.
   * Both footprints count (a 2x2 or 3x3 NPC is in melee range when any edge tile touches the target), matching
   * combat_formulas.inAttackRange.
   */
  inRange(entity, target, range = 1) {
    const r = target.rect ? target.rect() : { x0: target.x, y0: target.y, x1: target.x, y1: target.y };
    const ex = entity.x, ey = entity.y, e = (entity.size || 1) - 1;
    if (range <= 0) return ex >= r.x0 && ex <= r.x1 && ey >= r.y0 && ey <= r.y1;
    const dx = Math.max(r.x0 - (ex + e), 0, ex - r.x1), dy = Math.max(r.y0 - (ey + e), 0, ey - r.y1);
    if (dx === 0 && dy === 0) return false; // on / overlapping the target
    if (range === 1) return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    return Math.max(dx, dy) <= range;
  }

  distance(a, b) {
    const r = b.rect ? b.rect() : { x0: b.x, y0: b.y, x1: b.x, y1: b.y };
    return rectDistance(a.x, a.y, r.x0, r.y0, r.x1, r.y1);
  }

  updateFacing(c) {
    const last = c.steps[c.steps.length - 1], prev = c.steps[c.steps.length - 2];
    if (c.faceTarget && (c.faceTarget.dead === undefined || !c.faceTarget.hidden)) {
      const t = c.faceTarget;
      const tx = (t.centerX ? t.centerX() : t.x + 0.5) - c.centerX();
      const ty = (t.centerY ? t.centerY() : t.y + 0.5) - c.centerY();
      if (tx || ty) c.faceAngle = Math.atan2(tx, ty);
    } else if (prev && last && (last.x !== prev.x || last.y !== prev.y)) {
      c.faceAngle = Math.atan2(last.x - prev.x, last.y - prev.y);
    } else if (c.faceTile) {
      const tx = c.faceTile.x + 0.5 - c.centerX(), ty = c.faceTile.y + 0.5 - c.centerY();
      if (tx || ty) c.faceAngle = Math.atan2(tx, ty);
      c.faceTile = null;
    }
  }

  updateFollow(p) {
    const t = p.following;
    if (!t) return;
    if (t.dead || t.hidden || (t.type === 'remote' && !this.remotePlayers.has(t.peerId))) { p.following = null; return; }
    if (this.distance(p, t) > 1 || this.inRange(p, t, 0)) {
      const last = t.steps[0] || t;
      this.pathTo(p, { x0: last.x, y0: last.y, x1: last.x, y1: last.y, mode: 'tile' });
      if (p.path.length && p.path[p.path.length - 1].x === t.x && p.path[p.path.length - 1].y === t.y) p.path.pop();
    }
  }

  updateRemote(rp) {
    const t = rp.netTarget;
    if (!t) return;
    const d = Math.max(Math.abs(t.x - rp.x), Math.abs(t.y - rp.y));
    if (d === 0) { rp.path = []; return; }
    if (d > 12) { rp.setPosition(t.x, t.y); return; }
    if (!rp.path.length || rp._pathTarget !== `${t.x},${t.y}`) {
      rp._pathTarget = `${t.x},${t.y}`;
      const { path } = findPath(this.world, rp.x, rp.y, { x0: t.x, y0: t.y, x1: t.x, y1: t.y }, { maxNodes: 1500, radius: 20 });
      rp.path = path;
    }
    this.stepAlongPath(rp, d >= 2 || rp.running ? 2 : 1);
  }

  // ---- interactions -------------------------------------------------------------------------
  /**
   * Walk to `target` then dispatch the interaction handler for `option`.
   * @param {object} extra { kind?: override kind (itemOnObject, spellOnNpc...), item?: {id, qty}, slot?, spell? }
   */
  interact(player, target, option, extra = {}) {
    if (this.actions.isLocked(player)) return;
    if (!this.actions.interrupt(player, 'moved')) return;
    player.combatTarget = null;
    player.following = null;
    const kind = extra.kind || this.kindOf(target);
    const [idA, idB] = this.idsFor(kind, target, extra);
    const ctx = this.makeCtx(player, target, option, extra);
    const opts = this.interactions.optsFor(kind, option, idA, idB);
    let range = typeof opts.range === 'function' ? opts.range(ctx) : opts.range;
    if (range == null) range = this.defaultRange(kind, target);
    player.interaction = { kind, target, option, extra, range, idA, idB, lastX: target.x, lastY: target.y, tries: 0 };
    player.faceTarget = null;
    if (!this.inRange(player, target, range)) this.moveToward(player, target, range);
    else player.path = [];
    if (player === this.player) {
      const last = player.path[player.path.length - 1];
      player.destination = last ? { x: last.x, y: last.y } : null;
    }
  }

  kindOf(t) {
    return t.type === 'object' ? 'object' : t.type === 'npc' ? 'npc' : t.type === 'ground' ? 'ground' : 'player';
  }

  idsFor(kind, target, extra) {
    if (kind.startsWith('item')) return [extra.item?.id, target.id];
    if (kind.startsWith('spell')) return [extra.spell?.id, target.id];
    return [target.type === 'remote' ? '*' : target.id, null];
  }

  defaultRange(kind, target) {
    if (kind === 'ground' || kind === 'itemOnGround' || kind === 'spellOnGround') {
      return this.world.isWalkable(target.x, target.y) ? 0 : 1;
    }
    if (target.type === 'object') return target.def.interactRange ?? 1;
    if (kind.startsWith('spellOn')) return 10;
    return 1;
  }

  makeCtx(player, target, option, extra = {}) {
    return { game: this, player, target, option, def: target?.def, ...extra };
  }

  targetGone(t) {
    if (!t) return true;
    if (t.type === 'npc') return t.dead || t.hidden || !this.npcs.has(t.uid);
    if (t.type === 'object') return !this.objects.has(t.uid) || t.hidden;
    if (t.type === 'ground') return !this.groundItems.has(t.uid);
    if (t.type === 'remote') return !this.remotePlayers.has(t.peerId);
    return false;
  }

  preInteraction(p) {
    const it = p.interaction;
    if (!it) return;
    if (this.targetGone(it.target)) { p.interaction = null; p.path = []; return; }
    const t = it.target;
    if ((t.x !== it.lastX || t.y !== it.lastY) && !this.inRange(p, t, it.range)) {
      it.lastX = t.x; it.lastY = t.y;
      this.moveToward(p, t, it.range);
    }
  }

  postInteraction(p) {
    const it = p.interaction;
    if (!it) return;
    if (this.inRange(p, it.target, it.range)) {
      p.interaction = null;
      p.path = [];
      p.faceTile = { x: Math.floor(it.target.centerX ? it.target.centerX() : it.target.x), y: Math.floor(it.target.centerY ? it.target.centerY() : it.target.y) };
      this.fireInteraction(p, it);
    } else if (!p.path.length) {
      // try re-pathing once (target may have moved); otherwise give up
      if (it.tries++ < 2 && !this.moveToward(p, it.target, it.range) && p.path.length) return;
      p.interaction = null;
      if (p === this.player) this.message("I can't reach that!");
    }
  }

  fireInteraction(p, it) {
    const ctx = this.makeCtx(p, it.target, it.option, it.extra);
    if (it.kind.startsWith('item') && it.kind !== 'item' && p.inventory) {
      // "Use X -> target": the item may have been dropped/eaten/moved while walking there
      const cur = ctx.slot != null ? p.inventory.get(ctx.slot) : null;
      if (!cur || cur.id !== it.idA) {
        const slot = it.idA ? p.inventory.indexOf(it.idA) : -1;
        if (slot < 0) return;
        ctx.slot = slot;
        ctx.item = p.inventory.get(slot);
      } else ctx.item = cur;
    }
    if (it.target.type === 'npc' || it.target.type === 'remote') p.faceTarget = it.target;
    const handled = this.interactions.dispatch(it.kind, it.option, it.idA, it.idB, ctx);
    if (!handled && p === this.player) this.message('Nothing interesting happens.');
  }

  /** Immediately runs an inventory item option (no walking). */
  useItemOption(player, slot, option) {
    const it = player.inventory.get(slot);
    if (!it) return;
    if (this.actions.isLocked(player)) return;
    const ctx = { game: this, player, item: it, slot, option, def: getItem(it.id) };
    if (!this.interactions.dispatch('item', option, it.id, null, ctx)) this.message('Nothing interesting happens.');
  }

  /** Inventory item used on another inventory item. */
  useItemOnItem(player, slotA, slotB) {
    const a = player.inventory.get(slotA), b = player.inventory.get(slotB);
    if (!a || !b || slotA === slotB) return;
    const ctx = { game: this, player, item: a, slot: slotA, other: b, otherSlot: slotB };
    if (!this.interactions.dispatch('itemOnItem', 'use', a.id, b.id, ctx)) this.message('Nothing interesting happens.');
  }

  /** Cast a spell from the spellbook with no target (teleports etc). */
  castSpell(player, spellId) {
    const spell = registry.getSpell(spellId);
    if (!spell) return;
    const ctx = { game: this, player, spell };
    if (!this.interactions.dispatch('spell', 'cast', spellId, null, ctx)) this.message('Nothing interesting happens.');
  }

  // ---- items --------------------------------------------------------------------------------
  /** Adds to inventory; overflow drops to the ground under the player. Returns amount added to inventory. */
  giveItem(id, qty = 1, player = this.player) {
    const added = player.inventory.add(id, qty);
    if (added < qty) {
      this.spawnGroundItem(id, qty - added, player.x, player.y, { owner: player.name });
      this.message('Your inventory is too full; the item falls to the ground.');
    }
    return added;
  }
  removeItem(id, qty = 1, player = this.player) { return player.inventory.remove(id, qty); }
  hasItem(id, qty = 1, player = this.player) { return player.inventory.has(id, qty); }

  /** Equip the inventory item in `slot`. Returns true on success. */
  equip(player, slot) {
    const it = player.inventory.get(slot);
    const def = it && getItem(it.id);
    if (!def?.slot) return false;
    for (const [skill, lvl] of Object.entries(def.requirements || {})) {
      if (player.skills.getLevel(skill) < lvl) {
        this.message(`You need ${/^[aeiou]/i.test(skill) ? 'an' : 'a'} ${skill[0].toUpperCase() + skill.slice(1)} level of ${lvl} to ${def.slot === 'weapon' ? 'wield' : 'wear'} this.`);
        return false;
      }
    }
    const chk = this.events.emit('equip:before', { player, item: it, def, cancel: false });
    if (chk.cancel) return false;
    const eq = player.equipment;
    const target = def.slot;
    const toUnequip = [];
    const cur = eq.get(target);
    if (cur && !(def.stackable && cur.id === it.id)) toUnequip.push(target);
    if (def.twoHanded && eq.get('shield')) toUnequip.push('shield');
    if (target === 'shield' && eq.weapon()?.twoHanded) toUnequip.push('weapon');
    // need space for everything removed beyond the slot freed by the equipped item
    if (toUnequip.length - 1 > player.inventory.freeSlots()) { this.message("You don't have enough free inventory space to do that."); return false; }
    const taken = player.inventory.removeAt(slot) || { id: it.id, qty: it.qty }; // removeAt zeroes `it.qty`
    if (cur && def.stackable && cur.id === it.id) eq.set(target, { id: it.id, qty: cur.qty + taken.qty });
    else {
      const removed = toUnequip.map((s) => { const o = eq.get(s); eq.slots[s] = null; return o; });
      eq.set(target, taken);
      removed.forEach((o, k) => { if (k === 0 && !player.inventory.get(slot)) player.inventory.set(slot, o); else player.inventory.add(o.id, o.qty); });
    }
    const wt = registry.getWeaponType(eq.weaponType());
    if (player.combatStyle >= wt.styles.length) player.combatStyle = 0;
    this.events.emit('equip', { player, item: it, def });
    return true;
  }

  unequip(player, eqSlot) {
    const cur = player.equipment.get(eqSlot);
    if (!cur) return false;
    if (player.inventory.capacityFor(cur.id) < cur.qty) { this.message("You don't have enough free inventory space to do that."); return false; }
    player.equipment.set(eqSlot, null);
    player.inventory.add(cur.id, cur.qty);
    const wt = registry.getWeaponType(player.equipment.weaponType());
    if (player.combatStyle >= wt.styles.length) player.combatStyle = 0;
    this.events.emit('unequip', { player, item: cur, slot: eqSlot });
    return true;
  }

  // ---- objects ------------------------------------------------------------------------------
  spawnObject(id, x, y, opts = {}) {
    const def = getObject(id);
    if (!def) { console.warn(`[game] unknown object ${id}`); return null; }
    const obj = new WorldObject(def, x, y, opts);
    this.objects.set(obj.uid, obj);
    this.world.addObject(obj);
    this.events.emit('object:add', { object: obj });
    return obj;
  }

  removeObject(obj) {
    if (!this.objects.has(obj.uid)) return;
    this.world.removeObject(obj);
    this.objects.delete(obj.uid);
    this.events.emit('object:remove', { object: obj });
  }

  /** Swap an object's definition in place (e.g. tree -> stump). If revertTicks, swaps back later. */
  replaceObject(obj, newId, revertTicks = 0) {
    const def = getObject(newId);
    if (!def) { console.warn(`[game] unknown object ${newId}`); return obj; }
    const oldId = obj.id;
    this.world.removeObject(obj);
    obj.setDef(def);
    this.world.addObject(obj);
    this.events.emit('object:change', { object: obj, from: oldId });
    if (revertTicks > 0) {
      obj._revert?.cancel();
      obj._revert = this.schedule(revertTicks, () => { obj._revert = null; if (this.objects.has(obj.uid)) this.replaceObject(obj, oldId); });
    }
    return obj;
  }

  /** Deplete a resource: switches to def.depleted (or hides) and restores after `ticks`. */
  depleteObject(obj, ticks) {
    const t = ticks ?? (Array.isArray(obj.def.respawnTicks) ? obj.def.respawnTicks[0] + Math.floor(Math.random() * (obj.def.respawnTicks[1] - obj.def.respawnTicks[0])) : obj.def.respawnTicks ?? 30);
    const from = obj.id;
    if (obj.def.depleted) {
      if (!getObject(obj.def.depleted)) return this.replaceObject(obj, obj.def.depleted, t); // (warns)
      this.replaceObject(obj, obj.def.depleted);
      obj._depleted = { from, hide: false };
    } else {
      obj.hidden = true;
      this.world.removeObject(obj);
      this.events.emit('object:change', { object: obj });
      obj._depleted = { from, hide: true };
    }
    obj._revert?.cancel();
    obj._revert = this.schedule(t, () => { obj._revert = null; this.restoreObject(obj); });
    this.events.emit('object:deplete', { object: obj, ticks: t });
    return obj;
  }

  /** Brings a depleted resource back now (normally scheduled by depleteObject; multiplayer restores early). */
  restoreObject(obj) {
    const d = obj._depleted;
    if (!d) return;
    obj._depleted = null;
    obj._revert?.cancel();
    obj._revert = null;
    if (!this.objects.has(obj.uid)) return;
    if (d.hide) { obj.hidden = false; this.world.addObject(obj); this.events.emit('object:change', { object: obj }); }
    else this.replaceObject(obj, d.from);
    this.events.emit('object:restore', { object: obj });
  }

  getObjectAt(x, y, pred = () => true) { return this.world.objectsAt(x, y).find((o) => !o.hidden && pred(o)) || null; }

  findObjects(pred) { const out = []; for (const o of this.objects.values()) if (!o.hidden && pred(o)) out.push(o); return out; }

  // ---- npcs -------------------------------------------------------------------------------------
  spawnNpc(id, x, y, opts = {}) {
    const def = getNpc(id);
    if (!def) { console.warn(`[game] unknown npc ${id}`); return null; }
    const npc = new Npc(def, x, y, opts);
    this.npcs.set(npc.uid, npc);
    this.events.emit('npc:add', { npc });
    return npc;
  }

  removeNpc(npc) {
    if (!this.npcs.has(npc.uid)) return;
    this.npcs.delete(npc.uid);
    this.events.emit('npc:remove', { npc });
  }

  npcsNear(x, y, radius, pred = () => true) {
    const out = [];
    for (const n of this.npcs.values()) if (!n.dead && !n.hidden && Math.max(Math.abs(n.x - x), Math.abs(n.y - y)) <= radius && pred(n)) out.push(n);
    return out;
  }

  /** Brings a dead/hidden npc back at its spawn point. */
  respawnNpc(npc) {
    npc.dead = false; npc.hidden = false;
    npc.hp = npc.maxHp;
    npc.combatTarget = null; npc.anim = null; npc.hitsplats = [];
    npc.setPosition(npc.spawnX, npc.spawnY);
    npc.appearanceVersion++;
    this.events.emit('npc:respawn', { npc });
  }

  // ---- ground items -----------------------------------------------------------------------------
  spawnGroundItem(id, qty, x, y, opts = {}) {
    const def = getItem(id);
    if (!def) { console.warn(`[game] unknown item ${id}`); return null; }
    const owner = opts.owner ?? null;
    if (def.stackable && !opts.permanent) {
      for (const g of this.groundItems.values()) {
        if (g.itemId === id && g.x === x && g.y === y && g.owner === owner && !g.respawnTicks) {
          g.qty += qty; g.despawnTick = this.tickCount + (opts.ticks ?? this.config.groundItemTicks);
          this.events.emit('ground:change', { item: g });
          return g;
        }
      }
    }
    const gi = new GroundItem(id, qty, x, y, {
      owner,
      tick: this.tickCount,
      publicTick: owner ? this.tickCount + (opts.privateTicks ?? this.config.groundItemPrivateTicks) : this.tickCount,
      despawnTick: opts.permanent ? Infinity : this.tickCount + (opts.ticks ?? this.config.groundItemTicks),
      respawnTicks: opts.permanent ? opts.respawnTicks ?? 50 : 0,
    });
    this.groundItems.set(gi.uid, gi);
    this.events.emit('ground:add', { item: gi });
    return gi;
  }

  /** Removes a ground item. Permanent spawns come back after their respawn time. */
  removeGroundItem(gi, expired = false) {
    if (!this.groundItems.has(gi.uid)) return;
    this.groundItems.delete(gi.uid);
    this.events.emit('ground:remove', { item: gi, expired });
    if (gi.respawnTicks) this.schedule(gi.respawnTicks, () => this.spawnGroundItem(gi.itemId, gi.qty, gi.x, gi.y, { permanent: true, respawnTicks: gi.respawnTicks }));
  }

  groundItemsAt(x, y) { return [...this.groundItems.values()].filter((g) => g.x === x && g.y === y && this.canSeeGroundItem(g)); }

  canSeeGroundItem(g, player = this.player) { return !g.owner || g.owner === player.name || this.tickCount >= g.publicTick; }

  // ---- combat-ish core --------------------------------------------------------------------------
  /**
   * Apply damage to any character (player, npc, remote). Listeners of 'damage:before' may modify
   * payload.amount. Returns the damage dealt.
   * @param {object} opts { source: Character|null, type: 'melee'|'ranged'|'magic'|'poison'|'typeless', splat?: 'damage'|'block'|'poison'|'venom'|'heal', silent? }
   */
  applyDamage(target, amount, opts = {}) {
    if (!target || target.dead) return 0;
    // opts.netRaw: a hit already modified on the attacker's client (multiplayer shared NPCs)
    const pre = opts.netRaw ? { amount: Math.max(0, Math.floor(amount)) } : this.events.emit('damage:before', { target, amount: Math.max(0, Math.floor(amount)), ...opts });
    const dmg = Math.max(0, Math.min(Math.floor(pre.amount), target.hp));
    if (target.type === 'remote') {
      // remote HP is authoritative on its owner's client; show the splat only
    } else if (target.netControlled) {
      // shared NPC simulated by the multiplayer host: predict locally, the host applies it (src/net/npcs.js)
      this.net.npcDamage?.(target, dmg, opts);
    } else {
      target.hp = target.hp - dmg;
    }
    target.hitsplats.push({ amount: dmg, type: dmg > 0 ? opts.splat || 'damage' : 'block', time: now() });
    if (target.hitsplats.length > 6) target.hitsplats.shift();
    target.hpBarUntil = now() + 6000;
    target.lastAttackedTick = this.tickCount;
    if (opts.source) target.lastAttacker = opts.source;
    this.events.emit('damage', { target, amount: dmg, ...opts });
    if (target.type !== 'remote' && !target.netControlled && target.hp <= 0) this.kill(target, opts.source || null);
    return dmg;
  }

  heal(target, amount) {
    if (target.dead) return;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    if (target === this.player) this.events.emit('stats:change', { player: target, skill: 'hitpoints' });
  }

  /** Death handling: npc drops + respawn; player emits 'player:death' (default: respawn at cfg.respawn). */
  kill(target, killer = null) {
    if (target.dead) return;
    target.dead = true;
    target.path = [];
    target.interaction = null;
    target.combatTarget = null;
    this.actions.stop(target, 'death');
    this.playAnim(target, 'death', 1800);
    for (const c of this.characters()) if (c.combatTarget === target) c.combatTarget = null;

    if (target.type === 'npc') {
      // multiplayer shared NPC (src/net/npcs.js): {killer} credited locally, {dropOwner} (host), {remote} = the host
      // rolls the drops and respawns it
      const net = target.netSid != null ? this.net.npcDeath?.(target, killer) : null;
      if (net) killer = net.killer;
      const ev = this.events.emit('npc:death', { npc: target, killer, noDrops: false });
      this.schedule(3, () => {
        if (net?.remote) { if (target.dead) target.hidden = true; return; }
        if (!ev.noDrops && target.def.dropTable) {
          const owner = net ? net.dropOwner : killer?.type === 'player' ? killer.name : null;
          for (const d of rollDropTable(target.def.dropTable)) this.spawnGroundItem(d.id, d.qty, target.x, target.y, { owner });
        }
        target.hidden = true;
        if (target.respawns) this.schedule(target.def.respawnTicks, () => this.respawnNpc(target));
        else this.removeNpc(target);
      });
    } else if (target.type === 'player') {
      const ev = this.events.emit('player:death', { player: target, killer, handled: false });
      if (!ev.handled) {
        this.schedule(4, () => {
          const cfg = registry.getMapConfig();
          this.respawnPlayer(target, cfg.respawn.x, cfg.respawn.y);
          this.message('Oh dear, you are dead!');
        });
      }
    }
  }

  /** Restores a dead player (full HP/stats/prayer) at x,y. */
  respawnPlayer(player, x, y) {
    player.dead = false;
    player.anim = null;
    player.hitsplats = [];
    for (const s of Object.keys(player.skills.current)) player.skills.setCurrent(s, player.skills.getLevel(s));
    player.activePrayers.clear();
    player.runEnergy = MAX_RUN_ENERGY;
    this.teleport(player, x, y);
    player.appearanceVersion++;
    this.events.emit('player:respawn', { player });
  }

  // ---- presentation helpers -------------------------------------------------------------------
  /** Chat message. type: 'game' | 'public' | 'private' | 'clan' | 'trade' | 'system'. Supports <col=rrggbb>..</col>. */
  message(text, type = 'game', from = null) { this.events.emit('chat', { type, text, from }); }

  /** Overhead text on a character (also public chat line for players). */
  say(entity, text, opts = {}) {
    entity.overhead = { text, until: now() + (opts.duration ?? 5000), color: opts.color || '#ffff00' };
    if (opts.chat !== false && (entity.type === 'player' || entity.type === 'remote')) this.message(text, 'public', entity.name);
    if (entity === this.player && opts.broadcast !== false) this.events.emit('chat:public', { player: entity, text });
  }

  /** One-shot animation: death, slash, stab, punch, shoot, cast, eat, block, chop, mine, fish, cook, smith, pickup, climb... */
  playAnim(entity, name, duration = 1200) { entity.anim = { name, start: now(), duration }; }

  /** Graphic effect at a tile or on an entity (rendered by RenderManager). */
  spawnEffect(kind, at, opts = {}) { this.events.emit('effect', { kind, at, ...opts }); }

  // ---- area tracking ----------------------------------------------------------------------------
  checkArea(force = false) {
    const p = this.player;
    const area = this.world.getArea(p.x, p.y);
    if (force || area?.id !== this._lastArea?.id) {
      const prev = this._lastArea; this._lastArea = area;
      this.events.emit('area:enter', { area, prev });
    }
    const wl = this.world.getWildernessLevel(p.x, p.y);
    if (force || wl !== this._lastWild) {
      const prev = this._lastWild; this._lastWild = wl;
      this.events.emit('wilderness:change', { level: wl, prev });
      if (wl > 0 && !prev) this.events.emit('wilderness:enter', { level: wl });
      if (!wl && prev) this.events.emit('wilderness:leave', {});
    }
  }

  // ---- remote players (networking) ------------------------------------------------------------
  addRemotePlayer(peerId, snapshot) {
    if (this.remotePlayers.has(peerId)) return this.updateRemotePlayer(peerId, snapshot);
    const rp = new RemotePlayer(peerId, snapshot);
    this.remotePlayers.set(peerId, rp);
    this.events.emit('remote:add', { remote: rp });
    return rp;
  }
  updateRemotePlayer(peerId, snapshot) {
    const rp = this.remotePlayers.get(peerId);
    if (!rp) return this.addRemotePlayer(peerId, snapshot);
    const wasDead = rp.dead;
    rp.applySnapshot(snapshot);
    if (snapshot.dead && !wasDead) { rp.dead = true; this.playAnim(rp, 'death', 1800); }
    if (snapshot.dead === false && wasDead) { rp.dead = false; rp.anim = null; }
    if (snapshot.overhead && (!rp.overhead || rp.overhead.text !== snapshot.overhead)) this.say(rp, snapshot.overhead, { chat: false });
    return rp;
  }
  removeRemotePlayer(peerId) {
    const rp = this.remotePlayers.get(peerId);
    if (!rp) return;
    this.remotePlayers.delete(peerId);
    this.events.emit('remote:remove', { remote: rp });
  }
  getRemotePlayer(peerId) { return this.remotePlayers.get(peerId) || null; }
}
