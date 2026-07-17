'use strict';

const { EventEmitter } = require('node:events');
const { createClient } = require('redis');

const CHANNEL = 'pact:grand-jury-wheel:events';

class InMemoryWheelBroadcaster {
  constructor() { this.events = new EventEmitter(); }
  publish(room, payload) { this.events.emit('event', { room, payload }); }
  subscribe(handler) { this.events.on('event', handler); return () => this.events.off('event', handler); }
  async close() {}
}

class RedisWheelBroadcaster {
  constructor(command, subscriber) {
    this.command    = command;
    this.subscriber = subscriber;
    this.handlers   = new Set();
  }

  static async connect(url, logger) {
    const command    = createClient({ url });
    const subscriber = command.duplicate();
    command.on('error', (error) => logger.error('[wheelBroadcast] Redis command error', { error: error.message }));
    subscriber.on('error', (error) => logger.error('[wheelBroadcast] Redis subscriber error', { error: error.message }));
    await Promise.all([command.connect(), subscriber.connect()]);

    const broadcaster = new RedisWheelBroadcaster(command, subscriber);
    await subscriber.subscribe(CHANNEL, (raw) => {
      try {
        const event = JSON.parse(raw);
        for (const handler of broadcaster.handlers) handler(event);
      } catch (error) {
        logger.warn('[wheelBroadcast] Ignored malformed Redis event', { error: error.message });
      }
    });
    return broadcaster;
  }

  publish(room, payload) {
    this.command.publish(CHANNEL, JSON.stringify({ room, payload })).catch(() => {});
  }

  subscribe(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async close() {
    await Promise.allSettled([this.subscriber.quit(), this.command.quit()]);
  }
}

async function createWheelBroadcaster({ env = process.env, logger }) {
  if (env.REDIS_URL) return RedisWheelBroadcaster.connect(env.REDIS_URL, logger);
  logger.warn('[wheelBroadcast] REDIS_URL is not configured; using single-instance broadcast');
  return new InMemoryWheelBroadcaster();
}

module.exports = { createWheelBroadcaster, InMemoryWheelBroadcaster, RedisWheelBroadcaster };
