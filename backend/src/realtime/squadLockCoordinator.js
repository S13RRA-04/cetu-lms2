'use strict';

const { EventEmitter } = require('node:events');
const { createClient } = require('redis');

const LOCK_TTL_MS = 8000;
const CHANNEL = 'pact:squad-challenge:events';
const KEY_PREFIX = 'pact:squad-challenge:lock';

const encode = (value) => Buffer.from(String(value)).toString('base64url');
// The shared hash tag keeps a room's lock and field-index keys in one Redis
// Cluster slot, so the Lua compare-and-mutate operations remain atomic.
const lockKey = (room, field) => `${KEY_PREFIX}:{${encode(room)}}:${encode(field)}`;
const roomFieldsKey = (room) => `${KEY_PREFIX}:{${encode(room)}}:fields`;

class InMemorySquadLockCoordinator {
  constructor() {
    this.locks = new Map();
    this.events = new EventEmitter();
  }

  _room(room) {
    if (!this.locks.has(room)) this.locks.set(room, new Map());
    return this.locks.get(room);
  }

  _active(room, field) {
    const locks = this.locks.get(room);
    const lock = locks?.get(field);
    if (lock && lock.expiresAt <= Date.now()) {
      locks.delete(field);
      if (locks.size === 0) this.locks.delete(room);
      return null;
    }
    return lock ?? null;
  }

  async claim(room, field, owner) {
    const previous = this._active(room, field);
    this._room(room).set(field, { ...owner, expiresAt: Date.now() + LOCK_TTL_MS });
    const payload = {
      type: 'claimed', field,
      user: { user_id: owner.userId, name: owner.name },
      previousUser: previous && previous.ownerId !== owner.ownerId
        ? { user_id: previous.userId, name: previous.name }
        : null,
    };
    this.events.emit('event', { room, payload });
    return payload;
  }

  async release(room, field, ownerId) {
    const lock = this._active(room, field);
    if (!lock || lock.ownerId !== ownerId) return false;
    const locks = this.locks.get(room);
    locks.delete(field);
    if (locks.size === 0) this.locks.delete(room);
    this.events.emit('event', { room, payload: { type: 'released', field } });
    return true;
  }

  async refresh(room, field, ownerId) {
    const lock = this._active(room, field);
    if (!lock || lock.ownerId !== ownerId) return false;
    lock.expiresAt = Date.now() + LOCK_TTL_MS;
    return true;
  }

  async publishInput(room, field, value, owner) {
    const lock = this._active(room, field);
    if (!lock || lock.ownerId !== owner.ownerId) return false;
    lock.expiresAt = Date.now() + LOCK_TTL_MS;
    this.events.emit('event', {
      room,
      excludeOwnerId: owner.ownerId,
      payload: { type: 'input', field, value, user: { user_id: owner.userId, name: owner.name } },
    });
    return true;
  }

  async snapshot(room) {
    const out = {};
    for (const field of [...(this.locks.get(room)?.keys() ?? [])]) {
      const lock = this._active(room, field);
      if (lock) out[field] = { user_id: lock.userId, name: lock.name };
    }
    return out;
  }

  subscribe(handler) {
    this.events.on('event', handler);
    return () => this.events.off('event', handler);
  }

  async close() {}
}

class RedisSquadLockCoordinator {
  constructor(command, subscriber) {
    this.command = command;
    this.subscriber = subscriber;
    this.handlers = new Set();
  }

  static async connect(url, logger) {
    const command = createClient({ url });
    const subscriber = command.duplicate();
    command.on('error', (error) => logger.error('[squadLockCoordinator] Redis command error', { error: error.message }));
    subscriber.on('error', (error) => logger.error('[squadLockCoordinator] Redis subscriber error', { error: error.message }));
    await Promise.all([command.connect(), subscriber.connect()]);
    const coordinator = new RedisSquadLockCoordinator(command, subscriber);
    await subscriber.subscribe(CHANNEL, (raw) => {
      try {
        const event = JSON.parse(raw);
        for (const handler of coordinator.handlers) handler(event);
      } catch (error) {
        logger.warn('[squadLockCoordinator] Ignored malformed Redis event', { error: error.message });
      }
    });
    return coordinator;
  }

