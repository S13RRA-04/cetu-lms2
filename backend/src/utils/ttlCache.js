'use strict';

/**
 * Minimal in-memory TTL cache.
 * Keys expire after `ttlMs` milliseconds.
 * No external dependencies — zero cost.
 *
 * Usage:
 *   const cache = new TtlCache(15_000);          // 15-second TTL
 *   const data  = await cache.get(key, loader);  // loader called only on miss
 */
class TtlCache {
  constructor(ttlMs = 15_000) {
    this._ttl   = ttlMs;
    this._store = new Map();
  }

  async get(key, loader) {
    const entry = this._store.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.value;

    const value = await loader();
    this._store.set(key, { value, expiresAt: Date.now() + this._ttl });
    return value;
  }

  invalidate(key) { this._store.delete(key); }
  flush()         { this._store.clear(); }
}

module.exports = TtlCache;
