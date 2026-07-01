'use strict';

class TtlCache {
  constructor(ttlMs = 15_000) {
    this._ttl      = ttlMs;
    this._store    = new Map();
    this._inflight = new Map(); // singleflight: concurrent misses share one loader
  }

  async get(key, loader) {
    const entry = this._store.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.value;

    // If another caller is already loading this key, piggyback on that promise
    if (this._inflight.has(key)) return this._inflight.get(key);

    const promise = loader()
      .then((value) => {
        this._store.set(key, { value, expiresAt: Date.now() + this._ttl });
        this._inflight.delete(key);
        return value;
      })
      .catch((err) => {
        this._inflight.delete(key);
        throw err;
      });

    this._inflight.set(key, promise);
    return promise;
  }

  invalidate(key) { this._store.delete(key); this._inflight.delete(key); }
  flush()         { this._store.clear();  this._inflight.clear(); }
}

module.exports = TtlCache;
