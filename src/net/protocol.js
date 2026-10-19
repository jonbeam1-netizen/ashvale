// Wire protocol constants + defensive validation of everything that arrives from peers.
// Nothing received from the network is ever evaluated; every field is type/range checked and
// copied into fresh objects (no prototype pollution, no unknown nested structures).

import { getItem } from '../core/registry.js';
import { EQUIP_SLOTS, MAX_STACK } from '../core/constants.js';

/** Bump when the message format changes incompatibly (peers with another version are rejected). */
export const PROTOCOL_VERSION = 1;
/** PeerJS id namespace. Keep stable forever so old clients still find hosts and get a clear "version mismatch". */
export const PEER_PREFIX = 'ashvale-v1-';
export const CODE_LENGTH = 6;
/** Unambiguous code alphabet (no 0/O, 1/I/L). */
export const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS = 8;
export const HEARTBEAT_MS = 2000;
export const TIMEOUT_MS = 20000;
export const CONNECT_TIMEOUT_MS = 20000;

export const NAT_HINT = 'Some networks block peer-to-peer connections; try another network or a mobile hotspot.';

export function makeCode() {
  const buf = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_CHARS[buf[i] % CODE_CHARS.length];
  return s;
}

export function randomId(n = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < n; i++) s += chars[buf[i] % chars.length];
  return s;
}

/** Normalise user input (or a pasted invite link) into a code. Returns null if invalid. */
export function normalizeCode(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  const m = s.match(/[?&]join=([A-Za-z0-9-]+)/);
  if (m) s = m[1];
  s = s.toUpperCase().replace(/[\s-]/g, '');
  if (s.length !== CODE_LENGTH) return null;
  for (const c of s) if (!CODE_CHARS.includes(c)) return null;
  return s;
}

// ---- primitive validators ---------------------------------------------------------------------
export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const WORD_RE = /^[a-z0-9_]{1,40}$/i;

export function int(v, min, max, dflt = null) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return dflt;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}
export function str(v, max = 80) {
  if (typeof v !== 'string') return null;
  // strip control characters
  return v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}
export function cleanName(v) {
  const s = str(v, 12);
  if (!s) return 'Player';
  const c = s.replace(/[^A-Za-z0-9 _-]/g, '').trim();
  return c || 'Player';
}
export function cleanText(v, max = 80) {
  const s = str(v, max);
  return s ? s.trim() : '';
}
export const cleanId = (v) => (typeof v === 'string' && v.length <= 64 && /^[A-Za-z0-9_-]+$/.test(v) ? v : null);