  async claim(room, field, owner) {
    const key = lockKey(room, field);
    const value = JSON.stringify(owner);
    const script = `
      local previous = redis.call('GET', KEYS[1])
      redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
      redis.call('SADD', KEYS[2], ARGV[5])
      redis.call('EXPIRE', KEYS[2], 86400)
      local previousUser = cjson.null
      if previous then
        local old = cjson.decode(previous)
        if old.ownerId ~= ARGV[3] then previousUser = { user_id = old.userId, name = old.name } end
      end
      local event = { room = ARGV[4], payload = {
        type = 'claimed', field = ARGV[5],
        user = { user_id = ARGV[6], name = ARGV[7] }, previousUser = previousUser
      }}
      redis.call('PUBLISH', ARGV[8], cjson.encode(event))
      return previous or ''`;
    const previousRaw = await this.command.eval(script, {
      keys: [key, roomFieldsKey(room)], arguments: [
        value, String(LOCK_TTL_MS), owner.ownerId, room, field, owner.userId, owner.name, CHANNEL,
      ],
    });
    const previous = previousRaw ? JSON.parse(previousRaw) : null;
    const payload = {
      type: 'claimed', field,
      user: { user_id: owner.userId, name: owner.name },
      previousUser: previous && previous.ownerId !== owner.ownerId
        ? { user_id: previous.userId, name: previous.name }
        : null,
    };
    return payload;
  }

  async release(room, field, ownerId) {
    const script = `
      local value = redis.call('GET', KEYS[1])
      if not value then return 0 end
      local lock = cjson.decode(value)
      if lock.ownerId ~= ARGV[1] then return 0 end
      redis.call('DEL', KEYS[1])
      redis.call('SREM', KEYS[2], ARGV[3])
      redis.call('PUBLISH', ARGV[4], cjson.encode({ room = ARGV[2], payload = { type = 'released', field = ARGV[3] } }))
      return 1`;
    const released = await this.command.eval(script, {
      keys: [lockKey(room, field), roomFieldsKey(room)], arguments: [ownerId, room, field, CHANNEL],
    });
    return released === 1;
  }

  async refresh(room, field, ownerId) {
    const script = `
      local value = redis.call('GET', KEYS[1])
      if not value then return 0 end
      local lock = cjson.decode(value)
      if lock.ownerId ~= ARGV[1] then return 0 end
      return redis.call('PEXPIRE', KEYS[1], ARGV[2])`;
    return (await this.command.eval(script, {
      keys: [lockKey(room, field)], arguments: [ownerId, String(LOCK_TTL_MS)],
    })) === 1;
  }

  async publishInput(room, field, value, owner) {
    const event = JSON.stringify({
      room,
      excludeOwnerId: owner.ownerId,
      payload: { type: 'input', field, value, user: { user_id: owner.userId, name: owner.name } },
    });
    const script = `
      local current = redis.call('GET', KEYS[1])
      if not current then return 0 end
      local lock = cjson.decode(current)
      if lock.ownerId ~= ARGV[1] then return 0 end
      redis.call('PEXPIRE', KEYS[1], ARGV[2])
      redis.call('PUBLISH', ARGV[3], ARGV[4])
      return 1`;
    return (await this.command.eval(script, {
      keys: [lockKey(room, field)],
      arguments: [owner.ownerId, String(LOCK_TTL_MS), CHANNEL, event],
    })) === 1;
  }

  async snapshot(room) {
    const out = {};
    const indexKey = roomFieldsKey(room);
    const fields = await this.command.sMembers(indexKey);
    if (fields.length === 0) return out;
    const values = await this.command.mGet(fields.map((field) => lockKey(room, field)));
    const staleFields = [];
    for (let index = 0; index < fields.length; index += 1) {
      if (!values[index]) { staleFields.push(fields[index]); continue; }
      const lock = JSON.parse(values[index]);
      out[fields[index]] = { user_id: lock.userId, name: lock.name };
    }
    if (staleFields.length > 0) await this.command.sRem(indexKey, staleFields);
    return out;
  }

  subscribe(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async close() {
    await Promise.allSettled([this.subscriber.quit(), this.command.quit()]);
  }
}

async function createSquadLockCoordinator({ env = process.env, logger }) {
  const instanceCount = Number.parseInt(env.BACKEND_INSTANCE_COUNT ?? env.WEB_CONCURRENCY ?? '1', 10);
  if (!Number.isInteger(instanceCount) || instanceCount < 1) {
    throw new Error('BACKEND_INSTANCE_COUNT or WEB_CONCURRENCY must be a positive integer');
  }
  if (instanceCount > 1 && !env.REDIS_URL) {
    throw new Error('REDIS_URL is required when BACKEND_INSTANCE_COUNT or WEB_CONCURRENCY is greater than 1');
  }
  if (env.REDIS_URL) return RedisSquadLockCoordinator.connect(env.REDIS_URL, logger);
  logger.warn('[squadLockCoordinator] REDIS_URL is not configured; using single-instance coordination');
  return new InMemorySquadLockCoordinator();
}

module.exports = {
  LOCK_TTL_MS,
  InMemorySquadLockCoordinator,
  RedisSquadLockCoordinator,
  createSquadLockCoordinator,
};
