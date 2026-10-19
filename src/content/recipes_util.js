// Shared helpers for agent C's production content files.

import { registerItem, getItem, registerRecipe } from '../core/registry.js';

/**
 * Register an item only if no earlier module (items.js, gathering.js ... are imported before
 * recipes.js) already did. Lets us depend on shared ids (hammer, egg, cowhide...) without
 * duplicate warnings, while guaranteeing they exist.
 */
export function ensureItem(def) { return getItem(def.id) || registerItem(def); }

export const item = registerItem;

/** Recipe helper with sane production defaults. */
export function recipe(def) { return registerRecipe(def); }

export const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const idName = (id) => cap(id.replace(/_/g, ' '));

/** Linear clamp helper. */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
