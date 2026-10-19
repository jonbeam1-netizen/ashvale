// Per-entity action queue. An entity runs at most one action at a time; starting a new one
// (or walking) interrupts the current one. Actions are plain objects:
//
// {
//   name: 'woodcutting',     // for debugging / isBusy checks
//   anim: 'chop',            // looped animation while the action runs (optional)
//   delay: 0,                // ticks before the first onTick call
//   interval: 1,             // call onTick every N ticks
//   interruptible: true,     // false = walking/clicking can't cancel it
//   onStart(ctx), onTick(ctx) -> false to finish, onStop(ctx, reason)
// }
// ctx = { game, entity, player (=entity), action, ticks }  (ticks = onTick calls so far)

export class ActionManager {
  constructor(game) {
    this.game = game;
  }

  current(entity) { return entity.action || null; }
  isBusy(entity) { return !!entity.action; }

  start(entity, action) {
    if (entity.action) this.stop(entity, 'replaced');
    const a = { delay: 0, interval: 1, interruptible: true, ...action, _wait: action.delay ?? 0, _ticks: 0 };
    entity.action = a;
    entity.loopAnim = a.anim || null;
    try { a.onStart?.(this.ctx(entity, a)); } catch (e) { console.error('[actions] onStart threw', e); }
    this.game.events.emit('action:start', { entity, action: a });
    return a;
  }

  /** Stops the current action. reason: 'interrupted' | 'replaced' | 'done' | 'moved' | string */
  stop(entity, reason = 'interrupted') {
    const a = entity.action;
    if (!a) return;
    entity.action = null;
    entity.loopAnim = null;
    try { a.onStop?.(this.ctx(entity, a), reason); } catch (e) { console.error('[actions] onStop threw', e); }
    this.game.events.emit('action:stop', { entity, action: a, reason });
  }

  /** Stop only if the current action can be interrupted. Returns true if nothing is left running. */
  interrupt(entity, reason = 'interrupted') {
    if (entity.action && entity.action.interruptible === false) return false;
    this.stop(entity, reason);
    return true;
  }

  /** Locks an entity (no movement / new interactions) for n ticks. */
  lock(entity, ticks) { entity.lockedUntil = Math.max(entity.lockedUntil || 0, this.game.tickCount + ticks); }
  isLocked(entity) { return (entity.lockedUntil || 0) > this.game.tickCount; }

  ctx(entity, action) { return { game: this.game, entity, player: entity, action, ticks: action._ticks }; }

  /** Called by the engine once per tick per entity. */
  process(entity) {
    const a = entity.action;
    if (!a) return;
    if (a._wait > 0) { a._wait--; return; }
    a._wait = Math.max(0, (a.interval || 1) - 1);
    let keep;
    try { keep = a.onTick ? a.onTick(this.ctx(entity, a)) : false; } catch (e) { console.error('[actions] onTick threw', e); keep = false; }
    a._ticks++;
    if (keep === false && entity.action === a) this.stop(entity, 'done');
  }
}