/** Generic value cleaning for extension fields (agent snapshots): primitives, small arrays / flat objects. */
function cleanValue(v, depth = 0) {
  if (v === null || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') return v.slice(0, 120);
  if (depth >= 2) return undefined;
  if (Array.isArray(v)) {
    const out = [];
    for (const x of v.slice(0, 40)) { const c = cleanValue(x, depth + 1); if (c !== undefined) out.push(c); }
    return out;
  }
  if (isObj(v)) {
    const out = {};
    let n = 0;
    for (const k of Object.keys(v)) {
      if (n >= 40) break;
      if (BAD_KEYS.has(k) || !KEY_RE.test(k)) continue;
      const c = cleanValue(v[k], depth + 1);
      if (c !== undefined) { out[k] = c; n++; }
    }
    return out;
  }
  return undefined;
}

const KNOWN_SNAP_KEYS = new Set(['name', 'appearance', 'equipment', 'x', 'y', 'running', 'hp', 'maxHp', 'combatLevel',
  'anim', 'faceAngle', 'dead', 'overhead', 'prayers', 'wildernessLevel', 'deathCount', 'fx']);

/** Validate a remote snapshot. Returns a fresh object or null. */
export function cleanSnapshot(s, world) {
  if (!isObj(s)) return null;
  const out = {};
  if ('name' in s) out.name = cleanName(s.name);
  if (isObj(s.appearance)) {
    const a = {}, src = s.appearance;
    for (const k of ['skin', 'hair', 'top', 'legs', 'boots', 'hands']) {
      if (src[k] === null) a[k] = null;
      else if (typeof src[k] === 'string' && HEX_RE.test(src[k])) a[k] = src[k];
    }
    if (src.body === 'male' || src.body === 'female') a.body = src.body;
    if (['short', 'long', 'bald'].includes(src.hairStyle)) a.hairStyle = src.hairStyle;
    out.appearance = a;
  }
  if (isObj(s.equipment)) {
    const e = {};
    for (const slot of EQUIP_SLOTS) {
      const id = s.equipment[slot];
      if (typeof id === 'string' && id.length <= 64 && getItem(id)) e[slot] = id;
    }
    out.equipment = e;
  }
  const x = int(s.x, 0, 100000), y = int(s.y, 0, 100000);
  if (x != null && y != null && world.inBounds(x, y)) { out.x = x; out.y = y; }
  if (typeof s.running === 'boolean') out.running = s.running;
  const maxHp = int(s.maxHp, 1, 9999);
  if (maxHp != null) out.maxHp = maxHp;
  const hp = int(s.hp, 0, 9999);
  if (hp != null) out.hp = hp;
  const cl = int(s.combatLevel, 1, 999);
  if (cl != null) out.combatLevel = cl;
  if (s.anim === null) out.anim = null;
  else if (typeof s.anim === 'string' && /^[a-z_]{1,24}$/.test(s.anim)) out.anim = s.anim;
  if (typeof s.faceAngle === 'number' && Number.isFinite(s.faceAngle)) out.faceAngle = Math.max(-10, Math.min(10, s.faceAngle));
  if (typeof s.dead === 'boolean') out.dead = s.dead;
  if (s.overhead === null) out.overhead = null;
  else if (typeof s.overhead === 'string') out.overhead = cleanText(s.overhead, 100) || null;
  if (Array.isArray(s.prayers)) out.prayers = s.prayers.filter((p) => typeof p === 'string' && WORD_RE.test(p)).slice(0, 40);
  const wl = int(s.wildernessLevel, 0, 999);
  if (wl != null) out.wildernessLevel = wl;
  const dc = int(s.deathCount, 0, 1e9);
  if (dc != null) out.deathCount = dc;
  if (isObj(s.fx) && typeof s.fx.n === 'string' && /^[a-z_]{1,24}$/.test(s.fx.n)) {
    out.fx = { n: s.fx.n, id: int(s.fx.id, 0, 1e12, 0), d: int(s.fx.d, 100, 5000, 1200) };
  }
  // extension fields added by other systems through the 'snapshot' event (e.g. combat stats, skull)
  let extra = 0;
  for (const k of Object.keys(s)) {
    if (KNOWN_SNAP_KEYS.has(k) || BAD_KEYS.has(k) || !KEY_RE.test(k)) continue;
    if (++extra > 40) break;
    const c = cleanValue(s[k]);
    if (c !== undefined) out[k] = c;
  }
  return out;
}

/** Validate an item list [{id, qty}] (unknown ids dropped). */
export function cleanItems(list, max = 60, { tradeableOnly = false } = {}) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const it of list.slice(0, max)) {
    if (!isObj(it) || typeof it.id !== 'string' || it.id.length > 64) continue;
    const def = getItem(it.id);
    if (!def) continue;
    if (tradeableOnly && def.tradeable === false) continue;
    if (typeof it.qty !== 'number' || !(it.qty >= 1)) continue;
    const qty = int(it.qty, 1, MAX_STACK);
    out.push({ id: it.id, qty });
  }
  return out;
}

/** Validate a PvP hit payload. */
export function cleanHit(d) {
  if (!isObj(d)) return null;
  const damage = int(d.damage, 0, 500);
  if (damage == null) return null;
  const out = cleanValue(d) || {};
  out.damage = damage;
  out.style = typeof d.style === 'string' && /^[a-z_]{1,16}$/.test(d.style) ? d.style : 'melee';
  out.attackerName = d.attackerName != null ? cleanName(d.attackerName) : undefined;
  out.ts = int(d.ts, 0, 1e15, Date.now());
  return out;
}

/** Validate a PvP loot payload. */
export function cleanLoot(d, world) {
  if (!isObj(d)) return null;
  const out = cleanValue(d) || {};
  out.items = cleanItems(d.items, 100);
  const x = int(d.x, 0, 100000), y = int(d.y, 0, 100000);
  if (x != null && y != null && world.inBounds(x, y)) { out.x = x; out.y = y; } else { delete out.x; delete out.y; }
  return out;
}

/** Generic payload for game.net.send/broadcast custom messages. */
export function cleanPayload(d) { return cleanValue(d); }
